import {
  matchesDialogueV2ApprovedLanguagePackManifest,
  validateDialogueV2LanguagePack,
  type DialogueV2ApprovedLanguagePackManifest,
  type DialogueV2StudyTarget,
} from '../shared/dialogue_v2_language_pack_contract';

function packet() {
  return {
    studyTarget: 'es',
    packVersion: 'dialogues_v2_2026_09_26',
    packSha256: 'a'.repeat(64),
    catalogueSha256: 'b'.repeat(64),
    reviewReceiptSha256: 'c'.repeat(64),
    scenario: {
      id: 'social_11', worldId: 'social', rankRequired: 11, cefr: 'B1',
      personas: [
        {
          id: 'host', replyStyle: 'warm', voiceMode: 'text_only',
          displayName: 'Lucía', styleNote: 'Acoge ideas y pregunta con interés.',
          mood: 'open', correctionStyle: 'gentle',
        },
        {
          id: 'planner', replyStyle: 'direct', voiceMode: 'optional_prepared_voice',
          displayName: 'Mateo', styleNote: 'Va al grano y confirma los detalles.',
          mood: 'focused', correctionStyle: 'playful_gentle',
        },
      ],
      objectives: Array.from({ length: 6 }, (_, index) => ({
        id: `goal_${index + 1}`,
        label: `Completa el paso ${index + 1} de la conversación.`,
      })),
      groupReplyPolicy: { maxDirectReplies: 1, maxUsefulFollowUps: 1, silenceAllowed: true },
    },
    content: {
      title: 'Organiza una salida con el grupo',
      briefing: 'Propón un plan y acuerda una hora que funcione para todos.',
      completionTone: 'amistoso y concreto',
    },
    review: {
      targetContractGuardian: 'PASS', scenarioPackReviewer: 'PASS', promptLanguageJudge: 'PASS',
      voiceLocaleGate: 'PASS', stateIsolationJudge: 'PASS', surfaceMatrixGate: 'PASS',
    },
  };
}

function approvedManifest(): DialogueV2ApprovedLanguagePackManifest {
  const value = packet();
  return {
    'es:social_11': {
      studyTarget: value.studyTarget as DialogueV2StudyTarget,
      scenarioId: value.scenario.id,
      packVersion: value.packVersion,
      packSha256: value.packSha256,
      catalogueSha256: value.catalogueSha256,
      reviewReceiptSha256: value.reviewReceiptSha256,
    },
  };
}

describe('dialogue v2 language packet contract', () => {
  test('accepts an activation-ready packet only when it matches the catalogue spine', () => {
    const value = packet();
    expect(validateDialogueV2LanguagePack(value)).toEqual({ ok: true });
    expect(matchesDialogueV2ApprovedLanguagePackManifest(value, approvedManifest())).toBe(true);
  });

  test('rejects a packet that forges the canonical rank or CEFR', () => {
    const value = packet();
    value.scenario.rankRequired = 1;

    expect(validateDialogueV2LanguagePack(value)).toEqual({ ok: false, error: 'catalogue_mismatch' });
    expect(matchesDialogueV2ApprovedLanguagePackManifest(value, approvedManifest())).toBe(false);
  });

  test('requires six to twelve unique goals and every independent review pass', () => {
    const invalidGoals = packet();
    invalidGoals.scenario.objectives = invalidGoals.scenario.objectives.slice(0, 5);
    expect(validateDialogueV2LanguagePack(invalidGoals)).toEqual({ ok: false, error: 'objective_count' });

    const notReviewed = packet();
    notReviewed.review.voiceLocaleGate = 'REVISE';
    expect(validateDialogueV2LanguagePack(notReviewed)).toEqual({ ok: true });
    expect(matchesDialogueV2ApprovedLanguagePackManifest(notReviewed, approvedManifest())).toBe(false);
  });

  test('does not let an empty structural shell pose as learner-ready content', () => {
    const missingObjectiveCopy = packet();
    delete (missingObjectiveCopy.scenario.objectives[0] as { label?: string }).label;
    expect(validateDialogueV2LanguagePack(missingObjectiveCopy)).toEqual({
      ok: false,
      error: 'learner_content_invalid',
    });

    const missingBriefing = packet();
    missingBriefing.content.briefing = '  ';
    expect(validateDialogueV2LanguagePack(missingBriefing)).toEqual({
      ok: false,
      error: 'learner_content_invalid',
    });
  });

  test('requires a declared mood and bounded correction style for every participant', () => {
    const invalidMood = packet();
    invalidMood.scenario.personas[0].mood = 'frenetic';
    expect(validateDialogueV2LanguagePack(invalidMood)).toEqual({
      ok: false,
      error: 'persona_behavior_invalid',
    });

    const missingCorrectionStyle = packet();
    delete (missingCorrectionStyle.scenario.personas[1] as { correctionStyle?: string }).correctionStyle;
    expect(validateDialogueV2LanguagePack(missingCorrectionStyle)).toEqual({
      ok: false,
      error: 'persona_behavior_invalid',
    });
  });

  test('does not activate a syntactically valid packet without an exact server pin', () => {
    const value = packet();
    expect(matchesDialogueV2ApprovedLanguagePackManifest(value, {})).toBe(false);
    expect(matchesDialogueV2ApprovedLanguagePackManifest({ ...value, packSha256: 'd'.repeat(64) }, approvedManifest())).toBe(false);
  });
});
