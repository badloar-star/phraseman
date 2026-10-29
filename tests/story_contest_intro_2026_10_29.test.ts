// ═══════════════════════════════════════════════════════════════════════════
// story_contest_intro_2026_10_29.test.ts — анонс конкурса «Набор месяца» в наборе историй.
//
// зачем (владелец 29.10: «Да, делать в коде», макет claude.ai/artifact/GukYuSACfWas4P9toiG7sS v2): 4 кадра после 23 кадров макета историй,
// числа — правила владельца (голосовать через 3 дня и после 1 урока, до 10 голосов в месяц; Plus на 3 / 2 / 1 месяц за места; 500 монет обоим
// за друга с первым уроком, за 3 друзей — Plus, дни пока 7 с TODO), русские тексты — слово в слово из макета, кнопка «Открыть наборы» и строка
// про спонсоров — на последнем кадре. Ничего не публикуется — проверяем шаблон.
// ═══════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { act, renderHook } from '@testing-library/react-native';
import { contestIntroOf, storyTemplateFromEvent } from '../components/stories/templates/story_template_from_event';
import {
  STORY_ALL_TEMPLATE_IDS, STORY_CONTEST_RULES, STORY_CONTEST_TEMPLATE_IDS, STORY_TEMPLATE_CTA, STORY_TEMPLATE_IDS, STORY_TEMPLATE_SAMPLES, studioStartIndex,
} from '../components/stories/templates/story_template_registry';
import { tplText } from '../components/stories/templates/story_template_strings';
import { useStoryCtaAction } from '../components/stories/templates/use_story_cta_action';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, replace: jest.fn() }) }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn() } }));
jest.mock('../app/achievements', () => ({ ALL_ACHIEVEMENTS: [] }));
jest.mock('../app/coin_rank_table_v1', () => ({ isValidCoinRank: () => false, coinRankRowForDisplay: () => ({ priceToReach: 0 }) }));
jest.mock('../components/ThemeContext', () => ({ useTheme: () => ({ liquidGlassThemeId: null, setLiquidGlassThemeId: jest.fn() }) }));
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn(() => Promise.resolve()) }));
jest.mock('../app/premium_theme_entitlements', () => ({ isPremiumThemeUnlocked: () => false }));

const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const plain = (s: string): string => s.replace(/ /g, ' ');
const ru = (key: Parameters<typeof tplText>[1], vars?: Parameters<typeof tplText>[2]): string => plain(tplText('ru', key, vars));

describe('анонс «Набор месяца» — реестр', () => {
  it('23 кадра макета историй не тронуты, за ними 4 кадра анонса (в фотостудии 24–27)', () => {
    expect(STORY_TEMPLATE_IDS).toHaveLength(23);
    expect(STORY_CONTEST_TEMPLATE_IDS).toEqual(['contest_start', 'contest_vote', 'contest_prizes', 'contest_invite']);
    expect(STORY_ALL_TEMPLATE_IDS.slice(0, 23)).toEqual([...STORY_TEMPLATE_IDS]);
    expect(STORY_ALL_TEMPLATE_IDS.slice(23)).toEqual([...STORY_CONTEST_TEMPLATE_IDS]);
    for (const id of STORY_CONTEST_TEMPLATE_IDS) expect(STORY_TEMPLATE_SAMPLES[id].id).toBe(id);
    expect(studioStartIndex('24')).toBe(23);
    expect(studioStartIndex('contest_invite')).toBe(26);
  });

  it('числа — правила владельца 29.10, за 3 друзей — Plus на 14 дней (утверждено, без TODO)', () => {
    expect(STORY_CONTEST_RULES).toEqual({ minDays: 3, minLessons: 1, votesPerMonth: 10, plusMonths: [3, 2, 1], inviteCoins: 500, inviteFriends: 3, invitePlusDays: 14 });
    expect(read('components/stories/templates/story_template_registry.ts')).not.toContain('TODO(владелец)');
  });

  it('кнопка «Открыть наборы» и строка про спонсоров — только у последнего кадра', () => {
    expect(STORY_TEMPLATE_CTA.contest_invite).toEqual({ action: 'open_packs', label: 'ctaOpenPacks', icon: 'layers', fine: 'contestSponsors' });
    expect(STORY_TEMPLATE_CTA.contest_start).toBeUndefined();
    expect(STORY_TEMPLATE_CTA.contest_vote).toBeUndefined();
    expect(STORY_TEMPLATE_CTA.contest_prizes).toBeUndefined();
  });
});

