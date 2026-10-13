// Стор-сборка: заглушка app/dev_practice_runes_seed.ts. Параметр ссылки devRunesSeed НЕ подставляет поддельный счётчик (PM-216 В).
const DEV_RUNES_SEED_PARAM = 'devRunesSeed';
export function makeDevRunesSeed(): string { return ''; }
export function readDevPracticeRunesFakeState(): null { return null; }
export { DEV_RUNES_SEED_PARAM };
