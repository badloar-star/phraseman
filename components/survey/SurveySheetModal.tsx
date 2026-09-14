import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
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

import Reanimated from 'react-native-reanimated';

import { oskolokImageForPackShards } from '../../app/oskolok';
import { peekLastKnownShardsBalance } from '../../app/shards_system';
import { surveyRewardForDisplay } from '../../app/survey_submission_state';
import { openStoreReviewPage } from '../../app/store_review';
import {
  useSurveyFlowController,
  type SurveyDurableScope,
  type SurveyFlowController,
  type SurveyLaunch,
} from '../../app/survey_flow_controller';
import type { SurveyAppRoute, SurveyQuestionClient } from '../../app/survey_client';
import { SURVEY_HYBRID } from '../../constants/motionHybrid';
import { triLang, type Lang } from '../../constants/i18n';
import { isLightThemeMode } from '../../constants/theme';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import HybridSheetShell from '../modal_fx/HybridSheetShell';
import PressableHybrid from '../PressableHybrid';
import { useTheme } from '../ThemeContext';
import { FlowText } from '../text-integrity/FlowText';
import SurveyPearlChip from './SurveyPearlChip';
import SurveyPearlFlight, { type SurveyFlightPoint } from './SurveyPearlFlight';
import SurveyQuestionTransition from './SurveyQuestionTransition';
import SurveyRewardPanel, { SURVEY_PURPLE_TONE, type SurveyRewardPanelPhase } from './SurveyRewardPanel';
import { useSurveyRewardImpact } from './useSurveyRewardImpact';

const SURVEY_PROGRESS_GAP_PX = 2;

/**
 * Тайминги хореографии «Прилив» (макет A, владелец 2026-09-13).
 * pillSettleMs — «+1» встал в строку, только потом старт перелёта;
 * settleMs — чип докрутился, человек увидел новое число, затем автопереход;
 * stepAdvanceMs — на промежуточном вопросе (без награды) просто короткая пауза.
 */
const SURVEY_TIDE = {
  pillSettleMs: 140,
  settleMs: 520,
  stepAdvanceMs: 320,
} as const;

type SurveyOptionClient = SurveyQuestionClient['options'][number];

/** Логи ранних выходов хореографии (правило владельца «сперва логи»): редкие события, не покадровые. */
function logTide(message: string): void {
  console.log(`[SURVEY-TIDE] ${message}`); // guard-ok: ранние выходы обязаны логироваться и в проде
}

type CelebrationToken = { cancelled: boolean; timers: ReturnType<typeof setTimeout>[] };

type MeasuredBox = { x: number; y: number; width: number; height: number };

function measureBox(node: View | null): Promise<MeasuredBox | null> {
  return new Promise((resolve) => {
    if (!node) {
      resolve(null);
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      resolve(Number.isFinite(x) && Number.isFinite(y) && width > 0 && height > 0 ? { x, y, width, height } : null);
    });
  });
}

