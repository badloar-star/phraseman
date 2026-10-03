// ═══════════════════════════════════════════════════════════════════════════
// flashcards_blitz_session.tsx — НОВЫЙ режим «Блиц» (Cards 2.0 E12, §3.9
// мастер-плана — Speed Review по Memrise, «Ещё разок»-драйвер сессий/день).
//
// 60 секунд, вопросы «EN → выбери перевод из 4» из выбранного набора
// (?deck= — deck_sources; без параметра — все сохранённые + мои карточки).
// cards-2.1 (§6 SPEC_2_1): ?deck= принимает СПИСОК наборов через запятую —
// карточки объединяются в один пул (loadDeckCardsMulti),
// 3 жизни (ошибка = −1), комбо-серия ×3/×5/×10 → SFX fc_combo_* с питчем
// вверх + пружинный бейдж, счёт очков (верно = 100 × комбо-множитель).
//
// Механика 4 кнопок — концептуальный реюз trainer_arena_session (подсветка
// правильного/неверного, лок, автопереход), но быстрее: 350мс / 700мс на
// ошибке (BLITZ_ADVANCE_* в blitz_logic). Таймер-полоса — Reanimated
// transform scaleX (НЕ width — принцип 3), origin слева.
//
// Финал (таймер 0 / жизни 0) → SessionResultScreen (верно/ошибок/точность
// + счёт). legacy reward блиц не даёт (безлимитный режим).
//
// FIX (владелец, 2026-08-13):
//  • «что даёт счёт?» — личный рекорд (flashcards/blitz_record.ts): побил
//    прошлый лучший — «Новый рекорд!», иначе видно счёт и лучший результат.
//    Никакой новой валюты, наград и звёзд в разделе не заводится.
//  • выбор наборов доступен ИЗ САМОГО режима (кнопка в шапке → DeckPickerSheet,
//    как в слушании), а не только из таббара раздела.
// Чистая логика (очки/комбо/жизни/вопрос) — flashcards/blitz_logic.ts.
// ═══════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEnergy, useEnergySessionIntent } from '../components/EnergyContext';
import { buildManifestCardIndex, cardManifestId, manifestSeed, restoreManifestCards, toManifestIds } from './flashcards/training_manifest_ids';
import { attemptRevisionCandidates, resolveEnergyIntentForRecord } from './flashcards/training_energy_intent';
import NoEnergyModal from '../components/NoEnergyModal';
import SessionAttemptsHud from '../components/session_attempts/SessionAttemptsHud';
import { PracticeRuneCounter } from '../components/PracticeRuneCounter';
import { CoinRewardFlight } from '../components/rewards/CoinRewardFlight';
import { usePracticeRunes } from '../hooks/usePracticeRunes';
import { useCoinRewardFlight } from '../hooks/useCoinRewardFlight';
import { readDevPracticeRunesFakeState } from './dev_practice_runes_seed';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Reanimated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { usePremium } from '../components/PremiumContext';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import SkeletonBlock from '../components/SkeletonShimmer';
import ReportErrorButton from '../components/ReportErrorButton';
import { LinearGradient } from '../components/SafeLinearGradient';
import { triLang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { PracticeAnswerMark, PracticeBackButton, PracticeHeaderTitle, PracticeTimerPill } from '../components/practice/PracticeChrome';
import { PracticeStatePanel } from '../components/practice/PracticeStates';
import { flashcardContentLang } from './spanish_content_gate';
import { useStudyTarget } from '../components/StudyTargetContext';
import { SessionResultScreen } from './flashcards/SessionResultScreen';
import { useFcReduceMotion } from './flashcards/PhraseCard';
import { isLowPowerEffective } from './flashcards/low_power';
import { comboSfxForStreak, fcHaptic, playSfx } from './flashcards/SoundService';
import {
  BLITZ_ADVANCE_OK_MS,
  BLITZ_ADVANCE_WRONG_MS,
  BLITZ_DURATION_SEC,
  applyBlitzAnswer,
  canStartBlitz,
  buildBlitzQuestion,
  initialBlitzState,
  type BlitzQuestion,
  type BlitzState,
} from './flashcards/blitz_logic';
import { deckRefKey, loadDeckCardsMulti, parseDeckParams, type DeckCard, type DeckRef } from './flashcards/deck_sources';
import { deckRouteParam, decksCountLabel, SOLO_DECK_ID } from './flashcards/deck_selection';
import { loadAllFcDeckRefs, loadFcDeckOptions } from './flashcards/deck_options';
import DeckPickerSheet, { type DeckSheetOption } from './flashcards/DeckPickerSheet';
import { getLastPreset, presetDeckIds, type FcModePreset } from './flashcards/mode_prefs';
import { commitBlitzScore, getBlitzBest } from './flashcards/blitz_record';
import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back';
import { summarizeSession, type SessionAnswerEvent, type SessionOutcomeSummary } from './flashcards/session_queue';
import { captureCurrentAccountObjectiveAttempt } from './mistake_practice_capture';
import { isMistakeStudyTargetValue } from '../modules/mistake-practice/contracts';
import { makeFeedbackAttemptId } from './feedback_attempt_identity';
import { captureAccountGeneration } from './account_generation';
import { consumeMonthlyTrainingSession } from './monthly_training_sessions';
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
import { useSessionAttempts } from '../hooks/useSessionAttempts';
import { useSessionAttemptAutoReset } from '../hooks/useSessionAttemptAutoReset';
import { noteSwallowedAs } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

/** Акцент блица (words #4A9EFF / phrases #40C080 / arena #E05050). */
const ACCENT = '#FF8A3D';
const OK = '#40C080';
const BAD = '#E05050';
/**
 * зачем (PM-129, practice.html `.opt.ok/.opt.no`): ответ отмечается тонкой цветной обводкой и
 * подкраской 12 % поверх тёмного стекла (исключение 2.0 владельца 24.09 разрешает 1px), текст
 * остаётся основным белым — контраст тот же, что у обычного варианта.
 */
const ANSWER_OK_SURFACE = 'rgba(111,208,140,0.12)';
const ANSWER_BAD_SURFACE = 'rgba(224,80,80,0.12)';
const ANSWER_OK_EDGE = '#6FD08C';
const ANSWER_BAD_EDGE = BAD;
/** Заполнение полосы времени — светлое, как `.trk > i` макета; в последние секунды краснеет. */
const TIMER_FILL = '#E9E9EB';
/** Последние секунды — таймер краснеет, добавляя азарта. */
const DANGER_SEC = 10;

type BtnState = 'idle' | 'correct' | 'wrong';
/** Итог раунда + личный рекорд (§ «что даёт счёт»): `best` — лучший ПОСЛЕ раунда. */
type ResultState = {
  summary: SessionOutcomeSummary;
  score: number;
  best: number;
  isRecord: boolean;
};

// Fisher-Yates: единое перемешивание карточек.
function shuffleArr<T>(a: readonly T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

const IDLE_BTNS: BtnState[] = ['idle', 'idle', 'idle', 'idle'];

/**
 * Passive material only: answer events remain owned by the session state below.
 * A static translucent substrate is deliberate here: five live BlurViews on the
 * timed interaction path would be an avoidable Android rendering cost.
 */
function BlitzGlassSurface({ chrome, sheen = true }: { chrome: ReturnType<typeof liquidGlassTokens>; sheen?: boolean }) {
  if (!sheen) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={[chrome.lightTint, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={[StyleSheet.absoluteFill, { opacity: 0.08 }]}
      />
    </View>
  );
}

export default function FlashcardsBlitzSession() {
  const router = useRouter();
  const { theme: t, f, liquidGlassThemeId } = useTheme();
  const blitzGlass = liquidGlassTokens(liquidGlassThemeId);
  const { accessResolved, hasPremiumAccess } = usePremium();
  const blitzAccessGranted = accessResolved;
  const blitzAccessGrantedRef = useRef(blitzAccessGranted);
  const blitzAccessEpochRef = useRef(0);
  if (blitzAccessGrantedRef.current !== blitzAccessGranted) {
    blitzAccessGrantedRef.current = blitzAccessGranted;
    if (!blitzAccessGranted) blitzAccessEpochRef.current += 1;
  }
  const { lang } = useLang();
  const [feedbackAttemptId] = useState(makeFeedbackAttemptId);
  const { studyTarget } = useStudyTarget();

  const params = useLocalSearchParams<{ deck?: string; devRunesSeed?: string | string[]; devJumpToFinale?: string | string[] }>();
  const devJumpToFinale = (Array.isArray(params.devJumpToFinale) ? params.devJumpToFinale[0] : params.devJumpToFinale) === '1';
  // зачем (владелец, 2026-08-27): DEV-хаб «Проверка рун» открывает НАСТОЯЩИЙ
  // экран, но счётчик стартует со случайного числа вместо реальной копилки.
  // Диск и сеть в этом режиме не трогаются (см. hooks/usePracticeRunes).
  const devRunesFake = useMemo(
    () => readDevPracticeRunesFakeState(params.devRunesSeed),
    [params.devRunesSeed],
  );

  const deckParamStr = Array.isArray(params.deck) ? params.deck[0] : params.deck;
  const deckRefs = useMemo<DeckRef[]>(() => parseDeckParams(deckParamStr), [deckParamStr]);
  const contentLang = useMemo(() => flashcardContentLang(lang, studyTarget), [lang, studyTarget]);

  const [loading, setLoading] = useState(true);
  const [pool, setPool] = useState<DeckCard[]>([]);
  /** Инкремент = рестарт раунда («Ещё разок» — §3.9). */
  const [roundId, setRoundId] = useState(0);
  const [question, setQuestion] = useState<BlitzQuestion | null>(null);
  const [btnStates, setBtnStates] = useState<BtnState[]>(IDLE_BTNS);
  const [locked, setLocked] = useState(false);
  const [blitz, setBlitz] = useState<BlitzState>(() => initialBlitzState());
  const [timeLeft, setTimeLeft] = useState(BLITZ_DURATION_SEC);
  const [lastGain, setLastGain] = useState(0);
  // зачем (владелец, 2026-08-27): DEV-хаб открывает СРАЗУ экран завершения —
  // фейковый summary, реальная игровая механика не запускается вообще.
  const [result, setResult] = useState<ResultState | null>(() => (devJumpToFinale ? {
    summary: { correct: 18, wrong: 2, total: 20, accuracy: 0.9, learnKeys: [] },
    score: 1250, best: 1250, isRecord: true,
  } : null));
  // зачем (владелец, 2026-08-27): sessionKey привязан к roundId — новый раунд
  // (рестарт «Ещё разок») получает новую копилку по цене повтора, ровно как
  // строка ниже уже делает для sessionId попыток.
  const practiceRunes = usePracticeRunes({
    activity: 'flashcards_blitz',
    sessionKey: `${feedbackAttemptId}_${roundId}`,
    completionOrdinal: 1,
    devFakeStartRunes: devRunesFake?.runes,
    enabled: blitzAccessGranted,
  });
  const runeFlight = useCoinRewardFlight();
  // «Руны засчитываются, когда игрок дошёл до экрана празднования» — здесь
  // это появление result (раунд завершён по таймеру/жизням).
  useEffect(() => {
    // зачем (аудит 2026-08-28): earningsRef ещё null до конца гидратации —
    // settle() тогда тихо выходит и копилка не зачитывается никогда (DEV-хаб
    // ставит result синхронно на первом рендере, раньше гидратации).
    if (blitzAccessGranted && result && !practiceRunes.hydrating) void practiceRunes.settle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blitzAccessGranted, result, practiceRunes.hydrating]);
  /** §6: выбор наборов прямо из блица — тот же шит, что у тренировки и слушания. */
  const [deckPickerOpen, setDeckPickerOpen] = useState(false);
  const [deckOptions, setDeckOptions] = useState<DeckSheetOption[]>([]);
  const [deckPreset, setDeckPreset] = useState<FcModePreset | null>(null);
  // зачем (PM-129, владелец 2026-09-24): комментарий держал устаревшую цену
  // энергии («10 ⚡ за попытку») после единой цены 1 из PM-081..083 —
  // цифра лгала бы читающему код. Гейт стоит ДО эффекта старта раунда ниже —
  // раунд не запускается, пока энергия не подтверждена (текущая цена — 1 за сессию).
  const {
    isUnlimited: blitzEnergyUnlimited,
    confirmSpendOne: confirmBlitzEnergy,
    refundOne: refundBlitzEnergy,
    acknowledgeSessionStart,
  } = useEnergy();
  const [quotaRetryRevision, setQuotaRetryRevision] = useState(0);
  const blitzEnergyIntent = useEnergySessionIntent(
    'flashcards_blitz',
    deckParamStr ?? 'saved',
    `${feedbackAttemptId}:${roundId}:${quotaRetryRevision}`,
  );
  const [energyGate, setEnergyGate] = useState<'checking' | 'ok' | 'denied'>('checking');
  const [quotaUnavailable, setQuotaUnavailable] = useState(false);
  const blitzChargedRoundRef = useRef<number | null>(null);
  // зачем (баг «Блиц висит на каркасе», 03.10): актуальность стартового запуска — по токену, а не по
  // флагу cleanup. Смена любой зависимости эффекта в полёте (доступ, премиум, токен аккаунта, безлимит)
  // ставила cancelled=true, латч не пускал перезапуск — запуск молча выходил, energyGate навсегда 'checking'.
  const blitzStartRunRef = useRef<object | null>(null);
  const blitzGateStepRef = useRef('idle');
  const blitzGateLastSkipRef = useRef('');
  const blitzSpentOperationRef = useRef<string | null>(null);
  const blitzMountedRef = useRef(true);
  const blitzExplicitlyAbandonedRef = useRef(false);
  const blitzPendingGrantRef = useRef<{
    account: NonNullable<Awaited<ReturnType<typeof resolveFlashcardTrainingPendingGrantAccount>>>;
    record: FlashcardTrainingPendingGrantRecord;
  } | null>(null);
  const blitzPlayableManifestRef = useRef<{
    pool: DeckCard[];
    roundQueue: DeckCard[];
    initialQuestion: BlitzQuestion;
  } | null>(null);
  useEffect(() => {
    blitzMountedRef.current = true;
    return () => { blitzMountedRef.current = false; };
  }, []);
  const refundActiveBlitzEnergy = useCallback(async (reason: string) => {
    const operationId = blitzSpentOperationRef.current;
    if (!operationId) return;
    blitzSpentOperationRef.current = null;
    await refundBlitzEnergy(operationId, reason);
  }, [refundBlitzEnergy]);
  const accountToken = useMemo(() => captureAccountGeneration(), []);
  const attempts = useSessionAttempts({
    token: accountToken,
    // зачем (владелец 2026-09-15): feedbackAttemptId — время+случайность, новое
    // при каждом входе: сохранённые сердечки переставали находиться, и экран
    // всегда давал 3/3. Занятие блица определяют колода и номер раунда
    // («Ещё разок» = новое занятие, за него и платят энергией), а не случайность.
    sessionId: `flashcard-blitz:${studyTarget ?? 'en'}:${deckParamStr ?? 'all'}:${roundId}`,
    initialQuestionId: `flashcard-blitz:${roundId}:loading`,
    autoHydrate: blitzAccessGranted,
    persistenceEnabled: blitzAccessGranted,
  });

  const queueRef = useRef<DeckCard[]>([]);
  const qIdxRef = useRef(0);
  const eventsRef = useRef<SessionAnswerEvent[]>([]);
  const blitzRef = useRef<BlitzState>(blitz);
  const shownAtRef = useRef(Date.now());
  const endAtRef = useRef(0);
  const finishingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pausedRemainingMsRef = useRef(BLITZ_DURATION_SEC * 1000);
  const answerSequenceRef = useRef(0);
  /**
   * Лучший результат до текущего раунда. Читаем один раз на входе, чтобы финал
   * знал ответ мгновенно и подпись результата не «моргала» задним числом.
   */
  const bestRef = useRef(0);

  /**
   * «Уменьшить движение» / слабое устройство: микро-пульсы счёта и комбо
   * выключаются целиком (значения просто встают в 1), таймер-полоса и логика
   * не трогаются — они несут информацию, а не декор.
   */
  const simpleMotion = useFcReduceMotion() || isLowPowerEffective();
  const simpleMotionRef = useRef(simpleMotion);
  simpleMotionRef.current = simpleMotion;

  // Reanimated: таймер-полоса (scaleX, origin слева), бейдж комбо и очки.
  const progress = useSharedValue(1);
  const comboScale = useSharedValue(0);
  const scoreScale = useSharedValue(1);
  const gainAnim = useSharedValue(0);

  const timerBarStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));
  const comboStyle = useAnimatedStyle(() => ({ transform: [{ scale: comboScale.value }] }));
  const scoreStyle = useAnimatedStyle(() => ({ transform: [{ scale: scoreScale.value }] }));
  const gainStyle = useAnimatedStyle(() => ({
    opacity: 1 - gainAnim.value,
    transform: [{ translateY: -14 * gainAnim.value }],
  }));

  const clearRoundTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const hadBlitzAccessRef = useRef(false);
  useEffect(() => {
    if (blitzAccessGranted) {
      hadBlitzAccessRef.current = true;
      return;
    }

    // Access can be revoked while a paid route is already mounted. Stop the
    // active round immediately and remove all paid content before redirecting.
    clearRoundTimers();
    cancelAnimation(progress);
    if (!hadBlitzAccessRef.current) return;
    hadBlitzAccessRef.current = false;
    finishingRef.current = true;
    queueRef.current = [];
    eventsRef.current = [];
    blitzChargedRoundRef.current = null;
    const pending = blitzPendingGrantRef.current;
    if (pending) {
      blitzSpentOperationRef.current = null;
      void abandonFlashcardTrainingPendingGrant(
        pending.account,
        pending.record.fingerprint,
        refundBlitzEnergy,
        Date.now(),
        'access_lost',
      ).catch((error: unknown) => { console.warn('[FC-BLITZ] abandonFlashcardTrainingPendingGrant: возврат энергии по отложенной выдаче не удался', error); });
    } else {
      void refundActiveBlitzEnergy('access_lost').catch((error: unknown) => { console.warn('[FC-BLITZ] refundActiveBlitzEnergy: не удалось (продолжаем без неё)', error); });
    }
    setQuestion(null);
    setResult(null);
    setPool([]);
    setLocked(true);
    setEnergyGate('checking');
    setLoading(true);
    setRoundId((current) => current + 1);
  }, [blitzAccessGranted, clearRoundTimers, progress, refundActiveBlitzEnergy, refundBlitzEnergy]);

  // Личный рекорд: одно чтение на маунт, дальше — только запись при финале.
  useEffect(() => {
    if (!blitzAccessGranted) return;
    let cancelled = false;
    void getBlitzBest().then((best) => {
      if (!cancelled) bestRef.current = best;
    });
    return () => {
      cancelled = true;
    };
  }, [blitzAccessGranted]);

  // ── Загрузка пула: ?deck= или дефолт «все сохранённые + мои карточки» ──────
  useEffect(() => {
    if (!blitzAccessGranted) return undefined;
    let cancelled = false;
    void (async () => {
      // cards-2.1 (§6): один или несколько наборов — один объединённый пул.
      // FIX (владелец, 2026-08-13): дефолт (без ?deck=) раньше брал только
      // «сохранённые + мои карточки», из-за чего у человека с карточками ТОЛЬКО
      // в наборах пул был пуст и блиц не запускался. Теперь дефолт — ВСЕ
      // доступные источники, включая каждый добавленный набор.
      const allRefs = await loadAllFcDeckRefs(studyTarget).catch((): DeckRef[] => [
        { kind: 'saved' },
        { kind: 'custom' },
      ]);
      const refs: DeckRef[] = deckRefs.length > 0 ? deckRefs : allRefs;
      let cards = await loadDeckCardsMulti(refs, contentLang, { studyTarget }).catch(noteSwallowedAs('flashcards_blitz_session:useEffect.loadDeckCardsMulti', []));
      // Сохранённый пресет мог указывать на набор, который удалили/не скачали —
      // не показываем тупик, а честно добираем пул из всех доступных источников.
      if (!canStartBlitz(cards.length) && deckRefs.length > 0) {
        const wide = await loadDeckCardsMulti(allRefs, contentLang, { studyTarget }).catch(noteSwallowedAs('flashcards_blitz_session:useEffect.loadDeckCardsMulti_2', []));
        if (wide.length > cards.length) cards = wide;
      }
      if (cancelled) {
        console.log('[FC-BLITZ-GATE] pool:cancelled', JSON.stringify({ cards: cards.length }));
        return;
      }
      console.log('[FC-BLITZ-GATE] pool:loaded', JSON.stringify({ cards: cards.length, refs: refs.length }));
      setPool(cards);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [blitzAccessGranted, contentLang, deckRefs, studyTarget]);


  // ── Финал: таймер 0 или жизни 0 → результат ───────────────────────────────
  const finish = useCallback(() => {
    if (!blitzAccessGrantedRef.current || finishingRef.current) return;
    finishingRef.current = true;
    blitzSpentOperationRef.current = null;
    clearRoundTimers();
    cancelAnimation(progress);
    const summary = summarizeSession(eventsRef.current);
    const score = blitzRef.current.score;
    /**
     * Смысл счёта — личный рекорд. Сравниваем с уже прочитанным `bestRef`
     * (мгновенно, без ожидания диска), а запись идёт своей очередью и её
     * результат уточняет карточку итога, если рекорд успели обновить в
     * параллельном раунде.
     */
    const previousBest = bestRef.current;
    const isRecord = score > 0 && score > previousBest;
    if (isRecord) bestRef.current = score;
    setResult({ summary, score, best: isRecord ? score : previousBest, isRecord });
    void commitBlitzScore(score)
      .then((outcome) => {
        if (!blitzAccessGrantedRef.current) return;
        bestRef.current = outcome.best;
        setResult((cur) =>
          cur && cur.score === outcome.score
            ? { ...cur, best: outcome.best, isRecord: outcome.isRecord }
            : cur,
        );
      })
      .catch((error: unknown) => { console.warn('[FC-BLITZ] сохранение рекорда не удалось (продолжаем без неё)', error); });
  }, [clearRoundTimers, progress]);

  const pauseBlitzCountdown = useCallback(() => {
    pausedRemainingMsRef.current = Math.max(0, endAtRef.current - Date.now());
    clearRoundTimers();
    cancelAnimation(progress);
    setTimeLeft(Math.max(0, Math.ceil(pausedRemainingMsRef.current / 1000)));
  }, [clearRoundTimers, progress]);

  const resumeBlitzCountdown = useCallback(() => {
    const remainingMs = Math.max(0, pausedRemainingMsRef.current);
    if (remainingMs <= 0) {
      finish();
      return;
    }
    clearRoundTimers();
    endAtRef.current = Date.now() + remainingMs;
    setTimeLeft(Math.ceil(remainingMs / 1000));
    progress.value = Math.min(1, remainingMs / (BLITZ_DURATION_SEC * 1000));
    progress.value = withTiming(0, { duration: remainingMs, easing: Easing.linear });
    intervalRef.current = setInterval(() => {
      const remainder = endAtRef.current - Date.now();
      const seconds = Math.max(0, Math.ceil(remainder / 1000));
      setTimeLeft((current) => (current === seconds ? current : seconds));
      if (remainder <= 0) finish();
    }, 200);
  }, [clearRoundTimers, finish, progress]);

  // Ровно одно списание на каждый roundId (первый заход и каждый рестарт «Ещё
  // разок»). Пока не решено — стартовый эффект ниже ждёт (см. energyGate).
  //
  // зачем ref-латч по roundId, а не только deps: аудит 2026-08-23 нашёл, что
  // blitzEnergyUnlimited в deps приводил к ПОВТОРНОМУ списанию в том же раунде.
  // Флаг меняется асинхронно (холодный старт: false → true у подписчика) и
  // может переключаться обратно — например в 22:00, когда истекает «вечер без
  // лимитов». Каждое такое переключение перезапускало эффект и снимало ещё
  // единицу. Латч помнит, за какой roundId уже заплачено.
  useEffect(() => {
    if (!blitzAccessGranted || loading || !canStartBlitz(pool.length)) {
      const skip = `access=${blitzAccessGranted} loading=${loading} pool=${pool.length} round=${roundId}`;
      if (blitzGateLastSkipRef.current !== skip) {
        blitzGateLastSkipRef.current = skip;
        console.log(`[FC-BLITZ-GATE] start:wait ${skip}`);
      }
      return;
    }
    if (blitzChargedRoundRef.current === roundId) return;

    blitzChargedRoundRef.current = roundId;
    setEnergyGate('checking');
    setQuotaUnavailable(false);
    const accessEpoch = blitzAccessEpochRef.current;
    const runToken = {};
    blitzStartRunRef.current = runToken;
    const startedAt = Date.now();
    const gateLog = (step: string, extra: Record<string, unknown> = {}) => {
      blitzGateStepRef.current = step;
      console.log(`[FC-BLITZ-GATE] ${step}`, JSON.stringify({ round: roundId, ms: Date.now() - startedAt, ...extra }));
    };
    // Устарел, только если начался другой запуск, экран размонтирован или вход брошен явно.
    const isStaleRun = () => blitzStartRunRef.current !== runToken
      || !blitzMountedRef.current
      || blitzExplicitlyAbandonedRef.current;
    let cancelled = false;
    gateLog('start:begin', {
      pool: pool.length, unlimited: blitzEnergyUnlimited, premium: hasPremiumAccess,
      accountPhase: accountToken.phase, stable: String(accountToken.stableId ?? '').slice(0, 8),
    });
    void (async () => {
      gateLog('account:await');
      const pendingAccount = await resolveFlashcardTrainingPendingGrantAccount(accountToken);
      gateLog('account:done', { found: Boolean(pendingAccount) });
      if (!pendingAccount) throw new Error('pending_grant_account_unavailable');
      const roundQueue = shuffleArr(pool);
      // зачем: коллизия отпечатков → pending_grant_manifest_id_collision → существующий fail-open с логом.
      const cardIndex = buildManifestCardIndex(pool);
      const pendingScope = {
        mode: 'blitz' as const,
        studyTarget,
        contentLang,
        deckKeys: deckRefs.length > 0 ? deckRefs.map(deckRefKey) : ['all'],
        sessionSize: Number.MAX_SAFE_INTEGER,
        preset: 'blitz',
      };
      gateLog('prepare:await');
      const prepared = await prepareFlashcardTrainingPendingGrant({
        account: pendingAccount,
        scope: pendingScope,
        manifest: {
          schemaVersion: 'flashcard-training-manifest.v1',
          mode: 'blitz',
          // зачем (дыра в экономике 03.10): компактный manifest — отпечатки id (пул и очередь раунда),
          // без текстов карточек и без energyIntent; иначе invalid_input → fail-open → энергия бесплатно.
          payload: {
            // зачем (ревью Opus, LOW 3): очередь раунда — тот же пул в другом порядке; один список вместо двух.
            orderedCardIds: toManifestIds(roundQueue),
            seed: manifestSeed(`${feedbackAttemptId}:${roundId}`),
            initialCardId: cardManifestId(roundQueue[0]!.id),
          },
        },
        attemptId: `${feedbackAttemptId}:${roundId}`,
        receiptId: `blitz:${feedbackAttemptId}:${roundId}`,
        energyOperationId: blitzEnergyIntent.operationId,
        energyEpoch: blitzEnergyIntent.grant.attemptId,
      });
      gateLog('prepare:done', { status: prepared.status, reason: 'reason' in prepared ? String(prepared.reason) : null });
      if (prepared.status !== 'prepared' && prepared.status !== 'reused') {
        // зачем: без reason аудит по логу невозможен — «unavailable» ничего не объясняет.
        throw new Error(`pending_grant_${prepared.status}:${'reason' in prepared ? String(prepared.reason) : 'n/a'}`);
      }
      let pendingRecord = prepared.record;
      blitzPendingGrantRef.current = { account: pendingAccount, record: pendingRecord };
      gateLog('reconcile:await');
      const reconciled = await reconcileFlashcardTrainingPendingGrant(pendingAccount, pendingScope);
      gateLog('reconcile:done', { status: reconciled.status });
      // зачем (баг 03.10): 'missing' сразу после prepare раньше давал немой return — экран навсегда на
      // каркасе. Любой исход обязан выводить из 'checking': уводим в catch → существующий fail-open.
      if (reconciled.status === 'found') pendingRecord = reconciled.record;
      else throw new Error(`pending_grant_reconcile_${reconciled.status}`);
      blitzPendingGrantRef.current = { account: pendingAccount, record: pendingRecord };
      const manifestPayload = pendingRecord.manifest.payload as { orderedCardIds?: unknown };
      // зачем: пул для отвлекающих вариантов восстанавливается из той же очереди раунда.
      const restoredRoundQueue = restoreManifestCards<DeckCard>(manifestPayload.orderedCardIds, cardIndex);
      const restoredPool = restoredRoundQueue;
      // зачем: первый вопрос собираем заново из восстановленных карточек (отвлекающие варианты — из пула).
      const restored = {
        pool: restoredPool,
        roundQueue: restoredRoundQueue,
        initialQuestion: buildBlitzQuestion(restoredRoundQueue[0]!, restoredPool),
      };
      // зачем: интент берём ТОЛЬКО под запись журнала (reused/ротация), иначе двойное списание или потерянный возврат.
      const recordIntent = resolveEnergyIntentForRecord({
        record: pendingRecord,
        currentIntent: blitzEnergyIntent,
        screenKind: 'flashcards_blitz',
        screenSubjectId: deckParamStr ?? 'saved',
        attemptIdsFromRecordAttempt: (attempt) => attemptRevisionCandidates(attempt, quotaRetryRevision),
        mode: 'blitz',
      });

      let energyCharged = pendingRecord.energyState === 'charged';
      gateLog('energy:await', { charged: energyCharged, unlimited: blitzEnergyUnlimited });
      const result = energyCharged || blitzEnergyUnlimited
        ? 'unlimited'
        : await confirmBlitzEnergy(recordIntent);
      gateLog('energy:done', { result });
      if (result === 'spent') {
        energyCharged = true;
        blitzSpentOperationRef.current = pendingRecord.energyOperationId;
        const marked = await markFlashcardTrainingEnergyCharged(pendingAccount, pendingRecord.fingerprint);
        if ('record' in marked) pendingRecord = marked.record;
      }
      cancelled = isStaleRun();
      const isCurrentAccess = !cancelled
        && blitzAccessGrantedRef.current
        && blitzAccessEpochRef.current === accessEpoch;
      if (!isCurrentAccess) {
        // Plain effect cleanup preserves the durable start. Explicit navigation
        // uses abandonFlashcardTrainingPendingGrant from `leave` below.
        gateLog('exit:not_current', {
          stale: cancelled, access: blitzAccessGrantedRef.current,
          epochChanged: blitzAccessEpochRef.current !== accessEpoch,
        });
        return;
      }
      if (result === 'cancelled') {
        gateLog('exit:energy_cancelled');
        await discardFlashcardTrainingPendingGrant(pendingAccount, pendingRecord.fingerprint);
        safeRouterBack(router, '/flashcards' as never);
        return;
      }
      if (result === 'insufficient') {
        gateLog('exit:energy_insufficient');
        await discardFlashcardTrainingPendingGrant(pendingAccount, pendingRecord.fingerprint);
        setEnergyGate('denied');
        return;
      }
      if (pendingRecord.phase === 'prepared') {
        gateLog('quota:await');
        const quotaResult = await consumeMonthlyTrainingSession({
          token: accountToken,
          accessResolved,
          hasPremiumAccess,
          receiptId: pendingRecord.receiptId,
          mode: 'blitz',
        });
        gateLog('quota:done', { status: quotaResult.status });
        if (quotaResult.status === 'allowed') {
          const marked = await markFlashcardTrainingQuotaCommitted(
            pendingAccount,
            pendingRecord.fingerprint,
            Date.now(),
            quotaResult.resetAt,
          );
          if ('record' in marked) pendingRecord = marked.record;
        } else {
          if (energyCharged) await abandonFlashcardTrainingPendingGrant(
            pendingAccount,
            pendingRecord.fingerprint,
            refundBlitzEnergy,
            Date.now(),
            'quota_refused',
          );
          await discardFlashcardTrainingPendingGrant(pendingAccount, pendingRecord.fingerprint);
          blitzSpentOperationRef.current = null;
          blitzPendingGrantRef.current = null;
          cancelled = isStaleRun();
          gateLog('exit:quota_refused', { status: quotaResult.status, stale: cancelled });
          if (!cancelled && quotaResult.status === 'exhausted') {
          markNextNavigationAsReplace();
          router.replace({ pathname: '/flashcards_training_setup', params: {
            mode: 'blitz',
          } } as never);
        } else if (!cancelled) {
          setQuotaUnavailable(true);
        }
        return;
      }
      }
      cancelled = isStaleRun();
      if (cancelled || !blitzMountedRef.current || blitzExplicitlyAbandonedRef.current) {
        gateLog('exit:stale_before_ok', { mounted: blitzMountedRef.current, abandoned: blitzExplicitlyAbandonedRef.current });
        return;
      }
      blitzPlayableManifestRef.current = {
        pool: restored.pool,
        roundQueue: restored.roundQueue,
        initialQuestion: restored.initialQuestion,
      };
      blitzPendingGrantRef.current = { account: pendingAccount, record: pendingRecord };
      setPool(restored.pool);
      gateLog('ok', { pool: restored.pool.length });
      setEnergyGate('ok');
    })().catch(async (error) => {
      cancelled = isStaleRun();
      gateLog('catch', { stale: cancelled, error: error instanceof Error ? error.message : String(error) });
      const pending = blitzPendingGrantRef.current;
      if (pending) {
        await abandonFlashcardTrainingPendingGrant(
          pending.account,
          pending.record.fingerprint,
          refundBlitzEnergy,
          Date.now(),
          'entry_failed',
        ).catch((error: unknown) => { console.warn('[FC-BLITZ] abandonFlashcardTrainingPendingGrant: возврат энергии по отложенной выдаче не удался', error); });
        await discardFlashcardTrainingPendingGrant(pending.account, pending.record.fingerprint).catch((error: unknown) => { console.warn('[FC-BLITZ] discardFlashcardTrainingPendingGrant: не удалось (продолжаем без неё)', error); });
      } else {
        await refundActiveBlitzEnergy('quota_refused').catch((error: unknown) => { console.warn('[FC-BLITZ] refundActiveBlitzEnergy: не удалось (продолжаем без неё)', error); });
      }
      console.warn('[FC-BLITZ] energy start/refund failed', String((error as Error)?.message ?? error));
      console.warn('[FC-TRAIN-ENTRY] blitz entry:catch', JSON.stringify({
        cancelled,
        error: (error instanceof Error ? `${error.name}: ${error.message}` : String(error)),
        pendingPhase: pending?.record.phase ?? null,
        pendingEnergy: pending?.record.energyState ?? null,
        accountPhase: accountToken.phase,
        accountStableId: accountToken.stableId,
      }));
      if (cancelled || !blitzMountedRef.current || blitzExplicitlyAbandonedRef.current) return;
      /**
       * зачем (приказ владельца 2026-09-14, дословно: «НЕ ЧИНИ, А УБЕРИ»): слой
       * отложенного гранта (phone-state) больше НЕ ИМЕЕТ ПРАВА закрыть вход в
       * тренировку. Четыре круга починки базы, а экран «Не удалось открыть
       * данные тренировок» всё равно вставал. Если грант недоступен — раунд
       * стартует локально из уже загруженного пула: без чека квоты и без
       * списания энергии (оба — фоновые механизмы, их отказ не должен стоить
       * человеку тренировки). Каждый такой старт громко помечен в логе.
       */
      const message = error instanceof Error ? error.message : String(error);
      if (/^pending_grant/.test(message) && canStartBlitz(pool.length)) {
        const roundQueue = shuffleArr(pool);
        blitzPlayableManifestRef.current = {
          pool,
          roundQueue,
          initialQuestion: buildBlitzQuestion(roundQueue[0]!, pool),
        };
        blitzPendingGrantRef.current = null;
        blitzSpentOperationRef.current = null;
        console.warn('[FC-TRAIN-ENTRY] blitz entry:fail-open — грант недоступен, раунд стартует локально без чека и без списания энергии', JSON.stringify({ reason: message, poolSize: pool.length }));
        setPool(pool);
        gateLog('ok:fail_open', { reason: message });
        setEnergyGate('ok');
        return;
      }
      gateLog('exit:unavailable', { reason: message });
      setQuotaUnavailable(true);
    });
    // зачем (баг 03.10): cleanup больше НЕ отменяет запуск — латч всё равно не дал бы перезапуску пройти,
    // и экран остался бы на каркасе. Устаревание определяет isStaleRun (новый запуск / размонтирование / уход).
    return undefined;
  }, [accessResolved, hasPremiumAccess, accountToken, blitzAccessGranted, blitzEnergyIntent, feedbackAttemptId, loading, pool, roundId, blitzEnergyUnlimited, confirmBlitzEnergy, contentLang, deckParamStr, deckRefs, refundActiveBlitzEnergy, refundBlitzEnergy, router, studyTarget]);

  // зачем (баг «Блиц висит на каркасе», 03.10): любой исход обязан выводить с каркаса. Если через 20 с
  // экран всё ещё на каркасе — полный снимок в лог (чтобы по одному grep было видно, ЧТО держит), и если
  // держит стартовая проверка (не ожидание ответа человека в окне энергии) — экран «Попробовать снова».
  const BLITZ_GATE_WATCHDOG_MS = 20_000;
  useEffect(() => {
    const onSkeleton = !blitzAccessGranted || loading || energyGate === 'checking';
    if (!onSkeleton || quotaUnavailable) return undefined;
    const timer = setTimeout(() => {
      const step = blitzGateStepRef.current;
      const snapshot = {
        access: blitzAccessGranted, loading, energyGate, pool: pool.length, round: roundId, step,
        latch: blitzChargedRoundRef.current, hasRun: Boolean(blitzStartRunRef.current),
        mounted: blitzMountedRef.current, abandoned: blitzExplicitlyAbandonedRef.current,
      };
      console.warn('[FC-BLITZ-GATE] watchdog:stuck_on_skeleton', JSON.stringify(snapshot));
      if (energyGate === 'checking' && blitzAccessGranted && !loading && step !== 'energy:await') {
        console.warn('[FC-BLITZ-GATE] watchdog:show_retry', JSON.stringify({ step }));
        setQuotaUnavailable(true);
      }
    }, BLITZ_GATE_WATCHDOG_MS);
    return () => clearTimeout(timer);
  }, [blitzAccessGranted, energyGate, loading, pool.length, quotaUnavailable, roundId]);

  const retryQuotaStart = useCallback(() => {
    blitzChargedRoundRef.current = null;
    setQuotaUnavailable(false);
    setEnergyGate('checking');
    setQuotaRetryRevision((current) => current + 1);
  }, []);

  // ── Старт/рестарт раунда: перемешка, таймер-полоса, первый вопрос ─────────
  useEffect(() => {
    if (!blitzAccessGranted || loading || !canStartBlitz(pool.length) || energyGate !== 'ok') return;
    finishingRef.current = false;
    eventsRef.current = [];
    const durableManifest = blitzPlayableManifestRef.current;
    blitzPlayableManifestRef.current = null;
    queueRef.current = durableManifest?.roundQueue ?? shuffleArr(pool);
    qIdxRef.current = 0;
    answerSequenceRef.current = 0;
    pausedRemainingMsRef.current = BLITZ_DURATION_SEC * 1000;
    const init = initialBlitzState();
    blitzRef.current = init;
    setBlitz(init);
    setBtnStates(IDLE_BTNS);
    setLocked(false);
    setLastGain(0);
    setTimeLeft(BLITZ_DURATION_SEC);
    setQuestion(durableManifest?.initialQuestion ?? buildBlitzQuestion(queueRef.current[0]!, pool));
    shownAtRef.current = Date.now();
    endAtRef.current = Date.now() + BLITZ_DURATION_SEC * 1000;
    comboScale.value = 0;

    progress.value = 1;
    progress.value = withTiming(0, {
      duration: BLITZ_DURATION_SEC * 1000,
      easing: Easing.linear,
    });

    /**
     * зачем (владелец, 2026-08-16, «прыжки/дёрганье»): тик остаётся частым —
     * он ловит конец раунда без задержки. Но setState теперь только когда
     * СЕКУНДА реально сменилась: раньше 5 обновлений в секунду перерисовывали
     * весь экран (вопрос, 4 кнопки, шапка) ради текста, который меняется раз
     * в секунду, и на слабом Android это читалось как дрожание.
     * Полоса таймера не затронута — она и так едет на UI-потоке (progress).
     */
    intervalRef.current = setInterval(() => {
      const rem = endAtRef.current - Date.now();
      const sec = Math.max(0, Math.ceil(rem / 1000));
      setTimeLeft((cur) => (cur === sec ? cur : sec));
      if (rem <= 0) finish();
    }, 200);

    const pending = blitzPendingGrantRef.current;
    if (pending) {
      void (async () => {
        await markFlashcardTrainingPendingGrantPlayable(
          pending.account,
          pending.record.fingerprint,
        );
        const cleared = await acknowledgeAndClearFlashcardTrainingPendingGrant(
          pending.account,
          pending.record.fingerprint,
          pending.record.energyState === 'charged' ? acknowledgeSessionStart : async () => true,
        );
        if (cleared.status === 'cleared') {
          blitzPendingGrantRef.current = null;
          blitzSpentOperationRef.current = null;
        }
      })();
    }

    return () => {
      clearRoundTimers();
      cancelAnimation(progress);
    };
    // Рестарт — только по roundId / новой загрузке пула / решению по энергии
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acknowledgeSessionStart, blitzAccessGranted, loading, pool, roundId, energyGate]);

  // ── Следующий вопрос (пул зациклен — 60с может пережить весь список) ─────
  const nextQuestion = useCallback(() => {
    if (!blitzAccessGrantedRef.current || finishingRef.current) return;
    let idx = qIdxRef.current + 1;
    if (idx >= queueRef.current.length) {
      const lastId = queueRef.current[queueRef.current.length - 1]?.id;
      let reshuffled = shuffleArr(pool);
      // Не показываем ту же карточку дважды подряд на стыке перемешек
      if (reshuffled.length > 1 && reshuffled[0]!.id === lastId) {
        const j = 1 + Math.floor(Math.random() * (reshuffled.length - 1));
        [reshuffled[0], reshuffled[j]] = [reshuffled[j]!, reshuffled[0]!];
      }
      queueRef.current = reshuffled;
      idx = 0;
    }
    qIdxRef.current = idx;
    setQuestion(buildBlitzQuestion(queueRef.current[idx]!, pool));
    setBtnStates(IDLE_BTNS);
    setLocked(false);
    shownAtRef.current = Date.now();
  }, [pool]);

  const updateAttemptQuestion = attempts.updateQuestion;
  useEffect(() => {
    if (!question) return;
    updateAttemptQuestion(`flashcard-blitz:${roundId}:${qIdxRef.current}:${question.card.id}`);
  }, [question, roundId, updateAttemptQuestion]);

  // ── Ответ (реюз механики арены: подсветка + лок + автопереход) ────────────
  const pick = useCallback(
    (optIdx: number) => {
      if (!blitzAccessGrantedRef.current || locked || finishingRef.current || !question) return;
      setLocked(true);
      const isOk = optIdx === question.correctIndex;

      setBtnStates(
        question.options.map((_, i): BtnState => {
          if (i === question.correctIndex) return 'correct';
          if (i === optIdx && !isOk) return 'wrong';
          return 'idle';
        }),
      );
      eventsRef.current.push({
        key: question.card.id,
        correct: isOk,
        ms: Date.now() - shownAtRef.current,
      });
      // зачем (владелец, 2026-08-27): руна за карточку, засчитывается один раз
      // за раунд — если та же карточка выпадет снова в этом же раунде,
      // копилка отклонит повтор сама (already-credited).
      if (isOk) {
        const awarded = practiceRunes.onCorrectAnswer(question.card.id);
        if (awarded > 0) runeFlight.fly(awarded);
      }

      const answerAttemptId = [
        'flashcard-blitz',
        roundId,
        qIdxRef.current,
        question.card.id,
        answerSequenceRef.current++,
      ].join(':');
      const attemptEffect = attempts.registerVerdict({
        answerAttemptId,
        verdict: isOk ? 'correct' : 'pedagogical_wrong',
      });

      const { state, gained, comboHit } = applyBlitzAnswer(blitzRef.current, isOk);
      blitzRef.current = state;
      setBlitz(state);

      if (isOk) {
        // §5: комбо ×3/×5/×10 — мотив correct с питчем +2/+4/+6 + хаптика 2×Light
        if (comboHit != null) {
          playSfx(comboSfxForStreak(state.streak));
          fcHaptic('combo');
        } else {
          playSfx('correct');
          fcHaptic('correct');
        }
        setLastGain(gained);
        // Бейдж комбо «клюёт» на каждый верный в серии; на пороге — сильнее.
        // Пики строго ≤ 1 (см. FC_TEXT_SAFE_PULSE): раньше комбо и счёт
        // разгонялись до 1.45/1.15, и текст внутри них апскейлился — на iPhone
        // цифры и кириллица становились «мыльными». Критически задемпфированные
        // пружины (dampingRatio: 1) не перелетают цель, поэтому 1 — потолок.
        if (state.streak >= 3) {
          comboScale.value = simpleMotionRef.current
            ? 1
            : withSequence(
                withTiming(comboHit != null ? 0.74 : 0.88, { duration: 90 }),
                withSpring(1, { duration: 340, dampingRatio: 1 }),
              );
        }
        scoreScale.value = simpleMotionRef.current
          ? 1
          : withSequence(
              withTiming(0.86, { duration: 80 }),
              withSpring(1, { duration: 320, dampingRatio: 1 }),
            );
        gainAnim.value = 0;
        gainAnim.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) });
      } else {
        // зачем (22.09): узкий список языков не пускал запись ошибки для
        // испанского и немецкого — блиц для них не пополнял «Мои ошибки».
        if (isMistakeStudyTargetValue(studyTarget)) {
          void captureCurrentAccountObjectiveAttempt({
            attemptId: `flashcard-blitz:${roundId}:${qIdxRef.current}:${question.card.id}:${optIdx}`,
            studyTarget,
            verdict: 'wrong',
            objective: true,
            content: {
              sourceKind: 'flashcard',
              sourceId: question.card.id,
              canonicalTarget: question.card.en,
              sourceMeaning: question.card.translation,
              distractors: pool.filter((card) => card.id !== question.card.id).slice(0, 5).map((card) => card.en),
            },
            facet: { kind: 'meaning', expected: question.card.en },
          }).catch((error: unknown) => { console.warn('[FC-BLITZ] запись попытки в цели аккаунта не удалась (продолжаем без неё)', error); });
        }
        playSfx('incorrect');
        fcHaptic('wrong');
        comboScale.value = withTiming(0, { duration: 150 });
      }

      if (attemptEffect === 'attempts_exhausted') {
        pauseBlitzCountdown();
        return;
      }
      timersRef.current.push(
        setTimeout(nextQuestion, isOk ? BLITZ_ADVANCE_OK_MS : BLITZ_ADVANCE_WRONG_MS),
      );
    },
    [
      attempts,
      comboScale,
      gainAnim,
      locked,
      nextQuestion,
      pauseBlitzCountdown,
      pool,
      practiceRunes,
      question,
      roundId,
      runeFlight,
      scoreScale,
      studyTarget,
    ],
  );

  const resetBlitzAfterSessionRuneForfeit = useCallback(() => {
    setBtnStates(IDLE_BTNS);
    setLocked(false);
    shownAtRef.current = Date.now();
    resumeBlitzCountdown();
  }, [resumeBlitzCountdown]);

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
    onRestored: resetBlitzAfterSessionRuneForfeit,
  });

  const leave = useCallback(() => {
    fcHaptic('tap');
    blitzExplicitlyAbandonedRef.current = true;
    const pending = blitzPendingGrantRef.current;
    if (pending) {
      blitzSpentOperationRef.current = null;
      void abandonFlashcardTrainingPendingGrant(
        pending.account,
        pending.record.fingerprint,
        refundBlitzEnergy,
      ).catch((error: unknown) => { console.warn('[FC-BLITZ] abandonFlashcardTrainingPendingGrant: не удалось (продолжаем без неё)', error); });
    }
    safeRouterBack(router, '/flashcards' as never);
  }, [refundBlitzEnergy, router]);

  /** «Ещё разок!» — драйвер сессий/день (§3.9): мгновенный рестарт раунда. */
  const restart = useCallback(() => {
    blitzExplicitlyAbandonedRef.current = false;
    blitzSpentOperationRef.current = null;
    setResult(null);
    setEnergyGate('checking');
    setRoundId((r) => r + 1);
  }, []);

  // ── §6: выбор наборов ПРЯМО ИЗ БЛИЦА (FIX владельца, 2026-08-13) ──────────
  //
  // Раньше отметить наборы для блица можно было только из таббара раздела
  // (⚙ на пункте меню) — внутри режима путь к выбору отсутствовал. Теперь
  // кнопка в шапке открывает тот же DeckPickerSheet, что у тренировки и
  // слушания: мультивыбор, счётчик выбранного, сохранение в fc_mode_prefs_v1.
  /** Список наборов грузим только при открытии шита — вход в блиц не платит. */
  useEffect(() => {
    if (!deckPickerOpen) return;
    let cancelled = false;
    void (async () => {
      const [decks, preset] = await Promise.all([
        loadFcDeckOptions('blitz', lang, studyTarget).catch(noteSwallowedAs('flashcards_blitz_session:useEffect.loadFcDeckOptions', [])),
        getLastPreset('blitz').catch(noteSwallowedAs('flashcards_blitz_session:useEffect.getLastPreset', null)),
      ]);
      if (cancelled) return;
      setDeckOptions(decks);
      setDeckPreset(preset);
    })();
    return () => {
      cancelled = true;
    };
  }, [deckPickerOpen, lang, studyTarget]);

  /**
   * Блиц — режим на время, «поставить на паузу и вернуться» тут нечестно:
   * секунды под открытым шитом всё равно утекли бы. Поэтому раунд честно
   * останавливается, а закрытие шита без выбора начинает его заново.
   */
  const openDeckPicker = useCallback(() => {
    fcHaptic('tap');
    finishingRef.current = true;
    clearRoundTimers();
    cancelAnimation(progress);
    setDeckPickerOpen(true);
  }, [clearRoundTimers, progress]);

  const closeDeckPicker = useCallback(() => {
    setDeckPickerOpen(false);
    restart();
  }, [restart]);

  /**
   * Недостаточно карточек → предлагаем выбрать наборы, как в режиме «Устно»
   * (владелец, 2026-08-17): «Блиц» больше не прячется из меню по
   * размеру пула, значит вход возможен и с пустым/маленьким набором. Раньше
   * этот случай молча уводил назад (`safeRouterBack`) — теперь тот же
   * DeckPickerSheet, что уже открывается кнопкой в шапке, открывается сам.
   * Раунд ещё не стартовал (эффект старта сам ждёт `canStartBlitz`), поэтому
   * `openDeckPicker`'ы `clearRoundTimers`/`cancelAnimation` здесь — no-op.
   */
  const autoPickedRef = useRef(false);
  useEffect(() => {
    autoPickedRef.current = false;
  }, [deckParamStr]);
  useEffect(() => {
    if (loading || canStartBlitz(pool.length) || autoPickedRef.current) return;
    autoPickedRef.current = true;
    openDeckPicker();
  }, [loading, pool.length, openDeckPicker]);

  /**
   * Старт с выбранными наборами: тот же экран с новым `?deck=` (replace, чтобы
   * «назад» не возвращал в раунд со старым набором). Пресет уже сохранён шитом
   * (`setLastPreset('blitz', …)`), поэтому следующий запуск придёт с ним сам.
   */
  const startWithPreset = useCallback(
    (preset: FcModePreset) => {
      setDeckPickerOpen(false);
      // Исторический псевдо-набор «Слабые» не относится к наборам карточек.
      const deck = deckRouteParam(presetDeckIds(preset).filter((d) => d !== SOLO_DECK_ID));
      /**
       * Выбор не изменился — `?deck=` совпал бы со старым, экран бы не
       * перезапустился и остался бы с остановленным раундом. Тогда просто
       * начинаем раунд заново, без навигации.
       */
      const sameDecks =
        parseDeckParams(deck).map(deckRefKey).join(',') === deckRefs.map(deckRefKey).join(',');
      if (sameDecks) {
        restart();
        return;
      }
      router.replace({
        pathname: '/flashcards_blitz_session',
        params: deck ? { deck } : {},
      } as never);
    },
    [deckRefs, restart, router],
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
      reduceMotion={simpleMotion}
      mode="blitz"
    />
  );

  /** Подпись кнопки выбора наборов — во все восемь локалей. */
  const pickDecksLabel = useMemo(
    () =>
      triLang(lang, {
        ru: 'Выбрать наборы',
        uk: 'Обрати набори',
        en: 'Choose packs',
        es: 'Elegir packs',
        'pt-BR': 'Escolher pacotes',
        vi: 'Chọn bộ thẻ',
        id: 'Pilih set kartu',
        tr: 'Setleri seç',
        pl: 'Wybierz zestawy',
      }),
    [lang],
  );

  const deckTitle = useMemo(() => {
    if (deckRefs.length === 0) return triLang(lang, {
      ru: 'Все карточки', uk: 'Усі картки', en: 'All cards', es: 'Todas las tarjetas',
      'pt-BR': 'Todos os cartões', vi: 'Tất cả thẻ', id: 'Semua kartu',
      tr: 'Tüm kartlar', pl: 'Wszystkie fiszki',
    });
    if (deckRefs.length > 1) {
      /** cards-2.1 (§6): форма слова по числу — «2 набора», а не «2 наборов». */
      return decksCountLabel(lang, deckRefs.length);
    }
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

  // ── Рендер ─────────────────────────────────────────────────────────────────
  /**
   * зачем (владелец, 2026-08-16, «прыжки страниц»): раньше здесь во весь экран
   * центрировалось «…», а потом СКАЧКОМ появлялся весь блиц — шапка, полоса
   * таймера, счёт, вопрос, 4 кнопки. Performance Bible требует обратного:
   * первый кадр = финальная геометрия. Держим ту же раскладку и подменяем только
   * содержимое скелетонами тех же размеров (questionBox 110, optionBtn ~50).
   */
  if (quotaUnavailable) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }} testID="fc-blitz-quota-unavailable">
          <ContentWrap>
            {/* зачем (cards.html setupError): данные тренировки не открылись — плитка, сообщение,
                одна кнопка «Попробовать снова»; повтор тот же (retryQuotaStart). */}
            <PracticeStatePanel
              glass={blitzGlass}
              icon="cloud-offline-outline"
              message={triLang(lang, {
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
              action={{
                label: triLang(lang, { ru: 'Попробовать снова', uk: 'Спробувати ще раз', en: 'Try again', es: 'Intentar de nuevo', 'pt-BR': 'Tentar novamente', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Spróbuj ponownie' }),
                icon: 'refresh-outline',
                onPress: retryQuotaStart,
                testID: 'fc-blitz-quota-retry',
              }}
            />
          </ContentWrap>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  if (!blitzAccessGranted || loading || energyGate === 'checking') {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            <View style={styles.headerRow}>
              <PracticeBackButton glass={blitzGlass} color={t.textPrimary} />
              <PracticeHeaderTitle
                glass={blitzGlass}
                title={triLang(lang, {
                  ru: 'Блиц', uk: 'Бліц', en: 'Blitz', es: 'Blitz', 'pt-BR': 'Blitz',
                  vi: 'Blitz', id: 'Blitz', tr: 'Blitz', pl: 'Blitz',
                })}
              >
                <View style={{ marginTop: 4 }}><SkeletonBlock width={120} height={f.caption} /></View>
              </PracticeHeaderTitle>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <SessionAttemptsHud remaining={3} locale={lang} testID="fc-blitz-attempts-loading" />
                {/* зачем: заготовка ровно под плашку монет (52×36) — шапка не прыгает при старте. */}
                <SkeletonBlock width={52} height={36} borderRadius={18} />
              </View>
            </View>

            <View style={[styles.timerTrack, { backgroundColor: blitzGlass.glassEdge }]} />

            <View style={styles.scoreRow}>
              <View style={{ minWidth: 90 }}>
                <SkeletonBlock width={32} height={18} />
              </View>
              <SkeletonBlock width={62} height={38} borderRadius={19} />
              <View style={{ minWidth: 90 }} />
            </View>

            <View style={{ flex: 1, paddingHorizontal: 16, gap: 14, justifyContent: 'center' }}>
              <View style={[styles.questionBox, styles.glassSurface, { backgroundColor: blitzGlass.card }]}>
                <SkeletonBlock width="70%" height={(f.h1 ?? 24) + 2} />
              </View>
              <View style={{ gap: 10 }}>
                {Array.from({ length: 4 }, (_, i) => (
                  <SkeletonBlock key={i} width="100%" height={58} borderRadius={14} />
                ))}
              </View>
            </View>
          </ContentWrap>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  if (result) {
    return (
      <SessionResultScreen
        correct={devRunesFake ? devRunesFake.tertiary + 4 : result.summary.correct}
        wrong={devRunesFake ? devRunesFake.tertiary : result.summary.wrong}
        runesGained={practiceRunes.runes}
        learnLeft={0}
        onRetryWrong={restart}
        feedback={{ entityId: `${feedbackAttemptId}:blitz:${roundId}:${deckParamStr || 'all'}`, entityLabel: 'Блиц' }}
        retryLabel={triLang(lang, {
          ru: 'Ещё разок!', uk: 'Ще разок!', en: 'One more!', es: '¡Otra vez!', 'pt-BR': 'Mais uma!',
          vi: 'Chơi lại!', id: 'Sekali lagi!', tr: 'Bir daha!', pl: 'Jeszcze raz!',
        })}
        scoreText={
          /**
           * Смысл счёта — личный рекорд (FIX владельца, 2026-08-13):
           * побил прошлый лучший → «Новый рекорд! N», иначе → «Счёт: N ·
           * рекорд: M». Ни наград, ни валюты, ни звёзд.
           *
           * зачем devRunesFake (владелец, 2026-08-27): «Проверка рун» из
           * DEV-хаба подменяет и счёт — сама игровая механика (commitBlitzScore
           * и т.д.) остаётся честной и нетронутой, подмена только в тексте.
           */
          (() => {
            const displayScore = devRunesFake ? devRunesFake.secondary : result.score;
            const displayBest = devRunesFake ? devRunesFake.tertiary * 100 : result.best;
            return result.isRecord
              ? triLang(lang, {
                  ru: `Новый рекорд! ${displayScore}`,
                  uk: `Новий рекорд! ${displayScore}`,
                  en: `New record! ${displayScore}`,
                  es: `¡Nuevo récord! ${displayScore}`,
                  'pt-BR': `Novo recorde! ${displayScore}`,
                  vi: `Kỷ lục mới! ${displayScore}`,
                  id: `Rekor baru! ${displayScore}`,
                  tr: `Yeni rekor! ${displayScore}`,
                  pl: `Nowy rekord! ${displayScore}`,
                })
              : triLang(lang, {
                  ru: `Счёт: ${displayScore} · рекорд: ${displayBest}`,
                  uk: `Рахунок: ${displayScore} · рекорд: ${displayBest}`,
                  en: `Score: ${displayScore} · record: ${displayBest}`,
                  es: `Puntos: ${displayScore} · récord: ${displayBest}`,
                  'pt-BR': `Pontos: ${displayScore} · recorde: ${displayBest}`,
                  vi: `Điểm: ${displayScore} · kỷ lục: ${displayBest}`,
                  id: `Skor: ${displayScore} · rekor: ${displayBest}`,
                  tr: `Puan: ${displayScore} · rekor: ${displayBest}`,
                  pl: `Wynik: ${displayScore} · rekord: ${displayBest}`,
                });
          })()
        }
        onDone={leave}
        accentColor={ACCENT}
        testID="fc-blitz-result"
      />
    );
  }

  /**
   * Карточек не хватает — предлагаем выбрать наборы (владелец, 2026-08-17),
   * как в режиме «Устно»: пункт «Блиц» больше не прячется из меню по
   * размеру пула, значит этот экран — не редкий deep-link случай, а обычный
   * путь для того, кто ещё не отметил наборы. Шит уже открылся сам (эффект
   * выше); эта кнопка — на случай, если его закрыли не выбрав ничего.
   */
  if (!canStartBlitz(pool.length)) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }} testID="fc-blitz-unavailable">
          <ContentWrap>
            <View style={styles.headerRow}>
              <PracticeBackButton
                glass={blitzGlass}
                color={t.textPrimary}
                onPress={leave}
                testID="fc-blitz-back"
                accessibilityLabel={triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' })}
              />
              <PracticeHeaderTitle
                glass={blitzGlass}
                title={triLang(lang, {
                  ru: 'Блиц', uk: 'Бліц', en: 'Blitz', es: 'Blitz', 'pt-BR': 'Blitz',
                  vi: 'Blitz', id: 'Blitz', tr: 'Blitz', pl: 'Blitz',
                })}
              />
            </View>
            {/* зачем (cards.html «Мало карточек для блица»): то же сообщение и кнопка выбора наборов
                в виде служебного состояния макета; действие прежнее — openDeckPicker. */}
            <PracticeStatePanel
              glass={blitzGlass}
              testID="fc-blitz-too-few"
              icon="flash-outline"
              message={triLang(lang, {
                  ru: 'Для блица нужны хотя бы 4 карточки. Выбери ещё наборы: из карточек собираются варианты ответа.',
                  uk: 'Для бліцу потрібні хоча б 4 картки. Вибери ще набори: з карток складаються варіанти відповіді.',
                  en: 'Blitz needs at least 4 cards. Add more packs: the cards provide the answer choices.',
                  es: 'Blitz necesita al menos 4 tarjetas. Elige más packs: las tarjetas forman las opciones de respuesta.',
                  'pt-BR': 'O Blitz precisa de pelo menos 4 cartões. Escolha mais pacotes: os cartões formam as opções de resposta.',
                  vi: 'Blitz cần ít nhất 4 thẻ. Chọn thêm bộ thẻ để tạo các lựa chọn đáp án.',
                  id: 'Blitz perlu minimal 4 kartu. Pilih paket tambahan: kartu membentuk pilihan jawaban.',
                  tr: 'Blitz için en az 4 kart gerekir. Daha fazla paket seç: cevap seçenekleri kartlardan oluşturulur.',
                  pl: 'Blitz wymaga co najmniej 4 kart. Wybierz więcej zestawów: karty tworzą opcje odpowiedzi.',
                })}
              action={{
                label: pickDecksLabel,
                icon: 'albums-outline',
                onPress: openDeckPicker,
                testID: 'fc-blitz-pick-decks-empty',
                accessibilityLabel: 'qa-fc-blitz-pick-decks',
              }}
            />
          </ContentWrap>
        </SafeAreaView>
        {deckPickerSheet}
      </ScreenGradient>
    );
  }

  const danger = timeLeft <= DANGER_SEC;
  // зачем: одна подпись «Назад» и название режима для шапки на 9 языках (круглая кнопка макета без текста).
  const backLabel = triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' });
  const blitzTitle = triLang(lang, { ru: 'Блиц', uk: 'Бліц', en: 'Blitz', es: 'Blitz', 'pt-BR': 'Blitz', vi: 'Blitz', id: 'Blitz', tr: 'Blitz', pl: 'Blitz' });
  const mm = Math.floor(timeLeft / 60);
  const ss = String(timeLeft % 60).padStart(2, '0');

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          {/* Header: назад · «Блиц · набор» · сердца · монеты — как шапка practice.html.
              зачем (PM-129): монеты раньше висели отдельной строкой НАД шапкой; кнопка выбора
              наборов ушла — наборы выбираются на экране настройки тренировки (D152), шапка
              освободилась, и плашка монет встала на своё место из макета. */}
          <View style={styles.headerRow}>
            <PracticeBackButton glass={blitzGlass} color={t.textPrimary} onPress={leave} testID="fc-blitz-back" accessibilityLabel={backLabel} />
            <PracticeHeaderTitle glass={blitzGlass} title={blitzTitle}>
              <ScrollView horizontal style={{ maxWidth: '100%', flexGrow: 0 }} showsHorizontalScrollIndicator={false}>
                <Text style={{ color: blitzGlass.secondary, fontSize: 16, lineHeight: 21, marginTop: 2 }}>{deckTitle}</Text>
              </ScrollView>
            </PracticeHeaderTitle>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <SessionAttemptsHud
                remaining={attempts.state.remainingAttempts}
                locale={lang}
                testID="fc-blitz-attempts"
              />
              <View ref={runeFlight.counterRef} collapsable={false}>
                <PracticeRuneCounter
                  runes={practiceRunes.runes}
                  lang={lang}
                  backgroundColor={blitzGlass.opaqueControl}
                  color={t.textPrimary}
                  testID="fc-blitz-practice-runes"
                />
              </View>
              {/* зачем: блиц показывает английскую фразу и переводы-дистракторы,
                  то есть контент, в котором бывает ошибка, — а пожаловаться было
                  негде (в свайпе флаг есть, здесь его забыли). Флаг только когда
                  вопрос на экране: жаловаться на пустоту не на что. */}
              {question ? (
                <ReportErrorButton
                  screen="flashcards_blitz"
                  dataId={`flashcard_${question.card.id ?? 'unknown'}`}
                  dataText={`EN: ${question.card.en}
RU: ${question.card.translation}`}
                  variant="icon-flag"
                  accessibilityLabel={triLang(lang, { ru: 'Сообщить об ошибке в карточке', uk: 'Повідомити про помилку в картці', en: 'Report an error in the card', es: 'Informar de un error en la tarjeta', 'pt-BR': 'Relatar erro no cartão', vi: 'Báo lỗi trong thẻ', id: 'Laporkan kesalahan pada kartu', tr: 'Karttaki hatayı bildir', pl: 'Zgłoś błąd w fiszce' })}
                  testID="fc-blitz-report"
                />
              ) : null}
            </View>
          </View>

          {/* Таймер-полоса: Reanimated scaleX от 1 к 0, origin слева (принцип 3) */}
          <View style={[styles.timerTrack, { backgroundColor: blitzGlass.glassEdge }]}>
            <Reanimated.View
              style={[
                styles.timerFill,
                { backgroundColor: danger ? BAD : TIMER_FILL, transformOrigin: 'left' },
                timerBarStyle,
              ]}
            />
          </View>

          {/* Счёт · время · комбо — источник полёта рун (владелец, 2026-08-27) */}
          <View ref={runeFlight.originRef} collapsable={false} style={styles.scoreRow}>
            <View style={{ minWidth: 90 }}>
              <Reanimated.View style={scoreStyle}>
                <Text
                  testID="fc-blitz-score"
                  // зачем (PM-129, шкала D145): под полосой мелкая подпись (13/600, вторичный
                  // тон), а не крупная цифра — счёт остаётся, но перестаёт спорить с вопросом.
                  style={{ color: blitzGlass.secondary, fontSize: 13, lineHeight: 17, fontWeight: '600', fontVariant: ['tabular-nums'] }}
                >
                  {blitz.score}
                </Text>
              </Reanimated.View>
              {lastGain > 0 ? (
                <Reanimated.View pointerEvents="none" style={[styles.gainFloat, gainStyle]}>
                  <Text style={{ color: OK, fontSize: f.caption + 1, fontWeight: '900' }}>+{lastGain}</Text>
                </Reanimated.View>
              ) : null}
            </View>
            <PracticeTimerPill
              testID="fc-blitz-timer"
              glass={blitzGlass}
              color={danger ? BAD : blitzGlass.text}
              text={`${mm}:${ss}`}
            />
            <View style={{ minWidth: 90, alignItems: 'flex-end' }}>
              {blitz.streak >= 3 ? (
                <Reanimated.View
                  testID="fc-blitz-combo"
                  style={[styles.comboBadge, { backgroundColor: `${ACCENT}2E` }, comboStyle]}
                >
                  <Ionicons name="flame" size={15} color={ACCENT} />
                  <Text style={{ color: ACCENT, fontSize: f.sub, fontWeight: '900' }}>×{blitz.streak}</Text>
                </Reanimated.View>
              ) : null}
            </View>
          </View>

          {/* Вопрос + 4 варианта */}
          <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingVertical: 12, gap: 14, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
            <View style={[styles.questionBox, styles.glassSurface, { backgroundColor: blitzGlass.card }]}>
              <BlitzGlassSurface chrome={blitzGlass} />
              <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '700', marginBottom: 6 }}>
                {triLang(lang, {
                  ru: 'Выбери перевод', uk: 'Обери переклад', en: 'Choose the translation', es: 'Elige la traducción',
                  'pt-BR': 'Escolha a tradução', vi: 'Chọn bản dịch', id: 'Pilih terjemahan', tr: 'Çeviriyi seç', pl: 'Wybierz tłumaczenie',
                })}
              </Text>
              <Text
                testID="fc-blitz-question"

                style={[styles.questionText, { color: t.textPrimary, fontSize: (f.h1 ?? 24) + 2 }]}
              >
                {question?.card.en ?? ''}
              </Text>
            </View>

            <View style={{ gap: 10 }}>
              {(question?.options ?? []).map((opt, i) => {
                const state = btnStates[i];
                // зачем (PM-129, `.opt` / `.opt.ok` / `.opt.no` макета): у варианта тонкая
                // полупрозрачная обводка; ответ — цветная обводка + подкраска 12 % ПОВЕРХ стекла
                // (основа карточки остаётся), текст основной, значок ✓/✕ — цветом состояния.
                const tint = state === 'correct' ? ANSWER_OK_SURFACE : state === 'wrong' ? ANSWER_BAD_SURFACE : null;
                const edge = state === 'correct' ? ANSWER_OK_EDGE : state === 'wrong' ? ANSWER_BAD_EDGE : blitzGlass.glassEdge;
                return (
                  <TouchableOpacity
                    key={`${qIdxRef.current}_${i}`}
                    testID={`fc-blitz-opt-${i}`}
                    accessibilityLabel={`qa-fc-blitz-opt-${i}`}
                    accessible
                    onPress={() => pick(i)}
                    disabled={locked}
                    activeOpacity={0.75}
                    style={[styles.optionBtn, styles.glassSurface, { backgroundColor: blitzGlass.card, borderColor: edge }]} // guard-ok: исключение 2.0 — 1px полупрозрачная обводка .opt
                  >
                    <BlitzGlassSurface chrome={blitzGlass} sheen={state === 'idle'} />
                    {tint ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} /> : null}
                    <Text  style={[styles.optionText, { color: t.textPrimary, fontSize: f.body }]}>
                      {opt}
                    </Text>
                    {state === 'correct' || state === 'wrong' ? (
                      <PracticeAnswerMark kind={state} color={state === 'correct' ? ANSWER_OK_EDGE : ANSWER_BAD_EDGE} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </ContentWrap>
        {deckPickerSheet}
      </SafeAreaView>
      <NoEnergyModal visible={energyGate === 'denied'} onClose={leave} activity="flashcards" />
      {runeFlight.flight && (
        <CoinRewardFlight
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
  timerTrack: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  timerFill: { height: 6, borderRadius: 3, width: '100%' },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 12,
  },
  gainFloat: { position: 'absolute', top: -4, left: 2 },
  /**
   * зачем: блок вопроса и бейдж комбо разделяются тоном, без рамки. Варианты ответа (PM-129)
   * несут тонкую 1px обводку `.opt` из practice.html — исключение 2.0 владельца (24.09).
   */
  comboBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  questionBox: {
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    minHeight: 110,
    justifyContent: 'center',
  },
  glassSurface: {
    overflow: 'hidden',
  },
  questionText: { fontWeight: '800', textAlign: 'center' },
  optionBtn: {
    borderRadius: 14,
    borderWidth: 1, // guard-ok: исключение 2.0 (24.09) — тонкая полупрозрачная обводка `.opt` макета practice.html
    minHeight: 58,
    paddingVertical: 12,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { fontWeight: '700', textAlign: 'center' },
});
