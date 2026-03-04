import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ServiceGrid from "./ServiceGrid";

const mockServices = [
  {
    id: 1,
    name: "ServiceAlpha",
    icon: "https://example.com/alpha.png",
    website_url: "https://alpha.com",
  },
  {
    id: 2,
    name: "ServiceBeta",
    icon: "https://example.com/beta.png",
    website_url: "https://beta.com",
  },
];

describe("ServiceGrid", () => {
  it("renders service names", () => {
    render(
      <ServiceGrid
        services={mockServices}
        selectedIds={new Set()}
        onToggle={() => {}}
        customServices={[]}
        onRemoveCustom={() => {}}
      />
    );
    expect(screen.getByText("ServiceAlpha")).toBeInTheDocument();
    expect(screen.getByText("ServiceBeta")).toBeInTheDocument();
  });

  it("calls onToggle when service is clicked", () => {
    const onToggle = vi.fn();
    render(
      <ServiceGrid
        services={mockServices}
        selectedIds={new Set()}
        onToggle={onToggle}
        customServices={[]}
        onRemoveCustom={() => {}}
      />
    );
    fireEvent.click(screen.getByText("ServiceAlpha"));
    expect(onToggle).toHaveBeenCalledWith(1);
  });

  it("shows checkmark for selected services", () => {
    render(
      <ServiceGrid
        services={mockServices}
        selectedIds={new Set([1])}
        onToggle={() => {}}
        customServices={[]}
        onRemoveCustom={() => {}}
      />
    );
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("shows remove button for custom services", () => {
    const customServices = [
      {
        id: 99,
        name: "Custom",
        icon: null,
        website_url: "https://custom.com",
      },
    ];
    const onRemove = vi.fn();
    render(
      <ServiceGrid
        services={[]}
        selectedIds={new Set()}
        onToggle={() => {}}
        customServices={customServices}
        onRemoveCustom={onRemove}
      />
    );
    const removeBtn = screen.getByTitle("Remove");
    fireEvent.click(removeBtn);
    expect(onRemove).toHaveBeenCalledWith(99);
  });

  it("shows empty state when no services", () => {
    render(
      <ServiceGrid
        services={[]}
        selectedIds={new Set()}
        onToggle={() => {}}
        customServices={[]}
        onRemoveCustom={() => {}}
      />
    );
    expect(screen.getByText(/no services available/i)).toBeInTheDocument();
  });

  it("handles keyboard Enter to toggle", () => {
    const onToggle = vi.fn();
    render(
      <ServiceGrid
        services={mockServices}
        selectedIds={new Set()}
        onToggle={onToggle}
        customServices={[]}
        onRemoveCustom={() => {}}
      />
    );
    fireEvent.keyDown(screen.getByText("ServiceAlpha"), { key: "Enter" });
    expect(onToggle).toHaveBeenCalledWith(1);
  });
});
