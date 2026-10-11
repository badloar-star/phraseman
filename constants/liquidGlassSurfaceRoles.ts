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
  // ── Стиль «Тень» (владелец 12.10, вариант 2; docs/design/v2-app/SHADOW_STYLE_SPEC.md): контейнеры БЕЗ обводок ──
  /** Градиент плашки 180° (сверху → вниз): тёмная — белый 8,5 % → 4 % поверх фона (непрозрачный результат), светлая — белый → тон ниже. */
  plateFillFrom: string;
  plateFillTo: string;
  /** Градиент выбранного/главного (приподнятого): тёмная — белый 15 % → 7 %, светлая — белый → чуть темнее. */
  raisedFillFrom: string;
  raisedFillTo: string;
  /** Цвет тени плашки (`0 16 28 −14` тёмная / `0 14 26 −14` светлая) и мягкий второй слой светлой (`0 1 3`). */
  plateShadow: string;
  plateShadowSoft: string;
  /** Тень вложенного (плитка-иконка, кнопка внутри плашки): `0 6 12 −6` / `0 5 10 −5`. */
  nestedShadow: string;
  /** Тень выбранного: `0 26 40 −14` и мягкий слой светлой `0 2 4`; сам элемент сдвигается на RAISED_LIFT. */
  raisedShadow: string;
  raisedShadowSoft: string;
  /** Разделитель между строками внутри групповой плашки (вместо обводки и своих плашек у строк). */
  dividerTone: string;
}>;

