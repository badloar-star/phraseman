import {
  validateAcceptedCandidateContentPacketImportFormat,
  validateGeneratedContentImportFormat,
  type AcceptedCandidateContentPacketImportFormat,
  type GeneratedContentImportFormat,
} from './personal_plan_generation_import_format';

export type RuntimeSourceGuardFamily =
  | 'catalog_source'
  | 'route_source'
  | 'ui_surface'
  | 'storage_contract'
  | 'asset_registry'
  | 'test_fixture_source';

export type RuntimeSourceGuardFamilyRow = {
  family: RuntimeSourceGuardFamily;
  status: 'blocked_until_integration_pass';
  reason: string;
};

export type RuntimeSourceWriteGuard = {
  kind: 'personal_plan_generation_runtime_source_write_guard';
  status: 'hold_before_integration_pass';
  importFormatStatus: 'valid_non_live_import_format' | 'invalid';
  guardedFamilies: RuntimeSourceGuardFamilyRow[];
  sourceRuntimeWriteAllowed: false;
  liveRegistrationAllowed: false;
  generatedContentCreationAllowed: false;
  productionReady: false;
  integrationPassRequired: true;
  nextRequiredStep: 'plan_specific_generation_prompts';
};

export type RuntimeSourceWriteGuardIssueCode =
  | 'import_format_not_valid'
  | 'missing_guarded_family'
  | 'guarded_family_not_blocked'
  | 'source_runtime_write_not_allowed'
  | 'live_registration_not_allowed'
  | 'generated_content_creation_not_allowed'
  | 'production_ready_not_allowed';

export type RuntimeSourceWriteGuardValidation = {
  status: 'valid_hold_guard' | 'invalid';
  issueCodes: RuntimeSourceWriteGuardIssueCode[];
  guardedFamilyCount: number;
  sourceRuntimeWriteAllowed: false;
  liveRegistrationAllowed: false;
  nextRequiredStep: 'plan_specific_generation_prompts';
};

export type AcceptedCandidateRuntimeSourceGuardFamilyRow = {
  family: RuntimeSourceGuardFamily;
  status: 'blocked_until_explicit_integration_plan';
  reason: string;
};

export type AcceptedCandidateRuntimeSourceWriteGuard = {
  kind: 'personal_plan_accepted_candidate_runtime_source_write_guard';
  status: 'hold_before_integration_pass';
  importFormatStatus: 'valid_non_live_content_packet_import_format' | 'invalid';
  totalCandidateDays: number;
  importDayCount: number;
  guardedFamilies: AcceptedCandidateRuntimeSourceGuardFamilyRow[];
  sourceRuntimeWriteAllowed: false;
  liveRegistrationAllowed: false;
  generatedContentCreationAllowed: false;
  productionReady: false;
  integrationPassRequired: true;
  nextRequiredStep: 'explicit_integration_plan';
};

export type AcceptedCandidateRuntimeSourceWriteGuardIssueCode =
  | 'import_format_not_valid'
  | 'missing_guarded_family'
  | 'guarded_family_not_blocked'
  | 'source_runtime_write_not_allowed'
  | 'live_registration_not_allowed'
  | 'generated_content_creation_not_allowed'
  | 'production_ready_not_allowed';

export type AcceptedCandidateRuntimeSourceWriteGuardValidation = {
  status: 'valid_non_live_runtime_source_write_guard' | 'invalid';
  issueCodes: AcceptedCandidateRuntimeSourceWriteGuardIssueCode[];
  totalCandidateDays: number;
  importDayCount: number;
  guardedFamilyCount: number;
  sourceRuntimeWriteAllowed: false;
  liveRegistrationAllowed: false;
  nextRequiredStep: 'explicit_integration_plan';
};

const REQUIRED_FAMILIES: RuntimeSourceGuardFamily[] = [
  'catalog_source',
  'route_source',
  'ui_surface',
  'storage_contract',
  'asset_registry',
  'test_fixture_source',
];

const FAMILY_REASONS: Record<RuntimeSourceGuardFamily, string> = {
  catalog_source: 'Generated import format cannot edit Personal Plan catalog source.',
  route_source: 'Generated import format cannot register routes or navigation source.',
  ui_surface: 'Generated import format cannot alter visible UI surfaces.',
  storage_contract: 'Generated import format cannot change persisted state contracts.',
  asset_registry: 'Generated import format cannot register audio, image, or generated assets as live.',
  test_fixture_source: 'Generated import format cannot rewrite tests or fixtures as a side effect.',
};

const ACCEPTED_CANDIDATE_FAMILY_REASONS: Record<RuntimeSourceGuardFamily, string> = {
  catalog_source: 'Accepted candidate import format cannot edit Personal Plan catalog source without an explicit integration plan.',
  route_source: 'Accepted candidate import format cannot register routes or navigation source without an explicit integration plan.',
  ui_surface: 'Accepted candidate import format cannot alter visible UI surfaces without an explicit integration plan.',
  storage_contract: 'Accepted candidate import format cannot change persisted state contracts without an explicit integration plan.',
  asset_registry: 'Accepted candidate import format cannot register audio, image, or generated assets as live without an explicit integration plan.',
  test_fixture_source: 'Accepted candidate import format cannot rewrite tests or fixtures as a side effect of import-format validation.',
};

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function buildRuntimeSourceWriteGuard(
  format: GeneratedContentImportFormat,
): RuntimeSourceWriteGuard {
  const validation = validateGeneratedContentImportFormat(format);

  return {
    kind: 'personal_plan_generation_runtime_source_write_guard',
    status: 'hold_before_integration_pass',
    importFormatStatus: validation.status,
    guardedFamilies: REQUIRED_FAMILIES.map((family) => ({
      family,
      status: 'blocked_until_integration_pass',
      reason: FAMILY_REASONS[family],
    })),
    sourceRuntimeWriteAllowed: false,
    liveRegistrationAllowed: false,
    generatedContentCreationAllowed: false,
    productionReady: false,
    integrationPassRequired: true,
    nextRequiredStep: 'plan_specific_generation_prompts',
  };
}

