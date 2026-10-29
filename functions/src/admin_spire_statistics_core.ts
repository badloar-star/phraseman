import {
  SPIRE_LANGS,
  SPIRE_WEEK_RECORD_SCHEMA_VERSION,
  spireParseWeekProgress,
  type SpireLang,
} from './spire_progress_contract';
import {
  SPIRE_FLOOR_COUNT,
  spireFloorOfSteps,
} from '../../components/spire/spire_tower_model';

export const SPIRE_STATISTICS_PROGRESS_MAX_CHARS = 64 * 1024;
export const SPIRE_STATISTICS_SCHEMA_VERSION = 1 as const;
const SPIRE_COMPLETED_STEPS = 135;
const WEEK_KEY_RE = /^(\d{4})-W(\d{2})$/u;

type StatisticsState = 'ready' | 'empty' | 'partial' | 'error';
type LanguageStatus = 'available' | 'empty' | 'partial' | 'error';
type NullableCount = number | null;

export interface AdminSpireLanguageStatistics {
  readonly lang: SpireLang;
  readonly status: LanguageStatus;
  readonly knownProfiles: NullableCount;
  readonly missingProfiles: NullableCount;
  readonly staleProfiles: NullableCount;
  readonly invalidProfiles: NullableCount;
  readonly floors: readonly Readonly<{ floor: number; count: NullableCount }>[];
  readonly completedProfiles: NullableCount;
}

export interface AdminSpireStatistics {
  readonly schemaVersion: typeof SPIRE_STATISTICS_SCHEMA_VERSION;
  readonly source: 'users.progress.spire_week_v1';
  readonly generatedWeek: string;
  readonly state: StatisticsState;
  readonly coverage: Readonly<{
    scannedProfiles: NullableCount;
    visibleProfiles: NullableCount;
    hiddenProfilesExcluded: NullableCount;
    cap: number;
    truncated: boolean;
    sourceError: string | null;
  }>;
  readonly languages: readonly AdminSpireLanguageStatistics[];
}

export interface AggregateAdminSpireStatisticsInput {
  readonly rows: readonly Record<string, unknown>[];
  readonly generatedWeek: string;
  readonly cap: number;
  readonly truncated: boolean;
  readonly sourceError: string | null;
}

type ParsedProfile =
  | Readonly<{ kind: 'missing' }>
  | Readonly<{ kind: 'invalid' }>
  | Readonly<{
    kind: 'valid';
    wire: Record<string, unknown>;
    normalized: ReturnType<typeof spireParseWeekProgress>;
  }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function isoWeeksInYear(year: number): 52 | 53 {
  const januaryFirst = new Date(0);
  januaryFirst.setUTCHours(0, 0, 0, 0);
  januaryFirst.setUTCFullYear(year, 0, 1);
  const day = januaryFirst.getUTCDay();
  return day === 4 || (day === 3 && isLeapYear(year)) ? 53 : 52;
}

function isValidIsoWeekKey(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = WEEK_KEY_RE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const week = Number(match[2]);
  return week >= 1 && week <= isoWeeksInYear(year);
}

function progressValue(row: Record<string, unknown>): unknown {
  return isRecord(row.progress) ? row.progress.spire_week_v1 : undefined;
}

function parseProfile(raw: unknown): ParsedProfile {
  if (raw == null || raw === '') return { kind: 'missing' };
  if (typeof raw !== 'string' || raw.length > SPIRE_STATISTICS_PROGRESS_MAX_CHARS) return { kind: 'invalid' };
  if (!raw.trim()) return { kind: 'missing' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: 'invalid' };
  }
  if (!isRecord(parsed)) return { kind: 'invalid' };
  if (Object.keys(parsed).some((key) => !(SPIRE_LANGS as readonly string[]).includes(key))) return { kind: 'invalid' };
  return { kind: 'valid', wire: parsed, normalized: spireParseWeekProgress(raw) };
}

