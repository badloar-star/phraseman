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
  Modal,
  Platform,
  Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../components/ThemeContext';
import { usePremium, useFeatureAccess } from '../components/PremiumContext';
import { useEnergy, useEnergySessionIntent } from '../components/EnergyContext';
import NoEnergyModal from '../components/NoEnergyModal';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import ScreenGradient from '../components/ScreenGradient';
import { glassFill } from '../components/GlassSurface';
import ReportErrorButton from '../components/ReportErrorButton';
import AiTypingBubble from '../components/AiTypingBubble';
import SpeakingQuotaDots from '../components/SpeakingQuotaDots';
import DialogQuotaBadge from '../components/DialogQuotaBadge';
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
import { REVENUE_DAILY_LIMITS } from './revenue_daily_limits';
import {
  buyDialogExtraRepliesLocally,
  makeDialogExtraRepliesRequestId,
  requireDialogExtraRepliesProviderReady,
  syncDialogExtraRepliesPurchase,
  DIALOG_EXTRA_REPLIES_COUNT,
  DIALOG_EXTRA_REPLIES_PRICE_RUNES,
} from './ai_dialog_extra_replies_client';
import { readUnifiedLevelSpinStars } from './level_spin_star_grants';
import {
  buyDialogHintLocally,
  getDialogHintsLeftToday,
  markDialogHintUsed,
  DIALOG_HINT_PRICE_RUNES,
  FREE_DIALOG_HINTS_PER_DAY,
} from './ai_dialog_hint_economy';
import { useSpeakingAttemptGate } from '../hooks/useSpeakingAttemptGate';
import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back';
import { settleDialogEnergyStart, useMountedInstanceRef } from './ai_dialog_energy_settlement';
import { registerXP } from './xp_manager';
import { MAX_DIALOG_XP } from './config';
import { outcomeXpMultiplier } from './dialog_outcome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { aiDialogContentAvailableForTarget, aiDialogTargetGateCopy } from './ai_dialog_target_gate';
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
import { isSpeakingEnabled } from './remote_flags';
import { buildSpeakingStartOptions } from './speaking_recognition_options';
import { TranscriptAccumulator } from './speaking_transcript_accumulator';
import { useRecordStartCue } from '../hooks/use-record-start-cue';
import AiDialogConsentGate from './ai_dialog_consent_gate';

import { noAndroidOutline } from '../constants/androidGlow';
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
  };
}

