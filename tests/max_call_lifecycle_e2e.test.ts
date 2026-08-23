/**
 * E2E-прогон ПОЛНОГО жизненного цикла MAX-звонка против реалистичного мока
 * нативного стека и Realtime-сервера (МАКС ПЛАН §5).
 *
 * Зачем этот файл отдельно от точечных юнит-тестов: те проверяют функции по
 * одной, а сломаться звонок может на СТЫКАХ — например когда data channel
 * открылся раньше, чем навесили onopen; когда ICE упал во время реминта; когда
 * end() позвали посреди минта. Здесь гоняется настоящая последовательность
 * событий OpenAI Realtime API через настоящий createMaxCallClient, и
 * проверяется то, что увидел бы живой человек в звонке: услышал ИИ → перебил →
 * потерял сеть → восстановился → повесил трубку → получил XP.
 *
 * Мок нативного стека намеренно «злой»: асинхронный (как реальный WebRTC),
 * с управляемыми из теста ICE-переходами и readyState data channel.
 */

import {
  createMaxCallClient,
  sessionEndEnrichment,
  toServerEndReason,
  MAX_CALL_HEARTBEAT_MS,
  MAX_CALL_BARGE_IN_MUTE_MS,
  MAX_CALL_CONNECT_TIMEOUT_MS,
  INJECTED_MAX_TOKENS,
  type MaxCallPhase,
  type MaxCallTranscriptEvent,
  type MaxVoiceMintResponse,
  type VoiceUsageTotals,
} from '../app/max_call_client';
import { RECONNECT_GRACE_MS } from '../app/max_call_reconnect';
import type { MaxCallUiEvent } from '../app/max_call_ui_state';
import type { TranscriptTurn } from '../app/max_call_transcript';

// ── Мок нативного стека ─────────────────────────────────────────────────────

interface FakeTrack {
  enabled: boolean;
  stopped: boolean;
  kind: string;
  stop(): void;
}

function makeTrack(kind = 'audio'): FakeTrack {
  return {
    enabled: true,
    stopped: false,
    kind,
    stop() {
      this.stopped = true;
    },
  };
}

class FakeDataChannel {
  readyState = 'connecting';
  sent: Record<string, unknown>[] = [];
  closed = false;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;

  send(data: string): void {
    if (this.closed) throw new Error('dc_closed');
    this.sent.push(JSON.parse(data) as Record<string, unknown>);
  }

  close(): void {
    this.closed = true;
    this.readyState = 'closed';
  }

  /** Симулирует открытие канала нативным стеком. */
  open(): void {
    this.readyState = 'open';
    this.onopen?.();
  }

  /** Доставка серверного события Realtime API. */
  deliver(event: Record<string, unknown>): void {
    this.onmessage?.({ data: JSON.stringify(event) });
  }

  /** Только события конкретного типа — для читаемых ассертов. */
  sentOfType(type: string): Record<string, unknown>[] {
    return this.sent.filter((m) => m.type === type);
  }
}

class FakePeerConnection {
  iceConnectionState = 'new';
  localDescription: { type: string; sdp: string } | null = null;
  remoteDescription: { type: string; sdp: string } | null = null;
  closed = false;
  channels: FakeDataChannel[] = [];
  tracks: FakeTrack[] = [];
  oniceconnectionstatechange: (() => void) | null = null;
  ontrack: ((e: { track: FakeTrack; streams?: unknown[] }) => void) | null = null;
  statsQueue: unknown[] = [];

  async createOffer(): Promise<{ type: string; sdp: string }> {
    return { type: 'offer', sdp: 'v=0\r\nfake-offer' };
  }

  async setLocalDescription(desc: { type: string; sdp: string }): Promise<void> {
    this.localDescription = desc;
  }

  async setRemoteDescription(desc: { type: string; sdp: string }): Promise<void> {
    this.remoteDescription = desc;
  }

  addTrack(track: FakeTrack): unknown {
    this.tracks.push(track);
    return {};
  }

  createDataChannel(): FakeDataChannel {
    const dc = new FakeDataChannel();
    this.channels.push(dc);
    return dc;
  }

  async getStats(): Promise<unknown> {
    return this.statsQueue.shift() ?? new Map();
  }

  close(): void {
    this.closed = true;
  }

  /** Тестовый триггер смены ICE-состояния (потеря/возврат сети). */
  setIce(state: string): void {
    this.iceConnectionState = state;
    this.oniceconnectionstatechange?.();
  }

  /** Сервер прислал remote-аудиотрек ИИ. */
  emitRemoteTrack(track: FakeTrack): void {
    this.ontrack?.({ track, streams: [] });
  }

  get dc(): FakeDataChannel {
    return this.channels[this.channels.length - 1];
  }
}

interface Harness {
  client: ReturnType<typeof createMaxCallClient>;
  pcs: FakePeerConnection[];
  streams: { tracks: FakeTrack[] }[];
  phases: MaxCallPhase[];
  uiEvents: MaxCallUiEvent[];
  transcript: MaxCallTranscriptEvent[];
  mintCalls: Record<string, unknown>[];
  heartbeats: { sessionId: string; elapsedSec: number; usage: VoiceUsageTotals }[];
  endCalls: { sessionId: string; endReason: string; elapsedSec: number; usage: VoiceUsageTotals }[];
  inCall: { started: number; stopped: number };
  sfxLog: string[];
  /** Текущий (последний созданный) PeerConnection. */
  pc(): FakePeerConnection;
  advance(ms: number): void;
  setNow(ms: number): void;
  history: TranscriptTurn[];
}

