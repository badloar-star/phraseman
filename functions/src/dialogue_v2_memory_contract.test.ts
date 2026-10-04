import {
  deriveDialogueV2MemoryPlan,
  type DialogueV2MemoryServerContext,
} from './dialogue_v2_memory_contract';
import type { DialogueV2ApprovedLanguagePackManifest } from '../../shared/dialogue_v2_language_pack_contract';

function pin(studyTarget: 'en' | 'es' | 'fr' | 'de', scenarioId: string) {
  return {
    studyTarget,
    scenarioId,
    packVersion: 'dialogues_v2_2026_09_26',
    packSha256: 'a'.repeat(64),
    catalogueSha256: 'b'.repeat(64),
    reviewReceiptSha256: 'c'.repeat(64),
  };
}

const APPROVED_PACKS: DialogueV2ApprovedLanguagePackManifest = {
  'es:travel_19': pin('es', 'travel_19'),
  'de:social_01': pin('de', 'social_01'),
  'fr:travel_01': pin('fr', 'travel_01'),
  'fr:social_01': pin('fr', 'social_01'),
  'en:travel_01': pin('en', 'travel_01'),
};

const SERVER_CONTEXT: DialogueV2MemoryServerContext = {
  stableAccountId: 'acct_private_42@example.test',
  isPremium: false,
  identifierSecret: 'server-owned-secret-with-at-least-32-bytes',
  approvedPackManifest: APPROVED_PACKS,
};

describe('Dialogue V2 server memory contract', () => {
  test('gives Free accounts structured account-language memory without resume', () => {
    const plan = deriveDialogueV2MemoryPlan(SERVER_CONTEXT, {
      studyTarget: 'es',
      scenarioId: 'travel_19',
    });

    expect(plan).toMatchObject({
      contractVersion: 'dialogue_v2_memory_v1',
      sharedMemory: {
        scope: 'account_language',
        studyTarget: 'es',
        format: 'structured_summary',
        rawTranscriptRetention: 'forbidden',
      },
      scenarioThread: null,
    });
  });

  test('gives Plus accounts a resumable scenario thread without permanent raw transcripts', () => {
    const plan = deriveDialogueV2MemoryPlan(
      { ...SERVER_CONTEXT, isPremium: true },
      { studyTarget: 'de', scenarioId: 'social_01' },
    );

    expect(plan).toMatchObject({
      sharedMemory: {
        scope: 'account_language',
        studyTarget: 'de',
        rawTranscriptRetention: 'forbidden',
      },
      scenarioThread: {
        scope: 'account_language_scenario',
        studyTarget: 'de',
        scenarioId: 'social_01',
        resumable: true,
        format: 'structured_checkpoint',
        rawTranscriptRetention: 'forbidden',
      },
    });
  });

  test('shares structured memory across scenarios while isolating resumable threads', () => {
    const context = { ...SERVER_CONTEXT, isPremium: true };
    const travel = deriveDialogueV2MemoryPlan(context, {
      studyTarget: 'fr', scenarioId: 'travel_01',
    });
    const cafe = deriveDialogueV2MemoryPlan(context, {
      studyTarget: 'fr', scenarioId: 'social_01',
    });
    const english = deriveDialogueV2MemoryPlan(context, {
      studyTarget: 'en', scenarioId: 'travel_01',
    });

    expect(travel?.sharedMemory.id).toBe(cafe?.sharedMemory.id);
    expect(travel?.scenarioThread?.id).not.toBe(cafe?.scenarioThread?.id);
    expect(travel?.sharedMemory.id).not.toBe(english?.sharedMemory.id);
  });

  test('fails closed for invalid trusted identity, entitlement, language, or scenario', () => {
    const validRequest = { studyTarget: 'es', scenarioId: 'travel_19' };
    const invalidContexts: DialogueV2MemoryServerContext[] = [
      { ...SERVER_CONTEXT, stableAccountId: '' },
      { ...SERVER_CONTEXT, stableAccountId: '   ' },
      { ...SERVER_CONTEXT, isPremium: 'true' },
      { ...SERVER_CONTEXT, identifierSecret: 'short' },
    ];

    for (const context of invalidContexts) {
      expect(deriveDialogueV2MemoryPlan(context, validRequest)).toBeNull();
    }
    for (const request of [
      { studyTarget: 'it', scenarioId: 'travel_19' },
      { studyTarget: 'ES', scenarioId: 'travel_19' },
      { studyTarget: 'es', scenarioId: '' },
      { studyTarget: 'es', scenarioId: '../travel_19' },
      { studyTarget: 'es', scenarioId: 'travel 19' },
      { studyTarget: 'es', scenarioId: 'social_cafe_03' },
    ]) {
      expect(deriveDialogueV2MemoryPlan(SERVER_CONTEXT, request)).toBeNull();
    }
  });

  test('never treats client uid, stable uid, or premium claims as authority', () => {
    const baseline = deriveDialogueV2MemoryPlan(SERVER_CONTEXT, {
      studyTarget: 'es', scenarioId: 'travel_19',
    });
    const forged = deriveDialogueV2MemoryPlan(SERVER_CONTEXT, {
      studyTarget: 'es',
      scenarioId: 'travel_19',
      uid: 'attacker',
      stableUid: 'attacker-stable',
      stableAccountId: 'attacker-account',
      isPremium: true,
    });

    expect(forged).toEqual(baseline);
    expect(forged?.scenarioThread).toBeNull();
  });

  test('does not allocate memory for a catalogue scenario absent from the server-owned language release', () => {
    const plan = deriveDialogueV2MemoryPlan(
      { ...SERVER_CONTEXT, approvedPackManifest: {} },
      { studyTarget: 'es', scenarioId: 'travel_19' },
    );

    expect(plan).toBeNull();
  });

  test('returns JSON-serializable opaque identifiers with no account PII', () => {
    const plan = deriveDialogueV2MemoryPlan(
      { ...SERVER_CONTEXT, isPremium: true },
      { studyTarget: 'es', scenarioId: 'travel_19' },
    );
    const serialized = JSON.stringify(plan);

    expect(JSON.parse(serialized)).toEqual(plan);
    expect(serialized).not.toContain(SERVER_CONTEXT.stableAccountId as string);
    expect(serialized).not.toContain('example.test');
    expect(plan?.sharedMemory.id).toMatch(/^d2m_[a-f0-9]{40}$/);
    expect(plan?.scenarioThread?.id).toMatch(/^d2t_[a-f0-9]{40}$/);
  });
});
