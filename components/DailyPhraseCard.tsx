import React, { memo, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useGlobalSearchParams } from 'expo-router';
import { useAudio } from '../hooks/use-audio';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import { syncWidgetData } from '../app/widget_bridge';
import { dailyPhraseChromeFor } from '../app/daily_phrase_chrome';
import { LinearGradient } from './SafeLinearGradient';
import { triLang } from '../constants/i18n';
import { softShadow, noAndroidOutline } from '../constants/androidGlow';
import { checkAchievements } from '../app/achievements';
import { updateMultipleTaskProgress } from '../app/daily_tasks';
import { claimDailyPhrasePulseForDay } from '../app/daily_phrase_pulse';
import { getLocalDayKey } from '../app/local_date';
import {
  dailyPhraseContentAvailableForTarget,
  frenchDailyPhraseGateCopy,
} from '../app/daily_phrase_target_gate';
import {
  awardDailyPhraseQuestXpOnce,
  buildDailyPhraseQuestOptions,
  DAILY_PHRASE_QUEST_XP,
  hasDailyPhraseQuestAnswered,
  isDailyPhraseQuestAnswerCorrect,
  markDailyPhraseQuestAnswered,
} from '../app/daily_phrase_quest';
import {
  dailyPhraseCopyForLang,
  getTodayPhraseForTarget,
  getTodayPhraseSyncForTarget,
  DailyPhrase,
  type DailyPhraseInterfaceLang,
} from '../app/daily_phrase_system';
import { IDIOMS } from '../app/idioms_data';
import { trainerThemeIconSource } from '../constants/trainerThemeIcons';
import AddToFlashcard from './AddToFlashcard';
import { useLang } from './LangContext';
import { useStudyTarget } from './StudyTargetContext';
import { useTheme } from './ThemeContext';
import { FlowText } from './text-integrity';
import TonalSurface from './TonalSurface';

// Chrome (per-theme palette) now lives in app/daily_phrase_chrome.ts so the
// home/lock-screen widget can render the identical look. See that file.

// зачем: старт позиции листа под экраном для slide-up bottom sheet (владелец, 2026-08-04).
const SHEET_SLIDE_DISTANCE = 420;

interface Props {
  userLevel?: number;
  variant?: 'default' | 'homeAdditional';
  homeCardVisible?: boolean;
}

