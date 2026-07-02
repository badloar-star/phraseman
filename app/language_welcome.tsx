// ═══════════════════════════════════════════════════════════════════════════
// language_welcome — приветствие нового изучаемого языка (мини-онбординг).
//
// Открывается из пикера языков в настройках, когда пользователь добавляет язык,
// который ещё не начинал. Приветствует, задаёт два вопроса (зачем + уровень),
// сохраняет ответы в профиль языка (language_profile_v1::{target} — сырьё для
// персонального плана) и активирует язык. Прогресс каждого языка живёт в своём
// namespace, поэтому предыдущий язык ничего не теряет.
//
// Гейт: фри-аккаунт = 1 язык. Экран страхует пикер — если сюда попали в обход
// (диплинк), эффект-гейт уводит на пейвол. Replace из эффекта — ТОЛЬКО с
// markNextNavigationAsReplace (иначе петля «назад», см. navigation_back.ts).
//
// Performance Bible: статичный экран, без бесконечных анимаций и подписок;
// первый кадр — синхронный (все данные — локальные константы + параметр роута).
// ═══════════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLang } from '../components/LangContext';
import { usePremium } from '../components/PremiumContext';
import { hapticTap } from '../hooks/use-haptics';
import { markNextNavigationAsReplace } from './navigation_back';
import { openPremiumPaywall } from './paywall_navigation';
import {
  applyStudyLanguageSelection,
  getStartedStudyLanguages,
  isKnownStudyLanguage,
  saveLanguageProfile,
  shouldGateExtraLanguage,
} from './study_languages';
import {
  isStudyTargetSourceUiLang,
  studyTargetLabelForSourceUiLang,
  type StudyTargetLang,
} from './study_target_lang_dev';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type WelcomeStep = 'welcome' | 'goal' | 'level';

const FLAG_ASSETS: Partial<Record<StudyTargetLang, ImageSourcePropType>> = {
  en: require('../assets/images/flow_clean_202607/language_en.png'),
  fr: require('../assets/images/flow_clean_202607/language_fr.png'),
};
const FLAG_EMOJI: Record<StudyTargetLang, string> = { en: '🇬🇧', fr: '🇫🇷', es: '🇪🇸' };

/** Название языка в винительной форме для вопросов («Зачем тебе …?»). */
const LANGUAGE_ACCUSATIVE: Record<'ru' | 'uk', Record<StudyTargetLang, string>> = {
  ru: { en: 'английский', fr: 'французский', es: 'испанский' },
  uk: { en: 'англійська', fr: 'французька', es: 'іспанська' },
};

type ChoiceOption = {
  id: string;
  ru: string;
  uk: string;
  icon: IoniconName;
  asset?: ImageSourcePropType;
};

/** Те же id, что PersonalPlanSetupGoal в онбординге — план читает их напрямую. */
const GOAL_OPTIONS: ChoiceOption[] = [
  { id: 'series', ru: 'Понимать кино и сериалы', uk: 'Розуміти кіно й серіали', icon: 'volume-high-outline', asset: require('../assets/images/flow_clean_202607/goal_series.png') },
  { id: 'everyday', ru: 'Говорить в обычной жизни', uk: 'Говорити в повсякденному житті', icon: 'chatbubble-ellipses-outline', asset: require('../assets/images/flow_clean_202607/goal_everyday.png') },
  { id: 'travel', ru: 'Путешествовать', uk: 'Подорожувати', icon: 'airplane-outline', asset: require('../assets/images/flow_clean_202607/goal_travel.png') },
  { id: 'words', ru: 'Нужные фразы каждый день', uk: 'Потрібні фрази щодня', icon: 'cube-outline', asset: require('../assets/images/flow_clean_202607/goal_words.png') },
  { id: 'mind', ru: 'Учиться для себя', uk: 'Вчитися для себе', icon: 'school-outline', asset: require('../assets/images/flow_clean_202607/goal_mind.png') },
];

const LEVEL_OPTIONS: ChoiceOption[] = [
  { id: 'a0', ru: 'Начинаю с нуля', uk: 'Починаю з нуля', icon: 'bar-chart-outline', asset: require('../assets/images/flow_clean_202607/level_a0.png') },
  { id: 'a1', ru: 'Знаю отдельные слова', uk: 'Знаю окремі слова', icon: 'bar-chart-outline', asset: require('../assets/images/flow_clean_202607/level_a1.png') },
  { id: 'a2', ru: 'Могу поддержать простой разговор', uk: 'Можу підтримати просту розмову', icon: 'bar-chart-outline', asset: require('../assets/images/flow_clean_202607/level_a2.png') },
  { id: 'b1', ru: 'Говорю на знакомые темы', uk: 'Розмовляю на знайомі теми', icon: 'bar-chart-outline', asset: require('../assets/images/flow_clean_202607/level_b1.png') },
  { id: 'b2', ru: 'Обсуждаю почти всё', uk: 'Обговорюю майже все', icon: 'bar-chart-outline', asset: require('../assets/images/flow_clean_202607/level_b2.png') },
];

