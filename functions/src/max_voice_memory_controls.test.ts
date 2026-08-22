import {
  clearMaxVoiceMemory,
  deleteMaxVoiceMemoryItem,
  getMaxVoiceMemory,
  updateMaxVoiceMemory,
  type MaxVoiceMemoryControlDependencies,
} from './max_voice_memory_controls';

function harness() {
  let raw: unknown = {
    schemaVersion: 2,
    stableUid: 'stable-A',
    authUid: 'auth-A',
    preferredName: 'Mia',
    learningGoal: 'English for travel',
    conversationHooks: [{
      id: 'model-id-is-ignored',
      text: 'I enjoy walking',
      evidenceSessionId: 'session-1',
      updatedAtMs: 1_000,
    }],
    activeIssues: [{ id: 'ignored', label: 'past tense', evidenceCount: 2, lastSeenAtMs: 1_000 }],
    resolvedIssues: [{ id: 'ignored', label: 'articles', resolvedAtMs: 900 }],
    recentSessionIds: ['session-1'],
    callCount: 2,
    lastCefr: 'A2',
  };
  const write = jest.fn(async (next: unknown) => { raw = next; });
  const remove = jest.fn(async (stableUid: string, authUid: string, clearedAtMs: number) => {
    raw = { schemaVersion: 2, stableUid, authUid, memoryClearedAtMs: clearedAtMs, updatedAtMs: clearedAtMs };
  });
  const deps: MaxVoiceMemoryControlDependencies = {
    nowMs: () => 2_000,
    resolveStableUid: async (authUid) => {
      if (authUid !== 'auth-A') throw Object.assign(new Error('denied'), { code: 'permission-denied' });
      return 'stable-A';
    },
    read: async () => raw,
    write,
    remove,
  };
  return { deps, write, remove, get raw() { return raw; } };
}

describe('MAX learner memory controls', () => {
  it('returns only the caller own sanitized memory projection', async () => {
    const h = harness();
    const result = await getMaxVoiceMemory({ authUid: 'auth-A', data: {} }, h.deps);

    expect(result).toEqual(expect.objectContaining({
      schemaVersion: 2,
      preferredName: 'Mia',
      activeIssues: expect.any(Array),
      conversationHooks: expect.any(Array),
    }));
    expect(JSON.stringify(result)).not.toMatch(/stableUid|authUid|recentSessionIds|evidenceSessionId/);
  });

  it('edits only user-editable scalar fields and existing hook text', async () => {
    const h = harness();
    const before = await getMaxVoiceMemory({ authUid: 'auth-A', data: {} }, h.deps);
    const hookId = before.conversationHooks[0].id;

    const updated = await updateMaxVoiceMemory({
      authUid: 'auth-A',
      data: { itemId: hookId, text: 'I enjoy hiking' },
    }, h.deps);

    expect(updated.conversationHooks).toContainEqual(expect.objectContaining({ text: 'I enjoy hiking' }));
    expect(h.write).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(h.write.mock.calls[0][0])).toContain('I enjoy hiking');
  });

  it('updates allowed preferences while rejecting arbitrary paths and sensitive values', async () => {
    const h = harness();
    await expect(updateMaxVoiceMemory({
      authUid: 'auth-A',
      data: { field: 'pacePreference', value: 'slower' },
    }, h.deps)).resolves.toEqual(expect.objectContaining({ pacePreference: 'slower' }));
    await expect(updateMaxVoiceMemory({
      authUid: 'auth-A',
      data: { field: 'callCount', value: 999 },
    }, h.deps)).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(updateMaxVoiceMemory({
      authUid: 'auth-A',
      data: { field: 'learningGoal', value: 'My password is qwerty' },
    }, h.deps)).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('deletes only an existing visible item by server-generated id', async () => {
    const h = harness();
    const before = await getMaxVoiceMemory({ authUid: 'auth-A', data: {} }, h.deps);
    const issueId = before.activeIssues[0].id;

    const updated = await deleteMaxVoiceMemoryItem({
      authUid: 'auth-A',
      data: { itemId: issueId },
    }, h.deps);
    expect(updated.activeIssues).toEqual([]);
    await expect(deleteMaxVoiceMemoryItem({
      authUid: 'auth-A',
      data: { itemId: 'foreign-item' },
    }, h.deps)).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('clear replaces personal notes with a durable privacy tombstone', async () => {
    const h = harness();
    await expect(clearMaxVoiceMemory({ authUid: 'auth-A', data: {} }, h.deps)).resolves.toEqual({ ok: true });
    expect(h.remove).toHaveBeenCalledTimes(1);
    expect(h.remove).toHaveBeenCalledWith('stable-A', 'auth-A', 2_000);
    expect(h.raw).toEqual({ schemaVersion: 2, stableUid: 'stable-A', authUid: 'auth-A', memoryClearedAtMs: 2_000, updatedAtMs: 2_000 });
  });

  it('never lets one auth identity access another owner memory', async () => {
    const h = harness();
    await expect(getMaxVoiceMemory({ authUid: 'auth-B', data: {} }, h.deps))
      .rejects.toMatchObject({ code: 'permission-denied' });
    expect(h.write).not.toHaveBeenCalled();
  });
});
