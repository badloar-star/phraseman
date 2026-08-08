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
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import GradientProgressBar from '../components/GradientProgressBar';
import { TrainerLoadingView, TrainerErrorView } from '../components/TrainerLoadStates';
import { triLang } from '../constants/i18n';
import { screenTextOnGradient } from '../constants/theme';
import { statsThemeAccent, statsThemeSoftBg } from '../constants/statsThemeChrome';
import type { ThemeMode } from '../constants/theme';
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { useEnergy } from '../components/EnergyContext';
import NoEnergyModal from '../components/NoEnergyModal';
import {
  getCachedDueItems,
  getDueItems,
  getTrainerPremiumItemsForPlanQueue,
  markTrainerResult,
  type TrainerItem,
} from './trainer_store';
import {
  buildTrainerWordSessionDeck,
  getCachedPhraseSessionItems,
  getWarmWordSessionDeck,
  PHRASE_SESSION_LIMIT,
  WORD_SESSION_LIMIT,
  type WordSessionCard,
} from './trainer_practice_hall';
import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back';
import { updateMultipleTaskProgress, type TaskType } from './daily_tasks';
import { consumeTrainerSessionEntry } from './trainer_session';
import { isFeatureFreeForEveryone } from './feature_gates';
// зачем: premium_guard больше не нужен — тренажёр бесплатный, гейт smart_trainer снят.
import { checkAchievements } from './achievements';
import { logTrainerDirectGateBlocked } from './firebase';
import { useCorrectSound } from '../hooks/use-correct-sound';
import { useSpeakAnswer } from '../hooks/use-speak-answer';
import TrainerSessionReport from './trainer_session_report';
import ReportErrorButton from '../components/ReportErrorButton';
import { frenchTrainerGateCopy, trainerSessionContentAvailableForTarget } from './trainer_target_gate';
import { isStudyTargetSourceUiLang } from './study_target_lang_dev';
import {
  markTrainerPlanTaskCompleted,
  readTrainerPlanTaskContext,
  type TrainerPlanTaskRouteParams,
} from './trainer_plan_task_route';

import { noAndroidOutline } from '../constants/androidGlow';
const { width: SCREEN_W } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_W * 0.3;
const SWIPE_OUT_DURATION = 220;

// ── Компонент одной карточки ─────────────────────────────────────────────────
interface SwipeCardProps {
  card: WordSessionCard;
  onSwipe: (correct: boolean) => void;
  isTop: boolean;
  swipeOutRef: React.MutableRefObject<((dir: 'right' | 'left') => void) | null>;
  themeMode: ThemeMode;
  /** Озвучка слова — принадлежит экрану (карточка размонтируется на следующем). */
  onSpeakWord: () => void;
}

