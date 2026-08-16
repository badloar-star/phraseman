// Транспортная машина MAX-звонка: happy-path на моках deps, идемпотентный
// teardown, heartbeat 30с на fake timers, barge-in по разделу 4 спеки.
//
// Нативный стек целиком мокается через deps.native — прямых импортов
// react-native-webrtc в max_call_client нет по контракту (иначе jest падает).

import {
  createMaxCallClient,
  MAX_CALL_BARGE_IN_MUTE_MS,
  MAX_CALL_HEARTBEAT_MS,
  MAX_CALL_CONNECT_TIMEOUT_MS,
  MAX_CALL_GREETING_HOLD_MAX_MS,
  MAX_CALL_ICE_GATHER_TIMEOUT_MS,
  MAX_CALL_START_TIMEOUT_MS,
  completeLocalOfferSdp,
  type MaxCallDeps,
  type MaxCallTranscriptEvent,
  type MaxVoiceMintResponse,
  type VoiceUsageTotals,
} from '../app/max_call_client';
import { RECONNECT_GRACE_MS } from '../app/max_call_reconnect';
import type { MaxCallUiEvent } from '../app/max_call_ui_state';
import type {
  MaxVoiceNativeModule,
  MediaStreamTrackLike,
  RtcDataChannelLike,
  RtcPeerConnectionLike,
} from '../app/max_webrtc_module';

type DcMock = RtcDataChannelLike & {
  send: jest.Mock;
  close: jest.Mock;
  readyState: string;
};

function makeHarness(overrides?: Partial<MaxCallDeps>) {
  const localTrack: MediaStreamTrackLike & { stop: jest.Mock } = {
    enabled: true,
    stop: jest.fn(),
    kind: 'audio',
  };
  const stream = { getTracks: () => [localTrack] };

  const dc: DcMock = {
    readyState: 'connecting',
    send: jest.fn(),
    close: jest.fn(),
    onopen: null,
    onmessage: null,
    onclose: null,
  };

  const pc: RtcPeerConnectionLike & { close: jest.Mock } = {
    createOffer: jest.fn().mockResolvedValue({ type: 'offer', sdp: 'offer-sdp' }),
    setLocalDescription: jest.fn().mockResolvedValue(undefined),
    setRemoteDescription: jest.fn().mockResolvedValue(undefined),
    addTrack: jest.fn(),
    createDataChannel: jest.fn().mockReturnValue(dc),
    getStats: jest.fn().mockResolvedValue([]),
    close: jest.fn(),
    iceConnectionState: 'new',
    iceGatheringState: 'complete',
    localDescription: { type: 'offer', sdp: 'offer-sdp' },
    oniceconnectionstatechange: null,
    onicegatheringstatechange: null,
    ontrack: null,
  };

  const inCall = {
    start: jest.fn(),
    stop: jest.fn(),
    setSpeakerphoneOn: jest.fn(),
    setForceSpeakerphoneOn: jest.fn(),
    setKeepScreenOn: jest.fn(),
  };
  const native: MaxVoiceNativeModule = {
    RTCPeerConnection: function MockPc(this: unknown) {
      return pc;
    } as unknown as MaxVoiceNativeModule['RTCPeerConnection'],
    mediaDevices: { getUserMedia: jest.fn().mockResolvedValue(stream) },
    InCallManager: inCall,
  };

  const mintResponse: MaxVoiceMintResponse = {
    value: 'ephemeral-secret',
    session_id: 'sess-1',
    max_seconds: 300,
    wrapUpText: '[WRAP_UP] time to say goodbye',
  };

  const uiEvents: MaxCallUiEvent[] = [];
  const transcript: MaxCallTranscriptEvent[] = [];

  const deps: MaxCallDeps = {
    native,
    mint: jest.fn().mockResolvedValue(mintResponse),
    heartbeat: jest.fn().mockResolvedValue(undefined),
    end: jest.fn().mockResolvedValue(undefined),
    exchangeSdp: jest.fn().mockResolvedValue('answer-sdp'),
    restoreAudioSession: jest.fn(),
    now: () => Date.now(),
    onUiEvent: (e) => uiEvents.push(e),
    onTranscriptDelta: (e) => transcript.push(e),
    ...overrides,
  };

  return { deps, pc, dc, localTrack, inCall, uiEvents, transcript, mintResponse };
}

