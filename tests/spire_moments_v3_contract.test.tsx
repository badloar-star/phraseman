// зачем (владелец 14.10: «перенести полноценно все модалы и экраны, точно по макетам»; координатор: тест-сторож «рендер 3 состояний × 3 темы, башня целиком»):
// моменты Пика m01/m02/m03 собираются в 3 темах (Аврора тёмная, Аврора светлая, Ирис светлая), башня акта 3 целиком (граница с ореолом ⊂ контейнер, влезает в экран),
// тексты на 9 языках, никто не импортирует components/spire/moments до решения Ядра (сборку не трогаем), флаг moments_v3 по умолчанию выключен.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

// react-native в тестах репозитория — заглушка без StyleSheet/хуков; даём ровно то, что нужно моментам
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {}, absoluteFillObject: {} },
  Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }) },
  NativeModules: {},
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
}));

jest.mock('react-native-svg', () => ({ __esModule: true, default: () => null, Circle: () => null, Ellipse: () => null, Path: () => null, Polygon: () => null, Rect: () => null }));
jest.mock('react-native-reanimated', () => {
  const R = jest.requireActual('react');
  const View = (props: Record<string, unknown>) => R.createElement('View', props, props.children);
  const chain = { duration: () => chain, easing: () => chain };
  const bezier = () => () => 0;
  return {
    __esModule: true,
    default: { View },
    Easing: { out: () => () => 0, cubic: () => 0, quad: () => 0, linear: () => 0, bezier },
    FadeIn: chain,
    FadeOut: chain,
    cancelAnimation: () => undefined,
    runOnJS: (fn: unknown) => fn,
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useSharedValue: (v: number) => ({ value: v }),
    useReducedMotion: () => true,
    withDelay: (_d: number, v: unknown) => v,
    withRepeat: (v: unknown) => v,
    withSequence: (...v: unknown[]) => v[v.length - 1],
    withSpring: (v: unknown) => v,
    withTiming: (v: unknown) => v,
  };
});
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn(), hapticSuccess: jest.fn(), hapticMediumImpact: jest.fn(), hapticHeavyImpact: jest.fn() }));
jest.mock('../app/stable_safe_area_metrics', () => ({ useStableSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }) }));
jest.mock('../components/SafeLinearGradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('../components/v2/V2Kit', () => {
  const R = jest.requireActual('react');
  return { V2Button: (props: { label: string; onPress: () => void; testID?: string }) => R.createElement('Pressable', { testID: props.testID, accessibilityRole: 'button', accessibilityLabel: props.label, onPress: props.onPress }, R.createElement('Text', null, props.label)) };
});
jest.mock('../components/spire/SpireRankCoin', () => ({ __esModule: true, default: 'SpireRankCoin' }));
jest.mock('../components/spire/useSpireShadow', () => ({ useSpireShadow: () => ({ plate: {}, nested: {} }) }));
jest.mock('../components/spire/useSpireScene', () => ({ useSpireScene: () => ({ light: false }) }));
const mockTower = jest.fn();
jest.mock('../components/spire/SpireTowerSvg', () => ({ __esModule: true, default: (props: Record<string, unknown>) => { mockTower(props); return null; } }));

// три темы: палитры берёт хук useSpirePalette (токены текущей темы); подставляем по одной
type Pal = Record<string, string>;
const PALETTES: Readonly<Record<string, Pal>> = {
  'Аврора тёмная': { bg: '#0E1214', bgTop: '#16241F', card: '#1B2123', cardRaised: '#242B2E', control: '#2A3234', text: '#FFFFFF', textSecondary: '#B8C0C4', cta: '#7EF0C8', correct: '#5FE3C0', accentText: '#7EF0C8' },
  'Аврора светлая': { bg: '#EAF3EF', bgTop: '#F4FAF7', card: '#FFFFFF', cardRaised: '#F1F6F4', control: '#DDE8E3', text: '#14121C', textSecondary: '#514D63', cta: '#1F9E7A', correct: '#1F9E7A', accentText: '#14705A' },
  'Ирис светлая': { bg: '#E8E4F2', bgTop: '#F6F2FA', card: '#FFFFFF', cardRaised: '#F1EEF8', control: '#DDD8EA', text: '#14121C', textSecondary: '#514D63', cta: '#6B5BD6', correct: '#2E9E6B', accentText: '#4A3CB0' },
};
let mockPalette: Pal = PALETTES['Аврора тёмная'];
jest.mock('../components/spire/useSpirePalette', () => ({ useSpirePalette: () => mockPalette }));

