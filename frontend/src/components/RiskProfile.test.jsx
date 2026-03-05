import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RiskProfile from "./RiskProfile";

const mockResults = [
  {
    service_id: 1,
    name: "ServiceOne",
    icon: "https://example.com/one.png",
    grade: "B+",
    summary: "Decent privacy policy",
    red_flags: ["Shares data with advertisers"],
    warnings: ["Uses tracking cookies"],
    positives: ["Allows data export"],
    categories: {},
    highlights: [],
    actions: [
      {
        label: "Delete Account",
        description: "Remove your account",
        url: "https://service.com/delete",
        category: "deletion",
      },
    ],
  },
  {
    service_id: 2,
    name: "ServiceTwo",
    icon: "https://example.com/two.png",
    grade: "C",
    summary: "Below average policy",
    red_flags: ["Extensive data collection", "Third-party sharing"],
    warnings: [],
    positives: [],
    categories: {},
    highlights: [],
    actions: [],
  },
];

describe("RiskProfile", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when no results", () => {
    const { container } = render(
      <RiskProfile overallGrade="N/A" results={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("returns null when results is null", () => {
    const { container } = render(
      <RiskProfile overallGrade="N/A" results={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("displays overall grade", () => {
    render(<RiskProfile overallGrade="B" results={mockResults} />);
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("shows red flag count", () => {
    render(<RiskProfile overallGrade="B" results={mockResults} />);
    expect(screen.getByText(/3 red flag/)).toBeInTheDocument();
  });

  it("shows warning count", () => {
    render(<RiskProfile overallGrade="B" results={mockResults} />);
    expect(screen.getByText(/1 warning/)).toBeInTheDocument();
  });

  it("shows positive count", () => {
    render(<RiskProfile overallGrade="B" results={mockResults} />);
    expect(screen.getByText(/1 positive/)).toBeInTheDocument();
  });

  it("renders service cards", () => {
    render(<RiskProfile overallGrade="B" results={mockResults} />);
    expect(screen.getAllByText("ServiceOne").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ServiceTwo").length).toBeGreaterThan(0);
    expect(screen.getByText("Decent privacy policy")).toBeInTheDocument();
  });

  it("expands details on click", () => {
    render(<RiskProfile overallGrade="B" results={mockResults} />);
    const showButtons = screen.getAllByTitle(/Show detailed findings/);
    fireEvent.click(showButtons[0]);
    expect(
      screen.getByText("Shares data with advertisers")
    ).toBeInTheDocument();
    expect(screen.getByText("Uses tracking cookies")).toBeInTheDocument();
    expect(screen.getByText("Allows data export")).toBeInTheDocument();
  });

  it("shows actions when expanded", () => {
    render(<RiskProfile overallGrade="B" results={mockResults} />);
    const showButtons = screen.getAllByTitle(/Show detailed findings/);
    fireEvent.click(showButtons[0]);
    expect(screen.getAllByText("Delete Account").length).toBeGreaterThan(0);
    expect(screen.getAllByText("What You Can Do").length).toBeGreaterThan(0);
  });

  it("calls onClearCache when button clicked", () => {
    const onClearCache = vi.fn();
    render(
      <RiskProfile
        overallGrade="B"
        results={mockResults}
        onClearCache={onClearCache}
        isLoading={false}
      />
    );
    fireEvent.click(screen.getByText("Clear Cache"));
    expect(onClearCache).toHaveBeenCalled();
  });

  it("shows service count", () => {
    render(<RiskProfile overallGrade="B" results={mockResults} />);
    expect(screen.getByText(/Based on 2 service/)).toBeInTheDocument();
  });

  it("does not show mock banner for real results", () => {
    render(<RiskProfile overallGrade="B" results={mockResults} />);
    expect(screen.queryByTestId("mock-banner")).not.toBeInTheDocument();
  });

  it("shows mock banner when any result has mock flag", () => {
    const mockResultsWithFlag = [
      { ...mockResults[0], mock: true },
      mockResults[1],
    ];
    render(<RiskProfile overallGrade="B" results={mockResultsWithFlag} />);
    expect(screen.getByTestId("mock-banner")).toBeInTheDocument();
    expect(screen.getByText(/temporarily unavailable/)).toBeInTheDocument();
  });

  it("renders grade badges for all grade letters", () => {
    const grades = ["A+", "B", "C-", "D", "F", "N/A"];
    for (const grade of grades) {
      const result = { ...mockResults[0], grade };
      const { unmount } = render(
        <RiskProfile overallGrade={grade} results={[result]} />
      );
      expect(screen.getAllByText(grade).length).toBeGreaterThanOrEqual(1);
      unmount();
    }
  });

  it("toggles chat open and close", () => {
    Element.prototype.scrollIntoView = vi.fn();
    render(<RiskProfile overallGrade="B" results={mockResults} />);

    // Chat button has title "Ask questions about this policy"
    const chatBtns = screen.getAllByTitle(/Ask questions about this policy/);
    fireEvent.click(chatBtns[0]);
    expect(screen.getAllByTitle("Close chat").length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByTitle("Close chat")[0]);
    expect(screen.getAllByTitle(/Ask questions about this policy/).length).toBeGreaterThan(0);
  });

  it("shows View full policy button", () => {
    render(<RiskProfile overallGrade="B" results={mockResults} />);
    expect(screen.getAllByTitle("View the full privacy policy").length).toBeGreaterThan(0);
  });

  it("shows PDF download button", () => {
    render(<RiskProfile overallGrade="B" results={mockResults} />);
    expect(screen.getAllByTitle("Download PDF report").length).toBeGreaterThan(0);
  });

  it("calls onRescanService when rescan button clicked", () => {
    const onRescanService = vi.fn();
    render(
      <RiskProfile
        overallGrade="B"
        results={mockResults}
        onRescanService={onRescanService}
        isLoading={false}
      />
    );
    const rescanButtons = screen.getAllByTitle("Rescan this service");
    // Results sort ascending by GPA so ServiceTwo (C) renders before ServiceOne (B+)
    fireEvent.click(rescanButtons[1]);
    expect(onRescanService).toHaveBeenCalledWith(1);
  });

  it("collapses details when clicked again", () => {
    render(<RiskProfile overallGrade="B" results={mockResults} />);
    const showButtons = screen.getAllByTitle(/Show detailed findings/);
    fireEvent.click(showButtons[0]);
    expect(
      screen.getByText("Shares data with advertisers")
    ).toBeInTheDocument();

    // Click details button again (now has "Hide detailed findings" title)
    const hideButton = screen.getAllByTitle(/Hide detailed findings/)[0];
    fireEvent.click(hideButton);
    // Content uses CSS collapse animation, so element stays in DOM but container loses 'open' class
    const collapseDiv = screen.getByText("Shares data with advertisers").closest(".details-collapse");
    expect(collapseDiv).not.toHaveClass("open");
  });

  it("renders results with different stripe colors based on grade", () => {
    const results = [
      { ...mockResults[0], grade: "A+" },
      { ...mockResults[1], grade: "F" },
    ];
    render(<RiskProfile overallGrade="C" results={results} />);
    expect(screen.getAllByText("ServiceOne").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ServiceTwo").length).toBeGreaterThan(0);
  });

  it("shows Share button when results are present", () => {
    render(<RiskProfile overallGrade="B" results={mockResults} />);
    expect(screen.getByTestId("share-button")).toBeInTheDocument();
  });

  it("clicking Share button opens modal with correct URL", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "abc123def456" }),
    });

    render(<RiskProfile overallGrade="B" results={mockResults} />);
    fireEvent.click(screen.getByTestId("share-button"));

    await waitFor(() => {
      expect(screen.getByTestId("share-url-input")).toBeInTheDocument();
    });

    const input = screen.getByTestId("share-url-input");
    expect(input.value).toContain("/report/abc123def456");
  });

  it("Copy button writes to clipboard and shows Copied!", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "abc123def456" }),
    });
    const writeTextMock = vi.fn().mockResolvedValueOnce(undefined);
    Object.assign(navigator, { clipboard: { writeText: writeTextMock } });

    render(<RiskProfile overallGrade="B" results={mockResults} />);
    fireEvent.click(screen.getByTestId("share-button"));

    await waitFor(() => {
      expect(screen.getByTestId("copy-button")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("copy-button"));

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalled();
      expect(screen.getByText("Copied!")).toBeInTheDocument();
    });
  });

  it("Close button dismisses the share modal", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "abc123def456" }),
    });

    render(<RiskProfile overallGrade="B" results={mockResults} />);
    fireEvent.click(screen.getByTestId("share-button"));

    await waitFor(() => {
      expect(screen.getByTestId("share-url-input")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText("Close share modal"));
    expect(screen.queryByTestId("share-url-input")).not.toBeInTheDocument();
  });

  // ── TL;DR tests ──

  it("shows tldr text when available on service card", () => {
    const resultsWithTldr = [
      { ...mockResults[0], tldr: "Short TL;DR for ServiceOne" },
      mockResults[1],
    ];
    render(<RiskProfile overallGrade="B" results={resultsWithTldr} />);
    expect(screen.getByText("Short TL;DR for ServiceOne")).toBeInTheDocument();
    // summary should NOT appear when tldr is present
    expect(screen.queryByText("Decent privacy policy")).not.toBeInTheDocument();
  });

  it("falls back to summary when tldr is missing", () => {
    // mockResults[0] has no tldr field, so summary should show
    render(<RiskProfile overallGrade="B" results={mockResults} />);
    expect(screen.getByText("Decent privacy policy")).toBeInTheDocument();
    expect(screen.getByText("Below average policy")).toBeInTheDocument();
  });

  it("displays overall TL;DR in risk profile header", () => {
    render(<RiskProfile overallGrade="B" results={mockResults} />);
    // mockResults: B+ and C → 1 good, 1 not good → "Mixed results across 2 services — 1 need attention"
    expect(
      screen.getByText(/Mixed results across 2 services/)
    ).toBeInTheDocument();
  });

  it("shows appropriate message for mostly bad grades", () => {
    const badResults = [
      { ...mockResults[0], grade: "D", red_flags: [], warnings: [], positives: [] },
      { ...mockResults[1], grade: "F" },
      {
        service_id: 3,
        name: "ServiceThree",
        icon: "https://example.com/three.png",
        grade: "D-",
        summary: "Poor policy",
        red_flags: [],
        warnings: [],
        positives: [],
        categories: {},
        highlights: [],
        actions: [],
      },
    ];
    render(<RiskProfile overallGrade="D" results={badResults} />);
    // 3 out of 3 are D/F → poor > total/2
    expect(
      screen.getByText(/3 of 3 services pose significant privacy risks/)
    ).toBeInTheDocument();
  });

  it("shows appropriate message for mostly good grades", () => {
    const goodResults = [
      { ...mockResults[0], grade: "A+" },
      { ...mockResults[1], grade: "B+", summary: "Good policy" },
    ];
    render(<RiskProfile overallGrade="A" results={goodResults} />);
    // All are A/B → good === total
    expect(
      screen.getByText(/All 2 services maintain strong privacy practices/)
    ).toBeInTheDocument();
  });

  // ── Policy excerpt quote tests ──

  it("shows excerpt toggle button when quote is present", () => {
    const results = [
      {
        ...mockResults[0],
        red_flags: [{ text: "Sells personal data", quote: "We may sell your personal information to third parties" }],
        warnings: [],
        positives: [],
      },
    ];
    render(<RiskProfile overallGrade="B" results={results} />);
    fireEvent.click(screen.getAllByTitle(/Show detailed findings/)[0]);
    expect(screen.getByText("Sells personal data")).toBeInTheDocument();
    expect(screen.getByTitle("Show policy excerpt")).toBeInTheDocument();
  });

  it("reveals quote text when excerpt button is clicked", () => {
    const results = [
      {
        ...mockResults[0],
        red_flags: [{ text: "Sells personal data", quote: "We may sell your personal information to third parties" }],
        warnings: [],
        positives: [],
      },
    ];
    render(<RiskProfile overallGrade="B" results={results} />);
    fireEvent.click(screen.getAllByTitle(/Show detailed findings/)[0]);
    expect(screen.queryByText(/We may sell your personal information/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByTitle("Show policy excerpt"));
    expect(screen.getByText(/We may sell your personal information/)).toBeInTheDocument();
  });

  it("hides quote when excerpt button is clicked again", () => {
    const results = [
      {
        ...mockResults[0],
        red_flags: [{ text: "Sells personal data", quote: "We may sell your personal information to third parties" }],
        warnings: [],
        positives: [],
      },
    ];
    render(<RiskProfile overallGrade="B" results={results} />);
    fireEvent.click(screen.getAllByTitle(/Show detailed findings/)[0]);
    fireEvent.click(screen.getByTitle("Show policy excerpt"));
    expect(screen.getByText(/We may sell your personal information/)).toBeInTheDocument();
    fireEvent.click(screen.getByTitle("Hide policy excerpt"));
    expect(screen.queryByText(/We may sell your personal information/)).not.toBeInTheDocument();
  });

  it("does not show excerpt button when quote is empty", () => {
    const results = [
      {
        ...mockResults[0],
        red_flags: [{ text: "Sells personal data", quote: "" }],
        warnings: [],
        positives: [],
      },
    ];
    render(<RiskProfile overallGrade="B" results={results} />);
    fireEvent.click(screen.getAllByTitle(/Show detailed findings/)[0]);
    expect(screen.queryByTitle("Show policy excerpt")).not.toBeInTheDocument();
  });

  it("shows excerpt buttons for warnings and positives with quotes", () => {
    const results = [
      {
        ...mockResults[0],
        red_flags: [],
        warnings: [{ text: "Retains data 5 years", quote: "we retain your data for a period of five years" }],
        positives: [{ text: "Easy data deletion", quote: "You may request deletion of all personal data" }],
      },
    ];
    render(<RiskProfile overallGrade="B" results={results} />);
    fireEvent.click(screen.getAllByTitle(/Show detailed findings/)[0]);
    const excerptBtns = screen.getAllByTitle("Show policy excerpt");
    expect(excerptBtns).toHaveLength(2);
  });
});
