import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import AiDialogConsentGate from './ai_dialog_consent_gate';
import { buildDialogueV2BriefingModel, type DialogueV2BriefingModel } from './dialogue_v2_briefing_model';
import {
  fetchReleasedDialogueV2Catalogue,
  type DialogueV2CatalogueReleaseEnvelope,
  type DialogueV2CatalogueStudyTarget,
} from './dialogue_v2_catalogue_client';
import { sendDialogueV2TextTurn, startDialogueV2TextSession } from './dialogue_v2_turn_client';
import { resolveCurrentDialogueV2PreparedBotVoice } from './dialogue_v2_prepared_bot_voice_runtime';
import { triLang } from '../constants/i18n';
import { useMyCoinRank } from '../hooks/use_my_coin_rank';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { DialogueGlassGate, useDialogueGlass } from '../components/dialogs/glass/DialogueGlassKit';
import { useDialogueV2VoiceMessage } from '../hooks/use_dialogue_v2_voice_message';
import { useDialogueV2PreparedBotVoicePlayback } from '../hooks/use_dialogue_v2_prepared_bot_voice_playback';
import {
  DialogueV2SessionScreen,
  type DialogueV2SessionMessage,
} from '../components/dialogs/DialogueV2SessionScreen';

const V2_TARGETS = new Set(['en', 'es', 'fr', 'de']);

type SessionState =
  | Readonly<{ kind: 'loading' }>
  | Readonly<{ kind: 'unavailable' }>
  | Readonly<{ kind: 'available'; envelope: DialogueV2CatalogueReleaseEnvelope }>;

type ServerSessionState = 'idle' | 'starting' | 'unavailable' | 'ready';

function supportedTarget(value: unknown): value is DialogueV2CatalogueStudyTarget {
  return typeof value === 'string' && V2_TARGETS.has(value);
}

function validScenarioId(value: unknown): value is string {
  return typeof value === 'string' && /^(?=.{1,64}$)[a-z0-9]+(?:_[a-z0-9]+)*$/.test(value);
}

