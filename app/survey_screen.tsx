// ════════════════════════════════════════════════════════════════════════════
// survey_screen.tsx — экран прохождения опроса за осколки.
// Данные приходят через survey_handoff (primeSurvey перед навигацией).
// Дизайн: без обводок контейнеров (правило проекта), тон/градиент; клик-звук
// только на управляющих кнопках, варианты ответа — только вибрация.
// ════════════════════════════════════════════════════════════════════════════
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
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
import { replaceShardsBalanceLocal, getShardsBalance } from './shards_system';
import { emitAppEvent, actionToastTri } from './events';
import { submitSurvey, type SurveyQuestionClient } from './survey_client';
import { takePrimedSurvey, clearPrimedSurvey } from './survey_handoff';
import { markSurveyDailyTaskDone } from './survey_daily_task';
import { getTodayKey } from './daily_tasks';
import { beginSurveyDailyTaskRequest, commitSurveyDailyTaskRequest } from './survey_daily_task_cache';
import { buildServerConfirmedLegacyCompletion } from './survey_daily_challenge_model';

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
  const [submitting, setSubmitting] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [finalReward, setFinalReward] = useState<number | null>(null); // не-null → показать финальный экран
  const stepAnim = useRef(new Animated.Value(1)).current; // 1 = виден, 0 = уходит

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

  const onSubmit = useCallback(async () => {
    if (!survey || submitting || !allAnswered) return;
    hapticTap();
    setSubmitting(true);
    try {
      const stableId = scope?.stableId ?? await getCanonicalUserId();
      if (!stableId) throw new Error('no_profile');
      const dayKey = scope?.dayKey ?? directOpenDayKey;
      const appVersion = Constants.expoConfig?.version ?? 'unknown';
      const res = await submitSurvey({
        stableId,
        surveyId: survey.surveyId,
        answers,
        platform: Platform.OS,
        appVersion,
      });
      if (typeof res.balanceAfter === 'number') {
        await replaceShardsBalanceLocal(res.balanceAfter, {
          updatedAtMs: res.shardsUpdatedAtMs ?? undefined,
          op: 'earn',
          reason: 'survey_completed',
        });
      } else if (res.reward > 0) {
        // Подстраховка: сервер не прислал баланс — перечитаем актуальный с диска,
        // чтобы UI не остался с устаревшим числом осколков после награды.
        await replaceShardsBalanceLocal(await getShardsBalance(), {
          op: 'earn',
          reason: 'survey_completed',
        });
      }
      hapticSuccess();
      // Отметить опрос выполненным как 4-е задание дня (для зачёта «любые 3 из 4»).
      await markSurveyDailyTaskDone({ stableId, dayKey, summary: { surveyId: survey.surveyId, title: survey.title } });
      const completedScope = { stableId, dayKey, lang };
      commitSurveyDailyTaskRequest(
        completedScope,
        beginSurveyDailyTaskRequest(completedScope),
        buildServerConfirmedLegacyCompletion(lang),
      );
      if (res.reward > 0) {
        emitAppEvent('shards_earned', { amount: res.reward, reasonKey: 'survey_completed' });
        // Награда есть → показываем ФИНАЛЬНЫЙ экран (анимация осколков + свой текст).
        // Уход с экрана — по кнопке «Готово».
        setFinalReward(res.reward);
      } else {
        // reward===0 → опрос уже был пройден (идемпотентность сервера). Финал без
        // награды не показываем — тихо закрываем с коротким тостом.
        emitAppEvent('action_toast', actionToastTri('success', {
          ru: 'Опрос уже пройден.', uk: 'Опитування вже пройдено.', es: 'Encuesta ya completada.',
          'pt-BR': 'Pesquisa já respondida.', vi: 'Đã hoàn thành khảo sát.', id: 'Survei sudah diisi.',
          tr: 'Anket zaten tamamlandı.', pl: 'Ankieta już wypełniona.',
        }));
        clearPrimedSurvey();
        safeRouterBack(router);
      }
    } catch (e: unknown) {
      const raw = String((e as { message?: string })?.message ?? e ?? '').toLowerCase();
      const msg = raw.includes('rate_limited') || raw.includes('resource-exhausted')
        ? { ru: 'Слишком много опросов подряд. Попробуй позже.', uk: 'Забагато опитувань поспіль. Спробуй пізніше.', es: 'Demasiadas encuestas seguidas. Inténtalo más tarde.', 'pt-BR': 'Muitas pesquisas seguidas. Tente mais tarde.', vi: 'Quá nhiều khảo sát liên tiếp. Thử lại sau.', id: 'Terlalu banyak survei berturut-turut. Coba nanti.', tr: 'Arka arkaya çok fazla anket. Sonra dene.', pl: 'Zbyt wiele ankiet z rzędu. Spróbuj później.' }
        : raw.includes('unknown_survey')
        ? { ru: 'Опрос уже недоступен.', uk: 'Опитування вже недоступне.', es: 'La encuesta ya no está disponible.', 'pt-BR': 'A pesquisa não está mais disponível.', vi: 'Khảo sát không còn khả dụng.', id: 'Survei sudah tidak tersedia.', tr: 'Anket artık kullanılamıyor.', pl: 'Ankieta jest już niedostępna.' }
        : raw.includes('unauthenticated') || raw.includes('no_profile')
        ? { ru: 'Нужен вход в облако. Попробуй снова.', uk: 'Потрібен вхід у хмару. Спробуй ще раз.', es: 'Hace falta sesión en la nube. Inténtalo de nuevo.', 'pt-BR': 'É preciso entrar na nuvem. Tente de novo.', vi: 'Cần đăng nhập đám mây. Thử lại.', id: 'Perlu masuk ke cloud. Coba lagi.', tr: 'Bulut oturumu gerekiyor. Tekrar dene.', pl: 'Wymagane logowanie do chmury. Spróbuj ponownie.' }
        : { ru: 'Не удалось отправить. Попробуй снова.', uk: 'Не вдалося надіслати. Спробуй ще раз.', es: 'No se pudo enviar. Inténtalo de nuevo.', 'pt-BR': 'Falha ao enviar. Tente de novo.', vi: 'Gửi không thành công. Thử lại.', id: 'Gagal mengirim. Coba lagi.', tr: 'Gönderilemedi. Tekrar dene.', pl: 'Nie udało się wysłać. Spróbuj ponownie.' };
      emitAppEvent('action_toast', actionToastTri('error', msg));
    } finally {
      setSubmitting(false);
    }
  }, [survey, submitting, allAnswered, answers, router, scope, directOpenDayKey, lang]);

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

  // ── ФИНАЛЬНЫЙ ЭКРАН (после последнего вопроса) ────────────────────────────
  if (finalReward !== null) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            <View style={styles.finalBox}>
              <View style={[styles.finalBadge, { backgroundColor: survey.accentColor || t.bgCard }]}>
                <Text style={{ fontSize: 44 }}>💎</Text>
              </View>
              {finalReward > 0 && (
                <Text style={{ color: sx.second, fontSize: f.h1, fontWeight: '900', marginTop: 8 }}>+{finalReward}</Text>
              )}
              <Text style={{ color: sx.primary, fontSize: f.h2, fontWeight: '800', textAlign: 'center', marginTop: 12 }}>
                {survey.finalTitle?.trim() || triLang(lang, {
                  ru: 'Спасибо!', uk: 'Дякуємо!', es: '¡Gracias!', 'pt-BR': 'Obrigado!',
                  vi: 'Cảm ơn!', id: 'Terima kasih!', tr: 'Teşekkürler!', pl: 'Dziękujemy!',
                })}
              </Text>
              {!!survey.finalSubtitle?.trim() && (
                <Text style={{ color: sx.muted, fontSize: f.body, textAlign: 'center', marginTop: 8, lineHeight: 22 }}>
                  {survey.finalSubtitle}
                </Text>
              )}
              <TapScale onPress={() => { hapticTap(); clearPrimedSurvey(); safeRouterBack(router); }} style={[styles.primaryBtn, { backgroundColor: sx.primary, marginTop: 28, alignSelf: 'stretch' }]}>
                <Text style={{ color: t.bgPrimary, fontWeight: '800', fontSize: f.body }}>
                  {triLang(lang, { ru: 'Готово', uk: 'Готово', es: 'Listo', 'pt-BR': 'Pronto', vi: 'Xong', id: 'Selesai', tr: 'Bitti', pl: 'Gotowe' })}
                </Text>
              </TapScale>
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
              <Text numberOfLines={1} style={{ color: sx.primary, fontSize: f.h2, fontWeight: '700' }}>{survey.title}</Text>
            </View>
            <Text style={{ color: sx.second, fontSize: f.numMd, fontWeight: '700' }}>{stepIndex + 1}/{total}</Text>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: sx.ghost }]}>
            <View style={{ height: '100%', borderRadius: 3, backgroundColor: survey.accentColor || sx.second, width: `${((stepIndex + 1) / total) * 100}%` }} />
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
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
