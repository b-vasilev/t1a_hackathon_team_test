from app.analyzer import (
    _build_section_index,
    _clean_jina_text,
    _empty_result,
    _extract_structured_text,
    _extract_text,
    _is_google_page,
    find_relevant_sections,
    _has_useful_content,
    _hash_text,
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

    def test_tldr_extracted(self):
        data = {"tldr": "Short punchy summary.", "highlights": ["First highlight"]}
        result = _normalize(data)
        assert result["tldr"] == "Short punchy summary."

    def test_tldr_fallback_to_first_highlight(self):
        data = {"highlights": ["First highlight", "Second"]}
        result = _normalize(data)
        assert result["tldr"] == "First highlight"

    def test_tldr_fallback_when_empty_string(self):
        data = {"tldr": "", "highlights": ["First highlight"]}
        result = _normalize(data)
        assert result["tldr"] == "First highlight"

    def test_tldr_fallback_no_highlights(self):
        result = _normalize({})
        assert result["tldr"] == "Analysis complete."

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
        assert result["tldr"] == "Something went wrong"
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
        # Must be >= 200 chars to pass _is_blocked_page check
        html = "<p>" + "x" * 300 + "</p>"
        assert _has_useful_content(html, min_length=50) is True
        assert _has_useful_content(html, min_length=500) is False


class TestExtractStructuredText:
    def test_preserves_headings(self):
        html = "<html><body><h2>Privacy</h2><p>We care about privacy.</p></body></html>"
        text, truncated = _extract_structured_text(html, 10000)
        assert "## Privacy" in text
        assert "We care about privacy." in text
        assert truncated is False

    def test_preserves_list_items(self):
        html = "<html><body><ul><li>Item one</li><li>Item two</li></ul></body></html>"
        text, _ = _extract_structured_text(html, 10000)
        assert "- Item one" in text
        assert "- Item two" in text

    def test_multiple_heading_levels(self):
        html = "<html><body><h1>Title</h1><h3>Sub</h3><p>Content</p></body></html>"
        text, _ = _extract_structured_text(html, 10000)
        assert "## Title" in text
        assert "## Sub" in text

    def test_truncation_flag(self):
        html = "<html><body>" + "<p>Long text paragraph here that is quite verbose.</p>" * 200 + "</body></html>"
        text, truncated = _extract_structured_text(html, 500)
        assert len(text) <= 500
        assert truncated is True

    def test_empty_body(self):
        html = "<html><body></body></html>"
        text, truncated = _extract_structured_text(html, 10000)
        assert text == ""
        assert truncated is False

    def test_strips_script_and_style(self):
        html = "<html><body><script>evil()</script><style>.x{}</style><p>Clean</p></body></html>"
        text, _ = _extract_structured_text(html, 10000)
        assert "evil" not in text
        assert "Clean" in text


class TestBuildSectionIndex:
    def test_basic_sections(self):
        text = "## Introduction\n\nSome text here.\n\n## Data Collection\n\nWe collect data.\n\n## Your Rights\n\nYou have rights."
        sections = _build_section_index(text)
        assert len(sections) == 3
        assert sections[0]["heading"] == "Introduction"
        assert sections[1]["heading"] == "Data Collection"
        assert sections[2]["heading"] == "Your Rights"

    def test_empty_text(self):
        assert _build_section_index("") == []

    def test_no_headings(self):
        assert _build_section_index("Just plain text without headings.") == []

    def test_section_lengths_positive(self):
        text = "## A\n\n12345\n\n## B\n\n67890"
        sections = _build_section_index(text)
        assert len(sections) == 2
        assert all(s["length"] > 0 for s in sections)


class TestHashText:
    def test_deterministic(self):
        assert _hash_text("hello") == _hash_text("hello")

    def test_different_input_different_hash(self):
        assert _hash_text("hello") != _hash_text("world")

    def test_returns_hex_string(self):
        result = _hash_text("test")
        assert len(result) == 64
        assert all(c in "0123456789abcdef" for c in result)


class TestFindRelevantSections:
    def test_matches_relevant_section(self):
        text = "## Data Collection\nWe collect your email and name.\n\n## Data Sharing\nWe share with partners."
        sections = _build_section_index(text)
        result = find_relevant_sections("What data do you collect?", sections, text)
        assert "collect your email" in result

    def test_no_sections_returns_truncated_text(self):
        text = "Just plain text " * 100
        result = find_relevant_sections("question", [], text, max_chars=50)
        assert len(result) <= 50

    def test_no_match_returns_full_text(self):
        text = "## Privacy\nSome content.\n\n## Terms\nMore content."
        sections = _build_section_index(text)
        result = find_relevant_sections("zzzzz unusual query", sections, text)
        assert "Some content" in result

    def test_respects_max_chars(self):
        text = "## Data Collection\n" + "x" * 5000 + "\n\n## Data Sharing\n" + "y" * 5000
        sections = _build_section_index(text)
        result = find_relevant_sections("data collection sharing", sections, text, max_chars=100)
        assert len(result) <= 100


class TestIsGooglePage:
    def test_detects_portuguese_consent_page(self):
        text = "Antes de continuar para a Google Fornecer e manter os serviços Google"
        assert _is_google_page(text) is True

    def test_detects_english_consent_page(self):
        text = "Before you continue to Google some other content here"
        assert _is_google_page(text) is True

    def test_detects_search_no_results(self):
        text = "A sua pesquisa - cache:https://example.com - não encontrou nenhum documento."
        assert _is_google_page(text) is True

    def test_normal_content_passes(self):
        text = "Privacy Policy. We collect data to provide services. " * 20
        assert _is_google_page(text) is False

    def test_empty_text(self):
        assert _is_google_page("") is False


class TestCleanJinaText:
    def test_strips_metadata_headers(self):
        text = "Title: Reddit Privacy Policy\nURL Source: https://reddit.com/privacy\nMarkdown Content:\n\n## Privacy\n\nWe care."
        result = _clean_jina_text(text)
        assert "Title:" not in result
        assert "URL Source:" not in result
        assert "Markdown Content:" not in result
        assert "## Privacy" in result
        assert "We care." in result

    def test_converts_markdown_links_to_text(self):
        text = "See our [Privacy Policy](https://example.com/privacy) for details."
        result = _clean_jina_text(text)
        assert result == "See our Privacy Policy for details."

    def test_normalizes_heading_levels(self):
        text = "# Title\n\n### Subsection\n\n#### Deep"
        result = _clean_jina_text(text)
        assert "## Title" in result
        assert "## Subsection" in result
        assert "## Deep" in result

    def test_converts_star_bullets(self):
        text = "* Item one\n* Item two\n+ Item three"
        result = _clean_jina_text(text)
        assert "- Item one" in result
        assert "- Item two" in result
        assert "- Item three" in result

    def test_removes_bold_italic(self):
        text = "This is **bold** and *italic* and ***both***."
        result = _clean_jina_text(text)
        assert result == "This is bold and italic and both."

    def test_plain_text_passthrough(self):
        text = "Just plain text without any markdown."
        assert _clean_jina_text(text) == text
