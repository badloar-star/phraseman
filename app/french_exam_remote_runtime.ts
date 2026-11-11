export type FrenchLevelExamQuestion = {
  lessonNum: number;
  topic: string;
  topicUK: string;
  topicES: string;
  q: string;
  opts: string[];
  correct: number;
  type?: 'choice4';
};

/**
 * French exams previously reused the retired Quiz delivery surface. Keep the
 * assessment boundary fail-closed until it has a dedicated content source.
 *
 * зачем (владелец 11.11, F01): ИТОГОВЫЙ экзамен отсюда ушёл — у французского теперь свой банк из фраз курса
 * (app/classic_final_exam_bank.ts). Здесь остался только зачёт уровня, он по-прежнему закрыт.
 */
export async function loadFrenchRemoteLevelExamQuestions(
  _level: string,
  _sourceLocaleInput: unknown,
  _count = 30,
): Promise<FrenchLevelExamQuestion[]> {
  return [];
}

export default function __FrenchExamRemoteRuntimeRouteShim() {
  return null;
}
