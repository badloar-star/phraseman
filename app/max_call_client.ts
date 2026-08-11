// Транспортная машина состояний MAX-звонка (спека, раздел 1: max_call_client).
//
// Зачем отдельный чистый модуль: весь нативный стек (webrtc, incall-manager),
// callable-функции и часы ИНЖЕКТЯТСЯ через deps — ни одного прямого импорта
// react-native-webrtc здесь нет (иначе jest и OTA-бинарник без пакета падают).
// Экран звонка остаётся тонким: он собирает deps из loadMaxVoiceNative() и
// callable-клиентов и слушает колбэки; вся хореография (параллельный минт и
// offer, heartbeat, barge-in, идемпотентный teardown) живёт здесь под тестами.
//
// Фазы: idle → preflight → minting → connecting → configuring → active →
// (reconnecting ⇄ active) → ending → ended | failed. Суб-состояния хода внутри
// active — забота max_call_ui_state: клиент лишь транслирует серверные события
// data channel в MaxCallUiEvent, ничего не выдумывая из локальных таймеров.

import type {
  MaxVoiceNativeModule,
  MediaStreamLike,
  MediaStreamTrackLike,
  RtcDataChannelLike,
  RtcPeerConnectionLike,
} from './max_webrtc_module';
import type { MaxCallUiEvent } from './max_call_ui_state';
import type { TranscriptTurn } from './max_call_transcript';
import type { MaxCallSfx } from './max_call_sfx';
import { parseAudioLevels, type AudioLevelSample } from './max_call_audio_level';
import {
  RECONNECT_GRACE_MS,
  buildReconnectSummary,
  canReconnect,
  makeReconnectChain,
  nextChain,
  type ReconnectChainState,
} from './max_call_reconnect';

/** Heartbeat квоты: 30с (спека §1/§3 heartbeatSec) — elapsed + usage-токены. */
export const MAX_CALL_HEARTBEAT_MS = 30_000;
/**
 * Страховка ручного barge-in: remote-трек глушится на ~300мс, пока сервер
 * обрабатывает response.cancel (per-track громкости в rn-webrtc нет, fade не
 * делаем; дозвучавшие 200–400мс из jitter-буфера — принятая норма, спека §4).
 */
export const MAX_CALL_BARGE_IN_MUTE_MS = 300;
/** Поллинг pc.getStats() для уровней звука (эквалайзер + ореол), спека §1. */
export const MAX_CALL_STATS_POLL_MS = 100;

export type MaxCallPhase =
  | 'idle'
  | 'preflight'
  | 'minting'
  | 'connecting'
  | 'configuring'
  | 'active'
  | 'reconnecting'
  | 'ending'
  | 'ended'
  | 'failed';

/**
 * Клиентские причины завершения. Серверный биллинг знает только
 * completed|capped|dropped|background — клиентский 'failed' (провал минта/SDP)
 * маппится в 'dropped' на границе (toServerEndReason), чтобы контракт
 * maxVoiceSessionEnd не расползался на «наши» внутренние причины.
 */
export type MaxCallEndReason = 'completed' | 'capped' | 'dropped' | 'background' | 'failed';

/** Причины, которые понимает сервер (END_REASONS в max_voice_session_end). */
export type MaxCallServerEndReason = 'completed' | 'capped' | 'dropped' | 'background';

export function toServerEndReason(reason: MaxCallEndReason): MaxCallServerEndReason {
  return reason === 'failed' ? 'dropped' : reason;
}

/**
 * Аккумулятор usage-токенов из response.done — единый контракт heartbeat и
 * сеттлмента: сервер считает деньги по разбивке (аудио дороже текста, кэш
 * дешевле свежего), скалярный total ему бесполезен.
 */
export interface VoiceUsageTotals {
  audioInputTokens: number;
  audioOutputTokens: number;
  cachedTokens: number;
  textTokens: number;
}

