import type { PlanExerciseBlock } from './personal_plan_engine_contracts';
import {
  validatePlanAudioAsset,
  type PlanAudioAsset,
  type PlanAudioAssetIssueCode,
  type PlanAudioAssetStatus,
} from './personal_plan_audio_asset_readiness';

export type PlanListeningExerciseType = 'plan_listen_choose' | 'plan_listen_build';

export type PlanAudioRequirementManifestItem = {
  blockId: string;
  exerciseType: PlanListeningExerciseType;
  contentUnitIds: string[];
  targetText: string;
  targetTextsByContentUnitId?: Record<string, string>;
  assetStatus: PlanAudioAssetStatus | 'missing';
  validForAuthoring: boolean;
  productionReady: boolean;
  issueCodes: PlanAudioAssetIssueCode[];
  assetId?: string;
  uri?: string;
};

export type PlanAudioRequirementManifestSummary = {
  totalListeningBlocks: number;
  approved: number;
  placeholder: number;
  generated: number;
  missing: number;
  invalid: number;
  productionReady: number;
  productionBlocked: number;
};

export type BuildPlanAudioRequirementManifestInput = {
  blocks: PlanExerciseBlock[];
  audioRequirementsByBlockId: Record<string, PlanAudioAsset | undefined>;
  targetTextsByContentUnitId?: Record<string, string>;
};

export type PlanAudioRequirementManifest = {
  productionReady: boolean;
  items: PlanAudioRequirementManifestItem[];
  summary: PlanAudioRequirementManifestSummary;
};

function isListeningBlock(block: PlanExerciseBlock): block is PlanExerciseBlock & { type: PlanListeningExerciseType } {
  return block.type === 'plan_listen_choose' || block.type === 'plan_listen_build';
}

function compactStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function targetTextForAsset(asset: PlanAudioAsset | undefined): string {
  return asset?.targetText?.trim() ?? '';
}

function manifestItemForBlock(
  block: PlanExerciseBlock & { type: PlanListeningExerciseType },
  asset: PlanAudioAsset | undefined,
  targetTextsByContentUnitId: Record<string, string> = {},
): PlanAudioRequirementManifestItem {
  const readiness = validatePlanAudioAsset(asset);
  const issueCodes = readiness.issues.map((issue) => issue.code);
  const contentUnitIds = compactStrings(asset?.contentUnitIds ?? block.contentUnitIds);
  const targetTextMap = Object.fromEntries(
    contentUnitIds
      .map((contentUnitId) => [contentUnitId, targetTextsByContentUnitId[contentUnitId]?.trim() ?? ''] as const)
      .filter(([, text]) => text.length > 0),
  );

  return {
    blockId: block.id,
    exerciseType: block.type,
    contentUnitIds,
    targetText: targetTextForAsset(asset),
    ...(Object.keys(targetTextMap).length > 0 ? { targetTextsByContentUnitId: targetTextMap } : {}),
    assetStatus: asset?.status ?? 'missing',
    validForAuthoring: readiness.validForAuthoring,
    productionReady: readiness.productionReady,
    issueCodes,
    assetId: asset?.assetId,
    uri: asset?.uri,
  };
}

function emptySummary(): PlanAudioRequirementManifestSummary {
  return {
    totalListeningBlocks: 0,
    approved: 0,
    placeholder: 0,
    generated: 0,
    missing: 0,
    invalid: 0,
    productionReady: 0,
    productionBlocked: 0,
  };
}

function summarize(items: PlanAudioRequirementManifestItem[]): PlanAudioRequirementManifestSummary {
  const summary = emptySummary();
  summary.totalListeningBlocks = items.length;

  for (const item of items) {
    if (item.assetStatus === 'approved') summary.approved += 1;
    if (item.assetStatus === 'placeholder') summary.placeholder += 1;
    if (item.assetStatus === 'generated') summary.generated += 1;
    if (item.assetStatus === 'missing') summary.missing += 1;
    if (!item.validForAuthoring || item.issueCodes.length > 0) summary.invalid += 1;
    if (item.productionReady) summary.productionReady += 1;
    else summary.productionBlocked += 1;
  }

  return summary;
}

export function buildPlanAudioRequirementManifest(
  input: BuildPlanAudioRequirementManifestInput,
): PlanAudioRequirementManifest {
  const items = input.blocks
    .filter(isListeningBlock)
    .map((block) => manifestItemForBlock(
      block,
      input.audioRequirementsByBlockId[block.id],
      input.targetTextsByContentUnitId,
    ));
  const summary = summarize(items);

  return {
    productionReady: items.length > 0 && summary.productionBlocked === 0,
    items,
    summary,
  };
}
