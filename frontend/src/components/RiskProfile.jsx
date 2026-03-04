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

const ALTERNATIVES = {
  google:     [{ name: 'DuckDuckGo', desc: 'No tracking, no profiling', url: 'https://duckduckgo.com' }, { name: 'Brave Search', desc: 'Independent index', url: 'https://search.brave.com' }],
  facebook:   [{ name: 'Signal', desc: 'Encrypted messaging', url: 'https://signal.org' }, { name: 'Mastodon', desc: 'Decentralized social network', url: 'https://joinmastodon.org' }],
  instagram:  [{ name: 'Pixelfed', desc: 'Photo sharing without tracking', url: 'https://pixelfed.org' }],
  tiktok:     [{ name: 'PeerTube', desc: 'Federated video, no algorithm', url: 'https://joinpeertube.org' }],
  twitter:    [{ name: 'Mastodon', desc: 'Federated, no ads', url: 'https://joinmastodon.org' }, { name: 'Bluesky', desc: 'Open protocol', url: 'https://bsky.app' }],
  x:          [{ name: 'Mastodon', desc: 'Federated, no ads', url: 'https://joinmastodon.org' }],
  whatsapp:   [{ name: 'Signal', desc: 'Open-source, end-to-end encrypted', url: 'https://signal.org' }],
  youtube:    [{ name: 'Invidious', desc: 'Privacy-friendly YouTube frontend', url: 'https://invidious.io' }, { name: 'PeerTube', desc: 'Federated video', url: 'https://joinpeertube.org' }],
  discord:    [{ name: 'Matrix/Element', desc: 'Federated, self-hostable', url: 'https://element.io' }, { name: 'Signal', desc: 'Encrypted group chat', url: 'https://signal.org' }],
  snapchat:   [{ name: 'Signal', desc: 'Disappearing messages + E2E', url: 'https://signal.org' }],
  zoom:       [{ name: 'Jitsi Meet', desc: 'Open-source, no account needed', url: 'https://meet.jit.si' }],
  slack:      [{ name: 'Matrix/Element', desc: 'Federated, self-hostable', url: 'https://element.io' }, { name: 'Mattermost', desc: 'Open-source team chat', url: 'https://mattermost.com' }],
  reddit:     [{ name: 'Lemmy', desc: 'Federated Reddit alternative', url: 'https://join-lemmy.org' }],
  spotify:    [{ name: 'Bandcamp', desc: 'Artist-first, minimal data', url: 'https://bandcamp.com' }],
  dropbox:    [{ name: 'Nextcloud', desc: 'Self-hosted cloud storage', url: 'https://nextcloud.com' }, { name: 'ProtonDrive', desc: 'End-to-end encrypted', url: 'https://proton.me/drive' }],
  netflix:    [{ name: 'Jellyfin', desc: 'Self-hosted, no tracking', url: 'https://jellyfin.org' }],
  gmail:      [{ name: 'ProtonMail', desc: 'End-to-end encrypted email', url: 'https://proton.me/mail' }, { name: 'Tutanota', desc: 'Open-source encrypted email', url: 'https://tuta.com' }],
  linkedin:   [{ name: 'Mastodon', desc: 'Professional communities exist', url: 'https://joinmastodon.org' }],
  'disney+':  [{ name: 'Jellyfin', desc: 'Self-hosted media, zero tracking', url: 'https://jellyfin.org' }],
  amazon:     [{ name: 'Nextcloud', desc: 'Self-hosted alternatives available', url: 'https://nextcloud.com' }],
  microsoft:  [{ name: 'LibreOffice', desc: 'Open-source office suite', url: 'https://libreoffice.org' }],
  twitch:     [{ name: 'PeerTube', desc: 'Federated live streaming', url: 'https://joinpeertube.org' }],
  pinterest:  [{ name: 'Are.na', desc: 'Mindful bookmarking, minimal tracking', url: 'https://www.are.na' }],
};

function findAlternatives(serviceName) {
  if (!serviceName) { return []; }
  const key = serviceName.toLowerCase().trim();
  for (const [k, alts] of Object.entries(ALTERNATIVES)) {
    if (key.includes(k) || k.includes(key)) { return alts; }
  }
  return [];
}

// Merge LLM-generated alternatives (preferred) with static fallback
function getAlternativesForResult(result) {
  const llmAlts = (result.alternatives || []).map((a) => ({ name: a.name, description: a.description, url: a.url }));
  if (llmAlts.length > 0) { return llmAlts; }
  const staticAlts = findAlternatives(result.name);
  return staticAlts.map((a) => ({ name: a.name, description: a.desc, url: a.url }));
}

