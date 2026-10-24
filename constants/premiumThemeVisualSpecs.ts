export type PremiumThemeVisualSpec = Readonly<{
  id: string;
  packId: string;
  dark: readonly [string, string, string, string];
  light: readonly [string, string, string, string];
  accent: string;
  ink: string;
  edge: string;
  sceneTop: string;
  sceneBottom: string;
}>;

const SPECS: readonly PremiumThemeVisualSpec[] = Object.freeze([
  { id: 'grad_full_olive', packId: 'olive', dark: ['#10170d', '#424c28', '#333d20', '#586035'], light: ['#e6ead5', '#f5f5de', '#e7edc9', '#c9d3a5'], accent: '#dbe591', ink: '#34410d', edge: '#bac573', sceneTop: '#778624', sceneBottom: '#151e10' },
  { id: 'grad_full_ref_signal_lime', packId: 'lime', dark: ['#040709', '#1c2613', '#0d120c', '#212c15'], light: ['#f9ffed', '#fdfff9', '#f8ffe9', '#f4ffde'], accent: '#c2ff46', ink: '#445919', edge: '#c2ff46', sceneTop: '#101406', sceneBottom: '#020406' },
  { id: 'grad_full_ref_storm_violet', packId: 'amethyst', dark: ['#040709', '#1e1929', '#0e0c15', '#241e2f'], light: ['#fbf5ff', '#fefcff', '#faf3ff', '#f8ecff'], accent: '#d697ff', ink: '#4b3559', edge: '#d697ff', sceneTop: '#110c14', sceneBottom: '#020406' },
  { id: 'grad_full_titanium', packId: 'titanium', dark: ['#121416', '#3c4248', '#292f34', '#4b5055'], light: ['#e0e3e5', '#f6f7f8', '#dce1e4', '#bfc7ce'], accent: '#ff8c80', ink: '#a92d26', edge: '#c9d1d8', sceneTop: '#34383d', sceneBottom: '#0a0c0f' },
  { id: 'grad_full_horizon', packId: 'horizon', dark: ['#091723', '#2b4659', '#203344', '#395b6c'], light: ['#dde8ef', '#f2f8ff', '#d8e7f2', '#b4cbd8'], accent: '#ffd09a', ink: '#805022', edge: '#8dafc4', sceneTop: '#12385a', sceneBottom: '#060e1a' },
  { id: 'grad_full_ref_gravity_blue', packId: 'singularity', dark: ['#040709', '#142229', '#0a1015', '#19282f'], light: ['#f3fcff', '#fbfeff', '#f0fbff', '#e9f9ff'], accent: '#86dfff', ink: '#2f4e59', edge: '#86dfff', sceneTop: '#0b1214', sceneBottom: '#020406' },
]);

const BY_ID = new Map(SPECS.map((spec) => [spec.id, spec]));

export function premiumThemeVisualSpec(id: unknown): PremiumThemeVisualSpec | null {
  return typeof id === 'string' ? BY_ID.get(id) ?? null : null;
}

function channel(hex: string, offset: number): number { return Number.parseInt(hex.slice(offset, offset + 2), 16); }
export function mixPremiumHex(from: string, to: string, amount: number): string {
  const blend = (offset: number) => Math.round(channel(from, offset) * (1 - amount) + channel(to, offset) * amount).toString(16).padStart(2, '0');
  return `#${blend(1)}${blend(3)}${blend(5)}`;
}

function linear(value: number): number { const v = value / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }
function luminance(hex: string): number { return 0.2126 * linear(channel(hex, 1)) + 0.7152 * linear(channel(hex, 3)) + 0.0722 * linear(channel(hex, 5)); }
function contrast(a: string, b: string): number { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi! + 0.05) / (lo! + 0.05); }

export function premiumSceneTop(spec: PremiumThemeVisualSpec): string {
  let top = spec.sceneTop;
  while (contrast('#ffffff', top) < 5) top = mixPremiumHex(top, '#000000', 0.04);
  return top;
}

export function premiumThemeTokenOverrides(id: unknown, appearance: 'dark' | 'light'): Readonly<Record<string, string>> | null {
  const spec = premiumThemeVisualSpec(id);
  if (!spec) return null;
  const dark = appearance === 'dark';
  const [bg, from, to, dock] = dark ? spec.dark : spec.light;
  const ink = dark ? '#fff9f6' : '#181a20';
  const muted = dark ? '#dacfd0' : '#55505b';
  const accent = dark ? spec.accent : spec.ink;
  const cta = mixPremiumHex(spec.accent, '#ffffff', 0.82);
  return Object.freeze({
    bg, bgTop: bg, bgBottom: bg,
    opaqueCard: to, opaqueSheet: to, opaqueControl: from,
    card: to, sheet: to,
    text: ink, secondary: muted, mutedText: muted,
    accent, accentBright: accent, accentText: accent, accentTextSafe: accent, accentGraphic: accent,
    cta, ctaInk: spec.ink, ctaFill: cta, ctaText: spec.ink, ctaFillFrom: cta, ctaFillTo: cta,
    plateFillFrom: from, plateFillTo: to, sheetPlateFillFrom: from, sheetPlateFillTo: to,
    raisedFillFrom: from, raisedFillTo: to, deepBase: to, deepBaseAlt: bg,
    premiumDock: dock, premiumDockInk: ink,
    premiumEdge: spec.edge,
  });
}

export const PREMIUM_THEME_VISUAL_SPECS = SPECS;

// зачем (4 · ТЕМЫ 24.10, слово владельца «Пусть чинит 4 · Темы»; закон «цвета — строго оттенки текущей темы»): краски материалов анимации премиум-тем —
// часть спецификации самой темы (как bg/accent выше), а не литералы экрана. Значения перенесены из утверждённого full-themes без изменений.
export const PREMIUM_MOTION_PIGMENTS = Object.freeze({
  grad_full_olive: Object.freeze({sheen: '#d3cd6a44', rimLight: '#ebe9ab66', rimShade: '#bec86030'}),
  grad_full_titanium: Object.freeze({glare: '#c8d0d533', edgeLight: '#eff3f577', edgeShade: '#b8c9d530', ember: '#ff322966', emberRim: '#ff857166'}),
  grad_full_horizon: Object.freeze({planet: '#050e19', dawnRim: '#ffd09e', dawnGlow: '#ffb75c55', skyGlow: '#52b8e952', skyHaze: '#4fa6e12c', outerRim: '#9dd7f955'}),
  /** Фон холста под WebGL (alpha:false) — виден только до первого кадра шейдера. */
  canvasBackdrop: '#020406',
});
