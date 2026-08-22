import {
  clearMaxMemory,
  deleteMaxMemoryItem,
  getMaxMemory,
  parseMaxMemoryProjection,
  updateMaxMemory,
} from '../app/max_memory_client';

const projection = {
  schemaVersion: 2,
  preferredName: 'Mia',
  learningGoal: 'Travel',
  languagePreference: 'more_target',
  pacePreference: 'slower',
  conversationHooks: [{ id: 'h1', text: 'I enjoy hiking' }],
  activeIssues: [{ id: 'a1', label: 'past tense', evidenceCount: 2 }],
  resolvedIssues: [{ id: 'r1', label: 'articles' }],
  homework: ['Tell a short story'],
  nextTopic: 'Weekend plans',
  callCount: 3,
  lastCefr: 'A2',
};

describe('MAX memory client', () => {
  it('accepts the public bounded projection and rejects owner/internal fields', () => {
    expect(parseMaxMemoryProjection(projection)).toEqual(projection);
    expect(parseMaxMemoryProjection({ ...projection, stableUid: 'private' })).toBeNull();
    expect(parseMaxMemoryProjection({ ...projection, conversationHooks: [{ ...projection.conversationHooks[0], evidenceSessionId: 'private' }] })).toBeNull();
  });

  it('uses dedicated callables without sending a client identity', async () => {
    const calls: { name: string; data: Record<string, unknown> }[] = [];
    const invoke = async (name: string, data: Record<string, unknown>) => {
      calls.push({ name, data });
      return name === 'maxVoiceClearMemory' ? { ok: true } : projection;
    };

    await getMaxMemory(invoke);
    await updateMaxMemory({ field: 'pacePreference', value: 'slower' }, invoke);
    await deleteMaxMemoryItem('h1', invoke);
    await clearMaxMemory(invoke);

    expect(calls).toEqual([
      { name: 'maxVoiceGetMemory', data: {} },
      { name: 'maxVoiceUpdateMemory', data: { field: 'pacePreference', value: 'slower' } },
      { name: 'maxVoiceDeleteMemoryItem', data: { itemId: 'h1' } },
      { name: 'maxVoiceClearMemory', data: {} },
    ]);
    expect(JSON.stringify(calls)).not.toMatch(/stableUid|authUid/);
  });

  it('fails closed when the callable response is malformed', async () => {
    await expect(getMaxMemory(async () => ({ ...projection, callCount: -1 }))).rejects.toThrow('max_memory_response_invalid');
    await expect(clearMaxMemory(async () => ({ ok: false }))).rejects.toThrow('max_memory_clear_invalid');
  });
});
