import { useRouter } from 'expo-router';
import { dialogLimitPaywallParams } from './dialog_first_free_summary';
import NetInfo from '@react-native-community/netinfo';
import * as Crypto from 'expo-crypto';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { dialogueV2FreeformOpening } from './dialogue_v2_freeform_opening';
import { detectDialogueOffLanguage, pickDialogueNotUnderstoodReply } from './dialogue_v2_off_language';
import { DialogueV2FreeformScreen, type DialogueV2FreeformMessage } from '../components/dialogs/DialogueV2FreeformScreen';
import { useLang } from '../components/LangContext';
import { usePremium } from '../components/PremiumContext';
import { useVoiceAttemptGate } from '../hooks/use_voice_attempt_gate';
import { useStudyTarget } from '../components/StudyTargetContext';
import { DialogueGlassGate, useDialogueGlass } from '../components/dialogs/glass/DialogueGlassKit';
import { DialogueHubRedirect } from '../components/dialogs/DialogueHubRedirect';
import { useDialogueV2VoiceMessage } from '../hooks/use_dialogue_v2_voice_message';
import { speechUnavailableOnDeviceText } from './speech_device_availability';
import { triLang } from '../constants/i18n';
import AiDialogConsentGate, { useAiDialogConsentAskAgain } from './ai_dialog_consent_gate';
import { dialogueV2SessionCoachingLabels } from './dialogue_v2_session_coaching_labels';
import { dialogueV2SayHintsForPartnerReply, lastPartnerReplyForHints } from './dialogue_v2_say_hints_pick';
import {
  requestDialogueV2FreeformPreparedBotVoice,
  sendDialogueV2FreeformTurn,
  startDialogueV2FreeformSession,
  DIALOGUE_V2_FREEFORM_START_TIMEOUT_MS,
  DIALOGUE_V2_FREEFORM_TURN_TIMEOUT_MS,
} from './dialogue_v2_freeform_client';

/** Страж «•••»: дольше потолков старта и хода вместе (плюс запас) точки не висят. */
const FREEFORM_DOTS_WATCHDOG_MS = DIALOGUE_V2_FREEFORM_START_TIMEOUT_MS + DIALOGUE_V2_FREEFORM_TURN_TIMEOUT_MS + 6_000;
// зачем: потолок не число (подменённый модуль) — страж не должен срабатывать мгновенно и рушить очередь отправки
const FREEFORM_DOTS_WATCHDOG_SAFE_MS = Number.isFinite(FREEFORM_DOTS_WATCHDOG_MS) && FREEFORM_DOTS_WATCHDOG_MS > 0 ? FREEFORM_DOTS_WATCHDOG_MS : 60_000;

