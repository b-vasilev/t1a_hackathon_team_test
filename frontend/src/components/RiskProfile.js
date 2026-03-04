'use client';

import { useState } from 'react';
import ServiceIcon from '@/components/ServiceIcon';

function gradeToPercent(grade) {
  if (!grade || grade === 'N/A') {
    return 0;
  }
  const map = {
    'A+': 97, 'A': 92, 'A-': 88,
    'B+': 83, 'B': 78, 'B-': 73,
    'C+': 68, 'C': 63, 'C-': 58,
    'D+': 53, 'D': 48, 'D-': 43,
    'F': 25,
  };
  return map[grade] ?? 50;
}

function gradeColor(grade) {
  if (!grade || grade === 'N/A') {
    return 'var(--pl-grade-na)';
  }
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

function GradeBadge({ grade, size = 'md' }) {
  const color = gradeColor(grade);
  const pct = gradeToPercent(grade);
  const deg = (pct / 100) * 360;

  if (size === 'lg') {
    return (
      <div className="grade-gauge">
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: `conic-gradient(${color} ${deg}deg, var(--pl-border) ${deg}deg)`,
            mask: 'radial-gradient(farthest-side, transparent calc(100% - 6px), #fff calc(100% - 6px))',
            WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 6px), #fff calc(100% - 6px))',
          }}
        />
        <div className="grade-gauge-inner">
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '1.75rem',
              fontWeight: 700,
              color: color,
            }}
          >
            {grade || 'N/A'}
          </span>
        </div>
      </div>
    );
  }

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

