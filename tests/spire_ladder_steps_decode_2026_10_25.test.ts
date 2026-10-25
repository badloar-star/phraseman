// Координатор 25.10 (Ядро 9a59c27b6: сервер кладёт steps в каждую строку лесенки итога недели): клиент читает ступени строки,
// если они пришли, и тогда окно повышения в режиме ступеней показывает число места; нет ступеней (старый итог) — число скрыто,
// вверху «Считаем ступени недели…». Показ строки — сторож tests/spire_moments_v3_contract.test.tsx (LadderRow, momentLadderValue).
import fs from 'node:fs';
import path from 'node:path';

import { spireDecodeWeekResult } from '../app/spire/spire_week_result_client';

const base = { schema: 'spire-week-result.v1', steps: 42, roomRank: 2, roomTotal: 30, promoted: true, demoted: false, prevTier: 1, newTier: 2, rewardCoins: { place: 200, promotion: 100 } };
const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('лесенка итога недели: ступени строки', () => {
  it('сервер прислал steps — строка их несёт (как в functions/src/spire_finalize_core.ts ladderFor)', () => {
    const ladder = [
      { place: 1, name: 'Аня', coinRank: 3, coins: 900, steps: 51, isMe: false },
      { place: 2, name: 'Я', coinRank: null, coins: 800, steps: 42, isMe: true },
    ];
    const view = spireDecodeWeekResult({ ...base, ladder }, '2026-W43', 'ru');
    expect(view?.rankBy).toBe('steps');
    expect(view?.ladder?.map((r) => r.steps)).toEqual([51, 42]);
    expect(read('functions/src/spire_finalize_core.ts')).toMatch(/coins: s\.weekCoins \?\? 0, steps: s\.steps,/);
  });

  it('старый итог без steps — поля нет (окно скроет число и скажет «Считаем ступени недели…»)', () => {
    const ladder = [{ place: 1, name: 'Аня', coinRank: 3, coins: 900, isMe: false }];
    const row = spireDecodeWeekResult({ ...base, ladder }, '2026-W42', 'ru')?.ladder?.[0];
    expect(row).toBeDefined();
    expect(row).not.toHaveProperty('steps');
  });

  it('мусор вместо steps не превращается в «0 ступеней»', () => {
    const ladder = [{ place: 1, name: 'Аня', coinRank: 3, coins: 900, steps: 'x', isMe: false }, { place: 2, name: 'Б', coinRank: 1, coins: 1, steps: 7.8, isMe: false }];
    const rows = spireDecodeWeekResult({ ...base, ladder }, '2026-W43', 'ru')?.ladder;
    expect(rows?.[0]).not.toHaveProperty('steps');
    expect(rows?.[1]?.steps).toBe(7);
  });

  it('окно итога недели передаёт ступени строк и режим в лесенку', () => {
    const host = read('components/spire/moments/SpireWeekMomentHost.tsx');
    expect(host).toContain('...(row.steps !== undefined ? { steps: row.steps } : {})');
    expect(host).toContain("rankBy={result.rankBy === 'coins' ? 'coins' : 'steps'}");
  });
});
