import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hapticError, hapticTap } from '../../hooks/use-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { usePremium } from '../../components/PremiumContext';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import AddToFlashcard from '../../components/AddToFlashcard';
import BonusXPCard from '../../components/BonusXPCard';
import ContentWrap from '../../components/ContentWrap';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLang } from '../../components/LangContext';
import LevelBadge from '../../components/LevelBadge';
import PremiumCard from '../../components/PremiumCard';
import ScreenGradient from '../../components/ScreenGradient';
import { useTheme } from '../../components/ThemeContext';
import { triLang, type PlannedInterfaceLang } from '../../constants/i18n';
import XpGainBadge from '../../components/XpGainBadge';
import { isCorrectAnswer } from '../../constants/contractions';
import { getXPProgress } from '../../constants/theme';
import { MOTION_DURATION, MOTION_SCALE, MOTION_SPRING } from '../../constants/motion';
import { checkAchievements } from '../achievements';
import { bumpQuizSessionCompleted } from '../lifetime_profile_stats';
import { logQuizComplete, logQuizLevelSelected, logEnergyLimitHit } from '../firebase';
import { trackEnergyHit, trackQuizLevel } from '../user_stats';
import { emitAppEvent } from '../events';
import { DEV_MODE, STORE_URL } from '../config';
import { updateMultipleTaskProgress } from '../daily_tasks';
import { DebugLogger } from '../debug-logger';
import { useEnergy } from '../../components/EnergyContext';
import EnergyBar from '../../components/EnergyBar';
import NoEnergyModal from '../../components/NoEnergyModal';
import { navigateAfterModalClose } from '../safe_modal_navigation';
import { pointsForAnswer, streakMultiplier } from '../hall_of_fame_utils';
import { useAudio } from '../../hooks/use-audio';
import { isQuizChoiceCorrect, quizPrimaryCorrectIndex, type QuizPhrase } from '../quiz_data';
import { getQuizPhrasesLoaded } from '../quiz_phrases_loader';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, UserSettings as Settings } from '../settings_edu';
import { useTabNav } from '../TabContext';
import { tabSwipeLock } from '../tabSwipeLock';
import { calculateRewardWithBonus } from '../variable_reward_system';
import { registerXP } from '../xp_manager';
import { useEffectivePlatformOS } from '../platform_ui_preview';
import { recordMistake } from '../active_recall';
import { logMistake } from '../mistake_log';
import { resolvePhraseMistakeToken } from '../mistake_token_resolver';
import {
  QUIZ_E2E_OPEN_RESULTS_KEY,
  QUIZ_LEVEL_CARD_BACKGROUNDS,
  QUIZ_LEVEL_LOGOS,
} from '../quizzes/constants';
import { incrementHardPaywallBlock } from '../paywall_personalization';
import {
  FREE_DAILY_QUIZ_LIMIT,
  getFreeDailyQuizState,
  hasFreeDailyQuizzesLeft,
  incrementFreeDailyQuizCount,
  type QuizDailyLimitState,
} from '../quiz_daily_limit';
import {
  buildQuizShareMessage,
  getQuizShareRank,
  quizShareMessageLang,
} from '../quizzes/results';

const stripPunct = (w: string) => w.replace(/[^a-zA-Z0-9']/g, '').toLowerCase();
function diffWords(wrong: string, correct: string): { word: string; isWrong: boolean }[] {
  const wWords = wrong.trim().split(/\s+/);
  const cWords = correct.trim().split(/\s+/);
  const wn = wWords.length, cn = cWords.length;
  const dp: number[][] = Array.from({ length: wn + 1 }, () => new Array(cn + 1).fill(0));
  for (let i = 1; i <= wn; i++) {
    for (let j = 1; j <= cn; j++) {
      dp[i][j] = stripPunct(wWords[i-1]) === stripPunct(cWords[j-1])
        ? dp[i-1][j-1] + 1
        : Math.max(dp[i-1][j], dp[i][j-1]);
    }
  }
  const matched = new Set<number>();
  let i = wn, j = cn;
  while (i > 0 && j > 0) {
    if (stripPunct(wWords[i-1]) === stripPunct(cWords[j-1])) { matched.add(i-1); i--; j--; }
    else if (dp[i-1][j] >= dp[i][j-1]) i--;
    else j--;
  }
  return wWords.map((word, idx) => ({ word, isWrong: !matched.has(idx) }));
}

// Используем QuizPhrase из quiz_data.ts
type Phrase = QuizPhrase;

const quizSourceTextForPlanned = (phrase: Phrase, locale: PlannedInterfaceLang): string =>
  phrase.sourceLocale === locale ? phrase.sourceText ?? '' : '';

const quizSourceExplanationsForPlanned = (phrase: Phrase, locale: PlannedInterfaceLang): string[] | undefined =>
  phrase.sourceLocale === locale && phrase.sourceExplanations?.length ? phrase.sourceExplanations : undefined;

const isPlannedInterfaceLang = (value: unknown): value is PlannedInterfaceLang =>
  value === 'pt-BR' || value === 'vi' || value === 'id' || value === 'tr' || value === 'pl';

// Компонент-счётчик XP: слушает Animated.Value и обновляет текст
function XpCounter({ anim, xpNeeded, textStyle }: { anim: Animated.Value; xpNeeded: number; textStyle: object }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    const id = anim.addListener(({ value }) => setDisplayed(Math.round(value)));
    return () => anim.removeListener(id);
  }, [anim]);
  return <Text style={textStyle}>{displayed} / {xpNeeded} XP</Text>;
}

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
    easy:   { gradA: '#2A210F', gradB: '#080705', accent: '#F1CC72' },
    medium: { gradA: '#24180A', gradB: '#070504', accent: '#D7AD56' },
    hard:   { gradA: '#191108', gradB: '#040403', accent: '#FFE3A0' },
  },
  coral: {
    easy:   { gradA: '#2A2024', gradB: '#3A2A2E', accent: '#4A90FF' },
    medium: { gradA: '#2B1E22', gradB: '#463036', accent: '#FF6464' },
    hard:   { gradA: '#140D0F', gradB: '#3A2A2E', accent: '#FFD060' },
  },
  minimalLight: {
    easy:   { gradA: '#F7EFDF', gradB: '#E6D4B6', accent: '#2F8C66' },
    medium: { gradA: '#F3E8D9', gradB: '#E4C8A8', accent: '#B65E3A' },
    hard:   { gradA: '#EFEAF7', gradB: '#D5C6EA', accent: '#6D5EBA' },
  },
  minimalDark: {
    easy:   { gradA: '#182624', gradB: '#090F12', accent: '#6EA8FF' },
    medium: { gradA: '#281C1D', gradB: '#10090A', accent: '#F26D6D' },
    hard:   { gradA: '#1F1B2E', gradB: '#0B0914', accent: '#A78BFA' },
  },
  ocean: {
    easy:   { gradA: '#0C2840', gradB: '#1A6FA0', accent: '#30C0FF' },
    medium: { gradA: '#081830', gradB: '#0E5090', accent: '#00B0F0' },
    hard:   { gradA: '#040C20', gradB: '#083868', accent: '#00D8FF' },
  },
  sakura: {
    easy:   { gradA: '#4A1A2E', gradB: '#A02050', accent: '#E01870' },
    medium: { gradA: '#3A1425', gradB: '#802050', accent: '#E01870' },
    hard:   { gradA: '#2A0C18', gradB: '#601040', accent: '#FF2D6A' },
  },
};

// DEPRECATED: Use theme.textPrimary and theme.textMuted directly
// Kept for backward compatibility with locked items
const THEME_TEXT: Record<string, { primary: string; secondary: string }> = {
  dark:   { primary: '#FFFFFF', secondary: 'rgba(255,255,255,0.6)' },
  light:  { primary: '#0F172A', secondary: 'rgba(15,23,42,0.6)'   },
  neon:   { primary: '#FFFFFF', secondary: 'rgba(255,255,255,0.6)' },
  gold:   { primary: '#FFFFFF', secondary: 'rgba(255,255,255,0.6)' },
  coral:  { primary: '#FFFFFF', secondary: '#D8C2C5' },
  minimalLight: { primary: '#2E261B', secondary: 'rgba(46,38,27,0.66)' },
  minimalDark: { primary: '#F5F5F5', secondary: 'rgba(245,245,245,0.64)' },
  ocean:  { primary: 'rgba(240,252,255,0.96)', secondary: 'rgba(200,230,255,0.78)'  },
  sakura: { primary: 'rgba(255,248,252,0.96)', secondary: 'rgba(255,210,230,0.78)'  },
};

