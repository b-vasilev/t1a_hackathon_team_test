import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock @react-pdf/renderer with simple HTML elements
vi.mock('@react-pdf/renderer', () => ({
  Document: ({ children }) => <div data-testid="document">{children}</div>,
  Page: ({ children }) => <div data-testid="page">{children}</div>,
  View: ({ children, id, ...props }) => <div data-testid={id || 'view'} {...props}>{children}</div>,
  Text: ({ children, render: renderFn }) => {
    if (renderFn) {
      return <span>{renderFn({ pageNumber: 1, totalPages: 2 })}</span>;
    }
    return <span>{children}</span>;
  },
  Link: ({ children, src }) => <a href={src}>{children}</a>,
  StyleSheet: { create: (s) => s },
  Font: { register: vi.fn(), registerHyphenationCallback: vi.fn() },
}));

vi.mock('./fonts', () => ({}));

import PolicyReport, { highlightFindings, highlightBgColor, parsePolicyText } from './PolicyReport';

// ── highlightFindings ──

describe('highlightFindings', () => {
  it('returns unchanged text when no findings', () => {
    const result = highlightFindings('Hello world', []);
    expect(result).toEqual([{ text: 'Hello world', type: null }]);
  });

  it('returns unchanged text when findings is null', () => {
    const result = highlightFindings('Hello world', null);
    expect(result).toEqual([{ text: 'Hello world', type: null }]);
  });

  it('highlights a matching quote', () => {
    const findings = [
      { items: [{ quote: 'world' }], type: 'red_flag' },
    ];
    const result = highlightFindings('Hello world today', findings);
    expect(result).toEqual([
      { text: 'Hello ', type: null },
      { text: 'world', type: 'red_flag' },
      { text: ' today', type: null },
    ]);
  });

  it('is case-insensitive', () => {
    const findings = [
      { items: [{ quote: 'HELLO' }], type: 'warning' },
    ];
    const result = highlightFindings('hello world', findings);
    expect(result[0].type).toBe('warning');
  });

  it('merges overlapping matches with red_flag priority', () => {
    const findings = [
      { items: [{ quote: 'hello world' }], type: 'warning' },
      { items: [{ quote: 'world today' }], type: 'red_flag' },
    ];
    const result = highlightFindings('hello world today', findings);
    // Should merge into one segment covering "hello world today" with red_flag priority
    expect(result.length).toBe(1);
    expect(result[0].type).toBe('red_flag');
  });

  it('returns unchanged text when quotes do not match', () => {
    const findings = [
      { items: [{ quote: 'nonexistent' }], type: 'red_flag' },
    ];
    const result = highlightFindings('Hello world', findings);
    expect(result).toEqual([{ text: 'Hello world', type: null }]);
  });

  it('handles items without quote property', () => {
    const findings = [
      { items: [{ text: 'no quote field' }], type: 'red_flag' },
    ];
    const result = highlightFindings('Hello world', findings);
    expect(result).toEqual([{ text: 'Hello world', type: null }]);
  });
});

// ── highlightBgColor ──

describe('highlightBgColor', () => {
  it('returns red for red_flag', () => {
    expect(highlightBgColor('red_flag')).toContain('239, 68, 68');
  });

  it('returns yellow for warning', () => {
    expect(highlightBgColor('warning')).toContain('234, 179, 8');
  });

  it('returns green for positive', () => {
    expect(highlightBgColor('positive')).toContain('34, 197, 94');
  });

  it('returns transparent for unknown type', () => {
    expect(highlightBgColor('other')).toBe('transparent');
  });

  it('returns transparent for null', () => {
    expect(highlightBgColor(null)).toBe('transparent');
  });
});

// ── parsePolicyText ──

describe('parsePolicyText', () => {
  it('returns empty array for null text', () => {
    expect(parsePolicyText(null, [])).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parsePolicyText('', [])).toEqual([]);
  });

  it('parses headings', () => {
    const result = parsePolicyText('## Data Collection', []);
    expect(result).toEqual([{ type: 'heading', text: 'Data Collection' }]);
  });

  it('parses list items', () => {
    const result = parsePolicyText('- First item', []);
    expect(result.length).toBe(1);
    expect(result[0].type).toBe('list');
  });

  it('parses paragraphs', () => {
    const result = parsePolicyText('This is a paragraph.', []);
    expect(result.length).toBe(1);
    expect(result[0].type).toBe('paragraph');
  });

  it('skips separator lines', () => {
    const result = parsePolicyText('===\n---\nActual content', []);
    expect(result.length).toBe(1);
    expect(result[0].type).toBe('paragraph');
  });

  it('handles mixed content', () => {
    const text = '## Title\n\nSome text\n\n- A bullet\n\nMore text';
    const result = parsePolicyText(text, []);
    expect(result.map(e => e.type)).toEqual(['heading', 'paragraph', 'list', 'paragraph']);
  });
});

// ── PolicyReport component ──

describe('PolicyReport', () => {
  const mockResult = {
    name: 'TestService',
    grade: 'B+',
    summary: 'Decent privacy policy',
    red_flags: [{ text: 'Shares data', quote: 'we share' }],
    warnings: [{ text: 'Uses cookies' }],
    positives: [{ text: 'Allows deletion' }],
    categories: {
      data_collection: { grade: 'C', finding: 'Extensive collection' },
    },
  };

  it('renders service name and grade', () => {
    render(<PolicyReport result={mockResult} policyText={null} />);
    expect(screen.getByText('TestService')).toBeTruthy();
    expect(screen.getByText('Overall Grade: B+')).toBeTruthy();
  });

  it('renders findings sections', () => {
    render(<PolicyReport result={mockResult} policyText={null} />);
    expect(screen.getByText('Red Flags')).toBeTruthy();
    expect(screen.getByText('Warnings')).toBeTruthy();
    expect(screen.getByText('Positives')).toBeTruthy();
  });

  it('renders policy text page when provided', () => {
    const policyText = {
      content: '## Introduction\n\nWe care about privacy.',
      source_url: 'https://example.com/privacy',
      red_flags: [],
      warnings: [],
      positives: [],
      was_truncated: false,
    };
    render(<PolicyReport result={mockResult} policyText={policyText} />);
    expect(screen.getByText('Introduction')).toBeTruthy();
  });

  it('renders truncation notice when policy was truncated', () => {
    const policyText = {
      content: 'Some content here.',
      source_url: 'https://example.com/privacy',
      red_flags: [],
      warnings: [],
      positives: [],
      was_truncated: true,
    };
    render(<PolicyReport result={mockResult} policyText={policyText} />);
    expect(screen.getByText(/truncated due to length/)).toBeTruthy();
  });

  it('renders without crashing when result is minimal', () => {
    render(<PolicyReport result={{}} policyText={null} />);
    expect(screen.getByText('Unknown Service')).toBeTruthy();
  });

  it('renders categories when present', () => {
    render(<PolicyReport result={mockResult} policyText={null} />);
    expect(screen.getByText('CATEGORIES')).toBeTruthy();
    expect(screen.getByText('Data Collection')).toBeTruthy();
  });
});
