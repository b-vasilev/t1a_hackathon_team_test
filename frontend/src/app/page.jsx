'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import ServiceGrid from '@/components/ServiceGrid';
import AddService from '@/components/AddService';
import RiskProfile from '@/components/RiskProfile';
import CompareTab from '@/components/CompareTab';
import CustomPolicyTab from '@/components/CustomPolicyTab';

const SS_KEYS = {
  selectedIds: 'pl_selectedIds',
  customServices: 'pl_customServices',
  results: 'pl_results',
  overallGrade: 'pl_overallGrade',
  activeTab: 'pl_active_tab',
  noSudoku: 'pl_no_sudoku',
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

const SCAN_MSGS = [
  'Fetching privacy policy...',
  'Parsing policy document...',
  'Detecting data collection clauses...',
  'Analyzing third-party sharing...',
  'Evaluating user rights & opt-outs...',
  'Scoring risk factors...',
  'Generating your report...',
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('analyze');
  const [services, setServices] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [customServices, setCustomServices] = useState([]);
  const [results, setResults] = useState([]);
  const [overallGrade, setOverallGrade] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [noSudoku, setNoSudoku] = useState(false);
  const [scanMsg, setScanMsg] = useState('');
  const sudokuWindowRef = useRef(null);
  const resultsRef = useRef(null);
  const scanMsgTimerRef = useRef(null);
  const cancelledRef = useRef(false);

  // Clean up scan message timer on unmount
  useEffect(() => {
    return () => clearTimeout(scanMsgTimerRef.current);
  }, []);

  const openSudokuPopup = useCallback(() => {
    if (!sudokuWindowRef.current || sudokuWindowRef.current.closed) {
      const w = 520, h = 740;
      const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
      const top = Math.round(window.screenY + (window.outerHeight - h) / 2);
      const popup = window.open('/sudoku', 'privacylens-sudoku', `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=no`);
      if (popup) {
        sudokuWindowRef.current = popup;
      }
    } else {
      sudokuWindowRef.current.focus();
    }
  }, []);

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
    setActiveTab(loadFromSession(SS_KEYS.activeTab, 'analyze'));
    setNoSudoku(Boolean(loadFromSession(SS_KEYS.noSudoku, false)));
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

  // Persist activeTab
  useEffect(() => {
    if (!hydrated) {return;}
    saveToSession(SS_KEYS.activeTab, activeTab);
  }, [activeTab, hydrated]);

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
    clearTimeout(scanMsgTimerRef.current);
    cancelledRef.current = false;
    setIsLoading(true);
    setError('');

    // Start progress message cycling (loops when exhausted)
    setScanMsg(SCAN_MSGS[0]);
    let msgIdx = 0;
    const advanceMsg = () => {
      if (cancelledRef.current) { return; }
      msgIdx += 1;
      setScanMsg(SCAN_MSGS[msgIdx % SCAN_MSGS.length]);
      scanMsgTimerRef.current = setTimeout(advanceMsg, 2800);
    };
    scanMsgTimerRef.current = setTimeout(advanceMsg, 2800);

    // Open Sudoku popup unless user opted out
    if (!noSudoku) {
      openSudokuPopup();
    }

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_ids: [...selectedIds] }),
      });
      if (!res.ok) {
        let detail = `Analysis failed (HTTP ${res.status})`;
        try {
          const err = await res.json();
          if (err.detail) { detail = err.detail; }
        } catch {}
        throw new Error(detail);
      }
      const data = await res.json();
      setResults(data.results);
      setOverallGrade(data.overall_grade);
      setScanComplete(true);
      sessionStorage.setItem('pl_scan_done', String(Date.now()));
    } catch (e) {
      setError(e.message);
    } finally {
      cancelledRef.current = true;
      clearTimeout(scanMsgTimerRef.current);
      setScanMsg('');
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
        let detail = `Rescan failed (HTTP ${res.status})`;
        try {
          const err = await res.json();
          if (err.detail) { detail = err.detail; }
        } catch {}
        throw new Error(detail);
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
      {/* Tab switcher */}
      <div className="flex justify-center">
        <div
          className="flex gap-1 p-1 rounded-full"
          style={{ background: 'var(--pl-surface)', border: '1px solid var(--pl-border)' }}
        >
          {[
            { id: 'analyze', label: 'Analyze' },
            { id: 'compare', label: 'Compare' },
            { id: 'custom', label: 'Custom Policy' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="px-5 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer capitalize"
              style={activeTab === id
                ? { background: 'var(--pl-accent)', color: 'var(--pl-bg)' }
                : { color: 'var(--pl-text-muted)' }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Hero */}
      <header className="hero-section scan-line relative flex flex-col gap-5 text-center items-center self-center" style={{ width: '100%', maxWidth: '720px' }}>
        <Image
          src="/policy-icon.svg"
          alt="PrivacyLens icon"
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
          className="hero-title text-5xl md:text-6xl font-bold tracking-tight"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          PrivacyLens
        </h1>
        <p
          className="text-2xl md:text-3xl font-semibold tracking-tight"
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
          className="max-w-md"
          style={{
            color: 'var(--pl-text-muted)',
            fontSize: '1.05rem',
            lineHeight: 1.6,
            animation: 'fadeInUp 0.6s ease forwards',
            animationDelay: '0.2s',
            opacity: 0,
          }}
        >
          AI-powered privacy policy analysis that grades the services you use every day — in plain English.
        </p>

        {/* Trust chips */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
            justifyContent: 'center',
            animation: 'fadeInUp 0.6s ease forwards',
            animationDelay: '0.3s',
            opacity: 0,
          }}
        >
          {[
            { icon: '◈', label: 'No account needed' },
            { icon: '◇', label: 'Free' },
            { icon: '⬡', label: 'AI-powered' },
          ].map((chip) => (
            <span
              key={chip.label}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '9999px',
                background: 'rgba(0, 229, 255, 0.06)',
                border: '1px solid rgba(0, 229, 255, 0.15)',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--pl-text-muted)',
                letterSpacing: '0.02em',
              }}
            >
              <span style={{ color: 'var(--pl-accent)', fontSize: '0.7rem' }}>{chip.icon}</span>
              {chip.label}
            </span>
          ))}
        </div>
      </header>

      {/* How it works */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          width: '100%',
          maxWidth: '640px',
          animation: 'fadeInUp 0.5s ease forwards',
          animationDelay: '0.4s',
          opacity: 0,
        }}
        className="hero-steps-grid self-center"
      >
        {[
          {
            icon: (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            ),
            title: 'Select services',
            desc: 'Pick from popular apps or paste any URL',
          },
          {
            icon: (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            ),
            title: 'Scan policies',
            desc: 'AI reads and grades each policy A+ to F',
          },
          {
            icon: (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" />
              </svg>
            ),
            title: 'Understand risk',
            desc: 'Get a plain-English risk profile',
          },
        ].map((step) => (
          <div
            key={step.title}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              padding: '20px 12px',
              borderRadius: '14px',
              border: '1px solid var(--pl-border)',
              background: 'var(--pl-surface)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(0, 229, 255, 0.08)',
                border: '1px solid rgba(0, 229, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--pl-accent)',
              }}
            >
              {step.icon}
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--pl-text)', fontFamily: 'var(--font-heading)' }}>
              {step.title}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--pl-text-dim)', lineHeight: 1.4 }}>
              {step.desc}
            </span>
          </div>
        ))}
        </div>

        {/* Scroll-down chevron */}
        <button
          onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
          aria-label="Scroll to services"
          className="self-center"
          style={{
            marginTop: '20px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            animation: 'chevronBounce 2s ease-in-out infinite',
            color: 'var(--pl-text-dim)',
            padding: '8px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

      {activeTab === 'analyze' && (
        <>
          {/* Service selection */}
          <section id="services" className="flex flex-col gap-4">
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
              Paste a link to any privacy policy — we&apos;ll analyze it for you.
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

            {/* Progress log */}
            {isLoading && scanMsg && (
              <p
                aria-live="polite"
                role="status"
                style={{
                  color: 'var(--pl-accent)',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  animation: 'fadeInUp 0.3s ease forwards',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ opacity: 0.6 }}>&rsaquo;</span>
                {scanMsg}
              </p>
            )}
            {!hasSelection && (
              <p style={{ color: 'var(--pl-text-dim)', fontSize: '0.75rem' }}>
                Select at least one service above
              </p>
            )}
            <p style={{ color: 'var(--pl-text-muted)', fontSize: '0.75rem', textAlign: 'center', maxWidth: '360px' }}>
              Not ready to face the truth? That&apos;s fair — you can always just{' '}
              <button
                onClick={openSudokuPopup}
                style={{ color: 'var(--pl-accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', padding: 0, textDecoration: 'underline' }}
              >
                play Sudoku
              </button>
              {' '}instead. Your data will be harvested either way. Share your sudoku success with friends!
            </p>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.7rem',
                color: 'var(--pl-text-muted)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={noSudoku}
                onChange={(e) => {
                  setNoSudoku(e.target.checked);
                  saveToSession(SS_KEYS.noSudoku, e.target.checked || null);
                }}
                style={{ accentColor: 'var(--pl-accent)', cursor: 'pointer' }}
              />
              Skip Sudoku popup during scans
            </label>
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
        </>
      )}

      {activeTab === 'compare' && (
        <CompareTab services={services} />
      )}

      {activeTab === 'custom' && (
        <CustomPolicyTab />
      )}

      {/* Footer */}
      <footer className="flex justify-center">
        <span className="hackathon-badge">
          <span style={{ color: 'var(--pl-accent)' }}>&#9670;</span>
          T1A Hackathon 2026 — PrivacyLens
        </span>
      </footer>
    </main>
  );
}
