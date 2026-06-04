import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1BlockerResolutionRoadmap,
  GavanWeek1BlockerResolutionWorkPackage,
} from './personal_plan_gavan_week1_blocker_resolution_roadmap';

export const GAVAN_WEEK1_PRODUCT_COPY_APPROVAL_PACKET_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-product-copy-approval-packet.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

const MOJIBAKE_MARKER_RE = /[\u00d0\u00d1\u00c2\u00e2\ufffd]/;
const DEVELOPER_OR_ROBOTIC_COPY_RE =
  /\b(DEV|debug|draft|placeholder|TODO|renderer|contentUnit|sourcePhraseId|technical access|selected option)\b/i;
const FAKE_SELECTED_ANSWER_CONTEXT_RE =
  /\b(you chose|selected (?:choice|option|answer)|you clicked|you tapped)\b/i;
const NARROW_ANCHOR_RE =
  /\b(my phone number|phone number|my number|email|my email|my name|apartment|flat|viewing|landlord|rent|alex|beta\d+)\b/i;
const FORBIDDEN_USER_FACING_TERM_RE = /\b(scene|scenario|route)\b/i;

export type GavanWeek1ProductCopyApprovalPacketStatus =
  'product_copy_approval_packet_only_not_applied';

export type GavanWeek1ProductCopyIssueCode =
  | 'invalid_day_artifact'
  | 'non_approved_row'
  | 'approval_metadata_missing'
  | 'mojibake_marker'
  | 'developer_or_robotic_copy'
  | 'fake_selected_answer_context'
  | 'wrong_answer_context_not_safe'
  | 'narrow_anchor_present'
  | 'forbidden_user_facing_term'
  | 'missing_explanation_coverage';

export type GavanWeek1ProductCopyApprovalPacketIssueCode =
  | 'wrong_roadmap_kind'
  | 'wrong_roadmap_status'
  | 'source_writes_not_allowed'
  | 'implementation_already_allowed'
  | 'product_copy_package_missing'
  | 'product_copy_package_not_first'
  | 'target_path_not_allowed';

export type GavanWeek1ProductCopyDayIssue = {
  code: GavanWeek1ProductCopyIssueCode;
  rowId?: string;
  field?: string;
  detail: string;
  excerpt: string;
};

export type GavanWeek1ProductCopyDayCheck = {
  dayId: string;
  dayIndex: number;
  artifactKind: string;
  liveIntegration: boolean;
  contentUnits: number;
  explanationCards: number;
  exerciseBlueprints: number;
  checkedTextFields: number;
  passed: boolean;
  issues: GavanWeek1ProductCopyDayIssue[];
};

export type GavanWeek1ProductCopyApprovalPacket = {
  kind: 'gavan_week1_product_copy_approval_packet';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  status: GavanWeek1ProductCopyApprovalPacketStatus;
  sourceRoadmapStatus: GavanWeek1BlockerResolutionRoadmap['status'];
  targetWorkPackageId: 'product_copy_review';
  targetBlockerIds: ['missing_signature:product_copy'];
  signatureStatus: 'missing';
  approvalReady: false;
  copyChecksPass: boolean;
  liveEditsAllowed: false;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  summary: {
    daysChecked: number;
    daysPassing: number;
    daysFailing: number;
    totalIssues: number;
    blockingIssueCodes: GavanWeek1ProductCopyIssueCode[];
  };
  dayChecks: GavanWeek1ProductCopyDayCheck[];
  approvalPolicy: {
    requiredOwnerRole: 'content_quality_owner';
    mustRemainNonLiveUntilSigned: true;
    missingSignatureBlockerId: 'missing_signature:product_copy';
  };
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
    liveFilesEdited: false;
  };
};

export type GavanWeek1ProductCopyApprovalPacketOptions = {
  generatedAt: string;
};

export type GavanWeek1ProductCopyApprovalPacketWriteOptions =
  GavanWeek1ProductCopyApprovalPacketOptions & {
    targetPath: string;
  };

export type GavanWeek1ProductCopyApprovalPacketIssue = {
  code: GavanWeek1ProductCopyApprovalPacketIssueCode;
  detail: string;
};

export type GavanWeek1ProductCopyApprovalPacketBuildResult = {
  valid: boolean;
  issues: GavanWeek1ProductCopyApprovalPacketIssue[];
  packet?: GavanWeek1ProductCopyApprovalPacket;
};

export type GavanWeek1ProductCopyApprovalPacketWriteResult =
  GavanWeek1ProductCopyApprovalPacketBuildResult & {
    targetPath?: string;
    bytesWritten?: number;
  };

