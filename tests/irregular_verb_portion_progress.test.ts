import { IRREGULAR_VERBS_BY_LESSON } from '../app/irregular_verbs_data';
import { irregularVerbPortionProgress } from '../app/irregular_verb_portion_progress';

describe('irregular verb portion progress', () => {
  // зачем (05.11): глаголы разложены по первому появлению в заданиях, в уроке 3 их 4. Берём самый насыщенный урок — тест про порции, а не про номер урока.
  const verbs = Object.values(IRREGULAR_VERBS_BY_LESSON).reduce((best, cur) => (cur.length > best.length ? cur : best), [] as (typeof IRREGULAR_VERBS_BY_LESSON)[number]);
  const total = verbs.length;

  test('six learned verbs do not finish a longer section', () => {
    const counts = Object.fromEntries(verbs.slice(0, 6).map(verb => [verb.base, 3]));
    const result = irregularVerbPortionProgress(verbs, counts);
    expect(result.complete).toBe(false);
    expect(result.learned).toBe(6);
    expect(result.total).toBe(total);
    expect(result.next).toEqual(verbs.slice(6, 12));
  });

  test('successive portions visit every verb once without modifying earlier snapshots', () => {
    const counts: Record<string, number> = {};
    const visited: string[] = [];
    let result = irregularVerbPortionProgress(verbs, counts);
    const first = result.next;
    for (let portion = 0; portion < Math.ceil(total / 6); portion += 1) {
      expect(result.complete).toBe(false);
      for (const verb of result.next) { visited.push(verb.base); counts[verb.base] = 3; }
      result = irregularVerbPortionProgress(verbs, counts);
    }
    expect(visited).toEqual(verbs.map(verb => verb.base));
    expect(first).toEqual(verbs.slice(0, 6));
    expect(result).toMatchObject({ complete: true, learned: total, total, next: [] });
  });

  test('resume keeps a partly learned verb and skips already mastered verbs', () => {
    const counts = { [verbs[0].base]: 3, [verbs[1].base]: 2 };
    expect(irregularVerbPortionProgress(verbs, counts).next).toEqual(verbs.slice(1, 6));
  });

  test('empty content is not a newly completed section', () => {
    expect(irregularVerbPortionProgress([], {}).complete).toBe(false);
  });
});
