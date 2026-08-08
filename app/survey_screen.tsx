// ════════════════════════════════════════════════════════════════════════════
// survey_screen.tsx — экран прохождения опроса за осколки.
// Данные приходят через survey_handoff (primeSurvey перед навигацией).
// Дизайн: без обводок контейнеров (правило проекта), тон/градиент; клик-звук
// только на управляющих кнопках, варианты ответа — только вибрация.
// ════════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { useLocalSearchParams, useRouter } from 'expo-router';
import TapScale from '../components/TapScale';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import { useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { screenTextOnGradient } from '../constants/theme';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { safeRouterBack } from './navigation_back';
import { getCanonicalUserId } from './user_id_policy';
import { replaceShardsBalanceForAccountGeneration, SHARD_REWARDS } from './shards_system';
import { emitAppEvent } from './events';
import { submitSurvey, type SurveyQuestionClient } from './survey_client';
import { takePrimedSurvey, clearPrimedSurvey } from './survey_handoff';
import { markSurveyDailyTaskDone } from './survey_daily_task';
import { getTodayKey } from './daily_tasks';
import { beginSurveyDailyTaskRequest, commitSurveyDailyTaskRequest } from './survey_daily_task_cache';
import { buildServerConfirmedLegacyCompletion } from './survey_daily_challenge_model';
import SurveyRewardPanel from '../components/survey/SurveyRewardPanel';
import { captureAccountGeneration, isCurrentAccountGeneration } from './account_generation';
import { initialSurveySubmissionState, reduceSurveySubmission, surveyRewardForDisplay, type SurveySubmitErrorKey } from './survey_submission_state';

type AnswersState = Record<string, { optionId?: string; comment?: string }>;

export default function SurveyScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const { theme: t, f, themeMode } = useTheme();
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const directOpenDayKey = useRef(getTodayKey()).current;
  const params = useLocalSearchParams<{ surveyId?: string; stableId?: string; dayKey?: string; lang?: string }>();
  const surveyId = String(params.surveyId ?? '');
  const scope = useMemo(() => {
    const stableId = String(params.stableId ?? '');
    const dayKey = String(params.dayKey ?? '');
    return stableId && dayKey && params.lang === lang ? { stableId, dayKey, lang } : undefined;
  }, [lang, params.dayKey, params.lang, params.stableId]);
  const survey = useMemo(() => takePrimedSurvey(surveyId, scope), [scope, surveyId]);

  const [answers, setAnswers] = useState<AnswersState>({});
  const [submission, dispatchSubmission] = useReducer(reduceSurveySubmission, initialSurveySubmissionState);
  const [stepIndex, setStepIndex] = useState(0);
  const stepAnim = useRef(new Animated.Value(1)).current; // 1 = виден, 0 = уходит
  const openedDayKey = useRef(scope?.dayKey ?? directOpenDayKey).current;
  const mountedRef = useRef(true);
  const attemptIdRef = useRef(0);
  const requestActiveRef = useRef(false);
  const closeStartedRef = useRef(false);
  const autoReturnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitting = submission.phase === 'optimistic-reward';

  const clearAutoReturnTimer = useCallback(() => {
    if (autoReturnTimerRef.current) clearTimeout(autoReturnTimerRef.current);
    autoReturnTimerRef.current = null;
  }, []);
  const closeScreen = useCallback(() => {
    if (closeStartedRef.current) return;
    closeStartedRef.current = true;
    clearAutoReturnTimer();
    clearPrimedSurvey();
    if (mountedRef.current) safeRouterBack(router);
  }, [clearAutoReturnTimer, router]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearAutoReturnTimer();
    };
  }, [clearAutoReturnTimer]);

  useEffect(() => {
    clearAutoReturnTimer();
    if (submission.phase !== 'reconciled') return;
    autoReturnTimerRef.current = setTimeout(closeScreen, 1400);
    return clearAutoReturnTimer;
  }, [clearAutoReturnTimer, closeScreen, submission.phase]);

  const currentQuestion = survey?.questions[stepIndex];
  const isLastStep = !!survey && stepIndex >= survey.questions.length - 1;

  const currentAnswered = useMemo(() => {
    if (!currentQuestion) return false;
    const a = answers[currentQuestion.id];
    if (currentQuestion.type === 'text') return !!a?.comment && a.comment.trim().length > 0;
    return !!a?.optionId;
  }, [currentQuestion, answers]);

  const allAnswered = useMemo(() => {
    if (!survey) return false;
    return survey.questions.every((q) => {
      const a = answers[q.id];
      if (q.type === 'text') return !!a?.comment && a.comment.trim().length > 0;
      return !!a?.optionId;
    });
  }, [survey, answers]);

  // Плавный переход между вопросами: fade+slide out → сменить индекс → in.
  // Guard от двойного тапа: пока анимация идёт, повторные вызовы игнорируем —
  // иначе быстрые тапы «Дальше» сбивали индекс/анимацию.
  const animatingRef = useRef(false);
  const goToStep = useCallback((next: number) => {
    if (animatingRef.current) return;
    animatingRef.current = true;
    Animated.timing(stepAnim, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => {
      setStepIndex(next);
      Animated.timing(stepAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start(() => {
        animatingRef.current = false;
      });
    });
  }, [stepAnim]);

  const pickOption = useCallback((qId: string, optionId: string) => {
    hapticTap();
    setAnswers((prev) => ({ ...prev, [qId]: { ...prev[qId], optionId } }));
  }, []);

  const setComment = useCallback((qId: string, comment: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: { ...prev[qId], comment } }));
  }, []);

  const presentAccountChanged = useCallback((attemptId: number) => {
    if (mountedRef.current && attemptIdRef.current === attemptId) {
      dispatchSubmission({ type: 'submit_failed', attemptId, messageKey: 'account_changed' });
    }
  }, []);

  const onSubmit = useCallback(async () => {
    if (!survey || requestActiveRef.current || !allAnswered) return;
    hapticTap();
    clearAutoReturnTimer();
    requestActiveRef.current = true;
    attemptIdRef.current += 1;
    const attemptId = attemptIdRef.current;
    // зачем: оптимистично показываем РОВНО ту сумму, которую выдаст сервер
    // (SURVEY_SHARD_AMOUNT = 1, фиксировано). Раньше здесь стоял survey.rewardShards
    // из конфига опроса (дефолт 3) — сервер его игнорирует, и панель на долю секунды
    // мигала «+3», а затем схлопывалась в реальную выплату. Прыжок цифры убран.
    dispatchSubmission({ type: 'submit_started', attemptId, expectedReward: SHARD_REWARDS.survey_completed });
    try {
      const stableId = scope?.stableId ?? await getCanonicalUserId();
      if (!stableId) throw new Error('no_profile');
      const accountToken = captureAccountGeneration();
      if (accountToken.phase !== 'active' || !isCurrentAccountGeneration(accountToken, stableId)) {
        presentAccountChanged(attemptId);
        return;
      }
      const res = await submitSurvey({
        stableId,
        surveyId: survey.surveyId,
        answers,
        platform: Platform.OS,
        appVersion: Constants.expoConfig?.version ?? 'unknown',
      });
      if (!isCurrentAccountGeneration(accountToken, stableId)) {
        presentAccountChanged(attemptId);
        return;
      }
      const balanceReconciled = await replaceShardsBalanceForAccountGeneration(res.balanceAfter, accountToken, stableId, {
        updatedAtMs: res.shardsUpdatedAtMs ?? undefined,
        op: 'earn',
        reason: 'survey_completed',
      });
      if (!isCurrentAccountGeneration(accountToken, stableId) || balanceReconciled === 'stale-generation') {
        presentAccountChanged(attemptId);
        return;
      }
      if (balanceReconciled === 'failed') throw new Error('balance_reconcile_failed');
      const markerWritten = await markSurveyDailyTaskDone({ stableId, dayKey: openedDayKey, summary: { surveyId: survey.surveyId, title: survey.title } });
      if (!isCurrentAccountGeneration(accountToken, stableId)) {
        presentAccountChanged(attemptId);
        return;
      }
      if (!markerWritten) throw new Error('marker_reconcile_failed');
      const completedScope = { stableId, dayKey: openedDayKey, lang };
      if (!isCurrentAccountGeneration(accountToken, stableId)) {
        presentAccountChanged(attemptId);
        return;
      }
      const cacheCommitted = commitSurveyDailyTaskRequest(completedScope, beginSurveyDailyTaskRequest(completedScope), buildServerConfirmedLegacyCompletion(lang));
      if (!cacheCommitted) throw new Error('cache_reconcile_failed');
      if (!mountedRef.current || attemptIdRef.current !== attemptId) return;
      dispatchSubmission({ type: 'submit_succeeded', attemptId, reward: res.reward });
      hapticSuccess();
      if (res.reward > 0) emitAppEvent('shards_earned', { amount: res.reward, reasonKey: 'survey_completed' });
    } catch (e: unknown) {
      const raw = String((e as { message?: string })?.message ?? e ?? '').toLowerCase();
      const messageKey: SurveySubmitErrorKey = raw.includes('rate_limited') || raw.includes('resource-exhausted')
        ? 'rate_limited'
        : raw.includes('unknown_survey')
          ? 'unknown_survey'
          : raw.includes('unauthenticated') || raw.includes('no_profile')
        ? 'auth'
        : raw.includes('network')
          ? 'network'
          : raw.includes('unavailable')
            ? 'unavailable'
          : raw.includes('server') || raw.includes('internal')
            ? 'server'
            : 'unknown';
      if (mountedRef.current && attemptIdRef.current === attemptId) {
        dispatchSubmission({ type: 'submit_failed', attemptId, messageKey });
      }
    } finally {
      if (attemptIdRef.current === attemptId) requestActiveRef.current = false;
    }
  }, [survey, allAnswered, clearAutoReturnTimer, scope?.stableId, answers, openedDayKey, lang, presentAccountChanged]);

  if (!survey) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            <View style={styles.centerBox}>
              <Text style={{ color: sx.primary, fontSize: f.body }}>
                {triLang(lang, {
                  ru: 'Опрос недоступен.', uk: 'Опитування недоступне.', es: 'Encuesta no disponible.',
                  'pt-BR': 'Pesquisa indisponível.', vi: 'Khảo sát không khả dụng.', id: 'Survei tidak tersedia.',
                  tr: 'Anket kullanılamıyor.', pl: 'Ankieta niedostępna.',
                })}
              </Text>
              <TapScale onPress={() => { hapticTap(); safeRouterBack(router); }} style={[styles.primaryBtn, { backgroundColor: sx.primary }]}>
                <Text style={{ color: t.bgPrimary, fontWeight: '700', fontSize: f.body }}>OK</Text>
              </TapScale>
            </View>
          </ContentWrap>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  if (submission.phase !== 'editing') {
    const confirmedZero = submission.phase === 'reconciled' && submission.confirmedReward === 0;
    const errorText = submission.messageKey === 'account_changed' ? triLang(lang, {
      ru: 'Аккаунт изменился. Вернись и открой опрос снова.', uk: 'Акаунт змінився. Повернися й відкрий опитування знову.',
      es: 'La cuenta cambió. Vuelve y abre la encuesta de nuevo.', 'pt-BR': 'A conta mudou. Volte e abra a pesquisa novamente.',
      vi: 'Tài khoản đã thay đổi. Hãy quay lại và mở lại khảo sát.', id: 'Akun berubah. Kembali dan buka survei lagi.',
      tr: 'Hesap değişti. Geri dönüp anketi yeniden aç.', pl: 'Konto zostało zmienione. Wróć i otwórz ankietę ponownie.',
    }) : submission.messageKey === 'rate_limited' ? triLang(lang, {
      ru: 'Слишком много опросов подряд. Попробуй позже.', uk: 'Забагато опитувань поспіль. Спробуй пізніше.',
      es: 'Demasiadas encuestas seguidas. Inténtalo más tarde.', 'pt-BR': 'Muitas pesquisas seguidas. Tente mais tarde.',
      vi: 'Quá nhiều khảo sát liên tiếp. Thử lại sau.', id: 'Terlalu banyak survei berturut-turut. Coba nanti.',
      tr: 'Arka arkaya çok fazla anket. Sonra dene.', pl: 'Zbyt wiele ankiet z rzędu. Spróbuj później.',
    }) : submission.messageKey === 'unknown_survey' ? triLang(lang, {
      ru: 'Опрос уже недоступен.', uk: 'Опитування вже недоступне.', es: 'La encuesta ya no está disponible.',
      'pt-BR': 'A pesquisa não está mais disponível.', vi: 'Khảo sát không còn khả dụng.', id: 'Survei sudah tidak tersedia.',
      tr: 'Anket artık kullanılamıyor.', pl: 'Ankieta jest już niedostępna.',
    }) : triLang(lang, {
      ru: submission.messageKey === 'auth' ? 'Не удалось подтвердить аккаунт. Попробуй снова.' : 'Не удалось отправить. Попробуй снова.',
      uk: submission.messageKey === 'auth' ? 'Не вдалося підтвердити акаунт. Спробуй ще раз.' : 'Не вдалося надіслати. Спробуй ще раз.',
      es: 'No se pudo enviar. Inténtalo de nuevo.', 'pt-BR': 'Falha ao enviar. Tente de novo.',
      vi: 'Gửi không thành công. Thử lại.', id: 'Gagal mengirim. Coba lagi.',
      tr: 'Gönderilemedi. Tekrar dene.', pl: 'Nie udało się wysłać. Spróbuj ponownie.',
    });
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            <View style={styles.finalBox}>
              <SurveyRewardPanel
                phase={submission.phase}
                reward={surveyRewardForDisplay(submission)}
                title={confirmedZero ? triLang(lang, {
                  ru: 'Опрос уже пройден', uk: 'Опитування вже пройдено', es: 'Encuesta ya completada',
                  'pt-BR': 'Pesquisa já respondida', vi: 'Đã hoàn thành khảo sát', id: 'Survei sudah diisi',
                  tr: 'Anket zaten tamamlandı', pl: 'Ankieta już wypełniona',
                }) : (survey.finalTitle?.trim() || triLang(lang, {
                  ru: 'Спасибо!', uk: 'Дякуємо!', es: '¡Gracias!', 'pt-BR': 'Obrigado!',
                  vi: 'Cảm ơn!', id: 'Terima kasih!', tr: 'Teşekkürler!', pl: 'Dziękujemy!',
                }))}
                subtitle={survey.finalSubtitle?.trim() || ''}
                error={errorText}
                onDone={closeScreen}
                onRetry={() => { void onSubmit(); }}
                retryDisabled={submission.messageKey === 'account_changed'}
                onBack={closeScreen}
              />
            </View>
          </ContentWrap>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  const total = survey.questions.length;
  const onNext = () => {
    if (!currentAnswered) return;
    if (isLastStep) { void onSubmit(); return; }
    hapticTap();
    goToStep(stepIndex + 1);
  };
  const onPrev = () => {
    if (stepIndex === 0) { safeRouterBack(router); return; }
    hapticTap();
    goToStep(stepIndex - 1);
  };

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          <View style={styles.header}>
            <TapScale onPress={() => { hapticTap(); onPrev(); }} style={{ marginRight: 12, padding: 4 }}>
              <Ionicons name="chevron-back" size={28} color={sx.primary} />
            </TapScale>
            <View style={{ flex: 1 }}>
              <Text style={{ color: sx.primary, fontSize: f.h2, fontWeight: '700' }}>{survey.title}</Text>
            </View>
            <Text style={{ color: sx.second, fontSize: f.numMd, fontWeight: '700' }}>{stepIndex + 1}/{total}</Text>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: sx.ghost }]}>
            <View style={{ height: '100%', borderRadius: 3, backgroundColor: survey.accentColor || sx.second, width: `${((stepIndex + 1) / total) * 100}%` }} />
          </View>

          <ScrollView decelerationRate="normal" style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
            {currentQuestion && (
              <Animated.View style={{ opacity: stepAnim, transform: [{ translateX: stepAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }}>
              <QuestionBlock
                index={stepIndex + 1}
                question={currentQuestion}
                selectedOption={answers[currentQuestion.id]?.optionId}
                comment={answers[currentQuestion.id]?.comment ?? ''}
                onPick={(optId) => pickOption(currentQuestion.id, optId)}
                onComment={(txt) => setComment(currentQuestion.id, txt)}
                sx={sx}
                cardBg={t.bgCard}
                fontBody={f.body}
                fontLabel={f.label}
                placeholder={triLang(lang, {
                  ru: 'Напиши ответ…', uk: 'Напиши відповідь…', es: 'Escribe tu respuesta…',
                  'pt-BR': 'Escreva sua resposta…', vi: 'Nhập câu trả lời…', id: 'Tulis jawaban…',
                  tr: 'Cevabını yaz…', pl: 'Wpisz odpowiedź…',
                })}
              />
              </Animated.View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TapScale
              disabled={!currentAnswered || submitting}
              onPress={onNext}
              style={[styles.primaryBtn, { backgroundColor: currentAnswered && !submitting ? (survey.accentColor || sx.primary) : sx.ghost, opacity: currentAnswered && !submitting ? 1 : 0.6 }]}
            >
              {submitting ? (
                <ActivityIndicator color={t.bgPrimary} />
              ) : (
                <Text style={{ color: t.bgPrimary, fontWeight: '800', fontSize: f.body }}>
                  {isLastStep
                    ? triLang(lang, { ru: 'Отправить', uk: 'Надіслати', es: 'Enviar', 'pt-BR': 'Enviar', vi: 'Gửi', id: 'Kirim', tr: 'Gönder', pl: 'Wyślij' })
                    : triLang(lang, { ru: 'Дальше', uk: 'Далі', es: 'Siguiente', 'pt-BR': 'Próximo', vi: 'Tiếp', id: 'Lanjut', tr: 'İleri', pl: 'Dalej' })}
                </Text>
              )}
            </TapScale>
          </View>
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>
  );
}

type QuestionBlockProps = {
  index: number;
  question: SurveyQuestionClient;
  selectedOption?: string;
  comment: string;
  onPick: (optionId: string) => void;
  onComment: (text: string) => void;
  sx: ReturnType<typeof screenTextOnGradient>;
  cardBg: string;
  fontBody: number;
  fontLabel: number;
  placeholder: string;
};

function QuestionBlock({ index, question, selectedOption, comment, onPick, onComment, sx, cardBg, fontBody, fontLabel, placeholder }: QuestionBlockProps) {
  return (
    <View style={[styles.questionCard, { backgroundColor: cardBg }]}>
      <Text style={{ color: sx.primary, fontSize: fontBody, fontWeight: '700', marginBottom: 12 }}>
        {index}. {question.text}
      </Text>
      {question.type === 'text' ? (
        <TextInput
          value={comment}
          onChangeText={onComment}
          placeholder={placeholder}
          placeholderTextColor={sx.muted}
          multiline
          maxLength={500}
          style={[styles.textInput, { color: sx.primary, backgroundColor: sx.ghost }]}
        />
      ) : (
        <View style={{ gap: 8 }}>
          {question.options.map((opt) => {
            const active = selectedOption === opt.id;
            return (
              <TapScale
                key={opt.id}
                onPress={() => onPick(opt.id)}
                style={[styles.optionRow, { backgroundColor: active ? sx.second : sx.ghost }]}
              >
                <Text style={{ color: active ? '#1a1a1a' : sx.primary, fontSize: fontLabel, fontWeight: active ? '700' : '500', flex: 1 }}>
                  {opt.label}
                </Text>
                {active && <Ionicons name="checkmark-circle" size={20} color="#1a1a1a" />}
              </TapScale>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 },
  finalBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  finalBadge: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { height: 6, borderRadius: 3, marginHorizontal: 16, marginBottom: 4, overflow: 'hidden' },
  questionCard: { borderRadius: 20, padding: 16 },
  optionRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  textInput: { borderRadius: 14, padding: 12, minHeight: 90, textAlignVertical: 'top', fontSize: 15 },
  footer: { paddingHorizontal: 16, paddingVertical: 12, position: 'absolute', bottom: 0, left: 0, right: 0 },
  primaryBtn: { borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
});
