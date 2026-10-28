// зачем (владелец 28.10 одобрил 36 шаблонов объявлений; формат согласован с Сайтом; координатор: опрос по образцу «Опросов Главной v2»):
// сторож контракта design-полей (каждое поле — только своему шаблону, значения из белых списков, старые объявления без изменений) и опроса
// (политика: на аккаунт — только answered и userId, вариант — только в счётчиках; подколлекция story_polls/{id}_{rev}/votes/{stableUid},
// которую находит удаление аккаунта общим запросом по 'votes' и полю userId).
import fs from 'node:fs';
import path from 'node:path';
import {
  ANNOUNCEMENT_ART_DEFAULTS, ANNOUNCEMENT_CTA_ACTIONS, ANNOUNCEMENT_DESIGNS, STORY_POLLS_COLLECTION, STORY_POLL_VOTES_SUBCOLLECTION,
  decideStoryPollVote, liveAnnouncements, normalizeAnnouncement, normalizeStoryPollVoteInput, storyPollDocId, storyPollPercents,
} from '../modules/story_events/story_announcements_contract';

const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const base = {
  templateId: 'editorial', badge: 'Новое', title: 'Заголовок', blocks: [{ text: 'Текст', size: 16, style: 'normal' }],
  titleSize: 34, align: 'center', decoration: false, lifetime: 3, unit: 'days', durationMs: 8000,
};

describe('объявления v1 — поле design и его поля', () => {
  it('36 шаблонов макета; старое объявление без design — как раньше, без лишних ключей', () => {
    expect(ANNOUNCEMENT_DESIGNS).toHaveLength(36);
    const old = normalizeAnnouncement(base);
    expect(Object.keys(old).sort()).toEqual(Object.keys(base).sort());
  });

  it('design принимается, неизвестный — отказ; поле чужого шаблона — field_not_for_design', () => {
    expect(normalizeAnnouncement({ ...base, design: 'quote' }).design).toBe('quote');
    expect(() => normalizeAnnouncement({ ...base, design: 'unknown' })).toThrow('invalid_option');
    expect(() => normalizeAnnouncement({ ...base, design: 'quote', eventAtMs: 1_800_000_000_000 })).toThrow('field_not_for_design');
    expect(() => normalizeAnnouncement({ ...base, design: 'cards', art: 'lessons' })).toThrow('field_not_for_design');
    expect(() => normalizeAnnouncement({ ...base, design: 'lessons', videoId: 'abc' })).toThrow('field_not_for_design');
    expect(() => normalizeAnnouncement({ ...base, design: 'plus', themeId: 'grad_full_titanium' })).toThrow('field_not_for_design');
    expect(() => normalizeAnnouncement({ ...base, cta: { action: 'open_plus' } })).toThrow('field_not_for_design');
  });

  it('значения — только из белых списков', () => {
    expect(normalizeAnnouncement({ ...base, design: 'date', eventAtMs: 1_798_675_200_000 }).eventAtMs).toBe(1_798_675_200_000);
    expect(() => normalizeAnnouncement({ ...base, design: 'date', eventAtMs: 12 })).toThrow('invalid_event_date');
    expect(normalizeAnnouncement({ ...base, design: 'lessons', art: 'home_scene_newbie' }).art).toBe('home_scene_newbie');
    expect(() => normalizeAnnouncement({ ...base, design: 'lessons', art: 'http://x' })).toThrow('invalid_option');
    expect(normalizeAnnouncement({ ...base, design: 'plus', cta: { action: 'open_plus' } }).cta).toEqual({ action: 'open_plus' });
    expect(() => normalizeAnnouncement({ ...base, design: 'plus', cta: { action: 'open_url' } })).toThrow('invalid_option');
    expect(() => normalizeAnnouncement({ ...base, design: 'plus', cta: { action: 'open_plus', url: 'x' } })).toThrow('invalid_cta');
    expect(() => normalizeAnnouncement({ ...base, design: 'video', videoId: 'a b' })).toThrow('invalid_video');
    expect(Object.keys(ANNOUNCEMENT_ART_DEFAULTS).sort()).toEqual(['ai', 'dialogs', 'exam', 'holiday', 'lessons', 'maintenance', 'mistakes', 'phrase']);
    expect(ANNOUNCEMENT_CTA_ACTIONS).toHaveLength(12);
  });

  it('опрос — от 2 до 4 вариантов (блоков)', () => {
    const blocks = (n: number) => Array.from({ length: n }, (_, i) => ({ text: `Вариант ${i + 1}`, size: 16, style: 'normal' }));
    expect(normalizeAnnouncement({ ...base, design: 'poll', blocks: blocks(3) }).design).toBe('poll');
    expect(() => normalizeAnnouncement({ ...base, design: 'poll', blocks: blocks(1) })).toThrow('invalid_poll_options');
  });

  it('лента отдаёт поля шаблона; старые сборки их не видят (берут только свои поля)', () => {
    const now = 1_800_000_000_000;
    const row = { ...base, design: 'date', eventAtMs: 1_798_675_200_000, id: 'a1', revision: 2, status: 'published', publishedAtMs: now - 1000, expiresAtMs: now + 1000 };
    const [live] = liveAnnouncements([row], now);
    expect(live).toMatchObject({ id: 'a1', design: 'date', eventAtMs: 1_798_675_200_000 });
  });
});

