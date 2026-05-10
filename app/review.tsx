/**
 * ═══════════════════════════════════════════════════════════════════════════
 * REVIEW SCREEN — Экран интервального повторения (SRS-сессия)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Три живых формата:
 *   • Банк слов — только слова этой фразы, тап по порядку (без лишних плиток).
 *   • Смысл — видно по-английски, выбери верный перевод из 4.
 *   • Вспоминание — видно перевод, набери всю фразу на английском.
 *
 * Откуда берутся данные:
 *   lesson1.tsx → checkAnswer() → recordMistake(phrase.english, phrase.russian, lessonId)
 *   → active_recall.ts сохраняет фразу в AsyncStorage ('active_recall_items')
 *   → getDueItems(SESSION_LIMIT, { commitSessionOverflow: true }) — сессия + перенос перегруза на завтра
 *
 * Свайп по карточке с переводом — переключение фразы сессии до ответа.
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState, AppStateStatus, Animated, Dimensions, Easing as SlideEasing, ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
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
import { useStudyTarget } from '../components/StudyTargetContext';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import XpGainBadge from '../components/XpGainBadge';
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import {
  getDueItems, markReviewed, RecallItem, removeItem, SESSION_LIMIT,
  getTrainerItems, type TrainerMode,
} from './active_recall';
import { logMistake } from './mistake_log';
import { updateMultipleTaskProgress } from './daily_tasks';
import { registerXP } from './xp_manager';
import ReportErrorButton from '../components/ReportErrorButton';
import {
  buildMeaningOptions,
  evaluateRecallAnswer,
  meaningChoiceIsCorrect,
  pickReviewMode,
  ReviewMode,
  shuffleWordBankTiles,
  tokenizeRecallPhrase,
  type WordBankTile,
} from './review_evaluator';
import { spanishLessonUiStringsActive, spanishSurfacesEnabled } from './spanish_content_gate';
import type { StudyTargetLang } from './study_target_lang_dev';
import { englishRecallSurface } from './phrase_target_utils';
import { checkCoachToastNeeded, type CoachToastDecision } from './coach_toast_trigger';
import CoachToast from '../components/CoachToast';

const { width: SCREEN_W } = Dimensions.get('window');

const CONTENT_W = Math.min(SCREEN_W, 640);
/** Одна страница свайпа подсказки (padding по 16 px у родительского ScrollView). */
const CUE_PAGER_PAGE_W = SCREEN_W - 32;
const REVIEW_BURN_HINT_SHOWN_KEY = 'review_burn_hint_shown_v1';

