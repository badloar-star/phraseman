import { useEnergy } from '../components/EnergyContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { actionToastTri, emitAppEvent } from './events';
import * as Crypto from 'expo-crypto';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking } from 'react-native';

import AiDialogConsentGate from './ai_dialog_consent_gate';
import { buildDialogueV2BriefingModel, type DialogueV2BriefingModel } from './dialogue_v2_briefing_model';
import {
  fetchReleasedDialogueV2Catalogue,
  peekDialogueV2Catalogue,
  type DialogueV2CatalogueReleaseEnvelope,
  type DialogueV2CatalogueStudyTarget,
} from './dialogue_v2_catalogue_client';
import { startDialogueV2TextSession } from './dialogue_v2_turn_client';
import {
  DialogueV2TurnFailureError,
  sendDialogueV2CoachedTextTurn,
  type DialogueV2CoachedTurnResponse,
  type DialogueV2TurnFailureReason,
} from './dialogue_v2_turn_coaching_client';
import { dialogueV2SessionCoachingLabels } from './dialogue_v2_session_coaching_labels';
import { rememberDialogueV2SessionOutcome } from './dialogue_v2_session_outcome_store';
import { markDialogueV2Done } from './dialogue_v2_done_store';
import { resolveCurrentDialogueV2PreparedBotVoice } from './dialogue_v2_prepared_bot_voice_runtime';
import { triLang } from '../constants/i18n';
import { useMyCoinRank } from '../hooks/use_my_coin_rank';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { usePremium } from '../components/PremiumContext';
import { dialogueMoodLabel } from '../components/dialogs/glass/DialogueGlassSessionParts';
import {
  DIALOGUE_V2_FREE_MONTHLY_REPLIES,
  useDialogueV2SessionCoaching,
} from '../hooks/use_dialogue_v2_session_coaching';
import { DialogueGlassGate, useDialogueGlass } from '../components/dialogs/glass/DialogueGlassKit';
import { useDialogueV2VoiceMessage } from '../hooks/use_dialogue_v2_voice_message';
import { speechUnavailableOnDeviceText } from './speech_device_availability';
import { useDialogueV2PreparedBotVoicePlayback } from '../hooks/use_dialogue_v2_prepared_bot_voice_playback';
import {
  DialogueV2SessionScreen,
  type DialogueV2SessionBottom,
  type DialogueV2SessionMessage,
} from '../components/dialogs/DialogueV2SessionScreen';
import { safeRouterBack } from './navigation_back';

