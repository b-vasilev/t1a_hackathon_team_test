import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CompareResults from './CompareResults';

const resultA = {
  service_id: 1,
  name: 'ServiceAlpha',
  icon: null,
  grade: 'B+',
  summary: 'Decent policy',
  red_flags: ['Sells data to third parties'],
  warnings: ['Vague retention policy'],
  positives: ['Easy opt-out'],
  categories: {
    data_collection: { grade: 'B', finding: 'Moderate collection' },
    data_sharing: { grade: 'C', finding: 'Some sharing' },
    data_retention: { grade: 'B', finding: 'Reasonable retention' },
    tracking: { grade: 'C+', finding: 'Some tracking' },
    user_rights: { grade: 'A-', finding: 'Good user rights' },
  },
  actions: [],
};

const resultB = {
  service_id: 2,
  name: 'ServiceBeta',
  icon: null,
  grade: 'D',
  summary: 'Poor policy',
  red_flags: ['No user rights'],
  warnings: [],
  positives: [],
  categories: {
    data_collection: { grade: 'D', finding: 'Extensive collection' },
    data_sharing: { grade: 'D', finding: 'Broad sharing' },
    data_retention: { grade: 'C', finding: 'Long retention' },
    tracking: { grade: 'D+', finding: 'Heavy tracking' },
    user_rights: { grade: 'C-', finding: 'Limited rights' },
  },
  actions: [],
};

const tiedResultA = { ...resultA, grade: 'B' };
const tiedResultB = { ...resultB, grade: 'B' };

describe('CompareResults', () => {
  it('renders grade badges for both services', () => {
    render(<CompareResults resultA={resultA} resultB={resultB} onReset={() => {}} />);
    expect(screen.getAllByText('ServiceAlpha').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ServiceBeta').length).toBeGreaterThan(0);
    // Both grade large displays
    const badges = screen.getAllByTestId('grade-badge-lg');
    expect(badges).toHaveLength(2);
    expect(badges[0]).toHaveTextContent('B+');
    expect(badges[1]).toHaveTextContent('D');
  });

  it('shows winner badge on the service with higher GPA grade', () => {
    render(<CompareResults resultA={resultA} resultB={resultB} onReset={() => {}} />);
    const winnerBadge = screen.getByTestId('winner-badge');
    expect(winnerBadge).toBeInTheDocument();
    // ServiceAlpha (B+) beats ServiceBeta (D), winner badge should be near ServiceAlpha
    expect(screen.getByText(/ServiceAlpha has the better privacy policy/)).toBeInTheDocument();
  });

  it('shows tied message when both grades are equal', () => {
    render(<CompareResults resultA={tiedResultA} resultB={tiedResultB} onReset={() => {}} />);
    expect(screen.getByText(/Both services are tied/i)).toBeInTheDocument();
    expect(screen.queryByTestId('winner-badge')).not.toBeInTheDocument();
  });

  it('renders category rows for both services', () => {
    render(<CompareResults resultA={resultA} resultB={resultB} onReset={() => {}} />);
    expect(screen.getByText('Data Collection')).toBeInTheDocument();
    expect(screen.getByText('Data Sharing')).toBeInTheDocument();
    expect(screen.getByText('User Rights')).toBeInTheDocument();
  });

  it('applies winner styling to higher-grade category cell', () => {
    render(<CompareResults resultA={resultA} resultB={resultB} onReset={() => {}} />);
    // data_collection: A has B, B has D → A wins
    const catACell = screen.getByTestId('cat-a-data_collection');
    // Browser normalizes rgba() to include spaces; strip spaces for comparison
    expect(catACell.style.background.replace(/\s/g, '')).toContain('rgba(0,230,118');
  });

  it('renders red flags for both services', () => {
    render(<CompareResults resultA={resultA} resultB={resultB} onReset={() => {}} />);
    expect(screen.getByText('Sells data to third parties')).toBeInTheDocument();
    expect(screen.getByText('No user rights')).toBeInTheDocument();
  });

  it('renders positives for service A only', () => {
    render(<CompareResults resultA={resultA} resultB={resultB} onReset={() => {}} />);
    expect(screen.getByText('Easy opt-out')).toBeInTheDocument();
  });

  it('calls onReset when New Comparison button is clicked', () => {
    const onReset = vi.fn();
    render(<CompareResults resultA={resultA} resultB={resultB} onReset={onReset} />);
    fireEvent.click(screen.getByText('New Comparison'));
    expect(onReset).toHaveBeenCalledOnce();
  });
});
