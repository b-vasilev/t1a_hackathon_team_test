'use client';

import { useState, useEffect, useCallback } from 'react';
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
      {/* Header */}
      <header className="scan-line relative py-8 flex flex-col gap-3 text-center">
        <h1
          className="text-4xl font-bold tracking-tight"
          style={{
            fontFamily: 'var(--font-heading)',
            background: 'linear-gradient(135deg, var(--pl-accent), #a78bfa, var(--pl-accent))',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          PolicyLens
        </h1>
        <p style={{ color: 'var(--pl-text-muted)', fontSize: '1.15rem' }}>
          Know what you&apos;re agreeing to
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
      </section>

      {/* Results */}
      {results.length > 0 && (
        <section
          className="flex flex-col gap-4"
          style={{ animation: 'fadeInUp 0.6s ease forwards' }}
        >
          <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--pl-text)' }}>
            Your Results
          </h2>
          <RiskProfile overallGrade={overallGrade} results={results} onRescanService={rescanService} onClearCache={clearCache} isLoading={isLoading} />
        </section>
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
