// зачем (координатор 12.10): страница сравнения значков лиги (ART_STYLE_FOR_CODEX/league_options.html) красит слой .accent настоящими токенами тем,
// а не приближением OKLCH. Скрипт выгружает токены всех тем × тёмное/светлое × опорные оттенки ползунка в ART_STYLE_FOR_CODEX/league_tokens.json.
//   npx tsx scripts/gen_league_options_tokens.ts
import fs from 'node:fs';
import path from 'node:path';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { liquidGlassLevelForIntensity } from '../constants/liquidGlassThemeIntensity';
import { artAccentTint } from '../components/theme/art_tint';

const INTENSITIES = [0, 0.5, 1];
const out: Record<string, Record<string, Record<string, Record<string, string>>>> = {};
for (const id of LIQUID_GLASS_THEME_IDS) {
  out[id] = {};
  for (const appearance of ['dark', 'light'] as const) {
    out[id]![appearance] = {};
    for (const intensity of INTENSITIES) {
      const t = liquidGlassTokens(id, { appearance, intensity, level: liquidGlassLevelForIntensity(intensity) });
      out[id]![appearance]![String(intensity)] = {
        bgTop: t.bgTop, bgBottom: t.bgBottom, card: t.opaqueCard, control: t.opaqueControl, text: t.text, secondary: t.secondary,
        accent: t.accent, accentBright: t.accentBright, tint: artAccentTint(t, appearance),
      };
    }
  }
}
const file = path.join(__dirname, '..', 'ART_STYLE_FOR_CODEX', 'league_tokens.json');
fs.writeFileSync(file, JSON.stringify(out));
console.log(`[LEAGUE-TOKENS] ${LIQUID_GLASS_THEME_IDS.length} тем -> ${file}`);