interface HarnessOptions {
  mintImpl?: (req: Record<string, unknown>, callIndex: number) => Promise<MaxVoiceMintResponse>;
  mediaImpl?: (callIndex: number) => Promise<{ getTracks(): FakeTrack[] }>;
  exchangeSdpImpl?: (offer: string, secret: string) => Promise<string>;
  endImpl?: () => Promise<unknown>;
  preflight?: () => Promise<unknown>;
  withLevels?: boolean;
}

/**
 * Прогон очереди микротасков. Поднятие звонка — цепочка из ~6 await'ов
 * (mint → getUserMedia → createOffer → setLocalDescription → exchangeSdp →
 * setRemoteDescription), и синхронная проверка сразу после advanceTimersByTime
 * увидела бы недоделанную цепочку. Явный flush честнее произвольных
 * `await Promise.resolve()` вразнобой.
 */
async function flush(ticks = 12): Promise<void> {
  for (let i = 0; i < ticks; i += 1) await Promise.resolve();
}

function makeMint(sessionId: string, overrides: Partial<MaxVoiceMintResponse> = {}): MaxVoiceMintResponse {
  return {
    value: `ek_${sessionId}`,
    session_id: sessionId,
    max_seconds: 300,
    wrapUpText: '[WRAP_UP] Time to wrap up.',
    limits: { reconnectChainMax: { auto: 2, manual: 1 } },
    trialVariant: null,
    ...overrides,
  };
}

function createHarness(opts: HarnessOptions = {}): Harness {
  const pcs: FakePeerConnection[] = [];
  const streams: { tracks: FakeTrack[] }[] = [];
  const phases: MaxCallPhase[] = [];
  const uiEvents: MaxCallUiEvent[] = [];
  const transcript: MaxCallTranscriptEvent[] = [];
  const mintCalls: Record<string, unknown>[] = [];
  const heartbeats: Harness['heartbeats'] = [];
  const endCalls: Harness['endCalls'] = [];
  const inCall = { started: 0, stopped: 0 };
  const sfxLog: string[] = [];
  const history: TranscriptTurn[] = [];
  let nowMs = 1_000_000;
  let mediaCalls = 0;

  const native = {
    RTCPeerConnection: function FakePC(this: unknown) {
      const pc = new FakePeerConnection();
      pcs.push(pc);
      return pc as unknown as FakePeerConnection;
    } as unknown as new (config?: Record<string, unknown>) => FakePeerConnection,
    mediaDevices: {
      async getUserMedia(): Promise<{ getTracks(): FakeTrack[] }> {
        const callIndex = mediaCalls++;
        if (opts.mediaImpl) return opts.mediaImpl(callIndex);
        const tracks = [makeTrack()];
        const stream = { tracks, getTracks: () => tracks };
        streams.push(stream);
        return stream;
      },
    },
    InCallManager: {
      start(): void {
        inCall.started += 1;
      },
      stop(): void {
        inCall.stopped += 1;
      },
    },
  };

  const client = createMaxCallClient({
    native: native as never,
    now: () => nowMs,
    preflight: opts.preflight,
    async mint(req) {
      mintCalls.push({ ...req });
      if (opts.mintImpl) return opts.mintImpl(req as never, mintCalls.length - 1);
      return makeMint(`sess_${mintCalls.length}`);
    },
    async heartbeat(req) {
      heartbeats.push({ ...req, usage: { ...req.usage } });
      return { ok: true };
    },
    async end(req) {
      endCalls.push({ ...req, usage: { ...req.usage } });
      if (opts.endImpl) return opts.endImpl();
      return { ok: true };
    },
    async exchangeSdp(offer, secret) {
      if (opts.exchangeSdpImpl) return opts.exchangeSdpImpl(offer, secret);
      return 'v=0\r\nfake-answer';
    },
    onPhase: (p) => phases.push(p),
    onUiEvent: (e) => uiEvents.push(e),
    onTranscriptDelta: (e) => transcript.push(e),
    onLevels: opts.withLevels ? () => {} : undefined,
    reconnectHistory: () => history,
    sfx: {
      connectCue: () => sfxLog.push('connectCue'),
      endCue: () => sfxLog.push('endCue'),
      audioSessionAcquired: () => sfxLog.push('acquired'),
      audioSessionReleased: () => sfxLog.push('released'),
      midCall: (kind: string) => sfxLog.push(`mid:${kind}`),
    } as never,
  });

  return {
    client,
    pcs,
    streams,
    phases,
    uiEvents,
    transcript,
    mintCalls,
    heartbeats,
    endCalls,
    inCall,
    sfxLog,
    history,
    pc: () => pcs[pcs.length - 1],
    advance(ms) {
      nowMs += ms;
      jest.advanceTimersByTime(ms);
    },
    setNow(ms) {
      nowMs = ms;
    },
  };
}

/** Довести клиент до фазы active (минт + SDP + открытие data channel). */
async function bringUpCall(h: Harness): Promise<void> {
  const startPromise = h.client.start({ format: 'scenario', scenarioId: 'coffee', cefr: 'B1' });
  // Промисы минта/getUserMedia/SDP разрешаются микротасками — дожидаемся их,
  // иначе dc ещё не существует.
  await startPromise;
  h.pc().dc.open();
}

const uiTypes = (h: Harness): string[] => h.uiEvents.map((e) => e.type);

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

// ── 1. Счастливый путь целиком ──────────────────────────────────────────────

