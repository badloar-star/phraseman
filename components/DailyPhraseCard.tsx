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
import { resolveThemedArt } from './theme/themed_art_registry';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useGlobalSearchParams } from 'expo-router';
import { inferExpoSpeechLanguage, useAudio } from '../hooks/use-audio';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import { dailyPhraseChromeFor } from '../app/daily_phrase_chrome';
import { LinearGradient } from './SafeLinearGradient';
import { triLang } from '../constants/i18n';
import { softShadow, noAndroidOutline } from '../constants/androidGlow';
import { checkAchievements } from '../app/achievements';
import { claimDailyPhrasePulseForDay } from '../app/daily_phrase_pulse';
import { getLocalDayKey } from '../app/local_date';
import {
  dailyPhraseContentAvailableForTarget,
  dailyPhraseGateCopyForTarget,
} from '../app/daily_phrase_target_gate';
import {
  buildDailyPhraseQuestOptions,
  hasDailyPhraseQuestAnswered,
  isDailyPhraseQuestAnswerCorrect,
  markDailyPhraseQuestAnswered,
} from '../app/daily_phrase_quest';
import {
  dailyPhraseCopyForLang,
  getDailyPhraseQuestPoolForTarget,
  getTodayPhraseForTarget,
  getTodayPhraseSyncForTarget,
  subscribeDailyPhrasePeekHydrated,
  DailyPhrase,
  type DailyPhraseInterfaceLang,
} from '../app/daily_phrase_system';
import { getHomeSupportingArt } from '../app/home_supporting_art';
import AddToFlashcard from './AddToFlashcard';
import { useLang } from './LangContext';
import { useStudyTarget } from './StudyTargetContext';
import { useTheme } from './ThemeContext';
import { FlowText } from './text-integrity';
import TonalSurface from './TonalSurface';
import { glassFill } from './GlassSurface';
import FeatureIntroModal from './FeatureIntroModal';
import { featureIntroById } from '../app/feature_intro_registry';
import { featureIntroClose } from '../app/feature_intro_copy';
import { useRequestedFeatureIntro } from '../hooks/use_requested_feature_intro';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { V2, V2_TYPE } from '../constants/v2Style';
import { useV2Palette } from './v2/useV2Palette';
import { V2IconTile } from './v2/V2Glass';
import { useHomePlateStyle } from './home/v2/homePlate';
import { HOME_SCENE_V2_ENABLED } from './home/v2/scene/home_scene_flag';
import { noteSwallowedAs, noteSwallowedHandler } from '../app/swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее
import SheetSwipeClose, { SheetSwipeRoot } from './modal_fx/SheetSwipeClose';

// Chrome (per-theme palette) now lives in app/daily_phrase_chrome.ts so the
// home/lock-screen widget can render the identical look. See that file.

// зачем: старт позиции листа под экраном для slide-up bottom sheet (владелец, 2026-08-04).
const SHEET_SLIDE_DISTANCE = 420;
const HOME_ADDITIONAL_ART_SIZE = 144;
const HOME_ADDITIONAL_ART_SLOT_WIDTH = 112;
const HOME_ADDITIONAL_ART_SLOT_HEIGHT = 72;

interface Props {
  userLevel?: number;
  /** 'homeV2' — карточка «Фраза дня» новой Главной (референс владельца 24.09, 2.0). */
  variant?: 'default' | 'homeAdditional' | 'homeV2';
  homeCardVisible?: boolean;
}

/**
 * testID варианта ответа для робота Сверки (energy-modes-014): верный — daily-phrase-option-correct, неверные — daily-phrase-option-wrong-N
 * (N — порядок среди неверных). Верность — той же функцией, что проверяет ответ. Вид и поведение не меняет.
 */
function dailyPhraseOptionTestId(options: Parameters<typeof isDailyPhraseQuestAnswerCorrect>[0], index: number): string {
  if (isDailyPhraseQuestAnswerCorrect(options, options[index].id)) return 'daily-phrase-option-correct';
  let wrongBefore = 0;
  for (let i = 0; i < index; i += 1) {
    if (!isDailyPhraseQuestAnswerCorrect(options, options[i].id)) wrongBefore += 1;
  }
  return `daily-phrase-option-wrong-${wrongBefore}`;
}