/** Довести клиент до active: start() + открытие data channel. */
async function connect(h: ReturnType<typeof makeHarness>) {
  const client = createMaxCallClient(h.deps);
  await client.start({ format: 'scenario', scenarioId: 'coffee', cefr: 'A2' });
  h.dc.readyState = 'open';
  h.dc.onopen?.();
  return client;
}

function dcMessage(h: ReturnType<typeof makeHarness>, payload: Record<string, unknown>) {
  h.dc.onmessage?.({ data: JSON.stringify(payload) });
}

/** response.done с контрактной разбивкой usage (input/output_token_details). */
function usageDone(input: Partial<Record<string, number>>, output: Partial<Record<string, number>>) {
  return {
    type: 'response.done',
    response: { usage: { input_token_details: input, output_token_details: output } },
  };
}

const ZERO_USAGE: VoiceUsageTotals = {
  audioInputTokens: 0,
  audioOutputTokens: 0,
  cachedTokens: 0,
  textTokens: 0,
};

/** Дожать микротаски async-цепочек (минт → PC → SDP) под fake timers. */
async function flushAsync(steps = 12) {
  for (let i = 0; i < steps; i += 1) await Promise.resolve();
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('happy-path: idle → … → active на моках deps', () => {
  it('ждёт ICE complete и отправляет обновлённый localDescription SDP', async () => {
    const h = makeHarness();
    h.pc.iceGatheringState = 'gathering';
    h.pc.localDescription = { type: 'offer', sdp: 'offer-without-candidates' };
    const pending = completeLocalOfferSdp(h.pc, 'offer-fallback');

    h.pc.localDescription = { type: 'offer', sdp: 'offer-with-ice-candidates' };
    h.pc.iceGatheringState = 'complete';
    h.pc.onicegatheringstatechange?.();

    await expect(pending).resolves.toBe('offer-with-ice-candidates');
  });

  it('ICE gathering timeout не оставляет старт вечным', async () => {
    const h = makeHarness();
    h.pc.iceGatheringState = 'gathering';
    h.pc.localDescription = { type: 'offer', sdp: 'best-known-sdp' };
    const pending = completeLocalOfferSdp(h.pc, 'offer-fallback');

    jest.advanceTimersByTime(MAX_CALL_ICE_GATHER_TIMEOUT_MS);

    await expect(pending).resolves.toBe('best-known-sdp');
    expect(h.pc.onicegatheringstatechange).toBeNull();
  });

  it('минт и offer идут параллельно, соединение доходит до active', async () => {
    const h = makeHarness();
    const client = await connect(h);

    expect(client.phase()).toBe('active');
    expect(client.sessionId()).toBe('sess-1');
    expect(h.deps.mint).toHaveBeenCalledTimes(1);
    expect(h.deps.exchangeSdp).toHaveBeenCalledWith('offer-sdp', 'ephemeral-secret');
    expect(h.pc.setRemoteDescription).toHaveBeenCalledWith({ type: 'answer', sdp: 'answer-sdp' });
    expect(h.inCall.start).toHaveBeenCalledTimes(1);
    expect(h.inCall.setForceSpeakerphoneOn).toHaveBeenCalledWith(true);
    expect(h.inCall.setSpeakerphoneOn).toHaveBeenCalledWith(true);
    expect(h.inCall.setKeepScreenOn).toHaveBeenCalledWith(true);
    expect(h.inCall.start.mock.invocationCallOrder[0]).toBeLessThan(
      (h.deps.native.mediaDevices.getUserMedia as jest.Mock).mock.invocationCallOrder[0],
    );
    expect(h.uiEvents).toContainEqual({ type: 'connected' });
  });

  it('закрывает заминченную сессию, если data channel не открылся вовремя', async () => {
    const h = makeHarness();
    const client = createMaxCallClient(h.deps);
    await client.start({ format: 'scenario' });
    expect(client.phase()).toBe('configuring');

    await jest.advanceTimersByTimeAsync(MAX_CALL_CONNECT_TIMEOUT_MS);
    await flushAsync();
    expect(client.phase()).toBe('failed');
    expect(h.uiEvents).toContainEqual({ type: 'fail', reason: 'connection_timeout' });
    expect(h.deps.end).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: 'sess-1',
      endReason: 'dropped',
    }));
  });

  it('не висит вечно, когда callable минта не отвечает', async () => {
    const h = makeHarness({ mint: jest.fn(() => new Promise(() => {})) });
    const client = createMaxCallClient(h.deps);
    const start = client.start({ format: 'scenario' });
    await flushAsync();
    await jest.advanceTimersByTimeAsync(MAX_CALL_START_TIMEOUT_MS);
    await start;

    expect(client.phase()).toBe('failed');
    expect(h.uiEvents).toContainEqual({ type: 'fail', reason: 'server_timeout' });
    expect(h.pc.close).toHaveBeenCalledTimes(1);
  });

  it('события data channel транслируются в MaxCallUiEvent и транскрипт', async () => {
    const h = makeHarness();
    await connect(h);
    h.uiEvents.length = 0;

    dcMessage(h, { type: 'input_audio_buffer.speech_started' });
    dcMessage(h, { type: 'response.created' });
    dcMessage(h, { type: 'output_audio_buffer.started' });
    dcMessage(h, {
      type: 'response.output_audio_transcript.delta',
      item_id: 'item-1',
      delta: 'Hello',
    });
    dcMessage(h, usageDone({ audio_tokens: 42 }, {}));
    dcMessage(h, {
      type: 'conversation.item.input_audio_transcription.completed',
      transcript: 'hi there',
    });

    expect(h.uiEvents.map((e) => e.type)).toEqual([
      'speech_started',
      'response_created',
      'audio_out_started',
      'response_done',
    ]);
    expect(h.transcript).toEqual([
      { kind: 'assistant_delta', itemId: 'item-1', delta: 'Hello' },
      { kind: 'user_final', text: 'hi there' },
    ]);
  });

  it('битый JSON и неизвестные события — тихий no-op, не throw', async () => {
    const h = makeHarness();
    const client = await connect(h);

    expect(() => h.dc.onmessage?.({ data: '{broken json' })).not.toThrow();
    expect(() => dcMessage(h, { type: 'some.future.event' })).not.toThrow();
    expect(() => dcMessage(h, { type: 'error', error: { code: 'x' } })).not.toThrow();
    expect(client.phase()).toBe('active');
  });

  it('usage из response.done аккумулируется по разбивке токенов, монотонно', async () => {
    const h = makeHarness();
    const client = await connect(h);
    dcMessage(h, usageDone({ audio_tokens: 30, cached_tokens: 10, text_tokens: 5 }, { audio_tokens: 40, text_tokens: 15 }));
    dcMessage(h, usageDone({ audio_tokens: 20 }, { audio_tokens: 10, text_tokens: 5 }));
    // Битые/отрицательные значения не уменьшают аккумулятор.
    dcMessage(h, usageDone({ audio_tokens: -999, cached_tokens: Number.NaN }, {}));
    dcMessage(h, { type: 'response.done', response: { usage: { total_tokens: 12345 } } });
    expect(client.usageTotals()).toEqual({
      audioInputTokens: 50,
      audioOutputTokens: 50,
      cachedTokens: 10,
      textTokens: 25,
    });
  });
});

