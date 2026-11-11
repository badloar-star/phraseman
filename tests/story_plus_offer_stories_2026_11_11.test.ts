// story_plus_offer_stories_2026_11_11.test.ts — кадр-предложение Plus приходит игроку следом за рубежом серии (шаг 2).
// зачем (владелец 11.11: «карточки предложения переместить в истории», на шаг 2 — «Да, делай»): сторож держит главное —
// кадр видит только бесплатный аккаунт с известным статусом, только на рубежах 7/14/30, кадр не хранится и встаёт сразу за кадром серии.
import fs from 'node:fs';
import path from 'node:path';
import {
  isPlusOfferStoryId, PLUS_OFFER_STORY_ID_PREFIX, PLUS_OFFER_STREAK_DAYS, plusOfferSourceId, plusOfferStories,
} from '../modules/story_events/plus_offer_stories';
import { storyPlaybackQueue, type StoryEvent } from '../modules/story_events/story_events_core';
import { plusOfferTemplateFromPayload } from '../components/stories/templates/story_plus_offer_from_event';

const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const FREE = { accessResolved: true, hasPlus: false } as const;
const streak = (days: number, over: Partial<StoryEvent> = {}): StoryEvent => ({
  id: `streak:${days}:2026-11-10`, type: 'streak_milestone', payload: { days, dayKey: '2026-11-10' }, atMs: 1_000_000 + days, seen: false, ...over,
});
const rank: StoryEvent = { id: 'rank:6', type: 'coin_rank_up', payload: { toRank: 6 }, atMs: 999_000, seen: false };

describe('кому и когда показываем кадр-предложение Plus', () => {
  it('бесплатному на рубежах 7, 14 и 30 дней — по одному кадру на рубеж', () => {
    expect([...PLUS_OFFER_STREAK_DAYS].sort((a, b) => a - b)).toEqual([7, 14, 30]);
    const decision = plusOfferStories([rank, streak(7), streak(14), streak(30)], FREE);
    expect(decision.reason).toBe('added');
    expect(decision.offers.map((event) => event.payload.days)).toEqual([7, 14, 30]);
    expect(decision.offers.every((event) => event.type === 'plus_offer' && event.payload.kind === 'streak')).toBe(true);
  });

  it('на остальных рубежах серии и на чужих событиях кадра нет', () => {
    const decision = plusOfferStories([rank, streak(1), streak(3), streak(50), streak(100)], FREE);
    expect(decision).toEqual({ offers: [], reason: 'no_source' });
  });

  it('подписчику кадр не показывается', () => {
    expect(plusOfferStories([streak(7)], { accessResolved: true, hasPlus: true })).toEqual({ offers: [], reason: 'plus' });
  });

  it('пока статус подписки не известен — не показываем никому', () => {
    expect(plusOfferStories([streak(7)], { accessResolved: false, hasPlus: false })).toEqual({ offers: [], reason: 'access_unresolved' });
    expect(plusOfferStories([streak(7)], { accessResolved: false, hasPlus: true })).toEqual({ offers: [], reason: 'access_unresolved' });
  });

  it('мусор в числе дней кадра не даёт', () => {
    const bad = (days: unknown): StoryEvent => ({ ...streak(7), payload: { days: days as number } });
    for (const days of ['7 дней', Number.NaN, 7.9 + 100, -7, true]) {
      expect(plusOfferStories([bad(days)], FREE).offers).toHaveLength(0);
    }
  });
});

