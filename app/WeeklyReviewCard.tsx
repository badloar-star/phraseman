import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import PlusBadge from '../components/PlusBadge';
import SkeletonBlock from '../components/SkeletonShimmer';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { weeklyCompassIconSource } from '../constants/weeklyCompassIcons';
import { hapticTap } from '../hooks/use-haptics';
import type { WeeklyReviewActionKind, WeeklyReviewSnapshot, WeeklyReviewV2 } from './weekly_review_types';
import { generateWeeklyReview, getWeeklyReviewState, type WeeklyReviewState } from './weekly_review_client';
import { weeklyReviewCopy } from './weekly_review_copy';
import { captureAccountGeneration } from './account_generation';
import { signalBucket, trackWeeklyReviewEvent } from './weekly_review_analytics';
import type { RuntimeStudyTarget } from './target_storage_keys';

interface WeeklyReviewCardProps {
  isPremium: boolean;
  active: boolean;
  studyTarget?: RuntimeStudyTarget;
  stableLayout?: boolean;
  embedded?: boolean;
}

type VerifiedRoute = { pathname: string; params?: Record<string, string> };

export function routeForWeeklyReviewAction(
  actionKind: WeeklyReviewActionKind,
  recommendationId: string,
): VerifiedRoute | null {
  if (actionKind === 'repeat_due_words' && recommendationId === 'due:words') return { pathname: '/trainer_words_session' };
  if (actionKind === 'repeat_due_phrases' && recommendationId === 'due:phrases') return { pathname: '/trainer_phrases_session' };
  if (actionKind === 'open_personal_training' && recommendationId.startsWith('diagnosis:')) {
    const microDiagnosisId = recommendationId.slice('diagnosis:'.length);
    return /^[a-z0-9_-]{1,80}$/.test(microDiagnosisId)
      ? { pathname: '/problem_coach', params: { microDiagnosisId } }
      : null;
  }
  if (actionKind === 'continue_lesson' && /^lesson:\d{1,5}$/.test(recommendationId)) {
    return { pathname: '/lesson_menu', params: { id: recommendationId.slice('lesson:'.length) } };
  }
  return null;
}

