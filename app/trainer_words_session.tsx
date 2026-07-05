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
import TapScale from '../components/TapScale';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import CompassDepthSurface from '../components/CompassDepthSurface';
import GradientProgressBar from '../components/GradientProgressBar';
import { TrainerLoadingView, TrainerErrorView } from '../components/TrainerLoadStates';
import { triLang, type Lang } from '../constants/i18n';
import { monoIcon, MONO_ICON } from '../constants/monoIcon';
import { screenTextOnGradient } from '../constants/theme';
import { COMPASS_RICH, compassShadow } from '../constants/compassTheme';
import type { ThemeMode } from '../constants/theme';
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import {
  getDueItems,
  getTrainerPremiumItemsForPlanQueue,
  markTrainerResult,
  trainerTranslationForLang,
  type TrainerItem,
} from './trainer_store';
import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back';
import { updateMultipleTaskProgress, type TaskType } from './daily_tasks';
import { consumeTrainerSessionEntry } from './trainer_session';
import { isFeatureFreeForEveryone } from './feature_gates';
import { getVerifiedPremiumStatus } from './premium_guard';
import { checkAchievements } from './achievements';
import { logTrainerDirectGateBlocked } from './firebase';
import { useCorrectSound } from '../hooks/use-correct-sound';
import { useSpeakAnswer } from '../hooks/use-speak-answer';
import TrainerSessionReport from './trainer_session_report';
import ReportErrorButton from '../components/ReportErrorButton';
import { ensureFrenchRemotePersonalPractice } from './french_personal_practice_remote_runtime';
import { frenchTrainerGateCopy, trainerSessionContentAvailableForTarget } from './trainer_target_gate';
import { isStudyTargetSourceUiLang } from './study_target_lang_dev';
import {
  markTrainerPlanTaskCompleted,
  readTrainerPlanTaskContext,
  type TrainerPlanTaskRouteParams,
} from './trainer_plan_task_route';

const { width: SCREEN_W } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_W * 0.3;
const SWIPE_OUT_DURATION = 220;

// ── Подбор ложного перевода ──────────────────────────────────────────────────
// Все переводы слов из lesson_data — плоский список для выбора похожего.
// Импортируем динамически чтобы не тащить весь контент при старте.
async function pickDecoyTranslation(
  correctTranslation: string,
  allItems: TrainerItem[],
  lang: Lang,
): Promise<string> {
  // Берём переводы других слов из очереди
  const pool = allItems
    .map(i => trainerTranslationForLang(i, lang))
    .filter(t => t && t !== correctTranslation);
  const correctRu = correctTranslation;

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
  themeMode: ThemeMode;
}

function SwipeCard({ card, onSwipe, isTop, swipeOutRef, themeMode }: SwipeCardProps) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const isCompassTheme = false;
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
      style={[
        styles.card,
        isCompassTheme && compassShadow(3),
        {
          backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard,
          borderRadius: isCompassTheme ? 12 : 24,
          overflow: isCompassTheme ? 'hidden' : 'visible',
        },
        cardStyle,
      ]}
      {...(isTop ? panResponder.panHandlers : {})}
    >
      {isCompassTheme ? <CompassDepthSurface radius={12} selected /> : null}
      {/* Верно оверлей */}
      <Animated.View style={[styles.decisionLabel, styles.correctLabel, { opacity: correctOpacity }]}>
        <Text style={styles.decisionText}>✓ {triLang(lang, {
          ru: 'ВЕРНО',
          uk: 'ВІРНО',
          es: 'CORRECTO',
          'pt-BR': 'CORRETO',
          vi: 'ĐÚNG',
          id: 'BENAR',
          tr: 'DOĞRU',
          pl: 'POPRAWNIE',
        })}</Text>
      </Animated.View>

      {/* Неверно оверлей */}
      <Animated.View style={[styles.decisionLabel, styles.wrongLabel, { opacity: wrongOpacity }]}>
        <Text style={styles.decisionText}>✗ {triLang(lang, {
          ru: 'НЕВЕРНО',
          uk: 'НЕВІРНО',
          es: 'INCORRECTO',
          'pt-BR': 'INCORRETO',
          vi: 'SAI',
          id: 'SALAH',
          tr: 'YANLIŞ',
          pl: 'NIEPOPRAWNIE',
        })}</Text>
      </Animated.View>

      {/* Слово */}
      <Text style={[styles.wordEn, { color: t.textPrimary, fontSize: f.h1 }]}>
        {card.item.key}
      </Text>

      {/* Разделитель */}
      <View style={[styles.divider, { backgroundColor: t.border }]} />

      {/* Перевод (верный или ложный) */}
      <Text style={[styles.wordRu, { color: t.textMuted, fontSize: f.bodyLg }]}>
        {card.shownTranslation}
      </Text>

    </Animated.View>
  );
}

