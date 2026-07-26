// зачем: дословный RN-порт source/src/shell/ActivityShell.tsx (165 строк) + его CSS
// (.ashell* из base.css). Главное свойство каркаса — геометрия НЕ меняется между шестью
// состояниями: header → prompt lane → interaction lane → feedback lane → footer.
// Меняются только цвета из токенов, copy из фикстуры и primary-действие.
import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useRuntimeActive } from '../../../hooks/use_runtime_active';
import { IntentButton, GraphemeText } from './primitives';
import type { LabIntentEvent } from './LabState';
import {
  C,
  LEADING,
  RADIUS,
  SPACE,
  STATE_COLORS,
  STATE_META,
  TEXT,
  WEIGHT,
  withAlpha,
  type CanonicalState,
  type ModeAccent,
} from './tokens';

export interface ActivityShellAction {
  readonly label: string;
  readonly intent: string;
  readonly payload?: unknown;
}

export interface ActivityShellProps {
  readonly surfaceId: string;
  readonly state: CanonicalState;
  readonly title: string;
  readonly subtitle?: string;
  /** Prompt lane — задача/вопрос активности. Стабильный слот. */
  readonly prompt?: React.ReactNode;
  /** Строка статуса из фикстуры (copy.statusMessages[state]). */
  readonly statusMessage: string;
  /** Содержимое feedback lane (подсказки, раскрытые ответы, панели восстановления). */
  readonly feedback?: React.ReactNode;
  readonly primaryAction: ActivityShellAction;
  readonly primaryDisabled?: boolean;
  readonly secondaryAction?: ActivityShellAction;
  readonly onIntent: (event: LabIntentEvent) => void;
  /** Чипы условий в стабильной feedback lane. */
  readonly conditionChips?: React.ReactNode;
  readonly mode?: ModeAccent;
  /** Interaction lane — варианты, сетки, плееры. */
  readonly children: React.ReactNode;
}

