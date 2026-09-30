import { createHash, createHmac } from 'node:crypto';

import {
  computeDialogueV2FreeformPreparedBotVoiceTextSha256,
} from '../../shared/dialogue_v2_freeform_prepared_bot_voice_catalog';
import {
  transitionDialogueV2FreeformPreparedBotVoiceSelection,
  type DialogueV2FreeformPreparedBotVoiceCommittedTurn,
} from './dialogue_v2_freeform_prepared_bot_voice_selection';

const NOW_MS = Date.UTC(2026, 8, 27, 12, 0, 0);
const SESSION_ID = `d2fs_${'S'.repeat(32)}`;
const TURN_ID = `d2ft_${'T'.repeat(16)}`;
const REPLY_TEXT = 'You expressed that very clearly.';

const sha256 = (value: string): string => (
  createHash('sha256').update(value, 'utf8').digest('hex')
);

const completedTurn: DialogueV2FreeformPreparedBotVoiceCommittedTurn = Object.freeze({
  sessionId: SESSION_ID,
  turnId: TURN_ID,
  studyTarget: 'en',
  assistantMessage: REPLY_TEXT,
  completedAtMs: NOW_MS - 1_000,
});

function releaseSha256(releaseId: string, entries: readonly Record<string, unknown>[]): string {
  return sha256(JSON.stringify([
    'dialogue_v2_freeform_prepared_bot_voice_catalog.v1',
    releaseId,
    entries.map((entry) => [
      entry.studyTarget, entry.voiceStyleId, entry.preparedResponseId, entry.responseKind,
      entry.replyText, entry.replyTextSha256, entry.assetKey, entry.assetSha256,
      entry.assetBytes, entry.durationMs, entry.mime,
    ]),
  ]));
}

function catalog() {
  const entries = [{
    studyTarget: 'en',
    voiceStyleId: 'warm_tutor_en',
    preparedResponseId: 'milestone_en_01',
    responseKind: 'milestone',
    replyText: REPLY_TEXT,
    replyTextSha256: computeDialogueV2FreeformPreparedBotVoiceTextSha256(REPLY_TEXT),
    assetKey: 'freeform_milestone_en_01',
    assetSha256: 'a'.repeat(64),
    assetBytes: 4_096,
    durationMs: 1_250,
    mime: 'audio/mpeg',
  }];
  const releaseId = 'freeform_voice_2026_09_27_01';
  return {
    schemaVersion: 'dialogue_v2_freeform_prepared_bot_voice_catalog.v1',
    releaseId,
    releaseSha256: releaseSha256(releaseId, entries),
    entries,
  };
}

function eligibleHmac(material: string): string {
  for (let index = 0; index < 10_000; index += 1) {
    const digest = createHmac('sha256', `test-secret-${index}`).update(material).digest('hex');
    if (Number.parseInt(digest.slice(0, 2), 16) < 32) return digest;
  }
  throw new Error('eligible_digest_not_found');
}