/** Подсказка на карточке: ES только при изучении ES + UI es (dev). */
function recallTranslationHint(item: RecallItem, lang: Lang, studyTarget: StudyTargetLang): string {
  if (spanishLessonUiStringsActive(lang, studyTarget)) return item.correctAnswerES ?? item.correctAnswer;
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

function recallCueInstruction(mode: ReviewMode, lang: Lang): string {
  if (mode === 'word_bank') {
    return triLang(lang, {
      ru: 'Соберите фразу: жмите слова по порядку',
      uk: 'Зберіть фразу: натискайте слова по порядку',
      es: 'Forma la frase: toca las palabras en orden',
    });
  }
  if (mode === 'meaning_match') {
    return triLang(lang, {
      ru: 'Что это значит? Выберите перевод',
      uk: 'Що це значить? Оберіть переклад',
      es: '¿Qué significa? Elige la traducción',
    });
  }
  return triLang(lang, {
    ru: 'Вспомните и напишите по-английски',
    uk: 'Згадайте і напишіть англійською',
    es: 'Recuerda y escribe en inglés',
  });
}

type Status = 'playing' | 'result';

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
  const { studyTarget } = useStudyTarget();
  // trainerMode и lessonId передаются из trainer.tsx при старте режимной сессии.
  const params = useLocalSearchParams<{ trainerMode?: string; lessonId?: string; category?: string }>();
  const trainerMode = (params.trainerMode ?? 'due') as TrainerMode;
  const trainerLessonId = params.lessonId ? parseInt(params.lessonId, 10) : undefined;
  const trainerCategory = params.category;

  // Данные сессии
  const [items,   setItems]   = useState<RecallItem[]>([]);
  const [index,   setIndex]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [done,      setDone]      = useState(false);
  const [correct,   setCorrect]   = useState(0);
  const [wrong,     setWrong]     = useState(0);
  const [totalXP,   setTotalXP]   = useState(0);
  const [coachToast, setCoachToast] = useState<CoachToastDecision | null>(null);
  const wrongPhrasesRef = useRef<string[]>([]);

  // Состояние текущей карточки (без плиточной сборки)
  const [mode, setMode]           = useState<ReviewMode>('word_bank');
  const [bankTiles, setBankTiles] = useState<WordBankTile[]>([]);
  const [nextSlot, setNextSlot]   = useState(0);
  const [meaningOptions, setMeaningOptions] = useState<string[]>([]);
  const [typeText, setTypeText]   = useState('');
  const [pickedChoice, setPickedChoice] = useState<string | null>(null);
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
  const cuePagerRef = useRef<ScrollView | null>(null);
  /** После свайпа пользователем — не дёргаем scrollTo из useEffect (уже на месте). */
  const cuePagerSkipSyncScroll = useRef(false);
  const swipeHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [swipeCueHintVisible, setSwipeCueHintVisible] = useState(false);

  const swipeCueHintEligible =
    !loading && items.length > 1 && status === 'playing' && !burning;

  useEffect(() => {
    if (!swipeCueHintEligible) {
      if (swipeHintTimerRef.current) {
        clearTimeout(swipeHintTimerRef.current);
        swipeHintTimerRef.current = null;
      }
      return;
    }
    setSwipeCueHintVisible(true);
    swipeHintTimerRef.current = setTimeout(() => {
      setSwipeCueHintVisible(false);
      swipeHintTimerRef.current = null;
    }, 4000);
    return () => {
      if (swipeHintTimerRef.current) {
        clearTimeout(swipeHintTimerRef.current);
        swipeHintTimerRef.current = null;
      }
    };
  }, [swipeCueHintEligible]);

  // Инициализирует задание для карточки (пропуск / выбор / ввод)
  const loadCard = useCallback((item: RecallItem, itemIndex: number, poolItems: RecallItem[]) => {
    checkingRef.current = false;
    const nextMode = pickReviewMode(params.trainerMode, itemIndex, item.phrase);
    setMode(nextMode);
    setPickedChoice(null);
    setTypeText('');
    const poolTrans = poolItems.map(it => recallTranslationHint(it, lang, studyTarget));
    const correctTrans = recallTranslationHint(item, lang, studyTarget);
    if (nextMode === 'word_bank') {
      setBankTiles(shuffleWordBankTiles(item.phrase));
      setNextSlot(0);
      setMeaningOptions([]);
    } else if (nextMode === 'meaning_match') {
      setBankTiles([]);
      setMeaningOptions(buildMeaningOptions(correctTrans, poolTrans));
    } else {
      setBankTiles([]);
      setMeaningOptions([]);
    }
    setStatus('playing');
    setWasCorrect(false);
    setCanBurn(false);
    setBurning(false);
    resultAnim.setValue(0);
    burnTextOp.setValue(1);
    burnCardScale.setValue(1);
    cardStartTime.current = Date.now();
  }, [params.trainerMode, lang, studyTarget, resultAnim, burnTextOp, burnCardScale]);

  // Загружаем фразы для повторения сегодня (один раз при монтировании)
  useEffect(() => {
    const timerRef = autoTimer;
    AsyncStorage.getItem(REVIEW_BURN_HINT_SHOWN_KEY)
      .then(v => setBurnHintSeen(v === '1'))
      .catch(() => setBurnHintSeen(true));
    // Когда запускаем из trainer.tsx с trainerMode — используем getTrainerItems.
    // Стандартный /review без params грузит «due» с commitSessionOverflow.
    const itemsPromise = params.trainerMode
      ? getTrainerItems(trainerMode, SESSION_LIMIT, trainerLessonId, trainerCategory)
      : getDueItems(SESSION_LIMIT, { commitSessionOverflow: true });
    itemsPromise.then(due => {
      setItems(due);
      setLoading(false);
      if (due.length > 0) loadCard(due[0], 0, due);
    });
    AsyncStorage.getItem('user_name').then(n => { userNameRef.current = n; }).catch(() => {});
    return () => {
      const timer = timerRef.current;
      if (timer) clearTimeout(timer);
    };
  }, [loadCard, params.trainerMode, trainerLessonId, trainerCategory, trainerMode]);

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

  useEffect(() => {
    if (loading || items.length === 0) return;
    if (cuePagerSkipSyncScroll.current) {
      cuePagerSkipSyncScroll.current = false;
      return;
    }
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    const x = clamped * CUE_PAGER_PAGE_W;
    requestAnimationFrame(() => {
      cuePagerRef.current?.scrollTo({ x, animated: false });
    });
  }, [loading, items.length, index]);

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

  const onCuePagerMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (items.length <= 1) return;
      if (status !== 'playing' || burning) return;
      const page = Math.round(e.nativeEvent.contentOffset.x / CUE_PAGER_PAGE_W);
      const clamped = Math.max(0, Math.min(page, items.length - 1));
      if (clamped === index) return;
      hapticTap();
      cuePagerSkipSyncScroll.current = true;
      setIndex(clamped);
      loadCard(items[clamped]!, clamped, items);
    },
    [items, index, status, burning, loadCard],
  );

  const finishCard = useCallback((ok: boolean, userPick: string | null) => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    const item = items[index];
    if (!item) {
      checkingRef.current = false;
      return;
    }
    setPickedChoice(userPick);
    setWasCorrect(ok);
    setStatus('result');

    if (ok) void hapticSuccess();
    else void hapticError();

    Animated.spring(resultAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();

    if (ok) {
      setCorrect(c => c + 1);
    } else {
      setWrong(w => w + 1);
    }

    markReviewed(item.phrase, ok).catch(() => {});
    if (!ok) {
      if (trainerMode !== 'mistakes') {
        logMistake(item.phrase, item.lessonId, 'trainer', 'wrong_pick');
      }
      wrongPhrasesRef.current.push(item.phrase);
    }

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
      updateMultipleTaskProgress([{ type: 'recall_answers', increment: 1 }]).catch(() => {});
    }

    checkingRef.current = false;
  }, [items, index, lang, resultAnim, trainerMode]);

  const onWordBankTap = useCallback((tile: WordBankTile) => {
    if (status !== 'playing' || burning) return;
    const item = items[index];
    if (!item) return;
    const n = tokenizeRecallPhrase(item.phrase).length;
    if (tile.slot !== nextSlot) {
      hapticTap();
      finishCard(false, tile.text);
      return;
    }
    hapticTap();
    if (nextSlot + 1 >= n) {
      finishCard(true, null);
    } else {
      setNextSlot(s => s + 1);
      setBankTiles(prev => prev.filter(t => t.slot !== tile.slot));
    }
  }, [status, burning, items, index, nextSlot, finishCard]);

  const onMeaningPick = useCallback((choice: string) => {
    if (status !== 'playing' || burning) return;
    hapticTap();
    const item = items[index];
    if (!item) return;
    const correct = recallTranslationHint(item, lang, studyTarget);
    const ok = meaningChoiceIsCorrect(choice, correct);
    finishCard(ok, choice);
  }, [status, burning, items, index, lang, studyTarget, finishCard]);

  const onSubmitTyped = useCallback(() => {
    if (status !== 'playing' || burning || mode !== 'recall_type') return;
    hapticTap();
    const item = items[index];
    if (!item) return;
    const { ok } = evaluateRecallAnswer(typeText, item.phrase);
    finishCard(ok, typeText.trim() || null);
  }, [status, burning, mode, items, index, typeText, finishCard]);

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
    // Проверяем нужен ли тост Problem Coach
    const decision = checkCoachToastNeeded(wrongPhrasesRef.current);
    if (decision.show) setCoachToast(decision);
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
      {coachToast?.show && (
        <CoachToast
          category={coachToast.category}
          labelRu={coachToast.labelRu}
          labelUk={coachToast.labelUk}
          labelEs={coachToast.labelEs}
          mistakeCount={coachToast.mistakeCount}
          onDismiss={() => setCoachToast(null)}
        />
      )}
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
  const typeBorderColor = status === 'result' ? (wasCorrect ? t.correct : t.wrong) : t.border;
  const typeBg          = status === 'result' ? (wasCorrect ? t.correctBg : t.wrongBg) : t.bgSurface;

  const correctTrans = recallTranslationHint(item, lang, studyTarget);
  const mcOptionStyle = (opt: string) => {
    if (status !== 'result' || pickedChoice == null) {
      return { bg: t.bgCard, border: t.border, color: t.textPrimary, opacity: 1 as number };
    }
    const isAnswer = meaningChoiceIsCorrect(opt, correctTrans);
    const isUser = opt.trim().toLowerCase() === (pickedChoice ?? '').trim().toLowerCase();
    if (isAnswer) {
      return { bg: t.correctBg, border: t.correct, color: t.correct, opacity: 1 as number };
    }
    if (isUser && !wasCorrect) {
      return { bg: t.wrongBg, border: t.wrong, color: t.wrong, opacity: 1 as number };
    }
    return { bg: t.bgSurface, border: t.border, color: t.textMuted, opacity: 0.45 as number };
  };

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


          {/* Карточки подсказок: горизонтальный свайп = выбор фразы сессии (до ответа). */}
          <View style={{ marginBottom: 20 }}>
            <ScrollView
              ref={cuePagerRef}
              horizontal
              pagingEnabled
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              scrollEnabled={status === 'playing' && !burning && items.length > 1}
              decelerationRate="fast"
              keyboardShouldPersistTaps="handled"
              onMomentumScrollEnd={onCuePagerMomentumEnd}
            >
              {items.map((it, i) => {
                const pageMode = pickReviewMode(params.trainerMode, i, it.phrase);
                return (
                <View
                  key={`cue-${it.lessonId}-${englishRecallSurface(it.phrase)}-${i}`}
                  style={{ width: CUE_PAGER_PAGE_W }}
                >
                  <Animated.View
                    onLayout={
                      i === index
                        ? e =>
                            setCardLayout({
                              width: e.nativeEvent.layout.width,
                              height: e.nativeEvent.layout.height,
                            })
                        : undefined
                    }
                    style={{
                      backgroundColor: t.bgCard,
                      borderRadius: 20,
                      padding: 28,
                      minHeight: 110,
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderWidth: 0.5,
                      borderColor: t.border,
                      overflow: 'hidden',
                      ...(i === index ? { transform: [{ scale: burnCardScale }] } : {}),
                    }}
                  >
                    <Animated.View style={{ opacity: i === index ? burnTextOp : 1, zIndex: 1, alignItems: 'center' }}>
                      <Text style={{ color: t.textMuted, fontSize: f.caption, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                        {recallCueInstruction(pageMode, lang)}
                      </Text>
                      <Text style={{ color: t.textPrimary, fontSize: f.h1, fontWeight: '700', textAlign: 'center', lineHeight: 30 }}>
                        {pageMode === 'meaning_match'
                          ? englishRecallSurface(it.phrase)
                          : recallTranslationHint(it, lang, studyTarget)}
                      </Text>
                    </Animated.View>
                    {i === index && burning && (
                      <BurnCardEffect width={cardLayout.width} height={cardLayout.height} borderRadius={20} />
                    )}
                  </Animated.View>
                </View>
              );
              })}
            </ScrollView>
            {swipeCueHintEligible && swipeCueHintVisible && (
              <Text style={{ color: t.textGhost, fontSize: f.caption, textAlign: 'center', marginTop: 8 }}>
                {triLang(lang, {
                  ru: 'Свайпните карточку влево или вправо, чтобы выбрать другую фразу',
                  uk: 'Свайніть картку вліво або вправо, щоб обрати іншу фразу',
                  es: 'Desliza la tarjeta para elegir otra frase',
                })}
              </Text>
            )}
          </View>

          {/* Задание: банк слов / выбор перевода / ввод */}
          {mode === 'word_bank' && bankTiles.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16, justifyContent: 'center' }}>
              {bankTiles.map(tile => (
                <TouchableOpacity
                  key={`wb-${tile.slot}`}
                  onPress={() => onWordBankTap(tile)}
                  disabled={status !== 'playing'}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: t.bgCard,
                    borderRadius: 14,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderWidth: 1.5,
                    borderColor: t.border,
                    opacity: status === 'playing' ? 1 : 0.4,
                  }}
                >
                  <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700' }}>
                    {tile.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {mode === 'meaning_match' && meaningOptions.length > 0 && (
            <View style={{ gap: 10, marginBottom: 16 }}>
              {meaningOptions.map((opt, j) => {
                const st = mcOptionStyle(opt);
                return (
                  <TouchableOpacity
                    key={`mean-${j}-${opt.slice(0, 20)}`}
                    onPress={() => onMeaningPick(opt)}
                    disabled={status !== 'playing'}
                    activeOpacity={0.85}
                    style={{
                      backgroundColor: st.bg,
                      borderRadius: 14,
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      borderWidth: 1.5,
                      borderColor: st.border,
                      opacity: st.opacity,
                    }}
                  >
                    <Text style={{ color: st.color, fontSize: f.body, fontWeight: '600', textAlign: 'left', lineHeight: 22 }}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {mode === 'recall_type' && (
            <View style={{ marginBottom: 16 }}>
              <TextInput
                value={typeText}
                onChangeText={setTypeText}
                editable={status === 'playing'}
                placeholder={triLang(lang, { ru: 'Введите ответ…', uk: 'Введіть відповідь…', es: 'Escribe la respuesta…' })}
                placeholderTextColor={t.textGhost}
                autoCapitalize="sentences"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={onSubmitTyped}
                style={{
                  borderWidth: 1.5,
                  borderColor: typeBorderColor,
                  backgroundColor: typeBg,
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: f.bodyLg,
                  color: t.textPrimary,
                  marginBottom: 12,
                }}
              />
              {status === 'playing' && (
                <TouchableOpacity
                  onPress={onSubmitTyped}
                  activeOpacity={0.88}
                  style={{
                    backgroundColor: t.accent,
                    borderRadius: 14,
                    paddingVertical: 14,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: t.correctText, fontSize: f.bodyLg, fontWeight: '700' }}>
                    {triLang(lang, { ru: 'Проверить', uk: 'Перевірити', es: 'Comprobar' })}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {item && (
            <ReportErrorButton
              screen="review"
              dataId={`review_${englishRecallSurface(item.phrase).replace(/\s+/g,'_').slice(0,40)}`}
              dataText={[
                `EN: ${englishRecallSurface(item.phrase)}`,
                `RU: ${item.correctAnswer}`,
                item.correctAnswerUK ? `UK: ${item.correctAnswerUK}` : '',
                item.correctAnswerES && spanishSurfacesEnabled(lang, studyTarget)
                  ? `ES: ${item.correctAnswerES}`
                  : '',
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
                {englishRecallSurface(item.phrase)}
              </Text>
            </Animated.View>
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
