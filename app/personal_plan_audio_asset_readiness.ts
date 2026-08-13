export type PlanAudioAssetStatus =
  | 'placeholder'
  | 'requested'
  | 'generated'
  | 'approved'
  | 'failed';

export type PlanAudioAssetProvider = 'openai' | 'manual' | 'store' | 'unknown';

export type PlanAudioAsset = {
  id: string;
  blockId: string;
  contentUnitIds: string[];
  targetText: string;
  locale: 'en';
  status: PlanAudioAssetStatus;
  assetId?: string;
  uri?: string;
  durationMs?: number;
  voiceId?: string;
  provider?: PlanAudioAssetProvider;
  finalAssetReady?: boolean;
  failureReason?: string;
};

export type PlanAudioAssetIssueCode =
  | 'missing_audio_asset'
  | 'missing_audio_block_id'
  | 'missing_audio_content_units'
  | 'missing_audio_text'
  | 'missing_audio_asset_id'
  | 'missing_audio_uri'
  | 'invalid_audio_duration'
  | 'missing_audio_voice'
  | 'missing_audio_provider'
  | 'approved_audio_not_marked_final'
  | 'fake_final_audio_claim'
  | 'failed_audio_asset_without_reason';

export type PlanAudioAssetIssue = {
  code: PlanAudioAssetIssueCode;
  blockId?: string;
  assetId?: string;
  detail: string;
};

export type PlanAudioAssetReadinessResult = {
  validForAuthoring: boolean;
  productionReady: boolean;
  issues: PlanAudioAssetIssue[];
};

export type BuildPlaceholderPlanAudioAssetInput = {
  blockId: string;
  contentUnitIds: string[];
  targetText: string;
};

function compactStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function issue(
  code: PlanAudioAssetIssueCode,
  detail: string,
  asset?: PlanAudioAsset,
): PlanAudioAssetIssue {
  return {
    code,
    detail,
    blockId: asset?.blockId,
    assetId: asset?.assetId,
  };
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function needsFinalAssetMetadata(status: PlanAudioAssetStatus): boolean {
  return status === 'generated' || status === 'approved';
}

export function buildPlaceholderPlanAudioAsset(
  input: BuildPlaceholderPlanAudioAssetInput,
): PlanAudioAsset {
  return {
    id: `audio-placeholder:${input.blockId}`,
    blockId: input.blockId,
    contentUnitIds: compactStrings(input.contentUnitIds),
    targetText: input.targetText.trim(),
    locale: 'en',
    status: 'placeholder',
    provider: 'unknown',
    finalAssetReady: false,
  };
}

export function validatePlanAudioAsset(
  asset: PlanAudioAsset | undefined,
): PlanAudioAssetReadinessResult {
  const issues: PlanAudioAssetIssue[] = [];

  if (!asset) {
    return {
      validForAuthoring: false,
      productionReady: false,
      issues: [issue('missing_audio_asset', 'Listening tasks need an audio asset requirement.')],
    };
  }

  if (!hasText(asset.blockId)) {
    issues.push(issue(
      'missing_audio_block_id',
      'Audio asset requirement must point to the listening block.',
      asset,
    ));
  }

  if (compactStrings(asset.contentUnitIds).length === 0) {
    issues.push(issue(
      'missing_audio_content_units',
      'Audio asset requirement must list the content units it teaches.',
      asset,
    ));
  }

  if (!hasText(asset.targetText)) {
    issues.push(issue(
      'missing_audio_text',
      'Audio asset requirement must include the exact target text.',
      asset,
    ));
  }

  if (asset.finalAssetReady && asset.status !== 'approved') {
    issues.push(issue(
      'fake_final_audio_claim',
      'Only approved audio can be marked final.',
      asset,
    ));
  }

  if (asset.status === 'approved' && !asset.finalAssetReady) {
    issues.push(issue(
      'approved_audio_not_marked_final',
      'Approved audio must explicitly mark finalAssetReady.',
      asset,
    ));
  }

  if (asset.status === 'failed' && !hasText(asset.failureReason)) {
    issues.push(issue(
      'failed_audio_asset_without_reason',
      'Failed audio assets must explain why they failed.',
      asset,
    ));
  }

  if (needsFinalAssetMetadata(asset.status)) {
    if (!hasText(asset.assetId)) {
      issues.push(issue(
        'missing_audio_asset_id',
        'Generated or approved audio needs a stable asset id.',
        asset,
      ));
    }

    if (!hasText(asset.uri)) {
      issues.push(issue(
        'missing_audio_uri',
        'Generated or approved audio needs a playable asset uri.',
        asset,
      ));
    }

    if (!asset.durationMs || asset.durationMs <= 0) {
      issues.push(issue(
        'invalid_audio_duration',
        'Generated or approved audio needs a positive duration.',
        asset,
      ));
    }

    if (!hasText(asset.voiceId)) {
      issues.push(issue(
        'missing_audio_voice',
        'Generated or approved audio needs a voice id.',
        asset,
      ));
    }

    if (!asset.provider || asset.provider === 'unknown') {
      issues.push(issue(
        'missing_audio_provider',
        'Generated or approved audio needs a real provider.',
        asset,
      ));
    }
  }

  const validForAuthoring = issues.every((item) =>
    item.code !== 'missing_audio_asset' &&
    item.code !== 'missing_audio_block_id' &&
    item.code !== 'missing_audio_content_units' &&
    item.code !== 'missing_audio_text' &&
    item.code !== 'fake_final_audio_claim' &&
    item.code !== 'failed_audio_asset_without_reason',
  );

  return {
    validForAuthoring,
    productionReady: asset.status === 'approved' && issues.length === 0,
    issues,
  };
}
