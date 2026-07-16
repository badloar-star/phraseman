import { buildPromptContext } from './prompt_context';
import { buildStagePromptPacket } from './prompt_registry';
import { generateLessonPhraseChunks } from './lesson_phrase_generation';
import type { StageGenerationProvider } from './stage_runner';

const grounding = { outline: { coverage: ['daily'], exclusions: [] } };
const phrase = (index: number) => ({ id: `p${index}`, sourceText: `Источник ${index}`, targetText: `Target ${index}`, meaningKey: `meaning-${index}`, cefr: 'A2', coverageTag: 'daily' });
const artifact = (chunkIndex: number) => ({ stage: 'lesson_phrases', items: Array.from({ length: 10 }, (_, offset) => phrase(chunkIndex * 10 + offset)), coverageReceipt: { coveredTags: ['daily'], respectedExclusions: [] } });
const basePacket = buildStagePromptPacket('lesson_phrases', 'v3', buildPromptContext({ studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'Daily routine', count: 50, approvedArtifactIds: ['outline'], exemplarIds: [], previousContentFingerprints: [] }), grounding);
const identity = { stageId: 'request:lesson_phrases:lesson-20:r1', revision: 1 };

describe('lesson phrase chunk generation', () => {
  test('persists 30/50, survives malformed refill, then requests only missing 20', async () => {
    const persisted: any[] = [];
    const firstProvider: StageGenerationProvider = { generate: async ({ prompt }) => {
      const match = prompt.match(/chunk (\d) of 5/); const index = Number(match?.[1] ?? 1) - 1;
      return index < 3 ? JSON.stringify(artifact(index)) : '{}';
    } };
    const firstError = await generateLessonPhraseChunks({ provider: firstProvider, model: 'fake', basePacket, identity, persistCheckpoint: async (checkpoint) => { persisted.push(checkpoint); return true; } }).catch((error) => error);
    expect(firstError.message).toBe('generation_stage_schema_failed');
    const checkpoint30 = persisted.at(-1);
    expect(checkpoint30).toMatchObject({ acceptedCount: 30, missingCount: 20, publishable: false });
    const originalHashes = checkpoint30.chunks.slice(0, 3).map((item: any) => item.contentHash);

    const requested: number[] = [];
    const retryProvider: StageGenerationProvider = { generate: async ({ prompt }) => { const index = Number(prompt.match(/chunk (\d) of 5/)?.[1]) - 1; requested.push(index); return JSON.stringify(artifact(index)); } };
    const result = await generateLessonPhraseChunks({ provider: retryProvider, model: 'fake', basePacket, identity, checkpoint: checkpoint30, persistCheckpoint: async (checkpoint) => { persisted.push(checkpoint); return true; } });
    expect(requested).toEqual([3, 4]);
    expect(result.artifact.items).toHaveLength(50);
    expect(result.checkpoint.chunks.slice(0, 3).map((item) => item?.contentHash)).toEqual(originalHashes);
    expect(result.receipt).toMatchObject({ status: 'structural_pass_pending_linguistic_review', chunkCount: 5, checkpointHash: result.checkpoint.contentHash, validation: { structuralValidated: true, linguisticValidated: false, semanticDuplicateValidated: false } });
  });
});