import MomentPromotion, { MOMENT_PROMO_TIMELINE } from '../components/spire/moments/MomentPromotion';
import MomentStay from '../components/spire/moments/MomentStay';
import MomentDown from '../components/spire/moments/MomentDown';
import { MOMENT_STRING_KEYS, momentLeagueIn, momentText } from '../components/spire/moments/moments_strings';
import { isMomentsV3Enabled, MOMENTS_V3_FLAG_KEY } from '../components/spire/moments/moments_flag';
import { SPIRE_TOWER_GEOM, SPIRE_TW } from '../components/spire/spire_tower_model';
import { spireTowerBounds } from '../components/spire/spire_tower_bounds';
import { spireSkinForTier } from '../modules/spire/tower_skins';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));
const ROWS = [
  { uid: 'a', name: 'Марк', coinRank: 12, coins: 610, isMe: false },
  { uid: 'b', name: 'Ира', coinRank: 7, coins: 580, isMe: false },
  { uid: 'c', name: 'Соня', coinRank: 8, coins: 520, isMe: false },
  { uid: 'd', name: 'Олег', coinRank: 4, coins: 500, isMe: false },
  { uid: 'me', name: 'Ты', coinRank: 5, coins: 470, isMe: true },
  { uid: 'f', name: 'Лена', coinRank: 9, coins: 450, isMe: false },
];