export default function WeeklyReviewCard({ active, isPremium, studyTarget, stableLayout = false, embedded = false }: WeeklyReviewCardProps) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const router = useRouter();
  const copy = useMemo(() => weeklyReviewCopy(lang), [lang]);
  const [state, setState] = useState<WeeklyReviewState | null>(null);
  const lastImpressionKey = useRef('');

  const load = useCallback(async () => {
    const initial = await getWeeklyReviewState({ lang, studyTarget, isPremium });
    setState(initial);
    if (!active || !isPremium || initial.status !== 'plus_ready_to_generate') return;
    setState({ status: 'generating', snapshot: initial.snapshot, review: initial.fallback });
    const generated = await generateWeeklyReview({ lang, studyTarget, isPremium });
    setState(generated);
  }, [active, isPremium, lang, studyTarget]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  useEffect(() => {
    if (!active || !state) return;
    const generation = captureAccountGeneration().generation;
    const target = studyTarget === 'fr' ? 'fr' : 'en';
    const key = `${generation}:${isPremium ? 'plus' : 'free'}:${target}`;
    if (lastImpressionKey.current === key) return;
    lastImpressionKey.current = key;
    trackWeeklyReviewEvent('weekly_review_impression', {
      tier: isPremium ? 'plus' : 'free',
      study_target: target,
      signal_bucket: signalBucket(state.snapshot.signalCount),
      result_source: resultSourceForState(state),
      schema_version: 'weekly-review-v2',
    });
  }, [active, isPremium, state, studyTarget]);

  const onPaywall = useCallback(() => {
    hapticTap();
    trackWeeklyReviewEvent('weekly_review_paywall_pressed', {
      tier: 'free',
      study_target: studyTarget === 'fr' ? 'fr' : 'en',
      schema_version: 'weekly-review-v2',
    });
    router.push({ pathname: '/premium_modal', params: { context: 'weekly_review' } } as never);
  }, [router, studyTarget]);

  const onAction = useCallback((actionKind: WeeklyReviewActionKind, recommendationId: string) => {
    const route = routeForWeeklyReviewAction(actionKind, recommendationId);
    if (!route) return;
    hapticTap();
    trackWeeklyReviewEvent('weekly_review_action_pressed', {
      tier: 'plus',
      study_target: studyTarget === 'fr' ? 'fr' : 'en',
      action_kind: actionKind,
      schema_version: 'weekly-review-v2',
    });
    router.push(route as never);
  }, [router, studyTarget]);

  const slotStyle = stableLayout ? (embedded ? styles.stableEmbeddedSlot : styles.stableCardSlot) : null;
  if (!isPremium) {
    return (
      <FreeReviewTeaser
        copy={copy}
        onPress={onPaywall}
        themeMode={themeMode}
        backgroundColor={t.bgCard}
        borderColor={t.border}
        textColor={t.textPrimary}
        mutedColor={t.textSecond}
        style={stableLayout ? styles.stableFreeSlot : null}
      />
    );
  }
  if (!state) return <LoadingCard embedded={embedded} style={slotStyle} title={copy.title} t={t} f={f} />;

  const review = reviewFromState(state);
  const ready = state.snapshot.status === 'ready';
  const statusText = state.status === 'generating'
    ? copy.updating
    : state.status === 'fresh' || state.status === 'cached'
      ? copy.ready
      : state.status === 'cooldown'
        ? copy.nextUpdate
        : state.status === 'offline' || state.status === 'error'
          ? copy.unavailable
          : ready ? copy.enough : copy.collecting;
  return (
    <CardShell embedded={embedded} style={slotStyle} backgroundColor={t.bgCard} borderColor={t.border}>
      <View style={styles.headerRow}>
        <Image source={weeklyCompassIconSource(themeMode)} style={styles.compassIcon} contentFit="contain" accessible={false} />
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: t.textPrimary, fontSize: Math.max(17, f.h2 * 0.82) }]}>{copy.title}</Text>
          <Text style={[styles.status, { color: t.textMuted, fontSize: f.caption }]}>{statusText}</Text>
        </View>
        <PlusBadge themeMode={themeMode} size="xs" />
      </View>

      <SnapshotStrip snapshot={state.snapshot} copy={copy} t={t} f={f} />

      {review ? (
        <PlusReview
          review={review}
          copy={copy}
          onAction={onAction}
          textColor={t.textPrimary}
          mutedColor={t.textSecond}
          accent={t.accent}
          accentText={t.correctText ?? '#07110A'}
          fontSize={f.body}
        />
      ) : (
        <View style={styles.pendingBlock}>
          <Text style={[styles.pendingTitle, { color: t.textPrimary, fontSize: f.body }]}>{statusText}</Text>
        </View>
      )}
    </CardShell>
  );
}

function reviewFromState(state: WeeklyReviewState): WeeklyReviewV2 | undefined {
  if (state.status === 'fresh' || state.status === 'cached' || state.status === 'cooldown') return state.review;
  if (state.status === 'generating' || state.status === 'offline' || state.status === 'error') return state.review;
  if (state.status === 'plus_ready_to_generate') return state.fallback;
  return undefined;
}

function resultSourceForState(state: WeeklyReviewState): 'none' | 'local_fallback' | 'cache' | 'provider' {
  if (state.status === 'fresh') return 'provider';
  if (state.status === 'cached' || state.status === 'cooldown') return 'cache';
  if (state.status === 'plus_ready_to_generate' && state.fallback) return 'local_fallback';
  if ((state.status === 'offline' || state.status === 'error' || state.status === 'generating') && state.review) return 'cache';
  return 'none';
}

function SnapshotStrip({ snapshot, copy, t, f }: { snapshot: WeeklyReviewSnapshot; copy: ReturnType<typeof weeklyReviewCopy>; t: ReturnType<typeof useTheme>['theme']; f: ReturnType<typeof useTheme>['f'] }) {
  const metrics = [
    { value: snapshot.signalCount, label: copy.signals },
    { value: snapshot.activeDays7d, label: copy.activeDays },
    { value: snapshot.totalDue, label: copy.due },
    { value: `${snapshot.sourceCoverage.ready}/${snapshot.sourceCoverage.total}`, label: copy.sources },
  ];
  return (
    <View accessibilityLabel={copy.snapshot} style={styles.snapshotWrap}>
      <Text style={[styles.sectionEyebrow, { color: t.textMuted, fontSize: f.label }]}>{copy.snapshot.toUpperCase()}</Text>
      <View style={styles.metricsRow}>
        {metrics.map((metric) => (
          <View key={metric.label} style={styles.metric}>
            <Text style={[styles.metricValue, { color: t.textPrimary, fontSize: f.bodyLg }]}>{metric.value}</Text>
            <Text style={[styles.metricLabel, { color: t.textMuted, fontSize: Math.max(10, f.caption - 1) }]}>{metric.label}</Text>
          </View>
        ))}
      </View>
      <View style={[styles.progressTrack, { backgroundColor: t.bgSurface }]}>
        <View style={[styles.progressFill, { backgroundColor: t.accent, width: `${Math.round((snapshot.progressCurrent / Math.max(1, snapshot.progressRequired)) * 100)}%` as `${number}%` }]} />
      </View>
    </View>
  );
}

