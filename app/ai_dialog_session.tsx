import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DebugLogger } from './debug-logger';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Animated,
  ActivityIndicator,
  Easing,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { File } from 'expo-file-system';
import { useTheme } from '../components/ThemeContext';
import { useAccentGraphics } from '../hooks/use_accent_graphics';
import { usePremium, useFeatureAccess } from '../components/PremiumContext';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import ScreenGradient from '../components/ScreenGradient';
import { glassFill } from '../components/GlassSurface';
import ReportErrorButton from '../components/ReportErrorButton';
import AiTypingBubble from '../components/AiTypingBubble';
import DialogQuotaBadge, { formatAiDialogQuotaResetDate } from '../components/DialogQuotaBadge';
import { callPremiumDialogStream, warmPremiumDialogStream, DialogStreamError } from './ai_dialog_stream_client';
import { DIALOG_TRANSLATE_PREFETCH_ENABLED } from './ai_dialog_flags';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hapticError, hapticTap } from '../hooks/use-haptics';
import { useAudio } from '../hooks/use-audio';
import { useDialogueVoicePlayback } from '../hooks/use-dialogue-voice-playback';
import { useManagedRecordingAudio } from '../hooks/use_managed_recording_audio';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import {
  scenarioObjectives,
  scenarioTemperament,
  temperamentStartMood,
  type DialogObjective,
  type DialogScenario,
} from './ai_dialog_scenarios';
import { moodToFace, DEFAULT_MOOD } from './dialog_mood_face';
import {
  parseTurnState,
  isTerminalOutcome,
  type DialogOutcome,
} from './dialog_outcome';
import { parseKeyPhrases, stripMarkers } from './ai_dialog_markup';
import { buildScenarioGreeting } from './ai_dialog_greeting';
import { resolveDialogueRouteScenario } from './dialogue_route_scenario';
import { MissingDialogueScreen } from './ai_dialog_briefing';
import {
  EMPTY_COACH,
  hasCoachExplanation,
  isWeakLearnerReply,
  parseDialogCoach,
  type DialogCoachTurn,
} from './ai_dialog_coach';
import DialogBubbleActions from '../components/dialogs/DialogBubbleActions';
import DialogWhySheet from '../components/dialogs/DialogWhySheet';
import DialogGoalsSheet from '../components/dialogs/DialogGoalsSheet';
import DialogHintModal from '../components/dialogs/DialogHintModal';
import { triLang, type Lang } from '../constants/i18n';
import { getLessonData } from './lesson_data_all';
import { getLessonDialogScenarioId } from './lesson_dialog_scenarios';
import { aiOffline, aiOfflineDialogScreen } from './ai_kill_switch_copy';
import {
  callPremiumDialogSend,
  callPremiumDialogTranslate,
  warmPremiumDialogTranslate,
  callPremiumDialogReview,
  warmPremiumDialog,
  classifyPremiumDialogError,
  getPremiumDialogErrorMessage,
  type DialogChatTurn,
  type DialogQualityMeta,
  type PremiumDialogErrorKind,
  type PremiumDialogReviewResponse,
} from './ai_dialog_client';
import { buildDialogueCompletionFallback, isCompletionReviewUsable } from './dialogue_completion_debrief';
import SkeletonBlock from '../components/SkeletonShimmer';
import DialogVerdictScreen from '../components/DialogVerdictScreen';
import FeedbackRatingCard from '../components/FeedbackRatingCard';
import { shouldPromptFeedback, markFeedbackPrompted } from './feedback_prompt_throttle';
import { makeFeedbackAttemptId } from './feedback_attempt_identity';
import { sceneThemeFor } from '../constants/dialogSceneThemes';
import { markDialogCompleted } from './dialogs_progress';
import { trackEvent } from './analytics';
import { captureAccountGeneration } from './account_generation';
import { markAiDialogDailyQuotaExhausted, parseAiDialogQuotaObservation, quotaObservationFromDialogError, readAiDialogDailyQuota, recordAiDialogDailyQuotaFromServer, type AiDialogQuotaObservation } from './ai_dialog_daily_quota';
import { REVENUE_MONTHLY_LIMITS } from './revenue_daily_limits';
import { readUnifiedLevelSpinStars } from './level_spin_star_grants';
import {
  buyDialogHintLocally,
  getDialogHintsLeftToday,
  markDialogHintUsed,
  DIALOG_HINT_PRICE_RUNES,
  FREE_DIALOG_HINTS_PER_DAY,
} from './ai_dialog_hint_economy';
import { useVoiceAttemptGate } from '../hooks/use_voice_attempt_gate';
import MicAllowanceBadge from '../components/MicAllowanceBadge';
import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { aiDialogContentAvailableForTarget, aiDialogTargetGateCopy } from './ai_dialog_target_gate';
import { useOrphanDialogRouteRedirect } from './orphan_dialog_route_redirect';
import { dialogueLanguageMeta, resolveDialogueStudyTarget } from './dialogue_language_registry';
import { dialogueScenarioForTarget } from './dialogue_language_packs';
import { dialogueScenarioPresentation } from './dialogue_scenario_presentation';
import {
  isSpeechRecognitionAvailable,
  loadSpeechRecognitionModule,
  readSpeechRecognitionLocaleInventory,
  requestSpeechPermissionForHold,
  scheduleSpeechStopSettlement,
} from './speech_recognition_module';
import { resolveDialogueAsrCapability } from './dialogue_voice_capability';
import { speechUnavailableOnDeviceText, useSpeechUnavailableOnDevice } from './speech_device_availability';
import { buildSpeakingStartOptions } from './speaking_recognition_options';
import { TranscriptAccumulator } from './speaking_transcript_accumulator';
import { useRecordStartCue } from '../hooks/use-record-start-cue';
import AiDialogConsentGate from './ai_dialog_consent_gate';
import { buildDialogueVoiceAttachment, describeDialogueVoiceMessage, type DialogueVoiceDraft } from './dialogue_voice_message';
import { claimSpokenAudio, whenSpokenAudioReady, type SpokenAudioClaim } from '../modules/audio/audio_runtime_arbiter';

import { noAndroidOutline } from '../constants/androidGlow';
import { noteSwallowed, noteSwallowedHandler } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее
/**
 * Сколько обменов считаем нормальной длиной сцены.
 *
 * зачем 14, а не 8 (владелец 2026-09-17: «диалог заканчивается очень быстро,
 * заданий должно быть больше»): число заданий в сценарии выросло до 4–7, а одно
 * задание — это примерно 2–3 реплики. При старом потолке 8 сервер объявлял бы
 * `stalled` («заглох») раньше, чем человек успел закрыть последнюю цель, и
 * длинные сцены обрывались бы победой, которой не было. Это же число задаёт
 * нейтральный финал ручного «Завершить».
 */
const RECOMMENDED_EXCHANGES = 14;
/**
 * Пауза между финальной репликой собеседника и полноэкранным вердиктом.
 *
 * зачем (владелец 2026-09-17): «пусть появится реплика собеседника, подождём
 * 3–5 секунд, и после этого экран завершения». Взяли нижнюю границу: 3 секунды
 * хватает дочитать одну-две фразы, а кто прочитал быстрее — тапает и не ждёт.
 */
const VERDICT_DELAY_MS = 3000;
/**
 * Слот подсказки-лампочки в реестре открытых подсказок (`hintRevealedFor`).
 * Обычные слоты — индексы реплик собеседника (0, 1, 2…), поэтому лампочке
 * нужен свой, заведомо не пересекающийся с ними.
 */
// зачем константы HINT_BUTTON_SLOT больше нет (владелец 2026-09-18): она
// заводила лампочке слот в реестре ПЛАТНЫХ подсказок, а лампочка бесплатна.
/**
 * Сверху слой-пропускалка не перекрывает шапку: высота ряда «назад/аватар/имя»
 * (кнопка 40 + вертикальные отступы 10+10). Иначе на время паузы пропадала бы
 * единственная кнопка выхода с экрана.
 */
const VERDICT_SKIP_LAYER_TOP = 60;
// 'unavailable' — устройство/движок реально не умеет распознавание (жёсткий отказ).
// 'error' — транзиентный сбой (движок дал error/nomatch без текста, start() кинул):
// стоит предложить «Повторить», а не пугать «недоступно на этом устройстве».
type VoiceInputStatus =
  | 'idle'
  | 'requesting'
  | 'listening'
  | 'finishing'
  | 'unavailable'
  | 'denied'
  | 'stalled'
  | 'error';

/**
 * Достаёт имя персонажа из persona-строки для подписи в шапке-мессенджере:
 * «Your name is Mia. …» → «Mia», «Your name is Mr. Patel. …» → «Mr. Patel».
 * Имя — это всё после «your name is» до конца предложения (точка/запятая +
 * пробел + заглавная буква), поэтому точка в титуле (Mr./Dr.) не обрывает имя.
 * Возвращает пустую строку, если имя не задано.
 */
function extractPersonaName(persona?: string): string {
  if (!persona) return '';
  // Опциональный титул (Mr./Dr./…) + само имя до точки/запятой. Титул со своей
  // точкой не обрывает имя: «Mr. Patel» извлекается целиком, «Mia» — как есть.
  const match = persona.match(/your name is\s+((?:(?:Mr|Mrs|Ms|Dr|Prof)\.\s+)?[^.,]+)/i);
  return match ? match[1].trim() : '';
}

function buildLessonDialogScenario(lessonId: number): DialogScenario | null {
  const scenarioId = getLessonDialogScenarioId(lessonId);
  if (!scenarioId) return null;
  const lessonPhrases = getLessonData(lessonId)
    .map((phrase) => String(phrase.english ?? '').trim())
    .filter(Boolean)
    .slice(0, 12);
  if (lessonPhrases.length === 0) return null;
  const usefulPhrases = lessonPhrases.join('; ');
  return {
    id: scenarioId,
    category: 'everyday',
    titleRu: `Диалог урока ${lessonId}`,
    titleEs: `Diálogo de la lección ${lessonId}`,
    titleEn: `Lesson ${lessonId} dialogue`, // зачем (12.10, английский интерфейс входит в R1): без него в en стояло русское название
    goalRu: `Используй фразы и конструкции урока ${lessonId} в короткой живой сцене`,
    goalEs: `Usa las frases y construcciones de la lección ${lessonId} en una escena breve y realista`,
    role: 'a patient English practice partner',
    setting: `a simple real-life scene based on lesson ${lessonId}`,
    persona:
      'Your name is Leo. You are a warm, encouraging language buddy who is genuinely happy to practise with the learner. ' +
      'You celebrate small wins, keep the mood light, and gently nudge them to reuse the lesson phrases.',
    goalEn:
      `Practice a realistic short conversation using phrases and grammar from lesson ${lessonId}. ` +
      `Useful lesson phrases: ${usefulPhrases}. ` +
      'Steer the learner to reuse these phrases naturally. Keep replies short and beginner-friendly.',
    cefr: lessonId <= 8 ? 'A1' : lessonId <= 20 ? 'A2' : 'B1',
    icon: 'compass-outline',
    active: true,
    sourceLessonId: lessonId,
    requiredPhraseIds: [],
    nextStepHintRu: 'Ответь одной короткой фразой из урока или похожей конструкцией.',
    nextStepHintEs: 'Responde con una frase corta de la lección o una construcción parecida.',
    nextStepHintEn: 'Reply with one short phrase from the lesson or a similar construction.',
  };
}

interface UiMessage {
  role: 'user' | 'assistant';
  text: string;
  /** Ephemeral local replay; transcript stays internal to the dialogue turn. */
  voice?: Readonly<{ uri: string }>;
}

function deleteDialogueVoiceRecording(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (swallowedError) {
    noteSwallowed('ai_dialog_session:deleteDialogueVoiceRecording.catch', swallowedError);
    // Cache cleanup is best-effort; never let a stale recording break a chat.
  }
}

// Полностью локализованная (8 языков) подпись кнопки «Повторить».
function dialogRetryLabel(lang: Lang): string {
  return triLang(lang, {
    ru: 'Отправить снова',
    uk: 'Надіслати знову',
    en: 'Send again',
    es: 'Enviar de nuevo',
    'pt-BR': 'Enviar de novo',
    vi: 'Gửi lại',
    id: 'Kirim lagi',
    tr: 'Tekrar gönder',
    pl: 'Wyślij ponownie',
  });
}

