#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const SECURITY_CRITERIA = [
  'CC1.1', 'CC1.2', 'CC1.3', 'CC1.4', 'CC1.5',
  'CC2.1', 'CC2.2', 'CC2.3',
  'CC3.1', 'CC3.2', 'CC3.3', 'CC3.4',
  'CC4.1', 'CC4.2',
  'CC5.1', 'CC5.2', 'CC5.3',
  'CC6.1', 'CC6.2', 'CC6.3', 'CC6.4', 'CC6.5', 'CC6.6', 'CC6.7', 'CC6.8',
  'CC7.1', 'CC7.2', 'CC7.3', 'CC7.4', 'CC7.5',
  'CC8.1',
  'CC9.1', 'CC9.2',
];
const AVAILABILITY_CRITERIA = ['A1.1', 'A1.2', 'A1.3'];
const REQUIRED_CRITERIA = [...SECURITY_CRITERIA, ...AVAILABILITY_CRITERIA];
const REQUIRED_RISK_IDS = [
  'AUDIT-P1-DEPENDENCIES',
  'AUDIT-P1-CONTROL-SYSTEM',
  'AUDIT-P1-ADMIN-MONOLITH',
  'AUDIT-P1-RELEASE-CONTRACT',
  'AUDIT-P1-RESPONSE-RECOVERY',
  'AUDIT-P2-WEBSITE-HEADERS',
  'AUDIT-P2-DOM-SINKS',
  'AUDIT-P2-PERFORMANCE-BUDGET',
  'AUDIT-P2-REPO-GOVERNANCE',
  'AUDIT-P2-ARCHITECTURE-MAP',
  'AUDIT-P2-UX-JOURNEYS',
];

const ROOT_FIELDS = new Set([
  'schemaVersion', 'matrixStatus', 'asOf', 'scopeCategories', 'requiredControlIds',
  'criterionInventory', 'operatingCycles', 'controls',
]);
const CONTROL_FIELDS = new Set([
  'controlId', 'proposedCriterion', 'category', 'description', 'ownerRole', 'ownerName', 'ownerPersonId',
  'ownerStatus', 'cadence', 'evidenceSources', 'retentionMonths', 'exceptionSlaDays',
  'implementationStatus', 'linkedRisks',
]);
const EVIDENCE_FIELDS = new Set([
  'evidenceId', 'path', 'evidenceClass', 'description', 'collectedOn', 'maxAgeDays', 'cycleId',
]);
const CRITERION_FIELDS = new Set(['criterion', 'category', 'coverageStatus', 'rationale', 'controlIds']);
const CYCLE_FIELDS = new Set([
  'cycleId', 'reviewedOn', 'reviewerName', 'reviewerPersonId', 'reviewerRole', 'decision', 'decisionDetail',
]);
const CATEGORIES = new Set(['Security', 'Availability']);
const MATRIX_STATUSES = new Set(['Draft', 'Approved']);
const OWNER_STATUSES = new Set(['human_pending', 'assigned']);
const CADENCES = new Set(['continuous', 'per_change', 'daily', 'weekly', 'monthly', 'quarterly', 'annual']);
const IMPLEMENTATION_STATUSES = new Set(['planned', 'designed', 'partially_operating', 'operating']);
const EVIDENCE_CLASSES = new Set(['planning', 'gap', 'design', 'operating']);
const REVIEW_DECISIONS = new Set(['clean', 'exceptions_open', 'failed']);
const COVERAGE_STATUSES = new Set(['Mapped', 'Gap', 'Planned', 'PendingCPA']);
const MANIFEST_FIELDS = new Set([
  'schemaVersion', 'evidenceId', 'controlId', 'cycleId', 'populationScope', 'performer',
  'performerPersonId', 'executionResult', 'exceptions', 'provenanceType', 'externalSource',
  'artifactPath', 'sourceRevision', 'sourceChecksum', 'startedAt', 'completedAt',
]);
const PERFORMER_FIELDS = new Set(['type', 'identifier']);
const EXCEPTIONS_FIELDS = new Set(['count', 'disposition', 'items']);
const EXCEPTION_ITEM_FIELDS = new Set(['id', 'description', 'disposition', 'owner', 'dueDate']);
const EXTERNAL_SOURCE_FIELDS = new Set(['system', 'reference', 'importedAt']);
const PERFORMER_TYPES = new Set(['human', 'system']);
const EXECUTION_RESULTS = new Set(['pass', 'fail', 'partial']);
const EXCEPTION_DISPOSITIONS = new Set(['none', 'open', 'resolved', 'accepted']);
const EXCEPTION_ITEM_DISPOSITIONS = new Set(['open', 'resolved', 'accepted']);
const PROVENANCE_TYPES = new Set(['repository', 'external_import']);
const SECURITY_SET = new Set(SECURITY_CRITERIA);
const AVAILABILITY_SET = new Set(AVAILABILITY_CRITERIA);
const REQUIRED_CRITERIA_SET = new Set(REQUIRED_CRITERIA);
const PLACEHOLDER = /\b(?:pending|blocked|tbd|unknown|unassigned|none|n\/a|to be determined)\b/i;
const DAY_MS = 86_400_000;
const PERSON_ID = /^person:[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;
const CADENCE_MAX_AGE_DAYS = Object.freeze({
  continuous: 1,
  per_change: 30,
  daily: 2,
  weekly: 8,
  monthly: 32,
  quarterly: 95,
  annual: 366,
});

function parseCli(argv) {
  const valueFlags = new Set(['--matrix', '--risk-register', '--repo-root', '--as-of']);
  const booleanFlags = new Set(['--dry-run']);
  const seen = new Set();
  const values = {
    matrix: 'docs/security/SOC2_CONTROL_MATRIX.json',
    riskRegister: 'docs/security/RISK_REGISTER.md',
    repoRoot: '.',
    asOf: new Date().toISOString().slice(0, 10),
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (!valueFlags.has(flag) && !booleanFlags.has(flag)) throw new Error(`unknown argument: ${flag}`);
    if (seen.has(flag)) throw new Error(`duplicate argument: ${flag}`);
    seen.add(flag);
    if (booleanFlags.has(flag)) {
      values.dryRun = true;
      continue;
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`missing value for ${flag}`);
    if (flag === '--matrix') values.matrix = value;
    if (flag === '--risk-register') values.riskRegister = value;
    if (flag === '--repo-root') values.repoRoot = value;
    if (flag === '--as-of') values.asOf = value;
    index += 1;
  }
  return values;
}

function parseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value ? null : parsed;
}

function parseTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) || parsed.toISOString() !== value ? null : parsed;
}

function unexpectedFields(value, allowed, label, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) errors.push(`${label}: unexpected field ${key}`);
  }
}

function requireString(value, label, errors, minimum = 1) {
  if (typeof value !== 'string' || value.trim().length < minimum) {
    errors.push(`${label}: missing or too short`);
    return '';
  }
  return value.trim();
}

function requireInteger(value, label, errors, minimum, maximum) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    errors.push(`${label}: must be an integer from ${minimum} to ${maximum}`);
    return null;
  }
  return value;
}

function categoryForCriterion(criterion) {
  if (SECURITY_SET.has(criterion)) return 'Security';
  if (AVAILABILITY_SET.has(criterion)) return 'Availability';
  return null;
}

function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function requirePersonId(value, label, errors) {
  const personId = requireString(value, label, errors, 8);
  if (personId && !PERSON_ID.test(personId)) errors.push(`${label}: invalid stable person ID`);
  return PERSON_ID.test(personId) ? personId : '';
}

async function resolveRepositoryFile({ repoRoot, canonicalRepoRoot, relativePath, label, kind, errors }) {
  if (path.isAbsolute(relativePath)) {
    errors.push(`${label}: ${kind} path must stay within repository`);
    return null;
  }
  const resolved = path.resolve(repoRoot, relativePath);
  if (!isInside(repoRoot, resolved)) {
    errors.push(`${label}: ${kind} path must stay within repository`);
    return null;
  }

  const parts = path.relative(repoRoot, resolved).split(path.sep).filter(Boolean);
  let cursor = repoRoot;
  try {
    for (const part of parts) {
      cursor = path.join(cursor, part);
      const details = await lstat(cursor);
      if (details.isSymbolicLink()) {
        errors.push(`${label}: ${kind} path must not contain a symlink or junction`);
        return null;
      }
    }
    const canonical = await realpath(resolved);
    if (!isInside(canonicalRepoRoot, canonical)) {
      errors.push(`${label}: ${kind} real path must stay within repository`);
      return null;
    }
    const details = await lstat(canonical);
    if (!details.isFile()) {
      errors.push(`${label}: ${kind} path unavailable ${relativePath}`);
      return null;
    }
    return canonical;
  } catch {
    errors.push(`${label}: ${kind} path unavailable ${relativePath}`);
    return null;
  }
}

async function readCommittedArtifact({ repoRoot, sourceRevision, artifactPath }) {
  const commonOptions = { windowsHide: true, maxBuffer: 16 * 1024 * 1024 };
  await execFileAsync('git', ['-C', repoRoot, 'cat-file', '-e', `${sourceRevision}^{commit}`], commonOptions);
  await execFileAsync('git', ['-C', repoRoot, 'merge-base', '--is-ancestor', sourceRevision, 'HEAD'], commonOptions);
  const gitArtifactPath = artifactPath.replaceAll('\\', '/');
  if (gitArtifactPath.includes(':')) throw new Error('unsafe artifact path');
  const { stdout } = await execFileAsync(
    'git',
    ['-C', repoRoot, 'show', `${sourceRevision}:${gitArtifactPath}`],
    { ...commonOptions, encoding: null },
  );
  return stdout;
}

