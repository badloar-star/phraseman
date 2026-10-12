// зачем (координатор 12.10): «парение» стопки хаба Карточек — конечное число качаний, а не вечный цикл. Нечётное число полуциклов оставило бы стопку смещённой.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split('\r\n').join('\n');

describe('хаб Карточек: парение конечное, замер — только в dev', () => {
  const hub = read('app/flashcards/CardsHubV2.tsx');

  it('withRepeat получает константу, а не -1; число полуциклов чётное; запуск только пока экран активен', () => {
    const half = /const FLOAT_HALF_CYCLES = (\d+);/.exec(hub);
    expect(half).not.toBeNull();
    expect(Number(half![1]) % 2).toBe(0);
    expect(Number(half![1])).toBeGreaterThan(0);
    expect(hub).toContain('FLOAT_HALF_CYCLES, true);');
    expect(hub).not.toMatch(/withRepeat\([^;]*?,\s*-1\b/);
    expect(hub).toContain('if (reduceMotion || !runtimeActive) return undefined;');
    expect(hub).toContain("return () => { float.value = 0; noteHubSubscription('CardsHubV2.floatLoop', 'off'); };");
  });

  it('замер [CARDS-HUB-ANIM] рисуется только при __DEV__ и пишет только через dev-гард', () => {
    expect(hub).toMatch(/typeof __DEV__ !== 'undefined' && __DEV__\s*\? <CardsHubAnimProbe/);
    const probe = read('app/flashcards/CardsHubAnimProbe.tsx');
    expect(probe).toContain("const log = (message: string): void => { if (DEV) console.log(message); };");
    expect(probe).not.toMatch(/\bconsole\.log\((?!message)/);
    expect(probe).toContain('[CARDS-HUB-ANIM]');
  });
});
