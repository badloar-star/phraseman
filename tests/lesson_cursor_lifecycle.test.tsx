import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import React, { useEffect } from 'react';
import { act, renderHook } from '@testing-library/react-native';

type CursorAnim = {
  stopAnimation: jest.Mock;
  setValue: jest.Mock;
};

type Loop = {
  start: jest.Mock;
  stop: jest.Mock;
};

const lessonSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson1.tsx'), 'utf8');

function extractCursorEffect(): { declaration: string; effect: string } {
  const sourceFile = ts.createSourceFile('lesson1.tsx', lessonSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let cursorEffect: ts.CallExpression | undefined;
  let hasSelectedWordsDeclaration: ts.VariableStatement | undefined;

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
      && node.expression.text === 'useEffect'
      && node.arguments.length === 2
      && node.arguments[0].getText(sourceFile).includes('cursorAnim.stopAnimation()')
      && node.arguments[0].getText(sourceFile).includes('Animated.loop')
    ) {
      cursorEffect = node;
      return;
    }
    if (
      ts.isVariableStatement(node)
      && node.declarationList.declarations.some(
        declaration => ts.isIdentifier(declaration.name) && declaration.name.text === 'hasSelectedWords',
      )
    ) {
      hasSelectedWordsDeclaration = node;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  if (!cursorEffect) throw new Error('cursor lifecycle effect was not found in lesson1.tsx');
  return {
    declaration: hasSelectedWordsDeclaration?.getText(sourceFile) ?? '',
    effect: cursorEffect.getText(sourceFile),
  };
}

const extractedCursorEffect = extractCursorEffect();
const sourceEffect = new Function(
  'useEffect',
  'Animated',
  'lessonRuntimeActive',
  'selectedWords',
  'cursorAnim',
  `${extractedCursorEffect.declaration}; return (${extractedCursorEffect.effect});`,
) as (
  effect: typeof useEffect,
  Animated: { loop: jest.Mock; sequence: jest.Mock; timing: jest.Mock },
  lessonRuntimeActive: boolean,
  selectedWords: string[],
  cursorAnim: CursorAnim,
) => void;

function createAnimatedHarness() {
  const loops: Loop[] = [];
  const Animated = {
    timing: jest.fn((value: CursorAnim, config: unknown) => ({ value, config })),
    sequence: jest.fn((animations: unknown[]) => ({ animations })),
    loop: jest.fn((animation: unknown) => {
      const loop = { animation, start: jest.fn(), stop: jest.fn() } as unknown as Loop;
      loops.push(loop);
      return loop;
    }),
  };
  return { Animated, loops };
}

function mountCursorEffect(
  cursorAnim: CursorAnim,
  Animated: ReturnType<typeof createAnimatedHarness>['Animated'],
  initialProps = { active: true, words: [] as string[] },
  wrapper?: React.ComponentType<React.PropsWithChildren>,
) {
  return renderHook(
    ({ active, words }) => sourceEffect(
      useEffect,
      Animated,
      active,
      words,
      cursorAnim,
    ),
    { initialProps, wrapper },
  );
}

describe('lesson cursor lifecycle', () => {
  test('resets once when composition begins and not again for 1 to 2 to 3 words', async () => {
    const cursorAnim: CursorAnim = { stopAnimation: jest.fn(), setValue: jest.fn() };
    const { Animated, loops } = createAnimatedHarness();
    const harness = await mountCursorEffect(cursorAnim, Animated);

    expect(loops).toHaveLength(1);
    expect(loops[0].start).toHaveBeenCalledTimes(1);

    await act(async () => harness.rerender({ active: true, words: ['one'] }));
    expect(cursorAnim.stopAnimation).toHaveBeenCalledTimes(1);
    expect(cursorAnim.setValue).toHaveBeenCalledWith(1);

    await act(async () => harness.rerender({ active: true, words: ['one', 'two'] }));
    await act(async () => harness.rerender({ active: true, words: ['one', 'two', 'three'] }));

    expect(cursorAnim.stopAnimation).toHaveBeenCalledTimes(1);
    expect(cursorAnim.setValue).toHaveBeenCalledTimes(1);
  });

  test('keeps composing solid through undo, restarts blinking when empty, and handles activity transitions', async () => {
    const cursorAnim: CursorAnim = { stopAnimation: jest.fn(), setValue: jest.fn() };
    const { Animated, loops } = createAnimatedHarness();
    const harness = await mountCursorEffect(cursorAnim, Animated, { active: true, words: ['one', 'two', 'three'] });

    expect(cursorAnim.stopAnimation).toHaveBeenCalledTimes(1);
    expect(cursorAnim.setValue).toHaveBeenCalledWith(1);

    await act(async () => harness.rerender({ active: true, words: ['one', 'two'] }));
    expect(cursorAnim.stopAnimation).toHaveBeenCalledTimes(1);

    await act(async () => harness.rerender({ active: true, words: [] }));
    expect(loops).toHaveLength(1);
    expect(loops[0].start).toHaveBeenCalledTimes(1);

    await act(async () => harness.rerender({ active: false, words: [] }));
    expect(cursorAnim.stopAnimation).toHaveBeenCalledTimes(2);
    expect(cursorAnim.setValue).toHaveBeenCalledTimes(2);

    await act(async () => harness.rerender({ active: true, words: [] }));
    expect(loops).toHaveLength(2);
    expect(loops[1].start).toHaveBeenCalledTimes(1);

    await act(async () => harness.rerender({ active: false, words: ['one'] }));
    expect(cursorAnim.stopAnimation).toHaveBeenCalledTimes(3);
    await act(async () => harness.rerender({ active: true, words: ['one'] }));
    expect(cursorAnim.stopAnimation).toHaveBeenCalledTimes(4);
  });

  test('cleans up the wrapper lifecycle and a controlled replay without leaking loops', async () => {
    const cursorAnim: CursorAnim = { stopAnimation: jest.fn(), setValue: jest.fn() };
    const { Animated, loops } = createAnimatedHarness();
    const StrictMode = ({ children }: React.PropsWithChildren) => <React.StrictMode>{children}</React.StrictMode>;
    const harness = await mountCursorEffect(cursorAnim, Animated, { active: true, words: [] }, StrictMode);

    expect(loops).toHaveLength(1);
    await act(async () => harness.unmount());
    expect(loops[0].stop).toHaveBeenCalledTimes(1);

    const replay = await mountCursorEffect(cursorAnim, Animated);
    expect(loops).toHaveLength(2);
    expect(loops[1].start).toHaveBeenCalledTimes(1);
    await act(async () => replay.unmount());
    expect(loops[1].stop).toHaveBeenCalledTimes(1);
  });
});
