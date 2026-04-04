import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView, Share,
    Image,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const LEVEL_IMAGES: Record<string, number> = {
  easy:   require('../assets/images/levels/easy.png'),
  medium: require('../assets/images/levels/medium.png'),
  hard:   require('../assets/images/levels/hard.png'),
};
import AddToFlashcard from '../components/AddToFlashcard';
import BonusXPCard from '../components/BonusXPCard';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import LevelBadge from '../components/LevelBadge';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { isCorrectAnswer } from '../constants/contractions';
import { getXPProgress } from '../constants/theme';
import { checkAchievements } from './achievements';
import { DEV_MODE, STORE_URL } from './config';
import { updateMultipleTaskProgress } from './daily_tasks';
import { DebugLogger } from './debug-logger';
import { spendEnergy } from './energy_system';
import { pointsForAnswer, streakMultiplier } from './hall_of_fame_utils';
import { getQuizPhrases, QuizPhrase } from './quiz_data';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, UserSettings as Settings } from './settings_edu';
import { useTabNav } from './TabContext';
import { calculateRewardWithBonus } from './variable_reward_system';
import { registerXP } from './xp_manager';

// Используем QuizPhrase из quiz_data.ts
type Phrase = QuizPhrase;

// Палитра карточек — каждая тема имеет СВОИ 3 уникальных цвета
// gradA = насыщенная сторона (слева), gradB = тёмная/светлая сторона (справа)
// Палитра карточек — каждая тема имеет СВОИ 3 уникальных цвета
const THEME_PALETTES: Record<string, Record<Level, { gradA: string; gradB: string; accent: string }>> = {
  dark: {
    easy:   { gradA: '#0A2840', gradB: '#040F1A', accent: '#38BDF8' },
    medium: { gradA: '#3A0A14', gradB: '#180508', accent: '#F87171' },
    hard:   { gradA: '#1A0A38', gradB: '#08041A', accent: '#A78BFA' },
  },
  light: {
    easy:   { gradA: '#BAE6FD', gradB: '#E0F2FE', accent: '#0284C7' },
    medium: { gradA: '#FECDD3', gradB: '#FFF1F2', accent: '#BE123C' },
    hard:   { gradA: '#E9D5FF', gradB: '#F5F3FF', accent: '#6D28D9' },
  },
  neon: {
    easy:   { gradA: '#003D3D', gradB: '#000D0D', accent: '#00F5FF' },
    medium: { gradA: '#3D0025', gradB: '#0D000A', accent: '#FF006E' },
    hard:   { gradA: '#1E2D00', gradB: '#080A00', accent: '#BFFF00' },
  },
  gold: {
    easy:   { gradA: '#2D1E00', gradB: '#0E0800', accent: '#FBB040' },
    medium: { gradA: '#2D0E12', gradB: '#0E0508', accent: '#E8735A' },
    hard:   { gradA: '#002D2A', gradB: '#000E0D', accent: '#00B8A9' },
  },
};

// DEPRECATED: Use theme.textPrimary and theme.textMuted directly
// Kept for backward compatibility with locked items
const THEME_TEXT: Record<string, { primary: string; secondary: string }> = {
  dark:  { primary: '#FFFFFF', secondary: 'rgba(255,255,255,0.6)' },
  light: { primary: '#0F172A', secondary: 'rgba(15,23,42,0.6)'   },
  neon:  { primary: '#FFFFFF', secondary: 'rgba(255,255,255,0.6)' },
  gold:  { primary: '#FFFFFF', secondary: 'rgba(255,255,255,0.6)' },
};

const LEVEL_CONFIG = {
  easy:   { labelRU:'Легко',  labelUK:'Легко',    sub:'A1–A2', color:'#4ADE80', pts:1,
            tagRU:'Простые фразы повседневной речи', tagUK:'Прості фрази повсякденної мови', icon:'🌿' },
  medium: { labelRU:'Средне', labelUK:'Середньо', sub:'B1–B2', color:'#FB923C', pts:2,
            tagRU:'Сложнее — больше очков за серию', tagUK:'Складніше — більше очок за серію', icon:'🔥' },
  hard:   { labelRU:'Сложно', labelUK:'Складно',  sub:'C1–C2', color:'#A78BFA', pts:3,
            tagRU:'Элитный уровень. Максимум очков', tagUK:'Елітний рівень. Максимум очок', icon:'💎' },
};
type Level = 'easy'|'medium'|'hard';

