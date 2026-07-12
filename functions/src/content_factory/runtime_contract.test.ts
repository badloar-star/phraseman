import { resolveRuntimePack } from './runtime_contract';

describe('runtime language pack resolution', () => {
  it('resolves only the requested published target', () => {
    const pointer = { studyTarget: 'fr', sourceLocale: 'en', packId: 'fr-a1', revision: 4, contentHash: 'h', activatedAt: '2026-07-10', activatedBy: 'admin' } as const;
    const catalog = [{ studyTarget: 'fr', displayName: 'French', sourceLocale: 'en', active: true, activePackIds: { lessons: 'fr-a1' }, activePackRevisions: { lessons: 4 }, activePackHashes: { lessons: 'h' } }];
    expect(resolveRuntimePack({ requestedTarget: 'fr', requestedSurface: 'lessons', catalog, pointers: [pointer] })).toMatchObject({ studyTarget: 'fr', packId: 'fr-a1' });
    expect(resolveRuntimePack({ requestedTarget: 'es', requestedSurface: 'lessons', catalog, pointers: [pointer] })).toBeNull();
    expect(resolveRuntimePack({ requestedTarget: 'fr', requestedSurface: 'lessons', catalog: [{ ...catalog[0], activePackRevisions: { lessons: 3 } }], pointers: [pointer] })).toBeNull();
  });
});
