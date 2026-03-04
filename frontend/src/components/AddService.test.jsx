import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AddService from "./AddService";

describe("AddService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders input and Add button", () => {
    render(<AddService onAdd={() => {}} />);
    expect(
      screen.getByPlaceholderText("https://example.com")
    ).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("button is disabled when input is empty", () => {
    render(<AddService onAdd={() => {}} />);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  it("calls onAdd after successful submission", async () => {
    const onAdd = vi.fn();
    const mockService = {
      id: 1,
      name: "Example",
      website_url: "https://example.com",
    };
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockService),
    });

    render(<AddService onAdd={onAdd} />);
    fireEvent.change(screen.getByPlaceholderText("https://example.com"), {
      target: { value: "https://example.com" },
    });
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith(mockService);
    });
  });

  it("shows error on failure", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ detail: "Invalid URL" }),
    });

    render(<AddService onAdd={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText("https://example.com"), {
      target: { value: "bad-url" },
    });
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText("Invalid URL")).toBeInTheDocument();
    });
  });

  it("clears input after successful add", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 1, name: "Test" }),
    });

    render(<AddService onAdd={() => {}} />);
    const input = screen.getByPlaceholderText("https://example.com");
    fireEvent.change(input, { target: { value: "https://test.com" } });
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(input.value).toBe("");
    });
  });

  it("shows loading state during submission", async () => {
    let resolvePromise;
    global.fetch = vi.fn().mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );

    render(<AddService onAdd={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText("https://example.com"), {
      target: { value: "https://test.com" },
    });
    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText("Adding...")).toBeInTheDocument();

    resolvePromise({
      ok: true,
      json: () => Promise.resolve({ id: 1, name: "Test" }),
    });

    await waitFor(() => {
      expect(screen.getByText("Add")).toBeInTheDocument();
    });
  });
});
