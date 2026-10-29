// ═══════════════════════════════════════════════════════════════════════════
// story_contest_winner_2026_10_29.test.tsx — история победителю «Набор месяца» в наборе историй (кадр 28 фотостудии).
//
// зачем (владелец 29.10 утвердил историю; координатор: «шаблон в наборе историй, склонения месяцев на 9 языков, тесты»; форма — Ядро 29.10):
// данные — поле contest_last_win (ContestWinStory v1: monthId, place, plusMonths, packId, packTitle, hearts, grantedAtMs); ru — слово в слово из
// макета v4; plusMonths 0 (бессрочный Plus, продлевать нечего) — кадр без строки про Plus; месяц — своя таблица, не Intl. Ничего не публикуется.
// ═══════════════════════════════════════════════════════════════════════════
/* eslint-disable import/first -- зачем: __DEV__ задаём до импортов: модули цепочки (constants/i18n) читают его при загрузке */
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import type { Lang } from '../constants/i18n';
import { ContestWinnerFrame } from '../components/stories/templates/frames_contest';
import { contestWinnerOf, storyTemplateFromEvent } from '../components/stories/templates/story_template_from_event';
import {
  STORY_ALL_TEMPLATE_IDS, STORY_CONTEST_RULES, STORY_CONTEST_WINNER_TEMPLATE_IDS, STORY_TEMPLATE_CTA, STORY_TEMPLATE_SAMPLES,
  studioEvents, studioStartIndex, type StoryTemplateOf,
} from '../components/stories/templates/story_template_registry';
import { tplMonthIn, tplText } from '../components/stories/templates/story_template_strings';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {}, absoluteFillObject: {} },
  Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
}));
jest.mock('react-native-svg', () => ({
  __esModule: true, default: 'Svg', Circle: 'Circle', Defs: 'Defs', LinearGradient: 'LinearGradient', Stop: 'Stop',
  Ellipse: 'Ellipse', G: 'G', ClipPath: 'ClipPath', Path: 'Path', RadialGradient: 'RadialGradient', Rect: 'Rect',
}));
jest.mock('react-native-reanimated', () => {
  const R = jest.requireActual('react');
  const View = (props: Record<string, unknown>) => R.createElement('View', props, props.children);
  const Text = (props: Record<string, unknown>) => R.createElement('Text', props, props.children);
  return {
    __esModule: true,
    default: { View, Text, createAnimatedComponent: (c: unknown) => c },
    runOnJS: (fn: unknown) => fn,
    useAnimatedReaction: () => undefined,
    useAnimatedProps: (fn: () => unknown) => fn(),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useSharedValue: (v: number) => ({ value: v }),
  };
});
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: 'Ionicons' }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn() } }));
jest.mock('../app/achievements', () => ({ ALL_ACHIEVEMENTS: [] }));
jest.mock('../app/coin_rank_table_v1', () => ({ isValidCoinRank: () => false, coinRankRowForDisplay: () => ({ priceToReach: 0 }) }));
jest.mock('../components/SafeLinearGradient', () => ({ LinearGradient: 'LinearGradient' }));
// зачем: кадр берёт токены темы через свою палитру; в тесте — токены тёмной темы из теста просмотра историй, без ThemeContext и диска
jest.mock('../components/stories/templates/story_template_palette', () => {
  const pal = {
    bgTop: '#16241F', bgMid: '#0E1214', bgBot: '#0A0E10', tx: '#FFFFFF', sec: '#B8C0C4', mu: '#8A9296', acc: '#7EF0C8', accG: '#3FD9A6', accB: '#9FF5D8',
    accInk: '#06231A', accSoft: '#1D3A31', accGlow: '#3FD9A655', card: '#1B2123', ctl: '#2A3234', cta: '#FFFFFF', ctaInk: '#0E1214', shTint: '#000000',
    isLight: false, mediaScrim: '#080A0ED1', mediaInk: '#FFFFFF',
  };
  return { useStoryTemplatePalette: () => pal, storyTemplatePalette: () => pal, mix: (c: string, a: number) => `${c}@${a}` };
});

