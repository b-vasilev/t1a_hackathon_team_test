'use client';

import { useState } from 'react';

const GRADE_COLOR = {
  'A+': '#00e5ff', 'A': '#00e5ff', 'A-': '#00e5ff',
  'B+': '#4caf50', 'B': '#4caf50', 'B-': '#4caf50',
  'C+': '#ff9800', 'C': '#ff9800', 'C-': '#ff9800',
  'D+': '#f44336', 'D': '#f44336', 'D-': '#f44336',
  'F': '#ff1744',
  'N/A': '#555',
};

const CATEGORY_LABELS = {
  data_collection: 'Data Collection',
  data_sharing: 'Data Sharing',
  data_retention: 'Data Retention',
  tracking: 'Tracking',
  user_rights: 'User Rights',
};

function FindingRow({ icon, color, items, label }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--pl-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {icon} {label}
      </span>
      {items.map((item, i) => (
        <p key={i} style={{ fontSize: '0.82rem', color: 'var(--pl-text)', margin: 0, paddingLeft: '12px', borderLeft: `2px solid ${color}` }}>
          {typeof item === 'object' ? item.text : item}
        </p>
      ))}
    </div>
  );
}

export default function ImportTab({ onSaveService }) {
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [savedToCompare, setSavedToCompare] = useState(false);

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setIsLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/analyze-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || 'Custom Policy', text: text.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Analysis failed');
      }
      setResult(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const gradeColor = result ? (GRADE_COLOR[result.grade] || '#555') : '#555';

  return (
    <div className="flex flex-col gap-6">
      {/* Intro */}
      <div>
        <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--pl-text)' }}>
          Import Policy Text
        </h2>
        <p style={{ color: 'var(--pl-text-dim)', fontSize: '0.875rem', marginTop: '4px' }}>
          Paste any privacy policy text to get an instant AI-powered grade — no URL needed.
        </p>
      </div>

      {/* Form */}
      <div className="flex flex-col gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Service name (e.g. MyApp)"
          style={{
            background: 'var(--pl-surface)',
            border: '1px solid var(--pl-border)',
            borderRadius: '10px',
            padding: '10px 14px',
            color: 'var(--pl-text)',
            fontSize: '0.875rem',
            outline: 'none',
            width: '100%',
            maxWidth: '340px',
          }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--pl-accent)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--pl-border)'; }}
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste the full privacy policy text here..."
          rows={12}
          style={{
            background: 'var(--pl-surface)',
            border: '1px solid var(--pl-border)',
            borderRadius: '10px',
            padding: '12px 14px',
            color: 'var(--pl-text)',
            fontSize: '0.8rem',
            fontFamily: 'var(--font-mono)',
            lineHeight: 1.6,
            outline: 'none',
            resize: 'vertical',
            width: '100%',
          }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--pl-accent)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--pl-border)'; }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={handleAnalyze}
            disabled={!text.trim() || isLoading}
            style={text.trim() && !isLoading
              ? { background: 'var(--pl-accent)', color: 'var(--pl-bg)', fontWeight: 600, padding: '10px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }
              : { background: 'var(--pl-surface-2)', color: 'var(--pl-text-dim)', padding: '10px 24px', borderRadius: '10px', border: 'none', fontSize: '0.875rem', opacity: 0.6, cursor: 'not-allowed' }
            }
          >
            {isLoading ? 'Analyzing...' : 'Analyze Policy'}
          </button>
          {text.trim() && (
            <span style={{ fontSize: '0.72rem', color: 'var(--pl-text-dim)', fontFamily: 'var(--font-mono)' }}>
              {text.length.toLocaleString()} chars
            </span>
          )}
        </div>
        {error && (
          <p style={{ color: 'var(--pl-grade-f)', fontSize: '0.82rem', background: 'rgba(255,23,68,0.1)', border: '1px solid rgba(255,23,68,0.3)', borderRadius: '8px', padding: '8px 12px' }}>
            {error}
          </p>
        )}
      </div>

      {/* Results */}
      {result && (
        <div
          className="flex flex-col gap-5"
          style={{ animation: 'fadeInUp 0.4s ease forwards', paddingTop: '8px', borderTop: '1px solid var(--pl-border)' }}
        >
          {/* Grade header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                border: `2px solid ${gradeColor}`,
                boxShadow: `0 0 16px ${gradeColor}44`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                fontWeight: 700,
                fontFamily: 'var(--font-heading)',
                color: gradeColor,
              }}
            >
              {result.grade}
            </div>
            <div>
              <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--pl-text)', fontFamily: 'var(--font-heading)', margin: 0 }}>
                {result.name}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--pl-text-dim)', margin: '2px 0 0' }}>
                {result.summary}
              </p>
              {result.was_truncated && (
                <p style={{ fontSize: '0.7rem', color: 'var(--pl-text-muted)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                  ⚠ Policy was truncated at 80 000 chars
                </p>
              )}
            </div>
          </div>

          {/* Findings */}
          <div className="flex flex-col gap-4">
            <FindingRow icon="⚠" color="var(--pl-grade-f)" items={result.red_flags} label="Red Flags" />
            <FindingRow icon="◈" color="var(--pl-grade-c)" items={result.warnings} label="Warnings" />
            <FindingRow icon="✓" color="var(--pl-grade-a)" items={result.positives} label="Positives" />
          </div>

          {/* Category breakdown */}
          {result.categories && Object.keys(result.categories).length > 0 && (
            <div className="flex flex-col gap-2">
              <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--pl-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Category Grades
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                {Object.entries(result.categories).map(([key, val]) => {
                  const color = GRADE_COLOR[val.grade] || '#555';
                  return (
                    <div
                      key={key}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: 'var(--pl-surface)',
                        border: '1px solid var(--pl-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--pl-text-dim)' }}>
                          {CATEGORY_LABELS[key] || key}
                        </span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color, fontFamily: 'var(--font-heading)' }}>
                          {val.grade}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.72rem', color: 'var(--pl-text-muted)', margin: 0, lineHeight: 1.4 }}>
                        {val.finding}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {onSaveService && result.service_id && (
              <button
                onClick={() => {
                  if (!savedToCompare) {
                    onSaveService({ id: result.service_id, name: result.name, icon: '📄', website_url: '', privacy_policy_url: '' });
                    setSavedToCompare(true);
                  }
                }}
                disabled={savedToCompare}
                style={savedToCompare
                  ? { padding: '6px 14px', borderRadius: '8px', background: 'rgba(0,229,255,0.1)', border: '1px solid var(--pl-accent)', fontSize: '0.78rem', color: 'var(--pl-accent)', cursor: 'default' }
                  : { padding: '6px 14px', borderRadius: '8px', background: 'var(--pl-accent)', border: 'none', fontSize: '0.78rem', color: 'var(--pl-bg)', fontWeight: 600, cursor: 'pointer' }
                }
              >
                {savedToCompare ? '✓ Added to comparison' : '+ Add to comparison'}
              </button>
            )}
            <button
              onClick={() => { setResult(null); setError(''); setText(''); setName(''); setSavedToCompare(false); }}
              style={{
                background: 'none',
                border: '1px solid var(--pl-border)',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '0.78rem',
                color: 'var(--pl-text-dim)',
                cursor: 'pointer',
              }}
            >
              ← Analyze another policy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
