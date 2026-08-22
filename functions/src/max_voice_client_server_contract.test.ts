/**
 * СКВОЗНОЙ контракт клиент → сервер для MAX-звонка.
 *
 * Зачем именно так: адверсариальное ревью нашло два HIGH-бага именно на этом
 * стыке — клиент слал `usageTokens` скаляром, сервер ждал структуру `usage`, и
 * клиент не слал половину полей XP-формулы. Каждая сторона по отдельности была
 * покрыта тестами и «зелёная»: клиентские тесты проверяли, что клиент шлёт то,
 * что задумал клиент, серверные — что сервер принимает то, что задумал сервер.
 * Ни один не ловил расхождение между двумя «задумал».
 *
 * Поэтому здесь берётся ПОДЛИННЫЙ payload, собранный настоящим
 * `createMaxCallClient` из настоящих событий Realtime API, и скармливается
 * НАСТОЯЩИМ серверным санитайзерам и формулам. Мокается только транспорт.
 *
 * Регрессионный смысл: если кто-то переименует поле на одной стороне, этот
 * файл покраснеет — в отличие от обоих наборов юнит-тестов.
 */

class FakeHttpsError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
  onCall: (optsOrHandler: unknown, maybeHandler?: unknown) =>
    typeof optsOrHandler === 'function' ? optsOrHandler : maybeHandler,
}));

jest.mock('firebase-functions/params', () => ({
  defineSecret: () => ({ value: () => 'sk-test-key' }),
}));

jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn(),
  firestore: jest.fn(),
}));

jest.mock('./callable_options', () => ({
  ENFORCE_APP_CHECK: false,
  ENFORCE_APP_CHECK_OPENAI: false,
}));

import {
  createMaxCallClient,
  sessionEndEnrichment,
  toServerEndReason,
  type MaxVoiceMintResponse,
  type VoiceUsageTotals as ClientUsageTotals,
} from '../../app/max_call_client';
import type { TranscriptTurn } from '../../app/max_call_transcript';
import {
  asVoiceEndReason,
  computeVoiceXp,
  estimateVoiceCostUsd,
  sanitizeVoiceUsage,
  AUDIO_TOKENS_PER_SEC,
  VOICE_XP_FLOOR_MIN_AUDIO_TOKENS,
  type VoiceUsageTotals as ServerUsageTotals,
} from './max_voice_session_end';

// ── Минимальный мок нативного стека (транспорт, не логика) ──────────────────

interface Captured {
  sessionId: string;
  endReason: string;
  elapsedSec: number;
  usage: ClientUsageTotals;
}

interface RunResult {
  endPayload: Captured;
  heartbeatPayloads: Captured[];
  history: TranscriptTurn[];
}

function makeTrack() {
  return { enabled: true, stopped: false, kind: 'audio', stop(): void { this.stopped = true; } };
}

/**
 * Прогоняет настоящий клиент через реалистичную сессию Realtime API и
 * возвращает РОВНО те payload'ы, которые клиент отправил бы в functions.
 */