const V2_TARGETS = new Set(['en', 'es', 'fr', 'de']);
const INTERFACE_LANGS = new Set(['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl', 'fr', 'de']);
const RATE_LIMIT_COOLDOWN_MS = 12_000;

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
    you: triLang(lang, { ru: 'Ты', uk: 'Ти', en: 'You', es: 'Tú', 'pt-BR': 'Você', vi: 'Bạn', id: 'Kamu', tr: 'Sen', pl: 'Ty', fr: 'Toi', de: 'Du' }),
    voiceIdle: triLang(lang, { ru: 'Или зажми и говори', uk: 'Або затисни й говори', en: 'Or hold and speak', es: 'O mantén y habla', 'pt-BR': 'Ou segure e fale', vi: 'Hoặc giữ và nói', id: 'Atau tahan dan bicara', tr: 'Ya da basılı tut ve konuş', pl: 'Albo przytrzymaj i mów', fr: 'Ou maintiens et parle', de: 'Oder halten und sprechen' }),
    voiceStarting: triLang(lang, { ru: 'Готовлю микрофон… удерживай кнопку', uk: 'Готую мікрофон… утримуй кнопку', en: 'Getting the mic ready… keep holding', es: 'Preparando el micrófono… mantén pulsado', 'pt-BR': 'Preparando o microfone… continue segurando', vi: 'Đang chuẩn bị micro… giữ nút', id: 'Menyiapkan mikrofon… tetap tahan', tr: 'Mikrofon hazırlanıyor… basılı tut', pl: 'Przygotowuję mikrofon… trzymaj', fr: 'Préparation du micro… maintiens', de: 'Mikro wird vorbereitet… gedrückt halten' }),
    voiceRecording: triLang(lang, { ru: 'Говори… отпусти, когда закончишь', uk: 'Говори… відпусти, коли закінчиш', en: 'Speak… release when done', es: 'Habla… suelta al terminar', 'pt-BR': 'Fale… solte ao terminar', vi: 'Hãy nói… thả ra khi xong', id: 'Bicara… lepaskan jika selesai', tr: 'Konuş… bitince bırak', pl: 'Mów… puść, gdy skończysz', fr: 'Parle… relâche à la fin', de: 'Sprich… loslassen, wenn fertig' }),
    discardVoice: triLang(lang, { ru: 'Удалить запись', uk: 'Видалити запис', en: 'Discard recording', es: 'Descartar grabación', 'pt-BR': 'Descartar gravação', vi: 'Bỏ bản ghi', id: 'Buang rekaman', tr: 'Kaydı sil', pl: 'Odrzuć nagranie', fr: 'Supprimer l’enregistrement', de: 'Aufnahme verwerfen' }),
    turnError: triLang(lang, { ru: 'Сейчас недоступно. Попробуй ещё раз.', uk: 'Зараз недоступно. Спробуй ще раз.', en: 'Unavailable right now. Try again.', es: 'No disponible ahora. Inténtalo de nuevo.', 'pt-BR': 'Indisponível agora. Tente de novo.', vi: 'Hiện không khả dụng. Hãy thử lại.', id: 'Belum tersedia. Coba lagi.', tr: 'Şu an kullanılamıyor. Tekrar dene.', pl: 'Teraz niedostępne. Spróbuj ponownie.', fr: 'Indisponible pour le moment. Réessaie.', de: 'Gerade nicht verfügbar. Versuch es erneut.' }),
    // зачем (D123): у Plus на экране «безлимит»; тихий серверный потолок говорит спокойно, без слова «лимит».
    plusDailyCap: triLang(lang, { ru: 'На сегодня разговоров достаточно. Продолжим завтра.', uk: 'На сьогодні розмов досить. Продовжимо завтра.', en: "That's enough talking for today. Let's continue tomorrow.", es: 'Por hoy ya hemos hablado bastante. Seguimos mañana.', 'pt-BR': 'Por hoje já conversamos bastante. Continuamos amanhã.', vi: 'Hôm nay trò chuyện vậy là đủ rồi. Mai mình nói tiếp nhé.', id: 'Untuk hari ini sudah cukup mengobrol. Kita lanjut besok.', tr: 'Bugünlük bu kadar sohbet yeter. Yarın devam ederiz.', pl: 'Na dziś wystarczy rozmów. Kontynuujemy jutro.', fr: 'Assez discuté pour aujourd’hui. On continue demain.', de: 'Für heute ist genug geredet. Morgen geht es weiter.' }),
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

/**
 * После возврата энергии чат не открываем: назад на исходный брифинг (сессия с energyOp всегда открыта поверх него),
 * где старт снова спишет энергию. зачем (повторное ревью 12.10): replace давал «брифинг → брифинг» в стеке.
 */
function RestartFromBriefing() {
  const router = useRouter();
  const params = useLocalSearchParams<{ scenarioId?: string | string[] }>();
  useEffect(() => {
    const scenarioId = typeof params.scenarioId === 'string' ? params.scenarioId : null;
    console.warn('[AI-CONSENT-ENERGY] session:energy already returned → back to briefing', JSON.stringify({ scenarioId }));
    safeRouterBack(router, '/ai_dialog_home' as never);
  }, [params.scenarioId, router]);
  return null;
}

function interfaceLangFor(lang: string): string {
  return INTERFACE_LANGS.has(lang) ? lang : 'en';
}

type TurnFailureView = Readonly<{ reason: DialogueV2TurnFailureReason }>;

