// зачем (владелец 14.10, ТЗ ETALON_MOMENTS_V3_TRANSFER m05; образец rise3/overtake3/last3): три момента позиции в таблице комнаты — подъём через линию ТОП-5, тост «обгоняет тебя», воскресный «последний шанс».
// Данные только из props; тост без рода; отсчёт живой; недоступная кнопка энергии; ссылка Plus; компоненты ничего не пишут.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  ScrollView: 'ScrollView', // зачем (проверка выпуска 18.10): m03 и шторки моментов прокручиваются на тесном экране
  Text: 'Text',
  Pressable: 'Pressable',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {}, absoluteFillObject: {} },
  Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }) },
  NativeModules: {},
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
}));
jest.mock('react-native-reanimated', () => {
  const R = jest.requireActual('react');
  const View = (props: Record<string, unknown>) => R.createElement('View', props, props.children);
  return {
    __esModule: true,
    default: { View },
    Easing: { bezier: () => () => 0 },
    cancelAnimation: () => undefined,
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useSharedValue: (v: number) => ({ value: v }),
    useReducedMotion: () => true,
    withDelay: (_d: number, v: unknown) => v,
    withSequence: (...v: unknown[]) => v[v.length - 1],
    withTiming: (v: unknown) => v,
  };
});
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: 'Ionicons' }));
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn(), hapticSuccess: jest.fn(), hapticMediumImpact: jest.fn() }));
jest.mock('../hooks/use_runtime_active', () => ({ useRuntimeActive: (v?: boolean) => v ?? true }));
jest.mock('../modules/sound_v2/sound_bank', () => ({ playEvent: jest.fn() }));
jest.mock('../app/stable_safe_area_metrics', () => ({ useStableSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }) }));
jest.mock('../components/SafeLinearGradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('../components/moments/MomentCoin', () => ({ __esModule: true, default: 'MomentCoin' }));
jest.mock('../components/spire/SpireRankCoin', () => ({ __esModule: true, default: 'SpireRankCoin' }));
jest.mock('../components/spire/useSpireShadow', () => ({ useSpireShadow: () => ({ plate: {}, nested: {} }) }));
jest.mock('../components/spire/moments/MomentPromotion', () => ({
  __esModule: true,
  LadderRow: (props: { row: { name: string }; place: number; testID: string }) => require('react').createElement('Text', { testID: props.testID }, `${props.place}.${props.row.name}`),
}));
jest.mock('../components/v2/V2Pressable', () => ({ __esModule: true, default: (props: { testID?: string; onPress?: () => void; children?: unknown }) => require('react').createElement('Pressable', { testID: props.testID, onPress: props.onPress }, props.children) }));
jest.mock('../components/v2/KitSheetModal', () => ({
  KitSheetModal: (props: { visible: boolean; header: unknown; children: unknown; testID?: string }) => (props.visible ? require('react').createElement('View', { testID: props.testID }, props.header, props.children) : null),
}));
jest.mock('../components/v2/V2Kit', () => {
  const R = jest.requireActual('react');
  return { V2Button: (props: { label: string; onPress: () => void; disabled?: boolean; testID?: string }) => R.createElement('Pressable', { testID: props.testID, onPress: props.disabled ? undefined : props.onPress, accessibilityState: { disabled: !!props.disabled } }, R.createElement('Text', null, props.label)) };
});
jest.mock('../components/spire/useSpirePalette', () => ({
  useSpirePalette: () => ({ bg: '#0E1214', bgTop: '#16241F', card: '#1B2123', control: '#2A3234', text: '#FFFFFF', textSecondary: '#B8C0C4', cta: '#7EF0C8', ctaText: '#04261D', correct: '#5FE3C0', accentText: '#7EF0C8' }),
}));

import SpirePositionRiseMoment, { positionRiseOrderAfter } from '../components/spire/moments/SpirePositionRiseMoment';
import SpireOvertakeToast from '../components/spire/moments/SpireOvertakeToast';
import SpireLastChanceSheet from '../components/spire/moments/SpireLastChanceSheet';
import { POSITION_MOMENT_LANGS, POSITION_MOMENT_STRING_KEYS, positionClockHms, positionMomentText } from '../components/spire/moments/position_moment_strings';
import { normalizeEol } from './helpers/read_source';
import { glueNumbers } from '../components/moments/glue_numbers'; // зачем (18.10): тексты моментов склеивают число со словом неразрывным пробелом

const read = (rel: string) => normalizeEol(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')).split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));
const ROWS = [
  { uid: 'a', name: 'Марк', coinRank: 12, coins: 610, isMe: false },
  { uid: 'b', name: 'Ира', coinRank: 7, coins: 580, isMe: false },
  { uid: 'c', name: 'Соня', coinRank: 8, coins: 520, isMe: false },
  { uid: 'd', name: 'Олег', coinRank: 4, coins: 500, isMe: false },
  { uid: 'f', name: 'Лена', coinRank: 9, coins: 450, isMe: false },
  { uid: 'me', name: 'Ты', coinRank: 5, coins: 440, isMe: true },
];

describe('m05A · строка «Ты» едет вверх через линию ТОП-5', () => {
  it('порядок после подъёма: «Ты» на 5-м месте, Лена ниже; чистая функция', () => {
    expect(positionRiseOrderAfter(ROWS, 5, 4).map((r) => r.name)).toEqual(['Марк', 'Ира', 'Соня', 'Олег', 'Ты', 'Лена']);
    expect(positionRiseOrderAfter(ROWS, 5, 5)).toBe(ROWS);
  });

  it('итоговый кадр: «Ты в топ-5», «Ты» на 5-м месте, +10 монет, кнопки зовут колбэки', async () => {
    const onPlay = jest.fn();
    const onLater = jest.fn();
    await render(<SpirePositionRiseMoment lang="ru" rows={ROWS} fromIndex={5} toIndex={4} coinsGained={10} onPlay={onPlay} onLater={onLater} />);
    expect(screen.getByText('СТУПЕНЬ ПРОЙДЕНА · +10 МОНЕТ')).toBeTruthy();
    expect(screen.getByTestId('position-rise-heading').props.children).toBe('Ты в топ-5');
    expect(screen.getByTestId('position-rise-row-4').props.children).toBe('5.Ты');
    expect(screen.getByTestId('position-rise-row-5').props.children).toBe('6.Лена');
    // зачем (координатор 14.10): окно срабатывает один раз — второй тап (в том числе по другой кнопке) гасится синхронно
    await fireEvent.press(screen.getByTestId('position-rise-play'));
    await fireEvent.press(screen.getByTestId('position-rise-play'));
    await fireEvent.press(screen.getByTestId('position-rise-later'));
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(onLater).not.toHaveBeenCalled();
  });

  it('подъём внутри топ-5 (линию не пересёк): вместо «Ты в топ-5» — «3 место»', async () => {
    await render(<SpirePositionRiseMoment lang="ru" rows={ROWS} fromIndex={3} toIndex={2} coinsGained={10} onPlay={jest.fn()} onLater={jest.fn()} />);
    expect(screen.getByTestId('position-rise-heading').props.children).toBe(glueNumbers('3 место. Поднимаешься'));
  });
});

describe('m05B · тост «обгоняет тебя»', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it('текст без рода, разрыв в монетах недели, «Играть» зовёт колбэк, сам закрывается через 6 с', async () => {
    const onPlay = jest.fn();
    const onDismiss = jest.fn();
    await render(<SpireOvertakeToast lang="ru" rivalName="Ира" rivalCoinRank={7} myCoinRank={5} gapCoins={30} onPlay={onPlay} onDismiss={onDismiss} />);
    expect(screen.getByTestId('overtake-toast-title').props.children).toBe('Ира обгоняет тебя');
    expect(screen.getByTestId('overtake-toast-sub').props.children).toBe(glueNumbers('на 30 монет недели'));
    await fireEvent.press(screen.getByTestId('overtake-toast-play'));
    await fireEvent.press(screen.getByTestId('overtake-toast-play'));
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
    // после «Играть» автозакрытие молчит: родитель уже убрал тост, второе событие не нужно
    await act(async () => { jest.advanceTimersByTime(6000); });
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('без нажатия тост сам закрывается через 6 с ровно один раз', async () => {
    const onDismiss = jest.fn();
    await render(<SpireOvertakeToast lang="ru" rivalName="Ира" rivalCoinRank={7} myCoinRank={5} gapCoins={30} onPlay={jest.fn()} onDismiss={onDismiss} />);
    await act(async () => { jest.advanceTimersByTime(6000); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('m05C · последний шанс', () => {
  beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(new Date('2026-10-18T20:47:20Z')); });
  afterEach(() => { jest.useRealTimers(); });
  const now = () => Date.now();

  it('отсчёт до итога 03:12:40, «До топ-5 — 60 монет. Энергия вернётся через 9:40.», недоступная «Энергия через 9:40», ссылка Plus; отсчёт тикает', async () => {
    const onPlus = jest.fn();
    await render(<SpireLastChanceSheet lang="ru" visible weekEndsAtMs={now() + (3 * 3600 + 12 * 60 + 40) * 1000} energyReadyAtMs={now() + (9 * 60 + 40) * 1000} gapCoins={60} onPlus={onPlus} onClose={jest.fn()} />);
    expect(screen.getByTestId('last-chance-clock').props.children).toBe('03:12:40');
    expect(screen.getByText('ВОСКРЕСЕНЬЕ · ДО ИТОГА')).toBeTruthy();
    expect(screen.getByText(/До топ-5 — /)).toBeTruthy();
    expect(screen.getByText('60 монет')).toBeTruthy();
    expect(screen.getByText(/Энергия вернётся через 9:40\./)).toBeTruthy();
    expect(screen.getByText('Энергия через 9:40')).toBeTruthy();
    expect(screen.getByTestId('last-chance-cta').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByText('Играй без ожидания с Plus'));
    expect(onPlus).toHaveBeenCalledTimes(1);
    await act(async () => { jest.advanceTimersByTime(5000); });
    expect(screen.getByTestId('last-chance-clock').props.children).toBe('03:12:35');
  });

  it('нет границы топ-5 (старый итог): фраза про разрыв опущена, остаётся «Энергия через …»', async () => {
    await render(<SpireLastChanceSheet lang="ru" visible weekEndsAtMs={now() + 3600_000} energyReadyAtMs={now() + 580_000} onPlus={jest.fn()} onClose={jest.fn()} />);
    expect(screen.queryByText(/До топ-5/)).toBeNull();
    expect(screen.getAllByText('Энергия через 9:40').length).toBeGreaterThan(0);
  });
});

describe('тексты и исходники', () => {
  it('каждая строка есть на 9 языках; подстановки; формат часов', () => {
    for (const key of POSITION_MOMENT_STRING_KEYS) for (const lang of POSITION_MOMENT_LANGS) expect([key, lang, positionMomentText(lang, key, { name: 'X', n: 1, gap: '60', t: '9:40' }).length > 0]).toEqual([key, lang, true]);
    expect(positionMomentText('en', 'overtake', { name: 'Ira' })).toBe('Ira is overtaking you');
    expect(positionClockHms((3 * 3600 + 12 * 60 + 40) * 1000)).toBe('03:12:40');
    expect(positionClockHms(-5)).toBe('00:00:00');
  });

  it('компоненты ничего не пишут; бесконечных анимаций и обводок нет', () => {
    for (const f of ['SpirePositionRiseMoment', 'SpireOvertakeToast', 'SpireLastChanceSheet']) {
      const src = read(`components/spire/moments/${f}.tsx`).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
      expect([f, /AsyncStorage|firestore|withRepeat|borderWidth|borderColor/.test(src)]).toEqual([f, false]);
    }
  });
});
