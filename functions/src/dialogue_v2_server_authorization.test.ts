import {
  authorizeDialogueV2ServerCatalogue,
  authorizeDialogueV2ServerLanguagePacks,
  authorizeDialogueV2ServerPacket,
  type DialogueV2ServerRelease,
} from './dialogue_v2_server_authorization';
import { DIALOGUE_V2_CATALOGUE_INDEX } from '../../shared/dialogue_v2_catalogue_index';
import {
  DIALOGUE_V2_STUDY_TARGETS,
  type DialogueV2StudyTarget,
  type DialogueV2ApprovedLanguagePackManifest,
  type DialogueV2LanguagePack,
} from '../../shared/dialogue_v2_language_pack_contract';
import { computeDialogueV2PackSha256 } from './dialogue_v2_pack_integrity';

function packet(
  studyTarget: DialogueV2StudyTarget = 'de',
  scenarioId = 'travel_19',
): DialogueV2LanguagePack {
  const catalogueEntry = DIALOGUE_V2_CATALOGUE_INDEX.find((entry) => entry.id === scenarioId);
  if (!catalogueEntry) throw new Error(`Unknown test scenario: ${scenarioId}`);
  const value: DialogueV2LanguagePack = {
    studyTarget,
    packVersion: 'dialogues_v2_2026_09_26',
    packSha256: '0'.repeat(64),
    catalogueSha256: 'b'.repeat(64),
    reviewReceiptSha256: 'c'.repeat(64),
    scenario: {
      id: catalogueEntry.id,
      worldId: catalogueEntry.worldId,
      rankRequired: catalogueEntry.rankRequired,
      cefr: catalogueEntry.cefr,
      personas: [{
        id: 'host', replyStyle: 'formal', voiceMode: 'optional_prepared_voice',
        displayName: 'Herr Weber', styleNote: 'Bleibt höflich und bittet um präzise Begründungen.',
        mood: 'measured', correctionStyle: 'gentle',
      }],
      objectives: Array.from({ length: 8 }, (_, index) => ({
        id: `goal_${index + 1}`,
        label: `Erfülle Gesprächsziel ${index + 1}.`,
      })),
      groupReplyPolicy: { maxDirectReplies: 1, maxUsefulFollowUps: 1, silenceAllowed: true },
    },
    content: {
      title: 'Eine komplexe Reiseänderung aushandeln',
      briefing: 'Erkläre das Problem, vergleiche Optionen und vereinbare eine faire Lösung.',
      completionTone: 'sachlich und respektvoll',
    },
    review: {
      targetContractGuardian: 'PASS', scenarioPackReviewer: 'PASS', promptLanguageJudge: 'PASS',
      voiceLocaleGate: 'PASS', stateIsolationJudge: 'PASS', surfaceMatrixGate: 'PASS',
    },
  };
  return { ...value, packSha256: computeDialogueV2PackSha256(value) };
}

function fullPackets(): Readonly<Record<string, DialogueV2LanguagePack>> {
  return Object.fromEntries(DIALOGUE_V2_STUDY_TARGETS.flatMap((studyTarget) =>
    DIALOGUE_V2_CATALOGUE_INDEX.map((scenario) => [
      `${studyTarget}:${scenario.id}`,
      packet(studyTarget, scenario.id),
    ]),
  ));
}

function fullManifest(
  packets: Readonly<Record<string, DialogueV2LanguagePack>> = fullPackets(),
): DialogueV2ApprovedLanguagePackManifest {
  return Object.fromEntries(Object.entries(packets).map(([key, value]) => [key, {
    studyTarget: value.studyTarget,
    scenarioId: value.scenario.id,
    packVersion: value.packVersion,
    packSha256: value.packSha256,
    catalogueSha256: value.catalogueSha256,
    reviewReceiptSha256: value.reviewReceiptSha256,
  }]));
}

function release(): DialogueV2ServerRelease {
  const packets = fullPackets();
  return {
    manifest: fullManifest(packets),
    packets,
  };
}