function SessionContent() {
  const params = useLocalSearchParams<{ scenarioId?: string | string[]; energyOp?: string | string[] }>();
  const router = useRouter();
  const { studyTarget } = useStudyTarget();
  const localCoinRank = useMyCoinRank();
  const { lang } = useLang();
  const { accessResolved, hasPremiumAccess } = usePremium();
  const glass = useDialogueGlass();
  const labels = useMemo(() => labelsFor(lang), [lang]);
  const coachingLabels = useMemo(() => dialogueV2SessionCoachingLabels(lang), [lang]);
  const scenarioId = validScenarioId(params.scenarioId) ? params.scenarioId : null;
  // зачем (владелец 01.10: «диалоги должны открываться без загрузок»): первый кадр — каталог
  // с телефона (кэш → встроенный снимок) синхронно; сеть обновляет фоном.
  const localSessionState = (target: unknown): SessionState => {
    if (!supportedTarget(target)) return { kind: 'unavailable' };
    const envelope = peekDialogueV2Catalogue(target);
    return envelope ? { kind: 'available', envelope } : { kind: 'loading' };
  };
  const [state, setState] = useState<SessionState>(() => localSessionState(studyTarget));
  const [startAttempt, setStartAttempt] = useState(0);
  const [messages, setMessages] = useState<readonly DialogueV2SessionMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [turnFailure, setTurnFailure] = useState<TurnFailureView | null>(null);
  const [rateLimitCooling, setRateLimitCooling] = useState(false);
  const [paused, setPaused] = useState(false);
  const [serverSession, setServerSession] = useState<Readonly<{ sessionId: string; expiresAtMs: number }> | null>(null);
  const [serverSessionState, setServerSessionState] = useState<ServerSessionState>('idle');
  const pendingTurnRef = useRef<Readonly<{ turnId: string; userMessage: string; learnerId: string }> | null>(null);
  // зачем (баг 01.10, D87): энергия за диалог закрепляется после первого ответа собеседника;
  // отказ сервиса на первом ходе — энергия возвращается. Одно решение на сессию.
  const energyOpRef = useRef<string | null>(typeof params.energyOp === 'string' ? params.energyOp : null);
  const energyActionsRef = useRef<Readonly<{
    acknowledge: (operationId: string) => Promise<boolean>;
    refund: (operationId: string, reason: string) => Promise<void>;
  }> | null>(null);
  const settleEnergy = (outcome: 'acknowledge' | 'refund', reason: string) => {
    const operationId = energyOpRef.current;
    const actions = energyActionsRef.current;
    if (!operationId || !actions) return;
    energyOpRef.current = null;
    console.log('[DIALOGUE-V2] energy:settle', { outcome, reason, operationId, scenarioId: params.scenarioId });
    const work = outcome === 'acknowledge'
      ? actions.acknowledge(operationId).then(() => undefined)
      : actions.refund(operationId, reason).then(() => {
        emitAppEvent('action_toast', actionToastTri('info', {
          ru: 'Энергия возвращена', uk: 'Енергію повернено', en: 'Energy returned', es: 'Energía devuelta',
          'pt-BR': 'Energia devolvida', vi: 'Đã hoàn lại năng lượng', id: 'Energi dikembalikan',
          tr: 'Enerji iade edildi', pl: 'Energia zwrócona',
        }));
      });
    work.catch((error: unknown) => {
      console.warn('[DIALOGUE-V2] energy:settle failed', { outcome, reason, message: error instanceof Error ? error.message : String(error) });
    });
  };
  const turnStartingRef = useRef(false);
  // зачем: Free-лимиты включаются только когда доступ точно известен как Free — Plus не должен
  // увидеть стену или счётчик из-за медленной проверки подписки.
  const freeTier = accessResolved && !hasPremiumAccess;
  const coaching = useDialogueV2SessionCoaching({
    studyTarget: supportedTarget(studyTarget) ? studyTarget : null,
    sessionId: serverSession?.sessionId ?? null,
    freeTier,
  });

  useEffect(() => {
    if (!scenarioId || !supportedTarget(studyTarget)) {
      console.warn('[DIALOGUE-V2] session:load → invalid route data', { scenarioId, studyTarget });
      setState({ kind: 'unavailable' });
      return undefined;
    }
    let active = true;
    setMessages([]);
    setDraft('');
    setTurnFailure(null);
    setServerSession(null);
    setServerSessionState('idle');
    pendingTurnRef.current = null;
    setState((previous) => (previous.kind === 'available' ? previous : localSessionState(studyTarget)));
    void fetchReleasedDialogueV2Catalogue(studyTarget).then((envelope) => {
      if (!active) return;
      if (!envelope) {
        // Остаёмся на локальном каталоге — никакого экрана «недоступно».
        console.warn('[DIALOGUE-V2] session:load → network catalogue empty, keep local', { scenarioId, studyTarget });
        return;
      }
      setState((previous) => (previous.kind === 'available' && previous.envelope === envelope ? previous : { kind: 'available', envelope }));
    }).catch((error: unknown) => {
      console.warn('[DIALOGUE-V2] session:load → catalogue failed, keep local', error instanceof Error ? error.message : String(error));
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
      // зачем (владелец 01.10): служебный текст сцены — на языке интерфейса.
      uiLang: lang,
    });
  }, [lang, localCoinRank, scenarioId, state, studyTarget]);

  // Первая реплика персонажа — сразу в ленте, до любого хода пользователя.
  useEffect(() => {
    if (!model?.opening) return;
    const opening = model.opening;
    setMessages((current) => {
      if (current.length > 0) return current;
      const author = model.participants.find((participant) => participant.id === opening.personaId);
      console.log('[DIALOGUE-V2] session:opening → shown', { scenarioId, personaId: opening.personaId });
      return Object.freeze([Object.freeze({
        id: 'persona_0', author: 'persona' as const, authorLabel: author?.displayName ?? '', text: opening.text,
      })]);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model?.opening]);

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
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRetry = () => {
      // зачем (владелец 01.10): без экрана «недоступно» — тихий повтор старта в фоне (до 5 раз).
      if (startAttempt >= 5) { setServerSessionState('unavailable'); return; }
      retryTimer = setTimeout(() => setStartAttempt((value) => value + 1), 4_000);
    };
    if (startAttempt === 0) setServerSession(null);
    setServerSessionState('starting');
    void startDialogueV2TextSession({ studyTarget, scenarioId }).then((started) => {
      if (!active) return;
      if (!started) {
        console.warn('[DIALOGUE-V2] session:start → server returned no session, silent retry', { scenarioId, attempt: startAttempt });
        scheduleRetry();
        return;
      }
      setServerSession(started);
      setServerSessionState('ready');
    }).catch((error: unknown) => {
      console.warn('[DIALOGUE-V2] session:start → failed, silent retry', { attempt: startAttempt, error: error instanceof Error ? error.message : String(error) });
      if (active) scheduleRetry();
    });
    return () => { active = false; if (retryTimer) clearTimeout(retryTimer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model?.unlocked, scenarioId, studyTarget, startAttempt]);

  // Ход, отправленный до готовности сессии, уходит сам, как только сервер ответил (мягкое «отправка…»).
  useEffect(() => {
    const pending = pendingTurnRef.current;
    if (!serverSession || !pending || sending) return;
    console.log('[DIALOGUE-V2] turn:flush → session ready, sending queued turn', { scenarioId });
    void runPendingTurn(pending);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverSession]);

  // зачем (C19): «слишком много сообщений» — без «Повторить», пока не остынет; потом повтор можно.
  useEffect(() => {
    if (!rateLimitCooling) return undefined;
    const timer = setTimeout(() => setRateLimitCooling(false), RATE_LIMIT_COOLDOWN_MS);
    return () => clearTimeout(timer);
  }, [rateLimitCooling]);

  const appendReplies = async (
    result: Extract<DialogueV2CoachedTurnResponse, { kind: 'reply' }>,
    pending: Readonly<{ turnId: string; learnerId: string }>,
    session: Readonly<{ sessionId: string }>,
    target: DialogueV2CatalogueStudyTarget,
    scenario: string,
  ) => {
    const names = new Map(model?.participants.map((participant) => [participant.id, participant.displayName]));
    const selection = result.preparedBotVoiceSelection;
    const selectedIndex = selection?.replyIndex;
    const selectedReply = selectedIndex === undefined ? undefined : result.replies[selectedIndex];
    const resolvedPreparedBotVoice = selection && selectedIndex !== undefined && selectedReply
      ? await resolveCurrentDialogueV2PreparedBotVoice({
        nowMs: Date.now(),
        serverSelection: selection,
        response: {
          sessionId: session.sessionId,
          turnId: pending.turnId,
          replyIndex: selectedIndex,
          studyTarget: target,
          scenarioId: scenario,
          personaId: selectedReply.personaId,
          text: selectedReply.text,
        },
      }).catch((error: unknown) => {
        console.warn('[DIALOGUE-V2] turn:voice → prepared voice unavailable', error instanceof Error ? error.message : String(error));
        return null;
      })
      : null;
    const coached = result.coaching;
    setMessages((current) => Object.freeze([
      ...current.map((message) => (
        message.id === pending.learnerId && message.author === 'learner' && coached?.betterPhrasing
          ? Object.freeze({ ...message, betterPhrasing: coached.betterPhrasing })
          : message
      )),
      ...result.replies.map((reply, index) => Object.freeze({
        id: `persona_${current.length + index + 1}`,
        author: 'persona' as const,
        authorLabel: names.get(reply.personaId),
        text: reply.text,
        ...(coached?.replyTranslations?.[index] ? { translation: coached.replyTranslations[index] } : {}),
        ...(coached?.replyExplanations?.[index] ? { explanation: coached.replyExplanations[index] } : {}),
        ...(resolvedPreparedBotVoice && index === selectedIndex
          ? { preparedBotVoice: resolvedPreparedBotVoice }
          : {}),
      })),
    ]));
    coaching.applyCoaching(coached);
    coaching.applyQuota(result.quota, pending.turnId);
  };

  const runPendingTurn = async (pending: Readonly<{ turnId: string; userMessage: string; learnerId: string }>) => {
    if (!serverSession || !scenarioId || !supportedTarget(studyTarget)) {
      setSending(false);
      console.warn('[DIALOGUE-V2] turn:run → skipped, session not ready', { hasSession: !!serverSession, scenarioId });
      return;
    }
    setSending(true);
    // зачем (E3, координатор 12.10): пилюля «N/30» уменьшается в момент отправки; повтор того же хода её не трогает.
    coaching.beginQuotaTurn(pending.turnId);
    try {
      const result = await sendDialogueV2CoachedTextTurn({
        sessionId: serverSession.sessionId,
        turnId: pending.turnId,
        studyTarget,
        scenarioId,
        userMessage: pending.userMessage,
        interfaceLang: interfaceLangFor(lang),
      });
      if (result.kind === 'reply') {
        await appendReplies(result, pending, serverSession, studyTarget, scenarioId);
      } else {
        // зачем (E3): ход отвечен без реплик — снимаем его из «в полёте», остаток прежний.
        coaching.applyQuota(null, pending.turnId);
      }
      pendingTurnRef.current = null;
      settleEnergy('acknowledge', 'first_turn_ok');
    } catch (error: unknown) {
      const reason: DialogueV2TurnFailureReason = error instanceof DialogueV2TurnFailureError ? error.reason : 'network';
      console.warn('[DIALOGUE-V2] turn:run → failed', { reason, scenarioId });
      if (reason === 'quota_exhausted') {
        // зачем (Сверка 05.10: реплика молча пропадала): пузырь ученика ОСТАЁТСЯ — человек видит, что написал, а
        // ниже сразу встаёт экран лимита с понятным выходом (Plus / подождать). Раньше пузырь удалялся, а экран
        // лимита у телефона, считавшего себя Plus, не показывался вовсе — ни ошибки, ни реплики.
        console.warn('[DIALOGUE-V2] turn:quota_exhausted → bubble kept, limit wall shown', {
          scenarioId, learnerId: pending.learnerId, freeTier,
        });
        pendingTurnRef.current = null;
        // зачем (Ядро, dialogs-035): сервер реплику не принял — помечаем пузырь, а не оставляем его похожим на отправленный.
        setMessages((current) => Object.freeze(current.map((message) => (
          message.id === pending.learnerId && message.author === 'learner' ? Object.freeze({ ...message, unsent: true }) : message
        ))));
        coaching.markExhausted(error instanceof DialogueV2TurnFailureError ? error.quotaObservation : null, pending.turnId);
      } else if (reason === 'paused') {
        coaching.rollbackQuotaTurn(pending.turnId, reason);
        setPaused(true);
      } else {
        // зачем (E3): сбой хода — откат пилюли; понятное сообщение — панель ошибки с «Повторить» ниже (retry снова спишет).
        coaching.rollbackQuotaTurn(pending.turnId, reason);
        if (reason === 'rate_limited') setRateLimitCooling(true);
        // Сервис не ответил ещё ни разу — диалог не состоялся, энергию возвращаем.
        if (reason === 'service') settleEnergy('refund', 'dialogue_first_turn_service_failed');
        setTurnFailure(Object.freeze({ reason }));
      }
    } finally {
      setSending(false);
      turnStartingRef.current = false;
    }
  };

  const send = async () => {
    const userMessage = draft.trim();
    if (!model?.unlocked || !scenarioId || !supportedTarget(studyTarget)
      || sending || turnStartingRef.current || voice.status !== 'idle'
      || coaching.quotaExhausted || coaching.ended
      || userMessage.length < 1 || userMessage.length > 2_000) return;
    turnStartingRef.current = true;
    let pending = pendingTurnRef.current;
    try {
      if (!pending) {
        const learnerId = `learner_${messages.length + 1}`;
        pending = Object.freeze({ turnId: await secureTurnId(), userMessage, learnerId });
        pendingTurnRef.current = pending;
        const voiceAttachment = voice.takeVoiceAttachment(userMessage);
        setDraft('');
        voice.clearFailure?.();
        setMessages((current) => Object.freeze([...current, Object.freeze({
          id: learnerId, author: 'learner' as const, text: userMessage,
          ...(voiceAttachment ? { voice: { uri: voiceAttachment.uri } } : {}),
        })]));
      }
      if (!serverSession) {
        // Сессия ещё стартует — пузырь уже на экране, ход уйдёт эффектом выше.
        console.log('[DIALOGUE-V2] turn:send → queued until session ready', { scenarioId });
        setSending(true);
        turnStartingRef.current = false;
        return;
      }
      await runPendingTurn(pending);
    } catch (error: unknown) {
      console.warn('[DIALOGUE-V2] turn:send → failed before transport', error instanceof Error ? error.message : String(error));
      setTurnFailure(Object.freeze({ reason: 'network' }));
      turnStartingRef.current = false;
    }
  };

  const retry = () => {
    const pending = pendingTurnRef.current;
    if (!pending || !serverSession || sending || turnStartingRef.current) {
      console.warn('[DIALOGUE-V2] turn:retry → ignored', { hasPending: !!pending, sending });
      return;
    }
    turnStartingRef.current = true;
    setTurnFailure(null);
    void runPendingTurn(pending);
  };

  const openSummary = (endedBy: 'bot' | 'manual' | 'limit') => {
    if (!serverSession || !scenarioId) {
      console.warn('[DIALOGUE-V2] summary:open → no session', { scenarioId });
      return;
    }
    const learnerMessages = messages.filter((message) => message.author === 'learner');
    const learnerTurns = learnerMessages.length;
    // зачем (D1–D5): цифры итога из разбора каждого хода, а не из одной заметки ревью.
    rememberDialogueV2SessionOutcome(serverSession.sessionId, {
      learnerTurns,
      corrections: learnerMessages.flatMap((message) => (
        message.author === 'learner' && message.betterPhrasing
          ? [{ original: message.text, corrected: message.betterPhrasing }]
          : []
      )),
    });
    // зачем (координатор 12.10, dialogs-003): «пройден» = диалог закончил собеседник (на экране итога это «Диалог пройден») и ученик сказал хотя бы одну реплику;
    // отметка мгновенная (память + хаб в тот же кадр), диск догоняет фоном. Остановка вручную или по лимиту прохождением не считается.
    if (endedBy === 'bot' && learnerTurns > 0 && supportedTarget(studyTarget)) {
      markDialogueV2Done(studyTarget, scenarioId);
    } else {
      console.log(`[DIALOG-DONE] summary → не засчитан scenarioId=${scenarioId} endedBy=${endedBy} learnerTurns=${learnerTurns} studyTarget=${String(studyTarget)}`); // guard-ok: ветвление называет причину
    }
    const route = {
      pathname: '/dialogue_v2_completion' as never,
      params: {
        sessionId: serverSession.sessionId,
        scenarioId,
        endedBy,
        learnerTurns: String(learnerTurns),
        // зачем (D1–D5): название сцены под заголовком итога без второго запроса каталога.
        ...(model?.title ? { title: model.title } : {}),
        ...(coaching.mood ? { mood: coaching.mood } : {}),
      },
    };
    if (endedBy === 'manual') {
      router.replace(route);
      return;
    }
    // зачем (C24/C38): к итогу — поверх переписки; «назад» с итога вернёт ленту с пилюлей «Итоги».
    coaching.markSummarySeen();
    router.push(route);
  };

  // зачем (владелец 30.09, макет B6): энергия как в уроке — пилюля в шапке, у Plus её нет.
  const { isUnlimited: energyUnlimited, acknowledgeSessionStart, refundActivityStart } = useEnergy();
  energyActionsRef.current = { acknowledge: acknowledgeSessionStart, refund: refundActivityStart };
  if (paused) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[DIALOGUE-V2] session:render → paused gate', { scenarioId });
    return (
      <DialogueGlassGate
        glass={glass}
        testID="dialogue-v2-session-paused"
        backLabel={labels.back}
        onBack={() => safeRouterBack(router, '/ai_dialog_home' as never)}
        icon="cloud-offline-outline"
        title={coachingLabels.pausedTitle}
        message={coachingLabels.pausedMessage}
        action={{ label: labels.back, onPress: () => safeRouterBack(router, '/ai_dialog_home' as never) }}
      />
    );
  }
  // зачем (владелец 01.10): экран диалога появляется сразу; «загрузка» только если на телефоне
  // нет даже встроенного каталога (поломка сборки).
  if (state.kind === 'loading') {
    return (
      <DialogueGlassGate
        glass={glass}
        testID="dialogue-v2-session-loading"
        backLabel={labels.back}
        onBack={() => safeRouterBack(router, '/ai_dialog_home' as never)}
        loading
        title={labels.loading}
      />
    );
  }
  if (!model || !model.unlocked) {
    // зачем: ранний выход без лога делал «недоступно» немым (правило «сперва логи»).
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[DIALOGUE-V2] session:render → unavailable gate', {
      scenarioId,
      stateKind: state.kind,
      hasModel: !!model,
      unlocked: model?.unlocked ?? null,
      serverSessionState,
    });
    return (
      <DialogueGlassGate
        glass={glass}
        testID="dialogue-v2-session-unavailable"
        backLabel={labels.back}
        onBack={() => safeRouterBack(router, '/ai_dialog_home' as never)}
        icon="cloud-offline-outline"
        title={labels.unavailable}
        action={{ label: labels.back, onPress: () => safeRouterBack(router, '/ai_dialog_home' as never) }}
      />
    );
  }

  const objectiveIndex = coaching.activeObjectiveId
    ? Math.max(0, model.objectives.findIndex((objective) => objective.id === coaching.activeObjectiveId))
    : 0;
  const currentObjective = model.objectives[objectiveIndex] ?? null;
  const whyMessage = coaching.whyMessageId
    ? messages.find((message) => message.id === coaching.whyMessageId && message.author === 'persona')
    : undefined;
  const failureReason = turnFailure?.reason ?? null;
  const turnErrorMessage = failureReason === 'service'
    ? coachingLabels.serviceError
    : failureReason === 'rate_limited'
      ? coachingLabels.rateLimited
      : failureReason === 'plus_daily_cap' ? labels.plusDailyCap : labels.turnError;
  const bottom: DialogueV2SessionBottom = coaching.ended
    ? (coaching.summarySeen ? 'summary' : 'ended')
    : coaching.quotaExhausted ? 'wall' : 'input';
  const voiceFailure = voice.failure === 'not_heard'
    ? { text: coachingLabels.voiceNotHeard, actionLabel: labels.retry, onAction: voice.clearFailure }
    : voice.failure === 'permission_denied'
      ? {
        text: coachingLabels.voiceDenied,
        actionLabel: coachingLabels.openSettings,
        onAction: () => {
          Linking.openSettings().catch((error: unknown) => {
            console.warn('[DIALOGUE-V2] voice:settings → open failed', error instanceof Error ? error.message : String(error));
          });
        },
      }
      // зачем (§SPEECH-NA; кадр «Голосовой ввод недоступен» dialogs-gaps-states): на устройстве без распознавателя понятный текст виден СРАЗУ,
      // а не только после тапа по микрофону
      : voice.failure === 'unavailable' || voice.unavailableOnDevice
        ? { text: voice.unavailableOnDevice ? speechUnavailableOnDeviceText(lang) : coachingLabels.voiceUnavailable }
        : null;
  const openPlus = () => router.push({
    pathname: '/premium_modal',
    params: { context: 'dialog_limit', source: 'dialogue_v2_session' },
  } as never);

  return (
    <DialogueV2SessionScreen
      title={model.title}
      messages={messages}
      draft={draft}
      sending={sending}
      voiceStatus={voice.status}
      voiceUnavailable={voice.unavailableOnDevice}
      voiceDraft={voice.voiceDraft}
      playingVoiceUri={voice.playingVoiceUri}
      playingPreparedBotVoiceMessageId={preparedBotVoice.playingMessageId}
      interfaceLang={lang}
      labels={labels}
      coachingLabels={coachingLabels}
      objectives={model.objectives}
      showEnergy={!energyUnlimited}
      headerMood={coaching.mood ? { mood: coaching.mood, label: dialogueMoodLabel(lang, coaching.mood) } : null}
      quotaPill={coaching.quotaView ? {
        text: `${coaching.quotaView.remaining}/${coaching.quotaView.total}`,
        accessibilityLabel: coachingLabels.quotaA11y(coaching.quotaView.remaining, coaching.quotaView.total),
      } : null}
      goal={currentObjective ? {
        kicker: coachingLabels.goalKicker(objectiveIndex + 1, model.objectives.length),
        label: currentObjective.label,
      } : null}
      // зачем (dialogs-015/017): подсказка — только из разбора хода; подмена текстом цели дублировала карточку цели.
      hintText={coaching.hint ?? null}
      translatedIds={coaching.translatedIds}
      onToggleTranslation={coaching.toggleTranslation}
      whyTarget={whyMessage && whyMessage.explanation ? {
        messageId: whyMessage.id,
        quote: whyMessage.text,
        note: whyMessage.explanation,
        translation: whyMessage.translation ?? '',
        plusGate: coaching.whyGate,
      } : null}
      onOpenWhy={coaching.openWhy}
      onCloseWhy={coaching.closeWhy}
      fixOpenIds={coaching.fixOpenIds}
      onOpenFix={coaching.openFix}
      bottom={bottom}
      onOpenSummary={() => openSummary(bottom === 'wall' ? 'limit' : 'bot')}
      onOpenPlus={openPlus}
      limitWallMessage={coachingLabels.wallMessage(DIALOGUE_V2_FREE_MONTHLY_REPLIES)}
      voiceFailure={voiceFailure}
      turnError={turnFailure !== null}
      turnErrorMessage={turnErrorMessage}
      /* D123: на потолке Plus повтор сегодня не поможет; C19: при частоте — после остывания. */
      // зачем (кадр «На сегодня разговоров достаточно»): на потолке Plus кнопки «Повторить» нет вовсе, а не блокированной
      retryAvailable={failureReason !== 'plus_daily_cap' && (failureReason !== 'rate_limited' || !rateLimitCooling)}
      retryDisabled={sending || !pendingTurnRef.current || failureReason === 'plus_daily_cap'}
      onRetry={retry}
      onBack={() => safeRouterBack(router, '/ai_dialog_home' as never)}
      onChangeDraft={setDraft}
      onSend={() => { void send(); }}
      onStartVoice={voice.start}
      onStopVoice={voice.stop}
      onDiscardVoice={voice.discard}
      onPlayVoice={voice.play}
      onPlayPreparedBotVoice={preparedBotVoice.play}
      onComplete={() => openSummary('manual')}
    />
  );
}

