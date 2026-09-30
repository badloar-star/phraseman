import {
  computeDialogueV2PackSha256,
  verifyDialogueV2PackSha256,
} from './dialogue_v2_pack_integrity';

type MutablePacket = Record<string, any>;

function packet(): MutablePacket {
  const value: MutablePacket = {
    studyTarget: 'de',
    packVersion: 'dialogues_v2_2026_09_26',
    packSha256: '0'.repeat(64),
    catalogueSha256: 'b'.repeat(64),
    reviewReceiptSha256: 'c'.repeat(64),
    scenario: {
      id: 'travel_19', worldId: 'travel', rankRequired: 19, cefr: 'C2',
      personas: [{
        id: 'host', replyStyle: 'formal', voiceMode: 'optional_prepared_voice',
        displayName: 'Herr Weber', styleNote: 'Bleibt höflich und präzise.',
      }],
      objectives: Array.from({ length: 6 }, (_, index) => ({
        id: `goal_${index + 1}`, label: `Gesprächsziel ${index + 1} erfüllen.`,
      })),
      groupReplyPolicy: { maxDirectReplies: 1, maxUsefulFollowUps: 1, silenceAllowed: true },
    },
    content: {
      title: 'Eine komplexe Reiseänderung aushandeln',
      briefing: 'Erkläre das Problem und vereinbare eine faire Lösung.',
      completionTone: 'sachlich und respektvoll',
    },
    review: {
      targetContractGuardian: 'PASS', scenarioPackReviewer: 'PASS', promptLanguageJudge: 'PASS',
      voiceLocaleGate: 'PASS', stateIsolationJudge: 'PASS', surfaceMatrixGate: 'PASS',
    },
  };
  value.packSha256 = computeDialogueV2PackSha256(value);
  return value;
}

function clone(value: MutablePacket): MutablePacket {
  return JSON.parse(JSON.stringify(value)) as MutablePacket;
}

describe('dialogue V2 packet byte integrity', () => {
  test('is deterministic across object key insertion order and excludes only its self-hash', () => {
    const approved = packet();
    const reordered = Object.fromEntries(Object.entries(approved).reverse()) as MutablePacket;

    expect(computeDialogueV2PackSha256(reordered)).toBe(approved.packSha256);
    expect(verifyDialogueV2PackSha256(reordered)).toBe(true);

    reordered.packSha256 = 'f'.repeat(64);
    expect(computeDialogueV2PackSha256(reordered)).toBe(approved.packSha256);
    expect(verifyDialogueV2PackSha256(reordered)).toBe(false);
  });

  test.each([
    ['study target', (value: MutablePacket) => { value.studyTarget = 'es'; }],
    ['localized title', (value: MutablePacket) => { value.content.title = 'Título sustituido'; }],
    ['persona display name', (value: MutablePacket) => { value.scenario.personas[0].displayName = 'Eindringling'; }],
    ['persona reply style', (value: MutablePacket) => { value.scenario.personas[0].replyStyle = 'direct'; }],
    ['persona style note', (value: MutablePacket) => { value.scenario.personas[0].styleNote = 'Antwortet anders.'; }],
    ['objective label', (value: MutablePacket) => { value.scenario.objectives[0].label = 'Anderes Ziel.'; }],
    ['review verdict', (value: MutablePacket) => { value.review.promptLanguageJudge = 'REVISE'; }],
  ])('binds %s to the digest', (_label, mutate) => {
    const changed = clone(packet());
    mutate(changed);

    expect(verifyDialogueV2PackSha256(changed)).toBe(false);
  });
});
