import { DIALOGUE_V2_CATALOGUE_INDEX } from '../shared/dialogue_v2_catalogue_index';
import { projectAuthorizedDialogueV2Catalogue } from '../app/dialogue_v2_authorized_catalogue_projection';
import { buildDialogueV2BriefingModel } from '../app/dialogue_v2_briefing_model';
import { dialogueV2FreeformOpening } from '../app/dialogue_v2_freeform_opening';

/**
 * Владелец 01.10: «первая реплика всегда уже должна быть на экране». Клиентская
 * сторона контракта с «Дизайном»: packet.content.opening = { personaId, text } —
 * необязательное поле, строго от участника сцены; встроенный снимок несёт его во
 * всех 76 сценах каждого изучаемого языка.
 */
const WORLD_HEADINGS = [
  { id: 'social', title: 'social' }, { id: 'work', title: 'work' },
  { id: 'travel', title: 'travel' }, { id: 'everyday', title: 'everyday' },
] as const;

function packets(opening?: unknown) {
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
      objectives: Array.from({ length: 6 }, (_, index) => ({ id: `goal_${index + 1}`, label: `Objective ${index + 1}.` })),
      groupReplyPolicy: { maxDirectReplies: 1, maxUsefulFollowUps: 0, silenceAllowed: true },
    },
    content: {
      title: `Released ${entry.id}`,
      briefing: 'Continue the chat naturally until the shared goal is complete.',
      completionTone: 'warm and specific',
      ...(opening === undefined ? {} : { opening }),
    },
  }));
}

function project(input: ReturnType<typeof packets>) {
  return projectAuthorizedDialogueV2Catalogue({ packets: input, studyTarget: 'de', localCoinRank: 3, worldHeadings: WORLD_HEADINGS });
}

describe('Dialogue V2 opening line (client)', () => {
  it('accepts packets with and without a valid opening', () => {
    expect(project(packets())?.items).toHaveLength(76);
    expect(project(packets({ personaId: 'host', text: 'Hallo! Wie geht es dir?' }))?.items).toHaveLength(76);
  });

  it.each([
    ['an opening from a stranger', { personaId: 'intruder', text: 'Hallo!' }],
    ['an opening with extra fields', { personaId: 'host', text: 'Hallo!', voice: 'x' }],
    ['an empty opening text', { personaId: 'host', text: '' }],
    ['an over-long opening', { personaId: 'host', text: 'a'.repeat(601) }],
    ['a string opening', 'Hallo!'],
  ])('fails closed for %s', (_reason, opening) => {
    expect(project(packets(opening))).toBeNull();
  });

  it.each(['en', 'es', 'fr', 'de'] as const)('embedded %s snapshot gives every scene a first line in the briefing model', (studyTarget) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const snapshot = require(`../shared/generated/dialogue_v2_learner_catalogue.${studyTarget}.json`) as { packets: unknown[] };
    for (const entry of DIALOGUE_V2_CATALOGUE_INDEX) {
      const model = buildDialogueV2BriefingModel({ packets: snapshot.packets, studyTarget, scenarioId: entry.id, localCoinRank: 40 });
      expect(model?.opening).not.toBeNull();
      expect(model!.participants.map((participant) => participant.id)).toContain(model!.opening!.personaId);
    }
  });

  it('freeform opening is available for every study target and null otherwise', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      expect(dialogueV2FreeformOpening('en')).toBe('Hi! What would you like to talk about today?');
      for (const target of ['es', 'fr', 'de']) expect(dialogueV2FreeformOpening(target)).toEqual(expect.any(String));
      expect(dialogueV2FreeformOpening('ru')).toBeNull();
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});
