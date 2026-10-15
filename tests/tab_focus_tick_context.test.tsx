// зачем (координатор 14.10, каскад [TABS-RENDER], патч TABS_RENDER_2): focusTick растёт на каждый возврат фокуса группе вкладок (закрыли пейвол,
// вернулись из урока). В общем TabContext он будил всех потребителей useTabNav — и тех, кому он не нужен. Тест рендером: смена focusTick будит
// только подписчиков useTabFocusTick, смена activeIdx — только подписчиков useTabNav; useTabNav() больше не отдаёт focusTick.
import fs from 'fs';
import path from 'path';
import React from 'react';
import { act, render } from '@testing-library/react-native';

// tests/__mocks__/react-native.js — общая заглушка для логических тестов; рендеру нужен настоящий модуль (как в friend_list_row).
jest.unmock('react-native');

import { TabProvider, TabRuntimeOwnerOverride, useTabFocusTick, useTabNav } from '../app/TabContext';

const counts = { nav: 0, focus: 0 };
const seenTicks: number[] = [];
const seenNavKeys: string[][] = [];

const NavProbe = React.memo(function NavProbe() {
  seenNavKeys.push(Object.keys(useTabNav()).sort());
  counts.nav += 1;
  return null;
});
const FocusProbe = React.memo(function FocusProbe() {
  seenTicks.push(useTabFocusTick());
  counts.focus += 1;
  return null;
});

const noop = () => undefined;

function Host({ activeIdx, focusTick }: { activeIdx: number; focusTick: number }) {
  return (
    <TabProvider activeIdx={activeIdx} onTabChange={noop} onSwipeStart={noop} onSwipeComplete={noop} focusTick={focusTick}>
      <NavProbe />
      <TabRuntimeOwnerOverride runtimeOwnerId="friends">
        <FocusProbe />
      </TabRuntimeOwnerOverride>
    </TabProvider>
  );
}

beforeEach(() => {
  counts.nav = 0;
  counts.focus = 0;
  seenTicks.length = 0;
  seenNavKeys.length = 0;
});

describe('TabContext: focusTick lives in its own context', () => {
  it('a focus return wakes only useTabFocusTick subscribers', async () => {
    const view = await render(<Host activeIdx={0} focusTick={0} />);
    expect(counts).toEqual({ nav: 1, focus: 1 });
    await act(async () => { view.rerender(<Host activeIdx={0} focusTick={1} />); });
    expect(counts).toEqual({ nav: 1, focus: 2 });
    expect(seenTicks).toEqual([0, 1]);
  });

  it('a tab change wakes useTabNav subscribers but not focus subscribers', async () => {
    const view = await render(<Host activeIdx={0} focusTick={3} />);
    await act(async () => { view.rerender(<Host activeIdx={2} focusTick={3} />); });
    expect(counts).toEqual({ nav: 2, focus: 1 });
  });

  it('useTabNav() no longer exposes focusTick', async () => {
    await render(<Host activeIdx={0} focusTick={0} />);
    expect(seenNavKeys[0]).toEqual(['activeIdx', 'goHome', 'goToTab', 'onSwipeComplete', 'onSwipeStart', 'runtimeOwnerId']);
  });
});

describe('screens that refresh on focus read it from the dedicated hook', () => {
  const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  it.each(['home', 'lessons', 'friends', 'settings'])('%s', (name) => {
    const src = read(`app/(tabs)/${name}.tsx`);
    expect(src).toContain('const focusTick = useTabFocusTick();');
    expect(src).not.toMatch(/\{[^}]*\bfocusTick\b[^}]*\} = useTabNav\(\)/);
  });
});
