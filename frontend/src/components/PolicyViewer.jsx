'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';

function getItemText(item) {
  if (typeof item === 'object' && item !== null) {
    return item.text || '';
  }
  return String(item);
}

function getItemQuote(item) {
  if (typeof item === 'object' && item !== null) {
    return item.quote || '';
  }
  return '';
}

function normalizeWhitespace(s) {
  return s.replace(/\s+/g, ' ').trim();
}

// Length-preserving: only 1-to-1 char replacements, safe for index mapping
function normalizeChars(s) {
  return s
    .replace(/[\u2018\u2019\u201A\u2039\u203A']/g, "'")
    .replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"')
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, '-');
}

// Full normalization: also fixes spacing around punctuation (changes length, NOT safe for index mapping)
function normalizeForCompare(s) {
  return normalizeChars(s)
    .replace(/\s+([,;:.!?])/g, '$1')
    .replace(/([,;:.!?])\s{2,}/g, '$1 ');
}

const MAX_HIGHLIGHT_LEN = 200;

function capToWordBoundary(text, start, end) {
  const capped = Math.min(end, start + MAX_HIGHLIGHT_LEN);
  if (capped >= end) {
    return end;
  }
  // Walk back to last space to avoid cutting mid-word
  let pos = capped;
  while (pos > start + MAX_HIGHLIGHT_LEN - 30 && pos > start && text[pos] !== ' ') {
    pos--;
  }
  return pos > start ? pos : capped;
}

function quoteToRegex(quote) {
  // Split into word-like tokens, stripping surrounding punctuation
  const tokens = normalizeWhitespace(quote).split(/\s+/).map(w => w.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '')).filter(Boolean);
  const pattern = tokens.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\s,;:.!?\'"()\\[\\]/]{0,5}\\s?');
  return new RegExp(pattern, 'i');
}

function fuzzyMatchQuote(lowerText, _normalizedText, quote, type) {
  const lowerQuote = normalizeForCompare(quote.toLowerCase());

  // 1. Try regex match on original text (tolerates punctuation spacing differences)
  const charNormText = normalizeChars(lowerText);
  const re = quoteToRegex(lowerQuote);
  const m1 = re.exec(charNormText);
  if (m1) {
    const end = capToWordBoundary(lowerText, m1.index, m1.index + m1[0].length);
    return [{ start: m1.index, end, type }];
  }

  // 2. Key-phrase fallback: use longest subsequences of significant words
  const normQuote = normalizeWhitespace(lowerQuote);
  const words = normQuote.split(/\s+/).filter(w => w.length > 3);
  if (words.length >= 2) {
    for (let len = Math.min(words.length, 8); len >= 4; len--) {
      for (let start = 0; start <= words.length - len; start++) {
        const pattern = words.slice(start, start + len)
          .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('\\s+');
        const fallbackRe = new RegExp(pattern, 'i');
        const m2 = fallbackRe.exec(charNormText);
        if (m2) {
          const end = capToWordBoundary(lowerText, m2.index, m2.index + m2[0].length);
          return [{ start: m2.index, end, type }];
        }
      }
    }
  }

  return [];
}