/** V2 text session remains behind the established, neutral AI-dialogue consent gate. */
export default function DialogueV2SessionRoute() {
  // зачем (находка Макетов d8b078e8e, координатор 12.10): брифинг теперь спрашивает согласие ДО списания энергии,
  // но если сюда всё же пришли со списанной энергией (energyOp) и согласие отклонено — SessionContent не смонтируется
  // и её возврат не сработает; возвращаем здесь, один раз.
  const routeParams = useLocalSearchParams<{ energyOp?: string | string[] }>();
  const { refundActivityStart } = useEnergy();
  const consentRefundDoneRef = useRef(false);
  // зачем (ревью 12.10): энергию вернули, а потом «Включить» на экране отказа — сессия с тем же energyOp прошла бы бесплатно.
  // Вместо чата — обратно на брифинг, где старт снова спишет энергию.
  const [energyReturned, setEnergyReturned] = useState(false);
  const onConsentDeclined = () => {
    const operationId = typeof routeParams.energyOp === 'string' ? routeParams.energyOp : null;
    if (!operationId || consentRefundDoneRef.current) {
      console.log('[AI-CONSENT-ENERGY] session:declined nothing to return', JSON.stringify({ hasOperation: operationId !== null, alreadyReturned: consentRefundDoneRef.current }));
      return;
    }
    consentRefundDoneRef.current = true;
    setEnergyReturned(true);
    console.warn('[AI-CONSENT-ENERGY] session:declined → refund', JSON.stringify({ operationId }));
    void refundActivityStart(operationId, 'ai_consent_declined_in_session').then(() => {
      emitAppEvent('action_toast', actionToastTri('info', {
        ru: 'Энергия возвращена', uk: 'Енергію повернено', en: 'Energy returned', es: 'Energía devuelta',
        'pt-BR': 'Energia devolvida', vi: 'Đã hoàn lại năng lượng', id: 'Energi dikembalikan',
        tr: 'Enerji iade edildi', pl: 'Energia zwrócona',
      }));
    }).catch((error: unknown) => {
      console.warn('[AI-CONSENT-ENERGY] session:refund failed', error instanceof Error ? error.message : String(error));
    });
  };
  return (
    <AiDialogConsentGate onDeclined={onConsentDeclined}>
      {energyReturned ? <RestartFromBriefing /> : <SessionContent />}
    </AiDialogConsentGate>
  );
}
