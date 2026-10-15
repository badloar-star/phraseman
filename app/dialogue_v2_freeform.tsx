import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { dialogueV2FreeformOpening } from './dialogue_v2_freeform_opening';
import { DialogueV2FreeformScreen, type DialogueV2FreeformMessage } from '../components/dialogs/DialogueV2FreeformScreen';
import { useLang } from '../components/LangContext';
import { usePremium } from '../components/PremiumContext';
import { useVoiceAttemptGate } from '../hooks/use_voice_attempt_gate';
import { useStudyTarget } from '../components/StudyTargetContext';
import { DialogueGlassGate, useDialogueGlass } from '../components/dialogs/glass/DialogueGlassKit';
import { useDialogueV2VoiceMessage } from '../hooks/use_dialogue_v2_voice_message';
import { speechUnavailableOnDeviceText } from './speech_device_availability';
import { triLang } from '../constants/i18n';
import {
  requestDialogueV2FreeformPreparedBotVoice,
  sendDialogueV2FreeformTurn,
  startDialogueV2FreeformSession,
} from './dialogue_v2_freeform_client';
import {
  resolveBundledDialogueV2FreeformPreparedBotVoiceAsset,
} from './dialogue_v2_freeform_prepared_bot_voice_asset_registry';
import {
  resolveCurrentDialogueV2FreeformPreparedBotVoice,
} from './dialogue_v2_freeform_prepared_bot_voice_runtime';
import { parseDialogueV2FreeformSessionTurnShape } from '../shared/dialogue_v2_freeform_session_contract';
import { safeRouterBack } from './navigation_back';
import { isDevFreeformLoadingHeld } from './dev_dialog_state';
import { planFreeformStartRetry } from './dialogue_v2_freeform_start_retry';

const SUPPORTED_TARGETS = new Set(['en', 'es', 'fr', 'de']);

type SupportedTarget = 'en' | 'es' | 'fr' | 'de';

type ServerSession = Readonly<{
  sessionId: string;
  expiresAtMs: number;
  studyTarget: SupportedTarget;
  generation: number;
}>;

type PendingTurn = Readonly<{
  sessionId: string;
  turnId: string;
  studyTarget: SupportedTarget;
  generation: number;
  userMessage: string;
}>;

function isSupportedTarget(value: unknown): value is SupportedTarget {
  return typeof value === 'string' && SUPPORTED_TARGETS.has(value);
}

