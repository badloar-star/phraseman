/**
 * Контракт стыка клиент ↔ functions для MAX-звонка (после адверсариального
 * ревью): разбор ответа минта принимает ОБА написания ключей (version-skew
 * деплоя functions/app не должен ронять уже оплаченный минт), причины
 * завершения маппятся в серверный словарь (failed → dropped), а обогащение
 * maxVoiceSessionEnd (реплики/слова) считается только по ходам ученика.
 */

import {
  parseMintResponse,
  reconnectCapsFromLimits,
  sessionEndEnrichment,
  toServerEndReason,
} from '../app/max_call_client';
import type { TranscriptTurn } from '../app/max_call_transcript';

describe('parseMintResponse: оба написания ключей', () => {
  const base = { value: 'secret', wrapUpText: '[WRAP_UP] bye', trialVariant: 'scenario' };

  it('принимает snake_case (контрактный основной путь)', () => {
    const parsed = parseMintResponse({
      ...base,
      session_id: 's1',
      max_seconds: 300,
      expires_at: 1234,
    });
    expect(parsed.session_id).toBe('s1');
    expect(parsed.max_seconds).toBe(300);
    expect(parsed.expires_at).toBe(1234);
    expect(parsed.trialVariant).toBe('scenario');
  });

  it('принимает camelCase (скошенный деплой functions)', () => {
    const parsed = parseMintResponse({
      ...base,
      sessionId: 's2',
      maxSeconds: 480,
      expiresAt: 5678,
    });
    expect(parsed.session_id).toBe('s2');
    expect(parsed.max_seconds).toBe(480);
    expect(parsed.expires_at).toBe(5678);
  });

  it('snake_case имеет приоритет, когда сервер шлёт оба', () => {
    const parsed = parseMintResponse({
      ...base,
      session_id: 'snake',
      sessionId: 'camel',
      max_seconds: 300,
      maxSeconds: 999,
    });
    expect(parsed.session_id).toBe('snake');
    expect(parsed.max_seconds).toBe(300);
  });

  it('битый ответ (нет id/секунд в любом написании) → mint_malformed', () => {
    expect(() => parseMintResponse({ value: 'x' })).toThrow('mint_malformed');
    expect(() => parseMintResponse({ value: 'x', sessionId: 's', maxSeconds: 0 })).toThrow(
      'mint_malformed',
    );
    expect(() => parseMintResponse(null)).toThrow('mint_malformed');
  });

  it('дефолты: wrapUpText → [WRAP_UP], trialVariant → null, limits → undefined', () => {
    const parsed = parseMintResponse({ value: 'x', session_id: 's', max_seconds: 60 });
    expect(parsed.wrapUpText).toBe('[WRAP_UP]');
    expect(parsed.trialVariant).toBeNull();
    expect(parsed.limits).toBeUndefined();
  });
});

describe('toServerEndReason: серверный словарь причин', () => {
  it("маппит клиентский 'failed' в 'dropped'", () => {
    expect(toServerEndReason('failed')).toBe('dropped');
  });

  it.each(['completed', 'capped', 'dropped', 'background'] as const)(
    'пропускает %s как есть',
    (reason) => {
      expect(toServerEndReason(reason)).toBe(reason);
    },
  );
});

describe('sessionEndEnrichment: реплики и слова только ученика', () => {
  const history: TranscriptTurn[] = [
    { role: 'assistant', text: 'Hi! What can I get you today?', atMs: 0 },
    { role: 'user', text: "I'd like a large cappuccino, please.", atMs: 4000 },
    { role: 'assistant', text: 'Sure! To go or to stay?', atMs: 8000 },
    { role: 'user', text: 'To go — and a croissant.', atMs: 12000 },
  ];

  it('считает userTurns и слова юзера (пунктуация ASR не влияет)', () => {
    const enriched = sessionEndEnrichment(history);
    expect(enriched.repliesCount).toBe(2);
    // "I'd like a large cappuccino please" = 6, "To go and a croissant" = 5.
    expect(enriched.transcriptWordCount).toBe(11);
  });

  it('пустая история → нули (сервер отключит floor XP сам)', () => {
    expect(sessionEndEnrichment([])).toEqual({ repliesCount: 0, transcriptWordCount: 0 });
  });
});

describe('reconnectCapsFromLimits: кап чейна из limits минта', () => {
  it('читает reconnectChainMax и клампит мусор в дефолты спеки (2 авто + 1 ручной)', () => {
    expect(reconnectCapsFromLimits({ reconnectChainMax: { auto: 3, manual: 2 } })).toEqual({
      auto: 3,
      manual: 2,
    });
    expect(reconnectCapsFromLimits({ reconnectChainMax: { auto: -1, manual: 'x' } })).toEqual({
      auto: 2,
      manual: 1,
    });
    expect(reconnectCapsFromLimits(undefined)).toEqual({ auto: 2, manual: 1 });
    expect(reconnectCapsFromLimits({})).toEqual({ auto: 2, manual: 1 });
  });
});
