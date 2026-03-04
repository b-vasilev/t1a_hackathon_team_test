'use client';

import { useState } from 'react';
import ServiceIcon from '@/components/ServiceIcon';
import PolicyChat from '@/components/PolicyChat';
import PolicyViewer from '@/components/PolicyViewer';

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

function ServiceCard({ result, onRescan, isLoading }) {
  const [expanded, setExpanded] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleDownloadPdf = async () => {
    setGenerating(true);
    try {
      const { generateReport } = await import('./pdf/generateReport');
      await generateReport(result);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('Failed to generate PDF report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };
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
            {onRescan && (
              <button
                onClick={(e) => { e.stopPropagation(); onRescan(result.service_id); }}
                disabled={isLoading}
                title="Rescan this service"
                className="ml-auto shrink-0 p-1 rounded-md transition-colors cursor-pointer"
                style={{
                  color: 'var(--pl-text-muted)',
                  opacity: isLoading ? 0.3 : 0.6,
                }}
                onMouseEnter={(e) => { if (!isLoading) { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--pl-accent)'; } }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.color = 'var(--pl-text-muted)'; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                </svg>
              </button>
            )}
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--pl-text-muted)' }}>{result.summary}</p>
        </div>
      </div>

      {/* ── Unified Action Bar ── */}
      {(hasDetails || (result.grade && result.grade !== 'N/A')) && (
        <>
          <div
            className="flex items-center justify-between gap-2 pt-2 mt-1 flex-wrap"
            style={{ borderTop: '1px solid var(--pl-border)' }}
          >
            {/* Left: Details toggle */}
            {hasDetails && (
              <button
                onClick={() => setExpanded(!expanded)}
                title={expanded ? 'Hide detailed findings' : 'Show detailed findings'}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 cursor-pointer transition-all duration-200"
                style={{
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  outline: 'none',
                  color: expanded ? 'var(--pl-bg)' : 'var(--pl-accent)',
                  background: expanded ? 'var(--pl-accent)' : 'rgba(0, 229, 255, 0.08)',
                  border: `1px solid ${expanded ? 'var(--pl-accent)' : 'rgba(0, 229, 255, 0.2)'}`,
                }}
                onMouseEnter={(e) => {
                  if (!expanded) {
                    e.currentTarget.style.background = 'rgba(0, 229, 255, 0.15)';
                    e.currentTarget.style.borderColor = 'rgba(0, 229, 255, 0.4)';
                  } else {
                    e.currentTarget.style.opacity = '0.85';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!expanded) {
                    e.currentTarget.style.background = 'rgba(0, 229, 255, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(0, 229, 255, 0.2)';
                  } else {
                    e.currentTarget.style.opacity = '1';
                  }
                }}
              >
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{
                    transition: 'transform 0.25s ease',
                    transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
                Details
              </button>
            )}

            {/* Right: Ask / Policy / Report */}
            {result.grade && result.grade !== 'N/A' && (
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  onClick={() => setChatOpen(!chatOpen)}
                  title={chatOpen ? 'Close chat' : 'Ask questions about this policy'}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 cursor-pointer transition-all duration-200"
                  style={{
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    outline: 'none',
                    color: chatOpen ? 'var(--pl-bg)' : 'var(--pl-text-muted)',
                    background: chatOpen ? 'var(--pl-accent)' : 'transparent',
                    border: `1px solid ${chatOpen ? 'var(--pl-accent)' : 'transparent'}`,
                  }}
                  onMouseEnter={(e) => {
                    if (!chatOpen) {
                      e.currentTarget.style.color = 'var(--pl-accent)';
                      e.currentTarget.style.background = 'rgba(0, 229, 255, 0.08)';
                      e.currentTarget.style.borderColor = 'rgba(0, 229, 255, 0.2)';
                    } else {
                      e.currentTarget.style.opacity = '0.85';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!chatOpen) {
                      e.currentTarget.style.color = 'var(--pl-text-muted)';
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = 'transparent';
                    } else {
                      e.currentTarget.style.opacity = '1';
                    }
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  Ask
                </button>

                <button
                  onClick={() => setViewerOpen(true)}
                  title="View the full privacy policy"
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 cursor-pointer transition-all duration-200"
                  style={{
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    outline: 'none',
                    color: 'var(--pl-text-muted)',
                    background: 'transparent',
                    border: '1px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--pl-accent)';
                    e.currentTarget.style.background = 'rgba(0, 229, 255, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(0, 229, 255, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--pl-text-muted)';
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  Policy
                </button>

                <button
                  onClick={handleDownloadPdf}
                  disabled={generating}
                  title={generating ? 'Generating PDF report...' : 'Download PDF report'}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 cursor-pointer transition-all duration-200"
                  style={{
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    outline: 'none',
                    color: 'var(--pl-text-muted)',
                    background: 'transparent',
                    border: '1px solid transparent',
                    opacity: generating ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!generating) {
                      e.currentTarget.style.color = 'var(--pl-accent)';
                      e.currentTarget.style.background = 'rgba(0, 229, 255, 0.08)';
                      e.currentTarget.style.borderColor = 'rgba(0, 229, 255, 0.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--pl-text-muted)';
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  {generating ? (
                    <svg
                      width="12" height="12" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      style={{ animation: 'xraySpin 1s linear infinite' }}
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  )}
                  {generating ? 'Report\u2026' : 'Report'}
                </button>
              </div>
            )}
          </div>

          {/* Details panel */}
          {hasDetails && (
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
                              <span className="font-medium text-sm" style={{ color: 'var(--pl-text)' }}>{action.label}</span>
                              {action.description && (
                                <p className="text-xs mt-0.5" style={{ color: 'var(--pl-text-muted)' }}>{action.description}</p>
                              )}
                              <div className="flex gap-3 mt-1.5">
                                <a
                                  href={action.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs hover:underline"
                                  style={{ color: 'var(--pl-accent)', fontFamily: 'var(--font-mono)' }}
                                >Go to page &rarr;</a>
                                {action.source && (
                                  <a
                                    href={action.source}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs hover:underline"
                                    style={{ color: 'var(--pl-text-muted)', fontFamily: 'var(--font-mono)' }}
                                  >How-to guide &rarr;</a>
                                )}
                              </div>
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
                          <span style={{ color: 'var(--pl-grade-f)' }} className="shrink-0">&#x25CF;</span>{typeof f === 'object' ? f.text : f}
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
                          <span style={{ color: 'var(--pl-grade-c)' }} className="shrink-0">&#x25CF;</span>{typeof w === 'object' ? w.text : w}
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
                          <span style={{ color: 'var(--pl-grade-a)' }} className="shrink-0">&#x25CF;</span>{typeof c === 'object' ? c.text : c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Chat panel */}
          {result.grade && result.grade !== 'N/A' && (
            <>
              <div className={`details-collapse ${chatOpen ? 'open' : ''}`}>
                {chatOpen && <PolicyChat serviceId={result.service_id} />}
              </div>

              {viewerOpen && (
                <PolicyViewer
                  serviceId={result.service_id}
                  serviceName={result.name}
                  grade={result.grade}
                  onClose={() => setViewerOpen(false)}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function RiskProfile({ overallGrade, results, onRescanService, onClearCache, isLoading }) {
  if (!results || results.length === 0) { return null; }

  const hasMockResults = results.some((r) => r.mock);
  const totalRedFlags = results.reduce((n, r) => n + (r.red_flags?.length || 0), 0);
  const totalWarnings = results.reduce((n, r) => n + (r.warnings?.length || 0), 0);
  const totalClean = results.reduce((n, r) => n + (r.positives?.length || 0), 0);

  return (
    <div className="flex flex-col gap-6" style={{ animation: 'fadeInUp 0.5s ease forwards' }}>
      {hasMockResults && (
        <div
          data-testid="mock-banner"
          className="rounded-xl px-4 py-3 flex items-center gap-3 text-sm"
          style={{
            background: 'rgba(0, 210, 255, 0.08)',
            border: '1px solid rgba(0, 210, 255, 0.2)',
            color: 'var(--pl-text-muted)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--pl-accent)', flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>AI analysis temporarily unavailable &mdash; showing example results for demonstration purposes.</span>
        </div>
      )}

      {/* Overall grade */}
      <div
        className="rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6 noise-bg"
        style={{
          background: 'var(--pl-surface)',
          border: '1px solid var(--pl-border)',
        }}
      >
        <GradeBadge grade={overallGrade} size="lg" />
        <div style={{ position: 'relative' }}>
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
          {onClearCache && (
            <button
              onClick={onClearCache}
              disabled={isLoading}
              className="mt-3 text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              style={{
                fontFamily: 'var(--font-mono)',
                color: 'var(--pl-text-muted)',
                background: 'rgba(102, 102, 128, 0.08)',
                border: '1px solid rgba(102, 102, 128, 0.2)',
                opacity: isLoading ? 0.5 : 1,
              }}
              onMouseEnter={(e) => { if (!isLoading) { e.currentTarget.style.background = 'rgba(102, 102, 128, 0.15)'; } }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(102, 102, 128, 0.08)'; }}
            >
              Clear Cache
            </button>
          )}
        </div>
      </div>

      {/* Per-service cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
        {results.map((r) => (
          <ServiceCard key={r.service_id} result={r} onRescan={onRescanService} isLoading={isLoading} />
        ))}
      </div>
    </div>
  );
}
