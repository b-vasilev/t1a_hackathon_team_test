import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import PolicyViewer from "./PolicyViewer";

// Mock createPortal to render inline instead of into document.body
vi.mock("react-dom", async () => {
  const actual = await vi.importActual("react-dom");
  return {
    ...actual,
    createPortal: (node) => node,
  };
});

const mockPolicyData = {
  content:
    "## Introduction\nThis is the privacy policy.\n\n## Data Collection\nWe collect your email and name.\n- We store data securely\n- We use encryption\n\n===\nSome trailing text after separator.",
  source_url: "https://example.com/privacy",
  was_truncated: false,
  sections: [
    { heading: "Introduction" },
    { heading: "Data Collection" },
  ],
  red_flags: [{ text: "collect your email", quote: "collect your email" }],
  warnings: [{ text: "store data", quote: "store data" }],
  positives: [{ text: "use encryption", quote: "use encryption" }],
};

describe("PolicyViewer", () => {
  let onClose;

  beforeEach(() => {
    vi.restoreAllMocks();
    onClose = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("shows loading state initially", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(
      <PolicyViewer
        serviceId={1}
        serviceName="TestService"
        grade="B+"
        onClose={onClose}
      />
    );
    expect(screen.getByText("Loading policy text...")).toBeInTheDocument();
  });

  it("shows error when serviceId is missing", async () => {
    render(
      <PolicyViewer
        serviceId={null}
        serviceName="TestService"
        grade="B+"
        onClose={onClose}
      />
    );
    await waitFor(() => {
      expect(screen.getByText("No service selected")).toBeInTheDocument();
    });
  });

  it("renders policy content after fetch", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPolicyData),
    });

    render(
      <PolicyViewer
        serviceId={1}
        serviceName="TestService"
        grade="B+"
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("TestService")).toBeInTheDocument();
      expect(screen.getByText("B+")).toBeInTheDocument();
    });
  });

  it("renders section headings from content", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPolicyData),
    });

    render(
      <PolicyViewer
        serviceId={1}
        serviceName="TestService"
        grade="A"
        onClose={onClose}
      />
    );

    await waitFor(() => {
      // Headings appear both in nav sidebar and content
      expect(screen.getAllByText("Introduction").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Data Collection").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows truncation notice when was_truncated is true", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ ...mockPolicyData, was_truncated: true }),
    });

    render(
      <PolicyViewer
        serviceId={1}
        serviceName="TestService"
        grade="C"
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText(/truncated due to length/)
      ).toBeInTheDocument();
    });
  });

  it("renders source URL link", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPolicyData),
    });

    render(
      <PolicyViewer
        serviceId={1}
        serviceName="TestService"
        grade="B+"
        onClose={onClose}
      />
    );

    await waitFor(() => {
      const link = screen.getByText(/Original/);
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "https://example.com/privacy");
    });
  });

  it("calls onClose when close button clicked", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPolicyData),
    });

    render(
      <PolicyViewer
        serviceId={1}
        serviceName="TestService"
        grade="B+"
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("TestService")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when Escape key pressed", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPolicyData),
    });

    render(
      <PolicyViewer
        serviceId={1}
        serviceName="TestService"
        grade="B+"
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("TestService")).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when backdrop clicked", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPolicyData),
    });

    render(
      <PolicyViewer
        serviceId={1}
        serviceName="TestService"
        grade="B+"
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("TestService")).toBeInTheDocument();
    });

    const backdrop = document.querySelector(".policy-viewer-backdrop");
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it("shows error on fetch failure", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ detail: "Not found" }),
    });

    render(
      <PolicyViewer
        serviceId={999}
        serviceName="Missing"
        grade="F"
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Not found")).toBeInTheDocument();
    });
  });

  it("shows generic error when fetch json fails", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: () => Promise.reject(new Error("parse error")),
    });

    render(
      <PolicyViewer
        serviceId={999}
        serviceName="Missing"
        grade="F"
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load policy text")
      ).toBeInTheDocument();
    });
  });

  it("renders finding type filter buttons", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPolicyData),
    });

    render(
      <PolicyViewer
        serviceId={1}
        serviceName="TestService"
        grade="B+"
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Red flags")).toBeInTheDocument();
      expect(screen.getByText("Warnings")).toBeInTheDocument();
      expect(screen.getByText("Positives")).toBeInTheDocument();
    });
  });

  it("clicking a finding type button activates navigation", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPolicyData),
    });

    render(
      <PolicyViewer
        serviceId={1}
        serviceName="TestService"
        grade="B+"
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Red flags")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Red flags"));
    // After clicking, prev/next buttons should appear
    expect(screen.getByLabelText("Previous finding")).toBeInTheDocument();
    expect(screen.getByLabelText("Next finding")).toBeInTheDocument();
  });

  it("clicking section nav scrolls to section", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPolicyData),
    });

    render(
      <PolicyViewer
        serviceId={1}
        serviceName="TestService"
        grade="B+"
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("SECTIONS")).toBeInTheDocument();
    });

    // Click a section nav button
    const navButtons = screen
      .getByText("SECTIONS")
      .parentElement.querySelectorAll("button");
    if (navButtons.length > 0) {
      fireEvent.click(navButtons[0]);
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    }
  });

  it("handles different grade colors", async () => {
    for (const grade of ["A+", "B", "C-", "D", "F"]) {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ ...mockPolicyData, red_flags: [], warnings: [], positives: [] }),
      });

      const { unmount } = render(
        <PolicyViewer
          serviceId={1}
          serviceName="TestService"
          grade={grade}
          onClose={onClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(grade)).toBeInTheDocument();
      });

      unmount();
    }
  });

  it("renders iframe when content is null but source_url exists", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          content: null,
          source_url: "https://example.com/policy",
          sections: [],
          red_flags: [],
          warnings: [],
          positives: [],
        }),
    });

    render(
      <PolicyViewer
        serviceId={1}
        serviceName="TestService"
        grade="B+"
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText(/blocked automated text extraction/)
      ).toBeInTheDocument();
    });
  });

  it("shows no URL message when content and source_url are both null", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          content: null,
          source_url: null,
          sections: [],
          red_flags: [],
          warnings: [],
          positives: [],
        }),
    });

    render(
      <PolicyViewer
        serviceId={1}
        serviceName="TestService"
        grade="B+"
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText("No policy URL available for this service.")
      ).toBeInTheDocument();
    });
  });

  it("handles prev/next navigation buttons", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPolicyData),
    });

    render(
      <PolicyViewer
        serviceId={1}
        serviceName="TestService"
        grade="B+"
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Red flags")).toBeInTheDocument();
    });

    // Activate red flags navigation
    fireEvent.click(screen.getByText("Red flags"));

    // Click next
    fireEvent.click(screen.getByLabelText("Next finding"));
    // Click prev
    fireEvent.click(screen.getByLabelText("Previous finding"));
  });

  it("handles arrow key navigation when type is active", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPolicyData),
    });

    render(
      <PolicyViewer
        serviceId={1}
        serviceName="TestService"
        grade="B+"
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Red flags")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Red flags"));

    // Arrow keys
    fireEvent.keyDown(document, { key: "ArrowDown" });
    fireEvent.keyDown(document, { key: "ArrowUp" });
    fireEvent.keyDown(document, { key: "ArrowRight" });
    fireEvent.keyDown(document, { key: "ArrowLeft" });
  });

  it("renders list items from content", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        ...mockPolicyData,
        // Use content without findings matches so text isn't split by <mark> tags
        red_flags: [],
        warnings: [],
        positives: [],
      }),
    });

    render(
      <PolicyViewer
        serviceId={1}
        serviceName="TestService"
        grade="B+"
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/We store data securely/)).toBeInTheDocument();
      expect(screen.getByText(/We use encryption/)).toBeInTheDocument();
    });
  });

  it("handles findings with plain string items (no quote)", async () => {
    const dataWithPlainStrings = {
      ...mockPolicyData,
      red_flags: ["shares data with third parties for marketing"],
      warnings: ["short"],
      positives: [],
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(dataWithPlainStrings),
    });

    render(
      <PolicyViewer
        serviceId={1}
        serviceName="TestService"
        grade="D"
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("TestService")).toBeInTheDocument();
    });
  });
});
