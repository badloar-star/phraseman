/**
 * Контракт «арт карточек подключён»: сгенерированная карта URL
 * (app/collectibles/collectible_image_url_map.generated.ts) обязана покрывать
 * КАЖДУЮ карточку каталога ровно одной ссылкой на Firebase Storage, без сирот.
 * Локальные webp (assets/images/collectibles/dalli/**) остаются как источник для
 * перегенерации/загрузки, но в приложение НЕ бандлятся — арт стримится по URL,
 * а инлайн-SVG из каталога — офлайн-фолбэк.
 *
 * Если тест красный — арт сгенерировали/перезалили, но забыли перегенерировать
 * карту URL (`node scripts/upload_collectible_images_to_storage.mjs`).
 */
import fs from 'node:fs';
import path from 'node:path';
import { COLLECTIBLE_SETS } from '../app/collectibles/catalog_data';
import {
  COLLECTIBLE_IMAGE_URL_MAP,
  getCollectibleImageUrl,
} from '../app/collectibles/collectible_image_url_map.generated';

const REPO_ROOT = path.join(__dirname, '..');

function allCatalogIds(): string[] {
  const ids: string[] = [];
  for (const set of COLLECTIBLE_SETS) {
    for (const card of set.cards) ids.push(card.id);
    ids.push(set.secret.id);
  }
  return ids;
}

describe('collectibles card images wiring (remote URL map)', () => {
  it('карта URL покрывает каждую карточку и секретку каталога ровно один раз', () => {
    const catalogIds = allCatalogIds();
    const mapKeys = Object.keys(COLLECTIBLE_IMAGE_URL_MAP);

    expect(new Set(mapKeys).size).toBe(mapKeys.length); // нет дублей ключей
    expect(mapKeys.sort()).toEqual([...catalogIds].sort());
  });

  it('у каждой карточки есть валидный https-URL, нет сирот', () => {
    const catalogIds = new Set(allCatalogIds());

    for (const id of catalogIds) {
      const url = getCollectibleImageUrl(id);
      expect(typeof url).toBe('string');
      expect(url).toMatch(/^https:\/\/firebasestorage\.googleapis\.com\/.+\.webp\?/);
    }
    for (const key of Object.keys(COLLECTIBLE_IMAGE_URL_MAP)) {
      expect(catalogIds.has(key)).toBe(true);
    }
    expect(getCollectibleImageUrl('does_not_exist')).toBeUndefined();
  });

  it('каждый URL указывает на свой cardId (collectible-images/<id>.webp)', () => {
    for (const [id, url] of Object.entries(COLLECTIBLE_IMAGE_URL_MAP)) {
      expect(url).toContain(encodeURIComponent(`collectible-images/${id}.webp`));
    }
  });

  it('локальные webp-источники на месте: ровно столько, сколько карточек', () => {
    const artRoot = path.join(REPO_ROOT, 'assets', 'images', 'collectibles', 'dalli');
    let onDisk = 0;
    for (const setDir of fs.readdirSync(artRoot)) {
      const dirPath = path.join(artRoot, setDir);
      if (!fs.statSync(dirPath).isDirectory()) continue;
      onDisk += fs.readdirSync(dirPath).filter((f) => f.endsWith('.webp')).length;
    }
    expect(onDisk).toBe(allCatalogIds().length);
  });
});
