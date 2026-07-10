import { resolveRuntimePack } from './runtime_contract';

describe('runtime language pack resolution', () => {
  it('resolves only the requested published target', () => {
    const pointer = { studyTarget: 'fr', packId: 'fr-a1', revision: 4, contentHash: 'h', activatedAt: '2026-07-10', activatedBy: 'admin' } as const;
    expect(resolveRuntimePack({ requestedTarget: 'fr', requestedSurface: 'lessons', catalog: [{ studyTarget: 'fr', displayName: 'French', sourceLocale: 'en', active: true, activePackIds: { lessons: 'fr-a1' } }], pointers: [pointer] })).toMatchObject({ studyTarget: 'fr', packId: 'fr-a1' });
    expect(resolveRuntimePack({ requestedTarget: 'es', requestedSurface: 'lessons', catalog: [{ studyTarget: 'fr', displayName: 'French', sourceLocale: 'en', active: true, activePackIds: { lessons: 'fr-a1' } }], pointers: [pointer] })).toBeNull();
  });
});
