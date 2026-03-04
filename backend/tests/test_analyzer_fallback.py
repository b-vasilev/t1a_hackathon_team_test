"""Tests for LLM fallback behavior when API is unreachable."""

from unittest.mock import AsyncMock, patch

import pytest

from app.analyzer import LLMUnavailableError, analyze_policy, find_privacy_policy_url, get_service_actions


@pytest.mark.asyncio
class TestLLMFallback:
    @patch("app.analyzer.fetch_text", new_callable=AsyncMock, return_value="Policy text here")
    @patch(
        "app.analyzer.litellm.acompletion",
        new_callable=AsyncMock,
        side_effect=ConnectionError("API unreachable"),
    )
    async def test_analyze_policy_returns_mock_on_llm_failure(self, mock_llm, mock_fetch):
        result = await analyze_policy("https://example.com/privacy", service_name="Google")
        assert result["mock"] is True
        assert result["grade"] != "N/A"
        assert len(result["red_flags"]) > 0

    @patch("app.analyzer.fetch_text", new_callable=AsyncMock, return_value="Policy text here")
    @patch(
        "app.analyzer.litellm.acompletion",
        new_callable=AsyncMock,
        side_effect=ConnectionError("API unreachable"),
    )
    async def test_analyze_policy_unknown_service_returns_generic_mock(self, mock_llm, mock_fetch):
        result = await analyze_policy("https://example.com/privacy", service_name="UnknownService")
        assert result["mock"] is True
        assert "unavailable" in result["summary"].lower()

    @patch("app.analyzer.fetch_text", new_callable=AsyncMock, return_value="Homepage text")
    @patch(
        "app.analyzer.litellm.acompletion",
        new_callable=AsyncMock,
        side_effect=ConnectionError("API unreachable"),
    )
    async def test_find_privacy_policy_url_returns_none_on_llm_failure(self, mock_llm, mock_fetch):
        result = await find_privacy_policy_url("https://example.com")
        assert result is None

    @patch("app.analyzer._search_web", new_callable=AsyncMock, return_value="Search results")
    @patch(
        "app.analyzer.litellm.acompletion",
        new_callable=AsyncMock,
        side_effect=ConnectionError("API unreachable"),
    )
    async def test_get_service_actions_returns_mock_on_llm_failure(self, mock_llm, mock_search):
        result = await get_service_actions("Google", "https://www.google.com")
        assert len(result) > 0
        assert all("url" in a for a in result)

    @patch("app.analyzer._search_web", new_callable=AsyncMock, return_value="Search results")
    @patch(
        "app.analyzer.litellm.acompletion",
        new_callable=AsyncMock,
        side_effect=ConnectionError("API unreachable"),
    )
    async def test_get_service_actions_unknown_returns_empty_on_llm_failure(self, mock_llm, mock_search):
        result = await get_service_actions("UnknownService", "https://unknown.example.com")
        assert result == []


class TestLLMUnavailableError:
    def test_is_exception(self):
        assert issubclass(LLMUnavailableError, Exception)

    def test_message(self):
        err = LLMUnavailableError("test message")
        assert str(err) == "test message"
