// зачем (обход экранов 12.11, w1_warmup: «три индикатора показывают разное»): по макету elevate-mechanics.app.js (workout) точка горит у
// карты спереди (idx), деление закрашено у сыгранной игры (segs[i] по номеру игры), карты лежат по кругу: соседняя слева — предыдущая (d === 2 → −1).
// Все три индикатора считаются одной функцией — разнобой между ними невозможен по построению.
import fs from 'fs';
import path from 'path';

import { warmupIndicators } from '../modules/games/warmup_indicators';
import type { WarmupState } from '../modules/games/warmup_state';

const game = (id: string) => ({ id }) as unknown as WarmupState['games'][number];
const state = (results: Record<string, string>): WarmupState => ({
  day: '2026-11-12', target: 'en', games: [game('flow'), game('odd_word'), game('sort')], results,
});

describe('Разминка: точки, деления и колода — один расчёт по макету', () => {
  it('кадр обхода w1_warmup: спереди «Поток», сыграна «Сортировка» — горит первая точка, закрашено третье деление, «Сортировка» слева', () => {
    const ind = warmupIndicators(state({ sort: '6/6' }), 0);
    expect(ind.front).toBe(0);
    expect(ind.dots).toEqual([true, false, false]);
    expect(ind.segs).toEqual([false, false, true]);
    expect(ind.cardPos).toEqual([0, 1, -1]);
    expect(ind.played).toBe(1);
  });

  it('точка всегда у карты спереди, деление — у сыгранной, независимо от того, какая карта спереди', () => {
    for (const front of [0, 1, 2]) {
      const ind = warmupIndicators(state({ odd_word: '4/4' }), front);
      expect(ind.dots.indexOf(true)).toBe(front);
      expect(ind.cardPos[front]).toBe(0);
      expect(ind.cardPos.filter((p) => p === 0)).toHaveLength(1);
      expect(ind.segs).toEqual([false, true, false]);
    }
  });

  it('две игры — без карты слева; номер вне диапазона приводится к колоде; пустой день — пусто', () => {
    const two: WarmupState = { ...state({}), games: [game('flow'), game('sort')] };
    expect(warmupIndicators(two, 1).cardPos).toEqual([1, 0]);
    expect(warmupIndicators(state({}), 4).front).toBe(1);
    expect(warmupIndicators({ ...state({}), games: [] }, 0)).toEqual({ count: 0, front: -1, dots: [], segs: [], cardPos: [], played: 0, todayMarks: [] });
  });

  it('«Сегодня» 2/3: метки строки — счётчик слева, даже если сыграны вторая и третья игры (обход 12.11, заход 3)', () => {
    const ind = warmupIndicators(state({ odd_word: '4/4', sort: '6/6' }), 0);
    expect(ind.segs).toEqual([false, true, true]); // экран разминки: деление у сыгранной игры, как в макете колоды
    expect(ind.todayMarks).toEqual([true, true, false]); // строка «Сегодня»: «2/3» — две левые
    expect(warmupIndicators(state({ sort: '6/6' }), 0).todayMarks).toEqual([true, false, false]);
    expect(warmupIndicators(state({ flow: '1', odd_word: '2', sort: '3' }), 0).todayMarks).toEqual([true, true, true]);
  });

  it('строка «Сегодня» берёт метки и счёт из warmupIndicators, без обратного порядка', () => {
    const row = fs.readFileSync(path.join(__dirname, '..', 'components/games/WarmupTodayRow.tsx'), 'utf8');
    expect(row).toContain('const ind = useMemo(() => warmupIndicators(state, 0), [state]);');
    expect(row).toContain('{ind.todayMarks.map((on, i) => (');
    expect(row).not.toContain('state.results[game.id] !== undefined ? p.correct');
    expect(row).not.toMatch(/row-reverse|I18nManager|reverse\(\)/);
  });

  it('экран рисует точки, деления и колоду из warmupIndicators и пишет [WARMUP-IND]', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app/warmup.tsx'), 'utf8');
    expect(src).toContain('const ind = useMemo(() => warmupIndicators(state, index), [state, index]);');
    expect(src).toContain('<DeckDot key={item.id} on={ind.dots[i]} />');
    expect(src).toContain('pos={ind.cardPos[i]}');
    expect(src).toContain("'[WARMUP-IND]'");
    // деления читают тот же расчёт, а не результаты напрямую
    expect(src).not.toContain('doneIds={state.results}');
  });
});
