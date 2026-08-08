export function createContentFactoryState(overrides = {}) {
  return {
    requestId: '', items: [], nextCursor: null, isPartial: false,
    selectedGenerator: 'lessons', kind: 'lesson_outline', revision: 1, preview: null,
    capabilities: null, capabilitiesState: 'idle',
    mode: 'single', rangeStart: 1, rangeEnd: 3, selectedKinds: ['lesson_outline'],
    dependencies: [], dependenciesState: 'idle', selectedDependencyIds: [],
    bulkResult: null, editDraft: '', editReason: '', editResult: null,
    filters: { requestId: '', kind: '', state: '', scopeId: '', studyTarget: '', sourceLocale: '' },
    readiness: { state: 'idle', metrics: null, error: '' },
    ...overrides,
  };
}

export function mergeContentStagePage(model, result, append) {
  const page = Array.isArray(result?.stages) ? result.stages : [];
  return { ...model, items: append ? [...(model.items || []), ...page] : page, nextCursor: result?.nextCursor || null, isPartial: result?.isPartial === true };
}
