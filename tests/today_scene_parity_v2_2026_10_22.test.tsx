// зачем (координатор 22.10, Сверка 366de369b «Сегодня» vs scenes-compact.html v.2: светлая 25,9 %, тёмная 48,2 %): сторож вида сцены
// «Сегодня» до бита по CSS эталона — кольца по пропу look (на сцене — оттенки темы, today_scene_ring_look; дорожка своим цветом, точка начала у пустого кольца) только у сцены
// (без своего вида — цвета темы, дорожка 0,16, без точки: Главная, момент m11 и прежний экран «Сегодня» не меняются); кнопка «Начать»
// по содержимому слева (.cta flex-start); строки без левого кружка — справа ✓ оттенком кольца темы или счётчик; плитка значка 34/12, панель 24.
// зачем: TodayRings пишет журнал под голым __DEV__ — в тестах его нет (ReferenceError), задаём как в streak_today_rings_slot
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {}, absoluteFillObject: {} },
  Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
}));
jest.mock('react-native-svg', () => {
  const R = jest.requireActual('react');
  const host = (name: string) => (props: Record<string, unknown>) => R.createElement(name, props, props.children as React.ReactNode);
  return { __esModule: true, default: host('Svg'), Circle: host('Circle') };
});
jest.mock('react-native-reanimated', () => {
  const R = jest.requireActual('react');
  const View = (props: Record<string, unknown>) => R.createElement('View', props, props.children as React.ReactNode);
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c: unknown) => c },
    Easing: { bezier: () => () => 0 },
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useAnimatedProps: (fn: () => unknown) => fn(),
    useSharedValue: (v: number) => ({ value: v }),
    useReducedMotion: () => true,
    withDelay: (_d: number, v: unknown) => v,
    withSequence: (...v: unknown[]) => v[v.length - 1],
    withTiming: (v: unknown) => v,
  };
});
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: 'Ionicons' }));
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn(), hapticSuccess: jest.fn() }));
jest.mock('../components/moments/MomentCoin', () => ({ __esModule: true, default: 'MomentCoin' }));
jest.mock('../components/spire/moments/moments_effects', () => ({ __esModule: true, default: 'MomentFirework' }));
jest.mock('../components/spire/useSpirePalette', () => ({ useSpirePalette: () => ({ card: '#FFFFFF', text: '#14121C' }) }));
jest.mock('../components/spire/useSpireShadow', () => ({ useSpireShadow: () => ({ plate: {}, nested: {} }) }));
jest.mock('../components/streak/moments/use_streak_colors', () => ({
  useStreakColors: () => ({ accentGraphic: '#A08CFF', second: '#7E6BD8', gold: '#C9B8FF' }),
  todayRingColors: (c: { accentGraphic: string; second: string; gold: string }) => [c.accentGraphic, c.second, c.gold],
}));
jest.mock('../components/streak/moments/streak_moments_sound', () => ({
  playStreakTapSound: jest.fn(), playTodayDayDoneSound: jest.fn(), playTodayRingClosedSound: jest.fn(),
}));

import type { Lang } from '../constants/i18n';
import TodayRings, { TODAY_RING_SIZES, todayRingGeometry, type TodayRingsLook } from '../components/streak/moments/TodayRings';
import { buildTodaySceneCopy } from '../components/home/v2/today_scene/today_scene_copy';
import { pickTodaySceneState, type TodaySceneTaskInput } from '../components/home/v2/today_scene/today_scene_state';
import { readSource } from './helpers/read_source';

type JsonNode = Readonly<{ type: string; props: Record<string, unknown>; children: readonly (JsonNode | string)[] | null }>;
const RC = ['#FF6B5B', '#3DD6A3', '#55A8FF'] as const;
const LOOK: TodayRingsLook = { colors: RC, trackOpacity: 0.22, zeroDot: true };
const LANGS: readonly Lang[] = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

