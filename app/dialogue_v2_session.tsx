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
import { detectDialogueOffLanguage, pickDialogueNotUnderstoodReply } from './dialogue_v2_off_language';
import { logDialogueV2Latency, logDialogueV2OptimisticFrame, logDialogueV2OptimisticStep, markDialogueV2OptimisticTap } from './dialogue_v2_optimistic_trace';
import { peekDialogueV2LastWarmAtMs } from './dialogue_v2_warmup';
import { aiDialogMonthlyLimitText } from '../components/dialog_limit_text';
import { dialogueScenarioAvatarIcon } from '../components/dialogs/dialogue_scenario_icons';
import { dialogueTypingCaption, dialogueTypingStageFor, DIALOGUE_TYPING_NAME_AFTER_MS, DIALOGUE_TYPING_SLOW_AFTER_MS, type DialogueTypingStage } from '../components/dialogs/dialogue_typing_caption';
import {
  DialogueV2TurnFailureError,
  sendDialogueV2CoachedTextTurn,
  type DialogueV2CoachedTurnResponse,
  type DialogueV2TurnFailureReason,
} from './dialogue_v2_turn_coaching_client';
import { dialogueV2SessionCoachingLabels } from './dialogue_v2_session_coaching_labels';
import { rememberDialogueV2SessionOutcome } from './dialogue_v2_session_outcome_store';
import { markDialogueV2Done } from './dialogue_v2_done_store';
import { markDialogueV2DoneToday } from './dialogue_v2_day_mark';
import { createDialogueEnergySettler, type DialogueEnergySettler } from './dialogue_v2_energy_settle';
import { formatDialogObjectiveLabel } from '../components/dialogs/dialog_objective_label';
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
import { DialogueHubRedirect } from '../components/dialogs/DialogueHubRedirect';
import { useDialogueV2VoiceMessage } from '../hooks/use_dialogue_v2_voice_message';
import { useGuardedNav } from '../hooks/use-guarded-nav';
import { speechUnavailableOnDeviceText } from './speech_device_availability';
import { useDialogueV2PreparedBotVoicePlayback } from '../hooks/use_dialogue_v2_prepared_bot_voice_playback';
import {
  DialogueV2SessionScreen,
  type DialogueV2SessionBottom,
  type DialogueV2SessionMessage,
} from '../components/dialogs/DialogueV2SessionScreen';
import { safeRouterBack } from './navigation_back';
import { getLocalDayKey } from './local_date';
import {
  FREE_DIALOG_VOICE_DAILY_LIMIT,
  peekDialogVoiceAttempts,
} from './dialogue_v2_voice_daily_limit';
import { useVoiceAttemptGate } from '../hooks/use_voice_attempt_gate';

const V2_TARGETS = new Set(['en', 'es', 'fr', 'de']);
const INTERFACE_LANGS = new Set(['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl', 'fr', 'de']);
const RATE_LIMIT_COOLDOWN_MS = 12_000;

type SessionState =
  | Readonly<{ kind: 'loading' }>
  | Readonly<{ kind: 'unavailable' }>
  | Readonly<{ kind: 'available'; envelope: DialogueV2CatalogueReleaseEnvelope }>;

type ServerSessionState = 'idle' | 'starting' | 'unavailable' | 'ready';

