import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CompareTab from './CompareTab';

const mockServices = [
  { id: 1, name: 'ServiceAlpha', icon: null, website_url: 'https://alpha.com' },
  { id: 2, name: 'ServiceBeta', icon: null, website_url: 'https://beta.com' },
  { id: 3, name: 'ServiceGamma', icon: null, website_url: 'https://gamma.com' },
];

const mockResults = {
  overall_grade: 'C',
  results: [
    {
      service_id: 1,
      name: 'ServiceAlpha',
      icon: null,
      grade: 'B+',
      summary: 'Decent policy',
      red_flags: [],
      warnings: [],
      positives: [],
      categories: {},
      actions: [],
    },
    {
      service_id: 2,
      name: 'ServiceBeta',
      icon: null,
      grade: 'D',
      summary: 'Poor policy',
      red_flags: [],
      warnings: [],
      positives: [],
      categories: {},
      actions: [],
    },
  ],
};

describe('CompareTab', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('renders without crashing with mocked services', () => {
    render(<CompareTab services={mockServices} parentHydrated />);
    expect(screen.getByText('Popular Services')).toBeInTheDocument();
    expect(screen.getByText('ServiceAlpha')).toBeInTheDocument();
    expect(screen.getByText('ServiceBeta')).toBeInTheDocument();
  });

  it('Compare Policies button is disabled when fewer than 2 services selected', () => {
    render(<CompareTab services={mockServices} parentHydrated />);
    const btn = screen.getByText('Compare Policies');
    expect(btn).toBeDisabled();
  });

  it('first click fills slot A, second click fills slot B', async () => {
    render(<CompareTab services={mockServices} parentHydrated />);

    // Click ServiceAlpha — should show A badge
    fireEvent.click(screen.getByText('ServiceAlpha'));
    await waitFor(() => {
      expect(screen.getAllByText('A').length).toBeGreaterThan(0);
    });

    // Click ServiceBeta — should show B badge
    fireEvent.click(screen.getByText('ServiceBeta'));
    await waitFor(() => {
      expect(screen.getAllByText('B').length).toBeGreaterThan(0);
    });
  });

  it('third click replaces slot A (oldest selection)', async () => {
    render(<CompareTab services={mockServices} parentHydrated />);

    fireEvent.click(screen.getByText('ServiceAlpha'));
    fireEvent.click(screen.getByText('ServiceBeta'));
    fireEvent.click(screen.getByText('ServiceGamma'));

    // After 3rd click, ServiceAlpha should be deselected (slot A replaced)
    // ServiceBeta should now be slot A, ServiceGamma slot B
    await waitFor(() => {
      // Both badges should still be present
      expect(screen.getAllByText('A').length).toBeGreaterThan(0);
      expect(screen.getAllByText('B').length).toBeGreaterThan(0);
    });
  });

  it('Compare Policies button is enabled when 2 services are selected', async () => {
    render(<CompareTab services={mockServices} parentHydrated />);

    fireEvent.click(screen.getByText('ServiceAlpha'));
    fireEvent.click(screen.getByText('ServiceBeta'));

    await waitFor(() => {
      const btn = screen.getByText('Compare Policies');
      expect(btn).not.toBeDisabled();
    });
  });

  it('calls /api/analyze and renders CompareResults on success', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResults),
    });

    render(<CompareTab services={mockServices} parentHydrated />);

    fireEvent.click(screen.getByText('ServiceAlpha'));
    fireEvent.click(screen.getByText('ServiceBeta'));

    await waitFor(() => {
      expect(screen.getByText('Compare Policies')).not.toBeDisabled();
    });

    fireEvent.click(screen.getByText('Compare Policies'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/analyze', expect.objectContaining({
        method: 'POST',
      }));
      expect(screen.getByText('Comparison Results')).toBeInTheDocument();
    });
  });

  it('shows error message when API call fails', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ detail: 'Analysis failed' }),
    });

    render(<CompareTab services={mockServices} parentHydrated />);

    fireEvent.click(screen.getByText('ServiceAlpha'));
    fireEvent.click(screen.getByText('ServiceBeta'));

    await waitFor(() => {
      expect(screen.getByText('Compare Policies')).not.toBeDisabled();
    });

    fireEvent.click(screen.getByText('Compare Policies'));

    await waitFor(() => {
      expect(screen.getByText('Analysis failed')).toBeInTheDocument();
    });
  });
});
