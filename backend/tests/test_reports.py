import pytest


@pytest.mark.asyncio
class TestReportsEndpoints:
    async def test_create_report_returns_201_and_id(self, client):
        resp = await client.post(
            "/api/reports",
            json={
                "overall_grade": "B",
                "results": [{"service_id": 1, "name": "TestSvc", "grade": "B"}],
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert "id" in data
        assert len(data["id"]) == 12
        assert data["id"].isalnum()

    async def test_create_report_missing_fields_returns_422(self, client):
        resp = await client.post("/api/reports", json={"overall_grade": "A"})
        assert resp.status_code == 422

    async def test_get_report_round_trip(self, client):
        results = [{"service_id": 2, "name": "SvcTwo", "grade": "C+"}]
        create_resp = await client.post(
            "/api/reports",
            json={"overall_grade": "C+", "results": results},
        )
        assert create_resp.status_code == 201
        report_id = create_resp.json()["id"]

        get_resp = await client.get(f"/api/reports/{report_id}")
        assert get_resp.status_code == 200
        data = get_resp.json()
        assert data["id"] == report_id
        assert data["overall_grade"] == "C+"
        assert data["results"][0]["name"] == "SvcTwo"
        assert data["results"][0]["grade"] == "C+"
        assert data["results"][0]["service_id"] == 2
        assert "created_at" in data

    async def test_get_nonexistent_report_returns_404(self, client):
        resp = await client.get("/api/reports/aabbccddeeff")
        assert resp.status_code == 404
        assert resp.json()["detail"] == "Report not found"

    async def test_create_report_invalid_grade_returns_422(self, client):
        resp = await client.post(
            "/api/reports",
            json={
                "overall_grade": "Z+",
                "results": [{"name": "Svc", "grade": "A"}],
            },
        )
        assert resp.status_code == 422

    async def test_create_report_too_many_results_returns_422(self, client):
        results = [{"name": f"Svc{i}", "grade": "A"} for i in range(51)]
        resp = await client.post(
            "/api/reports",
            json={"overall_grade": "A", "results": results},
        )
        assert resp.status_code == 422

    async def test_get_report_invalid_id_format_returns_422(self, client):
        resp = await client.get("/api/reports/invalid!")
        assert resp.status_code == 422
