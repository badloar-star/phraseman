// зачем (владелец 14.10, D192: «на Главной иконка аватарки с кругом, как история в Instagram, когда есть хоть одно событие»; координатор): сторож кольца и просмотра сторис.
// Проверяем: флаг выкл/событий нет → прежняя кнопка профиля (поведение «как раньше»); есть события → кольцо и просмотр из очереди Ядра; кадры по типам событий;
// каждый показанный кадр помечается просмотренным; ✕ закрывает со звуком; тексты на 9 языках; в коде нет обводок контейнеров и бесконечных анимаций без охраны.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  TouchableOpacity: 'Pressable',
  Modal: 'Modal',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {}, absoluteFillObject: {} },
  Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }) },
  NativeModules: {},
  AccessibilityInfo: { isScreenReaderEnabled: () => Promise.resolve(false) },
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
}));
jest.mock('react-native-svg', () => ({ __esModule: true, default: 'Svg', Circle: 'Circle', Defs: 'Defs', LinearGradient: 'LinearGradient', Stop: 'Stop' }));
jest.mock('react-native-gesture-handler', () => {
  const R = jest.requireActual('react');
  const chain: Record<string, unknown> = {};
  const self = new Proxy(chain, { get: (_t, prop) => (prop === 'then' ? undefined : () => self) });
  return {
    Gesture: { Tap: () => self, LongPress: () => self, Pan: () => self, Simultaneous: () => self, Exclusive: () => self },
    GestureDetector: (props: { children: React.ReactNode }) => R.createElement(R.Fragment, null, props.children),
    GestureHandlerRootView: (props: { children: React.ReactNode }) => R.createElement('View', null, props.children),
  };
});
jest.mock('react-native-reanimated', () => {
  const R = jest.requireActual('react');
  const View = (props: Record<string, unknown>) => R.createElement('View', props, props.children);
  return {
    __esModule: true,
    default: { View },
    Easing: { bezier: () => () => 0, linear: () => 0, inOut: () => () => 0, quad: () => 0 },
    cancelAnimation: () => undefined,
    interpolate: (_v: number, _i: number[], out: number[]) => out[out.length - 1],
    runOnJS: (fn: unknown) => fn,
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useSharedValue: (v: number) => ({ value: v }),
    useReducedMotion: () => true,
    withRepeat: (v: unknown) => v,
    withSequence: (...v: unknown[]) => v[v.length - 1],
    withSpring: (v: unknown) => v,
    withTiming: (v: unknown) => v,
  };
});
jest.mock('expo-image', () => ({ Image: 'ExpoImage' }));
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: 'Ionicons' }));
jest.mock('../hooks/use_runtime_active', () => ({ useRuntimeActive: () => true }));
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn() }));
jest.mock('../app/stable_safe_area_metrics', () => ({ useStableSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }) }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn() } }));
jest.mock('../components/SafeLinearGradient', () => ({ LinearGradient: 'LinearGradient' }));
// зачем (координатор 14.10, холодный старт): StoryViewer не импортирует банк звуков напрямую — и листание ('story'), и закрытие ('sheet_close') идут через мост Тем (флаг sound_v2 внутри моста)
const mockPlayEvent = jest.fn();
jest.mock('../modules/sound_v2/legacy_bridge', () => ({ tryPlayV2Event: (...args: unknown[]) => mockPlayEvent(...args) }));
jest.mock('../components/spire/SpireRankCoin', () => ({ __esModule: true, default: 'SpireRankCoin' }));
jest.mock('../components/spire/useSpireScene', () => ({ useSpireScene: () => ({ light: false }) }));
jest.mock('../components/spire/SpireTowerSvg', () => ({ __esModule: true, default: 'SpireTowerSvg' }));
jest.mock('../components/streak/moments/StreakMomentFlame', () => ({ __esModule: true, default: 'StreakMomentFlame' }));
jest.mock('../components/AchievementArt', () => ({ __esModule: true, default: 'AchievementArt' }));
jest.mock('../app/achievements', () => ({
  ALL_ACHIEVEMENTS: [{ id: 'streak_7', nameRu: 'Неделя держит слово' }],
  achievementNameForLang: (a: { nameRu: string }) => a.nameRu,
}));
jest.mock('../app/coin_rank_table_v1', () => ({ isValidCoinRank: (r: unknown) => typeof r === 'number', coinRankRowForDisplay: (r: number) => ({ priceToReach: r * 1000 }) }));
jest.mock('../components/spire/useSpirePalette', () => ({
  useSpirePalette: () => ({ bg: '#0E1214', bgTop: '#16241F', card: '#1B2123', control: '#2A3234', text: '#FFFFFF', textSecondary: '#B8C0C4', accentText: '#7EF0C8' }),
}));