const LEVEL_CONFIG = {
  easy: {
    labelRU: 'Легко', labelUK: 'Легко', labelES: 'Fácil', labelPTBR: 'Fácil', labelVI: 'Dễ', labelID: 'Mudah', labelTR: 'Kolay', labelPL: 'Łatwy', sub: 'A1-A2', color: '#4ADE80', pts: 1,
    tagRU: 'Простые фразы повседневной речи',
    tagUK: 'Прості фрази повсякденної мови',
    tagES: 'Frases útiles del día a día',
    tagPTBR: 'Frases úteis do dia a dia',
    tagVI: 'Các cụm từ hữu ích hằng ngày',
    tagID: 'Frasa berguna untuk sehari-hari',
    tagTR: 'Günlük hayatta kullanılan pratik ifadeler',
    tagPL: 'Przydatne zwroty na co dzień',
    icon: '🌿',
  },
  medium: {
    labelRU: 'Средне', labelUK: 'Середньо', labelES: 'Medio', labelPTBR: 'Médio', labelVI: 'Trung bình', labelID: 'Sedang', labelTR: 'Orta', labelPL: 'Średni', sub: 'B1-B2', color: '#FB923C', pts: 2,
    tagRU: 'Сложнее - больше опыта за серию',
    tagUK: 'Складніше - більше досвіду за серію',
    tagES: 'Más difícil: más XP si mantienes la racha',
    tagPTBR: 'Mais difícil: mais XP se você mantiver a sequência',
    tagVI: 'Khó hơn: nhiều XP hơn nếu bạn giữ chuỗi',
    tagID: 'Lebih sulit: lebih banyak XP jika streak-mu berlanjut',
    tagTR: 'Daha zor: seriyi korursan daha fazla XP',
    tagPL: 'Trudniej: więcej XP, jeśli utrzymasz serię',
    icon: '🔥',
  },
  hard: {
    labelRU: 'Сложно', labelUK: 'Складно', labelES: 'Difícil', labelPTBR: 'Difícil', labelVI: 'Khó', labelID: 'Sulit', labelTR: 'Zor', labelPL: 'Trudny', sub: 'C1-C2', color: '#A78BFA', pts: 3,
    tagRU: 'Элитный уровень. Максимум опыта',
    tagUK: 'Елітний рівень. Максимум досвіду',
    tagES: 'Nivel experto: máximo XP',
    tagPTBR: 'Nível especialista: XP máximo',
    tagVI: 'Cấp chuyên gia: XP tối đa',
    tagID: 'Level ahli: XP maksimal',
    tagTR: 'Uzman seviyesi: maksimum XP',
    tagPL: 'Poziom ekspercki: maksymalne XP',
    icon: '💎',
  },
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
        Animated.timing(scale, { toValue: MOTION_SCALE.multBadge, duration: MOTION_DURATION.fast, useNativeDriver: true }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: MOTION_SPRING.ui.tension,
          friction: MOTION_SPRING.ui.friction,
        }),
      ]).start();
    }
    prev.current = streak;
  }, [streak, scale]);

  if (streak < 2) return null;
  return (
    <Animated.View style={{
      transform:[{scale}], flexDirection:'row', alignItems:'center',
      backgroundColor:t.accentBg, borderRadius:10,
      paddingHorizontal:8, paddingVertical:4, marginRight:6,
    }}>
      <Ionicons name="flame" size={13} color={t.textSecond}/>
      <Text style={{ color:t.textSecond, fontWeight:'700', fontSize: f.body, marginLeft:2 }}>{streak}</Text>
      {mult > 1 && <Text style={{ color:t.textSecond, fontSize: f.caption }}> +{Math.round((mult-1)*100)}%</Text>}
    </Animated.View>
  );
}

// ── Анимация сброса цепочки ───────────────────────────────────────────────────
function StreakBreak({ show, old, t, f }: { show:boolean; old:number; t:any; f:any }) {
  const y   = useRef(new Animated.Value(0)).current;
  const opa = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!show) return;
    y.setValue(0); opa.setValue(1);
    Animated.parallel([
      Animated.timing(y,   { toValue:40, duration:MOTION_DURATION.celebrate, useNativeDriver:true }),
      Animated.timing(opa, { toValue:0,  duration:MOTION_DURATION.celebrate, useNativeDriver:true }),
    ]).start();
  }, [show, opa, y]);
  if (!show || old < 2) return null;
  return (
    <Animated.View style={{
      position:'absolute', top:8, right:60,
      transform:[{translateY:y}], opacity:opa,
      flexDirection:'row', alignItems:'center', gap:4,
    }}>
      <Ionicons name="flame" size={14} color={t.wrong}/>
      <Text style={{ color:t.wrong, fontSize: f.body, fontWeight:'700', textDecorationLine:'line-through' }}>
        +{Math.round((streakMultiplier(old)-1)*100)}%
      </Text>
    </Animated.View>
  );
}

