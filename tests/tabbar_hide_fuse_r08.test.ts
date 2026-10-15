// зачем (R08 🔴, координатор 15.10, предохранитель): карта курса V2 прятала таббар, и запоздавшее «спрятать» применялось уже на Главной —
// человек оставался без таббара и не мог никуда уйти. Сторож: прятать таббар может только вкладка «Обучение», пока она владеет экраном;
// разметка вкладок применяет скрытие только при visualIdx === 1; запрос и снятие — в layout-эффекте (тот же коммит). Сценарий
// «спрятал → ушёл на Главную → таббар виден» проверяется на самом провайдере.
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { act, render } from '@testing-library/react-native';

import { TabBarVisibilityProvider, useHideTabBar, useTabBarVisibility } from '../components/TabBarVisibilityContext';

// CRLF в рабочей копии Windows — нормализуем (сторож source_guard_eol_normalized)
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const h = React.createElement;

describe('R08 · предохранитель таббара', () => {
  it('«Обучение» прячет таббар только пока владеет экраном', () => {
    expect(read('app/(tabs)/lessons.tsx')).toContain('useHideTabBar(page === "v2" && lessonsTabVisible);');
  });

  it('разметка вкладок применяет скрытие только на вкладке «Обучение» и пишет [TABBAR-HIDE]', () => {
    const layout = read('app/(tabs)/_layout.tsx');
    expect(layout).toContain('const barHidden = tabBarHidden && visualIdx === 1;');
    expect(layout).toContain('{barHidden ? null : (');
    expect(layout).not.toContain('{tabBarHidden ? null : (');
    expect(layout).toContain("'[TABBAR-HIDE]'");
  });

  it('запрос скрытия — layout-эффект', () => {
    const ctx = read('components/TabBarVisibilityContext.tsx');
    expect(ctx).toMatch(/useLayoutEffect\(\(\) => \{\n\s*if \(!active\) \{/);
  });

  it('спрятал → ушёл с «Обучения» (запрос снят) → таббар виден', async () => {
    let hidden: boolean | null = null;
    const Probe = () => { hidden = useTabBarVisibility().hidden; return null; };
    const Lessons = ({ active }: { active: boolean }) => { useHideTabBar(active); return null; };
    const tree = (active: boolean, mounted: boolean) => h(TabBarVisibilityProvider, null, mounted ? h(Lessons, { active }) : null, h(Probe));
    const screen = await render(tree(true, true));
    expect(hidden).toBe(true);
    await act(async () => { await screen.rerender(tree(false, true)); }); // вкладка больше не владеет экраном
    expect(hidden).toBe(false);
    await act(async () => { await screen.rerender(tree(true, true)); });
    expect(hidden).toBe(true);
    await act(async () => { await screen.rerender(tree(true, false)); }); // размонтирование отпускает запрос
    expect(hidden).toBe(false);
  });
});
