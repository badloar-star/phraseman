/**
 * Токены поверхностей поверх готовой темы — для экранов, где цвета были зашиты под скриншоты макета.
 *
 * зачем (замечание владельца 10.10): «на ряде экранов цвета зашиты под макет и не следуют выбранной теме
 * (хаб Карточек)». Тёмные базы стопок, блики кромки, тени, скрим и белый поверх картинок брались литералами
 * (#0E0E12, #08080B, rgba(255,255,255,.30), rgba(0,0,0,.85)). Здесь они становятся именованными токенами
 * ВСЕХ тем — тёмных и светлых, на любом шаге ползунка. Считаются из готовых полей темы, поэтому формулы тем
 * не меняются и существующие токены не затронуты.
 */

export type LiquidGlassSurfaceRoles = Readonly<{
  /** Тёмная (в светлой теме — тоновая) база стопок и героев вместо #0E0E12. */
  deepBase: string;
  /** Ещё глубже/светлее вторым слоем стопки вместо #08080B. */
  deepBaseAlt: string;
  /** Подложка поверх картинок и видео под текстом/значками. */
  mediaScrim: string;
  /** Текст и значки поверх картинок, видео, градиентных заливок. */
  mediaInk: string;
  mediaInkSoft: string;
  /** Блик по верхне-левой кромке и тёмная нижняя кромка («толщина стекла»). */
  bevelHi: string;
  bevelLo: string;
  /** Цвет тени крупных поверхностей. */
  dropShadow: string;
  /** Тонкая разделительная линия на любой поверхности. */
  hairlineSoft: string;
  /**
   * Нетекстовые элементы (WCAG 1.4.11): декоративные значки («люди» в строке набора), приглушённые иконки — контраст ≥ 3:1 к
   * карточке, шторке, плашке и фону темы. Для текста не использовать (там `secondary`/`mutedText`/`accentText`).
   */
  iconMuted: string;
  /** Дорожка ВЫКЛЮЧЕННОГО переключателя, пустая часть слайдера: контраст ≥ 3:1 к тем же поверхностям. */
  trackOff: string;
}>;

type SurfaceSource = Readonly<{
  bg: string;
  opaqueCard: string;
  opaqueControl: string;
  opaqueSheet: string;
  card: string;
  text: string;
  isLight: boolean;
  shadowTint: string;
}>;

const hex6 = (hex: string): string => (/^#[0-9A-Fa-f]{6}/.test(hex) ? hex.slice(0, 7).toUpperCase() : '#000000');

/** Смешивание непрозрачных 6-значных цветов: k — доля `to`. */
export function mixSurfaceHex(from: string, to: string, k: number): string {
  const a = Number.parseInt(hex6(from).slice(1), 16);
  const b = Number.parseInt(hex6(to).slice(1), 16);
  const ch = (shift: number) => Math.round(((a >> shift) & 255) * (1 - k) + ((b >> shift) & 255) * k).toString(16).padStart(2, '0');
  return `#${ch(16)}${ch(8)}${ch(0)}`.toUpperCase();
}

const withAlpha = (hex: string, opacity: number): string =>
  `${hex6(hex)}${Math.round(opacity * 255).toString(16).padStart(2, '0').toUpperCase()}`;

const lum = (hex: string): number => {
  const n = Number.parseInt(hex6(hex).slice(1), 16);
  const ch = (shift: number) => {
    const c = ((n >> shift) & 255) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(16) + 0.7152 * ch(8) + 0.0722 * ch(0);
};
const ratio = (a: string, b: string): number => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

/**
 * Тон между поверхностью и текстом темы: доля текста растёт от `from`, пока контраст со ВСЕМИ поверхностями не станет ≥ `min`.
 * зачем (находка Сверки 12.10): на светлых градиентных темах значки и дорожки выключенных переключателей были ≈ 1,5:1 — их
 * красили тонами поверхности; здесь тон берётся от текста темы, поэтому читается в любой теме и на любом шаге ползунка.
 */
function nonTextTone(t: SurfaceSource, from: number, min: number): string {
  const against = [t.opaqueCard, t.card, t.opaqueSheet, t.opaqueControl, t.bg].map(hex6);
  for (let k = from; k <= 1.0001; k += 0.02) {
    const tone = mixSurfaceHex(t.opaqueCard, t.text, Math.min(k, 1));
    if (against.every((bg) => ratio(tone, bg) >= min)) return tone;
  }
  return hex6(t.text);
}

export function deriveLiquidGlassSurfaceRoles(t: SurfaceSource): LiquidGlassSurfaceRoles {
  const iconMuted = nonTextTone(t, 0.40, 3.2);
  const trackOff = nonTextTone(t, 0.32, 3.1);
  if (t.isLight) {
    return Object.freeze({
      deepBase: mixSurfaceHex(t.opaqueControl, '#000000', 0.08),
      deepBaseAlt: t.opaqueControl,
      mediaScrim: 'rgba(0,0,0,0.45)',
      mediaInk: '#FFFFFF',
      mediaInkSoft: 'rgba(255,255,255,0.78)',
      bevelHi: 'rgba(255,255,255,0.90)',
      bevelLo: 'rgba(0,0,0,0.10)',
      dropShadow: t.shadowTint.length > 7 ? t.shadowTint : 'rgba(0,0,0,0.16)',
      hairlineSoft: withAlpha(t.text, 0.10),
      iconMuted,
      trackOff,
    });
  }
  return Object.freeze({
    deepBase: mixSurfaceHex(t.bg, '#000000', 0.35),
    deepBaseAlt: mixSurfaceHex(t.bg, '#000000', 0.6),
    mediaScrim: withAlpha(mixSurfaceHex(t.bg, '#000000', 0.35), 0.58),
    mediaInk: '#FFFFFF',
    mediaInkSoft: 'rgba(255,255,255,0.70)',
    bevelHi: 'rgba(255,255,255,0.30)',
    bevelLo: 'rgba(0,0,0,0.45)',
    dropShadow: 'rgba(0,0,0,0.85)',
    hairlineSoft: withAlpha(t.text, 0.08),
    iconMuted,
    trackOff,
  });
}
