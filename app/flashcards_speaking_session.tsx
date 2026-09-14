// ═══════════════════════════════════════════════════════════════════════════
// flashcards_speaking_session.tsx — режим «Говорить» раздела «Карточки».
//
// зачем (владелец, 2026-08-17): «в разделе карточки в отработке есть тренировка
// блиц, слушать — надо ещё речь, чтобы карточки можно было отрабатывать говоря».
//
// Что это: карточка → зажал микрофон → сказал фразу по-английски → отпустил →
// оценка. Движок оценки — тот же `SpeakingPanel` (presentation="inline"),
// что стоит за кнопкой «Устно» в уроках и тренажёре фраз: пословная сверка,
// контрольный прогон, Android-путь через whisper. Свой распознаватель не пишем.
//
// Два задания (взяты из плана говорильной дорожки Learning V2,
// docs/v2/SPEAKING_TRACK_PLAN_2026-08-17.md, типы 2 и 1 — те, для которых
// у карточки есть данные):
//  • «Скажи по-английски» — на лицевой стороне ТОЛЬКО перевод, английский
//    скрыт: тренирует извлечение из головы (ядро дорожки). Подсказка — тап по
//    карточке (флип) или динамик.
//  • «Повтори за диктором» — английский показан и озвучен, человек повторяет:
//    опора полная, тренирует произношение.
// Типы 3–4 плана («собери и скажи», «одно слово убрали») требуют `words[]` с
// ролями — у карточек их нет, поэтому сюда не берём.
//
// Очередь — общее правило раздела (`session_queue`): не сдал → карточка в конец,
// максимум 2 повтора; чистая логика — flashcards/speaking_session_logic.ts.
// XP режим не даёт (как слушание/блиц: говорение — надстройка, без двойного счёта).
// Финал → SessionResultScreen (верно/ошибок/точность + «Добить»).
//
// Премиум-гейт — как у всех речевых поверхностей: `useFeatureAccess('speaking')`
// внутри `SpeakHoldButton` (без доступа → пейвол context='speaking').
// ═══════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useKeepAwake } from 'expo-keep-awake';
import { useTheme } from '../components/ThemeContext';
import { usePremium } from '../components/PremiumContext';
import { useEnergy, useEnergySessionIntent } from '../components/EnergyContext';
import NoEnergyModal from '../components/NoEnergyModal';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import SkeletonBlock from '../components/SkeletonShimmer';
import ReportErrorButton from '../components/ReportErrorButton';
import { SpeakingPanel, buildSpeakingPanelTheme } from '../components/SpeakingPanel';
import SpeakingInlineSlot from '../components/SpeakingInlineSlot';
import SpeakingTaskHint from './flashcards/SpeakingTaskHint';
import SpeakingInlineResultStars from '../components/SpeakingInlineResultStars';
import { triLang } from '../constants/i18n';
import { useAudio } from '../hooks/use-audio';
import { flashcardContentLang } from './spanish_content_gate';
import { useStudyTarget } from '../components/StudyTargetContext';
import { trackEvent } from './analytics';
import { SPEECH_PRONUNCIATION_PASS_THRESHOLD } from './pronunciation_scoring_client';
import { speakingBand, speakingBandLabel } from './speaking_score_bands';
import PhraseCard, { useFcReduceMotion } from './flashcards/PhraseCard';
import DeckPickerSheet, { type DeckSheetOption } from './flashcards/DeckPickerSheet';
import { loadFcDeckOptions } from './flashcards/deck_options';
import { SessionResultScreen } from './flashcards/SessionResultScreen';
import SpeakHoldButton, { SPEAK_HOLD_LABEL_HEIGHT } from './flashcards/SpeakHoldButton';
import { fcHaptic, playSfx } from './flashcards/SoundService';
import { estimateSpeechDurationMs } from './flashcards/audioSession';
import { voicePlaybackPolicy } from '../modules/audio/voice_playback_policy';
import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back';
import { deckRefKey, loadDeckCardsMulti, parseDeckParams, type DeckCard, type DeckRef } from './flashcards/deck_sources';
import { isValidSessionSize, FC_DEFAULT_SESSION_SIZE, getLastPreset, presetDeckIds, type FcModePreset } from './flashcards/mode_prefs';
import { deckRouteParam, decksCountLabel, SOLO_DECK_ID } from './flashcards/deck_selection';
import {
  DEFAULT_SPEAKING_PREFS,
  FC_SPEAKING_PREFS_KEY,
  SPEAKING_AUTO_ADVANCE_MS,
  SPEAKING_TASKS,
  advanceSpeaking,
  beginSpeakingAttempt,
  cancelSpeakingAttempt,
  currentSpeakingCard,
  initialSpeakingState,
  parseSpeakingPrefs,
  scoreSpeakingAttempt,
  speakingProgress,
  speakingRetryCards,
  summarizeSpeaking,
  type SpeakingAttempt,
  type SpeakingPrefs,
  type SpeakingSessionState,
  type SpeakingTask,
} from './flashcards/speaking_session_logic';
import { captureCurrentAccountObjectiveAttempt } from './mistake_practice_capture';
import SessionAttemptsHud from '../components/session_attempts/SessionAttemptsHud';
import { PracticeRuneCounter } from '../components/PracticeRuneCounter';
import { LearningV2RuneFlight } from '../components/LearningV2RuneFlight';
import { usePracticeRunes } from '../hooks/usePracticeRunes';
import { usePracticeRuneFlight } from '../hooks/usePracticeRuneFlight';
import { readDevPracticeRunesFakeState } from './dev_practice_runes_seed';
import { useSessionAttempts } from '../hooks/useSessionAttempts';
import { useSessionAttemptAutoReset } from '../hooks/useSessionAttemptAutoReset';
import { captureAccountGeneration } from './account_generation';
import {
  acknowledgeAndClearFlashcardTrainingPendingGrant,
  abandonFlashcardTrainingPendingGrant,
  discardFlashcardTrainingPendingGrant,
  markFlashcardTrainingEnergyCharged,
  markFlashcardTrainingPendingGrantPlayable,
  markFlashcardTrainingQuotaCommitted,
  prepareFlashcardTrainingPendingGrant,
  reconcileFlashcardTrainingPendingGrant,
  resolveFlashcardTrainingPendingGrantAccount,
  type FlashcardTrainingPendingGrantRecord,
} from './flashcard_training_pending_grant';
import { consumeFlashcardTrainingQuota } from './revenue_quota_access';
import { makeFeedbackAttemptId } from './feedback_attempt_identity';
import { DebugLogger } from './debug-logger';

/** Акцент режима (words #4A9EFF / phrases #40C080 / blitz #FF8A3D). */
const ACCENT = '#22B8A8';
const CARD_MIN_H = 260;

/**
 * Эхо эталона после оценки.
 *
 * зачем (владелец, 2026-09-14): «после того как сказал, надо чтобы карточка
 * тоже озвучилась правильно, чтобы сразу услышать, правильно ли». Сразу после
 * вердикта (звук + вибрация) диктор произносит английский эталон — и на
 * зачёте (подтверждение), и на промахе (услышал, как надо, и повторяет).
 *
 * ECHO_DELAY_MS — пауза после вердикта, чтобы звук «верно/неверно» не
 * наложился на речь. Автопереход на зачёте ждёт конца эха (плюс короткая
 * пауза), но не дольше оценочной длины фразы + запас: если озвучка молча не
 * стартовала (нет голоса, занят аудиотракт), экран не зависнет.
 */
const ECHO_DELAY_MS = 380;
const ECHO_AFTER_PAUSE_MS = 450;
const ECHO_FALLBACK_EXTRA_MS = 1500;

/**
 * Трассировка режима «Говорить» по правилу владельца «сперва логи, потом
 * починка» (2026-08-29). Один префикс на всю цепочку хост → панель → аудио:
 * grep «SPEAK» вытаскивает и [FC-SPEAK] (этот экран), и [SPEAK-MIC]
 * (SpeakingPanel + аудиорежим). Повод: «микрофон ломается после какой-то по
 * счёту попытки, надо перезаходить» — без трассы диагноз невозможен.
 */
function fcSpeakTrace(step: string, data?: Record<string, unknown>): void {
  console.log('[FC-SPEAK]', step, data ? JSON.stringify(data) : ''); // guard-ok: трасса по правилу владельца «сперва логи»; под __DEV__ логи уже терялись в релизе (память max_connect_silent_failures)
}

