// зачем (Макеты, координатор 13.10): в состоянии «Итог пока недоступен» ячейка целей продолжала мерцать скелетом — выглядело как вечная загрузка рядом с «недоступен».
// Теперь при state.kind === 'unavailable' в ячейке прочерк «—» без скелета, ячейка остаётся (раскладка не прыгает), на ветке есть журнал.
import fs from 'node:fs';
import path from 'node:path';
import { normalizeEol } from './helpers/read_source';

const read = (rel: string) => normalizeEol(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')).split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));

describe('итог диалога: ячейка целей при «недоступен»', () => {
  const src = read('app/dialogue_v2_completion.tsx');

  it('три ветки: цели есть → цифра; недоступен → «—»; иначе (загрузка) → скелет', () => {
    const start = src.indexOf('{review ? (\n                  <Stat glass={glass} value={`${goalsMet}`}');
    expect(start).toBeGreaterThan(0);
    const block = src.slice(start, start + 900);
    const iReview = block.indexOf('<Stat glass={glass} value={`${goalsMet}`}');
    const iUnavailable = block.indexOf("state.kind === 'unavailable'");
    const iSkeleton = block.indexOf('<GoalsStatSkeleton');
    expect(iReview).toBeGreaterThan(-1);
    expect(iUnavailable).toBeGreaterThan(iReview);
    expect(iSkeleton).toBeGreaterThan(iUnavailable);
    expect(block).toContain('<GoalsStatUnavailable glass={glass} label={labels.goals} />');
  });

  it('прочерк рисуется той же ячейкой Stat (геометрия цифры), без скелета, с журналом на ветке', () => {
    const start = src.indexOf('function GoalsStatUnavailable');
    const body = src.slice(start, src.indexOf('function GoalsStatSkeleton', start));
    expect(body).toContain('<Stat glass={glass} value="—" label={label} />');
    expect(body).not.toContain('SkeletonBlock');
    expect(body).toContain("console.log('[DIALOGUE-V2] completion goals stat: итог недоступен");
  });
});