describe('E2E: полный успешный звонок от старта до разбора', () => {
  it('проходит все фазы, слышит ИИ, копит usage, корректно завершается', async () => {
    const h = createHarness();
    await bringUpCall(h);

    // Фазы прошли ровно в порядке спеки, без пропусков и возвратов.
    expect(h.phases).toEqual(['preflight', 'minting', 'connecting', 'configuring', 'active']);
    expect(h.client.phase()).toBe('active');
    expect(h.client.sessionId()).toBe('sess_1');

    // Аудиосессия захвачена, и connect-cue сыграл ДО захвата (спека §1).
    expect(h.inCall.started).toBe(1);
    expect(h.sfxLog.slice(0, 2)).toEqual(['connectCue', 'acquired']);

    // Сервер прислал голос ИИ.
    const remote = makeTrack();
    h.pc().emitRemoteTrack(remote);

    // Реалистичная последовательность событий Realtime API одного хода.
    const dc = h.pc().dc;
    dc.deliver({ type: 'input_audio_buffer.speech_started' });
    dc.deliver({ type: 'input_audio_buffer.speech_stopped' });
    dc.deliver({
      type: 'conversation.item.input_audio_transcription.completed',
      transcript: 'I would like a large cappuccino please',
    });
    dc.deliver({ type: 'response.created' });
    dc.deliver({ type: 'output_audio_buffer.started' });
    dc.deliver({ type: 'response.output_audio_transcript.delta', item_id: 'it1', delta: 'Sure, ' });
    dc.deliver({ type: 'response.output_audio_transcript.delta', item_id: 'it1', delta: 'one large cappuccino.' });
    dc.deliver({ type: 'response.output_audio_transcript.done', item_id: 'it1' });
    dc.deliver({ type: 'output_audio_buffer.stopped' });
    dc.deliver({
      type: 'response.done',
      response: {
        usage: {
          input_token_details: { audio_tokens: 400, cached_tokens: 50, text_tokens: 12 },
          output_token_details: { audio_tokens: 300, text_tokens: 8 },
        },
      },
    });

    // UI получил связную историю хода.
    expect(uiTypes(h)).toEqual([
      'connected',
      'speech_started',
      'speech_stopped',
      'response_created',
      'audio_out_started',
      'audio_out_stopped',
      'response_done',
    ]);

    // Транскрипт разложился по ролям, дельты ИИ склеиваемы.
    expect(h.transcript).toEqual([
      { kind: 'user_final', text: 'I would like a large cappuccino please' },
      { kind: 'assistant_delta', itemId: 'it1', delta: 'Sure, ' },
      { kind: 'assistant_delta', itemId: 'it1', delta: 'one large cappuccino.' },
      { kind: 'assistant_done', itemId: 'it1' },
    ]);

    // Usage накопился ПО ТИПАМ токенов — это то, по чему сервер считает деньги.
    expect(h.client.usageTotals()).toEqual({
      audioInputTokens: 400,
      audioOutputTokens: 300,
      cachedTokens: 50,
      textInputTokens: 12,
      textOutputTokens: 8,
      textTokens: 20, // 12 input + 8 output
    });

    // Heartbeat: первый — сразу на «алло» (elapsed 0, серверные часы разговора
    // стартуют от него), затем ровно по расписанию и с накопленным usage.
    h.advance(MAX_CALL_HEARTBEAT_MS);
    await Promise.resolve();
    expect(h.heartbeats).toHaveLength(2);
    expect(h.heartbeats[0]).toMatchObject({ sessionId: 'sess_1', elapsedSec: 0 });
    expect(h.heartbeats[1].sessionId).toBe('sess_1');
    expect(h.heartbeats[1].elapsedSec).toBe(30);
    expect(h.heartbeats[1].usage.audioInputTokens).toBe(400);

    // Завершение по кнопке.
    await h.client.end('completed');
    expect(h.client.phase()).toBe('ended');

    // Сеттлмент ушёл один раз, с теми же цифрами.
    expect(h.endCalls).toHaveLength(1);
    expect(h.endCalls[0]).toMatchObject({
      sessionId: 'sess_1',
      endReason: 'completed',
      elapsedSec: 30,
    });
    expect(h.endCalls[0].usage).toEqual({
      audioInputTokens: 400,
      audioOutputTokens: 300,
      cachedTokens: 50,
      textInputTokens: 12,
      textOutputTokens: 8,
      textTokens: 20,
    });

    // Ресурсы отпущены: PC закрыт, микрофон остановлен, аудиосессия отдана.
    expect(h.pc().closed).toBe(true);
    expect(h.streams[0].tracks.every((t) => t.stopped)).toBe(true);
    expect(h.inCall.stopped).toBe(1);
    expect(h.sfxLog).toContain('released');
    expect(h.sfxLog[h.sfxLog.length - 1]).toBe('endCue'); // прощальная нота — последней
  });

  it('транскрипт звонка даёт корректное обогащение для XP-заявки', async () => {
    const h = createHarness();
    await bringUpCall(h);
    const dc = h.pc().dc;
    dc.deliver({ type: 'conversation.item.input_audio_transcription.completed', transcript: 'I want a coffee' });
    dc.deliver({ type: 'response.output_audio_transcript.delta', item_id: 'a1', delta: 'Of course, here you go, sir!' });
    dc.deliver({ type: 'conversation.item.input_audio_transcription.completed', transcript: "thanks that's all" });

    // Собираем историю так же, как её собирает экран (buffer → snapshot).
    const history: TranscriptTurn[] = [
      { role: 'user', text: 'I want a coffee', atMs: 1 },
      { role: 'assistant', text: 'Of course, here you go, sir!', atMs: 2 },
      { role: 'user', text: "thanks that's all", atMs: 3 },
    ];
    // Считаются ТОЛЬКО реплики ученика: 4 слова + 3 слова ("that's" = 1).
    expect(sessionEndEnrichment(history)).toEqual({ repliesCount: 2, transcriptWordCount: 7 });
    await h.client.end();
  });
});

