// peak_tower_fit.ts — размер и посадка башни Пика B в левой колонке.
// зачем (владелец 05.11 07:4x, скрин эмулятора: «башню сделать больше по возможности и опустить вниз»; макет variant_B: башня занимает всю
// высоту колонки, основание у кнопки «Играть»): раньше масштаб считался только по ширине колонки (≈31 % экрана) и башня висела под шапкой,
// внизу колонки — пустота. Теперь масштаб — от высоты колонки (вся башня с короной помещается), но не шире, чем тело нижнего этажа
// помещается в колонку; рисунок шире колонки: пустые поля SVG (слева/справа от тела) выходят за колонку, панель справа лежит поверх.
import { SPIRE_TOWER_GEOM, SPIRE_TW, spireFloorWidth } from '../spire_tower_model';
import { spireTowerNeedUnits } from '../spire_tower_bounds';

/** Тело нижнего (самого широкого) этажа, ед. SVG. */
export const PEAK_TOWER_BODY_UNITS = spireFloorWidth(1);
/** Доля нижнего поля башни (земля под основанием), на которую рисунок опускается ниже колонки — основание у самого низа. */
export const PEAK_TOWER_SINK = 0.55;

export type PeakTowerFit = Readonly<{
  /** dp на единицу SVG. */
  scale: number;
  /** Ширина и высота окна башни (весь рисунок от верха геометрии до земли), dp. */
  width: number;
  height: number;
  /** Сдвиг рисунка по горизонтали, чтобы тело башни стояло по центру колонки, dp. */
  offsetLeft: number;
  /** Насколько рисунок уходит вниз за низ колонки (отрицательный нижний отступ), dp. */
  sinkDown: number;
  /** Доля высоты колонки, которую занимает башня от короны до основания (сторож пропорций). */
  heightShare: number;
}>;

export function peakTowerFit(input: Readonly<{ railWidth: number; railHeight: number; headroomUnits: number }>): PeakTowerFit {
  const { railWidth, railHeight, headroomUnits } = input;
  const geom = SPIRE_TOWER_GEOM;
  const needUnits = spireTowerNeedUnits(headroomUnits, geom.height - geom.top);
  const byHeight = railHeight / needUnits;
  const byWidth = Math.max(1, railWidth) / PEAK_TOWER_BODY_UNITS;
  const scale = Math.max(0.1, Math.min(byHeight, byWidth));
  const width = SPIRE_TW * scale;
  const height = geom.height * scale;
  const baseBelow = (geom.height - geom.base) * scale;
  return {
    scale,
    width,
    height,
    offsetLeft: -(width - railWidth) / 2,
    sinkDown: Math.round(baseBelow * PEAK_TOWER_SINK),
    heightShare: Math.min(1, (needUnits * scale) / Math.max(1, railHeight)),
  };
}
