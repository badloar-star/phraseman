import type { SourceEvidence } from './publication_contract';
import { buildLessonGenerationPrompt, parseGeneratedLessonArtifact } from './generation_service';
import { runLessonQa, type QaReceipt } from './qa_service';
import type { LessonArtifact } from './contracts';

export interface GenerationProvider {
  generate(input: { model: string; prompt: string; responseFormat: 'json_object' }): Promise<string>;
}

export interface GeneratedLessonUnit {
  readonly artifact: LessonArtifact;
  readonly qa: QaReceipt;
}

export async function generateLessonUnit(input: {
  provider: GenerationProvider;
  model: string;
  studyTarget: string;
  sourceLocale: string;
  lessonId: number;
  blueprintVersion: string;
  blueprintHash: string;
  topic: string;
  sourcePhrases: readonly string[];
  vocabularyFocus: readonly string[];
  drills: readonly string[];
  sourceEvidence: readonly SourceEvidence[];
}): Promise<GeneratedLessonUnit> {
  const prompt = buildLessonGenerationPrompt(input);
  const raw = await input.provider.generate({ model: input.model, prompt, responseFormat: 'json_object' });
  const artifact = parseGeneratedLessonArtifact(raw);
  if (artifact.lessonId !== input.lessonId) throw new Error('generated_lesson_id_mismatch');
  const qa = runLessonQa({ artifact, blueprintHash: input.blueprintHash, sourceEvidence: input.sourceEvidence });
  if (qa.status !== 'passed') throw new Error(`generated_lesson_qa_failed:${qa.errors.join(',')}`);
  return Object.freeze({ artifact, qa });
}
