import * as admin from 'firebase-admin';
import { buildPromptContext } from '../prompt_context';
import { buildStagePromptPacket } from '../prompt_registry';
import { generateLessonPhraseChunks, LessonPhraseCheckpointSuperseded } from '../lesson_phrase_generation';
import { runGuardedGenerationTransaction } from '../generation_execution';
import type { StageGenerationProvider } from '../stage_runner';

const projectId = process.env.GCLOUD_PROJECT || 'phraseman-content-factory-emulator';
const appName = `lesson-phrase-checkpoint-${process.pid}`;
const app = admin.apps.find((candidate) => candidate?.name === appName) ?? admin.initializeApp({ projectId }, appName);
const db = app.firestore();
const grounding = { outline: { coverage: ['daily'], exclusions: [] } };
const phrase = (index: number) => ({ id: `p${index}`, sourceText: `Источник ${index}`, targetText: `Target ${index}`, meaningKey: `meaning-${index}`, cefr: 'A2', coverageTag: 'daily' });
const artifact = (chunkIndex: number) => ({ stage: 'lesson_phrases', items: Array.from({ length: 10 }, (_, offset) => phrase(chunkIndex * 10 + offset)), coverageReceipt: { coveredTags: ['daily'], respectedExclusions: [] } });
const basePacket = buildStagePromptPacket('lesson_phrases', 'v3', buildPromptContext({ studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'Daily routine', count: 50, approvedArtifactIds: ['outline'], exemplarIds: [], previousContentFingerprints: [] }), grounding);

test('cancelled lease preserves 30/50 and retry requests only missing chunks', async () => {
  const stageId = `checkpoint-race-${process.pid}`;
  const ref = db.collection('content_factory_stages').doc(stageId);
  await ref.set({ state: 'running', attempts: 1, leaseToken: 'lease-1' });
  let providerCalls = 0;
  const firstProvider: StageGenerationProvider = { generate: async ({ prompt }) => {
    const index = Number(prompt.match(/chunk (\d) of 5/)?.[1]) - 1;
    providerCalls += 1;
    if (index === 3) await ref.update({ state: 'cancelled', leaseToken: admin.firestore.FieldValue.delete() });
    return JSON.stringify(artifact(index));
  } };
  const persist = (lease: { attempt: number; leaseToken: string }) => async (checkpoint: any) => runGuardedGenerationTransaction({ lease, allowedStates: ['running'], runTransaction: (handler: (tx: admin.firestore.Transaction) => Promise<boolean>) => db.runTransaction(handler), read: async (tx) => { const snap = await tx.get(ref); return { current: snap.data() ?? null, context: undefined }; }, commit: (tx) => { tx.update(ref, { lessonPhraseCheckpoint: checkpoint, acceptedCount: checkpoint.acceptedCount, missingCount: checkpoint.missingCount }); } });
  await expect(generateLessonPhraseChunks({ provider: firstProvider, model: 'fake', basePacket, identity: { stageId, revision: 1 }, persistCheckpoint: persist({ attempt: 1, leaseToken: 'lease-1' }) })).rejects.toBeInstanceOf(LessonPhraseCheckpointSuperseded);
  const checkpoint30 = (await ref.get()).data()?.lessonPhraseCheckpoint;
  expect(providerCalls).toBe(4);
  expect(checkpoint30).toMatchObject({ acceptedCount: 30, missingCount: 20, publishable: false });
  const hashes = checkpoint30.chunks.slice(0, 3).map((item: any) => item.contentHash);

  await ref.update({ state: 'running', attempts: 2, leaseToken: 'lease-2' });
  const requested: number[] = [];
  const retryProvider: StageGenerationProvider = { generate: async ({ prompt }) => { const index = Number(prompt.match(/chunk (\d) of 5/)?.[1]) - 1; requested.push(index); return JSON.stringify(artifact(index)); } };
  const result = await generateLessonPhraseChunks({ provider: retryProvider, model: 'fake', basePacket, identity: { stageId, revision: 1 }, checkpoint: checkpoint30, persistCheckpoint: persist({ attempt: 2, leaseToken: 'lease-2' }) });
  expect(requested).toEqual([3, 4]);
  expect(result.artifact.items).toHaveLength(50);
  expect(result.checkpoint.chunks.slice(0, 3).map((item) => item?.contentHash)).toEqual(hashes);
});

afterAll(async () => { await db.terminate(); await app.delete(); });
