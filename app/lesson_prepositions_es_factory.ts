import type {
  LessonPrepositionPack,
  PrepositionDrillItem,
  PrepositionKind,
  PrepositionToken,
} from './lesson_data_types';
import { shufflePrepOptions } from './lesson_prepositions_es_shuffle';

/** [template with __, correct, distractors joined by |, explainRU, explainUK, explainES] */
export type PrepRow = readonly [string, string, string, string, string, string];

export function lessonPackFromRows(
  lessonId: number,
  newPrepositions: PrepositionToken[],
  rows: PrepRow[],
): LessonPrepositionPack {
  const items: PrepositionDrillItem[] = rows.map((row, idx) => {
    const [sentenceTemplate, correct, distractorsCsv, explainRU, explainUK, explainES] = row;
    const id = `l${lessonId}-p${idx + 1}`;
    const distractors = distractorsCsv
      .split('|')
      .map(s => s.trim())
      .filter(Boolean)
      .filter(d => d.toLowerCase() !== correct.toLowerCase());
    return {
      id,
      sentenceTemplate,
      correct,
      options: shufflePrepOptions(id, sentenceTemplate, correct, distractors),
      explainRU,
      explainUK,
      explainES,
    };
  });
  return { lessonId, newPrepositions, items };
}

export function tok(text: string, kind: PrepositionKind): PrepositionToken {
  return { text, kind };
}
