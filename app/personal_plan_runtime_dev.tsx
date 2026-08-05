import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { safeRouterBack } from './navigation_back';

import { LinearGradient } from '../components/SafeLinearGradient';
import { useTheme } from '../components/ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import type { PlanMinutesChoice } from './personal_plan_catalog';
import { createAsyncStoragePlanDayRuntimeStorageAdapter } from './personal_plan_day_runtime_async_storage';
import {
  createPlanDayRuntimeScreenController,
  type PlanDayRuntimeScreenController,
} from './personal_plan_day_runtime_screen_controller';
import type { PlanDayRuntimeScreenModel } from './personal_plan_day_runtime_screen_model';
import type { PlanDayRuntimeLoop } from './personal_plan_day_runtime_loop_coordinator';
import {
  buildGavanWeek1CanonicalRuntimeBridge,
  buildGavanWeek1CanonicalRuntimeBundles,
  type GavanWeek1RuntimeBridgeDayIndex,
} from './personal_plan_gavan_week1_runtime_bridge';

import { noAndroidOutline } from '../constants/androidGlow';
const minuteChoices: PlanMinutesChoice[] = [5, 10, 15, 20];
const dayChoices: GavanWeek1RuntimeBridgeDayIndex[] = [1, 2, 3, 4, 5, 6, 7];

function planInstanceIdFor(dayIndex: GavanWeek1RuntimeBridgeDayIndex): string {
  return `dev-runtime-gavan-week1-day${dayIndex}-v1`;
}

type RuntimeDevState =
  | {
    status: 'loading';
  }
  | {
    status: 'ready';
    source: 'fresh' | 'persisted';
    loop: PlanDayRuntimeLoop;
    screenModel: PlanDayRuntimeScreenModel;
  }
  | {
    status: 'blocked';
    issues: string[];
  };

type BlockedRuntimeController = {
  status: 'blocked';
  issues: string[];
};

function isBlockedRuntimeController(
  value: PlanDayRuntimeScreenController | BlockedRuntimeController,
): value is BlockedRuntimeController {
  return 'status' in value && value.status === 'blocked';
}

function buildController(
  minutesPerDay: PlanMinutesChoice,
  dayIndex: GavanWeek1RuntimeBridgeDayIndex,
): PlanDayRuntimeScreenController | BlockedRuntimeController {
  const bridge = buildGavanWeek1CanonicalRuntimeBridge({ dayIndex });
  const bundles = buildGavanWeek1CanonicalRuntimeBundles({ dayIndex });
  if (bundles.status !== 'ready') {
    return {
      status: 'blocked',
      issues: bundles.issues,
    };
  }

  return createPlanDayRuntimeScreenController({
    storage: createAsyncStoragePlanDayRuntimeStorageAdapter(),
    bundles: bundles.bundles,
    minutesPerDay,
    planInstanceId: planInstanceIdFor(dayIndex),
    planId: 'gavan',
    dayIndex,
    sessionIdPrefix: `runtime-dev:gavan-week1-day${dayIndex}`,
  });
}

