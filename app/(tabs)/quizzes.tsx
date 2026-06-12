import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hapticError, hapticTap } from '../../hooks/use-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from '../../components/SafeLinearGradient';
import BouncyScrollView, { useBouncy, useBouncyStyle } from '../../components/BouncyScrollView';
import Reanimated from 'react-native-reanimated';
import TapScale from '../../components/TapScale';
import CompassDepthSurface from '../../components/CompassDepthSurface';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { usePremium } from '../../components/PremiumContext';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';
import {
  Animated,
  Easing,
  InteractionManager,
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
import CoachToast from '../../components/CoachToast';
import ContentWrap from '../../components/ContentWrap';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLang } from '../../components/LangContext';
import { useStudyTarget } from '../../components/StudyTargetContext';
import LevelBadge from '../../components/LevelBadge';
import PremiumCard from '../../components/PremiumCard';
import ReportErrorButton from '../../components/ReportErrorButton';
import ScreenGradient from '../../components/ScreenGradient';
import { useTheme } from '../../components/ThemeContext';
import { triLang, type Lang, type PlannedInterfaceLang } from '../../constants/i18n';
import XpGainBadge from '../../components/XpGainBadge';
import { isCorrectAnswer } from '../../constants/contractions';
import { getXPProgress, type ThemeMode } from '../../constants/theme';
import { COMPASS_RICH, compassShadow } from '../../constants/compassTheme';
import { MOTION_DURATION, MOTION_SCALE, MOTION_SPRING_LEGACY as MOTION_SPRING } from '../../constants/motion';
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
import DuoPressable from '../../components/DuoPressable';
import { useWordFlash } from '../../hooks/use-word-flash';
import type { QuizPhrase } from '../quiz_data';
import { ensureQuizPhrasesLoaded, getQuizPhrasesLoaded, prefetchQuizPhrases } from '../quiz_phrases_loader';
import { isQuizChoiceCorrect, quizPrimaryCorrectIndex } from '../quiz_utils';

import { DEFAULT_SETTINGS, loadSettings, saveSettings, UserSettings as Settings } from '../settings_edu';
import { useTabNav } from '../TabContext';
import { tabSwipeLock } from '../tabSwipeLock';
import { calculateRewardWithBonus } from '../variable_reward_system';
import { registerXP } from '../xp_manager';
import { useEffectivePlatformOS } from '../platform_ui_preview';
import { recordMistake } from '../active_recall';
import { checkCoachToastNeededWithAnalytics, type CoachToastDecision } from '../coach_toast_trigger';
import { logMistake } from '../mistake_log';
import { resolvePhraseMistakeToken } from '../mistake_token_resolver';
import { safeRouterBack } from '../navigation_back';
import type { PhraseMistakeInput } from '../phrase_analytics';
import {
  QUIZ_E2E_OPEN_RESULTS_KEY,
  QUIZ_LEVEL_LOGOS,
} from '../quizzes/constants';
import { getQuizCompletionMedalSource } from '../quizzes/medal_assets';
import {
  consumeFreeDailyQuizStart,
  FREE_DAILY_QUIZ_LIMIT,
  getFreeDailyQuizState,
  hasFreeDailyQuizzesLeft,
  type QuizDailyLimitState,
} from '../quiz_daily_limit';
import {
  buildQuizShareMessage,
  getQuizShareRank,
  quizShareMessageLang,
} from '../quizzes/results';
import { frenchQuizGateCopy, quizContentAvailableForTarget } from '../quiz_target_gate';
import { quizNavLevelKey } from '../target_storage_keys';
import { getPersonalPlanQuizCoverage, getPersonalPlanQuizPhrases, getPersonalPlanQuizTaskCopy } from '../personal_plan_quizzes';
import { buildPersonalPlanQuizMistakeMeta } from '../personal_plan_quiz_mistake_adapter';
import { markPersonalPlanTaskCompleted } from '../personal_plan_progress';
import {
  getAvailableThematicQuizCategories,
  getThematicQuizCategory,
  getThematicQuizPhrases,
  themedQuizAsset,
  type ThematicQuizCategory,
  type ThematicQuizCategoryId,
} from '../quiz_thematic_registry';

const QUIZ_ENTRY_ANIMATION_USE_NATIVE_DRIVER = true;
const QUIZ_ENTRY_REPEATING_MOTION_ENABLED = true;
const QUIZ_CARD_ICON_SLOT_WIDTH = 112;
const QUIZ_CARD_ICON_SIZE = 96;
const QUIZ_CARD_ICON_FALLBACK_SIZE = 64;
const QUIZ_CARD_ICON_FALLBACK_ICON_SIZE = 32;

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
type LegacyQuizThemeMode = 'light' | 'ocean' | 'sakura';
type QuizVisualThemeMode = ThemeMode | LegacyQuizThemeMode;

function quizExplanationIndexForAnswer(phrase: Phrase, chosen: number | null, typedOk: boolean | null): number {
  if (chosen !== null) return chosen;
  if (typedOk === true) return quizPrimaryCorrectIndex(phrase.correct);
  const wrongIdx = phrase.explanations?.findIndex((_, idx) => !isQuizChoiceCorrect(idx, phrase.correct)) ?? -1;
  return wrongIdx >= 0 ? wrongIdx : quizPrimaryCorrectIndex(phrase.correct);
}

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

// DEPRECATED: Use theme.textPrimary and theme.textMuted directly
// Kept for backward compatibility with locked items
const THEME_TEXT: Record<QuizVisualThemeMode, { primary: string; secondary: string }> = {
  dark:   { primary: '#FFFFFF', secondary: 'rgba(255,255,255,0.6)' },
  light:  { primary: '#0F172A', secondary: 'rgba(15,23,42,0.6)'   },
  gold:   { primary: '#FFFFFF', secondary: 'rgba(255,255,255,0.6)' },
  coral:  { primary: '#FFFFFF', secondary: '#D8C2C5' },
  minimalDark: { primary: '#F5F5F5', secondary: '#A7ABB3' },
  midnight: { primary: '#FFFFFF', secondary: 'rgba(255,255,255,0.66)' },
  ember:    { primary: '#FFFFFF', secondary: 'rgba(255,255,255,0.66)' },
  aurora:   { primary: '#FFFFFF', secondary: 'rgba(255,255,255,0.66)' },
  volt:     { primary: '#FFFFFF', secondary: 'rgba(255,255,255,0.66)' },
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
type QuizMenuSelection = Level | ThematicQuizCategoryId;
type QuizIconName = React.ComponentProps<typeof Ionicons>['name'];

const isLevelSelection = (selection: QuizMenuSelection | null): selection is Level =>
  selection === 'easy' || selection === 'medium' || selection === 'hard';

const QUIZ_LEVEL_FALLBACK_ICONS: Record<Level, QuizIconName> = {
  easy: 'leaf-outline',
  medium: 'flame-outline',
  hard: 'diamond-outline',
};

const thematicQuizFallbackIcon = (categoryId: ThematicQuizCategoryId): QuizIconName => {
  switch (categoryId) {
    case 'kitchen-and-cooking':
      return 'restaurant-outline';
    case 'home-and-rooms':
      return 'home-outline';
    case 'at-the-doctor':
      return 'medical-outline';
    case 'body-and-health':
      return 'fitness-outline';
    case 'shopping-and-money':
      return 'bag-handle-outline';
    default:
      return 'sparkles-outline';
  }
};

function QuizCardLogoImageWithFallback({
  source,
  fallbackName,
  accent,
  locked,
  showFallbackIcon = true,
  size = 94,
  fallbackSize = 66,
  fallbackIconSize = 34,
}: {
  source: ImageSourcePropType;
  fallbackName: QuizIconName;
  accent: string;
  locked: boolean;
  showFallbackIcon?: boolean;
  size?: number;
  fallbackSize?: number;
  fallbackIconSize?: number;
}) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [source]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', opacity: locked ? 0.28 : 1 }}>
      {showFallbackIcon && !loaded && (
        <View style={{
          width: fallbackSize,
          height: fallbackSize,
          borderRadius: Math.max(12, Math.round(fallbackSize * 0.3)),
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: `${accent}24`,
          borderWidth: 1,
          borderColor: `${accent}55`,
        }}>
          <Ionicons name={fallbackName} size={fallbackIconSize} color={accent} />
        </View>
      )}
      <Image
        source={source}
        style={StyleSheet.absoluteFillObject}
        contentFit="contain"
        cachePolicy="memory-disk"
        transition={0}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(false)}
      />
    </View>
  );
}

