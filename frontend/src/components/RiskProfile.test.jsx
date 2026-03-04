import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
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
    expect(screen.getByText("ServiceOne")).toBeInTheDocument();
    expect(screen.getByText("ServiceTwo")).toBeInTheDocument();
    expect(screen.getByText("Decent privacy policy")).toBeInTheDocument();
  });

  it("expands details on click", () => {
    render(<RiskProfile overallGrade="B" results={mockResults} />);
    const showButtons = screen.getAllByText(/Show details/);
    fireEvent.click(showButtons[0]);
    expect(
      screen.getByText("Shares data with advertisers")
    ).toBeInTheDocument();
    expect(screen.getByText("Uses tracking cookies")).toBeInTheDocument();
    expect(screen.getByText("Allows data export")).toBeInTheDocument();
  });

  it("shows actions when expanded", () => {
    render(<RiskProfile overallGrade="B" results={mockResults} />);
    const showButtons = screen.getAllByText(/Show details/);
    fireEvent.click(showButtons[0]);
    expect(screen.getByText("Delete Account")).toBeInTheDocument();
    expect(screen.getByText("What You Can Do")).toBeInTheDocument();
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
    expect(screen.getByText(/2 service/)).toBeInTheDocument();
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
});