describe('heartbeat 30с на fake timers', () => {
  it('первый heartbeat уходит СРАЗУ на активации («алло», elapsed 0), дальше — каждые 30с', async () => {
    const h = makeHarness();
    await connect(h);

    // зачем: сервер считает секунды разговора от первого heartbeat (activatedAtMs),
    // чтобы заранее сделанный минт (premint на пре-экране) не списывал раздумья.
    expect(h.deps.heartbeat).toHaveBeenCalledTimes(1);
    expect(h.deps.heartbeat).toHaveBeenLastCalledWith({
      sessionId: 'sess-1',
      elapsedSec: 0,
      usage: ZERO_USAGE,
    });

    jest.advanceTimersByTime(MAX_CALL_HEARTBEAT_MS);
    expect(h.deps.heartbeat).toHaveBeenCalledTimes(2);
    expect(h.deps.heartbeat).toHaveBeenLastCalledWith({
      sessionId: 'sess-1',
      elapsedSec: 30,
      usage: ZERO_USAGE,
    });

    dcMessage(h, usageDone({ audio_tokens: 40, text_tokens: 15 }, { audio_tokens: 25 }));
    jest.advanceTimersByTime(MAX_CALL_HEARTBEAT_MS);
    expect(h.deps.heartbeat).toHaveBeenCalledTimes(3);
    expect(h.deps.heartbeat).toHaveBeenLastCalledWith({
      sessionId: 'sess-1',
      elapsedSec: 60,
      usage: { audioInputTokens: 40, audioOutputTokens: 25, cachedTokens: 0, textTokens: 15 },
    });
  });

  it('упавший heartbeat не рвёт звонок (границу держит серверный watchdog)', async () => {
    const h = makeHarness({
      heartbeat: jest.fn().mockRejectedValue(new Error('network')),
    });
    const client = await connect(h);
    jest.advanceTimersByTime(MAX_CALL_HEARTBEAT_MS);
    await Promise.resolve(); // дать rejection дойти до catch
    expect(client.phase()).toBe('active');
  });
});

