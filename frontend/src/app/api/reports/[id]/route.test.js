import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route.js';

describe('GET /api/reports/[id] proxy', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('proxies 200 success from backend', async () => {
    const mockData = { id: 'abc123def456', overall_grade: 'B', results: [], created_at: '2026-03-04T00:00:00' };
    global.fetch = vi.fn().mockResolvedValueOnce({
      status: 200,
      text: async () => JSON.stringify(mockData),
    });

    const req = new Request('http://localhost/api/reports/abc123def456');
    const res = await GET(req, { params: { id: 'abc123def456' } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe('abc123def456');
    expect(data.overall_grade).toBe('B');
  });

  it('proxies 404 from backend', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      status: 404,
      text: async () => JSON.stringify({ detail: 'Report not found' }),
    });

    const req = new Request('http://localhost/api/reports/notexist');
    const res = await GET(req, { params: { id: 'notexist' } });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.detail).toBe('Report not found');
  });

  it('returns 502 when backend is unreachable', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const req = new Request('http://localhost/api/reports/someid');
    const res = await GET(req, { params: { id: 'someid' } });
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.detail).toMatch(/Backend unreachable/);
  });
});
