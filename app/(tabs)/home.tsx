import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, Dimensions, Alert, Image,
} from 'react-native';

import { useRouter } from 'expo-router';
import { useTabNav } from '../TabContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../components/ThemeContext';
import { useLang, getLeague } from '../../components/LangContext';
import ScreenGradient from '../../components/ScreenGradient';
import { loadLeagueState, LEAGUES } from '../league_engine';
import { DebugLogger } from '../debug-logger';
import { getMyWeekPoints, checkStreakLossPending, getWeekKey } from '../hall_of_fame_utils';
import { isRepairEligible, getRepairProgress } from '../streak_repair';
import { getTodayTasks, loadTodayProgress, TaskProgress } from '../daily_tasks';
import { getXPProgress, CEFR_FOR_LEVEL, getLevelFromXP } from '../../constants/theme';
import { LESSON_NAMES_RU, LESSON_NAMES_UK } from '../../constants/lessons';
import { DEV_MODE, IS_EXPO_GO } from '../config';
import Purchases from 'react-native-purchases';
import PremiumCard from '../../components/PremiumCard';
import { hapticTap } from '../../hooks/use-haptics';
import CircularProgress from '../../components/CircularProgress';
import { DIALOGS } from '../dialogs_data';
import AnimatedFrame from '../../components/AnimatedFrame';
import { getBestAvatarForLevel, getBestFrameForLevel, getAvatarImageByIndex } from '../../constants/avatars';
import LevelBadge from '../../components/LevelBadge';
import EnergyIcon from '../../components/EnergyIcon';
import { loadAllMedals, countMedals } from '../medal_utils';
// [SRS] getDueItems() возвращает фразы из active_recall_items,
// у которых nextDue <= конец сегодняшнего дня (по SM-2 алгоритму).
// Используется только для получения количества — сами карточки рендерит review.tsx.
import { getDueItems } from '../active_recall';
import DailyPhraseCard from '../../components/DailyPhraseCard';
import ActiveBoostBar from '../../components/ActiveBoostBar';
import { getEnergyState, checkAndRecover } from '../energy_system';

const { width: SCREEN_W } = Dimensions.get('window');
const CONTENT_W = Math.min(SCREEN_W, 640);
const CARD_W = (CONTENT_W - 32 - 10) / 2;

const GREETINGS_RU = [
  'Твой лингвистический дзен','Время покорять вершины','Зарядись знаниями','Твой мозг скажет «спасибо»',
  'Готов к новым инсайтам?','Мир ждет твоего слова','На шаг ближе к цели','Твой интеллект в тонусе',
  'Вдохновение начинается здесь','Стань лучшей версией себя','Твой путь к мастерству','Время открывать горизонты',
  'Заставь мысли летать','Твой пропуск в мир','Прокачай свой потенциал','Сегодня — лучший день для старта',
  'Будь на волне прогресса','Энергия твоего разума','Сделай шаг к успеху','Твое будущее начинается сейчас',
  'Твой интеллектуальный апгрейд','Время расширять границы','Зарядись на успех','Твой мозг в отличной форме',
  'Готов к новым свершениям?','Мир заговорит с тобой','На шаг впереди всех','Твоя ежедневная порция знаний',
  'Вдохновение в каждом слове','Стань мастером своего дела','Твой персональный прорыв','Время блистать знаниями',
  'Заряди разум на максимум','Твой мозг жаждет открытий','Готов удивить весь мир?','Мир открыт для тебя',
  'На шаг ближе к мечте','Твой интеллект вне границ','Вдохновение в каждом шаге','Стань легендой сегодня',
  'Твой интеллектуальный драйв','Время менять реальность','Зарядись на победу','Твой мозг в центре событий',
  'Готов к новым высотам?','Мир понимает тебя','На шаг впереди вчерашнего','Твой безграничный потенциал',
  'Вдохновение внутри тебя','Стань лучшим в своем деле','Твой интеллектуальный триумф','Время ярких открытий',
  'Зарядись на результат','Твой разум — твоя сила','Готов к новому вызову?','Мир слышит тебя',
  'На шаг ближе к идеалу','Твой путь к совершенству','Вдохновение в деталях','Стань тем, кем мечтал',
  'Твой интеллектуальный кураж','Время мыслить шире','Зарядись на максимум','Твой разум — твой капитал',
  'Готов к новым интригам?','Мир заиграет красками','На шаг ближе к мечте','Твой путь к свободе',
  'Вдохновение в прогрессе','Стань душой компании',
];
const GREETINGS_UK = [
  'Твій лінгвістичний дзен','Час покорювати вершини','Зарядись знаннями','Твій мозок скаже «спасибі»',
  'Готовий до нових інсайтів?','Світ чекає твого слова','На крок ближче до цілі','Твій інтелект в тонусі',
  'Натхнення починається тут','Стань кращою версією себе','Твій шлях до майстерства','Час відкривати горизонти',
  'Змусь думки літати','Твій пропуск у світ','Прокачай свій потенціал','Сьогодні — найкращий день для старту',
  'Будь на хвилі прогресу','Енергія твого розуму','Зробити крок до успіху','Твоє майбутнє починається зараз',
  'Твій інтелектуальний апгрейд','Час розширювати границі','Зарядись на успіх','Твій мозок у відмінній формі',
  'Готовий до нових звершень?','Світ заговорить з тобою','На крок попереду всіх','Твоя щоденна порція знань',
  'Натхнення в кожному слові','Стань майстром своєї справи','Твій персональний прорив','Час блискучати знаннями',
  'Зарядь розум на максимум','Твій мозок жадає відкриттів','Готовий здивувати весь світ?','Світ відкритий для тебе',
  'На крок ближче до мрії','Твій інтелект без меж','Натхнення в кожному кроці','Стань легендою сьогодні',
  'Твій інтелектуальний драйв','Час змінювати реальність','Зарядись на перемогу','Твій мозок в центрі подій',
  'Готовий до нових висот?','Світ розуміє тебе','На крок попереду вчорашнього','Твій безмежний потенціал',
  'Натхнення всередині тебе','Стань кращим у своїй справі','Твій інтелектуальний триумф','Час яскравих відкриттів',
  'Зарядись на результат','Твій розум — твоя сила','Готовий до нового виклику?','Світ чує тебе',
  'На крок ближче до ідеалу','Твій шлях до досконалості','Натхнення в деталях','Стань тим, кім мріяв',
  'Твій інтелектуальний кураж','Час думати ширше','Зарядись на максимум','Твій розум — твій капітал',
  'Готовий до нових інтриг?','Світ заграє барвами','На крок ближче до мрії','Твій шлях до свободи',
  'Натхнення в прогресі','Стань душею компанії',
];