describe('dialogue V2 server authorization', () => {
  test('returns one fully attested server-only language pack set after validating the whole release once', () => {
    const serverRelease = release();

    const authorized = authorizeDialogueV2ServerLanguagePacks('fr', serverRelease);

    expect(authorized).toHaveLength(DIALOGUE_V2_CATALOGUE_INDEX.length);
    expect(authorized?.map((candidate) => candidate.scenario.id)).toEqual(
      DIALOGUE_V2_CATALOGUE_INDEX.map((entry) => entry.id),
    );
    expect(authorized?.every((candidate) => candidate.studyTarget === 'fr')).toBe(true);
    expect(authorized?.[0]).not.toBe(serverRelease.packets['fr:social_01']);
    expect(authorized?.[0]).toMatchObject({
      packVersion: 'dialogues_v2_2026_09_26',
      review: {
        targetContractGuardian: 'PASS',
        scenarioPackReviewer: 'PASS',
      },
    });
  });

  test('returns one complete learner catalogue without exposing release attestations', () => {
    const serverRelease = release();

    const authorized = authorizeDialogueV2ServerCatalogue('de', serverRelease);

    expect(authorized?.packets).toHaveLength(DIALOGUE_V2_CATALOGUE_INDEX.length);
    expect(authorized?.packets.map((candidate) => candidate.scenario.id)).toEqual(
      DIALOGUE_V2_CATALOGUE_INDEX.map((entry) => entry.id),
    );
    expect(authorized?.packets.every((candidate) => candidate.studyTarget === 'de')).toBe(true);
    expect(authorized).not.toHaveProperty('manifest');
    expect(authorized?.packets[0]).not.toBe(serverRelease.packets['de:social_01']);
    expect(Object.keys(authorized?.packets[0] ?? {}).sort()).toEqual([
      'content', 'scenario', 'studyTarget',
    ]);
    expect(Object.keys(authorized?.packets[0]?.scenario ?? {}).sort()).toEqual([
      'cefr', 'groupReplyPolicy', 'id', 'objectives', 'personas', 'rankRequired', 'worldId',
    ]);
    expect(Object.keys(authorized?.packets[0]?.scenario.personas[0] ?? {}).sort()).toEqual([
      'correctionStyle', 'displayName', 'id', 'mood', 'replyStyle', 'styleNote', 'voiceMode',
    ]);
    expect(Object.keys(authorized?.packets[0]?.scenario.objectives[0] ?? {}).sort()).toEqual([
      'id', 'label',
    ]);
    expect(Object.keys(authorized?.packets[0]?.scenario.groupReplyPolicy ?? {}).sort()).toEqual([
      'maxDirectReplies', 'maxUsefulFollowUps', 'silenceAllowed',
    ]);
    expect(Object.keys(authorized?.packets[0]?.content ?? {}).sort()).toEqual([
      'briefing', 'completionTone', 'title',
    ]);
  });

  test('allowlists learner fields from an approved packet carrying malicious metadata', () => {
    const serverRelease = release();
    const original = serverRelease.packets['de:social_01'];
    const withMetadata = {
      ...original,
      adminNote: 'internal moderation note',
      authoring: { sourcePrompt: 'secret' },
      plusOnly: true,
      purchaseRequired: true,
      quota: { monthly: 30 },
      scenario: {
        ...original.scenario,
        adminNote: 'scenario secret',
        personas: original.scenario.personas.map((persona) => ({
          ...persona,
          adminNote: 'persona secret',
        })),
        objectives: original.scenario.objectives.map((objective) => ({
          ...objective,
          authoring: 'draft hint',
        })),
        groupReplyPolicy: {
          ...original.scenario.groupReplyPolicy,
          quota: 999,
        },
      },
      content: {
        ...original.content,
        adminNote: 'content secret',
      },
    };
    const approvedWithMetadata = {
      ...withMetadata,
      packSha256: computeDialogueV2PackSha256(withMetadata),
    };
    const candidateRelease = {
      manifest: {
        ...serverRelease.manifest,
        'de:social_01': {
          ...serverRelease.manifest['de:social_01'],
          packSha256: approvedWithMetadata.packSha256,
        },
      },
      packets: {
        ...serverRelease.packets,
        'de:social_01': approvedWithMetadata,
      },
    };

    const authorized = authorizeDialogueV2ServerCatalogue('de', candidateRelease);
    const serialized = JSON.stringify(authorized);

    expect(authorized?.packets).toHaveLength(76);
    expect(serialized).not.toContain('adminNote');
    expect(serialized).not.toContain('authoring');
    expect(serialized).not.toContain('plusOnly');
    expect(serialized).not.toContain('purchaseRequired');
    expect(serialized).not.toContain('quota');
    expect(serialized).not.toContain('packSha256');
    expect(serialized).not.toContain('catalogueSha256');
    expect(serialized).not.toContain('reviewReceiptSha256');
    expect(serialized).not.toContain('packVersion');
    expect(serialized).not.toContain('review');
  });

  test('fails the whole catalogue closed when any packet in the approved release is invalid', () => {
    const serverRelease = release();
    const tamperedPacket = {
      ...serverRelease.packets['fr:travel_19'],
      content: {
        ...serverRelease.packets['fr:travel_19'].content,
        title: 'Un titre modifié sans nouveau condensat',
      },
    };

    expect(authorizeDialogueV2ServerCatalogue('de', {
      manifest: serverRelease.manifest,
      packets: {
        ...serverRelease.packets,
        'fr:travel_19': tamperedPacket,
      },
    })).toBeNull();
  });

  test('rejects unknown targets and partial releases instead of returning a sparse catalogue', () => {
    const serverRelease = release();

    expect(authorizeDialogueV2ServerCatalogue('it', serverRelease)).toBeNull();
    expect(authorizeDialogueV2ServerCatalogue('de', {
      manifest: serverRelease.manifest,
      packets: {
        'de:social_01': serverRelease.packets['de:social_01'],
      },
    })).toBeNull();
  });

  test('returns only the server-owned packet for an exact approved target and scenario', () => {
    const serverRelease = release();
    const authorized = authorizeDialogueV2ServerPacket(
      { studyTarget: 'de', scenarioId: 'travel_19' },
      serverRelease,
    );

    expect(authorized?.scenario).toMatchObject({ id: 'travel_19', rankRequired: 19, cefr: 'C2' });
    expect(authorized).not.toBe(serverRelease.packets['de:travel_19']);
  });

  test('fails closed when the packet is not pinned, even if its shape is valid', () => {
    const candidate = packet();
    const result = authorizeDialogueV2ServerPacket(
      { studyTarget: 'de', scenarioId: 'travel_19' },
      { manifest: {}, packets: { 'de:travel_19': candidate } },
    );

    expect(result).toBeNull();
  });

  test('does not activate an individually pinned packet from a partial language release', () => {
    const candidate = packet();
    const result = authorizeDialogueV2ServerPacket(
      { studyTarget: 'de', scenarioId: 'travel_19' },
      {
        manifest: {
          'de:travel_19': {
            studyTarget: 'de', scenarioId: 'travel_19', packVersion: candidate.packVersion,
            packSha256: candidate.packSha256, catalogueSha256: candidate.catalogueSha256,
            reviewReceiptSha256: candidate.reviewReceiptSha256,
          },
        },
        packets: { 'de:travel_19': candidate },
      },
    );

    expect(result).toBeNull();
  });

  test('rejects 304 valid manifest pins when the release contains only one actual packet', () => {
    const candidate = packet();
    const result = authorizeDialogueV2ServerPacket(
      { studyTarget: 'de', scenarioId: 'travel_19' },
      {
        manifest: fullManifest(),
        packets: { 'de:travel_19': candidate },
      },
    );

    expect(result).toBeNull();
  });

  test('fails closed when a valid packet is stored under a different target or scenario key', () => {
    const approvedPacket = packet();
    const targetMismatch = authorizeDialogueV2ServerPacket(
      { studyTarget: 'en', scenarioId: 'travel_19' },
      { manifest: release().manifest, packets: { 'en:travel_19': approvedPacket } },
    );
    const scenarioMismatch = authorizeDialogueV2ServerPacket(
      { studyTarget: 'de', scenarioId: 'social_01' },
      { manifest: release().manifest, packets: { 'de:social_01': approvedPacket } },
    );

    expect(targetMismatch).toBeNull();
    expect(scenarioMismatch).toBeNull();
  });

  test('does not accept client-supplied pack hashes as an authorization substitute', () => {
    const result = authorizeDialogueV2ServerPacket(
      { studyTarget: 'de', scenarioId: 'travel_19', packSha256: 'forged' },
      release(),
    );

    expect(result?.packSha256).toBe(release().packets['de:travel_19'].packSha256);
  });

  test('fails closed without throwing when an authoring ledger is passed as the release', () => {
    const authoringLedger = {
      schemaVersion: 'dialogue-v2-authoring-ledger.v1',
      status: 'authoring_only_not_releaseable',
      sourceLocale: 'ru',
      immutablePolicy: 'Do not expose to learners before review.',
      worlds: [{
        id: 'travel',
        scenarios: [{
          id: 'travel_19',
          rankRequired: 19,
          cefr: 'C2',
          objectives: Array.from({ length: 8 }, (_, index) => ({
            id: `objective_${index + 1}`,
            labelRu: `Задача ${index + 1}`,
          })),
        }],
      }],
    };

    expect(() => authorizeDialogueV2ServerPacket(
      { studyTarget: 'de', scenarioId: 'travel_19' },
      authoringLedger,
    )).not.toThrow();
    expect(authorizeDialogueV2ServerPacket(
      { studyTarget: 'de', scenarioId: 'travel_19' },
      authoringLedger,
    )).toBeNull();
  });

  test('rejects an authoring ledger even when valid release fields are appended', () => {
    const serverRelease = release();
    const augmentedAuthoringLedger = {
      schemaVersion: 'dialogue-v2-authoring-ledger.v1',
      status: 'authoring_only_not_releaseable',
      sourceLocale: 'ru',
      worlds: [],
      manifest: serverRelease.manifest,
      packets: serverRelease.packets,
    };

    expect(authorizeDialogueV2ServerPacket(
      { studyTarget: 'de', scenarioId: 'travel_19' },
      augmentedAuthoringLedger,
    )).toBeNull();
  });

  test('rejects packet accessors without invoking them', () => {
    const stablePacket = packet();
    let scenarioGetterReads = 0;
    const accessorPacket = { ...stablePacket } as Record<string, unknown>;
    Object.defineProperty(accessorPacket, 'scenario', {
      enumerable: true,
      configurable: true,
      get: () => {
        scenarioGetterReads += 1;
        return stablePacket.scenario;
      },
    });

    const result = authorizeDialogueV2ServerPacket(
      { studyTarget: 'de', scenarioId: 'travel_19' },
      {
        manifest: fullManifest(),
        packets: { 'de:travel_19': accessorPacket },
      },
    );

    expect(result).toBeNull();
    expect(scenarioGetterReads).toBe(0);
  });

  test('uses one data-only packet snapshot instead of observing a flipping proxy', () => {
    const stablePacket = packet();
    let getTrapReads = 0;
    let scenarioReads = 0;
    const poisonedScenario = {
      ...stablePacket.scenario,
      personas: [{ id: 'intruder', replyStyle: 'direct', voiceMode: 'text_only' }],
    };
    const flippingPacket = new Proxy(stablePacket, {
      get: (target, property, receiver) => {
        getTrapReads += 1;
        if (property === 'scenario') {
          scenarioReads += 1;
          return scenarioReads <= 4 ? stablePacket.scenario : poisonedScenario;
        }
        return Reflect.get(target, property, receiver);
      },
    });

    const packets = { ...fullPackets(), 'de:travel_19': flippingPacket };
    const result = authorizeDialogueV2ServerPacket(
      { studyTarget: 'de', scenarioId: 'travel_19' },
      {
        manifest: fullManifest(),
        packets,
      },
    );

    expect(getTrapReads).toBe(0);
    expect(result?.scenario.personas[0]?.id).toBe('host');
  });

  test('rejects localized learner content changed without a matching content digest', () => {
    const serverRelease = release();
    const approved = serverRelease.packets['de:travel_19'];
    const tampered = {
      ...approved,
      content: {
        ...approved.content,
        title: 'Manipulierter Titel mit demselben behaupteten Hash',
      },
    };

    const result = authorizeDialogueV2ServerPacket(
      { studyTarget: 'de', scenarioId: 'travel_19' },
      {
        manifest: serverRelease.manifest,
        packets: { ...serverRelease.packets, 'de:travel_19': tampered },
      },
    );

    expect(result).toBeNull();
  });

  test('rejects a study-target substitution that retains another packet content digest', () => {
    const serverRelease = release();
    const dePacket = serverRelease.packets['de:travel_19'];
    const substituted = { ...dePacket, studyTarget: 'es' as const };

    const result = authorizeDialogueV2ServerPacket(
      { studyTarget: 'es', scenarioId: 'travel_19' },
      {
        manifest: {
          ...serverRelease.manifest,
          'es:travel_19': {
            ...serverRelease.manifest['es:travel_19'],
            packSha256: dePacket.packSha256,
          },
        },
        packets: { ...serverRelease.packets, 'es:travel_19': substituted },
      },
    );

    expect(result).toBeNull();
  });
});
