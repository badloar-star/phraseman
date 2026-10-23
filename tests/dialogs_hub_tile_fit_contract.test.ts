// ЗАМОК ВЛАДЕЛЬЦА 22.10: названия тем Диалогов — решение владельца («как в приложении»), слова не меняем и шрифт НЕ ужимаем (запрет на adjustsFontSizeToFit); Переводчик (fit-report-360dp, 5ae42981a) нашёл, что «Повседневное» (ru), «Повсякденне» (uk), «Gündelik hayat» (tr)
// не влезали в плитку 2 × 2 на 360 dp при равных колонках. Сторож меряет название каждой темы на 9 языках реальным шрифтом (Inter Bold — не уже системных) в плитке, ширина которой делится по dialogsHubTileWeight.
import fs from 'node:fs';
import path from 'node:path';

import { dialogueV2UiWorldTitle } from '../app/dialogue_v2_ui_copy';
import { dialogsHubTileWeight } from '../components/dialogs/hub/dialogs_hub_model';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { loadAdvance } = require('../scripts/ttf_advance.cjs') as { loadAdvance: (file: string) => (text: string, size: number) => number };

const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const ROWS: readonly (readonly string[])[] = [['social', 'work'], ['travel', 'everyday']];
const SCREEN = 360;
const MARGIN = 16;
const GAP = 8;
const TILE_PAD = 12;
const ICON = 20;
const ICON_GAP = 10;
const SAFETY = 2;

describe('Плитки тем Диалогов: название помещается при 360 dp на 9 языках, без ужатия шрифта', () => {
  const advance = loadAdvance(path.join(__dirname, '..', 'docs', 'design', 'v2-app', 'fonts', 'Inter-Bold.ttf'));
  const rowWidth = SCREEN - 2 * MARGIN - GAP;

  for (const lang of LANGS) {
    for (const row of ROWS) {
      const titles = row.map((id) => dialogueV2UiWorldTitle(lang, id));
      const weights = titles.map((t) => dialogsHubTileWeight(t ?? ''));
      const total = weights.reduce((a, b) => a + b, 0);
      row.forEach((id, i) => {
        const title = titles[i];
        it(`${lang} · ${id}: «${title}» помещается в плитку`, () => {
          expect(title).toBeTruthy();
          const text = rowWidth * (weights[i]! / total) - 2 * TILE_PAD - ICON - ICON_GAP;
          const w = advance(title as string, 16);
          if (w + SAFETY > text) console.warn(`[DIALOGS-TILE-FIT] ${lang}/${id} «${title}» ${w.toFixed(1)} > ${text.toFixed(1)}`);
          expect(w + SAFETY).toBeLessThanOrEqual(text);
        });
      });
    }
  }

  it('плитка не ужимает шрифт и не режет название по слогам', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'components', 'dialogs', 'hub', 'DialogsHubThemes.tsx'), 'utf8');
    expect(src).not.toMatch(/adjustsFontSizeToFit|minimumFontScale/u);
    expect(src).toContain('outerStyle={{ flex: dialogsHubTileWeight(world.title), minWidth: 0 }}');
  });
});