export const ActivityShell = memo(function ActivityShell(props: ActivityShellProps) {
  const {
    surfaceId,
    state,
    title,
    subtitle,
    prompt,
    statusMessage,
    feedback,
    primaryAction,
    primaryDisabled = false,
    secondaryAction,
    onIntent,
    conditionChips,
    children,
  } = props;

  const meta = STATE_META[state];
  const isProcessing = state === 'processing';
  const stateColor = STATE_COLORS[state];

  return (
    <View style={s.shell}>
      <View style={s.header}>
        <View style={[s.badge, { backgroundColor: stateColor.bg, borderColor: stateColor.border }]}>{/* guard-ok: state-бейдж Kimi, граница = смысл состояния */}
          <Text style={[s.badgeText, { color: stateColor.fg }]}>{meta.label.toUpperCase()}</Text>
        </View>
        <View style={s.headings}>
          <GraphemeText text={title} maxGraphemes={60} style={s.title} />
          {subtitle ? <GraphemeText text={subtitle} maxGraphemes={80} style={s.subtitle} /> : null}
        </View>
      </View>

      {prompt ? <View style={s.promptLane}>{prompt}</View> : null}

      <ScrollView
        // guard-ok: interaction lane — короткий фиксированный список вариантов режима,
        // виртуализация здесь дороже самого содержимого
        style={s.contentScroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>

      <View style={[s.statusLane, { backgroundColor: stateColor.bg }]}>
        <View style={s.statusRow}>
          <View style={[s.statusDot, { backgroundColor: stateColor.fg }]} />
          <GraphemeText
            text={statusMessage}
            maxGraphemes={140}
            style={[s.statusMessage, { color: stateColor.fg }]}
          />
        </View>
        {isProcessing ? <InlineProgress color={stateColor.fg} /> : null}
        {feedback ? <View style={s.feedback}>{feedback}</View> : null}
        {conditionChips ? <View style={s.chips}>{conditionChips}</View> : null}
      </View>

      <View style={s.actions}>
        <IntentButton
          surfaceId={surfaceId}
          intent={primaryAction.intent}
          payload={primaryAction.payload}
          onIntent={onIntent}
          variant="primary"
          disabled={isProcessing || primaryDisabled}
          style={s.primary}
          accessibilityLabel={primaryAction.label}
          testID={`kimi-primary-${surfaceId}`}
        >
          {primaryAction.label}
        </IntentButton>
        {secondaryAction ? (
          <IntentButton
            surfaceId={surfaceId}
            intent={secondaryAction.intent}
            payload={secondaryAction.payload}
            onIntent={onIntent}
            variant="ghost"
            disabled={isProcessing}
            accessibilityLabel={secondaryAction.label}
            testID={`kimi-secondary-${surfaceId}`}
          >
            {secondaryAction.label}
          </IntentButton>
        ) : null}
      </View>
    </View>
  );
});

/**
 * Inline-прогресс processing (.ashell__progress). Kimi: полоса едет слева направо,
 * НИКОГДА не полноэкранный спиннер.
 */
const InlineProgress = memo(function InlineProgress({ color }: { readonly color: string }) {
  const slide = useRef(new Animated.Value(0)).current;
  // зачем: perf-контракт репо — бесконечный цикл анимации обязан глохнуть на фоне
  const runtimeActive = useRuntimeActive();

  useEffect(() => {
    if (!runtimeActive) {
      slide.stopAnimation();
      return;
    }
    const loop = Animated.loop(
      Animated.timing(slide, {
        toValue: 1,
        duration: 1200,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [runtimeActive, slide]);

  return (
    <View style={[s.progressTrack, { backgroundColor: withAlpha('#FFFFFF', 0.18) }]}>
      <Animated.View
        style={[
          s.progressFill,
          {
            backgroundColor: color,
            transform: [
              {
                translateX: slide.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['-110%', '280%'] as unknown as number[],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );
});

const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: C.bgCanvas },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACE.s3,
    paddingTop: SPACE.s4,
    paddingBottom: SPACE.s3,
    paddingHorizontal: SPACE.s4,
    // guard-ok: односторонний разделитель полос каркаса Kimi (.ashell__header)
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.borderDefault,
  },
  badge: {
    paddingVertical: SPACE.s1,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5, // guard-ok: state-бейдж дизайн-системы Kimi (.ashell__state-badge)
  },
  badgeText: {
    fontSize: TEXT.xs,
    fontWeight: WEIGHT.bold,
    letterSpacing: 0.6,
  },
  headings: { flex: 1, minWidth: 0 },
  title: {
    fontSize: TEXT.xl,
    fontWeight: WEIGHT.bold,
    lineHeight: TEXT.xl * LEADING.tight,
    color: C.fgPrimary,
  },
  subtitle: {
    fontSize: TEXT.sm,
    color: C.fgSecondary,
    marginTop: SPACE.s1,
  },
  promptLane: {
    paddingVertical: SPACE.s2,
    paddingHorizontal: SPACE.s4,
  },
  contentScroll: { flex: 1 },
  content: {
    paddingVertical: SPACE.s4,
    paddingHorizontal: SPACE.s4,
  },
  statusLane: {
    minHeight: 88,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s4,
    // guard-ok: односторонний разделитель полосы feedback (.ashell__status)
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.borderDefault,
    gap: SPACE.s2,
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACE.s2,
  },
  statusDot: {
    width: 8,
    height: 8,
    marginTop: 6,
    borderRadius: RADIUS.pill,
  },
  statusMessage: {
    flex: 1,
    fontSize: TEXT.md,
    lineHeight: TEXT.md * LEADING.snug,
  },
  progressTrack: {
    height: 8,
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '40%',
    borderRadius: RADIUS.pill,
  },
  feedback: {},
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s1 },
  actions: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s3,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s4,
    // guard-ok: односторонний разделитель футера (.ashell__actions)
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.borderDefault,
    backgroundColor: C.bgSurface,
  },
  primary: { flex: 1 },
});