function useQuizCardIconPulse(enabled: boolean) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!enabled || !QUIZ_ENTRY_REPEATING_MOTION_ENABLED) {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      return undefined;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: MOTION_SCALE.nudge,
          duration: 740,
          useNativeDriver: QUIZ_ENTRY_ANIMATION_USE_NATIVE_DRIVER,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 740,
          useNativeDriver: QUIZ_ENTRY_ANIMATION_USE_NATIVE_DRIVER,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [enabled, pulseAnim]);

  return pulseAnim;
}

// Тип фразы для квиза — используем QuizPhrase из quiz_data
// level передаётся из QuizGame

function BaseQuizLevelCard({
  level,
  lang,
  themeMode,
  t,
  f,
  isSelected,
  locked,
  lockedLabel,
  startTrackW,
  onPick,
  onLockedPress,
  onStart,
}: {
  level: Level;
  lang: Lang;
  themeMode: QuizVisualThemeMode;
  t: any;
  f: any;
  isSelected: boolean;
  locked: boolean;
  lockedLabel: string;
  startTrackW: number;
  onPick: () => void;
  onLockedPress: () => void;
  onStart: (level: Level, fillAnim: Animated.Value) => void;
}) {
  const fillAnim = useRef(new Animated.Value(0)).current;
  const c = LEVEL_CONFIG[level];
  const title = triLang(lang, {
    ru: c.labelRU,
    uk: c.labelUK,
    es: c.labelES,
    'pt-BR': c.labelPTBR,
    vi: c.labelVI,
    id: c.labelID,
    tr: c.labelTR,
    pl: c.labelPL,
  });
  const subtitle = triLang(lang, {
    ru: c.tagRU,
    uk: c.tagUK,
    es: c.tagES,
    'pt-BR': c.tagPTBR,
    vi: c.tagVI,
    id: c.tagID,
    tr: c.tagTR,
    pl: c.tagPL,
  });
  const accent = locked ? t.textMuted : c.color;
  const isLightTheme = themeMode === 'light';
  const isCompassTheme = false;
  const pulseAnim = useQuizCardIconPulse(!locked);
  const textCol = locked ? t.textSecond : isLightTheme ? '#1F2933' : '#FFFFFF';
  const textCol2 = locked ? t.textMuted : isLightTheme ? 'rgba(31,41,51,0.66)' : 'rgba(226,232,240,0.78)';
  const gradA = locked ? t.bgCard : isLightTheme ? `${accent}24` : `${accent}22`;
  const gradB = locked ? t.bgSurface : isLightTheme ? 'rgba(255,255,255,0.92)' : 'rgba(15,23,42,0.88)';
  const visualSelected = isSelected && !locked;
  const compassRadius = 10;
  const levelLogoMap = QUIZ_LEVEL_LOGOS as Record<string, Record<Level, ImageSourcePropType>>;
  const levelLogo = levelLogoMap[themeMode]?.[level] ?? levelLogoMap.minimalDark[level];
  const fillTx = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-startTrackW, 0],
  });

  return (
    <View collapsable={false} style={[{ borderRadius: isCompassTheme ? compassRadius : 18, overflow: 'hidden' }, isCompassTheme && compassShadow(visualSelected ? 2 : 1)]}>
      <TapScale
        testID={`quiz-level-card-${level}`}
        accessibilityLabel={`qa-quiz-level-card-${level}`}
        onPress={() => {
          if (locked) { onLockedPress(); return; }
          if (isSelected) { onStart(level, fillAnim); return; }
          onPick();
        }}
        scaleTo={0.97}
        withHaptic={false}
      >
        <LinearGradient
          collapsable={false}
          colors={[gradA, gradB]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderTopLeftRadius: isCompassTheme ? compassRadius : 18,
            borderTopRightRadius: isCompassTheme ? compassRadius : 18,
            borderBottomLeftRadius: visualSelected ? 0 : isCompassTheme ? compassRadius : 18,
            borderBottomRightRadius: visualSelected ? 0 : isCompassTheme ? compassRadius : 18,
            borderWidth: visualSelected ? 2 : 1,
            borderColor: isCompassTheme ? (visualSelected ? COMPASS_RICH.hairlineStrong : COMPASS_RICH.hairlineQuiet) : visualSelected ? accent : (locked ? t.border : `${accent}40`),
            borderBottomColor: visualSelected ? 'transparent' : undefined,
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: 108,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {isCompassTheme ? <CompassDepthSurface radius={compassRadius} selected={visualSelected} quiet={locked} /> : null}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              right: -36,
              top: -32,
              width: 172,
              height: 172,
              borderRadius: 86,
              backgroundColor: locked ? t.border : `${accent}18`,
              opacity: isLightTheme ? 0.8 : 1,
            }}
          />
          <View collapsable={false} style={{ flex: 1, paddingVertical: 14, paddingLeft: 16, paddingRight: QUIZ_CARD_ICON_SLOT_WIDTH + 18, zIndex: 2 }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:4 }}>
              <View style={{
                backgroundColor: `${accent}25`,
                borderRadius: 6,
                paddingHorizontal: 7,
                paddingVertical: 2,
                borderWidth: 1,
                borderColor: `${accent}50`,
              }}>
                <Text style={{ color: accent, fontSize: f.label, fontWeight:'800', letterSpacing:0.8 }}>
                  {c.sub}
                </Text>
              </View>
              {locked && (
                <View style={{ flexDirection:'row', alignItems:'center', gap:4, backgroundColor: t.accentBg, borderRadius:6, paddingHorizontal:7, paddingVertical:2 }}>
                  <Ionicons name="lock-closed" size={10} color={t.textSecond}/>
                  <Text style={{ color:t.textSecond, fontSize: f.label, fontWeight:'700' }}>
                    {lockedLabel}
                  </Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection:'column', gap:4, marginTop:4 }}>
              <Text style={{ color: textCol, fontSize: f.h2, fontWeight:'900' }}>{title}</Text>
              <Text style={{ color: textCol2, fontSize: f.sub, flexWrap:'wrap' }}>{subtitle}</Text>
            </View>
          </View>

          <Animated.View
            collapsable={false}
            pointerEvents="none"
            style={{
              position: 'absolute',
              right: 10,
              top: 0,
              bottom: 0,
              width: QUIZ_CARD_ICON_SLOT_WIDTH,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 3,
              transform: [{ scale: locked ? 1 : pulseAnim }],
            }}
          >
            <QuizCardLogoImageWithFallback
              source={levelLogo}
              fallbackName={QUIZ_LEVEL_FALLBACK_ICONS[level]}
              accent={accent}
              locked={locked}
              size={QUIZ_CARD_ICON_SIZE}
              fallbackSize={QUIZ_CARD_ICON_FALLBACK_SIZE}
              fallbackIconSize={QUIZ_CARD_ICON_FALLBACK_ICON_SIZE}
            />
          </Animated.View>
        </LinearGradient>
      </TapScale>

      {visualSelected && (
        <TapScale
          testID={`quiz-level-start-${level}`}
          accessibilityLabel={`qa-quiz-level-start-${level}`}
          onPress={() => { onStart(level, fillAnim); }}
          scaleTo={0.96}
          withHaptic={false}
          style={{
            height: 46,
            backgroundColor: isCompassTheme ? COMPASS_RICH.washStrong : `${accent}22`,
            borderWidth: 2,
            borderTopWidth: 0,
            borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : accent,
            borderBottomLeftRadius: isCompassTheme ? compassRadius : 18,
            borderBottomRightRadius: isCompassTheme ? compassRadius : 18,
            overflow: 'hidden',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {isCompassTheme ? <CompassDepthSurface radius={compassRadius} selected /> : null}
          <Animated.View
            collapsable={false}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              backgroundColor: isCompassTheme ? COMPASS_RICH.champagne : accent,
              transform: [{ translateX: fillTx }],
            }}
          />
          <Text style={{ color: isCompassTheme ? COMPASS_RICH.champagne : accent, fontSize: f.body, fontWeight:'800', zIndex: 1 }}>
            {triLang(lang, {
  ru: 'Начать вызов',
  uk: 'Почати квіз',
  es: 'Empezar cuestionario',
  "pt-BR": 'Começar quiz',
  vi: 'Bắt đầu quiz',
  id: 'Mulai kuis',
  tr: 'Quize başla',
  pl: 'Rozpocznij quiz',
})} · {title}
          </Text>
        </TapScale>
      )}
    </View>
  );
}