describe('кадр «диалоги без счётчика» — после второго пройденного диалога', () => {
  const dialog = (doneCount: number, over: Partial<StoryEvent> = {}): StoryEvent => ({
    id: `dialog_done:social_0${doneCount}:2026-11-10`, type: 'dialog_done', atMs: 2_000_000 + doneCount, seen: false,
    payload: { scenarioId: `social_0${doneCount}`, title: 'В кафе', dayKey: '2026-11-10', doneCount, bubbles: 'them:¿Para llevar?|me:Sí, gracias' }, ...over,
  });

  it('бесплатному — только после второго; первый, третий и остальные кадра не дают', () => {
    const decision = plusOfferStories([dialog(1), dialog(2), dialog(3), dialog(10)], FREE);
    expect(decision.offers).toHaveLength(1);
    expect(decision.offers[0]).toMatchObject({
      id: `${PLUS_OFFER_STORY_ID_PREFIX}dialog_done:social_02:2026-11-10`, type: 'plus_offer', seen: false,
      payload: { kind: 'dialog', bubbles: 'them:¿Para llevar?|me:Sí, gracias' },
    });
  });

  it('подписчику и при неизвестном статусе не показывается', () => {
    expect(plusOfferStories([dialog(2)], { accessResolved: true, hasPlus: true }).offers).toHaveLength(0);
    expect(plusOfferStories([dialog(2)], { accessResolved: false, hasPlus: false }).offers).toHaveLength(0);
  });

  it('данные события дают кадр с лимитом из правила приложения и репликами события', () => {
    const tpl = plusOfferTemplateFromPayload({ kind: 'dialog', bubbles: 'them:¿Para llevar?|me:Sí, gracias' }, 1);
    expect(tpl).toEqual({
      id: 'plus_dialog', repliesLimit: 30,
      bubbles: [{ me: false, text: '¿Para llevar?' }, { me: true, text: 'Sí, gracias' }],
    });
    // без реплик кадр всё равно честный: счётчик и текст
    expect(plusOfferTemplateFromPayload({ kind: 'dialog' }, 1)).toEqual({ id: 'plus_dialog', repliesLimit: 30, bubbles: [] });
  });
});

describe('кадр «итог недели на одной странице» — следом за историей недели', () => {
  const week: StoryEvent = {
    id: 'week_recap:2026-11-02', type: 'week_recap', atMs: 3_000_000, seen: false,
    payload: { startDayKey: '2026-11-02', dailyMinutes: '42,70,55,90,30,80,100', lessons: 5, coins: 1240, minutes: 467, streak: 7 },
  };

  it('бесплатному — один кадр на историю недели, со столбиками этой недели', () => {
    const { offers } = plusOfferStories([week], FREE);
    expect(offers).toHaveLength(1);
    expect(offers[0]).toMatchObject({
      id: `${PLUS_OFFER_STORY_ID_PREFIX}week_recap:2026-11-02`, type: 'plus_offer',
      payload: { kind: 'week', startDayKey: '2026-11-02', dailyMinutes: '42,70,55,90,30,80,100' },
    });
    expect(plusOfferStories([week], { accessResolved: true, hasPlus: true }).offers).toHaveLength(0);
  });

  it('данные события дают кадр недели: понедельник, воскресенье и семь столбиков', () => {
    const tpl = plusOfferTemplateFromPayload({ kind: 'week', startDayKey: '2026-11-02', dailyMinutes: '42,70,55,90,30,80,100' }, 1);
    expect(tpl).toMatchObject({ id: 'plus_week', dailyMinutes: [42, 70, 55, 90, 30, 80, 100] });
    if (tpl && tpl.id === 'plus_week') expect(tpl.endMs - tpl.startMs).toBe(6 * 86_400_000);
    // без понедельника недели кадра нет; мусор в столбиках отбрасывается
    expect(plusOfferTemplateFromPayload({ kind: 'week', dailyMinutes: '1,2,3' }, 1)).toBeNull();
    expect(plusOfferTemplateFromPayload({ kind: 'week', startDayKey: '2026-11-02', dailyMinutes: '5,x,-3,7' }, 1)).toMatchObject({ dailyMinutes: [5, 7] });
  });
});

