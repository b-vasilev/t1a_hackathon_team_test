from app.analyzer import (
    _empty_result,
    _extract_text,
    _has_useful_content,
    _normalize,
    average_grade,
    gpa_to_letter,
)


class TestGpaToLetter:
    def test_perfect(self):
        assert gpa_to_letter(4.3) == "A+"

    def test_a(self):
        assert gpa_to_letter(4.0) == "A"

    def test_a_minus(self):
        assert gpa_to_letter(3.7) == "A-"

    def test_b_plus(self):
        assert gpa_to_letter(3.3) == "B+"

    def test_b(self):
        assert gpa_to_letter(3.0) == "B"

    def test_c(self):
        assert gpa_to_letter(2.0) == "C"

    def test_d(self):
        assert gpa_to_letter(1.0) == "D"

    def test_f(self):
        assert gpa_to_letter(0.0) == "F"

    def test_negative(self):
        assert gpa_to_letter(-1.0) == "F"

    def test_boundary_between_a_and_b(self):
        # A- threshold is 3.7 - 0.15 = 3.55, so 3.55 rounds down to B+
        assert gpa_to_letter(3.56) == "A-"
        assert gpa_to_letter(3.54) == "B+"


class TestAverageGrade:
    def test_single_grade(self):
        assert average_grade(["A"]) == "A"

    def test_same_grades(self):
        assert average_grade(["B", "B", "B"]) == "B"

    def test_mixed_grades(self):
        result = average_grade(["A", "C"])
        assert result == "B"

    def test_empty_list(self):
        assert average_grade([]) == "N/A"

    def test_invalid_grades_ignored(self):
        assert average_grade(["N/A", "INVALID"]) == "N/A"

    def test_mixed_valid_invalid(self):
        assert average_grade(["A", "N/A"]) == "A"

    def test_all_f(self):
        assert average_grade(["F", "F"]) == "F"


class TestNormalize:
    def test_fills_missing_categories(self):
        result = _normalize({"categories": {}})
        cats = result["categories"]
        assert set(cats.keys()) == {"data_collection", "data_sharing", "data_retention", "tracking", "user_rights"}
        for key in cats:
            assert cats[key]["grade"] == "N/A"
            assert cats[key]["finding"] == "Not assessed"

    def test_preserves_existing_categories(self):
        data = {
            "categories": {
                "data_collection": {"grade": "A", "finding": "Minimal data collected"},
            }
        }
        result = _normalize(data)
        assert result["categories"]["data_collection"]["grade"] == "A"
        assert result["categories"]["data_collection"]["finding"] == "Minimal data collected"

    def test_caps_lists(self):
        data = {
            "red_flags": ["a", "b", "c", "d", "e"],
            "warnings": ["a", "b", "c", "d"],
            "positives": ["a", "b", "c", "d"],
            "highlights": ["a", "b", "c", "d", "e", "f", "g"],
        }
        result = _normalize(data)
        assert len(result["red_flags"]) == 3
        assert len(result["warnings"]) == 3
        assert len(result["positives"]) == 3
        assert len(result["highlights"]) == 5

    def test_non_list_fields_become_empty(self):
        data = {"red_flags": "not a list", "warnings": 42, "positives": None, "highlights": {}}
        result = _normalize(data)
        assert result["red_flags"] == []
        assert result["warnings"] == []
        assert result["positives"] == []
        assert result["highlights"] == []

    def test_summary_from_highlights(self):
        data = {"highlights": ["First highlight", "Second"]}
        result = _normalize(data)
        assert result["summary"] == "First highlight"

    def test_summary_fallback(self):
        result = _normalize({})
        assert result["summary"] == "Analysis complete."

    def test_grade_computed_from_categories(self):
        data = {
            "categories": {
                "data_collection": {"grade": "A", "finding": "x"},
                "data_sharing": {"grade": "A", "finding": "x"},
                "data_retention": {"grade": "A", "finding": "x"},
                "tracking": {"grade": "A", "finding": "x"},
                "user_rights": {"grade": "A", "finding": "x"},
            }
        }
        result = _normalize(data)
        assert result["grade"] == "A"


class TestEmptyResult:
    def test_structure(self):
        result = _empty_result("Something went wrong")
        assert result["grade"] == "N/A"
        assert result["summary"] == "Something went wrong"
        assert result["red_flags"] == []
        assert result["warnings"] == []
        assert result["positives"] == []
        assert result["categories"] == {}
        assert result["highlights"] == []


class TestExtractText:
    def test_strips_script_and_style(self):
        html = "<html><script>alert('x')</script><style>.a{}</style><p>Hello world</p></html>"
        text = _extract_text(html, 1000)
        assert "alert" not in text
        assert "Hello world" in text

    def test_strips_nav_footer_header(self):
        html = "<nav>Nav</nav><header>Head</header><main>Content</main><footer>Foot</footer>"
        text = _extract_text(html, 1000)
        assert "Nav" not in text
        assert "Head" not in text
        assert "Foot" not in text
        assert "Content" in text

    def test_respects_max_chars(self):
        html = "<p>" + "x" * 1000 + "</p>"
        text = _extract_text(html, 100)
        assert len(text) <= 100

    def test_empty_html(self):
        assert _extract_text("", 1000) == ""


class TestHasUsefulContent:
    def test_enough_content(self):
        html = "<p>" + "word " * 200 + "</p>"
        assert _has_useful_content(html) is True

    def test_too_short(self):
        html = "<p>Short</p>"
        assert _has_useful_content(html) is False

    def test_custom_min_length(self):
        html = "<p>" + "x" * 100 + "</p>"
        assert _has_useful_content(html, min_length=50) is True
        assert _has_useful_content(html, min_length=200) is False
