import { describe, it, expect, vi } from 'vitest';

// Mock @react-pdf/renderer before importing sharedStyles
vi.mock('@react-pdf/renderer', () => ({
  StyleSheet: {
    create: (styles) => styles,
  },
  View: 'View',
  Text: 'Text',
}));

import {
  DARK_BG,
  SURFACE,
  BORDER,
  ACCENT,
  TEXT_WHITE,
  TEXT_MUTED,
  RED,
  YELLOW,
  GREEN,
  getGradeColor,
  truncateText,
  formatDate,
  gradeToPercent,
  sharedStyles,
} from './sharedStyles';

describe('sharedStyles color constants', () => {
  it('exports all color constants', () => {
    expect(DARK_BG).toBe('#1c1c1c');
    expect(SURFACE).toBe('#262626');
    expect(BORDER).toBe('rgba(102, 102, 128, 0.2)');
    expect(ACCENT).toBe('#22d3ee');
    expect(TEXT_WHITE).toBe('#e4e4e7');
    expect(TEXT_MUTED).toBe('#71717a');
    expect(RED).toBe('#ef4444');
    expect(YELLOW).toBe('#eab308');
    expect(GREEN).toBe('#22c55e');
  });
});

describe('getGradeColor', () => {
  it('returns muted color for null/undefined', () => {
    expect(getGradeColor(null)).toBe(TEXT_MUTED);
    expect(getGradeColor(undefined)).toBe(TEXT_MUTED);
  });

  it('returns muted color for N/A', () => {
    expect(getGradeColor('N/A')).toBe(TEXT_MUTED);
  });

  it('returns green for A grades', () => {
    expect(getGradeColor('A+')).toBe('#22c55e');
    expect(getGradeColor('A')).toBe('#22c55e');
    expect(getGradeColor('A-')).toBe('#22c55e');
  });

  it('returns light green for B grades', () => {
    expect(getGradeColor('B+')).toBe('#86efac');
    expect(getGradeColor('B')).toBe('#86efac');
  });

  it('returns yellow for C grades', () => {
    expect(getGradeColor('C')).toBe('#eab308');
    expect(getGradeColor('C-')).toBe('#eab308');
  });

  it('returns orange for D grades', () => {
    expect(getGradeColor('D')).toBe('#f97316');
    expect(getGradeColor('D-')).toBe('#f97316');
  });

  it('returns red for F grade', () => {
    expect(getGradeColor('F')).toBe('#ef4444');
  });
});

describe('truncateText', () => {
  it('returns null/undefined as-is', () => {
    expect(truncateText(null)).toBeNull();
    expect(truncateText(undefined)).toBeUndefined();
  });

  it('returns short text unchanged', () => {
    expect(truncateText('short text')).toBe('short text');
  });

  it('returns text at exactly maxLen unchanged', () => {
    const text = 'a'.repeat(120);
    expect(truncateText(text)).toBe(text);
  });

  it('truncates text longer than maxLen with ellipsis', () => {
    const text = 'a'.repeat(150);
    expect(truncateText(text)).toBe(`${'a'.repeat(120)}...`);
  });

  it('respects custom maxLen', () => {
    expect(truncateText('hello world', 5)).toBe('hello...');
  });
});

describe('formatDate', () => {
  it('returns formatted current date when no argument', () => {
    const result = formatDate();
    // Should be a string like "March 4, 2026"
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('formats a valid date string', () => {
    const result = formatDate('2026-01-15');
    expect(result).toContain('January');
    expect(result).toContain('15');
    expect(result).toContain('2026');
  });

  it('returns null date string for falsy input formatted as today', () => {
    const result = formatDate('');
    // Empty string is falsy, so falls through to the !dateStr branch
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('gradeToPercent', () => {
  it('returns 0 for null/undefined/N/A', () => {
    expect(gradeToPercent(null)).toBe(0);
    expect(gradeToPercent(undefined)).toBe(0);
    expect(gradeToPercent('N/A')).toBe(0);
  });

  it('returns 92 for A grades', () => {
    expect(gradeToPercent('A+')).toBe(92);
    expect(gradeToPercent('A')).toBe(92);
  });

  it('returns 78 for B grades', () => {
    expect(gradeToPercent('B')).toBe(78);
  });

  it('returns 62 for C grades', () => {
    expect(gradeToPercent('C')).toBe(62);
  });

  it('returns 45 for D grades', () => {
    expect(gradeToPercent('D')).toBe(45);
  });

  it('returns 25 for F grade', () => {
    expect(gradeToPercent('F')).toBe(25);
  });
});

describe('sharedStyles', () => {
  it('exports a styles object with expected keys', () => {
    expect(sharedStyles).toBeDefined();
    expect(sharedStyles.page).toBeDefined();
    expect(sharedStyles.header).toBeDefined();
    expect(sharedStyles.footer).toBeDefined();
    expect(sharedStyles.gradeSection).toBeDefined();
    expect(sharedStyles.findingSection).toBeDefined();
  });
});
