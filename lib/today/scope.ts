import type { Lang } from '../../constants/i18n';
import type { AccountGenerationToken } from '../../app/account_generation';
import type { TodayScope } from './types';

function resolvedTimeZone(requested?: string): string {
  const value = requested?.trim();
  if (value) return value;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function dayKeyInTimeZone(now: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
    const year = read('year');
    const month = read('month');
    const day = read('day');
    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {
    // Invalid/unsupported timezone falls back to the device-local calendar below.
  }
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createTodayScope(input: {
  account: AccountGenerationToken;
  studyTargetId: string;
  uiLocale: Lang;
  now?: Date;
  timeZone?: string;
}): TodayScope | null {
  const accountScopeId = input.account.stableId?.trim();
  if (input.account.phase !== 'active' || !accountScopeId) return null;
  const timeZone = resolvedTimeZone(input.timeZone);
  const localDateKey = dayKeyInTimeZone(input.now ?? new Date(), timeZone);
  const parts = [accountScopeId, String(input.account.generation), input.studyTargetId, input.uiLocale, localDateKey, timeZone];
  return {
    accountScopeId,
    accountGeneration: input.account.generation,
    studyTargetId: input.studyTargetId,
    uiLocale: input.uiLocale,
    localDateKey,
    timeZone,
    scopeKey: parts.map(encodeURIComponent).join('|'),
  };
}

export function rebuildCurrentTodayScope(
  requested: TodayScope,
  account: AccountGenerationToken,
  studyTargetId: string,
  uiLocale: Lang,
  now: Date,
  timeZone?: string,
): TodayScope | null {
  const current = createTodayScope({ account, studyTargetId, uiLocale, now, timeZone });
  return current?.scopeKey === requested.scopeKey ? requested : null;
}
