// зачем (координатор 13.10, строка 25 R1_BACKLOG; кадры spirecheck-001…004): кнопка «Играть» закрывала низ окна башни (этаж 1 скрыт, 2 наполовину), когда
// «Комната недели» переехала наверх. Окно башни теперь ровно до дока, но не ниже 260 и не выше 400 по макету.
import fs from 'node:fs';
import path from 'node:path';
import { SPIRE_WINDOW_MAX, SPIRE_WINDOW_MIN, spireTowerWindowHeight } from '../components/spire/spire_tower_window';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));

describe('высота окна башни до дока', () => {
  it('не измерено (0) — прежние 400 по макету', () => {
    expect(spireTowerWindowHeight(0, 734, 16)).toBe(SPIRE_WINDOW_MAX);
    expect(spireTowerWindowHeight(442, 0, 16)).toBe(SPIRE_WINDOW_MAX);
    expect(spireTowerWindowHeight(Number.NaN, 734, 16)).toBe(SPIRE_WINDOW_MAX);
  });

  it('кадр spirecheck: окно сверху 442, док 734, зазор 16 → 276 (нижние этажи выше кнопки)', () => {
    expect(spireTowerWindowHeight(442, 734, 16)).toBe(276);
  });

  it('места много — окно по макету 400; мало — не ниже 220 (было 260: карточка «Этаж N» вычитается из окна, 15.10); на высоких экранах (≥ 800) — не ниже 120', () => {
    expect(spireTowerWindowHeight(600, 734, 16, 915)).toBe(120);
    expect(spireTowerWindowHeight(600, 734, 16, 640)).toBe(SPIRE_WINDOW_MIN);
    expect(spireTowerWindowHeight(200, 900, 16)).toBe(400);
    expect(spireTowerWindowHeight(600, 734, 16)).toBe(SPIRE_WINDOW_MIN);
    expect(SPIRE_WINDOW_MIN).toBe(220);
    expect(SPIRE_WINDOW_MAX).toBe(400);
  });

  it('экран передаёт измерения башне, башня берёт высоту из пропа и повторно центрует свой этаж', () => {
    const home = read('components/spire/SpireHomeScreen.tsx');
    expect(home).toContain('const towerWindowH = spireTowerWindowHeight(towerTop, dockTop, DOCK_GAP + infoH, screenH);');
    expect(home).toContain('windowHeight={towerWindowH}');
    expect(home).toContain('setDockTop((prev) => (prev === dy ? prev : dy));');
    expect(home).toContain('setTowerTop((prev) => (prev === y ? prev : y))');
    const tower = read('components/spire/SpireTower.tsx');
    expect(tower).toContain('windowHeight?: number;');
    expect(tower).toContain('{ height: windowHeight, backgroundColor: g.plateFillFrom }');
    expect(tower).toContain("scrollToFloor(myFloor, false, 'окно-изменило-высоту')");
    expect(tower).not.toMatch(/WINDOW_HEIGHT \/ 2/); // центр считается по актуальной высоте окна (windowHeightRef), а не по константе
  });
});
