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
// + счёт). XP блиц не даёт (безлимитный режим).
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
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEnergy } from '../components/EnergyContext';
import NoEnergyModal from '../components/NoEnergyModal';
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
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import SkeletonBlock from '../components/SkeletonShimmer';
import ReportErrorButton from '../components/ReportErrorButton';
import { triLang } from '../constants/i18n';
import { flashcardContentLang } from './spanish_content_gate';
import { useStudyTarget } from '../components/StudyTargetContext';
import SessionResultScreen from './flashcards/SessionResultScreen';
import { useFcReduceMotion } from './flashcards/PhraseCard';
import { isLowPowerEffective } from './flashcards/low_power';
import { comboSfxForStreak, fcHaptic, playSfx } from './flashcards/SoundService';
import {
  BLITZ_ADVANCE_OK_MS,
  BLITZ_ADVANCE_WRONG_MS,
  BLITZ_DURATION_SEC,
  BLITZ_LIVES,
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
import { safeRouterBack } from './navigation_back';
import { summarizeSession, type SessionAnswerEvent, type SessionOutcomeSummary } from './flashcards/session_queue';
import { captureCurrentAccountObjectiveAttempt } from './mistake_practice_capture';

/** Акцент блица (words #4A9EFF / phrases #40C080 / arena #E05050 / listening #9C6ADE). */
const ACCENT = '#FF8A3D';
const OK = '#40C080';
const BAD = '#E05050';
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

export default function FlashcardsBlitzSession() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const params = useLocalSearchParams<{ deck?: string }>();

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
  const [result, setResult] = useState<ResultState | null>(null);
  /** §6: выбор наборов прямо из блица — тот же шит, что у тренировки и слушания. */
  const [deckPickerOpen, setDeckPickerOpen] = useState(false);
  const [deckOptions, setDeckOptions] = useState<DeckSheetOption[]>([]);
  const [deckPreset, setDeckPreset] = useState<FcModePreset | null>(null);
  // Старт/рестарт блиц-раунда = 1 ⚡ за попытку (владелец 2026-08-23: единая
  // экономика). Гейт стоит ДО эффекта старта раунда ниже — раунд не запускается,
  // пока энергия не подтверждена.
  const { isUnlimited: blitzEnergyUnlimited, spendOne: spendBlitzEnergy } = useEnergy();
  const [energyGate, setEnergyGate] = useState<'checking' | 'ok' | 'denied'>('checking');

  const queueRef = useRef<DeckCard[]>([]);
  const qIdxRef = useRef(0);
  const eventsRef = useRef<SessionAnswerEvent[]>([]);
  const blitzRef = useRef<BlitzState>(blitz);
  const shownAtRef = useRef(Date.now());
  const endAtRef = useRef(0);
  const finishingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
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

  // Reanimated: таймер-полоса (scaleX, origin слева), бейдж комбо, очки, сердечки
  const progress = useSharedValue(1);
  const comboScale = useSharedValue(0);
  const scoreScale = useSharedValue(1);
  const gainAnim = useSharedValue(0);
  const heartsShake = useSharedValue(0);

  const timerBarStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));
  const comboStyle = useAnimatedStyle(() => ({ transform: [{ scale: comboScale.value }] }));
  const scoreStyle = useAnimatedStyle(() => ({ transform: [{ scale: scoreScale.value }] }));
  const gainStyle = useAnimatedStyle(() => ({
    opacity: 1 - gainAnim.value,
    transform: [{ translateY: -14 * gainAnim.value }],
  }));
  const heartsStyle = useAnimatedStyle(() => ({ transform: [{ translateX: heartsShake.value }] }));

  const clearRoundTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  // Личный рекорд: одно чтение на маунт, дальше — только запись при финале.
  useEffect(() => {
    let cancelled = false;
    void getBlitzBest().then((best) => {
      if (!cancelled) bestRef.current = best;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Загрузка пула: ?deck= или дефолт «все сохранённые + мои карточки» ──────
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // cards-2.1 (§6): один или несколько наборов — один объединённый пул.
      // FIX (владелец, 2026-08-13): дефолт (без ?deck=) раньше брал только
      // «сохранённые + мои карточки», из-за чего у человека с карточками ТОЛЬКО
      // в наборах пул был пуст и блиц не запускался. Теперь дефолт — ВСЕ
      // доступные источники, включая каждый добавленный набор.
      const allRefs = await loadAllFcDeckRefs().catch((): DeckRef[] => [
        { kind: 'saved' },
        { kind: 'custom' },
      ]);
      const refs: DeckRef[] = deckRefs.length > 0 ? deckRefs : allRefs;
      let cards = await loadDeckCardsMulti(refs, contentLang).catch((): DeckCard[] => []);
      // Сохранённый пресет мог указывать на набор, который удалили/не скачали —
      // не показываем тупик, а честно добираем пул из всех доступных источников.
      if (!canStartBlitz(cards.length) && deckRefs.length > 0) {
        const wide = await loadDeckCardsMulti(allRefs, contentLang).catch((): DeckCard[] => []);
        if (wide.length > cards.length) cards = wide;
      }
      if (cancelled) return;
      setPool(cards);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [deckRefs, contentLang]);


  // ── Финал: таймер 0 или жизни 0 → результат ───────────────────────────────
  const finish = useCallback(() => {
    if (finishingRef.current) return;
    finishingRef.current = true;
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
        bestRef.current = outcome.best;
        setResult((cur) =>
          cur && cur.score === outcome.score
            ? { ...cur, best: outcome.best, isRecord: outcome.isRecord }
            : cur,
        );
      })
      .catch(() => {});
  }, [clearRoundTimers, progress]);

  // Ровно одно списание на каждый roundId (первый заход и каждый рестарт «Ещё
  // разок»). Пока не решено — стартовый эффект ниже ждёт (см. energyGate).
  //
  // зачем ref-латч по roundId, а не только deps: аудит 2026-08-23 нашёл, что
  // blitzEnergyUnlimited в deps приводил к ПОВТОРНОМУ списанию в том же раунде.
  // Флаг меняется асинхронно (холодный старт: false → true у подписчика) и
  // может переключаться обратно — например в 22:00, когда истекает «вечер без
  // лимитов». Каждое такое переключение перезапускало эффект и снимало ещё
  // единицу. Латч помнит, за какой roundId уже заплачено.
  const blitzChargedRoundRef = useRef<number | null>(null);
  useEffect(() => {
    if (loading || !canStartBlitz(pool.length)) return;
    if (blitzChargedRoundRef.current === roundId) return;
    blitzChargedRoundRef.current = roundId;
    setEnergyGate('checking');
    if (blitzEnergyUnlimited) { setEnergyGate('ok'); return; }
    let cancelled = false;
    void spendBlitzEnergy().then((ok) => {
      if (cancelled) return;
      setEnergyGate(ok ? 'ok' : 'denied');
    });
    return () => { cancelled = true; };
  }, [loading, pool.length, roundId, blitzEnergyUnlimited, spendBlitzEnergy]);

  // ── Старт/рестарт раунда: перемешка, таймер-полоса, первый вопрос ─────────
  useEffect(() => {
    if (loading || !canStartBlitz(pool.length) || energyGate !== 'ok') return;
    finishingRef.current = false;
    eventsRef.current = [];
    queueRef.current = shuffleArr(pool);
    qIdxRef.current = 0;
    const init = initialBlitzState();
    blitzRef.current = init;
    setBlitz(init);
    setBtnStates(IDLE_BTNS);
    setLocked(false);
    setLastGain(0);
    setTimeLeft(BLITZ_DURATION_SEC);
    setQuestion(buildBlitzQuestion(queueRef.current[0]!, pool));
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

    return () => {
      clearRoundTimers();
      cancelAnimation(progress);
    };
    // Рестарт — только по roundId / новой загрузке пула / решению по энергии
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, pool, roundId, energyGate]);

  // ── Следующий вопрос (пул зациклен — 60с может пережить весь список) ─────
  const nextQuestion = useCallback(() => {
    if (finishingRef.current) return;
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

  // ── Ответ (реюз механики арены: подсветка + лок + автопереход) ────────────
  const pick = useCallback(
    (optIdx: number) => {
      if (locked || finishingRef.current || !question) return;
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

      const { state, gained, comboHit, outOfLives } = applyBlitzAnswer(blitzRef.current, isOk);
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
        if (studyTarget === 'en' || studyTarget === 'fr') {
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
          }).catch(() => {});
        }
        playSfx('incorrect');
        fcHaptic('wrong');
        comboScale.value = withTiming(0, { duration: 150 });
        // −жизнь: тряска ряда сердечек 3×80мс (паттерн сундуков §4)
        heartsShake.value = withSequence(
          withTiming(-5, { duration: 40 }),
          withTiming(5, { duration: 80 }),
          withTiming(-5, { duration: 80 }),
          withTiming(0, { duration: 60 }),
        );
      }

      if (outOfLives) {
        timersRef.current.push(setTimeout(finish, 600));
        return;
      }
      timersRef.current.push(
        setTimeout(nextQuestion, isOk ? BLITZ_ADVANCE_OK_MS : BLITZ_ADVANCE_WRONG_MS),
      );
    },
    [locked, question, finish, nextQuestion, comboScale, scoreScale, gainAnim, heartsShake, pool, roundId, studyTarget],
  );

  const leave = useCallback(() => {
    fcHaptic('tap');
    safeRouterBack(router, '/flashcards' as never);
  }, [router]);

  /** «Ещё разок!» — драйвер сессий/день (§3.9): мгновенный рестарт раунда. */
  const restart = useCallback(() => {
    setResult(null);
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
        loadFcDeckOptions('blitz', lang).catch(() => [] as DeckSheetOption[]),
        getLastPreset('blitz').catch(() => null),
      ]);
      if (cancelled) return;
      setDeckOptions(decks);
      setDeckPreset(preset);
    })();
    return () => {
      cancelled = true;
    };
  }, [deckPickerOpen, lang]);

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
   * Недостаточно карточек → предлагаем выбрать наборы, как в «Слушать»/
   * «Говорить» (владелец, 2026-08-17): «Блиц» больше не прячется из меню по
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
      ru: 'Все карточки', uk: 'Усі картки', es: 'Todas las tarjetas',
      'pt-BR': 'Todos os cartões', vi: 'Tất cả thẻ', id: 'Semua kartu',
      tr: 'Tüm kartlar', pl: 'Wszystkie fiszki',
    });
    if (deckRefs.length > 1) {
      /** cards-2.1 (§6): форма слова по числу — «2 набора», а не «2 наборов». */
      return decksCountLabel(lang, deckRefs.length);
    }
    const deckRef = deckRefs[0]!;
    if (deckRef.kind === 'custom') return triLang(lang, {
      ru: 'Мои карточки', uk: 'Мої картки', es: 'Mis tarjetas', 'pt-BR': 'Meus cartões',
      vi: 'Thẻ của tôi', id: 'Kartu saya', tr: 'Kartlarım', pl: 'Moje fiszki',
    });
    if (deckRef.kind === 'pack') return triLang(lang, {
      ru: 'Набор карточек', uk: 'Набір карток', es: 'Pack de tarjetas', 'pt-BR': 'Pacote de cartões',
      vi: 'Bộ thẻ', id: 'Set kartu', tr: 'Kart seti', pl: 'Zestaw fiszek',
    });
    return triLang(lang, {
      ru: 'Сохранённые', uk: 'Збережені', es: 'Guardadas', 'pt-BR': 'Salvos',
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
  if (loading) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            <View style={styles.headerRow}>
              <View style={{ padding: 4 }}>
                <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
              </View>
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Text style={[styles.headerTitle, { color: t.textPrimary, fontSize: f.body }]}>
                  {triLang(lang, {
                    ru: 'Блиц', uk: 'Бліц', es: 'Blitz', 'pt-BR': 'Blitz',
                    vi: 'Blitz', id: 'Blitz', tr: 'Blitz', pl: 'Blitz',
                  })}
                </Text>
                <SkeletonBlock width={120} height={f.caption} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.livesRow}>
                  {Array.from({ length: BLITZ_LIVES }, (_, i) => (
                    <Ionicons key={i} name="heart" size={18} color={BAD} />
                  ))}
                </View>
                <View style={{ padding: 4 }}>
                  <Ionicons name="albums-outline" size={20} color={t.textMuted} />
                </View>
              </View>
            </View>

            <View style={[styles.timerTrack, { backgroundColor: `${ACCENT}22` }]} />

            <View style={styles.scoreRow}>
              <View style={{ minWidth: 90 }}>
                <SkeletonBlock width={44} height={f.h2} />
              </View>
              <SkeletonBlock width={62} height={f.h2} />
              <View style={{ minWidth: 90 }} />
            </View>

            <View style={{ flex: 1, paddingHorizontal: 16, gap: 14, justifyContent: 'center' }}>
              <View style={[styles.questionBox, { backgroundColor: t.bgCard }]}>
                <SkeletonBlock width="70%" height={(f.h1 ?? 24) + 2} />
              </View>
              <View style={{ gap: 10 }}>
                {Array.from({ length: 4 }, (_, i) => (
                  <SkeletonBlock key={i} width="100%" height={50} borderRadius={14} />
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
        correct={result.summary.correct}
        wrong={result.summary.wrong}
        xpGained={0}
        learnLeft={0}
        onRetryWrong={restart}
        retryLabel={triLang(lang, {
          ru: 'Ещё разок!', uk: 'Ще разок!', es: '¡Otra vez!', 'pt-BR': 'Mais uma!',
          vi: 'Chơi lại!', id: 'Sekali lagi!', tr: 'Bir daha!', pl: 'Jeszcze raz!',
        })}
        scoreText={
          /**
           * Смысл счёта — личный рекорд (FIX владельца, 2026-08-13):
           * побил прошлый лучший → «Новый рекорд! N», иначе → «Счёт: N ·
           * рекорд: M». Ни наград, ни валюты, ни звёзд.
           */
          result.isRecord
            ? triLang(lang, {
                ru: `Новый рекорд! ${result.score}`,
                uk: `Новий рекорд! ${result.score}`,
                es: `¡Nuevo récord! ${result.score}`,
                'pt-BR': `Novo recorde! ${result.score}`,
                vi: `Kỷ lục mới! ${result.score}`,
                id: `Rekor baru! ${result.score}`,
                tr: `Yeni rekor! ${result.score}`,
                pl: `Nowy rekord! ${result.score}`,
              })
            : triLang(lang, {
                ru: `Счёт: ${result.score} · рекорд: ${result.best}`,
                uk: `Рахунок: ${result.score} · рекорд: ${result.best}`,
                es: `Puntos: ${result.score} · récord: ${result.best}`,
                'pt-BR': `Pontos: ${result.score} · recorde: ${result.best}`,
                vi: `Điểm: ${result.score} · kỷ lục: ${result.best}`,
                id: `Skor: ${result.score} · rekor: ${result.best}`,
                tr: `Puan: ${result.score} · rekor: ${result.best}`,
                pl: `Wynik: ${result.score} · rekord: ${result.best}`,
              })
        }
        onDone={leave}
        accentColor={ACCENT}
        testID="fc-blitz-result"
      />
    );
  }

  /**
   * Карточек не хватает — предлагаем выбрать наборы (владелец, 2026-08-17),
   * как в «Слушать»/«Говорить»: пункт «Блиц» больше не прячется из меню по
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
              <TouchableOpacity onPress={leave} style={{ padding: 4 }} testID="fc-blitz-back">
                <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: t.textPrimary, fontSize: f.body }]}>
                {triLang(lang, {
                  ru: 'Блиц',
                  uk: 'Бліц',
                  es: 'Blitz',
                  'pt-BR': 'Blitz',
                  vi: 'Blitz',
                  id: 'Blitz',
                  tr: 'Blitz',
                  pl: 'Blitz',
                })}
              </Text>
              <View style={{ width: 32 }} />
            </View>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 32 }}>
              <Ionicons name="flash-outline" size={44} color={t.textGhost} />
              <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center' }}>
                {triLang(lang, {
                  ru: 'Здесь пока нечего играть — выберите наборы',
                  uk: 'Тут поки нема у що грати — оберіть набори',
                  es: 'Aún no hay nada que jugar: elige los packs',
                  'pt-BR': 'Ainda não há o que jogar: escolha os pacotes',
                  vi: 'Chưa có gì để chơi — hãy chọn bộ thẻ',
                  id: 'Belum ada yang bisa dimainkan — pilih set kartu',
                  tr: 'Oynanacak bir şey yok — setleri seçin',
                  pl: 'Nie ma jeszcze w co grać — wybierz zestawy',
                })}
              </Text>
              <TouchableOpacity
                testID="fc-blitz-pick-decks-empty"
                accessibilityRole="button"
                accessibilityLabel="qa-fc-blitz-pick-decks"
                accessible
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={openDeckPicker}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  paddingHorizontal: 18, paddingVertical: 12, borderRadius: 16, backgroundColor: t.bgSurface,
                }}
              >
                <Ionicons name="albums-outline" size={18} color={ACCENT} />
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>{pickDecksLabel}</Text>
              </TouchableOpacity>
            </View>
          </ContentWrap>
        </SafeAreaView>
        {deckPickerSheet}
      </ScreenGradient>
    );
  }

  const danger = timeLeft <= DANGER_SEC;
  const mm = Math.floor(timeLeft / 60);
  const ss = String(timeLeft % 60).padStart(2, '0');

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          {/* Header: назад · «Блиц · набор» · жизни-сердечки */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={leave} style={{ padding: 4 }} testID="fc-blitz-back">
              <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.headerTitle, { color: t.textPrimary, fontSize: f.body }]}>
                {triLang(lang, {
                  ru: 'Блиц', uk: 'Бліц', es: 'Blitz', 'pt-BR': 'Blitz',
                  vi: 'Blitz', id: 'Blitz', tr: 'Blitz', pl: 'Blitz',
                })}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.caption }} numberOfLines={1}>
                {deckTitle}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Reanimated.View style={[styles.livesRow, heartsStyle]} testID="fc-blitz-lives">
                {Array.from({ length: BLITZ_LIVES }, (_, i) => (
                  <Ionicons
                    key={i}
                    name={i < blitz.lives ? 'heart' : 'heart-outline'}
                    size={18}
                    color={i < blitz.lives ? BAD : t.textGhost}
                  />
                ))}
              </Reanimated.View>
              {/* §6: выбор и отметка наборов — мультивыбор, как в тренировке и слушании */}
              <TouchableOpacity
                testID="fc-blitz-pick-decks"
                accessibilityLabel="qa-fc-blitz-pick-decks"
                accessible
                accessibilityRole="button"
                accessibilityHint={pickDecksLabel}
                onPress={openDeckPicker}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ padding: 4 }}
              >
                <Ionicons name="albums-outline" size={20} color={t.textMuted} />
              </TouchableOpacity>
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
                  accessibilityLabel={triLang(lang, { ru: 'Сообщить об ошибке в карточке', uk: 'Повідомити про помилку в картці', es: 'Informar de un error en la tarjeta', 'pt-BR': 'Relatar erro no cartão', vi: 'Báo lỗi trong thẻ', id: 'Laporkan kesalahan pada kartu', tr: 'Karttaki hatayı bildir', pl: 'Zgłoś błąd w fiszce' })}
                  testID="fc-blitz-report"
                />
              ) : null}
            </View>
          </View>

          {/* Таймер-полоса: Reanimated scaleX от 1 к 0, origin слева (принцип 3) */}
          <View style={[styles.timerTrack, { backgroundColor: `${ACCENT}22` }]}>
            <Reanimated.View
              style={[
                styles.timerFill,
                { backgroundColor: danger ? BAD : ACCENT, transformOrigin: 'left' },
                timerBarStyle,
              ]}
            />
          </View>

          {/* Счёт · время · комбо */}
          <View style={styles.scoreRow}>
            <View style={{ minWidth: 90 }}>
              <Reanimated.View style={scoreStyle}>
                <Text
                  testID="fc-blitz-score"
                  style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900', fontVariant: ['tabular-nums'] }}
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
            <Text
              testID="fc-blitz-timer"
              style={{
                color: danger ? BAD : t.textPrimary,
                fontSize: f.h2,
                fontWeight: '900',
                fontVariant: ['tabular-nums'],
              }}
            >
              {mm}:{ss}
            </Text>
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
          <View style={{ flex: 1, paddingHorizontal: 16, gap: 14, justifyContent: 'center' }}>
            <View style={[styles.questionBox, { backgroundColor: t.bgCard }]}>
              <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '700', marginBottom: 6 }}>
                {triLang(lang, { ru: 'Выбери перевод', uk: 'Обери переклад', es: 'Elige la traducción' })}
              </Text>
              <Text
                testID="fc-blitz-question"
                numberOfLines={3}
                style={[styles.questionText, { color: t.textPrimary, fontSize: (f.h1 ?? 24) + 2 }]}
              >
                {question?.card.en ?? ''}
              </Text>
            </View>

            <View style={{ gap: 10 }}>
              {(question?.options ?? []).map((opt, i) => {
                const state = btnStates[i];
                // зачем: без рамки состояние держится ТОЛЬКО заливкой, поэтому
                // ответ подсвечиваем плотнее (33 вместо 22) — читается так же ясно.
                let bg = t.bgCard;
                let tc = t.textPrimary;
                if (state === 'correct') { bg = `${OK}33`; tc = OK; }
                if (state === 'wrong') { bg = `${BAD}33`; tc = BAD; }
                return (
                  <TouchableOpacity
                    key={`${qIdxRef.current}_${i}`}
                    testID={`fc-blitz-opt-${i}`}
                    accessibilityLabel={`qa-fc-blitz-opt-${i}`}
                    accessible
                    onPress={() => pick(i)}
                    disabled={locked}
                    activeOpacity={0.75}
                    style={[styles.optionBtn, { backgroundColor: bg }]}
                  >
                    <Text numberOfLines={2} style={[styles.optionText, { color: tc, fontSize: f.body }]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ContentWrap>
        {deckPickerSheet}
      </SafeAreaView>
      <NoEnergyModal visible={energyGate === 'denied'} onClose={leave} />
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
  livesRow: { flexDirection: 'row', alignItems: 'center', gap: 3, minWidth: 66, justifyContent: 'flex-end' },
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
   * зачем (правило владельца «НИКОГДА контейнеры с обводкой»): блок вопроса,
   * кнопки ответов и бейдж комбо раньше были обведены рамкой. Состояние
   * «верно/неверно» и так читается заливкой (`${OK}22` / `${BAD}22`) и цветом
   * текста — рамка ничего не добавляла. Разделяем тоном, как в коллекции.
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
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    minHeight: 110,
    justifyContent: 'center',
  },
  questionText: { fontWeight: '800', textAlign: 'center' },
  optionBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  optionText: { fontWeight: '700', textAlign: 'center' },
});
