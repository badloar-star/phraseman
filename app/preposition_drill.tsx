import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import TapScale from '../components/TapScale';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Animated, Easing, InteractionManager, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import ContentWrap from '../components/ContentWrap';
import ScreenGradient from '../components/ScreenGradient';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { screenTextOnGradient } from '../constants/theme';
import { useTheme } from '../components/ThemeContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useEnergy } from '../components/EnergyContext';
import EnergyBar from '../components/EnergyBar';
import NoEnergyModal from '../components/NoEnergyModal';
import ReportErrorButton from '../components/ReportErrorButton';
import BouncyScrollView from '../components/BouncyScrollView';
import ClozeGapText from '../components/ClozeGapText';
import { useAudio } from '../hooks/use-audio';
import fk from './feedback/feedback_kit';
import VictoryBurst from '../components/feedback/VictoryBurst';
import { prepDrillDoneTitle, prepDrillDoneSubtitle } from './feedback/feedback_i18n';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { getLessonPrepositionPack } from './lesson_prepositions';
import { registerXP } from './xp_manager';
import { addShards } from './shards_system';
import { useEffectivePlatformOS } from './platform_ui_preview';
import { openLessonGateByRuntime, shouldBlockLessonAccess } from './lesson_premium_gate';
import { loadSettings } from './settings_edu';
import { lessonPrepositionProgressKey, prepositionDrillPerfectKey } from './target_storage_keys';
import {
  frenchVocabularyGateCopy,
  vocabularyContentAvailableForTarget,
} from './vocabulary_target_gate';
import { safeRouterBack } from './navigation_back';
import { monoIcon, MONO_ICON } from '../constants/monoIcon';
import { glassFill } from '../components/GlassSurface';

const POINTS_PER_CORRECT = 2;
const POINTS_PER_PERFECT = 10;

const safePrepositionEventPart = (value: unknown, max = 60): string =>
  String(value ?? 'na').trim().replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, max) || 'na';

type PrepositionProgress = {
  answeredIds: string[];
  wrongIds: string[];
};

