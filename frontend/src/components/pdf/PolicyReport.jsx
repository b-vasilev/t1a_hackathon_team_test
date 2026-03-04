import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import './fonts';

const DARK_BG = '#0a0a0f';
const SURFACE = '#12121a';
const BORDER = 'rgba(102, 102, 128, 0.2)';
const ACCENT = '#22d3ee';
const TEXT_WHITE = '#e4e4e7';
const TEXT_MUTED = '#71717a';
const RED = '#ef4444';
const YELLOW = '#eab308';
const GREEN = '#22c55e';

function getGradeColor(grade) {
  if (!grade || grade === 'N/A') {
    return TEXT_MUTED;
  }
  const letter = grade[0];
  if (letter === 'A') {
    return '#22c55e';
  }
  if (letter === 'B') {
    return '#86efac';
  }
  if (letter === 'C') {
    return '#eab308';
  }
  if (letter === 'D') {
    return '#f97316';
  }
  return '#ef4444';
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: DARK_BG,
    paddingHorizontal: 40,
    paddingVertical: 36,
    fontFamily: 'IBM Plex Sans',
    color: TEXT_WHITE,
  },
  policyPage: {
    backgroundColor: DARK_BG,
    paddingHorizontal: 40,
    paddingTop: 36,
    paddingBottom: 56,
    fontFamily: 'IBM Plex Sans',
    color: TEXT_WHITE,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerBrand: {
    fontFamily: 'JetBrains Mono',
    fontSize: 11,
    color: ACCENT,
    letterSpacing: 3,
  },
  headerDate: {
    fontFamily: 'JetBrains Mono',
    fontSize: 8,
    color: TEXT_MUTED,
  },
  headerLine: {
    height: 1,
    backgroundColor: ACCENT,
    marginBottom: 24,
    opacity: 0.4,
  },
  gradeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  gaugeContainer: {
    width: 80,
    height: 80,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeLabel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeLetter: {
    fontFamily: 'JetBrains Mono',
    fontSize: 22,
    fontWeight: 600,
  },
  serviceName: {
    fontFamily: 'DM Serif Display',
    fontSize: 22,
    color: TEXT_WHITE,
    marginBottom: 2,
  },
  overallGradeText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    color: TEXT_MUTED,
  },
  summary: {
    fontSize: 10,
    color: TEXT_MUTED,
    lineHeight: 1.6,
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    color: TEXT_MUTED,
    letterSpacing: 2,
    marginBottom: 8,
    marginTop: 16,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  categoryCard: {
    width: '48%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryAccentBar: {
    height: 4,
  },
  categoryCardBody: {
    backgroundColor: SURFACE,
    padding: 14,
    paddingTop: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: BORDER,
    borderStyle: 'solid',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 11,
    fontWeight: 700,
    color: TEXT_WHITE,
  },
  categoryGradeBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'solid',
  },
  categoryGrade: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    fontWeight: 700,
  },
  categoryFinding: {
    fontSize: 9,
    color: TEXT_MUTED,
    lineHeight: 1.6,
    marginTop: 2,
  },
  findingSection: {
    marginBottom: 12,
  },
  findingSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  findingSectionTitle: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    fontWeight: 600,
  },
  findingItem: {
    marginBottom: 6,
    paddingLeft: 14,
  },
  findingTitle: {
    fontSize: 9,
    fontWeight: 600,
    color: TEXT_WHITE,
    marginBottom: 1,
  },
  findingDescription: {
    fontSize: 8,
    color: TEXT_MUTED,
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    borderTopStyle: 'solid',
    paddingTop: 8,
  },
  footerText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 7,
    color: TEXT_MUTED,
  },
  policyHeader: {
    backgroundColor: SURFACE,
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: 'solid',
  },
  policyHeaderTitle: {
    fontFamily: 'DM Serif Display',
    fontSize: 14,
    color: TEXT_WHITE,
    marginBottom: 4,
  },
  policyHeaderUrl: {
    fontFamily: 'JetBrains Mono',
    fontSize: 7,
    color: ACCENT,
  },
  policyHeading: {
    fontFamily: 'DM Serif Display',
    fontSize: 14,
    color: TEXT_WHITE,
    marginTop: 14,
    marginBottom: 6,
  },
  policyParagraph: {
    fontSize: 9,
    color: TEXT_MUTED,
    lineHeight: 1.6,
    marginBottom: 8,
  },
  policyListItem: {
    flexDirection: 'row',
    fontSize: 9,
    color: TEXT_MUTED,
    lineHeight: 1.6,
    marginBottom: 4,
    paddingLeft: 8,
  },
  policyBullet: {
    width: 12,
    fontSize: 9,
    color: TEXT_MUTED,
  },
  policyListText: {
    flex: 1,
    fontSize: 9,
    color: TEXT_MUTED,
    lineHeight: 1.6,
  },
  truncatedNotice: {
    marginTop: 16,
    padding: 10,
    backgroundColor: SURFACE,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: 'solid',
  },
  truncatedText: {
    fontSize: 8,
    color: TEXT_MUTED,
    fontStyle: 'italic',
  },
  fixedFooter: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

