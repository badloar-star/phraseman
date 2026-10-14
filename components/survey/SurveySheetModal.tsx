import KitProgressFill from '../KitProgressFill';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
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

import { openStoreReviewPage } from '../../app/store_review';
import { collectSurveyFollowUps, type SurveyFollowUp } from '../../app/survey_followups';
import {
  useSurveyFlowController,
  type SurveyDurableScope,
  type SurveyFlowController,
  type SurveyLaunch,
} from '../../app/survey_flow_controller';
import type { SurveyQuestionClient } from '../../app/survey_client';
import { SURVEY_HYBRID } from '../../constants/motionHybrid';
import { triLang, type Lang } from '../../constants/i18n';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import HybridSheetShell from '../modal_fx/HybridSheetShell';
import PressableHybrid from '../PressableHybrid';
import { useTheme } from '../ThemeContext';
import { plateBoxShadow, raisedBoxShadow, RAISED_LIFT } from '../v2/ShadowSurface';
import { FlowText } from '../text-integrity/FlowText';
import SurveyQuestionTransition from './SurveyQuestionTransition';
import SurveyRewardPanel, { type SurveyRewardPanelPhase } from './SurveyRewardPanel';

const SURVEY_PROGRESS_GAP_PX = 2;

// зачем (решение владельца 2026-09-30): жемчуг удалён из приложения полностью — чип баланса,
// «+1» в строке ответа и перелёт жемчужины в чип убраны вместе с хореографией «Прилив».
// Кнопка «Продолжить/Отправить» теперь сразу ведёт на следующий шаг / отправку.

type SurveyOptionClient = SurveyQuestionClient['options'][number];

/** Логи ранних выходов шагов опроса (правило владельца «сперва логи»): редкие события, не покадровые. */
function logTide(message: string): void {
  console.log(`[SURVEY-TIDE] ${message}`); // guard-ok: ранние выходы обязаны логироваться и в проде
}

/**
 * Трасса кнопок-действий финала. Владелец ловит всю цепочку одним grep
 * `[SURVEY-CTA]`: какое действие нажали, закрылась ли шторка, чем кончился
 * переход. Именно немого отказа тут и не хватало — тап выглядел мёртвым, а
 * узнать это было неоткуда.
 */
function logCta(message: string): void {
  console.log(`[SURVEY-CTA] ${message}`); // guard-ok: ранние выходы обязаны логироваться и в проде
}

/**
 * Обещанный переход, который ждёт исчезновения нативной шторки. Живёт в модуле,
 * а не в ref: Главная размонтирует опрос тем же onClose, и ref умер бы раньше,
 * чем обещание исполнилось. Опрос на экране всегда один, гонки за неё нет.
 */
let pendingFollowUp: SurveyFollowUp | null = null;

