/**
 * Цвета лица плитки галереи «Сохранённых» — градиент цвета темы, стекло, блик, свечение, точки.
 *
 * зачем (владелец 18.10, капсом: «на макете они были КРАСИВЫЕ С ГРАДИЕНТОМ И С ТОЧЕЧКАМИ»; эталон cards-gallery.html `.face` + CARDS_LOCKED.md): диагональный градиент
 * от цвета темы (g1) через почти чёрный к второму цвету темы (g2) ВНУТРИ карточки, блик по кромке, свечение в углу, точки силы слова слева снизу. Цвета — токены
 * темы (accentGradient, deepBase, mediaInk…), а не литералы макета: плитка перекрашивается вместе с темой и оформлением (светлое / тёмное, ползунок насыщенности).
 * Макет — только тёмный, а у многих тем акцент светлый (пастельный) или оформление светлое: доля цвета темы в градиенте (макет: g1 46 %, g2 40 %) подбирается так, чтобы
 * Кромку-обводку и фаску макета (`inset 0 0 0 1px`, `inset 1px 1.5px`) НЕ рисуем: закон «Тень» владельца 12.10 — контейнеры без обводок и внутренних кромок (сторож
 * shadow_style_no_container_borders); блик и свечение внутри плитки остаются. Слово и перевод читаются на КАЖДОЙ остановке градиента (≥ 4,5 : 1), — поэтому в «ярких» темах градиент как в макете, а в пастельных/светлых бледнее, но текст читается всегда.
 */
import { alphaHex, mixHex } from '../../constants/v2Style';
import type { GlassTokens } from '../../constants/liquidGlassThemePalette';

export type GalleryFaceColors = Readonly<{
  /** Три остановки диагонального градиента: g1 → база → g2 (макет `.face`). */
  c1: string; c2: string; c3: string;
  /** Свечение в верхнем правом углу. */
  glow: string;
  /** Слово, подпись/перевод, значки на плитке. */
  ink: string; inkSoft: string;
  /** Точки силы слова: заполненная и пустая. */
  dotOn: string; dotOff: string;
  /** Подложка кнопки звука. */
  speakBg: string;
}>;

const MIN_TEXT = 4.6;
const MIN_GRAPHIC = 3;

const lumOf = (hex: string): number => {
  const h = hex.replace('#', '').slice(0, 6);
  const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
};
export const faceContrast = (a: string, b: string): number => {
  const [hi, lo] = [lumOf(a), lumOf(b)].sort((p, q) => q - p);
  return (hi! + 0.05) / (lo! + 0.05);
};

/** Наибольшая доля цвета темы (≤ макетной), при которой слово и перевод читаются на этой остановке. */
function tintFor(base: string, tint: string, want: number, ink: string, soft: string): string {
  for (let a = want; a > 0.06; a -= 0.04) {
    const stop = mixHex(base, tint, a);
    if (faceContrast(ink, stop) >= MIN_TEXT + 0.2 && faceContrast(soft, stop) >= MIN_TEXT) return stop;
  }
  return base;
}

const cache = new WeakMap<GlassTokens, GalleryFaceColors>();

export function galleryFaceColors(g: GlassTokens): GalleryFaceColors {
  const hit = cache.get(g);
  if (hit) return hit;
  const g1 = g.accentGradient[0] ?? g.accent; // light-accent-ok: запасной вариант на случай пустого градиента темы; светлая плитка читает градиент акцента
  const g2 = g.accentGradient[g.accentGradient.length - 1] ?? g.accent; // light-accent-ok: запасной вариант на случай пустого градиента темы; светлая плитка читает градиент акцента
  const base = g.deepBase;
  // тёмное оформление: белый на тёмной базе (макет); светлое: тёмный текст темы на светлой тоновой базе
  const ink = g.isLight ? g.text : g.mediaInk;
  const soft = mixHex(base, ink, 0.8);
  const colors: GalleryFaceColors = {
    c1: tintFor(base, g1, 0.46, ink, soft),
    c2: base,
    c3: tintFor(base, g2, 0.4, ink, soft),
    glow: g1,
    ink,
    inkSoft: soft,
    dotOn: faceContrast(g.accentBright, base) >= MIN_GRAPHIC ? g.accentBright : ink,
    dotOff: alphaHex(ink, 0.22),
    speakBg: alphaHex(ink, 0.12),
  };
  cache.set(g, colors);
  return colors;
}
