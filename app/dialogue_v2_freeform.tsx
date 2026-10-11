import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { dialogueV2FreeformOpening } from './dialogue_v2_freeform_opening';
import { DialogueV2FreeformScreen, type DialogueV2FreeformMessage } from '../components/dialogs/DialogueV2FreeformScreen';
import { useLang } from '../components/LangContext';
import { usePremium } from '../components/PremiumContext';
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
    title: triLang(lang, { ru: 'Свободный разговор', uk: 'Вільна розмова', en: 'Free conversation', es: 'Conversación libre', 'pt-BR': 'Conversa livre', vi: 'Trò chuyện tự do', id: 'Obrolan bebas', tr: 'Serbest sohbet', pl: 'Swobodna rozmowa', fr: 'Conversation libre', de: 'Freies Gespräch' }),
    memory: triLang(lang, { ru: 'Помнит контекст этого языка', uk: 'Пам’ятає контекст цієї мови', en: 'Remembers this language context', es: 'Recuerda el contexto de este idioma', 'pt-BR': 'Lembra o contexto deste idioma', vi: 'Nhớ ngữ cảnh của ngôn ngữ này', id: 'Mengingat konteks bahasa ini', tr: 'Bu dilin bağlamını hatırlar', pl: 'Pamięta kontekst tego języka', fr: 'Mémorise le contexte de cette langue', de: 'Merkt sich den Kontext dieser Sprache' }),
    back: triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Volver', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz', fr: 'Retour', de: 'Zurück' }),
    placeholder: triLang(lang, { ru: 'Напиши сообщение…', uk: 'Напиши повідомлення…', en: 'Write a message…', es: 'Escribe un mensaje…', 'pt-BR': 'Escreva uma mensagem…', vi: 'Viết tin nhắn…', id: 'Tulis pesan…', tr: 'Bir mesaj yaz…', pl: 'Napisz wiadomość…', fr: 'Écris un message…', de: 'Schreibe eine Nachricht…' }),
    send: triLang(lang, { ru: 'Отправить', uk: 'Надіслати', en: 'Send', es: 'Enviar', 'pt-BR': 'Enviar', vi: 'Gửi', id: 'Kirim', tr: 'Gönder', pl: 'Wyślij', fr: 'Envoyer', de: 'Senden' }),
    emptyTitle: triLang(lang, { ru: 'Что можно спросить', uk: 'Що можна запитати', en: 'What you can ask', es: 'Qué puedes preguntar', 'pt-BR': 'O que você pode perguntar', vi: 'Bạn có thể hỏi gì', id: 'Yang bisa kamu tanyakan', tr: 'Neler sorabilirsin', pl: 'O co możesz zapytać', fr: 'Ce que tu peux demander', de: 'Was du fragen kannst' }),
    emptyText: triLang(lang, { ru: 'Спроси про фразу или просто поговори. Можно отвечать на изучаемом языке.', uk: 'Запитай про фразу або просто поговори. Можна відповідати мовою, яку вчиш.', en: 'Ask about a phrase or just chat. You can reply in the language you are learning.', es: 'Pregunta por una frase o simplemente conversa. Puedes responder en el idioma que aprendes.', 'pt-BR': 'Pergunte sobre uma frase ou apenas converse. Você pode responder no idioma que está aprendendo.', vi: 'Hỏi về một cụm từ hoặc chỉ trò chuyện. Bạn có thể trả lời bằng ngôn ngữ đang học.', id: 'Tanyakan tentang frasa atau ngobrol saja. Kamu bisa menjawab dalam bahasa yang kamu pelajari.', tr: 'Bir ifadeyi sor ya da sadece sohbet et. Öğrendiğin dilde cevap verebilirsin.', pl: 'Zapytaj o frazę albo po prostu porozmawiaj. Możesz odpowiadać w języku, którego się uczysz.', fr: 'Demande une expression ou discute simplement. Tu peux répondre dans la langue que tu apprends.', de: 'Frag nach einer Wendung oder plaudere einfach. Du kannst in der Lernsprache antworten.' }),
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
  ) => {
    replaceSession(null);
    setUnavailable(false);
    try {
      const started = await startDialogueV2FreeformSession({ studyTarget: target });
      if (generationRef.current !== generation || targetRef.current !== target) return;
      if (!started) { setUnavailable(true); return; }
      replaceSession(Object.freeze({ ...started, studyTarget: target, generation }));
    } catch {
      if (generationRef.current === generation && targetRef.current === target) {
        setUnavailable(true);
      }
    }
  }, [replaceSession]);

  useEffect(() => {
    discardVoice();
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    replaceSession(null);
    setMessages(freeformOpeningMessages(studyTarget));
    setDraft('');
    pendingRef.current = null;
    queuedSendRef.current = false;
    startingRef.current = false;
    setSending(false);
    setUnavailable(false);
    if (!accessResolved || !hasPremiumAccess || !isSupportedTarget(studyTarget)) return undefined;
    void startCurrentSession(studyTarget, generation);
    return undefined;
  }, [accessResolved, discardVoice, hasPremiumAccess, replaceSession, startCurrentSession, studyTarget]);

  const runPendingTurn = useCallback(async (pending: PendingTurn) => {
    if (!isCurrentPending(pending)) return;
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
      if (!isCurrentPending(pending)) return;
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
    } catch {
      if (isCurrentPending(pending)) setUnavailable(true);
    } finally {
      if (isCurrentPending(pending)) {
        setSending(false);
        startingRef.current = false;
      }
    }
  }, [isCurrentPending]);

  const queuedSendRef = useRef(false);
  const sendRef = useRef<() => Promise<void>>(async () => undefined);
  useEffect(() => {
    if (!session || !queuedSendRef.current) return;
    queuedSendRef.current = false;
    console.log('[DIALOGUE-V2] freeform: session ready, flushing queued send'); // guard-ok
    void sendRef.current();
  }, [session]);

  const send = async () => {
    const userMessage = draft.trim();
    const currentSession = sessionRef.current;
    // зачем (владелец 01.10: «диалоги без загрузки»): экран открыт до ответа сервера; отправку,
    // нажатую раньше готовности сессии, держим в очереди и шлём, как только сессия пришла.
    if (!currentSession && userMessage.length > 0 && voice.status === 'idle') {
      console.log('[DIALOGUE-V2] freeform: send queued until session ready', { length: userMessage.length }); // guard-ok
      queuedSendRef.current = true;
      return;
    }
    if (!currentSession || !isSupportedTarget(targetRef.current) || sending || startingRef.current
      || voice.status !== 'idle'
      || userMessage.length < 1) return;
    startingRef.current = true;
    let turnId: string;
    try {
      turnId = await secureTurnId();
    } catch (error: unknown) {
      console.warn('[DIALOGUE-V2] freeform: turn id failed', { message: error instanceof Error ? error.message : String(error) });
      startingRef.current = false;
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
      startingRef.current = false;
      return;
    }
    const pending = Object.freeze({ ...canonicalRequest, generation: currentSession.generation });
    if (!isCurrentPending(pending)) {
      startingRef.current = false;
      return;
    }
    pendingRef.current = pending;
    const voiceAttachment = voice.takeVoiceAttachment(canonicalRequest.userMessage);
    setMessages((current) => Object.freeze([...current, Object.freeze({
      id: `learner_${current.length + 1}`,
      author: 'learner' as const,
      text: canonicalRequest.userMessage,
      ...(voiceAttachment ? { voice: { uri: voiceAttachment.uri } } : {}),
    })]));
    setDraft('');
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
        icon="lock-closed-outline"
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
            const pending = pendingRef.current;
            if (pending && isCurrentPending(pending)) {
              void runPendingTurn(pending);
              return;
            }
            const target = targetRef.current;
            if (isSupportedTarget(target)) {
              void startCurrentSession(target, generationRef.current);
            }
          },
        }}
      />
    );
  }

  return <DialogueV2FreeformScreen title={labels.title} memoryNote={labels.memory} messages={messages} draft={draft} sending={sending} voiceStatus={voice.status} voiceUnavailable={voice.unavailableOnDevice} voiceNotice={voice.failure === 'unavailable' && voice.unavailableOnDevice ? speechUnavailableOnDeviceText(lang) : null} voiceDraft={voice.voiceDraft} playingVoiceUri={voice.playingVoiceUri} interfaceLang={lang} labels={labels} onBack={() => safeRouterBack(router, '/ai_dialog_home' as never)} onChangeDraft={setDraft} onSend={() => { void send(); }} onStartVoice={voice.start} onStopVoice={voice.stop} onDiscardVoice={voice.discard} onPlayVoice={voice.play} />;
}