function highlightFindings(text, findings, matchedSet) {
  if (!findings || findings.length === 0) {
    return [{ text, type: null }];
  }

  const lowerText = text.toLowerCase();
  const normalizedText = normalizeWhitespace(lowerText);
  const matches = [];

  for (const { items, type } of findings) {
    for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
      const key = `${type}:${itemIdx}`;
      if (matchedSet && matchedSet.has(key)) {
        continue;
      }
      const item = items[itemIdx];
      const quote = getItemQuote(item);
      if (quote) {
        const found = fuzzyMatchQuote(lowerText, normalizedText, quote, type);
        if (found.length > 0 && matchedSet) {
          matchedSet.add(key);
        }
        matches.push(...found);
      } else {
        // Fuzzy fallback for old-format findings (plain strings)
        const itemText = getItemText(item);
        const words = itemText.split(/\s+/).filter(w => w.length > 3);
        let matched = false;
        for (let len = Math.min(words.length, 5); len >= 2; len--) {
          for (let start = 0; start <= words.length - len; start++) {
            const phrase = words.slice(start, start + len).join(' ').toLowerCase();
            const idx = lowerText.indexOf(phrase);
            if (idx !== -1) {
              matches.push({ start: idx, end: idx + phrase.length, type });
              matched = true;
              break;
            }
          }
          if (matched) {
            break;
          }
        }
        if (matched && matchedSet) {
          matchedSet.add(key);
        }
      }
    }
  }

  if (matches.length === 0) {
    return [{ text, type: null }];
  }

  matches.sort((a, b) => a.start - b.start);
  const merged = [matches[0]];
  for (let i = 1; i < matches.length; i++) {
    const last = merged[merged.length - 1];
    if (matches[i].start <= last.end) {
      last.end = Math.max(last.end, matches[i].end);
      if (matches[i].type === 'red_flag') {
        last.type = 'red_flag';
      } else if (matches[i].type === 'warning' && last.type !== 'red_flag') {
        last.type = 'warning';
      }
    } else {
      merged.push({ ...matches[i] });
    }
  }

  const segments = [];
  let pos = 0;
  for (const m of merged) {
    if (m.start > pos) {
      segments.push({ text: text.slice(pos, m.start), type: null });
    }
    segments.push({ text: text.slice(m.start, m.end), type: m.type });
    pos = m.end;
  }
  if (pos < text.length) {
    segments.push({ text: text.slice(pos), type: null });
  }

  return segments;
}

function highlightClass(type) {
  if (type === 'red_flag') {
    return 'highlight-red';
  }
  if (type === 'warning') {
    return 'highlight-yellow';
  }
  if (type === 'positive') {
    return 'highlight-green';
  }
  return '';
}

function getGradeColor(grade) {
  const letter = grade?.[0];
  if (letter === 'A') { return 'var(--pl-grade-a)'; }
  if (letter === 'B') { return 'var(--pl-grade-b)'; }
  if (letter === 'C') { return 'var(--pl-grade-c)'; }
  if (letter === 'D') { return 'var(--pl-grade-d)'; }
  return 'var(--pl-grade-f)';
}

