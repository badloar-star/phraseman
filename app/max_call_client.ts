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
import type { Lang } from '../constants/i18n';
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
/**
 * Поллинг pc.getStats() для уровней звука. 4 Гц достаточно для сглаженной
 * native-анимации и не забивает JS/native bridge на iPhone во время речи.
 */
export const MAX_CALL_STATS_POLL_MS = 250;
/** Верхняя граница ожидания минта/локального offer до контролируемого отказа. */
export const MAX_CALL_START_TIMEOUT_MS = 35_000;
/** После answer SDP data channel обязан открыться; вечного connecting не бывает. */
export const MAX_CALL_CONNECT_TIMEOUT_MS = 20_000;
/**
 * React Native WebRTC дописывает ICE-кандидаты в localDescription асинхронно.
 * Realtime SDP endpoint не предоставляет отдельный trickle-канал, поэтому
 * коротко ждём complete и отправляем уже обновлённый SDP. Таймаут не даёт
 * медленному ICE заблокировать общий старт звонка.
 * зачем: 1000мс, а не 2500 — владелец 2026-08-16: соединение должно быть
 * мгновенным. Без STUN/TURN host-кандидаты собираются за десятки мс, а Realtime
 * поднимает соединение и по offer без кандидатов (официальный quickstart шлёт
 * SDP сразу после createOffer). Ожидание — только вежливая страховка, и когда
 * минт уже готов заранее (premint), именно оно становилось критическим путём.
 */
export const MAX_CALL_ICE_GATHER_TIMEOUT_MS = 1_000;
/**
 * Пока ИИ здоровается, локальный микрофон закрыт (track.enabled=false → в
 * канал идёт тишина). зачем: владелец 2026-08-16 — «при старте начинает
 * говорить много реплик, обрывает их сама и снова говорит»: шум комнаты /
 * остаток эха с громкой связи / «алло?» ученика в первые секунды срабатывали
 * как speech_started и рвали приветствие через interrupt_response, а VAD тут
 * же создавал новый ответ. Приветствие теперь звучит целиком; страховочный
 * таймер снимает удержание даже если серверные события не пришли.
 */
export const MAX_CALL_GREETING_HOLD_MAX_MS = 20_000;
/**
 * Realtime сообщает начало output-аудио отдельно от WebRTC ontrack. Если
 * аудио уже «играет», а remote track так и не появился, транспорт поднялся
 * наполовину: один контролируемый reconnect лучше вечного немого урока.
 */
export const MAX_CALL_REMOTE_TRACK_GRACE_MS = 750;

export async function completeLocalOfferSdp(
  connection: RtcPeerConnectionLike,
  initialSdp: string,
): Promise<string> {
  const current = (): string => connection.localDescription?.sdp || initialSdp;
  // Старый нативный модуль/тестовый стаб без этого API: сохраняем совместимость.
  if (typeof connection.iceGatheringState !== 'string') return current();
  if (connection.iceGatheringState === 'complete') return current();

  await new Promise<void>((resolve) => {
    let settled = false;
    const previous = connection.onicegatheringstatechange ?? null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const finish = (): void => {
      if (settled) return;
      settled = true;
      if (timeoutId !== null) clearTimeout(timeoutId);
      connection.onicegatheringstatechange = previous;
      resolve();
    };
    // Таймер ставим до handler: нативное событие может прийти между двумя
    // JS-операциями; в обратном порядке оно оставляло бы осиротевший timeout.
    timeoutId = setTimeout(finish, MAX_CALL_ICE_GATHER_TIMEOUT_MS);
    connection.onicegatheringstatechange = () => {
      try { previous?.(); } catch {}
      if (connection.iceGatheringState === 'complete') finish();
    };
    // Состояние могло смениться между первой проверкой и установкой handler.
    if (connection.iceGatheringState === 'complete') {
      finish();
      return;
    }
  });
  return current();
}

export type MaxCallPhase =
  | 'idle'
  | 'preflight'
  | 'minting'
  | 'connecting'
  | 'configuring'
  | 'active'
  | 'reconnecting'
  | 'reconnect_failed'
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
  /** Новые клиенты разделяют текст по направлению; optional для старых callers. */
  textInputTokens?: number;
  textOutputTokens?: number;
  /** Совместимый total для старых серверов/сохранённых документов. */
  textTokens: number;
}

export interface MaxVoiceMintRequest {
  /** 'tutor' — урок-звонок с личным учителем (вариант A, владелец 2026-08-16). */
  format: 'scenario' | 'companion' | 'trial' | 'tutor';
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
  /** Защищённый тестовый вход из DEV Hub; сервер принимает только admin claim. */
  devMode?: boolean;
  /** Ре-минт reconnect-чейна: id прежней сессии (перенос остатка резерва). */
  reconnectOf?: string;
  /** Локальная reconnect-summary (шаблонная, без AI) для хвоста инструкций. */
  reconnectSummary?: string;
  /** Учитель: язык интерфейса ученика (родной язык объяснений для новичков). */
  interfaceLang?: string;
  /** Учитель: изучаемый язык ('en' | 'fr'). */
  studyTarget?: string;
  /** Учитель: каталог сцен «id: сеттинг» — из ai_dialog_scenarios (сервер сцен не знает). */
  sceneCatalog?: string;
  /** Учитель: снимок ученика (имя, серия, тренажёр, слабые слова) для промпта. */
  learnerSnapshot?: string;
}

