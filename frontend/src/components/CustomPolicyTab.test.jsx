import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CustomPolicyTab from './CustomPolicyTab';

const LONG_TEXT = 'This is a privacy policy text. '.repeat(10); // well over 50 chars

const mockResult = {
  overall_grade: 'B',
  results: [
    {
      service_id: null,
      name: 'Custom Policy',
      icon: null,
      grade: 'B',
      summary: 'Decent policy',
      red_flags: [],
      warnings: [],
      positives: [],
      categories: {},
      highlights: [],
      actions: [],
      cached: false,
      mock: false,
    },
  ],
};

describe('CustomPolicyTab', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('renders textarea and name input', () => {
    render(<CustomPolicyTab />);
    expect(screen.getByLabelText(/Policy Text/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Policy \/ Service Name/i)).toBeInTheDocument();
  });

  it('Analyze button is disabled when textarea is empty', () => {
    render(<CustomPolicyTab />);
    expect(screen.getByRole('button', { name: /Analyze Policy/i })).toBeDisabled();
  });

  it('Analyze button is disabled when text is too short', () => {
    render(<CustomPolicyTab />);
    const textarea = screen.getByLabelText(/Policy Text/i);
    fireEvent.change(textarea, { target: { value: 'short' } });
    expect(screen.getByRole('button', { name: /Analyze Policy/i })).toBeDisabled();
  });

  it('Analyze button is enabled when text is long enough', async () => {
    render(<CustomPolicyTab />);
    const textarea = screen.getByLabelText(/Policy Text/i);
    fireEvent.change(textarea, { target: { value: LONG_TEXT } });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Analyze Policy/i })).not.toBeDisabled();
    });
  });

  it('calls /api/analyze-text and shows results on success', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResult),
    });

    render(<CustomPolicyTab />);
    const textarea = screen.getByLabelText(/Policy Text/i);
    fireEvent.change(textarea, { target: { value: LONG_TEXT } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Analyze Policy/i })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /Analyze Policy/i }));

    await waitFor(() => {
      expect(screen.getByText('Analysis Results')).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/analyze-text',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('shows error message on API failure', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ detail: 'Analysis failed.' }),
    });

    render(<CustomPolicyTab />);
    const textarea = screen.getByLabelText(/Policy Text/i);
    fireEvent.change(textarea, { target: { value: LONG_TEXT } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Analyze Policy/i })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /Analyze Policy/i }));

    await waitFor(() => {
      expect(screen.getByText('Analysis failed.')).toBeInTheDocument();
    });
  });

  it('Clear & Start Over button resets state', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResult),
    });

    render(<CustomPolicyTab />);
    const textarea = screen.getByLabelText(/Policy Text/i);
    fireEvent.change(textarea, { target: { value: LONG_TEXT } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Analyze Policy/i })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /Analyze Policy/i }));

    await waitFor(() => {
      expect(screen.getByText('Analysis Results')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Clear & Start Over/i }));

    await waitFor(() => {
      expect(screen.queryByText('Analysis Results')).not.toBeInTheDocument();
    });
    expect(textarea.value).toBe('');
  });
});
