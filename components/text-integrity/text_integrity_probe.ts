import {
  createFreshTextIntegritySalt,
  sha256TextIntegrityContent,
  type TextIntegrityHasher,
} from './text_integrity_hash';
import type {
  IntrinsicTextMetrics,
  Rect,
  TextIntegrityMeasurement,
  TextIntegrityViolation,
  TextIntegrityViolationKind,
} from './types';

const DEFAULT_TOLERANCE = 1;
const MAX_VIOLATIONS = 200;

export type TextIntegrityProbeSession = {
  inspect(
    measurement: TextIntegrityMeasurement,
    shouldCommit?: () => boolean,
  ): Promise<readonly TextIntegrityViolation[]>;
  read(): TextIntegrityViolation[];
  clear(): void;
};

export type TextIntegrityProbeOptions = {
  devEnabled?: boolean;
  salt?: string;
  hasher?: TextIntegrityHasher;
  tolerance?: number;
};

export type TextIntegrityRequest = { requestId: number; isLatest: () => boolean };
export type TextIntegrityRequestCoordinator = {
  begin(): TextIntegrityRequest;
  invalidate(): void;
};

type NativeLineMetric = { width: number; height: number; isTruncated?: boolean };
type NativeTextLayoutLine = NativeLineMetric & { text: string };
type SafeAreaInsets = { top: number; right: number; bottom: number; left: number };

export function convertNativeLinesToIntrinsicMetrics(
  lines: readonly NativeLineMetric[],
  visibleLineCount = lines.length,
  hasNativeTruncation = lines.some((line) => line.isTruncated === true),
): IntrinsicTextMetrics {
  return {
    height: lines.reduce((total, line) => total + line.height, 0),
    maxLineWidth: lines.reduce((maximum, line) => Math.max(maximum, line.width), 0),
    lineCount: lines.length,
    visibleLineCount,
    hasNativeTruncation,
  };
}

function normalizeTextForLayoutComparison(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/gu, ' ');
}

export function convertTextLayoutLinesToIntrinsicMetrics(
  lines: readonly NativeTextLayoutLine[],
  expectedText: string,
): IntrinsicTextMetrics {
  const expected = normalizeTextForLayoutComparison(expectedText);
  const renderedLines = lines.map((line) => normalizeTextForLayoutComparison(line.text));
  const renderedCandidates = new Set([
    renderedLines.join(''),
    renderedLines.join(' '),
  ]);
  const hasNativeTruncation = !renderedCandidates.has(expected);
  return convertNativeLinesToIntrinsicMetrics(lines, lines.length, hasNativeTruncation);
}

export function createTextIntegrityRequestCoordinator(): TextIntegrityRequestCoordinator {
  let latestRequestId = 0;
  return {
    begin() {
      latestRequestId += 1;
      const requestId = latestRequestId;
      return { requestId, isLatest: () => requestId === latestRequestId };
    },
    invalidate() {
      latestRequestId += 1;
    },
  };
}

export function buildSafeAreaViewport(
  window: { width: number; height: number },
  insets: SafeAreaInsets,
): Rect {
  return {
    x: insets.left,
    y: insets.top,
    width: Math.max(0, window.width - insets.left - insets.right),
    height: Math.max(0, window.height - insets.top - insets.bottom),
  };
}

function isContained(rect: Rect, viewport: Rect, tolerance: number): boolean {
  return rect.x >= viewport.x - tolerance
    && rect.y >= viewport.y - tolerance
    && rect.x + rect.width <= viewport.x + viewport.width + tolerance
    && rect.y + rect.height <= viewport.y + viewport.height + tolerance;
}

function isFiniteNonnegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function invalidRectFields(rect: Rect, prefix: string): string[] {
  const invalid: string[] = [];
  if (!Number.isFinite(rect.x)) invalid.push(`${prefix}.x`);
  if (!Number.isFinite(rect.y)) invalid.push(`${prefix}.y`);
  if (!isFiniteNonnegative(rect.width)) invalid.push(`${prefix}.width`);
  if (!isFiniteNonnegative(rect.height)) invalid.push(`${prefix}.height`);
  return invalid;
}

