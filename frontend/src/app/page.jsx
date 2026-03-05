'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import ServiceGrid from '@/components/ServiceGrid';
import AddService from '@/components/AddService';
import RiskProfile from '@/components/RiskProfile';
import CompareTab from '@/components/CompareTab';
import CustomPolicyTab from '@/components/CustomPolicyTab';
import Sidebar from '@/components/Sidebar';
import AboutTab from '@/components/AboutTab';
import SudokuNudge from '@/components/SudokuNudge';

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

export default function Home() {
  const [activeTab, setActiveTab] = useState('about');
  const [services, setServices] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [customServices, setCustomServices] = useState([]);
  const [results, setResults] = useState([]);
  const [overallGrade, setOverallGrade] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [scanMsg, setScanMsg] = useState('');
  const resultsRef = useRef(null);
  const scanMsgTimerRef = useRef(null);
  const cancelledRef = useRef(false);

  // Clean up scan message timer on unmount
  useEffect(() => {
    return () => clearTimeout(scanMsgTimerRef.current);
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
    setActiveTab(loadFromSession(SS_KEYS.activeTab, 'about'));
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
      const res = await fetch('/api/cache', { method: 'DELETE' });
      if (!res.ok) {
        throw new Error('Failed to clear cache');
      }
      setResults([]);
      setOverallGrade(null);
      saveToSession(SS_KEYS.results, []);
      saveToSession(SS_KEYS.overallGrade, null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const hasSelection = selectedIds.size > 0;

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="pl-content-area">
        <div className="max-w-7xl w-full mx-auto px-4 py-10 flex flex-col gap-12" style={{ minHeight: '100vh' }}>

          {error && activeTab !== 'analyze' && (
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

          {activeTab === 'about' && <AboutTab />}

          {activeTab === 'analyze' && (
            <>
              {/* Service selection */}
              <section id="services" className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--pl-text)' }}>
                  Scan Services
                </h2>
                <p style={{ color: 'var(--pl-text-dim)', fontSize: '0.875rem' }}>
                  Pick popular services or add any URL — we&apos;ll grade their privacy policies from A+ to F.
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
                <SudokuNudge />
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
          <footer className="flex justify-center pt-4 pb-2" style={{ marginTop: 'auto' }}>
            <span className="hackathon-badge">
              <span style={{ color: 'var(--pl-accent)' }}>&#9670;</span>
              T1A Hackathon 2026 — PrivacyLens
            </span>
          </footer>

        </div>
      </main>
    </div>
  );
}