describe.each(Object.keys(PALETTES))('моменты Пика — тема «%s»', (themeName) => {
  beforeEach(() => { mockPalette = PALETTES[themeName]; mockTower.mockClear(); });

  it('m01 повышение: итоговый акт — башня новой лиги целиком, «Базальт», «+100 монет за повышение», «Играть»', async () => {
    const onPlay = jest.fn();
    await render(<MomentPromotion lang="ru" fromTier={0} toTier={1} rows={ROWS} myPlace={5} myCoinRank={5} bonusCoins={100} onPlay={onPlay} />);
    expect(screen.getByText('Базальт')).toBeTruthy();
    expect(screen.getByText('+100 монет за повышение')).toBeTruthy();
    expect(screen.getByText('Этаж 1')).toBeTruthy();
    const call = mockTower.mock.calls.at(-1)?.[0] as { myFloor: number; skin: { id: string }; width: number };
    expect(call.myFloor).toBe(1);
    expect(call.skin.id).toBe(spireSkinForTier(1).id);
    // башня целиком: влезает в экран (jest-окно 750 × 1334), граница с ореолом ⊂ SVG по ширине
    const towerH = SPIRE_TOWER_GEOM.height * (call.width / SPIRE_TW);
    expect(call.width).toBeGreaterThanOrEqual(120);
    expect(call.width).toBeLessThanOrEqual(196);
    expect(towerH).toBeLessThan(1334);
    const b = spireTowerBounds(call.skin as never, true);
    expect(b.minY).toBeGreaterThanOrEqual(0);
    await fireEvent.press(screen.getByTestId('moment-promotion-play'));
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(MOMENT_PROMO_TIMELINE.final).toBe(8800); // тайм-лист эталона: итог на 8,8 с
  });

  it('m02 удержался: «Остаёшься в Граните», место и дистанция до топ-5 в монетах, «Играть»', async () => {
    const onPlay = jest.fn();
    await render(<MomentStay lang="ru" tier={0} coinRank={5} place={12} weekCoins={1180} gapToTop5={240} onPlay={onPlay} />);
    expect(screen.getByText('Остаёшься в Граните')).toBeTruthy();
    expect(screen.getByText('Держимся.')).toBeTruthy();
    expect(screen.getByText(/12 место · 1\s180 монет за неделю\. До топ-5 не хватило /)).toBeTruthy();
    expect(screen.getByText('240')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('moment-stay-play'));
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('m03 понижение (туман): монета спит, тап будит — «Проснулась. Новая неделя», кнопки «Разбудить — Играть» и «Напомнить вечером»', async () => {
    const onPlay = jest.fn();
    const onRemind = jest.fn();
    await render(<MomentDown lang="ru" newTier={0} coinRank={5} onPlay={onPlay} onRemind={onRemind} />);
    expect(screen.getByText('Монета задремала')).toBeTruthy();
    expect(screen.getByText('Разбудить — Играть')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('moment-down-coin'));
    expect(screen.getByTestId('moment-down-title').props.children).toBe('Проснулась.\nНовая неделя');
    expect(screen.getByText('Гранит · все с 1 этажа.')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('moment-down-remind'));
    expect(onRemind).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByTestId('moment-down-play'));
    expect(onPlay).toHaveBeenCalledTimes(1);
  });
});

describe('моменты Пика: тексты, флаг, изоляция', () => {
  it('каждая строка есть на 9 языках, без пустых; подстановки {league}/{n} работают', () => {
    for (const key of MOMENT_STRING_KEYS) {
      for (const lang of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
        expect([key, lang, momentText(lang, key).length > 0]).toEqual([key, lang, true]);
      }
    }
    expect(momentText('en', 'promoPlace', { n: 5 })).toBe('Place 5. You’re moving up');
    expect(momentLeagueIn('ru', 1, 'Базальт')).toBe('Базальте');
    expect(momentLeagueIn('en', 1, 'Basalt')).toBe('Basalt');
  });

  it('флаг moments_v3 по умолчанию выключен: включает только явное true', () => {
    expect(MOMENTS_V3_FLAG_KEY).toBe('moments_v3');
    expect(isMomentsV3Enabled(null)).toBe(false);
    expect(isMomentsV3Enabled({})).toBe(false);
    expect(isMomentsV3Enabled({ moments_v3: 'true' })).toBe(false);
    expect(isMomentsV3Enabled({ moments_v3: true })).toBe(true);
  });

  it('никто не импортирует components/spire/moments (показ подключает Ядро, сборка не меняется)', () => {
    const importers: string[] = [];
    const walk = (dir: string): void => {
      for (const name of fs.readdirSync(path.join(__dirname, '..', dir))) {
        const rel = `${dir}/${name}`;
        const stat = fs.statSync(path.join(__dirname, '..', rel));
        if (stat.isDirectory()) { if (name !== 'node_modules' && name !== 'generated' && rel !== 'components/spire/moments') walk(rel); } else if (/\.(tsx?|js)$/.test(name) && /spire\/moments\/|\.\/moments\//.test(read(rel))) importers.push(rel);
      }
    };
    walk('app');
    walk('components');
    expect(importers).toEqual([]);
  });

  it('тайминги эталона и порог башни: монета ранга 5 в образце, «Играть» с стрелкой на итоге, дрожь и фейерверк на 8,8 с', () => {
    const src = read('components/spire/moments/MomentPromotion.tsx');
    expect(src).toContain('rumble.play();');
    expect(src).toContain('FREEZE_MS'); // «стоп-кадр» эталона 420 мс на 3,0 с
    expect(src).toContain('<MomentFirework fire={fire} x={195 * fw} y={130} r={110} />');
    expect(src).toContain('icon="arrow-forward"');
  });
});