function AiDialogSession({ scenario }: { scenario: DialogScenario }) {
  const { theme: t, f } = useTheme();
  const accentGfx = useAccentGraphics(); // зачем (светлый акцент, аудит 13.10 §1): графика на сыром accent невидима в светлых градиентных темах — глубокий токен accentBorder (в тёмном ≈ accent, вид не меняется)
  const { lang } = useLang();
  const [feedbackAttemptId] = useState(makeFeedbackAttemptId);
  const { studyTarget } = useStudyTarget();
  const { hasPremiumAccess, accessResolved } = usePremium();
  // Доступ к фиче «ИИ-диалоги» с учётом «Пульта»: true → пейвол не показываем
  // (фича переведена в «Фри»). Серверный isPremium ниже остаётся СЫРЫМ premium —
  // «Фри» снимает замок, но НЕ выдаёт премиум-квоту реплик.
  const dialogAccess = useFeatureAccess('ai_dialog');
  // зачем (владелец, 2026-09-13): обычный аккаунт получает ДНЕВНОЙ лимит реплик,
  // а не глухой «только в Plus». dialogAccess=false теперь значит «лимит
  // действует»: вход решает клиентское зеркало серверной квоты
  // (ai_dialog_daily_quota.ts), исчерпание — по ответу сервера dialog_free_limit.
  // 'checking' держит отправку до чтения зеркала (миллисекунды, AsyncStorage).
  const [dailyQuotaGate, setDailyQuotaGate] = useState<'checking' | 'open' | 'exhausted'>('checking');
  const dialogSessionOpen = hasPremiumAccess || dailyQuotaGate === 'open';
  const [dailyQuotaRemaining, setDailyQuotaRemaining] = useState<number | null>(null);
  // зачем тип number явно: REVENUE_MONTHLY_LIMITS заморожен `as const`, и без
  // аннотации состояние сужалось до литерала — серверный лимит (сервер
  // авторитетен и может дать другое число) в него не записывался вообще.
  // D111: лимит МЕСЯЧНЫЙ (30 ответов в календарный месяц UTC); имена *daily*
  // оставлены, чтобы не переписывать экран целиком.
  const [dailyQuotaLimit, setDailyQuotaLimit] = useState<number>(REVENUE_MONTHLY_LIMITS.ai_dialog_replies);
  // Граница месяца от сервера (1-е число 00:00 UTC); null — ещё не знаем.
  const [quotaResetAtMs, setQuotaResetAtMs] = useState<number | null>(null);
  const quotaResetDate = formatAiDialogQuotaResetDate(quotaResetAtMs, lang);
  const accountStableId = captureAccountGeneration().stableId;
  // зачем (владелец 15.10, D196; Ядро: «старую квоту убрать, иначе два лимита и две цифры»): голосовой ввод ИИ-диалога — из общего дневного счётчика 3/день, цифра остатка на микрофоне
  const voiceInputGate = useVoiceAttemptGate({ surface: 'ai_dialog', source: 'ai_dialog_voice_input' });
  const router = useRouter();
  const aiDialogGateOpen = aiDialogContentAvailableForTarget(studyTarget);
  const dialogueTarget = resolveDialogueStudyTarget(studyTarget);
  const dialogueSpeechLocale = dialogueTarget ? dialogueLanguageMeta(dialogueTarget).speechLocale : null;
  const frenchGateCopy = aiDialogTargetGateCopy(lang, studyTarget);
  const { speak: legacySpeak, stop: stopSpeaking } = useAudio();
  const strictDialogueVoice = useDialogueVoicePlayback(studyTarget);
  const strictPlaybackUnavailable = dialogueTarget !== 'en' && (!strictDialogueVoice.available || strictDialogueVoice.loading);
  const speakDialogue = useCallback((text: string) => {
    if (dialogueTarget === 'en') {
      legacySpeak(text, undefined, { language: dialogueSpeechLocale ?? 'en-US', voice: '' });
      return true;
    }
    return strictDialogueVoice.speakDialogue(text);
  }, [dialogueSpeechLocale, dialogueTarget, legacySpeak, strictDialogueVoice]);
  const speechModule = useMemo(() => loadSpeechRecognitionModule(), []);
  // зачем (§SPEECH-NA, владелец 04.10): без распознавателя на устройстве микрофон
  // диалога заранее перечёркнут, тап не трогает квоту/пейвол и пишет понятное
  // «не работает на этом устройстве»; диалог идёт текстом.
  const speechNa = useSpeechUnavailableOnDevice();
  const recordingAudio = useManagedRecordingAudio(() => {
    try { speechModule?.abort(); } catch (e) {
      // native capture already gone
      DebugLogger.error('ai_dialog_session:recordingAudio', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  });
  const restoreLoudPlaybackMode = recordingAudio.release;
  // зачем: экран диалога не размонтируется при сворачивании приложения, поэтому нужен явный
  // сигнал «ушли в фон» — иначе распознавание речи продолжает слушать микрофон (см. эффект ниже).
  const runtimeActive = useRuntimeActive();
  const runtimeActiveRef = useRef(runtimeActive);
  runtimeActiveRef.current = runtimeActive;
  const { playRecordStart } = useRecordStartCue();
  const params = useLocalSearchParams<{ scenarioId?: string; lessonId?: string; runId?: string }>();
  const sessionKey = String(params.runId || feedbackAttemptId);
  const targetScenario = dialogueScenarioForTarget(scenario, dialogueTarget ?? 'en')?.targetScenario;
  const presentation = dialogueScenarioPresentation(scenario, studyTarget, lang);
  const promptScenario = useMemo(() => {
    if (dialogueTarget === 'en') {
      return {
        role: scenario.role,
        setting: scenario.setting,
        goal: scenario.goalEn,
        persona: scenario.persona,
        greeting: buildScenarioGreeting(scenario),
        objectives: scenarioObjectives(scenario),
      };
    }
    if (!targetScenario) return null;
    return {
      role: targetScenario.role,
      setting: targetScenario.setting,
      goal: targetScenario.goal,
      persona: targetScenario.persona,
      greeting: targetScenario.greeting,
      objectives: targetScenario.objectives.map(({ id, text }) => ({ id, labelRu: text, en: text })),
    };
  }, [dialogueTarget, scenario, targetScenario]);
  const dialogueRuntimeOpen = aiDialogGateOpen && promptScenario !== null && presentation !== null;

  useEffect(() => {
    if (!accessResolved || !dialogueRuntimeOpen) return;
    if (hasPremiumAccess) {
      setDailyQuotaRemaining(null);
      setDailyQuotaGate('open');
      return;
    }
    let cancelled = false;
    void readAiDialogDailyQuota(studyTarget, accountStableId).then((state) => {
      if (cancelled) return;
      console.log('[DIALOG-QUOTA] entry:gate', JSON.stringify({ status: state.status, limit: state.limit, stableId: accountStableId }));
      setDailyQuotaLimit(state.limit);
      setDailyQuotaRemaining(state.status === 'allowed' || state.status === 'exhausted' ? state.remaining : state.limit);
      setQuotaResetAtMs(state.status === 'allowed' || state.status === 'exhausted' ? state.resetAtMs : null);
      if (state.status === 'unknown' || state.status === 'allowed') {
        setDailyQuotaGate('open');
        return;
      }
      // зачем (владелец 2026-09-14, макет «Стена Free»): вход с уже исчерпанным
      // лимитом раньше мгновенно перебрасывал на пейвол — человек не успевал
      // увидеть даже сцену. Теперь экран открывается как обычно, а вместо поля
      // ввода стоит карточка: переписка и разбор доступны, Plus по тапу.
      setDailyQuotaGate('exhausted');
      DebugLogger.info('[DIALOG-WALL] entry with exhausted quota', JSON.stringify({
        scenarioId: scenario.id,
        limit: state.limit,
      }));
    });
    return () => { cancelled = true; };
  }, [accessResolved, accountStableId, dialogueRuntimeOpen, hasPremiumAccess, router, scenario.id, studyTarget]);

  /**
   * Сервер ответил «месячный лимит исчерпан» (D111).
   *
   * зачем (владелец 2026-09-14, утверждённый макет «Стена Free», вариант А):
   * раньше человека МГНОВЕННО выбрасывало на пейвол — разговор исчезал с
   * экрана, будто его и не было, а разбор своих фраз становился недоступен.
   * Теперь поле ввода превращается в спокойную карточку: переписка видна,
   * разбор можно открыть бесплатно, место сохранено. Пейвол остаётся, но
   * ТОЛЬКО по явному тапу — это выбор человека, а не удар дверью.
   */
  const handleDailyLimitReached = useCallback((observation?: AiDialogQuotaObservation | null) => {
    void markAiDialogDailyQuotaExhausted(studyTarget, accountStableId, observation);
    setDailyQuotaRemaining(0);
    if (observation) setQuotaResetAtMs(observation.resetAtMs);
    setDailyQuotaGate('exhausted');
    void trackEvent('ai_dialog_limit_hit', { scenarioId: scenario.id, reason: 'monthly_limit' });
    DebugLogger.info('[DIALOG-WALL] daily limit reached', JSON.stringify({
      scenarioId: scenario.id,
      stableId: accountStableId,
    }));
  }, [accountStableId, scenario.id, studyTarget]);

  /**
   * Optimistic UI (D111): остаток месяца уменьшается в кадре отправки, до
   * ответа сервера. Ответ сервера затем ставит авторитетное число (сверка),
   * отказ, который не засчитал реплику, возвращает единицу (откат).
   * Токен — защита от гонки: откат старой отправки не трогает счётчик, если
   * после неё уже была новая отправка (её значение свежее).
   */
  const quotaSpendTokenRef = useRef(0);
  const spendQuotaOptimistically = useCallback((source: 'send' | 'retry') => {
    const token = ++quotaSpendTokenRef.current;
    const applied = !hasPremiumAccess;
    if (applied) {
      setDailyQuotaRemaining((prev) => (prev == null ? prev : Math.max(0, prev - 1)));
    }
    if ((globalThis as { __DEV__?: boolean }).__DEV__ === true) {
      console.log('[DIALOG-QUOTA] optimistic:spend', JSON.stringify({ source, applied, token }));
    }
    return {
      rollback: (reason: string) => {
        if (!applied) return;
        if (quotaSpendTokenRef.current !== token) {
          console.warn('[DIALOG-QUOTA] optimistic:rollback skipped (newer send)', JSON.stringify({ source, reason, token }));
          return;
        }
        setDailyQuotaRemaining((prev) => (prev == null ? prev : prev + 1));
        console.warn('[DIALOG-QUOTA] optimistic:rollback', JSON.stringify({ source, reason, token }));
      },
    };
  }, [hasPremiumAccess]);

  // зачем: D139 (владелец 2026-10-01) — докупка «+10 реплик за 300 монет» убрана
  // целиком (кнопка, клиент и серверная aiDialogBuyExtraReplies). Месячная
  // квота D111 остаётся; на стене лимита — только «Разбор» и «Plus».

  /** Явный тап по «Plus» на карточке стены — только отсюда ведём на пейвол. */
  const openDialogPaywall = useCallback(() => {
    hapticTap();
    void trackEvent('paywall_shown', { context: 'dialog_limit', source: 'ai_dialog_daily_limit' });
    router.push({
      pathname: '/premium_modal',
      params: { context: 'dialog_limit', source: 'ai_dialog_daily_limit' },
    } as never);
  }, [router]);

  // зачем: будим Cloud Run при входе в диалог. У premiumDialogSend
  // minInstances: 0 (владелец не платит за тёплый инстанс), поэтому первая
  // отправка ждала бы холодного старта 2–5 сек — а собеседник, который «думает»
  // пять секунд перед первой репликой, ощущается сломанным. Пока пользователь
  // читает приветствие и печатает, инстанс успевает подняться.
  // Греем ТОЛЬКО после подтверждения доступа: у кого диалог закрыт пейволом,
  // тот его не откроет, и прогрев был бы вызовом впустую.
  useEffect(() => {
    if (!accessResolved || !dialogAccess || !dialogueRuntimeOpen) return;
    warmPremiumDialog(studyTarget);
    // зачем: стриминговая функция — отдельный инстанс со своим холодным стартом.
    // Греем обе: стриминг основной путь, callable — фолбэк.
    warmPremiumDialogStream(studyTarget);
    // зачем (2026-09-14, «перевод тоже немедленно»): перевод — третий инстанс;
    // без прогрева первый тап «Показать перевод» ждал холодный старт 2–5 с.
    warmPremiumDialogTranslate(studyTarget);
  }, [accessResolved, dialogAccess, dialogueRuntimeOpen, studyTarget]);

  // Имя собеседника для шапки-мессенджера: достаём из persona, иначе пусто.
  const personaName = useMemo(() => extractPersonaName(promptScenario?.persona), [promptScenario?.persona]);

  // зачем: фулл-редизайн (2026-08-23) — «свет места»: палитра сцены красит шапку,
  // пузыри собеседника и финал, чтобы каждый диалог ощущался своим местом.
  const scene = useMemo(() => sceneThemeFor(scenario), [scenario]);

  // Первая реплика собеседника (приветствие) присутствует СРАЗУ, с первого кадра —
  // через ленивый инициализатор, а не через эффект (раньше эффект мог не сработать
  // при гонке/двойном маунте → «первой реплики нет»). Приветствие УНИКАЛЬНОЕ для
  // каждого сценария (имя персонажа + место + роль), а не одинаковое для всех.
  const [messages, setMessages] = useState<UiMessage[]>(() => [
    { role: 'assistant', text: promptScenario?.greeting ?? '' },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  // Текст реплики, которая ПРЯМО СЕЙЧАС печатается стримом. Пустая строка —
  // стрима нет (показываем обычный индикатор «печатает»).
  // зачем: человек видит слова по мере генерации, а не пустой пузырь 3-6 секунд.
  const [streamingText, setStreamingText] = useState('');
  // зачем (2026-09-14): сервер теперь шлёт дельты ЖИВЬЁМ — до десятков в секунду.
  // setState на каждую = столько же ре-рендеров экрана на 2400 строк и борьба
  // скролла с самим собой. Копим черновик в ref и сбрасываем в state раз в кадр.
  const streamDraftRef = useRef('');
  const streamFlushRef = useRef<number | null>(null);
  const pushStreamDelta = useCallback((chunk: string) => {
    streamDraftRef.current += chunk;
    if (streamFlushRef.current != null) return;
    streamFlushRef.current = requestAnimationFrame(() => {
      streamFlushRef.current = null;
      setStreamingText(streamDraftRef.current);
    });
  }, []);
  // Полная очистка черновика: отменяем отложенный кадр, иначе он воскресил бы
  // уже погашенный пузырь поверх готовой реплики (гонка «done → поздний rAF»).
  // Тот же путь используется по кадру `reset` (сервер отверг черновик).
  const resetStreamDraft = useCallback(() => {
    streamDraftRef.current = '';
    if (streamFlushRef.current != null) {
      cancelAnimationFrame(streamFlushRef.current);
      streamFlushRef.current = null;
    }
    setStreamingText(() => '');
  }, []);
  useEffect(() => () => {
    if (streamFlushRef.current != null) cancelAnimationFrame(streamFlushRef.current);
  }, []);
  // Текст пузыря стрима: маркер [[ключевая фраза]] может прийти половиной —
  // недописанный хвост «[[run» прячем до закрывающих скобок, чтобы не мигал.
  const streamingDisplay = useMemo(
    () => stripMarkers(streamingText.replace(/\[\[[^\]]*$/, '')),
    [streamingText],
  );
  const [ended, setEnded] = useState(false);
  /**
   * Вердикт ждёт, пока человек прочитает финальную реплику собеседника.
   *
   * зачем (владелец 2026-09-17): «говорим последнюю реплику — и мы даже не
   * видим, что ответил собеседник, сразу экран победы». Так и было:
   * setEnded(true) стоял в том же такте, что и приезд реплики, поэтому
   * полноэкранный вердикт накрывал её на том же кадре.
   *
   * Разделяем два разных события, которые раньше были одним:
   *  • `ended` — диалог ОКОНЧЕН. Ставится сразу: блокирует ввод и сохраняет
   *    отметку «Пройдено».
   *  • `verdictReady` — вердикт МОЖНО показать. Встаёт через VERDICT_DELAY_MS
   *    или сразу по тапу (нетерпеливого не держим).
   */
  const [verdictReady, setVerdictReady] = useState(false);
  /**
   * Отсчёт до вердикта. Стартует, когда диалог окончен; тап по экрану его
   * обрывает (прозрачный слой-пропускалка в разметке ниже).
   *
   * Таймер обязан сниматься при размонтировании: человек мог нажать «Назад» в
   * эти три секунды, и setState на мёртвом экране — утечка.
   */
  useEffect(() => {
    if (!ended || verdictReady) return;
    const timer = setTimeout(() => setVerdictReady(true), VERDICT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [ended, verdictReady]);

  // Оценка диалога (владелец 2026-08-25): троттлинг раз в неделю на раздел,
  // гейт решается один раз при завершении диалога.
  const [showDialogFeedback, setShowDialogFeedback] = useState(false);
  useEffect(() => {
    if (!ended) return;
    let cancelled = false;
    void shouldPromptFeedback('dialogue').then((allowed) => {
      if (cancelled || !allowed) return;
      setShowDialogFeedback(true);
      void markFeedbackPrompted('dialogue');
    });
    return () => { cancelled = true; };
  }, [ended]);
  // Ошибка ИИ (сеть/таймаут) показывается НЕ как реплика персонажа, а отдельной
  // системной плашкой с кнопкой «Повторить». Храним текст последней отправки,
  // чтобы повтор переслал именно её.
  const [lastErrorMessage, setLastErrorMessage] = useState('');
  const [lastErrorKind, setLastErrorKind] = useState<PremiumDialogErrorKind | null>(null);
  const lastSentTextRef = useRef('');
  // зачем: стадия последней отправки — для лога [DIALOG-SEND]. Отличает
  // «ответ не доехал» от «ответ доехал, упал разбор» (см. catch в send).
  const sendStageRef = useRef<'idle' | 'stream' | 'reply_received' | 'coach' | 'accept_turn' | 'done'>('idle');
  const scrollRef = useRef<FlatList<UiMessage>>(null);
  const [voiceInputStatus, setVoiceInputStatus] = useState<VoiceInputStatus>('idle');
  const voiceInputBusy = voiceInputStatus === 'requesting'
    || voiceInputStatus === 'listening' || voiceInputStatus === 'finishing';
  const canSend = Boolean(input.trim()) && !sending && !voiceInputBusy;
  const voiceInputStatusRef = useRef<VoiceInputStatus>('idle');
  voiceInputStatusRef.current = voiceInputStatus;
  const voiceInputListenersRef = useRef<Array<{ remove?: () => void }>>([]);
  // audioend may arrive after the recognizer's regular end. Keep this listener
  // separate so the local replay file can still attach to the finished turn.
  const voiceAudioStartSubRef = useRef<{ remove?: () => void } | null>(null);
  const voiceAudioEndSubRef = useRef<{ remove?: () => void } | null>(null);
  const voiceDraftRef = useRef<DialogueVoiceDraft | null>(null);
  const voiceCaptureTranscriptRef = useRef('');
  // audiostart gives a deletion handle; only audioend makes it replayable.
  const voiceCaptureKnownUriRef = useRef<string | null>(null);
  const voiceCaptureUriRef = useRef<string | null>(null);
  const voiceCaptureSessionRef = useRef(0);
  const voiceCaptureTokenRef = useRef(0);
  const voiceRecordingUrisRef = useRef<Set<string>>(new Set());
  const voiceMessageUrisRef = useRef<Set<string>>(new Set());
  const voiceMessagePlayerRef = useRef<AudioPlayer | null>(null);
  const voiceMessagePlaybackSubRef = useRef<{ remove?: () => void } | null>(null);
  const voiceMessageClaimRef = useRef<SpokenAudioClaim | null>(null);
  const voiceMessagePlaybackGenerationRef = useRef(0);
  const [playingVoiceMessageUri, setPlayingVoiceMessageUri] = useState<string | null>(null);
  const voiceInputMountedRef = useRef(true);
  // Invalidates an in-flight permission/model/start sequence when the finger is
  // released.
  const voiceInputGenerationRef = useRef(0);
  const voiceInputSessionRef = useRef(0);
  const holdPressActiveRef = useRef(false);
  // Watchdog против молчащего распознавателя (как в SpeakingPanel): Android-сервис
  // может принять start() и не прислать НИ start, НИ result, НИ error — без
  // таймера кнопка микрофона зависла бы в «Слушаю…» навсегда.
  const recognizerWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceStopSettlementRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearRecognizerWatchdog = useCallback(() => {
    if (recognizerWatchdogRef.current != null) {
      clearTimeout(recognizerWatchdogRef.current);
      recognizerWatchdogRef.current = null;
    }
  }, []);

  // ── Перевод реплик собеседника ────────────────────────────────────────────
  // translations: кэш «индекс реплики → перевод» (повторный флип бесплатен,
  // без ограничения на число реплик за диалог — владелец снял лимит 2026-08-17).
  // flipped: какие реплики сейчас показаны в переводе (а не в оригинале).
  // translatingIdx: индекс реплики, перевод которой грузится прямо сейчас.
  const [translations, setTranslations] = useState<Record<number, string>>({});
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [translatingIdx, setTranslatingIdx] = useState<number | null>(null);
  // Индекс реплики, перевод которой только что упал (сеть/функция). Показываем
  // под ней плашку «не удалось · повторить» — чтобы сбой не выглядел как «ничего».
  const [translateErrorIdx, setTranslateErrorIdx] = useState<number | null>(null);

  // ── «Диалог как игра»: цель · настроение · исход ──────────────────────────
  // Под-цели и темперамент выводим из каталога (или явные поля сценария) —
  // шлём на сервер, он включает игровой режим и возвращает turnState каждый ход.
  const objectives = useMemo<DialogObjective[]>(() => promptScenario?.objectives ?? [], [promptScenario]);
  const temperament = useMemo(() => scenarioTemperament(scenario), [scenario]);
  const gameEnabled = objectives.length > 0;

  // mood — настроение собеседника 0..100 (смайл в шапке). objectivesMet — id
  // выполненных под-целей (галочки). outcome — исход (модал при терминальном).
  // Стартуем от темперамента (аудит L2), чтобы тёплая бариста с первого кадра
  // показывала 😊, а не нейтральное 😐 до первого ответа сервера.
  const [mood, setMood] = useState(() =>
    gameEnabled ? temperamentStartMood(temperament) : DEFAULT_MOOD,
  );
  const [objectivesMet, setObjectivesMet] = useState<Set<string>>(() => new Set());
  // Первая НЕвыполненная цель — её и показывает строка под шапкой. Когда все
  // закрыты, строка исчезает сама (показывать «цель 4 из 3» нечестно).
  const currentGoal = useMemo(
    () => objectives.find((objective) => !objectivesMet.has(objective.id)) ?? null,
    [objectives, objectivesMet],
  );
  const [outcome, setOutcome] = useState<DialogOutcome>('ongoing');
  const [characterReaction, setCharacterReaction] = useState('');
  const [coachTips, setCoachTips] = useState<string[]>([]);

  // ── Финальный «разбор полётов»: похвала + мягкие исправления фраз ученика ──
  // Запрашивается ОДИН раз при завершении диалога (терминальный исход или ручное
  // «Завершить»). Сбой не критичен: секция просто не показывается.
  const [review, setReview] = useState<PremiumDialogReviewResponse | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const reviewRequestedRef = useRef(false);

  // Флаг «переписка показана под вердиктом» (кнопка «Показать переписку» / пилюля «Итоги»).
  const [verdictHidden, setVerdictHidden] = useState(false);
  /**
   * ⛔ ПОЧЕМУ ЛАМПОЧКА «НЕ РАБОТАЛА» — она НЕ СУЩЕСТВОВАЛА (владелец 2026-09-17,
   * повторял трижды: «кнопка подсказка лампочка не работает»).
   *
   * Здесь лежали ДВА состояния — `hintOpen` и `hintVisible`. Оба ставились, оба
   * читались в комментариях, но НИ ОДНО не было отрисовано: grep по файлу давал
   * только сами объявления. То есть кнопки-лампочки в коде не было вовсе, и
   * чинить в прошлые разы было нечего — я дважды искал причину не там.
   * Класс бага «механизм есть, а данных не дали», только здесь наоборот:
   * состояние есть, а кнопки нет.
   *
   * Теперь лампочка настоящая: живёт в строке целей (шапка), открывает шторку
   * с подсказкой и ПОКАЗЫВАЕТ её, а не вставляет в поле ввода. Русская
   * инструкция автора (`nextStepHintRu`) в поле ввода попасть не может.
   */
  const [hintOpen, setHintOpen] = useState(false);
  // Шторка со ВСЕМИ заданиями диалога (владелец 2026-09-17). Открывается тапом
  // по строке целей в шапке; данные локальные, сети не трогает.
  const [goalsOpen, setGoalsOpen] = useState(false);
  const stuckTurnsRef = useRef(0);

  // ── Тренер: «почему так», перевод, готовые ответы, поправка ───────────────
  // зачем (владелец 2026-09-14): всё это приезжает ВМЕСТЕ с репликой одним
  // вызовом (поле coach), поэтому шторка открывается мгновенно и без спиннера.
  // Ключ — индекс реплики собеседника в messages.
  const [coachByIndex, setCoachByIndex] = useState<Record<number, DialogCoachTurn>>({});
  // Индекс реплики, для которой открыта шторка «Почему так» (null — закрыта).
  const [whySheetIndex, setWhySheetIndex] = useState<number | null>(null);

  /**
   * Экономика готовых ответов (владелец 2026-09-17, экран 4 макета рун):
   * 3 в день бесплатно, дальше 80 рун за показ.
   *
   * зачем набор индексов, а не флаг: раскрытие привязано к КОНКРЕТНОЙ реплике.
   * Иначе, оплатив ответы один раз, человек получил бы их бесплатно на всех
   * последующих репликах — или, наоборот, платил бы повторно за уже открытую.
   *
   * Перевод и «почему так» бесплатны всегда — платные ТОЛЬКО готовые ответы.
   */
  const [hintRevealedFor, setHintRevealedFor] = useState<ReadonlySet<number>>(() => new Set());
  // зачем у ЛАМПОЧКИ нет ни слота, ни состояния оплаты (владелец 2026-09-18):
  // она бесплатна. Экономика (3 в день, дальше руны) принадлежит «Почему так»,
  // и живёт ниже — в hintsLeftToday / buyHint по индексу реплики.
  const [hintsLeftToday, setHintsLeftToday] = useState(FREE_DIALOG_HINTS_PER_DAY);
  const [hintRuneBalance, setHintRuneBalance] = useState(0);
  // Причина отказа покупки «Почему так» — показывается в шторке. null = отказа
  // не было. Молчаливый отказ человек читает как поломку приложения.
  const [hintDenied, setHintDenied] = useState<'no_runes' | 'error' | null>(null);
  const hintBuyingRef = useRef(false);

  // Остаток бесплатных и баланс читаем при входе в сессию: оба локальные,
  // 0 чтений Firestore.
  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      getDialogHintsLeftToday(studyTarget),
      readUnifiedLevelSpinStars(captureAccountGeneration()),
    ]).then(([left, stars]) => {
      if (cancelled) return;
      setHintsLeftToday(left);
      setHintRuneBalance(stars.balance);
    }).catch((error: unknown) => {
      // Немой catch запрещён: тихий сбой показал бы «подсказки кончились»
      // человеку, у которого они есть.
      DebugLogger.error(
        'ai_dialog_session:hint_economy_read',
        error instanceof Error ? error : new Error(String(error)),
        'warning',
      );
    });
    return () => { cancelled = true; };
  }, [studyTarget]);

  /**
   * Открыть готовые ответы для реплики: сначала бесплатной подсказкой, потом
   * за руны. Решает ТЕЛЕФОН и мгновенно — текст уже загружен, сети тут нет.
   * Двойной тап защищён ref: состояние во втором тапе того же кадра ещё старое.
   */
  const buyHint = useCallback((index: number) => {
    if (hintBuyingRef.current || hintRevealedFor.has(index)) return;
    hintBuyingRef.current = true;
    const reveal = () => {
      setHintRevealedFor((prev) => new Set([...prev, index]));
      hintBuyingRef.current = false;
    };
    if (hintsLeftToday > 0) {
      // Бесплатная: списываем из дневного остатка, руны не трогаем.
      setHintsLeftToday((prev) => Math.max(0, prev - 1));
      void markDialogHintUsed(studyTarget);
      console.log(`[HINT-BUY] free index=${index} left=${hintsLeftToday - 1}`); // guard-ok: ветка решения обязана логироваться и в релизе
      reveal();
      return;
    }
    void buyDialogHintLocally(studyTarget, captureAccountGeneration()).then((result) => {
      if (!result.ok) {
        hintBuyingRef.current = false;
        // зачем видимая причина (владелец 2026-09-17 про покупку диалога:
        // «нажимаю, но ничего не списывается, только звук»): молчаливый отказ
        // читается как поломка. Показываем причину прямо в модалке.
        setHintDenied(result.reason === 'insufficient_runes' ? 'no_runes' : 'error');
        console.log(`[HINT-BUY] denied index=${index} reason=${result.reason}`); // guard-ok: отказ обязан логироваться и в релизе
        return;
      }
      setHintDenied(null);
      setHintRuneBalance(result.balance);
      void trackEvent('ai_dialog_hint_purchased', { scenarioId: scenario.id, priceRunes: DIALOG_HINT_PRICE_RUNES });
      reveal();
    }).catch((error: unknown) => {
      hintBuyingRef.current = false;
      DebugLogger.error(
        'ai_dialog_session:hint_buy',
        error instanceof Error ? error : new Error(String(error)),
        'warning',
      );
    });
  }, [hintsLeftToday, hintRevealedFor, scenario.id, studyTarget]);
  // Мягкая поправка реплики ученика: ключ — индекс ЕГО реплики в messages.
  const [fixByIndex, setFixByIndex] = useState<Record<number, { corrected: string; note: string }>>({});
  // Какие поправки человек РАСКРЫЛ (владелец 2026-09-17: сначала кнопка «лучше
  // так», текст — по нажатию). Ключ тот же, что у fixByIndex: индекс СВОЕЙ
  // реплики. Бесплатно всегда — это разбор своей ошибки, а не подсказка.
  const [fixShownFor, setFixShownFor] = useState<ReadonlySet<number>>(() => new Set());
  // Сколько подряд реплик ученика были «ни о чём»: три включают помощника.
  const weakRepliesRef = useRef(0);
  const [helperVisible, setHelperVisible] = useState(false);
  // Тренер последней реплики собеседника: его готовые ответы показывает
  // помощник над полем ввода. Пустой объект, если сервер полей не прислал.
  const lastCoach = useMemo<DialogCoachTurn>(() => {
    const indices = Object.keys(coachByIndex).map(Number);
    if (indices.length === 0) return EMPTY_COACH;
    const latest = Math.max(...indices);
    return coachByIndex[latest] ?? EMPTY_COACH;
  }, [coachByIndex]);

  // Открыть/скрыть перевод реплики i. Первый показ новой реплики тратит лимит и
  // зовёт сервер; дальше флип идёт из кэша мгновенно. Безлимитно — владелец
  // снял ограничение на число переводов за диалог (2026-08-17).
  const toggleTranslation = useCallback(
    async (i: number, rawText: string) => {
      hapticTap();
      if (flipped[i] === true) {
        setFlipped((prev) => ({ ...prev, [i]: false }));
        return;
      }
      if (translations[i] != null) {
        // Мгновенный путь: перевод уже в кэше экрана (предзагрузка или повтор).
        setFlipped((prev) => ({ ...prev, [i]: true }));
        DebugLogger.info('[DIALOG-LAT] translate tap', JSON.stringify({ idx: i, ms: 0, prefetched: true }));
        return;
      }
      if (translatingIdx != null) return;
      if (!accessResolved) return;

      const clean = stripMarkers(rawText);
      if (!clean) return;

      setTranslatingIdx(i);
      setTranslateErrorIdx(null);
      void trackEvent('ai_dialog_translate_requested', { scenarioId: scenario.id });
      const tappedAtMs = Date.now();
      try {
        // Если предзагрузка этой реплики ещё в пути — вызов вернёт тот же
        // in-flight промис (дедуп по ключу запроса), второго похода в сеть нет.
        const res = await callPremiumDialogTranslate({
          text: clean,
          targetLang: lang,
          scenarioId: scenario.id,
          studyTarget,
        });
        const translation = String(res.translation ?? '').trim();
        if (!translation) throw new Error('empty_translation');
        setTranslations((prev) => ({ ...prev, [i]: translation }));
        setFlipped((prev) => ({ ...prev, [i]: true }));
        DebugLogger.info('[DIALOG-LAT] translate tap', JSON.stringify({
          idx: i,
          ms: Date.now() - tappedAtMs,
          cached: res.cached === true,
          prefetched: false,
        }));
        void trackEvent('ai_dialog_translate_shown', {
          scenarioId: scenario.id,
          cached: res.cached === true,
        });
      } catch (error) {
        // Видимая обратная связь вместо «загрузка → ничего»: помечаем реплику
        // как «перевод не удался», под ней покажется плашка с кнопкой «Повторить».
        setTranslateErrorIdx(i);
        void trackEvent('ai_dialog_translate_error', { scenarioId: scenario.id });
      } finally {
        setTranslatingIdx(null);
      }
    },
    [accessResolved, flipped, translations, translatingIdx, lang, scenario.id, studyTarget],
  );

  // Предзагрузка перевода последней реплики собеседника.
  // зачем (владелец 2026-09-14: «перевод тоже немедленно»): тап «Показать
  // перевод» ждал сервер + модель 1–3 с. Теперь, как только реплика пришла и
  // отправка завершилась, перевод тихо подтягивается в кэш экрана — тап открывает
  // его мгновенно из `translations`. Best-effort: сбой ничего не показывает, а
  // тап в этот момент переиспользует тот же in-flight вызов (дедуп в клиенте).
  const prefetchedTranslationIdxRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!DIALOG_TRANSLATE_PREFETCH_ENABLED) return;
    if (!accessResolved || ended || sending) return;
    const i = messages.length - 1;
    const last = messages[i];
    if (!last || last.role !== 'assistant') return;
    if (translations[i] != null || prefetchedTranslationIdxRef.current.has(i)) return;
    const clean = stripMarkers(last.text);
    if (!clean) return;
    prefetchedTranslationIdxRef.current.add(i);
    const startedAtMs = Date.now();
    callPremiumDialogTranslate({ text: clean, targetLang: lang, scenarioId: scenario.id, studyTarget })
      .then((res) => {
        const translation = String(res.translation ?? '').trim();
        if (!translation) {
          DebugLogger.warn('ai_dialog:translate_prefetch', `empty translation for idx=${i}`);
          return;
        }
        // Поздний ответ не затирает уже показанный перевод (last-write-guard).
        setTranslations((prev) => (prev[i] != null ? prev : { ...prev, [i]: translation }));
        DebugLogger.info('[DIALOG-LAT] translate prefetch', JSON.stringify({
          idx: i,
          ms: Date.now() - startedAtMs,
          cached: res.cached === true,
        }));
      })
      .catch((e) => {
        // Разрешаем повторную предзагрузку при следующем срабатывании и не молчим.
        prefetchedTranslationIdxRef.current.delete(i);
        DebugLogger.warn(
          'ai_dialog:translate_prefetch',
          `idx=${i} failed after ${Date.now() - startedAtMs}ms: ${e instanceof Error ? e.message : String(e)}`,
        );
      });
  }, [messages, translations, accessResolved, ended, sending, lang, scenario.id, studyTarget]);

  const userExchanges = messages.filter((m) => m.role === 'user').length;

  const cleanupVoiceInputListeners = useCallback(() => {
    voiceInputListenersRef.current.forEach((sub) => sub?.remove?.());
    voiceInputListenersRef.current = [];
  }, []);
  const cleanupVoiceAudioEndListener = useCallback(() => {
    voiceAudioStartSubRef.current?.remove?.();
    voiceAudioStartSubRef.current = null;
    voiceAudioEndSubRef.current?.remove?.();
    voiceAudioEndSubRef.current = null;
  }, []);
  const clearPendingDialogueVoiceRecordings = useCallback(() => {
    voiceRecordingUrisRef.current.forEach((uri) => {
      if (voiceMessageUrisRef.current.has(uri)) return;
      deleteDialogueVoiceRecording(uri);
      voiceRecordingUrisRef.current.delete(uri);
    });
    voiceDraftRef.current = null;
    voiceCaptureKnownUriRef.current = null;
    voiceCaptureUriRef.current = null;
    voiceCaptureTranscriptRef.current = '';
  }, []);
  const stopVoiceMessagePlayback = useCallback(() => {
    voiceMessagePlaybackGenerationRef.current += 1;
    voiceMessagePlaybackSubRef.current?.remove?.();
    voiceMessagePlaybackSubRef.current = null;
    voiceMessageClaimRef.current?.release();
    voiceMessageClaimRef.current = null;
    const player = voiceMessagePlayerRef.current;
    voiceMessagePlayerRef.current = null;
    try { player?.pause(); } catch (swallowedError) { noteSwallowed('ai_dialog_session:useCallback.catch', swallowedError); /* native player was already released */ }
    try { player?.release(); } catch (swallowedError) { noteSwallowed('ai_dialog_session:useCallback.catch_2', swallowedError); /* native player was already released */ }
    if (voiceInputMountedRef.current) setPlayingVoiceMessageUri(null);
  }, []);
  const playVoiceMessage = useCallback((uri: string) => {
    stopVoiceMessagePlayback();
    const playbackGeneration = voiceMessagePlaybackGenerationRef.current;
    let claim: SpokenAudioClaim | null = null;
    claim = claimSpokenAudio(() => {
      if (voiceMessageClaimRef.current === claim) stopVoiceMessagePlayback();
    }, 'ai-dialog:voice-message-replay');
    if (!claim) return;
    voiceMessageClaimRef.current = claim;
    void whenSpokenAudioReady(claim).then((audioReady) => {
      if (
        !audioReady
        || !claim?.isCurrent()
        || !voiceInputMountedRef.current
        || !runtimeActiveRef.current
        || playbackGeneration !== voiceMessagePlaybackGenerationRef.current
      ) {
        claim?.release();
        if (voiceMessageClaimRef.current === claim) voiceMessageClaimRef.current = null;
        return;
      }
      let player: AudioPlayer;
      try {
        player = createAudioPlayer(uri);
      } catch {
        stopVoiceMessagePlayback();
        return;
      }
      if (!claim.isCurrent() || playbackGeneration !== voiceMessagePlaybackGenerationRef.current) {
        try { player.release(); } catch (swallowedError) { noteSwallowed('ai_dialog_session:useCallback.catch_3', swallowedError); /* already released */ }
        return;
      }
      voiceMessagePlayerRef.current = player;
      voiceMessagePlaybackSubRef.current = player.addListener('playbackStatusUpdate', (status) => {
        if (
          voiceMessagePlayerRef.current !== player
          || playbackGeneration !== voiceMessagePlaybackGenerationRef.current
        ) return;
        if (status.didJustFinish) stopVoiceMessagePlayback();
      });
      try {
        player.volume = 1;
        player.play();
        setPlayingVoiceMessageUri(uri);
      } catch {
        stopVoiceMessagePlayback();
      }
    });
  }, [stopVoiceMessagePlayback]);
  const settleVoiceInput = useCallback(() => {
    if (voiceStopSettlementRef.current != null) clearTimeout(voiceStopSettlementRef.current);
    voiceStopSettlementRef.current = null;
    clearRecognizerWatchdog();
    // Late end/error/result callbacks cannot overwrite an editable draft.
    voiceInputSessionRef.current += 1;
    cleanupVoiceInputListeners();
    restoreLoudPlaybackMode();
    if (voiceInputMountedRef.current) setVoiceInputStatus('idle');
  }, [cleanupVoiceInputListeners, clearRecognizerWatchdog, restoreLoudPlaybackMode]);

  const startVoiceInputRef = useRef<(() => Promise<void>) | null>(null);
  const startVoiceInput = useCallback(async () => {
    if (speechNa) {
      DebugLogger.warn('[DIALOG-VOICE]', 'start: early return — speech unavailable on device ([SPEECH-AVAIL])');
      console.warn('[SPEECH-AVAIL] ai_dialog: mic tap on device without recognizer — no attempt, no paywall');
      setVoiceInputStatus('unavailable');
      return;
    }
    if (!runtimeActiveRef.current) return;
    if (sending || ended || voiceInputStatus === 'requesting') return;
    if (!accessResolved) return;
    const generation = ++voiceInputGenerationRef.current;
    const session = ++voiceInputSessionRef.current;
    // Invalidate an older hold before any permission/inventory await. Its late
    // audio callback can now only delete its own cache file, never feed this hold.
    const captureToken = ++voiceCaptureTokenRef.current;
    cleanupVoiceAudioEndListener();
    clearPendingDialogueVoiceRecordings();
    const isCurrentSession = () =>
      voiceInputMountedRef.current && runtimeActiveRef.current && session === voiceInputSessionRef.current;
    hapticTap();
    // Глушим играющий ответ-TTS перед стартом микрофона: иначе он течёт в
    // распознаватель и портит транскрипт (образец: SpeakingPanel stopListening).
    stopSpeaking();
    // зачем (2026-09-13): голосовой ввод — голосовая попытка дневной квоты, а не
    // отдельный Plus-замок; Plus и «Фри» проходят без чека.
    // Eligibility is not a billable speech attempt. Commit only after native
    // recognizer emits `start`; capability/permission failures stay neutral.
    // зачем: владелец 21.09 — «недоступен на этом устройстве» при рабочем
    // микрофоне в других разделах и непотраченных 3 бесплатных попытках.
    // Четыре разные причины схлопывались в одно слово; логируем вход и КАЖДУЮ.
    DebugLogger.info('[DIALOG-VOICE]', `start: enter ${JSON.stringify({
      scenario: scenario.id,
      dialogueTarget,
      platform: Platform.OS,
      androidApiLevel: Platform.OS === 'android' ? Number(Platform.Version) : null,
      hasSpeechModule: !!speechModule,
      accessResolved,
    })}`);
    if (!voiceInputGate.canStartAttempt(() => { void startVoiceInputRef.current?.(); })) { // R43: ожидание доступа → после подтверждения Plus запись стартует сама
      DebugLogger.warn('[DIALOG-VOICE]', 'start: early return — gate.canStartAttempt()=false (дневная квота/замок)');
      return;
    }
    if (!speechModule) {
      DebugLogger.warn('[DIALOG-VOICE]', 'unavailable: reason=module_missing');
      setVoiceInputStatus('unavailable');
      return;
    }
    if (!isSpeechRecognitionAvailable(speechModule)) {
      DebugLogger.warn('[DIALOG-VOICE]', 'unavailable: reason=recognition_not_available');
      setVoiceInputStatus('unavailable');
      return;
    }

    const asrPlatform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
    const inventory = await readSpeechRecognitionLocaleInventory(speechModule, asrPlatform);
    const asrCapability = dialogueTarget
      ? resolveDialogueAsrCapability({
          target: dialogueTarget,
          platform: asrPlatform,
          androidApiLevel: Platform.OS === 'android' ? Number(Platform.Version) : undefined,
          locales: inventory?.locales,
          inventoryServiceId: inventory?.serviceId,
          startServiceId: inventory?.serviceId,
        })
      : null;
    if (!isCurrentSession() || generation !== voiceInputGenerationRef.current) {
      DebugLogger.warn('[DIALOG-VOICE]', 'start: early return — сессия/поколение устарели после инвентаря');
      return;
    }
    if (!asrCapability?.available) {
      // Четыре причины (inventory_unverified / android_api_unsupported /
      // exact_locale_missing / service_mismatch) показывались одним текстом —
      // печатаем какая, и на чём именно не сошлось.
      DebugLogger.warn('[DIALOG-VOICE]', `unavailable: reason=asr_capability ${JSON.stringify({
        capabilityReason: asrCapability?.reason ?? (dialogueTarget ? 'null_capability' : 'no_dialogue_target'),
        wantLocale: asrCapability?.locale ?? null,
        dialogueTarget,
        inventoryServiceId: inventory?.serviceId ?? null,
        inventoryLocaleCount: inventory?.locales?.length ?? 0,
        inventoryHasWanted: asrCapability?.locale
          ? (inventory?.locales ?? []).includes(asrCapability.locale)
          : null,
        inventorySample: (inventory?.locales ?? []).slice(0, 40),
        androidApiLevel: Platform.OS === 'android' ? Number(Platform.Version) : null,
      })}`);
      setVoiceInputStatus('unavailable');
      return;
    }
    DebugLogger.info('[DIALOG-VOICE]', `start: capability ok, locale=${asrCapability.locale}`);

    setVoiceInputStatus('requesting');
    const permission = await requestSpeechPermissionForHold(speechModule);
    if (!isCurrentSession() || generation !== voiceInputGenerationRef.current) return;
    if (permission === 'denied') {
      setVoiceInputStatus('denied');
      return;
    }
    if (permission === 'granted_after_prompt') {
      holdPressActiveRef.current = false;
      setVoiceInputStatus('idle');
      return;
    }

    cleanupVoiceInputListeners();
    voiceCaptureSessionRef.current = session;
    const acc = new TranscriptAccumulator();
    let latest = '';
    const applyTranscript = (value: string) => {
      if (!isCurrentSession()) return;
      const next = value.trim();
      if (!next) return;
      latest = next;
      voiceCaptureTranscriptRef.current = next;
      if (!voiceInputMountedRef.current) return;
      setInput(next);
      if (lastErrorMessage) {
        setLastErrorMessage('');
        setLastErrorKind(null);
      }
    };

    // cue играем по ПЕРВОМУ признаку, что движок реально слушает (а не сразу
    // после start() — прогрев ~100-300мс терял начало речи). На редких OEM 'start'
    // не эмитится и сразу приходит result — поэтому один раз по любому из них.
    // зачем (Ревизор/координатор 15.10): одно удержание = одна попытка голоса у Free. Списание шло на КАЖДОЕ событие 'start'
    // движка — повторный 'start' в той же сессии захвата списывал вторую. Плюс OEM без 'start' (сразу result) не списывали вовсе.
    let engineStartEvents = 0;
    let attemptCommitted = false;
    const commitAttemptOnce = (via: 'start' | 'result') => {
      if (via === 'start') engineStartEvents += 1;
      console.warn(`[VOICE-LIMIT] ai_dialog engine_${via} ${JSON.stringify({ session, engineStartEvents, alreadyCommitted: attemptCommitted })}`); // guard-ok: трасса списания на удержание
      if (attemptCommitted) return;
      attemptCommitted = true;
      voiceInputGate.commitStartedAttempt();
    };
    let cuePlayed = false;
    const playCueOnce = () => {
      if (!isCurrentSession()) return;
      if (cuePlayed) return;
      cuePlayed = true;
      playRecordStart();
    };
    // Любой признак жизни движка снимает watchdog: на редких OEM 'start' не
    // эмитится, а сразу приходит result — снимаем и там, и там.
    const startSub = speechModule.addListener('start', () => {
      if (!isCurrentSession()) return;
      clearRecognizerWatchdog();
      if (!holdPressActiveRef.current) {
        try {
          speechModule.stop();
        } catch (e) {
      // no-op
      DebugLogger.error('ai_dialog_session:startSub', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
        return;
      }
      setVoiceInputStatus('listening');
      commitAttemptOnce('start');
      playCueOnce();
    });
    const resultSub = speechModule.addListener('result', (event: any) => {
      if (!isCurrentSession()) return;
      clearRecognizerWatchdog();
      if (holdPressActiveRef.current) {
        setVoiceInputStatus('listening');
        commitAttemptOnce('result');
        playCueOnce();
      }
      const alternatives: Array<{ transcript?: string }> = Array.isArray(event?.results)
        ? event.results
        : [];
      const top = String(alternatives[0]?.transcript ?? '').trim();
      if (top) {
        acc.add(top, event?.isFinal === true);
        applyTranscript(acc.union() || top);
        return;
      }
      for (const alt of alternatives) {
        const candidate = String(alt?.transcript ?? '').trim();
        if (candidate) {
          applyTranscript(candidate);
          return;
        }
      }
    });
    const endSub = speechModule.addListener('end', () => {
      if (!isCurrentSession()) return;
      if (voiceCaptureSessionRef.current === session && voiceCaptureUriRef.current && latest) {
        voiceDraftRef.current = { uri: voiceCaptureUriRef.current, transcript: latest };
      }
      settleVoiceInput();
      // Текст остаётся в поле: он нужен модели, а при неизменённом черновике
      // отправка покажет именно аудиопузырь с этой локальной записью.
    });
    const errorSub = speechModule.addListener('error', () => {
      if (!isCurrentSession()) return;
      settleVoiceInput();
      // Есть текст — молча оставляем его; иначе транзиентный сбой → 'error' с «Повторить».
      if (voiceInputMountedRef.current) setVoiceInputStatus(latest ? 'idle' : 'error');
    });
    const noMatchSub = speechModule.addListener('nomatch', () => {
      if (!isCurrentSession()) return;
      settleVoiceInput();
    });
    voiceAudioStartSubRef.current = speechModule.addListener('audiostart', (event: { uri?: unknown }) => {
      const uri = typeof event?.uri === 'string' && event.uri.length > 0 ? event.uri : null;
      if (!uri) return;
      voiceRecordingUrisRef.current.add(uri);
      if (
        !voiceInputMountedRef.current
        || !runtimeActiveRef.current
        || voiceCaptureSessionRef.current !== session
        || voiceCaptureTokenRef.current !== captureToken
      ) {
        deleteDialogueVoiceRecording(uri);
        voiceRecordingUrisRef.current.delete(uri);
        return;
      }
      // The file exists now but must not be replayed until audioend completes.
      voiceCaptureKnownUriRef.current = uri;
    }) ?? null;
    voiceAudioEndSubRef.current = speechModule.addListener('audioend', (event: { uri?: unknown }) => {
      // audioend is legitimately later than end, but never belongs to a later
      // microphone hold or a backgrounded screen.
      const uri = typeof event?.uri === 'string' && event.uri.length > 0 ? event.uri : null;
      if (!uri) return;
      voiceRecordingUrisRef.current.add(uri);
      if (
        !voiceInputMountedRef.current
        || !runtimeActiveRef.current
        || voiceCaptureSessionRef.current !== session
        || voiceCaptureTokenRef.current !== captureToken
      ) {
        deleteDialogueVoiceRecording(uri);
        voiceRecordingUrisRef.current.delete(uri);
        return;
      }
      voiceCaptureKnownUriRef.current = uri;
      voiceCaptureUriRef.current = uri;
      const transcript = voiceCaptureTranscriptRef.current;
      if (transcript) voiceDraftRef.current = { uri, transcript };
    }) ?? null;
    voiceInputListenersRef.current = [startSub, resultSub, endSub, errorSub, noMatchSub].filter(
      Boolean,
    ) as Array<{ remove?: () => void }>;

    let onDevice = false;
    try {
      // There is no target-specific iOS on-device proof for non-English yet.
      // Do not force the engine into an unverified route.
      onDevice = dialogueTarget === 'en' && (await speechModule.supportsOnDeviceRecognition?.()) === true;
    } catch {
      onDevice = false;
    }
    if (!isCurrentSession() || generation !== voiceInputGenerationRef.current) return;

    try {
      if (!await recordingAudio.begin()) return;
      if (!isCurrentSession() || generation !== voiceInputGenerationRef.current) return;
      if (!holdPressActiveRef.current) {
        cleanupVoiceInputListeners();
        cleanupVoiceAudioEndListener();
        restoreLoudPlaybackMode();
        setVoiceInputStatus('idle');
        return;
      }
      if (!dialogueSpeechLocale) {
        cleanupVoiceInputListeners();
        cleanupVoiceAudioEndListener();
        restoreLoudPlaybackMode();
        setVoiceInputStatus('stalled');
        return;
      }
      // Watchdog: если за 7с движок не подал признаков жизни — гасим попытку и
      // показываем «Не удалось запустить микрофон» с повтором по тапу на микрофон.
      clearRecognizerWatchdog();
      recognizerWatchdogRef.current = setTimeout(() => {
        recognizerWatchdogRef.current = null;
        if (!isCurrentSession()) return;
        try {
          speechModule.abort();
        } catch (e) {
      // сервис мог умереть — не мешаем
      DebugLogger.error('ai_dialog_session:onDevice', e instanceof Error ? e : new Error(String(e)), 'warning');
        }
        cleanupVoiceInputListeners();
        cleanupVoiceAudioEndListener();
        if (voiceInputMountedRef.current) {
          setVoiceInputStatus('stalled');
          hapticError();
        }
        restoreLoudPlaybackMode();
      }, 7000);
      speechModule.start(
        buildSpeakingStartOptions({
          lang: dialogueSpeechLocale,
          targetText: input.trim() || promptScenario?.goal || '',
          interimResults: true,
          volumeMeter: false,
          onDevice,
          // Голосовая реплика остаётся воспроизводимым сообщением в этой
          // переписке; расшифровка используется только для ответа собеседника.
          persistRecording: true,
          // Зажми-и-говори: держим движок открытым, пока зажата кнопка
          // (иначе Android-endpointer рвёт речь на паузе).
          holdToTalk: true,
          serviceId: inventory!.serviceId,
          // Свободная реплика диалога, не заранее известная фраза — targetText
          // тут только для biasing (заголовок сценария), НЕ для iOS task hint.
          freeSpeech: true,
        }),
      );
      // cue теперь в playCueOnce (слушатели 'start'/'result').
    } catch {
      clearRecognizerWatchdog();
      cleanupVoiceInputListeners();
      cleanupVoiceAudioEndListener();
      restoreLoudPlaybackMode();
      // start() кинул — почти всегда транзиентно (сервис занят/умер); даём «Повторить».
      if (isCurrentSession()) setVoiceInputStatus('error');
    }
  }, [
    speechNa,
    accessResolved,
    cleanupVoiceAudioEndListener,
    cleanupVoiceInputListeners,
    clearPendingDialogueVoiceRecordings,
    clearRecognizerWatchdog,
    ended,
    dialogueSpeechLocale,
    input,
    lastErrorMessage,
    voiceInputGate,
    playRecordStart,
    recordingAudio,
    restoreLoudPlaybackMode,
    promptScenario,
    dialogueTarget,
    settleVoiceInput,
    sending,
    speechModule,
    stopSpeaking,
    voiceInputStatus,
  ]);
  startVoiceInputRef.current = startVoiceInput;

  useEffect(() => {
    voiceInputMountedRef.current = true;
    return () => {
      voiceInputMountedRef.current = false;
      voiceInputGenerationRef.current += 1;
      voiceInputSessionRef.current += 1;
      voiceCaptureTokenRef.current += 1;
      holdPressActiveRef.current = false;
      clearRecognizerWatchdog();
      if (voiceStopSettlementRef.current != null) clearTimeout(voiceStopSettlementRef.current);
      voiceStopSettlementRef.current = null;
      cleanupVoiceInputListeners();
      cleanupVoiceAudioEndListener();
      stopVoiceMessagePlayback();
      clearPendingDialogueVoiceRecordings();
      try {
        speechModule?.abort();
      } catch (e) {
      // no-op
      DebugLogger.error('ai_dialog_session:onDevice', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
      restoreLoudPlaybackMode();
    };
  }, [cleanupVoiceAudioEndListener, cleanupVoiceInputListeners, clearPendingDialogueVoiceRecordings, clearRecognizerWatchdog, restoreLoudPlaybackMode, speechModule, stopVoiceMessagePlayback]);

  // зачем: сворачивание приложения НЕ размонтирует экран, поэтому cleanup выше не срабатывает
  // и распознавание продолжало держать микрофон открытым в фоне — большой расход батареи.
  // Обрываем жёстко (abort) и возвращаем режим воспроизведения. Возобновление —
  // только по явному действию пользователя.
  // Speech capture lifecycle invariant: blur/background invalidates pending starts,
  // aborts live capture, and never auto-resumes on return.
  useEffect(() => {
    if (runtimeActive) return;
    voiceInputGenerationRef.current += 1;
    voiceInputSessionRef.current += 1;
    voiceCaptureTokenRef.current += 1;
    holdPressActiveRef.current = false;
    clearRecognizerWatchdog();
    if (voiceStopSettlementRef.current != null) clearTimeout(voiceStopSettlementRef.current);
    voiceStopSettlementRef.current = null;
    cleanupVoiceInputListeners();
    cleanupVoiceAudioEndListener();
    stopVoiceMessagePlayback();
    clearPendingDialogueVoiceRecordings();
    try {
      speechModule?.abort();
    } catch (e) {
      // no-op
      DebugLogger.error('ai_dialog_session:onDevice', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    try {
      stopSpeaking();
    } catch (e) {
      // no-op
      DebugLogger.error('ai_dialog_session:onDevice', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    restoreLoudPlaybackMode();
    if (voiceInputMountedRef.current) setVoiceInputStatus('idle');
  }, [runtimeActive, speechModule, clearRecognizerWatchdog, cleanupVoiceAudioEndListener, cleanupVoiceInputListeners, clearPendingDialogueVoiceRecordings, restoreLoudPlaybackMode, stopSpeaking, stopVoiceMessagePlayback]);

  const enterAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    enterAnim.setValue(0);
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [messages.length, enterAnim]);

  const buildHistory = useCallback((): DialogChatTurn[] => {
    return messages.map((m) => ({ role: m.role, content: m.text }));
  }, [messages]);

  // Применяет turnState из ответа сервера: настроение, выполненные цели, исход.
  // При терминальном исходе сохраняем реакцию персонажа + советы и завершаем
  // диалог (модал-вердикт). Битый/пустой turnState → нейтральный, диалог идёт.
  const applyTurnState = useCallback(
    (raw: unknown) => {
      if (!gameEnabled) return;
      const ts = parseTurnState(raw);
      setMood(ts.mood);
      if (ts.objectivesMet.length > 0) {
        setObjectivesMet((prev) => {
          const next = new Set(prev);
          ts.objectivesMet.forEach((id) => next.add(id));
          // Прогресс есть, если этот ход добавил хотя бы одну НОВУЮ цель —
          // не по факту непустого списка (он накопительный от сервера и был бы
          // непустым в любом последующем ходе, даже без нового прогресса).
          if (next.size > prev.size) stuckTurnsRef.current = 0;
          else stuckTurnsRef.current += 1;
          return next;
        });
      } else {
        stuckTurnsRef.current += 1;
      }
      // зачем: владелец просил показывать подсказку только после 3 ходов подряд
      // без прогресса — не сразу и не по первой же неудаче. Once shown, стоит
      // зачем счётчик остался: по нему сервер понимает, что человек буксует
      // (noProgressTurns уходит в gameState и меняет поведение персонажа).
      // Показом лампочки он больше не управляет — она доступна всегда.
      if (isTerminalOutcome(ts.outcome)) {
        setOutcome(ts.outcome);
        setCharacterReaction(ts.characterReaction);
        setCoachTips(ts.coachTips);
        setEnded(true);
        void trackEvent('ai_dialog_outcome', { scenarioId: scenario.id, outcome: ts.outcome });
        // «Пройдено» ставим ТОЛЬКО при успехе (аудит H2): провал по терпению или
        // заглохший диалог не помечаем — иначе юзер не вернётся переиграть, а в
        // списке провал выглядел бы как «Пройдено».
        if (ts.outcome === 'success') {
          void markDialogCompleted(studyTarget, scenario.id);
        }
      }
    },
    [gameEnabled, scenario.id, studyTarget],
  );

  // Игровые поля строим непосредственно перед отправкой: так сервер получает
  // актуальное настроение и накопленные цели, а не заново начинает сценарий.
  const buildGameRequestFields = useCallback(
    (exchangeIndex: number) =>
      gameEnabled
        ? {
            objectives: objectives.map((o) => ({ id: o.id, en: o.en || o.id })),
            temperament,
            gameState: {
              exchangeIndex,
              mood,
              objectivesMet: Array.from(objectivesMet),
              noProgressTurns: stuckTurnsRef.current,
            },
          }
        : {},
    [gameEnabled, objectives, temperament, mood, objectivesMet],
  );

  /**
   * Раскладывает поля тренера по репликам после успешного хода.
   *
   * зачем: сервер отдаёт их одним объектом на ход, а UI нужен адресный доступ —
   * объяснение привязано к реплике собеседника (последняя в списке), поправка —
   * к реплике ученика (предпоследняя). Индексы считаем от уже обновлённого
   * messages, поэтому зовём это ПОСЛЕ setMessages, передавая новую длину.
   *
   * Здесь же решается, показывать ли помощника: три подряд «пустых» реплики
   * ученика (владелец: «только когда юзер уже три реплики не может сказать
   * ничего адекватного»). Счётчик сбрасывается первой нормальной репликой.
   */
  const applyCoachTurn = useCallback(
    (rawCoach: unknown, learnerText: string, assistantIndex: number) => {
      const coach = parseDialogCoach(rawCoach);
      const weak = isWeakLearnerReply(learnerText);
      weakRepliesRef.current = weak ? weakRepliesRef.current + 1 : 0;
      const shouldShowHelper = weakRepliesRef.current >= 3;
      if (shouldShowHelper !== helperVisible) setHelperVisible(shouldShowHelper);

      // зачем такой подробный лог (владелец 2026-09-17, «лампочка и „лучше
      // сказать“ не появляются»): обе фичи ПОЛНОСТЬЮ написаны в UI, поэтому
      // видимость решают только эти значения. Печатаем ИМЕННО их, чтобы не
      // гадать, а видеть, на каком звене рвётся цепочка: сервер не прислал
      // поля (suggestions=0 / hasUserFix=false) или прислал, а экран не показал
      // (suggestions>0, но helperRowShown=false).
      DebugLogger.info('[DIALOG-COACH] turn', JSON.stringify({
        assistantIndex,
        hasNote: coach.note.length > 0,
        hasTranslation: coach.translation.length > 0,
        suggestions: coach.suggestions.length,
        // Сами тексты: пустой массив и массив из пустых строк — разные болезни.
        suggestionsSample: coach.suggestions.slice(0, 3),
        hasUserFix: coach.userFix != null,
        userFixCorrected: coach.userFix?.corrected ?? null,
        weakReply: weak,
        weakStreak: weakRepliesRef.current,
        helperVisible: shouldShowHelper,
        // Итог: увидит ли человек строку помощника на этом ходе.
        helperRowShown: shouldShowHelper || coach.suggestions.length > 0,
      }));

      if (hasCoachExplanation(coach) || coach.translation) {
        setCoachByIndex((prev) => ({ ...prev, [assistantIndex]: coach }));
      }
      // Перевод пришёл вместе с репликой — кладём в тот же кэш, что и ленивый
      // перевод по кнопке: тап «перевести» отработает мгновенно и без сети.
      if (coach.translation) {
        setTranslations((prev) => (prev[assistantIndex] != null ? prev : { ...prev, [assistantIndex]: coach.translation }));
      }
      // Поправка относится к реплике ученика — она идёт перед репликой собеседника.
      if (coach.userFix && assistantIndex > 0) {
        const learnerIndex = assistantIndex - 1;
        setFixByIndex((prev) => ({ ...prev, [learnerIndex]: coach.userFix as { corrected: string; note: string } }));
      }
    },
    [helperVisible],
  );

  const applyAcceptedTurn = useCallback(
    (
      res: { turnState: unknown; quality?: DialogQualityMeta; model?: string; remainingQuota?: number },
      exchangeIndex: number,
    ) => {
      if (res.quality) {
        const qualityTurnState = parseTurnState(res.turnState);
        void trackEvent('ai_dialog_reply_quality', {
          scenarioId: scenario.id,
          mode: 'scenario',
          exchangeIndex,
          model: res.model || 'unknown',
          repeatDetected: res.quality.repeatDetected,
          repeatReason: res.quality.repeatReason,
          similarityBucket: res.quality.similarityBucket,
          regenerationAttempted: res.quality.regenerationAttempted,
          regenerationSucceeded: res.quality.regenerationSucceeded,
          gameModeAvailable: res.quality.gameModeAvailable,
          outcome: qualityTurnState.outcome,
        });
      }

      // зачем (владелец 2026-09-22): спасённый ход (финальный кадр потерялся,
      // ответ восстановлен из напечатанного) приходит БЕЗ turnState и без
      // квоты — remainingQuota:-1 как метка «неизвестно». Игровое состояние в
      // таком ходе трогать нельзя: parseTurnState(null) вернул бы дефолт и
      // СБРОСИЛ настроение собеседника и прогресс целей. Реплику человек
      // получил — этого достаточно, авторитетное состояние придёт следующим
      // ходом. Ниже — обычный путь, когда сервер прислал полный кадр.
      if (res.turnState == null && res.remainingQuota === -1) return;

      // Модели без надёжного JSON не должны держать сценарий бесконечно. Ровно
      // после RECOMMENDED_EXCHANGES обменов закрываем только такой fallback-путь;
      // нормальный игровой режим по-прежнему завершается серверным outcome.
      if (
        gameEnabled &&
        (res.quality?.gameModeAvailable === false || !res.turnState) &&
        exchangeIndex >= RECOMMENDED_EXCHANGES
      ) {
        applyTurnState({
          mood,
          objectivesMet: Array.from(objectivesMet),
          outcome: 'stalled',
          characterReaction: '',
          coachTips: [],
        });
        return;
      }
      applyTurnState(res.turnState);
    },
    [applyTurnState, gameEnabled, mood, objectivesMet, scenario.id],
  );

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending || ended || voiceInputBusy || !promptScenario) return;
      if (!accessResolved) return;
      hapticTap();

      if (!dialogSessionOpen) {
        if (dailyQuotaGate === 'checking') return; // зеркало ещё читается — мгновения
        handleDailyLimitReached();
        return;
      }

      const exchangeIndex = userExchanges + 1;
      void trackEvent('ai_dialog_message_sent', { scenarioId: scenario.id, exchangeIndex });

      const history = buildHistory();
      const voiceAttachment = buildDialogueVoiceAttachment(voiceDraftRef.current, trimmed);
      // The transcript remains in the request/history for the partner's response,
      // while the learner sees and replays an actual local voice message.
      voiceDraftRef.current = null;
      // A late audioend is never allowed to populate a subsequent turn. Keep the
      // listener only until it can delete a late cache file, then invalidate it.
      voiceCaptureTokenRef.current += 1;
      if (voiceAttachment) {
        voiceMessageUrisRef.current.add(voiceAttachment.uri);
        voiceCaptureUriRef.current = null;
        cleanupVoiceAudioEndListener();
      } else {
        // The learner edited the ASR draft (or the file never finalized): it is
        // now a text turn, so remove the abandoned recording immediately.
        clearPendingDialogueVoiceRecordings();
      }
      lastSentTextRef.current = trimmed;
      sendStageRef.current = 'stream';
      setLastErrorMessage('');
      setLastErrorKind(null);
      setMessages((prev) => [...prev, { role: 'user', text: trimmed, voice: voiceAttachment ? { uri: voiceAttachment.uri } : undefined }]);
      setInput('');
      setSending(true);
      const quotaSpend = spendQuotaOptimistically('send');
      resetStreamDraft();
      const payload = {
        mode: 'scenario' as const,
        userText: trimmed,
        cefr: scenario.cefr,
        history,
        role: promptScenario!.role,
        setting: promptScenario!.setting,
        goalEn: promptScenario!.goal,
        persona: promptScenario!.persona,
        scenarioId: scenario.id,
        interfaceLang: lang,
        studyTarget,
        isPremium: hasPremiumAccess,
        ...buildGameRequestFields(exchangeIndex),
      };
      try {
        // Основной путь — стриминг: реплика печатается по мере генерации.
        // зачем: раньше ответ приходил целиком после последнего токена, и человек
        // 3-6 секунд смотрел на пустой пузырь — это и есть «ИИ долго думает».
        let res: {
          assistantMessage: string;
          turnState: unknown;
          coach?: unknown;
          remainingQuota: number;
          resetAtMs: number;
          quotaVersion: number;
          quality?: DialogQualityMeta;
          model?: string;
        };
        try {
          const streamed = await callPremiumDialogStream(payload, {
            onDelta: pushStreamDelta,
            onReset: resetStreamDraft,
          });
          res = {
            assistantMessage: streamed.assistantMessage,
            turnState: streamed.turnState,
            coach: streamed.coach,
            remainingQuota: streamed.remainingQuota,
            resetAtMs: streamed.resetAtMs,
            quotaVersion: streamed.quotaVersion,
            quality: streamed.quality,
            model: streamed.model,
          };
        } catch (streamError) {
          // Фолбэк на обычный callable — ТОЛЬКО когда сервер гарантированно не
          // начал работу (не списал квоту, не звал OpenAI). Иначе повтор снял бы
          // вторую единицу квоты и отправил сообщение дважды — см. разбор
          // идемпотентности в ai_dialog_client.ts.
          const canFallback =
            streamError instanceof DialogStreamError && streamError.notStarted;
          if (!canFallback) throw streamError;
          resetStreamDraft();
          const fallback = await callPremiumDialogSend(payload);
          res = {
            assistantMessage: fallback.assistantMessage,
            turnState: fallback.turnState,
            coach: fallback.coach,
            remainingQuota: fallback.remainingQuota,
            resetAtMs: fallback.resetAtMs,
            quotaVersion: fallback.quotaVersion,
            quality: fallback.quality,
            model: fallback.model,
          };
        }
        // Финальный текст авторитетен (сервер применил постфильтры) — он и
        // становится репликой, а черновик стрима гасим в том же кадре, чтобы
        // пузырь не мигнул дважды.
        resetStreamDraft();
        // Индекс новой реплики собеседника считаем ДО setState и чистой
        // арифметикой: в ленте уже лежит история + отправленная реплика ученика
        // (её добавили выше), значит собеседник встанет следующим.
        // Побочный эффект внутри апдейтера setState был бы небезопасен —
        // React вправе вызвать апдейтер дважды.
        const assistantIndex = history.length + 1;
        // зачем (диагностика 2026-09-22): дальше идёт разбор ответа, и если он
        // бросит — человек увидит «не удалось отправить» ПОСЛЕ прочитанной
        // реплики, а ход не засчитается. Метка стадии отделяет сбой сети от
        // сбоя разбора: в логе видно, докуда дошли.
        sendStageRef.current = 'reply_received';
        setMessages((prev) => [...prev, { role: 'assistant', text: res.assistantMessage }]);
        sendStageRef.current = 'coach';
        applyCoachTurn(res.coach, trimmed, assistantIndex);
        if (!hasPremiumAccess) {
          const quotaObservation = parseAiDialogQuotaObservation(res);
          if (quotaObservation) {
            // Сверка оптимистичного списания с сервером: сервер авторитетен.
            setDailyQuotaRemaining(quotaObservation.remainingQuota);
            setQuotaResetAtMs(quotaObservation.resetAtMs);
            void recordAiDialogDailyQuotaFromServer(studyTarget, accountStableId, quotaObservation);
          } else {
            console.warn('[DIALOG-QUOTA] send:ok without quota observation → keep optimistic value');
          }
        }
        // Игровое состояние хода (настроение/цели/исход). Безопасно при отсутствии.
        sendStageRef.current = 'accept_turn';
        applyAcceptedTurn(res, exchangeIndex);
        sendStageRef.current = 'done';
      } catch (error) {
        // Классифицируем ОДИН раз: от вида отказа зависит и уровень лога, и ветка UI.
        const errorKind = classifyPremiumDialogError(error);
        // зачем (2026-09-20): штатный отказ по правилам — НЕ авария. Раньше любая
        // ошибка писалась 'critical', то есть уезжала в Firestore и будила
        // Telegram-алерт «КРИТИЧЕСКАЯ ОШИБКА». Бесплатный человек упирался в
        // дневную квоту, сервер честно отвечал 'dialog_free_limit', пейвол честно
        // показывался — и владелец получал алерт об аварии, которой не было.
        // Отпечаток троттлинга в app_health считается по тексту ошибки, а не по
        // пользователю, поэтому шум одинаков у всех и глушит канал.
        // Исчерпанная квота и требование Plus — это работающая монетизация;
        // возрастной гейт — сработавшая защита. Логируем их как 'warning'
        // (Crashlytics видит, Firestore и Telegram — нет).
        // 'critical' остаётся там, где диалог действительно сломан: провайдер
        // не ответил, стрим оборвался, сеть/таймаут, неизвестный код.
        const isExpectedRefusal =
          errorKind === 'plus_required'
          || errorKind === 'free_limit'
          || errorKind === 'premium_limit'
          || errorKind === 'age_restricted';
        // зачем (диагностика 2026-09-22, владелец: «ответ приходит, через
        // секунду ошибка, и реплики не считаются»): стадия показывает, где
        // рвётся. 'stream' — не доехал ответ; 'coach'/'accept_turn' — ответ
        // человек УЖЕ прочитал, а упал разбор, и ход не засчитался.
        DebugLogger.info('[DIALOG-SEND] failed', JSON.stringify({
          stage: sendStageRef.current,
          errorKind,
          exchangeIndex,
          scenarioId: scenario.id,
          studyTarget,
          message: String((error as Error)?.message ?? error).slice(0, 200),
        }));
        DebugLogger.error(
          'ai_dialog:reply_stream',
          error instanceof Error ? error : new Error(String(error)),
          isExpectedRefusal ? 'warning' : 'critical',
        );
        resetStreamDraft();
        // Ошибка сети/таймаута: НЕ пишем её как реплику персонажа и НЕ списываем
        // бесплатную попытку — показываем системную плашку с кнопкой «Повторить».
        void trackEvent('ai_dialog_send_error', { scenarioId: scenario.id, exchangeIndex });
        if (errorKind === 'plus_required' && !hasPremiumAccess) {
          quotaSpend.rollback(errorKind);
          openDialogPaywall();
          return;
        }
        if (errorKind === 'free_limit' && !hasPremiumAccess) {
          // Сервер — источник истины для месячной квоты сценарных диалогов.
          handleDailyLimitReached(quotaObservationFromDialogError(error));
          return;
        }
        // Сервер не засчитал ответ (сеть, провайдер, таймаут) — реплика
        // не списана, возвращаем оптимистично снятую единицу.
        quotaSpend.rollback(errorKind);
        setLastErrorKind(errorKind);
        setLastErrorMessage(getPremiumDialogErrorMessage(error, { hasPremiumAccess, lang }));
      } finally {
        setSending(false);
      }
    },
    [sending, ended, voiceInputBusy, hasPremiumAccess, accessResolved, dialogAccess, dialogSessionOpen, dailyQuotaGate, handleDailyLimitReached, openDialogPaywall, accountStableId, userExchanges, buildHistory, scenario, promptScenario, lang, studyTarget, buildGameRequestFields, applyAcceptedTurn, applyCoachTurn, pushStreamDelta, resetStreamDraft, cleanupVoiceAudioEndListener, clearPendingDialogueVoiceRecordings, spendQuotaOptimistically],
  );

  // Голосовой ввод «зажми и продиктуй»: держим кнопку, пока говорим. Отпустил —
  // распознанная реплика остаётся черновиком для проверки перед отправкой.
  const handleMicPressIn = useCallback(() => {
    if (sending || ended) return;
    holdPressActiveRef.current = true;
    void startVoiceInput();
  }, [sending, ended, startVoiceInput]);

  // Отпустил микрофон: сразу гасим красное active-состояние и останавливаем recognizer.
  const handleMicPressOut = useCallback(() => {
    holdPressActiveRef.current = false;
    voiceInputGenerationRef.current += 1;
    clearRecognizerWatchdog();
    if (voiceInputStatusRef.current === 'requesting') {
      // Отпустили ДО начала слушания — говорить было нечего, отправлять нечего.
      voiceInputSessionRef.current += 1;
      cleanupVoiceInputListeners();
      try {
        speechModule?.abort();
      } catch (e) {
      // no-op
      DebugLogger.error('ai_dialog_session:handleMicPressOut', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
      restoreLoudPlaybackMode();
      setVoiceInputStatus('idle');
      return;
    }
    if (voiceInputStatusRef.current !== 'listening') {
      return;
    }
    // Дожидаемся финального текста, затем разрешаем редактирование и отправку.
    setVoiceInputStatus('finishing');
    try {
      speechModule?.stop();
    } catch (e) {
      // сервис мог умереть — не мешаем
      DebugLogger.error('ai_dialog_session:handleMicPressOut', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    scheduleSpeechStopSettlement(voiceStopSettlementRef, settleVoiceInput);
  }, [clearRecognizerWatchdog, speechModule, cleanupVoiceInputListeners, restoreLoudPlaybackMode, settleVoiceInput]);

  // Повтор последней отправки после ошибки сети. Реплика пользователя уже в чате,
  // поэтому НЕ пушим её заново — только заново зовём ИИ с той же историей.
  const retryLastSend = useCallback(async () => {
    if (sending || ended || !promptScenario) return;
    const trimmed = lastSentTextRef.current.trim();
    if (!trimmed) return;
    if (!accessResolved) return;
    hapticTap();
    if (!dialogSessionOpen) {
      if (dailyQuotaGate === 'checking') return;
      handleDailyLimitReached();
      return;
    }
    void trackEvent('ai_dialog_retry', { scenarioId: scenario.id });

    // История БЕЗ последней реплики пользователя (она уже в messages, передаём как userText).
    const priorMessages = messages.slice(0, -1);
    const history: DialogChatTurn[] = priorMessages.map((m) => ({ role: m.role, content: m.text }));
    const exchangeIndex = messages.filter((message) => message.role === 'user').length;

    setLastErrorMessage('');
    setLastErrorKind(null);
    setSending(true);
    resetStreamDraft();
    const quotaSpend = spendQuotaOptimistically('retry');
    const payload = {
      mode: 'scenario' as const,
      userText: trimmed,
      cefr: scenario.cefr,
      history,
      role: promptScenario!.role,
      setting: promptScenario!.setting,
      goalEn: promptScenario!.goal,
      persona: promptScenario!.persona,
      scenarioId: scenario.id,
      interfaceLang: lang,
      studyTarget,
      isPremium: hasPremiumAccess,
      ...buildGameRequestFields(exchangeIndex),
    };
    try {
      // Повтор тоже стримит — иначе после ошибки человек снова ждал бы молча.
      let res: {
        assistantMessage: string;
        turnState: unknown;
        coach?: unknown;
        quality?: DialogQualityMeta;
        model?: string;
        remainingQuota: number;
        resetAtMs: number;
        quotaVersion: number;
      };
      try {
        const streamed = await callPremiumDialogStream(payload, {
          onDelta: pushStreamDelta,
          onReset: resetStreamDraft,
        });
        res = {
          assistantMessage: streamed.assistantMessage,
          turnState: streamed.turnState,
          coach: streamed.coach,
          remainingQuota: streamed.remainingQuota,
          resetAtMs: streamed.resetAtMs,
          quotaVersion: streamed.quotaVersion,
          quality: streamed.quality,
          model: streamed.model,
        };
      } catch (streamError) {
        // Фолбэк только когда сервер точно не начал работу (см. send выше).
        const canFallback = streamError instanceof DialogStreamError && streamError.notStarted;
        if (!canFallback) throw streamError;
        resetStreamDraft();
        const fallback = await callPremiumDialogSend(payload);
        res = {
          assistantMessage: fallback.assistantMessage,
          turnState: fallback.turnState,
          coach: fallback.coach,
          remainingQuota: fallback.remainingQuota,
          resetAtMs: fallback.resetAtMs,
          quotaVersion: fallback.quotaVersion,
          quality: fallback.quality,
          model: fallback.model,
        };
      }
      resetStreamDraft();
      // Повтор: реплика ученика уже в ленте, собеседник встанет следующим.
      const assistantIndex = messages.length;
      setMessages((prev) => [...prev, { role: 'assistant', text: res.assistantMessage }]);
      applyCoachTurn(res.coach, trimmed, assistantIndex);
      if (!hasPremiumAccess) {
        const quotaObservation = parseAiDialogQuotaObservation(res);
        if (quotaObservation) {
          setDailyQuotaRemaining(quotaObservation.remainingQuota);
          setQuotaResetAtMs(quotaObservation.resetAtMs);
          void recordAiDialogDailyQuotaFromServer(studyTarget, accountStableId, quotaObservation);
        } else {
          console.warn('[DIALOG-QUOTA] retry:ok without quota observation → keep optimistic value');
        }
      }
      applyAcceptedTurn(res, exchangeIndex);
    } catch (error) {
      resetStreamDraft();
      void trackEvent('ai_dialog_send_error', { scenarioId: scenario.id, retry: true });
      const errorKind = classifyPremiumDialogError(error);
      if (errorKind === 'plus_required' && !hasPremiumAccess) {
        quotaSpend.rollback(errorKind);
        openDialogPaywall();
        return;
      }
      if (errorKind === 'free_limit' && !hasPremiumAccess) {
        handleDailyLimitReached(quotaObservationFromDialogError(error));
        return;
      }
      quotaSpend.rollback(errorKind);
      setLastErrorKind(classifyPremiumDialogError(error));
      setLastErrorMessage(getPremiumDialogErrorMessage(error, { hasPremiumAccess, lang }));
    } finally {
      setSending(false);
    }
  }, [sending, ended, hasPremiumAccess, accessResolved, dialogAccess, dialogSessionOpen, dailyQuotaGate, handleDailyLimitReached, openDialogPaywall, accountStableId, messages, scenario, promptScenario, lang, studyTarget, buildGameRequestFields, applyAcceptedTurn, applyCoachTurn, pushStreamDelta, resetStreamDraft, spendQuotaOptimistically]);

  // Приветствие уже стоит в начальном состоянии. Здесь — только телеметрия старта
  // (один раз на маунт). OpenAI зовём только после первой реплики пользователя.
  useEffect(() => {
    if (!dialogueRuntimeOpen) return;
    void trackEvent('ai_dialog_started', { scenarioId: scenario.id, cefr: scenario.cefr });
  }, [dialogueRuntimeOpen, scenario.cefr, scenario.id]);

  // Параметры маршрута могут «доехать» после первого кадра (expo-router) — тогда
  // ленивый сид взял дефолтный сценарий. Пока пользователь НИЧЕГО не написал (в чате
  // только приветствие), обновляем приветствие под реально открытый сценарий.
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length !== 1 || prev[0].role !== 'assistant') return prev;
      const fresh = promptScenario?.greeting ?? '';
      if (prev[0].text === fresh) return prev;
      return [{ role: 'assistant', text: fresh }];
    });
  }, [promptScenario?.greeting]);

  const finishDialog = useCallback(() => {
    if (ended || userExchanges <= 0) return;
    hapticTap();
    setEnded(true);
    // зачем БЕЗ паузы (аудит 2026-09-17): пауза существует, чтобы дочитать
    // финальную реплику собеседника. Здесь её нет — человек сам нажал
    // «Завершить», и ждать ему нечего: он получил бы три секунды пустого
    // экрана после собственного осознанного действия.
    setVerdictReady(true);
    void trackEvent('ai_dialog_completed', { scenarioId: scenario.id, exchanges: userExchanges });
    // Локально помечаем сценарий пройденным — список диалогов покажет «Пройдено»
    // и сдвинет блок «Продолжить» на следующий сценарий. Идемпотентно + best-effort.
    void markDialogCompleted(studyTarget, scenario.id);
    // Бесплатный диалог уже отмечен использованным на первой реплике — здесь не дублируем.
  }, [ended, scenario.id, studyTarget, userExchanges]);

  // У финального экрана всегда есть честный итог. Пока сервер готовит живой
  // разбор, fallback уже заякорен на реальных репликах; если вызов упадёт,
  // мы не оставляем экран пустым и не выдумываем оценку.
  useEffect(() => {
    // Итог нужен на каждом экране завершения: даже если человек завершил
    // переписку до первой своей реплики, честно показываем, что оценивать пока
    // нечего, вместо пустого блока без реакции собеседника.
    if (!ended || review) return;
    const learnerTurns = messages
      .filter((message) => message.role === 'user')
      .map((message) => stripMarkers(message.text));
    setReview(buildDialogueCompletionFallback({ lang, learnerTurns }));
    setReviewStatus('ready');
  }, [ended, userExchanges, messages, lang, review]);

  // Диалог завершён → один раз запрашиваем финальный разбор фраз ученика.
  // Транскрипт шлём без [[...]]-маркеров: тьютору-ревьюеру они только мешают.
  useEffect(() => {
    if (!accessResolved || !ended || userExchanges <= 0 || reviewRequestedRef.current || !promptScenario) return;
    reviewRequestedRef.current = true;
    setReviewStatus('loading');
    const transcript: DialogChatTurn[] = messages.map((m) => ({
      role: m.role,
      content: stripMarkers(m.text),
    }));
    callPremiumDialogReview({
      history: transcript,
      cefr: scenario.cefr,
      interfaceLang: lang,
      scenarioId: scenario.id,
      goalEn: promptScenario!.goal,
      studyTarget,
    })
      .then((res) => {
        if (!isCompletionReviewUsable(res)) {
          throw new Error('dialog_review_missing_grounded_completion_assessment');
        }
        setReview(res);
        setReviewStatus('ready');
        void trackEvent('ai_dialog_review_shown', {
          scenarioId: scenario.id,
          corrections: Array.isArray(res.corrections) ? res.corrections.length : 0,
        });
      })
      .catch(() => {
        // Никакой пустой финальной карточки: fallback выше уже содержит только
        // факты из этого транскрипта и честно сообщает, что AI-разбор недоступен.
        setReviewStatus('ready');
        void trackEvent('ai_dialog_review_failed', { scenarioId: scenario.id });
      });
  }, [accessResolved, ended, userExchanges, messages, scenario, promptScenario, lang, studyTarget]);

  // зачем: пузырь стрима РАСТЁТ по мере печати — без реакции на streamingText
  // длинная реплика уезжала бы за нижний край и человек читал бы её вслепую.
  // Во время печати скроллим без анимации: анимированный скролл на каждый чанк
  // дёргает список и борется сам с собой.
  useEffect(() => {
    const streaming = streamingText.length > 0;
    if (streaming) {
      scrollRef.current?.scrollToEnd({ animated: false });
      return;
    }
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(id);
  }, [messages.length, sending, streamingText]);

  const onBack = useCallback(() => {
    hapticTap();
    if (!ended && userExchanges > 0) {
      void trackEvent('ai_dialog_abandoned', { scenarioId: scenario.id, atExchange: userExchanges });
    }
    // Fallback на главную (не на ai_dialog_home — это standalone QA-роут): сессия
    // открывается из вкладки «Уроки», и при пустом стеке честнее уйти на главную.
    safeRouterBack(router, '/(tabs)/home' as any);
  }, [router, ended, userExchanges, scenario.id]);

  const canRetryLastError =
    lastErrorKind == null ||
    lastErrorKind === 'provider_unavailable' ||
    lastErrorKind === 'network' ||
    lastErrorKind === 'unknown';

  const voiceInputHint =
    voiceInputStatus === 'requesting'
      ? triLang(lang, {
          ru: 'Готовлю микрофон… удерживай кнопку',
          uk: 'Готую мікрофон… тримай кнопку',
          en: 'Getting the mic ready… keep holding the button',
          es: 'Preparando el micrófono… mantén pulsado',
          'pt-BR': 'Preparando o microfone… continue segurando',
          vi: 'Đang chuẩn bị micrô… hãy tiếp tục giữ',
          id: 'Menyiapkan mikrofon… tetap tahan',
          tr: 'Mikrofon hazırlanıyor… basılı tut',
          pl: 'Przygotowuję mikrofon… trzymaj przycisk',
        })
      : voiceInputStatus === 'finishing'
        ? triLang(lang, {
            ru: 'Обрабатываю сказанное…',
            uk: 'Обробляю сказане…',
            en: 'Processing what you said…',
            es: 'Procesando lo dicho…',
            'pt-BR': 'Processando o que você disse…',
            vi: 'Đang xử lý lời nói…',
            id: 'Memproses ucapan…',
            tr: 'Söylediklerin işleniyor…',
            pl: 'Przetwarzam wypowiedź…',
          })
      : voiceInputStatus === 'listening'
      ? triLang(lang, {
          ru: 'Говори… отпусти, когда закончишь',
          uk: 'Говори… відпусти, коли закінчиш',
          en: 'Speak… release when you’re done',
          es: 'Habla… suelta al terminar',
          'pt-BR': 'Fale… solte ao terminar',
          vi: 'Nói… thả ra khi xong',
          id: 'Bicara… lepas setelah selesai',
          tr: 'Konuş… bitince bırak',
          pl: 'Mów… puść, gdy skończysz',
        })
      // зачем в покое ПУСТО (владелец 2026-09-15, «убери "зажми микрофон"»):
      // в макете под композером нет ни одной подписи, а сама строка налезала на
      // поле ввода. Подсказка «зажми микрофон» дублировала плейсхолдер, который
      // и так говорит то же самое. Живые состояния (слушаю, обрабатываю, нет
      // доступа) остаются: это не украшение, а обратная связь.
      : voiceInputStatus === 'denied'
        ? triLang(lang, {
            ru: 'Нужен доступ к микрофону',
            uk: 'Потрібен доступ до мікрофона',
            en: 'Microphone access needed',
            es: 'Se necesita acceso al micrófono',
            'pt-BR': 'É preciso liberar o microfone',
            vi: 'Cần quyền truy cập micrô',
            id: 'Butuh akses mikrofon',
            tr: 'Mikrofon izni gerekli',
            pl: 'Potrzebny dostęp do mikrofonu',
          })
        : voiceInputStatus === 'stalled' || voiceInputStatus === 'error'
          ? triLang(lang, {
              ru: 'Не удалось расслышать. Попробуй ещё раз',
              uk: 'Не вдалося розчути. Спробуй ще раз',
              en: 'Couldn’t make it out. Try again',
              es: 'No se pudo escuchar. Inténtalo de nuevo',
              'pt-BR': 'Não deu para ouvir. Tente de novo',
              vi: 'Chưa nghe rõ. Hãy thử lại',
              id: 'Belum terdengar. Coba lagi',
              tr: 'Duyulamadı. Tekrar dene',
              pl: 'Nie udało się usłyszeć. Spróbuj ponownie',
            })
        : voiceInputStatus === 'unavailable'
          ? speechNa
            ? speechUnavailableOnDeviceText(lang)
            : triLang(lang, {
              ru: 'Голосовой ввод недоступен на этом устройстве',
              uk: 'Голосове введення недоступне на цьому пристрої',
              en: 'Voice input isn’t available on this device',
              es: 'La entrada por voz no está disponible en este dispositivo',
              'pt-BR': 'A entrada por voz não está disponível neste aparelho',
              vi: 'Thiết bị này chưa hỗ trợ nhập bằng giọng nói',
              id: 'Input suara tidak tersedia di perangkat ini',
              tr: 'Sesle giriş bu cihazda kullanılamıyor',
              pl: 'Wpisywanie głosem nie działa na tym urządzeniu',
            })
          : '';

  if (!dialogueRuntimeOpen) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Ionicons name="lock-closed-outline" size={38} color={t.textMuted} />
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900', textAlign: 'center', marginTop: 14 }}>
            {frenchGateCopy.title}
          </Text>
          <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', marginTop: 10, lineHeight: 22 }}>
            {frenchGateCopy.body}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
                                    onPress={() => {
                                      if (strictPlaybackUnavailable) return;
                                      hapticTap();
              router.replace('/lessons_list' as any);
            }}
            style={{
              marginTop: 22,
              backgroundColor: t.accent,
              borderRadius: 16,
              paddingHorizontal: 24,
              paddingVertical: 12,
            }}
          >
            <Text style={{ color: t.textOnGold, fontSize: f.sub, fontWeight: '900' }}>{frenchGateCopy.action}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  // Глобальный рубильник ИИ: не пускаем внутрь диалога — показываем забавную
  // заглушку «кафе/аэропорт закрыто» по категории ситуации (владелец: не пускать).
  if (aiOffline()) {
    const offline = aiOfflineDialogScreen(lang, scenario.category, scenario.id);
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Ionicons name={scenario.icon as any} size={40} color={t.textMuted} />
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900', textAlign: 'center', marginTop: 14 }}>
            {offline.title}
          </Text>
          <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', marginTop: 10, lineHeight: 22 }}>
            {offline.message}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => {
              hapticTap();
              safeRouterBack(router, '/(tabs)/home' as any);
            }}
            style={{ marginTop: 22, backgroundColor: t.accent, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 12 }}
          >
            <Text style={{ color: t.textOnGold, fontSize: f.sub, fontWeight: '900' }}>
              {triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Volver', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wróć' })}
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  return (
    <ScreenGradient>
      {/* зачем (владелец, приёмка на устройстве): свет сцены обязан заливать и
          сейф-зону — градиент живёт ВНЕ SafeAreaView, от самого верха экрана,
          иначе над шапкой видна полоса базового фона у статус-бара. */}
      <LinearGradient
        pointerEvents="none"
        colors={[scene.hueDeep + '3D', scene.hue + '12', 'transparent']}
        locations={[0, 0.62, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 160 }}
      />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Шапка-сцена (редизайн 2026-08-23): «свет места» вместо линии-разделителя,
            собеседник в свете сцены, лицо-настроение. */}
        <View style={{ position: 'relative' }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 12,
              paddingVertical: 10,
              gap: 4,
            }}
          >
          <TouchableOpacity
            onPress={onBack}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, {
              ru: 'Назад',
              uk: 'Назад',
              en: 'Back',
              es: 'Atrás',
              'pt-BR': 'Voltar',
              vi: 'Quay lại',
              id: 'Kembali',
              tr: 'Geri',
              pl: 'Wstecz',
            })}
          >
            <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
          </TouchableOpacity>

          {/* Аватар: иконка сценария в свете сцены */}
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 15,
              backgroundColor: scene.hue + '26',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10,
            }}
          >
            <Ionicons name={scenario.icon as any} size={21} color={scene.hue} />
            {/* «онлайн»-точка */}
            <View
              style={{
                position: 'absolute',
                right: -2,
                bottom: -2,
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: t.correct,
              }}
            />
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {/* Смайл настроения собеседника (игровой режим): 😄🙂😐😟😠 без цифр.
                  Это и есть «лицо» собеседника в шапке. */}
              {gameEnabled && !ended ? (
                <Text
                  accessibilityLabel={triLang(lang, {
                    ru: 'Настроение собеседника',
                    uk: 'Настрій співрозмовника',
                    en: 'Your partner’s mood',
                    es: 'Ánimo del interlocutor',
                    'pt-BR': 'Humor do interlocutor',
                    vi: 'Tâm trạng người kia',
                    id: 'Suasana hati lawan bicara',
                    tr: 'Karşıdakinin ruh hâli',
                    pl: 'Nastrój rozmówcy',
                  })}
                  style={{ fontSize: f.h2 + 2 }}
                >
                  {moodToFace(mood)}
                </Text>
              ) : (
                // Имя/место убраны по просьбе (усечённое «М.» не помогало). Когда
                // смайла нет (не игра или диалог завершён) — короткий нейтральный
                // заголовок, чтобы шапка не была пустой.
                <Text
                  style={{ fontWeight: '700', color: t.textPrimary, fontSize: f.body, flexShrink: 1 }}
                >
                  {presentation?.title ?? ''}
                </Text>
              )}
            </View>
            {/* зачем (владелец, приёмка): точки-прогресс целей из шапки убраны —
                «убери индикатор 3 точки вверху». Прогресс целей виден в финале. */}
          </View>

          {!ended && userExchanges > 0 ? (
            <TouchableOpacity
              onPress={finishDialog}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel={triLang(lang, {
                ru: 'Завершить диалог',
                uk: 'Завершити діалог',
                en: 'End dialogue',
                es: 'Terminar diálogo',
                'pt-BR': 'Encerrar diálogo',
                vi: 'Kết thúc cuộc đối thoại',
                id: 'Akhiri dialog',
                tr: 'Diyaloğu bitir',
                pl: 'Zakończ dialog',
              })}
              style={{
                minHeight: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 16,
                backgroundColor: glassFill(t.bgCard, 0.46),
              }}
            >
              <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '700' }}>
                {triLang(lang, {
                  ru: 'Завершить',
                  uk: 'Завершити',
                  en: 'End',
                  es: 'Terminar',
                  'pt-BR': 'Encerrar',
                  vi: 'Kết thúc',
                  id: 'Akhiri',
                  tr: 'Bitir',
                  pl: 'Zakończ',
                })}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 8 }} />
          )}

          {/* зачем счётчик ЗДЕСЬ (владелец 2026-09-15: «10/10 сдвинь вправо
              вообще пусть будет справа в углу вверху»): раньше он стоял
              отдельной строкой по центру под шапкой, и плашка цели налезала на
              него. В углу он никому не мешает и не отнимает вертикаль. */}
          {!hasPremiumAccess ? (
            <DialogQuotaBadge
              lang={lang}
              remaining={dailyQuotaRemaining ?? dailyQuotaLimit}
              limit={dailyQuotaLimit}
              resetAtMs={quotaResetAtMs}
              testID="ai-dialog-daily-quota"
            />
          ) : null}

          {/* Кнопка «Сообщить об ошибке» — красный флаг в правом углу хедера,
              виден весь диалог, не зависит от состояния (идёт/завершён). */}
          <ReportErrorButton
            screen="ai_dialog"
            dataId={`ai_dialog_${scenario.id ?? 'unknown'}`}
            dataText={presentation?.title ?? ''}
            variant="icon-flag"
            accessibilityLabel={triLang(lang, { ru: 'Сообщить об ошибке в диалоге', uk: 'Повідомити про помилку в діалозі', en: 'Report an error in the dialogue', es: 'Informar de un error en el diálogo', 'pt-BR': 'Relatar erro no diálogo', vi: 'Báo lỗi trong hội thoại', id: 'Laporkan kesalahan dalam dialog', tr: 'Diyalogdaki hatayı bildir', pl: 'Zgłoś błąd w dialogu' })}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: glassFill(t.bgCard, 0.46),
              marginLeft: 6,
            }}
          />
          </View>
        </View>

        {/* Текущая цель сцены одной строкой под шапкой.
            зачем (владелец 2026-09-14, вариант Б): три точки-индикатора в шапке
            он раньше отверг, но в утверждённом макете цель есть — именно строкой
            («Цель 2 из 3 · спросить про сахар»). Так человек всё время видит,
            чего от него ждут, и при этом шапка остаётся чистой.
            Показываем, пока диалог идёт и цели ещё не закрыты. */}
        {/* зачем строка целей НАЖИМАЕМАЯ (владелец 2026-09-17: «цели должно быть
            нажимабельным и открывать модал лист и показывать какие цели все»):
            раньше это был мёртвый View с accessibilityRole="text", который
            показывал ТОЛЬКО текущую цель. Человек не видел ни списка, ни того,
            сколько осталось. Теперь тап открывает шторку со всеми заданиями. */}
        {gameEnabled && !ended && currentGoal ? (
          <TouchableOpacity
            onPress={() => {
              hapticTap();
              setGoalsOpen(true);
              void trackEvent('ai_dialog_goals_opened', { scenarioId: scenario.id });
            }}
            activeOpacity={0.75}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              marginHorizontal: 12,
              marginBottom: 6,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 16,
              backgroundColor: glassFill(t.bgCard, 0.46),
            }}
            accessibilityRole="button"
            accessibilityLabel={`${triLang(lang, {
              ru: 'Цель', uk: 'Ціль', en: 'Goal', es: 'Objetivo', 'pt-BR': 'Objetivo',
              vi: 'Mục tiêu', id: 'Tujuan', tr: 'Hedef', pl: 'Cel',
            })} ${objectivesMet.size + 1} / ${objectives.length}: ${currentGoal.labelRu}`}
            accessibilityHint={triLang(lang, {
              ru: 'Открыть список всех заданий', uk: 'Відкрити список усіх завдань',
              en: 'Open the list of all goals', es: 'Abrir la lista de objetivos',
              'pt-BR': 'Abrir a lista de objetivos', vi: 'Mở danh sách nhiệm vụ',
              id: 'Buka daftar tugas', tr: 'Tüm görevleri aç', pl: 'Otwórz listę zadań',
            })}
            testID="ai-dialog-goal-line"
          >
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 9,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: t.accentBg,
              }}
            >
              <Ionicons name="flag" size={14} color={t.accentText} />
            </View>
            <Text
              style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '700', flex: 1 }}
              maxFontSizeMultiplier={1.2}
            >
              {triLang(lang, {
                ru: 'Цель', uk: 'Ціль', en: 'Goal', es: 'Objetivo', 'pt-BR': 'Objetivo',
                vi: 'Mục tiêu', id: 'Tujuan', tr: 'Hedef', pl: 'Cel',
              })}
              {` ${Math.min(objectivesMet.size + 1, objectives.length)} / ${objectives.length} · `}
              <Text style={{ color: t.accentText, fontWeight: '400' }}>{currentGoal.labelRu}</Text>
            </Text>
            {/* Шеврон: видимый признак, что строка нажимается. */}
            <Ionicons name="chevron-forward" size={16} color={t.textMuted} />
          </TouchableOpacity>
        ) : null}

        {/* ЛАМПОЧКА — настоящая кнопка подсказки (владелец 2026-09-17).
            Отдельной кнопкой справа от целей, доступна ВСЕГДА: человек сам
            решает, нужна ли ему помощь. Она ПОКАЗЫВАЕТ подсказку в шторке, а
            не вставляет её в поле ввода — подсказка написана по-русски, это
            инструкция автора, а не реплика. */}
        {gameEnabled && !ended && currentGoal ? (
          <TouchableOpacity
            onPress={() => {
              hapticTap();
              // Старый отказ не должен встречать человека при новом открытии.
              setHintDenied(null);
              setHintOpen(true);
              void trackEvent('ai_dialog_hint_opened', { scenarioId: scenario.id });
            }}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, {
              ru: 'Подсказка: что сделать дальше',
              uk: 'Підказка: що зробити далі',
              en: 'Hint: what to do next',
              es: 'Pista: qué hacer ahora',
              'pt-BR': 'Dica: o que fazer agora',
              vi: 'Gợi ý: làm gì tiếp theo',
              id: 'Petunjuk: apa selanjutnya',
              tr: 'İpucu: sırada ne var',
              pl: 'Podpowiedź: co dalej',
            })}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              alignSelf: 'flex-start',
              marginHorizontal: 12,
              marginBottom: 6,
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 14,
              backgroundColor: t.accentBg,
            }}
            testID="ai-dialog-hint-button"
          >
            {/* зачем на лампочке НЕТ значка руны (владелец 2026-09-18,
                поправил меня: «подсказка вот эта вверху кнопку со словом
                подсказка — она бесплатна, там ничего не надо платить»).
                Лампочка показывает шаг сценария из бандла: ни сети, ни модели,
                ни расходов — брать за неё нечего. Платная — «Почему так»
                (3 бесплатных в день, дальше руны), она под репликой. */}
            <Ionicons name="bulb" size={18} color={t.accentText} />
            <Text style={{ color: t.accentText, fontSize: f.sub, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
              {triLang(lang, {
                ru: 'Подсказка', uk: 'Підказка', en: 'Hint', es: 'Pista', 'pt-BR': 'Dica',
                vi: 'Gợi ý', id: 'Petunjuk', tr: 'İpucu', pl: 'Podpowiedź',
              })}
            </Text>
          </TouchableOpacity>
        ) : null}

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          // H11: Android — нужен явный 'height', иначе клавиатура перекрывает поле ввода.
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={8}
        >
          <FlatList removeClippedSubviews={false}
            ref={scrollRef}
            decelerationRate="fast"
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 16 }}
            data={messages}
            keyExtractor={(_, index) => String(index)}
            renderItem={({ item: m, index: i }) => {
              const isUser = m.role === 'user';
              // Анимируем появление ТОЛЬКО для приходящих позже реплик. Самое первое
              // приветствие (i === 0) всегда видно сразу — никакого fade из opacity:0,
              // чтобы «первая реплика» гарантированно отображалась.
              const isLast = i === messages.length - 1 && i > 0;
              return (
                <Animated.View
                  style={{
                    opacity: isLast ? enterAnim : 1,
                    transform: [
                      {
                        translateY: isLast
                          ? enterAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] })
                          : 0,
                      },
                    ],
                    flexDirection: 'row',
                    alignItems: 'flex-end',
                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                    // У реплики собеседника ряд кнопок выступает за нижнюю
                    // кромку пузыря на 17px — отдаём это место, иначе кнопки
                    // наехали бы на следующее сообщение.
                    marginBottom: isUser ? 12 : 26,
                  }}
                >
                  {/* Мини-аватар собеседника слева от его пузыря — в свете сцены */}
                  {!isUser && (
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 11,
                        backgroundColor: scene.hue + '26',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 8,
                      }}
                    >
                      <Ionicons name={scenario.icon as any} size={15} color={scene.hue} />
                    </View>
                  )}

                  {isUser ? (
                    // Пузырь пользователя — цветной, справа, с тенью и «хвостиком».
                    // зачем (аудит 2026-08-23): flexShrink рядом с пузырём собеседника
                    // защищает от Android-бага (maxWidth без flexShrink внутри row
                    // схлопывает текст в нулевую ширину) — тот же родитель-row, та же
                    // защита нужна и здесь, иначе своя реплика могла бы пропасть.
                    <View style={{ maxWidth: '82%', flexShrink: 1, alignItems: 'flex-end' }}>
                      <View
                        style={{
                          backgroundColor: t.accent,
                          borderRadius: 22,
                          borderBottomRightRadius: 7,
                          paddingHorizontal: 16,
                          paddingVertical: 11,
                          shadowColor: t.shadowDark,
                          shadowOpacity: 0.25,
                          shadowRadius: 6,
                          shadowOffset: { width: 0, height: 2 },
                          ...noAndroidOutline,
                        }}
                      >
                        {m.voice ? (
                          <TouchableOpacity
                            onPress={() => {
                              hapticTap();
                              playVoiceMessage(m.voice!.uri);
                            }}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel={describeDialogueVoiceMessage(lang).action}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 9, minWidth: 168 }}
                            testID={`ai-dialog-voice-message-${i}`}
                          >
                            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: `${t.textOnGold}2B`, alignItems: 'center', justifyContent: 'center' }}>
                              <Ionicons name={playingVoiceMessageUri === m.voice.uri ? 'pause' : 'play'} size={17} color={t.textOnGold} />
                            </View>
                            <View style={{ flex: 1, gap: 3 }}>
                              <Text style={{ color: t.textOnGold, fontSize: f.label, fontWeight: '800' }} maxFontSizeMultiplier={1.2}>
                                {describeDialogueVoiceMessage(lang).label}
                              </Text>
                              <View style={{ height: 3, borderRadius: 2, backgroundColor: `${t.textOnGold}52`, overflow: 'hidden' }}>
                                <View style={{ width: '38%', height: '100%', borderRadius: 2, backgroundColor: t.textOnGold }} />
                              </View>
                            </View>
                          </TouchableOpacity>
                        ) : (
                          <Text
                            style={{
                              color: t.textOnGold,
                              fontSize: f.bodyLg,
                              fontWeight: '400',
                              lineHeight: Math.round(f.bodyLg * 1.4),
                            }}
                            maxFontSizeMultiplier={1.2}
                          >
                            {m.text}
                          </Text>
                        )}
                      </View>
                      {/* Поправка своей реплики: СНАЧАЛА КНОПКА, потом текст
                          (владелец 2026-09-17, по макету: «когда ты отправляешь
                          реплику, то внизу под ней появляется кнопочка, и если
                          нажать, то оно под твоей репликой покажет жёлтый текст
                          „лучше так“ и более правильный вариант»).

                          зачем не показывать сразу: исправление, выскочившее
                          само, читается как выговор и отвлекает от разговора.
                          Человек сам решает, хочет ли он сейчас разбор.

                          Бесплатно ВСЕГДА (решение владельца 2026-09-17): это
                          разбор СВОЕЙ ошибки, то есть учёба, а не подсказка
                          «как сказать». За перевод чужой речи мы тоже не берём.

                          Цвет `t.gold` — токен темы, читается в любой теме. */}
                      {fixByIndex[i] ? (
                        fixShownFor.has(i) ? (
                          <View
                            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 6, maxWidth: '100%' }}
                          >
                            <Ionicons name="create-outline" size={15} color={t.accentText} style={{ marginTop: 2 }} />
                            <Text
                              style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700', flexShrink: 1 }}
                              maxFontSizeMultiplier={1.2}
                            >
                              {triLang(lang, {
                                ru: 'Лучше так: ', uk: 'Краще так: ', en: 'Better: ', es: 'Mejor: ', 'pt-BR': 'Melhor: ',
                                vi: 'Nên nói: ', id: 'Lebih baik: ', tr: 'Daha iyi: ', pl: 'Lepiej: ',
                              })}
                              <Text style={{ color: t.accentText, fontWeight: '700' }}>{fixByIndex[i].corrected}</Text>
                            </Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            onPress={() => {
                              hapticTap();
                              setFixShownFor((prev) => new Set([...prev, i]));
                              void trackEvent('ai_dialog_fix_shown', { scenarioId: scenario.id });
                            }}
                            activeOpacity={0.75}
                            accessibilityRole="button"
                            accessibilityLabel={triLang(lang, {
                              ru: 'Показать, как сказать лучше',
                              uk: 'Показати, як сказати краще',
                              en: 'Show a better way to say it',
                              es: 'Ver cómo decirlo mejor',
                              'pt-BR': 'Ver como dizer melhor',
                              vi: 'Xem cách nói hay hơn',
                              id: 'Lihat cara yang lebih baik',
                              tr: 'Daha iyi söylenişi gör',
                              pl: 'Pokaż lepszą wersję',
                            })}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 5,
                              alignSelf: 'flex-end',
                              marginTop: 6,
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                              borderRadius: 11,
                              backgroundColor: t.goldBg,
                            }}
                            testID={`ai-dialog-fix-button-${i}`}
                          >
                            <Ionicons name="create-outline" size={13} color={t.accentText} />
                            <Text style={{ color: t.accentText, fontSize: f.label, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
                              {triLang(lang, {
                                ru: 'Лучше так', uk: 'Краще так', en: 'Say it better', es: 'Dilo mejor',
                                'pt-BR': 'Diga melhor', vi: 'Nói hay hơn', id: 'Lebih baik', tr: 'Daha iyi', pl: 'Lepiej',
                              })}
                            </Text>
                          </TouchableOpacity>
                        )
                      ) : null}
                    </View>
                  ) : (
                    // Пузырь собеседника — карточка со «светом места»: тон темы +
                    // деликатный тинт сцены сверху, «хвостик» снизу-слева.
                    <View
                      style={{
                        backgroundColor: glassFill(t.bgCard, 0.46),
                        borderRadius: 22,
                        borderBottomLeftRadius: 7,
                        paddingHorizontal: 16,
                        // зачем такой paddingBottom (макет: .bubble{padding:14px 16px}
                        // + .orbits{bottom:-17px}): кнопки лежат абсолютом на кромке
                        // и выступают наружу. Без запаса снизу текст упирался бы в них.
                        paddingTop: 14,
                        paddingBottom: 14,
                        maxWidth: '82%',
                        flexShrink: 1,
                        // зачем НЕ overflow:'hidden' (владелец 2026-09-15, «почему
                        // обрезаны кнопки?»): обрезка резала ровно тот выступ, которым
                        // кнопки сидят на кромке пузыря — на экране от них оставались
                        // половинки. Градиент-подложка ниже скруглена сама, поэтому
                        // обрезка пузырю больше не нужна.
                        position: 'relative',
                        shadowColor: t.shadowDark,
                        shadowOpacity: 0.18,
                        shadowRadius: 6,
                        shadowOffset: { width: 0, height: 2 },
                        ...noAndroidOutline,
                      }}
                    >
                      <LinearGradient
                        pointerEvents="none"
                        colors={[scene.hue + '12', 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0.9, y: 1 }}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          // Скругление на самой подложке: пузырь больше не обрезает
                          // содержимое, поэтому углы держит каждый слой сам.
                          borderRadius: 22,
                          borderBottomLeftRadius: 7,
                        }}
                      />
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, flexShrink: 1 }}>
                        {flipped[i] && translations[i] != null ? (
                          // Перевод на язык интерфейса: обычный текст, без подсветки
                          // ключевых фраз (это другой язык) и без озвучки (TTS — для EN).
                          <Text
                            style={{
                              color: t.textPrimary,
                              fontSize: f.bodyLg,
                              fontWeight: '400',
                              flexShrink: 1,
                              fontStyle: 'italic',
                              lineHeight: Math.round(f.bodyLg * 1.4),
                            }}
                            maxFontSizeMultiplier={1.2}
                          >
                            {translations[i]}
                          </Text>
                        ) : (
                          <>
                            <Text
                              style={{
                                color: t.textPrimary,
                                fontSize: f.bodyLg,
                                fontWeight: '600',
                                // flexShrink (не flex:1): на Android `flex:1` внутри row-обёртки,
                                // вложенной в пузырь с maxWidth без базовой ширины, схлопывал
                                // текст в нулевую ширину — реплика была невидимой, но звук/тап
                                // работали. flexShrink даёт тексту ширину по контенту с переносом.
                                flexShrink: 1,
                                lineHeight: Math.round(f.bodyLg * 1.4),
                              }}
                              maxFontSizeMultiplier={1.2}
                            >
                              {parseKeyPhrases(m.text).map((seg, si) =>
                                seg.isKey ? (
                                  // Ключевая фраза: подсвечена акцентом + тап озвучивает ИМЕННО ЕЁ.
                                  <Text
                                    key={si}
                                    onPress={() => {
                                      if (voiceInputStatus === 'requesting' || voiceInputStatus === 'listening') return;
                                      hapticTap();
                                      void trackEvent('ai_dialog_phrase_tapped', {
                                        scenarioId: scenario.id,
                                        phrase: seg.text.slice(0, 60),
                                      });
                                      speakDialogue(seg.text);
                                    }}
                                    style={{
                                      color: t.accentText,
                                      fontWeight: '800',
                                      textDecorationLine: 'underline',
                                      opacity: strictPlaybackUnavailable ? 0.5 : 1,
                                    }}
                                  >
                                    {seg.text}
                                  </Text>
                                ) : (
                                  // зачем (владелец 2026-08-23): тап по обычному тексту
                                  // озвучивал ВСЮ реплику — «он повторяет не фразу, а
                                  // текст своей реплики». Озвучка осталась только у
                                  // ключевых фраз выше: там звучит именно фраза.
                                  <Text key={si}>{seg.text}</Text>
                                ),
                              )}
                            </Text>
                          </>
                        )}
                      </View>

                      {/* Три круглые кнопки на нижней кромке пузыря: озвучить,
                          перевести, «почему так» (владелец 2026-09-14: «кнопочка
                          озвучит перевести и лампочка… все три обязательно
                          кнопки»). Раньше здесь стояла широкая плашка «Показать
                          перевод» — владелец отверг её как «кашу».
                          Перевод и объяснение уже в кэше экрана (приехали вместе
                          с репликой), поэтому тап открывает их мгновенно. */}
                      {(() => {
                        const isTranslating = translatingIdx === i;
                        const hasTranslation = translations[i] != null;
                        const isFlipped = flipped[i] === true;
                        const coachForMessage = coachByIndex[i];
                        // Перевод упал — вместо ряда кнопок показываем причину и
                        // повтор: молчаливый сбой хуже видимой ошибки.
                        if (translateErrorIdx === i && !hasTranslation && !isTranslating) {
                          return (
                            <TouchableOpacity
                              onPress={() => void toggleTranslation(i, m.text)}
                              disabled={translatingIdx != null}
                              activeOpacity={0.7}
                              accessibilityRole="button"
                              accessibilityLabel={triLang(lang, {
                                ru: 'Не получилось перевести. Перевести снова',
                                uk: 'Не вдалося перекласти. Перекласти знову',
                                en: 'Couldn’t translate. Try again',
                                es: 'No se pudo traducir. Reintentar',
                                'pt-BR': 'Não foi possível traduzir. Tentar de novo',
                                vi: 'Không dịch được. Thử lại',
                                id: 'Gagal menerjemahkan. Coba lagi',
                                tr: 'Çevrilemedi. Tekrar dene',
                                pl: 'Nie udało się przetłumaczyć. Spróbuj ponownie',
                              })}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8, alignSelf: 'flex-end' }}
                            >
                              <Ionicons name="refresh" size={16} color={t.textMuted} />
                              <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700' }}>
                                {triLang(lang, {
                                  ru: 'Не вышло · Перевести снова',
                                  uk: 'Не вийшло · Перекласти знову',
                                  en: 'Failed · Try again',
                                  es: 'Error · Reintentar',
                                  'pt-BR': 'Falhou · Tentar de novo',
                                  vi: 'Lỗi · Thử lại',
                                  id: 'Gagal · Coba lagi',
                                  tr: 'Hata · Tekrar dene',
                                  pl: 'Błąd · Ponów',
                                })}
                              </Text>
                            </TouchableOpacity>
                          );
                        }
                        return (
                          // Обёртки с отступом больше нет: ряд позиционируется
                          // абсолютом внутри пузыря (как `.orbits` в макете),
                          // поэтому любой внешний marginTop только сдвигал бы
                          // его относительно кромки.
                          <>
                            <DialogBubbleActions
                              lang={lang}
                              translationShown={isFlipped}
                              translating={isTranslating}
                              // зачем так широко (владелец 2026-09-15: «почему
                              // подсказка недоступна вообще», «кнопка серая»):
                              // ПЕРВАЯ реплика — приветствие, оно строится
                              // локально (ai_dialog_greeting.ts) и коуч-полей у
                              // него нет и быть не может. Лампочка на ней была
                              // серой всегда, и человек видел мёртвую кнопку с
                              // первого же кадра. Считаем подсказку доступной,
                              // если есть ЧТО показать: объяснение ИЛИ перевод
                              // (он для приветствия предзагружен) — шторка
                              // рисует только непустые секции.
                              hasExplanation={
                                (coachForMessage != null && hasCoachExplanation(coachForMessage))
                                || hasTranslation
                              }
                              explanationOpen={whySheetIndex === i}
                              onSpeak={() => {
                                if (voiceInputStatus === 'requesting' || voiceInputStatus === 'listening') return;
                                void trackEvent('ai_dialog_speak_reply', { scenarioId: scenario.id });
                                speakDialogue(stripMarkers(m.text));
                              }}
                              speakUnavailable={dialogueTarget !== 'en' && (!strictDialogueVoice.available || strictDialogueVoice.loading)}
                              onTranslate={() => void toggleTranslation(i, m.text)}
                              onExplain={() => {
                                void trackEvent('ai_dialog_why_opened', { scenarioId: scenario.id });
                                setWhySheetIndex(i);
                              }}
                              testID={`ai-dialog-actions-${i}`}
                            />
                          </>
                        );
                      })()}
                    </View>
                  )}
                </Animated.View>
              );
            }}
            ListFooterComponent={(sending || Boolean(lastErrorMessage)) ? (
              <>
            {sending && (
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 11,
                    backgroundColor: scene.hue + '26',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 8,
                  }}
                >
                  <Ionicons name={scenario.icon as any} size={15} color={scene.hue} />
                </View>
                {streamingText ? (
                  // Реплика ПЕЧАТАЕТСЯ: пузырь геометрически идентичен финальному
                  // (тот же фон, радиусы, хвостик, градиент сцены и типографика),
                  // поэтому подмена черновика на готовый текст не даёт скачка.
                  // зачем: точки «печатает» держались 3-6 секунд и ощущались как
                  // зависание — теперь слова появляются по мере генерации.
                  <View
                    accessibilityLiveRegion="polite"
                    accessibilityLabel={streamingDisplay}
                    style={{
                      backgroundColor: glassFill(t.bgCard, 0.46),
                      borderRadius: 22,
                      borderBottomLeftRadius: 7,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      maxWidth: '82%',
                      flexShrink: 1,
                      overflow: 'hidden',
                      shadowColor: t.shadowDark,
                      shadowOpacity: 0.18,
                      shadowRadius: 6,
                      shadowOffset: { width: 0, height: 2 },
                      ...noAndroidOutline,
                    }}
                  >
                    <LinearGradient
                      pointerEvents="none"
                      colors={[scene.hue + '12', 'transparent']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0.9, y: 1 }}
                      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                    />
                    <Text
                      style={{
                        color: t.textPrimary,
                        fontSize: f.bodyLg,
                        fontWeight: '400',
                        flexShrink: 1,
                        lineHeight: Math.round(f.bodyLg * 1.4),
                      }}
                      maxFontSizeMultiplier={1.2}
                    >
                      {streamingDisplay}
                    </Text>
                  </View>
                ) : (
                  <AiTypingBubble
                    bubbleColor={t.bgCard}
                    borderColor={'transparent'}
                    dotColor={scene.hue}
                    glowColor={scene.hue + '18'}
                  />
                )}
              </View>
            )}

            {/* Системная плашка ошибки ИИ — НЕ реплика персонажа (без аватара/озвучки),
                по центру, с кнопкой «Повторить» (повторяет последнюю отправку). */}
            {lastErrorMessage && !sending && (
              <View
                style={{
                  alignSelf: 'center',
                  maxWidth: '90%',
                  alignItems: 'center',
                  backgroundColor: glassFill(t.bgSurface, 0.46),
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <Ionicons name="alert-circle-outline" size={16} color={t.textMuted} />
                  <Text
                    style={{ color: t.accentText, fontSize: f.sub, fontWeight: '700', textAlign: 'center' }}
                    maxFontSizeMultiplier={1.2}
                  >
                    {lastErrorMessage}
                  </Text>
                </View>
                {canRetryLastError && (
                  <TouchableOpacity
                    onPress={() => void retryLastSend()}
                    activeOpacity={0.82}
                    accessibilityRole="button"
                    accessibilityLabel={dialogRetryLabel(lang)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 10,
                      borderRadius: 16,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      backgroundColor: t.accent,
                    }}
                  >
                    <Ionicons name="refresh" size={17} color={t.textOnGold} />
                    <Text style={{ color: t.textOnGold, fontWeight: '800', fontSize: f.sub }}>
                      {dialogRetryLabel(lang)}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Финал-вердикт (редизайн 2026-08-23) вынесен из ленты чата в
                полноэкранный DialogVerdictScreen — оверлей ниже по дереву.
                Здесь, в ленте, ЛЮБОЙ конец диалога (терминальный исход ИЛИ
                нейтральное ручное «Завершить») ничего не рисует — единый
                стиль финала вместо двух разных. */}
              </>
            ) : null}
          />

          {/* Стена Free: реплики на сегодня закончились.
              зачем (владелец 2026-09-14, макет, вариант А): карточка встаёт НА
              МЕСТО поля ввода. Разговор виден, разбор доступен бесплатно, место
              сохранено — с новым месяцем поле вернётся само. Не модалка и не выброс на
              пейвол: тот открывается только по явному тапу. */}
          {!ended && !hasPremiumAccess && dailyQuotaGate === 'exhausted' && (
            <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 }}>
              <View
                style={{
                  backgroundColor: glassFill(t.bgCard, 0.46),
                  borderRadius: 20,
                  paddingHorizontal: 18,
                  paddingVertical: 16,
                  gap: 10,
                }}
                testID="ai-dialog-free-wall"
              >
                <Text
                  style={{ color: t.textPrimary, fontSize: f.h3, fontWeight: '700', textAlign: 'center' }}
                  maxFontSizeMultiplier={1.2}
                >
                  {triLang(lang, {
                    ru: 'Ответы месяца закончились',
                    uk: 'Відповіді місяця закінчилися',
                    en: "This month's replies are used up",
                    es: 'Se acabaron las respuestas del mes',
                    'pt-BR': 'As respostas do mês acabaram',
                    vi: 'Đã hết lượt trả lời tháng này',
                    id: 'Balasan bulan ini habis',
                    tr: 'Bu ayın yanıtları bitti',
                    pl: 'Odpowiedzi w tym miesiącu się skończyły',
                  })}
                </Text>
                <Text
                  style={{
                    color: t.accentText,
                    fontSize: f.body,
                    textAlign: 'center',
                    lineHeight: Math.round(f.body * 1.42),
                  }}
                  maxFontSizeMultiplier={1.2}
                >
                  {/* D111: лимит месячный — «завтра» было бы ложью. Дата сброса
                      только серверная; неизвестна — говорим «в следующем месяце». */}
                  {quotaResetDate ? triLang(lang, {
                    ru: `Новые ${dailyQuotaLimit} — ${quotaResetDate}. Разговор сохранён: вернёшься на это же место.`,
                    uk: `Нові ${dailyQuotaLimit} — ${quotaResetDate}. Розмову збережено: повернешся на це саме місце.`,
                    en: `${dailyQuotaLimit} new replies on ${quotaResetDate}. The conversation is saved: you'll come back to this spot.`,
                    es: `${dailyQuotaLimit} respuestas nuevas el ${quotaResetDate}. La conversación está guardada: volverás a este punto.`,
                    'pt-BR': `${dailyQuotaLimit} respostas novas em ${quotaResetDate}. A conversa está salva: você volta neste ponto.`,
                    vi: `${dailyQuotaLimit} lượt mới vào ${quotaResetDate}. Cuộc trò chuyện đã được lưu: bạn sẽ quay lại đúng chỗ này.`,
                    id: `${dailyQuotaLimit} balasan baru pada ${quotaResetDate}. Percakapan tersimpan: kamu kembali ke titik ini.`,
                    tr: `${quotaResetDate} tarihinde ${dailyQuotaLimit} yeni yanıt. Sohbet kaydedildi: aynı yerden devam edersin.`,
                    pl: `${dailyQuotaLimit} nowych odpowiedzi ${quotaResetDate}. Rozmowa jest zapisana: wrócisz w to samo miejsce.`,
                  }) : triLang(lang, {
                    ru: `В следующем месяце снова ${dailyQuotaLimit}. Разговор сохранён: вернёшься на это же место.`,
                    uk: `Наступного місяця знову ${dailyQuotaLimit}. Розмову збережено: повернешся на це саме місце.`,
                    en: `${dailyQuotaLimit} again next month. The conversation is saved: you'll come back to this spot.`,
                    es: `El mes que viene, otra vez ${dailyQuotaLimit}. La conversación está guardada: volverás a este punto.`,
                    'pt-BR': `No mês que vem, de novo ${dailyQuotaLimit}. A conversa está salva: você volta neste ponto.`,
                    vi: `Tháng sau lại có ${dailyQuotaLimit} lượt. Cuộc trò chuyện đã được lưu: bạn sẽ quay lại đúng chỗ này.`,
                    id: `Bulan depan dapat ${dailyQuotaLimit} lagi. Percakapan tersimpan: kamu kembali ke titik ini.`,
                    tr: `Gelecek ay yine ${dailyQuotaLimit}. Sohbet kaydedildi: aynı yerden devam edersin.`,
                    pl: `W przyszłym miesiącu znowu ${dailyQuotaLimit}. Rozmowa jest zapisana: wrócisz w to samo miejsce.`,
                  })}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  {userExchanges > 0 ? (
                    <TouchableOpacity
                      onPress={finishDialog}
                      activeOpacity={0.86}
                      accessibilityRole="button"
                      accessibilityLabel={triLang(lang, {
                        ru: 'Посмотреть разбор', uk: 'Переглянути розбір', en: 'See the breakdown',
                        es: 'Ver el análisis', 'pt-BR': 'Ver a análise', vi: 'Xem phân tích',
                        id: 'Lihat ulasan', tr: 'Analizi gör', pl: 'Zobacz analizę',
                      })}
                      style={{
                        flex: 1,
                        minHeight: 50,
                        borderRadius: 16,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: t.bgSurface2,
                      }}
                    >
                      <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
                        {triLang(lang, {
                          ru: 'Разбор', uk: 'Розбір', en: 'Breakdown', es: 'Análisis', 'pt-BR': 'Análise',
                          vi: 'Phân tích', id: 'Ulasan', tr: 'Analiz', pl: 'Analiza',
                        })}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    onPress={openDialogPaywall}
                    activeOpacity={0.86}
                    accessibilityRole="button"
                    accessibilityLabel={triLang(lang, {
                      ru: 'Открыть Plus: разговоры без месячного лимита',
                      uk: 'Відкрити Plus: розмови без місячного ліміту',
                      en: 'Open Plus: conversations without a monthly limit',
                      es: 'Abrir Plus: conversaciones sin límite mensual',
                      'pt-BR': 'Abrir Plus: conversas sem limite mensal',
                      vi: 'Mở Plus: trò chuyện không giới hạn mỗi tháng',
                      id: 'Buka Plus: percakapan tanpa batas bulanan',
                      tr: 'Plus’ı aç: aylık limitsiz sohbet',
                      pl: 'Otwórz Plus: rozmowy bez miesięcznego limitu',
                    })}
                    style={{
                      flex: 1,
                      minHeight: 50,
                      borderRadius: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 7,
                      backgroundColor: t.gold,
                    }}
                  >
                    <Ionicons name="sparkles" size={18} color={t.textOnGold} />
                    <Text style={{ color: t.textOnGold, fontSize: f.body, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
                      Plus
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Поле ввода — пилюля + круглая кнопка отправки */}
          {!ended && !(!hasPremiumAccess && dailyQuotaGate === 'exhausted') && (
            <View
              style={{
                paddingHorizontal: 12,
                paddingTop: 8,
                paddingBottom: 12,
                // зачем БЕЗ своего фона (владелец 2026-09-15, «убери полоску
                // эту»): плотная подложка гасила подтёк, но сама читалась как
                // горизонтальная полоса поперёк экрана — стало хуже, чем было.
                // Фон остаётся общим, ровным на всю высоту.
              }}
            >
              {/* ⛔ СТРОКИ-ПОМОЩНИКА СО ВСТАВНЫМИ ФРАЗАМИ ЗДЕСЬ БОЛЬШЕ НЕТ
                  (владелец 2026-09-17: «убери вот эти подсказки типа конкретные
                  фразы которые можно нажать и они вставятся в поле ввода… а вот
                  эта кнопка "как сказать" убери»).

                  зачем: подсказка — это САМА ЛАМПОЧКА, а не список готовых
                  реплик под полем ввода. Вставлять за человека его же реплику
                  значит учить нажимать, а не говорить. Вместе со строкой ушёл и
                  чип «Как сказать…», который жил только в ней.

                  Что осталось вместо: лампочка в шапке (3 бесплатных подсказки
                  в день, дальше 80 рун) и кнопка «лучше так» под СВОЕЙ репликой,
                  показывающая исправленный вариант — она бесплатна всегда. */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
              {/* зачем (владелец 2026-09-14, приёмка макета): «микрофон слева,
                  кнопка отправить справа, посередине поле ввода — очень нравится
                  вот так». Порядок элементов строки ввода задан этим решением. */}
              <TouchableOpacity
                // Единый контракт голосового ввода: press-in старт, press-out стоп.
                onPressIn={handleMicPressIn}
                onPressOut={handleMicPressOut}
                disabled={sending || voiceInputStatus === 'finishing'}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityState={{
                  disabled: sending || voiceInputStatus === 'finishing',
                  busy: voiceInputStatus === 'requesting' || voiceInputStatus === 'finishing',
                }}
                accessibilityLabel={
                  speechNa ? speechUnavailableOnDeviceText(lang) : triLang(lang, {
                        ru: 'Зажми и говори',
                        uk: 'Затисни і говори',
                        en: 'Hold and speak',
                        es: 'Mantén pulsado y habla',
                        'pt-BR': 'Segure e fale',
                        vi: 'Giữ và nói',
                        id: 'Tahan dan bicara',
                        tr: 'Basılı tut ve konuş',
                        pl: 'Przytrzymaj i mów',
                      })
                }
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: voiceInputStatus === 'listening' ? t.accent : t.bgSurface,
                  borderWidth: 0,
                  borderColor: 'transparent',
                  opacity: sending || voiceInputStatus === 'finishing' || speechNa ? 0.55 : 1,
                  position: 'relative',
                }}
              >
                {voiceInputStatus === 'requesting' || voiceInputStatus === 'finishing' ? (
                  // спиннер встаёт ровно на место иконки (оба по центру круга)
                  <ActivityIndicator size="small" color={t.accentText} />
                ) : (
                  <Ionicons
                    name={speechNa ? 'mic-off-outline' : voiceInputStatus === 'listening' ? 'mic' : 'mic-outline'}
                    size={21}
                    color={voiceInputStatus === 'listening' ? t.textOnGold : t.accentText}
                  />
                )}
                {/* зачем (владелец 15.10, D196): цифра остатка общего дневного счётчика на микрофоне поля ввода (пилюля 22, как .rbtn макета); 0 — «PLUS»; у Plus цифры нет.
                    Значок лежит абсолютом поверх круга 44×44 — строка ввода, поле и кнопка отправки не двигаются ни в одном состоянии. */}
                {!speechNa ? <MicAllowanceBadge size="sm" testID="ai-dialog-voice-allowance" /> : null}
              </TouchableOpacity>
              <TextInput
                value={input}
                onChangeText={(v) => {
                  setInput(v);
                  if (lastErrorMessage) {
                    setLastErrorMessage('');
                    setLastErrorKind(null);
                  }
                }}
                // Текст поля — как в макете (`composer()`): он же и заменяет
                // снятую подпись про микрофон.
                placeholder={speechNa ? triLang(lang, {
                  ru: 'Напиши ответ',
                  uk: 'Напиши відповідь',
                  en: 'Type your reply',
                  es: 'Escribe tu respuesta',
                  'pt-BR': 'Escreva sua resposta',
                  vi: 'Nhập câu trả lời',
                  id: 'Tulis jawabanmu',
                  tr: 'Cevabını yaz',
                  pl: 'Napisz odpowiedź',
                }) : triLang(lang, {
                  ru: 'Напиши или зажми микрофон',
                  uk: 'Напиши або затисни мікрофон',
                  en: 'Type or hold the mic',
                  es: 'Escribe o mantén el micro',
                  'pt-BR': 'Escreva ou segure o microfone',
                  vi: 'Viết hoặc giữ micrô',
                  id: 'Tulis atau tahan mikrofon',
                  tr: 'Yaz ya da mikrofonu basılı tut',
                  pl: 'Napisz lub przytrzymaj mikrofon',
                })}
                placeholderTextColor={t.textMuted}
                editable={!sending && !voiceInputBusy}
                multiline
                // iOS: Enter = «Отправить» (returnKeyType), blurOnSubmit=false держит
                // клавиатуру открытой после отправки. Android multiline трактует Enter
                // как перенос строки (поведение мессенджера) — там отправка кнопкой-стрелкой.
                returnKeyType="send"
                blurOnSubmit={false}
                onSubmitEditing={() => send(input)}
                style={{
                  flex: 1,
                  backgroundColor: glassFill(t.bgCard, 0.46),
                  borderRadius: 22,
                  paddingHorizontal: 18,
                  paddingVertical: Platform.OS === 'ios' ? 12 : 8,
                  color: t.textPrimary,
                  fontSize: f.body,
                  maxHeight: 120,
                }}
                maxFontSizeMultiplier={1.2}
              />
              <TouchableOpacity
                onPress={() => send(input)}
                disabled={!canSend}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel={triLang(lang, {
                  ru: 'Отправить',
                  uk: 'Надіслати',
                  en: 'Send',
                  es: 'Enviar',
                  'pt-BR': 'Enviar',
                  vi: 'Gửi',
                  id: 'Kirim',
                  tr: 'Gönder',
                  pl: 'Wyślij',
                })}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: canSend ? t.accent : t.bgSurface,
                  opacity: canSend ? 1 : 0.5,
                  shadowColor: t.shadowDark,
                  shadowOpacity: canSend ? 0.3 : 0,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: canSend ? 3 : 0,
                }}
              >
                <Ionicons
                  name="arrow-up"
                  size={22}
                  color={canSend ? t.textOnGold : t.textMuted}
                />
              </TouchableOpacity>
              </View>
              {voiceInputHint ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 6, paddingHorizontal: 6 }}>
                  <Text
                    style={{
                      color: voiceInputStatus === 'listening' ? t.accentText : t.textMuted,
                      fontSize: f.sub,
                      fontWeight: '800',
                    }}
                    maxFontSizeMultiplier={1.1}
                  >
                    {voiceInputHint}
                  </Text>
                  {voiceInputStatus === 'denied' ? (
                    <TouchableOpacity
                      accessibilityRole="button"
                      onPress={() => {
                        hapticTap();
                        Linking.openSettings().catch(noteSwallowedHandler('ai_dialog_session:AiDialogSession.openSettings'));
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={{ color: t.accentText, fontSize: f.sub, fontWeight: '800' }}>
                        {triLang(lang, {
                          ru: 'Открыть настройки',
                          uk: 'Відкрити налаштування',
                          en: 'Open settings',
                          es: 'Abrir ajustes',
                          'pt-BR': 'Abrir ajustes',
                          vi: 'Mở cài đặt',
                          id: 'Buka pengaturan',
                          tr: 'Ayarları aç',
                          pl: 'Otwórz ustawienia',
                        })}
                      </Text>
                    </TouchableOpacity>
                  ) : voiceInputStatus === 'error' || voiceInputStatus === 'stalled' ? (
                    <TouchableOpacity
                      accessibilityRole="button"
                      onPress={() => void startVoiceInput()}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={{ color: t.accentText, fontSize: f.sub, fontWeight: '800' }}>
                        {triLang(lang, {
                          ru: 'Повторить',
                          uk: 'Повторити',
                          en: 'Retry',
                          es: 'Reintentar',
                          'pt-BR': 'Tentar de novo',
                          vi: 'Thử lại',
                          id: 'Coba lagi',
                          tr: 'Tekrar dene',
                          pl: 'Ponów',
                        })}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}
            </View>
          )}
        </KeyboardAvoidingView>

        {/* Прозрачный слой «дочитываю финальную реплику».
            зачем (владелец 2026-09-17): пауза перед вердиктом не должна быть
            тюрьмой — кто прочитал быстрее, тапает и идёт к итогу. Слой живёт
            ровно эти секунды, ввод в это время и так заблокирован (ended), так
            что перехватывать ему нечего. Без видимой кнопки: подпись-инструкция
            на экране-празднике смотрелась бы шумом.

            зачем top: HEADER_SAFE_TOP, а не absoluteFill (аудит 2026-09-17):
            слой во весь экран накрывал и шапку — кнопка «Назад» на эти три
            секунды переставала нажиматься, то есть выйти из окончённого
            диалога было нельзя. Шапку оставляем живой. */}
        {ended && !verdictReady && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, {
              ru: 'Показать итог диалога',
              uk: 'Показати підсумок діалогу',
              en: 'Show the dialogue summary',
              es: 'Ver el resumen del diálogo',
              'pt-BR': 'Ver o resumo do diálogo',
              vi: 'Xem tóm tắt hội thoại',
              id: 'Lihat ringkasan dialog',
              tr: 'Diyalog özetini göster',
              pl: 'Pokaż podsumowanie dialogu',
            })}
            onPress={() => setVerdictReady(true)}
            style={{ position: 'absolute', top: VERDICT_SKIP_LAYER_TOP, left: 0, right: 0, bottom: 0 }}
          />
        )}

        {/* Полноэкранный финал-вердикт (редизайн 2026-08-23): исход, настроение,
            цели, реакция персонажа и разбор — отдельным «экраном-праздником».
            Переписка остаётся под ним: «Показать переписку» прячет оверлей.
            зачем (аудит 2026-08-23): companion-диалоги без целей и ручное
            «Завершить» без исхода раньше рисовали свой, более бедный финал
            прямо в ленте чата — второй стиль экрана конца диалога. Теперь это
            тот же экран с neutralClosing (нейтральный тон, без хайфайва). */}
        {/* зачем verdictReady (владелец 2026-09-17): вердикт больше не
            выпрыгивает в том же кадре, что финальная реплика — он ждёт
            VERDICT_DELAY_MS, пока её прочитают, либо тапа по ленте. */}
        {ended && verdictReady && !verdictHidden && (
          <DialogVerdictScreen
            outcome={outcome}
            lang={lang}
            moodFace={moodToFace(mood)}
            scene={scene}
            scenarioIcon={scenario.icon}
            scenarioTitle={presentation?.title ?? ''}
            personaName={personaName}
            characterReaction={characterReaction}
            objectives={objectives}
            objectivesMet={objectivesMet}
            coachTips={coachTips}
            review={review}
            reviewStatus={reviewStatus}
            locked={!hasPremiumAccess}
            neutralClosing={
              gameEnabled && isTerminalOutcome(outcome)
                ? undefined
                : { userExchanges, recommendedExchanges: RECOMMENDED_EXCHANGES }
            }
            onRetry={() => {
              hapticTap();
              void trackEvent('ai_dialog_retry_scenario', { scenarioId: scenario.id, outcome });
              const runId = makeFeedbackAttemptId();
              // Перезапуск того же сценария «вместо» текущего экрана — свап, не push.
              markNextNavigationAsReplace();
              router.replace({
                pathname: '/ai_dialog_session',
                params: { scenarioId: scenario.id, lessonId: params.lessonId, runId },
              } as never);
            }}
            onExit={onBack}
            onShowChat={() => {
              hapticTap();
              setVerdictHidden(true);
            }}
            onOpenPlus={() => {
              if (!accessResolved) return;
              hapticTap();
              void trackEvent('paywall_shown', { context: 'dialog_analysis', source: 'dialog_analysis' });
              router.push({
                pathname: '/premium_modal',
                params: { context: 'dialog_analysis', source: 'dialog_analysis' },
              } as never);
            }}
            feedbackSlot={showDialogFeedback ? (
              <FeedbackRatingCard
                kind="dialogue"
                entityId={`${sessionKey}:dialogue:${scenario.id}`}
                entityLabel={presentation?.title ?? ''}
                lang={lang}
                title={triLang(lang, { ru: 'Похоже на живой разговор?', en: 'Did that feel like a real conversation?', uk: 'Схоже на живу розмову?', es: '¿Pareció una conversación real?',
                  'pt-BR': 'Pareceu uma conversa de verdade?', vi: 'Có giống một cuộc trò chuyện thật không?',
                  id: 'Terasa seperti percakapan nyata?', tr: 'Gerçek bir sohbet gibi miydi?', pl: 'Czy to brzmiało jak żywa rozmowa?',
                })}
                placeholder={triLang(lang, { ru: 'Где собеседник звучал странно?', en: 'Where did your partner sound off?', uk: 'Де співрозмовник звучав дивно?', es: '¿Dónde sonó raro tu interlocutor?',
                  'pt-BR': 'Onde o interlocutor soou estranho?', vi: 'Người trò chuyện nghe kỳ ở chỗ nào?',
                  id: 'Di mana lawan bicara terdengar aneh?', tr: 'Karşındaki nerede tuhaf konuştu?', pl: 'Gdzie rozmówca brzmiał dziwnie?',
                })}
                sendLabel={triLang(lang, { ru: 'Отправить', en: 'Send', uk: 'Надіслати', es: 'Enviar', 'pt-BR': 'Enviar',
                  vi: 'Gửi', id: 'Kirim', tr: 'Gönder', pl: 'Wyślij',
                })}
                thanksLabel={triLang(lang, { ru: 'Спасибо! Отзыв отправлен', en: 'Thanks! Feedback sent', uk: 'Дякуємо! Відгук надіслано', es: '¡Gracias! Comentario enviado',
                  'pt-BR': 'Obrigado! Comentário enviado', vi: 'Cảm ơn! Đã gửi phản hồi',
                  id: 'Terima kasih! Masukan terkirim', tr: 'Teşekkürler! Geri bildirim gönderildi', pl: 'Dziękujemy! Opinia wysłana',
                })}
                ratingA11yLabel={triLang(lang, { ru: 'Оценка', en: 'Rating', uk: 'Оцінка', es: 'Valoración', 'pt-BR': 'Avaliação',
                  vi: 'Đánh giá', id: 'Penilaian', tr: 'Puan', pl: 'Ocena',
                })}
                testID="dialog-verdict-feedback"
              />
            ) : undefined}
          />
        )}

        {/* Пилюля «Итоги»: вернуться к финалу, пока читаешь переписку. */}
        {ended && verdictHidden && (
          <View
            pointerEvents="box-none"
            style={{ position: 'absolute', left: 0, right: 0, bottom: 22, alignItems: 'center' }}
          >
            <TouchableOpacity
              onPress={() => {
                hapticTap();
                setVerdictHidden(false);
              }}
              activeOpacity={0.86}
              accessibilityRole="button"
              accessibilityLabel={triLang(lang, {
                ru: 'Показать итоги диалога',
                uk: 'Показати підсумки діалогу',
                en: 'Show dialogue summary',
                es: 'Mostrar el resumen del diálogo',
                'pt-BR': 'Mostrar o resumo do diálogo',
                vi: 'Hiện kết quả hội thoại',
                id: 'Tampilkan hasil dialog',
                tr: 'Diyalog özetini göster',
                pl: 'Pokaż wyniki dialogu',
              })}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 7,
                backgroundColor: t.accent,
                borderRadius: 22,
                paddingHorizontal: 18,
                minHeight: 44,
                shadowColor: t.accent,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35,
                shadowRadius: 10,
                ...noAndroidOutline,
              }}
            >
              <Ionicons name="podium-outline" size={17} color={t.textOnGold} />
              <Text style={{ color: t.textOnGold, fontSize: f.sub, fontWeight: '700' }}>
                {triLang(lang, {
                  ru: 'Итоги',
                  uk: 'Підсумки',
                  en: 'Summary',
                  es: 'Resumen',
                  'pt-BR': 'Resumo',
                  vi: 'Kết quả',
                  id: 'Hasil',
                  tr: 'Özet',
                  pl: 'Wyniki',
                })}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
      {/* Шторка «Почему так»: выезжает снизу, содержимое готово заранее
          (приехало вместе с репликой) — ни генерации, ни спиннера. */}
      {/* зачем условие «коуч ИЛИ перевод» (найдено на эмуляторе 2026-09-17):
          раньше стояло только `coachByIndex[whySheetIndex]`, и у ПРИВЕТСТВЕННОЙ
          реплики шторка не рисовалась вообще — коуч-полей у неё нет, она
          строится локально. Лампочка при этом была активной (перевод для
          приветствия предзагружен), тап проходил, whySheetIndex ставился —
          и НИЧЕГО не происходило. Мёртвая кнопка на первой же реплике диалога.
          Комментарий ниже уже подмешивал перевод в coach, но условие рендера
          выше сводило это на ноль. Открываем, если есть ЧТО показать. */}
      {whySheetIndex != null && (coachByIndex[whySheetIndex] || translations[whySheetIndex]) ? (
        <DialogWhySheet
          visible
          onClose={() => setWhySheetIndex(null)}
          lang={lang}
          quote={stripMarkers(messages[whySheetIndex]?.text ?? '')}
          // зачем склейка (владелец 2026-09-15): у приветствия коуч-полей нет —
          // оно строится локально. Но перевод для него уже предзагружен в
          // общий кэш переводов. Подмешиваем его, чтобы шторка не открывалась
          // пустой: секции в ней условные, покажется ровно то, что есть.
          coach={{
            ...(coachByIndex[whySheetIndex] ?? EMPTY_COACH),
            translation:
              coachByIndex[whySheetIndex]?.translation
              || translations[whySheetIndex]
              || '',
          }}
          // ⛔ ГОТОВЫХ ОТВЕТОВ со вставкой в поле ввода здесь нет — их владелец
          // отменил 2026-09-17. А вот ПЛАТНОСТЬ самой шторки он подтвердил
          // 2026-09-18: «я говорил про вот эту кнопку „почему так“ — она
          // 3 бесплатно в день». Поэтому замок остаётся, а вставка — нет.
          gate={{
            revealed: hintRevealedFor.has(whySheetIndex),
            freeLeft: hintsLeftToday,
            freePerDay: FREE_DIALOG_HINTS_PER_DAY,
            priceRunes: DIALOG_HINT_PRICE_RUNES,
            denied: hintDenied,
            onUnlock: () => buyHint(whySheetIndex),
          }}
          testID="ai-dialog-why-sheet"
        />
      ) : null}

      {/* зачем шторки «Как сказать…» здесь БОЛЬШЕ НЕТ (владелец 2026-09-17:
          «а вот эта кнопка "как сказать" убери»): единственный вход в неё жил в
          удалённой строке-помощнике, то есть шторка стала недостижимой. Роль
          подсказки целиком забрала лампочка. Сам компонент
          components/dialogs/DialogHowToSaySheet.tsx НЕ удалён — решение о
          судьбе фичи за владельцем, а мёртвый импорт хуже мёртвого файла. */}

      {/* Подсказка «что сделать дальше» — ПОКАЗЫВАЕМ, не вставляем.
          Текст на языке интерфейса: это инструкция автора сценария, поэтому в
          поле ввода ей не место (владелец 2026-09-17: «вставляет русский текст,
          что за дичь»). Простой Modal, а не шторка: одна фраза, тянуть сюда
          жесты и каркас ради неё незачем. */}
      {/* [HINT-GLASS-START] Liquid Glass (макет C5): окно вынесено в DialogHintModal,
          закрытие тапом по фону, текст — шаг сценария (бесплатно, без сети). */}
      <DialogHintModal
        visible={hintOpen}
        onClose={() => setHintOpen(false)}
        lang={lang}
        hint={presentation?.hint ?? ''}
        testID="ai-dialog-hint-modal"
      />
      {/* [HINT-GLASS-END] */}

      {/* Все задания диалога: открывается тапом по строке целей в шапке. */}
      <DialogGoalsSheet
        visible={goalsOpen}
        onClose={() => setGoalsOpen(false)}
        lang={lang}
        objectives={objectives}
        objectivesMet={objectivesMet}
        testID="ai-dialog-goals"
      />

    </ScreenGradient>
  );
}