type ApprovedRowLike = {
  id?: string;
  reviewStatus?: string;
  approval?: unknown;
  english?: string;
  meaningRu?: string;
  body?: string;
  purpose?: string;
  wrongAnswerSafe?: boolean;
  newWords?: string[];
  firstSeenConstructions?: string[];
  covers?: string[];
};

type ApprovedArtifactLike = {
  kind?: string;
  planId?: string;
  weekId?: string;
  dayId?: string;
  dayIndex?: number;
  liveIntegration?: boolean;
  contentUnitRows?: ApprovedRowLike[];
  explanationRows?: ApprovedRowLike[];
  exerciseRows?: ApprovedRowLike[];
};

function issue(
  code: GavanWeek1ProductCopyApprovalPacketIssueCode,
  detail: string,
): GavanWeek1ProductCopyApprovalPacketIssue {
  return { code, detail };
}

function withTrailingSeparator(value: string): string {
  const resolved = path.resolve(value);
  return resolved.endsWith(path.sep) ? resolved : `${resolved}${path.sep}`;
}

function isInside(target: string, parentWithSeparator: string): boolean {
  return target === parentWithSeparator.slice(0, -1) || target.startsWith(parentWithSeparator);
}

function allowedRootPaths(cwd = process.cwd()): string[] {
  return ALLOWED_TARGET_ROOTS.map((segments) =>
    withTrailingSeparator(path.join(cwd, ...segments)),
  );
}

export function isGavanWeek1ProductCopyApprovalPacketTargetAllowed(
  targetPath: string,
  cwd = process.cwd(),
): boolean {
  const resolvedTarget = path.resolve(cwd, targetPath);
  const rootWithSeparator = withTrailingSeparator(cwd);

  if (!isInside(resolvedTarget, rootWithSeparator)) {
    return false;
  }

  return allowedRootPaths(cwd).some((allowedRoot) => isInside(resolvedTarget, allowedRoot));
}

function hasUnsafeSourceWriteFlags(roadmap: GavanWeek1BlockerResolutionRoadmap): boolean {
  const unsafe = roadmap as unknown as {
    sourceWritesUsed?: boolean;
    phaseWriteTargets?: unknown[];
  };

  return unsafe.sourceWritesUsed === true ||
    (Array.isArray(unsafe.phaseWriteTargets) && unsafe.phaseWriteTargets.length > 0);
}

function productCopyPackage(
  roadmap: GavanWeek1BlockerResolutionRoadmap,
): GavanWeek1BlockerResolutionWorkPackage | undefined {
  return roadmap.workPackages.find((workPackage) => workPackage.id === 'product_copy_review');
}

function cleanExcerpt(value: string): string {
  const compact = value.replace(/\s+/g, ' ').trim();
  const markerFree = compact.replace(MOJIBAKE_MARKER_RE, '?');
  return markerFree.length <= 120 ? markerFree : `${markerFree.slice(0, 117)}...`;
}

function dayIssue(
  code: GavanWeek1ProductCopyIssueCode,
  detail: string,
  row?: ApprovedRowLike,
  field?: string,
  text = '',
): GavanWeek1ProductCopyDayIssue {
  return {
    code,
    rowId: row?.id,
    field,
    detail,
    excerpt: cleanExcerpt(text),
  };
}

function textFieldsFor(row: ApprovedRowLike): Array<{ field: string; value: string }> {
  return [
    ['english', row.english],
    ['meaningRu', row.meaningRu],
    ['body', row.body],
    ['purpose', row.purpose],
  ]
    .filter((entry): entry is [string, string] =>
      typeof entry[1] === 'string' && entry[1].trim().length > 0
    )
    .map(([field, value]) => ({ field, value }));
}

function allRows(artifact: ApprovedArtifactLike): ApprovedRowLike[] {
  return [
    ...(artifact.contentUnitRows ?? []),
    ...(artifact.explanationRows ?? []),
    ...(artifact.exerciseRows ?? []),
  ];
}

function explanationCoverageIssues(
  artifact: ApprovedArtifactLike,
): GavanWeek1ProductCopyDayIssue[] {
  const covered = new Set(
    (artifact.explanationRows ?? [])
      .flatMap((row) => row.covers ?? [])
      .map((value) => value.toLowerCase()),
  );

  const issues: GavanWeek1ProductCopyDayIssue[] = [];
  for (const row of artifact.contentUnitRows ?? []) {
    const needsCoverage = [
      ...(row.newWords ?? []),
      ...(row.firstSeenConstructions ?? []),
    ];
    const missing = needsCoverage.filter((value) => !covered.has(value.toLowerCase()));
    if (missing.length > 0) {
      issues.push(dayIssue(
        'missing_explanation_coverage',
        `Missing explanation coverage for: ${missing.join(', ')}.`,
        row,
        'newWords',
        missing.join(', '),
      ));
    }
  }

  return issues;
}

