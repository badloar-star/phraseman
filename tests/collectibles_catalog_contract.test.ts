/**
 * Контракт каталога «Сокровищницы»: клиентский и серверный модули генерируются
 * одной командой `node tools/collectibles/generate.mjs build-app` из одного
 * источника (catalog_seed.json) и обязаны совпадать. Если тест красный —
 * кто-то правил сгенерированные файлы руками или забыл перегенерировать оба.
 */
import {
  COLLECTIBLES_CATALOG_VERSION as CLIENT_VERSION,
  COLLECTIBLE_SETS,
} from '../app/collectibles/catalog_data';
import {
  COLLECTIBLES_CATALOG_VERSION as SERVER_VERSION,
  COLLECTIBLE_POOL,
  COLLECTIBLE_SECRET_BY_SET,
  COLLECTIBLE_SET_CARD_IDS,
} from '../functions/src/collectibles_catalog';

const RARITY_BY_SET_TYPE: Record<string, Record<string, number>> = {
  A: { common: 5, rare: 3, epic: 2, legendary: 0 },
  B: { common: 5, rare: 3, epic: 1, legendary: 1 },
};

describe('collectibles catalog contract (client ↔ server)', () => {
  it('версии каталогов совпадают', () => {
    expect(CLIENT_VERSION).toBe(SERVER_VERSION);
  });

  it('в клиентском каталоге есть live-сеты и у каждого ровно 10 карточек + секретка', () => {
    expect(COLLECTIBLE_SETS.length).toBeGreaterThanOrEqual(6);
    for (const set of COLLECTIBLE_SETS) {
      expect(set.cards).toHaveLength(10);
      expect(set.secret.id).toBeTruthy();
      expect(set.secret.en).toBeTruthy();
    }
  });

  it('id карточек и секреток глобально уникальны', () => {
    const ids = new Set<string>();
    for (const set of COLLECTIBLE_SETS) {
      for (const card of set.cards) {
        expect(ids.has(card.id)).toBe(false);
        ids.add(card.id);
      }
      expect(ids.has(set.secret.id)).toBe(false);
      ids.add(set.secret.id);
    }
  });

  it('серверный пул = все клиентские карточки (id, setId, rarity), без секреток', () => {
    const clientCards = new Map<string, { setId: string; rarity: string }>();
    const secretIds = new Set<string>();
    for (const set of COLLECTIBLE_SETS) {
      for (const card of set.cards) clientCards.set(card.id, { setId: set.setId, rarity: card.rarity });
      secretIds.add(set.secret.id);
    }
    expect(COLLECTIBLE_POOL.length).toBe(clientCards.size);
    for (const poolCard of COLLECTIBLE_POOL) {
      const client = clientCards.get(poolCard.id);
      expect(client).toBeDefined();
      expect(poolCard.setId).toBe(client?.setId);
      expect(poolCard.rarity).toBe(client?.rarity);
      expect(secretIds.has(poolCard.id)).toBe(false);
    }
  });

  it('карта секреток и состав сетов на сервере совпадают с клиентом', () => {
    expect(Object.keys(COLLECTIBLE_SECRET_BY_SET).sort()).toEqual(
      COLLECTIBLE_SETS.map((s) => s.setId).sort(),
    );
    for (const set of COLLECTIBLE_SETS) {
      expect(COLLECTIBLE_SECRET_BY_SET[set.setId]).toBe(set.secret.id);
      expect(COLLECTIBLE_SET_CARD_IDS[set.setId]).toEqual(set.cards.map((c) => c.id));
    }
  });

  it('распределение редкостей в каждом сете соответствует типу A/B', () => {
    for (const set of COLLECTIBLE_SETS) {
      const expected = RARITY_BY_SET_TYPE[set.type];
      expect(expected).toBeDefined();
      const counts: Record<string, number> = { common: 0, rare: 0, epic: 0, legendary: 0 };
      for (const card of set.cards) counts[card.rarity] += 1;
      expect(counts).toEqual(expected);
    }
  });

  it('у каждой карточки live-сета есть безопасный инлайн-SVG', () => {
    for (const set of COLLECTIBLE_SETS) {
      for (const card of set.cards) {
        expect(card.svg).toBeTruthy();
        const svg = card.svg as string;
        expect(svg).toContain('viewBox="0 0 200 160"');
        // Запреты STYLE_GUIDE: исполняемое/внешнее внутри SVG недопустимо.
        expect(svg).not.toMatch(/<script|<image|<foreignObject|xlink:|href=/i);
      }
      if (set.secret.svg) {
        expect(set.secret.svg).not.toMatch(/<script|<image|<foreignObject|xlink:|href=/i);
      }
    }
  });
});
