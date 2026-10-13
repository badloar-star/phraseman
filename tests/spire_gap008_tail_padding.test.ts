// зачем (Макеты spire-gap-008): с подписью причины над кнопкой запас под списком 150 dp (в макете pb:150), без неё 120; раскладка пишется в [SPIRE-LAYOUT].
import { readFileSync } from 'fs';
import { join } from 'path';

const read = (...p: string[]) => readFileSync(join(__dirname, '..', ...p), 'utf8').replace(/\r\n/g, '\n');

describe('Шпиль: запас под нижней панелью с подписью', () => {
  const home = read('components', 'spire', 'SpireHomeScreen.tsx');
  it('120 / 150 с подписью блокировки / 300 с итогом, как в макете', () => {
    expect(home).toMatch(/const scrollTailPad = game\.outcome \? 300 : game\.startBlock \? 150 : 120;/);
    // зачем (координатор 13.10): макетные значения — ПОЛ; запас растёт, только если измеренный док выше (см. следующий тест)
    expect(home).toMatch(/paddingBottom: bottomPad \+ tailPad/);
    expect(home).toMatch(/const tailPad = Math\.max\(scrollTailPad, tailNeeded\);/);
    expect(home.indexOf('const scrollTailPad')).toBeGreaterThan(home.indexOf('const game = preview'));
  });
  it('лог раскладки [SPIRE-LAYOUT] стоит на панели, подписи, кнопке, списке и ряде друзей, только в dev', () => {
    const dock = read('components', 'spire', 'SpireClimbDock.tsx');
    for (const tag of ["'dock'", "'dock.note'", "'dock.cta'"]) expect(dock).toContain(`logSpireLayout(${tag}`);
    for (const tag of ["'scroll'", "'scroll.content'", "'friends+podium'", "'dock.wrap'"]) expect(home).toContain(`logSpireLayout(${tag}`);
    expect(read('components', 'spire', 'spire_layout_log.ts')).toMatch(/__DEV__ !== true/);
  });
  it('запас от измеренной высоты дока: dockH + зазор − подъём дока, для макетных состояний пол не меняется', () => {
    expect(home).toMatch(/const DOCK_LIFT = 24;/);
    expect(home).toMatch(/const DOCK_GAP = 16;/);
    // подъём дока в формуле тот же, что в стиле дока (bottomPad − 24)
    expect(home).toContain('style={[s.dock, { bottom: bottomPad - 24 }]}');
    expect(home).toMatch(/const tailNeeded = dockH > 0 \? Math\.ceil\(dockH \+ DOCK_GAP - DOCK_LIFT\) : 0;/);
    expect(home).toMatch(/setDockH\(\(prev\) => \(Math\.abs\(prev - h\) < 0\.5 \? prev : h\)\)/);
    expect(home).toContain("logSpireLayout('clearance'");
  });
  it('арифметика запаса на измеренных высотах дока из журналов Сверки: макетный пол достаточен, крупный шрифт его перерастает', () => {
    const needed = (dockH: number) => Math.ceil(dockH + 16 - 24);
    const floorOf = (kind: 'none' | 'block' | 'outcome') => (kind === 'outcome' ? 300 : kind === 'block' ? 150 : 120);
    // измерено в журналах: кнопка 51.8, с подписью 80–99.8, панели итога 232–272
    expect(Math.max(floorOf('none'), needed(51.8))).toBe(120);
    expect(Math.max(floorOf('block'), needed(99.8))).toBe(150);
    expect(Math.max(floorOf('outcome'), needed(272))).toBe(300);
    // панель выше 308 dp (например, крупный системный шрифт) раньше уходила под док — теперь запас растёт вместе с ней
    expect(Math.max(floorOf('outcome'), needed(340))).toBe(332);
    // зазор на конце прокрутки при полу: tail + подъём − высота дока ≥ зазора везде
    for (const [kind, h] of [['none', 51.8], ['block', 99.8], ['outcome', 272]] as const) {
      expect(Math.max(floorOf(kind), needed(h)) + 24 - h).toBeGreaterThanOrEqual(16);
    }
  });
});