/** Блок учителя в ответе минта: имя, инструкция приветствия, память для UI. */
export interface MaxVoiceTutorInfo {
  name: string;
  greetingInstructions: string;
  lessonsSoFar: number;
  homework: string[];
  nextTopic: string;
  /** План сегодняшнего урока (ступень 1): тип и созревшие фразы для повторения. */
  plan?: {
    lessonType: 'new_material' | 'review_and_scene' | 'free_talk';
    duePhrases: string[];
    scenesDone: number;
    scenesTotal: number;
    /** Текущая речевая цель карты (null — все закрыты). */
    goal: { id: string; level: string; title: { en: string; ru: string; uk: string } & Partial<Record<Lang, string>>; mastery: number; sceneIds: string[] } | null;
    /** Ступень 3: ближайшие уроки (тип + цель), детерминированный план сервера. */
    upcoming: {
      ordinal: number;
      lessonType: 'new_material' | 'review_and_scene' | 'free_talk';
      goal: { id: string; level: string; title: { en: string; ru: string; uk: string } & Partial<Record<Lang, string>> } | null;
    }[];
  };
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
  /** Только формат 'tutor'. */
  tutor?: MaxVoiceTutorInfo;
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
    ...(d.tutor !== null && typeof d.tutor === 'object' ? { tutor: parseTutorInfo(d.tutor as Record<string, unknown>) } : {}),
  };
}

function parseTutorInfo(t: Record<string, unknown>): MaxVoiceTutorInfo {
  const strList = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').slice(0, 6) : [];
  return {
    name: typeof t.name === 'string' && t.name.trim() !== '' ? t.name.trim().slice(0, 24) : 'Max',
    greetingInstructions: typeof t.greetingInstructions === 'string' ? t.greetingInstructions : '',
    lessonsSoFar: typeof t.lessonsSoFar === 'number' && Number.isFinite(t.lessonsSoFar) ? Math.max(0, Math.floor(t.lessonsSoFar)) : 0,
    homework: strList(t.homework),
    nextTopic: typeof t.nextTopic === 'string' ? t.nextTopic.slice(0, 140) : '',
    ...(t.plan !== null && typeof t.plan === 'object' ? { plan: parseTutorPlan(t.plan as Record<string, unknown>) } : {}),
  };
}

function parseTutorPlan(p: Record<string, unknown>): NonNullable<MaxVoiceTutorInfo['plan']> {
  const lt = p.lessonType;
  const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0);
  return {
    lessonType: lt === 'review_and_scene' || lt === 'free_talk' ? lt : 'new_material',
    duePhrases: Array.isArray(p.duePhrases) ? p.duePhrases.filter((x): x is string => typeof x === 'string').slice(0, 6) : [],
    scenesDone: n(p.scenesDone),
    scenesTotal: n(p.scenesTotal),
    goal: parseTutorGoal(p.goal),
    upcoming: Array.isArray(p.upcoming)
      ? p.upcoming.slice(0, 7).flatMap((item) => {
          const o = (item ?? {}) as Record<string, unknown>;
          const lessonType = o.lessonType === 'review_and_scene' || o.lessonType === 'free_talk' ? o.lessonType : 'new_material';
          const goal = parseTutorGoal(o.goal);
          return [{ ordinal: n(o.ordinal), lessonType, goal: goal ? { id: goal.id, level: goal.level, title: goal.title } : null }];
        })
      : [],
  };
}

function parseTutorGoal(g: unknown): NonNullable<MaxVoiceTutorInfo['plan']>['goal'] {
  if (!g || typeof g !== 'object') return null;
  const o = g as Record<string, unknown>;
  const title = (o.title && typeof o.title === 'object' ? o.title : {}) as Record<string, unknown>;
  const str = (v: unknown): string => (typeof v === 'string' ? v : '');
  if (!str(o.id)) return null;
  return {
    id: str(o.id),
    level: str(o.level) || 'A1',
    title: { en: str(title.en), ru: str(title.ru), uk: str(title.uk) },
    mastery: typeof o.mastery === 'number' && Number.isFinite(o.mastery) ? Math.min(3, Math.max(0, Math.floor(o.mastery))) : 0,
    sceneIds: Array.isArray(o.sceneIds)
      ? o.sceneIds.filter((item): item is string => typeof item === 'string' && item.trim() !== '').slice(0, 8)
      : [],
  };
}

/** Вызов инструмента моделью (Realtime function calling) — учитель просит клиент что-то сделать. */
export interface MaxCallToolCall {
  name: string;
  callId: string;
  /** Уже разобранные аргументы (битый JSON → {}). */
  args: Record<string, unknown>;
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
    /** От активации транспорта до первого фактически начавшегося звука MAX. */
    firstRemoteAudioLatencyMs?: number;
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
  /**
   * Учитель вызвал инструмент (start_scene / assign_homework / end_call…).
   * Экран исполняет его локально и отвечает через sendToolResult.
   */
  onToolCall?(call: MaxCallToolCall): void;
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
   * + remote-трек тихий на 300мс. Автоматический VAD-barge-in на сервере
   * выключен: он путал эхо громкой связи с учеником и обрывал фразы MAX.
   */
  bargeIn(): void;
  /** Отправить серверный wrapUpText как [WRAP_UP] conversation-item + response. */
  sendWrapUp(): void;
  /**
   * Одноразовый response.create с инструкцией подсказки (кап injected-токенов).
   * false означает, что канал/предыдущий ответ ещё не готовы принять запрос.
   */
  sendHintResponse(instructions: string, maxOutputTokens?: number): boolean;
  /**
   * Trusted-заметка учителю (TIME NOTE / Reminder): system-сообщение +
   * response.create, чтобы учитель отреагировал голосом.
   */
  sendSystemNote(text: string, opts?: { respond?: boolean }): void;
  /** Ответ на вызов инструмента: function_call_output (+ response.create по умолчанию). */
  sendToolResult(callId: string, output: unknown, opts?: { respond?: boolean }): void;
  /** One learner-owned retry after automatic reconnect attempts are exhausted. */
  retryReconnect(): void;
  /**
   * Мягкое завершение: дождаться, пока договорит и ДОИГРАЕТ аудио (или таймер),
   * и только потом end(). Для end_call учителя после прощания.
   */
  endAfterAudio(reason?: MaxCallEndReason): void;
  /**
   * Идемпотентный teardown: повторный вызов возвращает тот же промис, каждый
   * нативный ресурс закрывается ровно один раз, отчёт maxVoiceSessionEnd — один.
   */
  end(reason?: MaxCallEndReason): Promise<void>;
}