// зачем: явное согласие на AI-диалоги (владелец) — экран даже не монтируется,
// пока пользователь не подтвердил, что его сообщения уйдут в OpenAI. Gate живёт
// снаружи, а не внутри компонента: внутри несколько точек отправки (send/retry),
// одна внешняя точка входа надёжнее.
export default function AiDialogSessionRoute() {
  const { studyTarget } = useStudyTarget();
  // зачем (аудит 2026-08-23): «Ещё раз» в полноэкранном финале делает
  // router.replace на тот же маршрут с новым/тем же scenarioId — expo-router
  // переиспользует уже смонтированный компонент, а весь игровой state
  // (mood/objectivesMet/outcome/ended/verdictHidden/messages/…)
  // объявлен через useState без привязки к scenario.id и ничем не сбрасывался.
  // Итог: после «Ещё раз» экран мог тут же показать старый вердикт или чужое
  // настроение. key=scenarioId форсирует полный ремаунт — самый безопасный
  // фикс, без риска гонок между десятком независимых стейтов/эффектов.
  const params = useLocalSearchParams<{ scenarioId?: string; lessonId?: string; runId?: string }>();
  const sessionKey = `${studyTarget}:${params.scenarioId ?? ''}:${params.lessonId ?? ''}:${params.runId ?? ''}`;
  const scenario = resolveDialogueRouteScenario(params, studyTarget, buildLessonDialogScenario);
  // зачем (R56): сиротский экран — в стор-сборке вход по ссылке уводит на Главную (без энергии и квоты новых Диалогов)
  const orphanBlocked = useOrphanDialogRouteRedirect('ai_dialog_session');
  if (orphanBlocked) return null;
  if (!scenario) return <MissingDialogueScreen />;
  return (
    <AiDialogConsentGate>
      <AiDialogSession key={sessionKey} scenario={scenario} />
    </AiDialogConsentGate>
  );
}
