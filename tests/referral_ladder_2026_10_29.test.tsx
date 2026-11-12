// Владелец 29.10 (макет v3 QTcHjbVMPK64SWmobt1Vig, контракт с Ядром): «Лесенка приглашений» вместо рулетки Plus.
// Проверяем: модель ступеней (0 / 1 / 3 друга, границы тройки, нет данных с сервера), видимость рулетки при включённой лесенке, флаг в реестре
// (дефолт ВЫКЛ), 9 языков в каждой фразе, разметку ступеней и листа, и что экран /referrals при выключенном флаге остаётся прежним.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {}, absoluteFillObject: {} },
  Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
}));
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: 'Ionicons' }));
jest.mock('../components/KitTouchable', () => ({ __esModule: true, default: 'KitTouchable' }));
jest.mock('../components/referral_sheet_shell', () => ({ __esModule: true, default: 'ReferralSheetShell' }));
jest.mock('../components/ThemeContext', () => ({ useTheme: () => ({ liquidGlassThemeId: 'graphite' }) }));
let mockLang = 'ru';
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: mockLang }) }));
jest.mock('../constants/liquidGlassThemePalette', () => ({
  liquidGlassTokens: () => ({ opaqueCard: '#111', opaqueControl: '#222', text: '#fff', secondary: '#ccc', accent: '#9bf', accentInk: '#012', cta: '#eee', ctaInk: '#000' }),
}));

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { deriveReferralLadder, referralRouletteVisibleWithLadder } from '../app/referral_ladder_model';
import { REFERRAL_LADDER_TEXTS, referralLadderText } from '../components/referral_ladder_strings';
import ReferralLadder, { ladderTitleLines } from '../components/referral_ladder';
import ReferralLadderHowSheet from '../components/referral_ladder_how_sheet';
import type { Lang } from '../constants/i18n';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const data = (countedFriends: number, plusGrants = 0, extra: Record<string, number> = {}) => ({ countedFriends, plusGrants, coinsPerFriend: 500, plusDaysPerGrant: 14, friendsPerGrant: 3, monthCounted: countedFriends, monthlyCap: 10, lessonWindowDays: 30, ...extra });
const textsOf = (node: unknown): string => JSON.stringify(node);

describe('модель лесенки', () => {
  it('0 друзей: обе ступени не пройдены, прогресс 0 из 3', () => {
    const v = deriveReferralLadder(data(0));
    expect(v).toMatchObject({ hasData: true, counted: 0, step1Done: false, step2Done: false, cycle: 0, progressPct: 0, capReached: false });
  });
  it('1 друг: ступень 1 пройдена, ступень 2 — 1 из 3', () => {
    const v = deriveReferralLadder(data(1));
    expect(v).toMatchObject({ step1Done: true, step2Done: false, cycle: 1, progressPct: 33 });
  });
  it('3 друга и выданный Plus: ступень 2 пройдена («Plus уже у тебя»)', () => {
    expect(deriveReferralLadder(data(3, 1))).toMatchObject({ step1Done: true, step2Done: true, cycle: 0, progressPct: 100 });
  });
  it('3 друга, а выдача ещё в пути (plusGrants=0): тоже «пройдено», не «3 из 3» застрявшие', () => {
    expect(deriveReferralLadder(data(3, 0))).toMatchObject({ step2Done: true, cycle: 3, progressPct: 100 });
  });
  it('4 друга после первой выдачи: новая тройка — 1 из 3, не пройдено', () => {
    expect(deriveReferralLadder(data(4, 1))).toMatchObject({ step2Done: false, cycle: 1 });
    expect(deriveReferralLadder(data(5, 1))).toMatchObject({ step2Done: false, cycle: 2, progressPct: 67 });
    expect(deriveReferralLadder(data(6, 2))).toMatchObject({ step2Done: true, cycle: 0 });
  });
  it('нет данных с сервера (старая версия сервера): нули, hasData=false, ничего не выдумываем; константы макета по умолчанию', () => {
    for (const empty of [undefined, null]) {
      expect(deriveReferralLadder(empty)).toMatchObject({ hasData: false, counted: 0, step1Done: false, step2Done: false, coinsPerFriend: 500, plusDays: 14, friendsPerGrant: 3, lessonWindowDays: 30 });
    }
  });
  it('мусор в полях не ломает: отрицательные/нечисловые значения → значения по умолчанию, прогресс не уходит за 0..3', () => {
    const v = deriveReferralLadder({ countedFriends: -4, plusGrants: Number.NaN, coinsPerFriend: 0, plusDaysPerGrant: -1, friendsPerGrant: 0 } as never);
    expect(v).toMatchObject({ counted: 0, cycle: 0, coinsPerFriend: 500, plusDays: 14, friendsPerGrant: 3 });
    expect(deriveReferralLadder(data(2, 5)).cycle).toBe(0); // выдач больше, чем троек, — цикл не уходит в минус
  });
  it('месячный потолок: достигнут → capReached; нет потолка → не считаем достигнутым', () => {
    expect(deriveReferralLadder(data(10, 3, { monthCounted: 10, monthlyCap: 10 })).capReached).toBe(true);
    expect(deriveReferralLadder(data(10, 3, { monthCounted: 9, monthlyCap: 10 })).capReached).toBe(false);
    expect(deriveReferralLadder(data(10, 3, { monthCounted: 10, monthlyCap: 0 })).capReached).toBe(false);
  });
  it('рулетка при включённой лесенке видна только пока есть накопленное (ключи или друг, чей ключ ещё можно забрать)', () => {
    const none = { availableCreditCount: 0, claimableQualifiedCount: 0 };
    expect(referralRouletteVisibleWithLadder(none, 0)).toBe(false);
    expect(referralRouletteVisibleWithLadder(null, 0)).toBe(false);
    expect(referralRouletteVisibleWithLadder(none, 1)).toBe(true);
    expect(referralRouletteVisibleWithLadder({ availableCreditCount: 2, claimableQualifiedCount: 0 }, 0)).toBe(true);
    expect(referralRouletteVisibleWithLadder({ availableCreditCount: 0, claimableQualifiedCount: 1 }, 0)).toBe(true);
  });
});

