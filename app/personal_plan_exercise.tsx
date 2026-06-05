import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, type TextStyle, type ViewStyle } from 'react-native';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from '../components/SafeLinearGradient';
import { useTheme } from '../components/ThemeContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import type { PersonalPlanId } from './personal_plan_catalog';
import { getPersonalPlanMissingWordItems } from './personal_plan_missing_word_items';
import { getPersonalPlanChooseNaturalPhraseItems } from './personal_plan_choose_natural_phrase_items';
import { getPersonalPlanListenChooseItems, type PersonalPlanListenChooseItem } from './personal_plan_listen_choose_items';
import { getPersonalPlanListenBuildItems, type PersonalPlanListenBuildItem } from './personal_plan_listen_build_items';
import { getPersonalPlanPronunciationRepeatItems } from './personal_plan_pronunciation_repeat_items';
import { getPersonalPlanPhraseRecallItems, type PersonalPlanPhraseRecallItem } from './personal_plan_phrase_recall_items';
import { buildPlanListeningPlaybackSource } from './personal_plan_listening_playback_contract';
import {
  buildPlanPronunciationAttemptPayload,
  buildPlanPronunciationRecordingContract,
  canCompletePlanPronunciationRecording,
} from './personal_plan_pronunciation_recording_contract';
import { markPersonalPlanTaskCompleted } from './personal_plan_progress';
import { startPlanExerciseSession } from './personal_plan_exercise_session';
import { submitAndStorePlanExerciseAnswer } from './personal_plan_exercise_submission_store';
import { createPlanRecoveryDefaultHandlers } from './personal_plan_recovery_default_handlers';
import type { PlanExerciseBlock, PlanExerciseType } from './personal_plan_engine_contracts';
import { planExerciseRendererContractForType, type PlanExerciseVisualShell } from './personal_plan_exercise_renderer_contracts';
import { evaluateRecallAnswer } from './review_evaluator';

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function splitIds(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function isPersonalPlanListenChooseItem(item: unknown): item is PersonalPlanListenChooseItem {
  return (
    item !== null
    && typeof item === 'object'
    && 'audioReady' in item
    && 'correctAnswer' in item
    && 'options' in item
  );
}

function isPersonalPlanListenBuildItem(item: unknown): item is PersonalPlanListenBuildItem {
  return (
    item !== null
    && typeof item === 'object'
    && 'audioReady' in item
    && 'correctAnswer' in item
    && 'wordOptions' in item
    && 'targetWords' in item
  );
}

function normalizePlanAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/[.!?]+$/g, '').replace(/\s+/g, ' ');
}

type PlanExerciseExplanation = {
  titleRu?: string;
  correctRu: string;
  wrongRu: string;
};

function planExerciseExplanation(item: unknown): PlanExerciseExplanation | null {
  if (!item || typeof item !== 'object' || !('explanation' in item)) return null;
  const explanation = (item as { explanation?: Partial<PlanExerciseExplanation> }).explanation;
  if (!explanation || typeof explanation.correctRu !== 'string' || typeof explanation.wrongRu !== 'string') return null;
  return {
    titleRu: typeof explanation.titleRu === 'string' ? explanation.titleRu : undefined,
    correctRu: explanation.correctRu,
    wrongRu: explanation.wrongRu,
  };
}

type PlanExerciseModeChrome = {
  title: string;
  instruction: string;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  visualShell: PlanExerciseVisualShell;
};

function fallbackVisualShell(type: PlanExerciseType): PlanExerciseVisualShell {
  return {
    role: type === 'plan_pronunciation_repeat' ? 'voice_self_check' : 'precision_gap',
    iconName: type === 'plan_pronunciation_repeat' ? 'mic-outline' : 'create-outline',
    primaryActionSize: 'large',
    feedbackSurface: 'liquid_panel',
    usesThemeAccentOnly: true,
  };
}

function chromeForExerciseType(type: PlanExerciseType): PlanExerciseModeChrome {
  const visualShell = planExerciseRendererContractForType(type)?.visualShell ?? fallbackVisualShell(type);
  const iconName = visualShell.iconName as React.ComponentProps<typeof Ionicons>['name'];
  switch (type) {
    case 'plan_listen_choose':
      return {
        title: 'На слух',
        instruction: 'Сначала слушай, потом выбирай смысл. Без угадайки по виду фразы.',
        iconName,
        visualShell,
      };
    case 'plan_listen_build':
      return {
        title: 'Собери на слух',
        instruction: 'Послушай фразу и собери ее по порядку. Слова не подсвечиваются.',
        iconName,
        visualShell,
      };
    case 'plan_pronunciation_repeat':
      return {
        title: 'Повтори вслух',
        instruction: 'Запиши короткую фразу, послушай себя и только потом засчитывай.',
        iconName,
        visualShell,
      };
    case 'plan_phrase_recall':
      return {
        title: 'Вспомни фразу',
        instruction: 'Без подсказок: достаем фразу из памяти, а не узнаем ее глазами.',
        iconName,
        visualShell,
      };
    case 'plan_choose_natural_phrase':
      return {
        title: 'Выбери фразу',
        instruction: 'Ищи живой вариант, который нормально звучит в разговоре.',
        iconName,
        visualShell,
      };
    case 'plan_phrase_build':
      return {
        title: 'Собери фразу',
        instruction: 'Фраза маршрута собирается как обычный урок, но под цель дня.',
        iconName,
        visualShell,
      };
    case 'plan_missing_word':
    default:
      return {
        title: 'Вставь слово',
        instruction: 'Заполни один точный пропуск. Варианты должны отличаться по смыслу.',
        iconName,
        visualShell,
      };
  }
}