// ── Настройки fc_speaking_prefs_v1 (парсинг — в speaking_session_logic) ──────
function saveSpeakingPrefs(prefs: SpeakingPrefs): void {
  void AsyncStorage.getItem(FC_SPEAKING_PREFS_KEY)
    .then((raw) => {
      let base: Record<string, unknown> = {};
      try {
        const p = raw ? JSON.parse(raw) : null;
        if (p && typeof p === 'object' && !Array.isArray(p)) base = p as Record<string, unknown>;
      } catch (e) {
      DebugLogger.error('flashcards_speaking_session:p', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
      return AsyncStorage.setItem(FC_SPEAKING_PREFS_KEY, JSON.stringify({ ...base, ...prefs }));
    })
    .catch(() => {});
}

// Fisher-Yates: единое перемешивание карточек.
function shuffleArr<T>(a: readonly T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

type ResultState = { correct: number; wrong: number; learnLeft: number };

const TITLE = {
  ru: 'Говорить', uk: 'Говорити', es: 'Hablar', 'pt-BR': 'Falar',
  vi: 'Nói', id: 'Bicara', tr: 'Konuş', pl: 'Mów',
} as const;

// ── Экран ────────────────────────────────────────────────────────────────────
export default function FlashcardsSpeakingSession() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { accessResolved } = usePremium();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { speak, stop: stopSpeech } = useAudio();

  const params = useLocalSearchParams<{ deck?: string; size?: string; devRunesSeed?: string | string[]; devJumpToFinale?: string | string[] }>();
  const devJumpToFinale = (Array.isArray(params.devJumpToFinale) ? params.devJumpToFinale[0] : params.devJumpToFinale) === '1';
  // зачем (владелец, 2026-08-27): DEV-хаб «Проверка рун» открывает НАСТОЯЩИЙ
  // экран, но счётчик стартует со случайного числа вместо реальной копилки.
  // Диск и сеть в этом режиме не трогаются (см. hooks/usePracticeRunes).
  const devRunesFake = useMemo(
    () => readDevPracticeRunesFakeState(params.devRunesSeed),
    [params.devRunesSeed],
  );
  const [attemptSessionId] = useState(makeFeedbackAttemptId);
  const [speakingEnergyRevision, setSpeakingEnergyRevision] = useState(0);
  const accountToken = useMemo(() => captureAccountGeneration(), []);
  const attempts = useSessionAttempts({
    token: accountToken,
    sessionId: `flashcard-speaking:${attemptSessionId}`,
    initialQuestionId: 'flashcard-speaking:loading',
  });
  const neutralVoiceSequenceRef = useRef(0);

  // Сессия говорения — руки заняты, экран не гасим (как в слушании).
  useKeepAwake();

  const deckRefs = useMemo<DeckRef[]>(() => {
    const parsed = parseDeckParams(params.deck);
    return parsed.length > 0 ? parsed : [{ kind: 'saved' }];
  }, [params.deck]);
  const deckKey = useMemo(() => deckRefs.map(deckRefKey).join(','), [deckRefs]);
  const sessionSize = useMemo(() => {
    const raw = Array.isArray(params.size) ? params.size[0] : params.size;
    if (raw === 'all') return Number.MAX_SAFE_INTEGER;
    const n = raw ? parseInt(raw, 10) : NaN;
    return isValidSessionSize(n) ? n : FC_DEFAULT_SESSION_SIZE;
  }, [params.size]);
  const contentLang = useMemo(() => flashcardContentLang(lang, studyTarget), [lang, studyTarget]);
  const reduceMotion = useFcReduceMotion();

  const [loading, setLoading] = useState(true);
  const [quotaUnavailable, setQuotaUnavailable] = useState(false);
  const quotaUnavailableRef = useRef(false);
  // Старт сессии «Говорить» = 10 ⚡ (numeric energy).
  const {
    confirmSpendOne: confirmSpeakEnergy,
    refundOne: refundSpeakEnergy,
    acknowledgeSessionStart,
  } = useEnergy();
  const speakingEnergyIntent = useEnergySessionIntent(
    'flashcards_speaking',
    deckKey || 'saved',
    `${attemptSessionId}:${speakingEnergyRevision}`,
  );
  const [noEnergyOpen, setNoEnergyOpen] = useState(false);
  const speakingEntryChargedRef = useRef(false);
  const speakingRefundInFlightRef = useRef<Promise<void> | null>(null);
  const refundSpeakingEntry = useCallback((operationId: string, reason: string): Promise<void> => {
    if (speakingRefundInFlightRef.current) return speakingRefundInFlightRef.current;
    const pending = refundSpeakEnergy(operationId, reason).then(() => {
      speakingEntryChargedRef.current = false;
      setSpeakingEnergyRevision((current) => current + 1);
    }).catch(() => {});
    speakingRefundInFlightRef.current = pending;
    void pending.finally(() => {
      if (speakingRefundInFlightRef.current === pending) speakingRefundInFlightRef.current = null;
    });
    return pending;
  }, [refundSpeakEnergy]);
  const speakingMountedRef = useRef(true);
  const speakingExplicitlyAbandonedRef = useRef(false);
  const speakingPendingGrantRef = useRef<{
    account: NonNullable<Awaited<ReturnType<typeof resolveFlashcardTrainingPendingGrantAccount>>>;
    record: FlashcardTrainingPendingGrantRecord;
  } | null>(null);
  useEffect(() => {
    speakingMountedRef.current = true;
    return () => { speakingMountedRef.current = false; };
  }, []);
  const leave = useCallback(() => {
    fcHaptic('tap');
    speakingExplicitlyAbandonedRef.current = true;
    const pending = speakingPendingGrantRef.current;
    if (pending) {
      void (async () => {
        await abandonFlashcardTrainingPendingGrant(
          pending.account,
          pending.record.fingerprint,
          refundSpeakingEntry,
          Date.now(),
          'entry_cancelled',
        );
        await discardFlashcardTrainingPendingGrant(
          pending.account,
          pending.record.fingerprint,
        );
      })().catch(() => {});
    }
    safeRouterBack(router, '/flashcards' as never);
  }, [refundSpeakingEntry, router]);
  const [session, setSession] = useState<SpeakingSessionState>(() => initialSpeakingState([]));
  const [quotaSessionAuthorized, setQuotaSessionAuthorized] = useState(false);
  const sessionRef = useRef(session);
  const mistakeCaptureRunRef = useRef(`flashcard-speaking-${Date.now().toString(36)}`);
  sessionRef.current = session;
  const [task, setTask] = useState<SpeakingTask>(DEFAULT_SPEAKING_PREFS.task);
  const [flipped, setFlipped] = useState(false);
  /** Микрофон зажат прямо сейчас — SpeakingPanel слушает. */
  const [holdActive, setHoldActive] = useState(false);
  /**
   * Панель уткнулась в тупик (не расслышал / завис движок / нет доступа к
   * микрофону / устройство не умеет распознавать речь) и сама выйти из него
   * не может — presentation="inline" не имеет кнопки «Дальше»/«Закрыть» для
   * этих статусов (только «Открыть настройки» на denied). Раньше это держало
   * карточку залипшей навсегда: phase оставался 'live', «Пропустить» и
   * «Послушать» были заблокированы holdActive, единственный выход — снова
   * зажать микрофон и надеяться на удачу (а для 'unavailable' и это не
   * помогает — устройство физически не распознаёт речь).
   */
  const [stuck, setStuck] = useState(false);
  // зачем (владелец, 2026-08-27): DEV-хаб открывает СРАЗУ экран завершения.
  const [result, setResult] = useState<ResultState | null>(() => (devJumpToFinale ? {
    correct: 15, wrong: 5, learnLeft: 0,
  } : null));
  // зачем (владелец, 2026-08-27): «Добить» (onRetryWrong) — второй раунд ТОЙ ЖЕ
  // попытки по оставшимся ошибочным карточкам, не новое прохождение — ordinal
  // фиксирован, копилка продолжает жить через оба раунда без сброса.
  const practiceRunes = usePracticeRunes({
    activity: 'speaking_practice',
    sessionKey: attemptSessionId,
    completionOrdinal: 1,
    devFakeStartRunes: devRunesFake?.runes,
  });
  const runeFlight = usePracticeRuneFlight();
  useEffect(() => {
    // зачем (аудит 2026-08-28): earningsRef ещё null до конца гидратации —
    // settle() тогда тихо выходит и копилка не зачитывается никогда (DEV-хаб
    // ставит result синхронно на первом рендере, раньше гидратации).
    if (result && !practiceRunes.hydrating) void practiceRunes.settle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, practiceRunes.hydrating]);
  const [deckPickerOpen, setDeckPickerOpen] = useState(false);
  const [deckOptions, setDeckOptions] = useState<DeckSheetOption[]>([]);
  const [deckPreset, setDeckPreset] = useState<FcModePreset | null>(null);

  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishedRef = useRef(false);
  /** Ключ монтирования панели: новая попытка → свежая панель (без хвостов прошлой). */
  const attemptKeyRef = useRef(0);

  const clearAdvanceTimer = useCallback(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }, []);

  const card = currentSpeakingCard(session);
  const progress = speakingProgress(session);
  const phase = session.phase;

  // ── Загрузка карточек + настроек ───────────────────────────────────────────
  useEffect(() => {
    if (!accessResolved || quotaUnavailableRef.current) return undefined;
    setQuotaSessionAuthorized(false);
    speakingExplicitlyAbandonedRef.current = false;
    let cancelled = false;
    /** Локальный старт на случай отказа гранта — см. fail-open в catch ниже. */
    let speakingLocalStart: (() => void) | null = null;
    void (async () => {
      if (speakingRefundInFlightRef.current) {
        await speakingRefundInFlightRef.current;
      }
      if (cancelled) return;
      const [loadedPool, rawPrefs] = await Promise.all([
        loadDeckCardsMulti(deckRefs, contentLang, { shuffle: true, studyTarget }).catch((): DeckCard[] => []),
        AsyncStorage.getItem(FC_SPEAKING_PREFS_KEY).catch(() => null),
      ]);
      if (cancelled) return;
      const prefs = parseSpeakingPrefs(rawPrefs);
      const cards = shuffleArr(loadedPool).slice(0, sessionSize);
      speakingLocalStart = () => {
        finishedRef.current = false;
        quotaUnavailableRef.current = false;
        setQuotaUnavailable(false);
        clearAdvanceTimer();
        setTask(prefs.task);
        setFlipped(false);
        setHoldActive(false);
        setStuck(false);
        setResult(null);
        setQuotaSessionAuthorized(true);
        setSession(initialSpeakingState(cards));
        setLoading(false);
      };
      if (cards.length === 0) {
        setQuotaSessionAuthorized(false);
        setSession(initialSpeakingState([]));
        setLoading(false);
        return;
      }
      const pendingAccount = await resolveFlashcardTrainingPendingGrantAccount(accountToken);
      if (!pendingAccount) throw new Error('pending_grant_account_unavailable');
      const pendingScope = {
        mode: 'speaking' as const,
        studyTarget,
        contentLang,
        deckKeys: deckRefs.map(deckRefKey),
        sessionSize,
        preset: prefs.task,
      };
      const prepared = await prepareFlashcardTrainingPendingGrant({
        account: pendingAccount,
        scope: pendingScope,
        manifest: {
          schemaVersion: 'flashcard-training-manifest.v1',
          mode: 'speaking',
          payload: JSON.parse(JSON.stringify({ cards, prefs, energyIntent: speakingEnergyIntent })),
        },
        attemptId: attemptSessionId,
        receiptId: `speaking:${attemptSessionId}`,
        energyOperationId: speakingEnergyIntent.operationId,
        energyEpoch: speakingEnergyIntent.grant.attemptId,
      });
      if (prepared.status !== 'prepared' && prepared.status !== 'reused') {
        // зачем: без reason аудит по логу невозможен — «unavailable» ничего не объясняет.
        throw new Error(`pending_grant_${prepared.status}:${'reason' in prepared ? String(prepared.reason) : 'n/a'}`);
      }
      let pendingRecord = prepared.record;
      speakingPendingGrantRef.current = { account: pendingAccount, record: pendingRecord };
      const reconciled = await reconcileFlashcardTrainingPendingGrant(pendingAccount, pendingScope);
      if (reconciled.status === 'found') pendingRecord = reconciled.record;
      else if (reconciled.status !== 'missing') throw new Error(`pending_grant_reconcile_${reconciled.status}`);
      else return;
      speakingPendingGrantRef.current = { account: pendingAccount, record: pendingRecord };
      const restored = pendingRecord.manifest.payload as unknown as {
        cards: DeckCard[];
        prefs: SpeakingPrefs;
        energyIntent: typeof speakingEnergyIntent;
      };
      if (!Array.isArray(restored.cards) || restored.cards.length === 0 || !restored.prefs) {
        throw new Error('pending_grant_manifest_invalid');
      }

      let energyCharged = pendingRecord.energyState === 'charged';
      const energyResult = energyCharged ? 'unlimited' : await confirmSpeakEnergy(restored.energyIntent);
      if (energyResult === 'spent') {
        energyCharged = true;
        speakingEntryChargedRef.current = true;
        // зачем: без явного типа TS выводил `marked: unknown` (циклический вывод
        // через let pendingRecord) — файл не проходил typecheck и ts-jest, тест
        // flashcards_speaking_quota_unavailable_behavior не мог даже запуститься.
        const marked: Awaited<ReturnType<typeof markFlashcardTrainingEnergyCharged>> = await markFlashcardTrainingEnergyCharged(
          pendingAccount,
          pendingRecord.fingerprint,
        );
        if ('record' in marked) pendingRecord = marked.record;
      }
      speakingPendingGrantRef.current = { account: pendingAccount, record: pendingRecord };
      if (cancelled || speakingExplicitlyAbandonedRef.current) return;
      if (energyResult === 'cancelled') {
        await discardFlashcardTrainingPendingGrant(pendingAccount, pendingRecord.fingerprint);
        speakingPendingGrantRef.current = null;
        safeRouterBack(router, '/flashcards' as never);
        return;
      }
      if (energyResult === 'insufficient') {
        await discardFlashcardTrainingPendingGrant(pendingAccount, pendingRecord.fingerprint);
        speakingPendingGrantRef.current = null;
        setNoEnergyOpen(true);
        setLoading(false);
        return;
      }

      if (pendingRecord.phase === 'prepared') {
        const quotaResult = await consumeFlashcardTrainingQuota({
          token: accountToken,
          accessResolved,
          receiptId: pendingRecord.receiptId,
          mode: 'speaking',
        });
        if (quotaResult.status === 'allowed') {
          const marked = await markFlashcardTrainingQuotaCommitted(
            pendingAccount,
            pendingRecord.fingerprint,
            Date.now(),
            quotaResult.resetAt,
          );
          if ('record' in marked) pendingRecord = marked.record;
          speakingPendingGrantRef.current = { account: pendingAccount, record: pendingRecord };
        } else {
          setQuotaSessionAuthorized(false);
          if (energyCharged) await abandonFlashcardTrainingPendingGrant(
            pendingAccount,
            pendingRecord.fingerprint,
            refundSpeakingEntry,
            Date.now(),
            'quota_refused',
          );
          await discardFlashcardTrainingPendingGrant(pendingAccount, pendingRecord.fingerprint);
          speakingPendingGrantRef.current = null;
          if (!cancelled) {
            quotaUnavailableRef.current = true;
            setQuotaUnavailable(quotaResult.status !== 'exhausted');
            setLoading(false);
          }
          if (!cancelled && quotaResult.status === 'exhausted') {
            markNextNavigationAsReplace();
            router.replace({ pathname: '/premium_modal', params: {
              context: 'flashcard_training', source: 'flashcards_speaking_direct',
            } } as never);
          }
          return;
        }
      }
      if (cancelled || !speakingMountedRef.current || speakingExplicitlyAbandonedRef.current) return;
      finishedRef.current = false;
      quotaUnavailableRef.current = false;
      setQuotaUnavailable(false);
      clearAdvanceTimer();
      setTask(restored.prefs.task);
      setFlipped(false);
      setHoldActive(false);
      setStuck(false);
      setResult(null);
      setQuotaSessionAuthorized(true);
      setSession(initialSpeakingState(restored.cards));
      setLoading(false);
      await markFlashcardTrainingPendingGrantPlayable(
        pendingAccount,
        pendingRecord.fingerprint,
      );
      const cleared = await acknowledgeAndClearFlashcardTrainingPendingGrant(
        pendingAccount,
        pendingRecord.fingerprint,
        energyCharged ? acknowledgeSessionStart : async () => true,
      );
      if (cleared.status === 'cleared') {
        speakingPendingGrantRef.current = null;
        speakingEntryChargedRef.current = false;
      }
    })().catch(async (error: unknown) => {
      // зачем (владелец, 2026-09-13): цепочка входа падала молча и экран врал
      // «не удалось проверить лимит», хотя квота уже пускает при недоступной базе.
      // Печатаем стадию через состояние pending-записи и саму ошибку.
      const pendingAtFail = speakingPendingGrantRef.current;
      console.warn('[FC-TRAIN-ENTRY] speaking entry:catch', JSON.stringify({
        cancelled,
        error: (error instanceof Error ? `${error.name}: ${error.message}` : String(error)),
        stack: error instanceof Error ? String(error.stack ?? '').split('\n').slice(0, 4).join(' | ') : null,
        pendingPhase: pendingAtFail?.record.phase ?? null,
        pendingEnergy: pendingAtFail?.record.energyState ?? null,
        accountPhase: accountToken.phase,
        accountStableId: accountToken.stableId,
        deckKey,
        sessionSize,
      }));
      if (cancelled) return;
      /**
       * зачем (приказ владельца 2026-09-14, дословно: «НЕ ЧИНИ, А УБЕРИ»,
       * «убрать все проверки из раздела карточки»): слой отложенного гранта
       * (phone-state / квота / энергия) больше НЕ ИМЕЕТ ПРАВА закрыть вход в
       * тренировку. Карточки уже загружены — раунд стартует локально, без
       * чека квоты и без списания энергии; отказ инфраструктуры громко в логе.
       */
      const message = error instanceof Error ? error.message : String(error);
      if (/^pending_grant/.test(message) && speakingLocalStart && speakingMountedRef.current && !speakingExplicitlyAbandonedRef.current) {
        speakingPendingGrantRef.current = null;
        speakingEntryChargedRef.current = false;
        console.warn('[FC-TRAIN-ENTRY] speaking entry:fail-open — грант недоступен, раунд стартует локально без чека и без списания энергии', JSON.stringify({ reason: message }));
        speakingLocalStart();
        return;
      }
      if (!cancelled) {
        quotaUnavailableRef.current = true;
        setQuotaUnavailable(true);
      }
      const pending = speakingPendingGrantRef.current;
      if (pending) {
        await abandonFlashcardTrainingPendingGrant(
          pending.account,
          pending.record.fingerprint,
          refundSpeakingEntry,
          Date.now(),
          'entry_failed',
        ).catch(() => {});
        await discardFlashcardTrainingPendingGrant(
          pending.account,
          pending.record.fingerprint,
        ).catch(() => {});
      }
      if (!cancelled) {
        setQuotaSessionAuthorized(false);
        setSession(initialSpeakingState([]));
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
    // deckRefs пересоздаётся на каждый рендер; deckKey — стабильный ключ того же списка.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessResolved, accountToken, acknowledgeSessionStart, attemptSessionId, clearAdvanceTimer, confirmSpeakEnergy, contentLang, deckKey, quotaUnavailable, refundSpeakingEntry, router, sessionSize, speakingEnergyIntent]);

  // ── Финал ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || !session.finished || session.queue.length === 0 || finishedRef.current) return;
    finishedRef.current = true;
    stopSpeech();
    const summary = summarizeSpeaking(session);
    setResult({ correct: summary.correct, wrong: summary.wrong, learnLeft: summary.learnKeys.length });
  }, [loading, session, stopSpeech]);

  // ── Выход: глушим речь и таймеры ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearAdvanceTimer();
      stopSpeech();
    };
  }, [clearAdvanceTimer, stopSpeech]);

  const speakCard = useCallback(
    (c: DeckCard | null) => {
      if (!c) return;
      speak(c.en, undefined, { language: 'en-US' });
    },
    [speak],
  );

  /**
   * Эхо эталона после оценки (см. ECHO_* выше). Поколение защищает от гонок:
   * поздний колбэк старого эха (onStopped после stopSpeech при новом
   * зажатии) не трогает уже живущую попытку. `onSettled` вызывается РОВНО раз —
   * по onDone/onStopped/onError или по запасному таймеру.
   */
  const echoGenerationRef = useRef(0);
  const echoTimersRef = useRef<{ delay: ReturnType<typeof setTimeout> | null; fallback: ReturnType<typeof setTimeout> | null }>({ delay: null, fallback: null });
  const clearEchoTimers = useCallback(() => {
    const timers = echoTimersRef.current;
    if (timers.delay) clearTimeout(timers.delay);
    if (timers.fallback) clearTimeout(timers.fallback);
    echoTimersRef.current = { delay: null, fallback: null };
  }, []);
  const echoReference = useCallback(
    (c: DeckCard, onSettled: ((reason: string) => void) | null) => {
      clearEchoTimers();
      const generation = ++echoGenerationRef.current;
      let settled = false;
      const settle = (reason: string) => {
        if (settled || generation !== echoGenerationRef.current) return;
        settled = true;
        clearEchoTimers();
        fcSpeakTrace('echo:settled', { cardId: c.id, reason, generation });
        onSettled?.(reason);
      };
      // Голос выключен в настройках → speak() выйдет молча, без единого
      // колбэка; ждать нечего — отдаём управление сразу.
      if (!voicePlaybackPolicy.isEnabled()) {
        fcSpeakTrace('echo:skip', { cardId: c.id, reason: 'voice_disabled' });
        settled = true;
        onSettled?.('voice_disabled');
        return;
      }
      const fallbackMs = ECHO_DELAY_MS + estimateSpeechDurationMs(c.en) + ECHO_FALLBACK_EXTRA_MS;
      echoTimersRef.current.fallback = setTimeout(() => settle('fallback_timeout'), fallbackMs);
      echoTimersRef.current.delay = setTimeout(() => {
        echoTimersRef.current.delay = null;
        if (generation !== echoGenerationRef.current) return;
        fcSpeakTrace('echo:speak', { cardId: c.id, text: c.en, fallbackMs, generation });
        speak(c.en, undefined, {
          language: 'en-US',
          onStart: () => fcSpeakTrace('echo:started', { cardId: c.id, generation }),
          onDone: () => settle('done'),
          onStopped: () => settle('stopped'),
          onError: (e) => settle(`error:${e.message}`),
        });
      }, ECHO_DELAY_MS);
    },
    [clearEchoTimers, speak],
  );
  useEffect(() => clearEchoTimers, [clearEchoTimers]);

  /**
   * «Повтори за диктором»: эталон звучит сам при появлении карточки —
   * в этом смысл задания (опора полная). В «Скажи по-английски» — тишина:
   * подсказка только по запросу.
   */
  const cardId = card?.id ?? null;
  const updateAttemptQuestion = attempts.updateQuestion;
  useEffect(() => {
    if (!cardId) return;
    updateAttemptQuestion(`flashcard-speaking:${cardId}:${session.index}`);
  }, [cardId, session.index, updateAttemptQuestion]);
  useEffect(() => {
    if (loading || !cardId || task !== 'repeat' || phase !== 'idle') return;
    const c = sessionRef.current.queue[sessionRef.current.index];
    if (!c || c.id !== cardId) return;
    // Небольшая пауза: экран/флип успевают встать до речи.
    const timer = setTimeout(() => speakCard(c), 350);
    return () => clearTimeout(timer);
    // Озвучиваем один раз на карточку, не на каждую смену фазы.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, cardId, task]);

  // ── Микрофон: удержание → панель слушает; отпускание → панель оценивает ───
  const onHoldStart = useCallback(() => {
    const s = sessionRef.current;
    const c = currentSpeakingCard(s);
    if (s.finished || !c) {
      fcSpeakTrace('hold:start:ignored', { finished: s.finished, hasCard: !!c });
      return;
    }
    clearAdvanceTimer();
    // Эталон не должен попасть в микрофон (панель тоже глушит, но лучше сразу).
    stopSpeech();
    // Новая попытка после тупика — пробуем снова начисто: свежий key панели
    // (тупиковый статус мог быть на предыдущей попытке) и сброс stuck.
    const remount = s.phase !== 'live' || stuck;
    if (remount) attemptKeyRef.current += 1;
    fcSpeakTrace('hold:start', {
      cardId: c.id, index: s.index, phase: s.phase, stuck, remountPanel: remount,
      attemptKey: attemptKeyRef.current, attemptsOnCard: s.attemptsOnCard, task,
    });
    setStuck(false);
    setSession((cur) => beginSpeakingAttempt(cur));
    setHoldActive(true);
  }, [clearAdvanceTimer, stopSpeech, stuck, task]);

  const onHoldEnd = useCallback(() => {
    fcSpeakTrace('hold:end', { phase: sessionRef.current.phase, index: sessionRef.current.index });
    setHoldActive(false);
  }, []);

  const goNext = useCallback((opts?: { skip?: boolean; force?: boolean }) => {
    const s = sessionRef.current;
    fcSpeakTrace('next', { fromIndex: s.index, phase: s.phase, skip: opts?.skip === true, force: opts?.force === true });
    clearAdvanceTimer();
    clearEchoTimers();
    stopSpeech();
    setFlipped(false);
    setStuck(false);
    setSession((cur) => advanceSpeaking(cur, opts));
  }, [clearAdvanceTimer, clearEchoTimers, stopSpeech]);

  const onScore = useCallback(
    (attempt: SpeakingAttempt) => {
      const s = sessionRef.current;
      if (s.phase !== 'live') {
        fcSpeakTrace('score:ignored', { phase: s.phase, score: attempt.score, passed: attempt.passed });
        return;
      }
      setHoldActive(false);
      setStuck(false);
      const scoredState = scoreSpeakingAttempt(s, attempt);
      sessionRef.current = scoredState;
      setSession(scoredState);
      const failedCard = currentSpeakingCard(s);
      const attemptEffect = attempts.registerVerdict({
        answerAttemptId: [
          attemptSessionId,
          failedCard?.id ?? 'unknown',
          String(s.index),
          String(scoredState.attemptsOnCard),
        ].join(':'),
        verdict: attempt.passed ? 'correct' : 'pedagogical_wrong',
      });
      // зачем (владелец, 2026-08-27): руна за карточку — засчитывается один
      // раз за сессию, сколько бы попыток на неё ни ушло до зачёта.
      if (attempt.passed && failedCard) {
        const awarded = practiceRunes.onCorrectAnswer(failedCard.id);
        if (awarded > 0) runeFlight.fly(awarded);
      }
      // Раскрываем английский — и на зачёте (подтверждение), и на промахе (учимся).
      setFlipped(task === 'recall');
      fcSpeakTrace('score', {
        cardId: failedCard?.id ?? null, index: s.index, score: attempt.score, passed: attempt.passed,
        attemptsOnCard: scoredState.attemptsOnCard, attemptEffect, task,
      });
      // Эхо эталона (владелец, 2026-09-14): после вердикта диктор произносит
      // фразу. При исчерпании попыток экран уходит под блокировщик — молчим.
      const echoCard = attemptEffect === 'attempts_exhausted' ? null : failedCard;
      if (attempt.passed) {
        fcHaptic('correct');
        playSfx('correct');
        void trackEvent('speaking_attempt_passed', { source: 'flashcards', score: attempt.score });
        clearAdvanceTimer();
        const scoredAt = Date.now();
        // Автопереход: не раньше SPEAKING_AUTO_ADVANCE_MS и не раньше конца эха
        // (+ пауза). Запасной таймер внутри echoReference гарантирует, что
        // onSettled придёт даже при молчаливом отказе озвучки.
        const advanceAfterEcho = (reason: string) => {
          // goNext/«Пропустить» уже сняли таймер → переход не дублируем.
          if (advanceTimerRef.current == null) {
            fcSpeakTrace('advance:skipped', { reason, why: 'timer_cleared' });
            return;
          }
          clearAdvanceTimer();
          const remaining = Math.max(ECHO_AFTER_PAUSE_MS, scoredAt + SPEAKING_AUTO_ADVANCE_MS - Date.now());
          fcSpeakTrace('advance:scheduled', { reason, remainingMs: remaining });
          advanceTimerRef.current = setTimeout(() => {
            advanceTimerRef.current = null;
            goNext();
          }, remaining);
        };
        if (echoCard) {
          // Пока эхо звучит, advanceTimerRef держит «переход ожидается»;
          // сам таймер — страховка на случай, если settle не придёт вовсе.
          advanceTimerRef.current = setTimeout(() => {
            advanceTimerRef.current = null;
            fcSpeakTrace('advance:hard_fallback', { cardId: echoCard.id });
            goNext();
          }, ECHO_DELAY_MS + estimateSpeechDurationMs(echoCard.en) + ECHO_FALLBACK_EXTRA_MS + ECHO_AFTER_PAUSE_MS + 500);
          echoReference(echoCard, advanceAfterEcho);
        } else {
          advanceTimerRef.current = setTimeout(() => {
            advanceTimerRef.current = null;
            goNext();
          }, SPEAKING_AUTO_ADVANCE_MS);
        }
      } else {
        if (echoCard) echoReference(echoCard, null);
        if (failedCard && (studyTarget === 'en' || studyTarget === 'fr')) {
          void captureCurrentAccountObjectiveAttempt({
            attemptId: `${mistakeCaptureRunRef.current}:${s.index}:${failedCard.id}:${attempt.score}`,
            studyTarget,
            verdict: 'wrong',
            objective: true,
            content: {
              sourceKind: 'flashcard',
              sourceId: failedCard.id,
              canonicalTarget: failedCard.en,
              sourceMeaning: failedCard.translation,
            },
            facet: { kind: 'pronunciation', expected: failedCard.en },
          }).catch(() => {});
        }
        fcHaptic('wrong');
        playSfx('incorrect');
      }
      if (attemptEffect === 'attempts_exhausted') {
        clearAdvanceTimer();
        setHoldActive(false);
        stopSpeech();
      }
    },
    [attemptSessionId, attempts, task, clearAdvanceTimer, echoReference, goNext, practiceRunes, runeFlight, stopSpeech, studyTarget],
  );

  /** Панель закрылась сама (отказ движка / «нет речи») — ждём удержания снова. */
  const onPanelClose = useCallback(() => {
    fcSpeakTrace('panel:close', { phase: sessionRef.current.phase, index: sessionRef.current.index });
    setHoldActive(false);
    attempts.registerVerdict({
      answerAttemptId: `${attemptSessionId}:cancelled:${neutralVoiceSequenceRef.current++}`,
      verdict: 'cancelled',
    });
    setSession((cur) => cancelSpeakingAttempt(cur));
  }, [attemptSessionId, attempts]);

  /**
   * Тупиковый статус движка (см. коммент у `stuck`): панель сама не сообщает
   * ни оценку, ни закрытие — держим её видимой (текст ошибки/кнопка
   * «Открыть настройки» никуда не денутся, key не меняем), но разблокируем
   * выход из карточки. holdActive гасим — микрофон физически не слушает.
   */
  const DEAD_END_STATUSES = useMemo(
    () => new Set(['no_speech', 'stalled', 'denied', 'unavailable']),
    [],
  );
  const onPanelStatusChange = useCallback(
    (status: string) => {
      fcSpeakTrace('panel:status', {
        status, phase: sessionRef.current.phase, index: sessionRef.current.index,
        deadEnd: DEAD_END_STATUSES.has(status),
      });
      if (DEAD_END_STATUSES.has(status)) {
        setHoldActive(false);
        setStuck(true);
        attempts.registerVerdict({
          answerAttemptId: `${attemptSessionId}:voice-status:${status}:${neutralVoiceSequenceRef.current++}`,
          verdict: status === 'no_speech' ? 'no_speech' : 'technical_error',
        });
      }
    },
    [attemptSessionId, attempts, DEAD_END_STATUSES],
  );

  const onRetry = useCallback(() => {
    fcHaptic('tap');
    fcSpeakTrace('retry', { index: sessionRef.current.index, attemptsOnCard: sessionRef.current.attemptsOnCard });
    clearAdvanceTimer();
    setFlipped(false);
    setSession((cur) => (cur.phase === 'scored' ? { ...cur, phase: 'idle', attempt: null } : cur));
  }, [clearAdvanceTimer]);

  const resetSpeakingCardAfterSessionRuneForfeit = useCallback(() => {
    clearAdvanceTimer();
    stopSpeech();
    setHoldActive(false);
    setStuck(false);
    setFlipped(false);
    attemptKeyRef.current += 1;
    setSession((cur) => (cur.phase === 'scored' ? { ...cur, phase: 'idle', attempt: null } : cur));
  }, [clearAdvanceTimer, stopSpeech]);

  // зачем (2026-09-03): без hydrated автосброс молча не запускался и экран
  // намертво замирал под блокировщиком ввода после трёх ошибок.
  useSessionAttemptAutoReset({
    phase: attempts.state.phase,
    hydrated: attempts.hydrated,
    inventoryTrusted: attempts.inventoryTrusted,
    giftCount: attempts.giftCount,
    recoverWithGift: attempts.recoverWithGift,
    forfeitSessionRunes: practiceRunes.forfeitPendingRunes,
    restoreAttempts: attempts.restoreAfterSessionRuneForfeit,
    onRestored: resetSpeakingCardAfterSessionRuneForfeit,
  });

  const onPickTask = useCallback((next: SpeakingTask) => {
    fcHaptic('tap');
    stopSpeech();
    setTask(next);
    setFlipped(false);
    saveSpeakingPrefs({ task: next });
  }, [stopSpeech]);

  /** «Добить»: второй раунд только по несданным карточкам, тот же экран. */
  const onRetryWrong = useCallback(() => {
    const cards = speakingRetryCards(sessionRef.current);
    if (cards.length === 0) return;
    // A result is a settled reward boundary. The retry therefore gets a new
    // completion ordinal even when the previous receipt is still syncing.
    practiceRunes.startNewCompletion();
    finishedRef.current = false;
    clearAdvanceTimer();
    setResult(null);
    setFlipped(false);
    setHoldActive(false);
    setStuck(false);
    setSession(initialSpeakingState(cards));
  }, [clearAdvanceTimer, practiceRunes]);

  // ── Выбор наборов из самого режима (как в блице) ──────────────────────────
  const autoPickedRef = useRef(false);
  useEffect(() => {
    autoPickedRef.current = false;
  }, [deckKey]);
  useEffect(() => {
    if (loading || quotaUnavailable || session.queue.length > 0 || result || autoPickedRef.current) return;
    autoPickedRef.current = true;
    setDeckPickerOpen(true);
  }, [loading, quotaUnavailable, session.queue.length, result, deckKey]);

  useEffect(() => {
    if (!deckPickerOpen) return;
    let cancelled = false;
    void (async () => {
      const [decks, preset] = await Promise.all([
        loadFcDeckOptions('speaking', lang, studyTarget).catch(() => [] as DeckSheetOption[]),
        getLastPreset('speaking').catch(() => null),
      ]);
      if (cancelled) return;
      setDeckOptions(decks);
      setDeckPreset(preset);
    })();
    return () => {
      cancelled = true;
    };
  }, [deckPickerOpen, lang, studyTarget]);

  const openDeckPicker = useCallback(() => {
    fcHaptic('tap');
    stopSpeech();
    setDeckPickerOpen(true);
  }, [stopSpeech]);
  const closeDeckPicker = useCallback(() => setDeckPickerOpen(false), []);

  const retryQuotaStart = useCallback(() => {
    quotaUnavailableRef.current = false;
    setQuotaUnavailable(false);
    setLoading(true);
  }, []);

  const startWithPreset = useCallback(
    (preset: FcModePreset) => {
      setDeckPickerOpen(false);
      const decks = presetDeckIds(preset).filter((d) => d !== SOLO_DECK_ID);
      const deck = deckRouteParam(decks) || 'saved';
      if (parseDeckParams(deck).map(deckRefKey).join(',') === deckKey && preset.size === sessionSize) return;
      router.replace({
        pathname: '/flashcards_speaking_session',
        params: { deck, size: String(preset.size) },
      } as never);
    },
    [deckKey, router, sessionSize],
  );

  const deckPickerSheet = (
    <DeckPickerSheet
      visible={deckPickerOpen}
      onClose={closeDeckPicker}
      onStart={startWithPreset}
      decks={deckOptions}
      initialPreset={deckPreset}
      lang={lang}
      t={t}
      f={f}
      reduceMotion={reduceMotion}
      mode="speaking"
      showsEnergyCostForPreset={(preset) => {
        const nextDeck = deckRouteParam(presetDeckIds(preset).filter((d) => d !== SOLO_DECK_ID)) || 'saved';
        return parseDeckParams(nextDeck).map(deckRefKey).join(',') !== deckKey || preset.size !== sessionSize;
      }}
    />
  );

  const deckTitle = useMemo(() => {
    if (deckRefs.length > 1) return decksCountLabel(lang, deckRefs.length);
    const deckRef = deckRefs[0]!;
    if (deckRef.kind === 'custom') return triLang(lang, {
      ru: 'Мои карточки', uk: 'Мої картки', en: 'My cards', es: 'Mis tarjetas', 'pt-BR': 'Meus cartões',
      vi: 'Thẻ của tôi', id: 'Kartu saya', tr: 'Kartlarım', pl: 'Moje fiszki',
    });
    if (deckRef.kind === 'pack') return triLang(lang, {
      ru: 'Набор карточек', uk: 'Набір карток', en: 'Card pack', es: 'Pack de tarjetas', 'pt-BR': 'Pacote de cartões',
      vi: 'Bộ thẻ', id: 'Set kartu', tr: 'Kart seti', pl: 'Zestaw fiszek',
    });
    return triLang(lang, {
      ru: 'Сохранённые', uk: 'Збережені', en: 'Saved', es: 'Guardadas', 'pt-BR': 'Salvos',
      vi: 'Đã lưu', id: 'Tersimpan', tr: 'Kaydedilenler', pl: 'Zapisane',
    });
  }, [deckRefs, lang]);

  const labels = useMemo(
    () => ({
      title: triLang(lang, TITLE),
      back: triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' }),
      recallHint: triLang(lang, {
        ru: 'Вспомни фразу по переводу. Удерживай микрофон, пока отвечаешь.', uk: 'Згадай фразу за перекладом. Утримуй мікрофон, поки відповідаєш.',
        en: 'Recall the phrase from its translation. Hold the microphone while answering.', es: 'Recuerda la frase a partir de la traducción. Mantén pulsado el micrófono al responder.',
        'pt-BR': 'Lembre a frase pela tradução. Segure o microfone enquanto responde.', vi: 'Nhớ lại câu từ bản dịch. Giữ micrô khi trả lời.',
        id: 'Ingat frasa dari terjemahannya. Tahan mikrofon saat menjawab.', tr: 'Çeviriden ifadeyi hatırla. Yanıtlarken mikrofonu basılı tut.', pl: 'Przypomnij sobie zwrot na podstawie tłumaczenia. Przytrzymaj mikrofon, odpowiadając.',
      }),
      repeatHint: triLang(lang, {
        ru: 'Послушай фразу и повтори её. Удерживай микрофон, пока говоришь.', uk: 'Послухай фразу й повтори її. Утримуй мікрофон, поки говориш.',
        en: 'Listen to the phrase and repeat it. Hold the microphone while speaking.', es: 'Escucha la frase y repítela. Mantén pulsado el micrófono al hablar.',
        'pt-BR': 'Ouça a frase e repita. Segure o microfone enquanto fala.', vi: 'Nghe câu rồi nhắc lại. Giữ micrô khi nói.',
        id: 'Dengarkan frasa lalu ulangi. Tahan mikrofon saat berbicara.', tr: 'İfadeyi dinle ve tekrarla. Konuşurken mikrofonu basılı tut.', pl: 'Posłuchaj zwrotu i powtórz go. Przytrzymaj mikrofon podczas mówienia.',
      }),
      recall: triLang(lang, {
        ru: 'Скажи по-английски', uk: 'Скажи англійською', en: 'Say it in English', es: 'Dilo en inglés',
        'pt-BR': 'Diga em inglês', vi: 'Nói bằng tiếng Anh', id: 'Ucapkan dalam bahasa Inggris',
        tr: 'İngilizce söyle', pl: 'Powiedz po angielsku',
      }),
      repeat: triLang(lang, {
        ru: 'Повтори за диктором', uk: 'Повтори за диктором', en: 'Repeat after the speaker', es: 'Repite al locutor',
        'pt-BR': 'Repita o locutor', vi: 'Nhắc lại theo giọng đọc', id: 'Tirukan pembaca',
        tr: 'Spikeri tekrar et', pl: 'Powtórz za lektorem',
      }),
      holdIdle: triLang(lang, {
        ru: 'Зажми и говори', uk: 'Затисни й говори', en: 'Hold and speak', es: 'Mantén y habla',
        'pt-BR': 'Segure e fale', vi: 'Giữ và nói', id: 'Tahan dan bicara',
        tr: 'Basılı tut ve konuş', pl: 'Przytrzymaj i mów',
      }),
      holdLive: triLang(lang, {
        ru: 'Слушаю…', uk: 'Слухаю…', en: 'Listening…', es: 'Escuchando…', 'pt-BR': 'Ouvindo…',
        vi: 'Đang nghe…', id: 'Mendengarkan…', tr: 'Dinliyorum…', pl: 'Słucham…',
      }),
      holdAgain: triLang(lang, {
        ru: 'Зажми — скажи ещё раз', uk: 'Затисни — скажи ще раз', en: 'Hold — say it again', es: 'Mantén y repite',
        'pt-BR': 'Segure e repita', vi: 'Giữ và nói lại', id: 'Tahan dan ulangi',
        tr: 'Basılı tut, tekrar söyle', pl: 'Przytrzymaj i powtórz',
      }),
      next: triLang(lang, {
        ru: 'Продолжить', uk: 'Продовжити', en: 'Next', es: 'Siguiente', 'pt-BR': 'Próximo',
        vi: 'Tiếp', id: 'Lanjut', tr: 'Sonraki', pl: 'Dalej',
      }),
      skip: triLang(lang, {
        ru: 'Пропустить', uk: 'Пропустити', en: 'Skip', es: 'Saltar', 'pt-BR': 'Pular',
        vi: 'Bỏ qua', id: 'Lewati', tr: 'Atla', pl: 'Pomiń',
      }),
      retry: triLang(lang, {
        ru: 'Ещё раз', uk: 'Ще раз', en: 'Again', es: 'Otra vez', 'pt-BR': 'De novo',
        vi: 'Thử lại', id: 'Lagi', tr: 'Tekrar', pl: 'Jeszcze raz',
      }),
      listen: triLang(lang, {
        ru: 'Послушать', uk: 'Послухати', en: 'Listen', es: 'Escuchar', 'pt-BR': 'Ouvir',
        vi: 'Nghe', id: 'Dengar', tr: 'Dinle', pl: 'Posłuchaj',
      }),
      pickDecks: triLang(lang, {
        ru: 'Выбрать наборы', uk: 'Обрати набори', en: 'Choose packs', es: 'Elegir packs',
        'pt-BR': 'Escolher pacotes', vi: 'Chọn bộ thẻ', id: 'Pilih set kartu',
        tr: 'Setleri seç', pl: 'Wybierz zestawy',
      }),
      empty: triLang(lang, {
        ru: 'Здесь пока нечего говорить — выберите наборы',
        uk: 'Тут поки нема чого говорити — оберіть набори',
        en: 'Nothing to say here yet — pick some packs',
        es: 'Aún no hay nada que decir: elige los packs',
        'pt-BR': 'Ainda não há o que falar: escolha os pacotes',
        vi: 'Chưa có gì để nói — hãy chọn bộ thẻ',
        id: 'Belum ada yang bisa diucapkan — pilih set kartu',
        tr: 'Söylenecek bir şey yok — setleri seçin',
        pl: 'Nie ma jeszcze czego mówić — wybierz zestawy',
      }),
      spokenCount: triLang(lang, {
        ru: 'Сказано', uk: 'Сказано', en: 'Said', es: 'Dichas', 'pt-BR': 'Ditas',
        vi: 'Đã nói', id: 'Diucapkan', tr: 'Söylenen', pl: 'Powiedziane',
      }),
    }),
    [lang],
  );

  const panelTheme = useMemo(() => buildSpeakingPanelTheme(t), [t]);

  // ── Рендер ─────────────────────────────────────────────────────────────────
  const header = (interactive: boolean) => (
    <>
      {/* Руны за сессию (владелец, 2026-08-27): шапка ниже — самая плотная из
          семи экранов (попытки + прогресс + выбор наборов), поэтому руны
          вынесены отдельной строкой сверху, а не втиснуты в тот же ряд. */}
      {interactive ? (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 6 }}>
          <View ref={runeFlight.counterRef} collapsable={false}>
            <PracticeRuneCounter
              runes={practiceRunes.runes}
              lang={lang}
              backgroundColor={t.bgCard}
              color={t.textPrimary}
              testID="fc-speak-practice-runes"
            />
          </View>
        </View>
      ) : null}
    <View style={styles.headerRow}>
      {interactive ? (
        <TouchableOpacity
          onPress={leave}
          style={{ padding: 4 }}
          testID="fc-speak-back"
          accessibilityRole="button"
          accessibilityLabel={labels.back}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
        </TouchableOpacity>
      ) : (
        <View style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
        </View>
      )}
      <View style={{ alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
        <Text style={[styles.headerTitle, { color: t.textPrimary, fontSize: f.body }]}>{labels.title}</Text>
        {interactive ? (
          <ScrollView horizontal style={{ maxWidth: '100%', flexGrow: 0 }} showsHorizontalScrollIndicator>
                <Text style={{ color: t.textMuted, fontSize: f.caption }}>{deckTitle}</Text>
              </ScrollView>
        ) : (
          <SkeletonBlock width={120} height={f.caption} />
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <SessionAttemptsHud
          remaining={attempts.state.remainingAttempts}
          locale={lang}
          testID="fc-speak-session-attempts"
        />
        {interactive ? (
          <Text style={{ color: t.textMuted, fontSize: f.caption, minWidth: 44, textAlign: 'right' }} testID="fc-speak-progress">
            {progress.position} / {progress.total}
          </Text>
        ) : (
          <SkeletonBlock width={44} height={f.caption} />
        )}
        <TouchableOpacity
          testID="fc-speak-pick-decks"
          accessibilityLabel={labels.pickDecks}
          accessible
          accessibilityRole="button"
          onPress={openDeckPicker}
          disabled={!interactive}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ padding: 4 }}
        >
          <Ionicons name="albums-outline" size={20} color={t.textMuted} />
        </TouchableOpacity>
        {/* зачем: говорение сверяет речь с эталонной фразой card.en — если эталон
            неверен, «попасть» в него нельзя в принципе, и человек застревает.
            Флаг только в живом состоянии: в скелетоне карточки ещё нет. */}
        {interactive && card ? (
          <ReportErrorButton
            screen="flashcards_speaking"
            dataId={`flashcard_${card.id ?? 'unknown'}`}
            dataText={`EN: ${card.en}
RU: ${card.translation}`}
            variant="icon-flag"
            accessibilityLabel={triLang(lang, { ru: 'Сообщить об ошибке в карточке', uk: 'Повідомити про помилку в картці', en: 'Report an error in the card', es: 'Informar de un error en la tarjeta', 'pt-BR': 'Relatar erro no cartão', vi: 'Báo lỗi trong thẻ', id: 'Laporkan kesalahan pada kartu', tr: 'Karttaki hatayı bildir', pl: 'Zgłoś błąd w fiszce' })}
            testID="fc-speak-report"
          />
        ) : null}
      </View>
    </View>
    </>
  );

  /**
   * Performance Bible: первый кадр = финальная геометрия. На загрузке держим
   * шапку, прогресс, место карточки, слот панели и транспортный ряд.
   */
  if (loading) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            {header(false)}
            <View style={[styles.progressTrack, { backgroundColor: t.bgSurface }]} />
            <View style={styles.cardArea}>
              <SkeletonBlock width="100%" height={CARD_MIN_H} borderRadius={24} />
            </View>
            <SpeakingInlineSlot style={styles.inlineSlot} />
            <View style={styles.taskRow}>
              <SkeletonBlock width="100%" height={40} borderRadius={14} />
            </View>
            <View style={styles.transportRow}>
              <SkeletonBlock width={54} height={54} borderRadius={27} />
              <SkeletonBlock width={98} height={98} borderRadius={49} />
              <SkeletonBlock width={54} height={54} borderRadius={27} />
            </View>
          </ContentWrap>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  if (quotaUnavailable) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }} testID="fc-speak-quota-unavailable">
          <ContentWrap>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 32 }}>
              <Ionicons name="cloud-offline-outline" size={44} color={t.textGhost} />
              <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center' }}>
                {triLang(lang, {
                  ru: 'Не удалось открыть данные тренировок на этом устройстве. Попробуй снова или перезапусти приложение.',
                  uk: 'Не вдалося відкрити дані тренувань на цьому пристрої. Спробуй ще раз або перезапусти застосунок.',
                  en: 'We could not open your training data on this device. Try again or restart the app.',
                  es: 'No pudimos abrir tus datos de entrenamiento en este dispositivo. Inténtalo de nuevo o reinicia la app.',
                  'pt-BR': 'Não foi possível abrir seus dados de treino neste dispositivo. Tente de novo ou reinicie o app.',
                  vi: 'Không thể mở dữ liệu luyện tập trên thiết bị này. Hãy thử lại hoặc khởi động lại ứng dụng.',
                  id: 'Data latihan tidak bisa dibuka di perangkat ini. Coba lagi atau mulai ulang aplikasi.',
                  tr: 'Antrenman verilerin bu cihazda açılamadı. Tekrar dene ya da uygulamayı yeniden başlat.',
                  pl: 'Nie udało się otworzyć danych treningowych na tym urządzeniu. Spróbuj ponownie lub uruchom aplikację ponownie.',
                })}
              </Text>
              <TouchableOpacity
                testID="fc-speak-quota-retry"
                accessibilityRole="button"
                onPress={retryQuotaStart}
                style={{ paddingHorizontal: 18, paddingVertical: 12, borderRadius: 16, backgroundColor: t.bgSurface }}
              >
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>
                  {triLang(lang, { ru: 'Попробовать снова', uk: 'Спробувати ще раз', en: 'Try again', es: 'Intentar de nuevo', 'pt-BR': 'Tentar novamente', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Spróbuj ponownie' })}
                </Text>
              </TouchableOpacity>
            </View>
          </ContentWrap>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  if (result) {
    return (
      <SessionResultScreen
        correct={devRunesFake ? devRunesFake.tertiary + 4 : result.correct}
        wrong={devRunesFake ? devRunesFake.tertiary : result.wrong}
        xpGained={0}
        runesGained={practiceRunes.runes}
        learnLeft={result.learnLeft}
        onRetryWrong={result.learnLeft > 0 ? onRetryWrong : undefined}
        onDone={leave}
        accentColor={ACCENT}
        testID="fc-speak-result"
      />
    );
  }

  if (session.queue.length === 0) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            {header(true)}
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 32 }}>
              <Ionicons name="mic-outline" size={44} color={t.textGhost} />
              <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center' }}>{labels.empty}</Text>
              <TouchableOpacity
                testID="fc-speak-pick-decks-empty"
                accessibilityLabel={labels.pickDecks}
                accessible
                onPress={openDeckPicker}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  paddingHorizontal: 18, paddingVertical: 12, borderRadius: 16, backgroundColor: t.bgSurface,
                }}
              >
                <Ionicons name="albums-outline" size={18} color={ACCENT} />
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>{labels.pickDecks}</Text>
              </TouchableOpacity>
            </View>
          </ContentWrap>
        </SafeAreaView>
        {deckPickerSheet}
      </ScreenGradient>
    );
  }

  const front = task === 'recall' ? card?.translation ?? '' : card?.en ?? '';
  const back = task === 'recall' ? card?.en ?? '' : card?.translation ?? '';
  const attempt = session.attempt;
  const band = attempt ? speakingBand(attempt.score, SPEECH_PRONUNCIATION_PASS_THRESHOLD) : null;
  /**
   * зачем (владелец, 2026-08-17, скриншот): подпись «Зажми — скажи ещё раз»
   * раньше показывалась и после ЗАЧЁТА (phase==='scored' безусловно) — но там
   * идёт автопереход на НОВУЮ карточку, и на ней снова нужно нейтральное
   * «Зажми и говори», а не «ещё раз» (ещё раз чего? фраза уже другая). «Скажи
   * ещё раз» осмысленно только после промаха/тупика — той же карточки.
   */
  const holdLabel = holdActive
    ? labels.holdLive
    : stuck || (phase === 'scored' && attempt?.passed === false)
      ? labels.holdAgain
      : phase === 'live'
        ? ''
        : labels.holdIdle;
  const spoken = session.events.filter((e) => e.correct).length;

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          {header(true)}

          <View style={[styles.progressTrack, { backgroundColor: t.bgSurface }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: ACCENT, width: `${(progress.position / progress.total) * 100}%` },
              ]}
            />
          </View>

          {/* Карточка: тап — подсмотреть/вернуть. Динамик — только в транспорте
              снизу (владелец, 2026-08-17): кнопка на самой карточке дублировала
              «Послушать» из транспортного ряда, убрана. */}
          {/* Источник полёта рун (владелец, 2026-08-27) */}
          <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
          <View ref={runeFlight.originRef} collapsable={false} style={styles.cardArea}>
            <PhraseCard
              mode="view"
              en={front}
              translation={back}
              flipped={flipped}
              onFlip={setFlipped}
              minHeight={CARD_MIN_H}
              disabled={holdActive}
              testID="fc-speak-card"
              renderFront={() => (
                <View style={styles.cardFace}>
                  <Text
                    maxFontSizeMultiplier={1.35}

                    style={{ color: t.textPrimary, fontSize: (f.h1 ?? 22) + 2, fontWeight: '700', textAlign: 'center' }}
                  >
                    {front}
                  </Text>
                </View>
              )}
              renderBack={() => (
                <View style={styles.cardFace}>
                  <Text
                    maxFontSizeMultiplier={1.35}

                    style={{ color: t.textPrimary, fontSize: (f.h1 ?? 22) + 2, fontWeight: task === 'recall' ? '700' : '500', textAlign: 'center' }}
                  >
                    {back}
                  </Text>
                </View>
              )}
            />
            <View style={styles.spokenRow}>
              <Ionicons name="mic-outline" size={13} color={t.textMuted} />
              <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600' }} testID="fc-speak-count">
                {labels.spokenCount}: {spoken}
              </Text>
            </View>
          </View>

          {/* Слот панели говорения — одна геометрия во всех состояниях. */}
          <SpeakingInlineSlot style={styles.inlineSlot}>
            {phase === 'live' && card ? (
              <SpeakingPanel
                key={`${card.id}:${attemptKeyRef.current}`}
                targetText={card.en}
                lang={lang}
                theme={panelTheme}
                presentation="inline"
                holdActive={holdActive}
                onScore={onScore}
                onClose={onPanelClose}
                onStatusChange={onPanelStatusChange}
              />
            ) : phase === 'scored' && attempt && band ? (
              <View style={[styles.resultCard, { backgroundColor: t.bgCard }]} testID="fc-speak-attempt-result">
                <SpeakingInlineResultStars result={attempt} theme={panelTheme} testID="fc-speak-stars" />
                <Text
                  style={{ color: attempt.passed ? t.correct : t.textPrimary, fontSize: f.sub, fontWeight: '800', textAlign: 'center' }}

                >
                  {speakingBandLabel(band, lang)}
                </Text>
                {!attempt.passed ? (
                  <View style={styles.resultActions}>
                    <TouchableOpacity
                      testID="fc-speak-retry"
                      accessibilityRole="button"
                      accessibilityLabel={labels.retry}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                      onPress={onRetry}
                      style={[styles.resultBtn, { backgroundColor: `${ACCENT}22` }]}
                    >
                      <Ionicons name="refresh" size={16} color={ACCENT} />
                      <Text style={{ color: ACCENT, fontSize: f.caption, fontWeight: '800' }}>{labels.retry}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      testID="fc-speak-next"
                      accessibilityRole="button"
                      accessibilityLabel={labels.next}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                      onPress={() => { fcHaptic('tap'); goNext(); }}
                      style={[styles.resultBtn, { backgroundColor: t.bgSurface }]}
                    >
                      <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '800' }}>{labels.next}</Text>
                      <Ionicons name="arrow-forward" size={16} color={t.textPrimary} />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            ) : card ? (
              <SpeakingTaskHint>
                {task === 'recall' ? labels.recallHint : labels.repeatHint}
              </SpeakingTaskHint>
            ) : null}
          </SpeakingInlineSlot>

          {/* Тип задания — две круглые кнопки с иконкой, без текста (владелец,
              2026-08-17): подписи «Скажи по-англи…»/«Повтори за дикт…» резались
              многоточием на узких экранах. Подпись живёт в accessibilityLabel —
              экранный диктор объявляет полный смысл, зрячий выбирает по цвету
              заливки активной кнопки (тон, не обводка). */}
          <View style={styles.taskRow} testID="fc-speak-task">
            {SPEAKING_TASKS.map((option) => {
              const active = option === task;
              const optionLabel = option === 'recall' ? labels.recall : labels.repeat;
              return (
                <TouchableOpacity
                  key={option}
                  testID={`fc-speak-task-${option}`}
                  accessibilityRole="button"
                  accessibilityLabel={optionLabel}
                  accessibilityState={{ selected: active }}
                  onPress={() => onPickTask(option)}
                  disabled={holdActive}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  style={[
                    styles.taskCircle,
                    { backgroundColor: active ? ACCENT : t.bgSurface },
                  ]}
                >
                  <Ionicons
                    name={option === 'recall' ? 'bulb-outline' : 'repeat-outline'}
                    size={20}
                    color={active ? t.correctText : t.textMuted}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          </ScrollView>
          {/* Транспорт: пропустить · зажми-и-говори · послушать.
              `stuck` (панель уткнулась в тупик без своего выхода) разблокирует
              оба соседа: живой holdActive там уже не идёт, запись фактически
              остановлена — держать «Пропустить»/«Послушать» под замком нечестно. */}
          <View style={styles.transportRow}>
            <TouchableOpacity
              onPress={() => { fcHaptic('tap'); goNext({ skip: phase !== 'scored', force: stuck }); }}
              disabled={holdActive && !stuck}
              testID="fc-speak-skip"
              accessibilityLabel={phase === 'scored' ? labels.next : labels.skip}
              accessibilityHint={phase === 'scored' ? labels.next : labels.skip}
              accessibilityRole="button"
              accessibilityState={{ disabled: holdActive && !stuck }}
              accessible
              style={[styles.sideBtn, { backgroundColor: t.bgSurface, opacity: holdActive && !stuck ? 0.5 : 1 }]}
            >
              <Ionicons name="play-skip-forward" size={22} color={t.textPrimary} />
            </TouchableOpacity>
            <SpeakHoldButton
              accent={ACCENT}
              listening={holdActive}
              disabled={!card}
              sessionAuthorized={quotaSessionAuthorized}
              reduceMotion={reduceMotion}
              onHoldStart={onHoldStart}
              onHoldEnd={onHoldEnd}
              label={holdLabel}
            />
            <TouchableOpacity
              onPress={() => { fcHaptic('tap'); speakCard(card); }}
              disabled={holdActive && !stuck}
              testID="fc-speak-listen"
              accessibilityLabel={labels.listen}
              accessibilityHint={labels.listen}
              accessibilityRole="button"
              accessibilityState={{ disabled: holdActive && !stuck }}
              accessible
              style={[styles.sideBtn, { backgroundColor: t.bgSurface, opacity: holdActive ? 0.5 : 1 }]}
            >
              <Ionicons name="volume-high" size={22} color={t.textPrimary} />
            </TouchableOpacity>
          </View>
        </ContentWrap>
      </SafeAreaView>
      {deckPickerSheet}
      <NoEnergyModal visible={noEnergyOpen} onClose={leave} activity="flashcards" />
      {runeFlight.flight && (
        <LearningV2RuneFlight
          key={runeFlight.flight.key}
          from={runeFlight.flight.from}
          to={runeFlight.flight.to}
          count={runeFlight.flight.count}
          onDone={runeFlight.clearFlight}
        />
      )}
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontWeight: '700' },
  progressTrack: { height: 4, borderRadius: 2, marginHorizontal: 16, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  // Отдельная верхняя строка рун уплотнила экран: опускаем карточку ниже,
  // чтобы её верх не заходил на progress bar.
  cardArea: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: 32 },
  cardFace: { alignItems: 'center', width: '100%', paddingVertical: 12, gap: 12 },
  spokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 12,
  },
  inlineSlot: { paddingHorizontal: 24 },
  resultCard: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 8,
  },
  resultActions: { flexDirection: 'row', gap: 10, marginTop: 2 },
  resultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  taskRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 14,
  },
  taskCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transportRow: {
    flexDirection: 'row',
    // зачем (владелец, 2026-08-17): центр «зажми-и-говори» — круг + подпись
    // под ним, боковые кнопки — просто круг. `center` центрировал боковые по
    // ВСЕЙ высоте (круг+подпись), поэтому они садились выше, чем низ круга
    // микрофона. `flex-end` + компенсация в sideBtn сажает все три круга на
    // одну линию, подпись остаётся ниже них.
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 22,
    marginTop: 14,
    marginBottom: 14,
  },
  sideBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    // Поднимаем боковые кнопки на высоту подписи под микрофоном (см. sideBtn
    // выше) — их низ совпадает с низом круга, а не с низом подписи.
    marginBottom: SPEAK_HOLD_LABEL_HEIGHT,
  },
});