function parseRiskRegister(markdown, errors) {
  const headings = [...markdown.matchAll(/^##\s+(AUDIT-P[0-3]-[A-Z0-9-]+)\s*$/gm)];
  const mappings = new Map();
  for (const [index, heading] of headings.entries()) {
    const riskId = heading[1];
    const start = heading.index + heading[0].length;
    const end = headings[index + 1]?.index ?? markdown.length;
    const linked = [...markdown.slice(start, end).matchAll(/^- Linked control:\s*(\S+)\s*$/gm)];
    if (mappings.has(riskId)) errors.push(`${riskId}: duplicate risk record`);
    if (linked.length !== 1) {
      errors.push(`${riskId}: expected exactly one Linked control field`);
      continue;
    }
    mappings.set(riskId, linked[0][1]);
  }
  for (const riskId of REQUIRED_RISK_IDS) {
    if (!mappings.has(riskId)) errors.push(`risk register missing ${riskId}`);
  }
  return mappings;
}

async function validateOperatingManifest({ source, controlId, resolvedPath, repoRoot, canonicalRepoRoot, asOf, errors }) {
  const evidenceId = source.evidenceId || 'unknown-operating-evidence';
  if (path.extname(resolvedPath).toLowerCase() !== '.json') {
    errors.push(`${evidenceId}: operating evidence must reference a JSON manifest`);
    return { validForCleanCycle: false, completedAt: null, humanPerformerPersonId: '' };
  }

  let manifest;
  try {
    manifest = JSON.parse(await readFile(resolvedPath, 'utf8'));
  } catch {
    errors.push(`${evidenceId}: operating evidence manifest is not valid JSON`);
    return { validForCleanCycle: false, completedAt: null, humanPerformerPersonId: '' };
  }
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    errors.push(`${evidenceId}: operating evidence manifest must be an object`);
    return { validForCleanCycle: false, completedAt: null, humanPerformerPersonId: '' };
  }
  const before = errors.length;
  unexpectedFields(manifest, MANIFEST_FIELDS, `${evidenceId} manifest`, errors);
  if (manifest.schemaVersion !== 2) errors.push(`${evidenceId}: unsupported manifest schemaVersion ${manifest.schemaVersion}`);
  if (manifest.evidenceId !== source.evidenceId) {
    errors.push(`${evidenceId}: manifest evidenceId ${manifest.evidenceId} does not match ${source.evidenceId}`);
  }
  if (manifest.controlId !== controlId) {
    errors.push(`${evidenceId}: manifest controlId ${manifest.controlId} does not match ${controlId}`);
  }
  if (manifest.cycleId !== source.cycleId) {
    errors.push(`${evidenceId}: manifest cycleId ${manifest.cycleId} does not match ${source.cycleId}`);
  }
  requireString(manifest.populationScope, `${evidenceId} manifest populationScope`, errors, 30);

  let humanPerformerPersonId = '';
  if (!manifest.performer || typeof manifest.performer !== 'object' || Array.isArray(manifest.performer)) {
    errors.push(`${evidenceId}: manifest performer must be an object`);
  } else {
    unexpectedFields(manifest.performer, PERFORMER_FIELDS, `${evidenceId} manifest performer`, errors);
    if (!PERFORMER_TYPES.has(manifest.performer.type)) errors.push(`${evidenceId}: invalid performer type ${manifest.performer.type}`);
    const identifier = requireString(manifest.performer.identifier, `${evidenceId} manifest performer identifier`, errors, 3);
    if (PLACEHOLDER.test(identifier)) errors.push(`${evidenceId}: manifest performer is missing`);
    if (manifest.performer.type === 'human') {
      humanPerformerPersonId = requirePersonId(
        manifest.performerPersonId,
        `${evidenceId} manifest performerPersonId`,
        errors,
      );
    } else if (manifest.performer.type === 'system' && manifest.performerPersonId !== null) {
      errors.push(`${evidenceId}: system performer requires null performerPersonId`);
    }
  }

  if (!PROVENANCE_TYPES.has(manifest.provenanceType)) {
    errors.push(`${evidenceId}: invalid provenanceType ${manifest.provenanceType}`);
  }
  if (manifest.provenanceType === 'repository') {
    if (manifest.externalSource !== null) errors.push(`${evidenceId}: repository provenance requires null externalSource`);
  } else if (manifest.provenanceType === 'external_import') {
    if (!manifest.externalSource || typeof manifest.externalSource !== 'object' || Array.isArray(manifest.externalSource)) {
      errors.push(`${evidenceId}: external_import requires externalSource metadata`);
    } else {
      unexpectedFields(manifest.externalSource, EXTERNAL_SOURCE_FIELDS, `${evidenceId} externalSource`, errors);
      requireString(manifest.externalSource.system, `${evidenceId} externalSource system`, errors, 3);
      requireString(manifest.externalSource.reference, `${evidenceId} externalSource reference`, errors, 3);
      const importedAt = parseTimestamp(manifest.externalSource.importedAt);
      if (!importedAt) errors.push(`${evidenceId}: invalid externalSource importedAt ${manifest.externalSource.importedAt}`);
    }
  }

  if (!EXECUTION_RESULTS.has(manifest.executionResult)) {
    errors.push(`${evidenceId}: invalid executionResult ${manifest.executionResult}`);
  }
  if (!manifest.exceptions || typeof manifest.exceptions !== 'object' || Array.isArray(manifest.exceptions)) {
    errors.push(`${evidenceId}: manifest exceptions must be an object`);
  } else {
    unexpectedFields(manifest.exceptions, EXCEPTIONS_FIELDS, `${evidenceId} manifest exceptions`, errors);
    const count = requireInteger(manifest.exceptions.count, `${evidenceId} manifest exceptions count`, errors, 0, 1000000);
    if (!EXCEPTION_DISPOSITIONS.has(manifest.exceptions.disposition)) {
      errors.push(`${evidenceId}: invalid exception disposition ${manifest.exceptions.disposition}`);
    }
    if (!Array.isArray(manifest.exceptions.items)) {
      errors.push(`${evidenceId}: manifest exception items must be an array`);
    } else {
      if (count !== null && manifest.exceptions.items.length !== count) {
        errors.push(`${evidenceId}: exception count does not match item population`);
      }
      for (const [index, item] of manifest.exceptions.items.entries()) {
        const label = `${evidenceId} exception[${index}]`;
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          errors.push(`${label}: must be an object`);
          continue;
        }
        unexpectedFields(item, EXCEPTION_ITEM_FIELDS, label, errors);
        requireString(item.id, `${label} id`, errors);
        requireString(item.description, `${label} description`, errors, 20);
        if (!EXCEPTION_ITEM_DISPOSITIONS.has(item.disposition)) errors.push(`${label}: invalid disposition ${item.disposition}`);
        const owner = requireString(item.owner, `${label} owner`, errors, 3);
        if (PLACEHOLDER.test(owner)) errors.push(`${label}: owner is missing`);
        if (!parseDate(item.dueDate)) errors.push(`${label}: invalid dueDate ${item.dueDate}`);
      }
    }
    if (count === 0 && manifest.exceptions.disposition !== 'none') {
      errors.push(`${evidenceId}: zero exceptions require disposition none`);
    }
    if (count !== null && count > 0 && manifest.exceptions.disposition === 'none') {
      errors.push(`${evidenceId}: recorded exceptions require an explicit disposition`);
    }
  }

  if (typeof manifest.sourceRevision !== 'string' || !/^[a-f0-9]{7,64}$/i.test(manifest.sourceRevision)) {
    errors.push(`${evidenceId}: invalid sourceRevision`);
  }
  if (typeof manifest.sourceChecksum !== 'string' || !/^sha256:[a-f0-9]{64}$/i.test(manifest.sourceChecksum)) {
    errors.push(`${evidenceId}: invalid sourceChecksum`);
  }
  const startedAt = parseTimestamp(manifest.startedAt);
  const completedAt = parseTimestamp(manifest.completedAt);
  if (!startedAt) errors.push(`${evidenceId}: invalid startedAt ${manifest.startedAt}`);
  if (!completedAt) errors.push(`${evidenceId}: invalid completedAt ${manifest.completedAt}`);
  if (startedAt && completedAt && completedAt < startedAt) errors.push(`${evidenceId}: completedAt precedes startedAt`);
  const asOfEnd = new Date(`${asOf.toISOString().slice(0, 10)}T23:59:59.999Z`);
  if (completedAt && completedAt > asOfEnd) errors.push(`${evidenceId}: completedAt is after verification date`);

  const artifactPath = requireString(manifest.artifactPath, `${evidenceId} manifest artifactPath`, errors);
  let canonicalArtifact = null;
  if (artifactPath) {
    canonicalArtifact = await resolveRepositoryFile({
      repoRoot,
      canonicalRepoRoot,
      relativePath: artifactPath,
      label: evidenceId,
      kind: 'artifact',
      errors,
    });
    if (canonicalArtifact && path.resolve(canonicalArtifact) === path.resolve(resolvedPath)) {
      errors.push(`${evidenceId}: artifactPath must not reference the manifest itself`);
      canonicalArtifact = null;
    }
  }
  if (canonicalArtifact && /^sha256:[a-f0-9]{64}$/i.test(manifest.sourceChecksum ?? '')) {
    const canonicalBytes = await readFile(canonicalArtifact);
    const actualChecksum = `sha256:${createHash('sha256').update(canonicalBytes).digest('hex')}`;
    if (actualChecksum.toLowerCase() !== manifest.sourceChecksum.toLowerCase()) {
      errors.push(`${evidenceId}: artifact SHA-256 does not match sourceChecksum`);
    }
    try {
      const committedBytes = await readCommittedArtifact({
        repoRoot,
        sourceRevision: manifest.sourceRevision,
        artifactPath,
      });
      const committedChecksum = `sha256:${createHash('sha256').update(committedBytes).digest('hex')}`;
      if (committedChecksum.toLowerCase() !== manifest.sourceChecksum.toLowerCase()) {
        errors.push(`${evidenceId}: committed artifact SHA-256 does not match sourceChecksum`);
      }
    } catch {
      errors.push(`${evidenceId}: sourceRevision is not a reachable Git commit containing artifactPath`);
    }
  } else if (canonicalArtifact && typeof manifest.sourceRevision === 'string') {
    try {
      await readCommittedArtifact({ repoRoot, sourceRevision: manifest.sourceRevision, artifactPath });
    } catch {
      errors.push(`${evidenceId}: sourceRevision is not a reachable Git commit containing artifactPath`);
    }
  }

  const structurallyValid = errors.length === before;
  const cleanResult = manifest.executionResult === 'pass'
    && manifest.exceptions?.count === 0
    && manifest.exceptions?.disposition === 'none';
  return {
    validForCleanCycle: structurallyValid && cleanResult,
    completedAt,
    humanPerformerPersonId,
  };
}

