import type { GlassTokens } from './liquidGlassThemePalette';
import { isLiteModeOn } from './lite_mode_flag';
// зачем (Сверка 21.10, пункт №39, Galaxy A04): мягкие размытые тени — самое дорогое в отрисовке на слабом GPU. В «Лёгком режиме»
// (ОЗУ < 3 ГБ или ручной переключатель) все четыре функции тени отдают пустой список слоёв; плашки и блики остаются, вид отделяется тоном.

// зачем (владелец 12.10, «ВТОРОЙ ВАРИАНТ ДЕЛАЕМ!»): контейнеры БЕЗ обводок — плашку отделяют тень и мягкий блик-градиент сверху,
// выбранное/главное приподнято. Это ЕДИНСТВЕННЫЙ источник чисел спеки docs/design/v2-app/SHADOW_STYLE_SPEC.md в виде готовых
// значений `boxShadow` и градиентов из токенов темы (constants/liquidGlassSurfaceRoles.ts): слой kit (KitSurface/Sheen) и экраны берут
// их отсюда, а не пишут свои числа. Все цвета — токены, поэтому тема, оформление и ползунок интенсивности меняют их сами.

export type ShadowLayer = Readonly<{ offsetX: number; offsetY: number; blurRadius: number; spreadDistance: number; color: string }>;
export type VerticalGradient = Readonly<{ colors: readonly [string, string]; start: { x: number; y: number }; end: { x: number; y: number } }>;

/** Приподнятое (выбранное/главное) сдвигается вверх на 3 dp — только transform, высота ряда не меняется. */
export const RAISED_LIFT = -3;

type Tokens = Pick<GlassTokens,
  'isLight' | 'accent' | 'plateFillFrom' | 'plateFillTo' | 'raisedFillFrom' | 'raisedFillTo'
  | 'plateShadow' | 'plateShadowSoft' | 'nestedShadow' | 'raisedShadow' | 'raisedShadowSoft'>;

// зачем (координатор 14.10, гипотеза падения qemu на размытых тенях): dev-рубильник «тени выкл» — только в памяти процесса, ссылка
// dev_state?shadows=off. Все четыре функции ниже при включённом флаге отдают пустой список слоёв. В стор-сборке сеттер не срабатывает (__DEV__).
let devShadowsOff = false;
export function setDevShadowsOff(off: boolean): boolean {
  if (typeof __DEV__ === 'undefined' || __DEV__ !== true) {
    console.warn('[SHADOW-OFF] отказ: не dev-сборка'); // guard-ok: ранний выход логируется
    return false;
  }
  devShadowsOff = off;
  console.warn('[SHADOW-OFF] тени', off ? 'ВЫКЛЮЧЕНЫ' : 'включены', '(в памяти процесса; экраны перечитают при следующем рендере)'); // guard-ok: единичный лог на ссылку
  return true;
}
export const isDevShadowsOff = (): boolean => devShadowsOff;
const NO_SHADOW: readonly ShadowLayer[] = [];

const layer = (offsetY: number, blurRadius: number, spreadDistance: number, color: string): ShadowLayer =>
  ({ offsetX: 0, offsetY, blurRadius, spreadDistance, color });

const gradient180 = (from: string, to: string): VerticalGradient =>
  ({ colors: [from, to], start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } });

/** Плашка: градиент 180°. */
export function plateGradient(g: Tokens): VerticalGradient {
  return gradient180(g.plateFillFrom, g.plateFillTo);
}

/** Выбранное/главное: градиент 180°. */
export function raisedGradient(g: Tokens): VerticalGradient {
  return gradient180(g.raisedFillFrom, g.raisedFillTo);
}

/** Тень плашки: тёмная `0 16 28 −14`, светлая `0 14 26 −14` + мягкий `0 1 3`. */
export function plateShadowStyle(g: Tokens): readonly ShadowLayer[] {
  if (devShadowsOff || isLiteModeOn()) return NO_SHADOW;
  return g.isLight
    ? [layer(14, 26, -14, g.plateShadow), layer(1, 3, 0, g.plateShadowSoft)]
    : [layer(16, 28, -14, g.plateShadow)];
}

/** Тень вложенного (плитка-иконка, кнопка внутри плашки): тёмная `0 6 12 −6`, светлая `0 5 10 −5`. */
export function nestedShadowStyle(g: Tokens): readonly ShadowLayer[] {
  if (devShadowsOff || isLiteModeOn()) return NO_SHADOW;
  return [g.isLight ? layer(5, 10, -5, g.nestedShadow) : layer(6, 12, -6, g.nestedShadow)];
}

/** Тень выбранного/главного: `0 26 40 −14` (+ мягкий `0 2 4` в светлой); сам элемент сдвигается на RAISED_LIFT. */
export function raisedShadowStyle(g: Tokens): readonly ShadowLayer[] {
  if (devShadowsOff || isLiteModeOn()) return NO_SHADOW;
  return g.isLight
    ? [layer(26, 40, -14, g.raisedShadow), layer(2, 4, 0, g.raisedShadowSoft)]
    : [layer(26, 40, -14, g.raisedShadow)];
}

/** Кнопка действия: цветная тень `0 14 24 −10` цвета темы 60 %. */
export function actionShadowStyle(g: Pick<Tokens, 'accent'>): readonly ShadowLayer[] {
  if (devShadowsOff || isLiteModeOn()) return NO_SHADOW;
  return [layer(14, 24, -10, `${g.accent.slice(0, 7)}99`)];
}
