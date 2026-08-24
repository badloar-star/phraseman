// Контракт салюта финала диалога (DialogVictoryCelebration) — фиксирует
// требования Performance Bible и утверждённого макета. С 2026-08-16 владелец
// принял гибрид «Световод + Чекан» (DialogVictoryCelebrationHybrid) как
// ЕДИНСТВЕННУЮ реализацию; components/DialogVictoryCelebration.tsx остался
// точкой входа (тонкая обёртка), а сама хореография и её инварианты живут
// в Hybrid-файле — контракт проверяет именно его:
// - повторяемые анимации КОНЕЧНЫЕ (никаких withRepeat(..., -1); Hybrid вообще
//   не использует withRepeat — удар кульминации одноразовый, а не циклический);
// - все shared values глушатся cancelAnimation на unmount;
// - без Math.random в рендере (детерминированный seeded, стабильно при ремаунте);
// - хаптики таймлайна макета (success на герое, medium impact на ударе);
// - XP-счётчик идёт на UI-потоке без JS setInterval и скрыт при xp<=0
//   (анти-фарм повтора).

import fs from 'fs';
import path from 'path';

const ENTRY_SOURCE = fs.readFileSync(
  path.join(__dirname, '..', 'components', 'DialogVictoryCelebration.tsx'),
  'utf8',
);
const SOURCE = fs.readFileSync(
  path.join(__dirname, '..', 'components', 'DialogVictoryCelebrationHybrid.tsx'),
  'utf8',
);
const SOURCE_WITHOUT_COMMENTS = SOURCE
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^[ \t]*\/\/.*$/gm, '');

describe('DialogVictoryCelebration contract', () => {
  it('exports the celebration component', () => {
    expect(ENTRY_SOURCE).toContain('export function DialogVictoryCelebration');
  });

  it('uses only FINITE repeats — never withRepeat(..., -1)', () => {
    // Тот же детект, что в tests/perf_freeze_contract.test.ts.
    expect(/withRepeat\(([\s\S]{0,200}?),\s*-1/.test(SOURCE)).toBe(false);
    // зачем: гибрид ушёл дальше классики — удар кульминации происходит РОВНО
    // один раз (по завершении кольца целей), никакого withRepeat вообще нет.
    expect(SOURCE).not.toContain('withRepeat');
  });

  it('cancels animations and timers on unmount', () => {
    expect(SOURCE).toContain('cancelAnimation');
    expect(SOURCE_WITHOUT_COMMENTS).not.toMatch(/\bsetInterval\s*\(/);
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
