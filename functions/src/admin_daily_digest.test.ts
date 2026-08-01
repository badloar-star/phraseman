import {
  aggregateDigestFacts,
  isDigestEmpty,
  buildDigestPrompt,
  buildDigestComparisons,
  compareDigestMetric,
  humanizeDigestName,
  parseDigestNarrative,
  resolveDigestWindows,
  utcDayKey,
  type DigestSourceRows,
} from './admin_daily_digest';

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
  },
  community: {
    referrals: [],
    packPurchases: [],
    promoRedemptions: [],
    surveyResponses: [],
    packSubmissions: [],
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
    expect(facts.reports.topScreens[0]).toEqual({ screen: 'Экран урока', count: 3 });
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
    expect(facts.reports.samples[0]).toEqual({ screen: 'Экран урока', category: 'bug', comment: 'звук не играет' });
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
        { eventType: 'CANCELLATION', periodType: 'TRIAL' },
      ],
      paywallPurchases: [{ day: '2026-07-04' }, { day: '2026-07-04' }],
    });
    expect(facts.revenue.newPaying).toBe(2); // trial start ещё не является платящим
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

  test('community: рефералы/покупки-паков/промо/опрос/сабмишены считаются и делают дайджест непустым', () => {
    const facts = aggregateDigestFacts({
      ...EMPTY_ROWS,
      community: {
        referrals: [{ status: 'qualified' }, { status: 'pending' }, { status: 'qualified' }],
        packPurchases: ([
          { packId: 'p1', priceShards: 50, acquisitionSource: 'paid_community_sale' },
          { packId: 'p2', priceShards: 30, acquisitionSource: 'weekly_boon_gift' },
        ] as unknown) as DigestSourceRows['community']['packPurchases'],
        promoRedemptions: [{ code: 'SUMMER' }, { code: 'SUMMER' }, { code: 'WELCOME' }],
        surveyResponses: [{ uid: 'u1' }],
        packSubmissions: [{ title: 'Идиомы делового английского', submissionKind: 'new' }],
      },
    });
    expect(facts.community.referrals.total).toBe(3);
    expect(facts.community.referrals.byStatus).toEqual({ qualified: 2, pending: 1 });
    expect(facts.community.packPurchases.total).toBe(2);
    expect(facts.community.packPurchases.shardsSpent).toBe(10);
    expect(facts.community.promoRedemptions.byCode).toEqual({ SUMMER: 2, WELCOME: 1 });
    expect(facts.community.surveyResponses.total).toBe(1);
    expect(facts.community.packSubmissions.titles).toContain('Идиомы делового английского');
    expect(isDigestEmpty(facts)).toBe(false);
  });

  test('unknown-ключ для отсутствующих полей', () => {
    const facts = aggregateDigestFacts({ ...EMPTY_ROWS, reports: [{ status: 'new' }] });
    expect(facts.reports.byCategory).toEqual({ unknown: 1 });
  });
});

