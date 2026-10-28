// зачем (баг владельца 28.10: «тема серая, а сцена в уроках будет фиолетовая, или в других местах будет отличаться — везде по цвету темы»; задача координатора):
// все экраны со сценой берут цвета из ОДНОЙ функции от текущей темы и не держат своих палитр. Этот страж ловит три вида расхождения:
//  1) насыщенность сцены уроков/приветствия выше насыщенности самой темы (серая тема → яркая сцена — исходный баг);
//  2) цветной литерал (насыщенность > 0,05, например фиолетовый) прямо в файле экрана со сценой;
//  3) палитра экрана «Приветствие нового языка» перестала читаться или стала цветнее темы.
// Сработал — подключай экран к homeSceneTokensForTheme / seasonThemedArt(…, hexChroma(accent)), а не добавляй исключение.
import fs from 'node:fs';
import path from 'node:path';

import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { homeSceneOklchOf, homeSceneTokensForTheme, relativeLuminance, whiteContrastOn } from '../components/home/v2/scene/home_scene_tokens';
import { SEASON_REF_CHROMA, SEASON_TINT_SCALE_MIN, hexChroma, hexHue, seasonThemedArt } from '../components/learning-v2/season/season_art';
import { languageWelcomePalette } from '../app/language_welcome_palette';

const ROOT = path.resolve(__dirname, '..');
const APPEARANCES = ['dark', 'light'] as const;
const HEX6 = /^#([0-9a-f]{6})$/i;
const chromaOf = (hex: string): number => {
  const m = HEX6.exec(hex);
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  return homeSceneOklchOf([(n >> 16) & 255, (n >> 8) & 255, n & 255])[1];
};
const contrast = (a: string, b: string): number => {
  const la = relativeLuminance(a) ?? 0;
  const lb = relativeLuminance(b) ?? 0;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

describe('сцены уроков: насыщенность не выше насыщенности темы', () => {
  it('обложка и карточки Сезона × все темы × оба оформления × главы и эпизоды', () => {
    const bad: string[] = [];
    let checked = 0;
    for (const appearance of APPEARANCES) {
      for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
        const g = liquidGlassTokens(id, { level: 'max', appearance });
        const themeChroma = hexChroma(g.accent);
        const ref = SEASON_REF_CHROMA[appearance];
        // допуск: нижняя граница доли (серая тема не мёртво-серая) и небольшая погрешность перевода в sRGB
        const cap = Math.max(themeChroma, SEASON_TINT_SCALE_MIN * ref) + 0.012;
        for (let chapter = 1; chapter <= 7; chapter += 1) {
          for (let ordinal = 0; ordinal < 6; ordinal += 1) {
            for (const exam of [false, true]) {
              const art = seasonThemedArt(hexHue(g.accent), chapter, ordinal, appearance, exam, themeChroma);
              for (const [name, color] of [['from', art.from], ['to', art.to], ['glow', art.glow]] as const) {
                checked += 1;
                const c = chromaOf(color);
                if (c > cap) bad.push(`${id}/${appearance} гл.${chapter} эп.${ordinal}${exam ? ' экзамен' : ''} ${name} ${color}: насыщенность ${c.toFixed(3)} > ${cap.toFixed(3)} (тема ${themeChroma.toFixed(3)})`);
              }
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(1000);
    expect(bad.slice(0, 20)).toEqual([]);
  });

  it('цвет акцента всех тем — шестизначный hex (запасной фиолетовый акцент сцены недостижим)', () => {
    const bad: string[] = [];
    for (const appearance of APPEARANCES) {
      for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
        const g = liquidGlassTokens(id, { level: 'max', appearance });
        if (!HEX6.test(g.accent)) bad.push(`${id}/${appearance}: accent ${g.accent}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('экран «Приветствие нового языка»: палитра из сцены темы', () => {
  it('читается и не цветнее темы — все темы × оформления', () => {
    const bad: string[] = [];
    for (const appearance of APPEARANCES) {
      for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
        const p = languageWelcomePalette(id, appearance);
        const scene = homeSceneTokensForTheme(id, appearance);
        if (p.top !== scene.sceneTop || p.bottom !== scene.sceneBottom) bad.push(`${id}/${appearance}: фон не из сцены темы`);
        if (whiteContrastOn(p.top) < 4.5 || whiteContrastOn(p.bottom) < 4.5) bad.push(`${id}/${appearance}: белый текст на фоне < 4,5`);
        for (const stop of p.cta) if (contrast(p.ink, stop) < 4.5) bad.push(`${id}/${appearance}: подпись кнопки на ${stop} < 4,5`);
        for (const stop of p.cta) if (contrast(stop, p.bottom) < 3) bad.push(`${id}/${appearance}: кнопка ${stop} на фоне < 3`);
        const themeChroma = hexChroma(liquidGlassTokens(id, { level: 'max', appearance }).accent);
        if (themeChroma < 0.08) {
          // фон (top/bottom) — цвет сцены Главной по определению, он здесь не проверяется; проверяются цвета, которые экран выбирает сам
          for (const [name, color] of Object.entries({ accent: p.mark, c0: p.cta[0], c1: p.cta[1], c2: p.cta[2] })) {
            if (chromaOf(color) > 0.1) bad.push(`${id}/${appearance}: серая тема, а ${name} ${color} насыщенность ${chromaOf(color).toFixed(3)}`);
          }
        }
      }
    }
    expect(bad.slice(0, 20)).toEqual([]);
  });
});

describe('файлы экранов со сценой: без цветных литералов', () => {
  const sceneDirs = ['components/home/v2/scene', 'components/dialogs/scene', 'components/spire/scene', 'components/learning-v2/season'];
  const sceneFiles = ['components/learning-v2/LearningV2ChapterExamResult.tsx', 'app/language_welcome.tsx'];
  // файлы-источники и данные: сами считают палитру или держат обложки/картинки, а не рисуют экран
  const SKIP = /home_scene_tokens\.ts$|\.generated\.ts$|_preview_fixtures\.ts$|season_art\.ts$|season_star_tones\.ts$|dialogs_hub_tokens\.ts$/;

  const files: string[] = [...sceneFiles];
  for (const dir of sceneDirs) {
    for (const name of fs.readdirSync(path.join(ROOT, dir))) {
      if (/\.tsx?$/.test(name) && !SKIP.test(name)) files.push(`${dir}/${name}`);
    }
  }

  it('в файле нет #rrggbb с насыщенностью > 0,05 вне комментариев', () => {
    const bad: string[] = [];
    for (const file of files) {
      const lines = fs.readFileSync(path.join(ROOT, file), 'utf8').split(/\r?\n/);
      lines.forEach((line, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
        for (const m of line.matchAll(/#([0-9a-fA-F]{6})\b/g)) {
          if (chromaOf(`#${m[1]}`) > 0.05) bad.push(`${file}:${i + 1} ${m[0]}`);
        }
      });
    }
    expect(files.length).toBeGreaterThan(20);
    expect(bad).toEqual([]);
  });
});