/**
 * Кап injected-ответов (приветствие/подсказки/wrap-up). max_output_tokens в
 * Realtime считает АУДИО-токены (~20 на секунду речи): 400 = 20с, и прощание в
 * два хода рвалось на полуслове (владелец 2026-08-16: «не договаривает до
 * конца»). 600 = 30с — предохранитель, а не длина: краткость держит промпт.
 */
export const INJECTED_MAX_TOKENS = 600;
/** Мягкое завершение ждёт конца аудио не дольше этого (страховка от вечного ожидания). */
export const MAX_CALL_END_AFTER_AUDIO_MAX_MS = 12_000;
const INITIAL_GREETING_INSTRUCTIONS =
  'Begin speaking immediately with one brief warm in-character greeting. Never announce turns or say "your turn". Then pause naturally and listen.';

export function createMaxCallClient(deps: MaxCallDeps): MaxCallClient {
  let phase: MaxCallPhase = 'idle';
  let pc: RtcPeerConnectionLike | null = null;
  let dc: RtcDataChannelLike | null = null;
  let localStream: MediaStreamLike | null = null;
  let remoteTrack: MediaStreamTrackLike | null = null;
  // Удерживаем remote MediaStream живым: на части нативных WebRTC-сборок одного
  // JS-ref на track недостаточно для стабильного воспроизведения после ontrack.
  let remoteStream: MediaStreamLike | null = null;
  let mint: MaxVoiceMintResponse | null = null;
  let startedAtMs: number | null = null;
  const usage: VoiceUsageTotals & { textInputTokens: number; textOutputTokens: number } = {
    audioInputTokens: 0,
    audioOutputTokens: 0,
    cachedTokens: 0,
    textInputTokens: 0,
    textOutputTokens: 0,
    textTokens: 0,
  };
  let inCallStarted = false;
  // Realtime принимает только один response за раз. Локальный pending закрывает
  // короткое окно между dc.send(response.create) и серверным response.created.
  // VAD только фиксирует границы хода: default response ждёт, пока предыдущая
  // генерация закончится И её output-аудио действительно доиграет.
  let responseActive = false;
  let responseRequestPending = false;
  let defaultResponseQueued = false;

  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let statsTimer: ReturnType<typeof setInterval> | null = null;
  let bargeTimer: ReturnType<typeof setTimeout> | null = null;
  let connectTimer: ReturnType<typeof setTimeout> | null = null;
  let remoteTrackTimer: ReturnType<typeof setTimeout> | null = null;
  let remoteTrackRecoveryUsed = false;
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

  // Удержание микрофона на приветствие (см. MAX_CALL_GREETING_HOLD_MAX_MS):
  // снимается, когда приветственный response ДОГОВОРЁН и его аудио ДОИГРАНО
  // (response.done + output_audio_buffer.stopped в любом порядке), либо по
  // страховочному таймеру, либо явным unmute юзера / реконнектом.
  let greetingHold = false;
  let greetingResponseDone = false;
  let greetingAudioStarted = false;
  let greetingAudioStopped = false;
  let greetingTimer: ReturnType<typeof setTimeout> | null = null;

  // Идемпотентность teardown: один закэшированный промис на всю жизнь клиента.
  let endPromise: Promise<void> | null = null;

  // Мягкое завершение (end_call учителя): ждём конца аудио, потом end().
  let remoteAudioPlaying = false;
  /** Речь во входном буфере началась, пока MAX ещё говорил → подозрение на эхо. */
  let speechStartedDuringOutput = false;
  let firstRemoteAudioLatencyMs: number | null = null;
  let endAfterAudioReason: MaxCallEndReason | null = null;
  let endAfterAudioTimer: ReturnType<typeof setTimeout> | null = null;

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
        // Ответ старого PC может прийти уже после reconnect. Не отдаём его
        // уровни новой ауре: иначе она выглядит зависшей на прежнем голосе.
        if (currentPc === pc && (phase === 'active' || phase === 'reconnecting')) {
          deps.onLevels?.(parseAudioLevels(stats));
        }
      })
      .catch(() => {
        statsInFlight = false;
      });
  }

  /**
   * WebRTC должен получить уже настроенную voiceChat-аудиосессию. Если
   * InCallManager запускать после getUserMedia/setRemoteDescription, iOS может
   * пересобрать AVAudioSession под живым треком: микрофон замирает, а выход
   * остаётся в тихом разговорном динамике.
   */
  function acquireAudioSession(): void {
    if (inCallStarted) return;
    try {
      deps.sfx?.connectCue();
    } catch {}
    try {
      deps.native.InCallManager.start({ media: 'audio' });
      inCallStarted = true;
      // media:'audio' по умолчанию выбирает receiver/earpiece. Для тренажёра
      // нужен слышимый hands-free маршрут на встроенный громкий динамик.
      ensureSpeakerRoute();
      try { deps.native.InCallManager.setKeepScreenOn?.(true); } catch {}
      try {
        deps.sfx?.audioSessionAcquired();
      } catch {}
    } catch {
      // start() мог успеть частично перенастроить process-wide AVAudioSession.
      // stop() + снятие force-флага безопасно возвращают системный маршрут.
      try { deps.native.InCallManager.setKeepScreenOn?.(false); } catch {}
      try { deps.native.InCallManager.setForceSpeakerphoneOn?.(null); } catch {}
      try { deps.native.InCallManager.stop(); } catch {}
      inCallStarted = false;
    }
  }

  /**
   * WebRTC может повторно выбрать AVAudioSession/AudioManager после answer SDP
   * и ontrack. Поэтому speaker route применяется не только перед соединением,
   * но и после появления remote track и фактического старта output-аудио.
   */
  function ensureSpeakerRoute(): void {
    if (!inCallStarted || isTornDown()) return;
    try { deps.native.InCallManager.setForceSpeakerphoneOn?.(true); } catch {}
    try { deps.native.InCallManager.setSpeakerphoneOn?.(true); } catch {}
  }

  function clearRemoteTrackTimer(): void {
    if (remoteTrackTimer === null) return;
    clearTimeout(remoteTrackTimer);
    remoteTrackTimer = null;
  }

  function recoverMissingRemoteTrackOnce(): void {
    if (remoteTrack || remoteTrackRecoveryUsed || phase !== 'active' || isTornDown()) return;
    remoteTrackRecoveryUsed = true;
    beginReconnect();
  }

  function armRemoteTrackRecovery(): void {
    if (remoteTrack || remoteTrackTimer !== null || remoteTrackRecoveryUsed || phase !== 'active') return;
    remoteTrackTimer = setTimeout(() => {
      remoteTrackTimer = null;
      recoverMissingRemoteTrackOnce();
    }, MAX_CALL_REMOTE_TRACK_GRACE_MS);
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
    add(input, 'text_tokens', 'textInputTokens');
    add(output, 'audio_tokens', 'audioOutputTokens');
    add(output, 'text_tokens', 'textOutputTokens');
    // Старые серверы и уже существующая аналитика читают общий textTokens.
    // Новая серверная цена использует split и не считает этот total повторно.
    usage.textTokens = usage.textInputTokens + usage.textOutputTokens;
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
        // зачем (владелец 2026-08-23, живой звонок): «говорит, обрывает на
        // половине и снова говорит то же самое». Клиент играет через громкую
        // связь, остаток эха доходит до VAD как речь ученика. Отмечаем речь,
        // начавшуюся ПОКА MAX ГОВОРИЛ, — отвечать на неё заново нельзя.
        if (remoteAudioPlaying) speechStartedDuringOutput = true;
        emitUi({ type: 'speech_started' });
        return;
      case 'input_audio_buffer.speech_stopped':
        emitUi({ type: 'speech_stopped' });
        // Эхо собственной речи не должно порождать новый ответ: иначе MAX
        // отвечает сам себе по кругу. Настоящее перебивание ученика приходит
        // отдельной кнопкой barge-in, а его реплика после паузы даст новое
        // speech_started уже в тишине.
        if (speechStartedDuringOutput) {
          speechStartedDuringOutput = false;
          return;
        }
        queueDefaultResponse();
        return;
      case 'response.created':
        responseActive = true;
        responseRequestPending = false;
        emitUi({ type: 'response_created' });
        return;
      case 'output_audio_buffer.started':
        if (firstRemoteAudioLatencyMs === null && startedAtMs !== null) {
          firstRemoteAudioLatencyMs = Math.max(0, deps.now() - startedAtMs);
        }
        remoteAudioPlaying = true;
        if (remoteTrack) remoteTrack.enabled = true;
        ensureSpeakerRoute();
        armRemoteTrackRecovery();
        if (greetingHold) greetingAudioStarted = true;
        emitUi({ type: 'audio_out_started' });
        return;
      case 'output_audio_buffer.stopped':
        remoteAudioPlaying = false;
        speechStartedDuringOutput = false;
        noteGreetingAudioStopped();
        emitUi({ type: 'audio_out_stopped' });
        finishEndAfterAudioIfDue();
        flushQueuedDefaultResponse();
        return;
      case 'output_audio_buffer.cleared':
        remoteAudioPlaying = false;
        speechStartedDuringOutput = false;
        noteGreetingAudioStopped();
        emitUi({ type: 'audio_out_cleared' });
        finishEndAfterAudioIfDue();
        flushQueuedDefaultResponse();
        return;
      // Учитель вызвал инструмент: аргументы приходят одним событием по завершении.
      case 'response.function_call_arguments.done': {
        const name = typeof message.name === 'string' ? message.name : '';
        const callId = typeof message.call_id === 'string' ? message.call_id : '';
        if (!name || !callId) return;
        let args: Record<string, unknown> = {};
        try {
          const parsed: unknown = JSON.parse(typeof message.arguments === 'string' ? message.arguments : '{}');
          if (parsed !== null && typeof parsed === 'object') args = parsed as Record<string, unknown>;
        } catch {
          // Битые аргументы — пустой объект: исполнитель ответит ошибкой в output.
        }
        try {
          deps.onToolCall?.({ name, callId, args });
        } catch {}
        return;
      }
      case 'response.done':
        responseActive = false;
        responseRequestPending = false;
        accumulateUsage(message);
        if (greetingHold) {
          greetingResponseDone = true;
          // Приветствие без аудио (пустой/отменённый response) или аудио уже
          // доиграло — держать микрофон закрытым больше незачем.
          if (!greetingAudioStarted || greetingAudioStopped) releaseGreetingHold();
        }
        emitUi({ type: 'response_done' });
        flushQueuedDefaultResponse();
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
        responseRequestPending = false;
        return;
      default:
        return; // Неизвестные события Realtime — вперёд-совместимый шум.
    }
  }

  function applyTrackMute(muted: boolean): void {
    for (const track of localStream?.getTracks() ?? []) {
      track.enabled = !muted;
    }
  }

  /** Микрофон закрыт, если этого хочет юзер ИЛИ пока звучит приветствие. */
  function applyEffectiveMute(): void {
    applyTrackMute(userMuted || greetingHold);
  }

  function releaseGreetingHold(applyMute = true): void {
    if (!greetingHold) return;
    greetingHold = false;
    if (greetingTimer !== null) {
      clearTimeout(greetingTimer);
      greetingTimer = null;
    }
    if (applyMute) applyEffectiveMute();
  }

  function noteGreetingAudioStopped(): void {
    if (!greetingHold) return;
    greetingAudioStopped = true;
    if (greetingResponseDone) releaseGreetingHold();
  }

  function beginGreetingHold(): void {
    greetingHold = true;
    greetingResponseDone = false;
    greetingAudioStarted = false;
    greetingAudioStopped = false;
    applyEffectiveMute();
    if (greetingTimer !== null) clearTimeout(greetingTimer);
    greetingTimer = setTimeout(() => {
      greetingTimer = null;
      releaseGreetingHold();
    }, MAX_CALL_GREETING_HOLD_MAX_MS);
  }

  function activate(): void {
    if (phase !== 'configuring') return;
    if (connectTimer !== null) {
      clearTimeout(connectTimer);
      connectTimer = null;
    }
    startedAtMs = deps.now();
    // Аудиосессия уже захвачена ДО getUserMedia: activate только переводит
    // транспорт в live и запускает служебные таймеры.
    acquireAudioSession();
    heartbeatTimer = setInterval(sendHeartbeat, MAX_CALL_HEARTBEAT_MS);
    if (deps.onLevels) statsTimer = setInterval(pollStats, MAX_CALL_STATS_POLL_MS);
    setPhase('active');
    emitUi({ type: 'connected' });
    // Первый heartbeat — СРАЗУ («алло», elapsed 0). зачем: минт может быть
    // сделан заранее на пре-экране (premint), и сервер считает секунды разговора
    // от первого heartbeat (activatedAtMs), а не от минта — иначе раздумья
    // перед тапом списывались бы как разговор. Фоновый вызов, UI не ждёт.
    sendHeartbeat();
    // Микрофон закрыт на время приветствия — см. MAX_CALL_GREETING_HOLD_MAX_MS.
    beginGreetingHold();
    // Realtime не начинает говорить только из-за instructions: первый ответ
    // нужно запросить явно после открытия data channel.
    requestResponse({
        // Учитель получает свою инструкцию приветствия от сервера (языковая
        // политика уровня); ролевые сцены — прежнее короткое приветствие.
        instructions: mint?.tutor?.greetingInstructions || INITIAL_GREETING_INSTRUCTIONS,
        max_output_tokens: INJECTED_MAX_TOKENS,
    });
  }

  function requestResponse(response?: Record<string, unknown>): boolean {
    if (isTornDown() || responseActive || responseRequestPending || remoteAudioPlaying) return false;
    const sent = dcSend({
      type: 'response.create',
      response: {
        ...(response ?? {}),
        // Транскрипт приходит и для output-аудио; явный режим не позволяет
        // будущему server/default профилю незаметно превратить MAX в текст.
        output_modalities: ['audio'],
      },
    });
    if (sent) responseRequestPending = true;
    return sent;
  }

  function flushQueuedDefaultResponse(): void {
    if (!defaultResponseQueued) return;
    if (requestResponse()) defaultResponseQueued = false;
  }

  function queueDefaultResponse(): void {
    if (isTornDown()) return;
    defaultResponseQueued = true;
    flushQueuedDefaultResponse();
  }

  function finishEndAfterAudioIfDue(): void {
    if (endAfterAudioReason === null || remoteAudioPlaying) return;
    const reason = endAfterAudioReason;
    endAfterAudioReason = null;
    if (endAfterAudioTimer !== null) {
      clearTimeout(endAfterAudioTimer);
      endAfterAudioTimer = null;
    }
    void end(reason);
  }

  function endAfterAudio(reason: MaxCallEndReason = 'completed'): void {
    if (isTornDown() || endAfterAudioReason !== null) return;
    endAfterAudioReason = reason;
    // Микрофон закрываем сразу: прощание сказано, новых реплик от ученика
    // учитель уже не ждёт (иначе VAD породил бы ответ на «пока-пока»).
    applyTrackMute(true);
    endAfterAudioTimer = setTimeout(() => {
      endAfterAudioTimer = null;
      if (endAfterAudioReason === null) return;
      const late = endAfterAudioReason;
      endAfterAudioReason = null;
      void end(late);
    }, MAX_CALL_END_AFTER_AUDIO_MAX_MS);
    finishEndAfterAudioIfDue();
  }

  function settleDetachedMint(lateMint: MaxVoiceMintResponse, elapsed = elapsedSec()): void {
    try {
      void Promise.resolve(deps.end({
        sessionId: lateMint.session_id,
        endReason: 'dropped',
        elapsedSec: elapsed,
        usage: { ...usage },
      })).catch(() => {});
    } catch {}
  }

  /**
   * Создаёт локальный WebRTC transport и сразу публикует каждый ресурс в поля
   * клиента. Поэтому конкурентный end() может закрыть даже наполовину
   * собранный PC. Любая ошибка освобождает только ещё принадлежащие helper'у
   * ресурсы; уже закрытые teardown'ом повторно не трогаются.
   */
  async function createLocalOffer(): Promise<{
    connection: RtcPeerConnectionLike;
    stream: MediaStreamLike;
    channel: RtcDataChannelLike;
    offerSdp: string;
  }> {
    const connection = new deps.native.RTCPeerConnection({});
    let stream: MediaStreamLike | null = null;
    let channel: RtcDataChannelLike | null = null;
    pc = connection;
    wirePeerConnection(connection);
    try {
      // зачем: владелец 2026-08-17 — «он говорит-говорит, потом прерывается и
      // будто отвечает на свою же реплику». Голый {audio:true} не гарантирует
      // echo cancellation на всех устройствах/маршрутах — а мы держим звук на
      // громком динамике (setForceSpeakerphoneOn), так что голос учителя из
      // динамика долетает обратно до микрофона. Без AEC этот отголосок читается
      // сервером как «ученик заговорил» → interrupt_response обрывает ответ ИИ
      // на полуслове → тут же создаётся новый response. Явные constraints
      // заставляют WebRTC применить AEC/NS/AGC гарантированно, а не «как повезёт».
      stream = await deps.native.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if (isTornDown()) throw new Error('call_ended');
      localStream = stream;
      // Тап mute мог прийти, пока системный permission/getUserMedia ещё ждал.
      // Применяем сохранённую волю юзера к только что появившемуся треку.
      applyEffectiveMute();
      for (const track of stream.getTracks()) connection.addTrack(track, stream);
      channel = connection.createDataChannel('oai-events');
      dc = channel;
      const offer = await connection.createOffer({});
      if (isTornDown()) throw new Error('call_ended');
      await connection.setLocalDescription(offer);
      const offerSdp = await completeLocalOfferSdp(connection, offer.sdp);
      if (isTornDown()) throw new Error('call_ended');
      return { connection, stream, channel, offerSdp };
    } catch (error) {
      if (channel && dc === channel) {
        try { channel.close(); } catch {}
        dc = null;
      }
      if (stream && localStream === stream) {
        for (const track of stream.getTracks()) {
          try { track.stop(); } catch {}
        }
        localStream = null;
      }
      if (pc === connection) {
        try { connection.close(); } catch {}
        pc = null;
      }
      throw error;
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
      showReconnectFailed('reconnect_exhausted');
      return;
    }
    const caps = reconnectCapsFromLimits(prevMint.limits);
    if (!canReconnect(chain, kind, caps)) {
      showReconnectFailed('reconnect_exhausted');
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
    remoteStream = null;
    clearRemoteTrackTimer();

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
        // Teardown мог закончиться, пока callable переносил резерв. Старую
        // сессию он уже закрыл, поэтому новый поздний sessionId сеттлим явно.
        settleDetachedMint(mintResult);
        reminting = false;
        return;
      }
      // transferReserve уже сделал НОВУЮ сессию активной на сервере. С этого
      // момента teardown и следующая попытка обязаны владеть именно ею, даже
      // если getUserMedia/SDP/remoteDescription ниже упадут.
      mint = mintResult;

      // Новый PC/DC: присваиваем в поля сразу, чтобы конкурирующий end()
      // закрыл их своим teardown'ом, а не оставил висеть.
      const local = await createLocalOffer();
      const { connection, channel } = local;
      const answerSdp = await deps.exchangeSdp(local.offerSdp, mintResult.value);
      if (isTornDown()) {
        reminting = false;
        return;
      }
      await connection.setRemoteDescription({ type: 'answer', sdp: answerSdp });
      if (isTornDown()) {
        reminting = false;
        return;
      }
      channel.onmessage = (event) => handleDcMessage(event?.data);
      channel.onclose = () => {
        if (channel === dc) beginReconnect();
      };
      const finish = (): void => {
        if (isTornDown() || phase !== 'reconnecting') return;
        if (connectTimer !== null) {
          clearTimeout(connectTimer);
          connectTimer = null;
        }
        // Снимаем grace-мьют, возвращая ровно то состояние, что просил юзер.
        applyEffectiveMute();
        setPhase('active');
        emitUi({ type: 'reconnected' });
        try {
          deps.sfx?.midCall('reconnected');
        } catch {}
      };
      channel.onopen = finish;
      reminting = false;
      if (connectTimer !== null) clearTimeout(connectTimer);
      connectTimer = setTimeout(() => {
        connectTimer = null;
        if (isTornDown() || phase !== 'reconnecting' || channel !== dc) return;
        // Новый transport не открылся: следующая попытка продолжает уже от
        // mintResult.session_id (резерв перенесён туда выше), не от старого id.
        void doRemint(kind);
      }, MAX_CALL_CONNECT_TIMEOUT_MS);
      if (channel.readyState === 'open') finish();
    } catch {
      reminting = false;
      if (isTornDown()) return;
      // Ре-минт не удался: следующая попытка, пока кап чейна позволяет;
      // исчерпание капа внутри doRemint честно завершит звонок failed'ом.
      await doRemint(kind);
    }
  }

  function showReconnectFailed(reason: string): void {
    if (isTornDown()) return;
    reminting = false;
    if (graceTimer !== null) {
      clearTimeout(graceTimer);
      graceTimer = null;
    }
    if (connectTimer !== null) {
      clearTimeout(connectTimer);
      connectTimer = null;
    }
    applyTrackMute(true);
    setPhase('reconnect_failed');
    emitUi({ type: 'fail', reason });
  }

  function retryReconnect(): void {
    if (phase !== 'reconnect_failed' || !mint || !chain) return;
    const caps = reconnectCapsFromLimits(mint.limits);
    if (!canReconnect(chain, 'manual', caps)) return;
    setPhase('reconnecting');
    emitUi({ type: 'reconnect_started' });
    void doRemint('manual');
  }

  function wirePeerConnection(connection: RtcPeerConnectionLike): void {
    connection.ontrack = (event) => {
      if (connection !== pc) return; // событие от уже похороненного PC — шум
      const incomingTrack = event?.track;
      if (!incomingTrack || (incomingTrack.kind && incomingTrack.kind !== 'audio')) return;
      remoteStream = event.streams?.[0] ?? null;
      // Предпочитаем трек сохранённого stream: сам stream остаётся достижимым
      // весь звонок и не может быть собран JS-движком после callback ontrack.
      remoteTrack = remoteStream?.getAudioTracks?.()[0] ?? incomingTrack;
      remoteTrack.enabled = true;
      clearRemoteTrackTimer();
      ensureSpeakerRoute();
    };
    connection.oniceconnectionstatechange = () => {
      if (connection !== pc) return; // stale PC после ре-минта
      const state = connection.iceConnectionState;
      if (state === 'disconnected' || state === 'failed') {
        // Фаза 1 реконнекта: grace 4с с мьютом локального трека, ничего не
        // рвём — мобильные сети часто восстанавливаются сами. Не ожило —
        // фаза 2 (полный ре-минт) в doRemint.
        beginReconnect();
        return;
      }
      if ((state === 'connected' || state === 'completed') && phase === 'reconnecting') {
        // ICE ожил в grace-окне — тот же PC, ре-минт не нужен.
        if (graceTimer !== null) {
          clearTimeout(graceTimer);
          graceTimer = null;
        }
        applyEffectiveMute();
        setPhase('active');
        emitUi({ type: 'reconnected' });
        try {
          deps.sfx?.midCall('reconnected');
        } catch {}
      }
    };
  }

  /** ICE и data channel сходятся в один контролируемый reconnect-путь. */
  function beginReconnect(): void {
    if (phase !== 'active') return;
    // response.done мог потеряться вместе с линией. После восстановления UI
    // начинает новый ход, поэтому старый локальный lock не должен жить вечно.
    responseActive = false;
    responseRequestPending = false;
    defaultResponseQueued = false;
    setPhase('reconnecting');
    emitUi({ type: 'reconnect_started' });
    try {
      deps.sfx?.midCall('reconnect_started');
    } catch {}
    // Обрыв во время приветствия: удержание больше не имеет смысла (после
    // реконнекта ИИ не здоровается заново), grace-мьют — единственный мьют.
    releaseGreetingHold(false);
    applyTrackMute(true);
    if (graceTimer !== null) clearTimeout(graceTimer);
    graceTimer = setTimeout(() => {
      graceTimer = null;
      void doRemint('auto');
    }, RECONNECT_GRACE_MS);
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
    if (connectTimer !== null) {
      clearTimeout(connectTimer);
      connectTimer = null;
    }
    if (greetingTimer !== null) {
      clearTimeout(greetingTimer);
      greetingTimer = null;
    }
    greetingHold = false;
    if (endAfterAudioTimer !== null) {
      clearTimeout(endAfterAudioTimer);
      endAfterAudioTimer = null;
    }
    endAfterAudioReason = null;
    clearRemoteTrackTimer();
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
    remoteStream = null;
    const shouldPlayEndCue = inCallStarted && startedAtMs !== null;
    if (inCallStarted) {
      try {
        deps.native.InCallManager.setKeepScreenOn?.(false);
      } catch {}
      // null возвращает default route policy библиотеки. Без этого process-wide
      // force-флаг переживает звонок и ломает маршрутизацию следующего аудио.
      try {
        deps.native.InCallManager.setForceSpeakerphoneOn?.(null);
      } catch {}
      try {
        deps.native.InCallManager.stop();
      } catch {}
      inCallStarted = false;
      try {
        deps.sfx?.audioSessionReleased();
      } catch {}
    }
    // Восстановление общей аудиосессии и сетевой settlement не должны держать
    // кнопку сброса и навигацию. Оба процесса безопасно завершаются в фоне.
    try {
      void Promise.resolve(deps.restoreAudioSession?.()).catch(() => {});
    } catch {}
    // End-нота ПОСЛЕ InCallManager.stop() (граница владения аудиосессией) и
    // только если звонок реально был активен — провал соединения без «алло»
    // не заслуживает прощальной ноты.
    if (shouldPlayEndCue) {
      try {
        deps.sfx?.endCue();
      } catch {}
    }

    // Отчёт сеттлмента — один раз и только если сессия была заминчена
    // (до минта серверу нечего закрывать, release резерва делает preflight-слой).
    if (hadSession && mint) {
      try {
        void Promise.resolve(deps.end({
          sessionId: mint.session_id,
          // Клиентский 'failed' сервер не знает — маппим в 'dropped'.
          endReason: toServerEndReason(reason),
          elapsedSec: finalElapsed,
          usage: { ...usage },
          ...(firstRemoteAudioLatencyMs === null ? {} : { firstRemoteAudioLatencyMs }),
        })).catch(() => {
          // Недоотчитавшуюся сессию дожмёт серверный watchdog по heartbeat.
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
    // Настраиваем voiceChat + speaker до создания микрофонного трека. Это
    // устраняет iOS-гонку, при которой звонок подключён, но не слышит юзера.
    acquireAudioSession();
    // createOffer/ICE gathering — ПАРАЛЛЕЛЬНО с минтом (offer токена не требует,
    // спека §1): пока сервер резервирует квоту, локальный стек уже готов.
    const offerPromise = createLocalOffer();

    const mintPromise = deps.mint(req);
    const startResults = Promise.allSettled([offerPromise, mintPromise]);
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeout = new Promise<'timeout'>((resolve) => {
      timeoutId = setTimeout(() => resolve('timeout'), MAX_CALL_START_TIMEOUT_MS);
    });
    const settled = await Promise.race([startResults, timeout]);
    if (timeoutId !== null) clearTimeout(timeoutId);

    if (settled === 'timeout') {
      // Оба исходных промиса продолжают жить. Поздний локальный ресурс закрываем,
      // поздний успешный минт немедленно сеттлим — резерв не ждёт watchdog.
      // createLocalOffer публикует PC/stream сразу: fail() закрывает готовые
      // ресурсы, а helper сам дочистит те, что появятся уже после teardown.
      void offerPromise.catch(() => {});
      void mintPromise.then((lateMint) => settleDetachedMint(lateMint, 0)).catch(() => {});
      await fail('server_timeout');
      return;
    }

    const [offerResult, mintResultState] = settled;
    if (isTornDown()) {
      // end() мог завершиться, пока mint/offer ещё исполнялись. Локальные
      // ресурсы уже закрыты teardown/helper'ом, но поздний серверный резерв
      // нужно закрыть явно — основной teardown его ещё не видел.
      if (mintResultState.status === 'fulfilled') settleDetachedMint(mintResultState.value);
      return;
    }
    if (offerResult.status === 'rejected' || mintResultState.status === 'rejected') {
      // Если сервер уже выдал токен/резерв, делаем его видимым teardown до fail.
      if (mintResultState.status === 'fulfilled') mint = mintResultState.value;
      const reason = mintResultState.status === 'rejected'
        ? (/^[a-z0-9_]+$/.test(String((mintResultState.reason as Error)?.message ?? ''))
            ? String((mintResultState.reason as Error).message)
            : 'mint_failed')
        : 'media_failed';
      await fail(reason);
      return;
    }
    const local = offerResult.value;
    const mintResult = mintResultState.value;
    const { connection, channel } = local;
    // createLocalOffer уже опубликовал PC/DC/stream для безопасного
    // конкурентного teardown; здесь закрепляем только серверную сессию.
    mint = mintResult;
    // Корень reconnect-чейна — первая сессия: по нему сервер связывает биллинг.
    chain = makeReconnectChain(mintResult.session_id);
    channel.onmessage = (event) => handleDcMessage(event?.data);
    channel.onclose = () => {
      if (channel === dc) beginReconnect();
    };
    channel.onopen = () => activate();

    setPhase('connecting');
    let answerSdp: string;
    try {
      answerSdp = await deps.exchangeSdp(local.offerSdp, mintResult.value);
    } catch (error) {
      const detail = String((error as Error)?.message ?? '');
      await fail(detail === 'server_timeout' ? 'server_timeout' : 'sdp_exchange_failed');
      return;
    }
    if (isTornDown()) return;

    setPhase('configuring');
    try {
      await connection.setRemoteDescription({ type: 'answer', sdp: answerSdp });
    } catch {
      await fail('set_remote_description_failed');
      return;
    }
    connectTimer = setTimeout(() => {
      connectTimer = null;
      if (phase === 'configuring') void fail('connection_timeout');
    }, MAX_CALL_CONNECT_TIMEOUT_MS);
    // Data channel мог открыться до того, как мы навесили onopen (гонка в
    // нативном стеке) — проверяем готовность явно.
    if (!isTornDown() && channel === dc && channel.readyState === 'open') activate();
  }

  function setMuted(muted: boolean): void {
    userMuted = muted; // grace-мьют реконнекта временный, воля юзера — здесь
    // Явный unmute во время приветствия — воля юзера говорить: снимаем удержание.
    if (!muted) releaseGreetingHold(false);
    applyEffectiveMute();
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
    queueDefaultResponse();
    emitUi({ type: 'wrap_up' });
  }

  function sendSystemNote(text: string, opts?: { respond?: boolean }): void {
    if (isTornDown() || !text) return;
    dcSend({
      type: 'conversation.item.create',
      item: { type: 'message', role: 'system', content: [{ type: 'input_text', text }] },
    });
    if (opts?.respond !== false) queueDefaultResponse();
  }

  function sendToolResult(callId: string, output: unknown, opts?: { respond?: boolean }): void {
    if (isTornDown() || !callId) return;
    dcSend({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: typeof output === 'string' ? output : JSON.stringify(output ?? {}),
      },
    });
    if (opts?.respond !== false) queueDefaultResponse();
  }

  function sendHintResponse(instructions: string, maxOutputTokens = INJECTED_MAX_TOKENS): boolean {
    if (isTornDown() || defaultResponseQueued) return false;
    return requestResponse({ instructions, max_output_tokens: maxOutputTokens });
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
    sendSystemNote,
    sendToolResult,
    retryReconnect,
    endAfterAudio,
    end,
  };
}

/* expo-router route shim: файлы в app/ считаются роутами и требуют default export. */
export default function __RouteShim() {
  return null;
}
