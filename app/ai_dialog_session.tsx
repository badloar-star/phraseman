import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  ActivityIndicator,
  Easing,
  KeyboardAvoidingView,
  Linking,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../components/ThemeContext';
import { usePremium, useFeatureAccess } from '../components/PremiumContext';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import ScreenGradient from '../components/ScreenGradient';
import { glassFill } from '../components/GlassSurface';
import ReportErrorButton from '../components/ReportErrorButton';
import AiTypingBubble from '../components/AiTypingBubble';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hapticError, hapticTap } from '../hooks/use-haptics';
import { useAudio } from '../hooks/use-audio';
import { LOUD_PLAYBACK_AUDIO_MODE, SPEAKING_RECORDING_AUDIO_MODE } from './audio_playback_mode';
import { setManagedAudioMode } from './audio_session_coordinator';
import {
  dialogScenarioNextStepHint,
  dialogScenarioTitle,
  getScenarioById,
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
  outcomeTitle,
  objectiveLabel,
  type DialogOutcome,
} from './dialog_outcome';
import { parseKeyPhrases, stripMarkers } from './ai_dialog_markup';
import { buildScenarioGreeting } from './ai_dialog_greeting';
import { triLang, type Lang } from '../constants/i18n';
import { getLessonData } from './lesson_data_all';
import { getLessonDialogScenarioId } from './lesson_dialog_scenarios';
import { aiOffline, aiOfflineDialogScreen } from './ai_kill_switch_copy';
import {
  callPremiumDialogSend,
  callPremiumDialogTranslate,
  callPremiumDialogReview,
  classifyPremiumDialogError,
  getPremiumDialogErrorMessage,
  type DialogChatTurn,
  type PremiumDialogErrorKind,
  type PremiumDialogReviewResponse,
} from './ai_dialog_client';
import SkeletonBlock from '../components/SkeletonShimmer';
import {
  TRANSLATE_LIMIT_PER_DIALOG,
  decideTranslateAction,
  shouldShowTranslateButton,
  translateRemaining as computeTranslateRemaining,
} from './dialog_translate_limit';
import { markDialogCompleted } from './dialogs_progress';
import { trackEvent } from './analytics';
import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back';
import { registerXP } from './xp_manager';
import { MAX_DIALOG_XP } from './config';
import { outcomeXpMultiplier } from './dialog_outcome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { aiDialogContentAvailableForTarget, frenchAiDialogGateCopy } from './ai_dialog_target_gate';
import {
  isSpeechRecognitionAvailable,
  loadPlanSpeechModule,
  requestSpeechPermissionForHold,
} from './personal_plan_speech_module';
import { isSpeakingEnabled } from './remote_flags';
import { buildSpeakingStartOptions } from './speaking_recognition_options';
import { TranscriptAccumulator } from './speaking_transcript_accumulator';
import { useRecordStartCue } from '../hooks/use-record-start-cue';

const RECOMMENDED_EXCHANGES = 8;
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

// Разговорный режим: после отпускания пальца ждём финальный результат
// распознавателя перед авто-отправкой (последний `result` часто прилетает уже
// после stop()). Достаточно, чтобы досдать хвост, но незаметно для юзера.
// Normal completion is event-driven (`end`/`error`). This is only a bounded
// fallback for OEM recognizers that stop the engine without a terminal event.
const CONVERSATION_SEND_GRACE_MS = 1200;

// Вернуть аудио-сессию в «громкое воспроизведение» после голосового ввода:
// без сброса озвучка ответов Компаса и любые mp3 после микрофона играют тихо
// через разговорный динамик или не играют вовсе.
function restoreLoudPlaybackMode(): void {
  void setManagedAudioMode(LOUD_PLAYBACK_AUDIO_MODE).catch(() => undefined);
}

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
    es: 'Enviar de nuevo',
    'pt-BR': 'Enviar de novo',
    vi: 'Gửi lại',
    id: 'Kirim lagi',
    tr: 'Tekrar gönder',
    pl: 'Wyślij ponownie',
  });
}

