// Контракт салюта финала диалога (DialogVictoryCelebration) — фиксирует
// требования Performance Bible и утверждённого макета:
// - повторяемые анимации КОНЕЧНЫЕ (никаких withRepeat(..., -1) — компонент
//   не должен попадать в allowlist perf_freeze_contract);
// - все shared values глушатся cancelAnimation на unmount;
// - без Math.random в рендере (детерминированный seeded, стабильно при ремаунте);
// - хаптики таймлайна макета (success на герое, medium impact на конфетти);
// - XP-счётчик чистится (clearInterval) и скрыт при xp<=0 (анти-фарм повтора).

import fs from 'fs';
import path from 'path';

const SOURCE = fs.readFileSync(
  path.join(__dirname, '..', 'components', 'DialogVictoryCelebration.tsx'),
  'utf8',
);

describe('DialogVictoryCelebration contract', () => {
  it('exports the celebration component', () => {
    expect(SOURCE).toContain('export function DialogVictoryCelebration');
  });

  it('uses only FINITE repeats — never withRepeat(..., -1)', () => {
    // Тот же детект, что в tests/perf_freeze_contract.test.ts.
    expect(/withRepeat\(([\s\S]{0,200}?),\s*-1/.test(SOURCE)).toBe(false);
    // Повторы существуют, но с положительными счётчиками-константами.
    expect(SOURCE).toContain('FLOAT_REPEATS');
    expect(SOURCE).toContain('SHIMMER_REPEATS');
  });

  it('cancels animations and timers on unmount', () => {
    expect(SOURCE).toContain('cancelAnimation');
    expect(SOURCE).toContain('clearInterval');
    expect(SOURCE).toContain('clearTimeout');
  });

  it('is deterministic — no Math.random in render (seeded pattern)', () => {
    // Ловим именно ВЫЗОВ (упоминание в комментарии-объяснении — не нарушение).
    expect(SOURCE).not.toContain('Math.random(');
    expect(SOURCE).toContain('function seeded(');
  });

  it('fires the mockup haptics timeline', () => {
    expect(SOURCE).toContain('hapticSuccess');
    expect(SOURCE).toContain('hapticMediumImpact');
  });

  it('hides the XP row when nothing was awarded (repeat anti-farm)', () => {
    expect(SOURCE).toContain('xp > 0 && (');
  });

  it('does not statically import heavy generated content', () => {
    expect(SOURCE).not.toMatch(/from\s+'\.\.\/app\/(lesson_data_|plan_content_|quiz_thematic_)/);
  });
});
