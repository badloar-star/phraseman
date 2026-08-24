import { createHash } from 'node:crypto';
import type { Transaction, DocumentReference } from 'firebase-admin/firestore';

import { validateTournamentTask, type TournamentTask } from './tournament_core';
import { TOURNAMENT_POOL_V11_VERSION, tournamentV11TaskId } from './tournament_pool_v11_factory';
import { createTournamentTaskSecretsInTransaction, parseTournamentTaskDocument } from './tournaments';

describe('tournament provenance parsing and secret serialization', () => {
  it('preserves all six speed-match keys from Firestore parse into room secret', () => {
    const provenanceKeys = Array.from({ length: 6 }, (_, index) => `gavan:42:word-${index}`);
    const options = ['один', 'два', 'три', 'четыре', 'пять', 'шесть'];
    const contentSha256 = createHash('sha256').update('speed-v11', 'utf8').digest('hex');
    const taskId = tournamentV11TaskId(TOURNAMENT_POOL_V11_VERSION, contentSha256);
    const task = parseTournamentTaskDocument(taskId, {
      mode: 'speed_match', difficulty: 2, isVoice: false, verified: true,
      tags: [`pool:${TOURNAMENT_POOL_V11_VERSION}`], provenanceKeys,
      source: 'ai', poolVersion: TOURNAMENT_POOL_V11_VERSION,
      exposureBucket: `${TOURNAMENT_POOL_V11_VERSION}:speed_match:000`, lifecycle: 'published',
      semanticSignature: createHash('sha256').update('signature:speed-v11', 'utf8').digest('hex'),
      contentSha256,
      semanticReceiptId: createHash('sha256').update('receipt:speed-v11', 'utf8').digest('hex'),
      semanticReceiptSha256: createHash('sha256').update('receipt-value:speed-v11', 'utf8').digest('hex'),
      reviewContractVersion: 'tournament-semantic-review-v2', promptSetSha256: 'a'.repeat(64),
      payload: {
        prompt: 'Соедини пары', rightOptions: options,
        items: ['one', 'two', 'three', 'four', 'five', 'six'].map((prompt, index) => ({
          prompt, options, correctIndex: index,
          explanation: {
            ruleNote: 'One exact pair.', example: `${prompt} — ${options[index]}.`,
            wrongOptionReasons: options.map((_, optionIndex) => optionIndex === index ? '' : 'Wrong pair.'),
          },
        })),
      },
      explanation: { ruleNote: 'Match all pairs.', example: 'one — один.', wrongOptionReasons: [] },
    });
    expect(task).not.toBeNull();
    expect(task?.provenanceKeys).toEqual(provenanceKeys);
    expect(task).toEqual(expect.objectContaining({
      taskId, contentSha256, poolVersion: TOURNAMENT_POOL_V11_VERSION,
      semanticReceiptId: expect.stringMatching(/^[a-f0-9]{64}$/u),
    }));
    expect(validateTournamentTask(task as TournamentTask).ok).toBe(true);

    const writes: unknown[] = [];
    const tx = { create: (_ref: unknown, value: unknown) => { writes.push(value); } } as Transaction;
    const roomRef = {
      collection: () => ({ doc: () => ({}) as DocumentReference }),
    } as unknown as DocumentReference;
    createTournamentTaskSecretsInTransaction(tx, roomRef, [task as TournamentTask]);
    expect(writes).toHaveLength(1);
    expect(writes[0]).toEqual(expect.objectContaining({ provenanceKeys }));
  });
});
