'use client';

import { useState } from 'react';
import ServiceIcon from '@/components/ServiceIcon';

const GPA = {
  'A+': 4.3, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'D-': 0.7,
  'F': 0.0,
};

function gradeGpa(grade) {
  return GPA[grade] ?? -1;
}

function gradeColor(grade) {
  if (!grade || grade === 'N/A') { return 'var(--pl-grade-na)'; }
  const letter = grade[0];
  if (letter === 'A') { return 'var(--pl-grade-a)'; }
  if (letter === 'B') { return 'var(--pl-grade-b)'; }
  if (letter === 'C') { return 'var(--pl-grade-c)'; }
  if (letter === 'D') { return 'var(--pl-grade-d)'; }
  return 'var(--pl-grade-f)';
}

function gradeColorSet(grade) {
  if (!grade || grade === 'N/A') {
    return { text: 'var(--pl-grade-na)', bg: 'rgba(102,102,128,0.15)', border: 'rgba(102,102,128,0.3)' };
  }
  const letter = grade[0];
  if (letter === 'A') { return { text: 'var(--pl-grade-a)', bg: 'rgba(0,230,118,0.12)', border: 'rgba(0,230,118,0.3)' }; }
  if (letter === 'B') { return { text: 'var(--pl-grade-b)', bg: 'rgba(118,255,3,0.12)', border: 'rgba(118,255,3,0.3)' }; }
  if (letter === 'C') { return { text: 'var(--pl-grade-c)', bg: 'rgba(255,214,0,0.12)', border: 'rgba(255,214,0,0.3)' }; }
  if (letter === 'D') { return { text: 'var(--pl-grade-d)', bg: 'rgba(255,145,0,0.12)', border: 'rgba(255,145,0,0.3)' }; }
  return { text: 'var(--pl-grade-f)', bg: 'rgba(255,23,68,0.12)', border: 'rgba(255,23,68,0.3)' };
}

function GradeBadge({ grade }) {
  const colors = gradeColorSet(grade);
  return (
    <span
      className="inline-flex items-center justify-center rounded-lg px-2 py-0.5"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.85rem',
        fontWeight: 600,
        color: colors.text,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
      }}
    >
      {grade || 'N/A'}
    </span>
  );
}

function GradeBadgeLg({ grade }) {
  const color = gradeColor(grade);
  return (
    <span
      data-testid="grade-badge-lg"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '2rem',
        fontWeight: 700,
        color,
      }}
    >
      {grade || 'N/A'}
    </span>
  );
}

const CATEGORIES = [
  { key: 'data_collection', label: 'Data Collection' },
  { key: 'data_sharing', label: 'Data Sharing' },
  { key: 'data_retention', label: 'Data Retention' },
  { key: 'tracking', label: 'Tracking' },
  { key: 'user_rights', label: 'User Rights' },
];