function invalidMeasurementFields(measurement: TextIntegrityMeasurement): string[] {
  const invalid: string[] = [];
  if (!isFiniteNonnegative(measurement.window.width)) invalid.push('window.width');
  if (!isFiniteNonnegative(measurement.window.height)) invalid.push('window.height');
  if (!isFiniteNonnegative(measurement.fontScale)) invalid.push('fontScale');
  invalid.push(...invalidRectFields(measurement.viewport, 'viewport'));
  invalid.push(...invalidRectFields(measurement.safeAreaViewport, 'safeAreaViewport'));
  if (measurement.hostBounds) invalid.push(...invalidRectFields(measurement.hostBounds, 'hostBounds'));
  if (measurement.actionBounds) invalid.push(...invalidRectFields(measurement.actionBounds, 'actionBounds'));
  const metrics = measurement.intrinsicText;
  if (!isFiniteNonnegative(metrics.height)) invalid.push('intrinsicText.height');
  if (!isFiniteNonnegative(metrics.maxLineWidth)) invalid.push('intrinsicText.maxLineWidth');
  if (!Number.isSafeInteger(metrics.lineCount) || metrics.lineCount < 0) invalid.push('intrinsicText.lineCount');
  if (!Number.isSafeInteger(metrics.visibleLineCount) || metrics.visibleLineCount < 0) {
    invalid.push('intrinsicText.visibleLineCount');
  } else if (
    Number.isSafeInteger(metrics.lineCount)
    && metrics.lineCount >= 0
    && metrics.visibleLineCount > metrics.lineCount
  ) {
    invalid.push('intrinsicText.visibleLineCount');
  }
  return invalid;
}

function sanitizedNumber(value: number): number {
  return isFiniteNonnegative(value) ? value : 0;
}

function sanitizedRect(rect: Rect): Rect {
  return {
    x: Number.isFinite(rect.x) ? rect.x : 0,
    y: Number.isFinite(rect.y) ? rect.y : 0,
    width: sanitizedNumber(rect.width),
    height: sanitizedNumber(rect.height),
  };
}

function isValidRect(rect: Rect): boolean {
  return invalidRectFields(rect, 'rect').length === 0;
}

function violationKinds(measurement: TextIntegrityMeasurement, tolerance: number): TextIntegrityViolationKind[] {
  const kinds: TextIntegrityViolationKind[] = [];
  const { intrinsicText, hostBounds, actionBounds, safeAreaViewport } = measurement;
  if (hostBounds && (
    intrinsicText.height > hostBounds.height + tolerance
    || intrinsicText.maxLineWidth > hostBounds.width + tolerance
  )) kinds.push('local-clipping');
  if (intrinsicText.hasNativeTruncation || intrinsicText.visibleLineCount < intrinsicText.lineCount) {
    kinds.push('native-truncation');
  }
  if (hostBounds && !isContained(hostBounds, safeAreaViewport, tolerance)) kinds.push('off-screen-host');
  if (actionBounds && !isContained(actionBounds, safeAreaViewport, tolerance)) kinds.push('off-screen-action');
  return kinds;
}

function dedupKey(violation: TextIntegrityViolation): string {
  return JSON.stringify([
    violation.kind, violation.route, violation.testID, violation.locale, violation.window,
    violation.fontScale, violation.semanticMode, violation.provenance, violation.contentLength,
    violation.contentHash, violation.intrinsicText, violation.hostBounds,
    violation.viewport, violation.safeAreaViewport, violation.actionBounds, violation.invalidFields,
  ]);
}

