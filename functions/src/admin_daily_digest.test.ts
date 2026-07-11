import {
  aggregateDigestFacts,
  isDigestEmpty,
  buildDigestPrompt,
  buildDigestSystemPrompt,
  utcDayKey,
  type DigestSourceRows,
} from './admin_daily_digest';
import {
  compareMetric,
  readLastSuccessfulEndMs,
  resolveDigestWindows,
} from './admin_digest_contracts';

// Полный пустой набор источников (все ключи обязательны в новом DigestSourceRows).
const EMPTY_ROWS: DigestSourceRows = {
  reports: [],
  cancels: [],
  appErrors: [],
  safety: [],
  newUsers: [],
  purchases: [],
  paywallPurchases: [],
  ideas: [],
  queues: {
    userReports: [],
    packReports: [],
    explainReports: [],
    websiteInbox: [],
    supportInbox: [],
    helpBoard: [],
    leagueModeration: [],
  },
  community: {
    referrals: [],
    packPurchases: [],
    promoRedemptions: [],
    surveyResponses: [],
    packSubmissions: [],
    arenaRooms: [],
  },
};

describe('aggregateDigestFacts', () => {
  test('пустые источники → нули и пустой дайджест', () => {
    const facts = aggregateDigestFacts(EMPTY_ROWS);
    expect(facts.reports.total).toBe(0);
    expect(facts.cancels.total).toBe(0);
    expect(facts.appErrors.total).toBe(0);
    expect(facts.safety.total).toBe(0);
    expect(facts.growth.newUsers).toBe(0);
    expect(facts.revenue.newPaying).toBe(0);
    expect(facts.ideas.total).toBe(0);
    expect(facts.queues).toEqual([]);
    expect(facts.community.referrals.total).toBe(0);
    expect(facts.community.packPurchases.total).toBe(0);
    expect(facts.community.packSubmissions.total).toBe(0);
    expect(isDigestEmpty(facts)).toBe(true);
  });

  test('репорты: total, open (не fixed/answered/archived), категории, топ-экраны', () => {
    const facts = aggregateDigestFacts({
      ...EMPTY_ROWS,
      reports: [
        { status: 'new', category: 'audio', screen: 'lesson' },
        { status: 'new', category: 'audio', screen: 'lesson' },
        { status: 'fixed', category: 'typo', screen: 'quiz' },
        { status: 'answered', category: 'audio', screen: 'lesson' },
      ],
    });
    expect(facts.reports.total).toBe(4);
    expect(facts.reports.open).toBe(2); // fixed + answered исключены
    expect(facts.reports.byCategory).toEqual({ audio: 3, typo: 1 });
    expect(facts.reports.topScreens[0]).toEqual({ screen: 'lesson', count: 3 });
    expect(isDigestEmpty(facts)).toBe(false);
  });

  test('репорты: samples — только открытые с непустым комментарием, текст обрезан', () => {
    const long = 'y'.repeat(400);
    const facts = aggregateDigestFacts({
      ...EMPTY_ROWS,
      reports: [
        { status: 'new', category: 'bug', screen: 'lesson', comment: 'звук не играет' },
        { status: 'new', category: 'bug', screen: 'quiz', comment: long },
        { status: 'new', category: 'bug', screen: 'home' }, // без комментария — не sample
        { status: 'fixed', category: 'bug', screen: 'home', comment: 'уже неважно' }, // закрыт — не sample
      ],
    });
    expect(facts.reports.samples.length).toBe(2);
    expect(facts.reports.samples[0]).toEqual({ screen: 'lesson', category: 'bug', comment: 'звук не играет' });
    expect(facts.reports.samples.every((s) => s.comment.length <= 220)).toBe(true);
  });

  test('отмены: считает по причине и берёт до 5 непустых сэмплов, режет до 160 символов', () => {
    const long = 'x'.repeat(300);
    const facts = aggregateDigestFacts({
      ...EMPTY_ROWS,
      cancels: [
        { reason: 'too_expensive', reasonText: 'дорого' },
        { reason: 'too_expensive', reasonText: long },
        { reason: 'not_using_enough', reasonText: '' },
        { reason: 'other' },
      ],
    });
    expect(facts.cancels.total).toBe(4);
    expect(facts.cancels.byReason.too_expensive).toBe(2);
    expect(facts.cancels.byReason.other).toBe(1);
    expect(facts.cancels.sampleTexts).toContain('дорого');
    expect(facts.cancels.sampleTexts.every((t) => t.length <= 160)).toBe(true);
    // пустые тексты не попали
    expect(facts.cancels.sampleTexts.length).toBe(2);
  });

  test('app_errors: total, critical и группировка по fingerprint с частотой', () => {
    const facts = aggregateDigestFacts({
      ...EMPTY_ROWS,
      appErrors: [
        { severity: 'warning', context: 'audio load', message: 'timeout', feature: 'lesson', fingerprint: 'fp-audio' },
        { severity: 'critical', context: 'audio load', message: 'timeout', feature: 'lesson', fingerprint: 'fp-audio' },
        { severity: 'critical', context: 'sync fail', message: 'network', feature: 'sync', fingerprint: 'fp-sync' },
      ],
    });
    expect(facts.appErrors.total).toBe(3);
    expect(facts.appErrors.critical).toBe(2);
    // топ-группа — та, что встречается чаще (fp-audio: 2)
    expect(facts.appErrors.topGroups[0].count).toBe(2);
    expect(facts.appErrors.topGroups[0].context).toBe('audio load');
    expect(facts.appErrors.topGroups.length).toBe(2);
  });

  test('safety: open = не handled, категории', () => {
    const facts = aggregateDigestFacts({
      ...EMPTY_ROWS,
      safety: [
        { category: 'suicide', handled: false },
        { category: 'self_harm', handled: true },
        { category: 'suicide', handled: false },
      ],
    });
    expect(facts.safety.total).toBe(3);
    expect(facts.safety.open).toBe(2);
    expect(facts.safety.byCategory).toEqual({ suicide: 2, self_harm: 1 });
    // наличие safety-события делает дайджест непустым
    expect(isDigestEmpty(facts)).toBe(false);
  });

  test('рост: новые пользователи считаются и делают дайджест непустым', () => {
    const facts = aggregateDigestFacts({
      ...EMPTY_ROWS,
      newUsers: [{ platform: 'ios' }, { platform: 'android' }, {}],
    });
    expect(facts.growth.newUsers).toBe(3);
    expect(isDigestEmpty(facts)).toBe(false);
  });

  test('деньги: классификация RC-событий + paywall-сигнал', () => {
    const facts = aggregateDigestFacts({
      ...EMPTY_ROWS,
      purchases: [
        { eventType: 'INITIAL_PURCHASE', periodType: 'NORMAL' },
        { eventType: 'NON_RENEWING_PURCHASE', periodType: 'NORMAL' },
        { eventType: 'RENEWAL', periodType: 'NORMAL' },
        { eventType: 'REFUND', periodType: 'NORMAL' },
        { eventType: 'INITIAL_PURCHASE', periodType: 'TRIAL' },
      ],
      paywallPurchases: [{ day: '2026-07-04' }, { day: '2026-07-04' }],
    });
    expect(facts.revenue.newPaying).toBe(3); // 2 initial/non-renewing + 1 trial-initial
    expect(facts.revenue.renewals).toBe(1);
    expect(facts.revenue.refunds).toBe(1);
    expect(facts.revenue.trials).toBe(1);
    expect(facts.revenue.paywallPurchases).toBe(2);
    expect(isDigestEmpty(facts)).toBe(false);
  });

  test('идеи: считает, группирует по категории, кладёт содержимое (обрезанное)', () => {
    const longDesc = 'z'.repeat(500);
    const facts = aggregateDigestFacts({
      ...EMPTY_ROWS,
      ideas: [
        { title: 'Тёмная тема', description: 'сделайте тёмную тему', benefit: 'глазам легче', category: 'feature', userName: 'Аня' },
        { title: 'Скидка', description: longDesc, benefit: '', category: 'monetization', userName: 'Боб' },
      ],
    });
    expect(facts.ideas.total).toBe(2);
    expect(facts.ideas.byCategory).toEqual({ feature: 1, monetization: 1 });
    expect(facts.ideas.items[0].title).toBe('Тёмная тема');
    expect(facts.ideas.items.every((i) => i.description.length <= 300)).toBe(true);
    expect(isDigestEmpty(facts)).toBe(false);
  });

  test('очереди: только непустые попадают строками, с заметкой по частой причине', () => {
    const facts = aggregateDigestFacts({
      ...EMPTY_ROWS,
      queues: {
        ...EMPTY_ROWS.queues,
        userReports: [{ reason: 'offensive_nickname' }, { reason: 'offensive_nickname' }],
        supportInbox: [{ subject: 'не могу войти' }],
      },
    });
    const names = facts.queues.map((q) => q.name);
    expect(facts.queues.length).toBe(2);
    expect(names.some((n) => n.includes('юзеров'))).toBe(true);
    const ur = facts.queues.find((q) => q.name.includes('юзеров'));
    expect(ur?.total).toBe(2);
    expect(ur?.note).toContain('offensive_nickname');
    expect(isDigestEmpty(facts)).toBe(false);
  });

  test('community: рефералы/покупки-паков/промо/опрос/сабмишены/арена считаются и делают дайджест непустым', () => {
    const facts = aggregateDigestFacts({
      ...EMPTY_ROWS,
      community: {
        referrals: [{ status: 'qualified' }, { status: 'pending' }, { status: 'qualified' }],
        packPurchases: [{ packId: 'p1', priceShards: 50 }, { packId: 'p2', priceShards: 30 }],
        promoRedemptions: [{ code: 'SUMMER' }, { code: 'SUMMER' }, { code: 'WELCOME' }],
        surveyResponses: [{ uid: 'u1' }],
        packSubmissions: [{ title: 'Идиомы делового английского', submissionKind: 'new' }],
        arenaRooms: [{ title: 'Дуэль' }, { title: 'Блиц' }],
      },
    });
    expect(facts.community.referrals.total).toBe(3);
    expect(facts.community.referrals.byStatus).toEqual({ qualified: 2, pending: 1 });
    expect(facts.community.packPurchases.total).toBe(2);
    expect(facts.community.packPurchases.shardsSpent).toBe(80);
    expect(facts.community.promoRedemptions.byCode).toEqual({ SUMMER: 2, WELCOME: 1 });
    expect(facts.community.surveyResponses.total).toBe(1);
    expect(facts.community.packSubmissions.titles).toContain('Идиомы делового английского');
    expect(facts.community.arenaRooms.total).toBe(2);
    expect(isDigestEmpty(facts)).toBe(false);
  });

  test('unknown-ключ для отсутствующих полей', () => {
    const facts = aggregateDigestFacts({ ...EMPTY_ROWS, reports: [{ status: 'new' }] });
    expect(facts.reports.byCategory).toEqual({ unknown: 1 });
  });
});