interface UiMessage {
  role: 'user' | 'assistant';
  text: string;
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
  // зачем тип number явно: REVENUE_DAILY_LIMITS заморожен `as const`, и без
  // аннотации состояние сужалось до литерала 10 — серверный лимит (сервер
  // авторитетен и может дать другое число) в него не записывался вообще.
  const [dailyQuotaLimit, setDailyQuotaLimit] = useState<number>(REVENUE_DAILY_LIMITS.ai_dialog_replies);
  const accountStableId = captureAccountGeneration().stableId;
  const voiceInputGate = useSpeakingAttemptGate({ context: 'ai_voice_input', source: 'ai_dialog_voice_input' });
  const router = useRouter();
  const aiDialogGateOpen = aiDialogContentAvailableForTarget(studyTarget);
  const dialogueTarget = resolveDialogueStudyTarget(studyTarget);
  const dialogueSpeechLocale = dialogueTarget ? dialogueLanguageMeta(dialogueTarget).speechLocale : null;
  const frenchGateCopy = aiDialogTargetGateCopy(lang, studyTarget);
  // Вход в диалог = 20 ⚡: платим за старт активности.
  //
  // зачем ЗДЕСЬ, а не только на брифинге: брифинг показывается лишь при ПЕРВОМ
  // прохождении сценария (hasSeenAiDialogIntro в DialogsTabContent), дальше
  // человек попадает прямо сюда — и до аудита 2026-08-23 все повторные диалоги
  // были бесплатными. Диалог — самая дорогая активность (LLM + TTS), так что
  // это был и обход экономики, и прямые деньги. Гейт в самой сессии закрывает
  // заодно и прямые ссылки на /ai_dialog_session.
  //
  // Латч живёт на монтирование: родительский маршрут даёт key=scenarioId, то
  // есть на каждый новый диалог компонент пересоздаётся и платится честно.
  const { confirmSpendOne: confirmDialogEnergy, acknowledgeSessionStart, energyReady: dialogEnergyReady } = useEnergy();
  const dialogEnergyIntent = useEnergySessionIntent('ai_dialog', 'direct', feedbackAttemptId);
  const [dialogNoEnergy, setDialogNoEnergy] = useState(false);
  const dialogEntryChargedRef = useRef(false);
  const mountedInstanceRef = useMountedInstanceRef();

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
  const speechModule = useMemo(() => (isSpeakingEnabled() ? loadSpeechRecognitionModule() : null), []);
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
    // energyReady обязателен: до первого чтения из хранилища контекст отдаёт
    // placeholder (isUnlimited=false, energy=MAX) — списали бы у подписчика.
    if (!dialogueRuntimeOpen || !dialogEnergyReady || dialogEntryChargedRef.current) return;
    dialogEntryChargedRef.current = true;
    void confirmDialogEnergy(dialogEnergyIntent).then((result) => {
      settleDialogEnergyStart({
        result,
        mounted: mountedInstanceRef.current,
        acknowledge: () => { void acknowledgeSessionStart(dialogEnergyIntent.operationId); },
        showNoEnergy: () => setDialogNoEnergy(true),
        navigateBack: () => safeRouterBack(router, '/(tabs)/home' as any),
      });
    });
  }, [acknowledgeSessionStart, confirmDialogEnergy, dialogEnergyIntent, dialogEnergyReady, dialogueRuntimeOpen, mountedInstanceRef, router]);

  useEffect(() => {
    if (!accessResolved || !dialogueRuntimeOpen) return;
    // зачем (владелец 2026-09-17): если покупка +10 реплик состоялась локально,
    // но фоновая отправка на сервер не успела завершиться (приложение убито,
    // сеть пропала) — досинхронизируем при каждом новом входе в диалог. Иначе
    // extraCapToday на сервере не вырастет, и следующая реплика получит отказ
    // квоты, хотя руны уже честно списаны на телефоне.
    void syncDialogExtraRepliesPurchase(captureAccountGeneration(), studyTarget);
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
   * Сервер ответил «дневной лимит исчерпан».
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
    setDailyQuotaGate('exhausted');
    void trackEvent('ai_dialog_limit_hit', { scenarioId: scenario.id, reason: 'daily_limit' });
    DebugLogger.info('[DIALOG-WALL] daily limit reached', JSON.stringify({
      scenarioId: scenario.id,
      stableId: accountStableId,
    }));
  }, [accountStableId, scenario.id, studyTarget]);

  /**
   * Докупка +10 реплик за 300 рун (владелец, 2026-09-17). Баланс читается
   * только чтобы решить, показывать кнопку активной или бледной — сама
   * покупка внутри buyDialogExtraRepliesLocally перечитывает актуальное
   * значение под локом, так что устаревшее число здесь не может списать лишнее.
   */
  const [runesBalanceForBuy, setRunesBalanceForBuy] = useState<number | null>(null);
  useEffect(() => {
    if (dailyQuotaGate !== 'exhausted' || hasPremiumAccess) return;
    let cancelled = false;
    const token = captureAccountGeneration();
    void readUnifiedLevelSpinStars(token).then(({ balance }) => {
      if (!cancelled) setRunesBalanceForBuy(balance);
    });
    return () => { cancelled = true; };
  }, [dailyQuotaGate, hasPremiumAccess]);

  const buyingExtraRepliesRef = useRef(false);
  const [buyingExtraReplies, setBuyingExtraReplies] = useState(false);
  const handleBuyExtraReplies = useCallback(() => {
    // Защита от двойного тапа: второй тап до завершения первого игнорируется,
    // а не ставится в очередь — повторная покупка не то, чего ждёт человек
    // от одного тапа по одной и той же кнопке.
    if (buyingExtraRepliesRef.current) return;
    buyingExtraRepliesRef.current = true;
    setBuyingExtraReplies(true);
    const token = captureAccountGeneration();
    const requestId = makeDialogExtraRepliesRequestId();
    void (async () => {
      try {
        const result = await buyDialogExtraRepliesLocally(token, requestId);
        if (!result.ok) {
          DebugLogger.info('[DIALOG-EXTRA-REPLIES] purchase declined', JSON.stringify({ reason: result.reason }));
          if (result.reason === 'insufficient_runes') setRunesBalanceForBuy(0);
          return;
        }
        // Мгновенно, в том же кадре: открываем поле ввода на +10 реплик и
        // показываем списанный баланс — сеть в это решение не входит.
        setRunesBalanceForBuy(result.balance);
        setDailyQuotaRemaining((prev) => (prev ?? 0) + result.repliesGranted);
        setDailyQuotaGate('open');
        void trackEvent('ai_dialog_extra_replies_bought', { scenarioId: scenario.id });
        void syncDialogExtraRepliesPurchase(token, studyTarget);
      } catch (error) {
        DebugLogger.error(
          'ai_dialog_session:buy_extra_replies_failed',
          error instanceof Error ? error : new Error(String(error)),
          'warning',
        );
      } finally {
        buyingExtraRepliesRef.current = false;
        setBuyingExtraReplies(false);
      }
    })();
  }, [accountStableId, dailyQuotaRemaining, scenario.id, studyTarget]);

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
   *  • `ended` — диалог ОКОНЧЕН. Ставится сразу: блокирует ввод, начисляет XP и
   *    отметку «Пройдено». Награда НЕ должна зависеть от того, досмотрел ли
   *    человек анимацию (правило фундамента: «удаляешь показ — не унеси
   *    награду»).
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
  const scrollRef = useRef<FlatList<UiMessage>>(null);
  const [voiceInputStatus, setVoiceInputStatus] = useState<VoiceInputStatus>('idle');
  const voiceInputBusy = voiceInputStatus === 'requesting'
    || voiceInputStatus === 'listening' || voiceInputStatus === 'finishing';
  const canSend = Boolean(input.trim()) && !sending && !voiceInputBusy;
  const voiceInputStatusRef = useRef<VoiceInputStatus>('idle');
  voiceInputStatusRef.current = voiceInputStatus;
  const voiceInputListenersRef = useRef<Array<{ remove?: () => void }>>([]);
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

  // Полноэкранный финал (редизайн 2026-08-23): реально начисленный XP этого
  // прохождения (0 при повторе — анти-фарм строка скрыта) и флаг «переписка
  // показана под вердиктом» (кнопка «Показать переписку» / пилюля «Итоги»).
  const [xpAwarded, setXpAwarded] = useState(0);
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

  const startVoiceInput = useCallback(async () => {
    if (!runtimeActiveRef.current) return;
    if (sending || ended || voiceInputStatus === 'requesting') return;
    if (!accessResolved) return;
    const generation = ++voiceInputGenerationRef.current;
    const session = ++voiceInputSessionRef.current;
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
    if (!voiceInputGate.canStartAttempt()) return;
    if (!speechModule) {
      setVoiceInputStatus('unavailable');
      return;
    }
    if (!isSpeechRecognitionAvailable(speechModule)) {
      setVoiceInputStatus('unavailable');
      return;
    }

    const inventory = await readSpeechRecognitionLocaleInventory(speechModule);
    const asrCapability = dialogueTarget
      ? resolveDialogueAsrCapability({
          target: dialogueTarget,
          platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
          androidApiLevel: Platform.OS === 'android' ? Number(Platform.Version) : undefined,
          locales: inventory?.locales,
          inventoryServiceId: inventory?.serviceId,
          startServiceId: inventory?.serviceId,
        })
      : null;
    if (!isCurrentSession() || generation !== voiceInputGenerationRef.current) return;
    if (!asrCapability?.available) {
      setVoiceInputStatus('unavailable');
      return;
    }

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
    const acc = new TranscriptAccumulator();
    let latest = '';
    const applyTranscript = (value: string) => {
      if (!isCurrentSession()) return;
      const next = value.trim();
      if (!next) return;
      latest = next;
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
      voiceInputGate.commitStartedAttempt();
      playCueOnce();
    });
    const resultSub = speechModule.addListener('result', (event: any) => {
      if (!isCurrentSession()) return;
      clearRecognizerWatchdog();
      if (holdPressActiveRef.current) {
        setVoiceInputStatus('listening');
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
      settleVoiceInput();
      // Текст остаётся в поле: пользователь проверяет его и отправляет стрелкой.
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
        restoreLoudPlaybackMode();
        setVoiceInputStatus('idle');
        return;
      }
      if (!dialogueSpeechLocale) {
        cleanupVoiceInputListeners();
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
          // Голосовой ввод не переслушивают — файл записи не нужен, не пишем.
          persistRecording: false,
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
      restoreLoudPlaybackMode();
      // start() кинул — почти всегда транзиентно (сервис занят/умер); даём «Повторить».
      if (isCurrentSession()) setVoiceInputStatus('error');
    }
  }, [
    accessResolved,
    cleanupVoiceInputListeners,
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

  useEffect(() => {
    voiceInputMountedRef.current = true;
    return () => {
      voiceInputMountedRef.current = false;
      voiceInputGenerationRef.current += 1;
      voiceInputSessionRef.current += 1;
      holdPressActiveRef.current = false;
      clearRecognizerWatchdog();
      if (voiceStopSettlementRef.current != null) clearTimeout(voiceStopSettlementRef.current);
      voiceStopSettlementRef.current = null;
      cleanupVoiceInputListeners();
      try {
        speechModule?.abort();
      } catch (e) {
      // no-op
      DebugLogger.error('ai_dialog_session:onDevice', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
      restoreLoudPlaybackMode();
    };
  }, [cleanupVoiceInputListeners, clearRecognizerWatchdog, restoreLoudPlaybackMode, speechModule]);

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
    holdPressActiveRef.current = false;
    clearRecognizerWatchdog();
    if (voiceStopSettlementRef.current != null) clearTimeout(voiceStopSettlementRef.current);
    voiceStopSettlementRef.current = null;
    cleanupVoiceInputListeners();
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
  }, [runtimeActive, speechModule, clearRecognizerWatchdog, cleanupVoiceInputListeners, restoreLoudPlaybackMode, stopSpeaking]);

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

  // Начисление XP по исходу (аудит H3: outcomeXpMultiplier раньше был мёртвым кодом).
  // База MAX_DIALOG_XP × множитель исхода (успех 1 / заглох 0.6 / провал 0.4).
  // Дедуп по сценарию: «Ещё раз» того же диалога XP повторно НЕ начисляет (анти-фарм).
  const awardDialogXp = useCallback(
    async (terminalOutcome: DialogOutcome) => {
      const mult = outcomeXpMultiplier(terminalOutcome);
      if (mult <= 0) return;
      const amount = Math.round(MAX_DIALOG_XP * mult);
      if (amount <= 0) return;
      const dedupeKey = `dialog_xp_awarded_${scenario.id}`;
      try {
        if (await AsyncStorage.getItem(dedupeKey)) return; // уже начисляли за этот сценарий
        const userName = (await AsyncStorage.getItem('user_name')) || '';
        await registerXP(amount, 'dialog_complete', userName, lang, undefined, {
          eventId: `dialog_complete:${scenario.id}:${terminalOutcome}`,
          payload: { scenarioId: scenario.id, outcome: terminalOutcome },
        });
        await AsyncStorage.setItem(dedupeKey, '1');
        // Показ «+XP» на финальном экране — только когда начисление реально
        // произошло (повтор сценария честно молчит, как в контракте салюта).
        setXpAwarded(amount);
      } catch (e) {
      // best-effort: сбой начисления XP не должен ломать показ модала-вердикта
      DebugLogger.error('ai_dialog_session:userName', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    },
    [scenario.id, lang],
  );

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
        // XP начисляем при любом исходе (больше за успех, меньше за провал/заглох).
        void awardDialogXp(ts.outcome);
      }
    },
    [gameEnabled, scenario.id, awardDialogXp, studyTarget],
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
      res: { turnState: unknown; quality?: DialogQualityMeta; model?: string },
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
      lastSentTextRef.current = trimmed;
      setLastErrorMessage('');
      setLastErrorKind(null);
      setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
      setInput('');
      setSending(true);
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
          await requireDialogExtraRepliesProviderReady(captureAccountGeneration(), studyTarget);
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
        setMessages((prev) => [...prev, { role: 'assistant', text: res.assistantMessage }]);
        applyCoachTurn(res.coach, trimmed, assistantIndex);
        if (!hasPremiumAccess) {
          const quotaObservation = parseAiDialogQuotaObservation(res);
          if (quotaObservation) {
            setDailyQuotaRemaining(quotaObservation.remainingQuota);
            void recordAiDialogDailyQuotaFromServer(studyTarget, accountStableId, quotaObservation);
          }
        }
        // Игровое состояние хода (настроение/цели/исход). Безопасно при отсутствии.
        applyAcceptedTurn(res, exchangeIndex);
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
          errorKind === 'free_limit'
          || errorKind === 'premium_limit'
          || errorKind === 'age_restricted';
        DebugLogger.error(
          'ai_dialog:reply_stream',
          error instanceof Error ? error : new Error(String(error)),
          isExpectedRefusal ? 'warning' : 'critical',
        );
        resetStreamDraft();
        // Ошибка сети/таймаута: НЕ пишем её как реплику персонажа и НЕ списываем
        // бесплатную попытку — показываем системную плашку с кнопкой «Повторить».
        void trackEvent('ai_dialog_send_error', { scenarioId: scenario.id, exchangeIndex });
        if (errorKind === 'free_limit' && !hasPremiumAccess) {
          // Сервер — источник истины по дневной квоте: 'dialog_free_limit' и
          // 'dialog_plus_required' одинаково значат «сегодня закрыто».
          handleDailyLimitReached(quotaObservationFromDialogError(error));
          return;
        }
        setLastErrorKind(errorKind);
        setLastErrorMessage(getPremiumDialogErrorMessage(error, { hasPremiumAccess, lang }));
      } finally {
        setSending(false);
      }
    },
    [sending, ended, voiceInputBusy, hasPremiumAccess, accessResolved, dialogAccess, dialogSessionOpen, dailyQuotaGate, handleDailyLimitReached, accountStableId, userExchanges, buildHistory, scenario, promptScenario, lang, studyTarget, buildGameRequestFields, applyAcceptedTurn, applyCoachTurn, pushStreamDelta, resetStreamDraft],
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
        await requireDialogExtraRepliesProviderReady(captureAccountGeneration(), studyTarget);
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
          void recordAiDialogDailyQuotaFromServer(studyTarget, accountStableId, quotaObservation);
        }
      }
      applyAcceptedTurn(res, exchangeIndex);
    } catch (error) {
      resetStreamDraft();
      void trackEvent('ai_dialog_send_error', { scenarioId: scenario.id, retry: true });
      if (classifyPremiumDialogError(error) === 'free_limit' && !hasPremiumAccess) {
        handleDailyLimitReached(quotaObservationFromDialogError(error));
        return;
      }
      setLastErrorKind(classifyPremiumDialogError(error));
      setLastErrorMessage(getPremiumDialogErrorMessage(error, { hasPremiumAccess, lang }));
    } finally {
      setSending(false);
    }
  }, [sending, ended, hasPremiumAccess, accessResolved, dialogAccess, dialogSessionOpen, dailyQuotaGate, handleDailyLimitReached, accountStableId, messages, scenario, promptScenario, lang, studyTarget, buildGameRequestFields, applyAcceptedTurn, applyCoachTurn, pushStreamDelta, resetStreamDraft]);

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
        setReview(res);
        setReviewStatus('ready');
        void trackEvent('ai_dialog_review_shown', {
          scenarioId: scenario.id,
          corrections: Array.isArray(res.corrections) ? res.corrections.length : 0,
        });
      })
      .catch(() => {
        // Секция разбора опциональна: при сбое финальный экран живёт как раньше.
        setReviewStatus('error');
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
          ? triLang(lang, {
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
            <Text style={{ color: '#07110A', fontSize: f.sub, fontWeight: '900' }}>{frenchGateCopy.action}</Text>
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
            <Text style={{ color: '#07110A', fontSize: f.sub, fontWeight: '900' }}>
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
                backgroundColor: t.bgCard,
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
              backgroundColor: t.bgCard,
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
              backgroundColor: t.bgCard,
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
              <Ionicons name="flag" size={14} color={t.accent} />
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
              <Text style={{ color: t.textSecond, fontWeight: '400' }}>{currentGoal.labelRu}</Text>
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
            <Ionicons name="bulb" size={18} color={t.accent} />
            <Text style={{ color: t.accent, fontSize: f.sub, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
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
          <FlatList
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
                        <Text
                          style={{
                            color: t.correctText,
                            fontSize: f.bodyLg,
                            fontWeight: '400',
                            lineHeight: Math.round(f.bodyLg * 1.4),
                          }}
                          maxFontSizeMultiplier={1.2}
                        >
                          {m.text}
                        </Text>
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
                            <Ionicons name="create-outline" size={15} color={t.gold} style={{ marginTop: 2 }} />
                            <Text
                              style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700', flexShrink: 1 }}
                              maxFontSizeMultiplier={1.2}
                            >
                              {triLang(lang, {
                                ru: 'Лучше так: ', uk: 'Краще так: ', en: 'Better: ', es: 'Mejor: ', 'pt-BR': 'Melhor: ',
                                vi: 'Nên nói: ', id: 'Lebih baik: ', tr: 'Daha iyi: ', pl: 'Lepiej: ',
                              })}
                              <Text style={{ color: t.gold, fontWeight: '700' }}>{fixByIndex[i].corrected}</Text>
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
                            <Ionicons name="create-outline" size={13} color={t.gold} />
                            <Text style={{ color: t.gold, fontSize: f.label, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
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
                                      color: t.accent,
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
                                  ru: 'Сбой · Перевести снова',
                                  uk: 'Збій · Перекласти знову',
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
                    style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '700', textAlign: 'center' }}
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
                    <Ionicons name="refresh" size={17} color={t.correctText} />
                    <Text style={{ color: t.correctText, fontWeight: '800', fontSize: f.sub }}>
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
              сохранено — завтра поле вернётся само. Не модалка и не выброс на
              пейвол: тот открывается только по явному тапу. */}
          {!ended && !hasPremiumAccess && dailyQuotaGate === 'exhausted' && (
            <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 }}>
              <View
                style={{
                  backgroundColor: t.bgCard,
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
                    ru: 'На сегодня всё',
                    uk: 'На сьогодні все',
                    en: "That's it for today",
                    es: 'Por hoy es todo',
                    'pt-BR': 'Por hoje é isso',
                    vi: 'Hôm nay tạm dừng nhé',
                    id: 'Cukup untuk hari ini',
                    tr: 'Bugünlük bu kadar',
                    pl: 'Na dziś to tyle',
                  })}
                </Text>
                <Text
                  style={{
                    color: t.textSecond,
                    fontSize: f.body,
                    textAlign: 'center',
                    lineHeight: Math.round(f.body * 1.42),
                  }}
                  maxFontSizeMultiplier={1.2}
                >
                  {triLang(lang, {
                    ru: `Завтра снова ${dailyQuotaLimit} реплик. Разговор сохранён: вернёшься на это же место.`,
                    uk: `Завтра знову ${dailyQuotaLimit} реплік. Розмову збережено: повернешся на це саме місце.`,
                    en: `Tomorrow you get ${dailyQuotaLimit} lines again. The conversation is saved: you'll come back to this spot.`,
                    es: `Mañana tendrás otra vez ${dailyQuotaLimit} frases. La conversación está guardada: volverás a este punto.`,
                    'pt-BR': `Amanhã você tem de novo ${dailyQuotaLimit} falas. A conversa está salva: você volta neste ponto.`,
                    vi: `Ngày mai bạn lại có ${dailyQuotaLimit} lượt. Cuộc trò chuyện đã được lưu: bạn sẽ quay lại đúng chỗ này.`,
                    id: `Besok kamu dapat ${dailyQuotaLimit} balasan lagi. Percakapan tersimpan: kamu kembali ke titik ini.`,
                    tr: `Yarın yine ${dailyQuotaLimit} replik alacaksın. Sohbet kaydedildi: aynı yerden devam edersin.`,
                    pl: `Jutro znowu ${dailyQuotaLimit} wypowiedzi. Rozmowa jest zapisana: wrócisz w to samo miejsce.`,
                  })}
                </Text>
                {/* Докупка реплик за руны (владелец 2026-09-17, макет вариант Б):
                    монета + цена, ставится ПЕРВОЙ строкой над «Разбор»/«Plus» —
                    самый дешёвый и мгновенный путь продолжить именно этот разговор.
                    Кнопка не гейтится сетью: buyDialogExtraRepliesLocally сама
                    решает, хватает ли рун, читая локальный баланс под локом. */}
                {runesBalanceForBuy !== null && (
                  <TouchableOpacity
                    onPress={handleBuyExtraReplies}
                    disabled={buyingExtraReplies || runesBalanceForBuy < DIALOG_EXTRA_REPLIES_PRICE_RUNES}
                    activeOpacity={0.86}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: buyingExtraReplies || runesBalanceForBuy < DIALOG_EXTRA_REPLIES_PRICE_RUNES }}
                    accessibilityLabel={triLang(lang, {
                      ru: `Ещё ${DIALOG_EXTRA_REPLIES_COUNT} реплик за ${DIALOG_EXTRA_REPLIES_PRICE_RUNES} рун`,
                      uk: `Ще ${DIALOG_EXTRA_REPLIES_COUNT} реплік за ${DIALOG_EXTRA_REPLIES_PRICE_RUNES} рун`,
                      en: `${DIALOG_EXTRA_REPLIES_COUNT} more lines for ${DIALOG_EXTRA_REPLIES_PRICE_RUNES} runes`,
                      es: `${DIALOG_EXTRA_REPLIES_COUNT} frases más por ${DIALOG_EXTRA_REPLIES_PRICE_RUNES} runas`,
                      'pt-BR': `Mais ${DIALOG_EXTRA_REPLIES_COUNT} falas por ${DIALOG_EXTRA_REPLIES_PRICE_RUNES} runas`,
                      vi: `Thêm ${DIALOG_EXTRA_REPLIES_COUNT} lượt với ${DIALOG_EXTRA_REPLIES_PRICE_RUNES} rune`,
                      id: `${DIALOG_EXTRA_REPLIES_COUNT} balasan lagi seharga ${DIALOG_EXTRA_REPLIES_PRICE_RUNES} rune`,
                      tr: `${DIALOG_EXTRA_REPLIES_PRICE_RUNES} rune karşılığında ${DIALOG_EXTRA_REPLIES_COUNT} replik daha`,
                      pl: `Jeszcze ${DIALOG_EXTRA_REPLIES_COUNT} wypowiedzi za ${DIALOG_EXTRA_REPLIES_PRICE_RUNES} run`,
                    })}
                    style={{
                      minHeight: 50,
                      borderRadius: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 7,
                      backgroundColor: t.bgSurface2,
                      opacity: runesBalanceForBuy < DIALOG_EXTRA_REPLIES_PRICE_RUNES ? 0.5 : 1,
                    }}
                  >
                    {buyingExtraReplies ? (
                      <ActivityIndicator size="small" color={t.textPrimary} />
                    ) : (
                      <>
                        <Ionicons name="disc" size={18} color={t.gold} />
                        <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
                          {triLang(lang, {
                            ru: `Ещё ${DIALOG_EXTRA_REPLIES_COUNT} реплик · ᚱ${DIALOG_EXTRA_REPLIES_PRICE_RUNES}`,
                            uk: `Ще ${DIALOG_EXTRA_REPLIES_COUNT} реплік · ᚱ${DIALOG_EXTRA_REPLIES_PRICE_RUNES}`,
                            en: `+${DIALOG_EXTRA_REPLIES_COUNT} lines · ᚱ${DIALOG_EXTRA_REPLIES_PRICE_RUNES}`,
                            es: `+${DIALOG_EXTRA_REPLIES_COUNT} frases · ᚱ${DIALOG_EXTRA_REPLIES_PRICE_RUNES}`,
                            'pt-BR': `+${DIALOG_EXTRA_REPLIES_COUNT} falas · ᚱ${DIALOG_EXTRA_REPLIES_PRICE_RUNES}`,
                            vi: `+${DIALOG_EXTRA_REPLIES_COUNT} lượt · ᚱ${DIALOG_EXTRA_REPLIES_PRICE_RUNES}`,
                            id: `+${DIALOG_EXTRA_REPLIES_COUNT} balasan · ᚱ${DIALOG_EXTRA_REPLIES_PRICE_RUNES}`,
                            tr: `+${DIALOG_EXTRA_REPLIES_COUNT} replik · ᚱ${DIALOG_EXTRA_REPLIES_PRICE_RUNES}`,
                            pl: `+${DIALOG_EXTRA_REPLIES_COUNT} wypowiedzi · ᚱ${DIALOG_EXTRA_REPLIES_PRICE_RUNES}`,
                          })}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
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
                      ru: 'Открыть Plus: разговоры без дневного лимита',
                      uk: 'Відкрити Plus: розмови без денного ліміту',
                      en: 'Open Plus: conversations without a daily limit',
                      es: 'Abrir Plus: conversaciones sin límite diario',
                      'pt-BR': 'Abrir Plus: conversas sem limite diário',
                      vi: 'Mở Plus: trò chuyện không giới hạn mỗi ngày',
                      id: 'Buka Plus: percakapan tanpa batas harian',
                      tr: 'Plus’ı aç: günlük limitsiz sohbet',
                      pl: 'Otwórz Plus: rozmowy bez dziennego limitu',
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
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
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
                  triLang(lang, {
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
                  opacity: sending || voiceInputStatus === 'finishing' ? 0.55 : 1,
                  position: 'relative',
                }}
              >
                {voiceInputStatus === 'requesting' || voiceInputStatus === 'finishing' ? (
                  // Тот же сдвиг, что у иконки: спиннер встаёт ровно на её место.
                  <ActivityIndicator size="small" color={t.textSecond} style={{ marginTop: -5 }} />
                ) : (
                  <Ionicons
                    name={voiceInputStatus === 'listening' ? 'mic' : 'mic-outline'}
                    size={21}
                    color={voiceInputStatus === 'listening' ? t.correctText : t.textSecond}
                    // Ряд точек занимает низ круга всегда (в том числе распоркой),
                    // поэтому иконка постоянно смещена вверх на его половину —
                    // композиция по центру, и прыжка при смене остатка нет.
                    style={{ marginTop: -5 }}
                  />
                )}
                {/* зачем (владелец 2026-09-13): остаток дневных голосовых попыток
                    виден на КАЖДОМ микрофоне. Точки лежат абсолютом внутри круга
                    44×44 — строка ввода, поле и кнопка отправки не двигаются
                    ни в одном состоянии. */}
                <SpeakingQuotaDots
                  quota={voiceInputGate.quota}
                  size="sm"
                  spentColor={voiceInputStatus === 'listening' ? `${t.correctText}59` : t.textMuted}
                  remainingColor={voiceInputStatus === 'listening' ? t.correctText : t.accent}
                  style={{ position: 'absolute', left: 0, right: 0, bottom: 6 }}
                  testID="ai-dialog-voice-quota-dots"
                />
                {voiceInputGate.locked && (
                  <View
                    style={{
                      position: 'absolute',
                      right: -2,
                      top: -5,
                      borderRadius: 8,
                      paddingHorizontal: 5,
                      paddingVertical: 2,
                      backgroundColor: t.accent,
                      borderWidth: 0,
                      borderColor: t.bgPrimary,
                    }}
                  >
                    <Text style={{ color: t.correctText, fontSize: 8, fontWeight: '900' }}>PLUS</Text>
                  </View>
                )}
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
                placeholder={triLang(lang, {
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
                  backgroundColor: t.bgCard,
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
                  color={canSend ? t.correctText : t.textMuted}
                />
              </TouchableOpacity>
              </View>
              {voiceInputHint ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 6, paddingHorizontal: 6 }}>
                  <Text
                    style={{
                      color: voiceInputStatus === 'listening' ? t.accent : t.textMuted,
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
                        Linking.openSettings().catch(() => {});
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={{ color: t.accent, fontSize: f.sub, fontWeight: '800' }}>
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
                      <Text style={{ color: t.accent, fontSize: f.sub, fontWeight: '800' }}>
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
            xpAwarded={xpAwarded}
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
              <Ionicons name="podium-outline" size={17} color={t.correctText} />
              <Text style={{ color: t.correctText, fontSize: f.sub, fontWeight: '700' }}>
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
      <Modal
        visible={hintOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setHintOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', paddingHorizontal: 28 }}
          onPress={() => setHintOpen(false)}
          accessibilityRole="button"
          accessibilityLabel={triLang(lang, {
            ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar',
            vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij',
          })}
        >
          <View style={{ backgroundColor: t.bgCard, borderRadius: 24, padding: 22, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="bulb" size={22} color={t.accent} />
              <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
                {triLang(lang, {
                  ru: 'Подсказка', uk: 'Підказка', en: 'Hint', es: 'Pista', 'pt-BR': 'Dica',
                  vi: 'Gợi ý', id: 'Petunjuk', tr: 'İpucu', pl: 'Podpowiedź',
                })}
              </Text>
            </View>
            {/* Подсказка БЕСПЛАТНА (владелец 2026-09-18: «она бесплатна, там
                ничего не надо платить»). Текст — шаг сценария из бандла: ни
                сети, ни модели, ни расходов. Платная механика живёт в «Почему
                так»: 3 бесплатных в день, дальше руны. */}
            <Text
              style={{ color: t.textSecond, fontSize: f.body, lineHeight: Math.round(f.body * 1.45) }}
              maxFontSizeMultiplier={1.2}
            >
              {presentation?.hint ?? ''}
            </Text>
          </View>
        </Pressable>
      </Modal>

      {/* Все задания диалога: открывается тапом по строке целей в шапке. */}
      <DialogGoalsSheet
        visible={goalsOpen}
        onClose={() => setGoalsOpen(false)}
        lang={lang}
        objectives={objectives}
        objectivesMet={objectivesMet}
        testID="ai-dialog-goals"
      />

      {/* Не хватило энергии на вход — закрытие уводит с экрана диалога. */}
      <NoEnergyModal
        visible={dialogNoEnergy}
        activity="ai_dialog"
        onClose={() => { setDialogNoEnergy(false); onBack(); }}
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
  // (mood/objectivesMet/outcome/ended/xpAwarded/verdictHidden/messages/…)
  // объявлен через useState без привязки к scenario.id и ничем не сбрасывался.
  // Итог: после «Ещё раз» экран мог тут же показать старый вердикт или чужое
  // настроение. key=scenarioId форсирует полный ремаунт — самый безопасный
  // фикс, без риска гонок между десятком независимых стейтов/эффектов.
  const params = useLocalSearchParams<{ scenarioId?: string; lessonId?: string; runId?: string }>();
  const sessionKey = `${studyTarget}:${params.scenarioId ?? ''}:${params.lessonId ?? ''}:${params.runId ?? ''}`;
  const scenario = resolveDialogueRouteScenario(params, studyTarget, buildLessonDialogScenario);
  if (!scenario) return <MissingDialogueScreen />;
  return (
    <AiDialogConsentGate>
      <AiDialogSession key={sessionKey} scenario={scenario} />
    </AiDialogConsentGate>
  );
}
