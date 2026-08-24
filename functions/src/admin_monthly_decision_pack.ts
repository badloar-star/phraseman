import { createHash } from 'node:crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import {
  hasVerifiedCallablePermission,
  roleFromAdminToken,
} from './admin/permissions';
import { ENFORCE_APP_CHECK_ADMIN } from './callable_options';
import {
  DECISION_PACK_FILE_NAMES,
  buildMonthlyDecisionPackFiles,
  resolveMonthlyReportingWindow,
  type DecisionPackInput,
  type MonthlyReportingWindow,
} from './monthly_decision_pack_core';
import { loadDecisionPackAggregateInput } from './monthly_decision_pack_sources';
import { createDecisionPackZip } from './monthly_decision_pack_zip';

const REGION = 'us-central1';

interface GenerateDependencies {
  nowMs: () => number;
  hasPermission: (auth: unknown) => boolean;
  load: (window: MonthlyReportingWindow, generatedAtMs: number) => Promise<DecisionPackInput>;
}

export interface MonthlyDecisionPackResponse {
  filename: string;
  mimeType: 'application/zip';
  base64: string;
  byteSize: number;
  sha256: string;
  fileList: readonly string[];
  manifestPreview: {
    reporting_window: { timezone: string; month: string; preliminary: boolean; start: string; end_exclusive: string; as_of: string };
    baseline: { months: string[] };
    sources: Record<string, { status: string; reason?: string; dataThroughMs?: number; analysisCutoffMs?: number; queryAsOfMs?: number; rowCount?: number; rowCap?: number }>;
    privacy: { aggregate_only: boolean; small_cell_threshold: number; raw_events_included: boolean; free_text_included: boolean };
  };
}

const DEFAULT_DEPENDENCIES: GenerateDependencies = {
  nowMs: () => Date.now(),
  hasPermission: (auth) => hasVerifiedCallablePermission(auth, 'money.read'),
  load: loadDecisionPackAggregateInput,
};

function safeTimezone(value: unknown): string {
  const timezone = String(value ?? 'UTC').trim();
  if (!timezone || timezone.length > 80 || !/^[A-Za-z0-9_+\-/]+$/.test(timezone)) throw new HttpsError('invalid-argument', 'Invalid IANA timezone');
  return timezone;
}

function safeMonth(value: unknown): string | undefined {
  if (value == null || value === '') return undefined;
  const month = String(value).trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new HttpsError('invalid-argument', 'Month must be YYYY-MM');
  return month;
}

export async function generateMonthlyDecisionPackResponse(
  data: unknown,
  auth: unknown,
  dependencies: GenerateDependencies = DEFAULT_DEPENDENCIES,
): Promise<MonthlyDecisionPackResponse> {
  if (!dependencies.hasPermission(auth)) throw new HttpsError('permission-denied', 'money.read permission required');
  const request = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  const generatedAtMs = dependencies.nowMs();
  let window: MonthlyReportingWindow;
  try {
    window = resolveMonthlyReportingWindow({ timezone: safeTimezone(request.timezone), month: safeMonth(request.month), asOfMs: generatedAtMs });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('invalid-argument', String((error as Error)?.message ?? 'invalid_reporting_window'));
  }
  console.info('admin_monthly_decision_pack authorized', {
    role: roleFromAdminToken((auth as { token?: unknown } | null)?.token),
    timezone: window.timezone,
    month: window.month,
    preliminary: window.preliminary,
  });
  const aggregateInput = await dependencies.load(window, generatedAtMs);
  let files: ReturnType<typeof buildMonthlyDecisionPackFiles>;
  try {
    files = buildMonthlyDecisionPackFiles(aggregateInput);
  } catch (error) {
    const message = String((error as Error)?.message ?? 'decision_pack_build_failed');
    if (message.includes('limit')) throw new HttpsError('resource-exhausted', message);
    throw error;
  }
  let zip: Buffer;
  try {
    zip = await createDecisionPackZip(files);
  } catch (error) {
    const message = String((error as Error)?.message ?? 'decision_pack_zip_failed');
    if (message.includes('limit')) throw new HttpsError('resource-exhausted', message);
    throw error;
  }
  const timezoneSlug = window.timezone.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return {
    filename: `phraseman-monthly-decision-pack-${window.month}-${timezoneSlug || 'utc'}${window.preliminary ? '-preliminary' : ''}.zip`,
    mimeType: 'application/zip',
    base64: zip.toString('base64'),
    byteSize: zip.length,
    sha256: createHash('sha256').update(zip).digest('hex'),
    fileList: DECISION_PACK_FILE_NAMES,
    manifestPreview: JSON.parse(files['manifest.json']) as MonthlyDecisionPackResponse['manifestPreview'],
  };
}

export const adminMonthlyDecisionPack = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_ADMIN,
  timeoutSeconds: 120,
  memory: '1GiB',
}, async (request) => generateMonthlyDecisionPackResponse(request.data, request.auth));
