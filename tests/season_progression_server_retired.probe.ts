import fs from 'node:fs';

const eligibility = fs.readFileSync('functions/src/arena_expansion_core.ts', 'utf8');
// зачем: D78 (владелец, 2026-09-30) — arena_v2.ts удалён вместе с серверной Ареной.
// Нет файла — нет и записи сезона; если файл вернут, охрана записи снова обязательна.
const settlePath = 'functions/src/arena_v2.ts';
const settle = fs.existsSync(settlePath) ? fs.readFileSync(settlePath, 'utf8') : null;

const enabledSeasonFlags = [
  /baseStars:\s*(?:true|mode\s*===)/,
  /todayStars:\s*true/,
  /spin:\s*(?:true|mode\s*===)/,
].filter((pattern) => pattern.test(eligibility));

if (enabledSeasonFlags.length > 0) {
  throw new Error(`season_progression_retired_violation:${enabledSeasonFlags.length}`);
}

const seasonWrite = 'tx.set(entry.season, nextSeason, { merge: true });';
const guard = 'if (expansionEligibility.baseStars || expansionEligibility.todayStars || expansionEligibility.spin)';
if (settle !== null) {
  const writeIndex = settle.indexOf(seasonWrite);
  const guardIndex = settle.lastIndexOf(guard, writeIndex);
  if (writeIndex < 0 || guardIndex < 0 || guardIndex > writeIndex) {
    throw new Error('season_progression_write_not_guarded');
  }
}

console.log(`season_progression_server_retired: PASS (settle=${settle === null ? 'deleted_D78' : 'guarded'})`);