export function createTextIntegrityProbeSession(
  options: TextIntegrityProbeOptions = {},
): TextIntegrityProbeSession {
  if (options.tolerance !== undefined && !isFiniteNonnegative(options.tolerance)) {
    throw new Error('TEXT_INTEGRITY_INVALID_TOLERANCE');
  }
  const enabled = options.devEnabled ?? true;
  const salt = options.salt ?? createFreshTextIntegritySalt();
  const hasher = options.hasher ?? sha256TextIntegrityContent;
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;
  const violations: TextIntegrityViolation[] = [];
  const keys = new Set<string>();

  return {
    async inspect(measurement, shouldCommit = () => true) {
      if (!enabled) return [];
      const invalidFields = invalidMeasurementFields(measurement);
      const kinds: TextIntegrityViolationKind[] = invalidFields.length > 0
        ? ['invalid-geometry']
        : violationKinds(measurement, tolerance);
      if (kinds.length === 0) return [];
      if (!shouldCommit()) return [];
      let contentHash: string | undefined;
      try {
        contentHash = await hasher(`${salt}\u0000${measurement.rawText}`);
      } catch {
        contentHash = undefined;
      }
      if (!shouldCommit()) return [];
      const fresh: TextIntegrityViolation[] = [];
      for (const kind of kinds) {
        const violation: TextIntegrityViolation = {
          kind,
          route: measurement.route,
          testID: measurement.testID,
          locale: measurement.locale,
          window: {
            width: sanitizedNumber(measurement.window.width),
            height: sanitizedNumber(measurement.window.height),
          },
          fontScale: sanitizedNumber(measurement.fontScale),
          semanticMode: measurement.semanticMode,
          provenance: measurement.provenance,
          contentLength: measurement.rawText.length,
          ...(contentHash ? { contentHash } : {}),
          intrinsicText: {
            ...measurement.intrinsicText,
            height: sanitizedNumber(measurement.intrinsicText.height),
            maxLineWidth: sanitizedNumber(measurement.intrinsicText.maxLineWidth),
            lineCount: Number.isSafeInteger(measurement.intrinsicText.lineCount)
              && measurement.intrinsicText.lineCount >= 0 ? measurement.intrinsicText.lineCount : 0,
            visibleLineCount: Number.isSafeInteger(measurement.intrinsicText.visibleLineCount)
              && measurement.intrinsicText.visibleLineCount >= 0
              && measurement.intrinsicText.visibleLineCount <= measurement.intrinsicText.lineCount
              ? measurement.intrinsicText.visibleLineCount : 0,
          },
          ...(measurement.hostBounds && isValidRect(measurement.hostBounds)
            ? { hostBounds: { ...measurement.hostBounds } } : {}),
          viewport: sanitizedRect(measurement.viewport),
          safeAreaViewport: sanitizedRect(measurement.safeAreaViewport),
          ...(measurement.actionBounds && isValidRect(measurement.actionBounds)
            ? { actionBounds: { ...measurement.actionBounds } } : {}),
          ...(invalidFields.length > 0 ? { invalidFields: [...invalidFields] } : {}),
        };
        const key = dedupKey(violation);
        if (!shouldCommit()) return fresh;
        if (keys.has(key)) continue;
        violations.push(violation);
        keys.add(key);
        fresh.push({ ...violation });
        if (violations.length > MAX_VIOLATIONS) {
          const removed = violations.shift();
          if (removed) keys.delete(dedupKey(removed));
        }
      }
      return fresh;
    },
    read: () => violations.map((violation) => ({
      ...violation,
      window: { ...violation.window },
      intrinsicText: { ...violation.intrinsicText },
      ...(violation.hostBounds ? { hostBounds: { ...violation.hostBounds } } : {}),
      viewport: { ...violation.viewport },
      safeAreaViewport: { ...violation.safeAreaViewport },
      ...(violation.actionBounds ? { actionBounds: { ...violation.actionBounds } } : {}),
      ...(violation.invalidFields ? { invalidFields: [...violation.invalidFields] } : {}),
    })),
    clear() {
      violations.length = 0;
      keys.clear();
    },
  };
}
