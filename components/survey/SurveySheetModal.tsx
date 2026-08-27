import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  findNodeHandle,
  InteractionManager,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { surveyRewardForDisplay } from '../../app/survey_submission_state';
import {
  useSurveyFlowController,
  type SurveyDurableScope,
  type SurveyFlowController,
  type SurveyLaunch,
} from '../../app/survey_flow_controller';
import type { SurveyQuestionClient } from '../../app/survey_client';
import { SURVEY_HYBRID } from '../../constants/motionHybrid';
import { triLang, type Lang } from '../../constants/i18n';
import { isLightThemeMode } from '../../constants/theme';
import HybridSheetShell from '../modal_fx/HybridSheetShell';
import PressableHybrid from '../PressableHybrid';
import { useTheme } from '../ThemeContext';
import { FlowText } from '../text-integrity/FlowText';
import SurveyQuestionTransition from './SurveyQuestionTransition';
import SurveyRewardPanel, { SURVEY_PURPLE_TONE, type SurveyRewardPanelPhase } from './SurveyRewardPanel';

const SURVEY_PROGRESS_GAP_PX = 2;

export interface SurveySheetModalProps {
  visible: boolean;
  launch: SurveyLaunch;
  onClose: () => void;
  onDismissed?: () => void;
  onDurablyReconciled?: (scope: SurveyDurableScope) => void;
}

type Copy = {
  back: string;
  close: string;
  next: string;
  submit: string;
  sending: string;
  placeholder: string;
  progress: (current: number, total: number) => string;
};

