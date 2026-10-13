import {
  DIALOGUE_MISTAKES_PER_SESSION_MAX,
  captureDialogueV2Mistakes,
  planDialogueMistakeAttempts,
} from '../app/dialogue_v2_mistake_capture';
import { compatibleMistakeExerciseModes } from '../modules/mistake-practice/exercise_mode_registry';
import { mistakeExerciseCapabilitiesFor } from '../modules/mistake-practice/capabilities';
import { mistakeSourceGroupFor } from '../app/mistake_practice_insights';

// зачем (владелец 13.10): поправки «было → стало» из итога диалога обязаны лечь в «Мои ошибки» с упражнениями «собери»/«напиши».
describe('dialogue mistakes → mistakes journal', () => {
  const rows = [
    { original: 'I goed to the shop', corrected: 'I went to the shop' },
    { original: 'Hello!', corrected: 'hello' },
    { original: '  ', corrected: 'Fine' },
    { original: 'She have a cat', corrected: 'She has a cat' },
  ];

  it('builds one dialogue attempt per real correction with session-scoped ids', () => {
    const plan = planDialogueMistakeAttempts({ sessionId: 'sess_1', studyTarget: 'en', rows });
    expect(plan.attempts.map((a) => a.content.sourceId)).toEqual(['sess_1:1', 'sess_1:4']);
    expect(plan.skipped).toEqual([{ index: 1, reason: 'same_text' }, { index: 2, reason: 'empty' }]);
    const first = plan.attempts[0];
    expect(first).toMatchObject({
      attemptId: 'dialogue:sess_1:1',
      studyTarget: 'en',
      verdict: 'wrong',
      objective: true,
      content: { sourceKind: 'dialogue', canonicalTarget: 'I went to the shop', sourcePrompt: 'I goed to the shop' },
      facet: { kind: 'form', given: 'I goed to the shop' },
    });
  });

  it('offers "собери" (builder) and "напиши" (typing) for a dialogue mistake', () => {
    const attempt = planDialogueMistakeAttempts({ sessionId: 's', studyTarget: 'en', rows }).attempts[0];
    const capabilities = mistakeExerciseCapabilitiesFor({
      facet: attempt.facet.kind,
      canonicalTarget: attempt.content.canonicalTarget,
      tokens: attempt.content.tokens,
    });
    expect(compatibleMistakeExerciseModes({ facet: 'form', capabilities, stage: 'guided' })).toContain('lesson_ordered_tokens');
    expect(compatibleMistakeExerciseModes({ facet: 'form', capabilities, stage: 'production' })).toContain('lesson_typing');
    expect(mistakeSourceGroupFor('dialogue')).toBe('other');
  });

  it('caps a single session and normalizes an unknown study target', () => {
    const many = Array.from({ length: DIALOGUE_MISTAKES_PER_SESSION_MAX + 3 }, (_, i) => ({ original: `bad ${i}`, corrected: `good ${i}` }));
    const plan = planDialogueMistakeAttempts({ sessionId: 's', studyTarget: 'xx', rows: many });
    expect(plan.attempts).toHaveLength(DIALOGUE_MISTAKES_PER_SESSION_MAX);
    expect(plan.skipped.filter((s) => s.reason === 'over_limit')).toHaveLength(3);
    expect(plan.attempts[0].studyTarget).toBe('en');
  });

  it('collects mistake ids, counts repeats as already known and survives a failed write', async () => {
    const seen = new Set<string>();
    const capture = jest.fn(async (attempt: { content: { sourceId: string } }) => {
      if (attempt.content.sourceId.endsWith(':4')) throw new Error('disk_full');
      const appended = !seen.has(attempt.content.sourceId);
      seen.add(attempt.content.sourceId);
      return { kind: 'captured', mistakeId: `m:${attempt.content.sourceId}`, cycleId: 'c', eventId: 'e', appended } as const;
    });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const first = await captureDialogueV2Mistakes({ sessionId: 'sess', studyTarget: 'en', rows }, capture as never);
    expect(first).toEqual({ mistakeIds: ['m:sess:1'], captured: 1, alreadyKnown: 0, failed: 1 });
    const again = await captureDialogueV2Mistakes({ sessionId: 'sess', studyTarget: 'en', rows }, capture as never);
    expect(again).toEqual({ mistakeIds: ['m:sess:1'], captured: 0, alreadyKnown: 1, failed: 1 });
    expect(warn.mock.calls.some((call) => String(call[0]).includes('[DIALOG-MISTAKES] capture_failed'))).toBe(true);
    warn.mockRestore();
    log.mockRestore();
  });
});
