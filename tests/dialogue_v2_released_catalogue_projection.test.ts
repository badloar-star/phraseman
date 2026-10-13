import {
  DIALOGUE_V2_CATALOGUE_INDEX,
} from '../shared/dialogue_v2_catalogue_index';
import type {
  DialogueV2ApprovedLanguagePackManifest,
  DialogueV2LanguagePack,
} from '../shared/dialogue_v2_language_pack_contract';

import {
  projectReleasedDialogueV2Catalogue,
} from '../app/dialogue_v2_released_catalogue_projection';

const ALL_PASS_REVIEW = {
  targetContractGuardian: 'PASS',
  scenarioPackReviewer: 'PASS',
  promptLanguageJudge: 'PASS',
  voiceLocaleGate: 'PASS',
  stateIsolationJudge: 'PASS',
  surfaceMatrixGate: 'PASS',
} as const;

const WORLD_HEADINGS = [
  { id: 'social', title: 'Общение' },
  { id: 'work', title: 'Работа' },
  { id: 'travel', title: 'Поездки' },
  { id: 'everyday', title: 'Каждый день' },
] as const;

function releasedFixture(): Readonly<{
  packets: readonly DialogueV2LanguagePack[];
  manifest: DialogueV2ApprovedLanguagePackManifest;
}> {
  const packets = DIALOGUE_V2_CATALOGUE_INDEX.map((entry, index) => ({
    studyTarget: 'en' as const,
    packVersion: 'dialogues-v2-2026-09-26',
    packSha256: index.toString(16).padStart(64, 'a'),
    catalogueSha256: 'b'.repeat(64),
    reviewReceiptSha256: index.toString(16).padStart(64, 'c'),
    scenario: {
      id: entry.id,
      worldId: entry.worldId,
      rankRequired: entry.rankRequired,
      cefr: entry.cefr,
      personas: [{
        id: 'host', replyStyle: 'warm' as const, voiceMode: 'text_only' as const,
        displayName: 'Taylor', styleNote: 'Keeps the conversation moving with care.',
        mood: 'open' as const, correctionStyle: 'gentle' as const,
      }],
      objectives: Array.from({ length: 6 }, (_, objectiveIndex) => ({
        id: `goal_${objectiveIndex + 1}`,
        label: `Complete conversation objective ${objectiveIndex + 1}.`,
      })),
      groupReplyPolicy: { maxDirectReplies: 1 as const, maxUsefulFollowUps: 0 as const, silenceAllowed: true as const },
    },
    content: {
      title: `Released ${entry.id}`,
      briefing: 'Continue the chat naturally until the shared goal is complete.',
      completionTone: 'warm and specific',
    },
    review: ALL_PASS_REVIEW,
  }));
  const manifest = Object.fromEntries(packets.map((packet) => [`${packet.studyTarget}:${packet.scenario.id}`, {
    studyTarget: packet.studyTarget,
    scenarioId: packet.scenario.id,
    packVersion: packet.packVersion,
    packSha256: packet.packSha256,
    catalogueSha256: packet.catalogueSha256,
    reviewReceiptSha256: packet.reviewReceiptSha256,
  }]));
  return { packets, manifest };
}

describe('released dialogue v2 catalogue projection', () => {
  test('projects exactly the full release into rank-only learner rows and supplied world order', () => {
    const { packets, manifest } = releasedFixture();

    expect(projectReleasedDialogueV2Catalogue({
      packets,
      manifest,
      studyTarget: 'en',
      localCoinRank: 3,
      worldHeadings: WORLD_HEADINGS,
    })).toEqual({
      worlds: WORLD_HEADINGS,
      items: expect.arrayContaining([
        expect.objectContaining({
          id: 'social_01', title: 'Released social_01', cefr: 'A1', rankRequired: 0, status: 'available', // ранг открытия из таблицы (правило владельца 13.10)
        }),
        expect.objectContaining({
          id: 'work_04', title: 'Released work_04', cefr: 'A1', rankRequired: 4, status: 'locked',
        }),
      ]),
    });
    expect(projectReleasedDialogueV2Catalogue({
      packets,
      manifest,
      studyTarget: 'en',
      localCoinRank: 3,
      worldHeadings: WORLD_HEADINGS,
    })?.items).toHaveLength(76);
  });

  test.each([
    ['a duplicate canonical packet', (packets: readonly DialogueV2LanguagePack[]) => [...packets, packets[0]]],
    ['a missing canonical packet', (packets: readonly DialogueV2LanguagePack[]) => packets.slice(1)],
    ['a packet from another study target', (packets: readonly DialogueV2LanguagePack[]) => [{ ...packets[0], studyTarget: 'es' }, ...packets.slice(1)]],
  ])('fails closed for %s', (_reason, alterPackets) => {
    const { packets, manifest } = releasedFixture();

    expect(projectReleasedDialogueV2Catalogue({
      packets: alterPackets(packets),
      manifest,
      studyTarget: 'en',
      localCoinRank: 19,
      worldHeadings: WORLD_HEADINGS,
    })).toBeNull();
  });

  test.each([
    ['a non-PASS manifest-matched packet', (packets: readonly DialogueV2LanguagePack[]) => [{
      ...packets[0], review: { ...packets[0].review, voiceLocaleGate: 'REVISE' as const },
    }, ...packets.slice(1)]],
    ['an invalid world-heading set', () => WORLD_HEADINGS.slice(0, 3)],
    ['a duplicated world heading', () => [...WORLD_HEADINGS.slice(0, 3), WORLD_HEADINGS[0]]],
  ])('does not expose a partial catalogue for %s', (_reason, alter) => {
    const { packets, manifest } = releasedFixture();
    const altered = alter(packets);
    const candidatePackets = Array.isArray(altered) && altered.length === 76 && 'studyTarget' in altered[0]
      ? altered as readonly DialogueV2LanguagePack[]
      : packets;
    const candidateWorldHeadings = candidatePackets === packets ? altered : WORLD_HEADINGS;

    expect(projectReleasedDialogueV2Catalogue({
      packets: candidatePackets,
      manifest,
      studyTarget: 'en',
      localCoinRank: 19,
      worldHeadings: candidateWorldHeadings,
    })).toBeNull();
  });

  test.each(['draft', 'authoring_only_not_releaseable'])(
    'rejects a manifest-matched packet carrying authoring status %s',
    (status) => {
      const { packets, manifest } = releasedFixture();
      const authoringLikePackets = [{ ...packets[0], status }, ...packets.slice(1)];

      expect(projectReleasedDialogueV2Catalogue({
        packets: authoringLikePackets,
        manifest,
        studyTarget: 'en',
        localCoinRank: 19,
        worldHeadings: WORLD_HEADINGS,
      })).toBeNull();
    },
  );
});