// ── 2. Barge-in ─────────────────────────────────────────────────────────────

describe('E2E: перебивание ИИ (barge-in)', () => {
  it('НЕ отвечает на эхо громкой связи: у него пустой транскрипт', async () => {
    // Живой звонок владельца 2026-08-23: «говорит, обрывает на половине и снова
    // говорит то же самое». Остаток эха из динамика доходит до VAD как речь.
    // Отличаем эхо от речи НЕ по времени, а по содержанию: у эха слов нет.
    const h = createHarness();
    await bringUpCall(h);
    const dc = h.pc().dc;

    dc.deliver({ type: 'response.created', response: {} });
    dc.deliver({ type: 'output_audio_buffer.started' });
    expect(dc.sentOfType('response.create')).toHaveLength(1);

    dc.deliver({ type: 'input_audio_buffer.speech_started' });
    dc.deliver({ type: 'input_audio_buffer.speech_stopped' });
    dc.deliver({ type: 'response.done', response: {} });
    dc.deliver({ type: 'output_audio_buffer.stopped' });
    // Транскрипт пустой → это был шум/эхо, ответ снимается.
    dc.deliver({ type: 'conversation.item.input_audio_transcription.completed', transcript: '' });
    expect(dc.sentOfType('response.create')).toHaveLength(1);

    await h.client.end();
  });

  it('реплика ученика получает РОВНО ОДИН ответ, без гонки и второго', async () => {
    // зачем (владелец 2026-08-23, живой звонок): «макс не слушает, всё что я
    // говорю игнорируется» — серверный create_response ответа не создавал.
    // Создание вернулось клиенту. Ключевое требование: ровно один ответ на
    // реплику (прежний таймер 1500 мс давал второй) и без ожидания тишины.
    const h = createHarness();
    await bringUpCall(h);
    const dc = h.pc().dc;

    dc.deliver({ type: 'response.created', response: {} });
    dc.deliver({ type: 'output_audio_buffer.started' });
    expect(dc.sentOfType('response.create')).toHaveLength(1);

    // Ученик говорит поверх речи MAX — настоящая речь, со словами.
    dc.deliver({ type: 'input_audio_buffer.speech_started' });
    dc.deliver({ type: 'input_audio_buffer.speech_stopped' });
    dc.deliver({
      type: 'conversation.item.input_audio_transcription.completed',
      transcript: 'wait, I have a question',
    });
    dc.deliver({ type: 'response.done', response: {} });
    dc.deliver({ type: 'output_audio_buffer.stopped' });

    // Ключевое: ответ ровно один (первый — приветственный, второй — на реплику),
    // транскрипт второго ответа не порождает.
    expect(dc.sentOfType('response.create')).toHaveLength(2);

    await h.client.end();
  });

  it('вставки клиента (системная заметка, результат инструмента) отвечаются явно', async () => {
    // Обратная сторона: create_response сервера работает на речь ученика, но НЕ
    // на текст, который клиент вставил сам. Такие вставки обязаны просить ответ
    // явно, иначе учитель промолчит в ответ на собственный сигнал.
    const h = createHarness();
    await bringUpCall(h);
    const dc = h.pc().dc;

    dc.deliver({ type: 'response.created', response: {} });
    dc.deliver({ type: 'response.done', response: {} });
    dc.deliver({ type: 'output_audio_buffer.stopped' });
    const before = dc.sentOfType('response.create').length;

    h.client.sendSystemNote('ученик молчит уже минуту');
    expect(dc.sentOfType('response.create')).toHaveLength(before + 1);

    await h.client.end();
  });

  it('оборванный лимитом ход договаривается, а не бросается на полуслове', async () => {
    // зачем (владелец 2026-08-23): «он начнёт говорить, а потом не договорит».
    // max_output_tokens рвёт речь жёстко (status incomplete), и раньше MAX просто
    // замолкал посреди фразы и ждал ученика.
    const h = createHarness();
    await bringUpCall(h);
    const dc = h.pc().dc;

    dc.deliver({ type: 'response.created', response: {} });
    dc.deliver({ type: 'output_audio_buffer.started' });
    dc.deliver({ type: 'output_audio_buffer.stopped' });
    dc.deliver({
      type: 'response.done',
      response: { status: 'incomplete', status_details: { reason: 'max_output_tokens' } },
    });

    const sent = dc.sentOfType('response.create');
    expect(sent).toHaveLength(2);
    expect(JSON.stringify(sent[1])).toContain('cut off mid-sentence');

    await h.client.end();
  });

  it('договаривает только один раз подряд — цепочки догово́рок нет', async () => {
    const h = createHarness();
    await bringUpCall(h);
    const dc = h.pc().dc;

    const truncated = {
      type: 'response.done',
      response: { status: 'incomplete', status_details: { reason: 'max_output_tokens' } },
    };
    dc.deliver({ type: 'response.created', response: {} });
    dc.deliver({ type: 'output_audio_buffer.started' });
    dc.deliver({ type: 'output_audio_buffer.stopped' });
    dc.deliver(truncated);
    expect(dc.sentOfType('response.create')).toHaveLength(2);

    // Вторая обрезка подряд: ход отдаётся ученику, а не новой догово́рке.
    dc.deliver({ type: 'response.created', response: {} });
    dc.deliver({ type: 'output_audio_buffer.started' });
    dc.deliver({ type: 'output_audio_buffer.stopped' });
    dc.deliver(truncated);
    expect(dc.sentOfType('response.create')).toHaveLength(2);

    await h.client.end();
  });

  it('обычный законченный ответ догово́рку не запускает', async () => {
    const h = createHarness();
    await bringUpCall(h);
    const dc = h.pc().dc;

    dc.deliver({ type: 'response.created', response: {} });
    dc.deliver({ type: 'output_audio_buffer.started' });
    dc.deliver({ type: 'output_audio_buffer.stopped' });
    dc.deliver({ type: 'response.done', response: { status: 'completed' } });
    expect(dc.sentOfType('response.create')).toHaveLength(1);

    await h.client.end();
  });

  it('шлёт cancel+clear и мгновенно глушит голос ИИ, возвращая звук через 300мс', async () => {
    const h = createHarness();
    await bringUpCall(h);
    const remote = makeTrack();
    h.pc().emitRemoteTrack(remote);

    h.client.bargeIn();

    // Оба события ушли серверу — одного response.cancel мало, буфер вывода
    // нужно чистить явно, иначе дозвучит уже сгенерированное.
    const dc = h.pc().dc;
    expect(dc.sentOfType('response.cancel')).toHaveLength(1);
    expect(dc.sentOfType('output_audio_buffer.clear')).toHaveLength(1);

    // Голос ИИ замолчал немедленно (страховка от jitter-буфера).
    expect(remote.enabled).toBe(false);

    // ...и вернулся сам через 300мс — юзер не остаётся с немым собеседником.
    h.advance(MAX_CALL_BARGE_IN_MUTE_MS);
    expect(remote.enabled).toBe(true);

    await h.client.end();
  });

  it('barge-in вне активной фазы — no-op (не шлём в закрытый канал)', async () => {
    const h = createHarness();
    await bringUpCall(h);
    await h.client.end();
    expect(() => h.client.bargeIn()).not.toThrow();
  });
});

