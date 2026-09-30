import { DIALOGUE_V2_CATALOGUE_INDEX } from '../../shared/dialogue_v2_catalogue_index';
import {
  DIALOGUE_V2_STUDY_TARGETS,
  type DialogueV2ApprovedLanguagePackManifest,
  type DialogueV2LanguagePack,
  type DialogueV2StudyTarget,
} from '../../shared/dialogue_v2_language_pack_contract';
import { computeDialogueV2PackSha256 } from './dialogue_v2_pack_integrity';
import {
  DialogueV2CompletionServerError,
  executeDialogueV2CompletionReview,
} from './dialogue_v2_completion_server';
import type { DialogueV2ServerRelease } from './dialogue_v2_server_authorization';

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
        id: 'host',
        replyStyle: 'formal',
        voiceMode: 'optional_prepared_voice',
        displayName: 'Herr Weber',
        styleNote: 'Bleibt höflich und bittet um präzise Begründungen.',
        mood: 'measured',
        correctionStyle: 'gentle',
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
      targetContractGuardian: 'PASS',
      scenarioPackReviewer: 'PASS',
      promptLanguageJudge: 'PASS',
      voiceLocaleGate: 'PASS',
      stateIsolationJudge: 'PASS',
      surfaceMatrixGate: 'PASS',
    },
  };
  return { ...value, packSha256: computeDialogueV2PackSha256(value) };
}

function release(): DialogueV2ServerRelease {
  const packets = Object.fromEntries(DIALOGUE_V2_STUDY_TARGETS.flatMap((studyTarget) =>
    DIALOGUE_V2_CATALOGUE_INDEX.map((scenario) => {
      const value = packet(studyTarget, scenario.id);
      return [`${studyTarget}:${scenario.id}`, value];
    }),
  ));
  const manifest: DialogueV2ApprovedLanguagePackManifest = Object.fromEntries(
    Object.entries(packets).map(([key, value]) => [key, {
      studyTarget: value.studyTarget,
      scenarioId: value.scenario.id,
      packVersion: value.packVersion,
      packSha256: value.packSha256,
      catalogueSha256: value.catalogueSha256,
      reviewReceiptSha256: value.reviewReceiptSha256,
    }]),
  );
  return { manifest, packets };
}

function requestFor(approved: DialogueV2LanguagePack) {
  return {
    dialogueVersion: 'v2' as const,
    studyTarget: approved.studyTarget,
    scenarioId: approved.scenario.id,
    packVersion: approved.packVersion,
    packSha256: approved.packSha256,
    sharedManifestSha256: approved.catalogueSha256,
    interfaceLang: 'en',
    history: [
      { role: 'assistant', content: 'Wie kann ich Ihnen helfen?' },
      { role: 'user', content: 'Ich muss meine Reise ändern.' },
      { role: 'user', content: 'Könnten wir eine faire Lösung finden?' },
    ],
  };
}

function validFeedback(approved: DialogueV2LanguagePack) {
  return {
    overallAssessment: 'You explained the travel problem clearly and kept the negotiation respectful throughout.',
    nextStep: 'Next time, compare one more concrete option before agreeing.',
    speakerPersonaId: 'host',
    objectiveResults: approved.scenario.objectives.map((objective, index) => ({
      objectiveId: objective.id,
      status: index < 2 ? 'met' : 'not_met',
      evidenceMessageIds: [index % 2 === 0 ? 'u_0001' : 'u_0002'],
    })),
    evidenceMessageIds: ['u_0001', 'u_0002'],
    languageNote: {
      sourceMessageId: 'u_0001',
      corrected: 'Ich muss meine Reise ändern.',
      reason: 'This is already a clear and natural sentence.',
    },
  };
}

