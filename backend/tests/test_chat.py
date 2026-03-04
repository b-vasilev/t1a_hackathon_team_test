from unittest.mock import AsyncMock, MagicMock, patch

import pytest


def _mock_policy_text_obj(content="This is the full privacy policy text for testing purposes."):
    """Create a mock PolicyText object."""
    pt = MagicMock()
    pt.id = 1
    pt.content = content
    pt.was_truncated = False
    pt.sections_json = None
    return pt


@pytest.mark.asyncio
class TestChatEndpoint:
    """Tests for POST /api/chat."""

    async def test_user_message_too_long_returns_422(self, client):
        long_msg = "x" * 2001
        resp = await client.post(
            "/api/chat",
            json={"service_id": 1, "messages": [{"role": "user", "content": long_msg}]},
        )
        assert resp.status_code == 422

    async def test_assistant_message_long_is_allowed(self, client):
        """Assistant messages in conversation history may exceed the user limit."""
        long_assistant = "a" * 3000
        resp = await client.post(
            "/api/chat",
            json={
                "service_id": 9999,
                "messages": [
                    {"role": "user", "content": "Hi"},
                    {"role": "assistant", "content": long_assistant},
                    {"role": "user", "content": "Thanks"},
                ],
            },
        )
        # Should fail with 404 (service not found), not 422 (validation)
        assert resp.status_code == 404

    async def test_too_many_messages_returns_400(self, client):
        messages = [{"role": "user" if i % 2 == 0 else "assistant", "content": "msg"} for i in range(21)]
        # Ensure last message is from user
        messages.append({"role": "user", "content": "final"})
        resp = await client.post(
            "/api/chat",
            json={"service_id": 1, "messages": messages},
        )
        assert resp.status_code == 400
        assert "too many" in resp.json()["detail"].lower()

    async def test_empty_messages_returns_400(self, client):
        resp = await client.post("/api/chat", json={"service_id": 1, "messages": []})
        assert resp.status_code == 400
        assert "empty" in resp.json()["detail"].lower()

    async def test_last_message_not_user_returns_400(self, client):
        resp = await client.post(
            "/api/chat",
            json={
                "service_id": 1,
                "messages": [
                    {"role": "user", "content": "Hello"},
                    {"role": "assistant", "content": "Hi there"},
                ],
            },
        )
        assert resp.status_code == 400
        assert "user" in resp.json()["detail"].lower()

    async def test_missing_service_returns_404(self, client):
        resp = await client.post(
            "/api/chat",
            json={
                "service_id": 9999,
                "messages": [{"role": "user", "content": "Hello"}],
            },
        )
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()

    async def test_no_analysis_returns_404(self, client):
        # TestService exists (seeded in conftest) but has no PolicyAnalysis
        services = (await client.get("/api/services")).json()
        sid = services[0]["id"]

        resp = await client.post(
            "/api/chat",
            json={
                "service_id": sid,
                "messages": [{"role": "user", "content": "Hello"}],
            },
        )
        assert resp.status_code == 404
        assert "no analysis" in resp.json()["detail"].lower()

    @patch("app.main.get_or_create_policy_text", new_callable=AsyncMock, return_value=None)
    @patch("app.main.get_service_actions", new_callable=AsyncMock, return_value=[])
    @patch(
        "app.main.analyze_policy",
        new_callable=AsyncMock,
        return_value={
            "grade": "B",
            "summary": "OK",
            "tldr": "OK policy overall.",
            "red_flags": [],
            "warnings": [],
            "positives": [],
            "categories": {},
            "highlights": [],
            "policy_text": None,
        },
    )
    async def test_no_policy_text_returns_404(self, mock_analyze, mock_actions, mock_pt, client):
        # Analyze the service so a PolicyAnalysis row exists, but with policy_text=None
        services = (await client.get("/api/services")).json()
        sid = services[0]["id"]
        await client.post("/api/analyze", json={"service_ids": [sid]})

        resp = await client.post(
            "/api/chat",
            json={
                "service_id": sid,
                "messages": [{"role": "user", "content": "Hello"}],
            },
        )
        assert resp.status_code == 404
        assert "no" in resp.json()["detail"].lower()

    @patch("app.main.chat_about_policy", new_callable=AsyncMock, return_value="They collect your email.")
    @patch("app.main.get_or_create_policy_text", new_callable=AsyncMock)
    @patch("app.main.get_service_actions", new_callable=AsyncMock, return_value=[])
    @patch(
        "app.main.analyze_policy",
        new_callable=AsyncMock,
        return_value={
            "grade": "B+",
            "summary": "Decent policy",
            "tldr": "Decent policy with minor concerns.",
            "red_flags": [],
            "warnings": [],
            "positives": [],
            "categories": {},
            "highlights": ["Decent policy"],
            "policy_text": "This is the full privacy policy text for testing purposes.",
        },
    )
    async def test_success_returns_answer(self, mock_analyze, mock_actions, mock_pt, mock_chat, client):
        mock_pt.return_value = _mock_policy_text_obj()

        # First analyze the service to populate PolicyAnalysis with policy_text
        services = (await client.get("/api/services")).json()
        sid = services[0]["id"]
        await client.post("/api/analyze", json={"service_ids": [sid]})

        # Now chat
        resp = await client.post(
            "/api/chat",
            json={
                "service_id": sid,
                "messages": [{"role": "user", "content": "What data do they collect?"}],
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "answer" in data
        assert "service_id" in data
        assert data["answer"] == "They collect your email."
        assert data["service_id"] == sid

        # Verify chat_about_policy was called with correct args
        mock_chat.assert_called_once()
        call_kwargs = mock_chat.call_args
        assert call_kwargs.kwargs["service_name"] == "TestService"
        assert call_kwargs.kwargs["grade"] == "B+"
        assert "privacy policy text" in call_kwargs.kwargs["policy_text"]
        assert call_kwargs.kwargs["messages"] == [{"role": "user", "content": "What data do they collect?"}]
        # Verify analysis context is passed
        ctx = call_kwargs.kwargs["analysis_context"]
        assert isinstance(ctx, dict)
        assert "summary" in ctx
        assert "red_flags" in ctx
        assert "warnings" in ctx
        assert "positives" in ctx
        assert "categories" in ctx
        assert "highlights" in ctx
        assert "actions" in ctx

    @patch(
        "app.main.chat_about_policy",
        new_callable=AsyncMock,
        side_effect=__import__("app.analyzer", fromlist=["LLMUnavailableError"]).LLMUnavailableError("API down"),
    )
    @patch("app.main.get_or_create_policy_text", new_callable=AsyncMock)
    @patch("app.main.get_service_actions", new_callable=AsyncMock, return_value=[])
    @patch(
        "app.main.analyze_policy",
        new_callable=AsyncMock,
        return_value={
            "grade": "B+",
            "summary": "Decent policy",
            "tldr": "Decent policy with minor concerns.",
            "red_flags": [],
            "warnings": [],
            "positives": [],
            "categories": {},
            "highlights": ["Decent policy"],
            "policy_text": "This is the full privacy policy text for testing purposes.",
        },
    )
    async def test_llm_unavailable_returns_503(self, mock_analyze, mock_actions, mock_pt, mock_chat, client):
        mock_pt.return_value = _mock_policy_text_obj()

        # Analyze first
        services = (await client.get("/api/services")).json()
        sid = services[0]["id"]
        await client.post("/api/analyze", json={"service_ids": [sid]})

        # Chat should return 503 when LLM is unavailable
        resp = await client.post(
            "/api/chat",
            json={
                "service_id": sid,
                "messages": [{"role": "user", "content": "Hello"}],
            },
        )
        assert resp.status_code == 503
        assert "unavailable" in resp.json()["detail"].lower()