describe('анонс «Набор месяца» — тексты макета v2 (ru слово в слово)', () => {
  it('кадр 1: старт каждый месяц', () => {
    expect(ru('contestOverline')).toBe('Набор месяца');
    expect(ru('contestStartTitle', { date: '1 ноября' })).toBe('С 1 ноября — конкурс наборов каждый месяц');
    expect(ru('contestStartText')).toBe('Сделай набор карточек. Три набора с самым большим числом голосов за месяц получают Plus.');
    expect(ru('contestCards', { cards: 126 })).toBe('126 карточек');
  });

  it('кадр 2: голос — ♥, три числа с формами слов', () => {
    expect(ru('contestVoteOverline')).toBe('Как голосовать');
    expect(ru('contestVoteTitle')).toBe('Голос — это ♥ на наборе');
    expect(ru('contestVoteDays', { days: 3 })).toBe('дня в приложении');
    expect(ru('contestVoteLessons', { done: 1 })).toBe('пройденный урок');
    expect(ru('contestVoteVotes', { votes: 10 })).toBe('голосов в месяц');
    expect(ru('contestVoteText')).toBe('За свой набор голосовать нельзя. Участвуют наборы, созданные в этом месяце.');
  });

  it('кадр 3: итоги 1 числа, Plus на 3 / 2 / 1 месяц', () => {
    expect(ru('contestPrizesOverline')).toBe('Призы за места');
    expect(ru('contestPrizesTitle')).toBe('Итоги — 1 числа каждого месяца');
    expect(ru('contestPrizesText')).toBe('Plus включается сам. Победителю придёт своя история.');
    expect(ru('contestPlace', { place: 1 })).toBe('1 место');
    expect([3, 2, 1].map((months) => ru('contestPlusMonths', { months }))).toEqual(['3 месяца', '2 месяца', '1 месяц']);
    expect(plain(tplText('en', 'contestPlusMonths', { months: 1 }))).toBe('1 month');
  });

  it('кадр 4: 500 монет тебе и другу, 3 друга прошли урок — Plus на 14 дней; кнопка и строка про спонсоров', () => {
    expect(ru('contestInviteOverline')).toBe('Зови друзей');
    expect(ru('contestInviteTitle', { coins: 500 })).toBe('500 монет тебе и другу');
    expect(ru('contestInviteText')).toBe('Монеты придут, когда друг пройдёт первый урок.');
    expect(ru('contestInviteOne')).toBe('друг прошёл урок');
    expect(ru('contestInviteOneReward', { coins: 500 })).toBe('500 монет обоим');
    expect(ru('contestInviteThree', { friends: 3 })).toBe('друга прошли урок');
    expect(ru('contestInviteThreeReward', { plusDays: 14 })).toBe('Plus на 14 дней');
    expect(ru('ctaOpenPacks')).toBe('Открыть наборы');
    expect(ru('contestSponsors')).toBe('Apple и Google не спонсоры конкурса.');
  });
});

describe('анонс «Набор месяца» — событие → кадр', () => {
  const at = Date.UTC(2026, 10, 1, 9);

  it('шаг события выбирает кадр; без чисел — правила владельца', () => {
    expect(contestIntroOf({ step: 'start' }, at)).toEqual({ id: 'contest_start', startMs: at });
    expect(contestIntroOf({ step: 'vote' }, at)).toEqual({ id: 'contest_vote', minDays: 3, minLessons: 1, votesPerMonth: 10 });
    expect(contestIntroOf({ step: 'prizes' }, at)).toEqual({ id: 'contest_prizes', plusMonths: [3, 2, 1] });
    expect(contestIntroOf({ step: 'invite' }, at)).toEqual({ id: 'contest_invite', coins: 500, friends: 3, plusDays: 14 });
    expect(contestIntroOf({ step: 'другое' }, at)).toBeNull();
  });

  it('сервер может прислать свои числа; неверные (0, минус, текст, не три места) — правила', () => {
    expect(contestIntroOf({ step: 'start', startMs: 5 }, at)).toEqual({ id: 'contest_start', startMs: 5 });
    expect(contestIntroOf({ step: 'invite', plusDays: 30 }, at)).toMatchObject({ plusDays: 30 });
    expect(contestIntroOf({ step: 'vote', minDays: 0, votesPerMonth: -2, minLessons: 'x' }, at)).toEqual({ id: 'contest_vote', minDays: 3, minLessons: 1, votesPerMonth: 10 });
    expect(contestIntroOf({ step: 'prizes', plusMonths: '6,3,1' }, at)).toEqual({ id: 'contest_prizes', plusMonths: [6, 3, 1] });
    expect(contestIntroOf({ step: 'prizes', plusMonths: '1,2' }, at)).toEqual({ id: 'contest_prizes', plusMonths: [3, 2, 1] });
  });

  it('тип события contest_intro и метка фотостудии ведут к тем же кадрам', () => {
    expect(storyTemplateFromEvent({ type: 'contest_intro', payload: { step: 'vote' }, atMs: at })).toMatchObject({ id: 'contest_vote' });
    expect(storyTemplateFromEvent({ type: 'achievement', payload: { studioTemplate: 'contest_prizes' }, atMs: at }, true)).toEqual(STORY_TEMPLATE_SAMPLES.contest_prizes);
  });
});

describe('анонс «Набор месяца» — показ и кнопка', () => {
  it('просмотр рисует 4 кадра анонса, строка про спонсоров — под кнопкой', () => {
    const slide = read('components/stories/templates/StoryTemplateSlide.tsx');
    for (const id of STORY_CONTEST_TEMPLATE_IDS) expect(slide).toContain(`case '${id}':`);
    const chrome = read('components/stories/templates/story_viewer_chrome.tsx');
    expect(chrome).toContain('{cta.fine ? (');
    expect(chrome).toContain('tplText(lang, cta.fine)');
  });

  it('«Открыть наборы» закрывает историю и открывает каталог наборов; в фотостудии перехода нет', async () => {
    const cta = STORY_TEMPLATE_CTA.contest_invite!;
    const closeViewer = jest.fn();
    const { result } = await renderHook(() => useStoryCtaAction('ru', false, closeViewer));
    await act(async () => { result.current(cta, { source: 'contest_invite', themeId: null }); });
    expect(closeViewer).toHaveBeenCalledWith('cta_open_packs');
    expect(mockPush).toHaveBeenCalledWith('/flashcards_packs');

    mockPush.mockReset();
    const studio = await renderHook(() => useStoryCtaAction('ru', true, jest.fn()));
    await act(async () => { studio.result.current(cta, { source: 'contest_invite', themeId: null }); });
    expect(mockPush).not.toHaveBeenCalled();
  });
});