/** Отказ «на сегодня всё» (DialogueV2FreeformUnavailableError.reason) — по полю, без instanceof: модуль клиента подменяют в тестах. */
function isFreeformDailyCap(error: unknown): boolean {
  return (error as { reason?: unknown } | null)?.reason === 'daily_cap';
}
/** Нет связи (DialogueV2FreeformUnavailableError.reason) — макет u31 C18, иначе C19 «сервис недоступен». */
function isFreeformNetworkFailure(error: unknown): boolean {
  return (error as { reason?: unknown } | null)?.reason === 'network';
}
/** Отказ «нет согласия на ИИ» (DialogueV2FreeformUnavailableError.reason) — шлюз снова показывает окно согласия. */
function isFreeformConsentRequired(error: unknown): boolean {
  return (error as { reason?: unknown } | null)?.reason === 'ai_consent_required';
}
/** Сервер не видит Plus (DialogueV2FreeformUnavailableError.reason) — экран Plus, без тихих повторов и «сервис недоступен». */
function isFreeformPlusRequired(error: unknown): boolean {
  return (error as { reason?: unknown } | null)?.reason === 'plus_required';
}
import {
  resolveBundledDialogueV2FreeformPreparedBotVoiceAsset,
} from './dialogue_v2_freeform_prepared_bot_voice_asset_registry';
import {
  resolveCurrentDialogueV2FreeformPreparedBotVoice,
} from './dialogue_v2_freeform_prepared_bot_voice_runtime';
import { parseDialogueV2FreeformSessionTurnShape } from '../shared/dialogue_v2_freeform_session_contract';
import { dialogueV2FreeformTranslateEnabled, requestDialogueV2FreeformTranslation } from './dialogue_v2_freeform_translate_client';
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
    back: triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Volver', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz', fr: 'Retour', de: 'Zurück' }),
    placeholder: triLang(lang, { ru: 'Напиши сообщение…', uk: 'Напиши повідомлення…', en: 'Write a message…', es: 'Escribe un mensaje…', 'pt-BR': 'Escreva uma mensagem…', vi: 'Viết tin nhắn…', id: 'Tulis pesan…', tr: 'Bir mesaj yaz…', pl: 'Napisz wiadomość…', fr: 'Écris un message…', de: 'Schreibe eine Nachricht…' }),
    send: triLang(lang, { ru: 'Отправить', uk: 'Надіслати', en: 'Send', es: 'Enviar', 'pt-BR': 'Enviar', vi: 'Gửi', id: 'Kirim', tr: 'Gönder', pl: 'Wyślij', fr: 'Envoyer', de: 'Senden' }),
    emptyTitle: triLang(lang, { ru: 'Что можно спросить', uk: 'Що можна запитати', en: 'What you can ask', es: 'Qué puedes preguntar', 'pt-BR': 'O que você pode perguntar', vi: 'Bạn có thể hỏi gì', id: 'Yang bisa kamu tanyakan', tr: 'Neler sorabilirsin', pl: 'O co możesz zapytać', fr: 'Ce que tu peux demander', de: 'Was du fragen kannst' }),
    emptyText: triLang(lang, { ru: 'Спроси про фразу или просто поговори. Можно отвечать на изучаемом языке.', uk: 'Запитай про вислів або просто поговори. Можна відповідати мовою, яку вчиш.', en: 'Ask about a phrase or just chat. You can reply in the language you’re learning.', es: 'Pregunta por una frase o simplemente conversa. Puedes responder en el idioma que aprendes.', 'pt-BR': 'Pergunte sobre uma frase ou apenas converse. Você pode responder no idioma que está aprendendo.', vi: 'Hỏi về một cụm từ hoặc chỉ trò chuyện. Bạn có thể trả lời bằng ngôn ngữ đang học.', id: 'Tanyakan tentang frasa atau ngobrol saja. Kamu bisa menjawab dalam bahasa yang kamu pelajari.', tr: 'Bir ifadeyi sor ya da sadece sohbet et. Öğrendiğin dilde cevap verebilirsin.', pl: 'Zapytaj o frazę albo po prostu porozmawiaj. Możesz odpowiadać w języku, którego się uczysz.', fr: 'Demande une expression ou discute simplement. Tu peux répondre dans la langue que tu apprends.', de: 'Frag nach einer Wendung oder plaudere einfach. Du kannst in der Lernsprache antworten.' }),
    voiceIdle: triLang(lang, { ru: 'Зажми и говори', uk: 'Затисни й говори', en: 'Hold and speak', es: 'Mantén y habla', 'pt-BR': 'Segure e fale', vi: 'Giữ và nói', id: 'Tahan dan bicara', tr: 'Basılı tut ve konuş', pl: 'Przytrzymaj i mów', fr: 'Maintiens et parle', de: 'Halten und sprechen' }),
    voiceRecording: triLang(lang, { ru: 'Говори… отпусти, когда закончишь', uk: 'Говори… відпусти, коли закінчиш', en: 'Speak… release when done', es: 'Habla… suelta al terminar', 'pt-BR': 'Fale… solte ao terminar', vi: 'Hãy nói… thả ra khi xong', id: 'Bicara… lepaskan jika selesai', tr: 'Konuş… bitince bırak', pl: 'Mów… puść, gdy skończysz', fr: 'Parle… relâche à la fin', de: 'Sprich… loslassen, wenn fertig' }),
    discardVoice: triLang(lang, { ru: 'Удалить запись', uk: 'Видалити запис', en: 'Discard recording', es: 'Descartar grabación', 'pt-BR': 'Descartar gravação', vi: 'Bỏ bản ghi', id: 'Buang rekaman', tr: 'Kaydı sil', pl: 'Odrzuć nagranie', fr: 'Supprimer l’enregistrement', de: 'Aufnahme verwerfen' }),
    loading: triLang(lang, { ru: 'Готовим разговор…', uk: 'Готуємо розмову…', en: 'Getting the chat ready…', es: 'Preparando la conversación…', 'pt-BR': 'Preparando a conversa…', vi: 'Đang chuẩn bị cuộc trò chuyện…', id: 'Menyiapkan obrolan…', tr: 'Sohbet hazırlanıyor…', pl: 'Przygotowujemy rozmowę…', fr: 'Préparation de la conversation…', de: 'Gespräch wird vorbereitet…' }),
    plus: triLang(lang, { ru: 'Свободный разговор доступен в Plus', uk: 'Вільна розмова доступна в Plus', en: 'Free conversation is available with Plus', es: 'La conversación libre está disponible con Plus', 'pt-BR': 'A conversa livre está disponível no Plus', vi: 'Trò chuyện tự do có trong Plus', id: 'Obrolan bebas tersedia di Plus', tr: 'Serbest sohbet Plus ile kullanılabilir', pl: 'Swobodna rozmowa jest dostępna w Plus', fr: 'La conversation libre est disponible avec Plus', de: 'Freies Gespräch ist mit Plus verfügbar' }),
    openPlus: triLang(lang, { ru: 'Открыть Plus', uk: 'Відкрити Plus', en: 'Open Plus', es: 'Abrir Plus', 'pt-BR': 'Abrir Plus', vi: 'Mở Plus', id: 'Buka Plus', tr: 'Plus’ı aç', pl: 'Otwórz Plus', fr: 'Ouvrir Plus', de: 'Plus öffnen' }),
    unavailable: triLang(lang, { ru: 'Не удалось продолжить разговор', uk: 'Не вдалося продовжити розмову', en: 'Couldn’t continue the chat', es: 'No se pudo continuar la conversación', 'pt-BR': 'Não foi possível continuar a conversa', vi: 'Không thể tiếp tục trò chuyện', id: 'Obrolan tidak dapat dilanjutkan', tr: 'Sohbete devam edilemedi', pl: 'Nie udało się kontynuować rozmowy', fr: 'Impossible de poursuivre la conversation', de: 'Das Gespräch konnte nicht fortgesetzt werden' }),
    // зачем (координатор 18.10): дневной потолок ИИ — спокойное «на сегодня всё», без технических слов и без «Повторить».
    dailyCap: triLang(lang, { ru: 'На сегодня разговоров достаточно. Продолжим завтра.', uk: 'На сьогодні розмов досить. Продовжимо завтра.', en: "That's enough talking for today. Let's continue tomorrow.", es: 'Por hoy ya hemos hablado bastante. Seguimos mañana.', 'pt-BR': 'Por hoje já conversamos bastante. Continuamos amanhã.', vi: 'Hôm nay trò chuyện vậy là đủ rồi. Mai mình nói tiếp nhé.', id: 'Untuk hari ini sudah cukup mengobrol. Kita lanjut besok.', tr: 'Bugünlük bu kadar sohbet yeter. Yarın devam ederiz.', pl: 'Na dziś wystarczy rozmów. Kontynuujemy jutro.', fr: 'Assez discuté pour aujourd’hui. On continue demain.', de: 'Für heute ist genug geredet. Morgen geht es weiter.' }),
    // зачем (10 · ПЕРЕВОДЧИК 25.10, 08328d174): плашка «Нет связи» — в одну строку на 360 dp; длинные тексты ошибок резались, а «попробуй ещё раз» дублировало кнопку
    stripOffline: triLang(lang, { ru: 'Нет связи', uk: 'Немає зв’язку', en: 'No connection', es: 'Sin conexión', 'pt-BR': 'Sem conexão', vi: 'Mất kết nối', id: 'Tidak ada koneksi', tr: 'Bağlantı yok', pl: 'Brak połączenia' }),
    stripService: triLang(lang, { ru: 'Сервис недоступен', uk: 'Сервіс недоступний', en: 'Service unavailable', es: 'Servicio no disponible', 'pt-BR': 'Serviço indisponível', vi: 'Dịch vụ không khả dụng', id: 'Layanan tidak tersedia', tr: 'Hizmet kullanılamıyor', pl: 'Usługa niedostępna' }),
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

