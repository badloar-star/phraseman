import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang } from '../constants/i18n';
import {
  auditPhrasePosCoverage,
  computePhraseAnalytics,
  type PhraseAnalyticsResult,
  type PosCoverageAudit,
} from './phrase_analytics';
import {
  loadMistakePracticeInsights,
  type MistakePracticeInsights,
} from './mistake_practice_insights';
import { useStudyTarget } from '../components/StudyTargetContext';
import { hapticTap } from '../hooks/use-haptics';
import { safeRouterBack } from './navigation_back';

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: string;
}) {
  const { theme: t, f } = useTheme();
  return (
    <View style={{ flex: 1, minWidth: 126, borderWidth: 0, borderColor: t.border, borderRadius: 10, backgroundColor: t.bgCard, padding: 12 }}>
      <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '800', textTransform: 'uppercase' }} numberOfLines={1}>
        {label}
      </Text>
      <Text style={{ color: accent, fontSize: f.h2, fontWeight: '900', marginTop: 6 }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Section({
  testID,
  title,
  children,
}: {
  testID: string;
  title: string;
  children: React.ReactNode;
}) {
  const { theme: t, f } = useTheme();
  return (
    <View testID={testID} style={{ borderWidth: 0, borderColor: t.border, borderRadius: 10, backgroundColor: t.bgCard, padding: 14, gap: 12 }}>
      <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900' }}>{title}</Text>
      {children}
    </View>
  );
}

function CompactRows({ rows }: { rows: Array<{ label: string; value: string | number }> }) {
  const { theme: t, f } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      {rows.slice(0, 12).map((row) => (
        <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          <Text style={{ color: t.textSecond, fontSize: f.caption, flex: 1 }} numberOfLines={1}>
            {row.label}
          </Text>
          <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '900' }}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

function runtimeRows(snapshot: MistakePracticeInsights | null) {
  if (!snapshot) return [];
  return [
    { label: 'tracked mistakes', value: snapshot.totalTracked },
    { label: 'active', value: snapshot.active },
    { label: 'corrected', value: snapshot.corrected },
    { label: 'ready words', value: snapshot.dueWords },
    { label: 'ready phrases', value: snapshot.duePhrases },
  ];
}

function analyticsRows(data: PhraseAnalyticsResult | null) {
  if (!data) return [];
  return [
    { label: 'total mistakes', value: data.totalMistakes },
    { label: 'window days', value: data.windowDays },
    { label: 'categories', value: data.categoryStats.length },
    { label: 'top category', value: data.categoryStats[0]?.category ?? 'none' },
    { label: 'top priority', value: data.categoryStats[0]?.priorityScore ?? 0 },
  ];
}

export default function PosAnalyticsAuditScreen() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const audit = useMemo<PosCoverageAudit>(() => auditPhrasePosCoverage(), []);
  const [snapshot, setSnapshot] = useState<MistakePracticeInsights | null>(null);
  const [analytics, setAnalytics] = useState<PhraseAnalyticsResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      loadMistakePracticeInsights(studyTarget === 'fr' ? 'fr' : 'en'),
      computePhraseAnalytics(),
    ]).then(([nextSnapshot, nextAnalytics]) => {
      if (cancelled) return;
      setSnapshot(nextSnapshot);
      setAnalytics(nextAnalytics);
    }).catch(() => {
      if (!cancelled) {
        setSnapshot(null);
        setAnalytics(null);
      }
    });
    return () => { cancelled = true; };
  }, [studyTarget]);

  const readyColor = audit.releaseReady ? '#22C55E' : '#FB7185';
  const title = triLang(lang, {
    ru: 'POS token audit',
    uk: 'POS token audit',
    es: 'Auditoría POS',
    'pt-BR': 'Auditoria POS',
    vi: 'Kiểm tra token POS',
    id: 'Audit token POS',
    tr: 'POS token denetimi',
    pl: 'Audyt tokenów POS',
  });

  return (
    <ScreenGradient>
      <SafeAreaView testID="screen-pos-analytics-audit" style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
          <TouchableOpacity onPress={() => { hapticTap(); safeRouterBack(router, '/phrase_analytics_screen' as any); }} hitSlop={12} style={{ padding: 4 }}>
            <Ionicons name="chevron-back" size={26} color={t.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900' }}>{title}</Text>
            <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 2 }}>release coverage, exact events, runtime analytics</Text>
          </View>
          <View
            testID={audit.releaseReady ? 'pos-audit-release-ready' : 'pos-audit-release-blocked'}
            style={{ borderRadius: 999, borderWidth: 0, borderColor: readyColor, paddingHorizontal: 10, paddingVertical: 5 }}
          >
            <Text style={{ color: readyColor, fontSize: f.label, fontWeight: '900' }}>
              {audit.releaseReady ? 'READY' : 'CHECK'}
            </Text>
          </View>
        </View>

        <ScrollView decelerationRate="normal" contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <StatCard label="tokens" value={audit.totalTokens} accent={t.textPrimary} />
            <StatCard label="resolved" value={`${audit.resolvedPct}%`} accent={readyColor} />
            <StatCard label="unknown" value={audit.unknownSourceTokens} accent={audit.unknownSourceTokens ? '#FB7185' : '#22C55E'} />
          </View>

          <Section testID="pos-audit-release-coverage" title="Release Coverage">
            <CompactRows rows={[
              { label: 'total tokens', value: audit.totalTokens },
              { label: 'resolved tokens', value: audit.resolvedTokens },
              { label: 'unresolved tokens', value: audit.unresolvedTokens },
              { label: 'unknown source', value: audit.unknownSourceTokens },
              { label: 'low confidence', value: audit.lowConfidenceTokens },
              { label: 'min confidence', value: audit.minConfidence.toFixed(2) },
            ]} />
          </Section>

          <Section testID="pos-audit-coverage-sources" title="Coverage Sources">
            <CompactRows rows={audit.sourceCounts.map((row) => ({ label: row.source, value: row.count }))} />
            <View style={{ height: 1, backgroundColor: t.border }} />
            <CompactRows rows={audit.categoryCounts.map((row) => ({ label: row.category, value: row.count }))} />
          </Section>

          <Section testID="pos-audit-runtime-events" title="Runtime Events">
            <CompactRows rows={runtimeRows(snapshot)} />
            <View style={{ height: 1, backgroundColor: t.border }} />
            <CompactRows rows={analyticsRows(analytics)} />
            {snapshot?.topMistakes.slice(0, 5).map((item) => (
              <Text key={item.mistakeId} style={{ color: t.textMuted, fontSize: f.caption, lineHeight: f.caption * 1.35 }} numberOfLines={2}>
                {item.facet} · {item.count} · {item.phrase}
              </Text>
            ))}
          </Section>
        </ScrollView>
      </SafeAreaView>
    </ScreenGradient>
  );
}
