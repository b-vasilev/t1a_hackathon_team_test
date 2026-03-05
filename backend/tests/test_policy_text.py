import json
from unittest.mock import AsyncMock, patch

import pytest

from app.models import PolicyAnalysis, PolicyText, Service


@pytest.mark.asyncio
class TestGetPolicyTextEndpoint:
    async def test_success_with_policy_text_table(self, client, engine):
        """Policy text returned from PolicyText table with sections."""
        from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

        factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with factory() as session:
            svc = (await session.execute(__import__("sqlalchemy").select(Service))).scalar_one()
            pt = PolicyText(
                content_hash="abc123",
                content="Full policy text here.",
                char_count=21,
                was_truncated=False,
                sections_json=json.dumps([{"title": "Intro", "start": 0, "length": 21}]),
                source_url="https://www.test.com/privacy",
            )
            session.add(pt)
            await session.flush()

            analysis = PolicyAnalysis(
                service_id=svc.id,
                grade="B",
                summary="Decent policy",
                red_flags="[]",
                warnings="[]",
                positives='["Good encryption"]',
                policy_text_id=pt.id,
            )
            session.add(analysis)
            await session.commit()

        resp = await client.get(f"/api/services/{svc.id}/policy-text")
        assert resp.status_code == 200
        data = resp.json()
        assert data["content"] == "Full policy text here."
        assert data["grade"] == "B"
        assert data["service_name"] == "TestService"
        assert len(data["sections"]) == 1
        assert data["was_truncated"] is False

    async def test_fallback_to_legacy_policy_text(self, client, engine):
        """Falls back to analysis.policy_text when no PolicyText row."""
        from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

        factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with factory() as session:
            svc = (await session.execute(__import__("sqlalchemy").select(Service))).scalar_one()
            analysis = PolicyAnalysis(
                service_id=svc.id,
                grade="C",
                summary="OK policy",
                red_flags="[]",
                warnings="[]",
                positives="[]",
                policy_text="Legacy text content",
            )
            session.add(analysis)
            await session.commit()

        resp = await client.get(f"/api/services/{svc.id}/policy-text")
        assert resp.status_code == 200
        data = resp.json()
        assert data["content"] == "Legacy text content"
        assert data["sections"] == []

    async def test_no_service_returns_404(self, client):
        resp = await client.get("/api/services/9999/policy-text")
        assert resp.status_code == 404

    async def test_no_analysis_returns_404(self, client):
        """Service exists but has no analysis."""
        resp = await client.get("/api/services/1/policy-text")
        assert resp.status_code == 404

    async def test_no_text_available_returns_404(self, client, engine):
        """Analysis exists but has no policy text at all."""
        from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

        factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with factory() as session:
            svc = (await session.execute(__import__("sqlalchemy").select(Service))).scalar_one()
            analysis = PolicyAnalysis(
                service_id=svc.id,
                grade="D",
                summary="Bad policy",
                red_flags="[]",
                warnings="[]",
                positives="[]",
                policy_text=None,
                policy_text_id=None,
            )
            session.add(analysis)
            await session.commit()

        resp = await client.get(f"/api/services/{svc.id}/policy-text")
        assert resp.status_code == 404