describe('кадр не хранится и встаёт сразу за кадром серии', () => {
  it('id выводится из события серии, «просмотрено» зеркалит его', () => {
    const [offer] = plusOfferStories([streak(7, { seen: true })], FREE).offers;
    expect(offer?.id).toBe(`${PLUS_OFFER_STORY_ID_PREFIX}streak:7:2026-11-10`);
    expect(offer?.seen).toBe(true);
    expect(isPlusOfferStoryId(offer?.id ?? '')).toBe(true);
    expect(plusOfferSourceId(offer?.id ?? '')).toBe('streak:7:2026-11-10');
    expect(plusOfferSourceId('streak:7:2026-11-10')).toBeNull();
  });

  it('в очереди просмотра кадр идёт сразу после своего кадра серии', () => {
    const source = streak(7);
    const later: StoryEvent = { ...rank, id: 'rank:7', atMs: source.atMs + 5_000 };
    const { offers } = plusOfferStories([source, later], FREE);
    const queue = storyPlaybackQueue([later, ...offers, source, rank]).map((event) => event.id);
    expect(queue).toEqual(['rank:6', source.id, `${PLUS_OFFER_STORY_ID_PREFIX}${source.id}`, 'rank:7']);
  });

  it('просмотренная серия уносит предложение из очереди — отдельного «долга на показ» нет', () => {
    const { offers } = plusOfferStories([streak(7, { seen: true })], FREE);
    expect(storyPlaybackQueue(offers)).toHaveLength(0);
    const core = read('modules/story_events/story_events_core.ts');
    // тип есть в объединении, но в список сохраняемых на диск не входит
    expect(core).toContain("| 'week_recap' | 'plus_offer';");
    const persisted = core.slice(core.indexOf('const STORY_TYPES'), core.indexOf(']);', core.indexOf('const STORY_TYPES')));
    expect(persisted).not.toContain('plus_offer');
  });
});

describe('событие → кадр и подключение в ленту', () => {
  it('данные события дают кадр защиты серии с датой рубежа', () => {
    const tpl = plusOfferTemplateFromPayload({ kind: 'streak', days: 14, dayKey: '2026-11-10' }, 5);
    expect(tpl).toMatchObject({ id: 'plus_streak', days: 14 });
    expect(tpl && tpl.id === 'plus_streak' ? tpl.endMs : 0).toBeGreaterThan(5);
    expect(plusOfferTemplateFromPayload({ kind: 'streak', days: 7 }, 42)).toEqual({ id: 'plus_streak', days: 7, endMs: 42 });
  });

  it('непонятное событие кадра не даёт', () => {
    expect(plusOfferTemplateFromPayload({ kind: 'month', days: 7 }, 1)).toBeNull();
    expect(plusOfferTemplateFromPayload({ kind: 'streak', days: 0 }, 1)).toBeNull();
    expect(plusOfferTemplateFromPayload({ kind: 'streak', days: 'семь' }, 1)).toBeNull();
    expect(plusOfferTemplateFromPayload({}, 1)).toBeNull();
  });

  it('лента историй добавляет кадры по статусу из PremiumContext и пишет решение в журнал', () => {
    const hook = read('modules/story_events/use_story_events.ts');
    expect(hook).toContain('const { hasPremiumAccess, accessResolved } = usePremium();');
    expect(hook).toContain('plusOfferStories(snapshot.stories, { accessResolved, hasPlus: hasPremiumAccess })');
    expect(hook).toContain('...ladder.stories,...plusOffer.offers]');
    expect(hook).toContain("DebugLogger.info('[STORY-PLUS-OFFER]', `лента: решение=");
    expect(hook).toContain('void markStorySeenInStore(plusOfferSource ?? id);');
  });

  it('кадр серии открывает окно покупки с заголовком про серию; объявление Plus — как раньше', () => {
    const cta = read('components/stories/templates/use_story_cta_action.ts');
    expect(cta).toContain("const plusContext = ctx.source === 'plus_streak' ? 'streak' : 'generic';");
    expect(cta).toContain("openPremiumPaywall(router, { context: plusContext, source: 'story_announcement' });");
    expect(read('components/stories/templates/story_template_from_event.ts')).toContain("case 'plus_offer': return plusOfferTemplateFromPayload(p, event.atMs);");
  });
});
