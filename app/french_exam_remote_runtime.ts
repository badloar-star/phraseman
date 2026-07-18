export type FrenchExamQuestion = {
  lessonNum: number;
  topic: string;
  rawTopic?: string;
  topicUK: string;
  topicES?: string;
  q: string;
  opts: string[];
  correct: number;
  type?: 'choice4';
};

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
 */
export async function loadFrenchRemoteFinalExamQuestions(
  _sourceLocaleInput: unknown,
  _count = 50,
): Promise<FrenchExamQuestion[]> {
  return [];
}

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