// ── 3. Реконнект: обе фазы ──────────────────────────────────────────────────

describe('E2E: потеря сети', () => {
  it('фаза 1 — ICE ожил внутри grace-окна: тот же звонок, БЕЗ ре-минта', async () => {
    const h = createHarness();
    await bringUpCall(h);
    const micTrack = h.streams[0].tracks[0];
    h.pc().dc.deliver({ type: 'response.created', response: {} });

    h.pc().setIce('disconnected');
    expect(h.client.phase()).toBe('reconnecting');
    expect(uiTypes(h)).toContain('reconnect_started');
    // Микрофон замьючен на время обрыва — юзер не «говорит в пустоту».
    expect(micTrack.enabled).toBe(false);

    // Сеть вернулась до истечения grace.
    h.advance(RECONNECT_GRACE_MS - 500);
    h.pc().setIce('connected');

    expect(h.client.phase()).toBe('active');
    expect(micTrack.enabled).toBe(true);
    expect(uiTypes(h)).toContain('reconnected');
    // Потерянный response.done старой линии не должен навсегда блокировать
    // подсказки/повтор фразы после восстановления соединения.
    expect(h.client.sendHintResponse('Hint after reconnect.', 64)).toBe(true);
    // Главное: НИКАКОГО второго минта — деньги за новую сессию не потрачены.
    expect(h.mintCalls).toHaveLength(1);

    await h.client.end();
  });

  it('фаза 2 — grace истёк: ре-минт с reconnectOf и переносом контекста', async () => {
    const h = createHarness();
    await bringUpCall(h);
    h.history.push(
      { role: 'user', text: 'I want a cappuccino', atMs: 1 },
      { role: 'assistant', text: 'What size?', atMs: 2 },
    );
    const firstPc = h.pc();

    firstPc.setIce('failed');
    expect(h.client.phase()).toBe('reconnecting');

    // Grace истекает → авто-ре-минт.
    h.advance(RECONNECT_GRACE_MS);
    await flush();

    expect(h.mintCalls).toHaveLength(2);
    // Сервер обязан узнать, что это продолжение — иначе спишет секунды дважды.
    expect(h.mintCalls[1].reconnectOf).toBe('sess_1');
    // И получить локальную summary, чтобы ИИ не начал разговор с нуля.
    expect(typeof h.mintCalls[1].reconnectSummary).toBe('string');
    expect(String(h.mintCalls[1].reconnectSummary).length).toBeGreaterThan(0);

    // Старый транспорт похоронен, новый поднят.
    expect(firstPc.closed).toBe(true);
    expect(h.pcs.length).toBe(2);

    // Новый data channel открывается → звонок снова живой.
    h.pc().dc.open();
    await flush();
    expect(h.client.phase()).toBe('active');
    expect(h.client.sessionId()).toBe('sess_2');
    expect(uiTypes(h)).toContain('reconnected');

    // Аудиосессию при этом НЕ отпускали — звонок для юзера не прерывался.
    expect(h.inCall.stopped).toBe(0);

    await h.client.end();
    // Сеттлмент отчитывается по АКТУАЛЬНОЙ сессии чейна.
    expect(h.endCalls[0].sessionId).toBe('sess_2');
  });

  it('гонка: канал ре-минта открылся РАНЬШЕ, чем навесили onopen — звонок всё равно оживает', async () => {
    // Реальная гонка нативного стека: data channel может отрапортовать open
    // до того, как JS успел присвоить onopen. Без страховки
    // `if (readyState === 'open') finish()` звонок навсегда завис бы в
    // reconnecting при живом транспорте — юзер видел бы «переподключение»
    // поверх работающей линии.
    const h = createHarness();
    await bringUpCall(h);
    h.pc().setIce('failed');
    h.advance(RECONNECT_GRACE_MS);

    // Ждём ровно до появления нового канала — раньше, чем doRemint дойдёт
    // до присваивания onopen.
    let openedEarly = false;
    for (let i = 0; i < 20; i += 1) {
      await Promise.resolve();
      const fresh = h.pcs[1]?.channels[0];
      if (fresh) {
        // Ключевая проверка: onopen ЕЩЁ не навешен — гонка воспроизведена.
        expect(fresh.onopen).toBeNull();
        fresh.readyState = 'open';
        fresh.onopen?.(); // никого нет — событие «потеряно», как в проде
        openedEarly = true;
        break;
      }
    }
    expect(openedEarly).toBe(true);

    // Страховка обязана подхватить уже открытый канал.
    await flush();
    expect(h.client.phase()).toBe('active');
    expect(h.client.sessionId()).toBe('sess_2');

    await h.client.end();
  });

  it('неоткрывшийся data channel ре-минта имеет таймаут и продолжает от нового sessionId', async () => {
    const h = createHarness();
    await bringUpCall(h);
    h.pc().setIce('failed');
    h.advance(RECONNECT_GRACE_MS);
    await flush();

    expect(h.client.sessionId()).toBe('sess_2');
    expect(h.mintCalls).toHaveLength(2);
    // Второй канал никогда не открывается — через bounded timeout клиент
    // обязан не зависнуть, а перенести уже активный резерв sess_2 → sess_3.
    h.advance(MAX_CALL_CONNECT_TIMEOUT_MS);
    await flush(24);

    expect(h.mintCalls).toHaveLength(3);
    expect(h.mintCalls[2].reconnectOf).toBe('sess_2');
    h.pc().dc.open();
    expect(h.client.phase()).toBe('active');
    expect(h.client.sessionId()).toBe('sess_3');
    await h.client.end();
  });

  it('сбой микрофона после transferReserve продолжает реконнект от перенесённой сессии', async () => {
    const h = createHarness({
      mediaImpl: async (callIndex) => {
        if (callIndex === 1) throw new Error('ios_audio_session_transition_failed');
        const tracks = [makeTrack()];
        const stream = { tracks, getTracks: () => tracks };
        h.streams.push(stream);
        return stream;
      },
    });
    await bringUpCall(h);
    h.pc().setIce('failed');
    h.advance(RECONNECT_GRACE_MS);
    await flush(30);

    expect(h.mintCalls).toHaveLength(3);
    expect(h.mintCalls[1].reconnectOf).toBe('sess_1');
    expect(h.mintCalls[2].reconnectOf).toBe('sess_2');
    h.pc().dc.open();
    expect(h.client.phase()).toBe('active');
    expect(h.client.sessionId()).toBe('sess_3');
    await h.client.end();
  });

  it('исчерпание чейна реконнектов честно валит звонок в failed', async () => {
    // Кап auto=1: первый ре-минт разрешён, второй — нет.
    const h = createHarness({
      mintImpl: async (_req, i) =>
        makeMint(`sess_${i + 1}`, { limits: { reconnectChainMax: { auto: 1, manual: 0 } } }),
    });
    await bringUpCall(h);

    // Обрыв №1 → ре-минт разрешён.
    h.pc().setIce('failed');
    h.advance(RECONNECT_GRACE_MS);
    await flush();
    expect(h.mintCalls).toHaveLength(2);
    h.pc().dc.open();
    expect(h.client.phase()).toBe('active');

    // Обрыв №2 → кап исчерпан.
    h.pc().setIce('failed');
    h.advance(RECONNECT_GRACE_MS);
    await flush();

    expect(h.client.phase()).toBe('reconnect_failed');
    expect(h.mintCalls).toHaveLength(2); // третьего минта не было
    const fail = h.uiEvents.find((e) => e.type === 'fail');
    expect(fail).toBeDefined();
    // Терминальный экран остаётся видимым: сеттлмент происходит после явного
    // «завершить», а не маскирует потерю связи автоматическим выходом.
    expect(h.endCalls).toHaveLength(0);
    await h.client.end('dropped');
    expect(h.endCalls).toHaveLength(1);
    expect(h.endCalls[0].endReason).toBe('dropped'); // 'failed' → 'dropped' на границе
  });
});

