import React from 'react';
import { Pressable, Text } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import LearningV2PulseCourse from '../components/learning-v2/LearningV2PulseCourse';
import { LEARNING_V2_OWNER_EN_TITLES_RU } from '../components/learning-v2/learningV2OwnerLayout';
import { isPulseLessonAuthored, isPulseLessonAvailable, pulseMapGeometry, pulseMapOffsetX } from '../components/learning-v2/learningV2PulseGeometry';
import { prepareLearningV2CourseAccordionProgressV1 } from '../modules/learning-v2/map/course_accordion_map_model_v1';

const mockScrollToOffset = jest.fn();
const mockScrollToIndex = jest.fn();
jest.mock('react-native', () => {
  const React = require('react');
  return {
    View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView',
    StyleSheet: { create: (x: unknown) => x, flatten: (x: unknown) => Array.isArray(x) ? Object.assign({}, ...x.filter(Boolean)) : x },
    Platform: { OS: 'ios', select: (x: Record<string, unknown>) => x.ios },
    BackHandler: { addEventListener: () => ({ remove: jest.fn() }) },
    FlatList: React.forwardRef(function MockFlatList({ data, renderItem, ...props }: { data: unknown[]; renderItem: (x: unknown) => unknown }, ref: unknown) {
      React.useImperativeHandle(ref, () => ({ scrollToOffset: mockScrollToOffset, scrollToIndex: mockScrollToIndex }));
      return React.createElement('View', props, data.map((item: unknown, index: number) => React.createElement(React.Fragment, { key: index }, renderItem({ item, index }))));
    }),
  };
});
jest.mock('../components/ThemeContext', () => ({ useTheme: () => ({ theme: require('../constants/theme').INDIGO }) }));
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('../components/PressableHybrid', () => 'PressableHybrid');
jest.mock('react-native-svg', () => ({ __esModule: true, default: 'Svg', Circle: 'Circle', Path: 'Path' }));
jest.mock('../components/LearningV2MapNode', () => ({ LearningV2MapNode: ({ children, onPress, testID, accessible, accessibilityLabel }: { children: React.ReactNode; onPress: () => void; testID: string; accessible: boolean; accessibilityLabel: string }) => require('react').createElement('Pressable', { onPress, testID, accessibilityLabel, accessibilityState: { disabled: !accessible } }, children) }));
jest.mock('react-native-reanimated', () => ({
  __esModule: true, default: { View: 'View' }, cancelAnimation: jest.fn(),
  Easing: { sin: 0, inOut: () => 0 }, useAnimatedStyle: (fn: () => unknown) => fn(),
  useSharedValue: (value: number) => require('react').useRef({ value }).current,
  withRepeat: (value: number) => value, withTiming: (value: number) => value,
}));

const completed = ['lesson-01:session:01'];
function props(currentSessionId = 'lesson-01:session:25') {
  return {
    titles: LEARNING_V2_OWNER_EN_TITLES_RU, lang: 'ru' as const, scopeKey: 'owner-test',
    preparedProgress: prepareLearningV2CourseAccordionProgressV1({ completedSessionIds: completed, currentSessionId }),
    currentSessionId, completedSessionIds: completed, stars: {}, active: true, reducedMotion: true,
    devUnlockAll: false, bottomPadding: 20, onExpandedLesson: jest.fn(), onUnavailableLessonPress: jest.fn(), onSessionPress: jest.fn(),
    onLockedLessonPress: jest.fn(), onSessionCompleted: jest.fn(), onDictionary: jest.fn(),
    legacyLessonsLabel: 'Старые уроки', onLegacyLessons: jest.fn(),
  };
}