export default function LanguageWelcomeScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const { hasPremiumAccess } = usePremium();
  const params = useLocalSearchParams<{ target?: string }>();
  const rawTarget = Array.isArray(params.target) ? params.target[0] : params.target;
  const target: StudyTargetLang | null = isKnownStudyLanguage(rawTarget) ? rawTarget : null;
  const sourceUi: 'ru' | 'uk' = lang === 'uk' ? 'uk' : 'ru';
  const tr = useCallback((ru: string, uk: string) => (sourceUi === 'uk' ? uk : ru), [sourceUi]);

  const [step, setStep] = useState<WelcomeStep>('welcome');
  const [goal, setGoal] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Эффект-гейт: невалидный язык → назад; фри с ≥1 начатым языком → пейвол.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!target || !isStudyTargetSourceUiLang(lang)) {
        router.back();
        return;
      }
      const started = await getStartedStudyLanguages();
      if (cancelled) return;
      if (started.includes(target)) return; // уже начат — экран просто освежит план
      if (shouldGateExtraLanguage({ target, startedLanguages: started, hasPremiumAccess })) {
        markNextNavigationAsReplace();
        openPremiumPaywall(router, {
          context: 'language_add',
          source: 'language_welcome_gate',
          language: target,
        }, 'replace');
      }
    })();
    return () => { cancelled = true; };
  }, [target, lang, hasPremiumAccess, router]);

  const languageName = target && isStudyTargetSourceUiLang(lang)
    ? studyTargetLabelForSourceUiLang(target, lang)
    : '';
  const languageAcc = target ? LANGUAGE_ACCUSATIVE[sourceUi][target] : '';

  const activateLanguage = useCallback(() => {
    if (!target || !goal || !level || busy) return;
    void hapticTap();
    setBusy(true);
    void (async () => {
      try {
        // Повторная проверка гейта в момент действия — статус мог измениться.
        const started = await getStartedStudyLanguages();
        if (!started.includes(target)
          && shouldGateExtraLanguage({ target, startedLanguages: started, hasPremiumAccess })) {
          openPremiumPaywall(router, {
            context: 'language_add',
            source: 'language_welcome_cta',
            language: target,
          });
          return;
        }
        await saveLanguageProfile(target, { goal, level });
        await applyStudyLanguageSelection(target, lang);
        router.back();
      } finally {
        setBusy(false);
      }
    })();
  }, [target, goal, level, busy, hasPremiumAccess, lang, router]);

  if (!target) return <View style={styles.safe} />;

  const flagAsset = FLAG_ASSETS[target];
  const stepIndex = step === 'welcome' ? 0 : step === 'goal' ? 1 : 2;

  const renderOptions = (
    options: ChoiceOption[],
    selected: string | null,
    onPick: (id: string) => void,
  ) => (
    <View style={styles.optionList}>
      {options.map((item) => {
        const isSelected = selected === item.id;
        return (
          <Pressable
            key={item.id}
            testID={`language-welcome-option-${item.id}`}
            onPressIn={() => { void hapticTap(); }}
            onPress={() => onPick(item.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            style={({ pressed }) => [styles.optionCard, isSelected && styles.optionCardSelected, pressed && styles.pressed]}
          >
            {item.asset ? (
              <Image source={item.asset} style={styles.optionAsset} resizeMode="contain" />
            ) : (
              <Ionicons name={item.icon} size={32} color={isSelected ? '#E3ECFF' : '#C6D3FF'} />
            )}
            <Text style={styles.optionTitle} numberOfLines={2}>{tr(item.ru, item.uk)}</Text>
            <View style={[styles.radio, isSelected && styles.radioSelected]}>
              {isSelected ? <Ionicons name="checkmark" size={18} color="#07111F" /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );

  const primaryButton = (label: string, onPress: () => void, disabled?: boolean) => (
    <Pressable
      testID="language-welcome-primary"
      onPressIn={() => { if (!disabled && !busy) void hapticTap(); }}
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy }}
      style={({ pressed }) => [styles.primaryButtonOuter, pressed && styles.pressed, (disabled || busy) && styles.disabled]}
    >
      <LinearGradient
        colors={disabled ? ['#293044', '#293044'] : ['#E3ECFF', '#7B8CFF', '#C95CFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.primaryButton}
      >
        {busy ? <ActivityIndicator size="small" color="#07111F" /> : <Text style={styles.primaryButtonText}>{label}</Text>}
      </LinearGradient>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Pressable
          testID="language-welcome-back"
          onPressIn={() => { void hapticTap(); }}
          onPress={() => {
            if (step === 'level') { setStep('goal'); return; }
            if (step === 'goal') { setStep('welcome'); return; }
            router.back();
          }}
          hitSlop={10}
          accessibilityRole="button"
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={30} color="#DCE4FF" />
        </Pressable>
        <View style={styles.dotsRow}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dot, i <= stepIndex && styles.dotActive]} />
          ))}
        </View>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {step === 'welcome' ? (
          <View style={styles.welcomeBlock}>
            <View style={styles.flagHalo}>
              {flagAsset ? (
                <Image source={flagAsset} style={styles.flagImage} resizeMode="contain" />
              ) : (
                <Text style={styles.flagEmoji}>{FLAG_EMOJI[target]}</Text>
              )}
            </View>
            <Text style={styles.title}>
              {tr(`${languageName}. Начнём!`, `${languageName}. Почнімо!`)}
            </Text>
            <Text style={styles.subtitle}>
              {tr(
                'Отличный выбор! У каждого языка — свой план и свой прогресс: то, что ты уже выучил, никуда не денется. Ответь на пару вопросов, чтобы собрать стартовый план.',
                'Чудовий вибір! У кожної мови — свій план і свій прогрес: те, що ти вже вивчив, нікуди не зникне. Дай відповідь на пару запитань, щоб зібрати стартовий план.',
              )}
            </Text>
          </View>
        ) : null}
        {step === 'goal' ? (
          <View>
            <Text style={styles.question}>
              {tr(`Зачем тебе ${languageAcc}?`, `Навіщо тобі ${languageAcc}?`)}
            </Text>
            {renderOptions(GOAL_OPTIONS, goal, (id) => { setGoal(id); })}
          </View>
        ) : null}
        {step === 'level' ? (
          <View>
            <Text style={styles.question}>
              {tr('Сколько ты уже знаешь?', 'Скільки ти вже знаєш?')}
            </Text>
            {renderOptions(LEVEL_OPTIONS, level, (id) => { setLevel(id); })}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {step === 'welcome'
          ? primaryButton(tr('Поехали', 'Поїхали'), () => setStep('goal'))
          : step === 'goal'
            ? primaryButton(tr('Продолжить', 'Продовжити'), () => setStep('level'), !goal)
            : primaryButton(
              tr(`Начать ${languageAcc}`, `Почати ${languageAcc}`),
              activateLanguage,
              !level,
            )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#07111F' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dotsRow: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(198,211,255,0.25)' },
  dotActive: { backgroundColor: '#8AB9FF' },
  scrollContent: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 28, flexGrow: 1 },
  welcomeBlock: { alignItems: 'center', paddingTop: 26 },
  flagHalo: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: 'rgba(123,140,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  flagImage: { width: 96, height: 96 },
  flagEmoji: { fontSize: 72 },
  title: { color: '#F7FAFF', fontSize: 32, fontWeight: '800', textAlign: 'center', marginBottom: 14 },
  subtitle: { color: '#C6D3FF', fontSize: 16, lineHeight: 24, textAlign: 'center' },
  question: { color: '#F7FAFF', fontSize: 26, fontWeight: '800', marginBottom: 18, marginTop: 8 },
  optionList: { gap: 10 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(198,211,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionCardSelected: { borderColor: '#7B8CFF', backgroundColor: 'rgba(123,140,255,0.16)' },
  optionAsset: { width: 40, height: 40 },
  optionTitle: { color: '#EAF0FF', fontSize: 16, fontWeight: '600', flex: 1 },
  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: 'rgba(198,211,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { backgroundColor: '#8AB9FF', borderColor: '#8AB9FF' },
  footer: { paddingHorizontal: 22, paddingBottom: 14, paddingTop: 8 },
  primaryButtonOuter: { borderRadius: 18, overflow: 'hidden' },
  primaryButton: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  primaryButtonText: { color: '#07111F', fontSize: 17, fontWeight: '800' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.55 },
});