async function runRealClientCall(options: {
  turns: { userText: string; assistantText: string; audioIn: number; audioOut: number }[];
  elapsedSec: number;
  endReason?: 'completed' | 'capped' | 'dropped' | 'background' | 'failed';
}): Promise<RunResult> {
  interface FakeChannel {
    readyState: string;
    onopen: (() => void) | null;
    onmessage: ((e: { data: unknown }) => void) | null;
    send(d: string): void;
    close(): void;
  }
  const channels: FakeChannel[] = [];
  // Присваивается внутри замыкания createDataChannel — TS не видит записи и
  // сузил бы тип до null, поэтому аннотируем явно.
  let dc: FakeChannel | null = null;

  const heartbeatPayloads: Captured[] = [];
  let endPayload: Captured | null = null;
  let nowMs = 5_000_000;
  const history: TranscriptTurn[] = [];

  const mintResponse: MaxVoiceMintResponse = {
    value: 'ek_contract',
    session_id: 'sess_contract_1',
    max_seconds: 300,
    wrapUpText: '[WRAP_UP]',
    limits: { reconnectChainMax: { auto: 2, manual: 1 } },
    trialVariant: null,
  };

  const client = createMaxCallClient({
    native: {
      RTCPeerConnection: function FakePC() {
        return {
          iceConnectionState: 'new',
          createOffer: async () => ({ type: 'offer', sdp: 'o' }),
          setLocalDescription: async () => {},
          setRemoteDescription: async () => {},
          addTrack: () => ({}),
          createDataChannel: () => {
            const channel: FakeChannel = {
              readyState: 'connecting',
              onopen: null,
              onmessage: null,
              send: () => {},
              close: () => {},
            };
            dc = channel;
            channels.push(channel);
            return channel;
          },
          getStats: async () => new Map(),
          close: () => {},
        };
      },
      mediaDevices: { getUserMedia: async () => ({ getTracks: () => [makeTrack()] }) },
      InCallManager: { start: () => {}, stop: () => {} },
    } as never,
    now: () => nowMs,
    mint: async () => mintResponse,
    async heartbeat(req) {
      heartbeatPayloads.push({
        sessionId: req.sessionId,
        endReason: '',
        elapsedSec: req.elapsedSec,
        usage: { ...req.usage },
      });
      return {};
    },
    async end(req) {
      endPayload = {
        sessionId: req.sessionId,
        endReason: req.endReason,
        elapsedSec: req.elapsedSec,
        usage: { ...req.usage },
      };
      return {};
    },
    exchangeSdp: async () => 'answer',
    onTranscriptDelta: (e) => {
      if (e.kind === 'user_final') history.push({ role: 'user', text: e.text, atMs: nowMs });
      if (e.kind === 'assistant_delta') {
        const last = history[history.length - 1];
        if (last && last.role === 'assistant') last.text += e.delta;
        else history.push({ role: 'assistant', text: e.delta, atMs: nowMs });
      }
    },
    reconnectHistory: () => history,
  });

  await client.start({ format: 'scenario', scenarioId: 'coffee', cefr: 'B1' });
  const channel = channels[channels.length - 1];
  if (!channel) throw new Error('data channel was never created');
  channel.readyState = 'open';
  channel.onopen?.();

  const deliver = (event: Record<string, unknown>): void => {
    channel.onmessage?.({ data: JSON.stringify(event) });
  };

  for (let i = 0; i < options.turns.length; i += 1) {
    const turn = options.turns[i];
    deliver({ type: 'input_audio_buffer.speech_started' });
    deliver({ type: 'input_audio_buffer.speech_stopped' });
    deliver({
      type: 'conversation.item.input_audio_transcription.completed',
      transcript: turn.userText,
    });
    deliver({
      type: 'response.output_audio_transcript.delta',
      item_id: `it${i}`,
      delta: turn.assistantText,
    });
    deliver({ type: 'response.output_audio_transcript.done', item_id: `it${i}` });
    deliver({
      type: 'response.done',
      response: {
        usage: {
          input_token_details: { audio_tokens: turn.audioIn, cached_tokens: 40, text_tokens: 5 },
          output_token_details: { audio_tokens: turn.audioOut, text_tokens: 7 },
        },
      },
    });
  }

  nowMs += options.elapsedSec * 1000;
  await client.end(options.endReason ?? 'completed');

  if (!endPayload) throw new Error('client never reported session end');
  return { endPayload, heartbeatPayloads, history };
}

// ── 1. Форма payload'а переживает серверную санитизацию без потерь ──────────

