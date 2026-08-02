import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { FlowText } from '../components/text-integrity/FlowText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Circle } from 'react-native-svg';

import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import TapScale from '../components/TapScale';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { useTimerTickCue } from '../hooks/use-timer-tick-cue';
import { triLang, type Lang } from '../constants/i18n';
import { hapticTap, hapticSuccess } from '../hooks/use-haptics';
import { safeRouterBack } from './navigation_back';
import { loadFlashcards } from '../hooks/use-flashcards';
import { readCustomCards } from './flashcards/storage';
import { storageStudyTarget } from './target_storage_keys';
import type { CardItem } from './flashcards/types';
import { saveArenaRun } from './flashcards/arenaProgress';
import {
  ARENA_OPTION_COUNT,
  ARENA_QUESTION_COUNT,
  ARENA_SECONDS_PER_QUESTION,
  buildArenaQuestions,
  summarizeArena,
  type ArenaAnswer,
  type ArenaQuestion,
} from './flashcards/arenaQuiz';

/**
 * Режим «Арена» — быстрый тест на узнавание (макет flashcards-screens.html
 * C4 «Арена · 4 варианта» и D «Итоги арены»).
 *
 * зачем: в разделе было два режима, и оба — самооценка. В свайпе можно честно
 * жать «знаю» и не выучить ничего; в аудио проверки нет вовсе. Арена даёт
 * объективный результат: 4 варианта, таймер, счёт и список слов, которые
 * не даются.
 *
 * FIREBASE: карточки берём из локального хранилища (те же loadFlashcards /
 * readCustomCards, что уже греет коллекция) — ноль запросов к Firestore и
 * ноль вызовов функций. Результат забега никуда не отправляем.
 *
 * Вся механика — в ./flashcards/arenaQuiz (чистые функции под тестами);
 * экран только рисует и ведёт таймер.
 */

type Phase = 'loading' | 'empty' | 'playing' | 'done';

/** Радиус кольца-таймера и его длина окружности (макет: r=22, dash 138.2). */
const RING_R = 22;
const RING_LEN = 2 * Math.PI * RING_R;

