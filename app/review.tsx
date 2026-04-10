/**
 * ═══════════════════════════════════════════════════════════════════════════
 * REVIEW SCREEN — Экран интервального повторения (SRS-сессия)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Механика: пользователь собирает английскую фразу из плиток-слов.
 * Никаких кнопок «Знал/Не знал» — правильность определяется автоматически
 * через isCorrectAnswer() (та же функция что в lesson1.tsx и quizzes.tsx).
 *
 * Откуда берутся данные:
 *   lesson1.tsx → checkAnswer() → recordMistake(phrase.english, phrase.russian, lessonId)
 *   → active_recall.ts сохраняет фразу в AsyncStorage ('active_recall_items')
 *   → getDueItems() фильтрует фразы с nextDue <= конец сегодня
 *
 * Плитки:
 *   Слова правильной фразы (перемешаны) + 3 случайных дистрактора из DISTRACTOR_POOL.
 *   Пользователь тапает плитку снизу → она переходит в зону ответа.
 *   Тапает слово в зоне ответа → возвращается вниз.
 *   Когда выбрано нужное кол-во слов — автоматическая проверка.
 *
 * После проверки:
 *   Правильно → зелёный фидбэк → markReviewed(true) → +2 XP → следующая через 1.5с
 *   Неправильно → красный фидбэк + правильный ответ → markReviewed(false) → след. через 2.5с
 *
 * Связь с home.tsx:
 *   После завершения сессии router.back() → focusTick → getDueItems() → dueCount=0 → бейдж исчезает.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState, AppStateStatus, Animated, Dimensions, ScrollView,
  Text, TouchableOpacity,
  View,
} from 'react-native';
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { isCorrectAnswer } from '../constants/contractions';
import { hapticTap } from '../hooks/use-haptics';
import { getDueItems, markReviewed, RecallItem, removeItem, SESSION_LIMIT } from './active_recall';
import { registerXP } from './xp_manager';

const { width: SCREEN_W } = Dimensions.get('window');

function pluralizeRU(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}
function pluralizeUK(n: number, one: string, few: string, many: string): string {
  return pluralizeRU(n, one, few, many);
}
const CONTENT_W = Math.min(SCREEN_W, 640);

// ─── Дистракторы ─────────────────────────────────────────────────────────────
// Слова, которые добавляются к правильным словам фразы чтобы усложнить задание.
// Выбираются только те, которых нет в самой фразе.
const DISTRACTOR_POOL = [
  'have','has','had','been','was','were','is','are',
  'would','could','should','might','will','can',
  'not','never','just','still','already','yet',
  'very','really','quite','much','more','some',
  'about','after','before','since','until','because',
  'but','and','or','so','then','there','here',
];

// ─── Типы ─────────────────────────────────────────────────────────────────────
// Tile — одна плитка-слово. id нужен как React key когда одно слово встречается дважды.
type Tile   = { word: string; id: number };
type Status = 'playing' | 'result';

// ─── Генератор плиток ─────────────────────────────────────────────────────────
// Разбивает фразу на слова, добавляет 3 дистрактора, перемешивает всё.
// Возвращает плитки + количество слов в правильном ответе (для auto-check).
function makeTiles(phrase: string): { tiles: Tile[]; wordCount: number } {
  const clean = phrase.replace(/[.?!,;]+$/, '').trim();
  const words  = clean.split(/\s+/);
  const phraseSet = new Set(words.map(w => w.toLowerCase()));

  const distractors = DISTRACTOR_POOL
    .filter(d => !phraseSet.has(d.toLowerCase()))
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  const all = [...words, ...distractors].sort(() => Math.random() - 0.5);
  return {
    tiles:     all.map((word, i) => ({ word, id: i })),
    wordCount: words.length,
  };
}

// ─── Частица огня ────────────────────────────────────────────────────────────
type FlameParticleProps = {
  x: number; startY: number; delay: number; size: number; color: string;
  onDone?: () => void;
};
function FlameParticle({ x, startY, delay, size, color, onDone }: FlameParticleProps) {
  const translateY = useSharedValue(0);
  const opacity    = useSharedValue(0);
  const scale      = useSharedValue(0.4);
  const rotate     = useSharedValue(0);

  useEffect(() => {
    const totalDist = startY + 40 + Math.random() * 60;
    translateY.value = withDelay(delay, withTiming(-totalDist, { duration: 900 + Math.random() * 400, easing: Easing.out(Easing.quad) }));
    opacity.value    = withDelay(delay, withSequence(
      withTiming(1, { duration: 120 }),
      withTiming(1, { duration: 500 }),
      withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) }),
    ));
    scale.value      = withDelay(delay, withSequence(
      withSpring(1.2, { damping: 6 }),
      withTiming(0.3, { duration: 700 }),
    ));
    rotate.value     = withDelay(delay, withRepeat(
      withSequence(
        withTiming(-0.3, { duration: 180 }),
        withTiming(0.3,  { duration: 180 }),
      ), -1, true,
    ));
    // Уведомить родителя последней частицей
    if (onDone) {
      setTimeout(onDone, delay + 1300);
    }
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotate.value}rad` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Reanimated.View style={[style, {
      position: 'absolute', left: x - size / 2, bottom: startY,
      width: size, height: size * 1.3,
      borderRadius: size / 2,
      backgroundColor: color,
      shadowColor: color, shadowOpacity: 0.9, shadowRadius: size * 0.8, shadowOffset: { width: 0, height: 0 },
    }]} />
  );
}

// ─── Огонь поверх карточки ────────────────────────────────────────────────────
function BurnOverlay({ width, height, onDone }: { width: number; height: number; onDone: () => void }) {
  const particles: React.ReactElement[] = [];
  const colors = ['#FF1500','#FF4500','#FF6B00','#FFA500','#FFD700','#FF3300','#FF6600'];
  let doneTriggered = false;
  const triggerDone = () => { if (!doneTriggered) { doneTriggered = true; onDone(); } };

  for (let i = 0; i < 40; i++) {
    const px    = 10 + Math.random() * (width - 20);
    const py    = Math.random() * height;
    const delay = Math.random() * 400;
    const size  = 10 + Math.random() * 24;
    const color = colors[Math.floor(Math.random() * colors.length)];
    particles.push(
      <FlameParticle
        key={i} x={px} startY={py} delay={delay}
        size={size} color={color}
        onDone={i === 39 ? triggerDone : undefined}
      />
    );
  }

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, width, height, zIndex: 100, overflow: 'hidden' }} pointerEvents="none">
      {particles}
    </View>
  );
}

// ─── Компонент ────────────────────────────────────────────────────────────────
export default function ReviewScreen() {
  const router  = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const isUK = lang === 'uk';

  // Данные сессии
  const [items,   setItems]   = useState<RecallItem[]>([]);
  const [index,   setIndex]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [done,    setDone]    = useState(false);
  const [correct, setCorrect] = useState(0);
  const [wrong,   setWrong]   = useState(0);

  // Состояние плиток текущей карточки
  const [tiles,     setTiles]     = useState<Tile[]>([]);    // доступные (внизу)
  const [selected,  setSelected]  = useState<Tile[]>([]);    // выбранные (зона ответа)
  const [wordCount, setWordCount] = useState(0);             // кол-во слов правильного ответа
  const [status,    setStatus]    = useState<Status>('playing');
  const [wasCorrect,  setWasCorrect]  = useState(false);
  const [canBurn,     setCanBurn]     = useState(false);  // кнопка "сжечь" (правильно за 20с)
  const [burning,     setBurning]     = useState(false);  // идёт анимация сжигания
  const [cardLayout,  setCardLayout]  = useState({ width: CONTENT_W - 32, height: 110 });

  // Анимации
  const resultAnim    = useRef(new Animated.Value(0)).current;  // появление правильного ответа
  const slideAnim     = useRef(new Animated.Value(0)).current;  // переход между карточками
  const autoTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardStartTime = useRef<number>(0);                      // когда была загружена карточка
  const checkingRef   = useRef(false);                          // защита от двойного вызова checkAnswer

  // Загружаем фразы для повторения сегодня (один раз при монтировании)
  useEffect(() => {
    getDueItems(SESSION_LIMIT).then(due => {
      setItems(due);
      setLoading(false);
      if (due.length > 0) loadCard(due[0]);
    });
    return () => { if (autoTimer.current) clearTimeout(autoTimer.current); };
  }, []);

  // Сбрасываем анимацию и состояние карточки при возврате из фона —
  // это исправляет зависание кнопок и некорректное отображение после свернувшего приложения
  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        // Если slideAnim застрял в ненулевом положении — сбросить
        slideAnim.setValue(0);
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [slideAnim]);

  // Инициализирует плитки для конкретной карточки
  const loadCard = (item: RecallItem) => {
    checkingRef.current = false;
    const { tiles: newTiles, wordCount: wc } = makeTiles(item.phrase);
    setTiles(newTiles);
    setSelected([]);
    setWordCount(wc);
    setStatus('playing');
    setWasCorrect(false);
    setCanBurn(false);
    setBurning(false);
    resultAnim.setValue(0);
    cardStartTime.current = Date.now();
  };

  // Пользователь тапнул плитку снизу → переносим в зону ответа
  const moveTile = (tile: Tile) => {
    if (status !== 'playing') return;
    hapticTap();
    const newSelected = [...selected, tile];
    setTiles(prev => prev.filter(t => t.id !== tile.id));
    setSelected(newSelected);
    // Auto-check: как только выбрано нужное кол-во слов — сразу проверяем
    if (newSelected.length === wordCount) {
      checkAnswer(newSelected);
    }
  };

  // Пользователь тапнул слово в зоне ответа → возвращаем вниз
  const moveTileBack = (tile: Tile) => {
    if (status !== 'playing') return;
    hapticTap();
    setSelected(prev => prev.filter(s => s.id !== tile.id));
    setTiles(prev => [...prev, tile]);
  };

  // Проверка ответа — вызывается автоматически когда выбрано wordCount слов.
  // isCorrectAnswer() обрабатывает сокращения (don't = do not) и регистр.
  const checkAnswer = useCallback(async (sel: Tile[]) => {
    if (checkingRef.current) return;
    checkingRef.current = true;

    const answer = sel.map(t => t.word).join(' ');
    const item = items[index];
    const ok   = isCorrectAnswer(answer, item.phrase);

    setWasCorrect(ok);
    setStatus('result');

    // Вибро-фидбэк как в уроке
    try {
      if (ok) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {}

    // Плавное появление блока с правильным ответом (если ошиблись)
    Animated.spring(resultAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();

    // Считаем ответ немедленно — до async операций, чтобы не пропустить при ошибке
    if (ok) {
      setCorrect(c => c + 1);
    } else {
      setWrong(w => w + 1);
    }

    // Обновляем SM-2 и XP асинхронно — ошибки здесь не должны влиять на счёт
    try {
      await markReviewed(item.phrase, ok);
    } catch {}

    try {
      if (ok) {
        const elapsed = Date.now() - cardStartTime.current;
        if (elapsed <= 20_000) setCanBurn(true);
        const name = await AsyncStorage.getItem('user_name');
        if (name) {
          await registerXP(2, 'review_answer', name, lang as 'ru'|'uk');
        }
      }
    } catch {}

    checkingRef.current = false;
    // Показываем кнопку "Далее" — пользователь переходит вручную
  }, [items, index, lang, resultAnim]);

  // Анимированный переход к следующей карточке
  const advanceCard = () => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    Animated.timing(slideAnim, { toValue: -CONTENT_W, duration: 220, useNativeDriver: true }).start(() => {
      slideAnim.setValue(CONTENT_W);
      if (index + 1 >= items.length) {
        setDone(true);
      } else {
        const next = index + 1;
        setIndex(next);
        loadCard(items[next]);
      }
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
    });
  };

  // Сжечь карточку — удалить навсегда с анимацией
  const burnCard = async () => {
    const item = items[index];
    setBurning(true);
    setCanBurn(false);
    await removeItem(item.phrase);
    const newItems = items.filter((_, i) => i !== index);
    // Не переключаем items сразу — ждём окончания анимации сжигания
    setTimeout(() => {
      setBurning(false);
      setItems(newItems);
      if (newItems.length === 0) {
        setDone(true);
      } else {
        const next = index >= newItems.length ? newItems.length - 1 : index;
        setIndex(next);
        loadCard(newItems[next]);
      }
    }, 1400);
  };

  // ─── Загрузка ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <ScreenGradient>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: t.textMuted, fontSize: f.body }}>
          {isUK ? 'Завантаження...' : 'Загрузка...'}
        </Text>
      </View>
      </ScreenGradient>
    );
  }

  // ─── Нечего повторять ─────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <Ionicons name="chevron-back" size={26} color={t.textPrimary} />
          </TouchableOpacity>
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700' }}>
            {isUK ? 'Повторення' : 'Повторение'}
          </Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ fontSize: 56, marginBottom: 16 }}>✅</Text>
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', textAlign: 'center' }}>
            {isUK ? 'Нічого повторювати!' : 'Нечего повторять!'}
          </Text>
          <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', marginTop: 8, lineHeight: 22 }}>
            {isUK
              ? 'Допускай помилки в уроках — вони з\'являться тут для повторення'
              : 'Допускай ошибки в уроках — они появятся здесь для повторения'}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginTop: 32, backgroundColor: t.accent, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 }}
          >
            <Text style={{ color: t.bgPrimary, fontSize: f.body, fontWeight: '700' }}>
              {isUK ? 'Назад' : 'Назад'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      </ScreenGradient>
    );
  }

  // ─── Сессия завершена ─────────────────────────────────────────────────────
  if (done) {
    const total = correct + wrong;
    const pct   = total > 0 ? Math.round((correct / total) * 100) : 0;
    const emoji = pct >= 80 ? '🏆' : pct >= 50 ? '💪' : '📖';
    const title = pct >= 80
      ? (isUK ? 'Відмінно!'       : 'Отлично!')
      : pct >= 50
        ? (isUK ? 'Добре!'         : 'Хорошо!')
        : (isUK ? 'Ще попрацюємо!' : 'Ещё поработаем!');

    return (
      <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>{emoji}</Text>
          <Text style={{ color: t.textPrimary, fontSize: 28, fontWeight: '800', textAlign: 'center' }}>
            {title}
          </Text>
          <Text style={{ color: t.textSecond, fontSize: f.h2, fontWeight: '700', marginTop: 8 }}>
            {pct}%
          </Text>
          <View style={{ flexDirection: 'row', gap: 20, marginTop: 28 }}>
            <View style={{ alignItems: 'center', backgroundColor: t.correctBg, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 16 }}>
              <Text style={{ color: t.correct, fontSize: 28, fontWeight: '800' }}>{correct}</Text>
              <Text style={{ color: t.correct, fontSize: f.caption, fontWeight: '600', marginTop: 2 }}>
                {isUK ? 'Правильно' : 'Правильно'}
              </Text>
            </View>
            <View style={{ alignItems: 'center', backgroundColor: t.wrongBg, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 16 }}>
              <Text style={{ color: t.wrong, fontSize: 28, fontWeight: '800' }}>{wrong}</Text>
              <Text style={{ color: t.wrong, fontSize: f.caption, fontWeight: '600', marginTop: 2 }}>
                {isUK ? 'Помилки' : 'Ошибки'}
              </Text>
            </View>
          </View>
          <Text style={{ color: t.textMuted, fontSize: f.caption, textAlign: 'center', marginTop: 20, lineHeight: 18 }}>
            {isUK ? 'Фрази з помилками повернуться завтра' : 'Фразы с ошибками вернутся завтра'}
          </Text>
          {/* router.back() → home.tsx обновит dueCount через focusTick → бейдж исчезнет */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginTop: 32, backgroundColor: t.accent, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 }}
          >
            <Text style={{ color: t.bgPrimary, fontSize: f.body, fontWeight: '700' }}>
              {isUK ? 'Готово' : 'Готово'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      </ScreenGradient>
    );
  }

  // ─── Основной экран: плиточная сессия ────────────────────────────────────
  const item = items[index];
  const answerBorderColor = status === 'result' ? (wasCorrect ? t.correct : t.wrong) : t.border;
  const answerBg          = status === 'result' ? (wasCorrect ? t.correctBg : t.wrongBg) : 'transparent';

  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex: 1, position: 'relative' }}>

      {/* Хедер: назад + заголовок + счётчик */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={26} color={t.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700' }}>
            {isUK ? 'Повторення' : 'Повторение'}
          </Text>
        </View>
        <Text style={{ color: t.textMuted, fontSize: f.body, fontWeight: '600' }}>
          {index + 1} / {items.length}
        </Text>
      </View>

      {/* Прогресс-бар */}
      <View style={{ height: 4, backgroundColor: t.bgSurface, marginHorizontal: 16, borderRadius: 2, marginBottom: 20 }}>
        <View style={{
          width: `${(index / items.length) * 100}%` as any,
          height: '100%', borderRadius: 2, backgroundColor: t.accent,
        }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Метка урока */}
        <Text style={{ color: t.textMuted, fontSize: f.caption, marginBottom: 12 }}>
          {`Урок ${item.lessonId}`}
        </Text>

        {/* Весь контент карточки анимируется при переходе (slideAnim) */}
        <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>


          {/* Карточка с переводом — то что нужно составить */}
          <View
            onLayout={e => setCardLayout({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
            style={{
              backgroundColor: t.bgCard,
              borderRadius: 20,
              padding: 28,
              minHeight: 110,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 0.5,
              borderColor: t.border,
              marginBottom: 20,
            }}
          >
            {/* Огонь привязан к карточке */}
            {burning && (
              <BurnOverlay width={cardLayout.width} height={cardLayout.height} onDone={() => {}} />
            )}
            <Text style={{ color: t.textMuted, fontSize: f.caption, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
              {isUK ? 'Складіть фразу' : 'Составьте фразу'}
            </Text>
            <Text style={{ color: t.textPrimary, fontSize: 22, fontWeight: '700', textAlign: 'center', lineHeight: 30 }}>
              {isUK && item.correctAnswerUK ? item.correctAnswerUK : item.correctAnswer}
            </Text>
          </View>

          {/* ── Зона ответа ─────────────────────────────────────────────────
              Выбранные плитки. Тап → возвращает плитку вниз (только в playing).
              Цвет рамки и фона меняется при result: зелёный/красный.           */}
          <View style={{
            minHeight: 56,
            borderWidth: 1.5,
            borderColor: answerBorderColor,
            backgroundColor: answerBg,
            borderRadius: 16,
            padding: 12,
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 12,
          }}>
            {selected.length === 0 && status === 'playing' && (
              <Text style={{ color: t.textGhost, fontSize: f.body, alignSelf: 'center' }}>
                {isUK ? 'Тут з\'являться слова...' : 'Здесь появятся слова...'}
              </Text>
            )}
            {selected.map(tile => (
              <TouchableOpacity
                key={tile.id}
                onPress={() => moveTileBack(tile)}
                activeOpacity={0.7}
                style={{
                  backgroundColor: status === 'result'
                    ? (wasCorrect ? t.correctBg : t.wrongBg)
                    : t.bgSurface,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  borderWidth: 1,
                  borderColor: status === 'result'
                    ? (wasCorrect ? t.correct : t.wrong)
                    : t.border,
                }}
              >
                <Text style={{
                  color: status === 'result'
                    ? (wasCorrect ? t.correct : t.wrong)
                    : t.textPrimary,
                  fontSize: f.body,
                  fontWeight: '500',
                }}>
                  {tile.word}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Правильный ответ — показывается только при ошибке */}
          {status === 'result' && !wasCorrect && (
            <Animated.View style={{
              opacity: resultAnim,
              backgroundColor: t.correctBg,
              borderRadius: 14,
              padding: 14,
              borderLeftWidth: 3,
              borderLeftColor: t.correct,
              marginBottom: 16,
            }}>
              <Text style={{ color: t.textMuted, fontSize: f.caption, marginBottom: 4 }}>
                {isUK ? 'Правильна відповідь:' : 'Правильный ответ:'}
              </Text>
              <Text style={{ color: t.correct, fontSize: f.bodyLg, fontWeight: '600' }}>
                {item.phrase}
              </Text>
            </Animated.View>
          )}

          {/* ── Доступные плитки ────────────────────────────────────────────
              Перемешанные слова фразы + дистракторы.
              Тап → переходит в зону ответа.
              При status='result' задизейблены и полупрозрачны.                */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 8 }}>
            {tiles.map(tile => (
              <TouchableOpacity
                key={tile.id}
                onPress={() => moveTile(tile)}
                activeOpacity={0.7}
                disabled={status === 'result'}
                style={{
                  backgroundColor: t.bgCard,
                  borderRadius: 10,
                  paddingHorizontal: 16,
                  paddingVertical: 11,
                  borderWidth: 0.5,
                  borderColor: t.border,
                  opacity: status === 'result' ? 0.35 : 1,
                }}
              >
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '500' }}>
                  {tile.word}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

        </Animated.View>
      </ScrollView>

      {/* Кнопки "Далее" и "Сжечь" — появляются после ответа */}
      {status === 'result' && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8, gap: 10 }}>
          {/* Кнопка "Сжечь" — только если правильно за 20 секунд */}
          {canBurn && (
            <TouchableOpacity
              onPress={burnCard}
              style={{
                backgroundColor: '#1a0a00',
                borderRadius: 16,
                paddingVertical: 14,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
                borderWidth: 1.5,
                borderColor: '#FF4500',
              }}
            >
              <Text style={{ fontSize: 18 }}>🔥</Text>
              <Text style={{ color: '#FF6B2B', fontSize: f.bodyLg, fontWeight: '700' }}>
                {isUK ? 'Спалити картку' : 'Сжечь карточку'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={advanceCard}
            style={{
              backgroundColor: wasCorrect ? t.correct : t.accent,
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: t.correctText, fontSize: f.bodyLg, fontWeight: '700' }}>
              {isUK ? 'Далі →' : 'Далее →'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
    </ScreenGradient>
  );
}
