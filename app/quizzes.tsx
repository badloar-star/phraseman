import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { usePremium } from '../components/PremiumContext';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Easing,
    KeyboardAvoidingView,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';

import AddToFlashcard from '../components/AddToFlashcard';
import ContentWrap from '../components/ContentWrap';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { triLang, type PlannedInterfaceLang } from '../constants/i18n';
import { isCorrectAnswer } from '../constants/contractions';
import { getXPProgress, screenTextOnGradient } from '../constants/theme';
import { MOTION_DURATION, MOTION_SCALE, MOTION_SPRING } from '../constants/motion';
import { checkAchievements } from './achievements';
import { logEnergyLimitHit } from './firebase';
import { trackEnergyHit } from './user_stats';
import { DEV_MODE, STORE_URL } from './config';
import { hapticError, hapticLightImpact, hapticTap } from '../hooks/use-haptics';
import { updateMultipleTaskProgress } from './daily_tasks';
import { DebugLogger } from './debug-logger';
import { useEnergy } from '../components/EnergyContext';
import EnergyBar from '../components/EnergyBar';
import NoEnergyModal from '../components/NoEnergyModal';
import CoachToast from '../components/CoachToast';
import { navigateAfterModalClose } from './safe_modal_navigation';
import PremiumCard from '../components/PremiumCard';
import QuizTimeoutModal from '../components/QuizTimeoutModal';
import { pointsForAnswer } from './hall_of_fame_utils';
import { useAudio } from '../hooks/use-audio';
import { isQuizChoiceCorrect, quizPrimaryCorrectIndex, type QuizPhrase } from './quiz_data';
import { getQuizPhrasesLoaded } from './quiz_phrases_loader';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, UserSettings as Settings } from './settings_edu';
import { useTabNav } from './TabContext';
import { calculateRewardWithBonus } from './variable_reward_system';
import { registerXP } from './xp_manager';
import { recordMistake } from './active_recall';
import { logMistake } from './mistake_log';
import { resolvePhraseMistakeToken } from './mistake_token_resolver';
import { checkCoachToastNeededWithAnalytics, type CoachToastDecision } from './coach_toast_trigger';
import type { PhraseMistakeInput } from './phrase_analytics';
import ReportErrorButton from '../components/ReportErrorButton';
import { emitAppEvent } from './events';
import { trackActivity, trackFeatureBlocked, trackFeatureError, trackFeatureStart, trackFeatureSuccess } from './app_activity';
import { useEffectivePlatformOS } from './platform_ui_preview';
import { LEVEL_CONFIG, Level, QUIZ_LEVEL_CARD_BACKGROUNDS, QUIZ_LEVEL_LOGOS, THEME_PALETTES, THEME_TEXT } from './quizzes/constants';
import { diffWords } from './quizzes/diff';
import { computeNextQuizProgression, getQuizTimerSeconds } from './quizzes/progression';
import {
  FREE_DAILY_QUIZ_LIMIT,
  getFreeDailyQuizState,
  hasFreeDailyQuizzesLeft,
  incrementFreeDailyQuizCount,
  type QuizDailyLimitState,
} from './quiz_daily_limit';
import { buildQuizShareMessage, quizShareMessageLang } from './quizzes/results';
import QuizResultView from './quizzes/result_view';
import { buildQuizRestartState, buildReviewRetryState, clearQuizPendingTimers } from './quizzes/session';
import { MultBadge, StreakBreak } from './quizzes/ui';

// Используем QuizPhrase из quiz_data.ts
type Phrase = QuizPhrase;

const quizSourceTextForPlanned = (phrase: Phrase, locale: PlannedInterfaceLang): string =>
  phrase.sourceLocale === locale ? phrase.sourceText ?? '' : '';

const quizSourceExplanationsForPlanned = (phrase: Phrase, locale: PlannedInterfaceLang): string[] | undefined =>
  phrase.sourceLocale === locale && phrase.sourceExplanations?.length ? phrase.sourceExplanations : undefined;

