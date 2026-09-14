import { __videoPhrasesTestHooks } from './video_phrases';

describe('video phrase publication metadata', () => {
  it('clears the draft pointer when publishing a version', () => {
    expect(__videoPhrasesTestHooks.publishedRootPatch({
      videoId: 'abc12345678',
      versionId: 'draft-1',
      phraseCount: 200,
      actorUid: 'admin-uid',
      nowMs: 1234,
    })).toMatchObject({
      videoId: 'abc12345678',
      activeVersion: 'draft-1',
      activePhraseCount: 200,
      draftVersion: null,
      draftPhraseCount: 0,
      updatedAtMs: 1234,
      updatedBy: 'admin-uid',
    });
  });
});
