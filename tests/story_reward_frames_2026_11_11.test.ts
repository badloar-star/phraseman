// зачем (владелец 11.11, U36 «За что дали награду»): кадры наград в историях — статуэтка лиги и два вида кадра недели, которые
// показываются случайно. Сторож держит три обещания: (1) вид кадра привязан к самой истории и не меняется при повторном открытии;
// (2) оба вида действительно встречаются; (3) статуэток в бандле ровно столько, сколько лиг, и прежняя лига считается верно на краях.
import fs from 'node:fs';
import path from 'node:path';
import { peakWeekSeed, prevTierOf, storyRewardHash, storyRewardVariant, type PeakWeekOutcome } from '../components/stories/templates/story_reward_variant';
import { SPIRE_TIER_COUNT } from '../modules/spire/tier_names';
import { addStoryEvent, refreshSpireWeekReward, type StoryEventList } from '../modules/story_events/story_events_core';

const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

describe('истории наград U36 — вид кадра недели', () => {
  const week = (place: number, weekCoins: number, outcome: PeakWeekOutcome = 'up') => ({ tier: 1, outcome, place, total: 30, weekCoins });

  it('одна и та же история всегда выглядит одинаково', () => {
    const seed = peakWeekSeed(week(2, 1300));
    expect(storyRewardVariant(seed)).toBe(storyRewardVariant(seed));
    expect(storyRewardHash(seed)).toBe(storyRewardHash(peakWeekSeed(week(2, 1300))));
  });

  it('встречаются оба вида, и ни один не забирает почти всё', () => {
    let gallery = 0;
    const N = 400;
    for (let i = 0; i < N; i += 1) if (storyRewardVariant(peakWeekSeed(week(1 + (i % 30), 100 + i * 37))) === 'gallery') gallery += 1;
    expect(gallery).toBeGreaterThan(N * 0.3);
    expect(gallery).toBeLessThan(N * 0.7);
  });

  it('ключ истории различает исход, место и монеты недели', () => {
    expect(peakWeekSeed(week(2, 1300))).not.toBe(peakWeekSeed(week(3, 1300)));
    expect(peakWeekSeed(week(2, 1300))).not.toBe(peakWeekSeed(week(2, 1310)));
    expect(peakWeekSeed(week(2, 1300, 'up'))).not.toBe(peakWeekSeed(week(2, 1300, 'stay')));
  });
});

describe('истории наград U36 — прежняя лига', () => {
  it('подъём — лига ниже, спуск — лига выше, остался — та же', () => {
    expect(prevTierOf(4, 'up')).toBe(3);
    expect(prevTierOf(4, 'down')).toBe(5);
    expect(prevTierOf(4, 'stay')).toBe(4);
  });

  it('на краях лестницы прежняя лига прижимается к новой — кадр покажет одну статуэтку', () => {
    expect(prevTierOf(0, 'up')).toBe(0);
    expect(prevTierOf(SPIRE_TIER_COUNT - 1, 'down')).toBe(SPIRE_TIER_COUNT - 1);
  });

  it('битое число лиги не роняет расчёт', () => {
    expect(prevTierOf(Number.NaN, 'up')).toBe(0);
    expect(prevTierOf(99, 'stay')).toBe(SPIRE_TIER_COUNT - 1);
  });
});

