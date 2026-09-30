import { createHash } from 'node:crypto';

import {
  transitionDialogueV2PreparedBotVoiceSelection,
  type DialogueV2PreparedBotVoiceCommittedTurn,
} from './dialogue_v2_prepared_bot_voice_selection';

const NOW_MS = Date.UTC(2026, 8, 27, 12, 0, 0);
const replyText = 'You handled that beautifully.';
const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

const committedTurn: DialogueV2PreparedBotVoiceCommittedTurn = Object.freeze({
  sessionId: `d2s_${'S'.repeat(32)}`,
  turnId: `d2t_${'T'.repeat(16)}`,
  studyTarget: 'en',
  scenarioId: 'social_01',
  contentManifestSha256: 'a'.repeat(64),
  contentPackSha256: 'c'.repeat(64),
  replies: Object.freeze([
    Object.freeze({
      replyIndex: 0,
      personaId: 'host',
      personaVoiceMode: 'optional_prepared_voice' as const,
      groupPosition: 'direct' as const,
      text: replyText,
    }),
    Object.freeze({
      replyIndex: 1,
      personaId: 'friend',
      personaVoiceMode: 'optional_prepared_voice' as const,
      groupPosition: 'follow_up' as const,
      text: 'I agree.',
    }),
  ]),
});

const catalog = Object.freeze({
  schemaVersion: 'dialogue_v2_prepared_bot_voice_catalog.v1',
  releaseId: 'dialogue_v2_voice_2026_09_27_01',
  contentManifestSha256: committedTurn.contentManifestSha256,
  entries: Object.freeze([
    Object.freeze({
      studyTarget: 'en',
      scenarioId: 'social_01',
      contentPackSha256: committedTurn.contentPackSha256,
      personaId: 'host',
      preparedResponseId: 'social_01_host_milestone_01',
      responseKind: 'milestone',
      replyText,
      replyTextSha256: sha256(replyText),
      assetKey: 'social_01_host_milestone_01_en',
      assetSha256: 'b'.repeat(64),
      assetBytes: 4_096,
    }),
    Object.freeze({
      studyTarget: 'en',
      scenarioId: 'social_01',
      contentPackSha256: committedTurn.contentPackSha256,
      personaId: 'friend',
      preparedResponseId: 'social_01_friend_closing_01',
      responseKind: 'closing',
      replyText: 'I agree.',
      replyTextSha256: sha256('I agree.'),
      assetKey: 'social_01_friend_closing_01_en',
      assetSha256: 'd'.repeat(64),
      assetBytes: 3_200,
    }),
  ]),
});

