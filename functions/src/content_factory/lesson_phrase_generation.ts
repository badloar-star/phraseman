import { createHash } from 'node:crypto';
import { acceptLessonPhraseChunk, assembleLessonPhraseCheckpoint, createLessonPhraseCheckpoint, missingLessonPhraseChunkIndexes, parseLessonPhraseCheckpoint, type LessonPhraseCheckpoint } from './lesson_phrase_checkpoint';
import { buildLessonPhraseChunkPromptPacket, type StagePromptPacket } from './prompt_registry';
import { runGenerationStage, type StageGenerationProvider } from './stage_runner';

export class LessonPhraseCheckpointSuperseded extends Error {
  constructor() { super('lesson_phrase_checkpoint_superseded'); this.name = 'LessonPhraseCheckpointSuperseded'; }
}

export async function generateLessonPhraseChunks(input: {
  readonly provider: StageGenerationProvider;
  readonly model: string;
  readonly basePacket: StagePromptPacket;
  readonly identity: { readonly stageId: string; readonly revision: number };
  readonly checkpoint?: unknown;
  readonly persistCheckpoint: (checkpoint: LessonPhraseCheckpoint) => Promise<boolean>;
}) {
  if (input.basePacket.kind !== 'lesson_phrases' || input.basePacket.context.count !== 50 || !input.basePacket.groundingHash) throw new Error('lesson_phrase_generation_contract_invalid');
  const expected = { stageId: input.identity.stageId, revision: input.identity.revision, groundingHash: input.basePacket.groundingHash, cefr: input.basePacket.context.cefr, grounding: input.basePacket.grounding, sourceLocale: input.basePacket.context.sourceLocale, studyTarget: input.basePacket.context.studyTarget };
  let checkpoint = input.checkpoint === undefined ? createLessonPhraseCheckpoint(expected) : parseLessonPhraseCheckpoint(input.checkpoint, expected);
  let logicalAttempts = 0;
  for (const chunkIndex of missingLessonPhraseChunkIndexes(checkpoint)) {
    const acceptedHashes = checkpoint.chunks.filter((chunk): chunk is NonNullable<typeof chunk> => Boolean(chunk)).map((chunk) => chunk.contentHash);
    const acceptedItems = checkpoint.chunks.flatMap((chunk) => chunk?.artifact.items ?? []);
    const packet = buildLessonPhraseChunkPromptPacket(input.basePacket, chunkIndex, acceptedHashes, { ids: acceptedItems.map((item) => String(item.id ?? '')), meaningKeys: acceptedItems.map((item) => String(item.meaningKey ?? '')), pairs: acceptedItems.map((item) => `${String(item.sourceText ?? '')}\n${String(item.targetText ?? '')}`) });
    const generated = await runGenerationStage({ provider: input.provider, model: input.model, packet });
    logicalAttempts += generated.attempts;
    checkpoint = acceptLessonPhraseChunk(checkpoint, chunkIndex, generated.artifact, expected, generated.receipt as unknown as Readonly<Record<string, unknown>>);
    if (!await input.persistCheckpoint(checkpoint)) throw new LessonPhraseCheckpointSuperseded();
  }
  const artifact = assembleLessonPhraseCheckpoint(checkpoint, expected);
  const chunkReceipts = checkpoint.chunks.map((chunk) => chunk?.generationReceipt ?? null);
  const providerUnits = chunkReceipts.reduce((sum, receipt) => sum + Number((receipt?.providerRequests as { usedUnits?: unknown } | undefined)?.usedUnits ?? 0), 0);
  const receipt = Object.freeze({ status: 'structural_pass_pending_linguistic_review' as const, promptVersion: input.basePacket.promptVersion, promptHash: input.basePacket.promptHash, contextHash: input.basePacket.contextHash, schemaHash: input.basePacket.schemaHash, groundingHash: input.basePacket.groundingHash, model: input.model, policyVersion: 'content-stage-policy-r9a-v1', chunkCount: 5, chunkSize: 10, checkpointHash: checkpoint.contentHash, acceptedChunkHashes: Object.freeze(checkpoint.chunks.map((chunk) => chunk!.contentHash)), assemblyHash: createHash('sha256').update(JSON.stringify(artifact)).digest('hex'), providerRequests: Object.freeze({ requestedUnits: providerUnits, usedUnits: providerUnits, refundedUnits: 0, unit: 'provider_requests' as const }), chunkReceipts: Object.freeze(chunkReceipts), operatorCorrection: Object.freeze({ status: 'unavailable_not_collected' as const }), validation: Object.freeze({ structuralValidated: true as const, linguisticValidated: false as const, semanticDuplicateValidated: false as const, errors: Object.freeze([] as string[]) }) });
  return Object.freeze({ artifact, attempts: logicalAttempts, receipt, checkpoint });
}