describe('идемпотентный teardown', () => {
  it('закрывает каждый ресурс один раз и один раз отчитывается end', async () => {
    const h = makeHarness();
    const client = await connect(h);

    await client.end('completed');
    expect(client.phase()).toBe('ended');
    expect(h.dc.close).toHaveBeenCalledTimes(1);
    expect(h.pc.close).toHaveBeenCalledTimes(1);
    expect(h.localTrack.stop).toHaveBeenCalledTimes(1);
    expect(h.inCall.stop).toHaveBeenCalledTimes(1);
    expect(h.inCall.setForceSpeakerphoneOn.mock.calls).toEqual([[true], [null]]);
    expect(h.inCall.setKeepScreenOn.mock.calls).toEqual([[true], [false]]);
    expect(h.deps.restoreAudioSession).toHaveBeenCalledTimes(1);
    expect(h.deps.end).toHaveBeenCalledTimes(1);
    expect(h.deps.end).toHaveBeenCalledWith({
      sessionId: 'sess-1',
      endReason: 'completed',
      elapsedSec: 0,
      usage: ZERO_USAGE,
    });
  });

  it('повторный end() — no-op: тот же промис, без второго сеттлмента', async () => {
    const h = makeHarness();
    const client = await connect(h);

    const first = client.end('completed');
    const second = client.end('dropped');
    expect(second).toBe(first);
    await first;
    await client.end();

    expect(h.deps.end).toHaveBeenCalledTimes(1);
    expect(h.dc.close).toHaveBeenCalledTimes(1);
    expect(h.pc.close).toHaveBeenCalledTimes(1);
    expect(h.inCall.stop).toHaveBeenCalledTimes(1);
    expect(client.phase()).toBe('ended');
  });

  it('после teardown heartbeat молчит (таймер снят)', async () => {
    const h = makeHarness();
    const client = await connect(h);
    await client.end();
    const afterEnd = (h.deps.heartbeat as jest.Mock).mock.calls.length; // только «алло»-heartbeat
    jest.advanceTimersByTime(MAX_CALL_HEARTBEAT_MS * 4);
    expect(h.deps.heartbeat).toHaveBeenCalledTimes(afterEnd);
  });

  it('падение deps.end не мешает дойти до ended (дожмёт watchdog)', async () => {
    const h = makeHarness({ end: jest.fn().mockRejectedValue(new Error('offline')) });
    const client = await connect(h);
    await expect(client.end('dropped')).resolves.toBeUndefined();
    expect(client.phase()).toBe('ended');
    expect(h.inCall.stop).toHaveBeenCalledTimes(1);
  });

  it('сброс мгновенный, даже если maxVoiceSessionEnd никогда не ответит', async () => {
    const h = makeHarness({ end: jest.fn(() => new Promise(() => {})) });
    const client = await connect(h);

    await expect(client.end('completed')).resolves.toBeUndefined();
    expect(client.phase()).toBe('ended');
    expect(h.inCall.stop).toHaveBeenCalledTimes(1);
    expect(h.deps.end).toHaveBeenCalledTimes(1);
  });

  it('провал минта → failed, сеттлмент не отправляется (нечего закрывать)', async () => {
    const h = makeHarness({ mint: jest.fn().mockRejectedValue(new Error('quota')) });
    const client = createMaxCallClient(h.deps);
    await client.start({ format: 'scenario' });
    expect(client.phase()).toBe('failed');
    expect(h.deps.end).not.toHaveBeenCalled();
    expect(h.uiEvents.some((e) => e.type === 'fail')).toBe(true);
  });

  it('сброс во время минта закрывает поздний серверный резерв ровно один раз', async () => {
    let resolveMint!: (value: MaxVoiceMintResponse) => void;
    const mint = jest.fn(() => new Promise<MaxVoiceMintResponse>((resolve) => {
      resolveMint = resolve;
    }));
    const h = makeHarness({ mint });
    const client = createMaxCallClient(h.deps);
    const start = client.start({ format: 'scenario' });
    await flushAsync();

    await client.end('completed');
    expect(client.phase()).toBe('ended');
    expect(h.pc.close).toHaveBeenCalledTimes(1);
    expect(h.localTrack.stop).toHaveBeenCalledTimes(1);
    expect(h.deps.end).not.toHaveBeenCalled();

    resolveMint(h.mintResponse);
    await start;
    await flushAsync();

    expect(h.deps.end).toHaveBeenCalledTimes(1);
    expect(h.deps.end).toHaveBeenCalledWith({
      sessionId: 'sess-1',
      endReason: 'dropped',
      elapsedSec: 0,
      usage: ZERO_USAGE,
    });
    expect(h.pc.close).toHaveBeenCalledTimes(1);
    expect(h.localTrack.stop).toHaveBeenCalledTimes(1);
  });

  it('ошибка сборки offer освобождает частичный PC, channel и микрофон без дублей', async () => {
    const h = makeHarness();
    (h.pc.createOffer as jest.Mock).mockRejectedValueOnce(new Error('native_offer_failed'));
    const client = createMaxCallClient(h.deps);

    await client.start({ format: 'scenario' });

    expect(client.phase()).toBe('failed');
    expect(h.uiEvents).toContainEqual({ type: 'fail', reason: 'media_failed' });
    expect(h.dc.close).toHaveBeenCalledTimes(1);
    expect(h.pc.close).toHaveBeenCalledTimes(1);
    expect(h.localTrack.stop).toHaveBeenCalledTimes(1);
    expect(h.inCall.stop).toHaveBeenCalledTimes(1);
    expect(h.deps.end).toHaveBeenCalledTimes(1);
  });

  it('mute во время системного открытия микрофона применяется к позднему track', async () => {
    let resolveStream!: (value: { getTracks(): MediaStreamTrackLike[] }) => void;
    const h = makeHarness();
    h.deps.native.mediaDevices.getUserMedia = jest.fn(() => new Promise((resolve) => {
      resolveStream = resolve;
    }));
    const client = createMaxCallClient(h.deps);
    const start = client.start({ format: 'scenario' });

    client.setMuted(true);
    resolveStream({ getTracks: () => [h.localTrack] });
    await start;

    expect(h.localTrack.enabled).toBe(false);
    await client.end();
  });
});