// ── 4. Сбои и идемпотентность ───────────────────────────────────────────────

describe('E2E: сбои на каждом шаге поднятия звонка', () => {
  it('провал минта: фаза failed, нативные ресурсы закрыты, сеттлмента нет', async () => {
    const h = createHarness({
      mintImpl: async () => {
        throw new Error('quota_exhausted');
      },
    });
    await h.client.start({ format: 'scenario' });
    // Дать шанс отложенной чистке offerPromise.
    await flush();

    expect(h.client.phase()).toBe('failed');
    expect(h.uiEvents.find((e) => e.type === 'fail')).toMatchObject({ reason: 'quota_exhausted' });
    // Сессии не было — серверу нечего закрывать.
    expect(h.endCalls).toHaveLength(0);
    // Но микрофон и PC, созданные параллельно минту, обязаны быть отпущены.
    expect(h.pcs[0].closed).toBe(true);
    expect(h.streams[0].tracks.every((t) => t.stopped)).toBe(true);
    // VoiceChat-сессия намеренно захватывается ДО getUserMedia, чтобы iOS не
    // пересобрал AVAudioSession под живым треком. При провале минта она должна
    // быть симметрично освобождена; end-нота не играет, т.к. active не было.
    expect(h.inCall.started).toBe(1);
    expect(h.inCall.stopped).toBe(1);
    expect(h.sfxLog).not.toContain('endCue');
  });

  it('провал SDP-обмена ПОСЛЕ минта: звонок падает, но сессия закрывается на сервере', async () => {
    const h = createHarness({
      exchangeSdpImpl: async () => {
        throw new Error('502');
      },
    });
    await h.client.start({ format: 'scenario' });

    expect(h.client.phase()).toBe('failed');
    expect(h.uiEvents.find((e) => e.type === 'fail')).toMatchObject({ reason: 'sdp_exchange_failed' });
    // Ключевое: минт уже потратил деньги и зарезервировал секунды — обязаны
    // отчитаться, иначе квота юзера висит занятой до серверного watchdog.
    expect(h.endCalls).toHaveLength(1);
    expect(h.endCalls[0].endReason).toBe('dropped');
  });

  it('провал preflight не доходит до минта (деньги не тратятся)', async () => {
    const h = createHarness({
      preflight: async () => {
        throw new Error('gate_closed');
      },
    });
    await h.client.start({ format: 'scenario' });

    expect(h.client.phase()).toBe('failed');
    expect(h.uiEvents.find((e) => e.type === 'fail')).toMatchObject({ reason: 'preflight_failed' });
    expect(h.mintCalls).toHaveLength(0);
  });

  it('end() во время минта: teardown доводится до конца без утечки нативных ресурсов', async () => {
    let releaseMint: (v: MaxVoiceMintResponse) => void = () => {};
    const h = createHarness({
      mintImpl: () =>
        new Promise<MaxVoiceMintResponse>((resolve) => {
          releaseMint = resolve;
        }),
    });
    const startPromise = h.client.start({ format: 'scenario' });
    await Promise.resolve();

    // Юзер передумал, пока сервер минтил.
    const endPromise = h.client.end('completed');
    releaseMint(makeMint('sess_late'));
    await endPromise;
    await startPromise;
    await flush();

    expect(h.client.phase()).toBe('ended');
    // PC/микрофон, созданные параллельно, закрыты несмотря на гонку.
    expect(h.pcs[0].closed).toBe(true);
    expect(h.streams[0].tracks.every((t) => t.stopped)).toBe(true);
  });

  it('двойной end() идемпотентен: один сеттлмент, один stop аудиосессии', async () => {
    const h = createHarness();
    await bringUpCall(h);

    const a = h.client.end('completed');
    const b = h.client.end('background'); // второй вызов обязан вернуть тот же промис
    expect(a).toBe(b);
    await Promise.all([a, b]);

    expect(h.endCalls).toHaveLength(1);
    expect(h.endCalls[0].endReason).toBe('completed'); // побеждает первый
    expect(h.inCall.stopped).toBe(1);
    expect(h.sfxLog.filter((s) => s === 'endCue')).toHaveLength(1);
  });

  it('падение сеттлмента на сервере не мешает закрыть звонок локально', async () => {
    // Сеть отвалилась ровно на «положить трубку». Юзер обязан выйти из звонка,
    // а недоотчитавшуюся сессию дожмёт серверный watchdog по heartbeat'ам.
    const h = createHarness({
      endImpl: async () => {
        throw new Error('network_down');
      },
    });
    await bringUpCall(h);

    await expect(h.client.end('completed')).resolves.toBeUndefined();
    expect(h.client.phase()).toBe('ended');
    expect(h.endCalls).toHaveLength(1); // попытка была
    // И нативные ресурсы всё равно отпущены — иначе микрофон остался бы висеть.
    expect(h.inCall.stopped).toBe(1);
    expect(h.pc().closed).toBe(true);
    expect(h.streams[0].tracks.every((t) => t.stopped)).toBe(true);
  });
});

