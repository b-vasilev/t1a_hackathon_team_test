import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/components/RiskProfile", () => ({
  default: ({ overallGrade, results, onRescanService, onClearCache }) => (
    <div data-testid="risk-profile">
      <span data-testid="rp-grade">{overallGrade}</span>
      <span data-testid="rp-results-count">{results?.length}</span>
      {onRescanService && <button data-testid="rp-rescan">Rescan</button>}
      {onClearCache && <button data-testid="rp-clear-cache">Clear Cache</button>}
    </div>
  ),
}));

import SharedReportPage from "./page";

const mockReport = {
  id: "abc123def456",
  overall_grade: "B+",
  created_at: "2026-03-04T12:00:00",
  results: [
    {
      service_id: 1,
      name: "TestService",
      grade: "B+",
      summary: "Good policy",
      red_flags: [],
      warnings: [],
      positives: [],
    },
  ],
};

describe("SharedReportPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders results on success", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockReport,
    });

    const jsx = await SharedReportPage({ params: Promise.resolve({ id: "abc123def456" }) });
    render(jsx);

    expect(screen.getByTestId("shared-banner")).toBeInTheDocument();
    expect(screen.getByTestId("risk-profile")).toBeInTheDocument();
    expect(screen.getByTestId("rp-grade").textContent).toBe("B+");
    expect(screen.getByTestId("rp-results-count").textContent).toBe("1");
  });

  it("shows not-found message on 404", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ detail: "Report not found" }),
    });

    const jsx = await SharedReportPage({ params: Promise.resolve({ id: "notexist" }) });
    render(jsx);

    expect(screen.getByTestId("not-found-message")).toBeInTheDocument();
    expect(screen.getByText(/Report not found/)).toBeInTheDocument();
  });

  it("shows unable to load message when fetch throws", async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const jsx = await SharedReportPage({ params: Promise.resolve({ id: "someid" }) });
    render(jsx);

    expect(screen.getByTestId("error-message")).toBeInTheDocument();
    expect(screen.getByText(/Unable to load report/)).toBeInTheDocument();
  });

  it("does not render rescan or clear-cache buttons in read-only view", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockReport,
    });

    const jsx = await SharedReportPage({ params: Promise.resolve({ id: "abc123def456" }) });
    render(jsx);

    expect(screen.queryByTestId("rp-rescan")).not.toBeInTheDocument();
    expect(screen.queryByTestId("rp-clear-cache")).not.toBeInTheDocument();
  });
});