describe('тексты лесенки', () => {
  const LANGS: readonly Lang[] = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
  it('каждая фраза заполнена на всех 9 языках, плейсхолдеры подставляются, фигурных скобок в итоге нет', () => {
    for (const key of Object.keys(REFERRAL_LADDER_TEXTS) as Array<keyof typeof REFERRAL_LADDER_TEXTS>) {
      for (const lang of LANGS) {
        const out = referralLadderText(lang, key, { coins: 500, days: 14, n: 2, need: 3, m: 10, cap: 10 });
        expect([key, lang, out.trim().length > 0]).toEqual([key, lang, true]);
        expect([key, lang, /[{}]/.test(out)]).toEqual([key, lang, false]);
      }
    }
  });
  it('русский — слово в слово по макету', () => {
    expect(referralLadderText('ru', 'title')).toBe('Зови друзей — награда за каждого');
    expect(referralLadderText('ru', 'step1Empty', { coins: 500 })).toBe('Друг прошёл первый урок — 500 монет тебе и 500 другу');
    expect(referralLadderText('ru', 'step2', { days: 14 })).toBe('Трое друзей прошли первый урок — Plus на 14 дней');
    expect(referralLadderText('ru', 'step2Done', { days: 14 })).toBe('Трое друзей прошли первый урок — Plus на 14 дней уже у тебя');
    expect(referralLadderText('ru', 'progress', { n: 1, need: 3 })).toBe('1 из 3');
    expect(referralLadderText('ru', 'shareCode')).toBe('Поделиться кодом');
    expect(referralLadderText('ru', 'how')).toBe('Как это работает');
  });
});

describe('перенос заголовка по смыслу (обход экранов 12.11: рвалось «награда за / каждого»)', () => {
  it('на всех 9 языках вторая половина фразы целиком на второй строке, разделитель в конце первой', () => {
    for (const lang of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as Lang[]) {
      const lines = ladderTitleLines(referralLadderText(lang, 'title')).split('\n');
      expect(lines).toHaveLength(2);
      expect(lines[0]).toMatch(/[—:]$/);
      expect(lines[1].length).toBeGreaterThan(0);
    }
    expect(ladderTitleLines('Зови друзей — награда за каждого')).toBe('Зови друзей —\nнаграда за каждого');
    expect(ladderTitleLines('Без разделителя')).toBe('Без разделителя');
  });
});

