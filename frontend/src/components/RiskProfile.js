'use client';

import { useState } from 'react';

function ServiceIcon({ icon, name }) {
  if (icon && icon.startsWith('http')) {
    return (
      <div className="w-8 h-8 shrink-0 flex items-center justify-center mt-0.5">
        <img
          src={icon}
          alt={name}
          width={32}
          height={32}
          className="rounded-md object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextSibling.style.display = 'flex';
          }}
        />
        <span
          style={{ display: 'none' }}
          className="w-8 h-8 rounded-md bg-slate-700 items-center justify-center text-slate-300 font-bold"
        >
          {name[0].toUpperCase()}
        </span>
      </div>
    );
  }
  return <span className="text-2xl mt-0.5">{icon || '🌐'}</span>;
}

function gradeColors(grade) {
  if (!grade || grade === 'N/A') return 'text-gray-400 bg-gray-800 border-gray-700';
  const letter = grade[0];
  if (letter === 'A') return 'text-green-400 bg-green-900/40 border-green-500/40';
  if (letter === 'B') return 'text-lime-400 bg-lime-900/40 border-lime-500/40';
  if (letter === 'C') return 'text-yellow-400 bg-yellow-900/40 border-yellow-500/40';
  if (letter === 'D') return 'text-orange-400 bg-orange-900/40 border-orange-500/40';
  return 'text-red-400 bg-red-900/40 border-red-500/40';
}

function GradeBadge({ grade, size = 'md' }) {
  const colors = gradeColors(grade);
  const sizeClass = size === 'lg'
    ? 'text-5xl w-20 h-20'
    : 'text-xl w-10 h-10';
  return (
    <div className={`inline-flex items-center justify-center rounded-xl border font-bold ${colors} ${sizeClass}`}>
      {grade || 'N/A'}
    </div>
  );
}

function ServiceCard({ result }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails =
    result.red_flags?.length > 0 ||
    result.warnings?.length > 0 ||
    result.positives?.length > 0;

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <ServiceIcon icon={result.icon} name={result.name} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-100">{result.name}</span>
            <GradeBadge grade={result.grade} size="sm" />
          </div>
          <p className="text-sm text-slate-400 mt-1">{result.summary}</p>
        </div>
      </div>

      {hasDetails && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-indigo-400 hover:text-indigo-300 self-start transition-colors"
          >
            {expanded ? '▲ Hide details' : '▼ Show details'}
          </button>

          {expanded && (
            <div className="flex flex-col gap-2 text-sm">
              {result.red_flags?.length > 0 && (
                <div>
                  <p className="font-medium text-red-400 mb-1">🚩 Red Flags</p>
                  <ul className="space-y-1">
                    {result.red_flags.map((f, i) => (
                      <li key={i} className="text-slate-300 flex gap-2">
                        <span className="text-red-500 shrink-0">•</span>{f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.warnings?.length > 0 && (
                <div>
                  <p className="font-medium text-yellow-400 mb-1">⚠️ Warnings</p>
                  <ul className="space-y-1">
                    {result.warnings.map((w, i) => (
                      <li key={i} className="text-slate-300 flex gap-2">
                        <span className="text-yellow-500 shrink-0">•</span>{w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.positives?.length > 0 && (
                <div>
                  <p className="font-medium text-green-400 mb-1">✅ Positives</p>
                  <ul className="space-y-1">
                    {result.positives.map((c, i) => (
                      <li key={i} className="text-slate-300 flex gap-2">
                        <span className="text-green-500 shrink-0">•</span>{c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function RiskProfile({ overallGrade, results }) {
  if (!results || results.length === 0) return null;

  const totalRedFlags = results.reduce((n, r) => n + (r.red_flags?.length || 0), 0);
  const totalWarnings = results.reduce((n, r) => n + (r.warnings?.length || 0), 0);
  const totalClean = results.reduce((n, r) => n + (r.positives?.length || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Overall grade */}
      <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 flex flex-col sm:flex-row items-center gap-6">
        <GradeBadge grade={overallGrade} size="lg" />
        <div>
          <h2 className="text-xl font-bold text-slate-100">Your Digital Risk Profile</h2>
          <p className="text-slate-400 text-sm mt-1">
            Based on {results.length} service{results.length !== 1 ? 's' : ''} analyzed
          </p>
          {/* Stats bar */}
          <div className="flex gap-4 mt-3 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
              <span className="text-slate-300">{totalRedFlags} red flag{totalRedFlags !== 1 ? 's' : ''}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" />
              <span className="text-slate-300">{totalWarnings} warning{totalWarnings !== 1 ? 's' : ''}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
              <span className="text-slate-300">{totalClean} positive{totalClean !== 1 ? 's' : ''}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Per-service cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {results.map((r) => (
          <ServiceCard key={r.service_id} result={r} />
        ))}
      </div>
    </div>
  );
}
