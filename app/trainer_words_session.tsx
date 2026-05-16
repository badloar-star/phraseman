// ═══════════════════════════════════════════════════════════════════════════
// trainer_words_session.tsx — Сессия слов: свайп-карточки верно/неверно
//
// Карточка показывает английское слово + перевод (верный или ложный).
// Свайп вправо = "Верно", влево = "Неверно".
// Ложный перевод подбирается из слов того же урока — всегда похожий.
// ═══════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import { triLang } from '../constants/i18n';
import { screenTextOnGradient } from '../constants/theme';
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import {
  getDueItems,
  markTrainerResult,
  type TrainerItem,
} from './trainer_store';
import { updateMultipleTaskProgress, type TaskType } from './daily_tasks';
import { consumeTrainerSessionEntry } from './trainer_session';
import { logTrainerDirectGateBlocked } from './firebase';
import TrainerSessionReport from './trainer_session_report';

const { width: SCREEN_W } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_W * 0.3;
const SWIPE_OUT_DURATION = 220;

// ── Подбор ложного перевода ──────────────────────────────────────────────────
// Все переводы слов из lesson_data — плоский список для выбора похожего.
// Импортируем динамически чтобы не тащить весь контент при старте.
async function pickDecoyTranslation(
  correctRu: string,
  allItems: TrainerItem[],
): Promise<string> {
  // Берём переводы других слов из очереди
  const pool = allItems
    .filter(i => i.translationRu !== correctRu && i.translationRu)
    .map(i => i.translationRu);

  if (pool.length === 0) return correctRu; // нечего взять — вернём правильный (edge case)

  // Случайный из пула
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Типы ─────────────────────────────────────────────────────────────────────
interface CardData {
  item: TrainerItem;
  shownTranslation: string;
  isCorrectTranslation: boolean;
}

// ── Компонент одной карточки ─────────────────────────────────────────────────
interface SwipeCardProps {
  card: CardData;
  onSwipe: (correct: boolean) => void;
  isTop: boolean;
  swipeOutRef: React.MutableRefObject<((dir: 'right' | 'left') => void) | null>;
}

function SwipeCard({ card, onSwipe, isTop, swipeOutRef }: SwipeCardProps) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const position = useRef(new Animated.ValueXY()).current;

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_W / 2, 0, SCREEN_W / 2],
    outputRange: ['-8deg', '0deg', '8deg'],
    extrapolate: 'clamp',
  });

  const correctOpacity = position.x.interpolate({
    inputRange: [0, SCREEN_W * 0.25],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const wrongOpacity = position.x.interpolate({
    inputRange: [-SCREEN_W * 0.25, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Используем refs для актуальных значений в panResponder (избегаем stale closure)
  const cardRef = useRef(card);
  cardRef.current = card;
  const onSwipeRef = useRef(onSwipe);
  onSwipeRef.current = onSwipe;
  const isTopRef = useRef(isTop);
  isTopRef.current = isTop;

  const swipeOut = useCallback((dir: 'right' | 'left') => {
    const toX = dir === 'right' ? SCREEN_W * 1.5 : -SCREEN_W * 1.5;
    const answeredCorrectly = (dir === 'right') === cardRef.current.isCorrectTranslation;
    if (answeredCorrectly) hapticSuccess(); else hapticError();
    Animated.timing(position, {
      toValue: { x: toX, y: 0 },
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: true,
    }).start(() => onSwipeRef.current(answeredCorrectly));
  }, [position]);

  // Экспортируем swipeOut наружу чтобы кнопки могли вызвать анимацию
  useEffect(() => {
    swipeOutRef.current = swipeOut;
    return () => { swipeOutRef.current = null; };
  }, [swipeOut, swipeOutRef]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isTopRef.current,
      onPanResponderMove: (_, g) => {
        position.setValue({ x: g.dx, y: g.dy * 0.2 });
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx > SWIPE_THRESHOLD) swipeOut('right');
        else if (g.dx < -SWIPE_THRESHOLD) swipeOut('left');
        else {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
            friction: 5,
          }).start();
        }
      },
    }),
  ).current;

  const cardStyle = {
    transform: [
      { translateX: position.x },
      { translateY: position.y },
      { rotate },
    ],
  };

  return (
    <Animated.View
      style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border }, cardStyle]}
      {...(isTop ? panResponder.panHandlers : {})}
    >
      {/* Верно оверлей */}
      <Animated.View style={[styles.decisionLabel, styles.correctLabel, { opacity: correctOpacity }]}>
        <Text style={styles.decisionText}>✓ {triLang(lang, { ru: 'ВЕРНО', uk: 'ВІРНО', es: 'CORRECTO' })}</Text>
      </Animated.View>

      {/* Неверно оверлей */}
      <Animated.View style={[styles.decisionLabel, styles.wrongLabel, { opacity: wrongOpacity }]}>
        <Text style={styles.decisionText}>✗ {triLang(lang, { ru: 'НЕВЕРНО', uk: 'НЕВІРНО', es: 'INCORRECTO' })}</Text>
      </Animated.View>

      {/* Слово */}
      <Text style={[styles.wordEn, { color: t.textPrimary, fontSize: f.h1 }]}>
        {card.item.key}
      </Text>

      {/* Разделитель */}
      <View style={[styles.divider, { backgroundColor: t.border }]} />

      {/* Перевод (верный или ложный) */}
      <Text style={[styles.wordRu, { color: t.textMuted, fontSize: f.bodyLg }]}>
        {lang === 'uk' ? card.item.translationUk || card.shownTranslation : card.shownTranslation}
      </Text>

    </Animated.View>
  );
}