function GradeGauge({ grade }) {
  const color = getGradeColor(grade);
  return (
    <View style={{
      width: 64,
      height: 64,
      borderRadius: 8,
      backgroundColor: SURFACE,
      borderWidth: 3,
      borderColor: color,
      borderStyle: 'solid',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Text style={{
        fontFamily: 'JetBrains Mono',
        fontSize: 24,
        fontWeight: 600,
        color: color,
      }}>
        {grade || 'N/A'}
      </Text>
    </View>
  );
}

function FindingDot({ color }) {
  return (
    <View style={{
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: color,
    }} />
  );
}

function getItemText(item) {
  if (typeof item === 'object' && item !== null) {
    return item.text || item.title || '';
  }
  return String(item);
}

function getItemDescription(item) {
  if (typeof item === 'object' && item !== null) {
    return item.quote || '';
  }
  return '';
}

function FindingsSection({ title, items, color, maxItems = 5 }) {
  if (!items || items.length === 0) {
    return null;
  }
  const displayed = items.slice(0, maxItems);

  return (
    <View style={styles.findingSection} wrap={false}>
      <View style={styles.findingSectionHeader}>
        <FindingDot color={color} />
        <Text style={[styles.findingSectionTitle, { color }]}>{title}</Text>
        <Text style={{ fontSize: 8, color: TEXT_MUTED, fontFamily: 'JetBrains Mono' }}>
          ({items.length})
        </Text>
      </View>
      {displayed.map((item, i) => (
        <View key={i} style={styles.findingItem}>
          <Text style={styles.findingTitle}>{getItemText(item)}</Text>
          {getItemDescription(item) ? (
            <Text style={styles.findingDescription}>{getItemDescription(item)}</Text>
          ) : null}
        </View>
      ))}
      {items.length > maxItems && (
        <Text style={{ fontSize: 7, color: TEXT_MUTED, paddingLeft: 14, fontStyle: 'italic' }}>
          +{items.length - maxItems} more
        </Text>
      )}
    </View>
  );
}

function getItemQuote(item) {
  if (typeof item === 'object' && item !== null) {
    return item.quote || '';
  }
  return '';
}

function highlightFindings(text, findings) {
  if (!findings || findings.length === 0) {
    return [{ text, type: null }];
  }

  const lowerText = text.toLowerCase();
  const matches = [];

  for (const { items, type } of findings) {
    for (const item of items) {
      const quote = getItemQuote(item);
      if (quote) {
        const lowerQuote = quote.toLowerCase();
        let idx = lowerText.indexOf(lowerQuote);
        while (idx !== -1) {
          matches.push({ start: idx, end: idx + lowerQuote.length, type });
          idx = lowerText.indexOf(lowerQuote, idx + 1);
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

function highlightBgColor(type) {
  if (type === 'red_flag') {
    return 'rgba(239, 68, 68, 0.25)';
  }
  if (type === 'warning') {
    return 'rgba(234, 179, 8, 0.25)';
  }
  if (type === 'positive') {
    return 'rgba(34, 197, 94, 0.25)';
  }
  return 'transparent';
}

function parsePolicyText(text, findings) {
  if (!text) {
    return [];
  }
  const lines = text.split('\n');
  const elements = [];
  let paragraphLines = [];

  function flushParagraph() {
    if (paragraphLines.length > 0) {
      const joined = paragraphLines.join(' ').trim();
      if (joined) {
        elements.push({ type: 'paragraph', segments: highlightFindings(joined, findings) });
      }
      paragraphLines = [];
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^[=-]{3,}\s*$/.test(line)) {
      continue;
    }
    if (line.startsWith('## ')) {
      flushParagraph();
      elements.push({ type: 'heading', text: line.slice(3).trim() });
    } else if (line.startsWith('- ')) {
      flushParagraph();
      elements.push({ type: 'list', segments: highlightFindings(line.slice(2).trim(), findings) });
    } else if (line.trim() === '') {
      flushParagraph();
    } else {
      paragraphLines.push(line);
    }
  }
  flushParagraph();

  return elements;
}

function PolicyTextContent({ policyText, serviceName }) {
  const findings = [
    { items: policyText?.red_flags || [], type: 'red_flag' },
    { items: policyText?.warnings || [], type: 'warning' },
    { items: policyText?.positives || [], type: 'positive' },
  ];
  const elements = parsePolicyText(policyText?.content, findings);

  return (
    <>
      <View style={styles.policyHeader} wrap={false}>
        <Text style={styles.policyHeaderTitle}>
          Privacy Policy — {serviceName}
        </Text>
        {policyText?.source_url && (
          <Text style={styles.policyHeaderUrl}>{policyText.source_url}</Text>
        )}
      </View>

      {elements.map((el, i) => {
        if (el.type === 'heading') {
          return (
            <Text key={i} style={styles.policyHeading}>
              {el.text}
            </Text>
          );
        }
        if (el.type === 'list') {
          return (
            <View key={i} style={styles.policyListItem}>
              <Text style={styles.policyBullet}>{'\u2022'}</Text>
              <Text style={styles.policyListText}>
                {el.segments.map((seg, j) => (
                  <Text
                    key={j}
                    style={seg.type ? { backgroundColor: highlightBgColor(seg.type), color: '#e4e4e7' } : undefined}
                  >
                    {seg.text}
                  </Text>
                ))}
              </Text>
            </View>
          );
        }
        return (
          <Text key={i} style={styles.policyParagraph}>
            {el.segments.map((seg, j) => (
              <Text
                key={j}
                style={seg.type ? { backgroundColor: highlightBgColor(seg.type), color: '#e4e4e7' } : undefined}
              >
                {seg.text}
              </Text>
            ))}
          </Text>
        );
      })}

      {policyText?.was_truncated && (
        <View style={styles.truncatedNotice}>
          <Text style={styles.truncatedText}>
            This policy text was truncated due to length. Some sections may be
            missing from this report.
          </Text>
        </View>
      )}
    </>
  );
}

function formatDate(dateStr) {
  if (!dateStr) {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function truncateText(text, maxLen = 120) {
  if (!text || text.length <= maxLen) {
    return text;
  }
  return `${text.slice(0, maxLen)}...`;
}

export default function PolicyReport({ result, policyText }) {
  const date = formatDate(result?.analyzed_at);

  return (
    <Document>
      {/* Page 1: Analysis Report */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerBrand}>PRIVACYLENS</Text>
          <Text style={styles.headerDate}>{date}</Text>
        </View>
        <View style={styles.headerLine} />

        {/* Grade + Service Name */}
        <View style={styles.gradeSection}>
          <GradeGauge grade={result?.grade} />
          <View>
            <Text style={styles.serviceName}>
              {result?.name || 'Unknown Service'}
            </Text>
            <Text style={styles.overallGradeText}>
              Overall Grade: {result?.grade || 'N/A'}
            </Text>
          </View>
        </View>

        {/* Summary */}
        {result?.summary && <Text style={styles.summary}>{result.summary}</Text>}

        {/* Categories */}
        {result?.categories && Object.keys(result.categories).length > 0 && (
          <>
            <Text style={styles.sectionTitle}>CATEGORIES</Text>
            <View style={styles.categoryGrid}>
              {Object.entries(result.categories).map(([key, cat]) => {
                const gradeColor = getGradeColor(cat.grade);
                return (
                  <View key={key} style={styles.categoryCard} wrap={false}>
                    <View style={[styles.categoryAccentBar, { backgroundColor: gradeColor }]} />
                    <View style={styles.categoryCardBody}>
                      <View style={styles.categoryHeader}>
                        <Text style={styles.categoryName}>
                          {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </Text>
                        <View style={[styles.categoryGradeBadge, { backgroundColor: `${gradeColor}18`, borderColor: gradeColor }]}>
                          <Text style={[styles.categoryGrade, { color: gradeColor }]}>
                            {cat.grade}
                          </Text>
                        </View>
                      </View>
                      {cat.finding && (
                        <Text style={styles.categoryFinding}>
                          {truncateText(cat.finding)}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Findings */}
        <Text style={styles.sectionTitle}>FINDINGS</Text>
        <FindingsSection
          title="Red Flags"
          items={result?.red_flags}
          color={RED}
        />
        <FindingsSection
          title="Warnings"
          items={result?.warnings}
          color={YELLOW}
        />
        <FindingsSection
          title="Positives"
          items={result?.positives}
          color={GREEN}
        />

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Generated by PrivacyLens {'\u00B7'} {date}
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>

      {/* Page 2+: Policy Text */}
      {policyText?.content && (
        <Page size="A4" style={styles.policyPage}>
          <PolicyTextContent
            policyText={policyText}
            serviceName={result?.name || 'Unknown Service'}
          />

          {/* Fixed footer on policy pages */}
          <View style={styles.fixedFooter} fixed>
            <Text style={styles.footerText}>PrivacyLens Report</Text>
            <Text
              style={styles.footerText}
              render={({ pageNumber, totalPages }) =>
                `${pageNumber} / ${totalPages}`
              }
            />
          </View>
        </Page>
      )}
    </Document>
  );
}