async function validateMatrix(matrix, riskMarkdown, options) {
  const errors = [];
  const repoRoot = path.resolve(options.repoRoot);
  let canonicalRepoRoot;
  try {
    canonicalRepoRoot = await realpath(repoRoot);
  } catch {
    return { errors: [`repository root unavailable: ${options.repoRoot}`], counts: {} };
  }
  const asOf = parseDate(options.asOf);
  if (!asOf) return { errors: [`invalid --as-of date: ${options.asOf}`], counts: {} };
  if (!matrix || typeof matrix !== 'object' || Array.isArray(matrix)) {
    return { errors: ['matrix must be a JSON object'], counts: {} };
  }

  unexpectedFields(matrix, ROOT_FIELDS, 'matrix', errors);
  if (matrix.schemaVersion !== 3) errors.push(`matrix: unsupported schemaVersion ${matrix.schemaVersion}`);
  if (!MATRIX_STATUSES.has(matrix.matrixStatus)) errors.push(`matrix: invalid matrixStatus ${matrix.matrixStatus}`);
  const matrixAsOf = parseDate(matrix.asOf);
  if (!matrixAsOf) errors.push(`invalid matrix asOf ${matrix.asOf}`);
  else if (matrixAsOf > asOf) errors.push(`matrix asOf ${matrix.asOf} is after verification date ${options.asOf}`);

  if (!Array.isArray(matrix.scopeCategories) || matrix.scopeCategories.length === 0) {
    errors.push('matrix: scopeCategories must be a non-empty array');
  } else {
    const seen = new Set();
    for (const category of matrix.scopeCategories) {
      if (!CATEGORIES.has(category)) errors.push(`unsupported scope category ${category}`);
      if (seen.has(category)) errors.push(`duplicate scope category ${category}`);
      seen.add(category);
    }
    for (const category of CATEGORIES) {
      if (!seen.has(category)) errors.push(`missing scope category ${category}`);
    }
  }

  const controls = Array.isArray(matrix.controls) ? matrix.controls : [];
  if (controls.length === 0) errors.push('matrix: controls must be a non-empty array');
  const controlIds = new Set();
  const controlById = new Map();
  const evidenceIds = new Set();
  const operatingByCycle = new Map();
  const operatingReferencedCycles = new Set();
  const latestCompletionByCycle = new Map();
  const humanPerformerPersonIds = new Set();
  const evidenceCounts = { planning: 0, gap: 0, design: 0, operating: 0 };

  for (const [index, control] of controls.entries()) {
    const label = `control[${index}]`;
    if (!control || typeof control !== 'object' || Array.isArray(control)) {
      errors.push(`${label}: must be an object`);
      continue;
    }
    unexpectedFields(control, CONTROL_FIELDS, label, errors);
    const controlId = requireString(control.controlId, `${label} controlId`, errors);
    if (controlId && !/^[A-Z][A-Z0-9.-]*(?:-[A-Z0-9.]+)+$/.test(controlId)) errors.push(`${label}: invalid control ID ${controlId}`);
    if (controlIds.has(controlId)) errors.push(`duplicate control ID ${controlId}`);
    if (controlId) {
      controlIds.add(controlId);
      if (!controlById.has(controlId)) controlById.set(controlId, control);
    }

    const criterion = requireString(control.proposedCriterion, `${controlId || label} proposedCriterion`, errors);
    const category = requireString(control.category, `${controlId || label} category`, errors);
    if (!REQUIRED_CRITERIA_SET.has(criterion)) errors.push(`${controlId || label}: unsupported criterion ${criterion}`);
    if (!CATEGORIES.has(category)) errors.push(`${controlId || label}: invalid category ${category}`);
    if (criterion && category && categoryForCriterion(criterion) !== category) {
      errors.push(`${controlId || label}: criterion ${criterion} does not belong to ${category}`);
    }
    requireString(control.description, `${controlId || label} description`, errors, 30);

    const ownerRole = requireString(control.ownerRole, `${controlId || label} ownerRole`, errors, 3);
    if (PLACEHOLDER.test(ownerRole)) errors.push(`${controlId || label}: missing accountable owner`);
    if (!OWNER_STATUSES.has(control.ownerStatus)) errors.push(`${controlId || label}: invalid ownerStatus ${control.ownerStatus}`);
    if (control.ownerStatus === 'assigned') {
      const ownerName = requireString(control.ownerName, `${controlId || label} ownerName`, errors, 3);
      if (!ownerName || PLACEHOLDER.test(ownerName)) errors.push(`${controlId || label}: assigned owner requires ownerName`);
      const ownerPersonId = requirePersonId(control.ownerPersonId, `${controlId || label} ownerPersonId`, errors);
      if (!ownerPersonId) errors.push(`${controlId || label}: assigned owner requires ownerPersonId`);
    } else {
      if (control.ownerName !== undefined) errors.push(`${controlId || label}: ownerName is only allowed for an assigned owner`);
      if (control.ownerPersonId !== undefined) errors.push(`${controlId || label}: ownerPersonId is only allowed for an assigned owner`);
    }
    if (matrix.matrixStatus === 'Approved' && control.ownerStatus !== 'assigned') {
      errors.push(`${controlId || label}: approved matrix requires named-human owner assignment`);
    }
    if (!CADENCES.has(control.cadence)) errors.push(`${controlId || label}: invalid cadence ${control.cadence}`);
    if (!IMPLEMENTATION_STATUSES.has(control.implementationStatus)) {
      errors.push(`${controlId || label}: invalid implementationStatus ${control.implementationStatus}`);
    }
    requireInteger(control.retentionMonths, `${controlId || label} retentionMonths`, errors, 1, 120);
    requireInteger(control.exceptionSlaDays, `${controlId || label} exceptionSlaDays`, errors, 1, 90);

    const linkedRisks = new Set();
    if (!Array.isArray(control.linkedRisks) || control.linkedRisks.length === 0) {
      errors.push(`${controlId || label}: linkedRisks must be a non-empty array`);
    } else {
      for (const riskId of control.linkedRisks) {
        if (typeof riskId !== 'string' || !/^AUDIT-P[0-3]-[A-Z0-9-]+$/.test(riskId)) {
          errors.push(`${controlId || label}: invalid linked risk ${riskId}`);
        } else if (linkedRisks.has(riskId)) {
          errors.push(`${controlId || label}: duplicate linked risk ${riskId}`);
        }
        linkedRisks.add(riskId);
      }
    }

    const classes = new Set();
    if (!Array.isArray(control.evidenceSources) || control.evidenceSources.length === 0) {
      errors.push(`${controlId || label}: evidenceSources must be a non-empty array`);
    } else {
      for (const [sourceIndex, source] of control.evidenceSources.entries()) {
        const sourceLabel = `${controlId || label} evidence[${sourceIndex}]`;
        if (!source || typeof source !== 'object' || Array.isArray(source)) {
          errors.push(`${sourceLabel}: must be an object`);
          continue;
        }
        unexpectedFields(source, EVIDENCE_FIELDS, sourceLabel, errors);
        const evidenceId = requireString(source.evidenceId, `${sourceLabel} evidenceId`, errors);
        if (evidenceIds.has(evidenceId)) errors.push(`duplicate evidence ID ${evidenceId}`);
        if (evidenceId) evidenceIds.add(evidenceId);
        const evidenceClass = source.evidenceClass;
        if (!EVIDENCE_CLASSES.has(evidenceClass)) {
          errors.push(`${evidenceId || sourceLabel}: invalid evidenceClass ${evidenceClass}`);
        } else {
          classes.add(evidenceClass);
          evidenceCounts[evidenceClass] += 1;
        }
        requireString(source.description, `${evidenceId || sourceLabel} description`, errors, 20);

        const collectedOn = parseDate(source.collectedOn);
        if (!collectedOn) errors.push(`${evidenceId || sourceLabel}: invalid collectedOn ${source.collectedOn}`);
        else if (collectedOn > asOf) errors.push(`${evidenceId || sourceLabel}: collectedOn is in the future`);
        const maxAgeDays = requireInteger(source.maxAgeDays, `${evidenceId || sourceLabel} maxAgeDays`, errors, 1, 366);
        const cadenceCap = CADENCE_MAX_AGE_DAYS[control.cadence];
        if (maxAgeDays !== null && cadenceCap !== undefined && maxAgeDays > cadenceCap) {
          errors.push(`${evidenceId || sourceLabel}: maxAgeDays ${maxAgeDays} exceeds ${control.cadence} cadence cap ${cadenceCap}`);
        }
        if (collectedOn && maxAgeDays !== null) {
          const ageDays = Math.floor((asOf.getTime() - collectedOn.getTime()) / DAY_MS);
          if (ageDays > maxAgeDays) errors.push(`stale evidence ${evidenceId}: age=${ageDays}d max=${maxAgeDays}d`);
        }

        let operatingCycleId = '';
        if (evidenceClass === 'operating') {
          operatingCycleId = requireString(source.cycleId, `${evidenceId || sourceLabel} cycleId`, errors);
          if (operatingCycleId && !/^\d{4}-(?:Q[1-4]|\d{2})-[A-Z0-9-]+$/.test(operatingCycleId)) {
            errors.push(`${evidenceId || sourceLabel}: invalid cycleId ${operatingCycleId}`);
          }
          if (operatingCycleId) operatingReferencedCycles.add(operatingCycleId);
        } else if (source.cycleId !== undefined) {
          errors.push(`${evidenceId || sourceLabel}: non-operating evidence must not claim a cycleId`);
        }

        const evidencePath = requireString(source.path, `${evidenceId || sourceLabel} path`, errors);
        if (evidencePath) {
          const canonicalEvidence = await resolveRepositoryFile({
            repoRoot,
            canonicalRepoRoot,
            relativePath: evidencePath,
            label: evidenceId || sourceLabel,
            kind: 'evidence',
            errors,
          });
          if (canonicalEvidence && evidenceClass === 'operating') {
            const manifestResult = await validateOperatingManifest({
              source,
              controlId,
              resolvedPath: canonicalEvidence,
              repoRoot,
              canonicalRepoRoot,
              asOf,
              errors,
            });
            if (manifestResult.humanPerformerPersonId) {
              humanPerformerPersonIds.add(manifestResult.humanPerformerPersonId);
            }
            if (manifestResult.completedAt && operatingCycleId) {
              const latest = latestCompletionByCycle.get(operatingCycleId);
              if (!latest || manifestResult.completedAt > latest) {
                latestCompletionByCycle.set(operatingCycleId, manifestResult.completedAt);
              }
            }
            if (manifestResult.validForCleanCycle && operatingCycleId && controlId) {
              if (!operatingByCycle.has(operatingCycleId)) operatingByCycle.set(operatingCycleId, new Set());
              operatingByCycle.get(operatingCycleId).add(controlId);
            }
          }
          if (/(?:^|[\\/])RISK[-_]REGISTER\.md$/i.test(evidencePath) && evidenceClass === 'design') {
            errors.push(`${evidenceId || sourceLabel}: risk-register planning statement cannot be design evidence`);
          }
        }
      }
    }

    if (control.implementationStatus === 'planned' && !classes.has('planning') && !classes.has('gap')) {
      errors.push(`${controlId || label}: planned control requires planning or gap evidence`);
    }
    if (control.implementationStatus === 'planned' && classes.has('operating')) {
      errors.push(`${controlId || label}: planned control cannot have operating evidence`);
    }
    if (control.implementationStatus === 'designed' && !classes.has('design')) {
      errors.push(`${controlId || label}: designed control requires design evidence`);
    }
    if (control.implementationStatus === 'designed' && classes.has('operating')) {
      errors.push(`${controlId || label}: designed control cannot have operating evidence`);
    }
    if (control.implementationStatus === 'partially_operating' && (!classes.has('design') || !classes.has('operating'))) {
      errors.push(`${controlId || label}: partially_operating control requires design and operating evidence`);
    }
    if (control.implementationStatus === 'operating' && (!classes.has('design') || !classes.has('operating'))) {
      errors.push(`${controlId || label}: operating control requires design and operating evidence`);
    }
  }

  const requiredControlIds = new Set();
  if (!Array.isArray(matrix.requiredControlIds) || matrix.requiredControlIds.length === 0) {
    errors.push('matrix: requiredControlIds must be a non-empty array');
  } else {
    for (const controlId of matrix.requiredControlIds) {
      if (typeof controlId !== 'string' || !controlIds.has(controlId)) errors.push(`required control is absent from controls: ${controlId}`);
      if (requiredControlIds.has(controlId)) errors.push(`duplicate required control ID ${controlId}`);
      requiredControlIds.add(controlId);
    }
    for (const controlId of controlIds) {
      if (!requiredControlIds.has(controlId)) errors.push(`control ${controlId} is omitted from required population`);
    }
  }

  const mappedCriteria = new Set();
  const criterionCoverageCounts = { Mapped: 0, Planned: 0, Gap: 0, PendingCPA: 0 };
  if (!Array.isArray(matrix.criterionInventory)) {
    errors.push('matrix: criterionInventory must be an array');
  } else {
    for (const [index, mapping] of matrix.criterionInventory.entries()) {
      const label = `criterionInventory[${index}]`;
      if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) {
        errors.push(`${label}: must be an object`);
        continue;
      }
      unexpectedFields(mapping, CRITERION_FIELDS, label, errors);
      const criterion = requireString(mapping.criterion, `${label} criterion`, errors);
      const category = requireString(mapping.category, `${criterion || label} category`, errors);
      const coverageStatus = mapping.coverageStatus;
      if (!COVERAGE_STATUSES.has(coverageStatus)) {
        errors.push(`${criterion || label}: invalid coverageStatus ${coverageStatus}`);
      } else {
        criterionCoverageCounts[coverageStatus] += 1;
      }
      requireString(mapping.rationale, `${criterion || label} rationale`, errors, 30);
      if (mappedCriteria.has(criterion)) errors.push(`duplicate criterion mapping ${criterion}`);
      if (criterion) mappedCriteria.add(criterion);
      if (!REQUIRED_CRITERIA_SET.has(criterion)) errors.push(`${label}: unsupported criterion ${criterion}`);
      if (criterion && categoryForCriterion(criterion) !== category) errors.push(`${criterion}: criterion mapping category mismatch ${category}`);
      if (!Array.isArray(mapping.controlIds)) {
        errors.push(`${criterion || label}: controlIds must be an array`);
      } else {
        const mappedControls = new Set();
        for (const controlId of mapping.controlIds) {
          if (!controlIds.has(controlId)) errors.push(`${criterion || label}: mapped control is absent ${controlId}`);
          if (mappedControls.has(controlId)) errors.push(`${criterion || label}: duplicate mapped control ${controlId}`);
          mappedControls.add(controlId);
        }
        if (coverageStatus === 'Mapped') {
          if (mapping.controlIds.length === 0) errors.push(`${criterion || label}: Mapped criterion requires one or more control IDs`);
          for (const controlId of mapping.controlIds) {
            if (controlById.get(controlId)?.implementationStatus === 'planned') {
              errors.push(`${criterion || label}: Mapped criterion cannot rely on planned control ${controlId}`);
            }
          }
        }
        if (coverageStatus === 'Planned') {
          if (mapping.controlIds.length === 0) errors.push(`${criterion || label}: Planned criterion requires one or more planned control IDs`);
          if (mapping.controlIds.length > 0 && !mapping.controlIds.some((controlId) => controlById.get(controlId)?.implementationStatus === 'planned')) {
            errors.push(`${criterion || label}: Planned criterion requires at least one planned control`);
          }
        }
        if ((coverageStatus === 'Gap' || coverageStatus === 'PendingCPA') && mapping.controlIds.length > 0) {
          errors.push(`${criterion || label}: ${coverageStatus} criterion must not claim mapped control IDs`);
        }
      }
      if (matrix.matrixStatus === 'Approved' && coverageStatus !== 'Mapped') {
        errors.push(`${criterion || label}: Approved matrix requires Mapped criterion coverage`);
      }
    }
  }
  for (const criterion of REQUIRED_CRITERIA) {
    if (!mappedCriteria.has(criterion)) errors.push(`missing criterion mapping ${criterion}`);
  }
  for (const [controlId, control] of controlById) {
    const mapping = matrix.criterionInventory?.find((item) => item?.criterion === control.proposedCriterion);
    if (mapping && ['Gap', 'PendingCPA'].includes(mapping.coverageStatus)) {
      errors.push(`${controlId}: proposedCriterion ${control.proposedCriterion} cannot target ${mapping.coverageStatus} coverage`);
    } else if (mapping && ['Mapped', 'Planned'].includes(mapping.coverageStatus) && !mapping.controlIds.includes(controlId)) {
      errors.push(`${controlId}: proposedCriterion ${control.proposedCriterion} does not map back to control`);
    }
  }

  const riskMappings = parseRiskRegister(riskMarkdown, errors);
  const registeredRiskIds = new Set(riskMappings.keys());
  for (const [riskId, linkedControl] of riskMappings) {
    if (!controlIds.has(linkedControl)) {
      errors.push(`${riskId}: linked control ${linkedControl} is absent from matrix`);
    } else if (!controlById.get(linkedControl)?.linkedRisks?.includes(riskId)) {
      errors.push(`${riskId}: linked control ${linkedControl} does not link back to risk`);
    }
  }
  for (const [controlId, control] of controlById) {
    for (const riskId of control.linkedRisks ?? []) {
      if (!registeredRiskIds.has(riskId)) {
        errors.push(`${controlId}: linked risk ${riskId} is absent from risk register`);
      }
    }
  }

  const cycleIds = new Set();
  const ownerPersonIds = new Set(
    [...requiredControlIds]
      .map((controlId) => controlById.get(controlId)?.ownerPersonId)
      .filter(Boolean),
  );
  const asOfEnd = new Date(`${asOf.toISOString().slice(0, 10)}T23:59:59.999Z`);
  let cleanOperatingCycles = 0;
  if (!Array.isArray(matrix.operatingCycles)) {
    errors.push('matrix: operatingCycles must be an array');
  } else {
    if (matrix.matrixStatus === 'Draft' && matrix.operatingCycles.length > 0) {
      errors.push('Draft matrix cannot claim operating cycles');
    }
    for (const [index, cycle] of matrix.operatingCycles.entries()) {
      const label = `operatingCycles[${index}]`;
      if (!cycle || typeof cycle !== 'object' || Array.isArray(cycle)) {
        errors.push(`${label}: must be an object`);
        continue;
      }
      unexpectedFields(cycle, CYCLE_FIELDS, label, errors);
      const cycleId = requireString(cycle.cycleId, `${label} cycleId`, errors);
      if (cycleIds.has(cycleId)) errors.push(`duplicate operating cycle ${cycleId}`);
      if (cycleId) cycleIds.add(cycleId);
      if (cycleId && !/^\d{4}-(?:Q[1-4]|\d{2})-[A-Z0-9-]+$/.test(cycleId)) errors.push(`${label}: invalid cycleId ${cycleId}`);
      const reviewedOn = parseTimestamp(cycle.reviewedOn);
      if (!reviewedOn) errors.push(`${cycleId || label}: invalid reviewedOn ${cycle.reviewedOn}`);
      else if (reviewedOn > asOfEnd) errors.push(`${cycleId || label}: reviewedOn is in the future`);
      const reviewerName = requireString(cycle.reviewerName, `${cycleId || label} reviewerName`, errors, 3);
      const reviewerPersonId = requirePersonId(cycle.reviewerPersonId, `${cycleId || label} reviewerPersonId`, errors);
      const reviewerRole = requireString(cycle.reviewerRole, `${cycleId || label} reviewerRole`, errors, 3);
      if (PLACEHOLDER.test(reviewerName) || PLACEHOLDER.test(reviewerRole)) errors.push(`${cycleId || label}: independent reviewer is missing`);
      let independent = Boolean(reviewerPersonId);
      if (reviewerPersonId && ownerPersonIds.has(reviewerPersonId)) {
        errors.push(`${cycleId || label}: reviewerPersonId matches a required control owner`);
        independent = false;
      }
      if (reviewerPersonId && humanPerformerPersonIds.has(reviewerPersonId)) {
        errors.push(`${cycleId || label}: reviewerPersonId matches a human control performer`);
        independent = false;
      }
      const latestCompletion = latestCompletionByCycle.get(cycleId);
      if (reviewedOn && latestCompletion && reviewedOn < latestCompletion) {
        errors.push(`${cycleId || label}: reviewedOn precedes latest manifest completion`);
        independent = false;
      }
      if (!REVIEW_DECISIONS.has(cycle.decision)) errors.push(`${cycleId || label}: invalid review decision ${cycle.decision}`);
      requireString(cycle.decisionDetail, `${cycleId || label} decisionDetail`, errors, 30);

      const evidencedControls = operatingByCycle.get(cycleId) ?? new Set();
      let complete = true;
      for (const controlId of requiredControlIds) {
        if (!evidencedControls.has(controlId)) {
          errors.push(`cycle ${cycleId} missing operating evidence for ${controlId}`);
          complete = false;
        }
      }
      if (matrix.matrixStatus === 'Approved' && complete && independent && cycle.decision === 'clean') {
        cleanOperatingCycles += 1;
      }
    }
  }
  for (const cycleId of operatingReferencedCycles) {
    if (!cycleIds.has(cycleId)) errors.push(`operating evidence references unreviewed cycle ${cycleId}`);
  }
  for (const controlId of requiredControlIds) {
    if (controlById.get(controlId)?.implementationStatus === 'operating') {
      const inCleanCycle = [...cycleIds].some((cycleId) => {
        const cycle = matrix.operatingCycles?.find((item) => item?.cycleId === cycleId);
        return cycle?.decision === 'clean' && (operatingByCycle.get(cycleId)?.has(controlId) ?? false);
      });
      if (!inCleanCycle) errors.push(`${controlId}: operating status requires evidence in a clean reviewed cycle`);
    }
  }

  return {
    errors,
    counts: {
      controls: controlIds.size,
      criteria: mappedCriteria.size,
      mappedCriteria: criterionCoverageCounts.Mapped,
      plannedCriteria: criterionCoverageCounts.Planned,
      gapCriteria: criterionCoverageCounts.Gap,
      pendingCpaCriteria: criterionCoverageCounts.PendingCPA,
      planningSources: evidenceCounts.planning,
      gapSources: evidenceCounts.gap,
      designSources: evidenceCounts.design,
      operatingSources: evidenceCounts.operating,
      operatingCycles: cleanOperatingCycles,
    },
  };
}

try {
  const cli = parseCli(process.argv.slice(2));
  const matrix = JSON.parse(await readFile(path.resolve(cli.matrix), 'utf8'));
  const riskMarkdown = await readFile(path.resolve(cli.riskRegister), 'utf8');
  const result = await validateMatrix(matrix, riskMarkdown, cli);
  if (result.errors.length) {
    for (const error of result.errors) console.error(error);
    process.exitCode = 1;
  } else {
    const counts = result.counts;
    console.log(
      `control_evidence_ok controls=${counts.controls} criteria=${counts.criteria} mapped_criteria=${counts.mappedCriteria} planned_criteria=${counts.plannedCriteria} gap_criteria=${counts.gapCriteria} pending_cpa_criteria=${counts.pendingCpaCriteria} design_sources=${counts.designSources} planning_sources=${counts.planningSources} gap_sources=${counts.gapSources} operating_sources=${counts.operatingSources} operating_cycles=${counts.operatingCycles} status=${matrix.matrixStatus}${cli.dryRun ? ' mode=dry-run' : ''}`,
    );
  }
} catch (error) {
  console.error(`control evidence unavailable: ${error.message}`);
  process.exitCode = 1;
}