function FreeReviewTeaser({ copy, onPress, themeMode, backgroundColor, borderColor, textColor, mutedColor, style }: {
  copy: ReturnType<typeof weeklyReviewCopy>;
  onPress: () => void;
  themeMode: ReturnType<typeof useTheme>['themeMode'];
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  mutedColor: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={copy.freeTitle}
      accessibilityHint={copy.freeBody}
      onPress={onPress}
      style={({ pressed }) => [
        styles.freeCard,
        { backgroundColor, borderColor, opacity: pressed ? 0.78 : 1 },
        style,
      ]}
    >
      <Image source={weeklyCompassIconSource(themeMode)} style={styles.freeIcon} contentFit="contain" accessible={false} />
      <View style={styles.freeCopy}>
        <Text style={[styles.freeTitle, { color: textColor }]}>{copy.freeTitle}</Text>
        <Text style={[styles.freeBody, { color: mutedColor }]}>{copy.freeBody}</Text>
      </View>
      <View style={styles.freeTrailing}>
        <PlusBadge themeMode={themeMode} size="xs" />
        <Ionicons name="chevron-forward" size={18} color={mutedColor} />
      </View>
    </Pressable>
  );
}

function PlusReview({ review, copy, onAction, textColor, mutedColor, accent, accentText, fontSize }: {
  review: WeeklyReviewV2;
  copy: ReturnType<typeof weeklyReviewCopy>;
  onAction: (kind: WeeklyReviewActionKind, id: string) => void;
  textColor: string;
  mutedColor: string;
  accent: string;
  accentText: string;
  fontSize: number;
}) {
  return (
    <View style={styles.reviewContent}>
      <Text style={[styles.headline, { color: textColor }]}>{review.headline}</Text>
      <Text style={[styles.summary, { color: mutedColor, fontSize }]}>{review.summary}</Text>
      <View style={styles.details}>
        <ReviewSection title={copy.patterns} rows={review.patterns.map((row) => ({ title: row.title, body: row.explanation }))} textColor={textColor} mutedColor={mutedColor} />
        <ReviewSection title={copy.improvements} rows={review.improvements.map((row) => ({ title: row.title }))} textColor={textColor} mutedColor={mutedColor} />
        <ReviewSection title={copy.priorities} rows={review.priorities.map((row) => ({ title: row.title, body: row.reason }))} textColor={textColor} mutedColor={mutedColor} />
        {review.plan.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>{copy.plan}</Text>
            {review.plan.map((step) => (
              <Pressable
                key={`${step.order}:${step.recommendationId}`}
                accessibilityRole="button"
                accessibilityLabel={step.expectedOutcome}
                onPress={() => onAction(step.actionKind, step.recommendationId)}
                style={({ pressed }) => [styles.planButton, { backgroundColor: accent, opacity: pressed ? 0.82 : 1 }]}
              >
                <View style={[styles.orderDot, { backgroundColor: accentText }]}><Text style={[styles.orderText, { color: accent }]}>{step.order}</Text></View>
                <Text style={[styles.planText, { color: accentText }]}>{step.expectedOutcome}</Text>
                <Ionicons name="arrow-forward" size={18} color={accentText} />
              </Pressable>
            ))}
          </View>
        ) : null}
        <Text style={[styles.coverage, { color: mutedColor }]}>{review.coverageNote}</Text>
      </View>
    </View>
  );
}