type SurfaceSource = Readonly<{
  bg: string;
  bgTop?: string;
  bgBottom?: string;
  opaqueCard: string;
  opaqueControl: string;
  opaqueSheet: string;
  card: string;
  /** Уровень цвета темы: чем выше, тем больше тон темы в светлых тенях (ползунок интенсивности). */
  level?: 'calm' | 'accent' | 'max';
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
 * Цвет `color`, смешанный с `toward` шагами по 5 %, пока контраст со ВСЕМИ поверхностями не станет ≥ `min`.
 * зачем (проверка тем на новых экранах, 14.10): `mutedText` в светлом оформлении рисуют ТЕКСТОМ (счётчики, номера, подписи 13 px),
 * а замер дал 4,06 на низе плашки и 3,64 на тонированном фоне; здесь он доводится до 4,5 без смены оттенка в сторону серого.
 */
export function legibleOn(color: string, toward: string, surfaces: readonly string[], min: number): string {
  let tone = hex6(color);
  const against = surfaces.map(hex6);
  for (let k = 0; k <= 1.0001; k += 0.05) {
    tone = mixSurfaceHex(color, toward, Math.min(k, 1));
    if (against.every((bg) => ratio(tone, bg) >= min)) return tone;
  }
  return hex6(toward);
}

/**
 * Тон между поверхностью и текстом темы: доля текста растёт от `from`, пока контраст со ВСЕМИ поверхностями не станет ≥ `min`.
 * зачем (находка Сверки 12.10): на светлых градиентных темах значки и дорожки выключенных переключателей были ≈ 1,5:1 — их
 * красили тонами поверхности; здесь тон берётся от текста темы, поэтому читается в любой теме и на любом шаге ползунка.
 */
function nonTextTone(t: SurfaceSource, from: number, min: number, extra: readonly string[] = []): string {
  const against = [t.opaqueCard, t.card, t.opaqueSheet, t.opaqueControl, t.bg, ...extra].map(hex6);
  for (let k = from; k <= 1.0001; k += 0.02) {
    const tone = mixSurfaceHex(t.opaqueCard, t.text, Math.min(k, 1));
    if (against.every((bg) => ratio(tone, bg) >= min)) return tone;
  }
  return hex6(t.text);
}

// зачем (светлая тема, решение координатора п.68, 15.10): низ плашки «Тени» сливался с фоном экрана — разница светлоты 0,1–3,4 при пороге 3. Здесь низ
// плашки минимально затемняется В СТОРОНУ ТЕКСТА темы шагом 2 % (оттенок сохраняется), пока разница светлоты L* с КАЖДЫМ тоном фона не станет ≥ 3.
const labL = (hex: string): number => {
  const y = lum(hex);
  return y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y;
};
export const PLATE_BG_MIN_DL = 3;
export function separatedFromBackground(color: string, toward: string, backgrounds: readonly string[], minDL: number = PLATE_BG_MIN_DL): string {
  const bgL = backgrounds.map(labL);
  for (let k = 0; k <= 0.6001; k += 0.02) {
    const tone = k === 0 ? hex6(color) : mixSurfaceHex(color, toward, k);
    if (bgL.every((l) => Math.abs(labL(tone) - l) >= minDL)) return tone;
  }
  return hex6(color);
}

/** Спековый цвет светлых теней (rgba(40,40,80)) с тоном темы: подмешиваем тон тени самой темы. */
const LIGHT_SHADOW_BASE = '#282850';

export function deriveLiquidGlassSurfaceRoles(t: SurfaceSource): LiquidGlassSurfaceRoles {
  // Стиль «Тень»: числа — из спеки; тон светлой тени и нижний тон плашки — от темы, поэтому ползунок и тема их меняют.
  const tintShare = { calm: 0.35, accent: 0.55, max: 0.75 }[t.level ?? 'calm'];
  const tinted = t.shadowTint.length > 7 ? mixSurfaceHex(LIGHT_SHADOW_BASE, t.shadowTint, tintShare) : LIGHT_SHADOW_BASE;
  const lightShadow = (alpha: number) => withAlpha(tinted, alpha);
  const shadowStyle = t.isLight
    ? {
        plateFillFrom: hex6(t.opaqueCard),
        plateFillTo: separatedFromBackground(
          mixSurfaceHex(t.opaqueCard, t.opaqueControl, 0.55), t.text,
          [t.bg, ...(t.bgTop ? [t.bgTop] : []), ...(t.bgBottom ? [t.bgBottom] : [])],
        ),
        raisedFillFrom: hex6(t.opaqueCard),
        raisedFillTo: mixSurfaceHex(t.opaqueCard, t.opaqueControl, 0.25),
        plateShadow: lightShadow(0.34),
        plateShadowSoft: lightShadow(0.06),
        nestedShadow: lightShadow(0.28),
        raisedShadow: lightShadow(0.46),
        raisedShadowSoft: lightShadow(0.08),
        dividerTone: 'rgba(20,20,40,0.06)',
      }
    : {
        plateFillFrom: mixSurfaceHex(t.bg, '#FFFFFF', 0.085),
        plateFillTo: mixSurfaceHex(t.bg, '#FFFFFF', 0.04),
        raisedFillFrom: mixSurfaceHex(t.bg, '#FFFFFF', 0.15),
        raisedFillTo: mixSurfaceHex(t.bg, '#FFFFFF', 0.07),
        plateShadow: 'rgba(0,0,0,0.75)',
        plateShadowSoft: 'rgba(0,0,0,0)',
        nestedShadow: 'rgba(0,0,0,0.6)',
        raisedShadow: 'rgba(0,0,0,0.9)',
        raisedShadowSoft: 'rgba(0,0,0,0)',
        dividerTone: 'rgba(255,255,255,0.07)',
      };
  // зачем (аудит контраста «Тени» 14.10, решение координатора п.63): неактивные значки и дорожки были 2,75–2,94 на верхнем тоне фона (светлые
  // grad_magma / grad_midnight) и на выбранной плашке (тёмное, интенсивность 0, все темы). Теперь подбор идёт и по ним — сдвиг ровно до порога.
  const extraSurfaces = [shadowStyle.raisedFillFrom, ...(t.bgTop ? [t.bgTop] : [])];
  const iconMuted = nonTextTone(t, 0.40, 3.2, extraSurfaces);
  const trackOff = nonTextTone(t, 0.32, 3.1, extraSurfaces);
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
      ...shadowStyle,
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
    ...shadowStyle,
  });
}
