import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import { triLang } from '../constants/i18n';
import { hapticTap, hapticSuccess } from '../hooks/use-haptics';
import {
  PROBLEM_COACH_LESSONS,
  type CoachAccent,
  type CoachExercise,
  type CoachBlock,
} from './problem_explanations_v2';
import type { WordCategory } from './phrase_analytics';

type CoachStage = 'diagnosis' | 'coaching' | 'exercise' | 'feedback' | 'consolidation';

const WRONG_THRESHOLD_FOR_REVIEW = 1;

const ACCENT_MAP: Record<CoachAccent, { main: string; soft: string; border: string }> = {
  gold: {
    main: '#D4AF37',
    soft: 'rgba(212,175,55,0.12)',
    border: 'rgba(212,175,55,0.32)',
  },
  red: {
    main: '#FF5B5B',
    soft: 'rgba(255,91,91,0.11)',
    border: 'rgba(255,91,91,0.30)',
  },
  green: {
    main: '#34D399',
    soft: 'rgba(52,211,153,0.11)',
    border: 'rgba(52,211,153,0.30)',
  },
  blue: {
    main: '#60A5FA',
    soft: 'rgba(96,165,250,0.11)',
    border: 'rgba(96,165,250,0.30)',
  },
  purple: {
    main: '#A78BFA',
    soft: 'rgba(167,139,250,0.11)',
    border: 'rgba(167,139,250,0.30)',
  },
};

const FALLBACK_TEXT = {
  ru: 'Аналитика уже видит эту проблему, но новый тренерский разбор для неё ещё не подключён. Начни с тренировки слабых мест или вернись к аналитике.',
  uk: 'Аналітика вже бачить цю проблему, але новий тренерський розбір для неї ще не підключено. Почни з тренування слабких місць або повернись до аналітики.',
  es: 'La analítica ya detectó este problema, pero el nuevo entrenamiento guiado aún no está conectado. Empieza con el repaso de puntos débiles o vuelve al análisis.',
};

