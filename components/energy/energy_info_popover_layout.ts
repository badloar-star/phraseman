export const MAX_POPOVER_WIDTH = 220;

const EDGE_GUTTER = 8;
const ARROW_WIDTH = 14;

export type EnergyInfoPopoverAnchor = Readonly<{
  x: number;
  y: number;
  w: number;
  h: number;
}>;

type Insets = Readonly<{
  top: number;
  right: number;
  bottom: number;
  left: number;
}>;

type LayoutInput = Readonly<{
  windowWidth: number;
  windowHeight: number;
  insets: Insets;
  anchor: EnergyInfoPopoverAnchor | null;
  measuredHeight: number;
}>;

export type EnergyInfoPopoverLayout = Readonly<{
  width: number;
  maxHeight: number;
  left: number;
  top: number;
  arrowLeft: number;
  placement: 'above' | 'below';
  showArrow: boolean;
}>;

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(min, value), Math.max(min, max));

/** Pure geometry shared by the runtime and narrow/landscape contract probes. */
export function computeEnergyInfoPopoverLayout({
  windowWidth,
  windowHeight,
  insets,
  anchor,
  measuredHeight,
}: LayoutInput): EnergyInfoPopoverLayout {
  const availableWidth = Math.max(1, windowWidth - insets.left - insets.right - EDGE_GUTTER * 2);
  const width = Math.min(MAX_POPOVER_WIDTH, availableWidth);
  const minLeft = insets.left + EDGE_GUTTER;
  const maxLeft = Math.max(minLeft, windowWidth - insets.right - EDGE_GUTTER - width);
  const minTop = insets.top + EDGE_GUTTER;
  const safeBottom = Math.max(minTop + 1, windowHeight - insets.bottom - EDGE_GUTTER);
  const fullSafeHeight = Math.max(1, safeBottom - minTop);
  const left = anchor
    ? clamp(anchor.x, minLeft, maxLeft)
    : Math.round((minLeft + maxLeft) / 2);

  const hasMeasuredContent = Number.isFinite(measuredHeight) && measuredHeight > 0;
  const anchorTop = anchor?.y ?? minTop;
  const anchorBottom = anchor ? anchor.y + Math.max(0, anchor.h) : minTop;
  const belowSpace = anchor
    ? Math.min(fullSafeHeight, Math.max(1, safeBottom - anchorBottom - EDGE_GUTTER))
    : fullSafeHeight;
  const aboveSpace = anchor
    ? Math.min(fullSafeHeight, Math.max(1, anchorTop - EDGE_GUTTER - minTop))
    : fullSafeHeight;
  const placement: EnergyInfoPopoverLayout['placement'] = !anchor
    ? 'below'
    : hasMeasuredContent && measuredHeight <= belowSpace
      ? 'below'
      : aboveSpace > belowSpace
        ? 'above'
        : 'below';
  const maxHeight = placement === 'above' ? aboveSpace : belowSpace;
  const boundedHeight = Math.min(maxHeight, Math.max(0, measuredHeight));
  const preferredTop = placement === 'above'
    ? anchorTop - EDGE_GUTTER - boundedHeight
    : anchorBottom + EDGE_GUTTER;
  const maxTop = Math.max(minTop, safeBottom - boundedHeight);
  const top = anchor ? clamp(preferredTop, minTop, maxTop) : minTop;

  const anchorCenterX = anchor ? anchor.x + anchor.w / 2 : left + width / 2;
  const arrowMin = Math.min(12, Math.max(0, width - ARROW_WIDTH));
  const arrowMax = Math.max(arrowMin, width - 26);
  const rawArrowLeft = Math.round(anchorCenterX - left - ARROW_WIDTH / 2);
  const arrowLeft = clamp(rawArrowLeft, arrowMin, arrowMax);
  const verticallyRepresentable = Boolean(anchor)
    && anchorTop >= minTop
    && anchorBottom <= safeBottom
    && (placement === 'above'
      ? Math.abs(top + boundedHeight - (anchorTop - EDGE_GUTTER)) < 0.5
      : Math.abs(top - (anchorBottom + EDGE_GUTTER)) < 0.5);
  const showArrow = hasMeasuredContent
    && verticallyRepresentable
    && rawArrowLeft >= arrowMin
    && rawArrowLeft <= arrowMax;

  return { width, maxHeight, left, top, arrowLeft, placement, showArrow };
}

export type EnergyPopoverRequestGate = Readonly<{
  begin: () => number;
  invalidate: () => void;
  isCurrent: (candidate: number) => boolean;
}>;

/** Rejects late measure callbacks after owner/focus eligibility changes. */
export function createEnergyPopoverRequestGate(): EnergyPopoverRequestGate {
  let generation = 0;
  return {
    begin: () => {
      generation += 1;
      return generation;
    },
    invalidate: () => {
      generation += 1;
    },
    isCurrent: (candidate) => candidate === generation,
  };
}

export type EnergyPopoverLifecycleGate = Readonly<{
  begin: () => number;
  invalidate: () => void;
  isCurrent: (candidate: number) => boolean;
  startClosing: (candidate: number) => boolean;
  canEnter: () => boolean;
}>;

/** Invalidates delayed animation completions whenever the popover closes or reopens. */
export function createEnergyPopoverLifecycleGate(): EnergyPopoverLifecycleGate {
  let generation = 0;
  let closing = false;
  return {
    begin: () => {
      generation += 1;
      closing = false;
      return generation;
    },
    invalidate: () => {
      generation += 1;
      closing = true;
    },
    isCurrent: (candidate) => candidate === generation,
    startClosing: (candidate) => {
      if (candidate !== generation || closing) return false;
      closing = true;
      return true;
    },
    canEnter: () => !closing,
  };
}