// ── 5. Инжектируемые ответы и wrap-up ───────────────────────────────────────

describe('E2E: wrap-up и подсказки', () => {
  it('wrap-up доставляет СЕРВЕРНЫЙ текст и ограничивает длину ответа', async () => {
    const h = createHarness();
    await bringUpCall(h);

    h.client.sendWrapUp();
    const dc = h.pc().dc;

    const item = dc.sentOfType('conversation.item.create')[0];
    // Текст пришёл из минта — клиент его не выдумывает (спека §4).
    expect(JSON.stringify(item)).toContain('[WRAP_UP] Time to wrap up.');

    const resp = dc.sentOfType('response.create')[0];
    // 600 аудио-токенов ≈ 30с: прощание в два хода не рвётся (было 400 = 20с).
    expect((resp.response as Record<string, unknown>).max_output_tokens).toBe(INJECTED_MAX_TOKENS);
    expect(INJECTED_MAX_TOKENS).toBe(600);
    expect(uiTypes(h)).toContain('wrap_up');

    await h.client.end();
  });

  it('подсказка шлётся как одноразовый response.create с капом токенов', async () => {
    const h = createHarness();
    await bringUpCall(h);

    // Приветствие завершено: только после response.done можно просить отдельное
    // воспроизведение подсказки.
    h.pc().dc.deliver({ type: 'response.done', response: {} });

    expect(h.client.sendHintResponse('Give a gentle hint in English.', 120)).toBe(true);
    const responses = h.pc().dc.sentOfType('response.create');
    const resp = responses[responses.length - 1];
    expect((resp.response as Record<string, unknown>).instructions).toBe('Give a gentle hint in English.');
    expect((resp.response as Record<string, unknown>).max_output_tokens).toBe(120);

    await h.client.end();
  });

  it('не посылает повтор подсказки поверх активного или уже запрошенного ответа', async () => {
    const h = createHarness();
    await bringUpCall(h);
    const dc = h.pc().dc;

    dc.deliver({ type: 'response.done', response: {} });
    expect(h.client.sendHintResponse('Replay once.', 64)).toBe(true);
    const afterFirst = dc.sentOfType('response.create').length;
    expect(h.client.sendHintResponse('Replay twice.', 64)).toBe(false);
    expect(dc.sentOfType('response.create')).toHaveLength(afterFirst);

    dc.deliver({ type: 'response.created', response: {} });
    expect(h.client.sendHintResponse('Replay while active.', 64)).toBe(false);
    dc.deliver({ type: 'response.done', response: {} });
    expect(h.client.sendHintResponse('Replay after done.', 64)).toBe(true);

    await h.client.end();
  });

  it('после завершения звонка ничего в канал не шлётся', async () => {
    const h = createHarness();
    await bringUpCall(h);
    const dc = h.pc().dc;
    await h.client.end();
    const before = dc.sent.length;

    h.client.sendWrapUp();
    h.client.sendHintResponse('hint');
    h.client.bargeIn();

    expect(dc.sent.length).toBe(before);
  });
});

