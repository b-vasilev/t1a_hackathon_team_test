import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ServiceIcon from "./ServiceIcon";

describe("ServiceIcon", () => {
  it("renders img when icon is an HTTP URL", () => {
    render(<ServiceIcon icon="https://example.com/icon.png" name="Test" />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/icon.png");
    expect(img).toHaveAttribute("alt", "Test");
  });

  it("shows letter fallback when icon URL fails to load", () => {
    render(
      <ServiceIcon icon="https://example.com/icon.png" name="Test" />
    );
    const img = screen.getByRole("img");
    fireEvent.error(img);
    // After error state update, letter fallback should appear
    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("renders emoji when icon is not an HTTP URL", () => {
    render(<ServiceIcon icon="🔒" name="Secure" />);
    expect(screen.getByText("🔒")).toBeInTheDocument();
  });

  it("renders default globe emoji when no icon", () => {
    render(<ServiceIcon icon={null} name="NoIcon" />);
    expect(screen.getByText("🌐")).toBeInTheDocument();
  });

  it("applies sm size classes", () => {
    const { container } = render(
      <ServiceIcon icon="🔒" name="Small" size="sm" />
    );
    const wrapper = container.firstChild;
    expect(wrapper.className).toContain("w-9");
    expect(wrapper.className).toContain("h-9");
  });

  it("applies md size classes by default", () => {
    const { container } = render(<ServiceIcon icon="🔒" name="Medium" />);
    const wrapper = container.firstChild;
    expect(wrapper.className).toContain("w-12");
    expect(wrapper.className).toContain("h-12");
  });
});
