import { legacyPolicyForKey } from './legacy_inventory';

const PHONE_STATE_CORE_DOMAINS = new Set(['xp', 'streak', 'lessons', 'exams']);

/**
 * Legacy progress fields whose authoritative projection has moved to the
 * encrypted PhoneState journal. The reviewed inventory is the single mapping
 * source so prefix-based lesson/exam keys cannot silently escape the boundary.
 */
export function isPhoneStateCoreProgressKey(key: string): boolean {
  const policy = legacyPolicyForKey(key);
  return Boolean(
    policy
    && policy.scope === 'portable'
    && PHONE_STATE_CORE_DOMAINS.has(policy.domain),
  );
}

/**
 * Returns a copy suitable for the legacy users/{uid}.progress transport.
 * Once PhoneState owns core progress, stale legacy core fields are omitted in
 * both directions while unrelated legacy domains continue to synchronize.
 */
export function filterLegacyProgressForPhoneState<T>(
  progress: Readonly<Record<string, T>>,
  phoneStateOwnsCore: boolean,
): Record<string, T> {
  if (!phoneStateOwnsCore) return { ...progress };
  return Object.fromEntries(
    Object.entries(progress).filter(([key]) => !isPhoneStateCoreProgressKey(key)),
  ) as Record<string, T>;
}