const LOW_GRADES = new Set(['D+', 'D', 'D-', 'F']);
const GRADE_GPA = { 'A+': 4.3, 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7, 'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'D-': 0.7, 'F': 0.0 };

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

      {/* In-card alternatives for D/F services */}
      {LOW_GRADES.has(result.grade) && (() => {
        const alts = getAlternativesForResult(result);
        if (alts.length === 0) { return null; }
        return (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--pl-text-dim)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', paddingTop: '6px' }}>
              🛡️ Consider instead:
            </span>
            {alts.map((alt) => (
              alt.url ? (
                <a
                  key={alt.name}
                  href={alt.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={alt.description}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    border: '1px solid rgba(0,229,255,0.2)',
                    background: 'rgba(0,229,255,0.06)',
                    textDecoration: 'none',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: 'var(--pl-accent)',
                    fontFamily: 'var(--font-mono)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,229,255,0.14)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,229,255,0.06)'; }}
                >
                  {alt.name} ↗
                </a>
              ) : (
                <span
                  key={alt.name}
                  title={alt.description}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    border: '1px solid rgba(0,229,255,0.2)',
                    background: 'rgba(0,229,255,0.06)',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: 'var(--pl-accent)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {alt.name}
                </span>
              )
            ))}
          </div>
        );
      })()}

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

      {/* Worst Offender callout */}
      {(() => {
        const worst = [...results].sort((a, b) => (GRADE_GPA[a.grade] ?? 99) - (GRADE_GPA[b.grade] ?? 99))[0];
        if (!worst || !LOW_GRADES.has(worst.grade)) { return null; }
        const topFlag = worst.red_flags?.[0];
        const snippet = topFlag ? (typeof topFlag === 'object' ? topFlag.text : topFlag) : worst.summary;
        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(255,23,68,0.07)',
              border: '1px solid rgba(255,23,68,0.25)',
            }}
          >
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠️</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--pl-grade-f)', fontFamily: 'var(--font-heading)' }}>
                Worst offender: {worst.name} ({worst.grade})
              </span>
              {snippet && (
                <span style={{ fontSize: '0.75rem', color: 'var(--pl-text-muted)' }}>{snippet}</span>
              )}
            </div>
          </div>
        );
      })()}

      {/* Aggregated Action Plan */}
      {(() => {
        const actions = [...results]
          .sort((a, b) => (GRADE_GPA[a.grade] ?? 99) - (GRADE_GPA[b.grade] ?? 99))
          .flatMap((r) => (r.actions || []).map((act) => ({ ...act, serviceName: r.name })))
          .slice(0, 5);
        if (actions.length === 0) { return null; }
        return (
          <div
            style={{
              borderRadius: '14px',
              border: '1px solid var(--pl-border)',
              background: 'var(--pl-surface)',
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.95rem' }}>📋</span>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--pl-text)', fontSize: '0.95rem' }}>
                Your Action Plan
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--pl-text-dim)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>
                top {actions.length} priority steps
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {actions.map((action, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'rgba(0,210,255,0.05)',
                    border: '1px solid rgba(0,210,255,0.12)',
                  }}
                >
                  <span style={{ fontSize: '1rem', flexShrink: 0 }}>{actionCategoryIcon(action.category)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--pl-text)' }}>{action.label}</span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--pl-text-dim)', fontFamily: 'var(--font-mono)' }}>
                        [{action.serviceName}]
                      </span>
                    </div>
                    {action.description && (
                      <p style={{ fontSize: '0.72rem', color: 'var(--pl-text-muted)', margin: '2px 0 0', lineHeight: 1.4 }}>
                        {action.description}
                      </p>
                    )}
                    {action.url && (
                      <a
                        href={action.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '0.7rem', color: 'var(--pl-accent)', fontFamily: 'var(--font-mono)', textDecoration: 'none', display: 'inline-block', marginTop: '4px' }}
                      >
                        Go to page →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Per-service cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
        {[...results]
          .sort((a, b) => (GRADE_GPA[a.grade] ?? 99) - (GRADE_GPA[b.grade] ?? 99))
          .map((r) => (
            <ServiceCard key={r.service_id} result={r} onRescan={onRescanService} isLoading={isLoading} />
          ))}
      </div>
    </div>
  );
}
