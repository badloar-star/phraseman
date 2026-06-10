import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, type TextStyle, type ViewStyle } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { safeRouterBack } from './navigation_back';
import { LinearGradient } from '../components/SafeLinearGradient';
import { useTheme } from '../components/ThemeContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useLang } from '../components/LangContext';
import { triLang } from '../constants/i18n';
import { awardPlanTaskCompletion } from './personal_plan_xp';
import { useAudio } from '../hooks/use-audio';
import {
  scorePlanPronunciationTranscript,
  PLAN_PRONUNCIATION_PASS_THRESHOLD,
  type PlanPronunciationScoringResult,
} from './personal_plan_pronunciation_scoring_client';
import { ExpoSpeechRecognitionModule as speechModule } from 'expo-speech-recognition';
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import DuoPressable from '../components/DuoPressable';
import { useWordFlash } from '../hooks/use-word-flash';
import type { PersonalPlanId } from './personal_plan_catalog';
import { hasAuthoredPlanContent } from './plan_content_registry';
import ReportErrorButton from '../components/ReportErrorButton';
import { getPersonalPlanMissingWordItems } from './personal_plan_missing_word_items';
import { getPersonalPlanChooseNaturalPhraseItems } from './personal_plan_choose_natural_phrase_items';
import { getPersonalPlanListenChooseItems, type PersonalPlanListenChooseItem } from './personal_plan_listen_choose_items';
import { getPersonalPlanListenBuildItems, type PersonalPlanListenBuildItem } from './personal_plan_listen_build_items';
import { getPersonalPlanPronunciationRepeatItems } from './personal_plan_pronunciation_repeat_items';
import { getPersonalPlanPhraseRecallItems, type PersonalPlanPhraseRecallItem } from './personal_plan_phrase_recall_items';
import { buildPlanListeningPlaybackSource } from './personal_plan_listening_playback_contract';
import {
  buildPlanPronunciationAttemptPayload,
} from './personal_plan_pronunciation_recording_contract';
import { markPersonalPlanTaskCompleted } from './personal_plan_progress';
import { startPlanExerciseSession } from './personal_plan_exercise_session';
import { submitAndStorePlanExerciseAnswer } from './personal_plan_exercise_submission_store';
import { createPlanRecoveryDefaultHandlers } from './personal_plan_recovery_default_handlers';
import type { PlanExerciseBlock, PlanExerciseType } from './personal_plan_engine_contracts';
import { planExerciseRendererContractForType, type PlanExerciseVisualShell } from './personal_plan_exercise_renderer_contracts';
import { evaluateRecallAnswer } from './review_evaluator';
import BouncyScrollView from '../components/BouncyScrollView';

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

