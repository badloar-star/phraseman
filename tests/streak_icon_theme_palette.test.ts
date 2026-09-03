import fs from 'node:fs';
import path from 'node:path';
import { STREAK_ICON_MODEL } from '../constants/streakIconAssets';

const ROOT = path.resolve(__dirname, '..');

// зачем: прежний сторож фиксировал хэши тематических огоньков (dark/aurora).
// Правило снято — с 30.08 действует ТЗ «Единое перо цепочки дней»: один общий
// набор на все темы. Хэши тех картинок разошлись ещё 24.08, когда их
// перерисовали, а тест остался сторожить отменённое. Здесь сторожим то, что
// правило требует сейчас: перо одно на все темы и растёт от слабого к сильному.

function assetBytes(relativePath: string): Buffer {
  return fs.readFileSync(path.join(ROOT, relativePath));
}

describe('перо цепочки дней', () => {
  const paths = Object.values(STREAK_ICON_MODEL.featherAssetPaths);

  it('одно и то же перо во всех темах — тематических наборов не осталось', () => {
    for (const rel of paths) {
      expect(rel).toMatch(/^assets\/images\/streak_icons\/feather\//);
    }
    const themed = fs
      .readdirSync(path.join(ROOT, 'assets/images/streak_icons'), {
        withFileTypes: true,
      })
      .filter((entry) => entry.isDirectory() && entry.name !== 'feather')
      .flatMap((entry) =>
        fs.readdirSync(path.join(ROOT, 'assets/images/streak_icons', entry.name)),
      )
      .filter((name) => name.startsWith('streak-fire-'));
    expect(themed).toEqual([]);
  });

  it('десять разных ступеней: ни одна картинка не повторяется', () => {
    const seen = paths.map((rel) => assetBytes(rel).toString('base64'));
    expect(new Set(seen).size).toBe(10);
  });

  it('перо крепнет: старшие ступени тяжелее первой — свечение и искры', () => {
    const sizes = paths.map((rel) => assetBytes(rel).byteLength);
    expect(sizes[9]).toBeGreaterThan(sizes[0]);
    expect(sizes[8]).toBeGreaterThan(sizes[0]);
  });
});