function ReviewSection({ title, rows, textColor, mutedColor }: { title: string; rows: { title: string; body?: string }[]; textColor: string; mutedColor: string }) {
  if (rows.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: textColor }]}>{title}</Text>
      {rows.map((row, index) => (
        <View key={`${index}:${row.title}`} style={styles.insightRow}>
          <View style={[styles.insightDot, { backgroundColor: mutedColor }]} />
          <View style={styles.insightCopy}>
            <Text style={[styles.insightTitle, { color: textColor }]}>{row.title}</Text>
            {row.body ? <Text style={[styles.insightBody, { color: mutedColor }]}>{row.body}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

function CardShell({ children, embedded, style, backgroundColor, borderColor }: { children: React.ReactNode; embedded: boolean; style?: StyleProp<ViewStyle>; backgroundColor: string; borderColor: string }) {
  if (embedded) return <View style={[styles.embedded, style]}>{children}</View>;
  return <View style={[styles.card, { backgroundColor, borderColor }, style]}>{children}</View>;
}

function LoadingCard({ embedded, style, title, t, f }: { embedded: boolean; style?: StyleProp<ViewStyle>; title: string; t: ReturnType<typeof useTheme>['theme']; f: ReturnType<typeof useTheme>['f'] }) {
  return (
    <CardShell embedded={embedded} style={style} backgroundColor={t.bgCard} borderColor={t.border}>
      <View style={styles.headerRow}><View style={[styles.iconPlaceholder, { backgroundColor: t.bgSurface }]} /><Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>{title}</Text></View>
      <View style={styles.loadingGeometry}><SkeletonBlock width="100%" height={54} borderRadius={14} /><SkeletonBlock width="100%" height={92} borderRadius={16} /></View>
    </CardShell>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 270, padding: 18, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, marginBottom: 20, gap: 16, overflow: 'hidden' },
  embedded: { minHeight: 250, paddingVertical: 4, gap: 16, overflow: 'hidden' },
  stableCardSlot: { minHeight: 270 }, stableEmbeddedSlot: { minHeight: 250 }, stableFreeSlot: { minHeight: 96 },
  freeCard: { minHeight: 96, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, marginBottom: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' },
  freeIcon: { width: 48, height: 48, flexShrink: 0 },
  freeCopy: { flex: 1, minWidth: 0, gap: 4 }, freeTitle: { fontSize: 17, lineHeight: 22, fontWeight: '900', letterSpacing: -0.25 }, freeBody: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  freeTrailing: { alignSelf: 'stretch', alignItems: 'flex-end', justifyContent: 'space-between', paddingVertical: 2 },
  headerRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 11 },
  compassIcon: { width: 48, height: 48 }, iconPlaceholder: { width: 48, height: 48, borderRadius: 16 },
  headerCopy: { flex: 1, minWidth: 0 }, title: { fontWeight: '900', letterSpacing: -0.3 }, status: { marginTop: 3, lineHeight: 17, fontWeight: '600' },
  snapshotWrap: { gap: 9 }, sectionEyebrow: { fontWeight: '900', letterSpacing: 0.9 }, metricsRow: { flexDirection: 'row', gap: 6 },
  metric: { flex: 1, minWidth: 0 }, metricValue: { fontWeight: '900' }, metricLabel: { marginTop: 2, lineHeight: 13, fontWeight: '600' },
  progressTrack: { height: 5, borderRadius: 999, overflow: 'hidden' }, progressFill: { height: '100%', borderRadius: 999, maxWidth: '100%' },
  pendingBlock: { minHeight: 80, justifyContent: 'center', gap: 12 }, pendingTitle: { fontWeight: '800', lineHeight: 22 },
  reviewContent: { gap: 11 }, headline: { fontSize: 20, lineHeight: 25, fontWeight: '900', letterSpacing: -0.35 }, summary: { lineHeight: 22 },
  details: { gap: 17, paddingTop: 4 }, section: { gap: 9 }, sectionTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
  insightRow: { flexDirection: 'row', gap: 9 }, insightDot: { width: 6, height: 6, borderRadius: 99, marginTop: 7 }, insightCopy: { flex: 1, gap: 3 }, insightTitle: { fontSize: 15, lineHeight: 21, fontWeight: '800' }, insightBody: { fontSize: 14, lineHeight: 21 },
  planButton: { minHeight: 52, borderRadius: 15, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }, orderDot: { width: 25, height: 25, borderRadius: 99, alignItems: 'center', justifyContent: 'center' }, orderText: { fontSize: 12, fontWeight: '900' }, planText: { flex: 1, fontSize: 14, lineHeight: 19, fontWeight: '900' },
  coverage: { fontSize: 12, lineHeight: 17, fontWeight: '600' }, loadingGeometry: { gap: 12 },
});