function labelsFor(lang: ReturnType<typeof useLang>['lang']) {
  // зачем (владелец 2026-09-30, макет dialogs.html C1–C18): подписи шапки, шторки «⋯»,
  // подсказки голоса и плашки ошибки — на всех 9 языках интерфейса.
  return Object.freeze({
    back: triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Volver', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz', fr: 'Retour', de: 'Zurück' }),
    placeholder: triLang(lang, { ru: 'Напиши или зажми микрофон', uk: 'Напиши або затисни мікрофон', en: 'Type or hold the mic', es: 'Escribe o mantén el micrófono', 'pt-BR': 'Escreva ou segure o microfone', vi: 'Nhập hoặc giữ micro', id: 'Ketik atau tahan mikrofon', tr: 'Yaz ya da mikrofona basılı tut', pl: 'Napisz lub przytrzymaj mikrofon', fr: 'Écris ou maintiens le micro', de: 'Schreib oder halte das Mikro' }),
    send: triLang(lang, { ru: 'Отправить', uk: 'Надіслати', en: 'Send', es: 'Enviar', 'pt-BR': 'Enviar', vi: 'Gửi', id: 'Kirim', tr: 'Gönder', pl: 'Wyślij', fr: 'Envoyer', de: 'Senden' }),
    complete: triLang(lang, { ru: 'Завершить диалог', uk: 'Завершити діалог', en: 'Finish dialogue', es: 'Terminar el diálogo', 'pt-BR': 'Encerrar diálogo', vi: 'Kết thúc hội thoại', id: 'Akhiri dialog', tr: 'Diyaloğu bitir', pl: 'Zakończ dialog', fr: 'Terminer le dialogue', de: 'Dialog beenden' }),
    subtitle: triLang(lang, { ru: 'Диалог', uk: 'Діалог', en: 'Dialogue', es: 'Diálogo', 'pt-BR': 'Diálogo', vi: 'Hội thoại', id: 'Dialog', tr: 'Diyalog', pl: 'Dialog', fr: 'Dialogue', de: 'Dialog' }),
    more: triLang(lang, { ru: 'Диалог', uk: 'Діалог', en: 'Dialogue', es: 'Diálogo', 'pt-BR': 'Diálogo', vi: 'Hội thoại', id: 'Dialog', tr: 'Diyalog', pl: 'Dialog', fr: 'Dialogue', de: 'Dialog' }),
    close: triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij', fr: 'Fermer', de: 'Schließen' }),
    you: triLang(lang, { ru: 'Вы', uk: 'Ви', en: 'You', es: 'Tú', 'pt-BR': 'Você', vi: 'Bạn', id: 'Kamu', tr: 'Sen', pl: 'Ty', fr: 'Toi', de: 'Du' }),
    voiceIdle: triLang(lang, { ru: 'Или зажми и говори', uk: 'Або затисни й говори', en: 'Or hold and speak', es: 'O mantén y habla', 'pt-BR': 'Ou segure e fale', vi: 'Hoặc giữ và nói', id: 'Atau tahan dan bicara', tr: 'Ya da basılı tut ve konuş', pl: 'Albo przytrzymaj i mów', fr: 'Ou maintiens et parle', de: 'Oder halten und sprechen' }),
    voiceStarting: triLang(lang, { ru: 'Готовлю микрофон… удерживай кнопку', uk: 'Готую мікрофон… утримуй кнопку', en: 'Getting the mic ready… keep holding', es: 'Preparando el micrófono… mantén pulsado', 'pt-BR': 'Preparando o microfone… continue segurando', vi: 'Đang chuẩn bị micro… giữ nút', id: 'Menyiapkan mikrofon… tetap tahan', tr: 'Mikrofon hazırlanıyor… basılı tut', pl: 'Przygotowuję mikrofon… trzymaj', fr: 'Préparation du micro… maintiens', de: 'Mikro wird vorbereitet… gedrückt halten' }),
    voiceRecording: triLang(lang, { ru: 'Говори… отпусти, когда закончишь', uk: 'Говори… відпусти, коли закінчиш', en: 'Speak… release when done', es: 'Habla… suelta al terminar', 'pt-BR': 'Fale… solte ao terminar', vi: 'Hãy nói… thả ra khi xong', id: 'Bicara… lepaskan jika selesai', tr: 'Konuş… bitince bırak', pl: 'Mów… puść, gdy skończysz', fr: 'Parle… relâche à la fin', de: 'Sprich… loslassen, wenn fertig' }),
    discardVoice: triLang(lang, { ru: 'Удалить запись', uk: 'Видалити запис', en: 'Discard recording', es: 'Descartar grabación', 'pt-BR': 'Descartar gravação', vi: 'Bỏ bản ghi', id: 'Buang rekaman', tr: 'Kaydı sil', pl: 'Odrzuć nagranie', fr: 'Supprimer l’enregistrement', de: 'Aufnahme verwerfen' }),
    turnError: triLang(lang, { ru: 'Не удалось связаться с сервером. Проверь интернет-соединение и попробуй ещё раз.', uk: 'Не вдалося зв’язатися із сервером. Перевір інтернет-з’єднання і спробуй ще раз.', en: 'Could not reach the server. Check your connection and try again.', es: 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.', 'pt-BR': 'Não foi possível falar com o servidor. Verifique a conexão e tente de novo.', vi: 'Không kết nối được máy chủ. Kiểm tra mạng và thử lại.', id: 'Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.', tr: 'Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.', pl: 'Nie udało się połączyć z serwerem. Sprawdź internet i spróbuj ponownie.', fr: 'Impossible de joindre le serveur. Vérifie ta connexion et réessaie.', de: 'Server nicht erreichbar. Prüfe die Verbindung und versuche es erneut.' }),
    retry: triLang(lang, { ru: 'Повторить', uk: 'Повторити', en: 'Retry', es: 'Reintentar', 'pt-BR': 'Tentar de novo', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Ponów', fr: 'Réessayer', de: 'Erneut versuchen' }),
    tasks: triLang(lang, { ru: 'Задания', uk: 'Завдання', en: 'Goals', es: 'Objetivos', 'pt-BR': 'Objetivos', vi: 'Nhiệm vụ', id: 'Tugas', tr: 'Görevler', pl: 'Zadania', fr: 'Objectifs', de: 'Aufgaben' }),
    exitTitle: triLang(lang, { ru: 'Выйти из диалога?', uk: 'Вийти з діалогу?', en: 'Leave the dialogue?', es: '¿Salir del diálogo?', 'pt-BR': 'Sair do diálogo?', vi: 'Thoát hội thoại?', id: 'Keluar dari dialog?', tr: 'Diyalogdan çıkılsın mı?', pl: 'Wyjść z dialogu?', fr: 'Quitter le dialogue ?', de: 'Dialog verlassen?' }),
    exitMessage: triLang(lang, { ru: 'Переписка не сохранится: в следующий раз диалог начнётся заново.', uk: 'Листування не збережеться: наступного разу діалог почнеться заново.', en: 'The chat will not be saved: next time the dialogue starts over.', es: 'La conversación no se guardará: la próxima vez el diálogo empezará de nuevo.', 'pt-BR': 'A conversa não será salva: da próxima vez o diálogo começa do zero.', vi: 'Cuộc trò chuyện sẽ không được lưu: lần sau hội thoại bắt đầu lại.', id: 'Percakapan tidak akan disimpan: lain kali dialog dimulai dari awal.', tr: 'Yazışma kaydedilmez: bir sonraki sefer diyalog baştan başlar.', pl: 'Rozmowa nie zostanie zapisana: następnym razem dialog zacznie się od nowa.', fr: 'La conversation ne sera pas enregistrée : la prochaine fois, le dialogue recommencera.', de: 'Der Chat wird nicht gespeichert: Beim nächsten Mal beginnt der Dialog von vorn.' }),
    exitStay: triLang(lang, { ru: 'Остаться', uk: 'Залишитися', en: 'Stay', es: 'Quedarme', 'pt-BR': 'Ficar', vi: 'Ở lại', id: 'Tetap di sini', tr: 'Kal', pl: 'Zostań', fr: 'Rester', de: 'Bleiben' }),
    exitLeave: triLang(lang, { ru: 'Выйти', uk: 'Вийти', en: 'Leave', es: 'Salir', 'pt-BR': 'Sair', vi: 'Thoát', id: 'Keluar', tr: 'Çık', pl: 'Wyjdź', fr: 'Quitter', de: 'Verlassen' }),
    loading: triLang(lang, { ru: 'Загружаем диалоги…', uk: 'Завантажуємо діалоги…', en: 'Loading dialogues…', es: 'Cargando diálogos…', 'pt-BR': 'Carregando diálogos…', vi: 'Đang tải hội thoại…', id: 'Memuat dialog…', tr: 'Diyaloglar yükleniyor…', pl: 'Ładujemy dialogi…', fr: 'Chargement des dialogues…', de: 'Dialoge werden geladen…' }),
    unavailable: triLang(lang, { ru: 'Диалоги недоступны', uk: 'Діалоги недоступні', en: 'Dialogues are unavailable', es: 'Los diálogos no están disponibles', 'pt-BR': 'Diálogos indisponíveis', vi: 'Hội thoại không khả dụng', id: 'Dialog tidak tersedia', tr: 'Diyaloglar kullanılamıyor', pl: 'Dialogi są niedostępne', fr: 'Les dialogues sont indisponibles', de: 'Dialoge sind nicht verfügbar' }),
  });
}

async function secureTurnId(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(18);
  return `d2t_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

function SessionContent() {
  const params = useLocalSearchParams<{ scenarioId?: string | string[] }>();
  const router = useRouter();
  const { studyTarget } = useStudyTarget();
  const localCoinRank = useMyCoinRank();
  const { lang } = useLang();
  const glass = useDialogueGlass();
  const labels = useMemo(() => labelsFor(lang), [lang]);
  const scenarioId = validScenarioId(params.scenarioId) ? params.scenarioId : null;
  const [state, setState] = useState<SessionState>({ kind: 'loading' });
  const [messages, setMessages] = useState<readonly DialogueV2SessionMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [turnUnavailable, setTurnUnavailable] = useState(false);
  const [serverSession, setServerSession] = useState<Readonly<{ sessionId: string; expiresAtMs: number }> | null>(null);
  const [serverSessionState, setServerSessionState] = useState<ServerSessionState>('idle');
  const pendingTurnRef = useRef<Readonly<{ turnId: string; userMessage: string }> | null>(null);
  const turnStartingRef = useRef(false);

  useEffect(() => {
    if (!scenarioId || !supportedTarget(studyTarget)) {
      setState({ kind: 'unavailable' });
      return undefined;
    }
    let active = true;
    setMessages([]);
    setDraft('');
    setTurnUnavailable(false);
    setServerSession(null);
    setServerSessionState('idle');
    pendingTurnRef.current = null;
    setState({ kind: 'loading' });
    void fetchReleasedDialogueV2Catalogue(studyTarget).then((envelope) => {
      if (!active) return;
      setState(envelope ? { kind: 'available', envelope } : { kind: 'unavailable' });
    }).catch(() => {
      if (active) setState({ kind: 'unavailable' });
    });
    return () => { active = false; };
  }, [scenarioId, studyTarget]);

  const model: DialogueV2BriefingModel | null = useMemo(() => {
    if (state.kind !== 'available' || !scenarioId || !supportedTarget(studyTarget)) return null;
    return buildDialogueV2BriefingModel({
      packets: state.envelope.packets,
      studyTarget,
      scenarioId,
      localCoinRank,
    });
  }, [localCoinRank, scenarioId, state, studyTarget]);

  const voice = useDialogueV2VoiceMessage({
    studyTarget: supportedTarget(studyTarget) ? studyTarget : 'en',
    promptText: model?.title ?? '',
    disabled: sending || !model?.unlocked,
    onTranscript: setDraft,
  });
  const preparedBotVoiceAssets = useMemo(() => messages.flatMap((message) => (
    message.author === 'persona' && message.preparedBotVoice
      ? [Object.freeze({ messageId: message.id, localUri: message.preparedBotVoice.localUri })]
      : []
  )), [messages]);
  const preparedBotVoice = useDialogueV2PreparedBotVoicePlayback({
    assets: preparedBotVoiceAssets,
  });

  useEffect(() => {
    if (!model?.unlocked || !scenarioId || !supportedTarget(studyTarget)) return undefined;
    let active = true;
    setServerSession(null);
    setServerSessionState('starting');
    void startDialogueV2TextSession({ studyTarget, scenarioId }).then((started) => {
      if (!active) return;
      if (!started) {
        setServerSessionState('unavailable');
        return;
      }
      setServerSession(started);
      setServerSessionState('ready');
    }).catch(() => {
      if (active) setServerSessionState('unavailable');
    });
    return () => { active = false; };
  }, [model, scenarioId, studyTarget]);

  const runPendingTurn = async (pending: Readonly<{ turnId: string; userMessage: string }>) => {
    if (!serverSession || !scenarioId || !supportedTarget(studyTarget)) return;
    setSending(true);
    try {
      const result = await sendDialogueV2TextTurn({
        sessionId: serverSession.sessionId,
        turnId: pending.turnId,
        studyTarget,
        scenarioId,
        userMessage: pending.userMessage,
      });
      if (!result) throw new Error('turn_unavailable');
      if (result.kind === 'reply') {
        const names = new Map(model?.participants.map((participant) => [participant.id, participant.displayName]));
        const selectedIndex = result.preparedBotVoiceSelection?.replyIndex;
        const selectedReply = selectedIndex === undefined ? undefined : result.replies[selectedIndex];
        const resolvedPreparedBotVoice = result.preparedBotVoiceSelection
          && selectedIndex !== undefined
          && selectedReply
          ? await resolveCurrentDialogueV2PreparedBotVoice({
            nowMs: Date.now(),
            serverSelection: result.preparedBotVoiceSelection,
            response: {
              sessionId: serverSession.sessionId,
              turnId: pending.turnId,
              replyIndex: selectedIndex,
              studyTarget,
              scenarioId,
              personaId: selectedReply.personaId,
              text: selectedReply.text,
            },
          }).catch(() => null)
          : null;
        setMessages((current) => Object.freeze([...current, ...result.replies.map((reply, index) => Object.freeze({
          id: `persona_${current.length + index + 1}`,
          author: 'persona' as const,
          authorLabel: names.get(reply.personaId),
          text: reply.text,
          ...(resolvedPreparedBotVoice && index === selectedIndex
            ? { preparedBotVoice: resolvedPreparedBotVoice }
            : {}),
        }))]));
      }
      pendingTurnRef.current = null;
    } catch {
      setTurnUnavailable(true);
    } finally {
      setSending(false);
      turnStartingRef.current = false;
    }
  };

  const send = async () => {
    const userMessage = draft.trim();
    if (!model?.unlocked || !serverSession || !scenarioId || !supportedTarget(studyTarget)
      || sending || turnStartingRef.current || voice.status !== 'idle'
      || userMessage.length < 1 || userMessage.length > 2_000) return;
    turnStartingRef.current = true;
    let pending = pendingTurnRef.current;
    try {
      if (!pending) {
        pending = Object.freeze({ turnId: await secureTurnId(), userMessage });
        pendingTurnRef.current = pending;
        const voiceAttachment = voice.takeVoiceAttachment(userMessage);
        const userId = `learner_${messages.length + 1}`;
        setDraft('');
        setMessages((current) => Object.freeze([...current, Object.freeze({
            id: userId, author: 'learner' as const, text: userMessage,
            ...(voiceAttachment ? { voice: { uri: voiceAttachment.uri } } : {}),
        })]));
      }
      await runPendingTurn(pending);
    } catch {
      setTurnUnavailable(true);
      turnStartingRef.current = false;
    }
  };

  const retry = () => {
    const pending = pendingTurnRef.current;
    if (!pending || !serverSession || sending || turnStartingRef.current) return;
    turnStartingRef.current = true;
    setTurnUnavailable(false);
    void runPendingTurn(pending);
  };

  if (state.kind === 'loading' || (model?.unlocked === true && serverSessionState !== 'unavailable' && !serverSession)) {
    return (
      <DialogueGlassGate
        glass={glass}
        testID="dialogue-v2-session-loading"
        backLabel={labels.back}
        onBack={() => router.back()}
        loading
        title={labels.loading}
      />
    );
  }
  if (!model || !model.unlocked || serverSessionState === 'unavailable' || !serverSession) {
    // зачем: ранний выход без лога делал «недоступно» немым (правило «сперва логи»).
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[DIALOG-V2-SESSION] unavailable', {
        scenarioId,
        stateKind: state.kind,
        hasModel: !!model,
        unlocked: model?.unlocked ?? null,
        serverSessionState,
      });
    }
    return (
      <DialogueGlassGate
        glass={glass}
        testID="dialogue-v2-session-unavailable"
        backLabel={labels.back}
        onBack={() => router.back()}
        icon="cloud-offline-outline"
        title={labels.unavailable}
        action={{ label: labels.back, onPress: () => router.back() }}
      />
    );
  }
  return (
    <DialogueV2SessionScreen
      title={model.title}
      messages={messages}
      draft={draft}
      sending={sending}
      voiceStatus={voice.status}
      voiceDraft={voice.voiceDraft}
      playingVoiceUri={voice.playingVoiceUri}
      playingPreparedBotVoiceMessageId={preparedBotVoice.playingMessageId}
      interfaceLang={lang}
      labels={labels}
      objectives={model.objectives}
      turnError={turnUnavailable}
      retryDisabled={sending || !pendingTurnRef.current}
      onRetry={retry}
      onBack={() => router.back()}
      onChangeDraft={setDraft}
      onSend={() => { void send(); }}
      onStartVoice={voice.start}
      onStopVoice={voice.stop}
      onDiscardVoice={voice.discard}
      onPlayVoice={voice.play}
      onPlayPreparedBotVoice={preparedBotVoice.play}
      onComplete={() => router.replace({
        pathname: '/dialogue_v2_completion' as never,
        params: { sessionId: serverSession.sessionId, scenarioId },
      })}
    />
  );
}

/** V2 text session remains behind the established, neutral AI-dialogue consent gate. */
export default function DialogueV2SessionRoute() {
  return (
    <AiDialogConsentGate>
      <SessionContent />
    </AiDialogConsentGate>
  );
}
