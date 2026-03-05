'use client';

import { useState, useEffect, useRef } from 'react';
import RiskProfile from '@/components/RiskProfile';
import SudokuNudge from '@/components/SudokuNudge';

const SS_KEYS = {
  text: 'pl_custom_text',
  name: 'pl_custom_name',
  results: 'pl_custom_results',
};

const MIN_CHARS = 50;
const TRUNCATION_WARN = 55000;

const SCAN_MESSAGES = [
  'Parsing policy text...',
  'Detecting data collection clauses...',
  'Analyzing third-party sharing...',
  'Evaluating user rights...',
  'Scoring risk factors...',
  'Generating report...',
];

function loadFromSession(key, fallback) {
  if (typeof window === 'undefined') { return fallback; }
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToSession(key, value) {
  if (typeof window === 'undefined') { return; }
  sessionStorage.setItem(key, JSON.stringify(value));
}

export default function CustomPolicyTab() {
  const [policyText, setPolicyText] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [results, setResults] = useState(null);
  const [overallGrade, setOverallGrade] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [scanMsg, setScanMsg] = useState('');

  // Hydrate from sessionStorage after mount
  useEffect(() => {
    setPolicyText(loadFromSession(SS_KEYS.text, ''));
    setServiceName(loadFromSession(SS_KEYS.name, ''));
    const saved = loadFromSession(SS_KEYS.results, null);
    if (saved) {
      setResults(saved.results);
      setOverallGrade(saved.overall_grade);
    }
    setHydrated(true);
  }, []);

  // Persist text (debounced to avoid lag on large inputs)
  const debounceRef = useRef(null);
  useEffect(() => {
    if (!hydrated) { return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveToSession(SS_KEYS.text, policyText), 500);
    return () => clearTimeout(debounceRef.current);
  }, [policyText, hydrated]);

  // Persist name
  useEffect(() => {
    if (!hydrated) { return; }
    saveToSession(SS_KEYS.name, serviceName);
  }, [serviceName, hydrated]);

  // Persist results
  useEffect(() => {
    if (!hydrated) { return; }
    if (results) {
      saveToSession(SS_KEYS.results, { results, overall_grade: overallGrade });
    } else {
      sessionStorage.removeItem(SS_KEYS.results);
    }
  }, [results, overallGrade, hydrated]);

  // Cycling progress messages
  useEffect(() => {
    if (!isLoading) { setScanMsg(''); return; }
    let i = 0;
    setScanMsg(SCAN_MESSAGES[0]);
    const iv = setInterval(() => {
      i = (i + 1) % SCAN_MESSAGES.length;
      setScanMsg(SCAN_MESSAGES[i]);
    }, 2800);
    return () => clearInterval(iv);
  }, [isLoading]);

  const canAnalyze = policyText.trim().length >= MIN_CHARS;

  async function handleAnalyze() {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/analyze-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: policyText,
          name: serviceName.trim() || 'Custom Policy',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || 'Analysis failed. Please try again.');
        return;
      }
      // Assign stable React key since service_id is null
      const normalized = (data.results || []).map((r, i) => ({
        ...r,
        service_id: `custom-${i}`,
      }));
      setResults(normalized);
      setOverallGrade(data.overall_grade);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleClear() {
    setPolicyText('');
    setServiceName('');
    setResults(null);
    setOverallGrade(null);
    setError('');
    sessionStorage.removeItem(SS_KEYS.text);
    sessionStorage.removeItem(SS_KEYS.name);
    sessionStorage.removeItem(SS_KEYS.results);
  }

  const charCount = policyText.length;
  const showTruncationWarning = charCount > TRUNCATION_WARN;

  return (
    <div className="flex flex-col gap-8">
      {/* Page heading */}
      <section className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--pl-text)' }}>
          Paste &amp; Scan
        </h2>
        <p style={{ color: 'var(--pl-text-dim)', fontSize: '0.875rem' }}>
          Paste any privacy policy text and get an instant grade with key findings.
        </p>
      </section>

      {/* Input section */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="custom-policy-name"
            className="text-sm font-medium"
            style={{ color: 'var(--pl-text-muted)' }}
          >
            Policy / Service Name <span style={{ color: 'var(--pl-text-dim)' }}>(optional)</span>
          </label>
          <input
            id="custom-policy-name"
            type="text"
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            placeholder="e.g. My Company Privacy Policy"
            maxLength={100}
            className="w-full rounded-lg px-4 py-2 text-sm"
            style={{
              background: 'var(--pl-surface)',
              border: '1px solid var(--pl-border)',
              color: 'var(--pl-text)',
              outline: 'none',
            }}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="custom-policy-text"
            className="text-sm font-medium"
            style={{ color: 'var(--pl-text-muted)' }}
          >
            Policy Text
          </label>
          <textarea
            id="custom-policy-text"
            value={policyText}
            onChange={(e) => setPolicyText(e.target.value)}
            placeholder="Paste the full privacy policy text here…"
            rows={14}
            className="w-full rounded-lg px-4 py-3 text-sm font-mono resize-y"
            style={{
              background: 'var(--pl-surface)',
              border: '1px solid var(--pl-border)',
              color: 'var(--pl-text)',
              outline: 'none',
              minHeight: '200px',
            }}
          />
          <div className="flex justify-between text-xs" style={{ color: 'var(--pl-text-dim)' }}>
            <span>
              {charCount < MIN_CHARS
                ? `${MIN_CHARS - charCount} more character${MIN_CHARS - charCount === 1 ? '' : 's'} needed`
                : `${charCount.toLocaleString()} characters`}
            </span>
            {showTruncationWarning && (
              <span style={{ color: 'var(--pl-grade-c)' }}>
                Approaching 60k character limit — only the first 60,000 will be analyzed
              </span>
            )}
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="flex flex-col gap-3 items-center">
        {error && (
          <p
            className="text-sm text-center px-4 py-2 rounded-lg w-full"
            style={{
              background: 'rgba(255,80,80,0.08)',
              border: '1px solid rgba(255,80,80,0.25)',
              color: 'var(--pl-grade-f)',
            }}
          >
            {error}
          </p>
        )}
        <button
          onClick={handleAnalyze}
          disabled={!canAnalyze || isLoading}
          className={`px-8 py-3 rounded-full font-semibold text-sm transition-all cursor-pointer ${isLoading ? 'scan-loading' : ''}`}
          style={(() => {
            if (canAnalyze && !isLoading) {
              return { background: 'var(--pl-accent)', color: 'var(--pl-bg)' };
            }
            if (isLoading) {
              return { background: 'var(--pl-accent)', color: 'var(--pl-bg)' };
            }
            return {
              background: 'var(--pl-surface)',
              color: 'var(--pl-text-dim)',
              border: '1px solid var(--pl-border)',
              cursor: 'not-allowed',
            };
          })()}
        >
          {isLoading ? (
            <span className="flex items-center gap-3">
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: '2px solid var(--pl-bg)',
                  borderTopColor: 'transparent',
                  animation: 'xraySpin 0.8s linear infinite',
                }}
              />
              Analyzing…
            </span>
          ) : 'Analyze Policy'}
        </button>
        {isLoading && scanMsg && (
          <p aria-live="polite" role="status" style={{
            color: 'var(--pl-accent)', fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)', animation: 'fadeInUp 0.3s ease forwards',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <span style={{ opacity: 0.6 }}>&rsaquo;</span>
            {scanMsg}
          </p>
        )}
        <SudokuNudge />
      </section>

      {/* Results section */}
      {results && (
        <section className="flex flex-col gap-4" style={{ animation: 'fadeInUp 0.6s ease forwards' }}>
          <h2
            className="text-lg font-semibold"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--pl-text)' }}
          >
            Analysis Results
          </h2>
          <RiskProfile overallGrade={overallGrade} results={results} isLoading={false} />
          <div className="flex justify-center pt-2">
            <button
              onClick={handleClear}
              className="px-6 py-2 rounded-full text-sm font-medium transition-all cursor-pointer"
              style={{
                background: 'transparent',
                border: '1px solid var(--pl-border)',
                color: 'var(--pl-text-muted)',
              }}
            >
              Clear &amp; Start Over
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
