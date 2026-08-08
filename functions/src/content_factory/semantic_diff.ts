import { type GenerationStageKind } from './stage_contracts';

export type SemanticChangeType = 'added' | 'removed' | 'changed' | 'moved';
export interface SemanticDiffDetail { readonly type: SemanticChangeType; readonly path: string; readonly id?: string; readonly before?: unknown; readonly after?: unknown }

function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function same(left: unknown, right: unknown): boolean { return JSON.stringify(left) === JSON.stringify(right); }
function stableId(value: unknown): string | null { return record(value) && typeof value.id === 'string' && value.id.trim() ? value.id : null; }

export function semanticDiff(kind: GenerationStageKind, before: unknown, after: unknown, detailLimit = 50) {
  if (!Number.isSafeInteger(detailLimit) || detailLimit < 1 || detailLimit > 200) throw new Error('semantic_diff_limit_invalid');
  const all: SemanticDiffDetail[] = [];
  const summary = { added: 0, removed: 0, changed: 0, moved: 0 };
  const add = (detail: SemanticDiffDetail) => { summary[detail.type] += 1; all.push(Object.freeze(detail)); };

  const visit = (left: unknown, right: unknown, path: string): void => {
    if (same(left, right)) return;
    if (Array.isArray(left) && Array.isArray(right)) {
      const leftIds = left.map(stableId);
      const rightIds = right.map(stableId);
      if (leftIds.every(Boolean) && rightIds.every(Boolean)) {
        const leftMap = new Map(leftIds.map((id, index) => [id as string, { index, value: left[index] }]));
        const rightMap = new Map(rightIds.map((id, index) => [id as string, { index, value: right[index] }]));
        for (const [id, item] of leftMap) if (!rightMap.has(id)) add({ type: 'removed', path: `${path}.${id}`, id, before: item.value });
        for (const [id, item] of rightMap) if (!leftMap.has(id)) add({ type: 'added', path: `${path}.${id}`, id, after: item.value });
        for (const [id, leftItem] of leftMap) {
          const rightItem = rightMap.get(id);
          if (!rightItem) continue;
          if (leftItem.index !== rightItem.index) add({ type: 'moved', path: `${path}.${id}`, id, before: leftItem.index, after: rightItem.index });
          visit(leftItem.value, rightItem.value, `${path}.${id}`);
        }
        return;
      }
      add({ type: 'changed', path, before: left, after: right });
      return;
    }
    if (record(left) && record(right)) {
      const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
      for (const key of keys) {
        const next = path ? `${path}.${key}` : key;
        if (!(key in left)) add({ type: 'added', path: next, after: right[key] });
        else if (!(key in right)) add({ type: 'removed', path: next, before: left[key] });
        else visit(left[key], right[key], next);
      }
      return;
    }
    add({ type: 'changed', path: path || kind, before: left, after: right });
  };

  visit(before, after, '');
  return Object.freeze({ kind, summary: Object.freeze(summary), details: Object.freeze(all.slice(0, detailLimit)), isPartial: all.length > detailLimit, totalDetails: all.length });
}
