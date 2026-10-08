import { resolveConfiguredDialogModel, __resetDialogConfigCache, modelSupportsJsonObject } from './openai_dialog_model_config';

function dbFor(model?: string, fail = false) {
  const get = jest.fn(async () => {
    if (fail) throw new Error('offline');
    return { data: () => model ? { model } : undefined };
  });
  return { db: { collection: () => ({ doc: () => ({ get }) }) } as unknown as FirebaseFirestore.Firestore, get };
}

beforeEach(__resetDialogConfigCache);

describe('dialog persisted/env retirement migration', () => {
  test.each(['gpt-4.1-nano', 'gpt-4.1-nano-2025-04-14'])('migrates Firestore %s even over a different env model', async (model) => {
    const { db } = dbFor(model);
    const active = await resolveConfiguredDialogModel(db, 'gpt-4.1-mini');
    expect(active).toBe('gpt-4o-mini');
    expect(modelSupportsJsonObject(active)).toBe(true);
    expect(modelSupportsJsonObject(model)).toBe(false);
  });
  test.each([false, true])('migrates env fallback when missing/offline (offline=%s)', async (fail) => {
    const { db } = dbFor(undefined, fail);
    await expect(resolveConfiguredDialogModel(db, 'gpt-4.1-nano-2025-04-14')).resolves.toBe('gpt-4o-mini');
  });
  test('keeps a supported saved override, cache and explicit reset', async () => {
    const { db, get } = dbFor('gpt-4.1-mini');
    await expect(resolveConfiguredDialogModel(db, 'gpt-4.1')).resolves.toBe('gpt-4.1-mini');
    await resolveConfiguredDialogModel(db, undefined);
    expect(get).toHaveBeenCalledTimes(1);
    __resetDialogConfigCache();
    await resolveConfiguredDialogModel(db, undefined);
    expect(get).toHaveBeenCalledTimes(2);
  });
});
