import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PolicyChat from "./PolicyChat";

describe("PolicyChat", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("renders suggested questions when no messages", () => {
    render(<PolicyChat serviceId={1} />);
    expect(screen.getByText("Can they sell my data?")).toBeInTheDocument();
    expect(
      screen.getByText("How do I delete my account?")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Do they track me across sites?")
    ).toBeInTheDocument();
  });

  it("renders input field and send button", () => {
    render(<PolicyChat serviceId={1} />);
    expect(
      screen.getByPlaceholderText("Ask about this policy...")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send message" })).toBeInTheDocument();
  });

  it("handles input typing", () => {
    render(<PolicyChat serviceId={1} />);
    const input = screen.getByPlaceholderText("Ask about this policy...");
    fireEvent.change(input, { target: { value: "What data do you collect?" } });
    expect(input.value).toBe("What data do you collect?");
  });

  it("clicking suggested question sends message", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ answer: "They cannot sell your data." }),
    });

    render(<PolicyChat serviceId={42} />);
    fireEvent.click(screen.getByText("Can they sell my data?"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: 42,
          messages: [{ role: "user", content: "Can they sell my data?" }],
        }),
      });
    });

    expect(screen.getByText("Can they sell my data?")).toBeInTheDocument();
  });

  it("submit via send button", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ answer: "Yes, they can." }),
    });

    render(<PolicyChat serviceId={1} />);
    const input = screen.getByPlaceholderText("Ask about this policy...");
    fireEvent.change(input, { target: { value: "Is my data shared?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: 1,
          messages: [{ role: "user", content: "Is my data shared?" }],
        }),
      });
    });
  });

  it("displays assistant response", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ answer: "Your data is encrypted at rest." }),
    });

    render(<PolicyChat serviceId={1} />);
    const input = screen.getByPlaceholderText("Ask about this policy...");
    fireEvent.change(input, { target: { value: "Is my data encrypted?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(
        screen.getByText("Your data is encrypted at rest.")
      ).toBeInTheDocument();
    });
  });

  it("shows loading state while waiting for response", async () => {
    let resolvePromise;
    global.fetch = vi.fn().mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );

    render(<PolicyChat serviceId={1} />);
    const input = screen.getByPlaceholderText("Ask about this policy...");
    fireEvent.change(input, { target: { value: "Tell me more" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(document.querySelector(".policy-chat-typing")).toBeInTheDocument();

    resolvePromise({
      ok: true,
      json: () => Promise.resolve({ answer: "Here is more info." }),
    });

    await waitFor(() => {
      expect(
        document.querySelector(".policy-chat-typing")
      ).not.toBeInTheDocument();
    });
  });

  it("shows error on fetch failure", async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error("Network error"));

    render(<PolicyChat serviceId={1} />);
    const input = screen.getByPlaceholderText("Ask about this policy...");
    fireEvent.change(input, { target: { value: "Test question" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });
});