export default function PolicyViewer({ serviceId, serviceName, grade, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const [activeType, setActiveType] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const contentRef = useRef(null);
  const sectionRefs = useRef({});

  useEffect(() => {
    if (!serviceId) {
      setError('No service selected');
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/services/${serviceId}/policy-text`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || 'Failed to load policy text');
        }
        const json = await res.json();
        if (!cancelled) {
          setData(json);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [serviceId]);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const scrollToSection = useCallback((heading) => {
    const el = sectionRefs.current[heading];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(heading);
    }
  }, []);

  const getHighlights = useCallback((type) => {
    if (!contentRef.current) {
      return [];
    }
    const className = highlightClass(type);
    return Array.from(contentRef.current.querySelectorAll(`mark.${className}`));
  }, []);

  const jumpToHighlight = useCallback((type, index) => {
    const marks = getHighlights(type);
    if (marks.length === 0) {
      return;
    }
    const prev = contentRef.current?.querySelector('mark.highlight-active');
    if (prev) {
      prev.classList.remove('highlight-active');
    }
    const idx = ((index % marks.length) + marks.length) % marks.length;
    const el = marks[idx];
    el.classList.add('highlight-active');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setActiveType(type);
    setActiveIndex(idx);
  }, [getHighlights]);

  const handleTypeClick = useCallback((type) => {
    if (activeType === type) {
      jumpToHighlight(type, activeIndex + 1);
    } else {
      jumpToHighlight(type, 0);
    }
  }, [activeType, activeIndex, jumpToHighlight]);

  const handlePrev = useCallback(() => {
    if (!activeType) {
      return;
    }
    jumpToHighlight(activeType, activeIndex - 1);
  }, [activeType, activeIndex, jumpToHighlight]);

  const handleNext = useCallback(() => {
    if (!activeType) {
      return;
    }
    jumpToHighlight(activeType, activeIndex + 1);
  }, [activeType, activeIndex, jumpToHighlight]);

  useEffect(() => {
    function handleKey(e) {
      if (!activeType) {
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        jumpToHighlight(activeType, activeIndex + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        jumpToHighlight(activeType, activeIndex - 1);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [activeType, activeIndex, jumpToHighlight]);

  const findings = useMemo(() => {
    if (!data) {
      return [];
    }
    return [
      { items: data.red_flags || [], type: 'red_flag' },
      { items: data.warnings || [], type: 'warning' },
      { items: data.positives || [], type: 'positive' },
    ];
  }, [data]);

  const { renderedContent, highlightCounts } = useMemo(() => {
    if (!data?.content) {
      return { renderedContent: null, highlightCounts: {} };
    }

    const lines = data.content.split('\n');
    const elements = [];
    const counts = { red_flag: 0, warning: 0, positive: 0 };
    const matchedSet = new Set();
    let currentParagraph = [];

    function countSegments(segments) {
      for (const seg of segments) {
        if (seg.type) {
          counts[seg.type]++;
        }
      }
    }

    function flushParagraph() {
      if (currentParagraph.length > 0) {
        const text = currentParagraph.join(' ').trim();
        if (text) {
          const segments = highlightFindings(text, findings, matchedSet);
          countSegments(segments);
          elements.push(
            <p key={`p-${elements.length}`} className="policy-text-paragraph">
              {segments.map((seg, i) => (
                seg.type
                  ? <mark key={i} className={highlightClass(seg.type)}>{seg.text}</mark>
                  : <span key={i}>{seg.text}</span>
              ))}
            </p>
          );
        }
        currentParagraph = [];
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^[=\-]{3,}\s*$/.test(line)) {
        continue;
      }
      if (line.startsWith('## ')) {
        flushParagraph();
        const heading = line.slice(3).trim();
        elements.push(
          <h3
            key={`h-${i}`}
            ref={(el) => { sectionRefs.current[heading] = el; }}
            className="policy-text-heading"
          >
            {heading}
          </h3>
        );
      } else if (line.startsWith('- ')) {
        flushParagraph();
        const text = line.slice(2).trim();
        const segments = highlightFindings(text, findings, matchedSet);
        countSegments(segments);
        elements.push(
          <li key={`li-${i}`} className="policy-text-list-item">
            {segments.map((seg, j) => (
              seg.type
                ? <mark key={j} className={highlightClass(seg.type)}>{seg.text}</mark>
                : <span key={j}>{seg.text}</span>
            ))}
          </li>
        );
      } else if (line.trim() === '') {
        flushParagraph();
      } else {
        currentParagraph.push(line);
      }
    }
    flushParagraph();

    return { renderedContent: elements, highlightCounts: counts };
  }, [data, findings]);

  const gradeColor = getGradeColor(grade);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleNavMouseEnter = (e) => {
    e.currentTarget.style.color = 'var(--pl-accent)';
  };

  return createPortal(
    <div className="policy-viewer-backdrop" onClick={handleBackdropClick}>
      <div className="policy-viewer-modal">
        {/* Header */}
        <div className="policy-viewer-header">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <h2 className="text-lg font-bold truncate" style={{ color: 'var(--pl-text)' }}>
              {serviceName}
            </h2>
            <span
              className="shrink-0 text-xs font-mono font-semibold px-2 py-0.5 rounded"
              style={{ color: gradeColor, background: `color-mix(in srgb, ${gradeColor} 15%, transparent)` }}
            >
              {grade}
            </span>
            {data?.source_url && (
              <a
                href={data.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs shrink-0 hover:underline"
                style={{ color: 'var(--pl-accent)', fontFamily: 'var(--font-mono)' }}
              >
                Original &rarr;
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            className="policy-viewer-close"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {data?.was_truncated && (
          <div className="px-5 py-2 text-xs" style={{ color: 'var(--pl-text-muted)', borderBottom: '1px solid var(--pl-border)' }}>
            This policy text was truncated due to length. Some sections may be missing.
          </div>
        )}

        {data && (
          <div className="flex items-center gap-1 px-5 py-2 text-xs flex-wrap" style={{ borderBottom: '1px solid var(--pl-border)' }}>
            {[
              { type: 'red_flag', items: data.red_flags, label: 'Red flags', cls: 'highlight-red' },
              { type: 'warning', items: data.warnings, label: 'Warnings', cls: 'highlight-yellow' },
              { type: 'positive', items: data.positives, label: 'Positives', cls: 'highlight-green' },
            ].filter(f => f.items?.length > 0).map(({ type, items, label, cls }) => {
              const matched = highlightCounts[type] || 0;
              const unmatched = items.length - matched;
              return (
                <button
                  key={type}
                  onClick={() => handleTypeClick(type)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all cursor-pointer"
                  style={{
                    color: activeType === type ? 'var(--pl-text)' : 'var(--pl-text-muted)',
                    background: activeType === type ? 'rgba(255,255,255,0.08)' : 'transparent',
                    border: activeType === type ? '1px solid var(--pl-border)' : '1px solid transparent',
                  }}
                  title={unmatched > 0
                    ? `${matched} of ${items.length} ${label.toLowerCase()} found in text`
                    : `Jump through ${label.toLowerCase()}`}
                >
                  <span className={`w-3 h-3 rounded-sm inline-block ${cls}`} />
                  <span>{label}</span>
                  <span style={{ color: 'var(--pl-text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {unmatched > 0
                      ? <span title={`${unmatched} not highlighted — quote not found in text`}>
                          ({matched}/{items.length} highlighted)
                        </span>
                      : `(${items.length})`
                    }
                  </span>
                </button>
              );
            })}

            {activeType && (
              <div className="flex items-center gap-1 ml-2 pl-2" style={{ borderLeft: '1px solid var(--pl-border)' }}>
                <span className="text-xs tabular-nums" style={{ color: 'var(--pl-text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {activeIndex + 1}/{getHighlights(activeType).length}
                </span>
                <button
                  onClick={handlePrev}
                  className="p-0.5 rounded hover:bg-white/10 transition-colors"
                  style={{ color: 'var(--pl-text-muted)' }}
                  aria-label="Previous finding"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                </button>
                <button
                  onClick={handleNext}
                  className="p-0.5 rounded hover:bg-white/10 transition-colors"
                  style={{ color: 'var(--pl-text-muted)' }}
                  aria-label="Next finding"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}

        <div className="policy-viewer-body">
          {data?.sections?.length > 0 && (
            <nav className="policy-viewer-nav">
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--pl-text-muted)', fontFamily: 'var(--font-mono)' }}>
                SECTIONS
              </p>
              <ul className="space-y-0.5">
                {data.sections.map((s, i) => (
                  <li key={i}>
                    <button
                      onClick={() => scrollToSection(s.heading)}
                      className="text-xs text-left w-full px-2 py-1 rounded transition-colors truncate"
                      style={{
                        color: activeSection === s.heading ? 'var(--pl-accent)' : 'var(--pl-text-muted)',
                        background: activeSection === s.heading ? 'rgba(0, 229, 255, 0.08)' : 'transparent',
                      }}
                      onMouseEnter={handleNavMouseEnter}
                      onMouseLeave={(e) => {
                        if (activeSection !== s.heading) {
                          e.currentTarget.style.color = 'var(--pl-text-muted)';
                        }
                      }}
                    >
                      {s.heading}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div ref={contentRef} className="policy-viewer-content">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="xray-spinner" />
                <span className="ml-3 text-sm" style={{ color: 'var(--pl-text-muted)' }}>Loading policy text...</span>
              </div>
            )}
            {error && (
              <div className="py-12 text-center">
                <p className="text-sm" style={{ color: 'var(--pl-grade-f)' }}>{error}</p>
              </div>
            )}
            {data && !renderedContent && !loading && !error && (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="py-3 px-5 text-center" style={{ borderBottom: '1px solid var(--pl-border)' }}>
                  <p className="text-xs" style={{ color: 'var(--pl-text-muted)' }}>
                    This service blocked automated text extraction — showing the original policy page below.
                  </p>
                </div>
                {data.source_url ? (
                  <iframe
                    src={data.source_url}
                    title={`${serviceName} Privacy Policy`}
                    className="flex-1 w-full border-0"
                    style={{ minHeight: '60vh', background: '#fff' }}
                    sandbox="allow-scripts allow-same-origin allow-popups"
                  />
                ) : (
                  <div className="py-12 text-center px-6">
                    <p className="text-sm" style={{ color: 'var(--pl-text-muted)' }}>
                      No policy URL available for this service.
                    </p>
                  </div>
                )}
              </div>
            )}
            {data && renderedContent}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
