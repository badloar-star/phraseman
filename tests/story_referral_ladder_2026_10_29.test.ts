// story_referral_ladder_2026_10_29.test.ts — история лесенки приглашений: строка проекции → решение → событие → кадр → тексты на 9 языках.
// зачем (владелец 29.10 «автоматически, плюс история» и три «да»: строка «Ещё N друга — и Plus на 14 дней» с верной формой слова, у бессрочного
// Plus её нет; история приглашённому; одна история за последнего друга — монеты за всех): проверяем форму Ядра referralLastReward v1, окна
// показа (награда не старше 7 дней, 7 дней от первого показа), чужой аккаунт, выбор кадра, «1 друг / 2 друга» на всех 9 языках и подключение:
// мост в PremiumContext, кольцо у аватарки, просмотр по префиксу, запреты владельца в кадрах.
import fs from 'node:fs';
import path from 'node:path';
import type { Lang } from '../constants/i18n';
import { referralLadderOf, storyTemplateFromEvent } from '../components/stories/templates/story_template_from_event';
import { tplText } from '../components/stories/templates/story_template_strings';
import {
  ladderRewardKey, ladderStoryDecision, ladderStoryEventId, LADDER_STORY_ID_PREFIX, parseReferralLastReward, type LadderStoryInput,
} from '../modules/story_events/referral_ladder_story';

// подмены поднимаются выше импортов (jest hoist) — тот же набор, что в тесте шаблонов историй
jest.mock('react-native-reanimated', () => ({ useSharedValue: (value: number) => ({ value }) }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn() } }));
jest.mock('../app/achievements', () => ({ ALL_ACHIEVEMENTS: [] }));
jest.mock('../app/coin_rank_table_v1', () => ({ isValidCoinRank: () => false, coinRankRowForDisplay: () => ({ priceToReach: 0 }) }));
jest.mock('../components/spire/spire_tower_model', () => ({ SPIRE_TW: 390, SPIRE_TOWER_GEOM: { height: 900 } }));
jest.mock('../components/ThemeContext', () => ({ useTheme: () => ({}) }));
jest.mock('../constants/liquidGlassThemePalette', () => ({ liquidGlassTokens: () => ({}) }));

const LANGS: readonly Lang[] = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
/** Тексты склеивают число и слово неразрывным пробелом — для сравнения глазами заменяем его на обычный. */
const plain = (s: string): string => s.replace(/ /g, ' ');
const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 29, 12, 0, 0);
const OWNER = 'owner-a';
const raw = (over: Readonly<Record<string, unknown>> = {}): string =>
  JSON.stringify({ v: 1, kind: 'ladder', role: 'referrer', coins: 500, plusDays: 0, friendNumber: 2, atMs: NOW - DAY, ...over });
const input = (over: Partial<LadderStoryInput> = {}): LadderStoryInput => ({
  enabled: true, ladderEnabled: true, owner: OWNER, sourceUid: OWNER, raw: raw(), local: null, localLoaded: true, lifetime: false, nowMs: NOW, ...over,
});

describe('лесенка — строка Ядра referralLastReward v1', () => {
  it('верная строка → награда; номер друга целый и не меньше 0', () => {
    expect(parseReferralLastReward(raw({ friendNumber: 2.7 }))).toEqual({
      ok: true, reward: { role: 'referrer', coins: 500, plusDays: 0, friendNumber: 2, atMs: NOW - DAY },
    });
    expect(parseReferralLastReward(raw({ friendNumber: -3 }))).toMatchObject({ ok: true, reward: { friendNumber: 0 } });
    expect(parseReferralLastReward(raw({ friendNumber: undefined }))).toMatchObject({ ok: true, reward: { friendNumber: 0 } });
  });

  it('не та строка — причина в журнал, а не история', () => {
    expect(parseReferralLastReward(null)).toEqual({ ok: false, reason: 'absent' });
    expect(parseReferralLastReward('{')).toMatchObject({ ok: false, reason: expect.stringMatching(/^bad_json:/u) });
    expect(parseReferralLastReward('[]')).toEqual({ ok: false, reason: 'not_object' });
    expect(parseReferralLastReward(raw({ v: 2 }))).toEqual({ ok: false, reason: 'version:2' });
    expect(parseReferralLastReward(raw({ kind: 'contest' }))).toEqual({ ok: false, reason: 'kind:contest' });
    expect(parseReferralLastReward(raw({ role: 'friend' }))).toEqual({ ok: false, reason: 'role:friend' });
    expect(parseReferralLastReward(raw({ coins: 0 }))).toEqual({ ok: false, reason: 'coins:0' });
    expect(parseReferralLastReward(raw({ plusDays: -1 }))).toEqual({ ok: false, reason: 'plus_days:-1' });
    expect(parseReferralLastReward(raw({ atMs: 0 }))).toEqual({ ok: false, reason: 'at_ms' });
  });
});