export default function ProblemCoach() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();

  const cat = (category ?? 'article') as WordCategory;
  const lesson = PROBLEM_COACH_LESSONS[cat];

  const [stage, setStage] = useState<CoachStage>('diagnosis');
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [wrongCount, setWrongCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const fadeTransition = useCallback(
    (fn: () => void) => {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.delay(40),
      ]).start(() => {
        fn();
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      });
    },
    [fadeAnim],
  );

  const hasExercises = Boolean(lesson?.exercises?.length);

  const currentExercise: CoachExercise | undefined = hasExercises
    ? lesson.exercises[exerciseIndex]
    : undefined;

  const isLastExercise = hasExercises ? exerciseIndex >= lesson.exercises.length - 1 : true;

  const progressIndex = useMemo(() => {
    if (stage === 'diagnosis') return 0;
    if (stage === 'coaching') return 1;
    if (stage === 'exercise' || stage === 'feedback') return 2;
    return 3;
  }, [stage]);

  const handleBack = () => {
    hapticTap();
    if (router.canGoBack()) router.back();
    else router.replace('/phrase_analytics_screen' as any);
  };

  const goToCoaching = () => {
    hapticTap();
    fadeTransition(() => setStage('coaching'));
  };

  const goToExercise = () => {
    hapticTap();
    fadeTransition(() => {
      setExerciseIndex(0);
      setSelectedOption(null);
      setStage('exercise');
    });
  };

  const handleSelectOption = (idx: number) => {
    if (!currentExercise || selectedOption !== null) return;
    hapticTap();
    setSelectedOption(idx);
    const isCorrect = idx === currentExercise.correctIndex;
    if (isCorrect) {
      hapticSuccess();
      setCorrectCount((v) => v + 1);
    } else {
      setWrongCount((v) => v + 1);
    }
    fadeTransition(() => setStage('feedback'));
  };

  const handleFeedbackNext = () => {
    hapticTap();
    if (!hasExercises || isLastExercise) {
      fadeTransition(() => setStage('consolidation'));
      return;
    }
    fadeTransition(() => {
      setExerciseIndex((i) => i + 1);
      setSelectedOption(null);
      setStage('exercise');
    });
  };

  const handleStartConsolidation = () => {
    hapticTap();
    router.push({
      pathname: '/review',
      params: { trainerMode: 'mistakes', category: cat },
    } as any);
  };

  const renderHeader = () => (
    <View style={[styles.header, { borderBottomColor: t.border }]}>
      <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={10}>
        <Ionicons name="chevron-back" size={24} color={t.textPrimary} />
      </TouchableOpacity>

      <View style={styles.headerCenter}>
        <Text style={[styles.headerTitle, { color: t.textPrimary, fontSize: f.sub }]}>
          Problem Coach
        </Text>
        <Text style={[styles.headerSub, { color: t.textMuted, fontSize: f.caption }]}>
          {triLang(lang, {
            ru: 'личный разбор ошибки',
            uk: 'особистий розбір помилки',
            es: 'análisis personal del error',
          })}
        </Text>
      </View>

      <View style={styles.backBtn} />
    </View>
  );

  const renderProgress = () => {
    const labels = [
      triLang(lang, { ru: 'Диагноз', uk: 'Діагноз', es: 'Diagnóstico' }),
      triLang(lang, { ru: 'Разбор', uk: 'Розбір', es: 'Guía' }),
      triLang(lang, { ru: 'Практика', uk: 'Практика', es: 'Práctica' }),
      triLang(lang, { ru: 'Закрепление', uk: 'Закріплення', es: 'Consolidación' }),
    ];

    return (
      <View style={styles.progressWrap}>
        <View style={styles.dotsRow}>
          {labels.map((label, i) => {
            const active = i <= progressIndex;
            const current = i === progressIndex;

            return (
              <View key={label} style={styles.dotItem}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: active ? '#D4AF37' : t.border,
                      width: current ? 22 : 8,
                    },
                  ]}
                />
                {current && (
                  <Text style={[styles.dotLabel, { color: t.textMuted, fontSize: 10 }]}>
                    {label}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderPremiumPanel = (children: React.ReactNode, extraStyle?: object) => (
    <View
      style={[
        styles.premiumPanel,
        {
          backgroundColor: t.bgCard,
          borderColor: t.border,
          shadowColor: '#000',
        },
        extraStyle,
      ]}
    >
      {children}
    </View>
  );

  const renderHero = () => {
    if (!lesson?.blocks?.length) {
      return renderPremiumPanel(
        <>
          <View style={styles.fallbackIcon}>
            <Ionicons name="construct-outline" size={28} color="#D4AF37" />
          </View>

          <Text style={[styles.heroLabel, { color: '#D4AF37' }]}>COACH UPDATE</Text>

          <Text style={[styles.heroTitle, { color: t.textPrimary, fontSize: f.h2 }]}>
            {triLang(lang, {
              ru: 'Разбор скоро будет обновлён',
              uk: 'Розбір скоро буде оновлено',
              es: 'La guía se actualizará pronto',
            })}
          </Text>

          <Text style={[styles.heroSubtitle, { color: t.textSecond, fontSize: f.body }]}>
            {triLang(lang, FALLBACK_TEXT)}
          </Text>

          <TouchableOpacity
            style={styles.goldButtonWrap}
            onPress={handleStartConsolidation}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={['#6b5420', '#9a7b32', '#D4AF37', '#9a7b32']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.goldButton}
            >
              <Text style={styles.goldButtonText}>
                {triLang(lang, {
                  ru: 'Тренировать слабые места',
                  uk: 'Тренувати слабкі місця',
                  es: 'Entrenar puntos débiles',
                })}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </>,
      );
    }

    return renderPremiumPanel(
      <>
        <View style={styles.heroTopRow}>
          <View style={styles.heroIconBox}>
            <Ionicons name="analytics-outline" size={27} color="#E8D5A3" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.heroLabel, { color: '#D4AF37' }]}>{lesson.heroLabel[lang]}</Text>

            <Text
              style={[styles.heroTitle, { color: t.textPrimary, fontSize: Math.max(21, f.h2) }]}
            >
              {lesson.heroTitle[lang]}
            </Text>
          </View>
        </View>

        <Text style={[styles.heroSubtitle, { color: t.textSecond, fontSize: f.body }]}>
          {lesson.heroSubtitle[lang]}
        </Text>

        <View style={[styles.diagnosisBox, { borderColor: 'rgba(212,175,55,0.28)' }]}>
          <Text style={[styles.diagnosisTitle, { color: '#D4AF37', fontSize: f.label }]}>
            {lesson.diagnosisTitle[lang]}
          </Text>

          <Text style={[styles.diagnosisText, { color: t.textPrimary, fontSize: f.body }]}>
            {lesson.diagnosisText[lang]}
          </Text>
        </View>

        <TouchableOpacity style={styles.goldButtonWrap} onPress={goToCoaching} activeOpacity={0.88}>
          <LinearGradient
            colors={['#6b5420', '#9a7b32', '#D4AF37', '#9a7b32']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.goldButton}
          >
            <Text style={styles.goldButtonText}>
              {triLang(lang, {
                ru: 'Показать, как это исправить',
                uk: 'Показати, як це виправити',
                es: 'Mostrar cómo corregirlo',
              })}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </>,
    );
  };

  const renderCoachBlock = (block: CoachBlock, index: number) => {
    const accent = ACCENT_MAP[block.accent];

    return (
      <View
        key={`${block.type}-${index}`}
        style={[
          styles.coachBlock,
          {
            backgroundColor: accent.soft,
            borderColor: accent.border,
          },
        ]}
      >
        <View style={styles.coachBlockHeader}>
          <View
            style={[styles.blockIcon, { backgroundColor: accent.soft, borderColor: accent.border }]}
          >
            <Ionicons name={block.icon as any} size={20} color={accent.main} />
          </View>

          <Text style={[styles.blockTitle, { color: accent.main, fontSize: f.sub }]}>
            {block.title[lang]}
          </Text>
        </View>

        <Text style={[styles.blockBody, { color: t.textPrimary, fontSize: f.body }]}>
          {block.body[lang]}
        </Text>
      </View>
    );
  };

  const renderCoaching = () =>
    renderPremiumPanel(
      <>
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionKicker, { color: '#D4AF37' }]}>COACHING SEQUENCE</Text>

          <Text style={[styles.sectionTitle, { color: t.textPrimary, fontSize: f.h2 }]}>
            {triLang(lang, {
              ru: 'Сначала меняем способ думать',
              uk: 'Спочатку змінюємо спосіб мислення',
              es: 'Primero cambiamos la forma de pensar',
            })}
          </Text>
        </View>

        <View style={styles.blocksList}>{lesson.blocks.map(renderCoachBlock)}</View>

        <View
          style={[
            styles.exerciseIntroBox,
            { backgroundColor: t.bgSurface, borderColor: t.border },
          ]}
        >
          <Ionicons name="school-outline" size={22} color="#D4AF37" />

          <View style={{ flex: 1 }}>
            <Text style={[styles.exerciseIntroTitle, { color: t.textPrimary, fontSize: f.sub }]}>
              {lesson.exerciseIntroTitle[lang]}
            </Text>

            <Text
              style={[styles.exerciseIntroText, { color: t.textSecond, fontSize: f.caption }]}
            >
              {lesson.exerciseIntroText[lang]}
            </Text>
          </View>
        </View>

        {hasExercises ? (
          <TouchableOpacity style={styles.primaryButton} onPress={goToExercise} activeOpacity={0.88}>
            <Text style={styles.primaryButtonText}>
              {triLang(lang, {
                ru: 'Перейти к практике',
                uk: 'Перейти до практики',
                es: 'Ir a la práctica',
              })}
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleStartConsolidation}
            activeOpacity={0.88}
          >
            <Text style={styles.primaryButtonText}>
              {triLang(lang, {
                ru: 'Тренировать слабые места',
                uk: 'Тренувати слабкі місця',
                es: 'Entrenar puntos débiles',
              })}
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </>,
    );

  const renderExercise = () => {
    if (!currentExercise) return renderHero();

    return renderPremiumPanel(
      <>
        <View style={styles.exerciseTopRow}>
          <View>
            <Text style={[styles.exerciseKicker, { color: '#D4AF37' }]}>LIVE PRACTICE</Text>

            <Text style={[styles.exerciseCount, { color: t.textMuted, fontSize: f.caption }]}>
              {exerciseIndex + 1} / {lesson.exercises.length}
            </Text>
          </View>

          <View style={[styles.scorePill, { backgroundColor: t.bgSurface, borderColor: t.border }]}>
            <Text style={styles.scoreText}>✓ {correctCount}</Text>
            <Text style={styles.scoreText}>× {wrongCount}</Text>
          </View>
        </View>

        <View
          style={[
            styles.situationBox,
            {
              borderColor: 'rgba(96,165,250,0.30)',
              backgroundColor: 'rgba(96,165,250,0.10)',
            },
          ]}
        >
          <View style={styles.situationHeader}>
            <Ionicons name="location-outline" size={18} color="#60A5FA" />
            <Text style={[styles.situationTitle, { color: '#60A5FA', fontSize: f.label }]}>
              {triLang(lang, { ru: 'Ситуация', uk: 'Ситуація', es: 'Situación' })}
            </Text>
          </View>

          <Text style={[styles.situationText, { color: t.textPrimary, fontSize: f.body }]}>
            {currentExercise.situation[lang]}
          </Text>
        </View>

        <Text style={[styles.questionText, { color: t.textPrimary, fontSize: f.sub }]}>
          {currentExercise.question[lang]}
        </Text>

        <View style={[styles.sentenceBox, { backgroundColor: t.bgSurface, borderColor: t.border }]}>
          <Text style={[styles.sentenceText, { color: t.textPrimary, fontSize: Math.max(17, f.body) }]}>
            {currentExercise.sentence}
          </Text>
        </View>

        <View style={styles.optionsList}>
          {currentExercise.options.map((opt, idx) => (
            <TouchableOpacity
              key={`${opt}-${idx}`}
              style={[styles.optionButton, { backgroundColor: t.bgSurface, borderColor: t.border }]}
              onPress={() => handleSelectOption(idx)}
              activeOpacity={0.78}
            >
              <View style={[styles.optionIndex, { borderColor: t.border }]}>
                <Text style={[styles.optionIndexText, { color: t.textMuted }]}>
                  {String.fromCharCode(65 + idx)}
                </Text>
              </View>

              <Text style={[styles.optionText, { color: t.textPrimary, fontSize: f.body }]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </>,
    );
  };

  const renderFeedback = () => {
    if (!currentExercise || selectedOption === null) return renderExercise();

    const isCorrect = selectedOption === currentExercise.correctIndex;
    const mainColor = isCorrect ? '#34D399' : '#FF5B5B';
    const softColor = isCorrect ? 'rgba(52,211,153,0.11)' : 'rgba(255,91,91,0.11)';
    const borderColor = isCorrect ? 'rgba(52,211,153,0.34)' : 'rgba(255,91,91,0.34)';

    return renderPremiumPanel(
      <>
        <View style={styles.exerciseTopRow}>
          <View>
            <Text style={[styles.exerciseKicker, { color: '#D4AF37' }]}>COACH FEEDBACK</Text>

            <Text style={[styles.exerciseCount, { color: t.textMuted, fontSize: f.caption }]}>
              {exerciseIndex + 1} / {lesson.exercises.length}
            </Text>
          </View>

          <View style={[styles.scorePill, { backgroundColor: t.bgSurface, borderColor: t.border }]}>
            <Text style={styles.scoreText}>✓ {correctCount}</Text>
            <Text style={styles.scoreText}>× {wrongCount}</Text>
          </View>
        </View>

        <View
          style={[styles.sentenceBox, { backgroundColor: t.bgSurface, borderColor: t.border }]}
        >
          <Text
            style={[
              styles.sentenceText,
              { color: t.textPrimary, fontSize: Math.max(17, f.body) },
            ]}
          >
            {currentExercise.sentence}
          </Text>
        </View>

        <View style={styles.optionsList}>
          {currentExercise.options.map((opt, idx) => {
            const isRight = idx === currentExercise.correctIndex;
            const isSelected = idx === selectedOption;

            let optionBg = t.bgSurface;
            let optionBorder = t.border;
            let optionColor = t.textPrimary;

            if (isRight) {
              optionBg = 'rgba(52,211,153,0.13)';
              optionBorder = '#34D399';
              optionColor = '#34D399';
            } else if (isSelected) {
              optionBg = 'rgba(255,91,91,0.13)';
              optionBorder = '#FF5B5B';
              optionColor = '#FF5B5B';
            }

            return (
              <View
                key={`${opt}-${idx}`}
                style={[
                  styles.optionButton,
                  { backgroundColor: optionBg, borderColor: optionBorder },
                ]}
              >
                <View style={[styles.optionIndex, { borderColor: optionBorder }]}>
                  <Text style={[styles.optionIndexText, { color: optionColor }]}>
                    {String.fromCharCode(65 + idx)}
                  </Text>
                </View>

                <Text style={[styles.optionText, { color: optionColor, fontSize: f.body }]}>
                  {opt}
                </Text>

                {isRight && <Ionicons name="checkmark-circle" size={20} color="#34D399" />}
                {!isRight && isSelected && (
                  <Ionicons name="close-circle" size={20} color="#FF5B5B" />
                )}
              </View>
            );
          })}
        </View>

        <View style={[styles.feedbackBox, { backgroundColor: softColor, borderColor }]}>
          <View style={[styles.feedbackIconBox, { backgroundColor: softColor, borderColor }]}>
            <Ionicons
              name={isCorrect ? 'checkmark-circle-outline' : 'alert-circle-outline'}
              size={24}
              color={mainColor}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.feedbackTitle, { color: mainColor, fontSize: f.sub }]}>
              {isCorrect
                ? triLang(lang, { ru: 'Да, это оно', uk: 'Так, це воно', es: 'Sí, eso es' })
                : triLang(lang, {
                    ru: 'Вот где сбилась логика',
                    uk: 'Ось де збилась логіка',
                    es: 'Aquí falló la lógica',
                  })}
            </Text>

            <Text style={[styles.feedbackText, { color: t.textPrimary, fontSize: f.body }]}>
              {isCorrect
                ? currentExercise.correctReason[lang]
                : currentExercise.wrongReason[lang]}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.tipBox,
            {
              backgroundColor: 'rgba(212,175,55,0.10)',
              borderColor: 'rgba(212,175,55,0.30)',
            },
          ]}
        >
          <Ionicons name="bulb-outline" size={20} color="#D4AF37" />

          <Text style={[styles.tipText, { color: t.textPrimary, fontSize: f.caption }]}>
            {currentExercise.coachTip[lang]}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleFeedbackNext}
          activeOpacity={0.88}
        >
          <Text style={styles.primaryButtonText}>
            {isLastExercise
              ? triLang(lang, {
                  ru: 'Показать результат',
                  uk: 'Показати результат',
                  es: 'Mostrar resultado',
                })
              : triLang(lang, {
                  ru: 'Следующая ситуация',
                  uk: 'Наступна ситуація',
                  es: 'Siguiente situación',
                })}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </>,
    );
  };

  const renderConsolidation = () => {
    const total = hasExercises ? lesson.exercises.length : 0;
    const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const needsReview = wrongCount >= WRONG_THRESHOLD_FOR_REVIEW;

    const resultTitle =
      total === 0
        ? triLang(lang, {
            ru: 'Можно перейти к тренировке',
            uk: 'Можна перейти до тренування',
            es: 'Puedes pasar al entrenamiento',
          })
        : pct >= 85
          ? triLang(lang, { ru: 'Сильный результат', uk: 'Сильний результат', es: 'Resultado fuerte' })
          : pct >= 60
            ? triLang(lang, {
                ru: 'Логика уже складывается',
                uk: 'Логіка вже складається',
                es: 'La lógica ya se está formando',
              })
            : triLang(lang, {
                ru: 'Тему нужно дожать',
                uk: 'Тему треба дотиснути',
                es: 'Hay que reforzar este tema',
              });

    const resultText =
      total === 0
        ? triLang(lang, FALLBACK_TEXT)
        : needsReview
          ? triLang(lang, {
              ru: 'Ошибки ещё есть, и это нормально. Главное — теперь ты знаешь, где именно ломалась логика. Следующий шаг — закрепить это на реальных фразах.',
              uk: 'Помилки ще є, і це нормально. Головне — тепер ти знаєш, де саме ламалася логіка. Наступний крок — закріпити це на реальних фразах.',
              es: 'Todavía hay errores, y eso es normal. Lo importante es que ahora sabes exactamente dónde se rompía la lógica. El siguiente paso es consolidarlo con frases reales.',
            })
          : lesson.consolidationText[lang];

    return renderPremiumPanel(
      <>
        <View style={styles.resultIconWrap}>
          <LinearGradient
            colors={['rgba(212,175,55,0.18)', 'rgba(212,175,55,0.06)']}
            style={styles.resultIcon}
          >
            <Ionicons
              name={pct >= 85 ? 'trophy-outline' : needsReview ? 'fitness-outline' : 'sparkles-outline'}
              size={34}
              color="#D4AF37"
            />
          </LinearGradient>
        </View>

        <Text style={[styles.resultTitle, { color: t.textPrimary, fontSize: f.h2 }]}>
          {resultTitle}
        </Text>

        {total > 0 && (
          <View
            style={[styles.resultScoreBox, { backgroundColor: t.bgSurface, borderColor: t.border }]}
          >
            <Text style={[styles.resultScoreLabel, { color: t.textMuted, fontSize: f.caption }]}>
              {triLang(lang, { ru: 'Точность', uk: 'Точність', es: 'Precisión' })}
            </Text>

            <Text style={[styles.resultScoreValue, { color: '#D4AF37' }]}>
              {correctCount} / {total} · {pct}%
            </Text>
          </View>
        )}

        <Text style={[styles.resultText, { color: t.textSecond, fontSize: f.body }]}>
          {resultText}
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleStartConsolidation}
          activeOpacity={0.88}
        >
          <Text style={styles.primaryButtonText}>
            {triLang(lang, {
              ru: 'Закрепить на слабых фразах',
              uk: 'Закріпити на слабких фразах',
              es: 'Consolidar frases débiles',
            })}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: '#D4AF37' }]}
          onPress={handleBack}
          activeOpacity={0.82}
        >
          <Text style={[styles.secondaryButtonText, { color: '#D4AF37', fontSize: f.body }]}>
            {triLang(lang, {
              ru: 'Назад к аналитике',
              uk: 'Назад до аналітики',
              es: 'Volver al análisis',
            })}
          </Text>
        </TouchableOpacity>
      </>,
    );
  };

  const renderStageContent = () => {
    switch (stage) {
      case 'diagnosis':
        return renderHero();
      case 'coaching':
        return renderCoaching();
      case 'exercise':
        return renderExercise();
      case 'feedback':
        return renderFeedback();
      case 'consolidation':
        return renderConsolidation();
      default:
        return renderHero();
    }
  };

  return (
    <ScreenGradient>
      <SafeAreaView style={styles.root}>
        {renderHeader()}
        {renderProgress()}

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ContentWrap>
            <Animated.View style={{ opacity: fadeAnim }}>{renderStageContent()}</Animated.View>
          </ContentWrap>
        </ScrollView>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },

  backBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },

  headerTitle: {
    fontWeight: '800',
  },

  headerSub: {
    marginTop: 1,
  },

  progressWrap: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },

  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  dotItem: {
    alignItems: 'center',
    gap: 4,
  },

  dot: {
    height: 8,
    borderRadius: 4,
  },

  dotLabel: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  scroll: {
    paddingVertical: 16,
    paddingBottom: 40,
  },

  premiumPanel: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    gap: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.13,
    shadowRadius: 12,
    elevation: 4,
  },

  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },

  heroIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },

  heroTitle: {
    fontWeight: '900',
    lineHeight: 27,
  },

  heroSubtitle: {
    lineHeight: 24,
    fontWeight: '600',
  },

  diagnosisBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8,
    backgroundColor: 'rgba(212,175,55,0.07)',
  },

  diagnosisTitle: {
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  diagnosisText: {
    lineHeight: 24,
    fontWeight: '600',
  },

  goldButtonWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 2,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.34)',
  },

  goldButton: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  goldButtonText: {
    color: '#171008',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.25,
  },

  sectionHead: {
    gap: 5,
  },

  sectionKicker: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },

  sectionTitle: {
    fontWeight: '900',
    lineHeight: 28,
  },

  blocksList: {
    gap: 12,
  },

  coachBlock: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 15,
    gap: 11,
  },

  coachBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  blockIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  blockTitle: {
    flex: 1,
    fontWeight: '900',
    lineHeight: 21,
  },

  blockBody: {
    lineHeight: 24,
    fontWeight: '600',
  },

  exerciseIntroBox: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  exerciseIntroTitle: {
    fontWeight: '900',
    lineHeight: 21,
  },

  exerciseIntroText: {
    marginTop: 4,
    lineHeight: 20,
    fontWeight: '600',
  },

  primaryButton: {
    borderRadius: 16,
    backgroundColor: '#E04090',
    paddingVertical: 15,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  primaryButtonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.2,
  },

  exerciseTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  exerciseKicker: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },

  exerciseCount: {
    marginTop: 4,
    fontWeight: '800',
  },

  scorePill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    gap: 10,
  },

  scoreText: {
    color: '#D4AF37',
    fontSize: 13,
    fontWeight: '900',
  },

  situationBox: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 15,
    gap: 8,
  },

  situationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  situationTitle: {
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  situationText: {
    lineHeight: 24,
    fontWeight: '600',
  },

  questionText: {
    fontWeight: '900',
    lineHeight: 23,
  },

  sentenceBox: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },

  sentenceText: {
    lineHeight: 27,
    fontWeight: '800',
  },

  optionsList: {
    gap: 10,
  },

  optionButton: {
    borderWidth: 1.2,
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  optionIndex: {
    width: 29,
    height: 29,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  optionIndexText: {
    fontSize: 12,
    fontWeight: '900',
  },

  optionText: {
    flex: 1,
    fontWeight: '800',
    lineHeight: 22,
  },

  feedbackBox: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  feedbackIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  feedbackTitle: {
    fontWeight: '900',
    lineHeight: 22,
  },

  feedbackText: {
    marginTop: 6,
    lineHeight: 24,
    fontWeight: '600',
  },

  tipBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  tipText: {
    flex: 1,
    lineHeight: 20,
    fontWeight: '700',
  },

  resultIconWrap: {
    alignItems: 'center',
  },

  resultIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.30)',
  },

  resultTitle: {
    textAlign: 'center',
    fontWeight: '900',
    lineHeight: 29,
  },

  resultScoreBox: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },

  resultScoreLabel: {
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  resultScoreValue: {
    fontSize: 28,
    fontWeight: '900',
  },

  resultText: {
    lineHeight: 24,
    textAlign: 'center',
    fontWeight: '600',
  },

  secondaryButton: {
    borderWidth: 1.2,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButtonText: {
    fontWeight: '900',
  },

  fallbackIcon: {
    width: 66,
    height: 66,
    borderRadius: 20,
    backgroundColor: 'rgba(212,175,55,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
});