import type { StoryEvent } from '../modules/story_events/story_events_core';
let mockStories: { enabled: boolean; unseenCount: number; playback: readonly StoryEvent[]; stories?: readonly StoryEvent[] };
const mockMarkSeen = jest.fn();
jest.mock('../modules/story_events/use_story_events', () => ({
  useStoryEvents: () => ({ enabled: mockStories.enabled, unseenCount: mockStories.unseenCount, stories: mockStories.stories ?? mockStories.playback, playback: mockStories.playback, markSeen: mockMarkSeen }),
}));

import StoryAvatarSlot from '../components/stories/StoryAvatarSlot';
import StoryViewer from '../components/stories/StoryViewer';
import StorySlide from '../components/stories/StorySlides';
import { STORY_LANGS, STORY_STRING_KEYS, storyText, storyWhenLabel } from '../components/stories/story_strings';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));
const NOW = Date.UTC(2026, 9, 14, 12, 0, 0);
const ev = (type: StoryEvent['type'], payload: StoryEvent['payload'], id: string, atMs = NOW): StoryEvent => ({ id, type, payload, atMs, seen: false });
const WEEK = ev('spire_week', { weekId: 'w1', lang: 'en', outcome: 'up', prevTier: 0, floor: 1, place: 3, total: 30 }, 'spire_week:w1:en');
const STREAK = ev('streak_milestone', { days: 30, dayKey: '2026-10-14' }, 'streak_milestone:30:2026-10-14');
const RANK = ev('coin_rank_up', { toRank: 6 }, 'coin_rank_up:6');
const ACH = ev('achievement', { achievementId: 'streak_7' }, 'achievement:streak_7');

const slotProps = () => ({ lang: 'ru' as const, coinRank: 5, coinSource: 1 as never, placeholderColor: '#222', onOpenProfile: jest.fn(), profileLabel: 'Мой профиль' });

describe('аватар в шапке Главной (D192)', () => {
  beforeEach(() => { mockMarkSeen.mockClear(); mockPlayEvent.mockClear(); });

  it('флаг выкл или событий нет → прежняя кнопка профиля без кольца', async () => {
    mockStories = { enabled: false, unseenCount: 0, playback: [] };
    const props = slotProps();
    await render(<StoryAvatarSlot {...props} />);
    expect(screen.queryByTestId('story-ring')).toBeNull();
    const button = screen.getByTestId('home-hero-avatar-button');
    expect(button.props.accessibilityLabel).toBe('Мой профиль');
    await fireEvent.press(button);
    expect(props.onOpenProfile).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('story-viewer')).toBeNull();
  });

  it('флаг включён, но всё просмотрено → кольца нет, тап ведёт в профиль', async () => {
    mockStories = { enabled: true, unseenCount: 0, playback: [] };
    const props = slotProps();
    await render(<StoryAvatarSlot {...props} />);
    expect(screen.queryByTestId('story-ring')).toBeNull();
    await fireEvent.press(screen.getByTestId('home-hero-avatar-button'));
    expect(props.onOpenProfile).toHaveBeenCalledTimes(1);
  });

  it('всё просмотрено, но за 7 дней события есть → кольца нет, тап открывает просмотр недавних от старого к новому', async () => {
    mockStories = { enabled: true, unseenCount: 0, playback: [], stories: [STREAK, WEEK] }; // новые первыми, как отдаёт Ядро
    const props = slotProps();
    await render(<StoryAvatarSlot {...props} />);
    expect(screen.queryByTestId('story-ring')).toBeNull();
    await fireEvent.press(screen.getByTestId('home-hero-avatar-button'));
    expect(props.onOpenProfile).not.toHaveBeenCalled();
    expect(screen.getByTestId('story-viewer')).toBeTruthy();
    expect(mockMarkSeen).toHaveBeenCalledWith(WEEK.id); // WEEK старше STREAK → идёт первым
  });

  it('есть непросмотренные → кольцо у аватара; тап открывает просмотр, профиль не открывается', async () => {
    mockStories = { enabled: true, unseenCount: 2, playback: [WEEK, STREAK] };
    const props = slotProps();
    await render(<StoryAvatarSlot {...props} />);
    expect(screen.getByTestId('story-ring')).toBeTruthy();
    expect(screen.getByTestId('home-hero-avatar-button').props.accessibilityLabel).toBe('Мой профиль, есть новые события');
    await fireEvent.press(screen.getByTestId('home-hero-avatar-button'));
    expect(props.onOpenProfile).not.toHaveBeenCalled();
    expect(screen.getByTestId('story-viewer')).toBeTruthy();
    expect(mockMarkSeen).toHaveBeenCalledWith(WEEK.id); // первый кадр показан → событие просмотрено
  });
});

