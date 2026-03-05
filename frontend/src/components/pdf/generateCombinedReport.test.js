import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock @react-pdf/renderer
vi.mock('@react-pdf/renderer', () => ({
  pdf: vi.fn(() => ({
    toBlob: vi.fn(() => Promise.resolve(new Blob(['pdf-content'], { type: 'application/pdf' }))),
  })),
  Document: 'Document',
  Page: 'Page',
  View: 'View',
  Text: 'Text',
  Link: 'Link',
  StyleSheet: { create: (s) => s },
  Font: { register: vi.fn(), registerHyphenationCallback: vi.fn() },
}));

// Mock the CombinedReport component
vi.mock('./CombinedReport', () => ({
  default: vi.fn(() => null),
}));

// Mock fonts
vi.mock('./fonts', () => ({}));

import { generateCombinedReport } from './generateCombinedReport';
import { pdf } from '@react-pdf/renderer';

const mockResults = [
  {
    service_id: 1,
    service_name: 'TestService',
    overall_grade: 'B+',
    red_flags: ['Flag 1'],
    warnings: ['Warn 1'],
    positives: ['Good 1'],
    categories: {},
  },
  {
    service_id: 2,
    service_name: 'AnotherService',
    overall_grade: 'C',
    red_flags: [],
    warnings: [],
    positives: [],
    categories: {},
  },
];

describe('generateCombinedReport', () => {
  let mockCreateObjectURL;
  let mockRevokeObjectURL;
  let appendChildSpy;
  let removeChildSpy;

  beforeEach(() => {
    mockCreateObjectURL = vi.fn(() => 'blob:http://localhost/fake-url');
    mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});

    global.fetch = vi.fn((url) => {
      if (url.includes('/1/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve('Policy text for service 1'),
        });
      }
      if (url.includes('/2/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve('Policy text for service 2'),
        });
      }
      return Promise.resolve({ ok: false });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns early for null results', async () => {
    await generateCombinedReport(null);
    expect(pdf).not.toHaveBeenCalled();
  });

  it('returns early for empty results array', async () => {
    await generateCombinedReport([]);
    expect(pdf).not.toHaveBeenCalled();
  });

  it('fetches policy texts for all services', async () => {
    await generateCombinedReport(mockResults);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenCalledWith('/api/services/1/policy-text');
    expect(global.fetch).toHaveBeenCalledWith('/api/services/2/policy-text');
  });

  it('generates PDF and triggers download', async () => {
    await generateCombinedReport(mockResults);

    expect(pdf).toHaveBeenCalled();
    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalled();
  });

  it('creates download link with correct filename', async () => {
    let capturedElement;
    appendChildSpy.mockImplementation((el) => {
      capturedElement = el;
      // Simulate the click method
      el.click = vi.fn();
    });

    await generateCombinedReport(mockResults);

    expect(capturedElement).toBeDefined();
    expect(capturedElement.download).toBe('privacylens-combined-report.pdf');
    expect(capturedElement.href).toBe('blob:http://localhost/fake-url');
  });

  it('handles failed policy text fetches gracefully', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false }));

    await generateCombinedReport(mockResults);

    // Should still generate PDF even without policy texts
    expect(pdf).toHaveBeenCalled();
  });

  it('handles rejected promises from fetch', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

    await generateCombinedReport(mockResults);

    // Promise.allSettled handles rejections, so PDF should still be generated
    expect(pdf).toHaveBeenCalled();
  });
});
