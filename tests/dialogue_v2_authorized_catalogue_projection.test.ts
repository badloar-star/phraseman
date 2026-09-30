import { DIALOGUE_V2_CATALOGUE_INDEX } from '../shared/dialogue_v2_catalogue_index';

import {
  projectAuthorizedDialogueV2Catalogue,
} from '../app/dialogue_v2_authorized_catalogue_projection';

const WORLD_HEADINGS = [
  { id: 'social', title: 'Общение' },
  { id: 'work', title: 'Работа' },
  { id: 'travel', title: 'Поездки' },
  { id: 'everyday', title: 'Каждый день' },
] as const;

function authorizedPackets() {
  return DIALOGUE_V2_CATALOGUE_INDEX.map((entry) => ({
    studyTarget: 'de',
    scenario: {
      id: entry.id,
      worldId: entry.worldId,
      rankRequired: entry.rankRequired,
      cefr: entry.cefr,
      personas: [{
        id: 'host', replyStyle: 'warm', voiceMode: 'text_only',
        displayName: 'Taylor', styleNote: 'Keeps the conversation moving with care.',
        mood: 'open', correctionStyle: 'gentle',
      }],
      objectives: Array.from({ length: 6 }, (_, index) => ({
        id: `goal_${index + 1}`,
        label: `Complete conversation objective ${index + 1}.`,
      })),
      groupReplyPolicy: { maxDirectReplies: 1, maxUsefulFollowUps: 0, silenceAllowed: true },
    },
    content: {
      title: `Released ${entry.id}`,
      briefing: 'Continue the chat naturally until the shared goal is complete.',
      completionTone: 'warm and specific',
    },
  }));
}

describe('authorized Dialogue V2 learner catalogue projection', () => {
  it('projects exactly the 76 explicitly learner-safe packets with local rank gating', () => {
    const projection = projectAuthorizedDialogueV2Catalogue({
      packets: authorizedPackets(),
      studyTarget: 'de',
      localCoinRank: 3,
      worldHeadings: WORLD_HEADINGS,
    });

    expect(projection?.items).toHaveLength(76);
    expect(projection?.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'social_01', title: 'Released social_01', status: 'available' }),
      expect.objectContaining({ id: 'work_04', rankRequired: 4, status: 'locked' }),
    ]));
  });

  it.each([
    ['a missing canonical packet', (packets: ReturnType<typeof authorizedPackets>) => packets.slice(1)],
    ['an unexpected learner-field at packet root', (packets: ReturnType<typeof authorizedPackets>) => [
      { ...packets[0], quota: 30 }, ...packets.slice(1),
    ]],
    ['an unknown persona field', (packets: ReturnType<typeof authorizedPackets>) => [{
      ...packets[0],
      scenario: { ...packets[0].scenario, personas: [{ ...packets[0].scenario.personas[0], adminNote: 'hidden' }] },
    }, ...packets.slice(1)]],
    ['a catalogue rank substitution', (packets: ReturnType<typeof authorizedPackets>) => [{
      ...packets[0], scenario: { ...packets[0].scenario, rankRequired: 19 },
    }, ...packets.slice(1)]],
  ])('fails closed for %s', (_reason, alter) => {
    expect(projectAuthorizedDialogueV2Catalogue({
      packets: alter(authorizedPackets()),
      studyTarget: 'de',
      localCoinRank: 19,
      worldHeadings: WORLD_HEADINGS,
    })).toBeNull();
  });
});
