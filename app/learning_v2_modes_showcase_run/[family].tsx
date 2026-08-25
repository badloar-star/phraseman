// ─── Learning V2 · полноэкранный runner одного из 7 одобренных режимов ───
// зачем: владелец потребовал ПОЛНОЦЕННЫЙ работающий экран на весь размер (не
// превью-карточку в скролле) и пробный МИНИ-УРОК из нескольких заданий
// подряд, чтобы проверить и сам режим, и анимацию перехода между заданиями
// (docs/v2/04-activity-catalog-and-storyboards.md, storyboard B5 — "уход
// влево 110мс + приход справа 110мс") — точно так же, как в боевом плеере
// (app/learning_v2_direct_session_player_v1.tsx), который использует ту же
// SlideInRight/SlideOutLeft анимацию для переходов между practiceIndex.
//
// Мини-урок = все 7 фикстур подряд, начиная с выбранного режима — так видно
// и конкретный режим, и честный переход между РАЗНЫМИ визуальными режимами
// (не только внутри одного), как это будет в настоящем уроке.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { SlideInRight, SlideOutLeft, useReducedMotion } from 'react-native-reanimated';
import ScreenGradient from '../../components/ScreenGradient';
import { DeferredRedirect } from '../../components/DeferredRedirect';
import { useTheme } from '../../components/ThemeContext';
import { IS_STORE_RELEASE } from '../config';
import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
import { rememberNavigationPath, safeRouterBack } from '../navigation_back';
import { LEARNING_V2_MODES_SHOWCASE_ROUTE } from '../../constants/devRoutes';
import { hapticTap } from '../../hooks/use-haptics';
import { cs } from '../../components/dev/motion_showcase/showcase_copy';
import LearningV2ModeRouterV1 from '../../modules/learning-v2/modes/mode_router_v1';
import ScriptedRepeatCompareModeV1 from '../../modules/learning-v2/modes/scripted_repeat_compare_mode_v1';
import { useLearningV2DevShowcaseModeHostV1 } from '../../modules/learning-v2/modes/use_dev_showcase_mode_host_v1';
import {
  LEARNING_V2_SHOWCASE_TEXT_FAMILIES_V1,
  LEARNING_V2_MODE_SHOWCASE_FIXTURES_V1,
  LEARNING_V2_MODE_SHOWCASE_VOICE_FIXTURE_V1,
  isLearningV2ModeShowcaseTextFamilyV1,
  type LearningV2ModeShowcaseFixtureV1,
} from '../../modules/learning-v2/modes/dev_showcase_fixtures_v1';
import type { LearningV2ActivityFamilyCode } from '../../modules/learning-v2/telemetry';

type ShowcaseLessonItem =
  | LearningV2ModeShowcaseFixtureV1
  | typeof LEARNING_V2_MODE_SHOWCASE_VOICE_FIXTURE_V1;

/** Мини-урок начинается с выбранного режима, затем идут остальные 6 по
 * порядку витрины — так первое, что видит владелец, это именно тот режим,
 * на который он тапнул в списке-меню. */
function buildShowcaseLesson(startFamily: LearningV2ActivityFamilyCode): readonly ShowcaseLessonItem[] {
  const all: readonly ShowcaseLessonItem[] = [
    ...LEARNING_V2_SHOWCASE_TEXT_FAMILIES_V1.map((family) => LEARNING_V2_MODE_SHOWCASE_FIXTURES_V1[family]),
    LEARNING_V2_MODE_SHOWCASE_VOICE_FIXTURE_V1,
  ];
  const startIndex = all.findIndex((item) => item.family === startFamily);
  if (startIndex <= 0) return all;
  return [...all.slice(startIndex), ...all.slice(0, startIndex)];
}

