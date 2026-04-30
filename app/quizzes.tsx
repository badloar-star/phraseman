import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { usePremium } from '../components/PremiumContext';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Easing,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Image,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import Svg from 'react-native-svg';

import AddToFlashcard from '../components/AddToFlashcard';
import ContentWrap from '../components/ContentWrap';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { isCorrectAnswer } from '../constants/contractions';
import { getXPProgress } from '../constants/theme';
import { MOTION_DURATION, MOTION_SCALE, MOTION_SPRING } from '../constants/motion';
import { checkAchievements } from './achievements';
import { logEnergyLimitHit } from './firebase';
import { trackEnergyHit } from './user_stats';
import { DEV_MODE, STORE_URL } from './config';
import { hapticError, hapticLightImpact, hapticTap } from '../hooks/use-haptics';
import { useAudio } from '../hooks/use-audio';
import { updateMultipleTaskProgress } from './daily_tasks';
import { DebugLogger } from './debug-logger';
import { useEnergy } from '../components/EnergyContext';
import EnergyBar from '../components/EnergyBar';
import NoEnergyModal from '../components/NoEnergyModal';
import PremiumCard from '../components/PremiumCard';
import QuizTimeoutModal from '../components/QuizTimeoutModal';
import { pointsForAnswer } from './hall_of_fame_utils';
import { isQuizChoiceCorrect, quizPrimaryCorrectIndex, type QuizPhrase } from './quiz_data';
import { getQuizPhrasesLoaded } from './quiz_phrases_loader';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, UserSettings as Settings } from './settings_edu';
import { useTabNav } from './TabContext';
import { calculateRewardWithBonus } from './variable_reward_system';
import { registerXP } from './xp_manager';
import { recordMistake } from './active_recall';
import ReportErrorButton from '../components/ReportErrorButton';
import { shareCardFromSvgRef } from '../components/share_cards/shareCardPng';
import { emitAppEvent } from './events';
import { LEVEL_CONFIG, LEVEL_IMAGES, Level, THEME_PALETTES, THEME_TEXT } from './quizzes/constants';
import { diffWords } from './quizzes/diff';
import { computeNextQuizProgression, getQuizTimerSeconds } from './quizzes/progression';
import { buildQuizShareMessage, quizShareMessageLang } from './quizzes/results';
import QuizResultView from './quizzes/result_view';
import { buildQuizRestartState, buildReviewRetryState, clearQuizPendingTimers } from './quizzes/session';
import { MultBadge, StreakBreak } from './quizzes/ui';

// Используем QuizPhrase из quiz_data.ts
type Phrase = QuizPhrase;

// Theme and level constants are extracted to app/quizzes/constants.ts

// Тип фразы для квиза — используем QuizPhrase из quiz_data
// level передаётся из QuizGame



