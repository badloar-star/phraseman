// зачем (владелец 14.10: «перенести полноценно все модалы, точно по макетам»; координатор: сторож «19 рубежей × 3 темы»): рубежи серии и кольца «Сегодня» собираются в трёх темах
// (Аврора тёмная, Аврора светлая, Ирис светлая); у каждого из 19 рубежей есть сцена, длительность, тайм-лист и тексты на 9 языках; цифра на плашке читается (≥ 4,5:1) на огне любого цвета;
// флаг moments_v3 по умолчанию выключен; никто не импортирует components/streak/moments до решения Ядра; огонь — только StreakFlameFill / LiveStreakFlame; звук — имена событий.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {}, absoluteFillObject: {} },
  Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }) },
  NativeModules: {},
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
}));
jest.mock('react-native-svg', () => {
  const Null = () => null;
  return { __esModule: true, default: Null, Circle: Null, Path: Null, Defs: Null, RadialGradient: Null, Stop: Null, Rect: Null };
});
jest.mock('react-native-reanimated', () => {
  const R = jest.requireActual('react');
  const View = (props: Record<string, unknown>) => R.createElement('View', props, props.children);
  const chain: Record<string, unknown> = {};
  chain.duration = () => chain;
  chain.delay = () => chain;
  chain.easing = () => chain;
  const bezier = () => () => 0;
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c: unknown) => c },
    Easing: { out: () => () => 0, cubic: () => 0, quad: () => 0, linear: () => 0, bezier },
    FadeIn: chain,
    FadeInDown: chain,
    ZoomIn: chain,
    cancelAnimation: () => undefined,
    runOnJS: (fn: unknown) => fn,
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useAnimatedProps: (fn: () => unknown) => fn(),
    useSharedValue: (v: number) => ({ value: v }),
    useReducedMotion: () => true,
    withDelay: (_d: number, v: unknown) => v,
    withRepeat: (v: unknown) => v,
    withSequence: (...v: unknown[]) => v[v.length - 1],
    withSpring: (v: unknown) => v,
    withTiming: (v: unknown) => v,
  };
});
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn(), hapticSuccess: jest.fn() }));
jest.mock('../app/stable_safe_area_metrics', () => ({ useStableSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }) }));
jest.mock('../components/ThemeContext', () => ({ useTheme: () => ({ themeMode: 'dark', liquidGlassThemeId: 'aurora' }) }));
jest.mock('../components/icons/LiveStreakFlame', () => ({ __esModule: true, default: 'LiveStreakFlame' }));
jest.mock('../components/streak/StreakFlameFill', () => ({ StreakFlameFill: 'StreakFlameFill' }));
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: () => null }));
jest.mock('../components/AchievementArt', () => ({ __esModule: true, default: 'AchievementArt' }));
jest.mock('../components/moments/MomentCoin', () => ({ __esModule: true, default: 'MomentCoin' }));
jest.mock('../components/spire/moments/moments_effects', () => ({
  __esModule: true,
  default: 'MomentFirework',
  useMomentRumble: () => ({ style: {}, play: jest.fn() }),
  momentJitter: (i: number, salt: number) => ((i * 7 + salt * 13) % 100) / 100,
}));
jest.mock('../components/spire/moments/moments_layout', () => {
  const R = jest.requireActual('react');
  return { MomentFullScreen: (props: { children: unknown }) => R.createElement('View', null, props.children) };
});
jest.mock('../components/v2/V2Kit', () => {
  const R = jest.requireActual('react');
  return { V2Button: (props: { label: string; onPress?: () => void; testID?: string }) => R.createElement('Pressable', { testID: props.testID, accessibilityRole: 'button', accessibilityLabel: props.label, onPress: props.onPress }, R.createElement('Text', null, props.label)) };
});
jest.mock('../modules/sound_v2/sound_bank', () => ({ playEvent: jest.fn(() => ({ event: 'x', played: true })) }));
jest.mock('../app/flashcards/SoundService', () => ({ playSfx: jest.fn() }));
jest.mock('../components/spire/useSpireShadow', () => ({ useSpireShadow: () => ({ plate: {}, nested: {} }) }));

