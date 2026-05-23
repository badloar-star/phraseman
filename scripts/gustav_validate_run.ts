import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

type FindingSeverity = 'warning' | 'blocker';

type Finding = {
  severity: FindingSeverity;
  code: string;
  message: string;
  artifact?: string;
};

type Report = {
  schemaVersion: 'gustav-run-validator-report-v0';
  generatedAt: string;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  runDir: string;
  runId: string | null;
  status: 'PASS' | 'BLOCK';
  summary: {
    checks: number;
    blockers: number;
    warnings: number;
  };
  findings: Finding[];
  notes: string[];
};

type ValidationCounters = {
  checks: number;
};

const ALLOWED_MODES = new Set([
  'inventory',
  'source_graph',
  'english_audit',
  'architecture',
  'research',
  'curriculum',
  'agent_contract',
  'generate',
  'audit_generated',
  'apply_plan',
  'apply',
]);

const PRODUCT_ZONES = ['app', 'constants', 'scripts', 'tests', 'admin'];
const BLOCKED_NEXT_MODES = new Set(['generate', 'apply']);
const CLOUD_SYNC_ACTIONS = new Set([
  'keep_global',
  'map_to_target',
  'map_to_source_locale',
  'map_to_source_and_target',
  'drop_from_cloud',
  'block_unknown',
]);
const MIXED_PAYLOAD_FIELD_SCOPES = new Set([
  'global',
  'study_target',
  'source_locale',
  'source_locale_and_study_target',
  'mixed',
  'unknown',
]);
const ACHIEVEMENT_SCOPES = new Set(['global', 'study_target', 'mixed', 'unknown']);
const ACHIEVEMENT_MIGRATION_ACTIONS = new Set([
  'keep_global',
  'move_to_target',
  'split_or_policy_decision',
  'block_unknown',
]);
const LOCAL_CLOUD_DECISION_ACTIONS = new Set([
  'sync_under_target',
  'keep_local_target_scoped',
  'covered_by_existing_cloud_pattern',
  'block_unknown',
]);
const TARGET_KEY_DOMAINS = new Set([
  'study_target_model',
  'target_key_builder',
  'lesson_progress',
  'lesson_session_local',
  'lesson_rewards',
  'level_exams',
  'trainer_practice',
  'personal_practice',
  'achievements',
  'cloud_sync',
  'flashcards',
  'analytics_stats',
  'source_locale_preferences',
  'unknown_target_storage',
]);
const SURFACE_KINDS = new Set([
  'root_shell',
  'tab',
  'registered_stack',
  'route_like',
  'admin',
  'component',
  'hook',
  'service',
]);
const SURFACE_DOMAINS = new Set([
  'app_shell',
  'home_dashboard',
  'lesson_list',
  'lesson_menu',
  'lesson_runtime',
  'lesson_completion',
  'lesson_support',
  'quiz',
  'trainer_practice',
  'personal_practice',
  'flashcards',
  'achievements',
  'progress_stats',
  'cloud_sync',
  'settings_source_locale',
  'social_arena',
  'commerce_rewards',
  'admin_qa',
  'other',
]);
const REPORT_STATUSES = new Set(['PASS', 'HOLD', 'BLOCK']);
const RISK_LEVELS = new Set(['low', 'medium', 'high', 'blocker']);
const READINESS_DECISIONS = new Set(['GO', 'HOLD', 'BLOCK']);
const READINESS_BLOCKS = new Set(['generation', 'apply']);
const MIGRATION_ADAPTER_IDS = new Set([
  'production_study_target',
  'target_storage_key_builder',
  'legacy_english_compat',
  'lesson_progress_store',
  'lesson_session_store',
  'lesson_reward_idempotency',
  'level_exam_certificate_store',
  'quiz_progress_store',
  'trainer_practice_store',
  'personal_practice_store',
  'flashcards_target_store',
  'achievement_progress_store',
  'target_stats_store',
  'cloud_sync_target_buckets',
  'route_surface_integration',
  'raw_storage_guard',
]);
const MIGRATION_OWNER_AREAS = new Set([
  'study_target',
  'storage',
  'lesson',
  'quiz',
  'trainer',
  'personal_practice',
  'flashcards',
  'achievements',
  'stats',
  'cloud',
  'ui',
  'tests',
]);
const P1A_CORE_SLICE_FILES = [
  'app/study_target.ts',
  'app/target_storage_keys.ts',
  'tests/gustav_surface_target_switch.test.ts',
  'tests/gustav_target_storage_keys.test.ts',
] as const;

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function readJson<T>(filePath: string, findings: Finding[]): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch (error) {
    findings.push({
      severity: 'blocker',
      code: 'json_parse_failed',
      message: `${filePath}: ${(error as Error).message}`,
      artifact: filePath,
    });
    return null;
  }
}

function exists(filePath: string, findings: Finding[], code: string): boolean {
  if (fs.existsSync(filePath)) return true;
  findings.push({
    severity: 'blocker',
    code,
    message: `Missing required path: ${filePath}`,
    artifact: filePath,
  });
  return false;
}

function toArtifactPath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

function relativeArtifactPath(repoRoot: string, filePath: string): string {
  return toArtifactPath(path.relative(repoRoot, filePath));
}

function sha256File(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function sha256TextFileWithNormalizedNewlines(filePath: string): string {
  const normalized = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
}

function pushFinding(
  findings: Finding[],
  severity: FindingSeverity,
  code: string,
  message: string,
  artifact?: string,
): void {
  findings.push({ severity, code, message, artifact });
}

function isP1ACoreSlicePresent(repoRoot: string): boolean {
  return P1A_CORE_SLICE_FILES.every((file) => fs.existsSync(path.join(repoRoot, file)));
}

function shouldBlockP1APreApplyFilePresence(repoRoot: string, filePath: string): boolean {
  return !(P1A_CORE_SLICE_FILES as readonly string[]).includes(filePath) || !isP1ACoreSlicePresent(repoRoot);
}

function isInside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

function validateManifest(
  repoRoot: string,
  runDir: string,
  manifest: Record<string, unknown> | null,
  findings: Finding[],
): string | null {
  if (!manifest) return null;
  const runId = typeof manifest.runId === 'string' ? manifest.runId : null;
  const mode = typeof manifest.mode === 'string' ? manifest.mode : null;
  const folderRunId = path.basename(runDir);

  if (manifest.schemaVersion !== 'gustav-run-manifest-v0') {
    pushFinding(findings, 'blocker', 'manifest_schema_version', 'Manifest schemaVersion must be gustav-run-manifest-v0.');
  }
  if (!runId) {
    pushFinding(findings, 'blocker', 'manifest_run_id_missing', 'Manifest runId is missing or not a string.');
  } else if (runId !== folderRunId) {
    pushFinding(findings, 'blocker', 'manifest_run_id_mismatch', `Manifest runId ${runId} does not match folder ${folderRunId}.`);
  }
  if (!mode || !ALLOWED_MODES.has(mode)) {
    pushFinding(findings, 'blocker', 'manifest_mode_invalid', `Manifest mode is invalid: ${String(mode)}`);
  }
  if (mode !== 'apply' && manifest.productWritePermission !== false) {
    pushFinding(
      findings,
      'blocker',
      'product_write_permission_invalid',
      'productWritePermission must be false unless mode is apply.',
    );
  }

  const allowedWriteZones = Array.isArray(manifest.allowedWriteZones) ? manifest.allowedWriteZones : null;
  if (!allowedWriteZones) {
    pushFinding(findings, 'blocker', 'allowed_write_zones_missing', 'allowedWriteZones must be an array.');
  } else {
    for (const zone of allowedWriteZones) {
      if (typeof zone !== 'string') {
        pushFinding(findings, 'blocker', 'allowed_write_zone_invalid', 'allowedWriteZones entries must be strings.');
        continue;
      }
      const resolvedZone = path.resolve(repoRoot, zone);
      if (mode !== 'apply' && !isInside(runDir, resolvedZone)) {
        pushFinding(
          findings,
          'blocker',
          'allowed_write_zone_outside_run',
          `Allowed write zone is outside the run folder in non-apply mode: ${zone}`,
          zone,
        );
      }
    }
  }

  const forbiddenWriteZones = Array.isArray(manifest.forbiddenWriteZones) ? manifest.forbiddenWriteZones : [];
  if (mode !== 'apply') {
    for (const zone of PRODUCT_ZONES) {
      if (!forbiddenWriteZones.includes(zone)) {
        pushFinding(
          findings,
          'warning',
          'product_zone_not_explicitly_forbidden',
          `Non-apply run should explicitly forbid product zone: ${zone}`,
        );
      }
    }
  }

  const agents = Array.isArray(manifest.agents) ? manifest.agents : null;
  if (!agents) {
    pushFinding(findings, 'blocker', 'agents_missing', 'Manifest agents must be an array.');
  } else {
    for (const agent of agents) {
      if (!agent || typeof agent !== 'object') {
        pushFinding(findings, 'blocker', 'agent_invalid', 'Agent entry must be an object.');
        continue;
      }
      const entry = agent as Record<string, unknown>;
      const contractPath = typeof entry.contractPath === 'string' ? entry.contractPath : '';
      if (!contractPath) {
        pushFinding(findings, 'blocker', 'agent_contract_missing', 'Agent contractPath is required.');
      } else if (!fs.existsSync(path.resolve(repoRoot, contractPath))) {
        pushFinding(findings, 'blocker', 'agent_contract_not_found', `Agent contractPath does not exist: ${contractPath}`, contractPath);
      }
      const outputPath = typeof entry.outputPath === 'string' ? entry.outputPath : '';
      if (outputPath && !fs.existsSync(path.resolve(repoRoot, outputPath))) {
        pushFinding(findings, 'warning', 'agent_output_not_found', `Agent outputPath does not exist yet: ${outputPath}`, outputPath);
      }
    }
  }

  return runId;
}

function validateVerdict(
  repoRoot: string,
  verdict: Record<string, unknown> | null,
  runId: string | null,
  findings: Finding[],
): void {
  if (!verdict) return;
  if (verdict.schemaVersion !== 'gustav-run-verdict-v0') {
    pushFinding(findings, 'blocker', 'verdict_schema_version', 'Verdict schemaVersion must be gustav-run-verdict-v0.');
  }
  if (runId && verdict.runId !== runId) {
    pushFinding(findings, 'blocker', 'verdict_run_id_mismatch', `Verdict runId ${String(verdict.runId)} does not match manifest ${runId}.`);
  }
  const status = verdict.status;
  if (status !== 'PASS' && status !== 'HOLD' && status !== 'BLOCK') {
    pushFinding(findings, 'blocker', 'verdict_status_invalid', `Verdict status is invalid: ${String(status)}`);
  }
  const nextAllowedModes = Array.isArray(verdict.nextAllowedModes) ? verdict.nextAllowedModes : null;
  if (!nextAllowedModes) {
    pushFinding(findings, 'blocker', 'next_allowed_modes_missing', 'Verdict nextAllowedModes must be an array.');
  } else if (status === 'HOLD' || status === 'BLOCK') {
    for (const nextMode of nextAllowedModes) {
      if (typeof nextMode === 'string' && BLOCKED_NEXT_MODES.has(nextMode)) {
        pushFinding(
          findings,
          'blocker',
          'blocked_next_mode_allowed',
          `Verdict status ${status} must not allow next mode ${nextMode}.`,
        );
      }
    }
  }

  const producedArtifacts = Array.isArray(verdict.producedArtifacts) ? verdict.producedArtifacts : null;
  if (!producedArtifacts) {
    pushFinding(findings, 'blocker', 'produced_artifacts_missing', 'Verdict producedArtifacts must be an array.');
  } else {
    for (const artifact of producedArtifacts) {
      if (typeof artifact !== 'string' || !artifact) {
        pushFinding(findings, 'blocker', 'produced_artifact_invalid', 'Produced artifact entries must be non-empty strings.');
        continue;
      }
      if (!fs.existsSync(path.resolve(repoRoot, artifact))) {
        pushFinding(findings, 'blocker', 'produced_artifact_not_found', `Produced artifact does not exist: ${artifact}`, artifact);
      }
    }
  }
}

function validateAgentVerdicts(repoRoot: string, runDir: string, findings: Finding[]): void {
  const agentDir = path.join(runDir, 'audits', 'agent_verdicts');
  if (!exists(agentDir, findings, 'agent_verdict_dir_missing')) return;
  const files = fs.readdirSync(agentDir).filter((file) => file.endsWith('.json'));
  if (files.length === 0) {
    pushFinding(findings, 'warning', 'agent_verdicts_empty', 'No agent verdict JSON files found.', agentDir);
    return;
  }
  for (const file of files) {
    const fullPath = path.join(agentDir, file);
    const verdict = readJson<Record<string, unknown>>(fullPath, findings);
    if (!verdict) continue;
    if (verdict.schemaVersion !== 'gustav-agent-verdict-v0') {
      pushFinding(findings, 'blocker', 'agent_schema_version', `${file}: invalid agent verdict schemaVersion.`, fullPath);
    }
    if (typeof verdict.runId !== 'string' || verdict.runId !== path.basename(runDir)) {
      pushFinding(findings, 'blocker', 'agent_run_id_invalid', `${file}: runId must match run folder.`, fullPath);
    }
    if (verdict.verdict !== 'GO' && verdict.verdict !== 'HOLD' && verdict.verdict !== 'BLOCK') {
      pushFinding(findings, 'blocker', 'agent_verdict_invalid', `${file}: verdict must be GO, HOLD, or BLOCK.`, fullPath);
    }
    for (const key of ['blockers', 'findings', 'requiredFixes', 'evidence', 'filesRead', 'filesWritten', 'unknowns']) {
      if (!Array.isArray(verdict[key])) {
        pushFinding(findings, 'blocker', 'agent_array_missing', `${file}: ${key} must be an array.`, fullPath);
      }
    }
    const filesWritten = Array.isArray(verdict.filesWritten) ? verdict.filesWritten : [];
    for (const written of filesWritten) {
      if (typeof written !== 'string') continue;
      const resolved = path.resolve(repoRoot, written);
      if (!isInside(runDir, resolved)) {
        pushFinding(
          findings,
          'blocker',
          'agent_wrote_outside_run',
          `${file}: filesWritten contains path outside run folder: ${written}`,
          fullPath,
        );
      }
    }
  }
}

function validateCloudSyncMapping(runDir: string, runId: string | null, findings: Finding[]): void {
  const mappingPath = path.join(runDir, 'audits', 'cloud_sync_mapping.json');
  if (!fs.existsSync(mappingPath)) return;
  const mapping = readJson<Record<string, unknown>>(mappingPath, findings);
  if (!mapping) return;
  if (mapping.schemaVersion !== 'gustav-cloud-sync-mapping-v0') {
    pushFinding(findings, 'blocker', 'cloud_mapping_schema_version', 'Cloud sync mapping schemaVersion must be gustav-cloud-sync-mapping-v0.', mappingPath);
  }
  if (runId && mapping.runId !== runId) {
    pushFinding(findings, 'blocker', 'cloud_mapping_run_id_mismatch', `Cloud sync mapping runId ${String(mapping.runId)} does not match manifest ${runId}.`, mappingPath);
  }
  if (mapping.status !== 'PASS' && mapping.status !== 'HOLD' && mapping.status !== 'BLOCK') {
    pushFinding(findings, 'blocker', 'cloud_mapping_status_invalid', `Cloud sync mapping status is invalid: ${String(mapping.status)}`, mappingPath);
  }
  const summary = mapping.summary && typeof mapping.summary === 'object'
    ? mapping.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'cloud_mapping_summary_missing', 'Cloud sync mapping summary must be an object.', mappingPath);
  }
  const entries = Array.isArray(mapping.entries) ? mapping.entries : null;
  if (!entries || entries.length === 0) {
    pushFinding(findings, 'blocker', 'cloud_mapping_entries_missing', 'Cloud sync mapping entries must be a non-empty array.', mappingPath);
    return;
  }
  if (summary && summary.entries !== entries.length) {
    pushFinding(findings, 'blocker', 'cloud_mapping_entries_count_mismatch', 'Cloud sync mapping summary.entries must equal entries.length.', mappingPath);
  }
  if (summary && mapping.status === 'PASS') {
    const blockers = typeof summary.blockers === 'number' ? summary.blockers : 0;
    const blockUnknown = typeof summary.blockUnknown === 'number' ? summary.blockUnknown : 0;
    if (blockers > 0 || blockUnknown > 0) {
      pushFinding(findings, 'blocker', 'cloud_mapping_pass_with_blockers', 'Cloud sync mapping cannot be PASS while blockers or blockUnknown entries remain.', mappingPath);
    }
  }
  for (const rawEntry of entries) {
    if (!rawEntry || typeof rawEntry !== 'object') {
      pushFinding(findings, 'blocker', 'cloud_mapping_entry_invalid', 'Cloud sync mapping entry must be an object.', mappingPath);
      continue;
    }
    const entry = rawEntry as Record<string, unknown>;
    if (typeof entry.key !== 'string' && typeof entry.keyPattern !== 'string') {
      pushFinding(findings, 'blocker', 'cloud_mapping_entry_key_missing', 'Cloud sync mapping entry must include key or keyPattern.', mappingPath);
    }
    if (typeof entry.sourcePath !== 'string' || typeof entry.line !== 'number') {
      pushFinding(findings, 'blocker', 'cloud_mapping_entry_source_missing', 'Cloud sync mapping entry must include sourcePath and line.', mappingPath);
    }
    const action = typeof entry.action === 'string' ? entry.action : '';
    if (!CLOUD_SYNC_ACTIONS.has(action)) {
      pushFinding(findings, 'blocker', 'cloud_mapping_action_invalid', `Cloud sync mapping action is invalid: ${action}`, mappingPath);
    }
    if ((action === 'map_to_target' || action === 'map_to_source_and_target') && (entry.legacyTarget !== 'en' || typeof entry.targetPath !== 'string')) {
      pushFinding(findings, 'blocker', 'cloud_mapping_target_fields_missing', 'Target cloud mapping entries must include legacyTarget=en and targetPath.', mappingPath);
    }
    if (action === 'block_unknown' && entry.risk !== 'blocker') {
      pushFinding(findings, 'blocker', 'cloud_mapping_unknown_not_blocker', 'block_unknown entries must have blocker risk.', mappingPath);
    }
  }
}

function validateMixedCloudPayloadAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'mixed_cloud_payload_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-mixed-cloud-payload-audit-v0') {
    pushFinding(findings, 'blocker', 'mixed_payload_schema_version', 'Mixed cloud payload audit schemaVersion must be gustav-mixed-cloud-payload-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'mixed_payload_run_id_mismatch', `Mixed cloud payload audit runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  if (audit.status !== 'PASS' && audit.status !== 'HOLD' && audit.status !== 'BLOCK') {
    pushFinding(findings, 'blocker', 'mixed_payload_status_invalid', `Mixed cloud payload audit status is invalid: ${String(audit.status)}`, auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'mixed_payload_summary_missing', 'Mixed cloud payload audit summary must be an object.', auditPath);
  }
  const payloads = Array.isArray(audit.payloads) ? audit.payloads : null;
  if (!payloads || payloads.length === 0) {
    pushFinding(findings, 'blocker', 'mixed_payload_payloads_missing', 'Mixed cloud payload audit payloads must be a non-empty array.', auditPath);
    return;
  }
  if (summary && summary.payloads !== payloads.length) {
    pushFinding(findings, 'blocker', 'mixed_payload_count_mismatch', 'Mixed cloud payload audit summary.payloads must equal payloads.length.', auditPath);
  }
  let fieldCount = 0;
  let blockerFieldCount = 0;
  for (const rawPayload of payloads) {
    if (!rawPayload || typeof rawPayload !== 'object') {
      pushFinding(findings, 'blocker', 'mixed_payload_entry_invalid', 'Mixed cloud payload entry must be an object.', auditPath);
      continue;
    }
    const payload = rawPayload as Record<string, unknown>;
    if (typeof payload.key !== 'string' || !payload.key) {
      pushFinding(findings, 'blocker', 'mixed_payload_key_missing', 'Mixed cloud payload entry must include key.', auditPath);
    }
    if (typeof payload.currentCloudShape !== 'string' || typeof payload.proposedShape !== 'string' || typeof payload.verdict !== 'string') {
      pushFinding(findings, 'blocker', 'mixed_payload_shape_missing', 'Mixed cloud payload entry must include currentCloudShape, proposedShape and verdict.', auditPath);
    }
    if (!Array.isArray(payload.codeReferences)) {
      pushFinding(findings, 'blocker', 'mixed_payload_refs_missing', 'Mixed cloud payload entry must include codeReferences array.', auditPath);
    }
    const fields = Array.isArray(payload.fieldDecisions) ? payload.fieldDecisions : null;
    if (!fields || fields.length === 0) {
      pushFinding(findings, 'blocker', 'mixed_payload_fields_missing', 'Mixed cloud payload entry must include fieldDecisions.', auditPath);
      continue;
    }
    fieldCount += fields.length;
    for (const rawField of fields) {
      if (!rawField || typeof rawField !== 'object') {
        pushFinding(findings, 'blocker', 'mixed_payload_field_invalid', 'Mixed cloud payload field decision must be an object.', auditPath);
        continue;
      }
      const field = rawField as Record<string, unknown>;
      if (typeof field.field !== 'string' || !field.field) {
        pushFinding(findings, 'blocker', 'mixed_payload_field_name_missing', 'Mixed cloud payload field decision must include field.', auditPath);
      }
      const scope = typeof field.scope === 'string' ? field.scope : '';
      if (!MIXED_PAYLOAD_FIELD_SCOPES.has(scope)) {
        pushFinding(findings, 'blocker', 'mixed_payload_field_scope_invalid', `Mixed cloud payload field scope is invalid: ${scope}`, auditPath);
      }
      if (field.risk === 'blocker') blockerFieldCount += 1;
      if (!Array.isArray(field.requiredBeforeFrench)) {
        pushFinding(findings, 'blocker', 'mixed_payload_required_before_french_missing', 'Mixed cloud payload field decision must include requiredBeforeFrench array.', auditPath);
      }
    }
  }
  if (summary && summary.fields !== fieldCount) {
    pushFinding(findings, 'blocker', 'mixed_payload_field_count_mismatch', 'Mixed cloud payload audit summary.fields must equal fieldDecisions length.', auditPath);
  }
  if (audit.status === 'PASS' && blockerFieldCount > 0) {
    pushFinding(findings, 'blocker', 'mixed_payload_pass_with_blockers', 'Mixed cloud payload audit cannot be PASS while blocker fields remain.', auditPath);
  }
}

function validateAchievementTaxonomy(runDir: string, runId: string | null, findings: Finding[]): void {
  const taxonomyPath = path.join(runDir, 'audits', 'achievement_taxonomy.json');
  if (!fs.existsSync(taxonomyPath)) return;
  const taxonomy = readJson<Record<string, unknown>>(taxonomyPath, findings);
  if (!taxonomy) return;
  if (taxonomy.schemaVersion !== 'gustav-achievement-taxonomy-v0') {
    pushFinding(findings, 'blocker', 'achievement_taxonomy_schema_version', 'Achievement taxonomy schemaVersion must be gustav-achievement-taxonomy-v0.', taxonomyPath);
  }
  if (runId && taxonomy.runId !== runId) {
    pushFinding(findings, 'blocker', 'achievement_taxonomy_run_id_mismatch', `Achievement taxonomy runId ${String(taxonomy.runId)} does not match manifest ${runId}.`, taxonomyPath);
  }
  if (taxonomy.status !== 'PASS' && taxonomy.status !== 'HOLD' && taxonomy.status !== 'BLOCK') {
    pushFinding(findings, 'blocker', 'achievement_taxonomy_status_invalid', `Achievement taxonomy status is invalid: ${String(taxonomy.status)}`, taxonomyPath);
  }
  const summary = taxonomy.summary && typeof taxonomy.summary === 'object'
    ? taxonomy.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'achievement_taxonomy_summary_missing', 'Achievement taxonomy summary must be an object.', taxonomyPath);
  }
  const entries = Array.isArray(taxonomy.entries) ? taxonomy.entries : null;
  if (!entries || entries.length === 0) {
    pushFinding(findings, 'blocker', 'achievement_taxonomy_entries_missing', 'Achievement taxonomy entries must be a non-empty array.', taxonomyPath);
    return;
  }
  if (summary && summary.total !== entries.length) {
    pushFinding(findings, 'blocker', 'achievement_taxonomy_count_mismatch', 'Achievement taxonomy summary.total must equal entries.length.', taxonomyPath);
  }
  const ids = new Set<string>();
  let blockerEntries = 0;
  for (const rawEntry of entries) {
    if (!rawEntry || typeof rawEntry !== 'object') {
      pushFinding(findings, 'blocker', 'achievement_taxonomy_entry_invalid', 'Achievement taxonomy entry must be an object.', taxonomyPath);
      continue;
    }
    const entry = rawEntry as Record<string, unknown>;
    const id = typeof entry.id === 'string' ? entry.id : '';
    if (!id) {
      pushFinding(findings, 'blocker', 'achievement_taxonomy_id_missing', 'Achievement taxonomy entry must include id.', taxonomyPath);
    } else if (ids.has(id)) {
      pushFinding(findings, 'blocker', 'achievement_taxonomy_duplicate_id', `Duplicate achievement id in taxonomy: ${id}`, taxonomyPath);
    } else {
      ids.add(id);
    }
    if (typeof entry.category !== 'string' || typeof entry.line !== 'number') {
      pushFinding(findings, 'blocker', 'achievement_taxonomy_source_missing', 'Achievement taxonomy entry must include category and line.', taxonomyPath);
    }
    const scope = typeof entry.scope === 'string' ? entry.scope : '';
    if (!ACHIEVEMENT_SCOPES.has(scope)) {
      pushFinding(findings, 'blocker', 'achievement_taxonomy_scope_invalid', `Achievement taxonomy scope is invalid: ${scope}`, taxonomyPath);
    }
    const action = typeof entry.migrationAction === 'string' ? entry.migrationAction : '';
    if (!ACHIEVEMENT_MIGRATION_ACTIONS.has(action)) {
      pushFinding(findings, 'blocker', 'achievement_taxonomy_action_invalid', `Achievement taxonomy migrationAction is invalid: ${action}`, taxonomyPath);
    }
    if (entry.risk === 'blocker') blockerEntries += 1;
    if (scope === 'study_target' && (entry.legacyTarget !== 'en' || typeof entry.targetPath !== 'string')) {
      pushFinding(findings, 'blocker', 'achievement_taxonomy_target_fields_missing', 'Target achievements must include legacyTarget=en and targetPath.', taxonomyPath);
    }
    if (!Array.isArray(entry.requiredBeforeFrench)) {
      pushFinding(findings, 'blocker', 'achievement_taxonomy_required_before_french_missing', 'Achievement taxonomy entry must include requiredBeforeFrench array.', taxonomyPath);
    }
  }
  if (taxonomy.status === 'PASS' && blockerEntries > 0) {
    pushFinding(findings, 'blocker', 'achievement_taxonomy_pass_with_blockers', 'Achievement taxonomy cannot be PASS while blocker entries remain.', taxonomyPath);
  }
}

function validateLocalCloudDecisionTable(runDir: string, runId: string | null, findings: Finding[]): void {
  const tablePath = path.join(runDir, 'audits', 'local_cloud_decision_table.json');
  if (!fs.existsSync(tablePath)) return;
  const table = readJson<Record<string, unknown>>(tablePath, findings);
  if (!table) return;
  if (table.schemaVersion !== 'gustav-local-cloud-decision-table-v0') {
    pushFinding(findings, 'blocker', 'local_cloud_table_schema_version', 'Local/cloud decision table schemaVersion must be gustav-local-cloud-decision-table-v0.', tablePath);
  }
  if (runId && table.runId !== runId) {
    pushFinding(findings, 'blocker', 'local_cloud_table_run_id_mismatch', `Local/cloud decision table runId ${String(table.runId)} does not match manifest ${runId}.`, tablePath);
  }
  if (table.status !== 'PASS' && table.status !== 'HOLD' && table.status !== 'BLOCK') {
    pushFinding(findings, 'blocker', 'local_cloud_table_status_invalid', `Local/cloud decision table status is invalid: ${String(table.status)}`, tablePath);
  }
  const summary = table.summary && typeof table.summary === 'object'
    ? table.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'local_cloud_table_summary_missing', 'Local/cloud decision table summary must be an object.', tablePath);
  }
  const entries = Array.isArray(table.entries) ? table.entries : null;
  if (!entries) {
    pushFinding(findings, 'blocker', 'local_cloud_table_entries_missing', 'Local/cloud decision table entries must be an array.', tablePath);
    return;
  }
  if (summary && summary.entries !== entries.length) {
    pushFinding(findings, 'blocker', 'local_cloud_table_count_mismatch', 'Local/cloud decision table summary.entries must equal entries.length.', tablePath);
  }
  const keys = new Set<string>();
  let blockers = 0;
  for (const rawEntry of entries) {
    if (!rawEntry || typeof rawEntry !== 'object') {
      pushFinding(findings, 'blocker', 'local_cloud_table_entry_invalid', 'Local/cloud decision table entry must be an object.', tablePath);
      continue;
    }
    const entry = rawEntry as Record<string, unknown>;
    const key = typeof entry.key === 'string' ? entry.key : '';
    if (!key) {
      pushFinding(findings, 'blocker', 'local_cloud_table_key_missing', 'Local/cloud decision table entry must include key.', tablePath);
    } else if (keys.has(key)) {
      pushFinding(findings, 'blocker', 'local_cloud_table_duplicate_key', `Duplicate local/cloud decision key: ${key}`, tablePath);
    } else {
      keys.add(key);
    }
    const action = typeof entry.action === 'string' ? entry.action : '';
    if (!LOCAL_CLOUD_DECISION_ACTIONS.has(action)) {
      pushFinding(findings, 'blocker', 'local_cloud_table_action_invalid', `Local/cloud decision action is invalid: ${action}`, tablePath);
    }
    if (entry.risk === 'blocker') blockers += 1;
    if (action === 'sync_under_target' && (typeof entry.targetPath !== 'string' || typeof entry.localKeyShape !== 'string')) {
      pushFinding(findings, 'blocker', 'local_cloud_table_sync_fields_missing', 'sync_under_target entries must include targetPath and localKeyShape.', tablePath);
    }
    if (action === 'keep_local_target_scoped' && typeof entry.localKeyShape !== 'string') {
      pushFinding(findings, 'blocker', 'local_cloud_table_local_shape_missing', 'keep_local_target_scoped entries must include localKeyShape.', tablePath);
    }
    if (!Array.isArray(entry.requiredBeforeFrench)) {
      pushFinding(findings, 'blocker', 'local_cloud_table_required_before_french_missing', 'Local/cloud decision entry must include requiredBeforeFrench array.', tablePath);
    }
    if (!Array.isArray(entry.evidence)) {
      pushFinding(findings, 'blocker', 'local_cloud_table_evidence_missing', 'Local/cloud decision entry must include evidence array.', tablePath);
    }
  }
  if (table.status === 'PASS' && blockers > 0) {
    pushFinding(findings, 'blocker', 'local_cloud_table_pass_with_blockers', 'Local/cloud decision table cannot be PASS while blocker entries remain.', tablePath);
  }
}

function validateTargetKeyIntegrationPlan(runDir: string, runId: string | null, findings: Finding[]): void {
  const planPath = path.join(runDir, 'audits', 'target_key_integration_plan.json');
  if (!fs.existsSync(planPath)) return;
  const plan = readJson<Record<string, unknown>>(planPath, findings);
  if (!plan) return;
  if (plan.schemaVersion !== 'gustav-target-key-integration-plan-v0') {
    pushFinding(findings, 'blocker', 'target_key_plan_schema_version', 'Target key integration plan schemaVersion must be gustav-target-key-integration-plan-v0.', planPath);
  }
  if (runId && plan.runId !== runId) {
    pushFinding(findings, 'blocker', 'target_key_plan_run_id_mismatch', `Target key integration plan runId ${String(plan.runId)} does not match manifest ${runId}.`, planPath);
  }
  const status = typeof plan.status === 'string' ? plan.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'target_key_plan_status_invalid', `Target key integration plan status is invalid: ${status}`, planPath);
  }
  const summary = plan.summary && typeof plan.summary === 'object'
    ? plan.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'target_key_plan_summary_missing', 'Target key integration plan summary must be an object.', planPath);
  }
  const devWarning = plan.existingDevStudyTargetWarning && typeof plan.existingDevStudyTargetWarning === 'object'
    ? plan.existingDevStudyTargetWarning as Record<string, unknown>
    : null;
  if (!devWarning) {
    pushFinding(findings, 'blocker', 'target_key_plan_dev_warning_missing', 'Target key integration plan must include existingDevStudyTargetWarning.', planPath);
  } else {
    if (devWarning.status !== 'HOLD') {
      pushFinding(findings, 'blocker', 'target_key_plan_dev_warning_status', 'Existing dev study target warning must remain HOLD until production target model is implemented.', planPath);
    }
    if (typeof devWarning.reason !== 'string' || !devWarning.reason) {
      pushFinding(findings, 'blocker', 'target_key_plan_dev_warning_reason', 'Existing dev study target warning must include a reason.', planPath);
    }
    if (!Array.isArray(devWarning.files) || devWarning.files.length === 0) {
      pushFinding(findings, 'blocker', 'target_key_plan_dev_warning_files', 'Existing dev study target warning must include files.', planPath);
    }
    if (!Array.isArray(devWarning.requiredBeforeFrench) || devWarning.requiredBeforeFrench.length === 0) {
      pushFinding(findings, 'blocker', 'target_key_plan_dev_warning_required', 'Existing dev study target warning must include requiredBeforeFrench.', planPath);
    }
  }

  const phases = Array.isArray(plan.phases) ? plan.phases : null;
  if (!phases || phases.length === 0) {
    pushFinding(findings, 'blocker', 'target_key_plan_phases_missing', 'Target key integration plan phases must be a non-empty array.', planPath);
  } else {
    for (const rawPhase of phases) {
      if (!rawPhase || typeof rawPhase !== 'object') {
        pushFinding(findings, 'blocker', 'target_key_plan_phase_invalid', 'Target key integration plan phase must be an object.', planPath);
        continue;
      }
      const phase = rawPhase as Record<string, unknown>;
      if (typeof phase.id !== 'string' || typeof phase.title !== 'string') {
        pushFinding(findings, 'blocker', 'target_key_plan_phase_id_missing', 'Target key integration plan phase must include id and title.', planPath);
      }
      const phaseStatus = typeof phase.status === 'string' ? phase.status : '';
      if (!REPORT_STATUSES.has(phaseStatus)) {
        pushFinding(findings, 'blocker', 'target_key_plan_phase_status_invalid', `Target key integration plan phase status is invalid: ${phaseStatus}`, planPath);
      }
      if (!Array.isArray(phase.requiredBeforeFrench) || phase.requiredBeforeFrench.length === 0) {
        pushFinding(findings, 'blocker', 'target_key_plan_phase_required_missing', 'Target key integration plan phase must include requiredBeforeFrench.', planPath);
      }
    }
  }

  const domains = Array.isArray(plan.domains) ? plan.domains : null;
  if (!domains || domains.length === 0) {
    pushFinding(findings, 'blocker', 'target_key_plan_domains_missing', 'Target key integration plan domains must be a non-empty array.', planPath);
    return;
  }
  if (summary) {
    if (summary.domains !== domains.length) {
      pushFinding(findings, 'blocker', 'target_key_plan_domain_count_mismatch', 'Target key integration plan summary.domains must equal domains.length.', planPath);
    }
    for (const key of ['files', 'rawTargetStorageRecords', 'cloudTargetMappings', 'localCloudDecisions', 'blockerDomains', 'blockers', 'existingDevStudyTargetFiles']) {
      if (typeof summary[key] !== 'number') {
        pushFinding(findings, 'blocker', 'target_key_plan_summary_number_missing', `Target key integration plan summary.${key} must be a number.`, planPath);
      }
    }
  }

  const seenDomains = new Set<string>();
  let blockerDomains = 0;
  let blockerCount = 0;
  for (const rawDomain of domains) {
    if (!rawDomain || typeof rawDomain !== 'object') {
      pushFinding(findings, 'blocker', 'target_key_plan_domain_invalid', 'Target key integration plan domain must be an object.', planPath);
      continue;
    }
    const domain = rawDomain as Record<string, unknown>;
    const domainName = typeof domain.domain === 'string' ? domain.domain : '';
    if (!TARGET_KEY_DOMAINS.has(domainName)) {
      pushFinding(findings, 'blocker', 'target_key_plan_domain_name_invalid', `Target key integration plan domain is invalid: ${domainName}`, planPath);
    } else if (seenDomains.has(domainName)) {
      pushFinding(findings, 'blocker', 'target_key_plan_domain_duplicate', `Duplicate target key integration domain: ${domainName}`, planPath);
    } else {
      seenDomains.add(domainName);
    }
    const domainStatus = typeof domain.status === 'string' ? domain.status : '';
    if (!REPORT_STATUSES.has(domainStatus)) {
      pushFinding(findings, 'blocker', 'target_key_plan_domain_status_invalid', `Target key integration domain status is invalid: ${domainStatus}`, planPath);
    }
    const risk = typeof domain.risk === 'string' ? domain.risk : '';
    if (!RISK_LEVELS.has(risk)) {
      pushFinding(findings, 'blocker', 'target_key_plan_domain_risk_invalid', `Target key integration domain risk is invalid: ${risk}`, planPath);
    }
    if (domainStatus !== 'PASS' || risk === 'blocker') blockerDomains += 1;
    if (typeof domain.productModule !== 'string' || !domain.productModule) {
      pushFinding(findings, 'blocker', 'target_key_plan_domain_module_missing', 'Target key integration domain must include productModule.', planPath);
    }
    for (const key of ['proposedApi', 'storageShape', 'fileTouchpoints', 'blockers', 'requiredBeforeFrench', 'tests', 'notes']) {
      if (!Array.isArray(domain[key])) {
        pushFinding(findings, 'blocker', 'target_key_plan_domain_array_missing', `Target key integration domain.${key} must be an array.`, planPath);
      }
    }
    const blockers = Array.isArray(domain.blockers) ? domain.blockers : [];
    blockerCount += blockers.length;
    const required = Array.isArray(domain.requiredBeforeFrench) ? domain.requiredBeforeFrench : [];
    if (required.length === 0) {
      pushFinding(findings, 'blocker', 'target_key_plan_domain_required_empty', 'Target key integration domain must include requiredBeforeFrench items.', planPath);
    }
    const touchpoints = Array.isArray(domain.fileTouchpoints) ? domain.fileTouchpoints : [];
    for (const rawTouchpoint of touchpoints) {
      if (!rawTouchpoint || typeof rawTouchpoint !== 'object') {
        pushFinding(findings, 'blocker', 'target_key_plan_touchpoint_invalid', 'Target key integration fileTouchpoint must be an object.', planPath);
        continue;
      }
      const touchpoint = rawTouchpoint as Record<string, unknown>;
      if (typeof touchpoint.sourcePath !== 'string' || typeof touchpoint.records !== 'number') {
        pushFinding(findings, 'blocker', 'target_key_plan_touchpoint_fields_missing', 'Target key integration fileTouchpoint must include sourcePath and records.', planPath);
      }
      if (!Array.isArray(touchpoint.examples)) {
        pushFinding(findings, 'blocker', 'target_key_plan_touchpoint_examples_missing', 'Target key integration fileTouchpoint must include examples.', planPath);
      }
    }
  }
  if (summary && summary.blockerDomains !== blockerDomains) {
    pushFinding(findings, 'blocker', 'target_key_plan_blocker_domain_count_mismatch', 'Target key integration plan summary.blockerDomains must match domain statuses.', planPath);
  }
  if (summary && summary.blockers !== blockerCount) {
    pushFinding(findings, 'blocker', 'target_key_plan_blocker_count_mismatch', 'Target key integration plan summary.blockers must equal domain blocker count.', planPath);
  }
  if (plan.status === 'PASS' && (blockerDomains > 0 || blockerCount > 0)) {
    pushFinding(findings, 'blocker', 'target_key_plan_pass_with_blockers', 'Target key integration plan cannot be PASS while blocker domains or blockers remain.', planPath);
  }
}

function validateSurfaceRouteInventory(runDir: string, runId: string | null, findings: Finding[]): void {
  const inventoryPath = path.join(runDir, 'audits', 'surface_route_inventory.json');
  if (!fs.existsSync(inventoryPath)) return;
  const inventory = readJson<Record<string, unknown>>(inventoryPath, findings);
  if (!inventory) return;
  if (inventory.schemaVersion !== 'gustav-surface-route-inventory-v0') {
    pushFinding(findings, 'blocker', 'surface_inventory_schema_version', 'Surface route inventory schemaVersion must be gustav-surface-route-inventory-v0.', inventoryPath);
  }
  if (runId && inventory.runId !== runId) {
    pushFinding(findings, 'blocker', 'surface_inventory_run_id_mismatch', `Surface route inventory runId ${String(inventory.runId)} does not match manifest ${runId}.`, inventoryPath);
  }
  const status = typeof inventory.status === 'string' ? inventory.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'surface_inventory_status_invalid', `Surface route inventory status is invalid: ${status}`, inventoryPath);
  }
  const summary = inventory.summary && typeof inventory.summary === 'object'
    ? inventory.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'surface_inventory_summary_missing', 'Surface route inventory summary must be an object.', inventoryPath);
  }
  const routeCoverage = inventory.routeCoverage && typeof inventory.routeCoverage === 'object'
    ? inventory.routeCoverage as Record<string, unknown>
    : null;
  if (!routeCoverage) {
    pushFinding(findings, 'blocker', 'surface_inventory_route_coverage_missing', 'Surface route inventory must include routeCoverage.', inventoryPath);
  } else {
    for (const key of ['stackScreens', 'tabScreens', 'routeLikeWithoutStackRegistration', 'stackScreensWithoutFile', 'notes']) {
      if (!Array.isArray(routeCoverage[key])) {
        pushFinding(findings, 'blocker', 'surface_inventory_route_coverage_array_missing', `Surface route inventory routeCoverage.${key} must be an array.`, inventoryPath);
      }
    }
  }
  const surfaces = Array.isArray(inventory.surfaces) ? inventory.surfaces : null;
  if (!surfaces || surfaces.length === 0) {
    pushFinding(findings, 'blocker', 'surface_inventory_surfaces_missing', 'Surface route inventory surfaces must be a non-empty array.', inventoryPath);
    return;
  }
  if (summary) {
    if (summary.surfaces !== surfaces.length) {
      pushFinding(findings, 'blocker', 'surface_inventory_surface_count_mismatch', 'Surface route inventory summary.surfaces must equal surfaces.length.', inventoryPath);
    }
    for (const key of [
      'appTsxFiles',
      'stackScreens',
      'tabScreens',
      'targetSensitiveSurfaces',
      'userFacingTargetSurfaces',
      'devStudyTargetSurfaces',
      'directStorageSurfaces',
      'blockerSurfaces',
      'blockers',
      'routeLikeWithoutStackRegistration',
      'stackScreensWithoutFile',
    ]) {
      if (typeof summary[key] !== 'number') {
        pushFinding(findings, 'blocker', 'surface_inventory_summary_number_missing', `Surface route inventory summary.${key} must be a number.`, inventoryPath);
      }
    }
  }

  const seen = new Set<string>();
  let targetSensitiveSurfaces = 0;
  let userFacingTargetSurfaces = 0;
  let devStudyTargetSurfaces = 0;
  let directStorageSurfaces = 0;
  let blockerSurfaces = 0;
  let blockerCount = 0;
  for (const rawSurface of surfaces) {
    if (!rawSurface || typeof rawSurface !== 'object') {
      pushFinding(findings, 'blocker', 'surface_inventory_entry_invalid', 'Surface route inventory entry must be an object.', inventoryPath);
      continue;
    }
    const surface = rawSurface as Record<string, unknown>;
    const id = typeof surface.id === 'string' ? surface.id : '';
    if (!id) {
      pushFinding(findings, 'blocker', 'surface_inventory_id_missing', 'Surface route inventory entry must include id.', inventoryPath);
    } else if (seen.has(id)) {
      pushFinding(findings, 'blocker', 'surface_inventory_duplicate_id', `Duplicate surface inventory id: ${id}`, inventoryPath);
    } else {
      seen.add(id);
    }
    if (typeof surface.sourcePath !== 'string' || !surface.sourcePath) {
      pushFinding(findings, 'blocker', 'surface_inventory_source_path_missing', 'Surface route inventory entry must include sourcePath.', inventoryPath);
    }
    const kind = typeof surface.kind === 'string' ? surface.kind : '';
    if (!SURFACE_KINDS.has(kind)) {
      pushFinding(findings, 'blocker', 'surface_inventory_kind_invalid', `Surface kind is invalid: ${kind}`, inventoryPath);
    }
    const domain = typeof surface.domain === 'string' ? surface.domain : '';
    if (!SURFACE_DOMAINS.has(domain)) {
      pushFinding(findings, 'blocker', 'surface_inventory_domain_invalid', `Surface domain is invalid: ${domain}`, inventoryPath);
    }
    const surfaceStatus = typeof surface.status === 'string' ? surface.status : '';
    if (!REPORT_STATUSES.has(surfaceStatus)) {
      pushFinding(findings, 'blocker', 'surface_inventory_entry_status_invalid', `Surface status is invalid: ${surfaceStatus}`, inventoryPath);
    }
    const risk = typeof surface.risk === 'string' ? surface.risk : '';
    if (!RISK_LEVELS.has(risk)) {
      pushFinding(findings, 'blocker', 'surface_inventory_risk_invalid', `Surface risk is invalid: ${risk}`, inventoryPath);
    }
    if (typeof surface.userFacing !== 'boolean') {
      pushFinding(findings, 'blocker', 'surface_inventory_user_facing_missing', 'Surface userFacing must be a boolean.', inventoryPath);
    }
    const markers = surface.markers && typeof surface.markers === 'object'
      ? surface.markers as Record<string, unknown>
      : null;
    if (!markers) {
      pushFinding(findings, 'blocker', 'surface_inventory_markers_missing', 'Surface markers must be an object.', inventoryPath);
    } else {
      for (const key of ['usesStudyTargetContext', 'usesDevStudyTargetLang', 'usesSourceLocale', 'usesCloudSync']) {
        if (typeof markers[key] !== 'boolean') {
          pushFinding(findings, 'blocker', 'surface_inventory_marker_boolean_missing', `Surface marker ${key} must be a boolean.`, inventoryPath);
        }
      }
      for (const key of ['directAsyncStorageOps', 'routerTouches']) {
        if (typeof markers[key] !== 'number') {
          pushFinding(findings, 'blocker', 'surface_inventory_marker_number_missing', `Surface marker ${key} must be a number.`, inventoryPath);
        }
      }
      if (markers.usesDevStudyTargetLang === true) devStudyTargetSurfaces += 1;
      if (typeof markers.directAsyncStorageOps === 'number' && markers.directAsyncStorageOps > 0) directStorageSurfaces += 1;
    }
    const targetStorage = surface.targetStorage && typeof surface.targetStorage === 'object'
      ? surface.targetStorage as Record<string, unknown>
      : null;
    if (!targetStorage) {
      pushFinding(findings, 'blocker', 'surface_inventory_target_storage_missing', 'Surface targetStorage must be an object.', inventoryPath);
    } else {
      if (typeof targetStorage.records !== 'number' || typeof targetStorage.uniqueKeys !== 'number' || !Array.isArray(targetStorage.keys)) {
        pushFinding(findings, 'blocker', 'surface_inventory_target_storage_shape_invalid', 'Surface targetStorage must include records, uniqueKeys and keys.', inventoryPath);
      }
      if (typeof targetStorage.records === 'number' && targetStorage.records > 0) {
        targetSensitiveSurfaces += 1;
        if (surface.userFacing === true) userFacingTargetSurfaces += 1;
      }
    }
    const blockers = Array.isArray(surface.blockers) ? surface.blockers : null;
    if (!blockers) {
      pushFinding(findings, 'blocker', 'surface_inventory_blockers_missing', 'Surface blockers must be an array.', inventoryPath);
    } else {
      blockerCount += blockers.length;
      if (blockers.length > 0) blockerSurfaces += 1;
    }
    for (const key of ['requiredBeforeFrench', 'tests', 'evidence']) {
      if (!Array.isArray(surface[key])) {
        pushFinding(findings, 'blocker', 'surface_inventory_array_missing', `Surface ${key} must be an array.`, inventoryPath);
      }
    }
  }
  if (summary) {
    const expectedPairs: Array<[string, number]> = [
      ['targetSensitiveSurfaces', targetSensitiveSurfaces],
      ['userFacingTargetSurfaces', userFacingTargetSurfaces],
      ['devStudyTargetSurfaces', devStudyTargetSurfaces],
      ['directStorageSurfaces', directStorageSurfaces],
      ['blockerSurfaces', blockerSurfaces],
      ['blockers', blockerCount],
    ];
    for (const [key, expected] of expectedPairs) {
      if (summary[key] !== expected) {
        pushFinding(findings, 'blocker', 'surface_inventory_summary_mismatch', `Surface route inventory summary.${key} must match surface entries.`, inventoryPath);
      }
    }
  }
  if (inventory.status === 'PASS' && (blockerSurfaces > 0 || blockerCount > 0)) {
    pushFinding(findings, 'blocker', 'surface_inventory_pass_with_blockers', 'Surface route inventory cannot be PASS while blocker surfaces remain.', inventoryPath);
  }
}

function validateReadinessGate(runDir: string, runId: string | null, findings: Finding[]): void {
  const gatePath = path.join(runDir, 'audits', 'gustav_readiness_gate.json');
  if (!fs.existsSync(gatePath)) return;
  const gate = readJson<Record<string, unknown>>(gatePath, findings);
  if (!gate) return;
  if (gate.schemaVersion !== 'gustav-readiness-gate-v0') {
    pushFinding(findings, 'blocker', 'readiness_gate_schema_version', 'Readiness gate schemaVersion must be gustav-readiness-gate-v0.', gatePath);
  }
  if (runId && gate.runId !== runId) {
    pushFinding(findings, 'blocker', 'readiness_gate_run_id_mismatch', `Readiness gate runId ${String(gate.runId)} does not match manifest ${runId}.`, gatePath);
  }
  const decision = typeof gate.decision === 'string' ? gate.decision : '';
  if (!READINESS_DECISIONS.has(decision)) {
    pushFinding(findings, 'blocker', 'readiness_gate_decision_invalid', `Readiness gate decision is invalid: ${decision}`, gatePath);
  }
  const readiness = gate.readiness && typeof gate.readiness === 'object'
    ? gate.readiness as Record<string, unknown>
    : null;
  if (!readiness) {
    pushFinding(findings, 'blocker', 'readiness_gate_readiness_missing', 'Readiness gate must include readiness object.', gatePath);
  } else {
    for (const key of ['canStartFrenchGeneration', 'canStartProductionApply', 'canContinueArchitectureWork']) {
      if (typeof readiness[key] !== 'boolean') {
        pushFinding(findings, 'blocker', 'readiness_gate_boolean_missing', `Readiness gate readiness.${key} must be a boolean.`, gatePath);
      }
    }
    if (typeof readiness.nextRecommendedMode !== 'string') {
      pushFinding(findings, 'blocker', 'readiness_gate_next_mode_missing', 'Readiness gate nextRecommendedMode must be a string.', gatePath);
    }
    if (!Array.isArray(readiness.nextRecommendedWork)) {
      pushFinding(findings, 'blocker', 'readiness_gate_next_work_missing', 'Readiness gate nextRecommendedWork must be an array.', gatePath);
    }
  }
  const summary = gate.summary && typeof gate.summary === 'object'
    ? gate.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'readiness_gate_summary_missing', 'Readiness gate summary must be an object.', gatePath);
  } else {
    for (const key of ['checks', 'passed', 'failed', 'blockers', 'warnings', 'generationBlockers', 'applyBlockers']) {
      if (typeof summary[key] !== 'number') {
        pushFinding(findings, 'blocker', 'readiness_gate_summary_number_missing', `Readiness gate summary.${key} must be a number.`, gatePath);
      }
    }
  }
  if (!gate.inputStatuses || typeof gate.inputStatuses !== 'object') {
    pushFinding(findings, 'blocker', 'readiness_gate_input_statuses_missing', 'Readiness gate inputStatuses must be an object.', gatePath);
  }
  const checks = Array.isArray(gate.checks) ? gate.checks : null;
  if (!checks || checks.length === 0) {
    pushFinding(findings, 'blocker', 'readiness_gate_checks_missing', 'Readiness gate checks must be a non-empty array.', gatePath);
    return;
  }
  const ids = new Set<string>();
  let passed = 0;
  let failed = 0;
  let blockers = 0;
  let warnings = 0;
  let generationBlockers = 0;
  let applyBlockers = 0;
  for (const rawCheck of checks) {
    if (!rawCheck || typeof rawCheck !== 'object') {
      pushFinding(findings, 'blocker', 'readiness_gate_check_invalid', 'Readiness gate check must be an object.', gatePath);
      continue;
    }
    const check = rawCheck as Record<string, unknown>;
    const id = typeof check.id === 'string' ? check.id : '';
    if (!id) {
      pushFinding(findings, 'blocker', 'readiness_gate_check_id_missing', 'Readiness gate check must include id.', gatePath);
    } else if (ids.has(id)) {
      pushFinding(findings, 'blocker', 'readiness_gate_duplicate_check', `Duplicate readiness check id: ${id}`, gatePath);
    } else {
      ids.add(id);
    }
    if (typeof check.title !== 'string' || typeof check.sourceArtifact !== 'string' || typeof check.detail !== 'string') {
      pushFinding(findings, 'blocker', 'readiness_gate_check_text_missing', 'Readiness gate check must include title, sourceArtifact and detail.', gatePath);
    }
    if (check.status !== 'PASS' && check.status !== 'FAIL') {
      pushFinding(findings, 'blocker', 'readiness_gate_check_status_invalid', `Readiness gate check status is invalid: ${String(check.status)}`, gatePath);
    }
    if (check.severity !== 'blocker' && check.severity !== 'warning' && check.severity !== 'info') {
      pushFinding(findings, 'blocker', 'readiness_gate_check_severity_invalid', `Readiness gate check severity is invalid: ${String(check.severity)}`, gatePath);
    }
    const blocks = Array.isArray(check.blocks) ? check.blocks : null;
    if (!blocks) {
      pushFinding(findings, 'blocker', 'readiness_gate_check_blocks_missing', 'Readiness gate check blocks must be an array.', gatePath);
    } else {
      for (const block of blocks) {
        if (typeof block !== 'string' || !READINESS_BLOCKS.has(block)) {
          pushFinding(findings, 'blocker', 'readiness_gate_check_block_invalid', `Readiness gate check block is invalid: ${String(block)}`, gatePath);
        }
      }
    }
    if (!Array.isArray(check.requiredBeforeWork)) {
      pushFinding(findings, 'blocker', 'readiness_gate_required_missing', 'Readiness gate check requiredBeforeWork must be an array.', gatePath);
    }
    if (check.status === 'PASS') passed += 1;
    if (check.status === 'FAIL') {
      failed += 1;
      if (check.severity === 'blocker') {
        blockers += 1;
        if (Array.isArray(check.blocks) && check.blocks.includes('generation')) generationBlockers += 1;
        if (Array.isArray(check.blocks) && check.blocks.includes('apply')) applyBlockers += 1;
      }
      if (check.severity === 'warning') warnings += 1;
    }
  }
  if (summary) {
    const expectedPairs: Array<[string, number]> = [
      ['checks', checks.length],
      ['passed', passed],
      ['failed', failed],
      ['blockers', blockers],
      ['warnings', warnings],
      ['generationBlockers', generationBlockers],
      ['applyBlockers', applyBlockers],
    ];
    for (const [key, expected] of expectedPairs) {
      if (summary[key] !== expected) {
        pushFinding(findings, 'blocker', 'readiness_gate_summary_mismatch', `Readiness gate summary.${key} must match check entries.`, gatePath);
      }
    }
  }
  if (readiness) {
    if (readiness.canStartFrenchGeneration !== (generationBlockers === 0)) {
      pushFinding(findings, 'blocker', 'readiness_gate_generation_boolean_mismatch', 'canStartFrenchGeneration must be true only when generationBlockers is zero.', gatePath);
    }
    if (readiness.canStartProductionApply !== (applyBlockers === 0)) {
      pushFinding(findings, 'blocker', 'readiness_gate_apply_boolean_mismatch', 'canStartProductionApply must be true only when applyBlockers is zero.', gatePath);
    }
  }
  if (decision === 'GO' && generationBlockers > 0) {
    pushFinding(findings, 'blocker', 'readiness_gate_go_with_generation_blockers', 'Readiness gate cannot be GO while generation blockers remain.', gatePath);
  }
}

function validateMigrationAdapterPlan(runDir: string, runId: string | null, findings: Finding[]): void {
  const planPath = path.join(runDir, 'audits', 'migration_adapter_plan.json');
  if (!fs.existsSync(planPath)) return;
  const plan = readJson<Record<string, unknown>>(planPath, findings);
  if (!plan) return;
  if (plan.schemaVersion !== 'gustav-migration-adapter-plan-v0') {
    pushFinding(findings, 'blocker', 'migration_adapter_plan_schema_version', 'Migration adapter plan schemaVersion must be gustav-migration-adapter-plan-v0.', planPath);
  }
  if (runId && plan.runId !== runId) {
    pushFinding(findings, 'blocker', 'migration_adapter_plan_run_id_mismatch', `Migration adapter plan runId ${String(plan.runId)} does not match manifest ${runId}.`, planPath);
  }
  const status = typeof plan.status === 'string' ? plan.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'migration_adapter_plan_status_invalid', `Migration adapter plan status is invalid: ${status}`, planPath);
  }
  const summary = plan.summary && typeof plan.summary === 'object'
    ? plan.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'migration_adapter_plan_summary_missing', 'Migration adapter plan summary must be an object.', planPath);
  } else {
    for (const key of [
      'phases',
      'adapters',
      'blockerAdapters',
      'productModules',
      'sourceFiles',
      'storageKeys',
      'targetStorageRecords',
      'surfaceBlockers',
      'cloudTargetMappings',
      'localCloudDecisions',
    ]) {
      if (typeof summary[key] !== 'number') {
        pushFinding(findings, 'blocker', 'migration_adapter_plan_summary_number_missing', `Migration adapter plan summary.${key} must be a number.`, planPath);
      }
    }
    if (typeof summary.canStartFrenchGenerationAfterPlanOnly !== 'boolean') {
      pushFinding(findings, 'blocker', 'migration_adapter_plan_generation_boolean_missing', 'Migration adapter plan summary.canStartFrenchGenerationAfterPlanOnly must be a boolean.', planPath);
    }
  }
  const phases = Array.isArray(plan.phases) ? plan.phases : null;
  if (!phases || phases.length === 0) {
    pushFinding(findings, 'blocker', 'migration_adapter_plan_phases_missing', 'Migration adapter plan phases must be a non-empty array.', planPath);
  }
  const adapters = Array.isArray(plan.adapters) ? plan.adapters : null;
  if (!adapters || adapters.length === 0) {
    pushFinding(findings, 'blocker', 'migration_adapter_plan_adapters_missing', 'Migration adapter plan adapters must be a non-empty array.', planPath);
    return;
  }
  if (!Array.isArray(plan.highestRiskFiles)) {
    pushFinding(findings, 'blocker', 'migration_adapter_plan_highest_risk_missing', 'Migration adapter plan highestRiskFiles must be an array.', planPath);
  }
  const adapterIds = new Set<string>();
  const productModules = new Set<string>();
  const sourceFiles = new Set<string>();
  const storageKeys = new Set<string>();
  let blockerAdapters = 0;
  for (const rawAdapter of adapters) {
    if (!rawAdapter || typeof rawAdapter !== 'object') {
      pushFinding(findings, 'blocker', 'migration_adapter_entry_invalid', 'Migration adapter entry must be an object.', planPath);
      continue;
    }
    const entry = rawAdapter as Record<string, unknown>;
    const id = typeof entry.id === 'string' ? entry.id : '';
    if (!MIGRATION_ADAPTER_IDS.has(id)) {
      pushFinding(findings, 'blocker', 'migration_adapter_id_invalid', `Migration adapter id is invalid: ${id}`, planPath);
    } else if (adapterIds.has(id)) {
      pushFinding(findings, 'blocker', 'migration_adapter_duplicate_id', `Duplicate migration adapter id: ${id}`, planPath);
    } else {
      adapterIds.add(id);
    }
    if (typeof entry.phase !== 'string' || !entry.phase) {
      pushFinding(findings, 'blocker', 'migration_adapter_phase_missing', 'Migration adapter must include phase.', planPath);
    }
    const adapterStatus = typeof entry.status === 'string' ? entry.status : '';
    if (!REPORT_STATUSES.has(adapterStatus)) {
      pushFinding(findings, 'blocker', 'migration_adapter_status_invalid', `Migration adapter status is invalid: ${adapterStatus}`, planPath);
    }
    const risk = typeof entry.risk === 'string' ? entry.risk : '';
    if (!RISK_LEVELS.has(risk)) {
      pushFinding(findings, 'blocker', 'migration_adapter_risk_invalid', `Migration adapter risk is invalid: ${risk}`, planPath);
    }
    const ownerArea = typeof entry.ownerArea === 'string' ? entry.ownerArea : '';
    if (!MIGRATION_OWNER_AREAS.has(ownerArea)) {
      pushFinding(findings, 'blocker', 'migration_adapter_owner_invalid', `Migration adapter ownerArea is invalid: ${ownerArea}`, planPath);
    }
    for (const key of ['dependsOn', 'productModules', 'coveredSurfaceDomains', 'sourceFiles', 'storageKeys', 'cloudActions', 'implementationSteps', 'testsRequired', 'rollbackNotes', 'blockers']) {
      if (!Array.isArray(entry[key])) {
        pushFinding(findings, 'blocker', 'migration_adapter_array_missing', `Migration adapter ${id || '<unknown>'}.${key} must be an array.`, planPath);
      }
    }
    const dependsOn = Array.isArray(entry.dependsOn) ? entry.dependsOn : [];
    for (const dep of dependsOn) {
      if (typeof dep !== 'string' || !MIGRATION_ADAPTER_IDS.has(dep)) {
        pushFinding(findings, 'blocker', 'migration_adapter_dependency_invalid', `Migration adapter ${id} has invalid dependency: ${String(dep)}`, planPath);
      }
    }
    for (const modulePath of Array.isArray(entry.productModules) ? entry.productModules : []) {
      if (typeof modulePath === 'string' && modulePath) productModules.add(modulePath);
    }
    for (const sourcePath of Array.isArray(entry.sourceFiles) ? entry.sourceFiles : []) {
      if (typeof sourcePath === 'string' && sourcePath) sourceFiles.add(sourcePath);
    }
    for (const key of Array.isArray(entry.storageKeys) ? entry.storageKeys : []) {
      if (typeof key === 'string' && key) storageKeys.add(key);
    }
    const blockers = Array.isArray(entry.blockers) ? entry.blockers : [];
    if (blockers.length > 0) blockerAdapters += 1;
    if (!Array.isArray(entry.implementationSteps) || entry.implementationSteps.length === 0) {
      pushFinding(findings, 'blocker', 'migration_adapter_steps_empty', `Migration adapter ${id || '<unknown>'} must include implementation steps.`, planPath);
    }
    if (!Array.isArray(entry.testsRequired) || entry.testsRequired.length === 0) {
      pushFinding(findings, 'blocker', 'migration_adapter_tests_empty', `Migration adapter ${id || '<unknown>'} must include testsRequired.`, planPath);
    }
  }
  if (phases) {
    const phaseIds = new Set<string>();
    for (const rawPhase of phases) {
      if (!rawPhase || typeof rawPhase !== 'object') {
        pushFinding(findings, 'blocker', 'migration_adapter_phase_invalid', 'Migration adapter phase must be an object.', planPath);
        continue;
      }
      const phase = rawPhase as Record<string, unknown>;
      const id = typeof phase.id === 'string' ? phase.id : '';
      if (!id) {
        pushFinding(findings, 'blocker', 'migration_adapter_phase_id_missing', 'Migration adapter phase must include id.', planPath);
      } else if (phaseIds.has(id)) {
        pushFinding(findings, 'blocker', 'migration_adapter_phase_duplicate', `Duplicate migration adapter phase: ${id}`, planPath);
      } else {
        phaseIds.add(id);
      }
      if (typeof phase.title !== 'string') {
        pushFinding(findings, 'blocker', 'migration_adapter_phase_title_missing', 'Migration adapter phase must include title.', planPath);
      }
      const phaseStatus = typeof phase.status === 'string' ? phase.status : '';
      if (!REPORT_STATUSES.has(phaseStatus)) {
        pushFinding(findings, 'blocker', 'migration_adapter_phase_status_invalid', `Migration adapter phase status is invalid: ${phaseStatus}`, planPath);
      }
      if (!Array.isArray(phase.exitCriteria) || phase.exitCriteria.length === 0) {
        pushFinding(findings, 'blocker', 'migration_adapter_phase_exit_missing', 'Migration adapter phase must include exitCriteria.', planPath);
      }
      for (const adapterId of Array.isArray(phase.adapters) ? phase.adapters : []) {
        if (typeof adapterId !== 'string' || !adapterIds.has(adapterId)) {
          pushFinding(findings, 'blocker', 'migration_adapter_phase_adapter_invalid', `Migration adapter phase ${id} references invalid adapter: ${String(adapterId)}`, planPath);
        }
      }
    }
  }
  if (summary) {
    const expectedPairs: Array<[string, number]> = [
      ['phases', phases?.length ?? 0],
      ['adapters', adapters.length],
      ['blockerAdapters', blockerAdapters],
      ['productModules', productModules.size],
      ['sourceFiles', sourceFiles.size],
      ['storageKeys', storageKeys.size],
    ];
    for (const [key, expected] of expectedPairs) {
      if (summary[key] !== expected) {
        pushFinding(findings, 'blocker', 'migration_adapter_summary_mismatch', `Migration adapter plan summary.${key} must match entries.`, planPath);
      }
    }
  }
  if (plan.status === 'PASS' && blockerAdapters > 0) {
    pushFinding(findings, 'blocker', 'migration_adapter_pass_with_blockers', 'Migration adapter plan cannot be PASS while blocker adapters remain.', planPath);
  }
}

function validateSourceGraph(runDir: string, runId: string | null, findings: Finding[]): void {
  const graphPath = path.join(runDir, 'source_graph', 'source_graph.json');
  if (!fs.existsSync(graphPath)) return;
  const graph = readJson<Record<string, unknown>>(graphPath, findings);
  if (!graph) return;
  if (graph.schemaVersion !== 'gustav-source-graph-v0') {
    pushFinding(findings, 'blocker', 'source_graph_schema_version', 'Source graph schemaVersion must be gustav-source-graph-v0.', graphPath);
  }
  if (runId && graph.runId !== runId) {
    pushFinding(findings, 'blocker', 'source_graph_run_id_mismatch', `Source graph runId ${String(graph.runId)} does not match manifest ${runId}.`, graphPath);
  }
  const status = typeof graph.status === 'string' ? graph.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'source_graph_status_invalid', `Source graph status is invalid: ${status}`, graphPath);
  }
  if (graph.baseStudyTarget !== 'en') {
    pushFinding(findings, 'blocker', 'source_graph_base_target_invalid', 'Source graph baseStudyTarget must be en.', graphPath);
  }

  const arrayFields = [
    'sourceFiles',
    'generatedFiles',
    'lessons',
    'introScreens',
    'phrases',
    'words',
    'quizzes',
    'prepositionPacks',
    'flashcards',
    'dailyPhrases',
    'personalPractice',
    'surfaces',
    'unresolved',
  ];
  for (const field of arrayFields) {
    if (!Array.isArray(graph[field])) {
      pushFinding(findings, 'blocker', 'source_graph_array_missing', `Source graph ${field} must be an array.`, graphPath);
    }
  }

  const validation = graph.validation && typeof graph.validation === 'object'
    ? graph.validation as Record<string, unknown>
    : null;
  if (!validation) {
    pushFinding(findings, 'blocker', 'source_graph_validation_missing', 'Source graph validation must be an object.', graphPath);
    return;
  }
  const verdict = typeof validation.verdict === 'string' ? validation.verdict : '';
  if (!REPORT_STATUSES.has(verdict)) {
    pushFinding(findings, 'blocker', 'source_graph_validation_verdict_invalid', `Source graph validation verdict is invalid: ${verdict}`, graphPath);
  }

  const expectedCounts: Array<[string, string]> = [
    ['totalLessons', 'lessons'],
    ['totalPhrases', 'phrases'],
    ['totalWords', 'words'],
    ['totalIntroScreens', 'introScreens'],
    ['totalQuizzes', 'quizzes'],
    ['totalPrepositionPacks', 'prepositionPacks'],
    ['totalFlashcards', 'flashcards'],
    ['totalDailyPhrases', 'dailyPhrases'],
    ['totalPersonalPracticeNodes', 'personalPractice'],
    ['totalSurfaces', 'surfaces'],
  ];
  for (const [summaryKey, arrayKey] of expectedCounts) {
    if (typeof validation[summaryKey] !== 'number') {
      pushFinding(findings, 'blocker', 'source_graph_validation_number_missing', `Source graph validation.${summaryKey} must be a number.`, graphPath);
      continue;
    }
    const arr = Array.isArray(graph[arrayKey]) ? graph[arrayKey] as unknown[] : [];
    if (validation[summaryKey] !== arr.length) {
      pushFinding(findings, 'blocker', 'source_graph_validation_count_mismatch', `Source graph validation.${summaryKey} must match ${arrayKey}.length.`, graphPath);
    }
  }
  for (const key of ['unresolvedBlockers', 'unresolvedHighRisks', 'generatedFileUnknowns', 'sourceLocaleTargetConfusions']) {
    if (typeof validation[key] !== 'number') {
      pushFinding(findings, 'blocker', 'source_graph_validation_number_missing', `Source graph validation.${key} must be a number.`, graphPath);
    }
  }

  const lessons = Array.isArray(graph.lessons) ? graph.lessons as Array<Record<string, unknown>> : [];
  const lessonIds = new Set<number>();
  for (const lesson of lessons) {
    const lessonId = typeof lesson.lessonId === 'number' ? lesson.lessonId : null;
    if (!lessonId || lessonId < 1 || lessonId > 32) {
      pushFinding(findings, 'blocker', 'source_graph_lesson_id_invalid', 'Source graph lessons must have lessonId 1-32.', graphPath);
      continue;
    }
    if (lessonIds.has(lessonId)) {
      pushFinding(findings, 'blocker', 'source_graph_lesson_duplicate', `Duplicate source graph lessonId: ${lessonId}.`, graphPath);
    }
    lessonIds.add(lessonId);
    for (const key of ['phraseIds', 'introScreenIds', 'quizIds', 'prepositionPackIds', 'wordIds']) {
      if (!Array.isArray(lesson[key])) {
        pushFinding(findings, 'blocker', 'source_graph_lesson_array_missing', `Source graph lesson ${lessonId}.${key} must be an array.`, graphPath);
      }
    }
  }
  if (lessons.length !== 32) {
    pushFinding(findings, 'blocker', 'source_graph_lesson_count_invalid', 'Source graph must include 32 lesson nodes.', graphPath);
  }

  const phrases = Array.isArray(graph.phrases) ? graph.phrases as Array<Record<string, unknown>> : [];
  const phraseIds = new Set<string>();
  for (const phrase of phrases) {
    const id = typeof phrase.id === 'string' ? phrase.id : '';
    if (!id) {
      pushFinding(findings, 'blocker', 'source_graph_phrase_id_missing', 'Source graph phrase id must be a string.', graphPath);
      continue;
    }
    if (phraseIds.has(id)) {
      pushFinding(findings, 'blocker', 'source_graph_phrase_duplicate', `Duplicate source graph phrase id: ${id}.`, graphPath);
    }
    phraseIds.add(id);
    if (typeof phrase.targetText !== 'string' || !phrase.targetText) {
      pushFinding(findings, 'blocker', 'source_graph_phrase_target_missing', `Source graph phrase ${id} must include targetText.`, graphPath);
    }
    if (!Array.isArray(phrase.wordIds)) {
      pushFinding(findings, 'blocker', 'source_graph_phrase_words_missing', `Source graph phrase ${id}.wordIds must be an array.`, graphPath);
    }
  }

  const unresolved = Array.isArray(graph.unresolved) ? graph.unresolved as Array<Record<string, unknown>> : [];
  const unresolvedBlockers = unresolved.filter((item) => item.severity === 'blocker').length;
  const unresolvedHighRisks = unresolved.filter((item) => item.severity === 'high').length;
  if (validation.unresolvedBlockers !== unresolvedBlockers) {
    pushFinding(findings, 'blocker', 'source_graph_unresolved_blocker_count_mismatch', 'Source graph unresolvedBlockers must match unresolved entries.', graphPath);
  }
  if (validation.unresolvedHighRisks !== unresolvedHighRisks) {
    pushFinding(findings, 'blocker', 'source_graph_unresolved_high_count_mismatch', 'Source graph unresolvedHighRisks must match unresolved entries.', graphPath);
  }
  if (graph.status === 'PASS' && (validation.verdict !== 'PASS' || unresolvedBlockers > 0)) {
    pushFinding(findings, 'blocker', 'source_graph_pass_with_unresolved', 'Source graph cannot be PASS while validation is not PASS or unresolved blockers remain.', graphPath);
  }
}

function validateSourceGraphQualityAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'source_graph_quality_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-source-graph-quality-audit-v0') {
    pushFinding(findings, 'blocker', 'source_graph_quality_schema_version', 'Source graph quality audit schemaVersion must be gustav-source-graph-quality-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'source_graph_quality_run_id_mismatch', `Source graph quality audit runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'source_graph_quality_status_invalid', `Source graph quality audit status is invalid: ${status}`, auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'source_graph_quality_summary_missing', 'Source graph quality audit summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'checks',
    'blockers',
    'highRisks',
    'mediumRisks',
    'lessons',
    'phrases',
    'words',
    'introScreens',
    'quizzes',
    'flashcards',
    'dailyPhrases',
    'personalPracticeNodes',
    'generalQuizItems',
    'generatedFiles',
    'generatedPhraseEntries',
    'lessonsWithoutIntro',
    'lessonsWithNonStandardPhraseCount',
    'emptyPhraseTargets',
    'phraseSourcePromptGaps',
    'quizShapeGaps',
    'flashcardPromptGaps',
    'dailyPhrasePromptGaps',
    'personalPracticeSourceGaps',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'source_graph_quality_summary_number_missing', `Source graph quality audit summary.${key} must be a number.`, auditPath);
    }
  }
  if (typeof summary.canApproveForFrenchGeneration !== 'boolean') {
    pushFinding(findings, 'blocker', 'source_graph_quality_approval_boolean_missing', 'Source graph quality audit summary.canApproveForFrenchGeneration must be boolean.', auditPath);
  }
  const findingsArray = Array.isArray(audit.findings) ? audit.findings as Array<Record<string, unknown>> : null;
  if (!findingsArray) {
    pushFinding(findings, 'blocker', 'source_graph_quality_findings_missing', 'Source graph quality audit findings must be an array.', auditPath);
  }
  const lessonCoverage = Array.isArray(audit.lessonCoverage) ? audit.lessonCoverage as Array<Record<string, unknown>> : null;
  if (!lessonCoverage) {
    pushFinding(findings, 'blocker', 'source_graph_quality_lesson_coverage_missing', 'Source graph quality audit lessonCoverage must be an array.', auditPath);
  } else {
    if (lessonCoverage.length !== 32) {
      pushFinding(findings, 'blocker', 'source_graph_quality_lesson_coverage_count', 'Source graph quality audit lessonCoverage must include 32 lessons.', auditPath);
    }
    for (const lesson of lessonCoverage) {
      const lessonId = typeof lesson.lessonId === 'number' ? lesson.lessonId : 0;
      if (lessonId < 1 || lessonId > 32) {
        pushFinding(findings, 'blocker', 'source_graph_quality_lesson_id_invalid', `Invalid lessonCoverage lessonId: ${lessonId}`, auditPath);
      }
      for (const key of ['phrases', 'words', 'introScreens', 'quizzes', 'prepositionPacks', 'generatedPhrases']) {
        if (typeof lesson[key] !== 'number') {
          pushFinding(findings, 'blocker', 'source_graph_quality_lesson_number_missing', `lessonCoverage ${lessonId}.${key} must be a number.`, auditPath);
        }
      }
      const lessonStatus = typeof lesson.status === 'string' ? lesson.status : '';
      if (!REPORT_STATUSES.has(lessonStatus)) {
        pushFinding(findings, 'blocker', 'source_graph_quality_lesson_status_invalid', `lessonCoverage ${lessonId}.status is invalid.`, auditPath);
      }
      if (!Array.isArray(lesson.blockers)) {
        pushFinding(findings, 'blocker', 'source_graph_quality_lesson_blockers_missing', `lessonCoverage ${lessonId}.blockers must be an array.`, auditPath);
      }
    }
  }
  const policy = audit.sourceTruthPolicy && typeof audit.sourceTruthPolicy === 'object'
    ? audit.sourceTruthPolicy as Record<string, unknown>
    : null;
  if (!policy) {
    pushFinding(findings, 'blocker', 'source_graph_quality_policy_missing', 'Source graph quality audit sourceTruthPolicy must be an object.', auditPath);
  } else {
    if (typeof policy.generatedRuntimeFilesAllowedAsEvidence !== 'boolean') {
      pushFinding(findings, 'blocker', 'source_graph_quality_policy_boolean_missing', 'sourceTruthPolicy.generatedRuntimeFilesAllowedAsEvidence must be boolean.', auditPath);
    }
    if (typeof policy.generatedRuntimeFilesAllowedAsFrenchSourceTruth !== 'boolean') {
      pushFinding(findings, 'blocker', 'source_graph_quality_policy_boolean_missing', 'sourceTruthPolicy.generatedRuntimeFilesAllowedAsFrenchSourceTruth must be boolean.', auditPath);
    }
    if (!Array.isArray(policy.requiredBeforeApproval)) {
      pushFinding(findings, 'blocker', 'source_graph_quality_policy_required_missing', 'sourceTruthPolicy.requiredBeforeApproval must be an array.', auditPath);
    }
  }
  if (audit.status === 'PASS' && (summary.blockers !== 0 || summary.highRisks !== 0 || summary.canApproveForFrenchGeneration !== true)) {
    pushFinding(findings, 'blocker', 'source_graph_quality_pass_with_risks', 'Source graph quality audit cannot be PASS while blockers/high risks remain or approval is false.', auditPath);
  }
}

function validateGeneratedSourceTruthAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'generated_source_truth_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-generated-source-truth-audit-v0') {
    pushFinding(findings, 'blocker', 'generated_source_truth_schema_version', 'Generated source-truth audit schemaVersion must be gustav-generated-source-truth-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'generated_source_truth_run_id_mismatch', `Generated source-truth audit runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'generated_source_truth_status_invalid', `Generated source-truth audit status is invalid: ${status}`, auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'generated_source_truth_summary_missing', 'Generated source-truth audit summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'artifacts',
    'phraseRuntimeArtifacts',
    'supportRuntimeArtifacts',
    'usedAsPhraseSourceInGraph',
    'generatedPhraseEntries',
    'canonicalSourceAvailable',
    'runtimeEvidenceOnly',
    'blockedMissingCanonicalSource',
    'blockers',
    'highRisks',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'generated_source_truth_summary_number_missing', `Generated source-truth audit summary.${key} must be a number.`, auditPath);
    }
  }
  if (typeof summary.canApproveGeneratedRuntimeAsFrenchSourceTruth !== 'boolean') {
    pushFinding(findings, 'blocker', 'generated_source_truth_approval_boolean_missing', 'Generated source-truth audit summary.canApproveGeneratedRuntimeAsFrenchSourceTruth must be boolean.', auditPath);
  }
  const artifacts = Array.isArray(audit.artifacts) ? audit.artifacts as Array<Record<string, unknown>> : null;
  if (!artifacts) {
    pushFinding(findings, 'blocker', 'generated_source_truth_artifacts_missing', 'Generated source-truth audit artifacts must be an array.', auditPath);
  } else {
    if (summary.artifacts !== artifacts.length) {
      pushFinding(findings, 'blocker', 'generated_source_truth_artifact_count_mismatch', 'Generated source-truth audit summary.artifacts must match artifacts.length.', auditPath);
    }
    for (const artifact of artifacts) {
      const file = typeof artifact.file === 'string' ? artifact.file : '';
      if (!file) {
        pushFinding(findings, 'blocker', 'generated_source_truth_artifact_file_missing', 'Generated source-truth artifact file must be a string.', auditPath);
      }
      const role = typeof artifact.role === 'string' ? artifact.role : '';
      if (role !== 'phrase_runtime' && role !== 'support_runtime') {
        pushFinding(findings, 'blocker', 'generated_source_truth_artifact_role_invalid', `Generated source-truth artifact ${file}.role is invalid.`, auditPath);
      }
      const decision = typeof artifact.decision === 'string' ? artifact.decision : '';
      if (!['canonical_source_available', 'runtime_evidence_only', 'blocked_missing_canonical_source'].includes(decision)) {
        pushFinding(findings, 'blocker', 'generated_source_truth_decision_invalid', `Generated source-truth artifact ${file}.decision is invalid.`, auditPath);
      }
      const severity = typeof artifact.severity === 'string' ? artifact.severity : '';
      if (!RISK_LEVELS.has(severity)) {
        pushFinding(findings, 'blocker', 'generated_source_truth_severity_invalid', `Generated source-truth artifact ${file}.severity is invalid.`, auditPath);
      }
      for (const key of ['sourceCandidates', 'sourceCandidatesExist', 'blockers', 'notes']) {
        if (!Array.isArray(artifact[key])) {
          pushFinding(findings, 'blocker', 'generated_source_truth_artifact_array_missing', `Generated source-truth artifact ${file}.${key} must be an array.`, auditPath);
        }
      }
      for (const key of ['generatorExists', 'importsGeneratedRuntime', 'usedAsPhraseSourceInGraph']) {
        if (typeof artifact[key] !== 'boolean') {
          pushFinding(findings, 'blocker', 'generated_source_truth_artifact_boolean_missing', `Generated source-truth artifact ${file}.${key} must be boolean.`, auditPath);
        }
      }
      if (typeof artifact.generatedPhraseEntries !== 'number') {
        pushFinding(findings, 'blocker', 'generated_source_truth_artifact_number_missing', `Generated source-truth artifact ${file}.generatedPhraseEntries must be number.`, auditPath);
      }
    }
  }
  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'generated_source_truth_findings_missing', 'Generated source-truth audit findings must be an array.', auditPath);
  }
  const policy = audit.policy && typeof audit.policy === 'object'
    ? audit.policy as Record<string, unknown>
    : null;
  if (!policy) {
    pushFinding(findings, 'blocker', 'generated_source_truth_policy_missing', 'Generated source-truth audit policy must be an object.', auditPath);
  } else {
    for (const key of ['allowedEvidenceUse', 'forbiddenUse', 'requiredBeforeFrenchGeneration']) {
      if (!Array.isArray(policy[key])) {
        pushFinding(findings, 'blocker', 'generated_source_truth_policy_array_missing', `Generated source-truth audit policy.${key} must be an array.`, auditPath);
      }
    }
  }
  if (audit.status === 'PASS' && (summary.blockers !== 0 || summary.highRisks !== 0 || summary.canApproveGeneratedRuntimeAsFrenchSourceTruth !== true)) {
    pushFinding(findings, 'blocker', 'generated_source_truth_pass_with_risks', 'Generated source-truth audit cannot be PASS while blockers/high risks remain or approval is false.', auditPath);
  }
}

function validateGeneratedSupportIsolationAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'generated_support_isolation_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-generated-support-isolation-audit-v0') {
    pushFinding(findings, 'blocker', 'generated_support_isolation_schema_version', 'Generated support isolation audit schemaVersion must be gustav-generated-support-isolation-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'generated_support_isolation_run_id_mismatch', `Generated support isolation audit runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'generated_support_isolation_status_invalid', `Generated support isolation audit status is invalid: ${status}`, auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'generated_support_isolation_summary_missing', 'Generated support isolation audit summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'generatedSupportFiles',
    'referencedInSourceGraph',
    'listedAsSourceFiles',
    'isolatedSupportFiles',
    'blockers',
    'highRisks',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'generated_support_isolation_summary_number_missing', `Generated support isolation audit summary.${key} must be a number.`, auditPath);
    }
  }
  if (typeof summary.canExcludeFromFrenchSourceTruth !== 'boolean') {
    pushFinding(findings, 'blocker', 'generated_support_isolation_approval_boolean_missing', 'Generated support isolation audit summary.canExcludeFromFrenchSourceTruth must be boolean.', auditPath);
  }
  const decisions = Array.isArray(audit.decisions) ? audit.decisions as Array<Record<string, unknown>> : null;
  if (!decisions) {
    pushFinding(findings, 'blocker', 'generated_support_isolation_decisions_missing', 'Generated support isolation audit decisions must be an array.', auditPath);
  } else {
    if (summary.generatedSupportFiles !== decisions.length) {
      pushFinding(findings, 'blocker', 'generated_support_isolation_decision_count_mismatch', 'Generated support isolation summary.generatedSupportFiles must match decisions.length.', auditPath);
    }
    for (const decision of decisions) {
      const file = typeof decision.file === 'string' ? decision.file : '';
      if (!file) {
        pushFinding(findings, 'blocker', 'generated_support_isolation_file_missing', 'Generated support isolation decision.file must be a string.', auditPath);
      }
      if (!Array.isArray(decision.sourceRefUses)) {
        pushFinding(findings, 'blocker', 'generated_support_isolation_refs_missing', `Generated support isolation ${file}.sourceRefUses must be an array.`, auditPath);
      }
      for (const key of ['listedAsSourceFile', 'isolatedFromSourceGraph']) {
        if (typeof decision[key] !== 'boolean') {
          pushFinding(findings, 'blocker', 'generated_support_isolation_decision_boolean_missing', `Generated support isolation ${file}.${key} must be boolean.`, auditPath);
        }
      }
      const decisionValue = typeof decision.decision === 'string' ? decision.decision : '';
      if (!['exclude_from_french_source_truth', 'blocked_source_graph_reference'].includes(decisionValue)) {
        pushFinding(findings, 'blocker', 'generated_support_isolation_decision_invalid', `Generated support isolation ${file}.decision is invalid.`, auditPath);
      }
    }
  }
  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'generated_support_isolation_findings_missing', 'Generated support isolation audit findings must be an array.', auditPath);
  }
  if (audit.status === 'PASS' && (summary.blockers !== 0 || summary.highRisks !== 0 || summary.canExcludeFromFrenchSourceTruth !== true)) {
    pushFinding(findings, 'blocker', 'generated_support_isolation_pass_with_risks', 'Generated support isolation audit cannot be PASS while blockers/high risks remain or approval is false.', auditPath);
  }
}

function validateSourceGraphApprovalAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'source_graph_approval_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-source-graph-approval-audit-v0') {
    pushFinding(findings, 'blocker', 'source_graph_approval_schema_version', 'Source graph approval audit schemaVersion must be gustav-source-graph-approval-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'source_graph_approval_run_id_mismatch', `Source graph approval audit runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'source_graph_approval_status_invalid', `Source graph approval audit status is invalid: ${status}`, auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'source_graph_approval_summary_missing', 'Source graph approval audit summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'checks',
    'blockers',
    'highRisks',
    'lessons',
    'phrases',
    'introScreens',
    'quizzes',
    'flashcards',
    'dailyPhrases',
    'personalPracticeNodes',
    'runtimeGeneratedPhraseRefs',
    'sourceLocaleTargetConfusions',
    'unsupportedUnresolvedBlockers',
    'unsupportedHighRisks',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'source_graph_approval_summary_number_missing', `Source graph approval audit summary.${key} must be a number.`, auditPath);
    }
  }
  for (const key of [
    'lessonCoveragePass',
    'ruUkPromptCoveragePass',
    'generatedSourceTruthPass',
    'generatedSupportIsolationPass',
    'lesson916ApprovalPass',
    'canApproveSourceGraphForFrenchGenerationInput',
    'mayStartFrenchGeneration',
    'mayModifyProductionAppFiles',
  ]) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'source_graph_approval_summary_boolean_missing', `Source graph approval audit summary.${key} must be boolean.`, auditPath);
    }
  }
  const approval = audit.approval && typeof audit.approval === 'object'
    ? audit.approval as Record<string, unknown>
    : null;
  if (!approval) {
    pushFinding(findings, 'blocker', 'source_graph_approval_record_missing', 'Source graph approval audit approval must be an object.', auditPath);
  } else {
    if (typeof approval.approved !== 'boolean') {
      pushFinding(findings, 'blocker', 'source_graph_approval_boolean_missing', 'Source graph approval audit approval.approved must be boolean.', auditPath);
    }
    if (approval.scope !== 'source_graph_input_only') {
      pushFinding(findings, 'blocker', 'source_graph_approval_scope_invalid', 'Source graph approval scope must be source_graph_input_only.', auditPath);
    }
    for (const key of ['allowedUse', 'forbiddenUse', 'stillRequiredBeforeFrenchGeneration']) {
      if (!Array.isArray(approval[key])) {
        pushFinding(findings, 'blocker', 'source_graph_approval_array_missing', `Source graph approval.${key} must be an array.`, auditPath);
      }
    }
  }
  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'source_graph_approval_findings_missing', 'Source graph approval audit findings must be an array.', auditPath);
  }
  const mirrorPath = path.join(runDir, 'source_graph', 'source_graph_approval.json');
  if (!fs.existsSync(mirrorPath)) {
    pushFinding(findings, 'blocker', 'source_graph_approval_mirror_missing', 'source_graph/source_graph_approval.json must exist.', auditPath);
  }
  if (audit.status === 'PASS' && (
    summary.blockers !== 0 ||
    summary.highRisks !== 0 ||
    summary.canApproveSourceGraphForFrenchGenerationInput !== true ||
    summary.mayStartFrenchGeneration !== false ||
    summary.mayModifyProductionAppFiles !== false ||
    !approval ||
    approval.approved !== true
  )) {
    pushFinding(findings, 'blocker', 'source_graph_approval_pass_with_risks', 'Source graph approval audit cannot be PASS while risks remain or safety flags are open.', auditPath);
  }
}

function validateApplyPlan(runDir: string, runId: string | null, findings: Finding[]): void {
  const planPath = path.join(runDir, 'apply_plan', 'file_changes.json');
  if (!fs.existsSync(planPath)) return;
  const plan = readJson<Record<string, unknown>>(planPath, findings);
  if (!plan) return;
  if (plan.schemaVersion !== 'gustav-apply-file-changes-v0') {
    pushFinding(findings, 'blocker', 'apply_plan_schema_version', 'Apply plan schemaVersion must be gustav-apply-file-changes-v0.', planPath);
  }
  if (runId && plan.sourceRunId !== runId) {
    pushFinding(findings, 'blocker', 'apply_plan_run_id_mismatch', `Apply plan sourceRunId ${String(plan.sourceRunId)} does not match manifest ${runId}.`, planPath);
  }
  const status = typeof plan.status === 'string' ? plan.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'apply_plan_status_invalid', `Apply plan status is invalid: ${status}`, planPath);
  }
  const approvalStatus = typeof plan.approvalStatus === 'string' ? plan.approvalStatus : '';
  if (!['not_requested', 'approved', 'rejected'].includes(approvalStatus)) {
    pushFinding(findings, 'blocker', 'apply_plan_approval_status_invalid', `Apply plan approvalStatus is invalid: ${approvalStatus}`, planPath);
  }
  if (typeof plan.mayModifyProductionAppFiles !== 'boolean') {
    pushFinding(findings, 'blocker', 'apply_plan_modify_flag_missing', 'Apply plan mayModifyProductionAppFiles must be boolean.', planPath);
  }
  if (typeof plan.mayStartFrenchGeneration !== 'boolean') {
    pushFinding(findings, 'blocker', 'apply_plan_generation_flag_missing', 'Apply plan mayStartFrenchGeneration must be boolean.', planPath);
  }
  const summary = plan.summary && typeof plan.summary === 'object'
    ? plan.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'apply_plan_summary_missing', 'Apply plan summary must be an object.', planPath);
    return;
  }
  for (const key of ['files', 'add', 'modify', 'delete', 'productionFiles', 'testFiles', 'dirtyWorktreeFiles', 'dirtyWorktreeOverlaps', 'phases', 'adapters', 'blockers', 'highRisks']) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'apply_plan_summary_number_missing', `Apply plan summary.${key} must be a number.`, planPath);
    }
  }
  const files = Array.isArray(plan.files) ? plan.files as Array<Record<string, unknown>> : null;
  if (!files) {
    pushFinding(findings, 'blocker', 'apply_plan_files_missing', 'Apply plan files must be an array.', planPath);
  } else {
    if (summary.files !== files.length) {
      pushFinding(findings, 'blocker', 'apply_plan_file_count_mismatch', 'Apply plan summary.files must match files.length.', planPath);
    }
    const seen = new Set<string>();
    for (const file of files) {
      const filePath = typeof file.path === 'string' ? file.path : '';
      if (!filePath) {
        pushFinding(findings, 'blocker', 'apply_plan_file_path_missing', 'Apply plan file.path must be a string.', planPath);
        continue;
      }
      if (seen.has(filePath)) {
        pushFinding(findings, 'blocker', 'apply_plan_duplicate_file', `Apply plan contains duplicate file: ${filePath}.`, planPath);
      }
      seen.add(filePath);
      const action = typeof file.action === 'string' ? file.action : '';
      if (!['add', 'modify', 'delete'].includes(action)) {
        pushFinding(findings, 'blocker', 'apply_plan_file_action_invalid', `Apply plan ${filePath}.action is invalid.`, planPath);
      }
      const ownerArea = typeof file.ownerArea === 'string' ? file.ownerArea : '';
      if (!['course', 'quiz', 'source_locale', 'study_target', 'trainer', 'personal_practice', 'storage', 'ui', 'heisenberg', 'tests', 'admin', 'unknown'].includes(ownerArea)) {
        pushFinding(findings, 'blocker', 'apply_plan_file_owner_invalid', `Apply plan ${filePath}.ownerArea is invalid.`, planPath);
      }
      if (ownerArea === 'unknown') {
        pushFinding(findings, 'blocker', 'apply_plan_file_owner_unknown', `Apply plan ${filePath} has ownerArea unknown.`, planPath);
      }
      const risk = typeof file.risk === 'string' ? file.risk : '';
      if (!['low', 'medium', 'high', 'blocker'].includes(risk)) {
        pushFinding(findings, 'blocker', 'apply_plan_file_risk_invalid', `Apply plan ${filePath}.risk is invalid.`, planPath);
      }
      for (const key of ['adapters', 'testsRequired']) {
        if (!Array.isArray(file[key])) {
          pushFinding(findings, 'blocker', 'apply_plan_file_array_missing', `Apply plan ${filePath}.${key} must be an array.`, planPath);
        }
      }
      for (const key of ['reason', 'sourceArtifactPath', 'rollbackAction']) {
        if (typeof file[key] !== 'string' || !file[key]) {
          pushFinding(findings, 'blocker', 'apply_plan_file_string_missing', `Apply plan ${filePath}.${key} must be a non-empty string.`, planPath);
        }
      }
      if (typeof file.dirtyWorktreeOverlap !== 'boolean') {
        pushFinding(findings, 'blocker', 'apply_plan_file_dirty_boolean_missing', `Apply plan ${filePath}.dirtyWorktreeOverlap must be boolean.`, planPath);
      }
    }
  }
  for (const required of ['APPLY_PLAN.md', 'migration_plan.md', 'rollback_plan.md', 'tests_required.md', 'heisenberg_impact.md', 'english_regression_risk.md']) {
    if (!fs.existsSync(path.join(runDir, 'apply_plan', required))) {
      pushFinding(findings, 'blocker', 'apply_plan_required_doc_missing', `Apply plan document is missing: ${required}.`, planPath);
    }
  }
  if (approvalStatus !== 'approved' && (plan.status === 'PASS' || plan.mayModifyProductionAppFiles === true || plan.mayStartFrenchGeneration === true)) {
    pushFinding(findings, 'blocker', 'apply_plan_unapproved_open_flags', 'Unapproved apply plan cannot be PASS or enable production writes/generation.', planPath);
  }
  if (approvalStatus === 'approved' && (typeof plan.approvedBy !== 'string' || typeof plan.approvedAt !== 'string')) {
    pushFinding(findings, 'blocker', 'apply_plan_approval_record_missing', 'Approved apply plan must include approvedBy and approvedAt.', planPath);
  }
}

function validateDirtyOverlapPreservationAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'apply_plan', 'dirty_overlap_preservation_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-dirty-overlap-preservation-audit-v0') {
    pushFinding(findings, 'blocker', 'dirty_overlap_schema_version', 'Dirty overlap preservation audit schemaVersion must be gustav-dirty-overlap-preservation-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'dirty_overlap_run_id_mismatch', `Dirty overlap preservation audit runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'dirty_overlap_status_invalid', `Dirty overlap preservation audit status is invalid: ${status}`, auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'dirty_overlap_summary_missing', 'Dirty overlap preservation audit summary must be an object.', auditPath);
    return;
  }
  for (const key of ['plannedDirtyOverlaps', 'reviewedOverlaps', 'currentlyDirtyOverlaps', 'noLongerDirtyOverlaps', 'missingFiles', 'totalDiffAddedLines', 'totalDiffDeletedLines', 'blockers', 'highRisks']) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'dirty_overlap_summary_number_missing', `Dirty overlap preservation audit summary.${key} must be a number.`, auditPath);
    }
  }
  for (const key of ['canPreserveDirtyWorktree', 'mayModifyProductionAppFiles']) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'dirty_overlap_summary_boolean_missing', `Dirty overlap preservation audit summary.${key} must be boolean.`, auditPath);
    }
  }
  const decisions = Array.isArray(audit.decisions) ? audit.decisions as Array<Record<string, unknown>> : null;
  if (!decisions) {
    pushFinding(findings, 'blocker', 'dirty_overlap_decisions_missing', 'Dirty overlap preservation audit decisions must be an array.', auditPath);
  } else {
    if (summary.reviewedOverlaps !== decisions.length) {
      pushFinding(findings, 'blocker', 'dirty_overlap_decision_count_mismatch', 'Dirty overlap summary.reviewedOverlaps must match decisions.length.', auditPath);
    }
    for (const decision of decisions) {
      const filePath = typeof decision.path === 'string' ? decision.path : '';
      if (!filePath) {
        pushFinding(findings, 'blocker', 'dirty_overlap_decision_path_missing', 'Dirty overlap decision.path must be a string.', auditPath);
      }
      for (const key of ['currentlyDirty', 'exists']) {
        if (typeof decision[key] !== 'boolean') {
          pushFinding(findings, 'blocker', 'dirty_overlap_decision_boolean_missing', `Dirty overlap ${filePath}.${key} must be boolean.`, auditPath);
        }
      }
      for (const key of ['lineCount', 'diffAddedLines', 'diffDeletedLines']) {
        if (typeof decision[key] !== 'number') {
          pushFinding(findings, 'blocker', 'dirty_overlap_decision_number_missing', `Dirty overlap ${filePath}.${key} must be number.`, auditPath);
        }
      }
      if (!Array.isArray(decision.strategy) || !Array.isArray(decision.requiredBeforeEdit)) {
        pushFinding(findings, 'blocker', 'dirty_overlap_decision_arrays_missing', `Dirty overlap ${filePath} must include strategy and requiredBeforeEdit arrays.`, auditPath);
      }
    }
  }
  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'dirty_overlap_findings_missing', 'Dirty overlap preservation audit findings must be an array.', auditPath);
  }
  if (audit.status === 'PASS' && (summary.blockers !== 0 || summary.highRisks !== 0 || summary.canPreserveDirtyWorktree !== true || summary.mayModifyProductionAppFiles !== false)) {
    pushFinding(findings, 'blocker', 'dirty_overlap_pass_with_risks', 'Dirty overlap preservation audit cannot be PASS while risks remain or production writes are enabled.', auditPath);
  }
}

function validateReadinessApplyCoverageAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'readiness_apply_coverage_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-readiness-apply-coverage-audit-v0') {
    pushFinding(findings, 'blocker', 'readiness_apply_coverage_schema_version', 'Readiness apply coverage audit schemaVersion must be gustav-readiness-apply-coverage-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'readiness_apply_coverage_run_id_mismatch', `Readiness apply coverage audit runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'readiness_apply_coverage_status_invalid', `Readiness apply coverage audit status is invalid: ${status}`, auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'readiness_apply_coverage_summary_missing', 'Readiness apply coverage audit summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'failedReadinessChecks',
    'planRequiredChecks',
    'coveredChecks',
    'deferredChecks',
    'missingChecks',
    'requiredAdapters',
    'coveredAdapters',
    'missingAdapters',
    'applyPlanFilesReferenced',
    'requiredTestEvidence',
    'coveredTestEvidence',
    'missingTestEvidence',
    'requiredFileEvidence',
    'coveredFileEvidence',
    'missingFileEvidence',
    'blockers',
    'warnings',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'readiness_apply_coverage_summary_number_missing', `Readiness apply coverage audit summary.${key} must be a number.`, auditPath);
    }
  }
  for (const key of ['applyPlanCoversFailedReadinessChecks', 'mayStartFrenchGeneration', 'mayModifyProductionAppFiles']) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'readiness_apply_coverage_summary_boolean_missing', `Readiness apply coverage audit summary.${key} must be boolean.`, auditPath);
    }
  }
  const decisions = Array.isArray(audit.decisions) ? audit.decisions as Array<Record<string, unknown>> : null;
  if (!decisions) {
    pushFinding(findings, 'blocker', 'readiness_apply_coverage_decisions_missing', 'Readiness apply coverage audit decisions must be an array.', auditPath);
  } else {
    if (summary.failedReadinessChecks !== decisions.length) {
      pushFinding(findings, 'blocker', 'readiness_apply_coverage_decision_count_mismatch', 'Readiness apply coverage summary.failedReadinessChecks must match decisions.length.', auditPath);
    }
    let covered = 0;
    let deferred = 0;
    let missing = 0;
    for (const decision of decisions) {
      const checkId = typeof decision.checkId === 'string' ? decision.checkId : '';
      if (!checkId) {
        pushFinding(findings, 'blocker', 'readiness_apply_coverage_check_id_missing', 'Readiness apply coverage decision.checkId must be a string.', auditPath);
      }
      if (typeof decision.title !== 'string' || typeof decision.sourceArtifact !== 'string' || typeof decision.note !== 'string') {
        pushFinding(findings, 'blocker', 'readiness_apply_coverage_text_missing', `Readiness apply coverage ${checkId || '<unknown>'} must include title, sourceArtifact and note.`, auditPath);
      }
      const coverageStatus = typeof decision.coverageStatus === 'string' ? decision.coverageStatus : '';
      if (!['covered', 'deferred', 'missing'].includes(coverageStatus)) {
        pushFinding(findings, 'blocker', 'readiness_apply_coverage_status_missing', `Readiness apply coverage ${checkId || '<unknown>'}.coverageStatus is invalid.`, auditPath);
      }
      if (coverageStatus === 'covered') covered += 1;
      if (coverageStatus === 'deferred') deferred += 1;
      if (coverageStatus === 'missing') missing += 1;
      if (!['plan_required', 'approval_required', 'post_generation', 'meta_verdict'].includes(typeof decision.policy === 'string' ? decision.policy : '')) {
        pushFinding(findings, 'blocker', 'readiness_apply_coverage_policy_invalid', `Readiness apply coverage ${checkId || '<unknown>'}.policy is invalid.`, auditPath);
      }
      for (const key of [
        'blocks',
        'requiredAdapters',
        'coveredAdapters',
        'missingAdapters',
        'applyPlanFiles',
        'requiredTestEvidence',
        'coveredTestEvidence',
        'missingTestEvidence',
        'requiredFileEvidence',
        'coveredFileEvidence',
        'missingFileEvidence',
        'requiredBeforeWork',
      ]) {
        if (!Array.isArray(decision[key])) {
          pushFinding(findings, 'blocker', 'readiness_apply_coverage_array_missing', `Readiness apply coverage ${checkId || '<unknown>'}.${key} must be an array.`, auditPath);
        }
      }
    }
    if (summary.coveredChecks !== covered || summary.deferredChecks !== deferred || summary.missingChecks !== missing) {
      pushFinding(findings, 'blocker', 'readiness_apply_coverage_summary_mismatch', 'Readiness apply coverage covered/deferred/missing summary must match decisions.', auditPath);
    }
  }
  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'readiness_apply_coverage_findings_missing', 'Readiness apply coverage audit findings must be an array.', auditPath);
  }
  if (!fs.existsSync(path.join(runDir, 'audits', 'readiness_apply_coverage_audit.md'))) {
    pushFinding(findings, 'blocker', 'readiness_apply_coverage_markdown_missing', 'Readiness apply coverage markdown report is missing.', auditPath);
  }
  if (audit.status === 'PASS' && (
    summary.blockers !== 0 ||
    summary.missingChecks !== 0 ||
    summary.missingAdapters !== 0 ||
    summary.missingTestEvidence !== 0 ||
    summary.missingFileEvidence !== 0 ||
    summary.applyPlanCoversFailedReadinessChecks !== true ||
    summary.mayStartFrenchGeneration !== false ||
    summary.mayModifyProductionAppFiles !== false
  )) {
    pushFinding(findings, 'blocker', 'readiness_apply_coverage_pass_with_gaps', 'Readiness apply coverage audit cannot be PASS while coverage gaps remain or safety flags are open.', auditPath);
  }
}

function validatePhaseDependencyAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'phase_dependency_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-phase-dependency-audit-v0') {
    pushFinding(findings, 'blocker', 'phase_dependency_schema_version', 'Phase dependency audit schemaVersion must be gustav-phase-dependency-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'phase_dependency_run_id_mismatch', `Phase dependency audit runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'phase_dependency_status_invalid', `Phase dependency audit status is invalid: ${status}`, auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'phase_dependency_summary_missing', 'Phase dependency audit summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'phases',
    'adapters',
    'dependencies',
    'samePhaseDependencies',
    'crossPhaseDependencies',
    'missingDependencies',
    'phaseOrderViolations',
    'phaseMembershipViolations',
    'applyPlanFiles',
    'adaptersWithoutApplyFiles',
    'applyFilesWithUnknownAdapters',
    'nextExecutableAdapters',
    'nextPhaseFiles',
    'nextPhaseDirtyOverlaps',
    'blockers',
    'warnings',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'phase_dependency_summary_number_missing', `Phase dependency audit summary.${key} must be a number.`, auditPath);
    }
  }
  for (const key of ['dirtyOverlapPreservationReviewed', 'canSequencePhasesSafely', 'mayStartFrenchGeneration', 'mayModifyProductionAppFiles']) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'phase_dependency_summary_boolean_missing', `Phase dependency audit summary.${key} must be boolean.`, auditPath);
    }
  }
  if (typeof summary.nextExecutablePhase !== 'string' || typeof summary.approvalStatus !== 'string') {
    pushFinding(findings, 'blocker', 'phase_dependency_summary_text_missing', 'Phase dependency audit summary must include nextExecutablePhase and approvalStatus strings.', auditPath);
  }
  const phases = Array.isArray(audit.phases) ? audit.phases as Array<Record<string, unknown>> : null;
  if (!phases) {
    pushFinding(findings, 'blocker', 'phase_dependency_phases_missing', 'Phase dependency audit phases must be an array.', auditPath);
  } else {
    if (summary.phases !== phases.length) {
      pushFinding(findings, 'blocker', 'phase_dependency_phase_count_mismatch', 'Phase dependency summary.phases must match phases.length.', auditPath);
    }
    const seen = new Set<string>();
    for (const phase of phases) {
      const phaseId = typeof phase.phaseId === 'string' ? phase.phaseId : '';
      if (!phaseId) {
        pushFinding(findings, 'blocker', 'phase_dependency_phase_id_missing', 'Phase dependency phase.phaseId must be a string.', auditPath);
      } else if (seen.has(phaseId)) {
        pushFinding(findings, 'blocker', 'phase_dependency_duplicate_phase', `Duplicate phase dependency phase: ${phaseId}.`, auditPath);
      }
      seen.add(phaseId);
      for (const key of ['adapters', 'dependencies', 'files', 'dirtyWorktreeOverlaps', 'testsRequired', 'exitCriteria']) {
        if (!Array.isArray(phase[key])) {
          pushFinding(findings, 'blocker', 'phase_dependency_phase_array_missing', `Phase dependency ${phaseId || '<unknown>'}.${key} must be an array.`, auditPath);
        }
      }
      for (const key of ['canStartBeforeApproval', 'canModifyProductionAppFiles']) {
        if (typeof phase[key] !== 'boolean') {
          pushFinding(findings, 'blocker', 'phase_dependency_phase_boolean_missing', `Phase dependency ${phaseId || '<unknown>'}.${key} must be boolean.`, auditPath);
        }
      }
    }
  }
  const adapters = Array.isArray(audit.adapters) ? audit.adapters as Array<Record<string, unknown>> : null;
  if (!adapters) {
    pushFinding(findings, 'blocker', 'phase_dependency_adapters_missing', 'Phase dependency audit adapters must be an array.', auditPath);
  } else {
    if (summary.adapters !== adapters.length) {
      pushFinding(findings, 'blocker', 'phase_dependency_adapter_count_mismatch', 'Phase dependency summary.adapters must match adapters.length.', auditPath);
    }
    const seen = new Set<string>();
    for (const adapter of adapters) {
      const adapterId = typeof adapter.adapterId === 'string' ? adapter.adapterId : '';
      if (!adapterId) {
        pushFinding(findings, 'blocker', 'phase_dependency_adapter_id_missing', 'Phase dependency adapter.adapterId must be a string.', auditPath);
      } else if (seen.has(adapterId)) {
        pushFinding(findings, 'blocker', 'phase_dependency_duplicate_adapter', `Duplicate phase dependency adapter: ${adapterId}.`, auditPath);
      }
      seen.add(adapterId);
      if (typeof adapter.phase !== 'string' || typeof adapter.status !== 'string') {
        pushFinding(findings, 'blocker', 'phase_dependency_adapter_text_missing', `Phase dependency ${adapterId || '<unknown>'} must include phase and status.`, auditPath);
      }
      for (const key of ['dependencies', 'dependencyPhases', 'applyPlanFiles', 'dirtyWorktreeOverlaps', 'testsRequired']) {
        if (!Array.isArray(adapter[key])) {
          pushFinding(findings, 'blocker', 'phase_dependency_adapter_array_missing', `Phase dependency ${adapterId || '<unknown>'}.${key} must be an array.`, auditPath);
        }
      }
      for (const key of ['canStartBeforeApproval', 'canModifyProductionAppFiles']) {
        if (typeof adapter[key] !== 'boolean') {
          pushFinding(findings, 'blocker', 'phase_dependency_adapter_boolean_missing', `Phase dependency ${adapterId || '<unknown>'}.${key} must be boolean.`, auditPath);
        }
      }
    }
  }
  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'phase_dependency_findings_missing', 'Phase dependency audit findings must be an array.', auditPath);
  }
  if (!fs.existsSync(path.join(runDir, 'audits', 'phase_dependency_audit.md'))) {
    pushFinding(findings, 'blocker', 'phase_dependency_markdown_missing', 'Phase dependency markdown report is missing.', auditPath);
  }
  if (audit.status === 'PASS' && (
    summary.blockers !== 0 ||
    summary.missingDependencies !== 0 ||
    summary.phaseOrderViolations !== 0 ||
    summary.phaseMembershipViolations !== 0 ||
    summary.adaptersWithoutApplyFiles !== 0 ||
    summary.applyFilesWithUnknownAdapters !== 0 ||
    summary.dirtyOverlapPreservationReviewed !== true ||
    summary.canSequencePhasesSafely !== true ||
    summary.mayStartFrenchGeneration !== false ||
    summary.mayModifyProductionAppFiles !== false
  )) {
    pushFinding(findings, 'blocker', 'phase_dependency_pass_with_gaps', 'Phase dependency audit cannot be PASS while sequencing gaps remain or safety flags are open.', auditPath);
  }
}

function validateP1ExecutionSliceAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'p1_execution_slice_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-p1-execution-slice-audit-v0') {
    pushFinding(findings, 'blocker', 'p1_slice_schema_version', 'P1 execution slice audit schemaVersion must be gustav-p1-execution-slice-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'p1_slice_run_id_mismatch', `P1 execution slice audit runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'p1_slice_status_invalid', `P1 execution slice audit status is invalid: ${status}`, auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'p1_slice_summary_missing', 'P1 execution slice audit summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'p1Adapters',
    'p1PlannedFiles',
    'p1DirtyOverlaps',
    'p1FilesWithLaterPhaseAdapters',
    'p1FilesWithOnlyP1Adapters',
    'firstSliceFiles',
    'firstSliceDirtyOverlaps',
    'deferredMixedPhaseFiles',
    'testSupportFiles',
    'slices',
    'blockers',
    'warnings',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'p1_slice_summary_number_missing', `P1 execution slice audit summary.${key} must be a number.`, auditPath);
    }
  }
  for (const key of ['p1PhaseExists', 'canStartP1AfterApproval', 'mayStartFrenchGeneration', 'mayModifyProductionAppFiles']) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'p1_slice_summary_boolean_missing', `P1 execution slice audit summary.${key} must be boolean.`, auditPath);
    }
  }
  const slices = Array.isArray(audit.slices) ? audit.slices as Array<Record<string, unknown>> : null;
  if (!slices) {
    pushFinding(findings, 'blocker', 'p1_slice_slices_missing', 'P1 execution slice audit slices must be an array.', auditPath);
  } else {
    if (summary.slices !== slices.length) {
      pushFinding(findings, 'blocker', 'p1_slice_count_mismatch', 'P1 execution slice audit summary.slices must match slices.length.', auditPath);
    }
    const seen = new Set<string>();
    for (const slice of slices) {
      const id = typeof slice.id === 'string' ? slice.id : '';
      if (!id) {
        pushFinding(findings, 'blocker', 'p1_slice_id_missing', 'P1 execution slice id must be a string.', auditPath);
      } else if (seen.has(id)) {
        pushFinding(findings, 'blocker', 'p1_slice_duplicate_id', `Duplicate P1 execution slice id: ${id}.`, auditPath);
      }
      seen.add(id);
      if (typeof slice.title !== 'string') {
        pushFinding(findings, 'blocker', 'p1_slice_title_missing', `P1 execution slice ${id || '<unknown>'}.title must be a string.`, auditPath);
      }
      if (!['first_core', 'dev_isolation', 'p1_consumer_prep', 'defer_to_later_adapter'].includes(typeof slice.mode === 'string' ? slice.mode : '')) {
        pushFinding(findings, 'blocker', 'p1_slice_mode_invalid', `P1 execution slice ${id || '<unknown>'}.mode is invalid.`, auditPath);
      }
      for (const key of ['adapters', 'files', 'dirtyWorktreeOverlaps', 'laterPhaseAdapters', 'entryCriteria', 'exitCriteria']) {
        if (!Array.isArray(slice[key])) {
          pushFinding(findings, 'blocker', 'p1_slice_array_missing', `P1 execution slice ${id || '<unknown>'}.${key} must be an array.`, auditPath);
        }
      }
      if (typeof slice.mayModifyProductionAppFiles !== 'boolean') {
        pushFinding(findings, 'blocker', 'p1_slice_modify_boolean_missing', `P1 execution slice ${id || '<unknown>'}.mayModifyProductionAppFiles must be boolean.`, auditPath);
      }
    }
    const firstCore = slices.find((slice) => slice.id === 'P1A_CORE_CONTRACTS');
    const firstCoreFiles = firstCore && Array.isArray(firstCore.files) ? firstCore.files : [];
    const firstCoreDirty = firstCore && Array.isArray(firstCore.dirtyWorktreeOverlaps) ? firstCore.dirtyWorktreeOverlaps : [];
    if (!firstCore || firstCoreFiles.length === 0 || firstCoreDirty.length !== 0) {
      pushFinding(findings, 'blocker', 'p1_slice_first_core_invalid', 'P1A_CORE_CONTRACTS must exist, include files and have zero dirty overlaps.', auditPath);
    }
  }
  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'p1_slice_findings_missing', 'P1 execution slice audit findings must be an array.', auditPath);
  }
  if (!fs.existsSync(path.join(runDir, 'audits', 'p1_execution_slice_audit.md'))) {
    pushFinding(findings, 'blocker', 'p1_slice_markdown_missing', 'P1 execution slice markdown report is missing.', auditPath);
  }
  if (audit.status === 'PASS' && (
    summary.blockers !== 0 ||
    summary.p1PhaseExists !== true ||
    summary.firstSliceFiles === 0 ||
    summary.firstSliceDirtyOverlaps !== 0 ||
    summary.canStartP1AfterApproval !== true ||
    summary.mayStartFrenchGeneration !== false ||
    summary.mayModifyProductionAppFiles !== false
  )) {
    pushFinding(findings, 'blocker', 'p1_slice_pass_with_gaps', 'P1 execution slice audit cannot be PASS while slice gaps remain or safety flags are open.', auditPath);
  }
}

function validateP1ACoreContractSpecAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'p1a_core_contract_spec.json');
  if (!fs.existsSync(auditPath)) return;
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-p1a-core-contract-spec-audit-v0') {
    pushFinding(findings, 'blocker', 'p1a_contract_schema_version', 'P1A core contract spec schemaVersion must be gustav-p1a-core-contract-spec-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'p1a_contract_run_id_mismatch', `P1A core contract spec runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'p1a_contract_status_invalid', `P1A core contract spec status is invalid: ${status}`, auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'p1a_contract_summary_missing', 'P1A core contract spec summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'studyTargets',
    'sourceLocales',
    'publicApis',
    'domainContracts',
    'allowedTargetDomains',
    'blockedDomains',
    'storageShapes',
    'firstSliceFiles',
    'firstSliceDirtyOverlaps',
    'testAssertions',
    'blockers',
    'warnings',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'p1a_contract_summary_number_missing', `P1A core contract spec summary.${key} must be a number.`, auditPath);
    }
  }
  for (const key of ['canImplementP1AContractsAfterApproval', 'mayStartFrenchGeneration', 'mayModifyProductionAppFiles']) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'p1a_contract_summary_boolean_missing', `P1A core contract spec summary.${key} must be boolean.`, auditPath);
    }
  }
  const studyTargetContract = audit.studyTargetContract && typeof audit.studyTargetContract === 'object'
    ? audit.studyTargetContract as Record<string, unknown>
    : null;
  if (!studyTargetContract) {
    pushFinding(findings, 'blocker', 'p1a_contract_study_target_missing', 'P1A core contract spec must include studyTargetContract.', auditPath);
  } else {
    const values = Array.isArray(studyTargetContract.values) ? studyTargetContract.values : [];
    if (!values.includes('en') || !values.includes('fr') || values.includes('es')) {
      pushFinding(findings, 'blocker', 'p1a_contract_study_target_values_invalid', 'P1A StudyTarget values must include en/fr and exclude dev-only es.', auditPath);
    }
    if (studyTargetContract.defaultTarget !== 'en' || studyTargetContract.requestedTarget !== 'fr') {
      pushFinding(findings, 'blocker', 'p1a_contract_target_defaults_invalid', 'P1A StudyTarget default/requested target must be en/fr.', auditPath);
    }
    if (studyTargetContract.mustNotDependOnSourceLocale !== true || studyTargetContract.mustNotUseDevStudyTargetLang !== true) {
      pushFinding(findings, 'blocker', 'p1a_contract_target_isolation_missing', 'P1A StudyTarget contract must forbid sourceLocale coupling and dev StudyTargetLang reuse.', auditPath);
    }
  }
  const sourceLocaleContract = audit.sourceLocaleContract && typeof audit.sourceLocaleContract === 'object'
    ? audit.sourceLocaleContract as Record<string, unknown>
    : null;
  if (!sourceLocaleContract) {
    pushFinding(findings, 'blocker', 'p1a_contract_source_locale_missing', 'P1A core contract spec must include sourceLocaleContract.', auditPath);
  } else {
    const values = Array.isArray(sourceLocaleContract.values) ? sourceLocaleContract.values : [];
    if (!values.includes('ru') || !values.includes('uk') || sourceLocaleContract.mustNotChangeStudyTarget !== true) {
      pushFinding(findings, 'blocker', 'p1a_contract_source_locale_invalid', 'P1A sourceLocale contract must include ru/uk and forbid target changes.', auditPath);
    }
  }
  const keyBuilder = audit.keyBuilderContract && typeof audit.keyBuilderContract === 'object'
    ? audit.keyBuilderContract as Record<string, unknown>
    : null;
  if (!keyBuilder) {
    pushFinding(findings, 'blocker', 'p1a_contract_key_builder_missing', 'P1A core contract spec must include keyBuilderContract.', auditPath);
  } else {
    for (const key of ['allowedTargetDomains', 'blockedDomains', 'publicApis', 'keyFormats']) {
      if (!Array.isArray(keyBuilder[key])) {
        pushFinding(findings, 'blocker', 'p1a_contract_key_builder_array_missing', `P1A keyBuilderContract.${key} must be an array.`, auditPath);
      }
    }
    const blocked = Array.isArray(keyBuilder.blockedDomains) ? keyBuilder.blockedDomains : [];
    if (!blocked.includes('unknown_target_storage')) {
      pushFinding(findings, 'blocker', 'p1a_contract_unknown_domain_not_blocked', 'P1A key builder contract must block unknown_target_storage.', auditPath);
    }
  }
  const domainContracts = Array.isArray(audit.domainContracts) ? audit.domainContracts as Array<Record<string, unknown>> : null;
  if (!domainContracts) {
    pushFinding(findings, 'blocker', 'p1a_contract_domains_missing', 'P1A core contract spec domainContracts must be an array.', auditPath);
  } else {
    if (summary.domainContracts !== domainContracts.length) {
      pushFinding(findings, 'blocker', 'p1a_contract_domain_count_mismatch', 'P1A summary.domainContracts must match domainContracts.length.', auditPath);
    }
    for (const domain of domainContracts) {
      const domainId = typeof domain.domain === 'string' ? domain.domain : '';
      if (!domainId || typeof domain.status !== 'string' || !Array.isArray(domain.storageShapes)) {
        pushFinding(findings, 'blocker', 'p1a_contract_domain_invalid', 'P1A domain contract must include domain, status and storageShapes.', auditPath);
      }
      for (const key of ['requiresStudyTarget', 'allowsSourceLocaleDimension', 'legacyEnglishFallbackAllowedOnlyInMigration']) {
        if (typeof domain[key] !== 'boolean') {
          pushFinding(findings, 'blocker', 'p1a_contract_domain_boolean_missing', `P1A domain ${domainId || '<unknown>'}.${key} must be boolean.`, auditPath);
        }
      }
    }
  }
  const firstSlice = audit.firstSlice && typeof audit.firstSlice === 'object'
    ? audit.firstSlice as Record<string, unknown>
    : null;
  if (!firstSlice || firstSlice.id !== 'P1A_CORE_CONTRACTS' || !Array.isArray(firstSlice.files) || !Array.isArray(firstSlice.dirtyWorktreeOverlaps)) {
    pushFinding(findings, 'blocker', 'p1a_contract_first_slice_invalid', 'P1A core contract spec must include P1A firstSlice with files and dirtyWorktreeOverlaps arrays.', auditPath);
  } else if ((firstSlice.dirtyWorktreeOverlaps as unknown[]).length !== 0) {
    pushFinding(findings, 'blocker', 'p1a_contract_first_slice_dirty', 'P1A first slice must have zero dirty overlaps.', auditPath);
  }
  const testContract = audit.testContract && typeof audit.testContract === 'object'
    ? audit.testContract as Record<string, unknown>
    : null;
  if (!testContract || !Array.isArray(testContract.files) || !Array.isArray(testContract.assertions)) {
    pushFinding(findings, 'blocker', 'p1a_contract_tests_missing', 'P1A core contract spec must include testContract files and assertions arrays.', auditPath);
  } else if ((testContract.assertions as unknown[]).length < 6) {
    pushFinding(findings, 'blocker', 'p1a_contract_tests_too_small', 'P1A core contract spec must include at least 6 test assertions.', auditPath);
  }
  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'p1a_contract_findings_missing', 'P1A core contract spec findings must be an array.', auditPath);
  }
  if (!fs.existsSync(path.join(runDir, 'audits', 'p1a_core_contract_spec.md'))) {
    pushFinding(findings, 'blocker', 'p1a_contract_markdown_missing', 'P1A core contract spec markdown report is missing.', auditPath);
  }
  if (audit.status === 'PASS' && (
    summary.blockers !== 0 ||
    summary.studyTargets !== 2 ||
    summary.firstSliceFiles !== 4 ||
    summary.firstSliceDirtyOverlaps !== 0 ||
    Number(summary.publicApis) < 6 ||
    summary.allowedTargetDomains === 0 ||
    summary.canImplementP1AContractsAfterApproval !== true ||
    summary.mayStartFrenchGeneration !== false ||
    summary.mayModifyProductionAppFiles !== false
  )) {
    pushFinding(findings, 'blocker', 'p1a_contract_pass_with_gaps', 'P1A core contract spec cannot be PASS while contract gaps remain or safety flags are open.', auditPath);
  }
}

function validateP1APreflightAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'p1a_preflight_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-p1a-preflight-audit-v0') {
    pushFinding(findings, 'blocker', 'p1a_preflight_schema_version', 'P1A preflight audit schemaVersion must be gustav-p1a-preflight-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'p1a_preflight_run_id_mismatch', `P1A preflight audit runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'p1a_preflight_status_invalid', `P1A preflight audit status is invalid: ${status}`, auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'p1a_preflight_summary_missing', 'P1A preflight audit summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'firstSliceFiles',
    'firstSliceExistingNow',
    'firstSliceAdditionsReady',
    'firstSliceDirtyOverlaps',
    'firstSliceParentsReady',
    'deferredDevBridgeFiles',
    'deferredConsumerFiles',
    'devTargetEntrypoints',
    'forbiddenRawKeyPatterns',
    'blockers',
    'warnings',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'p1a_preflight_summary_number_missing', `P1A preflight audit summary.${key} must be a number.`, auditPath);
    }
  }
  for (const key of ['preflightReadyAfterApproval', 'mayStartFrenchGeneration', 'mayModifyProductionAppFiles']) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'p1a_preflight_summary_boolean_missing', `P1A preflight audit summary.${key} must be boolean.`, auditPath);
    }
  }
  const firstSliceReadiness = Array.isArray(audit.firstSliceReadiness)
    ? audit.firstSliceReadiness as Array<Record<string, unknown>>
    : null;
  if (!firstSliceReadiness) {
    pushFinding(findings, 'blocker', 'p1a_preflight_first_slice_missing', 'P1A preflight audit firstSliceReadiness must be an array.', auditPath);
  } else {
    if (summary.firstSliceFiles !== firstSliceReadiness.length) {
      pushFinding(findings, 'blocker', 'p1a_preflight_first_slice_count_mismatch', 'P1A preflight summary.firstSliceFiles must match firstSliceReadiness.length.', auditPath);
    }
    for (const file of firstSliceReadiness) {
      const filePath = typeof file.filePath === 'string' ? file.filePath : '';
      if (!filePath || typeof file.plannedAction !== 'string' || typeof file.phase !== 'string' || typeof file.expectedRole !== 'string' || typeof file.preflightDecision !== 'string') {
        pushFinding(findings, 'blocker', 'p1a_preflight_first_slice_entry_invalid', 'P1A first-slice readiness entries must include filePath, plannedAction, phase, expectedRole and preflightDecision.', auditPath);
      }
      for (const key of ['existsNow', 'parentDirExists', 'dirtyWorktreeOverlap']) {
        if (typeof file[key] !== 'boolean') {
          pushFinding(findings, 'blocker', 'p1a_preflight_first_slice_boolean_missing', `P1A first-slice ${filePath || '<unknown>'}.${key} must be boolean.`, auditPath);
        }
      }
    }
  }
  const boundaries = audit.implementationBoundaries && typeof audit.implementationBoundaries === 'object'
    ? audit.implementationBoundaries as Record<string, unknown>
    : null;
  if (!boundaries) {
    pushFinding(findings, 'blocker', 'p1a_preflight_boundaries_missing', 'P1A preflight audit implementationBoundaries must be an object.', auditPath);
  } else {
    for (const key of ['p1aCoreFiles', 'deferredDevBridgeFiles', 'deferredConsumerFiles', 'forbiddenRawKeyPatterns']) {
      if (!Array.isArray(boundaries[key])) {
        pushFinding(findings, 'blocker', 'p1a_preflight_boundary_array_missing', `P1A preflight implementationBoundaries.${key} must be an array.`, auditPath);
      }
    }
    const deferredDevBridge = Array.isArray(boundaries.deferredDevBridgeFiles) ? boundaries.deferredDevBridgeFiles : [];
    if (!deferredDevBridge.includes('components/StudyTargetContext.tsx') || !deferredDevBridge.includes('app/study_target_lang_dev.ts')) {
      pushFinding(findings, 'blocker', 'p1a_preflight_dev_bridge_incomplete', 'P1A preflight must defer StudyTargetContext and dev study target storage to bridge work.', auditPath);
    }
  }
  const devTargetEntrypoints = Array.isArray(audit.devTargetEntrypoints)
    ? audit.devTargetEntrypoints as Array<Record<string, unknown>>
    : null;
  if (!devTargetEntrypoints) {
    pushFinding(findings, 'blocker', 'p1a_preflight_dev_entrypoints_missing', 'P1A preflight devTargetEntrypoints must be an array.', auditPath);
  } else {
    if (summary.devTargetEntrypoints !== devTargetEntrypoints.length) {
      pushFinding(findings, 'blocker', 'p1a_preflight_dev_entrypoint_count_mismatch', 'P1A preflight summary.devTargetEntrypoints must match devTargetEntrypoints.length.', auditPath);
    }
    if (!devTargetEntrypoints.some((entry) => entry.filePath === 'components/StudyTargetContext.tsx')) {
      pushFinding(findings, 'blocker', 'p1a_preflight_context_not_scanned', 'P1A preflight must scan components/StudyTargetContext.tsx.', auditPath);
    }
    if (!devTargetEntrypoints.some((entry) => entry.filePath === 'app/study_target_lang_dev.ts')) {
      pushFinding(findings, 'blocker', 'p1a_preflight_dev_storage_not_scanned', 'P1A preflight must scan app/study_target_lang_dev.ts.', auditPath);
    }
    for (const entry of devTargetEntrypoints) {
      if (typeof entry.filePath !== 'string' || typeof entry.role !== 'string' || typeof entry.totalMarkers !== 'number' || typeof entry.requiredBoundary !== 'string') {
        pushFinding(findings, 'blocker', 'p1a_preflight_dev_entrypoint_invalid', 'P1A dev target entrypoints must include filePath, role, totalMarkers and requiredBoundary.', auditPath);
      }
    }
  }
  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'p1a_preflight_findings_missing', 'P1A preflight audit findings must be an array.', auditPath);
  }
  if (!fs.existsSync(path.join(runDir, 'audits', 'p1a_preflight_audit.md'))) {
    pushFinding(findings, 'blocker', 'p1a_preflight_markdown_missing', 'P1A preflight audit markdown report is missing.', auditPath);
  }
  if (audit.status === 'PASS' && (
    summary.blockers !== 0 ||
    summary.firstSliceFiles !== 4 ||
    summary.firstSliceExistingNow !== 0 ||
    summary.firstSliceDirtyOverlaps !== 0 ||
    summary.firstSliceAdditionsReady !== 4 ||
    Number(summary.deferredDevBridgeFiles) < 2 ||
    Number(summary.devTargetEntrypoints) < 2 ||
    summary.preflightReadyAfterApproval !== true ||
    summary.mayStartFrenchGeneration !== false ||
    summary.mayModifyProductionAppFiles !== false
  )) {
    pushFinding(findings, 'blocker', 'p1a_preflight_pass_with_gaps', 'P1A preflight audit cannot be PASS while readiness gaps remain or safety flags are open.', auditPath);
  }
}

function validateP1ATestExecutionAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'p1a_test_execution_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-p1a-test-execution-audit-v0') {
    pushFinding(findings, 'blocker', 'p1a_test_execution_schema_version', 'P1A test execution audit schemaVersion must be gustav-p1a-test-execution-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'p1a_test_execution_run_id_mismatch', `P1A test execution audit runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'p1a_test_execution_status_invalid', `P1A test execution audit status is invalid: ${status}`, auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'p1a_test_execution_summary_missing', 'P1A test execution audit summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'plannedTestFiles',
    'plannedAssertions',
    'plannedTestsMatchingJest',
    'directCommands',
    'companionRegressionTests',
    'requiredMocksPresent',
    'requiredMocksMissing',
    'blockers',
    'warnings',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'p1a_test_execution_summary_number_missing', `P1A test execution audit summary.${key} must be a number.`, auditPath);
    }
  }
  for (const key of ['jestConfigured', 'packageTestScriptPresent', 'tsJestPresent', 'testExecutableAfterApproval', 'mayStartFrenchGeneration', 'mayModifyProductionAppFiles']) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'p1a_test_execution_summary_boolean_missing', `P1A test execution audit summary.${key} must be boolean.`, auditPath);
    }
  }
  const jestContract = audit.jestContract && typeof audit.jestContract === 'object'
    ? audit.jestContract as Record<string, unknown>
    : null;
  if (!jestContract) {
    pushFinding(findings, 'blocker', 'p1a_test_execution_jest_contract_missing', 'P1A test execution audit jestContract must be an object.', auditPath);
  } else {
    if (jestContract.preset !== 'ts-jest' || jestContract.testEnvironment !== 'node') {
      pushFinding(findings, 'blocker', 'p1a_test_execution_jest_contract_invalid', 'P1A test execution audit must record ts-jest and node test environment.', auditPath);
    }
    for (const key of ['testMatch', 'transformKeys']) {
      if (!Array.isArray(jestContract[key])) {
        pushFinding(findings, 'blocker', 'p1a_test_execution_jest_array_missing', `P1A test execution jestContract.${key} must be an array.`, auditPath);
      }
    }
    if (!jestContract.moduleMocks || typeof jestContract.moduleMocks !== 'object') {
      pushFinding(findings, 'blocker', 'p1a_test_execution_module_mocks_missing', 'P1A test execution jestContract.moduleMocks must be an object.', auditPath);
    }
  }
  const plannedTestFiles = Array.isArray(audit.plannedTestFiles)
    ? audit.plannedTestFiles as Array<Record<string, unknown>>
    : null;
  if (!plannedTestFiles) {
    pushFinding(findings, 'blocker', 'p1a_test_execution_planned_files_missing', 'P1A test execution plannedTestFiles must be an array.', auditPath);
  } else {
    if (summary.plannedTestFiles !== plannedTestFiles.length) {
      pushFinding(findings, 'blocker', 'p1a_test_execution_planned_file_count_mismatch', 'P1A summary.plannedTestFiles must match plannedTestFiles.length.', auditPath);
    }
    for (const file of plannedTestFiles) {
      const filePath = typeof file.filePath === 'string' ? file.filePath : '';
      if (!filePath || !filePath.startsWith('tests/') || !filePath.endsWith('.test.ts')) {
        pushFinding(findings, 'blocker', 'p1a_test_execution_planned_file_invalid', `Invalid planned P1A test file: ${filePath || '<missing>'}`, auditPath);
      }
      if (typeof file.existsNow !== 'boolean' || typeof file.matchesJestPattern !== 'boolean' || !Array.isArray(file.assertionIds) || !Array.isArray(file.requiredMocks)) {
        pushFinding(findings, 'blocker', 'p1a_test_execution_planned_file_shape_invalid', `Planned P1A test ${filePath || '<unknown>'} has invalid shape.`, auditPath);
      }
    }
  }
  if (!Array.isArray(audit.companionRegressionTests) || audit.companionRegressionTests.length < 3) {
    pushFinding(findings, 'blocker', 'p1a_test_execution_companion_regressions_missing', 'P1A test execution audit must include at least 3 companion regression tests.', auditPath);
  }
  const commands = Array.isArray(audit.commands) ? audit.commands as Array<Record<string, unknown>> : null;
  if (!commands) {
    pushFinding(findings, 'blocker', 'p1a_test_execution_commands_missing', 'P1A test execution commands must be an array.', auditPath);
  } else {
    if (summary.directCommands !== commands.length) {
      pushFinding(findings, 'blocker', 'p1a_test_execution_command_count_mismatch', 'P1A summary.directCommands must match commands.length.', auditPath);
    }
    if (!commands.some((command) => command.id === 'P1A_DIRECT_TESTS')) {
      pushFinding(findings, 'blocker', 'p1a_test_execution_direct_command_missing', 'P1A_DIRECT_TESTS command is required.', auditPath);
    }
    for (const command of commands) {
      if (typeof command.id !== 'string' || typeof command.command !== 'string' || typeof command.purpose !== 'string' || typeof command.requiredBefore !== 'string') {
        pushFinding(findings, 'blocker', 'p1a_test_execution_command_shape_invalid', 'P1A test command entries must include id, command, purpose and requiredBefore.', auditPath);
      }
    }
  }
  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'p1a_test_execution_findings_missing', 'P1A test execution audit findings must be an array.', auditPath);
  }
  if (!fs.existsSync(path.join(runDir, 'audits', 'p1a_test_execution_audit.md'))) {
    pushFinding(findings, 'blocker', 'p1a_test_execution_markdown_missing', 'P1A test execution audit markdown report is missing.', auditPath);
  }
  if (audit.status === 'PASS' && (
    summary.blockers !== 0 ||
    summary.jestConfigured !== true ||
    summary.tsJestPresent !== true ||
    summary.plannedTestFiles !== 2 ||
    Number(summary.plannedAssertions) < 6 ||
    summary.plannedTestsMatchingJest !== 2 ||
    Number(summary.directCommands) < 2 ||
    Number(summary.companionRegressionTests) < 3 ||
    summary.requiredMocksMissing !== 0 ||
    summary.testExecutableAfterApproval !== true ||
    summary.mayStartFrenchGeneration !== false ||
    summary.mayModifyProductionAppFiles !== false
  )) {
    pushFinding(findings, 'blocker', 'p1a_test_execution_pass_with_gaps', 'P1A test execution audit cannot be PASS while test execution gaps remain or safety flags are open.', auditPath);
  }
}

function validateP1AMinimalApplyPacket(runDir: string, runId: string | null, findings: Finding[]): void {
  const packetPath = path.join(runDir, 'apply_plan', 'p1a_minimal_apply_packet.json');
  if (!fs.existsSync(packetPath)) return;
  const packet = readJson<Record<string, unknown>>(packetPath, findings);
  if (!packet) return;
  if (packet.schemaVersion !== 'gustav-p1a-minimal-apply-packet-v0') {
    pushFinding(findings, 'blocker', 'p1a_minimal_packet_schema_version', 'P1A minimal apply packet schemaVersion must be gustav-p1a-minimal-apply-packet-v0.', packetPath);
  }
  if (runId && packet.runId !== runId) {
    pushFinding(findings, 'blocker', 'p1a_minimal_packet_run_id_mismatch', `P1A minimal apply packet runId ${String(packet.runId)} does not match manifest ${runId}.`, packetPath);
  }
  const status = typeof packet.status === 'string' ? packet.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'p1a_minimal_packet_status_invalid', `P1A minimal apply packet status is invalid: ${status}`, packetPath);
  }
  if (packet.approvalStatus !== 'not_requested' && packet.approvalStatus !== 'approved' && packet.approvalStatus !== 'rejected') {
    pushFinding(findings, 'blocker', 'p1a_minimal_packet_approval_status_invalid', 'P1A minimal apply packet approvalStatus is invalid.', packetPath);
  }
  const summary = packet.summary && typeof packet.summary === 'object'
    ? packet.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'p1a_minimal_packet_summary_missing', 'P1A minimal apply packet summary must be an object.', packetPath);
    return;
  }
  for (const key of ['files', 'productionFiles', 'testFiles', 'dirtyWorktreeOverlaps', 'commands', 'blockers', 'warnings']) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'p1a_minimal_packet_summary_number_missing', `P1A minimal apply packet summary.${key} must be a number.`, packetPath);
    }
  }
  for (const key of ['readyForApproval', 'mayStartFrenchGeneration', 'mayModifyProductionAppFiles']) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'p1a_minimal_packet_summary_boolean_missing', `P1A minimal apply packet summary.${key} must be boolean.`, packetPath);
    }
  }
  if (typeof packet.requiredApprovalText !== 'string' || !packet.requiredApprovalText.includes('p1a_minimal_apply_packet.json')) {
    pushFinding(findings, 'blocker', 'p1a_minimal_packet_approval_text_missing', 'P1A minimal apply packet must include exact required approval text.', packetPath);
  }
  const files = Array.isArray(packet.files) ? packet.files as Array<Record<string, unknown>> : null;
  if (!files) {
    pushFinding(findings, 'blocker', 'p1a_minimal_packet_files_missing', 'P1A minimal apply packet files must be an array.', packetPath);
  } else {
    if (summary.files !== files.length) {
      pushFinding(findings, 'blocker', 'p1a_minimal_packet_file_count_mismatch', 'P1A summary.files must match files.length.', packetPath);
    }
    const requiredFiles = new Set([
      'app/study_target.ts',
      'app/target_storage_keys.ts',
      'tests/gustav_surface_target_switch.test.ts',
      'tests/gustav_target_storage_keys.test.ts',
    ]);
    for (const file of files) {
      const filePath = typeof file.path === 'string' ? file.path : '';
      if (!requiredFiles.has(filePath)) {
        pushFinding(findings, 'blocker', 'p1a_minimal_packet_unexpected_file', `Unexpected P1A minimal packet file: ${filePath || '<missing>'}`, packetPath);
      }
      if (file.action !== 'add' || file.phase !== 'P1A' || file.dirtyWorktreeOverlap !== false) {
        pushFinding(findings, 'blocker', 'p1a_minimal_packet_file_shape_invalid', `P1A file ${filePath || '<unknown>'} must be additive P1A with no dirty overlap.`, packetPath);
      }
      if (!Array.isArray(file.exitCriteria) || typeof file.rollbackAction !== 'string' || typeof file.reason !== 'string') {
        pushFinding(findings, 'blocker', 'p1a_minimal_packet_file_details_missing', `P1A file ${filePath || '<unknown>'} must include reason, exitCriteria and rollbackAction.`, packetPath);
      }
    }
  }
  const commands = Array.isArray(packet.commands) ? packet.commands as Array<Record<string, unknown>> : null;
  if (!commands) {
    pushFinding(findings, 'blocker', 'p1a_minimal_packet_commands_missing', 'P1A minimal apply packet commands must be an array.', packetPath);
  } else {
    if (summary.commands !== commands.length) {
      pushFinding(findings, 'blocker', 'p1a_minimal_packet_command_count_mismatch', 'P1A summary.commands must match commands.length.', packetPath);
    }
    if (!commands.some((command) => command.id === 'P1A_DIRECT_TESTS') || !commands.some((command) => command.id === 'P1A_WITH_DEV_TARGET_REGRESSION')) {
      pushFinding(findings, 'blocker', 'p1a_minimal_packet_required_commands_missing', 'P1A minimal apply packet must include direct and dev-regression test commands.', packetPath);
    }
  }
  if (!Array.isArray(packet.findings)) {
    pushFinding(findings, 'blocker', 'p1a_minimal_packet_findings_missing', 'P1A minimal apply packet findings must be an array.', packetPath);
  }
  if (!fs.existsSync(path.join(runDir, 'apply_plan', 'P1A_MINIMAL_APPLY_PACKET.md'))) {
    pushFinding(findings, 'blocker', 'p1a_minimal_packet_markdown_missing', 'P1A minimal apply packet markdown report is missing.', packetPath);
  }
  if (packet.status === 'PASS' && (
    summary.blockers !== 0 ||
    summary.files !== 4 ||
    summary.productionFiles !== 2 ||
    summary.testFiles !== 2 ||
    summary.dirtyWorktreeOverlaps !== 0 ||
    Number(summary.commands) < 2 ||
    summary.readyForApproval !== true ||
    summary.mayStartFrenchGeneration !== false ||
    summary.mayModifyProductionAppFiles !== false ||
    packet.approvalStatus !== 'not_requested'
  )) {
    pushFinding(findings, 'blocker', 'p1a_minimal_packet_pass_with_gaps', 'P1A minimal apply packet cannot be PASS while packet gaps remain or safety flags are open.', packetPath);
  }
}

function validateP1APostApplyGuard(runDir: string, runId: string | null, findings: Finding[]): void {
  const guardPath = path.join(runDir, 'audits', 'p1a_post_apply_guard.json');
  if (!fs.existsSync(guardPath)) return;
  const guard = readJson<Record<string, unknown>>(guardPath, findings);
  if (!guard) return;
  if (guard.schemaVersion !== 'gustav-p1a-post-apply-guard-v0') {
    pushFinding(findings, 'blocker', 'p1a_post_apply_guard_schema_version', 'P1A post-apply guard schemaVersion must be gustav-p1a-post-apply-guard-v0.', guardPath);
  }
  if (runId && guard.runId !== runId) {
    pushFinding(findings, 'blocker', 'p1a_post_apply_guard_run_id_mismatch', `P1A post-apply guard runId ${String(guard.runId)} does not match manifest ${runId}.`, guardPath);
  }
  const status = typeof guard.status === 'string' ? guard.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'p1a_post_apply_guard_status_invalid', `P1A post-apply guard status is invalid: ${status}`, guardPath);
  }
  const summary = guard.summary && typeof guard.summary === 'object'
    ? guard.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'p1a_post_apply_guard_summary_missing', 'P1A post-apply guard summary must be an object.', guardPath);
    return;
  }
  for (const key of ['allowedFiles', 'allowedProductionFiles', 'allowedTestFiles', 'forbiddenWriteZones', 'guardRules', 'guardCommands', 'blockers', 'warnings']) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'p1a_post_apply_guard_summary_number_missing', `P1A post-apply guard summary.${key} must be a number.`, guardPath);
    }
  }
  for (const key of ['guardReadyAfterApproval', 'mayStartFrenchGeneration', 'mayModifyProductionAppFiles']) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'p1a_post_apply_guard_summary_boolean_missing', `P1A post-apply guard summary.${key} must be boolean.`, guardPath);
    }
  }
  if (summary.postApplyStatus !== 'not_run') {
    pushFinding(findings, 'blocker', 'p1a_post_apply_guard_post_apply_status_invalid', 'P1A post-apply guard status must be not_run before implementation.', guardPath);
  }
  const allowedFiles = Array.isArray(guard.allowedFiles) ? guard.allowedFiles : null;
  if (!allowedFiles) {
    pushFinding(findings, 'blocker', 'p1a_post_apply_guard_allowed_files_missing', 'P1A post-apply guard allowedFiles must be an array.', guardPath);
  } else {
    if (summary.allowedFiles !== allowedFiles.length) {
      pushFinding(findings, 'blocker', 'p1a_post_apply_guard_allowed_count_mismatch', 'P1A summary.allowedFiles must match allowedFiles.length.', guardPath);
    }
    const requiredFiles = [
      'app/study_target.ts',
      'app/target_storage_keys.ts',
      'tests/gustav_surface_target_switch.test.ts',
      'tests/gustav_target_storage_keys.test.ts',
    ];
    for (const required of requiredFiles) {
      if (!allowedFiles.includes(required)) {
        pushFinding(findings, 'blocker', 'p1a_post_apply_guard_required_file_missing', `P1A post-apply guard missing allowed file ${required}.`, guardPath);
      }
    }
  }
  const allowedProductionFiles = Array.isArray(guard.allowedProductionFiles) ? guard.allowedProductionFiles : [];
  const allowedTestFiles = Array.isArray(guard.allowedTestFiles) ? guard.allowedTestFiles : [];
  if (allowedProductionFiles.length !== 2 || allowedTestFiles.length !== 2) {
    pushFinding(findings, 'blocker', 'p1a_post_apply_guard_allowed_split_invalid', 'P1A post-apply guard must split 2 production and 2 test files.', guardPath);
  }
  if (!Array.isArray(guard.forbiddenWriteZones) || guard.forbiddenWriteZones.length === 0) {
    pushFinding(findings, 'blocker', 'p1a_post_apply_guard_forbidden_zones_missing', 'P1A post-apply guard forbiddenWriteZones must be a non-empty array.', guardPath);
  }
  const guardRules = Array.isArray(guard.guardRules) ? guard.guardRules as Array<Record<string, unknown>> : null;
  if (!guardRules) {
    pushFinding(findings, 'blocker', 'p1a_post_apply_guard_rules_missing', 'P1A post-apply guard guardRules must be an array.', guardPath);
  } else {
    if (summary.guardRules !== guardRules.length) {
      pushFinding(findings, 'blocker', 'p1a_post_apply_guard_rule_count_mismatch', 'P1A summary.guardRules must match guardRules.length.', guardPath);
    }
    if (!guardRules.some((rule) => rule.id === 'P1A-SCOPE-ONLY') || !guardRules.some((rule) => rule.id === 'P1A-NO-FRENCH-GENERATION')) {
      pushFinding(findings, 'blocker', 'p1a_post_apply_guard_core_rules_missing', 'P1A post-apply guard must include scope and no-French-generation rules.', guardPath);
    }
  }
  const commands = Array.isArray(guard.commands) ? guard.commands as Array<Record<string, unknown>> : null;
  if (!commands) {
    pushFinding(findings, 'blocker', 'p1a_post_apply_guard_commands_missing', 'P1A post-apply guard commands must be an array.', guardPath);
  } else {
    if (summary.guardCommands !== commands.length) {
      pushFinding(findings, 'blocker', 'p1a_post_apply_guard_command_count_mismatch', 'P1A summary.guardCommands must match commands.length.', guardPath);
    }
    for (const required of ['P1A_ALLOWED_STATUS', 'P1A_DIRECT_TESTS', 'P1A_WITH_DEV_TARGET_REGRESSION', 'P1A_READINESS_RECHECK']) {
      if (!commands.some((command) => command.id === required)) {
        pushFinding(findings, 'blocker', 'p1a_post_apply_guard_required_command_missing', `P1A post-apply guard missing command ${required}.`, guardPath);
      }
    }
  }
  if (!Array.isArray(guard.findings)) {
    pushFinding(findings, 'blocker', 'p1a_post_apply_guard_findings_missing', 'P1A post-apply guard findings must be an array.', guardPath);
  }
  if (!fs.existsSync(path.join(runDir, 'audits', 'p1a_post_apply_guard.md'))) {
    pushFinding(findings, 'blocker', 'p1a_post_apply_guard_markdown_missing', 'P1A post-apply guard markdown report is missing.', guardPath);
  }
  if (guard.status === 'PASS' && (
    summary.blockers !== 0 ||
    summary.allowedFiles !== 4 ||
    summary.allowedProductionFiles !== 2 ||
    summary.allowedTestFiles !== 2 ||
    Number(summary.forbiddenWriteZones) < 1 ||
    Number(summary.guardRules) < 5 ||
    Number(summary.guardCommands) < 5 ||
    summary.postApplyStatus !== 'not_run' ||
    summary.guardReadyAfterApproval !== true ||
    summary.mayStartFrenchGeneration !== false ||
    summary.mayModifyProductionAppFiles !== false
  )) {
    pushFinding(findings, 'blocker', 'p1a_post_apply_guard_pass_with_gaps', 'P1A post-apply guard cannot be PASS while guard gaps remain or safety flags are open.', guardPath);
  }
}

function validateP1ARollbackCheckpoint(runDir: string, runId: string | null, findings: Finding[]): void {
  const checkpointPath = path.join(runDir, 'apply_plan', 'p1a_rollback_checkpoint.json');
  if (!fs.existsSync(checkpointPath)) return;
  const checkpoint = readJson<Record<string, unknown>>(checkpointPath, findings);
  if (!checkpoint) return;
  if (checkpoint.schemaVersion !== 'gustav-p1a-rollback-checkpoint-v0') {
    pushFinding(findings, 'blocker', 'p1a_rollback_checkpoint_schema_version', 'P1A rollback checkpoint schemaVersion must be gustav-p1a-rollback-checkpoint-v0.', checkpointPath);
  }
  if (runId && checkpoint.runId !== runId) {
    pushFinding(findings, 'blocker', 'p1a_rollback_checkpoint_run_id_mismatch', `P1A rollback checkpoint runId ${String(checkpoint.runId)} does not match manifest ${runId}.`, checkpointPath);
  }
  const status = typeof checkpoint.status === 'string' ? checkpoint.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'p1a_rollback_checkpoint_status_invalid', `P1A rollback checkpoint status is invalid: ${status}`, checkpointPath);
  }
  const summary = checkpoint.summary && typeof checkpoint.summary === 'object'
    ? checkpoint.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'p1a_rollback_checkpoint_summary_missing', 'P1A rollback checkpoint summary must be an object.', checkpointPath);
    return;
  }
  for (const key of ['files', 'absentFiles', 'existingFiles', 'parentDirsReady', 'snapshots', 'contentHashes', 'rollbackActions', 'blockers', 'warnings']) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'p1a_rollback_checkpoint_summary_number_missing', `P1A rollback checkpoint summary.${key} must be a number.`, checkpointPath);
    }
  }
  for (const key of ['checkpointReadyAfterApproval', 'mayStartFrenchGeneration', 'mayModifyProductionAppFiles']) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'p1a_rollback_checkpoint_summary_boolean_missing', `P1A rollback checkpoint summary.${key} must be boolean.`, checkpointPath);
    }
  }
  const snapshots = Array.isArray(checkpoint.snapshots) ? checkpoint.snapshots as Array<Record<string, unknown>> : null;
  if (!snapshots) {
    pushFinding(findings, 'blocker', 'p1a_rollback_checkpoint_snapshots_missing', 'P1A rollback checkpoint snapshots must be an array.', checkpointPath);
  } else {
    if (summary.snapshots !== snapshots.length || summary.files !== snapshots.length) {
      pushFinding(findings, 'blocker', 'p1a_rollback_checkpoint_snapshot_count_mismatch', 'P1A rollback checkpoint summary counts must match snapshots.length.', checkpointPath);
    }
    const requiredFiles = [
      'app/study_target.ts',
      'app/target_storage_keys.ts',
      'tests/gustav_surface_target_switch.test.ts',
      'tests/gustav_target_storage_keys.test.ts',
    ];
    for (const required of requiredFiles) {
      if (!snapshots.some((snapshot) => snapshot.filePath === required)) {
        pushFinding(findings, 'blocker', 'p1a_rollback_checkpoint_required_snapshot_missing', `P1A rollback checkpoint missing snapshot for ${required}.`, checkpointPath);
      }
    }
    for (const snapshot of snapshots) {
      const filePath = typeof snapshot.filePath === 'string' ? snapshot.filePath : '';
      if (snapshot.expectedAction !== 'add' || snapshot.existsNow !== false || snapshot.parentDirExists !== true || snapshot.sizeBytes !== null || snapshot.sha256 !== null || snapshot.rollbackAction !== 'delete_if_created_by_p1a') {
        pushFinding(findings, 'blocker', 'p1a_rollback_checkpoint_snapshot_invalid', `P1A rollback snapshot for ${filePath || '<unknown>'} must be absent/additive/delete-new-file only.`, checkpointPath);
      }
      if (typeof snapshot.rollbackNote !== 'string') {
        pushFinding(findings, 'blocker', 'p1a_rollback_checkpoint_snapshot_note_missing', `P1A rollback snapshot for ${filePath || '<unknown>'} must include rollbackNote.`, checkpointPath);
      }
    }
  }
  const rollbackPolicy = checkpoint.rollbackPolicy && typeof checkpoint.rollbackPolicy === 'object'
    ? checkpoint.rollbackPolicy as Record<string, unknown>
    : null;
  if (!rollbackPolicy || rollbackPolicy.mode !== 'additive_files_only' || !Array.isArray(rollbackPolicy.safeRollback) || !Array.isArray(rollbackPolicy.manualReviewRequiredWhen)) {
    pushFinding(findings, 'blocker', 'p1a_rollback_checkpoint_policy_invalid', 'P1A rollback checkpoint must include additive_files_only rollback policy with safe/manual-review rules.', checkpointPath);
  }
  if (!Array.isArray(checkpoint.findings)) {
    pushFinding(findings, 'blocker', 'p1a_rollback_checkpoint_findings_missing', 'P1A rollback checkpoint findings must be an array.', checkpointPath);
  }
  if (!fs.existsSync(path.join(runDir, 'apply_plan', 'P1A_ROLLBACK_CHECKPOINT.md'))) {
    pushFinding(findings, 'blocker', 'p1a_rollback_checkpoint_markdown_missing', 'P1A rollback checkpoint markdown report is missing.', checkpointPath);
  }
  if (checkpoint.status === 'PASS' && (
    summary.blockers !== 0 ||
    summary.files !== 4 ||
    summary.absentFiles !== 4 ||
    summary.existingFiles !== 0 ||
    summary.parentDirsReady !== 4 ||
    summary.snapshots !== 4 ||
    summary.contentHashes !== 0 ||
    summary.rollbackActions !== 4 ||
    summary.checkpointReadyAfterApproval !== true ||
    summary.mayStartFrenchGeneration !== false ||
    summary.mayModifyProductionAppFiles !== false
  )) {
    pushFinding(findings, 'blocker', 'p1a_rollback_checkpoint_pass_with_gaps', 'P1A rollback checkpoint cannot be PASS while rollback gaps remain or safety flags are open.', checkpointPath);
  }
}

function validateP1AExpoRouteSafetyAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'p1a_expo_route_safety_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-p1a-expo-route-safety-audit-v0') {
    pushFinding(findings, 'blocker', 'p1a_expo_route_safety_schema_version', 'P1A Expo route safety audit schemaVersion must be gustav-p1a-expo-route-safety-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'p1a_expo_route_safety_run_id_mismatch', `P1A Expo route safety audit runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'p1a_expo_route_safety_status_invalid', `P1A Expo route safety audit status is invalid: ${status}`, auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'p1a_expo_route_safety_summary_missing', 'P1A Expo route safety audit summary must be an object.', auditPath);
    return;
  }
  for (const key of ['plannedAppUtilityFiles', 'routeShimRequiredFiles', 'existingShimEvidenceFiles', 'pureModuleContracts', 'forbiddenImportRules', 'forbiddenPatternRules', 'blockers', 'warnings']) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'p1a_expo_route_safety_summary_number_missing', `P1A Expo route safety audit summary.${key} must be a number.`, auditPath);
    }
  }
  for (const key of ['routeSafeAfterApproval', 'mayStartFrenchGeneration', 'mayModifyProductionAppFiles']) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'p1a_expo_route_safety_summary_boolean_missing', `P1A Expo route safety audit summary.${key} must be boolean.`, auditPath);
    }
  }
  const evidence = Array.isArray(audit.existingShimEvidence) ? audit.existingShimEvidence as Array<Record<string, unknown>> : null;
  if (!evidence) {
    pushFinding(findings, 'blocker', 'p1a_expo_route_safety_evidence_missing', 'P1A Expo route safety existingShimEvidence must be an array.', auditPath);
  } else {
    if (summary.existingShimEvidenceFiles !== evidence.length) {
      pushFinding(findings, 'blocker', 'p1a_expo_route_safety_evidence_count_mismatch', 'P1A summary.existingShimEvidenceFiles must match evidence.length.', auditPath);
    }
    if (!evidence.some((entry) => entry.filePath === 'app/study_target_lang_dev.ts' && entry.hasDefaultRouteShim === true)) {
      pushFinding(findings, 'blocker', 'p1a_expo_route_safety_study_target_dev_evidence_missing', 'P1A route safety must cite app/study_target_lang_dev.ts route shim evidence.', auditPath);
    }
  }
  const contracts = Array.isArray(audit.plannedModuleContracts) ? audit.plannedModuleContracts as Array<Record<string, unknown>> : null;
  if (!contracts) {
    pushFinding(findings, 'blocker', 'p1a_expo_route_safety_contracts_missing', 'P1A Expo route safety plannedModuleContracts must be an array.', auditPath);
  } else {
    if (summary.plannedAppUtilityFiles !== contracts.length) {
      pushFinding(findings, 'blocker', 'p1a_expo_route_safety_contract_count_mismatch', 'P1A summary.plannedAppUtilityFiles must match plannedModuleContracts.length.', auditPath);
    }
    for (const required of ['app/study_target.ts', 'app/target_storage_keys.ts']) {
      if (!contracts.some((contract) => contract.filePath === required)) {
        pushFinding(findings, 'blocker', 'p1a_expo_route_safety_required_contract_missing', `P1A route safety missing contract for ${required}.`, auditPath);
      }
    }
    for (const contract of contracts) {
      const filePath = typeof contract.filePath === 'string' ? contract.filePath : '';
      if (contract.routeShimRequired !== true || typeof contract.defaultExportName !== 'string' || !contract.defaultExportName || contract.pureModuleRequired !== true) {
        pushFinding(findings, 'blocker', 'p1a_expo_route_safety_contract_invalid', `P1A route safety contract for ${filePath || '<unknown>'} must require route shim and pure module.`, auditPath);
      }
      if (!Array.isArray(contract.forbiddenImports) || !Array.isArray(contract.forbiddenPatterns) || !Array.isArray(contract.requiredNamedExports)) {
        pushFinding(findings, 'blocker', 'p1a_expo_route_safety_contract_arrays_missing', `P1A route safety contract for ${filePath || '<unknown>'} must include forbiddenImports, forbiddenPatterns and requiredNamedExports arrays.`, auditPath);
      }
    }
  }
  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'p1a_expo_route_safety_findings_missing', 'P1A Expo route safety findings must be an array.', auditPath);
  }
  if (!fs.existsSync(path.join(runDir, 'audits', 'p1a_expo_route_safety_audit.md'))) {
    pushFinding(findings, 'blocker', 'p1a_expo_route_safety_markdown_missing', 'P1A Expo route safety markdown report is missing.', auditPath);
  }
  if (audit.status === 'PASS' && (
    summary.blockers !== 0 ||
    summary.plannedAppUtilityFiles !== 2 ||
    summary.routeShimRequiredFiles !== 2 ||
    Number(summary.existingShimEvidenceFiles) < 2 ||
    summary.pureModuleContracts !== 2 ||
    Number(summary.forbiddenImportRules) < 1 ||
    Number(summary.forbiddenPatternRules) < 1 ||
    summary.routeSafeAfterApproval !== true ||
    summary.mayStartFrenchGeneration !== false ||
    summary.mayModifyProductionAppFiles !== false
  )) {
    pushFinding(findings, 'blocker', 'p1a_expo_route_safety_pass_with_gaps', 'P1A Expo route safety audit cannot be PASS while route safety gaps remain or safety flags are open.', auditPath);
  }
}

function validateP1AKeyCollisionAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'p1a_key_collision_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-p1a-key-collision-audit-v0') {
    pushFinding(findings, 'blocker', 'p1a_key_collision_schema_version', 'P1A key collision audit schemaVersion must be gustav-p1a-key-collision-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'p1a_key_collision_run_id_mismatch', `P1A key collision audit runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'p1a_key_collision_status_invalid', `P1A key collision audit status is invalid: ${status}`, auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'p1a_key_collision_summary_missing', 'P1A key collision audit summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'targetDomains',
    'studyTargets',
    'sourceLocales',
    'sampleIds',
    'encodedIdSamples',
    'generatedKeys',
    'uniqueKeys',
    'collisions',
    'separatorLeakChecks',
    'separatorLeaks',
    'reservedPatterns',
    'implementationRules',
    'requiredTestAdditions',
    'blockers',
    'warnings',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'p1a_key_collision_summary_number_missing', `P1A key collision audit summary.${key} must be a number.`, auditPath);
    }
  }
  for (const key of ['collisionSafeAfterApproval', 'mayStartFrenchGeneration', 'mayModifyProductionAppFiles']) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'p1a_key_collision_summary_boolean_missing', `P1A key collision audit summary.${key} must be boolean.`, auditPath);
    }
  }
  const encodingPolicy = audit.encodingPolicy && typeof audit.encodingPolicy === 'object'
    ? audit.encodingPolicy as Record<string, unknown>
    : null;
  if (!encodingPolicy) {
    pushFinding(findings, 'blocker', 'p1a_key_collision_encoding_policy_missing', 'P1A key collision audit encodingPolicy must be an object.', auditPath);
  } else {
    if (encodingPolicy.separator !== '::' || encodingPolicy.idEncoder !== 'encodeURIComponent(String(id))') {
      pushFinding(findings, 'blocker', 'p1a_key_collision_encoding_policy_invalid', 'P1A key collision audit must require :: separator and encodeURIComponent(String(id)).', auditPath);
    }
    if (!Array.isArray(encodingPolicy.reservedRawPatterns) || !Array.isArray(encodingPolicy.implementationRules)) {
      pushFinding(findings, 'blocker', 'p1a_key_collision_encoding_policy_arrays_missing', 'P1A key collision encodingPolicy must include reservedRawPatterns and implementationRules arrays.', auditPath);
    }
  }
  const sampleIds = Array.isArray(audit.sampleIds) ? audit.sampleIds : null;
  if (!sampleIds || sampleIds.length < 8) {
    pushFinding(findings, 'blocker', 'p1a_key_collision_sample_ids_missing', 'P1A key collision audit must include at least 8 sample ids.', auditPath);
  }
  const sampleKeys = Array.isArray(audit.sampleKeys) ? audit.sampleKeys as Array<Record<string, unknown>> : null;
  if (!sampleKeys) {
    pushFinding(findings, 'blocker', 'p1a_key_collision_sample_keys_missing', 'P1A key collision audit sampleKeys must be an array.', auditPath);
  } else {
    if (summary.generatedKeys !== sampleKeys.length) {
      pushFinding(findings, 'blocker', 'p1a_key_collision_key_count_mismatch', 'P1A key collision summary.generatedKeys must match sampleKeys.length.', auditPath);
    }
    const uniqueKeys = new Set(sampleKeys.map((sample) => sample.key).filter((key) => typeof key === 'string'));
    if (uniqueKeys.size !== sampleKeys.length || summary.uniqueKeys !== uniqueKeys.size) {
      pushFinding(findings, 'blocker', 'p1a_key_collision_unique_count_mismatch', 'P1A key collision sample keys must be unique and match summary.uniqueKeys.', auditPath);
    }
    for (const sample of sampleKeys) {
      if (typeof sample.kind !== 'string' || typeof sample.domain !== 'string' || typeof sample.key !== 'string') {
        pushFinding(findings, 'blocker', 'p1a_key_collision_sample_shape_invalid', 'P1A sample key entries must include kind, domain and key.', auditPath);
      }
      if (typeof sample.encodedId === 'string' && sample.encodedId.includes('::')) {
        pushFinding(findings, 'blocker', 'p1a_key_collision_encoded_separator_leak', 'P1A encoded id sample contains :: separator.', auditPath);
      }
    }
  }
  const requiredTestAdditions = Array.isArray(audit.requiredTestAdditions) ? audit.requiredTestAdditions as Array<Record<string, unknown>> : null;
  if (!requiredTestAdditions || requiredTestAdditions.length < 3) {
    pushFinding(findings, 'blocker', 'p1a_key_collision_required_tests_missing', 'P1A key collision audit must include at least 3 required test additions.', auditPath);
  } else if (!requiredTestAdditions.every((test) => test.file === 'tests/gustav_target_storage_keys.test.ts')) {
    pushFinding(findings, 'blocker', 'p1a_key_collision_required_tests_file_invalid', 'P1A key collision required tests must target gustav_target_storage_keys.test.ts.', auditPath);
  }
  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'p1a_key_collision_findings_missing', 'P1A key collision findings must be an array.', auditPath);
  }
  if (!fs.existsSync(path.join(runDir, 'audits', 'p1a_key_collision_audit.md'))) {
    pushFinding(findings, 'blocker', 'p1a_key_collision_markdown_missing', 'P1A key collision markdown report is missing.', auditPath);
  }
  if (audit.status === 'PASS' && (
    summary.blockers !== 0 ||
    summary.targetDomains !== 10 ||
    summary.studyTargets !== 2 ||
    summary.sourceLocales !== 2 ||
    Number(summary.sampleIds) < 8 ||
    summary.generatedKeys !== summary.uniqueKeys ||
    summary.collisions !== 0 ||
    summary.separatorLeaks !== 0 ||
    Number(summary.implementationRules) < 6 ||
    Number(summary.requiredTestAdditions) < 3 ||
    summary.collisionSafeAfterApproval !== true ||
    summary.mayStartFrenchGeneration !== false ||
    summary.mayModifyProductionAppFiles !== false
  )) {
    pushFinding(findings, 'blocker', 'p1a_key_collision_pass_with_gaps', 'P1A key collision audit cannot be PASS while collision gaps remain or safety flags are open.', auditPath);
  }
}

function validateP1AImportContractAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'p1a_import_contract_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const repoRoot = path.resolve(runDir, '..', '..', '..', '..');
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-p1a-import-contract-audit-v0') {
    pushFinding(findings, 'blocker', 'p1a_import_contract_schema_version', 'P1A import contract audit schemaVersion must be gustav-p1a-import-contract-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'p1a_import_contract_run_id_mismatch', `P1A import contract audit runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'p1a_import_contract_status_invalid', `P1A import contract audit status is invalid: ${status}`, auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'p1a_import_contract_summary_missing', 'P1A import contract audit summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'plannedModules',
    'plannedTestFiles',
    'importEdges',
    'dependencyCycles',
    'forbiddenCycles',
    'routeShimContracts',
    'probeFiles',
    'compileCommands',
    'blockers',
    'warnings',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'p1a_import_contract_summary_number_missing', `P1A import contract audit summary.${key} must be a number.`, auditPath);
    }
  }
  for (const key of ['compilePassed', 'jestImportPathCompatible', 'importSafeAfterApproval', 'mayStartFrenchGeneration', 'mayModifyProductionAppFiles']) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'p1a_import_contract_summary_boolean_missing', `P1A import contract audit summary.${key} must be boolean.`, auditPath);
    }
  }

  const moduleContracts = Array.isArray(audit.moduleContracts) ? audit.moduleContracts as Array<Record<string, unknown>> : null;
  if (!moduleContracts) {
    pushFinding(findings, 'blocker', 'p1a_import_contract_modules_missing', 'P1A import contract audit moduleContracts must be an array.', auditPath);
  } else {
    if (summary.plannedModules !== moduleContracts.length) {
      pushFinding(findings, 'blocker', 'p1a_import_contract_module_count_mismatch', 'P1A import contract summary.plannedModules must match moduleContracts.length.', auditPath);
    }
    for (const required of ['app/study_target.ts', 'app/target_storage_keys.ts']) {
      if (!moduleContracts.some((contract) => contract.filePath === required)) {
        pushFinding(findings, 'blocker', 'p1a_import_contract_required_module_missing', `P1A import contract missing module ${required}.`, auditPath);
      }
    }
    for (const contract of moduleContracts) {
      const filePath = typeof contract.filePath === 'string' ? contract.filePath : '';
      if (!filePath || !Array.isArray(contract.importsFrom) || !Array.isArray(contract.exports) || typeof contract.defaultRouteShim !== 'string' || !Array.isArray(contract.forbiddenImports)) {
        pushFinding(findings, 'blocker', 'p1a_import_contract_module_shape_invalid', `P1A import contract module shape is invalid for ${filePath || '<unknown>'}.`, auditPath);
        continue;
      }
      if (filePath === 'app/study_target.ts' && (contract.importsFrom as unknown[]).length !== 0) {
        pushFinding(findings, 'blocker', 'p1a_import_contract_study_target_has_imports', 'app/study_target.ts must stay dependency-free in the P1A import contract.', auditPath);
      }
      if (filePath === 'app/target_storage_keys.ts' && !(contract.importsFrom as unknown[]).includes('./study_target')) {
        pushFinding(findings, 'blocker', 'p1a_import_contract_target_keys_missing_study_target_import', 'app/target_storage_keys.ts must import only the production StudyTarget contract.', auditPath);
      }
      if ((contract.forbiddenImports as unknown[]).includes('./study_target_lang_dev') && filePath === 'app/target_storage_keys.ts') {
        // This is the expected explicit guard; no finding.
      }
    }
  }

  const testImportContracts = Array.isArray(audit.testImportContracts) ? audit.testImportContracts as Array<Record<string, unknown>> : null;
  if (!testImportContracts) {
    pushFinding(findings, 'blocker', 'p1a_import_contract_tests_missing', 'P1A import contract audit testImportContracts must be an array.', auditPath);
  } else {
    if (summary.plannedTestFiles !== testImportContracts.length) {
      pushFinding(findings, 'blocker', 'p1a_import_contract_test_count_mismatch', 'P1A import contract summary.plannedTestFiles must match testImportContracts.length.', auditPath);
    }
    const expectedImports = new Map([
      ['tests/gustav_surface_target_switch.test.ts', '../app/study_target'],
      ['tests/gustav_target_storage_keys.test.ts', '../app/target_storage_keys'],
    ]);
    for (const [filePath, importPath] of expectedImports.entries()) {
      if (!testImportContracts.some((contract) => contract.filePath === filePath && contract.importPath === importPath)) {
        pushFinding(findings, 'blocker', 'p1a_import_contract_expected_test_import_missing', `P1A import contract missing ${filePath} -> ${importPath}.`, auditPath);
      }
    }
    for (const contract of testImportContracts) {
      if (typeof contract.filePath !== 'string' || typeof contract.importPath !== 'string' || !Array.isArray(contract.importedNames) || !Array.isArray(contract.importedTypes) || !Array.isArray(contract.mustNotImport)) {
        pushFinding(findings, 'blocker', 'p1a_import_contract_test_shape_invalid', 'P1A test import contract entries must include filePath, importPath, importedNames, importedTypes and mustNotImport.', auditPath);
      }
      if (Array.isArray(contract.mustNotImport) && !(contract.mustNotImport as unknown[]).includes('../app/study_target_lang_dev')) {
        pushFinding(findings, 'blocker', 'p1a_import_contract_dev_target_guard_missing', 'P1A tests must explicitly forbid importing the dev StudyTargetLang module.', auditPath);
      }
    }
  }

  const dependencyEdges = Array.isArray(audit.dependencyEdges) ? audit.dependencyEdges as Array<Record<string, unknown>> : null;
  if (!dependencyEdges) {
    pushFinding(findings, 'blocker', 'p1a_import_contract_edges_missing', 'P1A import contract audit dependencyEdges must be an array.', auditPath);
  } else {
    if (summary.importEdges !== dependencyEdges.length) {
      pushFinding(findings, 'blocker', 'p1a_import_contract_edge_count_mismatch', 'P1A import contract summary.importEdges must match dependencyEdges.length.', auditPath);
    }
    if (!dependencyEdges.some((edge) => edge.from === 'app/target_storage_keys.ts' && edge.to === 'app/study_target.ts')) {
      pushFinding(findings, 'blocker', 'p1a_import_contract_core_edge_missing', 'P1A import contract must include target_storage_keys -> study_target edge.', auditPath);
    }
  }

  const dependencyCycles = Array.isArray(audit.dependencyCycles) ? audit.dependencyCycles : null;
  if (!dependencyCycles) {
    pushFinding(findings, 'blocker', 'p1a_import_contract_cycles_missing', 'P1A import contract audit dependencyCycles must be an array.', auditPath);
  } else if (summary.dependencyCycles !== dependencyCycles.length) {
    pushFinding(findings, 'blocker', 'p1a_import_contract_cycle_count_mismatch', 'P1A import contract summary.dependencyCycles must match dependencyCycles.length.', auditPath);
  }

  const compileProbe = audit.compileProbe && typeof audit.compileProbe === 'object'
    ? audit.compileProbe as Record<string, unknown>
    : null;
  if (!compileProbe) {
    pushFinding(findings, 'blocker', 'p1a_import_contract_compile_probe_missing', 'P1A import contract audit compileProbe must be an object.', auditPath);
  } else {
    const probeFiles = Array.isArray(compileProbe.files) ? compileProbe.files as unknown[] : null;
    const command = Array.isArray(compileProbe.command) ? compileProbe.command as unknown[] : null;
    if (!probeFiles || !command || typeof compileProbe.dir !== 'string' || typeof compileProbe.logPath !== 'string') {
      pushFinding(findings, 'blocker', 'p1a_import_contract_compile_probe_shape_invalid', 'P1A compileProbe must include dir, files, command and logPath.', auditPath);
    } else {
      if (summary.probeFiles !== probeFiles.length) {
        pushFinding(findings, 'blocker', 'p1a_import_contract_probe_file_count_mismatch', 'P1A summary.probeFiles must match compileProbe.files.length.', auditPath);
      }
      for (const filePath of probeFiles) {
        if (typeof filePath !== 'string' || !fs.existsSync(path.resolve(repoRoot, filePath))) {
          const resolved = typeof filePath === 'string' ? path.resolve(repoRoot, filePath) : auditPath;
          pushFinding(findings, 'blocker', 'p1a_import_contract_probe_file_missing', `P1A compile probe file is missing: ${String(filePath)}`, resolved);
        }
      }
      if (!fs.existsSync(path.resolve(repoRoot, String(compileProbe.logPath)))) {
        pushFinding(findings, 'blocker', 'p1a_import_contract_compile_log_missing', 'P1A compile probe log is missing.', auditPath);
      }
    }
    if (summary.compilePassed === true && compileProbe.exitCode !== 0) {
      pushFinding(findings, 'blocker', 'p1a_import_contract_compile_exit_mismatch', 'P1A compilePassed cannot be true unless compileProbe.exitCode is 0.', auditPath);
    }
  }

  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'p1a_import_contract_findings_missing', 'P1A import contract findings must be an array.', auditPath);
  }
  if (!fs.existsSync(path.join(runDir, 'audits', 'p1a_import_contract_audit.md'))) {
    pushFinding(findings, 'blocker', 'p1a_import_contract_markdown_missing', 'P1A import contract markdown report is missing.', auditPath);
  }
  if (audit.status === 'PASS' && (
    summary.blockers !== 0 ||
    summary.plannedModules !== 2 ||
    summary.plannedTestFiles !== 2 ||
    Number(summary.importEdges) < 3 ||
    summary.dependencyCycles !== 0 ||
    summary.forbiddenCycles !== 0 ||
    summary.routeShimContracts !== 2 ||
    summary.probeFiles !== 4 ||
    summary.compileCommands !== 1 ||
    summary.compilePassed !== true ||
    summary.jestImportPathCompatible !== true ||
    summary.importSafeAfterApproval !== true ||
    summary.mayStartFrenchGeneration !== false ||
    summary.mayModifyProductionAppFiles !== false
  )) {
    pushFinding(findings, 'blocker', 'p1a_import_contract_pass_with_gaps', 'P1A import contract audit cannot be PASS while import safety gaps remain or safety flags are open.', auditPath);
  }
}

function validateP1AApprovalLockAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'p1a_approval_lock_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-p1a-approval-lock-audit-v0') {
    pushFinding(findings, 'blocker', 'p1a_approval_lock_schema_version', 'P1A approval lock audit schemaVersion must be gustav-p1a-approval-lock-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'p1a_approval_lock_run_id_mismatch', `P1A approval lock audit runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'p1a_approval_lock_status_invalid', `P1A approval lock audit status is invalid: ${status}`, auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'p1a_approval_lock_summary_missing', 'P1A approval lock audit summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'approvalReceiptCandidates',
    'approvalReceiptsPresent',
    'exactApprovalMatches',
    'rejectedImplicitCommands',
    'requiredApprovalTextLength',
    'blockers',
    'warnings',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'p1a_approval_lock_summary_number_missing', `P1A approval lock audit summary.${key} must be a number.`, auditPath);
    }
  }
  for (const key of [
    'packetReadyForApproval',
    'approvalStatusLocked',
    'exactApprovalRequired',
    'implicitApprovalRejected',
    'accidentalApplyBlocked',
    'unlockPossibleAfterExactReceipt',
    'mayStartFrenchGeneration',
    'mayModifyProductionAppFiles',
  ]) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'p1a_approval_lock_summary_boolean_missing', `P1A approval lock audit summary.${key} must be boolean.`, auditPath);
    }
  }

  const packetPath = path.join(runDir, 'apply_plan', 'p1a_minimal_apply_packet.json');
  const packet = fs.existsSync(packetPath) ? readJson<Record<string, unknown>>(packetPath, findings) : null;
  const packetApprovalText = packet && typeof packet.requiredApprovalText === 'string' ? packet.requiredApprovalText : null;
  const approvalGate = audit.approvalGate && typeof audit.approvalGate === 'object'
    ? audit.approvalGate as Record<string, unknown>
    : null;
  if (!approvalGate) {
    pushFinding(findings, 'blocker', 'p1a_approval_lock_gate_missing', 'P1A approval lock audit approvalGate must be an object.', auditPath);
  } else {
    if (approvalGate.lockState !== 'locked_until_exact_receipt') {
      pushFinding(findings, 'blocker', 'p1a_approval_lock_state_invalid', 'P1A approval lock state must be locked_until_exact_receipt.', auditPath);
    }
    if (typeof approvalGate.requiredApprovalText !== 'string' || approvalGate.requiredApprovalText.length < 80) {
      pushFinding(findings, 'blocker', 'p1a_approval_lock_required_text_missing', 'P1A approval lock must include exact requiredApprovalText.', auditPath);
    }
    if (packetApprovalText && approvalGate.requiredApprovalText !== packetApprovalText) {
      pushFinding(findings, 'blocker', 'p1a_approval_lock_required_text_mismatch', 'P1A approval lock requiredApprovalText must match p1a_minimal_apply_packet.json.', auditPath);
    }
    if (!Array.isArray(approvalGate.approvalReceiptPaths) || (approvalGate.approvalReceiptPaths as unknown[]).length < 3) {
      pushFinding(findings, 'blocker', 'p1a_approval_lock_receipt_paths_missing', 'P1A approval lock must list at least 3 approval receipt candidate paths.', auditPath);
    }
    if (!Array.isArray(approvalGate.rejectedImplicitCommands) || !(approvalGate.rejectedImplicitCommands as unknown[]).includes('дальше')) {
      pushFinding(findings, 'blocker', 'p1a_approval_lock_implicit_commands_missing', 'P1A approval lock must explicitly reject ordinary continuation commands such as дальше.', auditPath);
    }
    const acceptedShape = approvalGate.acceptedReceiptShape && typeof approvalGate.acceptedReceiptShape === 'object'
      ? approvalGate.acceptedReceiptShape as Record<string, unknown>
      : null;
    if (!acceptedShape || acceptedShape.schemaVersion !== 'gustav-p1a-approval-receipt-v0') {
      pushFinding(findings, 'blocker', 'p1a_approval_lock_receipt_shape_invalid', 'P1A approval lock acceptedReceiptShape must use gustav-p1a-approval-receipt-v0.', auditPath);
    }
  }

  const receiptProbes = Array.isArray(audit.receiptProbes) ? audit.receiptProbes as Array<Record<string, unknown>> : null;
  if (!receiptProbes) {
    pushFinding(findings, 'blocker', 'p1a_approval_lock_receipt_probes_missing', 'P1A approval lock receiptProbes must be an array.', auditPath);
  } else {
    if (summary.approvalReceiptCandidates !== receiptProbes.length) {
      pushFinding(findings, 'blocker', 'p1a_approval_lock_receipt_probe_count_mismatch', 'P1A approval lock summary.approvalReceiptCandidates must match receiptProbes.length.', auditPath);
    }
    const presentCount = receiptProbes.filter((probe) => probe.exists === true).length;
    const exactCount = receiptProbes.filter((probe) => probe.exactTextMatches === true).length;
    if (summary.approvalReceiptsPresent !== presentCount || summary.exactApprovalMatches !== exactCount) {
      pushFinding(findings, 'blocker', 'p1a_approval_lock_receipt_summary_mismatch', 'P1A approval lock receipt summary does not match receiptProbes.', auditPath);
    }
    for (const probe of receiptProbes) {
      if (typeof probe.filePath !== 'string' || typeof probe.exists !== 'boolean' || typeof probe.status !== 'string' || typeof probe.exactTextMatches !== 'boolean') {
        pushFinding(findings, 'blocker', 'p1a_approval_lock_receipt_probe_shape_invalid', 'P1A receipt probes must include filePath, exists, status and exactTextMatches.', auditPath);
      }
    }
  }

  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'p1a_approval_lock_findings_missing', 'P1A approval lock findings must be an array.', auditPath);
  }
  if (!fs.existsSync(path.join(runDir, 'audits', 'p1a_approval_lock_audit.md'))) {
    pushFinding(findings, 'blocker', 'p1a_approval_lock_markdown_missing', 'P1A approval lock markdown report is missing.', auditPath);
  }
  if (!fs.existsSync(path.join(runDir, 'apply_plan', 'P1A_APPROVAL_LOCK.md'))) {
    pushFinding(findings, 'blocker', 'p1a_approval_lock_apply_plan_markdown_missing', 'P1A approval lock apply-plan markdown report is missing.', auditPath);
  }
  if (audit.status === 'PASS' && (
    summary.blockers !== 0 ||
    Number(summary.approvalReceiptCandidates) < 3 ||
    summary.approvalReceiptsPresent !== 0 ||
    summary.exactApprovalMatches !== 0 ||
    Number(summary.rejectedImplicitCommands) < 8 ||
    Number(summary.requiredApprovalTextLength) < 80 ||
    summary.packetReadyForApproval !== true ||
    summary.approvalStatusLocked !== true ||
    summary.exactApprovalRequired !== true ||
    summary.implicitApprovalRejected !== true ||
    summary.accidentalApplyBlocked !== true ||
    summary.unlockPossibleAfterExactReceipt !== true ||
    summary.mayStartFrenchGeneration !== false ||
    summary.mayModifyProductionAppFiles !== false
  )) {
    pushFinding(findings, 'blocker', 'p1a_approval_lock_pass_with_gaps', 'P1A approval lock audit cannot be PASS while approval lock gaps remain or safety flags are open.', auditPath);
  }
}

function validateP1AImplementationBlueprintAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'p1a_implementation_blueprint_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const repoRoot = path.resolve(runDir, '..', '..', '..', '..');
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-p1a-implementation-blueprint-audit-v0') {
    pushFinding(findings, 'blocker', 'p1a_blueprint_schema_version', 'P1A implementation blueprint audit schemaVersion must be gustav-p1a-implementation-blueprint-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'p1a_blueprint_run_id_mismatch', `P1A implementation blueprint audit runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'p1a_blueprint_status_invalid', `P1A implementation blueprint audit status is invalid: ${status}`, auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'p1a_blueprint_summary_missing', 'P1A implementation blueprint audit summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'blueprintFiles',
    'plannedProductionFiles',
    'plannedTestFiles',
    'dryRunRunners',
    'assertionGroups',
    'assertions',
    'compileCommands',
    'runtimeCommands',
    'blockers',
    'warnings',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'p1a_blueprint_summary_number_missing', `P1A implementation blueprint audit summary.${key} must be a number.`, auditPath);
    }
  }
  for (const key of [
    'compilePassed',
    'runtimePassed',
    'productionFilesStillAbsent',
    'productionTestsStillAbsent',
    'blueprintReadyAfterExactApproval',
    'mayStartFrenchGeneration',
    'mayModifyProductionAppFiles',
  ]) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'p1a_blueprint_summary_boolean_missing', `P1A implementation blueprint audit summary.${key} must be boolean.`, auditPath);
    }
  }

  const blueprintRoot = typeof audit.blueprintRoot === 'string' ? audit.blueprintRoot : '';
  if (!blueprintRoot || !fs.existsSync(path.resolve(repoRoot, blueprintRoot))) {
    pushFinding(findings, 'blocker', 'p1a_blueprint_root_missing', 'P1A implementation blueprint root must exist inside the run folder.', auditPath);
  }
  const blueprintFiles = Array.isArray(audit.blueprintFiles) ? audit.blueprintFiles as Array<Record<string, unknown>> : null;
  if (!blueprintFiles) {
    pushFinding(findings, 'blocker', 'p1a_blueprint_files_missing', 'P1A implementation blueprint audit blueprintFiles must be an array.', auditPath);
  } else {
    if (summary.blueprintFiles !== blueprintFiles.length) {
      pushFinding(findings, 'blocker', 'p1a_blueprint_file_count_mismatch', 'P1A summary.blueprintFiles must match blueprintFiles.length.', auditPath);
    }
    for (const required of [
      'app/study_target.ts',
      'app/target_storage_keys.ts',
      'tests/gustav_surface_target_switch.test.ts',
      'tests/gustav_target_storage_keys.test.ts',
      'blueprint_runtime_check.ts',
    ]) {
      if (!blueprintFiles.some((file) => typeof file.filePath === 'string' && file.filePath.endsWith(required))) {
        pushFinding(findings, 'blocker', 'p1a_blueprint_required_file_missing', `P1A blueprint missing ${required}.`, auditPath);
      }
    }
    for (const file of blueprintFiles) {
      if (typeof file.filePath !== 'string' || typeof file.role !== 'string' || typeof file.bytes !== 'number' || typeof file.lineCount !== 'number') {
        pushFinding(findings, 'blocker', 'p1a_blueprint_file_shape_invalid', 'P1A blueprint file entries must include filePath, role, bytes and lineCount.', auditPath);
        continue;
      }
      if (!fs.existsSync(path.resolve(repoRoot, file.filePath))) {
        pushFinding(findings, 'blocker', 'p1a_blueprint_file_missing_on_disk', `P1A blueprint file is missing on disk: ${file.filePath}`, auditPath);
      }
    }
  }

  const assertionGroups = Array.isArray(audit.assertionGroups) ? audit.assertionGroups as Array<Record<string, unknown>> : null;
  if (!assertionGroups) {
    pushFinding(findings, 'blocker', 'p1a_blueprint_assertions_missing', 'P1A implementation blueprint audit assertionGroups must be an array.', auditPath);
  } else {
    const assertionCount = assertionGroups.reduce((sum, group) => sum + (Array.isArray(group.assertions) ? group.assertions.length : 0), 0);
    if (summary.assertionGroups !== assertionGroups.length || summary.assertions !== assertionCount) {
      pushFinding(findings, 'blocker', 'p1a_blueprint_assertion_count_mismatch', 'P1A blueprint assertion summary must match assertionGroups.', auditPath);
    }
  }

  const compile = audit.compile && typeof audit.compile === 'object' ? audit.compile as Record<string, unknown> : null;
  const runtime = audit.runtime && typeof audit.runtime === 'object' ? audit.runtime as Record<string, unknown> : null;
  for (const [label, execution] of [['compile', compile], ['runtime', runtime]] as const) {
    if (!execution) {
      pushFinding(findings, 'blocker', `p1a_blueprint_${label}_missing`, `P1A blueprint ${label} execution must be an object.`, auditPath);
      continue;
    }
    if (!Array.isArray(execution.command) || typeof execution.logPath !== 'string') {
      pushFinding(findings, 'blocker', `p1a_blueprint_${label}_shape_invalid`, `P1A blueprint ${label} execution must include command and logPath.`, auditPath);
    }
    if (execution.exitCode !== 0) {
      pushFinding(findings, 'blocker', `p1a_blueprint_${label}_exit_nonzero`, `P1A blueprint ${label} exitCode must be 0.`, auditPath);
    }
    if (typeof execution.logPath === 'string' && !fs.existsSync(path.resolve(repoRoot, execution.logPath))) {
      pushFinding(findings, 'blocker', `p1a_blueprint_${label}_log_missing`, `P1A blueprint ${label} log is missing.`, auditPath);
    }
  }

  for (const forbidden of ['app/study_target.ts', 'app/target_storage_keys.ts', 'tests/gustav_surface_target_switch.test.ts', 'tests/gustav_target_storage_keys.test.ts']) {
    if (fs.existsSync(path.join(repoRoot, forbidden)) && shouldBlockP1APreApplyFilePresence(repoRoot, forbidden)) {
      pushFinding(findings, 'blocker', 'p1a_blueprint_production_file_exists', `P1A planned production file exists before approval: ${forbidden}`, auditPath);
    }
  }
  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'p1a_blueprint_findings_missing', 'P1A implementation blueprint findings must be an array.', auditPath);
  }
  if (!fs.existsSync(path.join(runDir, 'audits', 'p1a_implementation_blueprint_audit.md'))) {
    pushFinding(findings, 'blocker', 'p1a_blueprint_markdown_missing', 'P1A implementation blueprint markdown report is missing.', auditPath);
  }
  if (!fs.existsSync(path.join(runDir, 'apply_plan', 'p1a_implementation_blueprint', 'README.md'))) {
    pushFinding(findings, 'blocker', 'p1a_blueprint_readme_missing', 'P1A implementation blueprint README is missing.', auditPath);
  }
  if (audit.status === 'PASS' && (
    summary.blockers !== 0 ||
    summary.blueprintFiles !== 5 ||
    summary.plannedProductionFiles !== 2 ||
    summary.plannedTestFiles !== 2 ||
    summary.dryRunRunners !== 1 ||
    Number(summary.assertionGroups) < 3 ||
    Number(summary.assertions) < 12 ||
    summary.compileCommands !== 1 ||
    summary.runtimeCommands !== 1 ||
    summary.compilePassed !== true ||
    summary.runtimePassed !== true ||
    summary.productionFilesStillAbsent !== true ||
    summary.productionTestsStillAbsent !== true ||
    summary.blueprintReadyAfterExactApproval !== true ||
    summary.mayStartFrenchGeneration !== false ||
    summary.mayModifyProductionAppFiles !== false
  )) {
    pushFinding(findings, 'blocker', 'p1a_blueprint_pass_with_gaps', 'P1A implementation blueprint audit cannot be PASS while blueprint safety gaps remain or safety flags are open.', auditPath);
  }
}

function validateP1ABlueprintHashLockAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'p1a_blueprint_hash_lock_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const repoRoot = path.resolve(runDir, '..', '..', '..', '..');
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-p1a-blueprint-hash-lock-audit-v0') {
    pushFinding(findings, 'blocker', 'p1a_hash_lock_schema_version', 'P1A blueprint hash lock audit schemaVersion must be gustav-p1a-blueprint-hash-lock-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'p1a_hash_lock_run_id_mismatch', `P1A blueprint hash lock audit runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'p1a_hash_lock_status_invalid', `P1A blueprint hash lock audit status is invalid: ${status}`, auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'p1a_hash_lock_summary_missing', 'P1A blueprint hash lock audit summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'lockedFiles',
    'lockedProductionFiles',
    'lockedTestFiles',
    'targetFilesAbsent',
    'targetFilesPresent',
    'hashAlgorithmCount',
    'uniqueHashes',
    'exactCopyRules',
    'blockers',
    'warnings',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'p1a_hash_lock_summary_number_missing', `P1A blueprint hash lock audit summary.${key} must be a number.`, auditPath);
    }
  }
  for (const key of [
    'hashLockReadyAfterExactApproval',
    'driftDetected',
    'productionFilesStillAbsent',
    'productionTestsStillAbsent',
    'mayStartFrenchGeneration',
    'mayModifyProductionAppFiles',
  ]) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'p1a_hash_lock_summary_boolean_missing', `P1A blueprint hash lock audit summary.${key} must be boolean.`, auditPath);
    }
  }

  const lockedFiles = Array.isArray(audit.lockedFiles) ? audit.lockedFiles as Array<Record<string, unknown>> : null;
  if (!lockedFiles) {
    pushFinding(findings, 'blocker', 'p1a_hash_lock_files_missing', 'P1A blueprint hash lock audit lockedFiles must be an array.', auditPath);
  } else {
    if (summary.lockedFiles !== lockedFiles.length) {
      pushFinding(findings, 'blocker', 'p1a_hash_lock_file_count_mismatch', 'P1A summary.lockedFiles must match lockedFiles.length.', auditPath);
    }
    for (const required of [
      'app/study_target.ts',
      'app/target_storage_keys.ts',
      'tests/gustav_surface_target_switch.test.ts',
      'tests/gustav_target_storage_keys.test.ts',
    ]) {
      if (!lockedFiles.some((file) => file.targetPath === required)) {
        pushFinding(findings, 'blocker', 'p1a_hash_lock_required_file_missing', `P1A hash lock missing required target ${required}.`, auditPath);
      }
    }
    const hashes = new Set<string>();
    for (const file of lockedFiles) {
      const targetPath = typeof file.targetPath === 'string' ? file.targetPath : '';
      const blueprintPath = typeof file.blueprintPath === 'string' ? file.blueprintPath : '';
      const hash = typeof file.sha256 === 'string' ? file.sha256 : '';
      if (!targetPath || !blueprintPath || file.hashAlgorithm !== 'sha256' || !/^[a-f0-9]{64}$/.test(hash) || typeof file.bytes !== 'number' || typeof file.lineCount !== 'number') {
        pushFinding(findings, 'blocker', 'p1a_hash_lock_file_shape_invalid', `P1A hash lock file entry is invalid for ${targetPath || '<unknown>'}.`, auditPath);
        continue;
      }
      hashes.add(hash);
      const absoluteBlueprint = path.resolve(repoRoot, blueprintPath);
      if (!fs.existsSync(absoluteBlueprint)) {
        pushFinding(findings, 'blocker', 'p1a_hash_lock_blueprint_missing', `P1A hash lock blueprint file missing on disk: ${blueprintPath}`, auditPath);
      } else {
        const actualHash = sha256File(absoluteBlueprint);
        const newlineStableHash = sha256TextFileWithNormalizedNewlines(absoluteBlueprint);
        if (actualHash !== hash && newlineStableHash !== hash) {
          pushFinding(findings, 'blocker', 'p1a_hash_lock_hash_mismatch', `P1A hash lock digest mismatch for ${blueprintPath}.`, auditPath);
        }
      }
      if (fs.existsSync(path.join(repoRoot, targetPath)) && shouldBlockP1APreApplyFilePresence(repoRoot, targetPath)) {
        pushFinding(findings, 'blocker', 'p1a_hash_lock_target_exists', `P1A target file exists before approval: ${targetPath}`, auditPath);
      }
      if (file.exactCopyRequired !== true || file.action !== 'add') {
        pushFinding(findings, 'blocker', 'p1a_hash_lock_exact_copy_missing', `P1A hash lock must require exact add-copy for ${targetPath}.`, auditPath);
      }
    }
    if (summary.uniqueHashes !== hashes.size) {
      pushFinding(findings, 'blocker', 'p1a_hash_lock_unique_hash_count_mismatch', 'P1A summary.uniqueHashes must match locked file hashes.', auditPath);
    }
  }

  if (!Array.isArray(audit.futureApplyRules) || (audit.futureApplyRules as unknown[]).length < 4) {
    pushFinding(findings, 'blocker', 'p1a_hash_lock_future_rules_missing', 'P1A blueprint hash lock must include future apply rules.', auditPath);
  }
  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'p1a_hash_lock_findings_missing', 'P1A blueprint hash lock findings must be an array.', auditPath);
  }
  if (!fs.existsSync(path.join(runDir, 'audits', 'p1a_blueprint_hash_lock_audit.md'))) {
    pushFinding(findings, 'blocker', 'p1a_hash_lock_markdown_missing', 'P1A blueprint hash lock markdown report is missing.', auditPath);
  }
  if (!fs.existsSync(path.join(runDir, 'apply_plan', 'P1A_BLUEPRINT_HASH_LOCK.md'))) {
    pushFinding(findings, 'blocker', 'p1a_hash_lock_apply_markdown_missing', 'P1A blueprint hash lock apply-plan markdown is missing.', auditPath);
  }
  if (audit.status === 'PASS' && (
    summary.blockers !== 0 ||
    summary.lockedFiles !== 4 ||
    summary.lockedProductionFiles !== 2 ||
    summary.lockedTestFiles !== 2 ||
    summary.targetFilesAbsent !== 4 ||
    summary.targetFilesPresent !== 0 ||
    summary.hashAlgorithmCount !== 1 ||
    summary.uniqueHashes !== 4 ||
    summary.exactCopyRules !== 4 ||
    summary.hashLockReadyAfterExactApproval !== true ||
    summary.driftDetected !== false ||
    summary.productionFilesStillAbsent !== true ||
    summary.productionTestsStillAbsent !== true ||
    summary.mayStartFrenchGeneration !== false ||
    summary.mayModifyProductionAppFiles !== false
  )) {
    pushFinding(findings, 'blocker', 'p1a_hash_lock_pass_with_gaps', 'P1A blueprint hash lock audit cannot be PASS while hash lock gaps remain or safety flags are open.', auditPath);
  }
}

function validateP1AApplyTransactionAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'p1a_apply_transaction_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const repoRoot = path.resolve(runDir, '..', '..', '..', '..');
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-p1a-apply-transaction-audit-v0') {
    pushFinding(findings, 'blocker', 'p1a_apply_transaction_schema_version', 'P1A apply transaction audit schemaVersion must be gustav-p1a-apply-transaction-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'p1a_apply_transaction_run_id_mismatch', `P1A apply transaction audit runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'p1a_apply_transaction_status_invalid', `P1A apply transaction audit status is invalid: ${status}`, auditPath);
  }
  if (audit.transactionMode !== 'dry_run_plan_only') {
    pushFinding(findings, 'blocker', 'p1a_apply_transaction_mode_invalid', 'P1A apply transaction audit transactionMode must be dry_run_plan_only.', auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'p1a_apply_transaction_summary_missing', 'P1A apply transaction audit summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'transactionSteps',
    'preconditionSteps',
    'copySteps',
    'hashVerifySteps',
    'testSteps',
    'postApplyGuardSteps',
    'rollbackSteps',
    'allowedWriteFiles',
    'futureProductionWriteSteps',
    'forbiddenWriteZones',
    'exactHashChecks',
    'targetFilesAbsent',
    'targetFilesPresent',
    'blockers',
    'warnings',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'p1a_apply_transaction_summary_number_missing', `P1A apply transaction audit summary.${key} must be a number.`, auditPath);
    }
  }
  for (const key of [
    'transactionReadyAfterExactApproval',
    'exactApprovalReceiptRequired',
    'approvalStillMissing',
    'dryRunOnly',
    'canApplyNow',
    'mayStartFrenchGeneration',
    'mayModifyProductionAppFiles',
  ]) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'p1a_apply_transaction_summary_boolean_missing', `P1A apply transaction audit summary.${key} must be boolean.`, auditPath);
    }
  }

  const allowedWriteFiles = Array.isArray(audit.allowedWriteFiles) ? audit.allowedWriteFiles as unknown[] : null;
  if (!allowedWriteFiles) {
    pushFinding(findings, 'blocker', 'p1a_apply_transaction_allowed_files_missing', 'P1A apply transaction allowedWriteFiles must be an array.', auditPath);
  } else {
    if (summary.allowedWriteFiles !== allowedWriteFiles.length) {
      pushFinding(findings, 'blocker', 'p1a_apply_transaction_allowed_count_mismatch', 'P1A summary.allowedWriteFiles must match allowedWriteFiles.length.', auditPath);
    }
    for (const required of [
      'app/study_target.ts',
      'app/target_storage_keys.ts',
      'tests/gustav_surface_target_switch.test.ts',
      'tests/gustav_target_storage_keys.test.ts',
    ]) {
      if (!allowedWriteFiles.includes(required)) {
        pushFinding(findings, 'blocker', 'p1a_apply_transaction_required_allowed_file_missing', `P1A apply transaction missing allowed file ${required}.`, auditPath);
      }
      if (fs.existsSync(path.join(repoRoot, required)) && shouldBlockP1APreApplyFilePresence(repoRoot, required)) {
        pushFinding(findings, 'blocker', 'p1a_apply_transaction_target_exists', `P1A target file exists before approval: ${required}`, auditPath);
      }
    }
  }

  const forbiddenWriteZones = Array.isArray(audit.forbiddenWriteZones) ? audit.forbiddenWriteZones as unknown[] : null;
  if (!forbiddenWriteZones || forbiddenWriteZones.length < 10) {
    pushFinding(findings, 'blocker', 'p1a_apply_transaction_forbidden_zones_missing', 'P1A apply transaction must include forbidden write zones.', auditPath);
  }

  const steps = Array.isArray(audit.transactionSteps) ? audit.transactionSteps as Array<Record<string, unknown>> : null;
  if (!steps) {
    pushFinding(findings, 'blocker', 'p1a_apply_transaction_steps_missing', 'P1A apply transaction steps must be an array.', auditPath);
  } else {
    if (summary.transactionSteps !== steps.length) {
      pushFinding(findings, 'blocker', 'p1a_apply_transaction_step_count_mismatch', 'P1A summary.transactionSteps must match transactionSteps.length.', auditPath);
    }
    const phases = ['precondition', 'copy', 'hash_verify', 'test', 'post_apply_guard', 'rollback'];
    for (const step of steps) {
      if (typeof step.id !== 'string' || !phases.includes(String(step.phase)) || typeof step.action !== 'string' || typeof step.writesProductionFile !== 'boolean' || typeof step.requiredBeforeNext !== 'boolean') {
        pushFinding(findings, 'blocker', 'p1a_apply_transaction_step_shape_invalid', 'P1A transaction steps must include id, phase, action, writesProductionFile and requiredBeforeNext.', auditPath);
      }
      if (step.phase === 'copy') {
        if (step.writesProductionFile !== true || typeof step.sourcePath !== 'string' || typeof step.targetPath !== 'string' || typeof step.expectedSha256 !== 'string') {
          pushFinding(findings, 'blocker', 'p1a_apply_transaction_copy_step_invalid', `P1A copy step is invalid: ${String(step.id)}`, auditPath);
        }
      }
      if (step.phase === 'hash_verify' && (step.writesProductionFile !== false || typeof step.expectedSha256 !== 'string')) {
        pushFinding(findings, 'blocker', 'p1a_apply_transaction_hash_step_invalid', `P1A hash verify step is invalid: ${String(step.id)}`, auditPath);
      }
      if (step.phase === 'rollback' && step.writesProductionFile !== false) {
        pushFinding(findings, 'blocker', 'p1a_apply_transaction_rollback_writes_invalid', `P1A rollback planning step must not write during audit: ${String(step.id)}`, auditPath);
      }
    }
    const byPhase = (phase: string) => steps.filter((step) => step.phase === phase).length;
    if (
      summary.preconditionSteps !== byPhase('precondition') ||
      summary.copySteps !== byPhase('copy') ||
      summary.hashVerifySteps !== byPhase('hash_verify') ||
      summary.testSteps !== byPhase('test') ||
      summary.postApplyGuardSteps !== byPhase('post_apply_guard') ||
      summary.rollbackSteps !== byPhase('rollback')
    ) {
      pushFinding(findings, 'blocker', 'p1a_apply_transaction_phase_count_mismatch', 'P1A transaction phase counts must match transactionSteps.', auditPath);
    }
  }

  if (!Array.isArray(audit.applyInvariants) || (audit.applyInvariants as unknown[]).length < 5) {
    pushFinding(findings, 'blocker', 'p1a_apply_transaction_invariants_missing', 'P1A apply transaction must include apply invariants.', auditPath);
  }
  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'p1a_apply_transaction_findings_missing', 'P1A apply transaction findings must be an array.', auditPath);
  }
  if (!fs.existsSync(path.join(runDir, 'audits', 'p1a_apply_transaction_audit.md'))) {
    pushFinding(findings, 'blocker', 'p1a_apply_transaction_markdown_missing', 'P1A apply transaction markdown report is missing.', auditPath);
  }
  if (!fs.existsSync(path.join(runDir, 'apply_plan', 'P1A_APPLY_TRANSACTION.md'))) {
    pushFinding(findings, 'blocker', 'p1a_apply_transaction_apply_markdown_missing', 'P1A apply transaction apply-plan markdown is missing.', auditPath);
  }
  if (audit.status === 'PASS' && (
    summary.blockers !== 0 ||
    Number(summary.transactionSteps) < 20 ||
    Number(summary.preconditionSteps) < 3 ||
    summary.copySteps !== 4 ||
    summary.hashVerifySteps !== 4 ||
    Number(summary.testSteps) < 3 ||
    Number(summary.postApplyGuardSteps) < 5 ||
    summary.rollbackSteps !== 4 ||
    summary.allowedWriteFiles !== 4 ||
    summary.futureProductionWriteSteps !== 4 ||
    Number(summary.forbiddenWriteZones) < 10 ||
    summary.exactHashChecks !== 4 ||
    summary.targetFilesAbsent !== 4 ||
    summary.targetFilesPresent !== 0 ||
    summary.transactionReadyAfterExactApproval !== true ||
    summary.exactApprovalReceiptRequired !== true ||
    summary.approvalStillMissing !== true ||
    summary.dryRunOnly !== true ||
    summary.canApplyNow !== false ||
    summary.mayStartFrenchGeneration !== false ||
    summary.mayModifyProductionAppFiles !== false
  )) {
    pushFinding(findings, 'blocker', 'p1a_apply_transaction_pass_with_gaps', 'P1A apply transaction audit cannot be PASS while transaction gaps remain or safety flags are open.', auditPath);
  }
}

function validateP1ATransactionSimulationAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'p1a_transaction_simulation_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const repoRoot = path.resolve(runDir, '..', '..', '..', '..');
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-p1a-transaction-simulation-audit-v0') {
    pushFinding(findings, 'blocker', 'p1a_transaction_simulation_schema_version', 'P1A transaction simulation audit schemaVersion must be gustav-p1a-transaction-simulation-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'p1a_transaction_simulation_run_id_mismatch', `P1A transaction simulation audit runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'p1a_transaction_simulation_status_invalid', `P1A transaction simulation audit status is invalid: ${status}`, auditPath);
  } else if (status !== 'PASS') {
    pushFinding(findings, 'blocker', 'p1a_transaction_simulation_status_not_pass', 'P1A transaction simulation audit must be PASS before it can be accepted.', auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'p1a_transaction_simulation_summary_missing', 'P1A transaction simulation audit summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'simulatedFiles',
    'copiedFiles',
    'hashVerifiedFiles',
    'compileCommands',
    'runtimeCommands',
    'rollbackActions',
    'rolledBackFiles',
    'remainingSimulatedTargetFiles',
    'blockers',
    'warnings',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'p1a_transaction_simulation_summary_number_missing', `P1A transaction simulation summary.${key} must be a number.`, auditPath);
    }
  }
  for (const key of [
    'copySimulationPassed',
    'hashSimulationPassed',
    'compilePassed',
    'runtimePassed',
    'rollbackSimulationPassed',
    'transactionSimulationPassed',
    'productionFilesStillAbsent',
    'productionTestsStillAbsent',
    'dryRunOnly',
    'canApplyNow',
    'mayStartFrenchGeneration',
    'mayModifyProductionAppFiles',
  ]) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'p1a_transaction_simulation_summary_boolean_missing', `P1A transaction simulation summary.${key} must be boolean.`, auditPath);
    }
  }

  const simulatedFiles = Array.isArray(audit.simulatedFiles)
    ? audit.simulatedFiles as Array<Record<string, unknown>>
    : null;
  if (!simulatedFiles) {
    pushFinding(findings, 'blocker', 'p1a_transaction_simulation_files_missing', 'P1A transaction simulation simulatedFiles must be an array.', auditPath);
  } else {
    if (summary.simulatedFiles !== simulatedFiles.length) {
      pushFinding(findings, 'blocker', 'p1a_transaction_simulation_file_count_mismatch', 'P1A summary.simulatedFiles must match simulatedFiles.length.', auditPath);
    }
    const requiredTargets = new Set([
      'app/study_target.ts',
      'app/target_storage_keys.ts',
      'tests/gustav_surface_target_switch.test.ts',
      'tests/gustav_target_storage_keys.test.ts',
    ]);
    let copiedCount = 0;
    let hashVerifiedCount = 0;
    let rolledBackCount = 0;
    for (const file of simulatedFiles) {
      const sourcePath = typeof file.sourcePath === 'string' ? file.sourcePath : '';
      const targetPath = typeof file.targetPath === 'string' ? file.targetPath : '';
      const simulatedPath = typeof file.simulatedPath === 'string' ? file.simulatedPath : '';
      const expectedHash = typeof file.expectedSha256 === 'string' ? file.expectedSha256 : '';
      const actualHash = typeof file.actualSha256 === 'string' ? file.actualSha256 : '';
      if (!sourcePath || !targetPath || !simulatedPath || !/^[a-f0-9]{64}$/.test(expectedHash) || !/^[a-f0-9]{64}$/.test(actualHash)) {
        pushFinding(findings, 'blocker', 'p1a_transaction_simulation_file_shape_invalid', `P1A simulated file entry is invalid for ${targetPath || '<unknown>'}.`, auditPath);
        continue;
      }
      if (!requiredTargets.has(targetPath)) {
        pushFinding(findings, 'blocker', 'p1a_transaction_simulation_unexpected_target', `Unexpected simulated P1A target: ${targetPath}`, auditPath);
      }
      if (!fs.existsSync(path.resolve(repoRoot, sourcePath))) {
        pushFinding(findings, 'blocker', 'p1a_transaction_simulation_source_missing', `P1A simulation source file is missing: ${sourcePath}`, auditPath);
      }
      if (file.copied !== true || file.hashVerified !== true || file.rolledBack !== true) {
        pushFinding(findings, 'blocker', 'p1a_transaction_simulation_file_flags_invalid', `P1A simulated file ${targetPath} must be copied, hashVerified and rolledBack.`, auditPath);
      }
      if (expectedHash !== actualHash) {
        pushFinding(findings, 'blocker', 'p1a_transaction_simulation_hash_mismatch', `P1A simulated file hash mismatch: ${targetPath}`, auditPath);
      }
      if (fs.existsSync(simulatedPath)) {
        pushFinding(findings, 'blocker', 'p1a_transaction_simulation_rollback_left_file', `Simulated target file still exists after rollback: ${simulatedPath}`, auditPath);
      }
      if (file.copied === true) copiedCount += 1;
      if (file.hashVerified === true) hashVerifiedCount += 1;
      if (file.rolledBack === true) rolledBackCount += 1;
    }
    if (summary.copiedFiles !== copiedCount || summary.hashVerifiedFiles !== hashVerifiedCount || summary.rolledBackFiles !== rolledBackCount) {
      pushFinding(findings, 'blocker', 'p1a_transaction_simulation_summary_file_flags_mismatch', 'P1A transaction simulation summary file counts must match simulatedFiles flags.', auditPath);
    }
  }

  for (const [label, execution] of [
    ['compile', audit.compile],
    ['runtime', audit.runtime],
  ] as const) {
    const exec = execution && typeof execution === 'object' ? execution as Record<string, unknown> : null;
    if (!exec) {
      pushFinding(findings, 'blocker', `p1a_transaction_simulation_${label}_missing`, `P1A transaction simulation ${label} execution must be an object.`, auditPath);
      continue;
    }
    if (!Array.isArray(exec.command) || (exec.command as unknown[]).length === 0 || typeof exec.logPath !== 'string') {
      pushFinding(findings, 'blocker', `p1a_transaction_simulation_${label}_shape_invalid`, `P1A transaction simulation ${label} execution must include command and logPath.`, auditPath);
    }
    if (exec.exitCode !== 0) {
      pushFinding(findings, 'blocker', `p1a_transaction_simulation_${label}_exit_nonzero`, `P1A transaction simulation ${label} exitCode must be 0.`, auditPath);
    }
    if (typeof exec.logPath === 'string' && !fs.existsSync(path.resolve(repoRoot, exec.logPath))) {
      pushFinding(findings, 'blocker', `p1a_transaction_simulation_${label}_log_missing`, `P1A transaction simulation ${label} log is missing.`, auditPath);
    }
  }

  for (const required of [
    path.join(runDir, 'audits', 'p1a_transaction_simulation_audit.md'),
    path.join(runDir, 'audits', 'p1a_transaction_simulation', 'README.md'),
  ]) {
    if (!fs.existsSync(required)) {
      pushFinding(findings, 'blocker', 'p1a_transaction_simulation_markdown_missing', `P1A transaction simulation markdown report is missing: ${path.relative(runDir, required)}`, auditPath);
    }
  }

  for (const forbidden of [
    'app/study_target.ts',
    'app/target_storage_keys.ts',
    'tests/gustav_surface_target_switch.test.ts',
    'tests/gustav_target_storage_keys.test.ts',
  ]) {
    if (fs.existsSync(path.join(repoRoot, forbidden)) && shouldBlockP1APreApplyFilePresence(repoRoot, forbidden)) {
      pushFinding(findings, 'blocker', 'p1a_transaction_simulation_production_file_exists', `P1A planned production file exists before approval: ${forbidden}`, auditPath);
    }
  }

  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'p1a_transaction_simulation_findings_missing', 'P1A transaction simulation findings must be an array.', auditPath);
  }
  if (audit.status === 'PASS' && (
    summary.blockers !== 0 ||
    summary.simulatedFiles !== 4 ||
    summary.copiedFiles !== 4 ||
    summary.hashVerifiedFiles !== 4 ||
    summary.compileCommands !== 1 ||
    summary.runtimeCommands !== 1 ||
    summary.rollbackActions !== 4 ||
    summary.rolledBackFiles !== 4 ||
    summary.remainingSimulatedTargetFiles !== 0 ||
    summary.copySimulationPassed !== true ||
    summary.hashSimulationPassed !== true ||
    summary.compilePassed !== true ||
    summary.runtimePassed !== true ||
    summary.rollbackSimulationPassed !== true ||
    summary.transactionSimulationPassed !== true ||
    summary.productionFilesStillAbsent !== true ||
    summary.productionTestsStillAbsent !== true ||
    summary.dryRunOnly !== true ||
    summary.canApplyNow !== false ||
    summary.mayStartFrenchGeneration !== false ||
    summary.mayModifyProductionAppFiles !== false
  )) {
    pushFinding(findings, 'blocker', 'p1a_transaction_simulation_pass_with_gaps', 'P1A transaction simulation audit cannot be PASS while simulation gaps remain or safety flags are open.', auditPath);
  }
}

function validateP1AApprovalReceiptFirewallAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'p1a_approval_receipt_firewall_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const repoRoot = path.resolve(runDir, '..', '..', '..', '..');
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-p1a-approval-receipt-firewall-audit-v0') {
    pushFinding(findings, 'blocker', 'p1a_receipt_firewall_schema_version', 'P1A approval receipt firewall audit schemaVersion must be gustav-p1a-approval-receipt-firewall-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'p1a_receipt_firewall_run_id_mismatch', `P1A approval receipt firewall audit runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'p1a_receipt_firewall_status_invalid', `P1A approval receipt firewall audit status is invalid: ${status}`, auditPath);
  } else if (status !== 'PASS') {
    pushFinding(findings, 'blocker', 'p1a_receipt_firewall_status_not_pass', 'P1A approval receipt firewall audit must be PASS before it can be accepted.', auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'p1a_receipt_firewall_summary_missing', 'P1A approval receipt firewall summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'realReceiptCandidates',
    'realReceiptsPresent',
    'exactApprovalMatches',
    'tempFixtures',
    'rejectedTempFixtures',
    'acceptedShapeFixtures',
    'tempExactShapeBlockedByPath',
    'implicitCommandFixtures',
    'implicitCommandsRejected',
    'blockers',
    'warnings',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'p1a_receipt_firewall_summary_number_missing', `P1A approval receipt firewall summary.${key} must be a number.`, auditPath);
    }
  }
  for (const key of [
    'firewallPassed',
    'exactApprovalRequired',
    'approvalStillMissing',
    'canApplyNow',
    'dryRunOnly',
    'mayStartFrenchGeneration',
    'mayModifyProductionAppFiles',
  ]) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'p1a_receipt_firewall_summary_boolean_missing', `P1A approval receipt firewall summary.${key} must be boolean.`, auditPath);
    }
  }

  const contract = audit.approvalContract && typeof audit.approvalContract === 'object'
    ? audit.approvalContract as Record<string, unknown>
    : null;
  if (!contract) {
    pushFinding(findings, 'blocker', 'p1a_receipt_firewall_contract_missing', 'P1A approval receipt firewall approvalContract must be an object.', auditPath);
  } else {
    if (typeof contract.requiredApprovalText !== 'string' || contract.requiredApprovalText.length < 80) {
      pushFinding(findings, 'blocker', 'p1a_receipt_firewall_required_text_missing', 'P1A approval receipt firewall must record the exact required approval text.', auditPath);
    }
    if (contract.approvedPacket !== relativeArtifactPath(repoRoot, path.join(runDir, 'apply_plan', 'p1a_minimal_apply_packet.json'))) {
      pushFinding(findings, 'blocker', 'p1a_receipt_firewall_packet_mismatch', 'P1A approval receipt firewall approvedPacket must point to p1a_minimal_apply_packet.json.', auditPath);
    }
    const acceptedReceiptPaths = Array.isArray(contract.acceptedReceiptPaths) ? contract.acceptedReceiptPaths as unknown[] : null;
    const rejectedImplicitCommands = Array.isArray(contract.rejectedImplicitCommands) ? contract.rejectedImplicitCommands as unknown[] : null;
    if (!acceptedReceiptPaths || acceptedReceiptPaths.length !== 3) {
      pushFinding(findings, 'blocker', 'p1a_receipt_firewall_paths_missing', 'P1A approval receipt firewall must record exactly 3 accepted receipt paths.', auditPath);
    } else if (!acceptedReceiptPaths.includes(relativeArtifactPath(repoRoot, path.join(runDir, 'apply_plan', 'p1a_approval_receipt.json')))) {
      pushFinding(findings, 'blocker', 'p1a_receipt_firewall_canonical_json_path_missing', 'P1A approval receipt firewall must include canonical JSON receipt path.', auditPath);
    }
    if (!rejectedImplicitCommands || !rejectedImplicitCommands.includes('дальше') || !rejectedImplicitCommands.includes('approve')) {
      pushFinding(findings, 'blocker', 'p1a_receipt_firewall_implicit_commands_missing', 'P1A approval receipt firewall must record rejected implicit commands including дальше and approve.', auditPath);
    }
  }

  if (typeof audit.tempFixtureRoot !== 'string' || !audit.tempFixtureRoot.startsWith('/private/tmp/gustav-p1a-approval-firewall-')) {
    pushFinding(findings, 'blocker', 'p1a_receipt_firewall_temp_root_invalid', 'P1A approval receipt firewall tempFixtureRoot must be under /private/tmp.', auditPath);
  }

  const receiptProbes = Array.isArray(audit.receiptProbes) ? audit.receiptProbes as Array<Record<string, unknown>> : null;
  if (!receiptProbes) {
    pushFinding(findings, 'blocker', 'p1a_receipt_firewall_probes_missing', 'P1A approval receipt firewall receiptProbes must be an array.', auditPath);
  } else {
    if (summary.realReceiptCandidates !== receiptProbes.filter((probe) => probe.source === 'real_candidate').length) {
      pushFinding(findings, 'blocker', 'p1a_receipt_firewall_real_probe_count_mismatch', 'P1A summary.realReceiptCandidates must match real_candidate probes.', auditPath);
    }
    if (summary.tempFixtures !== receiptProbes.filter((probe) => probe.source === 'temp_fixture').length) {
      pushFinding(findings, 'blocker', 'p1a_receipt_firewall_temp_probe_count_mismatch', 'P1A summary.tempFixtures must match temp_fixture probes.', auditPath);
    }
    const realPresent = receiptProbes.filter((probe) => probe.source === 'real_candidate' && probe.exists === true).length;
    const exactMatches = receiptProbes.filter((probe) => probe.source === 'real_candidate' && probe.wouldUnlockApply === true).length;
    const rejectedTemp = receiptProbes.filter((probe) => probe.source === 'temp_fixture' && probe.wouldUnlockApply === false).length;
    if (summary.realReceiptsPresent !== realPresent || summary.exactApprovalMatches !== exactMatches || summary.rejectedTempFixtures !== rejectedTemp) {
      pushFinding(findings, 'blocker', 'p1a_receipt_firewall_summary_probe_mismatch', 'P1A approval receipt firewall summary counts must match receiptProbes.', auditPath);
    }
    for (const probe of receiptProbes) {
      const id = typeof probe.id === 'string' ? probe.id : '';
      const filePath = typeof probe.filePath === 'string' ? probe.filePath : '';
      if (!id || !filePath || (probe.source !== 'real_candidate' && probe.source !== 'temp_fixture')) {
        pushFinding(findings, 'blocker', 'p1a_receipt_firewall_probe_shape_invalid', 'P1A receipt probes must include id, filePath and valid source.', auditPath);
      }
      for (const key of [
        'exists',
        'parseableJson',
        'schemaValid',
        'runIdMatches',
        'approvedPacketMatches',
        'approvalTextMatches',
        'approvedAtIso',
        'acceptedReceiptPath',
        'wouldUnlockApply',
        'expectedUnlock',
      ]) {
        if (typeof probe[key] !== 'boolean') {
          pushFinding(findings, 'blocker', 'p1a_receipt_firewall_probe_boolean_missing', `P1A receipt probe ${id || '<unknown>'}.${key} must be boolean.`, auditPath);
        }
      }
      if (typeof probe.rejectionReason !== 'string') {
        pushFinding(findings, 'blocker', 'p1a_receipt_firewall_probe_reason_missing', `P1A receipt probe ${id || '<unknown>'} must include rejectionReason.`, auditPath);
      }
      if (probe.wouldUnlockApply !== probe.expectedUnlock) {
        pushFinding(findings, 'blocker', 'p1a_receipt_firewall_probe_expectation_mismatch', `P1A receipt probe ${id || '<unknown>'} unlock result must match expectedUnlock.`, auditPath);
      }
    }
    if (!receiptProbes.some((probe) => probe.id === 'TMP-EXACT-SHAPE-WRONG-PATH' && probe.rejectionReason === 'receipt_path_not_accepted')) {
      pushFinding(findings, 'blocker', 'p1a_receipt_firewall_exact_temp_path_guard_missing', 'P1A approval receipt firewall must prove exact temp receipt shape is blocked by path.', auditPath);
    }
    if (!receiptProbes.some((probe) => probe.id === 'TMP-IMPLICIT-DALSHE' && probe.wouldUnlockApply === false) ||
        !receiptProbes.some((probe) => probe.id === 'TMP-PLAIN-APPROVE' && probe.wouldUnlockApply === false)) {
      pushFinding(findings, 'blocker', 'p1a_receipt_firewall_implicit_probe_missing', 'P1A approval receipt firewall must reject дальше and plain approve fixtures.', auditPath);
    }
  }

  for (const forbidden of [
    'app/study_target.ts',
    'app/target_storage_keys.ts',
    'tests/gustav_surface_target_switch.test.ts',
    'tests/gustav_target_storage_keys.test.ts',
  ]) {
    if (fs.existsSync(path.join(repoRoot, forbidden)) && shouldBlockP1APreApplyFilePresence(repoRoot, forbidden)) {
      pushFinding(findings, 'blocker', 'p1a_receipt_firewall_production_file_exists', `P1A planned production/test file exists before approval: ${forbidden}`, auditPath);
    }
  }

  for (const required of [
    path.join(runDir, 'audits', 'p1a_approval_receipt_firewall_audit.md'),
    path.join(runDir, 'audits', 'p1a_approval_receipt_firewall', 'README.md'),
  ]) {
    if (!fs.existsSync(required)) {
      pushFinding(findings, 'blocker', 'p1a_receipt_firewall_markdown_missing', `P1A approval receipt firewall markdown report is missing: ${path.relative(runDir, required)}`, auditPath);
    }
  }
  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'p1a_receipt_firewall_findings_missing', 'P1A approval receipt firewall findings must be an array.', auditPath);
  }
  if (audit.status === 'PASS' && (
    summary.blockers !== 0 ||
    summary.realReceiptCandidates !== 3 ||
    summary.realReceiptsPresent !== 0 ||
    summary.exactApprovalMatches !== 0 ||
    summary.tempFixtures !== 6 ||
    summary.rejectedTempFixtures !== 6 ||
    summary.acceptedShapeFixtures !== 1 ||
    summary.tempExactShapeBlockedByPath !== 1 ||
    summary.implicitCommandFixtures !== 2 ||
    summary.implicitCommandsRejected !== 2 ||
    summary.firewallPassed !== true ||
    summary.exactApprovalRequired !== true ||
    summary.approvalStillMissing !== true ||
    summary.canApplyNow !== false ||
    summary.dryRunOnly !== true ||
    summary.mayStartFrenchGeneration !== false ||
    summary.mayModifyProductionAppFiles !== false
  )) {
    pushFinding(findings, 'blocker', 'p1a_receipt_firewall_pass_with_gaps', 'P1A approval receipt firewall cannot be PASS while approval gaps remain or safety flags are open.', auditPath);
  }
}

function validatePostP1AReadinessProjectionAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'post_p1a_readiness_projection_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const repoRoot = path.resolve(runDir, '..', '..', '..', '..');
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-post-p1a-readiness-projection-audit-v0') {
    pushFinding(findings, 'blocker', 'post_p1a_projection_schema_version', 'Post-P1A readiness projection schemaVersion must be gustav-post-p1a-readiness-projection-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'post_p1a_projection_run_id_mismatch', `Post-P1A readiness projection runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'post_p1a_projection_status_invalid', `Post-P1A readiness projection status is invalid: ${status}`, auditPath);
  } else if (status !== 'PASS') {
    pushFinding(findings, 'blocker', 'post_p1a_projection_status_not_pass', 'Post-P1A readiness projection must be PASS before it can be accepted.', auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'post_p1a_projection_summary_missing', 'Post-P1A readiness projection summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'currentReadinessChecks',
    'currentFailedChecks',
    'currentGenerationBlockers',
    'currentApplyBlockers',
    'projectedFailedChecksAfterP1A',
    'projectedGenerationBlockersAfterP1A',
    'projectedApplyBlockersAfterP1A',
    'checksResolvedByP1A',
    'outOfScopeFailedChecks',
    'p1aScopeFiles',
    'blockers',
    'warnings',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'post_p1a_projection_summary_number_missing', `Post-P1A projection summary.${key} must be a number.`, auditPath);
    }
  }
  for (const key of [
    'projectionPassed',
    'p1aDoesNotUnlockFrenchGeneration',
    'p1aDoesNotUnlockBroadApply',
    'canApplyNow',
    'mayStartFrenchGenerationAfterP1A',
    'mayModifyProductionAppFiles',
    'productionFilesStillAbsent',
  ]) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'post_p1a_projection_summary_boolean_missing', `Post-P1A projection summary.${key} must be boolean.`, auditPath);
    }
  }

  const p1aScope = audit.p1aScope && typeof audit.p1aScope === 'object'
    ? audit.p1aScope as Record<string, unknown>
    : null;
  if (!p1aScope) {
    pushFinding(findings, 'blocker', 'post_p1a_projection_scope_missing', 'Post-P1A projection p1aScope must be an object.', auditPath);
  } else {
    const files = Array.isArray(p1aScope.files) ? p1aScope.files as unknown[] : null;
    const explicitlyNotCovered = Array.isArray(p1aScope.explicitlyNotCovered) ? p1aScope.explicitlyNotCovered as unknown[] : null;
    if (!files || files.length !== 4) {
      pushFinding(findings, 'blocker', 'post_p1a_projection_scope_files_invalid', 'Post-P1A projection p1aScope.files must list exactly 4 P1A files.', auditPath);
    }
    if (!explicitlyNotCovered || explicitlyNotCovered.length < 8) {
      pushFinding(findings, 'blocker', 'post_p1a_projection_not_covered_missing', 'Post-P1A projection must list out-of-scope systems not covered by P1A.', auditPath);
    }
  }

  const projections = Array.isArray(audit.projections) ? audit.projections as Array<Record<string, unknown>> : null;
  if (!projections) {
    pushFinding(findings, 'blocker', 'post_p1a_projection_entries_missing', 'Post-P1A projection projections must be an array.', auditPath);
  } else {
    if (summary.projectedFailedChecksAfterP1A !== projections.filter((projection) => projection.projectedAfterP1A === 'FAIL').length) {
      pushFinding(findings, 'blocker', 'post_p1a_projection_failed_count_mismatch', 'Post-P1A projection summary.projectedFailedChecksAfterP1A must match projection entries.', auditPath);
    }
    if (summary.checksResolvedByP1A !== projections.filter((projection) => projection.projectedAfterP1A === 'PASS').length) {
      pushFinding(findings, 'blocker', 'post_p1a_projection_resolved_count_mismatch', 'Post-P1A projection summary.checksResolvedByP1A must match projection entries.', auditPath);
    }
    const ids = new Set<string>();
    for (const projection of projections) {
      const checkId = typeof projection.checkId === 'string' ? projection.checkId : '';
      if (!checkId || typeof projection.title !== 'string' || projection.currentStatus !== 'FAIL' || projection.projectedAfterP1A !== 'FAIL') {
        pushFinding(findings, 'blocker', 'post_p1a_projection_entry_shape_invalid', `Invalid Post-P1A projection entry: ${checkId || '<missing>'}`, auditPath);
      }
      if (ids.has(checkId)) {
        pushFinding(findings, 'blocker', 'post_p1a_projection_duplicate_check', `Duplicate projected readiness check: ${checkId}`, auditPath);
      }
      ids.add(checkId);
      if (!Array.isArray(projection.blocks) || !Array.isArray(projection.requiredAfterP1A) || typeof projection.reason !== 'string') {
        pushFinding(findings, 'blocker', 'post_p1a_projection_entry_details_missing', `Post-P1A projection ${checkId || '<unknown>'} must include blocks, reason and requiredAfterP1A.`, auditPath);
      }
      if (projection.p1aCoverage !== 'none' && projection.p1aCoverage !== 'primitive_only' && projection.p1aCoverage !== 'not_applicable') {
        pushFinding(findings, 'blocker', 'post_p1a_projection_coverage_invalid', `Post-P1A projection ${checkId || '<unknown>'} has invalid p1aCoverage.`, auditPath);
      }
    }
    for (const required of ['RDY-002', 'RDY-010', 'RDY-020', 'RDY-021', 'RDY-030', 'RDY-040', 'RDY-050', 'RDY-060', 'RDY-080', 'RDY-090']) {
      if (!ids.has(required)) {
        pushFinding(findings, 'blocker', 'post_p1a_projection_required_check_missing', `Post-P1A projection missing required failed check ${required}.`, auditPath);
      }
    }
    if (!projections.some((projection) => projection.checkId === 'RDY-050' && projection.p1aCoverage === 'primitive_only')) {
      pushFinding(findings, 'blocker', 'post_p1a_projection_rdy050_not_primitive', 'RDY-050 must be recorded as primitive_only after P1A.', auditPath);
    }
  }

  for (const forbidden of [
    'app/study_target.ts',
    'app/target_storage_keys.ts',
    'tests/gustav_surface_target_switch.test.ts',
    'tests/gustav_target_storage_keys.test.ts',
  ]) {
    if (fs.existsSync(path.join(repoRoot, forbidden)) && shouldBlockP1APreApplyFilePresence(repoRoot, forbidden)) {
      pushFinding(findings, 'blocker', 'post_p1a_projection_production_file_exists', `P1A planned production/test file exists before approval: ${forbidden}`, auditPath);
    }
  }

  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'post_p1a_projection_findings_missing', 'Post-P1A projection findings must be an array.', auditPath);
  }
  if (!fs.existsSync(path.join(runDir, 'audits', 'post_p1a_readiness_projection_audit.md'))) {
    pushFinding(findings, 'blocker', 'post_p1a_projection_markdown_missing', 'Post-P1A projection markdown report is missing.', auditPath);
  }
  if (audit.status === 'PASS' && (
    summary.blockers !== 0 ||
    Number(summary.currentReadinessChecks) < 39 ||
    summary.currentFailedChecks !== 10 ||
    summary.currentGenerationBlockers !== 8 ||
    summary.currentApplyBlockers !== 10 ||
    summary.projectedFailedChecksAfterP1A !== 10 ||
    summary.projectedGenerationBlockersAfterP1A !== 8 ||
    summary.projectedApplyBlockersAfterP1A !== 10 ||
    summary.checksResolvedByP1A !== 0 ||
    summary.outOfScopeFailedChecks !== 9 ||
    summary.p1aScopeFiles !== 4 ||
    summary.projectionPassed !== true ||
    summary.p1aDoesNotUnlockFrenchGeneration !== true ||
    summary.p1aDoesNotUnlockBroadApply !== true ||
    summary.canApplyNow !== false ||
    summary.mayStartFrenchGenerationAfterP1A !== false ||
    summary.mayModifyProductionAppFiles !== false ||
    summary.productionFilesStillAbsent !== true
  )) {
    pushFinding(findings, 'blocker', 'post_p1a_projection_pass_with_gaps', 'Post-P1A readiness projection cannot be PASS while projection gaps remain or safety flags are open.', auditPath);
  }
}

function validatePostP1ANextSliceAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'post_p1a_next_slice_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const repoRoot = path.resolve(runDir, '..', '..', '..', '..');
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-post-p1a-next-slice-audit-v0') {
    pushFinding(findings, 'blocker', 'post_p1a_next_slice_schema_version', 'Post-P1A next slice schemaVersion must be gustav-post-p1a-next-slice-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'post_p1a_next_slice_run_id_mismatch', `Post-P1A next slice runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'post_p1a_next_slice_status_invalid', `Post-P1A next slice status is invalid: ${status}`, auditPath);
  } else if (status !== 'PASS') {
    pushFinding(findings, 'blocker', 'post_p1a_next_slice_status_not_pass', 'Post-P1A next slice audit must be PASS before it can be accepted.', auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'post_p1a_next_slice_summary_missing', 'Post-P1A next slice summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'nextSliceFiles',
    'dirtyOverlaps',
    'deferredLaterPhaseAdapters',
    'entryCriteria',
    'exitCriteria',
    'blockers',
    'warnings',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'post_p1a_next_slice_summary_number_missing', `Post-P1A next slice summary.${key} must be a number.`, auditPath);
    }
  }
  if (summary.nextSliceId !== 'P1B_DEV_TARGET_ISOLATION') {
    pushFinding(findings, 'blocker', 'post_p1a_next_slice_id_invalid', 'Post-P1A next slice must be P1B_DEV_TARGET_ISOLATION.', auditPath);
  }
  for (const key of [
    'nextSliceDeclared',
    'nextSliceConstrained',
    'requiresP1ACompletion',
    'requiresExactNextSliceApproval',
    'requiresFreshReadForDirtyOverlaps',
    'canStartNextSliceNow',
    'broadApplyStillBlocked',
    'mayStartFrenchGeneration',
    'mayModifyProductionAppFiles',
    'productionFilesStillAbsent',
  ]) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'post_p1a_next_slice_summary_boolean_missing', `Post-P1A next slice summary.${key} must be boolean.`, auditPath);
    }
  }

  const nextSlice = audit.nextSlice && typeof audit.nextSlice === 'object'
    ? audit.nextSlice as Record<string, unknown>
    : null;
  if (!nextSlice) {
    pushFinding(findings, 'blocker', 'post_p1a_next_slice_missing', 'Post-P1A nextSlice must be an object.', auditPath);
  } else {
    if (nextSlice.id !== 'P1B_DEV_TARGET_ISOLATION' || typeof nextSlice.title !== 'string' || typeof nextSlice.mode !== 'string') {
      pushFinding(findings, 'blocker', 'post_p1a_next_slice_shape_invalid', 'Post-P1A nextSlice must include expected id, title and mode.', auditPath);
    }
    const files = Array.isArray(nextSlice.files) ? nextSlice.files as Array<Record<string, unknown>> : null;
    const requiredFiles = new Set([
      'app/(tabs)/settings.tsx',
      'app/spanish_content_gate.ts',
      'app/study_target_lang_dev.ts',
      'components/StudyTargetContext.tsx',
    ]);
    if (!files || files.length !== 4) {
      pushFinding(findings, 'blocker', 'post_p1a_next_slice_files_invalid', 'Post-P1A nextSlice.files must include exactly 4 files.', auditPath);
    } else {
      if (summary.nextSliceFiles !== files.length) {
        pushFinding(findings, 'blocker', 'post_p1a_next_slice_file_count_mismatch', 'Post-P1A summary.nextSliceFiles must match nextSlice.files.', auditPath);
      }
      let dirtyCount = 0;
      for (const file of files) {
        const filePath = typeof file.path === 'string' ? file.path : '';
        if (!requiredFiles.has(filePath)) {
          pushFinding(findings, 'blocker', 'post_p1a_next_slice_unexpected_file', `Unexpected Post-P1A next slice file: ${filePath || '<missing>'}`, auditPath);
        }
        if (file.allowedAction !== 'review_only_until_exact_approval') {
          pushFinding(findings, 'blocker', 'post_p1a_next_slice_action_invalid', `Post-P1A file ${filePath || '<unknown>'} must remain review_only_until_exact_approval.`, auditPath);
        }
        if (typeof file.dirtyWorktreeOverlap !== 'boolean' || typeof file.requiredFreshReadBeforeEdit !== 'boolean') {
          pushFinding(findings, 'blocker', 'post_p1a_next_slice_file_boolean_missing', `Post-P1A file ${filePath || '<unknown>'} must include dirty/fresh-read booleans.`, auditPath);
        }
        if (file.dirtyWorktreeOverlap === true) dirtyCount += 1;
        if (filePath === 'app/(tabs)/settings.tsx' && (file.dirtyWorktreeOverlap !== true || file.requiredFreshReadBeforeEdit !== true)) {
          pushFinding(findings, 'blocker', 'post_p1a_next_slice_settings_dirty_guard_missing', 'settings.tsx dirty overlap must require fresh read before edit.', auditPath);
        }
      }
      if (summary.dirtyOverlaps !== dirtyCount || dirtyCount !== 1) {
        pushFinding(findings, 'blocker', 'post_p1a_next_slice_dirty_count_mismatch', 'Post-P1A dirty overlap count must be exactly 1 and match files.', auditPath);
      }
    }
    const adapters = Array.isArray(nextSlice.adapters) ? nextSlice.adapters as unknown[] : null;
    const deferred = Array.isArray(nextSlice.deferredLaterPhaseAdapters) ? nextSlice.deferredLaterPhaseAdapters as unknown[] : null;
    const entryCriteria = Array.isArray(nextSlice.entryCriteria) ? nextSlice.entryCriteria as unknown[] : null;
    const exitCriteria = Array.isArray(nextSlice.exitCriteria) ? nextSlice.exitCriteria as unknown[] : null;
    if (!adapters || !adapters.includes('production_study_target')) {
      pushFinding(findings, 'blocker', 'post_p1a_next_slice_adapter_missing', 'Post-P1A next slice must include production_study_target adapter.', auditPath);
    }
    if (!deferred || !deferred.includes('route_surface_integration')) {
      pushFinding(findings, 'blocker', 'post_p1a_next_slice_deferred_route_missing', 'Post-P1A next slice must defer route_surface_integration.', auditPath);
    }
    if (!entryCriteria || entryCriteria.length < 2 || !exitCriteria || exitCriteria.length < 2) {
      pushFinding(findings, 'blocker', 'post_p1a_next_slice_criteria_missing', 'Post-P1A next slice must include entry and exit criteria.', auditPath);
    }
    const approvalPolicy = nextSlice.approvalPolicy && typeof nextSlice.approvalPolicy === 'object'
      ? nextSlice.approvalPolicy as Record<string, unknown>
      : null;
    if (!approvalPolicy || typeof approvalPolicy.requiredApprovalText !== 'string' || typeof approvalPolicy.acceptedReceiptPath !== 'string') {
      pushFinding(findings, 'blocker', 'post_p1a_next_slice_approval_policy_missing', 'Post-P1A next slice must include exact approval policy.', auditPath);
    } else {
      const rejected = Array.isArray(approvalPolicy.rejectedImplicitCommands) ? approvalPolicy.rejectedImplicitCommands as unknown[] : [];
      if (!approvalPolicy.requiredApprovalText.includes('P1B dev target isolation packet') || !rejected.includes('дальше')) {
        pushFinding(findings, 'blocker', 'post_p1a_next_slice_approval_policy_invalid', 'Post-P1A next slice approval policy must require exact P1B text and reject implicit commands.', auditPath);
      }
    }
  }

  for (const forbidden of [
    'app/study_target.ts',
    'app/target_storage_keys.ts',
    'tests/gustav_surface_target_switch.test.ts',
    'tests/gustav_target_storage_keys.test.ts',
  ]) {
    if (fs.existsSync(path.join(repoRoot, forbidden)) && shouldBlockP1APreApplyFilePresence(repoRoot, forbidden)) {
      pushFinding(findings, 'blocker', 'post_p1a_next_slice_production_file_exists', `P1A planned production/test file exists before approval: ${forbidden}`, auditPath);
    }
  }

  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'post_p1a_next_slice_findings_missing', 'Post-P1A next slice findings must be an array.', auditPath);
  }
  if (!fs.existsSync(path.join(runDir, 'audits', 'post_p1a_next_slice_audit.md'))) {
    pushFinding(findings, 'blocker', 'post_p1a_next_slice_markdown_missing', 'Post-P1A next slice markdown report is missing.', auditPath);
  }
  if (audit.status === 'PASS' && (
    summary.blockers !== 0 ||
    summary.nextSliceDeclared !== true ||
    summary.nextSliceId !== 'P1B_DEV_TARGET_ISOLATION' ||
    summary.nextSliceFiles !== 4 ||
    summary.dirtyOverlaps !== 1 ||
    Number(summary.deferredLaterPhaseAdapters) < 1 ||
    Number(summary.entryCriteria) < 2 ||
    Number(summary.exitCriteria) < 2 ||
    summary.nextSliceConstrained !== true ||
    summary.requiresP1ACompletion !== true ||
    summary.requiresExactNextSliceApproval !== true ||
    summary.requiresFreshReadForDirtyOverlaps !== true ||
    summary.canStartNextSliceNow !== false ||
    summary.broadApplyStillBlocked !== true ||
    summary.mayStartFrenchGeneration !== false ||
    summary.mayModifyProductionAppFiles !== false ||
    summary.productionFilesStillAbsent !== true
  )) {
    pushFinding(findings, 'blocker', 'post_p1a_next_slice_pass_with_gaps', 'Post-P1A next slice audit cannot be PASS while slice constraints or safety flags are open.', auditPath);
  }
}

function validateP1BPreflightAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'p1b_preflight_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const repoRoot = path.resolve(runDir, '..', '..', '..', '..');
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-p1b-preflight-audit-v0') {
    pushFinding(findings, 'blocker', 'p1b_preflight_schema_version', 'P1B preflight audit schemaVersion must be gustav-p1b-preflight-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'p1b_preflight_run_id_mismatch', `P1B preflight audit runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'p1b_preflight_status_invalid', `P1B preflight audit status is invalid: ${status}`, auditPath);
  } else if (status !== 'PASS') {
    pushFinding(findings, 'blocker', 'p1b_preflight_status_not_pass', 'P1B preflight audit must be PASS before it can be accepted.', auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'p1b_preflight_summary_missing', 'P1B preflight summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'p1bFiles',
    'existingFiles',
    'missingFiles',
    'dirtyOverlapsPlanned',
    'dirtyOverlapsObserved',
    'freshReadRequiredFiles',
    'exactApprovalReceiptCandidates',
    'exactApprovalReceiptsPresent',
    'blockers',
    'warnings',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'p1b_preflight_summary_number_missing', `P1B preflight summary.${key} must be a number.`, auditPath);
    }
  }
  for (const key of [
    'preflightPassed',
    'p1bPreflightReadyAfterP1AAndExactApproval',
    'requiresP1ACompletion',
    'requiresExactP1BApproval',
    'canStartP1BNow',
    'canApplyNow',
    'mayStartFrenchGeneration',
    'mayModifyProductionAppFiles',
    'productionFilesStillAbsent',
  ]) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'p1b_preflight_summary_boolean_missing', `P1B preflight summary.${key} must be boolean.`, auditPath);
    }
  }

  const files = Array.isArray(audit.files) ? audit.files as Array<Record<string, unknown>> : null;
  const requiredFiles = new Set([
    'app/(tabs)/settings.tsx',
    'app/spanish_content_gate.ts',
    'app/study_target_lang_dev.ts',
    'components/StudyTargetContext.tsx',
  ]);
  if (!files) {
    pushFinding(findings, 'blocker', 'p1b_preflight_files_missing', 'P1B preflight files must be an array.', auditPath);
  } else {
    if (summary.p1bFiles !== files.length || files.length !== 4) {
      pushFinding(findings, 'blocker', 'p1b_preflight_file_count_mismatch', 'P1B preflight must include exactly 4 files.', auditPath);
    }
    let existing = 0;
    let plannedDirty = 0;
    let observedDirty = 0;
    let freshRead = 0;
    for (const file of files) {
      const filePath = typeof file.filePath === 'string' ? file.filePath : '';
      if (!requiredFiles.has(filePath)) {
        pushFinding(findings, 'blocker', 'p1b_preflight_unexpected_file', `Unexpected P1B preflight file: ${filePath || '<missing>'}`, auditPath);
      }
      if (typeof file.exists !== 'boolean' || typeof file.bytes !== 'number' || typeof file.lineCount !== 'number') {
        pushFinding(findings, 'blocker', 'p1b_preflight_file_shape_invalid', `P1B file ${filePath || '<unknown>'} must include exists, bytes and lineCount.`, auditPath);
      }
      if (typeof file.plannedDirtyOverlap !== 'boolean' || typeof file.observedDirtyWorktree !== 'boolean' || typeof file.requiresFreshReadBeforeEdit !== 'boolean') {
        pushFinding(findings, 'blocker', 'p1b_preflight_file_boolean_missing', `P1B file ${filePath || '<unknown>'} must include dirty/fresh-read booleans.`, auditPath);
      }
      if (file.allowedAction !== 'read_only_preflight') {
        pushFinding(findings, 'blocker', 'p1b_preflight_file_action_invalid', `P1B file ${filePath || '<unknown>'} must remain read_only_preflight.`, auditPath);
      }
      if (file.exists === true) existing += 1;
      if (file.plannedDirtyOverlap === true) plannedDirty += 1;
      if (file.observedDirtyWorktree === true) observedDirty += 1;
      if (file.requiresFreshReadBeforeEdit === true) freshRead += 1;
      if (file.plannedDirtyOverlap !== file.observedDirtyWorktree) {
        pushFinding(findings, 'blocker', 'p1b_preflight_dirty_mismatch', `P1B file ${filePath || '<unknown>'} planned dirty overlap must match observed dirty worktree.`, auditPath);
      }
      if (filePath === 'app/(tabs)/settings.tsx' && (file.plannedDirtyOverlap !== true || file.observedDirtyWorktree !== true || file.requiresFreshReadBeforeEdit !== true)) {
        pushFinding(findings, 'blocker', 'p1b_preflight_settings_guard_missing', 'P1B settings.tsx must be the single dirty overlap and require fresh read.', auditPath);
      }
    }
    if (summary.existingFiles !== existing || summary.dirtyOverlapsPlanned !== plannedDirty || summary.dirtyOverlapsObserved !== observedDirty || summary.freshReadRequiredFiles !== freshRead) {
      pushFinding(findings, 'blocker', 'p1b_preflight_summary_files_mismatch', 'P1B preflight summary counts must match files.', auditPath);
    }
  }

  const approvalGate = audit.approvalGate && typeof audit.approvalGate === 'object'
    ? audit.approvalGate as Record<string, unknown>
    : null;
  if (!approvalGate) {
    pushFinding(findings, 'blocker', 'p1b_preflight_approval_gate_missing', 'P1B preflight approvalGate must be an object.', auditPath);
  } else {
    if (typeof approvalGate.requiredApprovalText !== 'string' || !approvalGate.requiredApprovalText.includes('P1B dev target isolation packet')) {
      pushFinding(findings, 'blocker', 'p1b_preflight_approval_text_invalid', 'P1B preflight must include exact P1B approval text.', auditPath);
    }
    const receiptCandidates = Array.isArray(approvalGate.approvalReceiptCandidates) ? approvalGate.approvalReceiptCandidates as unknown[] : null;
    const rejected = Array.isArray(approvalGate.rejectedImplicitCommands) ? approvalGate.rejectedImplicitCommands as unknown[] : null;
    if (!receiptCandidates || receiptCandidates.length !== 1) {
      pushFinding(findings, 'blocker', 'p1b_preflight_receipt_candidates_invalid', 'P1B preflight must include exactly one approval receipt candidate.', auditPath);
    } else {
      for (const receiptPath of receiptCandidates) {
        if (typeof receiptPath !== 'string') {
          pushFinding(findings, 'blocker', 'p1b_preflight_receipt_candidate_shape_invalid', 'P1B receipt candidate must be a string.', auditPath);
        } else if (fs.existsSync(path.resolve(repoRoot, receiptPath))) {
          pushFinding(findings, 'blocker', 'p1b_preflight_receipt_present', `P1B approval receipt must be absent in preflight: ${receiptPath}`, auditPath);
        }
      }
    }
    if (!rejected || !rejected.includes('дальше') || !rejected.includes('approve')) {
      pushFinding(findings, 'blocker', 'p1b_preflight_rejected_commands_missing', 'P1B preflight approval gate must reject implicit commands including дальше and approve.', auditPath);
    }
  }

  for (const forbidden of [
    'app/study_target.ts',
    'app/target_storage_keys.ts',
    'tests/gustav_surface_target_switch.test.ts',
    'tests/gustav_target_storage_keys.test.ts',
  ]) {
    if (fs.existsSync(path.join(repoRoot, forbidden)) && shouldBlockP1APreApplyFilePresence(repoRoot, forbidden)) {
      pushFinding(findings, 'blocker', 'p1b_preflight_p1a_file_exists', `P1A planned production/test file exists before approval: ${forbidden}`, auditPath);
    }
  }

  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'p1b_preflight_findings_missing', 'P1B preflight findings must be an array.', auditPath);
  }
  if (!fs.existsSync(path.join(runDir, 'audits', 'p1b_preflight_audit.md'))) {
    pushFinding(findings, 'blocker', 'p1b_preflight_markdown_missing', 'P1B preflight markdown report is missing.', auditPath);
  }
  if (audit.status === 'PASS' && (
    summary.blockers !== 0 ||
    summary.p1bFiles !== 4 ||
    summary.existingFiles !== 4 ||
    summary.missingFiles !== 0 ||
    summary.dirtyOverlapsPlanned !== 1 ||
    summary.dirtyOverlapsObserved !== 1 ||
    summary.freshReadRequiredFiles !== 1 ||
    summary.exactApprovalReceiptCandidates !== 1 ||
    summary.exactApprovalReceiptsPresent !== 0 ||
    summary.preflightPassed !== true ||
    summary.p1bPreflightReadyAfterP1AAndExactApproval !== true ||
    summary.requiresP1ACompletion !== true ||
    summary.requiresExactP1BApproval !== true ||
    summary.canStartP1BNow !== false ||
    summary.canApplyNow !== false ||
    summary.mayStartFrenchGeneration !== false ||
    summary.mayModifyProductionAppFiles !== false ||
    summary.productionFilesStillAbsent !== true
  )) {
    pushFinding(findings, 'blocker', 'p1b_preflight_pass_with_gaps', 'P1B preflight cannot be PASS while preflight gaps remain or safety flags are open.', auditPath);
  }
}

function validateP1BDirtyOverlapSnapshotAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'p1b_dirty_overlap_snapshot_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const repoRoot = path.resolve(runDir, '..', '..', '..', '..');
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-p1b-dirty-overlap-snapshot-audit-v0') {
    pushFinding(findings, 'blocker', 'p1b_dirty_snapshot_schema_version', 'P1B dirty overlap snapshot schemaVersion must be gustav-p1b-dirty-overlap-snapshot-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'p1b_dirty_snapshot_run_id_mismatch', `P1B dirty overlap snapshot runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'p1b_dirty_snapshot_status_invalid', `P1B dirty overlap snapshot status is invalid: ${status}`, auditPath);
  } else if (status !== 'PASS') {
    pushFinding(findings, 'blocker', 'p1b_dirty_snapshot_status_not_pass', 'P1B dirty overlap snapshot must be PASS before it can be accepted.', auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'p1b_dirty_snapshot_summary_missing', 'P1B dirty overlap snapshot summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'snapshotFiles',
    'dirtyOverlapFiles',
    'userOwnedDirtyFiles',
    'freshReadRequiredFiles',
    'filesWithHeadSnapshot',
    'filesWithWorkingTreeSnapshot',
    'filesWithHashChange',
    'diffAdditions',
    'diffDeletions',
    'exactApprovalReceiptsPresent',
    'blockers',
    'warnings',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'p1b_dirty_snapshot_summary_number_missing', `P1B dirty snapshot summary.${key} must be a number.`, auditPath);
    }
  }
  for (const key of [
    'snapshotPassed',
    'dirtyOverlapPreserved',
    'requiresFreshReadBeforeEdit',
    'requiresExactP1BApproval',
    'canStartP1BNow',
    'canApplyNow',
    'mayStartFrenchGeneration',
    'mayModifyProductionAppFiles',
    'productionFilesStillAbsent',
  ]) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'p1b_dirty_snapshot_summary_boolean_missing', `P1B dirty snapshot summary.${key} must be boolean.`, auditPath);
    }
  }

  const files = Array.isArray(audit.files) ? audit.files as Array<Record<string, unknown>> : null;
  if (!files) {
    pushFinding(findings, 'blocker', 'p1b_dirty_snapshot_files_missing', 'P1B dirty snapshot files must be an array.', auditPath);
  } else {
    if (summary.snapshotFiles !== files.length || files.length !== 1) {
      pushFinding(findings, 'blocker', 'p1b_dirty_snapshot_file_count_mismatch', 'P1B dirty snapshot must include exactly one file.', auditPath);
    }
    let dirtyOverlapFiles = 0;
    let userOwnedDirtyFiles = 0;
    let freshReadRequiredFiles = 0;
    let headSnapshots = 0;
    let worktreeSnapshots = 0;
    let hashChanges = 0;
    let additions = 0;
    let deletions = 0;
    for (const file of files) {
      const filePath = typeof file.filePath === 'string' ? file.filePath : '';
      if (filePath !== 'app/(tabs)/settings.tsx') {
        pushFinding(findings, 'blocker', 'p1b_dirty_snapshot_unexpected_file', `Unexpected P1B dirty snapshot file: ${filePath || '<missing>'}`, auditPath);
      }
      const headSha = typeof file.headSha256 === 'string' ? file.headSha256 : '';
      const worktreeSha = typeof file.workingTreeSha256 === 'string' ? file.workingTreeSha256 : '';
      if (file.headExists !== true || file.workingTreeExists !== true || !/^[a-f0-9]{64}$/.test(headSha) || !/^[a-f0-9]{64}$/.test(worktreeSha)) {
        pushFinding(findings, 'blocker', 'p1b_dirty_snapshot_hash_shape_invalid', 'P1B dirty snapshot must include valid HEAD and working-tree SHA-256 hashes.', auditPath);
      }
      if (file.hashChanged !== true || headSha === worktreeSha) {
        pushFinding(findings, 'blocker', 'p1b_dirty_snapshot_hash_not_changed', 'P1B dirty snapshot must prove the dirty file differs from HEAD.', auditPath);
      }
      if (typeof file.additions !== 'number' || typeof file.deletions !== 'number' || Number(file.additions) <= 0 || Number(file.deletions) <= 0) {
        pushFinding(findings, 'blocker', 'p1b_dirty_snapshot_numstat_invalid', 'P1B dirty snapshot must include positive diff additions and deletions.', auditPath);
      }
      if (file.plannedDirtyOverlap !== true || file.observedDirtyWorktree !== true || file.userOwnedDirtyWorktree !== true || file.requiresFreshReadBeforeEdit !== true) {
        pushFinding(findings, 'blocker', 'p1b_dirty_snapshot_dirty_flags_invalid', 'P1B dirty snapshot must mark settings.tsx as planned/observed/user-owned dirty and fresh-read required.', auditPath);
      }
      if (file.preservationPolicy !== 'do_not_overwrite_without_exact_re_read_and_approval') {
        pushFinding(findings, 'blocker', 'p1b_dirty_snapshot_policy_invalid', 'P1B dirty snapshot preservationPolicy is invalid.', auditPath);
      }
      if (file.plannedDirtyOverlap === true && file.observedDirtyWorktree === true) dirtyOverlapFiles += 1;
      if (file.userOwnedDirtyWorktree === true) userOwnedDirtyFiles += 1;
      if (file.requiresFreshReadBeforeEdit === true) freshReadRequiredFiles += 1;
      if (file.headExists === true && /^[a-f0-9]{64}$/.test(headSha)) headSnapshots += 1;
      if (file.workingTreeExists === true && /^[a-f0-9]{64}$/.test(worktreeSha)) worktreeSnapshots += 1;
      if (file.hashChanged === true) hashChanges += 1;
      additions += typeof file.additions === 'number' ? file.additions : 0;
      deletions += typeof file.deletions === 'number' ? file.deletions : 0;
    }
    if (
      summary.dirtyOverlapFiles !== dirtyOverlapFiles ||
      summary.userOwnedDirtyFiles !== userOwnedDirtyFiles ||
      summary.freshReadRequiredFiles !== freshReadRequiredFiles ||
      summary.filesWithHeadSnapshot !== headSnapshots ||
      summary.filesWithWorkingTreeSnapshot !== worktreeSnapshots ||
      summary.filesWithHashChange !== hashChanges ||
      summary.diffAdditions !== additions ||
      summary.diffDeletions !== deletions
    ) {
      pushFinding(findings, 'blocker', 'p1b_dirty_snapshot_summary_file_mismatch', 'P1B dirty snapshot summary counts must match file entries.', auditPath);
    }
  }

  for (const forbidden of [
    'app/study_target.ts',
    'app/target_storage_keys.ts',
    'tests/gustav_surface_target_switch.test.ts',
    'tests/gustav_target_storage_keys.test.ts',
  ]) {
    if (fs.existsSync(path.join(repoRoot, forbidden)) && shouldBlockP1APreApplyFilePresence(repoRoot, forbidden)) {
      pushFinding(findings, 'blocker', 'p1b_dirty_snapshot_p1a_file_exists', `P1A planned production/test file exists before approval: ${forbidden}`, auditPath);
    }
  }

  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'p1b_dirty_snapshot_findings_missing', 'P1B dirty snapshot findings must be an array.', auditPath);
  }
  if (!fs.existsSync(path.join(runDir, 'audits', 'p1b_dirty_overlap_snapshot_audit.md'))) {
    pushFinding(findings, 'blocker', 'p1b_dirty_snapshot_markdown_missing', 'P1B dirty snapshot markdown report is missing.', auditPath);
  }
  if (audit.status === 'PASS' && (
    summary.blockers !== 0 ||
    summary.snapshotFiles !== 1 ||
    summary.dirtyOverlapFiles !== 1 ||
    summary.userOwnedDirtyFiles !== 1 ||
    summary.freshReadRequiredFiles !== 1 ||
    summary.filesWithHeadSnapshot !== 1 ||
    summary.filesWithWorkingTreeSnapshot !== 1 ||
    summary.filesWithHashChange !== 1 ||
    Number(summary.diffAdditions) <= 0 ||
    Number(summary.diffDeletions) <= 0 ||
    summary.exactApprovalReceiptsPresent !== 0 ||
    summary.snapshotPassed !== true ||
    summary.dirtyOverlapPreserved !== true ||
    summary.requiresFreshReadBeforeEdit !== true ||
    summary.requiresExactP1BApproval !== true ||
    summary.canStartP1BNow !== false ||
    summary.canApplyNow !== false ||
    summary.mayStartFrenchGeneration !== false ||
    summary.mayModifyProductionAppFiles !== false ||
    summary.productionFilesStillAbsent !== true
  )) {
    pushFinding(findings, 'blocker', 'p1b_dirty_snapshot_pass_with_gaps', 'P1B dirty snapshot cannot be PASS while snapshot gaps remain or safety flags are open.', auditPath);
  }
}

function validateP1BApprovalReceiptFirewallAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'p1b_approval_receipt_firewall_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const repoRoot = path.resolve(runDir, '..', '..', '..', '..');
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-p1b-approval-receipt-firewall-audit-v0') {
    pushFinding(findings, 'blocker', 'p1b_receipt_firewall_schema_version', 'P1B approval receipt firewall schemaVersion must be gustav-p1b-approval-receipt-firewall-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'p1b_receipt_firewall_run_id_mismatch', `P1B approval receipt firewall runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'p1b_receipt_firewall_status_invalid', `P1B approval receipt firewall status is invalid: ${status}`, auditPath);
  } else if (status !== 'PASS') {
    pushFinding(findings, 'blocker', 'p1b_receipt_firewall_status_not_pass', 'P1B approval receipt firewall must be PASS before it can be accepted.', auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'p1b_receipt_firewall_summary_missing', 'P1B approval receipt firewall summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'realReceiptCandidates',
    'realReceiptsPresent',
    'exactApprovalMatches',
    'tempFixtures',
    'rejectedTempFixtures',
    'acceptedShapeFixtures',
    'tempExactShapeBlockedByPath',
    'implicitCommandFixtures',
    'implicitCommandsRejected',
    'blockers',
    'warnings',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'p1b_receipt_firewall_summary_number_missing', `P1B approval receipt firewall summary.${key} must be a number.`, auditPath);
    }
  }
  for (const key of [
    'firewallPassed',
    'requiresP1ACompletion',
    'requiresFreshReadBeforeEdit',
    'requiresExactP1BApproval',
    'approvalStillMissing',
    'canStartP1BNow',
    'canApplyNow',
    'mayStartFrenchGeneration',
    'mayModifyProductionAppFiles',
    'productionFilesStillAbsent',
  ]) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'p1b_receipt_firewall_summary_boolean_missing', `P1B approval receipt firewall summary.${key} must be boolean.`, auditPath);
    }
  }

  const contract = audit.approvalContract && typeof audit.approvalContract === 'object'
    ? audit.approvalContract as Record<string, unknown>
    : null;
  if (!contract) {
    pushFinding(findings, 'blocker', 'p1b_receipt_firewall_contract_missing', 'P1B approval receipt firewall approvalContract must be an object.', auditPath);
  } else {
    if (typeof contract.requiredApprovalText !== 'string' || !contract.requiredApprovalText.includes('P1B dev target isolation packet')) {
      pushFinding(findings, 'blocker', 'p1b_receipt_firewall_text_invalid', 'P1B firewall must record exact P1B approval text.', auditPath);
    }
    if (contract.approvedSlice !== 'P1B_DEV_TARGET_ISOLATION') {
      pushFinding(findings, 'blocker', 'p1b_receipt_firewall_slice_invalid', 'P1B firewall approvedSlice must be P1B_DEV_TARGET_ISOLATION.', auditPath);
    }
    const files = Array.isArray(contract.approvedFiles) ? contract.approvedFiles as unknown[] : [];
    const expectedFiles = [
      'app/(tabs)/settings.tsx',
      'app/spanish_content_gate.ts',
      'app/study_target_lang_dev.ts',
      'components/StudyTargetContext.tsx',
    ];
    if (files.length !== expectedFiles.length || !expectedFiles.every((file, index) => files[index] === file)) {
      pushFinding(findings, 'blocker', 'p1b_receipt_firewall_files_invalid', 'P1B firewall approvedFiles must match the four P1B files in order.', auditPath);
    }
    const paths = Array.isArray(contract.acceptedReceiptPaths) ? contract.acceptedReceiptPaths as unknown[] : [];
    const rejected = Array.isArray(contract.rejectedImplicitCommands) ? contract.rejectedImplicitCommands as unknown[] : [];
    if (paths.length !== 1 || typeof paths[0] !== 'string' || !String(paths[0]).endsWith('p1b_dev_target_isolation_approval_receipt.json')) {
      pushFinding(findings, 'blocker', 'p1b_receipt_firewall_path_invalid', 'P1B firewall must record exactly one canonical receipt path.', auditPath);
    }
    if (!rejected.includes('дальше') || !rejected.includes('approve')) {
      pushFinding(findings, 'blocker', 'p1b_receipt_firewall_rejected_commands_missing', 'P1B firewall must reject implicit commands including дальше and approve.', auditPath);
    }
  }

  if (typeof audit.tempFixtureRoot !== 'string' || !audit.tempFixtureRoot.startsWith('/private/tmp/gustav-p1b-approval-firewall-')) {
    pushFinding(findings, 'blocker', 'p1b_receipt_firewall_temp_root_invalid', 'P1B approval receipt firewall tempFixtureRoot must be under /private/tmp.', auditPath);
  }

  const receiptProbes = Array.isArray(audit.receiptProbes) ? audit.receiptProbes as Array<Record<string, unknown>> : null;
  if (!receiptProbes) {
    pushFinding(findings, 'blocker', 'p1b_receipt_firewall_probes_missing', 'P1B approval receipt firewall receiptProbes must be an array.', auditPath);
  } else {
    const realProbeCount = receiptProbes.filter((probe) => probe.source === 'real_candidate').length;
    const tempProbeCount = receiptProbes.filter((probe) => probe.source === 'temp_fixture').length;
    const realPresent = receiptProbes.filter((probe) => probe.source === 'real_candidate' && probe.exists === true).length;
    const exactMatches = receiptProbes.filter((probe) => probe.source === 'real_candidate' && probe.wouldUnlockP1B === true).length;
    const rejectedTemp = receiptProbes.filter((probe) => probe.source === 'temp_fixture' && probe.wouldUnlockP1B === false).length;
    if (summary.realReceiptCandidates !== realProbeCount || summary.tempFixtures !== tempProbeCount || summary.realReceiptsPresent !== realPresent || summary.exactApprovalMatches !== exactMatches || summary.rejectedTempFixtures !== rejectedTemp) {
      pushFinding(findings, 'blocker', 'p1b_receipt_firewall_summary_probe_mismatch', 'P1B firewall summary counts must match receiptProbes.', auditPath);
    }
    for (const probe of receiptProbes) {
      const id = typeof probe.id === 'string' ? probe.id : '';
      if (!id || typeof probe.filePath !== 'string' || (probe.source !== 'real_candidate' && probe.source !== 'temp_fixture')) {
        pushFinding(findings, 'blocker', 'p1b_receipt_firewall_probe_shape_invalid', 'P1B receipt probe must include id, filePath and valid source.', auditPath);
      }
      for (const key of [
        'exists',
        'parseableJson',
        'schemaValid',
        'runIdMatches',
        'approvedSliceMatches',
        'approvedFilesMatch',
        'approvalTextMatches',
        'approvedAfterP1A',
        'freshReadRequired',
        'approvedAtIso',
        'acceptedReceiptPath',
        'wouldUnlockP1B',
        'expectedUnlock',
      ]) {
        if (typeof probe[key] !== 'boolean') {
          pushFinding(findings, 'blocker', 'p1b_receipt_firewall_probe_boolean_missing', `P1B receipt probe ${id || '<unknown>'}.${key} must be boolean.`, auditPath);
        }
      }
      if (typeof probe.rejectionReason !== 'string') {
        pushFinding(findings, 'blocker', 'p1b_receipt_firewall_probe_reason_missing', `P1B receipt probe ${id || '<unknown>'} must include rejectionReason.`, auditPath);
      }
      if (probe.wouldUnlockP1B !== probe.expectedUnlock) {
        pushFinding(findings, 'blocker', 'p1b_receipt_firewall_probe_expectation_mismatch', `P1B receipt probe ${id || '<unknown>'} unlock result must match expectedUnlock.`, auditPath);
      }
    }
    if (!receiptProbes.some((probe) => probe.id === 'TMP-EXACT-SHAPE-WRONG-PATH' && probe.rejectionReason === 'receipt_path_not_accepted')) {
      pushFinding(findings, 'blocker', 'p1b_receipt_firewall_exact_temp_path_guard_missing', 'P1B firewall must prove exact temp receipt shape is blocked by path.', auditPath);
    }
    if (!receiptProbes.some((probe) => probe.id === 'TMP-IMPLICIT-DALSHE' && probe.wouldUnlockP1B === false) ||
        !receiptProbes.some((probe) => probe.id === 'TMP-PLAIN-APPROVE' && probe.wouldUnlockP1B === false)) {
      pushFinding(findings, 'blocker', 'p1b_receipt_firewall_implicit_probe_missing', 'P1B firewall must reject дальше and plain approve fixtures.', auditPath);
    }
  }

  for (const forbidden of [
    'app/study_target.ts',
    'app/target_storage_keys.ts',
    'tests/gustav_surface_target_switch.test.ts',
    'tests/gustav_target_storage_keys.test.ts',
  ]) {
    if (fs.existsSync(path.join(repoRoot, forbidden)) && shouldBlockP1APreApplyFilePresence(repoRoot, forbidden)) {
      pushFinding(findings, 'blocker', 'p1b_receipt_firewall_p1a_file_exists', `P1A planned production/test file exists before approval: ${forbidden}`, auditPath);
    }
  }

  for (const required of [
    path.join(runDir, 'audits', 'p1b_approval_receipt_firewall_audit.md'),
    path.join(runDir, 'audits', 'p1b_approval_receipt_firewall', 'README.md'),
  ]) {
    if (!fs.existsSync(required)) {
      pushFinding(findings, 'blocker', 'p1b_receipt_firewall_markdown_missing', `P1B approval receipt firewall markdown report is missing: ${path.relative(runDir, required)}`, auditPath);
    }
  }
  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'p1b_receipt_firewall_findings_missing', 'P1B approval receipt firewall findings must be an array.', auditPath);
  }
  if (audit.status === 'PASS' && (
    summary.blockers !== 0 ||
    summary.realReceiptCandidates !== 1 ||
    summary.realReceiptsPresent !== 0 ||
    summary.exactApprovalMatches !== 0 ||
    summary.tempFixtures !== 7 ||
    summary.rejectedTempFixtures !== 7 ||
    summary.acceptedShapeFixtures !== 1 ||
    summary.tempExactShapeBlockedByPath !== 1 ||
    summary.implicitCommandFixtures !== 2 ||
    summary.implicitCommandsRejected !== 2 ||
    summary.firewallPassed !== true ||
    summary.requiresP1ACompletion !== true ||
    summary.requiresFreshReadBeforeEdit !== true ||
    summary.requiresExactP1BApproval !== true ||
    summary.approvalStillMissing !== true ||
    summary.canStartP1BNow !== false ||
    summary.canApplyNow !== false ||
    summary.mayStartFrenchGeneration !== false ||
    summary.mayModifyProductionAppFiles !== false ||
    summary.productionFilesStillAbsent !== true
  )) {
    pushFinding(findings, 'blocker', 'p1b_receipt_firewall_pass_with_gaps', 'P1B approval receipt firewall cannot be PASS while approval gaps remain or safety flags are open.', auditPath);
  }
}

function validateP1BApprovalReceiptContractAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'p1b_approval_receipt_contract_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const repoRoot = path.resolve(runDir, '..', '..', '..', '..');
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-p1b-approval-receipt-contract-audit-v0') {
    pushFinding(findings, 'blocker', 'p1b_receipt_contract_schema_version', 'P1B approval receipt contract schemaVersion must be gustav-p1b-approval-receipt-contract-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'p1b_receipt_contract_run_id_mismatch', `P1B approval receipt contract runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'p1b_receipt_contract_status_invalid', `P1B approval receipt contract status is invalid: ${status}`, auditPath);
  } else if (status !== 'PASS') {
    pushFinding(findings, 'blocker', 'p1b_receipt_contract_status_not_pass', 'P1B approval receipt contract must be PASS before it can be accepted.', auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'p1b_receipt_contract_summary_missing', 'P1B approval receipt contract summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'approvedFiles',
    'canonicalReceiptPaths',
    'requiredFields',
    'unlockPreconditions',
    'rejectedImplicitCommands',
    'blockers',
    'warnings',
    'exactApprovalMatches',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'p1b_receipt_contract_summary_number_missing', `P1B approval receipt contract summary.${key} must be a number.`, auditPath);
    }
  }
  for (const key of [
    'contractReady',
    'realReceiptPresent',
    'p1bUnlockStillBlocked',
    'requiresP1ACompletion',
    'requiresFreshReadBeforeEdit',
    'requiresExactP1BApproval',
    'canStartP1BNow',
    'canApplyNow',
    'mayStartFrenchGeneration',
    'mayModifyProductionAppFiles',
    'productionFilesStillAbsent',
  ]) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'p1b_receipt_contract_summary_boolean_missing', `P1B approval receipt contract summary.${key} must be boolean.`, auditPath);
    }
  }

  const contract = audit.approvalReceiptContract && typeof audit.approvalReceiptContract === 'object'
    ? audit.approvalReceiptContract as Record<string, unknown>
    : null;
  const expectedFiles = [
    'app/(tabs)/settings.tsx',
    'app/spanish_content_gate.ts',
    'app/study_target_lang_dev.ts',
    'components/StudyTargetContext.tsx',
  ];
  if (!contract) {
    pushFinding(findings, 'blocker', 'p1b_receipt_contract_missing', 'P1B approval receipt contract must include approvalReceiptContract.', auditPath);
  } else {
    if (contract.lockState !== 'locked_until_exact_p1b_receipt') {
      pushFinding(findings, 'blocker', 'p1b_receipt_contract_lock_state_invalid', 'P1B approval receipt contract must be locked_until_exact_p1b_receipt.', auditPath);
    }
    if (contract.approvedSlice !== 'P1B_DEV_TARGET_ISOLATION') {
      pushFinding(findings, 'blocker', 'p1b_receipt_contract_slice_invalid', 'P1B approval receipt contract approvedSlice must be P1B_DEV_TARGET_ISOLATION.', auditPath);
    }
    if (typeof contract.canonicalReceiptPath !== 'string' || !contract.canonicalReceiptPath.endsWith('p1b_dev_target_isolation_approval_receipt.json')) {
      pushFinding(findings, 'blocker', 'p1b_receipt_contract_path_invalid', 'P1B approval receipt contract canonicalReceiptPath is invalid.', auditPath);
    }
    if (typeof contract.requiredApprovalText !== 'string' || !contract.requiredApprovalText.includes('P1B dev target isolation packet') || (runId ? !contract.requiredApprovalText.includes(runId) : false)) {
      pushFinding(findings, 'blocker', 'p1b_receipt_contract_text_invalid', 'P1B approval receipt contract must record exact run-specific P1B approval text.', auditPath);
    }
    const requiredFields = Array.isArray(contract.requiredFields) ? contract.requiredFields as Array<Record<string, unknown>> : null;
    const expectedFieldNames = ['schemaVersion', 'runId', 'approvedSlice', 'approvalText', 'approvedFiles', 'approvedAfterP1A', 'freshReadBeforeEdit', 'approvedAt'];
    if (!requiredFields || requiredFields.length !== expectedFieldNames.length) {
      pushFinding(findings, 'blocker', 'p1b_receipt_contract_fields_invalid', 'P1B approval receipt contract must define exactly eight required fields.', auditPath);
    } else {
      for (const [index, expected] of expectedFieldNames.entries()) {
        const field = requiredFields[index] || {};
        if (field.name !== expected || field.required !== true || typeof field.expected !== 'string') {
          pushFinding(findings, 'blocker', 'p1b_receipt_contract_field_shape_invalid', `P1B required field ${expected} is invalid.`, auditPath);
        }
      }
    }
    const shape = contract.acceptedReceiptShape && typeof contract.acceptedReceiptShape === 'object'
      ? contract.acceptedReceiptShape as Record<string, unknown>
      : null;
    if (!shape) {
      pushFinding(findings, 'blocker', 'p1b_receipt_contract_shape_missing', 'P1B approval receipt contract must include acceptedReceiptShape.', auditPath);
    } else {
      const files = Array.isArray(shape.approvedFiles) ? shape.approvedFiles as unknown[] : [];
      if (
        shape.schemaVersion !== 'gustav-p1b-approval-receipt-v0' ||
        (runId && shape.runId !== runId) ||
        shape.approvedSlice !== 'P1B_DEV_TARGET_ISOLATION' ||
        shape.approvedAfterP1A !== true ||
        shape.freshReadBeforeEdit !== true ||
        shape.approvedAt !== 'ISO-8601 timestamp' ||
        files.length !== expectedFiles.length ||
        !expectedFiles.every((file, index) => files[index] === file)
      ) {
        pushFinding(findings, 'blocker', 'p1b_receipt_contract_shape_invalid', 'P1B accepted receipt shape does not match the canonical contract.', auditPath);
      }
    }
    const unlockPreconditions = Array.isArray(contract.unlockPreconditions) ? contract.unlockPreconditions as unknown[] : [];
    if (unlockPreconditions.length !== 5 || !unlockPreconditions.some((entry) => typeof entry === 'string' && entry.includes('P1A completion'))) {
      pushFinding(findings, 'blocker', 'p1b_receipt_contract_preconditions_invalid', 'P1B approval receipt contract must include five unlock preconditions including P1A completion.', auditPath);
    }
    const rejected = Array.isArray(contract.rejectedImplicitCommands) ? contract.rejectedImplicitCommands as unknown[] : [];
    if (rejected.length < 6 || !rejected.includes('дальше') || !rejected.includes('approve')) {
      pushFinding(findings, 'blocker', 'p1b_receipt_contract_rejected_commands_invalid', 'P1B approval receipt contract must reject implicit commands including дальше and approve.', auditPath);
    }
    const scope = contract.unlockScope && typeof contract.unlockScope === 'object'
      ? contract.unlockScope as Record<string, unknown>
      : null;
    if (!scope) {
      pushFinding(findings, 'blocker', 'p1b_receipt_contract_scope_missing', 'P1B approval receipt contract must include unlockScope.', auditPath);
    } else {
      const allowedFiles = Array.isArray(scope.allowedFiles) ? scope.allowedFiles as unknown[] : [];
      const forbiddenScopes = Array.isArray(scope.forbiddenScopes) ? scope.forbiddenScopes as unknown[] : [];
      if (scope.allowedSlice !== 'P1B_DEV_TARGET_ISOLATION' || allowedFiles.length !== expectedFiles.length || !expectedFiles.every((file, index) => allowedFiles[index] === file)) {
        pushFinding(findings, 'blocker', 'p1b_receipt_contract_scope_files_invalid', 'P1B approval receipt contract scope must allow only the four P1B files.', auditPath);
      }
      if (!forbiddenScopes.some((entry) => typeof entry === 'string' && entry.includes('French content generation'))) {
        pushFinding(findings, 'blocker', 'p1b_receipt_contract_forbidden_scope_missing', 'P1B approval receipt contract must explicitly forbid French content generation unlock.', auditPath);
      }
    }
    const nonReceiptExamples = Array.isArray(contract.nonReceiptExamples) ? contract.nonReceiptExamples as unknown[] : [];
    if (nonReceiptExamples.length !== 4) {
      pushFinding(findings, 'blocker', 'p1b_receipt_contract_non_receipts_invalid', 'P1B approval receipt contract must include four non-receipt examples.', auditPath);
    }
  }

  for (const forbidden of [
    'app/study_target.ts',
    'app/target_storage_keys.ts',
    'tests/gustav_surface_target_switch.test.ts',
    'tests/gustav_target_storage_keys.test.ts',
  ]) {
    if (fs.existsSync(path.join(repoRoot, forbidden)) && shouldBlockP1APreApplyFilePresence(repoRoot, forbidden)) {
      pushFinding(findings, 'blocker', 'p1b_receipt_contract_forbidden_file_exists', `P1A planned production/test file exists before approval: ${forbidden}`, auditPath);
    }
  }

  for (const required of [
    path.join(runDir, 'audits', 'p1b_approval_receipt_contract_audit.md'),
    path.join(runDir, 'audits', 'p1b_approval_receipt_contract', 'README.md'),
  ]) {
    if (!fs.existsSync(required)) {
      pushFinding(findings, 'blocker', 'p1b_receipt_contract_markdown_missing', `P1B approval receipt contract markdown report is missing: ${path.relative(runDir, required)}`, auditPath);
    }
  }
  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'p1b_receipt_contract_findings_missing', 'P1B approval receipt contract findings must be an array.', auditPath);
  }
  if (audit.status === 'PASS' && (
    summary.blockers !== 0 ||
    summary.approvedFiles !== 4 ||
    summary.canonicalReceiptPaths !== 1 ||
    summary.requiredFields !== 8 ||
    summary.unlockPreconditions !== 5 ||
    typeof summary.rejectedImplicitCommands !== 'number' ||
    summary.rejectedImplicitCommands < 6 ||
    summary.contractReady !== true ||
    summary.realReceiptPresent !== false ||
    summary.exactApprovalMatches !== 0 ||
    summary.p1bUnlockStillBlocked !== true ||
    summary.requiresP1ACompletion !== true ||
    summary.requiresFreshReadBeforeEdit !== true ||
    summary.requiresExactP1BApproval !== true ||
    summary.canStartP1BNow !== false ||
    summary.canApplyNow !== false ||
    summary.mayStartFrenchGeneration !== false ||
    summary.mayModifyProductionAppFiles !== false ||
    summary.productionFilesStillAbsent !== true
  )) {
    pushFinding(findings, 'blocker', 'p1b_receipt_contract_pass_with_gaps', 'P1B approval receipt contract cannot be PASS while contract gaps remain or safety flags are open.', auditPath);
  }
}

function validateP1BUnlockPrerequisiteMatrixAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'p1b_unlock_prerequisite_matrix_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const repoRoot = path.resolve(runDir, '..', '..', '..', '..');
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-p1b-unlock-prerequisite-matrix-audit-v0') {
    pushFinding(findings, 'blocker', 'p1b_unlock_matrix_schema_version', 'P1B unlock prerequisite matrix schemaVersion must be gustav-p1b-unlock-prerequisite-matrix-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'p1b_unlock_matrix_run_id_mismatch', `P1B unlock prerequisite matrix runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'p1b_unlock_matrix_status_invalid', `P1B unlock prerequisite matrix status is invalid: ${status}`, auditPath);
  } else if (status !== 'PASS') {
    pushFinding(findings, 'blocker', 'p1b_unlock_matrix_status_not_pass', 'P1B unlock prerequisite matrix must be PASS before it can be accepted.', auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'p1b_unlock_matrix_summary_missing', 'P1B unlock prerequisite matrix summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'scenarios',
    'blockedScenarios',
    'futureUnlockScenarios',
    'missingPrerequisiteUnlocks',
    'blockers',
    'warnings',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'p1b_unlock_matrix_summary_number_missing', `P1B unlock matrix summary.${key} must be a number.`, auditPath);
    }
  }
  for (const key of [
    'matrixPassed',
    'andGateEnforced',
    'p1aCompletionRequired',
    'exactReceiptRequired',
    'freshReadRequired',
    'dirtyOverlapPreservationRequired',
    'currentPrerequisitesComplete',
    'canStartP1BNow',
    'canApplyNow',
    'mayStartFrenchGeneration',
    'mayModifyProductionAppFiles',
    'productionFilesStillAbsent',
  ]) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'p1b_unlock_matrix_summary_boolean_missing', `P1B unlock matrix summary.${key} must be boolean.`, auditPath);
    }
  }
  const currentState = audit.currentState && typeof audit.currentState === 'object'
    ? audit.currentState as Record<string, unknown>
    : null;
  if (!currentState) {
    pushFinding(findings, 'blocker', 'p1b_unlock_matrix_current_state_missing', 'P1B unlock prerequisite matrix must include currentState.', auditPath);
  } else {
    for (const key of ['p1aCompletionProofPresent', 'realP1BReceiptPresent', 'freshReadReceiptPresent', 'dirtyOverlapStillDirty']) {
      if (typeof currentState[key] !== 'boolean') {
        pushFinding(findings, 'blocker', 'p1b_unlock_matrix_current_state_boolean_missing', `P1B unlock matrix currentState.${key} must be boolean.`, auditPath);
      }
    }
    if (typeof currentState.p1aProductionFilesPresent !== 'number' || typeof currentState.dirtyOverlapPath !== 'string') {
      pushFinding(findings, 'blocker', 'p1b_unlock_matrix_current_state_shape_invalid', 'P1B unlock matrix currentState must include p1aProductionFilesPresent and dirtyOverlapPath.', auditPath);
    }
  }
  const unlockLogic = audit.unlockLogic && typeof audit.unlockLogic === 'object'
    ? audit.unlockLogic as Record<string, unknown>
    : null;
  const expectedFiles = [
    'app/(tabs)/settings.tsx',
    'app/spanish_content_gate.ts',
    'app/study_target_lang_dev.ts',
    'components/StudyTargetContext.tsx',
  ];
  if (!unlockLogic) {
    pushFinding(findings, 'blocker', 'p1b_unlock_matrix_logic_missing', 'P1B unlock prerequisite matrix must include unlockLogic.', auditPath);
  } else {
    const requiredAllOf = Array.isArray(unlockLogic.requiredAllOf) ? unlockLogic.requiredAllOf as unknown[] : [];
    const allowedFiles = Array.isArray(unlockLogic.allowedFiles) ? unlockLogic.allowedFiles as unknown[] : [];
    if (requiredAllOf.length !== 5 || !requiredAllOf.some((entry) => typeof entry === 'string' && entry.includes('P1A completion'))) {
      pushFinding(findings, 'blocker', 'p1b_unlock_matrix_requirements_invalid', 'P1B unlock matrix must require five AND-gate prerequisites including P1A completion.', auditPath);
    }
    if (typeof unlockLogic.canonicalP1BReceiptPath !== 'string' || !unlockLogic.canonicalP1BReceiptPath.endsWith('p1b_dev_target_isolation_approval_receipt.json')) {
      pushFinding(findings, 'blocker', 'p1b_unlock_matrix_receipt_path_invalid', 'P1B unlock matrix canonical receipt path is invalid.', auditPath);
    }
    if (typeof unlockLogic.freshReadReceiptPath !== 'string' || !unlockLogic.freshReadReceiptPath.endsWith('p1b_dirty_overlap_fresh_read_receipt.json')) {
      pushFinding(findings, 'blocker', 'p1b_unlock_matrix_fresh_read_path_invalid', 'P1B unlock matrix fresh-read receipt path is invalid.', auditPath);
    }
    if (allowedFiles.length !== expectedFiles.length || !expectedFiles.every((file, index) => allowedFiles[index] === file)) {
      pushFinding(findings, 'blocker', 'p1b_unlock_matrix_allowed_files_invalid', 'P1B unlock matrix allowed files must match the four P1B files.', auditPath);
    }
  }
  const scenarios = Array.isArray(audit.scenarios) ? audit.scenarios as Array<Record<string, unknown>> : null;
  if (!scenarios) {
    pushFinding(findings, 'blocker', 'p1b_unlock_matrix_scenarios_missing', 'P1B unlock prerequisite matrix scenarios must be an array.', auditPath);
  } else {
    const blocked = scenarios.filter((scenario) => scenario.wouldUnlockP1B === false).length;
    const futureUnlocks = scenarios.filter((scenario) => scenario.wouldUnlockP1B === true).length;
    if (summary.scenarios !== scenarios.length || summary.blockedScenarios !== blocked || summary.futureUnlockScenarios !== futureUnlocks) {
      pushFinding(findings, 'blocker', 'p1b_unlock_matrix_summary_scenario_mismatch', 'P1B unlock matrix summary counts must match scenarios.', auditPath);
    }
    for (const scenario of scenarios) {
      const id = typeof scenario.id === 'string' ? scenario.id : '';
      if (!id || typeof scenario.description !== 'string') {
        pushFinding(findings, 'blocker', 'p1b_unlock_matrix_scenario_shape_invalid', 'P1B unlock matrix scenario must include id and description.', auditPath);
      }
      for (const key of [
        'p1aCompleted',
        'receiptAtCanonicalPath',
        'receiptShapeValid',
        'approvalTextMatches',
        'approvedFilesMatch',
        'freshReadPerformed',
        'dirtyOverlapPreserved',
        'wouldUnlockP1B',
        'expectedUnlock',
      ]) {
        if (typeof scenario[key] !== 'boolean') {
          pushFinding(findings, 'blocker', 'p1b_unlock_matrix_scenario_boolean_missing', `P1B unlock scenario ${id || '<unknown>'}.${key} must be boolean.`, auditPath);
        }
      }
      if (!Array.isArray(scenario.rejectionReasons)) {
        pushFinding(findings, 'blocker', 'p1b_unlock_matrix_scenario_reasons_missing', `P1B unlock scenario ${id || '<unknown>'} must include rejectionReasons.`, auditPath);
      }
      if (scenario.wouldUnlockP1B !== scenario.expectedUnlock) {
        pushFinding(findings, 'blocker', 'p1b_unlock_matrix_expectation_mismatch', `P1B unlock scenario ${id || '<unknown>'} unlock result must match expectedUnlock.`, auditPath);
      }
    }
    const requiredIds = [
      'CURRENT-STATE',
      'EXACT-RECEIPT-WRONG-PATH',
      'RECEIPT-WITHOUT-P1A',
      'P1A-AND-RECEIPT-NO-FRESH-READ',
      'P1A-RECEIPT-FRESH-READ-WRONG-FILES',
      'FUTURE-ALL-P1B-PREREQUISITES',
    ];
    for (const id of requiredIds) {
      if (!scenarios.some((scenario) => scenario.id === id)) {
        pushFinding(findings, 'blocker', 'p1b_unlock_matrix_required_scenario_missing', `P1B unlock matrix missing scenario ${id}.`, auditPath);
      }
    }
    if (!scenarios.some((scenario) => scenario.id === 'FUTURE-ALL-P1B-PREREQUISITES' && scenario.wouldUnlockP1B === true)) {
      pushFinding(findings, 'blocker', 'p1b_unlock_matrix_future_positive_missing', 'P1B unlock matrix must include one future all-prerequisites positive scenario.', auditPath);
    }
  }

  for (const forbidden of [
    'app/study_target.ts',
    'app/target_storage_keys.ts',
    'tests/gustav_surface_target_switch.test.ts',
    'tests/gustav_target_storage_keys.test.ts',
  ]) {
    if (fs.existsSync(path.join(repoRoot, forbidden)) && shouldBlockP1APreApplyFilePresence(repoRoot, forbidden)) {
      pushFinding(findings, 'blocker', 'p1b_unlock_matrix_forbidden_file_exists', `P1A planned production/test file exists before approval: ${forbidden}`, auditPath);
    }
  }
  for (const required of [
    path.join(runDir, 'audits', 'p1b_unlock_prerequisite_matrix_audit.md'),
    path.join(runDir, 'audits', 'p1b_unlock_prerequisite_matrix', 'README.md'),
  ]) {
    if (!fs.existsSync(required)) {
      pushFinding(findings, 'blocker', 'p1b_unlock_matrix_markdown_missing', `P1B unlock prerequisite matrix markdown report is missing: ${path.relative(runDir, required)}`, auditPath);
    }
  }
  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'p1b_unlock_matrix_findings_missing', 'P1B unlock prerequisite matrix findings must be an array.', auditPath);
  }
  if (audit.status === 'PASS' && (
    summary.blockers !== 0 ||
    summary.scenarios !== 6 ||
    summary.blockedScenarios !== 5 ||
    summary.futureUnlockScenarios !== 1 ||
    summary.missingPrerequisiteUnlocks !== 0 ||
    summary.matrixPassed !== true ||
    summary.andGateEnforced !== true ||
    summary.p1aCompletionRequired !== true ||
    summary.exactReceiptRequired !== true ||
    summary.freshReadRequired !== true ||
    summary.dirtyOverlapPreservationRequired !== true ||
    summary.currentPrerequisitesComplete !== false ||
    summary.canStartP1BNow !== false ||
    summary.canApplyNow !== false ||
    summary.mayStartFrenchGeneration !== false ||
    summary.mayModifyProductionAppFiles !== false ||
    summary.productionFilesStillAbsent !== true
  )) {
    pushFinding(findings, 'blocker', 'p1b_unlock_matrix_pass_with_gaps', 'P1B unlock prerequisite matrix cannot be PASS while unlock gaps remain or safety flags are open.', auditPath);
  }
}

function validateP1BFreshReadReceiptContractAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'p1b_fresh_read_receipt_contract_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const repoRoot = path.resolve(runDir, '..', '..', '..', '..');
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-p1b-fresh-read-receipt-contract-audit-v0') {
    pushFinding(findings, 'blocker', 'p1b_fresh_read_contract_schema_version', 'P1B fresh-read receipt contract schemaVersion must be gustav-p1b-fresh-read-receipt-contract-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'p1b_fresh_read_contract_run_id_mismatch', `P1B fresh-read receipt contract runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'p1b_fresh_read_contract_status_invalid', `P1B fresh-read receipt contract status is invalid: ${status}`, auditPath);
  } else if (status !== 'PASS') {
    pushFinding(findings, 'blocker', 'p1b_fresh_read_contract_status_not_pass', 'P1B fresh-read receipt contract must be PASS before it can be accepted.', auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'p1b_fresh_read_contract_summary_missing', 'P1B fresh-read receipt contract summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'dirtyOverlapFiles',
    'canonicalFreshReadReceiptPaths',
    'requiredFields',
    'staleReadProbes',
    'rejectedStaleReadProbes',
    'blockers',
    'warnings',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'p1b_fresh_read_contract_summary_number_missing', `P1B fresh-read contract summary.${key} must be a number.`, auditPath);
    }
  }
  for (const key of [
    'contractReady',
    'freshReadReceiptPresent',
    'currentWorkingTreeHashRecorded',
    'currentWorkingTreeHashMatchesSnapshot',
    'snapshotHashDriftDetected',
    'snapshotRefreshRequiredBeforeP1B',
    'staleReadRejected',
    'requiresP1ACompletion',
    'requiresExactP1BApproval',
    'requiresFreshReadAfterApproval',
    'canStartP1BNow',
    'canApplyNow',
    'mayStartFrenchGeneration',
    'mayModifyProductionAppFiles',
    'productionFilesStillAbsent',
  ]) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'p1b_fresh_read_contract_summary_boolean_missing', `P1B fresh-read contract summary.${key} must be boolean.`, auditPath);
    }
  }

  const current = audit.currentDirtyOverlap && typeof audit.currentDirtyOverlap === 'object'
    ? audit.currentDirtyOverlap as Record<string, unknown>
    : null;
  if (!current) {
    pushFinding(findings, 'blocker', 'p1b_fresh_read_contract_current_missing', 'P1B fresh-read receipt contract must include currentDirtyOverlap.', auditPath);
  } else {
    if (
      current.filePath !== 'app/(tabs)/settings.tsx' ||
      current.gitStatus !== ' M' ||
      current.exists !== true ||
      current.requiresFreshReadBeforeEdit !== true ||
      current.freshReadReceiptPresent !== false ||
      typeof current.freshReadReceiptPath !== 'string' ||
      !current.freshReadReceiptPath.endsWith('p1b_dirty_overlap_fresh_read_receipt.json')
    ) {
      pushFinding(findings, 'blocker', 'p1b_fresh_read_contract_current_shape_invalid', 'P1B fresh-read currentDirtyOverlap has invalid file, status or receipt flags.', auditPath);
    }
    for (const key of ['bytes', 'lineCount']) {
      if (typeof current[key] !== 'number' || Number(current[key]) <= 0) {
        pushFinding(findings, 'blocker', 'p1b_fresh_read_contract_current_number_invalid', `P1B fresh-read currentDirtyOverlap.${key} must be a positive number.`, auditPath);
      }
    }
    const hashPattern = /^[a-f0-9]{64}$/;
    const hashesMatch = current.snapshotWorkingTreeSha256 === current.currentWorkingTreeSha256;
    if (
      typeof current.snapshotWorkingTreeSha256 !== 'string' ||
      typeof current.currentWorkingTreeSha256 !== 'string' ||
      !hashPattern.test(current.snapshotWorkingTreeSha256) ||
      !hashPattern.test(current.currentWorkingTreeSha256) ||
      current.currentHashMatchesSnapshot !== hashesMatch
    ) {
      pushFinding(findings, 'blocker', 'p1b_fresh_read_contract_hash_invalid', 'P1B fresh-read contract must record valid 64-char snapshot/current hashes and an accurate match flag.', auditPath);
    }
  }

  const contract = audit.freshReadReceiptContract && typeof audit.freshReadReceiptContract === 'object'
    ? audit.freshReadReceiptContract as Record<string, unknown>
    : null;
  if (!contract) {
    pushFinding(findings, 'blocker', 'p1b_fresh_read_contract_missing', 'P1B fresh-read receipt contract must include freshReadReceiptContract.', auditPath);
  } else {
    if (contract.lockState !== 'locked_until_fresh_read_after_p1b_approval') {
      pushFinding(findings, 'blocker', 'p1b_fresh_read_contract_lock_state_invalid', 'P1B fresh-read contract lockState is invalid.', auditPath);
    }
    if (typeof contract.canonicalFreshReadReceiptPath !== 'string' || !contract.canonicalFreshReadReceiptPath.endsWith('p1b_dirty_overlap_fresh_read_receipt.json')) {
      pushFinding(findings, 'blocker', 'p1b_fresh_read_contract_path_invalid', 'P1B fresh-read canonical receipt path is invalid.', auditPath);
    }
    if (contract.dirtyOverlapFile !== 'app/(tabs)/settings.tsx') {
      pushFinding(findings, 'blocker', 'p1b_fresh_read_contract_file_invalid', 'P1B fresh-read contract dirtyOverlapFile is invalid.', auditPath);
    }
    if (typeof contract.linkedP1BApprovalReceiptPath !== 'string' || !contract.linkedP1BApprovalReceiptPath.endsWith('p1b_dev_target_isolation_approval_receipt.json')) {
      pushFinding(findings, 'blocker', 'p1b_fresh_read_contract_link_invalid', 'P1B fresh-read contract must link the exact P1B approval receipt path.', auditPath);
    }
    const requiredFields = Array.isArray(contract.requiredFields) ? contract.requiredFields as Array<Record<string, unknown>> : null;
    const expectedFieldNames = [
      'schemaVersion',
      'runId',
      'approvedSlice',
      'filePath',
      'linkedP1BApprovalReceiptPath',
      'snapshotWorkingTreeSha256',
      'currentWorkingTreeSha256',
      'currentGitStatus',
      'readAfterApproval',
      'readAt',
    ];
    if (!requiredFields || requiredFields.length !== expectedFieldNames.length) {
      pushFinding(findings, 'blocker', 'p1b_fresh_read_contract_fields_invalid', 'P1B fresh-read contract must define exactly ten required fields.', auditPath);
    } else {
      for (const [index, expected] of expectedFieldNames.entries()) {
        const field = requiredFields[index] || {};
        if (field.name !== expected || field.required !== true || typeof field.expected !== 'string') {
          pushFinding(findings, 'blocker', 'p1b_fresh_read_contract_field_shape_invalid', `P1B fresh-read required field ${expected} is invalid.`, auditPath);
        }
      }
    }
    const shape = contract.acceptedReceiptShape && typeof contract.acceptedReceiptShape === 'object'
      ? contract.acceptedReceiptShape as Record<string, unknown>
      : null;
    if (!shape) {
      pushFinding(findings, 'blocker', 'p1b_fresh_read_contract_shape_missing', 'P1B fresh-read contract must include acceptedReceiptShape.', auditPath);
    } else {
      const hashPattern = /^[a-f0-9]{64}$/;
      if (
        shape.schemaVersion !== 'gustav-p1b-fresh-read-receipt-v0' ||
        (runId && shape.runId !== runId) ||
        shape.approvedSlice !== 'P1B_DEV_TARGET_ISOLATION' ||
        shape.filePath !== 'app/(tabs)/settings.tsx' ||
        typeof shape.linkedP1BApprovalReceiptPath !== 'string' ||
        !shape.linkedP1BApprovalReceiptPath.endsWith('p1b_dev_target_isolation_approval_receipt.json') ||
        typeof shape.snapshotWorkingTreeSha256 !== 'string' ||
        typeof shape.currentWorkingTreeSha256 !== 'string' ||
        !hashPattern.test(shape.snapshotWorkingTreeSha256) ||
        !hashPattern.test(shape.currentWorkingTreeSha256) ||
        shape.currentGitStatus !== ' M' ||
        shape.readAfterApproval !== true ||
        shape.readAt !== 'ISO-8601 timestamp'
      ) {
        pushFinding(findings, 'blocker', 'p1b_fresh_read_contract_shape_invalid', 'P1B fresh-read accepted receipt shape is invalid.', auditPath);
      }
    }
    const rejectionPolicy = Array.isArray(contract.rejectionPolicy) ? contract.rejectionPolicy as unknown[] : [];
    if (rejectionPolicy.length !== 5 || !rejectionPolicy.some((entry) => typeof entry === 'string' && entry.includes('stale hashes'))) {
      pushFinding(findings, 'blocker', 'p1b_fresh_read_contract_rejection_policy_invalid', 'P1B fresh-read contract must include five rejection policy rules including stale hash rejection.', auditPath);
    }
  }

  const probes = Array.isArray(audit.staleReadProbes) ? audit.staleReadProbes as Array<Record<string, unknown>> : null;
  if (!probes) {
    pushFinding(findings, 'blocker', 'p1b_fresh_read_contract_probes_missing', 'P1B fresh-read staleReadProbes must be an array.', auditPath);
  } else {
    const rejected = probes.filter((probe) => probe.wouldSatisfyFreshRead === false).length;
    if (summary.staleReadProbes !== probes.length || summary.rejectedStaleReadProbes !== rejected) {
      pushFinding(findings, 'blocker', 'p1b_fresh_read_contract_summary_probe_mismatch', 'P1B fresh-read summary counts must match staleReadProbes.', auditPath);
    }
    const requiredProbeIds = ['NO-FRESH-READ-RECEIPT', 'SNAPSHOT-HASH-AS-FRESH-READ', 'WRONG-FILE-FRESH-READ', 'READ-BEFORE-APPROVAL', 'UNLINKED-P1B-APPROVAL'];
    for (const id of requiredProbeIds) {
      if (!probes.some((probe) => probe.id === id)) {
        pushFinding(findings, 'blocker', 'p1b_fresh_read_contract_required_probe_missing', `P1B fresh-read contract missing probe ${id}.`, auditPath);
      }
    }
    for (const probe of probes) {
      const id = typeof probe.id === 'string' ? probe.id : '';
      if (!id || typeof probe.description !== 'string') {
        pushFinding(findings, 'blocker', 'p1b_fresh_read_contract_probe_shape_invalid', 'P1B fresh-read probe must include id and description.', auditPath);
      }
      for (const key of ['receiptPathAccepted', 'filePathMatches', 'hashMatchesCurrent', 'readAfterApproval', 'p1bApprovalReceiptLinked', 'wouldSatisfyFreshRead', 'expectedFreshRead']) {
        if (typeof probe[key] !== 'boolean') {
          pushFinding(findings, 'blocker', 'p1b_fresh_read_contract_probe_boolean_missing', `P1B fresh-read probe ${id || '<unknown>'}.${key} must be boolean.`, auditPath);
        }
      }
      if (!Array.isArray(probe.rejectionReasons)) {
        pushFinding(findings, 'blocker', 'p1b_fresh_read_contract_probe_reasons_missing', `P1B fresh-read probe ${id || '<unknown>'} must include rejectionReasons.`, auditPath);
      }
      if (probe.wouldSatisfyFreshRead !== probe.expectedFreshRead) {
        pushFinding(findings, 'blocker', 'p1b_fresh_read_contract_probe_expectation_mismatch', `P1B fresh-read probe ${id || '<unknown>'} result must match expectedFreshRead.`, auditPath);
      }
    }
  }

  for (const forbidden of [
    'app/study_target.ts',
    'app/target_storage_keys.ts',
    'tests/gustav_surface_target_switch.test.ts',
    'tests/gustav_target_storage_keys.test.ts',
  ]) {
    if (fs.existsSync(path.join(repoRoot, forbidden)) && shouldBlockP1APreApplyFilePresence(repoRoot, forbidden)) {
      pushFinding(findings, 'blocker', 'p1b_fresh_read_contract_forbidden_file_exists', `P1A planned production/test file exists before approval: ${forbidden}`, auditPath);
    }
  }
  for (const required of [
    path.join(runDir, 'audits', 'p1b_fresh_read_receipt_contract_audit.md'),
    path.join(runDir, 'audits', 'p1b_fresh_read_receipt_contract', 'README.md'),
  ]) {
    if (!fs.existsSync(required)) {
      pushFinding(findings, 'blocker', 'p1b_fresh_read_contract_markdown_missing', `P1B fresh-read receipt contract markdown report is missing: ${path.relative(runDir, required)}`, auditPath);
    }
  }
  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'p1b_fresh_read_contract_findings_missing', 'P1B fresh-read receipt contract findings must be an array.', auditPath);
  }
  if (audit.status === 'PASS' && (
    summary.blockers !== 0 ||
    summary.dirtyOverlapFiles !== 1 ||
    summary.canonicalFreshReadReceiptPaths !== 1 ||
    summary.requiredFields !== 10 ||
    summary.staleReadProbes !== 5 ||
    summary.rejectedStaleReadProbes !== 5 ||
    summary.contractReady !== true ||
    summary.freshReadReceiptPresent !== false ||
    summary.currentWorkingTreeHashRecorded !== true ||
    summary.currentWorkingTreeHashMatchesSnapshot !== false ||
    summary.snapshotHashDriftDetected !== true ||
    summary.snapshotRefreshRequiredBeforeP1B !== true ||
    summary.staleReadRejected !== true ||
    summary.requiresP1ACompletion !== true ||
    summary.requiresExactP1BApproval !== true ||
    summary.requiresFreshReadAfterApproval !== true ||
    summary.canStartP1BNow !== false ||
    summary.canApplyNow !== false ||
    summary.mayStartFrenchGeneration !== false ||
    summary.mayModifyProductionAppFiles !== false ||
    summary.productionFilesStillAbsent !== true
  )) {
    pushFinding(findings, 'blocker', 'p1b_fresh_read_contract_pass_with_gaps', 'P1B fresh-read receipt contract cannot be PASS while contract gaps remain or safety flags are open.', auditPath);
  }
}

function validateP1BDirtyOverlapDriftResponseAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'p1b_dirty_overlap_drift_response_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const repoRoot = path.resolve(runDir, '..', '..', '..', '..');
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-p1b-dirty-overlap-drift-response-audit-v0') {
    pushFinding(findings, 'blocker', 'p1b_drift_response_schema_version', 'P1B dirty-overlap drift response schemaVersion must be gustav-p1b-dirty-overlap-drift-response-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'p1b_drift_response_run_id_mismatch', `P1B dirty-overlap drift response runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'p1b_drift_response_status_invalid', `P1B dirty-overlap drift response status is invalid: ${status}`, auditPath);
  } else if (status !== 'PASS') {
    pushFinding(findings, 'blocker', 'p1b_drift_response_status_not_pass', 'P1B dirty-overlap drift response must be PASS before it can be accepted.', auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'p1b_drift_response_summary_missing', 'P1B dirty-overlap drift response summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'dirtyOverlapFiles',
    'driftedDirtyOverlapFiles',
    'refreshSteps',
    'forbiddenActions',
    'acceptanceCriteria',
    'blockers',
    'warnings',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'p1b_drift_response_summary_number_missing', `P1B drift response summary.${key} must be a number.`, auditPath);
    }
  }
  for (const key of [
    'driftResponsePlanReady',
    'oldSnapshotMayAuthorizeP1B',
    'snapshotRefreshRequiredBeforeP1B',
    'freshReadReceiptRequiredAfterApproval',
    'exactP1BApprovalRequired',
    'canStartP1BNow',
    'canApplyNow',
    'mayStartFrenchGeneration',
    'mayModifyProductionAppFiles',
    'productionFilesStillAbsent',
  ]) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'p1b_drift_response_summary_boolean_missing', `P1B drift response summary.${key} must be boolean.`, auditPath);
    }
  }

  const current = audit.currentDirtyOverlap && typeof audit.currentDirtyOverlap === 'object'
    ? audit.currentDirtyOverlap as Record<string, unknown>
    : null;
  if (!current) {
    pushFinding(findings, 'blocker', 'p1b_drift_response_current_missing', 'P1B drift response must include currentDirtyOverlap.', auditPath);
  } else {
    const hashPattern = /^[a-f0-9]{64}$/;
    if (
      current.filePath !== 'app/(tabs)/settings.tsx' ||
      current.gitStatus !== ' M' ||
      current.exists !== true ||
      typeof current.snapshotWorkingTreeSha256 !== 'string' ||
      typeof current.currentWorkingTreeSha256 !== 'string' ||
      !hashPattern.test(current.snapshotWorkingTreeSha256) ||
      !hashPattern.test(current.currentWorkingTreeSha256) ||
      current.snapshotWorkingTreeSha256 === current.currentWorkingTreeSha256 ||
      current.hashDriftDetected !== true
    ) {
      pushFinding(findings, 'blocker', 'p1b_drift_response_current_shape_invalid', 'P1B drift response current dirty overlap must prove modified settings.tsx has hash drift.', auditPath);
    }
    for (const key of ['snapshotBytes', 'currentBytes', 'snapshotLineCount', 'currentLineCount']) {
      if (typeof current[key] !== 'number' || Number(current[key]) <= 0) {
        pushFinding(findings, 'blocker', 'p1b_drift_response_current_number_invalid', `P1B drift response currentDirtyOverlap.${key} must be a positive number.`, auditPath);
      }
    }
    for (const key of ['diffAdditions', 'diffDeletions']) {
      if (typeof current[key] !== 'number' || Number(current[key]) <= 0) {
        pushFinding(findings, 'blocker', 'p1b_drift_response_diff_invalid', `P1B drift response currentDirtyOverlap.${key} must be a positive number.`, auditPath);
      }
    }
  }

  const plan = audit.driftResponsePlan && typeof audit.driftResponsePlan === 'object'
    ? audit.driftResponsePlan as Record<string, unknown>
    : null;
  if (!plan) {
    pushFinding(findings, 'blocker', 'p1b_drift_response_plan_missing', 'P1B drift response must include driftResponsePlan.', auditPath);
  } else {
    if (plan.lockState !== 'locked_until_snapshot_refresh_and_fresh_read_after_approval') {
      pushFinding(findings, 'blocker', 'p1b_drift_response_lock_state_invalid', 'P1B drift response lockState is invalid.', auditPath);
    }
    if (plan.staleSnapshotPolicy !== 'cannot_authorize_p1b') {
      pushFinding(findings, 'blocker', 'p1b_drift_response_stale_policy_invalid', 'P1B drift response staleSnapshotPolicy must be cannot_authorize_p1b.', auditPath);
    }
    if (typeof plan.requiredRefreshPath !== 'string' || !plan.requiredRefreshPath.endsWith('p1b_dirty_overlap_snapshot_refresh_audit.json')) {
      pushFinding(findings, 'blocker', 'p1b_drift_response_refresh_path_invalid', 'P1B drift response required refresh path is invalid.', auditPath);
    }
    if (typeof plan.freshReadReceiptPath !== 'string' || !plan.freshReadReceiptPath.endsWith('p1b_dirty_overlap_fresh_read_receipt.json')) {
      pushFinding(findings, 'blocker', 'p1b_drift_response_fresh_read_path_invalid', 'P1B drift response fresh-read receipt path is invalid.', auditPath);
    }
    if (typeof plan.p1bApprovalReceiptPath !== 'string' || !plan.p1bApprovalReceiptPath.endsWith('p1b_dev_target_isolation_approval_receipt.json')) {
      pushFinding(findings, 'blocker', 'p1b_drift_response_approval_path_invalid', 'P1B drift response P1B approval receipt path is invalid.', auditPath);
    }
    const refreshSteps = Array.isArray(plan.refreshSteps) ? plan.refreshSteps as unknown[] : [];
    const forbiddenActions = Array.isArray(plan.forbiddenActions) ? plan.forbiddenActions as unknown[] : [];
    const acceptanceCriteria = Array.isArray(plan.acceptanceCriteria) ? plan.acceptanceCriteria as unknown[] : [];
    if (refreshSteps.length !== 8 || !refreshSteps.some((entry) => typeof entry === 'string' && entry.includes('re-read app/(tabs)/settings.tsx'))) {
      pushFinding(findings, 'blocker', 'p1b_drift_response_steps_invalid', 'P1B drift response must include eight refresh steps including re-read settings.tsx.', auditPath);
    }
    if (forbiddenActions.length !== 6 || !forbiddenActions.some((entry) => typeof entry === 'string' && entry.includes('old dirty-overlap snapshot'))) {
      pushFinding(findings, 'blocker', 'p1b_drift_response_forbidden_invalid', 'P1B drift response must include six forbidden actions including old snapshot rejection.', auditPath);
    }
    if (acceptanceCriteria.length !== 7 || !acceptanceCriteria.some((entry) => typeof entry === 'string' && entry.includes('Fresh-read receipt'))) {
      pushFinding(findings, 'blocker', 'p1b_drift_response_acceptance_invalid', 'P1B drift response must include seven acceptance criteria including fresh-read receipt.', auditPath);
    }
  }

  for (const forbidden of [
    'app/study_target.ts',
    'app/target_storage_keys.ts',
    'tests/gustav_surface_target_switch.test.ts',
    'tests/gustav_target_storage_keys.test.ts',
  ]) {
    if (fs.existsSync(path.join(repoRoot, forbidden)) && shouldBlockP1APreApplyFilePresence(repoRoot, forbidden)) {
      pushFinding(findings, 'blocker', 'p1b_drift_response_forbidden_file_exists', `P1A planned production/test file exists before approval: ${forbidden}`, auditPath);
    }
  }
  for (const required of [
    path.join(runDir, 'audits', 'p1b_dirty_overlap_drift_response_audit.md'),
    path.join(runDir, 'audits', 'p1b_dirty_overlap_drift_response', 'README.md'),
  ]) {
    if (!fs.existsSync(required)) {
      pushFinding(findings, 'blocker', 'p1b_drift_response_markdown_missing', `P1B dirty-overlap drift response markdown report is missing: ${path.relative(runDir, required)}`, auditPath);
    }
  }
  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'p1b_drift_response_findings_missing', 'P1B dirty-overlap drift response findings must be an array.', auditPath);
  }
  if (audit.status === 'PASS' && (
    summary.blockers !== 0 ||
    summary.dirtyOverlapFiles !== 1 ||
    summary.driftedDirtyOverlapFiles !== 1 ||
    summary.refreshSteps !== 8 ||
    summary.forbiddenActions !== 6 ||
    summary.acceptanceCriteria !== 7 ||
    summary.driftResponsePlanReady !== true ||
    summary.oldSnapshotMayAuthorizeP1B !== false ||
    summary.snapshotRefreshRequiredBeforeP1B !== true ||
    summary.freshReadReceiptRequiredAfterApproval !== true ||
    summary.exactP1BApprovalRequired !== true ||
    summary.canStartP1BNow !== false ||
    summary.canApplyNow !== false ||
    summary.mayStartFrenchGeneration !== false ||
    summary.mayModifyProductionAppFiles !== false ||
    summary.productionFilesStillAbsent !== true
  )) {
    pushFinding(findings, 'blocker', 'p1b_drift_response_pass_with_gaps', 'P1B dirty-overlap drift response cannot be PASS while drift gaps remain or safety flags are open.', auditPath);
  }
}

function validateP1BDirtyOverlapSnapshotRefreshContractAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'p1b_dirty_overlap_snapshot_refresh_contract_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const repoRoot = path.resolve(runDir, '..', '..', '..', '..');
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-p1b-dirty-overlap-snapshot-refresh-contract-audit-v0') {
    pushFinding(findings, 'blocker', 'p1b_snapshot_refresh_contract_schema_version', 'P1B snapshot refresh contract schemaVersion must be gustav-p1b-dirty-overlap-snapshot-refresh-contract-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'p1b_snapshot_refresh_contract_run_id_mismatch', `P1B snapshot refresh contract runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'p1b_snapshot_refresh_contract_status_invalid', `P1B snapshot refresh contract status is invalid: ${status}`, auditPath);
  } else if (status !== 'PASS') {
    pushFinding(findings, 'blocker', 'p1b_snapshot_refresh_contract_status_not_pass', 'P1B snapshot refresh contract must be PASS before it can be accepted.', auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'p1b_snapshot_refresh_contract_summary_missing', 'P1B snapshot refresh contract summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'canonicalRefreshAuditPaths',
    'requiredFields',
    'rejectionRules',
    'refreshProbes',
    'rejectedRefreshProbes',
    'blockers',
    'warnings',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'p1b_snapshot_refresh_contract_summary_number_missing', `P1B snapshot refresh contract summary.${key} must be a number.`, auditPath);
    }
  }
  for (const key of [
    'contractReady',
    'refreshAuditPresent',
    'currentWorkingTreeHashRecorded',
    'snapshotHashDriftDetected',
    'refreshRequiresExactP1BApproval',
    'refreshRequiresPostApprovalRead',
    'refreshRequiresFreshReadReceiptPair',
    'refreshAuditAloneMayAuthorizeP1B',
    'canStartP1BNow',
    'canApplyNow',
    'mayStartFrenchGeneration',
    'mayModifyProductionAppFiles',
    'productionFilesStillAbsent',
  ]) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'p1b_snapshot_refresh_contract_summary_boolean_missing', `P1B snapshot refresh contract summary.${key} must be boolean.`, auditPath);
    }
  }

  const current = audit.currentDirtyOverlap && typeof audit.currentDirtyOverlap === 'object'
    ? audit.currentDirtyOverlap as Record<string, unknown>
    : null;
  if (!current) {
    pushFinding(findings, 'blocker', 'p1b_snapshot_refresh_contract_current_missing', 'P1B snapshot refresh contract must include currentDirtyOverlap.', auditPath);
  } else {
    const hashPattern = /^[a-f0-9]{64}$/;
    if (
      current.filePath !== 'app/(tabs)/settings.tsx' ||
      current.gitStatus !== ' M' ||
      current.exists !== true ||
      typeof current.previousSnapshotWorkingTreeSha256 !== 'string' ||
      typeof current.currentWorkingTreeSha256 !== 'string' ||
      !hashPattern.test(current.previousSnapshotWorkingTreeSha256) ||
      !hashPattern.test(current.currentWorkingTreeSha256) ||
      current.previousSnapshotWorkingTreeSha256 === current.currentWorkingTreeSha256 ||
      current.hashDriftDetected !== true
    ) {
      pushFinding(findings, 'blocker', 'p1b_snapshot_refresh_contract_current_invalid', 'P1B snapshot refresh contract currentDirtyOverlap must prove modified settings.tsx has hash drift.', auditPath);
    }
    for (const key of ['currentBytes', 'currentLineCount']) {
      if (typeof current[key] !== 'number' || Number(current[key]) <= 0) {
        pushFinding(findings, 'blocker', 'p1b_snapshot_refresh_contract_current_number_invalid', `P1B snapshot refresh currentDirtyOverlap.${key} must be a positive number.`, auditPath);
      }
    }
  }

  const contract = audit.snapshotRefreshContract && typeof audit.snapshotRefreshContract === 'object'
    ? audit.snapshotRefreshContract as Record<string, unknown>
    : null;
  if (!contract) {
    pushFinding(findings, 'blocker', 'p1b_snapshot_refresh_contract_missing', 'P1B snapshot refresh contract must include snapshotRefreshContract.', auditPath);
  } else {
    if (contract.lockState !== 'locked_until_snapshot_refresh_after_exact_p1b_approval') {
      pushFinding(findings, 'blocker', 'p1b_snapshot_refresh_contract_lock_state_invalid', 'P1B snapshot refresh contract lockState is invalid.', auditPath);
    }
    if (typeof contract.canonicalRefreshAuditPath !== 'string' || !contract.canonicalRefreshAuditPath.endsWith('p1b_dirty_overlap_snapshot_refresh_audit.json')) {
      pushFinding(findings, 'blocker', 'p1b_snapshot_refresh_contract_path_invalid', 'P1B snapshot refresh canonical path is invalid.', auditPath);
    }
    if (contract.dirtyOverlapFile !== 'app/(tabs)/settings.tsx') {
      pushFinding(findings, 'blocker', 'p1b_snapshot_refresh_contract_file_invalid', 'P1B snapshot refresh dirtyOverlapFile is invalid.', auditPath);
    }
    if (typeof contract.linkedP1BApprovalReceiptPath !== 'string' || !contract.linkedP1BApprovalReceiptPath.endsWith('p1b_dev_target_isolation_approval_receipt.json')) {
      pushFinding(findings, 'blocker', 'p1b_snapshot_refresh_contract_approval_path_invalid', 'P1B snapshot refresh must link the exact P1B approval receipt path.', auditPath);
    }
    if (typeof contract.pairedFreshReadReceiptPath !== 'string' || !contract.pairedFreshReadReceiptPath.endsWith('p1b_dirty_overlap_fresh_read_receipt.json')) {
      pushFinding(findings, 'blocker', 'p1b_snapshot_refresh_contract_fresh_read_path_invalid', 'P1B snapshot refresh must pair with the fresh-read receipt path.', auditPath);
    }
    const fields = Array.isArray(contract.requiredFields) ? contract.requiredFields as Array<Record<string, unknown>> : null;
    const expectedFields = [
      'schemaVersion',
      'runId',
      'approvedSlice',
      'filePath',
      'linkedP1BApprovalReceiptPath',
      'pairedFreshReadReceiptPath',
      'previousSnapshotWorkingTreeSha256',
      'refreshedWorkingTreeSha256',
      'refreshedGitStatus',
      'refreshedBytes',
      'refreshedLineCount',
      'hashDriftFromPreviousSnapshot',
      'refreshedAfterApproval',
      'refreshedAt',
    ];
    if (!fields || fields.length !== expectedFields.length) {
      pushFinding(findings, 'blocker', 'p1b_snapshot_refresh_contract_fields_invalid', 'P1B snapshot refresh contract must define exactly fourteen required fields.', auditPath);
    } else {
      for (const [index, expected] of expectedFields.entries()) {
        const field = fields[index] || {};
        if (field.name !== expected || field.required !== true || typeof field.expected !== 'string') {
          pushFinding(findings, 'blocker', 'p1b_snapshot_refresh_contract_field_shape_invalid', `P1B snapshot refresh required field ${expected} is invalid.`, auditPath);
        }
      }
    }
    const shape = contract.acceptedRefreshShape && typeof contract.acceptedRefreshShape === 'object'
      ? contract.acceptedRefreshShape as Record<string, unknown>
      : null;
    if (!shape) {
      pushFinding(findings, 'blocker', 'p1b_snapshot_refresh_contract_shape_missing', 'P1B snapshot refresh contract must include acceptedRefreshShape.', auditPath);
    } else {
      const hashPattern = /^[a-f0-9]{64}$/;
      if (
        shape.schemaVersion !== 'gustav-p1b-dirty-overlap-snapshot-refresh-audit-v0' ||
        (runId && shape.runId !== runId) ||
        shape.approvedSlice !== 'P1B_DEV_TARGET_ISOLATION' ||
        shape.filePath !== 'app/(tabs)/settings.tsx' ||
        typeof shape.linkedP1BApprovalReceiptPath !== 'string' ||
        !shape.linkedP1BApprovalReceiptPath.endsWith('p1b_dev_target_isolation_approval_receipt.json') ||
        typeof shape.pairedFreshReadReceiptPath !== 'string' ||
        !shape.pairedFreshReadReceiptPath.endsWith('p1b_dirty_overlap_fresh_read_receipt.json') ||
        typeof shape.previousSnapshotWorkingTreeSha256 !== 'string' ||
        typeof shape.refreshedWorkingTreeSha256 !== 'string' ||
        !hashPattern.test(shape.previousSnapshotWorkingTreeSha256) ||
        !hashPattern.test(shape.refreshedWorkingTreeSha256) ||
        shape.previousSnapshotWorkingTreeSha256 === shape.refreshedWorkingTreeSha256 ||
        shape.refreshedGitStatus !== ' M' ||
        typeof shape.refreshedBytes !== 'number' ||
        typeof shape.refreshedLineCount !== 'number' ||
        shape.hashDriftFromPreviousSnapshot !== true ||
        shape.refreshedAfterApproval !== true ||
        shape.refreshedAt !== 'ISO-8601 timestamp'
      ) {
        pushFinding(findings, 'blocker', 'p1b_snapshot_refresh_contract_shape_invalid', 'P1B snapshot refresh accepted shape is invalid.', auditPath);
      }
    }
    const rejectionPolicy = Array.isArray(contract.rejectionPolicy) ? contract.rejectionPolicy as unknown[] : [];
    if (rejectionPolicy.length !== 7 || !rejectionPolicy.some((entry) => typeof entry === 'string' && entry.includes('refresh audit alone'))) {
      pushFinding(findings, 'blocker', 'p1b_snapshot_refresh_contract_rejection_policy_invalid', 'P1B snapshot refresh contract must include seven rejection rules including refresh-alone rejection.', auditPath);
    }
  }

  const probes = Array.isArray(audit.refreshProbes) ? audit.refreshProbes as Array<Record<string, unknown>> : null;
  if (!probes) {
    pushFinding(findings, 'blocker', 'p1b_snapshot_refresh_contract_probes_missing', 'P1B snapshot refresh contract refreshProbes must be an array.', auditPath);
  } else {
    const rejected = probes.filter((probe) => probe.wouldAuthorizeP1B === false).length;
    if (summary.refreshProbes !== probes.length || summary.rejectedRefreshProbes !== rejected) {
      pushFinding(findings, 'blocker', 'p1b_snapshot_refresh_contract_summary_probe_mismatch', 'P1B snapshot refresh summary counts must match refreshProbes.', auditPath);
    }
    const requiredIds = ['NO-REFRESH-AUDIT', 'REFRESH-WRONG-PATH', 'REFRESH-BEFORE-APPROVAL', 'REFRESH-WRONG-FILE', 'REFRESH-NO-FRESH-READ-PAIR', 'FUTURE-REFRESH-WITH-FRESH-READ'];
    for (const id of requiredIds) {
      if (!probes.some((probe) => probe.id === id)) {
        pushFinding(findings, 'blocker', 'p1b_snapshot_refresh_contract_probe_missing', `P1B snapshot refresh contract missing probe ${id}.`, auditPath);
      }
    }
    for (const probe of probes) {
      const id = typeof probe.id === 'string' ? probe.id : '';
      if (!id || typeof probe.description !== 'string') {
        pushFinding(findings, 'blocker', 'p1b_snapshot_refresh_contract_probe_shape_invalid', 'P1B snapshot refresh probe must include id and description.', auditPath);
      }
      for (const key of ['refreshPathAccepted', 'linkedP1BApproval', 'filePathMatches', 'currentHashRecorded', 'afterApproval', 'pairedFreshReadReceipt', 'wouldAuthorizeP1B', 'expectedAuthorizeP1B']) {
        if (typeof probe[key] !== 'boolean') {
          pushFinding(findings, 'blocker', 'p1b_snapshot_refresh_contract_probe_boolean_missing', `P1B snapshot refresh probe ${id || '<unknown>'}.${key} must be boolean.`, auditPath);
        }
      }
      if (!Array.isArray(probe.rejectionReasons)) {
        pushFinding(findings, 'blocker', 'p1b_snapshot_refresh_contract_probe_reasons_missing', `P1B snapshot refresh probe ${id || '<unknown>'} must include rejectionReasons.`, auditPath);
      }
      if (probe.wouldAuthorizeP1B !== probe.expectedAuthorizeP1B) {
        pushFinding(findings, 'blocker', 'p1b_snapshot_refresh_contract_probe_expectation_mismatch', `P1B snapshot refresh probe ${id || '<unknown>'} result must match expectedAuthorizeP1B.`, auditPath);
      }
    }
  }

  for (const forbidden of [
    'app/study_target.ts',
    'app/target_storage_keys.ts',
    'tests/gustav_surface_target_switch.test.ts',
    'tests/gustav_target_storage_keys.test.ts',
  ]) {
    if (fs.existsSync(path.join(repoRoot, forbidden)) && shouldBlockP1APreApplyFilePresence(repoRoot, forbidden)) {
      pushFinding(findings, 'blocker', 'p1b_snapshot_refresh_contract_forbidden_file_exists', `P1A planned production/test file exists before approval: ${forbidden}`, auditPath);
    }
  }
  for (const required of [
    path.join(runDir, 'audits', 'p1b_dirty_overlap_snapshot_refresh_contract_audit.md'),
    path.join(runDir, 'audits', 'p1b_dirty_overlap_snapshot_refresh_contract', 'README.md'),
  ]) {
    if (!fs.existsSync(required)) {
      pushFinding(findings, 'blocker', 'p1b_snapshot_refresh_contract_markdown_missing', `P1B snapshot refresh contract markdown report is missing: ${path.relative(runDir, required)}`, auditPath);
    }
  }
  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'p1b_snapshot_refresh_contract_findings_missing', 'P1B snapshot refresh contract findings must be an array.', auditPath);
  }
  if (audit.status === 'PASS' && (
    summary.blockers !== 0 ||
    summary.canonicalRefreshAuditPaths !== 1 ||
    summary.requiredFields !== 14 ||
    summary.rejectionRules !== 7 ||
    summary.refreshProbes !== 6 ||
    summary.rejectedRefreshProbes !== 5 ||
    summary.contractReady !== true ||
    summary.refreshAuditPresent !== false ||
    summary.currentWorkingTreeHashRecorded !== true ||
    summary.snapshotHashDriftDetected !== true ||
    summary.refreshRequiresExactP1BApproval !== true ||
    summary.refreshRequiresPostApprovalRead !== true ||
    summary.refreshRequiresFreshReadReceiptPair !== true ||
    summary.refreshAuditAloneMayAuthorizeP1B !== false ||
    summary.canStartP1BNow !== false ||
    summary.canApplyNow !== false ||
    summary.mayStartFrenchGeneration !== false ||
    summary.mayModifyProductionAppFiles !== false ||
    summary.productionFilesStillAbsent !== true
  )) {
    pushFinding(findings, 'blocker', 'p1b_snapshot_refresh_contract_pass_with_gaps', 'P1B snapshot refresh contract cannot be PASS while contract gaps remain or safety flags are open.', auditPath);
  }
}

function validateP1BNarrowWriteTransactionContractAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'p1b_narrow_write_transaction_contract_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const repoRoot = path.resolve(runDir, '..', '..', '..', '..');
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-p1b-narrow-write-transaction-contract-audit-v0') {
    pushFinding(findings, 'blocker', 'p1b_transaction_contract_schema_version', 'P1B narrow write transaction contract schemaVersion must be gustav-p1b-narrow-write-transaction-contract-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'p1b_transaction_contract_run_id_mismatch', `P1B transaction contract runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'p1b_transaction_contract_status_invalid', `P1B transaction contract status is invalid: ${status}`, auditPath);
  } else if (status !== 'PASS') {
    pushFinding(findings, 'blocker', 'p1b_transaction_contract_status_not_pass', 'P1B transaction contract must be PASS before it can be accepted.', auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'p1b_transaction_contract_summary_missing', 'P1B transaction contract summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'allowedFiles',
    'dirtyOverlapFiles',
    'requiredReceipts',
    'requiredReceiptsPresent',
    'transactionStages',
    'forbiddenScopes',
    'rollbackRules',
    'verificationCommands',
    'blockers',
    'warnings',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'p1b_transaction_contract_summary_number_missing', `P1B transaction contract summary.${key} must be a number.`, auditPath);
    }
  }
  for (const key of [
    'contractReady',
    'onlyNarrowP1BAllowed',
    'allRequiredReceiptsPresent',
    'dirtyOverlapRequiresFreshRead',
    'routeSurfaceDeferred',
    'storageCloudDeferred',
    'frenchGenerationBlocked',
    'canStartP1BNow',
    'canApplyNow',
    'mayStartFrenchGeneration',
    'mayModifyProductionAppFiles',
    'productionFilesStillAbsent',
  ]) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'p1b_transaction_contract_summary_boolean_missing', `P1B transaction contract summary.${key} must be boolean.`, auditPath);
    }
  }

  const contract = audit.writeTransactionContract && typeof audit.writeTransactionContract === 'object'
    ? audit.writeTransactionContract as Record<string, unknown>
    : null;
  const expectedFiles = [
    'app/(tabs)/settings.tsx',
    'app/spanish_content_gate.ts',
    'app/study_target_lang_dev.ts',
    'components/StudyTargetContext.tsx',
  ];
  if (!contract) {
    pushFinding(findings, 'blocker', 'p1b_transaction_contract_missing', 'P1B transaction contract must include writeTransactionContract.', auditPath);
  } else {
    if (contract.lockState !== 'locked_until_p1b_receipts_and_refresh_complete') {
      pushFinding(findings, 'blocker', 'p1b_transaction_contract_lock_state_invalid', 'P1B transaction contract lockState is invalid.', auditPath);
    }
    if (contract.approvedSlice !== 'P1B_DEV_TARGET_ISOLATION') {
      pushFinding(findings, 'blocker', 'p1b_transaction_contract_slice_invalid', 'P1B transaction contract approvedSlice must be P1B_DEV_TARGET_ISOLATION.', auditPath);
    }
    const allowedFiles = Array.isArray(contract.allowedFiles) ? contract.allowedFiles as Array<Record<string, unknown>> : null;
    if (!allowedFiles || allowedFiles.length !== expectedFiles.length) {
      pushFinding(findings, 'blocker', 'p1b_transaction_contract_allowed_files_invalid', 'P1B transaction contract must include exactly four allowed files.', auditPath);
    } else {
      for (const [index, expected] of expectedFiles.entries()) {
        const file = allowedFiles[index] || {};
        if (
          file.filePath !== expected ||
          file.action !== 'guarded_edit_after_receipts' ||
          typeof file.dirtyOverlap !== 'boolean' ||
          typeof file.requiresFreshRead !== 'boolean'
        ) {
          pushFinding(findings, 'blocker', 'p1b_transaction_contract_file_shape_invalid', `P1B transaction file ${expected} has invalid shape.`, auditPath);
        }
      }
      const dirtyFiles = allowedFiles.filter((file) => file.dirtyOverlap === true);
      if (dirtyFiles.length !== 1 || dirtyFiles[0].filePath !== 'app/(tabs)/settings.tsx' || dirtyFiles[0].requiresFreshRead !== true) {
        pushFinding(findings, 'blocker', 'p1b_transaction_contract_dirty_file_invalid', 'P1B transaction must mark only settings.tsx as dirty and fresh-read required.', auditPath);
      }
    }
    const receipts = Array.isArray(contract.requiredReceipts) ? contract.requiredReceipts as Array<Record<string, unknown>> : null;
    if (!receipts || receipts.length !== 4) {
      pushFinding(findings, 'blocker', 'p1b_transaction_contract_receipts_invalid', 'P1B transaction contract must require exactly four receipts.', auditPath);
    } else {
      const requiredIds = ['p1a_apply_completion', 'p1b_exact_approval', 'p1b_snapshot_refresh', 'p1b_fresh_read'];
      for (const id of requiredIds) {
        if (!receipts.some((receipt) => receipt.id === id && typeof receipt.filePath === 'string' && receipt.present === false && receipt.requiredBefore === 'p1b_write')) {
          pushFinding(findings, 'blocker', 'p1b_transaction_contract_receipt_missing', `P1B transaction missing locked receipt ${id}.`, auditPath);
        }
      }
    }
    const transactionStages = Array.isArray(contract.transactionStages) ? contract.transactionStages as unknown[] : [];
    const forbiddenScopes = Array.isArray(contract.forbiddenScopes) ? contract.forbiddenScopes as unknown[] : [];
    const rollbackRules = Array.isArray(contract.rollbackRules) ? contract.rollbackRules as unknown[] : [];
    const verificationCommands = Array.isArray(contract.verificationCommands) ? contract.verificationCommands as unknown[] : [];
    if (transactionStages.length !== 9 || !transactionStages.some((stage) => typeof stage === 'string' && stage.includes('Verify exact P1B approval'))) {
      pushFinding(findings, 'blocker', 'p1b_transaction_contract_stages_invalid', 'P1B transaction contract must include nine stages including exact approval verification.', auditPath);
    }
    if (forbiddenScopes.length !== 7 || !forbiddenScopes.includes('French content generation') || !forbiddenScopes.includes('any file outside the four-file P1B slice')) {
      pushFinding(findings, 'blocker', 'p1b_transaction_contract_forbidden_scopes_invalid', 'P1B transaction contract must include seven forbidden scopes including French generation and outside-file writes.', auditPath);
    }
    if (rollbackRules.length !== 6 || !rollbackRules.some((rule) => typeof rule === 'string' && rule.includes('Never revert user-owned dirty work'))) {
      pushFinding(findings, 'blocker', 'p1b_transaction_contract_rollback_invalid', 'P1B transaction contract must include six rollback rules including user-owned dirty work preservation.', auditPath);
    }
    if (verificationCommands.length !== 3 || !verificationCommands.some((command) => typeof command === 'string' && command.includes('gustav_validate_run.js'))) {
      pushFinding(findings, 'blocker', 'p1b_transaction_contract_verification_invalid', 'P1B transaction contract must include three verification commands including run validator.', auditPath);
    }
  }

  for (const forbidden of [
    'app/study_target.ts',
    'app/target_storage_keys.ts',
    'tests/gustav_surface_target_switch.test.ts',
    'tests/gustav_target_storage_keys.test.ts',
  ]) {
    if (fs.existsSync(path.join(repoRoot, forbidden)) && shouldBlockP1APreApplyFilePresence(repoRoot, forbidden)) {
      pushFinding(findings, 'blocker', 'p1b_transaction_contract_forbidden_file_exists', `P1A planned production/test file exists before approval: ${forbidden}`, auditPath);
    }
  }
  for (const required of [
    path.join(runDir, 'audits', 'p1b_narrow_write_transaction_contract_audit.md'),
    path.join(runDir, 'audits', 'p1b_narrow_write_transaction_contract', 'README.md'),
  ]) {
    if (!fs.existsSync(required)) {
      pushFinding(findings, 'blocker', 'p1b_transaction_contract_markdown_missing', `P1B transaction contract markdown report is missing: ${path.relative(runDir, required)}`, auditPath);
    }
  }
  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'p1b_transaction_contract_findings_missing', 'P1B transaction contract findings must be an array.', auditPath);
  }
  if (audit.status === 'PASS' && (
    summary.blockers !== 0 ||
    summary.allowedFiles !== 4 ||
    summary.dirtyOverlapFiles !== 1 ||
    summary.requiredReceipts !== 4 ||
    summary.requiredReceiptsPresent !== 0 ||
    summary.transactionStages !== 9 ||
    summary.forbiddenScopes !== 7 ||
    summary.rollbackRules !== 6 ||
    summary.verificationCommands !== 3 ||
    summary.contractReady !== true ||
    summary.onlyNarrowP1BAllowed !== true ||
    summary.allRequiredReceiptsPresent !== false ||
    summary.dirtyOverlapRequiresFreshRead !== true ||
    summary.routeSurfaceDeferred !== true ||
    summary.storageCloudDeferred !== true ||
    summary.frenchGenerationBlocked !== true ||
    summary.canStartP1BNow !== false ||
    summary.canApplyNow !== false ||
    summary.mayStartFrenchGeneration !== false ||
    summary.mayModifyProductionAppFiles !== false ||
    summary.productionFilesStillAbsent !== true
  )) {
    pushFinding(findings, 'blocker', 'p1b_transaction_contract_pass_with_gaps', 'P1B transaction contract cannot be PASS while transaction gaps remain or safety flags are open.', auditPath);
  }
}

function validateP1BPostWriteProofContractAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'p1b_post_write_proof_contract_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const repoRoot = path.resolve(runDir, '..', '..', '..', '..');
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-p1b-post-write-proof-contract-audit-v0') {
    pushFinding(findings, 'blocker', 'p1b_post_write_proof_contract_schema_version', 'P1B post-write proof contract schemaVersion must be gustav-p1b-post-write-proof-contract-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'p1b_post_write_proof_contract_run_id_mismatch', `P1B post-write proof contract runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'p1b_post_write_proof_contract_status_invalid', `P1B post-write proof contract status is invalid: ${status}`, auditPath);
  } else if (status !== 'PASS') {
    pushFinding(findings, 'blocker', 'p1b_post_write_proof_contract_status_not_pass', 'P1B post-write proof contract must be PASS before it can be accepted.', auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'p1b_post_write_proof_contract_summary_missing', 'P1B post-write proof contract summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'allowedFiles',
    'requiredFields',
    'rejectionRules',
    'proofProbes',
    'rejectedProofProbes',
    'verificationCommands',
    'blockers',
    'warnings',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'p1b_post_write_proof_contract_summary_number_missing', `P1B post-write proof contract summary.${key} must be a number.`, auditPath);
    }
  }
  for (const key of [
    'contractReady',
    'postWriteProofPresent',
    'proofRequiresExactReceiptChain',
    'proofRequiresChangedFilesSubset',
    'proofRequiresPrePostHashes',
    'proofRequiresUserDirtyPreservation',
    'proofRequiresFrenchGenerationBlocked',
    'proofAloneMayAuthorizeFrenchGeneration',
    'proofRequiredBeforeP1BCompletion',
    'canStartP1BNow',
    'canApplyNow',
    'mayStartFrenchGeneration',
    'mayModifyProductionAppFiles',
    'productionFilesStillAbsent',
  ]) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'p1b_post_write_proof_contract_summary_boolean_missing', `P1B post-write proof contract summary.${key} must be boolean.`, auditPath);
    }
  }

  const contract = audit.postWriteProofContract && typeof audit.postWriteProofContract === 'object'
    ? audit.postWriteProofContract as Record<string, unknown>
    : null;
  const expectedFiles = [
    'app/(tabs)/settings.tsx',
    'app/spanish_content_gate.ts',
    'app/study_target_lang_dev.ts',
    'components/StudyTargetContext.tsx',
  ];
  const expectedFields = [
    'schemaVersion',
    'runId',
    'approvedSlice',
    'executedAt',
    'approvedFiles',
    'changedFiles',
    'preEditHashes',
    'postEditHashes',
    'gitDiffNameOnly',
    'receiptChain',
    'dirtyOverlapFreshReadReceiptPath',
    'dirtyOverlapSnapshotRefreshAuditPath',
    'p1bApprovalReceiptPath',
    'p1aApplyCompletionReceiptPath',
    'verificationCommands',
    'verificationResults',
    'userOwnedDirtyFilesPreserved',
    'frenchGenerationStarted',
  ];
  if (!contract) {
    pushFinding(findings, 'blocker', 'p1b_post_write_proof_contract_missing', 'P1B post-write proof contract must include postWriteProofContract.', auditPath);
  } else {
    if (contract.lockState !== 'locked_until_p1b_transaction_executed_and_verified') {
      pushFinding(findings, 'blocker', 'p1b_post_write_proof_contract_lock_state_invalid', 'P1B post-write proof contract lockState is invalid.', auditPath);
    }
    if (typeof contract.canonicalProofPath !== 'string' || !contract.canonicalProofPath.endsWith('apply_plan/p1b_post_write_proof.json')) {
      pushFinding(findings, 'blocker', 'p1b_post_write_proof_contract_path_invalid', 'P1B post-write proof canonical path is invalid.', auditPath);
    }
    if (contract.approvedSlice !== 'P1B_DEV_TARGET_ISOLATION') {
      pushFinding(findings, 'blocker', 'p1b_post_write_proof_contract_slice_invalid', 'P1B post-write proof approvedSlice must be P1B_DEV_TARGET_ISOLATION.', auditPath);
    }
    const allowedFiles = Array.isArray(contract.allowedFiles) ? contract.allowedFiles as unknown[] : [];
    if (allowedFiles.length !== expectedFiles.length || !expectedFiles.every((filePath, index) => allowedFiles[index] === filePath)) {
      pushFinding(findings, 'blocker', 'p1b_post_write_proof_contract_allowed_files_invalid', 'P1B post-write proof contract must include the exact four allowed files.', auditPath);
    }
    const requiredFields = Array.isArray(contract.requiredFields) ? contract.requiredFields as Array<Record<string, unknown>> : [];
    if (requiredFields.length !== expectedFields.length) {
      pushFinding(findings, 'blocker', 'p1b_post_write_proof_contract_required_fields_invalid', 'P1B post-write proof contract must define exactly eighteen required fields.', auditPath);
    } else {
      for (const [index, expected] of expectedFields.entries()) {
        const field = requiredFields[index] || {};
        if (field.name !== expected || field.required !== true || typeof field.expected !== 'string') {
          pushFinding(findings, 'blocker', 'p1b_post_write_proof_contract_field_shape_invalid', `P1B post-write proof field ${expected} is invalid.`, auditPath);
        }
      }
    }
    const shape = contract.acceptedProofShape && typeof contract.acceptedProofShape === 'object'
      ? contract.acceptedProofShape as Record<string, unknown>
      : null;
    if (!shape) {
      pushFinding(findings, 'blocker', 'p1b_post_write_proof_contract_shape_missing', 'P1B post-write proof contract must include acceptedProofShape.', auditPath);
    } else {
      const receiptChain = shape.receiptChain && typeof shape.receiptChain === 'object'
        ? shape.receiptChain as Record<string, unknown>
        : {};
      const shapeApprovedFiles = Array.isArray(shape.approvedFiles) ? shape.approvedFiles as unknown[] : [];
      const verificationCommands = Array.isArray(shape.verificationCommands) ? shape.verificationCommands as unknown[] : [];
      const verificationResults = Array.isArray(shape.verificationResults) ? shape.verificationResults as unknown[] : [];
      if (
        shape.schemaVersion !== 'gustav-p1b-post-write-proof-v0' ||
        shape.approvedSlice !== 'P1B_DEV_TARGET_ISOLATION' ||
        shape.userOwnedDirtyFilesPreserved !== true ||
        shape.frenchGenerationStarted !== false ||
        !expectedFiles.every((filePath, index) => shapeApprovedFiles[index] === filePath) ||
        !shape.preEditHashes ||
        typeof shape.preEditHashes !== 'object' ||
        !shape.postEditHashes ||
        typeof shape.postEditHashes !== 'object' ||
        verificationCommands.length !== 5 ||
        verificationResults.length !== 5 ||
        typeof receiptChain.p1aApplyCompletionReceiptPath !== 'string' ||
        !receiptChain.p1aApplyCompletionReceiptPath.endsWith('p1a_apply_completion_receipt.json') ||
        typeof receiptChain.p1bApprovalReceiptPath !== 'string' ||
        !receiptChain.p1bApprovalReceiptPath.endsWith('p1b_dev_target_isolation_approval_receipt.json') ||
        typeof receiptChain.dirtyOverlapSnapshotRefreshAuditPath !== 'string' ||
        !receiptChain.dirtyOverlapSnapshotRefreshAuditPath.endsWith('p1b_dirty_overlap_snapshot_refresh_audit.json') ||
        typeof receiptChain.dirtyOverlapFreshReadReceiptPath !== 'string' ||
        !receiptChain.dirtyOverlapFreshReadReceiptPath.endsWith('p1b_dirty_overlap_fresh_read_receipt.json')
      ) {
        pushFinding(findings, 'blocker', 'p1b_post_write_proof_contract_shape_invalid', 'P1B post-write proof accepted shape is invalid.', auditPath);
      }
    }
    const rejectionPolicy = Array.isArray(contract.rejectionPolicy) ? contract.rejectionPolicy as unknown[] : [];
    if (
      rejectionPolicy.length !== 9 ||
      !rejectionPolicy.some((rule) => typeof rule === 'string' && rule.includes('French generation')) ||
      !rejectionPolicy.some((rule) => typeof rule === 'string' && rule.includes('four-file P1B slice'))
    ) {
      pushFinding(findings, 'blocker', 'p1b_post_write_proof_contract_rejection_policy_invalid', 'P1B post-write proof contract must include nine rejection rules including French generation and outside-file rejection.', auditPath);
    }
    const verificationCommands = Array.isArray(contract.verificationCommands) ? contract.verificationCommands as unknown[] : [];
    if (
      verificationCommands.length !== 5 ||
      !verificationCommands.some((command) => typeof command === 'string' && command.includes('git diff --name-only')) ||
      !verificationCommands.some((command) => typeof command === 'string' && command.includes('gustav_readiness_gate.js')) ||
      !verificationCommands.some((command) => typeof command === 'string' && command.includes('gustav_validate_run.js'))
    ) {
      pushFinding(findings, 'blocker', 'p1b_post_write_proof_contract_verification_invalid', 'P1B post-write proof contract must include five verification commands including git diff, readiness and validator.', auditPath);
    }
  }

  const probes = Array.isArray(audit.proofProbes) ? audit.proofProbes as Array<Record<string, unknown>> : [];
  const rejected = probes.filter((probe) => probe.wouldAcceptPostWriteProof === false).length;
  if (probes.length !== 7 || rejected !== 6) {
    pushFinding(findings, 'blocker', 'p1b_post_write_proof_contract_probe_count_invalid', 'P1B post-write proof contract must include seven probes with six rejected probes.', auditPath);
  }
  for (const id of ['missing_proof', 'extra_file_touched', 'missing_hash_chain', 'missing_receipt_chain', 'verification_not_passed', 'french_generation_started', 'valid_post_write_proof']) {
    const probe = probes.find((entry) => entry.id === id);
    if (!probe) {
      pushFinding(findings, 'blocker', 'p1b_post_write_proof_contract_probe_missing', `P1B post-write proof contract missing probe ${id}.`, auditPath);
      continue;
    }
    for (const key of ['proofPathAccepted', 'approvedSliceMatches', 'changedFilesSubset', 'prePostHashesForAllChangedFiles', 'receiptsLinked', 'verificationPassed', 'userDirtyPreserved', 'frenchGenerationStayedBlocked', 'wouldAcceptPostWriteProof', 'expectedAcceptPostWriteProof']) {
      if (typeof probe[key] !== 'boolean') {
        pushFinding(findings, 'blocker', 'p1b_post_write_proof_contract_probe_boolean_missing', `P1B post-write proof probe ${id}.${key} must be boolean.`, auditPath);
      }
    }
    if (!Array.isArray(probe.rejectionReasons)) {
      pushFinding(findings, 'blocker', 'p1b_post_write_proof_contract_probe_reasons_missing', `P1B post-write proof probe ${id} must include rejectionReasons.`, auditPath);
    }
    if (probe.wouldAcceptPostWriteProof !== probe.expectedAcceptPostWriteProof) {
      pushFinding(findings, 'blocker', 'p1b_post_write_proof_contract_probe_expectation_mismatch', `P1B post-write proof probe ${id} result must match expectedAcceptPostWriteProof.`, auditPath);
    }
  }

  for (const forbidden of [
    'app/study_target.ts',
    'app/target_storage_keys.ts',
    'tests/gustav_surface_target_switch.test.ts',
    'tests/gustav_target_storage_keys.test.ts',
  ]) {
    if (fs.existsSync(path.join(repoRoot, forbidden)) && shouldBlockP1APreApplyFilePresence(repoRoot, forbidden)) {
      pushFinding(findings, 'blocker', 'p1b_post_write_proof_contract_forbidden_file_exists', `P1A planned production/test file exists before approval: ${forbidden}`, auditPath);
    }
  }
  for (const required of [
    path.join(runDir, 'audits', 'p1b_post_write_proof_contract_audit.md'),
    path.join(runDir, 'audits', 'p1b_post_write_proof_contract', 'README.md'),
  ]) {
    if (!fs.existsSync(required)) {
      pushFinding(findings, 'blocker', 'p1b_post_write_proof_contract_markdown_missing', `P1B post-write proof contract markdown report is missing: ${path.relative(runDir, required)}`, auditPath);
    }
  }
  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'p1b_post_write_proof_contract_findings_missing', 'P1B post-write proof contract findings must be an array.', auditPath);
  }
  if (audit.status === 'PASS' && (
    summary.blockers !== 0 ||
    summary.allowedFiles !== 4 ||
    summary.requiredFields !== 18 ||
    summary.rejectionRules !== 9 ||
    summary.proofProbes !== 7 ||
    summary.rejectedProofProbes !== 6 ||
    summary.verificationCommands !== 5 ||
    summary.contractReady !== true ||
    summary.postWriteProofPresent !== false ||
    summary.proofRequiresExactReceiptChain !== true ||
    summary.proofRequiresChangedFilesSubset !== true ||
    summary.proofRequiresPrePostHashes !== true ||
    summary.proofRequiresUserDirtyPreservation !== true ||
    summary.proofRequiresFrenchGenerationBlocked !== true ||
    summary.proofAloneMayAuthorizeFrenchGeneration !== false ||
    summary.proofRequiredBeforeP1BCompletion !== true ||
    summary.canStartP1BNow !== false ||
    summary.canApplyNow !== false ||
    summary.mayStartFrenchGeneration !== false ||
    summary.mayModifyProductionAppFiles !== false ||
    summary.productionFilesStillAbsent !== true
  )) {
    pushFinding(findings, 'blocker', 'p1b_post_write_proof_contract_pass_with_gaps', 'P1B post-write proof contract cannot be PASS while contract gaps remain or safety flags are open.', auditPath);
  }
}

function validateP1BPostWriteProofFirewallAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'p1b_post_write_proof_firewall_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const repoRoot = path.resolve(runDir, '..', '..', '..', '..');
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-p1b-post-write-proof-firewall-audit-v0') {
    pushFinding(findings, 'blocker', 'p1b_post_write_proof_firewall_schema_version', 'P1B post-write proof firewall schemaVersion must be gustav-p1b-post-write-proof-firewall-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'p1b_post_write_proof_firewall_run_id_mismatch', `P1B post-write proof firewall runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'p1b_post_write_proof_firewall_status_invalid', `P1B post-write proof firewall status is invalid: ${status}`, auditPath);
  } else if (status !== 'PASS') {
    pushFinding(findings, 'blocker', 'p1b_post_write_proof_firewall_status_not_pass', 'P1B post-write proof firewall must be PASS before it can be accepted.', auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'p1b_post_write_proof_firewall_summary_missing', 'P1B post-write proof firewall summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'realProofCandidates',
    'realProofsPresent',
    'exactProofMatches',
    'tempFixtures',
    'rejectedTempFixtures',
    'acceptedShapeFixtures',
    'tempExactShapeBlockedByPath',
    'outsideFileFixtures',
    'outsideFileFixturesRejected',
    'missingHashFixtures',
    'missingHashFixturesRejected',
    'missingReceiptFixtures',
    'missingReceiptFixturesRejected',
    'verificationFailureFixtures',
    'verificationFailureFixturesRejected',
    'frenchGenerationFixtures',
    'frenchGenerationFixturesRejected',
    'blockers',
    'warnings',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'p1b_post_write_proof_firewall_summary_number_missing', `P1B post-write proof firewall summary.${key} must be a number.`, auditPath);
    }
  }
  for (const key of [
    'firewallPassed',
    'requiresCanonicalProofPath',
    'requiresChangedFilesSubset',
    'requiresPrePostHashes',
    'requiresReceiptChain',
    'requiresVerificationPass',
    'requiresUserDirtyPreservation',
    'requiresFrenchGenerationBlocked',
    'postWriteProofStillMissing',
    'canStartP1BNow',
    'canApplyNow',
    'mayStartFrenchGeneration',
    'mayModifyProductionAppFiles',
    'productionFilesStillAbsent',
  ]) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'p1b_post_write_proof_firewall_summary_boolean_missing', `P1B post-write proof firewall summary.${key} must be boolean.`, auditPath);
    }
  }

  const firewall = audit.proofFirewall && typeof audit.proofFirewall === 'object'
    ? audit.proofFirewall as Record<string, unknown>
    : null;
  const expectedFiles = [
    'app/(tabs)/settings.tsx',
    'app/spanish_content_gate.ts',
    'app/study_target_lang_dev.ts',
    'components/StudyTargetContext.tsx',
  ];
  if (!firewall) {
    pushFinding(findings, 'blocker', 'p1b_post_write_proof_firewall_contract_missing', 'P1B post-write proof firewall must include proofFirewall.', auditPath);
  } else {
    if (typeof firewall.canonicalProofPath !== 'string' || !firewall.canonicalProofPath.endsWith('apply_plan/p1b_post_write_proof.json')) {
      pushFinding(findings, 'blocker', 'p1b_post_write_proof_firewall_path_invalid', 'P1B post-write proof firewall canonical path is invalid.', auditPath);
    }
    const acceptedProofPaths = Array.isArray(firewall.acceptedProofPaths) ? firewall.acceptedProofPaths as unknown[] : [];
    if (acceptedProofPaths.length !== 1 || typeof acceptedProofPaths[0] !== 'string' || !String(acceptedProofPaths[0]).endsWith('apply_plan/p1b_post_write_proof.json')) {
      pushFinding(findings, 'blocker', 'p1b_post_write_proof_firewall_accepted_paths_invalid', 'P1B post-write proof firewall must have exactly one accepted proof path.', auditPath);
    }
    if (firewall.approvedSlice !== 'P1B_DEV_TARGET_ISOLATION') {
      pushFinding(findings, 'blocker', 'p1b_post_write_proof_firewall_slice_invalid', 'P1B post-write proof firewall approvedSlice must be P1B_DEV_TARGET_ISOLATION.', auditPath);
    }
    const approvedFiles = Array.isArray(firewall.approvedFiles) ? firewall.approvedFiles as unknown[] : [];
    if (approvedFiles.length !== expectedFiles.length || !expectedFiles.every((filePath, index) => approvedFiles[index] === filePath)) {
      pushFinding(findings, 'blocker', 'p1b_post_write_proof_firewall_files_invalid', 'P1B post-write proof firewall must include the exact four approved files.', auditPath);
    }
    const rejectionOrder = Array.isArray(firewall.rejectionOrder) ? firewall.rejectionOrder as unknown[] : [];
    if (
      rejectionOrder.length !== 14 ||
      !rejectionOrder.includes('changed_files_outside_p1b_slice') ||
      !rejectionOrder.includes('missing_pre_post_hash_chain') ||
      !rejectionOrder.includes('french_generation_started') ||
      !rejectionOrder.includes('proof_path_not_accepted')
    ) {
      pushFinding(findings, 'blocker', 'p1b_post_write_proof_firewall_rejection_order_invalid', 'P1B post-write proof firewall must include fourteen ordered rejection reasons.', auditPath);
    }
  }

  const probes = Array.isArray(audit.proofProbes) ? audit.proofProbes as Array<Record<string, unknown>> : [];
  const realProbes = probes.filter((probe) => probe.source === 'real_candidate');
  const tempProbes = probes.filter((probe) => probe.source === 'temp_fixture');
  const rejectedTemp = tempProbes.filter((probe) => probe.wouldAcceptPostWriteProof === false).length;
  if (probes.length !== 12 || realProbes.length !== 1 || tempProbes.length !== 11 || rejectedTemp !== 11) {
    pushFinding(findings, 'blocker', 'p1b_post_write_proof_firewall_probe_count_invalid', 'P1B post-write proof firewall must include one real probe and eleven rejected temp probes.', auditPath);
  }
  for (const id of ['REAL-P1B-POST-WRITE-PROOF-JSON', 'TMP-IMPLICIT-DALSHE', 'TMP-WRONG-RUN', 'TMP-WRONG-SLICE', 'TMP-OUTSIDE-FILE', 'TMP-DIFF-MISMATCH', 'TMP-MISSING-HASH', 'TMP-MISSING-RECEIPT', 'TMP-FAILED-VERIFY', 'TMP-DIRTY-NOT-PRESERVED', 'TMP-FRENCH-STARTED', 'TMP-EXACT-SHAPE-WRONG-PATH']) {
    const probe = probes.find((entry) => entry.id === id);
    if (!probe) {
      pushFinding(findings, 'blocker', 'p1b_post_write_proof_firewall_probe_missing', `P1B post-write proof firewall missing probe ${id}.`, auditPath);
      continue;
    }
    for (const key of ['exists', 'parseableJson', 'schemaValid', 'runIdMatches', 'approvedSliceMatches', 'approvedFilesMatch', 'changedFilesSubset', 'changedFilesMatchDiff', 'prePostHashesPresent', 'receiptChainValid', 'verificationResultsPass', 'userDirtyPreserved', 'frenchGenerationBlocked', 'acceptedProofPath', 'wouldAcceptPostWriteProof', 'expectedAccept']) {
      if (typeof probe[key] !== 'boolean') {
        pushFinding(findings, 'blocker', 'p1b_post_write_proof_firewall_probe_boolean_missing', `P1B post-write proof probe ${id}.${key} must be boolean.`, auditPath);
      }
    }
    if (typeof probe.rejectionReason !== 'string') {
      pushFinding(findings, 'blocker', 'p1b_post_write_proof_firewall_probe_reason_missing', `P1B post-write proof probe ${id} must include rejectionReason.`, auditPath);
    }
    if (probe.wouldAcceptPostWriteProof !== probe.expectedAccept) {
      pushFinding(findings, 'blocker', 'p1b_post_write_proof_firewall_probe_expectation_mismatch', `P1B post-write proof probe ${id} result must match expectedAccept.`, auditPath);
    }
  }
  const exactShapeProbe = probes.find((probe) => probe.id === 'TMP-EXACT-SHAPE-WRONG-PATH');
  if (!exactShapeProbe || exactShapeProbe.rejectionReason !== 'proof_path_not_accepted' || exactShapeProbe.wouldAcceptPostWriteProof !== false) {
    pushFinding(findings, 'blocker', 'p1b_post_write_proof_firewall_exact_shape_invalid', 'Exact-shape temp proof must be rejected only by path.', auditPath);
  }

  for (const forbidden of [
    'app/study_target.ts',
    'app/target_storage_keys.ts',
    'tests/gustav_surface_target_switch.test.ts',
    'tests/gustav_target_storage_keys.test.ts',
  ]) {
    if (fs.existsSync(path.join(repoRoot, forbidden)) && shouldBlockP1APreApplyFilePresence(repoRoot, forbidden)) {
      pushFinding(findings, 'blocker', 'p1b_post_write_proof_firewall_forbidden_file_exists', `P1A planned production/test file exists before approval: ${forbidden}`, auditPath);
    }
  }
  for (const required of [
    path.join(runDir, 'audits', 'p1b_post_write_proof_firewall_audit.md'),
    path.join(runDir, 'audits', 'p1b_post_write_proof_firewall', 'README.md'),
  ]) {
    if (!fs.existsSync(required)) {
      pushFinding(findings, 'blocker', 'p1b_post_write_proof_firewall_markdown_missing', `P1B post-write proof firewall markdown report is missing: ${path.relative(runDir, required)}`, auditPath);
    }
  }
  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'p1b_post_write_proof_firewall_findings_missing', 'P1B post-write proof firewall findings must be an array.', auditPath);
  }
  if (audit.status === 'PASS' && (
    summary.blockers !== 0 ||
    summary.realProofCandidates !== 1 ||
    summary.realProofsPresent !== 0 ||
    summary.exactProofMatches !== 0 ||
    summary.tempFixtures !== 11 ||
    summary.rejectedTempFixtures !== 11 ||
    summary.acceptedShapeFixtures !== 1 ||
    summary.tempExactShapeBlockedByPath !== 1 ||
    summary.outsideFileFixturesRejected !== 1 ||
    summary.missingHashFixturesRejected !== 1 ||
    summary.missingReceiptFixturesRejected !== 1 ||
    summary.verificationFailureFixturesRejected !== 1 ||
    summary.frenchGenerationFixturesRejected !== 1 ||
    summary.firewallPassed !== true ||
    summary.requiresCanonicalProofPath !== true ||
    summary.requiresChangedFilesSubset !== true ||
    summary.requiresPrePostHashes !== true ||
    summary.requiresReceiptChain !== true ||
    summary.requiresVerificationPass !== true ||
    summary.requiresUserDirtyPreservation !== true ||
    summary.requiresFrenchGenerationBlocked !== true ||
    summary.postWriteProofStillMissing !== true ||
    summary.canStartP1BNow !== false ||
    summary.canApplyNow !== false ||
    summary.mayStartFrenchGeneration !== false ||
    summary.mayModifyProductionAppFiles !== false ||
    summary.productionFilesStillAbsent !== true
  )) {
    pushFinding(findings, 'blocker', 'p1b_post_write_proof_firewall_pass_with_gaps', 'P1B post-write proof firewall cannot be PASS while firewall gaps remain or safety flags are open.', auditPath);
  }
}

function validateTranslationStartGateAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'translation_start_gate_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-translation-start-gate-audit-v0') {
    pushFinding(findings, 'blocker', 'translation_start_gate_schema_version', 'Translation start gate schemaVersion must be gustav-translation-start-gate-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'translation_start_gate_run_id_mismatch', `Translation start gate runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'translation_start_gate_status_invalid', `Translation start gate status is invalid: ${status}`, auditPath);
  } else if (status !== 'PASS') {
    pushFinding(findings, 'blocker', 'translation_start_gate_status_not_pass', 'Translation start gate must be PASS before it can be accepted.', auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'translation_start_gate_summary_missing', 'Translation start gate summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'sourceLocales',
    'approvedSourceLocales',
    'translationDomains',
    'translationAgents',
    'blockedReadinessChecks',
    'generationBlockedReadinessChecks',
    'requiredPreTranslationGates',
    'forbiddenEarlyActions',
    'blockers',
    'warnings',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'translation_start_gate_summary_number_missing', `Translation start gate summary.${key} must be a number.`, auditPath);
    }
  }
  for (const key of [
    'sourceGraphApprovedForInput',
    'sourceGraphQualityPassed',
    'ruUkSourceLocaleCoveragePassed',
    'generatedContentAuditPresent',
    'targetIsolationReady',
    'researchPackRequired',
    'translationQueueReadyAfterArchitecture',
    'translationStartBlocked',
    'mayStartTranslationNow',
    'mayStartFrenchGeneration',
    'mayModifyProductionAppFiles',
    'noFrenchContentGenerated',
  ]) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'translation_start_gate_summary_boolean_missing', `Translation start gate summary.${key} must be boolean.`, auditPath);
    }
  }
  if (summary.targetStudyLanguage !== 'fr') {
    pushFinding(findings, 'blocker', 'translation_start_gate_target_invalid', 'Translation start gate targetStudyLanguage must be fr.', auditPath);
  }

  const scope = audit.translationScope && typeof audit.translationScope === 'object'
    ? audit.translationScope as Record<string, unknown>
    : null;
  if (!scope) {
    pushFinding(findings, 'blocker', 'translation_start_gate_scope_missing', 'Translation start gate must include translationScope.', auditPath);
  } else {
    const sourceLocales = Array.isArray(scope.sourceLocales) ? scope.sourceLocales as unknown[] : [];
    const unitPlans = Array.isArray(scope.unitPlans) ? scope.unitPlans as Array<Record<string, unknown>> : [];
    if (scope.targetStudyLanguage !== 'fr' || scope.baseStudyTarget !== 'en' || sourceLocales.length !== 2 || sourceLocales[0] !== 'ru' || sourceLocales[1] !== 'uk') {
      pushFinding(findings, 'blocker', 'translation_start_gate_scope_invalid', 'Translation start gate scope must target fr from RU/UK over EN base.', auditPath);
    }
    const expectedDomains = ['lessons', 'phrases', 'words', 'intro_screens', 'quizzes', 'preposition_packs', 'flashcards', 'daily_phrases', 'personal_practice'];
    if (unitPlans.length !== expectedDomains.length) {
      pushFinding(findings, 'blocker', 'translation_start_gate_unit_plan_count_invalid', 'Translation start gate must define nine translation unit domains.', auditPath);
    } else {
      for (const [index, expected] of expectedDomains.entries()) {
        const unit = unitPlans[index] || {};
        if (unit.domain !== expected || typeof unit.count !== 'number' || unit.count <= 0 || typeof unit.sourceGraphField !== 'string' || !Array.isArray(unit.requiredChecks)) {
          pushFinding(findings, 'blocker', 'translation_start_gate_unit_plan_invalid', `Translation unit plan ${expected} is invalid.`, auditPath);
        }
      }
    }
  }

  const blockedChecks = Array.isArray(audit.blockedReadinessChecks) ? audit.blockedReadinessChecks as Array<Record<string, unknown>> : [];
  if (blockedChecks.length !== summary.blockedReadinessChecks || blockedChecks.length < 10) {
    pushFinding(findings, 'blocker', 'translation_start_gate_blocked_checks_invalid', 'Translation start gate blockedReadinessChecks must match summary and include current HOLD failures.', auditPath);
  }
  const generationBlockedChecks = blockedChecks.filter((check) => Array.isArray(check.blocks) && (check.blocks as unknown[]).includes('generation'));
  if (generationBlockedChecks.length !== 8) {
    pushFinding(findings, 'blocker', 'translation_start_gate_generation_blockers_invalid', 'Translation start gate must record eight generation-blocking readiness checks.', auditPath);
  }
  const requiredGates = Array.isArray(audit.requiredPreTranslationGates) ? audit.requiredPreTranslationGates as unknown[] : [];
  if (requiredGates.length !== 8 || !requiredGates.some((gate) => typeof gate === 'string' && gate.includes('Research pack'))) {
    pushFinding(findings, 'blocker', 'translation_start_gate_required_gates_invalid', 'Translation start gate must include eight required pre-translation gates including research pack.', auditPath);
  }
  const forbiddenActions = Array.isArray(audit.forbiddenEarlyActions) ? audit.forbiddenEarlyActions as unknown[] : [];
  if (
    forbiddenActions.length !== 10 ||
    !forbiddenActions.includes('Generate French lesson files.') ||
    !forbiddenActions.includes('Translate phrases, words, quizzes, flashcards or My Practice nodes.')
  ) {
    pushFinding(findings, 'blocker', 'translation_start_gate_forbidden_actions_invalid', 'Translation start gate must include ten forbidden early actions including French file generation and translation.', auditPath);
  }
  const agents = Array.isArray(audit.translationAgents) ? audit.translationAgents as Array<Record<string, unknown>> : [];
  if (agents.length !== 8) {
    pushFinding(findings, 'blocker', 'translation_start_gate_agents_count_invalid', 'Translation start gate must define eight translation agents.', auditPath);
  } else {
    for (const agent of agents) {
      if (
        typeof agent.id !== 'string' ||
        typeof agent.department !== 'string' ||
        typeof agent.responsibility !== 'string' ||
        typeof agent.prompt !== 'string' ||
        String(agent.prompt).length < 80 ||
        agent.blocksIfMissing !== true
      ) {
        pushFinding(findings, 'blocker', 'translation_start_gate_agent_shape_invalid', 'Each translation agent must include id, department, responsibility, long prompt and blocksIfMissing=true.', auditPath);
      }
    }
  }
  const research = audit.researchPackContract && typeof audit.researchPackContract === 'object'
    ? audit.researchPackContract as Record<string, unknown>
    : null;
  if (!research) {
    pushFinding(findings, 'blocker', 'translation_start_gate_research_contract_missing', 'Translation start gate must include researchPackContract.', auditPath);
  } else {
    const sourcePolicy = Array.isArray(research.sourcePolicy) ? research.sourcePolicy as unknown[] : [];
    const comparisonPolicy = Array.isArray(research.comparisonPolicy) ? research.comparisonPolicy as unknown[] : [];
    if (research.required !== true || research.timing !== 'before_first_translation_batch' || sourcePolicy.length !== 3 || comparisonPolicy.length !== 3) {
      pushFinding(findings, 'blocker', 'translation_start_gate_research_contract_invalid', 'Translation start gate research contract must require source and comparison policies before first translation batch.', auditPath);
    }
  }
  for (const required of [
    path.join(runDir, 'audits', 'translation_start_gate_audit.md'),
    path.join(runDir, 'audits', 'translation_start_gate', 'README.md'),
  ]) {
    if (!fs.existsSync(required)) {
      pushFinding(findings, 'blocker', 'translation_start_gate_markdown_missing', `Translation start gate markdown report is missing: ${path.relative(runDir, required)}`, auditPath);
    }
  }
  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'translation_start_gate_findings_missing', 'Translation start gate findings must be an array.', auditPath);
  }
  if (audit.status === 'PASS' && (
    summary.blockers !== 0 ||
    summary.sourceLocales !== 2 ||
    summary.approvedSourceLocales !== 2 ||
    summary.translationDomains !== 9 ||
    summary.translationAgents !== 8 ||
    summary.generationBlockedReadinessChecks !== 8 ||
    summary.requiredPreTranslationGates !== 8 ||
    summary.forbiddenEarlyActions !== 10 ||
    summary.sourceGraphApprovedForInput !== true ||
    summary.sourceGraphQualityPassed !== true ||
    summary.ruUkSourceLocaleCoveragePassed !== true ||
    summary.generatedContentAuditPresent !== false ||
    summary.targetIsolationReady !== false ||
    summary.researchPackRequired !== true ||
    summary.translationQueueReadyAfterArchitecture !== true ||
    summary.translationStartBlocked !== true ||
    summary.mayStartTranslationNow !== false ||
    summary.mayStartFrenchGeneration !== false ||
    summary.mayModifyProductionAppFiles !== false ||
    summary.noFrenchContentGenerated !== true
  )) {
    pushFinding(findings, 'blocker', 'translation_start_gate_pass_with_gaps', 'Translation start gate cannot be PASS while translation safety flags are open or counts are wrong.', auditPath);
  }
}

function validateFrenchResearchPackContractAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'french_research_pack_contract_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-french-research-pack-contract-audit-v0') {
    pushFinding(findings, 'blocker', 'french_research_pack_contract_schema_version', 'French research pack contract schemaVersion must be gustav-french-research-pack-contract-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'french_research_pack_contract_run_id_mismatch', `French research pack contract runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'french_research_pack_contract_status_invalid', `French research pack contract status is invalid: ${status}`, auditPath);
  } else if (status !== 'PASS') {
    pushFinding(findings, 'blocker', 'french_research_pack_contract_status_not_pass', 'French research pack contract must be PASS before it can be accepted.', auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'french_research_pack_contract_summary_missing', 'French research pack contract summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'sourceLocales',
    'trustedSources',
    'officialOrPublisherSources',
    'grammarClusters',
    'requiredResearchFields',
    'crossChecks',
    'rejectedShortcutPolicies',
    'blockers',
    'warnings',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'french_research_pack_contract_summary_number_missing', `French research pack contract summary.${key} must be a number.`, auditPath);
    }
  }
  for (const key of [
    'translationStartGatePassed',
    'sourceGraphApprovedForInput',
    'researchPackPresent',
    'researchPackRequiredBeforeFirstBatch',
    'researchContractReady',
    'everyClusterHasTwoSources',
    'everyClusterRequiresRuUkComparison',
    'shortcutsRejected',
    'translationStartBlocked',
    'mayStartTranslationNow',
    'mayStartFrenchGeneration',
    'mayModifyProductionAppFiles',
    'noFrenchContentGenerated',
  ]) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'french_research_pack_contract_summary_boolean_missing', `French research pack contract summary.${key} must be boolean.`, auditPath);
    }
  }
  if (summary.targetStudyLanguage !== 'fr') {
    pushFinding(findings, 'blocker', 'french_research_pack_contract_target_invalid', 'French research pack contract targetStudyLanguage must be fr.', auditPath);
  }

  const contract = audit.researchPackContract && typeof audit.researchPackContract === 'object'
    ? audit.researchPackContract as Record<string, unknown>
    : null;
  if (!contract) {
    pushFinding(findings, 'blocker', 'french_research_pack_contract_missing', 'French research pack contract must include researchPackContract.', auditPath);
  } else {
    if (typeof contract.canonicalResearchPackPath !== 'string' || !contract.canonicalResearchPackPath.endsWith('research/fr_research_pack.json')) {
      pushFinding(findings, 'blocker', 'french_research_pack_contract_path_invalid', 'French research pack canonical path is invalid.', auditPath);
    }
    if (contract.targetStudyLanguage !== 'fr') {
      pushFinding(findings, 'blocker', 'french_research_pack_contract_scope_target_invalid', 'French research pack contract target must be fr.', auditPath);
    }
    const sourceLocales = Array.isArray(contract.sourceLocales) ? contract.sourceLocales as unknown[] : [];
    if (sourceLocales.length !== 2 || sourceLocales[0] !== 'ru' || sourceLocales[1] !== 'uk') {
      pushFinding(findings, 'blocker', 'french_research_pack_contract_source_locales_invalid', 'French research pack contract must use RU and UK source locales.', auditPath);
    }
    const sources = Array.isArray(contract.trustedSources) ? contract.trustedSources as Array<Record<string, unknown>> : [];
    if (sources.length !== 8) {
      pushFinding(findings, 'blocker', 'french_research_pack_contract_sources_count_invalid', 'French research pack contract must define eight trusted sources.', auditPath);
    } else {
      for (const source of sources) {
        if (
          typeof source.id !== 'string' ||
          typeof source.name !== 'string' ||
          typeof source.url !== 'string' ||
          !String(source.url).startsWith('https://') ||
          typeof source.sourceType !== 'string' ||
          !Array.isArray(source.requiredFor) ||
          (source.requiredFor as unknown[]).length === 0
        ) {
          pushFinding(findings, 'blocker', 'french_research_pack_contract_source_shape_invalid', 'Each trusted source must include id, name, https url, sourceType and requiredFor.', auditPath);
        }
      }
      for (const requiredSource of ['cambridge_en_fr_dictionary', 'oxford_french_usage_guide', 'larousse_fr_dictionary', 'le_robert_dictionary', 'bescherelle_conjugation', 'tv5monde_grammar', 'oqlf_vitrine_linguistique', 'academie_francaise_dire_ne_pas_dire']) {
        if (!sources.some((source) => source.id === requiredSource)) {
          pushFinding(findings, 'blocker', 'french_research_pack_contract_source_missing', `French research pack contract missing trusted source ${requiredSource}.`, auditPath);
        }
      }
    }
    const clusters = Array.isArray(contract.grammarClusters) ? contract.grammarClusters as Array<Record<string, unknown>> : [];
    if (clusters.length !== 12) {
      pushFinding(findings, 'blocker', 'french_research_pack_contract_clusters_count_invalid', 'French research pack contract must define twelve grammar clusters.', auditPath);
    } else {
      for (const cluster of clusters) {
        const requiredSourceIds = Array.isArray(cluster.requiredSourceIds) ? cluster.requiredSourceIds as unknown[] : [];
        const mustDecide = Array.isArray(cluster.mustDecide) ? cluster.mustDecide as unknown[] : [];
        if (typeof cluster.id !== 'string' || typeof cluster.title !== 'string' || requiredSourceIds.length < 2 || mustDecide.length < 4) {
          pushFinding(findings, 'blocker', 'french_research_pack_contract_cluster_shape_invalid', 'Each grammar cluster must include id, title, at least two sources and four decisions.', auditPath);
        }
      }
    }
    const fields = Array.isArray(contract.requiredResearchFields) ? contract.requiredResearchFields as unknown[] : [];
    if (fields.length !== 16 || !fields.includes('ruPromptSummary') || !fields.includes('ukPromptSummary') || !fields.includes('trustedSourceChecks')) {
      pushFinding(findings, 'blocker', 'french_research_pack_contract_fields_invalid', 'French research pack contract must include sixteen required fields including RU/UK summaries and trustedSourceChecks.', auditPath);
    }
    const crossChecks = Array.isArray(contract.crossChecks) ? contract.crossChecks as unknown[] : [];
    if (crossChecks.length !== 6 || !crossChecks.some((check) => typeof check === 'string' && check.includes('two trusted sources'))) {
      pushFinding(findings, 'blocker', 'french_research_pack_contract_cross_checks_invalid', 'French research pack contract must include six cross-checks including two-source checks.', auditPath);
    }
    const rejected = Array.isArray(contract.rejectedShortcutPolicies) ? contract.rejectedShortcutPolicies as unknown[] : [];
    if (rejected.length !== 7 || !rejected.some((policy) => typeof policy === 'string' && policy.includes('Do not translate directly'))) {
      pushFinding(findings, 'blocker', 'french_research_pack_contract_shortcuts_invalid', 'French research pack contract must reject seven shortcut policies.', auditPath);
    }
  }
  for (const required of [
    path.join(runDir, 'audits', 'french_research_pack_contract_audit.md'),
    path.join(runDir, 'audits', 'french_research_pack_contract', 'README.md'),
  ]) {
    if (!fs.existsSync(required)) {
      pushFinding(findings, 'blocker', 'french_research_pack_contract_markdown_missing', `French research pack contract markdown report is missing: ${path.relative(runDir, required)}`, auditPath);
    }
  }
  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'french_research_pack_contract_findings_missing', 'French research pack contract findings must be an array.', auditPath);
  }
  if (audit.status === 'PASS' && (
    summary.blockers !== 0 ||
    summary.sourceLocales !== 2 ||
    summary.trustedSources !== 8 ||
    summary.officialOrPublisherSources !== 8 ||
    summary.grammarClusters !== 12 ||
    summary.requiredResearchFields !== 16 ||
    summary.crossChecks !== 6 ||
    summary.rejectedShortcutPolicies !== 7 ||
    summary.translationStartGatePassed !== true ||
    summary.sourceGraphApprovedForInput !== true ||
    summary.researchPackPresent !== false ||
    summary.researchPackRequiredBeforeFirstBatch !== true ||
    summary.researchContractReady !== true ||
    summary.everyClusterHasTwoSources !== true ||
    summary.everyClusterRequiresRuUkComparison !== true ||
    summary.shortcutsRejected !== true ||
    summary.translationStartBlocked !== true ||
    summary.mayStartTranslationNow !== false ||
    summary.mayStartFrenchGeneration !== false ||
    summary.mayModifyProductionAppFiles !== false ||
    summary.noFrenchContentGenerated !== true
  )) {
    pushFinding(findings, 'blocker', 'french_research_pack_contract_pass_with_gaps', 'French research pack contract cannot be PASS while research safety flags are open or counts are wrong.', auditPath);
  }
}

function validateFrenchResearchPackFirewallAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'french_research_pack_firewall_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-french-research-pack-firewall-audit-v0') {
    pushFinding(findings, 'blocker', 'french_research_pack_firewall_schema_version', 'French research pack firewall schemaVersion must be gustav-french-research-pack-firewall-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'french_research_pack_firewall_run_id_mismatch', `French research pack firewall runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'french_research_pack_firewall_status_invalid', `French research pack firewall status is invalid: ${status}`, auditPath);
  } else if (status !== 'PASS') {
    pushFinding(findings, 'blocker', 'french_research_pack_firewall_status_not_pass', 'French research pack firewall must be PASS before it can be accepted.', auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'french_research_pack_firewall_summary_missing', 'French research pack firewall summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'realPackCandidates',
    'realPacksPresent',
    'exactPackMatches',
    'tempFixtures',
    'rejectedTempFixtures',
    'acceptedShapeFixtures',
    'tempExactShapeBlockedByPath',
    'singleSourceFixtures',
    'singleSourceFixturesRejected',
    'missingRuUkFixtures',
    'missingRuUkFixturesRejected',
    'missingFieldsFixtures',
    'missingFieldsFixturesRejected',
    'shortcutFixtures',
    'shortcutFixturesRejected',
    'frenchOutputFixtures',
    'frenchOutputFixturesRejected',
    'blockers',
    'warnings',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'french_research_pack_firewall_summary_number_missing', `French research pack firewall summary.${key} must be a number.`, auditPath);
    }
  }
  for (const key of [
    'firewallPassed',
    'requiresCanonicalPackPath',
    'requiresTwoSourceClusterEvidence',
    'requiresRuUkComparison',
    'requiresRequiredFields',
    'requiresShortcutRejection',
    'requiresNoFrenchOutput',
    'researchPackStillMissing',
    'mayStartTranslationNow',
    'mayStartFrenchGeneration',
    'mayModifyProductionAppFiles',
    'noFrenchContentGenerated',
  ]) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'french_research_pack_firewall_summary_boolean_missing', `French research pack firewall summary.${key} must be boolean.`, auditPath);
    }
  }
  if (summary.targetStudyLanguage !== 'fr') {
    pushFinding(findings, 'blocker', 'french_research_pack_firewall_target_invalid', 'French research pack firewall targetStudyLanguage must be fr.', auditPath);
  }

  const firewall = audit.researchPackFirewall && typeof audit.researchPackFirewall === 'object'
    ? audit.researchPackFirewall as Record<string, unknown>
    : null;
  if (!firewall) {
    pushFinding(findings, 'blocker', 'french_research_pack_firewall_missing', 'French research pack firewall must include researchPackFirewall.', auditPath);
  } else {
    if (typeof firewall.canonicalResearchPackPath !== 'string' || !firewall.canonicalResearchPackPath.endsWith('research/fr_research_pack.json')) {
      pushFinding(findings, 'blocker', 'french_research_pack_firewall_path_invalid', 'French research pack firewall canonical path is invalid.', auditPath);
    }
    const acceptedPaths = Array.isArray(firewall.acceptedResearchPackPaths) ? firewall.acceptedResearchPackPaths as unknown[] : [];
    if (acceptedPaths.length !== 1 || typeof acceptedPaths[0] !== 'string' || !String(acceptedPaths[0]).endsWith('research/fr_research_pack.json')) {
      pushFinding(findings, 'blocker', 'french_research_pack_firewall_accepted_paths_invalid', 'French research pack firewall must have exactly one accepted research pack path.', auditPath);
    }
    if (firewall.targetStudyLanguage !== 'fr') {
      pushFinding(findings, 'blocker', 'french_research_pack_firewall_scope_target_invalid', 'French research pack firewall target must be fr.', auditPath);
    }
    const sourceLocales = Array.isArray(firewall.sourceLocales) ? firewall.sourceLocales as unknown[] : [];
    if (sourceLocales.length !== 2 || sourceLocales[0] !== 'ru' || sourceLocales[1] !== 'uk') {
      pushFinding(findings, 'blocker', 'french_research_pack_firewall_source_locales_invalid', 'French research pack firewall must use RU and UK source locales.', auditPath);
    }
    const sources = Array.isArray(firewall.requiredSourceIds) ? firewall.requiredSourceIds as unknown[] : [];
    const clusters = Array.isArray(firewall.requiredClusterIds) ? firewall.requiredClusterIds as unknown[] : [];
    const fields = Array.isArray(firewall.requiredResearchFields) ? firewall.requiredResearchFields as unknown[] : [];
    const rejectionOrder = Array.isArray(firewall.rejectionOrder) ? firewall.rejectionOrder as unknown[] : [];
    if (sources.length !== 8 || clusters.length !== 12 || fields.length !== 16) {
      pushFinding(findings, 'blocker', 'french_research_pack_firewall_contract_counts_invalid', 'French research pack firewall source/cluster/field counts are invalid.', auditPath);
    }
    if (
      rejectionOrder.length !== 14 ||
      !rejectionOrder.includes('cluster_lacks_two_sources') ||
      !rejectionOrder.includes('ru_uk_comparison_missing') ||
      !rejectionOrder.includes('french_output_started') ||
      !rejectionOrder.includes('research_pack_path_not_accepted')
    ) {
      pushFinding(findings, 'blocker', 'french_research_pack_firewall_rejection_order_invalid', 'French research pack firewall must include fourteen ordered rejection reasons.', auditPath);
    }
  }

  const probes = Array.isArray(audit.researchPackProbes) ? audit.researchPackProbes as Array<Record<string, unknown>> : [];
  const realProbes = probes.filter((probe) => probe.source === 'real_candidate');
  const tempProbes = probes.filter((probe) => probe.source === 'temp_fixture');
  const rejectedTemp = tempProbes.filter((probe) => probe.wouldAcceptResearchPack === false).length;
  if (probes.length !== 12 || realProbes.length !== 1 || tempProbes.length !== 11 || rejectedTemp !== 11) {
    pushFinding(findings, 'blocker', 'french_research_pack_firewall_probe_count_invalid', 'French research pack firewall must include one real probe and eleven rejected temp probes.', auditPath);
  }
  for (const id of ['REAL-FR-RESEARCH-PACK-JSON', 'TMP-IMPLICIT-DALSHE', 'TMP-WRONG-RUN', 'TMP-WRONG-TARGET', 'TMP-MISSING-SOURCE-LOCALE', 'TMP-MISSING-TRUSTED-SOURCE', 'TMP-SINGLE-SOURCE-CLUSTER', 'TMP-MISSING-RU-UK', 'TMP-MISSING-FIELDS', 'TMP-SHORTCUT-ALLOWED', 'TMP-FRENCH-OUTPUT', 'TMP-EXACT-SHAPE-WRONG-PATH']) {
    const probe = probes.find((entry) => entry.id === id);
    if (!probe) {
      pushFinding(findings, 'blocker', 'french_research_pack_firewall_probe_missing', `French research pack firewall missing probe ${id}.`, auditPath);
      continue;
    }
    for (const key of ['exists', 'parseableJson', 'schemaValid', 'runIdMatches', 'targetMatches', 'sourceLocalesMatch', 'trustedSourcesComplete', 'requiredFieldsComplete', 'clustersComplete', 'everyClusterHasTwoSources', 'everyClusterHasRuUkComparison', 'shortcutsRejected', 'noFrenchOutput', 'acceptedPackPath', 'wouldAcceptResearchPack', 'expectedAccept']) {
      if (typeof probe[key] !== 'boolean') {
        pushFinding(findings, 'blocker', 'french_research_pack_firewall_probe_boolean_missing', `French research pack probe ${id}.${key} must be boolean.`, auditPath);
      }
    }
    if (typeof probe.rejectionReason !== 'string') {
      pushFinding(findings, 'blocker', 'french_research_pack_firewall_probe_reason_missing', `French research pack probe ${id} must include rejectionReason.`, auditPath);
    }
    if (probe.wouldAcceptResearchPack !== probe.expectedAccept) {
      pushFinding(findings, 'blocker', 'french_research_pack_firewall_probe_expectation_mismatch', `French research pack probe ${id} result must match expectedAccept.`, auditPath);
    }
  }
  const exactShapeProbe = probes.find((probe) => probe.id === 'TMP-EXACT-SHAPE-WRONG-PATH');
  if (!exactShapeProbe || exactShapeProbe.rejectionReason !== 'research_pack_path_not_accepted' || exactShapeProbe.wouldAcceptResearchPack !== false) {
    pushFinding(findings, 'blocker', 'french_research_pack_firewall_exact_shape_invalid', 'Exact-shape temp research pack must be rejected only by path.', auditPath);
  }

  for (const required of [
    path.join(runDir, 'audits', 'french_research_pack_firewall_audit.md'),
    path.join(runDir, 'audits', 'french_research_pack_firewall', 'README.md'),
  ]) {
    if (!fs.existsSync(required)) {
      pushFinding(findings, 'blocker', 'french_research_pack_firewall_markdown_missing', `French research pack firewall markdown report is missing: ${path.relative(runDir, required)}`, auditPath);
    }
  }
  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'french_research_pack_firewall_findings_missing', 'French research pack firewall findings must be an array.', auditPath);
  }
  if (audit.status === 'PASS' && (
    summary.blockers !== 0 ||
    summary.realPackCandidates !== 1 ||
    summary.realPacksPresent !== 0 ||
    summary.exactPackMatches !== 0 ||
    summary.tempFixtures !== 11 ||
    summary.rejectedTempFixtures !== 11 ||
    summary.acceptedShapeFixtures !== 1 ||
    summary.tempExactShapeBlockedByPath !== 1 ||
    summary.singleSourceFixturesRejected !== 1 ||
    summary.missingRuUkFixturesRejected !== 1 ||
    summary.missingFieldsFixturesRejected !== 1 ||
    summary.shortcutFixturesRejected !== 1 ||
    summary.frenchOutputFixturesRejected !== 1 ||
    summary.firewallPassed !== true ||
    summary.requiresCanonicalPackPath !== true ||
    summary.requiresTwoSourceClusterEvidence !== true ||
    summary.requiresRuUkComparison !== true ||
    summary.requiresRequiredFields !== true ||
    summary.requiresShortcutRejection !== true ||
    summary.requiresNoFrenchOutput !== true ||
    summary.researchPackStillMissing !== true ||
    summary.mayStartTranslationNow !== false ||
    summary.mayStartFrenchGeneration !== false ||
    summary.mayModifyProductionAppFiles !== false ||
    summary.noFrenchContentGenerated !== true
  )) {
    pushFinding(findings, 'blocker', 'french_research_pack_firewall_pass_with_gaps', 'French research pack firewall cannot be PASS while firewall gaps remain or translation flags are open.', auditPath);
  }
}

function validateFrenchResearchJsonFirewallAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'french_research_json_firewall_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-french-research-json-firewall-audit-v0') {
    pushFinding(findings, 'blocker', 'french_research_json_firewall_schema_version', 'French research JSON firewall schemaVersion must be gustav-french-research-json-firewall-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'french_research_json_firewall_run_id_mismatch', `French research JSON firewall runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'french_research_json_firewall_status_invalid', `French research JSON firewall status is invalid: ${status}`, auditPath);
  } else if (status !== 'PASS') {
    pushFinding(findings, 'blocker', 'french_research_json_firewall_status_not_pass', 'French research JSON firewall must be PASS before French generation can be accepted.', auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'french_research_json_firewall_summary_missing', 'French research JSON firewall summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'scannedJsonFiles',
    'scannedResearchJsonFiles',
    'rowLedgerFiles',
    'blockerFindings',
    'warningFindings',
    'forbiddenOutputFields',
    'forbiddenPermissionFlags',
    'falseApprovalFlags',
    'runtimeActivationFlags',
    'rowLedgerNullOutputFields',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'french_research_json_firewall_summary_number_missing', `French research JSON firewall summary.${key} must be a number.`, auditPath);
    }
  }
  for (const key of [
    'mayStartFrenchGeneration',
    'mayModifyProductionAppFiles',
    'noFrenchContentGenerated',
  ]) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'french_research_json_firewall_summary_boolean_missing', `French research JSON firewall summary.${key} must be boolean.`, auditPath);
    }
  }
  const policy = audit.firewallPolicy && typeof audit.firewallPolicy === 'object'
    ? audit.firewallPolicy as Record<string, unknown>
    : null;
  if (!policy) {
    pushFinding(findings, 'blocker', 'french_research_json_firewall_policy_missing', 'French research JSON firewall must include firewallPolicy.', auditPath);
  } else {
    if (policy.targetStudyLanguage !== 'fr') {
      pushFinding(findings, 'blocker', 'french_research_json_firewall_target_invalid', 'French research JSON firewall targetStudyLanguage must be fr.', auditPath);
    }
    const sourceLocales = Array.isArray(policy.allowedSourceLocales) ? policy.allowedSourceLocales as unknown[] : [];
    if (sourceLocales.length !== 2 || sourceLocales[0] !== 'ru' || sourceLocales[1] !== 'uk') {
      pushFinding(findings, 'blocker', 'french_research_json_firewall_source_locales_invalid', 'French research JSON firewall must use RU and UK source locales.', auditPath);
    }
    const forbiddenOutputKeys = Array.isArray(policy.forbiddenOutputKeys) ? policy.forbiddenOutputKeys as unknown[] : [];
    for (const key of ['proposedFrench', 'wordsFr', 'french', 'introExamples', 'quizPrompts', 'examRows']) {
      if (!forbiddenOutputKeys.includes(key)) {
        pushFinding(findings, 'blocker', 'french_research_json_firewall_forbidden_key_missing', `French research JSON firewall forbiddenOutputKeys must include ${key}.`, auditPath);
      }
    }
    if (policy.activationStatusMustRemainBlocked !== true || policy.rowLedgerOutputFieldsMustBeNull !== true) {
      pushFinding(findings, 'blocker', 'french_research_json_firewall_policy_flags_invalid', 'French research JSON firewall policy must keep activation blocked and row ledger output fields null.', auditPath);
    }
  }
  if (!Array.isArray(audit.scannedFiles) || audit.scannedFiles.length !== summary.scannedResearchJsonFiles) {
    pushFinding(findings, 'blocker', 'french_research_json_firewall_scanned_files_invalid', 'French research JSON firewall scannedFiles must match summary.scannedResearchJsonFiles.', auditPath);
  }
  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'french_research_json_firewall_findings_missing', 'French research JSON firewall findings must be an array.', auditPath);
  }
  if (!fs.existsSync(path.join(runDir, 'audits', 'french_research_json_firewall_audit.md'))) {
    pushFinding(findings, 'blocker', 'french_research_json_firewall_markdown_missing', 'French research JSON firewall markdown report is missing.', auditPath);
  }
  if (audit.status === 'PASS' && (
    summary.blockerFindings !== 0 ||
    summary.forbiddenOutputFields !== 0 ||
    summary.forbiddenPermissionFlags !== 0 ||
    summary.falseApprovalFlags !== 0 ||
    summary.runtimeActivationFlags !== 0 ||
    summary.mayStartFrenchGeneration !== false ||
    summary.mayModifyProductionAppFiles !== false ||
    summary.noFrenchContentGenerated !== true
  )) {
    pushFinding(findings, 'blocker', 'french_research_json_firewall_pass_with_gaps', 'French research JSON firewall cannot be PASS while research output, approval or activation flags are open.', auditPath);
  }
}

function validateFrenchResearchWorkOrderAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'french_research_work_order_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-french-research-work-order-audit-v0') {
    pushFinding(findings, 'blocker', 'french_research_work_order_schema_version', 'French research work order schemaVersion must be gustav-french-research-work-order-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'french_research_work_order_run_id_mismatch', `French research work order runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'french_research_work_order_status_invalid', `French research work order status is invalid: ${status}`, auditPath);
  } else if (status !== 'PASS') {
    pushFinding(findings, 'blocker', 'french_research_work_order_status_not_pass', 'French research work order must be PASS before it can be accepted.', auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'french_research_work_order_summary_missing', 'French research work order summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'sourceLocales',
    'trustedSources',
    'grammarClusters',
    'workOrders',
    'tasks',
    'sourceGraphReferenceGroups',
    'minimumTrustedSourceChecks',
    'ruUkComparisonsRequired',
    'requiredSignoffs',
    'blockers',
    'warnings',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'french_research_work_order_summary_number_missing', `French research work order summary.${key} must be a number.`, auditPath);
    }
  }
  for (const key of [
    'contractReady',
    'firewallPassed',
    'sourceGraphCountsLoaded',
    'workOrderReady',
    'researchPackPresent',
    'realResearchPackStillMissing',
    'mayStartResearchPackWritingNow',
    'mayStartTranslationNow',
    'mayStartFrenchGeneration',
    'mayModifyProductionAppFiles',
    'noFrenchContentGenerated',
  ]) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'french_research_work_order_summary_boolean_missing', `French research work order summary.${key} must be boolean.`, auditPath);
    }
  }
  if (summary.targetStudyLanguage !== 'fr') {
    pushFinding(findings, 'blocker', 'french_research_work_order_target_invalid', 'French research work order targetStudyLanguage must be fr.', auditPath);
  }

  const sourceGraphGroups = Array.isArray(audit.sourceGraphReferenceGroups)
    ? audit.sourceGraphReferenceGroups as Array<Record<string, unknown>>
    : [];
  const sourceGraphGroupIds = new Set<string>();
  if (sourceGraphGroups.length !== 10) {
    pushFinding(findings, 'blocker', 'french_research_work_order_group_count_invalid', 'French research work order must include 10 source graph reference groups.', auditPath);
  }
  for (const group of sourceGraphGroups) {
    const id = typeof group.id === 'string' ? group.id : '';
    if (!id) {
      pushFinding(findings, 'blocker', 'french_research_work_order_group_id_missing', 'French research work order source graph group must include id.', auditPath);
    } else if (sourceGraphGroupIds.has(id)) {
      pushFinding(findings, 'blocker', 'french_research_work_order_group_duplicate', `Duplicate source graph reference group: ${id}`, auditPath);
    } else {
      sourceGraphGroupIds.add(id);
    }
    if (typeof group.count !== 'number' || group.count <= 0 || group.requiredForEveryWorkOrder !== true) {
      pushFinding(findings, 'blocker', 'french_research_work_order_group_invalid', `Source graph reference group ${id || 'unknown'} must have positive count and be required for every work order.`, auditPath);
    }
  }

  const workOrders = Array.isArray(audit.workOrders)
    ? audit.workOrders as Array<Record<string, unknown>>
    : [];
  if (workOrders.length !== 12) {
    pushFinding(findings, 'blocker', 'french_research_work_order_count_invalid', 'French research work order must include 12 cluster work orders.', auditPath);
  }
  const orderIds = new Set<string>();
  let taskCount = 0;
  let sourceCheckCount = 0;
  let signoffCount = 0;
  let ruUkComparisons = 0;
  for (const order of workOrders) {
    const id = typeof order.id === 'string' ? order.id : '';
    if (!id) {
      pushFinding(findings, 'blocker', 'french_research_work_order_id_missing', 'French research work order entry must include id.', auditPath);
    } else if (orderIds.has(id)) {
      pushFinding(findings, 'blocker', 'french_research_work_order_duplicate_id', `Duplicate French research work order id: ${id}`, auditPath);
    } else {
      orderIds.add(id);
    }
    if (order.targetStudyLanguage !== 'fr' || order.canProduceFrenchOutput !== false) {
      pushFinding(findings, 'blocker', 'french_research_work_order_scope_invalid', `French research work order ${id || 'unknown'} must target fr and forbid French output.`, auditPath);
    }
    const sourceLocales = Array.isArray(order.sourceLocales) ? order.sourceLocales as unknown[] : [];
    if (sourceLocales.length !== 2 || sourceLocales[0] !== 'ru' || sourceLocales[1] !== 'uk') {
      pushFinding(findings, 'blocker', 'french_research_work_order_source_locales_invalid', `French research work order ${id || 'unknown'} must require RU and UK source locales.`, auditPath);
    } else {
      ruUkComparisons += 1;
    }
    const requiredSourceIds = Array.isArray(order.requiredSourceIds) ? order.requiredSourceIds as unknown[] : [];
    if (requiredSourceIds.length < 2 || requiredSourceIds.some((entry) => typeof entry !== 'string')) {
      pushFinding(findings, 'blocker', 'french_research_work_order_sources_invalid', `French research work order ${id || 'unknown'} must require at least two trusted sources.`, auditPath);
    }
    sourceCheckCount += requiredSourceIds.length;
    const slices = Array.isArray(order.sourceGraphSlices) ? order.sourceGraphSlices as unknown[] : [];
    if (slices.length !== 10 || slices.some((entry) => typeof entry !== 'string' || !sourceGraphGroupIds.has(entry))) {
      pushFinding(findings, 'blocker', 'french_research_work_order_slices_invalid', `French research work order ${id || 'unknown'} must include all 10 source graph slices.`, auditPath);
    }
    const tasks = Array.isArray(order.tasks) ? order.tasks as Array<Record<string, unknown>> : [];
    if (tasks.length !== 7) {
      pushFinding(findings, 'blocker', 'french_research_work_order_task_count_invalid', `French research work order ${id || 'unknown'} must include 7 tasks.`, auditPath);
    }
    taskCount += tasks.length;
    for (const task of tasks) {
      if (typeof task.id !== 'string' || typeof task.title !== 'string') {
        pushFinding(findings, 'blocker', 'french_research_work_order_task_identity_missing', `French research work order ${id || 'unknown'} task must include id and title.`, auditPath);
      }
      if (!Array.isArray(task.requiredInputs) || !Array.isArray(task.requiredOutputs) || task.canProduceFrenchOutput !== false) {
        pushFinding(findings, 'blocker', 'french_research_work_order_task_contract_invalid', `French research work order ${id || 'unknown'} task must include inputs, outputs and forbid French output.`, auditPath);
      }
    }
    const signoffs = Array.isArray(order.requiredSignoffs) ? order.requiredSignoffs as unknown[] : [];
    if (signoffs.length !== 6 || signoffs.some((entry) => typeof entry !== 'string')) {
      pushFinding(findings, 'blocker', 'french_research_work_order_signoffs_invalid', `French research work order ${id || 'unknown'} must include 6 signoffs.`, auditPath);
    }
    signoffCount += signoffs.length;
    const blockers = Array.isArray(order.mustBlockIf) ? order.mustBlockIf as unknown[] : [];
    if (blockers.length !== 6 || blockers.some((entry) => typeof entry !== 'string')) {
      pushFinding(findings, 'blocker', 'french_research_work_order_blockers_invalid', `French research work order ${id || 'unknown'} must include 6 blocking conditions.`, auditPath);
    }
  }

  for (const required of [
    path.join(runDir, 'audits', 'french_research_work_order_audit.md'),
    path.join(runDir, 'audits', 'french_research_work_order', 'README.md'),
  ]) {
    if (!fs.existsSync(required)) {
      pushFinding(findings, 'blocker', 'french_research_work_order_markdown_missing', `French research work order markdown report is missing: ${path.relative(runDir, required)}`, auditPath);
    }
  }
  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'french_research_work_order_findings_missing', 'French research work order findings must be an array.', auditPath);
  }
  if (audit.status === 'PASS' && (
    summary.blockers !== 0 ||
    summary.sourceLocales !== 2 ||
    summary.trustedSources !== 8 ||
    summary.grammarClusters !== 12 ||
    summary.workOrders !== 12 ||
    summary.tasks !== 84 ||
    summary.sourceGraphReferenceGroups !== 10 ||
    summary.minimumTrustedSourceChecks !== 26 ||
    summary.ruUkComparisonsRequired !== 12 ||
    summary.requiredSignoffs !== 72 ||
    summary.contractReady !== true ||
    summary.firewallPassed !== true ||
    summary.sourceGraphCountsLoaded !== true ||
    summary.workOrderReady !== true ||
    summary.researchPackPresent !== false ||
    summary.realResearchPackStillMissing !== true ||
    summary.mayStartResearchPackWritingNow !== false ||
    summary.mayStartTranslationNow !== false ||
    summary.mayStartFrenchGeneration !== false ||
    summary.mayModifyProductionAppFiles !== false ||
    summary.noFrenchContentGenerated !== true ||
    taskCount !== 84 ||
    sourceCheckCount !== 26 ||
    signoffCount !== 72 ||
    ruUkComparisons !== 12
  )) {
    pushFinding(findings, 'blocker', 'french_research_work_order_pass_with_gaps', 'French research work order cannot be PASS while work-order gaps remain or translation flags are open.', auditPath);
  }
}

function validateLesson916SourceRecoveryAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'lesson_9_16_source_recovery_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-lesson-9-16-source-recovery-audit-v0') {
    pushFinding(findings, 'blocker', 'lesson_916_recovery_schema_version', 'Lesson 9-16 source recovery audit schemaVersion must be gustav-lesson-9-16-source-recovery-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'lesson_916_recovery_run_id_mismatch', `Lesson 9-16 source recovery audit runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'lesson_916_recovery_status_invalid', `Lesson 9-16 source recovery audit status is invalid: ${status}`, auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'lesson_916_recovery_summary_missing', 'Lesson 9-16 source recovery audit summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'currentGeneratedPhraseCount',
    'historicalCommitsChecked',
    'inlineSourceCandidates',
    'generatedImportOnlyCandidates',
    'bestCandidatePhraseCount',
    'bestCandidateIdOverlap',
    'bestCandidateEnglishExactMatchesById',
    'bestCandidateEnglishTextOverlap',
    'bestCandidateCurrentOnlyIds',
    'bestCandidateOnlyIds',
    'bestCandidateMismatchedIds',
    'blockers',
    'highRisks',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'lesson_916_recovery_summary_number_missing', `Lesson 9-16 source recovery audit summary.${key} must be a number.`, auditPath);
    }
  }
  if (typeof summary.bestCandidateCommit !== 'string') {
    pushFinding(findings, 'blocker', 'lesson_916_recovery_best_commit_missing', 'Lesson 9-16 source recovery audit summary.bestCandidateCommit must be a string.', auditPath);
  }
  for (const key of ['recoveryCandidateWritten', 'canPromoteToCanonicalWithoutReview']) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'lesson_916_recovery_summary_boolean_missing', `Lesson 9-16 source recovery audit summary.${key} must be boolean.`, auditPath);
    }
  }

  const currentRuntime = audit.currentRuntime && typeof audit.currentRuntime === 'object'
    ? audit.currentRuntime as Record<string, unknown>
    : null;
  if (!currentRuntime) {
    pushFinding(findings, 'blocker', 'lesson_916_recovery_current_runtime_missing', 'Lesson 9-16 source recovery audit currentRuntime must be an object.', auditPath);
  } else {
    if (currentRuntime.file !== 'app/lesson_data_9_16_phrases_es.gen.ts') {
      pushFinding(findings, 'blocker', 'lesson_916_recovery_current_runtime_file_invalid', 'Lesson 9-16 recovery currentRuntime.file must be app/lesson_data_9_16_phrases_es.gen.ts.', auditPath);
    }
    if (currentRuntime.generated !== true) {
      pushFinding(findings, 'blocker', 'lesson_916_recovery_current_runtime_generated_invalid', 'Lesson 9-16 recovery currentRuntime.generated must be true.', auditPath);
    }
    if (typeof currentRuntime.phraseCount !== 'number') {
      pushFinding(findings, 'blocker', 'lesson_916_recovery_current_runtime_count_missing', 'Lesson 9-16 recovery currentRuntime.phraseCount must be a number.', auditPath);
    }
    if (!Array.isArray(currentRuntime.lessons)) {
      pushFinding(findings, 'blocker', 'lesson_916_recovery_current_runtime_lessons_missing', 'Lesson 9-16 recovery currentRuntime.lessons must be an array.', auditPath);
    }
  }

  const candidates = Array.isArray(audit.candidates) ? audit.candidates as Array<Record<string, unknown>> : null;
  if (!candidates) {
    pushFinding(findings, 'blocker', 'lesson_916_recovery_candidates_missing', 'Lesson 9-16 source recovery audit candidates must be an array.', auditPath);
  } else {
    for (const candidate of candidates) {
      const commit = typeof candidate.commit === 'string' ? candidate.commit : '';
      if (!commit) {
        pushFinding(findings, 'blocker', 'lesson_916_recovery_candidate_commit_missing', 'Lesson 9-16 recovery candidate commit must be a string.', auditPath);
      }
      if (candidate.file !== 'app/lesson_data_9_16.ts') {
        pushFinding(findings, 'blocker', 'lesson_916_recovery_candidate_file_invalid', `Lesson 9-16 recovery candidate ${commit}.file is invalid.`, auditPath);
      }
      const candidateStatus = typeof candidate.status === 'string' ? candidate.status : '';
      if (!['inline_source_found', 'generated_import_only', 'missing_blob', 'parse_error'].includes(candidateStatus)) {
        pushFinding(findings, 'blocker', 'lesson_916_recovery_candidate_status_invalid', `Lesson 9-16 recovery candidate ${commit}.status is invalid.`, auditPath);
      }
      for (const key of [
        'phraseCount',
        'idOverlapWithCurrent',
        'englishExactMatchesById',
        'russianExactMatchesById',
        'ukrainianExactMatchesById',
        'englishTextOverlap',
        'currentOnlyIdCount',
        'candidateOnlyIdCount',
        'mismatchedByIdCount',
        'score',
      ]) {
        if (typeof candidate[key] !== 'number') {
          pushFinding(findings, 'blocker', 'lesson_916_recovery_candidate_number_missing', `Lesson 9-16 recovery candidate ${commit}.${key} must be a number.`, auditPath);
        }
      }
      if (typeof candidate.hasGeneratedImport !== 'boolean') {
        pushFinding(findings, 'blocker', 'lesson_916_recovery_candidate_boolean_missing', `Lesson 9-16 recovery candidate ${commit}.hasGeneratedImport must be boolean.`, auditPath);
      }
      for (const key of ['lessons', 'currentOnlyIds', 'candidateOnlyIds', 'mismatchedById', 'notes']) {
        if (!Array.isArray(candidate[key])) {
          pushFinding(findings, 'blocker', 'lesson_916_recovery_candidate_array_missing', `Lesson 9-16 recovery candidate ${commit}.${key} must be an array.`, auditPath);
        }
      }
    }
  }

  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'lesson_916_recovery_findings_missing', 'Lesson 9-16 source recovery audit findings must be an array.', auditPath);
  }
  if (!Array.isArray(audit.requiredBeforeFrenchGeneration)) {
    pushFinding(findings, 'blocker', 'lesson_916_recovery_required_missing', 'Lesson 9-16 source recovery audit requiredBeforeFrenchGeneration must be an array.', auditPath);
  }
  const recoveryCandidatePath = typeof audit.recoveryCandidatePath === 'string' ? audit.recoveryCandidatePath : null;
  if (summary.recoveryCandidateWritten === true) {
    if (!recoveryCandidatePath) {
      pushFinding(findings, 'blocker', 'lesson_916_recovery_candidate_path_missing', 'Lesson 9-16 recovery audit says candidate was written, but recoveryCandidatePath is missing.', auditPath);
    } else {
      const resolvedCandidatePath = path.resolve(process.cwd(), recoveryCandidatePath);
      if (!fs.existsSync(resolvedCandidatePath)) {
        pushFinding(findings, 'blocker', 'lesson_916_recovery_candidate_file_missing', `Missing lesson 9-16 recovery candidate artifact: ${recoveryCandidatePath}`, auditPath);
      } else {
        const candidateArtifact = readJson<Record<string, unknown>>(resolvedCandidatePath, findings);
        if (candidateArtifact) {
          if (candidateArtifact.schemaVersion !== 'gustav-lesson-9-16-recovery-candidate-v0') {
            pushFinding(findings, 'blocker', 'lesson_916_recovery_candidate_schema_version', 'Lesson 9-16 recovery candidate schemaVersion must be gustav-lesson-9-16-recovery-candidate-v0.', recoveryCandidatePath);
          }
          if (runId && candidateArtifact.runId !== runId) {
            pushFinding(findings, 'blocker', 'lesson_916_recovery_candidate_run_id_mismatch', `Lesson 9-16 recovery candidate runId ${String(candidateArtifact.runId)} does not match manifest ${runId}.`, recoveryCandidatePath);
          }
          if (!Array.isArray(candidateArtifact.phrases)) {
            pushFinding(findings, 'blocker', 'lesson_916_recovery_candidate_phrases_missing', 'Lesson 9-16 recovery candidate phrases must be an array.', recoveryCandidatePath);
          }
        }
      }
    }
  }
  if (audit.status === 'PASS' && (summary.blockers !== 0 || summary.highRisks !== 0 || summary.canPromoteToCanonicalWithoutReview !== true)) {
    pushFinding(findings, 'blocker', 'lesson_916_recovery_pass_with_risks', 'Lesson 9-16 source recovery audit cannot be PASS while blockers/high risks remain or promotion approval is false.', auditPath);
  }
}

function validateLesson916ReconciliationAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'lesson_9_16_reconciliation_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-lesson-9-16-reconciliation-audit-v0') {
    pushFinding(findings, 'blocker', 'lesson_916_reconciliation_schema_version', 'Lesson 9-16 reconciliation audit schemaVersion must be gustav-lesson-9-16-reconciliation-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'lesson_916_reconciliation_run_id_mismatch', `Lesson 9-16 reconciliation audit runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'lesson_916_reconciliation_status_invalid', `Lesson 9-16 reconciliation audit status is invalid: ${status}`, auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'lesson_916_reconciliation_summary_missing', 'Lesson 9-16 reconciliation audit summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'currentPhraseCount',
    'candidatePhraseCount',
    'lessonsCompared',
    'totalIdOverlap',
    'totalEnglishExactMatchesById',
    'totalSameLessonEnglishTextOverlap',
    'totalCurrentOnlyIds',
    'totalCandidateOnlyIds',
    'candidateMissingIds',
    'candidateLegacyIds',
    'candidateDuplicateIds',
    'candidateInvalidCanonicalIds',
    'blockerLessons',
    'highRiskLessons',
    'blockers',
    'highRisks',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'lesson_916_reconciliation_summary_number_missing', `Lesson 9-16 reconciliation audit summary.${key} must be a number.`, auditPath);
    }
  }
  if (typeof summary.canAutoPromoteHistoricalCandidate !== 'boolean') {
    pushFinding(findings, 'blocker', 'lesson_916_reconciliation_approval_boolean_missing', 'Lesson 9-16 reconciliation audit summary.canAutoPromoteHistoricalCandidate must be boolean.', auditPath);
  }
  if (!['do_not_auto_merge', 'manual_review_required', 'approved'].includes(String(summary.recommendedPolicy))) {
    pushFinding(findings, 'blocker', 'lesson_916_reconciliation_policy_invalid', `Lesson 9-16 reconciliation audit summary.recommendedPolicy is invalid: ${String(summary.recommendedPolicy)}`, auditPath);
  }

  const inputArtifacts = audit.inputArtifacts && typeof audit.inputArtifacts === 'object'
    ? audit.inputArtifacts as Record<string, unknown>
    : null;
  if (!inputArtifacts) {
    pushFinding(findings, 'blocker', 'lesson_916_reconciliation_inputs_missing', 'Lesson 9-16 reconciliation audit inputArtifacts must be an object.', auditPath);
  } else {
    for (const key of ['currentSourceGraph', 'recoveryCandidate', 'recoveryAudit']) {
      const artifactPath = typeof inputArtifacts[key] === 'string' ? inputArtifacts[key] as string : '';
      if (!artifactPath) {
        pushFinding(findings, 'blocker', 'lesson_916_reconciliation_input_missing', `Lesson 9-16 reconciliation audit inputArtifacts.${key} must be a string.`, auditPath);
      } else if (!fs.existsSync(path.resolve(process.cwd(), artifactPath))) {
        pushFinding(findings, 'blocker', 'lesson_916_reconciliation_input_file_missing', `Missing lesson 9-16 reconciliation input artifact: ${artifactPath}`, auditPath);
      }
    }
  }

  const lessonComparisons = Array.isArray(audit.lessonComparisons)
    ? audit.lessonComparisons as Array<Record<string, unknown>>
    : null;
  if (!lessonComparisons) {
    pushFinding(findings, 'blocker', 'lesson_916_reconciliation_lessons_missing', 'Lesson 9-16 reconciliation audit lessonComparisons must be an array.', auditPath);
  } else {
    if (lessonComparisons.length !== 8) {
      pushFinding(findings, 'blocker', 'lesson_916_reconciliation_lesson_count_invalid', 'Lesson 9-16 reconciliation audit must compare 8 lessons.', auditPath);
    }
    for (const lesson of lessonComparisons) {
      const lessonId = typeof lesson.lessonId === 'number' ? lesson.lessonId : 0;
      if (lessonId < 9 || lessonId > 16) {
        pushFinding(findings, 'blocker', 'lesson_916_reconciliation_lesson_id_invalid', `Invalid lesson 9-16 reconciliation lessonId: ${lessonId}`, auditPath);
      }
      for (const key of [
        'currentCount',
        'candidateCount',
        'idOverlap',
        'englishExactMatchesById',
        'russianExactMatchesById',
        'ukrainianExactMatchesById',
        'sameLessonEnglishTextOverlap',
        'currentOnlyIdCount',
        'candidateOnlyIdCount',
        'candidateMissingIdCount',
        'candidateLegacyIdCount',
        'candidateDuplicateIdCount',
        'candidateInvalidCanonicalIdCount',
      ]) {
        if (typeof lesson[key] !== 'number') {
          pushFinding(findings, 'blocker', 'lesson_916_reconciliation_lesson_number_missing', `Lesson 9-16 reconciliation lesson ${lessonId}.${key} must be a number.`, auditPath);
        }
      }
      const risk = typeof lesson.risk === 'string' ? lesson.risk : '';
      if (!RISK_LEVELS.has(risk)) {
        pushFinding(findings, 'blocker', 'lesson_916_reconciliation_lesson_risk_invalid', `Lesson 9-16 reconciliation lesson ${lessonId}.risk is invalid.`, auditPath);
      }
      if (!lesson.examples || typeof lesson.examples !== 'object') {
        pushFinding(findings, 'blocker', 'lesson_916_reconciliation_examples_missing', `Lesson 9-16 reconciliation lesson ${lessonId}.examples must be an object.`, auditPath);
      }
      if (typeof lesson.recommendation !== 'string') {
        pushFinding(findings, 'blocker', 'lesson_916_reconciliation_recommendation_missing', `Lesson 9-16 reconciliation lesson ${lessonId}.recommendation must be a string.`, auditPath);
      }
    }
  }
  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'lesson_916_reconciliation_findings_missing', 'Lesson 9-16 reconciliation audit findings must be an array.', auditPath);
  }
  if (!Array.isArray(audit.requiredBeforeFrenchGeneration)) {
    pushFinding(findings, 'blocker', 'lesson_916_reconciliation_required_missing', 'Lesson 9-16 reconciliation audit requiredBeforeFrenchGeneration must be an array.', auditPath);
  }
  if (audit.status === 'PASS' && (summary.blockers !== 0 || summary.highRisks !== 0 || summary.canAutoPromoteHistoricalCandidate !== true || summary.recommendedPolicy !== 'approved')) {
    pushFinding(findings, 'blocker', 'lesson_916_reconciliation_pass_with_risks', 'Lesson 9-16 reconciliation audit cannot be PASS while blockers/high risks remain or policy is not approved.', auditPath);
  }
}

function validateLesson916CanonicalDraftAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'lesson_9_16_canonical_source_draft_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-lesson-9-16-canonical-source-draft-audit-v0') {
    pushFinding(findings, 'blocker', 'lesson_916_canonical_draft_schema_version', 'Lesson 9-16 canonical source draft audit schemaVersion must be gustav-lesson-9-16-canonical-source-draft-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'lesson_916_canonical_draft_run_id_mismatch', `Lesson 9-16 canonical source draft audit runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'lesson_916_canonical_draft_status_invalid', `Lesson 9-16 canonical source draft audit status is invalid: ${status}`, auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'lesson_916_canonical_draft_summary_missing', 'Lesson 9-16 canonical source draft audit summary must be an object.', auditPath);
    return;
  }
  for (const key of [
    'lessons',
    'phrases',
    'words',
    'missingEnglish',
    'missingRussian',
    'missingUkrainian',
    'invalidIds',
    'duplicateIds',
    'spanishFieldLeaks',
    'spanishTokenLeakSuspects',
    'runtimeGeneratedOrigins',
    'blockers',
    'highRisks',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'lesson_916_canonical_draft_summary_number_missing', `Lesson 9-16 canonical source draft audit summary.${key} must be a number.`, auditPath);
    }
  }
  for (const key of ['structurallyClean', 'canUseAsFrenchSourceTruth']) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'lesson_916_canonical_draft_summary_boolean_missing', `Lesson 9-16 canonical source draft audit summary.${key} must be boolean.`, auditPath);
    }
  }
  const draftPath = typeof audit.draftPath === 'string' ? audit.draftPath : '';
  const draftTsPath = typeof audit.draftTsPath === 'string' ? audit.draftTsPath : '';
  if (!draftPath || !fs.existsSync(path.resolve(process.cwd(), draftPath))) {
    pushFinding(findings, 'blocker', 'lesson_916_canonical_draft_file_missing', `Missing lesson 9-16 canonical source draft artifact: ${draftPath || '<missing>'}`, auditPath);
  } else {
    const draft = readJson<Record<string, unknown>>(path.resolve(process.cwd(), draftPath), findings);
    if (draft) {
      if (draft.schemaVersion !== 'gustav-lesson-9-16-canonical-source-draft-v0') {
        pushFinding(findings, 'blocker', 'lesson_916_canonical_draft_artifact_schema_version', 'Lesson 9-16 canonical source draft schemaVersion must be gustav-lesson-9-16-canonical-source-draft-v0.', draftPath);
      }
      if (runId && draft.runId !== runId) {
        pushFinding(findings, 'blocker', 'lesson_916_canonical_draft_artifact_run_id_mismatch', `Lesson 9-16 canonical source draft runId ${String(draft.runId)} does not match manifest ${runId}.`, draftPath);
      }
      if (draft.status !== 'needs_approval') {
        pushFinding(findings, 'blocker', 'lesson_916_canonical_draft_status_missing', 'Lesson 9-16 canonical source draft status must be needs_approval until an approval artifact exists.', draftPath);
      }
      const phrases = Array.isArray(draft.phrases) ? draft.phrases as Array<Record<string, unknown>> : null;
      if (!phrases) {
        pushFinding(findings, 'blocker', 'lesson_916_canonical_draft_phrases_missing', 'Lesson 9-16 canonical source draft phrases must be an array.', draftPath);
      } else {
        if (phrases.length !== summary.phrases) {
          pushFinding(findings, 'blocker', 'lesson_916_canonical_draft_phrase_count_mismatch', 'Lesson 9-16 canonical source draft phrases.length must match audit summary.phrases.', draftPath);
        }
        for (const phrase of phrases.slice(0, 400)) {
          const lessonId = typeof phrase.lessonId === 'number' ? phrase.lessonId : 0;
          if (lessonId < 9 || lessonId > 16) {
            pushFinding(findings, 'blocker', 'lesson_916_canonical_draft_phrase_lesson_invalid', `Lesson 9-16 canonical draft phrase lessonId is invalid: ${lessonId}`, draftPath);
          }
          for (const key of ['id', 'english', 'russian', 'ukrainian']) {
            if (typeof phrase[key] !== 'string' || !phrase[key]) {
              pushFinding(findings, 'blocker', 'lesson_916_canonical_draft_phrase_field_missing', `Lesson 9-16 canonical draft phrase ${String(phrase.id)}.${key} must be a non-empty string.`, draftPath);
            }
          }
          if (!Array.isArray(phrase.words)) {
            pushFinding(findings, 'blocker', 'lesson_916_canonical_draft_phrase_words_missing', `Lesson 9-16 canonical draft phrase ${String(phrase.id)}.words must be an array.`, draftPath);
          }
          if (Object.prototype.hasOwnProperty.call(phrase, 'spanish')) {
            pushFinding(findings, 'blocker', 'lesson_916_canonical_draft_spanish_field_leak', `Lesson 9-16 canonical draft phrase ${String(phrase.id)} must not include spanish.`, draftPath);
          }
        }
      }
    }
  }
  if (!draftTsPath || !fs.existsSync(path.resolve(process.cwd(), draftTsPath))) {
    pushFinding(findings, 'blocker', 'lesson_916_canonical_draft_ts_file_missing', `Missing lesson 9-16 canonical source draft TS artifact: ${draftTsPath || '<missing>'}`, auditPath);
  }
  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'lesson_916_canonical_draft_findings_missing', 'Lesson 9-16 canonical source draft audit findings must be an array.', auditPath);
  }
  if (!Array.isArray(audit.requiredBeforeFrenchGeneration)) {
    pushFinding(findings, 'blocker', 'lesson_916_canonical_draft_required_missing', 'Lesson 9-16 canonical source draft audit requiredBeforeFrenchGeneration must be an array.', auditPath);
  }
  if (audit.status === 'PASS' && (summary.blockers !== 0 || summary.highRisks !== 0 || summary.canUseAsFrenchSourceTruth !== true)) {
    pushFinding(findings, 'blocker', 'lesson_916_canonical_draft_pass_with_risks', 'Lesson 9-16 canonical source draft audit cannot be PASS while blockers/high risks remain or source-truth approval is false.', auditPath);
  }
}

function validateLesson916SourceTruthDecisionPacket(runDir: string, runId: string | null, findings: Finding[]): void {
  const packetPath = path.join(runDir, 'audits', 'lesson_9_16_source_truth_decision_packet.json');
  if (!fs.existsSync(packetPath)) return;
  const packet = readJson<Record<string, unknown>>(packetPath, findings);
  if (!packet) return;
  if (packet.schemaVersion !== 'gustav-lesson-9-16-source-truth-decision-packet-v0') {
    pushFinding(findings, 'blocker', 'lesson_916_decision_packet_schema_version', 'Lesson 9-16 source-truth decision packet schemaVersion must be gustav-lesson-9-16-source-truth-decision-packet-v0.', packetPath);
  }
  if (runId && packet.runId !== runId) {
    pushFinding(findings, 'blocker', 'lesson_916_decision_packet_run_id_mismatch', `Lesson 9-16 source-truth decision packet runId ${String(packet.runId)} does not match manifest ${runId}.`, packetPath);
  }
  const status = typeof packet.status === 'string' ? packet.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'lesson_916_decision_packet_status_invalid', `Lesson 9-16 source-truth decision packet status is invalid: ${status}`, packetPath);
  }
  const summary = packet.summary && typeof packet.summary === 'object'
    ? packet.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'lesson_916_decision_packet_summary_missing', 'Lesson 9-16 source-truth decision packet summary must be an object.', packetPath);
    return;
  }
  for (const key of [
    'options',
    'rejectedOptions',
    'pendingReviewOptions',
    'requiresManualWorkOptions',
    'recommendedOptions',
    'cleanDraftSpanishLeaks',
    'cleanDraftRuntimeGeneratedOrigins',
    'blockers',
    'highRisks',
  ]) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'lesson_916_decision_packet_summary_number_missing', `Lesson 9-16 source-truth decision packet summary.${key} must be a number.`, packetPath);
    }
  }
  for (const key of [
    'approvalArtifactExists',
    'approvalGranted',
    'cleanDraftStructurallyClean',
    'historicalCandidateDoNotAutoMerge',
    'canResolveLesson916SourceTruth',
  ]) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'lesson_916_decision_packet_summary_boolean_missing', `Lesson 9-16 source-truth decision packet summary.${key} must be boolean.`, packetPath);
    }
  }

  const inputArtifacts = packet.inputArtifacts && typeof packet.inputArtifacts === 'object'
    ? packet.inputArtifacts as Record<string, unknown>
    : null;
  if (!inputArtifacts) {
    pushFinding(findings, 'blocker', 'lesson_916_decision_packet_inputs_missing', 'Lesson 9-16 source-truth decision packet inputArtifacts must be an object.', packetPath);
  } else {
    for (const key of ['generatedSourceTruthAudit', 'recoveryAudit', 'reconciliationAudit', 'canonicalDraftAudit', 'canonicalDraft']) {
      const artifactPath = typeof inputArtifacts[key] === 'string' ? inputArtifacts[key] as string : '';
      if (!artifactPath) {
        pushFinding(findings, 'blocker', 'lesson_916_decision_packet_input_missing', `Lesson 9-16 source-truth decision packet inputArtifacts.${key} must be a string.`, packetPath);
      } else if (!fs.existsSync(path.resolve(process.cwd(), artifactPath))) {
        pushFinding(findings, 'blocker', 'lesson_916_decision_packet_input_file_missing', `Missing lesson 9-16 source-truth decision input artifact: ${artifactPath}`, packetPath);
      }
    }
  }

  const options = Array.isArray(packet.options) ? packet.options as Array<Record<string, unknown>> : null;
  if (!options) {
    pushFinding(findings, 'blocker', 'lesson_916_decision_packet_options_missing', 'Lesson 9-16 source-truth decision packet options must be an array.', packetPath);
  } else {
    if (summary.options !== options.length) {
      pushFinding(findings, 'blocker', 'lesson_916_decision_packet_options_count_mismatch', 'Lesson 9-16 source-truth decision packet summary.options must match options.length.', packetPath);
    }
    const optionIds = new Set(['direct_generated_runtime', 'historical_recovery_candidate', 'clean_canonical_draft', 'manual_rebuild']);
    for (const option of options) {
      const id = typeof option.id === 'string' ? option.id : '';
      if (!optionIds.has(id)) {
        pushFinding(findings, 'blocker', 'lesson_916_decision_packet_option_id_invalid', `Lesson 9-16 source-truth decision option id is invalid: ${id}`, packetPath);
      }
      const optionStatus = typeof option.status === 'string' ? option.status : '';
      if (!['rejected', 'pending_review', 'requires_manual_work', 'approved'].includes(optionStatus)) {
        pushFinding(findings, 'blocker', 'lesson_916_decision_packet_option_status_invalid', `Lesson 9-16 source-truth decision option ${id}.status is invalid.`, packetPath);
      }
      if (typeof option.recommended !== 'boolean') {
        pushFinding(findings, 'blocker', 'lesson_916_decision_packet_option_recommended_missing', `Lesson 9-16 source-truth decision option ${id}.recommended must be boolean.`, packetPath);
      }
      for (const key of ['sourceArtifacts', 'evidence', 'blockers', 'requiredApproval']) {
        if (!Array.isArray(option[key])) {
          pushFinding(findings, 'blocker', 'lesson_916_decision_packet_option_array_missing', `Lesson 9-16 source-truth decision option ${id}.${key} must be an array.`, packetPath);
        }
      }
    }
  }

  const approvalTemplatePath = typeof packet.approvalTemplatePath === 'string' ? packet.approvalTemplatePath : '';
  if (!approvalTemplatePath) {
    pushFinding(findings, 'blocker', 'lesson_916_decision_packet_approval_path_missing', 'Lesson 9-16 source-truth decision packet approvalTemplatePath must be a string.', packetPath);
  } else if (!fs.existsSync(path.resolve(process.cwd(), approvalTemplatePath))) {
    pushFinding(findings, 'blocker', 'lesson_916_decision_packet_approval_file_missing', `Missing lesson 9-16 source-truth approval template: ${approvalTemplatePath}`, packetPath);
  } else {
    const approval = readJson<Record<string, unknown>>(path.resolve(process.cwd(), approvalTemplatePath), findings);
    if (approval) {
      if (approval.schemaVersion !== 'gustav-lesson-9-16-source-truth-approval-v0') {
        pushFinding(findings, 'blocker', 'lesson_916_decision_packet_approval_schema_version', 'Lesson 9-16 source-truth approval template schemaVersion must be gustav-lesson-9-16-source-truth-approval-v0.', approvalTemplatePath);
      }
      if (runId && approval.runId !== runId) {
        pushFinding(findings, 'blocker', 'lesson_916_decision_packet_approval_run_id_mismatch', `Lesson 9-16 source-truth approval template runId ${String(approval.runId)} does not match manifest ${runId}.`, approvalTemplatePath);
      }
      if (!approval.decision || typeof approval.decision !== 'object') {
        pushFinding(findings, 'blocker', 'lesson_916_decision_packet_approval_decision_missing', 'Lesson 9-16 source-truth approval template decision must be an object.', approvalTemplatePath);
      }
      if (!Array.isArray(approval.requiredCriteria)) {
        pushFinding(findings, 'blocker', 'lesson_916_decision_packet_approval_criteria_missing', 'Lesson 9-16 source-truth approval template requiredCriteria must be an array.', approvalTemplatePath);
      }
    }
  }
  if (!Array.isArray(packet.findings)) {
    pushFinding(findings, 'blocker', 'lesson_916_decision_packet_findings_missing', 'Lesson 9-16 source-truth decision packet findings must be an array.', packetPath);
  }
  if (!Array.isArray(packet.requiredBeforeFrenchGeneration)) {
    pushFinding(findings, 'blocker', 'lesson_916_decision_packet_required_missing', 'Lesson 9-16 source-truth decision packet requiredBeforeFrenchGeneration must be an array.', packetPath);
  }
  if (packet.status === 'PASS' && (summary.blockers !== 0 || summary.highRisks !== 0 || summary.approvalGranted !== true || summary.canResolveLesson916SourceTruth !== true)) {
    pushFinding(findings, 'blocker', 'lesson_916_decision_packet_pass_with_risks', 'Lesson 9-16 source-truth decision packet cannot be PASS while approval is missing or risks remain.', packetPath);
  }
}

function validateLesson916SourceTruthApprovalAudit(runDir: string, runId: string | null, findings: Finding[]): void {
  const auditPath = path.join(runDir, 'audits', 'lesson_9_16_source_truth_approval_audit.json');
  if (!fs.existsSync(auditPath)) return;
  const audit = readJson<Record<string, unknown>>(auditPath, findings);
  if (!audit) return;
  if (audit.schemaVersion !== 'gustav-lesson-9-16-source-truth-approval-audit-v0') {
    pushFinding(findings, 'blocker', 'lesson_916_approval_audit_schema_version', 'Lesson 9-16 source-truth approval audit schemaVersion must be gustav-lesson-9-16-source-truth-approval-audit-v0.', auditPath);
  }
  if (runId && audit.runId !== runId) {
    pushFinding(findings, 'blocker', 'lesson_916_approval_audit_run_id_mismatch', `Lesson 9-16 source-truth approval audit runId ${String(audit.runId)} does not match manifest ${runId}.`, auditPath);
  }
  const status = typeof audit.status === 'string' ? audit.status : '';
  if (!REPORT_STATUSES.has(status)) {
    pushFinding(findings, 'blocker', 'lesson_916_approval_audit_status_invalid', `Lesson 9-16 source-truth approval audit status is invalid: ${status}`, auditPath);
  }
  const summary = audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  if (!summary) {
    pushFinding(findings, 'blocker', 'lesson_916_approval_audit_summary_missing', 'Lesson 9-16 source-truth approval audit summary must be an object.', auditPath);
    return;
  }
  for (const key of ['criteria', 'satisfiedCriteria', 'approvedArtifacts', 'rejectedArtifacts', 'blockers', 'highRisks']) {
    if (typeof summary[key] !== 'number') {
      pushFinding(findings, 'blocker', 'lesson_916_approval_audit_summary_number_missing', `Lesson 9-16 source-truth approval audit summary.${key} must be a number.`, auditPath);
    }
  }
  for (const key of [
    'approvalExists',
    'approvalGranted',
    'mayStartFrenchGeneration',
    'mayModifyProductionAppFiles',
    'requiresApplyPlanBeforeProductionWrite',
    'resolvesLesson916SourceTruth',
  ]) {
    if (typeof summary[key] !== 'boolean') {
      pushFinding(findings, 'blocker', 'lesson_916_approval_audit_summary_boolean_missing', `Lesson 9-16 source-truth approval audit summary.${key} must be boolean.`, auditPath);
    }
  }
  if (typeof summary.selectedOption !== 'string') {
    pushFinding(findings, 'blocker', 'lesson_916_approval_audit_selected_option_missing', 'Lesson 9-16 source-truth approval audit summary.selectedOption must be a string.', auditPath);
  }
  const approvalPath = typeof audit.approvalPath === 'string' ? audit.approvalPath : '';
  if (!approvalPath || !fs.existsSync(path.resolve(process.cwd(), approvalPath))) {
    pushFinding(findings, 'blocker', 'lesson_916_approval_file_missing', `Missing lesson 9-16 source-truth approval artifact: ${approvalPath || '<missing>'}`, auditPath);
  } else {
    const approval = readJson<Record<string, unknown>>(path.resolve(process.cwd(), approvalPath), findings);
    if (approval) {
      if (approval.schemaVersion !== 'gustav-lesson-9-16-source-truth-approval-v0') {
        pushFinding(findings, 'blocker', 'lesson_916_approval_schema_version', 'Lesson 9-16 source-truth approval schemaVersion must be gustav-lesson-9-16-source-truth-approval-v0.', approvalPath);
      }
      if (runId && approval.runId !== runId) {
        pushFinding(findings, 'blocker', 'lesson_916_approval_run_id_mismatch', `Lesson 9-16 source-truth approval runId ${String(approval.runId)} does not match manifest ${runId}.`, approvalPath);
      }
      if (approval.status !== 'approved') {
        pushFinding(findings, 'blocker', 'lesson_916_approval_status_invalid', 'Lesson 9-16 source-truth approval status must be approved.', approvalPath);
      }
      const decision = approval.decision && typeof approval.decision === 'object'
        ? approval.decision as Record<string, unknown>
        : null;
      if (!decision || decision.approvedCanonicalSourceTruth !== true || decision.selectedOption !== 'clean_canonical_draft') {
        pushFinding(findings, 'blocker', 'lesson_916_approval_decision_invalid', 'Lesson 9-16 source-truth approval decision must approve clean_canonical_draft.', approvalPath);
      }
      if (!Array.isArray(approval.requiredCriteria)) {
        pushFinding(findings, 'blocker', 'lesson_916_approval_criteria_missing', 'Lesson 9-16 source-truth approval requiredCriteria must be an array.', approvalPath);
      }
    }
  }
  if (!Array.isArray(audit.findings)) {
    pushFinding(findings, 'blocker', 'lesson_916_approval_audit_findings_missing', 'Lesson 9-16 source-truth approval audit findings must be an array.', auditPath);
  }
  if (audit.status === 'PASS' && (summary.blockers !== 0 || summary.highRisks !== 0 || summary.approvalGranted !== true || summary.resolvesLesson916SourceTruth !== true || summary.mayStartFrenchGeneration !== false || summary.mayModifyProductionAppFiles !== false)) {
    pushFinding(findings, 'blocker', 'lesson_916_approval_audit_pass_with_risks', 'Lesson 9-16 source-truth approval audit cannot be PASS unless approval is granted while generation/app writes remain disabled.', auditPath);
  }
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Run Validator Report',
    '',
    `Run: \`${report.runId ?? 'unknown'}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Checks/findings: ${report.summary.checks}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Findings',
    '',
  ];
  if (report.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of report.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}`);
      if (finding.artifact) lines.push(`  Artifact: \`${finding.artifact}\``);
    }
  }
  lines.push('', '## Notes', '');
  for (const note of report.notes) {
    lines.push(`- ${note}`);
  }
  lines.push('');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_validate_run.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const findings: Finding[] = [];
  const counters: ValidationCounters = { checks: 0 };

  counters.checks += 1;
  exists(runDir, findings, 'run_dir_missing');
  const manifestPath = path.join(runDir, 'manifest.json');
  const verdictPath = path.join(runDir, 'verdict.json');
  counters.checks += 2;
  exists(manifestPath, findings, 'manifest_missing');
  exists(verdictPath, findings, 'verdict_missing');
  for (const requiredDir of ['inputs', 'source_graph', 'research', 'curriculum', 'generated', 'audits', 'apply_plan']) {
    counters.checks += 1;
    exists(path.join(runDir, requiredDir), findings, `required_dir_missing_${requiredDir}`);
  }

  counters.checks += 2;
  const manifest = fs.existsSync(manifestPath) ? readJson<Record<string, unknown>>(manifestPath, findings) : null;
  const verdict = fs.existsSync(verdictPath) ? readJson<Record<string, unknown>>(verdictPath, findings) : null;
  counters.checks += 12;
  const runId = validateManifest(repoRoot, runDir, manifest, findings);
  counters.checks += 5;
  validateVerdict(repoRoot, verdict, runId, findings);
  const producedArtifactCount = verdict && Array.isArray(verdict.producedArtifacts) ? verdict.producedArtifacts.length : 0;
  counters.checks += 1 + producedArtifactCount;
  const agentDir = path.join(runDir, 'audits', 'agent_verdicts');
  const agentVerdictCount = fs.existsSync(agentDir)
    ? fs.readdirSync(agentDir).filter((file) => file.endsWith('.json')).length
    : 0;
  counters.checks += 1 + agentVerdictCount * 8;
  validateAgentVerdicts(repoRoot, runDir, findings);
  const cloudMappingPath = path.join(runDir, 'audits', 'cloud_sync_mapping.json');
  if (fs.existsSync(cloudMappingPath)) {
    const mapping = readJson<Record<string, unknown>>(cloudMappingPath, findings);
    const entryCount = mapping && Array.isArray(mapping.entries) ? mapping.entries.length : 0;
    counters.checks += 8 + entryCount * 5;
    if (mapping) validateCloudSyncMapping(runDir, runId, findings);
  }
  const mixedPayloadAuditPath = path.join(runDir, 'audits', 'mixed_cloud_payload_audit.json');
  if (fs.existsSync(mixedPayloadAuditPath)) {
    const audit = readJson<Record<string, unknown>>(mixedPayloadAuditPath, findings);
    const payloadCount = audit && Array.isArray(audit.payloads) ? audit.payloads.length : 0;
    const fieldCount = audit && Array.isArray(audit.payloads)
      ? audit.payloads.reduce((sum, payload) => {
          if (!payload || typeof payload !== 'object') return sum;
          const fields = (payload as Record<string, unknown>).fieldDecisions;
          return sum + (Array.isArray(fields) ? fields.length : 0);
        }, 0)
      : 0;
    counters.checks += 8 + payloadCount * 6 + fieldCount * 5;
    if (audit) validateMixedCloudPayloadAudit(runDir, runId, findings);
  }
  const achievementTaxonomyPath = path.join(runDir, 'audits', 'achievement_taxonomy.json');
  if (fs.existsSync(achievementTaxonomyPath)) {
    const taxonomy = readJson<Record<string, unknown>>(achievementTaxonomyPath, findings);
    const entryCount = taxonomy && Array.isArray(taxonomy.entries) ? taxonomy.entries.length : 0;
    counters.checks += 8 + entryCount * 7;
    if (taxonomy) validateAchievementTaxonomy(runDir, runId, findings);
  }
  const localCloudTablePath = path.join(runDir, 'audits', 'local_cloud_decision_table.json');
  if (fs.existsSync(localCloudTablePath)) {
    const table = readJson<Record<string, unknown>>(localCloudTablePath, findings);
    const entryCount = table && Array.isArray(table.entries) ? table.entries.length : 0;
    counters.checks += 8 + entryCount * 7;
    if (table) validateLocalCloudDecisionTable(runDir, runId, findings);
  }
  const targetKeyPlanPath = path.join(runDir, 'audits', 'target_key_integration_plan.json');
  if (fs.existsSync(targetKeyPlanPath)) {
    const plan = readJson<Record<string, unknown>>(targetKeyPlanPath, findings);
    const domainCount = plan && Array.isArray(plan.domains) ? plan.domains.length : 0;
    const phaseCount = plan && Array.isArray(plan.phases) ? plan.phases.length : 0;
    const touchpointCount = plan && Array.isArray(plan.domains)
      ? plan.domains.reduce((sum, domain) => {
          if (!domain || typeof domain !== 'object') return sum;
          const touchpoints = (domain as Record<string, unknown>).fileTouchpoints;
          return sum + (Array.isArray(touchpoints) ? touchpoints.length : 0);
        }, 0)
      : 0;
    counters.checks += 12 + phaseCount * 4 + domainCount * 10 + touchpointCount * 3;
    if (plan) validateTargetKeyIntegrationPlan(runDir, runId, findings);
  }
  const surfaceInventoryPath = path.join(runDir, 'audits', 'surface_route_inventory.json');
  if (fs.existsSync(surfaceInventoryPath)) {
    const inventory = readJson<Record<string, unknown>>(surfaceInventoryPath, findings);
    const surfaceCount = inventory && Array.isArray(inventory.surfaces) ? inventory.surfaces.length : 0;
    const blockerCount = inventory && Array.isArray(inventory.surfaces)
      ? inventory.surfaces.reduce((sum, surface) => {
          if (!surface || typeof surface !== 'object') return sum;
          const blockers = (surface as Record<string, unknown>).blockers;
          return sum + (Array.isArray(blockers) ? blockers.length : 0);
        }, 0)
      : 0;
    counters.checks += 12 + surfaceCount * 14 + blockerCount;
    if (inventory) validateSurfaceRouteInventory(runDir, runId, findings);
  }
  const migrationAdapterPlanPath = path.join(runDir, 'audits', 'migration_adapter_plan.json');
  if (fs.existsSync(migrationAdapterPlanPath)) {
    const plan = readJson<Record<string, unknown>>(migrationAdapterPlanPath, findings);
    const adapterCount = plan && Array.isArray(plan.adapters) ? plan.adapters.length : 0;
    const phaseCount = plan && Array.isArray(plan.phases) ? plan.phases.length : 0;
    const blockerCount = plan && Array.isArray(plan.adapters)
      ? plan.adapters.reduce((sum, adapter) => {
          if (!adapter || typeof adapter !== 'object') return sum;
          const blockers = (adapter as Record<string, unknown>).blockers;
          return sum + (Array.isArray(blockers) ? blockers.length : 0);
        }, 0)
      : 0;
    counters.checks += 12 + phaseCount * 5 + adapterCount * 16 + blockerCount;
    if (plan) validateMigrationAdapterPlan(runDir, runId, findings);
  }
  const sourceGraphPath = path.join(runDir, 'source_graph', 'source_graph.json');
  if (fs.existsSync(sourceGraphPath)) {
    const graph = readJson<Record<string, unknown>>(sourceGraphPath, findings);
    const lessonCount = graph && Array.isArray(graph.lessons) ? graph.lessons.length : 0;
    const phraseCount = graph && Array.isArray(graph.phrases) ? graph.phrases.length : 0;
    const unresolvedCount = graph && Array.isArray(graph.unresolved) ? graph.unresolved.length : 0;
    const arrayCount = [
      'sourceFiles',
      'generatedFiles',
      'lessons',
      'introScreens',
      'phrases',
      'words',
      'quizzes',
      'prepositionPacks',
      'flashcards',
      'dailyPhrases',
      'personalPractice',
      'surfaces',
      'unresolved',
    ].filter((key) => graph && Array.isArray(graph[key])).length;
    counters.checks += 18 + arrayCount * 3 + lessonCount * 7 + phraseCount * 5 + unresolvedCount * 4;
    if (graph) validateSourceGraph(runDir, runId, findings);
  }
  const sourceGraphQualityPath = path.join(runDir, 'audits', 'source_graph_quality_audit.json');
  if (fs.existsSync(sourceGraphQualityPath)) {
    const audit = readJson<Record<string, unknown>>(sourceGraphQualityPath, findings);
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    const lessonCoverageCount = audit && Array.isArray(audit.lessonCoverage) ? audit.lessonCoverage.length : 0;
    counters.checks += 20 + findingCount * 6 + lessonCoverageCount * 10;
    if (audit) validateSourceGraphQualityAudit(runDir, runId, findings);
  }
  const generatedSourceTruthPath = path.join(runDir, 'audits', 'generated_source_truth_audit.json');
  if (fs.existsSync(generatedSourceTruthPath)) {
    const audit = readJson<Record<string, unknown>>(generatedSourceTruthPath, findings);
    const artifactCount = audit && Array.isArray(audit.artifacts) ? audit.artifacts.length : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 20 + artifactCount * 14 + findingCount * 6;
    if (audit) validateGeneratedSourceTruthAudit(runDir, runId, findings);
  }
  const generatedSupportIsolationPath = path.join(runDir, 'audits', 'generated_support_isolation_audit.json');
  if (fs.existsSync(generatedSupportIsolationPath)) {
    const audit = readJson<Record<string, unknown>>(generatedSupportIsolationPath, findings);
    const decisionCount = audit && Array.isArray(audit.decisions) ? audit.decisions.length : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 18 + decisionCount * 10 + findingCount * 6;
    if (audit) validateGeneratedSupportIsolationAudit(runDir, runId, findings);
  }
  const sourceGraphApprovalPath = path.join(runDir, 'audits', 'source_graph_approval_audit.json');
  if (fs.existsSync(sourceGraphApprovalPath)) {
    const audit = readJson<Record<string, unknown>>(sourceGraphApprovalPath, findings);
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 24 + findingCount * 6;
    if (audit) validateSourceGraphApprovalAudit(runDir, runId, findings);
  }
  const lesson916RecoveryPath = path.join(runDir, 'audits', 'lesson_9_16_source_recovery_audit.json');
  if (fs.existsSync(lesson916RecoveryPath)) {
    const audit = readJson<Record<string, unknown>>(lesson916RecoveryPath, findings);
    const candidateCount = audit && Array.isArray(audit.candidates) ? audit.candidates.length : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    const candidatePath = audit && typeof audit.recoveryCandidatePath === 'string' ? audit.recoveryCandidatePath : null;
    const candidateArtifact = candidatePath && fs.existsSync(path.resolve(repoRoot, candidatePath))
      ? readJson<Record<string, unknown>>(path.resolve(repoRoot, candidatePath), findings)
      : null;
    const phraseCount = candidateArtifact && Array.isArray(candidateArtifact.phrases) ? candidateArtifact.phrases.length : 0;
    counters.checks += 24 + candidateCount * 18 + findingCount * 6 + phraseCount * 3;
    if (audit) validateLesson916SourceRecoveryAudit(runDir, runId, findings);
  }
  const lesson916ReconciliationPath = path.join(runDir, 'audits', 'lesson_9_16_reconciliation_audit.json');
  if (fs.existsSync(lesson916ReconciliationPath)) {
    const audit = readJson<Record<string, unknown>>(lesson916ReconciliationPath, findings);
    const lessonCount = audit && Array.isArray(audit.lessonComparisons) ? audit.lessonComparisons.length : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 24 + lessonCount * 18 + findingCount * 6;
    if (audit) validateLesson916ReconciliationAudit(runDir, runId, findings);
  }
  const lesson916CanonicalDraftPath = path.join(runDir, 'audits', 'lesson_9_16_canonical_source_draft_audit.json');
  if (fs.existsSync(lesson916CanonicalDraftPath)) {
    const audit = readJson<Record<string, unknown>>(lesson916CanonicalDraftPath, findings);
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    const draftPath = audit && typeof audit.draftPath === 'string' ? audit.draftPath : null;
    const draft = draftPath && fs.existsSync(path.resolve(repoRoot, draftPath))
      ? readJson<Record<string, unknown>>(path.resolve(repoRoot, draftPath), findings)
      : null;
    const phraseCount = draft && Array.isArray(draft.phrases) ? draft.phrases.length : 0;
    counters.checks += 26 + findingCount * 6 + phraseCount * 6;
    if (audit) validateLesson916CanonicalDraftAudit(runDir, runId, findings);
  }
  const lesson916DecisionPacketPath = path.join(runDir, 'audits', 'lesson_9_16_source_truth_decision_packet.json');
  if (fs.existsSync(lesson916DecisionPacketPath)) {
    const packet = readJson<Record<string, unknown>>(lesson916DecisionPacketPath, findings);
    const optionCount = packet && Array.isArray(packet.options) ? packet.options.length : 0;
    const findingCount = packet && Array.isArray(packet.findings) ? packet.findings.length : 0;
    const approvalTemplatePath = packet && typeof packet.approvalTemplatePath === 'string' ? packet.approvalTemplatePath : null;
    const approvalTemplate = approvalTemplatePath && fs.existsSync(path.resolve(repoRoot, approvalTemplatePath))
      ? readJson<Record<string, unknown>>(path.resolve(repoRoot, approvalTemplatePath), findings)
      : null;
    const criteriaCount = approvalTemplate && Array.isArray(approvalTemplate.requiredCriteria) ? approvalTemplate.requiredCriteria.length : 0;
    counters.checks += 28 + optionCount * 12 + findingCount * 6 + criteriaCount * 5;
    if (packet) validateLesson916SourceTruthDecisionPacket(runDir, runId, findings);
  }
  const lesson916ApprovalAuditPath = path.join(runDir, 'audits', 'lesson_9_16_source_truth_approval_audit.json');
  if (fs.existsSync(lesson916ApprovalAuditPath)) {
    const audit = readJson<Record<string, unknown>>(lesson916ApprovalAuditPath, findings);
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    const approvalPath = audit && typeof audit.approvalPath === 'string' ? audit.approvalPath : null;
    const approval = approvalPath && fs.existsSync(path.resolve(repoRoot, approvalPath))
      ? readJson<Record<string, unknown>>(path.resolve(repoRoot, approvalPath), findings)
      : null;
    const criteriaCount = approval && Array.isArray(approval.requiredCriteria) ? approval.requiredCriteria.length : 0;
    counters.checks += 24 + findingCount * 6 + criteriaCount * 6;
    if (audit) validateLesson916SourceTruthApprovalAudit(runDir, runId, findings);
  }
  const applyPlanPath = path.join(runDir, 'apply_plan', 'file_changes.json');
  if (fs.existsSync(applyPlanPath)) {
    const plan = readJson<Record<string, unknown>>(applyPlanPath, findings);
    const fileCount = plan && Array.isArray(plan.files) ? plan.files.length : 0;
    const blockerCount = plan && Array.isArray(plan.blockers) ? plan.blockers.length : 0;
    counters.checks += 28 + fileCount * 12 + blockerCount * 4;
    if (plan) validateApplyPlan(runDir, runId, findings);
  }
  const dirtyOverlapPath = path.join(runDir, 'apply_plan', 'dirty_overlap_preservation_audit.json');
  if (fs.existsSync(dirtyOverlapPath)) {
    const audit = readJson<Record<string, unknown>>(dirtyOverlapPath, findings);
    const decisionCount = audit && Array.isArray(audit.decisions) ? audit.decisions.length : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 20 + decisionCount * 10 + findingCount * 6;
    if (audit) validateDirtyOverlapPreservationAudit(runDir, runId, findings);
  }
  const readinessApplyCoveragePath = path.join(runDir, 'audits', 'readiness_apply_coverage_audit.json');
  if (fs.existsSync(readinessApplyCoveragePath)) {
    const audit = readJson<Record<string, unknown>>(readinessApplyCoveragePath, findings);
    const decisionCount = audit && Array.isArray(audit.decisions) ? audit.decisions.length : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 24 + decisionCount * 14 + findingCount * 6;
    if (audit) validateReadinessApplyCoverageAudit(runDir, runId, findings);
  }
  const phaseDependencyPath = path.join(runDir, 'audits', 'phase_dependency_audit.json');
  if (fs.existsSync(phaseDependencyPath)) {
    const audit = readJson<Record<string, unknown>>(phaseDependencyPath, findings);
    const phaseCount = audit && Array.isArray(audit.phases) ? audit.phases.length : 0;
    const adapterCount = audit && Array.isArray(audit.adapters) ? audit.adapters.length : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 28 + phaseCount * 12 + adapterCount * 12 + findingCount * 6;
    if (audit) validatePhaseDependencyAudit(runDir, runId, findings);
  }
  const p1ExecutionSlicePath = path.join(runDir, 'audits', 'p1_execution_slice_audit.json');
  if (fs.existsSync(p1ExecutionSlicePath)) {
    const audit = readJson<Record<string, unknown>>(p1ExecutionSlicePath, findings);
    const sliceCount = audit && Array.isArray(audit.slices) ? audit.slices.length : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 24 + sliceCount * 14 + findingCount * 6;
    if (audit) validateP1ExecutionSliceAudit(runDir, runId, findings);
  }
  const p1aCoreContractPath = path.join(runDir, 'audits', 'p1a_core_contract_spec.json');
  if (fs.existsSync(p1aCoreContractPath)) {
    const audit = readJson<Record<string, unknown>>(p1aCoreContractPath, findings);
    const domainCount = audit && Array.isArray(audit.domainContracts) ? audit.domainContracts.length : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    const publicApiCount = audit && audit.keyBuilderContract && typeof audit.keyBuilderContract === 'object' && Array.isArray((audit.keyBuilderContract as Record<string, unknown>).publicApis)
      ? ((audit.keyBuilderContract as Record<string, unknown>).publicApis as unknown[]).length
      : 0;
    const testAssertionCount = audit && audit.testContract && typeof audit.testContract === 'object' && Array.isArray((audit.testContract as Record<string, unknown>).assertions)
      ? ((audit.testContract as Record<string, unknown>).assertions as unknown[]).length
      : 0;
    counters.checks += 30 + domainCount * 10 + publicApiCount * 6 + testAssertionCount * 6 + findingCount * 6;
    if (audit) validateP1ACoreContractSpecAudit(runDir, runId, findings);
  }
  const p1aPreflightPath = path.join(runDir, 'audits', 'p1a_preflight_audit.json');
  if (fs.existsSync(p1aPreflightPath)) {
    const audit = readJson<Record<string, unknown>>(p1aPreflightPath, findings);
    const firstSliceCount = audit && Array.isArray(audit.firstSliceReadiness) ? audit.firstSliceReadiness.length : 0;
    const devEntrypointCount = audit && Array.isArray(audit.devTargetEntrypoints) ? audit.devTargetEntrypoints.length : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 30 + firstSliceCount * 8 + devEntrypointCount * 6 + findingCount * 6;
    if (audit) validateP1APreflightAudit(runDir, runId, findings);
  }
  const p1aTestExecutionPath = path.join(runDir, 'audits', 'p1a_test_execution_audit.json');
  if (fs.existsSync(p1aTestExecutionPath)) {
    const audit = readJson<Record<string, unknown>>(p1aTestExecutionPath, findings);
    const plannedTestFileCount = audit && Array.isArray(audit.plannedTestFiles) ? audit.plannedTestFiles.length : 0;
    const commandCount = audit && Array.isArray(audit.commands) ? audit.commands.length : 0;
    const companionRegressionCount = audit && Array.isArray(audit.companionRegressionTests) ? audit.companionRegressionTests.length : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 30 + plannedTestFileCount * 8 + commandCount * 4 + companionRegressionCount * 4 + findingCount * 6;
    if (audit) validateP1ATestExecutionAudit(runDir, runId, findings);
  }
  const p1aMinimalApplyPacketPath = path.join(runDir, 'apply_plan', 'p1a_minimal_apply_packet.json');
  if (fs.existsSync(p1aMinimalApplyPacketPath)) {
    const packet = readJson<Record<string, unknown>>(p1aMinimalApplyPacketPath, findings);
    const fileCount = packet && Array.isArray(packet.files) ? packet.files.length : 0;
    const commandCount = packet && Array.isArray(packet.commands) ? packet.commands.length : 0;
    const findingCount = packet && Array.isArray(packet.findings) ? packet.findings.length : 0;
    counters.checks += 30 + fileCount * 10 + commandCount * 6 + findingCount * 6;
    if (packet) validateP1AMinimalApplyPacket(runDir, runId, findings);
  }
  const p1aPostApplyGuardPath = path.join(runDir, 'audits', 'p1a_post_apply_guard.json');
  if (fs.existsSync(p1aPostApplyGuardPath)) {
    const guard = readJson<Record<string, unknown>>(p1aPostApplyGuardPath, findings);
    const allowedFileCount = guard && Array.isArray(guard.allowedFiles) ? guard.allowedFiles.length : 0;
    const forbiddenZoneCount = guard && Array.isArray(guard.forbiddenWriteZones) ? guard.forbiddenWriteZones.length : 0;
    const ruleCount = guard && Array.isArray(guard.guardRules) ? guard.guardRules.length : 0;
    const commandCount = guard && Array.isArray(guard.commands) ? guard.commands.length : 0;
    const findingCount = guard && Array.isArray(guard.findings) ? guard.findings.length : 0;
    counters.checks += 34 + allowedFileCount * 6 + forbiddenZoneCount * 3 + ruleCount * 6 + commandCount * 6 + findingCount * 6;
    if (guard) validateP1APostApplyGuard(runDir, runId, findings);
  }
  const p1aRollbackCheckpointPath = path.join(runDir, 'apply_plan', 'p1a_rollback_checkpoint.json');
  if (fs.existsSync(p1aRollbackCheckpointPath)) {
    const checkpoint = readJson<Record<string, unknown>>(p1aRollbackCheckpointPath, findings);
    const snapshotCount = checkpoint && Array.isArray(checkpoint.snapshots) ? checkpoint.snapshots.length : 0;
    const safeRollbackCount = checkpoint && checkpoint.rollbackPolicy && typeof checkpoint.rollbackPolicy === 'object' && Array.isArray((checkpoint.rollbackPolicy as Record<string, unknown>).safeRollback)
      ? ((checkpoint.rollbackPolicy as Record<string, unknown>).safeRollback as unknown[]).length
      : 0;
    const manualReviewCount = checkpoint && checkpoint.rollbackPolicy && typeof checkpoint.rollbackPolicy === 'object' && Array.isArray((checkpoint.rollbackPolicy as Record<string, unknown>).manualReviewRequiredWhen)
      ? ((checkpoint.rollbackPolicy as Record<string, unknown>).manualReviewRequiredWhen as unknown[]).length
      : 0;
    const findingCount = checkpoint && Array.isArray(checkpoint.findings) ? checkpoint.findings.length : 0;
    counters.checks += 34 + snapshotCount * 10 + safeRollbackCount * 4 + manualReviewCount * 4 + findingCount * 6;
    if (checkpoint) validateP1ARollbackCheckpoint(runDir, runId, findings);
  }
  const p1aExpoRouteSafetyPath = path.join(runDir, 'audits', 'p1a_expo_route_safety_audit.json');
  if (fs.existsSync(p1aExpoRouteSafetyPath)) {
    const audit = readJson<Record<string, unknown>>(p1aExpoRouteSafetyPath, findings);
    const evidenceCount = audit && Array.isArray(audit.existingShimEvidence) ? audit.existingShimEvidence.length : 0;
    const contractCount = audit && Array.isArray(audit.plannedModuleContracts) ? audit.plannedModuleContracts.length : 0;
    const exportCount = audit && Array.isArray(audit.plannedModuleContracts)
      ? (audit.plannedModuleContracts as Array<Record<string, unknown>>).reduce((sum, contract) => sum + (Array.isArray(contract.requiredNamedExports) ? contract.requiredNamedExports.length : 0), 0)
      : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 34 + evidenceCount * 6 + contractCount * 12 + exportCount * 2 + findingCount * 6;
    if (audit) validateP1AExpoRouteSafetyAudit(runDir, runId, findings);
  }
  const p1aKeyCollisionPath = path.join(runDir, 'audits', 'p1a_key_collision_audit.json');
  if (fs.existsSync(p1aKeyCollisionPath)) {
    const audit = readJson<Record<string, unknown>>(p1aKeyCollisionPath, findings);
    const sampleIdCount = audit && Array.isArray(audit.sampleIds) ? audit.sampleIds.length : 0;
    const sampleKeyCount = audit && Array.isArray(audit.sampleKeys) ? audit.sampleKeys.length : 0;
    const requiredTestCount = audit && Array.isArray(audit.requiredTestAdditions) ? audit.requiredTestAdditions.length : 0;
    const implementationRuleCount = audit && audit.encodingPolicy && typeof audit.encodingPolicy === 'object' && Array.isArray((audit.encodingPolicy as Record<string, unknown>).implementationRules)
      ? ((audit.encodingPolicy as Record<string, unknown>).implementationRules as unknown[]).length
      : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 34 + sampleIdCount * 4 + sampleKeyCount * 2 + requiredTestCount * 6 + implementationRuleCount * 4 + findingCount * 6;
    if (audit) validateP1AKeyCollisionAudit(runDir, runId, findings);
  }
  const p1aImportContractPath = path.join(runDir, 'audits', 'p1a_import_contract_audit.json');
  if (fs.existsSync(p1aImportContractPath)) {
    const audit = readJson<Record<string, unknown>>(p1aImportContractPath, findings);
    const moduleContractCount = audit && Array.isArray(audit.moduleContracts) ? audit.moduleContracts.length : 0;
    const moduleExportCount = audit && Array.isArray(audit.moduleContracts)
      ? (audit.moduleContracts as Array<Record<string, unknown>>).reduce((sum, contract) => sum + (Array.isArray(contract.exports) ? contract.exports.length : 0), 0)
      : 0;
    const testImportCount = audit && Array.isArray(audit.testImportContracts) ? audit.testImportContracts.length : 0;
    const dependencyEdgeCount = audit && Array.isArray(audit.dependencyEdges) ? audit.dependencyEdges.length : 0;
    const probeFileCount = audit && audit.compileProbe && typeof audit.compileProbe === 'object' && Array.isArray((audit.compileProbe as Record<string, unknown>).files)
      ? ((audit.compileProbe as Record<string, unknown>).files as unknown[]).length
      : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 34 + moduleContractCount * 12 + moduleExportCount * 2 + testImportCount * 10 + dependencyEdgeCount * 6 + probeFileCount * 4 + findingCount * 6;
    if (audit) validateP1AImportContractAudit(runDir, runId, findings);
  }
  const p1aApprovalLockPath = path.join(runDir, 'audits', 'p1a_approval_lock_audit.json');
  if (fs.existsSync(p1aApprovalLockPath)) {
    const audit = readJson<Record<string, unknown>>(p1aApprovalLockPath, findings);
    const receiptProbeCount = audit && Array.isArray(audit.receiptProbes) ? audit.receiptProbes.length : 0;
    const rejectedCommandCount = audit && audit.approvalGate && typeof audit.approvalGate === 'object' && Array.isArray((audit.approvalGate as Record<string, unknown>).rejectedImplicitCommands)
      ? ((audit.approvalGate as Record<string, unknown>).rejectedImplicitCommands as unknown[]).length
      : 0;
    const receiptPathCount = audit && audit.approvalGate && typeof audit.approvalGate === 'object' && Array.isArray((audit.approvalGate as Record<string, unknown>).approvalReceiptPaths)
      ? ((audit.approvalGate as Record<string, unknown>).approvalReceiptPaths as unknown[]).length
      : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 34 + receiptProbeCount * 8 + rejectedCommandCount * 3 + receiptPathCount * 4 + findingCount * 6;
    if (audit) validateP1AApprovalLockAudit(runDir, runId, findings);
  }
  const p1aImplementationBlueprintPath = path.join(runDir, 'audits', 'p1a_implementation_blueprint_audit.json');
  if (fs.existsSync(p1aImplementationBlueprintPath)) {
    const audit = readJson<Record<string, unknown>>(p1aImplementationBlueprintPath, findings);
    const blueprintFileCount = audit && Array.isArray(audit.blueprintFiles) ? audit.blueprintFiles.length : 0;
    const assertionGroupCount = audit && Array.isArray(audit.assertionGroups) ? audit.assertionGroups.length : 0;
    const assertionCount = audit && Array.isArray(audit.assertionGroups)
      ? (audit.assertionGroups as Array<Record<string, unknown>>).reduce((sum, group) => sum + (Array.isArray(group.assertions) ? group.assertions.length : 0), 0)
      : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 34 + blueprintFileCount * 8 + assertionGroupCount * 6 + assertionCount * 2 + findingCount * 6;
    if (audit) validateP1AImplementationBlueprintAudit(runDir, runId, findings);
  }
  const p1aBlueprintHashLockPath = path.join(runDir, 'audits', 'p1a_blueprint_hash_lock_audit.json');
  if (fs.existsSync(p1aBlueprintHashLockPath)) {
    const audit = readJson<Record<string, unknown>>(p1aBlueprintHashLockPath, findings);
    const lockedFileCount = audit && Array.isArray(audit.lockedFiles) ? audit.lockedFiles.length : 0;
    const futureRuleCount = audit && Array.isArray(audit.futureApplyRules) ? audit.futureApplyRules.length : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 34 + lockedFileCount * 12 + futureRuleCount * 4 + findingCount * 6;
    if (audit) validateP1ABlueprintHashLockAudit(runDir, runId, findings);
  }
  const p1aApplyTransactionPath = path.join(runDir, 'audits', 'p1a_apply_transaction_audit.json');
  if (fs.existsSync(p1aApplyTransactionPath)) {
    const audit = readJson<Record<string, unknown>>(p1aApplyTransactionPath, findings);
    const stepCount = audit && Array.isArray(audit.transactionSteps) ? audit.transactionSteps.length : 0;
    const invariantCount = audit && Array.isArray(audit.applyInvariants) ? audit.applyInvariants.length : 0;
    const allowedFileCount = audit && Array.isArray(audit.allowedWriteFiles) ? audit.allowedWriteFiles.length : 0;
    const forbiddenZoneCount = audit && Array.isArray(audit.forbiddenWriteZones) ? audit.forbiddenWriteZones.length : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 34 + stepCount * 6 + invariantCount * 4 + allowedFileCount * 4 + forbiddenZoneCount * 2 + findingCount * 6;
    if (audit) validateP1AApplyTransactionAudit(runDir, runId, findings);
  }
  const p1aTransactionSimulationPath = path.join(runDir, 'audits', 'p1a_transaction_simulation_audit.json');
  if (fs.existsSync(p1aTransactionSimulationPath)) {
    const audit = readJson<Record<string, unknown>>(p1aTransactionSimulationPath, findings);
    const simulatedFileCount = audit && Array.isArray(audit.simulatedFiles) ? audit.simulatedFiles.length : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 44 + simulatedFileCount * 10 + findingCount * 6;
    if (audit) validateP1ATransactionSimulationAudit(runDir, runId, findings);
  }
  const p1aApprovalReceiptFirewallPath = path.join(runDir, 'audits', 'p1a_approval_receipt_firewall_audit.json');
  if (fs.existsSync(p1aApprovalReceiptFirewallPath)) {
    const audit = readJson<Record<string, unknown>>(p1aApprovalReceiptFirewallPath, findings);
    const probeCount = audit && Array.isArray(audit.receiptProbes) ? audit.receiptProbes.length : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 44 + probeCount * 10 + findingCount * 6;
    if (audit) validateP1AApprovalReceiptFirewallAudit(runDir, runId, findings);
  }
  const postP1AReadinessProjectionPath = path.join(runDir, 'audits', 'post_p1a_readiness_projection_audit.json');
  if (fs.existsSync(postP1AReadinessProjectionPath)) {
    const audit = readJson<Record<string, unknown>>(postP1AReadinessProjectionPath, findings);
    const projectionCount = audit && Array.isArray(audit.projections) ? audit.projections.length : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 44 + projectionCount * 10 + findingCount * 6;
    if (audit) validatePostP1AReadinessProjectionAudit(runDir, runId, findings);
  }
  const postP1ANextSlicePath = path.join(runDir, 'audits', 'post_p1a_next_slice_audit.json');
  if (fs.existsSync(postP1ANextSlicePath)) {
    const audit = readJson<Record<string, unknown>>(postP1ANextSlicePath, findings);
    const fileCount = audit && audit.nextSlice && typeof audit.nextSlice === 'object' && Array.isArray((audit.nextSlice as Record<string, unknown>).files)
      ? ((audit.nextSlice as Record<string, unknown>).files as unknown[]).length
      : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 44 + fileCount * 10 + findingCount * 6;
    if (audit) validatePostP1ANextSliceAudit(runDir, runId, findings);
  }
  const p1bPreflightPath = path.join(runDir, 'audits', 'p1b_preflight_audit.json');
  if (fs.existsSync(p1bPreflightPath)) {
    const audit = readJson<Record<string, unknown>>(p1bPreflightPath, findings);
    const fileCount = audit && Array.isArray(audit.files) ? audit.files.length : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 44 + fileCount * 10 + findingCount * 6;
    if (audit) validateP1BPreflightAudit(runDir, runId, findings);
  }
  const p1bDirtyOverlapSnapshotPath = path.join(runDir, 'audits', 'p1b_dirty_overlap_snapshot_audit.json');
  if (fs.existsSync(p1bDirtyOverlapSnapshotPath)) {
    const audit = readJson<Record<string, unknown>>(p1bDirtyOverlapSnapshotPath, findings);
    const fileCount = audit && Array.isArray(audit.files) ? audit.files.length : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 44 + fileCount * 14 + findingCount * 6;
    if (audit) validateP1BDirtyOverlapSnapshotAudit(runDir, runId, findings);
  }
  const p1bApprovalReceiptFirewallPath = path.join(runDir, 'audits', 'p1b_approval_receipt_firewall_audit.json');
  if (fs.existsSync(p1bApprovalReceiptFirewallPath)) {
    const audit = readJson<Record<string, unknown>>(p1bApprovalReceiptFirewallPath, findings);
    const probeCount = audit && Array.isArray(audit.receiptProbes) ? audit.receiptProbes.length : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 44 + probeCount * 10 + findingCount * 6;
    if (audit) validateP1BApprovalReceiptFirewallAudit(runDir, runId, findings);
  }
  const p1bApprovalReceiptContractPath = path.join(runDir, 'audits', 'p1b_approval_receipt_contract_audit.json');
  if (fs.existsSync(p1bApprovalReceiptContractPath)) {
    const audit = readJson<Record<string, unknown>>(p1bApprovalReceiptContractPath, findings);
    const contract = audit && audit.approvalReceiptContract && typeof audit.approvalReceiptContract === 'object'
      ? audit.approvalReceiptContract as Record<string, unknown>
      : {};
    const fieldCount = Array.isArray(contract.requiredFields) ? contract.requiredFields.length : 0;
    const preconditionCount = Array.isArray(contract.unlockPreconditions) ? contract.unlockPreconditions.length : 0;
    const rejectedCommandCount = Array.isArray(contract.rejectedImplicitCommands) ? contract.rejectedImplicitCommands.length : 0;
    const allowedFileCount = contract.unlockScope && typeof contract.unlockScope === 'object' && Array.isArray((contract.unlockScope as Record<string, unknown>).allowedFiles)
      ? ((contract.unlockScope as Record<string, unknown>).allowedFiles as unknown[]).length
      : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 48 + fieldCount * 6 + preconditionCount * 5 + rejectedCommandCount * 3 + allowedFileCount * 4 + findingCount * 6;
    if (audit) validateP1BApprovalReceiptContractAudit(runDir, runId, findings);
  }
  const p1bUnlockPrerequisiteMatrixPath = path.join(runDir, 'audits', 'p1b_unlock_prerequisite_matrix_audit.json');
  if (fs.existsSync(p1bUnlockPrerequisiteMatrixPath)) {
    const audit = readJson<Record<string, unknown>>(p1bUnlockPrerequisiteMatrixPath, findings);
    const scenarioCount = audit && Array.isArray(audit.scenarios) ? audit.scenarios.length : 0;
    const requirementCount = audit && audit.unlockLogic && typeof audit.unlockLogic === 'object' && Array.isArray((audit.unlockLogic as Record<string, unknown>).requiredAllOf)
      ? ((audit.unlockLogic as Record<string, unknown>).requiredAllOf as unknown[]).length
      : 0;
    const allowedFileCount = audit && audit.unlockLogic && typeof audit.unlockLogic === 'object' && Array.isArray((audit.unlockLogic as Record<string, unknown>).allowedFiles)
      ? ((audit.unlockLogic as Record<string, unknown>).allowedFiles as unknown[]).length
      : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 52 + scenarioCount * 12 + requirementCount * 5 + allowedFileCount * 4 + findingCount * 6;
    if (audit) validateP1BUnlockPrerequisiteMatrixAudit(runDir, runId, findings);
  }
  const p1bFreshReadReceiptContractPath = path.join(runDir, 'audits', 'p1b_fresh_read_receipt_contract_audit.json');
  if (fs.existsSync(p1bFreshReadReceiptContractPath)) {
    const audit = readJson<Record<string, unknown>>(p1bFreshReadReceiptContractPath, findings);
    const contract = audit && audit.freshReadReceiptContract && typeof audit.freshReadReceiptContract === 'object'
      ? audit.freshReadReceiptContract as Record<string, unknown>
      : {};
    const fieldCount = Array.isArray(contract.requiredFields) ? contract.requiredFields.length : 0;
    const probeCount = audit && Array.isArray(audit.staleReadProbes) ? audit.staleReadProbes.length : 0;
    const policyCount = Array.isArray(contract.rejectionPolicy) ? contract.rejectionPolicy.length : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 52 + fieldCount * 5 + probeCount * 10 + policyCount * 4 + findingCount * 6;
    if (audit) validateP1BFreshReadReceiptContractAudit(runDir, runId, findings);
  }
  const p1bDirtyOverlapDriftResponsePath = path.join(runDir, 'audits', 'p1b_dirty_overlap_drift_response_audit.json');
  if (fs.existsSync(p1bDirtyOverlapDriftResponsePath)) {
    const audit = readJson<Record<string, unknown>>(p1bDirtyOverlapDriftResponsePath, findings);
    const plan = audit && audit.driftResponsePlan && typeof audit.driftResponsePlan === 'object'
      ? audit.driftResponsePlan as Record<string, unknown>
      : {};
    const refreshStepCount = Array.isArray(plan.refreshSteps) ? plan.refreshSteps.length : 0;
    const forbiddenActionCount = Array.isArray(plan.forbiddenActions) ? plan.forbiddenActions.length : 0;
    const acceptanceCriteriaCount = Array.isArray(plan.acceptanceCriteria) ? plan.acceptanceCriteria.length : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 52 + refreshStepCount * 5 + forbiddenActionCount * 5 + acceptanceCriteriaCount * 5 + findingCount * 6;
    if (audit) validateP1BDirtyOverlapDriftResponseAudit(runDir, runId, findings);
  }
  const p1bDirtyOverlapSnapshotRefreshContractPath = path.join(runDir, 'audits', 'p1b_dirty_overlap_snapshot_refresh_contract_audit.json');
  if (fs.existsSync(p1bDirtyOverlapSnapshotRefreshContractPath)) {
    const audit = readJson<Record<string, unknown>>(p1bDirtyOverlapSnapshotRefreshContractPath, findings);
    const contract = audit && audit.snapshotRefreshContract && typeof audit.snapshotRefreshContract === 'object'
      ? audit.snapshotRefreshContract as Record<string, unknown>
      : {};
    const fieldCount = Array.isArray(contract.requiredFields) ? contract.requiredFields.length : 0;
    const rejectionRuleCount = Array.isArray(contract.rejectionPolicy) ? contract.rejectionPolicy.length : 0;
    const probeCount = audit && Array.isArray(audit.refreshProbes) ? audit.refreshProbes.length : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 56 + fieldCount * 5 + rejectionRuleCount * 4 + probeCount * 10 + findingCount * 6;
    if (audit) validateP1BDirtyOverlapSnapshotRefreshContractAudit(runDir, runId, findings);
  }
  const p1bNarrowWriteTransactionContractPath = path.join(runDir, 'audits', 'p1b_narrow_write_transaction_contract_audit.json');
  if (fs.existsSync(p1bNarrowWriteTransactionContractPath)) {
    const audit = readJson<Record<string, unknown>>(p1bNarrowWriteTransactionContractPath, findings);
    const contract = audit && audit.writeTransactionContract && typeof audit.writeTransactionContract === 'object'
      ? audit.writeTransactionContract as Record<string, unknown>
      : {};
    const allowedFileCount = Array.isArray(contract.allowedFiles) ? contract.allowedFiles.length : 0;
    const receiptCount = Array.isArray(contract.requiredReceipts) ? contract.requiredReceipts.length : 0;
    const stageCount = Array.isArray(contract.transactionStages) ? contract.transactionStages.length : 0;
    const forbiddenScopeCount = Array.isArray(contract.forbiddenScopes) ? contract.forbiddenScopes.length : 0;
    const rollbackRuleCount = Array.isArray(contract.rollbackRules) ? contract.rollbackRules.length : 0;
    const verificationCommandCount = Array.isArray(contract.verificationCommands) ? contract.verificationCommands.length : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 58 + allowedFileCount * 8 + receiptCount * 8 + stageCount * 4 + forbiddenScopeCount * 4 + rollbackRuleCount * 4 + verificationCommandCount * 4 + findingCount * 6;
    if (audit) validateP1BNarrowWriteTransactionContractAudit(runDir, runId, findings);
  }
  const p1bPostWriteProofContractPath = path.join(runDir, 'audits', 'p1b_post_write_proof_contract_audit.json');
  if (fs.existsSync(p1bPostWriteProofContractPath)) {
    const audit = readJson<Record<string, unknown>>(p1bPostWriteProofContractPath, findings);
    const contract = audit && audit.postWriteProofContract && typeof audit.postWriteProofContract === 'object'
      ? audit.postWriteProofContract as Record<string, unknown>
      : {};
    const fieldCount = Array.isArray(contract.requiredFields) ? contract.requiredFields.length : 0;
    const rejectionRuleCount = Array.isArray(contract.rejectionPolicy) ? contract.rejectionPolicy.length : 0;
    const probeCount = audit && Array.isArray(audit.proofProbes) ? audit.proofProbes.length : 0;
    const verificationCommandCount = Array.isArray(contract.verificationCommands) ? contract.verificationCommands.length : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 60 + fieldCount * 5 + rejectionRuleCount * 4 + probeCount * 10 + verificationCommandCount * 4 + findingCount * 6;
    if (audit) validateP1BPostWriteProofContractAudit(runDir, runId, findings);
  }
  const p1bPostWriteProofFirewallPath = path.join(runDir, 'audits', 'p1b_post_write_proof_firewall_audit.json');
  if (fs.existsSync(p1bPostWriteProofFirewallPath)) {
    const audit = readJson<Record<string, unknown>>(p1bPostWriteProofFirewallPath, findings);
    const firewall = audit && audit.proofFirewall && typeof audit.proofFirewall === 'object'
      ? audit.proofFirewall as Record<string, unknown>
      : {};
    const probeCount = audit && Array.isArray(audit.proofProbes) ? audit.proofProbes.length : 0;
    const rejectionCount = Array.isArray(firewall.rejectionOrder) ? firewall.rejectionOrder.length : 0;
    const acceptedPathCount = Array.isArray(firewall.acceptedProofPaths) ? firewall.acceptedProofPaths.length : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 62 + probeCount * 12 + rejectionCount * 4 + acceptedPathCount * 6 + findingCount * 6;
    if (audit) validateP1BPostWriteProofFirewallAudit(runDir, runId, findings);
  }
  const translationStartGatePath = path.join(runDir, 'audits', 'translation_start_gate_audit.json');
  if (fs.existsSync(translationStartGatePath)) {
    const audit = readJson<Record<string, unknown>>(translationStartGatePath, findings);
    const unitCount = audit && audit.translationScope && typeof audit.translationScope === 'object' && Array.isArray((audit.translationScope as Record<string, unknown>).unitPlans)
      ? ((audit.translationScope as Record<string, unknown>).unitPlans as unknown[]).length
      : 0;
    const blockedCheckCount = audit && Array.isArray(audit.blockedReadinessChecks) ? audit.blockedReadinessChecks.length : 0;
    const agentCount = audit && Array.isArray(audit.translationAgents) ? audit.translationAgents.length : 0;
    const requiredGateCount = audit && Array.isArray(audit.requiredPreTranslationGates) ? audit.requiredPreTranslationGates.length : 0;
    const forbiddenActionCount = audit && Array.isArray(audit.forbiddenEarlyActions) ? audit.forbiddenEarlyActions.length : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 64 + unitCount * 8 + blockedCheckCount * 5 + agentCount * 8 + requiredGateCount * 4 + forbiddenActionCount * 4 + findingCount * 6;
    if (audit) validateTranslationStartGateAudit(runDir, runId, findings);
  }
  const frenchResearchPackContractPath = path.join(runDir, 'audits', 'french_research_pack_contract_audit.json');
  if (fs.existsSync(frenchResearchPackContractPath)) {
    const audit = readJson<Record<string, unknown>>(frenchResearchPackContractPath, findings);
    const contract = audit && audit.researchPackContract && typeof audit.researchPackContract === 'object'
      ? audit.researchPackContract as Record<string, unknown>
      : {};
    const sourceCount = Array.isArray(contract.trustedSources) ? contract.trustedSources.length : 0;
    const clusterCount = Array.isArray(contract.grammarClusters) ? contract.grammarClusters.length : 0;
    const fieldCount = Array.isArray(contract.requiredResearchFields) ? contract.requiredResearchFields.length : 0;
    const crossCheckCount = Array.isArray(contract.crossChecks) ? contract.crossChecks.length : 0;
    const rejectedShortcutCount = Array.isArray(contract.rejectedShortcutPolicies) ? contract.rejectedShortcutPolicies.length : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 66 + sourceCount * 8 + clusterCount * 8 + fieldCount * 4 + crossCheckCount * 4 + rejectedShortcutCount * 4 + findingCount * 6;
    if (audit) validateFrenchResearchPackContractAudit(runDir, runId, findings);
  }
  const frenchResearchPackFirewallPath = path.join(runDir, 'audits', 'french_research_pack_firewall_audit.json');
  if (fs.existsSync(frenchResearchPackFirewallPath)) {
    const audit = readJson<Record<string, unknown>>(frenchResearchPackFirewallPath, findings);
    const firewall = audit && audit.researchPackFirewall && typeof audit.researchPackFirewall === 'object'
      ? audit.researchPackFirewall as Record<string, unknown>
      : {};
    const probeCount = audit && Array.isArray(audit.researchPackProbes) ? audit.researchPackProbes.length : 0;
    const rejectionCount = Array.isArray(firewall.rejectionOrder) ? firewall.rejectionOrder.length : 0;
    const sourceCount = Array.isArray(firewall.requiredSourceIds) ? firewall.requiredSourceIds.length : 0;
    const clusterCount = Array.isArray(firewall.requiredClusterIds) ? firewall.requiredClusterIds.length : 0;
    const fieldCount = Array.isArray(firewall.requiredResearchFields) ? firewall.requiredResearchFields.length : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 68 + probeCount * 12 + rejectionCount * 4 + sourceCount * 3 + clusterCount * 3 + fieldCount * 3 + findingCount * 6;
    if (audit) validateFrenchResearchPackFirewallAudit(runDir, runId, findings);
  }
  const frenchResearchJsonFirewallPath = path.join(runDir, 'audits', 'french_research_json_firewall_audit.json');
  if (fs.existsSync(frenchResearchJsonFirewallPath)) {
    const audit = readJson<Record<string, unknown>>(frenchResearchJsonFirewallPath, findings);
    const policy = audit && audit.firewallPolicy && typeof audit.firewallPolicy === 'object'
      ? audit.firewallPolicy as Record<string, unknown>
      : {};
    const forbiddenOutputKeyCount = Array.isArray(policy.forbiddenOutputKeys) ? policy.forbiddenOutputKeys.length : 0;
    const permissionFlagCount = Array.isArray(policy.permissionFlagsThatMustNotBeTrue) ? policy.permissionFlagsThatMustNotBeTrue.length : 0;
    const approvalFlagCount = Array.isArray(policy.approvalFlagsThatMustNotBeTrue) ? policy.approvalFlagsThatMustNotBeTrue.length : 0;
    const scannedFileCount = audit && Array.isArray(audit.scannedFiles) ? audit.scannedFiles.length : 0;
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 52 + scannedFileCount * 4 + forbiddenOutputKeyCount * 4 + permissionFlagCount * 3 + approvalFlagCount * 3 + findingCount * 6;
    if (audit) validateFrenchResearchJsonFirewallAudit(runDir, runId, findings);
  }
  const frenchResearchWorkOrderPath = path.join(runDir, 'audits', 'french_research_work_order_audit.json');
  if (fs.existsSync(frenchResearchWorkOrderPath)) {
    const audit = readJson<Record<string, unknown>>(frenchResearchWorkOrderPath, findings);
    const workOrderCount = audit && Array.isArray(audit.workOrders) ? audit.workOrders.length : 0;
    const sourceGraphGroupCount = audit && Array.isArray(audit.sourceGraphReferenceGroups) ? audit.sourceGraphReferenceGroups.length : 0;
    const workOrders = audit && Array.isArray(audit.workOrders) ? audit.workOrders as Array<Record<string, unknown>> : [];
    const taskCount = workOrders.reduce((sum, order) => sum + (Array.isArray(order.tasks) ? order.tasks.length : 0), 0);
    const signoffCount = workOrders.reduce((sum, order) => sum + (Array.isArray(order.requiredSignoffs) ? order.requiredSignoffs.length : 0), 0);
    const findingCount = audit && Array.isArray(audit.findings) ? audit.findings.length : 0;
    counters.checks += 70 + workOrderCount * 12 + taskCount * 5 + signoffCount * 2 + sourceGraphGroupCount * 4 + findingCount * 6;
    if (audit) validateFrenchResearchWorkOrderAudit(runDir, runId, findings);
  }
  const readinessGatePath = path.join(runDir, 'audits', 'gustav_readiness_gate.json');
  if (fs.existsSync(readinessGatePath)) {
    const gate = readJson<Record<string, unknown>>(readinessGatePath, findings);
    const checkCount = gate && Array.isArray(gate.checks) ? gate.checks.length : 0;
    counters.checks += 12 + checkCount * 10;
    if (gate) validateReadinessGate(runDir, runId, findings);
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const report: Report = {
    schemaVersion: 'gustav-run-validator-report-v0',
    generatedAt: new Date().toISOString(),
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    runDir: path.relative(repoRoot, runDir),
    runId,
    status: blockers > 0 ? 'BLOCK' : 'PASS',
    summary: {
      checks: counters.checks,
      blockers,
      warnings,
    },
    findings,
    notes: [
      'This validator checks run structure and safety gates only.',
      'A PASS here does not approve French generation.',
      'A run verdict of HOLD or BLOCK remains authoritative for next-stage gating.',
    ],
  };

  const reportJsonPath = path.join(runDir, 'audits', 'run_validator_report.json');
  const reportMdPath = path.join(runDir, 'audits', 'run_validator_report.md');
  fs.writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(reportMdPath, renderMarkdown(report));

  console.log(`GUSTAV run validator: ${report.status}`);
  console.log(`Report: ${path.relative(repoRoot, reportJsonPath)}`);
  if (blockers > 0) process.exit(1);
}

void main();
