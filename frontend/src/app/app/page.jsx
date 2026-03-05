'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import ServiceGrid from '@/components/ServiceGrid';
import AddService from '@/components/AddService';
import RiskProfile from '@/components/RiskProfile';
import CompareTab from '@/components/CompareTab';
import ImportTab from '@/components/ImportTab';

const SS_KEYS = {
  selectedIds: 'pl_selectedIds',
  customServices: 'pl_customServices',
  results: 'pl_results',
  overallGrade: 'pl_overallGrade',
  activeTab: 'pl_active_tab',
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

export default function AppPage() {
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
  const [comparePreload, setComparePreload] = useState(null);
  const [scanMsg, setScanMsg] = useState('');
  const sudokuWindowRef = useRef(null);
  const resultsRef = useRef(null);
  const scanMsgTimerRef = useRef(null);
  const broadcastRef = useRef(null);

  // Set up BroadcastChannel for real-time scan progress to Sudoku popup
  useEffect(() => {
    const ch = new BroadcastChannel('pl_scan');
    broadcastRef.current = ch;
    return () => ch.close();
  }, []);

  const openSudokuPopup = useCallback(() => {
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
    setNoSudoku(Boolean(sessionStorage.getItem('pl_no_sudoku')));
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
    setIsLoading(true);
    setError('');
    // Open Sudoku popup unless user opted out (before broadcasts so popup can subscribe)
    if (!noSudoku) {
      openSudokuPopup();
    }

    // Brief delay so newly-opened popup has time to subscribe to BroadcastChannel
    await new Promise((r) => setTimeout(r, 150));
    broadcastRef.current?.postMessage({ type: 'scan_start' });

    // Start progress message cycling
    setScanMsg(SCAN_MSGS[0]);
    broadcastRef.current?.postMessage({ type: 'scan_progress', msg: SCAN_MSGS[0] });
    let msgIdx = 0;
    const advanceMsg = () => {
      msgIdx += 1;
      if (msgIdx < SCAN_MSGS.length) {
        setScanMsg(SCAN_MSGS[msgIdx]);
        broadcastRef.current?.postMessage({ type: 'scan_progress', msg: SCAN_MSGS[msgIdx] });
        scanMsgTimerRef.current = setTimeout(advanceMsg, 2800);
      }
    };
    scanMsgTimerRef.current = setTimeout(advanceMsg, 2800);

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
      broadcastRef.current?.postMessage({ type: 'scan_complete' });
    } catch (e) {
      setError(e.message);
      broadcastRef.current?.postMessage({ type: 'scan_error' });
    } finally {
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

  const handleAddToCompare = useCallback((svc) => {
    setComparePreload(svc);
    setActiveTab('compare');
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
    <div style={{ minHeight: '100vh' }}>
      {/* Sticky tab switcher — outside flex container so position:sticky works */}
      <div
        className="flex justify-center"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'var(--pl-bg)',
          paddingTop: '12px',
          paddingBottom: '12px',
          borderBottom: '1px solid var(--pl-border)',
        }}
      >
        <div
          className="flex gap-1 p-1 rounded-full"
          style={{ background: 'var(--pl-surface)', border: '1px solid var(--pl-border)' }}
        >
          {[
            { id: 'analyze', label: 'Analyze' },
            { id: 'compare', label: 'Compare' },
            { id: 'import', label: 'Custom' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-5 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer"
              style={activeTab === tab.id
                ? { background: 'var(--pl-accent)', color: 'var(--pl-bg)' }
                : { color: 'var(--pl-text-muted)' }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-10">

      {activeTab === 'analyze' && (
        <>
          {/* Service selection */}
          <section id="services" className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--pl-text)' }}>
                Popular Services
              </h2>
              {selectedIds.size > 0 && (
                <button
                  onClick={() => setSelectedIds(new Set())}
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--pl-text-dim)',
                    background: 'none',
                    border: '1px solid var(--pl-border)',
                    borderRadius: '6px',
                    padding: '3px 10px',
                    cursor: 'pointer',
                  }}
                >
                  Clear all ({selectedIds.size})
                </button>
              )}
            </div>
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

            {/* Progress log */}
            {isLoading && scanMsg && (
              <p
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
            {!noSudoku && (
              <p style={{ color: 'var(--pl-text-muted)', fontSize: '0.75rem', textAlign: 'center', maxWidth: '360px' }}>
                Not ready to face the truth? That&apos;s fair — you can always just{' '}
                <button
                  onClick={openSudokuPopup}
                  style={{ color: 'var(--pl-accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', padding: 0, textDecoration: 'underline' }}
                >
                  play Sudoku
                </button>
                {' '}instead. Your data will be harvested either way.
              </p>
            )}
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
                  if (e.target.checked) {
                    sessionStorage.setItem('pl_no_sudoku', '1');
                  } else {
                    sessionStorage.removeItem('pl_no_sudoku');
                  }
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
        <CompareTab
          services={services}
          parentHydrated={hydrated}
          preloadService={comparePreload}
          onPreloadConsumed={() => setComparePreload(null)}
        />
      )}

      {activeTab === 'import' && (
        <ImportTab onSaveService={handleAddToCompare} />
      )}

      {/* Scan complete toast */}
      {scanComplete && !noSudoku && (
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
          <span style={{ color: 'var(--pl-accent)', fontSize: '1rem' }}>&#x2713;</span>
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
            View results &#x2193;
          </button>
          <button
            onClick={() => setScanComplete(false)}
            style={{ background: 'none', border: 'none', color: 'var(--pl-text-dim)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: 0 }}
            title="Dismiss"
          >
            &#x2715;
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
    </div>
  );
}