function rowIssues(row: ApprovedRowLike): GavanWeek1ProductCopyDayIssue[] {
  const issues: GavanWeek1ProductCopyDayIssue[] = [];

  if (row.reviewStatus !== 'approved') {
    issues.push(dayIssue(
      'non_approved_row',
      'Product copy packet can only review approved rows.',
      row,
    ));
  }

  if (!row.approval) {
    issues.push(dayIssue(
      'approval_metadata_missing',
      'Approved row must carry approval metadata before product copy review.',
      row,
    ));
  }

  if (row.body && row.wrongAnswerSafe !== true) {
    issues.push(dayIssue(
      'wrong_answer_context_not_safe',
      'Explanation must be safe after both correct and wrong answers.',
      row,
      'wrongAnswerSafe',
      row.body,
    ));
  }

  for (const { field, value } of textFieldsFor(row)) {
    if (MOJIBAKE_MARKER_RE.test(value)) {
      issues.push(dayIssue(
        'mojibake_marker',
        'Learner-facing copy cannot contain mojibake or replacement characters.',
        row,
        field,
        value,
      ));
    }

    if (DEVELOPER_OR_ROBOTIC_COPY_RE.test(value)) {
      issues.push(dayIssue(
        'developer_or_robotic_copy',
        'Learner-facing copy cannot contain developer, placeholder, or internal-system wording.',
        row,
        field,
        value,
      ));
    }

    if (FAKE_SELECTED_ANSWER_CONTEXT_RE.test(value)) {
      issues.push(dayIssue(
        'fake_selected_answer_context',
        'Static explanations cannot pretend to know which wrong option the learner selected.',
        row,
        field,
        value,
      ));
    }

    if (NARROW_ANCHOR_RE.test(value)) {
      issues.push(dayIssue(
        'narrow_anchor_present',
        'Week 1 copy must stay broad and socially reusable, not anchored to names, phones, emails, or apartments.',
        row,
        field,
        value,
      ));
    }

    if (FORBIDDEN_USER_FACING_TERM_RE.test(value)) {
      issues.push(dayIssue(
        'forbidden_user_facing_term',
        'User-facing copy must not use banned route, scene, or scenario wording in this packet.',
        row,
        field,
        value,
      ));
    }
  }

  return issues;
}

function checkedTextFieldCount(artifact: ApprovedArtifactLike): number {
  return allRows(artifact).reduce((sum, row) => sum + textFieldsFor(row).length, 0);
}

function dayCheck(artifactValue: unknown): GavanWeek1ProductCopyDayCheck {
  const artifact = artifactValue as ApprovedArtifactLike;
  const issues: GavanWeek1ProductCopyDayIssue[] = [];

  if (
    artifact.planId !== 'gavan' ||
    artifact.weekId !== 'gavan-week1' ||
    typeof artifact.dayId !== 'string' ||
    typeof artifact.dayIndex !== 'number' ||
    artifact.liveIntegration !== false
  ) {
    issues.push(dayIssue(
      'invalid_day_artifact',
      'Product copy packet requires a non-live Gavan week 1 approved day artifact.',
    ));
  }

  for (const row of allRows(artifact)) {
    issues.push(...rowIssues(row));
  }
  issues.push(...explanationCoverageIssues(artifact));

  return {
    dayId: artifact.dayId ?? 'unknown-day',
    dayIndex: artifact.dayIndex ?? 0,
    artifactKind: artifact.kind ?? 'unknown-artifact',
    liveIntegration: artifact.liveIntegration === true,
    contentUnits: artifact.contentUnitRows?.length ?? 0,
    explanationCards: artifact.explanationRows?.length ?? 0,
    exerciseBlueprints: artifact.exerciseRows?.length ?? 0,
    checkedTextFields: checkedTextFieldCount(artifact),
    passed: issues.length === 0,
    issues,
  };
}

