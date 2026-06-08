export interface AdaptiveEnergyIconLayoutOptions {
  slotCount: number;
  iconSize: number;
  maxWidth: number;
  minIconSize?: number;
  defaultStepRatio?: number;
  minStepRatio?: number;
}

export interface AdaptiveEnergyIconLayout {
  iconSize: number;
  marginLeft: number;
  width: number;
  maxWidth: number;
}

const DEFAULT_STEP_RATIO = 0.55;
const MIN_STEP_RATIO = 0.26;
const MIN_ICON_SIZE = 18;
const ABSOLUTE_MIN_ICON_SIZE = 1;
const DEFAULT_DENSITY_SLOT_COUNT = 6;
const STEP_RATIO_COMPACTION_PER_SLOT = 0.035;

function getDensityAwareStepRatio(slotCount: number, defaultStepRatio: number, minStepRatio: number): number {
  const extraSlots = Math.max(0, slotCount - DEFAULT_DENSITY_SLOT_COUNT);
  return Math.max(minStepRatio, defaultStepRatio - extraSlots * STEP_RATIO_COMPACTION_PER_SLOT);
}

export function getAdaptiveEnergyIconLayout({
  slotCount,
  iconSize,
  maxWidth,
  minIconSize = MIN_ICON_SIZE,
  defaultStepRatio = DEFAULT_STEP_RATIO,
  minStepRatio = MIN_STEP_RATIO,
}: AdaptiveEnergyIconLayoutOptions): AdaptiveEnergyIconLayout {
  const safeSlots = Math.max(1, Math.floor(slotCount));
  const safeMaxWidth = Math.max(1, Math.floor(maxWidth));
  const safeMinIconSize = Math.max(1, Math.floor(minIconSize));
  const baseIconSize = Math.max(safeMinIconSize, Math.floor(iconSize));
  const compactWidthFactor = 1 + Math.max(0, safeSlots - 1) * minStepRatio;
  const fittedIconSize = Math.max(
    ABSOLUTE_MIN_ICON_SIZE,
    Math.min(baseIconSize, Math.floor(safeMaxWidth / compactWidthFactor)),
  );

  if (safeSlots === 1) {
    return {
      iconSize: fittedIconSize,
      marginLeft: 0,
      width: fittedIconSize,
      maxWidth: safeMaxWidth,
    };
  }

  const densityStepRatio = getDensityAwareStepRatio(safeSlots, defaultStepRatio, minStepRatio);
  const defaultStep = fittedIconSize * densityStepRatio;
  const tightestStep = Math.max(1, fittedIconSize * minStepRatio);
  const availableStep = (safeMaxWidth - fittedIconSize) / (safeSlots - 1);
  const step = Math.max(tightestStep, Math.min(defaultStep, availableStep));
  const marginLeft = Math.min(0, Math.floor(step - fittedIconSize));
  const effectiveStep = Math.max(1, fittedIconSize + marginLeft);
  const width = fittedIconSize + (safeSlots - 1) * effectiveStep;

  return {
    iconSize: fittedIconSize,
    marginLeft,
    width: Math.min(safeMaxWidth, width),
    maxWidth: safeMaxWidth,
  };
}
