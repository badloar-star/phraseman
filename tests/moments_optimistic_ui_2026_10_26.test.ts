// Координатор 26.10, обязательная проверка Optimistic UI по зоне Моментов (docs/work/moments-optimistic-ui-2026-10-26.md):
// двойной тап по ✕ итога диалога, «прыжок» баланса посреди счёта итога урока, немые «Дальше / Ещё раз» в окне итога Пика.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('Optimistic UI зоны Моментов', () => {
  it('итог диалога: повтор ✕ / «Готово» во время ухода пропускается, через 1 с снова принимается', () => {
    const src = read('app/dialogue_v2_completion.tsx');
    expect(src).toContain("if (closingRef.current) { console.log('[DIALOG-SUMMARY] close skip reason=already_leaving'); return; }");
    expect(src).toContain('setTimeout(() => { closingRef.current = false; }, 1000);');
  });

  it('итог урока: цель счёта баланса замораживается на старте, после конца — живое число', () => {
    const chain = read('components/completion/V2DoneChain.tsx');
    expect(chain).toContain('if (animate && !balanceRunRef.current) balanceRunRef.current = { from: credited ? balance - amount : balance, to: balance, credited };');
    expect(chain).toContain('const balanceRun = animate && !balanceSettled ? balanceRunRef.current : null;');
    expect(chain).toContain("from={balanceRun ? balanceRun.from : balance} to={balanceRun ? balanceRun.to : balance} phase={balanceRun?.credited ? phase : 'final'}");
  });

  it('Пик: при недостающих данных старт закрывает окно итога и пишет причину', () => {
    const game = read('app/spire/use_spire_game.ts');
    expect(game).toContain("setOutcome(null); setStartBlock('no_identity'); return; }");
    expect(game).toContain("setOutcome(null); setStartBlock('no_tier'); return; }");
  });
});