let lastGoalLogKey = '';

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
    placeholder: triLang(lang, { ru: 'Напиши или говори', uk: 'Напиши або говори', en: 'Type or speak', es: 'Escribe o mantén el micrófono', 'pt-BR': 'Escreva ou segure o microfone', vi: 'Nhập hoặc giữ micro', id: 'Ketik atau tahan mikrofon', tr: 'Yaz ya da mikrofona basılı tut', pl: 'Napisz lub przytrzymaj mikrofon', fr: 'Écris ou maintiens le micro', de: 'Schreib oder halte das Mikro' }),
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
    // зачем (координатор 18.10 05:34): не размытое «сейчас недоступно», а что именно случилось — ответ собеседника не пришёл
    turnError: triLang(lang, { ru: 'Ответ не пришёл. Попробуй ещё раз.', uk: 'Відповідь не надійшла. Спробуй ще раз.', en: 'No reply came through. Try again.', es: 'No llegó la respuesta. Inténtalo de nuevo.', 'pt-BR': 'A resposta não chegou. Tente de novo.', vi: 'Chưa nhận được câu trả lời. Hãy thử lại.', id: 'Balasan tidak masuk. Coba lagi.', tr: 'Yanıt gelmedi. Tekrar dene.', pl: 'Odpowiedź nie dotarła. Spróbuj ponownie.', fr: 'La réponse n’est pas arrivée. Réessaie.', de: 'Die Antwort kam nicht an. Versuch es erneut.' }),
    // зачем (D123): у Plus на экране «безлимит»; тихий серверный потолок говорит спокойно, без слова «лимит».
    plusDailyCap: triLang(lang, { ru: 'На сегодня разговоров достаточно. Продолжим завтра.', uk: 'На сьогодні розмов досить. Продовжимо завтра.', en: "That's enough talking for today. Let's continue tomorrow.", es: 'Por hoy ya hemos hablado bastante. Seguimos mañana.', 'pt-BR': 'Por hoje já conversamos bastante. Continuamos amanhã.', vi: 'Hôm nay trò chuyện vậy là đủ rồi. Mai mình nói tiếp nhé.', id: 'Untuk hari ini sudah cukup mengobrol. Kita lanjut besok.', tr: 'Bugünlük bu kadar sohbet yeter. Yarın devam ederiz.', pl: 'Na dziś wystarczy rozmów. Kontynuujemy jutro.', fr: 'Assez discuté pour aujourd’hui. On continue demain.', de: 'Für heute ist genug geredet. Morgen geht es weiter.' }),
    retry: triLang(lang, { ru: 'Повторить', uk: 'Повторити', en: 'Retry', es: 'Reintentar', 'pt-BR': 'Tentar de novo', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Ponów', fr: 'Réessayer', de: 'Erneut versuchen' }),
    tasks: triLang(lang, { ru: 'Задания', uk: 'Завдання', en: 'Goals', es: 'Objetivos', 'pt-BR': 'Objetivos', vi: 'Nhiệm vụ', id: 'Tugas', tr: 'Görevler', pl: 'Zadania', fr: 'Objectifs', de: 'Aufgaben' }),
    exitTitle: triLang(lang, { ru: 'Выйти из диалога?', uk: 'Вийти з діалогу?', en: 'Leave the dialogue?', es: '¿Salir del diálogo?', 'pt-BR': 'Sair do diálogo?', vi: 'Thoát hội thoại?', id: 'Keluar dari dialog?', tr: 'Diyalogdan çıkılsın mı?', pl: 'Wyjść z dialogu?', fr: 'Quitter le dialogue ?', de: 'Dialog verlassen?' }),
    exitMessage: triLang(lang, { ru: 'Переписка не сохранится: в следующий раз диалог начнётся заново.', uk: 'Листування не збережеться: наступного разу діалог почнеться заново.', en: 'This chat won’t be saved — next time the dialogue starts over.', es: 'La conversación no se guardará: la próxima vez el diálogo empezará de nuevo.', 'pt-BR': 'A conversa não será salva: da próxima vez o diálogo começa do zero.', vi: 'Cuộc trò chuyện sẽ không được lưu: lần sau hội thoại bắt đầu lại.', id: 'Percakapan tidak akan disimpan: lain kali dialog dimulai dari awal.', tr: 'Yazışma kaydedilmez: bir sonraki sefer diyalog baştan başlar.', pl: 'Rozmowa nie zostanie zapisana: następnym razem dialog zacznie się od nowa.', fr: 'La conversation ne sera pas enregistrée : la prochaine fois, le dialogue recommencera.', de: 'Der Chat wird nicht gespeichert: Beim nächsten Mal beginnt der Dialog von vorn.' }),
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
  // зачем (аудит Optimistic UI Диалогов, 12.10): «Итоги» и «Plus» открывались прямым router.push — двойной тап давал два экрана; nav пропускает повтор в окне 600 мс
  const nav = useGuardedNav();
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
  // зачем (E2, координатор 12.10, «сперва логи»): время от монтирования до первого содержательного кадра — что было в первом кадре (данные / скелет) и когда пришли данные
  const firstFrameAtRef = useRef(Date.now());
  const firstFrameKindRef = useRef<string | null>(null);
  useEffect(() => {
    if (typeof __DEV__ === 'undefined' || !__DEV__) return;
    if (firstFrameKindRef.current === state.kind) return;
    const first = firstFrameKindRef.current === null;
    firstFrameKindRef.current = state.kind;
    // зачем (координатор 18.10, Optimistic UI): тот же кадр — от тапа «Начать» на брифинге.
    logDialogueV2OptimisticFrame('start_tap', first ? 'session_first_frame' : 'session_update_frame', { kind: state.kind });
    console.log(`[DIALOGS-FIRST-FRAME] session ${first ? 'first' : 'update'} kind=${state.kind} content=${String(state.kind === 'available')} skeleton=${String(state.kind === 'loading')} ms=${Date.now() - firstFrameAtRef.current}`); // guard-ok: под __DEV__, число решает ветку
  }, [state.kind]);
  const [startAttempt, setStartAttempt] = useState(0);
  const startBudgetBeganAtRef = useRef(Date.now());
  const [messages, setMessages] = useState<readonly DialogueV2SessionMessage[]>([]);
  // зачем (координатор 12.10, dialogs-038, «сперва логи»): номер реплики ученика для [DIALOG-END] — замыкание
  // appendReplies отстаёт на одну отрисовку, ref всегда видит текущую ленту.
  const learnerTurnsRef = useRef(0);
  // зачем (владелец 18.10): ответы «не понимаю» на чужой язык не повторяются подряд; подпись — первый собеседник сценария.
  const offLanguageReplyIndexRef = useRef<number | null>(null);
  const lastOffLanguageSendRef = useRef<{ text: string; at: number } | null>(null);
  // зачем (владелец 18.10): реплика не на изучаемом языке ходом не считается.
  learnerTurnsRef.current = messages.reduce((count, message) => (message.author === 'learner' && !message.offLanguage ? count + 1 : count), 0);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  // зачем (координатор 18.10, К2): подпись под «…» собеседника — через 5 с «Мила печатает…», через 15 с «Отвечает дольше обычного».
  const [typingStage, setTypingStage] = useState<DialogueTypingStage>('none');
  useEffect(() => {
    if (!sending) {
      setTypingStage('none');
      return undefined;
    }
    const startedAt = Date.now();
    const update = () => {
      const stage = dialogueTypingStageFor(Date.now() - startedAt);
      setTypingStage(stage);
      console.log(`[DIALOGUE-V2] typing:caption stage=${stage} afterMs=${Date.now() - startedAt}`); // guard-ok: две строки на долгий ход
    };
    const nameTimer = setTimeout(update, DIALOGUE_TYPING_NAME_AFTER_MS);
    const slowTimer = setTimeout(update, DIALOGUE_TYPING_SLOW_AFTER_MS);
    return () => { clearTimeout(nameTimer); clearTimeout(slowTimer); };
  }, [sending]);
  const [turnFailure, setTurnFailure] = useState<TurnFailureView | null>(null);
  const [rateLimitCooling, setRateLimitCooling] = useState(false);
  const [paused, setPaused] = useState(false);
  const [serverSession, setServerSession] = useState<Readonly<{ sessionId: string; expiresAtMs: number }> | null>(null);
  const [serverSessionState, setServerSessionState] = useState<ServerSessionState>('idle');
  const pendingTurnRef = useRef<Readonly<{ turnId: string; userMessage: string; learnerId: string }> | null>(null);
  // зачем (баг 01.10, D87): энергия за диалог закрепляется после первого ответа собеседника;
  // отказ сервиса на первом ходе — энергия возвращается. Одно решение на сессию.
  const energyActionsRef = useRef<Readonly<{
    acknowledge: (operationId: string) => Promise<boolean>;
    refund: (operationId: string, reason: string) => Promise<void>;
  }> | null>(null);
  // зачем (E10, координатор 12.10): одно решение «закрепить / вернуть» на попытку, ключ — energyOp; двойной вызов и гонка
  // возврата с первым ответом дают ровно одно действие (dialogue_v2_energy_settle.ts).
  const energySettlerRef = useRef<DialogueEnergySettler | null>(null);
  if (!energySettlerRef.current) {
    energySettlerRef.current = createDialogueEnergySettler(typeof params.energyOp === 'string' ? params.energyOp : null, {
      getActions: () => energyActionsRef.current,
      scenarioId: typeof params.scenarioId === 'string' ? params.scenarioId : null,
      onRefunded: () => {
        emitAppEvent('action_toast', actionToastTri('info', {
          ru: 'Энергия возвращена', uk: 'Енергію повернено', en: 'Energy returned', es: 'Energía devuelta',
          'pt-BR': 'Energia devolvida', vi: 'Đã hoàn lại năng lượng', id: 'Energi dikembalikan',
          tr: 'Enerji iade edildi', pl: 'Energia zwrócona',
        }));
      },
    });
  }
  const settleEnergy = (outcome: 'acknowledge' | 'refund', reason: string) => {
    console.log('[DIALOGUE-V2] energy:settle', { outcome, reason, scenarioId: params.scenarioId });
    void energySettlerRef.current?.settle(outcome, reason);
  };
  const turnStartingRef = useRef(false);
  // зачем (аудит Optimistic UI Диалогов, 12.10): ход, отправленный до готовности серверной сессии, ждёт в очереди. Раньше очередь означала `sending=true`, а эффект
  // отправки требовал `!sending` — реплика зависала навсегда («печатает…» без ответа). Флаг очереди — отдельный ref, как у свободного разговора.
  const queuedTurnRef = useRef(false);
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
  // зачем (владелец 12.10, п.81, вариант А; макет C15 / dialogs-028): Free — 3 голосовые попытки в день, после третьей на
  // микрофоне PLUS и тап ведёт в Plus; Plus — без лимита. Первый кадр берёт счётчик из памяти, диск догоняет фоном.
  // зачем (Ревизор R1-a/R13 15.10): Диалоги V2 на общем хуке, как свободный разговор — ключ попытки, отложенное списание при
  // неизвестном доступе, пейвол с защитой от двойного тапа и paywall_shown. Значок PLUS берётся из того же остатка, что гейт
  // (с отложенными в памяти попытками) — иначе в запасном режиме значок показывал «осталось 1», а тап открывал пейвол.
  const voiceGate = useVoiceAttemptGate({ surface: 'dialogs', source: 'dialogue_v2_session' });
  const voiceLimitDecision = voiceGate.locked ? 'limit_reached' : 'allowed';
  const commitVoiceAttempt = voiceGate.commitStartedAttempt;
  // Попытка = НАЧАТАЯ запись: считаем переход в recording, а не тап (отмена до старта и отказ микрофона — не попытка).
  const prevVoiceStatusRef = useRef(voice.status);
  useEffect(() => {
    const previous = prevVoiceStatusRef.current;
    prevVoiceStatusRef.current = voice.status;
    if (voice.status !== 'recording' || previous === 'recording') return;
    commitVoiceAttempt();
    console.log('[DIALOG-VOICE] attempt:committed_via_gate', JSON.stringify({ limit: FREE_DIALOG_VOICE_DAILY_LIMIT, accessResolved, hasPremiumAccess, previous }));
  }, [voice.status, commitVoiceAttempt, accessResolved, hasPremiumAccess]);
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
    if (startAttempt === 0) startBudgetBeganAtRef.current = Date.now();
    const scheduleRetry = () => {
      // зачем (владелец 01.10): без экрана «недоступно» — тихий повтор старта в фоне (до 5 раз).
      if (startAttempt >= 5) { setServerSessionState('unavailable'); return; }
      // зачем (аудит «пропала сеть», Авторизация 13.10): общий потолок всех тихих повторов — на медленной сети ход ученика
      // висел с «печатает…» до ~5–6 минут. После бюджета — «недоступно» и «Повторить» (старт заново, счётчик с нуля).
      const spentMs = Date.now() - startBudgetBeganAtRef.current;
      if (spentMs >= DIALOGUE_V2_SESSION_START_BUDGET_MS) {
        console.warn(`[DIALOG-NET] session:start → бюджет исчерпан ${JSON.stringify({ attempt: startAttempt, spentMs, budgetMs: DIALOGUE_V2_SESSION_START_BUDGET_MS })} → недоступно`); // guard-ok: ветвление
        setServerSessionState('unavailable');
        return;
      }
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
      logDialogueV2OptimisticStep('start_tap', 'server_session_ready', { attempt: startAttempt });
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
    if (!serverSession || !pending) return;
    if (!queuedTurnRef.current) {
      console.log('[DIALOGUE-V2] turn:flush → nothing queued', { scenarioId, hasPending: true, sending }); // guard-ok: ранний выход пишет причину
      return;
    }
    queuedTurnRef.current = false;
    console.log('[DIALOGUE-V2] turn:flush → session ready, sending queued turn', { scenarioId });
    void runPendingTurn(pending);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverSession]);

  // зачем (аудит Optimistic UI Диалогов, 12.10): после 5 неудачных стартов сессии ход в очереди не должен висеть молча — панель ошибки и «Повторить» (retry перезапускает старт).
  useEffect(() => {
    if (serverSessionState !== 'unavailable' || !queuedTurnRef.current) return;
    queuedTurnRef.current = false;
    console.warn('[DIALOGUE-V2] turn:queued → session start unavailable, showing error', { scenarioId, startAttempt }); // guard-ok: ветвление называет причину
    setSending(false);
    setTurnFailure(Object.freeze({ reason: 'network' }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverSessionState]);

  // зачем (E10, координатор 12.10): все 5 тихих стартов провалились — диалог не состоялся, человек ничего не получил,
  // энергию возвращаем. Если первый ответ уже закрепил её — расчёт пропустит (одно решение на попытку). Поздний старт
  // по «Повторить» после возврата не списывает повторно (как после service-сбоя).
  useEffect(() => {
    if (serverSessionState !== 'unavailable') return;
    console.warn('[ENERGY-REFUND] dialogue:session start unavailable → refund', JSON.stringify({ scenarioId, startAttempt })); // guard-ok: ветвление называет причину
    settleEnergy('refund', 'dialogue_session_start_failed');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverSessionState]);

  // зачем (Ревизор 15.10, 🟡 к e4719fc1e): пустой разговор — ни одной реплики ученика — человек ничего не получил, энергию возвращаем.
  // Энергия закрепляется только первым удачным ходом ученика, значит при нуле реплик она ещё не закреплена. Возврат идёт через тот же
  // расчёт попытки (ключ — energyOp): ровно один раз, повтор и гонка с первым ходом — пропуск; журнал энергии по тому же id не вернёт дважды.
  // Срабатывает и на итоге с нулём реплик, и при уходе с экрана без реплик.
  // Ревизор 15.10 (🟡 к e7cd23a94): при уходе решает не число реплик, а «ответил ли собеседник хоть раз» — закрепление энергии
  // ставит только удачный ход. Реплики без ответа (сбой сети, лимит) → возврат. Ход ещё в полёте → решение откладывается до его
  // исхода (finally в runPendingTurn): удачный ход закрепит энергию, неудачный — вернёт; раньше поздний провал терял её.
  const turnInFlightRef = useRef(false);
  const leftScreenRef = useRef(false);
  const refundEmptyDialogue = (where: 'summary' | 'leave') => {
    if (where === 'leave') leftScreenRef.current = true;
    const learnerTurnsNow = learnerTurnsRef.current;
    const energy = energySettlerRef.current?.peek() ?? null;
    if (where === 'summary' && learnerTurnsNow > 0) {
      console.log('[DIALOG-ENERGY-REFUND] skip: learner spoke', JSON.stringify({ where, learnerTurns: learnerTurnsNow, scenarioId })); // guard-ok: ветвление называет причину
      return;
    }
    if (turnInFlightRef.current) {
      console.log('[DIALOG-ENERGY-REFUND] defer: turn in flight → исход хода решит', JSON.stringify({ where, learnerTurns: learnerTurnsNow, scenarioId, energy })); // guard-ok: отложенное решение
      return;
    }
    if (energy?.settledAs === 'acknowledge') {
      console.log('[DIALOG-ENERGY-REFUND] skip: partner answered, energy kept', JSON.stringify({ where, learnerTurns: learnerTurnsNow, scenarioId })); // guard-ok: ветвление называет причину
      return;
    }
    const reason = learnerTurnsNow === 0
      ? (where === 'summary' ? 'dialogue_zero_learner_turns' : 'dialogue_left_without_turns')
      : 'dialogue_left_no_answered_turn';
    console.warn('[DIALOG-ENERGY-REFUND] nothing received → refund', JSON.stringify({ where, reason, learnerTurns: learnerTurnsNow, scenarioId, energy })); // guard-ok: причина возврата
    settleEnergy('refund', reason);
  };
  const refundEmptyDialogueRef = useRef(refundEmptyDialogue);
  refundEmptyDialogueRef.current = refundEmptyDialogue;
  useEffect(() => () => { refundEmptyDialogueRef.current('leave'); }, []);

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
    coaching.applyQuota(result.quota, pending.turnId, result.replayed);
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      // зачем (dialogs-038: конец после 2-й реплики при невыполненных целях): что сервер сказал на этом ходе — конец ли
      // диалога, какая цель активна и где остальные цели относительно неё (пройдена / текущая / впереди).
      const objectives = model?.objectives ?? [];
      const activeId = coached?.activeObjectiveId ?? coaching.activeObjectiveId ?? null;
      const activeIndex = activeId ? objectives.findIndex((objective) => objective.id === activeId) : -1;
      console.log('[DIALOG-END] turn', JSON.stringify({
        session: session.sessionId.slice(0, 12),
        scenarioId: scenario,
        learnerTurn: learnerTurnsRef.current,
        replies: result.replies.length,
        coaching: coached ? 'present' : 'none',
        dialogueEnded: coached?.dialogueEnded ?? null,
        activeObjectiveId: activeId,
        activeIndex,
        objectives: objectives.map((objective, index) => `${objective.id}:${activeIndex < 0 ? 'unknown' : index < activeIndex ? 'passed' : index === activeIndex ? 'active' : 'ahead'}`),
        endedWithGoalsAhead: coached?.dialogueEnded === true && activeIndex >= 0 && activeIndex < objectives.length - 1,
      }));
    }
  };

  // зачем (координатор 18.10, (б)): одна точка пометки пузыря ученика; меняет состояние, только если пометка правда меняется (без лишней перерисовки).
  const markLearnerUnsent = (learnerId: string, unsent: boolean, reason: string) => {
    setMessages((current) => {
      const target = current.find((message) => message.id === learnerId && message.author === 'learner');
      if (!target || Boolean(target.unsent) === unsent) return current;
      console.log(`[DIALOGUE-V2] turn:bubble ${unsent ? 'unsent' : 'resending'} learnerId=${learnerId} reason=${reason}`); // guard-ok: только при сбое хода и его повторе
      return Object.freeze(current.map((message) => (
        message === target && message.author === 'learner' ? Object.freeze({ ...message, unsent }) : message
      )));
    });
  };

  const runPendingTurn = async (pending: Readonly<{ turnId: string; userMessage: string; learnerId: string }>) => {
    if (!serverSession || !scenarioId || !supportedTarget(studyTarget)) {
      setSending(false);
      console.warn('[DIALOGUE-V2] turn:run → skipped, session not ready', { hasSession: !!serverSession, scenarioId });
      return;
    }
    setSending(true);
    turnInFlightRef.current = true;
    // Повтор того же хода: пометка «Не отправлено» снимается сразу — пузырь снова в пути.
    markLearnerUnsent(pending.learnerId, false, 'run');
    // зачем (E3, координатор 12.10): пилюля «N/30» уменьшается в момент отправки; повтор того же хода её не трогает.
    coaching.beginQuotaTurn(pending.turnId);
    // зачем (координатор 18.10, К3): разложить ожидание ответа ИИ на клиенте — запрос, разбор/озвучка, кадр; возраст прогрева функций.
    const latencyStartedAt = Date.now();
    const lastWarmAt = peekDialogueV2LastWarmAtMs();
    const latencyBase = { scenarioId, learnerTurn: learnerTurnsRef.current, warmAgeMs: lastWarmAt === null ? null : latencyStartedAt - lastWarmAt };
    try {
      const result = await sendDialogueV2CoachedTextTurn({
        sessionId: serverSession.sessionId,
        turnId: pending.turnId,
        studyTarget,
        scenarioId,
        userMessage: pending.userMessage,
        interfaceLang: interfaceLangFor(lang),
      });
      logDialogueV2OptimisticStep('send_tap', 'server_reply', { kind: result.kind, replies: result.kind === 'reply' ? result.replies.length : 0 });
      const callableMs = Date.now() - latencyStartedAt;
      if (result.kind === 'reply') {
        const appendStartedAt = Date.now();
        await appendReplies(result, pending, serverSession, studyTarget, scenarioId);
        const appendMs = Date.now() - appendStartedAt;
        logDialogueV2OptimisticFrame('send_tap', 'reply_frame');
        // зачем (18.10): замер — только лог; без requestAnimationFrame (тесты/фон) он не должен ронять удачный ход в catch.
        const afterFrame = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (cb: () => void) => setTimeout(cb, 0);
        afterFrame(() => logDialogueV2Latency({ ...latencyBase, outcome: 'reply', callableMs, appendMs, frameMs: Date.now() - latencyStartedAt, replies: result.replies.length, voice: result.preparedBotVoiceSelection ? 'prepared' : 'none' }));
      } else {
        logDialogueV2Latency({ ...latencyBase, outcome: result.kind, callableMs });
        // зачем (E3): ход отвечен без реплик — снимаем его из «в полёте», остаток прежний.
        coaching.applyQuota(null, pending.turnId);
      }
      pendingTurnRef.current = null;
      settleEnergy('acknowledge', 'first_turn_ok');
    } catch (error: unknown) {
      const reason: DialogueV2TurnFailureReason = error instanceof DialogueV2TurnFailureError ? error.reason : 'network';
      // зачем (18.10): не-ходовая ошибка (сбой уже после ответа сервера) раньше сводилась к немому 'network' — пишем саму причину.
      console.warn('[DIALOGUE-V2] turn:run → failed', {
        reason, scenarioId, error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
        stack: error instanceof DialogueV2TurnFailureError ? undefined : (error as Error | undefined)?.stack?.split('\n').slice(0, 4).join(' | '),
      });
      logDialogueV2OptimisticStep('send_tap', 'rollback', { reason });
      logDialogueV2Latency({ ...latencyBase, outcome: 'failed', reason, callableMs: Date.now() - latencyStartedAt });
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
        // зачем (координатор 18.10, Optimistic UI (б)): сеть/сервис не приняли реплику — пузырь помечен «Не отправлено», а не выглядит
        // доставленным; «Повторить» снимает пометку в начале повтора (runPendingTurn).
        markLearnerUnsent(pending.learnerId, true, reason);
        if (reason === 'rate_limited') setRateLimitCooling(true);
        // Сервис не ответил ещё ни разу — диалог не состоялся, энергию возвращаем.
        if (reason === 'service') settleEnergy('refund', 'dialogue_first_turn_service_failed');
        setTurnFailure(Object.freeze({ reason }));
      }
    } finally {
      setSending(false);
      turnStartingRef.current = false;
      turnInFlightRef.current = false;
      // Человек ушёл, пока ход был в полёте: удачный ход уже закрепил энергию (расчёт пропустит), провал — возвращаем.
      if (leftScreenRef.current) {
        console.log('[DIALOG-ENERGY-REFUND] turn settled after leave', JSON.stringify({ scenarioId, energy: energySettlerRef.current?.peek() ?? null })); // guard-ok: исход отложенного решения
        settleEnergy('refund', 'dialogue_left_turn_unanswered');
      }
    }
  };

  const send = async () => {
    const userMessage = draft.trim();
    if (!model?.unlocked || !scenarioId || !supportedTarget(studyTarget)
      || sending || turnStartingRef.current || voice.status !== 'idle'
      || coaching.quotaExhausted || coaching.ended
      || userMessage.length < 1 || userMessage.length > 2_000) {
      // зачем (координатор 18.10, Optimistic UI (в)): двойной тап и быстрые повторы отбрасываются здесь — причина в журнал, а не молча.
      console.log('[DIALOGUE-V2] turn:send → skipped', JSON.stringify({ // guard-ok: ранний выход называет причину
        unlocked: !!model?.unlocked, scenario: !!scenarioId, sending, starting: turnStartingRef.current, voice: voice.status,
        exhausted: coaching.quotaExhausted, ended: coaching.ended, length: userMessage.length,
      }));
      return;
    }
    // зачем (владелец 18.10 через координатора 09:58): реплика не на изучаемом языке (учит английский, пишет по-русски/по-французски)
    // — собеседник отвечает на изучаемом языке «извини, не понимаю» каждый раз другой фразой; на сервер не уходит (ни квоты, ни энергии,
    // ни вызова ИИ), ходом и в итоге не считается. Повтор зависшего хода сюда не попадает (pendingTurnRef).
    if (!pendingTurnRef.current) {
      const offLanguagePersonaLabel = model?.participants?.[0]?.displayName;
      const verdict = detectDialogueOffLanguage(userMessage, studyTarget);
      if (verdict.offLanguage) {
        // зачем (Ревизор 18.10): двойной тап — тот же текст, пока черновик ещё не очистился, не даёт второго пузыря.
        const now = Date.now();
        if (lastOffLanguageSendRef.current && lastOffLanguageSendRef.current.text === userMessage && now - lastOffLanguageSendRef.current.at < 1500) {
          console.log('[DIALOG-OFF-LANG] double_tap_ignored', JSON.stringify({ screen: 'session', ms: now - lastOffLanguageSendRef.current.at })); // guard-ok: ранний выход называет причину
          return;
        }
        lastOffLanguageSendRef.current = { text: userMessage, at: now };
        // как в обычной отправке: голосовое вложение этой реплики снимается, ошибка голоса гаснет
        voice.takeVoiceAttachment(userMessage);
        voice.clearFailure?.();
        const reply = pickDialogueNotUnderstoodReply(studyTarget, offLanguageReplyIndexRef.current);
        offLanguageReplyIndexRef.current = reply.index;
        console.log('[DIALOG-OFF-LANG]', JSON.stringify({ scenarioId, target: studyTarget, reason: verdict.reason, detected: verdict.detected, length: userMessage.length, replyIndex: reply.index, learnerTurn: learnerTurnsRef.current })); // guard-ok: ветка «не тот язык» называет решение
        setDraft('');
        setMessages((current) => Object.freeze([
          ...current,
          Object.freeze({ id: `learner_${current.length + 1}`, author: 'learner' as const, text: userMessage, offLanguage: true }),
          Object.freeze({ id: `persona_${current.length + 2}`, author: 'persona' as const, authorLabel: offLanguagePersonaLabel, text: reply.text }),
        ]));
        return;
      }
    }
    turnStartingRef.current = true;
    let pending = pendingTurnRef.current;
    // зачем (координатор 18.10, Optimistic UI): «отправить» → кадр со своим пузырём → ответ собеседника / откат.
    markDialogueV2OptimisticTap('send_tap', scenarioId, { learnerTurn: learnerTurnsRef.current, retryOfPending: pending !== null, sessionReady: serverSession !== null });
    try {
      if (!pending) {
        const learnerId = `learner_${messages.length + 1}`;
        const turnId = await secureTurnId();
        logDialogueV2OptimisticStep('send_tap', 'turn_id_ready');
        pending = Object.freeze({ turnId, userMessage, learnerId });
        pendingTurnRef.current = pending;
        const voiceAttachment = voice.takeVoiceAttachment(userMessage);
        setDraft('');
        voice.clearFailure?.();
        setMessages((current) => Object.freeze([...current, Object.freeze({
          id: learnerId, author: 'learner' as const, text: userMessage,
          ...(voiceAttachment ? { voice: { uri: voiceAttachment.uri } } : {}),
        })]));
        logDialogueV2OptimisticFrame('send_tap', 'bubble_frame', { queuedUntilSession: serverSession === null });
      }
      if (!serverSession) {
        // Сессия ещё стартует — пузырь уже на экране, ход уйдёт эффектом выше.
        if (serverSessionState === 'unavailable') {
          // зачем (аудит Optimistic UI Диалогов, 12.10): старт уже провалился 5 раз — очередь не поможет; сразу панель ошибки с «Повторить» (пузырь остаётся)
          console.warn('[DIALOGUE-V2] turn:send → session start unavailable, error panel at once', { scenarioId }); // guard-ok: ветвление называет причину
          setTurnFailure(Object.freeze({ reason: 'network' }));
          markLearnerUnsent(pending.learnerId, true, 'session_unavailable');
          turnStartingRef.current = false;
          return;
        }
        console.log('[DIALOGUE-V2] turn:send → queued until session ready', { scenarioId, sessionState: serverSessionState });
        queuedTurnRef.current = true;
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
    if (pending && !serverSession && !sending && !turnStartingRef.current) {
      // зачем (аудит Optimistic UI Диалогов, 12.10): сессия так и не стартовала — «Повторить» ставит ход в очередь и заново запускает старт (счётчик попыток с нуля)
      console.log('[DIALOGUE-V2] turn:retry → no session, queue again and restart start', { scenarioId, sessionState: serverSessionState });
      queuedTurnRef.current = true;
      setTurnFailure(null);
      markLearnerUnsent(pending.learnerId, false, 'retry_queue');
      setSending(true);
      if (serverSessionState === 'unavailable') setStartAttempt(0);
      return;
    }
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
    const learnerMessages = messages.filter((message) => message.author === 'learner' && !message.offLanguage);
    const learnerTurns = learnerMessages.length;
    if (learnerTurns === 0) refundEmptyDialogue('summary');
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      // зачем (dialogs-038 / dialogs-041, «сперва логи»): какое условие завершило диалог и что уходит в итог и серию.
      const objectives = model?.objectives ?? [];
      const activeIndex = coaching.activeObjectiveId ? objectives.findIndex((objective) => objective.id === coaching.activeObjectiveId) : -1;
      console.log('[DIALOG-END] open_summary', JSON.stringify({
        session: serverSession.sessionId.slice(0, 12),
        scenarioId,
        endedBy,
        endedByServer: coaching.ended,
        quotaExhausted: coaching.quotaExhausted,
        learnerTurns,
        activeObjectiveId: coaching.activeObjectiveId,
        activeIndex,
        objectivesTotal: objectives.length,
        objectivesAhead: activeIndex >= 0 ? Math.max(0, objectives.length - 1 - activeIndex) : null,
      }));
      // Серия за диалог: rememberDialogueV2SessionOutcome → [TODAY-TASKS] → [STREAK-DAY] → [STREAK] (ключ дня, ветка).
      console.log('[DIALOG-SUMMARY] streak_request', JSON.stringify({
        localDay: getLocalDayKey(),
        utcDay: new Date().toISOString().slice(0, 10),
        learnerTurns,
        requested: learnerTurns > 0 ? 'activity:dialog' : 'skip:no_learner_turns',
      }));
    }
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
      // зачем (координатор 22.10, «Сцена» Диалогов): день с засчитанным диалогом — состояние day_done; локальная дата, без сети
      markDialogueV2DoneToday();
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
      nav.replace(route as never);
      return;
    }
    // зачем (C24/C38): к итогу — поверх переписки; «назад» с итога вернёт ленту с пилюлей «Итоги».
    coaching.markSummarySeen();
    nav.push(route as never);
  };

  // зачем (владелец 30.09, макет B6): энергия как в уроке — пилюля в шапке, у Plus её нет.
  const { isUnlimited: energyUnlimited, acknowledgeSessionStart, refundActivityStart } = useEnergy();
  energyActionsRef.current = { acknowledge: acknowledgeSessionStart, refund: refundActivityStart };
  if (paused) {
    // зачем (владелец 01.10 / 18.10 «такого не должно быть», координатор 07:46): вместо экрана паузы — тихо в хаб Диалогов.
    return (
      <DialogueHubRedirect
        screen="session"
        reason="paused"
        scenarioId={scenarioId}
        testID="dialogue-v2-session-paused"
        backLabel={labels.back}
        loadingLabel={labels.loading}
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
    // зачем (владелец 01.10 / 18.10 на эмуляторе: «Los diálogos no están disponibles» + «Volver» — «такого не должно быть»):
    // нет сценария / модели / закрыт — без экрана-ошибки тихо в хаб; журнал [DIALOGUE-V2] session → redirect hub с причиной.
    return (
      <DialogueHubRedirect
        screen="session"
        reason={!model ? (state.kind === 'unavailable' ? 'unsupported_target' : 'no_model') : 'locked'}
        scenarioId={scenarioId}
        testID="dialogue-v2-session-unavailable"
        backLabel={labels.back}
        loadingLabel={labels.loading}
        details={{ stateKind: state.kind, hasModel: !!model, unlocked: model?.unlocked ?? null, serverSessionState }}
      />
    );
  }

  const objectiveIndex = coaching.activeObjectiveId
    ? Math.max(0, model.objectives.findIndex((objective) => objective.id === coaching.activeObjectiveId))
    : 0;
  const currentObjective = model.objectives[objectiveIndex] ?? null;
  // зачем (координатор 12.10, dialogs-030/014): сырой и показанный текст цели — одна строка на смену цели, а не на каждый кадр
  if (currentObjective && typeof __DEV__ !== 'undefined' && __DEV__) {
    const goalLogKey = `${currentObjective.id}:${currentObjective.label}`;
    if (goalLogKey !== lastGoalLogKey) {
      lastGoalLogKey = goalLogKey;
      console.log(`[DIALOG-GOAL] card id=${currentObjective.id} index=${objectiveIndex + 1}/${model.objectives.length} raw=${JSON.stringify(currentObjective.label.slice(0, 60))} shown=${JSON.stringify(formatDialogObjectiveLabel(currentObjective.label).slice(0, 60))}`); // guard-ok: сырой и показанный текст цели
    }
  }
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
  const openPlus = () => nav.push({
    pathname: '/premium_modal',
    params: { context: 'dialog_limit', source: 'dialogue_v2_session' },
  } as never);
  // зачем (Макеты / координатор 15.10): голосовая стена D165 (3 голосовых в день) открывала dialog_limit — там текст про месячный
  // лимит ОТВЕТОВ («… ответов в месяц»), человек не понимал, что кончился именно голос. Готовый одобренный контекст ai_voice_input
  // говорит ровно про это («Отвечай голосом · Бесплатно — 3 реплики голосом в день», 9 языков). Стена ответов (onOpenPlus) — прежняя.
  // зачем (п.81): на исчерпанном лимите тап по микрофону — вход в Plus про голос; запись не стартует.
  const startVoice = () => {
    const count = peekDialogVoiceAttempts();
    // зачем (Ревизор R1-a/R1-c): та же проверка, что у всех микрофонов (с запасным режимом при неизвестном доступе)
    const allowed = voiceGate.canStartAttempt(() => { void voice.start(); }); // R43: ожидание доступа → после подтверждения Plus запись стартует сама
    const decision = allowed ? 'allowed' : 'limit_reached';
    console.log('[DIALOG-VOICE] start:tap', JSON.stringify({ count, limit: FREE_DIALOG_VOICE_DAILY_LIMIT, decision, voiceStatus: voice.status }));
    if (decision === 'limit_reached') {
      // пейвол ai_voice_input уже открыл хук (с защитой от двойного тапа и paywall_shown)
      console.log('[DIALOG-VOICE] start:blocked', JSON.stringify({ count, decision, shown: 'premium_modal', context: 'ai_voice_input' }));
      return;
    }
    void voice.start();
  };

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
      // зачем (dialogs-022/029): пилюля с первого кадра из зеркала на телефоне; остаток неизвестен — «—/30» и «Лимит — 30 ответов в месяц» для диктора.
      quotaPill={coaching.quotaView ? {
        text: `${coaching.quotaView.remaining ?? '—'}/${coaching.quotaView.total}`,
        accessibilityLabel: coaching.quotaView.remaining === null
          ? aiDialogMonthlyLimitText(lang, coaching.quotaView.total)
          : coachingLabels.quotaA11y(coaching.quotaView.remaining, coaching.quotaView.total),
      } : null}
      personaIcon={scenarioId ? dialogueScenarioAvatarIcon(scenarioId) : undefined}
      goal={currentObjective ? {
        kicker: coachingLabels.goalKicker(objectiveIndex + 1, model.objectives.length),
        // зачем (координатор 12.10, dialogs-030/014): название цели в карточке с заглавной и без точки, как в брифинге и шторке «Задания» (formatDialogObjectiveLabel); исходный текст не меняется
        label: formatDialogObjectiveLabel(currentObjective.label),
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
      // зачем (К2): имя — того, кто говорил последним (данные диалога), иначе первый собеседник сценки; литералов имён нет.
      typingCaption={dialogueTypingCaption(
        lang,
        typingStage,
        [...messages].reverse().find((message) => message.author === 'persona' && message.authorLabel)?.authorLabel
          ?? model?.participants[0]?.displayName ?? null,
      )}
      turnErrorMessage={turnErrorMessage}
      inputLocked={failureReason === 'plus_daily_cap'}
      /* D123: на потолке Plus повтор сегодня не поможет; C19: при частоте — после остывания. */
      // зачем (кадр «На сегодня разговоров достаточно»): на потолке Plus кнопки «Повторить» нет вовсе, а не блокированной
      retryAvailable={failureReason !== 'plus_daily_cap' && (failureReason !== 'rate_limited' || !rateLimitCooling)}
      retryDisabled={sending || !pendingTurnRef.current || failureReason === 'plus_daily_cap'}
      onRetry={retry}
      onBack={() => safeRouterBack(router, '/ai_dialog_home' as never)}
      onChangeDraft={setDraft}
      onSend={() => { void send(); }}
      micPlusBadge={voiceLimitDecision === 'limit_reached'}
      onStartVoice={startVoice}
      onStopVoice={voice.stop}
      onDiscardVoice={voice.discard}
      onPlayVoice={voice.play}
      onPlayPreparedBotVoice={preparedBotVoice.play}
      onComplete={() => openSummary('manual')}
    />
  );
}

/** V2 text session remains behind the established, neutral AI-dialogue consent gate. */
/**
 * Общий бюджет тихих повторов старта сессии (аудит «пропала сеть», 13.10). Проверяется перед каждым повтором; один вызов ограничен
 * DIALOGUE_V2_SESSION_START_TIMEOUT_MS (22 с), поэтому «недоступно» с «Повторить» появляется не позже ~25 с, а не через минуты.
 */
const DIALOGUE_V2_SESSION_START_BUDGET_MS = 20_000;

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