export default function HomeScreen() {
  const router = useRouter();
  const { theme: t, isDark, f, themeMode } = useTheme();
  const { s, lang } = useLang();
  const isUK = lang === 'uk';
  const { goToTab, activeIdx, focusTick } = useTabNav();

  const [userName, setUserName]     = useState('');
  const [streak, setStreak]         = useState(0);
  const [totalXP, setTotalXP]       = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel]       = useState(0);
  const levelUpOpacity    = React.useRef(new Animated.Value(0)).current;
  const levelUpTranslateY = React.useRef(new Animated.Value(40)).current;
  const [weekDone, setWeekDone]     = useState<boolean[]>(new Array(7).fill(false));
  const [weekPoints, setWeekPoints] = useState(0);
  const [lessonsCompleted, setLessons] = useState(0);
  const [lastLesson, setLastLesson] = useState<{id:number;name:string;progress:number;score:string}|null>(null);
  const [greeting, setGreeting]     = useState('Привет,');
  const [taskProgress, setTaskProgress] = useState<TaskProgress[]>([]);
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const [engineLeague, setEngineLeague] = useState<typeof LEAGUES[0] | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [showHelpHint, setShowHelpHint] = useState(false);
  // [SRS] Количество фраз, готовых к повторению сегодня.
  // 0 = карточка «Повторить сегодня» скрыта (не мешает новым пользователям).
  // >0 = карточка появляется над блоком «Тест/Экзамен» и ведёт на /review.
  const [dueCount, setDueCount] = useState(0);
  const [userAvatar, setUserAvatar] = useState('🐣');
  const [userFrame, setUserFrame]   = useState('plain');
  // Бонусные баннеры
  const [loginBonus, setLoginBonus]     = useState<{ xp: number; cycle: number } | null>(null);
  const [showComebackBanner, setComebackBanner] = useState(false);
  const [showRepairCard, setShowRepairCard] = useState(false);
  const [repairProgress, setRepairProgress] = useState(0);
  const [freezeActive, setFreezeActive] = useState(false);
  const [homeStyle, setHomeStyle] = useState<'classic' | 'new'>('new');
  const [pageScrollEnabled, setPageScrollEnabled] = useState(true);
  const [medalCounts, setMedalCounts] = useState({ bronze: 0, silver: 0, gold: 0 });
  const [userLevel, setUserLevel] = useState<'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'>('A1');
  const [energyCount, setEnergyCount] = useState(5);
  const [timeUntilNextEnergy, setTimeUntilNextEnergy] = useState<string>('');
  const [shouldShake, setShouldShake] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const diagChecked = true;

  // Таймер для отсчёта энергии
  useEffect(() => {
    if (energyCount >= 5) return;

    const updateTimer = async () => {
      const { getTimeUntilNextRecovery, formatTimeUntilRecovery } = await import('../energy_system');
      const timeMs = await getTimeUntilNextRecovery();
      setTimeUntilNextEnergy(formatTimeUntilRecovery(timeMs));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [energyCount]);

  useEffect(() => {
    loadData();
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue:1, duration:380, useNativeDriver:true }).start();
  }, [lang]);

  useEffect(() => { loadData(); }, [focusTick]);
  useEffect(() => { if (activeIdx === 0) loadData(); }, [activeIdx]);

  const loadData = async () => {
    try {
      const [name, streakVal, weekData, weekPts, xpStored, premiumVal, avatarVal, frameVal, energyState] = await Promise.all([
        AsyncStorage.getItem('user_name'),
        AsyncStorage.getItem('streak_count'),
        AsyncStorage.getItem('week_days_done'),
        getMyWeekPoints(),
        AsyncStorage.getItem('user_total_xp'),
        AsyncStorage.getItem('premium_active'),
        AsyncStorage.getItem('user_avatar'),
        AsyncStorage.getItem('user_frame'),
        checkAndRecover(),
      ]);
      // Verify premium status via RevenueCat to prevent AsyncStorage tampering
      let verifiedPremium = premiumVal === 'true';
      if (!IS_EXPO_GO) {
        try {
          const info = await Promise.race([
            Purchases.getCustomerInfo(),
            new Promise<null>(resolve => setTimeout(() => resolve(null), 3000)),
          ]);
          if (info) {
            const rcActive = !!info.entitlements.active['premium']
              || info.activeSubscriptions.length > 0;
            verifiedPremium = rcActive;
            await AsyncStorage.setItem('premium_active', rcActive ? 'true' : 'false');
          }
        } catch (error) {
          DebugLogger.error('home.tsx:loadData:revenueCat', error, 'warning');
        }
      }
      setIsPremium(verifiedPremium);
      if (energyState) setEnergyCount(energyState.current);
      if (name) setUserName(name);
      if (streakVal) setStreak(parseInt(streakVal) || 0);
      if (xpStored) {
        const newXP  = parseInt(xpStored) || 0;
        const prevXP = parseInt(await AsyncStorage.getItem('user_prev_xp') || '0') || 0;
        setTotalXP(newXP);
        const curLvl = getLevelFromXP(newXP);
        setUserAvatar(avatarVal || getBestAvatarForLevel(curLvl));
        setUserFrame(frameVal  || getBestFrameForLevel(curLvl).id);

        // Set user level for daily phrase system
        const cefr = CEFR_FOR_LEVEL[curLvl] as 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
        setUserLevel(cefr);
        if (newXP > prevXP) {
          const prevLvl = getLevelFromXP(prevXP);
          const newLvl  = getLevelFromXP(newXP);
          if (newLvl > prevLvl) {
            setNewLevel(newLvl);
            // Auto-upgrade avatar & frame to best available for new level
            const newAv = getBestAvatarForLevel(newLvl);
            const newFr = getBestFrameForLevel(newLvl);
            setUserAvatar(newAv);
            setUserFrame(newFr.id);
            await AsyncStorage.multiSet([
              ['user_avatar', newAv],
              ['user_frame', newFr.id],
            ]);
            setTimeout(() => {
              setShowLevelUp(true);
              levelUpOpacity.setValue(0);
              levelUpTranslateY.setValue(40);
              Animated.parallel([
                Animated.spring(levelUpOpacity, { toValue:1, useNativeDriver:true, friction:6 }),
                Animated.spring(levelUpTranslateY, { toValue:0, useNativeDriver:true, friction:6 }),
              ]).start();
            }, 500);
          }
          await AsyncStorage.setItem('user_prev_xp', String(newXP));
        }
      }
      if (weekData) setWeekDone(JSON.parse(weekData));
      setWeekPoints(weekPts);

      const pool = lang === 'uk' ? GREETINGS_UK : GREETINGS_RU;
      if (pool.length > 0) {
        setGreeting(pool[Math.floor(Math.random() * pool.length)]);
      }

      let done = 0;
      const lessonKeys = Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_progress`);
      const lessonEntries = await AsyncStorage.multiGet(lessonKeys);
      for (const [, saved] of lessonEntries) {
        if (saved) {
          const p: string[] = JSON.parse(saved);
          const correct = p.filter(x => x === 'correct' || x === 'replay_correct').length;
          if (correct >= 45) done++;
        }
      }
      setLessons(done);

      const lastLessonId = await AsyncStorage.getItem('last_opened_lesson');
      const lastId = lastLessonId ? parseInt(lastLessonId) : null;
      if (lastId && lastId >= 1 && lastId <= 32) {
        const lessonNames = lang === 'uk' ? LESSON_NAMES_UK : LESSON_NAMES_RU;
        const saved = await AsyncStorage.getItem(`lesson${lastId}_progress`);
        if (saved) {
          const p: string[] = JSON.parse(saved);
          const correct = p.filter(x => x === 'correct' || x === 'replay_correct').length;
          // If lesson is complete (50/50), suggest the NEXT lesson instead
          if (correct >= 50 && lastId < 32) {
            const nextId = lastId + 1;
            const nextSaved = await AsyncStorage.getItem(`lesson${nextId}_progress`);
            if (nextSaved) {
              const np: string[] = JSON.parse(nextSaved);
              const nCorrect = np.filter(x => x === 'correct' || x === 'replay_correct').length;
              setLastLesson({ id: nextId, name: lessonNames[nextId - 1], progress: nCorrect, score: (nCorrect / 50 * 5).toFixed(1) });
            } else {
              setLastLesson({ id: nextId, name: lessonNames[nextId - 1], progress: 0, score: '0.0' });
            }
          } else {
            setLastLesson({ id: lastId, name: lessonNames[lastId - 1], progress: correct, score: (correct / 50 * 5).toFixed(1) });
          }
        } else {
          // No progress saved yet — still show the last opened lesson
          setLastLesson({ id: lastId, name: lessonNames[lastId - 1], progress: 0, score: '0.0' });
        }
      }

      const tp = await loadTodayProgress();
      setTaskProgress(tp);
      setTasksCompleted(tp.filter(p => p.claimed).length);

      const leagueState = await loadLeagueState();
      if (leagueState) setEngineLeague(LEAGUES.find(l => l.id === leagueState.leagueId) ?? null);

      const hintShown = await AsyncStorage.getItem('help_hint_shown');
      if (!hintShown) setShowHelpHint(true);

      // [SRS] Загружаем количество фраз для повторения.
      // Лимит 50 — чтобы не тормозить loadData на больших базах, нам нужен только count.
      // Обновляется при каждом фокусе на таб Home (через focusTick и activeIdx).
      // После сессии в review.tsx dueCount обнулится, карточка исчезнет.
      const dueItems = await getDueItems(50);
      setDueCount(dueItems.length);

      // [BANNERS] Login bonus, comeback, personal best, streak repair
      const bonusRaw = await AsyncStorage.getItem('login_bonus_pending');
      if (bonusRaw) {
        setLoginBonus(JSON.parse(bonusRaw));
        await AsyncStorage.removeItem('login_bonus_pending');
      }
      const comebackRaw = await AsyncStorage.getItem('comeback_pending');
      if (comebackRaw) {
        setComebackBanner(true);
        await AsyncStorage.removeItem('comeback_pending');
      }
      // Personal best: обновляем рекорд без показа баннера (баннер убран — слишком часто срабатывал)
      const pbRaw = await AsyncStorage.getItem('weekly_pb_v1');
      const pb = pbRaw ? JSON.parse(pbRaw) : { bestXP: 0 };
      if (weekPts > pb.bestXP) {
        await AsyncStorage.setItem('weekly_pb_v1', JSON.stringify({ bestXP: weekPts }));
      }
      // Streak repair eligibility
      const repairEligible = await isRepairEligible();
      if (repairEligible) {
        setShowRepairCard(true);
        const progress = await getRepairProgress();
        setRepairProgress(progress.lessons);
      }

      // Streak freeze indicator
      const freezeRaw = await AsyncStorage.getItem('streak_freeze');
      const freeze = freezeRaw ? JSON.parse(freezeRaw) : null;
      setFreezeActive(!!(freeze?.active));

      // Home layout style
      const styleVal = await AsyncStorage.getItem('home_style');
      setHomeStyle((styleVal as 'classic' | 'new') || 'new');

      // Medal counts
      const allMedals = await loadAllMedals();
      setMedalCounts(countMedals(allMedals));

      // [STREAK PAYWALL] Если пользователь пропустил вчерашний день (стрик сгорит
      // при первой активности) и нет Premium — показываем paywall один раз в день.
      // checkStreakLossPending не изменяет storage — только читает.
      if (premiumVal !== 'true') {
        const today = new Date().toISOString().split('T')[0];
        const shownToday = await AsyncStorage.getItem('streak_paywall_shown');
        if (shownToday !== today) {
          const { willLose, streakBefore } = await checkStreakLossPending();
          if (willLose) {
            await AsyncStorage.setItem('streak_paywall_shown', today);
            router.push(`/premium_modal?context=streak&streak=${streakBefore}`);
          }
        }
      }
    } catch (error) {
      DebugLogger.error('home.tsx:checkDailyReward', error, 'warning');
    }
  };

  const dismissHelpHint = async () => {
    setShowHelpHint(false);
    await AsyncStorage.setItem('help_hint_shown', 'true');
  };

  const league = getLeague(weekPoints, lang);
  const leagueFromEngine = LEAGUES.find(l =>
    l.nameRU === league.name || l.nameUK === league.name
  ) ?? LEAGUES[0];

  const weekDays = lang === 'uk'
    ? ['Пн','Вт','Ср','Чт','Пт','Сб','Нд']
    : ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  const todayIdx = (new Date().getDay() + 6) % 7;

  const TAB_IDX: Record<string, number> = {
    '/(tabs)/index': 1, 'index': 1,
    '/(tabs)/quizzes': 2, 'quizzes': 2,
    '/(tabs)/hall_of_fame': 3, 'hall_of_fame': 3,
    '/(tabs)/settings': 4, 'settings': 4,
  };
  const go = (path: string) => {
    if (!DEV_MODE && !isPremium && (path.includes('quizzes') || path.includes('hall_of_fame'))) {
      router.push('/premium_modal'); return;
    }
    const tabIdx = TAB_IDX[path];
    if (tabIdx !== undefined) { goToTab(tabIdx); return; }
    router.push(path as any);
  };

  const dotActive   = t.textSecond;
  const dotToday    = t.textPrimary;
  const dotEmpty    = t.bgSurface2;
  const dayLblColor = t.textMuted;

  if (!diagChecked) return <ScreenGradient><View /></ScreenGradient>;

  // ── Общие баннеры (используются в обоих стилях) ──────────────────────────
  const bannersJSX = (
    <>
      {showHelpHint && (
        <View style={{ marginHorizontal:16, marginBottom:10, backgroundColor:t.bgCard, borderRadius:16, padding:14, flexDirection:'row', alignItems:'center', gap:10, borderWidth:0.5, borderColor:t.border }}>
          <Ionicons name="help-circle-outline" size={26} color={t.textSecond} />
          <View style={{ flex:1 }}>
            <Text style={{ color:t.textPrimary, fontSize:f.body, fontWeight:'700' }}>{isUK ? 'Перший раз тут?' : 'Впервые здесь?'}</Text>
            <Text style={{ color:t.textMuted, fontSize:f.caption, marginTop:2 }}>{isUK ? 'Розділ Довідка пояснює всі функції' : 'Раздел Помощь объясняет все функции'}</Text>
          </View>
          <TouchableOpacity onPress={() => { dismissHelpHint(); router.push('/help'); }} style={{ backgroundColor:t.correct, borderRadius:10, paddingHorizontal:10, paddingVertical:7 }}>
            <Text style={{ color:t.correctText, fontSize:f.caption, fontWeight:'700' }}>{isUK ? 'Відкрити' : 'Открыть'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={dismissHelpHint} style={{ padding:4 }}><Ionicons name="close" size={18} color={t.textMuted} /></TouchableOpacity>
        </View>
      )}
      {loginBonus && (
        <View style={{ marginHorizontal:16, marginBottom:10, backgroundColor:t.bgCard, borderRadius:16, padding:14, flexDirection:'row', alignItems:'center', gap:10, borderWidth:1, borderColor:t.textSecond+'66' }}>
          <Text style={{ fontSize:28 }}>{loginBonus.cycle===7?'🎁':'🎉'}</Text>
          <View style={{ flex:1 }}>
            <Text style={{ color:t.textPrimary, fontSize:f.body, fontWeight:'700' }}>{isUK?'Бонус за вхід!':'Бонус за вход!'}{loginBonus.cycle===7?' День 7 🔥':''}</Text>
            <Text style={{ color:t.textMuted, fontSize:f.sub, marginTop:2 }}>+{loginBonus.xp} XP · {isUK?`день ${loginBonus.cycle}`:`день ${loginBonus.cycle}`}</Text>
          </View>
          <TouchableOpacity onPress={()=>setLoginBonus(null)} style={{padding:4}}><Ionicons name="close" size={18} color={t.textMuted}/></TouchableOpacity>
        </View>
      )}
      {showComebackBanner && (
        <View style={{ marginHorizontal:16, marginBottom:10, backgroundColor:t.bgCard, borderRadius:16, padding:14, flexDirection:'row', alignItems:'center', gap:10, borderWidth:1, borderColor:'#FF9500'+'88' }}>
          <Text style={{ fontSize:28 }}>🚀</Text>
          <View style={{ flex:1 }}>
            <Text style={{ color:t.textPrimary, fontSize:f.body, fontWeight:'700' }}>{isUK?'З поверненням!':'С возвращением!'}</Text>
            <Text style={{ color:t.textMuted, fontSize:f.sub, marginTop:2 }}>{isUK?'Весь день — ×2 XP за кожну правильну відповідь':'Весь день — ×2 XP за каждый правильный ответ'}</Text>
          </View>
          <TouchableOpacity onPress={()=>setComebackBanner(false)} style={{padding:4}}><Ionicons name="close" size={18} color={t.textMuted}/></TouchableOpacity>
        </View>
      )}
      {showRepairCard && (
        <View style={{ marginHorizontal:16, marginBottom:10, backgroundColor:t.bgCard, borderRadius:16, padding:14, borderWidth:1, borderColor:'#FF9500'+'99' }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:10, marginBottom:8 }}>
            <Text style={{ fontSize:26 }}>🛠️</Text>
            <View style={{ flex:1 }}>
              <Text style={{ color:t.textPrimary, fontSize:f.body, fontWeight:'700' }}>{isUK?'Полагодь стрік!':'Почини стрик!'}</Text>
              <Text style={{ color:t.textMuted, fontSize:f.sub, marginTop:2 }}>{isUK?`Пройди 2 уроки сьогодні, щоб зберегти стрік · ${repairProgress}/2`:`Пройди 2 урока сегодня, чтобы сохранить стрик · ${repairProgress}/2`}</Text>
            </View>
            <TouchableOpacity onPress={()=>setShowRepairCard(false)} style={{padding:4}}><Ionicons name="close" size={18} color={t.textMuted}/></TouchableOpacity>
          </View>
          <View style={{ height:6, backgroundColor:t.bgSurface2, borderRadius:3 }}>
            <View style={{ height:6, width:`${repairProgress/2*100}%` as any, backgroundColor:'#FF9500', borderRadius:3 }} />
          </View>
        </View>
      )}
    </>
  );

  // ── Новый стиль главного экрана ──────────────────────────────────────────
  const renderNewHome = () => {
    const { level, xpInLevel, xpNeeded, progress } = getXPProgress(totalXP);
    const cefr = CEFR_FOR_LEVEL(level);
    const PILL_W = (CONTENT_W - 32 - 30) / 4;  // 4 пилюли равной ширины
    const quickItems = [
      { icon:'book' as const,         label:isUK?'Уроки':'Уроки',       sub:`32 ${isUK?'уроки':'урока'}`,           path:'index' },
      { icon:'chatbubbles' as const,  label:isUK?'Діалоги':'Диалоги',  sub:`20 ${isUK?'сценаріїв':'сценариев'}`, path:'/dialogs' },
      { icon:'trophy-outline' as const, label:isUK?'Квізи':'Квизы',     sub:`3 ${isUK?'рівні':'уровня'}`,            path:'/(tabs)/quizzes' },
      { icon:'bookmark' as const,     label:isUK?'Картки':'Карточки',   sub:isUK?'Збережені':'Сохранённые', path:'/flashcards' },
    ];
    // Порядок: Задания | Клуб / Тест знаний | Экзамен
    const gridItems = [
      {
        iconName:'flash' as const, iconColor:t.accent,
        label:isUK?'Завдання':'Задания',
        path:'/daily_tasks_screen',
        isTasksBlock: true,
      },
      {
        iconName:(engineLeague?.ionIcon ?? leagueFromEngine.ionIcon ?? 'trophy') as any,
        iconColor: engineLeague?.color ?? leagueFromEngine.color ?? '#FFD700',
        label:isUK?'Клуб':'Клуб',
        sub:engineLeague?(isUK?engineLeague.nameUK:engineLeague.nameRU):league.name,
        path:'/league_screen',
        pct: null,
      },
      {
        iconName:'analytics' as const, iconColor:t.textSecond,
        label:isUK?'Тест знань':'Тест знаний',
        sub:isUK?'Дізнайся рівень':'Узнай уровень',
        path:'/diagnostic_test',
        pct: null,
      },
      {
        iconName:'school' as const, iconColor:t.correct,
        label:isUK?'Іспит':'Экзамен',
        sub:`${lessonsCompleted}/32 ${isUK?'уроків':'уроков'}`,
        path:'/exam',
        pct: lessonsCompleted/32,
      },
    ];

    return (
      <ScrollView scrollEnabled={pageScrollEnabled} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:32, paddingTop:6 }}>
        <Animated.View style={{ opacity:fadeAnim, overflow:'visible' }}>

          {/* ХЕДЕР */}
          <View style={{ flexDirection:'row', alignItems:'flex-start', padding:20, paddingBottom:12, gap:8 }}>
            <View style={{ flex:1 }}>
              <Text style={{ color:t.textMuted, fontSize:f.caption }}>{greeting}</Text>
              <Text style={{ color:t.textPrimary, fontSize:f.h1, fontWeight:'700', marginTop:2 }}>{userName||'...'}</Text>
            </View>
            <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
              <View style={{ alignItems:'center' }}>
                <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', height:28, marginLeft: -40 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <View key={i} style={{ marginLeft: i > 0 ? -10 : 0 }}>
                      <EnergyIcon
                        filled={i < energyCount}
                        themeColor={i < energyCount ? t.gold : t.textGhost}
                        size={18}
                        animateChange={true}
                        shouldShake={shouldShake}
                      />
                    </View>
                  ))}
                </View>
                {energyCount < 5 && timeUntilNextEnergy && (
                  <Text style={{ fontSize: 10, color: t.textMuted, marginTop: 4, fontWeight: '500' }}>
                    {timeUntilNextEnergy}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={()=>router.push('/avatar_select')}>
                <AnimatedFrame image={/^\d+$/.test(userAvatar) ? getAvatarImageByIndex(parseInt(userAvatar)) : undefined} emoji={userAvatar} frameId={userFrame} size={40} />
              </TouchableOpacity>
            </View>
          </View>

          {bannersJSX}

          {/* Club Boost Bar */}
          <ActiveBoostBar containerStyle={{ marginHorizontal:0, marginBottom:12 }} />

          {/* ── ГЕРОЙ: Уровень + Цепочка ── */}
          <TouchableOpacity activeOpacity={0.88} onPress={()=>router.push('/streak_stats')} style={{ marginHorizontal:16, marginBottom:12 }}>
            <View style={{ borderRadius:24, backgroundColor:t.bgCard, borderWidth:0.5, borderColor:t.border, padding:20 }}>
              {/* Декоративные круги — в отдельном контейнере чтобы не обрезать текст */}
              <View style={{ position:'absolute', top:0, left:0, right:0, bottom:0, borderRadius:24, overflow:'hidden' }} pointerEvents="none">
                <View style={{ position:'absolute', top:-30, right:-20, width:110, height:110, borderRadius:55, backgroundColor:t.textSecond+'12' }} />
                <View style={{ position:'absolute', bottom:-20, left:-10, width:70, height:70, borderRadius:35, backgroundColor:t.correct+'10' }} />
              </View>

              {/* Верхняя строка: Уровень + Цепочка */}
              <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
                <View style={{ flex:1 }}>
                  <Text style={{ color:t.textMuted, fontSize:10, textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>{isUK?'Рівень':'Уровень'}</Text>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                    <LevelBadge level={level} size={34} />
                    <View style={{ flex:1 }}>
                      <Text style={{ color:t.textPrimary, fontSize:18, fontWeight:'800', lineHeight:22 }} numberOfLines={1}>{isUK?'Рівень':'Уровень'} {level}</Text>
                      <Text style={{ color:t.textSecond, fontSize:13 }}>{cefr}</Text>
                    </View>
                  </View>
                </View>
                <View style={{ alignItems:'flex-end', marginLeft:12 }}>
                  <Text style={{ color:t.textMuted, fontSize:10, textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>{isUK?'Ланцюжок':'Цепочка'}</Text>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
                    <Text style={{ color:t.textPrimary, fontSize:26, fontWeight:'800', lineHeight:30 }}>{streak}</Text>
                    <Ionicons name="flame" size={24} color={streak>0?'#FF6B35':t.textGhost} />
                  </View>
                  <Text style={{ color:t.textSecond, fontSize:12 }} numberOfLines={1}>{isUK?'днів поспіль':'дней подряд'}</Text>
                </View>
              </View>

              {/* Прогресс XP — толще */}
              <View style={{ marginBottom:14 }}>
                <View style={{ height:9, backgroundColor:t.bgSurface, borderRadius:5, overflow:'hidden' }}>
                  <View style={{ width:`${Math.min(100,Math.round(progress*100))}%` as any, height:'100%', borderRadius:5, backgroundColor:t.gold }} />
                </View>
                <View style={{ flexDirection:'row', justifyContent:'space-between', marginTop:5 }}>
                  <Text style={{ color:t.textMuted, fontSize:f.label }}>{xpInLevel} / {xpNeeded} XP</Text>
                </View>
              </View>

              {/* Точки недели — крупнее */}
              <View style={{ flexDirection:'row', justifyContent:'space-between', paddingHorizontal:4 }}>
                {weekDays.map((d,i)=>(
                  <View key={i} style={{ alignItems:'center', gap:5 }}>
                    <View style={{ width:14, height:14, borderRadius:7, backgroundColor: weekDone[i]?t.correct:(i===todayIdx?t.textPrimary+'99':t.bgSurface2) }} />
                    <Text style={{ color:t.textMuted, fontSize:11, fontWeight:'500' }}>{d}</Text>
                  </View>
                ))}
              </View>
            </View>
          </TouchableOpacity>

          {/* ПРОДОЛЖИТЬ УРОК */}
          <PremiumCard
            level={3}
            onPress={()=>router.push({ pathname:'/lesson_menu', params:{ id:lastLesson?.id??1 } })}
            style={{ marginHorizontal:16, marginBottom:12 }}
            innerStyle={{ padding:16, flexDirection:'row', alignItems:'center', gap:14 }}
          >
            <CircularProgress
              pct={lastLesson?Math.round(lastLesson.progress/50*100):0}
              size={52} sw={5} color={t.accent} bg={t.bgSurface}
              textColor={t.textPrimary} fontSize={10}
            />
            <View style={{ flex:1 }}>
              <Text style={{ color:t.textMuted, fontSize:10, fontWeight:'700', textTransform:'uppercase', letterSpacing:0.6 }}>
                {lastLesson?(isUK?'Продовжити':'Продолжить'):(isUK?'Почати':'Начать')}
              </Text>
              <Text style={{ color:t.textPrimary, fontSize:f.bodyLg, fontWeight:'700', marginTop:3 }}>
                {lastLesson?`Урок ${lastLesson.id} — ${lastLesson.name}`:'Урок 1 — To Be'}
              </Text>
              {lastLesson && <Text style={{ color:t.textMuted, fontSize:f.label, marginTop:2 }}>★ {lastLesson.score} · {lastLesson.progress}/50</Text>}
            </View>
            <Ionicons name="chevron-forward" size={20} color={t.textGhost} />
          </PremiumCard>

          {/* ГОРИЗОНТАЛЬНЫЙ СКРОЛЛ: быстрый доступ — равные пилюли */}
          <View style={{ marginBottom:12 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled={true}
              scrollEventThrottle={16}
              bounces={false}
              overScrollMode="never"
              contentContainerStyle={{ paddingHorizontal:16, gap:10 }}
            >
              {quickItems.map(item=>(
                <TouchableOpacity
                  key={item.label}
                  activeOpacity={0.8}
                  onPress={() => {
                    go(item.path);
                  }}
                  style={{ backgroundColor:t.bgCard, borderRadius:18, borderWidth:0.5, borderColor:t.border, paddingHorizontal:10, paddingVertical:14, alignItems:'center', gap:5, width:PILL_W }}
                >
                  <Ionicons name={item.icon} size={26} color={t.accent} />
                  <Text style={{ color:t.textPrimary, fontSize:f.label, fontWeight:'700', textAlign:'center' }} numberOfLines={1}>{item.label}</Text>
                  <Text style={{ color:t.textMuted, fontSize:9, textAlign:'center' }} numberOfLines={1}>{item.sub}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* SRS ПОВТОРЕНИЕ — только если есть карточки */}
          {dueCount > 0 && (
            <View style={{ paddingHorizontal:16, marginBottom:12 }}>
              <TouchableOpacity activeOpacity={0.85} onPress={()=>router.push('/review')}
                style={{ flexDirection:'row', alignItems:'center', gap:12, backgroundColor:t.bgCard, borderRadius:16, borderWidth:0.5, borderColor:t.border, padding:14 }}
              >
                <View style={{ width:40, height:40, borderRadius:12, backgroundColor:t.accentBg, justifyContent:'center', alignItems:'center' }}>
                  <Ionicons name="repeat" size={22} color={t.accent} />
                </View>
                <View style={{ flex:1 }}>
                  <Text style={{ color:t.textPrimary, fontSize:f.body, fontWeight:'700' }}>{isUK?'Повторити сьогодні':'Повторить сегодня'}</Text>
                  <Text style={{ color:t.textSecond, fontSize:f.label, marginTop:1 }}>
                    {dueCount} {isUK?(dueCount===1?'фраза':dueCount<5?'фрази':'фраз'):(dueCount===1?'фраза':dueCount<5?'фразы':'фраз')}
                  </Text>
                </View>
                <View style={{ backgroundColor:t.accent, borderRadius:14, paddingHorizontal:10, paddingVertical:5 }}>
                  <Text style={{ color:t.bgPrimary, fontSize:f.label, fontWeight:'700' }}>{isUK?'Почати':'Начать'}</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* СЕТКА 2×2: Задания|Клуб / Тест знаний|Экзамен */}
          <View style={{ paddingHorizontal:16, gap:10, marginBottom:10 }}>
            {[[gridItems[0], gridItems[1]], [gridItems[2], gridItems[3]]].map((row,ri)=>(
              <View key={ri} style={{ flexDirection:'row', gap:10 }}>
                {row.map(item=>(
                  <TouchableOpacity
                    key={item.label}
                    activeOpacity={0.85}
                    onPress={()=>go(item.path)}
                    style={{ flex:1, backgroundColor:t.bgCard, borderRadius:20, borderWidth:0.5, borderColor:t.border, padding:20, alignItems:'center', justifyContent:'center', minHeight:130 }}
                  >
                    <View style={{ width:72, height:72, borderRadius:item.label === (isUK ? 'Клуб' : 'Клуб') ? 0 : 18, backgroundColor:item.label === (isUK ? 'Клуб' : 'Клуб') ? 'transparent' : item.iconColor+'22', justifyContent:'center', alignItems:'center', marginBottom:10 }}>
                      {item.label === (isUK ? 'Клуб' : 'Клуб') && engineLeague?.imageUri ? (
                        <Image source={engineLeague.imageUri} style={{ width:72, height:72 }} resizeMode="contain" />
                      ) : (
                        <Ionicons name={item.iconName} size={40} color={item.iconColor} />
                      )}
                    </View>
                    <Text style={{ color:t.textPrimary, fontSize:f.bodyLg, fontWeight:'700', textAlign:'center', marginBottom:4 }}>{item.label}</Text>
                    {item.isTasksBlock ? (
                      <View style={{ width:'100%', marginTop:8 }}>
                        <View style={{ flexDirection:'row', gap:6 }}>
                          {[0,1,2].map(ti => {
                            const tp = taskProgress[ti];
                            const done = tp?.claimed ?? false;
                            return (
                              <View key={ti} style={{ flex:1, height:6, backgroundColor:t.bgSurface2, borderRadius:3, overflow:'hidden' }}>
                                {done && <View style={{ width:'100%', height:'100%', backgroundColor:t.correct, borderRadius:3 }} />}
                              </View>
                            );
                          })}
                        </View>
                        <Text style={{ color:t.textMuted, fontSize:f.label, textAlign:'center', marginTop:6 }}>{tasksCompleted}/3 {isUK?'виконано':'выполнено'}</Text>
                      </View>
                    ) : (
                      <>
                        {item.sub && <Text style={{ color:t.textMuted, fontSize:f.label, textAlign:'center' }}>{item.sub}</Text>}
                        {item.pct !== null && item.pct !== undefined && (
                          <View style={{ width:'100%', height:4, backgroundColor:t.bgSurface2, borderRadius:2, marginTop:8, overflow:'hidden' }}>
                            <View style={{ width:`${Math.round((item.pct as number)*100)}%` as any, height:'100%', backgroundColor:t.correct, borderRadius:2 }} />
                          </View>
                        )}
                      </>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>

          {/* ── ФРАЗА ДНЯ ── */}
          <DailyPhraseCard userLevel={userLevel} />

          {/* Подвал */}
          <View style={{ alignItems:'center', paddingVertical:32, marginTop:20, borderTopWidth:0.5, borderTopColor:t.border }}>
            <Text style={{ color:t.textMuted, fontSize:f.caption, fontWeight:'600', letterSpacing:0.5 }}>
              PHRASEMAN
            </Text>
            <Text style={{ color:t.textMuted, fontSize:f.caption, marginTop:4 }}>
              by Professor Lingman
            </Text>
          </View>

        </Animated.View>
      </ScrollView>
    );
  };

  return (
    <View style={{ flex:1 }}>
      <ScreenGradient>
      <View style={{ flex:1 }}>
      {homeStyle === 'new' ? renderNewHome() : (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:32 }}>
        <Animated.View style={{ opacity:fadeAnim }}>

          {/* ХЕДЕР */}
          <View style={{ flexDirection:'row', alignItems:'center', padding:20, paddingBottom:12, gap:12 }}>
            <View style={{ flex:1 }}>
              <Text style={{ color:t.textMuted, fontSize:f.caption }}>{greeting}</Text>
              <Text style={{ color:t.textPrimary, fontSize:f.h1, fontWeight:'700', marginTop:2 }}>{userName || '...'}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/avatar_select')}>
              <AnimatedFrame image={/^\d+$/.test(userAvatar) ? getAvatarImageByIndex(parseInt(userAvatar)) : undefined} emoji={userAvatar} frameId={userFrame} size={40} />
            </TouchableOpacity>
          </View>

          {bannersJSX}

          {/* ЦЕПОЧКА */}
          <PremiumCard
            level={2}
            onPress={() => router.push('/streak_stats')}
            style={{ marginHorizontal:16, marginBottom:10 }}
            innerStyle={{ padding:16, flexDirection:'row', alignItems:'center', gap:12 }}
          >
            <View style={{ flexDirection:'row', alignItems:'center', gap:10, flex:1 }}>
              <Ionicons name="flame" size={28} color={streak > 0 ? '#FF6B35' : t.textGhost} />
              <View>
                <Text style={{ color:t.textMuted, fontSize:10, textTransform:'uppercase', letterSpacing:0.8 }}>
                  {lang === 'uk' ? 'Ланцюжок' : 'Цепочка'}
                </Text>
                <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                  <Text style={{ color:t.textPrimary, fontSize:f.numLg, fontWeight:'700', lineHeight:32 }}>{streak}</Text>
                  {freezeActive && (
                    <View style={{ backgroundColor:'#4A90D9'+'33', borderRadius:8, paddingHorizontal:6, paddingVertical:2 }}>
                      <Text style={{ fontSize:14 }}>🧊</Text>
                    </View>
                  )}
                </View>
                <Text style={{ color:t.textSecond, fontSize:f.label }}>{lang === 'uk' ? 'днів поспіль' : 'дней подряд'}</Text>
              </View>
            </View>
            <View style={{ flexDirection:'row', gap:6 }}>
              {weekDays.map((d, i) => (
                <View key={i} style={{ alignItems:'center', gap:4 }}>
                  <View style={[
                    { width:10, height:10, borderRadius:5 },
                    { backgroundColor: dotEmpty },
                    weekDone[i] && { backgroundColor: dotActive },
                    i === todayIdx && !weekDone[i] && { backgroundColor: dotToday },
                  ]} />
                  <Text style={{ color:dayLblColor, fontSize:8, fontWeight:'500' }}>{d}</Text>
                </View>
              ))}
            </View>
            <Ionicons name="chevron-forward" size={16} color={t.textGhost} />
          </PremiumCard>

          {/* УРОВЕНЬ XP */}
          {(() => {
            const { level, xpInLevel, xpNeeded, progress } = getXPProgress(totalXP);
            const cefr = CEFR_FOR_LEVEL(level);
            return (
              <PremiumCard
                level={2}
                onPress={() => router.push({ pathname:'/streak_stats', params:{ section:'level' } })}
                style={{ marginHorizontal:16, marginBottom:10 }}
                innerStyle={{ padding:14 }}
              >
                <View style={{ flexDirection:'row', alignItems:'center', gap:10, marginBottom:6 }}>
                  <LevelBadge level={level} size={36} />
                  <Text style={{ color:t.textPrimary, fontSize: f.sub, fontWeight:'600', flex:1 }}>
                    {lang === 'uk' ? `Рівень ${level} · ${cefr}` : `Уровень ${level} · ${cefr}`}
                  </Text>
                </View>
                {/* Прогресс-бар */}
                <View style={{ height:5, backgroundColor:t.bgSurface, borderRadius:3, overflow:'hidden', marginBottom:4 }}>
                  <View style={{ width:`${Math.min(100,Math.round(progress*100))}%` as any, height:'100%', borderRadius:3, backgroundColor:t.gold }} />
                </View>
              </PremiumCard>
            );
          })()}

          {/* ПРОДОЛЖИТЬ УРОК */}
          <PremiumCard
            level={3}
            onPress={() => router.push({ pathname:'/lesson_menu', params:{ id: lastLesson?.id ?? 1 } })}
            style={{ marginHorizontal:16, marginBottom:10 }}
            innerStyle={{ padding:16, flexDirection:'row', alignItems:'center', gap:14 }}
          >
            {/* Круговой прогресс урока */}
            <CircularProgress
              pct={lastLesson ? Math.round(lastLesson.progress / 50 * 100) : 0}
              size={52}
              sw={4}
              color={t.accent}
              bg={t.bgSurface}
              textColor={t.textPrimary}
              fontSize={10}
            />
            <View style={{ flex:1 }}>
              <Text style={{ color:t.textMuted, fontSize:10, fontWeight:'700', textTransform:'uppercase', letterSpacing:0.6 }}>
                {lastLesson ? (lang === 'uk' ? 'Продовжити' : 'Продолжить') : (lang === 'uk' ? 'Почати' : 'Начать')}
              </Text>
              <Text style={{ color:t.textPrimary, fontSize:f.h2, fontWeight:'700', marginTop:3 }}>
                {lastLesson ? `Урок ${lastLesson.id} — ${lastLesson.name}` : 'Урок 1 — To Be'}
              </Text>
              {lastLesson && (
                <Text style={{ color:t.textMuted, fontSize:f.label, marginTop:3 }}>
                  ★ {lastLesson.score} · {lastLesson.progress}/50
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={22} color={t.textGhost} />
          </PremiumCard>

          {/* ПРОГРЕСС КУРСА */}
          <View style={{ marginHorizontal:16, marginBottom:10, flexDirection:'row', alignItems:'center', gap:10 }}>
            <View style={{ flex:1, height:4, backgroundColor:t.bgSurface, borderRadius:2, overflow:'hidden' }}>
              <View style={{ width:`${Math.round(lessonsCompleted / 32 * 100)}%` as any, height:'100%', backgroundColor:t.accent, borderRadius:2 }} />
            </View>
            <Text style={{ color:t.textMuted, fontSize:f.label, fontWeight:'600', minWidth:40 }}>
              {lessonsCompleted}/32 {lang === 'uk' ? 'ур.' : 'ур.'}
            </Text>
          </View>

          {/* МЕДАЛИ */}
          {(medalCounts.bronze > 0 || medalCounts.silver > 0 || medalCounts.gold > 0) && (
            <View style={{ marginHorizontal:16, marginBottom:10, flexDirection:'row', gap:8 }}>
              {medalCounts.bronze > 0 && (
                <View style={{ flex:1, backgroundColor:t.bgCard, borderRadius:14, borderWidth:0.5, borderColor:'#8B4513'+'44', padding:10, alignItems:'center', gap:3 }}>
                  <Text style={{ fontSize:18 }}>🥉</Text>
                  <Text style={{ color:'#CD7F32', fontSize:f.h2, fontWeight:'700' }}>{medalCounts.bronze}</Text>
                  <Text style={{ color:t.textMuted, fontSize:f.caption }}>{lang==='uk'?'Бронза':'Бронза'}</Text>
                </View>
              )}
              {medalCounts.silver > 0 && (
                <View style={{ flex:1, backgroundColor:t.bgCard, borderRadius:14, borderWidth:0.5, borderColor:'#C0C0C0'+'44', padding:10, alignItems:'center', gap:3 }}>
                  <Text style={{ fontSize:18 }}>🥈</Text>
                  <Text style={{ color:'#C0C0C0', fontSize:f.h2, fontWeight:'700' }}>{medalCounts.silver}</Text>
                  <Text style={{ color:t.textMuted, fontSize:f.caption }}>{lang==='uk'?'Срібло':'Серебро'}</Text>
                </View>
              )}
              {medalCounts.gold > 0 && (
                <View style={{ flex:1, backgroundColor:t.bgCard, borderRadius:14, borderWidth:0.5, borderColor:'#FFD700'+'44', padding:10, alignItems:'center', gap:3 }}>
                  <Text style={{ fontSize:18 }}>🥇</Text>
                  <Text style={{ color:'#FFD700', fontSize:f.h2, fontWeight:'700' }}>{medalCounts.gold}</Text>
                  <Text style={{ color:t.textMuted, fontSize:f.caption }}>{lang==='uk'?'Золото':'Золото'}</Text>
                </View>
              )}
            </View>
          )}

          {/* ЛИГА */}
          <PremiumCard
            level={2}
            onPress={() => router.push('/league_screen')}
            style={{ marginHorizontal:16, marginBottom:10 }}
            innerStyle={{ padding:16, flexDirection:'row', alignItems:'center', gap:12 }}
          >
            <View style={{
              width:42, height:42, borderRadius:21,
              backgroundColor:(engineLeague?.color ?? leagueFromEngine.color ?? '#FFD700')+'22',
              justifyContent:'center', alignItems:'center',
            }}>
              <Ionicons name={(engineLeague?.ionIcon ?? leagueFromEngine.ionIcon ?? 'trophy') as any} size={22} color={engineLeague?.color ?? leagueFromEngine.color ?? '#FFD700'} />
            </View>
            <View style={{ flex:1, marginLeft:4 }}>
              <Text style={{ color:t.textMuted, fontSize:10, textTransform:'uppercase', letterSpacing:0.7 }}>
                {lang === 'uk' ? 'КЛУБ ТИЖНЯ' : 'КЛУБ НЕДЕЛИ'}
              </Text>
              <Text style={{ color:t.textPrimary, fontSize:f.h2, fontWeight:'700', marginTop:2 }}>{engineLeague ? (isUK ? engineLeague.nameUK : engineLeague.nameRU) : league.name}</Text>
              <Text style={{ color:t.textSecond, fontSize:f.label, marginTop:1 }}>
                {weekPoints} {lang === 'uk' ? 'досвіду' : 'опыта'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.textGhost} />
          </PremiumCard>

          {/* СЕТКА 2×2 — Уроки / Квизы */}
          <View style={{ flexDirection:'row', flexWrap:'wrap', paddingHorizontal:16, gap:10, marginBottom:10 }}>
            {([
              { key:'lessons', icon:'book-outline',     label:s.tabs.lessons,  sub:lang==='uk'?'32 уроки':'32 урока',           path:'index',            locked:false },
              { key:'quizzes', icon:'aperture-outline', label:s.tabs.quizzes,  sub:lang==='uk'?'3 рівні':'3 уровня',             path:'/(tabs)/quizzes', locked:!DEV_MODE && !isPremium },
            ] as const).map(item => (
              <PremiumCard
                key={item.key}
                level={2}
                onPress={() => go(item.path)}
                disabled={false}
                style={{ width:CARD_W, opacity:item.locked ? 0.6 : 1 }}
                innerStyle={{ padding:16 }}
              >
                <View style={{
                  width:40, height:40, borderRadius:20,
                  backgroundColor:t.bgSurface,
                  borderTopWidth:0.5, borderLeftWidth:0.5,
                  borderRightWidth:0.5, borderBottomWidth:0.5,
                  borderTopColor:t.borderHighlight, borderLeftColor:t.borderHighlight,
                  borderRightColor:t.border, borderBottomColor:t.border,
                  justifyContent:'center', alignItems:'center',
                  marginBottom:10,
                }}>
                  <Ionicons name={item.icon as any} size={22} color={t.textSecond} />
                </View>
                <Text style={{ color:t.textPrimary, fontSize:f.bodyLg, fontWeight:'600' }}>{item.label}</Text>
                {item.locked
                  ? <View style={{ flexDirection:'row', alignItems:'center', backgroundColor:t.accentBg, borderRadius:6, paddingHorizontal:6, paddingVertical:3, marginTop:5, alignSelf:'flex-start' }}>
                      <Ionicons name="lock-closed" size={9} color={t.textSecond} />
                      <Text style={{ color:t.textSecond, fontSize:9, fontWeight:'600', marginLeft:2 }}>Premium</Text>
                    </View>
                  : <Text style={{ color:t.textMuted, fontSize:f.label, marginTop:3 }}>{item.sub}</Text>
                }
              </PremiumCard>
            ))}
          </View>

          {/* ЗАДАНИЯ ДНЯ + ДИАЛОГИ */}
          <View style={{ flexDirection:'row', gap:10, paddingHorizontal:16, marginBottom:10 }}>
            <PremiumCard
              level={2}
              onPress={() => router.push('/daily_tasks_screen')}
              style={{ flex:1 }}
              innerStyle={{ padding:16 }}
            >
              <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:8 }}>
                <Text style={{ fontSize:22 }}>⚡</Text>
                <Text style={{ color:t.textPrimary, fontSize:f.body, fontWeight:'700' }}>
                  {lang === 'uk' ? 'Завдання' : 'Задания'}
                </Text>
              </View>
              <View style={{ flexDirection:'row', gap:4 }}>
                {[0,1,2].map(i => (
                  <View key={i} style={{ flex:1, height:4, borderRadius:2, backgroundColor: i < tasksCompleted ? t.correct : t.border }} />
                ))}
              </View>
              <Text style={{ color:t.textMuted, fontSize:f.label, marginTop:6 }}>
                {tasksCompleted}/3 {lang === 'uk' ? 'виконано' : 'выполнено'}
              </Text>
            </PremiumCard>

            <PremiumCard
              level={2}
              onPress={() => Alert.alert(
                lang === 'uk' ? '🚧 В розробці' : '🚧 В разработке',
                lang === 'uk'
                  ? 'Розділ діалогів зараз готується. Він обовʼязково зʼявиться в наступному білді!'
                  : 'Раздел диалогов сейчас готовится. Он обязательно появится в следующем билде!',
                [{ text: 'OK' }]
              )}
              style={{ flex:1 }}
              innerStyle={{ padding:16 }}
            >
              <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:8 }}>
                <Text style={{ fontSize:22 }}>💬</Text>
                <Text style={{ color:t.textPrimary, fontSize:f.body, fontWeight:'700' }}>
                  {lang === 'uk' ? 'Діалоги' : 'Диалоги'}
                </Text>
              </View>
              <Text style={{ color:t.textMuted, fontSize:f.label, lineHeight:18 }}>
                {lang === 'uk' ? 'Реальні ситуації' : 'Реальные ситуации'}
              </Text>
              <Text style={{ color:t.textSecond, fontSize:f.label, marginTop:4 }}>20 {lang === 'uk' ? 'сценаріїв' : 'сценариев'}</Text>
            </PremiumCard>
          </View>

          {/* КАРТОЧКИ */}
          <View style={{ paddingHorizontal:16, marginBottom:10 }}>
            <PremiumCard
              level={1}
              onPress={() => router.push('/flashcards')}
              innerStyle={{ padding:16, flexDirection:'row', alignItems:'center', gap:14 }}
            >
              <View style={{ width:44, height:44, borderRadius:12, backgroundColor:t.bgSurface, justifyContent:'center', alignItems:'center' }}>
                <Ionicons name="bookmark" size={22} color={t.textSecond} />
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ color:t.textPrimary, fontSize:f.body, fontWeight:'700' }}>
                  {lang === 'uk' ? 'Мої картки' : 'Мои карточки'}
                </Text>
                <Text style={{ color:t.textMuted, fontSize:f.label, marginTop:2 }}>
                  {lang === 'uk' ? 'Збережені фрази та слова' : 'Сохранённые фразы и слова'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={t.textGhost} />
            </PremiumCard>
          </View>

          {/* ПОВТОРЕНИЕ (SRS)
              Источник данных: active_recall_items в AsyncStorage (записывается в lesson1.tsx при ошибке).
              Видна только когда dueCount > 0 — т.е. есть фразы с nextDue <= сегодня.
              Новый пользователь не видит эту карточку вообще — она появляется органически
              после первых ошибок в уроках и одного прошедшего дня.
              Нажатие → /review (review.tsx) — флэшкарт-сессия с кнопками «Знал / Не знал».
              После сессии SM-2 пересчитывает nextDue, и при следующем focusTick dueCount обновится. */}
          {dueCount > 0 && (
            <View style={{ paddingHorizontal:16, marginBottom:10 }}>
              <PremiumCard
                level={1}
                onPress={() => router.push('/review')}
                innerStyle={{ padding:16, flexDirection:'row', alignItems:'center', gap:14 }}
              >
                <View style={{ width:44, height:44, borderRadius:12, backgroundColor:t.accentBg, justifyContent:'center', alignItems:'center' }}>
                  <Text style={{ fontSize:24 }}>🔁</Text>
                </View>
                <View style={{ flex:1 }}>
                  <Text style={{ color:t.textPrimary, fontSize:f.body, fontWeight:'700' }}>
                    {lang === 'uk' ? 'Повторити сьогодні' : 'Повторить сегодня'}
                  </Text>
                  <Text style={{ color:t.textSecond, fontSize:f.label, marginTop:2 }}>
                    {dueCount} {lang === 'uk'
                      ? (dueCount === 1 ? 'фраза' : dueCount < 5 ? 'фрази' : 'фраз')
                      : (dueCount === 1 ? 'фраза' : dueCount < 5 ? 'фразы' : 'фраз')}
                    {' '}·{' '}
                    {lang === 'uk' ? 'твої помилки з уроків' : 'твои ошибки из уроков'}
                  </Text>
                </View>
                <View style={{ backgroundColor:t.accent, borderRadius:20, paddingHorizontal:10, paddingVertical:5 }}>
                  <Text style={{ color:t.bgPrimary, fontSize:f.label, fontWeight:'700' }}>
                    {lang === 'uk' ? 'Почати' : 'Начать'}
                  </Text>
                </View>
              </PremiumCard>
            </View>
          )}

          {/* ТЕСТ + ЭКЗАМЕН */}
          <View style={{ flexDirection:'row', gap:10, paddingHorizontal:16, marginBottom:10 }}>
            <PremiumCard
              level={2}
              onPress={() => router.push('/diagnostic_test')}
              style={{ flex:1 }}
              innerStyle={{ padding:16, flexDirection:'row', alignItems:'center', gap:10 }}
            >
              <View style={{
                width:36, height:36, borderRadius:18,
                backgroundColor:t.bgSurface,
                borderTopWidth:0.5, borderLeftWidth:0.5,
                borderRightWidth:0.5, borderBottomWidth:0.5,
                borderTopColor:t.borderHighlight, borderLeftColor:t.borderHighlight,
                borderRightColor:t.border, borderBottomColor:t.border,
                justifyContent:'center', alignItems:'center',
              }}>
                <Ionicons name="analytics-outline" size={20} color={t.textSecond} />
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ color:t.textPrimary, fontSize:f.body, fontWeight:'600' }}>{lang === 'uk' ? 'Тест знань' : 'Тест знаний'}</Text>
                <Text style={{ color:t.textMuted, fontSize:f.label, marginTop:2 }}>{lang === 'uk' ? 'Дізнайся рівень' : 'Узнай уровень'}</Text>
              </View>
            </PremiumCard>

            <PremiumCard
              level={2}
              active={lessonsCompleted === 32}
              onPress={() => router.push('/exam')}
              style={{ flex:1 }}
              innerStyle={{ padding:16, flexDirection:'row', alignItems:'center', gap:10 }}
            >
              <View style={{
                width:36, height:36, borderRadius:18,
                backgroundColor:t.bgSurface,
                borderTopWidth:0.5, borderLeftWidth:0.5,
                borderRightWidth:0.5, borderBottomWidth:0.5,
                borderTopColor: lessonsCompleted===32 ? t.correct : t.borderHighlight,
                borderLeftColor: lessonsCompleted===32 ? t.correct : t.borderHighlight,
                borderRightColor:t.border, borderBottomColor:t.border,
                justifyContent:'center', alignItems:'center',
              }}>
                <Ionicons name="ribbon-outline" size={20} color={lessonsCompleted===32?t.correct:t.textSecond} />
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ color:t.textPrimary, fontSize:f.body, fontWeight:'600' }}>{lang === 'uk' ? 'Іспит' : 'Экзамен'}</Text>
                <Text style={{ color:t.textMuted, fontSize:f.label, marginTop:2 }}>{lessonsCompleted}/32 {lang==='uk'?'уроків':'уроков'}</Text>
              </View>
              {lessonsCompleted === 32
                ? <Ionicons name="checkmark-circle" size={20} color={t.correct} />
                : <Ionicons name="chevron-forward" size={14} color={t.textGhost} />
              }
            </PremiumCard>
          </View>

          {/* Подвал */}
          <View style={{ alignItems:'center', paddingVertical:32, marginTop:20, borderTopWidth:0.5, borderTopColor:t.border }}>
            <Text style={{ color:t.textMuted, fontSize:f.caption, fontWeight:'600', letterSpacing:0.5 }}>
              PHRASEMAN
            </Text>
            <Text style={{ color:t.textMuted, fontSize:f.caption, marginTop:4 }}>
              by Professor Lingman
            </Text>
          </View>

        </Animated.View>
      </ScrollView>
      )}
      </View>

      {/* Level-Up анимация — поверх экрана */}
      {showLevelUp && (() => {
        const unlockedDialog = newLevel >= 1 && newLevel <= DIALOGS.length ? DIALOGS[newLevel - 1] : null;
        const newAvatar = getBestAvatarForLevel(newLevel);
        const newFrameDef = getBestFrameForLevel(newLevel);
        const dismissLevelUp = () => {
          Animated.timing(levelUpOpacity, { toValue:0, duration:300, useNativeDriver:true }).start(() => setShowLevelUp(false));
        };
        return (
          <Animated.View style={{
            position:'absolute', top:0, left:0, right:0, bottom:0, zIndex:999,
            opacity: levelUpOpacity,
            justifyContent:'center', alignItems:'center',
            backgroundColor:'rgba(0,0,0,0.6)',
          }}>
            <Animated.View style={{
              transform:[
                { translateY: levelUpTranslateY },
                { scale: levelUpOpacity.interpolate({ inputRange:[0,1], outputRange:[0.85, 1] }) }
              ],
              backgroundColor: t.bgCard,
              borderRadius:28, padding:28, marginHorizontal:24,
              alignItems:'center', width:'100%', maxWidth:360,
              borderWidth:1, borderColor: t.textSecond+'44',
              shadowColor:'#000', shadowOpacity:0.4, shadowRadius:24, elevation:20,
            }}>
              <LevelBadge level={newLevel} size={100} />
              <Text style={{ color:t.textPrimary, fontSize: f.numLg, fontWeight:'900', textAlign:'center', marginTop:10 }}>
                {lang === 'uk' ? `РІВЕНЬ ${newLevel}!` : `УРОВЕНЬ ${newLevel}!`}
              </Text>
              <Text style={{ color:t.textMuted, fontSize:f.bodyLg, fontWeight:'500', marginTop:6, textAlign:'center' }}>
                {lang === 'uk' ? 'Вітаємо! Твій прогрес вражає!' : 'Поздравляем! Твой прогресс впечатляет!'}
              </Text>

              <View style={{ marginTop:16, alignItems:'center', gap:4 }}>
                <AnimatedFrame image={/^\d+$/.test(newAvatar) ? getAvatarImageByIndex(parseInt(newAvatar)) : undefined} emoji={newAvatar} frameId={newFrameDef.id} size={60} />
                {newFrameDef.unlockLevel === newLevel && (
                  <View style={{ backgroundColor:t.bgSurface, borderRadius:12, paddingHorizontal:12, paddingVertical:4, marginTop:4 }}>
                    <Text style={{ color:t.textSecond, fontSize:f.label, fontWeight:'700' }}>
                      {lang === 'uk' ? `🔓 Рамка «${newFrameDef.nameUK}»` : `🔓 Рамка «${newFrameDef.nameRU}»`}
                    </Text>
                  </View>
                )}
              </View>

              {unlockedDialog && (
                <View style={{ marginTop:12, backgroundColor:t.bgSurface, borderRadius:14, paddingHorizontal:16, paddingVertical:10, alignItems:'center', gap:2, width:'100%' }}>
                  <Text style={{ color:t.textMuted, fontSize:10, fontWeight:'700', textTransform:'uppercase', letterSpacing:0.7 }}>
                    {lang === 'uk' ? '🔓 Розблоковано' : '🔓 Разблокировано'}
                  </Text>
                  <Text style={{ fontSize:22, marginVertical:2 }}>{unlockedDialog.emoji}</Text>
                  <Text style={{ color:t.textPrimary, fontSize:f.caption, fontWeight:'700', textAlign:'center' }}>
                    {lang === 'uk' ? `Діалог «${unlockedDialog.titleUK}»` : `Диалог «${unlockedDialog.titleRU}»`}
                  </Text>
                </View>
              )}

              <View style={{ backgroundColor:t.bgSurface, paddingHorizontal:16, paddingVertical:6, borderRadius:16, marginTop:14 }}>
                <Text style={{ color:t.gold, fontWeight:'800', fontSize:f.caption }}>+100 XP BONUS</Text>
              </View>

              <TouchableOpacity
                onPress={dismissLevelUp}
                style={{ marginTop:20, backgroundColor:t.accent, borderRadius:16, paddingHorizontal:40, paddingVertical:12 }}
              >
                <Text style={{ color:t.bgPrimary, fontWeight:'800', fontSize:f.bodyLg }}>
                  {lang === 'uk' ? 'Чудово!' : 'Отлично!'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        );
      })()}
      </ScreenGradient>
    </View>
  );
}
