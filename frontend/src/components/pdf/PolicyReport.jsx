import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import './fonts';
import {
  DARK_BG,
  SURFACE,
  BORDER,
  ACCENT,
  TEXT_WHITE,
  TEXT_MUTED,
  RED,
  YELLOW,
  GREEN,
  getGradeColor,
  truncateText,
  formatDate,
  GradeGauge,
  FindingDot,
  FindingsSection,
  sharedStyles,
} from './sharedStyles';

const styles = StyleSheet.create({
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
  },
});

function getItemQuote(item) {
  if (typeof item === 'object' && item !== null) {
    return item.quote || '';
  }
  return '';
}

export function highlightFindings(text, findings) {
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

export function highlightBgColor(type) {
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

export function parsePolicyText(text, findings) {
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

export default function PolicyReport({ result, policyText }) {
  const date = formatDate(result?.analyzed_at);

  return (
    <Document>
      {/* Page 1: Analysis Report */}
      <Page size="A4" style={sharedStyles.page}>
        {/* Header */}
        <View style={sharedStyles.header}>
          <Text style={sharedStyles.headerBrand}>PRIVACYLENS</Text>
          <Text style={sharedStyles.headerDate}>{date}</Text>
        </View>
        <View style={sharedStyles.headerLine} />

        {/* Grade + Service Name */}
        <View style={sharedStyles.gradeSection}>
          <GradeGauge grade={result?.grade} />
          <View>
            <Text style={sharedStyles.serviceName}>
              {result?.name || 'Unknown Service'}
            </Text>
            <Text style={sharedStyles.overallGradeText}>
              Overall Grade: {result?.grade || 'N/A'}
            </Text>
          </View>
        </View>

        {/* Summary */}
        {result?.summary && <Text style={sharedStyles.summary}>{result.summary}</Text>}

        {/* Categories */}
        {result?.categories && Object.keys(result.categories).length > 0 && (
          <>
            <Text style={sharedStyles.sectionTitle}>CATEGORIES</Text>
            <View style={sharedStyles.categoryGrid}>
              {Object.entries(result.categories).map(([key, cat]) => {
                const gradeColor = getGradeColor(cat.grade);
                return (
                  <View key={key} style={sharedStyles.categoryCard} wrap={false}>
                    <View style={[sharedStyles.categoryAccentBar, { backgroundColor: gradeColor }]} />
                    <View style={sharedStyles.categoryCardBody}>
                      <View style={sharedStyles.categoryHeader}>
                        <Text style={sharedStyles.categoryName}>
                          {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </Text>
                        <View style={[sharedStyles.categoryGradeBadge, { backgroundColor: `${gradeColor}18`, borderColor: gradeColor }]}>
                          <Text style={[sharedStyles.categoryGrade, { color: gradeColor }]}>
                            {cat.grade}
                          </Text>
                        </View>
                      </View>
                      {cat.finding && (
                        <Text style={sharedStyles.categoryFinding}>
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
        <Text style={sharedStyles.sectionTitle}>FINDINGS</Text>
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
        <View style={sharedStyles.footer} fixed>
          <Text style={sharedStyles.footerText}>
            Generated by PrivacyLens {'\u00B7'} {date}
          </Text>
          <Text
            style={sharedStyles.footerText}
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>

      {/* Page 2+: Policy Text */}
      {policyText?.content && (
        <Page size="A4" style={sharedStyles.policyPage}>
          <PolicyTextContent
            policyText={policyText}
            serviceName={result?.name || 'Unknown Service'}
          />

          {/* Fixed footer on policy pages */}
          <View style={sharedStyles.fixedFooter} fixed>
            <Text style={sharedStyles.footerText}>PrivacyLens Report</Text>
            <Text
              style={sharedStyles.footerText}
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