describe('barge-in по разделу 4 спеки', () => {
  it('response.cancel + output_audio_buffer.clear + remote-трек тихий 300мс', async () => {
    const h = makeHarness();
    const client = await connect(h);

    const remoteTrack: MediaStreamTrackLike = { enabled: true, stop: jest.fn(), kind: 'audio' };
    h.pc.ontrack?.({ track: remoteTrack });

    client.bargeIn();

    const sent = h.dc.send.mock.calls.map(([raw]) => (JSON.parse(raw as string) as { type: string }).type);
    expect(sent.slice(-2)).toEqual(['response.cancel', 'output_audio_buffer.clear']);
    expect(remoteTrack.enabled).toBe(false);

    jest.advanceTimersByTime(MAX_CALL_BARGE_IN_MUTE_MS - 1);
    expect(remoteTrack.enabled).toBe(false);
    jest.advanceTimersByTime(1);
    expect(remoteTrack.enabled).toBe(true);
  });

  // зачем: владелец 2026-08-16 — ИИ при старте «начинает говорить много реплик,
  // обрывает их сама и снова говорит». Пока звучит приветствие, микрофон закрыт:
  // шум/эхо/«алло?» не рвут приветствие через interrupt_response.
  it('удерживает микрофон закрытым, пока приветствие не договорено И не доиграно', async () => {
    const h = makeHarness();
    await connect(h);
    expect(h.localTrack.enabled).toBe(false); // hold с момента активации

    dcMessage(h, { type: 'response.created' });
    dcMessage(h, { type: 'output_audio_buffer.started' });
    dcMessage(h, usageDone({ audio_tokens: 10 }, { audio_tokens: 80 })); // response.done
    expect(h.localTrack.enabled).toBe(false); // аудио ещё доигрывает из буфера
    dcMessage(h, { type: 'output_audio_buffer.stopped' });
    expect(h.localTrack.enabled).toBe(true); // приветствие отзвучало — микрофон открыт
  });

  it('снимает удержание, если аудио доиграло раньше response.done или приветствие без аудио', async () => {
    const h = makeHarness();
    await connect(h);
    dcMessage(h, { type: 'output_audio_buffer.started' });
    dcMessage(h, { type: 'output_audio_buffer.stopped' });
    expect(h.localTrack.enabled).toBe(false);
    dcMessage(h, usageDone({}, {}));
    expect(h.localTrack.enabled).toBe(true);

    const h2 = makeHarness();
    await connect(h2);
    dcMessage(h2, usageDone({}, {})); // пустой/отменённый response — аудио не было
    expect(h2.localTrack.enabled).toBe(true);
  });

  it('страховочный таймер снимает удержание без серверных событий; явный unmute юзера — тоже', async () => {
    const h = makeHarness();
    await connect(h);
    expect(h.localTrack.enabled).toBe(false);
    jest.advanceTimersByTime(MAX_CALL_GREETING_HOLD_MAX_MS);
    expect(h.localTrack.enabled).toBe(true);

    const h2 = makeHarness();
    const client2 = await connect(h2);
    client2.setMuted(false); // юзер хочет говорить — его воля важнее удержания
    expect(h2.localTrack.enabled).toBe(true);
  });

  it('мьют юзера во время приветствия остаётся мьютом и после его окончания', async () => {
    const h = makeHarness();
    const client = await connect(h);
    client.setMuted(true);
    dcMessage(h, usageDone({}, {}));
    expect(h.localTrack.enabled).toBe(false);
    client.setMuted(false);
    expect(h.localTrack.enabled).toBe(true);
  });

  it('mute глушит локальный трек, unmute возвращает', async () => {
    const h = makeHarness();
    const client = await connect(h);
    client.setMuted(true);
    expect(h.localTrack.enabled).toBe(false);
    client.setMuted(false);
    expect(h.localTrack.enabled).toBe(true);
  });

  it('sendWrapUp шлёт серверный wrapUpText как conversation-item + response.create', async () => {
    const h = makeHarness();
    const client = await connect(h);
    client.sendWrapUp();

    const sent = h.dc.send.mock.calls.map(([raw]) => JSON.parse(raw as string) as Record<string, unknown>);
    const wrapItem = sent.find((event) => event.type === 'conversation.item.create');
    expect(JSON.stringify(wrapItem)).toContain('[WRAP_UP] time to say goodbye');
    expect(sent.filter((event) => event.type === 'response.create')).toHaveLength(2); // greeting + wrap-up
    expect(h.uiEvents).toContainEqual({ type: 'wrap_up' });
  });

  it('после открытия data channel сам запрашивает короткое приветствие', async () => {
    const h = makeHarness();
    await connect(h);
    const sent = h.dc.send.mock.calls.map(([raw]) => JSON.parse(raw as string) as Record<string, unknown>);
    const greeting = sent.find((event) => event.type === 'response.create');
    expect(greeting).toMatchObject({
      type: 'response.create',
      response: { max_output_tokens: 600 },
    });
    expect(JSON.stringify(greeting)).toContain('Begin speaking immediately');
    expect(JSON.stringify(greeting)).toContain('Never announce turns');
  });
});