describe('лесенка — показывать ли историю', () => {
  it('рубильники и аккаунт: историй нет, лесенка выключена, нет владельца, нет проекции, чужой аккаунт, поля нет, отметка грузится', () => {
    expect(ladderStoryDecision(input({ enabled: false }))).toEqual({ show: false, reason: 'stories_off' });
    expect(ladderStoryDecision(input({ ladderEnabled: false }))).toEqual({ show: false, reason: 'ladder_off' });
    expect(ladderStoryDecision(input({ owner: null }))).toEqual({ show: false, reason: 'no_owner' });
    expect(ladderStoryDecision(input({ sourceUid: null }))).toEqual({ show: false, reason: 'no_projection' });
    expect(ladderStoryDecision(input({ sourceUid: 'owner-b' }))).toEqual({ show: false, reason: 'other_account' });
    expect(ladderStoryDecision(input({ raw: null }))).toEqual({ show: false, reason: 'absent' });
    expect(ladderStoryDecision(input({ localLoaded: false }))).toEqual({ show: false, reason: 'loading' });
  });

  it('свежая награда — первый показ: событие referral_ladder с полями для кадра; бессрочный Plus виден в событии', () => {
    const decision = ladderStoryDecision(input({ lifetime: true }));
    expect(decision).toMatchObject({ show: true, firstShow: true, key: `referrer:2:${NOW - DAY}` });
    if (!decision.show) throw new Error('история должна быть');
    expect(decision.event).toMatchObject({
      id: `${LADDER_STORY_ID_PREFIX}referrer:2:${NOW - DAY}`, type: 'referral_ladder', atMs: NOW, seen: false,
      payload: { role: 'referrer', coins: 500, plusDays: 0, friendNumber: 2, atMs: NOW - DAY, lifetime: true },
    });
  });

  it('окна: награда старше 7 дней — не начинаем; показанная живёт 7 дней от первого показа и помнит просмотр', () => {
    const oldAt = NOW - 8 * DAY;
    expect(ladderStoryDecision(input({ raw: raw({ atMs: oldAt }) }))).toEqual({ show: false, reason: 'too_old' });
    const key = ladderRewardKey({ role: 'referrer', coins: 500, plusDays: 0, friendNumber: 2, atMs: oldAt });
    expect(ladderStoryDecision(input({ raw: raw({ atMs: oldAt }), local: { key, firstShownAtMs: NOW - 2 * DAY, seen: true } })))
      .toMatchObject({ show: true, firstShow: false, event: { atMs: NOW - 2 * DAY, seen: true } });
    expect(ladderStoryDecision(input({ raw: raw({ atMs: oldAt }), local: { key, firstShownAtMs: oldAt, seen: false } })))
      .toEqual({ show: false, reason: 'expired' });
  });

  it('следующий друг — новая награда и новая история с первым показом; прошлая отметка не мешает', () => {
    const previous = { key: `referrer:1:${NOW - 3 * DAY}`, firstShownAtMs: NOW - 3 * DAY, seen: true };
    expect(ladderStoryDecision(input({ local: previous }))).toMatchObject({ show: true, firstShow: true, event: { atMs: NOW, seen: false } });
    expect(ladderStoryEventId('referrer:2:1')).toBe('referral_ladder:referrer:2:1');
  });
});

