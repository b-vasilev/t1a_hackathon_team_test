import json
from unittest.mock import AsyncMock, patch

import pytest

from app.analyzer import analyze_policy, analyze_policy_text, find_privacy_policy_url, get_service_actions


@pytest.mark.asyncio
class TestFindPrivacyPolicyUrl:
    @patch("app.analyzer._llm_call", new_callable=AsyncMock)
    @patch("app.analyzer.fetch_text", new_callable=AsyncMock)
    async def test_found(self, mock_fetch, mock_llm):
        mock_fetch.return_value = ("Homepage text with privacy link", False)
        mock_llm.return_value = "https://example.com/privacy"
        result = await find_privacy_policy_url("https://example.com")
        assert result == "https://example.com/privacy"

    @patch("app.analyzer._llm_call", new_callable=AsyncMock)
    @patch("app.analyzer.fetch_text", new_callable=AsyncMock)
    async def test_not_found(self, mock_fetch, mock_llm):
        mock_fetch.return_value = ("Homepage text", False)
        mock_llm.return_value = "NOT_FOUND"
        result = await find_privacy_policy_url("https://example.com")
        assert result is None

    @patch("app.analyzer._llm_call", new_callable=AsyncMock)
    @patch("app.analyzer.fetch_text", new_callable=AsyncMock)
    async def test_non_http_result(self, mock_fetch, mock_llm):
        mock_fetch.return_value = ("Homepage text", False)
        mock_llm.return_value = "no-url-here"
        result = await find_privacy_policy_url("https://example.com")
        assert result is None

    @patch("app.analyzer.fetch_text", new_callable=AsyncMock, side_effect=RuntimeError("fetch failed"))
    async def test_fetch_failure(self, mock_fetch):
        result = await find_privacy_policy_url("https://example.com")
        assert result is None


@pytest.mark.asyncio
class TestAnalyzePolicy:
    @patch("app.analyzer._llm_call", new_callable=AsyncMock)
    @patch("app.analyzer.fetch_text", new_callable=AsyncMock)
    async def test_valid_json(self, mock_fetch, mock_llm):
        mock_fetch.return_value = ("Privacy policy text...", False)
        mock_llm.return_value = json.dumps(
            {
                "tldr": "Collects email, shares with partners, uses cookies.",
                "categories": {
                    "data_collection": {"grade": "B", "finding": "Collects email"},
                    "data_sharing": {"grade": "B", "finding": "Shares with partners"},
                    "data_retention": {"grade": "B", "finding": "Retains 2 years"},
                    "tracking": {"grade": "B", "finding": "Uses cookies"},
                    "user_rights": {"grade": "B", "finding": "Can request deletion"},
                },
                "highlights": ["Decent policy overall"],
                "red_flags": ["Shares data with third parties"],
                "warnings": ["Cookie tracking"],
                "positives": ["Allows data deletion"],
            }
        )
        result = await analyze_policy("https://example.com/privacy")
        assert result["grade"] == "B"
        assert result["tldr"] == "Collects email, shares with partners, uses cookies."
        assert len(result["red_flags"]) == 1
        assert len(result["positives"]) == 1

    @patch("app.analyzer._llm_call", new_callable=AsyncMock)
    @patch("app.analyzer.fetch_text", new_callable=AsyncMock)
    async def test_markdown_fenced_json(self, mock_fetch, mock_llm):
        mock_fetch.return_value = ("Policy text", False)
        raw_json = json.dumps(
            {
                "tldr": "Great privacy policy with full transparency.",
                "categories": {
                    "data_collection": {"grade": "A", "finding": "x"},
                    "data_sharing": {"grade": "A", "finding": "x"},
                    "data_retention": {"grade": "A", "finding": "x"},
                    "tracking": {"grade": "A", "finding": "x"},
                    "user_rights": {"grade": "A", "finding": "x"},
                },
                "highlights": ["Great policy"],
                "red_flags": [],
                "warnings": [],
                "positives": ["Very transparent"],
            }
        )
        mock_llm.return_value = f"```json\n{raw_json}\n```"
        result = await analyze_policy("https://example.com/privacy")
        assert result["grade"] == "A"
        assert result["tldr"] == "Great privacy policy with full transparency."

    @patch("app.analyzer._llm_call", new_callable=AsyncMock)
    @patch("app.analyzer.fetch_text", new_callable=AsyncMock)
    async def test_unparseable_response(self, mock_fetch, mock_llm):
        mock_fetch.return_value = ("Policy text", False)
        mock_llm.return_value = "This is not JSON at all"
        result = await analyze_policy("https://example.com/privacy")
        assert result["grade"] == "N/A"
        assert "could not parse" in result["summary"].lower()

    @patch("app.analyzer.fetch_text", new_callable=AsyncMock, side_effect=RuntimeError("fetch failed"))
    async def test_fetch_failure(self, mock_fetch):
        result = await analyze_policy("https://example.com/privacy")
        assert result["grade"] == "N/A"
        assert "could not fetch" in result["summary"].lower()