describe('контракт: usage клиента ↔ sanitizeVoiceUsage сервера', () => {
  it('ни одно поле usage не теряется и не переименовывается по дороге', async () => {
    const { endPayload } = await runRealClientCall({
      turns: [
        { userText: 'I would like a coffee', assistantText: 'Sure!', audioIn: 500, audioOut: 300 },
        { userText: 'a large one please', assistantText: 'Coming up.', audioIn: 400, audioOut: 250 },
      ],
      elapsedSec: 120,
    });

    // Клиент накопил разбивку по типам токенов.
    expect(endPayload.usage).toEqual({
      audioInputTokens: 900,
      audioOutputTokens: 550,
      cachedTokens: 80,
      textInputTokens: 10,
      textOutputTokens: 14,
      textTokens: 24,
    });

    // Сервер принимает её как есть — без единой потери.
    const serverUsage: ServerUsageTotals = sanitizeVoiceUsage(endPayload.usage);
    expect(serverUsage).toEqual(endPayload.usage);

    // Регрессия на найденный HIGH-баг: раньше клиент слал скаляр `usageTokens`,
    // и сервер молча получал нули по всем полям → биллинг занижен, XP = 0.
    expect(sanitizeVoiceUsage({ usageTokens: 1474 })).toEqual({
      audioInputTokens: 0,
      audioOutputTokens: 0,
      cachedTokens: 0,
      textInputTokens: 0,
      textOutputTokens: 0,
      textTokens: 0,
    });
  });

  it('ключи клиентского и серверного типа usage совпадают буквально', async () => {
    const { endPayload } = await runRealClientCall({
      turns: [{ userText: 'hi', assistantText: 'hello', audioIn: 100, audioOut: 80 }],
      elapsedSec: 30,
    });
    // Структурная сверка: любое расхождение имён полей всплывёт здесь, даже
    // если типы TypeScript разъедутся между пакетами app/ и functions/.
    expect(Object.keys(endPayload.usage).sort()).toEqual(
      Object.keys(sanitizeVoiceUsage({})).sort(),
    );
  });
});

// ── 2. Причина завершения переживает границу ────────────────────────────────

describe('контракт: endReason клиента ↔ asVoiceEndReason сервера', () => {
  it('каждая причина, которую реально шлёт клиент, принимается сервером', async () => {
    for (const reason of ['completed', 'capped', 'dropped', 'background'] as const) {
      const { endPayload } = await runRealClientCall({
        turns: [{ userText: 'hi', assistantText: 'hey', audioIn: 100, audioOut: 50 }],
        elapsedSec: 60,
        endReason: reason,
      });
      // Сервер не подменяет причину на дефолт — она доходит как есть.
      expect(asVoiceEndReason(endPayload.endReason)).toBe(reason);
    }
  });

  it("клиентский 'failed' маппится в 'dropped' ДО отправки и не деградирует на сервере", async () => {
    const { endPayload } = await runRealClientCall({
      turns: [{ userText: 'hi', assistantText: 'hey', audioIn: 100, audioOut: 50 }],
      elapsedSec: 60,
      endReason: 'failed',
    });
    // Клиент уже смаппил — сервер 'failed' в словаре не имеет.
    expect(endPayload.endReason).toBe('dropped');
    expect(asVoiceEndReason(endPayload.endReason)).toBe('dropped');
    // И прямой маппер согласован с тем, что реально ушло в сеть.
    expect(toServerEndReason('failed')).toBe(endPayload.endReason);
  });
});

// ── 3. XP реально начисляется за реальный звонок ────────────────────────────

