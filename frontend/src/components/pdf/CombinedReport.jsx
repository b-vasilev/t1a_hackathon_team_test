import {
  Document,
  Page,
  View,
  Text,
  Link,
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
import { parsePolicyText, highlightBgColor } from './PolicyReport';

// ── Grade Averaging Logic ──────────────────────────────────────────

const GRADE_TO_NUMBER = {
  'A+': 4.3, A: 4, 'A-': 3.7,
  'B+': 3.3, B: 3, 'B-': 2.7,
  'C+': 2.3, C: 2, 'C-': 1.7,
  'D+': 1.3, D: 1, 'D-': 0.7,
  F: 0,
};

function gradeToNumber(grade) {
  if (!grade || grade === 'N/A') {
    return null;
  }
  return GRADE_TO_NUMBER[grade] ?? null;
}

function numberToGrade(num) {
  if (num >= 3.7) {
    return 'A';
  }
  if (num >= 2.7) {
    return 'B';
  }
  if (num >= 1.7) {
    return 'C';
  }
  if (num >= 0.7) {
    return 'D';
  }
  return 'F';
}

function averageGrade(grades) {
  const nums = grades.map(gradeToNumber).filter((n) => n !== null);
  if (nums.length === 0) {
    return 'N/A';
  }
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  return numberToGrade(avg);
}

// ── Category Labels ────────────────────────────────────────────────

const CATEGORY_KEYS = [
  'data_collection',
  'data_sharing',
  'data_retention',
  'tracking',
  'user_rights',
];

const CATEGORY_LABELS = {
  data_collection: 'Data Collection',
  data_sharing: 'Data Sharing',
  data_retention: 'Data Retention',
  tracking: 'Tracking',
  user_rights: 'User Rights',
};

// ── Local Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  coverTitle: {
    fontFamily: 'DM Serif Display',
    fontSize: 26,
    color: TEXT_WHITE,
    marginBottom: 4,
    textAlign: 'center',
  },
  coverSubtitle: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginBottom: 24,
  },
  gradeCenter: {
    alignItems: 'center',
    marginBottom: 20,
  },
  gradeCenterLabel: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    color: TEXT_MUTED,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statNumber: {
    fontFamily: 'JetBrains Mono',
    fontSize: 14,
    fontWeight: 600,
    color: TEXT_WHITE,
  },
  statLabel: {
    fontSize: 8,
    color: TEXT_MUTED,
  },
  calloutRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  calloutBox: {
    backgroundColor: SURFACE,
    borderRadius: 8,
    padding: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: 'solid',
    alignItems: 'center',
    width: '45%',
  },
  calloutLabel: {
    fontFamily: 'JetBrains Mono',
    fontSize: 7,
    color: TEXT_MUTED,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  calloutName: {
    fontSize: 11,
    fontWeight: 600,
    color: TEXT_WHITE,
    marginBottom: 2,
  },
  calloutGrade: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    fontWeight: 600,
  },
  tocTitle: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    color: TEXT_MUTED,
    letterSpacing: 3,
    marginBottom: 20,
  },
  tocEntry: {
    marginBottom: 18,
  },
  tocMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tocNumber: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    color: 'rgba(113, 113, 122, 0.5)',
    width: 28,
  },
  tocServiceName: {
    fontFamily: 'DM Serif Display',
    fontSize: 13,
    color: TEXT_WHITE,
    textDecoration: 'none',
  },
  tocDots: {
    flex: 1,
    fontFamily: 'JetBrains Mono',
    fontSize: 6,
    color: 'rgba(255, 255, 255, 0.25)',
    letterSpacing: 2,
    marginHorizontal: 8,
    overflow: 'hidden',
    maxLines: 1,
  },
  tocGradeInline: {
    fontFamily: 'JetBrains Mono',
    fontSize: 11,
    fontWeight: 600,
    minWidth: 20,
    textAlign: 'right',
  },
  tocSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    paddingLeft: 28,
    gap: 4,
  },
  tocFindingText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 7,
    color: TEXT_MUTED,
  },
  tocSeparatorDot: {
    fontFamily: 'JetBrains Mono',
    fontSize: 6,
    color: 'rgba(113, 113, 122, 0.3)',
    marginHorizontal: 6,
  },
  tocPolicyLink: {
    fontFamily: 'JetBrains Mono',
    fontSize: 7,
    color: 'rgba(34, 211, 238, 0.4)',
    textDecoration: 'none',
    marginLeft: 6,
  },
  // Comparison table
  compTable: {
    marginTop: 8,
  },
  compHeaderRow: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: 'solid',
  },
  compRow: {
    flexDirection: 'row',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
    borderStyle: 'solid',
  },
  compRowLast: {
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    overflow: 'hidden',
  },
  compRowEven: {
    backgroundColor: 'rgba(18, 18, 26, 0.5)',
  },
  compCellName: {
    width: '25%',
    paddingVertical: 8,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  compCellGrade: {
    width: '15%',
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compHeaderText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 7,
    color: TEXT_MUTED,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  compNameText: {
    fontSize: 9,
    fontWeight: 600,
    color: TEXT_WHITE,
  },
  compGradeText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    fontWeight: 600,
  },
  // Detail page
  backLink: {
    fontSize: 7,
    color: ACCENT,
    textDecoration: 'none',
    marginRight: 12,
  },
  policyLink: {
    fontSize: 8,
    color: ACCENT,
    textDecoration: 'none',
    marginTop: 8,
  },
  // Appendix
  appendixHeader: {
    fontFamily: 'DM Serif Display',
    fontSize: 16,
    color: TEXT_WHITE,
    marginBottom: 8,
  },
  appendixParagraph: {
    fontSize: 9,
    color: TEXT_MUTED,
    lineHeight: 1.6,
    marginBottom: 8,
  },
  appendixHeading: {
    fontFamily: 'DM Serif Display',
    fontSize: 14,
    color: TEXT_WHITE,
    marginTop: 14,
    marginBottom: 6,
  },
  appendixListItem: {
    flexDirection: 'row',
    fontSize: 9,
    color: TEXT_MUTED,
    lineHeight: 1.6,
    marginBottom: 4,
    paddingLeft: 8,
  },
  appendixBullet: {
    width: 12,
    fontSize: 9,
    color: TEXT_MUTED,
  },
  appendixListText: {
    flex: 1,
    fontSize: 9,
    color: TEXT_MUTED,
    lineHeight: 1.6,
  },
  appendixEmpty: {
    fontSize: 9,
    color: TEXT_MUTED,
    marginTop: 8,
  },
});