const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const plain = (s: string): string => s.replace(/ /g, ' ');
const ru = (key: Parameters<typeof tplText>[1], vars?: Parameters<typeof tplText>[2]): string => plain(tplText('ru', key, vars));
const LANGS: readonly Lang[] = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

/** Строка поля contest_last_win ровно как её пишет Ядро (contestWinStoryValue, functions/src/community_month_tally.ts). */
const coreField = (over: Readonly<Record<string, unknown>> = {}): Record<string, unknown> =>
  JSON.parse(JSON.stringify({ v: 1, monthId: '2026-11', place: 2, plusMonths: 2, packId: 'p1', packTitle: 'B2 глаголы', hearts: 35, grantedAtMs: 123, ...over }));

describe('история победителю — реестр и фотостудия', () => {
  it('один кадр после 23 кадров макета и 4 кадров анонса — в фотостудии 28-й; кнопки нет (как в макете)', () => {
    expect(STORY_CONTEST_WINNER_TEMPLATE_IDS).toEqual(['contest_winner']);
    expect(STORY_ALL_TEMPLATE_IDS).toHaveLength(28);
    expect(STORY_ALL_TEMPLATE_IDS[27]).toBe('contest_winner');
    expect(studioStartIndex('28')).toBe(27);
    expect(studioStartIndex('contest_winner')).toBe(27);
    expect(studioStartIndex('29')).toBe(0);
    expect(studioEvents(1)[27]).toMatchObject({ id: 'studio-contest_winner', type: 'achievement', payload: { studioTemplate: 'contest_winner' } });
    expect(STORY_TEMPLATE_CTA.contest_winner).toBeUndefined();
  });

  it('пример фотостудии — данные макета v4: 1 место за ноябрь, Plus на 3 месяца, «B2 глаголы», ♥ 42', () => {
    expect(STORY_TEMPLATE_SAMPLES.contest_winner).toEqual({ id: 'contest_winner', place: 1, month: 11, plusMonths: 3, packTitle: 'B2 глаголы', hearts: 42 });
  });
});

describe('история победителю — тексты (ru слово в слово из макета v4)', () => {
  it('заголовок: «Твой набор — N место за ноябрь» для 1, 2 и 3 места', () => {
    expect([1, 2, 3].map((place) => ru('contestWinTitle', { place, monthIn: tplMonthIn('ru', 11) }))).toEqual([
      'Твой набор — 1 место за ноябрь', 'Твой набор — 2 место за ноябрь', 'Твой набор — 3 место за ноябрь',
    ]);
  });

  it('строка Plus с формой слова «месяц», слово на медали, набор в кавычках, голоса для экранного диктора', () => {
    expect([3, 2, 1].map((months) => ru('contestWinText', { months }))).toEqual([
      'Plus на 3 месяца уже включён.', 'Plus на 2 месяца уже включён.', 'Plus на 1 месяц уже включён.',
    ]);
    expect(ru('contestOverline')).toBe('Набор месяца');
    expect(ru('contestWinPlaceWord')).toBe('место');
    expect(ru('contestWinPack', { pack: 'B2 глаголы' })).toBe('«B2 глаголы»');
    expect([1, 3, 42].map((votes) => ru('contestWinVotes', { votes }))).toEqual(['1 голос', '3 голоса', '42 голоса']);
  });

  it('месяц с предлогом — своя таблица на 9 языках: 12 разных форм, вне 1…12 — пусто', () => {
    for (const lang of LANGS) {
      const forms = Array.from({ length: 12 }, (_, i) => tplMonthIn(lang, i + 1));
      expect([lang, forms.every((f) => f.trim().length > 0), new Set(forms).size]).toEqual([lang, true, 12]);
    }
    expect(tplMonthIn('ru', 11)).toBe('за ноябрь');
    expect(tplMonthIn('uk', 11)).toBe('за листопад');
    expect(tplMonthIn('en', 11)).toBe('in November');
    expect(tplMonthIn('pl', 9)).toBe('za wrzesień');
    // Переводчик 29.10: без «trong» заголовок «hạng 1 tháng 10» читается как дата
    expect(tplMonthIn('vi', 11)).toBe('trong tháng 11');
    expect([0, 13, 1.5, Number.NaN].map((m) => tplMonthIn('ru', m))).toEqual(['', '', '', '']);
  });

  it('правки Переводчика 29.10: en «#1 in November», vi — порядок слов строки Plus', () => {
    expect(plain(tplText('en', 'contestWinTitle', { place: 1, monthIn: tplMonthIn('en', 11) }))).toBe('Your pack — #1 in November');
    expect(plain(tplText('en', 'contestWinText', { months: 1 }))).toBe('Plus for 1 month is already on.');
    expect(plain(tplText('vi', 'contestWinText', { months: 3 }))).toBe('Đã bật Plus 3 tháng.');
    expect(plain(tplText('tr', 'contestWinTitle', { place: 2, monthIn: tplMonthIn('tr', 10) }))).toBe('Paketin Ekim ayında 2. sırada');
  });

  it('заголовок на всех языках и во все месяцы — без «{…}»-хвостов, месяц внутри', () => {
    for (const lang of LANGS) {
      for (let month = 1; month <= 12; month += 1) {
        const monthIn = tplMonthIn(lang, month);
        const title = plain(tplText(lang, 'contestWinTitle', { place: 1, monthIn }));
        expect([lang, month, /[{}]/.test(title), title.includes(monthIn)]).toEqual([lang, month, false, true]);
      }
    }
  });
});