export interface SurveySheetModalProps {
  visible: boolean;
  launch: SurveyLaunch;
  onClose: () => void;
  /**
   * Баланс жемчуга владельца экрана (Главная передаёт живой shardsBalance).
   * Без него берём последний известный локальный баланс; чип показывает
   * баланс + optimistic-дельту после ответа.
   */
  pearlBalance?: number;
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
  pearlBalance: (value: number) => string;
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
    pearlBalance: (value) => pick({
      ru: `Жемчуг: ${value}`, uk: `Перлини: ${value}`, en: `Pearls: ${value}`, es: `Perlas: ${value}`, 'pt-BR': `Pérolas: ${value}`,
      vi: `Ngọc trai: ${value}`, id: `Mutiara: ${value}`, tr: `İnci: ${value}`, pl: `Perły: ${value}`,
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
 * из библиотеки опросов в Firestore, где заголовок заканчивался «💎». Жемчужина
 * на панели уже нарисована ассетом, эмодзи-алмаз спорит с ней. Чистим на клиенте,
 * чтобы правка не ждала переиздания библиотеки.
 */
function stripCurrencyEmoji(text?: string): string {
  return (text ?? '').replace(/\s*[💎🔷🔹💠]/gu, '').trim();
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
  pearlBalance,
}: SurveySheetModalProps) {
  const { theme: t } = useTheme();
  const copy = useMemo(() => sheetCopy(launch.lang), [launch.lang]);
  // зачем: чип обязан показать число с первого кадра; peek читает память сессии
  // без диска и сети, а живой баланс родителя (если передан) главнее.
  const resolvedPearlBalance = pearlBalance ?? peekLastKnownShardsBalance() ?? 0;
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
          pearlBalance={resolvedPearlBalance}
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
  pearlBalance,
}: {
  launch: SurveyLaunch;
  shellRequestDismiss: () => void;
  registerDeactivate: (deactivate: () => void) => void;
  onDurablyReconciled?: (scope: SurveyDurableScope) => void;
  pearlBalance: number;
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
      pearlBalance={pearlBalance}
    />
  );
}

function SurveySheetContent({
  launch,
  flow,
  shellRequestDismiss,
  deactivateForDismiss,
  autoCloseRequest,
  pearlBalance,
}: {
  launch: SurveyLaunch;
  flow: SurveyFlowController;
  shellRequestDismiss: () => void;
  deactivateForDismiss: () => void;
  autoCloseRequest: number;
  pearlBalance: number;
}) {
  const { theme: t, f } = useTheme();
  const router = useRouter();
  const reduceMotion = useReduceMotion();
  const { survey, lang } = launch;
  const copy = useMemo(() => sheetCopy(lang), [lang]);
  const sheetTitleRef = useRef<Text | null>(null);
  const questionTitleRef = useRef<Text | null>(null);
  const rootRef = useRef<View | null>(null);
  const chipRef = useRef<View | null>(null);
  const rewardPillRef = useRef<View | null>(null);
  const previousQuestionIdRef = useRef(flow.currentQuestion.id);
  const handledAutoCloseRequestRef = useRef(autoCloseRequest);
  const mountedRef = useRef(true);
  const goBack = flow.goBack;
  const goNext = flow.goNext;
  const goNextRef = useRef(goNext);
  useEffect(() => {
    goNextRef.current = goNext;
  }, [goNext]);

  // ── Optimistic-дельта баланса (закон №10 владельца) ────────────────────────
  // зачем: чип растёт сразу после перелёта, сервер догоняет фоном. Откат при
  // retryable-error и при «опрос уже пройден» (confirmedReward === 0). Когда
  // живой баланс родителя вырос — дельта схлопывается, чтобы число не прыгнуло
  // дважды (last-write-guard как в истории с осколками).
  const [optimisticDelta, setOptimisticDelta] = useState(0);
  const pearlBaseRef = useRef(pearlBalance);
  useEffect(() => {
    const grew = pearlBalance - pearlBaseRef.current;
    pearlBaseRef.current = pearlBalance;
    if (grew > 0) setOptimisticDelta((delta) => Math.max(0, delta - grew));
  }, [pearlBalance]);
  const submissionPhase = flow.submission.phase;
  const confirmedReward = flow.submission.confirmedReward;
  useEffect(() => {
    const rollback = submissionPhase === 'retryable-error'
      || (submissionPhase === 'reconciled' && confirmedReward === 0);
    if (!rollback) return;
    setOptimisticDelta((delta) => {
      if (delta !== 0) {
        logTide(`откат optimistic-дельты: phase=${submissionPhase} confirmedReward=${confirmedReward} delta=${delta}`);
      }
      return 0;
    });
  }, [confirmedReward, submissionPhase]);
  const pearlShown = pearlBalance + optimisticDelta;

  // ── Хореография ответа: «+1» → перелёт → докрутка → автопереход ─────────────
  const [celebrating, setCelebrating] = useState(false);
  const [flight, setFlight] = useState<{ from: SurveyFlightPoint; to: SurveyFlightPoint } | null>(null);
  const celebrationRef = useRef<CelebrationToken | null>(null);
  const finishCelebration = useCallback(() => {
    celebrationRef.current = null;
    if (!mountedRef.current) return;
    setFlight(null);
    setCelebrating(false);
  }, []);
  const cancelCelebration = useCallback((reason: string) => {
    const active = celebrationRef.current;
    if (!active) return;
    logTide(`хореография отменена: ${reason}`);
    active.cancelled = true;
    active.timers.forEach(clearTimeout);
    finishCelebration();
  }, [finishCelebration]);
  useEffect(() => () => {
    mountedRef.current = false;
    cancelCelebration('unmount');
  }, [cancelCelebration]);

  const scheduleGoNext = useCallback((token: CelebrationToken, delayMs: number) => {
    const timer = setTimeout(() => {
      if (token.cancelled) return;
      finishCelebration();
      goNextRef.current();
    }, delayMs);
    token.timers.push(timer);
  }, [finishCelebration]);

  const startFlight = useCallback(async (token: CelebrationToken) => {
    const [root, pill, chip] = await Promise.all([
      measureBox(rootRef.current),
      measureBox(rewardPillRef.current),
      measureBox(chipRef.current),
    ]);
    if (token.cancelled || !mountedRef.current) return;
    if (!root || !pill || !chip) {
      logTide(`перелёт пропущен: root=${root ? 'ok' : 'null'} pill=${pill ? 'ok' : 'null'} chip=${chip ? 'ok' : 'null'}; начисляем без полёта`);
      setOptimisticDelta((delta) => delta + 1);
      scheduleGoNext(token, SURVEY_TIDE.settleMs);
      return;
    }
    setFlight({
      from: { x: pill.x - root.x + pill.width / 2, y: pill.y - root.y + pill.height / 2 },
      to: { x: chip.x - root.x + chip.width / 2, y: chip.y - root.y + chip.height / 2 },
    });
  }, [scheduleGoNext]);

  const handleFlightArrive = useCallback(() => {
    const token = celebrationRef.current;
    setFlight(null);
    setOptimisticDelta((delta) => delta + 1);
    if (!token || token.cancelled) {
      logTide('прилёт после отмены: дельта показана, автопереход не делаем');
      return;
    }
    scheduleGoNext(token, SURVEY_TIDE.settleMs);
  }, [scheduleGoNext]);

  const showInlineReward = flow.isLastStep && survey.rewardShards > 0;

  const handlePicked = useCallback((option: SurveyOptionClient) => {
    if (option.action?.kind === 'app_route') {
      logTide('автопереход пропущен: вариант ведёт на экран, кнопка остаётся');
      return;
    }
    if (celebrationRef.current) {
      logTide('повторный тап во время хореографии: игнор');
      return;
    }
    const token: CelebrationToken = { cancelled: false, timers: [] };
    celebrationRef.current = token;
    setCelebrating(true);
    if (!showInlineReward) {
      scheduleGoNext(token, SURVEY_TIDE.stepAdvanceMs);
      return;
    }
    if (reduceMotion) {
      setOptimisticDelta((delta) => delta + 1);
      scheduleGoNext(token, SURVEY_TIDE.settleMs);
      return;
    }
    const timer = setTimeout(() => {
      if (token.cancelled) return;
      void startFlight(token);
    }, SURVEY_TIDE.pillSettleMs);
    token.timers.push(timer);
  }, [reduceMotion, scheduleGoNext, showInlineReward, startFlight]);

  const requestClose = useCallback(() => {
    cancelCelebration('close');
    deactivateForDismiss();
    shellRequestDismiss();
  }, [cancelCelebration, deactivateForDismiss, shellRequestDismiss]);

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
    cancelCelebration('back');
    if (goBack() === 'close') requestClose();
  }, [cancelCelebration, goBack, requestClose]);

  const showReward = flow.submission.phase === 'reconciled';
  const showError = flow.submission.phase === 'retryable-error';
  const showPendingAccepted = flow.submission.phase === 'optimistic-reward';
  const feedback = showPendingAccepted || showReward || showError;
  const feedbackPhase: SurveyRewardPanelPhase = showError
    ? 'retryable-error'
    : showPendingAccepted
      ? 'optimistic-reward'
      : 'reconciled';
  const confirmedZero = flow.submission.phase === 'reconciled'
    && flow.submission.confirmedReward === 0;

  // Кнопка внизу остаётся только там, где без неё нельзя: текстовый ответ и
  // вариант, ведущий на другой экран. Обычный выбор уходит сам (макет A).
  const selectedOptionId = flow.answers[flow.currentQuestion.id]?.optionId;
  const selectedAction = flow.currentQuestion.options.find((option) => option.id === selectedOptionId)?.action;
  const showCta = flow.currentQuestion.type === 'text' || selectedAction?.kind === 'app_route';

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
      <Ionicons name="close" size={24} color={t.textPrimary} accessibilityElementsHidden />
    </PressableHybrid>
  );

  return (
    <View ref={rootRef} testID="survey-sheet-content" style={styles.sheetContent}>
      {feedback ? (
        <>
          <View style={styles.bar}>
            <View style={styles.barSpacer} />
            <View style={styles.barRight}>
              <SurveyPearlChip
                testID="survey-pearl-chip"
                value={pearlShown}
                accessibilityLabel={copy.pearlBalance(pearlShown)}
              />
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
              style={[styles.feedbackTitle, { color: t.textPrimary, fontSize: f.h2 }]}
            >
              {survey.title}
            </FlowText>
            <SurveyRewardPanel
              phase={feedbackPhase}
              reward={surveyRewardForDisplay(flow.submission)}
              title={completionTitle(lang, confirmedZero, stripCurrencyEmoji(survey.finalTitle))}
              subtitle={stripCurrencyEmoji(survey.finalSubtitle)}
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
                  <Ionicons name="chevron-back" size={24} color={t.textPrimary} accessibilityElementsHidden />
                </PressableHybrid>
                <View style={styles.barRight}>
                  <SurveyPearlChip
                    ref={chipRef}
                    testID="survey-pearl-chip"
                    value={pearlShown}
                    accessibilityLabel={copy.pearlBalance(pearlShown)}
                  />
                  {closeButton}
                </View>
              </View>
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

              {survey.subtitle.trim() ? (
                <FlowText
                  testID="survey-sheet-subtitle"
                  provenance="authored"
                  style={[styles.subtitle, { color: t.textSecond, fontSize: f.body }]}
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
                style={[styles.progressCopy, { color: t.textSecond, fontSize: f.label }]}
              >
                {progressLabel}
              </FlowText>
              <SurveyProgress current={current} total={total} accent={survey.accentColor || t.accent} track={t.bgSurface2} />

              <View style={styles.questionRegion}>
                <SurveyQuestionTransition transitionKey={flow.currentQuestion.id} direction={flow.direction}>
                  <SurveyQuestionFields
                    question={flow.currentQuestion}
                    selectedOption={selectedOptionId}
                    comment={flow.answers[flow.currentQuestion.id]?.comment ?? ''}
                    disabled={flow.submitting || celebrating}
                    placeholder={copy.placeholder}
                    controller={flow}
                    questionTitleRef={questionTitleRef}
                    hideQuestionTitle={survey.questions.length === 1
                      && flow.currentQuestion.text.trim() === survey.title.trim()}
                    onOpenRoute={(route) => router.push(route)}
                    onPicked={handlePicked}
                    showInlineReward={showInlineReward}
                    inlineRewardAmount={survey.rewardShards}
                    rewardPillRef={rewardPillRef}
                  />
                </SurveyQuestionTransition>
              </View>
            </View>
          </ScrollView>

          {showCta ? (
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
          ) : null}
        </>
      )}
      {flight ? (
        <SurveyPearlFlight
          testID="survey-pearl-flight"
          from={flight.from}
          to={flight.to}
          onArrive={handleFlightArrive}
        />
      ) : null}
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
  hideQuestionTitle,
  onOpenRoute,
  onPicked,
  showInlineReward,
  inlineRewardAmount,
  rewardPillRef,
}: {
  question: SurveyQuestionClient;
  selectedOption?: string;
  comment: string;
  disabled: boolean;
  placeholder: string;
  controller: Pick<SurveyFlowController, 'pickOption' | 'setComment'>;
  questionTitleRef: React.RefObject<Text | null>;
  hideQuestionTitle: boolean;
  onOpenRoute: (route: SurveyAppRoute) => void;
  onPicked: (option: SurveyOptionClient) => void;
  showInlineReward: boolean;
  inlineRewardAmount: number;
  rewardPillRef: React.RefObject<View | null>;
}) {
  const { theme: t, f, themeMode } = useTheme();
  const selectedAction = question.options.find((option) => option.id === selectedOption)?.action;
  const anySelected = question.options.some((option) => option.id === selectedOption);
  const lightTheme = isLightThemeMode(themeMode);
  const purpleAccent = lightTheme ? SURVEY_PURPLE_TONE.accentLight : SURVEY_PURPLE_TONE.accentDark;
  const onPurpleAccent = lightTheme ? SURVEY_PURPLE_TONE.onAccentLight : SURVEY_PURPLE_TONE.onAccentDark;
  return (
    <View style={styles.questionBody}>
      {!hideQuestionTitle ? (
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
      ) : null}
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
                onPress={() => {
                  controller.pickOption(question.id, option.id);
                  if (option.action?.kind === 'store_review') void openStoreReviewPage();
                  onPicked(option);
                }}
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
                {/* зачем: невыбранные варианты гаснут до 0.42 (макет A), чтобы
                    выбранный читался как единственный ответ, без обводок. */}
                <View style={[styles.optionInner, anySelected && !selected ? styles.optionDimmed : null]}>
                  <FlowText
                    testID={`survey-option-${option.id}-label`}
                    provenance="authored"
                    style={[styles.optionLabel, { color: t.textPrimary, fontSize: f.body }]}
                  >
                    {option.label}
                  </FlowText>
                  {selected && showInlineReward ? (
                    <SurveyInlineReward
                      ref={rewardPillRef}
                      testID={`survey-option-${option.id}-reward`}
                      amount={inlineRewardAmount}
                      accent={purpleAccent}
                      onAccent={onPurpleAccent}
                    />
                  ) : null}
                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'radio-button-off'}
                    size={24}
                    color={selected ? purpleAccent : t.textMuted}
                    accessibilityElementsHidden
                  />
                </View>
              </PressableHybrid>
            );
          })}
          {selectedAction?.kind === 'app_route' ? (
            <PressableHybrid
              testID="survey-option-action-cta"
              variant="secondary"
              onPress={() => onOpenRoute(selectedAction.route)}
              withHaptic={false}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={selectedAction.cta}
              accessibilityState={{ disabled }}
              style={[styles.actionCta, { backgroundColor: t.accentBg }]}
              contentStyle={styles.actionCtaContent}
            >
              <FlowText
                testID="survey-option-action-cta-label"
                provenance="authored"
                style={[styles.actionCtaLabel, { color: t.accent, fontSize: f.body }]}
              >
                {selectedAction.cta}
              </FlowText>
              <Ionicons name="arrow-forward" size={20} color={t.accent} accessibilityElementsHidden />
            </PressableHybrid>
          ) : null}
        </View>
      )}
    </View>
  );
}

