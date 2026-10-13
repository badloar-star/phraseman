// Стор-сборка: заглушка app/dev_spire_tier.ts. Лига башни и итог недели Шпиля не подменяются.
export const DEV_SPIRE_WEEK_KINDS: readonly string[] = [];
export function setDevSpireTierOverride(): boolean { return false; }
export function getDevSpireTierOverride(): null { return null; }
export function setDevSpireWeekResultOverride(): boolean { return false; }
export function getDevSpireWeekResultOverride(): null { return null; }
