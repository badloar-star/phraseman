/** Игра «Поток»: правила из утверждённого макета (темп, расписание слов, сбор раундов). */
import {
  FLOW_TEMPO, buildFlowRounds, canStartFlow, flowRoundTimings, isFlowHighTempo, nextFlowTempoLevel, type FlowItem,
} from '../modules/games/flow_core';

const POOL: FlowItem[] = [
  { id: 'a', en: 'He is cooking dinner', translation: 'Он готовит ужин' },
  { id: 'b', en: 'We are waiting here', translation: 'Мы ждём здесь' },
  { id: 'c', en: 'I am listening to music', translation: 'Я слушаю музыку' },
  { id: 'd', en: 'Yes', translation: 'Да' },
  { id: 'e', en: 'She works', translation: 'Она работает' },
];

function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

it('ступени темпа — как в макете', () => {
  expect(FLOW_TEMPO.map((t) => t.msPerWord)).toEqual([520, 400, 300, 240]);
  expect(FLOW_TEMPO.map((t) => t.bars)).toEqual([4, 6, 8, 10]);
});

it('верный ответ поднимает темп, промах опускает, края не пробиваются', () => {
  expect(nextFlowTempoLevel(0, true)).toBe(1);
  expect(nextFlowTempoLevel(0, false)).toBe(0);
  expect(nextFlowTempoLevel(3, true)).toBe(3);
  expect(nextFlowTempoLevel(2, false)).toBe(1);
  expect(isFlowHighTempo(1)).toBe(false);
  expect(isFlowHighTempo(2)).toBe(true);
});

it('расписание раунда совпадает с формулами макета', () => {
  const t = flowRoundTimings(4, 520);
  expect(t.wordInAt).toEqual([350, 870, 1390, 1910]);
  expect(t.wordOutAt[0]).toBe(350 + 780);
  expect(t.beamMs).toBe(4 * 520 + 728);
  expect(t.answersAt).toBe(350 + t.beamMs + 150);
  expect(t.wordFadeMs).toBe(286);
});

it('раунд: три разных варианта, верный на своём месте, сначала фразы в 3–7 слов', () => {
  const rounds = buildFlowRounds(POOL, 5, seeded(7));
  expect(rounds).toHaveLength(5);
  for (const round of rounds) {
    expect(round.options).toHaveLength(3);
    expect(new Set(round.options).size).toBe(3);
    expect(round.options[round.correctIndex]).toBe(round.item.translation);
    expect(round.words.join(' ')).toBe(round.item.en);
  }
  expect(rounds.slice(0, 3).map((r) => r.item.id).sort()).toEqual(['a', 'b', 'c']);
});

it('одинаковые переводы и пустые записи не попадают в игру', () => {
  const dirty: FlowItem[] = [...POOL.slice(0, 2), { id: 'x', en: 'They wait here', translation: 'мы ждём здесь' }, { id: 'y', en: '', translation: 'пусто' }];
  expect(canStartFlow(dirty)).toBe(false);
  expect(buildFlowRounds(dirty, 3, seeded(1))).toEqual([]);
  expect(canStartFlow(POOL)).toBe(true);
});

it('не меняет исходный набор', () => {
  const frozen = Object.freeze(POOL.map((item) => Object.freeze({ ...item })));
  expect(() => buildFlowRounds(frozen, 3, seeded(3))).not.toThrow();
});
