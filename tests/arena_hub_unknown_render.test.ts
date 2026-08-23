import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { ArenaProgress, ArenaWalletButton } from '../components/arena/ArenaExpansionUI';
import { ArenaHubLive } from '../components/arena/ArenaHubLive';
import { ArenaDailyGoals } from '../components/arena/ArenaDailyGoals';
import { ArenaConnectionNotice } from '../components/arena/ArenaConnectionNotice';
import type { ArenaDailyGoals as ArenaDailyGoalsModel } from '../modules/arena/daily_goals';
import type { ArenaHubModel } from '../modules/arena/hub_view';

const h = React.createElement;
const mockPlaySound = jest.fn();

jest.mock('react-native', () => ({
  View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style },
}));
jest.mock('react-native-reanimated', () => {
  const entering = { duration: () => entering, delay: () => entering };
  return { __esModule: true, default: { View: 'AnimatedView' }, FadeIn: entering, FadeInDown: entering,
    useSharedValue: (value: number) => ({ value }), useAnimatedStyle: (factory: () => unknown) => factory(),
    withDelay: (_delay: number, value: number) => value, withSpring: (value: number) => value };
});
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
// зачем: ArenaHubLive → ArenaRankStars → ArenaStarGlyph рендерит золотой
// глиф через react-native-svg (звёздная лестница, 2026-08-23). Этот jest.config
// использует лёгкий мок 'react-native' без Touchable.Mixin, от которого
// react-native-svg падает при импорте — тест не проверяет форму звезды,
// только текст/лейблы вокруг неё, поэтому глушим SVG так же, как Ionicons.
jest.mock('react-native-svg', () => {
  const stub = (name: string) => (props: Record<string, unknown>) => h(name, props, props.children as React.ReactNode);
  return {
    __esModule: true,
    default: stub('Svg'),
    Svg: stub('Svg'), Defs: stub('Defs'), Stop: stub('Stop'),
    LinearGradient: stub('LinearGradient'), RadialGradient: stub('RadialGradient'),
    Circle: stub('Circle'), Path: stub('Path'), Rect: stub('Rect'),
  };
});
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'ru' }) }));
jest.mock('../modules/arena/copy', () => ({
  arenaText: (_lang: string, key: string) => key === 'valueUnknown' ? 'Данные пока недоступны'
    : key === 'ranks' ? 'Ранги' : key === 'rankProgress' ? 'До следующего деления'
      : key === 'rankStars' ? 'Звёзды ранга'
      : key === 'goalPlay' ? 'Сыграть матчи' : key === 'goalSpeed' ? 'Ответить первым'
        : key === 'goalAccuracy' ? 'Выиграть матч' : key === 'goalsTitle' ? 'Цели дня'
          : key === 'hubOffline' ? 'Нет подключения' : key === 'hubOfflineHint' ? 'Свежие данные появятся, когда вернётся сеть. Для матча нужна сеть.'
            : key === 'retry' ? 'Повторить' : key,
}));
jest.mock('../modules/arena/expansion_contract', () => ({ ARENA_HUB_SECTIONS: [] }));
jest.mock('../modules/arena/expansion_copy', () => ({ arenaExpansionText: () => '' }));
jest.mock('../modules/arena/expansion_state', () => ({ arenaExpansionStateCopy: () => ({ silent: true }) }));
jest.mock('../components/ui/v2_theme', () => ({
  useTournamentPalette: () => ({ accent: '#8EEA63', elev: '#123', elev2: '#234', gold: '#fc0', muted: '#789', text: '#fff', onGold: '#111', okInk: '#111', ghost: '#666', goldSoft: '#332' }),
}));
jest.mock('../components/ui/v2_ui', () => ({ V2Card: ({ children }: { children: React.ReactNode }) => children, V2Cta: () => null }));
jest.mock('../hooks/use_reduce_motion', () => ({ useReduceMotion: () => true }));
jest.mock('../hooks/use_arena_font_scale', () => ({ useArenaFontScale: () => 1 }));
jest.mock('../hooks/use_arena_sound', () => ({ useArenaSound: () => mockPlaySound }));

const unknown = 'Данные пока недоступны';

function progressWidth(node: unknown): string | undefined {
  if (typeof node !== 'object' || node === null) return undefined;
  const tree = node as { props?: { style?: unknown }; children?: unknown };
  const styles = Array.isArray(tree.props?.style) ? tree.props.style : [tree.props?.style];
  for (const style of styles) {
    if (typeof style === 'object' && style !== null && 'width' in style) {
      const width = (style as { width?: unknown }).width;
      return typeof width === 'string' ? width : undefined;
    }
  }
  if (Array.isArray(tree.children)) for (const child of tree.children) {
    const width = progressWidth(child);
    if (width !== undefined) return width;
  }
  return undefined;
}