function labelsFor(lang: ReturnType<typeof useLang>['lang']) {
  // зачем (владелец 2026-09-30): раздел называется ТОЛЬКО «Свободный разговор»; подписи
  // пустого состояния, голоса и гейтов — по макету dialogs.html F1/F2, на 9 языках.
  return Object.freeze({
    title: triLang(lang, { ru: 'Свободный разговор', uk: 'Вільна розмова', en: 'Open conversation', es: 'Conversación libre', 'pt-BR': 'Conversa livre', vi: 'Trò chuyện tự do', id: 'Obrolan bebas', tr: 'Serbest sohbet', pl: 'Swobodna rozmowa', fr: 'Conversation libre', de: 'Freies Gespräch' }),
    memory: triLang(lang, { ru: 'Помнит контекст этого языка', uk: 'Пам’ятає контекст цієї мови', en: 'Remembers this language context', es: 'Recuerda el contexto de este idioma', 'pt-BR': 'Lembra o contexto deste idioma', vi: 'Nhớ ngữ cảnh của ngôn ngữ này', id: 'Mengingat konteks bahasa ini', tr: 'Bu dilin bağlamını hatırlar', pl: 'Pamięta kontekst tego języka', fr: 'Mémorise le contexte de cette langue', de: 'Merkt sich den Kontext dieser Sprache' }),
    back: triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Volver', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz', fr: 'Retour', de: 'Zurück' }),
    placeholder: triLang(lang, { ru: 'Напиши сообщение…', uk: 'Напиши повідомлення…', en: 'Write a message…', es: 'Escribe un mensaje…', 'pt-BR': 'Escreva uma mensagem…', vi: 'Viết tin nhắn…', id: 'Tulis pesan…', tr: 'Bir mesaj yaz…', pl: 'Napisz wiadomość…', fr: 'Écris un message…', de: 'Schreibe eine Nachricht…' }),
    send: triLang(lang, { ru: 'Отправить', uk: 'Надіслати', en: 'Send', es: 'Enviar', 'pt-BR': 'Enviar', vi: 'Gửi', id: 'Kirim', tr: 'Gönder', pl: 'Wyślij', fr: 'Envoyer', de: 'Senden' }),
    emptyTitle: triLang(lang, { ru: 'Что можно спросить', uk: 'Що можна запитати', en: 'What you can ask', es: 'Qué puedes preguntar', 'pt-BR': 'O que você pode perguntar', vi: 'Bạn có thể hỏi gì', id: 'Yang bisa kamu tanyakan', tr: 'Neler sorabilirsin', pl: 'O co możesz zapytać', fr: 'Ce que tu peux demander', de: 'Was du fragen kannst' }),
    emptyText: triLang(lang, { ru: 'Спроси про фразу или просто поговори. Можно отвечать на изучаемом языке.', uk: 'Запитай про вислів або просто поговори. Можна відповідати мовою, яку вчиш.', en: 'Ask about a phrase or just chat. You can reply in the language you are learning.', es: 'Pregunta por una frase o simplemente conversa. Puedes responder en el idioma que aprendes.', 'pt-BR': 'Pergunte sobre uma frase ou apenas converse. Você pode responder no idioma que está aprendendo.', vi: 'Hỏi về một cụm từ hoặc chỉ trò chuyện. Bạn có thể trả lời bằng ngôn ngữ đang học.', id: 'Tanyakan tentang frasa atau ngobrol saja. Kamu bisa menjawab dalam bahasa yang kamu pelajari.', tr: 'Bir ifadeyi sor ya da sadece sohbet et. Öğrendiğin dilde cevap verebilirsin.', pl: 'Zapytaj o frazę albo po prostu porozmawiaj. Możesz odpowiadać w języku, którego się uczysz.', fr: 'Demande une expression ou discute simplement. Tu peux répondre dans la langue que tu apprends.', de: 'Frag nach einer Wendung oder plaudere einfach. Du kannst in der Lernsprache antworten.' }),
    voiceIdle: triLang(lang, { ru: 'Зажми и говори', uk: 'Затисни й говори', en: 'Hold and speak', es: 'Mantén y habla', 'pt-BR': 'Segure e fale', vi: 'Giữ và nói', id: 'Tahan dan bicara', tr: 'Basılı tut ve konuş', pl: 'Przytrzymaj i mów', fr: 'Maintiens et parle', de: 'Halten und sprechen' }),
    voiceRecording: triLang(lang, { ru: 'Говори… отпусти, когда закончишь', uk: 'Говори… відпусти, коли закінчиш', en: 'Speak… release when done', es: 'Habla… suelta al terminar', 'pt-BR': 'Fale… solte ao terminar', vi: 'Hãy nói… thả ra khi xong', id: 'Bicara… lepaskan jika selesai', tr: 'Konuş… bitince bırak', pl: 'Mów… puść, gdy skończysz', fr: 'Parle… relâche à la fin', de: 'Sprich… loslassen, wenn fertig' }),
    discardVoice: triLang(lang, { ru: 'Удалить запись', uk: 'Видалити запис', en: 'Discard recording', es: 'Descartar grabación', 'pt-BR': 'Descartar gravação', vi: 'Bỏ bản ghi', id: 'Buang rekaman', tr: 'Kaydı sil', pl: 'Odrzuć nagranie', fr: 'Supprimer l’enregistrement', de: 'Aufnahme verwerfen' }),
    loading: triLang(lang, { ru: 'Готовим разговор…', uk: 'Готуємо розмову…', en: 'Getting the chat ready…', es: 'Preparando la conversación…', 'pt-BR': 'Preparando a conversa…', vi: 'Đang chuẩn bị cuộc trò chuyện…', id: 'Menyiapkan obrolan…', tr: 'Sohbet hazırlanıyor…', pl: 'Przygotowujemy rozmowę…', fr: 'Préparation de la conversation…', de: 'Gespräch wird vorbereitet…' }),
    plus: triLang(lang, { ru: 'Свободный разговор доступен в Plus', uk: 'Вільна розмова доступна в Plus', en: 'Free conversation is available with Plus', es: 'La conversación libre está disponible con Plus', 'pt-BR': 'A conversa livre está disponível no Plus', vi: 'Trò chuyện tự do có trong Plus', id: 'Obrolan bebas tersedia di Plus', tr: 'Serbest sohbet Plus ile kullanılabilir', pl: 'Swobodna rozmowa jest dostępna w Plus', fr: 'La conversation libre est disponible avec Plus', de: 'Freies Gespräch ist mit Plus verfügbar' }),
    openPlus: triLang(lang, { ru: 'Открыть Plus', uk: 'Відкрити Plus', en: 'Open Plus', es: 'Abrir Plus', 'pt-BR': 'Abrir Plus', vi: 'Mở Plus', id: 'Buka Plus', tr: 'Plus’ı aç', pl: 'Otwórz Plus', fr: 'Ouvrir Plus', de: 'Plus öffnen' }),
    unavailable: triLang(lang, { ru: 'Не удалось продолжить разговор', uk: 'Не вдалося продовжити розмову', en: 'Could not continue the chat', es: 'No se pudo continuar la conversación', 'pt-BR': 'Não foi possível continuar a conversa', vi: 'Không thể tiếp tục trò chuyện', id: 'Obrolan tidak dapat dilanjutkan', tr: 'Sohbete devam edilemedi', pl: 'Nie udało się kontynuować rozmowy', fr: 'Impossible de poursuivre la conversation', de: 'Das Gespräch konnte nicht fortgesetzt werden' }),
    retry: triLang(lang, { ru: 'Повторить', uk: 'Повторити', en: 'Retry', es: 'Reintentar', 'pt-BR': 'Tentar de novo', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Ponów', fr: 'Réessayer', de: 'Erneut versuchen' }),
  });
}