describe('Dialogue V2 Freeform prepared bot voice pure selection', () => {
  it('returns text-only without touching HMAC or daily state when the server catalog is null', () => {
    const computeEligibilityHmac = jest.fn(() => '0'.repeat(64));

    expect(transitionDialogueV2FreeformPreparedBotVoiceSelection({
      nowMs: NOW_MS,
      committedTurn: completedTurn,
      serverCatalog: null,
      existingTurnSelection: null,
      trustedDailyState: null,
      computeEligibilityHmac,
    })).toEqual({ kind: 'no_selection', selection: null, nextDailyState: null });
    expect(computeEligibilityHmac).not.toHaveBeenCalled();
  });

  it('requires trusted completion timing before any new selection is possible', () => {
    const computeEligibilityHmac = jest.fn(() => '0'.repeat(64));

    expect(transitionDialogueV2FreeformPreparedBotVoiceSelection({
      nowMs: NOW_MS,
      committedTurn: { ...completedTurn, completedAtMs: null },
      serverCatalog: catalog(),
      existingTurnSelection: null,
      trustedDailyState: null,
      computeEligibilityHmac,
    })).toEqual({ kind: 'no_selection', selection: null, nextDailyState: null });
    expect(computeEligibilityHmac).not.toHaveBeenCalled();
  });

  it('binds an eligible future reviewed entry to the exact completed reply hash', () => {
    let hmacMaterial = '';
    const computeEligibilityHmac = jest.fn((material: string) => {
      hmacMaterial = material;
      return eligibleHmac(material);
    });

    const result = transitionDialogueV2FreeformPreparedBotVoiceSelection({
      nowMs: NOW_MS,
      committedTurn: completedTurn,
      serverCatalog: catalog(),
      existingTurnSelection: null,
      trustedDailyState: null,
      computeEligibilityHmac,
    });

    expect(result.kind).toBe('selected');
    if (result.kind !== 'selected') throw new Error('selection_missing');
    expect(hmacMaterial).toContain(SESSION_ID);
    expect(hmacMaterial).toContain(TURN_ID);
    expect(result.selection).toMatchObject({
      contractVersion: 'dialogue_v2_freeform_prepared_bot_voice_selection.v1',
      sessionId: SESSION_ID,
      turnId: TURN_ID,
      studyTarget: 'en',
      voiceCatalogReleaseId: 'freeform_voice_2026_09_27_01',
      voiceStyleId: 'warm_tutor_en',
      preparedResponseId: 'milestone_en_01',
      replyTextSha256: sha256(REPLY_TEXT),
      responseKind: 'milestone',
      dayKey: '2026-09-27',
      operationFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    const serialized = JSON.stringify(result.selection);
    expect(serialized).not.toContain(REPLY_TEXT);
    expect(serialized).not.toMatch(/asset|audio|uri|path|authUid|stableAccountId/i);
    expect(result.nextDailyState).toMatchObject({
      dayKey: '2026-09-27',
      claimedCount: 1,
      claimedOperationFingerprint: result.selection.operationFingerprint,
    });
  });

  it('fails text-only when HMAC eligibility is false or exact reply text does not match', () => {
    const ineligible = transitionDialogueV2FreeformPreparedBotVoiceSelection({
      nowMs: NOW_MS,
      committedTurn: completedTurn,
      serverCatalog: catalog(),
      existingTurnSelection: null,
      trustedDailyState: null,
      computeEligibilityHmac: () => 'f'.repeat(64),
    });
    expect(ineligible).toEqual({ kind: 'no_selection', selection: null, nextDailyState: null });

    const mismatch = transitionDialogueV2FreeformPreparedBotVoiceSelection({
      nowMs: NOW_MS,
      committedTurn: { ...completedTurn, assistantMessage: 'Different reply.' },
      serverCatalog: catalog(),
      existingTurnSelection: null,
      trustedDailyState: null,
      computeEligibilityHmac: () => '0'.repeat(64),
    });
    expect(mismatch).toEqual({ kind: 'no_selection', selection: null, nextDailyState: null });
  });

  it('uses the load-time SHA-256 primitive after a hostile post-load CJS export replacement', () => {
    const mutableCrypto = jest.requireActual<Record<string, unknown>>('node:crypto');
    const original = mutableCrypto.createHash;
    const injectedCreateHash = jest.fn(() => {
      throw new Error('forged_create_hash_used');
    });
    const reviewedCatalog = catalog();
    mutableCrypto.createHash = injectedCreateHash;

    try {
      expect(transitionDialogueV2FreeformPreparedBotVoiceSelection({
        nowMs: NOW_MS,
        committedTurn: completedTurn,
        serverCatalog: reviewedCatalog,
        existingTurnSelection: null,
        trustedDailyState: null,
        computeEligibilityHmac: () => '0'.repeat(64),
      })).toMatchObject({ kind: 'selected' });
      expect(injectedCreateHash).not.toHaveBeenCalled();
    } finally {
      mutableCrypto.createHash = original;
    }
  });

  it('uses the load-time selection protocol after a hostile post-load CJS replacement', () => {
    const contractExports = jest.requireActual<Record<string, unknown>>(
      '../../shared/dialogue_v2_freeform_prepared_bot_voice_selection_contract',
    );
    const exportName = 'DIALOGUE_V2_FREEFORM_PREPARED_BOT_VOICE_SELECTION_CONTRACT';
    const original = contractExports[exportName];
    contractExports[exportName] = 'forged_selection_contract.v999';

    try {
      const result = transitionDialogueV2FreeformPreparedBotVoiceSelection({
        nowMs: NOW_MS,
        committedTurn: completedTurn,
        serverCatalog: catalog(),
        existingTurnSelection: null,
        trustedDailyState: null,
        computeEligibilityHmac: () => '0'.repeat(64),
      });
      expect(result.kind).toBe('selected');
      if (result.kind !== 'selected') throw new Error('selection_missing');
      expect(result.selection.contractVersion).toBe(
        'dialogue_v2_freeform_prepared_bot_voice_selection.v1',
      );
    } finally {
      contractExports[exportName] = original;
    }
  });

  it('leaves a second eligible turn text-only after the shared daily slot is claimed', () => {
    const result = transitionDialogueV2FreeformPreparedBotVoiceSelection({
      nowMs: NOW_MS,
      committedTurn: completedTurn,
      serverCatalog: catalog(),
      existingTurnSelection: null,
      trustedDailyState: {
        dayKey: '2026-09-27',
        claimedCount: 1,
        claimedRequestId: 'scenario:already-claimed',
        claimedOperationFingerprint: 'd'.repeat(64),
      },
      computeEligibilityHmac: () => '0'.repeat(64),
    });

    expect(result).toEqual({
      kind: 'no_selection',
      selection: null,
      nextDailyState: {
        dayKey: '2026-09-27',
        claimedCount: 1,
        claimedRequestId: 'scenario:already-claimed',
        claimedOperationFingerprint: 'd'.repeat(64),
      },
    });
  });

  it('replays only the exact persisted selection under the same active catalog', () => {
    const first = transitionDialogueV2FreeformPreparedBotVoiceSelection({
      nowMs: NOW_MS,
      committedTurn: completedTurn,
      serverCatalog: catalog(),
      existingTurnSelection: null,
      trustedDailyState: null,
      computeEligibilityHmac: () => '0'.repeat(64),
    });
    if (first.kind !== 'selected') throw new Error('selection_missing');
    const computeEligibilityHmac = jest.fn(() => 'f'.repeat(64));

    expect(transitionDialogueV2FreeformPreparedBotVoiceSelection({
      nowMs: NOW_MS + 60_000,
      committedTurn: { ...completedTurn, completedAtMs: null },
      serverCatalog: catalog(),
      existingTurnSelection: first.selection,
      trustedDailyState: first.nextDailyState,
      computeEligibilityHmac,
    })).toEqual({
      kind: 'replay',
      selection: first.selection,
      nextDailyState: first.nextDailyState,
    });
    expect(computeEligibilityHmac).not.toHaveBeenCalled();

    expect(transitionDialogueV2FreeformPreparedBotVoiceSelection({
      nowMs: NOW_MS + 60_000,
      committedTurn: { ...completedTurn, completedAtMs: null },
      serverCatalog: null,
      existingTurnSelection: first.selection,
      trustedDailyState: first.nextDailyState,
      computeEligibilityHmac,
    })).toEqual({
      kind: 'no_selection',
      selection: null,
      nextDailyState: first.nextDailyState,
    });

    expect(() => transitionDialogueV2FreeformPreparedBotVoiceSelection({
      nowMs: NOW_MS,
      committedTurn: { ...completedTurn, assistantMessage: 'Tampered reply.' },
      serverCatalog: catalog(),
      existingTurnSelection: first.selection,
      trustedDailyState: first.nextDailyState,
      computeEligibilityHmac,
    })).toThrow('invalid_dialogue_v2_freeform_prepared_bot_voice_replay');
  });
});
