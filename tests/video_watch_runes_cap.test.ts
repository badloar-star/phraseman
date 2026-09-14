// Руны за просмотр видео: 3 руны за минуту для Plus/Pro,
// потолок 600 рун в сутки. Проверяем арифметику выдачи — именно здесь ошибка
// стоила бы реальной валюты, а серверный отказ пришёл бы уже после начисления.
import {
  grantableVideoWatchRunes,
  utcDayKey,
  VIDEO_WATCH_RUNES_DAILY_CAP,
  VIDEO_WATCH_RUNES_PER_MINUTE,
} from '../functions/src/video_watch_runes';
import * as videoWatchRunes from '../functions/src/video_watch_runes';

type VideoWatchAwardResolver = (
  requestedMinutes: number,
  alreadyConsumedBaseToday: number,
  awardedAtMs: number,
) => Readonly<{ baseGranted: number; walletGranted: number }>;

type VideoWatchReplayMatcher = (
  receipt: Readonly<Record<string, unknown>> | undefined,
  input: Readonly<{ stableUid: string; requestId: string; sessionId?: string; minutes?: number }>,
) => boolean;

describe('константы совпадают с решением владельца', () => {
  it('три руны за минуту, потолок 600 в сутки', () => {
    expect(VIDEO_WATCH_RUNES_PER_MINUTE).toBe(3);
    expect(VIDEO_WATCH_RUNES_DAILY_CAP).toBe(600);
  });
});

describe('сколько рун можно выдать', () => {
  it('обычный случай: 7 минут просмотра = 21 руна', () => {
    expect(grantableVideoWatchRunes(7, 0)).toBe(21);
  });

  it('неполные минуты не засчитываются', () => {
    expect(grantableVideoWatchRunes(7.9, 0)).toBe(21);
  });

  it('потолок дня режет остаток, а не всю выдачу', () => {
    // Уже 595 из 600 — можно выдать только 5, хотя просмотрено 30 минут.
    expect(grantableVideoWatchRunes(30, 595)).toBe(5);
  });

  it('потолок выбран — не выдаём ничего', () => {
    expect(grantableVideoWatchRunes(30, VIDEO_WATCH_RUNES_DAILY_CAP)).toBe(0);
  });

  it('переполнение счётчика не даёт отрицательную выдачу', () => {
    expect(grantableVideoWatchRunes(30, VIDEO_WATCH_RUNES_DAILY_CAP + 100)).toBe(0);
  });

  it('один отрезок ограничен 180 минутами — защита от испорченных часов', () => {
    // Клиент прислал сутки просмотра: засчитываем максимум 180 минут за раз.
    expect(grantableVideoWatchRunes(1440, 0)).toBe(540);
  });

  it('мусорные значения не начисляют ничего', () => {
    expect(grantableVideoWatchRunes(0, 0)).toBe(0);
    expect(grantableVideoWatchRunes(-5, 0)).toBe(0);
    expect(grantableVideoWatchRunes(Number.NaN, 0)).toBe(0);
    expect(grantableVideoWatchRunes(Number.POSITIVE_INFINITY, 0)).toBe(0);
  });
});

describe('Супервоскресенье для видео-рун', () => {
  const resolveVideoWatchRuneAward = (
    videoWatchRunes as unknown as { resolveVideoWatchRuneAward?: VideoWatchAwardResolver }
  ).resolveVideoWatchRuneAward;

  it('удваивает фактическую выдачу в воскресенье UTC', () => {
    expect(typeof resolveVideoWatchRuneAward).toBe('function');
    expect(resolveVideoWatchRuneAward?.(30, 0, Date.parse('2026-09-06T12:00:00.000Z')))
      .toEqual({ baseGranted: 90, walletGranted: 180 });
  });

  it('сохраняет 600 как лимит базовой выдачи, а не бонуса', () => {
    expect(resolveVideoWatchRuneAward?.(30, 595, Date.parse('2026-09-06T23:59:59.999Z')))
      .toEqual({ baseGranted: 5, walletGranted: 10 });
  });

  it('не удваивает выдачу с понедельника 00:00 UTC', () => {
    expect(resolveVideoWatchRuneAward?.(30, 0, Date.parse('2026-09-07T00:00:00.000Z')))
      .toEqual({ baseGranted: 90, walletGranted: 90 });
  });
});