/** Сброс обещания между тестами: модульное состояние иначе течёт в соседний тест. */
export function __resetPendingSurveyFollowUpForTests(): void {
  pendingFollowUp = null;
}

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
    back: pick({ ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' }),
    close: pick({ ru: 'Закрыть опрос', uk: 'Закрити опитування', en: 'Close survey', es: 'Cerrar encuesta', 'pt-BR': 'Fechar pesquisa', vi: 'Đóng khảo sát', id: 'Tutup survei', tr: 'Anketi kapat', pl: 'Zamknij ankietę' }),
    next: pick({ ru: 'Продолжить', uk: 'Продовжити', en: 'Continue', es: 'Siguiente', 'pt-BR': 'Próximo', vi: 'Tiếp', id: 'Lanjut', tr: 'İleri', pl: 'Dalej' }),
    submit: pick({ ru: 'Отправить', uk: 'Надіслати', en: 'Submit', es: 'Enviar', 'pt-BR': 'Enviar', vi: 'Gửi', id: 'Kirim', tr: 'Gönder', pl: 'Wyślij' }),
    sending: pick({ ru: 'Отправляю…', uk: 'Надсилаю…', en: 'Sending…', es: 'Enviando…', 'pt-BR': 'Enviando…', vi: 'Đang gửi…', id: 'Mengirim…', tr: 'Gönderiliyor…', pl: 'Wysyłanie…' }),
    placeholder: pick({ ru: 'Напиши ответ…', uk: 'Напиши відповідь…', en: 'Write your answer…', es: 'Escribe tu respuesta…', 'pt-BR': 'Escreva sua resposta…', vi: 'Nhập câu trả lời…', id: 'Tulis jawaban…', tr: 'Cevabını yaz…', pl: 'Wpisz odpowiedź…' }),
    progress: (current, total) => pick({
      ru: `Вопрос ${current} из ${total}`,
      uk: `Питання ${current} з ${total}`,
      en: `Question ${current} of ${total}`,
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

/**
 * зачем (владелец, 2026-09-13: «убери алмазик эмодзи»): тексты финала приходят
 * из библиотеки опросов в Firestore, где заголовок заканчивался «💎». Жемчуга в
 * приложении больше нет (2026-09-30), валютный эмодзи тем более лишний. Чистим на
 * клиенте, чтобы правка не ждала переиздания библиотеки.
 */
function stripCurrencyEmoji(text?: string): string {
  return (text ?? '').replace(/\s*[💎🔷🔹💠]/gu, '').trim();
}

// зачем (2026-09-30): раньше «Опрос уже пройден» выводился из confirmedReward === 0,
// но награда за опрос обнулена (PM-058), а жемчуг удалён — ноль больше ничего не значит
// и давал ложное «уже пройден» на каждом первом прохождении. Заголовок — из библиотеки
// или «Спасибо!».
function completionTitle(lang: Lang, configured?: string): string {
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
  // зачем: Liquid Glass 2.0 — оболочка и цвета опроса берутся из токенов активной из 13 тем.
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const copy = useMemo(() => sheetCopy(launch.lang), [launch.lang]);
  const activeDeactivateRef = useRef<() => void>(() => {});
  const registerDeactivate = useCallback((deactivate: () => void) => {
    activeDeactivateRef.current = deactivate;
  }, []);
  const deactivateActiveFlow = useCallback(() => {
    activeDeactivateRef.current();
  }, []);

  // ── Отложенный переход по кнопке финала ────────────────────────────────────
  // зачем (владелец, 2026-09-22): навигация ОБЯЗАНА идти после того, как
  // нативный Modal реально исчез. Пока шторка жива, expo-router меняет экран
  // ПОД ней — человек видит ту же шторку и считает кнопку мёртвой.
  //
  // Обещание держим ВНЕ компонента (pendingFollowUp в модуле): Главная рисует
  // опрос как `{openSurveyLaunch ? <SurveySheetModal/> : null}`, и её onClose
  // обнуляет launch — компонент размонтируется в том же кадре, ref умер бы
  // вместе с ним, а onDismissed уже не пришёл бы. Поэтому исполняем обещание
  // по ЛЮБОМУ из двух сигналов: нативное закрытие или размонтирование.
  const router = useRouter();
  const runFollowUp = useCallback((followUp: SurveyFollowUp, trigger: string) => {
    logCta(`run pending action (trigger=${trigger}) key=${followUp.key}`);
    if (followUp.kind === 'store_review') {
      void openStoreReviewPage().then((opened) => {
        logCta(`store page: ${opened ? 'opened' : 'FAILED — no store url could be opened'}`);
      });
      return;
    }
    try {
      router.push(followUp.route);
      logCta(`navigation done: route=${followUp.route}`);
    } catch (e) {
      logCta(`navigation FAILED: route=${followUp.route} reason=${e instanceof Error ? e.message : String(e)}`);
    }
  }, [router]);
  const runFollowUpRef = useRef(runFollowUp);
  runFollowUpRef.current = runFollowUp;

  const handleFollowUp = useCallback((followUp: SurveyFollowUp) => {
    if (pendingFollowUp) {
      logCta(`second tap while dismissing: key=${followUp.key} ignored (already pending ${pendingFollowUp.key})`);
      return;
    }
    pendingFollowUp = followUp;
    logCta(`cta pressed: key=${followUp.key} kind=${followUp.kind} label="${followUp.cta}" — closing sheet, navigation after dismiss`);
    onClose();
  }, [onClose]);

  const handleDismissed = useCallback(() => {
    const pending = pendingFollowUp;
    pendingFollowUp = null;
    if (pending) runFollowUpRef.current(pending, 'нативное закрытие'); // i18n-ok: причина события для лога опроса, не текст экрана
    onDismissed?.();
  }, [onDismissed]);

  useLayoutEffect(() => {
    if (!visible) deactivateActiveFlow();
  }, [deactivateActiveFlow, visible]);
  useEffect(() => () => {
    activeDeactivateRef.current();
    activeDeactivateRef.current = () => {};
    // Родитель снял launch — onDismissed уже не придёт, обещание исполняем тут.
    const pending = pendingFollowUp;
    pendingFollowUp = null;
    if (pending) runFollowUpRef.current(pending, 'размонтирование'); // i18n-ok: причина события для лога опроса, не текст экрана
  }, []);

  return (
    <HybridSheetShell
      visible={visible}
      onClose={onClose}
      // зачем: обработчик передаём ВСЕГДА, даже когда родитель свой не дал —
      // иначе шелл не включает наблюдение за нативным закрытием (dismissalEnabled)
      // и отложенный переход по кнопке финала никогда бы не исполнился.
      onDismissed={handleDismissed}
      onDismissRequested={deactivateActiveFlow}
      closeLabel={copy.close}
      backdropAccessible={false}
      glowColor={glass.cta}
      material="liquid-glass-opaque"
      sheetHeight="86%"
      testID="survey-sheet-shell"
    >
      {({ requestDismiss }) => (
        <SurveySheetSession
          launch={launch}
          shellRequestDismiss={requestDismiss}
          registerDeactivate={registerDeactivate}
          onDurablyReconciled={onDurablyReconciled}
          onFollowUp={handleFollowUp}
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
  onFollowUp,
}: {
  launch: SurveyLaunch;
  shellRequestDismiss: () => void;
  registerDeactivate: (deactivate: () => void) => void;
  onDurablyReconciled?: (scope: SurveyDurableScope) => void;
  onFollowUp: (followUp: SurveyFollowUp) => void;
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
      onFollowUp={onFollowUp}
    />
  );
}

function SurveySheetContent({
  launch,
  flow,
  shellRequestDismiss,
  deactivateForDismiss,
  autoCloseRequest,
  onFollowUp,
}: {
  launch: SurveyLaunch;
  flow: SurveyFlowController;
  shellRequestDismiss: () => void;
  deactivateForDismiss: () => void;
  autoCloseRequest: number;
  onFollowUp: (followUp: SurveyFollowUp) => void;
}) {
  const { f, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const { survey, lang } = launch;
  const copy = useMemo(() => sheetCopy(lang), [lang]);
  const sheetTitleRef = useRef<Text | null>(null);
  const questionTitleRef = useRef<Text | null>(null);
  const previousQuestionIdRef = useRef(flow.currentQuestion.id);
  const handledAutoCloseRequestRef = useRef(autoCloseRequest);
  const goBack = flow.goBack;
  const goNext = flow.goNext;
  const goNextRef = useRef(goNext);
  useEffect(() => {
    goNextRef.current = goNext;
  }, [goNext]);

  /**
   * зачем (владелец, 2026-09-21: «юзер может клоцать любую, пока не нажал
   * Отправить»): раньше тап по варианту запускал хореографию с автопереходом,
   * а на последнем шаге — саму отправку. Передумать было нельзя: пока таймер
   * шёл, повторный тап игнорировался, и ответ улетал сам. Теперь тап ТОЛЬКО
   * выбирает (pickOption уже отработал в onPress), а переход и отправка идут
   * исключительно по кнопке внизу.
   */
  const handlePicked = useCallback((option: SurveyOptionClient) => {
    logTide(`выбран вариант ${option.id}: ждём кнопку, автоперехода нет`);
  }, []);

  /** Шаг вперёд по кнопке: следующий вопрос или отправка на последнем шаге. */
  const handleAdvance = useCallback(() => {
    if (flow.submitting) {
      logTide('повторное нажатие кнопки во время отправки: игнор');
      return;
    }
    goNextRef.current();
  }, [flow.submitting]);

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
  const showPendingAccepted = flow.submission.phase === 'optimistic-reward';
  const feedback = showPendingAccepted || showReward || showError;
  const feedbackPhase: SurveyRewardPanelPhase = showError
    ? 'retryable-error'
    : showPendingAccepted
      ? 'optimistic-reward'
      : 'reconciled';

  // зачем: кнопки финала — производная от ответов, отдельного состояния нет.
  // Считаем только когда финальный экран реально виден: во время опроса эта
  // работа никому не нужна и ни одного лишнего прохода по вопросам не делаем.
  const followUps = useMemo(
    () => (feedback ? collectSurveyFollowUps({ questions: survey.questions, answers: flow.answers }) : []),
    [feedback, flow.answers, survey.questions],
  );

  // зачем (владелец, 2026-09-21): кнопка внизу теперь на КАЖДОМ шаге. Пока её
  // не нажали, человек волен переклацывать варианты сколько угодно — ничего не
  // уходит само. Неактивна, пока на шаге нет ответа.
  const selectedOptionId = flow.answers[flow.currentQuestion.id]?.optionId;
  const ctaDisabled = !flow.currentAnswered || flow.submitting;
  const ctaLabel = flow.submitting
    ? copy.sending
    : (flow.isLastStep ? copy.submit : copy.next);

  const closeButton = (
    <PressableHybrid
      testID="survey-sheet-close"
      variant="icon"
      onPress={requestClose}
      withHaptic={false}
      accessibilityLabel={copy.close}
      style={styles.closeButton}
      contentStyle={styles.closeButtonContent}
    >
      <Ionicons name="close" size={24} color={glass.text} accessibilityElementsHidden />
    </PressableHybrid>
  );

  return (
    <View testID="survey-sheet-content" style={styles.sheetContent}>
      {feedback ? (
        <>
          <View style={styles.bar}>
            <View style={styles.barSpacer} />
            <View style={styles.barRight}>
              {closeButton}
            </View>
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
              style={[styles.feedbackTitle, { color: glass.text, fontSize: f.h2 }]}
            >
              {survey.title}
            </FlowText>
            <SurveyRewardPanel
              phase={feedbackPhase}
              title={completionTitle(lang, stripCurrencyEmoji(survey.finalTitle))}
              subtitle={stripCurrencyEmoji(survey.finalSubtitle)}
              error={submissionError(lang, flow.submission.messageKey)}
              onDone={requestClose}
              onRetry={() => { void flow.retrySubmit(); }}
              retryDisabled={flow.submission.messageKey === 'account_changed'}
              onBack={requestClose}
              followUps={followUps}
              onFollowUp={onFollowUp}
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
              <View style={styles.bar}>
                <PressableHybrid
                  testID="survey-sheet-back"
                  variant="icon"
                  onPress={handleBack}
                  withHaptic={false}
                  accessibilityLabel={copy.back}
                  style={styles.backButton}
                  contentStyle={styles.backButtonContent}
                >
                  <Ionicons name="chevron-back" size={24} color={glass.text} accessibilityElementsHidden />
                </PressableHybrid>
                <View style={styles.barRight}>
                  {closeButton}
                </View>
              </View>
              <FlowText
                ref={sheetTitleRef}
                testID="survey-sheet-title"
                provenance="authored"
                accessibilityRole="header"
                accessibilityLabel={survey.title}
                style={[styles.title, { color: glass.text, fontSize: f.h2 }]}
              >
                {survey.title}
              </FlowText>

              {survey.subtitle.trim() ? (
                <FlowText
                  testID="survey-sheet-subtitle"
                  provenance="authored"
                  style={[styles.subtitle, { color: glass.secondary, fontSize: f.body }]}
                >
                  {survey.subtitle}
                </FlowText>
              ) : null}

              <FlowText
                testID="survey-sheet-progress-copy"
                provenance="authored"
                accessible
                accessibilityRole="progressbar"
                accessibilityLabel={progressLabel}
                accessibilityValue={{ min: 1, max: Math.max(total, 1), now: current }}
                style={[styles.progressCopy, { color: glass.secondary, fontSize: f.label }]}
              >
                {progressLabel}
              </FlowText>
              <SurveyProgress current={current} total={total} accent={glass.cta} track={glass.opaqueControl} />

              <View style={styles.questionRegion}>
                <SurveyQuestionTransition transitionKey={flow.currentQuestion.id} direction={flow.direction}>
                  <SurveyQuestionFields
                    question={flow.currentQuestion}
                    selectedOption={selectedOptionId}
                    comment={flow.answers[flow.currentQuestion.id]?.comment ?? ''}
                    disabled={flow.submitting}
                    placeholder={copy.placeholder}
                    controller={flow}
                    questionTitleRef={questionTitleRef}
                    hideQuestionTitle={survey.questions.length === 1
                      && flow.currentQuestion.text.trim() === survey.title.trim()}
                    onPicked={handlePicked}
                  />
                </SurveyQuestionTransition>
              </View>
            </View>
          </ScrollView>

          <PressableHybrid
            testID="survey-sheet-cta"
            variant="primary"
            disabled={ctaDisabled}
            busy={flow.submitting}
            onPress={handleAdvance}
            withHaptic={false}
            accessibilityLabel={ctaLabel}
            accessibilityState={{ disabled: ctaDisabled, busy: flow.submitting }}
            accessibilityLiveRegion={flow.submitting ? 'polite' : undefined}
            style={[styles.cta, { backgroundColor: ctaDisabled ? glass.buttonFill : glass.cta }]}
            contentStyle={styles.ctaContent}
          >
            {flow.submitting ? <ActivityIndicator color={glass.secondary} /> : null}
            <FlowText
              testID="survey-sheet-cta-label"
              provenance="authored"
              style={[styles.ctaLabel, { color: ctaDisabled ? glass.mutedText : glass.ctaInk, fontSize: f.body }]}
            >
              {ctaLabel}
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
        <KitProgressFill
          testID="survey-sheet-progress-fill"
          accessible={false}
          ratio={ratio}
          style={[styles.progressFill, { backgroundColor: accent, transformOrigin: 'left center' }]}
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
  hideQuestionTitle,
  onPicked,
}: {
  question: SurveyQuestionClient;
  selectedOption?: string;
  comment: string;
  disabled: boolean;
  placeholder: string;
  controller: Pick<SurveyFlowController, 'pickOption' | 'setComment'>;
  questionTitleRef: React.RefObject<Text | null>;
  hideQuestionTitle: boolean;
  onPicked: (option: SurveyOptionClient) => void;
}) {
  const { f, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const anySelected = question.options.some((option) => option.id === selectedOption);
  return (
    <View style={styles.questionBody}>
      {!hideQuestionTitle ? (
        <FlowText
          ref={questionTitleRef}
          testID="survey-question-title"
          provenance="authored"
          accessibilityRole="header"
          accessibilityLabel={question.text}
          style={[styles.questionTitle, { color: glass.text, fontSize: f.body }]}
        >
          {question.text}
        </FlowText>
      ) : null}
      {question.type === 'text' ? (
        <TextInput
          testID="survey-question-comment"
          value={comment}
          onChangeText={(value) => controller.setComment(question.id, value)}
          placeholder={placeholder}
          placeholderTextColor={glass.mutedText}
          editable={!disabled}
          multiline
          maxLength={500}
          accessibilityLabel={question.text}
          style={[styles.textInput, { color: glass.text, backgroundColor: glass.plateFillFrom, boxShadow: plateBoxShadow(glass) as unknown as string /* зачем: типы RN для стиля TextInput знают boxShadow только строкой, на деле массив работает */, fontSize: f.body }]}
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
                // зачем (владелец, 2026-09-22): тап по варианту ТОЛЬКО выбирает.
                // Раньше здесь же открывалась страница стора — окно прилетало
                // поверх опроса ещё до отправки. Теперь и стор, и переходы
                // живут на финальном экране, когда уходить уже безопасно.
                onPress={() => {
                  controller.pickOption(question.id, option.id);
                  onPicked(option);
                }}
                withHaptic={false}
                disabled={disabled}
                accessibilityRole="radio"
                accessibilityLabel={option.label}
                accessibilityState={{ selected, disabled }}
                // зачем (стиль «Тень», владелец 12.10): вариант — плашка с тенью без кромки; выбранный приподнят (сдвиг на внешней обёртке, высота ряда не меняется)
                style={[styles.option, { backgroundColor: glass.plateFillFrom, boxShadow: selected ? raisedBoxShadow(glass) : plateBoxShadow(glass), transform: selected ? [{ translateY: RAISED_LIFT }] : [] }]}
                contentStyle={styles.optionContent}
              >
                {selected ? (
                  <View
                    testID={`survey-option-${option.id}-tone`}
                    pointerEvents="none"
                    style={[styles.optionTone, { backgroundColor: glass.selected }]}
                  />
                ) : null}
                {/* зачем: невыбранные варианты гаснут до 0.42 (макет A), чтобы
                    выбранный читался как единственный ответ, без обводок. */}
                <View style={[styles.optionInner, anySelected && !selected ? styles.optionDimmed : null]}>
                  <FlowText
                    testID={`survey-option-${option.id}-label`}
                    provenance="authored"
                    style={[styles.optionLabel, { color: glass.text, fontSize: f.body }]}
                  >
                    {option.label}
                  </FlowText>
                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'radio-button-off'}
                    size={24}
                    color={selected ? glass.text : glass.mutedText}
                    accessibilityElementsHidden
                  />
                </View>
              </PressableHybrid>
            );
          })}
          {/* зачем (владелец, 2026-09-22: «убери эти кнопки и сделай так чтобы
              кнопка появлялась после того как ответ отправлен»): здесь раньше
              стояла кнопка-действие выбранного варианта. Она дёргала
              router.push из-под нативной шторки — экран менялся НЕВИДИМО, и тап
              выглядел мёртвым. Теперь действия копятся и показываются на
              финальном экране (collectSurveyFollowUps). */}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sheetContent: { flex: 1, minHeight: 0, paddingBottom: 4 },
  feedbackScroll: { flex: 1, minHeight: 0 },
  feedbackScrollContent: { flexGrow: 1, paddingVertical: 20 },
  feedbackTitle: { fontWeight: '700', lineHeight: 28, marginBottom: 20 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, paddingTop: 2 },
  barRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barSpacer: { minWidth: 48, minHeight: 48 },
  backButton: { minWidth: 48, minHeight: 48 },
  backButtonContent: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  closeButton: { minWidth: 48, minHeight: 48 },
  closeButtonContent: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '800', lineHeight: 28, marginTop: 6, letterSpacing: -0.2 },
  subtitle: { marginTop: 8, lineHeight: 23 },
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
  option: { minHeight: 56, borderRadius: 18 },
  optionContent: { minHeight: 56, paddingHorizontal: 16, paddingVertical: 14 },
  optionTone: { ...StyleSheet.absoluteFillObject, borderRadius: 18 },
  optionInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionDimmed: { opacity: 0.42 },
  optionLabel: { flex: 1, fontWeight: '700', lineHeight: 22 },
  textInput: { minHeight: 120, borderRadius: 16, padding: 16, textAlignVertical: 'top', lineHeight: 23 },
  cta: { minHeight: 52, borderRadius: 26, marginTop: 8 },
  ctaContent: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18 },
  ctaLabel: { fontWeight: '700', textAlign: 'center' },
});