describe('owner-selected course', () => {
  beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); global.requestAnimationFrame = cb => setTimeout(() => cb(0), 0) as unknown as number; global.cancelAnimationFrame = id => clearTimeout(id); });
  afterEach(() => { jest.runOnlyPendingTimers(); jest.useRealTimers(); });
  it('shows only the selected CEFR level while keeping the full course reachable', async () => {
    const p = props();
    const view = await render(<LearningV2PulseCourse {...p} />);
    for (const title of LEARNING_V2_OWNER_EN_TITLES_RU.slice(0, 8)) expect(view.getByText(title)).toBeTruthy();
    for (const title of LEARNING_V2_OWNER_EN_TITLES_RU.slice(8)) expect(view.queryByText(title)).toBeNull();
    expect(view.queryByText('Войти в мир')).toBeNull();
    expect(view.queryByText('Весь курс')).toBeNull();
    expect(view.getByText('Старые уроки')).toBeTruthy();
    expect(view.queryByText('Диалоги')).toBeNull();
    expect(view.queryByTestId('learning-v2-open-dialogs')).toBeNull();
    await fireEvent.press(view.getByTestId('learning-v2-open-legacy-lessons'));
    expect(p.onLegacyLessons).toHaveBeenCalledTimes(1);

    await fireEvent.press(view.getByText('A2'));
    for (const title of LEARNING_V2_OWNER_EN_TITLES_RU.slice(0, 8)) expect(view.queryByText(title)).toBeNull();
    for (const title of LEARNING_V2_OWNER_EN_TITLES_RU.slice(8, 16)) expect(view.getByText(title)).toBeTruthy();
    for (const title of LEARNING_V2_OWNER_EN_TITLES_RU.slice(16)) expect(view.queryByText(title)).toBeNull();

    await fireEvent.press(view.getByText('B1'));
    for (const title of LEARNING_V2_OWNER_EN_TITLES_RU.slice(0, 16)) expect(view.queryByText(title)).toBeNull();
    for (const title of LEARNING_V2_OWNER_EN_TITLES_RU.slice(16)) expect(view.getByText(title)).toBeTruthy();
    expect(mockScrollToIndex).not.toHaveBeenCalled();
  });
  it('opens on the level containing the current lesson', async () => {
    const view = await render(<LearningV2PulseCourse {...props('lesson-17:session:25')} />);
    expect(view.getByTestId('learning-v2-level-B1').props.accessibilityState).toEqual({ selected: true });
    expect(view.getByText(LEARNING_V2_OWNER_EN_TITLES_RU[16])).toBeTruthy();
    expect(view.queryByText(LEARNING_V2_OWNER_EN_TITLES_RU[0])).toBeNull();
  });
  it('opens authored lessons sequentially, keeps unfinished lessons in work, and lets DEV open all', async () => {
    expect(isPulseLessonAvailable(1)).toBe(true);
    expect(isPulseLessonAvailable(2)).toBe(false);
    const lessonOneComplete = new Set(Array.from({ length: 56 }, (_, index) => `lesson-01:session:${String(index + 1).padStart(2, '0')}`));
    expect(isPulseLessonAvailable(2, lessonOneComplete)).toBe(true);
    expect(isPulseLessonAuthored(3)).toBe(false);
    expect(isPulseLessonAvailable(3, lessonOneComplete)).toBe(false);
    expect(isPulseLessonAvailable(32, lessonOneComplete, true)).toBe(true);
    const p = props(); const view = await render(<LearningV2PulseCourse {...p} />);
    await fireEvent.press(view.getByTestId('learning-v2-pulse-lesson-2'));
    expect(p.onLockedLessonPress).toHaveBeenCalledWith(2);
    await fireEvent.press(view.getByTestId('learning-v2-pulse-lesson-3'));
    expect(p.onUnavailableLessonPress).toHaveBeenCalledWith(3);
    expect(p.onExpandedLesson).not.toHaveBeenCalled();
    expect(view.queryByTestId('learning-v2-pulse-map')).toBeNull();
  });
  it('supports the exact original lesson-card renderer instead of duplicating card chrome', async () => {
    const p = props(); const renderLessonCard = jest.fn(({ title, onPress, isAvailable }) => (
      <Pressable testID={`original-${title}`} onPress={onPress}><Text>{isAvailable ? 'ready' : 'work'}</Text></Pressable>
    ));
    const view = await render(<LearningV2PulseCourse {...p} renderLessonCard={renderLessonCard} />);
    expect(renderLessonCard).toHaveBeenCalledTimes(8);
    expect(renderLessonCard.mock.calls[0][0]).toMatchObject({ ordinal: 1, isAvailable: true });
    expect(renderLessonCard.mock.calls[2][0]).toMatchObject({ ordinal: 3, isAvailable: false });
    await fireEvent.press(view.getByTestId(`original-${LEARNING_V2_OWNER_EN_TITLES_RU[2]}`));
    expect(p.onUnavailableLessonPress).toHaveBeenCalledWith(3);
  });
  it('shows all 56 nodes, centers current after layout and preserves the access callback state', async () => {
    const p = props(); const view = await render(<LearningV2PulseCourse {...p} />);
    await fireEvent.press(view.getByTestId('learning-v2-pulse-lesson-1'));
    expect(p.onExpandedLesson).toHaveBeenCalledWith(1);
    const map = view.getByTestId('learning-v2-pulse-map');
    await fireEvent(map.parent!, 'layout', { nativeEvent: { layout: { width: 390, height: 600 } } });
    await act(async () => { jest.runOnlyPendingTimers(); });
    expect(mockScrollToOffset).toHaveBeenLastCalledWith({ offset: 24 * 128, animated: false });
    expect(view.getByTestId('learning-v2-pulse-session-56')).toBeTruthy();
    await fireEvent.press(view.getByTestId('learning-v2-pulse-session-25'));
    expect(p.onSessionPress).toHaveBeenCalledWith(1, 25, 'current');
    await fireEvent.press(view.getByTestId('learning-v2-pulse-session-56'));
    expect(p.onSessionPress).toHaveBeenLastCalledWith(1, 56, 'locked');
    expect(view.queryByText('Продолжить')).toBeNull();
  });
  it('places the first session near the top instead of centering an empty half-screen above it', () => {
    const h = 600; const g = pulseMapGeometry(h, 1);
    const centerInViewport = g.padding + g.step / 2 - g.offset;
    expect(centerInViewport).toBeGreaterThanOrEqual(100);
    expect(centerInViewport).toBeLessThanOrEqual(150);
    expect(centerInViewport).toBeLessThan(h / 2);
  });
  it.each([25, 56])('can center session %i without clamping against either content edge', ordinal => {
    const h = 600; const g = pulseMapGeometry(h, ordinal);
    const centerInViewport = g.padding + (ordinal - 1) * g.step + g.step / 2 - g.offset;
    expect(centerInViewport).toBe(h / 2);
    const totalHeight = 56 * g.step + 2 * g.padding;
    expect(g.offset).toBeGreaterThanOrEqual(0);
    expect(g.offset).toBeLessThanOrEqual(totalHeight - h);
  });
  it('makes every session visibly and functionally available in DEV unlock mode', async () => {
    const p = { ...props(), devUnlockAll: true }; const view = await render(<LearningV2PulseCourse {...p} />);
    await fireEvent.press(view.getByTestId('learning-v2-pulse-lesson-8'));
    expect(p.onExpandedLesson).toHaveBeenCalledWith(8);
    const last = view.getByTestId('learning-v2-pulse-session-56');
    expect(last.props.accessibilityState).toEqual({ disabled: false });
    expect(last.props.accessibilityLabel).toMatch(/доступно/i);
    expect(view.getByTestId('learning-v2-pulse-session-icon-56').props.name).not.toBe('lock-closed');
    await fireEvent.press(last);
    expect(p.onSessionPress).toHaveBeenLastCalledWith(8, 56, 'locked');
  });
  it('keeps each 101px node in the usable width even on narrow phones', () => {
    for (const width of [280, 320, 390, 768]) for (let i = 0; i < 56; i++) {
      expect(Math.abs(pulseMapOffsetX(i, width)) + 101 / 2).toBeLessThanOrEqual(width / 2 - 24);
    }
  });
});