@pytest.mark.asyncio
class TestGetServiceActions:
    @patch("app.analyzer._llm_call", new_callable=AsyncMock)
    @patch("app.analyzer._search_web", new_callable=AsyncMock)
    async def test_valid_actions(self, mock_search, mock_llm):
        mock_search.return_value = "Search results about deleting account..."
        mock_llm.return_value = json.dumps(
            {
                "actions": [
                    {
                        "label": "Delete Account",
                        "description": "Permanently delete your account",
                        "url": "https://www.example.com/settings/delete",
                        "category": "deletion",
                        "source": "https://help.example.com/delete",
                    }
                ]
            }
        )
        result = await get_service_actions("Example", "https://www.example.com")
        assert len(result) == 1
        assert result[0]["label"] == "Delete Account"

    @patch("app.analyzer._llm_call", new_callable=AsyncMock)
    @patch("app.analyzer._search_web", new_callable=AsyncMock)
    async def test_off_domain_filtered(self, mock_search, mock_llm):
        mock_search.return_value = "Search results"
        mock_llm.return_value = json.dumps(
            {
                "actions": [
                    {
                        "label": "Delete Account",
                        "url": "https://www.other-site.com/delete",
                        "category": "deletion",
                    },
                    {
                        "label": "Privacy Settings",
                        "url": "https://www.example.com/privacy",
                        "category": "privacy_settings",
                    },
                ]
            }
        )
        result = await get_service_actions("Example", "https://www.example.com")
        assert len(result) == 1
        assert result[0]["label"] == "Privacy Settings"

    @patch("app.analyzer._llm_call", new_callable=AsyncMock)
    @patch("app.analyzer._search_web", new_callable=AsyncMock)
    async def test_affiliated_domain_accepted(self, mock_search, mock_llm):
        """Affiliated domains (e.g. reddithelp.com for reddit.com) should be accepted."""
        mock_search.return_value = "Search results"
        mock_llm.return_value = json.dumps(
            {
                "actions": [
                    {
                        "label": "Request Data",
                        "url": "https://support.reddithelp.com/hc/data-request",
                        "category": "data_access",
                    },
                    {
                        "label": "Privacy Dashboard",
                        "url": "https://myaccount.google.com/data-and-privacy",
                        "category": "privacy_settings",
                    },
                    {
                        "label": "Unrelated Site",
                        "url": "https://www.malicious.com/phish",
                        "category": "deletion",
                    },
                ]
            }
        )
        # "reddit" brand should match "reddithelp.com"
        result = await get_service_actions("Reddit", "https://www.reddit.com")
        assert len(result) == 1
        assert result[0]["label"] == "Request Data"

        # "google" brand should match "myaccount.google.com"
        result = await get_service_actions("Google", "https://www.google.com")
        assert len(result) == 1
        assert result[0]["label"] == "Privacy Dashboard"

        # YouTube uses Google's policy URL — google.com actions should be accepted
        result = await get_service_actions(
            "YouTube",
            "https://www.youtube.com",
            policy_url="https://policies.google.com/privacy",
        )
        assert len(result) == 1
        assert result[0]["label"] == "Privacy Dashboard"

    @patch("app.analyzer._search_web", new_callable=AsyncMock, return_value="")
    async def test_no_search_results(self, mock_search):
        result = await get_service_actions("Example", "https://www.example.com")
        assert result == []

    @patch("app.analyzer._search_web", new_callable=AsyncMock, side_effect=Exception("boom"))
    async def test_exception_returns_empty(self, mock_search):
        result = await get_service_actions("Example", "https://www.example.com")
        assert result == []

    @patch("app.analyzer._llm_call", new_callable=AsyncMock)
    @patch("app.analyzer._search_web", new_callable=AsyncMock)
    async def test_missing_required_fields_skipped(self, mock_search, mock_llm):
        mock_search.return_value = "Search results"
        mock_llm.return_value = json.dumps(
            {
                "actions": [
                    {"label": "No URL field", "category": "deletion"},
                    {
                        "label": "Valid",
                        "url": "https://www.example.com/delete",
                        "category": "deletion",
                    },
                ]
            }
        )
        result = await get_service_actions("Example", "https://www.example.com")
        assert len(result) == 1
        assert result[0]["label"] == "Valid"


