import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import PlusBadge from '../components/PlusBadge';
import SkeletonBlock from '../components/SkeletonShimmer';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { weeklyCompassIconSource } from '../constants/weeklyCompassIcons';
import { hapticTap } from '../hooks/use-haptics';
import { useReduceMotion } from '../hooks/use_reduce_motion';
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
  const reduceMotion = useReduceMotion();
  const [state, setState] = useState<WeeklyReviewState | null>(null);
  const [expanded, setExpanded] = useState(false);
  const sweep = useRef(new Animated.Value(1)).current;
  const lastAnimatedKey = useRef('');
  const lastImpressionKey = useRef('');

  const load = useCallback(async () => {
    const initial = await getWeeklyReviewState({ lang, studyTarget, isPremium });
    setState(initial);
    if (!active || !isPremium || initial.status !== 'plus_ready_to_generate') return;
    setState({ status: 'generating', snapshot: initial.snapshot, review: initial.fallback });
    const generated = await generateWeeklyReview({ lang, studyTarget, isPremium });
    setState(generated);
    if (generated.status === 'fresh') setExpanded(true);
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

  useEffect(() => {
    if (!active || reduceMotion || state?.status !== 'fresh') {
      sweep.stopAnimation();
      sweep.setValue(1);
      return;
    }
    const key = `${state.nextAllowedAtMs}:${state.review.headline}`;
    if (lastAnimatedKey.current === key) return;
    lastAnimatedKey.current = key;
    sweep.setValue(0);
    Animated.timing(sweep, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    return () => sweep.stopAnimation();
  }, [active, reduceMotion, state, sweep]);

  const onGenerate = useCallback(async () => {
    if (!state || !isPremium) return;
    hapticTap();
    setState({ status: 'generating', snapshot: state.snapshot, review: reviewFromState(state) });
    setState(await generateWeeklyReview({ lang, studyTarget, isPremium }));
  }, [isPremium, lang, state, studyTarget]);

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

  const onToggle = useCallback(() => {
    hapticTap();
    if (!expanded) {
      trackWeeklyReviewEvent('weekly_review_expanded', {
        tier: 'plus',
        study_target: studyTarget === 'fr' ? 'fr' : 'en',
        schema_version: 'weekly-review-v2',
      });
    }
    setExpanded((value) => !value);
  }, [expanded, studyTarget]);

  const slotStyle = stableLayout ? (embedded ? styles.stableEmbeddedSlot : styles.stableCardSlot) : null;
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
  const iconSettle = sweep.interpolate({ inputRange: [0, 1], outputRange: [-5, 0] });
  const iconOpacity = sweep.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] });
  const sweepX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-80, 420] });

  return (
    <CardShell embedded={embedded} style={slotStyle} backgroundColor={t.bgCard} borderColor={t.border}>
      <View style={styles.headerRow}>
        <Animated.View style={{ opacity: iconOpacity, transform: [{ translateY: iconSettle }] }}>
          <Image source={weeklyCompassIconSource(themeMode)} style={styles.compassIcon} contentFit="contain" accessible={false} />
        </Animated.View>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: t.textPrimary, fontSize: Math.max(17, f.h2 * 0.82) }]}>{copy.title}</Text>
          <Text style={[styles.status, { color: t.textMuted, fontSize: f.caption }]}>{statusText}</Text>
        </View>
        <View style={styles.badges}>
          <View style={[styles.aiBadge, { backgroundColor: t.bgSurface, borderColor: t.border }]}>
            <Text style={[styles.aiBadgeText, { color: t.textSecond }]}>{copy.aiBadge}</Text>
          </View>
          {isPremium ? <PlusBadge themeMode={themeMode} size="xs" /> : null}
        </View>
      </View>

      <SnapshotStrip snapshot={state.snapshot} copy={copy} t={t} f={f} />

      <View style={[styles.signalPanel, { backgroundColor: t.bgSurface, borderColor: t.border }]}>
        <Animated.View pointerEvents="none" style={[styles.sweep, { backgroundColor: t.accent, transform: [{ translateX: sweepX }, { rotate: '16deg' }] }]} />
        {!isPremium ? (
          <FreeOffer copy={copy} onPress={onPaywall} accent={t.accent} foreground={t.correctText ?? '#07110A'} textColor={t.textPrimary} mutedColor={t.textSecond} fontSize={f.body} />
        ) : review ? (
          <PlusReview
            review={review}
            copy={copy}
            expanded={expanded}
                onToggle={onToggle}
            onAction={onAction}
            textColor={t.textPrimary}
            mutedColor={t.textSecond}
            borderColor={t.border}
            accent={t.accent}
            accentText={t.correctText ?? '#07110A'}
            fontSize={f.body}
          />
        ) : (
          <View style={styles.pendingBlock}>
            <Text style={[styles.pendingTitle, { color: t.textPrimary, fontSize: f.body }]}>{statusText}</Text>
            {ready && state.status !== 'generating' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={copy.aiBadge}
                accessibilityHint={copy.expand}
                onPress={onGenerate}
                style={({ pressed }) => [styles.secondaryButton, { borderColor: t.accent, opacity: pressed ? 0.75 : 1 }]}
              >
                <Ionicons name="sparkles-outline" size={18} color={t.accent} />
                <Text style={[styles.secondaryButtonText, { color: t.accent }]}>{copy.expand}</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
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
            <Text style={[styles.metricLabel, { color: t.textMuted, fontSize: Math.max(10, f.caption - 1) }]} numberOfLines={2}>{metric.label}</Text>
          </View>
        ))}
      </View>
      <View style={[styles.progressTrack, { backgroundColor: t.bgSurface }]}>
        <View style={[styles.progressFill, { backgroundColor: t.accent, width: `${Math.round((snapshot.progressCurrent / Math.max(1, snapshot.progressRequired)) * 100)}%` as `${number}%` }]} />
      </View>
    </View>
  );
}