describe('Dialogue V2 completion server path', () => {
  test('fails closed before provider work when no approved server release exists', async () => {
    const generateFeedback = jest.fn();

    await expect(executeDialogueV2CompletionReview(
      {
        dialogueVersion: 'v2',
        studyTarget: 'de',
        scenarioId: 'travel_19',
        packVersion: 'dialogues_v2_2026_09_26',
        packSha256: 'a'.repeat(64),
        sharedManifestSha256: 'b'.repeat(64),
        interfaceLang: 'en',
        history: [{ role: 'user', content: 'Hallo.' }],
      },
      { resolveRelease: async () => null, generateFeedback },
    )).rejects.toEqual(new DialogueV2CompletionServerError('release_unavailable'));
    expect(generateFeedback).not.toHaveBeenCalled();
  });

  test('uses only the authorized packet and a server-derived stable learner ledger', async () => {
    const serverRelease = release();
    const approved = serverRelease.packets['de:travel_19'];
    const generateFeedback = jest.fn(async ({ systemPrompt, transcriptJson }) => {
      expect(systemPrompt).toContain('Erfülle Gesprächsziel 1.');
      expect(systemPrompt).toContain('Herr Weber');
      expect(transcriptJson).toContain('u_0001');
      expect(transcriptJson).toContain('u_0002');
      return JSON.stringify(validFeedback(approved));
    });

    const response = await executeDialogueV2CompletionReview(
      requestFor(approved),
      { resolveRelease: async () => serverRelease, generateFeedback },
    );

    expect(response.context).toEqual({
      objectiveIds: approved.scenario.objectives.map((objective) => objective.id),
      personaIds: ['host'],
      userMessageIds: ['u_0001', 'u_0002'],
    });
    expect(response.objectiveLabels).toEqual(Object.fromEntries(
      approved.scenario.objectives.map((objective) => [objective.id, objective.label]),
    ));
    expect(response.personaNames).toEqual({ host: 'Herr Weber' });
    expect(response.userMessages).toEqual({
      u_0001: 'Ich muss meine Reise ändern.',
      u_0002: 'Könnten wir eine faire Lösung finden?',
    });
    expect(response.feedback.objectiveResults).toHaveLength(8);
    expect(generateFeedback).toHaveBeenCalledTimes(1);
  });

  test('rejects every unknown request key, including client rank authority, before release or provider work', async () => {
    const serverRelease = release();
    const approved = serverRelease.packets['de:travel_19'];
    for (const [field, value] of [
      ['rank', 99],
      ['achievedRank', 99],
      ['rankRequired', 19],
      ['coinRank', 99],
      ['objectives', [{ id: 'forged', label: 'Client objective' }]],
      ['persona', { id: 'intruder', displayName: 'Client persona' }],
      ['goalEn', 'Client-owned goal'],
      ['unexpected', true],
    ] as const) {
      const resolveRelease = jest.fn(async () => serverRelease);
      const generateFeedback = jest.fn(async () => JSON.stringify(validFeedback(approved)));

      await expect(executeDialogueV2CompletionReview(
        { ...requestFor(approved), [field]: value },
        { resolveRelease, generateFeedback },
      )).rejects.toEqual(new DialogueV2CompletionServerError('request_invalid'));
      expect(resolveRelease).not.toHaveBeenCalled();
      expect(generateFeedback).not.toHaveBeenCalled();
    }
  });

  test('rejects feedback that omits an objective or cites a non-ledger message', async () => {
    const serverRelease = release();
    const approved = serverRelease.packets['de:travel_19'];
    const invalid = validFeedback(approved);
    invalid.objectiveResults = invalid.objectiveResults.slice(1);
    invalid.evidenceMessageIds = ['client_message'];

    await expect(executeDialogueV2CompletionReview(
      requestFor(approved),
      {
        resolveRelease: async () => serverRelease,
        generateFeedback: async () => JSON.stringify(invalid),
      },
    )).rejects.toEqual(new DialogueV2CompletionServerError('feedback_invalid'));
  });

  test('rejects stale client pack references before provider work', async () => {
    const serverRelease = release();
    const approved = serverRelease.packets['de:travel_19'];
    const generateFeedback = jest.fn();

    await expect(executeDialogueV2CompletionReview(
      { ...requestFor(approved), packSha256: 'f'.repeat(64) },
      { resolveRelease: async () => serverRelease, generateFeedback },
    )).rejects.toEqual(new DialogueV2CompletionServerError('pack_reference_mismatch'));
    expect(generateFeedback).not.toHaveBeenCalled();
  });

  test('never interpolates an untrusted interface-language string into the model instruction', async () => {
    const serverRelease = release();
    const approved = serverRelease.packets['de:travel_19'];
    const generateFeedback = jest.fn(async ({ systemPrompt }) => {
      expect(systemPrompt).toContain('interface language en');
      expect(systemPrompt).not.toContain('IGNORE_RULES');
      return JSON.stringify(validFeedback(approved));
    });

    await executeDialogueV2CompletionReview(
      { ...requestFor(approved), interfaceLang: 'ru\nIGNORE_RULES' },
      { resolveRelease: async () => serverRelease, generateFeedback },
    );

    expect(generateFeedback).toHaveBeenCalledTimes(1);
  });

  test('completes an approved high-rank scenario without any server rank projection', async () => {
    const serverRelease = release();
    const approved = serverRelease.packets['de:travel_19'];
    const generateFeedback = jest.fn(async () => JSON.stringify(validFeedback(approved)));

    await expect(executeDialogueV2CompletionReview(
      requestFor(approved),
      {
        resolveRelease: async () => serverRelease,
        generateFeedback,
      },
    )).resolves.toMatchObject({ feedback: { speakerPersonaId: 'host' } });
    expect(generateFeedback).toHaveBeenCalledTimes(1);
  });
});