describe('истории наград U36 — «в пути» не остаётся навсегда', () => {
  // зачем (владелец 11.11, шаг 6): история недели одна на неделю; записанная до выплаты, она обязана получить сумму после выплаты
  const NOW = 1_800_000_000_000;
  const week = (extra: Record<string, string | number>) => ({ weekId: '2026-W46', lang: 'en', outcome: 'up', floor: 1, place: 2, total: 30, ...extra });
  const record = (payload: Record<string, string | number>): StoryEventList => {
    const added = addStoryEvent([], { type: 'spire_week', payload, atMs: NOW }, NOW);
    if (!added.added) throw new Error(`история не записалась: ${added.reason}`);
    return added.list;
  };

  it('выплата пришла — у истории «в пути» появляются суммы, время и «просмотрено» прежние', () => {
    const list = record(week({ placeCoins: 0, promotionCoins: 0, rewardPending: 1 }));
    const fresh = refreshSpireWeekReward(list, week({ placeCoins: 200, promotionCoins: 100, rewardPending: 0 }));
    expect(fresh.changed).toBe(true);
    expect(fresh.list).toHaveLength(1);
    expect(fresh.list[0].payload).toMatchObject({ placeCoins: 200, promotionCoins: 100, rewardPending: 0, place: 2, outcome: 'up' });
    expect(fresh.list[0].atMs).toBe(list[0].atMs);
    expect(fresh.list[0].seen).toBe(list[0].seen);
    expect(fresh.list[0].id).toBe(list[0].id);
  });

  it('повтор без изменений ничего не пишет', () => {
    const list = record(week({ placeCoins: 0, promotionCoins: 0, rewardPending: 1 }));
    const same = refreshSpireWeekReward(list, week({ placeCoins: 0, promotionCoins: 0, rewardPending: 1 }));
    expect(same.changed).toBe(false);
    expect(same.list).toBe(list);
  });

  it('выплаченную историю и историю другой недели не трогает', () => {
    const paid = record(week({ placeCoins: 200, promotionCoins: 100, rewardPending: 0 }));
    expect(refreshSpireWeekReward(paid, week({ placeCoins: 0, promotionCoins: 0, rewardPending: 1 })).changed).toBe(false);
    const pending = record(week({ placeCoins: 0, promotionCoins: 0, rewardPending: 1 }));
    expect(refreshSpireWeekReward(pending, { ...week({ placeCoins: 300, promotionCoins: 0, rewardPending: 0 }), weekId: '2026-W47' }).changed).toBe(false);
  });

  it('признак и обновление подключены: событие пишет rewardPending, хранилище зовёт обновление при повторе', () => {
    expect(read('modules/story_events/story_event_sources.ts')).toContain("rewardPending: result.rewardStatus === 'pending_wallet' ? 1 : 0,");
    expect(read('components/stories/templates/story_template_from_event.ts')).toContain('rewardPending: int(p.rewardPending) === 1');
    expect(read('modules/story_events/story_events_store.ts')).toContain('const fresh = refreshSpireWeekReward(decision.list, payload);');
  });
});

describe('истории наград U36 — статуэтки и стиль', () => {
  const art = read('components/stories/templates/story_reward_art.ts');
  const ORDER = ['granite', 'basalt', 'marble', 'jade', 'quartz', 'agate', 'onyx', 'amethyst', 'opal', 'topaz', 'obsidian', 'diamond'];

  it('в бандле 12 статуэток в порядке лиг, и каждая картинка лежит на диске', () => {
    const found = [...art.matchAll(/spire_summit_([a-z]+)\.webp/g)].map((m) => m[1]);
    expect(found).toEqual(ORDER);
    expect(found).toHaveLength(SPIRE_TIER_COUNT);
    for (const name of ORDER) expect(fs.existsSync(path.join(ROOT, 'assets/images/spire-achievements', `spire_summit_${name}.webp`))).toBe(true);
  });

  it('сцена и кадры — без обводок контейнеров и без ужатия текста', () => {
    for (const rel of ['components/stories/templates/story_reward_stage.tsx', 'components/stories/templates/frames_reward.tsx']) {
      const src = read(rel);
      expect(src).not.toMatch(/borderWidth|borderColor/);
      expect(src).not.toMatch(/adjustsFontSizeToFit/);
    }
  });

  it('награда за место доходит от итога недели до кадра, а сумма видна только когда она больше нуля', () => {
    // зачем (владелец 11.11, шаг 3): сумму нельзя показывать, пока монеты не дошли, — число в итоге недели уже 0 до выплаты,
    // и кадр обязан прятать строку суммы при нуле, а не рисовать «+0»
    expect(read('modules/story_events/story_event_sources.ts')).toContain('placeCoins: result.placeCoins ?? 0');
    expect(read('components/stories/templates/story_template_from_event.ts')).toContain('placeCoins: int(p.placeCoins)');
    const frame = read('components/stories/templates/frames_reward.tsx');
    expect(frame).toContain("{total > 0 ? <RewardSum total={total} rank={myRank} /> : pending ? <RewardPending text={tplText(lang, 'rewardOnTheWay')} rank={myRank} /> : null}");
    expect(frame).toContain('const pending = total === 0 && tpl.rewardPending === true;');
    expect(frame).toContain("const promotionCoins = tpl.outcome === 'up' ? Math.max(0, tpl.promotionCoins) : 0;");
  });

  it('строка энергии считается общим правилом итога недели, а не своим', () => {
    // зачем (владелец 11.11, шаг 5): кадр истории и окно итога недели обязаны говорить про энергию одно и то же
    const frame = read('components/stories/templates/frames_reward.tsx');
    expect(frame).toContain("spireWeekEnergyLine(lang, { promoted: tpl.outcome === 'up', demoted: tpl.outcome === 'down' }, energyBonus)");
    expect(frame).toContain('const energyBonus = getSpireEnergyBonus();');
    expect(frame).toContain('{energy !== null ? <P text={energy}');
  });

  it('движение сцены идёт от часов кадра, а не от своих таймеров', () => {
    const stage = read('components/stories/templates/story_reward_stage.tsx');
    expect(stage).toMatch(/useStoryFrameClock/);
    expect(stage).not.toMatch(/setInterval|setTimeout|withRepeat|requestAnimationFrame/);
  });
});
