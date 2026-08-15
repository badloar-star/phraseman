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

// Fisher-Yates (паттерн trainer_words_session)
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

  // Недостаточно карточек → уходим назад БЕЗ текста ошибки (владелец,
  // 2026-08-13). В норме сюда не попасть: пункт «Блиц» скрыт предикатом
  // `canStartBlitz`; это страховка от deep link и устаревшего пресета.
  const bouncedRef = useRef(false);
  useEffect(() => {
    if (loading || canStartBlitz(pool.length) || bouncedRef.current) return;
    bouncedRef.current = true;
    safeRouterBack(router, '/flashcards' as never);
  }, [loading, pool.length, router]);

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

  // ── Старт/рестарт раунда: перемешка, таймер-полоса, первый вопрос ─────────
  useEffect(() => {
    if (loading || !canStartBlitz(pool.length)) return;
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

    intervalRef.current = setInterval(() => {
      const rem = endAtRef.current - Date.now();
      setTimeLeft(Math.max(0, Math.ceil(rem / 1000)));
      if (rem <= 0) finish();
    }, 200);

    return () => {
      clearRoundTimers();
      cancelAnimation(progress);
    };
    // Рестарт — только по roundId / новой загрузке пула
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, pool, roundId]);

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
    [locked, question, finish, nextQuestion, comboScale, scoreScale, gainAnim, heartsShake],
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
   * Старт с выбранными наборами: тот же экран с новым `?deck=` (replace, чтобы
   * «назад» не возвращал в раунд со старым набором). Пресет уже сохранён шитом
   * (`setLastPreset('blitz', …)`), поэтому следующий запуск придёт с ним сам.
   */
  const startWithPreset = useCallback(
    (preset: FcModePreset) => {
      setDeckPickerOpen(false);
      // «Слабые» — due-очередь тренажёра «Моя практика», к наборам не относится.
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
  if (loading) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: t.textMuted }}>…</Text>
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

  // Карточек не хватает — экрана с текстом ошибки больше нет (владелец,
  // 2026-08-13): правило переехало в предикат `canStartBlitz`, и пункт «Блиц»
  // просто не показывается. Если сюда всё же попали (deep link / устаревший
  // пресет) — молча возвращаемся назад, без ругательной надписи.
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
            <View style={{ flex: 1 }} />
          </ContentWrap>
        </SafeAreaView>
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
                  style={[styles.comboBadge, { backgroundColor: `${ACCENT}1F`, borderColor: ACCENT }, comboStyle]}
                >
                  <Ionicons name="flame" size={15} color={ACCENT} />
                  <Text style={{ color: ACCENT, fontSize: f.sub, fontWeight: '900' }}>×{blitz.streak}</Text>
                </Reanimated.View>
              ) : null}
            </View>
          </View>

          {/* Вопрос + 4 варианта */}
          <View style={{ flex: 1, paddingHorizontal: 16, gap: 14, justifyContent: 'center' }}>
            <View style={[styles.questionBox, { backgroundColor: t.bgCard, borderColor: t.border }]}>
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
                let bg = t.bgCard;
                let bc = t.border;
                let tc = t.textPrimary;
                if (state === 'correct') { bg = `${OK}22`; bc = OK; tc = OK; }
                if (state === 'wrong') { bg = `${BAD}22`; bc = BAD; tc = BAD; }
                return (
                  <TouchableOpacity
                    key={`${qIdxRef.current}_${i}`}
                    testID={`fc-blitz-opt-${i}`}
                    accessibilityLabel={`qa-fc-blitz-opt-${i}`}
                    accessible
                    onPress={() => pick(i)}
                    disabled={locked}
                    activeOpacity={0.75}
                    style={[styles.optionBtn, { backgroundColor: bg, borderColor: bc }]}
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
  comboBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  questionBox: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    minHeight: 110,
    justifyContent: 'center',
  },
  questionText: { fontWeight: '800', textAlign: 'center' },
  optionBtn: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  optionText: { fontWeight: '700', textAlign: 'center' },
});