function SwipeCard({ card, onSwipe, isTop, swipeOutRef, themeMode, onSpeakWord }: SwipeCardProps) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const accent = statsThemeAccent(themeMode);
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
        {
          backgroundColor: t.bgCard,
          borderRadius: 24,
        },
        cardStyle,
      ]}
      {...(isTop ? panResponder.panHandlers : {})}
    >
      {/* Озвучка — всегда справа вверху */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={triLang(lang, {
          ru: 'Озвучить слово',
          uk: 'Озвучити слово',
          es: 'Escuchar la palabra',
          'pt-BR': 'Ouvir a palavra',
          vi: 'Nghe từ',
          id: 'Dengar kata',
          tr: 'Kelimeyi dinle',
          pl: 'Posłuchaj słowa',
        })}
        onPress={onSpeakWord}
        style={[styles.sayBtn, { backgroundColor: statsThemeSoftBg(themeMode, 'normal') }]}
      >
        <Ionicons name="volume-high" size={16} color={accent} />
      </TouchableOpacity>

      {/* Штамп «Правильно» — виден при свайпе вправо ещё до отлёта карточки */}
      <Animated.View style={[styles.stamp, { left: 20, transform: [{ rotate: '-12deg' }], backgroundColor: t.correctBg, opacity: correctOpacity }]}>
        <Text style={[styles.stampText, { color: t.correct }]}>{triLang(lang, {
          ru: 'Правильно',
          uk: 'Правильно',
          es: 'Correcto',
          'pt-BR': 'Correto',
          vi: 'Đúng',
          id: 'Benar',
          tr: 'Doğru',
          pl: 'Dobrze',
        })}</Text>
      </Animated.View>

      {/* Штамп «Неправильно» — при свайпе влево */}
      <Animated.View style={[styles.stamp, { right: 20, transform: [{ rotate: '12deg' }], backgroundColor: t.wrongBg, opacity: wrongOpacity }]}>
        <Text style={[styles.stampText, { color: t.wrong }]}>{triLang(lang, {
          ru: 'Неправильно',
          uk: 'Неправильно',
          es: 'Incorrecto',
          'pt-BR': 'Incorreto',
          vi: 'Sai',
          id: 'Salah',
          tr: 'Yanlış',
          pl: 'Źle',
        })}</Text>
      </Animated.View>

      {/* Слово */}
      <Text style={[styles.wordEn, { color: t.textPrimary, fontSize: Math.round(f.h1 * 1.3), letterSpacing: -0.4 }]}>
        {card.item.key}
      </Text>

      {/* Перевод (верный или ложный) */}
      <Text style={[styles.wordRu, { color: t.textMuted, fontSize: f.caption }]}>
        {card.shownTranslation}
      </Text>

      {/* Подсказка управления */}
      <Text style={[styles.cardHint, { color: t.textGhost }]}>
        {triLang(lang, {
          ru: 'Свайп или кнопки',
          uk: 'Свайп або кнопки',
          es: 'Desliza o usa botones',
          'pt-BR': 'Deslize ou use botões',
          vi: 'Vuốt hoặc dùng nút',
          id: 'Geser atau pakai tombol',
          tr: 'Kayır veya düğmeleri kullan',
          pl: 'Przesuń lub użyj przycisków',
        })}
      </Text>

    </Animated.View>
  );
}