// ── ВЫБОР УРОВНЯ ────────────────────────────────────────────────────────────
function LevelSelect({ onSelect }: { onSelect:(l:Level)=>void }) {
  const { theme:t , f, themeMode } = useTheme();
  const { s, lang } = useLang();
  const router = useRouter();
  const { isPremium } = usePremium();
  const insets = useSafeAreaInsets();
  const { energy, bonusEnergy, isUnlimited: energyUnlimited } = useEnergy();
  const [selected, setSelected] = useState<Level | null>(null);
  const [showLevelNoEnergy, setShowLevelNoEnergy] = useState(false);
  const [freeQuizState, setFreeQuizState] = useState<QuizDailyLimitState>({
    date: '',
    count: 0,
    limit: FREE_DAILY_QUIZ_LIMIT,
    left: FREE_DAILY_QUIZ_LIMIT,
    exhausted: false,
  });
  const screenTitleColor = t.textPrimary;
  const { width: windowWidth } = useWindowDimensions();
  /** Ширина трека полоски: translateX + native driver (без скачков interpolate от onLayout) */
  const startTrackW = Math.max(1, windowWidth - 40);

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
          Animated.timing(pulseAnims[lv], { toValue: MOTION_SCALE.nudge, duration: 680 + i * 90, useNativeDriver: true }),
          Animated.timing(pulseAnims[lv], { toValue: 1.0, duration: 680 + i * 90, useNativeDriver: true }),
        ])
      );
      anim.start();
      return anim;
    });
    return () => loops.forEach(a => a.stop());
  }, [pulseAnims]);

  useEffect(() => {
    let cancelled = false;
    void getFreeDailyQuizState().then((state) => {
      if (!cancelled) setFreeQuizState(state);
    });
    return () => { cancelled = true; };
  }, []);


  const handleStart = (lv: Level) => {
    if (!energyUnlimited && energy + bonusEnergy <= 0) {
      logEnergyLimitHit('quiz');
      trackEnergyHit().catch(() => {});
      setShowLevelNoEnergy(true);
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
    <ScreenGradient forceFullBleed artBackdrop="quizzes">
    <View style={{ flex:1 }}>
      <ContentWrap>
      <View style={{ flexDirection:'row', alignItems:'center', padding:16, paddingTop: 16 + insets.top, borderBottomWidth:0.5, borderBottomColor: t.border }}>
        <TouchableOpacity
          testID="quiz-level-select-back"
          accessibilityLabel="qa-quiz-level-select-back"
          accessible
          style={{ width:38, height:38, borderRadius:19, backgroundColor:t.bgCard, borderWidth:0.5, borderColor:t.border, justifyContent:'center', alignItems:'center' }}
          onPress={() => { hapticTap(); router.back(); }}
        >
          <Ionicons name="chevron-back" size={22} color={t.textPrimary}/>
        </TouchableOpacity>
        <Text style={{ color: screenTitleColor, fontSize: f.numMd, fontWeight:'700', marginLeft:12, flex:1 }} adjustsFontSizeToFit numberOfLines={1}>
          {s.quizzes.selectLevel}
        </Text>
        <EnergyBar size={30} />
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
          const lbl      = triLang(lang, {
  ru: c.labelRU,
  uk: c.labelUK,
  es: c.labelES,
  "pt-BR": c.labelPTBR,
  vi: c.labelVI,
  id: c.labelID,
  tr: c.labelTR,
  pl: c.labelPL,
});
          const tag      = triLang(lang, {
  ru: c.tagRU,
  uk: c.tagUK,
  es: c.tagES,
  "pt-BR": c.tagPTBR,
  vi: c.tagVI,
  id: c.tagID,
  tr: c.tagTR,
  pl: c.tagPL,
});
          const lockedByLevel = !DEV_MODE && !isPremium && lv !== 'easy';
          const lockedByDailyLimit = !DEV_MODE && !isPremium && lv === 'easy' && freeQuizState.exhausted;
          const locked   = lockedByLevel || lockedByDailyLimit;
          const palette  = (THEME_PALETTES[themeMode] ?? THEME_PALETTES.dark)[lv];
          const txt      = THEME_TEXT[themeMode] ?? THEME_TEXT.dark;
          const gradA    = locked ? t.bgCard    : palette.gradA;
          const gradB    = locked ? t.bgSurface : palette.gradB;
          const accent   = locked ? t.textMuted : palette.accent;
          const textCol  = locked ? t.textSecond : txt.primary;
          const textCol2 = locked ? t.textMuted  : txt.secondary;
          const isSelected = selected === lv;
          const cardBackground = (QUIZ_LEVEL_CARD_BACKGROUNDS[themeMode] ?? QUIZ_LEVEL_CARD_BACKGROUNDS.dark)[lv];
          const levelLogo = (QUIZ_LEVEL_LOGOS[themeMode] ?? QUIZ_LEVEL_LOGOS.dark)[lv];

          return (
            <View key={lv} style={{ borderRadius: 20, overflow: 'hidden' }}>
              {/* ── Карточка уровня ── */}
              <TouchableOpacity
                onPress={() => {
                  hapticTap();
                  if (locked) {
                    if (lv === 'hard') incrementHardPaywallBlock();
                    router.push({
                      pathname: '/premium_modal',
                      params: { context: lockedByDailyLimit ? 'quiz_limit' : lv === 'hard' ? 'quiz_hard' : 'quiz_medium' },
                    } as any);
                    return;
                  }
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
                    borderColor: isSelected ? accent : (locked ? t.border : `${accent}40`),
                    borderBottomColor: isSelected ? 'transparent' : undefined,
                    flexDirection: 'row',
                    alignItems: 'center',
                    minHeight: 82,
                    overflow: 'hidden',
                  }}
                >
                  {/* Контент */}
                  <Image
                    pointerEvents="none"
                    source={cardBackground}
                    style={[
                      StyleSheet.absoluteFillObject,
                      { opacity: locked ? 0.16 : themeMode === 'minimalLight' ? 0.86 : 0.92 },
                    ]}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={120}
                  />
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
                          <Text style={{ color:t.textSecond, fontSize: f.label, fontWeight:'700' }}>
                            {lockedByDailyLimit
                              ? triLang(lang, {
  ru: 'Лимит',
  uk: 'Ліміт',
  es: 'Límite',
  "pt-BR": 'Limite',
  vi: 'Giới hạn',
  id: 'Batas',
  tr: 'Limit',
  pl: 'Limit',
})
                              : 'Premium'}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={{ flexDirection:'column', gap:4, marginTop:4 }}>
                      <Text style={{ color: textCol, fontSize: f.h1, fontWeight:'900' }}>{lbl}</Text>
                      <Text style={{ color: textCol2, fontSize: f.sub, flexWrap:'wrap' }}>{tag}</Text>
                    </View>
                  </View>

                  {/* Иконка справа */}
                  <Animated.View style={{ transform: [{ scale: locked ? 1 : pulseAnims[lv] }], width: 104, paddingRight: 10, alignItems: 'center' }}>
                    <Image
                      source={levelLogo}
                      style={{ width: 94, height: 94, opacity: locked ? 0.28 : 1 }}
                      contentFit="contain"
                      cachePolicy="memory-disk"
                      transition={120}
                    />
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
                    onPress={() => { hapticTap(); handleStart(lv); }}
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
                      {triLang(lang, {
  ru: 'Начать квиз',
  uk: 'Почати квіз',
  es: 'Empezar cuestionario',
  "pt-BR": 'Começar quiz',
  vi: 'Bắt đầu quiz',
  id: 'Mulai kuis',
  tr: 'Quize başla',
  pl: 'Rozpocznij quiz',
})} · {lbl}
                    </Text>
                  </TouchableOpacity>
                );
              })()}
            </View>
          );
        })}
        {!DEV_MODE && !isPremium && (
          <View style={{
            marginTop: 8,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: freeQuizState.exhausted ? t.border : t.accent + '66',
            backgroundColor: freeQuizState.exhausted ? t.bgCard : t.accentBg,
            paddingHorizontal: 14,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}>
            <Ionicons
              name={freeQuizState.exhausted ? 'lock-closed' : 'flash-outline'}
              size={18}
              color={freeQuizState.exhausted ? t.textMuted : t.accent}
            />
            <Text style={{ color: freeQuizState.exhausted ? t.textMuted : t.textSecond, fontSize: f.sub, fontWeight: '800', flex: 1 }}>
              {triLang(lang, {
  ru: `Бесплатные квизы сегодня: ${freeQuizState.left}/${freeQuizState.limit}`,
  uk: `Безкоштовні квізи сьогодні: ${freeQuizState.left}/${freeQuizState.limit}`,
  es: `Cuestionarios gratis hoy: ${freeQuizState.left}/${freeQuizState.limit}`,
  "pt-BR": `Quizzes grátis hoje: ${freeQuizState.left}/${freeQuizState.limit}`,
  vi: `Quiz miễn phí hôm nay: ${freeQuizState.left}/${freeQuizState.limit}`,
  id: `Kuis gratis hari ini: ${freeQuizState.left}/${freeQuizState.limit}`,
  tr: `Bugünkü ücretsiz quizler: ${freeQuizState.left}/${freeQuizState.limit}`,
  pl: `Darmowe quizy dzisiaj: ${freeQuizState.left}/${freeQuizState.limit}`,
})}
            </Text>
          </View>
        )}
      </View>
      </ContentWrap>

      <NoEnergyModal
        visible={showLevelNoEnergy}
        onClose={() => setShowLevelNoEnergy(false)}
        paywallContext="no_energy"
      />
    </View>
    </ScreenGradient>
  );
}

