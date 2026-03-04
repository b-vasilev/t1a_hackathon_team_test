"""Tests for mock data structure and content."""

from app.analyzer import GPA_MAP
from app.mock_data import GENERIC_MOCK, MOCK_ANALYSES, get_mock_actions, get_mock_analysis

CATEGORY_KEYS = ["data_collection", "data_sharing", "data_retention", "tracking", "user_rights"]
VALID_GRADES = set(GPA_MAP.keys())
EXPECTED_SERVICES = ["google", "youtube", "facebook", "instagram", "whatsapp", "tiktok", "reddit", "amazon", "wikipedia"]


class TestMockDataStructure:
    def test_all_seed_services_present(self):
        for name in EXPECTED_SERVICES:
            assert name in MOCK_ANALYSES, f"Missing mock data for {name}"

    def test_each_service_has_required_fields(self):
        required = {"summary", "red_flags", "warnings", "positives", "categories", "highlights", "actions"}
        for name, data in MOCK_ANALYSES.items():
            for field in required:
                assert field in data, f"{name} missing field: {field}"

    def test_categories_have_all_keys(self):
        for name, data in MOCK_ANALYSES.items():
            for key in CATEGORY_KEYS:
                assert key in data["categories"], f"{name} missing category: {key}"
                cat = data["categories"][key]
                assert "grade" in cat, f"{name}.{key} missing grade"
                assert "finding" in cat, f"{name}.{key} missing finding"

    def test_grades_are_valid(self):
        for name, data in MOCK_ANALYSES.items():
            for key in CATEGORY_KEYS:
                grade = data["categories"][key]["grade"]
                assert grade in VALID_GRADES, f"{name}.{key} has invalid grade: {grade}"

    def test_list_lengths(self):
        for name, data in MOCK_ANALYSES.items():
            assert len(data["red_flags"]) <= 3, f"{name} too many red_flags"
            assert len(data["warnings"]) <= 3, f"{name} too many warnings"
            assert len(data["positives"]) <= 3, f"{name} too many positives"
            assert len(data["highlights"]) <= 5, f"{name} too many highlights"

    def test_actions_have_required_fields(self):
        for name, data in MOCK_ANALYSES.items():
            for action in data["actions"]:
                assert "label" in action, f"{name} action missing label"
                assert "url" in action, f"{name} action missing url"
                assert "category" in action, f"{name} action missing category"
                assert action["url"].startswith("http"), f"{name} action URL invalid: {action['url']}"

    def test_generic_mock_structure(self):
        required = {"summary", "red_flags", "warnings", "positives", "categories", "highlights", "actions"}
        for field in required:
            assert field in GENERIC_MOCK, f"Generic mock missing field: {field}"


class TestGetMockAnalysis:
    def test_known_service(self):
        result = get_mock_analysis("Google")
        assert result["mock"] is True
        assert result["grade"] != "N/A"
        assert "categories" in result

    def test_case_insensitive(self):
        result = get_mock_analysis("FACEBOOK")
        assert result["mock"] is True
        assert len(result["red_flags"]) > 0

    def test_unknown_service_returns_generic(self):
        result = get_mock_analysis("UnknownService123")
        assert result["mock"] is True
        assert "unavailable" in result["summary"].lower()

    def test_has_computed_grade(self):
        result = get_mock_analysis("Wikipedia")
        assert result["grade"] in VALID_GRADES


class TestGetMockActions:
    def test_known_service(self):
        actions = get_mock_actions("Google")
        assert len(actions) > 0
        assert all("url" in a for a in actions)

    def test_unknown_service_returns_empty(self):
        actions = get_mock_actions("UnknownService123")
        assert actions == []