export default function FlashcardsArenaScreen() {
  const router = useRouter();
  const { theme: t, statusBarLight, f } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const insets = useStableSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const runtimeActive = useRuntimeActive();
  const { playTimerTick, playTimerExpired } = useTimerTickCue();

  const [phase, setPhase] = useState<Phase>('loading');
  const [questions, setQuestions] = useState<ArenaQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<ArenaAnswer[]>([]);
  /** Выбранный вариант: null — ещё думает. */
  const [picked, setPicked] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(ARENA_SECONDS_PER_QUESTION);

  const ringAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const answerLockRef = useRef(false);
  const questionTokenRef = useRef('');
  const questionRemainingMsRef = useRef(ARENA_SECONDS_PER_QUESTION * 1000);
  const questionDeadlineRef = useRef(0);
  const advanceRemainingMsRef = useRef(0);
  const advanceDeadlineRef = useRef(0);

  const s = useMemo(
    () => ({
      title: triLang(lang as Lang, {
        ru: 'Арена', uk: 'Арена', es: 'Arena', 'pt-BR': 'Arena',
        vi: 'Đấu trường', id: 'Arena', tr: 'Arena', pl: 'Arena',
      }),
      empty: triLang(lang as Lang, {
        ru: 'Нужно хотя бы 4 карточки, чтобы собрать честный тест',
        uk: 'Потрібно щонайменше 4 картки, щоб скласти чесний тест',
        es: 'Se necesitan al menos 4 tarjetas para un test justo',
        'pt-BR': 'São necessários pelo menos 4 cartões para um teste justo',
        vi: 'Cần ít nhất 4 thẻ để tạo bài kiểm tra công bằng',
        id: 'Perlu minimal 4 kartu untuk tes yang adil',
        tr: 'Adil bir test için en az 4 kart gerekir',
        pl: 'Potrzeba co najmniej 4 fiszek na uczciwy test',
      }),
      addCards: triLang(lang as Lang, {
        ru: 'К карточкам', uk: 'До карток', es: 'A las tarjetas', 'pt-BR': 'Aos cartões',
        vi: 'Tới thẻ', id: 'Ke kartu', tr: 'Kartlara', pl: 'Do fiszek',
      }),
      question: triLang(lang as Lang, {
        ru: 'по-английски — это…', uk: 'англійською — це…', es: 'en inglés es…',
        'pt-BR': 'em inglês é…', vi: 'tiếng Anh là…', id: 'dalam bahasa Inggris…',
        tr: "İngilizce'de…", pl: 'po angielsku to…',
      }),
      again: triLang(lang as Lang, {
        ru: 'Ещё раз', uk: 'Ще раз', es: 'Otra vez', 'pt-BR': 'De novo',
        vi: 'Lần nữa', id: 'Sekali lagi', tr: 'Tekrar', pl: 'Jeszcze raz',
      }),
      weakTitle: triLang(lang as Lang, {
        ru: 'Стоит повторить', uk: 'Варто повторити', es: 'Conviene repasar',
        'pt-BR': 'Vale revisar', vi: 'Nên ôn lại', id: 'Perlu diulang',
        tr: 'Tekrar etmeli', pl: 'Warto powtórzyć',
      }),
      combo: triLang(lang as Lang, {
        ru: 'комбо', uk: 'комбо', es: 'combo', 'pt-BR': 'combo',
        vi: 'combo', id: 'kombo', tr: 'kombo', pl: 'kombo',
      }),
      perfect: triLang(lang as Lang, {
        ru: 'Без единой ошибки!', uk: 'Без жодної помилки!', es: '¡Sin errores!',
        'pt-BR': 'Sem erros!', vi: 'Không sai câu nào!', id: 'Tanpa kesalahan!',
        tr: 'Hatasız!', pl: 'Bez błędu!',
      }),
    }),
    [lang],
  );

  /** Родная сторона карточки под язык интерфейса. */
  const promptFor = useCallback(
    (c: CardItem) => (lang === 'uk' ? c.uk || c.ru : lang === 'es' ? c.es || c.ru : c.ru) ?? '',
    [lang],
  );
  const answerFor = useCallback((c: CardItem) => c.en ?? '', []);

  // ── Загрузка колоды ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const target = storageStudyTarget(studyTarget);
    void Promise.all([
      loadFlashcards(target).catch(() => []),
      readCustomCards(target).catch(() => [] as unknown[]),
    ]).then(([saved, rawCustom]) => {
      if (cancelled) return;
      const savedCards: CardItem[] = (saved as any[]).map((fc) => ({
        id: String(fc.id ?? fc.en),
        en: String(fc.en ?? ''),
        ru: String(fc.ru ?? ''),
        uk: String(fc.uk ?? fc.ru ?? ''),
        es: fc.es ? String(fc.es) : undefined,
        categoryId: 'saved',
        isSystem: false,
      })) as CardItem[];
      const customCards = Array.isArray(rawCustom) ? (rawCustom as CardItem[]) : [];
      // зачем: seed от времени старта — забег каждый раз новый, но при том же
      // seed воспроизводится точно (важно для отладки жалоб «дал неверный ответ»).
      const built = buildArenaQuestions(
        [...savedCards, ...customCards],
        answerFor,
        promptFor,
        Date.now(),
        ARENA_QUESTION_COUNT,
      );
      setQuestions(built);
      setPhase(built.length > 0 ? 'playing' : 'empty');
    });
    return () => { cancelled = true; };
  }, [studyTarget, answerFor, promptFor]);

  const current = questions[index];

  const clearTimers = useCallback(() => {
    if (advanceTimer.current) { clearTimeout(advanceTimer.current); advanceTimer.current = null; }
    if (tickTimer.current) { clearInterval(tickTimer.current); tickTimer.current = null; }
  }, []);

  const goNext = useCallback(() => {
    clearTimers();
    answerLockRef.current = false;
    advanceRemainingMsRef.current = 0;
    setPicked(null);
    const next = index + 1;
    if (next >= questions.length) {
      setPhase('done');
      return;
    }
    setIndex(next);
  }, [clearTimers, index, questions.length]);

  /** Ответ (или истёкшее время при pickedIndex = -1). */
  const answer = useCallback(
    (pickedIndex: number) => {
      if (!runtimeActive || !current || answerLockRef.current) return;
      answerLockRef.current = true;
      clearTimers();
      setPicked(pickedIndex);
      const correct = pickedIndex === current.correctIndex;
      setAnswers((prev) => [...prev, { cardId: current.cardId, correct }]);

      if (correct) {
        void hapticSuccess();
      } else {
        void hapticTap();
        // A-42: неверный вариант дрожит (без укачивания при reduce-motion).
        if (!reduceMotion) {
          shakeAnim.setValue(0);
          Animated.timing(shakeAnim, {
            toValue: 1, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true,
          }).start();
        }
      }
      // A-42: пауза перед следующим вопросом — 1500мс на неверном, короче на верном.
      advanceRemainingMsRef.current = correct ? 700 : 1500;
    },
    [clearTimers, current, goNext, reduceMotion, runtimeActive, shakeAnim],
  );

  useEffect(() => {
    if (phase !== 'playing' || picked === null || !runtimeActive || advanceRemainingMsRef.current <= 0) return;
    advanceDeadlineRef.current = Date.now() + advanceRemainingMsRef.current;
    advanceTimer.current = setTimeout(() => {
      advanceRemainingMsRef.current = 0;
      goNext();
    }, advanceRemainingMsRef.current);
    return () => {
      advanceRemainingMsRef.current = Math.max(0, advanceDeadlineRef.current - Date.now());
      if (advanceTimer.current) { clearTimeout(advanceTimer.current); advanceTimer.current = null; }
    };
  }, [goNext, phase, picked, runtimeActive]);

  // ── Таймер вопроса ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing' || !current || picked !== null) return;
    const token = `${current.cardId}:${index}`;
    if (questionTokenRef.current !== token) {
      questionTokenRef.current = token;
      questionRemainingMsRef.current = ARENA_SECONDS_PER_QUESTION * 1000;
      answerLockRef.current = false;
    }
    const durationMs = questionRemainingMsRef.current;
    setSecondsLeft(Math.max(0, Math.ceil(durationMs / 1000)));
    ringAnim.setValue(durationMs / (ARENA_SECONDS_PER_QUESTION * 1000));
    if (!runtimeActive) return;
    questionDeadlineRef.current = Date.now() + durationMs;
    // A-43: дуга уходит по кругу; при reduce-motion не анимируем, только цифры.
    if (!reduceMotion) {
      // guard-ok (perf): useNativeDriver:false здесь обязателен — анимируем
      // strokeDashoffset SVG-круга, а не transform/opacity. Нативный драйвер
      // такое свойство не поддерживает. Это ОДНА дуга на экране, раз в 8 секунд —
      // нагрузки на JS-поток практически нет; альтернатива (rotate целого
      // элемента) не даёт «убывающую» дугу из макета.
      Animated.timing(ringAnim, {
        toValue: 0,
        duration: durationMs,
        easing: Easing.linear,
        useNativeDriver: false, // guard-ok: strokeDashoffset нативный драйвер не умеет
      }).start();
    }
    const tick = () => {
      const remainingMs = Math.max(0, questionDeadlineRef.current - Date.now());
      questionRemainingMsRef.current = remainingMs;
      const nextSeconds = Math.ceil(remainingMs / 1000);
      setSecondsLeft(nextSeconds);
      if (remainingMs <= 0) {
          // Время вышло — засчитываем как неверный, чтобы слово попало в слабые.
        // зачем: звук ставим ДО answer(-1) — тот уводит на следующий вопрос,
        // и «время вышло» иначе слилось бы с вердиктом нового задания.
        playTimerExpired();
        answer(-1);
        return;
      }
      // зачем: порог тот же, что у кольца (<= 3 c красит в t.wrong) — звук
      // не должен предупреждать раньше или позже, чем это делает картинка.
      if (nextSeconds <= 3) playTimerTick();
    };
    tickTimer.current = setInterval(tick, 1000);
    return () => {
      questionRemainingMsRef.current = Math.max(0, questionDeadlineRef.current - Date.now());
      if (tickTimer.current) { clearInterval(tickTimer.current); tickTimer.current = null; }
      ringAnim.stopAnimation();
    };
  }, [phase, index, current, picked, reduceMotion, ringAnim, answer, runtimeActive, playTimerTick, playTimerExpired]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const summary = useMemo(() => summarizeArena(answers), [answers]);

  /**
   * зачем (решение владельца): забег теперь ВЛИЯЕТ на прогресс — ошибки делают
   * карточку «слабой», серия верных приближает к «освоено». Три режима копят
   * один прогресс, и точки статусов в коллекции реагируют на арену.
   *
   * Пишем один раз на забег, при переходе в итоги: 10 отдельных записей на
   * каждый ответ били бы по диску. Гард savedRunRef — от повторной записи,
   * если экран пере-отрендерится в фазе done (тогда прогресс задвоился бы).
   * Ошибку записи не показываем: счёт на экране уже верный, а прогресс —
   * не деньги, из-за него портить момент итогов нечем.
   */
  const savedRunRef = useRef(false);
  useEffect(() => {
    if (phase !== 'done' || savedRunRef.current || answers.length === 0) return;
    savedRunRef.current = true;
    void saveArenaRun(answers, studyTarget);
  }, [phase, answers, studyTarget]);

  /**
   * зачем (НАЙДЕНО АУДИТОМ 2026-07-25): выход с СЕРЕДИНЫ забега терял весь
   * прогресс — ответы уже даны, но записывались только в фазе done. Юзер
   * честно отработал 7 из 10 вопросов, вышел — и ничего не засчиталось.
   *
   * Держим ответы в ref, чтобы cleanup видел их актуальное значение (замыкание
   * эффекта с пустыми зависимостями иначе поймало бы пустой массив), и пишем
   * при размонтировании. Тот же savedRunRef защищает от двойной записи, если
   * забег успел дойти до итогов.
   */
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const studyTargetRef = useRef(studyTarget);
  studyTargetRef.current = studyTarget;
  useEffect(
    () => () => {
      if (savedRunRef.current || answersRef.current.length === 0) return;
      savedRunRef.current = true;
      void saveArenaRun(answersRef.current, studyTargetRef.current);
    },
    [],
  );

  const restart = useCallback(() => {
    void hapticTap();
    clearTimers();
    setAnswers([]);
    setIndex(0);
    setPicked(null);
    // Новый забег — снова разрешаем запись прогресса.
    savedRunRef.current = false;
    setPhase('loading');
    const target = storageStudyTarget(studyTarget);
    void Promise.all([
      loadFlashcards(target).catch(() => []),
      readCustomCards(target).catch(() => [] as unknown[]),
    ]).then(([saved, rawCustom]) => {
      const savedCards: CardItem[] = (saved as any[]).map((fc) => ({
        id: String(fc.id ?? fc.en),
        en: String(fc.en ?? ''),
        ru: String(fc.ru ?? ''),
        uk: String(fc.uk ?? fc.ru ?? ''),
        es: fc.es ? String(fc.es) : undefined,
        categoryId: 'saved',
        isSystem: false,
      })) as CardItem[];
      const customCards = Array.isArray(rawCustom) ? (rawCustom as CardItem[]) : [];
      const built = buildArenaQuestions(
        [...savedCards, ...customCards], answerFor, promptFor, Date.now(), ARENA_QUESTION_COUNT,
      );
      setQuestions(built);
      setPhase(built.length > 0 ? 'playing' : 'empty');
    });
  }, [answerFor, clearTimers, promptFor, studyTarget]);

  const leave = useCallback(() => {
    void hapticTap();
    clearTimers();
    // зачем: router.back() на native-stack крашит Android/Fabric при Back
    // (см. app/navigation_back.ts) — тот же паттерн, что у flashcards_swipe.tsx,
    // экран открывается только из /flashcards (app/flashcards.tsx), туда и возвращаем.
    safeRouterBack(router, '/flashcards' as any);
  }, [clearTimers, router]);

  // Слова, где ошиблись — для экрана итогов.
  // guard-ok (firebase-cost): здесь НЕТ обращений к Firestore. Это сопоставление
  // уже загруженных в память вопросов через Map — O(n) по локальному массиву.
  const weakWords = useMemo(() => {
    const byId = new Map(questions.map((q) => [q.cardId, q]));
    return summary.weakCardIds
      .map((id) => byId.get(id))
      .filter((q): q is ArenaQuestion => !!q);
  }, [questions, summary.weakCardIds]);

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: insets.top + 12, paddingBottom: 10 }}>
      <TapScale onPress={leave} style={{ width: 40 }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityLabel={s.title}>
        <Ionicons name="chevron-back" size={24} color={t.textPrimary} />
      </TapScale>
      {/* зачем: text-integrity — заголовок переносится, шапка-ряд растёт; не усекаем. */}
      <FlowText testID="arena-header-title" provenance="authored" style={{ flex: 1, color: t.textPrimary, fontSize: 17, fontWeight: '800', textAlign: 'center' }}>
        {phase === 'playing' ? `${s.title} · ${index + 1}/${questions.length}` : s.title}
      </FlowText>
      {phase === 'playing' ? (
        // Кольцо-таймер (макет: 52px, r=22, дуга #F5C842).
        <View style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={52} height={52} style={{ transform: [{ rotate: '-90deg' }] }}>
            <Circle cx={26} cy={26} r={RING_R} fill="none" stroke={t.bgSurface} strokeWidth={4} />
            <AnimatedCircle
              cx={26} cy={26} r={RING_R} fill="none"
              stroke={secondsLeft <= 3 ? t.wrong : t.gold}
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray={RING_LEN}
              strokeDashoffset={reduceMotion
                ? RING_LEN * (1 - secondsLeft / ARENA_SECONDS_PER_QUESTION)
                : ringAnim.interpolate({ inputRange: [0, 1], outputRange: [RING_LEN, 0] })}
            />
          </Svg>
          <Text
            style={{
              position: 'absolute',
              color: secondsLeft <= 3 ? t.wrong : t.textPrimary,
              fontSize: 13,
              fontWeight: '900',
              fontVariant: ['tabular-nums'],
            }}
          >
            {secondsLeft}
          </Text>
        </View>
      ) : (
        <View style={{ width: 52 }} />
      )}
    </View>
  );

  const renderPlaying = () => {
    if (!current) return null;
    const shakeX = shakeAnim.interpolate({
      inputRange: [0, 0.25, 0.55, 0.8, 1],
      outputRange: [0, -6, 5, -3, 0],
    });
    return (
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 16) + 24 }}>
        {/* Вопрос (макет `.qz-q`): 20px/800, без обводки — §0.D. */}
        <View style={{ borderRadius: 18, paddingVertical: 22, paddingHorizontal: 18, backgroundColor: t.bgSurface, marginBottom: 14 }}>
          <Text style={{ color: t.textPrimary, fontSize: 20, fontWeight: '800', letterSpacing: -0.3, lineHeight: 28, textAlign: 'center' }}>
            «{current.prompt}»{'\n'}{s.question}
          </Text>
        </View>

        {/* guard-ok (perf): вариантов ровно ARENA_OPTION_COUNT = 4, список
            фиксированный — FlatList дал бы только overhead. */}
        <View style={{ gap: 9 }}>
          {current.options.map((opt, i) => {
            const isCorrect = i === current.correctIndex;
            const isPicked = picked === i;
            const revealed = picked !== null;
            // A-41/A-42: верный — зелёный, выбранный неверный — красный,
            // остальные тускнеют, чтобы взгляд шёл к правильному ответу.
            const showRight = revealed && isCorrect;
            const showWrong = revealed && isPicked && !isCorrect;
            const dimmed = revealed && !isCorrect && !isPicked;
            return (
              <Animated.View key={`${current.cardId}-${i}`} style={showWrong && !reduceMotion ? { transform: [{ translateX: shakeX }] } : null}>
                <TouchableOpacity
                  onPress={() => { void hapticTap(); answer(i); }}
                  disabled={revealed}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: revealed, selected: isPicked }}
                  style={{
                    minHeight: 58,
                    justifyContent: 'center',
                    paddingHorizontal: 14,
                    borderRadius: 16,
                    opacity: dimmed ? 0.4 : 1,
                    // §0.D — состояние держит заливка, не кромка.
                    backgroundColor: showRight
                      ? `${t.correct}24`
                      : showWrong
                        ? `${t.wrong}20`
                        : t.bgSurface,
                  }}
                >
                  <Text
                    style={{
                      color: showRight ? t.correct : showWrong ? t.wrong : t.textPrimary,
                      fontSize: 15,
                      fontWeight: '700',
                      textAlign: 'center',
                    }}
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  const renderDone = () => (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 16) + 24 }}>
      {/* Счёт (макет `.res-score`): 64px/900, дробь 26px приглушённая. */}
      <View style={{ alignItems: 'center', marginTop: 26, marginBottom: 10 }}>
        <Text style={{ color: t.textPrimary, fontSize: 64, fontWeight: '900', letterSpacing: -2, fontVariant: ['tabular-nums'] }}>
          {summary.correct}
          <Text style={{ color: t.textMuted, fontSize: 26, fontWeight: '700' }}> / {summary.total}</Text>
        </Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
        {summary.bestStreak >= 3 && (
          <View style={{ borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: `${t.gold}26` }}>
            <Text style={{ color: t.gold, fontSize: 12.5, fontWeight: '800' }}>
              🔥 {s.combo} ×{summary.bestStreak}
            </Text>
          </View>
        )}
        {summary.correct === summary.total && summary.total > 0 && (
          <View style={{ borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: `${t.correct}26` }}>
            <Text style={{ color: t.correct, fontSize: 12.5, fontWeight: '800' }}>{s.perfect}</Text>
          </View>
        )}
      </View>

      {weakWords.length > 0 && (
        <>
          {/* Заголовок секции, а не подпись-расшифровка: кегль полноценный,
              цвет основной — это самостоятельный блок списка. */}
          <Text style={{ color: t.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 4 }}>
            {s.weakTitle}
          </Text>
          {weakWords.map((q) => (
            <View
              key={q.cardId}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 13,
                paddingHorizontal: 13,
                borderRadius: 15,
                marginTop: 9,
                // §0.D — слабое слово помечено тоном, не рамкой.
                backgroundColor: `${t.wrong}14`,
              }}
            >
              {/* зачем: text-integrity — слово и перевод переносятся, ряд растёт. */}
              <FlowText testID="arena-weak-word" provenance="authored" style={{ color: t.textPrimary, fontSize: 14, fontWeight: '700', flexShrink: 1 }}>
                {q.options[q.correctIndex]}
              </FlowText>
              <FlowText testID="arena-weak-prompt" provenance="authored" style={{ color: t.textSecond, fontSize: 12.5, marginLeft: 'auto', flexShrink: 1, textAlign: 'right' }}>
                {q.prompt}
              </FlowText>
            </View>
          ))}
        </>
      )}

      <TouchableOpacity
        onPress={restart}
        activeOpacity={0.85}
        style={{ marginTop: 26, minHeight: 52, justifyContent: 'center', borderRadius: 16, backgroundColor: t.accent }}
      >
        <Text style={{ color: t.correctText, fontSize: 16, fontWeight: '800', textAlign: 'center' }}>{s.again}</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderEmpty = () => (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 14 }}>
      <Ionicons name="school-outline" size={56} color={t.textGhost} />
      <Text style={{ color: t.textSecond, fontSize: f.body, fontWeight: '700', textAlign: 'center', lineHeight: 22 }}>
        {s.empty}
      </Text>
      <TouchableOpacity
        onPress={leave}
        activeOpacity={0.85}
        style={{ marginTop: 6, minHeight: 48, justifyContent: 'center', paddingHorizontal: 26, borderRadius: 14, backgroundColor: t.accent }}
      >
        <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '800' }}>{s.addCards}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScreenGradient artBackdrop="flashcards">
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['left', 'right', 'bottom']}>
        <StatusBar barStyle={statusBarLight ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        <ContentWrap>
          {header}
          {phase === 'loading' && (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color={t.accent} />
            </View>
          )}
          {phase === 'empty' && renderEmpty()}
          {phase === 'playing' && renderPlaying()}
          {phase === 'done' && renderDone()}
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