export function validateRuntimeSourceWriteGuard(
  guard: RuntimeSourceWriteGuard,
): RuntimeSourceWriteGuardValidation {
  const issueCodes: RuntimeSourceWriteGuardIssueCode[] = [];

  if (guard.importFormatStatus !== 'valid_non_live_import_format') {
    issueCodes.push('import_format_not_valid');
  }
  if ((guard as { sourceRuntimeWriteAllowed?: boolean }).sourceRuntimeWriteAllowed) {
    issueCodes.push('source_runtime_write_not_allowed');
  }
  if ((guard as { liveRegistrationAllowed?: boolean }).liveRegistrationAllowed) {
    issueCodes.push('live_registration_not_allowed');
  }
  if ((guard as { generatedContentCreationAllowed?: boolean }).generatedContentCreationAllowed) {
    issueCodes.push('generated_content_creation_not_allowed');
  }
  if ((guard as { productionReady?: boolean }).productionReady) {
    issueCodes.push('production_ready_not_allowed');
  }

  const familySet = new Set(guard.guardedFamilies.map((row) => row.family));
  for (const family of REQUIRED_FAMILIES) {
    if (!familySet.has(family)) {
      issueCodes.push('missing_guarded_family');
    }
  }

  for (const row of guard.guardedFamilies) {
    if (row.status !== 'blocked_until_integration_pass') {
      issueCodes.push('guarded_family_not_blocked');
    }
  }

  const uniqueCodes = unique(issueCodes);

  return {
    status: uniqueCodes.length === 0 ? 'valid_hold_guard' : 'invalid',
    issueCodes: uniqueCodes,
    guardedFamilyCount: guard.guardedFamilies.length,
    sourceRuntimeWriteAllowed: false,
    liveRegistrationAllowed: false,
    nextRequiredStep: 'plan_specific_generation_prompts',
  };
}

export function buildAcceptedCandidateRuntimeSourceWriteGuard(
  format: AcceptedCandidateContentPacketImportFormat,
): AcceptedCandidateRuntimeSourceWriteGuard {
  const validation = validateAcceptedCandidateContentPacketImportFormat(format);

  return {
    kind: 'personal_plan_accepted_candidate_runtime_source_write_guard',
    status: 'hold_before_integration_pass',
    importFormatStatus: validation.status,
    totalCandidateDays: validation.totalCandidateDays,
    importDayCount: validation.importDayCount,
    guardedFamilies: REQUIRED_FAMILIES.map((family) => ({
      family,
      status: 'blocked_until_explicit_integration_plan',
      reason: ACCEPTED_CANDIDATE_FAMILY_REASONS[family],
    })),
    sourceRuntimeWriteAllowed: false,
    liveRegistrationAllowed: false,
    generatedContentCreationAllowed: false,
    productionReady: false,
    integrationPassRequired: true,
    nextRequiredStep: 'explicit_integration_plan',
  };
}

export function validateAcceptedCandidateRuntimeSourceWriteGuard(
  guard: AcceptedCandidateRuntimeSourceWriteGuard,
): AcceptedCandidateRuntimeSourceWriteGuardValidation {
  const issueCodes: AcceptedCandidateRuntimeSourceWriteGuardIssueCode[] = [];

  if (guard.importFormatStatus !== 'valid_non_live_content_packet_import_format') {
    issueCodes.push('import_format_not_valid');
  }
  if ((guard as { sourceRuntimeWriteAllowed?: boolean }).sourceRuntimeWriteAllowed) {
    issueCodes.push('source_runtime_write_not_allowed');
  }
  if ((guard as { liveRegistrationAllowed?: boolean }).liveRegistrationAllowed) {
    issueCodes.push('live_registration_not_allowed');
  }
  if ((guard as { generatedContentCreationAllowed?: boolean }).generatedContentCreationAllowed) {
    issueCodes.push('generated_content_creation_not_allowed');
  }
  if ((guard as { productionReady?: boolean }).productionReady) {
    issueCodes.push('production_ready_not_allowed');
  }

  const familySet = new Set(guard.guardedFamilies.map((row) => row.family));
  for (const family of REQUIRED_FAMILIES) {
    if (!familySet.has(family)) {
      issueCodes.push('missing_guarded_family');
    }
  }

  for (const row of guard.guardedFamilies) {
    if (row.status !== 'blocked_until_explicit_integration_plan') {
      issueCodes.push('guarded_family_not_blocked');
    }
  }

  const uniqueCodes = unique(issueCodes);
  return {
    status: uniqueCodes.length === 0 ? 'valid_non_live_runtime_source_write_guard' : 'invalid',
    issueCodes: uniqueCodes,
    totalCandidateDays: guard.totalCandidateDays,
    importDayCount: guard.importDayCount,
    guardedFamilyCount: guard.guardedFamilies.length,
    sourceRuntimeWriteAllowed: false,
    liveRegistrationAllowed: false,
    nextRequiredStep: 'explicit_integration_plan',
  };
}