const hub = (rank: ArenaHubModel['rank']): ArenaHubModel => ({ rank, stats: null, goals: null, lastMatch: null, streak: 0, friends: [], searchingNow: null });
const goals = (completedCount: number): ArenaDailyGoalsModel => ({
  completedCount, allComplete: false,
  goals: [
    { key: 'play', done: completedCount, target: 3, progress: 0, complete: false },
    { key: 'speed', done: 0, target: 8, progress: 0, complete: false },
    { key: 'accuracy', done: 0, target: 1, progress: 0, complete: false },
  ],
});

describe('Arena unknown-value rendering', () => {
  beforeEach(() => mockPlaySound.mockClear());

  it('renders normalized progress with localized unknown accessibility', async () => {
    const screen = await render(h(ArenaProgress, { value: null, max: 10, label: 'Прогресс' }));
    expect(screen.getByText('— / 10')).toBeTruthy();
    expect(screen.getByLabelText('Прогресс').props.accessibilityValue).toEqual({ text: unknown });
    expect(progressWidth(screen.toJSON())).toBe('0%');
    await screen.rerender(h(ArenaProgress, { value: Infinity, max: -10, label: 'Прогресс' }));
    expect(screen.getByText('— / 0')).toBeTruthy();
    expect(screen.getByLabelText('Прогресс').props.accessibilityValue).toEqual({ text: unknown });
    await screen.rerender(h(ArenaProgress, { value: 99, max: 10, label: 'Прогресс' }));
    expect(screen.getByText('10 / 10')).toBeTruthy();
    expect(screen.getByLabelText('Прогресс').props.accessibilityValue).toMatchObject({ min: 0, max: 10, now: 10 });
    expect(progressWidth(screen.toJSON())).toBe('100%');
  });

  it('announces distinct unknown rank values and keeps known zero real', async () => {
    const screen = await render(h(ArenaHubLive, { model: hub(null) }));
    expect(screen.getByLabelText(`Ранги: ${unknown}`)).toBeTruthy();
    expect(screen.getByLabelText(`Звёзды ранга: ${unknown}`)).toBeTruthy();
    expect(screen.getByLabelText(`До следующего деления: ${unknown}`)).toBeTruthy();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
    await screen.rerender(h(ArenaHubLive, { model: hub({ starsInRank: 0, starsPerRank: 3, tierIndex: 0, tierKey: 'bronze', division: 1, progress: 0, winsToNextRank: 3, top: false }) }));
    expect(screen.getByLabelText('Звёзды ранга: 0/3')).toBeTruthy();
    expect(screen.queryByLabelText(`Ранги: ${unknown}`)).toBeNull();
  });

  it('announces unknown wallet balance with localized context', async () => {
    const screen = await render(h(ArenaWalletButton, { label: 'Звёзды', balance: null, onPress: () => undefined }));
    expect(screen.getByLabelText(`Звёзды: ${unknown}`)).toBeTruthy();
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('renders neutral goals and preserves sound transitions through unknown state', async () => {
    const screen = await render(h(ArenaDailyGoals, { model: null }));
    expect(screen.getByText('Сыграть матчи')).toBeTruthy();
    expect(screen.getByText('Ответить первым')).toBeTruthy();
    expect(screen.getByText('Выиграть матч')).toBeTruthy();
    expect(screen.getByLabelText(`Цели дня: ${unknown}`)).toBeTruthy();
    expect(screen.getByLabelText(`Сыграть матчи: ${unknown}`)).toBeTruthy();
    expect(screen.getByLabelText(`Ответить первым: ${unknown}`)).toBeTruthy();
    expect(screen.getByLabelText(`Выиграть матч: ${unknown}`)).toBeTruthy();
    await screen.rerender(h(ArenaDailyGoals, { model: goals(1) }));
    expect(mockPlaySound).not.toHaveBeenCalled();
    await screen.rerender(h(ArenaDailyGoals, { model: null }));
    await screen.rerender(h(ArenaDailyGoals, { model: goals(2) }));
    expect(mockPlaySound).toHaveBeenCalledTimes(1);
    expect(mockPlaySound).toHaveBeenLastCalledWith('goalComplete');
    await screen.rerender(h(ArenaDailyGoals, { model: { ...goals(2) } }));
    await screen.rerender(h(ArenaDailyGoals, { model: goals(1) }));
    expect(mockPlaySound).toHaveBeenCalledTimes(1);
  });

  it('announces the localized offline notice and retries on request', async () => {
    const onRetry = jest.fn();
    const screen = await render(h(ArenaConnectionNotice, { onRetry }));
    const retry = screen.getByRole('button', { name: 'Повторить' });

    expect(screen.getByTestId('arena-hub-offline').props.accessibilityLiveRegion).toBe('polite');
    expect(screen.getByText('Нет подключения')).toBeTruthy();
    expect(screen.getByText('Свежие данные появятся, когда вернётся сеть. Для матча нужна сеть.')).toBeTruthy();
    expect(screen.getByText('Повторить').props.style).toEqual(expect.arrayContaining([
      expect.objectContaining({ color: '#111' }),
    ]));
    fireEvent.press(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
