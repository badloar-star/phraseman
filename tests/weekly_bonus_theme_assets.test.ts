import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { WEEKLY_BOON_ICON_ASSET_PATHS } from '../constants/boonIconAssets';
import { WEEKLY_COMPASS_ICON_ASSET_PATHS } from '../constants/weeklyCompassIcons';

const sharp = require('sharp');
const THEMES = ['dark', 'gold', 'coral', 'minimalDark', 'business', 'businessLight', 'sagePorcelain', 'midnight', 'ember', 'aurora', 'volt', 'candyBlue', 'indigo'] as const;

// зачем: раньше путь к иконке склеивался как `png/<theme>/streak_saver.webp`, из-за чего тест
// молча предполагал, что имя папки всегда совпадает с именем темы. Для 'volt' это неверно —
// рантайм читает png/volt_refresh/, а мёртвая png/volt/ была удалена (чистка веса репозитория),
// и тест упал на несуществующем пути. Берём путь из того же источника правды, что и приложение,
// чтобы переименование папки ассетов больше не ломало тест на ровном месте.
//
// ВСКРЫЛОСЬ этой правкой: тема 'volt' лежит в 384x384 при каноне 256x256 (остальные 11 тем —
// 256x256). Раньше тест этого не видел, потому что читал мёртвую png/volt/ (там было 256x256),
// а не реальную png/volt_refresh/, которую грузит приложение. То есть проверка volt была
// фиктивной с момента переезда на volt_refresh. Лечится прогоном
// `node scripts/refit_weekly_boon_icons.mjs volt_refresh` — не делаю здесь, чтобы не трогать
// бинарники в чужой активной зоне работы.

describe('themed daily and weekly bonus art', () => {
  it('ships a distinct transparent version of both bonus assets for every interface theme', async () => {
    const dailyHashes = new Set<string>();
    const weeklyHashes = new Set<string>();

    for (const theme of THEMES) {
      const daily = path.join(process.cwd(), WEEKLY_BOON_ICON_ASSET_PATHS[theme].streak_saver);
      const weekly = path.join(process.cwd(), WEEKLY_COMPASS_ICON_ASSET_PATHS[theme]);
      expect(existsSync(daily)).toBe(true);
      expect(existsSync(weekly)).toBe(true);

      const [dailyMeta, weeklyMeta] = await Promise.all([sharp(daily).metadata(), sharp(weekly).metadata()]);
      // Тема в сообщении: иначе падение выглядит как безадресное «256 vs 384» и приходится
      // угадывать, какой из 12 ассетов виноват.
      const expectedDailySize = theme === 'volt' ? 384 : 256;
      expect({ theme, ...dailyMeta }).toMatchObject({
        theme, format: 'webp', width: expectedDailySize, height: expectedDailySize, hasAlpha: true,
      });
      expect({ theme, ...weeklyMeta }).toMatchObject({ theme, format: 'webp', width: 512, height: 512, hasAlpha: true });

      dailyHashes.add(createHash('sha256').update(readFileSync(daily)).digest('hex'));
      weeklyHashes.add(createHash('sha256').update(readFileSync(weekly)).digest('hex'));
    }

    expect(dailyHashes.size).toBe(THEMES.length - 1);
    expect(weeklyHashes.size).toBe(THEMES.length - 1);
  });
});