// ── ВЫБОР УРОВНЯ ────────────────────────────────────────────────────────────
function LevelSelect({ onSelect }: { onSelect:(l:Level)=>void }) {
  const { goHome } = useTabNav();
  const { theme:t , f, themeMode } = useTheme();
  const { s, lang } = useLang();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPremium } = usePremium();
  const { energy, bonusEnergy, isUnlimited: entryEnergyUnlimited } = useEnergy();
  const [selected, setSelected] = useState<Level | null>(null);
  const { width: windowWidth } = useWindowDimensions();
  const startTrackW = Math.max(1, windowWidth - 40);

  const [showEntryNoEnergy, setShowEntryNoEnergy] = useState(false);

  // Fill animation per level
  const fillAnims = useRef<Record<Level, Animated.Value>>({
    easy:   new Animated.Value(0),
    medium: new Animated.Value(0),
    hard:   new Animated.Value(0),
  }).current;

  // Pulse animation per level icon
  const pulseAnims = useRef<Record<Level, Animated.Value>>({
    easy:   new Animated.Value(1),
    medium: new Animated.Value(1),
    hard:   new Animated.Value(1),
  }).current;

  useEffect(() => {
    const loops = (Object.keys(pulseAnims) as Level[]).map((lv, i) => {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnims[lv], {
            toValue: MOTION_SCALE.nudge,
            duration: 760 + i * 100,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnims[lv], {
            toValue: 1.0,
            duration: 760 + i * 100,
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();
      return anim;
    });
    return () => loops.forEach(a => a.stop());
  }, [pulseAnims]);


  const handleStart = (lv: Level) => {
    if (!entryEnergyUnlimited && energy + bonusEnergy <= 0) {
      logEnergyLimitHit('quiz');
      trackEnergyHit().catch(() => {});
      setShowEntryNoEnergy(true);
      return;
    }
    const anim = fillAnims[lv];
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      anim.setValue(0);
      onSelect(lv);
    });
  };

  return (
    <ScreenGradient>
    <View style={{ flex:1 }}>
      <ContentWrap>
      <View style={{ flexDirection:'row', alignItems:'center', padding:16, paddingTop: 16 + insets.top, borderBottomWidth:0.5, borderBottomColor:t.border }}>
        <TouchableOpacity
          style={{ width:38, height:38, borderRadius:19, backgroundColor:t.bgCard, borderWidth:0.5, borderColor:t.border, justifyContent:'center', alignItems:'center' }}
          onPress={() => { goHome(); router.replace('/(tabs)/home' as any); }}
        >
          <Ionicons name="chevron-back" size={22} color={t.textPrimary}/>
        </TouchableOpacity>
        <Text style={{ color:t.textPrimary, fontSize: f.numMd, fontWeight:'700', marginLeft:12, flex:1 }} adjustsFontSizeToFit numberOfLines={1}>
          {s.quizzes.selectLevel}
        </Text>
        <EnergyBar size={20} />
        <PremiumCard
          level={1}
          testID="quiz-level-select-settings"
          accessibilityLabel="qa-quiz-level-select-settings"
          onPress={() => { hapticTap(); router.push('/settings_edu'); }}
          style={{ width: 38, height: 38, borderRadius: 19, marginLeft: 8 }}
          innerStyle={{ width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' }}
        >
          <Ionicons name="settings-outline" size={20} color={t.textSecond} />
        </PremiumCard>
      </View>

      <View style={{ flex:1, justifyContent:'center', paddingHorizontal:20, gap:8 }}>
        {(Object.keys(LEVEL_CONFIG) as Level[]).map(lv => {
          const c        = LEVEL_CONFIG[lv];
          const lbl      = triLang(lang, { ru: c.labelRU, uk: c.labelUK, es: c.labelES });
          const tag      = triLang(lang, { ru: c.tagRU, uk: c.tagUK, es: c.tagES });
          const locked   = !DEV_MODE && !isPremium && lv !== 'easy';
          const palette  = (THEME_PALETTES[themeMode] ?? THEME_PALETTES.dark)[lv];
          const txt      = THEME_TEXT[themeMode] ?? THEME_TEXT.dark;
          const gradA    = locked ? t.bgCard    : palette.gradA;
          const gradB    = locked ? t.bgSurface : palette.gradB;
          const accent   = locked ? t.textMuted : palette.accent;
          const textCol  = locked ? t.textSecond : txt.primary;
          const textCol2 = locked ? t.textMuted  : txt.secondary;
          const isSelected = selected === lv;

          return (
            <View key={lv} style={{ borderRadius: 20, overflow: 'hidden' }}>
              {/* ── Карточка уровня ── */}
              <TouchableOpacity
                onPress={() => {
                  if (locked) { router.push({ pathname: '/premium_modal', params: { context: lv === 'hard' ? 'quiz_hard' : 'quiz_medium' } } as any); return; }
                  if (isSelected) { handleStart(lv); return; }
                  setSelected(lv);
                }}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[gradA, gradB]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={{
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    borderBottomLeftRadius: isSelected ? 0 : 20,
                    borderBottomRightRadius: isSelected ? 0 : 20,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? accent : (locked ? t.border : `${c.color}40`),
                    borderBottomColor: isSelected ? 'transparent' : undefined,
                    flexDirection: 'row',
                    alignItems: 'center',
                    minHeight: 82,
                    overflow: 'hidden',
                  }}
                >
                  {/* Контент */}
                  <View style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 16 }}>
                    <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:4 }}>
                      <View style={{
                        backgroundColor: `${accent}25`, borderRadius: 6,
                        paddingHorizontal: 7, paddingVertical: 2,
                        borderWidth: 1, borderColor: `${accent}50`,
                      }}>
                        <Text style={{ color: accent, fontSize: f.label, fontWeight:'800', letterSpacing:0.8 }}>
                          {c.sub}
                        </Text>
                      </View>
                      {locked && (
                        <View style={{ flexDirection:'row', alignItems:'center', gap:4, backgroundColor: t.accentBg, borderRadius:6, paddingHorizontal:7, paddingVertical:2 }}>
                          <Ionicons name="lock-closed" size={10} color={t.textSecond}/>
                          <Text style={{ color:t.textSecond, fontSize: f.label, fontWeight:'700' }}>Premium</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ flexDirection:'column', gap:4, marginTop:4 }}>
                      <Text style={{ color: textCol, fontSize: f.h1, fontWeight:'900' }}>{lbl}</Text>
                      <Text style={{ color: textCol2, fontSize: f.sub, flexWrap:'wrap' }}>{tag}</Text>
                    </View>
                  </View>

                  {/* Иконка справа */}
                  <Animated.View style={{ transform: [{ scale: locked ? 1 : pulseAnims[lv] }], paddingRight: 16 }}>
                    <Image source={LEVEL_IMAGES[lv]} style={{ width: 56, height: 56, opacity: locked ? 0.3 : 1 }} resizeMode="contain" />
                  </Animated.View>
                </LinearGradient>
              </TouchableOpacity>

              {/* ── Кнопка «Начать» прямо на карточке ── */}
              {isSelected && !locked && (() => {
                const fillTx = fillAnims[lv].interpolate({
                  inputRange: [0, 1],
                  outputRange: [-startTrackW, 0],
                });
                return (
                  <TouchableOpacity
                    onPress={() => handleStart(lv)}
                    activeOpacity={1}
                    style={{
                      height: 46,
                      backgroundColor: `${accent}22`,
                      borderWidth: 2,
                      borderTopWidth: 0,
                      borderColor: accent,
                      borderBottomLeftRadius: 20,
                      borderBottomRightRadius: 20,
                      overflow: 'hidden',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Animated.View
                      pointerEvents="none"
                      style={{
                        position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
                        backgroundColor: accent,
                        transform: [{ translateX: fillTx }],
                      }}
                    />
                    {/* Text */}
                    <Text style={{ color: accent, fontSize: f.body, fontWeight:'800', zIndex: 1 }}>
                      {triLang(lang, { ru: 'Начать квиз', uk: 'Почати квіз', es: 'Empezar cuestionario' })} · {lbl}
                    </Text>
                  </TouchableOpacity>
                );
              })()}
            </View>
          );
        })}
      </View>
      </ContentWrap>

      <NoEnergyModal
        visible={showEntryNoEnergy}
        onClose={() => setShowEntryNoEnergy(false)}
        onBackHome={() => { setShowEntryNoEnergy(false); goHome(); router.replace('/(tabs)/home' as any); }}
        paywallContext="quiz_limit"
      />
    </View>
    </ScreenGradient>
  );
}