function sheetCopy(lang: Lang): Copy {
  const pick = (copy: Record<Lang, string>) => triLang(lang, copy);
  return {
    back: pick({ ru: 'Назад', uk: 'Назад', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' }),
    close: pick({ ru: 'Закрыть опрос', uk: 'Закрити опитування', es: 'Cerrar encuesta', 'pt-BR': 'Fechar pesquisa', vi: 'Đóng khảo sát', id: 'Tutup survei', tr: 'Anketi kapat', pl: 'Zamknij ankietę' }),
    next: pick({ ru: 'Продолжить', uk: 'Продовжити', es: 'Siguiente', 'pt-BR': 'Próximo', vi: 'Tiếp', id: 'Lanjut', tr: 'İleri', pl: 'Dalej' }),
    submit: pick({ ru: 'Отправить', uk: 'Надіслати', es: 'Enviar', 'pt-BR': 'Enviar', vi: 'Gửi', id: 'Kirim', tr: 'Gönder', pl: 'Wyślij' }),
    sending: pick({ ru: 'Отправляю…', uk: 'Надсилаю…', es: 'Enviando…', 'pt-BR': 'Enviando…', vi: 'Đang gửi…', id: 'Mengirim…', tr: 'Gönderiliyor…', pl: 'Wysyłanie…' }),
    placeholder: pick({ ru: 'Напиши ответ…', uk: 'Напиши відповідь…', es: 'Escribe tu respuesta…', 'pt-BR': 'Escreva sua resposta…', vi: 'Nhập câu trả lời…', id: 'Tulis jawaban…', tr: 'Cevabını yaz…', pl: 'Wpisz odpowiedź…' }),
    progress: (current, total) => pick({
      ru: `Вопрос ${current} из ${total}`,
      uk: `Питання ${current} з ${total}`,
      es: `Pregunta ${current} de ${total}`,
      'pt-BR': `Pergunta ${current} de ${total}`,
      vi: `Câu ${current} trên ${total}`,
      id: `Pertanyaan ${current} dari ${total}`,
      tr: `Soru ${current}/${total}`,
      pl: `Pytanie ${current} z ${total}`,
    }),
  };
}

function submissionError(lang: Lang, messageKey: string | null): string {
  if (messageKey === 'account_changed') return triLang(lang, {
    ru: 'Аккаунт изменился. Вернись и открой опрос снова.', uk: 'Акаунт змінився. Повернися й відкрий опитування знову.',
    en: 'The account changed. Go back and open the survey again.',
    es: 'La cuenta cambió. Vuelve y abre la encuesta de nuevo.', 'pt-BR': 'A conta mudou. Volte e abra a pesquisa novamente.',
    vi: 'Tài khoản đã thay đổi. Hãy quay lại và mở lại khảo sát.', id: 'Akun berubah. Kembali dan buka survei lagi.',
    tr: 'Hesap değişti. Geri dönüp anketi yeniden aç.', pl: 'Konto zostało zmienione. Wróć i otwórz ankietę ponownie.',
  });
  if (messageKey === 'rate_limited') return triLang(lang, {
    ru: 'Слишком много опросов подряд. Попробуй позже.', uk: 'Забагато опитувань поспіль. Спробуй пізніше.',
    en: 'Too many surveys in a row. Try again later.',
    es: 'Demasiadas encuestas seguidas. Inténtalo más tarde.', 'pt-BR': 'Muitas pesquisas seguidas. Tente mais tarde.',
    vi: 'Quá nhiều khảo sát liên tiếp. Thử lại sau.', id: 'Terlalu banyak survei berturut-turut. Coba nanti.',
    tr: 'Arka arkaya çok fazla anket. Sonra dene.', pl: 'Zbyt wiele ankiet z rzędu. Spróbuj później.',
  });
  if (messageKey === 'unknown_survey') return triLang(lang, {
    ru: 'Опрос уже недоступен.', uk: 'Опитування вже недоступне.', en: 'The survey is no longer available.', es: 'La encuesta ya no está disponible.',
    'pt-BR': 'A pesquisa não está mais disponível.', vi: 'Khảo sát không còn khả dụng.', id: 'Survei sudah tidak tersedia.',
    tr: 'Anket artık kullanılamıyor.', pl: 'Ankieta jest już niedostępna.',
  });
  return triLang(lang, {
    ru: messageKey === 'auth' ? 'Не удалось подтвердить аккаунт. Попробуй снова.' : 'Не удалось отправить. Попробуй снова.',
    uk: messageKey === 'auth' ? 'Не вдалося підтвердити акаунт. Спробуй ще раз.' : 'Не вдалося надіслати. Спробуй ще раз.',
    en: messageKey === 'auth' ? "Couldn't confirm the account. Try again." : "Couldn't send. Try again.",
    es: 'No se pudo enviar. Inténtalo de nuevo.', 'pt-BR': 'Falha ao enviar. Tente de novo.', vi: 'Gửi không thành công. Thử lại.',
    id: 'Gagal mengirim. Coba lagi.', tr: 'Gönderilemedi. Tekrar dene.', pl: 'Nie udało się wysłać. Spróbuj ponownie.',
  });
}

function completionTitle(lang: Lang, confirmedZero: boolean, configured?: string): string {
  if (confirmedZero) return triLang(lang, {
    ru: 'Опрос уже пройден', uk: 'Опитування вже пройдено', en: 'Survey already completed', es: 'Encuesta ya completada', 'pt-BR': 'Pesquisa já respondida',
    vi: 'Đã hoàn thành khảo sát', id: 'Survei sudah diisi', tr: 'Anket zaten tamamlandı', pl: 'Ankieta już wypełniona',
  });
  return configured?.trim() || triLang(lang, {
    ru: 'Спасибо!', uk: 'Дякуємо!', en: 'Thank you!', es: '¡Gracias!', 'pt-BR': 'Obrigado!', vi: 'Cảm ơn!', id: 'Terima kasih!', tr: 'Teşekkürler!', pl: 'Dziękujemy!',
  });
}

export default function SurveySheetModal({
  visible,
  launch,
  onClose,
  onDismissed,
  onDurablyReconciled,
}: SurveySheetModalProps) {
  const { theme: t } = useTheme();
  const copy = useMemo(() => sheetCopy(launch.lang), [launch.lang]);
  const activeDeactivateRef = useRef<() => void>(() => {});
  const registerDeactivate = useCallback((deactivate: () => void) => {
    activeDeactivateRef.current = deactivate;
  }, []);
  const deactivateActiveFlow = useCallback(() => {
    activeDeactivateRef.current();
  }, []);

  useLayoutEffect(() => {
    if (!visible) deactivateActiveFlow();
  }, [deactivateActiveFlow, visible]);
  useEffect(() => () => {
    activeDeactivateRef.current();
    activeDeactivateRef.current = () => {};
  }, []);

  return (
    <HybridSheetShell
      visible={visible}
      onClose={onClose}
      onDismissed={onDismissed}
      onDismissRequested={deactivateActiveFlow}
      closeLabel={copy.close}
      backdropAccessible={false}
      glowColor={t.accent}
      sheetHeight="86%"
      testID="survey-sheet-shell"
    >
      {({ requestDismiss }) => (
        <SurveySheetSession
          launch={launch}
          shellRequestDismiss={requestDismiss}
          registerDeactivate={registerDeactivate}
          onDurablyReconciled={onDurablyReconciled}
        />
      )}
    </HybridSheetShell>
  );
}

function SurveySheetSession({
  launch,
  shellRequestDismiss,
  registerDeactivate,
  onDurablyReconciled,
}: {
  launch: SurveyLaunch;
  shellRequestDismiss: () => void;
  registerDeactivate: (deactivate: () => void) => void;
  onDurablyReconciled?: (scope: SurveyDurableScope) => void;
}) {
  const dismissLifecycleStartedRef = useRef(false);
  const [autoCloseRequest, requestAutoClose] = useReducer((value: number) => value + 1, 0);
  const flow = useSurveyFlowController({ launch, onReconciled: requestAutoClose, onDurablyReconciled });
  const deactivate = flow.deactivate;
  const deactivateForDismiss = useCallback(() => {
    if (dismissLifecycleStartedRef.current) return;
    dismissLifecycleStartedRef.current = true;
    deactivate();
  }, [deactivate]);

  useLayoutEffect(() => {
    registerDeactivate(deactivateForDismiss);
  }, [deactivateForDismiss, registerDeactivate]);

  return (
    <SurveySheetContent
      launch={launch}
      flow={flow}
      shellRequestDismiss={shellRequestDismiss}
      deactivateForDismiss={deactivateForDismiss}
      autoCloseRequest={autoCloseRequest}
    />
  );
}

function SurveySheetContent({
  launch,
  flow,
  shellRequestDismiss,
  deactivateForDismiss,
  autoCloseRequest,
}: {
  launch: SurveyLaunch;
  flow: SurveyFlowController;
  shellRequestDismiss: () => void;
  deactivateForDismiss: () => void;
  autoCloseRequest: number;
}) {
  const { theme: t, f } = useTheme();
  const { survey, lang } = launch;
  const copy = useMemo(() => sheetCopy(lang), [lang]);
  const sheetTitleRef = useRef<Text | null>(null);
  const questionTitleRef = useRef<Text | null>(null);
  const previousQuestionIdRef = useRef(flow.currentQuestion.id);
  const handledAutoCloseRequestRef = useRef(autoCloseRequest);
  const goBack = flow.goBack;
  const requestClose = useCallback(() => {
    deactivateForDismiss();
    shellRequestDismiss();
  }, [deactivateForDismiss, shellRequestDismiss]);

  useEffect(() => {
    if (autoCloseRequest === handledAutoCloseRequestRef.current) return;
    handledAutoCloseRequestRef.current = autoCloseRequest;
    requestClose();
  }, [autoCloseRequest, requestClose]);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      const node = findNodeHandle(sheetTitleRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    });
    return () => task.cancel();
  }, []);

  useEffect(() => {
    if (previousQuestionIdRef.current === flow.currentQuestion.id) return;
    previousQuestionIdRef.current = flow.currentQuestion.id;
    const task = InteractionManager.runAfterInteractions(() => {
      const node = findNodeHandle(questionTitleRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    });
    return () => task.cancel();
  }, [flow.currentQuestion.id]);

  const total = survey.questions.length;
  const current = Math.min(flow.stepIndex + 1, Math.max(total, 1));
  const progressLabel = copy.progress(current, total);

  const handleBack = useCallback(() => {
    if (goBack() === 'close') requestClose();
  }, [goBack, requestClose]);

  const showReward = flow.submission.phase === 'reconciled';
  const showError = flow.submission.phase === 'retryable-error';
  const feedback = showReward || showError;
  const feedbackPhase: SurveyRewardPanelPhase = showError ? 'retryable-error' : 'reconciled';
  const confirmedZero = flow.submission.phase === 'reconciled'
    && flow.submission.confirmedReward === 0;

  return (
    <View testID="survey-sheet-content" style={styles.sheetContent}>
      {feedback ? (
        <>
          <View style={styles.feedbackCloseRow}>
            <PressableHybrid
              testID="survey-sheet-close"
              variant="icon"
              onPress={requestClose}
              withHaptic={false}
              accessibilityLabel={copy.close}
              style={styles.closeButton}
              contentStyle={styles.closeButtonContent}
            >
              <Ionicons name="close" size={24} color={t.textPrimary} accessibilityElementsHidden />
            </PressableHybrid>
          </View>
          <ScrollView decelerationRate="fast"
            testID="survey-feedback-scroll"
            style={styles.feedbackScroll}
            contentContainerStyle={styles.feedbackScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <FlowText
              ref={sheetTitleRef}
              testID="survey-sheet-title"
              provenance="authored"
              accessibilityRole="header"
              accessibilityLabel={survey.title}
              style={[styles.feedbackTitle, { color: t.textPrimary, fontSize: f.h2 }]}
            >
              {survey.title}
            </FlowText>
            <SurveyRewardPanel
              phase={feedbackPhase}
              reward={surveyRewardForDisplay(flow.submission)}
              title={completionTitle(lang, confirmedZero, survey.finalTitle)}
              subtitle={survey.finalSubtitle?.trim() || ''}
              error={submissionError(lang, flow.submission.messageKey)}
              onDone={requestClose}
              onRetry={() => { void flow.retrySubmit(); }}
              retryDisabled={flow.submission.messageKey === 'account_changed'}
              onBack={requestClose}
            />
          </ScrollView>
        </>
      ) : (
        <>
          <ScrollView decelerationRate="fast"
            testID="survey-sheet-scroll"
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View testID="survey-sheet-scroll-content" style={styles.scrollContentInner}>
              <View style={styles.header}>
                <PressableHybrid
                  testID="survey-sheet-back"
                  variant="icon"
                  onPress={handleBack}
                  withHaptic={false}
                  accessibilityLabel={copy.back}
                  style={styles.backButton}
                  contentStyle={styles.backButtonContent}
                >
                  <Ionicons name="chevron-back" size={24} color={t.textPrimary} accessibilityElementsHidden />
                </PressableHybrid>
                <FlowText
                  ref={sheetTitleRef}
                  testID="survey-sheet-title"
                  provenance="authored"
                  accessibilityRole="header"
                  accessibilityLabel={survey.title}
                  style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}
                >
                  {survey.title}
                </FlowText>
                <PressableHybrid
                  testID="survey-sheet-close"
                  variant="icon"
                  onPress={requestClose}
                  withHaptic={false}
                  accessibilityLabel={copy.close}
                  style={styles.closeButton}
                  contentStyle={styles.closeButtonContent}
                >
                  <Ionicons name="close" size={24} color={t.textPrimary} accessibilityElementsHidden />
                </PressableHybrid>
              </View>

              <FlowText
                testID="survey-sheet-progress-copy"
                provenance="authored"
                accessible
                accessibilityRole="progressbar"
                accessibilityLabel={progressLabel}
                accessibilityValue={{ min: 1, max: Math.max(total, 1), now: current }}
                style={[styles.progressCopy, { color: t.textSecond, fontSize: f.label }]}
              >
                {progressLabel}
              </FlowText>
              <SurveyProgress current={current} total={total} accent={survey.accentColor || t.accent} track={t.bgSurface2} />

              <View style={styles.questionRegion}>
                <SurveyQuestionTransition transitionKey={flow.currentQuestion.id} direction={flow.direction}>
                  <SurveyQuestionFields
                    question={flow.currentQuestion}
                    selectedOption={flow.answers[flow.currentQuestion.id]?.optionId}
                    comment={flow.answers[flow.currentQuestion.id]?.comment ?? ''}
                    disabled={flow.submitting}
                    placeholder={copy.placeholder}
                    controller={flow}
                    questionTitleRef={questionTitleRef}
                  />
                </SurveyQuestionTransition>
              </View>
            </View>
          </ScrollView>

          <PressableHybrid
            testID="survey-sheet-cta"
            variant="primary"
            disabled={!flow.currentAnswered || flow.submitting}
            busy={flow.submitting}
            onPress={flow.goNext}
            withHaptic={false}
            accessibilityLabel={flow.submitting ? copy.sending : (flow.isLastStep ? copy.submit : copy.next)}
            accessibilityState={{ disabled: !flow.currentAnswered || flow.submitting, busy: flow.submitting }}
            accessibilityLiveRegion={flow.submitting ? 'polite' : undefined}
            style={[styles.cta, { backgroundColor: flow.currentAnswered ? t.accent : t.bgSurface2 }]}
            contentStyle={styles.ctaContent}
          >
            {flow.submitting ? <ActivityIndicator color={t.correctText} /> : null}
            <FlowText
              testID="survey-sheet-cta-label"
              provenance="authored"
              style={[styles.ctaLabel, { color: flow.currentAnswered ? t.correctText : t.textMuted, fontSize: f.body }]}
            >
              {flow.submitting ? copy.sending : (flow.isLastStep ? copy.submit : copy.next)}
            </FlowText>
          </PressableHybrid>
        </>
      )}
    </View>
  );
}

