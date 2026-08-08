import { mergeContentStagePage } from './state.js';

const LOCALE_RE = /^[a-z]{2,12}(?:-[A-Z]{2})?$/;
const TOKEN_RE = /^[A-Za-z0-9._-]{1,160}$/;

export function readContentStageForm({ root = document, model, makeId }) {
  const value = (id, fallback = '') => String(root.getElementById(id)?.value ?? fallback).trim();
  const kind = String(model.kind || value('content-stage-kind')).trim();
  const studyTarget = value('content-studio-target') || value('content-stage-target'); const sourceLocale = value('content-studio-source') || value('content-stage-source');
  const cefr = value('content-studio-cefr') || value('content-stage-cefr', 'A1'); const objective = value('content-studio-objective') || value('content-stage-objective'); const scopeId = value('content-studio-scope') || value('content-stage-scope');
  const capability = model.capabilities?.capabilities?.[kind];
  const count = Number(capability?.count?.fixed ?? value('content-stage-count', String(capability?.count?.min ?? 1)));
  const prerequisiteStageIds = Array.isArray(model.selectedDependencyIds) && model.selectedDependencyIds.length
    ? [...model.selectedDependencyIds]
    : value('content-stage-prerequisites').split(',').map((item) => item.trim()).filter(Boolean);
  if (!LOCALE_RE.test(studyTarget) || !LOCALE_RE.test(sourceLocale)) throw new Error('Проверьте коды языков независимой стадии.');
  if (!['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(cefr) || !objective) throw new Error('Выберите уровень и опишите учебную цель.');
  if (!TOKEN_RE.test(scopeId)) throw new Error('Укажите безопасный ключ урока, темы или пака.');
  const min = Number(capability?.count?.min ?? 1); const max = Number(capability?.count?.max ?? 1000);
  if (!Number.isInteger(count) || count < min || count > max || (capability?.count?.fixed != null && count !== Number(capability.count.fixed))) throw new Error(`Количество для выбранного типа должно быть от ${min} до ${max}.`);
  return { requestId: model.requestId || makeId('content-stages'), kind, studyTarget, sourceLocale, cefr, objective, scopeId, count, revision: Number(model.revision || 1), prerequisiteStageIds };
}

export async function loadContentStagesPage({ actions, model, requestId = model.requestId, append = false }) {
  if (!requestId) return model;
  const filters = model.filters || {};
  const result = await actions.listContentStages({ requestId, limit: 50, cursor: append ? model.nextCursor || '' : '', kind: filters.kind || '', state: filters.state || '', studyTarget: filters.studyTarget || '', sourceLocale: filters.sourceLocale || '', scopeId: filters.scopeId || '' });
  return { ...mergeContentStagePage(model, result, append), requestId };
}

export async function loadContentCapabilities({ actions, model }) {
  const result = await actions.getContentStageCapabilities();
  return { ...model, capabilities: result, capabilitiesState: 'ready' };
}

export async function loadApprovedDependencies({ actions, model, consumerKind, scopeId, append = false }) {
  const result = await actions.listContentStageDependencies({ requestId: model.requestId, studyTarget: model.studyTarget || 'en', sourceLocale: model.sourceLocale || 'ru', consumerKind, scopeId, limit: 100, ...(append && model.dependenciesNextCursor ? { cursor: model.dependenciesNextCursor } : {}) });
  const page = Array.isArray(result?.items) ? result.items : [];
  const dependencies = append ? [...(model.dependencies || []), ...page.filter((item) => !(model.dependencies || []).some((existing) => existing.stageId === item.stageId))] : page;
  return { ...model, dependencies, dependenciesState: 'ready', dependenciesPartial: result?.isPartial === true, dependenciesNextCursor: result?.nextCursor || null };
}