export interface MaxVoiceMintRequest {
  format: 'scenario' | 'companion' | 'trial';
  scenarioId?: string;
  cefr?: string;
  /** Имя персонажа — сервер вставляет в {{PERSONA_NAME}} промпта (спека §7). */
  personaName?: string;
  /** Роль персонажа — {{PERSONA_ROLE}} промпта. */
  personaRole?: string;
  /** Текстовый SCENARIO_BLOCK (role/setting/persona/goalEn/objectives) для scenario-формата. */
  scenarioBlock?: string;
  /** COMPANION-память (buildCompanionMemory → текстовый блок) для companion-формата. */
  memoryBlock?: string;
  /** Дешёвый счётчик SRS-элементов — ветвление пробника companion/scenario на сервере. */
  srsCount?: number;
  /** Ре-минт reconnect-чейна: id прежней сессии (перенос остатка резерва). */
  reconnectOf?: string;
  /** Локальная reconnect-summary (шаблонная, без AI) для хвоста инструкций. */
  reconnectSummary?: string;
}

/** Ответ maxVoiceMint (контракт спеки §2: max_voice_mint). */
export interface MaxVoiceMintResponse {
  /** Ephemeral client secret для SDP-обмена с realtime-endpoint. */
  value: string;
  expires_at?: number;
  session_id: string;
  /** Серверный unified deadline в секундах — единственный источник таймера. */
  max_seconds: number;
  /** Текст [WRAP_UP]-инструкции: клиент лишь отправляет его в момент wrap_at. */
  wrapUpText: string;
  limits?: Record<string, unknown>;
  trialVariant?: 'companion' | 'scenario' | null;
}

/**
 * Защитный разбор ответа минта. Живёт здесь (чистый модуль), а не в экране:
 * под jest-контрактом. Сервер по контракту отдаёт ОБА написания ключей
 * (session_id|sessionId, max_seconds|maxSeconds, expires_at|expiresAt) — клиент
 * принимает любое, чтобы version-skew деплоя functions/app не ронял минт уже
 * ПОСЛЕ того, как сервер зарезервировал секунды и оплатил ephemeral-токен.
 * Битый ответ → throw → фаза failed, не краш.
 */
export function parseMintResponse(data: unknown): MaxVoiceMintResponse {
  const d = (data ?? {}) as Record<string, unknown>;
  const str = (...vals: unknown[]): string => {
    for (const v of vals) if (typeof v === 'string' && v !== '') return v;
    return '';
  };
  const num = (...vals: unknown[]): number | undefined => {
    for (const v of vals) if (typeof v === 'number' && Number.isFinite(v)) return v;
    return undefined;
  };
  const value = str(d.value);
  const sessionId = str(d.session_id, d.sessionId);
  const maxSeconds = num(d.max_seconds, d.maxSeconds) ?? 0;
  if (value === '' || sessionId === '' || maxSeconds <= 0) throw new Error('mint_malformed');
  return {
    value,
    session_id: sessionId,
    max_seconds: maxSeconds,
    wrapUpText: str(d.wrapUpText) || '[WRAP_UP]',
    limits:
      d.limits !== null && typeof d.limits === 'object'
        ? (d.limits as Record<string, unknown>)
        : undefined,
    expires_at: num(d.expires_at, d.expiresAt),
    trialVariant:
      d.trialVariant === 'companion' || d.trialVariant === 'scenario' ? d.trialVariant : null,
  };
}

/** Дефолтный кап чейна (спека §3 reconnectChainMax) — если limits не доехали. */
const RECONNECT_CAPS_DEFAULT = { auto: 2, manual: 1 };

/** Кап reconnect-чейна из limits минта; битые значения → дефолты спеки. */
export function reconnectCapsFromLimits(
  limits: Record<string, unknown> | undefined,
): { auto: number; manual: number } {
  const raw = limits?.reconnectChainMax;
  if (raw === null || typeof raw !== 'object') return RECONNECT_CAPS_DEFAULT;
  const o = raw as Record<string, unknown>;
  const pick = (v: unknown, fallback: number): number =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback;
  return {
    auto: pick(o.auto, RECONNECT_CAPS_DEFAULT.auto),
    manual: pick(o.manual, RECONNECT_CAPS_DEFAULT.manual),
  };
}

