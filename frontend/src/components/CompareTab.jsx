'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import ServiceGrid from '@/components/ServiceGrid';
import AddService from '@/components/AddService';
import CompareResults from '@/components/CompareResults';
import ServiceIcon from '@/components/ServiceIcon';

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

export default function CompareTab({ services = [] }) {
  const [selectionOrder, setSelectionOrder] = useState([]);
  const [customServices, setCustomServices] = useState([]);
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hydrated, setHydrated] = useState(false);

  const selectedIds = useMemo(() => new Set(selectionOrder), [selectionOrder]);

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
      {/* Slot cards */}
      <div className="flex items-center gap-4 justify-center">
        {/* Slot A */}
        {(() => {
          const slot = slotA;
          const label = 'A';
          const color = 'var(--pl-accent)';
          const slotBg = 'rgba(0,229,255,0.08)';
          const slotBorder = 'var(--pl-accent)';
          const idx = 0;
          return (
            <div
              className="flex-1 max-w-48 rounded-xl px-4 py-3 flex flex-col items-center gap-2 text-center"
              style={{
                background: slot ? slotBg : 'var(--pl-surface)',
                border: slot ? `2px solid ${slotBorder}` : '1px dashed var(--pl-border)',
                minHeight: '80px',
                justifyContent: 'center',
                cursor: slot ? 'pointer' : 'default',
                transition: 'all 0.2s',
              }}
              onClick={() => slot && toggleService(selectionOrder[idx])}
              role={slot ? 'button' : undefined}
              title={slot ? `Remove ${slot.name} from slot ${label}` : undefined}
            >
              <span className="text-xs font-bold" style={{ color, fontFamily: 'var(--font-mono)' }}>{label}</span>
              {slot ? (
                <>
                  <ServiceIcon icon={slot.icon} name={slot.name} size="sm" />
                  <span className="text-xs font-medium" style={{ color: 'var(--pl-text)' }}>{slot.name}</span>
                  <span className="text-xs" style={{ color: 'var(--pl-text-dim)' }}>click to remove</span>
                </>
              ) : (
                <span className="text-xs" style={{ color: 'var(--pl-text-dim)' }}>Select a service</span>
              )}
            </div>
          );
        })()}

        {/* VS label */}
        <div className="flex flex-col items-center justify-center px-2">
          <span
            className="text-lg font-bold"
            style={{ color: 'var(--pl-text-dim)', fontFamily: 'var(--font-mono)' }}
          >
            vs
          </span>
        </div>

        {/* Slot B */}
        {(() => {
          const slot = slotB;
          const label = 'B';
          const color = '#f97316';
          const slotBg = 'rgba(249,115,22,0.08)';
          const slotBorder = '#f97316';
          const idx = 1;
          return (
            <div
              className="flex-1 max-w-48 rounded-xl px-4 py-3 flex flex-col items-center gap-2 text-center"
              style={{
                background: slot ? slotBg : 'var(--pl-surface)',
                border: slot ? `2px solid ${slotBorder}` : '1px dashed var(--pl-border)',
                minHeight: '80px',
                justifyContent: 'center',
                cursor: slot ? 'pointer' : 'default',
                transition: 'all 0.2s',
              }}
              onClick={() => slot && toggleService(selectionOrder[idx])}
              role={slot ? 'button' : undefined}
              title={slot ? `Remove ${slot.name} from slot ${label}` : undefined}
            >
              <span className="text-xs font-bold" style={{ color, fontFamily: 'var(--font-mono)' }}>{label}</span>
              {slot ? (
                <>
                  <ServiceIcon icon={slot.icon} name={slot.name} size="sm" />
                  <span className="text-xs font-medium" style={{ color: 'var(--pl-text)' }}>{slot.name}</span>
                  <span className="text-xs" style={{ color: 'var(--pl-text-dim)' }}>click to remove</span>
                </>
              ) : (
                <span className="text-xs" style={{ color: 'var(--pl-text-dim)' }}>Select a service</span>
              )}
            </div>
          );
        })()}
      </div>

      {/* Service selection */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--pl-text)' }}>
          Popular Services
        </h2>
        <p style={{ color: 'var(--pl-text-dim)', fontSize: '0.875rem' }}>
          Select two services to compare their privacy policies.
        </p>
        <ServiceGrid
          services={services}
          selectedIds={selectedIds}
          onToggle={toggleService}
          customServices={customServices}
          onRemoveCustom={handleRemoveCustom}
          compareMode
          slotOrder={selectionOrder}
        />
      </section>

      {/* Add custom service */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--pl-text)' }}>
          Add a Custom Service
        </h2>
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
        {!bothReady && (
          <p style={{ color: 'var(--pl-text-dim)', fontSize: '0.75rem' }}>
            Select two services above to compare
          </p>
        )}
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