function PlanListenChooseAudioButton({
  item,
  accent,
  actionText,
  mutedText,
}: {
  item: PersonalPlanListenChooseItem | PersonalPlanListenBuildItem;
  accent: string;
  actionText: string;
  mutedText: string;
}) {
  const playback = useMemo(() => buildPlanListeningPlaybackSource(item), [item]);
  const source = playback.source === 'in_app_audio' ? playback.playerSource : null;
  const player = useAudioPlayer(source, playback.source === 'in_app_audio' ? playback.options : undefined);
  const status = useAudioPlayerStatus(player);
  const disabled = playback.source !== 'in_app_audio';
  const isPlaying = Boolean(status?.playing);
  const isBuffering = Boolean(status?.isBuffering);
  const label = disabled ? 'Аудио готовится' : isBuffering ? 'Загрузка' : isPlaying ? 'Слушаю' : 'Слушать';

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={disabled ? 'Аудио готовится' : 'Слушать фразу'}
      activeOpacity={0.82}
      disabled={disabled}
      onPress={() => {
        hapticTap();
        if (playback.source !== 'in_app_audio') return;
        void setAudioModeAsync(playback.audioMode)
          .then(async () => {
            if (player.playing) {
              player.pause();
              return;
            }
            await player.seekTo(0);
            player.play();
          })
          .catch(() => undefined);
      }}
      style={[
        styles.primaryButton,
        {
          backgroundColor: disabled ? '#2B2D31' : accent,
          borderColor: accent + '55',
          opacity: disabled ? 0.7 : 1,
          shadowColor: disabled ? '#000000' : accent,
        },
      ]}
    >
      <Text style={[styles.primaryButtonText, { color: disabled ? mutedText : actionText }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function PlanPronunciationRecorder({
  accent,
  actionText,
  mutedText,
  onReady,
}: {
  accent: string;
  actionText: string;
  mutedText: string;
  onReady: (recording: { uri: string; durationMs: number; userPlayedRecording: true }) => void;
}) {
  const contract = useMemo(() => buildPlanPronunciationRecordingContract(), []);
  const recorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);
  const [hasPermission, setHasPermission] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [userPlayedRecording, setUserPlayedRecording] = useState(false);
  const playbackSource = recordingUri ? { uri: recordingUri } : null;
  const player = useAudioPlayer(playbackSource, { updateInterval: 250 });
  const playerStatus = useAudioPlayerStatus(player);
  const canComplete = canCompletePlanPronunciationRecording({
    hasPermission,
    recordingUri,
    durationMs: recordingDurationMs,
    userPlayedRecording,
  });
  const recordLabel = recorderState.isRecording ? 'Остановить запись' : recordingUri ? 'Записать заново' : 'Записать голос';
  const playLabel = playerStatus?.playing ? 'Слушаю запись' : 'Послушать запись';

  const toggleRecording = async () => {
    hapticTap();
    if (!hasPermission) {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) return;
      setHasPermission(true);
    }

    await setAudioModeAsync(contract.audioMode).catch(() => undefined);
    if (recorderState.isRecording) {
      await recorder.stop();
      const uri = recorder.uri;
      const durationMs = Math.max(1, Math.round(recorderState.durationMillis || 0));
      setRecordingUri(uri);
      setRecordingDurationMs(durationMs);
      setUserPlayedRecording(false);
      return;
    }

    setRecordingUri(null);
    setRecordingDurationMs(0);
    setUserPlayedRecording(false);
    await recorder.prepareToRecordAsync(RecordingPresets.LOW_QUALITY);
    recorder.record({ forDuration: 12 });
  };

  const playRecording = async () => {
    if (!recordingUri) return;
    hapticTap();
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
      interruptionMode: 'mixWithOthers',
    }).catch(() => undefined);
    if (player.playing) {
      player.pause();
      return;
    }
    await player.seekTo(0);
    player.play();
    setUserPlayedRecording(true);
  };

  useEffect(() => {
    if (!canComplete || !recordingUri) return;
    onReady({
      uri: recordingUri,
      durationMs: recordingDurationMs,
      userPlayedRecording: true,
    });
  }, [canComplete, onReady, recordingDurationMs, recordingUri]);

  return (
    <View style={[styles.recorderStack, { borderColor: accent + '44', shadowColor: accent }]}>
      <View style={[styles.recorderHintPill, { backgroundColor: accent + '16', borderColor: accent + '55' }]}>
        <Ionicons name="timer-outline" size={16} color={accent} />
        <Text style={[styles.panelText, { color: mutedText }]}>Запись до 12 секунд</Text>
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={recordLabel}
        activeOpacity={0.84}
        onPress={() => void toggleRecording()}
        style={[
          styles.primaryButton,
          {
            backgroundColor: recorderState.isRecording ? '#FF6E78' : accent,
            borderColor: accent + '55',
            shadowColor: recorderState.isRecording ? '#FF6E78' : accent,
          },
        ]}
      >
        <Text style={[styles.primaryButtonText, { color: recorderState.isRecording ? '#130406' : actionText }]}>{recordLabel}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={playLabel}
        activeOpacity={0.84}
        disabled={!recordingUri}
        onPress={() => void playRecording()}
        style={[
          styles.primaryButton,
          {
            backgroundColor: recordingUri ? '#2B2D31' : '#202226',
            borderColor: accent + '33',
            opacity: recordingUri ? 1 : 0.72,
            shadowColor: recordingUri ? accent : '#000000',
          },
        ]}
      >
        <Text style={[styles.primaryButtonText, { color: recordingUri ? accent : mutedText }]}>{playLabel}</Text>
      </TouchableOpacity>

      <Text style={[styles.panelText, { color: mutedText }]}>
        {canComplete ? 'Запись прослушана. Можно засчитать.' : 'Запиши фразу и послушай себя один раз. Так легче услышать, где слово слиплось.'}
      </Text>
    </View>
  );
}