describe('buildDigestPrompt / utcDayKey', () => {
  test('промпт — валидный JSON фактов', () => {
    const facts = aggregateDigestFacts({ ...EMPTY_ROWS, reports: [{ status: 'new', category: 'audio' }] });
    const prompt = buildDigestPrompt(facts);
    const parsed = JSON.parse(prompt);
    expect(parsed.reports.total).toBe(1);
    // новые блоки присутствуют в payload для ИИ
    expect(parsed.growth).toBeDefined();
    expect(parsed.revenue).toBeDefined();
    expect(parsed.ideas).toBeDefined();
  });

  test('utcDayKey — YYYY-MM-DD по UTC', () => {
    expect(utcDayKey(Date.UTC(2026, 6, 3, 23, 59, 0))).toBe('2026-07-03');
    expect(utcDayKey(Date.UTC(2026, 0, 1, 0, 0, 0))).toBe('2026-01-01');
  });

  test('v2 prompt names exact windows, metric semantics and unavailable sources', () => {
    const facts = aggregateDigestFacts({ ...EMPTY_ROWS, newUsers: [{ platform: 'ios' }] });
    const prompt = buildDigestPrompt(facts, {
      currentWindow: { startMs: 100, endMs: 200 },
      previousWindow: { startMs: 0, endMs: 100 },
      sourceCoverage: [
        { sourceId: 'app_errors', status: 'failed', errorCode: 'failed-precondition' },
      ],
      revenueReconciliation: { dashboard: 60, webhook: 58, funnel: 31, webhookDelta: null, funnelCoverageRatio: null, status: 'not_comparable', explanation: 'Different semantics.' },
      revenueCatCoverage: { status: 'ok' },
      codex: { product: 'Phraseman', routeCount: 42 },
    });
    const parsed = JSON.parse(prompt);
    expect(parsed.reporting.currentWindow).toEqual({ startMs: 100, endMs: 200 });
    expect(parsed.reporting.previousWindow).toEqual({ startMs: 0, endMs: 100 });
    expect(parsed.instructions).toEqual(expect.arrayContaining([
      expect.stringContaining('факт'),
      expect.stringContaining('гипотез'),
      expect.stringContaining('не называй данные полными'),
    ]));
    expect(parsed.metricDefinitions.some((metric: { id: string }) => metric.id === 'trial_starts')).toBe(true);
    expect(parsed.sourceCoverage[0]).toMatchObject({ sourceId: 'app_errors', status: 'failed' });
    expect(parsed.revenueReconciliation).toMatchObject({ dashboard: 60, webhook: 58, funnel: 31, status: 'not_comparable' });
    expect(parsed.codex).toEqual({ product: 'Phraseman', routeCount: 42 });
  });

  test('system prompt no longer claims complete 24-hour coverage', () => {
    const prompt = buildDigestSystemPrompt();
    expect(prompt).toContain('НЕ считай вход полным');
    expect(prompt).toContain('с момента последнего успешного дайджеста');
    expect(prompt).toContain('RevenueCat API');
  });
});