// ── КВИЗ ────────────────────────────────────────────────────────────────────
function QuizGame({ level, onBack, e2eInjectResults }: { level:Level; onBack:()=>void; e2eInjectResults?: boolean }) {
  const effectiveOs = useEffectivePlatformOS();
  const { theme:t , f, themeMode } = useTheme();
  const { s, lang } = useLang();
  const { goHome, activeIdx } = useTabNav();
  const router = useRouter();
  const { isPremium } = usePremium();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isLightTheme = false;
  /** Текст на тёмном градиенте (океан/сакура): не t.text* — они для светлых карточек */
  const quizGradTxt = THEME_TEXT[themeMode] ?? THEME_TEXT.dark;
  const onGradPrimary = isLightTheme ? quizGradTxt.primary : t.textPrimary;
  const onGradMuted = isLightTheme ? quizGradTxt.secondary : t.textMuted;
  const onGradSecondary = isLightTheme ? quizGradTxt.secondary : t.textSecond;
  const cfg   = LEVEL_CONFIG[level] ?? LEVEL_CONFIG['easy'];
  const levelAccent = cfg.color;
  const label = triLang(lang, {
  ru: cfg.labelRU,
  uk: cfg.labelUK,
  es: cfg.labelES,
  "pt-BR": cfg.labelPTBR,
  vi: cfg.labelVI,
  id: cfg.labelID,
  tr: cfg.labelTR,
  pl: cfg.labelPL,
});

  const [retryCount, setRetryCount] = useState(0);

  const phrases = useMemo((): Phrase[] => {
    try {
      const result = getQuizPhrasesLoaded(level, 10, lang);
      return result.length > 0 ? result : [];
    } catch (e) {
      DebugLogger.error('quizzes.tsx:loadPhrases', e, 'warning');
      return [];
    }
  }, [level, lang, retryCount]);

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  const [idx,      setIdx]      = useState(0);
  const [chosen,   setChosen]   = useState<number|null>(null);
  const [typed,    setTyped]    = useState('');
  const [typedOk,  setTypedOk]  = useState<boolean|null>(null);
  const [score,    setScore]    = useState(0);
  const [earnedXP, setEarnedXP] = useState(0);
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
  useEffect(() => {
    if (done && level && !quizCompletedRef.current) {
      quizCompletedRef.current = true;
      const score = results.filter(Boolean).length;
      logQuizComplete(level, score);
      void bumpQuizSessionCompleted(level);
      if (!DEV_MODE && !isPremium) {
        void incrementFreeDailyQuizCount();
      }
      void (async () => {
        const { checkAchievements: ca } = await import('../achievements');
        const totalKey = 'achievement_quiz_total_count';
        const prev = parseInt((await AsyncStorage.getItem(totalKey)) ?? '0', 10) || 0;
        const next = prev + 1;
        await AsyncStorage.setItem(totalKey, String(next));
        void ca({ type: 'quiz_session_count', count: next });
      })();
    }
  }, [done, isPremium, level, results]);
  const showEnergyEmptyFeedbackRef = useRef<() => void>(() => {});
  const showEnergyEmptyFeedback = useCallback(() => {
    logEnergyLimitHit('quiz');
    trackEnergyHit().catch(() => {});
    setShowNoEnergyModal(true);
  }, []);
  const dismissEnergyModal = useCallback(() => {
    navigateAfterModalClose(
      () => setShowNoEnergyModal(false),
      onBack,
    );
  }, [onBack]);
  useEffect(() => { showEnergyEmptyFeedbackRef.current = showEnergyEmptyFeedback; }, [showEnergyEmptyFeedback]);

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
  // Guard: предотвращает повторный лог/ачивки при завершении review mode
  const quizCompletedRef = useRef(false);

  const e2eResultAppliedRef = useRef(false);
  useEffect(() => {
    if (!e2eInjectResults || e2eResultAppliedRef.current) return;
    if (phrases.length === 0) return;
    e2eResultAppliedRef.current = true;
    const allOk = phrases.map(() => true);
    resultsRef.current = allOk;
    setResults(allOk);
    setScore(Math.max(1, phrases.length));
    setEarnedXP(0);
    setStreak(0);
    streakRef.current = 0;
    setIdx(0);
    setChosen(null);
    setTyped('');
    setTypedOk(null);
    setReviewing(false);
    setReviewQ([]);
    setRIdx(0);
    quizCompletedRef.current = true;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setDone(true);
  }, [e2eInjectResults, phrases]);

  const insertAnim  = useRef(new Animated.Value(0)).current;
  const insertScale = useRef(new Animated.Value(0.7)).current;
  const fadeAnim    = useRef(new Animated.Value(1)).current;
  const mountOpacity = useRef(new Animated.Value(1)).current;
  const mountScale   = useRef(new Animated.Value(1)).current;

  // ── XP-анимации финального экрана ─────────────────────────────────────────
  const xpFlyY        = useRef(new Animated.Value(0)).current;
  const xpFlyOpacity  = useRef(new Animated.Value(1)).current;
  const xpBarAnim     = useRef(new Animated.Value(0)).current;
  const xpCountAnim   = useRef(new Animated.Value(0)).current;
  const xpAnimStarted = useRef(false);
  const xpTimer1      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const xpTimer2      = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Запускаем XP-анимации когда done=true и score уже установлен
  useEffect(() => {
    if (!done || score === 0 || xpAnimStarted.current) return;
    xpAnimStarted.current = true;

    const { xpInLevel: oldXpInLevel, progress: oldProgress } = getXPProgress(totalXP);
    const { xpInLevel: newXpInLevel, progress: newProgress } = getXPProgress(totalXP + score);

    xpFlyY.setValue(0);
    xpFlyOpacity.setValue(1);
    xpBarAnim.setValue(oldProgress);
    xpCountAnim.setValue(oldXpInLevel);

    const xpFlyMs = MOTION_DURATION.celebrate;
    const xpBarMs = MOTION_DURATION.slow * 2;
    xpTimer1.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(xpFlyY, { toValue: 60, duration: xpFlyMs, useNativeDriver: true }),
        Animated.timing(xpFlyOpacity, {
          toValue: 0,
          duration: MOTION_DURATION.slow,
          useNativeDriver: true,
          delay: MOTION_DURATION.fast,
        }),
      ]).start();
      xpTimer2.current = setTimeout(() => {
        Animated.timing(xpBarAnim, { toValue: newProgress, duration: xpBarMs, useNativeDriver: false }).start();
        Animated.timing(xpCountAnim, { toValue: newXpInLevel, duration: xpBarMs, useNativeDriver: false }).start();
      }, MOTION_DURATION.celebrate + MOTION_DURATION.fast);
    }, MOTION_DURATION.celebrate + MOTION_DURATION.normal);

    return () => {
      if (xpTimer1.current) clearTimeout(xpTimer1.current);
      if (xpTimer2.current) clearTimeout(xpTimer2.current);
    };
  }, [done, score, totalXP, xpBarAnim, xpCountAnim, xpFlyOpacity, xpFlyY]);

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
    if (!done || reviewing) return;
    const perfect = results.length > 0 && results.every(r => r);
    checkAchievements({ type: 'quiz', level, perfect }).catch(() => {});
    if (score > 0) {
      updateMultipleTaskProgress([{ type: 'quiz_score', increment: score }]).catch(() => {});
    }
  }, [done, level, results, reviewing, score]);

  useEffect(() => {
    if (!done || reviewing) return;
  }, [done, reviewing]);

  // Синхронизируем isTabActive — но таймер не останавливаем
  useEffect(() => {
    isTabActiveRef.current = activeIdx === 2;
  }, [activeIdx]);

  const onBackRef = useRef(onBack);
  useEffect(() => { onBackRef.current = onBack; }, [onBack]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => () => { stopAudio(); }, [stopAudio]);

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
    if (!done || score === 0 || phrases.length === 0 || reviewing) return;

    const processDoneQuiz = async () => {
      try {
        const total = phrases.length;
        const right = results.filter(Boolean).length;
        const pct = Math.round(right / total * 100);

        // Случайный бонус поверх при ≥70%
        if (pct >= 70) {
          const reward = calculateRewardWithBonus(score);
          if (reward.hasBonusWon) {
            setBonusXP(reward.bonusXP);
            setShowBonus(true);
            if (userNameRef.current) { registerXP(reward.bonusXP, 'bonus_chest', userNameRef.current, lang).catch(() => {}); }
          }
        }
      } catch (error) {
        DebugLogger.error('quizzes.tsx:processDoneQuiz', error, 'warning');
      }
    };

    processDoneQuiz();
  }, [done, score, results, phrases.length, lang, reviewing]);

  const current = reviewing ? reviewQ[rIdx] : (idx < phrases.length ? phrases[idx] : undefined);

  if (phrases.length === 0) {
    return (
      <ScreenGradient forceFullBleed artBackdrop="quizzes">
      <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
        <ContentWrap>
        <Text style={{ color:onGradMuted, fontSize: f.body }}>
          {triLang(lang, {
  ru: 'Вопросы временно недоступны',
  uk: 'Питання тимчасово недоступні',
  es: 'No hay preguntas disponibles por ahora.',
  "pt-BR": 'As perguntas estão temporariamente indisponíveis.',
  vi: 'Hiện chưa có câu hỏi.',
  id: 'Pertanyaan sementara tidak tersedia.',
  tr: 'Sorular şu anda kullanılamıyor.',
  pl: 'Pytania są chwilowo niedostępne.',
})}
        </Text>
        </ContentWrap>
      </View>
      </ScreenGradient>
    );
  }

  if (!current) {
    return (
      <ScreenGradient forceFullBleed artBackdrop="quizzes">
      <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
        <ContentWrap>
        <Text style={{ color:onGradMuted, fontSize: f.body }}>
          {triLang(lang, {
  ru: 'Что-то пошло не так',
  uk: 'Щось пішло не так',
  es: 'Algo salió mal',
  "pt-BR": 'Algo deu errado',
  vi: 'Đã xảy ra lỗi',
  id: 'Ada yang salah',
  tr: 'Bir şeyler ters gitti',
  pl: 'Coś poszło nie tak',
})}
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
      Animated.timing(insertAnim,  { toValue:1, duration:MOTION_DURATION.slow, useNativeDriver:true }),
      Animated.spring(insertScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: MOTION_SPRING.ui.tension,
        friction: MOTION_SPRING.ui.friction,
      }),
    ]).start();
  };

  const afterAnswer = async (isRight: boolean, userAnswer?: string) => {
    const nr = reviewing ? results : [...results, isRight];
    if (!reviewing) { resultsRef.current = nr; setResults(nr); }

    if (!isRight && settings.haptics) hapticError();

    if (settings.voiceOut && current?.answer) {
      speakAudio(current.answer, settings.speechRate, { language: 'en-US' });
    }

    if (!isRight && current) {
      const tokenMeta = resolvePhraseMistakeToken(current.answer, userAnswer, current.skillTag ?? current.quizItemType);
      void recordMistake(
        current.answer,
        current.ru,
        current.lessonNum,
        current.uk,
        'quiz',
        current.es,
        tokenMeta,
      );
      logMistake(
        current.answer,
        current.lessonNum,
        'quiz',
        'wrong_pick',
        tokenMeta,
      );
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
        if (userNameRef.current) { registerXP(pts, 'quiz_answer', userNameRef.current, lang).then(xpResult => { setEarnedXP(p => p + xpResult.finalDelta); }).catch(() => {}); }
        // Триггеры заданий — quiz_score обновляется в done useEffect (один раз с итогом сессии)
        const updates: Parameters<typeof updateMultipleTaskProgress>[0] = [];
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
            if (success && currentEnergyRef.current === 0) {
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

    // Задержка зависит от уровня и настройки autoAdvance
    // easy=4с, medium=6с, hard=8с — только если autoAdvance включён
    const autoDelay = level === 'hard' ? 8000 : level === 'medium' ? 6000 : 4000;

    const doNext = () => {
      Animated.timing(fadeAnim, { toValue:0, duration:MOTION_DURATION.fast, useNativeDriver:true }).start(() => {
        if (!reviewing) {
          if (idx + 1 >= phrases.length) {
            setDone(true);
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
        Animated.timing(fadeAnim, { toValue:1, duration:MOTION_DURATION.fast, useNativeDriver:true }).start();
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
    // Блокируем ответ если энергия закончилась
    if (currentEnergyRef.current === 0 && !testerEnergyDisabledRef.current) {
      showEnergyEmptyFeedbackRef.current();
      return;
    }
    answeredRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    setChosen(ci);
    playInsertAnim();
    afterAnswer(isQuizChoiceCorrect(ci, current.correct), current.choices[ci]);
  };

  const handleTyped = () => {
    if (typedOk !== null) return;
    // Блокируем ответ если энергия закончилась
    if (currentEnergyRef.current === 0 && !testerEnergyDisabledRef.current) {
      showEnergyEmptyFeedbackRef.current();
      return;
    }
    answeredRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    const ok = isCorrectAnswer(typed, current.answer, current.answerAlternatives);
    setTypedOk(ok);
    playInsertAnim();
    afterAnswer(ok, typed);
  };

  // ── ФИНАЛЬНЫЙ ЭКРАН ──────────────────────────────────────────────────────
  if (done) {
    const total = phrases.length;
    const right = results.filter(Boolean).length;
    const pct   = Math.round((right / Math.max(1, total)) * 100);
    const shareLang = quizShareMessageLang(lang);
    const _qp = (a: string[]) => a[Math.floor(Math.random() * a.length)];
    const rankInfo = pct === 100
      ? { icon:'🏆', labelRU: _qp(['Безупречно!','Идеально!','Гений!','Просто огонь! 🔥','Легенда!']), labelUK: _qp(['Бездоганно!','Ідеально!','Геній!','Просто вогонь! 🔥','Легенда!']), labelES: _qp(['¡Impecable!','¡Perfecto!','¡Genial!','¡Qué nivelazo! 🔥','¡Eres una leyenda!']), labelPTBR: _qp(['Impecável!','Perfeito!','Genial!','Que nível! 🔥','Lenda!']), labelVI: _qp(['Hoàn hảo!','Tuyệt đối!','Xuất sắc!','Quá đỉnh! 🔥','Huyền thoại!']), labelID: _qp(['Sempurna!','Mantap sekali!','Jenius!','Level tinggi! 🔥','Legenda!']), labelTR: _qp(['Kusursuz!','Mükemmel!','Harika!','Çok iyi! 🔥','Efsane!']), labelPL: _qp(['Bezbłędnie!','Idealnie!','Genialnie!','Ale poziom! 🔥','Legenda!']), color:'#D4A017' }
      : pct >= 90
      ? { icon:'🥇', labelRU: _qp(['Отлично!','Великолепно!','Ты машина!','Так держать!','Мощно!']), labelUK: _qp(['Відмінно!','Чудово!','Ти машина!','Так тримати!','Потужно!']), labelES: _qp(['¡Excelente!','¡Magnífico!','¡Qué ritmo!','¡Así se hace!','¡Impresionante!']), labelPTBR: _qp(['Excelente!','Magnífico!','Que ritmo!','É assim mesmo!','Impressionante!']), labelVI: _qp(['Xuất sắc!','Tuyệt vời!','Nhịp tốt quá!','Cứ thế nhé!','Ấn tượng!']), labelID: _qp(['Luar biasa!','Hebat!','Ritmamu bagus!','Begitu caranya!','Mengesankan!']), labelTR: _qp(['Harika!','Muhteşem!','Ritmin çok iyi!','Aynen böyle!','Etkileyici!']), labelPL: _qp(['Świetnie!','Znakomicie!','Dobry rytm!','Tak trzymać!','Imponująco!']), color:'#D4A017' }
      : pct >= 70
      ? { icon:'🥈', labelRU: _qp(['Хорошо!','Неплохо!','Молодец!','Растёшь!','Продолжай!']), labelUK: _qp(['Добре!','Непогано!','Молодець!','Зростаєш!','Продовжуй!']), labelES: _qp(['¡Bien!','¡No está mal!','¡Buen trabajo!','¡Vas mejorando!','¡Sigue así!']), labelPTBR: _qp(['Bom!','Nada mal!','Bom trabalho!','Você está melhorando!','Continue assim!']), labelVI: _qp(['Tốt!','Không tệ!','Làm tốt lắm!','Bạn đang tiến bộ!','Tiếp tục nhé!']), labelID: _qp(['Bagus!','Lumayan!','Kerja bagus!','Kamu makin maju!','Lanjutkan!']), labelTR: _qp(['İyi!','Fena değil!','İyi iş!','Gelişiyorsun!','Devam et!']), labelPL: _qp(['Dobrze!','Nieźle!','Dobra robota!','Robisz postępy!','Tak dalej!']), color:t.textSecond }
      : pct >= 50
      ? { icon:'🥉', labelRU: _qp(['Неплохо','Можно лучше!','Ещё немного!','Почти!']), labelUK: _qp(['Непогано','Можна краще!','Ще трохи!','Майже!']), labelES: _qp(['¡No está mal!','¡Se puede mejorar!','¡Un poco más!','¡Casi!','¡Tú puedes!']), labelPTBR: _qp(['Nada mal','Dá para melhorar!','Mais um pouco!','Quase!']), labelVI: _qp(['Không tệ','Có thể tốt hơn!','Thêm chút nữa!','Gần được rồi!']), labelID: _qp(['Lumayan','Masih bisa lebih baik!','Sedikit lagi!','Hampir!']), labelTR: _qp(['Fena değil','Daha iyi olabilir!','Biraz daha!','Neredeyse!']), labelPL: _qp(['Nieźle','Może być lepiej!','Jeszcze trochę!','Prawie!']), color:t.textSecond }
      : { icon:'📚', labelRU: _qp(['Практикуйся!','Не сдавайся!','Повтори и попробуй снова!','Учимся!']), labelUK: _qp(['Тренуйся!','Не здавайся!','Повтори і спробуй знову!','Навчаємось!']), labelES: _qp(['¡Sigue practicando!','¡No te rindas!','¡Repasa e inténtalo de nuevo!','¡Ánimo, tú puedes!']), labelPTBR: _qp(['Continue praticando!','Não desista!','Revise e tente de novo!','Vamos aprender!']), labelVI: _qp(['Tiếp tục luyện tập!','Đừng bỏ cuộc!','Ôn lại rồi thử lại!','Mình học tiếp nhé!']), labelID: _qp(['Terus berlatih!','Jangan menyerah!','Ulangi dan coba lagi!','Kita belajar!']), labelTR: _qp(['Pratik yapmaya devam et!','Vazgeçme!','Tekrar et ve yeniden dene!','Öğreniyoruz!']), labelPL: _qp(['Ćwicz dalej!','Nie poddawaj się!','Powtórz i spróbuj jeszcze raz!','Uczymy się!']), color:t.textMuted };
    const rankLabel = triLang(lang, {
  ru: rankInfo.labelRU,
  uk: rankInfo.labelUK,
  es: rankInfo.labelES,
  "pt-BR": rankInfo.labelPTBR,
  vi: rankInfo.labelVI,
  id: rankInfo.labelID,
  tr: rankInfo.labelTR,
  pl: rankInfo.labelPL,
});
    return (
      <ScreenGradient forceFullBleed artBackdrop="quizzes">
      <View style={{ flex:1 }}>
        <ContentWrap>
        <ScrollView contentContainerStyle={{ flexGrow:1, justifyContent:'center', alignItems:'center', padding:30 }} showsVerticalScrollIndicator={false}>
          <Text style={{ fontSize: f.numLg + 28, marginBottom:10 }} adjustsFontSizeToFit numberOfLines={1}>{rankInfo.icon}</Text>
          <View style={{ backgroundColor: `${rankInfo.color}22`, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 8, borderWidth: 1, borderColor: `${rankInfo.color}55`, marginBottom:16 }}>
            <Text style={{ color: rankInfo.color, fontSize: f.h2, fontWeight: '800', letterSpacing: 0.5 }}>{rankLabel}</Text>
          </View>
          <Text style={{ color:t.textPrimary, fontSize: f.numLg, fontWeight:'700', marginBottom:10 }} adjustsFontSizeToFit numberOfLines={1}>{s.quizzes.done}</Text>
          <Text style={{ color:t.textPrimary, fontSize: f.h1, marginBottom:4 }}>{right} / {total}</Text>
          <Text style={{ color:t.textSecond, fontSize: f.numLg + 8, fontWeight:'700', marginBottom:8 }} adjustsFontSizeToFit numberOfLines={1}>{pct}%</Text>
          {/* "+X опыта" — анимированно летит вниз к полоске */}
          <Animated.Text style={{ color:t.correct, fontSize: f.h2, fontWeight:'600', marginBottom: bonusXP > 0 ? 4 : 16, transform:[{translateY: xpFlyY}], opacity: xpFlyOpacity }}>
            +{Math.round(earnedXP || score)} {triLang(lang, {
  ru: 'опыта',
  uk: 'досвіду',
  es: 'XP',
  "pt-BR": 'XP',
  vi: 'XP',
  id: 'XP',
  tr: 'XP',
  pl: 'XP',
})}
          </Animated.Text>
          {bonusXP > 0 && (
            <XpGainBadge amount={Math.round(bonusXP)} visible={true} style={{ color: '#D4A017', fontSize: f.body, fontWeight: '600', marginBottom: 16 }} />
          )}
          {/* Уровень игрока — с анимированной полоской */}
          {(() => {
            const { level: lv, xpNeeded } = getXPProgress(totalXP + score);
            return (
              <View style={{ backgroundColor:t.bgCard, borderRadius:14, borderWidth:0.5, borderColor:t.border, padding:14, width:'100%', flexDirection:'row', alignItems:'center', gap:12, marginBottom:28 }}>
                <LevelBadge level={lv} size={40} />
                <View style={{ flex:1 }}>
                  <Text style={{ color:t.textPrimary, fontSize:f.body, fontWeight:'700' }}>
                    {triLang(lang, {
  ru: `Уровень ${lv}`,
  uk: `Рівень ${lv}`,
  es: `Nivel ${lv}`,
  "pt-BR": `Nível ${lv}`,
  vi: `Cấp ${lv}`,
  id: `Level ${lv}`,
  tr: `Seviye ${lv}`,
  pl: `Poziom ${lv}`,
})}
                  </Text>
                  <View style={{ height:5, backgroundColor:t.bgSurface, borderRadius:3, overflow:'hidden', marginTop:5 }}>
                    <Animated.View style={{ height:'100%', width: xpBarAnim.interpolate({ inputRange:[0,1], outputRange:['0%','100%'] }), backgroundColor:'#D4A017', borderRadius:3 }} />
                  </View>
                  <XpCounter anim={xpCountAnim} xpNeeded={xpNeeded} textStyle={{ color:t.textMuted, fontSize:f.label, marginTop:3 }} />
                </View>
              </View>
            );
          })()}
          {(() => {
            const wrongPhrases = phrases.filter((_, i) => !results[i]);
            if (wrongPhrases.length === 0) return null;
            return (
              <TouchableOpacity
                style={{ width:'100%', borderWidth:1.5, borderColor:'#F87171', padding:18, borderRadius:14, alignItems:'center', marginBottom:12, backgroundColor:t.bgCard }}
                onPress={() => {
                  hapticTap();
                  if (autoAdvanceTimerRef.current) { clearTimeout(autoAdvanceTimerRef.current); autoAdvanceTimerRef.current = null; }
                  if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
                  fadeAnim.setValue(1);
                  setChosen(null); setTyped(''); setTypedOk(null);
                  setReviewQ(wrongPhrases); setRIdx(0); setReviewing(true); setDone(false);
                }}
              >
                <Text style={{ color:'#F87171', fontSize: f.bodyLg, fontWeight:'600' }}>
                  {triLang(lang, {
  ru: `🔄 Исправить ошибки (${wrongPhrases.length})`,
  uk: `🔄 Виправити помилки (${wrongPhrases.length})`,
  es: `🔄 Repasar errores (${wrongPhrases.length})`,
  "pt-BR": `🔄 Corrigir erros (${wrongPhrases.length})`,
  vi: `🔄 Sửa lỗi (${wrongPhrases.length})`,
  id: `🔄 Perbaiki kesalahan (${wrongPhrases.length})`,
  tr: `🔄 Hataları düzelt (${wrongPhrases.length})`,
  pl: `🔄 Popraw błędy (${wrongPhrases.length})`,
})}
                </Text>
              </TouchableOpacity>
            );
          })()}
          <TouchableOpacity
            style={{ width:'100%', borderWidth:1.5, borderColor:levelAccent, padding:18, borderRadius:14, alignItems:'center', marginBottom:12, backgroundColor:t.bgCard }}
            onPress={() => {
              hapticTap();
              // Отменяем все pending таймеры от предыдущей игры
              if (autoAdvanceTimerRef.current) { clearTimeout(autoAdvanceTimerRef.current); autoAdvanceTimerRef.current = null; }
              if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
              if (!DEV_MODE && !isPremium) {
                void hasFreeDailyQuizzesLeft().then((hasLeft) => {
                  if (hasLeft) return;
                  router.push({ pathname: '/premium_modal', params: { context: 'quiz_limit' } } as any);
                });
                return;
              }
              fadeAnim.stopAnimation();
              fadeAnim.setValue(1);
              // Перечитываем актуальный XP из storage чтобы не сбрасывать заработанный
              AsyncStorage.getItem('user_total_xp').then(v => { setTotalXP(parseInt(v || '0') || 0); }).catch(() => {});
              setIdx(0); setChosen(null); setScore(0); setEarnedXP(0);
              setStreak(0); streakRef.current = 0;
              setResults([]); setDone(false); setReviewing(false);
              setTyped(''); setTypedOk(null);
              xpAnimStarted.current = false;
              quizCompletedRef.current = false;
              xpFlyY.setValue(0); xpFlyOpacity.setValue(1);
              setRetryCount(c => c + 1); // принудительно перезагружает вопросы
            }}
          >
            <Text style={{ color:levelAccent, fontSize: f.bodyLg, fontWeight:'600' }}>{s.quizzes.again}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ padding:14 }} onPress={() => { hapticTap(); onBack(); }}>
            <Text style={{ color:t.textMuted, fontSize: f.body }}>{s.quizzes.back}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flexDirection:'row', alignItems:'center', gap:8, padding:10, marginTop: 8 }}
            onPress={async () => {
              hapticTap();
              const shareRank = getQuizShareRank(
                pct,
                '#94a3b8',
                '#64748b',
                shareLang
              );
              const msg = buildQuizShareMessage(
                shareLang,
                right,
                total,
                pct,
                shareRank.icon,
                STORE_URL
              );
              await Share.share({ message: msg }).catch(() => {});
            }}
          >
            <Ionicons name="share-outline" size={16} color={t.textGhost}/>
            <Text style={{ color:t.textGhost, fontSize: f.body }}>
              {triLang(lang, {
  ru: 'Поделиться',
  uk: 'Поділитися',
  es: 'Compartir',
  "pt-BR": 'Compartilhar',
  vi: 'Chia sẻ',
  id: 'Bagikan',
  tr: 'Paylaş',
  pl: 'Udostępnij',
})}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="quiz-result-go-home"
            accessibilityLabel="qa-quiz-result-go-home"
            accessible
            style={{ padding:12 }}
            onPress={() => {
              hapticTap();
              goHome();
              router.replace('/(tabs)/home' as any);
            }}
          >
            <Text style={{ color:t.textMuted, fontSize: f.body, textDecorationLine:'underline' }}>
              {triLang(lang, {
  ru: '🏠 На главную',
  uk: '🏠 На головну',
  es: '🏠 Volver al inicio',
  "pt-BR": '🏠 Início',
  vi: '🏠 Trang chủ',
  id: '🏠 Beranda',
  tr: '🏠 Ana sayfaya',
  pl: '🏠 Strona główna',
})}
            </Text>
          </TouchableOpacity>
        </ScrollView>
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
    if (chosen === null && typedOk === null) return;
    stopAudio(); // ещё не ответили
    // Отменяем авто-таймер если был запланирован
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    Animated.timing(fadeAnim, { toValue:0, duration:MOTION_DURATION.fast, useNativeDriver:true }).start(() => {
      if (!reviewing) {
        if (idx + 1 >= phrases.length) {
          setDone(true);
        } else setIdx(i => i + 1);
      } else {
        const lastRight =
          (chosen !== null ? isQuizChoiceCorrect(chosen, current.correct) : false)
          || typedOk === true;
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
      Animated.timing(fadeAnim, { toValue:1, duration:MOTION_DURATION.fast, useNativeDriver:true }).start();
    });
  };

  return (
    <Animated.View style={{ flex:1, opacity: mountOpacity, transform: [{ scale: mountScale }] }}>
    <ScreenGradient forceFullBleed artBackdrop="quizzes">
    <View style={{ flex:1 }}>
      <ContentWrap>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={effectiveOs === 'ios' ? 'padding' : 'height'}>

        {/* ХЕДЕР */}
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:15, paddingTop: 15 + insets.top }}>
          <TouchableOpacity onPress={() => { hapticTap(); onBack(); }}>
            <Ionicons name="chevron-back" size={28} color={onGradPrimary}/>
          </TouchableOpacity>
          <Text style={{ color: isLightTheme ? (level === 'easy' ? '#16803C' : level === 'medium' ? '#C2410C' : '#6D28D9') : levelAccent, fontSize: f.body, fontWeight:'700', flex:1, textAlign:'center' }} numberOfLines={1} adjustsFontSizeToFit>
            {reviewing ? s.quizzes.fixErrors : label}
          </Text>
          <View style={{ flexDirection:'row', alignItems:'center', position:'relative', gap:8 }}>
            <EnergyBar size={30} />
            {!reviewing && chosen === null && typedOk === null && (
              <View style={{
                width: 34, height: 34, borderRadius: 17,
                borderWidth: 2,
                borderColor: timeLeft <= 5 ? t.wrong : timeLeft <= 10 ? '#D4A017' : t.border,
                justifyContent: 'center', alignItems: 'center',
              }}>
                <Text style={{ color: timeLeft <= 5 ? t.wrong : onGradSecondary, fontWeight: '700', fontSize: f.label }}>
                  {timeLeft}
                </Text>
              </View>
            )}
            <MultBadge streak={streak} t={t} f={f}/>
            <StreakBreak show={showBreak} old={prevStr} t={t} f={f}/>
            <View style={{ flexDirection:'row', alignItems:'center', gap:3 }}>
              <Ionicons name="star" size={13} color={onGradSecondary}/>
              <Text style={{ color:onGradSecondary, fontWeight:'600', fontSize: f.body }}>{Math.round(score * 10) / 10}</Text>
            </View>
          </View>
        </View>

        {/* ПРОГРЕСС */}
        {!reviewing && (
          <View style={{ flexDirection:'row', gap:4, paddingHorizontal:16, marginBottom:4 }}>
            {phrases.map((_, i) => {
              let bg = t.border;
              if (i < results.length) bg = results[i] ? t.correct : t.wrong;
              if (i === idx) bg = onGradSecondary;
              return <View key={i} style={{ flex:1, height:5, borderRadius:2, backgroundColor:bg }}/>;
            })}
          </View>
        )}

        <View style={{ flex: 1 }}>
        <Animated.View style={{ flex:1, opacity:fadeAnim }}>
          <ScrollView style={{ flex:1 }} contentContainerStyle={{ paddingHorizontal:20, paddingTop:20, paddingBottom:40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={true} persistentScrollbar={true}>
          <Text style={{ color:onGradMuted, fontSize: f.caption, marginBottom:14 }}>
            {(reviewing?rIdx:idx)+1} / {reviewing?reviewQ.length:phrases.length}
          </Text>

          {/* ВОПРОС */}
          <Text style={{ color:onGradPrimary, fontSize: f.h2 + 6, fontWeight:'500', marginBottom:12, lineHeight:32 }}>
            {triLang(lang, {
  ru: current.ru,
  uk: current.uk,
  es: current.es,
  "pt-BR": quizSourceTextForPlanned(current, 'pt-BR'),
  vi: quizSourceTextForPlanned(current, 'vi'),
  id: quizSourceTextForPlanned(current, 'id'),
  tr: quizSourceTextForPlanned(current, 'tr'),
  pl: quizSourceTextForPlanned(current, 'pl'),
})}
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
                  {triLang(lang, {
  ru: 'ПРАВИЛЬНО:',
  uk: 'ПРАВИЛЬНО:',
  es: 'CORRECTO:',
  "pt-BR": 'CORRETO:',
  vi: 'ĐÚNG:',
  id: 'BENAR:',
  tr: 'DOĞRU:',
  pl: 'POPRAWNIE:',
})}
                </Text>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ color: isLightTheme ? onGradPrimary : displayColor, fontSize: f.h2 + 2, fontWeight: '600', lineHeight: (f.h2 + 2) * 1.4, flex: 1 }}>
                  {shownCorrectEnglish}
                </Text>
                <View onStartShouldSetResponder={() => true}>
                  <AddToFlashcard en={shownCorrectEnglish} ru={current.ru} uk={current.uk} es={current.es} source="lesson" sourceId="quiz" />
                </View>
              </View>
              {(isRight === false || typedOk === false) && displayAnswer && (
                <>
                  <Text style={{ color: t.wrong, fontSize: f.label, fontWeight: '700', marginTop: 10, marginBottom: 4, letterSpacing: 0.3 }}>
                    {triLang(lang, {
  ru: 'ВАШ ВАРИАНТ:',
  uk: 'ВАШ ВАРІАНТ:',
  es: 'TU RESPUESTA:',
  "pt-BR": 'SUA RESPOSTA:',
  vi: 'CÂU TRẢ LỜI CỦA BẠN:',
  id: 'JAWABANMU:',
  tr: 'CEVABIN:',
  pl: 'TWOJA ODPOWIEDŹ:',
})}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 2 }}>
                    {diffWords(displayAnswer, current.answer).map((item, widx) => (
                      <Text key={widx} style={{
                        color: item.isWrong ? t.wrong : t.textMuted,
                        fontSize: f.bodyLg,
                        fontWeight: item.isWrong ? '700' : '400',
                        textDecorationLine: item.isWrong ? 'line-through' : 'none',
                      }}>
                        {item.word}{' '}
                      </Text>
                    ))}
                  </View>
                </>
              )}
            </Animated.View>
          )}
          {/* РАЗБОР ОТВЕТА */}
          {(chosen !== null || typedOk !== null) && current.explanations && (() => {
            const explanationIdx = chosen !== null ? chosen : quizPrimaryCorrectIndex(current.correct);
            const plannedSourceExplanations = isPlannedInterfaceLang(lang)
              ? quizSourceExplanationsForPlanned(current, lang)
              : undefined;
            const explanationsArr =
              lang === 'uk' && current.explanationsUK?.length
                ? current.explanationsUK
                : lang === 'es' && current.explanationsES?.length
                  ? current.explanationsES
                  : plannedSourceExplanations?.length
                    ? plannedSourceExplanations
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
                  {triLang(lang, {
  ru: 'РАЗБОР',
  uk: 'ПОЯСНЕННЯ',
  es: 'EXPLICACIÓN',
  "pt-BR": 'EXPLICAÇÃO',
  vi: 'GIẢI THÍCH',
  id: 'PENJELASAN',
  tr: 'AÇIKLAMA',
  pl: 'WYJAŚNIENIE',
})}
                </Text>
                <Text style={{ color: isLightTheme ? (correct ? '#0D47A1' : '#78350F') : t.textPrimary, fontSize: f.body, lineHeight: f.body * 1.5 }}>
                  {explanation}
                </Text>
              </Animated.View>
            );
          })()}

          {/* Кнопка "далее" после ответа если autoAdvance выключен */}
          {(chosen !== null || typedOk !== null) && !settings.autoAdvance && (
            <TouchableOpacity
              onPress={() => { hapticTap(); handleTap(); }}
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
                {triLang(lang, {
  ru: 'Далее',
  uk: 'Далі',
  es: 'Siguiente',
  "pt-BR": 'Próximo',
  vi: 'Tiếp',
  id: 'Lanjut',
  tr: 'İleri',
  pl: 'Dalej',
})}
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
                  style={{ color: typedOk===null ? onGradPrimary : typedOk ? t.correct : t.wrong, fontSize: f.h1, paddingVertical:10 }}
                  value={typed}
                  onChangeText={setTyped}
                  placeholder={s.lesson.typeHere}
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
                  onPress={() => { hapticTap(); handleTyped(); }} activeOpacity={0.8}
                >
                  <Text style={{ color:t.textPrimary, fontSize: f.bodyLg, fontWeight:'600' }}>
                    {triLang(lang, {
  ru: 'Проверить',
  uk: 'Перевірити',
  es: 'Comprobar',
  "pt-BR": 'Verificar',
  vi: 'Kiểm tra',
  id: 'Periksa',
  tr: 'Kontrol et',
  pl: 'Sprawdź',
})}
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
                    onPress={() => { hapticTap(); handleChoice(ci); }} activeOpacity={0.8}
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
  es: '💡 ¿Te cuesta escribir con el teclado? Desactiva «Escribir con el teclado» en Ajustes.',
  "pt-BR": '💡 Difícil digitar manualmente? Você pode desativar a digitação no teclado.',
  vi: '💡 Khó nhập thủ công? Bạn có thể tắt nhập bằng bàn phím.',
  id: '💡 Sulit mengetik manual? Kamu bisa mematikan input keyboard.',
  tr: '💡 Elle yazmak zor mu? Klavye girişini kapatabilirsin.',
  pl: '💡 Trudno wpisywać ręcznie? Możesz wyłączyć wpisywanie z klawiatury.',
})}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: t.bgSurface, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 0.5, borderColor: t.border }}
                  onPress={async () => {
                    hapticTap();
                                        const next = { ...settings, hardMode: false };
                    await saveSettings(next);
                    setSettings(next);
                    setShowHardTip(false);
                  }}
                >
                  <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '600' }}>
                    {triLang(lang, {
  ru: 'Выключить',
  uk: 'Вимкнути',
  es: 'Desactivar',
  "pt-BR": 'Desativar',
  vi: 'Tắt',
  id: 'Nonaktifkan',
  tr: 'Kapat',
  pl: 'Wyłącz',
})}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' }}
                  onPress={async () => {
                    hapticTap();
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
  "pt-BR": 'Não mostrar novamente',
  vi: 'Không hiển thị lại',
  id: 'Jangan tampilkan lagi',
  tr: 'Bir daha gösterme',
  pl: 'Nie pokazuj ponownie',
})}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          </ScrollView>
        </Animated.View>
        </View>

      </KeyboardAvoidingView>
      </ContentWrap>
    </View>

    {/* Модал: время вышло */}
    <Modal transparent animationType="fade" visible={showTimeoutAlert} onRequestClose={() => { setShowTimeoutAlert(false); onBackRef.current(); }}>
      <Pressable style={{ flex:1, backgroundColor:'rgba(0,0,0,0.55)', justifyContent:'center', alignItems:'center', padding:32 }}
        onPress={() => { hapticTap(); setShowTimeoutAlert(false); onBackRef.current(); }}
      >
        <Pressable onPress={e => e.stopPropagation()}>
          <View style={{ backgroundColor: t.bgCard, borderRadius: 24, padding: 28, alignItems: 'center', borderWidth: 0.5, borderColor: t.border, maxWidth: 320, width: '90%' }}>
            <Text style={{ fontSize: 52, marginBottom: 12 }} adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.7}>⏰</Text>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', textAlign: 'center', marginBottom: 10 }}>
              {triLang(lang, {
  ru: 'Время вышло!',
  uk: 'Час вийшов!',
  es: '¡Se acabó el tiempo!',
  "pt-BR": 'O tempo acabou!',
  vi: 'Hết giờ!',
  id: 'Waktu habis!',
  tr: 'Süre doldu!',
  pl: 'Czas minął!',
})}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', lineHeight: 22, marginBottom: settings.hardMode ? 8 : 24 }}>
              {triLang(lang, {
  ru: 'Очень жаль 😔 Попробуй ещё раз!',
  uk: 'Дуже шкода 😔 Спробуй ще раз!',
  es: '¡Qué pena! 😔 ¡Inténtalo otra vez!',
  "pt-BR": 'Que pena 😔 Tente novamente!',
  vi: 'Tiếc quá 😔 Thử lại nhé!',
  id: 'Sayang sekali 😔 Coba lagi!',
  tr: 'Yazık oldu 😔 Tekrar dene!',
  pl: 'Szkoda 😔 Spróbuj jeszcze raz!',
})}
            </Text>
            {settings.hardMode && (
              <Text style={{ color: t.textSecond, fontSize: f.sub, textAlign: 'center', lineHeight: 20, marginBottom: 24, opacity: 0.85 }}>
                {triLang(lang, {
  ru: 'Подсказка: попробуй выбрать уровень полегче или выключи ручной ввод в настройках.',
  uk: 'Підказка: спробуй вибрати рівень легше або вимкни ручне введення в налаштуваннях.',
  es: 'Consejo: elige un nivel más fácil o desactiva «Escribir con el teclado» en Ajustes.',
  "pt-BR": 'Dica: tente escolher um nível mais fácil ou desative a digitação manual nas configurações.',
  vi: 'Gợi ý: hãy chọn cấp dễ hơn hoặc tắt nhập thủ công trong cài đặt.',
  id: 'Tips: coba pilih level yang lebih mudah atau matikan input manual di pengaturan.',
  tr: 'İpucu: daha kolay bir seviye seçmeyi veya ayarlardan elle girişi kapatmayı dene.',
  pl: 'Wskazówka: wybierz łatwiejszy poziom albo wyłącz ręczne wpisywanie w ustawieniach.',
})}
              </Text>
            )}
            <TouchableOpacity
              style={{ backgroundColor: t.accent, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, width: '100%', alignItems: 'center' }}
              onPress={() => { hapticTap(); setShowTimeoutAlert(false); onBackRef.current(); }}
            >
              <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '700' }}>
                {triLang(lang, {
  ru: 'Понятно',
  uk: 'Зрозуміло',
  es: 'Entendido',
  "pt-BR": 'Entendi',
  vi: 'Đã hiểu',
  id: 'Mengerti',
  tr: 'Anladım',
  pl: 'Rozumiem',
})}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>

    <NoEnergyModal
      visible={showNoEnergyModal}
      onClose={dismissEnergyModal}
      paywallContext="no_energy"
    />

    </ScreenGradient>
    </Animated.View>
  );
}