// ── КВИЗ ────────────────────────────────────────────────────────────────────
function QuizGame({ level, onBack }: { level:Level; onBack:()=>void }) {
  const { theme:t , f, themeMode } = useTheme();
  const { s, lang } = useLang();
  const { activeIdx } = useTabNav();
  const router = useRouter();
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  useEffect(() => () => { stopAudio(); }, [stopAudio]);
  const insets = useSafeAreaInsets();
  const isLightTheme = themeMode === 'ocean' || themeMode === 'sakura';
  const cfg   = LEVEL_CONFIG[level] ?? LEVEL_CONFIG['easy'];
  const label = triLang(lang, { ru: cfg.labelRU, uk: cfg.labelUK, es: cfg.labelES });

  const [retryCount, setRetryCount] = useState(0);

  const { phrases, phrasesLoadFailed } = useMemo((): { phrases: Phrase[]; phrasesLoadFailed: boolean } => {
    try {
      const result = getQuizPhrasesLoaded(level, 10, lang);
      return { phrases: result.length > 0 ? result : [], phrasesLoadFailed: false };
    } catch (e) {
      DebugLogger.error('quizzes.tsx:loadPhrases', e, 'warning');
      return { phrases: [], phrasesLoadFailed: true };
    }
  }, [level, lang, retryCount]);

  useEffect(() => {
    if (!phrasesLoadFailed) return;
    emitAppEvent('action_toast', {
      type: 'error',
      messageRu: 'Не удалось загрузить вопросы.',
      messageUk: 'Не вдалося завантажити питання.',
      messageEs: 'No se pudieron cargar las preguntas.',
    });
  }, [phrasesLoadFailed, level, lang, retryCount]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [idx,      setIdx]      = useState(0);
  const [chosen,   setChosen]   = useState<number|null>(null);
  const [typed,    setTyped]    = useState('');
  const [typedOk,  setTypedOk]  = useState<boolean|null>(null);
  const [score,    setScore]    = useState(0);
  const [streak,   setStreak]   = useState(0);
  const [prevStr,  setPrevStr]  = useState(0);
  const [showBreak,setShowBreak]= useState(false);
  const [results,  setResults]  = useState<boolean[]>([]);
  const [done,     setDone]     = useState(false);
  const [reviewing,setReviewing]= useState(false);
  const [totalXP,  setTotalXP]  = useState(0);
  const [reviewQ,  setReviewQ]  = useState<Phrase[]>([]);
  const [rIdx,     setRIdx]     = useState(0);
  const [showHardTip,      setShowHardTip]      = useState(false);
  const [hardTipDismissed, setHardTipDismissed] = useState(false);
  const [hardWrongCount,   setHardWrongCount]   = useState(0);
  const [showBonus, setShowBonus] = useState(false);
  const [bonusXP, setBonusXP] = useState(0);
  const [showNoEnergyModal, setShowNoEnergyModal] = useState(false);
  const { energy: currentEnergy, isUnlimited: testerEnergyDisabled, spendOne } = useEnergy();
  const currentEnergyRef = useRef(currentEnergy);
  const testerEnergyDisabledRef = useRef(testerEnergyDisabled);
  const spendOneRef = useRef(spendOne);
  useEffect(() => { currentEnergyRef.current = currentEnergy; }, [currentEnergy]);
  useEffect(() => { testerEnergyDisabledRef.current = testerEnergyDisabled; }, [testerEnergyDisabled]);
  useEffect(() => { spendOneRef.current = spendOne; }, [spendOne]);
  const showEnergyEmptyFeedbackRef = useRef<() => void>(() => {});
  const showEnergyEmptyFeedback = useCallback(() => {
    setShowNoEnergyModal(true);
  }, []);
  useEffect(() => { showEnergyEmptyFeedbackRef.current = showEnergyEmptyFeedback; }, [showEnergyEmptyFeedback]);
  const TIMER_SECONDS = getQuizTimerSeconds(level);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isTabActiveRef = useRef(true);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showTimeoutAlert, setShowTimeoutAlert] = useState(false);
  const [nextReady, setNextReady] = useState(false);
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS);

  // ── Имя пользователя загружаем ОДИН РАЗ в ref — нет race condition ──────
  const userNameRef = useRef<string>('');
  // streak тоже в ref — всегда актуальное значение в замыканиях
  const streakRef   = useRef(0);
  // results в ref — чтобы handleTap не читал устаревший стейт из замыкания
  const resultsRef  = useRef<boolean[]>([]);

  const insertAnim  = useRef(new Animated.Value(0)).current;
  const insertScale = useRef(new Animated.Value(0.7)).current;
  const fadeAnim    = useRef(new Animated.Value(1)).current;
  const mountOpacity = useRef(new Animated.Value(1)).current;
  const mountScale   = useRef(new Animated.Value(1)).current;

  // ── XP-анимации финального экрана ─────────────────────────────────────────
  const xpFlyY         = useRef(new Animated.Value(0)).current;
  const xpFlyOpacity   = useRef(new Animated.Value(1)).current;
  const xpBarAnim      = useRef(new Animated.Value(0)).current;
  const xpCountAnim    = useRef(new Animated.Value(0)).current;
  const xpAnimStarted  = useRef(false);
  const xpTimer1       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const xpTimer2       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quizCardSvgRef = useRef<InstanceType<typeof Svg> | null>(null);

  // Запускаем XP-анимации когда done=true и score уже установлен
  useEffect(() => {
    if (!done || score === 0 || xpAnimStarted.current) return;
    xpAnimStarted.current = true;

    const { xpInLevel: oldXpInLevel, progress: oldProgress } = getXPProgress(totalXP);
    const { xpInLevel: newXpInLevel, progress: newProgress } = getXPProgress(totalXP + score);

    // Начальные позиции
    xpFlyY.setValue(0);
    xpFlyOpacity.setValue(1);
    xpBarAnim.setValue(oldProgress);
    xpCountAnim.setValue(oldXpInLevel);

    xpTimer1.current = setTimeout(() => {
    Animated.parallel([
      Animated.timing(xpFlyY,       { toValue: 60,  duration: MOTION_DURATION.celebrate, useNativeDriver: true }),
      Animated.timing(xpFlyOpacity, { toValue: 0,   duration: MOTION_DURATION.slow, useNativeDriver: true, delay: 100 }),
      ]).start();
      xpTimer2.current = setTimeout(() => {
        Animated.timing(xpBarAnim,   { toValue: newProgress,  duration: 1000, useNativeDriver: false }).start();
        Animated.timing(xpCountAnim, { toValue: newXpInLevel, duration: 1000, useNativeDriver: false }).start();
      }, 550);
    }, 700);

    return () => {
      if (xpTimer1.current) clearTimeout(xpTimer1.current);
      if (xpTimer2.current) clearTimeout(xpTimer2.current);
    };
  }, [done, score, totalXP, xpFlyY, xpFlyOpacity, xpBarAnim, xpCountAnim]);

  useEffect(() => {
    loadSettings().then(setSettings);
    AsyncStorage.getItem('hard_tip_dismissed').then(v => {
      if (v === '1') setHardTipDismissed(true);
    });
    AsyncStorage.getItem('user_name').then(name => {
      if (name) userNameRef.current = name;
    });
    AsyncStorage.getItem('user_total_xp').then(v => {
      setTotalXP(parseInt(v || '0') || 0);
    });
  }, []);

  // Синхронизируем streakRef с streak стейтом
  useEffect(() => { streakRef.current = streak; }, [streak]);

  // [ACHIEVEMENT + QUIZ_SCORE] Когда квиз завершён — проверяем ачивки и засчитываем очки сессии
  // quiz_score обновляется ОДИН РАЗ с итоговым счётом — исключает race condition между ответами
  useEffect(() => {
    if (!done) return;
    const perfect = results.length > 0 && results.every(r => r);
    checkAchievements({ type: 'quiz', level, perfect }).catch(() => {});
    const doneUpdates: Parameters<typeof updateMultipleTaskProgress>[0] = [];
    if (score > 0) doneUpdates.push({ type: 'quiz_score', increment: score });
    if (perfect) {
      doneUpdates.push({ type: 'quiz_perfect', increment: 1 });
      if (level === 'hard') doneUpdates.push({ type: 'quiz_hard_perfect', increment: 1 });
    }
    if (doneUpdates.length > 0) updateMultipleTaskProgress(doneUpdates).catch(() => {});
  }, [done, level, results, score]);

  // Синхронизируем isTabActive — но таймер не останавливаем
  useEffect(() => {
    isTabActiveRef.current = activeIdx === 2;
  }, [activeIdx]);

  const onBackRef = useRef(onBack);
  useEffect(() => { onBackRef.current = onBack; }, [onBack]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // ── Таймер на вопрос — работает даже при смене вкладки ──────────────────
  const answeredRef = useRef(false);
  useEffect(() => {
    if (done || reviewing || phrases.length === 0) return;
    answeredRef.current = false;
    setTimeLeft(TIMER_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          if (!answeredRef.current) {
            answeredRef.current = true;
            setShowTimeoutAlert(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [idx, done, reviewing, phrases.length, TIMER_SECONDS]);

  // Обработка завершения квиза с переменной наградой
  useEffect(() => {
    if (!done || score === 0 || phrases.length === 0) return;

    const processDoneQuiz = async () => {
      try {
        const total = phrases.length;
        const right = results.filter(Boolean).length;
        const pct = Math.round(right / total * 100);

        // XP за каждый правильный ответ уже начислен в handleAnswer — здесь не дублируем

        // Случайный бонус поверх при ≥70%
        if (pct >= 70) {
          const reward = calculateRewardWithBonus(score);
          if (reward.hasBonusWon) {
            setBonusXP(reward.bonusXP);
            setShowBonus(true);
            if (userNameRef.current) { try { await registerXP(reward.bonusXP, 'bonus_chest', userNameRef.current, lang); } catch {} }
          }
        }
      } catch (error) {
        DebugLogger.error('quizzes.tsx:processDoneQuiz', error, 'warning');
      }
    };

    processDoneQuiz();
  }, [done, score, results, phrases.length, lang]);

  const current = reviewing ? reviewQ[rIdx] : (idx < phrases.length ? phrases[idx] : undefined);

  if (phrases.length === 0) {
    return (
      <ScreenGradient>
      <View style={{ flex:1, justifyContent:'center', alignItems:'center', paddingHorizontal: 24 }}>
        <ContentWrap>
        <Text style={{ fontSize: 42, marginBottom: 10 }}>📭</Text>
        <Text style={{ color:t.textPrimary, fontSize: f.h2, fontWeight: '700', textAlign: 'center' }}>
          {triLang(lang, {
            ru: 'Вопросы временно недоступны',
            uk: 'Питання тимчасово недоступні',
            es: 'Las preguntas no están disponibles',
          })}
        </Text>
        <Text style={{ color:t.textMuted, fontSize: f.body, marginTop: 10, textAlign: 'center' }}>
          {triLang(lang, {
            ru: 'Попробуй снова или вернись позже.',
            uk: 'Спробуй ще раз або повернись пізніше.',
            es: 'Vuelve a intentarlo más tarde.',
          })}
        </Text>
        <TouchableOpacity
          onPress={() => setRetryCount(v => v + 1)}
          style={{ marginTop: 18, backgroundColor: t.accent, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 12, alignSelf: 'center' }}
        >
          <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '700' }}>
            {triLang(lang, {
              ru: 'Повторить загрузку',
              uk: 'Повторити завантаження',
              es: 'Reintentar',
            })}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/home' as any)}
          style={{ marginTop: 10, alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 8 }}
        >
          <Text style={{ color: t.textMuted, fontSize: f.sub, textDecorationLine: 'underline' }}>
            {triLang(lang, {
              ru: 'Вернуться на главную',
              uk: 'Повернутися на головну',
              es: 'Volver al inicio',
            })}
          </Text>
        </TouchableOpacity>
        </ContentWrap>
      </View>
      </ScreenGradient>
    );
  }

  // Guard: текущий вопрос undefined
  if (!current) {
    return (
      <ScreenGradient>
      <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
        <ContentWrap>
        <Text style={{ color:t.textMuted, fontSize: f.body }}>
          {triLang(lang, { ru: 'Загрузка...', uk: 'Завантаження...', es: 'Cargando...' })}
        </Text>
        </ContentWrap>
      </View>
      </ScreenGradient>
    );
  }

  const playInsertAnim = () => {
    insertAnim.setValue(0);
    insertScale.setValue(0.7);
    Animated.parallel([
      Animated.timing(insertAnim, { toValue: 1, duration: MOTION_DURATION.slow, useNativeDriver: true }),
      Animated.spring(insertScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: MOTION_SPRING.ui.friction,
        tension: MOTION_SPRING.ui.tension,
      }),
    ]).start();
  };

  const afterAnswer = async (isRight: boolean, isHardTyped = false) => {
    const nr = reviewing ? results : [...results, isRight];
    if (!reviewing) { resultsRef.current = nr; setResults(nr); }

    if (!isRight && settings.haptics) {
      void hapticError();
    }

    if (!isRight && current) {
      void recordMistake(
        current.answer,
        current.ru,
        current.lessonNum,
        current.uk,
        'quiz',
        current.es,
      );
    }

    if (!reviewing) {
      if (isRight) {
        // Используем streakRef.current — всегда актуальное значение
        const currentStreak = streakRef.current;
        const ns  = currentStreak + 1;
        const basePts = pointsForAnswer(level, ns);
        const pts = isHardTyped ? basePts * 2 : basePts;

        // Обновляем стейт и ref
        streakRef.current = ns;
        setStreak(ns);
        setPrevStr(currentStreak);
        setShowBreak(false);
        setScore(p => p + pts);

        // Начисляем баллы — имя уже в ref, нет асинхронного запроса
        if (userNameRef.current) { registerXP(pts, 'quiz_answer', userNameRef.current, lang).catch(() => {}); }
        // Триггеры заданий — quiz_score обновляется в done useEffect (один раз с итогом сессии)
        const updates: Parameters<typeof updateMultipleTaskProgress>[0] = [
          { type: 'daily_active' },
        ];
        if (level === 'hard') updates.push({ type: 'quiz_hard' });
        if (level === 'easy') updates.push({ type: 'quiz_easy' });
        if (level === 'medium') updates.push({ type: 'quiz_medium' });
        updateMultipleTaskProgress(updates);
      } else {
        const currentStreak = streakRef.current;
        streakRef.current = 0;
        setPrevStr(currentStreak);
        setShowBreak(currentStreak >= 2);
        setStreak(0);
        setTimeout(() => setShowBreak(false), 800);

        // Spend energy on wrong answer in quiz (refs = no stale closure)
        if (!testerEnergyDisabledRef.current) {
          spendOneRef.current().then(success => {
            if (success && currentEnergyRef.current === 1) {
              setTimeout(() => { showEnergyEmptyFeedbackRef.current(); }, 800);
            }
          }).catch(() => {});
        }

        if (settings.hardMode && !hardTipDismissed) {
          const newCount = hardWrongCount + 1;
          setHardWrongCount(newCount);
          if (newCount >= 2) setShowHardTip(true);
        }
      }
    }

    if (settings.voiceOut && isTabActiveRef.current) {
      speakAudio(current.answer, settings.speechRate);
    }

    // Задержка зависит от уровня и настройки autoAdvance
    // easy=4с, medium=6с, hard=8с — только если autoAdvance включён
    const autoDelay = level === 'hard' ? 8000 : level === 'medium' ? 6000 : 4000;

    const doNext = () => {
      Animated.timing(fadeAnim, { toValue: 0, duration: MOTION_DURATION.fast, useNativeDriver: true }).start(() => {
        const next = computeNextQuizProgression({
          reviewing,
          idx,
          phrasesLength: phrases.length,
          reviewQ,
          rIdx,
          isRight,
        });
        if (next.done) {
          setDone(true);
        } else {
          if (typeof next.nextIdx === 'number') setIdx(next.nextIdx);
          if (next.nextReviewQ) setReviewQ(next.nextReviewQ);
          if (typeof next.nextRIdx === 'number') setRIdx(next.nextRIdx);
        }
        setChosen(null); setTyped(''); setTypedOk(null);
        Animated.timing(fadeAnim, { toValue: 1, duration: MOTION_DURATION.normal, useNativeDriver: true }).start();
      });
    };

    if (settings.autoAdvance) {
      autoAdvanceTimerRef.current = setTimeout(doNext, autoDelay);
    }
    // Если autoAdvance выключен — ждём тапа (обработается в handleTap)
  };

  const handleChoice = (ci: number) => {
    if (chosen !== null) return;
    if (!current) return;
    answeredRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    setNextReady(false);
    setChosen(ci);
    playInsertAnim();
    afterAnswer(isQuizChoiceCorrect(ci, current.correct));
    setTimeout(() => setNextReady(true), 500);
  };

  const handleTyped = () => {
    if (typedOk !== null) return;
    answeredRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    setNextReady(false);
    const ok = isCorrectAnswer(typed, current.answer, current.answerAlternatives);
    setTypedOk(ok);
    playInsertAnim();
    afterAnswer(ok, true);
    setTimeout(() => setNextReady(true), 500);
  };

  // ── ФИНАЛЬНЫЙ ЭКРАН ──────────────────────────────────────────────────────
  if (done) {
    return (
        <QuizResultView
          phrases={phrases}
          results={results}
          score={score}
          bonusXP={bonusXP}
          totalXP={totalXP}
          accentColor={cfg.color}
          xpFlyY={xpFlyY}
          xpFlyOpacity={xpFlyOpacity}
          xpBarAnim={xpBarAnim}
          xpCountAnim={xpCountAnim}
          showBonus={showBonus}
          onDismissBonus={() => setShowBonus(false)}
          onReviewMistakes={(wrongPhrases) => {
            clearQuizPendingTimers(autoAdvanceTimerRef, timerRef);
            fadeAnim.setValue(1);
            const reviewState = buildReviewRetryState(wrongPhrases);
            setChosen(reviewState.chosen);
            setTyped(reviewState.typed);
            setTypedOk(reviewState.typedOk);
            setReviewQ(reviewState.reviewQ);
            setRIdx(reviewState.rIdx);
            setReviewing(reviewState.reviewing);
            setDone(reviewState.done);
          }}
          onRestart={() => {
            clearQuizPendingTimers(autoAdvanceTimerRef, timerRef);
            fadeAnim.stopAnimation();
            fadeAnim.setValue(1);
            AsyncStorage.getItem('user_total_xp').then(v => { setTotalXP(parseInt(v || '0') || 0); }).catch(() => {});
            const restartState = buildQuizRestartState();
            setIdx(restartState.idx);
            setChosen(restartState.chosen);
            setScore(restartState.score);
            setStreak(restartState.streak);
            streakRef.current = restartState.streak;
            setResults(restartState.results);
            setDone(restartState.done);
            setReviewing(restartState.reviewing);
            setTyped(restartState.typed);
            setTypedOk(restartState.typedOk);
            xpAnimStarted.current = false;
            xpFlyY.setValue(0);
            xpFlyOpacity.setValue(1);
            setRetryCount(c => c + 1);
          }}
          onBack={onBack}
          onShare={async (right, total, pct, rankIcon) => {
            const msg = buildQuizShareMessage(quizShareMessageLang(lang), right, total, pct, rankIcon, STORE_URL);
            await shareCardFromSvgRef(quizCardSvgRef, { fileNamePrefix: 'phraseman-quiz', textFallback: msg });
          }}
          onHome={() => router.replace('/(tabs)/home' as any)}
          shareCardSvgRef={quizCardSvgRef}
        />
    );
  }

  const isRight       = chosen !== null ? isQuizChoiceCorrect(chosen, current.correct) : null;
  const shownCorrectEnglish = typedOk === true
    ? typed
    : chosen !== null && isRight === true
      ? current.choices[chosen]
      : current.answer;
  const displayAnswer = chosen !== null
    ? current.choices[chosen]
    : typedOk !== null ? typed : null;
  const displayColor  = isRight === true || typedOk === true
    ? t.correct
    : isRight === false || typedOk === false
      ? t.correct
      : t.textPrimary;

  // Переход к следующему вопросу (тап по экрану или кнопка "Далее")
  const handleTap = () => {
    if (chosen === null && typedOk === null) return; // ещё не ответили
    stopAudio();
    // Отменяем авто-таймер если был запланирован
    clearQuizPendingTimers(autoAdvanceTimerRef, timerRef);
    const lastRight =
      (chosen !== null ? isQuizChoiceCorrect(chosen, current.correct) : false)
      || typedOk === true;
    Animated.timing(fadeAnim, { toValue: 0, duration: MOTION_DURATION.fast, useNativeDriver: true }).start(() => {
      const next = computeNextQuizProgression({
        reviewing,
        idx,
        phrasesLength: phrases.length,
        reviewQ,
        rIdx,
        isRight: lastRight,
      });
      if (next.done) {
        setDone(true);
      } else {
        if (typeof next.nextIdx === 'number') setIdx(next.nextIdx);
        if (next.nextReviewQ) setReviewQ(next.nextReviewQ);
        if (typeof next.nextRIdx === 'number') setRIdx(next.nextRIdx);
      }
      setChosen(null); setTyped(''); setTypedOk(null);
      Animated.timing(fadeAnim, { toValue: 1, duration: MOTION_DURATION.normal, useNativeDriver: true }).start();
    });
  };

  const handleTimeoutClose = () => {
    setShowTimeoutAlert(false);
    onBackRef.current();
  };

  return (
    <Animated.View style={{ flex:1, opacity: mountOpacity, transform: [{ scale: mountScale }] }}>
    <ScreenGradient>
    <View style={{ flex:1 }}>
      <ContentWrap>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':'height'}>

        {/* ХЕДЕР */}
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:15, paddingTop: 15 + insets.top }}>
          <TouchableOpacity onPress={onBack}>
            <Ionicons name="chevron-back" size={28} color={t.textPrimary}/>
          </TouchableOpacity>
          <Text style={{ color:cfg.color, fontSize: f.body, fontWeight:'700', flex:1, textAlign:'center' }}>
            {reviewing ? s.quizzes.fixErrors : label}
          </Text>
          <View style={{ flexDirection:'row', alignItems:'center', position:'relative', gap:8 }}>
            {!reviewing && chosen === null && typedOk === null && (
              <View style={{
                width: 34, height: 34, borderRadius: 17,
                borderWidth: 2,
                borderColor: timeLeft <= 5 ? t.wrong : timeLeft <= 10 ? '#D4A017' : t.border,
                justifyContent: 'center', alignItems: 'center',
              }}>
                <Text style={{ color: timeLeft <= 5 ? t.wrong : t.textSecond, fontWeight: '700', fontSize: f.label }}>
                  {timeLeft}
                </Text>
              </View>
            )}
            <MultBadge streak={streak} t={t} f={f}/>
            <StreakBreak show={showBreak} old={prevStr} t={t} f={f}/>
            <View style={{ flexDirection:'row', alignItems:'center', gap:3 }}>
              <Ionicons name="star" size={13} color={t.textSecond}/>
              <Text style={{ color:t.textSecond, fontWeight:'600', fontSize: f.body }}>{score}</Text>
            </View>
          </View>
        </View>

        {/* ПРОГРЕСС */}
        {!reviewing && (
          <View style={{ flexDirection:'row', gap:4, paddingHorizontal:16, marginBottom:4 }}>
            {phrases.map((_, i) => {
              let bg = t.border;
              if (i < results.length) bg = results[i] ? t.correct : t.wrong;
              if (i === idx) bg = t.textSecond;
              return <View key={i} style={{ flex:1, height:5, borderRadius:2, backgroundColor:bg }}/>;
            })}
          </View>
        )}

        <Animated.View style={{ flex:1, opacity:fadeAnim }}>
          <ScrollView style={{ flex:1 }} contentContainerStyle={{ paddingHorizontal:20, paddingTop:20, paddingBottom:40 }} keyboardShouldPersistTaps="handled">
          <Text style={{ color:t.textMuted, fontSize: f.caption, marginBottom:14 }}>
            {(reviewing?rIdx:idx)+1} / {reviewing?reviewQ.length:phrases.length}
          </Text>

          {/* ВОПРОС */}
          <Text style={{ color:t.textPrimary, fontSize: f.h2 + 6, fontWeight:'500', marginBottom:20, lineHeight:32 }}>
            {triLang(lang, { ru: current.ru, uk: current.uk, es: current.es })}
          </Text>

          {/* АНИМАЦИЯ ВСТАВКИ */}
          {displayAnswer !== null && (
            <Animated.View style={{
              opacity: insertAnim,
              transform: [{ scale: insertScale }],
              backgroundColor: isRight===true||typedOk===true ? t.correctBg : t.wrongBg,
              borderRadius: 14,
              padding: 16,
              marginBottom: 16,
              borderLeftWidth: 3,
              borderLeftColor: isRight===true||typedOk===true ? t.correct : t.wrong,
            }}>
              {(isRight === false || typedOk === false) && (
                <Text style={{ color: t.correct, fontSize: f.label, fontWeight: '700', marginBottom: 4, letterSpacing: 0.3 }}>
                  {triLang(lang, { ru: 'ПРАВИЛЬНО:', uk: 'Вірно:', es: 'CORRECTO:' })}
                </Text>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.75} onPress={() => { void hapticLightImpact(); speakAudio(shownCorrectEnglish, settings.speechRate); }}>
                  <Text style={{ color: displayColor, fontSize: f.h2 + 2, fontWeight: '600', lineHeight: (f.h2 + 2) * 1.4 }}>
                    {shownCorrectEnglish}
                  </Text>
                </TouchableOpacity>
                <View onStartShouldSetResponder={() => true}>
                  <AddToFlashcard en={shownCorrectEnglish} ru={current.ru} uk={current.uk} es={current.es} source="lesson" sourceId="quiz" />
                </View>
              </View>
              {(isRight === false || typedOk === false) && displayAnswer && (
                <>
                  <Text style={{ color: t.wrong, fontSize: f.label, fontWeight: '700', marginTop: 10, marginBottom: 4, letterSpacing: 0.3 }}>
                    {triLang(lang, { ru: 'ВАШ ВАРИАНТ:', uk: 'ВАШ ВАРІАНТ:', es: 'TU RESPUESTA:' })}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 2 }}>
                    {diffWords(displayAnswer, current.answer).map((item, idx) => (
                      <Text key={idx} style={{
                        color: item.isWrong ? t.wrong : t.textMuted,
                        fontSize: f.bodyLg,
                        fontWeight: item.isWrong ? '700' : '400',
                      }}>
                        {item.word}{' '}
                      </Text>
                    ))}
                  </View>
                </>
              )}
            </Animated.View>
          )}
          {current && (
            <ReportErrorButton
              screen="quiz"
              dataId={`quiz_${level}_${current.answer.replace(/\s+/g,'_')}`}
              dataText={[
                `RU: ${current.ru}`,
                `Варианты: ${(current.choices||[]).map((c,i)=> (Array.isArray(current.correct) ? current.correct.includes(i) : i===current.correct) ? `[✓${c}]`:c).join(' | ')}`,
                `Правильный: ${current.answer}${current.answerAlternatives?.length ? ` ; alt: ${current.answerAlternatives.join(' | ')}` : ''}`,
              ].join('\n')}
              style={{ alignSelf: 'flex-end', marginBottom: 4 }}
            />
          )}
          {/* РАЗБОР ОТВЕТА */}
          {(chosen !== null || typedOk !== null) && current.explanations && (() => {
            const explanationIdx = chosen !== null ? chosen : quizPrimaryCorrectIndex(current.correct);
            const explanationsArr =
              lang === 'uk' && current.explanationsUK?.length
                ? current.explanationsUK
                : lang === 'es' && current.explanationsES?.length
                  ? current.explanationsES
                  : current.explanations;
            const explanation = explanationsArr[explanationIdx];
            const correct =
              (chosen !== null && isQuizChoiceCorrect(chosen, current.correct)) || typedOk === true;
            if (!explanation) return null;
            return (
              <Animated.View style={{
                opacity: insertAnim,
                transform: [{ scale: insertScale }],
                backgroundColor: correct
                  ? (isLightTheme ? '#D6EAFF' : 'rgba(74,144,255,0.13)')
                  : (isLightTheme ? '#FFF3C4' : 'rgba(212,160,23,0.13)'),
                borderRadius: 14,
                padding: 16,
                marginBottom: 16,
                borderLeftWidth: 4,
                borderLeftColor: correct ? '#1565C0' : '#F59E0B',
              }}>
                <Text style={{ color: correct ? (isLightTheme ? '#0D47A1' : '#4A90FF') : (isLightTheme ? '#92400E' : '#D4A017'), fontSize: f.label, fontWeight: '700', marginBottom: 6, letterSpacing: 0.3 }}>
                  {triLang(lang, { ru: 'РАЗБОР', uk: 'ПОЯСНЕННЯ', es: 'EXPLICACIÓN' })}
                </Text>
                <Text style={{ color: isLightTheme ? (correct ? '#0D47A1' : '#78350F') : t.textPrimary, fontSize: f.body, lineHeight: f.body * 1.5 }}>
                  {explanation}
                </Text>
              </Animated.View>
            );
          })()}

          {/* ВАРИАНТЫ / ВВОД */}
          {settings.hardMode ? (
            <View>
              <View style={{
                borderBottomWidth: 1.5,
                borderBottomColor: typedOk===null ? t.border : typedOk ? t.correct : t.wrong,
                marginBottom: 16,
              }}>
                <TextInput
                  style={{ color: typedOk===null ? t.textPrimary : typedOk ? t.correct : t.wrong, fontSize: f.h1, paddingVertical:10 }}
                  value={typed}
                  onChangeText={setTyped}
                  placeholder={triLang(lang, {
                    ru: 'Введите ответ...',
                    uk: 'Введіть відповідь...',
                    es: 'Escribe tu respuesta...',
                  })}
                  placeholderTextColor={t.textGhost}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={typedOk === null}
                  returnKeyType="done"
                  onSubmitEditing={handleTyped}
                />
              </View>
              {typedOk === null && (
                <TouchableOpacity
                  style={{ backgroundColor:t.bgSurface, borderRadius:14, padding:18, alignItems:'center', borderWidth:0.5, borderColor:t.border }}
                  onPress={handleTyped} activeOpacity={0.8}
                >
                  <Text style={{ color:t.textPrimary, fontSize: f.bodyLg, fontWeight:'600' }}>
                    {triLang(lang, { ru: 'Проверить', uk: 'Перевірити', es: 'Comprobar' })}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            chosen === null && (
              <View style={{ gap:10 }}>
                {(current.choices || []).map((ch, ci) => (
                  <TouchableOpacity key={ci}
                    style={{ backgroundColor:t.bgCard, borderWidth:1, borderColor:t.border, borderRadius:14, padding:18 }}
                    onPress={() => handleChoice(ci)} activeOpacity={0.8}
                  >
                    <Text style={{ color:t.textPrimary, fontSize: f.h2 + 2, fontWeight:'600' }}>{ch}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )
          )}

          {/* Hard mode tip */}
          {showHardTip && settings.hardMode && !hardTipDismissed && (
            <View style={{
              marginTop: 8,
              backgroundColor: t.bgCard, borderRadius: 14,
              padding: 14, borderWidth: 0.5, borderColor: t.border,
            }}>
              <Text style={{ color: t.textMuted, fontSize: f.sub, lineHeight: 19, marginBottom: 10 }}>
                {triLang(lang, {
                  ru: '💡 Сложно набирать вручную? Можно выключить ввод с клавиатуры.',
                  uk: '💡 Складно набирати вручну? Можна вимкнути ввід з клавіатури.',
                  es: '💡 ¿Cuesta escribir a mano? Puedes desactivar el teclado.',
                })}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: t.bgSurface, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 0.5, borderColor: t.border }}
                  onPress={async () => {
                                        const next = { ...settings, hardMode: false };
                    await saveSettings(next);
                    setSettings(next);
                    setShowHardTip(false);
                  }}
                >
                  <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '600' }}>
                    {triLang(lang, { ru: 'Выключить', uk: 'Вимкнути', es: 'Desactivar' })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' }}
                  onPress={async () => {
                    await AsyncStorage.setItem('hard_tip_dismissed', '1');
                    setHardTipDismissed(true);
                    setShowHardTip(false);
                  }}
                >
                  <Text style={{ color: t.textGhost, fontSize: f.caption, textAlign: 'center' }}>
                    {triLang(lang, {
                      ru: 'Больше не показывать',
                      uk: 'Більше не показувати',
                      es: 'No volver a mostrar',
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          </ScrollView>

          {/* Кнопка "далее" — закреплена снизу, вне ScrollView */}
          {(chosen !== null || typedOk !== null) && (
            <TouchableOpacity
              onPress={nextReady ? handleTap : undefined}
              activeOpacity={nextReady ? 0.7 : 1}
              style={{
                marginHorizontal: 20,
                marginBottom: 12,
                marginTop: 8,
                backgroundColor: nextReady ? t.correct : t.bgCard,
                borderRadius: 14,
                padding: 16,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Text style={{ color: nextReady ? t.correctText : t.textMuted, fontSize: f.bodyLg, fontWeight: '700' }}>
                {triLang(lang, { ru: 'Далее', uk: 'Далі', es: 'Siguiente' })}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={nextReady ? t.correctText : t.textMuted}/>
            </TouchableOpacity>
          )}
        </Animated.View>

      </KeyboardAvoidingView>
      </ContentWrap>
    </View>

    <QuizTimeoutModal visible={showTimeoutAlert} hardMode={settings.hardMode} onClose={handleTimeoutClose} />

    <NoEnergyModal
      visible={showNoEnergyModal}
      onClose={() => { setShowNoEnergyModal(false); router.back(); }}
      paywallContext="quiz_limit"
    />

    </ScreenGradient>
    </Animated.View>
  );
}

// ── КОРНЕВОЙ КОМПОНЕНТ ───────────────────────────────────────────────────────
export default function QuizzesScreen() {
  const [level, setLevel] = useState<Level|null>(null);
  const [gameKey, setGameKey] = useState(0);
  const { energy, bonusEnergy, isUnlimited } = useEnergy();
  const energySnapRef = useRef({ e: 0, b: 0, u: false });
  energySnapRef.current = { e: energy, b: bonusEnergy, u: isUnlimited };

  useEffect(() => {
    void (async () => {
      const val = await AsyncStorage.getItem('quiz_nav_level');
      if (val === 'hard' || val === 'medium' || val === 'easy') {
        await new Promise(r => setTimeout(r, 200));
        const snap = energySnapRef.current;
        if (!snap.u && snap.e + snap.b <= 0) {
          await AsyncStorage.removeItem('quiz_nav_level');
          emitAppEvent('action_toast', {
            type: 'error',
            messageRu: 'Недостаточно энергии для квиза.',
            messageUk: 'Недостатньо енергії для квізу.',
            messageEs: 'No tienes energía suficiente para el cuestionario.',
          });
          return;
        }
        await AsyncStorage.removeItem('quiz_nav_level');
        setLevel(val as Level);
      }
    })();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {level
        ? <QuizGame key={gameKey} level={level} onBack={() => { setLevel(null); setGameKey(k => k + 1); }}/>
        : <LevelSelect onSelect={setLevel}/>
      }
    </View>
  );
}
