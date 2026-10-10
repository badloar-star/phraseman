import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  completeDialogueV2Session,
  type DialogueV2CompletionResult,
} from './dialogue_v2_completion_client';
import { shouldPromptFeedback } from './feedback_prompt_throttle';
import { readDialogueV2SessionOutcome } from './dialogue_v2_session_outcome_store';
import FeedbackRatingCard from '../components/FeedbackRatingCard';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import {
  DialogueGlassBackButton,
  DialogueGlassCta,
  dialogueGlassCardStyle,
  useDialogueGlass,
} from '../components/dialogs/glass/DialogueGlassKit';
import { DialogueGlassMoodFace, dialogueMoodLabel } from '../components/dialogs/glass/DialogueGlassSessionParts';
import { LV2_BAD, LV2_GOOD } from '../components/learning-v2/LearningV2Glass';
import type { DialogueV2CoachingMood } from './dialogue_v2_turn_coaching_client';
import { dialogueV2UiCopy } from './dialogue_v2_ui_copy';
import { triLang, type Lang } from '../constants/i18n';
import { safeRouterBack } from './navigation_back';

// зачем (владелец 2026-09-30, макет dialogs.html D1–D5 = practice.html «Завершение»): итог
// диалога — тот же экран, что во всех режимах: «✕», заголовок «Диалог пройден» / «Разговор
// завершён», сцена, настроение собеседника, цели · верно · ошибок · точность, «Ошибки»
// (было → стало), «Диалог был полезен?» и «Готово» / «Ещё раз». Прежних наград 2.0 не показывает.
// Монет за диалог нет: решения о награде нет — не выдумываем.

const SESSION_RE = /^d2s_[A-Za-z0-9_-]{32,96}$/;
const SCENARIO_RE = /^(?=.{1,64}$)[a-z0-9]+(?:_[a-z0-9]+)*$/;
const TARGETS = new Set(['en', 'es', 'fr', 'de']);
const INTERFACE_LANGUAGES = new Set(['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl', 'fr', 'de']);
const MOODS = new Set(['happy', 'smile', 'neutral', 'sad', 'angry']);

type EndedBy = 'bot' | 'manual' | 'limit';

type State =
  | Readonly<{ kind: 'loading' }>
  | Readonly<{ kind: 'unavailable' }>
  | Readonly<{ kind: 'ready'; result: DialogueV2CompletionResult }>;

type Params = {
  sessionId?: string | string[];
  scenarioId?: string | string[];
  endedBy?: string | string[];
  learnerTurns?: string | string[];
  mood?: string | string[];
  title?: string | string[];
};

function single(value: string | string[] | undefined): string | null {
  return typeof value === 'string' ? value : null;
}