describe('лесенка — событие → кадр', () => {
  it('приглашённый — кадр «тебя пригласили», монеты за него; номер друга не важен', () => {
    expect(referralLadderOf({ role: 'referee', coins: 500, plusDays: 0, friendNumber: 7 })).toEqual({ id: 'ladder_invited', coins: 500 });
  });

  it('пригласивший: друг с Plus — кадр Plus (друзей не меньше трёх); 1-й, 2-й, 4-й — кадр монет с «ещё N»', () => {
    expect(referralLadderOf({ role: 'referrer', coins: 500, plusDays: 14, friendNumber: 3 })).toEqual({ id: 'ladder_plus', coins: 500, friends: 3, plusDays: 14 });
    expect(referralLadderOf({ role: 'referrer', coins: 500, plusDays: 14, friendNumber: 0 })).toEqual({ id: 'ladder_plus', coins: 500, friends: 3, plusDays: 14 });
    expect(referralLadderOf({ role: 'referrer', coins: 500, plusDays: 0, friendNumber: 1 })).toEqual({ id: 'ladder_friend', coins: 500, friendsLeft: 2, plusDays: 14 });
    expect(referralLadderOf({ role: 'referrer', coins: 500, plusDays: 0, friendNumber: 2 })).toEqual({ id: 'ladder_friend', coins: 500, friendsLeft: 1, plusDays: 14 });
    expect(referralLadderOf({ role: 'referrer', coins: 500, plusDays: 0, friendNumber: 4 })).toEqual({ id: 'ladder_friend', coins: 500, friendsLeft: 2, plusDays: 14 });
  });

  it('строки «ещё N — и Plus» нет: бессрочный Plus, взятая ступень, неизвестный номер друга', () => {
    expect(referralLadderOf({ role: 'referrer', coins: 500, plusDays: 0, friendNumber: 2, lifetime: true })).toMatchObject({ id: 'ladder_friend', friendsLeft: null });
    expect(referralLadderOf({ role: 'referrer', coins: 500, plusDays: 0, friendNumber: 6 })).toMatchObject({ id: 'ladder_friend', friendsLeft: null });
    expect(referralLadderOf({ role: 'referrer', coins: 500, plusDays: 0, friendNumber: 0 })).toMatchObject({ id: 'ladder_friend', friendsLeft: null });
  });

  it('без монет или без роли кадра нет — награду не выдумываем; тип referral_ladder ведёт в кадр', () => {
    expect(referralLadderOf({ role: 'referrer', coins: 0, plusDays: 0, friendNumber: 1 })).toBeNull();
    expect(referralLadderOf({ role: 'friend', coins: 500 })).toBeNull();
    expect(storyTemplateFromEvent({ type: 'referral_ladder', payload: { role: 'referee', coins: 500, plusDays: 0, friendNumber: 1 }, atMs: NOW }))
      .toEqual({ id: 'ladder_invited', coins: 500 });
  });
});