type Pal = Record<string, string>;
const PALETTES: Readonly<Record<string, Pal>> = {
  'Аврора тёмная': { bg: '#0E1214', bgTop: '#16241F', card: '#1B2123', control: '#2A3234', track: '#2F3A3C', text: '#FFFFFF', textSecondary: '#B8C0C4', cta: '#7EF0C8', ctaText: '#06241A', accentText: '#7EF0C8', gold: '#FFD27A' },
  'Аврора светлая': { bg: '#EAF3EF', bgTop: '#F4FAF7', card: '#FFFFFF', control: '#DDE8E3', track: '#CFDCD6', text: '#14121C', textSecondary: '#514D63', cta: '#1F9E7A', ctaText: '#FFFFFF', accentText: '#127556', gold: '#8A5A00' },
  'Ирис светлая': { bg: '#E8E4F2', bgTop: '#F6F2FA', card: '#FFFFFF', control: '#DDD8EA', track: '#CFC9E0', text: '#14121C', textSecondary: '#514D63', cta: '#6B5BD6', ctaText: '#FFFFFF', accentText: '#4A3BB0', gold: '#8A5A00' },
};
let mockPalette: Pal = PALETTES['Аврора тёмная'];
jest.mock('../components/spire/useSpirePalette', () => ({ useSpirePalette: () => mockPalette }));

import StreakMilestoneMoment from '../components/streak/moments/StreakMilestoneMoment';
import StreakMilestoneRibbon, { streakRibbonMilestones, streakRibbonPosition } from '../components/streak/moments/StreakMilestoneRibbon';
import TodayRings, { TODAY_RING_TARGETS, todayRingFraction, todayRingGeometry } from '../components/streak/moments/TodayRings';
import { monthArcPath } from '../components/streak/moments/StreakMomentRings';
import { STREAK_PLATE_ALPHA } from '../components/streak/moments/StreakMomentFlame';
import {
  STREAK_MILESTONES, STREAK_MOMENT_DURATION_MS, STREAK_MOMENT_TIMELINE, nextStreakMilestone, streakFlameStage, streakMomentKind, streakAchievementId,
  type StreakMilestone,
} from '../components/streak/moments/streak_milestones';
import { STREAK_MOMENT_LANGS, STREAK_MOMENT_STRING_KEYS, STREAK_MILESTONE_TITLES_FOR_GUARD, streakDayWord, streakMilestoneSubline, streakMilestoneTitle, streakMomentText } from '../components/streak/moments/streak_moments_strings';
import { STREAK_SCENE_SOUND, playStreakSceneSound, playTodayDayDoneSound, playTodayRingClosedSound } from '../components/streak/moments/streak_moments_sound';
import { isSoundV2EventId } from '../modules/sound_v2/catalog';
import { setSoundV2FlagForTests } from '../modules/sound_v2/sound_v2_flag';
import { playEvent } from '../modules/sound_v2/sound_bank';
import { playSfx } from '../app/flashcards/SoundService';
import { MOMENTS_V3_FLAG_KEY, isMomentsV3Enabled } from '../components/streak/moments/streak_moments_flag';

const ROOT = path.join(__dirname, '..');
const DIR = 'components/streak/moments';
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));
const sources = () => fs.readdirSync(path.join(ROOT, DIR)).filter((f) => /\.(ts|tsx)$/.test(f)).map((f) => ({ f, text: read(`${DIR}/${f}`) }));

