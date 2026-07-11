import React, { forwardRef, useCallback, useRef } from 'react';
import {
  StyleSheet,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type Text,
  type TextLayoutEventData,
  type TextLayoutLine,
} from 'react-native';

import { InternalFlowText, type FlowTextProps } from './FlowText';

const WIDTH_TOLERANCE = 2;
const DEFAULT_FONT_SIZE = 14;

export type AdaptiveReflowReason = 'too-many-lines' | 'too-wide' | 'invalid-geometry';

export type AdaptiveReflowGeometry = {
  reason: AdaptiveReflowReason;
  lineCount: number;
  widestLineWidth: number;
  availableWidth: number;
  effectiveScaledFloor: number;
};

export type AdaptiveLineAnalysis = {
  needsReflow: boolean;
  reason?: AdaptiveReflowReason;
  lineCount: number;
  widestLineWidth: number;
};

export type AdaptiveLabelProps = Omit<FlowTextProps, 'adjustsFontSizeToFit' | 'minimumFontScale'> & {
  availableWidth: number;
  compactLineLimit?: number;
  minimumScaleRatio?: number;
  baseFontSize?: number;
  onReflowNeeded?: (geometry: AdaptiveReflowGeometry) => void;
};

function clampScaleRatio(ratio: number): number {
  if (!Number.isFinite(ratio)) return 0.8;
  return Math.min(1, Math.max(0.8, ratio));
}

function finitePositive(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function saturatingMultiply(left: number, right: number): number {
  return left > Number.MAX_VALUE / right ? Number.MAX_VALUE : left * right;
}

function saturatingAdd(left: number, right: number): number {
  return left > Number.MAX_VALUE - right ? Number.MAX_VALUE : left + right;
}

function runInOrder(first: () => void, second: () => void): void {
  let firstError: unknown;
  let failed = false;
  try { first(); } catch (error) { firstError = error; failed = true; }
  try { second(); } catch (error) { if (!failed) { firstError = error; failed = true; } }
  if (failed) throw firstError;
}

export function computeEffectiveScaledFloor(
  baseFontSize: number,
  systemFontScale: number,
  minimumScaleRatio: number,
): number {
  const safeBaseFontSize = finitePositive(baseFontSize, DEFAULT_FONT_SIZE);
  const safeScaleMultiplier = saturatingMultiply(
    finitePositive(systemFontScale, 1),
    clampScaleRatio(minimumScaleRatio),
  );
  return saturatingMultiply(safeBaseFontSize, safeScaleMultiplier);
}

export function analyzeAdaptiveLines(
  lines: readonly Pick<TextLayoutLine, 'width'>[],
  availableWidth: number,
  compactLineLimit: number,
  tolerance = WIDTH_TOLERANCE,
): AdaptiveLineAnalysis {
  const widths = lines.map(({ width }) => width);
  const valid = Number.isFinite(availableWidth) && availableWidth > 0
    && Number.isSafeInteger(compactLineLimit) && compactLineLimit > 0
    && Number.isFinite(tolerance) && tolerance >= 0
    && lines.length > 0
    && widths.every((width) => Number.isFinite(width) && width >= 0);
  const widestLineWidth = widths.length > 0 && widths.every(Number.isFinite)
    ? Math.max(0, ...widths)
    : 0;
  if (!valid) {
    return { needsReflow: true, reason: 'invalid-geometry', lineCount: lines.length, widestLineWidth };
  }
  if (lines.length > compactLineLimit) {
    return { needsReflow: true, reason: 'too-many-lines', lineCount: lines.length, widestLineWidth };
  }
  if (widestLineWidth > saturatingAdd(availableWidth, tolerance)) {
    return { needsReflow: true, reason: 'too-wide', lineCount: lines.length, widestLineWidth };
  }
  return { needsReflow: false, lineCount: lines.length, widestLineWidth };
}

export const AdaptiveLabel = forwardRef<Text, AdaptiveLabelProps>(function AdaptiveLabel(
  {
    availableWidth,
    compactLineLimit = 1,
    minimumScaleRatio = 0.8,
    baseFontSize,
    onReflowNeeded,
    onTextLayout,
    style,
    ...flowProps
  },
  ref,
) {
  const { fontScale } = useWindowDimensions();
  const flattenedStyle = StyleSheet.flatten(style);
  const styledFontSize = typeof flattenedStyle?.fontSize === 'number'
    ? flattenedStyle.fontSize
    : DEFAULT_FONT_SIZE;
  const resolvedBaseFontSize = finitePositive(baseFontSize ?? styledFontSize, DEFAULT_FONT_SIZE);
  const effectiveScaledFloor = computeEffectiveScaledFloor(
    resolvedBaseFontSize,
    fontScale,
    minimumScaleRatio,
  );
  const needsReflowRef = useRef(false);
  const callbackRef = useRef(onReflowNeeded);
  callbackRef.current = onReflowNeeded;

  const handleTextLayout = useCallback((event: NativeSyntheticEvent<TextLayoutEventData>) => {
    runInOrder(() => {
      const analysis = analyzeAdaptiveLines(event.nativeEvent.lines, availableWidth, compactLineLimit);
      if (!analysis.needsReflow) {
        needsReflowRef.current = false;
        return;
      }
      if (needsReflowRef.current) return;
      needsReflowRef.current = true;
      callbackRef.current?.({
        reason: analysis.reason ?? 'invalid-geometry',
        lineCount: analysis.lineCount,
        widestLineWidth: analysis.widestLineWidth,
        availableWidth: Number.isFinite(availableWidth) && availableWidth > 0 ? availableWidth : 0,
        effectiveScaledFloor,
      });
    }, () => onTextLayout?.(event));
  }, [availableWidth, compactLineLimit, effectiveScaledFloor, onTextLayout]);

  return (
    <InternalFlowText
      {...flowProps}
      ref={ref}
      semanticMode="adaptive"
      style={style}
      onTextLayout={handleTextLayout}
    />
  );
});
