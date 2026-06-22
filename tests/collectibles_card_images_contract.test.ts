/**
 * Контракт «арт карточек подключён»: сгенерированная карта require()
 * (app/collectibles/card_images.generated.ts) обязана покрывать КАЖДУЮ карточку
 * каталога ровно одной webp-картинкой, без сирот, и все пути обязаны существовать
 * на диске. Если тест красный — арт сгенерировали, но забыли перегенерировать
 * карту (`node tools/collectibles/build-image-map.mjs`) или подключить файлы.
 *
 * Почему так: до этого экран и модалки рисовали только инлайн-SVG, а 330 webp
 * лежали в assets/ и НЕ были подключены. Этот тест охраняет проводку.
 */
import fs from 'node:fs';
import path from 'node:path';
import { COLLECTIBLE_SETS } from '../app/collectibles/catalog_data';
import {
  COLLECTIBLE_CARD_IMAGES,
  COLLECTIBLE_CARD_IMAGE_COUNT,
  collectibleCardImage,
} from '../app/collectibles/card_images.generated';

const GENERATED_PATH = path.join(__dirname, '..', 'app', 'collectibles', 'card_images.generated.ts');
const REPO_ROOT = path.join(__dirname, '..');

function allCatalogIds(): string[] {
  const ids: string[] = [];
  for (const set of COLLECTIBLE_SETS) {
    for (const card of set.cards) ids.push(card.id);
    ids.push(set.secret.id);
  }
  return ids;
}

describe('collectibles card images wiring', () => {
  it('карта покрывает каждую карточку и секретку каталога ровно один раз', () => {
    const catalogIds = allCatalogIds();
    const mapKeys = Object.keys(COLLECTIBLE_CARD_IMAGES);

    expect(new Set(mapKeys).size).toBe(mapKeys.length); // нет дублей ключей
    expect(mapKeys.sort()).toEqual([...catalogIds].sort());
  });

  it('у каждой карточки есть непустая картинка, нет сирот', () => {
    const catalogIds = new Set(allCatalogIds());

    for (const id of catalogIds) {
      expect(collectibleCardImage(id)).toBeTruthy();
    }
    for (const key of Object.keys(COLLECTIBLE_CARD_IMAGES)) {
      expect(catalogIds.has(key)).toBe(true);
    }
    expect(collectibleCardImage('does_not_exist')).toBeNull();
  });

  it('счётчик в сгенерированном файле = числу карточек каталога', () => {
    expect(COLLECTIBLE_CARD_IMAGE_COUNT).toBe(allCatalogIds().length);
    expect(COLLECTIBLE_CARD_IMAGE_COUNT).toBe(Object.keys(COLLECTIBLE_CARD_IMAGES).length);
  });

  it('каждый require()-путь в сгенерированном файле указывает на существующий webp', () => {
    const src = fs.readFileSync(GENERATED_PATH, 'utf8');
    const requirePaths = [...src.matchAll(/require\('([^']+\.webp)'\)/g)].map((m) => m[1]);

    expect(requirePaths.length).toBe(allCatalogIds().length);

    for (const rel of requirePaths) {
      // Пути в файле относительны app/collectibles/, приводим к корню репозитория.
      const abs = path.join(REPO_ROOT, 'app', 'collectibles', rel);
      expect(fs.existsSync(abs)).toBe(true);
    }
  });

  it('арт-папка содержит ровно столько webp, сколько карточек (нет лишних файлов)', () => {
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
