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
 *   → getDueItems(SESSION_LIMIT, { commitSessionOverflow: true }) — сессия + перенос перегруза на завтра
 *
 * Плитки:
 *   Слова правильной фразы (перемешаны) + 3 случайных дистрактора из DISTRACTOR_POOL.
 *   Пользователь тапает плитку снизу → она переходит в зону ответа.
 *   Тапает слово в зоне ответа → возвращается вниз.
 *   Когда выбрано нужное кол-во слов — автоматическая проверка.
 *
 * После проверки:
 *   Правильно → зелёный фидбэк → markReviewed(true) → XP (registerXP, review_answer) → «Далее» вручную
 *   Неправильно → красный фидбэк + правильный ответ → markReviewed(false) → далее вручную
 *
 * Связь с home.tsx:
 *   После сессии router.back() → focusTick → countDueItemsToday() → бейдж обновляется
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState, AppStateStatus, Animated, Dimensions, Easing as SlideEasing, ScrollView,
  StyleSheet,
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
import { triLang, type Lang } from '../constants/i18n';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import XpGainBadge from '../components/XpGainBadge';
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { getDueItems, markReviewed, RecallItem, removeItem, SESSION_LIMIT } from './active_recall';
import { updateMultipleTaskProgress } from './daily_tasks';
import { registerXP } from './xp_manager';
import ReportErrorButton from '../components/ReportErrorButton';
import {
  evaluateRecallAnswer,
  pickReviewMode,
  ReviewMode,
} from './review_evaluator';

const { width: SCREEN_W } = Dimensions.get('window');

const CONTENT_W = Math.min(SCREEN_W, 640);
const REVIEW_BURN_HINT_SHOWN_KEY = 'review_burn_hint_shown_v1';

/** Подсказка-перевод на карточке повторения (es / uk / ru). */
function recallTranslationHint(item: RecallItem, lang: Lang): string {
  if (lang === 'es') return item.correctAnswerES ?? item.correctAnswer;
  if (lang === 'uk' && item.correctAnswerUK) return item.correctAnswerUK;
  return item.correctAnswer;
}

/** Подпись источника фразы на экране повторения (урок / квиз / арена / …). */
function recallOriginCaption(item: RecallItem | undefined, lang: Lang): string {
  if (!item) return triLang(lang, { ru: 'Повторение', uk: 'Повторення', es: 'Repaso' });
  const s = item.source;
  // lessonId 99 — служебный (admin test bench), не показываем его пользователю
  if (item.lessonId === 99) return triLang(lang, { ru: 'Повторение', uk: 'Повторення', es: 'Repaso' });
  if (s === 'quiz') {
    return item.lessonId > 0
      ? triLang(lang, {
          ru: `Квиз · урок ${item.lessonId}`,
          uk: `Квіз · урок ${item.lessonId}`,
          es: `Cuestionario · lección ${item.lessonId}`,
        })
      : triLang(lang, { ru: 'Квиз', uk: 'Квіз', es: 'Cuestionario' });
  }
  if (s === 'arena') return triLang(lang, { ru: 'Арена', uk: 'Арена', es: 'Arena' });
  if (s === 'diagnostic') return triLang(lang, { ru: 'Диагностика', uk: 'Діагностика', es: 'Test de nivel' });
  if (s === 'exam') {
    return triLang(lang, {
      ru: `Зачёт · урок ${item.lessonId}`,
      uk: `Залік · урок ${item.lessonId}`,
      es: `Examen · lección ${item.lessonId}`,
    });
  }
  return triLang(lang, {
    ru: `Урок ${item.lessonId}`,
    uk: `Урок ${item.lessonId}`,
    es: `Lección ${item.lessonId}`,
  });
}

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

/** Выезд / въезд карточки: симметричный timing, без длинного хвоста у spring. */
const SLIDE_OUT_MS = 175;
const SLIDE_IN_MS = 210;