function PlanExerciseModeStrip({
  chrome,
  accent,
  mutedText,
}: {
  chrome: PlanExerciseModeChrome;
  accent: string;
  mutedText: string;
}) {
  return (
    <View style={styles.modeRow}>
      <View style={[styles.modeIcon, { backgroundColor: accent + '16', borderColor: accent + '66', shadowColor: accent }]}>
        <Ionicons name={chrome.iconName} size={22} color={accent} />
      </View>
      <View style={styles.modeCopy}>
        <Text style={[styles.modeEyebrow, { color: accent }]}>{chrome.title}</Text>
        <Text style={[styles.modeHint, { color: mutedText }]}>{chrome.instruction}</Text>
      </View>
    </View>
  );
}

function PlanExerciseProgressRail({
  correct,
  target,
  accent,
}: {
  correct: number;
  target: number;
  accent: string;
}) {
  const progressPercent = target > 0 ? Math.min(100, Math.max(0, (correct / target) * 100)) : 0;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Прогресс задания: ${correct} из ${target}`}
      style={styles.progressRail}
    >
      <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: accent, shadowColor: accent }]} />
    </View>
  );
}

type PlanExerciseFeedbackTone = 'success' | 'error' | 'info' | 'blocked';

function feedbackIconForTone(tone: PlanExerciseFeedbackTone): React.ComponentProps<typeof Ionicons>['name'] {
  if (tone === 'success') return 'checkmark';
  if (tone === 'error') return 'refresh';
  if (tone === 'blocked') return 'lock-closed-outline';
  return 'sparkles-outline';
}

function PlanExerciseFeedbackSurface({
  tone,
  title,
  body,
  accent,
  actionText,
  mutedText,
  surfaceColor,
  actionLabel,
  onAction,
  children,
}: {
  tone: PlanExerciseFeedbackTone;
  title: string;
  body: string;
  accent: string;
  actionText: string;
  mutedText: string;
  surfaceColor: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: React.ReactNode;
}) {
  const isSuccess = tone === 'success';
  const isError = tone === 'error';
  const toneColor = isError ? '#FF8A92' : accent;
  const borderColor = isError ? '#FF6E7866' : accent + '66';
  const buttonColor = isSuccess ? accent : surfaceColor;
  const buttonTextColor = isSuccess ? actionText : tone === 'blocked' ? mutedText : toneColor;

  return (
    <View style={[styles.feedbackSurface, { borderColor, backgroundColor: surfaceColor, shadowColor: toneColor }]}>
      <View style={styles.feedbackHeader}>
        <View style={[styles.feedbackIcon, { borderColor, backgroundColor: toneColor + '16' }]}>
          <Ionicons name={feedbackIconForTone(tone)} size={20} color={toneColor} />
        </View>
        <Text style={[styles.feedbackTitle, { color: toneColor }]}>{title}</Text>
      </View>
      <Text style={[styles.feedbackBody, { color: mutedText }]}>{body}</Text>
      {children}
      {actionLabel && onAction ? (
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={onAction}
          style={[styles.primaryButton, { backgroundColor: buttonColor, borderColor }]}
        >
          <Text style={[styles.primaryButtonText, { color: buttonTextColor }]}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function PlanExerciseFeedbackModal({
  visible,
  tone,
  title,
  body,
  accent,
  actionText,
  mutedText,
  surfaceColor,
  actionLabel,
  onAction,
  children,
}: {
  visible: boolean;
  tone: PlanExerciseFeedbackTone;
  title: string;
  body: string;
  accent: string;
  actionText: string;
  mutedText: string;
  surfaceColor: string;
  actionLabel: string;
  onAction: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onAction}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <PlanExerciseFeedbackSurface
            tone={tone}
            title={title}
            body={body}
            accent={accent}
            actionText={actionText}
            mutedText={mutedText}
            surfaceColor={surfaceColor}
            actionLabel={actionLabel}
            onAction={onAction}
          >
            {children}
          </PlanExerciseFeedbackSurface>
        </View>
      </View>
    </Modal>
  );
}

export default function PersonalPlanExerciseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme: t, themeMode } = useTheme();
  const { studyTarget } = useStudyTarget();
  const isGold = themeMode === 'gold';
  const accent = isGold ? '#FFE8A8' : t.accent;
  const actionText = isGold ? '#1B1205' : '#08110C';
  const rendererType = firstParam(params.rendererType);
  const planId = firstParam(params.planId) as PersonalPlanId;
  const planInstanceId = firstParam(params.planInstanceId);
  const planTaskId = firstParam(params.planTaskId);
  const lessonId = firstParam(params.lessonId);
  const dayIndex = Number(firstParam(params.planDayIndex) || 1);
  const requiredCorrect = Math.max(1, Number(firstParam(params.requiredCorrect) || 1));
  const contentUnitIds = useMemo(() => splitIds(firstParam(params.contentUnitIds)), [params.contentUnitIds]);
  const [index, setIndex] = useState(0);
  const [correctIds, setCorrectIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<'correct' | 'wrong' | null>(null);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [buildWords, setBuildWords] = useState<string[]>([]);
  const [recallItems, setRecallItems] = useState<PersonalPlanPhraseRecallItem[]>([]);
  const [pronunciationRecording, setPronunciationRecording] = useState<{
    uri: string;
    durationMs: number;
    userPlayedRecording: true;
  } | null>(null);
  const isMissingWordMode = rendererType === 'plan_missing_word';
  const isChoiceMode = rendererType === 'plan_choose_natural_phrase';
  const isListeningMode = rendererType === 'plan_listen_choose';
  const isListenBuildMode = rendererType === 'plan_listen_build';
  const isPronunciationMode = rendererType === 'plan_pronunciation_repeat';
  const isRecallMode = rendererType === 'plan_phrase_recall';
  const isPhraseBuildMode = rendererType === 'plan_phrase_build';
  const currentExerciseType = (
    isRecallMode
      ? 'plan_phrase_recall'
      : isPronunciationMode
        ? 'plan_pronunciation_repeat'
        : isListenBuildMode
          ? 'plan_listen_build'
          : isListeningMode
            ? 'plan_listen_choose'
            : isChoiceMode
              ? 'plan_choose_natural_phrase'
              : isPhraseBuildMode
                ? 'plan_phrase_build'
                : 'plan_missing_word'
  ) as PlanExerciseType;
  const chrome = useMemo(() => chromeForExerciseType(currentExerciseType), [currentExerciseType]);
  const handlePronunciationRecordingReady = useCallback((recording: {
    uri: string;
    durationMs: number;
    userPlayedRecording: true;
  }) => {
    setPronunciationRecording(recording);
  }, []);

  useEffect(() => {
    if (!isRecallMode) {
      setRecallItems([]);
      return undefined;
    }

    let alive = true;
    void getPersonalPlanPhraseRecallItems({ planInstanceId, lessonId, contentUnitIds })
      .then((nextItems) => {
        if (alive) setRecallItems(nextItems);
      })
      .catch(() => {
        if (alive) setRecallItems([]);
      });

    return () => {
      alive = false;
    };
  }, [contentUnitIds, isRecallMode, lessonId, planInstanceId]);

  const items = useMemo(() => {
    if (isRecallMode) return recallItems;
    if (isMissingWordMode) return getPersonalPlanMissingWordItems({ lessonId, contentUnitIds });
    if (isChoiceMode) return getPersonalPlanChooseNaturalPhraseItems({ lessonId, contentUnitIds });
    if (isListeningMode) return getPersonalPlanListenChooseItems({ lessonId, contentUnitIds });
    if (isListenBuildMode) return getPersonalPlanListenBuildItems({ lessonId, contentUnitIds });
    if (isPronunciationMode) return getPersonalPlanPronunciationRepeatItems({ lessonId, contentUnitIds });
    return getPersonalPlanMissingWordItems({ lessonId, contentUnitIds });
  }, [contentUnitIds, isChoiceMode, isListenBuildMode, isListeningMode, isMissingWordMode, isPronunciationMode, isRecallMode, lessonId, recallItems]);

  const block = useMemo<PlanExerciseBlock>(() => ({
    id: planTaskId || `${rendererType || 'plan_exercise'}_${lessonId}`,
    planId,
    dayIndex,
    type: currentExerciseType,
    title: chrome.title,
    contentUnitIds,
    estimatedMinutes: isListeningMode || isListenBuildMode || isChoiceMode ? 4 : 3,
    requiredFor: [5, 10, 15, 20],
    prerequisiteLessonIds: [1],
    progressPolicy: isPronunciationMode ? 'completion_only' : 'correct_only',
    recoveryPolicy: isPronunciationMode ? 'none' : 'return_wrong_to_recall',
  }), [chrome.title, contentUnitIds, currentExerciseType, dayIndex, isChoiceMode, isListenBuildMode, isListeningMode, isPronunciationMode, lessonId, planId, planTaskId, rendererType]);

  const session = useMemo(() => (
    startPlanExerciseSession(block, { planInstanceId }).session
  ), [block, planInstanceId]);
  const recoveryWrite = useMemo(() => ({
    mode: 'apply' as const,
    handlers: createPlanRecoveryDefaultHandlers({ studyTarget }),
  }), [studyTarget]);

  const item = items[index];
  const choiceOptions = item && 'options' in item ? item.options : [];
  const currentCorrectAnswer = item && 'correctAnswer' in item ? item.correctAnswer : '';
  const targetCorrect = Math.min(requiredCorrect, items.length || requiredCorrect);
  const done = completed || (correctIds.length >= targetCorrect && items.length > 0 && !lastResult);
  const listeningBlocked = (isListeningMode || isListenBuildMode) && item && 'audioReady' in item && !item.audioReady;
  const modeReady = (isMissingWordMode || isChoiceMode || isListeningMode || isListenBuildMode || isPronunciationMode || isRecallMode || isPhraseBuildMode) && Boolean(session) && !listeningBlocked;
  const explanation = planExerciseExplanation(item);
  const resultModalTitle = lastResult === 'correct'
    ? (explanation?.titleRu ?? 'Почему так')
    : isRecallMode
      ? 'Еще один заход'
      : isListenBuildMode
        ? 'Еще раз спокойно'
        : 'Разберем спокойно';
  const resultModalBody = lastResult === 'correct'
    ? (explanation?.correctRu ?? 'Так звучит естественно.')
    : (explanation?.wrongRu ?? 'Попробуй ещё раз спокойно: ошибка уйдёт в повторение.');

  const submit = async (answer: string) => {
    if (!item || !session || saving || done) return;
    if (!('correctAnswer' in item)) return;
    const isCorrect = answer === item.correctAnswer;
    setSaving(true);
    setSelected(answer);
    setLastResult(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) hapticSuccess();
    else hapticError();

    await submitAndStorePlanExerciseAnswer(session, {
      result: isCorrect ? 'correct' : 'wrong',
      contentUnitId: item.id,
      expectedAnswer: item.correctAnswer,
      selectedAnswer: answer,
      grammarTags: item.grammarTags,
      vocabularyTags: item.vocabularyTags,
      mistakeTags: isCorrect ? [] : [isListeningMode ? 'listen_choose' : isChoiceMode ? 'choose_natural_phrase' : 'missing_word'],
    }, {
      recoveryWrite,
    }).catch(() => undefined);

    if (isCorrect) {
      setCorrectIds((current) => current.includes(item.id) ? current : [...current, item.id]);
    }
    setSaving(false);
  };

  const submitListenBuild = async () => {
    if (!item || !session || saving || done || !isListenBuildMode || !isPersonalPlanListenBuildItem(item)) return;
    const answer = buildWords.join(' ');
    const isCorrect = normalizePlanAnswer(answer) === normalizePlanAnswer(item.correctAnswer);
    setSaving(true);
    setSelected(answer);
    setLastResult(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) hapticSuccess();
    else hapticError();

    await submitAndStorePlanExerciseAnswer(session, {
      result: isCorrect ? 'correct' : 'wrong',
      contentUnitId: item.id,
      expectedAnswer: item.correctAnswer,
      selectedAnswer: answer,
      grammarTags: item.grammarTags,
      vocabularyTags: item.vocabularyTags,
      mistakeTags: isCorrect ? [] : ['listen_build'],
    }, {
      recoveryWrite,
    }).catch(() => undefined);

    if (isCorrect) {
      setCorrectIds((current) => current.includes(item.id) ? current : [...current, item.id]);
    }
    setSaving(false);
  };

  const submitRecall = async () => {
    if (!item || !session || saving || done || !isRecallMode || !('targetText' in item)) return;
    const evaluation = evaluateRecallAnswer(typedAnswer, item.targetText);
    const isCorrect = evaluation.ok;
    setSaving(true);
    setSelected(typedAnswer.trim());
    setLastResult(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) hapticSuccess();
    else hapticError();

    await submitAndStorePlanExerciseAnswer(session, {
      result: isCorrect ? 'correct' : 'wrong',
      contentUnitId: ('contentUnitId' in item ? item.contentUnitId : undefined) ?? item.id.replace(/^(recall|fallback):/, ''),
      expectedAnswer: item.targetText,
      selectedAnswer: typedAnswer,
      grammarTags: item.grammarTags,
      vocabularyTags: item.vocabularyTags,
      mistakeTags: isCorrect ? [] : ['plan_phrase_recall'],
    }, {
      recoveryWrite,
    }).catch(() => undefined);

    if (isCorrect) {
      setCorrectIds((current) => current.includes(item.id) ? current : [...current, item.id]);
    }
    setSaving(false);
  };

  const next = async () => {
    if (!item) return;
    if (lastResult === 'wrong') {
      setSelected(null);
      setTypedAnswer('');
      setBuildWords([]);
      setLastResult(null);
      return;
    }

    const nextCorrectIds = [...new Set([...correctIds, item.id])];
    const nextIndex = index + 1;
    setSelected(null);
    setTypedAnswer('');
    setBuildWords([]);
    setPronunciationRecording(null);
    setLastResult(null);

    if (nextIndex < items.length && nextCorrectIds.length < targetCorrect) {
      setIndex(nextIndex);
      return;
    }

    await markPersonalPlanTaskCompleted({
      taskId: planTaskId,
      planId,
      planInstanceId,
      dayIndex,
    }).catch(() => undefined);
    setCompleted(true);
  };

  const completePronunciation = async () => {
    if (!item || !session || saving || done || !('targetText' in item) || !pronunciationRecording) return;
    setSaving(true);
    hapticSuccess();

    await submitAndStorePlanExerciseAnswer(session, {
      result: 'completed',
      contentUnitId: item.id,
      expectedAnswer: item.targetText,
      selectedAnswer: null,
      grammarTags: item.grammarTags,
      vocabularyTags: item.vocabularyTags,
      mistakeTags: [],
      payload: buildPlanPronunciationAttemptPayload({
        recordingUri: pronunciationRecording.uri,
        durationMs: pronunciationRecording.durationMs,
        userPlayedRecording: pronunciationRecording.userPlayedRecording,
      }),
    }, {
      recoveryWrite,
    }).catch(() => undefined);

    const nextCorrectIds = [...new Set([...correctIds, item.id])];
    setCorrectIds(nextCorrectIds);
    const nextIndex = index + 1;

    if (nextIndex < items.length && nextCorrectIds.length < targetCorrect) {
      setIndex(nextIndex);
      setPronunciationRecording(null);
      setSaving(false);
      return;
    }

    await markPersonalPlanTaskCompleted({
      taskId: planTaskId,
      planId,
      planInstanceId,
      dayIndex,
    }).catch(() => undefined);
    setCompleted(true);
    setSaving(false);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bgPrimary }]}>
      <LinearGradient colors={isGold ? ['#171008', '#090704'] : t.bgGradient} style={styles.fill}>
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.78}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Назад"
            style={[styles.back, { backgroundColor: t.bgSurface2, borderColor: t.border }]}
          >
            <Ionicons name="chevron-back" size={24} color={t.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={[styles.kicker, { color: t.textMuted }]}>Гавань · упражнение</Text>
            <Text style={[styles.h1, { color: t.textPrimary }]}>{chrome.title}</Text>
          </View>
          <View style={[styles.headerModeIcon, { backgroundColor: accent + '16', borderColor: accent + '66' }]}>
            <Ionicons name={chrome.iconName} size={20} color={accent} />
          </View>
          <Text style={[styles.progress, { color: accent }]}>{correctIds.length}/{targetCorrect}</Text>
        </View>
        <PlanExerciseProgressRail correct={correctIds.length} target={targetCorrect} accent={accent} />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {!item || !modeReady ? (
            <PlanExerciseFeedbackSurface
              tone="blocked"
              title={listeningBlocked ? 'Аудио ещё не подключено' : 'Режим пока не готов'}
              body={listeningBlocked
                ? 'Это задание появится, когда для фраз будет утвержденный звук. Пока не засчитываем его и не притворяемся, что слушание готово.'
                : 'Это задание не открылось: не хватает данных для упражнения.'}
              accent={accent}
              actionText={actionText}
              mutedText={t.textMuted}
              surfaceColor={t.bgCard}
            />
          ) : done ? (
            <View style={styles.doneSpacer} />
          ) : isRecallMode && 'targetText' in item ? (
            <>
              <View style={[styles.phraseCard, { backgroundColor: t.bgCard, borderColor: accent + '66', shadowColor: accent }]}>
                <PlanExerciseModeStrip chrome={chrome} accent={accent} mutedText={t.textMuted} />
                <View style={[styles.liquidRail, { backgroundColor: accent + '55' }]} />
                <Text style={[styles.prompt, { color: t.textMuted }]}>Вспомни фразу без подсказок.</Text>
                <Text style={[styles.english, { color: t.textPrimary }]}>{item.promptRu}</Text>
                <TextInput
                  value={typedAnswer}
                  onChangeText={setTypedAnswer}
                  editable={!lastResult && !saving}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Введи по-английски"
                  placeholderTextColor={t.textMuted}
                  style={[styles.recallInput, { color: t.textPrimary, borderColor: lastResult === 'wrong' ? '#FF6E78' : accent + '55', backgroundColor: t.bgSurface2 }]}
                  returnKeyType="done"
                  onSubmitEditing={() => void submitRecall()}
                />
              </View>

              {!lastResult ? (
                <TouchableOpacity
                  activeOpacity={0.84}
                  accessibilityRole="button"
                  accessibilityLabel="Проверить ответ"
                  disabled={saving || typedAnswer.trim().length === 0}
                  onPress={() => void submitRecall()}
                  style={[styles.primaryButton, { marginTop: 18, backgroundColor: typedAnswer.trim().length > 0 ? accent : t.bgSurface2, borderColor: accent + '55' }]}
                >
                  <Text style={[styles.primaryButtonText, { color: typedAnswer.trim().length > 0 ? actionText : t.textMuted }]}>Проверить</Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : isListenBuildMode && isPersonalPlanListenBuildItem(item) ? (
            <>
              <View style={[styles.phraseCard, { backgroundColor: t.bgCard, borderColor: accent + '66', shadowColor: accent }]}>
                <PlanExerciseModeStrip chrome={chrome} accent={accent} mutedText={t.textMuted} />
                <View style={[styles.liquidRail, { backgroundColor: accent + '55' }]} />
                <Text style={[styles.prompt, { color: t.textMuted }]}>Сначала слушай, потом собирай фразу по порядку.</Text>
                <PlanListenChooseAudioButton
                  item={item}
                  accent={accent}
                  actionText={actionText}
                  mutedText={t.textMuted}
                />
                <View
                  accessibilityLabel="Поле собранной фразы"
                  style={[styles.listenBuildAnswerBox, { borderColor: accent + '55', backgroundColor: t.bgSurface2 }]}
                >
                  {buildWords.length > 0 ? buildWords.map((word, wordIndex) => (
                    <TouchableOpacity
                      key={`built-${word}-${wordIndex}`}
                      activeOpacity={0.78}
                      accessibilityRole="button"
                      accessibilityLabel={`Убрать слово: ${word}`}
                      disabled={Boolean(lastResult) || saving}
                      onPress={() => {
                        hapticTap();
                        setBuildWords((current) => current.filter((_, index) => index !== wordIndex));
                      }}
                      style={[styles.listenBuildAnswerChip, { borderColor: accent + '66', backgroundColor: accent + '18' }]}
                    >
                      <Text style={[styles.listenBuildAnswerText, { color: t.textPrimary }]}>{word}</Text>
                    </TouchableOpacity>
                  )) : (
                    <Text style={[styles.listenBuildPlaceholder, { color: t.textMuted }]}>Слова появятся здесь</Text>
                  )}
                </View>
              </View>

              <View style={[styles.wordBank, { borderColor: accent + '28', backgroundColor: t.bgCard }]}>
                {item.wordOptions.map((word: string, wordIndex: number) => {
                  const usedCount = buildWords.filter((value) => value === word).length;
                  const availableCount = item.wordOptions.filter((value) => value === word).length;
                  const disabled = Boolean(lastResult) || saving || usedCount >= availableCount || buildWords.length >= item.targetWords.length;
                  return (
                    <TouchableOpacity
                      key={`${word}:${wordIndex}`}
                      activeOpacity={0.82}
                      accessibilityRole="button"
                      accessibilityLabel={`Добавить слово: ${word}`}
                      disabled={disabled}
                      onPress={() => {
                        hapticTap();
                        setBuildWords((current) => [...current, word]);
                      }}
                      style={[styles.wordTile, { backgroundColor: t.bgSurface2, borderColor: disabled ? t.border : accent + '77', opacity: disabled ? 0.42 : 1 }]}
                    >
                      <Text style={[styles.wordTileText, { color: t.textPrimary }]}>{word}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {!lastResult ? (
                <View style={styles.rowActions}>
                  <TouchableOpacity
                    activeOpacity={0.82}
                    accessibilityRole="button"
                    accessibilityLabel="Убрать последнее слово"
                    disabled={buildWords.length === 0 || saving}
                    onPress={() => setBuildWords((current) => current.slice(0, -1))}
                    style={[styles.secondaryButton, { borderColor: accent + '44', backgroundColor: t.bgSurface2 }]}
                  >
                    <Text style={[styles.secondaryButtonText, { color: buildWords.length > 0 ? t.textPrimary : t.textMuted }]}>Назад</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.84}
                    accessibilityRole="button"
                    accessibilityLabel="Проверить ответ"
                    disabled={saving || buildWords.length !== item.targetWords.length}
                    onPress={() => void submitListenBuild()}
                    style={[styles.primaryButton, { flex: 1, backgroundColor: buildWords.length === item.targetWords.length ? accent : t.bgSurface2, borderColor: accent + '55' }]}
                  >
                    <Text style={[styles.primaryButtonText, { color: buildWords.length === item.targetWords.length ? actionText : t.textMuted }]}>Проверить</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </>
          ) : isPronunciationMode && 'targetText' in item && 'completionLabel' in item ? (
            <>
              <View style={[styles.phraseCard, { backgroundColor: t.bgCard, borderColor: accent + '66', shadowColor: accent }]}>
                <PlanExerciseModeStrip chrome={chrome} accent={accent} mutedText={t.textMuted} />
                <View style={[styles.liquidRail, { backgroundColor: accent + '55' }]} />
                <Text style={[styles.prompt, { color: t.textMuted }]}>Произнеси фразу вслух спокойно и без гонки.</Text>
                <Text style={[styles.english, { color: t.textPrimary }]}>{item.targetText}</Text>
                <Text style={[styles.panelText, { color: t.textMuted }]}>{item.promptRu}</Text>
              </View>

              <PlanExerciseFeedbackSurface
                tone="info"
                title="Без оценки и давления"
                body="Сейчас цель простая: сказать фразу целиком и услышать себя со стороны. Проверка произношения появится здесь только когда она будет честной."
                accent={accent}
                actionText={actionText}
                mutedText={t.textMuted}
                surfaceColor={t.bgCard}
              />

              <PlanPronunciationRecorder
                accent={accent}
                actionText={actionText}
                mutedText={t.textMuted}
                onReady={handlePronunciationRecordingReady}
              />

              <TouchableOpacity
                activeOpacity={0.84}
                accessibilityRole="button"
                accessibilityLabel="Засчитать произношение"
                disabled={saving || !pronunciationRecording}
                onPress={() => void completePronunciation()}
                style={[styles.primaryButton, { marginTop: 18, backgroundColor: pronunciationRecording ? accent : t.bgSurface2, borderColor: accent + '55' }]}
              >
                <Text style={[styles.primaryButtonText, { color: pronunciationRecording ? actionText : t.textMuted }]}>{item.completionLabel}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={[styles.phraseCard, { backgroundColor: t.bgCard, borderColor: accent + '66', shadowColor: accent }]}>
                <PlanExerciseModeStrip chrome={chrome} accent={accent} mutedText={t.textMuted} />
                <View style={[styles.liquidRail, { backgroundColor: accent + '55' }]} />
                <Text style={[styles.prompt, { color: t.textMuted }]}>
                  {isListeningMode ? 'Сначала послушай фразу, потом выбери смысл.' : isChoiceMode ? `Смысл: ${item.promptRu}` : item.promptRu}
                </Text>
                <Text style={[styles.english, isChoiceMode ? styles.choiceInstruction : null, { color: t.textPrimary }]}>
                  {isListeningMode ? 'На слух' : isChoiceMode ? 'Нажми лучший вариант ниже' : 'displayEnglish' in item ? String(item.displayEnglish) : 'Выбери подходящую фразу'}
                </Text>
                {isListeningMode && isPersonalPlanListenChooseItem(item) ? (
                  <PlanListenChooseAudioButton
                    item={item}
                    accent={accent}
                    actionText={actionText}
                    mutedText={t.textMuted}
                  />
                ) : null}
                {false && isListeningMode && isPersonalPlanListenChooseItem(item) ? (
                  <TouchableOpacity
                    activeOpacity={0.82}
                    onPress={() => {
                      hapticTap();
                    }}
                    style={[styles.primaryButton, { backgroundColor: accent }]}
                  >
                    <Text style={[styles.primaryButtonText, { color: actionText }]}>Слушать</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.options}>
                {choiceOptions.map((option: string) => {
                  const isSelected = selected === option;
                  const isCorrect = option === currentCorrectAnswer;
                  const answerColor = lastResult && isSelected
                    ? (isCorrect ? accent : '#FF6E78')
                    : t.border;
                  return (
                    <TouchableOpacity
                      key={option}
                      activeOpacity={0.82}
                      accessibilityRole="button"
                      accessibilityLabel={`Выбрать ответ: ${option}`}
                      disabled={Boolean(lastResult) || saving}
                      onPress={() => {
                        hapticTap();
                        void submit(option);
                      }}
                      style={[styles.option, { backgroundColor: t.bgSurface2, borderColor: answerColor }]}
                    >
                      <Text style={[styles.optionText, { color: t.textPrimary }]}>{option}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {lastResult ? <View style={styles.doneSpacer} /> : null}
            </>
          )}
        </ScrollView>
        <PlanExerciseFeedbackModal
          visible={Boolean(lastResult && explanation)}
          tone={lastResult === 'correct' ? 'success' : 'error'}
          title={resultModalTitle}
          body={resultModalBody}
          actionLabel={lastResult === 'correct' ? 'Дальше' : 'Попробовать ещё раз'}
          onAction={() => void next()}
          accent={accent}
          actionText={actionText}
          mutedText={t.textMuted}
          surfaceColor={t.bgCard}
        >
          {lastResult === 'correct' && isRecallMode && item && 'targetText' in item ? (
            <Text style={[styles.recallAnswer, { color: accent }]}>{item.targetText}</Text>
          ) : null}
        </PlanExerciseFeedbackModal>
        <PlanExerciseFeedbackModal
          visible={done}
          tone="success"
          title="Задание закрыто"
          body="Нужная часть готова. Можно вернуться к плану или продолжить тренировку по желанию."
          actionLabel="К плану"
          onAction={() => router.back()}
          accent={accent}
          actionText={actionText}
          mutedText={t.textMuted}
          surfaceColor={t.bgCard}
        />
      </LinearGradient>
    </SafeAreaView>
  );
}

type PersonalPlanExerciseStyles = {
  safe: ViewStyle;
  fill: ViewStyle;
  modalBackdrop: ViewStyle;
  modalSheet: ViewStyle;
  header: ViewStyle;
  back: ViewStyle;
  headerCopy: ViewStyle;
  headerModeIcon: ViewStyle;
  kicker: TextStyle;
  h1: TextStyle;
  progress: TextStyle;
  progressRail: ViewStyle;
  progressFill: ViewStyle;
  scroll: ViewStyle;
  panel: ViewStyle;
  panelTitle: TextStyle;
  panelText: TextStyle;
  phraseCard: ViewStyle;
  modeRow: ViewStyle;
  modeIcon: ViewStyle;
  modeCopy: ViewStyle;
  modeEyebrow: TextStyle;
  modeHint: TextStyle;
  liquidRail: ViewStyle;
  prompt: TextStyle;
  english: TextStyle;
  choiceInstruction: TextStyle;
  listenBuildAnswerBox: ViewStyle;
  listenBuildAnswerChip: ViewStyle;
  listenBuildAnswerText: TextStyle;
  listenBuildPlaceholder: TextStyle;
  wordBank: ViewStyle;
  wordTile: ViewStyle;
  wordTileText: TextStyle;
  options: ViewStyle;
  option: ViewStyle;
  optionText: TextStyle;
  explain: ViewStyle;
  explainTitle: TextStyle;
  explainText: TextStyle;
  feedbackSurface: ViewStyle;
  feedbackHeader: ViewStyle;
  feedbackIcon: ViewStyle;
  feedbackTitle: TextStyle;
  feedbackBody: TextStyle;
  doneSpacer: ViewStyle;
  recorderStack: ViewStyle;
  recorderHintPill: ViewStyle;
  recallInput: TextStyle;
  recallAnswer: TextStyle;
  rowActions: ViewStyle;
  secondaryButton: ViewStyle;
  secondaryButtonText: TextStyle;
  primaryButton: ViewStyle;
  primaryButtonText: TextStyle;
};

const styles = StyleSheet.create<PersonalPlanExerciseStyles>({
  safe: { flex: 1 },
  fill: { flex: 1 },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 28,
    backgroundColor: 'rgba(0,0,0,0.68)',
  },
  modalSheet: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  back: {
    width: 50,
    height: 50,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1, minWidth: 0 },
  headerModeIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: { fontSize: 11, lineHeight: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0 },
  h1: { fontSize: 27, lineHeight: 32, fontWeight: '900' },
  progress: { fontSize: 20, lineHeight: 25, fontWeight: '900' },
  progressRail: {
    height: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.42,
    shadowRadius: 12,
  },
  scroll: { padding: 16, paddingBottom: 34 },
  panel: {
    borderRadius: 28,
    borderWidth: 1.5,
    padding: 22,
    gap: 14,
    elevation: 6,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 22,
  },
  panelTitle: { fontSize: 24, lineHeight: 30, fontWeight: '900' },
  panelText: { fontSize: 15, lineHeight: 22, fontWeight: '700' },
  phraseCard: {
    borderRadius: 30,
    borderWidth: 1.5,
    padding: 20,
    minHeight: 196,
    justifyContent: 'center',
    gap: 16,
    elevation: 10,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.26,
    shadowRadius: 26,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modeIcon: {
    width: 52,
    height: 52,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
  },
  modeCopy: { flex: 1, minWidth: 0, gap: 3 },
  modeEyebrow: { fontSize: 12, lineHeight: 15, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0 },
  modeHint: { fontSize: 14, lineHeight: 20, fontWeight: '800' },
  liquidRail: { height: 2, borderRadius: 2, opacity: 0.72 },
  prompt: { fontSize: 21, lineHeight: 28, fontWeight: '800', textAlign: 'center' },
  english: { fontSize: 36, lineHeight: 44, fontWeight: '900', textAlign: 'center' },
  choiceInstruction: { fontSize: 28, lineHeight: 34 },
  listenBuildAnswerBox: {
    minHeight: 92,
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  listenBuildAnswerChip: {
    minHeight: 42,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listenBuildAnswerText: { fontSize: 18, lineHeight: 23, fontWeight: '900' },
  listenBuildPlaceholder: { fontSize: 16, lineHeight: 22, fontWeight: '800', textAlign: 'center' },
  wordBank: {
    marginTop: 18,
    borderRadius: 24,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  wordTile: {
    minHeight: 50,
    borderRadius: 17,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordTileText: { fontSize: 18, lineHeight: 23, fontWeight: '900' },
  options: { marginTop: 18, gap: 12 },
  option: {
    minHeight: 70,
    borderRadius: 22,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
  },
  optionText: { fontSize: 22, lineHeight: 28, fontWeight: '900' },
  explain: {
    marginTop: 18,
    borderRadius: 26,
    borderWidth: 1.5,
    padding: 18,
    gap: 12,
    elevation: 5,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
  },
  explainTitle: { fontSize: 18, lineHeight: 23, fontWeight: '900' },
  explainText: { fontSize: 15, lineHeight: 22, fontWeight: '800' },
  feedbackSurface: {
    marginTop: 0,
    borderRadius: 30,
    borderWidth: 1.5,
    padding: 22,
    gap: 16,
    elevation: 12,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.28,
    shadowRadius: 30,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  feedbackIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackTitle: { flex: 1, fontSize: 19, lineHeight: 24, fontWeight: '900' },
  feedbackBody: { fontSize: 15, lineHeight: 22, fontWeight: '800' },
  doneSpacer: { minHeight: 18 },
  recorderStack: {
    marginTop: 18,
    gap: 10,
    borderRadius: 26,
    padding: 16,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.055)',
    elevation: 8,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
  },
  recorderHintPill: {
    alignSelf: 'flex-start',
    minHeight: 38,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recallInput: {
    minHeight: 60,
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
  },
  recallAnswer: { fontSize: 20, lineHeight: 26, fontWeight: '900' },
  rowActions: { marginTop: 18, flexDirection: 'row', gap: 10 },
  secondaryButton: {
    minHeight: 64,
    minWidth: 104,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryButtonText: { fontSize: 17, lineHeight: 22, fontWeight: '900' },
  primaryButton: {
    minHeight: 72,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    elevation: 5,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
  },
  primaryButtonText: { fontSize: 17, lineHeight: 22, fontWeight: '900' },
});
