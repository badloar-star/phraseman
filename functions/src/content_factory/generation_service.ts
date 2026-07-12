import { validateLessonArtifact, type LessonArtifact } from './contracts';

export interface LessonGenerationPromptInput {
  readonly studyTarget: string;
  readonly sourceLocale: string;
  readonly lessonId: number;
  readonly blueprintVersion: string;
  readonly sourcePhrases: readonly string[];
  readonly topic: string;
  readonly vocabularyFocus: readonly string[];
  readonly drills: readonly string[];
}

export function buildLessonGenerationPrompt(input: LessonGenerationPromptInput): string {
  const source = JSON.stringify({
    studyTarget: input.studyTarget,
    sourceLocale: input.sourceLocale,
    lessonId: input.lessonId,
    blueprintVersion: input.blueprintVersion,
    topic: input.topic,
    sourcePhrases: input.sourcePhrases,
    vocabularyFocus: input.vocabularyFocus,
    drills: input.drills,
  });
  return [
    'You are the Phraseman course-content generator.',
    `Generate one lesson with studyTarget=${input.studyTarget} and sourceLocale=${input.sourceLocale}.`,
    'The English blueprint is authoritative for sequence, meaning, difficulty and source phrase order.',
    'Translate and adapt target-language content naturally; do not invent a different lesson objective.',
    'Return JSON only. Do not include markdown, commentary, citations or theory.',
    'The JSON must contain lessonId, exactly 50 unique phrases, non-empty vocabulary, and applicable drills.',
    `Server blueprint input: ${source}`,
    'Required JSON shape: {"lessonId":number,"phrases":[{"id":string,"sourceText":string,"targetText":string}],"vocabulary":[{"lemma":string,"partOfSpeech":string,"targetText":string}],"drills":[{"kind":"irregular_verbs|prepositions|part_of_speech","applicable":boolean,"itemCount":number}]}',
  ].join('\n');
}

export function parseGeneratedLessonArtifact(raw: string): LessonArtifact {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('generated_lesson_invalid');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('generated_lesson_invalid');
  const artifact = value as LessonArtifact;
  if (!Array.isArray(artifact.phrases) || !Array.isArray(artifact.vocabulary) || !Array.isArray(artifact.drills)) {
    throw new Error('generated_lesson_invalid');
  }
  const validation = validateLessonArtifact(artifact);
  if (!validation.ok) throw new Error(`generated_lesson_invalid:${validation.errors.join(',')}`);
  return Object.freeze({
    lessonId: artifact.lessonId,
    phrases: Object.freeze([...artifact.phrases]),
    vocabulary: Object.freeze([...artifact.vocabulary]),
    drills: Object.freeze([...artifact.drills]),
  });
}