describe('история победителю — событие → кадр (форма Ядра ContestWinStory v1)', () => {
  it('поле Ядра целиком → место, месяц из monthId, месяцы Plus, название и голоса', () => {
    expect(contestWinnerOf(coreField())).toEqual({ id: 'contest_winner', place: 2, month: 11, plusMonths: 2, packTitle: 'B2 глаголы', hearts: 35 });
    expect(contestWinnerOf(coreField({ monthId: '2027-01', place: 1, plusMonths: 3 }))).toMatchObject({ place: 1, month: 1, plusMonths: 3 });
  });

  it('бессрочный Plus (Ядро пишет plusMonths 0) остаётся 0; нет числа — месяцы по правилам за место', () => {
    expect(contestWinnerOf(coreField({ plusMonths: 0 }))).toMatchObject({ plusMonths: 0 });
    const noMonths = coreField();
    delete noMonths.plusMonths;
    expect([1, 2, 3].map((place) => contestWinnerOf({ ...noMonths, place }))).toEqual(
      [1, 2, 3].map((place) => expect.objectContaining({ place, plusMonths: STORY_CONTEST_RULES.plusMonths[place - 1] })),
    );
    expect(contestWinnerOf(coreField({ plusMonths: -1 }))).toMatchObject({ plusMonths: 2 });
  });

  it('числа строкой читаются; голоса не меньше 0 и целые; название без пробелов по краям', () => {
    expect(contestWinnerOf(coreField({ place: '3', plusMonths: '1', hearts: '17' }))).toMatchObject({ place: 3, plusMonths: 1, hearts: 17 });
    expect(contestWinnerOf(coreField({ hearts: -4 }))).toMatchObject({ hearts: 0 });
    expect(contestWinnerOf(coreField({ hearts: 17.9 }))).toMatchObject({ hearts: 17 });
    expect(contestWinnerOf(coreField({ packTitle: '  Поездка  ' }))).toMatchObject({ packTitle: 'Поездка' });
  });

  it('без места 1–3 или без верного месяца кадра нет — победу не выдумываем', () => {
    for (const place of [0, 4, 'first', undefined]) expect([place, contestWinnerOf(coreField({ place }))]).toEqual([place, null]);
    for (const monthId of ['2026-13', '2026-1', '2026/11', 'ноябрь', '', undefined]) expect([monthId, contestWinnerOf(coreField({ monthId }))]).toEqual([monthId, null]);
  });

  it('тип события contest_winner ведёт в кадр; метка фотостудии — пример макета, вне фотостудии метка не действует', () => {
    const at = Date.UTC(2026, 11, 1, 0, 5);
    expect(storyTemplateFromEvent({ type: 'contest_winner', payload: coreField(), atMs: at })).toMatchObject({ id: 'contest_winner', place: 2 });
    expect(storyTemplateFromEvent({ type: 'achievement', payload: { studioTemplate: 'contest_winner' }, atMs: at }, true)).toEqual(STORY_TEMPLATE_SAMPLES.contest_winner);
    expect(storyTemplateFromEvent({ type: 'achievement', payload: { studioTemplate: 'contest_winner' }, atMs: at })).toBeNull();
  });
});

