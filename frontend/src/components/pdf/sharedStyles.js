import { StyleSheet, View, Text } from '@react-pdf/renderer';

// ── Color Constants ──────────────────────────────────────────────
export const DARK_BG = '#1c1c1c';
export const SURFACE = '#262626';
export const BORDER = 'rgba(102, 102, 128, 0.2)';
export const ACCENT = '#22d3ee';
export const TEXT_WHITE = '#e4e4e7';
export const TEXT_MUTED = '#71717a';
export const RED = '#ef4444';
export const YELLOW = '#eab308';
export const GREEN = '#22c55e';

// ── Helper Functions ─────────────────────────────────────────────

export function getGradeColor(grade) {
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

export function truncateText(text, maxLen = 120) {
  if (!text || text.length <= maxLen) {
    return text;
  }
  return `${text.slice(0, maxLen)}...`;
}

export function formatDate(dateStr) {
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

export function gradeToPercent(grade) {
  if (!grade || grade === 'N/A') {
    return 0;
  }
  const letter = grade[0];
  if (letter === 'A') {
    return 92;
  }
  if (letter === 'B') {
    return 78;
  }
  if (letter === 'C') {
    return 62;
  }
  if (letter === 'D') {
    return 45;
  }
  return 25;
}

// ── React-PDF Sub-Components ─────────────────────────────────────

export function GradeGauge({ grade, size = 64 }) {
  const color = getGradeColor(grade);
  return (
    <View style={{
      width: size,
      height: size,
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
        fontSize: Math.round(size * 0.375),
        fontWeight: 600,
        color: color,
      }}>
        {grade || 'N/A'}
      </Text>
    </View>
  );
}

export function FindingDot({ color }) {
  return (
    <View style={{
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: color,
    }} />
  );
}

export function FindingsSection({ title, items, color, maxItems = 5 }) {
  if (!items || items.length === 0) {
    return null;
  }
  const displayed = items.slice(0, maxItems);

  return (
    <View style={sharedStyles.findingSection} wrap={false}>
      <View style={sharedStyles.findingSectionHeader}>
        <FindingDot color={color} />
        <Text style={[sharedStyles.findingSectionTitle, { color }]}>{title}</Text>
        <Text style={{ fontSize: 8, color: TEXT_MUTED, fontFamily: 'JetBrains Mono' }}>
          ({items.length})
        </Text>
      </View>
      {displayed.map((item, i) => (
        <View key={i} style={sharedStyles.findingItem}>
          <Text style={sharedStyles.findingTitle}>{getItemText(item)}</Text>
          {getItemDescription(item) ? (
            <Text style={sharedStyles.findingDescription}>{getItemDescription(item)}</Text>
          ) : null}
        </View>
      ))}
      {items.length > maxItems && (
        <Text style={{ fontSize: 7, color: TEXT_MUTED, paddingLeft: 14 }}>
          +{items.length - maxItems} more
        </Text>
      )}
    </View>
  );
}

// ── Internal helpers for FindingsSection ─────────────────────────

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

// ── Shared StyleSheet ────────────────────────────────────────────

export const sharedStyles = StyleSheet.create({
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