describe('Dialogue V2 committed prepared bot voice selection', () => {
  it('reserves and binds only the direct reply after a committed server turn', () => {
    const result = transitionDialogueV2PreparedBotVoiceSelection({
      nowMs: NOW_MS,
      committedTurn,
      serverCatalog: catalog,
      existingTurnSelection: null,
      trustedDailyState: null,
    });

    expect(result.kind).toBe('selected');
    if (result.kind !== 'selected') throw new Error('selection_missing');
    expect(result.selection).toMatchObject({
      contractVersion: 'dialogue_v2_prepared_bot_voice_selection.v2',
      sessionId: committedTurn.sessionId,
      turnId: committedTurn.turnId,
      replyIndex: 0,
      studyTarget: 'en',
      scenarioId: 'social_01',
      voiceCatalogReleaseId: catalog.releaseId,
      contentManifestSha256: committedTurn.contentManifestSha256,
      contentPackSha256: committedTurn.contentPackSha256,
      personaId: 'host',
      preparedResponseId: 'social_01_host_milestone_01',
      replyTextSha256: sha256(replyText),
      responseKind: 'milestone',
      groupPosition: 'direct',
      dayKey: '2026-09-27',
      operationFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(result.nextDailyState).toMatchObject({
      dayKey: '2026-09-27',
      claimedCount: 1,
      claimedOperationFingerprint: result.selection.operationFingerprint,
    });
    expect(JSON.stringify(result.selection)).not.toMatch(/uri|audio|assetKey/i);
  });

  it('returns the identical persisted selection on replay without consuming a slot', () => {
    const first = transitionDialogueV2PreparedBotVoiceSelection({
      nowMs: NOW_MS,
      committedTurn,
      serverCatalog: catalog,
      existingTurnSelection: null,
      trustedDailyState: null,
    });
    if (first.kind !== 'selected') throw new Error('selection_missing');

    const replay = transitionDialogueV2PreparedBotVoiceSelection({
      nowMs: Date.UTC(2026, 8, 28, 12, 0, 0),
      committedTurn,
      serverCatalog: null,
      existingTurnSelection: first.selection,
      trustedDailyState: null,
    });

    expect(replay).toEqual({
      kind: 'replay',
      selection: first.selection,
      nextDailyState: null,
    });
  });

  it('does not reserve when the reviewed server catalog is absent or only a follow-up matches', () => {
    expect(transitionDialogueV2PreparedBotVoiceSelection({
      nowMs: NOW_MS,
      committedTurn,
      serverCatalog: null,
      existingTurnSelection: null,
      trustedDailyState: null,
    })).toEqual({ kind: 'no_selection', selection: null, nextDailyState: null });

    expect(transitionDialogueV2PreparedBotVoiceSelection({
      nowMs: NOW_MS,
      committedTurn: {
        ...committedTurn,
        replies: Object.freeze([
          Object.freeze({ ...committedTurn.replies[0], text: 'No prepared direct reply.' }),
          committedTurn.replies[1],
        ]),
      },
      serverCatalog: catalog,
      existingTurnSelection: null,
      trustedDailyState: null,
    })).toEqual({ kind: 'no_selection', selection: null, nextDailyState: null });
  });

  it('fails closed when a persisted selection is replayed for another exact turn', () => {
    const first = transitionDialogueV2PreparedBotVoiceSelection({
      nowMs: NOW_MS,
      committedTurn,
      serverCatalog: catalog,
      existingTurnSelection: null,
      trustedDailyState: null,
    });
    if (first.kind !== 'selected') throw new Error('selection_missing');

    expect(() => transitionDialogueV2PreparedBotVoiceSelection({
      nowMs: NOW_MS,
      committedTurn: { ...committedTurn, turnId: `d2t_${'U'.repeat(16)}` },
      serverCatalog: catalog,
      existingTurnSelection: first.selection,
      trustedDailyState: first.nextDailyState,
    })).toThrow('invalid_dialogue_v2_prepared_bot_voice_replay');
  });

  it('emits server-valid digit-leading catalog and prepared response identifiers', () => {
    const digitLeadingCatalog = {
      ...catalog,
      releaseId: '2026_voice',
      entries: Object.freeze([
        Object.freeze({ ...catalog.entries[0], preparedResponseId: '1st_reply' }),
      ]),
    };

    const result = transitionDialogueV2PreparedBotVoiceSelection({
      nowMs: NOW_MS,
      committedTurn: { ...committedTurn, replies: Object.freeze([committedTurn.replies[0]]) },
      serverCatalog: digitLeadingCatalog,
      existingTurnSelection: null,
      trustedDailyState: null,
    });

    expect(result.kind).toBe('selected');
    if (result.kind !== 'selected') throw new Error('selection_missing');
    expect(result.selection).toMatchObject({
      voiceCatalogReleaseId: '2026_voice',
      preparedResponseId: '1st_reply',
    });
  });

  it('rejects a persisted replay selection with a malformed UTC day key', () => {
    const first = transitionDialogueV2PreparedBotVoiceSelection({
      nowMs: NOW_MS,
      committedTurn,
      serverCatalog: catalog,
      existingTurnSelection: null,
      trustedDailyState: null,
    });
    if (first.kind !== 'selected') throw new Error('selection_missing');
    const malformedDaySelection = {
      ...first.selection,
      dayKey: '2026-02-31',
      operationFingerprint: sha256(JSON.stringify([
        'dialogue_v2_prepared_bot_voice_operation.v2',
        first.selection.sessionId,
        first.selection.turnId,
        first.selection.replyIndex,
        first.selection.studyTarget,
        first.selection.scenarioId,
        first.selection.voiceCatalogReleaseId,
        first.selection.contentManifestSha256,
        first.selection.contentPackSha256,
        first.selection.personaId,
        first.selection.preparedResponseId,
        first.selection.replyTextSha256,
        first.selection.responseKind,
        first.selection.groupPosition,
        '2026-02-31',
      ])),
    };

    expect(() => transitionDialogueV2PreparedBotVoiceSelection({
      nowMs: NOW_MS,
      committedTurn,
      serverCatalog: null,
      existingTurnSelection: malformedDaySelection,
      trustedDailyState: first.nextDailyState,
    })).toThrow('invalid_dialogue_v2_prepared_bot_voice_replay');
  });
});
