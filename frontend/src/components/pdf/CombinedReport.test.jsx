import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock @react-pdf/renderer with simple HTML elements
vi.mock('@react-pdf/renderer', () => ({
  Document: ({ children }) => <div data-testid="document">{children}</div>,
  Page: ({ children }) => <div data-testid="page">{children}</div>,
  View: ({ children, id, ...props }) => <div data-testid={id || 'view'} {...props}>{children}</div>,
  Text: ({ children, render: renderFn }) => {
    if (renderFn) {
      return <span>{renderFn({ pageNumber: 1, totalPages: 3 })}</span>;
    }
    return <span>{children}</span>;
  },
  Link: ({ children, src }) => <a href={src}>{children}</a>,
  StyleSheet: { create: (s) => s },
  Font: { register: vi.fn(), registerHyphenationCallback: vi.fn() },
}));

// Mock fonts
vi.mock('./fonts', () => ({}));

import CombinedReport from './CombinedReport';

const mockResults = [
  {
    service_id: 1,
    service_name: 'Google',
    overall_grade: 'B+',
    summary: 'Decent policy overall',
    red_flags: [
      { text: 'Shares data with third parties', quote: 'We may share...' },
    ],
    warnings: [{ text: 'Uses tracking cookies' }],
    positives: [{ text: 'Allows data export' }],
    categories: {
      data_collection: { grade: 'C', finding: 'Extensive data collection' },
      data_sharing: { grade: 'B', finding: 'Limited sharing' },
    },
  },
  {
    service_id: 2,
    service_name: 'Facebook',
    overall_grade: 'D',
    summary: 'Poor privacy practices',
    red_flags: [
      'Sells user data',
      'No deletion option',
    ],
    warnings: [],
    positives: [],
    categories: {
      data_collection: { grade: 'F', finding: 'Collects everything' },
    },
  },
];

const mockPolicyTexts = {
  1: 'Google privacy policy text here.\nSecond paragraph.',
  2: null,
};

describe('CombinedReport', () => {
  it('renders without crashing with valid data', () => {
    const { container } = render(
      <CombinedReport results={mockResults} policyTexts={mockPolicyTexts} />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders the document wrapper', () => {
    render(<CombinedReport results={mockResults} policyTexts={mockPolicyTexts} />);
    expect(screen.getByTestId('document')).toBeInTheDocument();
  });

  it('displays combined report title', () => {
    render(<CombinedReport results={mockResults} policyTexts={mockPolicyTexts} />);
    expect(screen.getByText('Combined Privacy Report')).toBeInTheDocument();
  });

  it('displays service names', () => {
    render(<CombinedReport results={mockResults} policyTexts={mockPolicyTexts} />);
    const googleTexts = screen.getAllByText('Google');
    expect(googleTexts.length).toBeGreaterThanOrEqual(1);
    const facebookTexts = screen.getAllByText('Facebook');
    expect(facebookTexts.length).toBeGreaterThanOrEqual(1);
  });

  it('displays PRIVACYLENS brand header', () => {
    render(<CombinedReport results={mockResults} policyTexts={mockPolicyTexts} />);
    const brands = screen.getAllByText('PRIVACYLENS');
    expect(brands.length).toBeGreaterThanOrEqual(1);
  });

  it('displays table of contents heading', () => {
    render(<CombinedReport results={mockResults} policyTexts={mockPolicyTexts} />);
    expect(screen.getByText('TABLE OF CONTENTS')).toBeInTheDocument();
  });

  it('displays category comparison heading', () => {
    render(<CombinedReport results={mockResults} policyTexts={mockPolicyTexts} />);
    expect(screen.getByText('CATEGORY COMPARISON')).toBeInTheDocument();
  });

  it('renders with empty results', () => {
    const { container } = render(
      <CombinedReport results={[]} policyTexts={{}} />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders with null results and policyTexts', () => {
    const { container } = render(
      <CombinedReport results={null} policyTexts={null} />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('shows highest risk and lowest risk callouts for multiple services', () => {
    render(<CombinedReport results={mockResults} policyTexts={mockPolicyTexts} />);
    expect(screen.getByText('HIGHEST RISK')).toBeInTheDocument();
    expect(screen.getByText('LOWEST RISK')).toBeInTheDocument();
  });

  it('does not show callouts for single service', () => {
    render(
      <CombinedReport results={[mockResults[0]]} policyTexts={mockPolicyTexts} />,
    );
    expect(screen.queryByText('HIGHEST RISK')).not.toBeInTheDocument();
  });

  it('renders category grades in comparison table', () => {
    render(<CombinedReport results={mockResults} policyTexts={mockPolicyTexts} />);
    // Header row contains category names
    expect(screen.getByText('DATA COLLECTION')).toBeInTheDocument();
    expect(screen.getByText('DATA SHARING')).toBeInTheDocument();
  });

  it('renders appendix section with policy text', () => {
    render(<CombinedReport results={mockResults} policyTexts={mockPolicyTexts} />);
    const appendixHeadings = screen.getAllByText('APPENDIX');
    expect(appendixHeadings.length).toBeGreaterThanOrEqual(1);
  });

  it('shows policy not available message when text is null', () => {
    render(<CombinedReport results={mockResults} policyTexts={mockPolicyTexts} />);
    expect(
      screen.getByText('Policy text not available for this service.'),
    ).toBeInTheDocument();
  });

  it('renders policy text paragraphs from policyTexts', () => {
    render(<CombinedReport results={mockResults} policyTexts={mockPolicyTexts} />);
    expect(screen.getByText('Google privacy policy text here.')).toBeInTheDocument();
    expect(screen.getByText('Second paragraph.')).toBeInTheDocument();
  });

  it('renders findings sections', () => {
    render(<CombinedReport results={mockResults} policyTexts={mockPolicyTexts} />);
    const redFlagHeaders = screen.getAllByText('Red Flags');
    expect(redFlagHeaders.length).toBeGreaterThanOrEqual(1);
  });

  it('renders page numbers in footer', () => {
    render(<CombinedReport results={mockResults} policyTexts={mockPolicyTexts} />);
    // The render function produces "1 / 3"
    const pageNumbers = screen.getAllByText('1 / 3');
    expect(pageNumbers.length).toBeGreaterThanOrEqual(1);
  });

  it('renders service summaries', () => {
    render(<CombinedReport results={mockResults} policyTexts={mockPolicyTexts} />);
    expect(screen.getByText('Decent policy overall')).toBeInTheDocument();
    expect(screen.getByText('Poor privacy practices')).toBeInTheDocument();
  });
});