export default function PersonalPlanRuntimeDevScreen() {
  const router = useRouter();
  const { theme: t, themeMode } = useTheme();
  const [minutesPerDay, setMinutesPerDay] = useState<PlanMinutesChoice>(15);
  const [selectedDayIndex, setSelectedDayIndex] = useState<GavanWeek1RuntimeBridgeDayIndex>(1);
  const [state, setState] = useState<RuntimeDevState>({ status: 'loading' });
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isGold = themeMode === 'gold';
  const accent = isGold ? '#FFE8A8' : t.accent;
  const actionText = isGold ? '#1B1205' : '#08110C';
  const screenBg = isGold ? '#090704' : t.bgPrimary;
  const cardBorder = isGold ? 'rgba(255,232,168,0.30)' : t.border;

  const bridgePreview = useMemo(
    () => buildGavanWeek1CanonicalRuntimeBridge({ dayIndex: selectedDayIndex }),
    [selectedDayIndex],
  );
  const controller = useMemo(
    () => buildController(minutesPerDay, selectedDayIndex),
    [minutesPerDay, selectedDayIndex],
  );

  const hydrate = useCallback(async () => {
    setState({ status: 'loading' });
    setMessage(null);
    setSelectedAnswer('');

    if (isBlockedRuntimeController(controller)) {
      setState(controller);
      return;
    }

    const result = await controller.hydrate();
    if (result.status !== 'ready') {
      setState({
        status: 'blocked',
        issues: result.issues,
      });
      return;
    }

    setState(result);
  }, [controller]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const answer = async () => {
    if (state.status !== 'ready' || saving) return;
    if (isBlockedRuntimeController(controller)) {
      setMessage(`Runtime остановлен: ${controller.issues.join(', ')}`);
      return;
    }
    const cleanAnswer = selectedAnswer.trim();
    if (!cleanAnswer) {
      setMessage('Выбери ответ или введи фразу.');
      return;
    }

    hapticTap();
    setSaving(true);
    const result = await controller.answer(state.loop, {
      selectedAnswer: cleanAnswer,
      occurredAt: new Date().toISOString(),
    });
    if (result.status !== 'ready') {
      setSaving(false);
      setMessage(`Проверка остановлена: ${result.issues.join(', ')}`);
      return;
    }

    const persisted = await controller.persist(result.loop);
    setSaving(false);
    setSelectedAnswer('');

    if (persisted.status !== 'ready') {
      setMessage(`Ответ принят, но сохранение остановлено: ${persisted.issues.join(', ')}`);
    } else {
      setMessage(result.answer.submission.isCorrect
        ? 'Верно. Идём дальше.'
        : 'Пока нет. Фраза вернётся позже без лишней драмы.');
    }

    setState({
      status: 'ready',
      source: 'persisted',
      loop: result.loop,
      screenModel: result.screenModel,
    });
  };

  const reset = async () => {
    hapticTap();
    if (isBlockedRuntimeController(controller)) return;
    await controller.reset();
    await hydrate();
  };

  const activeExercise = state.status === 'ready' ? state.screenModel.activeExercise : undefined;
  const current = activeExercise?.current;
  const completion = state.status === 'ready' ? state.screenModel.completion : undefined;
  const phraseBuildTiles = current?.tileInputExpected
    ? [...current.wordTiles, ...current.distractorTiles]
    : [];
  const selectedBuildTiles = selectedAnswer.trim().split(/\s+/).filter(Boolean);
  const isChoiceMode = current?.exerciseType === 'plan_choose_natural_phrase';
  const isMissingWordMode = current?.exerciseType === 'plan_missing_word';
  const isPhraseRecallMode = current?.exerciseType === 'plan_phrase_recall';
  const appendTile = (tile: string) => {
    hapticTap();
    setSelectedAnswer((previous) => [previous.trim(), tile].filter(Boolean).join(' '));
  };
  const removeSelectedTile = (indexToRemove: number) => {
    hapticTap();
    setSelectedAnswer((previous) =>
      previous
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .filter((_, index) => index !== indexToRemove)
        .join(' '),
    );
  };

  return (
    <SafeAreaView testID="plan-runtime-dev-screen" style={[styles.safe, { backgroundColor: screenBg }]}>
      <LinearGradient colors={isGold ? ['#171008', '#090704'] : t.bgGradient} style={styles.fill}>
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.78}
            onPress={() => safeRouterBack(router, '/personal_plan')}
            accessibilityRole="button"
            accessibilityLabel="Назад"
            style={[styles.back, { backgroundColor: t.bgSurface2, borderColor: cardBorder }]}
          >
            <Text style={[styles.backText, { color: t.textPrimary }]}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={[styles.kicker, { color: t.textMuted }]}>DEV · новый runtime</Text>
            <Text style={[styles.h1, { color: t.textPrimary }]} numberOfLines={1}>
              Гавань · день {selectedDayIndex}
            </Text>
          </View>
        </View>

        <ScrollView decelerationRate="fast" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.dayRow}>
            {dayChoices.map((choice) => {
              const active = choice === selectedDayIndex;
              return (
                <TouchableOpacity
                  key={choice}
                  activeOpacity={0.82}
                  onPress={() => {
                    hapticTap();
                    setSelectedDayIndex(choice);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  testID={`plan-runtime-day-${choice}`}
                  style={[
                    styles.dayButton,
                    {
                      borderColor: active ? accent : cardBorder,
                      backgroundColor: active ? accent + '22' : t.bgSurface2,
                    },
                  ]}
                >
                  <Text style={[styles.dayText, { color: active ? accent : t.textPrimary }]}>
                    {choice}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.minuteRow}>
            {minuteChoices.map((choice) => {
              const active = choice === minutesPerDay;
              return (
                <TouchableOpacity
                  key={choice}
                  activeOpacity={0.82}
                  onPress={() => {
                    hapticTap();
                    setMinutesPerDay(choice);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  testID={`plan-runtime-minute-${choice}`}
                  style={[
                    styles.minuteButton,
                    {
                      borderColor: active ? accent : cardBorder,
                      backgroundColor: active ? accent + '22' : t.bgSurface2,
                    },
                  ]}
                >
                  <Text style={[styles.minuteText, { color: active ? accent : t.textPrimary }]}>{choice} мин</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {state.status === 'loading' ? (
            <View style={[styles.panel, styles.centerPanel, { borderColor: cardBorder, backgroundColor: t.bgCard }]}>
              <ActivityIndicator color={accent} />
              <Text style={[styles.bodyText, { color: t.textMuted }]}>Собираем задания дня...</Text>
            </View>
          ) : null}

          {state.status === 'blocked' ? (
            <View style={[styles.panel, { borderColor: t.wrong + '66', backgroundColor: t.wrongBg }]}>
              <Text style={[styles.cardTitle, { color: t.textPrimary }]}>Runtime остановлен</Text>
              <Text style={[styles.bodyText, { color: t.textMuted }]}>{state.issues.join(', ')}</Text>
            </View>
          ) : null}

          {state.status === 'ready' ? (
            <>
              <View testID="plan-runtime-progress" style={[styles.panel, { borderColor: accent + '66', backgroundColor: t.bgCard }]}>
                <View style={styles.progressTop}>
                      <View>
                        <Text style={[styles.kicker, { color: t.textMuted }]}>
                          Гавань · день {selectedDayIndex}
                        </Text>
                        <Text style={[styles.cardTitle, { color: t.textPrimary }]}>
                          {bridgePreview.dayTitleRu}
                        </Text>
                      </View>
                      <Text style={[styles.percent, { color: accent }]}>{state.screenModel.header.percentLabel}</Text>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: t.bgSurface2 }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: accent,
                        width: `${state.screenModel.progress.percent}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.bodyText, { color: t.textMuted }]}>
                  {state.screenModel.progress.label} · {state.screenModel.progress.estimatedMinutesLabel}
                </Text>
                {bridgePreview.deferredBlocks.length > 0 ? (
                  <Text style={[styles.bodyText, { color: t.textMuted, marginTop: 6 }]}>
                    DEV: {bridgePreview.deferredBlocks.length} будущих режимов ждут renderer/audio bridge.
                  </Text>
                ) : null}
              </View>

              {completion ? (
                <View style={[styles.panel, { borderColor: accent + '66', backgroundColor: accent + '14' }]}>
                  <Text style={[styles.cardTitle, { color: t.textPrimary }]}>{completion.title}</Text>
                  <Text style={[styles.bodyText, { color: t.textMuted }]}>{completion.text}</Text>
                  <TouchableOpacity
                    activeOpacity={0.82}
                    onPress={reset}
                    accessibilityRole="button"
                    accessibilityLabel="Сбросить DEV-прогресс"
                    testID="plan-runtime-reset-completion"
                    style={[styles.primaryButton, { backgroundColor: t.bgSurface2, borderColor: cardBorder }]}
                  >
                    <Text style={[styles.primaryButtonText, { color: t.textPrimary }]}>Сбросить DEV-прогресс</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {activeExercise && current ? (
                <View testID="plan-runtime-active-exercise" style={[styles.exercisePanel, { borderColor: accent + '66', backgroundColor: t.bgCard, shadowColor: accent }]}>
                  <Text style={[styles.kicker, { color: t.textMuted }]}>{activeExercise.eyebrow}</Text>
                  <Text style={[styles.exerciseTitle, { color: t.textPrimary }]}>{activeExercise.title}</Text>

                  {isMissingWordMode ? (
                    <View style={styles.modeSurface}>
                      <Text style={[styles.modeLabel, { color: accent }]}>СЛОВО В ФРАЗЕ</Text>
                      <Text style={[styles.blankSentence, { color: t.textPrimary }]}>{current.displayEnglish}</Text>
                      <Text style={[styles.meaningText, { color: t.textMuted }]}>Смысл: {current.targetRu}</Text>
                      <Text style={[styles.modeHint, { color: t.textMuted }]}>Нажми слово, которое закрывает пропуск.</Text>
                    </View>
                  ) : isChoiceMode ? (
                    <View style={styles.modeSurface}>
                      <Text style={[styles.modeLabel, { color: accent }]}>ВЫБЕРИ ЖИВУЮ ФРАЗУ</Text>
                      <Text style={[styles.meaningHeadline, { color: t.textPrimary }]}>{current.targetRu}</Text>
                      <Text style={[styles.modeHint, { color: t.textMuted }]}>Ищи вариант, который нормально звучит в разговоре.</Text>
                    </View>
                  ) : current.tileInputExpected ? (
                    <View style={styles.modeSurface}>
                      <Text style={[styles.modeLabel, { color: accent }]}>СОБЕРИ ФРАЗУ</Text>
                      <Text style={[styles.meaningHeadline, { color: t.textPrimary }]}>{current.targetRu}</Text>
                      <Text style={[styles.modeHint, { color: t.textMuted }]}>Выбирай слова снизу: они появятся в поле ответа.</Text>
                    </View>
                  ) : isPhraseRecallMode ? (
                    <View style={styles.modeSurface}>
                      <Text style={[styles.modeLabel, { color: accent }]}>ВСПОМНИ БЕЗ ВАРИАНТОВ</Text>
                      <Text style={[styles.meaningHeadline, { color: t.textPrimary }]}>{current.targetRu}</Text>
                      <Text style={[styles.modeHint, { color: t.textMuted }]}>Напиши английскую фразу сам.</Text>
                    </View>
                  ) : (
                    <>
                      <Text style={[styles.prompt, { color: t.textPrimary }]}>{current.targetRu}</Text>
                      <Text style={[styles.instruction, { color: t.textMuted }]}>{activeExercise.instruction}</Text>
                    </>
                  )}

                  {current.tileInputExpected ? (
                    <View style={styles.tileBuilder}>
                      <View style={[styles.assembledAnswer, { borderColor: cardBorder, backgroundColor: t.bgSurface2 }]}>
                        {selectedBuildTiles.length > 0 ? (
                          <View style={styles.selectedTileRow}>
                            {selectedBuildTiles.map((tile, index) => (
                              <TouchableOpacity
                                key={`${tile}:selected:${index}`}
                                activeOpacity={0.82}
                                onPress={() => removeSelectedTile(index)}
                                accessibilityRole="button"
                                testID={`plan-runtime-selected-tile-${index + 1}`}
                                style={[styles.selectedTile, { borderColor: accent + '77', backgroundColor: accent + '18' }]}
                              >
                                <Text style={[styles.selectedTileText, { color: t.textPrimary }]}>{tile}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        ) : (
                          <Text style={[styles.answerPlaceholder, { color: t.textMuted }]}>Слова появятся здесь</Text>
                        )}
                      </View>
                      <Text style={[styles.modeHint, { color: t.textMuted }]}>Банк слов</Text>
                      <View style={styles.tileGrid}>
                        {phraseBuildTiles.map((tile, index) => (
                          <TouchableOpacity
                            key={`${tile}:${index}`}
                            activeOpacity={0.82}
                            onPress={() => appendTile(tile)}
                            accessibilityRole="button"
                            testID={`plan-runtime-word-tile-${index + 1}`}
                            style={[styles.wordTile, { borderColor: cardBorder, backgroundColor: t.bgSurface2 }]}
                          >
                            <Text style={[styles.wordTileText, { color: t.textPrimary }]}>{tile}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <TouchableOpacity
                        activeOpacity={0.82}
                        onPress={() => setSelectedAnswer('')}
                        accessibilityRole="button"
                        testID="plan-runtime-clear-tiles"
                        style={[styles.clearTilesButton, { borderColor: cardBorder }]}
                      >
                        <Text style={[styles.clearTilesText, { color: t.textMuted }]}>Очистить</Text>
                      </TouchableOpacity>
                    </View>
                  ) : current.freeInputExpected ? (
                    <TextInput
                      value={selectedAnswer}
                      onChangeText={setSelectedAnswer}
                      autoCapitalize="none"
                      autoCorrect={false}
                      placeholder="Введи английскую фразу"
                      placeholderTextColor={t.textMuted}
                      testID="plan-runtime-free-input"
                      style={[
                        styles.input,
                        {
                          borderColor: cardBorder,
                          backgroundColor: t.bgSurface2,
                          color: t.textPrimary,
                        },
                      ]}
                    />
                  ) : (
                    <View style={isMissingWordMode ? styles.choiceChipGrid : styles.choiceList}>
                      {current.choices.map((choice, index) => {
                        const selected = selectedAnswer === choice.text;
                        return (
                          <TouchableOpacity
                            key={choice.id}
                            activeOpacity={0.82}
                            onPress={() => {
                              hapticTap();
                              setSelectedAnswer(choice.text);
                            }}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            testID={`plan-runtime-choice-${index + 1}`}
                            style={[
                              isMissingWordMode ? styles.choiceChip : styles.choiceButton,
                              {
                                borderColor: selected ? accent : cardBorder,
                                backgroundColor: selected ? accent + '22' : t.bgSurface2,
                              },
                            ]}
                          >
                            <Text style={[isMissingWordMode ? styles.choiceChipText : styles.choiceText, { color: selected ? accent : t.textPrimary }]}>{choice.text}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {activeExercise.feedback ? (
                    <View style={[styles.feedback, { borderColor: accent + '44', backgroundColor: accent + '12' }]}>
                      <Text style={[styles.feedbackTitle, { color: t.textPrimary }]}>{activeExercise.feedback.title}</Text>
                      <Text style={[styles.bodyText, { color: t.textMuted }]}>{activeExercise.feedback.text}</Text>
                    </View>
                  ) : null}

                  {message ? (
                    <Text style={[styles.message, { color: t.textMuted }]}>{message}</Text>
                  ) : null}

                  <TouchableOpacity
                    activeOpacity={0.86}
                    onPress={answer}
                    disabled={saving || !selectedAnswer.trim()}
                    accessibilityRole="button"
                    accessibilityLabel="Проверить ответ"
                    testID="plan-runtime-submit"
                    style={[
                      styles.primaryButton,
                      {
                        backgroundColor: selectedAnswer.trim() ? accent : t.bgSurface2,
                        borderColor: selectedAnswer.trim() ? accent : cardBorder,
                        opacity: saving ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.primaryButtonText, { color: selectedAnswer.trim() ? actionText : t.textMuted }]}>
                      {saving ? 'Проверяем...' : activeExercise.primaryActionLabel}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <View style={styles.timeline}>
                {state.screenModel.timeline.map((item, index) => (
                  <View key={item.blockId} style={[styles.timelineCard, { borderColor: cardBorder, backgroundColor: t.bgCard }]}>
                    <View style={[styles.timelineIndex, { borderColor: accent, backgroundColor: item.status === 'completed' ? accent : t.bgSurface2 }]}>
                      <Text style={[styles.timelineIndexText, { color: item.status === 'completed' ? actionText : accent }]}>
                        {item.status === 'completed' ? '✓' : index + 1}
                      </Text>
                    </View>
                    <View style={styles.timelineCopy}>
                      <Text style={[styles.timelineTitle, { color: t.textPrimary }]}>{item.title}</Text>
                      <Text style={[styles.bodyText, { color: t.textMuted }]}>{item.metaLabel}</Text>
                    </View>
                    <Text style={[styles.timelineStatus, { color: item.status === 'active' ? accent : t.textMuted }]}>
                      {item.button.label}
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                activeOpacity={0.82}
                onPress={reset}
                accessibilityRole="button"
                accessibilityLabel="Сбросить runtime"
                testID="plan-runtime-reset"
                style={[styles.secondaryButton, { borderColor: cardBorder, backgroundColor: t.bgSurface2 }]}
              >
                <Text style={[styles.secondaryButtonText, { color: t.textPrimary }]}>Сбросить runtime</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  fill: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  back: {
    width: 54,
    height: 54,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '800',
    marginTop: -2,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  kicker: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  h1: {
    fontSize: 27,
    lineHeight: 32,
    fontWeight: '900',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 30,
  },
  dayRow: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 10,
  },
  dayButton: {
    minHeight: 44,
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
  },
  minuteRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  minuteButton: {
    minHeight: 48,
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minuteText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
  },
  panel: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  centerPanel: {
    alignItems: 'center',
    gap: 10,
  },
  progressTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTitle: {
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '900',
  },
  percent: {
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '900',
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 14,
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  exercisePanel: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    ...noAndroidOutline,
  },
  exerciseTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    marginTop: 3,
  },
  prompt: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '900',
    marginTop: 26,
    marginBottom: 12,
    textAlign: 'center',
  },
  instruction: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
  },
  modeSurface: {
    borderRadius: 20,
    paddingTop: 18,
    paddingBottom: 18,
    marginTop: 18,
    marginBottom: 14,
    alignItems: 'center',
  },
  modeLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0,
    marginBottom: 10,
  },
  meaningHeadline: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },
  blankSentence: {
    fontSize: 29,
    lineHeight: 37,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },
  meaningText: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  modeHint: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  choiceList: {
    gap: 10,
  },
  choiceButton: {
    minHeight: 62,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  choiceText: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
  },
  choiceChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  choiceChip: {
    minHeight: 54,
    minWidth: '30%',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceChipText: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
    textAlign: 'center',
  },
  tileBuilder: {
    gap: 12,
  },
  assembledAnswer: {
    minHeight: 62,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  selectedTileRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  selectedTile: {
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedTileText: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
  },
  answerPlaceholder: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  assembledText: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  wordTile: {
    minHeight: 56,
    minWidth: '30%',
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordTileText: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
  },
  clearTilesButton: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearTilesText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
  },
  input: {
    minHeight: 62,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 20,
    fontWeight: '900',
  },
  feedback: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginTop: 12,
  },
  feedbackTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    marginTop: 12,
    textAlign: 'center',
  },
  primaryButton: {
    minHeight: 62,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  primaryButtonText: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
  },
  timeline: {
    gap: 10,
  },
  timelineCard: {
    minHeight: 74,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timelineIndex: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineIndexText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
  },
  timelineCopy: {
    flex: 1,
    minWidth: 0,
  },
  timelineTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
  },
  timelineStatus: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
  },
  secondaryButton: {
    minHeight: 56,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  secondaryButtonText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
  },
});
