import { IRREGULAR_VERBS_BY_LESSON, type IrregularVerb } from '../app/irregular_verbs_data';
import {
  buildIrregularVerbOptions,
  ensureCompleteIrregularVerbOptions,
  type IrregularVerbFormKey,
} from '../app/irregular_verb_options';

const FORM_KEYS: IrregularVerbFormKey[] = ['past', 'pp', 'base'];

function correctForForm(verb: IrregularVerb, form: IrregularVerbFormKey): string {
  if (form === 'past') return verb.past;
  if (form === 'pp') return verb.pp;
  return verb.base;
}

describe('irregular verb answer options', () => {
  it('builds four unique non-empty options including the correct form for every irregular verb step', () => {
    const allVerbs = Object.values(IRREGULAR_VERBS_BY_LESSON).flat();

    for (const verbs of Object.values(IRREGULAR_VERBS_BY_LESSON)) {
      for (const verb of verbs) {
        for (const form of FORM_KEYS) {
          const correct = correctForForm(verb, form);
          const options = buildIrregularVerbOptions(correct, verb, allVerbs, form);
          const normalized = options.map(option => option.trim().toLowerCase());

          expect(options).toHaveLength(4);
          expect(options.every(option => option.trim().length > 0)).toBe(true);
          expect(new Set(normalized).size).toBe(4);
          expect(normalized).toContain(correct.toLowerCase());
        }
      }
    }
  });

  it('repairs stale short option state before it reaches the irregular-verb UI', () => {
    const allVerbs = Object.values(IRREGULAR_VERBS_BY_LESSON).flat();
    const verb = allVerbs.find(item => item.base === 'find');
    expect(verb).toBeDefined();

    const options = ensureCompleteIrregularVerbOptions(['found'], verb!, allVerbs, 'past');
    const normalized = options.map(option => option.trim().toLowerCase());

    expect(options).toHaveLength(4);
    expect(options.every(option => option.trim().length > 0)).toBe(true);
    expect(new Set(normalized).size).toBe(4);
    expect(normalized).toContain('found');
  });
});