function completionLabels(lang: Lang) {
  return Object.freeze({
    passed: triLang(lang, { ru: 'Диалог пройден', uk: 'Діалог пройдено', en: 'Dialogue complete', es: 'Diálogo superado', 'pt-BR': 'Diálogo concluído', vi: 'Hoàn thành hội thoại', id: 'Dialog selesai', tr: 'Diyalog tamamlandı', pl: 'Dialog ukończony', fr: 'Dialogue réussi', de: 'Dialog geschafft' }),
    finished: triLang(lang, { ru: 'Разговор завершён', uk: 'Розмову завершено', en: 'Conversation ended', es: 'Conversación terminada', 'pt-BR': 'Conversa encerrada', vi: 'Đã kết thúc trò chuyện', id: 'Percakapan berakhir', tr: 'Sohbet bitti', pl: 'Rozmowa zakończona', fr: 'Conversation terminée', de: 'Gespräch beendet' }),
    turns: (count: number) => triLang(lang, { ru: `Твоих реплик: ${count}.`, uk: `Твоїх реплік: ${count}.`, en: `Your messages: ${count}.`, es: `Tus mensajes: ${count}.`, 'pt-BR': `Suas mensagens: ${count}.`, vi: `Số câu của bạn: ${count}.`, id: `Pesanmu: ${count}.`, tr: `Mesajların: ${count}.`, pl: `Twoje wiadomości: ${count}.`, fr: `Tes messages : ${count}.`, de: `Deine Nachrichten: ${count}.` }),
    goals: triLang(lang, { ru: 'целей', uk: 'цілей', en: 'goals', es: 'objetivos', 'pt-BR': 'objetivos', vi: 'mục tiêu', id: 'tujuan', tr: 'hedef', pl: 'celów', fr: 'objectifs', de: 'Ziele' }),
    correct: triLang(lang, { ru: 'верно', uk: 'правильно', en: 'correct', es: 'correctas', 'pt-BR': 'certas', vi: 'đúng', id: 'benar', tr: 'doğru', pl: 'dobrze', fr: 'justes', de: 'richtig' }),
    mistakes: triLang(lang, { ru: 'ошибок', uk: 'помилок', en: 'mistakes', es: 'errores', 'pt-BR': 'erros', vi: 'lỗi', id: 'kesalahan', tr: 'hata', pl: 'błędów', fr: 'erreurs', de: 'Fehler' }),
    accuracy: triLang(lang, { ru: 'точность', uk: 'точність', en: 'accuracy', es: 'precisión', 'pt-BR': 'precisão', vi: 'chính xác', id: 'akurasi', tr: 'doğruluk', pl: 'trafność', fr: 'précision', de: 'Genauigkeit' }),
    errorsTitle: triLang(lang, { ru: 'Ошибки', uk: 'Помилки', en: 'Mistakes', es: 'Errores', 'pt-BR': 'Erros', vi: 'Lỗi', id: 'Kesalahan', tr: 'Hatalar', pl: 'Błędy', fr: 'Erreurs', de: 'Fehler' }),
    loading: triLang(lang, { ru: 'Собеседник готовит итог…', uk: 'Співрозмовник готує підсумок…', en: 'Your partner is preparing the summary…', es: 'Tu interlocutor prepara el resumen…', 'pt-BR': 'Seu interlocutor prepara o resumo…', vi: 'Đang chuẩn bị tổng kết…', id: 'Ringkasan sedang disiapkan…', tr: 'Özet hazırlanıyor…', pl: 'Rozmówca przygotowuje podsumowanie…', fr: 'Ton interlocuteur prépare le bilan…', de: 'Die Auswertung wird vorbereitet…' }),
    unavailable: triLang(lang, { ru: 'Итог пока недоступен', uk: 'Підсумок поки недоступний', en: 'The summary is unavailable', es: 'El resumen no está disponible', 'pt-BR': 'O resumo está indisponível', vi: 'Chưa có tổng kết', id: 'Ringkasan belum tersedia', tr: 'Özet şu an yok', pl: 'Podsumowanie jest niedostępne', fr: 'Le bilan est indisponible', de: 'Die Auswertung ist nicht verfügbar' }),
    retry: triLang(lang, { ru: 'Повторить', uk: 'Повторити', en: 'Retry', es: 'Reintentar', 'pt-BR': 'Tentar de novo', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Ponów', fr: 'Réessayer', de: 'Erneut versuchen' }),
    done: triLang(lang, { ru: 'Готово', uk: 'Готово', en: 'Done', es: 'Listo', 'pt-BR': 'Pronto', vi: 'Xong', id: 'Selesai', tr: 'Tamam', pl: 'Gotowe', fr: 'Terminé', de: 'Fertig' }),
    again: triLang(lang, { ru: 'Ещё раз', uk: 'Ще раз', en: 'Once more', es: 'Otra vez', 'pt-BR': 'De novo', vi: 'Làm lại', id: 'Sekali lagi', tr: 'Bir daha', pl: 'Jeszcze raz', fr: 'Encore', de: 'Noch einmal' }),
    close: triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij', fr: 'Fermer', de: 'Schließen' }),
    rateTitle: triLang(lang, { ru: 'Диалог был полезен?', uk: 'Діалог був корисним?', en: 'Was this dialogue useful?', es: '¿Te sirvió el diálogo?', 'pt-BR': 'O diálogo foi útil?', vi: 'Hội thoại có hữu ích không?', id: 'Apakah dialog ini berguna?', tr: 'Diyalog faydalı oldu mu?', pl: 'Czy dialog był przydatny?', fr: 'Ce dialogue t’a été utile ?', de: 'War der Dialog hilfreich?' }),
    ratePlaceholder: triLang(lang, { ru: 'Где собеседник звучал странно?', uk: 'Де співрозмовник звучав дивно?', en: 'Where did your partner sound odd?', es: '¿Dónde sonó raro tu interlocutor?', 'pt-BR': 'Onde o interlocutor soou estranho?', vi: 'Chỗ nào người trò chuyện nói lạ?', id: 'Di mana lawan bicara terdengar aneh?', tr: 'Karşındaki nerede tuhaf konuştu?', pl: 'Gdzie rozmówca brzmiał dziwnie?', fr: 'Où ton interlocuteur sonnait-il bizarre ?', de: 'Wo klang dein Gegenüber seltsam?' }),
    rateSend: triLang(lang, { ru: 'Отправить', uk: 'Надіслати', en: 'Send', es: 'Enviar', 'pt-BR': 'Enviar', vi: 'Gửi', id: 'Kirim', tr: 'Gönder', pl: 'Wyślij', fr: 'Envoyer', de: 'Senden' }),
    rateThanks: triLang(lang, { ru: 'Спасибо! Отзыв отправлен', uk: 'Дякуємо! Відгук надіслано', en: 'Thanks! Feedback sent', es: '¡Gracias! Comentario enviado', 'pt-BR': 'Obrigado! Comentário enviado', vi: 'Cảm ơn! Đã gửi phản hồi', id: 'Terima kasih! Masukan terkirim', tr: 'Teşekkürler! Geri bildirim gönderildi', pl: 'Dziękujemy! Opinia wysłana', fr: 'Merci ! Avis envoyé', de: 'Danke! Feedback gesendet' }),
    rating: triLang(lang, { ru: 'Оценка', uk: 'Оцінка', en: 'Rating', es: 'Valoración', 'pt-BR': 'Avaliação', vi: 'Đánh giá', id: 'Penilaian', tr: 'Puan', pl: 'Ocena', fr: 'Note', de: 'Bewertung' }),
  });
}

export default function DialogueV2CompletionRoute() {
  const params = useLocalSearchParams<Params>();
  const router = useRouter();
  const { studyTarget } = useStudyTarget();
  const { lang } = useLang();
  const glass = useDialogueGlass();
  const labels = useMemo(() => completionLabels(lang), [lang]);
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [feedbackAllowed, setFeedbackAllowed] = useState(false);
  const sessionId = SESSION_RE.test(single(params.sessionId) ?? '') ? single(params.sessionId) : null;
  const scenarioId = SCENARIO_RE.test(single(params.scenarioId) ?? '') ? single(params.scenarioId) : null;
  const endedByParam = single(params.endedBy);
  const endedBy: EndedBy = endedByParam === 'bot' || endedByParam === 'limit' ? endedByParam : 'manual';
  const learnerTurns = Math.max(0, Math.min(200, Number.parseInt(single(params.learnerTurns) ?? '', 10) || 0));
  const moodParam = single(params.mood);
  const mood = moodParam && MOODS.has(moodParam) ? moodParam as DialogueV2CoachingMood : null;
  const sceneTitle = (single(params.title) ?? '').slice(0, 120);
  const interfaceLang = INTERFACE_LANGUAGES.has(lang) ? lang : 'en';
  const selectionRef = useRef<Readonly<{
    sessionId: string;
    studyTarget: 'en' | 'es' | 'fr' | 'de';
    scenarioId: string;
    interfaceLang: string;
  }> | null>(null);
  if (!selectionRef.current && sessionId && scenarioId && TARGETS.has(studyTarget)) {
    selectionRef.current = Object.freeze({
      sessionId,
      studyTarget: studyTarget as 'en' | 'es' | 'fr' | 'de',
      scenarioId,
      interfaceLang,
    });
  }
  const requestGenerationRef = useRef(0);

  const runCompletion = useCallback(() => {
    const selection = selectionRef.current;
    if (!selection) {
      console.warn('[DIALOGUE-V2] completion:run → invalid route data', { hasSession: !!sessionId, scenarioId, studyTarget });
      setState({ kind: 'unavailable' });
      return;
    }
    const generation = requestGenerationRef.current + 1;
    requestGenerationRef.current = generation;
    setState({ kind: 'loading' });
    const startedAt = Date.now();
    void completeDialogueV2Session(selection).then((result) => {
      if (requestGenerationRef.current !== generation) return;
      if (!result) console.warn('[DIALOGUE-V2] completion:run → empty result', { scenarioId: selection.scenarioId });
      setState(result ? { kind: 'ready', result } : { kind: 'unavailable' });
    }).catch((error: unknown) => {
      console.warn('[DIALOGUE-V2] completion:run → failed', {
        reason: error instanceof Error ? error.message : String(error),
        ms: Date.now() - startedAt,
      });
      if (requestGenerationRef.current === generation) setState({ kind: 'unavailable' });
    });
  }, [scenarioId, sessionId, studyTarget]);

  useEffect(() => {
    runCompletion();
    return () => { requestGenerationRef.current += 1; };
  }, [runCompletion]);

  useEffect(() => {
    let alive = true;
    void shouldPromptFeedback('dialogue').then((allowed) => {
      if (alive) setFeedbackAllowed(allowed);
    }).catch((error: unknown) => {
      console.warn('[DIALOGUE-V2] completion:feedback-throttle → failed', error instanceof Error ? error.message : String(error));
    });
    return () => { alive = false; };
  }, []);

  const review = state.kind === 'ready' ? state.result.review : null;
  // зачем (эмулятор 02.10): сервер присылает подписи целей на английском, а брифинг показывал их
  // на языке интерфейса — на итоге цели вдруг становились «Start with a greeting». Берём тот же
  // перевод, что у брифинга; нет перевода — подпись сервера.
  const goalLabels = useMemo(() => dialogueV2UiCopy(lang, scenarioId)?.objectiveLabels ?? null, [lang, scenarioId]);
  const goalLabel = (objectiveId: string, fallback: string) => goalLabels?.[objectiveId] ?? fallback;
  const goalsTotal = review?.objectiveResults.length ?? 0;
  const goalsMet = review?.objectiveResults.filter((objective) => objective.status === 'met').length ?? 0;
  // Разбор каждого хода (D112) — основной источник; без него — заметки итогового ревью.
  const outcome = sessionId ? readDialogueV2SessionOutcome(sessionId) : null;
  const errorRows = outcome
    ? outcome.corrections
    : review?.corrections.map((item) => ({ original: item.original, corrected: item.corrected })) ?? [];
  const mistakes = errorRows.length;
  const turns = Math.max(outcome?.learnerTurns ?? learnerTurns, mistakes);
  const correct = Math.max(0, turns - mistakes);
  const accuracy = turns > 0 ? Math.round((correct / turns) * 100) : 0;
  const title = endedBy === 'bot' ? labels.passed : labels.finished;
  const close = () => safeRouterBack(router, '/ai_dialog_home' as never);
  const again = () => {
    if (!scenarioId) return;
    router.replace({ pathname: '/dialogue_v2_briefing', params: { scenarioId } } as never);
  };

  return (
    <View style={[styles.fill, { backgroundColor: glass.bg }]} testID="dialogue-v2-completion-screen">
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <View style={styles.header} testID="dialogue-v2-completion-header">
          <DialogueGlassBackButton glass={glass} icon="close" onPress={close} accessibilityLabel={labels.close} />
        </View>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} decelerationRate="fast">
          <View style={styles.titleBlock}>
            <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={[styles.title, { color: glass.text }]}>{title}</Text>
            {sceneTitle ? <Text maxFontSizeMultiplier={1.3} style={[styles.sub, { color: glass.secondary }]}>{sceneTitle}</Text> : null}
            {endedBy !== 'bot' ? (
              <Text maxFontSizeMultiplier={1.3} style={[styles.sub, styles.neutral, { color: glass.secondary }]}>{labels.turns(learnerTurns)}</Text>
            ) : null}
            {review ? (
              <Text testID="dialogue-v2-completion-assessment" maxFontSizeMultiplier={1.3} style={[styles.sub, styles.neutral, { color: glass.secondary }]}>
                {review.assessment}
              </Text>
            ) : null}
            {mood ? (
              <View testID="dialogue-v2-completion-mood" style={[styles.mood, { backgroundColor: glass.opaqueControl }]}>
                <DialogueGlassMoodFace mood={mood} color={glass.text} />
                <Text maxFontSizeMultiplier={1.3} style={[styles.moodText, { color: glass.text }]}>{dialogueMoodLabel(lang, mood)}</Text>
              </View>
            ) : null}
          </View>

          {state.kind === 'loading' ? (
            <View testID="dialogue-v2-completion-loading" style={[dialogueGlassCardStyle(glass, 16), styles.stateCard]}>
              <ActivityIndicator color={glass.text} />
              <Text maxFontSizeMultiplier={1.3} style={[styles.stateText, { color: glass.secondary }]}>{labels.loading}</Text>
            </View>
          ) : null}
          {state.kind === 'unavailable' ? (
            <View style={[dialogueGlassCardStyle(glass, 16), styles.stateCard]}>
              <Text maxFontSizeMultiplier={1.3} style={[styles.stateText, { color: glass.secondary }]}>{labels.unavailable}</Text>
              <DialogueGlassCta glass={glass} size="small" icon="refresh" label={labels.retry} onPress={runCompletion} testID="dialogue-v2-completion-retry" />
            </View>
          ) : null}

          {review ? (
            <>
              <View testID="dialogue-v2-completion-stats" style={[dialogueGlassCardStyle(glass, 16), styles.stats]}>
                <Stat glass={glass} value={`${goalsMet}`} suffix={`/${goalsTotal}`} label={labels.goals} />
                <Stat glass={glass} value={`${correct}`} label={labels.correct} color={LV2_GOOD} divider />
                <Stat glass={glass} value={`${mistakes}`} label={labels.mistakes} color={LV2_BAD} divider />
                <Stat glass={glass} value={`${accuracy}%`} label={labels.accuracy} divider />
              </View>

              <View testID="dialogue-v2-completion-goals" style={[dialogueGlassCardStyle(glass, 16), styles.goals]}>
                {review.objectiveResults.map((objective, index) => {
                  const met = objective.status === 'met';
                  return (
                    <View
                      key={objective.objectiveId}
                      style={[styles.goalRow, index > 0 ? { borderTopWidth: 1, borderTopColor: glass.line } : null]}
                      accessible
                      accessibilityLabel={goalLabel(objective.objectiveId, objective.label)}
                      accessibilityState={{ checked: met }}
                    >
                      <View style={[styles.goalBadge, { backgroundColor: met ? glass.cta : glass.opaqueControl }]}>
                        {met ? <Ionicons name="checkmark" size={15} color={glass.ctaInk} /> : (
                          <Text maxFontSizeMultiplier={1.2} style={[styles.goalIndex, { color: glass.secondary }]}>{index + 1}</Text>
                        )}
                      </View>
                      <Text maxFontSizeMultiplier={1.3} style={[styles.goalText, { color: met ? glass.secondary : glass.text }]}>{goalLabel(objective.objectiveId, objective.label)}</Text>
                    </View>
                  );
                })}
              </View>

              {errorRows.length > 0 ? (
                <View testID="dialogue-v2-completion-errors" style={[dialogueGlassCardStyle(glass, 16), styles.errors]}>
                  <View style={styles.errorsHead}>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.errorsTitle, { color: glass.text }]}>{labels.errorsTitle}</Text>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.errorsCount, { color: glass.mutedText }]}>{errorRows.length}</Text>
                  </View>
                  {errorRows.map((correction, index) => (
                    <View
                      key={`${correction.original}-${index}`}
                      style={[styles.errorRow, index > 0 ? { borderTopWidth: 1, borderTopColor: glass.line } : null]}
                    >
                      <Text maxFontSizeMultiplier={1.4} style={[styles.was, { color: LV2_BAD, textDecorationColor: LV2_BAD }]}>{correction.original}</Text>
                      <Ionicons name="arrow-forward" size={16} color={glass.mutedText} />
                      <Text maxFontSizeMultiplier={1.4} style={[styles.ok, { color: LV2_GOOD }]}>{correction.corrected}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {feedbackAllowed && sessionId && scenarioId ? (
                <FeedbackRatingCard
                  kind="dialogue"
                  entityId={`${scenarioId}:${sessionId}`}
                  entityLabel={sceneTitle || scenarioId}
                  lang={lang}
                  title={labels.rateTitle}
                  placeholder={labels.ratePlaceholder}
                  sendLabel={labels.rateSend}
                  thanksLabel={labels.rateThanks}
                  ratingA11yLabel={labels.rating}
                  testID="dialogue-v2-completion-feedback"
                  presentation="liquid-glass-rate"
                />
              ) : null}
            </>
          ) : null}
        </ScrollView>
        <View style={styles.footer}>
          <DialogueGlassCta glass={glass} label={labels.done} trailingArrow onPress={close} testID="dialogue-v2-completion-done" />
          {scenarioId ? (
            // зачем (сверка dialogs-041, макет `.quiet`): «Ещё раз» — тихая текстовая ссылка по центру (16/600, вторичным), а не кнопка-пилюля
            <Pressable
              testID="dialogue-v2-completion-again"
              accessibilityRole="button"
              accessibilityLabel={labels.again}
              hitSlop={8}
              onPress={again}
              style={({ pressed }) => [styles.again, pressed && { opacity: 0.6 }]}
            >
              <Text style={[styles.againText, { color: glass.secondary }]}>{labels.again}</Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

function Stat({ glass, value, suffix, label, color, divider }: Readonly<{
  glass: ReturnType<typeof useDialogueGlass>; value: string; suffix?: string; label: string; color?: string; divider?: boolean;
}>) {
  return (
    <View style={[styles.stat, divider ? { borderLeftWidth: 1, borderLeftColor: glass.line } : null]} accessible accessibilityLabel={`${value}${suffix ?? ''} ${label}`}>
      <Text maxFontSizeMultiplier={1.2} style={[styles.statValue, { color: color ?? glass.text }]}>
        {value}
        {suffix ? <Text style={[styles.statSuffix, { color: glass.secondary }]}>{suffix}</Text> : null}
      </Text>
      <Text maxFontSizeMultiplier={1.2} style={[styles.statLabel, { color: glass.secondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 2, flexDirection: 'row', alignItems: 'center' },
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  titleBlock: { alignItems: 'center', marginTop: 18 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.4, textAlign: 'center' },
  sub: { fontSize: 16, lineHeight: 21, marginTop: 6, textAlign: 'center' },
  neutral: { marginTop: 10, lineHeight: 22 },
  mood: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 32, paddingHorizontal: 14, borderRadius: 16, marginTop: 12 },
  moodText: { fontSize: 16, fontWeight: '700' },
  stateCard: { marginTop: 20, paddingHorizontal: 16, paddingVertical: 18, alignItems: 'center', gap: 12 },
  stateText: { fontSize: 16, lineHeight: 22, textAlign: 'center' },
  stats: { flexDirection: 'row', marginTop: 20, paddingVertical: 15 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 30, lineHeight: 34, fontWeight: '700', letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  statSuffix: { fontSize: 16, fontWeight: '600', letterSpacing: 0 },
  statLabel: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  goals: { marginTop: 14, paddingHorizontal: 16, paddingVertical: 6 },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  goalBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  goalIndex: { fontSize: 13, fontWeight: '700' },
  goalText: { flex: 1, fontSize: 16, lineHeight: 21 },
  errors: { marginTop: 14, paddingHorizontal: 16, paddingVertical: 14 },
  errorsHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  errorsTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  errorsCount: { fontSize: 16, fontWeight: '700' },
  errorRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, paddingVertical: 12 },
  was: { fontSize: 16, textDecorationLine: 'line-through' },
  ok: { fontSize: 16, fontWeight: '700' },
  footer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  again: { marginTop: 14, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  againText: { fontSize: 16, lineHeight: 22, fontWeight: '600', textAlign: 'center' },
});
