import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1ProductCopyApprovalPacket,
  GavanWeek1ProductCopyIssueCode,
} from './personal_plan_gavan_week1_product_copy_approval_packet';

export const GAVAN_WEEK1_PRODUCT_COPY_SIGNATURE_REQUEST_PACKET_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-product-copy-signature-request-packet.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

export type GavanWeek1ProductCopySignatureRequestStatus =
  'product_copy_signature_request_only_not_signed';

export type GavanWeek1ProductCopySignatureRequestBlocker =
  | 'copy_checks_failed';

export type GavanWeek1ProductCopySignatureRequestPacket = {
  kind: 'gavan_week1_product_copy_signature_request_packet';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  status: GavanWeek1ProductCopySignatureRequestStatus;
  sourcePacketStatus: GavanWeek1ProductCopyApprovalPacket['status'];
  targetWorkPackageId: 'product_copy_review';
  blockerStillOpen: 'missing_signature:product_copy';
  requiredOwnerRole: 'content_quality_owner';
  signatureStatus: 'missing';
  readyToRequestSignature: boolean;
  signatureMayBeInferred: false;
  catalogRoutePlanningBlocked: true;
  liveEditsAllowed: false;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  evidenceSummary: {
    copyChecksPass: boolean;
    daysChecked: number;
    daysPassing: number;
    daysFailing: number;
    totalCopyIssues: number;
    blockingIssueCodes: GavanWeek1ProductCopyIssueCode[];
  };
  requestBlockers: GavanWeek1ProductCopySignatureRequestBlocker[];
  requestChecklist: string[];
  approvalInstruction: string;
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
    liveFilesEdited: false;
  };
};

export type GavanWeek1ProductCopySignatureRequestPacketOptions = {
  generatedAt: string;
};

export type GavanWeek1ProductCopySignatureRequestPacketWriteOptions =
  GavanWeek1ProductCopySignatureRequestPacketOptions & {
    targetPath: string;
  };

export type GavanWeek1ProductCopySignatureRequestPacketIssueCode =
  | 'wrong_packet_kind'
  | 'wrong_packet_status'
  | 'signature_already_present'
  | 'source_writes_not_allowed'
  | 'target_path_not_allowed';

export type GavanWeek1ProductCopySignatureRequestPacketIssue = {
  code: GavanWeek1ProductCopySignatureRequestPacketIssueCode;
  detail: string;
};

export type GavanWeek1ProductCopySignatureRequestPacketBuildResult = {
  valid: boolean;
  issues: GavanWeek1ProductCopySignatureRequestPacketIssue[];
  request?: GavanWeek1ProductCopySignatureRequestPacket;
};

export type GavanWeek1ProductCopySignatureRequestPacketWriteResult =
  GavanWeek1ProductCopySignatureRequestPacketBuildResult & {
    targetPath?: string;
    bytesWritten?: number;
  };