function SurveyProgress({ current, total, accent, track }: {
  current: number;
  total: number;
  accent: string;
  track: string;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const safeTotal = Math.max(1, total);
  const safeCurrent = Math.min(Math.max(0, current), safeTotal);
  const ratio = safeCurrent / safeTotal;
  const segmentWidth = (trackWidth - SURVEY_PROGRESS_GAP_PX * (safeTotal - 1)) / safeTotal;
  const useSegments = trackWidth > 0
    && segmentWidth >= SURVEY_HYBRID.progressSegmentMinPx;
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  }, []);

  return (
    <View
      testID="survey-sheet-progress"
      accessible={false}
      importantForAccessibility="no"
      onLayout={onLayout}
      style={[styles.progressTrack, { backgroundColor: track }]}
    >
      {useSegments ? (
        <View style={styles.progressSegments}>
          {Array.from({ length: safeTotal }, (_, index) => (
            <View
              key={index}
              testID="survey-sheet-progress-segment"
              accessible={false}
              style={[styles.progressSegment, { backgroundColor: index < safeCurrent ? accent : 'transparent' }]}
            />
          ))}
        </View>
      ) : (
        <View
          testID="survey-sheet-progress-fill"
          accessible={false}
          style={[
            styles.progressFill,
            {
              backgroundColor: accent,
              transformOrigin: 'left center',
              transform: [{ scaleX: ratio }],
            },
          ]}
        />
      )}
    </View>
  );
}

