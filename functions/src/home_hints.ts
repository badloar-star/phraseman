import { HttpsError } from 'firebase-functions/v2/https';
import { HOME_HINT_CATALOG, type HomeHintDraft } from './home_hints_catalog';

export type HomeHintSelection = {
  readonly id: string;
  readonly variantIndex: 0 | 1 | 2;
};

export type PublishedHomeHint = {
  readonly id: string;
  readonly category: HomeHintDraft['category'];
  readonly audience: HomeHintDraft['audience'];
  readonly textRu: string;
};

export type PublishedHomeHints = {
  readonly schemaVersion: 1;
  readonly version: string;
  readonly items: readonly PublishedHomeHint[];
};

export function buildPublishedHomeHints(
  selections: readonly HomeHintSelection[],
  version: string,
): PublishedHomeHints {
  if (!Array.isArray(selections) || selections.length === 0 || selections.length > HOME_HINT_CATALOG.length) {
    throw new HttpsError('invalid-argument', 'select at least one and at most 300 home hints');
  }
  const byId = new Map(HOME_HINT_CATALOG.map((item) => [item.id, item]));
  const seen = new Set<string>();
  const items = selections.map((selection) => {
    const item = byId.get(selection.id);
    if (!item) throw new HttpsError('invalid-argument', `unknown home hint id: ${selection.id}`);
    if (seen.has(item.id)) throw new HttpsError('invalid-argument', `duplicate home hint id: ${item.id}`);
    seen.add(item.id);
    if (!Number.isInteger(selection.variantIndex) || selection.variantIndex < 0 || selection.variantIndex > 2) {
      throw new HttpsError('invalid-argument', `invalid variant for ${item.id}`);
    }
    if (item.factStatus === 'needs_owner_confirmation') {
      throw new HttpsError('failed-precondition', `home hint requires owner confirmation: ${item.id}`);
    }
    return {
      id: item.id,
      category: item.category,
      audience: item.audience,
      textRu: item.variantsRu[selection.variantIndex],
    };
  });
  const order = new Map(HOME_HINT_CATALOG.map((item, index) => [item.id, index]));
  items.sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0));
  if (!version.trim() || version.length > 80) throw new HttpsError('invalid-argument', 'invalid home hint version');
  return Object.freeze({ schemaVersion: 1, version, items: Object.freeze(items) });
}