const isPlannedInterfaceLang = (value: unknown): value is PlannedInterfaceLang =>
  value === 'pt-BR' || value === 'vi' || value === 'id' || value === 'tr' || value === 'pl';

// Theme and level constants are extracted to app/quizzes/constants.ts

// Тип фразы для квиза — используем QuizPhrase из quiz_data
// level передаётся из QuizGame



// ── ВЫБОР УРОВНЯ ────────────────────────────────────────────────────────────
function LevelSelect({ onSelect }: { onSelect:(l:Level)=>void }) {
  const { goHome } = useTabNav();
  const { theme:t , f, themeMode } = useTheme();
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const { s, lang } = useLang();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPremium } = usePremium();
  const { energy, bonusEnergy, isUnlimited: entryEnergyUnlimited } = useEnergy();
  const [selected, setSelected] = useState<Level | null>(null);
  const [freeQuizState, setFreeQuizState] = useState<QuizDailyLimitState>({
    date: '',
    count: 0,
    limit: FREE_DAILY_QUIZ_LIMIT,
    left: FREE_DAILY_QUIZ_LIMIT,
    exhausted: false,
  });
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

  useEffect(() => {
    let cancelled = false;
    void getFreeDailyQuizState().then((state) => {
      if (!cancelled) setFreeQuizState(state);
    });
    return () => { cancelled = true; };
  }, []);


  const handleStart = (lv: Level) => {
    void trackFeatureStart('quiz', 'start', { level: lv }, 'quizzes');
    if (!entryEnergyUnlimited && energy + bonusEnergy <= 0) {
      void trackFeatureBlocked('quiz', 'start', 'no_energy', { level: lv, energy, bonusEnergy }, 'quizzes');
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
    <ScreenGradient artBackdrop="quizzes">
    <View style={{ flex:1 }}>
      <ContentWrap>
      <View style={{ flexDirection:'row', alignItems:'center', padding:16, paddingTop: 16 + insets.top, borderBottomWidth:0.5, borderBottomColor:t.border }}>
        <TouchableOpacity
          style={{ width:38, height:38, borderRadius:19, backgroundColor:t.bgCard, borderWidth:0.5, borderColor:t.border, justifyContent:'center', alignItems:'center' }}
          onPress={() => { goHome(); router.replace('/(tabs)/home' as any); }}
        >
          <Ionicons name="chevron-back" size={22} color={t.textPrimary}/>
        </TouchableOpacity>
        <Text style={{ color:sx.primary, fontSize: f.numMd, fontWeight:'700', marginLeft:12, flex:1 }} adjustsFontSizeToFit numberOfLines={1}>
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
                  if (locked) {
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
                  <ExpoImage
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
                    <ExpoImage
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
          <View style={{ marginTop: 8, borderRadius: 14, borderWidth: 1, borderColor: freeQuizState.exhausted ? t.border : t.accent + '66', backgroundColor: freeQuizState.exhausted ? t.bgCard : t.accentBg, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name={freeQuizState.exhausted ? 'lock-closed' : 'flash-outline'} size={18} color={freeQuizState.exhausted ? t.textMuted : t.accent} />
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
        visible={showEntryNoEnergy}
        onClose={() => setShowEntryNoEnergy(false)}
        onBackHome={() => {
          navigateAfterModalClose(
            () => setShowEntryNoEnergy(false),
            () => {
              goHome();
              router.replace('/(tabs)/home' as any);
            },
          );
        }}
        paywallContext="no_energy"
      />
    </View>
    </ScreenGradient>
  );
}

// ── КВИЗ ────────────────────────────────────────────────────────────────────
function QuizGame({ level, onBack }: { level:Level; onBack:()=>void }) {
  const effectiveOs = useEffectivePlatformOS();
  const { theme:t , f, themeMode } = useTheme();
  const { s, lang } = useLang();
  const { activeIdx } = useTabNav();
  const router = useRouter();
  const { isPremium } = usePremium();
  const insets = useSafeAreaInsets();
  const isLightTheme = false;
  const onGradPrimary = t.textPrimary;
  const onGradMuted = t.textMuted;
  const onGradSecondary = t.textSecond;
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
  const { speak: speakAudio, stop: stopAudio } = useAudio();
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
  const [coachToast, setCoachToast] = useState<CoachToastDecision | null>(null);
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
  const freeQuizCompletionMarkedRef = useRef(false);
  const quizSessionCountedRef = useRef(false);
  const wrongMistakesRef = useRef<PhraseMistakeInput[]>([]);

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
    const total = results.length;
    const right = results.filter(Boolean).length;
    const perfect = results.length > 0 && results.every(r => r);
    void trackFeatureSuccess('quiz', 'complete', {
      level,
      score,
      total,
      right,
      pct: total > 0 ? Math.round(right / total * 100) : 0,
      perfect,
    }, 'quizzes');
    if (!DEV_MODE && !isPremium && !freeQuizCompletionMarkedRef.current) {
      freeQuizCompletionMarkedRef.current = true;
      void incrementFreeDailyQuizCount();
    }
    if (!quizSessionCountedRef.current) {
      quizSessionCountedRef.current = true;
      void (async () => {
        const totalKey = 'achievement_quiz_total_count';
        const prev = parseInt((await AsyncStorage.getItem(totalKey)) ?? '0', 10) || 0;
        const next = prev + 1;
        await AsyncStorage.setItem(totalKey, String(next));
        await checkAchievements({ type: 'quiz_session_count', count: next });
      })();
    }
    checkAchievements({ type: 'quiz', level, perfect }).catch(() => {});
    const doneUpdates: Parameters<typeof updateMultipleTaskProgress>[0] = [];
    if (score > 0) doneUpdates.push({ type: 'quiz_score', increment: score });
    if (perfect) {
      doneUpdates.push({ type: 'quiz_perfect', increment: 1 });
      if (level === 'hard') doneUpdates.push({ type: 'quiz_hard_perfect', increment: 1 });
    }
    if (doneUpdates.length > 0) updateMultipleTaskProgress(doneUpdates).catch(() => {});
  }, [done, isPremium, level, results, score]);

  useEffect(() => {
    if (!done || reviewing) return;
    let cancelled = false;
    void checkCoachToastNeededWithAnalytics(wrongMistakesRef.current).then((decision) => {
      if (!cancelled && decision.show) setCoachToast(decision);
    });
    return () => { cancelled = true; };
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
        void trackFeatureError('quiz', 'complete_rewards', error, { level, score, results: results.length }, 'quizzes');
        DebugLogger.error('quizzes.tsx:processDoneQuiz', error, 'warning');
      }
    };

    processDoneQuiz();
  }, [done, score, results, phrases.length, lang]);

  const current = reviewing ? reviewQ[rIdx] : (idx < phrases.length ? phrases[idx] : undefined);

  useEffect(() => {
    if (phrases.length === 0) {
      void trackFeatureBlocked('quiz', 'load_questions', 'empty_phrases', { level }, 'quizzes');
    }
  }, [level, phrases.length]);

  if (phrases.length === 0) {
    return (
      <ScreenGradient artBackdrop="quizzes">
      <View style={{ flex:1, justifyContent:'center', alignItems:'center', paddingHorizontal: 24 }}>
        <ContentWrap>
        <Text style={{ fontSize: 42, marginBottom: 10 }}>📭</Text>
        <Text style={{ color:onGradPrimary, fontSize: f.h2, fontWeight: '700', textAlign: 'center' }}>
          {triLang(lang, {
  ru: 'Вопросы временно недоступны',
  uk: 'Питання тимчасово недоступні',
  es: 'Las preguntas no están disponibles',
  "pt-BR": 'As perguntas estão indisponíveis',
  vi: 'Câu hỏi tạm thời chưa khả dụng',
  id: 'Pertanyaan sementara tidak tersedia',
  tr: 'Sorular şu anda kullanılamıyor',
  pl: 'Pytania są chwilowo niedostępne',
})}
        </Text>
        <Text style={{ color:onGradMuted, fontSize: f.body, marginTop: 10, textAlign: 'center' }}>
          {triLang(lang, {
  ru: 'Попробуй снова или вернись позже.',
  uk: 'Спробуй ще раз або повернись пізніше.',
  es: 'Vuelve a intentarlo más tarde.',
  "pt-BR": 'Tente novamente ou volte mais tarde.',
  vi: 'Hãy thử lại hoặc quay lại sau.',
  id: 'Coba lagi atau kembali nanti.',
  tr: 'Tekrar dene veya daha sonra gel.',
  pl: 'Spróbuj ponownie albo wróć później.',
})}
        </Text>
        <TouchableOpacity
          onPress={() => setRetryCount(v => v + 1)}
          style={{ marginTop: 18, backgroundColor: t.accent, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 12, alignSelf: 'center' }}
        >
          <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '700' }}>
            {triLang(lang, {
  ru: 'Повторить',
  uk: 'Повторити',
  es: 'Reintentar',
  "pt-BR": 'Tentar de novo',
  vi: 'Thử lại',
  id: 'Coba lagi',
  tr: 'Tekrar dene',
  pl: 'Spróbuj ponownie',
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
  "pt-BR": 'Voltar ao início',
  vi: 'Quay lại trang chủ',
  id: 'Kembali ke beranda',
  tr: 'Ana sayfaya dön',
  pl: 'Wróć na stronę główną',
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
      <ScreenGradient artBackdrop="quizzes">
      <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
        <ContentWrap>
        <Text style={{ color:t.textMuted, fontSize: f.body }} />
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

  const afterAnswer = async (isRight: boolean, userAnswer?: string, isHardTyped = false) => {
    const nr = reviewing ? results : [...results, isRight];
    if (!reviewing) { resultsRef.current = nr; setResults(nr); }

    if (!isRight && settings.haptics) {
      void hapticError();
    }

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
      wrongMistakesRef.current.push(tokenMeta ? { phrase: current.answer, ...tokenMeta } : current.answer);
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
    afterAnswer(isQuizChoiceCorrect(ci, current.correct), current.choices[ci]);
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
    afterAnswer(ok, typed, true);
    setTimeout(() => setNextReady(true), 500);
  };

  // ── ФИНАЛЬНЫЙ ЭКРАН ──────────────────────────────────────────────────────
  if (done) {
    return (
      <View style={{ flex: 1 }}>
        <QuizResultView
          phrases={phrases}
          results={results}
          score={score}
          bonusXP={bonusXP}
          totalXP={totalXP}
          accentColor={levelAccent}
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
            setCoachToast(null);
          }}
          onRestart={() => {
            clearQuizPendingTimers(autoAdvanceTimerRef, timerRef);
            if (!DEV_MODE && !isPremium) {
              void hasFreeDailyQuizzesLeft().then((hasLeft) => {
                if (hasLeft) return;
                router.push({ pathname: '/premium_modal', params: { context: 'quiz_limit' } } as any);
              });
              return;
            }
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
            setCoachToast(null);
            wrongMistakesRef.current = [];
            freeQuizCompletionMarkedRef.current = false;
            xpAnimStarted.current = false;
            xpFlyY.setValue(0);
            xpFlyOpacity.setValue(1);
            setRetryCount(c => c + 1);
          }}
          onBack={onBack}
          onShare={async (right, total, pct, rankIcon) => {
            const msg = buildQuizShareMessage(quizShareMessageLang(lang), right, total, pct, rankIcon, STORE_URL);
            await Share.share({ message: msg }).catch(() => {});
          }}
          onHome={() => router.replace('/(tabs)/home' as any)}
        />
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
    <ScreenGradient artBackdrop="quizzes">
    <View style={{ flex:1 }}>
      <ContentWrap>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={effectiveOs === 'ios' ? 'padding' : 'height'}>

        {/* ХЕДЕР */}
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:15, paddingTop: 15 + insets.top }}>
          <TouchableOpacity onPress={onBack}>
            <Ionicons name="chevron-back" size={28} color={onGradPrimary}/>
          </TouchableOpacity>
          <Text style={{ color: isLightTheme ? (level === 'easy' ? '#16803C' : level === 'medium' ? '#C2410C' : '#6D28D9') : levelAccent, fontSize: f.body, fontWeight:'700', flex:1, textAlign:'center' }} numberOfLines={1} adjustsFontSizeToFit>
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
                <Text style={{ color: timeLeft <= 5 ? t.wrong : onGradSecondary, fontWeight: '700', fontSize: f.label }}>
                  {timeLeft}
                </Text>
              </View>
            )}
            <MultBadge streak={streak} t={t} f={f}/>
            <StreakBreak show={showBreak} old={prevStr} t={t} f={f}/>
            <View style={{ flexDirection:'row', alignItems:'center', gap:3 }}>
              <Ionicons name="star" size={13} color={onGradSecondary}/>
              <Text style={{ color:onGradSecondary, fontWeight:'600', fontSize: f.body }}>{score}</Text>
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

        <Animated.View style={{ flex:1, opacity:fadeAnim }}>
          <ScrollView style={{ flex:1 }} contentContainerStyle={{ paddingHorizontal:20, paddingTop:20, paddingBottom:40 }} keyboardShouldPersistTaps="handled">
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
  uk: 'Вірно:',
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
                <View style={{ flex: 1 }}>
                  <Text style={{ color: isLightTheme ? onGradPrimary : displayColor, fontSize: f.h2 + 2, fontWeight: '600', lineHeight: (f.h2 + 2) * 1.4 }}>
                    {shownCorrectEnglish}
                  </Text>
                </View>
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
              textColor={onGradMuted}
            />
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
                  placeholder={triLang(lang, {
  ru: 'Введите ответ...',
  uk: 'Введіть відповідь...',
  es: 'Escribe tu respuesta...',
  "pt-BR": 'Digite sua resposta...',
  vi: 'Nhập câu trả lời...',
  id: 'Ketik jawabanmu...',
  tr: 'Cevabını yaz...',
  pl: 'Wpisz odpowiedź...',
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
  "pt-BR": '💡 Difícil digitar manualmente? Você pode desativar o teclado.',
  vi: '💡 Khó nhập thủ công? Bạn có thể tắt bàn phím.',
  id: '💡 Sulit mengetik manual? Kamu bisa mematikan keyboard.',
  tr: '💡 Elle yazmak zor mu? Klavyeyi kapatabilirsin.',
  pl: '💡 Trudno wpisywać ręcznie? Możesz wyłączyć klawiaturę.',
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
      onClose={() => {
        navigateAfterModalClose(
          () => setShowNoEnergyModal(false),
          () => router.back(),
        );
      }}
      onBeforeOpenPremium={() => setShowNoEnergyModal(false)}
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
  const { isPremium } = usePremium();
  const router = useRouter();
  const { energy, bonusEnergy, isUnlimited } = useEnergy();
  const energySnapRef = useRef({ e: 0, b: 0, u: false });
  energySnapRef.current = { e: energy, b: bonusEnergy, u: isUnlimited };

  useEffect(() => {
    void (async () => {
      const val = await AsyncStorage.getItem('quiz_nav_level');
      if (val === 'hard' || val === 'medium' || val === 'easy') {
        await new Promise(r => setTimeout(r, 200));
        if (!DEV_MODE && !isPremium && val !== 'easy') {
          await AsyncStorage.removeItem('quiz_nav_level');
          router.push({ pathname: '/premium_modal', params: { context: val === 'hard' ? 'quiz_hard' : 'quiz_medium' } } as any);
          return;
        }
        if (!DEV_MODE && !isPremium && val === 'easy' && !(await hasFreeDailyQuizzesLeft())) {
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
        setLevel(val as Level);
      }
    })();
  }, [isPremium, router]);

  return (
    <View style={{ flex: 1 }}>
      {level
        ? <QuizGame key={gameKey} level={level} onBack={() => { setLevel(null); setGameKey(k => k + 1); }}/>
        : <LevelSelect onSelect={setLevel}/>
      }
    </View>
  );
}