// Тип фразы для квиза — используем QuizPhrase из quiz_data
// level передаётся из QuizGame



// ── Множитель-бейдж ──────────────────────────────────────────────────────────
function MultBadge({ streak, t, f }: { streak:number; t:any; f:any }) {
  const scale = useRef(new Animated.Value(1)).current;
  const prev  = useRef(streak);
  const mult  = streakMultiplier(streak);

  useEffect(() => {
    if (streak > prev.current) {
      Animated.sequence([
        Animated.timing(scale, { toValue:1.6, duration:120, useNativeDriver:true }),
        Animated.spring(scale,  { toValue:1,   useNativeDriver:true, friction:4 }),
      ]).start();
    }
    prev.current = streak;
  }, [streak]);

  if (streak < 2) return null;
  return (
    <Animated.View style={{
      transform:[{scale}], flexDirection:'row', alignItems:'center',
      backgroundColor:t.accentBg, borderRadius:10,
      paddingHorizontal:8, paddingVertical:4, marginRight:6,
    }}>
      <Ionicons name="flame" size={13} color={t.textSecond}/>
      <Text style={{ color:t.textSecond, fontWeight:'700', fontSize: f.body, marginLeft:2 }}>{streak}</Text>
      {mult > 1 && <Text style={{ color:t.textSecond, fontSize: f.caption }}> ×{mult}</Text>}
    </Animated.View>
  );
}

// ── Анимация сброса стрика ───────────────────────────────────────────────────
function StreakBreak({ show, old, t, f }: { show:boolean; old:number; t:any; f:any }) {
  const y   = useRef(new Animated.Value(0)).current;
  const opa = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!show) return;
    y.setValue(0); opa.setValue(1);
    Animated.parallel([
      Animated.timing(y,   { toValue:40, duration:600, useNativeDriver:true }),
      Animated.timing(opa, { toValue:0,  duration:600, useNativeDriver:true }),
    ]).start();
  }, [show]);
  if (!show || old < 2) return null;
  return (
    <Animated.View style={{
      position:'absolute', top:8, right:60,
      transform:[{translateY:y}], opacity:opa,
      flexDirection:'row', alignItems:'center', gap:4,
    }}>
      <Ionicons name="flame" size={14} color={t.wrong}/>
      <Text style={{ color:t.wrong, fontSize: f.body, fontWeight:'700', textDecorationLine:'line-through' }}>
        ×{streakMultiplier(old)}
      </Text>
    </Animated.View>
  );
}

