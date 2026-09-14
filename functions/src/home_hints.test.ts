import {
  HOME_HINT_CATALOG,
  validateHomeHintDraft,
} from './home_hints_catalog';
import {
  buildPublishedHomeHints,
  type HomeHintSelection,
} from './home_hints';

describe('home hint catalog', () => {
  it('contains 300 ideas with exactly three Russian variants', () => {
    expect(HOME_HINT_CATALOG).toHaveLength(300);
    expect(new Set(HOME_HINT_CATALOG.map((item) => item.id)).size).toBe(300);
    for (const item of HOME_HINT_CATALOG) {
      expect(item.variantsRu).toHaveLength(3);
      expect(item.variantsRu.every((text) => text.trim().length > 0)).toBe(true);
    }
  });

  it('keeps every draft within the publishable shape', () => {
    for (const item of HOME_HINT_CATALOG) {
      expect(validateHomeHintDraft(item)).toEqual({ ok: true });
    }
  });

  it('publishes only selected verified or copy-only variants', () => {
    const selections: HomeHintSelection[] = HOME_HINT_CATALOG.slice(0, 2).map((item, index) => ({
      id: item.id,
      variantIndex: index as 0 | 1,
    }));
    const snapshot = buildPublishedHomeHints(selections, 'v-test');
    expect(snapshot.version).toBe('v-test');
    expect(snapshot.items).toHaveLength(2);
    expect(snapshot.items[0]).toMatchObject({ id: HOME_HINT_CATALOG[0].id, textRu: HOME_HINT_CATALOG[0].variantsRu[0] });
  });

  it('blocks owner-confirmation facts from publication', () => {
    const item = HOME_HINT_CATALOG.find((candidate) => candidate.factStatus === 'needs_owner_confirmation');
    expect(item).toBeDefined();
    expect(() => buildPublishedHomeHints([{ id: item!.id, variantIndex: 0 }], 'v-blocked')).toThrow(/owner confirmation/i);
  });
});