/**
 * «+1 жемчужина» в строке выбранного ответа (макет A): встаёт с лёгким
 * подлётом и пружиной (тот же useSurveyRewardImpact, что у панели), затем с
 * этой точки стартует перелёт в чип. Ref нужен родителю для замера точки старта.
 */
const SurveyInlineReward = React.forwardRef<View, {
  amount: number;
  accent: string;
  onAccent: string;
  testID: string;
}>(function SurveyInlineReward({ amount, accent, onAccent, testID }, ref) {
  const { f, themeMode } = useTheme();
  const motionStyle = useSurveyRewardImpact(true);
  return (
    <Reanimated.View
      ref={ref}
      testID={testID}
      accessible
      accessibilityLabel={`+${amount}`}
      style={[styles.plusPill, { backgroundColor: accent }, motionStyle]}
    >
      <FlowText testID={`${testID}-label`} provenance="authored" style={[styles.plusLabel, { color: onAccent, fontSize: f.label }]}>
        {`+${amount}`}
      </FlowText>
      <Image
        source={oskolokImageForPackShards(amount, themeMode)}
        style={styles.plusArt}
        contentFit="contain"
        accessible={false}
        importantForAccessibility="no"
      />
    </Reanimated.View>
  );
});

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
  option: { minHeight: 56, borderRadius: 18, overflow: 'hidden' },
  optionContent: { minHeight: 56, paddingHorizontal: 16, paddingVertical: 14 },
  optionTone: { ...StyleSheet.absoluteFillObject },
  optionInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionDimmed: { opacity: 0.42 },
  optionLabel: { flex: 1, fontWeight: '700', lineHeight: 22 },
  plusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 28, paddingLeft: 8, paddingRight: 6, borderRadius: 14 },
  plusLabel: { fontWeight: '800', lineHeight: 18, fontVariant: ['tabular-nums'] },
  plusArt: { width: 18, height: 18 },
  actionCta: { minHeight: 48, borderRadius: 18 },
  actionCtaContent: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
  actionCtaLabel: { fontWeight: '700', textAlign: 'center' },
  textInput: { minHeight: 120, borderRadius: 16, padding: 16, textAlignVertical: 'top', lineHeight: 23 },
  cta: { minHeight: 52, borderRadius: 18, marginTop: 8 },
  ctaContent: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18 },
  ctaLabel: { fontWeight: '700', textAlign: 'center' },
});
