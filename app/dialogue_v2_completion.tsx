import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  completeDialogueV2Session,
  type DialogueV2CompletionResult,
} from './dialogue_v2_completion_client';
import { shouldPromptFeedback } from './feedback_prompt_throttle';
import { getDevDialogCompletion } from './dev_dialog_state';
import { readDialogueV2SessionOutcome } from './dialogue_v2_session_outcome_store';
import FeedbackRatingCard from '../components/FeedbackRatingCard';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useDialogueV2CoinReward } from '../hooks/useDialogueV2CoinReward';
import {
  DialogueGlassBackButton,
  DialogueGlassCta,
  dialogueGlassCardStyle,
  useDialogueGlass,
} from '../components/dialogs/glass/DialogueGlassKit';
import { DialogueGlassMoodFace, dialogueMoodLabel } from '../components/dialogs/glass/DialogueGlassSessionParts';
import { LV2_BAD, LV2_GOOD, useLv2Glass } from '../components/learning-v2/LearningV2Glass';
import { BalancePill, CoinAward } from '../components/completion/V2DoneScreen';
import { useReducedMotion } from 'react-native-reanimated';
import { animateNextLayoutTransition } from './smooth_layout';
import type { DialogueV2CoachingMood } from './dialogue_v2_turn_coaching_client';
import { dialogueV2UiCopy } from './dialogue_v2_ui_copy';
import { triLang, type Lang } from '../constants/i18n';
import { safeRouterBack } from './navigation_back';
import { RowDivider } from '../components/v2/RowDivider';
import SkeletonBlock from '../components/SkeletonShimmer';
import { glassTone } from '../components/dialogs/glass/glassTone';

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
  // зачем (E9, координатор 12.10, «сперва логи»): время до первого содержательного кадра итога — локальные цифры уже в первом кадре, цели приходят позже
  const firstFrameAtRef = useRef(Date.now());
  const loggedStateRef = useRef<string | null>(null);

  const runCompletion = useCallback(() => {
    const selection = selectionRef.current;
    // зачем (координатор 12.10, dialogs-041 «итог не грузится», «сперва логи»): вход экрана итога, источник, ответ,
    // длительность и каждый выход. Итог — всегда сеть (кэша у итога нет); цифры «верно/ошибок» — локальный разбор ходов.
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      const localOutcome = sessionId ? readDialogueV2SessionOutcome(sessionId) : null;
      console.log('[DIALOG-SUMMARY] enter', JSON.stringify({
        session: sessionId ? sessionId.slice(0, 12) : null,
        scenarioId,
        studyTarget,
        endedBy,
        learnerTurnsParam: learnerTurns,
        localOutcome: localOutcome ? { learnerTurns: localOutcome.learnerTurns, corrections: localOutcome.corrections.length } : 'missing',
        source: 'network',
      }));
    }
    if (!selection) {
      console.warn('[DIALOGUE-V2] completion:run → invalid route data', { hasSession: !!sessionId, scenarioId, studyTarget });
      console.warn(`[DIALOG-SUMMARY] → unavailable reason=invalid_route_data session=${sessionId ? 'yes' : 'no'} scenario=${scenarioId ? 'yes' : 'no'} target=${String(studyTarget)}`);
      setState({ kind: 'unavailable' });
      return;
    }
    const generation = requestGenerationRef.current + 1;
    requestGenerationRef.current = generation;
    setState({ kind: 'loading' });
    const startedAt = Date.now();
    void completeDialogueV2Session(selection).then((result) => {
      if (requestGenerationRef.current !== generation) {
        console.log(`[DIALOG-SUMMARY] ответ отброшен: устарел (generation ${generation}→${requestGenerationRef.current}) ms=${Date.now() - startedAt}`);
        return;
      }
      if (!result) console.warn('[DIALOGUE-V2] completion:run → empty result', { scenarioId: selection.scenarioId });
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        const objectives = result?.review.objectiveResults ?? [];
        console.log('[DIALOG-SUMMARY] result', JSON.stringify({
          ms: Date.now() - startedAt,
          shown: result ? 'ready' : 'unavailable',
          replayed: result?.replayed ?? null,
          objectivesMet: objectives.filter((objective) => objective.status === 'met').length,
          objectivesTotal: objectives.length,
          objectives: objectives.map((objective) => `${objective.objectiveId}:${objective.status}`),
          corrections: result?.review.corrections.length ?? null,
        }));
      }
      setState(result ? { kind: 'ready', result } : { kind: 'unavailable' });
    }).catch((error: unknown) => {
      console.warn('[DIALOGUE-V2] completion:run → failed', {
        reason: error instanceof Error ? error.message : String(error),
        ms: Date.now() - startedAt,
      });
      const current = requestGenerationRef.current === generation;
      console.warn(`[DIALOG-SUMMARY] → ${current ? 'unavailable' : 'ошибка устаревшего запроса, экран не тронут'} reason=${error instanceof Error ? error.message : String(error)} ms=${Date.now() - startedAt}`);
      if (current) setState({ kind: 'unavailable' });
    });
  }, [scenarioId, sessionId, studyTarget]);

  useEffect(() => {
    runCompletion();
    return () => { requestGenerationRef.current += 1; };
  }, [runCompletion]);

  useEffect(() => {
    let alive = true;
    // зачем (Макеты 12.10, dialogs-042): при подставном итоге блок отзыва виден всегда — троттлинг отзывов не мешает кадру.
    if (getDevDialogCompletion()) {
      console.warn('[DEV-STATE] dialogs: блок отзыва открыт без троттлинга (dev_dialog_completion)'); // guard-ok: dev-ветка
      setFeedbackAllowed(true);
      return () => { alive = false; };
    }
    void shouldPromptFeedback('dialogue').then((allowed) => {
      if (alive) setFeedbackAllowed(allowed);
    }).catch((error: unknown) => {
      console.warn('[DIALOGUE-V2] completion:feedback-throttle → failed', error instanceof Error ? error.message : String(error));
    });
    return () => { alive = false; };
  }, []);

  const review = state.kind === 'ready' ? state.result.review : null;
  useEffect(() => {
    if (typeof __DEV__ === 'undefined' || !__DEV__) return;
    if (loggedStateRef.current === state.kind) return;
    const first = loggedStateRef.current === null;
    loggedStateRef.current = state.kind;
    console.log(`[DIALOGS-FIRST-FRAME] completion ${first ? 'first' : 'update'} kind=${state.kind} localStats=${String(outcome !== null || learnerTurns > 0)} errorsLocal=${outcome ? outcome.corrections.length : 0} goals=${String(state.kind === 'ready')} ms=${Date.now() - firstFrameAtRef.current}`); // guard-ok: под __DEV__, число решает ветку
  }, [state.kind]); // eslint-disable-line react-hooks/exhaustive-deps
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
  // зачем (владелец 13.10 «Да, как в макете», dialogs.html D1–D4): монеты за диалог — +30 без ошибок, +25 с ошибками, +10 при
  // ручном завершении; один раз на сессию, тем же путём, что за уроки. Начисляем, когда итог решён (готов или недоступен) и
  // была хотя бы одна реплика. Блок «+N монет» рисует Дизайн по dialogCoinReward.coins.
  const dialogCoinReward = useDialogueV2CoinReward({
    sessionId: sessionId ?? null,
    ready: state.kind !== 'loading' && turns > 0,
    endedBy,
    mistakes,
  });
  // зачем (решение владельца 13.10, practice.html#done / dialogs.html D1–D4): пилюля баланса справа в шапке и «+N монет» с монетой под цифрами.
  // Блок появляется, когда монеты легли в копилку (status='awarded'); повторный заход на экран ('already', coins=0) его не рисует — поздравляем фактом, а не записью.
  const lv2Glass = useLv2Glass();
  const reduceMotion = useReducedMotion();
  const showCoinAward = dialogCoinReward.status === 'awarded' && dialogCoinReward.coins > 0;
  const coinAwardShownRef = useRef(false);
  useEffect(() => {
    if (!showCoinAward || coinAwardShownRef.current) return;
    coinAwardShownRef.current = true;
    animateNextLayoutTransition(); // зачем: блок вставляется в поток после первого кадра — сдвиг плавный, а не скачком
  }, [showCoinAward]);
  useEffect(() => {
    if (dialogCoinReward.status === 'waiting') return;
    console.log(`[COINS-EARN] dialog: экран итога статус=${dialogCoinReward.status} монеты=+${dialogCoinReward.coins}`); // guard-ok: итог для экрана
  }, [dialogCoinReward.coins, dialogCoinReward.status]);
  // зачем (E9): локальные цифры есть, как только известны реплики (разбор ходов или параметр маршрута) — показываем сразу, не ждём ответ сервера
  const showLocalStats = outcome !== null || learnerTurns > 0;
  // число целей сцены известно из каталога (подписи целей) — скелет повторяет высоту будущего списка; нет подписей — три строки
  const goalRowsGuess = goalLabels ? Math.min(8, Math.max(1, Object.keys(goalLabels).length)) : 3;
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
          <View style={styles.headerSpacer} />
          <BalancePill g={lv2Glass} lang={lang} />
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
            // зачем (E9, координатор 12.10): цифры и «Что исправить» уже есть на телефоне и показаны сразу; ждём только оценку и цели сервера — тихая строка вместо карточки со спиннером, ниже скелет целей
            <Text testID="dialogue-v2-completion-loading" maxFontSizeMultiplier={1.3} style={[styles.stateText, styles.loadingNote, { color: glass.secondary }]}>{labels.loading}</Text>
          ) : null}
          {state.kind === 'unavailable' ? (
            <View style={[dialogueGlassCardStyle(glass, 16), styles.stateCard]}>
              <Text maxFontSizeMultiplier={1.3} style={[styles.stateText, { color: glass.secondary }]}>{labels.unavailable}</Text>
              <DialogueGlassCta glass={glass} size="small" icon="refresh" label={labels.retry} onPress={runCompletion} testID="dialogue-v2-completion-retry" />
            </View>
          ) : null}

          {showLocalStats ? (
            <>
              <View testID="dialogue-v2-completion-stats" style={[dialogueGlassCardStyle(glass, 16), styles.stats]}>
                {review ? (
                  <Stat glass={glass} value={`${goalsMet}`} suffix={`/${goalsTotal}`} label={labels.goals} />
                ) : (
                  <GoalsStatSkeleton glass={glass} label={labels.goals} />
                )}
                <Stat glass={glass} value={`${correct}`} label={labels.correct} color={LV2_GOOD} divider />
                <Stat glass={glass} value={`${mistakes}`} label={labels.mistakes} color={LV2_BAD} divider />
                <Stat glass={glass} value={`${accuracy}%`} label={labels.accuracy} divider />
              </View>
              {showCoinAward ? (
                <View testID="dialogue-v2-completion-coins">
                  {/* guard-ok: только отображение начисленного, баланс не меняется (начисляет useDialogueV2CoinReward) */}
                  <CoinAward amount={dialogCoinReward.coins} lang={lang} g={lv2Glass} animate={!reduceMotion} />
                </View>
              ) : null}
            </>
          ) : null}
          {review ? (
            <>
              <View testID="dialogue-v2-completion-goals" style={[dialogueGlassCardStyle(glass, 16), styles.goals]}>
                {review.objectiveResults.map((objective, index) => {
                  const met = objective.status === 'met';
                  return (
                    <View
                      key={objective.objectiveId}
                      style={styles.goalRow}
                      accessible
                      accessibilityLabel={goalLabel(objective.objectiveId, objective.label)}
                      accessibilityState={{ checked: met }}
                    >
                      {/* зачем (владелец 12.10, стиль «Тень»): разделитель — линия-View, не borderTop */}
                      {index > 0 ? <RowDivider color={glass.line} /> : null}
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
            </>
          ) : state.kind === 'loading' ? (
            <GoalsSkeleton glass={glass} rows={goalRowsGuess} />
          ) : null}
          {/* зачем (E9): «Что исправить» — из локального разбора ходов, не ждёт сервер */}
            {errorRows.length > 0 ? (
              <View testID="dialogue-v2-completion-errors" style={[dialogueGlassCardStyle(glass, 16), styles.errors]}>
                <View style={styles.errorsHead}>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.errorsTitle, { color: glass.text }]}>{labels.errorsTitle}</Text>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.errorsCount, { color: glass.mutedText }]}>{errorRows.length}</Text>
                </View>
                {errorRows.map((correction, index) => (
                  <View
                    key={`${correction.original}-${index}`}
                    style={styles.errorRow}
                  >
                    {index > 0 ? <RowDivider color={glass.line} /> : null}
                    <Text maxFontSizeMultiplier={1.4} style={[styles.was, { color: LV2_BAD, textDecorationColor: LV2_BAD }]}>{correction.original}</Text>
                    <Ionicons name="arrow-forward" size={16} color={glass.mutedText} />
                    <Text maxFontSizeMultiplier={1.4} style={[styles.ok, { color: LV2_GOOD }]}>{correction.corrected}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          {review ? (
            <>
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

function GoalsStatSkeleton({ glass, label }: Readonly<{ glass: ReturnType<typeof useDialogueGlass>; label: string }>) {
  const base = glassTone(glass.text, 0.09);
  const highlight = glassTone(glass.text, 0.15);
  return (
    <View style={styles.stat} accessible accessibilityLabel={label} accessibilityState={{ busy: true }}>
      <View style={{ height: 34, justifyContent: 'center' }}>
        <SkeletonBlock width={46} height={24} borderRadius={8} baseColor={base} highlightColor={highlight} />
      </View>
      <Text maxFontSizeMultiplier={1.2} style={[styles.statLabel, { color: glass.secondary }]}>{label}</Text>
    </View>
  );
}

/** Скелет списка целей: строки той же высоты и с той же отметкой-кружком, что у настоящих целей (`goalRow`), — данные сервера встают на их места без прыжка. */
function GoalsSkeleton({ glass, rows }: Readonly<{ glass: ReturnType<typeof useDialogueGlass>; rows: number }>) {
  const base = glassTone(glass.text, 0.09);
  const highlight = glassTone(glass.text, 0.15);
  return (
    <View testID="dialogue-v2-completion-goals-skeleton" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[dialogueGlassCardStyle(glass, 16), styles.goals]}>
      {Array.from({ length: rows }, (_unused, index) => (
        <View key={index} /* guard-ok: статичный список одинаковых заглушек */ style={styles.goalRow}>
          {index > 0 ? <RowDivider color={glass.line} /> : null}
          <SkeletonBlock width={26} height={26} borderRadius={13} baseColor={base} highlightColor={highlight} />
          <SkeletonBlock width={index % 2 === 0 ? '78%' : '62%'} height={16} borderRadius={8} baseColor={base} highlightColor={highlight} />
        </View>
      ))}
    </View>
  );
}

function Stat({ glass, value, suffix, label, color, divider }: Readonly<{
  glass: ReturnType<typeof useDialogueGlass>; value: string; suffix?: string; label: string; color?: string; divider?: boolean;
}>) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${value}${suffix ?? ''} ${label}`}>
      {divider ? <RowDivider edge="left" color={glass.line} /> : null}
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
  headerSpacer: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  titleBlock: { alignItems: 'center', marginTop: 18 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.4, textAlign: 'center' },
  sub: { fontSize: 16, lineHeight: 21, marginTop: 6, textAlign: 'center' },
  neutral: { marginTop: 10, lineHeight: 22 },
  mood: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 32, paddingHorizontal: 14, borderRadius: 16, marginTop: 12 },
  moodText: { fontSize: 16, fontWeight: '700' },
  stateCard: { marginTop: 20, paddingHorizontal: 16, paddingVertical: 18, alignItems: 'center', gap: 12 },
  stateText: { fontSize: 16, lineHeight: 22, textAlign: 'center' },
  loadingNote: { marginTop: 16 },
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
