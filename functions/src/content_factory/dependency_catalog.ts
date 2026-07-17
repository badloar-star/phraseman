import { allowedDependencyKinds } from './stage_capabilities';
import { type GenerationStageKind } from './stage_contracts';

const TOKEN_RE = /^[A-Za-z0-9._-]{1,160}$/;
const STAGE_ID_RE = /^[A-Za-z0-9._:-]{1,500}$/;
const LOCALE_RE = /^[a-z]{2,12}(?:-[A-Z]{2})?$/;
const FIELDS = new Set(['requestId', 'studyTarget', 'sourceLocale', 'consumerKind', 'scopeId', 'limit', 'cursor']);

function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }

export function parseDependencyCatalogRequest(value: unknown) {
  if (!record(value) || Object.keys(value).some((key) => !FIELDS.has(key))) throw new Error('dependency_catalog_invalid');
  const requestId = String(value.requestId ?? '').trim();
  const studyTarget = String(value.studyTarget ?? '').trim();
  const sourceLocale = String(value.sourceLocale ?? '').trim();
  const consumerKind = String(value.consumerKind ?? '') as GenerationStageKind;
  const scopeId = String(value.scopeId ?? '').trim();
  const cursor = String(value.cursor ?? '').trim();
  const rawLimit = Number(value.limit ?? 50);
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(100, Math.floor(rawLimit))) : 50;
  let allowedKinds: readonly GenerationStageKind[];
  try { allowedKinds = allowedDependencyKinds(consumerKind); } catch { throw new Error('dependency_catalog_invalid'); }
  if (!TOKEN_RE.test(requestId) || !LOCALE_RE.test(studyTarget) || !LOCALE_RE.test(sourceLocale) || allowedKinds.length === 0 || (scopeId && !TOKEN_RE.test(scopeId)) || (cursor && !STAGE_ID_RE.test(cursor))) throw new Error('dependency_catalog_invalid');
  return Object.freeze({ requestId, studyTarget, sourceLocale, consumerKind, scopeId, cursor, limit, state: 'approved' as const, allowedKinds });
}

type CatalogDoc = { readonly id: string; readonly data: Record<string, unknown> };

export function dependencyCatalogItems(docs: readonly CatalogDoc[], limit: number) {
  const visible = docs.slice(0, limit).map(({ id, data }) => Object.freeze({
    stageId: id,
    kind: String(data.kind ?? ''),
    scopeId: String(data.scopeId ?? ''),
    title: String(data.title ?? data.objective ?? data.scopeId ?? id).slice(0, 240),
    revision: Number(data.revision ?? 0),
    artifactId: String(data.artifactId ?? ''),
    contentHash: String(data.contentHash ?? ''),
    createdAt: typeof (data.createdAt as { toDate?: unknown } | undefined)?.toDate === 'function' ? (data.createdAt as { toDate: () => Date }).toDate().toISOString() : null,
  }));
  const isPartial = docs.length > limit;
  return Object.freeze({ items: Object.freeze(visible), nextCursor: isPartial ? visible.at(-1)?.stageId ?? '' : '', isPartial });
}
