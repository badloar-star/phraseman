import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { useEffect, useState } from 'react';
import { act, renderHook } from '@testing-library/react-native';

type Card = Readonly<{ id: string; kind: 'exam' | 'episode'; chapterOrdinal: number }>;
type RuntimeProps = Readonly<{ selected: number; isTabPage: boolean; runtimeOwnerId: string; screenFocused: boolean; appActive: boolean }>;

const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'learning-v2', 'season', 'SeasonCourse.tsx'), 'utf8');

function extractCooldownSource(): { runtimeDeclaration: string; lifecycle: string } {
  const file = ts.createSourceFile('SeasonCourse.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let runtimeDeclaration = '';
  let lifecycleStart = -1;
  let lifecycleEnd = -1;
  const visit = (node: ts.Node): void => {
    if (ts.isVariableStatement(node) && node.getText(file).includes('courseRuntimeActive')) runtimeDeclaration = node.getText(file);
    if (ts.isVariableStatement(node) && node.getText(file).includes('const [examNowMs, setExamNowMs]')) lifecycleStart = node.getStart(file);
    if (lifecycleStart >= 0 && ts.isVariableStatement(node) && node.getText(file).includes('const currentCard = deck.cards[deck.currentIndex]')) lifecycleEnd = node.getStart(file);
    ts.forEachChild(node, visit);
  };
  visit(file);
  if (lifecycleStart < 0 || lifecycleEnd < 0) throw new Error('exam cooldown lifecycle source was not found');
  return { runtimeDeclaration, lifecycle: source.slice(lifecycleStart, lifecycleEnd) };
}

const extracted = extractCooldownSource();
const runActualCooldownLifecycle = new Function(
  'useState', 'useEffect', 'Date', 'setInterval', 'clearInterval', 'deck', 'selected', 'props', 'isTabPage', 'runtimeOwnerId', 'useRuntimeActive', 'fallbackRuntimeActive',
  `${extracted.runtimeDeclaration || 'const courseRuntimeActive = fallbackRuntimeActive;'}\n${extracted.lifecycle}\nreturn { examNowMs, selectedExamCard, selectedExamCooldown, courseRuntimeActive };`,
) as (
  useState: typeof useState, useEffect: typeof useEffect, Date: { now: () => number }, setInterval: (fn: () => void, delay: number) => number, clearInterval: (id: number) => void,
  deck: { cards: Card[] }, selected: number, props: { examStatus?: (chapterOrdinal: number, nowMs: number) => { state: 'cooldown' | 'available' } },
  isTabPage: boolean, runtimeOwnerId: string, useRuntimeActive: (ownerVisible: boolean) => boolean, fallbackRuntimeActive: boolean,
) => { examNowMs: number; selectedExamCard: Card | null; selectedExamCooldown: boolean; courseRuntimeActive: boolean };

function createClock() {
  let now = 10;
  let nextId = 1;
  const callbacks = new Map<number, () => void>();
  return {
    Date: { now: jest.fn(() => now) },
    setNow: (value: number) => { now = value; },
    setInterval: jest.fn((callback: () => void, delay: number) => { expect(delay).toBe(30_000); const id = nextId++; callbacks.set(id, callback); return id; }),
    clearInterval: jest.fn((id: number) => { callbacks.delete(id); }),
    callbacks,
  };
}

const deck = { cards: [
  { id: 'exam-1', kind: 'exam' as const, chapterOrdinal: 1 },
  { id: 'exam-2', kind: 'exam' as const, chapterOrdinal: 2 },
] };
const examStatus = (_chapter: number, nowMs: number) => ({ state: nowMs < 100 ? 'cooldown' as const : 'available' as const });

function mountActualLifecycle(clock: ReturnType<typeof createClock>, initialProps: RuntimeProps) {
  return renderHook((runtime: RuntimeProps) => runActualCooldownLifecycle(
    useState, useEffect, clock.Date, clock.setInterval, clock.clearInterval, deck, runtime.selected, { examStatus }, runtime.isTabPage, runtime.runtimeOwnerId,
    (ownerVisible) => runtime.screenFocused && runtime.appActive && ownerVisible,
    runtime.screenFocused && runtime.appActive && (!runtime.isTabPage || runtime.runtimeOwnerId === 'lessons'),
  ), { initialProps });
}

describe('season exam cooldown runtime lifecycle', () => {
  test('stops cadence while retained lessons virtual tab is hidden and refreshes immediately on return', async () => {
    const clock = createClock();
    const harness = await mountActualLifecycle(clock, { selected: 0, isTabPage: true, runtimeOwnerId: 'lessons', screenFocused: true, appActive: true });
    expect(clock.setInterval).toHaveBeenCalledTimes(1);
    await act(async () => harness.rerender({ selected: 0, isTabPage: true, runtimeOwnerId: 'home', screenFocused: true, appActive: true }));
    expect(clock.clearInterval).toHaveBeenCalledTimes(1);
    expect(clock.callbacks.size).toBe(0);
    clock.setNow(101);
    await act(async () => harness.rerender({ selected: 0, isTabPage: true, runtimeOwnerId: 'lessons', screenFocused: true, appActive: true }));
    expect(harness.result.current.examNowMs).toBe(101);
    expect(harness.result.current.selectedExamCooldown).toBe(false);
    expect(clock.setInterval).toHaveBeenCalledTimes(1);
  });

  test('keeps pushed course active, clears on blur/background, refreshes selection, and cleans up', async () => {
    const clock = createClock();
    const harness = await mountActualLifecycle(clock, { selected: 0, isTabPage: false, runtimeOwnerId: 'home', screenFocused: true, appActive: true });
    expect(clock.setInterval).toHaveBeenCalledTimes(1);
    clock.setNow(20);
    await act(async () => harness.rerender({ selected: 1, isTabPage: false, runtimeOwnerId: 'home', screenFocused: true, appActive: true }));
    expect(harness.result.current.examNowMs).toBe(20);
    expect(clock.clearInterval).toHaveBeenCalledTimes(1);
    expect(clock.setInterval).toHaveBeenCalledTimes(2);
    await act(async () => harness.rerender({ selected: 1, isTabPage: false, runtimeOwnerId: 'home', screenFocused: false, appActive: true }));
    expect(clock.clearInterval).toHaveBeenCalledTimes(2);
    await act(async () => harness.rerender({ selected: 1, isTabPage: false, runtimeOwnerId: 'home', screenFocused: true, appActive: false }));
    expect(clock.setInterval).toHaveBeenCalledTimes(2);
    clock.setNow(30);
    await act(async () => harness.rerender({ selected: 1, isTabPage: false, runtimeOwnerId: 'home', screenFocused: true, appActive: true }));
    expect(harness.result.current.examNowMs).toBe(30);
    expect(clock.setInterval).toHaveBeenCalledTimes(3);
    await act(async () => harness.unmount());
    expect(clock.clearInterval).toHaveBeenCalledTimes(3);
  });

  test('updates on the actual cadence callback and clears when that tick reaches expiry', async () => {
    const clock = createClock();
    const harness = await mountActualLifecycle(clock, { selected: 0, isTabPage: true, runtimeOwnerId: 'lessons', screenFocused: true, appActive: true });
    const tick = [...clock.callbacks.values()][0];
    expect(tick).toBeDefined();

    clock.setNow(50);
    await act(async () => tick?.());
    expect(harness.result.current.examNowMs).toBe(50);
    expect(harness.result.current.selectedExamCooldown).toBe(true);

    clock.setNow(101);
    await act(async () => tick?.());
    expect(harness.result.current.examNowMs).toBe(101);
    expect(harness.result.current.selectedExamCooldown).toBe(false);
    expect(clock.clearInterval).toHaveBeenCalledTimes(1);
    expect(clock.callbacks.size).toBe(0);
  });
});