function SurveyQuestionFields({
  question,
  selectedOption,
  comment,
  disabled,
  placeholder,
  controller,
  questionTitleRef,
}: {
  question: SurveyQuestionClient;
  selectedOption?: string;
  comment: string;
  disabled: boolean;
  placeholder: string;
  controller: Pick<SurveyFlowController, 'pickOption' | 'setComment'>;
  questionTitleRef: React.RefObject<Text | null>;
}) {
  const { theme: t, f, themeMode } = useTheme();
  return (
    <View style={styles.questionBody}>
      <FlowText
        ref={questionTitleRef}
        testID="survey-question-title"
        provenance="authored"
        accessibilityRole="header"
        accessibilityLabel={question.text}
        style={[styles.questionTitle, { color: t.textPrimary, fontSize: f.body }]}
      >
        {question.text}
      </FlowText>
      {question.type === 'text' ? (
        <TextInput
          testID="survey-question-comment"
          value={comment}
          onChangeText={(value) => controller.setComment(question.id, value)}
          placeholder={placeholder}
          placeholderTextColor={t.textMuted}
          editable={!disabled}
          multiline
          maxLength={500}
          accessibilityLabel={question.text}
          style={[styles.textInput, { color: t.textPrimary, backgroundColor: t.bgSurface2, fontSize: f.body }]}
        />
      ) : (
        <View style={styles.options}>
          {question.options.map((option) => {
            const selected = selectedOption === option.id;
            return (
              <PressableHybrid
                key={option.id}
                testID={`survey-option-${option.id}`}
                variant="card"
                onPress={() => controller.pickOption(question.id, option.id)}
                withHaptic={false}
                disabled={disabled}
                accessibilityRole="radio"
                accessibilityLabel={option.label}
                accessibilityState={{ selected, disabled }}
                style={[styles.option, { backgroundColor: t.bgSurface2 }]}
                contentStyle={styles.optionContent}
              >
                {selected ? (
                  <View
                    testID={`survey-option-${option.id}-tone`}
                    pointerEvents="none"
                    style={[styles.optionTone, { backgroundColor: SURVEY_PURPLE_TONE.surfaceOverlay }]}
                  />
                ) : null}
                <FlowText
                  testID={`survey-option-${option.id}-label`}
                  provenance="authored"
                  style={[styles.optionLabel, { color: t.textPrimary, fontSize: f.body }]}
                >
                  {option.label}
                </FlowText>
                <Ionicons
                  name={selected ? 'radio-button-on' : 'radio-button-off'}
                  size={22}
                  color={selected
                    ? (isLightThemeMode(themeMode) ? SURVEY_PURPLE_TONE.accentLight : SURVEY_PURPLE_TONE.accentDark)
                    : t.textMuted}
                  accessibilityElementsHidden
                />
              </PressableHybrid>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sheetContent: { flex: 1, minHeight: 0, paddingBottom: 4 },
  feedbackScroll: { flex: 1, minHeight: 0 },
  feedbackScrollContent: { flexGrow: 1, paddingVertical: 20 },
  feedbackCloseRow: { alignItems: 'flex-end', paddingTop: 2 },
  feedbackTitle: { fontWeight: '700', lineHeight: 28, marginBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 2 },
  backButton: { minWidth: 48, minHeight: 48 },
  backButtonContent: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  closeButton: { minWidth: 48, minHeight: 48 },
  closeButtonContent: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontWeight: '700', lineHeight: 28 },
  progressCopy: { marginTop: 8, fontWeight: '700' },
  progressTrack: { height: 6, borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  progressSegments: { flex: 1, flexDirection: 'row', gap: SURVEY_PROGRESS_GAP_PX },
  progressSegment: { flex: 1, borderRadius: 3 },
  progressFill: { width: '100%', height: '100%', borderRadius: 3 },
  scroll: { flex: 1, minHeight: 0, marginTop: 6 },
  scrollContent: { flexGrow: 1 },
  scrollContentInner: { flexGrow: 1, paddingVertical: 18 },
  questionRegion: { flexGrow: 1, marginTop: 18 },
  questionBody: { gap: 16 },
  questionTitle: { fontWeight: '700', lineHeight: 24 },
  options: { gap: 10 },
  option: { minHeight: 48, borderRadius: 16, overflow: 'hidden' },
  optionContent: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  optionTone: { ...StyleSheet.absoluteFillObject },
  optionLabel: { flex: 1, fontWeight: '700', lineHeight: 22 },
  textInput: { minHeight: 120, borderRadius: 16, padding: 16, textAlignVertical: 'top', lineHeight: 23 },
  cta: { minHeight: 52, borderRadius: 18, marginTop: 8 },
  ctaContent: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18 },
  ctaLabel: { fontWeight: '700', textAlign: 'center' },
});
