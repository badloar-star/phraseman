/**
 * Shared server-side owner seal for MAX.
 *
 * Owner decision 2026-09-04: MAX remains closed and its paid/scheduled
 * functions remain undeployed until the owner explicitly orders it restored.
 * Jarvis must use this same marker so expected stale aggregates cannot create
 * recurring incident plans while the product is intentionally sealed.
 */
export const MAX_SECTION_SEALED_BY_OWNER_2026_09_04 = true;
