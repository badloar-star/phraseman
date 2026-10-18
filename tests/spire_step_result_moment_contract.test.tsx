// зачем (владелец 14.10, ТЗ ETALON_MOMENTS_V3_TRANSFER m06; образец stepPass3/stepFail3): итог ступени — отдельный экран; числа только из итога ступени и config/spire_v1, тексты на 9 языках,
// «Дальше»/«Ещё раз» зовут прежний подъём, «К башне» закрывает; компонент ничего не пишет.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {}, absoluteFillObject: {} },
  Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }) },
  NativeModules: {},
}));
jest.mock('react-native-svg', () => ({ __esModule: true, default: 'Svg', Circle: 'Circle', Defs: 'Defs', RadialGradient: 'RadialGradient', Stop: 'Stop', Rect: 'Rect' })); // Defs…Rect — свечение .glowspot в MomentFullScreen
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: 'Ionicons' }));
jest.mock('react-native-reanimated', () => {
  const R = jest.requireActual('react');
  const View = (props: Record<string, unknown>) => R.createElement('View', props, props.children);
  const Text = (props: Record<string, unknown>) => R.createElement('Text', props, props.children);
  const chain = { delay: () => chain, duration: () => chain };
  return {
    __esModule: true,
    default: { View, Text, createAnimatedComponent: (C: unknown) => C },
    Easing: { bezier: () => () => 0 },
    FadeIn: chain,
    cancelAnimation: () => undefined,
    useAnimatedProps: (fn: () => unknown) => fn(),
    useSharedValue: (v: number) => ({ value: v }),
    useReducedMotion: () => true,
    withTiming: (v: unknown) => v,
  };
});
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn(), hapticSuccess: jest.fn(), hapticMediumImpact: jest.fn() }));
jest.mock('../modules/sound_v2/sound_bank', () => ({ playEvent: jest.fn() }));
jest.mock('../modules/sound_v2/legacy_bridge', () => ({ playUnlessRecentlyPlayed: jest.fn() }));
jest.mock('../app/stable_safe_area_metrics', () => ({ useStableSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }) }));
jest.mock('../components/SafeLinearGradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('../components/moments/MomentCoin', () => ({ __esModule: true, default: (props: { say?: string }) => (props.say ? require('react').createElement('Text', null, props.say) : null) }));
jest.mock('../components/v2/V2Kit', () => {
  const R = jest.requireActual('react');
  return { V2Button: (props: { label: string; onPress: () => void; testID?: string }) => R.createElement('Pressable', { testID: props.testID, onPress: props.onPress }, R.createElement('Text', null, props.label)) };
});
jest.mock('../components/spire/useSpirePalette', () => ({
  useSpirePalette: () => ({ bg: '#0E1214', bgTop: '#16241F', control: '#2A3234', text: '#FFFFFF', textSecondary: '#B8C0C4', cta: '#7EF0C8', wrong: '#E5484D' }),
}));

import SpireStepResultMoment from '../components/spire/moments/SpireStepResultMoment';
import { STEP_MOMENT_LANGS, STEP_MOMENT_STRING_KEYS, stepMomentText } from '../components/spire/moments/step_moment_strings';
import { spireGameText } from '../components/spire/spire_game_strings';
import type { SpireStepOutcome } from '../app/spire/use_spire_game';
import type { SpireCoinsConfig } from '../modules/spire/config_contract';
import { normalizeEol } from './helpers/read_source';
import { glueNumbers } from '../components/moments/glue_numbers'; // зачем (18.10): тексты моментов склеивают число со словом неразрывным пробелом

const read = (rel: string) => normalizeEol(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')).split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));
const COINS = { perStep: 10 } as unknown as SpireCoinsConfig;
const outcome = (patch: Partial<SpireStepOutcome>): SpireStepOutcome => ({
  kind: 'passed', report: {} as never, errors: 0, usedMs: 72_000, budgetMs: 120_000, floorBefore: 4, local: { floor: 4, stepInFloor: 7, stepsCleared: 20 } as never, failReason: null as never, ...patch,
});

describe('m06 · ступень пройдена', () => {
  it('«10 из 10», «Без ошибок · +10 монет», время и бюджет, «Чисто!», лесенка 7 из 8, «Дальше» зовёт подъём', async () => {
    const onAgain = jest.fn();
    await render(<SpireStepResultMoment lang="ru" outcome={outcome({})} coins={COINS} coinRank={5} onAgain={onAgain} onLater={jest.fn()} />);
    expect(screen.getByTestId('step-moment-title').props.children).toBe(glueNumbers('10 из 10'));
    expect(screen.getByText('Без ошибок · +10 монет')).toBeTruthy();
    expect(screen.getByTestId('step-moment-time').props.children).toBe('1:12');
    expect(screen.getByText('из 2:00')).toBeTruthy();
    expect(screen.getByText('Чисто!')).toBeTruthy();
    expect(screen.getByText(/7 из \d+ на этаже/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('step-moment-next'));
    expect(onAgain).toHaveBeenCalledTimes(1);
  });

  it('с ошибками: «9 из 10», «Ошибок: 1 · +10 монет», облачка «Чисто!» нет', async () => {
    await render(<SpireStepResultMoment lang="ru" outcome={outcome({ errors: 1 })} coins={COINS} coinRank={5} onAgain={jest.fn()} onLater={jest.fn()} />);
    expect(screen.getByTestId('step-moment-title').props.children).toBe(glueNumbers('9 из 10'));
    expect(screen.getByText('Ошибок: 1 · +10 монет')).toBeTruthy();
    expect(screen.queryByText('Чисто!')).toBeNull();
  });
});

describe('m06 · ступень не пройдена', () => {
  it('3 ошибки: заголовок образца, «Остаёшься на 4 этаже…», «Ещё раз — другой набор» зовёт подъём, «К башне» закрывает', async () => {
    const onAgain = jest.fn();
    const onLater = jest.fn();
    await render(<SpireStepResultMoment lang="ru" outcome={outcome({ kind: 'failed', failReason: 'hearts' as never, errors: 3 })} coins={COINS} coinRank={5} onAgain={onAgain} onLater={onLater} />);
    expect(screen.getByTestId('step-moment-title').props.children).toBe('3 ошибки — ступень не пройдена');
    expect(screen.getByText(/Остаёшься на 4 этаже/)).toBeTruthy();
    expect(screen.getByText('Ещё раз?')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('step-moment-again'));
    expect(onAgain).toHaveBeenCalledTimes(1);
    // зачем (владелец 18.10): второй тап в течение 0,7 с игнорируется (двойной тап) — «К башне»/«В раздел Пик» нажимаем «через секунду»
    const realNow = Date.now();
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(realNow + 1000);
    await fireEvent.press(screen.getByTestId('step-moment-later'));
    nowSpy.mockRestore();
    expect(onLater).toHaveBeenCalledTimes(1);
  });

  it('время вышло — прежняя строка «Время вышло», а не «3 ошибки»', async () => {
    await render(<SpireStepResultMoment lang="ru" outcome={outcome({ kind: 'failed', failReason: 'timeout' as never })} coins={COINS} coinRank={5} onAgain={jest.fn()} onLater={jest.fn()} />);
    expect(screen.getByTestId('step-moment-title').props.children).toBe('Время вышло');
  });
});

describe('выбор после ступени: «Следующее задание» / «В раздел Пик» (владелец 18.10)', () => {
  let logSpy: jest.SpyInstance;
  beforeEach(() => { logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined); });
  afterEach(() => { logSpy.mockRestore(); });
  const written = () => logSpy.mock.calls.map((c) => String(c[0])).join('\n');

  it('пройдена: две кнопки с нужными подписями; «Следующее задание» зовёт подъём, «В раздел Пик» закрывает; в журнале [SPIRE-AFTER-ROUND] выбор и что откроется', async () => {
    const onAgain = jest.fn();
    const onLater = jest.fn();
    await render(<SpireStepResultMoment lang="ru" outcome={outcome({})} coins={COINS} coinRank={5} onAgain={onAgain} onLater={onLater} />);
    expect(screen.getByText('Следующее задание')).toBeTruthy();
    expect(screen.getByText('В раздел Пик')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('step-moment-later'));
    expect(onLater).toHaveBeenCalledTimes(1);
    expect(onAgain).not.toHaveBeenCalled(); // автоперехода нет: без нажатия новая ступень не стартует
    expect(written()).toContain('[SPIRE-AFTER-ROUND] показ kind=passed');
    expect(written()).toContain('[SPIRE-AFTER-ROUND] выбор=toSpire');
    expect(written()).toContain('главный экран Пика');
  });

  it('двойной тап на «Следующее задание» зовёт подъём один раз; игнор пишет причину', async () => {
    const onAgain = jest.fn();
    await render(<SpireStepResultMoment lang="ru" outcome={outcome({})} coins={COINS} coinRank={5} onAgain={onAgain} onLater={jest.fn()} />);
    await fireEvent.press(screen.getByTestId('step-moment-next'));
    await fireEvent.press(screen.getByTestId('step-moment-next'));
    expect(onAgain).toHaveBeenCalledTimes(1);
    expect(written()).toContain('[SPIRE-AFTER-ROUND] выбор=next');
    expect(written()).toContain('[SPIRE-AFTER-ROUND] игнор двойного тапа');
  });

  it('не пройдена: «Ещё раз — другой набор» и «В раздел Пик» (вместо «К башне»)', async () => {
    await render(<SpireStepResultMoment lang="ru" outcome={outcome({ kind: 'failed', failReason: 'hearts' as never, errors: 3 })} coins={COINS} coinRank={5} onAgain={jest.fn()} onLater={jest.fn()} />);
    expect(screen.getByText('Ещё раз — другой набор')).toBeTruthy();
    expect(screen.getByText('В раздел Пик')).toBeTruthy();
    expect(screen.queryByText('К башне')).toBeNull();
  });

  it('исходник: кнопки не сливаются с фоном (общие V2Button primary/secondary), без обводок; вибрация — на самой кнопке', () => {
    const src = read('components/spire/moments/SpireStepResultMoment.tsx');
    expect(src).toContain("variant=\"secondary\" onPress={choice.toSpire}");
    expect(read('components/v2/V2Pressable.tsx')).toContain('hapticTap()');
  });

  it('запасная плашка итога и окно этажа/вершины — те же две кнопки и тот же хук; плашка не тянет папку моментов (изоляция), подписи — из общих строк Пика', () => {
    const panel = read('components/spire/SpireResultPanel.tsx');
    expect(panel).toContain("from './use_after_round_choice'");
    expect(panel).toContain("spireGameText(lang, 'toSpire')");
    expect(panel).not.toMatch(/from '\.\/moments\//);
    const floor = read('components/spire/moments/SpireFloorMoment.tsx');
    expect(floor).toContain("from '../use_after_round_choice'");
    expect(floor).not.toContain("'rest'"); // «Передохнуть» заменено на «В раздел Пик» (владелец 18.10)
    for (const lang of STEP_MOMENT_LANGS) expect([lang, spireGameText(lang, 'toSpire').length > 0, spireGameText(lang, 'nextTask').length > 0]).toEqual([lang, true, true]);
    expect(spireGameText('en', 'toSpire')).toBe('Back to Peak');
  });
});

describe('тексты и исходник', () => {
  it('каждая строка есть на 9 языках; подстановки работают', () => {
    for (const key of STEP_MOMENT_STRING_KEYS) for (const lang of STEP_MOMENT_LANGS) expect([key, lang, stepMomentText(lang, key, { ok: 9, all: 10, t: '2:00' }).length > 0]).toEqual([key, lang, true]);
    expect(stepMomentText('en', 'ofTasks', { ok: 9, all: 10 })).toBe(glueNumbers('9 of 10'));
  });

  it('момент ничего не пишет и не списывает; бесконечных анимаций и обводок нет', () => {
    const src = read('components/spire/moments/SpireStepResultMoment.tsx').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    expect(/AsyncStorage|firestore|withRepeat|borderWidth|borderColor/.test(src)).toBe(false);
  });
});