// ── КОРНЕВОЙ КОМПОНЕНТ ───────────────────────────────────────────────────────
export default function QuizzesScreen() {
  const [level, setLevel] = useState<Level|null>(null);
  const [gameKey, setGameKey] = useState(0);
  const [e2eInjectResults, setE2eInjectResults] = useState(false);
  const fromTaskRef = useRef(false);
  const { activeIdx } = useTabNav();
  const router = useRouter();
  const { isPremium } = usePremium();
  const { energy, bonusEnergy, isUnlimited } = useEnergy();
  const energySnapRef = useRef({ e: 0, b: 0, u: false });
  energySnapRef.current = { e: energy, b: bonusEnergy, u: isUnlimited };
  const QUIZZES_TAB_IDX = 2;

  // Блокируем свайп между вкладками пока квиз активен
  useEffect(() => {
    tabSwipeLock.blocked = level !== null;
    return () => { tabSwipeLock.blocked = false; };
  }, [level]);

  // Завершаем квиз если пользователь переключился на другую вкладку
  const prevActiveIdx = useRef(activeIdx);
  useEffect(() => {
    if (prevActiveIdx.current === QUIZZES_TAB_IDX && activeIdx !== QUIZZES_TAB_IDX && level !== null) {
      setLevel(null);
      setGameKey(k => k + 1);
    }
    prevActiveIdx.current = activeIdx;
  }, [activeIdx, level]);

  // quiz_nav_level (задания) или E2E-флаг — до первого рендера, чтобы не мелькал LevelSelect
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const nav = await AsyncStorage.getItem('quiz_nav_level');
        if (nav === 'hard' || nav === 'medium' || nav === 'easy') {
          if (!cancelled) {
            await new Promise(r => setTimeout(r, 200));
            if (cancelled) return;
            if (!DEV_MODE && !isPremium && nav !== 'easy') {
              await AsyncStorage.removeItem('quiz_nav_level');
              router.push({ pathname: '/premium_modal', params: { context: nav === 'hard' ? 'quiz_hard' : 'quiz_medium' } } as any);
              return;
            }
            if (!DEV_MODE && !isPremium && nav === 'easy' && !(await hasFreeDailyQuizzesLeft())) {
              await AsyncStorage.removeItem('quiz_nav_level');
              router.push({ pathname: '/premium_modal', params: { context: 'quiz_limit' } } as any);
              return;
            }
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
            fromTaskRef.current = true;
            setLevel(nav as Level);
          }
        } else {
          const e2e = await AsyncStorage.getItem(QUIZ_E2E_OPEN_RESULTS_KEY);
          if (e2e === '1') {
            await AsyncStorage.removeItem(QUIZ_E2E_OPEN_RESULTS_KEY);
            if (!cancelled) {
              setE2eInjectResults(true);
              setLevel('easy');
            }
          }
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [isPremium, router]);

  return (
    <View style={{ flex: 1 }}>
      {level
        ? <QuizGame key={gameKey} level={level} e2eInjectResults={e2eInjectResults} onBack={() => {
            if (fromTaskRef.current) { fromTaskRef.current = false; setE2eInjectResults(false); router.back(); return; }
            setE2eInjectResults(false);
            setLevel(null); setGameKey(k => k + 1);
          }}/>
        : <LevelSelect onSelect={(lv) => { logQuizLevelSelected(lv); trackQuizLevel(lv).catch(() => {}); setLevel(lv); }}/>
      }
    </View>
  );
}