function FreeOffer({ copy, onPress, accent, foreground, textColor, mutedColor, fontSize }: { copy: ReturnType<typeof weeklyReviewCopy>; onPress: () => void; accent: string; foreground: string; textColor: string; mutedColor: string; fontSize: number }) {
  return (
    <View style={styles.offerContent}>
      <Text style={[styles.offerTitle, { color: textColor, fontSize }]}>{copy.valueTitle}</Text>
      <View style={styles.valueList}>
        {copy.values.map((value) => (
          <View key={value} style={styles.valueRow}>
            <Ionicons name="checkmark-circle" size={18} color={mutedColor} />
            <Text style={[styles.valueText, { color: mutedColor, fontSize }]}>{value}</Text>
          </View>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.cta}
        accessibilityHint={copy.valueTitle}
        onPress={onPress}
        style={({ pressed }) => [styles.primaryButton, { backgroundColor: accent, opacity: pressed ? 0.82 : 1 }]}
      >
        <Ionicons name="sparkles" size={19} color={foreground} />
        <Text style={[styles.primaryButtonText, { color: foreground }]}>{copy.cta}</Text>
        <Ionicons name="arrow-forward" size={18} color={foreground} />
      </Pressable>
    </View>
  );
}

function PlusReview({ review, copy, expanded, onToggle, onAction, textColor, mutedColor, borderColor, accent, accentText, fontSize }: {
  review: WeeklyReviewV2; copy: ReturnType<typeof weeklyReviewCopy>; expanded: boolean; onToggle: () => void;
  onAction: (kind: WeeklyReviewActionKind, id: string) => void; textColor: string; mutedColor: string; borderColor: string; accent: string; accentText: string; fontSize: number;
}) {
  return (
    <View style={styles.reviewContent}>
      <Text style={[styles.headline, { color: textColor }]}>{review.headline}</Text>
      <Text style={[styles.summary, { color: mutedColor, fontSize }]}>{review.summary}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={expanded ? copy.collapse : copy.expand}
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={({ pressed }) => [styles.expandButton, { borderColor, opacity: pressed ? 0.72 : 1 }]}
      >
        <Text style={[styles.expandText, { color: textColor }]}>{expanded ? copy.collapse : copy.expand}</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={textColor} />
      </Pressable>
      {expanded ? (
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
      ) : null}
    </View>
  );
}

function ReviewSection({ title, rows, textColor, mutedColor }: { title: string; rows: Array<{ title: string; body?: string }>; textColor: string; mutedColor: string }) {
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
  return <View style={[embedded ? styles.embedded : styles.card, { backgroundColor, borderColor }, style]}>{children}</View>;
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
  stableCardSlot: { minHeight: 270 }, stableEmbeddedSlot: { minHeight: 250 },
  headerRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 11 },
  compassIcon: { width: 48, height: 48 }, iconPlaceholder: { width: 48, height: 48, borderRadius: 16 },
  headerCopy: { flex: 1, minWidth: 0 }, title: { fontWeight: '900', letterSpacing: -0.3 }, status: { marginTop: 3, lineHeight: 17, fontWeight: '600' },
  badges: { alignItems: 'flex-end', gap: 5 }, aiBadge: { minHeight: 24, justifyContent: 'center', borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 9 }, aiBadgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.35 },
  snapshotWrap: { gap: 9 }, sectionEyebrow: { fontWeight: '900', letterSpacing: 0.9 }, metricsRow: { flexDirection: 'row', gap: 6 },
  metric: { flex: 1, minWidth: 0 }, metricValue: { fontWeight: '900' }, metricLabel: { marginTop: 2, lineHeight: 13, fontWeight: '600' },
  progressTrack: { height: 5, borderRadius: 999, overflow: 'hidden' }, progressFill: { height: '100%', borderRadius: 999, maxWidth: '100%' },
  signalPanel: { minHeight: 112, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 15, overflow: 'hidden' },
  sweep: { position: 'absolute', top: -60, bottom: -60, width: 52, opacity: 0.10 },
  offerContent: { gap: 12 }, offerTitle: { fontWeight: '900', lineHeight: 22 }, valueList: { gap: 8 }, valueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, valueText: { flex: 1, lineHeight: 21, fontWeight: '600' },
  primaryButton: { minHeight: 50, borderRadius: 15, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }, primaryButtonText: { flex: 1, textAlign: 'center', fontWeight: '900', fontSize: 15 },
  pendingBlock: { minHeight: 80, justifyContent: 'center', gap: 12 }, pendingTitle: { fontWeight: '800', lineHeight: 22 }, secondaryButton: { minHeight: 46, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, secondaryButtonText: { fontWeight: '800' },
  reviewContent: { gap: 11 }, headline: { fontSize: 20, lineHeight: 25, fontWeight: '900', letterSpacing: -0.35 }, summary: { lineHeight: 22 },
  expandButton: { minHeight: 46, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, expandText: { fontWeight: '800' },
  details: { gap: 17, paddingTop: 4 }, section: { gap: 9 }, sectionTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
  insightRow: { flexDirection: 'row', gap: 9 }, insightDot: { width: 6, height: 6, borderRadius: 99, marginTop: 7 }, insightCopy: { flex: 1, gap: 3 }, insightTitle: { fontSize: 15, lineHeight: 21, fontWeight: '800' }, insightBody: { fontSize: 14, lineHeight: 21 },
  planButton: { minHeight: 52, borderRadius: 15, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }, orderDot: { width: 25, height: 25, borderRadius: 99, alignItems: 'center', justifyContent: 'center' }, orderText: { fontSize: 12, fontWeight: '900' }, planText: { flex: 1, fontSize: 14, lineHeight: 19, fontWeight: '900' },
  coverage: { fontSize: 12, lineHeight: 17, fontWeight: '600' }, loadingGeometry: { gap: 12 },
});
