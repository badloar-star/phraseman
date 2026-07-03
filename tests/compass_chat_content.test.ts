import {
  buildLeagueCompassDailyPrompt,
  COMPASS_CHAT_LANGS,
  getDaySeed,
  hasForbiddenDailyLabel,
  hasForbiddenProgressSummaryClaim,
  normalizeGeneratedCompassPost,
  pickCompassPostForDay,
  type CompassChatLang,
} from '../functions/src/compass_chat_content';

const ALL_LANGS = COMPASS_CHAT_LANGS as readonly CompassChatLang[];

const localized = (text: string) => ALL_LANGS.reduce((acc, lang) => {
  acc[lang] = `${text} (${lang})`;
  return acc;
}, {} as Record<CompassChatLang, string>);

function assertFullyLocalized(map: Partial<Record<CompassChatLang, string>>): void {
  for (const lang of ALL_LANGS) {
    const value = map[lang];
    expect(typeof value === 'string' && value.length > 0).toBe(true);
  }
}

describe('compass_chat_content', () => {
  it('getDaySeed is deterministic for one UTC date and increments by one per UTC day', () => {
    const day1 = new Date(Date.UTC(2026, 5, 28, 9, 0, 0));
    const day1Late = new Date(Date.UTC(2026, 5, 28, 23, 59, 0));
    const day2 = new Date(Date.UTC(2026, 5, 29, 1, 0, 0));
    expect(getDaySeed(day1)).toBe(getDaySeed(day1Late));
    expect(getDaySeed(day2)).toBe(getDaySeed(day1) + 1);
  });

  it('fallback post selection is deterministic for one seed', () => {
    const a = pickCompassPostForDay(100);
    const b = pickCompassPostForDay(100);
    expect(a).toEqual(b);
  });

  it('fallback post selection does not repeat the same weekday every week', () => {
    const mondaySeed = getDaySeed(new Date(Date.UTC(2026, 5, 29, 9, 0, 0)));
    for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
      const thisWeek = pickCompassPostForDay(mondaySeed + dayOffset);
      const nextWeek = pickCompassPostForDay(mondaySeed + dayOffset + 7);
      expect(nextWeek.i18n.ru).not.toBe(thisWeek.i18n.ru);
    }
  });

  it('fallback rotation contains varied conversation formats and never says word/phrase of day', () => {
    const kinds = new Set<string>();
    for (let seed = 0; seed < 14; seed += 1) {
      const post = pickCompassPostForDay(seed);
      kinds.add(post.kind);
      assertFullyLocalized(post.i18n);
      expect(Object.values(post.i18n).some(hasForbiddenDailyLabel)).toBe(false);
      if (post.poll) {
        expect(post.kind).toBe('poll');
        expect(post.poll.length).toBeGreaterThanOrEqual(2);
        expect(new Set(post.poll.map((option) => option.key)).size).toBe(post.poll.length);
        for (const option of post.poll) assertFullyLocalized(option.label);
      }
    }
    expect([...kinds]).toEqual(expect.arrayContaining(['discussion', 'language_fact', 'mini_challenge', 'poll']));
  });

  it('prompt is explicit about one daily league-chat post and the Daily Phrase conflict', () => {
    const prompt = buildLeagueCompassDailyPrompt({ dayKey: '2026-06-29', seed: 123 });
    expect(prompt).toContain('write ONE fresh system post');
    expect(prompt).toContain('Daily Phrase');
    expect(prompt).toContain('Do not use the labels');
    expect(prompt).toContain('NEVER write progress summaries');
    expect(prompt).toContain('NEVER include learner names');
    for (const lang of ALL_LANGS) expect(prompt).toContain(`"${lang}"`);
  });
});

describe('normalizeGeneratedCompassPost', () => {
  it('accepts a fully localized generated discussion post', () => {
    const post = normalizeGeneratedCompassPost({
      kind: 'discussion',
      i18n: localized('Compass asks: what English phrase feels most useful today? Write one small answer'),
    });
    expect(post).not.toBeNull();
    expect(post!.kind).toBe('discussion');
    assertFullyLocalized(post!.i18n);
  });

  it('accepts poll JSON wrapped in text, with localized option labels', () => {
    const raw = `Here is JSON:
{
  "kind": "poll",
  "i18n": ${JSON.stringify(localized('Compass poll: what blocks your speaking most? Pick one honest answer'))},
  "poll": [
    { "key": "pronunciation", "label": ${JSON.stringify(localized('Pronunciation'))} },
    { "key": "shyness", "label": ${JSON.stringify(localized('Shyness'))} }
  ]
}`;
    const post = normalizeGeneratedCompassPost(raw);
    expect(post).not.toBeNull();
    expect(post!.kind).toBe('poll');
    expect(post!.poll).toHaveLength(2);
  });

  it('rejects generated content that collides with the home Daily Phrase naming', () => {
    const post = normalizeGeneratedCompassPost({
      kind: 'discussion',
      i18n: {
        ...localized('Compass asks: what phrase would you use today?'),
        ru: 'Фраза дня — write one sentence in English.',
      },
    });
    expect(post).toBeNull();
  });

  it('rejects generated progress summaries that would repeat fake weekly achievement copy', () => {
    const badText = 'Заглянул в ваши успехи за сегодня: вперёд продвинулись Александр и Анастасия. Если вы пока нет — день ещё не кончился, я подожду.';
    expect(hasForbiddenProgressSummaryClaim(badText)).toBe(true);
    expect(normalizeGeneratedCompassPost({
      kind: 'discussion',
      i18n: {
        ...localized('Compass asks: what tiny English sentence feels useful today?'),
        ru: badText,
      },
    })).toBeNull();
  });

  it('rejects incomplete localization and malformed polls', () => {
    expect(normalizeGeneratedCompassPost({ kind: 'discussion', i18n: { ru: 'Only Russian text is not enough' } })).toBeNull();
    expect(normalizeGeneratedCompassPost({
      kind: 'poll',
      i18n: localized('Compass poll: choose one answer for speaking practice today'),
      poll: [{ key: 'a', label: localized('Only one option') }],
    })).toBeNull();
  });
});
