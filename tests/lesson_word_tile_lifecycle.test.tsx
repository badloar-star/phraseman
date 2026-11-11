import fs from 'fs';
import path from 'path';
import React from 'react';
import { render } from '@testing-library/react-native';
import DuoPressable from '../components/DuoPressable';

let mockSharedValueInitializations = 0;
let mockAnimatedStyleInitializations = 0;
let mockNativePressTargetMounts = 0;
let mockNativePressTargetUnmounts = 0;

jest.mock('react-native', () => {
  const MockReact = require('react');
  const Pressable = ({ children, onPress, ...props }: Record<string, any>) => {
    MockReact.useState(() => {
      mockNativePressTargetMounts += 1;
      return null;
    });
    MockReact.useEffect(() => () => {
      mockNativePressTargetUnmounts += 1;
    }, []);
    return MockReact.createElement('NativePressTarget', { ...props, onPress }, children);
  };
  return {
    Pressable,
    View: ({ children, ...props }: Record<string, unknown>) => MockReact.createElement('View', props, children),
    StyleSheet: {
      create: (styles: unknown) => styles,
      flatten: (style: unknown) => style,
      absoluteFillObject: {},
      absoluteFill: {},
    },
  };
});

jest.mock('react-native-reanimated', () => {
  const MockReact = require('react');
  return {
    __esModule: true,
    default: { View: ({ children, ...props }: Record<string, unknown>) => MockReact.createElement('AnimatedSurface', props, children) },
    useSharedValue: (initial: number) => MockReact.useState(() => {
      mockSharedValueInitializations += 1;
      return { value: initial };
    })[0],
    useAnimatedStyle: (factory: () => unknown) => {
      MockReact.useState(() => {
        mockAnimatedStyleInitializations += 1;
        return null;
      });
      return factory();
    },
    withSpring: (value: number) => value,
    withTiming: (value: number) => value,
    cancelAnimation: jest.fn(),
  };
});

jest.mock('../components/SafeLinearGradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn() }));
jest.mock('../hooks/use_reduce_motion', () => ({ useReduceMotion: () => false }));

const lessonSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson1.tsx'), 'utf8');
const optionsStart = lessonSource.indexOf('{wordOptionItems.map(');
const optionsEnd = lessonSource.indexOf('{/* ГОРИЗОНТАЛЬНЫЙ ПРОГРЕСС-БАР */}', optionsStart);
const optionsBlock = lessonSource.slice(optionsStart, optionsEnd);

type KeyFactory = (phraseEnterKey: string, phraseWordIdx: number, i: number, word: string) => React.Key;

function compileSourceKey(name: 'optionKey' | 'presentationSlotKey'): KeyFactory {
  const match = lessonSource.match(new RegExp(`const ${name} = ([^;]+);`));
  if (!match) throw new Error(`lesson1.tsx must declare ${name}`);
  return new Function('phraseEnterKey', 'phraseWordIdx', 'i', 'word', `return (${match[1]});`) as KeyFactory;
}

function SourceKeyedWordBank({
  phraseEnterKey,
  phraseWordIdx,
  words,
  onWord,
}: {
  phraseEnterKey: string;
  phraseWordIdx: number;
  words: string[];
  onWord: (word: string) => void;
}) {
  const optionKeyFor = compileSourceKey('optionKey');
  const slotKeyFor = compileSourceKey('presentationSlotKey');
  return React.createElement('WordBank', null, words.map((word, i) => {
    const optionKey = optionKeyFor(phraseEnterKey, phraseWordIdx, i, word);
    const presentationSlotKey = slotKeyFor(phraseEnterKey, phraseWordIdx, i, word);
    return React.createElement(React.Fragment, { key: presentationSlotKey },
      React.createElement(DuoPressable, {
        testID: `slot-${i}`,
        pressTargetKey: optionKey,
        onPress: () => onWord(word),
      } as any, React.createElement('Text', null, word)),
    );
  }));
}

describe('lesson word tile lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSharedValueInitializations = 0;
    mockAnimatedStyleInitializations = 0;
    mockNativePressTargetMounts = 0;
    mockNativePressTargetUnmounts = 0;
  });

  test('source separates stable presentation slots from full semantic press identity', () => {
    expect(lessonSource).toContain('const optionKey = `${phraseEnterKey}:${phraseWordIdx}:${i}:${word}`');
    expect(lessonSource).toContain('const presentationSlotKey = i;');
    expect(optionsBlock).toContain('key={presentationSlotKey}');
    expect(optionsBlock).toContain('pressTargetKey={optionKey}');
    expect(optionsBlock).toContain('const isFlashing = flashWord?.optionKey === optionKey');
    expect(optionsBlock).toContain('triggerWordFlash(optionKey, isCorrectOption)');
    expect(optionsBlock).toContain('disabled={wordDispatchPending}');
    expect(optionsBlock).toContain('}, WORD_DISPATCH_LOCK_MS);');
    expect(optionsBlock).toContain('handleWordPress(word)');
  });

  test('actual lesson keys retain press channels while remounting target style owners', async () => {
    const selected: string[] = [];
    const onWord = (word: string) => selected.push(word);
    const screen = await render(
      <SourceKeyedWordBank
        phraseEnterKey="phrase-a:hello"
        phraseWordIdx={0}
        words={['old-a', 'old-b', 'old-c', 'old-d']}
        onWord={onWord}
      />,
    );
    expect(mockSharedValueInitializations).toBe(12);
    expect(mockAnimatedStyleInitializations).toBe(4);
    expect(mockNativePressTargetMounts).toBe(4);
    await screen.rerender(
      <SourceKeyedWordBank
        phraseEnterKey="phrase-a:hello"
        phraseWordIdx={1}
        words={['new-a', 'new-b', 'new-c', 'new-d']}
        onWord={onWord}
      />,
    );
    expect(mockSharedValueInitializations).toBe(16);
    expect(mockAnimatedStyleInitializations).toBe(8);
    expect(mockNativePressTargetMounts).toBe(8);
    expect(mockNativePressTargetUnmounts).toBe(4);
    screen.getByTestId('slot-0').props.onPress();
    expect(selected).toEqual(['new-a']);
    await screen.unmount();
  });

  test('same-step contraction replacement and phrase replacement remount their native targets', async () => {
    const selected: string[] = [];
    const onWord = (word: string) => selected.push(word);
    const screen = await render(
      <SourceKeyedWordBank phraseEnterKey="phrase-a:do-not" phraseWordIdx={0} words={['do', 'does']} onWord={onWord} />,
    );
    expect(mockNativePressTargetMounts).toBe(2);
    await screen.rerender(
      <SourceKeyedWordBank phraseEnterKey="phrase-a:do-not" phraseWordIdx={0} words={['not', 'never']} onWord={onWord} />,
    );
    expect(mockNativePressTargetMounts).toBe(4);
    expect(mockNativePressTargetUnmounts).toBe(2);
    screen.getByTestId('slot-0').props.onPress();
    expect(selected).toEqual(['not']);

    await screen.rerender(
      <SourceKeyedWordBank phraseEnterKey="phrase-b:next" phraseWordIdx={0} words={['same', 'word']} onWord={onWord} />,
    );
    expect(mockNativePressTargetMounts).toBe(6);
    expect(mockNativePressTargetUnmounts).toBe(4);
    screen.getByTestId('slot-0').props.onPress();
    expect(selected).toEqual(['not', 'same']);
    expect(mockSharedValueInitializations).toBe(10);
    expect(mockAnimatedStyleInitializations).toBe(6);
    await screen.unmount();
  });
});