SAMPLE_LLM_RESPONSE = json.dumps(
    {
        "tldr": "Decent policy but shares data and uses cookies.",
        "categories": {
            "data_collection": {"grade": "B", "finding": "Collects email"},
            "data_sharing": {"grade": "B", "finding": "Shares with partners"},
            "data_retention": {"grade": "B", "finding": "Retains 2 years"},
            "tracking": {"grade": "B", "finding": "Uses cookies"},
            "user_rights": {"grade": "B", "finding": "Can request deletion"},
        },
        "highlights": ["Decent policy overall"],
        "red_flags": ["Shares data with third parties"],
        "warnings": ["Cookie tracking"],
        "positives": ["Allows data deletion"],
    }
)

LONG_TEXT = "This is a privacy policy text. " * 100  # > 50 chars


@pytest.mark.asyncio
class TestAnalyzePolicyText:
    @patch("app.analyzer._llm_call", new_callable=AsyncMock)
    async def test_valid_text(self, mock_llm):
        mock_llm.return_value = SAMPLE_LLM_RESPONSE
        result = await analyze_policy_text(LONG_TEXT, service_name="TestService")
        assert result["grade"] != "N/A"
        assert result["tldr"] == "Decent policy but shares data and uses cookies."
        assert len(result["red_flags"]) == 1
        assert len(result["positives"]) == 1

    async def test_empty_text_returns_empty_result(self):
        result = await analyze_policy_text("", service_name="TestService")
        assert result["grade"] == "N/A"
        assert "too short" in result["summary"].lower()

    async def test_short_text_returns_empty_result(self):
        result = await analyze_policy_text("short", service_name="TestService")
        assert result["grade"] == "N/A"
        assert "too short" in result["summary"].lower()

    @patch("app.analyzer._llm_call", new_callable=AsyncMock)
    async def test_unparseable_response(self, mock_llm):
        mock_llm.return_value = "This is not JSON at all"
        result = await analyze_policy_text(LONG_TEXT)
        assert result["grade"] == "N/A"
        assert "could not parse" in result["summary"].lower()

    @patch("app.analyzer._llm_call", new_callable=AsyncMock, side_effect=Exception("boom"))
    async def test_llm_unavailable_returns_mock(self, mock_llm):
        from app.analyzer import LLMUnavailableError

        mock_llm.side_effect = LLMUnavailableError("unavailable")
        result = await analyze_policy_text(LONG_TEXT, service_name="TestService")
        # Should return a mock result, not raise
        assert "grade" in result
        assert result.get("mock") is True
        assert "policy_text" in result
        assert "was_truncated" in result