// ── ВЫБОР УРОВНЯ ────────────────────────────────────────────────────────────
function LevelSelect({ onSelect }: { onSelect:(l:Level)=>void }) {
  const { goHome } = useTabNav();
  const { theme:t , f, themeMode } = useTheme();
  const { s, lang } = useLang();
  const router = useRouter();
  const [isPremium, setIsPremium] = useState(false);
  const [selected, setSelected] = useState<Level | null>(null);
  const isUK = lang === 'uk';

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
          Animated.timing(pulseAnims[lv], { toValue: 1.18, duration: 900 + i * 120, useNativeDriver: true }),
          Animated.timing(pulseAnims[lv], { toValue: 1.0,  duration: 900 + i * 120, useNativeDriver: true }),
        ])
      );
      anim.start();
      return anim;
    });
    return () => loops.forEach(a => a.stop());
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('premium_active').then(v => setIsPremium(v === 'true'));
  }, []);

  const handleStart = (lv: Level) => {
    const anim = fillAnims[lv];
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 380, useNativeDriver: false }).start(() => {
      anim.setValue(0);
      onSelect(lv);
    });
  };

  return (
    <ScreenGradient>
    <View style={{ flex:1 }}>
      <ContentWrap>
      <View style={{ flexDirection:'row', alignItems:'center', padding:16, borderBottomWidth:0.5, borderBottomColor:t.border }}>
        <TouchableOpacity
          style={{ width:38, height:38, borderRadius:19, backgroundColor:t.bgCard, borderWidth:0.5, borderColor:t.border, justifyContent:'center', alignItems:'center' }}
          onPress={() => goHome()}
        >
          <Ionicons name="chevron-back" size={22} color={t.textPrimary}/>
        </TouchableOpacity>
        <Text style={{ color:t.textPrimary, fontSize: f.numMd, fontWeight:'700', marginLeft:12, flex:1 }} adjustsFontSizeToFit numberOfLines={1}>
          {s.quizzes.selectLevel}
        </Text>
      </View>

      <View style={{ flex:1, justifyContent:'center', paddingHorizontal:20, gap:8 }}>
        {(Object.keys(LEVEL_CONFIG) as Level[]).map(lv => {
          const c        = LEVEL_CONFIG[lv];
          const lbl      = lang === 'uk' ? c.labelUK : c.labelRU;
          const tag      = lang === 'uk' ? c.tagUK : c.tagRU;
          const locked   = !DEV_MODE && !isPremium;
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
                  if (locked) { router.push('/premium_modal'); return; }
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
                const fillWidth = fillAnims[lv].interpolate({ inputRange:[0,1], outputRange:['0%','100%'] });
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
                    {/* Fill sweep */}
                    <Animated.View style={{
                      position: 'absolute', top: 0, left: 0, bottom: 0,
                      width: fillWidth,
                      backgroundColor: accent,
                    }} />
                    {/* Text */}
                    <Text style={{ color: accent, fontSize: f.body, fontWeight:'800', zIndex: 1 }}>
                      {isUK ? 'Почати квіз' : 'Начать квиз'} · {lbl}
                    </Text>
                  </TouchableOpacity>
                );
              })()}
            </View>
          );
        })}
      </View>
      </ContentWrap>
    </View>
    </ScreenGradient>
  );
}

