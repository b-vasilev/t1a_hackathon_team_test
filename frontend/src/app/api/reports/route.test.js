import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route.js';

describe('POST /api/reports proxy', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('proxies 201 success from backend', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      status: 201,
      text: async () => JSON.stringify({ id: 'abc123def456' }),
    });

    const req = new Request('http://localhost/api/reports', {
      method: 'POST',
      body: JSON.stringify({ overall_grade: 'B', results: [] }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBe('abc123def456');
  });

  it('returns 502 when backend is unreachable', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const req = new Request('http://localhost/api/reports', {
      method: 'POST',
      body: JSON.stringify({ overall_grade: 'A', results: [] }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.detail).toMatch(/Backend unreachable/);
  });
});