function ServiceCard({ result }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails =
    result.actions?.length > 0 ||
    result.red_flags?.length > 0 ||
    result.warnings?.length > 0 ||
    result.positives?.length > 0;

  const letter = result.grade?.[0];
  let stripeClass = 'accent-stripe accent-stripe-cyan';
  if (letter === 'A' || letter === 'B') {
    stripeClass = 'accent-stripe accent-stripe-green';
  } else if (letter === 'C') {
    stripeClass = 'accent-stripe accent-stripe-yellow';
  } else if (letter === 'D' || letter === 'F') {
    stripeClass = 'accent-stripe accent-stripe-red';
  }

  return (
    <div
      className={`rounded-xl p-4 pl-5 flex flex-col gap-3 ${stripeClass}`}
      style={{
        background: 'var(--pl-surface)',
        border: '1px solid var(--pl-border)',
      }}
    >
      <div className="flex items-start gap-3">
        <ServiceIcon icon={result.icon} name={result.name} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold" style={{ color: 'var(--pl-text)' }}>{result.name}</span>
            <GradeBadge grade={result.grade} size="sm" />
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--pl-text-muted)' }}>{result.summary}</p>
        </div>
      </div>

      {hasDetails && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs self-start transition-colors"
            style={{ color: 'var(--pl-accent)', fontFamily: 'var(--font-mono)', outline: 'none' }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            onFocus={(e) => { e.currentTarget.style.textDecoration = 'underline'; e.currentTarget.style.opacity = '0.9'; }}
            onBlur={(e) => { e.currentTarget.style.textDecoration = 'none'; e.currentTarget.style.opacity = '1'; }}
          >
            {expanded ? '[ - ] Hide details' : '[ + ] Show details'}
          </button>

          <div className={`details-collapse ${expanded ? 'open' : ''}`}>
            <div className="flex flex-col gap-3 text-sm pt-1">
              {result.actions?.length > 0 && (
                <div>
                  <p className="font-medium mb-2" style={{ color: 'var(--pl-accent)' }}>What You Can Do</p>
                  <div className="space-y-2">
                    {result.actions.map((action, i) => (
                      <div
                        key={i}
                        className="rounded-lg px-3 py-2"
                        style={{
                          background: 'rgba(0, 210, 255, 0.06)',
                          border: '1px solid rgba(0, 210, 255, 0.15)',
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-base shrink-0 mt-0.5">{actionCategoryIcon(action.category)}</span>
                          <div className="flex-1 min-w-0">
                            <a
                              href={action.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-sm hover:underline"
                              style={{ color: 'var(--pl-text)' }}
                            >{action.label} <span style={{ color: 'var(--pl-accent)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>&rarr;</span></a>
                            {action.description && (
                              <p className="text-xs mt-0.5" style={{ color: 'var(--pl-text-muted)' }}>{action.description}</p>
                            )}
                            {action.source && (
                              <a
                                href={action.source}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs mt-1 inline-block hover:underline"
                                style={{ color: 'var(--pl-accent)', opacity: 0.7 }}
                              >source</a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {result.red_flags?.length > 0 && (
                <div>
                  <p className="font-medium mb-1" style={{ color: 'var(--pl-grade-f)' }}>Red Flags</p>
                  <ul className="space-y-1">
                    {result.red_flags.map((f, i) => (
                      <li key={i} className="flex gap-2" style={{ color: 'var(--pl-text-muted)' }}>
                        <span style={{ color: 'var(--pl-grade-f)' }} className="shrink-0">&#x25CF;</span>{f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.warnings?.length > 0 && (
                <div>
                  <p className="font-medium mb-1" style={{ color: 'var(--pl-grade-c)' }}>Warnings</p>
                  <ul className="space-y-1">
                    {result.warnings.map((w, i) => (
                      <li key={i} className="flex gap-2" style={{ color: 'var(--pl-text-muted)' }}>
                        <span style={{ color: 'var(--pl-grade-c)' }} className="shrink-0">&#x25CF;</span>{w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.positives?.length > 0 && (
                <div>
                  <p className="font-medium mb-1" style={{ color: 'var(--pl-grade-a)' }}>Positives</p>
                  <ul className="space-y-1">
                    {result.positives.map((c, i) => (
                      <li key={i} className="flex gap-2" style={{ color: 'var(--pl-text-muted)' }}>
                        <span style={{ color: 'var(--pl-grade-a)' }} className="shrink-0">&#x25CF;</span>{c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function RiskProfile({ overallGrade, results }) {
  if (!results || results.length === 0) { return null; }

  const totalRedFlags = results.reduce((n, r) => n + (r.red_flags?.length || 0), 0);
  const totalWarnings = results.reduce((n, r) => n + (r.warnings?.length || 0), 0);
  const totalClean = results.reduce((n, r) => n + (r.positives?.length || 0), 0);

  return (
    <div className="flex flex-col gap-6" style={{ animation: 'fadeInUp 0.5s ease forwards' }}>
      {/* Overall grade */}
      <div
        className="rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6 noise-bg"
        style={{
          background: 'var(--pl-surface)',
          border: '1px solid var(--pl-border)',
        }}
      >
        <GradeBadge grade={overallGrade} size="lg" />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2
            className="text-xl font-bold"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--pl-text)' }}
          >
            Your Digital Risk Profile
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--pl-text-muted)' }}>
            Based on {results.length} service{results.length !== 1 ? 's' : ''} analyzed
          </p>
          <div className="flex gap-4 mt-3 text-sm" style={{ fontFamily: 'var(--font-mono)' }}>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: 'var(--pl-grade-f)' }} />
              <span style={{ color: 'var(--pl-text-muted)' }}>{totalRedFlags} red flag{totalRedFlags !== 1 ? 's' : ''}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: 'var(--pl-grade-c)' }} />
              <span style={{ color: 'var(--pl-text-muted)' }}>{totalWarnings} warning{totalWarnings !== 1 ? 's' : ''}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: 'var(--pl-grade-a)' }} />
              <span style={{ color: 'var(--pl-text-muted)' }}>{totalClean} positive{totalClean !== 1 ? 's' : ''}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Per-service cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
        {results.map((r) => (
          <ServiceCard key={r.service_id} result={r} />
        ))}
      </div>
    </div>
  );
}