function ThematicQuizLevelCard({
  category,
  lang,
  themeMode,
  t,
  f,
  isSelected,
  locked,
  lockedLabel,
  startTrackW,
  onPick,
  onLockedPress,
  onStart,
}: {
  category: ThematicQuizCategory;
  lang: Lang;
  themeMode: QuizVisualThemeMode;
  t: any;
  f: any;
  isSelected: boolean;
  locked: boolean;
  lockedLabel: string;
  startTrackW: number;
  onPick: () => void;
  onLockedPress: () => void;
  onStart: (categoryId: ThematicQuizCategoryId, fillAnim: Animated.Value) => void;
}) {
  const fillAnim = useRef(new Animated.Value(0)).current;
  const title = category.title[lang];
  const subtitle = category.subtitle[lang];
  const accent = locked ? t.textMuted : category.accent;
  const isLightTheme = themeMode === 'light';
  const textCol = locked ? t.textSecond : isLightTheme ? '#1F2933' : '#FFFFFF';
  const textCol2 = locked ? t.textMuted : isLightTheme ? 'rgba(31,41,51,0.66)' : 'rgba(226,232,240,0.78)';
  const gradA = locked ? t.bgCard : isLightTheme ? '#FFF8ED' : `${accent}24`;
  const gradB = locked ? t.bgSurface : isLightTheme ? '#EFE1CA' : 'rgba(15,23,42,0.88)';
  const categoryLogo = themedQuizAsset(category.logos, themeMode);
  const visualSelected = isSelected && !locked;
  const isCompassTheme = false;
  const pulseAnim = useQuizCardIconPulse(!locked);
  const compassRadius = 10;
  const fillTx = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-startTrackW, 0],
  });

  return (
    <View collapsable={false} style={[{ borderRadius: isCompassTheme ? compassRadius : 18, overflow: 'hidden' }, isCompassTheme && compassShadow(visualSelected ? 2 : 1)]}>
      <TapScale
        onPress={() => {
          if (locked) { onLockedPress(); return; }
          if (isSelected) { onStart(category.id, fillAnim); return; }
          onPick();
        }}
        scaleTo={0.97}
        withHaptic={false}
      >
        <LinearGradient
          collapsable={false}
          colors={[gradA, gradB]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderTopLeftRadius: isCompassTheme ? compassRadius : 18,
            borderTopRightRadius: isCompassTheme ? compassRadius : 18,
            borderBottomLeftRadius: visualSelected ? 0 : isCompassTheme ? compassRadius : 18,
            borderBottomRightRadius: visualSelected ? 0 : isCompassTheme ? compassRadius : 18,
            borderWidth: visualSelected ? 2 : 1,
            borderColor: isCompassTheme ? (visualSelected ? COMPASS_RICH.hairlineStrong : COMPASS_RICH.hairlineQuiet) : visualSelected ? accent : (locked ? t.border : `${accent}40`),
            borderBottomColor: visualSelected ? 'transparent' : undefined,
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: 108,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              right: -36,
              top: -32,
              width: 172,
              height: 172,
              borderRadius: 86,
              backgroundColor: locked ? t.border : `${accent}18`,
              opacity: isLightTheme ? 0.8 : 1,
            }}
          />
          <View collapsable={false} style={{ flex: 1, paddingVertical: 14, paddingLeft: 16, paddingRight: QUIZ_CARD_ICON_SLOT_WIDTH + 18, zIndex: 2 }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:4 }}>
              <View style={{
                backgroundColor: `${accent}25`,
                borderRadius: 6,
                paddingHorizontal: 7,
                paddingVertical: 2,
                borderWidth: 1,
                borderColor: `${accent}50`,
              }}>
                <Text style={{ color: accent, fontSize: f.label, fontWeight:'800', letterSpacing:0.8 }}>
                  {category.badge}
                </Text>
              </View>
              {locked && (
                <View style={{ flexDirection:'row', alignItems:'center', gap:4, backgroundColor: t.accentBg, borderRadius:6, paddingHorizontal:7, paddingVertical:2 }}>
                  <Ionicons name="lock-closed" size={10} color={t.textSecond}/>
                  <Text style={{ color:t.textSecond, fontSize: f.label, fontWeight:'700' }}>
                    {lockedLabel}
                  </Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection:'column', gap:4, marginTop:4 }}>
              <Text style={{ color: textCol, fontSize: f.h2, fontWeight:'900' }}>{title}</Text>
              <Text style={{ color: textCol2, fontSize: f.sub, flexWrap:'wrap' }}>{subtitle}</Text>
            </View>
          </View>

          <Animated.View
            collapsable={false}
            pointerEvents="none"
            style={{
              position: 'absolute',
              right: 10,
              top: 0,
              bottom: 0,
              width: QUIZ_CARD_ICON_SLOT_WIDTH,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 3,
              transform: [{ scale: locked ? 1 : pulseAnim }],
            }}
          >
            <QuizCardLogoImageWithFallback
              source={categoryLogo}
              fallbackName={thematicQuizFallbackIcon(category.id)}
              accent={accent}
              locked={locked}
              showFallbackIcon={false}
              size={QUIZ_CARD_ICON_SIZE}
              fallbackSize={QUIZ_CARD_ICON_FALLBACK_SIZE}
              fallbackIconSize={QUIZ_CARD_ICON_FALLBACK_ICON_SIZE}
            />
          </Animated.View>
        </LinearGradient>
      </TapScale>

      {visualSelected && (
        <TapScale
          onPress={() => { onStart(category.id, fillAnim); }}
          scaleTo={0.96}
          withHaptic={false}
          style={{
            height: 46,
            backgroundColor: isCompassTheme ? COMPASS_RICH.washStrong : `${accent}22`,
            borderWidth: 2,
            borderTopWidth: 0,
            borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : accent,
            borderBottomLeftRadius: isCompassTheme ? compassRadius : 18,
            borderBottomRightRadius: isCompassTheme ? compassRadius : 18,
            overflow: 'hidden',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Animated.View
            collapsable={false}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              backgroundColor: isCompassTheme ? COMPASS_RICH.champagne : accent,
              transform: [{ translateX: fillTx }],
            }}
          />
          <Text style={{ color: isCompassTheme ? COMPASS_RICH.champagne : accent, fontSize: f.body, fontWeight:'800', zIndex: 1 }}>
            {triLang(lang, {
  ru: 'Начать вызов',
  uk: 'Почати квіз',
  es: 'Empezar cuestionario',
  "pt-BR": 'Começar quiz',
  vi: 'Bắt đầu quiz',
  id: 'Mulai kuis',
  tr: 'Quize başla',
  pl: 'Rozpocznij quiz',
})} · {title}
          </Text>
        </TapScale>
      )}
    </View>
  );
}



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
function LevelSelect({ onSelect }: { onSelect:(selection:QuizMenuSelection)=>void }) {
  const { GestureWrap: BouncyWrap, stretch: bouncyStretch, onBouncyScroll } = useBouncy();
  const bouncyStyle = useBouncyStyle(bouncyStretch);
  const { theme:t , f, themeMode: rawThemeMode } = useTheme();
  const themeMode = rawThemeMode as QuizVisualThemeMode;

  const { s, lang } = useLang();
  const { studyTarget } = useStudyTarget();

  const router = useRouter();
  const { hasPremiumAccess: isPremium } = usePremium();
  const insets = useSafeAreaInsets();
  const { energy, bonusEnergy, isUnlimited: energyUnlimited } = useEnergy();
  const [selected, setSelected] = useState<QuizMenuSelection | null>(null);
  const [showLevelNoEnergy, setShowLevelNoEnergy] = useState(false);
  const [freeQuizState, setFreeQuizState] = useState<QuizDailyLimitState>({
    date: '',
    count: 0,
    limit: FREE_DAILY_QUIZ_LIMIT,
    left: FREE_DAILY_QUIZ_LIMIT,
    exhausted: false,
  });
  const startInFlightRef = useRef(false);
  const startInFlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const screenTitleColor = t.textPrimary;
  const { width: windowWidth } = useWindowDimensions();
  /** Ширина трека полоски: translateX + native driver (без скачков interpolate от onLayout) */
  const startTrackW = Math.max(1, windowWidth - 40);
  const thematicCategories = useMemo(
    () => getAvailableThematicQuizCategories(studyTarget),
    [studyTarget],
  );

  useEffect(() => {
    prefetchQuizPhrases();
  }, []);

  const releaseStartInFlight = useCallback(() => {
    if (startInFlightTimeoutRef.current) {
      clearTimeout(startInFlightTimeoutRef.current);
      startInFlightTimeoutRef.current = null;
    }
    startInFlightRef.current = false;
  }, []);

  const armStartInFlightWatchdog = useCallback(() => {
    if (startInFlightTimeoutRef.current) clearTimeout(startInFlightTimeoutRef.current);
    startInFlightTimeoutRef.current = setTimeout(() => {
      startInFlightRef.current = false;
      startInFlightTimeoutRef.current = null;
    }, 2500);
  }, []);

  useEffect(() => releaseStartInFlight, [releaseStartInFlight]);

  useEffect(() => {
    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      void getFreeDailyQuizState().then((state) => {
        if (!cancelled) setFreeQuizState(state);
      });
    });
    return () => { cancelled = true; task.cancel(); };
  }, []);

  const quizLimitLabel = triLang(lang, {
    ru: 'Лимит',
    uk: 'Ліміт',
    es: 'Límite',
    "pt-BR": 'Limite',
    vi: 'Giới hạn',
    id: 'Batas',
    tr: 'Limit',
    pl: 'Limit',
  });

  const openQuizLimitPaywall = useCallback(() => {
    router.push({ pathname: '/premium_modal', params: { context: 'quiz_limit' } } as any);
  }, [router]);

  const consumeFreeSlotForStart = useCallback(async (selection: QuizMenuSelection): Promise<boolean> => {
    if (DEV_MODE || isPremium) return true;

    const nextState = await consumeFreeDailyQuizStart();
    if (nextState) {
      setFreeQuizState(nextState);
      return true;
    }

    setFreeQuizState(await getFreeDailyQuizState());
    openQuizLimitPaywall();
    return false;
  }, [isPremium, openQuizLimitPaywall]);

  const runStartFill = useCallback((anim: Animated.Value, onDone: () => void) => {
    let completed = false;
    const finishStart = () => {
      if (completed) return;
      completed = true;
      anim.setValue(0);
      releaseStartInFlight();
      onDone();
    };
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: QUIZ_ENTRY_ANIMATION_USE_NATIVE_DRIVER,
    }).start(({ finished }) => {
      if (completed) return;
      if (!finished) {
        releaseStartInFlight();
        return;
      }
      finishStart();
    });
    setTimeout(() => {
      anim.stopAnimation();
      finishStart();
    }, 520);
  }, [releaseStartInFlight]);

  const handleStartLevel = useCallback((level: Level, anim: Animated.Value) => {
    if (startInFlightRef.current) return;
    if (!energyUnlimited && energy + bonusEnergy <= 0) {
      logEnergyLimitHit('quiz');
      trackEnergyHit().catch(() => {});
      setShowLevelNoEnergy(true);
      return;
    }
    startInFlightRef.current = true;
    armStartInFlightWatchdog();
    void (async () => {
      const canStart = await consumeFreeSlotForStart(level);
      if (!canStart) {
        releaseStartInFlight();
        return;
      }
      await ensureQuizPhrasesLoaded();
      runStartFill(anim, () => onSelect(level));
    })().catch(() => {
      releaseStartInFlight();
    });
  }, [armStartInFlightWatchdog, bonusEnergy, consumeFreeSlotForStart, energy, energyUnlimited, onSelect, releaseStartInFlight, runStartFill]);

  const handleStartThematic = useCallback((categoryId: ThematicQuizCategoryId, anim: Animated.Value) => {
    if (startInFlightRef.current) return;
    if (!energyUnlimited && energy + bonusEnergy <= 0) {
      logEnergyLimitHit('quiz');
      trackEnergyHit().catch(() => {});
      setShowLevelNoEnergy(true);
      return;
    }
    startInFlightRef.current = true;
    armStartInFlightWatchdog();
    void consumeFreeSlotForStart(categoryId).then((canStart) => {
      if (!canStart) {
        releaseStartInFlight();
        return;
      }
      runStartFill(anim, () => onSelect(categoryId));
    }).catch(() => {
      releaseStartInFlight();
    });
  }, [armStartInFlightWatchdog, bonusEnergy, consumeFreeSlotForStart, energy, energyUnlimited, onSelect, releaseStartInFlight, runStartFill]);

  const lockedByDailyLimit = !DEV_MODE && !isPremium && freeQuizState.exhausted;
  const isLightEntryTheme = themeMode === 'light';
  const sectionLabelColor = isLightEntryTheme ? 'rgba(31,41,51,0.58)' : 'rgba(226,232,240,0.64)';
  return (
    <ScreenGradient forceFullBleed artBackdrop="quizzes">
    <View testID="quiz-game-screen" accessibilityLabel="qa-quiz-game-screen" style={{ flex:1 }}>
      <ContentWrap>
      <Reanimated.View style={[{ flex: 1 }, bouncyStyle]}>
      <View style={{ paddingHorizontal: 16, paddingTop: 16 + insets.top, paddingBottom: 12, borderBottomWidth:0.5, borderBottomColor: t.border }}>
        <View style={{ flexDirection:'row', alignItems:'center', gap: 10 }}>
          <TapScale
            onPress={() => {
              hapticTap();
              safeRouterBack(router, '/(tabs)/home' as any);
            }}
            withHaptic={false}
            style={{ width:42, height:42, borderRadius:21, backgroundColor:t.bgCard, borderWidth:0.5, borderColor:t.border, justifyContent:'center', alignItems:'center' }}
          >
            <Ionicons name="chevron-back" size={24} color={t.textPrimary}/>
          </TapScale>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: screenTitleColor, fontSize: f.numMd, fontWeight:'900' }} adjustsFontSizeToFit numberOfLines={1}>
              {triLang(lang, {
                ru: 'Вызовы',
                uk: 'Квізи',
                es: 'Cuestionarios',
                "pt-BR": 'Quizzes',
                vi: 'Quiz',
                id: 'Kuis',
                tr: 'Quizler',
                pl: 'Quizy',
              })}
            </Text>
          </View>
          <EnergyBar size={30} />
          <PremiumCard
            level={1}
            testID="quiz-level-select-settings"
            accessibilityLabel="qa-quiz-level-select-settings"
            onPress={() => { hapticTap(); router.push('/settings_edu'); }}
            style={{ width: 42, height: 42, borderRadius: 21 }}
            innerStyle={{ width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' }}
          >
            <Ionicons name="settings-outline" size={20} color={t.textSecond} />
          </PremiumCard>
          <ReportErrorButton
            screen="quizzes_tab"
            dataId="quiz_level_select"
            dataText={s.quizzes.selectLevel}
            variant="icon-flag"
            accessibilityLabel="Сообщить о баге на экране квизов"
            style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: t.bgCard, borderWidth: 0.5, borderColor: t.border }}
          />
        </View>
      </View>

      <BouncyWrap>
      <ScrollView
        style={{ flex: 1 }}
        decelerationRate="normal"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: Math.max(24, insets.bottom + 24),
          gap: 14,
        }}
        showsVerticalScrollIndicator
        persistentScrollbar
        indicatorStyle={isLightEntryTheme ? 'black' : 'white'}
        bounces
        alwaysBounceVertical
        overScrollMode="always"
        onScroll={onBouncyScroll}
        scrollEventThrottle={16}
      >
        <View style={{ gap: 10 }}>
          <Text style={{ color: sectionLabelColor, fontSize: f.sub, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 }}>
            {triLang(lang, { ru: 'Уровни', uk: 'Рівні', es: 'Niveles', "pt-BR": 'Níveis', vi: 'Cấp độ', id: 'Level', tr: 'Seviyeler', pl: 'Poziomy' })}
          </Text>
          {(Object.keys(LEVEL_CONFIG) as Level[]).map(level => (
            <BaseQuizLevelCard
              key={level}
              level={level}
              lang={lang}
              themeMode={themeMode}
              t={t}
              f={f}
              isSelected={selected === level}
              locked={lockedByDailyLimit}
              lockedLabel={quizLimitLabel}
              startTrackW={startTrackW}
              onPick={() => {
                releaseStartInFlight();
                setSelected(level);
              }}
              onLockedPress={openQuizLimitPaywall}
              onStart={handleStartLevel}
            />
          ))}
        </View>

        <View style={{ gap: 10 }}>
          <Text style={{ color: sectionLabelColor, fontSize: f.sub, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 }}>
            {triLang(lang, { ru: 'Темы', uk: 'Теми', es: 'Temas', "pt-BR": 'Temas', vi: 'Chủ đề', id: 'Tema', tr: 'Konular', pl: 'Tematy' })}
          </Text>
          {thematicCategories.map(category => {
            return (
              <ThematicQuizLevelCard
                key={category.id}
                category={category}
                lang={lang}
                themeMode={themeMode}
                t={t}
                f={f}
                isSelected={selected === category.id}
                locked={lockedByDailyLimit}
                lockedLabel={quizLimitLabel}
                startTrackW={startTrackW}
                onPick={() => {
                  releaseStartInFlight();
                  setSelected(category.id);
                }}
                onLockedPress={openQuizLimitPaywall}
                onStart={handleStartThematic}
              />
            );
          })}
        </View>

        {!DEV_MODE && !isPremium && (
          <View style={{
            marginTop: 2,
            borderRadius: 16,
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
                ru: `Осталось вызовов сегодня: ${freeQuizState.left} из ${freeQuizState.limit}`,
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
      </ScrollView>
      </BouncyWrap>
      </Reanimated.View>
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

function QuizGame({
  level,
  thematicCategoryId,
  onBack,
  e2eInjectResults,
  planQuizId,
  planTaskId,
  planInstanceId,
  planId,
  planDayIndex,
}: {
  level:Level;
  thematicCategoryId?: ThematicQuizCategoryId;
  onBack:()=>void;
  e2eInjectResults?: boolean;
  planQuizId?: string;
  planTaskId?: string;
  planInstanceId?: string;
  planId?: string;
  planDayIndex?: number;
}) {
  const effectiveOs = useEffectivePlatformOS();
  const { theme:t , f, themeMode: rawThemeMode } = useTheme();
  const themeMode = rawThemeMode as QuizVisualThemeMode;
  const isCompassTheme = false;
  const { s, lang } = useLang();
  const { studyTarget } = useStudyTarget();

  const { goHome, activeIdx } = useTabNav();
  const router = useRouter();
  const { hasPremiumAccess: isPremium } = usePremium();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isLightTheme = themeMode === 'light';
  /** Текст на тёмном градиенте (океан/сакура): не t.text* — они для светлых карточек */
  const quizGradTxt = THEME_TEXT[themeMode];
  const onGradPrimary = isLightTheme ? quizGradTxt.primary : t.textPrimary;
  const onGradMuted = isLightTheme ? quizGradTxt.secondary : t.textMuted;
  const onGradSecondary = isLightTheme ? quizGradTxt.secondary : t.textSecond;
  const thematicCategory = useMemo(
    () => thematicCategoryId ? getThematicQuizCategory(thematicCategoryId, studyTarget) : undefined,
    [thematicCategoryId, studyTarget],
  );
  const cfg = LEVEL_CONFIG[level] ?? LEVEL_CONFIG['easy'];
  const quizLevel: Level = LEVEL_CONFIG[level] ? level : 'easy';
  const levelAccent = thematicCategory?.accent ?? cfg.color;
  const label = useMemo(
    () => thematicCategory
      ? thematicCategory.title[lang]
      : triLang(lang, {
          ru: cfg.labelRU,
          uk: cfg.labelUK,
          es: cfg.labelES,
          'pt-BR': cfg.labelPTBR,
          vi: cfg.labelVI,
          id: cfg.labelID,
          tr: cfg.labelTR,
          pl: cfg.labelPL,
        }),
    [thematicCategory, lang, cfg],
  );
  const quizBankAvailable = useMemo(
    () => quizContentAvailableForTarget(studyTarget),
    [studyTarget],
  );

  const [retryCount, setRetryCount] = useState(0);

  const [planQuizUserName, setPlanQuizUserName] = useState('Phraseman');

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  const phrases = useMemo((): Phrase[] => {
    const planPhrases = getPersonalPlanQuizPhrases(planQuizId, planQuizUserName);
    if (planPhrases) return planPhrases.slice(0, 10);
    if (!quizBankAvailable) {
      return [];
    }
    try {
      if (thematicCategoryId) {
        const result = getThematicQuizPhrases(thematicCategoryId, {
          sourceLocale: lang,
          studyTarget,
          level: 'A1',
        });
        return result.length > 0 ? result : [];
      }
      const result = getQuizPhrasesLoaded(quizLevel, 10, lang);
      if (result.length > 0) return result;

      const sameLevelEnglish = getQuizPhrasesLoaded(quizLevel, 10, lang);
      if (sameLevelEnglish.length > 0) return sameLevelEnglish;

      for (const fallbackLevel of ['easy', 'medium', 'hard'] as const) {
        const fallback = getQuizPhrasesLoaded(fallbackLevel, 10, lang);
        if (fallback.length > 0) return fallback;
      }
      return [];
    } catch (e) {
      DebugLogger.error('quizzes.tsx:loadPhrases', e, 'warning');
      for (const fallbackLevel of ['easy', 'medium', 'hard'] as const) {
        const fallback = getQuizPhrasesLoaded(fallbackLevel, 10, lang);
        if (fallback.length > 0) return fallback;
      }
      return [];
    }
  }, [lang, planQuizId, planQuizUserName, quizBankAvailable, quizLevel, retryCount, studyTarget, thematicCategoryId]);
  const planQuizTaskCopy = useMemo(
    () => getPersonalPlanQuizTaskCopy(planQuizId, lang, settings.hardMode ? 'typing' : 'choice'),
    [lang, planQuizId, settings.hardMode],
  );
  const planQuizCoverage = useMemo(
    () => getPersonalPlanQuizCoverage(planQuizId),
    [planQuizId],
  );

  const { speak: speakAudio, stop: stopAudio } = useAudio();
  const { flashKey, flash } = useWordFlash();
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
  const [coachToast, setCoachToast] = useState<CoachToastDecision | null>(null);
  const wrongMistakesRef = useRef<PhraseMistakeInput[]>([]);
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
      logQuizComplete(thematicCategoryId ? `thematic:${thematicCategoryId}` : level, score);
      if (!thematicCategoryId) void bumpQuizSessionCompleted(level, studyTarget);
      if (planTaskId) {
        void markPersonalPlanTaskCompleted({
          taskId: planTaskId,
          planInstanceId,
          planId,
          dayIndex: planDayIndex || 1,
        });
      }
      void (async () => {
        const { checkAchievements: ca, bumpQuizAchievementCounter: bumpCounter } = await import('../achievements');
        const next = await bumpCounter('achievement_quiz_total_count', studyTarget);
        void ca({ type: 'quiz_session_count', count: next, studyTarget });
      })();
    }
  }, [done, level, planDayIndex, planId, planInstanceId, planTaskId, results, studyTarget, thematicCategoryId]);
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
    setCoachToast(null);
    wrongMistakesRef.current = [];
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
    loadSettings().then(setSettings).catch(() => {});
    AsyncStorage.getItem('hard_tip_dismissed').then(v => {
      if (v === '1') setHardTipDismissed(true);
    }).catch(() => {});
    AsyncStorage.getItem('user_name').then(name => {
      const safeName = (name ?? '').trim() || 'Phraseman';
      userNameRef.current = safeName;
      setPlanQuizUserName(safeName);
    }).catch(() => {});
    AsyncStorage.getItem('user_total_xp').then(v => {
      setTotalXP(parseInt(v || '0') || 0);
    }).catch(() => {});
  }, []);

  // Синхронизируем streakRef с streak стейтом
  useEffect(() => { streakRef.current = streak; }, [streak]);

  // [ACHIEVEMENT + QUIZ_SCORE] Когда квиз завершён — проверяем ачивки и засчитываем очки сессии
  // quiz_score обновляется ОДИН РАЗ с итоговым счётом — исключает race condition между ответами
  useEffect(() => {
    if (!done || reviewing) return;
    const perfect = results.length > 0 && results.every(r => r);
    if (!thematicCategoryId) {
      checkAchievements({ type: 'quiz', level, perfect, studyTarget }).catch(() => {});
    }
    const doneUpdates: Parameters<typeof updateMultipleTaskProgress>[0] = [];
    if (score > 0) doneUpdates.push({ type: 'quiz_score', increment: score });
    if (!thematicCategoryId && perfect) {
      doneUpdates.push({ type: 'quiz_perfect', increment: 1 });
      if (level === 'hard') doneUpdates.push({ type: 'quiz_hard_perfect', increment: 1 });
    }
    if (doneUpdates.length > 0) {
      updateMultipleTaskProgress(doneUpdates, { studyTarget }).catch(() => {});
    }
  }, [done, level, results, reviewing, score, studyTarget, thematicCategoryId]);

  useEffect(() => {
    if (!done || reviewing) return;
    let cancelled = false;
    void checkCoachToastNeededWithAnalytics(wrongMistakesRef.current, studyTarget, lang === 'uk' ? 'uk' : 'ru').then((decision) => {
      if (!cancelled && decision.show) setCoachToast(decision);
    });
    return () => { cancelled = true; };
  }, [done, lang, reviewing, studyTarget]);

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
          timerRef.current = null;
          if (!answeredRef.current) {
            answeredRef.current = true;
            // setTimeout чтобы не вызывать setState внутри setState
            setTimeout(() => setShowTimeoutAlert(true), 0);
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

  if (!quizBankAvailable) {
    return <FrenchQuizUnavailable />;
  }

  if (phrases.length === 0) {
    return (
      <ScreenGradient forceFullBleed artBackdrop="quizzes">
        <ContentWrap>
          <View style={{ flex:1, justifyContent:'center', alignItems:'center', paddingHorizontal:24 }}>
            <Text style={{ color:onGradMuted, fontSize: f.body, lineHeight: f.body * 1.35, textAlign:'center' }}>
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
          </View>
        </ContentWrap>
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
        useNativeDriver: QUIZ_ENTRY_ANIMATION_USE_NATIVE_DRIVER,
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
      const mistakeMeta = buildPersonalPlanQuizMistakeMeta(tokenMeta, {
        planQuizId,
        planId,
        planInstanceId,
        planTaskId,
        planDayIndex,
        questionId: current.questionId,
        coverage: planQuizCoverage,
      });
      void recordMistake(
        current.answer,
        current.ru,
        current.lessonNum,
        current.uk,
        'quiz',
        current.es,
        mistakeMeta,
        studyTarget,
      );
      logMistake(
        current.answer,
        current.lessonNum,
        'quiz',
        'wrong_pick',
        mistakeMeta,
        studyTarget,
      );
      wrongMistakesRef.current.push({ phrase: current.answer, ...mistakeMeta });
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
        if (!thematicCategoryId && level === 'hard') updates.push({ type: 'quiz_hard' });
        if (!thematicCategoryId && level === 'easy') updates.push({ type: 'quiz_easy' });
        if (!thematicCategoryId && level === 'medium') updates.push({ type: 'quiz_medium' });
        updateMultipleTaskProgress(updates, { studyTarget });
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
    const completionMedalSource = getQuizCompletionMedalSource(themeMode);
    return (
      <ScreenGradient forceFullBleed artBackdrop="quizzes">
      <View style={{ flex:1 }}>
        <ContentWrap>
        <BouncyScrollView decelerationRate="normal" contentContainerStyle={{ flexGrow:1, justifyContent:'center', alignItems:'center', padding:30 }} showsVerticalScrollIndicator={false}>
          <Image
            source={completionMedalSource}
            contentFit="contain"
            transition={0}
            accessibilityIgnoresInvertColors
            style={{ width: 118, height: 118, marginBottom: 10 }}
          />
          <View style={[{ backgroundColor: isCompassTheme ? COMPASS_RICH.washStrong : `${rankInfo.color}22`, borderRadius: isCompassTheme ? 9 : 12, paddingHorizontal: 18, paddingVertical: 8, borderWidth: 1, borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : `${rankInfo.color}55`, marginBottom:16, overflow: isCompassTheme ? 'hidden' : 'visible' }, isCompassTheme && compassShadow(1)]}>
            <Text style={{ color: isCompassTheme ? COMPASS_RICH.champagne : rankInfo.color, fontSize: f.h2, fontWeight: '800', letterSpacing: 0.5 }}>{rankLabel}</Text>
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
              <View style={[{ backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard, borderRadius: isCompassTheme ? 9 : 14, borderWidth:0.5, borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : t.border, padding:14, width:'100%', flexDirection:'row', alignItems:'center', gap:12, marginBottom:28, overflow: isCompassTheme ? 'hidden' : 'visible' }, isCompassTheme && compassShadow(1)]}>
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
                  <View style={{ height:5, backgroundColor: isCompassTheme ? COMPASS_RICH.void : t.bgSurface, borderRadius:3, overflow:'hidden', marginTop:5 }}>
                    <Animated.View style={{ height:'100%', width: xpBarAnim.interpolate({ inputRange:[0,1], outputRange:['0%','100%'] }), backgroundColor: isCompassTheme ? COMPASS_RICH.champagne : '#D4A017', borderRadius:3 }} />
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
                style={[{ width:'100%', borderWidth:1.5, borderColor: isCompassTheme ? COMPASS_RICH.copper : '#F87171', padding:18, borderRadius: isCompassTheme ? 9 : 14, alignItems:'center', marginBottom:12, backgroundColor: isCompassTheme ? COMPASS_RICH.copperWash : t.bgCard, overflow: isCompassTheme ? 'hidden' : 'visible' }, isCompassTheme && compassShadow(1)]}
                onPress={() => {
                  hapticTap();
                  if (autoAdvanceTimerRef.current) { clearTimeout(autoAdvanceTimerRef.current); autoAdvanceTimerRef.current = null; }
                  if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
                  fadeAnim.setValue(1);
                  setChosen(null); setTyped(''); setTypedOk(null);
                  setReviewQ(wrongPhrases); setRIdx(0); setReviewing(true); setDone(false);
                }}
              >
                <Text style={{ color: isCompassTheme ? COMPASS_RICH.peach : '#F87171', fontSize: f.bodyLg, fontWeight:'600' }}>
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
            style={[{ width:'100%', borderWidth:1.5, borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : levelAccent, padding:18, borderRadius: isCompassTheme ? 9 : 14, alignItems:'center', marginBottom:12, backgroundColor: isCompassTheme ? COMPASS_RICH.washStrong : t.bgCard, overflow: isCompassTheme ? 'hidden' : 'visible' }, isCompassTheme && compassShadow(1)]}
            onPress={async () => {
              hapticTap();
              // Отменяем все pending таймеры от предыдущей игры
              if (autoAdvanceTimerRef.current) { clearTimeout(autoAdvanceTimerRef.current); autoAdvanceTimerRef.current = null; }
              if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
              if (!DEV_MODE && !isPremium) {
                const nextState = await consumeFreeDailyQuizStart();
                if (!nextState) {
                  router.push({ pathname: '/premium_modal', params: { context: 'quiz_limit' } } as any);
                  return;
                }
              }
              fadeAnim.stopAnimation();
              fadeAnim.setValue(1);
              // Перечитываем актуальный XP из storage чтобы не сбрасывать заработанный
              AsyncStorage.getItem('user_total_xp').then(v => { setTotalXP(parseInt(v || '0') || 0); }).catch(() => {});
              setIdx(0); setChosen(null); setScore(0); setEarnedXP(0);
              setStreak(0); streakRef.current = 0;
              setResults([]); setDone(false); setReviewing(false);
              setCoachToast(null);
              wrongMistakesRef.current = [];
              setTyped(''); setTypedOk(null);
              xpAnimStarted.current = false;
              quizCompletedRef.current = false;
              xpFlyY.setValue(0); xpFlyOpacity.setValue(1);
              setRetryCount(c => c + 1); // принудительно перезагружает вопросы
            }}
          >
            <Text style={{ color: isCompassTheme ? COMPASS_RICH.champagne : levelAccent, fontSize: f.bodyLg, fontWeight:'600' }}>{s.quizzes.again}</Text>
          </TouchableOpacity>
          <TapScale onPress={() => { hapticTap(); onBack(); }} withHaptic={false} style={{ padding:14 }}>
            <Text style={{ color:t.textMuted, fontSize: f.body }}>{s.quizzes.back}</Text>
          </TapScale>
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
        </BouncyScrollView>
        </ContentWrap>
        {showBonus && (
          <BonusXPCard
            bonusXP={bonusXP}
            onDismiss={() => setShowBonus(false)}
            position="center"
            duration={2000}
          />
        )}
        {coachToast?.show && (
          <CoachToast
            category={coachToast.category}
            labelRu={coachToast.labelRu}
            labelUk={coachToast.labelUk}
            labelEs={coachToast.labelEs}
            labelPtBr={coachToast.labelPtBr}
            labelVi={coachToast.labelVi}
            labelId={coachToast.labelId}
            labelTr={coachToast.labelTr}
            labelPl={coachToast.labelPl}
            mistakeCount={coachToast.mistakeCount}
            weaknessScore={coachToast.weaknessScore}
            priorityScore={coachToast.priorityScore}
            recoveryScore={coachToast.recoveryScore}
            focusWords={coachToast.focusWords}
            microDiagnosisId={coachToast.microDiagnosisId}
            microLabelRu={coachToast.microLabelRu}
            microLabelUk={coachToast.microLabelUk}
            microLabelEs={coachToast.microLabelEs}
            microLabelPtBr={coachToast.microLabelPtBr}
            microLabelVi={coachToast.microLabelVi}
            microLabelId={coachToast.microLabelId}
            microLabelTr={coachToast.microLabelTr}
            microLabelPl={coachToast.microLabelPl}
            diagnosisEvidenceCount={coachToast.diagnosisEvidenceCount}
            onDismiss={() => setCoachToast(null)}
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
          <TapScale onPress={() => onBack()}>
            <Ionicons name="chevron-back" size={28} color={onGradPrimary}/>
          </TapScale>
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
          <BouncyScrollView
            style={{ flex:1 }}
            decelerationRate="normal"
            contentContainerStyle={planQuizId
              ? { flexGrow: 1, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, justifyContent: 'space-between', overflow: 'hidden' }
              : { paddingHorizontal:20, paddingTop:20, paddingBottom:40 }}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={!planQuizId}
            showsVerticalScrollIndicator={!planQuizId}
            persistentScrollbar={!planQuizId}
          >
          <Text style={{ color:onGradMuted, fontSize: f.caption, marginBottom: planQuizId ? 8 : 14 }}>
            {(reviewing?rIdx:idx)+1} / {reviewing?reviewQ.length:phrases.length}
          </Text>

          {planQuizTaskCopy && !reviewing && (
            <View
              testID="personal-plan-quiz-instruction"
              style={{
                borderWidth: 1,
                borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : `${levelAccent}55`,
                backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : `${levelAccent}14`,
                borderRadius: isCompassTheme ? 9 : 14,
                padding: planQuizId ? 10 : 14,
                marginBottom: planQuizId ? 10 : 16,
                overflow: isCompassTheme ? 'hidden' : 'visible',
              }}
            >
              <Text style={{ color: levelAccent, fontSize: f.label, fontWeight: '900', marginBottom: planQuizId ? 3 : 5 }}>
                {planQuizTaskCopy.title}
              </Text>
              <Text
                numberOfLines={planQuizId ? 2 : undefined}
                style={{ color: onGradMuted, fontSize: planQuizId ? f.caption : f.sub, lineHeight: (planQuizId ? f.caption : f.sub) * 1.35, fontWeight: '700' }}
              >
                {planQuizTaskCopy.body}
              </Text>
            </View>
          )}

          {/* ВОПРОС */}
          <Text
            numberOfLines={planQuizId ? 3 : undefined}
            adjustsFontSizeToFit={Boolean(planQuizId)}
            style={{ color:onGradPrimary, fontSize: planQuizId ? f.h2 + 2 : f.h2 + 6, fontWeight:'500', marginBottom: planQuizId ? 10 : 12, lineHeight: planQuizId ? 28 : 32 }}
          >
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
            <Animated.View style={[{
              opacity: insertAnim,
              transform: [{ scale: insertScale }],
              backgroundColor: isCompassTheme ? (isRight===true||typedOk===true ? COMPASS_RICH.washStrong : COMPASS_RICH.copperWash) : isRight===true||typedOk===true ? t.correctBg : t.wrongBg,
              borderRadius: isCompassTheme ? 9 : 14,
              padding: planQuizId ? 10 : 16,
              marginBottom: planQuizId ? 10 : 16,
              borderLeftWidth: 3,
              borderLeftColor: isCompassTheme ? (isRight===true||typedOk===true ? COMPASS_RICH.champagne : COMPASS_RICH.peach) : isRight===true||typedOk===true ? t.correct : t.wrong,
              borderWidth: isCompassTheme ? StyleSheet.hairlineWidth : 0,
              borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : 'transparent',
              overflow: isCompassTheme ? 'hidden' : 'visible',
            }, isCompassTheme && compassShadow(1)]}>
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
                <Text
                  numberOfLines={planQuizId ? 2 : undefined}
                  adjustsFontSizeToFit={Boolean(planQuizId)}
                  style={{ color: isLightTheme ? onGradPrimary : displayColor, fontSize: planQuizId ? f.bodyLg : f.h2 + 2, fontWeight: '600', lineHeight: (planQuizId ? f.bodyLg : f.h2 + 2) * 1.35, flex: 1 }}
                >
                  {shownCorrectEnglish}
                </Text>
                <View onStartShouldSetResponder={() => true}>
                  <AddToFlashcard en={shownCorrectEnglish} ru={current.ru} uk={current.uk} es={current.es} source="lesson" sourceId="quiz" studyTarget={studyTarget} />
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
            const explanationIdx = quizExplanationIndexForAnswer(current, chosen, typedOk);
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
              backgroundColor: isCompassTheme
                  ? COMPASS_RICH.charcoalRaised
                  : correct
                  ? (isLightTheme ? '#D6EAFF' : 'rgba(74,144,255,0.13)')
                  : (isLightTheme ? '#FFF3C4' : 'rgba(212,160,23,0.13)'),
                borderRadius: isCompassTheme ? 9 : 14,
                padding: planQuizId ? 10 : 16,
                marginBottom: planQuizId ? 10 : 16,
                borderLeftWidth: 4,
                borderLeftColor: isCompassTheme ? COMPASS_RICH.champagne : correct ? '#1565C0' : '#F59E0B',
                borderWidth: isCompassTheme ? StyleSheet.hairlineWidth : 0,
                borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : 'transparent',
                overflow: isCompassTheme ? 'hidden' : 'visible',
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
                <Text
                  numberOfLines={planQuizId ? 2 : undefined}
                  style={{ color: isLightTheme ? (correct ? '#0D47A1' : '#78350F') : t.textPrimary, fontSize: planQuizId ? f.sub : f.body, lineHeight: (planQuizId ? f.sub : f.body) * 1.42 }}
                >
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
              style={[{
                marginTop: 16,
                backgroundColor: isCompassTheme ? COMPASS_RICH.washStrong : t.bgSurface,
                borderRadius: isCompassTheme ? 9 : 14,
                padding: 16,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : t.border,
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
                overflow: isCompassTheme ? 'hidden' : 'visible',
              }, isCompassTheme && compassShadow(1)]}
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
                  style={[{ backgroundColor: isCompassTheme ? COMPASS_RICH.washStrong : t.bgSurface, borderRadius: isCompassTheme ? 9 : 14, padding:18, alignItems:'center', borderWidth:0.5, borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : t.border, overflow: isCompassTheme ? 'hidden' : 'visible' }, isCompassTheme && compassShadow(1)]}
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
              <View style={{ gap: planQuizId ? 8 : 10 }}>
                {(current.choices || []).map((ch, ci) => {
                  const on = flashKey === `${ci}`;
                  return (
                  <DuoPressable
                    key={ci}
                    edgeHeight={5}
                    withHaptic={false}
                    edgeColor={on ? t.accent : (isCompassTheme ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.30)')}
                    style={[{
                      backgroundColor: on ? t.accent : (isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard),
                      borderWidth: on ? 1.5 : 1,
                      borderColor: on ? t.accent : (isCompassTheme ? COMPASS_RICH.hairlineQuiet : t.border),
                      borderRadius: isCompassTheme ? 9 : 14,
                      padding: planQuizId ? 12 : 18,
                      minHeight: planQuizId ? 52 : undefined,
                      overflow: isCompassTheme ? 'hidden' : 'visible',
                    }, isCompassTheme && compassShadow(1)]}
                    onPress={() => { flash(`${ci}`); requestAnimationFrame(() => { void hapticTap(); }); handleChoice(ci); }}
                  >
                    {isCompassTheme && !on ? <CompassDepthSurface radius={9} quiet /> : null}
                    <Text
                      numberOfLines={planQuizId ? 2 : undefined}
                      adjustsFontSizeToFit={Boolean(planQuizId)}
                      style={{ color: on ? (t.correctText ?? '#fff') : t.textPrimary, fontSize: planQuizId ? f.bodyLg : f.h2 + 2, lineHeight: (planQuizId ? f.bodyLg : f.h2 + 2) * 1.22, fontWeight: on ? '700' : '600' }}
                    >{ch}</Text>
                  </DuoPressable>
                  );
                })}
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
          </BouncyScrollView>
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
      onBeforeOpenPremium={() => setShowNoEnergyModal(false)}
      paywallContext="no_energy"
    />

    </ScreenGradient>
    </Animated.View>
  );
}

function FrenchQuizUnavailable() {
  const router = useRouter();
  const { lang } = useLang();
  const { theme: t, f } = useTheme();
  const copy = frenchQuizGateCopy(lang);

  return (
    <ScreenGradient forceFullBleed artBackdrop="quizzes">
      <View style={{ flex: 1 }}>
        <ContentWrap>
          <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
            <View style={{
              borderRadius: 18,
              borderWidth: 1,
              borderColor: t.border,
              backgroundColor: t.bgCard,
              padding: 18,
              gap: 12,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="lock-closed-outline" size={22} color={t.accent} />
                <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900', flex: 1 }}>
                  {copy.title}
                </Text>
              </View>
              <Text style={{ color: t.textMuted, fontSize: f.body, lineHeight: f.body * 1.35 }}>
                {copy.body}
              </Text>
              <TouchableOpacity
                activeOpacity={0.86}
                onPress={() => { hapticTap(); router.push('/(tabs)/lessons' as any); }}
                style={{
                  minHeight: 46,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: t.accent,
                }}
              >
                <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '900' }}>
                  {copy.cta}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ContentWrap>
      </View>
    </ScreenGradient>
  );
}

// ── КОРНЕВОЙ КОМПОНЕНТ ───────────────────────────────────────────────────────
export default function QuizzesScreen() {
  const {
    planQuizId: planQuizIdParam,
    planTaskId: planTaskIdParam,
    planInstanceId: planInstanceIdParam,
    planId: planIdParam,
    planDayIndex: planDayIndexParam,
    planQuizLevel: planQuizLevelParam,
    planQuizThematicCategoryId: planQuizThematicCategoryIdParam,
  } = useLocalSearchParams<{
    planQuizId?: string | string[];
    planTaskId?: string | string[];
    planInstanceId?: string | string[];
    planId?: string | string[];
    planDayIndex?: string | string[];
    planQuizLevel?: string | string[];
    planQuizThematicCategoryId?: string | string[];
  }>();
  const planQuizId = Array.isArray(planQuizIdParam) ? planQuizIdParam[0] : planQuizIdParam;
  const planQuizTaskId = Array.isArray(planTaskIdParam) ? planTaskIdParam[0] : planTaskIdParam;
  const planQuizInstanceId = Array.isArray(planInstanceIdParam) ? planInstanceIdParam[0] : planInstanceIdParam;
  const planQuizPlanId = Array.isArray(planIdParam) ? planIdParam[0] : planIdParam;
  const planQuizDayIndexRaw = Array.isArray(planDayIndexParam) ? planDayIndexParam[0] : planDayIndexParam;
  const planQuizDayIndex = parseInt(planQuizDayIndexRaw ?? '1', 10) || 1;
  const planQuizLevelRaw = Array.isArray(planQuizLevelParam) ? planQuizLevelParam[0] : planQuizLevelParam;
  const planQuizLevel: Level = planQuizLevelRaw === 'medium' || planQuizLevelRaw === 'hard'
    ? planQuizLevelRaw
    : 'easy';
  const planQuizThematicCategoryId = Array.isArray(planQuizThematicCategoryIdParam)
    ? planQuizThematicCategoryIdParam[0]
    : planQuizThematicCategoryIdParam;
  const planQuizStartSelection: QuizMenuSelection = (planQuizThematicCategoryId || planQuizLevel) as QuizMenuSelection;
  const [selection, setSelection] = useState<QuizMenuSelection|null>(null);
  const [gameKey, setGameKey] = useState(0);
  const [e2eInjectResults, setE2eInjectResults] = useState(false);
  const fromTaskRef = useRef(false);
  const { activeIdx } = useTabNav();
  const router = useRouter();
  const { studyTarget } = useStudyTarget();
  const frenchQuizBlocked = !quizContentAvailableForTarget(studyTarget);
  const { hasPremiumAccess: isPremium } = usePremium();
  const { energy, bonusEnergy, isUnlimited } = useEnergy();
  const energySnapRef = useRef({ e: 0, b: 0, u: false });
  energySnapRef.current = { e: energy, b: bonusEnergy, u: isUnlimited };
  const QUIZZES_TAB_IDX = 2;
  const selectedLevel: Level = isLevelSelection(selection) ? selection : 'easy';
  const selectedThematicCategoryId = selection && !isLevelSelection(selection)
    ? selection
    : undefined;

  // Блокируем свайп между вкладками пока квиз активен
  useEffect(() => {
    tabSwipeLock.blocked = selection !== null;
    return () => { tabSwipeLock.blocked = false; };
  }, [selection]);

  useEffect(() => {
    if (frenchQuizBlocked) {
      setSelection(null);
      setE2eInjectResults(false);
      void AsyncStorage.removeItem(QUIZ_E2E_OPEN_RESULTS_KEY);
    }
  }, [frenchQuizBlocked]);

  // Завершаем квиз если пользователь переключился на другую вкладку
  const prevActiveIdx = useRef(activeIdx);
  useEffect(() => {
    if (prevActiveIdx.current === QUIZZES_TAB_IDX && activeIdx !== QUIZZES_TAB_IDX && selection !== null) {
      setSelection(null);
      setGameKey(k => k + 1);
    }
    prevActiveIdx.current = activeIdx;
  }, [activeIdx, selection]);

  // quiz_nav_level (задания) или E2E-флаг — читаем при каждом фокусе: hidden route может быть уже смонтирован.
  useFocusEffect(useCallback(() => {
    let cancelled = false;
    (async () => {
      try {
        if (planQuizId) {
          if (!cancelled) {
            await new Promise(r => setTimeout(r, 120));
            if (cancelled) return;
            fromTaskRef.current = true;
            setE2eInjectResults(false);
            setGameKey(k => k + 1);
            setSelection(planQuizStartSelection);
          }
          return;
        }
        const navKey = quizNavLevelKey(studyTarget);
        const nav = await AsyncStorage.getItem(navKey);
        if (nav === 'hard' || nav === 'medium' || nav === 'easy') {
          if (!cancelled) {
            await new Promise(r => setTimeout(r, 200));
            if (cancelled) return;
            if (frenchQuizBlocked) {
              await AsyncStorage.removeItem(navKey);
              return;
            }
            if (!DEV_MODE && !isPremium && !(await hasFreeDailyQuizzesLeft())) {
              await AsyncStorage.removeItem(navKey);
              router.push({ pathname: '/premium_modal', params: { context: 'quiz_limit' } } as any);
              return;
            }
            const snap = energySnapRef.current;
            if (!snap.u && snap.e + snap.b <= 0) {
              await AsyncStorage.removeItem(navKey);
              emitAppEvent('action_toast', {
                type: 'error',
                messageRu: 'Недостаточно энергии для вызова.',
                messageUk: 'Недостатньо енергії для квізу.',
                messageEs: 'No tienes energía suficiente para el cuestionario.',
              });
              return;
            }
            if (!DEV_MODE && !isPremium) {
              const nextState = await consumeFreeDailyQuizStart();
              if (!nextState) {
                await AsyncStorage.removeItem(navKey);
                router.push({ pathname: '/premium_modal', params: { context: 'quiz_limit' } } as any);
                return;
              }
            }
            await AsyncStorage.removeItem(navKey);
            fromTaskRef.current = true;
            setE2eInjectResults(false);
            setGameKey(k => k + 1);
            setSelection(nav as Level);
          }
        } else {
          const e2e = await AsyncStorage.getItem(QUIZ_E2E_OPEN_RESULTS_KEY);
          if (e2e === '1') {
            await AsyncStorage.removeItem(QUIZ_E2E_OPEN_RESULTS_KEY);
            if (frenchQuizBlocked) return;
            if (!cancelled) {
              setE2eInjectResults(true);
              setGameKey(k => k + 1);
              setSelection('easy');
            }
          }
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [frenchQuizBlocked, isPremium, planQuizId, planQuizStartSelection, router, studyTarget]));

  if (frenchQuizBlocked) {
    return <FrenchQuizUnavailable />;
  }

  return (
    <View style={{ flex: 1 }}>
      {selection
        ? <QuizGame key={`${gameKey}:${selection}:${planQuizId ?? 'base'}`} level={selectedLevel} thematicCategoryId={selectedThematicCategoryId} e2eInjectResults={e2eInjectResults} planQuizId={planQuizId} planTaskId={planQuizTaskId} planInstanceId={planQuizInstanceId} planId={planQuizPlanId} planDayIndex={planQuizDayIndex} onBack={() => {
            if (fromTaskRef.current) {
              fromTaskRef.current = false;
              setE2eInjectResults(false);
              safeRouterBack(router, (planQuizId ? '/personal_plan' : '/(tabs)/home') as any);
              return;
            }
            setE2eInjectResults(false);
            setSelection(null); setGameKey(k => k + 1);
          }}/>
        : <LevelSelect onSelect={(nextSelection) => {
            setSelection(nextSelection);
            try {
              const eventLevel = isLevelSelection(nextSelection) ? nextSelection : `thematic:${nextSelection}`;
              logQuizLevelSelected(eventLevel);
              if (isLevelSelection(nextSelection)) trackQuizLevel(nextSelection, studyTarget).catch(() => {});
            } catch {
              // Quiz opening must not depend on analytics/storage side effects.
            }
          }}/>
      }
    </View>
  );
}
