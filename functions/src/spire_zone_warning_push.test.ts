// Сторож воскресного пуша «у края зоны» (PM-281). Основная логика —
// spireZoneEdgeStatuses (копия правил ранжирования spire_finalize_core.ts,
// но без записи). Остальные функции — тонкие обёртки, как в
// spire_week_result_push.test.ts.
import {
  SPIRE_ZONE_EDGE_MARGIN_RANKS,
  buildSpireZoneWarningCandidates,
  buildSpireZoneWarningCopy,
  buildSpireZoneWarningMessage,
  shouldSendSpireZoneWarningPush,
  spireCurrentWeekIdForWarning,
  spireZoneEdgeStatuses,
  type SpireZoneWarningCandidate,
  type SpireZoneWarningUser,
} from './spire_zone_warning_push';

function member(steps: number, reachedAtMs = 1000, totalMs = 1000): Record<string, unknown> {
  return { steps, reachedAtMs, totalMs };
}

/** Комната из N живых с чётко убывающими ступенями (без ничьих) — детерминированный порядок рангов. */
function distinctRoom(n: number): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (let i = 0; i < n; i++) {
    // u0 — больше всех ступеней (топ), u{n-1} — меньше всех (низ).
    out[`u${i}`] = member(100 - i, 1000 + i, 1000 + i);
  }
  return out;
}

describe('spireZoneEdgeStatuses', () => {
  it('никто не играл — зон нет вообще (zoneSize=0 при всех нулях)', () => {
    const members = { u0: member(0), u1: member(0), u2: member(0) };
    const out = spireZoneEdgeStatuses(members);
    expect(out.size).toBe(0);
  });

  it('ранги у границы зоны повышения — promotion_edge, у самого низа игравших — demotion_edge', () => {
    // 10 живых с уникальными ступенями (u0 лучший … u9 худший). zoneSize при
    // 10 живых = 5 (roomTotal считает и ботов), margin=1 → ранги 4,5,6
    // (индексы u3,u4,u5) у границы повышения, ранг 6 от низа (u6) — у границы
    // понижения. Проверено пробным прогоном, не угадано на глаз.
    const members = distinctRoom(10);
    const out = spireZoneEdgeStatuses(members);
    expect(out.get('u4')).toBe('promotion_edge'); // ровно на границе (ранг = zoneSize)
    expect(out.get('u6')).toBe('demotion_edge'); // сразу за зоной снизу
  });

  it('топ комнаты (ранг 1) далеко от границы — не у края', () => {
    const members = distinctRoom(10);
    const out = spireZoneEdgeStatuses(members);
    expect(out.get('u0')).toBeUndefined();
  });

  it('середина списка, вдали от границы — не у края', () => {
    const members = distinctRoom(10);
    const out = spireZoneEdgeStatuses(members);
    expect(out.get('u8')).toBeUndefined();
    expect(out.get('u9')).toBeUndefined();
  });

  it('маленькая комната (live < zoneSize) — граница вне живых, статусов нет', () => {
    // zoneSize=5 даже при 2 живых (roomTotal считает ботов) — оба места
    // внутри зоны повышения целиком, края нет ни у кого.
    const members = distinctRoom(2);
    const out = spireZoneEdgeStatuses(members);
    expect(out.size).toBe(0);
  });

  it('повышение приоритетнее понижения, когда margin пересекается (T25 приоритет)', () => {
    // 6 живых, zoneSize=5: последнее место (ранг 6=liveCount) одновременно
    // близко и к верхней, и к нижней границе margin=1 — правило "!nearPromotion
    // первым делом" обязано отдать его повышению, а не понижению.
    const members = distinctRoom(6);
    const out = spireZoneEdgeStatuses(members);
    expect(out.get('u5')).toBe('promotion_edge');
  });

  it('никто не набрал ступеней (hasAnyScorer=false) — понижения нет ни у кого', () => {
    const members = { u0: member(0), u1: member(0) };
    const out = spireZoneEdgeStatuses(members);
    for (const [, status] of out) {
      expect(status).not.toBe('demotion_edge');
    }
  });

  it('не игравший (steps=0) никогда не у края повышения', () => {
    const members = { ...distinctRoom(5), uZero: member(0) };
    const out = spireZoneEdgeStatuses(members);
    expect(out.get('uZero')).not.toBe('promotion_edge');
  });

  it('margin ровно 1 (документированное значение)', () => {
    expect(SPIRE_ZONE_EDGE_MARGIN_RANKS).toBe(1);
  });
});