function circles(): JsonNode[] {
  const out: JsonNode[] = [];
  const walk = (n: JsonNode | string | null | readonly (JsonNode | string)[]): void => {
    if (!n || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    const node = n as JsonNode;
    if (node.type === 'Circle') out.push(node);
    (node.children ?? []).forEach(walk);
  };
  walk(screen.toJSON() as unknown as JsonNode);
  return out;
}

describe('кольца «Сегодня»: вид эталона scenes-compact v2 — только по пропу look', () => {
  it('с look: дорожки RC при 22 %, у каждого кольца точка начала радиусом в полтолщины на 0° холста', async () => {
    await render(<TodayRings lang="ru" progress={[1, 0, 6]} targets={[1, 1, 10]} coinRank={5} size={160} showDayDone={false} look={LOOK} />);
    const all = circles();
    const tracks = all.filter((c) => c.props.opacity !== undefined);
    expect(tracks.map((c) => c.props.stroke)).toEqual([...RC]);
    expect(tracks.every((c) => c.props.opacity === 0.22)).toBe(true);
    const dots = all.filter((c) => typeof c.props.fill === 'string' && c.props.fill !== 'none');
    const g = TODAY_RING_SIZES[160];
    expect(dots.map((c) => c.props.fill)).toEqual([...RC]);
    dots.forEach((dot, i) => {
      expect(dot.props.r).toBe(g.stroke / 2);
      expect(dot.props.cx).toBeCloseTo(g.size / 2 + todayRingGeometry(i, 160).r, 6);
      expect(dot.props.cy).toBe(g.size / 2);
    });
    const arcs = all.filter((c) => c.props.animatedProps !== undefined);
    expect(arcs.map((c) => c.props.stroke)).toEqual([...RC]);
    expect(arcs.every((c) => c.props.strokeLinecap === 'round')).toBe(true);
  });

  it('без look: как раньше — цвета темы, дорожка 0,16, точек нет (Главная, момент m11, прежний экран)', async () => {
    await render(<TodayRings lang="ru" progress={[1, 0, 6]} targets={[1, 1, 10]} coinRank={5} size={160} showDayDone={false} />);
    const all = circles();
    const tracks = all.filter((c) => c.props.opacity !== undefined);
    expect(tracks.map((c) => c.props.stroke)).toEqual(['#A08CFF', '#7E6BD8', '#C9B8FF']);
    expect(tracks.every((c) => c.props.opacity === 0.16)).toBe(true);
    expect(all.filter((c) => typeof c.props.fill === 'string' && c.props.fill !== 'none')).toHaveLength(0);
  });

  it('с trackColor: дорожки — свой цвет темы (уже с прозрачностью) при непрозрачности 1; дуги и точки — цвета колец', async () => {
    const track = 'rgba(184,246,255,0.22)';
    await render(<TodayRings lang="ru" progress={[1, 0, 6]} targets={[1, 1, 10]} coinRank={5} size={160} showDayDone={false} look={{ ...LOOK, trackOpacity: 1, trackColor: track }} />);
    const all = circles();
    const tracks = all.filter((c) => c.props.opacity !== undefined);
    expect(tracks.map((c) => c.props.stroke)).toEqual([track, track, track]);
    expect(tracks.every((c) => c.props.opacity === 1)).toBe(true);
    expect(all.filter((c) => c.props.animatedProps !== undefined).map((c) => c.props.stroke)).toEqual([...RC]);
    expect(all.filter((c) => typeof c.props.fill === 'string' && c.props.fill !== 'none').map((c) => c.props.fill)).toEqual([...RC]);
  });
});

describe('сцена «Сегодня»: кнопка, строки и панель как CSS эталона', () => {
  const view = readSource('components/home/v2/today_scene/TodaySceneView.tsx');
  const code = view.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

  it('кольца-герой — оттенки темы из токенов (оба места: обычное и на крупном шрифте), цветов эталона нет', () => {
    expect(code).toContain('const ringLook = useMemo(() => todaySceneRingLook(tokens), [tokens]);');
    expect(code.match(/look=\{ringLook\}/g)).toHaveLength(2);
    expect(view).not.toMatch(/#FF6B5B|#3DD6A3|#55A8FF/i);
  });

  it('кнопка — «Начать» по содержимому слева: высота от 50, радиус 28, поля 24; что откроет — в подписи для чтения с экрана', () => {
    expect(code).toContain("ctaOuter: { alignSelf: 'flex-start', maxWidth: '100%', marginTop: 16 },");
    expect(code).toMatch(/cta: \{ minHeight: 50, paddingVertical: 8, borderRadius: 28,[^}]*paddingHorizontal: 24 \}/);
    expect(code).toContain('outerStyle={s.ctaOuter} style={s.cta}>');
    expect(code).toContain('<Text style={s.ctaText}>{copy.cta}</Text>');
    expect(code).toContain('accessibilityLabel={`${copy.cta}: ${nextTask.title}`}');
  });

  it('строки — без левого кружка: значок 34/12, название не гаснет, справа ✓ оттенком кольца темы или счётчик; разделитель 1 сверху', () => {
    expect(code).not.toMatch(/s\.ck\b|ckRing/);
    expect(code).toContain("ic: { width: 34, height: 34, borderRadius: 12,");
    expect(code).toContain("row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 8 },");
    expect(code).toContain('<Text style={[s.rowTitle, { color: card.text }]} numberOfLines={2}>{task.title}</Text>');
    expect(code).toContain('<Ionicons name="checkmark" size={16} color={doneTick} />');
    expect(code).toContain('const doneTick = useMemo(() => todayRingOnCard(tokens.todayRingDone, card, TODAY_RING_ON_CARD_MIN[0]), [tokens.todayRingDone, card]);');
    expect(code).toContain('index > 0 ? { borderTopColor: separator, borderTopWidth: 1 } : null');
    expect(code).toContain('borderRadius: 24, paddingTop: 14, paddingHorizontal: 16, paddingBottom: 6 },');
    expect(code).not.toContain('ringColors');
  });
});

describe('подпись кнопки «Начать» на 9 языках', () => {
  const t = (kind: TodaySceneTaskInput['kind'], progress: number, target: number): TodaySceneTaskInput => ({ kind, progress, target, done: progress >= target });
  it.each(LANGS)('%s: подпись есть во всех состояниях с кнопкой', (lang) => {
    for (const [tasks, hour] of [
      [[t('lesson', 0, 1), t('dialog', 0, 1), t('cards', 0, 10)], 9],
      [[t('lesson', 1, 1), t('dialog', 0, 1), t('cards', 6, 10)], 14],
      [[t('lesson', 0, 1), t('dialog', 0, 1), t('cards', 0, 10)], 21],
    ] as const) {
      const decision = pickTodaySceneState({ tasks: [...tasks], hour, streakDays: 5, dayCounted: false });
      const c = buildTodaySceneCopy({ lang, decision, remainingKinds: tasks.filter((x) => !x.done).map((x) => x.kind), streakDays: 5, minutesToMidnight: 140, dateLabel: null });
      expect(c.cta.trim().length).toBeGreaterThan(0);
    }
  });
  it('русский — «Начать», как у кнопки сцены Главной', () => {
    const decision = pickTodaySceneState({ tasks: [t('lesson', 1, 1), t('dialog', 0, 1), t('cards', 6, 10)], hour: 14, streakDays: 5, dayCounted: true });
    expect(buildTodaySceneCopy({ lang: 'ru', decision, remainingKinds: ['dialog', 'cards'], streakDays: 5, minutesToMidnight: 140, dateLabel: null }).cta).toBe('Начать');
  });
});