describe('лесенка — тексты', () => {
  // зачем (владелец 29.10): «Ещё 1 друг — и Plus на 14 дней» — форма слова своя у каждого числа и языка
  const NEXT_PLUS: Readonly<Record<string, readonly [string, string]>> = {
    ru: ['Ещё 1 друг — и Plus на 14 дней.', 'Ещё 2 друга — и Plus на 14 дней.'],
    uk: ['Ще 1 друг — і Plus на 14 днів.', 'Ще 2 друзі — і Plus на 14 днів.'],
    en: ['1 more friend and you get Plus for 14 days.', '2 more friends and you get Plus for 14 days.'],
    es: ['1 amigo más y tendrás Plus por 14 días.', '2 amigos más y tendrás Plus por 14 días.'],
    'pt-BR': ['Mais 1 amigo e você ganha Plus por 14 dias.', 'Mais 2 amigos e você ganha Plus por 14 dias.'],
    vi: ['Thêm 1 bạn nữa là có Plus 14 ngày.', 'Thêm 2 bạn nữa là có Plus 14 ngày.'],
    id: ['1 teman lagi — dan kamu dapat Plus 14 hari.', '2 teman lagi — dan kamu dapat Plus 14 hari.'],
    tr: ['1 arkadaş daha — 14 gün Plus senin.', '2 arkadaş daha — 14 gün Plus senin.'],
    pl: ['Jeszcze 1 znajomy — i Plus na 14 dni.', 'Jeszcze 2 znajomych — i Plus na 14 dni.'],
  };

  it.each(LANGS)('%s: «ещё 1» и «ещё 2» — каждое со своей формой слова', (lang) => {
    expect(plain(tplText(lang, 'ladderNextPlus', { friends: 1, plusDays: 14 }))).toBe(NEXT_PLUS[lang]![0]);
    expect(plain(tplText(lang, 'ladderNextPlus', { friends: 2, plusDays: 14 }))).toBe(NEXT_PLUS[lang]![1]);
  });

  it('заголовок кадра Plus: «3 друга прошли первый урок» — форма слова вместе с глаголом', () => {
    expect(plain(tplText('ru', 'ladderPlusTitle', { passed: 3 }))).toBe('3 друга прошли первый урок');
    expect(plain(tplText('uk', 'ladderPlusTitle', { passed: 3 }))).toBe('3 друзі пройшли перший урок');
    expect(plain(tplText('en', 'ladderPlusTitle', { passed: 3 }))).toBe('3 friends finished the first lesson');
    expect(plain(tplText('vi', 'ladderPlusTitle', { passed: 3 }))).toBe('3 người bạn đã học xong bài đầu tiên');
  });

  it('правки Переводчика 29.10: vi «bạn của bạn» вместо «bạn bè», id «— dan kamu», es «completada», uk «який тебе запросив»', () => {
    expect(tplText('vi', 'ladderFriendTitle')).toBe('Bạn của bạn đã học xong bài đầu tiên');
    expect(tplText('vi', 'ladderCoinsText', { coins: 500 })).toContain('cho bạn và bạn của bạn.');
    expect(tplText('vi', 'ladderPlusText', { coins: 500, plusDays: 14 })).toContain('cho bạn và bạn của bạn.');
    for (const key of ['ladderFriendTitle', 'ladderCoinsText', 'ladderPlusText', 'ladderPlusTitle'] as const) {
      expect(tplText('vi', key, { coins: 500, passed: 3, plusDays: 14 })).not.toContain('bạn bè');
    }
    expect(tplText('es', 'ladderInvitedTitle')).toBe('Primera lección completada');
    expect(tplText('uk', 'ladderInvitedText', { coins: 500 })).toContain('тобі й другові, який тебе запросив.');
  });

  it('все тексты лесенки на всех языках — непустые и без «{…}»-хвостов', () => {
    const keys = [
      'ladderOverline', 'ladderCoinsWord', 'ladderCoinsLabel', 'ladderFriendTitle', 'ladderCoinsText', 'ladderNextPlus', 'ladderPlusDaysWord',
      'ladderPlusLabel', 'ladderPlusTitle', 'ladderPlusText', 'ladderInvitedOverline', 'ladderInvitedTitle', 'ladderInvitedText',
    ] as const;
    for (const lang of LANGS) {
      for (const key of keys) {
        const text = tplText(lang, key, { coins: 500, friends: 2, passed: 3, plusDays: 14 });
        expect({ lang, key, text: text.trim().length > 0 && !/[{}]/u.test(text) }).toEqual({ lang, key, text: true });
      }
    }
  });
});

describe('лесенка — подключение и запреты владельца', () => {
  it('мост: PremiumContext передаёт строку проекции в историю лесенки рядом с историей победителю', () => {
    const src = read('components/PremiumContext.tsx');
    expect(src).toContain("import { publishReferralLastReward } from '../modules/story_events/referral_ladder_store';");
    expect(src).toContain('publishReferralLastReward(listenerStableId, data?.referralLastReward);');
  });

  it('кольцо у аватарки: история лесенки в общем списке, просмотр — по префиксу referral_ladder:', () => {
    const ring = read('modules/story_events/use_story_events.ts');
    expect(ring).toContain('const ladder = useReferralLadderStory(snapshot.enabled);');
    expect(ring).toContain('...ladder.stories');
    expect(ring).toContain('else if (id.startsWith(LADDER_STORY_ID_PREFIX)) markLadderSeen(id);');
    const hook = read('modules/story_events/use_referral_ladder_story.ts');
    expect(hook).toContain('const ladderEnabled = useReferralLadderEnabled();');
    expect(hook).toContain('lifetime: isPro');
    expect(LADDER_STORY_ID_PREFIX).toBe('referral_ladder:');
  });

  it('кадры лесенки и общий диск: без обводок, обрезки строк и ужатия шрифта', () => {
    for (const rel of ['components/stories/templates/frames_ladder.tsx', 'components/stories/templates/story_disc.tsx']) {
      expect({ rel, banned: read(rel).match(/borderWidth|borderColor|numberOfLines|adjustsFontSizeToFit/gu) ?? [] }).toEqual({ rel, banned: [] });
    }
  });
});