function issue(
  code: GavanWeek1ProductCopySignatureRequestPacketIssueCode,
  detail: string,
): GavanWeek1ProductCopySignatureRequestPacketIssue {
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

export function isGavanWeek1ProductCopySignatureRequestPacketTargetAllowed(
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

function hasUnsafeSourceWriteFlags(packet: GavanWeek1ProductCopyApprovalPacket): boolean {
  const unsafe = packet as unknown as {
    sourceWritesUsed?: boolean;
    phaseWriteTargets?: unknown[];
  };

  return unsafe.sourceWritesUsed === true ||
    (Array.isArray(unsafe.phaseWriteTargets) && unsafe.phaseWriteTargets.length > 0);
}

function signatureStatus(packet: GavanWeek1ProductCopyApprovalPacket): string | undefined {
  return (packet as unknown as { signatureStatus?: string }).signatureStatus;
}

function requestBlockers(
  packet: GavanWeek1ProductCopyApprovalPacket,
): GavanWeek1ProductCopySignatureRequestBlocker[] {
  return packet.copyChecksPass ? [] : ['copy_checks_failed'];
}

function evidenceSummary(
  packet: GavanWeek1ProductCopyApprovalPacket,
): GavanWeek1ProductCopySignatureRequestPacket['evidenceSummary'] {
  return {
    copyChecksPass: packet.copyChecksPass,
    daysChecked: packet.summary.daysChecked,
    daysPassing: packet.summary.daysPassing,
    daysFailing: packet.summary.daysFailing,
    totalCopyIssues: packet.summary.totalIssues,
    blockingIssueCodes: packet.summary.blockingIssueCodes,
  };
}

function requestChecklist(): string[] {
  return [
    'Review the P3.72 product copy approval packet.',
    'Confirm the copy remains broad, social, and non-robotic.',
    'Confirm no narrow name, phone, email, or apartment anchors are required for week 1.',
    'Confirm explanation cards are safe after both correct and wrong answers.',
    'Add explicit content-quality signature metadata in a separate signed artifact if approved.',
  ];
}

export function buildGavanWeek1ProductCopySignatureRequestPacket(
  packet: GavanWeek1ProductCopyApprovalPacket,
  options: GavanWeek1ProductCopySignatureRequestPacketOptions,
): GavanWeek1ProductCopySignatureRequestPacketBuildResult {
  const issues: GavanWeek1ProductCopySignatureRequestPacketIssue[] = [];

  if (packet.kind !== 'gavan_week1_product_copy_approval_packet') {
    issues.push(issue(
      'wrong_packet_kind',
      'Signature request requires a Gavan week 1 product copy approval packet.',
    ));
  }

  if (packet.status !== 'product_copy_approval_packet_only_not_applied') {
    issues.push(issue(
      'wrong_packet_status',
      'Signature request requires a non-applied product copy approval packet.',
    ));
  }

  if (signatureStatus(packet) !== 'missing') {
    issues.push(issue(
      'signature_already_present',
      'Signature request cannot infer or overwrite an existing content-quality signature.',
    ));
  }

  if (hasUnsafeSourceWriteFlags(packet)) {
    issues.push(issue(
      'source_writes_not_allowed',
      'Signature request must start from a read-only packet with no phase write targets.',
    ));
  }

  if (issues.length > 0) {
    return { valid: false, issues };
  }

  const blockers = requestBlockers(packet);

  return {
    valid: true,
    issues: [],
    request: {
      kind: 'gavan_week1_product_copy_signature_request_packet',
      generatedAt: options.generatedAt,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'product_copy_signature_request_only_not_signed',
      sourcePacketStatus: packet.status,
      targetWorkPackageId: 'product_copy_review',
      blockerStillOpen: 'missing_signature:product_copy',
      requiredOwnerRole: 'content_quality_owner',
      signatureStatus: 'missing',
      readyToRequestSignature: packet.copyChecksPass && blockers.length === 0,
      signatureMayBeInferred: false,
      catalogRoutePlanningBlocked: true,
      liveEditsAllowed: false,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
      evidenceSummary: evidenceSummary(packet),
      requestBlockers: blockers,
      requestChecklist: requestChecklist(),
      approvalInstruction:
        'Do not mark this signed automatically. Create a separate signed artifact only after explicit content-quality owner approval.',
      writePolicy: {
        dryRunOnly: true,
        allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
        liveFilesEdited: false,
      },
    },
  };
}

export function serializeGavanWeek1ProductCopySignatureRequestPacket(
  request: GavanWeek1ProductCopySignatureRequestPacket,
): string {
  return `${JSON.stringify(request, null, 2)}\n`;
}

export function writeGavanWeek1ProductCopySignatureRequestPacket(
  packet: GavanWeek1ProductCopyApprovalPacket,
  options: GavanWeek1ProductCopySignatureRequestPacketWriteOptions,
): GavanWeek1ProductCopySignatureRequestPacketWriteResult {
  const buildResult = buildGavanWeek1ProductCopySignatureRequestPacket(packet, options);
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!buildResult.valid || !buildResult.request) {
    return buildResult;
  }

  if (!isGavanWeek1ProductCopySignatureRequestPacketTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Product copy signature request packet can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const serialized = serializeGavanWeek1ProductCopySignatureRequestPacket(buildResult.request);
  mkdirSync(path.dirname(resolvedTargetPath), { recursive: true });
  writeFileSync(resolvedTargetPath, serialized, 'utf8');

  return {
    valid: true,
    issues: [],
    targetPath: resolvedTargetPath,
    bytesWritten: Buffer.byteLength(serialized, 'utf8'),
    request: buildResult.request,
  };
}