function DailyPhraseCard({
  userLevel: _userLevel,
  variant = 'default',
  homeCardVisible = false,
}: Props) {
  const { theme: t, f, themeMode, liquidGlassAppearance } = useTheme();
  // зачем (ассеты 2.0, 04.10): «Фраза дня» берёт предмет из реестра по яркости темы; кэш реестра — без пересоздания источника.
  const phraseArt = resolveThemedArt('phrase_of_day', liquidGlassAppearance === 'light' ? 'light' : 'dark').base ?? require('../assets/images/v2/mug_quote.png');
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { speak } = useAudio();
  const reduceMotion = useReduceMotion();
  // зачем: модалка «Фраза дня» стала bottom sheet — низ должен уважать home indicator/nav bar.
  const insets = useStableSafeAreaInsets();
  const sheetBottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const params = useGlobalSearchParams<{ openPhrase?: string; play?: string }>();
  const dailyPhraseGateOpen = dailyPhraseContentAvailableForTarget(studyTarget);
  // зачем: homeV2 наследует поведение homeAdditional (пульс, видимость, intro),
  // но рисуется своим телом по референсу 2.0.
  const homeV2 = variant === 'homeV2';
  // зачем (Ревизор 22.10): новый вид «Фразы дня» (scenes-compact в.2) — только со «Сценой» Главной; выпускная Главная без флага остаётся прежней 1:1
  const sceneLook = homeV2 && HOME_SCENE_V2_ENABLED;
  const homeAdditional = variant === 'homeAdditional' || homeV2;
  const v2 = useV2Palette();
  const v2Glass = useHomePlateStyle(); // зачем: приказ владельца 11.10 19:2x — плашки Главной с фоном 50 % (альфа цвета фона), без блика/дымки; общий хук стекла остальных экранов не менялся
  const homeKickerFontSize = Math.max(12, f.caption);
  const chrome = dailyPhraseChromeFor(themeMode);
  const phraseOfDayArt = getHomeSupportingArt(themeMode).phraseOfDay;
  const [phrase, setPhrase] = useState<DailyPhrase | null>(() => (
    getTodayPhraseSyncForTarget(studyTarget, lang)
  ));
  const [detailsVisible, setDetailsVisible] = useState(false);
  const handledDeepLinkRef = useRef<string | null>(null);
  const pendingDeepLinkRef = useRef<string | null>(null);
  const spokenDeepLinkRef = useRef<string | null>(null);
  const introActive = useRuntimeActive(dailyPhraseGateOpen && (!homeAdditional || homeCardVisible));
  const dailyIntroDef = featureIntroById('daily_phrase_first_visit')!;
  const dailyIntro = useRequestedFeatureIntro('daily_phrase_first_visit', introActive && !detailsVisible, () => {
    setDetailsVisible(true);
    if (pendingDeepLinkRef.current) {
      handledDeepLinkRef.current = pendingDeepLinkRef.current;
      pendingDeepLinkRef.current = null;
    }
  });
  const [questAnswered, setQuestAnswered] = useState(false);
  const [showQuestExplanation, setShowQuestExplanation] = useState(false);
  const [questPreviouslyAnswered, setQuestPreviouslyAnswered] = useState(false);
  const [selectedQuestOptionId, setSelectedQuestOptionId] = useState<string | null>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const explanationAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const modalEntranceAnim = useRef(new Animated.Value(0)).current;
  const homePulseScale = useRef(new Animated.Value(1)).current;
  const homePulseAttemptedDayRef = useRef<string | null>(null);
  const wasDetailsVisibleRef = useRef(false);
  const answeredQuestKeysRef = useRef(new Set<string>()).current;
  // зачем: у «фразы дня» нет английского контента (DailyPhraseInterfaceLang =
  // SourceLocale, en не входит) — сужаем на RU, как виджет в app/_layout.tsx.
  const phraseLang: DailyPhraseInterfaceLang = lang === 'en' ? 'ru' : lang;
  // зачем (решение владельца 12.10 через координатора: «английские объяснения — можно позже»): у пакетов es/de/it объяснения
  // только ru/uk. Английскому интерфейсу русский не показываем: фраза и озвучка остаются, а дословный перевод, значение,
  // пример, вопрос дня и сохранение в карточки (там русский текст) скрыты до появления английского источника.
  const noSourceExplanation = lang === 'en' && studyTarget !== 'en';
  useEffect(() => {
    if (!noSourceExplanation) return;
    console.log('[DAILY-PHRASE-GATE] reason=no_en_explanation', JSON.stringify({ studyTarget, uiLang: lang, hidden: ['literal', 'meaning', 'example', 'quiz', 'save'] })); // guard-ok: видимое сокращение карточки называет причину
  }, [noSourceExplanation, studyTarget, lang]);
  // зачем: варианты квеста нужны только в открытой шторке деталей — не считаем
  // их (и не грузим каталог идиом) на первом кадре Главной. useMemo заодно
  // держит варианты стабильными между рендерами открытой шторки.
  const questOptions = React.useMemo(
    () => (phrase && detailsVisible && !noSourceExplanation
      ? buildDailyPhraseQuestOptions(phrase, getDailyPhraseQuestPoolForTarget(studyTarget, phraseLang), phraseLang, studyTarget)
      : []),
    [phrase, detailsVisible, noSourceExplanation, phraseLang, studyTarget],
  );
  const hasValidQuest = questOptions.length === 3;
  const selectedQuestOption = selectedQuestOptionId
    ? questOptions.find((option) => option.id === selectedQuestOptionId) ?? null
    : null;
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
    // зачем (Сверка 11.10): пока снимок фразы читается, синхронный путь отдаёт null (без каталога идиом);
    // дочитался снимок — подставляем фразу, если сеть ещё не принесла свою.
    const unsubscribePeek = subscribeDailyPhrasePeekHydrated(() => {
      if (cancelled) return;
      setPhrase((current) => current ?? getTodayPhraseSyncForTarget(studyTarget, lang));
    });
    void getTodayPhraseForTarget(studyTarget, lang).then(p => {
      if (!cancelled && p) setPhrase(p);
    }).catch(noteSwallowedHandler('DailyPhraseCard:useEffect.getTodayPhraseForTarget'));
    return () => { cancelled = true; unsubscribePeek(); };
  }, [dailyPhraseGateOpen, lang, studyTarget]);

  // React to "phrase of the day" widget deep links:
  //   phraseman://phrase/<id>        -> openPhrase=<id>        (open details)
  //   phraseman://phrase/<id>?play=1 -> openPhrase=<id>&play=1 (open + speak)
  // handledDeepLinkRef ensures we act once per distinct link, not every render.
  useEffect(() => {
    if (!dailyPhraseGateOpen || !introActive) return;
    const openPhrase = typeof params.openPhrase === 'string' ? params.openPhrase : '';
    if (!openPhrase) return;

    const wantsPlay = typeof params.play === 'string' && params.play === '1';
    const linkKey = `${openPhrase}:${wantsPlay ? '1' : '0'}`;
    if (detailsVisible) {
      handledDeepLinkRef.current = linkKey;
      pendingDeepLinkRef.current = null;
    } else if (handledDeepLinkRef.current !== linkKey) {
      // Consume only when details actually open, not during a cancellable read.
      pendingDeepLinkRef.current = linkKey;
      void dailyIntro.request();
    }
    if (!wantsPlay || spokenDeepLinkRef.current === linkKey) return;

    // For play: only mark handled once we actually have text to speak, so a cold
    // launch (phrase not yet loaded) retries on the next render instead of
    // silently swallowing the play intent.
    const english = (phrase?.english ?? getTodayPhraseSyncForTarget(studyTarget, lang)?.english ?? '').trim();
    if (english) {
      // зачем (PM-203): фраза дня для fr — французский текст в поле english; без языка
      // озвучка выводила бы en-US и читала французский английским голосом.
      speak(english, undefined, { language: inferExpoSpeechLanguage(english, studyTarget) });
      spokenDeepLinkRef.current = linkKey;
    }
  }, [dailyPhraseGateOpen, params.openPhrase, params.play, studyTarget, phrase, speak, dailyIntro.request, introActive, detailsVisible]);

  useEffect(() => {
    setQuestAnswered(false);
    setShowQuestExplanation(false);
    setQuestPreviouslyAnswered(false);
    setSelectedQuestOptionId(null);
    shakeAnim.setValue(0);
    explanationAnim.setValue(0);
    successAnim.setValue(0);
  }, [phrase?.id, studyTarget, shakeAnim, explanationAnim, successAnim]);

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
      .catch(noteSwallowedHandler('DailyPhraseCard:useEffect.claimDailyPhrasePulseForDay'));

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

    hasDailyPhraseQuestAnswered({ phraseId, date, studyTarget })
      .then((alreadyAnswered) => {
        if (cancelled || !alreadyAnswered) return;
        setQuestAnswered(true);
        setShowQuestExplanation(true);
        setQuestPreviouslyAnswered(true);
        setSelectedQuestOptionId(null);
        explanationAnim.setValue(1);
        successAnim.setValue(0);
      })
      .catch(noteSwallowedHandler('DailyPhraseCard:useEffect.hasDailyPhraseQuestAnswered'));

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
    const gateCopy = dailyPhraseGateCopyForTarget(studyTarget, lang);
    if (homeV2) {
      return (
        <View accessibilityRole="text" accessibilityLabel={gateCopy.title} style={[styles.v2Card, v2Glass]}>
          <View style={[styles.v2Quote, { backgroundColor: v2.control }]}>
            <Ionicons name="shield-checkmark-outline" size={20} color={v2.text} />
          </View>
          <View style={[styles.v2Copy, { paddingRight: 0 }]}>
            <Text style={[styles.v2Phrase, { color: v2.text, marginTop: 0, fontSize: 16, lineHeight: 22 }]}>{gateCopy.title}</Text>
            <Text style={[styles.v2Translation, { color: v2.textSecondary }]}>{gateCopy.body}</Text>
          </View>
        </View>
      );
    }
    return (
      <Pressable
        accessibilityRole="text"
        accessibilityLabel={gateCopy.title}
        style={[
          homeAdditional ? styles.homeAdditionalEditorial : styles.plaque,
          !homeAdditional && {
            backgroundColor: chrome.colors[1] || t.bgCard,
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
          {homeAdditional && (
            <View style={styles.homeAdditionalArtSlot}>
              <Image source={phraseOfDayArt} style={styles.homeAdditionalArt} contentFit="contain" accessible={false} />
            </View>
          )}
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
    // Резерв той же высоты, что у готовой карточки: первый кадр = финальная геометрия.
    if (homeV2) return <View style={[styles.v2Card, v2Glass]} />; // guard-ok: D43
    return <View style={[styles.placeholder, { backgroundColor: t.bgCard }]} />;
  }

  const labelLiteral = triLang(lang, {
    uk: 'Дослівно',
    ru: 'Дословно',
    en: 'Literal translation',
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
    en: 'Meaning',
    es: 'Significado',
    'pt-BR': 'Significado',
    vi: 'Nghĩa là gì',
    id: 'Artinya',
    tr: 'Anlamı',
    pl: 'Znaczenie',
  });
  const labelExample = triLang(lang, {
    uk: 'Приклад',
    ru: 'Пример',
    en: 'Example',
    es: 'Ejemplo',
    'pt-BR': 'Exemplo',
    vi: 'Ví dụ',
    id: 'Contoh',
    tr: 'Örnek',
    pl: 'Przykład',
  });
  const title = triLang(lang, {
    uk: 'Вислів дня',
    ru: 'Фраза дня',
    en: 'Phrase of the day',
    es: 'Frase del día',
    'pt-BR': 'Frase do dia',
    vi: 'Cụm từ hôm nay',
    id: 'Frasa hari ini',
    tr: 'Günün ifadesi',
    pl: 'Fraza dnia',
  });
  const phraseCopy = dailyPhraseCopyForLang(phrase, phraseLang);
  const cardLiteral = noSourceExplanation ? '' : phraseCopy.literal;
  const flashcardSourceLocales = {
    'pt-BR': phrase.sourceLocales?.['pt-BR']?.meaning,
    vi: phrase.sourceLocales?.vi?.meaning,
    id: phrase.sourceLocales?.id?.meaning,
    tr: phrase.sourceLocales?.tr?.meaning,
    pl: phrase.sourceLocales?.pl?.meaning,
  };
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
    const questKey = `${studyTarget === 'en' ? '' : `${studyTarget}:`}${date}:${phraseId}`;
    const alreadyAnswered = answeredQuestKeysRef.has(questKey)
      || await hasDailyPhraseQuestAnswered({ phraseId, date, studyTarget }).catch(noteSwallowedAs('DailyPhraseCard:openDetails.hasDailyPhraseQuestAnswered', false));

    if (alreadyAnswered) {
      setQuestAnswered(true);
      setShowQuestExplanation(true);
      setQuestPreviouslyAnswered(true);
      setSelectedQuestOptionId(null);
      explanationAnim.setValue(1);
      successAnim.setValue(0);
    }

    await dailyIntro.request();
    checkAchievements({ type: 'daily_phrase', action: 'read', studyTarget }).catch(noteSwallowedHandler('DailyPhraseCard:openDetails.checkAchievements'));
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
    const questKey = `${studyTarget === 'en' ? '' : `${studyTarget}:`}${date}:${phraseId}`;
    answeredQuestKeysRef.add(questKey);
    setSelectedQuestOptionId(optionId);
    setQuestAnswered(true);
    setQuestPreviouslyAnswered(false);
    revealQuestExplanation();
    markDailyPhraseQuestAnswered({ phraseId, date, studyTarget }).catch(noteSwallowedHandler('DailyPhraseCard:handleQuestOptionPress.markDailyPhraseQuestAnswered'));

    const correct = isDailyPhraseQuestAnswerCorrect(questOptions, optionId);
    if (!correct) {
      runWrongAnswerShake();
      return;
    }

    runCorrectAnswerAnimation();
  };

  return (
    <>
      <Animated.View
        style={homeAdditional ? { transform: [{ scale: homePulseScale }] } : undefined}
      >
        {homeV2 ? (
        <Pressable
          testID="home-v2-phrase-of-day"
          onPress={openDetails}
          accessibilityRole="button"
          accessibilityLabel={cardLiteral ? `${title}. ${phrase.english}. ${cardLiteral}` : `${title}. ${phrase.english}.`}
          style={({ pressed }) => [styles.v2Card, v2Glass, pressed && styles.pressed]}
        >
          {/* зачем: владелец 24.09 — арт не должен читаться отдельным блоком от иконки;
              картинка сама служит иконкой-цитатой, без второго графического слоя. */}
          <Image source={phraseArt} style={sceneLook ? styles.v2ArtScene : styles.v2Art} contentFit="contain" accessible={false} />
          <View style={sceneLook ? styles.v2CopyScene : styles.v2Copy}>
            <Text style={[sceneLook ? styles.v2KickerScene : styles.v2Kicker, { color: v2.textSecondary }]}>{sceneLook ? title : title.toUpperCase()}</Text>
            <Text style={[sceneLook ? styles.v2PhraseScene : styles.v2Phrase, { color: v2.text }]}>{phrase.english}</Text>
            {cardLiteral && !sceneLook ? (
              <Text style={[styles.v2Translation, { color: v2.textSecondary }]}>{cardLiteral}</Text>
            ) : null}
          </View>
          {sceneLook ? <Ionicons name="chevron-forward" size={18} color={v2.textSecondary} accessible={false} /> : null}
          {/* зачем (владелец через координатора 18.10): на карточке «Фраза дня» нет ни звезды (сохранить), ни «Озвучить» — они есть, когда фразу открывают (шторка). Карточка целиком нажимается и открывает фразу. */}
        </Pressable>
        ) : (
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
          {homeAdditional && (
            <View style={styles.homeAdditionalArtSlot}>
              <Image source={phraseOfDayArt} style={styles.homeAdditionalArt} contentFit="contain" accessible={false} />
            </View>
          )}
          {!homeAdditional && (
            <View style={[styles.plaqueIcon, { backgroundColor: chrome.iconBg, borderColor: chrome.iconBorder }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={22} color={chrome.title} />
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
        )}
      </Animated.View>

      <FeatureIntroModal visible={dailyIntro.visible} icon={dailyIntroDef.icon} family={dailyIntroDef.family} art={dailyIntroDef.art}
        title={dailyIntroDef.title(lang)} body={dailyIntroDef.body(lang)} ctaLabel={dailyIntroDef.ctaLabel(lang)} laterLabel={featureIntroClose(lang)}
        onDone={dailyIntro.close} onLater={dailyIntro.close} onDismissed={dailyIntro.finish} testIdPrefix="daily_phrase_first_visit" introId={dailyIntroDef.id} />
      <Modal
        visible={detailsVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeDetails}
      >
        <SheetSwipeRoot>
        <View style={styles.modalRoot}>
          <Animated.View style={[styles.backdrop, { opacity: modalEntranceAnim }]}>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={closeDetails} />
          </Animated.View>
          {/* зачем (координатор 14.10, «ручка ⇒ свайп»): свайп вниз закрывает детали фразы дня тем же closeDetails, что фон и крестик; лист едет за пальцем. Высоту 86 % держит внешний слой */}
          <SheetSwipeClose name="daily-phrase-details" onClose={closeDetails} wrapStyle={{ flexShrink: 1, maxHeight: '86%', minHeight: 0 }}>
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: glassFill(t.bgCard, 0.46),
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
                <Ionicons name="chatbubble-ellipses-outline" size={24} color={t.textMuted} />
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
                {(questAnswered || !hasValidQuest) && phrase.allowSave !== false && !noSourceExplanation && (
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
                {(showQuestExplanation || !hasValidQuest) && (
                  <Pressable
                    onPress={() => { const en = phrase.english?.trim(); if (en) speak(en, undefined, { language: inferExpoSpeechLanguage(en, studyTarget) }); }}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={triLang(lang, {
                      uk: 'Озвучити', ru: 'Озвучить', en: 'Play', es: 'Reproducir',
                      'pt-BR': 'Reproduzir', vi: 'Phát', id: 'Putar', tr: 'Seslendir', pl: 'Odtwórz',
                    })}
                    style={({ pressed }) => [
                      styles.closeButton,
                      { backgroundColor: t.bgSurface2 },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons name="volume-high" size={20} color={t.accentText} />
                  </Pressable>
                )}
                <Pressable
                  onPress={closeDetails}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' })}
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

            <ScrollView decelerationRate="fast"
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {!questAnswered && hasValidQuest && (
                <View style={styles.questBlock}>
                  <Text style={[styles.questQuestion, { color: t.textPrimary, fontSize: f.bodyLg || f.body }]}>
                    {triLang(lang, {
                      ru: 'Что это значит?',
                      uk: 'Що це означає?',
                      en: 'What does this mean?',
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
                          testID={dailyPhraseOptionTestId(questOptions, optionIndex)}
                          onPress={() => handleQuestOptionPress(option.id)}
                          accessibilityRole="button"
                          accessibilityLabel={`${optionIndex + 1}. ${option.text}`}
                          style={({ pressed }) => [
                            styles.questOption,
                            {
                              backgroundColor: t.bgCard,
                            },
                            pressed && styles.pressed,
                          ]}
                        >
                          <View style={[styles.optionMarker, { backgroundColor: t.accent }]}>
                            <Text style={[styles.optionMarkerText, { color: t.textOnGold, fontSize: f.caption }]}>
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
                </View>
              )}

              {(showQuestExplanation || !hasValidQuest) && !noSourceExplanation && (
                <Animated.View
                  style={[
                    styles.explanationWrap,
                    {
                      opacity: hasValidQuest ? explanationAnim : 1,
                      transform: [{
                        translateY: hasValidQuest
                          ? explanationAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [12, 0],
                          })
                          : 0,
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
                        {triLang(lang, { ru: 'Верно!', uk: 'Правильно!', en: 'Correct!', es: '¡Correcto!', 'pt-BR': 'Correto!', vi: 'Đúng rồi!', id: 'Benar!', tr: 'Doğru!', pl: 'Dobrze!' })}
                      </Text>
                    </Animated.View>
                  )}
                  {selectedQuestOption?.feedback && (
                    <TonalSurface
                      accessibilityRole="text"
                      accessibilityLiveRegion="polite"
                      accessibilityLabel={`${selectedQuestCorrect
                        ? triLang(lang, { ru: 'Верно', uk: 'Правильно', en: 'Correct', es: 'Correcto', 'pt-BR': 'Correto', vi: 'Đúng', id: 'Benar', tr: 'Doğru', pl: 'Poprawnie' })
                        : triLang(lang, { ru: 'Не совсем', uk: 'Не зовсім', en: 'Not quite', es: 'No exactamente', 'pt-BR': 'Não exatamente', vi: 'Chưa đúng', id: 'Belum tepat', tr: 'Tam değil', pl: 'Niezupełnie' })}. ${selectedQuestOption.feedback}`}
                      radius={16}
                      tone="subtle"
                      backgroundColor={selectedQuestCorrect ? t.correctBg : t.wrongBg}
                      style={[styles.questDiagnostic, { borderColor: selectedQuestCorrect ? t.correct : t.wrong }]}
                    >
                      <View style={styles.questDiagnosticHeader}>
                        <Ionicons
                          name={selectedQuestCorrect ? 'checkmark-circle-outline' : 'information-circle-outline'}
                          size={20}
                          color={selectedQuestCorrect ? t.correct : t.wrong}
                        />
                        <Text style={[styles.questDiagnosticTitle, { color: t.textPrimary, fontSize: f.label }]}>
                          {selectedQuestCorrect
                            ? triLang(lang, { ru: 'Верно', uk: 'Правильно', en: 'Correct', es: 'Correcto', 'pt-BR': 'Correto', vi: 'Đúng', id: 'Benar', tr: 'Doğru', pl: 'Poprawnie' })
                            : triLang(lang, { ru: 'Не совсем', uk: 'Не зовсім', en: 'Not quite', es: 'No exactamente', 'pt-BR': 'Não exatamente', vi: 'Chưa đúng', id: 'Belum tepat', tr: 'Tam değil', pl: 'Niezupełnie' })}
                        </Text>
                      </View>
                      <Text style={[styles.questDiagnosticText, { color: t.accentText, fontSize: f.body }]}>
                        {selectedQuestOption.feedback}
                      </Text>
                    </TonalSurface>
                  )}
                  {/* зачем (владелец 01.10, скрин «Фраза дня»): три одинаковые карточки с подписью сверху, без цветной рамки и полоски. */}
                  <TonalSurface radius={16} tone="subtle" backgroundColor={t.bgSurface2} style={styles.detailBlock}>
                    <Text style={[styles.detailLabel, { color: t.textMuted, fontSize: f.caption }]}>
                      {labelLiteral}
                    </Text>
                    <Text style={[styles.detailText, { color: t.textPrimary, fontSize: f.body }]}>
                      {phraseCopy.literal}
                    </Text>
                  </TonalSurface>

                  <TonalSurface radius={16} tone="subtle" backgroundColor={t.bgSurface2} style={styles.detailBlock}>
                    <Text style={[styles.detailLabel, { color: t.textMuted, fontSize: f.caption }]}>
                      {labelMeaning}
                    </Text>
                    <Text style={[styles.detailText, { color: t.textPrimary, fontSize: f.body }]}>
                      {phraseCopy.meaning}
                    </Text>
                  </TonalSurface>

                  <TonalSurface radius={16} tone="subtle" backgroundColor={t.bgSurface2} style={styles.detailBlock}>
                    <Text style={[styles.detailLabel, { color: t.textMuted, fontSize: f.caption }]}>
                      {labelExample}
                    </Text>
                    <Text style={[styles.storyText, { color: t.textPrimary, fontSize: f.body }]}>
                      {phraseCopy.text}
                    </Text>
                  </TonalSurface>
                </Animated.View>
              )}
            </ScrollView>

          </Animated.View>
          </SheetSwipeClose>
        </View>
        </SheetSwipeRoot>
      </Modal>
    </>
  );
}

export default memo(DailyPhraseCard);

const styles = StyleSheet.create({
  // ── «Фраза дня» новой Главной: текст и действия слева, крупный арт справа.
  // Высота ≈ 80 (владелец 04.10: «в два раза ниже»): три строки текста слева,
  // кнопки столбиком и арт 72 справа — геометрия первого кадра сразу финальная.
  v2Card: {
    minHeight: 80,
    borderRadius: V2.radius.card,
    // зачем (владелец 12.10, стиль «Тень» + сверка снимков 6b3890202): без обводок — кнопку отделяют тон фона и малая внешняя тень: рамки у карточки нет, отделяет тон и тень плашки.
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 14,
    gap: 12,
    overflow: 'hidden',
  },
  v2Art: { position: 'absolute', right: 8, top: 4, width: 72, height: 72 },
  // зачем (владелец 22.10, scenes-compact в.2 `.pod`; снимок Сверки home3): со «Сценой» Главной картинка слева 52×52 в потоке, подпись обычным регистром, справа шеврон — карточка с картинкой, как в макете; без «Сцены» прежний вид 1:1 (Ревизор: выпускная Главная не меняется)
  v2ArtScene: { width: 52, height: 52 },
  v2Quote: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  v2QuoteMark: { fontSize: 30, lineHeight: 36, fontWeight: '800', marginTop: 6 },
  // зачем (18.10): кнопок справа от текста больше нет — запас под арт (72 + 8 справа) вместо 122; minHeight карточки 80 держит высоту ровной
  v2Copy: { flex: 1, minWidth: 0, paddingRight: 80 },
  v2CopyScene: { flex: 1, minWidth: 0 },
  v2Kicker: { ...V2_TYPE.overline },
  v2KickerScene: { fontSize: 13, lineHeight: 17 },
  v2Phrase: { fontSize: 19, lineHeight: 23, fontWeight: '800', letterSpacing: -0.3, marginTop: 2 },
  v2PhraseScene: { fontSize: 16, lineHeight: 21, fontWeight: '700', marginTop: 2 },
  v2Translation: { ...V2_TYPE.body, marginTop: 1 },
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
    paddingVertical: 8,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 1.02 }],
  },
  plaqueIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    zIndex: 2,
  },
  homeAdditionalArt: {
    width: HOME_ADDITIONAL_ART_SIZE,
    height: HOME_ADDITIONAL_ART_SIZE,
  },
  homeAdditionalArtSlot: {
    width: HOME_ADDITIONAL_ART_SLOT_WIDTH,
    height: HOME_ADDITIONAL_ART_SLOT_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  homeAdditionalCopy: {
    alignItems: 'flex-start',
    flex: 1,
    minWidth: 0,
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
    textAlign: 'left',
  },
  homeAdditionalKicker: {
    fontWeight: '900',
    letterSpacing: 0.7,
    marginBottom: 4,
    textAlign: 'left',
    textTransform: 'uppercase',
  },
  homeAdditionalPhrase: {
    fontWeight: '900',
    flexShrink: 1,
    textAlign: 'left',
  },
  homeAdditionalSub: {
    fontWeight: '800',
    lineHeight: 19,
    marginTop: 5,
    textAlign: 'left',
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
    backgroundColor: 'rgba(0,0,0,0.58)', // theme-exempt: скрим под шторкой — затемнение одинаково в обоих оформлениях
  },
  sheet: {
    width: '100%',
    flexShrink: 1, // зачем: внутри внешнего слоя свайпа лист сжимается вместе с ним (86 % держит обёртка)
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
    borderWidth: 2, // shadow-ok: кольцо-вспышка успеха (анимация-эффект), не контейнер
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
    borderRadius: 16, // зачем (владелец 12.10, стиль «Тень»): без обводки — отделяют тон и тень (блок деталей: тон subtle)
    padding: 14,
  },
  detailLabel: {
    fontWeight: '700',
    letterSpacing: 1.6,
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
  questBlock: {
    padding: 0,
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
  questDiagnostic: {
    borderWidth: 1, // shadow-ok: контур вердикта верно/неверно (цвет задаёт исход ответа), не обводка контейнера
    padding: 13,
  },
  questDiagnosticHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  questDiagnosticTitle: {
    fontWeight: '900',
  },
  questDiagnosticText: {
    fontWeight: '600',
    lineHeight: 22,
  },
  explanationWrap: {
    gap: 12,
  },
});
