'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import ServiceGrid from '@/components/ServiceGrid';
import AddService from '@/components/AddService';
import RiskProfile from '@/components/RiskProfile';

const SS_KEYS = {
  selectedIds: 'pl_selectedIds',
  customServices: 'pl_customServices',
  results: 'pl_results',
  overallGrade: 'pl_overallGrade',
};

function loadFromSession(key, fallback) {
  if (typeof window === 'undefined') {return fallback;}
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToSession(key, value) {
  if (typeof window === 'undefined') {return;}
  sessionStorage.setItem(key, JSON.stringify(value));
}

export default function Home() {
  const [services, setServices] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [customServices, setCustomServices] = useState([]);
  const [results, setResults] = useState([]);
  const [overallGrade, setOverallGrade] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const sudokuWindowRef = useRef(null);
  const resultsRef = useRef(null);

  // Auto-dismiss scan complete toast after 8s
  useEffect(() => {
    if (!scanComplete) { return; }
    const t = setTimeout(() => setScanComplete(false), 8000);
    return () => clearTimeout(t);
  }, [scanComplete]);

  // Load popular services
  useEffect(() => {
    fetch('/api/services')
      .then((r) => r.json())
      .then(setServices)
      .catch(() => setError('Failed to load services. Is the backend running?'));
  }, []);

  // Hydrate from sessionStorage after mount
  useEffect(() => {
    const ids = loadFromSession(SS_KEYS.selectedIds, []);
    setSelectedIds(new Set(ids));
    setCustomServices(loadFromSession(SS_KEYS.customServices, []));
    setResults(loadFromSession(SS_KEYS.results, []));
    setOverallGrade(loadFromSession(SS_KEYS.overallGrade, null));
    setHydrated(true);
  }, []);

  // Persist selectedIds
  useEffect(() => {
    if (!hydrated) {return;}
    saveToSession(SS_KEYS.selectedIds, [...selectedIds]);
  }, [selectedIds, hydrated]);

  // Persist customServices
  useEffect(() => {
    if (!hydrated) {return;}
    saveToSession(SS_KEYS.customServices, customServices);
  }, [customServices, hydrated]);

  // Persist results
  useEffect(() => {
    if (!hydrated) {return;}
    saveToSession(SS_KEYS.results, results);
    saveToSession(SS_KEYS.overallGrade, overallGrade);
  }, [results, overallGrade, hydrated]);

  const toggleService = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {next.delete(id);}
      else {next.add(id);}
      return next;
    });
  }, []);

  const handleAddCustom = useCallback((svc) => {
    setCustomServices((prev) => {
      if (prev.some((s) => s.id === svc.id)) {return prev;}
      return [...prev, svc];
    });
    setSelectedIds((prev) => new Set([...prev, svc.id]));
  }, []);

  const handleRemoveCustom = useCallback((id) => {
    setCustomServices((prev) => prev.filter((s) => s.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError('');
    if (!sudokuWindowRef.current || sudokuWindowRef.current.closed) {
      const w = 520, h = 740;
      const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
      const top = Math.round(window.screenY + (window.outerHeight - h) / 2);
      const popup = window.open(
        '/sudoku',
        'policylens-sudoku',
        `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=no`
      );
      if (popup) {
        sudokuWindowRef.current = popup;
      }
    } else {
      sudokuWindowRef.current.focus();
    }
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_ids: [...selectedIds] }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Analysis failed');
      }
      const data = await res.json();
      setResults(data.results);
      setOverallGrade(data.overall_grade);
      setScanComplete(true);
      sessionStorage.setItem('pl_scan_done', String(Date.now()));
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const rescanService = useCallback(async (serviceId) => {
    setIsLoading(true);
    setError('');
    try {
      await fetch(`/api/services/${serviceId}/cache`, { method: 'DELETE' });
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_ids: [serviceId] }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Rescan failed');
      }
      const data = await res.json();
      const newResult = data.results[0];
      setResults((prev) => prev.map((r) => r.service_id === serviceId ? newResult : r));
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearCache = useCallback(async () => {
    try {
      await fetch('/api/cache', { method: 'DELETE' });
      setResults([]);
      setOverallGrade(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const hasSelection = selectedIds.size > 0;

  return (
    <main className="max-w-5xl mx-auto px-4 py-10 flex flex-col gap-12">
      {/* Hero */}
      <header className="hero-section scan-line relative py-12 md:py-16 flex flex-col gap-4 text-center items-center">
        <Image
          src="/policy-icon.svg"
          alt="PolicyLens icon"
          className="relative z-1"
          width={80}
          height={92}
          priority
          style={{
            animation: 'fadeInUp 0.6s ease forwards',
            opacity: 0,
            filter: 'drop-shadow(0 0 20px rgba(90, 186, 187, 0.3))',
          }}
        />
        <h1
          className="hero-title text-5xl md:text-6xl font-bold tracking-tight relative z-1"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          PolicyLens
        </h1>
        <p
          className="text-2xl md:text-3xl font-semibold tracking-tight relative z-1"
          style={{
            fontFamily: 'var(--font-heading)',
            color: 'var(--pl-text)',
            animation: 'fadeInUp 0.6s ease forwards',
            animationDelay: '0.1s',
            opacity: 0,
          }}
        >
          Know what you&apos;re agreeing to
        </p>
        <p
          className="max-w-md relative z-1"
          style={{
            color: 'var(--pl-text-muted)',
            fontSize: '1.05rem',
            lineHeight: 1.6,
            animation: 'fadeInUp 0.6s ease forwards',
            animationDelay: '0.25s',
            opacity: 0,
          }}
        >
          AI-powered privacy policy analysis that grades the services you use every day.
        </p>
        <div className="flex justify-center items-center gap-0 mt-4">
          {/* Step 1 */}
          <div
            style={{
              border: '1px solid var(--pl-border)',
              background: 'var(--pl-surface)',
              fontFamily: 'var(--font-mono)',
              animation: 'fadeInUp 0.5s ease forwards',
              animationDelay: '0.1s',
              opacity: 0,
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span
              style={{
                background: 'var(--pl-accent-muted)',
                color: 'var(--pl-accent)',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                fontWeight: 700,
              }}
            >
              1
            </span>
            Select services
          </div>
          {/* Connecting line */}
          <div
            style={{
              width: '48px',
              height: '1px',
              background: 'var(--pl-border)',
              animation: 'lineGrow 0.4s ease forwards',
              animationDelay: '0.3s',
              transformOrigin: 'left',
              transform: 'scaleX(0)',
            }}
          />
          {/* Step 2 */}
          <div
            style={{
              border: '1px solid var(--pl-border)',
              background: 'var(--pl-surface)',
              fontFamily: 'var(--font-mono)',
              animation: 'fadeInUp 0.5s ease forwards',
              animationDelay: '0.3s',
              opacity: 0,
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span
              style={{
                background: 'var(--pl-accent-muted)',
                color: 'var(--pl-accent)',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                fontWeight: 700,
              }}
            >
              2
            </span>
            Scan policies
          </div>
          {/* Connecting line */}
          <div
            style={{
              width: '48px',
              height: '1px',
              background: 'var(--pl-border)',
              animation: 'lineGrow 0.4s ease forwards',
              animationDelay: '0.5s',
              transformOrigin: 'left',
              transform: 'scaleX(0)',
            }}
          />
          {/* Step 3 */}
          <div
            style={{
              border: '1px solid var(--pl-border)',
              background: 'var(--pl-surface)',
              fontFamily: 'var(--font-mono)',
              animation: 'fadeInUp 0.5s ease forwards',
              animationDelay: '0.5s',
              opacity: 0,
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span
              style={{
                background: 'var(--pl-accent-muted)',
                color: 'var(--pl-accent)',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                fontWeight: 700,
              }}
            >
              3
            </span>
            Understand risk
          </div>
        </div>
      </header>

      {/* Service selection */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--pl-text)' }}>
          Popular Services
        </h2>
        <p style={{ color: 'var(--pl-text-dim)', fontSize: '0.875rem' }}>
          Select the services you use to scan their privacy policies.
        </p>
        <ServiceGrid
          services={services}
          selectedIds={selectedIds}
          onToggle={toggleService}
          customServices={customServices}
          onRemoveCustom={handleRemoveCustom}
        />
      </section>

      {/* Add custom service */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--pl-text)' }}>
          Add a Custom Service
        </h2>
        <p style={{ color: 'var(--pl-text-dim)', fontSize: '0.875rem' }}>
          Enter any website URL — we&apos;ll find its privacy policy automatically.
        </p>
        <AddService onAdd={handleAddCustom} />
      </section>

      {/* CTA */}
      <section className="flex flex-col items-center gap-3">
        {error && (
          <p
            className="text-sm rounded-lg px-4 py-2"
            style={{
              color: 'var(--pl-grade-f)',
              background: 'rgba(255, 23, 68, 0.1)',
              border: '1px solid rgba(255, 23, 68, 0.3)',
            }}
          >
            {error}
          </p>
        )}
        <button
          onClick={handleAnalyze}
          disabled={!hasSelection || isLoading}
          className={`px-8 py-3.5 rounded-xl text-base transition-all cursor-pointer ${isLoading ? 'scan-loading' : ''}`}
          style={(() => {
            if (hasSelection && !isLoading) {
              return {
                background: 'var(--pl-accent)',
                color: 'var(--pl-bg)',
                fontWeight: 600,
                animation: 'buttonGlow 3s ease-in-out infinite',
              };
            }
            if (isLoading) {
              return { background: 'var(--pl-accent)', color: 'var(--pl-bg)', fontWeight: 600 };
            }
            return {
              background: 'var(--pl-surface-2)',
              color: 'var(--pl-text-dim)',
              opacity: 0.6,
              cursor: 'not-allowed',
            };
          })()}
        >
          {isLoading ? (
            <span className="flex items-center gap-3">
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: '2px solid var(--pl-bg)',
                  borderTopColor: 'transparent',
                  animation: 'xraySpin 0.8s linear infinite',
                }}
              />
              Scanning policies...
            </span>
          ) : (
            `Analyze My Digital Risk Profile${hasSelection ? ` (${selectedIds.size})` : ''}`
          )}
        </button>
        {!hasSelection && (
          <p style={{ color: 'var(--pl-text-dim)', fontSize: '0.75rem' }}>
            Select at least one service above
          </p>
        )}
        <p style={{ color: 'var(--pl-text-muted)', fontSize: '0.75rem', textAlign: 'center', maxWidth: '360px' }}>
          Not ready to face the truth? That&apos;s fair — you can always just{' '}
          <button
            onClick={() => {
              if (!sudokuWindowRef.current || sudokuWindowRef.current.closed) {
                const w = 520, h = 740;
                const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
                const top = Math.round(window.screenY + (window.outerHeight - h) / 2);
                const popup = window.open('/sudoku', 'policylens-sudoku', `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=no`);
                if (popup) {
                  sudokuWindowRef.current = popup;
                }
              } else {
                sudokuWindowRef.current.focus();
              }
            }}
            style={{ color: 'var(--pl-accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', padding: 0, textDecoration: 'underline' }}
          >
            play Sudoku
          </button>
          {' '}instead. Your data will be harvested either way 😅 Share your sudoku success with friends!
        </p>
      </section>

      {/* Results */}
      {results.length > 0 && (
        <section
          ref={resultsRef}
          className="flex flex-col gap-4"
          style={{ animation: 'fadeInUp 0.6s ease forwards' }}
        >
          <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--pl-text)' }}>
            Your Results
          </h2>
          <RiskProfile overallGrade={overallGrade} results={results} onRescanService={rescanService} onClearCache={clearCache} isLoading={isLoading} />
        </section>
      )}

      {/* Scan complete toast */}
      {scanComplete && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 20px',
            borderRadius: '12px',
            background: 'var(--pl-surface)',
            border: '1px solid var(--pl-accent)',
            boxShadow: '0 0 24px rgba(0, 229, 255, 0.25)',
            animation: 'fadeInUp 0.4s ease forwards',
            zIndex: 1000,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ color: 'var(--pl-accent)', fontSize: '1rem' }}>✓</span>
          <span style={{ color: 'var(--pl-text)', fontSize: '0.875rem', fontWeight: 500 }}>
            Scan complete — your privacy report is ready!
          </span>
          <button
            onClick={() => {
              resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              setScanComplete(false);
            }}
            style={{
              padding: '4px 12px',
              borderRadius: '8px',
              background: 'var(--pl-accent)',
              color: 'var(--pl-bg)',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            View results ↓
          </button>
          <button
            onClick={() => setScanComplete(false)}
            style={{ background: 'none', border: 'none', color: 'var(--pl-text-dim)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: 0 }}
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="flex justify-center pt-4 pb-2">
        <span className="hackathon-badge">
          <span style={{ color: 'var(--pl-accent)' }}>&#9670;</span>
          T1A Hackathon 2026 — PolicyLens
        </span>
      </footer>
    </main>
  );
}
