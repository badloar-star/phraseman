import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Animated, Easing, InteractionManager, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useAudio } from '../hooks/use-audio';
import ContentWrap from '../components/ContentWrap';
import ScreenGradient from '../components/ScreenGradient';
import { useLang } from '../components/LangContext';
import { triLang } from '../constants/i18n';
import { useTheme } from '../components/ThemeContext';
import { useEnergy } from '../components/EnergyContext';
import LessonEnergyLightning from '../components/LessonEnergyLightning';
import NoEnergyModal from '../components/NoEnergyModal';
import ReportErrorButton from '../components/ReportErrorButton';
import { hapticError, hapticTap } from '../hooks/use-haptics';
import { getLessonPrepositionPack } from './lesson_prepositions';
import { registerXP } from './xp_manager';
import { addShards } from './shards_system';

const POINTS_PER_CORRECT = 2;
const POINTS_PER_PERFECT = 10;

type PrepositionProgress = {
  answeredIds: string[];
  wrongIds: string[];
};

export default function PrepositionDrillScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const lessonId = parseInt(id || '0', 10) || 0;
  const { lang } = useLang();
  const { theme: t, f, themeMode, ds } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const isLightTheme = themeMode === 'ocean' || themeMode === 'sakura';

  const pack = useMemo(() => getLessonPrepositionPack(lessonId), [lessonId]);
  const progressKey = `lesson${lessonId}_preposition_progress`;
  const [itemIdx, setItemIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredIds, setAnsweredIds] = useState<string[]>([]);
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const [reviewMode, setReviewMode] = useState(false);

  const { speak: speakAudio, stop: stopAudio } = useAudio();
  useEffect(() => () => { stopAudio(); }, [stopAudio]);

  const userNameRef = useRef<string>('');
  useEffect(() => {
    AsyncStorage.getItem('user_name').then(n => { if (n) userNameRef.current = n; });
  }, []);

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
  const { energy, maxEnergy, isUnlimited: energyUnlimited, spendOne } = useEnergy();
  const energyRef = useRef(energy);
  const energyUnlimitedRef = useRef(energyUnlimited);
  const spendOneRef = useRef(spendOne);
  useEffect(() => { energyRef.current = energy; }, [energy]);
  useEffect(() => { energyUnlimitedRef.current = energyUnlimited; }, [energyUnlimited]);
  useEffect(() => { spendOneRef.current = spendOne; }, [spendOne]);

  const [noEnergyModalOpen, setNoEnergyModalOpen] = useState(false);
  // Не открываем модал на самом первом рендере, пока EnergyContext не подгрузил
  // реальное значение из AsyncStorage (он стартует с MAX_ENERGY=5 placeholder'ом).
  const energyLoadedRef = useRef(false);
  useEffect(() => {
    const t = setTimeout(() => { energyLoadedRef.current = true; }, 80);
    return () => clearTimeout(t);
  }, []);
  // Открываем модал, если на входе энергия 0 и нет премиума.
  useEffect(() => {
    if (!energyLoadedRef.current) return;
    if (energyUnlimited) return;
    if (energy <= 0) setNoEnergyModalOpen(true);
  }, [energy, energyUnlimited]);
  // Авто-закрытие модала, когда энергия восстановилась (осколки/премиум).
  useEffect(() => {
    if (energyUnlimited || energy > 0) setNoEnergyModalOpen(false);
  }, [energyUnlimited, energy]);

  const onCloseEnergyModal = useCallback(() => {
    setNoEnergyModalOpen(false);
    // Если юзер закрыл модал, но энергию так и не восстановил и премиум не
    // купил — оставлять его на тренажёре нет смысла: вернётся к меню урока.
    if (!energyUnlimitedRef.current && energyRef.current <= 0) {
      router.back();
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
      const key = `prep_drill_perfect_${lessonId}`;
      try {
        const already = await AsyncStorage.getItem(key);
        if (already) return;
        if (userNameRef.current) {
          await registerXP(POINTS_PER_PERFECT, 'preposition_drill_perfect', userNameRef.current, lang).catch(() => {});
        }
        await addShards('preposition_drill_perfect').catch(() => {});
        await AsyncStorage.setItem(key, '1').catch(() => {});
      } catch {}
    })();
  }, [done, reviewMode, total, wrongIds.length, lessonId, lang]);

  const speakSentenceEn = useCallback((template: string, prep: string) => {
    const line = template.replace(/__/g, prep).replace(/\s+/g, ' ').trim();
    if (!line) return;
    InteractionManager.runAfterInteractions(() => {
      speakAudio(line);
    });
  }, [speakAudio]);

  /** Після відповіді блок «Неверно» + «Дальше» нижче вьюпорту — прокручуємо (особливо Android + навбар). */
  useEffect(() => {
    if (selected === null || !item) return;
    const t1 = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 160);
    const t2 = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 420);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [selected, item?.id, isCorrect]);

  if (!pack) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 }}>
              <TouchableOpacity
                onPress={() => { hapticTap(); router.back(); }}
                style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.border }}
              >
                <Ionicons name="chevron-back" size={20} color={t.textPrimary} />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700' }}>
                {triLang(lang, {
                  uk: 'У цьому уроці немає прийменників',
                  ru: 'В этом уроке нет предлогов',
                  es: 'En esta lección no hay preposiciones.',
                })}
              </Text>
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
  });
  const subtitle = triLang(lang, {
    uk: `Урок ${lessonId}: прийменники цього уроку`,
    ru: `Урок ${lessonId}: предлоги этого урока`,
    es: `Lección ${lessonId}: preposiciones de esta lección`,
  });
  const prepositionsLabel = pack.newPrepositions.map(p => p.text).join(', ');

  const onAnswer = (option: string) => {
    if (selected) return;
    const ok = option === item.correct;
    setSelected(option);
    setIsCorrect(ok);
    speakSentenceEn(item.sentenceTemplate, item.correct);
    if (ok) {
      hapticTap();
      showXpToast(POINTS_PER_CORRECT);
      setCorrectCount(v => v + 1);
      const nextAnswered = answeredIds.includes(item.id) ? answeredIds : [...answeredIds, item.id];
      const nextWrong = reviewMode ? wrongIds.filter(id => id !== item.id) : wrongIds;
      setAnsweredIds(nextAnswered);
      setWrongIds(nextWrong);
      saveProgress(nextAnswered, nextWrong);
      if (userNameRef.current) {
        registerXP(POINTS_PER_CORRECT, 'preposition_drill_answer', userNameRef.current, lang)
          .then(r => setXpToastAmount(r.finalDelta))
          .catch(() => {});
      }
    } else {
      hapticError();
      const nextAnswered = answeredIds.includes(item.id) ? answeredIds : [...answeredIds, item.id];
      const nextWrong = wrongIds.includes(item.id) ? wrongIds : [...wrongIds, item.id];
      setAnsweredIds(nextAnswered);
      setWrongIds(nextWrong);
      saveProgress(nextAnswered, nextWrong);

      // Энергия: тратим 1 единицу за ошибку. Премиум не тратит. Если до спенда
      // была 1 — после спенда упадём в 0 → показываем NoEnergyModal с задержкой,
      // чтобы успело отрисоваться "Неверно" + объяснение (см. lesson_words.tsx).
      if (!energyUnlimitedRef.current) {
        const energyBefore = energyRef.current;
        spendOneRef.current().then(success => {
          if (success && energyBefore === 1) {
            setTimeout(() => setNoEnergyModalOpen(true), 800);
          }
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
  };

  const restartAll = () => {
    stopAudio();
    setReviewMode(false);
    setItemIdx(0);
    setSelected(null);
    setIsCorrect(false);
    setCorrectCount(0);
  };

  const scrollBottomPad =
    insets.bottom + ds.spacing.xl + (Platform.OS === 'android' ? ds.spacing.lg + 8 : ds.spacing.sm);

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right', 'bottom']}>
        <ContentWrap>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 }}>
            <TouchableOpacity
              onPress={() => { hapticTap(); router.back(); }}
              style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.border }}
            >
              <Ionicons name="chevron-back" size={20} color={t.textPrimary} />
            </TouchableOpacity>
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>{title}</Text>
            <LessonEnergyLightning energyCount={energy} maxEnergy={maxEnergy} shouldShake={false} />
          </View>

          <View style={{ backgroundColor: t.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: t.border, marginBottom: 12 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>{subtitle}</Text>
          </View>

          {!done && item ? (
            <View style={{ flex: 1 }}>
              <ScrollView
                ref={scrollRef}
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: scrollBottomPad }}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                showsVerticalScrollIndicator
              >
              <Text style={{ color: t.textMuted, fontSize: f.sub, marginBottom: 8 }}>
                {triLang(lang, { uk: 'Завдання', ru: 'Задание', es: 'Ejercicio' })} {itemIdx + 1}/{total}
              </Text>

              <View style={{ backgroundColor: t.bgCard, borderRadius: ds.radius.lg, borderWidth: 1, borderColor: t.border, padding: ds.spacing.md, marginBottom: ds.spacing.md }}>
                <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', lineHeight: Math.round(f.h2 * 1.35) }}>
                  {item.sentenceTemplate}
                </Text>
              </View>

              {item.options.map(opt => {
                const isSel = selected === opt;
                const showCorrect = selected !== null && opt === item.correct;
                const bg = showCorrect ? 'rgba(21,128,61,0.2)' : isSel ? 'rgba(185,28,28,0.2)' : t.bgCard;
                const border = showCorrect ? '#15803D' : isSel ? '#B91C1C' : t.border;
                return (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => onAnswer(opt)}
                    disabled={selected !== null}
                    style={{ backgroundColor: bg, borderColor: border, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 10 }}
                  >
                    <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}

              {selected !== null && (
                <View style={{ marginTop: 6, backgroundColor: t.bgCard, borderRadius: 12, borderWidth: 1, borderColor: t.border, padding: 12 }}>
                  <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', marginBottom: 6 }}>
                    {isCorrect
                      ? triLang(lang, { uk: 'Правильно', ru: 'Верно', es: 'Correcto' })
                      : triLang(lang, { uk: 'Неправильно', ru: 'Неверно', es: 'Incorrecto' })}
                  </Text>
                  <Text style={{ color: t.textSecond, fontSize: f.sub, lineHeight: Math.round((f.sub ?? 14) * 1.45) }}>
                    {triLang(lang, {
                      uk: item.explainUK,
                      ru: item.explainRU,
                      es: item.explainES ?? item.explainRU,
                    })}
                  </Text>
                  <TouchableOpacity
                    onPress={goNext}
                    style={{ marginTop: ds.spacing.sm, backgroundColor: '#2E7D52', borderRadius: ds.radius.md, paddingVertical: ds.spacing.sm, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: f.body }}>
                      {triLang(lang, { uk: 'Далі', ru: 'Дальше', es: 'Siguiente' })}
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
                  }),
                  triLang(lang, {
                    uk: `Завдання: ${item.sentenceTemplate}`,
                    ru: `Задание: ${item.sentenceTemplate}`,
                    es: `Ejercicio: ${item.sentenceTemplate}`,
                  }),
                  triLang(lang, {
                    uk: `Варіанти: ${item.options.map(o => (o === item.correct ? `[✓${o}]` : o)).join(' | ')}`,
                    ru: `Варианты: ${item.options.map(o => (o === item.correct ? `[✓${o}]` : o)).join(' | ')}`,
                    es: `Opciones: ${item.options.map(o => (o === item.correct ? `[✓${o}]` : o)).join(' | ')}`,
                  }),
                ].join('\n')}
                style={{ alignSelf: 'center', marginTop: ds.spacing.md, marginBottom: ds.spacing.sm }}
              />
              </ScrollView>

              {selected !== null && (
                <View
                  style={{
                    paddingTop: ds.spacing.sm,
                    paddingBottom: Math.max(insets.bottom, ds.spacing.sm),
                    backgroundColor: t.bgPrimary,
                    borderTopWidth: 1,
                    borderTopColor: t.border,
                  }}
                >
                  <TouchableOpacity
                    onPress={goNext}
                    style={{
                      backgroundColor: '#2E7D52',
                      borderRadius: ds.radius.md,
                      paddingVertical: ds.spacing.md,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: f.body }}>
                      {triLang(lang, { uk: 'Далі →', ru: 'Дальше →', es: 'Siguiente →' })}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 20 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.border, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="checkmark-done-outline" size={36} color={t.correct} />
              </View>
              <Text style={{ color: t.textPrimary, fontSize: f.h1, fontWeight: '700', textAlign: 'center' }}>
                {triLang(lang, {
                  uk: 'Прийменники відпрацьовано!',
                  ru: 'Предлоги отработаны!',
                  es: '¡Preposiciones repasadas!',
                })}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.bodyLg }}>
                {triLang(lang, { uk: 'Точність: ', ru: 'Точность: ', es: 'Precisión: ' })}{accuracy}% ({correctCount}/{total})
              </Text>
              <Text style={{ color: t.textSecond, fontSize: f.body }}>
                {triLang(lang, {
                  uk: `Помилок: ${wrongIds.length}`,
                  ru: `Ошибок: ${wrongIds.length}`,
                  es: `Errores: ${wrongIds.length}`,
                })}
              </Text>

              <TouchableOpacity
                onPress={() => { hapticTap(); router.back(); }}
                style={{ backgroundColor: t.correct, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 8 }}
              >
                <Text style={{ color: t.correctText, fontSize: f.h2, fontWeight: '700' }}>
                  {triLang(lang, { uk: '← До уроку', ru: '← К уроку', es: '← Volver a la lección' })}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { hapticTap(); restartAll(); }}
                activeOpacity={0.8}
                style={{ backgroundColor: t.bgCard, paddingHorizontal: 32, paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: t.border, flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Ionicons name="refresh-outline" size={18} color={t.textSecond} />
                <Text style={{ color: t.textSecond, fontSize: f.h2, fontWeight: '600' }}>
                  {triLang(lang, { uk: 'Ще раз', ru: 'Снова', es: 'Otra vez' })}
                </Text>
              </TouchableOpacity>

              {wrongIds.length > 0 && !reviewMode && (
                <TouchableOpacity
                  onPress={() => { hapticTap(); restartWrong(); }}
                  style={{ backgroundColor: t.bgSurface, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: t.border }}
                >
                  <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                    {triLang(lang, { uk: 'Повторити помилки', ru: 'Повторить ошибки', es: 'Repasar errores' })}
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
                bottom: Math.max(24, insets.bottom + 18),
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
        </ContentWrap>

        <NoEnergyModal visible={noEnergyModalOpen} onClose={onCloseEnergyModal} />
      </SafeAreaView>
    </ScreenGradient>
  );
}