// ── 6. Устойчивость к шуму протокола ────────────────────────────────────────

describe('E2E: устойчивость к мусору в data channel', () => {
  it('битый JSON, не-строки и неизвестные события не роняют звонок', async () => {
    const h = createHarness();
    await bringUpCall(h);
    const dc = h.pc().dc;

    expect(() => {
      dc.onmessage?.({ data: 'not json at all' });
      dc.onmessage?.({ data: '{"broken":' });
      dc.onmessage?.({ data: 42 });
      dc.onmessage?.({ data: null });
      dc.onmessage?.({ data: JSON.stringify(['array', 'not', 'object']) });
      dc.onmessage?.({ data: JSON.stringify({ type: 'some.future.event.v9', payload: {} }) });
      dc.onmessage?.({ data: JSON.stringify({ noTypeField: true }) });
      dc.onmessage?.({ data: JSON.stringify({ type: 'error', error: { message: 'active response' } }) });
    }).not.toThrow();

    expect(h.client.phase()).toBe('active');
    await h.client.end();
  });

  it('usage игнорирует отрицательные и битые значения, аккумулятор не убывает', async () => {
    const h = createHarness();
    await bringUpCall(h);
    const dc = h.pc().dc;

    dc.deliver({
      type: 'response.done',
      response: { usage: { input_token_details: { audio_tokens: 100 } } },
    });
    dc.deliver({
      type: 'response.done',
      response: {
        usage: {
          input_token_details: { audio_tokens: -500, cached_tokens: 'lots', text_tokens: NaN },
          output_token_details: { audio_tokens: 50 },
        },
      },
    });

    expect(h.client.usageTotals()).toEqual({
      audioInputTokens: 100, // -500 проигнорировано, не вычлось
      audioOutputTokens: 50,
      cachedTokens: 0,
      textInputTokens: 0,
      textOutputTokens: 0,
      textTokens: 0,
    });
    await h.client.end();
  });

  it('response.done без usage не ломает аккумулятор', async () => {
    const h = createHarness();
    await bringUpCall(h);
    h.pc().dc.deliver({ type: 'response.done', response: {} });
    h.pc().dc.deliver({ type: 'response.done' });
    expect(h.client.usageTotals().audioInputTokens).toBe(0);
    await h.client.end();
  });
});

// ── 7. Мьют ─────────────────────────────────────────────────────────────────

describe('E2E: управление микрофоном', () => {
  it('мьют юзера переживает реконнект (grace-мьют его не отменяет)', async () => {
    const h = createHarness();
    await bringUpCall(h);
    const mic = h.streams[0].tracks[0];

    h.client.setMuted(true);
    expect(mic.enabled).toBe(false);

    // Обрыв и восстановление в grace-окне.
    h.pc().setIce('disconnected');
    h.advance(1000);
    h.pc().setIce('connected');

    // Юзер просил мьют — он обязан остаться замьюченным.
    expect(mic.enabled).toBe(false);
    expect(h.client.phase()).toBe('active');

    h.client.setMuted(false);
    expect(mic.enabled).toBe(true);

    await h.client.end();
  });
});

// ── 8. Контракт причин завершения ───────────────────────────────────────────

describe('E2E: причины завершения на границе клиент↔сервер', () => {
  it('все клиентские причины маппятся в словарь сервера', () => {
    expect(toServerEndReason('completed')).toBe('completed');
    expect(toServerEndReason('capped')).toBe('capped');
    expect(toServerEndReason('dropped')).toBe('dropped');
    expect(toServerEndReason('background')).toBe('background');
    // Единственная «наша» причина, которой сервер не знает.
    expect(toServerEndReason('failed')).toBe('dropped');
  });

  it('уход в фон отчитывается как background (не как обрыв)', async () => {
    const h = createHarness();
    await bringUpCall(h);
    await h.client.end('background');
    expect(h.endCalls[0].endReason).toBe('background');
  });

  it('исчерпание лимита минут отчитывается как capped', async () => {
    const h = createHarness();
    await bringUpCall(h);
    await h.client.end('capped');
    expect(h.endCalls[0].endReason).toBe('capped');
  });
});
