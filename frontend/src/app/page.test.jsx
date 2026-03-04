import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Home from "./page";

const mockServices = [
  {
    id: 1,
    name: "ServiceAlpha",
    website_url: "https://alpha.com",
    privacy_policy_url: "https://alpha.com/privacy",
    icon: "https://example.com/alpha.png",
    has_analysis: false,
  },
  {
    id: 2,
    name: "ServiceBeta",
    website_url: "https://beta.com",
    privacy_policy_url: "https://beta.com/privacy",
    icon: "https://example.com/beta.png",
    has_analysis: false,
  },
];

const mockAnalysis = {
  overall_grade: "B+",
  results: [
    {
      service_id: 1,
      name: "ServiceAlpha",
      icon: "https://example.com/alpha.png",
      grade: "B+",
      summary: "Decent policy",
      red_flags: [],
      warnings: [],
      positives: [],
      categories: {},
      highlights: [],
      actions: [],
      cached: false,
    },
  ],
};

describe("Home page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("fetches and displays services on mount", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockServices),
    });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("ServiceAlpha")).toBeInTheDocument();
      expect(screen.getByText("ServiceBeta")).toBeInTheDocument();
    });
  });

  it("shows error when services fetch fails", async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error("Network error"));

    render(<Home />);

    await waitFor(() => {
      expect(
        screen.getByText(/failed to load services/i)
      ).toBeInTheDocument();
    });
  });

  it("enables analyze button when service selected", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockServices),
    });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("ServiceAlpha")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("ServiceAlpha"));

    const analyzeBtn = screen.getByText(/Analyze My Digital Risk Profile/);
    expect(analyzeBtn).not.toBeDisabled();
  });

  it("shows prompt to select when no service selected", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockServices),
    });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("ServiceAlpha")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/select at least one service/i)
    ).toBeInTheDocument();
  });

  it("triggers analysis and shows results", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockServices),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAnalysis),
      });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("ServiceAlpha")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("ServiceAlpha"));
    fireEvent.click(screen.getByText(/Analyze My Digital Risk Profile/));

    await waitFor(() => {
      expect(screen.getByText("Your Results")).toBeInTheDocument();
      expect(screen.getByText("Decent policy")).toBeInTheDocument();
    });
  });

  it("renders header with PolicyLens title", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<Home />);
    expect(screen.getByText("PolicyLens")).toBeInTheDocument();
  });

  it("renders the three steps", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<Home />);
    expect(screen.getByText("Select services")).toBeInTheDocument();
    expect(screen.getByText("Scan policies")).toBeInTheDocument();
    expect(screen.getByText("Understand risk")).toBeInTheDocument();
  });

  it("shows error when analysis fails", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockServices),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ detail: "Analysis failed" }),
      });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("ServiceAlpha")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("ServiceAlpha"));
    fireEvent.click(screen.getByText(/Analyze My Digital Risk Profile/));

    await waitFor(() => {
      expect(screen.getByText("Analysis failed")).toBeInTheDocument();
    });
  });

  it("shows scan complete toast after analysis", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockServices),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAnalysis),
      });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("ServiceAlpha")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("ServiceAlpha"));
    fireEvent.click(screen.getByText(/Analyze My Digital Risk Profile/));

    await waitFor(() => {
      expect(
        screen.getByText(/Scan complete/)
      ).toBeInTheDocument();
    });
  });

  it("dismisses scan complete toast", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockServices),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAnalysis),
      });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("ServiceAlpha")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("ServiceAlpha"));
    fireEvent.click(screen.getByText(/Analyze My Digital Risk Profile/));

    await waitFor(() => {
      expect(screen.getByText(/Scan complete/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Dismiss"));

    await waitFor(() => {
      expect(screen.queryByText(/Scan complete/)).not.toBeInTheDocument();
    });
  });

  it("restores state from sessionStorage", async () => {
    sessionStorage.setItem("pl_results", JSON.stringify(mockAnalysis.results));
    sessionStorage.setItem("pl_overallGrade", JSON.stringify("B+"));
    sessionStorage.setItem("pl_selectedIds", JSON.stringify([1]));

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockServices),
    });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Your Results")).toBeInTheDocument();
    });
  });

  it("handles add custom service", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockServices),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 99,
            name: "CustomService",
            website_url: "https://custom.com",
            privacy_policy_url: "https://custom.com/privacy",
            icon: "https://custom.com/icon.png",
          }),
      });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("ServiceAlpha")).toBeInTheDocument();
    });

    const urlInput = screen.getByPlaceholderText("https://example.com");
    fireEvent.change(urlInput, { target: { value: "https://custom.com" } });
    fireEvent.click(screen.getByText("Add"));

    await waitFor(() => {
      expect(screen.getByText("CustomService")).toBeInTheDocument();
    });
  });
});