function TextModeStage({
  item,
  onAdvance,
}: {
  readonly item: LearningV2ModeShowcaseFixtureV1;
  readonly onAdvance: () => void;
}) {
  const { theme: t } = useTheme();
  const host = useLearningV2DevShowcaseModeHostV1(item.options, item.correctResponseId, item.inputMode);
  return (
    <View style={styles.stage}>
      <LearningV2ModeRouterV1
        family={item.family}
        phase={host.phase}
        prompt={item.prompt}
        options={item.options}
        selectedChoiceId={host.selectedChoiceId}
        orderedResponseIds={host.orderedResponseIds}
        wrongNudge={host.wrongNudge}
        reducedMotion={false}
        resolved={host.resolved}
        explanation={host.phase === 'needs_work' ? item.explanation : null}
        onPick={host.onPick}
        onAppendToken={host.onAppendToken}
        onUndoToken={host.onUndoToken}
        onPlaySelectableAudio={() => {}}
        onPlayFullPhraseAudio={null}
        onSubmit={host.evaluateDemo}
        canSubmit={host.canSubmit}
      />
      <View style={styles.dock}>
        <Pressable
          onPress={host.phase === 'success' ? onAdvance : host.evaluateDemo}
          disabled={host.phase !== 'success' && !host.canSubmit}
          accessibilityRole="button"
          accessibilityLabel={host.phase === 'success' ? cs('lv2_showcase_next') : cs('lv2_showcase_check')}
          accessibilityState={{ disabled: host.phase !== 'success' && !host.canSubmit }}
          style={[
            styles.dockButton,
            {
              backgroundColor:
                host.phase === 'success' ? t.accent : host.canSubmit ? t.accent : t.bgSurface,
              opacity: host.phase !== 'success' && !host.canSubmit ? 0.5 : 1,
            },
          ]}
        >
          <Text style={[styles.dockButtonText, { color: t.correctText }]}>
            {host.phase === 'success' ? cs('lv2_showcase_next') : cs('lv2_showcase_check')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function VoiceModeStage({ onAdvance }: { readonly onAdvance: () => void }) {
  const { theme: t } = useTheme();
  const item = LEARNING_V2_MODE_SHOWCASE_VOICE_FIXTURE_V1;
  return (
    <View style={styles.stage}>
      <ScriptedRepeatCompareModeV1
        family={item.family}
        phase="idle"
        prompt={item.prompt}
        options={[]}
        selectedChoiceId={null}
        orderedResponseIds={[]}
        wrongNudge={{ responseId: null, token: 0 }}
        reducedMotion={false}
        resolved={false}
        explanation={null}
        onPick={() => {}}
        onAppendToken={() => {}}
        onUndoToken={() => {}}
        onPlaySelectableAudio={() => {}}
        onPlayFullPhraseAudio={null}
        onSubmit={() => {}}
        canSubmit={false}
        voiceStatus="idle"
        transcript=""
        instruction={item.instruction}
      />
      <View style={styles.dock}>
        {/* зачем: реальный hold-to-talk жест намеренно не дублируется здесь
            (живёт в app/learning_v2_direct_session_player_v1.tsx) — риск
            конфликта с настоящим микрофоном в DEV-витрине. "Дальше" просто
            продолжает пробный мини-урок. */}
        <Pressable
          onPress={onAdvance}
          accessibilityRole="button"
          accessibilityLabel={cs('lv2_showcase_voice_next')}
          style={[styles.dockButton, { backgroundColor: t.accent }]}
        >
          <Text style={[styles.dockButtonText, { color: t.correctText }]}>{cs('lv2_showcase_voice_next')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function LearningV2ModesShowcaseRunScreen() {
  // зачем: та же production-safe защита, что gate-файлы motion_showcase.tsx/
  // learning_v2_modes_showcase.tsx — динамический маршрут [family] не может
  // использовать require-gate паттерн (нет одного статичного дочернего
  // компонента), поэтому проверка встроена прямо в тело экрана.
  if (!__DEV__ || IS_STORE_RELEASE) {
    return <DeferredRedirect href={'/(tabs)/home' as any} />;
  }
  return <LearningV2ModesShowcaseRunReal />;
}

function LearningV2ModesShowcaseRunReal() {
  const { theme: t, f } = useTheme();
  const insets = useStableSafeAreaInsets();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const params = useLocalSearchParams<{ family?: string }>();
  const startFamily: LearningV2ActivityFamilyCode =
    params.family && isLearningV2ModeShowcaseTextFamilyV1(params.family)
      ? params.family
      : params.family === 'scripted_repeat_compare'
        ? params.family
        : 'phrase_builder';

  const lesson = useMemo(() => buildShowcaseLesson(startFamily), [startFamily]);
  const [stepIndex, setStepIndex] = useState(0);
  const current = lesson[stepIndex];
  const done = stepIndex >= lesson.length;

  useEffect(() => {
    rememberNavigationPath(`${LEARNING_V2_MODES_SHOWCASE_ROUTE}`);
  }, []);

  const advance = useCallback(() => {
    hapticTap();
    setStepIndex((value) => value + 1);
  }, []);

  const close = useCallback(() => {
    safeRouterBack(router, LEARNING_V2_MODES_SHOWCASE_ROUTE as never);
  }, [router]);

  return (
    <View style={[styles.screen, { backgroundColor: t.bgPrimary }]}>
      <ScreenGradient />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={cs('lv2_showcase_close')}
          hitSlop={10}
          onPress={close}
          style={({ pressed }) => [
            styles.iconButton,
            { backgroundColor: t.bgCard, opacity: pressed ? 0.72 : 1 },
          ]}
        >
          <Ionicons name="close" size={22} color={t.textPrimary} />
        </Pressable>
        <View style={styles.progressColumn}>
          <View style={[styles.progressTrack, { backgroundColor: t.bgSurface2 }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: t.accent,
                  width: `${Math.max(4, Math.round(((Math.min(stepIndex, lesson.length) + 1) / lesson.length) * 100))}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: t.textMuted, fontSize: f.caption }]}>
            {Math.min(stepIndex + 1, lesson.length)} / {lesson.length} · {done ? cs('lv2_showcase_done_status') : current.title}
          </Text>
        </View>
      </View>

      {!done ? (
        <Animated.View
          key={`showcase-step-${stepIndex}`}
          style={styles.body}
          entering={reducedMotion ? undefined : SlideInRight.duration(110)}
          exiting={reducedMotion ? undefined : SlideOutLeft.duration(110)}
        >
          {current.family === 'scripted_repeat_compare' ? (
            <VoiceModeStage onAdvance={advance} />
          ) : (
            <TextModeStage item={current as LearningV2ModeShowcaseFixtureV1} onAdvance={advance} />
          )}
        </Animated.View>
      ) : (
        <View style={styles.body}>
          <View style={[styles.doneCard, { backgroundColor: t.bgCard }]}>
            <Ionicons name="checkmark-circle" size={40} color={t.correct} />
            <Text style={[styles.doneTitle, { color: t.textPrimary, fontSize: f.h3 }]}>
              {cs('lv2_showcase_done_title')}
            </Text>
            <Text style={[styles.doneSubtitle, { color: t.textMuted, fontSize: f.caption }]}>
              {cs('lv2_showcase_done_subtitle')}
            </Text>
            <Pressable
              onPress={() => setStepIndex(0)}
              accessibilityRole="button"
              accessibilityLabel={cs('lv2_showcase_again')}
              style={[styles.dockButton, { backgroundColor: t.accent, marginTop: 16 }]}
            >
              <Text style={[styles.dockButtonText, { color: t.correctText }]}>{cs('lv2_showcase_again')}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressColumn: { flex: 1, gap: 6 },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontWeight: '700' },
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  stage: { flex: 1, justifyContent: 'space-between' },
  dock: { paddingBottom: 16, paddingTop: 12 },
  dockButton: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockButtonText: { fontWeight: '800', fontSize: 15 },
  doneCard: {
    flex: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  doneTitle: { fontWeight: '800', marginTop: 12 },
  doneSubtitle: { marginTop: 6, textAlign: 'center' },
});
