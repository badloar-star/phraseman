import fs from 'node:fs/promises';

export function expandCatalog(source) {
  return source.cards.map((entry) => ({
    schemaVersion: 1,
    revision: 1,
    campaign: source.campaign,
    status: entry.status ?? 'copy_ready',
    grid: entry.items.length === 9 ? '3x3' : '2x3',
    ...entry,
    items: entry.items.map((item, index) => ({
      id: `item_${String(index + 1).padStart(2, '0')}`,
      english: item.en,
      russian: item.ru,
      visualBrief: item.visual,
    })),
    surfaces: structuredClone(source.defaults.surfaces),
    images: structuredClone(source.defaults.images),
    quality: null,
  }));
}

export async function readCatalog(filePath) {
  return expandCatalog(JSON.parse(await fs.readFile(filePath, 'utf8')));
}

export function validateCatalogUniqueness(cards) {
  const errors = [];
  for (const field of ['contentId', 'titleEn']) {
    const values = cards.map((card) => card[field].trim().toLocaleLowerCase());
    if (new Set(values).size !== values.length) errors.push(`duplicate:${field}`);
  }
  const hooks = cards.map((card) => card.conversion.hookLabel.trim().toLocaleLowerCase());
  if (new Set(hooks).size !== hooks.length) errors.push('duplicate:hookLabel');
  const itemKeys = cards.flatMap((card) => card.items.map((item) => `${item.english}|${item.russian}`.toLocaleLowerCase()));
  if (new Set(itemKeys).size !== itemKeys.length) errors.push('duplicate:learning_item');
  for (const card of cards) {
    if (!card.items.some((item) => item.id === card.conversion.heroItemId)) {
      errors.push(`missing_hero:${card.contentId}`);
    }
  }
  return { ok: errors.length === 0, errors };
}