describe('просмотр сторис', () => {
  // зачем (координатор 15.10, полный прогон после полуночи): подпись «сегодня/вчера» считается от Date.now(), а события теста привязаны к 14.10 12:00 UTC — часы фиксируем, иначе тест краснеет с наступлением следующих суток
  let nowSpy: jest.SpyInstance<number, []>;
  beforeEach(() => { mockMarkSeen.mockClear(); mockPlayEvent.mockClear(); nowSpy = jest.spyOn(Date, 'now').mockReturnValue(NOW); });
  afterEach(() => { nowSpy.mockRestore(); });

  it('полосы по числу событий, подпись времени, звук story на первом кадре, ✕ закрывает со звуком sheet_close', async () => {
    const onClose = jest.fn();
    await render(<StoryViewer lang="ru" events={[WEEK, STREAK, RANK, ACH]} coinRank={5} origin={{ x: 340, y: 60 }} onSeen={mockMarkSeen} onClose={onClose} />);
    expect(screen.getByTestId('story-viewer-bar-0-live')).toBeTruthy();
    expect(screen.queryByTestId('story-viewer-bar-1-live')).toBeNull();
    expect(screen.getByText('Твои события')).toBeTruthy();
    expect(screen.getByTestId('story-viewer-when').props.children).toBe('сегодня');
    await fireEvent.press(screen.getByTestId('story-viewer-close'));
    expect(mockPlayEvent).toHaveBeenCalledWith('sheet_close', 'story_close');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('очередь пустая → просмотр сразу закрывается сам (нечего показывать)', async () => {
    const onClose = jest.fn();
    await render(<StoryViewer lang="ru" events={[]} coinRank={null} origin={null} onSeen={mockMarkSeen} onClose={onClose} />);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockMarkSeen).not.toHaveBeenCalled();
  });
});

describe('кадры четырёх видов событий', () => {
  it('итог недели: «Ты поднимаешься в Базальт», этаж 1, место из N', async () => {
    await render(<StorySlide event={WEEK} lang="ru" coinRank={5} />);
    expect(screen.getByText('Ты поднимаешься в Базальт')).toBeTruthy();
    expect(screen.getByText('Итог недели · Этаж 1')).toBeTruthy();
    expect(screen.getByText('3 место из 30')).toBeTruthy();
    expect(screen.getByTestId('story-week-tower')).toBeTruthy();
  });

  it('итог недели с монетами недели и наградой сервера: «3 место из 30 · 470 монет за неделю · +100»; награда только из promotionCoins', async () => {
    await render(<StorySlide event={ev('spire_week', { weekId: 'w3', lang: 'en', outcome: 'up', prevTier: 0, floor: 1, place: 3, total: 30, weekCoins: 470, promotionCoins: 100 }, 'w3')} lang="ru" coinRank={5} />);
    expect(screen.getByText(/3 место из 30 \u00B7 470 монет за неделю \u00B7 \+100/)).toBeTruthy();
  });

  it('награды за повышение нет (promotionCoins 0) или итог не «вверх» → «+N» не показываем', async () => {
    await render(<StorySlide event={ev('spire_week', { weekId: 'w4', lang: 'en', outcome: 'stay', prevTier: 1, floor: 1, place: 8, total: 30, weekCoins: 300, promotionCoins: 100 }, 'w4')} lang="ru" coinRank={5} />);
    expect(screen.queryByText(/\+100/)).toBeNull();
    expect(screen.getByText(/8 место из 30 \u00B7 300 монет за неделю/)).toBeTruthy();
  });

  it('итог недели без поля total: строки «место из» нет (ничего не выдумываем)', async () => {
    await render(<StorySlide event={ev('spire_week', { weekId: 'w2', lang: 'ru', outcome: 'stay', prevTier: 1, floor: 1, place: 8 }, 'w2')} lang="ru" coinRank={5} />);
    expect(screen.getByText('Остаёшься в Базальте')).toBeTruthy();
    expect(screen.queryByText(/место из/)).toBeNull();
  });

  it('рубеж серии: «Серия · 30 дн.» и название рубежа', async () => {
    await render(<StorySlide event={STREAK} lang="ru" coinRank={5} />);
    expect(screen.getByText('Серия · 30 дней')).toBeTruthy();
    expect(screen.getByText(/Новая стадия огня — до 100 дней/)).toBeTruthy();
  });

  it('ранг монеты: «Ранг 6», цена ранга из таблицы', async () => {
    await render(<StorySlide event={RANK} lang="ru" coinRank={6} />);
    expect(screen.getByText('Ранг 6')).toBeTruthy();
    expect(screen.getByText(/Куплен за 6\s000 монет/)).toBeTruthy();
  });

  it('ачивка: название из каталога', async () => {
    await render(<StorySlide event={ACH} lang="ru" coinRank={5} />);
    expect(screen.getByText('Неделя держит слово')).toBeTruthy();
    expect(screen.getByText('Ачивка')).toBeTruthy();
  });
});

describe('тексты и исходники', () => {
  it('каждая строка есть на 9 языках, подстановки работают, «вчера/N дн. назад» считаются по суткам', () => {
    for (const key of STORY_STRING_KEYS) for (const lang of STORY_LANGS) expect([key, lang, storyText(lang, key).length > 0]).toEqual([key, lang, true]);
    expect(storyText('en', 'weekUp', { league: 'Basalt' })).toBe('You move up to Basalt');
    const day = 86_400_000;
    expect(storyWhenLabel('ru', NOW, NOW)).toBe('сегодня');
    expect(storyWhenLabel('ru', NOW - day, NOW)).toBe('вчера');
    expect(storyWhenLabel('ru', NOW - 3 * day, NOW)).toBe('3 дн. назад');
  });

  it('в components/stories нет обводок контейнеров и мелких расшифровок; бесконечное «дыхание» кольца под охраной фокуса и фона', () => {
    for (const f of ['StoryRing', 'StoryViewer', 'StorySlides', 'StoryAvatarSlot']) {
      const src = read(`components/stories/${f}.tsx`).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
      expect([f, /borderWidth|borderColor/.test(src)]).toEqual([f, false]);
      expect([f, /adjustsFontSizeToFit/.test(src)]).toEqual([f, false]);
    }
    const ring = read('components/stories/StoryRing.tsx');
    expect(ring).toContain('useRuntimeActive');
    expect(ring).toContain('-1, false');
    expect(read('components/stories/StoryViewer.tsx')).not.toContain('withRepeat');
  });

  it('home.tsx берёт аватар у StoryAvatarSlot, прежние testID сохранены внутри компонента', () => {
    expect(read('app/(tabs)/home.tsx')).toContain('<StoryAvatarSlot');
    const slot = read('components/stories/StoryAvatarSlot.tsx');
    for (const id of ['home-hero-avatar-button', 'home-avatar-coin-rank', 'home-avatar-coin-loading']) expect(slot).toContain(id);
  });

  it('холодный старт: слот аватара не тянет StoryRing / StoryViewer / слайды / банк звуков статически; подключение — require внутри функций', () => {
    const slot = read('components/stories/StoryAvatarSlot.tsx').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    // статические импорты (кроме type): ни кольца, ни просмотра, ни слайдов, ни звука
    const staticImports = [...slot.matchAll(/^import\s+(?!type\b)[^;]*?from\s+['"]([^'"]+)['"]/gm)].map((m) => m[1]);
    for (const banned of ['./StoryRing', './StoryViewer', './StorySlides']) expect(staticImports).not.toContain(banned);
    expect(staticImports.some((m) => m.includes('sound_bank'))).toBe(false);
    expect(slot).toMatch(/^ {4}ringModuleCache = require\('\.\/StoryRing'\)/m);
    expect(slot).toMatch(/^ {4}viewerModuleCache = require\('\.\/StoryViewer'\)/m);
    // сам просмотр не берёт звук из банка напрямую
    expect(read('components/stories/StoryViewer.tsx')).not.toContain("sound_v2/sound_bank");
  });

  it('листы приёмки s2/s3: заголовок слайда 34/40 · 800, надпись 13/17 · 700 · трекинг 1,4 капсом, у ачивки серии подпись «Следующая — N дней»', () => {
    const src = read('components/stories/StorySlides.tsx');
    expect(src).toContain("title: { marginTop: 8, fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.6, textAlign: 'center' }");
    expect(src).toContain("overline: { fontSize: 13, lineHeight: 17, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', textAlign: 'center' }");
    expect(src).toContain("storyText(lang, 'achNext'");
    expect(storyText('ru', 'achNext', { n: 30, dn: 'дней' })).toBe('Следующая — 30 дней');
  });

  it('StoryRing re-экспортирует размеры из лёгкого файла констант (прежний API кольца не менялся)', () => {
    const ring = read('components/stories/StoryRing.tsx');
    expect(ring).toContain("from './story_ring_constants'");
    expect(ring).toContain('export { STORY_RING_COIN, STORY_RING_SLOT, STORY_RING_STROKE }');
  });
});

// act нужен только чтобы не терять предупреждения об обновлениях состояния от AccessibilityInfo
void act;
