'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import ServiceGrid from '@/components/ServiceGrid';
import AddService from '@/components/AddService';
import CompareResults from '@/components/CompareResults';
import ServiceIcon from '@/components/ServiceIcon';
import SudokuNudge from '@/components/SudokuNudge';

const SS_KEYS = {
  order: 'pl_cmp_order',
  custom: 'pl_cmp_custom',
  results: 'pl_cmp_results',
};

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

const COMPARE_MESSAGES = [
  'Fetching privacy policies...',
  'Parsing policy documents...',
  'Comparing data collection practices...',
  'Analyzing sharing differences...',
  'Scoring both policies...',
  'Generating comparison...',
];

export default function CompareTab({ services = [], preloadService, onPreloadConsumed }) {
  const [selectionOrder, setSelectionOrder] = useState([]);
  const [customServices, setCustomServices] = useState([]);
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [dragOverSlot, setDragOverSlot] = useState(null);
  const [scanMsg, setScanMsg] = useState('');

  const selectedIds = useMemo(() => new Set(selectionOrder), [selectionOrder]);

  // Cycling progress messages
  useEffect(() => {
    if (!isLoading) { setScanMsg(''); return; }
    let i = 0;
    setScanMsg(COMPARE_MESSAGES[0]);
    const iv = setInterval(() => {
      i = (i + 1) % COMPARE_MESSAGES.length;
      setScanMsg(COMPARE_MESSAGES[i]);
    }, 2800);
    return () => clearInterval(iv);
  }, [isLoading]);

  // Hydrate from sessionStorage after mount
  useEffect(() => {
    const order = loadFromSession(SS_KEYS.order, []);
    setSelectionOrder(order);
    setCustomServices(loadFromSession(SS_KEYS.custom, []));
    setResults(loadFromSession(SS_KEYS.results, null));
    setHydrated(true);
  }, []);

  // When a service is pre-loaded from the Custom tab, add it to slot A
  useEffect(() => {
    if (!preloadService || !hydrated) { return; }
    setCustomServices((prev) => prev.some((s) => s.id === preloadService.id) ? prev : [...prev, preloadService]);
    setSelectionOrder((prev) => {
      if (prev.includes(preloadService.id)) { return prev; }
      return prev.length < 2 ? [...prev, preloadService.id] : [prev[1], preloadService.id];
    });
    onPreloadConsumed?.();
  }, [preloadService, hydrated, onPreloadConsumed]);

  // Persist order
  useEffect(() => {
    if (!hydrated) { return; }
    saveToSession(SS_KEYS.order, selectionOrder);
  }, [selectionOrder, hydrated]);

  // Persist customServices
  useEffect(() => {
    if (!hydrated) { return; }
    saveToSession(SS_KEYS.custom, customServices);
  }, [customServices, hydrated]);

  // Persist results
  useEffect(() => {
    if (!hydrated) { return; }
    saveToSession(SS_KEYS.results, results);
  }, [results, hydrated]);

  const toggleService = useCallback((id) => {
    setSelectionOrder((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length < 2) {
        return [...prev, id];
      }
      // Replace slot A (oldest)
      return [prev[1], id];
    });
  }, []);

  const handleAddCustom = useCallback((svc) => {
    setCustomServices((prev) => {
      if (prev.some((s) => s.id === svc.id)) { return prev; }
      return [...prev, svc];
    });
    setSelectionOrder((prev) => {
      if (prev.includes(svc.id)) { return prev; }
      if (prev.length < 2) { return [...prev, svc.id]; }
      return [prev[1], svc.id];
    });
  }, []);

  const handleRemoveCustom = useCallback((id) => {
    setCustomServices((prev) => prev.filter((s) => s.id !== id));
    setSelectionOrder((prev) => prev.filter((x) => x !== id));
  }, []);

  const handleCompare = async () => {
    if (selectionOrder.length < 2) { return; }
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_ids: selectionOrder }),
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
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = useCallback(() => {
    setResults(null);
    setSelectionOrder([]);
    saveToSession(SS_KEYS.results, null);
    saveToSession(SS_KEYS.order, []);
  }, []);

  const handleDropOnSlot = useCallback((slotIndex, e) => {
    e.preventDefault();
    setDragOverSlot(null);
    const id = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (isNaN(id)) {
      return;
    }
    setSelectionOrder((prev) => {
      const other = slotIndex === 0 ? prev[1] : prev[0];
      if (id === other) {
        // Swap slots
        return slotIndex === 0 ? [id, prev[0]] : [prev[1], id];
      }
      // Place id at the target slot, keep the other slot intact
      const without = prev.filter((x) => x !== id);
      if (slotIndex === 0) {
        return [id, ...without].slice(0, 2);
      }
      // slotIndex === 1
      return [without[0] ?? undefined, id].filter((x) => x !== undefined);
    });
  }, []);

  const allServices = [...services, ...customServices];

  // Find service objects for slot cards
  const slotA = allServices.find((s) => s.id === selectionOrder[0]) || null;
  const slotB = allServices.find((s) => s.id === selectionOrder[1]) || null;

  const resultA = results?.find((r) => r.service_id === selectionOrder[0]);
  const resultB = results?.find((r) => r.service_id === selectionOrder[1]);

  const bothReady = selectionOrder.length === 2;
  const hasResults = resultA && resultB;

  return (
    <div className="flex flex-col gap-8">
      {/* Section heading */}
      <section className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--pl-text)' }}>
          Compare Policies
        </h2>
        <p style={{ color: 'var(--pl-text-dim)', fontSize: '0.875rem' }}>
          Select or drag two services into the slots above to compare their privacy practices side by side.
        </p>
      </section>

      {/* Slot cards */}
      <div className="flex items-center gap-4 justify-center">
        {[
          { slot: slotA, label: 'A', color: 'var(--pl-accent)', slotBg: 'rgba(0,229,255,0.08)', dragBg: 'rgba(0,229,255,0.15)', slotBorder: 'var(--pl-accent)', idx: 0 },
          null,
          { slot: slotB, label: 'B', color: '#f97316', slotBg: 'rgba(249,115,22,0.08)', dragBg: 'rgba(249,115,22,0.15)', slotBorder: '#f97316', idx: 1 },
        ].map((item) => {
          if (!item) {
            return (
              <div key="vs" className="flex flex-col items-center justify-center px-2">
                <span className="text-lg font-bold" style={{ color: 'var(--pl-text-dim)', fontFamily: 'var(--font-mono)' }}>vs</span>
              </div>
            );
          }
          const { slot, label, color, slotBg, dragBg, slotBorder, idx } = item;
          const isDragOver = dragOverSlot === idx;

          let background = 'var(--pl-surface)';
          if (isDragOver) { background = dragBg; }
          else if (slot) { background = slotBg; }

          let border = '1px dashed var(--pl-border)';
          if (isDragOver) { border = `2px dashed ${slotBorder}`; }
          else if (slot) { border = `2px solid ${slotBorder}`; }

          let content;
          if (isDragOver && !slot) {
            content = <span className="text-xs font-medium" style={{ color }}>Drop here</span>;
          } else if (slot) {
            content = (
              <>
                <ServiceIcon icon={slot.icon} name={slot.name} size="sm" />
                <span className="text-xs font-medium" style={{ color: 'var(--pl-text)' }}>{slot.name}</span>
                <span className="text-xs" style={{ color: 'var(--pl-text-dim)' }}>click to remove</span>
              </>
            );
          } else {
            content = <span className="text-xs" style={{ color: 'var(--pl-text-dim)' }}>Select or drop a service</span>;
          }

          return (
            <div
              key={label}
              className="flex-1 max-w-48 rounded-xl px-4 py-3 flex flex-col items-center gap-2 text-center"
              style={{
                background,
                border,
                minHeight: '80px',
                justifyContent: 'center',
                cursor: slot ? 'pointer' : 'default',
                transition: 'all 0.2s',
                transform: isDragOver ? 'scale(1.05)' : 'scale(1)',
              }}
              onClick={() => slot && toggleService(selectionOrder[idx])}
              onDragOver={(e) => { e.preventDefault(); setDragOverSlot(idx); }}
              onDragLeave={() => setDragOverSlot(null)}
              onDrop={(e) => handleDropOnSlot(idx, e)}
              role={slot ? 'button' : undefined}
              title={slot ? `Remove ${slot.name} from slot ${label}` : undefined}
            >
              <span className="text-xs font-bold" style={{ color, fontFamily: 'var(--font-mono)' }}>{label}</span>
              {content}
            </div>
          );
        })}
      </div>

      {/* Service selection */}
      <section className="flex flex-col gap-4">
        <ServiceGrid
          services={services}
          selectedIds={selectedIds}
          onToggle={toggleService}
          customServices={customServices}
          onRemoveCustom={handleRemoveCustom}
          compareMode
          slotOrder={selectionOrder}
          onDragStart={() => {}}
        />
      </section>

      {/* Add custom service */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--pl-text)' }}>
          Add a Custom Service
        </h2>
        <p style={{ color: 'var(--pl-text-dim)', fontSize: '0.875rem' }}>
          Paste a privacy policy link, click Add, then select the new service in the slots above to compare.
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
              background: 'rgba(255,23,68,0.1)',
              border: '1px solid rgba(255,23,68,0.3)',
            }}
          >
            {error}
          </p>
        )}
        <button
          onClick={handleCompare}
          disabled={!bothReady || isLoading}
          className={`px-8 py-3.5 rounded-xl text-base transition-all cursor-pointer ${isLoading ? 'scan-loading' : ''}`}
          style={(() => {
            if (bothReady && !isLoading) {
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
              Comparing policies...
            </span>
          ) : (
            'Compare Policies'
          )}
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
        {!bothReady && !isLoading && (
          <p style={{ color: 'var(--pl-text-dim)', fontSize: '0.75rem' }}>
            Select two services above to compare
          </p>
        )}
        <SudokuNudge />
      </section>

      {/* Results */}
      {hasResults && (
        <section className="flex flex-col gap-4" style={{ animation: 'fadeInUp 0.6s ease forwards' }}>
          <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--pl-text)' }}>
            Comparison Results
          </h2>
          <CompareResults resultA={resultA} resultB={resultB} onReset={handleReset} />
        </section>
      )}
    </div>
  );
}