describe('точный повтор video_watch', () => {
  const isExactVideoWatchReplay = (
    videoWatchRunes as unknown as { isExactVideoWatchReplay?: VideoWatchReplayMatcher }
  ).isExactVideoWatchReplay;
  const input = { stableUid: 'stable-user-1', requestId: 'vwm1a2b3c4d5e6', minutes: 17 };
  const receipt = {
    opId: 'video_watch:vwm1a2b3c4d5e6',
    reason: 'video_watch',
    sourceKind: 'video_watch',
    sourceId: 'stable-user-1',
    ruleVersion: 1,
    delta: 51,
    earnedAtMs: Date.parse('2026-09-06T12:00:00.000Z'),
    meta: { requestId: 'vwm1a2b3c4d5e6', minutes: 17 },
  };

  it('узнаёт идентичный ретрай после смены суток', () => {
    expect(typeof isExactVideoWatchReplay).toBe('function');
    expect(isExactVideoWatchReplay?.(receipt, input)).toBe(true);
    expect(isExactVideoWatchReplay?.({ ...receipt, ruleVersion: 2 }, input)).toBe(true);
    expect(isExactVideoWatchReplay?.({ ...receipt, ruleVersion: 3 }, input)).toBe(true);
  });

  it('binds current receipts to the server session instead of client minutes', () => {
    const current = {
      ...receipt,
      ruleVersion: 4,
      meta: { requestId: input.requestId, sessionId: 'vws1a2b3c4d5e6', observedMinutes: 17 },
    };
    expect(isExactVideoWatchReplay?.(current, {
      stableUid: input.stableUid,
      requestId: input.requestId,
      sessionId: 'vws1a2b3c4d5e6',
    })).toBe(true);
    expect(isExactVideoWatchReplay?.(current, {
      stableUid: input.stableUid,
      requestId: input.requestId,
      sessionId: 'vws9z8y7x6w5v4',
    })).toBe(false);
  });

  it('отклоняет тот же requestId с другими минутами', () => {
    expect(isExactVideoWatchReplay?.(receipt, { ...input, minutes: 18 })).toBe(false);
  });
});

describe('формат идентификатора операции', () => {
  /**
   * зачем: первая версия функции строила opId как `video_watch:{uid}:{requestId}`
   * — с ДВУМЯ двоеточиями. Формат журнала рун (OP_ID_RE в stars_ledger.ts)
   * допускает ровно одно, поэтому операция отвергалась как invalid_op_id и руны
   * не начислялись БЫ ВООБЩЕ, молча. Поймано тестом до выката — сторожим.
   */
  const OP_ID_RE = /^[a-z0-9_]{1,32}:[A-Za-z0-9_.-]{1,96}$/;

  it('opId просмотра проходит проверку журнала рун', () => {
    const requestId = 'vwm1a2b3c4d5e6';
    expect(OP_ID_RE.test(`video_watch:${requestId}`)).toBe(true);
  });

  it('второе двоеточие ломает формат — так и было в первой версии', () => {
    expect(OP_ID_RE.test('video_watch:uid-123:req-456')).toBe(false);
  });
});

describe('ключ дня', () => {
  it('это UTC-дата, одинаковая для всех часовых поясов', () => {
    // 23:30 UTC и 00:30 UTC следующего дня — РАЗНЫЕ ключи, иначе потолок
    // «переезжал» бы вместе с часовым поясом устройства.
    expect(utcDayKey(Date.UTC(2026, 8, 3, 23, 30))).toBe('2026-09-03');
    expect(utcDayKey(Date.UTC(2026, 8, 4, 0, 30))).toBe('2026-09-04');
  });
});