// ── Основной экран ────────────────────────────────────────────────────────────
export default function TrainerWordsSession() {
  const router = useRouter();
  const params = useLocalSearchParams<TrainerPlanTaskRouteParams>();
  const { theme: t, f, themeMode } = useTheme();
  const accent = statsThemeAccent(themeMode);
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const sourceLocale = isStudyTargetSourceUiLang(lang) ? lang : 'ru';
  const trainerGateOpen = trainerSessionContentAvailableForTarget(studyTarget);
  const { playCorrect } = useCorrectSound();
  const { speakAnswer } = useSpeakAnswer();
  // зачем: владелец попросил, чтобы ошибки в «Моя практика» тратили энергию и
  // блокировали экран при 0 — точно так же, как в уроках (lesson1.tsx/review.tsx).
  // Премиум/тестер обходят списание внутри spendOne (isUnlimited).
  const { energy, bonusEnergy, isUnlimited: energyUnlimited, spendOne, energyReady } = useEnergy();
  const energyRef = useRef({ energy, bonusEnergy, energyUnlimited });
  useEffect(() => { energyRef.current = { energy, bonusEnergy, energyUnlimited }; }, [energy, bonusEnergy, energyUnlimited]);
  const [noEnergyModalOpen, setNoEnergyModalOpen] = useState(false);

  const warmDeckRef = useRef<WordSessionCard[] | null>(
    !trainerGateOpen || params.planTaskId || params.planTrainerTask
      ? null
      : getWarmWordSessionDeck(WORD_SESSION_LIMIT, studyTarget, sourceLocale, lang),
  );
  const warmDeck = warmDeckRef.current;
  const [deck, setDeck] = useState<WordSessionCard[]>(() => warmDeck ?? []);
  const [current, setCurrent] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(() => warmDeck === null);
  const [accessReady, setAccessReady] = useState(() => warmDeck !== null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const allItemsRef = useRef<TrainerItem[]>(warmDeck?.map((card) => card.item) ?? []);
  const planTrainerCompletionTracked = useRef(false);
  const sessionStartRef = useRef(warmDeck ? Date.now() : 0);
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

  // зачем: аудит нашёл, что закрытие модала тапом мимо/кнопкой «назад» на Android (в
  // отличие от «Позже» → onGotIt, который уводит с экрана) оставляет пользователя тут же
  // с энергией 0 — а любое следующее обновление EnergyContext (сворачивание/разворачивание,
  // тик восстановления, бонус/премиум-событие) заново открывает уже закрытый модал.
  const energyGateDismissedRef = useRef(false);
  // Гейт на входе: энергия уже на нуле до первого свайпа — сразу блокирующий модал,
  // как в lesson1.tsx (entryEnergyGateLessonRef). energyReady ждёт первого live-чтения,
  // чтобы не мигнуть модалом на дефолтных значениях контекста при холодном старте.
  useEffect(() => {
    if (!energyReady || energyUnlimited) return;
    if (energy + bonusEnergy > 0) return;
    if (energyGateDismissedRef.current) return;
    setNoEnergyModalOpen(true);
  }, [energyReady, energy, bonusEnergy, energyUnlimited]);

  useEffect(() => {
    let cancelled = false;
    const startedWarm = warmDeckRef.current !== null;
    setLoadError(false);
    if (!startedWarm) setLoading(true);
    void (async () => {
      try {
        if (!trainerGateOpen) {
          if (cancelled) return;
          setAccessReady(true);
          setLoading(false);
          return;
        }
        // зачем: владелец сделал тренажёр («Моя практика») полностью бесплатным —
        // премиум-гейт smart_trainer снят и для задач персонального плана тоже.
        // Ветку planTrainerContext.taskId оставляем: она не про доступ, а про то,
        // что дневной лимит к плановым задачам не применяется (см. else ниже).
        if (planTrainerContext.taskId) {
          if (cancelled) return;
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

        const cards = buildTrainerWordSessionDeck(items, lang);
        if (cancelled) return;
        if (!startedWarm) {
          sessionStartRef.current = Date.now();
          setDeck(cards);
        }
        setLoading(false);
      } catch {
        // Сбой загрузки колоды (сеть/Firestore) больше не оставляет вечный
        // лоадер — показываем экран ошибки с retry и выходом.
        if (cancelled) return;
        if (startedWarm) return;
        setLoadError(true);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [lang, planTrainerContext, router, sourceLocale, studyTarget, trainerGateOpen, reloadKey]);

  const handleSwipe = useCallback(async (answeredCorrectly: boolean) => {
    const card = deck[current];
    if (!card) return;
    // зачем: аудит нашёл, что PanResponder-жест, начатый ДО открытия NoEnergyModal
    // (палец уже двигался в момент ~800мс задержки после ошибки, обнулившей энергию),
    // долетал до конца и звал handleSwipe под уже показанным/показывающимся модалом —
    // повторное списание и переход дальше по колоде под блокирующим окном.
    if (noEnergyModalOpen) return;

    const nextCorrect = correct + (answeredCorrectly ? 1 : 0);
    const nextWrong = wrong + (answeredCorrectly ? 0 : 1);
    if (answeredCorrectly) setCorrect(c => c + 1);
    else setWrong(c => c + 1);

    await markTrainerResult(card.item.key, 'words', answeredCorrectly, studyTarget);
    const updates: { type: TaskType; increment: number }[] = [];
    // «Моя практика» продвигает только собственный trainer_words-вызов.
    // SRS recall_* принадлежит исключительно экрану /review.
    if (answeredCorrectly) {
      playCorrect();
      speakAnswer(card.item.key, studyTarget);
      updates.push({ type: 'trainer_words', increment: 1 });
      checkAchievements({ type: 'trainer_correct', correct: 1, studyTarget }).catch(() => {});
    } else if (!energyRef.current.energyUnlimited) {
      // При ОШИБКЕ тратим энергию — та же механика, что в review.tsx/lesson1.tsx.
      // Ответ уже засчитан выше; модал догоняет с задержкой (даёт красному фидбэку
      // карточки отыграть), totalBefore/After читаем из ref — без stale closure.
      const totalBefore = energyRef.current.energy + energyRef.current.bonusEnergy;
      spendOne().then((success) => {
        if (!success) return;
        // зачем: аудит нашёл, что дневное задание «потрать энергию» (es1-es4, до 66 XP)
        // никогда не засчитывалось из этого экрана — lesson1.tsx/review.tsx шлют этот
        // инкремент, а «Моя практика» — нет. Квест молча не продвигался у части юзеров.
        updateMultipleTaskProgress([{ type: 'energy_spend', increment: 1 }], { studyTarget }).catch(() => {});
        setTimeout(() => {
          const totalAfter = energyRef.current.energy + energyRef.current.bonusEnergy;
          if (totalBefore > 0 && totalAfter <= 0) setNoEnergyModalOpen(true);
        }, 800);
      }).catch(() => {});
    }

    const next = current + 1;
    if (next >= deck.length) {
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
  }, [deck, current, correct, wrong, studyTarget, playCorrect, speakAnswer, spendOne, noEnergyModalOpen]);

  const handleButton = useCallback((dir: 'right' | 'left') => {
    if (noEnergyModalOpen) return;
    // Результат (success/error) даёт swipeOut при оценке ответа — отдельный
    // tap убран, иначе складывался с сигналом результата в один сильный удар.
    swipeOutRef.current?.(dir);
  }, [noEnergyModalOpen]);

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
          <TouchableOpacity onPress={() => router.replace('/trainer' as any)} style={{ marginTop: 22, backgroundColor: t.correct, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 12 }}>
            <Text style={{ color: t.correctText, fontSize: f.sub, fontWeight: '900' }}>{copy.action}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  if (done) {
    // зачем: симметрично фразовой сессии — сначала проверяем остаток СВОИХ
    // слов (лимит пачки WORD_SESSION_LIMIT мог обрезать очередь), и только
    // если слов больше не осталось — предлагаем фразы (включая арену).
    const moreWordsChain = planTrainerContext.taskId
      ? []
      : getCachedDueItems('words', WORD_SESSION_LIMIT, studyTarget, sourceLocale);
    const phrasesChain = planTrainerContext.taskId || moreWordsChain.length > 0
      ? []
      : getCachedPhraseSessionItems(PHRASE_SESSION_LIMIT, studyTarget, sourceLocale);
    const nextLabel = moreWordsChain.length > 0
      ? `${triLang(lang, {
        ru: 'Дальше: Слова',
        uk: 'Далі: Слова',
        es: 'Siguiente: Palabras',
        'pt-BR': 'A seguir: Palavras',
        vi: 'Tiếp: Từ vựng',
        id: 'Lanjut: Kata',
        tr: 'Sıradaki: Kelimeler',
        pl: 'Dalej: Słowa',
      })} · ${moreWordsChain.length}`
      : phrasesChain.length > 0
      ? `${triLang(lang, {
        ru: 'Дальше: Фразы',
        uk: 'Далі: Фрази',
        es: 'Siguiente: Frases',
        'pt-BR': 'A seguir: Frases',
        vi: 'Tiếp: Cụm từ',
        id: 'Lanjut: Frasa',
        tr: 'Sıradaki: İfadeler',
        pl: 'Dalej: Frazy',
      })} · ${phrasesChain.length}`
      : undefined;
    const nextRoute = moreWordsChain.length > 0 ? '/trainer_words_session' : '/trainer_phrases_session';
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            <TrainerSessionReport
              queue="words"
              correct={correct}
              wrong={wrong}
              total={deck.length || correct + wrong}
              accent={accent}
              durationMs={sessionStartRef.current > 0 ? Date.now() - sessionStartRef.current : undefined}
              onDone={() => { hapticTap(); safeRouterBack(router, planTrainerContext.taskId ? '/personal_plan' as any : '/trainer' as any); }}
              onPracticeMore={() => { hapticTap(); router.replace('/trainer' as any); }}
              nextLabel={nextLabel}
              onNext={nextLabel ? () => { hapticTap(); router.replace(nextRoute as any); } : undefined}
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

          {/* Прогресс: тонкая полоса + чип-счётчик */}
          <View style={styles.progressRow}>
            <GradientProgressBar
              progress={deck.length > 0 ? current / deck.length : 0}
              accent={accent}
              height={6}
              style={styles.progressBarFlex}
            />
            <View style={[styles.countChip, { backgroundColor: t.bgSurface }]}>
              <Text style={{ color: t.textMuted, fontSize: f.label - 1, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
                {deck.length > 0 ? Math.min(current + 1, deck.length) : 0} / {deck.length}
              </Text>
            </View>
          </View>

          {/* Стек карточек */}
          <View style={styles.deckContainer}>
            {/* Показываем следующую карточку под текущей */}
            {deck[current + 1] && (
              <View style={[styles.card, styles.cardBack, { backgroundColor: t.bgCard, borderRadius: 24 }]} />
            )}
            {deck[current] && (
              <SwipeCard
                key={current}
                card={deck[current]}
                onSwipe={handleSwipe}
                isTop={!noEnergyModalOpen}
                swipeOutRef={swipeOutRef}
                themeMode={themeMode}
                onSpeakWord={() => { hapticTap(); void speakAnswer(deck[current].item.key, studyTarget); }}
              />
            )}
          </View>

          {/* Кнопки ✕ / ✓ */}
          <View style={styles.buttonsRow}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={triLang(lang, {
                ru: 'Неправильно', uk: 'Неправильно', es: 'Incorrecto', 'pt-BR': 'Incorreto',
                vi: 'Sai', id: 'Salah', tr: 'Yanlış', pl: 'Źle',
              })}
              onPress={() => handleButton('left')}
              style={[styles.roundBtn, { backgroundColor: t.wrongBg }]}
            >
              <Ionicons name="close" size={30} color={t.wrong} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={triLang(lang, {
                ru: 'Правильно', uk: 'Правильно', es: 'Correcto', 'pt-BR': 'Correto',
                vi: 'Đúng', id: 'Benar', tr: 'Doğru', pl: 'Dobrze',
              })}
              onPress={() => handleButton('right')}
              style={[styles.roundBtn, { backgroundColor: t.correctBg }]}
            >
              <Ionicons name="checkmark" size={30} color={t.correct} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.buttonsCaption, { color: t.textGhost }]}>
            {triLang(lang, {
              ru: 'неправильно · правильно',
              uk: 'неправильно · правильно',
              es: 'incorrecto · correcto',
              'pt-BR': 'incorreto · correto',
              vi: 'sai · đúng',
              id: 'salah · benar',
              tr: 'yanlış · doğru',
              pl: 'źle · dobrze',
            })}
          </Text>

        </ContentWrap>
      </SafeAreaView>
      <NoEnergyModal
        visible={noEnergyModalOpen}
        onClose={() => { energyGateDismissedRef.current = true; setNoEnergyModalOpen(false); }}
        onGotIt={() => { setNoEnergyModalOpen(false); safeRouterBack(router, planTrainerContext.taskId ? '/personal_plan' as any : '/trainer' as any); }}
      />
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
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  progressBarFlex: { flex: 1 },
  countChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  deckContainer: {
    flex: 1,
    marginTop: 8,
    marginHorizontal: 16,
  },
  card: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 12,
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    ...noAndroidOutline,
  },
  cardBack: {
    transform: [{ scale: 0.93 }, { translateY: 8 }],
    opacity: 0.55,
  },
  sayBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stamp: {
    position: 'absolute',
    top: 26,
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 0,
  },
  stampText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  wordEn: { fontWeight: '900', textAlign: 'center' },
  wordRu: { fontWeight: '600', textAlign: 'center', marginTop: 6 },
  cardHint: {
    position: 'absolute',
    bottom: 16,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 22,
    paddingTop: 6,
    paddingBottom: 12,
  },
  roundBtn: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonsCaption: {
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    paddingBottom: 12,
  },
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
    borderWidth: 0,
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