describe('разметка', () => {
  beforeEach(() => { mockLang = 'ru'; });
  const noop = () => undefined;
  const props = (counted: number, grants = 0) => ({ view: deriveReferralLadder(data(counted, grants)), code: 'PHRASE-7K2Q', codeCopied: false, shareBusy: false, onCopy: noop, onShare: noop, onHow: noop });

  it('0 друзей: две ступени, полоса, код, «Поделиться кодом», «Как это работает»; нет кнопок «забрать»', async () => {
    const view = await render(<ReferralLadder {...props(0)} />);
    const all = textsOf(view.toJSON());
    expect(all).toContain('Зови друзей —\\nнаграда за каждого'); // заголовок переносится по смыслу (обход экранов 12.11); \\n — так перевод строки выглядит в JSON дерева
    expect(all).toContain('Друг прошёл первый урок — 500 монет тебе и 500 другу');
    expect(all).toContain('Трое друзей прошли первый урок — Plus на 14 дней');
    expect(all).toContain('0 из 3');
    expect(all).toContain('PHRASE-7K2Q');
    expect(view.getByTestId('referral-ladder-bar')).toBeTruthy();
    expect(view.getByTestId('referral-ladder-share')).toBeTruthy();
    expect(view.getByTestId('referral-ladder-how')).toBeTruthy();
    expect(all).not.toMatch(/Забрать|Получить приз|Claim/);
  });
  it('компактный вариант для вкладки «Друзья»: только заголовок, код и два действия — без значка, наград, прогресса и лимита', async () => {
    const view = await render(
      <ReferralLadder
        {...props(0)}
        compactFriends
        view={deriveReferralLadder(data(10, 3, { monthCounted: 10, monthlyCap: 10 }))}
      />,
    );
    const all = textsOf(view.toJSON());
    expect(all).toContain('Зови друзей —\\nнаграда за каждого'); // заголовок переносится по смыслу (обход экранов 12.11); \\n — так перевод строки выглядит в JSON дерева
    expect(all).toContain('PHRASE-7K2Q');
    expect(all).toContain('Поделиться кодом');
    expect(all).toContain('Как это работает');
    expect(all).not.toContain('Друг прошёл первый урок');
    expect(all).not.toContain('Plus на 14 дней');
    expect(view.queryByTestId('referral-ladder-header-icon')).toBeNull();
    expect(view.queryByTestId('referral-ladder-step-1')).toBeNull();
    expect(view.queryByTestId('referral-ladder-step-2')).toBeNull();
    expect(view.queryByTestId('referral-ladder-bar')).toBeNull();
    expect(view.queryByTestId('referral-ladder-cap')).toBeNull();
  });
  it('3 друга и Plus выдан: полосы и «n из 3» нет, ступень 2 — «уже у тебя»', async () => {
    const view = await render(<ReferralLadder {...props(3, 1)} />);
    const all = textsOf(view.toJSON());
    expect(all).toContain('Plus на 14 дней уже у тебя');
    expect(all).not.toContain('из 3');
    expect(view.queryByTestId('referral-ladder-bar')).toBeNull();
  });
  it('один засчитанный друг с именем: «Аня — первый урок пройден · вы оба получаете по 500 монет» (без рода и падежа); без имени или при нескольких — «Засчитано друзей: N»', async () => {
    const one = deriveReferralLadder(data(1), [{ ladder: 'counted', refereeName: '  Аня ' }, { ladder: 'waiting', refereeName: 'Марк' }]);
    expect(one.firstName).toBe('Аня');
    const named = await render(<ReferralLadder {...props(1)} view={one} />);
    expect(textsOf(named.toJSON())).toContain('Аня — первый урок пройден · вы оба получаете по 500 монет');
    // имя не используем, если засчитанных приглашений в списке не ровно одно или у друга нет имени
    expect(deriveReferralLadder(data(1), [{ ladder: 'counted', refereeName: '' }]).firstName).toBeNull();
    expect(deriveReferralLadder(data(1), [{ ladder: 'counted', refereeName: 'Аня' }, { ladder: 'counted', refereeName: 'Марк' }]).firstName).toBeNull();
    expect(deriveReferralLadder(data(2), [{ ladder: 'counted', refereeName: 'Аня' }]).firstName).toBeNull();
    const plain = await render(<ReferralLadder {...props(2)} />);
    expect(textsOf(plain.toJSON())).toContain('Засчитано друзей: 2 — по 500 монет тебе и каждому');
  });
  it('потолок месяца: строка-сообщение показывается только при достигнутом потолке', async () => {
    const capped = await render(<ReferralLadder {...props(0)} view={deriveReferralLadder(data(10, 3, { monthCounted: 10, monthlyCap: 10 }))} />);
    expect(capped.queryByTestId('referral-ladder-cap')).not.toBeNull();
    const normal = await render(<ReferralLadder {...props(1)} />);
    expect(normal.queryByTestId('referral-ladder-cap')).toBeNull();
  });
  it('лист «Как это работает»: пять честных строк разделяют правила монет и Plus', async () => {
    const view = await render(<ReferralLadderHowSheet visible onClose={noop} view={deriveReferralLadder(data(0, 0, { lessonWindowDays: 20, coinsPerFriend: 700, plusDaysPerGrant: 30 }))} />);
    const all = textsOf(view.toJSON());
    expect(all).toContain('Приглашение действует 20 дней');
    expect(all).toContain('считается первый пройденный урок, а не регистрация');
    expect(all).toContain('вы оба получите по 700 монет');
    expect(all).toContain('в «Новом курсе» в два разных дня');
    expect(all).toContain('Два аккаунта на одном устройстве для Plus не засчитываются');
    expect(all).toContain('Каждые три таких друга дают тебе Plus на 30 дней');
    expect(all).toContain('не чаще одной выдачи в 30 дней');
    expect(all).toContain('Понятно');
    for (const k of ['how1', 'how2', 'how3', 'how4', 'how5']) expect(view.getByTestId(`referral-ladder-${k}`)).toBeTruthy();
  });
  it('лист «Как это работает» по запросу показывает вход в существующий ввод кода друга', async () => {
    const onEnterFriendCode = jest.fn();
    const view = await render(
      <ReferralLadderHowSheet
        visible
        onClose={noop}
        onEnterFriendCode={onEnterFriendCode}
        view={deriveReferralLadder(data(0))}
      />,
    );
    expect(textsOf(view.toJSON())).toContain('Ввести код друга');
    fireEvent.press(view.getByTestId('referral-ladder-enter-friend-code'));
    expect(onEnterFriendCode).toHaveBeenCalledTimes(1);
  });
});

