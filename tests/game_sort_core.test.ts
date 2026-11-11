/** Игра «Сортировка»: правила из утверждённого макета. */
import { INITIAL_SORT_STATE, SORT_SEED_DECK, dropSortCard, sortSideFromSwipe } from '../modules/games/sort_core';

it('смахивание: дальше 90 точек — корзина, ближе — карта возвращается', () => {
  expect(sortSideFromSwipe(-91)).toBe('left');
  expect(sortSideFromSwipe(120)).toBe('right');
  expect(sortSideFromSwipe(90)).toBeNull();
  expect(sortSideFromSwipe(Number.NaN)).toBeNull();
});

it('верная корзина двигает колоду, промах оставляет карту и снимает «с первого раза»', () => {
  const miss = dropSortCard(INITIAL_SORT_STATE, SORT_SEED_DECK, 'right');
  expect(miss).toMatchObject({ correct: false, finished: false, state: { index: 0, misses: 1, missedThisCard: true } });
  const hit = dropSortCard(miss.state, SORT_SEED_DECK, 'left');
  expect(hit).toMatchObject({ correct: true, firstTry: false, state: { index: 1, left: 1, right: 0, missedThisCard: false } });
  const clean = dropSortCard(hit.state, SORT_SEED_DECK, 'right');
  expect(clean).toMatchObject({ correct: true, firstTry: true, state: { index: 2, right: 1 } });
});

it('последняя карта завершает игру, лишний ход ничего не ломает', () => {
  let state = INITIAL_SORT_STATE;
  let finished = false;
  for (const task of SORT_SEED_DECK.tasks) {
    const result = dropSortCard(state, SORT_SEED_DECK, task.side);
    state = result.state;
    finished = result.finished;
  }
  expect(finished).toBe(true);
  expect(state).toMatchObject({ index: 6, left: 3, right: 3, misses: 0 });
  expect(dropSortCard(state, SORT_SEED_DECK, 'left')).toMatchObject({ correct: false, finished: true });
});
