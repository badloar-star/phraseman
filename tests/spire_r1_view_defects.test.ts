// зачем (дефекты вида Шпиля по реестру R1, 15.10; docs/phraseman-2.0/SPIRE_CODE_DEFECTS_R1.md): стрелка кнопок у правого края, монеты без «+»,
// «Позже» в провале — таблетка, «не сохранилась» без подписи, начертание «откроется чуть позже», пейджер тура.
import { readFileSync } from 'fs';
import { join } from 'path';

const read = (name: string) => readFileSync(join(__dirname, '..', 'components', 'spire', name), 'utf8').replace(/\r\n/g, '\n');

describe('Шпиль R1: дефекты вида', () => {
  it('стрелка кнопок у правого края (kit `.cta .ar`)', () => {
    for (const f of ['SpireClimbDock.tsx', 'SpireTour.tsx', 'SpireResultPanel.tsx']) {
      const src = read(f);
      expect(src).toMatch(/arrow: \{ position: 'absolute', right: 22 \}/);
      expect(src).toMatch(/<View pointerEvents="none" style=\{s\.arrow\}>/);
    }
  });
  it('итог ступени: монеты без «+», «Позже» таблеткой только при провале, у «не сохранилась» нет подписи', () => {
    const src = read('SpireResultPanel.tsx');
    expect(src).toContain('{String(amount)}');
    expect(src).not.toContain('`+${amount}`');
    expect(src).toMatch(/ghostPill: !saveFailed/);
    expect(src).toMatch(/sub: saveFailed \? '' :/);
    expect(src).toMatch(/\{v\.sub \? <Text/);
  });
  it('«откроется чуть позже»: 24/30, 800; пейджер тура: активная точка 22×7', () => {
    expect(read('SpireLockedState.tsx')).toMatch(/fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: -0\.3/);
    const tour = read('SpireTour.tsx');
    expect(tour).toMatch(/dot: \{ width: 7, height: 7, borderRadius: 4 \}/);
    expect(tour).toMatch(/dotOn: \{ width: 22 \}/);
  });
});