describe('подключение', () => {
  it('флаг заведён в реестре (дефолт ВЫКЛ, ключ в списке серверных bools) и в снимке релиза', () => {
    const flags = read('app/remote_flags.ts');
    expect(flags).toContain("  | 'referral_ladder_enabled'\n");
    expect(flags).toContain('  referral_ladder_enabled: false,');
    // зачем (устаревшая жёсткая пара, 05.11): между ними в списке серверных bools появились другие ключи — проверяем присутствие в списке, а не соседство
    expect(flags).toMatch(/'ghost_friend_ab'[^\]]*'referral_ladder_enabled'/);
    expect(JSON.parse(read('docs/work/release/ota_flag_baseline_2026-10-25.json')).defaults.referral_ladder_enabled).toBe(false);
  });
  it('лесенка едет в уже существующем кэше приглашений: тип, нормализация и передача из ответа сервера', () => {
    const cloud = read('app/referral_cloud.ts');
    expect(cloud).toContain('export type ReferralLadderData = {');
    expect(cloud).toContain('countedFriends: number;');
    expect(cloud).toContain("ladder?: 'waiting' | 'counted' | 'not_counted';");
    const vip = read('app/referral_vip.ts');
    expect(vip).toContain("...(value?.ladder && typeof value.ladder === 'object' ? { ladder: value.ladder } : {})");
    expect(vip).toContain('drain: normalizeDrain({ ...res.drain, ladder: res.ladder ?? res.drain?.ladder }),');
  });
  it('экран: лесенка только при флаге и работающей программе; прежний блок рулетки и «Ввести код» остаются; лист «?» открывает лист лесенки', () => {
    const screen = read('app/referrals.tsx');
    expect(screen).toContain('const ladderShown = ladderEnabled && marketingVisible;');
    expect(screen).toContain('const rouletteShown = referralUiVisible && (!ladderShown || referralRouletteVisibleWithLadder(scopedReferralState.drain, spinCredits));');
    expect(screen).toContain('{ladderShown && (');
    expect(screen).toContain('{rouletteShown && (\n            <View testID="referrals-roulette-hero"');
    expect(screen).toContain('{ladderShown ? null : enterCodeButton}');
    expect(screen).toContain('{marketingVisible && !ladderShown && (');
    expect(screen).toContain('{marketingVisible && !ladderShown && referralCode ? (');
    expect(screen).toContain('onPress={() => { if (ladderShown) setLadderHowOpen(true); else setHowSheetOpen(true); }}');
    expect(screen).toContain('<ReferralLadderHowSheet visible={ladderHowOpen}');
    // экран не делает собственных запросов за лесенкой: данные приходят со снимком приглашений
    // строки списка приглашений при лесенке: ждём урок / засчитан / не засчитан; без поля ladder у приглашения — прежний текст рулетки
    expect(screen).toContain("const ladderStatus = ladderShown && invite.ladder ? invite.ladder : null;");
    expect(screen).toContain("referralLadderText(lang as Lang, 'inviteCounted', { coins: ladderView.coinsPerFriend })");
    expect(screen).toContain("referralLadderText(lang as Lang, 'inviteWaiting')");
    expect(screen).toContain("referralLadderText(lang as Lang, 'inviteNotCounted')");
    expect(screen).toContain('deriveReferralLadder(scopedReferralState.drain?.ladder, invites)');
    expect(referralLadderText('ru', 'inviteCounted', { coins: 500 })).toBe('Засчитан · 500 монет');
    expect(referralLadderText('ru', 'inviteNotCounted')).toBe('Не засчитан по правилам программы');
    expect(read('components/referral_ladder.tsx')).not.toMatch(/firebase|firestore|httpsCallable|fetch\(|useEffect|setInterval|setTimeout/i);
  });
});