function CollapsibleSection({ title, color, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="text-xs mb-1 transition-opacity"
        style={{ color, fontFamily: 'var(--font-mono)', outline: 'none' }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
      >
        {open ? '[ - ]' : '[ + ]'} {title}
      </button>
      {open && children}
    </div>
  );
}

function actionCategoryIcon(category) {
  const icons = {
    deletion: '\u{1F5D1}\uFE0F',
    data_access: '\u{1F4E5}',
    privacy_settings: '\u{1F6E1}\uFE0F',
    opt_out: '\u{1F441}\uFE0F',
    legal_rights: '\u2696\uFE0F',
    other: '\u2139\uFE0F',
  };
  return icons[category] || '\u2139\uFE0F';
}

export default function CompareResults({ resultA, resultB, onReset }) {
  const gpaA = gradeGpa(resultA.grade);
  const gpaB = gradeGpa(resultB.grade);

  let winnerName = null;
  if (gpaA > gpaB) {
    winnerName = resultA.name;
  } else if (gpaB > gpaA) {
    winnerName = resultB.name;
  }

  return (
    <div className="flex flex-col gap-6" style={{ animation: 'fadeInUp 0.5s ease forwards' }}>
      {/* Header row */}
      <div className="grid grid-cols-2 gap-4">
        {[resultA, resultB].map((r, idx) => {
          const isWinner = winnerName === r.name;
          const slot = idx === 0 ? 'A' : 'B';
          const slotColor = idx === 0 ? 'var(--pl-accent)' : '#f97316';
          return (
            <div
              key={r.service_id}
              className="rounded-2xl p-5 flex flex-col items-center gap-3 text-center"
              style={{
                background: 'var(--pl-surface)',
                border: isWinner ? '2px solid var(--pl-grade-a)' : '1px solid var(--pl-border)',
                position: 'relative',
              }}
            >
              <span
                className="absolute top-2 left-3 text-xs font-bold rounded px-1.5 py-0.5"
                style={{ background: slotColor, color: idx === 0 ? 'var(--pl-bg)' : '#fff', fontFamily: 'var(--font-mono)' }}
              >
                {slot}
              </span>
              {isWinner && (
                <span
                  data-testid="winner-badge"
                  className="absolute top-2 right-3 text-xs font-semibold rounded px-1.5 py-0.5"
                  style={{ background: 'rgba(0,230,118,0.15)', color: 'var(--pl-grade-a)', border: '1px solid rgba(0,230,118,0.3)' }}
                >
                  Winner
                </span>
              )}
              <ServiceIcon icon={r.icon} name={r.name} />
              <span className="font-semibold text-sm" style={{ color: 'var(--pl-text)' }}>{r.name}</span>
              <GradeBadgeLg grade={r.grade} />
              <p className="text-xs" style={{ color: 'var(--pl-text-muted)' }}>{r.summary}</p>
            </div>
          );
        })}
      </div>

      {/* Verdict banner */}
      {winnerName ? (
        <div
          className="rounded-xl px-4 py-3 text-center text-sm font-semibold"
          style={{
            background: 'rgba(0,230,118,0.08)',
            border: '1px solid rgba(0,230,118,0.25)',
            color: 'var(--pl-grade-a)',
          }}
        >
          {winnerName} has the better privacy policy overall
        </div>
      ) : (
        <div
          className="rounded-xl px-4 py-3 text-center text-sm font-semibold"
          style={{
            background: 'rgba(102,102,128,0.08)',
            border: '1px solid rgba(102,102,128,0.2)',
            color: 'var(--pl-text-muted)',
          }}
        >
          Both services are tied overall
        </div>
      )}

      {/* Category table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--pl-border)' }}
      >
        {/* Column headers */}
        <div className="grid grid-cols-3 text-xs font-semibold"
          style={{ background: 'var(--pl-surface-2)', borderBottom: '1px solid var(--pl-border)' }}>
          <div className="px-3 py-2" style={{ color: 'var(--pl-text-muted)' }}>Category</div>
          <div className="px-3 py-2 text-center" style={{ color: 'var(--pl-accent)' }}>{resultA.name}</div>
          <div className="px-3 py-2 text-center" style={{ color: '#f97316' }}>{resultB.name}</div>
        </div>
        {CATEGORIES.map((cat, i) => {
          const gradeA = resultA.categories?.[cat.key]?.grade ?? resultA.categories?.[cat.key];
          const gradeB = resultB.categories?.[cat.key]?.grade ?? resultB.categories?.[cat.key];
          const gpaCatA = gradeGpa(gradeA);
          const gpaCatB = gradeGpa(gradeB);
          const aWins = gpaCatA > gpaCatB;
          const bWins = gpaCatB > gpaCatA;
          return (
            <div
              key={cat.key}
              className="grid grid-cols-3"
              style={{
                borderTop: i > 0 ? '1px solid var(--pl-border)' : undefined,
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
              }}
            >
              <div className="px-3 py-2 text-xs" style={{ color: 'var(--pl-text-muted)' }}>{cat.label}</div>
              <div
                data-testid={`cat-a-${cat.key}`}
                className="px-3 py-2 flex justify-center items-center"
                style={(() => {
                  if (aWins) { return { borderLeft: '3px solid var(--pl-grade-a)', background: 'rgba(0,230,118,0.06)' }; }
                  if (bWins) { return { borderLeft: '3px solid transparent', background: 'rgba(255,23,68,0.04)' }; }
                  return {};
                })()}
              >
                {gradeA ? <GradeBadge grade={gradeA} /> : <span style={{ color: 'var(--pl-text-dim)', fontSize: '0.75rem' }}>—</span>}
              </div>
              <div
                data-testid={`cat-b-${cat.key}`}
                className="px-3 py-2 flex justify-center items-center"
                style={(() => {
                  if (bWins) { return { borderLeft: '3px solid var(--pl-grade-a)', background: 'rgba(0,230,118,0.06)' }; }
                  if (aWins) { return { borderLeft: '3px solid transparent', background: 'rgba(255,23,68,0.04)' }; }
                  return {};
                })()}
              >
                {gradeB ? <GradeBadge grade={gradeB} /> : <span style={{ color: 'var(--pl-text-dim)', fontSize: '0.75rem' }}>—</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Red flags, warnings, positives */}
      {(['red_flags', 'warnings', 'positives']).map((field) => {
        const hasAny = (resultA[field]?.length || 0) + (resultB[field]?.length || 0) > 0;
        if (!hasAny) { return null; }
        const labels = { red_flags: 'Red Flags', warnings: 'Warnings', positives: 'Positives' };
        const colors = { red_flags: 'var(--pl-grade-f)', warnings: 'var(--pl-grade-c)', positives: 'var(--pl-grade-a)' };
        return (
          <CollapsibleSection key={field} title={labels[field]} color={colors[field]}>
            <div className="grid grid-cols-2 gap-4">
              {[resultA, resultB].map((r, idx) => (
                <div key={r.service_id}>
                  <p className="text-xs font-medium mb-1" style={{ color: idx === 0 ? 'var(--pl-accent)' : '#f97316' }}>{r.name}</p>
                  {r[field]?.length > 0 ? (
                    <ul className="space-y-1">
                      {r[field].map((item, i) => (
                        <li key={i} className="text-xs flex gap-1.5" style={{ color: 'var(--pl-text-muted)' }}>
                          <span style={{ color: colors[field] }} className="shrink-0">&#x25CF;</span>{typeof item === 'object' ? item.text : item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs" style={{ color: 'var(--pl-text-dim)' }}>None</p>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleSection>
        );
      })}

      {/* Actions */}
      {((resultA.actions?.length || 0) + (resultB.actions?.length || 0) > 0) && (
        <CollapsibleSection title="What You Can Do" color="var(--pl-accent)">
          <div className="grid grid-cols-2 gap-4">
            {[resultA, resultB].map((r, idx) => (
              <div key={r.service_id}>
                <p className="text-xs font-medium mb-2" style={{ color: idx === 0 ? 'var(--pl-accent)' : '#f97316' }}>{r.name}</p>
                {r.actions?.length > 0 ? (
                  <div className="space-y-2">
                    {r.actions.map((action, i) => (
                      <div
                        key={i}
                        className="rounded-lg px-3 py-2"
                        style={{ background: 'rgba(0,210,255,0.06)', border: '1px solid rgba(0,210,255,0.15)' }}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-sm shrink-0">{actionCategoryIcon(action.category)}</span>
                          <div>
                            <span className="text-xs font-medium" style={{ color: 'var(--pl-text)' }}>{action.label}</span>
                            <div className="flex gap-2 mt-1">
                              <a href={action.url} target="_blank" rel="noopener noreferrer"
                                className="text-xs hover:underline" style={{ color: 'var(--pl-accent)', fontFamily: 'var(--font-mono)' }}>
                                Go to page &rarr;
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--pl-text-dim)' }}>No actions</p>
                )}
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Reset button */}
      <div className="flex justify-center pt-2">
        <button
          onClick={onReset}
          className="px-5 py-2 rounded-lg text-sm transition-colors cursor-pointer"
          style={{
            fontFamily: 'var(--font-mono)',
            color: 'var(--pl-text-muted)',
            background: 'rgba(102,102,128,0.08)',
            border: '1px solid rgba(102,102,128,0.2)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(102,102,128,0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(102,102,128,0.08)'; }}
        >
          New Comparison
        </button>
      </div>
    </div>
  );
}
