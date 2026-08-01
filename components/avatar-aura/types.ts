import type { ReactNode } from 'react';

export type AuraLabId =
  | 'opal-nimbus'
  | 'solar-crown'
  | 'velvet-bloom'
  | 'jade-tide'
  | 'rose-satin';

export type AuraMaterial = 'nimbus' | 'crown' | 'velvet' | 'jade' | 'satin';

export type AuraDetail = 'hero' | 'thumbnail';
export type AuraMotion = 'ambient' | 'static';

export interface AuraPreset {
  readonly id: AuraLabId;
  readonly nameRu: string;
  readonly descriptionRu: string;
  readonly colors: readonly [string, string, string];
  readonly staticPhase: 0 | 1;
  readonly material: AuraMaterial;
  readonly durationMs: number;
  readonly motion: {
    readonly outerDegrees: number;
    readonly innerDegrees: number;
    readonly outerScale: number;
  };
}

export interface AuraRendererProps {
  preset: AuraPreset;
  size: number;
  detail?: AuraDetail;
  motion?: AuraMotion;
  ownerVisible?: boolean;
  children?: ReactNode;
}

export interface AuraSvgIds {
  readonly spectral: string;
  readonly core: string;
  readonly edge: string;
}
