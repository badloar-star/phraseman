import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('home weekly dot compact layout', () => {
  const source = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'home.tsx'), 'utf8');

  // зачем (координатор §46, 2026-10-01): компактные точки недели жили в
  // экспериментальной панели статуса Главной V1 (удалена 01.10). От них осталась
  // только пульсация точки дня — её и сторожим: не крутится вне активной Главной
  // и при «уменьшить движение».
  it('drops the V1 status week dots and gates the remaining day pulse', () => {
    expect(source).not.toContain('experimentalStatusWeekDotSize');
    const effectStart = source.indexOf('if (!weekDotAnimationToken || !homeRuntimeActive || homeMotionReduceMotion) {');
    expect(effectStart).toBeGreaterThan(-1);
    expect(source.slice(effectStart, effectStart + 200)).toContain('weekDotPulseAnim.stopAnimation();');
  });
});