function PlanGradientButton({
  label,
  accent,
  actionText,
  onPress,
  disabled,
  style,
}: {
  label: string;
  accent: string;
  actionText: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.primaryButton,
        { borderColor: accent + '55', shadowColor: accent, opacity: disabled ? 0.45 : 1 },
        style,
      ]}
    >
      <LinearGradient
        colors={disabled ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)'] : [accent, accent + 'BB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.primaryButtonGradient}
      >
        <Text style={[styles.primaryButtonText, { color: disabled ? actionText + '66' : actionText }]}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
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
        { borderColor: accent + '55', shadowColor: disabled ? '#000000' : accent, opacity: disabled ? 0.6 : 1 },
      ]}
    >
      <LinearGradient
        colors={disabled ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)'] : [accent, accent + 'BB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.primaryButtonGradient}
      >
        <Text style={[styles.primaryButtonText, { color: disabled ? mutedText : actionText }]}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function PronunciationSpeakButton({
  enabled,
  listening,
  accent,
  actionText,
  onPress,
}: {
  enabled: boolean;
  listening: boolean;
  accent: string;
  actionText: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={listening ? 'Остановить' : 'Сказать фразу'}
      accessibilityState={{ disabled: !enabled }}
      activeOpacity={0.84}
      disabled={!enabled}
      onPress={onPress}
      style={[
        styles.primaryButton,
        {
          borderColor: listening ? '#FF6E7866' : accent + '55',
          opacity: enabled ? 1 : 0.55,
          shadowColor: listening ? '#FF6E78' : accent,
        },
      ]}
    >
      <LinearGradient
        colors={listening ? ['#FF6E78', '#FF4A55'] : [accent, accent + 'BB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.primaryButtonGradient}
      >
        <Text style={[styles.primaryButtonText, { color: listening ? '#130406' : actionText }]}>
          {listening ? 'Слушаю — говори' : 'Сказать фразу'}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

/**
 * On-device pronunciation check. Flow: listen to the target phrase (TTS), then speak it.
 * expo-speech-recognition (speechModule) transcribes locally — no paid service, no server.
 * scorePlanPronunciationTranscript compares the transcript to the target and the learner
 * passes at PLAN_PRONUNCIATION_PASS_THRESHOLD (90% word coverage). We never score accent.
 */
function PlanPronunciationRecorder({
  accent,
  actionText,
  mutedText,
  targetText,
  onScored,
  onScoringChange,
}: {
  accent: string;
  actionText: string;
  mutedText: string;
  targetText: string;
  onScored: (result: PlanPronunciationScoringResult) => void;
  onScoringChange: (scoring: boolean) => void;
}) {
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  const [pronunciationHeardTarget, setPronunciationHeardTarget] = useState(false);
  const [pronunciationSpeakingTarget, setPronunciationSpeakingTarget] = useState(false);
  const [pronunciationListening, setPronunciationListening] = useState(false);
  const [pronunciationScoringLocal, setPronunciationScoringLocal] = useState(false);
  const [pronunciationScore, setPronunciationScore] = useState<PlanPronunciationScoringResult | null>(null);
  const targetTextRef = useRef(targetText);
  targetTextRef.current = targetText;
  const pronunciationScoring = pronunciationScoringLocal;

  const setPronunciationScoring = useCallback((scoring: boolean) => {
    setPronunciationScoringLocal(scoring);
    onScoringChange(scoring);
  }, [onScoringChange]);

  // Reset state when the practiced phrase changes.
  useEffect(() => {
    setPronunciationHeardTarget(false);
    setPronunciationSpeakingTarget(false);
    setPronunciationListening(false);
    setPronunciationScoring(false);
    setPronunciationScore(null);
  }, [targetText, setPronunciationScoring]);

  // Recognition result → score it locally and report up.
  useEffect(() => {
    const applyResult = (event: { results?: { transcript?: string; confidence?: number }[] }) => {
      const best = event?.results?.[0];
      const transcript = (best?.transcript ?? '').trim();
      setPronunciationListening(false);
      setPronunciationScoring(false);
      if (!transcript) return;
      const result = scorePlanPronunciationTranscript({
        targetText: targetTextRef.current,
        transcript,
        recognitionConfidence: typeof best?.confidence === 'number' ? best.confidence : undefined,
      });
      setPronunciationScore(result);
      onScored(result);
      if (result.passed) hapticSuccess();
      else hapticError();
    };

    const resultSub = speechModule.addListener('result', applyResult);
    const noMatchSub = speechModule.addListener('nomatch', () => {
      setPronunciationListening(false);
      setPronunciationScoring(false);
    });
    const endSub = speechModule.addListener('end', () => {
      setPronunciationListening(false);
    });
    const errorSub = speechModule.addListener('error', () => {
      setPronunciationListening(false);
      setPronunciationScoring(false);
    });

    return () => {
      resultSub?.remove?.();
      noMatchSub?.remove?.();
      endSub?.remove?.();
      errorSub?.remove?.();
      try {
        speechModule.abort();
      } catch {
        // recognizer may be unavailable in some builds — safe to ignore on unmount
      }
    };
  }, [onScored]);

  const listenPronunciationTarget = useCallback(() => {
    hapticTap();
    setPronunciationSpeakingTarget(true);
    speakAudio(targetText, 0.86, {
      language: 'en-US',
      onDone: () => {
        setPronunciationSpeakingTarget(false);
        setPronunciationHeardTarget(true);
      },
      onStopped: () => setPronunciationSpeakingTarget(false),
      onError: () => {
        setPronunciationSpeakingTarget(false);
        setPronunciationHeardTarget(true);
      },
    });
  }, [speakAudio, targetText]);

  const startSpeaking = useCallback(async () => {
    hapticTap();
    stopAudio();
    setPronunciationScore(null);
    try {
      const permission = await speechModule.requestPermissionsAsync();
      if (!permission.granted) return;
      setPronunciationListening(true);
      setPronunciationScoring(true);
      speechModule.start({
        lang: 'en-US',
        interimResults: false,
        continuous: false,
        ...(Platform.OS === 'ios' ? { recordingOptions: { persist: true } } : {}),
      });
    } catch {
      setPronunciationListening(false);
      setPronunciationScoring(false);
    }
  }, [stopAudio]);

  const stopSpeaking = useCallback(() => {
    try {
      speechModule.stop();
    } catch {
      // end/error listener will settle state
    }
  }, []);

  const scoreColor = pronunciationScore?.passed
    ? '#3FD68C'
    : pronunciationScore
    ? '#FF6E78'
    : mutedText;
  const statusHint = pronunciationScoring
    ? '\u25cf\u25cf\u25cf \u25cf\u25cf\u25cf \u25cf\u25cf\u25cf'
    : pronunciationScore
    ? pronunciationScore.passed
      ? `Засчитано: ${pronunciationScore.score}% ✓`
      : `Услышал: «${pronunciationScore.transcript}» — ${pronunciationScore.score}%. Нужно ${PLAN_PRONUNCIATION_PASS_THRESHOLD}%.`
    : pronunciationHeardTarget
    ? 'Теперь скажи фразу вслух.'
    : 'Сначала послушай фразу, потом повтори.';

  return (
    <View style={[styles.recorderStack, { borderColor: accent + '44', shadowColor: accent }]}>
      <View style={[styles.recorderHintPill, { backgroundColor: accent + '16', borderColor: accent + '55' }]}>
        <Ionicons name="mic-outline" size={16} color={accent} />
        <Text style={[styles.panelText, { color: mutedText }]}>Послушай фразу, потом скажи её — телефон слушает локально</Text>
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Послушать фразу"
        activeOpacity={0.84}
        disabled={pronunciationSpeakingTarget || pronunciationListening}
        onPress={() => listenPronunciationTarget()}
        style={[
          styles.primaryButton,
          {
            borderColor: accent + '33',
            opacity: pronunciationSpeakingTarget || pronunciationListening ? 0.6 : 1,
            shadowColor: accent,
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.primaryButtonGradient}
        >
          <Text style={[styles.primaryButtonText, { color: accent }]}>
            {pronunciationSpeakingTarget ? 'Звучит фраза…' : 'Послушать фразу'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      <PronunciationSpeakButton
        enabled={pronunciationHeardTarget && !pronunciationSpeakingTarget}
        listening={pronunciationListening}
        accent={accent}
        actionText={actionText}
        onPress={() => (pronunciationListening ? stopSpeaking() : void startSpeaking())}
      />

      <Text style={[styles.panelText, { color: scoreColor, fontWeight: '800' }]}>{statusHint}</Text>
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
  const cellCount = Math.max(1, target);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Прогресс задания: ${correct} из ${target}`}
      style={styles.progressRail}
    >
      {Array.from({ length: cellCount }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.progressCell,
            { backgroundColor: i < correct ? accent : 'rgba(255,255,255,0.10)' },
          ]}
        />
      ))}
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
          style={[styles.primaryButton, { borderColor, shadowColor: toneColor }]}
        >
          <LinearGradient
            colors={isSuccess ? [accent, accent + 'BB'] : isError ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)'] : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryButtonGradient}
          >
            <Text style={[styles.primaryButtonText, { color: buttonTextColor }]}>{actionLabel}</Text>
          </LinearGradient>
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
      animationType="slide"
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
  const { theme: t, themeMode, f } = useTheme();
  const { studyTarget } = useStudyTarget();
  const { lang } = useLang();
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
  const [pronunciationScore, setPronunciationScore] = useState<PlanPronunciationScoringResult | null>(null);
  const [pronunciationScoring, setPronunciationScoring] = useState(false);
  const { flashKey, flash } = useWordFlash();
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
  const handlePronunciationScored = useCallback((result: PlanPronunciationScoringResult) => {
    setPronunciationScore(result);
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
  // Авто-раскладка дистракторов (эталон урока): короткие варианты → сетка 2 кол., длинные → список на всю ширину.
  const useGridOptions = choiceOptions.length > 0 && choiceOptions.every((opt: string) => opt.trim().length <= 14);
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
    setPronunciationScore(null);
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
    await awardPlanTaskCompletion({
      lang,
      studyTarget,
      phrasesPracticed: nextCorrectIds.length,
      planInstanceId,
    });
    setCompleted(true);
  };

  const completePronunciation = async () => {
    if (!item || !session || saving || done || !('targetText' in item)) return;
    // Completion is gated on a real on-device score that reached the pass threshold.
    if (!pronunciationScore || !pronunciationScore.passed) return;
    setSaving(true);
    hapticSuccess();

    await submitAndStorePlanExerciseAnswer(session, {
      result: 'completed',
      contentUnitId: item.id,
      expectedAnswer: item.targetText,
      selectedAnswer: pronunciationScore.transcript,
      grammarTags: item.grammarTags,
      vocabularyTags: item.vocabularyTags,
      mistakeTags: [],
      payload: buildPlanPronunciationAttemptPayload({
        durationMs: 1,
        userPlayedRecording: false,
        transcript: pronunciationScore.transcript,
        score: pronunciationScore.score,
        passed: pronunciationScore.passed,
        provider: 'device_speech_recognition',
        scoringVersion: pronunciationScore.scoringVersion,
        recognitionConfidence: pronunciationScore.recognitionConfidence,
      }),
    }, {
      recoveryWrite,
    }).catch(() => undefined);

    const nextCorrectIds = [...new Set([...correctIds, item.id])];
    setCorrectIds(nextCorrectIds);
    const nextIndex = index + 1;

    if (nextIndex < items.length && nextCorrectIds.length < targetCorrect) {
      setIndex(nextIndex);
      setPronunciationScore(null);
      setSaving(false);
      return;
    }

    await markPersonalPlanTaskCompleted({
      taskId: planTaskId,
      planId,
      planInstanceId,
      dayIndex,
    }).catch(() => undefined);
    await awardPlanTaskCompletion({
      lang,
      studyTarget,
      phrasesPracticed: nextCorrectIds.length,
      planInstanceId,
    });
    setCompleted(true);
    setSaving(false);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bgPrimary }]}>
      <LinearGradient colors={isGold ? ['#171008', '#090704'] : t.bgGradient} style={styles.fill}>
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.78}
            onPress={() => safeRouterBack(router, '/personal_plan')}
            accessibilityRole="button"
            accessibilityLabel="Назад"
            style={[styles.back, { backgroundColor: t.bgCard, borderColor: t.border }]}
          >
            <Ionicons name="chevron-back" size={18} color={t.textPrimary} />
            <Text numberOfLines={1} style={[styles.backText, { color: t.textPrimary, fontSize: f.bodyLg }]}>{chrome.title}</Text>
          </TouchableOpacity>
          <View style={styles.headerStats}>
            <Text style={[styles.statText, { color: t.correct, fontSize: f.label }]}>●{correctIds.length}</Text>
            <Text style={[styles.statText, { color: t.textMuted, fontSize: f.label }]}>/{targetCorrect}</Text>
            {hasAuthoredPlanContent(planId, dayIndex) ? (
              <ReportErrorButton
                variant="icon-flag"
                screen="personal_plan_exercise"
                dataId={`${planId}_day_${dayIndex}_${item?.id ?? 'unit'}`}
                dataText={`${chrome.title} · ${currentExerciseType}`}
                style={styles.reportFlag}
              />
            ) : null}
          </View>
        </View>
        <PlanExerciseProgressRail correct={correctIds.length} target={targetCorrect} accent={accent} />

        <BouncyScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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
              <View style={styles.questionBlock}>
                <Text style={[styles.prompt, { color: t.textMuted }]}>{triLang(lang, {
                  ru: 'Вспомни фразу без подсказок.',
                  uk: 'Пригадай фразу без підказок.',
                  es: 'Recuerda la frase sin pistas.',
                  'pt-BR': 'Lembre-se da frase sem dicas.',
                  vi: 'Nhớ lại cụm từ mà không cần gợi ý.',
                  id: 'Ingat frasa tanpa petunjuk.',
                  tr: 'İpucu olmadan ifadeyi hatırla.',
                  pl: 'Przypomnij sobie frazę bez podpowiedzi.',
                })}</Text>
                <Text style={[styles.english, { color: t.textPrimary }]}>{item.promptRu}</Text>
                <TextInput
                  value={typedAnswer}
                  onChangeText={setTypedAnswer}
                  editable={!lastResult && !saving}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Введи по-английски"
                  placeholderTextColor={t.textMuted}
                  style={[styles.recallInput, { color: t.textSecond, borderBottomColor: lastResult === 'wrong' ? t.wrong : t.border }]}
                  returnKeyType="done"
                  onSubmitEditing={() => void submitRecall()}
                />
              </View>

              {!lastResult ? (
                <PlanGradientButton
                  label="Проверить"
                  accent={accent}
                  actionText={actionText}
                  disabled={saving || typedAnswer.trim().length === 0}
                  onPress={() => void submitRecall()}
                  style={{ marginTop: 18 }}
                />
              ) : null}
            </>
          ) : isListenBuildMode && isPersonalPlanListenBuildItem(item) ? (
            <>
              <View style={styles.questionBlock}>
                <Text style={[styles.prompt, { color: t.textMuted }]}>{triLang(lang, {
                  ru: 'Сначала слушай, потом собирай фразу по порядку.',
                  uk: 'Спершу слухай, потім збирай фразу по порядку.',
                  es: 'Primero escucha, luego ordena la frase.',
                  'pt-BR': 'Primeiro escute, depois monte a frase na ordem.',
                  vi: 'Nghe trước, sau đó sắp xếp cụm từ theo thứ tự.',
                  id: 'Dengarkan dulu, lalu susun frasa sesuai urutan.',
                  tr: 'Önce dinle, sonra ifadeyi sırayla diz.',
                  pl: 'Najpierw słuchaj, potem ułóż frazę po kolei.',
                })}</Text>
                <PlanListenChooseAudioButton
                  item={item}
                  accent={accent}
                  actionText={actionText}
                  mutedText={t.textMuted}
                />
                <View
                  accessibilityLabel="Поле собранной фразы"
                  style={[styles.listenBuildAnswerBox, { borderColor: t.border, backgroundColor: t.bgCard }]}
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
                      style={[styles.listenBuildAnswerChip, { borderColor: t.border, backgroundColor: t.bgSurface2 }]}
                    >
                      <Text style={[styles.listenBuildAnswerText, { color: t.textPrimary }]}>{word}</Text>
                    </TouchableOpacity>
                  )) : (
                    <Text style={[styles.listenBuildPlaceholder, { color: t.textMuted }]}>Слова появятся здесь</Text>
                  )}
                </View>
              </View>

              <View style={[styles.wordBank, { borderColor: t.border, backgroundColor: t.bgCard }]}>
                {item.wordOptions.map((word: string, wordIndex: number) => {
                  const usedCount = buildWords.filter((value) => value === word).length;
                  const availableCount = item.wordOptions.filter((value) => value === word).length;
                  const disabled = Boolean(lastResult) || saving || usedCount >= availableCount || buildWords.length >= item.targetWords.length;
                  const tileKey = `${wordIndex}`;
                  const on = flashKey === tileKey;
                  return (
                    <DuoPressable
                      key={`${word}:${wordIndex}`}
                      accessibilityLabel={`Добавить слово: ${word}`}
                      withHaptic={false}
                      disabled={disabled}
                      edgeHeight={5}
                      edgeColor={on ? accent : 'rgba(0,0,0,0.30)'}
                      style={[
                        styles.wordTile,
                        {
                          backgroundColor: on ? accent : t.bgCard,
                          borderColor: on ? accent : t.border,
                          borderWidth: on ? 1.5 : 1.5,
                          opacity: disabled ? 0.42 : 1,
                        },
                      ]}
                      onPress={() => {
                        flash(tileKey);
                        requestAnimationFrame(() => { void hapticTap(); });
                        setBuildWords((current) => [...current, word]);
                      }}
                    >
                      <Text style={[styles.wordTileText, { color: on ? (t.correctText ?? '#fff') : t.textPrimary, fontWeight: on ? '700' : '700' }]}>{word}</Text>
                    </DuoPressable>
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
                    style={[styles.secondaryButton, { borderColor: t.border, backgroundColor: t.bgCard }]}
                  >
                    <Text style={[styles.secondaryButtonText, { color: buildWords.length > 0 ? t.textPrimary : t.textMuted }]}>Назад</Text>
                  </TouchableOpacity>
                  <PlanGradientButton
                    label="Проверить"
                    accent={accent}
                    actionText={actionText}
                    disabled={saving || buildWords.length !== item.targetWords.length}
                    onPress={() => void submitListenBuild()}
                    style={{ flex: 1 }}
                  />
                </View>
              ) : null}
            </>
          ) : isPronunciationMode && 'targetText' in item && 'completionLabel' in item ? (
            <>
              <View style={styles.questionBlock}>
                <Text style={[styles.prompt, { color: t.textMuted }]}>{triLang(lang, {
                  ru: 'Произнеси фразу вслух спокойно и без гонки.',
                  uk: 'Вимов фразу вголос спокійно й без поспіху.',
                  es: 'Di la frase en voz alta con calma y sin prisa.',
                  'pt-BR': 'Diga a frase em voz alta com calma, sem pressa.',
                  vi: 'Đọc to cụm từ một cách bình tĩnh, không vội.',
                  id: 'Ucapkan frasa dengan tenang tanpa terburu-buru.',
                  tr: 'İfadeyi sakince ve acele etmeden yüksek sesle söyle.',
                  pl: 'Wypowiedz frazę na głos spokojnie, bez pośpiechu.',
                })}</Text>
                <Text style={[styles.english, { color: t.textPrimary }]}>{item.targetText}</Text>
                <Text style={[styles.panelText, { color: t.textMuted }]}>{item.promptRu}</Text>
              </View>

              <PlanPronunciationRecorder
                accent={accent}
                actionText={actionText}
                mutedText={t.textMuted}
                targetText={item.targetText}
                onScored={handlePronunciationScored}
                onScoringChange={setPronunciationScoring}
              />

              <PlanGradientButton
                label={item.completionLabel}
                accent={accent}
                actionText={actionText}
                disabled={saving || pronunciationScoring || !pronunciationScore?.passed}
                onPress={() => void completePronunciation()}
                style={{ marginTop: 18 }}
              />
            </>
          ) : (
            <>
              <View style={styles.questionBlock}>
                <Text style={[styles.prompt, { color: t.textMuted }]}>
                  {isListeningMode
                    ? triLang(lang, {
                        ru: 'Сначала послушай фразу, потом выбери смысл.',
                        uk: 'Спершу послухай фразу, потім обери зміст.',
                        es: 'Primero escucha la frase, luego elige el significado.',
                        'pt-BR': 'Primeiro escute a frase, depois escolha o significado.',
                        vi: 'Nghe cụm từ trước, sau đó chọn nghĩa.',
                        id: 'Dengarkan frasa dulu, lalu pilih maknanya.',
                        tr: 'Önce ifadeyi dinle, sonra anlamını seç.',
                        pl: 'Najpierw posłuchaj frazy, potem wybierz znaczenie.',
                      })
                    : isChoiceMode
                    ? `${triLang(lang, {
                        ru: 'Смысл',
                        uk: 'Зміст',
                        es: 'Significado',
                        'pt-BR': 'Significado',
                        vi: 'Nghĩa',
                        id: 'Makna',
                        tr: 'Anlam',
                        pl: 'Znaczenie',
                      })}: ${item.promptRu}`
                    : item.promptRu}
                </Text>
                <Text style={[styles.english, isChoiceMode ? styles.choiceInstruction : null, { color: t.textPrimary }]}>
                  {isListeningMode
                    ? triLang(lang, { ru: 'На слух', uk: 'На слух', es: 'De oído', 'pt-BR': 'De ouvido', vi: 'Theo âm thanh', id: 'Dengan mendengar', tr: 'Kulaktan', pl: 'Ze słuchu' })
                    : isChoiceMode
                    ? triLang(lang, {
                        ru: 'Нажми лучший вариант ниже',
                        uk: 'Натисни найкращий варіант нижче',
                        es: 'Toca la mejor opción abajo',
                        'pt-BR': 'Toque na melhor opção abaixo',
                        vi: 'Chạm vào lựa chọn tốt nhất bên dưới',
                        id: 'Ketuk pilihan terbaik di bawah',
                        tr: 'Aşağıdaki en iyi seçeneğe dokun',
                        pl: 'Dotknij najlepszej opcji poniżej',
                      })
                    : 'displayEnglish' in item
                    ? String(item.displayEnglish)
                    : triLang(lang, {
                        ru: 'Выбери подходящую фразу',
                        uk: 'Обери відповідну фразу',
                        es: 'Elige la frase adecuada',
                        'pt-BR': 'Escolha a frase adequada',
                        vi: 'Chọn cụm từ phù hợp',
                        id: 'Pilih frasa yang sesuai',
                        tr: 'Uygun ifadeyi seç',
                        pl: 'Wybierz odpowiednią frazę',
                      })}
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

              <View style={styles.optionsSpacer} />

              <View style={useGridOptions ? styles.optionsGrid : styles.options}>
                {choiceOptions.map((option: string) => {
                  const isSelected = selected === option;
                  const isCorrect = option === currentCorrectAnswer;
                  const isWrong = lastResult && isSelected && !isCorrect;
                  const isRight = lastResult && isSelected && isCorrect;
                  const on = flashKey === option;
                  const borderColor = isRight
                    ? t.correct
                    : isWrong
                    ? t.wrong
                    : on
                    ? accent
                    : isSelected
                    ? accent
                    : t.border;
                  const bgColor = isRight
                    ? t.correctBg
                    : isWrong
                    ? t.wrongBg
                    : on
                    ? accent
                    : t.bgCard;
                  const textColor = isRight
                    ? t.correct
                    : isWrong
                    ? t.wrong
                    : on
                    ? (t.correctText ?? '#fff')
                    : t.textPrimary;
                  return (
                    <DuoPressable
                      key={option}
                      accessibilityLabel={`Выбрать ответ: ${option}`}
                      withHaptic={false}
                      disabled={Boolean(lastResult) || saving}
                      edgeHeight={5}
                      edgeColor={on ? accent : 'rgba(0,0,0,0.30)'}
                      wrapStyle={useGridOptions ? styles.optionGridWrap : undefined}
                      style={[
                        useGridOptions ? styles.optionGridSurface : styles.option,
                        { backgroundColor: bgColor, borderColor, borderWidth: on ? 1.5 : (useGridOptions ? 0.5 : 1) },
                      ]}
                      onPress={() => {
                        flash(option);
                        requestAnimationFrame(() => { void hapticTap(); });
                        void submit(option);
                      }}
                    >
                      <Text
                        style={[
                          useGridOptions ? styles.optionGridText : styles.optionText,
                          { color: textColor, fontWeight: on ? '700' : (useGridOptions ? '500' : '600') },
                        ]}
                        numberOfLines={useGridOptions ? 1 : undefined}
                        adjustsFontSizeToFit={useGridOptions}
                      >
                        {option}
                      </Text>
                    </DuoPressable>
                  );
                })}
              </View>

              {lastResult ? <View style={styles.doneSpacer} /> : null}
            </>
          )}
        </BouncyScrollView>
        <View style={[styles.footer, { borderTopColor: t.border }]}>
          <TouchableOpacity
            activeOpacity={0.78}
            onPress={() => safeRouterBack(router, '/personal_plan')}
            accessibilityRole="button"
            accessibilityLabel="Отменить"
            style={styles.footerButton}
          >
            <Ionicons name="arrow-undo" size={26} color={t.textSecond} />
            <Text style={[styles.footerLabel, { color: t.textMuted, fontSize: f.label }]}>Отменить</Text>
          </TouchableOpacity>
        </View>
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
          onAction={() => safeRouterBack(router, '/personal_plan')}
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
  backText: TextStyle;
  headerStats: ViewStyle;
  statText: TextStyle;
  reportFlag: ViewStyle;
  headerCopy: ViewStyle;
  headerModeIcon: ViewStyle;
  kicker: TextStyle;
  h1: TextStyle;
  progress: TextStyle;
  progressRail: ViewStyle;
  progressCell: ViewStyle;
  scroll: ViewStyle;
  questionBlock: ViewStyle;
  footer: ViewStyle;
  footerButton: ViewStyle;
  footerLabel: TextStyle;
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
  optionsSpacer: ViewStyle;
  optionsGrid: ViewStyle;
  option: ViewStyle;
  optionText: TextStyle;
  optionGrid: ViewStyle;
  optionGridWrap: ViewStyle;
  optionGridSurface: ViewStyle;
  optionGridText: TextStyle;
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
  primaryButtonGradient: ViewStyle;
  primaryButtonText: TextStyle;
  optionBadge: ViewStyle;
  optionBadgeText: TextStyle;
};

const styles = StyleSheet.create<PersonalPlanExerciseStyles>({
  safe: { flex: 1 },
  fill: { flex: 1 },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalSheet: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  header: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '70%',
    borderRadius: 20,
    borderWidth: 0.5,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  backText: { fontWeight: '600', flexShrink: 1 },
  headerStats: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  statText: { fontWeight: '700' },
  reportFlag: { marginLeft: 10, paddingHorizontal: 4 },
  headerCopy: { flex: 1, minWidth: 0 },
  headerModeIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: { fontSize: 11, lineHeight: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0 },
  h1: { fontSize: 27, lineHeight: 32, fontWeight: '700' },
  progress: { fontSize: 20, lineHeight: 25, fontWeight: '700' },
  progressRail: {
    flexDirection: 'row',
    gap: 2,
    marginHorizontal: 14,
    marginBottom: 8,
  },
  progressCell: {
    flex: 1,
    height: 8,
    borderRadius: 4,
  },
  scroll: { padding: 16, paddingBottom: 34, flexGrow: 1 },
  questionBlock: { gap: 14, paddingTop: 8, paddingBottom: 4 },
  optionsSpacer: { flex: 1, minHeight: 12 },
  footer: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderTopWidth: 0.5,
  },
  footerButton: { flex: 1, alignItems: 'center' },
  footerLabel: { marginTop: 4 },
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
  panelTitle: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
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
  modeEyebrow: { fontSize: 12, lineHeight: 15, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0 },
  modeHint: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  liquidRail: { height: 2, borderRadius: 2, opacity: 0.72 },
  prompt: { fontSize: 16, lineHeight: 22, fontWeight: '500', textAlign: 'center' },
  english: { fontSize: 27, lineHeight: 31, fontWeight: '700', textAlign: 'center' },
  choiceInstruction: { fontSize: 22, lineHeight: 28 },
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
  listenBuildAnswerText: { fontSize: 18, lineHeight: 23, fontWeight: '700' },
  listenBuildPlaceholder: { fontSize: 16, lineHeight: 22, fontWeight: '700', textAlign: 'center' },
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
  wordTileText: { fontSize: 18, lineHeight: 23, fontWeight: '700' },
  options: { marginTop: 18, gap: 10 },
  optionsGrid: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
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
  explainTitle: { fontSize: 18, lineHeight: 23, fontWeight: '700' },
  explainText: { fontSize: 15, lineHeight: 22, fontWeight: '700' },
  feedbackSurface: {
    marginTop: 0,
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    gap: 14,
    elevation: 12,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 22,
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
  feedbackTitle: { flex: 1, fontSize: 19, lineHeight: 24, fontWeight: '700' },
  feedbackBody: { fontSize: 15, lineHeight: 22, fontWeight: '700' },
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
    borderBottomWidth: 1,
    paddingHorizontal: 4,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    textAlign: 'center',
  },
  recallAnswer: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  rowActions: { marginTop: 18, flexDirection: 'row', gap: 10 },
  secondaryButton: {
    minHeight: 72,
    minWidth: 104,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryButtonText: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  primaryButton: {
    minHeight: 72,
    borderRadius: 22,
    borderWidth: 1.5,
    elevation: 5,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
  },
  primaryButtonGradient: {
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 18,
    overflow: 'hidden',
  },
  primaryButtonText: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  optionBadge: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  optionBadgeText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  option: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    justifyContent: 'center',
  },
  optionText: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  optionGrid: {
    width: '48%',
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 0.5,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionGridWrap: {
    width: '48%',
    marginBottom: 10,
  },
  optionGridSurface: {
    borderRadius: 12,
    borderWidth: 0.5,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  optionGridText: { fontSize: 20, lineHeight: 25, fontWeight: '500', textAlign: 'center' },
});