export default function AiDialogSession() {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { hasPremiumAccess } = usePremium();
  // Доступ к фиче «ИИ-диалоги» с учётом «Пульта»: true → пейвол не показываем
  // (фича переведена в «Фри»). Серверный isPremium ниже остаётся СЫРЫМ premium —
  // «Фри» снимает замок, но НЕ выдаёт премиум-квоту реплик.
  const dialogAccess = useFeatureAccess('ai_dialog');
  const router = useRouter();
  const { speak, stop: stopSpeaking } = useAudio();
  const speechModule = useMemo(() => (isSpeakingEnabled() ? loadPlanSpeechModule() : null), []);
  const { playRecordStart } = useRecordStartCue();
  const params = useLocalSearchParams<{ scenarioId?: string; lessonId?: string }>();
  const aiDialogGateOpen = aiDialogContentAvailableForTarget(studyTarget);
  const frenchGateCopy = frenchAiDialogGateCopy(lang);

  const scenario = useMemo(
    () => {
      const lessonId = parseInt(String(params.lessonId ?? ''), 10);
      const lessonScenario = buildLessonDialogScenario(lessonId);
      if (lessonScenario && String(params.scenarioId ?? '') === lessonScenario.id) return lessonScenario;
      return getScenarioById(String(params.scenarioId ?? 'coffee')) ?? getScenarioById('coffee')!;
    },
    [params.scenarioId, params.lessonId],
  );

  useEffect(() => {
    if (!aiDialogGateOpen || dialogAccess) return;
    void trackEvent('paywall_shown', { context: 'dialog_limit', source: 'ai_dialog_direct_entry' });
    router.replace({ pathname: '/premium_modal', params: { context: 'dialog_limit' } } as never);
  }, [aiDialogGateOpen, dialogAccess, router]);

  // Имя собеседника для шапки-мессенджера: достаём из persona, иначе пусто.
  const personaName = useMemo(() => extractPersonaName(scenario.persona), [scenario.persona]);

  // Первая реплика собеседника (приветствие) присутствует СРАЗУ, с первого кадра —
  // через ленивый инициализатор, а не через эффект (раньше эффект мог не сработать
  // при гонке/двойном маунте → «первой реплики нет»). Приветствие УНИКАЛЬНОЕ для
  // каждого сценария (имя персонажа + место + роль), а не одинаковое для всех.
  const [messages, setMessages] = useState<UiMessage[]>(() => [
    { role: 'assistant', text: buildScenarioGreeting(scenario) },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [ended, setEnded] = useState(false);
  // Ошибка ИИ (сеть/таймаут) показывается НЕ как реплика персонажа, а отдельной
  // системной плашкой с кнопкой «Повторить». Храним текст последней отправки,
  // чтобы повтор переслал именно её.
  const [lastErrorMessage, setLastErrorMessage] = useState('');
  const [lastErrorKind, setLastErrorKind] = useState<PremiumDialogErrorKind | null>(null);
  const lastSentTextRef = useRef('');
  const scrollRef = useRef<ScrollView>(null);
  const [voiceInputStatus, setVoiceInputStatus] = useState<VoiceInputStatus>('idle');
  const voiceInputStatusRef = useRef<VoiceInputStatus>('idle');
  voiceInputStatusRef.current = voiceInputStatus;
  const voiceInputListenersRef = useRef<Array<{ remove?: () => void }>>([]);
  const voiceInputMountedRef = useRef(true);
  // ── Разговорный режим «зажми и говори» (hands-free болталка) ────────────────
  // Когда включён: кнопка микрофона работает на удержание (onPressIn → слушаю,
  // onPressOut → авто-отправка распознанного), а ответ ИИ сразу озвучивается.
  // Конец речи определяет ПАЛЕЦ (отпустил), а не OEM-endpointer — это обходит
  // «микрофон Android закрывается сам» и исключает эхо (mic и динамик никогда не
  // открыты одновременно: пока звучит ответ, палец отпущен и запись закрыта).
  const [conversationMode, setConversationMode] = useState(false);
  // Свежее значение флага для колбэков send/распознавания без stale-closure и
  // без пересоздания send при каждом переключении тумблера.
  const conversationModeRef = useRef(false);
  // Invalidates an in-flight permission/model/start sequence when the finger is
  // released or the conversation mode is turned off.
  const voiceInputGenerationRef = useRef(0);
  const holdPressActiveRef = useRef(false);
  useEffect(() => {
    conversationModeRef.current = conversationMode;
  }, [conversationMode]);
  // Последний распознанный текст: onPressOut читает его, чтобы отправить реплику
  // (локальная `latest` внутри startVoiceInput недоступна снаружи).
  const latestTranscriptRef = useRef('');
  const sendVoiceTextRef = useRef<(text: string) => void>(() => undefined);
  const conversationReleasePendingRef = useRef(false);
  const conversationSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalizeConversationSendRef = useRef<() => void>(() => undefined);
  // Идёт озвучка ответа ИИ (для подсказки «Отвечает…» под полем ввода).
  const [aiSpeaking, setAiSpeaking] = useState(false);
  // Watchdog против молчащего распознавателя (как в SpeakingPanel): Android-сервис
  // может принять start() и не прислать НИ start, НИ result, НИ error — без
  // таймера кнопка микрофона зависла бы в «Слушаю…» навсегда.
  const recognizerWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearRecognizerWatchdog = useCallback(() => {
    if (recognizerWatchdogRef.current != null) {
      clearTimeout(recognizerWatchdogRef.current);
      recognizerWatchdogRef.current = null;
    }
  }, []);

  // ── Перевод реплик собеседника ────────────────────────────────────────────
  // translations: кэш «индекс реплики → перевод» (повторный флип бесплатен).
  // flipped: какие реплики сейчас показаны в переводе (а не в оригинале).
  // translatingIdx: индекс реплики, перевод которой грузится прямо сейчас.
  // translateUsed: сколько из TRANSLATE_LIMIT_PER_DIALOG уже потрачено.
  const [translations, setTranslations] = useState<Record<number, string>>({});
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [translatingIdx, setTranslatingIdx] = useState<number | null>(null);
  const [translateUsed, setTranslateUsed] = useState(0);
  // Индекс реплики, перевод которой только что упал (сеть/функция/лимит). Показываем
  // под ней плашку «не удалось · повторить» — чтобы сбой не выглядел как «ничего».
  const [translateErrorIdx, setTranslateErrorIdx] = useState<number | null>(null);
  const translateRemaining = computeTranslateRemaining(translateUsed, TRANSLATE_LIMIT_PER_DIALOG);

  // ── «Диалог как игра»: цель · настроение · исход ──────────────────────────
  // Под-цели и темперамент выводим из каталога (или явные поля сценария) —
  // шлём на сервер, он включает игровой режим и возвращает turnState каждый ход.
  const objectives = useMemo<DialogObjective[]>(() => scenarioObjectives(scenario), [scenario]);
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
  const [outcome, setOutcome] = useState<DialogOutcome>('ongoing');
  const [characterReaction, setCharacterReaction] = useState('');
  const [coachTips, setCoachTips] = useState<string[]>([]);

  // ── Финальный «разбор полётов»: похвала + мягкие исправления фраз ученика ──
  // Запрашивается ОДИН раз при завершении диалога (терминальный исход или ручное
  // «Завершить»). Сбой не критичен: секция просто не показывается.
  const [review, setReview] = useState<PremiumDialogReviewResponse | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const reviewRequestedRef = useRef(false);

  // Открыть/скрыть перевод реплики i. Первый показ новой реплики тратит лимит и
  // зовёт сервер; дальше флип идёт из кэша мгновенно и лимит не трогает. Само
  // решение делегировано чистой decideTranslateAction (покрыта unit-тестами).
  const toggleTranslation = useCallback(
    async (i: number, rawText: string) => {
      hapticTap();
      const action = decideTranslateAction({
        hasTranslation: translations[i] != null,
        isFlipped: flipped[i] === true,
        used: translateUsed,
        isBusy: translatingIdx != null,
        limit: TRANSLATE_LIMIT_PER_DIALOG,
      });
      if (action === 'hide') {
        setFlipped((prev) => ({ ...prev, [i]: false }));
        return;
      }
      if (action === 'show_cached') {
        setFlipped((prev) => ({ ...prev, [i]: true }));
        return;
      }
      if (action === 'noop') return;
      // action === 'fetch': новая реплика, нужен серверный вызов.

      const clean = stripMarkers(rawText);
      if (!clean) return;

      setTranslatingIdx(i);
      setTranslateErrorIdx(null);
      void trackEvent('ai_dialog_translate_requested', {
        scenarioId: scenario.id,
        usedBefore: translateUsed,
      });
      try {
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
        // Лимит тратим ТОЛЬКО при успешном переводе (сбой не сжигает попытку).
        setTranslateUsed((prev) => prev + 1);
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
    [flipped, translations, translatingIdx, translateUsed, lang, scenario.id],
  );

  const userExchanges = messages.filter((m) => m.role === 'user').length;

  const cleanupVoiceInputListeners = useCallback(() => {
    voiceInputListenersRef.current.forEach((sub) => sub?.remove?.());
    voiceInputListenersRef.current = [];
  }, []);

  const startVoiceInput = useCallback(async () => {
    if (sending || ended || voiceInputStatus === 'requesting') return;
    const generation = ++voiceInputGenerationRef.current;
    hapticTap();
    // Глушим играющий ответ-TTS перед стартом микрофона: иначе он течёт в
    // распознаватель и портит транскрипт (образец: SpeakingPanel stopListening).
    stopSpeaking();
    if (!hasPremiumAccess) {
      void trackEvent('paywall_shown', { context: 'ai_voice_input', source: 'ai_dialog_voice_input' });
      router.push({
        pathname: '/premium_modal',
        params: { context: 'ai_voice_input', source: 'ai_dialog_voice_input' },
      } as never);
      return;
    }
    if (!speechModule) {
      setVoiceInputStatus('unavailable');
      return;
    }
    if (!isSpeechRecognitionAvailable(speechModule)) {
      setVoiceInputStatus('unavailable');
      return;
    }

    setVoiceInputStatus('requesting');
    const permission = await requestSpeechPermissionForHold(speechModule);
    if (generation !== voiceInputGenerationRef.current || !voiceInputMountedRef.current) return;
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
      const next = value.trim();
      if (!next) return;
      latest = next;
      // Дублируем в ref: onPressOut (разговорный режим) читает его для авто-отправки.
      latestTranscriptRef.current = next;
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
      if (cuePlayed) return;
      cuePlayed = true;
      playRecordStart();
    };
    // Любой признак жизни движка снимает watchdog: на редких OEM 'start' не
    // эмитится, а сразу приходит result — снимаем и там, и там.
    const startSub = speechModule.addListener('start', () => {
      clearRecognizerWatchdog();
      if (!holdPressActiveRef.current) {
        try {
          speechModule.stop();
        } catch {
          /* no-op */
        }
        return;
      }
      setVoiceInputStatus('listening');
      playCueOnce();
    });
    const resultSub = speechModule.addListener('result', (event: any) => {
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
        acc.add(top);
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
      clearRecognizerWatchdog();
      if (conversationReleasePendingRef.current) {
        finalizeConversationSendRef.current();
        return;
      }
      restoreLoudPlaybackMode();
      cleanupVoiceInputListeners();
      if (voiceInputMountedRef.current) setVoiceInputStatus('idle');
    });
    const errorSub = speechModule.addListener('error', () => {
      clearRecognizerWatchdog();
      if (conversationReleasePendingRef.current && latestTranscriptRef.current.trim()) {
        finalizeConversationSendRef.current();
        return;
      }
      restoreLoudPlaybackMode();
      cleanupVoiceInputListeners();
      // Есть текст — молча оставляем его; иначе транзиентный сбой → 'error' с «Повторить».
      if (voiceInputMountedRef.current) setVoiceInputStatus(latest ? 'idle' : 'error');
    });
    const noMatchSub = speechModule.addListener('nomatch', () => {
      clearRecognizerWatchdog();
      restoreLoudPlaybackMode();
      cleanupVoiceInputListeners();
      if (voiceInputMountedRef.current) setVoiceInputStatus('idle');
    });
    voiceInputListenersRef.current = [startSub, resultSub, endSub, errorSub, noMatchSub].filter(
      Boolean,
    ) as Array<{ remove?: () => void }>;

    let onDevice = false;
    try {
      onDevice = (await speechModule.supportsOnDeviceRecognition?.()) === true;
    } catch {
      onDevice = false;
    }
    if (generation !== voiceInputGenerationRef.current || !voiceInputMountedRef.current) return;

    try {
      try {
        await setManagedAudioMode(SPEAKING_RECORDING_AUDIO_MODE);
      } catch {
        // expo-speech-recognition may own the native session on some devices.
      }
      if (generation !== voiceInputGenerationRef.current || !voiceInputMountedRef.current) return;
      if (!holdPressActiveRef.current) {
        cleanupVoiceInputListeners();
        restoreLoudPlaybackMode();
        setVoiceInputStatus('idle');
        return;
      }
      // Watchdog: если за 7с движок не подал признаков жизни — гасим попытку и
      // показываем «Не удалось запустить микрофон» с повтором по тапу на микрофон.
      clearRecognizerWatchdog();
      recognizerWatchdogRef.current = setTimeout(() => {
        recognizerWatchdogRef.current = null;
        try {
          speechModule.abort();
        } catch {
          /* сервис мог умереть — не мешаем */
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
          lang: 'en-US',
          targetText: input.trim() || scenario.goalEn || dialogScenarioTitle(scenario, lang),
          interimResults: true,
          volumeMeter: false,
          onDevice,
          // Голосовой ввод не переслушивают — файл записи не нужен, не пишем.
          persistRecording: false,
          // Разговорный режим = зажми-и-говори: держим движок открытым, пока
          // зажата кнопка (иначе Android-endpointer рвёт речь на паузе).
          holdToTalk: true,
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
      if (voiceInputMountedRef.current) setVoiceInputStatus('error');
    }
  }, [
    cleanupVoiceInputListeners,
    clearRecognizerWatchdog,
    ended,
    hasPremiumAccess,
    input,
    lang,
    lastErrorMessage,
    playRecordStart,
    router,
    scenario,
    sending,
    speechModule,
    stopSpeaking,
    voiceInputStatus,
  ]);

  useEffect(() => {
    voiceInputMountedRef.current = true;
    return () => {
      voiceInputMountedRef.current = false;
      conversationReleasePendingRef.current = false;
      if (conversationSendTimerRef.current != null) {
        clearTimeout(conversationSendTimerRef.current);
        conversationSendTimerRef.current = null;
      }
      clearRecognizerWatchdog();
      cleanupVoiceInputListeners();
      try {
        speechModule?.abort();
      } catch {
        /* no-op */
      }
      restoreLoudPlaybackMode();
    };
  }, [cleanupVoiceInputListeners, clearRecognizerWatchdog, speechModule]);

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
      } catch {
        // best-effort: сбой начисления XP не должен ломать показ модала-вердикта
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
          return next;
        });
      }
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
          void markDialogCompleted(scenario.id);
        }
        // XP начисляем при любом исходе (больше за успех, меньше за провал/заглох).
        void awardDialogXp(ts.outcome);
      }
    },
    [gameEnabled, scenario.id, awardDialogXp],
  );

  // Игровые поля для запроса (под-цели в формате сервера + темперамент).
  const gameRequestFields = useMemo(
    () =>
      gameEnabled
        ? {
            objectives: objectives.map((o) => ({ id: o.id, en: o.en || o.id })),
            temperament,
          }
        : {},
    [gameEnabled, objectives, temperament],
  );

  // Озвучить реплику ИИ в разговорном режиме. Микрофон к этому моменту закрыт
  // (press-and-hold: палец отпущен) — поэтому эха нет. Индикатор «Отвечает…»
  // гасим по onDone/onError/onStopped. Вне разговорного режима — no-op (озвучка
  // остаётся ручной, по тапу на реплику).
  const speakAiReply = useCallback(
    (rawText: string) => {
      if (!conversationModeRef.current) return;
      const clean = stripMarkers(rawText).trim();
      if (!clean) return;
      setAiSpeaking(true);
      const done = () => {
        if (voiceInputMountedRef.current) setAiSpeaking(false);
      };
      speak(clean, undefined, {
        language: 'en-US',
        voice: '',
        onDone: done,
        onStopped: done,
        onError: done,
      });
    },
    [speak],
  );

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending || ended) return;
      hapticTap();

      if (!dialogAccess) {
        void trackEvent('ai_dialog_limit_hit', { scenarioId: scenario.id, reason: 'plus_required' });
        void trackEvent('paywall_shown', { context: 'dialog_limit' });
        router.replace({ pathname: '/premium_modal', params: { context: 'dialog_limit' } } as never);
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
      try {
        const res = await callPremiumDialogSend({
          mode: 'scenario',
          userText: trimmed,
          cefr: scenario.cefr,
          history,
          role: scenario.role,
          setting: scenario.setting,
          goalEn: scenario.goalEn,
          persona: scenario.persona,
          scenarioId: scenario.id,
          interfaceLang: lang,
          studyTarget,
          isPremium: hasPremiumAccess,
          ...gameRequestFields,
        });
        setMessages((prev) => [...prev, { role: 'assistant', text: res.assistantMessage }]);
        // Разговорный режим: сразу озвучиваем ответ вслух (иначе no-op).
        speakAiReply(res.assistantMessage);
        // Игровое состояние хода (настроение/цели/исход). Безопасно при отсутствии.
        applyTurnState(res.turnState);
      } catch (error) {
        // Ошибка сети/таймаута: НЕ пишем её как реплику персонажа и НЕ списываем
        // бесплатную попытку — показываем системную плашку с кнопкой «Повторить».
        void trackEvent('ai_dialog_send_error', { scenarioId: scenario.id, exchangeIndex });
        setLastErrorKind(classifyPremiumDialogError(error));
        setLastErrorMessage(getPremiumDialogErrorMessage(error, { hasPremiumAccess, lang }));
      } finally {
        setSending(false);
      }
    },
    [sending, ended, hasPremiumAccess, dialogAccess, userExchanges, buildHistory, scenario, router, lang, gameRequestFields, applyTurnState, speakAiReply],
  );
  sendVoiceTextRef.current = (text: string) => {
    void send(text);
  };
  finalizeConversationSendRef.current = () => {
    if (!conversationReleasePendingRef.current) return;
    conversationReleasePendingRef.current = false;
    if (conversationSendTimerRef.current != null) {
      clearTimeout(conversationSendTimerRef.current);
      conversationSendTimerRef.current = null;
    }
    const text = latestTranscriptRef.current.trim();
    cleanupVoiceInputListeners();
    restoreLoudPlaybackMode();
    if (voiceInputMountedRef.current) setVoiceInputStatus('idle');
    if (text) sendVoiceTextRef.current(text);
  };

  // ── Press-and-hold для разговорного режима ─────────────────────────────────
  // Grace-таймер отложенной авто-отправки после отпускания пальца.
  const clearConversationSendTimer = useCallback(() => {
    if (conversationSendTimerRef.current != null) {
      clearTimeout(conversationSendTimerRef.current);
      conversationSendTimerRef.current = null;
    }
  }, []);

  // Любой голосовой ввод использует один жест: держим кнопку, пока говорим.
  // Разговорный режим отличается только авто-отправкой и озвучкой ответа.
  const handleMicPressIn = useCallback(() => {
    if (sending || ended || aiSpeaking) return;
    if (conversationReleasePendingRef.current) return;
    holdPressActiveRef.current = true;
    clearConversationSendTimer();
    latestTranscriptRef.current = '';
    void startVoiceInput();
  }, [sending, ended, aiSpeaking, clearConversationSendTimer, startVoiceInput]);

  // Отпустил микрофон: сразу гасим красное active-состояние и останавливаем
  // recognizer. В разговорном режиме после финального result ещё авто-отправляем.
  const handleMicPressOut = useCallback(() => {
    holdPressActiveRef.current = false;
    voiceInputGenerationRef.current += 1;
    clearRecognizerWatchdog();
    if (voiceInputStatusRef.current === 'requesting') {
      conversationReleasePendingRef.current = false;
      cleanupVoiceInputListeners();
      try {
        speechModule?.abort();
      } catch {
        /* no-op */
      }
      restoreLoudPlaybackMode();
      setVoiceInputStatus('idle');
      return;
    }
    if (voiceInputStatusRef.current !== 'listening') return;
    conversationReleasePendingRef.current = conversationModeRef.current;
    setVoiceInputStatus('finishing');
    try {
      speechModule?.stop();
    } catch {
      /* сервис мог умереть — не мешаем */
    }
    if (conversationModeRef.current) {
      clearConversationSendTimer();
      conversationSendTimerRef.current = setTimeout(() => {
        conversationSendTimerRef.current = null;
        finalizeConversationSendRef.current();
      }, CONVERSATION_SEND_GRACE_MS);
    }
  }, [
    clearRecognizerWatchdog,
    speechModule,
    clearConversationSendTimer,
    cleanupVoiceInputListeners,
  ]);

  useEffect(() => {
    return () => clearConversationSendTimer();
  }, [clearConversationSendTimer]);

  // Повтор последней отправки после ошибки сети. Реплика пользователя уже в чате,
  // поэтому НЕ пушим её заново — только заново зовём ИИ с той же историей.
  const retryLastSend = useCallback(async () => {
    if (sending || ended) return;
    const trimmed = lastSentTextRef.current.trim();
    if (!trimmed) return;
    hapticTap();
    if (!dialogAccess) {
      void trackEvent('paywall_shown', { context: 'dialog_limit', source: 'ai_dialog_retry' });
      router.replace({ pathname: '/premium_modal', params: { context: 'dialog_limit' } } as never);
      return;
    }
    void trackEvent('ai_dialog_retry', { scenarioId: scenario.id });

    // История БЕЗ последней реплики пользователя (она уже в messages, передаём как userText).
    const priorMessages = messages.slice(0, -1);
    const history: DialogChatTurn[] = priorMessages.map((m) => ({ role: m.role, content: m.text }));

    setLastErrorMessage('');
    setLastErrorKind(null);
    setSending(true);
    try {
      const res = await callPremiumDialogSend({
        mode: 'scenario',
        userText: trimmed,
        cefr: scenario.cefr,
        history,
        role: scenario.role,
        setting: scenario.setting,
        goalEn: scenario.goalEn,
        persona: scenario.persona,
        scenarioId: scenario.id,
        interfaceLang: lang,
        studyTarget,
        isPremium: hasPremiumAccess,
        ...gameRequestFields,
      });
      setMessages((prev) => [...prev, { role: 'assistant', text: res.assistantMessage }]);
      speakAiReply(res.assistantMessage);
      applyTurnState(res.turnState);
    } catch (error) {
      void trackEvent('ai_dialog_send_error', { scenarioId: scenario.id, retry: true });
      setLastErrorKind(classifyPremiumDialogError(error));
      setLastErrorMessage(getPremiumDialogErrorMessage(error, { hasPremiumAccess, lang }));
    } finally {
      setSending(false);
    }
  }, [sending, ended, hasPremiumAccess, dialogAccess, messages, scenario, router, lang, gameRequestFields, applyTurnState, speakAiReply]);

  // Приветствие уже стоит в начальном состоянии. Здесь — только телеметрия старта
  // (один раз на маунт). OpenAI зовём только после первой реплики пользователя.
  useEffect(() => {
    if (!aiDialogGateOpen) return;
    void trackEvent('ai_dialog_started', { scenarioId: scenario.id, cefr: scenario.cefr });
  }, [aiDialogGateOpen, scenario.cefr, scenario.id]);

  // Параметры маршрута могут «доехать» после первого кадра (expo-router) — тогда
  // ленивый сид взял дефолтный сценарий. Пока пользователь НИЧЕГО не написал (в чате
  // только приветствие), обновляем приветствие под реально открытый сценарий.
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length !== 1 || prev[0].role !== 'assistant') return prev;
      const fresh = buildScenarioGreeting(scenario);
      if (prev[0].text === fresh) return prev;
      return [{ role: 'assistant', text: fresh }];
    });
  }, [scenario]);

  const finishDialog = useCallback(() => {
    if (ended || userExchanges <= 0) return;
    hapticTap();
    setEnded(true);
    void trackEvent('ai_dialog_completed', { scenarioId: scenario.id, exchanges: userExchanges });
    // Локально помечаем сценарий пройденным — список диалогов покажет «Пройдено»
    // и сдвинет блок «Продолжить» на следующий сценарий. Идемпотентно + best-effort.
    void markDialogCompleted(scenario.id);
    // Бесплатный диалог уже отмечен использованным на первой реплике — здесь не дублируем.
  }, [ended, scenario.id, userExchanges]);

  // Диалог завершён → один раз запрашиваем финальный разбор фраз ученика.
  // Транскрипт шлём без [[...]]-маркеров: тьютору-ревьюеру они только мешают.
  useEffect(() => {
    if (!ended || userExchanges <= 0 || reviewRequestedRef.current) return;
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
      goalEn: scenario.goalEn,
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
  }, [ended, userExchanges, messages, scenario, lang]);

  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(id);
  }, [messages.length, sending]);

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

  // Секция «Разбор твоих фраз» — общая для игрового вердикта и нейтрального
  // финала. Показывает похвалу, мягкие исправления «как сказал → как естественнее»
  // с пояснением на языке интерфейса и один совет на следующий раз.
  const renderDialogReview = () => {
    if (reviewStatus !== 'loading' && (reviewStatus !== 'ready' || !review)) return null;
    const sectionTitle = triLang(lang, {
      ru: 'Разбор твоих фраз',
      uk: 'Розбір твоїх фраз',
      es: 'Análisis de tus frases',
      'pt-BR': 'Análise das suas frases',
      vi: 'Phân tích câu của bạn',
      id: 'Ulasan kalimatmu',
      tr: 'Cümlelerinin analizi',
      pl: 'Analiza twoich zdań',
    });
    return (
      <View
        style={{
          backgroundColor: glassFill(t.bgSurface, 0.46),
          borderRadius: 12,
          padding: 12,
          marginTop: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Ionicons name="school-outline" size={15} color={t.accent} />
          <Text style={{ color: t.accent, fontSize: f.label, fontWeight: '900' }} maxFontSizeMultiplier={1.2}>
            {sectionTitle}
          </Text>
        </View>
        {reviewStatus === 'loading' ? (
          <View>
            <SkeletonBlock width={220} height={13} borderRadius={6} />
            <View style={{ height: 8 }} />
            <SkeletonBlock width={170} height={13} borderRadius={6} />
          </View>
        ) : (
          <View>
            {!!review?.praise && (
              <Text
                style={{ color: t.textSecond, fontSize: f.sub, lineHeight: Math.round(f.sub * 1.4) }}
                maxFontSizeMultiplier={1.2}
              >
                {review.praise}
              </Text>
            )}
            {(review?.corrections ?? []).length === 0 ? (
              <Text
                style={{ color: t.correct, fontSize: f.sub, fontWeight: '700', marginTop: 8 }}
                maxFontSizeMultiplier={1.2}
              >
                {triLang(lang, {
                  ru: 'Ошибок не нашлось — отличная работа!',
                  uk: 'Помилок не знайшлося — чудова робота!',
                  es: '¡Sin errores — buen trabajo!',
                  'pt-BR': 'Sem erros — ótimo trabalho!',
                  vi: 'Không có lỗi — làm tốt lắm!',
                  id: 'Tidak ada kesalahan — kerja bagus!',
                  tr: 'Hata yok — harika iş!',
                  pl: 'Bez błędów — świetna robota!',
                })}
              </Text>
            ) : (
              (review?.corrections ?? []).map((c, ci) => (
                <View
                  key={ci}
                  style={{
                    marginTop: 10,
                    paddingTop: ci === 0 ? 0 : 10,
                    borderTopWidth: ci === 0 ? 0 : 0.5,
                    borderTopColor: t.border,
                  }}
                >
                  <Text style={{ color: t.textMuted, fontSize: f.sub }} maxFontSizeMultiplier={1.2}>
                    {c.original}
                  </Text>
                  <Text
                    style={{ color: t.correct, fontSize: f.sub, fontWeight: '700', marginTop: 2 }}
                    maxFontSizeMultiplier={1.2}
                  >
                    → {c.corrected}
                  </Text>
                  {!!c.note && (
                    <Text
                      style={{
                        color: t.textSecond,
                        fontSize: f.caption,
                        marginTop: 3,
                        lineHeight: Math.round(f.caption * 1.35),
                      }}
                      maxFontSizeMultiplier={1.2}
                    >
                      {c.note}
                    </Text>
                  )}
                </View>
              ))
            )}
            {!!review?.tip && (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 12 }}>
                <Ionicons name="bulb-outline" size={14} color={t.accent} style={{ marginTop: 2 }} />
                <Text
                  style={{
                    color: t.textSecond,
                    fontSize: f.sub,
                    flex: 1,
                    lineHeight: Math.round(f.sub * 1.4),
                  }}
                  maxFontSizeMultiplier={1.2}
                >
                  {review.tip}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const lastIsAssistant = messages.length > 0 && messages[messages.length - 1].role === 'assistant';
  const voiceInputHint =
    // Разговорный режим: свои подсказки имеют приоритет («Отвечает…» → «Говори…»
    // при удержании → «Зажми и говори» в покое).
    conversationMode && aiSpeaking
      ? triLang(lang, {
          ru: 'Отвечает…',
          uk: 'Відповідає…',
          es: 'Respondiendo…',
          'pt-BR': 'Respondendo…',
          vi: 'Đang trả lời…',
          id: 'Menjawab…',
          tr: 'Yanıtlıyor…',
          pl: 'Odpowiada…',
        })
      : voiceInputStatus === 'requesting'
        ? triLang(lang, {
            ru: 'Готовлю микрофон… удерживай кнопку',
            uk: 'Готую мікрофон… тримай кнопку',
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
            es: 'Procesando lo dicho…',
            'pt-BR': 'Processando o que você disse…',
            vi: 'Đang xử lý lời nói…',
            id: 'Memproses ucapan…',
            tr: 'Söylediklerin işleniyor…',
            pl: 'Przetwarzam wypowiedź…',
          })
      : conversationMode && voiceInputStatus === 'listening'
        ? triLang(lang, {
            ru: 'Говори… (отпусти, когда закончишь)',
            uk: 'Говори… (відпусти, коли закінчиш)',
            es: 'Habla… (suelta al terminar)',
            'pt-BR': 'Fale… (solte ao terminar)',
            vi: 'Nói… (thả ra khi xong)',
            id: 'Bicara… (lepas saat selesai)',
            tr: 'Konuş… (bitince bırak)',
            pl: 'Mów… (puść, gdy skończysz)',
          })
        : conversationMode && voiceInputStatus === 'idle' && !sending
          ? triLang(lang, {
              ru: 'Зажми микрофон и говори',
              uk: 'Затисни мікрофон і говори',
              es: 'Mantén pulsado el micro y habla',
              'pt-BR': 'Segure o microfone e fale',
              vi: 'Giữ micrô và nói',
              id: 'Tahan mikrofon dan bicara',
              tr: 'Mikrofona basılı tut ve konuş',
              pl: 'Przytrzymaj mikrofon i mów',
            })
          : voiceInputStatus === 'listening'
      ? triLang(lang, {
          ru: 'Говори… отпусти, когда закончишь',
          uk: 'Говори… відпусти, коли закінчиш',
          es: 'Habla… suelta al terminar',
          'pt-BR': 'Fale… solte ao terminar',
          vi: 'Nói… thả ra khi xong',
          id: 'Bicara… lepas setelah selesai',
          tr: 'Konuş… bitince bırak',
          pl: 'Mów… puść, gdy skończysz',
        })
      : !conversationMode && voiceInputStatus === 'idle' && !sending
        ? triLang(lang, {
            ru: 'Зажми микрофон и продиктуй ответ',
            uk: 'Затисни мікрофон і продиктуй відповідь',
            es: 'Mantén pulsado el micro y dicta tu respuesta',
            'pt-BR': 'Segure o microfone e dite sua resposta',
            vi: 'Giữ micrô và đọc câu trả lời',
            id: 'Tahan mikrofon dan diktekan jawaban',
            tr: 'Mikrofona basılı tutup yanıtını söyle',
            pl: 'Przytrzymaj mikrofon i podyktuj odpowiedź',
          })
      : voiceInputStatus === 'denied'
        ? triLang(lang, {
            ru: 'Нужен доступ к микрофону',
            uk: 'Потрібен доступ до мікрофона',
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
              es: 'La entrada por voz no está disponible en este dispositivo',
              'pt-BR': 'A entrada por voz não está disponível neste aparelho',
              vi: 'Thiết bị này chưa hỗ trợ nhập bằng giọng nói',
              id: 'Input suara tidak tersedia di perangkat ini',
              tr: 'Sesle giriş bu cihazda kullanılamıyor',
              pl: 'Wpisywanie głosem nie działa na tym urządzeniu',
            })
          : '';

  if (!aiDialogGateOpen) {
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
              hapticTap();
              router.replace('/(tabs)/lessons' as any);
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
              {triLang(lang, { ru: 'Назад', uk: 'Назад', es: 'Volver', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wróć' })}
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header — мессенджер-стиль: аватар собеседника + имя + статус «онлайн» */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 10,
            gap: 4,
            borderBottomWidth: 0.5,
            borderBottomColor: t.border,
          }}
        >
          <TouchableOpacity
            onPress={onBack}
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, {
              ru: 'Назад',
              uk: 'Назад',
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

          {/* Аватар: иконка сценария на акцентном круге */}
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: t.accentBg,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10,
              borderWidth: 0,
              borderColor: t.accent + '40',
            }}
          >
            <Ionicons name={scenario.icon as any} size={20} color={t.accent} />
            {/* «онлайн»-точка */}
            <View
              style={{
                position: 'absolute',
                right: -1,
                bottom: -1,
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: t.correct,
                borderWidth: 0,
                borderColor: t.bgPrimary,
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
                    es: 'Ánimo del interlocutor',
                    'pt-BR': 'Humor do interlocutor',
                    vi: 'Tâm trạng người kia',
                    id: 'Suasana hati lawan bicara',
                    tr: 'Karşıdakinin ruh hâli',
                    pl: 'Nastrój rozmówcy',
                  })}
                  style={{ fontSize: f.body }}
                >
                  {moodToFace(mood)}
                </Text>
              ) : (
                // Имя/место убраны по просьбе (усечённое «М.» не помогало). Когда
                // смайла нет (не игра или диалог завершён) — короткий нейтральный
                // заголовок, чтобы шапка не была пустой.
                <Text
                  style={{ fontWeight: '800', color: t.textPrimary, fontSize: f.body, flexShrink: 1 }}
                  numberOfLines={1}
                >
                  {dialogScenarioTitle(scenario, lang)}
                </Text>
              )}
            </View>
            {/* Вторая строка с местом сцены («в ресторане» и т.п.) и имя собеседника
                убраны по просьбе: и так понятно, что открываем; длинное место/имя
                уходило в «...». В игре в шапке остаётся только лицо-настроение. */}
          </View>

          {/* Счётчик переводов: 3 точки, что гаснут по мере использования.
              Видим, пока диалог идёт — показывает, сколько переводов осталось. */}
          {!ended && (
            <View
              accessibilityRole="text"
              accessibilityLabel={triLang(lang, {
                ru: `Переводов осталось: ${translateRemaining} из ${TRANSLATE_LIMIT_PER_DIALOG}`,
                uk: `Перекладів залишилось: ${translateRemaining} з ${TRANSLATE_LIMIT_PER_DIALOG}`,
                es: `Traducciones restantes: ${translateRemaining} de ${TRANSLATE_LIMIT_PER_DIALOG}`,
                'pt-BR': `Traduções restantes: ${translateRemaining} de ${TRANSLATE_LIMIT_PER_DIALOG}`,
                vi: `Còn lại ${translateRemaining}/${TRANSLATE_LIMIT_PER_DIALOG} bản dịch`,
                id: `Sisa terjemahan: ${translateRemaining} dari ${TRANSLATE_LIMIT_PER_DIALOG}`,
                tr: `Kalan çeviri: ${translateRemaining}/${TRANSLATE_LIMIT_PER_DIALOG}`,
                pl: `Pozostałe tłumaczenia: ${translateRemaining} z ${TRANSLATE_LIMIT_PER_DIALOG}`,
              })}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                marginRight: 8,
                paddingHorizontal: 8,
                paddingVertical: 5,
                borderRadius: 12,
                backgroundColor: t.bgCard,
              }}
            >
              <Ionicons name="language-outline" size={13} color={t.textSecond} />
              {Array.from({ length: TRANSLATE_LIMIT_PER_DIALOG }).map((_, di) => {
                const spent = di >= translateRemaining;
                return (
                  <View
                    key={di}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: spent ? t.border : t.accent,
                      opacity: spent ? 0.5 : 1,
                    }}
                  />
                );
              })}
            </View>
          )}

          {!ended && userExchanges > 0 ? (
            <TouchableOpacity
              onPress={finishDialog}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel={triLang(lang, {
                ru: 'Завершить диалог',
                uk: 'Завершити діалог',
                es: 'Terminar diálogo',
                'pt-BR': 'Encerrar diálogo',
                vi: 'Kết thúc cuộc đối thoại',
                id: 'Akhiri dialog',
                tr: 'Diyaloğu bitir',
                pl: 'Zakończ dialog',
              })}
              style={{
                minHeight: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 14,
                backgroundColor: t.bgCard,
              }}
            >
              <Text style={{ color: t.textPrimary, fontSize: f.label, fontWeight: '800' }}>
                {triLang(lang, {
                  ru: 'Завершить',
                  uk: 'Завершити',
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

          {/* Кнопка «Сообщить об ошибке» — красный флаг в правом углу хедера,
              виден весь диалог, не зависит от состояния (идёт/завершён). */}
          <ReportErrorButton
            screen="ai_dialog"
            dataId={`ai_dialog_${scenario.id ?? 'unknown'}`}
            dataText={dialogScenarioTitle(scenario, lang)}
            variant="icon-flag"
            accessibilityLabel="Сообщить об ошибке в диалоге"
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: t.bgCard,
              marginLeft: 6,
            }}
          />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          // H11: Android — нужен явный 'height', иначе клавиатура перекрывает поле ввода.
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={8}
        >
          <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 16 }}>
            {messages.map((m, i) => {
              const isUser = m.role === 'user';
              // Анимируем появление ТОЛЬКО для приходящих позже реплик. Самое первое
              // приветствие (i === 0) всегда видно сразу — никакого fade из opacity:0,
              // чтобы «первая реплика» гарантированно отображалась.
              const isLast = i === messages.length - 1 && i > 0;
              return (
                <Animated.View
                  key={i}
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
                    marginBottom: 12,
                  }}
                >
                  {/* Мини-аватар собеседника слева от его пузыря */}
                  {!isUser && (
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: t.accentBg,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 8,
                      }}
                    >
                      <Ionicons name={scenario.icon as any} size={15} color={t.accent} />
                    </View>
                  )}

                  {isUser ? (
                    // Пузырь пользователя — цветной, справа, с тенью и «хвостиком».
                    <View
                      style={{
                        backgroundColor: t.accent,
                        borderRadius: 20,
                        borderBottomRightRadius: 6,
                        paddingHorizontal: 16,
                        paddingVertical: 11,
                        maxWidth: '82%',
                        shadowColor: t.shadowDark,
                        shadowOpacity: 0.25,
                        shadowRadius: 6,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: 2,
                      }}
                    >
                      <Text
                        style={{
                          color: t.correctText,
                          fontSize: f.bodyLg,
                          fontWeight: '600',
                          lineHeight: Math.round(f.bodyLg * 1.4),
                        }}
                        maxFontSizeMultiplier={1.2}
                      >
                        {m.text}
                      </Text>
                    </View>
                  ) : (
                    // Пузырь собеседника — слева, светлая карточка, «хвостик» снизу-слева.
                    <View
                      style={{
                        backgroundColor: glassFill(t.bgCard, 0.46),
                        borderRadius: 20,
                        borderBottomLeftRadius: 6,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        maxWidth: '82%',
                        flexShrink: 1,
                        shadowColor: t.shadowDark,
                        shadowOpacity: 0.18,
                        shadowRadius: 6,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: 1,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, flexShrink: 1 }}>
                        {flipped[i] && translations[i] != null ? (
                          // Перевод на язык интерфейса: обычный текст, без подсветки
                          // ключевых фраз (это другой язык) и без озвучки (TTS — для EN).
                          <Text
                            style={{
                              color: t.textPrimary,
                              fontSize: f.bodyLg,
                              fontWeight: '600',
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
                                      speak(seg.text, undefined, { language: 'en-US', voice: '' });
                                    }}
                                    style={{
                                      color: t.accent,
                                      fontWeight: '800',
                                      textDecorationLine: 'underline',
                                    }}
                                  >
                                    {seg.text}
                                  </Text>
                                ) : (
                                  // Обычный текст: тап озвучивает всю реплику (как раньше).
                                  <Text
                                    key={si}
                                    onPress={() => {
                                      if (voiceInputStatus === 'requesting' || voiceInputStatus === 'listening') return;
                                      hapticTap();
                                      void trackEvent('ai_dialog_tts_used', { scenarioId: scenario.id });
                                      speak(stripMarkers(m.text), undefined, { language: 'en-US', voice: '' });
                                    }}
                                  >
                                    {seg.text}
                                  </Text>
                                ),
                              )}
                            </Text>
                            <TouchableOpacity
                              onPress={() => {
                                if (voiceInputStatus === 'requesting' || voiceInputStatus === 'listening') return;
                                hapticTap();
                                void trackEvent('ai_dialog_tts_used', { scenarioId: scenario.id });
                                speak(stripMarkers(m.text), undefined, { language: 'en-US', voice: '' });
                              }}
                              activeOpacity={0.6}
                              disabled={voiceInputStatus === 'requesting' || voiceInputStatus === 'listening'}
                              accessibilityRole="button"
                              accessibilityLabel={triLang(lang, {
                                ru: 'Озвучить реплику',
                                uk: 'Озвучити репліку',
                                es: 'Reproducir frase',
                                'pt-BR': 'Reproduzir fala',
                                vi: 'Phát câu trả lời',
                                id: 'Putar ucapan',
                                tr: 'Repliği seslendir',
                                pl: 'Odtwórz kwestię',
                              })}
                              style={{
                                width: 44,
                                minHeight: 44,
                                flexShrink: 0,
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginTop: -8,
                                marginRight: -10,
                              }}
                            >
                              <Ionicons name="volume-medium-outline" size={20} color={t.textSecond} />
                            </TouchableOpacity>
                          </>
                        )}
                      </View>

                      {/* Кнопка «Показать/Скрыть перевод» под репликой собеседника.
                          Грузится — skeleton-shimmer (правило: загрузка = скелетон, не спиннер).
                          Прячется, когда лимит исчерпан И эту реплику ещё не открывали. */}
                      {(() => {
                        const isTranslating = translatingIdx === i;
                        const hasTranslation = translations[i] != null;
                        const isFlipped = flipped[i] === true;
                        // Скрываем кнопку только у НЕ открытых реплик при исчерпанном лимите.
                        if (!shouldShowTranslateButton(hasTranslation, translateUsed, TRANSLATE_LIMIT_PER_DIALOG)) {
                          return null;
                        }
                        if (isTranslating) {
                          return (
                            <View style={{ marginTop: 8 }}>
                              <SkeletonBlock width={120} height={13} borderRadius={6} />
                            </View>
                          );
                        }
                        // Перевод этой реплики только что упал — показываем причину и
                        // кнопку «Повторить» (а не пустоту). Лимит не был потрачен.
                        if (translateErrorIdx === i && !hasTranslation) {
                          return (
                            <TouchableOpacity
                              onPress={() => void toggleTranslation(i, m.text)}
                              disabled={translatingIdx != null}
                              activeOpacity={0.7}
                              accessibilityRole="button"
                              accessibilityLabel={triLang(lang, {
                                ru: 'Не получилось перевести. Перевести снова',
                                uk: 'Не вдалося перекласти. Перекласти знову',
                                es: 'No se pudo traducir. Reintentar',
                                'pt-BR': 'Não foi possível traduzir. Tentar de novo',
                                vi: 'Không dịch được. Thử lại',
                                id: 'Gagal menerjemahkan. Coba lagi',
                                tr: 'Çevrilemedi. Tekrar dene',
                                pl: 'Nie udało się przetłumaczyć. Spróbuj ponownie',
                              })}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 5,
                                marginTop: 8,
                                alignSelf: 'flex-start',
                              }}
                            >
                              <Ionicons name="refresh" size={14} color={t.textMuted} />
                              <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '800' }}>
                                {triLang(lang, {
                                  ru: 'Сбой · Перевести снова',
                                  uk: 'Збій · Перекласти знову',
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
                        const label = isFlipped
                          ? triLang(lang, {
                              ru: 'Скрыть перевод',
                              uk: 'Сховати переклад',
                              es: 'Ocultar traducción',
                              'pt-BR': 'Ocultar tradução',
                              vi: 'Ẩn bản dịch',
                              id: 'Sembunyikan terjemahan',
                              tr: 'Çeviriyi gizle',
                              pl: 'Ukryj tłumaczenie',
                            })
                          : triLang(lang, {
                              ru: 'Показать перевод',
                              uk: 'Показати переклад',
                              es: 'Mostrar traducción',
                              'pt-BR': 'Mostrar tradução',
                              vi: 'Hiện bản dịch',
                              id: 'Tampilkan terjemahan',
                              tr: 'Çeviriyi göster',
                              pl: 'Pokaż tłumaczenie',
                            });
                        return (
                          <TouchableOpacity
                            onPress={() => void toggleTranslation(i, m.text)}
                            disabled={translatingIdx != null}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel={label}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 5,
                              marginTop: 8,
                              alignSelf: 'flex-start',
                            }}
                          >
                            <Ionicons
                              name={isFlipped ? 'swap-horizontal' : 'language-outline'}
                              size={14}
                              color={t.accent}
                            />
                            <Text style={{ color: t.accent, fontSize: f.label, fontWeight: '800' }}>
                              {label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })()}
                    </View>
                  )}
                </Animated.View>
              );
            })}

            {sending && (
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: t.accentBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 8,
                  }}
                >
                  <Ionicons name={scenario.icon as any} size={15} color={t.accent} />
                </View>
                <AiTypingBubble
                  bubbleColor={t.bgCard}
                  borderColor={'transparent'}
                  dotColor={t.accent}
                  glowColor={t.accent + '18'}
                />
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
                    <Ionicons name="refresh" size={16} color={t.correctText} />
                    <Text style={{ color: t.correctText, fontWeight: '800', fontSize: f.label }}>
                      {dialogRetryLabel(lang)}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Модал-вердикт «диалога как игры»: исход + реакция персонажа +
                чек-лист целей + разбор. Показывается, когда диалог завершился
                терминальным исходом (success/lost_patience/stalled). */}
            {ended && gameEnabled && isTerminalOutcome(outcome) && !hasPremiumAccess && (
              <View
                style={{
                  backgroundColor: glassFill(t.bgSurface, 0.46),
                  borderRadius: 18,
                  padding: 18,
                  marginTop: 6,
                  marginBottom: 6,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: t.accentBg,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="lock-closed-outline" size={18} color={t.accent} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '900' }} numberOfLines={2}>
                      {outcomeTitle(outcome, lang)}
                    </Text>
                    <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '800', marginTop: 2 }}>
                      {triLang(lang, {
                        ru: 'AI-разбор ошибок — в Plus',
                        uk: 'AI-розбір помилок — у Plus',
                        es: 'Análisis de errores con IA — en Plus',
                        'pt-BR': 'Análise de erros com IA — no Plus',
                        vi: 'Phân tích lỗi bằng AI — trong Plus',
                        id: 'Analisis kesalahan AI — di Plus',
                        tr: 'AI hata analizi — Plus ile',
                        pl: 'Analiza błędów AI — w Plus',
                      })}
                    </Text>
                  </View>
                  <View
                    style={{
                      borderRadius: 9,
                      paddingHorizontal: 7,
                      paddingVertical: 3,
                      backgroundColor: t.accent,
                    }}
                  >
                    <Text style={{ color: t.correctText, fontSize: 10, fontWeight: '900' }}>PLUS</Text>
                  </View>
                </View>

                <View
                  style={{
                    backgroundColor: glassFill(t.bgCard, 0.32),
                    borderRadius: 14,
                    padding: 12,
                    gap: 8,
                  }}
                >
                  {[
                    triLang(lang, {
                      ru: 'где фраза звучала неестественно',
                      uk: 'де фраза звучала неприродно',
                      es: 'dónde la frase sonó poco natural',
                      'pt-BR': 'onde a frase soou pouco natural',
                      vi: 'chỗ câu nói chưa tự nhiên',
                      id: 'bagian frasa yang kurang alami',
                      tr: 'cümlenin nerede doğal durmadığı',
                      pl: 'gdzie zdanie brzmiało nienaturalnie',
                    }),
                    triLang(lang, {
                      ru: 'что исправить в следующей реплике',
                      uk: 'що виправити в наступній репліці',
                      es: 'qué corregir en la siguiente respuesta',
                      'pt-BR': 'o que corrigir na próxima fala',
                      vi: 'nên sửa gì ở lượt nói tiếp theo',
                      id: 'apa yang diperbaiki di balasan berikutnya',
                      tr: 'sonraki yanıtta neyi düzeltmek gerektiği',
                      pl: 'co poprawić w następnej odpowiedzi',
                    }),
                    triLang(lang, {
                      ru: 'как сказать это естественнее',
                      uk: 'як сказати це природніше',
                      es: 'cómo decirlo de forma más natural',
                      'pt-BR': 'como dizer isso de forma mais natural',
                      vi: 'cách nói tự nhiên hơn',
                      id: 'cara mengatakannya lebih alami',
                      tr: 'bunu daha doğal söyleme yolu',
                      pl: 'jak powiedzieć to naturalniej',
                    }),
                  ].map((line) => (
                    <View key={line} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="sparkles-outline" size={15} color={t.textMuted} />
                      <Text style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '700', flex: 1 }}>
                        {line}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                  <TouchableOpacity
                    onPress={() => {
                      hapticTap();
                      void trackEvent('paywall_shown', { context: 'dialog_analysis', source: 'dialog_analysis' });
                      router.push({
                        pathname: '/premium_modal',
                        params: { context: 'dialog_analysis', source: 'dialog_analysis' },
                      } as never);
                    }}
                    activeOpacity={0.84}
                    style={{
                      flex: 1,
                      borderRadius: 14,
                      paddingVertical: 13,
                      alignItems: 'center',
                      backgroundColor: t.accent,
                    }}
                  >
                    <Text style={{ color: t.correctText, fontWeight: '900', fontSize: f.body }}>
                      {triLang(lang, {
                        ru: 'Открыть Plus',
                        uk: 'Відкрити Plus',
                        es: 'Abrir Plus',
                        'pt-BR': 'Abrir Plus',
                        vi: 'Mở Plus',
                        id: 'Buka Plus',
                        tr: 'Plus’ı aç',
                        pl: 'Otwórz Plus',
                      })}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={onBack}
                    activeOpacity={0.84}
                    style={{
                      flex: 1,
                      borderRadius: 14,
                      paddingVertical: 13,
                      alignItems: 'center',
                      backgroundColor: t.bgSurface,
                    }}
                  >
                    <Text style={{ color: t.textPrimary, fontWeight: '900', fontSize: f.body }}>
                      {triLang(lang, {
                        ru: 'К диалогам',
                        uk: 'До діалогів',
                        es: 'A los diálogos',
                        'pt-BR': 'Aos diálogos',
                        vi: 'Về danh sách',
                        id: 'Ke daftar dialog',
                        tr: 'Diyaloglara',
                        pl: 'Do dialogów',
                      })}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {ended && gameEnabled && isTerminalOutcome(outcome) && hasPremiumAccess && (
              <View
                style={{
                  backgroundColor: t.bgCard,
                  borderRadius: 18,
                  padding: 18,
                  borderWidth: outcome === 'success' || outcome === 'lost_patience' ? 2 : 0,
                  borderColor:
                    outcome === 'success'
                      ? t.correct
                      : outcome === 'lost_patience'
                        ? t.wrong
                        : 'transparent',
                  marginTop: 6,
                  marginBottom: 6,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <Text style={{ fontSize: f.h2 }} maxFontSizeMultiplier={1.2}>
                    {outcome === 'success' ? '🎉' : outcome === 'lost_patience' ? '😠' : '💤'}
                  </Text>
                  <Text
                    style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '900', flex: 1 }}
                    numberOfLines={2}
                    maxFontSizeMultiplier={1.2}
                  >
                    {outcomeTitle(outcome, lang)}
                  </Text>
                  {/* Финальное настроение собеседника (аудит M4: дизайн обещал
                      финальный смайл в модале). */}
                  <Text
                    style={{ fontSize: f.bodyLg }}
                    maxFontSizeMultiplier={1.2}
                    accessibilityLabel={triLang(lang, {
                      ru: 'Финальное настроение собеседника',
                      uk: 'Фінальний настрій співрозмовника',
                      es: 'Ánimo final del interlocutor',
                      'pt-BR': 'Humor final do interlocutor',
                      vi: 'Tâm trạng cuối của người kia',
                      id: 'Suasana hati akhir lawan bicara',
                      tr: 'Karşıdakinin son ruh hâli',
                      pl: 'Końcowy nastrój rozmówcy',
                    })}
                  >
                    {moodToFace(mood)}
                  </Text>
                </View>

                {/* Реакция персонажа от 1-го лица (если пришла). */}
                {characterReaction.length > 0 && (
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: 10,
                      backgroundColor: glassFill(t.bgCard, 0.32),
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: t.accentBg,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name={scenario.icon as any} size={17} color={t.accent} />
                    </View>
                    <Text
                      style={{
                        color: t.textSecond,
                        fontSize: f.sub,
                        fontStyle: 'italic',
                        flex: 1,
                        lineHeight: Math.round(f.sub * 1.4),
                      }}
                      maxFontSizeMultiplier={1.2}
                      numberOfLines={6}
                    >
                      {personaName ? `${personaName}: ` : ''}
                      {characterReaction}
                    </Text>
                  </View>
                )}

                {/* Чек-лист под-целей: выполнено / упущено. */}
                {objectives.length > 0 && (
                  <View style={{ marginBottom: coachTips.length > 0 ? 12 : 0 }}>
                    {objectives.map((o) => {
                      const done = objectivesMet.has(o.id);
                      return (
                        <View
                          key={o.id}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}
                        >
                          <Ionicons
                            name={done ? 'checkmark-circle' : 'ellipse-outline'}
                            size={18}
                            color={done ? t.correct : t.textMuted}
                          />
                          <Text
                            style={{
                              color: done ? t.textPrimary : t.textMuted,
                              fontSize: f.sub,
                              flex: 1,
                              textDecorationLine: done ? 'none' : 'none',
                            }}
                            numberOfLines={2}
                          >
                            {objectiveLabel(o, lang)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Разбор «что сказать в следующий раз». */}
                {coachTips.length > 0 && (
                  <View
                    style={{
                      backgroundColor: t.accentBg,
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <Ionicons name="bulb-outline" size={15} color={t.accent} />
                      <Text style={{ color: t.accent, fontSize: f.label, fontWeight: '900' }}>
                        {triLang(lang, {
                          ru: 'На будущее',
                          uk: 'На майбутнє',
                          es: 'Para la próxima',
                          'pt-BR': 'Para a próxima',
                          vi: 'Lần sau',
                          id: 'Untuk lain kali',
                          tr: 'Bir dahaki sefere',
                          pl: 'Na przyszłość',
                        })}
                      </Text>
                    </View>
                    {coachTips.map((tip, ti) => (
                      <Text
                        key={ti}
                        style={{
                          color: t.textSecond,
                          fontSize: f.sub,
                          lineHeight: Math.round(f.sub * 1.4),
                          marginTop: ti === 0 ? 0 : 4,
                        }}
                        maxFontSizeMultiplier={1.2}
                      >
                        • {tip}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Разбор фраз ученика: похвала + исправления + совет. */}
                {renderDialogReview()}

                {/* Действия: ещё раз / к диалогам. */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                  <TouchableOpacity
                    onPress={() => {
                      hapticTap();
                      void trackEvent('ai_dialog_retry_scenario', { scenarioId: scenario.id, outcome });
                      // Перезапуск того же сценария «вместо» текущего экрана — свап, не push.
                      markNextNavigationAsReplace();
                      router.replace({
                        pathname: '/ai_dialog_session',
                        params: { scenarioId: scenario.id },
                      } as never);
                    }}
                    activeOpacity={0.84}
                    style={{
                      flex: 1,
                      borderRadius: 14,
                      paddingVertical: 13,
                      alignItems: 'center',
                      backgroundColor: t.accent,
                    }}
                  >
                    <Text style={{ color: t.correctText, fontWeight: '900', fontSize: f.body }}>
                      {triLang(lang, {
                        ru: 'Ещё раз',
                        uk: 'Ще раз',
                        es: 'Otra vez',
                        'pt-BR': 'De novo',
                        vi: 'Lần nữa',
                        id: 'Sekali lagi',
                        tr: 'Tekrar',
                        pl: 'Jeszcze raz',
                      })}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={onBack}
                    activeOpacity={0.84}
                    style={{
                      flex: 1,
                      borderRadius: 14,
                      paddingVertical: 13,
                      alignItems: 'center',
                      backgroundColor: t.bgSurface,
                    }}
                  >
                    <Text style={{ color: t.textPrimary, fontWeight: '900', fontSize: f.body }}>
                      {triLang(lang, {
                        ru: 'К диалогам',
                        uk: 'До діалогів',
                        es: 'A los diálogos',
                        'pt-BR': 'Aos diálogos',
                        vi: 'Về danh sách',
                        id: 'Ke daftar dialog',
                        tr: 'Diyaloglara',
                        pl: 'Do dialogów',
                      })}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Старый «нейтральный» финал — когда игра не активна ИЛИ юзер вышел
                кнопкой «Завершить» без терминального исхода. */}
            {ended && !(gameEnabled && isTerminalOutcome(outcome)) && (
              <View
                style={{
                  backgroundColor: glassFill(t.bgSurface, 0.46),
                  borderRadius: 16,
                  padding: 16,
                  marginTop: 6,
                }}
              >
                <Text
                  style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700' }}
                  maxFontSizeMultiplier={1.2}
                >
                  {triLang(lang, {
                    ru: 'Разговор завершён',
                    uk: 'Розмову завершено',
                    es: 'Conversación terminada',
                    'pt-BR': 'Conversa encerrada',
                    vi: 'Cuộc trò chuyện đã kết thúc',
                    id: 'Percakapan selesai',
                    tr: 'Sohbet tamamlandı',
                    pl: 'Rozmowa zakończona',
                  })}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 6 }}>
                  {triLang(lang, {
                    ru: `Твоих реплик: ${userExchanges}. Ориентир: около ${RECOMMENDED_EXCHANGES}, но завершать можно вручную.`,
                    uk: `Твоїх реплік: ${userExchanges}. Орієнтир: близько ${RECOMMENDED_EXCHANGES}, але завершити можна вручну.`,
                    es: `Tus respuestas: ${userExchanges}. Guía: unas ${RECOMMENDED_EXCHANGES}, pero puedes terminar manualmente.`,
                    'pt-BR': `Suas respostas: ${userExchanges}. Referência: cerca de ${RECOMMENDED_EXCHANGES}, mas você pode encerrar manualmente.`,
                    vi: `Lượt trả lời của bạn: ${userExchanges}. Gợi ý: khoảng ${RECOMMENDED_EXCHANGES}, nhưng bạn có thể tự kết thúc.`,
                    id: `Jawabanmu: ${userExchanges}. Patokan: sekitar ${RECOMMENDED_EXCHANGES}, tetapi kamu bisa mengakhiri sendiri.`,
                    tr: `${userExchanges} yanıt verdin. Hedef yaklaşık ${RECOMMENDED_EXCHANGES}; yine de elle bitirebilirsin.`,
                    pl: `Twoje odpowiedzi: ${userExchanges}. Wskazówka: około ${RECOMMENDED_EXCHANGES}, ale możesz zakończyć ręcznie.`,
                  })}
                </Text>
                {/* Разбор фраз ученика — и при ручном «Завершить» тоже. */}
                {renderDialogReview()}
                {!hasPremiumAccess && (
                  <TouchableOpacity
                    onPress={() => {
                      hapticTap();
                      router.push({
                        pathname: '/premium_modal',
                        params: { context: 'dialog_limit' },
                      } as never);
                    }}
                    activeOpacity={0.82}
                    style={{
                      borderRadius: 16,
                      paddingVertical: 14,
                      alignItems: 'center',
                      marginTop: 14,
                      backgroundColor: t.accent,
                    }}
                  >
                    <Text style={{ color: t.correctText, fontWeight: '800', fontSize: f.body }}>
                      {triLang(lang, {
                        ru: 'Продолжить без лимита',
                        uk: 'Продовжити без ліміту',
                        es: 'Continuar sin límite',
                        'pt-BR': 'Continuar sem limite',
                        vi: 'Tiếp tục không giới hạn',
                        id: 'Lanjut tanpa batas',
                        tr: 'Sınırsız devam et',
                        pl: 'Kontynuuj bez limitu',
                      })}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>

          {/* Подсказка «Что сделать дальше» — ТОЛЬКО до первой реплики пользователя
              (userExchanges === 0): помогает начать разговор. После первого ответа
              собеседник уже реагирует на сказанное, и общая подсказка не нужна —
              дальше отталкиваемся от его реплик. */}
          {!ended && lastIsAssistant && !sending && userExchanges === 0 && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              <View
                style={{
                  borderRadius: 16,
                  backgroundColor: glassFill(t.bgSurface, 0.46),
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <Ionicons name="bulb-outline" size={18} color={t.textSecond} style={{ marginTop: 1 }} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '900' }}>
                    {triLang(lang, {
                      ru: 'Что сделать дальше',
                      uk: 'Що зробити далі',
                      es: 'Qué hacer ahora',
                      'pt-BR': 'O que fazer agora',
                      vi: 'Làm gì tiếp theo',
                      id: 'Apa langkah berikutnya',
                      tr: 'Şimdi ne yapmalı',
                      pl: 'Co zrobić dalej',
                    })}
                  </Text>
                  <Text
                    style={{
                      color: t.textMuted,
                      fontSize: f.sub,
                      lineHeight: Math.round(f.sub * 1.35),
                      marginTop: 4,
                    }}
                    maxFontSizeMultiplier={1.15}
                  >
                    {dialogScenarioNextStepHint(scenario, lang)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Поле ввода — пилюля + круглая кнопка отправки */}
          {!ended && (
            <View
              style={{
                paddingHorizontal: 12,
                paddingTop: 8,
                paddingBottom: 12,
              }}
            >
              {/* Тумблер разговорного режима «зажми и говори» — только там, где
                  голосовой ввод в принципе поддерживается устройством. */}
              {speechModule && (
                <TouchableOpacity
                  onPress={() => {
                    hapticTap();
                    if (!hasPremiumAccess) {
                      void trackEvent('paywall_shown', {
                        context: 'ai_voice_input',
                        source: 'ai_dialog_conversation_toggle',
                      });
                      router.push({
                        pathname: '/premium_modal',
                        params: { context: 'ai_voice_input', source: 'ai_dialog_conversation_toggle' },
                      } as never);
                      return;
                    }
                    setConversationMode((prev) => {
                      const next = !prev;
                      void trackEvent('ai_dialog_conversation_mode_toggled', {
                        scenarioId: scenario.id,
                        on: next,
                      });
                      if (!next) {
                        voiceInputGenerationRef.current += 1;
                        holdPressActiveRef.current = false;
                        conversationReleasePendingRef.current = false;
                        // Выключаем — гасим всё голосовое, чтобы не «зависло».
                        clearConversationSendTimer();
                        clearRecognizerWatchdog();
                        try {
                          speechModule?.abort();
                        } catch {
                          /* no-op */
                        }
                        cleanupVoiceInputListeners();
                        restoreLoudPlaybackMode();
                        setVoiceInputStatus('idle');
                      }
                      return next;
                    });
                  }}
                  activeOpacity={0.8}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: conversationMode }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    alignSelf: 'flex-start',
                    gap: 7,
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    marginBottom: 8,
                    borderRadius: 16,
                    borderWidth: conversationMode ? 1 : 0,
                    borderColor: conversationMode ? t.accent : 'transparent',
                    backgroundColor: conversationMode ? t.accent : t.bgSurface,
                  }}
                >
                  <Ionicons
                    name="chatbubbles-outline"
                    size={15}
                    color={conversationMode ? t.correctText : t.textSecond}
                  />
                  <Text
                    style={{
                      color: conversationMode ? t.correctText : t.textSecond,
                      fontSize: f.caption,
                      fontWeight: '800',
                    }}
                    maxFontSizeMultiplier={1.1}
                  >
                    {triLang(lang, {
                      ru: 'Разговор вслух',
                      uk: 'Розмова вголос',
                      es: 'Conversar en voz alta',
                      'pt-BR': 'Conversar em voz alta',
                      vi: 'Trò chuyện bằng giọng nói',
                      id: 'Ngobrol dengan suara',
                      tr: 'Sesli konuşma',
                      pl: 'Rozmowa na głos',
                    })}
                  </Text>
                  {!hasPremiumAccess && (
                    <View
                      style={{
                        borderRadius: 7,
                        paddingHorizontal: 5,
                        paddingVertical: 1,
                        backgroundColor: conversationMode ? t.bgPrimary : t.accent,
                      }}
                    >
                      <Text
                        style={{
                          color: conversationMode ? t.accent : t.correctText,
                          fontSize: 8,
                          fontWeight: '900',
                        }}
                      >
                        PLUS
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
              <TextInput
                value={input}
                onChangeText={(v) => {
                  setInput(v);
                  if (lastErrorMessage) {
                    setLastErrorMessage('');
                    setLastErrorKind(null);
                  }
                }}
                placeholder={triLang(lang, {
                  ru: 'Напиши ответ…',
                  uk: 'Напиши відповідь…',
                  es: 'Escribe tu respuesta…',
                  'pt-BR': 'Escreva uma resposta…',
                  vi: 'Viết câu trả lời…',
                  id: 'Tulis jawaban…',
                  tr: 'Yanıt yaz…',
                  pl: 'Napisz odpowiedź…',
                })}
                placeholderTextColor={t.textMuted}
                editable={!sending}
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
                // Единый контракт во всех голосовых режимах: press-in старт,
                // press-out стоп. Разговорный режим дополнительно авто-отправляет.
                onPressIn={handleMicPressIn}
                onPressOut={handleMicPressOut}
                disabled={sending || aiSpeaking || voiceInputStatus === 'finishing'}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityState={{
                  disabled: sending || aiSpeaking || voiceInputStatus === 'finishing',
                  busy: voiceInputStatus === 'requesting' || voiceInputStatus === 'finishing',
                }}
                accessibilityLabel={
                  triLang(lang, {
                        ru: 'Зажми и говори',
                        uk: 'Затисни і говори',
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
                  <ActivityIndicator size="small" color={t.textSecond} />
                ) : (
                  <Ionicons
                    name={voiceInputStatus === 'listening' ? 'mic' : 'mic-outline'}
                    size={21}
                    color={voiceInputStatus === 'listening' ? t.correctText : t.textSecond}
                  />
                )}
                {!hasPremiumAccess && (
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
              <TouchableOpacity
                onPress={() => send(input)}
                disabled={!input.trim() || sending}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel={triLang(lang, {
                  ru: 'Отправить',
                  uk: 'Надіслати',
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
                  backgroundColor: input.trim() && !sending ? t.accent : t.bgSurface,
                  opacity: input.trim() && !sending ? 1 : 0.5,
                  shadowColor: t.shadowDark,
                  shadowOpacity: input.trim() && !sending ? 0.3 : 0,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: input.trim() && !sending ? 3 : 0,
                }}
              >
                <Ionicons
                  name="arrow-up"
                  size={22}
                  color={input.trim() && !sending ? t.correctText : t.textMuted}
                />
              </TouchableOpacity>
              </View>
              {voiceInputHint ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 6, paddingHorizontal: 6 }}>
                  <Text
                    style={{
                      color: voiceInputStatus === 'listening' ? t.accent : t.textMuted,
                      fontSize: f.caption,
                      fontWeight: '800',
                    }}
                    numberOfLines={1}
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
                      <Text style={{ color: t.accent, fontSize: f.caption, fontWeight: '900' }}>
                        {triLang(lang, {
                          ru: 'Открыть настройки',
                          uk: 'Відкрити налаштування',
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
                      <Text style={{ color: t.accent, fontSize: f.caption, fontWeight: '900' }}>
                        {triLang(lang, {
                          ru: 'Повторить',
                          uk: 'Повторити',
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
      </SafeAreaView>
    </ScreenGradient>
  );
}
