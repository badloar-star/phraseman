import {
  parseQuestConfig, validateQuestConfigForWrite, resolveQueuePromotion,
  resolveQuestPhase, questIsComplete, parseQuestProgress, questExpiryMs,
  runeAmountIsPayable, buildPublicQuestSnapshot, questProgressValue,
} from '../functions/src/quests_core';

const base = {
  questId: 'test_quest', kind: 'spin_wheel', target: 3,
  title: { ru: 'Крути колесо' }, body: { ru: 'Три раза' },
  rewards: [{ kind: 'runes', amount: 300 }],
  durationHours: 72, createdAtMs: 1000,
};

describe('quests_core', () => {
  it('раскладывает руны по номиналам', () => {
    expect(runeAmountIsPayable(300)).toBe(true);
    expect(runeAmountIsPayable(3000)).toBe(true);
    expect(runeAmountIsPayable(1000)).toBe(true);
    expect(runeAmountIsPayable(35)).toBe(false);
    expect(runeAmountIsPayable(7)).toBe(false);
  });

  it('отклоняет неразложимую сумму рун с понятной причиной', () => {
    const res = validateQuestConfigForWrite({ ...base, rewards: [{ kind: 'runes', amount: 35 }] });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toContain('номиналам');
  });

  it('принимает валидный конфиг', () => {
    const res = validateQuestConfigForWrite(base);
    expect(res.ok).toBe(true);
  });

  it('требует хотя бы одну награду', () => {
    const res = validateQuestConfigForWrite({ ...base, rewards: [] });
    expect(res.ok).toBe(false);
  });

  it('дельта-цель считает прирост от baseline', () => {
    const cfg = parseQuestConfig({ ...base, kind: 'earn_runes', target: 1000 })!;
    const progress = parseQuestProgress({ baseline: 5000, current: 5600 }, 'test_quest', 0);
    expect(questProgressValue(cfg, progress)).toBe(600);
    expect(questIsComplete(cfg, progress)).toBe(false);
    const done = parseQuestProgress({ baseline: 5000, current: 6000 }, 'test_quest', 0);
    expect(questIsComplete(cfg, done)).toBe(true);
  });

  it('трата рун не роняет прогресс ниже нуля', () => {
    const cfg = parseQuestConfig({ ...base, kind: 'earn_runes', target: 1000 })!;
    const spent = parseQuestProgress({ baseline: 5000, current: 4000 }, 'test_quest', 0);
    expect(questProgressValue(cfg, spent)).toBe(0);
  });

  it('выполненное, но не забранное сгорает строго в дедлайн', () => {
    const cfg = parseQuestConfig({ ...base, status: 'active', expiresAtMs: 5000 })!;
    const done = parseQuestProgress({ current: 3 }, 'test_quest', 0);
    expect(resolveQuestPhase(cfg, done, 4999)).toBe('ready');
    expect(resolveQuestPhase(cfg, done, 5000)).toBe('expired');
  });

  it('забранное остаётся забранным даже после дедлайна', () => {
    const cfg = parseQuestConfig({ ...base, status: 'active', expiresAtMs: 5000 })!;
    const claimed = parseQuestProgress({ current: 3, claimedAtMs: 4000 }, 'test_quest', 0);
    expect(resolveQuestPhase(cfg, claimed, 9999)).toBe('claimed');
  });

  it('держит активное, пока оно живо', () => {
    const active = parseQuestConfig({ ...base, status: 'active', expiresAtMs: 9000 })!;
    const queued = parseQuestConfig({ ...base, questId: 'next_one', status: 'queued' })!;
    const d = resolveQueuePromotion({ active, queued: [queued], nowMs: 5000 });
    expect(d.action).toBe('keep_active');
  });

  it('закрывает истёкшее и поднимает следующее', () => {
    const active = parseQuestConfig({ ...base, status: 'active', expiresAtMs: 4000 })!;
    const queued = parseQuestConfig({ ...base, questId: 'next_one', status: 'queued' })!;
    const d = resolveQueuePromotion({ active, queued: [queued], nowMs: 5000 });
    expect(d.action).toBe('expire_and_promote');
    if (d.action === 'expire_and_promote') {
      expect(d.expireQuestId).toBe('test_quest');
      expect(d.promoteQuestId).toBe('next_one');
    }
  });

  it('не поднимает задание раньше назначенной даты', () => {
    const queued = parseQuestConfig({ ...base, questId: 'later', status: 'queued', scheduledStartMs: 9000 })!;
    expect(resolveQueuePromotion({ active: null, queued: [queued], nowMs: 5000 }).action).toBe('idle');
    expect(resolveQueuePromotion({ active: null, queued: [queued], nowMs: 9000 }).action).toBe('promote');
  });

  it('соблюдает порядок очереди', () => {
    const a = parseQuestConfig({ ...base, questId: 'second', status: 'queued', queueOrder: 5 })!;
    const b = parseQuestConfig({ ...base, questId: 'first', status: 'queued', queueOrder: 1 })!;
    const d = resolveQueuePromotion({ active: null, queued: [a, b], nowMs: 5000 });
    expect(d.action === 'promote' && d.promoteQuestId).toBe('first');
  });

  it('срок жизни считается от активации', () => {
    const cfg = parseQuestConfig(base)!;
    expect(questExpiryMs(cfg, 1_000_000)).toBe(1_000_000 + 72 * 3600_000);
  });

  it('публичный снапшот не отдаёт прогресс больше цели', () => {
    const cfg = parseQuestConfig({ ...base, status: 'active', expiresAtMs: 9e12 })!;
    const over = parseQuestProgress({ current: 99 }, 'test_quest', 0);
    const snap = buildPublicQuestSnapshot(cfg, over, 'ru', 1000);
    expect(snap.progress).toBe(3);
    expect(snap.phase).toBe('ready');
    expect(snap.title).toBe('Крути колесо');
  });
});
