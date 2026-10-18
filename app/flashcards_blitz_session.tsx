// ═══════════════════════════════════════════════════════════════════════════
// flashcards_blitz_session.tsx — НОВЫЙ режим «Блиц» (Cards 2.0 E12, §3.9
// мастер-плана — Speed Review по Memrise, «Ещё разок»-драйвер сессий/день).
//
// 60 секунд, вопросы «EN → выбери перевод из 4» из выбранного набора
// (?deck= — deck_sources; без параметра — все сохранённые + мои карточки).
// cards-2.1 (§6 SPEC_2_1): ?deck= принимает СПИСОК наборов через запятую —
// карточки объединяются в один пул (loadDeckCardsMulti),
// 3 жизни (ошибка = −1). Очков, комбо и рекорда нет (владелец 04.10: «ОЧКИ
// ИЗ БЛИЦА УБИРАЙ ВООБЩЕ, ТОЛЬКО МОНЕТЫ СЧИТАЕМ») — считаем только монеты.
//
// Механика 4 кнопок — концептуальный реюз trainer_arena_session (подсветка
// правильного/неверного, лок, автопереход), но быстрее: 350мс / 700мс на
// ошибке (BLITZ_ADVANCE_* в blitz_logic). Таймер-полоса — Reanimated
// transform scaleX (НЕ width — принцип 3), origin слева.
//
// Финал (таймер 0 / жизни 0) → SessionResultScreen (верно/ошибок/точность
// + монеты). legacy reward блиц не даёт (безлимитный режим).
//
// FIX (владелец, 2026-08-13):
//  • выбор наборов доступен ИЗ САМОГО режима (кнопка в шапке → DeckPickerSheet,
//    как в слушании), а не только из таббара раздела.
// Чистая логика (жизни/вопрос) — flashcards/blitz_logic.ts.
// ═══════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getDevBlitzAnswer, getDevTrainGate } from './dev_cards_state';
import { isDevAnimationsOff } from './dev_animations_off';
import { isAttemptsStopEffect } from './session_attempts/session_attempts_stop';
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
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { usePremium } from '../components/PremiumContext';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import SkeletonBlock from '../components/SkeletonShimmer';
import { triLang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { plateBoxShadow } from '../components/v2/ShadowSurface';
import { PracticeAnswerMark, PracticeBackButton, PracticeHeaderTitle, PracticeTimerPill } from '../components/practice/PracticeChrome';
import { KitGlassLayer } from '../components/v2/KitLiquidGlass';
import { useLineScale } from '../hooks/useLineScale';
import { PracticeStatePanel } from '../components/practice/PracticeStates';
import { flashcardContentLang } from './spanish_content_gate';
import { useTrainingStudyTarget } from './flashcards/use_training_study_target';
import { SessionResultScreen } from './flashcards/SessionResultScreen';
import { buildResultMistakes } from './flashcards/session_result_mistakes';
import { useFcReduceMotion } from './flashcards/PhraseCard';
import { isLowPowerEffective } from './flashcards/low_power';
import { fcHaptic, playSfx } from './flashcards/SoundService';
import {
  BLITZ_ADVANCE_OK_MS,
  BLITZ_ADVANCE_WRONG_MS,
  applyBlitzAnswer,
  canStartBlitz,
  buildBlitzQuestion,
  initialBlitzState,
  type BlitzQuestion,
  type BlitzState,
} from './flashcards/blitz_logic';
import { parseBlitzDurationSec } from './flashcards/practice_setup_params';
import { deckRefKey, loadDeckCardsMulti, parseDeckParams, type DeckCard, type DeckRef } from './flashcards/deck_sources';
import { deckRouteParam, decksCountLabel, SOLO_DECK_ID } from './flashcards/deck_selection';
import { hydrateFcDeckOptionsSnapshot, loadAllFcDeckRefs, loadFcDeckOptions, peekFcDeckOptions, sameDeckOptions } from './flashcards/deck_options';
import DeckPickerSheet, { type DeckSheetOption } from './flashcards/DeckPickerSheet';
import { getLastPreset, presetDeckIds, type FcModePreset } from './flashcards/mode_prefs';
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
  claimFlashcardTrainingRoundStart,
  logFlashcardTrainingRoundClear,
  resolveFlashcardTrainingPendingGrantAccount,
  type FlashcardTrainingPendingGrantRecord,
} from './flashcard_training_pending_grant';
import { useSessionAttempts } from '../hooks/useSessionAttempts';
import { useSessionAttemptAutoReset } from '../hooks/useSessionAttemptAutoReset';
import { noteSwallowedAs } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

/** Акцент блица (words #4A9EFF / phrases #40C080 / arena #E05050). */
const ACCENT = '#FF8A3D'; // theme-exempt: семантика верно/неверно и акцент режима Блиц (токены good/bad — у «Тем»)
const OK = '#40C080'; // theme-exempt: семантика верно/неверно и акцент режима Блиц (токены good/bad — у «Тем»)
const BAD = '#E05050'; // theme-exempt: семантика верно/неверно и акцент режима Блиц (токены good/bad — у «Тем»)
/**
 * зачем (PM-129, practice.html `.opt.ok/.opt.no`): ответ отмечается тонкой цветной обводкой и
 * подкраской 12 % поверх тёмного стекла (исключение 2.0 владельца 24.09 разрешает 1px), текст
 * остаётся основным белым — контраст тот же, что у обычного варианта.
 */
// зачем (владелец 05.10, решение 4: главный макет Блица — cards-section, cards-glass.css `.opt.ok/.opt.no`): подкраска ответа 14 %.
const ANSWER_OK_SURFACE = 'rgba(111,208,140,0.14)'; // theme-exempt: семантика верно/неверно и акцент режима Блиц (токены good/bad — у «Тем»)
const ANSWER_BAD_SURFACE = 'rgba(224,80,80,0.14)'; // theme-exempt: семантика верно/неверно и акцент режима Блиц (токены good/bad — у «Тем»)
/** cards-section `.opt.fade`: после ответа остальные варианты гаснут до .38. */
const ANSWER_FADE_OPACITY = 0.38;
const ANSWER_OK_EDGE = '#6FD08C'; // theme-exempt: семантика верно/неверно и акцент режима Блиц (токены good/bad — у «Тем»)
const ANSWER_BAD_EDGE = BAD;
/** Последние секунды — таймер краснеет, добавляя азарта. */
const DANGER_SEC = 10;