function lum(rgb: readonly [number, number, number]): number {
  const [r, g, b] = rgb.map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

describe('рубежи серии — данные', () => {
  it('19 рубежей по возрастанию, у каждого сцена, длительность и тайм-лист по порядку', () => {
    expect(STREAK_MILESTONES).toHaveLength(19);
    expect([...STREAK_MILESTONES]).toEqual([...STREAK_MILESTONES].sort((a, b) => a - b));
    const kinds: Record<string, number> = {};
    for (const m of STREAK_MILESTONES) {
      const kind = streakMomentKind(m);
      kinds[kind] = (kinds[kind] ?? 0) + 1;
      const dur = STREAK_MOMENT_DURATION_MS[kind];
      const cues = STREAK_MOMENT_TIMELINE[kind];
      expect(dur).toBeGreaterThan(0);
      expect(cues.length).toBeGreaterThan(0);
      cues.forEach((c, i) => { expect(c.at).toBeLessThan(dur); if (i) expect(c.at).toBeGreaterThan(cues[i - 1].at); });
    }
    expect(kinds).toEqual({ toast: 5, medium: 7, big: 3, half500: 1, year: 1, twoYears: 1, legend: 1 });
    expect(STREAK_MOMENT_DURATION_MS.toast).toBeLessThanOrEqual(1500); // малый рубеж ≤ 1,5 с
  });

  it('стадия огня растёт со стадиями образца: 7 → яркий, 30 → синий, 100 → белый, 365 → звёздный, 1000 → золотой', () => {
    expect([1, 7, 30, 100, 365, 1000].map(streakFlameStage)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(nextStreakMilestone(0)).toBe(1);
    expect(nextStreakMilestone(100)).toBe(150);
    expect(nextStreakMilestone(1000)).toBeNull();
    expect(streakAchievementId(7 as StreakMilestone)).toBe('streak_7');
    expect(streakAchievementId(50 as StreakMilestone)).toBeNull();
  });

  it('тексты: все ключи и все 19 заголовков на 9 языках, без пустых и без нераскрытых плейсхолдеров, плейсхолдеры одинаковы во всех языках', () => {
    for (const key of STREAK_MOMENT_STRING_KEYS) {
      const ph = (lang: (typeof STREAK_MOMENT_LANGS)[number]) => (streakMomentText(lang, key, undefined).match(/\{\w+\}/g) ?? []).sort().join(',');
      const base = ph('ru');
      for (const lang of STREAK_MOMENT_LANGS) {
        expect(streakMomentText(lang, key, { n: 7, next: 14, left: 7 }).trim()).not.toBe('');
        expect(streakMomentText(lang, key, { n: 7, next: 14, left: 7 })).not.toMatch(/\{\w+\}/);
        expect(ph(lang)).toBe(base);
      }
    }
    for (const m of STREAK_MILESTONES) {
      expect(STREAK_MILESTONE_TITLES_FOR_GUARD[m]).toHaveLength(9);
      for (const lang of STREAK_MOMENT_LANGS) expect(streakMilestoneTitle(lang, m).trim()).not.toBe('');
    }
  });

  it('цифра на плашке читается: белый на плашке rgba(8,10,14,.82) ≥ 4,5:1 поверх огня любого цвета (худший случай — белый и чёрный огонь)', () => {
    const plate = [8, 10, 14] as const;
    for (const under of [[255, 255, 255], [0, 0, 0], [255, 214, 90]] as const) {
      const mixed = plate.map((c, i) => STREAK_PLATE_ALPHA * c + (1 - STREAK_PLATE_ALPHA) * under[i]) as unknown as [number, number, number];
      expect(contrast(lum([255, 255, 255]), lum(mixed))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('лента рубежей: до пяти меток, последняя — следующий рубеж, положения внутри дорожки', () => {
    expect(streakRibbonMilestones(100)).toEqual([14, 30, 50, 100, 150]); // пять последних рубежей до следующего (150) включительно
    for (const d of [0, 1, 2, 7, 99, 100, 365, 999, 1000]) {
      const list = streakRibbonMilestones(d);
      expect(list.length).toBeGreaterThan(0);
      expect(list.length).toBeLessThanOrEqual(5);
      for (const m of list) { const pos = streakRibbonPosition(m, list); expect(pos).toBeGreaterThanOrEqual(4 - 1e-9); expect(pos).toBeLessThanOrEqual(96 + 1e-9); }
    }
  });

  it('кольца «Сегодня»: радиусы убывают, доля зажата в 0…1, дуга месяца — валидный путь', () => {
    const r = [0, 1, 2].map((i) => todayRingGeometry(i).r);
    expect(r[0]).toBeGreaterThan(r[1]);
    expect(r[1]).toBeGreaterThan(r[2]);
    expect(r[2]).toBeGreaterThan(0);
    expect(todayRingFraction(5, 3)).toBe(1);
    expect(todayRingFraction(-1, 3)).toBe(0);
    expect(todayRingFraction(1, 0)).toBe(0);
    expect(TODAY_RING_TARGETS).toEqual([1, 3, 10]);
    expect(monthArcPath(125, 113, 0)).toMatch(/^M[\d.]+ [\d.]+A113 113 0 0 1 [\d.]+ [\d.]+$/);
  });
});

describe('рубежи серии — флаг, подключение, исходники', () => {
  it('флаг moments_v3 по умолчанию выключен; включает только явное true', () => {
    expect(MOMENTS_V3_FLAG_KEY).toBe('moments_v3');
    expect(isMomentsV3Enabled(null)).toBe(false);
    expect(isMomentsV3Enabled({})).toBe(false);
    expect(isMomentsV3Enabled({ moments_v3: 'true' })).toBe(false);
    expect(isMomentsV3Enabled({ moments_v3: true })).toBe(true);
  });

  it('звук: каждая сцена играет событие sound_v2 из каталога (тайм-лист образца); флаг выключен — запасной путь fc_*; кольцо и «День выполнен» тоже', () => {
    for (const plan of Object.values(STREAK_SCENE_SOUND)) expect(isSoundV2EventId(plan.v2)).toBe(true);
    expect(STREAK_SCENE_SOUND.toast.v2).toBe('streak_small');
    expect(STREAK_SCENE_SOUND.medium.v2).toBe('streak_mid');
    expect(STREAK_SCENE_SOUND.big.v2).toBe('streak_big');
    expect(STREAK_SCENE_SOUND.year.v2).toBe('streak_year');
    expect(STREAK_SCENE_SOUND.legend.v2).toBe('streak_legend');
    (playEvent as jest.Mock).mockClear();
    (playSfx as jest.Mock).mockClear();
    setSoundV2FlagForTests(true);
    playStreakSceneSound('big');
    playTodayRingClosedSound();
    playTodayDayDoneSound();
    expect((playEvent as jest.Mock).mock.calls.map((c) => c[0])).toEqual(['streak_big', 'ring', 'day_done']);
    expect((playEvent as jest.Mock).mock.calls[1][1]).toEqual({ advance: true }); // кольцо ходит по кругу 0→1→2
    expect(playSfx).not.toHaveBeenCalled();
    setSoundV2FlagForTests(false);
    (playEvent as jest.Mock).mockClear();
    playStreakSceneSound('legend');
    expect(playEvent).not.toHaveBeenCalled();
    expect(playSfx).toHaveBeenCalledTimes(1);
    setSoundV2FlagForTests(null);
  });

  // зачем: подключать моменты серии можно только осознанно — список импортёров явный (сторис берут огонь и рубежи, карточка «Сегодня» — кольца за флагом, dev-превью — всё)
  const ALLOWED_IMPORTERS = ['app/dev_moments_preview.tsx', 'components/home/v2/HomeV2TodayCard.tsx', 'components/stories/StorySlides.tsx', 'modules/story_events/story_event_sources.ts'];
  it('components/streak/moments импортируют только перечисленные места; новый импортёр — осознанное решение Ядра', () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) { if (!/node_modules|^\./.test(e.name) && rel !== DIR) walk(rel); continue; }
        if (!/\.(ts|tsx)$/.test(e.name)) continue;
        if (/streak\/moments\//.test(read(rel)) && !ALLOWED_IMPORTERS.includes(rel)) offenders.push(rel);
      }
    };
    for (const d of ['app', 'components', 'hooks', 'modules', 'constants']) walk(d);
    expect(offenders).toEqual([]);
  });

  it('тайм-лист сцены ставится ОДИН раз: эффект тактов не зависит от нестабильного rumble/fire (иначе таймеры перезапускались после каждого такта и тексты никогда не появлялись — гейт паритета, круг 1)', () => {
    const screenSrc = read(`${DIR}/StreakMilestoneScreen.tsx`);
    expect(screenSrc).toContain('fireRef.current(c.id)');
    expect(screenSrc).toContain('}, [cues, reduceMotion]);');
    expect(screenSrc).not.toMatch(/\}, \[cues, fire, reduceMotion\]\)/);
  });

  it('слово «день» в правильной форме: ru 1 день / 2 дня / 5 дней / 11 дней / 21 день, uk, pl, en; подписи как в образце («3 дня подряд», «До недели — 4 дня», «СЕРИЯ · 7 ДНЕЙ»)', () => {
    expect([1, 2, 5, 11, 12, 21, 22, 25].map((n) => streakDayWord('ru', n))).toEqual(['день', 'дня', 'дней', 'дней', 'дней', 'день', 'дня', 'дней']);
    expect([1, 3, 7, 11].map((n) => streakDayWord('uk', n))).toEqual(['день', 'дні', 'днів', 'днів']);
    expect([1, 2, 5].map((n) => streakDayWord('pl', n))).toEqual(['dzień', 'dni', 'dni']);
    expect([1, 2].map((n) => streakDayWord('en', n))).toEqual(['day', 'days']);
    expect(streakMilestoneTitle('ru', 3)).toBe('3 дня подряд');
    expect(streakMilestoneSubline('ru', 3)).toBe('До недели — 4 дня');
    expect(streakMilestoneSubline('ru', 7)).toBe('Новая стадия огня — до 30 дней');
    expect(streakMilestoneSubline('ru', 100)).toBe('Новая стадия огня — до года');
    expect(streakMilestoneSubline('ru', 730)).toBe('До Легенды — 270 дней');
    expect(streakMilestoneSubline('ru', 365)).toBe('До двух лет — 365 дней');
    expect(streakMomentText('ru', 'overline', { n: 7 })).toBe('Серия · 7 дней');
  });

  it('тексты про монету: без запрещённых формулировок (владелец 14.10: «монета задремала» и т. п.); анимации монеты — как в образце', () => {
    const forbidden = /монета (задремала|рада|радуется|спит|устала|грустит)|coin (dozed|is happy|sleeps)/i;
    for (const m of STREAK_MILESTONES) for (const lang of STREAK_MOMENT_LANGS) expect(streakMilestoneTitle(lang, m)).not.toMatch(forbidden);
    for (const key of STREAK_MOMENT_STRING_KEYS) for (const lang of STREAK_MOMENT_LANGS) expect(streakMomentText(lang, key, { n: 7, next: 14, left: 7 })).not.toMatch(forbidden);
    for (const { f, text } of sources()) {
      const code = text.split(String.fromCharCode(10)).filter((l) => !/^\s*\/\//.test(l)).join(String.fromCharCode(10));
      expect(`${f}: ${/монета (задремала|рада|проснулась)/i.test(code)}`).toBe(`${f}: false`);
    }
  });

  it('огонь — только StreakFlameFill / LiveStreakFlame (своих Ionicons-огней нет); без обводок, без случайности; цвета — из токенов или помечены theme-exempt; звук — имена событий', () => {
    for (const { f, text } of sources()) {
      expect(`${f}: ${/name="flame|flame-outline/.test(text)}`).toBe(`${f}: false`); // своих огней на Ionicons нет (галочка и прочие значки — можно)
      expect(`${f}: ${/borderWidth|borderColor/.test(text)}`).toBe(`${f}: false`);
      expect(`${f}: ${/Math\.random/.test(text)}`).toBe(`${f}: false`);
      const raw = text.split('\n').filter((line) => /#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(line) && !/theme-exempt/.test(line) && !/^\s*\/\//.test(line));
      expect(`${f}: ${raw.join(' | ')}`).toBe(`${f}: `);
    }
    expect(read(`${DIR}/StreakMomentFlame.tsx`)).toContain('StreakFlameFill');
    expect(read(`${DIR}/StreakMilestoneToast.tsx`)).toContain('StreakMomentFlame');
  });
});

describe.each(Object.keys(PALETTES))('рубежи серии — тема «%s»', (themeName) => {
  beforeEach(() => { mockPalette = PALETTES[themeName]; });

  it.each([...STREAK_MILESTONES])('рубеж %i собирается, заголовок на месте, «Дальше» закрывает (экраны) / тост закрывается сам', async (m) => {
    const onDone = jest.fn();
    await render(<StreakMilestoneMoment lang="ru" milestone={m} coinRank={5} onDone={onDone} onShare={jest.fn()} />);
    expect(screen.getAllByText(streakMilestoneTitle('ru', m)).length).toBeGreaterThan(0);
    if (streakMomentKind(m) === 'toast') {
      expect(screen.getByTestId('streak-milestone-toast')).toBeTruthy();
    } else {
      await fireEvent.press(screen.getByTestId('streak-milestone-screen-next'));
      expect(onDone).toHaveBeenCalledTimes(1);
      const hasShare = screen.queryByTestId('streak-milestone-screen-share') !== null;
      expect(hasShare).toBe([100, 365, 500, 730, 1000].includes(m));
    }
  });

  it.each([...STREAK_MOMENT_LANGS])('язык %s: рубеж 100 (большой) собирается и показывает свой заголовок', async (lang) => {
    await render(<StreakMilestoneMoment lang={lang} milestone={100} coinRank={null} onDone={jest.fn()} />);
    expect(screen.getAllByText(streakMilestoneTitle(lang, 100)).length).toBeGreaterThan(0);
  });

  it('лента рубежей собирается: подпись «Рубежи» и «До 150 — 50 дн.»', async () => {
    await render(<StreakMilestoneRibbon lang="ru" days={100} />);
    expect(screen.getByText('Рубежи')).toBeTruthy();
    expect(screen.getByText('до 150 — 50 дн.')).toBeTruthy();
  });

  it('кольца «Сегодня»: «День выполнен» нет, пока закрыты не все три', async () => {
    await render(<TodayRings lang="ru" progress={[1, 1, 2]} coinRank={5} />);
    expect(screen.queryByText('День выполнен')).toBeNull();
  });

  it('кольца «Сегодня»: все три закрыты — «День выполнен»', async () => {
    await render(<TodayRings lang="ru" progress={[1, 3, 10]} coinRank={5} />);
    expect(screen.getByText('День выполнен')).toBeTruthy();
  });
});
