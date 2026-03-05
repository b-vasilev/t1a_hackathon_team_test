import json
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy import select as sa_select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models import PolicyAnalysis, Service


@pytest.mark.asyncio
class TestHealthEndpoint:
    async def test_health(self, client):
        resp = await client.get("/api/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}


@pytest.mark.asyncio
class TestServicesEndpoint:
    async def test_get_services(self, client):
        resp = await client.get("/api/services")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["name"] == "TestService"
        assert data[0]["has_analysis"] is False

    async def test_get_services_includes_required_fields(self, client):
        resp = await client.get("/api/services")
        data = resp.json()
        svc = data[0]
        assert "id" in svc
        assert "name" in svc
        assert "website_url" in svc
        assert "privacy_policy_url" in svc
        assert "icon" in svc
        assert "has_analysis" in svc


@pytest.mark.asyncio
class TestCustomServiceEndpoint:
    @patch("app.main.find_privacy_policy_url", new_callable=AsyncMock, return_value="https://custom.com/privacy")
    async def test_add_new_service(self, mock_find, client):
        resp = await client.post("/api/services/custom", json={"url": "https://custom.com"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Custom"
        assert data["website_url"] == "https://custom.com"
        assert data["privacy_policy_url"] == "https://custom.com/privacy"
        assert data["has_analysis"] is False

    @patch("app.main.find_privacy_policy_url", new_callable=AsyncMock, return_value=None)
    async def test_add_duplicate_returns_existing(self, mock_find, client):
        # First add
        await client.post("/api/services/custom", json={"url": "https://dupe.com"})
        # Second add of same URL
        resp = await client.post("/api/services/custom", json={"url": "https://dupe.com"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Dupe"

    @patch("app.main.find_privacy_policy_url", new_callable=AsyncMock, return_value=None)
    async def test_url_normalization(self, mock_find, client):
        resp = await client.post("/api/services/custom", json={"url": "example.org"})
        assert resp.status_code == 200
        assert resp.json()["website_url"] == "https://example.org"


@pytest.mark.asyncio
class TestCacheEndpoints:
    async def test_clear_service_cache(self, client):
        resp = await client.delete("/api/services/1/cache")
        assert resp.status_code == 200
        assert resp.json()["cleared"] is True

    async def test_clear_all_cache(self, client):
        resp = await client.delete("/api/cache")
        assert resp.status_code == 200
        assert "cleared" in resp.json()


@pytest.mark.asyncio
class TestAnalyzeEndpoint:
    async def test_empty_ids_returns_400(self, client):
        resp = await client.post("/api/analyze", json={"service_ids": []})
        assert resp.status_code == 400

    @patch("app.main.get_service_actions", new_callable=AsyncMock, return_value=[])
    @patch(
        "app.main.analyze_policy",
        new_callable=AsyncMock,
        return_value={
            "grade": "B+",
            "summary": "Decent policy",
            "tldr": "Decent but shares data with third parties.",
            "red_flags": ["Shares data"],
            "warnings": ["Cookies"],
            "positives": ["Allows deletion"],
            "categories": {},
            "highlights": ["Decent policy"],
        },
    )
    async def test_analyze_cache_miss(self, mock_analyze, mock_actions, client):
        # Get service ID
        services = (await client.get("/api/services")).json()
        sid = services[0]["id"]

        resp = await client.post("/api/analyze", json={"service_ids": [sid]})
        assert resp.status_code == 200
        data = resp.json()
        assert data["overall_grade"] == "B+"
        assert len(data["results"]) == 1
        assert data["results"][0]["grade"] == "B+"
        assert data["results"][0]["tldr"] == "Decent but shares data with third parties."
        assert data["results"][0]["cached"] is False

    @patch("app.main.get_service_actions", new_callable=AsyncMock, return_value=[])
    @patch(
        "app.main.analyze_policy",
        new_callable=AsyncMock,
        return_value={
            "grade": "A",
            "summary": "Great",
            "tldr": "Excellent privacy practices across the board.",
            "red_flags": [],
            "warnings": [],
            "positives": ["Transparent"],
            "categories": {},
            "highlights": ["Great"],
        },
    )
    async def test_analyze_cache_hit(self, mock_analyze, mock_actions, client):
        services = (await client.get("/api/services")).json()
        sid = services[0]["id"]

        # First call → cache miss
        await client.post("/api/analyze", json={"service_ids": [sid]})
        # Second call → cache hit
        resp = await client.post("/api/analyze", json={"service_ids": [sid]})
        data = resp.json()
        assert data["results"][0]["cached"] is True
        assert data["results"][0]["tldr"] == "Excellent privacy practices across the board."
        # analyze_policy should only be called once (first time)
        assert mock_analyze.call_count == 1

    async def test_analyze_nonexistent_service(self, client):
        resp = await client.post("/api/analyze", json={"service_ids": [9999]})
        assert resp.status_code == 200
        data = resp.json()
        assert data["results"] == []


LONG_TEXT = "This is a privacy policy text. " * 100  # well over 50 chars

MOCK_ANALYSIS = {
    "grade": "B",
    "summary": "Decent policy",
    "tldr": "Decent policy with some data sharing concerns.",
    "red_flags": ["Shares data"],
    "warnings": ["Cookies"],
    "positives": ["Allows deletion"],
    "categories": {},
    "highlights": ["Decent overall"],
    "mock": False,
}


@pytest.mark.asyncio
class TestAnalyzeTextEndpoint:
    @patch("app.main.analyze_policy_text", new_callable=AsyncMock, return_value=MOCK_ANALYSIS)
    async def test_analyze_text_success(self, mock_fn, client):
        resp = await client.post(
            "/api/analyze-text",
            json={"text": LONG_TEXT, "name": "My Policy"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["overall_grade"] == "B"
        assert len(data["results"]) == 1
        assert data["results"][0]["name"] == "My Policy"
        assert data["results"][0]["tldr"] == "Decent policy with some data sharing concerns."
        assert data["results"][0]["cached"] is False

    async def test_empty_text_returns_422(self, client):
        resp = await client.post("/api/analyze-text", json={"text": ""})
        assert resp.status_code == 422

    async def test_short_text_returns_422(self, client):
        resp = await client.post("/api/analyze-text", json={"text": "short"})
        assert resp.status_code == 422

    async def test_missing_text_returns_422(self, client):
        resp = await client.post("/api/analyze-text", json={"name": "No text"})
        assert resp.status_code == 422

    @patch("app.main.analyze_policy_text", new_callable=AsyncMock, return_value=MOCK_ANALYSIS)
    async def test_default_name_used_when_omitted(self, mock_fn, client):
        resp = await client.post("/api/analyze-text", json={"text": LONG_TEXT})
        assert resp.status_code == 200
        data = resp.json()
        assert data["results"][0]["name"] == "Custom Policy"

    @patch("app.main.analyze_policy_text", new_callable=AsyncMock, side_effect=RuntimeError("LLM down"))
    async def test_analyze_text_error_returns_500(self, mock_fn, client):
        resp = await client.post("/api/analyze-text", json={"text": LONG_TEXT, "name": "Broken"})
        assert resp.status_code == 500

    @patch("app.main.analyze_policy_text", new_callable=AsyncMock, return_value=MOCK_ANALYSIS)
    async def test_empty_name_defaults_to_custom_policy(self, mock_fn, client):
        resp = await client.post("/api/analyze-text", json={"text": LONG_TEXT, "name": "   "})
        assert resp.status_code == 200
        assert resp.json()["results"][0]["name"] == "Custom Policy"


@pytest.mark.asyncio
class TestServicesWithAnalysis:
    async def test_get_services_has_analysis_true(self, client, engine):
        """When an analysis exists for a service, has_analysis should be True."""
        factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with factory() as session:
            svc = (await session.execute(sa_select(Service))).scalar_one()
            analysis = PolicyAnalysis(
                service_id=svc.id,
                grade="A",
                summary="Great",
                red_flags="[]",
                warnings="[]",
                positives="[]",
            )
            session.add(analysis)
            await session.commit()

        resp = await client.get("/api/services")
        data = resp.json()
        assert data[0]["has_analysis"] is True


@pytest.mark.asyncio
class TestAnalyzeEdgeCases:
    @patch("app.main.find_privacy_policy_url", new_callable=AsyncMock, return_value=None)
    async def test_analyze_no_privacy_url_returns_na(self, mock_find, client, engine):
        """Service with no privacy URL and LLM can't find one returns N/A."""
        factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with factory() as session:
            svc = Service(
                name="NoPolicy",
                website_url="https://nopolicy.com",
                privacy_policy_url=None,
                is_popular=True,
                icon="https://example.com/icon.png",
            )
            session.add(svc)
            await session.commit()
            await session.refresh(svc)
            svc_id = svc.id

        resp = await client.post("/api/analyze", json={"service_ids": [svc_id]})
        assert resp.status_code == 200
        data = resp.json()
        result = next(r for r in data["results"] if r["service_id"] == svc_id)
        assert result["grade"] == "N/A"
        assert "Could not locate" in result["summary"]

    @patch("app.main.get_service_actions", new_callable=AsyncMock, side_effect=RuntimeError("boom"))
    @patch("app.main.analyze_policy", new_callable=AsyncMock, side_effect=RuntimeError("LLM error"))
    async def test_analyze_llm_error_returns_na(self, mock_analyze, mock_actions, client):
        services = (await client.get("/api/services")).json()
        sid = services[0]["id"]

        resp = await client.post("/api/analyze", json={"service_ids": [sid]})
        assert resp.status_code == 200
        data = resp.json()
        assert data["results"][0]["grade"] == "N/A"
        assert "LLM API error" in data["results"][0]["summary"]
