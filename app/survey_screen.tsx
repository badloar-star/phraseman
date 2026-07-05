// ════════════════════════════════════════════════════════════════════════════
// survey_screen.tsx — экран прохождения опроса за осколки.
// Данные приходят через survey_handoff (primeSurvey перед навигацией).
// Дизайн: без обводок контейнеров (правило проекта), тон/градиент; клик-звук
// только на управляющих кнопках, варианты ответа — только вибрация.
// ════════════════════════════════════════════════════════════════════════════
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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

type AnswersState = Record<string, { optionId?: string; comment?: string }>;

export default function SurveyScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const { theme: t, f, themeMode } = useTheme();
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const params = useLocalSearchParams<{ surveyId?: string }>();
  const surveyId = String(params.surveyId ?? '');
  const survey = useMemo(() => takePrimedSurvey(surveyId), [surveyId]);

  const [answers, setAnswers] = useState<AnswersState>({});
  const [submitting, setSubmitting] = useState(false);

  const allAnswered = useMemo(() => {
    if (!survey) return false;
    return survey.questions.every((q) => {
      const a = answers[q.id];
      if (q.type === 'text') return !!a?.comment && a.comment.trim().length > 0;
      return !!a?.optionId;
    });
  }, [survey, answers]);

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
      const stableId = await getCanonicalUserId();
      if (!stableId) throw new Error('no_profile');
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
      if (res.reward > 0) {
        emitAppEvent('shards_earned', { amount: res.reward, reasonKey: 'survey_completed' });
      }
      emitAppEvent('action_toast', actionToastTri('success', {
        ru: res.reward > 0 ? `+${res.reward} 💎 за опрос. Спасибо!` : 'Опрос уже пройден.',
        uk: res.reward > 0 ? `+${res.reward} 💎 за опитування. Дякуємо!` : 'Опитування вже пройдено.',
        es: res.reward > 0 ? `+${res.reward} 💎 por la encuesta. ¡Gracias!` : 'Encuesta ya completada.',
        'pt-BR': res.reward > 0 ? `+${res.reward} 💎 pela pesquisa. Obrigado!` : 'Pesquisa já respondida.',
        vi: res.reward > 0 ? `+${res.reward} 💎 cho khảo sát. Cảm ơn!` : 'Đã hoàn thành khảo sát.',
        id: res.reward > 0 ? `+${res.reward} 💎 untuk survei. Terima kasih!` : 'Survei sudah diisi.',
        tr: res.reward > 0 ? `+${res.reward} 💎 anket için. Teşekkürler!` : 'Anket zaten tamamlandı.',
        pl: res.reward > 0 ? `+${res.reward} 💎 za ankietę. Dzięki!` : 'Ankieta już wypełniona.',
      }));
      clearPrimedSurvey();
      safeRouterBack(router);
    } catch (e: unknown) {
      const raw = String((e as { message?: string })?.message ?? e ?? '').toLowerCase();
      const msg = raw.includes('unknown_survey')
        ? { ru: 'Опрос уже недоступен.', uk: 'Опитування вже недоступне.', es: 'La encuesta ya no está disponible.', 'pt-BR': 'A pesquisa não está mais disponível.', vi: 'Khảo sát không còn khả dụng.', id: 'Survei sudah tidak tersedia.', tr: 'Anket artık kullanılamıyor.', pl: 'Ankieta jest już niedostępna.' }
        : raw.includes('unauthenticated') || raw.includes('no_profile')
        ? { ru: 'Нужен вход в облако. Попробуй снова.', uk: 'Потрібен вхід у хмару. Спробуй ще раз.', es: 'Hace falta sesión en la nube. Inténtalo de nuevo.', 'pt-BR': 'É preciso entrar na nuvem. Tente de novo.', vi: 'Cần đăng nhập đám mây. Thử lại.', id: 'Perlu masuk ke cloud. Coba lagi.', tr: 'Bulut oturumu gerekiyor. Tekrar dene.', pl: 'Wymagane logowanie do chmury. Spróbuj ponownie.' }
        : { ru: 'Не удалось отправить. Попробуй снова.', uk: 'Не вдалося надіслати. Спробуй ще раз.', es: 'No se pudo enviar. Inténtalo de nuevo.', 'pt-BR': 'Falha ao enviar. Tente de novo.', vi: 'Gửi không thành công. Thử lại.', id: 'Gagal mengirim. Coba lagi.', tr: 'Gönderilemedi. Tekrar dene.', pl: 'Nie udało się wysłać. Spróbuj ponownie.' };
      emitAppEvent('action_toast', actionToastTri('error', msg));
    } finally {
      setSubmitting(false);
    }
  }, [survey, submitting, allAnswered, answers, router]);

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

  const answeredCount = survey.questions.filter((q) => {
    const a = answers[q.id];
    return q.type === 'text' ? !!a?.comment?.trim() : !!a?.optionId;
  }).length;

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          <View style={styles.header}>
            <TapScale onPress={() => { hapticTap(); safeRouterBack(router); }} style={{ marginRight: 12, padding: 4 }}>
              <Ionicons name="chevron-back" size={28} color={sx.primary} />
            </TapScale>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={2} style={{ color: sx.primary, fontSize: f.h2, fontWeight: '700' }}>{survey.title}</Text>
              {!!survey.subtitle && (
                <Text numberOfLines={2} style={{ color: sx.muted, fontSize: f.label, marginTop: 2 }}>{survey.subtitle}</Text>
              )}
            </View>
            <Text style={{ color: sx.second, fontSize: f.numMd, fontWeight: '700' }}>{answeredCount}/{survey.questions.length}</Text>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
            <View style={[styles.rewardPill, { backgroundColor: t.bgCard }]}>
              <Text style={{ color: sx.second, fontSize: f.body, fontWeight: '700' }}>
                💎 {triLang(lang, {
                  ru: `Награда за опрос: ${survey.rewardShards}`,
                  uk: `Нагорода за опитування: ${survey.rewardShards}`,
                  es: `Recompensa: ${survey.rewardShards}`,
                  'pt-BR': `Recompensa: ${survey.rewardShards}`,
                  vi: `Phần thưởng: ${survey.rewardShards}`,
                  id: `Hadiah: ${survey.rewardShards}`,
                  tr: `Ödül: ${survey.rewardShards}`,
                  pl: `Nagroda: ${survey.rewardShards}`,
                })}
              </Text>
            </View>

            {survey.questions.map((q, idx) => (
              <QuestionBlock
                key={q.id}
                index={idx + 1}
                question={q}
                selectedOption={answers[q.id]?.optionId}
                comment={answers[q.id]?.comment ?? ''}
                onPick={(optId) => pickOption(q.id, optId)}
                onComment={(txt) => setComment(q.id, txt)}
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
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <TapScale
              disabled={!allAnswered || submitting}
              onPress={onSubmit}
              style={[styles.primaryBtn, { backgroundColor: allAnswered && !submitting ? sx.primary : sx.ghost, opacity: allAnswered && !submitting ? 1 : 0.6 }]}
            >
              {submitting ? (
                <ActivityIndicator color={t.bgPrimary} />
              ) : (
                <Text style={{ color: t.bgPrimary, fontWeight: '800', fontSize: f.body }}>
                  {triLang(lang, {
                    ru: 'Отправить', uk: 'Надіслати', es: 'Enviar', 'pt-BR': 'Enviar',
                    vi: 'Gửi', id: 'Kirim', tr: 'Gönder', pl: 'Wyślij',
                  })}
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
  rewardPill: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16 },
  questionCard: { borderRadius: 20, padding: 16 },
  optionRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  textInput: { borderRadius: 14, padding: 12, minHeight: 90, textAlignVertical: 'top', fontSize: 15 },
  footer: { paddingHorizontal: 16, paddingVertical: 12, position: 'absolute', bottom: 0, left: 0, right: 0 },
  primaryBtn: { borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
});