// ── Основной экран ────────────────────────────────────────────────────────────
export default function TrainerWordsSession() {
  const router = useRouter();
  const { theme: t, f, themeMode } = useTheme();
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const { lang } = useLang();

  const [deck, setDeck] = useState<CardData[]>([]);
  const [current, setCurrent] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accessReady, setAccessReady] = useState(false);
  const allItemsRef = useRef<TrainerItem[]>([]);
  const dailySessionTracked = useRef(false);
  // Ref к функции swipeOut текущей карточки — для кнопок
  const swipeOutRef = useRef<((dir: 'right' | 'left') => void) | null>(null);

  useEffect(() => {
    void (async () => {
      const allowed = await consumeTrainerSessionEntry('/trainer_words_session');
      if (!allowed) {
        logTrainerDirectGateBlocked('/trainer_words_session');
        router.replace({ pathname: '/premium_modal', params: { context: 'trainer_limit' } } as any);
        return;
      }
      setAccessReady(true);
      const items = await getDueItems('words', 20);
      allItemsRef.current = items;
      if (items.length === 0) { setDone(true); setLoading(false); return; }

      // Строим колоду: каждая карточка имеет ~50% шанс ложного перевода
      const cards: CardData[] = await Promise.all(
        items.map(async (item) => {
          const showCorrect = Math.random() > 0.5;
          const shownTranslation = showCorrect
            ? item.translationRu
            : await pickDecoyTranslation(item.translationRu, items);
          return {
            item,
            shownTranslation,
            isCorrectTranslation: showCorrect || shownTranslation === item.translationRu,
          };
        }),
      );
      setDeck(cards);
      setLoading(false);
    })();
  }, [router]);

  const handleSwipe = useCallback(async (answeredCorrectly: boolean) => {
    const card = deck[current];
    if (!card) return;

    const nextWrong = wrong + (answeredCorrectly ? 0 : 1);
    if (answeredCorrectly) setCorrect(c => c + 1);
    else setWrong(c => c + 1);

    await markTrainerResult(card.item.key, 'words', answeredCorrectly);
    const updates: { type: TaskType; increment: number }[] = [];
    if (!dailySessionTracked.current) {
      dailySessionTracked.current = true;
      updates.push({ type: 'recall_session', increment: 1 });
    }
    if (answeredCorrectly) {
      updates.push({ type: 'recall_answers', increment: 1 });
      updates.push({ type: 'trainer_words', increment: 1 });
    }

    const next = current + 1;
    if (next >= deck.length) {
      if (deck.length >= 5 && nextWrong === 0) updates.push({ type: 'recall_perfect', increment: 1 });
      setDone(true);
    } else {
      setCurrent(next);
    }
    if (updates.length > 0) updateMultipleTaskProgress(updates).catch(() => {});
  }, [deck, current, wrong]);

  const handleButton = useCallback((dir: 'right' | 'left') => {
    hapticTap();
    // Запускаем анимацию карточки через ref — она сама вызовет handleSwipe по завершении
    swipeOutRef.current?.(dir);
  }, []);

  if (!accessReady || loading) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#888' }} />
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  if (done) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            <TrainerSessionReport
              queue="words"
              correct={correct}
              wrong={wrong}
              total={deck.length || correct + wrong}
              accent="#4A9EFF"
              onDone={() => { hapticTap(); router.back(); }}
              onPracticeMore={() => { hapticTap(); router.replace('/trainer' as any); }}
            />
          </ContentWrap>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => { hapticTap(); router.back(); }} style={{ padding: 4 }}>
              <Ionicons name="chevron-back" size={28} color={sx.primary} />
            </TouchableOpacity>
            <Text style={[{ color: sx.muted, fontSize: f.caption }]}>
              {current + 1} / {deck.length}
            </Text>
          </View>

          {/* Прогресс-бар */}
          <View style={[styles.progressBar, { backgroundColor: t.bgSurface }]}>
            <View style={[styles.progressFill, { backgroundColor: '#4A9EFF', width: `${((current) / deck.length) * 100}%` }]} />
          </View>

          {/* Стек карточек */}
          <View style={styles.deckContainer}>
            {/* Показываем следующую карточку под текущей */}
            {deck[current + 1] && (
              <View style={[styles.card, styles.cardBack, { backgroundColor: t.bgCard, borderColor: t.border }]} />
            )}
            {deck[current] && (
              <SwipeCard
                key={current}
                card={deck[current]}
                onSwipe={handleSwipe}
                isTop
                swipeOutRef={swipeOutRef}
              />
            )}
          </View>

          {/* Кнопки */}
          <View style={styles.buttons}>
            <TouchableOpacity
              onPress={() => handleButton('left')}
              style={[styles.btn, styles.btnWrong, { borderColor: '#E05050' + '66' }]}
            >
              <Ionicons name="close" size={32} color="#E05050" />
              <Text style={[styles.btnLabel, { color: '#E05050', fontSize: f.caption }]}>
                {triLang(lang, { ru: 'Неверно', uk: 'Невірно', es: 'Incorrecto' })}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleButton('right')}
              style={[styles.btn, styles.btnCorrect, { borderColor: '#40C080' + '66' }]}
            >
              <Ionicons name="checkmark" size={32} color="#40C080" />
              <Text style={[styles.btnLabel, { color: '#40C080', fontSize: f.caption }]}>
                {triLang(lang, { ru: 'Верно', uk: 'Вірно', es: 'Correcto' })}
              </Text>
            </TouchableOpacity>
          </View>

        </ContentWrap>
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
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginHorizontal: 16,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  deckContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  card: {
    position: 'absolute',
    width: SCREEN_W - 48,
    borderRadius: 24,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  cardBack: {
    position: 'absolute',
    transform: [{ scale: 0.96 }, { translateY: 12 }],
    opacity: 0.6,
  },
  wordEn: { fontWeight: '900', textAlign: 'center', marginBottom: 16 },
  divider: { width: 48, height: 1, marginBottom: 16 },
  wordRu: { fontWeight: '600', textAlign: 'center', marginBottom: 24 },
  hint: { textAlign: 'center', lineHeight: 18 },
  decisionLabel: {
    position: 'absolute',
    top: 24,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 2,
  },
  correctLabel: { right: 20, borderColor: '#40C080', transform: [{ rotate: '15deg' }] },
  wrongLabel:   { left: 20,  borderColor: '#E05050', transform: [{ rotate: '-15deg' }] },
  decisionText: { fontSize: 16, fontWeight: '900' },
  buttons: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 18,
    borderWidth: 1.5,
    paddingVertical: 14,
  },
  btnWrong:   { backgroundColor: '#E05050' + '11' },
  btnCorrect: { backgroundColor: '#40C080' + '11' },
  btnLabel: { fontWeight: '700' },
  doneContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  doneTitle: { fontWeight: '800', marginBottom: 24, textAlign: 'center' },
  doneStats: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: 32,
    width: '100%',
  },
  doneStat: { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 4 },
  doneStatDivider: { width: StyleSheet.hairlineWidth },
  doneStatNum: { fontWeight: '900' },
  doneStatLabel: { fontWeight: '600' },
  doneBtn: {
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 14,
    width: '100%',
  },
  doneBtnText: { color: '#fff', fontWeight: '800' },
});