function summary(
  dayChecks: GavanWeek1ProductCopyDayCheck[],
): GavanWeek1ProductCopyApprovalPacket['summary'] {
  const issueCodes = new Set<GavanWeek1ProductCopyIssueCode>();
  let totalIssues = 0;

  for (const check of dayChecks) {
    totalIssues += check.issues.length;
    for (const item of check.issues) {
      issueCodes.add(item.code);
    }
  }

  return {
    daysChecked: dayChecks.length,
    daysPassing: dayChecks.filter((check) => check.passed).length,
    daysFailing: dayChecks.filter((check) => !check.passed).length,
    totalIssues,
    blockingIssueCodes: [...issueCodes].sort(),
  };
}

export function buildGavanWeek1ProductCopyApprovalPacket(
  roadmap: GavanWeek1BlockerResolutionRoadmap,
  approvedArtifacts: unknown[],
  options: GavanWeek1ProductCopyApprovalPacketOptions,
): GavanWeek1ProductCopyApprovalPacketBuildResult {
  const issues: GavanWeek1ProductCopyApprovalPacketIssue[] = [];

  if (roadmap.kind !== 'gavan_week1_blocker_resolution_roadmap') {
    issues.push(issue(
      'wrong_roadmap_kind',
      'Product copy approval packet requires the P3.71 blocker resolution roadmap.',
    ));
  }

  if (roadmap.status !== 'blocker_resolution_roadmap_only_not_applied') {
    issues.push(issue(
      'wrong_roadmap_status',
      'Product copy approval packet requires a non-applied blocker roadmap.',
    ));
  }

  if (roadmap.implementationTaskAllowed) {
    issues.push(issue(
      'implementation_already_allowed',
      'Product copy approval packet cannot start from a roadmap that already allows implementation.',
    ));
  }

  if (hasUnsafeSourceWriteFlags(roadmap)) {
    issues.push(issue(
      'source_writes_not_allowed',
      'Product copy approval packet must start from a read-only roadmap with no phase write targets.',
    ));
  }

  const packageValue = productCopyPackage(roadmap);
  if (!packageValue) {
    issues.push(issue(
      'product_copy_package_missing',
      'Roadmap must include the product_copy_review work package.',
    ));
  } else {
    if (packageValue.order !== 1) {
      issues.push(issue(
        'product_copy_package_not_first',
        'Product copy review must be the first blocker resolution package.',
      ));
    }
  }

  if (issues.length > 0) {
    return { valid: false, issues };
  }

  const checks = approvedArtifacts
    .map(dayCheck)
    .sort((left, right) => left.dayIndex - right.dayIndex);
  const packetSummary = summary(checks);

  return {
    valid: true,
    issues: [],
    packet: {
      kind: 'gavan_week1_product_copy_approval_packet',
      generatedAt: options.generatedAt,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'product_copy_approval_packet_only_not_applied',
      sourceRoadmapStatus: roadmap.status,
      targetWorkPackageId: 'product_copy_review',
      targetBlockerIds: ['missing_signature:product_copy'],
      signatureStatus: 'missing',
      approvalReady: false,
      copyChecksPass: packetSummary.daysFailing === 0,
      liveEditsAllowed: false,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
      summary: packetSummary,
      dayChecks: checks,
      approvalPolicy: {
        requiredOwnerRole: 'content_quality_owner',
        mustRemainNonLiveUntilSigned: true,
        missingSignatureBlockerId: 'missing_signature:product_copy',
      },
      writePolicy: {
        dryRunOnly: true,
        allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
        liveFilesEdited: false,
      },
    },
  };
}

export function serializeGavanWeek1ProductCopyApprovalPacket(
  packet: GavanWeek1ProductCopyApprovalPacket,
): string {
  return `${JSON.stringify(packet, null, 2)}\n`;
}

export function writeGavanWeek1ProductCopyApprovalPacket(
  roadmap: GavanWeek1BlockerResolutionRoadmap,
  approvedArtifacts: unknown[],
  options: GavanWeek1ProductCopyApprovalPacketWriteOptions,
): GavanWeek1ProductCopyApprovalPacketWriteResult {
  const buildResult = buildGavanWeek1ProductCopyApprovalPacket(roadmap, approvedArtifacts, options);
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!buildResult.valid || !buildResult.packet) {
    return buildResult;
  }

  if (!isGavanWeek1ProductCopyApprovalPacketTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Product copy approval packet can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const serialized = serializeGavanWeek1ProductCopyApprovalPacket(buildResult.packet);
  mkdirSync(path.dirname(resolvedTargetPath), { recursive: true });
  writeFileSync(resolvedTargetPath, serialized, 'utf8');

  return {
    valid: true,
    issues: [],
    targetPath: resolvedTargetPath,
    bytesWritten: Buffer.byteLength(serialized, 'utf8'),
    packet: buildResult.packet,
  };
}
