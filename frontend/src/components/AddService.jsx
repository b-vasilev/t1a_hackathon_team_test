'use client';

import { useState } from 'react';

export default function AddService({ onAdd }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleAdd() {
    const trimmed = url.trim();
    if (!trimmed) {return;}
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/services/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to add service');
      }
      const svc = await res.json();
      onAdd(svc);
      setUrl('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="https://example.com/privacy"
          className="flex-1 rounded-lg px-4 py-2.5 text-sm transition-colors"
          style={{
            background: 'var(--pl-surface)',
            border: '1px solid var(--pl-border)',
            color: 'var(--pl-text)',
            fontFamily: 'var(--font-mono)',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--pl-accent)';
            e.currentTarget.style.boxShadow = '0 0 0 1px var(--pl-accent)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--pl-border)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        <button
          onClick={handleAdd}
          disabled={loading || !url.trim()}
          className="px-5 py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
          style={(() => {
            const isDisabled = loading || !url.trim();
            return {
              background: isDisabled ? 'var(--pl-surface-2)' : 'var(--pl-accent)',
              color: isDisabled ? 'var(--pl-text-dim)' : 'var(--pl-bg)',
              opacity: isDisabled ? 0.5 : 1,
              cursor: isDisabled ? 'not-allowed' : 'pointer',
            };
          })()}
        >
          {loading ? (
            <>
              <span
                className="inline-block w-4 h-4 rounded-full"
                style={{
                  border: '2px solid var(--pl-bg)',
                  borderTopColor: 'transparent',
                  animation: 'xraySpin 0.8s linear infinite',
                }}
              />
              Adding...
            </>
          ) : 'Add'}
        </button>
      </div>
      {error && <p className="text-xs" style={{ color: 'var(--pl-grade-f)' }}>{error}</p>}
    </div>
  );
}