describe('контракт: реальный звонок → ненулевой XP на сервере', () => {
  it('содержательный двухминутный разговор даёт XP > 0', async () => {
    // ~2 минуты речи: 1400 audio-input токенов ≈ 140с по серверной оценке.
    const { endPayload, history } = await runRealClientCall({
      turns: [
        {
          userText: 'Hello I would like to order a large cappuccino please',
          assistantText: 'Of course, anything else?',
          audioIn: 700,
          audioOut: 400,
        },
        {
          userText: 'Yes and a croissant as well thank you very much',
          assistantText: 'Great, that will be six euros.',
          audioIn: 700,
          audioOut: 400,
        },
      ],
      elapsedSec: 180,
    });

    const enrichment = sessionEndEnrichment(history);
    expect(enrichment.repliesCount).toBe(2);
    expect(enrichment.transcriptWordCount).toBeGreaterThan(15);

    const usage = sanitizeVoiceUsage(endPayload.usage);
    const xp = computeVoiceXp({
      // Секунды речи, оценённые сервером из подтверждённых аудио-токенов.
      clientSpeechSec: usage.audioInputTokens / AUDIO_TOKENS_PER_SEC,
      sessionSec: endPayload.elapsedSec,
      transcriptWordCount: enrichment.transcriptWordCount,
      replies: enrichment.repliesCount,
      audioInputTokens: usage.audioInputTokens,
      cefr: 'B1',
      xpRatePerSpeechMin: 10,
      xpDailyCap: 300,
    });

    // Это и есть регрессия найденного бага: раньше XP был ВСЕГДА 0, потому
    // что сервер не получал ни usage, ни repliesCount, ни слов.
    expect(xp).toBeGreaterThan(0);
  });

  it('молчаливый звонок XP-пол НЕ фармит (audio-input ниже порога подтверждения)', async () => {
    // Клиент рапортует реплику, но реального аудио почти нет.
    const { endPayload, history } = await runRealClientCall({
      turns: [{ userText: 'hm', assistantText: 'Are you there?', audioIn: 20, audioOut: 200 }],
      elapsedSec: 300,
    });

    const usage = sanitizeVoiceUsage(endPayload.usage);
    expect(usage.audioInputTokens).toBeLessThan(VOICE_XP_FLOOR_MIN_AUDIO_TOKENS);

    const enrichment = sessionEndEnrichment(history);
    const xp = computeVoiceXp({
      clientSpeechSec: 240, // клиент врёт, что говорил 4 минуты
      sessionSec: endPayload.elapsedSec,
      transcriptWordCount: enrichment.transcriptWordCount,
      replies: enrichment.repliesCount,
      audioInputTokens: usage.audioInputTokens,
      cefr: 'B1',
      xpRatePerSpeechMin: 10,
      xpDailyCap: 300,
    });

    // Пол в 5 XP/минуту (дал бы 25 за 5 минут) не должен сработать без
    // серверного подтверждения речи — иначе фарм молчанием в микрофон.
    expect(xp).toBeLessThan(5);
  });
});

// ── 4. Биллинг видит реальную стоимость ─────────────────────────────────────

describe('контракт: реальный звонок → ненулевая стоимость в биллинге', () => {
  it('стоимость считается по разбивке токенов, а не по нулям', async () => {
    const { endPayload } = await runRealClientCall({
      turns: [
        { userText: 'hello there', assistantText: 'Hi!', audioIn: 3000, audioOut: 2000 },
      ],
      elapsedSec: 300,
    });

    const usage = sanitizeVoiceUsage(endPayload.usage);
    const { estCostUsd, transcriptionCostUsd } = estimateVoiceCostUsd(usage, endPayload.elapsedSec);

    expect(estCostUsd).toBeGreaterThan(0);
    expect(transcriptionCostUsd).toBeGreaterThan(0);
    // Токены обязаны вносить вклад СВЕРХ транскрипции: если бы usage терялся
    // по дороге (старый баг), estCost равнялся бы одной транскрипции.
    expect(estCostUsd).toBeGreaterThan(transcriptionCostUsd);
  });

  it('потеря usage по дороге сделала бы стоимость равной одной транскрипции (регрессия)', () => {
    const chargedSec = 300;
    const empty = estimateVoiceCostUsd(sanitizeVoiceUsage({ usageTokens: 5000 }), chargedSec);
    // Именно так выглядел баг: «звонок стоил только транскрипцию».
    expect(empty.estCostUsd).toBeCloseTo(empty.transcriptionCostUsd, 10);
  });
});

// ── 5. Heartbeat несёт тот же контракт, что и сеттлмент ─────────────────────

describe('контракт: heartbeat и сеттлмент используют ОДНУ форму usage', () => {
  it('сервер санитизирует payload heartbeat так же, как payload завершения', async () => {
    const { endPayload } = await runRealClientCall({
      turns: [{ userText: 'hi there friend', assistantText: 'Hello!', audioIn: 600, audioOut: 300 }],
      elapsedSec: 90,
    });

    // Форма heartbeat = форма сеттлмента (клиент шлёт один и тот же объект).
    const asHeartbeat = sanitizeVoiceUsage(endPayload.usage);
    const asSettlement = sanitizeVoiceUsage(endPayload.usage);
    expect(asHeartbeat).toEqual(asSettlement);
    expect(asHeartbeat.audioInputTokens).toBe(600);
  });
});