function FrenchPrepositionDrillUnavailable({ lang, onBack }: { lang: Lang; onBack: () => void }) {
  const { theme: t, f, themeMode } = useTheme();
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const copy = frenchVocabularyGateCopy('preposition_drill', lang);

  return (
    <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 16 }}>
      <View style={{ alignSelf: 'center', width: 72, height: 72, borderRadius: 36, backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="shield-checkmark-outline" size={34} color={sx.second} />
      </View>
      <Text style={{ color: sx.primary, fontSize: f.h1, fontWeight: '800', textAlign: 'center' }}>
        {copy.title}
      </Text>
      <Text style={{ color: sx.muted, fontSize: f.bodyLg, lineHeight: 24, textAlign: 'center' }}>
        {copy.body}
      </Text>
      <TouchableOpacity
        testID="preposition-drill-french-source-gate-back"
        onPress={onBack}
        activeOpacity={0.82}
        style={{ marginTop: 8, alignSelf: 'center', backgroundColor: sx.second, borderRadius: 14, paddingHorizontal: 26, paddingVertical: 13 }}
      >
        <Text style={{ color: monoIcon(themeMode, '#06111f', MONO_ICON.onLight), fontSize: f.bodyLg, fontWeight: '800' }}>
          {copy.action}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function PrepositionDrillScreen() {
  const router = useRouter();
  const effectiveOs = useEffectivePlatformOS();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const lessonId = parseInt(id || '0', 10) || 0;
  const { studyTarget } = useStudyTarget();
  useEffect(() => {
    let cancelled = false;
    void shouldBlockLessonAccess(lessonId, studyTarget).then(blocked => {
      if (!cancelled && blocked) void openLessonGateByRuntime(router, lessonId, studyTarget);
    });
    return () => { cancelled = true; };
  }, [lessonId, router, studyTarget]);
  const { lang } = useLang();
  const { theme: t, f, themeMode, ds } = useTheme();
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const scrollRef = useRef<ScrollView>(null);
  const isLightTheme = false;

  const pack = useMemo(() => getLessonPrepositionPack(lessonId, studyTarget), [lessonId, studyTarget]);
  const frenchPrepositionBlocked = !vocabularyContentAvailableForTarget(studyTarget, 'preposition_drill');
  const progressKey = lessonPrepositionProgressKey(lessonId, studyTarget);
  const [itemIdx, setItemIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  // [FeedbackKit] Локальная серия подряд-верных ответов (лесенка комбо) — только
  // ощущения; экономику/прогресс не трогает. + мини-победа на финал прогона.
  const fkComboRef = useRef(0);
  const [victoryShown, setVictoryShown] = useState(false);
  const victoryFiredRef = useRef(false);
  const [answeredIds, setAnsweredIds] = useState<string[]>([]);
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const [reviewMode, setReviewMode] = useState(false);
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  const [voiceOut, setVoiceOut] = useState(true);
  const [speechRate, setSpeechRate] = useState(0.9);

  const userNameRef = useRef<string>('');
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      AsyncStorage.getItem('user_name').then(n => { if (n) userNameRef.current = n; });
      loadSettings().then(s => { setVoiceOut(s.voiceOut); setSpeechRate(s.speechRate); });
    });
    return () => task.cancel();
  }, []);
  useEffect(() => () => { stopAudio(); }, [stopAudio]);

  // Perfect-bonus is granted once per lesson on the first clean pass
  const perfectAwardedRef = useRef(false);
  const [xpToastVisible, setXpToastVisible] = useState(false);
  const [xpToastAmount, setXpToastAmount] = useState(POINTS_PER_CORRECT);
  const xpTranslateY = useRef(new Animated.Value(44)).current;
  const xpOpacity = useRef(new Animated.Value(0)).current;

  // ── Энергия ────────────────────────────────────────────────────────────────
  // Поведение (см. lesson_words.tsx / lesson_irregular_verbs.tsx):
  //   • при ошибке (не премиум) — тратим 1 энергию;
  //   • если на входе энергии 0 — сразу показываем модал;
  //   • при попадании в 0 во время сессии — модал с задержкой 800 мс
  //     (даём отрисовать "Неверно" + объяснение);
  //   • при закрытии модала, если энергия так и не восстановилась
  //     (через осколки или премиум) — выходим из тренажёра.
  const { energy, bonusEnergy, isUnlimited: energyUnlimited, spendOne, energyReady } = useEnergy();
  const energyRef = useRef(energy);
  const energyUnlimitedRef = useRef(energyUnlimited);
  const bonusEnergyRef = useRef(bonusEnergy);
  const spendOneRef = useRef(spendOne);
  useEffect(() => { energyRef.current = energy; }, [energy]);
  useEffect(() => { energyUnlimitedRef.current = energyUnlimited; }, [energyUnlimited]);
  useEffect(() => { bonusEnergyRef.current = bonusEnergy; }, [bonusEnergy]);
  useEffect(() => { spendOneRef.current = spendOne; }, [spendOne]);

  const [noEnergyModalOpen, setNoEnergyModalOpen] = useState(false);
  /** Совпадает с spendOne(): база + подарочная очередь. */
  const totalPlayEnergy = (): number =>
    energyUnlimitedRef.current ? Number.POSITIVE_INFINITY : energyRef.current + bonusEnergyRef.current;

  // Открываем модал только после реальной загрузки из AsyncStorage (не placeholder MAX_ENERGY).
  useEffect(() => {
    if (!energyReady) return;
    if (energyUnlimited) return;
    if (energy + bonusEnergy <= 0) setNoEnergyModalOpen(true);
  }, [energyReady, energy, bonusEnergy, energyUnlimited]);

  useEffect(() => {
    if (energyUnlimited || energy + bonusEnergy > 0) setNoEnergyModalOpen(false);
  }, [energyUnlimited, energy, bonusEnergy]);

  const onCloseEnergyModal = useCallback(() => {
    setNoEnergyModalOpen(false);
    // Закрыли модал без пополнения — выходим, иначе остаёмся без права списания.
    if (!energyUnlimitedRef.current && energyRef.current + bonusEnergyRef.current <= 0) {
      safeRouterBack(router, { pathname: '/lesson_menu', params: { id: String(lessonId) } } as any);
    }
  }, [router]);

  const showXpToast = (amount: number = POINTS_PER_CORRECT) => {
    setXpToastAmount(amount);
    xpTranslateY.setValue(44);
    xpOpacity.setValue(0);
    setXpToastVisible(true);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(xpTranslateY, { toValue: 0, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(xpOpacity, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.delay(1000),
      Animated.parallel([
        Animated.timing(xpOpacity, { toValue: 0, duration: 480, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(xpTranslateY, { toValue: -12, duration: 480, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start(() => setXpToastVisible(false));
  };

  const activeItems = useMemo(() => {
    if (!pack) return [];
    if (!reviewMode) return pack.items;
    const wrongSet = new Set(wrongIds);
    return pack.items.filter(x => wrongSet.has(x.id));
  }, [pack, reviewMode, wrongIds]);
  const item = activeItems[itemIdx];
  const total = activeItems.length;
  const done = total > 0 && itemIdx >= total;
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  useEffect(() => {
    if (!pack) return;
    setReviewMode(false);
    setSelected(null);
    setIsCorrect(false);
    perfectAwardedRef.current = false;
    AsyncStorage.getItem(progressKey).then(raw => {
      try {
        const saved: PrepositionProgress = raw
          ? JSON.parse(raw)
          : { answeredIds: [], wrongIds: [] };
        const validIds = new Set(pack.items.map(x => x.id));
        const savedAnswered = Array.isArray(saved.answeredIds)
          ? saved.answeredIds.filter(id => validIds.has(id))
          : [];
        const savedWrong = Array.isArray(saved.wrongIds)
          ? saved.wrongIds.filter(id => validIds.has(id))
          : [];
        setAnsweredIds(savedAnswered);
        setWrongIds(savedWrong);
        setItemIdx(Math.min(savedAnswered.length, pack.items.length));
        setCorrectCount(Math.max(0, savedAnswered.length - savedWrong.length));
      } catch {
        setAnsweredIds([]);
        setWrongIds([]);
        setItemIdx(0);
        setCorrectCount(0);
      }
    }).catch(() => {});
  }, [pack, progressKey]);

  const saveProgress = (nextAnswered: string[], nextWrong: string[]) => {
    const payload: PrepositionProgress = { answeredIds: nextAnswered, wrongIds: nextWrong };
    AsyncStorage.setItem(progressKey, JSON.stringify(payload)).catch(() => {});
  };

  // Award the perfect-pass bonus exactly once per lesson, when the FIRST pass
  // (not the review pass) finishes with zero wrong answers.
  useEffect(() => {
    if (perfectAwardedRef.current) return;
    if (!done) return;
    if (reviewMode) return;
    if (total === 0) return;
    if (wrongIds.length > 0) return;
    perfectAwardedRef.current = true;
    (async () => {
      const key = prepositionDrillPerfectKey(lessonId, studyTarget);
      try {
        const already = await AsyncStorage.getItem(key);
        if (already) return;
        const xpResult = await registerXP(POINTS_PER_PERFECT, 'preposition_drill_perfect', userNameRef.current || '', lang, lessonId, {
          eventId: [
            'preposition',
            safePrepositionEventPart(studyTarget),
            String(lessonId),
            'perfect',
          ].join(':'),
          payload: {
            lessonId,
            studyTarget,
            total,
          },
        });
        if (Math.max(0, Math.round(xpResult.finalDelta || 0)) <= 0) {
          perfectAwardedRef.current = false;
          return;
        }
        await addShards('preposition_drill_perfect').catch(() => {});
        await AsyncStorage.setItem(key, '1').catch(() => {});
      } catch {
        perfectAwardedRef.current = false;
      }
    })();
  }, [done, reviewMode, total, wrongIds.length, lessonId, lang, studyTarget]);

  // [FeedbackKit] Мини-победа на финал прогона — один раз при первом достижении
  // конца (guard victoryFiredRef). Показываем и на обычном прогоне, и на review;
  // перфект (0 ошибок в основном прогоне) отмечаем усиленным празднованием ниже.
  useEffect(() => {
    if (!done) return;
    if (victoryFiredRef.current) return;
    victoryFiredRef.current = true;
    setVictoryShown(true);
  }, [done]);
  const speakSentenceEn = useCallback((template: string, prep: string) => {
    if (!voiceOut) return;
    const line = template.replace(/__/g, prep).replace(/\s+/g, ' ').trim();
    if (!line) return;
    InteractionManager.runAfterInteractions(() => {
      speakAudio(line, speechRate, { language: 'en-US' });
    });
  }, [speakAudio, speechRate, voiceOut]);

  /** Після відповіді пояснення може займати екран — докручуємо вниз до «Дальше», зірок і репорта (Android). */
  useEffect(() => {
    if (selected === null || !item) return;
    const t1 = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 160);
    const t2 = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 420);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [selected, item?.id, isCorrect]);

  if (frenchPrepositionBlocked) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            <FrenchPrepositionDrillUnavailable
              lang={lang}
              onBack={() => router.replace({ pathname: '/lesson_menu', params: { id: lessonId } } as any)}
            />
          </ContentWrap>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  if (!pack) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
          <View style={{ flex: 1, paddingHorizontal: ds.spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 }}>
              <TapScale
                onPress={() => safeRouterBack(router, { pathname: '/lesson_menu', params: { id: String(lessonId) } } as any)}
                style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.border }}
              >
                <Ionicons name="chevron-back" size={20} color={t.textPrimary} />
              </TapScale>
            </View>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700' }}>
                {triLang(lang, {
                  uk: 'У цьому уроці немає прийменників',
                  ru: 'В этом уроке нет предлогов',
                  es: 'En esta lección no hay preposiciones.',
                  'pt-BR': 'Esta lição não tem preposições.',
                  vi: 'Bài học này không có giới từ.',
                  id: 'Tidak ada preposisi dalam pelajaran ini.',
                  tr: 'Bu derste edat yok.',
                  pl: 'W tej lekcji nie ma przyimków.',
                })}
              </Text>
            </View>
          </View>
          </ContentWrap>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  const title = triLang(lang, {
    uk: 'Тренажер прийменників',
    ru: 'Тренажер предлогов',
    es: 'Práctica de preposiciones',
    'pt-BR': 'Prática de preposições',
    vi: 'Luyện giới từ',
    id: 'Latihan preposisi',
    tr: 'Edat alıştırması',
    pl: 'Ćwiczenie przyimków',
  });
  const subtitle = triLang(lang, {
    uk: `Урок ${lessonId}: прийменники цього уроку`,
    ru: `Урок ${lessonId}: предлоги этого урока`,
    es: `Lección ${lessonId}: preposiciones de esta lección`,
    'pt-BR': `Lição ${lessonId}: preposições desta lição`,
    vi: `Bài ${lessonId}: giới từ của bài này`,
    id: `Pelajaran ${lessonId}: preposisi di pelajaran ini`,
    tr: `Ders ${lessonId}: bu dersin edatları`,
    pl: `Lekcja ${lessonId}: przyimki z tej lekcji`,
  });
  const prepositionsLabel = pack.newPrepositions.map(p => p.text).join(', ');

  const onAnswer = (option: string) => {
    if (selected) return;
    if (!energyUnlimitedRef.current && totalPlayEnergy() <= 0) {
      setNoEnergyModalOpen(true);
      return;
    }
    const ok = option === item.correct;
    setSelected(option);
    setIsCorrect(ok);
    speakSentenceEn(item.sentenceTemplate, item.correct);
    // [FeedbackKit] Вердикт ответа (звук+вибра). Ранее: hapticSuccess+correct /
    // hapticError. fk.correct/fk.wrong дают тот же haptic + тёплый/мягкий звук,
    // fk.combo — лесенку серии. Экономика/прогресс ниже считаются как раньше.
    if (ok) {
      fkComboRef.current += 1;
      fk.correct();
      fk.combo(fkComboRef.current);
      showXpToast(POINTS_PER_CORRECT);
      setCorrectCount(v => v + 1);
      const nextAnswered = answeredIds.includes(item.id) ? answeredIds : [...answeredIds, item.id];
      const nextWrong = reviewMode ? wrongIds.filter(id => id !== item.id) : wrongIds;
      setAnsweredIds(nextAnswered);
      setWrongIds(nextWrong);
      saveProgress(nextAnswered, nextWrong);
      registerXP(POINTS_PER_CORRECT, 'preposition_drill_answer', userNameRef.current || '', lang, lessonId, {
        eventId: [
          'preposition',
          safePrepositionEventPart(studyTarget),
          String(lessonId),
          'answer',
          safePrepositionEventPart(item.id, 40),
        ].join(':'),
        payload: {
          lessonId,
          studyTarget,
          itemId: item.id,
          reviewMode,
        },
      })
        .then(r => setXpToastAmount(r.finalDelta))
        .catch(() => {});
    } else {
      // [FeedbackKit] Обрыв заметной серии → «шипение остывания», иначе мягкий «туп».
      const brokeFrom = fkComboRef.current;
      fkComboRef.current = 0;
      if (brokeFrom >= 3) fk.comboBreak(brokeFrom);
      else fk.wrong();
      const nextAnswered = answeredIds.includes(item.id) ? answeredIds : [...answeredIds, item.id];
      const nextWrong = wrongIds.includes(item.id) ? wrongIds : [...wrongIds, item.id];
      setAnsweredIds(nextAnswered);
      setWrongIds(nextWrong);
      saveProgress(nextAnswered, nextWrong);

      // Энергия: тратим 1 единицу за ошибку (сначала бонусная, см. EnergyContext).
      // Модал — когда суммарно нечего было тратить к концу (не только «была база ровно 1»).
      if (!energyUnlimitedRef.current) {
        const totalBefore = energyRef.current + bonusEnergyRef.current;
        spendOneRef.current().then(success => {
          if (!success) return;
          setTimeout(() => {
            const totalAfter = energyRef.current + bonusEnergyRef.current;
            if (totalBefore > 0 && totalAfter <= 0) setNoEnergyModalOpen(true);
          }, 800);
        }).catch(() => {});
      }
    }
  };

  const goNext = () => {
    stopAudio();
    setSelected(null);
    setIsCorrect(false);
    setItemIdx(v => v + 1);
  };

  const restartWrong = () => {
    stopAudio();
    setReviewMode(true);
    setItemIdx(0);
    setSelected(null);
    setIsCorrect(false);
    setCorrectCount(0);
    // [FeedbackKit] Новый прогон — сброс серии и разрешение показать финал снова.
    fkComboRef.current = 0;
    victoryFiredRef.current = false;
    setVictoryShown(false);
  };

  const restartAll = () => {
    stopAudio();
    setReviewMode(false);
    setItemIdx(0);
    setSelected(null);
    setIsCorrect(false);
    setCorrectCount(0);
    // [FeedbackKit] Новый прогон — сброс серии и разрешение показать финал снова.
    fkComboRef.current = 0;
    victoryFiredRef.current = false;
    setVictoryShown(false);
  };

  const scrollBottomPad =
    bottomInset + ds.spacing.xl + (effectiveOs === 'android' ? ds.spacing.lg + 8 : ds.spacing.sm);

  /** Один слот `__` в шаблоне; после ответа показываем правильное слово в тексте (= item.correct), чтобы текст совпадал с блоком «Верно» и меньше ловить баги обрезки Android у `__`. */
  const renderSentenceCard = () => {
    if (!item) return null;
    const tpl = item.sentenceTemplate;
    const lh = Math.round(f.h2 * 1.35);
    const baseStyle = { color: t.textPrimary, fontSize: f.h2, fontWeight: '700' as const, lineHeight: lh };
    if (selected === null || !tpl.includes('__')) {
      return <ClozeGapText text={tpl} style={baseStyle} />;
    }
    const [before, ...rest] = tpl.split('__');
    const after = rest.join('__'); // если в шаблоне когда-нибудь окажется больше одного маркера
    const fill = (
      <Text style={{ ...baseStyle, fontWeight: '800', color: t.correct }}>{item.correct}</Text>
    );
    return (
      <Text style={baseStyle}>
        {before}
        {fill}
        {after}
      </Text>
    );
  };

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right', 'bottom']}>
        <ContentWrap>
        <View style={{ flex: 1, paddingHorizontal: ds.spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 }}>
            <TapScale
              onPress={() => safeRouterBack(router, { pathname: '/lesson_menu', params: { id: String(lessonId) } } as any)}
              style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.border }}
            >
              <Ionicons name="chevron-back" size={20} color={t.textPrimary} />
            </TapScale>
            <Text style={{ color: sx.primary, fontSize: f.body, fontWeight: '700' }}>{title}</Text>
            <EnergyBar size={30} />
          </View>

          <View style={{ backgroundColor: glassFill(t.bgSurface, 0.46), borderRadius: 14, padding: 14, borderTopWidth: 1, borderTopColor: glassFill(t.accent, 0.14), marginBottom: 12 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>{subtitle}</Text>
          </View>

          {!done && item ? (
            <View style={{ flex: 1 }}>
              <BouncyScrollView
                ref={scrollRef}
                style={{ flex: 1 }}
                decelerationRate="normal"
                contentContainerStyle={{ paddingBottom: scrollBottomPad }}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                showsVerticalScrollIndicator
                removeClippedSubviews={effectiveOs === 'android' ? false : undefined}
              >
              <Text style={{ color: sx.muted, fontSize: f.sub, marginBottom: 8 }}>
                {triLang(lang, {
                  uk: 'Завдання',
                  ru: 'Вызов',
                  es: 'Ejercicio',
                  'pt-BR': 'Exercício',
                  vi: 'Bài tập',
                  id: 'Latihan',
                  tr: 'Alıştırma',
                  pl: 'Ćwiczenie',
                })} {itemIdx + 1}/{total}
              </Text>

              <View
                style={{
                  backgroundColor: glassFill(t.bgSurface, 0.46),
                  borderRadius: ds.radius.lg,
                  borderTopWidth: 1,
                  borderTopColor: glassFill(t.accent, 0.14),
                  padding: ds.spacing.md,
                  marginBottom: ds.spacing.md,
                  ...(effectiveOs === 'android' ? { elevation: 2 } : {}),
                }}
              >
                {renderSentenceCard()}
              </View>

              {item.options.map((opt, optIdx) => {
                const isSel = selected === opt;
                const showCorrect = selected !== null && opt === item.correct;
                const bg = showCorrect ? 'rgba(21,128,61,0.2)' : isSel ? 'rgba(185,28,28,0.2)' : t.bgCard;
                const border = showCorrect ? '#15803D' : isSel ? '#B91C1C' : t.border;
                return (
                  <View
                    key={`${item.id}:${optIdx}:${opt}`}
                    collapsable={effectiveOs === 'android' ? false : undefined}
                  >
                    <TouchableOpacity
                      onPress={() => onAnswer(opt)}
                      disabled={selected !== null}
                      style={{ backgroundColor: bg, borderColor: border, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 10 }}
                    >
                    <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>{opt}</Text>
                  </TouchableOpacity>
                  </View>
                );
              })}

              {selected !== null && (
                <View style={{ marginTop: 6, backgroundColor: glassFill(t.bgCard, 0.32), borderRadius: 12, padding: 12 }}>
                  <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', marginBottom: 6 }}>
                    {isCorrect
                      ? triLang(lang, {
                        uk: 'Правильно',
                        ru: 'Верно',
                        es: 'Correcto',
                        'pt-BR': 'Correto',
                        vi: 'Đúng',
                        id: 'Benar',
                        tr: 'Doğru',
                        pl: 'Poprawnie',
                      })
                      : triLang(lang, {
                        uk: 'Майже',
                        ru: 'Почти',
                        es: 'Incorrecto',
                        'pt-BR': 'Incorreto',
                        vi: 'Sai',
                        id: 'Salah',
                        tr: 'Yanlış',
                        pl: 'Niepoprawnie',
                      })}
                  </Text>
                  <Text style={{ color: t.textSecond, fontSize: f.sub, lineHeight: Math.round((f.sub ?? 14) * 1.45) }}>
                    {triLang(lang, {
                      uk: item.explainUK,
                      ru: item.explainRU,
                      es: item.explainES ?? item.explainRU,
                      'pt-BR': item.explainPtBr ?? item.explainES ?? item.explainRU,
                      vi: item.explainVi ?? item.explainES ?? item.explainRU,
                      id: item.explainId ?? item.explainES ?? item.explainRU,
                      tr: item.explainTr ?? item.explainES ?? item.explainRU,
                      pl: item.explainPl ?? item.explainES ?? item.explainRU,
                    })}
                  </Text>
                  <TouchableOpacity
                    onPress={() => { fk.tap(); goNext(); }}
                    style={{ marginTop: ds.spacing.sm, backgroundColor: '#2E7D52', borderRadius: ds.radius.md, paddingVertical: ds.spacing.sm, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: f.body }}>
                      {triLang(lang, {
                        uk: 'Далі',
                        ru: 'Дальше',
                        es: 'Siguiente',
                        'pt-BR': 'Próximo',
                        vi: 'Tiếp theo',
                        id: 'Berikutnya',
                        tr: 'Sonraki',
                        pl: 'Dalej',
                      })}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Кнопка репорта — в конце прокрутки */}
              <ReportErrorButton
                screen="lesson_prepositions"
                dataId={`prep_drill_lesson_${lessonId}_${item.id}`}
                dataText={[
                  triLang(lang, {
                    uk: `Урок ${lessonId}, нові прийменники: ${prepositionsLabel}`,
                    ru: `Урок ${lessonId}, новые предлоги: ${prepositionsLabel}`,
                    es: `Lección ${lessonId}, nuevas preposiciones: ${prepositionsLabel}`,
                    'pt-BR': `Lição ${lessonId}, novas preposições: ${prepositionsLabel}`,
                    vi: `Bài ${lessonId}, giới từ mới: ${prepositionsLabel}`,
                    id: `Pelajaran ${lessonId}, preposisi baru: ${prepositionsLabel}`,
                    tr: `Ders ${lessonId}, yeni edatlar: ${prepositionsLabel}`,
                    pl: `Lekcja ${lessonId}, nowe przyimki: ${prepositionsLabel}`,
                  }),
                  triLang(lang, {
                    uk: `Завдання: ${item.sentenceTemplate}`,
                    ru: `Вызов: ${item.sentenceTemplate}`,
                    es: `Ejercicio: ${item.sentenceTemplate}`,
                    'pt-BR': `Exercício: ${item.sentenceTemplate}`,
                    vi: `Bài tập: ${item.sentenceTemplate}`,
                    id: `Latihan: ${item.sentenceTemplate}`,
                    tr: `Alıştırma: ${item.sentenceTemplate}`,
                    pl: `Ćwiczenie: ${item.sentenceTemplate}`,
                  }),
                  triLang(lang, {
                    uk: `Варіанти: ${item.options.map(o => (o === item.correct ? `[✓${o}]` : o)).join(' | ')}`,
                    ru: `Варианты: ${item.options.map(o => (o === item.correct ? `[✓${o}]` : o)).join(' | ')}`,
                    es: `Opciones: ${item.options.map(o => (o === item.correct ? `[✓${o}]` : o)).join(' | ')}`,
                    'pt-BR': `Opções: ${item.options.map(o => (o === item.correct ? `[✓${o}]` : o)).join(' | ')}`,
                    vi: `Lựa chọn: ${item.options.map(o => (o === item.correct ? `[✓${o}]` : o)).join(' | ')}`,
                    id: `Pilihan: ${item.options.map(o => (o === item.correct ? `[✓${o}]` : o)).join(' | ')}`,
                    tr: `Seçenekler: ${item.options.map(o => (o === item.correct ? `[✓${o}]` : o)).join(' | ')}`,
                    pl: `Opcje: ${item.options.map(o => (o === item.correct ? `[✓${o}]` : o)).join(' | ')}`,
                  }),
                ].join('\n')}
                style={{ alignSelf: 'center', marginTop: ds.spacing.md, marginBottom: ds.spacing.sm }}
                textColor={sx.muted}
              />
              </BouncyScrollView>
            </View>
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 20 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.border, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="checkmark-done-outline" size={36} color={t.correct} />
              </View>
              <Text style={{ color: sx.primary, fontSize: f.h1, fontWeight: '700', textAlign: 'center' }}>
                {triLang(lang, {
                  uk: 'Прийменники відпрацьовано!',
                  ru: 'Предлоги отработаны!',
                  es: '¡Preposiciones repasadas!',
                  'pt-BR': 'Preposições praticadas!',
                  vi: 'Đã luyện xong giới từ!',
                  id: 'Preposisi selesai dilatih!',
                  tr: 'Edatlar çalışıldı!',
                  pl: 'Przyimki przećwiczone!',
                })}
              </Text>
              <Text style={{ color: sx.muted, fontSize: f.bodyLg }}>
                {triLang(lang, {
                  uk: 'Точність: ',
                  ru: 'Точность: ',
                  es: 'Precisión: ',
                  'pt-BR': 'Precisão: ',
                  vi: 'Độ chính xác: ',
                  id: 'Akurasi: ',
                  tr: 'Doğruluk: ',
                  pl: 'Dokładność: ',
                })}{accuracy}% ({correctCount}/{total})
              </Text>
              <Text style={{ color: sx.second, fontSize: f.body }}>
                {triLang(lang, {
                  uk: `Помилок: ${wrongIds.length}`,
                  ru: `Ошибок: ${wrongIds.length}`,
                  es: `Errores: ${wrongIds.length}`,
                  'pt-BR': `Erros: ${wrongIds.length}`,
                  vi: `Lỗi: ${wrongIds.length}`,
                  id: `Kesalahan: ${wrongIds.length}`,
                  tr: `Hata: ${wrongIds.length}`,
                  pl: `Błędy: ${wrongIds.length}`,
                })}
              </Text>

              <TouchableOpacity
                onPress={() => { fk.tap(); safeRouterBack(router, { pathname: '/lesson_menu', params: { id: String(lessonId) } } as any); }}
                style={{ backgroundColor: t.correct, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 8 }}
              >
                <Text style={{ color: t.correctText, fontSize: f.h2, fontWeight: '700' }}>
                  {triLang(lang, {
                    uk: '← До уроку',
                    ru: '← К уроку',
                    es: '← Volver a la lección',
                    'pt-BR': '← Voltar para a lição',
                    vi: '← Về bài học',
                    id: '← Kembali ke pelajaran',
                    tr: '← Derse dön',
                    pl: '← Do lekcji',
                  })}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { fk.tap(); restartAll(); }}
                activeOpacity={0.8}
                style={{ backgroundColor: t.bgCard, paddingHorizontal: 32, paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: t.border, flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Ionicons name="refresh-outline" size={18} color={t.textSecond} />
                <Text style={{ color: t.textSecond, fontSize: f.h2, fontWeight: '600' }}>
                  {triLang(lang, {
                    uk: 'Ще раз',
                    ru: 'Снова',
                    es: 'Otra vez',
                    'pt-BR': 'De novo',
                    vi: 'Làm lại',
                    id: 'Ulangi',
                    tr: 'Tekrar',
                    pl: 'Jeszcze raz',
                  })}
                </Text>
              </TouchableOpacity>

              {wrongIds.length > 0 && !reviewMode && (
                <TouchableOpacity
                  onPress={() => { fk.tap(); restartWrong(); }}
                  style={{ backgroundColor: t.bgSurface, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: t.border }}
                >
                  <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                    {triLang(lang, {
                      uk: 'Закріпити промахи',
                      ru: 'Закрепить промахи',
                      es: 'Repasar fallos',
                      'pt-BR': 'Corrigir erros',
                      vi: 'Sửa lỗi',
                      id: 'Perbaiki kesalahan',
                      tr: 'Hataları düzelt',
                      pl: 'Popraw błędy',
                    })}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          {xpToastVisible && (
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                bottom: Math.max(24, bottomInset + 18),
                alignSelf: 'center',
                backgroundColor: isLightTheme ? '#92400E' : '#FFC800',
                borderRadius: 20,
                paddingHorizontal: 20,
                paddingVertical: 10,
                transform: [{ translateY: xpTranslateY }],
                opacity: xpOpacity,
                zIndex: 99999,
                elevation: 24,
              }}
            >
              <Text style={{ color: isLightTheme ? '#FFF3C4' : '#000', fontWeight: '700', fontSize: 16 }}>
                +{xpToastAmount} XP
              </Text>
            </Animated.View>
          )}
          {/* [FeedbackKit] Мини-победа на финал прогона. Перфект (основной прогон
              без ошибок) — усиленное празднование: аккорд + больше конфетти. Сам
              бонус/XP перфекта НЕ трогаем (см. эффект perfect-bonus выше). */}
          {(() => {
            const perfectRun = !reviewMode && total > 0 && wrongIds.length === 0;
            return (
              <VictoryBurst
                visible={victoryShown}
                title={prepDrillDoneTitle(lang)}
                subtitle={prepDrillDoneSubtitle(lang, correctCount, total)}
                heroEmoji={perfectRun ? '🏆' : '🎯'}
                celebrateSound={perfectRun ? 'chord' : 'medal'}
                confettiCount={perfectRun ? 120 : 60}
                onDone={() => setVictoryShown(false)}
              />
            );
          })()}
        </View>
        </ContentWrap>

        <NoEnergyModal visible={noEnergyModalOpen} onClose={onCloseEnergyModal} />
      </SafeAreaView>
    </ScreenGradient>
  );
}