// ── Основной экран ────────────────────────────────────────────────────────────
export default function TrainerWordsSession() {
  const router = useRouter();
  const params = useLocalSearchParams<TrainerPlanTaskRouteParams>();
  const { theme: t, f, themeMode } = useTheme();
  const isCompassTheme = false;
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const sourceLocale = isStudyTargetSourceUiLang(lang) ? lang : 'ru';
  const trainerGateOpen = trainerSessionContentAvailableForTarget(studyTarget);
  const { playCorrect } = useCorrectSound();
  const { speakAnswer } = useSpeakAnswer();

  const [deck, setDeck] = useState<CardData[]>([]);
  const [current, setCurrent] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accessReady, setAccessReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const allItemsRef = useRef<TrainerItem[]>([]);
  const dailySessionTracked = useRef(false);
  const planTrainerCompletionTracked = useRef(false);
  const planTrainerContext = useMemo(() => readTrainerPlanTaskContext({
    mode: params.mode,
    planDayIndex: params.planDayIndex,
    planId: params.planId,
    planInstanceId: params.planInstanceId,
    planTaskId: params.planTaskId,
    planTrainerTask: params.planTrainerTask,
    requiredItems: params.requiredItems,
  }), [
    params.mode,
    params.planDayIndex,
    params.planId,
    params.planInstanceId,
    params.planTaskId,
    params.planTrainerTask,
    params.requiredItems,
  ]);
  // Ref к функции swipeOut текущей карточки — для кнопок
  const swipeOutRef = useRef<((dir: 'right' | 'left') => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    setLoading(true);
    void (async () => {
      try {
        if (!trainerGateOpen) {
          if (cancelled) return;
          setAccessReady(true);
          setLoading(false);
          return;
        }
        if (planTrainerContext.taskId) {
          const planAllowed = isFeatureFreeForEveryone('smart_trainer') || await getVerifiedPremiumStatus();
          if (cancelled) return;
          if (!planAllowed) {
            logTrainerDirectGateBlocked('/trainer_words_session');
            // Снимаем экран тренажёра со стека «назад»: при закрытии пейвола
            // возврат сюда снова упёрся бы в этот же гейт → пейвол открывался бы
            // заново «на месте» бесконечно. Уходим на реальный предыдущий экран.
            markNextNavigationAsReplace();
            router.replace({ pathname: '/premium_modal', params: { context: 'smart_trainer', source: 'smart_trainer_lock' } } as any);
            return;
          }
        } else {
          const allowed = await consumeTrainerSessionEntry('/trainer_words_session', studyTarget);
          if (cancelled) return;
          // «Пульт»: если режимы тренера переведены в «Фри» — дневной лимит снят для всех.
          if (!allowed && !isFeatureFreeForEveryone('trainer_modes')) {
            logTrainerDirectGateBlocked('/trainer_words_session');
            // см. коммент выше: убираем тренажёр из стека, чтобы «назад» с пейвола
            // не вернулось на исчерпанный лимит и не открыло пейвол снова.
            markNextNavigationAsReplace();
            router.replace({ pathname: '/premium_modal', params: { context: 'trainer_limit' } } as any);
            return;
          }
        }
        setAccessReady(true);
        await ensureFrenchRemotePersonalPractice(sourceLocale);
        const items = planTrainerContext.taskId
          ? await getTrainerPremiumItemsForPlanQueue(
              planTrainerContext.planInstanceId,
              planTrainerContext.mode,
              'words',
              planTrainerContext.requiredItems,
              studyTarget,
            )
          : await getDueItems('words', 20, studyTarget, sourceLocale);
        if (cancelled) return;
        allItemsRef.current = items;
        if (items.length === 0) { setDone(true); setLoading(false); return; }

        // Строим колоду: каждая карточка имеет ~50% шанс ложного перевода
        const cards: CardData[] = await Promise.all(
          items.map(async (item) => {
            const showCorrect = Math.random() > 0.5;
            const correctTranslation = trainerTranslationForLang(item, lang);
            const shownTranslation = showCorrect
              ? correctTranslation
              : await pickDecoyTranslation(correctTranslation, items, lang);
            return {
              item,
              shownTranslation,
              isCorrectTranslation: showCorrect || shownTranslation === correctTranslation,
            };
          }),
        );
        if (cancelled) return;
        setDeck(cards);
        setLoading(false);
      } catch {
        // Сбой загрузки колоды (сеть/Firestore) больше не оставляет вечный
        // лоадер — показываем экран ошибки с retry и выходом.
        if (cancelled) return;
        setLoadError(true);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [lang, planTrainerContext, router, sourceLocale, studyTarget, trainerGateOpen, reloadKey]);

  const handleSwipe = useCallback(async (answeredCorrectly: boolean) => {
    const card = deck[current];
    if (!card) return;

    const nextCorrect = correct + (answeredCorrectly ? 1 : 0);
    const nextWrong = wrong + (answeredCorrectly ? 0 : 1);
    if (answeredCorrectly) setCorrect(c => c + 1);
    else setWrong(c => c + 1);

    await markTrainerResult(card.item.key, 'words', answeredCorrectly, studyTarget);
    const updates: { type: TaskType; increment: number }[] = [];
    if (!dailySessionTracked.current) {
      dailySessionTracked.current = true;
      updates.push({ type: 'recall_session', increment: 1 });
    }
    if (answeredCorrectly) {
      playCorrect();
      speakAnswer(card.item.key, studyTarget);
      updates.push({ type: 'recall_answers', increment: 1 });
      updates.push({ type: 'trainer_words', increment: 1 });
      checkAchievements({ type: 'trainer_correct', correct: 1, studyTarget }).catch(() => {});
    }

    const next = current + 1;
    if (next >= deck.length) {
      if (deck.length >= 5 && nextWrong === 0) updates.push({ type: 'recall_perfect', increment: 1 });
      checkAchievements({
        type: 'trainer_session_result',
        correct: nextCorrect,
        wrong: nextWrong,
        total: deck.length,
        studyTarget,
      }).catch(() => {});
      setDone(true);
    } else {
      setCurrent(next);
    }
    if (updates.length > 0) updateMultipleTaskProgress(updates, { studyTarget }).catch(() => {});
  }, [deck, current, correct, wrong, studyTarget, playCorrect, speakAnswer]);

  const handleButton = useCallback((dir: 'right' | 'left') => {
    // Результат (success/error) даёт swipeOut при оценке ответа — отдельный
    // tap убран, иначе складывался с сигналом результата в один сильный удар.
    swipeOutRef.current?.(dir);
  }, []);

  useEffect(() => {
    if (!done || !planTrainerContext.taskId || planTrainerCompletionTracked.current) return;
    planTrainerCompletionTracked.current = true;
    void markTrainerPlanTaskCompleted(planTrainerContext, studyTarget);
  }, [done, planTrainerContext, studyTarget]);

  if (loadError) {
    return (
      <TrainerErrorView
        lang={lang}
        onRetry={() => { hapticTap(); setReloadKey(k => k + 1); }}
        onExit={() => { hapticTap(); safeRouterBack(router, '/trainer' as any); }}
      />
    );
  }

  if (!accessReady || loading) {
    return <TrainerLoadingView lang={lang} />;
  }

  if (!trainerGateOpen) {
    const copy = frenchTrainerGateCopy(lang);
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Ionicons name="lock-closed-outline" size={38} color={sx.muted} />
          <Text style={{ color: sx.primary, fontSize: f.h2, fontWeight: '900', textAlign: 'center', marginTop: 14 }}>
            {copy.title}
          </Text>
          <Text style={{ color: sx.muted, fontSize: f.body, textAlign: 'center', marginTop: 10, lineHeight: 22 }}>
            {copy.body}
          </Text>
          <TouchableOpacity onPress={() => router.replace('/trainer' as any)} style={{ marginTop: 22, backgroundColor: '#4A9EFF', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 12 }}>
            <Text style={{ color: '#fff', fontSize: f.sub, fontWeight: '900' }}>{copy.action}</Text>
          </TouchableOpacity>
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
              onDone={() => { hapticTap(); safeRouterBack(router, planTrainerContext.taskId ? '/personal_plan' as any : '/trainer' as any); }}
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
            <TapScale onPress={() => safeRouterBack(router, planTrainerContext.taskId ? '/personal_plan' as any : '/trainer' as any)} style={{ padding: 4 }}>
              <Ionicons name="chevron-back" size={28} color={sx.primary} />
            </TapScale>
            <View style={styles.headerRight}>
              {deck[current] ? (
                <ReportErrorButton
                  screen="trainer_words"
                  variant="icon-flag"
                  dataId={`trainer_word_${deck[current].item.key}`}
                  dataText={`${deck[current].item.key} — ${deck[current].shownTranslation}`}
                  accessibilityLabel="Сообщить об ошибке в слове"
                />
              ) : null}
            </View>
          </View>

          {/* Прогресс-бар */}
          <GradientProgressBar
            progress={deck.length > 0 ? current / deck.length : 0}
            accent={isCompassTheme ? COMPASS_RICH.champagne : '#4A9EFF'}
            style={styles.progressBar}
          />

          {/* Стек карточек */}
          <View style={styles.deckContainer}>
            {/* Показываем следующую карточку под текущей */}
            {deck[current + 1] && (
              <View style={[styles.card, styles.cardBack, isCompassTheme && compassShadow(1), { backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalSoft : t.bgCard, borderRadius: isCompassTheme ? 12 : 24, overflow: isCompassTheme ? 'hidden' : 'visible' }]}>
                {isCompassTheme ? <CompassDepthSurface radius={12} quiet /> : null}
              </View>
            )}
            {deck[current] && (
              <SwipeCard
                key={current}
                card={deck[current]}
                onSwipe={handleSwipe}
                isTop
                swipeOutRef={swipeOutRef}
                themeMode={themeMode}
              />
            )}
          </View>

          {/* Кнопки */}
          <View style={styles.buttons}>
            <TouchableOpacity
              onPress={() => handleButton('left')}
              style={[
                styles.btn,
                !isCompassTheme && styles.btnWrong,
                isCompassTheme && compassShadow(1),
                {
                  backgroundColor: isCompassTheme ? COMPASS_RICH.copperWash : '#E05050' + '22',
                  borderRadius: isCompassTheme ? 9 : 18,
                  overflow: isCompassTheme ? 'hidden' : 'visible',
                },
              ]}
            >
              {isCompassTheme ? <CompassDepthSurface radius={9} quiet /> : null}
              <Ionicons name="close" size={32} color={isCompassTheme ? COMPASS_RICH.peach : monoIcon(themeMode, '#E05050', MONO_ICON.muted)} />
              <Text style={[styles.btnLabel, { color: isCompassTheme ? COMPASS_RICH.peach : '#E05050', fontSize: f.caption }]}>
                {triLang(lang, {
                  ru: 'Мимо',
                  uk: 'Повз',
                  es: 'Incorrecto',
                  'pt-BR': 'Incorreto',
                  vi: 'Sai',
                  id: 'Salah',
                  tr: 'Yanlış',
                  pl: 'Niepoprawnie',
                })}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleButton('right')}
              style={[
                styles.btn,
                !isCompassTheme && styles.btnCorrect,
                isCompassTheme && compassShadow(1),
                {
                  backgroundColor: isCompassTheme ? COMPASS_RICH.washStrong : '#40C080' + '22',
                  borderRadius: isCompassTheme ? 9 : 18,
                  overflow: isCompassTheme ? 'hidden' : 'visible',
                },
              ]}
            >
              {isCompassTheme ? <CompassDepthSurface radius={9} selected /> : null}
              <Ionicons name="checkmark" size={32} color={isCompassTheme ? COMPASS_RICH.champagne : monoIcon(themeMode, '#40C080')} />
              <Text style={[styles.btnLabel, { color: isCompassTheme ? COMPASS_RICH.champagne : '#40C080', fontSize: f.caption }]}>
                {triLang(lang, {
                  ru: 'Верно',
                  uk: 'Вірно',
                  es: 'Correcto',
                  'pt-BR': 'Correto',
                  vi: 'Đúng',
                  id: 'Benar',
                  tr: 'Doğru',
                  pl: 'Poprawnie',
                })}
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
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
    paddingVertical: 14,
  },
  btnWrong:   { backgroundColor: '#E05050' + '22' },
  btnCorrect: { backgroundColor: '#40C080' + '22' },
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