type BtnState = 'idle' | 'correct' | 'wrong';
/** Итог раунда: только сводка ответов (очков и рекорда нет — владелец 04.10). */
type ResultState = {
  summary: SessionOutcomeSummary;
  /** Сыграно секунд раунда (без пауз) — ячейка «время» итога (cards-section `resBlitz`). */
  playedSec?: number;
};

/** Кадр после отрисовки: в RN — requestAnimationFrame; в среде без него (тесты) — следующий тик. */
function scheduleAfterPaint(callback: () => void): number {
  if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(callback);
  return setTimeout(callback, 0) as unknown as number;
}
function cancelAfterPaint(handle: number): void {
  if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(handle);
  else clearTimeout(handle as unknown as ReturnType<typeof setTimeout>);
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

const IDLE_BTNS: BtnState[] = ['idle', 'idle', 'idle', 'idle'];

/**
 * Passive material only: answer events remain owned by the session state below.
 * A static translucent substrate is deliberate here: five live BlurViews on the
 * timed interaction path would be an avoidable Android rendering cost.
 */
// зачем (сверка 04.10, kit.css блок LIQUID GLASS): карточка вопроса и варианты — то же стекло, что в макете
// (блик 150°, светлая кромка сверху-слева, тёмная снизу-справа), через общий слой; у ответа «верно/неверно»
// своя цветная кромка, поэтому там только блик без кромки (`rim={false}`).
function BlitzGlassSurface({ radius, sheen = true }: { radius: number; sheen?: boolean }) {
  return <KitGlassLayer radius={radius} rim={sheen} />;
}

export default function FlashcardsBlitzSession() {
  const router = useRouter();
  const { theme: t, f, liquidGlassThemeId } = useTheme();
  const blitzGlass = liquidGlassTokens(liquidGlassThemeId);
  const lh = useLineScale();
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
  // зачем (владелец 12.10, п.83, cards-027): тренировка идёт на языке ВЫБРАННЫХ наборов (?target, проверенный хуком: только
  // языки с «Карточками» ready, иначе язык приложения). Энергия и месячная квота — по аккаунту, от языка не зависят.
  const studyTarget = useTrainingStudyTarget();

  const params = useLocalSearchParams<{ deck?: string; sec?: string | string[]; devRunesSeed?: string | string[]; devJumpToFinale?: string | string[] }>();
  // зачем (координатор 04.10, настройка тренировки 30/60/90 с): длительность раунда — из маршрута, один раз
  // на вход в сессию (ref: эффекты раунда не пересоздаются; без параметра — прежние 60 с).
  const roundDurationMsRef = useRef<number | null>(null);
  if (roundDurationMsRef.current === null) roundDurationMsRef.current = parseBlitzDurationSec(params.sec) * 1000;
  const roundDurationMs = roundDurationMsRef.current;
  // зачем (координатор 05.10, «тап → назад → Блиц открылся сам»): каждый вход в экран блица печатает, с чем пришёл — по этой строке видно, КТО его открыл (маршрут и параметры) и сколько раз.
  useEffect(() => {
    console.log('[BLITZ-AUTOOPEN] session:mount', JSON.stringify({ deck: params.deck ?? null, sec: params.sec ?? null, at: Date.now() }));
    return () => console.log('[BLITZ-AUTOOPEN] session:unmount', JSON.stringify({ at: Date.now() }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
  // зачем (chain21 Сверки, practice-001…003: `#fc-blitz-opt-target` не найден; правило «сперва логи»): при dev-подмене ответа (`blitz_answer=`) — какой вариант помечен целью на каждый новый вопрос; пустой вопрос тоже виден.
  const devTargetTraceRef = useRef('');
  useEffect(() => {
    const devAnswer = getDevBlitzAnswer();
    if (devAnswer === null) return;
    const trace = JSON.stringify({
      devAnswer, hasQuestion: question != null, options: question?.options?.length ?? 0, correctIndex: question?.correctIndex ?? null,
      firstWrong: question ? question.options.findIndex((_o, idx) => idx !== question.correctIndex) : null, pool: pool.length, roundId,
    });
    if (devTargetTraceRef.current === trace) return;
    devTargetTraceRef.current = trace;
    console.log('[BLITZ-DEV] target', trace); // guard-ok: dev-подмена ответа, журнал при смене значений
  }, [pool.length, question, roundId]);
  const [btnStates, setBtnStates] = useState<BtnState[]>(IDLE_BTNS);
  const [locked, setLocked] = useState(false);
  // зачем (аудит Optimistic UI Карточек, 12.10): `locked` — состояние, и два тапа в одном кадре видели его «ещё свободным» и писали ответ дважды
  // (двойная запись в eventsRef, двойной applyBlitzAnswer). Синхронный замок — ref; снимается, когда состояние вернулось в «свободно».
  const pickLockRef = useRef(false);
  useEffect(() => { if (!locked) pickLockRef.current = false; }, [locked]);
  // зачем (Карточки 2.0 12.10, cards-v2.html «Блиц — верно»: пилюля «+10» в углу карточки вопроса): сколько рун дал верный ответ; 0 — нет пилюли
  const [lastAward, setLastAward] = useState(0);
  const [blitz, setBlitz] = useState<BlitzState>(() => initialBlitzState());
  const [timeLeft, setTimeLeft] = useState(() => roundDurationMs / 1000);
  // зачем (владелец, 2026-08-27): DEV-хаб открывает СРАЗУ экран завершения —
  // фейковый summary, реальная игровая механика не запускается вообще.
  const [result, setResult] = useState<ResultState | null>(() => (devJumpToFinale ? {
    summary: { correct: 18, wrong: 2, total: 20, accuracy: 0.9, learnKeys: [] },
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
  // зачем (PM-214 A2, D158): если пул карточек не загрузился — «Попробовать снова» перезапускает именно его загрузку (эффект пула зависит от этого счётчика).
  const [poolReloadRevision, setPoolReloadRevision] = useState(0);
  const blitzEnergyIntent = useEnergySessionIntent(
    'flashcards_blitz',
    deckParamStr ?? 'saved',
    `${feedbackAttemptId}:${roundId}:${quotaRetryRevision}`,
  );
  const [energyGate, setEnergyGate] = useState<'checking' | 'ok' | 'denied'>('checking');
  const [quotaUnavailable, setQuotaUnavailable] = useState(false);
  const quotaUnavailableRef = useRef(false);
  quotaUnavailableRef.current = quotaUnavailable;
  // зачем (сверка 04.10 16:50, «ошибка на экране, а энергия списана»): стартовый запуск, который ещё идёт.
  // «Попробовать снова» при живом запуске присоединяется к нему, а не стартует второй prepare с тем же
  // receiptId (это давало reused-запись, гонку discard и второе списание).
  const blitzRunInFlightRef = useRef<object | null>(null);
  const blitzChargedRoundRef = useRef<number | null>(null);
  // зачем (баг «Блиц висит на каркасе», 03.10): актуальность стартового запуска — по токену, а не по
  // флагу cleanup. Смена любой зависимости эффекта в полёте (доступ, премиум, токен аккаунта, безлимит)
  // ставила cancelled=true, латч не пускал перезапуск — запуск молча выходил, energyGate навсегда 'checking'.
  const blitzStartRunRef = useRef<object | null>(null);
  const blitzGateStepRef = useRef('idle');
  // зачем (Дизайн 04.10): время последнего шага старта — сторож считает простой, а не время с начала.
  const blitzGateStepAtRef = useRef(Date.now());
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
  const pausedRemainingMsRef = useRef(roundDurationMs);
  const answerSequenceRef = useRef(0);

  /** «Уменьшить движение» / слабое устройство — передаётся экрану итогов. */
  const simpleMotion = useFcReduceMotion() || isLowPowerEffective();

  // Reanimated: таймер-полоса (scaleX, origin слева).
  const progress = useSharedValue(1);

  // зачем (practice.html `.trk`): полоса растёт от 0 по прошедшему времени; `progress` по-прежнему — доля оставшегося.
  const timerBarStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: 1 - progress.value }] }));

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
  }, [blitzAccessGranted, contentLang, deckRefs, studyTarget, poolReloadRevision]);


  // ── Финал: таймер 0 или жизни 0 → результат ───────────────────────────────
  const finish = useCallback(() => {
    if (!blitzAccessGrantedRef.current || finishingRef.current) return;
    finishingRef.current = true;
    blitzSpentOperationRef.current = null;
    clearRoundTimers();
    cancelAnimation(progress);
    const summary = summarizeSession(eventsRef.current);
    // зачем: время итога = длина раунда минус остаток таймера; паузы (фон) не считаются.
    const roundMs = roundDurationMsRef.current ?? roundDurationMs;
    const playedSec = Math.max(0, roundMs - Math.max(0, endAtRef.current - Date.now())) / 1000;
    setResult({ summary, playedSec });
  }, [clearRoundTimers, progress, roundDurationMs]);

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
    progress.value = Math.min(1, remainingMs / (roundDurationMsRef.current ?? roundDurationMs));
    if (isDevAnimationsOff()) {
      console.log('[DEV-STATE] blitz: возобновление без анимации (animations=off)', JSON.stringify({ remainingMs })); // guard-ok: dev-ветка
      return;
    }
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
    // зачем (координатор 12.10, R1 «нет пути», Карточки): dev `train_gate=fail_blitz` — «Тренировка не открылась» без реального слоя выдачи; в стор-сборке геттер выключен.
    if (getDevTrainGate() === 'fail_blitz') {
      console.log('[DEV-STATE] blitz: слой выдачи подменён отказом (fail_blitz)'); // guard-ok: dev-ветка
      setQuotaUnavailable(true);
      return;
    }
    const accessEpoch = blitzAccessEpochRef.current;
    const runToken = {};
    blitzStartRunRef.current = runToken;
    blitzRunInFlightRef.current = runToken;
    const startedAt = Date.now();
    const gateLog = (step: string, extra: Record<string, unknown> = {}) => {
      blitzGateStepRef.current = step;
      blitzGateStepAtRef.current = Date.now();
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
      // зачем (лимит тренировок 04.10): без claim старта переходы фаз отвечают claim_required — запись не очищается,
      // и следующий раунд на той же колоде наследует квитанцию первого: месячный лимит не списывался.
      pendingRecord = await claimFlashcardTrainingRoundStart({
        account: pendingAccount,
        record: pendingRecord,
        mode: 'blitz',
        currentAttemptId: `${feedbackAttemptId}:${roundId}`,
      });
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
      // зачем (находка DQA 04.10, «28 из 30» до и после раунда): списание идёт ТОЛЬКО для записи в фазе prepared;
      // подхваченная запись прошлого раунда (уже committed) списывает ноль — лог показывает, какая ветка сработала.
      console.log('[BLITZ-LIMIT] blitz:quota_branch', JSON.stringify({
        phase: pendingRecord.phase,
        receipt: String(pendingRecord.receiptId ?? '').slice(0, 12),
        willConsume: pendingRecord.phase === 'prepared',
        premium: hasPremiumAccess,
        accessResolved,
      })); // guard-ok: одна строка на старт раунда
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
        console.log('[BLITZ-LIMIT] blitz:quota_result', JSON.stringify({ status: quotaResult.status, used: quotaResult.used, limit: quotaResult.limit, bypass: quotaResult.bypass })); // guard-ok: одна строка на старт раунда
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
      if (quotaUnavailableRef.current) {
        // зачем: сторож показал «Попробовать снова», но запуск дошёл — показываем раунд, за который заплачено.
        gateLog('ok:after_retry_screen', { hideRetry: true });
        setQuotaUnavailable(false);
      }
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
        if (quotaUnavailableRef.current) {
          gateLog('ok:after_retry_screen', { hideRetry: true, failOpen: true });
          setQuotaUnavailable(false);
        }
        gateLog('ok:fail_open', { reason: message });
        setEnergyGate('ok');
        return;
      }
      gateLog('exit:unavailable', { reason: message });
      setQuotaUnavailable(true);
    }).finally(() => {
      if (blitzRunInFlightRef.current === runToken) blitzRunInFlightRef.current = null;
      console.log('[FC-BLITZ-GATE] run:settled', JSON.stringify({ round: roundId, ms: Date.now() - startedAt, step: blitzGateStepRef.current }));
    });
    // зачем (баг 03.10): cleanup больше НЕ отменяет запуск — латч всё равно не дал бы перезапуску пройти,
    // и экран остался бы на каркасе. Устаревание определяет isStaleRun (новый запуск / размонтирование / уход).
    return undefined;
  }, [accessResolved, hasPremiumAccess, accountToken, blitzAccessGranted, blitzEnergyIntent, feedbackAttemptId, loading, pool, roundId, blitzEnergyUnlimited, confirmBlitzEnergy, contentLang, deckParamStr, deckRefs, refundActiveBlitzEnergy, refundBlitzEnergy, router, studyTarget]);

  // зачем (баг «Блиц висит на каркасе», 03.10): любой исход обязан выводить с каркаса. Если через 20 с
  // экран всё ещё на каркасе — полный снимок в лог (чтобы по одному grep было видно, ЧТО держит), и если
  // держит стартовая проверка (не ожидание ответа человека в окне энергии) — экран «Попробовать снова».
  const BLITZ_GATE_WATCHDOG_MS = 20_000;
  // зачем (Дизайн 04.10): как в «Устно» — сторож считает простой (20 с без нового шага), а не время с начала,
  // чтобы медленный, но идущий запуск на слабом телефоне не превращался в «Попробовать снова».
  useEffect(() => {
    const onSkeleton = !blitzAccessGranted || loading || energyGate === 'checking';
    if (!onSkeleton || quotaUnavailable) return undefined;
    blitzGateStepAtRef.current = Math.max(blitzGateStepAtRef.current, Date.now() - 1);
    let timer: ReturnType<typeof setTimeout> | null = null;
    const check = () => {
      const idleMs = Date.now() - blitzGateStepAtRef.current;
      if (idleMs < BLITZ_GATE_WATCHDOG_MS) {
        timer = setTimeout(check, BLITZ_GATE_WATCHDOG_MS - idleMs);
        return;
      }
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
      } else if (loading && blitzAccessGranted) {
        // Пул карточек не загрузился за 20 с простоя — не вечный каркас, а «Попробовать снова» (повтор перезапускает загрузку пула).
        console.warn('[FC-BLITZ-GATE] watchdog:show_retry_pool', JSON.stringify({ step, pool: pool.length, round: roundId }));
        setQuotaUnavailable(true);
      }
    };
    timer = setTimeout(check, BLITZ_GATE_WATCHDOG_MS);
    return () => { if (timer) clearTimeout(timer); };
  }, [blitzAccessGranted, energyGate, loading, pool.length, quotaUnavailable, roundId]);

  const retryQuotaStart = useCallback(() => {
    // зачем (сверка 04.10): прежний итог (раунд, отыгравший за экраном ошибки) не должен всплыть после повтора.
    setResult(null);
    const inFlight = blitzRunInFlightRef.current;
    if (inFlight && blitzStartRunRef.current === inFlight && !loading) {
      // Запуск ещё идёт — второй не стартуем (тот же receiptId → reused/гонка/второе списание).
      // Ждём его исход: ok снимет экран сам, отказ вернёт «Попробовать снова».
      console.warn('[FC-BLITZ-GATE] retry:attach_in_flight', JSON.stringify({ round: roundId, step: blitzGateStepRef.current }));
      blitzGateStepAtRef.current = Date.now();
      setQuotaUnavailable(false);
      return;
    }
    console.warn('[FC-BLITZ-GATE] retry:new_run', JSON.stringify({ round: roundId, inFlight: Boolean(inFlight), loading }));
    blitzChargedRoundRef.current = null;
    setQuotaUnavailable(false);
    setEnergyGate('checking');
    setQuotaRetryRevision((current) => current + 1);
    // Если зависла загрузка пула — перезапускаем её (прежний прогон отменяется флагом cancelled в эффекте).
    if (loading) {
      console.warn('[FC-BLITZ-GATE] retry:reload_pool', JSON.stringify({ round: roundId }));
      setPoolReloadRevision((current) => current + 1);
    }
  }, [loading, roundId]);

  // ── Старт/рестарт раунда: перемешка, таймер-полоса, первый вопрос ─────────
  useEffect(() => {
    if (!blitzAccessGranted || loading || !canStartBlitz(pool.length) || energyGate !== 'ok') return;
    if (quotaUnavailable) {
      // зачем (сверка 04.10): раунд за экраном ошибки отыгрывал 60 с невидимо и оставлял итог 0/0.
      console.warn('[FC-BLITZ-GATE] round:held_behind_retry_screen', JSON.stringify({ round: roundId }));
      return;
    }
    finishingRef.current = false;
    eventsRef.current = [];
    const durableManifest = blitzPlayableManifestRef.current;
    blitzPlayableManifestRef.current = null;
    queueRef.current = durableManifest?.roundQueue ?? shuffleArr(pool);
    qIdxRef.current = 0;
    answerSequenceRef.current = 0;
    pausedRemainingMsRef.current = roundDurationMsRef.current ?? roundDurationMs;
    const init = initialBlitzState();
    blitzRef.current = init;
    setBlitz(init);
    setBtnStates(IDLE_BTNS);
    setLocked(false);
    setTimeLeft((roundDurationMsRef.current ?? roundDurationMs) / 1000);
    setQuestion(durableManifest?.initialQuestion ?? buildBlitzQuestion(queueRef.current[0]!, pool));
    // зачем (сверка 04.10, «таймер 0:42 при появлении»): отсчёт идёт с ПЕРВОГО кадра с вопросом, не раньше.
    const roundStartedAt = Date.now();
    shownAtRef.current = roundStartedAt;
    endAtRef.current = roundStartedAt + (roundDurationMsRef.current ?? roundDurationMs);
    progress.value = 1;
    let firstFrame: ReturnType<typeof scheduleAfterPaint> | null = scheduleAfterPaint(() => {
      firstFrame = null;
      const paintedAt = Date.now();
      shownAtRef.current = paintedAt;
      endAtRef.current = paintedAt + (roundDurationMsRef.current ?? roundDurationMs);
      console.log('[FC-BLITZ-GATE] round:timer_start', JSON.stringify({ round: roundId, afterPaintMs: paintedAt - roundStartedAt }));
      // зачем (Сверка, practice-001…003: `uiautomator dump` не отдаёт дерево пока идёт раунд — «could not get idle state»; координатор 13.10): полоса таймера — непрерывная анимация на весь раунд.
      // dev `animations=off` (dev_animations_off.ts, в стор-сборке всегда false) держит экран на «до ответа»: полоса полная, секунды не тикают — робот снимает дерево, кадр = макет practice.html №1.
      if (isDevAnimationsOff()) {
        console.log('[DEV-STATE] blitz: таймер заморожен (animations=off) — полоса и тики секунд не запущены', JSON.stringify({ round: roundId, seconds: roundDurationMsRef.current ?? roundDurationMs })); // guard-ok: dev-ветка
        return;
      }
      progress.value = withTiming(0, {
        duration: roundDurationMsRef.current ?? roundDurationMs,
        easing: Easing.linear,
      });
      startRoundTicker();
    });

    /**
     * зачем (владелец, 2026-08-16, «прыжки/дёрганье»): тик остаётся частым —
     * он ловит конец раунда без задержки. Но setState теперь только когда
     * СЕКУНДА реально сменилась: раньше 5 обновлений в секунду перерисовывали
     * весь экран (вопрос, 4 кнопки, шапка) ради текста, который меняется раз
     * в секунду, и на слабом Android это читалось как дрожание.
     * Полоса таймера не затронута — она и так едет на UI-потоке (progress).
     */
    function startRoundTicker(): void {
      intervalRef.current = setInterval(() => {
        const rem = endAtRef.current - Date.now();
        const sec = Math.max(0, Math.ceil(rem / 1000));
        setTimeLeft((cur) => (cur === sec ? cur : sec));
        if (rem <= 0) finish();
      }, 200);
    }

    const pending = blitzPendingGrantRef.current;
    // зачем (Блиц «28 из 30», 04.10): неочищенная запись наследуется следующим раундом — исход очистки пишется
    // на КАЖДОЙ ветке, включая «блок не выполнен» и исключение (раньше void-блок без catch терял ошибку молча).
    if (!pending) {
      logFlashcardTrainingRoundClear('blitz', null, null, 'no_pending_record');
    } else {
      void (async () => {
        const playable = await markFlashcardTrainingPendingGrantPlayable(
          pending.account,
          pending.record.fingerprint,
        );
        const cleared = await acknowledgeAndClearFlashcardTrainingPendingGrant(
          pending.account,
          pending.record.fingerprint,
          pending.record.energyState === 'charged' ? acknowledgeSessionStart : async () => true,
          { energyCharged: pending.record.energyState === 'charged' },
        );
        logFlashcardTrainingRoundClear('blitz', playable, cleared);
        if (cleared.status === 'cleared') {
          blitzPendingGrantRef.current = null;
          blitzSpentOperationRef.current = null;
        }
      })().catch((error: unknown) => {
        logFlashcardTrainingRoundClear('blitz', null, null, `threw:${error instanceof Error ? error.message : String(error)}`);
      });
    }

    return () => {
      if (firstFrame != null) cancelAfterPaint(firstFrame);
      clearRoundTimers();
      cancelAnimation(progress);
    };
    // Рестарт — только по roundId / новой загрузке пула / решению по энергии / снятию экрана ошибки
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acknowledgeSessionStart, blitzAccessGranted, loading, pool, roundId, energyGate, quotaUnavailable]);

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
      if (pickLockRef.current) {
        console.log(`[OPT-UI] blitz_pick ignored reason=double_tap card=${question.card.id} opt=${optIdx}`); // guard-ok: ранний выход пишет причину
        return;
      }
      pickLockRef.current = true;
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
        setLastAward(awarded > 0 ? awarded : 0);
        if (awarded > 0) runeFlight.fly(awarded);
      } else {
        setLastAward(0);
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

      // зачем (владелец 04.10): очков и комбо нет — верный ответ звучит всегда одинаково; монеты начисляются выше.
      const { state } = applyBlitzAnswer(blitzRef.current, isOk);
      blitzRef.current = state;
      setBlitz(state);

      if (isOk) {
        playSfx('correct');
        fcHaptic('correct');
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
      }

      if (isAttemptsStopEffect(attemptEffect)) {
        pauseBlitzCountdown();
        return;
      }
      timersRef.current.push(
        setTimeout(nextQuestion, isOk ? BLITZ_ADVANCE_OK_MS : BLITZ_ADVANCE_WRONG_MS),
      );
    },
    [
      attempts,
      locked,
      nextQuestion,
      pauseBlitzCountdown,
      pool,
      practiceRunes,
      question,
      roundId,
      runeFlight,
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
    hydrationTrusted: attempts.hydrationTrusted,
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
    // зачем (аудит Карточек 🟡 «второй раунд без startNewCompletion», 15.10): как в «Вспомнить» — второй раунд идёт на свежей записи начисления и цене повтора, а не на квитанции первого.
    practiceRunes.startNewCompletion();
    setResult(null);
    setEnergyGate('checking');
    setRoundId((r) => r + 1);
  }, [practiceRunes]);

  // ── §6: выбор наборов ПРЯМО ИЗ БЛИЦА (FIX владельца, 2026-08-13) ──────────
  //
  // Раньше отметить наборы для блица можно было только из таббара раздела
  // (⚙ на пункте меню) — внутри режима путь к выбору отсутствовал. Теперь
  // кнопка в шапке открывает тот же DeckPickerSheet, что у тренировки и
  // слушания: мультивыбор, счётчик выбранного, сохранение в fc_mode_prefs_v1.
  /** Список наборов грузим только при открытии шита — вход в блиц не платит. */
  // зачем (находка DQA 04.10, правило «каждый раздел открывается мгновенно»): при входе в блиц ПО ССЫЛКЕ минуя хаб снимок наборов с диска не поднимался,
  // и шит 4–8 с показывал заглушку списка. Теперь снимок поднимается при монтировании (фоном), а при открытии шита список берётся из памяти/диска
  // на первом кадре; свежая загрузка идёт фоном и заменяет список только если он отличается. Заглушка — только при самом первом открытии без снимка.
  useEffect(() => {
    void hydrateFcDeckOptionsSnapshot();
  }, []);
  useEffect(() => {
    if (!deckPickerOpen) return;
    let cancelled = false;
    const openedAt = Date.now();
    void (async () => {
      let source: 'memory' | 'disk' | 'network' = 'network';
      let seeded = peekFcDeckOptions('blitz', lang, studyTarget);
      if (seeded) {
        source = 'memory';
      } else {
        await hydrateFcDeckOptionsSnapshot();
        seeded = peekFcDeckOptions('blitz', lang, studyTarget);
        if (seeded) source = 'disk';
      }
      if (seeded && seeded.length > 0 && !cancelled) {
        setDeckOptions((current) => (sameDeckOptions(current, seeded as DeckSheetOption[]) ? current : (seeded as DeckSheetOption[])));
        console.log(`[BLITZ-PICKER] first_list source=${source} decks=${seeded.length} msToFirstList=${Date.now() - openedAt}`);
      }
      const [decks, preset] = await Promise.all([
        loadFcDeckOptions('blitz', lang, studyTarget).catch(noteSwallowedAs('flashcards_blitz_session:useEffect.loadFcDeckOptions', [])),
        getLastPreset('blitz').catch(noteSwallowedAs('flashcards_blitz_session:useEffect.getLastPreset', null)),
      ]);
      if (cancelled) return;
      if (!seeded || seeded.length === 0) {
        console.log(`[BLITZ-PICKER] first_list source=network decks=${decks.length} msToFirstList=${Date.now() - openedAt} — снимка не было (первое открытие)`);
      } else {
        console.log(`[BLITZ-PICKER] refreshed decks=${decks.length} changed=${!sameDeckOptions(seeded as DeckSheetOption[], decks)} totalMs=${Date.now() - openedAt}`);
      }
      setDeckOptions((current) => (sameDeckOptions(current, decks) ? current : decks));
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
        id: 'Pilih paket kartu',
        tr: 'Setleri seç',
        pl: 'Wybierz zestawy',
      }),
    [lang],
  );

  const deckTitle = useMemo(() => {
    if (deckRefs.length === 0) return triLang(lang, {
      ru: 'Все карточки', uk: 'Усі картки', en: 'All cards', es: 'Todas las tarjetas',
      'pt-BR': 'Todos os cartões', vi: 'Tất cả thẻ', id: 'Semua kartu',
      tr: 'Tüm kartlar', pl: 'Wszystkie karty',
    });
    if (deckRefs.length > 1) {
      /** cards-2.1 (§6): форма слова по числу — «2 набора», а не «2 наборов». */
      return decksCountLabel(lang, deckRefs.length);
    }
    const deckRef = deckRefs[0]!;
    if (deckRef.kind === 'custom') return triLang(lang, {
      ru: 'Мои карточки', uk: 'Мої картки', en: 'My cards', es: 'Mis tarjetas', 'pt-BR': 'Meus cartões',
      vi: 'Thẻ của tôi', id: 'Kartu saya', tr: 'Kartlarım', pl: 'Moje karty',
    });
    if (deckRef.kind === 'pack') {
      // зачем (DQA, 04.10): в шапке — название выбранного набора («Family»), а не безличное «Набор карточек»;
      // название уже есть в локальном списке наборов (тёплый снимок), сеть не нужна.
      const known = deckOptions.find((option) => option.deckId === deckRefKey(deckRef))?.title;
      if (known) return known;
    }
    if (deckRef.kind === 'pack') return triLang(lang, {
      ru: 'Набор карточек', uk: 'Набір карток', en: 'Card pack', es: 'Pack de tarjetas', 'pt-BR': 'Pacote de cartões',
      vi: 'Bộ thẻ', id: 'Paket kartu', tr: 'Kart seti', pl: 'Zestaw kart',
    });
    return triLang(lang, {
      ru: 'Сохранённые', uk: 'Збережені', en: 'Saved', es: 'Guardadas', 'pt-BR': 'Salvos',
      vi: 'Đã lưu', id: 'Tersimpan', tr: 'Kaydedilenler', pl: 'Zapisane',
    });
  }, [deckOptions, deckRefs, lang]);

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
            {/* зачем (аудит #22, 15.10): «Тренировка не открылась» была без выхода — стрелка назад как на скелете загрузки */}
            <View style={styles.headerRow}>
              <PracticeBackButton
                glass={blitzGlass}
                color={t.textPrimary}
                onPress={leave}
                testID="fc-blitz-back"
                accessibilityLabel={triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' })}
              />
            </View>
            {/* зачем (cards.html setupError): данные тренировки не открылись — плитка, сообщение,
                одна кнопка «Попробовать снова»; повтор тот же (retryQuotaStart). */}
            <PracticeStatePanel
              glass={blitzGlass}
              icon="cloud-offline-outline"
              message={triLang(lang, {
                  ru: 'Тренировка не открылась. Попробуй ещё раз.',
                  uk: 'Тренування не відкрилося. Спробуй ще раз.',
                  en: "Practice didn't open. Try again.",
                  es: 'La práctica no se abrió. Inténtalo de nuevo.',
                  'pt-BR': 'O treino não abriu. Tente de novo.',
                  vi: 'Bài luyện chưa mở được. Hãy thử lại.',
                  id: 'Latihan belum terbuka. Coba lagi.',
                  tr: 'Alıştırma açılmadı. Tekrar dene.',
                  pl: 'Trening się nie otworzył. Spróbuj ponownie.',
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
              {/* зачем (бета-тест 15.10, А2): без onPress стрелка была неактивной — из зависшей загрузки на iOS не выйти */}
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
              <View style={[styles.questionBox, styles.glassSurface, { backgroundColor: blitzGlass.card, boxShadow: plateBoxShadow(blitzGlass) }]}>
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

  // зачем: заголовок нужен и итогу (надпись «Блиц · набор») — объявлен до раннего возврата итога.
  const blitzTitle = triLang(lang, { ru: 'Блиц', uk: 'Бліц', en: 'Blitz', es: 'Blitz', 'pt-BR': 'Blitz', vi: 'Blitz', id: 'Blitz', tr: 'Blitz', pl: 'Blitz' });

  if (result) {
    return (
      <SessionResultScreen
        correct={devRunesFake ? devRunesFake.tertiary + 4 : result.summary.correct}
        wrong={devRunesFake ? devRunesFake.tertiary : result.summary.wrong}
        runesGained={practiceRunes.runes}
        learnLeft={0}
        overline={`${blitzTitle} · ${deckTitle}`}
        durationSec={result.playedSec}
        mistakes={buildResultMistakes(pool, eventsRef.current.filter((e) => !e.correct).map((e) => e.key))}
        onRetryWrong={restart}
        feedback={{ entityId: `${feedbackAttemptId}:blitz:${roundId}:${deckParamStr || 'all'}`, entityLabel: blitzTitle }}
        retryLabel={triLang(lang, {
          // зачем (Сверка cards-section-054, макет «Ещё раз»): без восклицания.
          ru: 'Ещё раз', uk: 'Ще раз', en: 'One more!', es: '¡Otra vez!', 'pt-BR': 'Mais uma!',
          vi: 'Chơi lại!', id: 'Sekali lagi!', tr: 'Bir daha!', pl: 'Jeszcze raz!',
        })}
        // зачем (владелец 04.10: «ОЧКИ ИЗ БЛИЦА УБИРАЙ ВООБЩЕ, ТОЛЬКО МОНЕТЫ СЧИТАЕМ»): строки «Счёт · рекорд» в итоге нет.
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
                accessibilityLabel: pickDecksLabel,
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
            <View style={{ marginRight: 6 }}>
              {/* зачем (Карточки 2.0 12.10, cards-v2.html `sessHdr`): слева ✕ вместо «‹» */}
              <PracticeBackButton large icon="close" glass={blitzGlass} color={t.textPrimary} onPress={leave} testID="fc-blitz-back" accessibilityLabel={backLabel} />
            </View>
            {/* зачем (Карточки 2.0 12.10): в шапке Блица по макету одно название — подзаголовка с названием набора нет */}
            <PracticeHeaderTitle glass={blitzGlass} title={blitzTitle} />
            {/* зачем (решение 4, cards-section `sessHead` Блица): справа только сердца и монеты через 6 — пилюли энергии в макете нет. */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <SessionAttemptsHud
                remaining={attempts.state.remainingAttempts} attempts={attempts}
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
              {/* зачем (владелец, practice.html): флажка «сообщить об ошибке» в шапке Блица нет — убран по макету. */}
            </View>
          </View>

          {/* Таймер-полоса: растёт по прошедшему времени (scaleX 0 → 1), origin слева (practice.html). */}
          <View style={[styles.timerTrack, { backgroundColor: blitzGlass.opaqueControl }]}>
            <Reanimated.View
              style={[
                styles.timerFill,
                // зачем (решение 4, cards-glass.css `.trk i`): полоса — цвет акцента темы; в последние секунды — красная.
                { backgroundColor: danger ? BAD : blitzGlass.accentGraphic, transformOrigin: 'left' },
                timerBarStyle,
              ]}
            />
          </View>

          {/* Таймер по центру — источник полёта монет (владелец, 2026-08-27); очков и комбо нет (владелец 04.10). */}
          <View ref={runeFlight.originRef} collapsable={false} style={styles.scoreRow}>
            <PracticeTimerPill
              testID="fc-blitz-timer"
              glass={blitzGlass}
              color={danger ? BAD : t.textPrimary} // зачем (решение 4, cards-section `.pill.timer`): цифры основным цветом пилюли
              text={`${mm}:${ss}`}
            />
          </View>

          {/* Вопрос + 4 варианта. зачем (practice.html): карточка вопроса стоит сверху (38 от строки таймера), варианты
              через 23 и между собой 13 — не по центру экрана. */}
          <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 30, paddingBottom: 16, gap: 23 }} keyboardShouldPersistTaps="handled" decelerationRate="fast">
            <View style={[styles.questionBox, styles.glassSurface, { backgroundColor: blitzGlass.card, boxShadow: plateBoxShadow(blitzGlass) }]}>
              <BlitzGlassSurface radius={20} />
              {/* зачем (Карточки 2.0 12.10, `.qh .k`): подпись приколота к верху карточки (18 от края), вопрос — по центру */}
              <Text style={[styles.questionKicker, { color: blitzGlass.secondary, fontSize: f.body, lineHeight: Math.round(f.body * 1.35) }]}>
                {triLang(lang, {
                  ru: 'Выбери перевод', uk: 'Обери переклад', en: 'Choose the translation', es: 'Elige la traducción',
                  'pt-BR': 'Escolha a tradução', vi: 'Chọn bản dịch', id: 'Pilih terjemahan', tr: 'Çeviriyi seç', pl: 'Wybierz tłumaczenie',
                })}
              </Text>
              <Text
                testID="fc-blitz-question"

                style={[styles.questionText, { color: t.textPrimary, fontSize: 34, lineHeight: 40 }]}
              >
                {question?.card.en ?? ''}
              </Text>
              {/* `.plus10`: пилюля награды справа снизу карточки после верного ответа */}
              {lastAward > 0 && btnStates.some((st) => st === 'correct') && !btnStates.some((st) => st === 'wrong') ? (
                <View testID="fc-blitz-award" style={[styles.award, { backgroundColor: ANSWER_OK_SURFACE }]}>
                  <Text style={[styles.awardText, { color: ANSWER_OK_EDGE }]}>{`+${lastAward}`}</Text>
                </View>
              ) : null}
            </View>

            <View style={{ gap: 13 }}>
              {(question?.options ?? []).map((opt, i) => {
                const state = btnStates[i];
                // зачем (PM-129, `.opt` / `.opt.ok` / `.opt.no` макета): у варианта тонкая
                // полупрозрачная обводка; ответ — цветная обводка + подкраска 12 % ПОВЕРХ стекла
                // (основа карточки остаётся), текст основной, значок ✓/✕ — цветом состояния.
                const tint = state === 'correct' ? ANSWER_OK_SURFACE : state === 'wrong' ? ANSWER_BAD_SURFACE : null;
                // зачем (решение 4, kit `--outline` .30): контур варианта светлее кромки карточек; после ответа прочие гаснут.
                const edge = state === 'correct' ? ANSWER_OK_EDGE : state === 'wrong' ? ANSWER_BAD_EDGE : `${blitzGlass.text}4D`;
                const faded = state === 'idle' && btnStates.some((st) => st !== 'idle');
                // зачем (координатор 12.10, cards-section-044/045): слово в вопросе случайное, робот не знает верный вариант. dev `blitz_answer=correct|wrong` помечает нужный вариант testID
                // `fc-blitz-opt-target` (верный / первый неверный); без подмены и в сторе getDevBlitzAnswer() === null — обычные testID `fc-blitz-opt-<i>`.
                const devAnswer = getDevBlitzAnswer();
                const firstWrong = (question?.options ?? []).findIndex((_o, idx) => idx !== question?.correctIndex);
                const isDevTarget = devAnswer === 'correct' ? i === question?.correctIndex : devAnswer === 'wrong' ? i === firstWrong : false;
                return (
                  <TouchableOpacity
                    key={`${qIdxRef.current}_${i}`}
                    testID={isDevTarget ? 'fc-blitz-opt-target' : `fc-blitz-opt-${i}`}
                    // зачем (DQA / PM-134 A2, 04.10): диктор читает сам вариант ответа, а не служебную строку; testID для тестов остаётся.
                    accessibilityLabel={opt}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: locked }}
                    accessible
                    onPress={() => pick(i)}
                    disabled={locked}
                    activeOpacity={0.75}
                    // зачем (Тень 12.10): у варианта нет обводки-контейнера — плашка с тенью; кольцо `edge` остаётся ТОЛЬКО как исход ответа «верно/неверно»
                    // (state correct/wrong), у idle оно прозрачное (borderWidth 1 держим, чтобы раскладка не прыгала при ответе)
                    style={[styles.optionBtn, styles.glassSurface, { backgroundColor: blitzGlass.card, borderColor: state === 'idle' ? 'transparent' : edge, boxShadow: plateBoxShadow(blitzGlass) }, faded ? { opacity: ANSWER_FADE_OPACITY } : null]}
                  >
                    <BlitzGlassSurface radius={14} sheen={state === 'idle'} />
                    {tint ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 14, backgroundColor: tint }]} /> : null}
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
      <NoEnergyModal variant="learn" visible={energyGate === 'denied'} onClose={leave} activity="flashcards" />
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
  // зачем (practice.html `.hd`): поле страницы 20, шапка 16 от верха, промежутки 6.
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  // зачем (`.trk`): полоса 22 под шапкой, по полю 20, дорожка #2C2C2E.
  timerTrack: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: 20,
    marginTop: 22,
    overflow: 'hidden',
  },
  timerFill: { height: 6, borderRadius: 3, width: '100%' },
  // зачем (владелец 04.10): очков и комбо нет — в строке под полосой один таймер по центру; подписи «0 · 100» макета сняты.
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 14,
  },
  // зачем (`.qc`): 160 высотой, поля 22/28, тонкая кромка.
  // зачем (Карточки 2.0 12.10, cards-v2.html `.qh`): высота 188, r20, поля 20, подпись сверху (18), вопрос по центру
  questionBox: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    minHeight: 188,
    justifyContent: 'center',
  },
  questionKicker: { position: 'absolute', top: 18, left: 0, right: 0, textAlign: 'center' },
  // `.plus10`: 26 высотой, r13, поля 10, 14/700 → 13/700 по шкале 16/13
  award: { position: 'absolute', right: 16, bottom: 16, height: 26, borderRadius: 13, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  awardText: { fontSize: 13, lineHeight: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  // зачем (Тень 12.10): overflow убран — клип тени плашки; содержимое (KitGlassLayer, подкраска ответа) скруглено само
  glassSurface: {},
  questionText: { fontWeight: '700', textAlign: 'center', letterSpacing: -0.3 },
  optionBtn: {
    borderRadius: 14,
    borderWidth: 1, // shadow-ok: KEEP_STATE кольцо исхода ответа «верно/неверно» (idle — transparent, см. разметку варианта)
    minHeight: 58,
    paddingVertical: 12,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // зачем (`.opt`): 16.5/21 600; шкала D145 — кегль f.body (16 при «Среднем»), вес 600.
  optionText: { fontWeight: '600', textAlign: 'center' },
});
