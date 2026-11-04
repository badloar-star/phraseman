// зачем (слово владельца «облегчить всё», 04.11): плиточные варианты intro_* — 256 px по ширине, модалка — полный 1344; основа и акцент одного имени одного размера.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

import { THEMED_ART_TILES } from '../components/theme/themed_art_tiles';

const ROOT = path.join(__dirname, '..');

describe('плиточные варианты intro_*', () => {
  it('каждое имя имеет тёмный или светлый вариант, файлы на месте', () => {
    expect(Object.keys(THEMED_ART_TILES).length).toBe(14);
    for (const [name, byBright] of Object.entries(THEMED_ART_TILES)) {
      for (const b of ['dark', 'light'] as const) {
        const t = byBright?.[b];
        if (!t) continue;
        expect(fs.existsSync(path.join(ROOT, 'assets/images/v2art', b, `${name}.tile.webp`))).toBe(true);
      }
    }
  });

  it('плитка ≤ 256 px по ширине и основа/акцент одного размера', async () => {
    for (const [name, byBright] of Object.entries(THEMED_ART_TILES)) {
      for (const b of ['dark', 'light'] as const) {
        const file = path.join(ROOT, 'assets/images/v2art', b, `${name}.tile.webp`);
        if (!fs.existsSync(file)) continue;
        const base = await sharp(file).metadata();
        expect(base.width).toBeLessThanOrEqual(256);
        const accFile = path.join(ROOT, 'assets/images/v2art', b, `${name}.accent.tile.webp`);
        if (byBright?.[b]?.accent && fs.existsSync(accFile)) {
          const acc = await sharp(accFile).metadata();
          expect(`${acc.width}x${acc.height}`).toBe(`${base.width}x${base.height}`);
        }
      }
    }
  });

  it('модалка берёт файл 1344 px (оригинал 1536 — в asset_sources)', async () => {
    const m = await sharp(path.join(ROOT, 'assets/images/v2art/dark/intro_arena.webp')).metadata();
    expect(m.width).toBe(1344);
    expect(fs.existsSync(path.join(ROOT, 'asset_sources/v2art_intro_1536/dark_intro_arena.webp'))).toBe(true);
  });
});