describe('объявления v1 — опрос (политика: вариант только в счётчиках)', () => {
  const poll = { options: ['A', 'B', 'C'], counts: { '0': 5, '2': 1 }, expiresAtMs: 2_000 };
  const input = { id: 'a1', revision: 2, option: 1 };

  it('голос: нет опроса / закрыт / вариант вне списка — отказ; уже отвечал — счётчики; иначе +1', () => {
    expect(decideStoryPollVote({ poll: null, vote: null, input, nowMs: 1_000 })).toMatchObject({ kind: 'reject', reason: 'poll_not_found' });
    expect(decideStoryPollVote({ poll, vote: null, input, nowMs: 3_000 })).toMatchObject({ kind: 'reject', reason: 'poll_closed' });
    expect(decideStoryPollVote({ poll, vote: null, input: { ...input, option: 3 }, nowMs: 1_000 })).toMatchObject({ kind: 'reject', reason: 'invalid_option' });
    expect(decideStoryPollVote({ poll, vote: { answered: true }, input, nowMs: 1_000 })).toEqual({ kind: 'already_answered', counts: [5, 0, 1], voteCount: 6 });
    expect(decideStoryPollVote({ poll, vote: null, input, nowMs: 1_000 })).toEqual({ kind: 'accept', counts: [5, 1, 1], voteCount: 7 });
  });

  it('проценты — целые, в сумме ровно 100; вход голоса проверяется', () => {
    expect(storyPollPercents([1, 1, 1])).toEqual([34, 33, 33]);
    expect(storyPollPercents([52, 31, 17])).toEqual([52, 31, 17]);
    expect(storyPollPercents([0, 0])).toEqual([0, 0]);
    expect(normalizeStoryPollVoteInput({ id: 'a1', revision: 2, option: 0 })).toEqual({ id: 'a1', revision: 2, option: 0 });
    expect(() => normalizeStoryPollVoteInput({ id: 'a1', revision: 0, option: 0 })).toThrow('invalid_vote');
    expect(() => normalizeStoryPollVoteInput({ id: 'a/1', revision: 1, option: 0 })).toThrow('invalid_vote');
  });

  it('СТОРОЖ: story_polls/{id}_{rev}/votes/{stableUid}, в голосе только userId и answered — без варианта; удаление аккаунта его находит', () => {
    expect(STORY_POLLS_COLLECTION).toBe('story_polls');
    expect(STORY_POLL_VOTES_SUBCOLLECTION).toBe('votes');
    expect(storyPollDocId('a1', 2)).toBe('a1_2');
    const vote = read('functions/src/story_poll_vote.ts');
    expect(vote).toContain('pollRef.collection(STORY_POLL_VOTES_SUBCOLLECTION).doc(stableUid)');
    expect(vote).toContain('transaction.set(voteRef, { userId: stableUid, answered: true, createdAtMs: nowMs }, { merge: true })');
    expect(vote).not.toMatch(/transaction\.set\(voteRef, \{[^}]*option/);
    const del = read('functions/src/account_delete.ts');
    expect(del).toContain("{ collectionGroup: 'votes', field: 'userId', values: 'stable' }");
    const publish = read('functions/src/story_announcements.ts');
    expect(publish).toContain('if (pollContent?.design === "poll")');
  });
});