// ── Helper sub-components ──────────────────────────────────────────

function PageFooter({ date }) {
  return (
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
  );
}

function safeFindingCount(arr) {
  return Array.isArray(arr) ? arr.length : 0;
}

function getServiceName(result) {
  return result?.service_name || result?.name || 'Unknown Service';
}

function getServiceGrade(result) {
  return result?.overall_grade || result?.grade || 'N/A';
}

function getCategoryGrade(result, catKey) {
  return result?.categories?.[catKey]?.grade || 'N/A';
}

// ── Main Component ─────────────────────────────────────────────────

export default function CombinedReport({ results, policyTexts }) {
  const services = results || [];
  const texts = policyTexts || {};
  const date = formatDate();

  // Compute overall grade across all services
  const allGrades = services.map(getServiceGrade);
  const overallGrade = averageGrade(allGrades);

  // Totals
  const totalRedFlags = services.reduce(
    (sum, r) => sum + safeFindingCount(r.red_flags),
    0,
  );
  const totalWarnings = services.reduce(
    (sum, r) => sum + safeFindingCount(r.warnings),
    0,
  );
  const totalPositives = services.reduce(
    (sum, r) => sum + safeFindingCount(r.positives),
    0,
  );

  // Best & worst performers (by numeric grade, lower = worse)
  const ranked = services
    .map((r) => ({ name: getServiceName(r), grade: getServiceGrade(r), num: gradeToNumber(getServiceGrade(r)) ?? 0 }))
    .sort((a, b) => a.num - b.num);
  const worst = ranked[0] || { name: 'N/A', grade: 'N/A' };
  const best = ranked[ranked.length - 1] || { name: 'N/A', grade: 'N/A' };

  return (
    <Document>
      {/* ── Page 1: Cover / Executive Summary ─────────────────── */}
      <Page size="A4" style={sharedStyles.page}>
        {/* Header */}
        <View style={sharedStyles.header}>
          <Text style={sharedStyles.headerBrand}>PRIVACYLENS</Text>
          <Text style={sharedStyles.headerDate}>{date}</Text>
        </View>
        <View style={sharedStyles.headerLine} />

        {/* Title */}
        <Text style={styles.coverTitle}>Combined Privacy Report</Text>
        <Text style={styles.coverSubtitle}>
          Multi-Service Comparison Analysis
        </Text>

        {/* Overall grade gauge */}
        <View style={styles.gradeCenter}>
          <GradeGauge grade={overallGrade} size={80} />
          <Text style={styles.gradeCenterLabel}>
            Overall Average Grade
          </Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <FindingDot color={ACCENT} />
            <Text style={styles.statNumber}>{services.length}</Text>
            <Text style={styles.statLabel}>Services</Text>
          </View>
          <View style={styles.statItem}>
            <FindingDot color={RED} />
            <Text style={styles.statNumber}>{totalRedFlags}</Text>
            <Text style={styles.statLabel}>Red Flags</Text>
          </View>
          <View style={styles.statItem}>
            <FindingDot color={YELLOW} />
            <Text style={styles.statNumber}>{totalWarnings}</Text>
            <Text style={styles.statLabel}>Warnings</Text>
          </View>
          <View style={styles.statItem}>
            <FindingDot color={GREEN} />
            <Text style={styles.statNumber}>{totalPositives}</Text>
            <Text style={styles.statLabel}>Positives</Text>
          </View>
        </View>

        {/* Best & worst callout */}
        {services.length > 1 && (
          <View style={styles.calloutRow}>
            <View style={styles.calloutBox}>
              <Text style={styles.calloutLabel}>HIGHEST RISK</Text>
              <Text style={styles.calloutName}>{worst.name}</Text>
              <Text style={[styles.calloutGrade, { color: getGradeColor(worst.grade) }]}>
                {worst.grade}
              </Text>
            </View>
            <View style={styles.calloutBox}>
              <Text style={styles.calloutLabel}>LOWEST RISK</Text>
              <Text style={styles.calloutName}>{best.name}</Text>
              <Text style={[styles.calloutGrade, { color: getGradeColor(best.grade) }]}>
                {best.grade}
              </Text>
            </View>
          </View>
        )}

        {/* Category Comparison Matrix */}
        <Text style={sharedStyles.sectionTitle}>CATEGORY COMPARISON</Text>

        <View style={styles.compTable}>
          {/* Header row */}
          <View style={styles.compHeaderRow}>
            <View style={styles.compCellName}>
              <Text style={styles.compHeaderText}>SERVICE</Text>
            </View>
            {CATEGORY_KEYS.map((key) => (
              <View key={key} style={styles.compCellGrade}>
                <Text style={styles.compHeaderText}>
                  {CATEGORY_LABELS[key].toUpperCase()}
                </Text>
              </View>
            ))}
          </View>

          {/* Data rows */}
          {services.map((result, index) => {
            const isLast = index === services.length - 1;
            const isEven = index % 2 === 0;
            return (
              <View
                key={index}
                style={[
                  styles.compRow,
                  isLast && styles.compRowLast,
                  isEven && styles.compRowEven,
                ]}
                wrap={false}
              >
                <View style={styles.compCellName}>
                  <Text style={styles.compNameText}>
                    {getServiceName(result)}
                  </Text>
                </View>
                {CATEGORY_KEYS.map((key) => {
                  const catGrade = getCategoryGrade(result, key);
                  return (
                    <View key={key} style={styles.compCellGrade}>
                      <Text
                        style={[
                          styles.compGradeText,
                          { color: getGradeColor(catGrade) },
                        ]}
                      >
                        {catGrade}
                      </Text>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>

        <PageFooter date={date} />
      </Page>

      {/* ── Page 2: Table of Contents ──────────────────────── */}
      <Page size="A4" style={sharedStyles.page} break>
        <View style={sharedStyles.header}>
          <Text style={sharedStyles.headerBrand}>PRIVACYLENS</Text>
          <Text style={sharedStyles.headerDate}>{date}</Text>
        </View>
        <View style={sharedStyles.headerLine} />

        <View id="toc">
          <Text style={styles.tocTitle}>TABLE OF CONTENTS</Text>
          {services.map((result, index) => {
            const grade = getServiceGrade(result);
            const gradeColor = getGradeColor(grade);
            return (
              <View key={index} style={styles.tocEntry} wrap={false}>
                <View style={styles.tocMainRow}>
                  <Text style={styles.tocNumber}>
                    {String(index + 1).padStart(2, '0')}
                  </Text>
                  <Link src={`#service-${index}`} style={styles.tocServiceName}>
                    {getServiceName(result)}
                  </Link>
                  <Text style={styles.tocDots}>
                    {' \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7'}
                  </Text>
                  <Text style={[styles.tocGradeInline, { color: gradeColor }]}>
                    {grade}
                  </Text>
                </View>
                <View style={styles.tocSubRow}>
                  <Text style={[styles.tocFindingText, { color: RED }]}>
                    {safeFindingCount(result.red_flags)} red flags
                  </Text>
                  <Text style={styles.tocSeparatorDot}>{'\u00b7'}</Text>
                  <Text style={[styles.tocFindingText, { color: YELLOW }]}>
                    {safeFindingCount(result.warnings)} warnings
                  </Text>
                  <Text style={styles.tocSeparatorDot}>{'\u00b7'}</Text>
                  <Text style={[styles.tocFindingText, { color: GREEN }]}>
                    {safeFindingCount(result.positives)} positives
                  </Text>
                  <Link src={`#appendix-${index}`} style={styles.tocPolicyLink}>
                    view policy
                  </Link>
                </View>
              </View>
            );
          })}
        </View>

        <PageFooter date={date} />
      </Page>

      {/* ── Pages 3+: Per-Service Detail Sections ─────────────── */}
      {services.map((result, index) => {
        const grade = getServiceGrade(result);
        const categories = result?.categories || {};

        return (
          <Page key={index} size="A4" style={sharedStyles.policyPage} break>
            {/* Fixed header on every page */}
            <View style={sharedStyles.header} fixed>
              <Link src="#toc" style={styles.backLink}>
                {'\u2190'} Table of Contents
              </Link>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flex: 1 }}>
                <Text style={sharedStyles.headerBrand}>PRIVACYLENS</Text>
                <Text style={sharedStyles.headerDate}>{date}</Text>
              </View>
            </View>
            <View style={sharedStyles.headerLine} fixed />

            <View id={`service-${index}`}>

              {/* Grade + Service Name */}
              <View style={sharedStyles.gradeSection}>
                <GradeGauge grade={grade} size={64} />
                <View>
                  <Text style={sharedStyles.serviceName}>
                    {getServiceName(result)}
                  </Text>
                  <Text style={sharedStyles.overallGradeText}>
                    Overall Grade: {grade}
                  </Text>
                </View>
              </View>

              {/* Summary */}
              {result?.summary && (
                <Text style={sharedStyles.summary}>{result.summary}</Text>
              )}

              {/* Category cards grid */}
              {Object.keys(categories).length > 0 && (
                <>
                  <Text style={sharedStyles.sectionTitle}>CATEGORIES</Text>
                  <View style={sharedStyles.categoryGrid}>
                    {Object.entries(categories).map(([key, cat]) => {
                      const gradeColor = getGradeColor(cat.grade);
                      return (
                        <View key={key} style={sharedStyles.categoryCard} wrap={false}>
                          <View
                            style={[
                              sharedStyles.categoryAccentBar,
                              { backgroundColor: gradeColor },
                            ]}
                          />
                          <View style={sharedStyles.categoryCardBody}>
                            <View style={sharedStyles.categoryHeader}>
                              <Text style={sharedStyles.categoryName}>
                                {key
                                  .replace(/_/g, ' ')
                                  .replace(/\b\w/g, (c) => c.toUpperCase())}
                              </Text>
                              <View
                                style={[
                                  sharedStyles.categoryGradeBadge,
                                  {
                                    backgroundColor: `${gradeColor}18`,
                                    borderColor: gradeColor,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    sharedStyles.categoryGrade,
                                    { color: gradeColor },
                                  ]}
                                >
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

              {/* Link to policy appendix */}
              <Link src={`#appendix-${index}`} style={styles.policyLink}>
                View Full Policy {'\u2192'}
              </Link>
            </View>

            <PageFooter date={date} />
          </Page>
        );
      })}

      {/* ── Appendix: Full Policy Texts ───────────────────────── */}
      {services.map((result, index) => {
        const serviceId = result.service_id;
        const policyContent = texts[serviceId];
        const serviceName = getServiceName(result);
        const findings = [
          { items: result?.red_flags || [], type: 'red_flag' },
          { items: result?.warnings || [], type: 'warning' },
          { items: result?.positives || [], type: 'positive' },
        ];
        const policyElements = policyContent?.content
          ? parsePolicyText(policyContent.content, findings)
          : [];

        return (
          <Page key={`appendix-${index}`} size="A4" style={sharedStyles.policyPage} break>
            {/* Fixed header on every page */}
            <View style={sharedStyles.header} fixed>
              <Link src={`#service-${index}`} style={styles.backLink}>
                {'\u2190'} Back to {serviceName}
              </Link>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flex: 1 }}>
                <Text style={sharedStyles.headerBrand}>PRIVACYLENS</Text>
                <Text style={sharedStyles.headerDate}>{date}</Text>
              </View>
            </View>
            <View style={sharedStyles.headerLine} fixed />

            <View id={`appendix-${index}`}>

              <Text style={sharedStyles.sectionTitle}>APPENDIX</Text>
              <Text style={styles.appendixHeader}>
                Privacy Policy — {serviceName}
              </Text>

              {policyElements.length > 0 ? (
                policyElements.map((el, i) => {
                  if (el.type === 'heading') {
                    return (
                      <Text key={i} style={styles.appendixHeading}>
                        {el.text}
                      </Text>
                    );
                  }
                  if (el.type === 'list') {
                    return (
                      <View key={i} style={styles.appendixListItem}>
                        <Text style={styles.appendixBullet}>{'\u2022'}</Text>
                        <Text style={styles.appendixListText}>
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
                    <Text key={i} style={styles.appendixParagraph}>
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
                })
              ) : (
                <Text style={styles.appendixEmpty}>
                  Policy text not available for this service.
                </Text>
              )}
            </View>

            {/* Footer */}
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
        );
      })}
    </Document>
  );
}