// Подсчёт слов транскрипта: та же «lowercase-латиница с апострофом» токенизация,
// что в max_voice_metrics, — сервер сверяет transcriptWordCount с XP-формулой,
// и клиентские числа не должны зависеть от пунктуации ASR.
function countWords(text: string): number {
  return (text.match(/[a-z0-9]+(?:'[a-z]+)*/gi) ?? []).length;
}

/**
 * Обогащение payload'а maxVoiceSessionEnd из истории транскрипта: реплики и
 * слова считаются ТОЛЬКО по ходам ученика — XP-формула сервера платит за его
 * речь, а не за красноречие ассистента.
 */
export function sessionEndEnrichment(history: TranscriptTurn[]): {
  repliesCount: number;
  transcriptWordCount: number;
} {
  let repliesCount = 0;
  let transcriptWordCount = 0;
  for (const turn of history) {
    if (turn.role !== 'user') continue;
    repliesCount += 1;
    transcriptWordCount += countWords(turn.text);
  }
  return { repliesCount, transcriptWordCount };
}

/** События транскрипта — форма под max_call_transcript.TranscriptBuffer. */
export type MaxCallTranscriptEvent =
  | { kind: 'assistant_delta'; itemId: string; delta: string }
  | { kind: 'assistant_done'; itemId: string }
  | { kind: 'user_final'; text: string };

export interface MaxCallDeps {
  /** Нативный стек из loadMaxVoiceNative() — вызывающий гарантирует не-null. */
  native: MaxVoiceNativeModule;
  mint(req: MaxVoiceMintRequest): Promise<MaxVoiceMintResponse>;
  heartbeat(req: {
    sessionId: string;
    elapsedSec: number;
    usage: VoiceUsageTotals;
  }): Promise<unknown>;
  end(req: {
    sessionId: string;
    endReason: MaxCallServerEndReason;
    elapsedSec: number;
    usage: VoiceUsageTotals;
  }): Promise<unknown>;
  /**
   * SDP-обмен: POST offer.sdp с ephemeral-токеном → answer.sdp. Инжектится,
   * чтобы транспорт не знал ни URL, ни fetch — и целиком мокался в jest.
   */
  exchangeSdp(offerSdp: string, clientSecret: string): Promise<string>;
  /** Дешёвый maxVoicePreflight; отсутствие = пропустить фазу (уже сделан на пре-экране). */
  preflight?(): Promise<unknown>;
  /** Восстановление audio_session_coordinator после InCallManager.stop(). */
  restoreAudioSession?(): Promise<unknown> | void;
  now(): number;
  onUiEvent?(event: MaxCallUiEvent): void;
  onTranscriptDelta?(event: MaxCallTranscriptEvent): void;
  onLevels?(sample: AudioLevelSample): void;
  onPhase?(phase: MaxCallPhase): void;
  /**
   * История транскрипта для reconnect-summary ре-минта. Транскрипт живёт у
   * экрана (буфер с 250мс-флашем) — клиент лишь спрашивает снапшот в момент
   * обрыва, чтобы не дублировать состояние.
   */
  reconnectHistory?(): TranscriptTurn[];
  /**
   * Сигналы границ звонка (спека §1 max_call_sfx): connect-cue ДО
   * InCallManager.start(), end-нота ПОСЛЕ stop(), mid-call — только haptics.
   */
  sfx?: MaxCallSfx;
}

export interface MaxCallClient {
  phase(): MaxCallPhase;
  sessionId(): string | null;
  /** Серверные данные минта (null до фазы connecting). */
  mintResult(): MaxVoiceMintResponse | null;
  /** Аккумулятор usage-токенов из response.done (для heartbeat/сеттлмента). */
  usageTotals(): VoiceUsageTotals;
  start(req: MaxVoiceMintRequest): Promise<void>;
  /** Мьют локального микрофона (grace при blur, reconnect-фаза 1). */
  setMuted(muted: boolean): void;
  /**
   * Ручной barge-in (кнопка стоп): response.cancel + output_audio_buffer.clear
   * + remote-трек тихий на 300мс. Серверный barge-in (semantic_vad) — основной
   * путь и в этом методе не нуждается.
   */
  bargeIn(): void;
  /** Отправить серверный wrapUpText как [WRAP_UP] conversation-item + response. */
  sendWrapUp(): void;
  /** Одноразовый response.create с инструкцией подсказки (кап injected-токенов). */
  sendHintResponse(instructions: string, maxOutputTokens?: number): void;
  /**
   * Идемпотентный teardown: повторный вызов возвращает тот же промис, каждый
   * нативный ресурс закрывается ровно один раз, отчёт maxVoiceSessionEnd — один.
   */
  end(reason?: MaxCallEndReason): Promise<void>;
}

/** Кап injected-ответов (подсказки/wrap-up) — спека §3 maxResponseOutputTokens. */
const INJECTED_MAX_TOKENS = 400;

export function createMaxCallClient(deps: MaxCallDeps): MaxCallClient {
  let phase: MaxCallPhase = 'idle';
  let pc: RtcPeerConnectionLike | null = null;
  let dc: RtcDataChannelLike | null = null;
  let localStream: MediaStreamLike | null = null;
  let remoteTrack: MediaStreamTrackLike | null = null;
  let mint: MaxVoiceMintResponse | null = null;
  let startedAtMs: number | null = null;
  const usage: VoiceUsageTotals = {
    audioInputTokens: 0,
    audioOutputTokens: 0,
    cachedTokens: 0,
    textTokens: 0,
  };
  let inCallStarted = false;

  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let statsTimer: ReturnType<typeof setInterval> | null = null;
  let bargeTimer: ReturnType<typeof setTimeout> | null = null;
  let statsInFlight = false;

  // Reconnect-чейн (спека §1 max_call_reconnect): исходный запрос — для
  // ре-минта, chain — кап попыток, graceTimer — фаза 1 (4с тишины с мьютом).
  let startReq: MaxVoiceMintRequest | null = null;
  let chain: ReconnectChainState | null = null;
  let graceTimer: ReturnType<typeof setTimeout> | null = null;
  let reminting = false;
  // Мьют, который ПРОСИЛ юзер: grace-мьют реконнекта не должен «размьючивать»
  // человека, замьютившегося кнопкой, после восстановления линии.
  let userMuted = false;

  // Идемпотентность teardown: один закэшированный промис на всю жизнь клиента.
  let endPromise: Promise<void> | null = null;

  function setPhase(next: MaxCallPhase): void {
    if (phase === next) return;
    phase = next;
    try {
      deps.onPhase?.(next);
    } catch {
      // Колбэк UI не имеет права ронять транспорт.
    }
  }

  function emitUi(event: MaxCallUiEvent): void {
    try {
      deps.onUiEvent?.(event);
    } catch {
      // См. setPhase: колбэки — не наша ответственность.
    }
  }

  function emitTranscript(event: MaxCallTranscriptEvent): void {
    try {
      deps.onTranscriptDelta?.(event);
    } catch {
      /* как выше */
    }
  }

  function elapsedSec(): number {
    if (startedAtMs === null) return 0;
    const ms = deps.now() - startedAtMs;
    return ms > 0 ? Math.round(ms / 1000) : 0;
  }

  function dcSend(payload: Record<string, unknown>): boolean {
    if (!dc) return false;
    // readyState может отсутствовать в моках/старых сборках — тогда пробуем.
    if (dc.readyState !== undefined && dc.readyState !== 'open') return false;
    try {
      dc.send(JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  }

  function sendHeartbeat(): void {
    if (!mint) return;
    // Ошибки heartbeat глотаем: пропущенный тик не повод рвать живой звонок —
    // экономическую границу держит серверный watchdog.
    void Promise.resolve(
      deps.heartbeat({ sessionId: mint.session_id, elapsedSec: elapsedSec(), usage: { ...usage } }),
    ).catch(() => {});
  }

  function pollStats(): void {
    const currentPc = pc;
    if (!currentPc || !deps.onLevels || statsInFlight) return;
    statsInFlight = true;
    void Promise.resolve()
      .then(() => currentPc.getStats())
      .then((stats) => {
        statsInFlight = false;
        if (phase === 'active' || phase === 'reconnecting') {
          deps.onLevels?.(parseAudioLevels(stats));
        }
      })
      .catch(() => {
        statsInFlight = false;
      });
  }

  /**
   * Аккумулятор usage из response.done — источник heartbeat/сеттлмента.
   * Суммируем МОНОТОННО по разбивке input/output_token_details: сервер считает
   * стоимость по типам токенов (аудио ≫ текст, кэш дешевле), скалярный
   * total_tokens для биллинга бесполезен. Отрицательные/битые значения
   * игнорируются — аккумулятор никогда не убывает.
   */
  function accumulateUsage(message: Record<string, unknown>): void {
    const response = message.response as Record<string, unknown> | undefined;
    const u = response?.usage as Record<string, unknown> | undefined;
    if (!u) return;
    const add = (details: unknown, key: string, into: keyof VoiceUsageTotals): void => {
      if (details === null || typeof details !== 'object') return;
      const v = (details as Record<string, unknown>)[key];
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) usage[into] += v;
    };
    const input = u.input_token_details;
    const output = u.output_token_details;
    add(input, 'audio_tokens', 'audioInputTokens');
    add(input, 'cached_tokens', 'cachedTokens');
    add(input, 'text_tokens', 'textTokens');
    add(output, 'audio_tokens', 'audioOutputTokens');
    add(output, 'text_tokens', 'textTokens');
  }

  function handleDcMessage(raw: unknown): void {
    if (typeof raw !== 'string') return;
    let message: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed === null || typeof parsed !== 'object') return;
      message = parsed as Record<string, unknown>;
    } catch {
      return; // Битый пакет — шум, не повод падать.
    }
    const type = message.type;
    if (typeof type !== 'string') return;

    switch (type) {
      case 'input_audio_buffer.speech_started':
        emitUi({ type: 'speech_started' });
        return;
      case 'input_audio_buffer.speech_stopped':
        emitUi({ type: 'speech_stopped' });
        return;
      case 'response.created':
        emitUi({ type: 'response_created' });
        return;
      case 'output_audio_buffer.started':
        emitUi({ type: 'audio_out_started' });
        return;
      case 'output_audio_buffer.stopped':
        emitUi({ type: 'audio_out_stopped' });
        return;
      case 'output_audio_buffer.cleared':
        emitUi({ type: 'audio_out_cleared' });
        return;
      case 'response.done':
        accumulateUsage(message);
        emitUi({ type: 'response_done' });
        return;
      // Транскрипт ИИ: оба имени события (версии Realtime API расходятся).
      case 'response.output_audio_transcript.delta':
      case 'response.audio_transcript.delta': {
        const itemId = typeof message.item_id === 'string' ? message.item_id : '';
        const delta = typeof message.delta === 'string' ? message.delta : '';
        if (delta) emitTranscript({ kind: 'assistant_delta', itemId, delta });
        return;
      }
      case 'response.output_audio_transcript.done':
      case 'response.audio_transcript.done': {
        const itemId = typeof message.item_id === 'string' ? message.item_id : '';
        emitTranscript({ kind: 'assistant_done', itemId });
        return;
      }
      // Реплика юзера — только финальная (interim в Realtime нет, спека §1).
      case 'conversation.item.input_audio_transcription.completed': {
        const text = typeof message.transcript === 'string' ? message.transcript : '';
        if (text) emitTranscript({ kind: 'user_final', text });
        return;
      }
      case 'error':
        // 'already has active response' и прочие гонки — тихий no-op (спека §1):
        // сервер сам разрулил, клиенту реагировать не на что.
        return;
      default:
        return; // Неизвестные события Realtime — вперёд-совместимый шум.
    }
  }

  function activate(): void {
    if (phase !== 'configuring') return;
    startedAtMs = deps.now();
    // Сигналы на границах владения аудиосессией (спека §1 max_call_sfx):
    // connect-чирп играем ДО InCallManager.start() — после него аудио-роутинг
    // принадлежит звонку, и cue поверх voiceChat-сессии не гарантирован.
    try {
      deps.sfx?.connectCue();
    } catch {}
    try {
      deps.native.InCallManager.start({ media: 'audio' });
      inCallStarted = true;
      try {
        deps.sfx?.audioSessionAcquired();
      } catch {}
    } catch {
      inCallStarted = false;
    }
    heartbeatTimer = setInterval(sendHeartbeat, MAX_CALL_HEARTBEAT_MS);
    if (deps.onLevels) statsTimer = setInterval(pollStats, MAX_CALL_STATS_POLL_MS);
    setPhase('active');
    emitUi({ type: 'connected' });
  }

  function applyTrackMute(muted: boolean): void {
    for (const track of localStream?.getTracks() ?? []) {
      track.enabled = !muted;
    }
  }

  /**
   * Фаза 2 реконнекта: grace истёк, ICE не ожил — рвём старый PC и ре-минтим
   * сессию с reconnectOf (сервер атомарно переносит остаток резерва) и
   * локальной шаблонной summary, чтобы ИИ продолжил «с того же места».
   * Кап чейна из limits минта (canReconnect/nextChain); исчерпан → failed.
   */
  async function doRemint(kind: 'auto' | 'manual'): Promise<void> {
    if (isTornDown() || phase !== 'reconnecting' || reminting) return;
    const prevMint = mint;
    if (!prevMint || !startReq || !chain) {
      await fail('reconnect_exhausted');
      return;
    }
    const caps = reconnectCapsFromLimits(prevMint.limits);
    if (!canReconnect(chain, kind, caps)) {
      await fail('reconnect_exhausted');
      return;
    }
    chain = nextChain(chain, kind);
    reminting = true;

    // Teardown только транспорта (PC/DC/треки) — сессия звонка продолжается:
    // InCallManager и heartbeat не трогаем, владение аудиосессией не отдаём.
    try {
      dc?.close();
    } catch {}
    dc = null;
    try {
      pc?.close();
    } catch {}
    pc = null;
    try {
      for (const track of localStream?.getTracks() ?? []) {
        try {
          track.stop();
        } catch {}
      }
    } catch {}
    localStream = null;
    remoteTrack = null;

    try {
      // Summary собирается локально по шаблону (без AI): сеть уже подвела,
      // лишний сетевой вызов здесь только увеличил бы шанс потерять звонок.
      const history = deps.reconnectHistory?.() ?? [];
      const reconnectSummary = buildReconnectSummary(history, {});
      const mintResult = await deps.mint({
        ...startReq,
        reconnectOf: prevMint.session_id,
        reconnectSummary,
      });
      if (isTornDown()) {
        reminting = false;
        return;
      }

      // Новый PC/DC: присваиваем в поля сразу, чтобы конкурирующий end()
      // закрыл их своим teardown'ом, а не оставил висеть.
      const connection = new deps.native.RTCPeerConnection({});
      pc = connection;
      wirePeerConnection(connection);
      const stream = await deps.native.mediaDevices.getUserMedia({ audio: true });
      localStream = stream;
      for (const track of stream.getTracks()) connection.addTrack(track, stream);
      const channel = connection.createDataChannel('oai-events');
      dc = channel;
      const offer = await connection.createOffer({});
      await connection.setLocalDescription(offer);
      const answerSdp = await deps.exchangeSdp(offer.sdp, mintResult.value);
      if (isTornDown()) {
        reminting = false;
        return;
      }
      await connection.setRemoteDescription({ type: 'answer', sdp: answerSdp });
      mint = mintResult;
      channel.onmessage = (event) => handleDcMessage(event?.data);
      const finish = (): void => {
        if (isTornDown() || phase !== 'reconnecting') return;
        // Снимаем grace-мьют, возвращая ровно то состояние, что просил юзер.
        applyTrackMute(userMuted);
        setPhase('active');
        emitUi({ type: 'reconnected' });
        try {
          deps.sfx?.midCall('reconnected');
        } catch {}
      };
      channel.onopen = finish;
      reminting = false;
      if (channel.readyState === 'open') finish();
    } catch {
      reminting = false;
      if (isTornDown()) return;
      // Ре-минт не удался: следующая попытка, пока кап чейна позволяет;
      // исчерпание капа внутри doRemint честно завершит звонок failed'ом.
      await doRemint(kind);
    }
  }

  function wirePeerConnection(connection: RtcPeerConnectionLike): void {
    connection.ontrack = (event) => {
      if (connection !== pc) return; // событие от уже похороненного PC — шум
      if (event?.track) remoteTrack = event.track;
    };
    connection.oniceconnectionstatechange = () => {
      if (connection !== pc) return; // stale PC после ре-минта
      const state = connection.iceConnectionState;
      if (state === 'disconnected' || state === 'failed') {
        // Фаза 1 реконнекта: grace 4с с мьютом локального трека, ничего не
        // рвём — мобильные сети часто восстанавливаются сами. Не ожило —
        // фаза 2 (полный ре-минт) в doRemint.
        if (phase === 'active') {
          setPhase('reconnecting');
          emitUi({ type: 'reconnect_started' });
          try {
            deps.sfx?.midCall('reconnect_started');
          } catch {}
          applyTrackMute(true);
          if (graceTimer !== null) clearTimeout(graceTimer);
          graceTimer = setTimeout(() => {
            graceTimer = null;
            void doRemint('auto');
          }, RECONNECT_GRACE_MS);
        }
        return;
      }
      if ((state === 'connected' || state === 'completed') && phase === 'reconnecting') {
        // ICE ожил в grace-окне — тот же PC, ре-минт не нужен.
        if (graceTimer !== null) {
          clearTimeout(graceTimer);
          graceTimer = null;
        }
        applyTrackMute(userMuted);
        setPhase('active');
        emitUi({ type: 'reconnected' });
        try {
          deps.sfx?.midCall('reconnected');
        } catch {}
      }
    };
  }

  function isTornDown(): boolean {
    return phase === 'ending' || phase === 'ended' || phase === 'failed';
  }

  async function doTeardown(reason: MaxCallEndReason, failMessage: string | null): Promise<void> {
    const hadSession = mint !== null;
    const finalElapsed = elapsedSec();
    setPhase('ending');

    // Каждый шаг в своём try/catch: полузакрытый нативный стек не должен
    // мешать закрыть остальное — teardown обязан дойти до конца всегда.
    if (heartbeatTimer !== null) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (statsTimer !== null) {
      clearInterval(statsTimer);
      statsTimer = null;
    }
    if (bargeTimer !== null) {
      clearTimeout(bargeTimer);
      bargeTimer = null;
    }
    if (graceTimer !== null) {
      clearTimeout(graceTimer);
      graceTimer = null;
    }
    try {
      dc?.close();
    } catch {}
    dc = null;
    try {
      pc?.close();
    } catch {}
    pc = null;
    try {
      for (const track of localStream?.getTracks() ?? []) {
        try {
          track.stop();
        } catch {}
      }
    } catch {}
    localStream = null;
    remoteTrack = null;
    const ownedAudioSession = inCallStarted;
    if (inCallStarted) {
      try {
        deps.native.InCallManager.stop();
      } catch {}
      inCallStarted = false;
      try {
        deps.sfx?.audioSessionReleased();
      } catch {}
    }
    try {
      await deps.restoreAudioSession?.();
    } catch {}
    // End-нота ПОСЛЕ InCallManager.stop() (граница владения аудиосессией) и
    // только если звонок реально был активен — провал соединения без «алло»
    // не заслуживает прощальной ноты.
    if (ownedAudioSession) {
      try {
        deps.sfx?.endCue();
      } catch {}
    }

    // Отчёт сеттлмента — один раз и только если сессия была заминчена
    // (до минта серверу нечего закрывать, release резерва делает preflight-слой).
    if (hadSession && mint) {
      try {
        await deps.end({
          sessionId: mint.session_id,
          // Клиентский 'failed' сервер не знает — маппим в 'dropped'.
          endReason: toServerEndReason(reason),
          elapsedSec: finalElapsed,
          usage: { ...usage },
        });
      } catch {
        // Недоотчитавшуюся сессию дожмёт серверный watchdog по heartbeat.
      }
    }

    if (failMessage !== null) {
      setPhase('failed');
      emitUi({ type: 'fail', reason: failMessage });
    } else {
      setPhase('ended');
      emitUi({ type: 'end' });
    }
  }

  function end(reason: MaxCallEndReason = 'completed'): Promise<void> {
    if (endPromise) return endPromise;
    endPromise = doTeardown(reason, null);
    return endPromise;
  }

  function fail(message: string): Promise<void> {
    if (endPromise) return endPromise;
    endPromise = doTeardown('failed', message);
    return endPromise;
  }

  async function start(req: MaxVoiceMintRequest): Promise<void> {
    if (phase !== 'idle') return; // Повторный start — программная ошибка, no-op.
    startReq = req; // запоминаем для ре-минтов reconnect-чейна

    setPhase('preflight');
    if (deps.preflight) {
      try {
        await deps.preflight();
      } catch {
        await fail('preflight_failed');
        return;
      }
    }
    if (isTornDown()) return;

    setPhase('minting');
    // createOffer/ICE gathering — ПАРАЛЛЕЛЬНО с минтом (offer токена не требует,
    // спека §1): пока сервер резервирует квоту, локальный стек уже готов.
    const offerPromise = (async () => {
      const connection = new deps.native.RTCPeerConnection({});
      wirePeerConnection(connection);
      const stream = await deps.native.mediaDevices.getUserMedia({ audio: true });
      for (const track of stream.getTracks()) connection.addTrack(track, stream);
      const channel = connection.createDataChannel('oai-events');
      const offer = await connection.createOffer({});
      await connection.setLocalDescription(offer);
      return { connection, stream, channel, offer };
    })();

    let mintResult: MaxVoiceMintResponse;
    let local: Awaited<typeof offerPromise>;
    try {
      [local, mintResult] = await Promise.all([offerPromise, deps.mint(req)]);
    } catch {
      // Минт или нативный стек упали до соединения: закрываем то, что успело
      // создаться (offerPromise мог завершиться после reject минта).
      void offerPromise
        .then((created) => {
          try {
            created.connection.close();
          } catch {}
          for (const track of created.stream.getTracks()) {
            try {
              track.stop();
            } catch {}
          }
        })
        .catch(() => {});
      await fail('mint_or_media_failed');
      return;
    }
    if (isTornDown()) {
      // end() позвали во время минта: teardown уже прошёл без нативных ссылок —
      // дозакрываем созданное здесь.
      try {
        local.connection.close();
      } catch {}
      for (const track of local.stream.getTracks()) {
        try {
          track.stop();
        } catch {}
      }
      return;
    }

    pc = local.connection;
    localStream = local.stream;
    dc = local.channel;
    mint = mintResult;
    // Корень reconnect-чейна — первая сессия: по нему сервер связывает биллинг.
    chain = makeReconnectChain(mintResult.session_id);
    dc.onmessage = (event) => handleDcMessage(event?.data);
    dc.onopen = () => activate();

    setPhase('connecting');
    let answerSdp: string;
    try {
      answerSdp = await deps.exchangeSdp(local.offer.sdp, mintResult.value);
    } catch {
      await fail('sdp_exchange_failed');
      return;
    }
    if (isTornDown()) return;

    setPhase('configuring');
    try {
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
    } catch {
      await fail('set_remote_description_failed');
      return;
    }
    // Data channel мог открыться до того, как мы навесили onopen (гонка в
    // нативном стеке) — проверяем готовность явно.
    if (!isTornDown() && dc && dc.readyState === 'open') activate();
  }

  function setMuted(muted: boolean): void {
    userMuted = muted; // grace-мьют реконнекта временный, воля юзера — здесь
    applyTrackMute(muted);
  }

  function bargeIn(): void {
    if (phase !== 'active') return;
    dcSend({ type: 'response.cancel' });
    dcSend({ type: 'output_audio_buffer.clear' });
    // Страховка: сервер уже отменяет, но jitter-буфер дозвучивает — глушим
    // remote-трек на 300мс, чтобы «стоп» ощущался мгновенным.
    if (remoteTrack) {
      remoteTrack.enabled = false;
      if (bargeTimer !== null) clearTimeout(bargeTimer);
      bargeTimer = setTimeout(() => {
        bargeTimer = null;
        if (remoteTrack) remoteTrack.enabled = true;
      }, MAX_CALL_BARGE_IN_MUTE_MS);
    }
  }

  function sendWrapUp(): void {
    if (!mint || isTornDown()) return;
    // Текст [WRAP_UP] сгенерён сервером в минте — клиент лишь доставляет его
    // в назначенный момент (session.update запрещён конвенцией, спека §4).
    dcSend({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: mint.wrapUpText }],
      },
    });
    dcSend({
      type: 'response.create',
      response: { max_output_tokens: INJECTED_MAX_TOKENS },
    });
    emitUi({ type: 'wrap_up' });
  }

  function sendHintResponse(instructions: string, maxOutputTokens = INJECTED_MAX_TOKENS): void {
    if (isTornDown()) return;
    // Гонку с активным response сервер вернёт error-событием — оно no-op.
    dcSend({
      type: 'response.create',
      response: { instructions, max_output_tokens: maxOutputTokens },
    });
  }

  return {
    phase: () => phase,
    sessionId: () => mint?.session_id ?? null,
    mintResult: () => mint,
    usageTotals: () => ({ ...usage }),
    start,
    setMuted,
    bargeIn,
    sendWrapUp,
    sendHintResponse,
    end,
  };
}

/* expo-router route shim: файлы в app/ считаются роутами и требуют default export. */
export default function __RouteShim() {
  return null;
}