describe('история победителю — кадр на экране', () => {
  const tpl = (over: Partial<StoryTemplateOf<'contest_winner'>> = {}): StoryTemplateOf<'contest_winner'> => ({ ...STORY_TEMPLATE_SAMPLES.contest_winner, ...over });

  it('медаль с местом, заголовок с месяцем, строка Plus и строка набора с ♥ — как в макете', async () => {
    await render(<ContestWinnerFrame tpl={tpl({ place: 2, plusMonths: 2, hearts: 35 })} lang="ru" myRank={null} />);
    expect(screen.getByTestId('story-tpl-contest_winner')).toBeTruthy();
    expect(screen.getByLabelText(tplText('ru', 'contestPlace', { place: 2 }))).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('МЕСТО')).toBeTruthy();
    expect(screen.getByText(tplText('ru', 'contestOverline'))).toBeTruthy();
    expect(screen.getByLabelText(tplText('ru', 'contestWinTitle', { place: 2, monthIn: 'за ноябрь' }))).toBeTruthy();
    expect(screen.getByText(tplText('ru', 'contestWinText', { months: 2 }))).toBeTruthy();
    const pack = tplText('ru', 'contestWinPack', { pack: 'B2 глаголы' });
    expect(screen.getByLabelText(`${pack}, ${tplText('ru', 'contestWinVotes', { votes: 35 })}`)).toBeTruthy();
    expect(screen.getByText('♥ 35')).toBeTruthy();
  });

  it('бессрочный Plus (plusMonths 0): строки «Plus на N месяцев уже включён» нет; без названия — нет строки набора', async () => {
    await render(<ContestWinnerFrame tpl={tpl({ plusMonths: 0, packTitle: '' })} lang="ru" myRank={null} />);
    expect(screen.queryByText(/уже включён/)).toBeNull();
    expect(screen.queryByText(/♥/)).toBeNull();
    expect(screen.getByLabelText(tplText('ru', 'contestWinTitle', { place: 1, monthIn: 'за ноябрь' }))).toBeTruthy();
  });

  it('другой язык — свой месяц и своё слово на медали заглавными по правилам этого языка', async () => {
    await render(<ContestWinnerFrame tpl={tpl({ month: 9 })} lang="pl" myRank={null} />);
    expect(screen.getByLabelText(tplText('pl', 'contestWinTitle', { place: 1, monthIn: 'za wrzesień' }))).toBeTruthy();
    expect(screen.getByText('MIEJSCE')).toBeTruthy();
    await screen.unmount();
    await render(<ContestWinnerFrame tpl={tpl()} lang="tr" myRank={null} />);
    expect(screen.getByText('SIRA')).toBeTruthy();
  });
});

describe('история победителю — подключение и запреты владельца', () => {
  it('просмотр рисует кадр 28; в кадре нет обводок, обрезки строк и ужатия шрифта', () => {
    expect(read('components/stories/templates/StoryTemplateSlide.tsx')).toContain("case 'contest_winner':");
    const src = read('components/stories/templates/frames_contest.tsx');
    for (const banned of ['borderWidth', 'borderColor', 'numberOfLines', 'adjustsFontSizeToFit']) expect([banned, src.includes(banned)]).toEqual([banned, false]);
  });
});
