import { lesson1DistractorChoicesV2 } from '../modules/learning-v2/content/source/lesson1_distractor_catalog_v2';

const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const SEMANTIC_CASES = [
  ['ready', 'I am ready.'],
  ['tired', 'I am tired.'],
  ['book', 'It is a book.'],
  ['teacher', 'I am a teacher.'],
] as const;

function explanationSkeleton(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[«“„][^»”]+[»”]/gu, '{value}')
    .replace(/\s+/gu, ' ')
    .trim();
}

for (const locale of LOCALES) {
  const skeletons = SEMANTIC_CASES.map(([correct, phrase]) => {
    const choice = lesson1DistractorChoicesV2(locale, correct, phrase).find(
      (candidate) => candidate.trapType === 'semantic_neighbor',
    );
    if (!choice) {
      throw new Error(`semantic_neighbor_missing:${locale}:${correct}`);
    }
    return explanationSkeleton(choice.reason);
  });
  if (new Set(skeletons).size !== skeletons.length) {
    throw new Error(`copied_semantic_feedback_skeleton:${locale}`);
  }
}

process.stdout.write('LESSON 1 DISTRACTOR TEMPLATE GATE: PASS\n');