describe('shouldSendSpireZoneWarningPush', () => {
  it('валидный токен без запрета — да', () => {
    expect(shouldSendSpireZoneWarningPush({ expoPushToken: 'ExponentPushToken[a]' })).toBe(true);
  });
  it('нет токена — нет', () => {
    expect(shouldSendSpireZoneWarningPush({ expoPushToken: null })).toBe(false);
  });
  it('категория «Лига» выключена — нет', () => {
    expect(shouldSendSpireZoneWarningPush({ expoPushToken: 'ExponentPushToken[a]', pushPrefs: { league: false } })).toBe(false);
  });
});

describe('buildSpireZoneWarningCandidates', () => {
  it('фильтрует по наличию юзера и валидности пуша', () => {
    const users = new Map<string, SpireZoneWarningUser>([
      ['u1', { expoPushToken: 'ExponentPushToken[a]' }],
      ['u2', { expoPushToken: null }],
    ]);
    const out = buildSpireZoneWarningCandidates(
      [{ uid: 'u1', status: 'promotion_edge' }, { uid: 'u2', status: 'demotion_edge' }, { uid: 'u3', status: 'promotion_edge' }],
      users,
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ uid: 'u1', status: 'promotion_edge' });
  });
});

function candidate(overrides: Partial<SpireZoneWarningCandidate> = {}): SpireZoneWarningCandidate {
  return { uid: 'u', token: 'ExponentPushToken[a]', uiLang: 'ru', status: 'promotion_edge', ...overrides };
}

describe('buildSpireZoneWarningCopy', () => {
  it('promotion_edge и demotion_edge дают разный текст', () => {
    const promo = buildSpireZoneWarningCopy(candidate({ status: 'promotion_edge' }));
    const demo = buildSpireZoneWarningCopy(candidate({ status: 'demotion_edge' }));
    expect(promo.body).not.toBe(demo.body);
  });
  it('не обещает исход заранее (никаких «точно поднимешься»)', () => {
    const promo = buildSpireZoneWarningCopy(candidate({ status: 'promotion_edge' }));
    expect(promo.body).not.toMatch(/точно|гарантирован/i);
  });
  it('неизвестный язык падает на ru', () => {
    const de = buildSpireZoneWarningCopy(candidate({ uiLang: 'de' }));
    const ru = buildSpireZoneWarningCopy(candidate({ uiLang: 'ru' }));
    expect(de.body).toBe(ru.body);
  });
});

describe('buildSpireZoneWarningMessage', () => {
  it('data.type=spire_zone_warning с текущим статусом', () => {
    const msg = buildSpireZoneWarningMessage(candidate({ status: 'demotion_edge' }));
    expect(msg.data).toEqual({ type: 'spire_zone_warning', status: 'demotion_edge' });
  });
});

describe('spireCurrentWeekIdForWarning', () => {
  it('делегирует переданной spireWeekId для текущей (не прошлой) недели', () => {
    const fakeWeekId = (d: Date) => `week-${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    const now = Date.UTC(2026, 8, 24);
    expect(spireCurrentWeekIdForWarning(fakeWeekId, now)).toBe('week-2026-8');
  });
});

// ── PM-200 ────────────────────────────────────────────────────────────────────
describe('PM-200: opt-out по pushPrefs.streak и метка недели', () => {
  const PUSH_FIXTURE = 'ExponentPushToken' + '[a]';
  it('pushPrefs.streak=false — не шлём; поля нет — шлём', () => {
    expect(shouldSendSpireZoneWarningPush({ expoPushToken: PUSH_FIXTURE, pushPrefs: { streak: false } })).toBe(false);
    expect(shouldSendSpireZoneWarningPush({ expoPushToken: PUSH_FIXTURE, pushPrefs: null })).toBe(true);
  });
  it('метка этой недели отсекает повтор; один пуш на человека', () => {
    const users = new Map<string, SpireZoneWarningUser>([
      ['u1', { expoPushToken: PUSH_FIXTURE, sentForWeekId: '2026-W40' }],
      ['u2', { expoPushToken: PUSH_FIXTURE, sentForWeekId: '2026-W39' }],
    ]);
    const out = buildSpireZoneWarningCandidates(
      [
        { uid: 'u1', status: 'promotion_edge' },
        { uid: 'u2', status: 'demotion_edge' },
        { uid: 'u2', status: 'promotion_edge' },
      ],
      users,
      '2026-W40',
    );
    expect(out).toEqual([expect.objectContaining({ uid: 'u2', status: 'demotion_edge' })]);
  });
});