// ── КВИЗ ────────────────────────────────────────────────────────────────────
function QuizGame({ level, onBack }: { level:Level; onBack:()=>void }) {
  const { theme:t , f } = useTheme();
  const { s, lang } = useLang();
  const { goHome, activeIdx } = useTabNav();
  const isUK  = lang === 'uk';
  const cfg   = LEVEL_CONFIG[level] ?? LEVEL_CONFIG['easy'];
  if (!cfg) return null; // guard против undefined level
  const label = isUK ? cfg.labelUK : cfg.labelRU;

  const [phrases, setPhrases]   = useState<Phrase[]>([]);
  const [phrasesLoaded, setPhrasesLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Загружаем фразы асинхронно чтобы избежать блокировки рендера
  useEffect(() => {
    setPhrasesLoaded(false);
    setPhrases([]);
    const timer = setTimeout(() => {
      try {
        const result = getQuizPhrases(level, 10, lang as 'ru' | 'uk');
        setPhrases(result.length > 0 ? result : []);
      } catch (e) {
        DebugLogger.error('quizzes.tsx:loadPhrases', e, 'warning');
        setPhrases([]);
      } finally {
        setPhrasesLoaded(true);
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [level, lang, retryCount]);
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
  const TIMER_SECONDS = level === 'easy' ? 40 : level === 'medium' ? 50 : 70;
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isTabActiveRef = useRef(true);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showTimeoutAlert, setShowTimeoutAlert] = useState(false);
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
  const mountOpacity = useRef(new Animated.Value(0)).current;
  const mountScale   = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(mountOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(mountScale,   { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

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
    if (score > 0) {
      updateMultipleTaskProgress([{ type: 'quiz_score', increment: score }]).catch(() => {});
    }
  }, [done]);

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
    if (done || reviewing || !phrasesLoaded) return;
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
  }, [idx, done, reviewing, phrasesLoaded]);

  // Обработка завершения квиза с переменной наградой
  useEffect(() => {
    if (!done || score === 0 || phrases.length === 0) return;

    const processDoneQuiz = async () => {
      try {
        const total = phrases.length;
        const right = results.filter(Boolean).length;
        const pct = Math.round(right / total * 100);

        // Показываем бонус только если достигнута оценка >= 70% (хорошо и выше)
        if (pct >= 70) {
          const reward = calculateRewardWithBonus(score);
          if (reward.hasBonusWon) {
            setBonusXP(reward.bonusXP);
            setShowBonus(true);

            // Добавляем бонус к уже начисленному XP
            const [xpRaw] = await Promise.all([
              AsyncStorage.getItem('user_total_xp'),
            ]);
            const currentXP = parseInt(xpRaw || '0') || 0;
            // registerXP already handles adding to user_total_xp and addOrUpdateScore
            if (userNameRef.current) { await registerXP(reward.bonusXP, 'bonus_chest', userNameRef.current, lang); }
          }
        }
      } catch (error) {
        DebugLogger.error('quizzes.tsx:processDoneQuiz', error, 'warning');
      }
    };

    processDoneQuiz();
  }, [done, score, results, phrases.length, lang]);

  const current = reviewing ? reviewQ[rIdx] : phrases[idx];

  // Guard: loading пока фразы загружаются
  if (!phrasesLoaded || phrases.length === 0) {
    return (
      <ScreenGradient>
      <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
        <ContentWrap>
        <Text style={{ color:t.textMuted, fontSize: f.body }}>
          {isUK ? 'Завантаження питань...' : 'Загрузка вопросов...'}
        </Text>
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
          {isUK ? 'Завантаження...' : 'Загрузка...'}
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
      Animated.timing(insertAnim,  { toValue:1, duration:300, useNativeDriver:true }),
      Animated.spring(insertScale, { toValue:1, useNativeDriver:true, friction:5 }),
    ]).start();
  };

  const afterAnswer = async (isRight: boolean) => {
    const nr = reviewing ? results : [...results, isRight];
    if (!reviewing) { resultsRef.current = nr; setResults(nr); }

    if (!isRight && settings.haptics) {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
    }

    if (!reviewing) {
      if (isRight) {
        // Используем streakRef.current — всегда актуальное значение
        const currentStreak = streakRef.current;
        const ns  = currentStreak + 1;
        const pts = pointsForAnswer(level, ns);

        // Обновляем стейт и ref
        streakRef.current = ns;
        setStreak(ns);
        setPrevStr(currentStreak);
        setShowBreak(false);
        setScore(p => p + pts);

        // Начисляем баллы — имя уже в ref, нет асинхронного запроса
        if (userNameRef.current) { await registerXP(pts, 'quiz_answer', userNameRef.current, lang); }
        // Триггеры заданий — quiz_score обновляется в done useEffect (один раз с итогом сессии)
        const updates: Parameters<typeof updateMultipleTaskProgress>[0] = [
          { type: 'total_answers' },
          { type: 'daily_active' },
        ];
        if (level === 'hard') updates.push({ type: 'quiz_hard' });
        updateMultipleTaskProgress(updates);
      } else {
        const currentStreak = streakRef.current;
        streakRef.current = 0;
        setPrevStr(currentStreak);
        setShowBreak(currentStreak >= 2);
        setStreak(0);
        setTimeout(() => setShowBreak(false), 800);

        // Spend energy on wrong answer in quiz
        spendEnergy(1).catch(() => {});

        if (settings.hardMode && !hardTipDismissed) {
          const newCount = hardWrongCount + 1;
          setHardWrongCount(newCount);
          if (newCount >= 2) setShowHardTip(true);
        }
      }
    }

    if (settings.voiceOut && isTabActiveRef.current) Speech.speak(current.answer, { language:'en-US', rate: settings.speechRate ?? 1.0 });

    // Задержка зависит от уровня и настройки autoAdvance
    // easy=4с, medium=6с, hard=8с — только если autoAdvance включён
    const autoDelay = level === 'hard' ? 8000 : level === 'medium' ? 6000 : 4000;

    const doNext = () => {
      Animated.timing(fadeAnim, { toValue:0, duration:130, useNativeDriver:true }).start(() => {
        if (!reviewing) {
          if (idx + 1 >= phrases.length) {
            const wrong = phrases.filter((_, i) => !nr[i]);
            if (wrong.length > 0) { setReviewQ(wrong); setRIdx(0); setReviewing(true); }
            else setDone(true);
          } else setIdx(i => i + 1);
        } else {
          if (isRight) {
            const nq = reviewQ.filter((_, i) => i !== rIdx);
            if (nq.length === 0) setDone(true);
            else { setReviewQ(nq); setRIdx(i => i >= nq.length ? 0 : i); }
          } else {
            const item = reviewQ[rIdx];
            const nq   = [...reviewQ.filter((_, i) => i !== rIdx), item];
            setReviewQ(nq); setRIdx(i => i >= nq.length ? 0 : i);
          }
        }
        setChosen(null); setTyped(''); setTypedOk(null);
        Animated.timing(fadeAnim, { toValue:1, duration:160, useNativeDriver:true }).start();
      });
    };

    if (settings.autoAdvance) {
      autoAdvanceTimerRef.current = setTimeout(doNext, autoDelay);
    }
    // Если autoAdvance выключен — ждём тапа (обработается в handleTap)
  };

  const handleChoice = (ci: number) => {
    if (chosen !== null) return;
    answeredRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    setChosen(ci);
    playInsertAnim();
    afterAnswer(ci === current.correct);
  };

  const handleTyped = () => {
    if (typedOk !== null) return;
    answeredRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    const ok = isCorrectAnswer(typed, current.answer);
    setTypedOk(ok);
    playInsertAnim();
    afterAnswer(ok);
  };

  // ── ФИНАЛЬНЫЙ ЭКРАН ──────────────────────────────────────────────────────
  if (done) {
    const total = phrases.length;
    const right = results.filter(Boolean).length;
    const pct   = Math.round(right / total * 100);
    const rankInfo = pct === 100
      ? { icon:'🏆', labelRU:'Безупречно!',  labelUK:'Бездоганно!',  color:'#D4A017' }
      : pct >= 90
      ? { icon:'🥇', labelRU:'Отлично!',     labelUK:'Відмінно!',    color:'#D4A017' }
      : pct >= 70
      ? { icon:'🥈', labelRU:'Хорошо!',      labelUK:'Добре!',       color:t.textSecond }
      : pct >= 50
      ? { icon:'🥉', labelRU:'Неплохо',      labelUK:'Непогано',     color:t.textSecond }
      : { icon:'📚', labelRU:'Практикуйся!', labelUK:'Практикуйся!', color:t.textMuted };
    const rankLabel = lang === 'uk' ? rankInfo.labelUK : rankInfo.labelRU;
    return (
      <ScreenGradient>
      <View style={{ flex:1 }}>
        <ContentWrap>
        <View style={{ flex:1, justifyContent:'center', alignItems:'center', padding:30 }}>
          <Text style={{ fontSize: f.numLg + 28, marginBottom:10 }} adjustsFontSizeToFit numberOfLines={1}>{rankInfo.icon}</Text>
          <View style={{ backgroundColor: `${rankInfo.color}22`, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 8, borderWidth: 1, borderColor: `${rankInfo.color}55`, marginBottom:16 }}>
            <Text style={{ color: rankInfo.color, fontSize: f.h2, fontWeight: '800', letterSpacing: 0.5 }}>{rankLabel}</Text>
          </View>
          <Text style={{ color:t.textPrimary, fontSize: f.numLg, fontWeight:'700', marginBottom:10 }} adjustsFontSizeToFit numberOfLines={1}>{s.quizzes.done}</Text>
          <Text style={{ color:t.textPrimary, fontSize: f.h1, marginBottom:4 }}>{right} / {total}</Text>
          <Text style={{ color:t.textSecond, fontSize: f.numLg + 8, fontWeight:'700', marginBottom:8 }} adjustsFontSizeToFit numberOfLines={1}>{pct}%</Text>
          <Text style={{ color:t.correct, fontSize: f.h2, fontWeight:'600', marginBottom:16 }}>
            +{score} {lang==='uk'?'досвіду':'опыта'}
          </Text>
          {/* Уровень игрока */}
          {(() => {
            const { level: lv, xpInLevel, xpNeeded, progress } = getXPProgress(totalXP + score);
            return (
              <View style={{ backgroundColor:t.bgCard, borderRadius:14, borderWidth:0.5, borderColor:t.border, padding:14, width:'100%', flexDirection:'row', alignItems:'center', gap:12, marginBottom:28 }}>
                <LevelBadge level={lv} size={40} />
                <View style={{ flex:1 }}>
                  <Text style={{ color:t.textPrimary, fontSize:f.body, fontWeight:'700' }}>
                    {lang==='uk' ? `Рівень ${lv}` : `Уровень ${lv}`}
                  </Text>
                  <View style={{ height:5, backgroundColor:t.bgSurface, borderRadius:3, overflow:'hidden', marginTop:5 }}>
                    <View style={{ height:'100%', width:`${Math.round(progress*100)}%` as any, backgroundColor:'#D4A017', borderRadius:3 }} />
                  </View>
                  <Text style={{ color:t.textMuted, fontSize:f.label, marginTop:3 }}>{xpInLevel} / {xpNeeded} XP</Text>
                </View>
              </View>
            );
          })()}
          <TouchableOpacity
            style={{ width:'100%', borderWidth:1.5, borderColor:cfg.color, padding:18, borderRadius:14, alignItems:'center', marginBottom:12, backgroundColor:t.bgCard }}
            onPress={() => {
              // Отменяем все pending таймеры от предыдущей игры
              if (autoAdvanceTimerRef.current) { clearTimeout(autoAdvanceTimerRef.current); autoAdvanceTimerRef.current = null; }
              if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
              fadeAnim.stopAnimation();
              fadeAnim.setValue(1);
              setIdx(0); setChosen(null); setScore(0);
              setStreak(0); streakRef.current = 0;
              setResults([]); setDone(false); setReviewing(false);
              setTyped(''); setTypedOk(null);
              setRetryCount(c => c + 1); // принудительно перезагружает вопросы
            }}
          >
            <Text style={{ color:cfg.color, fontSize: f.bodyLg, fontWeight:'600' }}>{s.quizzes.again}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ padding:14 }} onPress={onBack}>
            <Text style={{ color:t.textMuted, fontSize: f.body }}>{s.quizzes.back}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flexDirection:'row', alignItems:'center', gap:8, padding:10 }}
            onPress={async () => {
              const msg = lang === 'uk'
                ? `Пройшов квіз у Phraseman — ${right}/${total} (${pct}%) ${rankInfo.icon}\n${STORE_URL}`
                : `Прошёл квиз в Phraseman — ${right}/${total} (${pct}%) ${rankInfo.icon}\n${STORE_URL}`;
              try { await Share.share({ message: msg }); } catch {}
            }}
          >
            <Ionicons name="share-outline" size={16} color={t.textGhost}/>
            <Text style={{ color:t.textGhost, fontSize: f.body }}>
              {lang==='uk' ? 'Поділитися' : 'Поделиться'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ padding:12 }}
            onPress={() => goHome()}
          >
            <Text style={{ color:t.textMuted, fontSize: f.body, textDecorationLine:'underline' }}>
              {lang==='uk' ? '🏠 На головну' : '🏠 На главную'}
            </Text>
          </TouchableOpacity>
        </View>
        </ContentWrap>
        {showBonus && (
          <BonusXPCard
            bonusXP={bonusXP}
            onDismiss={() => setShowBonus(false)}
            position="center"
            duration={2000}
          />
        )}
      </View>
      </ScreenGradient>
    );
  }

  const mult          = streakMultiplier(streak);
  const isRight       = chosen !== null ? chosen === current.correct : null;
  const displayAnswer = chosen !== null
    ? current.choices[chosen]
    : typedOk !== null ? typed : null;
  const displayColor  = isRight === true || typedOk === true
    ? t.correct
    : isRight === false || typedOk === false
      ? t.wrong
      : t.textPrimary;

  // Переход к следующему вопросу (тап по экрану или кнопка "Далее")
  const handleTap = () => {
    if (chosen === null && typedOk === null) return; // ещё не ответили
    // Останавливаем озвучку если играет
    Speech.stop();
    // Отменяем авто-таймер если был запланирован
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    Animated.timing(fadeAnim, { toValue:0, duration:130, useNativeDriver:true }).start(() => {
      if (!reviewing) {
        if (idx + 1 >= phrases.length) {
          const nr2 = resultsRef.current; // use ref to avoid stale closure
          const wrong = phrases.filter((_, i) => !nr2[i]);
          if (wrong.length > 0) { setReviewQ(wrong); setRIdx(0); setReviewing(true); }
          else setDone(true);
        } else setIdx(i => i + 1);
      } else {
        const lastRight = chosen === current.correct || typedOk === true;
        if (lastRight) {
          const nq = reviewQ.filter((_, i) => i !== rIdx);
          if (nq.length === 0) setDone(true);
          else { setReviewQ(nq); setRIdx(i => i >= nq.length ? 0 : i); }
        } else {
          const item = reviewQ[rIdx];
          const nq   = [...reviewQ.filter((_, i) => i !== rIdx), item];
          setReviewQ(nq); setRIdx(i => i >= nq.length ? 0 : i);
        }
      }
      setChosen(null); setTyped(''); setTypedOk(null);
      Animated.timing(fadeAnim, { toValue:1, duration:160, useNativeDriver:true }).start();
    });
  };

  return (
    <Animated.View style={{ flex:1, opacity: mountOpacity, transform: [{ scale: mountScale }] }}>
    <ScreenGradient>
    <View style={{ flex:1 }}>
      <ContentWrap>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':'height'}>

        {/* ХЕДЕР */}
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:15 }}>
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

        <Pressable
          style={{ flex: 1 }}
          onPress={(chosen !== null || typedOk !== null) ? handleTap : undefined}
        >
        <Animated.View style={{ flex:1, opacity:fadeAnim }}>
          <ScrollView contentContainerStyle={{ paddingHorizontal:20, paddingTop:20, paddingBottom:40, flexGrow:1 }} keyboardShouldPersistTaps="handled">
          <Text style={{ color:t.textMuted, fontSize: f.caption, marginBottom:14 }}>
            {(reviewing?rIdx:idx)+1} / {reviewing?reviewQ.length:phrases.length}
          </Text>

          {/* ВОПРОС */}
          <Text style={{ color:t.textPrimary, fontSize: f.h2 + 6, fontWeight:'500', marginBottom:20, lineHeight:32 }}>
            {isUK ? current.uk : current.ru}
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ color: displayColor, fontSize: f.h2 + 2, fontWeight: '600', lineHeight: (f.h2 + 2) * 1.4, flex: 1 }}>
                  {current.answer}
                </Text>
                <View onStartShouldSetResponder={() => true}>
                  <AddToFlashcard en={current.answer} ru={current.ru} uk={current.uk} source="lesson" sourceId="quiz" />
                </View>
              </View>
              {(isRight === false || typedOk === false) && (
                <Text style={{ color: t.wrong, fontSize: f.bodyLg, marginTop: 6, textDecorationLine: 'line-through', opacity: 0.8 }}>
                  {displayAnswer}
                </Text>
              )}
            </Animated.View>
          )}
          {/* РАЗБОР ОТВЕТА */}
          {(chosen !== null || typedOk !== null) && current.explanations && (() => {
            const explanationIdx = chosen !== null ? chosen : current.correct;
            const explanation = current.explanations[explanationIdx];
            const correct = chosen === current.correct || typedOk === true;
            if (!explanation) return null;
            return (
              <Animated.View style={{
                opacity: insertAnim,
                transform: [{ scale: insertScale }],
                backgroundColor: correct ? 'rgba(74,144,255,0.13)' : 'rgba(212,160,23,0.13)',
                borderRadius: 14,
                padding: 16,
                marginBottom: 16,
                borderLeftWidth: 3,
                borderLeftColor: correct ? '#4A90FF' : '#D4A017',
              }}>
                <Text style={{ color: correct ? '#4A90FF' : '#D4A017', fontSize: f.label, fontWeight: '700', marginBottom: 6, letterSpacing: 0.3 }}>
                  {lang === 'uk' ? 'ПОЯСНЕННЯ' : 'РАЗБОР'}
                </Text>
                <Text style={{ color: t.textPrimary, fontSize: f.body, lineHeight: f.body * 1.5 }}>
                  {explanation}
                </Text>
              </Animated.View>
            );
          })()}

          {/* Кнопка "далее" после ответа если autoAdvance выключен */}
          {(chosen !== null || typedOk !== null) && !settings.autoAdvance && (
            <TouchableOpacity
              onPress={handleTap}
              activeOpacity={0.7}
              style={{
                marginTop: 16,
                backgroundColor: t.bgSurface,
                borderRadius: 14,
                padding: 16,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: t.border,
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '600' }}>
                {lang==='uk' ? 'Далі' : 'Далее'}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={t.textPrimary}/>
            </TouchableOpacity>
          )}

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
                  placeholder="Type your answer..."
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
                    {lang==='uk'?'Перевірити':'Проверить'}
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
                {isUK
                  ? '💡 Складно набирати вручну? Можна вимкнути ввід з клавіатури.'
                  : '💡 Сложно набирать вручную? Можно выключить ввод с клавиатуры.'}
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
                    {isUK ? 'Вимкнути' : 'Выключить'}
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
                    {isUK ? 'Більше не показувати' : 'Больше не показывать'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          </ScrollView>
        </Animated.View>
        </Pressable>

      </KeyboardAvoidingView>
      </ContentWrap>
    </View>

    {/* Модал: время вышло */}
    <Modal transparent animationType="fade" visible={showTimeoutAlert} onRequestClose={() => { setShowTimeoutAlert(false); onBackRef.current(); }}>
      <Pressable style={{ flex:1, backgroundColor:'rgba(0,0,0,0.55)', justifyContent:'center', alignItems:'center', padding:32 }}
        onPress={() => { setShowTimeoutAlert(false); onBackRef.current(); }}
      >
        <Pressable onPress={e => e.stopPropagation()}>
          <View style={{ backgroundColor: t.bgCard, borderRadius: 24, padding: 28, alignItems: 'center', borderWidth: 0.5, borderColor: t.border, maxWidth: 320, width: '100%' }}>
            <Text style={{ fontSize: 52, marginBottom: 12 }}>⏰</Text>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', textAlign: 'center', marginBottom: 10 }}>
              {isUK ? 'Час вийшов!' : 'Время вышло!'}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', lineHeight: 22, marginBottom: settings.hardMode ? 8 : 24 }}>
              {isUK ? 'Дуже шкода 😔 Спробуй ще раз!' : 'Очень жаль 😔 Попробуй ещё раз!'}
            </Text>
            {settings.hardMode && (
              <Text style={{ color: t.textSecond, fontSize: f.sub, textAlign: 'center', lineHeight: 20, marginBottom: 24, opacity: 0.85 }}>
                {isUK
                  ? 'Підказка: спробуй вибрати рівень легше або вимкни ручне введення в налаштуваннях.'
                  : 'Подсказка: попробуй выбрать уровень полегче или выключи ручной ввод в настройках.'}
              </Text>
            )}
            <TouchableOpacity
              style={{ backgroundColor: t.accent, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, width: '100%', alignItems: 'center' }}
              onPress={() => { setShowTimeoutAlert(false); onBackRef.current(); }}
            >
              <Text style={{ color: '#fff', fontSize: f.body, fontWeight: '700' }}>
                {isUK ? 'Зрозуміло' : 'Понятно'}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>

    </ScreenGradient>
    </Animated.View>
  );
}

// ── КОРНЕВОЙ КОМПОНЕНТ ───────────────────────────────────────────────────────
export default function QuizzesScreen() {
  const [level, setLevel] = useState<Level|null>(null);
  const [gameKey, setGameKey] = useState(0);
  const [ready, setReady] = useState(false);
  const { activeIdx } = useTabNav();

  // Проверяем quiz_nav_level ДО первого рендера — чтобы не мелькал LevelSelect
  useEffect(() => {
    AsyncStorage.getItem('quiz_nav_level').then(val => {
      if (val === 'hard' || val === 'medium' || val === 'easy') {
        AsyncStorage.removeItem('quiz_nav_level');
        setLevel(val as Level);
      }
      setReady(true);
    });
  }, []);

  if (!ready) return null;

  return (
    <View style={{ flex: 1 }}>
      {level
        ? <QuizGame key={gameKey} level={level} onBack={() => { setLevel(null); setGameKey(k => k + 1); }}/>
        : <LevelSelect onSelect={setLevel}/>
      }
    </View>
  );
}
