import { portionsForVerbs, type IrregularVerb } from './irregular_verbs_data';

/** Pure projection: completed items never change the membership of a running portion. */
export function irregularVerbPortionProgress(verbs: IrregularVerb[], counts: Readonly<Record<string, number>>) {
  const learned = verbs.filter(verb => (counts[verb.base] ?? 0) >= 3).length;
  const next = portionsForVerbs(verbs)
    .map(portion => portion.filter(verb => (counts[verb.base] ?? 0) < 3))
    .find(portion => portion.length > 0) ?? [];
  return { next, learned, total: verbs.length, complete: verbs.length > 0 && learned === verbs.length };
}
