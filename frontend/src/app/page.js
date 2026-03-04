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

  const hasSelection = selectedIds.size > 0;

  return (
    <main className="max-w-5xl mx-auto px-4 py-10 flex flex-col gap-10">
      {/* Header */}
      <header className="flex flex-col gap-3 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          <span className="text-indigo-400">🔍</span> PolicyLens
        </h1>
        <p className="text-slate-400 text-lg">Know what you&apos;re agreeing to</p>
        <div className="flex justify-center gap-8 mt-2 text-sm text-slate-500">
          <span>① Select services</span>
          <span>② Calculate your profile</span>
          <span>③ Understand your risk</span>
        </div>
      </header>

      {/* Service selection */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-slate-200">Popular Services</h2>
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
        <h2 className="text-lg font-semibold text-slate-200">Add a Custom Service</h2>
        <p className="text-sm text-slate-500">
          Enter any website URL — we&apos;ll find its privacy policy automatically.
        </p>
        <AddService onAdd={handleAddCustom} />
      </section>

      {/* CTA */}
      <section className="flex flex-col items-center gap-3">
        {error && (
          <p className="text-red-400 text-sm bg-red-950/40 border border-red-800 rounded-lg px-4 py-2">
            {error}
          </p>
        )}
        <button
          onClick={handleAnalyze}
          disabled={!hasSelection || isLoading}
          className={`
            px-8 py-3.5 rounded-xl font-semibold text-base transition-all
            ${hasSelection && !isLoading
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'}
          `}
        >
          {isLoading ? (
            <span className="flex items-center gap-3">
              <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full inline-block" />
              Analyzing policies…
            </span>
          ) : (
            `Calculate My Digital Risk Profile${hasSelection ? ` (${selectedIds.size})` : ''}`
          )}
        </button>
        {!hasSelection && (
          <p className="text-slate-600 text-xs">Select at least one service above</p>
        )}
      </section>

      {/* Results */}
      {results.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-slate-200">Your Results</h2>
          <RiskProfile overallGrade={overallGrade} results={results} />
        </section>
      )}
    </main>
  );
}
