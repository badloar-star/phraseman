import type { Lang } from '../../constants/i18n';

export type TextProvenance = 'authored' | 'user' | 'external';
export type TextSemanticMode = 'flow' | 'adaptive' | 'scroll' | 'expand';

export type Rect = { x: number; y: number; width: number; height: number };

export type IntrinsicTextMetrics = {
  height: number;
  maxLineWidth: number;
  lineCount: number;
  visibleLineCount: number;
  hasNativeTruncation: boolean;
};

export type TextIntegrityMeasurement = {
  route: string;
  testID: string;
  locale: Lang;
  window: { width: number; height: number };
  fontScale: number;
  semanticMode: TextSemanticMode;
  provenance: TextProvenance;
  rawText?: string;
  intrinsicText: IntrinsicTextMetrics;
  hostBounds?: Rect;
  viewport: Rect;
  safeAreaViewport: Rect;
  actionBounds?: Rect;
};

export type TextIntegrityViolationKind =
  | 'local-clipping'
  | 'native-truncation'
  | 'off-screen-host'
  | 'off-screen-action'
  | 'invalid-geometry';

export type TextIntegrityViolation = {
  kind: TextIntegrityViolationKind;
  route: string;
  testID: string;
  locale: Lang;
  window: { width: number; height: number };
  fontScale: number;
  semanticMode: TextSemanticMode;
  provenance: TextProvenance;
  contentLength: number;
  contentHash?: string;
  intrinsicText: IntrinsicTextMetrics;
  hostBounds?: Rect;
  viewport: Rect;
  safeAreaViewport: Rect;
  actionBounds?: Rect;
  invalidFields?: readonly string[];
};
