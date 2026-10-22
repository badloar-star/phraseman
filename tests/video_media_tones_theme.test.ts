// зачем (закон владельца 22.10 «ЦВЕТА ДОЛЖНЫ БЫТЬ СТРОГО ЦВЕТАМИ И ОТТЕНКАМИ ТЕКУЩЕЙ ТЕМЫ»; координатор → 8 · МОМЕНТЫ, зона «Видео»):
// белое, чёрное и плашки поверх кадра — роли текущей темы (video_media_tones), а не литералы с пометкой theme-exempt в семи файлах.
// Проверяем во всех темах, оформлениях и уровнях: сцена под плеером остаётся тёмной (видео смотрят на тёмном), время на плашке
// читается даже поверх белого кадра (≥ 4,5), в файлах видео нет своих цветов.
import * as fs from 'fs';
import * as path from 'path';
import { LIQUID_GLASS_THEME_IDS } from '../constants/liquidGlassThemePalette';
import { paletteContrast } from '../constants/liquidGlassPaletteRoles';
import { videoMediaTonesForTheme } from '../components/video/video_media_tones';

const VARIANTS = (['dark', 'light'] as const).flatMap((appearance) => (['calm', 'accent', 'max'] as const).map((level) => ({ appearance, level })));

/** rgba(…) поверх непрозрачного #RRGGBB → #RRGGBB. */
const over = (top: string, under: string): string => {
  const m = /^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/.exec(top.replace(/\s/g, ''));
  if (!m) return top.slice(0, 7);
  const a = Number(m[4]);
  const u = Number.parseInt(under.slice(1, 7), 16);
  const ch = (i: number, shift: number) => Math.round(Number(m[i]) * a + ((u >> shift) & 255) * (1 - a)).toString(16).padStart(2, '0');
  return `#${ch(1, 16)}${ch(2, 8)}${ch(3, 0)}`.toUpperCase();
};

describe('videoMediaTones', () => {
  it('сцена под видео тёмная, время на плашке читается поверх белого кадра — во всех темах', () => {
    const bad: string[] = [];
    for (const variant of VARIANTS) {
      for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
        const tones = videoMediaTonesForTheme(id, variant as never);
        const at = `${id} ${variant.appearance}/${variant.level}`;
        // сцена: тёмнее середины — белое ≥ 12 : 1 на ней (прежде чистый чёрный — 21 : 1)
        const stage = paletteContrast(tones.ink.slice(0, 7), tones.stage.slice(0, 7));
        if (stage < 12) bad.push(`${at}: сцена ${tones.stage} слишком светлая (${stage.toFixed(2)})`);
        const badgeOnWhite = paletteContrast(tones.ink.slice(0, 7), over(tones.badge, '#FFFFFF'));
        if (badgeOnWhite < 4.5) bad.push(`${at}: время на плашке поверх белого кадра ${badgeOnWhite.toFixed(2)}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('файлы видео берут цвета поверх кадра из video_media_tones — без своих литералов и пометок theme-exempt', () => {
    const root = path.resolve(__dirname, '..');
    for (const rel of [
      'components/youtube/YoutubeInlinePlayer.tsx',
      'app/flashcards/VideoPackRow.tsx',
      'components/youtube/YoutubeVideoCard.tsx',
      'components/video/VideoGlassKit.tsx',
      'components/youtube/YoutubeChannelPickerSheet.tsx',
      'components/youtube/YoutubePremiereHero.tsx',
      'components/youtube/YoutubeVideoGridCard.tsx',
    ]) {
      const code = fs.readFileSync(path.join(root, rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
      expect({ rel, literals: code.match(/(['"`])#(?:[0-9A-Fa-f]{3,8})\1|rgba?\(\s*\d/g) ?? [] }).toEqual({ rel, literals: [] });
      expect({ rel, exempt: /theme-exempt|MEDIA_INK/.test(code) }).toEqual({ rel, exempt: false });
    }
  });
});
