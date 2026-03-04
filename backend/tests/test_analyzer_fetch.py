from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.analyzer import fetch_text


def _make_response(status_code=200, text="", content_length=None):
    resp = MagicMock()
    resp.status_code = status_code
    resp.text = text
    resp.raise_for_status = MagicMock()
    if status_code >= 400:
        resp.raise_for_status.side_effect = Exception(f"HTTP {status_code}")
    return resp


@pytest.mark.asyncio
class TestFetchText:
    @patch("app.analyzer.AsyncSession")
    async def test_direct_fetch_success(self, mock_session_cls):
        html = "<html><body><p>" + "Privacy policy content. " * 50 + "</p></body></html>"
        mock_session = AsyncMock()
        mock_session.get = AsyncMock(return_value=_make_response(200, html))
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)
        mock_session_cls.return_value = mock_session

        text, truncated = await fetch_text("https://example.com/privacy")
        assert "Privacy policy content" in text
        assert truncated is False

    @patch("app.analyzer.AsyncSession")
    async def test_fallback_to_google_cache(self, mock_session_cls):
        # Attempt 1 fails, Attempt 2 succeeds
        html_good = "<html><body><p>" + "Cached policy text. " * 50 + "</p></body></html>"

        fail_resp = _make_response(403, "<html><body>Forbidden</body></html>")
        fail_resp.raise_for_status.side_effect = Exception("HTTP 403")
        success_resp = _make_response(200, html_good)

        mock_session = AsyncMock()
        mock_session.get = AsyncMock(side_effect=[fail_resp, success_resp])
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)
        mock_session_cls.return_value = mock_session

        text, truncated = await fetch_text("https://example.com/privacy")
        assert "Cached policy text" in text
        assert mock_session.get.call_count == 2

    @patch("app.analyzer.AsyncSession")
    async def test_all_methods_fail_raises(self, mock_session_cls):
        fail_resp = _make_response(500, "Error")
        fail_resp.raise_for_status.side_effect = Exception("HTTP 500")

        # Jina needs a short response to fail the length check
        jina_resp = _make_response(200, "Too short")

        mock_session = AsyncMock()
        mock_session.get = AsyncMock(side_effect=[fail_resp, fail_resp, fail_resp, jina_resp])
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)
        mock_session_cls.return_value = mock_session

        with pytest.raises(RuntimeError, match="all methods failed"):
            await fetch_text("https://example.com/privacy")

    @patch("app.analyzer.AsyncSession")
    async def test_non_200_with_useful_content_accepted(self, mock_session_cls):
        # 403 response but has enough text → accepted
        html = "<html><body><p>" + "This is a useful response despite 403. " * 30 + "</p></body></html>"
        resp = _make_response(403, html)

        mock_session = AsyncMock()
        mock_session.get = AsyncMock(return_value=resp)
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)
        mock_session_cls.return_value = mock_session

        text, truncated = await fetch_text("https://example.com/privacy")
        assert "useful response" in text

    @patch("app.analyzer.AsyncSession")
    async def test_jina_fallback_success(self, mock_session_cls):
        fail_resp = _make_response(500, "Error")
        fail_resp.raise_for_status.side_effect = Exception("HTTP 500")

        jina_text = "Jina rendered content. " * 50
        jina_resp = _make_response(200, jina_text)

        mock_session = AsyncMock()
        # Attempts 1-3 fail, Attempt 4 (Jina) succeeds
        mock_session.get = AsyncMock(side_effect=[fail_resp, fail_resp, fail_resp, jina_resp])
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)
        mock_session_cls.return_value = mock_session

        text, truncated = await fetch_text("https://example.com/privacy")
        assert "Jina rendered content" in text