/**
 * зачем (координатор 22.10, пакет ai-consent-freeform-gate): «Свободный разговор» — тоже вход ИИ (реплики уходят в OpenAI), поэтому
 * экран целиком за общим шлюзом согласия, как сценарные сессии и компаньон: пока согласия нет, экран не монтируется и сессия на
 * сервере не стартует. В окне — вступление свободного режима.
 */
export default function DialogueV2FreeformRoute() {
  return (
    <AiDialogConsentGate mode="free" onDeclined={() => console.log('[AI-CONSENT] freeform:declined → screen not opened, no session')}>
      <DialogueV2FreeformContent />
    </AiDialogConsentGate>
  );
}

function DialogueV2FreeformContent() {
  const askConsentAgain = useAiDialogConsentAskAgain();
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const { studyTarget } = useStudyTarget();
  const { accessResolved, hasPremiumAccess } = usePremium();
  const { lang } = useLang();
  const glass = useDialogueGlass();
  const labels = useMemo(() => labelsFor(lang), [lang]);
  // зачем («Перевести» по тапу, Ревизор по e00c839e0): перевод — отдельный вызов по ходу из журнала сервера, только при флаге «Пульта»
  // (вызов есть лишь на новом сервере). Сессия хода запоминается при показе реплики: после перезапуска сессии старый ход переводится своей.
  const translateEnabled = dialogueV2FreeformTranslateEnabled();
  const translateSessionByTurnRef = useRef(new Map<string, string>());
  const requestTranslation = useMemo(() => (translateEnabled
    ? (message: DialogueV2FreeformMessage): Promise<string | null> => {
      const sessionId = message.turnId ? translateSessionByTurnRef.current.get(message.turnId) : undefined;
      if (!message.turnId || !sessionId) {
        console.warn('[DIALOG-BUBBLE]', JSON.stringify({ event: 'freeform_translate_skip', id: message.id, reason: message.turnId ? 'session_unknown' : 'no_turn_id' })); // guard-ok: ранний выход называет причину
        return Promise.resolve(null);
      }
      return requestDialogueV2FreeformTranslation({ sessionId, turnId: message.turnId, translateTo: lang });
    }
    : undefined), [translateEnabled, lang]);
  // зачем (координатор 24.10, макет u31): тексты сбоя хода — общие со сценарным диалогом (C18 нет сети, C19 сервис недоступен)
  const coachingLabels = useMemo(() => dialogueV2SessionCoachingLabels(lang), [lang]);
  const [turnFailureKind, setTurnFailureKind] = useState<'network' | 'service'>('service');
  const [session, setSession] = useState<ServerSession | null>(null);
  const [messages, setMessages] = useState<readonly DialogueV2FreeformMessage[]>(() => freeformOpeningMessages(studyTarget));
  // зачем (владелец 18.10): ответы «не понимаю» на чужой язык не повторяются подряд.
  const offLanguageReplyIndexRef = useRef<number | null>(null);
  const lastOffLanguageSendRef = useRef<{ text: string; at: number } | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  // зачем (аудит кнопок R52, координатор 15.10): один сбой ХОДА превращал весь экран в «Не удалось продолжить разговор» — лента и черновик
  // пропадали. Сбой хода теперь — плашка с «Повторить» под лентой (как в сценарном диалоге); полный экран остаётся только для сбоя старта.
  const [turnFailed, setTurnFailed] = useState(false);
  // «На сегодня всё» от сервера: плашка без «Повторить», ввод закрыт; сбрасывается при смене языка/входа.
  const [dailyCap, setDailyCap] = useState(false);
  const turnFailedRef = useRef(false);
  turnFailedRef.current = turnFailed;
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
  // зачем (координатор 25.10, Сверка: офлайн экран сам уходил в «Диалоги недоступны»): человека из экрана не выбрасываем — после
  // провала старта над полем ввода тихая плашка «Нет связи» с «Повторить»; старт заново, когда связь вернулась или нажали «Повторить».
  const [startOffline, setStartOffline] = useState(false);
  const startOfflineRef = useRef(false);
  const [netConnected, setNetConnected] = useState<boolean | null>(null);
  const markStartOffline = useCallback((value: boolean, why: string) => {
    if (startOfflineRef.current === value) return; // guard-ok: плашка уже в этом состоянии
    startOfflineRef.current = value;
    setStartOffline(value);
    console.log(`[DIALOG-NET] freeform:strip ${value ? 'shown' : 'hidden'} ${JSON.stringify({ why })}`);
  }, []);

  const voice = useDialogueV2VoiceMessage({
    studyTarget: isSupportedTarget(studyTarget) ? studyTarget : 'en',
    promptText: labels.title,
    disabled: sending || unavailable || turnFailed || !session || !isSupportedTarget(studyTarget)
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
    if (!voiceGate.canStartAttempt(() => { void voice.start(); })) return; // R43: ожидание доступа → после подтверждения Plus запись стартует сама
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
      console.warn(`[DIALOG-NET] freeform:start failed ${JSON.stringify({ generation, attempt, cause: cause.slice(0, 120), plan: plan.kind, queued: queuedMessageRef.current !== null })}`);
      markStartOffline(true, `start_failed attempt=${attempt}`);
      // реплика в очереди ждёт старта без «•••»: точки обещают ответ, которого без связи не будет
      if (queuedMessageRef.current !== null) setSending(false);
      if (plan.kind === 'give_up') {
        // зачем (координатор 25.10): раньше здесь unavailable → уход в хаб и потеря набранного. Теперь экран остаётся, плашка ждёт сеть или «Повторить».
        console.warn(`[DIALOG-NET] freeform:start give_up → stay on screen, strip waits for network or retry ${JSON.stringify({ generation, attempts: attempt + 1, queued: queuedMessageRef.current !== null })}`);
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
    console.log(`[DIALOG-NET] freeform:start try ${JSON.stringify({ generation, attempt, strip: startOfflineRef.current })}`);
    replaceSession(null);
    setUnavailable(false);
    setTurnFailed(false);
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
      console.log(`[DIALOG-NET] freeform:start ok ${JSON.stringify({ generation, attempt })}`);
      markStartOffline(false, 'session_ready');
      replaceSession(Object.freeze({ ...started, studyTarget: target, generation }));
    } catch (error: unknown) {
      const current = generationRef.current === generation && targetRef.current === target;
      const message = error instanceof Error ? error.message : String(error);
      if (!current) {
        console.log('[DIALOGUE-V2] freeform: start failure ignored — contour changed', { generation, studyTarget: target, message }); // guard-ok
      } else if (isFreeformConsentRequired(error)) {
        // зачем (координатор 22.10): сервер не нашёл согласия — не «недоступно» и не тихие повторы, а снова окно согласия.
        console.warn('[AI-CONSENT] freeform: start → server requires consent, ask again', { generation, studyTarget: target });
        askConsentAgain('freeform_start');
      } else if (isFreeformPlusRequired(error)) {
        // зачем (владелец 25.10, «написано „сервис недоступен“»): сервер не видит Plus у записи, а телефон его видел. Повтор ответит
        // тем же — тихие повторы и плашка «Сервис недоступен» врали. Ведём на экран Plus тем же маршрутом, что плитка для бесплатных;
        // replace — «Назад» с экрана Plus возвращает в хаб, а не снова сюда (иначе круг старт → отказ → Plus).
        clearStartRetryTimer();
        markStartOffline(false, 'plus_required');
        console.warn(`[DIALOGUE-V2-FREEFORM] start → plus_required: server sees no Plus, open Plus screen ${JSON.stringify({ generation, attempt, studyTarget: target, queued: queuedMessageRef.current !== null })}`);
        // ref, а не router в зависимостях: от startCurrentSession зависит эффект старта — новая ссылка перезапустила бы сессию
        routerRef.current.replace({
          pathname: '/premium_modal',
          params: dialogLimitPaywallParams('dialogue_v2_freeform_server'),
        } as never);
      } else if (isFreeformDailyCap(error)) {
        // зачем: до завтра сервер ответит тем же — тихие повторы и уход в хаб бессмысленны, показываем «на сегодня всё».
        console.warn('[DIALOGUE-V2] freeform: start → daily cap, no retry', { generation, studyTarget: target });
        setDailyCap(true);
        setTurnFailed(true);
      } else {
        handleStartFailure(message);
      }
    } finally {
      if (startInFlightRef.current === generation) startInFlightRef.current = null;
    }
  }, [askConsentAgain, clearStartRetryTimer, markStartOffline, replaceSession]);
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
    markStartOffline(false, 'contour_reset');
    setTurnFailed(false);
    setDailyCap(false);
    if (!accessResolved || !hasPremiumAccess || !isSupportedTarget(studyTarget)) return undefined;
    void startCurrentSession(studyTarget, generation);
    return undefined;
  }, [accessResolved, clearStartRetryTimer, discardVoice, hasPremiumAccess, markStartOffline, replaceSession, startCurrentSession, studyTarget]);

  // зачем (координатор 25.10): связь вернулась (NetInfo: не подключено → подключено), а плашка «Нет связи» висит — старт заново сам.
  // Запросов не добавляет: NetInfo отдаёт состояние системы; старт — только при переходе «нет связи → есть» и без сессии.
  useEffect(() => {
    let last: boolean | null = null;
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected === false ? false : state.isConnected === true ? true : null;
      if (connected === last) return; // guard-ok: состояние сети прежнее
      const previous = last;
      last = connected;
      setNetConnected(connected);
      console.log(`[DIALOG-NET] freeform:netinfo ${JSON.stringify({ connected, previous, reachable: state.isInternetReachable ?? null, type: state.type ?? null, strip: startOfflineRef.current })}`);
      if (connected !== true || previous !== false) return; // guard-ok: повтор только на переходе «нет связи → есть»
      const target = targetRef.current;
      if (!startOfflineRef.current || sessionRef.current || !isSupportedTarget(target)) {
        console.log(`[DIALOG-NET] freeform:retry ← network back skipped ${JSON.stringify({ strip: startOfflineRef.current, hasSession: !!sessionRef.current, target: String(target) })}`);
        return;
      }
      console.log(`[DIALOG-NET] freeform:retry ← network back ${JSON.stringify({ generation: generationRef.current })}`);
      clearStartRetryTimer();
      void startSessionRef.current(target, generationRef.current, 0);
    });
    return () => unsubscribe();
  }, [clearStartRetryTimer]);

  const runPendingTurn = useCallback(async (pending: PendingTurn) => {
    if (!isCurrentPending(pending)) {
      console.log('[DIALOGUE-V2] freeform: turn skipped — not current contour', { turnId: pending.turnId }); // guard-ok
      return;
    }
    setSending(true);
    setUnavailable(false);
    setTurnFailed(false);
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
        // зачем (T6 «вечные •••»): почему ответ сервера не показан — какое поле контура разошлось
        const live = sessionRef.current;
        console.warn('[FREEFORM-HANG] turn:result_dropped', JSON.stringify({
          turnId: pending.turnId, pendingGeneration: pending.generation, generation: generationRef.current,
          targetSame: targetRef.current === pending.studyTarget, hasSession: !!live,
          sessionSame: live?.sessionId === pending.sessionId, sessionGeneration: live?.generation ?? null,
        }));
        return;
      }
      setMessages((current) => Object.freeze([...current, Object.freeze({
        id: `assistant_${current.length + 1}`,
        author: 'assistant' as const,
        text: result.assistantMessage,
        turnId: pending.turnId,
        // зачем (решение координатора 25.10): перевод — из того же ответа хода; нет поля (старый сервер) — кнопки «Перевод» нет
        ...(result.assistantTranslation ? { translation: result.assistantTranslation } : {}),
      })]));
      // поздний настоящий ответ после стража «•••» — плашку сбоя убираем, ответ уже в ленте
      setTurnFailed(false);
      translateSessionByTurnRef.current.set(pending.turnId, pending.sessionId);
      console.log('[FREEFORM-HANG] turn:shown', JSON.stringify({ turnId: pending.turnId, shown: 'assistant_reply', chars: result.assistantMessage.length }));
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
      if (current && isFreeformConsentRequired(error)) {
        // зачем (координатор 22.10): сервер не нашёл согласия на ИИ — снова окно согласия, а не плашка сбоя.
        console.warn('[AI-CONSENT] freeform: turn → server requires consent, ask again', { turnId: pending.turnId });
        askConsentAgain('freeform_turn');
        return;
      }
      if (current && isFreeformDailyCap(error)) {
        console.warn('[DIALOGUE-V2] freeform: turn → daily cap', { turnId: pending.turnId });
        setDailyCap(true);
      }
      // зачем (координатор 24.10, «вечные •••»): что увидел человек после сбоя хода — плашка с «Повторить» (или «на сегодня всё»).
      console.warn('[FREEFORM-HANG] turn:shown', JSON.stringify({ turnId: pending.turnId, current, shown: current ? (isFreeformDailyCap(error) ? 'daily_cap' : 'retry_bar') : 'nothing_contour_changed' }));
      if (current) setTurnFailureKind(isFreeformNetworkFailure(error) ? 'network' : 'service');
      if (current) setTurnFailed(true); // R52: плашка под лентой, лента и черновик на месте
    } finally {
      if (isCurrentPending(pending)) {
        setSending(false);
        startingRef.current = false;
      }
    }
  }, [askConsentAgain, isCurrentPending]);

  // зачем (координатор 24.10, «•••» висели при ответе сервера за 9–20 с): страж — если «•••» висят дольше потолков старта и хода
  // вместе, пишем всё состояние, гасим точки и ставим плашку «Повторить». Без стража любое залипание экрана было вечным.
  useEffect(() => {
    if (!sending) return undefined;
    const since = Date.now();
    const timer = setTimeout(() => {
      console.warn('[FREEFORM-HANG] watchdog: dots too long → retry bar', JSON.stringify({
        ms: Date.now() - since, hasSession: !!sessionRef.current, queued: queuedMessageRef.current !== null,
        pendingTurnId: pendingRef.current?.turnId ?? null, starting: startingRef.current, startInFlight: startInFlightRef.current,
        generation: generationRef.current,
      }));
      startingRef.current = false;
      setSending(false);
      setTurnFailed(true);
    }, FREEFORM_DOTS_WATCHDOG_SAFE_MS);
    return () => clearTimeout(timer);
  }, [sending]);

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
    // зачем (владелец 18.10, координатор: «свободный разговор — та же проверка»): реплика не на изучаемом языке — ответ «не понимаю»
    // на изучаемом языке, каждый раз другой; на сервер не уходит (ни квоты, ни вызова ИИ). Очередь (queued) уже проверена при постановке.
    if (queued === null && userMessage.length > 0 && isSupportedTarget(targetRef.current) && !sending && voice.status === 'idle') {
      const target = targetRef.current;
      const verdict = detectDialogueOffLanguage(userMessage, target);
      if (verdict.offLanguage) {
        // зачем (Ревизор 18.10): двойной тап — тот же текст, пока черновик ещё не очистился, не даёт второго пузыря.
        const now = Date.now();
        if (lastOffLanguageSendRef.current && lastOffLanguageSendRef.current.text === userMessage && now - lastOffLanguageSendRef.current.at < 1500) {
          console.log('[DIALOG-OFF-LANG] double_tap_ignored', JSON.stringify({ screen: 'freeform', ms: now - lastOffLanguageSendRef.current.at })); // guard-ok: ранний выход называет причину
          return;
        }
        lastOffLanguageSendRef.current = { text: userMessage, at: now };
        // как в обычной отправке: голосовое вложение этой реплики снимается, ошибка голоса гаснет
        voice.takeVoiceAttachment(userMessage);
        voice.clearFailure?.();
        const reply = pickDialogueNotUnderstoodReply(target, offLanguageReplyIndexRef.current);
        offLanguageReplyIndexRef.current = reply.index;
        console.log('[DIALOG-OFF-LANG]', JSON.stringify({ screen: 'freeform', target, reason: verdict.reason, detected: verdict.detected, length: userMessage.length, replyIndex: reply.index })); // guard-ok: ветка «не тот язык» называет решение
        setDraft('');
        setMessages((current) => Object.freeze([
          ...current,
          Object.freeze({ id: `learner_${current.length + 1}`, author: 'learner' as const, text: userMessage }),
          Object.freeze({ id: `assistant_${current.length + 2}`, author: 'assistant' as const, text: reply.text }),
        ]));
        return;
      }
    }
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
      // без связи — пузырь ждёт старта без «•••» (плашка «Нет связи» уже объясняет ожидание)
      setSending(!startOfflineRef.current);
      console.log('[DIALOGUE-V2] freeform: send queued until session ready', { length: probe.userMessage.length, offline: startOfflineRef.current }); // guard-ok
      return;
    }
    if (turnFailedRef.current) {
      console.log('[DIALOGUE-V2] freeform: send skipped — previous turn failed, waiting for «Повторить»'); // guard-ok: ранний выход
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
      setTurnFailed(true); // R52: «Повторить» под лентой перезапустит старт и отправит реплику из очереди
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
        action={{ label: labels.openPlus, onPress: () => router.push({ pathname: '/premium_modal', params: dialogLimitPaywallParams('dialogue_v2_freeform') } as never) }}
      />
    );
  }

  // «Повторить» — одно действие для полного экрана (сбой старта) и плашки под лентой (сбой хода)
  const retryFreeform = () => {
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
  };

  if (unavailable) {
    // зачем (владелец 01.10 / 18.10 «такого не должно быть», координатор 07:46): старт не удался и после тихих повторов —
    // без экрана «Не удалось продолжить разговор» тихо в хаб Диалогов; журнал [DIALOGUE-V2] freeform → redirect hub.
    return (
      <DialogueHubRedirect
        screen="freeform"
        reason="start_failed"
        testID="dialogue-v2-freeform-unavailable"
        backLabel={labels.back}
        loadingLabel={labels.loading}
        details={{ studyTarget: String(studyTarget) }}
      />
    );
  }

  // зачем (жалоба владельца 25.10 «подсказки не относятся к реплике собеседника»): фразы «Можно сказать…» — ответы на последнюю
  // реплику собеседника; не распознали — подсказок нет. Журнал [DIALOG-HINTS] — в модуле подбора.
  const hintsReply = lastPartnerReplyForHints(messages, (message) => message.author === 'assistant');
  const sayHints = dialogueV2SayHintsForPartnerReply({
    screen: 'freeform', studyTarget: String(studyTarget), interfaceLang: lang, reply: hintsReply.reply, skippedNudge: hintsReply.skippedNudge,
  });
  // зачем (координатор 25.10): нет сети (NetInfo) — «Нет связи» (u31 C18), сеть есть, а старт не прошёл — «Сервис временно недоступен» (C19)
  const connectionNotice = startOffline && !session ? {
    message: netConnected === true ? labels.stripService : labels.stripOffline,
    retryLabel: labels.retry,
    onRetry: () => {
      console.log(`[DIALOG-NET] freeform:retry ← button ${JSON.stringify({ generation: generationRef.current, connected: netConnected })}`);
      retryFreeform();
    },
  } : null;
  return <DialogueV2FreeformScreen translateLabels={{ show: coachingLabels.translate, hide: coachingLabels.hideTranslation }} onRequestTranslation={requestTranslation} connectionNotice={connectionNotice} sayHints={sayHints}title={labels.title} messages={messages} draft={draft} sending={sending} voiceStatus={voice.status} voiceUnavailable={voice.unavailableOnDevice} voiceNotice={voice.failure === 'unavailable' && voice.unavailableOnDevice ? speechUnavailableOnDeviceText(lang) : null} voiceDraft={voice.voiceDraft} playingVoiceUri={voice.playingVoiceUri} interfaceLang={lang} labels={labels} onBack={() => safeRouterBack(router, '/ai_dialog_home' as never)} onChangeDraft={setDraft} onSend={() => { void send(); }} onStartVoice={startVoice} onStopVoice={voice.stop} onDiscardVoice={voice.discard} onPlayVoice={voice.play} turnError={dailyCap ? { message: labels.dailyCap } : turnFailed ? { message: turnFailureKind === 'network' ? coachingLabels.networkError : coachingLabels.serviceError, retryLabel: labels.retry, onRetry: retryFreeform } : null} />;
}