describe('buildDigestPrompt / utcDayKey', () => {
  test('окно начинается с прошлого открытия и предыдущий период имеет ту же длину', () => {
    expect(resolveDigestWindows(1_000_000, 700_000)).toEqual({
      current: { startMs: 700_000, endMs: 1_000_000 },
      previous: { startMs: 400_000, endMs: 700_000 },
      reason: 'last_digest_open',
    });
  });

  test('первое открытие использует честный fallback 24 часа', () => {
    expect(resolveDigestWindows(1_000_000)).toEqual({
      current: { startMs: 1_000_000 - 86_400_000, endMs: 1_000_000 },
      previous: { startMs: 1_000_000 - 172_800_000, endMs: 1_000_000 - 86_400_000 },
      reason: 'first_open_fallback',
    });
  });

  test('сравнение не выдумывает процент при нулевой базе', () => {
    expect(compareDigestMetric(5, 0)).toEqual({
      current: 5,
      previous: 0,
      absoluteDelta: 5,
      percentDelta: null,
      direction: 'new',
    });
  });

  test('технические пути получают человеческие названия', () => {
    expect(humanizeDigestName('app/lesson_words.tsx')).toBe('Экран урока');
    expect(humanizeDigestName('manage_subscription')).toBe('Управление подпиской');
    expect(humanizeDigestName('app/unknown_new_screen.tsx')).toBe('Неизвестный экран приложения');
  });

  test('сравнения имеют стабильные id и человеческие названия', () => {
    const current = aggregateDigestFacts({ ...EMPTY_ROWS, newUsers: [{}, {}], reports: [{ status: 'new' }] });
    const previous = aggregateDigestFacts({ ...EMPTY_ROWS, newUsers: [{}] });
    const comparisons = buildDigestComparisons(current, previous);
    expect(comparisons).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'new_users', label: 'Новые пользователи', current: 2, previous: 1 }),
      expect.objectContaining({ id: 'open_reports', label: 'Открытые сообщения об ошибках', current: 1, previous: 0 }),
    ]));
    expect(comparisons.every((item) => !item.label.includes('.tsx'))).toBe(true);
  });

  test('failed источник не превращается в точный ноль в сравнении', () => {
    const current = aggregateDigestFacts(EMPTY_ROWS);
    const previous = aggregateDigestFacts({ ...EMPTY_ROWS, appErrors: [{ severity: 'critical' }] });
    const comparisons = buildDigestComparisons(current, previous, [
      { sourceId: 'app_errors', label: 'Ошибки приложения', status: 'failed', rowCount: 0, truncated: false, period: 'current' },
      { sourceId: 'app_errors', label: 'Ошибки приложения', status: 'ok', rowCount: 1, truncated: false, period: 'previous' },
    ]);
    expect(comparisons.find((item) => item.id === 'critical_errors')).toMatchObject({
      availability: 'unavailable', current: null, previous: null, absoluteDelta: null, percentDelta: null,
    });
  });

  test('day-only paywall источник помечается как неточное сравнение', () => {
    const comparisons = buildDigestComparisons(aggregateDigestFacts(EMPTY_ROWS), aggregateDigestFacts(EMPTY_ROWS), [
      { sourceId: 'paywall_funnel', label: 'Воронка Plus', status: 'partial', rowCount: 0, truncated: false, period: 'current' },
      { sourceId: 'paywall_funnel', label: 'Воронка Plus', status: 'partial', rowCount: 0, truncated: false, period: 'previous' },
    ]);
    expect(comparisons.find((item) => item.id === 'paywall_purchase_signals')?.availability).toBe('partial');
  });

  test('промпт требует полноценный Product Manager и разделяет факты от гипотез', () => {
    const current = aggregateDigestFacts({ ...EMPTY_ROWS, reports: [{ status: 'new', category: 'audio', screen: 'app/lesson_words.tsx' }] });
    const previous = aggregateDigestFacts(EMPTY_ROWS);
    const prompt = buildDigestPrompt({
      current,
      previous,
      comparisons: buildDigestComparisons(current, previous),
      windows: resolveDigestWindows(1_000_000, 700_000),
      sourceCoverage: [{ sourceId: 'error_reports', label: 'Сообщения об ошибках', status: 'ok', rowCount: 1, truncated: false }],
    });
    expect(prompt).toContain('"productManager"');
    expect(prompt).toContain('"hypothesis"');
    expect(prompt).toContain('"successMetric"');
    expect(prompt).toContain('Экран урока');
    expect(prompt).toContain('предыдущим равным интервалом');
    expect(prompt).not.toContain('ПОЛНУЮ СВОДКУ');
  });

  test('пользовательские сэмплы в промпте не раскрывают email, телефон и имя автора идеи', () => {
    const current = aggregateDigestFacts({
      ...EMPTY_ROWS,
      reports: [{ status: 'new', comment: 'Пишите мне user@example.com или +353871234567' }],
      ideas: [{ title: 'Идея', description: 'Связаться с me@example.com', userName: 'Private Name' }],
    });
    const prompt = buildDigestPrompt({
      current,
      previous: aggregateDigestFacts(EMPTY_ROWS),
      comparisons: [], windows: resolveDigestWindows(1_000_000, 700_000), sourceCoverage: [],
    });
    expect(prompt).not.toContain('user@example.com');
    expect(prompt).not.toContain('me@example.com');
    expect(prompt).not.toContain('353871234567');
    expect(prompt).not.toContain('Private Name');
    expect(prompt).toContain('[email]');
  });

  test('невалидный структурированный ответ превращается в безопасный fallback', () => {
    const parsed = parseDigestNarrative('не json', {
      comparisons: [{ id: 'new_users', label: 'Новые пользователи', sourceIds: ['users'], availability: 'ok', current: 2, previous: 1, absoluteDelta: 1, percentDelta: 100, direction: 'up' }],
      sourceWarnings: ['Источник ошибок недоступен'],
    });
    expect(parsed.executiveSummary).toContain('Новые пользователи');
    expect(parsed.productManager).toEqual([]);
    expect(parsed.sourceWarnings).toContain('Источник ошибок недоступен');
  });

  test('модель не может вернуть имя файла как заголовок Product Manager', () => {
    const comparisons = buildDigestComparisons(
      aggregateDigestFacts({ ...EMPTY_ROWS, newUsers: [{}, {}] }),
      aggregateDigestFacts({ ...EMPTY_ROWS, newUsers: [{}] }),
    );
    const parsed = parseDigestNarrative(JSON.stringify({
      executiveSummary: 'Есть сигнал.',
      productManager: [{
        title: 'app/lesson_words.tsx', metricIds: ['new_users'],
        whyItMatters: 'Мешает уроку.', hypothesis: 'Гипотеза: проблема звука.',
        action: 'Проверить воспроизведение.', successMetric: 'Ноль повторов.', confidence: 'medium',
      }],
      growthAndRevenue: [], qualityAndRisks: [], userVoice: [], actions: [], sourceWarnings: [],
    }), { comparisons, sourceWarnings: [] });
    expect(parsed.productManager[0].title).toBe('Экран урока');
    expect(parsed.productManager[0].title).not.toContain('.tsx');
    expect(parsed.productManager[0].fact).toContain('Новые пользователи: 2');
    expect(parsed.productManager[0].comparison).toContain('было 1');
    expect(parsed.productManager[0].sourceIds).toContain('users');
  });

  test('Product Manager отклоняет неизвестную метрику и неполный вывод', () => {
    const parsed = parseDigestNarrative(JSON.stringify({
      executiveSummary: 'Итог.',
      productManager: [
        { title: 'Выдумка', metricIds: ['invented_metric'], whyItMatters: 'x', hypothesis: 'x', action: 'x', successMetric: 'x', confidence: 'high' },
        { title: 'Без гипотезы', metricIds: ['new_users'], whyItMatters: 'x', action: 'x', successMetric: 'x', confidence: 'high' },
      ],
      growthAndRevenue: [], qualityAndRisks: [], userVoice: [], actions: [], sourceWarnings: [],
    }), { comparisons: buildDigestComparisons(aggregateDigestFacts(EMPTY_ROWS), aggregateDigestFacts(EMPTY_ROWS)), sourceWarnings: [] });
    expect(parsed.productManager).toEqual([]);
  });

  test('utcDayKey — YYYY-MM-DD по UTC', () => {
    expect(utcDayKey(Date.UTC(2026, 6, 3, 23, 59, 0))).toBe('2026-07-03');
    expect(utcDayKey(Date.UTC(2026, 0, 1, 0, 0, 0))).toBe('2026-01-01');
  });
});