// Пробные id нужного формата — проверка текста реплики, поставленной в очередь до готовности сессии, той же канонической
// формой, что у настоящего хода (общий контракт не меняется).
const QUEUE_PROBE_SESSION_ID = `d2fs_${'q'.repeat(32)}`;
const QUEUE_PROBE_TURN_ID = `d2ft_${'q'.repeat(16)}`;

async function secureTurnId(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(18);
  return `d2ft_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

// зачем (владелец 01.10: «первая реплика всегда уже на экране»): открывающая фраза собеседника
// в первом кадре, без сети. Сервер берёт ту же фразу первым ходом (данные Ядра).
function freeformOpeningMessages(studyTarget: unknown): readonly DialogueV2FreeformMessage[] {
  const opening = dialogueV2FreeformOpening(studyTarget);
  return opening ? Object.freeze([Object.freeze({ id: 'assistant_opening', author: 'assistant' as const, text: opening })]) : Object.freeze([]);
}

export default function DialogueV2FreeformRoute() {
  const router = useRouter();
  const { studyTarget } = useStudyTarget();
  const { accessResolved, hasPremiumAccess } = usePremium();
  const { lang } = useLang();
  const glass = useDialogueGlass();
  const labels = useMemo(() => labelsFor(lang), [lang]);
  const [session, setSession] = useState<ServerSession | null>(null);
  const [messages, setMessages] = useState<readonly DialogueV2FreeformMessage[]>(() => freeformOpeningMessages(studyTarget));
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const sessionRef = useRef<ServerSession | null>(null);
  const pendingRef = useRef<PendingTurn | null>(null);
  const startingRef = useRef(false);
  const generationRef = useRef(0);
  // зачем (координатор 12.10, Optimistic UI): реплика до готовности сессии — уже проверенный текст, пузырь показан сразу.
  const queuedMessageRef = useRef<string | null>(null);
  // Защёлки от двойного тапа (синхронно, до await): старт одного поколения и «Повторить» — по одному в полёте.
  const startInFlightRef = useRef<number | null>(null);
  const retryBusyRef = useRef(false);
  // зачем (владелец 01.10, координатор 12.10): тихий повтор старта — таймер одного поколения; смена языка и уход с экрана его снимают.
  const startRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startSessionRef = useRef<(target: SupportedTarget, generation: number, attempt: number) => Promise<void>>(async () => undefined);
  const clearStartRetryTimer = useCallback(() => {
    if (startRetryTimerRef.current) clearTimeout(startRetryTimerRef.current);
    startRetryTimerRef.current = null;
  }, []);
  const targetRef = useRef<unknown>(studyTarget);
  targetRef.current = studyTarget;

  const voice = useDialogueV2VoiceMessage({
    studyTarget: isSupportedTarget(studyTarget) ? studyTarget : 'en',
    promptText: labels.title,
    disabled: sending || unavailable || !session || !isSupportedTarget(studyTarget)
      || session.studyTarget !== studyTarget,
    onTranscript: setDraft,
  });
  const discardVoice = voice.discard;
  // зачем (владелец 15.10, D196): свободный разговор — тоже из общего дневного счётчика голоса 3/день (раньше у него гейта не было вовсе): при нуле тап по микрофону ведёт на пейвол,
  // попытка списывается в момент РЕАЛЬНОГО начала записи (переход в recording), цифра на микрофоне падает сразу
  const voiceGate = useVoiceAttemptGate({ surface: 'dialogs', source: 'dialogue_v2_freeform' });
  const commitVoiceAttempt = voiceGate.commitStartedAttempt;
  const prevVoiceStatusRef = useRef(voice.status);
  useEffect(() => {
    const previous = prevVoiceStatusRef.current;
    prevVoiceStatusRef.current = voice.status;
    if (voice.status !== 'recording' || previous === 'recording') return;
    commitVoiceAttempt();
  }, [commitVoiceAttempt, voice.status]);
  const startVoice = useCallback(() => {
    if (!voiceGate.canStartAttempt()) return;
    void voice.start();
  }, [voice, voiceGate]);

  const replaceSession = useCallback((next: ServerSession | null) => {
    sessionRef.current = next;
    setSession(next);
  }, []);

  const isCurrentPending = useCallback((pending: PendingTurn): boolean => {
    const current = sessionRef.current;
    return generationRef.current === pending.generation
      && targetRef.current === pending.studyTarget
      && current?.generation === pending.generation
      && current.studyTarget === pending.studyTarget
      && current.sessionId === pending.sessionId;
  }, []);

  const startCurrentSession = useCallback(async (
    target: SupportedTarget,
    generation: number,
    attempt = 0,
  ) => {
    // Сбой текущего поколения: тихий повтор (чат и очередь реплики живы) или, после последнего, панель с «Повторить».
    const handleStartFailure = (cause: string) => {
      const plan = planFreeformStartRetry(attempt);
      if (plan.kind === 'give_up') {
        console.warn('[DIALOGUE-V2] freeform: start → unavailable after silent retries', { generation, studyTarget: target, attempts: attempt + 1, cause, queued: queuedMessageRef.current !== null });
        setUnavailable(true);
        return;
      }
      console.warn('[DIALOGUE-V2] freeform: start → failed, silent retry', { generation, studyTarget: target, attempt, nextAttempt: plan.nextAttempt, delayMs: plan.delayMs, cause });
      clearStartRetryTimer();
      startRetryTimerRef.current = setTimeout(() => {
        startRetryTimerRef.current = null;
        if (generationRef.current !== generation || targetRef.current !== target) {
          console.log('[DIALOGUE-V2] freeform: silent retry dropped — contour changed', { generation, current: generationRef.current, studyTarget: target }); // guard-ok
          return;
        }
        void startSessionRef.current(target, generation, plan.nextAttempt);
      }, plan.delayMs);
    };
    if (startInFlightRef.current === generation) {
      console.log('[DIALOGUE-V2] freeform: start already in flight', { generation, studyTarget: target }); // guard-ok: двойной тап не создаёт вторую сессию
      return;
    }
    startInFlightRef.current = generation;
    replaceSession(null);
    setUnavailable(false);
    try {
      const started = await startDialogueV2FreeformSession({ studyTarget: target });
      if (generationRef.current !== generation || targetRef.current !== target) {
        console.log('[DIALOGUE-V2] freeform: start result ignored — contour changed', { generation, current: generationRef.current, studyTarget: target }); // guard-ok
        return;
      }
      if (!started) {
        handleStartFailure('no_session');
        return;
      }
      console.log('[DIALOGUE-V2] freeform: start → session ready', { generation, studyTarget: target, attempt, queued: queuedMessageRef.current !== null });
      replaceSession(Object.freeze({ ...started, studyTarget: target, generation }));
    } catch (error: unknown) {
      const current = generationRef.current === generation && targetRef.current === target;
      const message = error instanceof Error ? error.message : String(error);
      if (!current) {
        console.log('[DIALOGUE-V2] freeform: start failure ignored — contour changed', { generation, studyTarget: target, message }); // guard-ok
      } else {
        handleStartFailure(message);
      }
    } finally {
      if (startInFlightRef.current === generation) startInFlightRef.current = null;
    }
  }, [clearStartRetryTimer, replaceSession]);
  startSessionRef.current = startCurrentSession;
  useEffect(() => clearStartRetryTimer, [clearStartRetryTimer]);

  useEffect(() => {
    discardVoice();
    clearStartRetryTimer();
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    replaceSession(null);
    setMessages(freeformOpeningMessages(studyTarget));
    setDraft('');
    pendingRef.current = null;
    queuedMessageRef.current = null;
    retryBusyRef.current = false;
    startingRef.current = false;
    setSending(false);
    setUnavailable(false);
    if (!accessResolved || !hasPremiumAccess || !isSupportedTarget(studyTarget)) return undefined;
    void startCurrentSession(studyTarget, generation);
    return undefined;
  }, [accessResolved, clearStartRetryTimer, discardVoice, hasPremiumAccess, replaceSession, startCurrentSession, studyTarget]);

  const runPendingTurn = useCallback(async (pending: PendingTurn) => {
    if (!isCurrentPending(pending)) {
      console.log('[DIALOGUE-V2] freeform: turn skipped — not current contour', { turnId: pending.turnId }); // guard-ok
      return;
    }
    setSending(true);
    setUnavailable(false);
    try {
      const result = await sendDialogueV2FreeformTurn({
        sessionId: pending.sessionId,
        turnId: pending.turnId,
        studyTarget: pending.studyTarget,
        userMessage: pending.userMessage,
      });
      if (!result) throw new Error('freeform_turn_unavailable');
      if (!isCurrentPending(pending)) {
        console.log('[DIALOGUE-V2] freeform: late turn result ignored — contour changed', { turnId: pending.turnId }); // guard-ok
        return;
      }
      setMessages((current) => Object.freeze([...current, Object.freeze({
        id: `assistant_${current.length + 1}`,
        author: 'assistant' as const,
        text: result.assistantMessage,
      })]));
      // The reviewed catalog is deliberately null, so this bridge is inert:
      // it cannot invoke the callable or add voice UI metadata at present.
      void resolveCurrentDialogueV2FreeformPreparedBotVoice({
        response: {
          sessionId: pending.sessionId,
          turnId: pending.turnId,
          studyTarget: pending.studyTarget,
          text: result.assistantMessage,
        },
        resolveAsset: resolveBundledDialogueV2FreeformPreparedBotVoiceAsset,
        requestSelection: requestDialogueV2FreeformPreparedBotVoice,
      });
      pendingRef.current = null;
    } catch (error: unknown) {
      const current = isCurrentPending(pending);
      console.warn('[DIALOGUE-V2] freeform: turn → failed', { turnId: pending.turnId, current, message: error instanceof Error ? error.message : String(error) });
      if (current) setUnavailable(true);
    } finally {
      if (isCurrentPending(pending)) {
        setSending(false);
        startingRef.current = false;
      }
    }
  }, [isCurrentPending]);

  const sendRef = useRef<(queued: string | null) => Promise<void>>(async () => undefined);
  useEffect(() => {
    const queued = queuedMessageRef.current;
    if (!session || queued === null) return;
    queuedMessageRef.current = null;
    console.log('[DIALOGUE-V2] freeform: session ready, flushing queued send', { length: queued.length }); // guard-ok
    void sendRef.current(queued);
  }, [session]);

  const appendLearnerMessage = (text: string) => {
    const voiceAttachment = voice.takeVoiceAttachment(text);
    setMessages((current) => Object.freeze([...current, Object.freeze({
      id: `learner_${current.length + 1}`,
      author: 'learner' as const,
      text,
      ...(voiceAttachment ? { voice: { uri: voiceAttachment.uri } } : {}),
    })]));
    setDraft('');
  };

  /** queued — текст из очереди (пузырь уже показан); null — обычная отправка из поля ввода. */
  const send = async (queued: string | null = null) => {
    const userMessage = queued ?? draft.trim();
    const currentSession = sessionRef.current;
    // зачем (владелец 01.10 «диалоги без загрузки»; координатор 12.10 Optimistic UI): экран открыт до ответа сервера. Реплика,
    // нажатая раньше готовности сессии, сразу встаёт пузырём, поле очищается, видна «отправка»; ход уйдёт сам, когда сессия
    // придёт. Текст проверяется ДО пузыря той же канонической формой, что у хода.
    if (!currentSession && queued === null) {
      if (queuedMessageRef.current !== null) {
        console.log('[DIALOGUE-V2] freeform: send ignored — a message is already queued'); // guard-ok: двойной тап
        return;
      }
      if (userMessage.length < 1 || voice.status !== 'idle' || !isSupportedTarget(targetRef.current)) {
        console.log('[DIALOGUE-V2] freeform: send not queued', { length: userMessage.length, voice: voice.status, supported: isSupportedTarget(targetRef.current) }); // guard-ok
        return;
      }
      const probe = parseDialogueV2FreeformSessionTurnShape({
        sessionId: QUEUE_PROBE_SESSION_ID, turnId: QUEUE_PROBE_TURN_ID, studyTarget: targetRef.current, userMessage,
      });
      if (!probe) {
        console.log('[DIALOGUE-V2] freeform: send not queued — text is not canonical', { length: userMessage.length }); // guard-ok
        return;
      }
      queuedMessageRef.current = probe.userMessage;
      appendLearnerMessage(probe.userMessage);
      setSending(true);
      console.log('[DIALOGUE-V2] freeform: send queued until session ready', { length: probe.userMessage.length }); // guard-ok
      return;
    }
    if (!currentSession || !isSupportedTarget(targetRef.current) || startingRef.current
      || (queued === null && (sending || voice.status !== 'idle'))
      || userMessage.length < 1) {
      console.log('[DIALOGUE-V2] freeform: send skipped', {
        hasSession: !!currentSession, queued: queued !== null, starting: startingRef.current, sending, voice: voice.status, length: userMessage.length,
      }); // guard-ok
      return;
    }
    startingRef.current = true;
    let turnId: string;
    try {
      turnId = await secureTurnId();
    } catch (error: unknown) {
      console.warn('[DIALOGUE-V2] freeform: turn id failed', { queued: queued !== null, message: error instanceof Error ? error.message : String(error) });
      startingRef.current = false;
      // Реплика из очереди уже в ленте — оставляем её в очереди: «Повторить» перезапустит старт и отправит её.
      if (queued !== null) queuedMessageRef.current = queued;
      setUnavailable(true);
      return;
    }
    const canonicalRequest = parseDialogueV2FreeformSessionTurnShape({
      sessionId: currentSession.sessionId,
      turnId,
      studyTarget: currentSession.studyTarget,
      userMessage,
    });
    if (!canonicalRequest) {
      console.log('[DIALOGUE-V2] freeform: send rejected — text is not canonical', { length: userMessage.length, queued: queued !== null }); // guard-ok
      startingRef.current = false;
      if (queued !== null) setSending(false);
      return;
    }
    const pending = Object.freeze({ ...canonicalRequest, generation: currentSession.generation });
    if (!isCurrentPending(pending)) {
      console.log('[DIALOGUE-V2] freeform: send skipped — contour changed', { turnId }); // guard-ok
      startingRef.current = false;
      return;
    }
    pendingRef.current = pending;
    if (queued === null) appendLearnerMessage(canonicalRequest.userMessage);
    await runPendingTurn(pending);
  };
  sendRef.current = send;

  // зачем (координатор 12.10, R1 dialogs-gap-009): dev `hold=freeform_loading` держит экран «готовим разговор» для съёмки; в стор-сборке false.
  if (!accessResolved || isDevFreeformLoadingHeld()) {
    return <DialogueGlassGate glass={glass} testID="dialogue-v2-freeform-loading" backLabel={labels.back} onBack={() => safeRouterBack(router, '/ai_dialog_home' as never)} loading title={labels.loading} />;
  }
  if (!hasPremiumAccess) {
    return (
      <DialogueGlassGate
        glass={glass}
        testID="dialogue-v2-freeform-plus"
        backLabel={labels.back}
        onBack={() => safeRouterBack(router, '/ai_dialog_home' as never)}
        icon="lock-closed" // зачем (R1_DIFF_ONE_FIX, dialogs-gap-010): в образце замок заливной, не контурный
        title={labels.plus}
        action={{ label: labels.openPlus, onPress: () => router.push({ pathname: '/premium_modal', params: { context: 'dialog_limit', source: 'dialogue_v2_freeform' } } as never) }}
      />
    );
  }

  if (unavailable) {
    return (
      <DialogueGlassGate
        glass={glass}
        testID="dialogue-v2-freeform-unavailable"
        backLabel={labels.back}
        onBack={() => safeRouterBack(router, '/ai_dialog_home' as never)}
        icon="cloud-offline-outline"
        title={labels.unavailable}
        action={{
          label: labels.retry,
          onPress: () => {
            // зачем (координатор 12.10): двойной тап «Повторить» не шлёт ход дважды и не создаёт вторую серверную сессию.
            if (retryBusyRef.current) {
              console.log('[DIALOGUE-V2] freeform: retry ignored — already in flight'); // guard-ok
              return;
            }
            retryBusyRef.current = true;
            const release = () => { retryBusyRef.current = false; };
            const pending = pendingRef.current;
            if (pending && isCurrentPending(pending)) {
              console.log('[DIALOGUE-V2] freeform: retry → resend pending turn', { turnId: pending.turnId });
              void runPendingTurn(pending).finally(release);
              return;
            }
            const target = targetRef.current;
            if (isSupportedTarget(target)) {
              console.log('[DIALOGUE-V2] freeform: retry → restart session (new silent series)', { generation: generationRef.current, queued: queuedMessageRef.current !== null });
              clearStartRetryTimer();
              void startCurrentSession(target, generationRef.current, 0).finally(release);
              return;
            }
            console.warn('[DIALOGUE-V2] freeform: retry → unsupported study target', { target: String(target) });
            release();
          },
        }}
      />
    );
  }

  return <DialogueV2FreeformScreen title={labels.title} memoryNote={labels.memory} messages={messages} draft={draft} sending={sending} voiceStatus={voice.status} voiceUnavailable={voice.unavailableOnDevice} voiceNotice={voice.failure === 'unavailable' && voice.unavailableOnDevice ? speechUnavailableOnDeviceText(lang) : null} voiceDraft={voice.voiceDraft} playingVoiceUri={voice.playingVoiceUri} interfaceLang={lang} labels={labels} onBack={() => safeRouterBack(router, '/ai_dialog_home' as never)} onChangeDraft={setDraft} onSend={() => { void send(); }} onStartVoice={startVoice} onStopVoice={voice.stop} onDiscardVoice={voice.discard} onPlayVoice={voice.play} />;
}