function DailyPhraseCard({
  userLevel: _userLevel,
  variant = 'default',
  homeCardVisible = false,
}: Props) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { speak } = useAudio();
  const reduceMotion = useReduceMotion();
  // зачем: модалка «Фраза дня» стала bottom sheet — низ должен уважать home indicator/nav bar.
  const insets = useStableSafeAreaInsets();
  const sheetBottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const params = useGlobalSearchParams<{ openPhrase?: string; play?: string }>();
  const dailyPhraseGateOpen = dailyPhraseContentAvailableForTarget(studyTarget);
  const homeAdditional = variant === 'homeAdditional';
  const homeKickerFontSize = Math.max(12, f.caption);
  const chrome = dailyPhraseChromeFor(themeMode);
  const [phrase, setPhrase] = useState<DailyPhrase | null>(() => (
    getTodayPhraseSyncForTarget(studyTarget, lang)
  ));
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [questAnswered, setQuestAnswered] = useState(false);
  const [showQuestExplanation, setShowQuestExplanation] = useState(false);
  const [questPreviouslyAnswered, setQuestPreviouslyAnswered] = useState(false);
  const [selectedQuestOptionId, setSelectedQuestOptionId] = useState<string | null>(null);
  const [questXpDelta, setQuestXpDelta] = useState<number | null>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const explanationAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const modalEntranceAnim = useRef(new Animated.Value(0)).current;
  const homePulseScale = useRef(new Animated.Value(1)).current;
  const homePulseAttemptedDayRef = useRef<string | null>(null);
  const wasDetailsVisibleRef = useRef(false);
  const answeredQuestKeysRef = useRef(new Set<string>()).current;
  const phraseLang: DailyPhraseInterfaceLang = lang;
  const questOptions = phrase
    ? buildDailyPhraseQuestOptions(phrase, IDIOMS, phraseLang)
    : [];
  const selectedQuestCorrect = selectedQuestOptionId
    ? isDailyPhraseQuestAnswerCorrect(questOptions, selectedQuestOptionId)
    : false;

  useEffect(() => {
    let cancelled = false;
    if (!dailyPhraseGateOpen) {
      setPhrase(null);
      setDetailsVisible(false);
      return () => { cancelled = true; };
    }
    setPhrase(getTodayPhraseSyncForTarget(studyTarget, lang));
    void getTodayPhraseForTarget(studyTarget, lang).then(p => {
      if (!cancelled && p) setPhrase(p);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [dailyPhraseGateOpen, lang, studyTarget]);

  // React to "phrase of the day" widget deep links:
  //   phraseman://phrase/<id>        -> openPhrase=<id>        (open details)
  //   phraseman://phrase/<id>?play=1 -> openPhrase=<id>&play=1 (open + speak)
  // handledDeepLinkRef ensures we act once per distinct link, not every render.
  const handledDeepLinkRef = useRef<string | null>(null);
  useEffect(() => {
    if (!dailyPhraseGateOpen) return;
    const openPhrase = typeof params.openPhrase === 'string' ? params.openPhrase : '';
    if (!openPhrase) return;

    const wantsPlay = typeof params.play === 'string' && params.play === '1';
    const linkKey = `${openPhrase}:${wantsPlay ? '1' : '0'}`;
    if (handledDeepLinkRef.current === linkKey) return;

    // Always open details immediately.
    setDetailsVisible(true);

    if (!wantsPlay) {
      handledDeepLinkRef.current = linkKey;
      return;
    }

    // For play: only mark handled once we actually have text to speak, so a cold
    // launch (phrase not yet loaded) retries on the next render instead of
    // silently swallowing the play intent.
    const english = (phrase?.english ?? getTodayPhraseSyncForTarget(studyTarget, lang)?.english ?? '').trim();
    if (english) {
      speak(english);
      handledDeepLinkRef.current = linkKey;
    }
  }, [dailyPhraseGateOpen, params.openPhrase, params.play, studyTarget, phrase, speak]);

  // Keep the home/lock-screen widget in lockstep with whatever this card shows.
  // Best-effort and a native no-op off-device, so it never affects rendering.
  useEffect(() => {
    if (!dailyPhraseGateOpen) return;
    void syncWidgetData({ studyTarget, lang, themeMode });
  }, [dailyPhraseGateOpen, studyTarget, lang, themeMode, phrase?.id]);

  useEffect(() => {
    setQuestAnswered(false);
    setShowQuestExplanation(false);
    setQuestPreviouslyAnswered(false);
    setSelectedQuestOptionId(null);
    setQuestXpDelta(null);
    shakeAnim.setValue(0);
    explanationAnim.setValue(0);
    successAnim.setValue(0);
  }, [phrase?.id, shakeAnim, explanationAnim, successAnim]);

  useEffect(() => {
    if (!homeAdditional || !homeCardVisible || reduceMotion) return;

    const localDay = getLocalDayKey();
    if (homePulseAttemptedDayRef.current === localDay) return;
    homePulseAttemptedDayRef.current = localDay;

    let cancelled = false;
    void claimDailyPhrasePulseForDay(localDay)
      .then((claimed) => {
        if (!claimed || cancelled) return;
        const pulse = Animated.sequence([
          Animated.timing(homePulseScale, {
            toValue: 1.025,
            duration: 180,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(homePulseScale, {
            toValue: 1,
            duration: 180,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(homePulseScale, {
            toValue: 1.025,
            duration: 180,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(homePulseScale, {
            toValue: 1,
            duration: 180,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]);
        pulse.start(({ finished }) => {
          if (!finished) homePulseScale.setValue(1);
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      homePulseScale.stopAnimation();
      homePulseScale.setValue(1);
    };
  }, [homeAdditional, homeCardVisible, homePulseScale, reduceMotion]);

  useEffect(() => {
    const opened = detailsVisible && !wasDetailsVisibleRef.current;
    wasDetailsVisibleRef.current = detailsVisible;

    if (!detailsVisible) {
      modalEntranceAnim.stopAnimation();
      modalEntranceAnim.setValue(0);
      return;
    }

    if (!opened) return;

    if (reduceMotion) {
      modalEntranceAnim.setValue(1);
      return;
    }

    modalEntranceAnim.setValue(0);
    // зачем: bottom sheet — тот же iOS-drawer easing, что и в ExplainSheet, лист едет снизу.
    const entrance = Animated.timing(modalEntranceAnim, {
      toValue: 1,
      duration: 220,
      easing: Easing.bezier(0.32, 0.72, 0, 1),
      useNativeDriver: true,
    });
    entrance.start();

    return () => entrance.stop();
  }, [detailsVisible, modalEntranceAnim, reduceMotion]);

  useEffect(() => {
    if (!reduceMotion) return;

    modalEntranceAnim.stopAnimation();
    modalEntranceAnim.setValue(detailsVisible ? 1 : 0);
    shakeAnim.stopAnimation();
    shakeAnim.setValue(0);
    explanationAnim.stopAnimation();
    explanationAnim.setValue(questAnswered || showQuestExplanation ? 1 : 0);
    successAnim.stopAnimation();
    successAnim.setValue(questAnswered && selectedQuestCorrect ? 1 : 0);
  }, [
    detailsVisible,
    explanationAnim,
    modalEntranceAnim,
    questAnswered,
    reduceMotion,
    selectedQuestCorrect,
    shakeAnim,
    showQuestExplanation,
    successAnim,
  ]);

  useEffect(() => {
    if (!dailyPhraseGateOpen || !detailsVisible || !phrase || questAnswered || showQuestExplanation) return;

    let cancelled = false;
    const phraseId = phrase.id || phrase.date;
    const date = phrase.date || phrase.scheduledDate || new Date().toISOString().split('T')[0]!;

    hasDailyPhraseQuestAnswered({ phraseId, date })
      .then((alreadyAnswered) => {
        if (cancelled || !alreadyAnswered) return;
        setQuestAnswered(true);
        setShowQuestExplanation(true);
        setQuestPreviouslyAnswered(true);
        setSelectedQuestOptionId(null);
        setQuestXpDelta(null);
        explanationAnim.setValue(1);
        successAnim.setValue(0);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [
    detailsVisible,
    explanationAnim,
    phrase,
    phrase?.date,
    phrase?.id,
    phrase?.scheduledDate,
    questAnswered,
    showQuestExplanation,
    dailyPhraseGateOpen,
    studyTarget,
    successAnim,
  ]);

  if (!dailyPhraseGateOpen) {
    const gateCopy = frenchDailyPhraseGateCopy(lang);
    return (
      <Pressable
        accessibilityRole="text"
        accessibilityLabel={gateCopy.title}
        style={[
          homeAdditional ? styles.homeAdditionalEditorial : styles.plaque,
          !homeAdditional && {
            backgroundColor: chrome.colors[1] || t.bgCard,
            borderColor: chrome.border,
            shadowColor: chrome.shadow,
          },
        ]}
      >
        {!homeAdditional && (
          <>
            <LinearGradient
              pointerEvents="none"
              colors={chrome.colors}
              locations={[0, 0.56, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View pointerEvents="none" style={[styles.plaqueGlow, { backgroundColor: chrome.glow }]} />
          </>
        )}
        <View style={homeAdditional ? styles.homeAdditionalContent : styles.plaqueContent}>
          {!homeAdditional && (
            <View style={[styles.plaqueIcon, { backgroundColor: chrome.iconBg, borderColor: chrome.iconBorder }]}>
              <Ionicons name="shield-checkmark-outline" size={22} color={chrome.title} />
            </View>
          )}
          <View style={[styles.plaqueCopy, homeAdditional && styles.homeAdditionalCopy]}>
            <View style={styles.titleRow}>
              <Text style={[homeAdditional ? styles.homeAdditionalTitle : styles.plaqueTitle, { color: chrome.title, fontSize: homeAdditional ? Math.max(20, f.bodyLg) : f.caption }]} numberOfLines={2}>
                {gateCopy.title}
              </Text>
            </View>
            <Text style={[homeAdditional ? styles.homeAdditionalSub : styles.plaquePhrase, { color: chrome.sub, fontSize: homeAdditional ? Math.max(14, f.label) : f.body, lineHeight: homeAdditional ? 19 : 22 }]} numberOfLines={3}>
              {gateCopy.body}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }

  if (!phrase) {
    return <View style={[styles.placeholder, { backgroundColor: t.bgCard }]} />;
  }

  const labelLiteral = triLang(lang, {
    uk: 'Дослівно',
    ru: 'Дословно',
    es: 'Traducción literal',
    'pt-BR': 'Tradução literal',
    vi: 'Dịch sát nghĩa',
    id: 'Terjemahan literal',
    tr: 'Kelime kelime çeviri',
    pl: 'Dosłownie',
  });
  const labelMeaning = triLang(lang, {
    uk: 'Що означає',
    ru: 'Что значит',
    es: 'Significado',
    'pt-BR': 'Significado',
    vi: 'Nghĩa là gì',
    id: 'Artinya',
    tr: 'Anlamı',
    pl: 'Znaczenie',
  });
  const title = triLang(lang, {
    uk: 'Вислів дня',
    ru: 'Фраза дня',
    es: 'Frase del día',
    'pt-BR': 'Frase do dia',
    vi: 'Cụm từ hôm nay',
    id: 'Frasa hari ini',
    tr: 'Günün ifadesi',
    pl: 'Fraza dnia',
  });
  const phraseCopy = dailyPhraseCopyForLang(phrase, phraseLang);
  const flashcardSourceLocales = {
    'pt-BR': phrase.sourceLocales?.['pt-BR']?.meaning,
    vi: phrase.sourceLocales?.vi?.meaning,
    id: phrase.sourceLocales?.id?.meaning,
    tr: phrase.sourceLocales?.tr?.meaning,
    pl: phrase.sourceLocales?.pl?.meaning,
  };
  const dailyPhraseImage = trainerThemeIconSource(themeMode, 'phrases');
  const successOverlayOpacity = successAnim.interpolate({
    inputRange: [0, 0.08, 0.78, 1],
    outputRange: [0, 1, 1, 0],
    extrapolate: 'clamp',
  });
  const successCheckScale = successAnim.interpolate({
    inputRange: [0, 0.34, 0.78, 1],
    outputRange: [0.72, 1.08, 1, 1.12],
    extrapolate: 'clamp',
  });
  const successRingScale = successAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.52, 1.9],
    extrapolate: 'clamp',
  });
  const successRingOpacity = successAnim.interpolate({
    inputRange: [0, 0.16, 0.66, 1],
    outputRange: [0, 0.54, 0.22, 0],
    extrapolate: 'clamp',
  });
  const successResultScale = successAnim.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0.96, 1.02, 1],
    extrapolate: 'clamp',
  });

  const runWrongAnswerShake = () => {
    shakeAnim.setValue(0);
    if (reduceMotion) {
      return;
    }
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: -8, duration: 45, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 55, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  };

  const runCorrectAnswerAnimation = () => {
    successAnim.setValue(0);
    if (reduceMotion) {
      successAnim.setValue(1);
      return;
    }
    Animated.sequence([
      Animated.timing(successAnim, {
        toValue: 0.78,
        duration: 340,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(successAnim, {
        toValue: 1,
        duration: 260,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const resetQuest = () => {
    setQuestAnswered(false);
    setShowQuestExplanation(false);
    setQuestPreviouslyAnswered(false);
    setSelectedQuestOptionId(null);
    setQuestXpDelta(null);
    shakeAnim.stopAnimation();
    explanationAnim.stopAnimation();
    successAnim.stopAnimation();
    shakeAnim.setValue(0);
    explanationAnim.setValue(0);
    successAnim.setValue(0);
  };

  const revealQuestExplanation = () => {
    explanationAnim.setValue(0);
    setShowQuestExplanation(true);
    if (reduceMotion) {
      explanationAnim.setValue(1);
      return;
    }
    Animated.timing(explanationAnim, {
      toValue: 1,
      duration: 230,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const openDetails = async () => {
    resetQuest();
    const phraseId = phrase.id || phrase.date;
    const date = phrase.date || phrase.scheduledDate || new Date().toISOString().split('T')[0]!;
    const questKey = `${date}:${phraseId}`;
    const alreadyAnswered = answeredQuestKeysRef.has(questKey)
      || await hasDailyPhraseQuestAnswered({ phraseId, date }).catch(() => false);

    if (alreadyAnswered) {
      setQuestAnswered(true);
      setShowQuestExplanation(true);
      setQuestPreviouslyAnswered(true);
      setSelectedQuestOptionId(null);
      setQuestXpDelta(null);
      explanationAnim.setValue(1);
      successAnim.setValue(0);
    }

    setDetailsVisible(true);
    updateMultipleTaskProgress([{ type: 'daily_phrase_read', increment: 1 }], { studyTarget }).catch(() => {});
    checkAchievements({ type: 'daily_phrase', action: 'read', studyTarget }).catch(() => {});
  };

  const closeDetails = () => {
    modalEntranceAnim.stopAnimation();
    // зачем: bottom sheet должен уезжать вниз перед закрытием, а не исчезать
    // мгновенно — иначе шторка выглядит как обрыв, а не как выезд/уезд.
    if (reduceMotion) {
      setDetailsVisible(false);
      resetQuest();
      return;
    }
    Animated.timing(modalEntranceAnim, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      setDetailsVisible(false);
      resetQuest();
    });
  };

  const handleQuestOptionPress = (optionId: string) => {
    if (questAnswered) return;
    const phraseId = phrase.id || phrase.date;
    const date = phrase.date || phrase.scheduledDate || new Date().toISOString().split('T')[0]!;
    const questKey = `${date}:${phraseId}`;
    answeredQuestKeysRef.add(questKey);
    setSelectedQuestOptionId(optionId);
    setQuestAnswered(true);
    setQuestPreviouslyAnswered(false);
    revealQuestExplanation();
    markDailyPhraseQuestAnswered({ phraseId, date }).catch(() => {});

    const correct = isDailyPhraseQuestAnswerCorrect(questOptions, optionId);
    if (!correct) {
      setQuestXpDelta(0);
      runWrongAnswerShake();
      return;
    }

    setQuestXpDelta(DAILY_PHRASE_QUEST_XP);
    runCorrectAnswerAnimation();
    awardDailyPhraseQuestXpOnce({
      phraseId,
      date,
      lang,
    })
      .then((result) => setQuestXpDelta(result.finalDelta))
      .catch(() => setQuestXpDelta(0));
  };

  return (
    <>
      <Animated.View
        style={homeAdditional ? { transform: [{ scale: homePulseScale }] } : undefined}
      >
        <Pressable
          onPress={openDetails}
          accessibilityRole="button"
          accessibilityLabel={homeAdditional ? `${title}. ${phrase.english}.` : title}
          style={({ pressed }) => [
            homeAdditional ? styles.homeAdditionalEditorial : styles.plaque,
          // зачем: владелец (2026-08-03) — «Фраза дня» на главной должна
          // читаться как свой отдельный контейнер, а не голый текст на фоне
          // экрана. Заливка — тот же тихий тон иконки-чипа (rgba ~0.13-0.15
          // на тему), никакой рамки: подложка едва заметна и скруглена, без
          // borderWidth (запрет владельца на контуры вокруг блоков).
            homeAdditional && { backgroundColor: chrome.iconBg },
            !homeAdditional && {
              backgroundColor: chrome.colors[1] || t.bgCard,
              borderColor: chrome.border,
              shadowColor: chrome.shadow,
            },
            pressed && styles.pressed,
          ]}
        >
        {!homeAdditional && (
          <>
            <LinearGradient
              pointerEvents="none"
              colors={chrome.colors}
              locations={[0, 0.56, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View pointerEvents="none" style={[styles.plaqueGlow, { backgroundColor: chrome.glow }]} />
          </>
        )}
        <View style={homeAdditional ? styles.homeAdditionalContent : styles.plaqueContent}>
          {!homeAdditional && (
            <View style={[styles.plaqueIcon, { backgroundColor: chrome.iconBg, borderColor: chrome.iconBorder }]}>
              {dailyPhraseImage ? (
                <Image source={dailyPhraseImage} style={styles.iconImage} contentFit="contain" />
              ) : (
                <Ionicons name="chatbubble-ellipses-outline" size={22} color={chrome.title} />
              )}
            </View>
          )}
          <View style={[styles.plaqueCopy, homeAdditional && styles.homeAdditionalCopy]}>
            {homeAdditional ? (
              <>
                <Text style={[styles.homeAdditionalKicker, { color: chrome.title, fontSize: homeKickerFontSize, lineHeight: Math.round(homeKickerFontSize * 1.3) }]}>
                  {title}
                </Text>
                <Text style={[styles.homeAdditionalPhrase, { color: chrome.phrase, fontSize: Math.max(22, f.bodyLg), lineHeight: Math.round(Math.max(22, f.bodyLg) * 1.3) }]}>
                  {phrase.english}
                </Text>
              </>
            ) : (
              <>
                <View style={styles.titleRow}>
                  <FlowText
                    testID="daily-phrase-title"
                    provenance="authored"
                    style={[styles.plaqueTitle, { color: chrome.title, fontSize: f.caption }]}
                  >
                    {title}
                  </FlowText>
                </View>
                <FlowText
                  testID="daily-phrase-english"
                  provenance="authored"
                  style={[styles.plaquePhrase, { color: chrome.phrase, fontSize: f.body }]}
                >
                  {phrase.english}
                </FlowText>
              </>
            )}
          </View>
        </View>
        </Pressable>
      </Animated.View>

      <Modal
        visible={detailsVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeDetails}
      >
        <View style={styles.modalRoot}>
          <Animated.View style={[styles.backdrop, { opacity: modalEntranceAnim }]}>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={closeDetails} />
          </Animated.View>
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: t.bgCard,
                shadowColor: t.accent,
                paddingBottom: 16 + sheetBottomInset,
              },
              {
                transform: [
                  { translateX: shakeAnim },
                  {
                    translateY: modalEntranceAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [SHEET_SLIDE_DISTANCE, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <TonalSurface pointerEvents="none" radius={24} tone="raised" style={StyleSheet.absoluteFillObject} />
            <View style={styles.grabber} pointerEvents="none">
              <View style={[styles.grabberPill, { backgroundColor: t.border }]} />
            </View>
            {questAnswered && selectedQuestCorrect && !questPreviouslyAnswered && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.successOverlay,
                  {
                    opacity: successOverlayOpacity,
                    transform: [{ scale: successCheckScale }],
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.successRing,
                    {
                      borderColor: t.correct,
                      opacity: successRingOpacity,
                      transform: [{ scale: successRingScale }],
                    },
                  ]}
                />
                <View style={[styles.successBadge, { backgroundColor: t.correct, shadowColor: t.correct }]}>
                  <Ionicons name="checkmark" size={44} color={t.correctText} />
                </View>
              </Animated.View>
            )}

            <View style={styles.sheetHeader}>
              <View style={[styles.sheetIcon, { backgroundColor: t.bgSurface2 }]}>
                {dailyPhraseImage ? (
                  <Image source={dailyPhraseImage} style={styles.sheetIconImage} contentFit="contain" />
                ) : (
                  <Ionicons name="chatbubble-ellipses-outline" size={24} color={t.textMuted} />
                )}
              </View>
              <View style={styles.sheetTitleWrap}>
                <Text style={[styles.sheetKicker, { color: t.textMuted, fontSize: f.caption }]} numberOfLines={1}>
                  {title}
                </Text>
                <Text style={[styles.sheetPhrase, { color: t.textPrimary, fontSize: f.bodyLg || f.body }]}>
                  {phrase.english}
                </Text>
              </View>
              {/* зачем 2026-08-04 (владелец: «убери нижнюю зону, где текст
                  уходит под безопасную зону, а кнопку сохранить перенеси вверх
                  слева от кнопки озвучить»): закладка жила в отдельной полосе
                  под скроллом — она съедала высоту листа и на телефонах с
                  большим домашним индикатором подъезжала под safe area. В шапке
                  бокс закладки 36×36 совпадает с соседними круглыми кнопками.
                  Кнопки собраны в свой ряд с шагом 6: общий gap шапки (12) на
                  трёх иконках отъедал ширину у фразы. */}
              <View style={styles.sheetActions}>
                {questAnswered && phrase.allowSave !== false && (
                  <AddToFlashcard
                    en={phrase.english}
                    ru={phrase.meaning}
                    uk={phrase.meaning_uk}
                    es={phrase.meaning_es}
                    sourceLocales={flashcardSourceLocales}
                    source="daily_phrase"
                    sourceId={phrase.id || phrase.date}
                    studyTarget={studyTarget}
                    size={24}
                    literalRu={phrase.literal}
                    literalUk={phrase.literal_uk}
                    literalEs={phrase.literal_es}
                    explanationRu={phrase.meaning}
                    explanationUk={phrase.meaning_uk}
                    explanationEs={phrase.meaning_es}
                    exampleRu={phrase.text}
                    exampleUk={phrase.text_uk}
                    exampleEs={phrase.text_es}
                  />
                )}
                {showQuestExplanation && (
                  <Pressable
                    onPress={() => { const en = phrase.english?.trim(); if (en) speak(en); }}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={triLang(lang, {
                      uk: 'Озвучити', ru: 'Озвучить', es: 'Reproducir',
                      'pt-BR': 'Reproduzir', vi: 'Phát', id: 'Putar', tr: 'Seslendir', pl: 'Odtwórz',
                    })}
                    style={({ pressed }) => [
                      styles.closeButton,
                      { backgroundColor: t.bgSurface2 },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons name="volume-high" size={20} color={t.accent} />
                  </Pressable>
                )}
                <Pressable
                  onPress={closeDetails}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  style={({ pressed }) => [
                    styles.closeButton,
                    { backgroundColor: t.bgSurface2 },
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="close" size={20} color={t.textMuted} />
                </Pressable>
              </View>
            </View>

            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {!questAnswered && (
                <TonalSurface radius={18} tone="subtle" backgroundColor={t.bgSurface2} style={[styles.questBlock, { borderColor: t.border }]}>
                  <Text style={[styles.questQuestion, { color: t.textPrimary, fontSize: f.bodyLg || f.body }]}>
                    {triLang(lang, {
                      ru: 'Что это значит?',
                      uk: 'Що це означає?',
                      es: '¿Qué significa?',
                      'pt-BR': 'O que isso significa?',
                      vi: 'Nghĩa là gì?',
                      id: 'Apa artinya?',
                      tr: 'Bu ne anlama geliyor?',
                      pl: 'Co to znaczy?',
                    })}
                  </Text>
                  <View style={styles.questOptions}>
                    {questOptions.map((option, optionIndex) => (
                        <Pressable
                          key={option.id}
                          onPress={() => handleQuestOptionPress(option.id)}
                          accessibilityRole="button"
                          accessibilityLabel={`${optionIndex + 1}. ${option.text}`}
                          style={({ pressed }) => [
                            styles.questOption,
                            {
                              backgroundColor: t.bgCard,
                              borderColor: t.border,
                            },
                            pressed && styles.pressed,
                          ]}
                        >
                          <View style={[styles.optionMarker, { backgroundColor: t.accent }]}>
                            <Text style={[styles.optionMarkerText, { color: t.correctText, fontSize: f.caption }]}>
                              {optionIndex + 1}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.questOptionText,
                              { color: t.textPrimary, fontSize: f.body },
                            ]}
                          >
                            {option.text}
                          </Text>
                        </Pressable>
                      ))}
                  </View>
                </TonalSurface>
              )}

              {showQuestExplanation && (
                <Animated.View
                  style={[
                    styles.explanationWrap,
                    {
                      opacity: explanationAnim,
                      transform: [{
                        translateY: explanationAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [12, 0],
                        }),
                      }],
                    },
                  ]}
                >
                  {selectedQuestCorrect && !questPreviouslyAnswered && (
                    <Animated.View
                      style={[
                        styles.questResultPill,
                        {
                          borderColor: t.correct,
                          backgroundColor: `${t.correct}1F`,
                          opacity: explanationAnim,
                          transform: [{ scale: successResultScale }],
                        },
                      ]}
                    >
                      <View style={[styles.questResultIcon, { backgroundColor: t.correct }]}>
                        <Ionicons name="checkmark" size={17} color={t.correctText} />
                      </View>
                      <Text style={[styles.questResultText, { color: t.correct, fontSize: f.label }]}>
                        {questXpDelta && questXpDelta > 0
                          ? `+${questXpDelta} XP`
                          : 'Верно. XP уже получен сегодня.'}
                      </Text>
                    </Animated.View>
                  )}
                  <TonalSurface radius={16} tone="subtle" backgroundColor={t.bgSurface2} style={[styles.detailBlock, styles.literalBlock, { borderColor: t.border }]}>
                    <Text style={[styles.detailLabel, { color: t.textMuted, fontSize: f.caption }]}>
                      {labelLiteral}
                    </Text>
                    <Text style={[styles.detailText, { color: t.textPrimary, fontSize: f.body }]}>
                      {phraseCopy.literal}
                    </Text>
                  </TonalSurface>

                  <TonalSurface radius={18} tone="raised" backgroundColor={t.bgSurface2} style={[styles.detailBlock, styles.meaningBlock, { borderColor: t.accent }]}>
                    <Text style={[styles.detailLabel, { color: t.textMuted, fontSize: f.caption }]}>
                      {labelMeaning}
                    </Text>
                    <Text style={[styles.detailText, { color: t.textPrimary, fontSize: f.body }]}>
                      {phraseCopy.meaning}
                    </Text>
                  </TonalSurface>

                  <TonalSurface radius={18} tone="subtle" backgroundColor={t.bgSurface2} style={[styles.explanationBlock, { borderColor: t.border }]}>
                    <View style={[styles.explanationRail, { backgroundColor: t.accent }]} />
                    <Text style={[styles.storyText, { color: t.textSecond, fontSize: f.body }]}>
                      {phraseCopy.text}
                    </Text>
                  </TonalSurface>
                </Animated.View>
              )}
            </ScrollView>

          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

export default memo(DailyPhraseCard);

const styles = StyleSheet.create({
  placeholder: {
    minHeight: 88,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 18,
  },
  plaque: {
    minHeight: 86,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 18,
    borderWidth: 0,
    padding: 14,
    overflow: 'hidden',
    // зачем: фон плашки рисует градиент внутри — Android заливал квадрат.
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    ...noAndroidOutline,
  },
  homeAdditionalEditorial: {
    alignSelf: 'stretch',
    marginHorizontal: 8,
    marginTop: 10,
    marginBottom: 16,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  pressed: {
    opacity: 0.78,
  },
  plaqueIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconImage: {
    width: 48,
    height: 48,
  },
  plaqueCopy: {
    flex: 1,
    minWidth: 0,
  },
  plaqueContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 2,
  },
  homeAdditionalContent: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  homeAdditionalCopy: {
    alignItems: 'center',
    flex: 0,
    maxWidth: '100%',
  },
  plaqueGlow: {
    position: 'absolute',
    right: -52,
    top: -44,
    width: 132,
    height: 132,
    borderRadius: 66,
    opacity: 0.62,
  },
  titleRow: {
    minHeight: 28,
    marginBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  plaqueTitle: {
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  plaquePhrase: {
    fontWeight: '800',
    lineHeight: 22,
  },
  homeAdditionalTitle: {
    fontWeight: '900',
    lineHeight: 26,
    flexShrink: 1,
    textAlign: 'center',
  },
  homeAdditionalKicker: {
    fontWeight: '900',
    letterSpacing: 0.7,
    marginBottom: 4,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  homeAdditionalPhrase: {
    fontWeight: '900',
    flexShrink: 1,
    textAlign: 'center',
  },
  homeAdditionalSub: {
    fontWeight: '800',
    lineHeight: 19,
    marginTop: 5,
    textAlign: 'center',
  },
  homeAdditionalTeaser: {
    fontWeight: '900',
    lineHeight: 18,
    letterSpacing: 0.2,
    marginTop: 7,
    minHeight: 38,
    opacity: 0.92,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  sheet: {
    width: '100%',
    maxHeight: '86%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 0,
    overflow: 'hidden',
    paddingTop: 6,
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    ...noAndroidOutline,
  },
  grabber: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  grabberPill: {
    width: 44,
    height: 5,
    borderRadius: 3,
    opacity: 0.9,
  },
  successOverlay: {
    position: 'absolute',
    top: '34%',
    left: 0,
    right: 0,
    zIndex: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successRing: {
    position: 'absolute',
    width: 94,
    height: 94,
    borderRadius: 47,
    borderWidth: 2,
  },
  successBadge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    // зачем: круг (radius 35) без непрозрачного фона — Android рисовал
    // квадратный outline вокруг него. На iOS зелёное свечение как было.
    ...softShadow({ color: '#22C55E', opacity: 0.38, radius: 18, offsetY: 8, elevation: 9 }),
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    paddingBottom: 12,
  },
  sheetIcon: {
    width: 56,
    height: 56,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetIconImage: {
    width: 50,
    height: 50,
  },
  sheetTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  sheetKicker: {
    fontWeight: '900',
    letterSpacing: 0.7,
    marginBottom: 7,
    textTransform: 'uppercase',
  },
  sheetPhrase: {
    fontWeight: '900',
    lineHeight: 28,
  },
  sheetActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // зачем 2026-08-04 (владелец: «текст уходит вниз под безопасную зону»):
  // жёсткий maxHeight: 390 обрывал историю фразы на полуслове даже там, где
  // на экране оставалось место — лист-то может занять 86% высоты. Теперь
  // высоту скролла ограничивает сам лист (flexShrink), а не магическое число,
  // поэтому на большом телефоне видно больше текста, а на маленьком лист
  // по-прежнему не вылезает за свои 86% и за safe area.
  sheetScroll: {
    flexShrink: 1,
  },
  sheetScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  detailBlock: {
    borderRadius: 16,
    borderWidth: 0,
    padding: 13,
  },
  literalBlock: {
    paddingVertical: 11,
  },
  meaningBlock: {
    borderWidth: 1,
    padding: 15,
  },
  detailLabel: {
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  detailText: {
    fontWeight: '600',
    lineHeight: 22,
  },
  storyText: {
    fontWeight: '500',
    lineHeight: 23,
    flex: 1,
  },
  explanationBlock: {
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 15,
  },
  explanationRail: {
    alignSelf: 'stretch',
    borderRadius: 2,
    width: 4,
  },
  questBlock: {
    borderRadius: 16,
    borderWidth: 0,
    padding: 13,
  },
  questQuestion: {
    fontWeight: '900',
    lineHeight: 24,
    marginBottom: 12,
  },
  questOptions: {
    gap: 9,
  },
  questOption: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    justifyContent: 'center',
  },
  optionMarker: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    flexShrink: 0,
    justifyContent: 'center',
  },
  optionMarkerText: {
    fontWeight: '900',
    lineHeight: 16,
  },
  questOptionText: {
    flex: 1,
    fontWeight: '800',
    lineHeight: 21,
  },
  questResultPill: {
    minHeight: 42,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: 21,
    borderWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 12,
  },
  questResultIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questResultText: {
    fontWeight: '900',
    lineHeight: 20,
    textAlign: 'center',
  },
  explanationWrap: {
    gap: 12,
  },
});