function strictLanguageRecord(
  profile: Extract<ParsedProfile, { kind: 'valid' }>,
  lang: SpireLang,
): Readonly<{ weekKey: string; steps: number }> | null | undefined {
  if (!Object.prototype.hasOwnProperty.call(profile.wire, lang)) return undefined;
  const wire = profile.wire[lang];
  if (!isRecord(wire)) return null;
  if (wire.schemaVersion !== SPIRE_WEEK_RECORD_SCHEMA_VERSION || wire.lang !== lang) return null;
  if (!isValidIsoWeekKey(wire.weekKey)) return null;
  if (typeof wire.steps !== 'number' || !Number.isInteger(wire.steps) || wire.steps < 0 || wire.steps > SPIRE_COMPLETED_STEPS) return null;
  const normalized = profile.normalized[lang];
  if (!normalized || normalized.weekKey !== wire.weekKey || normalized.steps !== wire.steps) return null;
  return { weekKey: wire.weekKey, steps: wire.steps };
}

function emptyFloorCounts(value: NullableCount): Readonly<{ floor: number; count: NullableCount }>[] {
  return Array.from({ length: SPIRE_FLOOR_COUNT }, (_, index) => ({ floor: index + 1, count: value }));
}

function errorLanguages(): AdminSpireLanguageStatistics[] {
  return SPIRE_LANGS.map((lang) => ({
    lang,
    status: 'error',
    knownProfiles: null,
    missingProfiles: null,
    staleProfiles: null,
    invalidProfiles: null,
    floors: emptyFloorCounts(null),
    completedProfiles: null,
  }));
}

export function aggregateAdminSpireStatistics(input: AggregateAdminSpireStatisticsInput): AdminSpireStatistics {
  const base = {
    schemaVersion: SPIRE_STATISTICS_SCHEMA_VERSION,
    source: 'users.progress.spire_week_v1' as const,
    generatedWeek: input.generatedWeek,
  };
  if (input.sourceError) {
    return {
      ...base,
      state: 'error',
      coverage: {
        scannedProfiles: null,
        visibleProfiles: null,
        hiddenProfilesExcluded: null,
        cap: input.cap,
        truncated: input.truncated,
        sourceError: input.sourceError,
      },
      languages: errorLanguages(),
    };
  }

  const visibleRows = input.rows.filter((row) => row.identityHidden !== true);
  const hiddenProfilesExcluded = input.rows.length - visibleRows.length;
  const profiles = visibleRows.map((row) => parseProfile(progressValue(row)));
  const languages = SPIRE_LANGS.map<AdminSpireLanguageStatistics>((lang) => {
    const floors = emptyFloorCounts(0).map((bucket) => ({ floor: bucket.floor, count: 0 }));
    let knownProfiles = 0;
    let missingProfiles = 0;
    let staleProfiles = 0;
    let invalidProfiles = 0;
    let completedProfiles = 0;

    for (const profile of profiles) {
      if (profile.kind === 'missing') {
        missingProfiles += 1;
        continue;
      }
      if (profile.kind === 'invalid') {
        invalidProfiles += 1;
        continue;
      }
      const record = strictLanguageRecord(profile, lang);
      if (record === undefined) {
        missingProfiles += 1;
        continue;
      }
      if (record === null) {
        invalidProfiles += 1;
        continue;
      }
      if (record.weekKey !== input.generatedWeek) {
        staleProfiles += 1;
        continue;
      }
      knownProfiles += 1;
      if (record.steps === SPIRE_COMPLETED_STEPS) {
        completedProfiles += 1;
        continue;
      }
      const floor = spireFloorOfSteps(record.steps);
      floors[floor - 1].count += 1;
    }

    return {
      lang,
      status: input.truncated ? 'partial' : knownProfiles > 0 ? 'available' : 'empty',
      knownProfiles,
      missingProfiles,
      staleProfiles,
      invalidProfiles,
      floors,
      completedProfiles,
    };
  });

  return {
    ...base,
    state: input.truncated ? 'partial' : visibleRows.length === 0 ? 'empty' : 'ready',
    coverage: {
      scannedProfiles: input.rows.length,
      visibleProfiles: visibleRows.length,
      hiddenProfilesExcluded,
      cap: input.cap,
      truncated: input.truncated,
      sourceError: null,
    },
    languages,
  };
}
