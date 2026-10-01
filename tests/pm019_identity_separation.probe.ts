import { readFileSync } from 'node:fs';

const profile = readFileSync('components/PlayerProfileModal.tsx', 'utf8');
const snapshot = readFileSync('app/public_profile_snapshot.ts', 'utf8');
const rank = readFileSync('app/coin_rank_table_v1.ts', 'utf8');
for (const source of [profile, snapshot, rank]) {
  if (/user_total_xp|totalXp|\bXP\b|experience points/i.test(source)) throw new Error('legacy XP identity leaked into public identity surface');
}
for (const field of ['profileCardLevel', 'profileCardTheme', 'profileCardMotion', 'profileCardPublicFocus']) {
  if (!profile.includes(field)) throw new Error(`profile-card field missing: ${field}`);
}
// 01.10 (PM-128): звание по-прежнему из таблицы монет, но на языке интерфейса — coinRankTitle.
if (!profile.includes('coinRankRowForDisplay') || !profile.includes('coinRankTitle(rankRow.rank')) {
  throw new Error('rank identity is not rendered from coin resolver');
}

console.log('PM-019 IDENTITY SEPARATION: PASS');