// ─── Частицы: языки пламени ───────────────────────────────────────────────────
function FlameLickParticle({ x, startY, delay, size, color }: {
  x: number; startY: number; delay: number; size: number; color: string;
}) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity    = useSharedValue(0);
  const scale      = useSharedValue(0.35);
  const rotate     = useSharedValue(0);

  useEffect(() => {
    const totalDist   = startY + 32 + Math.random() * 70;
    const duration    = 950 + Math.random() * 450;
    const wobbleAmp   = 4 + Math.random() * 10;
    translateY.value  = withDelay(delay, withTiming(-totalDist, { duration, easing: Easing.out(Easing.cubic) }));
    translateX.value  = withDelay(delay, withRepeat(
      withSequence(
        withTiming(wobbleAmp,  { duration: 90 + Math.random() * 40 }),
        withTiming(-wobbleAmp, { duration: 90 + Math.random() * 40 }),
      ),
      Math.ceil(duration / 180) + 2,
      false,
    ));
    opacity.value = withDelay(delay, withSequence(
      withTiming(1,   { duration: 100, easing: Easing.out(Easing.quad) }),
      withTiming(0.95, { duration: Math.min(400, duration * 0.35) }),
      withTiming(0, { duration: 320, easing: Easing.in(Easing.cubic) }),
    ));
    scale.value = withDelay(delay, withSequence(
      withSpring(1.15 + Math.random() * 0.2, { damping: 5.5, stiffness: 120 }),
      withTiming(0.2 + Math.random() * 0.15, { duration: duration * 0.6, easing: Easing.in(Easing.quad) }),
    ));
    rotate.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(-0.45, { duration: 160 }),
        withTiming(0.45,  { duration: 160 }),
      ),
      -1,
      true,
    ));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot particle choreography per mount
  }, [delay, startY]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotate.value}rad` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Reanimated.View
      style={[style, {
        position: 'absolute',
        left: x - size / 2,
        bottom: startY,
        width: size,
        height: size * 1.45,
        borderRadius: size / 2,
        backgroundColor: color,
        shadowColor: color,
        shadowOpacity: 0.85,
        shadowRadius: size * 0.75,
        shadowOffset: { width: 0, height: 0 },
      }]}
    />
  );
}

// ─── Быстрые искры ────────────────────────────────────────────────────────────
function SparkParticle({ x, startY, delay, size, color }: {
  x: number; startY: number; delay: number; size: number; color: string;
}) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity    = useSharedValue(0);
  const scale      = useSharedValue(1);

  useEffect(() => {
    const d = 380 + Math.random() * 220;
    const drift = (Math.random() - 0.5) * 30;
    translateY.value = withDelay(delay, withTiming(-(startY + 50 + Math.random() * 40), { duration: d, easing: Easing.out(Easing.quad) }));
    translateX.value = withDelay(delay, withTiming(drift, { duration: d, easing: Easing.inOut(Easing.sin) }));
    opacity.value = withDelay(delay, withSequence(
      withTiming(1, { duration: 40 }),
      withTiming(1, { duration: d * 0.5 }),
      withTiming(0, { duration: 120, easing: Easing.in(Easing.quad) }),
    ));
    scale.value = withDelay(delay, withSequence(
      withTiming(1.4, { duration: 60 }),
      withTiming(0.2, { duration: d - 60 }),
    ));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot particle choreography per mount
  }, [delay, startY]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Reanimated.View
      style={[style, {
        position: 'absolute',
        left: x - size / 2,
        bottom: startY,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        shadowColor: '#FFF8E0',
        shadowOpacity: 1,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 0 },
      }]}
    />
  );
}

// ─── Серо-белый дым / зола ───────────────────────────────────────────────────
function AshSmokeParticle({ x, startY, delay, size }: { x: number; startY: number; delay: number; size: number }) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity    = useSharedValue(0);
  const scale      = useSharedValue(0.6);

  useEffect(() => {
    const d = 1100 + Math.random() * 500;
    translateY.value = withDelay(delay, withTiming(-(startY + 100 + Math.random() * 60), { duration: d, easing: Easing.out(Easing.quad) }));
    translateX.value = withDelay(delay, withTiming((Math.random() - 0.5) * 40, { duration: d }));
    opacity.value = withDelay(delay, withSequence(
      withTiming(0.45, { duration: 200 }),
      withTiming(0.25, { duration: d * 0.55 }),
      withTiming(0, { duration: 280 }),
    ));
    scale.value = withDelay(delay, withSequence(
      withTiming(1, { duration: 400 }),
      withTiming(1.8, { duration: d - 400 }),
    ));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot particle choreography per mount
  }, [delay, startY]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Reanimated.View
      style={[style, {
        position: 'absolute',
        left: x - size / 2,
        bottom: startY,
        width: size,
        height: size * 0.9,
        borderRadius: size / 2,
        backgroundColor: 'rgba(60, 58, 56, 0.75)',
      }]}
    />
  );
}

// ─── Полноэкранный эффект сжигания карточки ───────────────────────────────────
function BurnCardEffect({
  width,
  height,
  borderRadius,
}: {
  width: number;
  height: number;
  borderRadius: number;
}) {
  const w = Math.max(1, width);
  const h = Math.max(1, height);

  const emberFlicker = useSharedValue(0.5);
  const charDarken   = useSharedValue(0);
  const edgeFire     = useSharedValue(0);

  useEffect(() => {
    emberFlicker.value = withRepeat(
      withSequence(
        withTiming(1,   { duration: 70 + Math.random() * 50 }),
        withTiming(0.4, { duration: 80 + Math.random() * 60 }),
        withTiming(0.85, { duration: 60 }),
      ),
      -1,
      false,
    );
    charDarken.value = withSequence(
      withDelay(100, withTiming(1, { duration: 1500, easing: Easing.in(Easing.cubic) })),
    );
    edgeFire.value = withSequence(
      withDelay(50, withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) })),
      withTiming(0.85, { duration: 1200 }),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only; shared values are stable refs
  }, []);

  const emberStyle = useAnimatedStyle(() => ({ opacity: 0.4 + emberFlicker.value * 0.55 }));
  const charStyle  = useAnimatedStyle(() => ({
    ...StyleSheet.absoluteFillObject,
    borderRadius,
    // Под пламенем: сажа не перекрывает огонь (слой ниже частиц).
    backgroundColor: `rgba(8,3,0,${0.08 + charDarken.value * 0.42})`,
  }));
  const edgeStyle  = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: 0,
    right: 0,
    top: 0,
    height: 5 + edgeFire.value * 10,
    opacity: 0.25 + edgeFire.value * 0.55,
  }));

  const flameColors   = ['#E02000', '#FF4500', '#FF6B00', '#FF8C00', '#FFAA00', '#FFB020', '#FF3000', '#D43800'];
  const sparkColors   = ['#FFF8E6', '#FFECB0', '#FFD54F', '#FFFDE7'];
  const flames: React.ReactNode[] = [];
  const sparks: React.ReactNode[] = [];
  const smokes: React.ReactNode[] = [];

  for (let i = 0; i < 28; i++) {
    const px    = 6 + Math.random() * (w - 12);
    const py    = Math.random() * h * 0.85;
    const delay = Math.random() * 480;
    const size  = 8 + Math.random() * 22;
    const color = flameColors[Math.floor(Math.random() * flameColors.length)]!;
    flames.push(
      <FlameLickParticle key={`f-${i}`} x={px} startY={py} delay={delay} size={size} color={color} />,
    );
  }
  for (let i = 0; i < 22; i++) {
    const px    = 4 + Math.random() * (w - 8);
    const py    = Math.random() * h * 0.5;
    const delay = Math.random() * 300;
    const size  = 2 + Math.random() * 3.5;
    const color = sparkColors[Math.floor(Math.random() * sparkColors.length)]!;
    sparks.push(
      <SparkParticle key={`s-${i}`} x={px} startY={py} delay={delay} size={size} color={color} />,
    );
  }
  for (let i = 0; i < 10; i++) {
    const px    = 10 + Math.random() * (w - 20);
    const py    = Math.random() * h * 0.4;
    const delay = 200 + Math.random() * 400;
    const size  = 14 + Math.random() * 28;
    smokes.push(
      <AshSmokeParticle key={`a-${i}`} x={px} startY={py} delay={delay} size={size} />,
    );
  }

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: w,
        height: h,
        zIndex: 20,
        overflow: 'hidden',
        borderRadius,
      }}
      pointerEvents="none"
    >
      <LinearGradient
        colors={['transparent', 'rgba(255,55,0,0.12)', 'rgba(255,35,0,0.4)', 'rgba(180,20,0,0.75)']}
        locations={[0, 0.35, 0.7, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: h * 0.62 }}
      />
      <Reanimated.View style={emberStyle} pointerEvents="none">
        <LinearGradient
          colors={['transparent', 'rgba(255,100,0,0.28)', 'rgba(255,60,0,0.5)']}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0.2 }}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: h * 0.5 }}
        />
      </Reanimated.View>
      <Reanimated.View style={edgeStyle} pointerEvents="none">
        <LinearGradient
          colors={['rgba(255,120,0,0.7)', 'rgba(255,60,0,0.2)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Reanimated.View>
      <Reanimated.View style={charStyle} pointerEvents="none" />
      {flames}
      {smokes}
      {sparks}
    </View>
  );
}

// ─── Компонент ────────────────────────────────────────────────────────────────
export default function ReviewScreen() {
  const router  = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();

  // Данные сессии
  const [items,   setItems]   = useState<RecallItem[]>([]);
  const [index,   setIndex]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [done,      setDone]      = useState(false);
  const [correct,   setCorrect]   = useState(0);
  const [wrong,     setWrong]     = useState(0);
  const [totalXP,   setTotalXP]   = useState(0);

  // Состояние плиток текущей карточки
  const [tiles,     setTiles]     = useState<Tile[]>([]);    // доступные (внизу)
  const [selected,  setSelected]  = useState<Tile[]>([]);    // выбранные (зона ответа)
  const [wordCount, setWordCount] = useState(0);             // кол-во слов правильного ответа
  const [mode, setMode]           = useState<ReviewMode>('build');
  const [status,    setStatus]    = useState<Status>('playing');
  const [wasCorrect,  setWasCorrect]  = useState(false);
  const [canBurn,     setCanBurn]     = useState(false);  // кнопка "сжечь" (правильно за 20с)
  const [burning,     setBurning]     = useState(false);  // идёт анимация сжигания
  const [cardLayout,  setCardLayout]  = useState({ width: CONTENT_W - 32, height: 110 });
  const [burnHintSeen, setBurnHintSeen] = useState(true);

  // Анимации
  const resultAnim    = useRef(new Animated.Value(0)).current;  // появление правильного ответа
  const slideAnim     = useRef(new Animated.Value(0)).current;  // переход между карточками
  const burnTextOp    = useRef(new Animated.Value(1)).current;  // сжигание: текст бледнеет
  const burnCardScale = useRef(new Animated.Value(1)).current;  // сжигание: лёгкое сжатие
  const burnHintAnim  = useRef(new Animated.Value(0)).current;
  const autoTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardStartTime = useRef<number>(0);                      // когда была загружена карточка
  const checkingRef   = useRef(false);                          // защита от двойного вызова checkAnswer
  const userNameRef   = useRef<string | null>(null);             // кэш имени пользователя
  const recallSessionTracked = useRef(false);                   // recall_session засчитывается один раз за сессию

  // Инициализирует плитки для конкретной карточки
  const loadCard = useCallback((item: RecallItem, itemIndex: number, poolItems: RecallItem[]) => {
    checkingRef.current = false;
    const nextMode = pickReviewMode(item.errorCount, itemIndex);
    setMode(nextMode);
    void poolItems;
    const { tiles: newTiles, wordCount: wc } = makeTiles(item.phrase);
    setTiles(newTiles);
    setSelected([]);
    setWordCount(wc);
    setStatus('playing');
    setWasCorrect(false);
    setCanBurn(false);
    setBurning(false);
    resultAnim.setValue(0);
    burnTextOp.setValue(1);
    burnCardScale.setValue(1);
    cardStartTime.current = Date.now();
  }, [resultAnim, burnTextOp, burnCardScale]);

  // Загружаем фразы для повторения сегодня (один раз при монтировании)
  useEffect(() => {
    const timerRef = autoTimer;
    AsyncStorage.getItem(REVIEW_BURN_HINT_SHOWN_KEY)
      .then(v => setBurnHintSeen(v === '1'))
      .catch(() => setBurnHintSeen(true));
    getDueItems(SESSION_LIMIT, { commitSessionOverflow: true }).then(due => {
      setItems(due);
      setLoading(false);
      if (due.length > 0) loadCard(due[0], 0, due);
    });
    AsyncStorage.getItem('user_name').then(n => { userNameRef.current = n; }).catch(() => {});
    return () => {
      const timer = timerRef.current;
      if (timer) clearTimeout(timer);
    };
  }, [loadCard]);

  const shouldShowBurnHint = status === 'result' && canBurn && !burnHintSeen;

  useEffect(() => {
    if (!shouldShowBurnHint) {
      burnHintAnim.setValue(0);
      return;
    }
    AsyncStorage.setItem(REVIEW_BURN_HINT_SHOWN_KEY, '1').catch(() => {});
    setBurnHintSeen(true);
    burnHintAnim.setValue(0);
    Animated.timing(burnHintAnim, {
      toValue: 1,
      duration: 380,
      useNativeDriver: true,
    }).start();
  }, [burnHintAnim, shouldShowBurnHint]);

  // Если индекс вышел за границы (гонка колбэков анимации / перекрывающиеся переходы),
  // приводим к последней карточке — иначе items[index] undefined → краш в recallOriginCaption.
  useEffect(() => {
    if (loading || items.length === 0) return;
    if (index >= items.length) {
      const last = items.length - 1;
      setIndex(last);
      loadCard(items[last]!, last, items);
    }
  }, [loading, items, index, loadCard]);

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

  // Пользователь тапнул плитку снизу → переносим в зону ответа
  const moveTile = (tile: Tile) => {
    if (status !== 'playing') return;
    hapticTap();
    const newSelected = [...selected, tile];
    setTiles(prev => prev.filter(t => t.id !== tile.id));
    setSelected(newSelected);
    // Auto-check: как только выбрано нужное кол-во слов — сразу проверяем
    if (newSelected.length === wordCount) {
      checkAnswer(newSelected.map(t => t.word).join(' '));
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
  const checkAnswer = useCallback(async (userAnswer: string) => {
    if (checkingRef.current) return;
    checkingRef.current = true;

    const item = items[index];
    if (!item) {
      checkingRef.current = false;
      return;
    }
    const { ok } = evaluateRecallAnswer(userAnswer, item.phrase);

    setWasCorrect(ok);
    setStatus('result');

    if (ok) void hapticSuccess();
    else void hapticError();

    // Плавное появление блока с правильным ответом (если ошиблись)
    Animated.spring(resultAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();

    // Считаем ответ немедленно — до async операций, чтобы не пропустить при ошибке
    if (ok) {
      setCorrect(c => c + 1);
    } else {
      setWrong(w => w + 1);
    }

    // Обновляем SM-2 и XP асинхронно (fire-and-forget) — ошибки здесь не должны влиять на счёт
    markReviewed(item.phrase, ok).catch(() => {});

    // recall_session — засчитывается при первом любом ответе (правильном или нет)
    if (!recallSessionTracked.current) {
      recallSessionTracked.current = true;
      updateMultipleTaskProgress([{ type: 'recall_session', increment: 1 }]).catch(() => {});
    }

    if (ok) {
      const elapsed = Date.now() - cardStartTime.current;
      if (elapsed <= 20_000) setCanBurn(true);
      if (userNameRef.current) {
        registerXP(5, 'review_answer', userNameRef.current, lang).then(result => {
          setTotalXP(prev => prev + result.finalDelta);
        }).catch(() => { setTotalXP(prev => prev + 5); });
      }
      // recall_answers — каждый правильный ответ
      updateMultipleTaskProgress([{ type: 'recall_answers', increment: 1 }]).catch(() => {});
    }

    checkingRef.current = false;
    // Показываем кнопку "Далее" — пользователь переходит вручную
  }, [items, index, lang, resultAnim]);

  /** Общий слайд влево → смена контента → spring в ноль (и для «Далее», и после сжигания). */
  const runSlideToNext = useCallback((
    applyAfterSlideOut: () => void,
  ) => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    Animated.timing(slideAnim, {
      toValue: -CONTENT_W,
      duration: SLIDE_OUT_MS,
      easing: SlideEasing.out(SlideEasing.cubic),
      useNativeDriver: true,
    }).start(() => {
      slideAnim.setValue(CONTENT_W);
      applyAfterSlideOut();
      // Spring давал визуальный «хвост» ~0.5–1 с в конце; timing — предсказуемо и быстро
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: SLIDE_IN_MS,
        easing: SlideEasing.out(SlideEasing.cubic),
        useNativeDriver: true,
      }).start();
    });
  }, [slideAnim]);

  // Анимированный переход к следующей карточке
  const advanceCard = () => {
    if (index + 1 >= items.length) {
      runSlideToNext(() => { setDone(true); });
    } else {
      const next = index + 1;
      runSlideToNext(() => {
        setIndex(next);
        loadCard(items[next], next, items);
      });
    }
  };

  // Сжечь карточку — удалить навсегда с анимацией
  const burnCard = () => {
    const item = items[index];
    if (!item) return;
    const fromIndex = index;
    setBurning(true);
    setCanBurn(false);
    hapticTap();
    const newItems = items.filter((_, i) => i !== fromIndex);
    // Не await — сразу огонь; запись в storage не должна вставлять кадр «тишины» перед эффектом
    void removeItem(item.phrase).catch(() => {});

    // Слайд сразу по завершению parallel (без setTimeout(2300) — тот и давал секунду «подвисания»)
    const afterBurn = () => {
      if (newItems.length === 0) {
        runSlideToNext(() => {
          setBurning(false);
          setDone(true);
        });
        return;
      }
      const next = fromIndex >= newItems.length ? newItems.length - 1 : fromIndex;
      runSlideToNext(() => {
        setBurning(false);
        setItems(newItems);
        setIndex(next);
        loadCard(newItems[next], next, newItems);
      });
    };

    Animated.parallel([
      Animated.timing(burnTextOp, { toValue: 0, duration: 880, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(burnCardScale, { toValue: 0.9, duration: 800, useNativeDriver: true }),
      ]),
    ]).start(({ finished }) => {
      if (finished) afterBurn();
    });
  };

  // recall_perfect: трекинг при завершении сессии (один раз)
  // ВАЖНО: этот хук должен быть до любых условных return!
  useEffect(() => {
    if (!done) return;
    if (wrong === 0 && correct >= 5) {
      updateMultipleTaskProgress([{ type: 'recall_perfect', increment: 1 }]).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  // ─── Загрузка ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <ScreenGradient>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: t.textMuted, fontSize: f.body }}>
          {triLang(lang, { ru: 'Загрузка...', uk: 'Завантаження...', es: 'Cargando...' })}
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
            {triLang(lang, { ru: 'Повторение', uk: 'Повторення', es: 'Repaso' })}
          </Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ fontSize: 56, marginBottom: 16 }}>✅</Text>
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', textAlign: 'center' }}>
            {triLang(lang, {
              ru: 'Нечего повторять!',
              uk: 'Нічого повторювати!',
              es: '¡Nada que repasar por ahora!',
            })}
          </Text>
          <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', marginTop: 8, lineHeight: 22 }}>
            {triLang(lang, {
              ru: 'Допускай ошибки в уроках — они появятся здесь для повторения',
              uk: 'Допускай помилки в уроках — вони зʼявляться тут для повторення',
              es: 'Si te equivocas en las lecciones, aquí aparecerán frases para repasar.',
            })}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginTop: 32, backgroundColor: t.accent, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 }}
          >
            <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '700' }}>
              {triLang(lang, { ru: 'Назад', uk: 'Назад', es: 'Volver' })}
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
    const _rp = (a: string[]) => a[Math.floor(Math.random() * a.length)];
    const title = pct >= 80
      ? _rp(lang === 'es'
          ? ['¡Genial!', '¡Excelente!', '¡Eres una máquina!', '¡Así se hace!', '¡Fuerte! 💪']
          : lang === 'uk'
            ? ['Відмінно!', 'Чудово!', 'Ти машина!', 'Так тримати!', 'Мощно! 💪']
            : ['Отлично!', 'Великолепно!', 'Ты машина!', 'Так держать!', 'Мощно! 💪'])
      : pct >= 50
        ? _rp(lang === 'es'
            ? ['¡Bien!', '¡No está mal!', '¡Sigues mejorando!', '¡Un poco más y genial!']
            : lang === 'uk'
              ? ['Добре!', 'Непогано!', 'Зростаєш!', 'Ще трохи — і відмінно!']
              : ['Хорошо!', 'Неплохо!', 'Растёшь!', 'Ещё чуть-чуть — и отлично!'])
        : _rp(lang === 'es'
            ? ['¡Seguimos!', '¡No te rindas!', 'Repasa e inténtalo otra vez', '¡De los errores también se aprende! 📖']
            : lang === 'uk'
              ? ['Ще попрацюємо!', 'Не здавайся!', 'Повтори і спробуй ще раз!', 'Помилки — це досвід! 📖']
              : ['Ещё поработаем!', 'Не сдавайся!', 'Повтори и попробуй ещё раз!', 'Ошибки — это опыт! 📖']);

    return (
      <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>{emoji}</Text>
          <Text style={{ color: t.textPrimary, fontSize: f.numLg, fontWeight: '800', textAlign: 'center' }}>
            {title}
          </Text>
          <Text style={{ color: t.textSecond, fontSize: f.h2, fontWeight: '700', marginTop: 8 }}>
            {pct}%
          </Text>
          <View style={{ flexDirection: 'row', gap: 20, marginTop: 28 }}>
            <View style={{ alignItems: 'center', backgroundColor: t.correctBg, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 16 }}>
              <Text style={{ color: t.correct, fontSize: f.numLg, fontWeight: '800' }}>{correct}</Text>
              <Text style={{ color: t.correct, fontSize: f.caption, fontWeight: '600', marginTop: 2 }}>
                {triLang(lang, { ru: 'Верно', uk: 'Вірно', es: 'Aciertos' })}
              </Text>
            </View>
            <View style={{ alignItems: 'center', backgroundColor: t.wrongBg, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 16 }}>
              <Text style={{ color: t.wrong, fontSize: f.numLg, fontWeight: '800' }}>{wrong}</Text>
              <Text style={{ color: t.wrong, fontSize: f.caption, fontWeight: '600', marginTop: 2 }}>
                {triLang(lang, { ru: 'Ошибки', uk: 'Помилки', es: 'Errores' })}
              </Text>
            </View>
          </View>
          {totalXP > 0 && (
            <View style={{ marginTop: 20, backgroundColor: t.bgSurface, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12, alignItems: 'center' }}>
              <XpGainBadge amount={totalXP} visible={true} style={{ color: '#F5A623', fontSize: f.numMd, fontWeight: '800' }} />
              <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 2 }}>
                {triLang(lang, {
                  ru: 'заработано за повторение',
                  uk: 'зароблено за повторення',
                  es: 'XP obtenidas en Repaso',
                })}
              </Text>
            </View>
          )}
          <Text style={{ color: t.textMuted, fontSize: f.caption, textAlign: 'center', marginTop: 12, lineHeight: 18 }}>
            {triLang(lang, {
              ru: 'Фразы с ошибками вернутся завтра',
              uk: 'Фрази з помилками повернуться завтра',
              es: 'Las frases con errores volverán mañana',
            })}
          </Text>
          {/* router.back() → home.tsx обновит dueCount через focusTick → бейдж исчезнет */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginTop: 32, backgroundColor: t.accent, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 }}
          >
            <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '700' }}>
              {triLang(lang, { ru: 'Готово', uk: 'Готово', es: 'Listo' })}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      </ScreenGradient>
    );
  }

  // ─── Основной экран: плиточная сессия ────────────────────────────────────
  const safeIdx = Math.max(0, Math.min(index, items.length - 1));
  const item = items[safeIdx] ?? items[items.length - 1];
  if (!item) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center' }}>
            {triLang(lang, {
              ru: 'Не удалось загрузить карточку. Нажми «Назад» и попробуй снова.',
              uk: 'Не вдалося завантажити картку. Натисни «Назад» і спробуй ще раз.',
              es: 'No se pudo cargar la tarjeta. Pulsa «Atrás» e inténtalo de nuevo.',
            })}
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 24, padding: 14 }}>
            <Text style={{ color: t.accent, fontSize: f.body, fontWeight: '700' }}>
              {triLang(lang, { ru: 'Назад', uk: 'Назад', es: 'Volver' })}
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </ScreenGradient>
    );
  }
  const answerBorderColor = status === 'result' ? (wasCorrect ? t.correct : t.wrong) : t.border;
  const answerBg          = status === 'result' ? (wasCorrect ? t.correctBg : t.wrongBg) : t.bgSurface;

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
            {triLang(lang, { ru: 'Повторение', uk: 'Повторення', es: 'Repaso' })}
          </Text>
        </View>
        <Text style={{ color: t.textMuted, fontSize: f.body, fontWeight: '600' }}>
          {index + 1} / {items.length}
        </Text>
      </View>

      {/* Прогресс-бар */}
      <View style={{ height: 4, backgroundColor: t.bgSurface, marginHorizontal: 16, borderRadius: 2, marginBottom: 20 }}>
        <View style={{
          width: `${(Math.max(1, index + 1) / items.length) * 100}%` as any,
          height: '100%', borderRadius: 2, backgroundColor: t.accent,
        }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Источник: урок / квиз / арена / … */}
        <Text style={{ color: t.textMuted, fontSize: f.caption, marginBottom: 12 }}>
          {recallOriginCaption(item, lang)}
        </Text>

        {/* Весь контент карточки анимируется при переходе (slideAnim) */}
        <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>


          {/* Карточка с переводом — то что нужно составить */}
          <Animated.View
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
              transform: [{ scale: burnCardScale }],
            }}
          >
            <Animated.View style={{ opacity: burnTextOp, zIndex: 1, alignItems: 'center' }}>
              <Text style={{ color: t.textMuted, fontSize: f.caption, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                {triLang(lang, { ru: 'Составьте фразу', uk: 'Складіть фразу', es: 'Forma la frase' })}
              </Text>
              <Text style={{ color: t.textPrimary, fontSize: f.h1, fontWeight: '700', textAlign: 'center', lineHeight: 30 }}>
                {recallTranslationHint(item, lang)}
              </Text>
            </Animated.View>
            {burning && (
              <BurnCardEffect width={cardLayout.width} height={cardLayout.height} borderRadius={20} />
            )}
          </Animated.View>

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
            {mode === 'build' && (
              <>
                {selected.length === 0 && status === 'playing' && (
                  <Text style={{ color: t.textGhost, fontSize: f.body, alignSelf: 'center' }}>
                    {triLang(lang, {
                      ru: 'Здесь появятся слова...',
                      uk: 'Тут з\'являться слова...',
                      es: 'Las palabras aparecerán aquí...',
                    })}
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
              </>
            )}
          </View>

          {item && (
            <ReportErrorButton
              screen="review"
              dataId={`review_${item.phrase.replace(/\s+/g,'_').slice(0,40)}`}
              dataText={[
                `EN: ${item.phrase}`,
                `RU: ${item.correctAnswer}`,
                item.correctAnswerUK ? `UK: ${item.correctAnswerUK}` : '',
                item.correctAnswerES ? `ES: ${item.correctAnswerES}` : '',
                `Урок: ${item.lessonId}`,
              ].filter(Boolean).join('\n')}
              style={{ alignSelf: 'flex-end', marginBottom: 4 }}
            />
          )}

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
                {triLang(lang, {
                  ru: 'Правильный ответ:',
                  uk: 'Правильна відповідь:',
                  es: 'Respuesta correcta:',
                })}
              </Text>
              <Text style={{ color: t.correct, fontSize: f.bodyLg, fontWeight: '600' }}>
                {item.phrase}
              </Text>
            </Animated.View>
          )}

          {mode === 'build' && (
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
                    borderWidth: 1,
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
          )}

        </Animated.View>
      </ScrollView>

      {/* Кнопки "Далее" и "Сжечь" — появляются после ответа */}
      {status === 'result' && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8, gap: 10 }}>
          {/* Кнопка "Сжечь" — только если правильно за 20 секунд */}
          {canBurn && (
            <>
              {shouldShowBurnHint && (
                <Animated.Text
                  style={{
                    color: '#FFB38A',
                    fontSize: f.caption,
                    textAlign: 'center',
                    opacity: burnHintAnim,
                    transform: [
                      {
                        translateY: burnHintAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [6, 0],
                        }),
                      },
                    ],
                  }}
                >
                  {triLang(lang, {
                    ru: 'Если сжечь карточку — она больше не появится в повторении',
                    uk: 'Якщо спалити картку — вона більше не зʼявиться у повторенні',
                    es: 'Si quemas la tarjeta, no volverá a aparecer en el repaso',
                  })}
                </Animated.Text>
              )}
              <TouchableOpacity
                onPress={burnCard}
                disabled={burning}
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
                <Text style={{ fontSize: f.bodyLg }}>🔥</Text>
                <Text style={{ color: '#FF6B2B', fontSize: f.bodyLg, fontWeight: '700' }}>
                  {triLang(lang, {
                    ru: 'Сжечь карточку',
                    uk: 'Спалити картку',
                    es: 'Quemar tarjeta',
                  })}
                </Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            onPress={advanceCard}
            disabled={burning}
            style={{
              backgroundColor: wasCorrect ? t.correct : t.accent,
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: t.correctText, fontSize: f.bodyLg, fontWeight: '700' }}>
              {triLang(lang, { ru: 'Далее →', uk: 'Далі →', es: 'Siguiente →' })}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
    </ScreenGradient>
  );
}
