import { DIALOGUE_V2_CATALOGUE_INDEX } from '../shared/dialogue_v2_catalogue_index';
import { buildDialogueV2BriefingModel } from '../app/dialogue_v2_briefing_model';

function packets() {
  return DIALOGUE_V2_CATALOGUE_INDEX.map((entry) => ({
    studyTarget: 'en',
    scenario: {
      id: entry.id, worldId: entry.worldId, rankRequired: entry.rankRequired, cefr: entry.cefr,
      personas: [{ id: 'maya', replyStyle: 'warm', voiceMode: 'text_only', displayName: 'Maya', styleNote: 'Warm and concise.', mood: 'open', correctionStyle: 'gentle' }],
      objectives: Array.from({ length: 6 }, (_, i) => ({ id: `goal_${i + 1}`, label: `Complete objective ${i + 1}.` })),
      groupReplyPolicy: { maxDirectReplies: 1, maxUsefulFollowUps: 0, silenceAllowed: true },
    },
    content: { title: `Chat ${entry.id}`, briefing: 'Keep the conversation going through each visible task.', completionTone: 'warm and precise' },
  }));
}

describe('Dialogue V2 briefing model', () => {
  it('selects a complete verified scenario and applies only the local rank result', () => {
    const model = buildDialogueV2BriefingModel({ packets: packets(), studyTarget: 'en', scenarioId: 'work_04', localCoinRank: 3 });

    expect(model).toMatchObject({ title: 'Chat work_04', cefr: 'A1', rankRequired: 4, unlocked: false });
    expect(model?.objectives).toHaveLength(6);
    expect(model?.participants).toEqual([{ id: 'maya', displayName: 'Maya', styleNote: 'Warm and concise.' }]);
  });

  it('fails closed for an unknown route id or an extended public packet', () => {
    expect(buildDialogueV2BriefingModel({ packets: packets(), studyTarget: 'en', scenarioId: 'coffee', localCoinRank: 19 })).toBeNull();
    expect(buildDialogueV2BriefingModel({
      packets: [{ ...packets()[0], adminNote: 'never route this' }, ...packets().slice(1)],
      studyTarget: 'en', scenarioId: 'social_01', localCoinRank: 19,
    })).toBeNull();
  });
});