describe('digest v2 windows and comparisons', () => {
  test('starts after the last successful run and compares an equal previous interval', () => {
    expect(resolveDigestWindows(1_000_000, 700_000)).toEqual({
      current: { startMs: 700_000, endMs: 1_000_000 },
      previous: { startMs: 400_000, endMs: 700_000 },
      reason: 'last_successful_digest',
    });
  });

  test('uses a 24-hour fallback for the first digest', () => {
    const nowMs = Date.UTC(2026, 6, 11, 12);
    const windows = resolveDigestWindows(nowMs);
    expect(windows.current).toEqual({ startMs: nowMs - 86_400_000, endMs: nowMs });
    expect(windows.previous).toEqual({ startMs: nowMs - 172_800_000, endMs: nowMs - 86_400_000 });
    expect(windows.reason).toBe('first_run_fallback');
  });

  test('does not manufacture a percent change from a zero baseline', () => {
    expect(compareMetric(5, 0)).toEqual({
      current: 5,
      previous: 0,
      absoluteDelta: 5,
      percentDelta: null,
    });
  });

  test('accepts only a successful finite cursor from digest state', () => {
    expect(readLastSuccessfulEndMs({ status: 'succeeded', windowEndMs: 700_000 })).toBe(700_000);
    expect(readLastSuccessfulEndMs({ status: 'failed', windowEndMs: 800_000 })).toBeUndefined();
    expect(readLastSuccessfulEndMs({ status: 'succeeded', windowEndMs: 'bad' })).toBeUndefined();
  });
});
