import fs from 'node:fs';
import path from 'node:path';
import {
  AVATAR100_FITS,
  AVATAR100_TARGET_BOTTOM,
  AVATAR100_TARGET_SILHOUETTE,
} from '../constants/avatar100_fits';
import { CUSTOM_AVATAR_GRADIENTS } from '../constants/custom_avatars';

const ROOT = path.resolve(__dirname, '..');
const PORTRAIT = fs.readFileSync(path.join(ROOT, 'components/Avatar100Portrait.tsx'), 'utf8');
const BADGE = fs.readFileSync(path.join(ROOT, 'components/CustomAvatarBadge.tsx'), 'utf8');

function expectedIds(): number[] {
  const ids: number[] = [];
  for (let id = 73; id <= 126; id += 1) if (id !== 90) ids.push(id);
  return ids;
}

describe('Avatar100 renderer geometry', () => {
  it('covers every approved variant with a fit entry', () => {
    const keys = Object.keys(AVATAR100_FITS);
    expect(keys).toHaveLength(106);
    for (const id of expectedIds()) {
      for (const ink of ['black', 'white'] as const) {
        expect(AVATAR100_FITS[`custom-gen-${id}:${ink}`]).toBeDefined();
      }
    }
    expect(keys.some((key) => key.startsWith('custom-gen-90:'))).toBe(false);
  });

  // зачем: ради этого сторожа всё и делалось — до подгонки силуэты гуляли в 2.1
  // раза, и в гексе одни существа были крошечными, другие огромными.
  it('normalises every silhouette to one visual size', () => {
    const scales = Object.values(AVATAR100_FITS).map((fit) => fit.scale);
    expect(Math.min(...scales)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...scales)).toBeLessThanOrEqual(2.55);

    // После подгонки видимый силуэт у всех один: scale * исходный силуэт.
    // Значит сами scale обязаны лежать в узком коридоре, а не в 2.1x.
    expect(Math.max(...scales) / Math.min(...scales)).toBeLessThan(2.1);
    expect(AVATAR100_TARGET_SILHOUETTE).toBeGreaterThan(0.5);
    expect(AVATAR100_TARGET_SILHOUETTE).toBeLessThanOrEqual(1.2);
    expect(AVATAR100_TARGET_BOTTOM).toBeGreaterThan(0.8);
  });

  it('clips the body by the lower V diagonals, never by a straight edge', () => {
    // Диагонали нижней V: 93,74 -> 50,96.5 -> 7,74. Прямой горизонтальный срез
    // оставил бы у краёв «отрубленное» тело вместо формы гекса.
    expect(PORTRAIT).toContain('93,74 50,96.5 7,74');
  });

  it('lets the portrait overlap the upper and side rails', () => {
    // Клип тела уходит далеко за габарит гекса по бокам и вверх, поэтому
    // боковая линия не режет нос, а верхняя не срезает уши.
    expect(PORTRAIT).toMatch(/BODY_CLIP_POINTS = '-\d+,-\d+ \d+,-\d+ \d+,74 93,74 50,96\.5 7,74 -\d+,74'/);
    expect(PORTRAIT).toMatch(/UPPER_CLIP_POINTS = '-\d+,-\d+ \d+,-\d+ \d+,62 -\d+,62'/);
  });

  // зачем: клипы разрешают вылет, но рисовать его негде, если холст SVG равен
  // гексу — уши и рога срезались ровной линией по верхней кромке. Холст обязан
  // быть больше гекса, а сам гекс при этом сохранять размер.
  it('gives the overflow a canvas big enough to draw on', () => {
    const margin = Number(/const CANVAS_MARGIN = (\d+);/.exec(PORTRAIT)?.[1]);
    expect(margin).toBeGreaterThanOrEqual(20);
    expect(PORTRAIT).toContain('const CANVAS_SPAN = 100 + CANVAS_MARGIN * 2;');
    // Холст растянут и сдвинут на тот же запас — гекс остаётся на месте.
    expect(PORTRAIT).toContain('width={size * (CANVAS_SPAN / 100)}');
    expect(PORTRAIT).toContain('left: -size * (CANVAS_MARGIN / 100)');
    expect(PORTRAIT).toContain('top: -size * (CANVAS_MARGIN / 100)');
  });

  it('draws hex, body, lower V and upper overlap in that order', () => {
    // Считаем позиции внутри самой ветки Avatar100: имена констант встречаются
    // ещё и в блоке импортов, и оттуда порядок слоёв не виден.
    const branch = BADGE.slice(BADGE.indexOf('if (avatar100Fit && avatar100Uri)'));
    const hex = branch.indexOf('Слой 0');
    const body = branch.indexOf('zone="body"');
    const vee = branch.indexOf('AVATAR100_LOWER_V_POINTS');
    const upper = branch.indexOf('zone="upper"');
    expect(hex).toBeGreaterThan(-1);
    expect(body).toBeGreaterThan(hex);
    expect(vee).toBeGreaterThan(body);
    expect(upper).toBeGreaterThan(vee);
  });

  it('keeps one shared graphite gradient for black and white art', () => {
    // Градиент берётся из выбранного пользователем набора и НЕ зависит от того,
    // тёмный вариант существа или светлый — половинок у гекса быть не должно.
    expect(BADGE).not.toMatch(/isWhiteLogo\s*\?\s*gradient/);
    expect(BADGE).toContain('stopColor={gradient.colors[0]}');
  });

  // зачем: прежние подложки были почти чёрными до середины, цвет показывался
  // узкой полосой у нижней кромки, и портрет тонул. Замер по 106 портретам:
  // тёмные существа ~47 яркости, светлые ~175 — подложка обязана жить МЕЖДУ
  // ними, иначе одна из групп сливается с фоном.
  it('keeps every gradient readable for both dark and light creatures', () => {
    const luminance = (hex: string): number => {
      const value = parseInt(hex.slice(1), 16);
      return 0.2126 * (value >> 16) + 0.7152 * ((value >> 8) & 255) + 0.0722 * (value & 255);
    };

    expect(CUSTOM_AVATAR_GRADIENTS).toHaveLength(10);
    for (const gradient of CUSTOM_AVATAR_GRADIENTS) {
      const stops = gradient.colors.map(luminance);
      const average = stops.reduce((sum, stop) => sum + stop, 0) / stops.length;

      // Средняя яркость подложки — в коридоре между тёмными и светлыми существами.
      expect(average).toBeGreaterThan(80);
      expect(average).toBeLessThan(210);

      // Верхний стоп больше не «почти чёрный»: цвет ведёт с самого верха.
      expect(stops[0]).toBeGreaterThan(20);

      // Градиент именно градиент, а не плоская заливка.
      expect(Math.max(...stops) - Math.min(...stops)).toBeGreaterThan(40);
    }
  });

  // зачем: владелец забраковал серо-бежевую палитру как унылую. Подложка обязана
  // нести ЦВЕТ, а не оттенок серого, и менять оттенок сверху вниз, а не просто
  // светлеть — иначе мы снова сползём в графит и пергамент.
  it('keeps the palette saturated and hue-shifting, never grey', () => {
    const channels = (hex: string) => {
      const value = parseInt(hex.slice(1), 16);
      return [value >> 16, (value >> 8) & 255, value & 255];
    };
    const saturation = (hex: string) => {
      const [r, g, b] = channels(hex);
      const max = Math.max(r, g, b);
      return max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
    };
    const hue = (hex: string) => {
      const [r, g, b] = channels(hex).map((c) => c / 255);
      const max = Math.max(r, g, b);
      const delta = max - Math.min(r, g, b);
      if (delta === 0) return 0;
      const raw = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
      return (raw * 60 + 360) % 360;
    };

    for (const gradient of CUSTOM_AVATAR_GRADIENTS) {
      for (const stop of gradient.colors) {
        expect(saturation(stop)).toBeGreaterThan(0.25);
      }
      // Сверху вниз меняется именно оттенок, а не только светлота.
      const [first, , last] = gradient.colors.map(hue);
      const shift = Math.min(Math.abs(first - last), 360 - Math.abs(first - last));
      expect(shift).toBeGreaterThan(8);
    }
  });

  it('defaults the catalog to the light creature variant', () => {
    const catalog = fs.readFileSync(path.join(ROOT, 'app/customization_catalog.ts'), 'utf8');
    expect(catalog).toContain("input.defaultLogoColor ?? 'white'");
  });

  it('reuses one renderer instead of per-id hacks', () => {
    // Внутри ветки Avatar100 не должно быть ни одного упоминания конкретного ID:
    // геометрия и подгонка общие, иначе мы вернёмся к ручной таблице на каждый ID.
    const start = BADGE.indexOf('if (avatar100Fit && avatar100Uri)');
    const branch = BADGE.slice(start, BADGE.indexOf('zone="upper"', start));
    expect(start).toBeGreaterThan(-1);
    expect(branch).not.toMatch(/custom-gen-\d+/);
    expect(branch).not.toMatch(/CUSTOM_AVATAR_IMAGE_FITS/);
  });
});