describe('контракт maxVoiceSessionEnd: маппинг причин', () => {
  it("клиентский 'failed' после минта уезжает на сервер как 'dropped'", async () => {
    // SDP-провал ПОСЛЕ успешного минта: сессия заминчена, сервер должен
    // получить сеттлмент с известной ему причиной dropped, не с 'failed'.
    const h = makeHarness({ exchangeSdp: jest.fn().mockRejectedValue(new Error('http_500')) });
    const client = createMaxCallClient(h.deps);
    await client.start({ format: 'scenario', scenarioId: 'coffee' });
    expect(client.phase()).toBe('failed');
    expect(h.deps.end).toHaveBeenCalledTimes(1);
    expect(h.deps.end).toHaveBeenCalledWith({
      sessionId: 'sess-1',
      endReason: 'dropped',
      elapsedSec: 0,
      usage: ZERO_USAGE,
    });
  });
});

describe('reconnect-чейн (спека §1 max_call_reconnect)', () => {
  function dropIce(h: ReturnType<typeof makeHarness>) {
    (h.pc as { iceConnectionState: string }).iceConnectionState = 'disconnected';
    h.pc.oniceconnectionstatechange?.();
  }

  it('закрытие data channel при живом ICE тоже запускает reconnect', async () => {
    const h = makeHarness();
    const client = await connect(h);
    h.dc.onclose?.();

    expect(client.phase()).toBe('reconnecting');
    expect(h.uiEvents).toContainEqual({ type: 'reconnect_started' });
    expect(h.localTrack.enabled).toBe(false);

    await jest.advanceTimersByTimeAsync(RECONNECT_GRACE_MS);
    await flushAsync();
    expect(h.deps.mint).toHaveBeenCalledTimes(2);
    expect(client.phase()).toBe('active');
  });

  it('фаза 1: grace 4с с мьютом локального трека, ICE ожил — ре-минт не нужен', async () => {
    const h = makeHarness();
    const client = await connect(h);
    dropIce(h);

    expect(client.phase()).toBe('reconnecting');
    expect(h.uiEvents).toContainEqual({ type: 'reconnect_started' });
    expect(h.localTrack.enabled).toBe(false); // grace-мьют

    (h.pc as { iceConnectionState: string }).iceConnectionState = 'connected';
    h.pc.oniceconnectionstatechange?.();

    expect(client.phase()).toBe('active');
    expect(h.uiEvents).toContainEqual({ type: 'reconnected' });
    expect(h.localTrack.enabled).toBe(true); // юзер не мьютился — вернули звук
    expect(h.deps.mint).toHaveBeenCalledTimes(1); // ре-минта не было
  });

  it('фаза 2: grace истёк → teardown PC → ре-минт с reconnectOf и summary → новый DC → active', async () => {
    const history = [{ role: 'user' as const, text: 'A large cappuccino please', atMs: 1000 }];
    const h = makeHarness({ reconnectHistory: () => history });
    const client = await connect(h);
    dropIce(h);

    await jest.advanceTimersByTimeAsync(RECONNECT_GRACE_MS);
    await flushAsync();

    expect(h.deps.mint).toHaveBeenCalledTimes(2);
    const remintReq = (h.deps.mint as jest.Mock).mock.calls[1][0] as Record<string, unknown>;
    expect(remintReq.reconnectOf).toBe('sess-1');
    expect(remintReq.format).toBe('scenario');
    expect(String(remintReq.reconnectSummary)).toContain('You: A large cappuccino please');
    // Старый PC похоронен, новый дошёл до active + reconnected.
    expect(h.pc.close).toHaveBeenCalledTimes(1);
    expect(h.deps.exchangeSdp).toHaveBeenCalledTimes(2);
    expect(client.phase()).toBe('active');
    expect(h.uiEvents).toContainEqual({ type: 'reconnected' });
    // Владение аудиосессией сохраняется: InCallManager не перезапускался.
    expect(h.inCall.stop).not.toHaveBeenCalled();
    expect(h.inCall.start).toHaveBeenCalledTimes(1);
  });

  it('grace-мьют не отменяет мьют, который просил юзер', async () => {
    const h = makeHarness();
    const client = await connect(h);
    client.setMuted(true);
    dropIce(h);
    await jest.advanceTimersByTimeAsync(RECONNECT_GRACE_MS);
    await flushAsync();
    expect(client.phase()).toBe('active');
    expect(h.localTrack.enabled).toBe(false); // юзер мьютился — мьют выжил
  });

  it('кап чейна из limits исчерпан → failed(reconnect_exhausted) + сеттлмент dropped', async () => {
    const h = makeHarness();
    h.mintResponse.limits = { reconnectChainMax: { auto: 0, manual: 1 } };
    const client = await connect(h);
    dropIce(h);

    await jest.advanceTimersByTimeAsync(RECONNECT_GRACE_MS);
    await flushAsync();

    expect(client.phase()).toBe('failed');
    expect(h.uiEvents).toContainEqual({ type: 'fail', reason: 'reconnect_exhausted' });
    expect(h.deps.mint).toHaveBeenCalledTimes(1); // ре-минт даже не пытался
    expect(h.deps.end).toHaveBeenCalledTimes(1);
    expect((h.deps.end as jest.Mock).mock.calls[0][0]).toMatchObject({ endReason: 'dropped' });
  });

  it('провал ре-минта жжёт попытки чейна и завершается failed по исчерпании', async () => {
    const h = makeHarness();
    const mintMock = h.deps.mint as jest.Mock;
    mintMock.mockResolvedValueOnce(h.mintResponse); // первый (свежий) минт
    mintMock.mockRejectedValue(new Error('offline')); // все ре-минты падают
    const client = createMaxCallClient(h.deps);
    await client.start({ format: 'scenario', scenarioId: 'coffee' });
    h.dc.readyState = 'open';
    h.dc.onopen?.();
    dropIce(h);

    await jest.advanceTimersByTimeAsync(RECONNECT_GRACE_MS);
    await flushAsync(30);

    // 1 свежий минт + 2 auto-попытки (дефолтный кап) — и честный failed.
    expect(mintMock).toHaveBeenCalledTimes(3);
    expect(client.phase()).toBe('failed');
  });
});

describe('sfx на границах владения аудиосессией (спека §1 max_call_sfx)', () => {
  it('connect-cue ДО InCallManager.start(), end-нота ПОСЛЕ stop()', async () => {
    const sfx = {
      connectCue: jest.fn().mockReturnValue(true),
      endCue: jest.fn().mockReturnValue(true),
      audioSessionAcquired: jest.fn(),
      audioSessionReleased: jest.fn(),
      midCall: jest.fn(),
      ownsAudioSession: jest.fn().mockReturnValue(false),
    };
    const h = makeHarness({ sfx });
    const client = await connect(h);

    expect(sfx.connectCue).toHaveBeenCalledTimes(1);
    expect(sfx.connectCue.mock.invocationCallOrder[0]).toBeLessThan(
      h.inCall.start.mock.invocationCallOrder[0],
    );
    expect(sfx.audioSessionAcquired).toHaveBeenCalledTimes(1);

    await client.end('completed');
    expect(sfx.audioSessionReleased).toHaveBeenCalledTimes(1);
    expect(sfx.endCue).toHaveBeenCalledTimes(1);
    expect(h.inCall.stop.mock.invocationCallOrder[0]).toBeLessThan(
      sfx.endCue.mock.invocationCallOrder[0],
    );
  });
});
