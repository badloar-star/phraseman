import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getVolumetricShadow, useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import { triLang } from '../constants/i18n';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { getVerifiedPremiumStatus } from './premium_guard';
import { logMistake } from './mistake_log';
import { getDiagnosisTraining } from './diagnosis_trainings';
import {
  applyDiagnosisAnswer,
  createDiagnosisTrainingState,
  feedbackForAnswer,
  getStepDepth,
  isDiagnosisTrainingMastered,
  nextDiagnosisStepIndex,
} from './diagnosis_training_engine';
import {
  markFreeDiagnosisCoachCompleted,
  markPersonalTrainingResolved,
  reserveFreeDiagnosisTraining,
} from './diagnosis_training_progress';
import { diagnosisCopy } from './diagnosis_training_copy';
import { getVisibleIntroLearningBlocks } from './personal_training_intro_blocks';
import type { DiagnosisTrainingRuntimeState } from './diagnosis_training_types';

type Stage = 'intro' | 'practice' | 'done';

export default function ProblemCoach() {
  const { microDiagnosisId } = useLocalSearchParams<{
    microDiagnosisId?: string;
  }>();
  const router = useRouter();
  const { theme: t, themeMode, f } = useTheme();
  const { lang } = useLang();
  const copy = (value: { ru: string; uk: string; es: string }) => diagnosisCopy(lang, value);

  const diagnosisTraining = getDiagnosisTraining(microDiagnosisId);

  const [accessChecked, setAccessChecked] = useState(false);
  const [stage, setStage] = useState<Stage>('intro');
  const [state, setState] = useState<DiagnosisTrainingRuntimeState>(() => createDiagnosisTrainingState());
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);

  const step = diagnosisTraining?.steps[state.stepIndex];
  const depth = diagnosisTraining && step ? getStepDepth(state, step) : 1;
  const feedback = step && selectedOptionId ? feedbackForAnswer(step, selectedOptionId, depth) : null;
  const mastered = diagnosisTraining ? isDiagnosisTrainingMastered(diagnosisTraining, state) : false;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const hasPremium = await getVerifiedPremiumStatus();
      if (cancelled) return;
      if (!diagnosisTraining) {
        router.replace('/trainer' as any);
        return;
      }
      if (!hasPremium) {
        const freeAllowed = await reserveFreeDiagnosisTraining(diagnosisTraining.id);
        if (cancelled) return;
        if (!freeAllowed) {
          router.replace({ pathname: '/premium_modal', params: { context: 'diagnosis_training' } } as any);
          return;
        }
      }
      setAccessChecked(true);
    })();
    return () => { cancelled = true; };
  }, [diagnosisTraining, router]);

  const handleBack = () => {
    hapticTap();
    if (router.canGoBack()) router.back();
    else router.replace('/trainer' as any);
  };

  const handleSelect = (idx: number) => {
    if (!diagnosisTraining || !step || selectedIndex !== null) return;
    const option = step.answerOptions[idx];
    if (!option) return;

    hapticTap();
    setSelectedIndex(idx);
    setSelectedOptionId(option.id);
    const nextState = applyDiagnosisAnswer(diagnosisTraining, state, option.id);
    const correct = option.id === step.correctAnswerId;
    setState(nextState);
    if (correct) {
      hapticSuccess();
      setCorrectCount((value) => value + 1);
    } else {
      setWrongCount((value) => value + 1);
      logMistake(step.sentence, 0, 'coach', 'wrong_pick', {
        tokenText: step.focusWords[0] ?? step.correctAnswerId,
        expected: step.correctAnswerId,
        picked: option.text,
        rawCategory: diagnosisTraining.category,
        category: diagnosisTraining.category,
        grammarTag: diagnosisTraining.id,
      });
    }
  };

  const handleNext = () => {
    if (!diagnosisTraining || !step || !selectedOptionId) return;
    hapticTap();
    const correct = selectedOptionId === step.correctAnswerId;
    const lastStep = state.stepIndex >= diagnosisTraining.steps.length - 1;
    if (mastered || (correct && lastStep)) {
      void markFreeDiagnosisCoachCompleted(diagnosisTraining.id);
      void markPersonalTrainingResolved({
        category: diagnosisTraining.category,
        microDiagnosisId: diagnosisTraining.id,
      });
      setStage('done');
      return;
    }
    setState((current) => ({
      ...current,
      stepIndex: correct ? nextDiagnosisStepIndex(diagnosisTraining, current, selectedOptionId) : current.stepIndex,
    }));
    setSelectedIndex(null);
    setSelectedOptionId(null);
  };

  const handleStartConsolidation = () => {
    if (!diagnosisTraining) {
      router.replace('/trainer' as any);
      return;
    }
    hapticTap();
    void markFreeDiagnosisCoachCompleted(diagnosisTraining.id);
    void markPersonalTrainingResolved({
      category: diagnosisTraining.category,
      microDiagnosisId: diagnosisTraining.id,
    });
    if (router.canGoBack()) router.back();
    else router.replace('/trainer' as any);
  };

  if (!accessChecked || !diagnosisTraining) {
    return (
      <ScreenGradient>
        <SafeAreaView style={styles.center}>
          <Text style={{ color: t.textMuted }}>...</Text>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  const renderHeader = () => (
    <View style={[styles.header, { borderBottomColor: t.border }]}>
      <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={10}>
        <Ionicons name="chevron-back" size={24} color={t.textPrimary} />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={[styles.headerTitle, { color: t.textPrimary, fontSize: f.sub }]}>
          {copy(diagnosisTraining.title)}
        </Text>
      </View>
      <View style={styles.backBtn} />
    </View>
  );

  const renderScore = () => (
    <View style={[styles.scorePill, { backgroundColor: t.bgSurface, borderColor: t.border }]}>
      <Text style={[styles.scoreText, { color: t.accent }]}>✓ {correctCount}</Text>
      <Text style={[styles.scoreText, { color: t.wrong }]}>× {wrongCount}</Text>
    </View>
  );

  const cardStyle = {
    backgroundColor: themeMode === 'minimalLight' ? '#FFFFFF' : t.bgCard,
    borderColor: t.borderHighlight,
    ...getVolumetricShadow(themeMode, t, 2),
  };
  const accentSoft = `${t.accent}18`;
  const accentBorder = `${t.accent}44`;
  const goldSoft = `${t.gold}14`;
  const goldBorder = `${t.gold}38`;

  const primaryButtonStyle = [
    styles.primaryButton,
    { backgroundColor: t.accent, borderColor: t.borderHighlight, shadowColor: t.accent },
  ];
  const primaryButtonTextStyle = [styles.primaryButtonText, { color: t.correctText, fontSize: f.bodyLg }];

  const renderIntroCard = (
    key: string,
    icon: keyof typeof Ionicons.glyphMap,
    title: string,
    children: React.ReactNode,
    accentColor = t.accent,
  ) => (
    <View key={key} style={[styles.introCard, cardStyle]}>
      <View style={[styles.stripe, { backgroundColor: `${accentColor}99` }]} />
      <View style={styles.introCardInner}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconCircle, { backgroundColor: `${accentColor}22`, borderColor: `${accentColor}55` }]}>
            <Ionicons name={icon} size={20} color={accentColor} />
          </View>
          <Text style={[styles.cardTitle, { color: accentColor, fontSize: f.caption }]}>
            {title}
          </Text>
        </View>
        {children}
      </View>
    </View>
  );

  const introLearningBlocks = getVisibleIntroLearningBlocks(diagnosisTraining);

  const renderIntro = () => (
    <View style={styles.stack}>
      {renderIntroCard(
        'hero',
        'git-compare-outline',
        triLang(lang, {
          ru: 'Личный разбор',
          uk: 'Особистий розбір',
          es: 'Diagnostico personal',
          'pt-BR': 'Análise pessoal',
          vi: 'Phân tích cá nhân',
          id: 'Analisis pribadi',
          tr: 'Kişisel analiz',
          pl: 'Analiza osobista',
        }),
        <>
          <Text style={[styles.heroTitle, { color: t.textPrimary, fontSize: Math.max(21, f.h2) }]}>
            {copy(diagnosisTraining.title)}
          </Text>
        </>,
      )}

      {renderIntroCard(
        'diagnosis',
        'search-outline',
        triLang(lang, {
          ru: 'Что именно тренируем',
          uk: 'Що саме тренуємо',
          es: 'Qué entrenamos',
          'pt-BR': 'O que vamos treinar',
          vi: 'Cần luyện gì',
          id: 'Yang dilatih',
          tr: 'Tam olarak ne çalışıyoruz',
          pl: 'Co dokładnie ćwiczymy',
        }),
        <Text style={[styles.bodyText, { color: t.textPrimary, fontSize: f.body }]}>
          {copy(diagnosisTraining.diagnosisText)}
        </Text>,
      )}

      {renderIntroCard(
        'model',
        'bulb-outline',
        triLang(lang, {
          ru: 'Модель в голове',
          uk: 'Модель у голові',
          es: 'Modelo mental',
          'pt-BR': 'Modelo mental',
          vi: 'Mô hình trong đầu',
          id: 'Model di kepala',
          tr: 'Zihindeki model',
          pl: 'Model w głowie',
        }),
        <Text style={[styles.bodyText, { color: t.textPrimary, fontSize: f.body }]}>
          {copy(diagnosisTraining.mentalModel)}
        </Text>,
        t.gold,
      )}

      {introLearningBlocks.length > 0 && renderIntroCard(
        `${diagnosisTraining.id}-intro-guide`,
        'footsteps-outline',
        triLang(lang, {
          ru: 'Короткая опора',
          uk: 'Коротка опора',
          es: 'Guia rapida',
          'pt-BR': 'Apoio rápido',
          vi: 'Gợi ý ngắn',
          id: 'Pegangan singkat',
          tr: 'Kısa destek',
          pl: 'Krótka podpowiedź',
        }),
        <View style={styles.introGuideList}>
          {introLearningBlocks.map((block, index) => {
            const blockText = copy('text' in block ? block.text : block);
            const blockKey = 'id' in block ? block.id : `${diagnosisTraining.id}-intro-${index}`;
            return (
              <View key={blockKey} style={styles.introGuideRow}>
                <View style={[styles.introGuideDot, { backgroundColor: t.gold }]} />
                <Text style={[styles.bodyText, styles.introGuideText, { color: t.textPrimary, fontSize: f.body }]}>
                  {blockText}
                </Text>
              </View>
            );
          })}
        </View>,
        t.gold,
      )}

      <TouchableOpacity style={primaryButtonStyle} onPress={() => { hapticTap(); setStage('practice'); }} activeOpacity={0.88}>
        <Text style={primaryButtonTextStyle}>
          {triLang(lang, {
            ru: 'Начать мини-проверку',
            uk: 'Почати міні-перевірку',
            es: 'Empezar mini prueba',
            'pt-BR': 'Começar mini-teste',
            vi: 'Bắt đầu kiểm tra ngắn',
            id: 'Mulai tes mini',
            tr: 'Mini testi başlat',
            pl: 'Rozpocznij mini-test',
          })}
        </Text>
        <View style={styles.ctaIconWrap}>
          <Ionicons name="arrow-forward" size={18} color={t.correctText} />
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderPractice = () => {
    if (!step) return null;
    const hasAnswered = selectedIndex !== null && Boolean(selectedOptionId);
    const mainColor = feedback?.correct ? '#34D399' : '#FF5B5B';
    const softColor = feedback?.correct ? 'rgba(52,211,153,0.11)' : 'rgba(255,91,91,0.11)';
    const borderColor = feedback?.correct ? 'rgba(52,211,153,0.34)' : 'rgba(255,91,91,0.34)';

    return (
      <View style={[styles.panel, cardStyle]}>
        <View style={styles.exerciseTopRow}>
          <View>
            <Text style={[styles.kicker, { color: t.accent }]}>
              {triLang(lang, {
                ru: 'КОРОТКАЯ ПРАКТИКА',
                uk: 'КОРОТКА ПРАКТИКА',
                es: 'MICRO PRACTICA',
                'pt-BR': 'PRÁTICA RÁPIDA',
                vi: 'LUYỆN NHANH',
                id: 'LATIHAN SINGKAT',
                tr: 'KISA PRATİK',
                pl: 'KRÓTKA PRAKTYKA',
              })}
            </Text>
            <Text style={[styles.exerciseCount, { color: t.textMuted, fontSize: f.caption }]}>
              {state.stepIndex + 1} / {diagnosisTraining.steps.length}
            </Text>
          </View>
          {renderScore()}
        </View>

        <View style={[styles.infoBox, { borderColor: accentBorder, backgroundColor: accentSoft }]}>
          <Text style={[styles.infoTitle, { color: t.accent, fontSize: f.label }]}>
            {triLang(lang, {
              ru: 'Мысль',
              uk: 'Думка',
              es: 'Idea',
              'pt-BR': 'Ideia',
              vi: 'Ý chính',
              id: 'Ide',
              tr: 'Düşünce',
              pl: 'Myśl',
            })}
          </Text>
          <Text style={[styles.bodyText, { color: t.textPrimary, fontSize: f.body }]}>
            {copy(step.explanationBlock)}
          </Text>
        </View>

        <Text style={[styles.questionText, { color: t.textPrimary, fontSize: f.sub }]}>
          {copy(step.microTask)}
        </Text>

        <View style={[styles.sentenceBox, { backgroundColor: t.bgSurface, borderColor: t.border }]}>
          <Text style={[styles.sentenceText, { color: t.textPrimary, fontSize: Math.max(17, f.body) }]}>
            {step.sentence}
          </Text>
        </View>

        <View style={styles.optionsList}>
          {step.answerOptions.map((option, idx) => {
            const isRight = option.id === step.correctAnswerId;
            const isSelected = idx === selectedIndex;
            let optionBg = t.bgSurface;
            let optionBorder = t.border;
            let optionColor = t.textPrimary;
            if (hasAnswered && isRight) {
              optionBg = 'rgba(52,211,153,0.13)';
              optionBorder = '#34D399';
              optionColor = '#34D399';
            } else if (hasAnswered && isSelected) {
              optionBg = 'rgba(255,91,91,0.13)';
              optionBorder = '#FF5B5B';
              optionColor = '#FF5B5B';
            }
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.optionButton, { backgroundColor: optionBg, borderColor: optionBorder }]}
                onPress={() => handleSelect(idx)}
                activeOpacity={hasAnswered ? 1 : 0.78}
                disabled={hasAnswered}
              >
                <View style={[styles.optionIndex, { borderColor: optionBorder }]}>
                  <Text style={[styles.optionIndexText, { color: hasAnswered ? optionColor : t.textMuted }]}>
                    {String.fromCharCode(65 + idx)}
                  </Text>
                </View>
                <Text style={[styles.optionText, { color: optionColor, fontSize: f.body }]}>
                  {option.text}
                </Text>
                {hasAnswered && isRight && <Ionicons name="checkmark-circle" size={20} color="#34D399" />}
                {hasAnswered && !isRight && isSelected && <Ionicons name="close-circle" size={20} color="#FF5B5B" />}
              </TouchableOpacity>
            );
          })}
        </View>

        {feedback && (
          <>
            <View style={[styles.feedbackBox, { backgroundColor: softColor, borderColor }]}>
              <View style={[styles.feedbackIconBox, { backgroundColor: softColor, borderColor }]}>
                <Ionicons name={feedback.correct ? 'checkmark-circle-outline' : 'alert-circle-outline'} size={24} color={mainColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.feedbackTitle, { color: mainColor, fontSize: f.sub }]}>
                  {feedback.correct
                    ? triLang(lang, {
                      ru: 'Да, именно так',
                      uk: 'Так, саме так',
                      es: 'Sí, exacto',
                      'pt-BR': 'Sim, é isso',
                      vi: 'Đúng, chính là vậy',
                      id: 'Ya, tepat begitu',
                      tr: 'Evet, tam olarak böyle',
                      pl: 'Tak, dokładnie',
                    })
                    : triLang(lang, {
                      ru: 'Почему этот вариант сбивает',
                      uk: 'Чому цей варіант збиває',
                      es: 'Por qué esta opción confunde',
                      'pt-BR': 'Por que esta opção confunde',
                      vi: 'Vì sao lựa chọn này gây nhiễu',
                      id: 'Mengapa opsi ini membingungkan',
                      tr: 'Bu seçenek neden yanıltıyor',
                      pl: 'Dlaczego ta opcja myli',
                    })}
                </Text>
                <Text style={[styles.bodyText, { color: t.textPrimary, fontSize: f.body }]}>
                  {copy(feedback.feedback)}
                </Text>
              </View>
            </View>

            {!feedback.correct && feedback.retryHint && (
              <View style={[styles.tipBox, { backgroundColor: goldSoft, borderColor: goldBorder }]}>
                <Ionicons name="bulb-outline" size={20} color={t.gold} />
                <Text style={[styles.tipText, { color: t.textPrimary, fontSize: f.caption }]}>
                  {copy(feedback.retryHint)}
                </Text>
              </View>
            )}

            <TouchableOpacity style={primaryButtonStyle} onPress={handleNext} activeOpacity={0.88}>
              <Text style={primaryButtonTextStyle}>
                {mastered
                  ? triLang(lang, {
                    ru: 'Готово',
                    uk: 'Готово',
                    es: 'Listo',
                    'pt-BR': 'Concluído',
                    vi: 'Xong',
                    id: 'Selesai',
                    tr: 'Bitti',
                    pl: 'Gotowe',
                  })
                  : feedback.correct
                    ? triLang(lang, {
                      ru: 'Дальше',
                      uk: 'Далі',
                      es: 'Continuar',
                      'pt-BR': 'Continuar',
                      vi: 'Tiếp theo',
                      id: 'Lanjut',
                      tr: 'Devam et',
                      pl: 'Dalej',
                    })
                    : triLang(lang, {
                      ru: 'Попробовать проще',
                      uk: 'Спробувати простіше',
                      es: 'Intentarlo más simple',
                      'pt-BR': 'Tentar de forma mais simples',
                      vi: 'Thử cách đơn giản hơn',
                      id: 'Coba yang lebih sederhana',
                      tr: 'Daha basit dene',
                      pl: 'Spróbuj prościej',
                    })}
              </Text>
              <View style={styles.ctaIconWrap}>
                <Ionicons name="arrow-forward" size={18} color={t.correctText} />
              </View>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  const renderDone = () => (
    <View style={[styles.panel, cardStyle]}>
      <View style={styles.resultIconWrap}>
        <LinearGradient colors={[`${t.accent}22`, `${t.accent}0D`]} style={styles.resultIcon}>
          <Ionicons name={mastered ? 'trophy-outline' : 'fitness-outline'} size={34} color={t.accent} />
        </LinearGradient>
      </View>
      <Text style={[styles.resultTitle, { color: t.textPrimary, fontSize: f.h2 }]}>
        {mastered
          ? triLang(lang, {
            ru: 'Паттерн начал собираться',
            uk: 'Патерн почав складатися',
            es: 'El patrón empieza a fijarse',
            'pt-BR': 'O padrão começou a encaixar',
            vi: 'Mẫu câu bắt đầu rõ hơn',
            id: 'Pola mulai terbentuk',
            tr: 'Kalıp oturmaya başladı',
            pl: 'Wzorzec zaczyna się układać',
          })
          : triLang(lang, {
            ru: 'Мини-практика завершена',
            uk: 'Міні-практику завершено',
            es: 'Mini practica terminada',
            'pt-BR': 'Mini-prática concluída',
            vi: 'Đã hoàn thành luyện tập ngắn',
            id: 'Latihan mini selesai',
            tr: 'Mini pratik tamamlandı',
            pl: 'Mini-praktyka zakończona',
          })}
      </Text>
      <View style={[styles.resultScoreBox, { backgroundColor: t.bgSurface, borderColor: t.border }]}>
        <Text style={[styles.resultScoreLabel, { color: t.textMuted, fontSize: f.caption }]}>
          {triLang(lang, {
            ru: 'РЕЗУЛЬТАТ',
            uk: 'РЕЗУЛЬТАТ',
            es: 'RESULTADO',
            'pt-BR': 'RESULTADO',
            vi: 'KẾT QUẢ',
            id: 'HASIL',
            tr: 'SONUÇ',
            pl: 'WYNIK',
          })}
        </Text>
        <Text style={[styles.resultScoreValue, { color: t.accent }]}>
          {triLang(lang, {
            ru: `${state.correctCount} верно · серия ${state.correctStreak}`,
            uk: `${state.correctCount} правильно · серія ${state.correctStreak}`,
            es: `${state.correctCount} correctas · racha ${state.correctStreak}`,
            'pt-BR': `${state.correctCount} corretas · sequência ${state.correctStreak}`,
            vi: `${state.correctCount} đúng · chuỗi ${state.correctStreak}`,
            id: `${state.correctCount} benar · runtutan ${state.correctStreak}`,
            tr: `${state.correctCount} doğru · seri ${state.correctStreak}`,
            pl: `${state.correctCount} poprawnie · seria ${state.correctStreak}`,
          })}
        </Text>
      </View>
      <TouchableOpacity style={primaryButtonStyle} onPress={handleStartConsolidation} activeOpacity={0.88}>
        <Text style={primaryButtonTextStyle}>
          {triLang(lang, {
            ru: 'Готово',
            uk: 'Готово',
            es: 'Listo',
            'pt-BR': 'Concluído',
            vi: 'Xong',
            id: 'Selesai',
            tr: 'Bitti',
            pl: 'Gotowe',
          })}
        </Text>
        <View style={styles.ctaIconWrap}>
          <Ionicons name="arrow-forward" size={18} color={t.correctText} />
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScreenGradient>
      <SafeAreaView style={styles.root}>
        {renderHeader()}
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <ContentWrap>
            {stage === 'intro' && renderIntro()}
            {stage === 'practice' && renderPractice()}
            {stage === 'done' && renderDone()}
          </ContentWrap>
        </ScrollView>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontWeight: '900', textAlign: 'center' },
  scroll: { paddingVertical: 14, paddingBottom: 40 },
  stack: { gap: 14 },
  introCard: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 0.5,
    flexDirection: 'row',
  },
  stripe: {
    width: 4,
  },
  introCardInner: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cardTitle: {
    flex: 1,
    fontWeight: '800',
    letterSpacing: 1.0,
    textTransform: 'uppercase',
  },
  panel: {
    borderWidth: 0.5,
    borderRadius: 18,
    padding: 18,
    gap: 16,
  },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.6, textTransform: 'uppercase' },
  heroTitle: { marginTop: 1, fontWeight: '800', lineHeight: 28 },
  bodyText: { lineHeight: 23, fontWeight: '500' },
  introGuideList: { gap: 12 },
  introGuideRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  introGuideDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 9,
  },
  introGuideText: {
    flex: 1,
  },
  infoBox: { borderWidth: 0.5, borderRadius: 14, padding: 14, gap: 8 },
  infoTitle: { fontWeight: '800', letterSpacing: 1.0, textTransform: 'uppercase' },
  exerciseTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  exerciseCount: { marginTop: 4, fontWeight: '800' },
  scorePill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    gap: 10,
  },
  scoreText: { fontWeight: '800', fontSize: 14 },
  questionText: { fontWeight: '800', lineHeight: 24 },
  sentenceBox: { borderWidth: 0.5, borderRadius: 16, padding: 18 },
  sentenceText: { fontWeight: '800', lineHeight: 27 },
  optionsList: { gap: 10 },
  optionButton: {
    borderWidth: 1.3,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
  },
  optionIndex: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIndexText: { fontWeight: '900', fontSize: 13 },
  optionText: { flex: 1, fontWeight: '800' },
  feedbackBox: { borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: 'row', gap: 12 },
  feedbackIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackTitle: { fontWeight: '800', marginBottom: 6 },
  tipBox: { borderWidth: 1, borderRadius: 16, padding: 12, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  tipText: { flex: 1, fontWeight: '600', lineHeight: 20 },
  primaryButton: {
    borderRadius: 18,
    borderWidth: 0.5,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 18,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  primaryButtonText: { fontWeight: '800', textAlign: 'center', letterSpacing: 0.3 },
  ctaIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  resultIconWrap: { alignItems: 'center' },
  resultIcon: { width: 74, height: 74, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  resultTitle: { fontWeight: '900', textAlign: 'center' },
  resultScoreBox: { borderWidth: 1, borderRadius: 18, padding: 14, alignItems: 'center', gap: 4 },
  resultScoreLabel: { fontWeight: '900', letterSpacing: 1.2 },
  resultScoreValue: { fontSize: 21, fontWeight: '900' },
});
