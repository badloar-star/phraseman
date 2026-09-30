import { execFileSync } from 'node:child_process';

const roots = ['app', 'components', 'modules', 'hooks', 'functions/src'];
const banned = /\b(registerXP|addXP|awardXP|getXPMultiplier|xp_multiplier|xpBoostAlreadyActive|weeklyXp|leagueXpPromotion)\b/i;
const compatibility = /compatibility|legacy|retired|migration|test/i;
const hits: string[] = [];
const commentOnlyLegacyFiles = new Set(['functions/src/friends_together.ts']);
for (const root of roots) {
  let output = '';
  try { output = execFileSync('rg', ['-l', '--glob', '!**/*.test.*', banned.source, root], { encoding: 'utf8' }); }
  catch (error) { if ((error as { status?: number }).status !== 1) throw error; }
  for (const file of output.split(/\r?\n/).filter(Boolean)) {
    const normalized = file.replaceAll('\\', '/');
    if (!compatibility.test(file) && !commentOnlyLegacyFiles.has(normalized)) hits.push(normalized);
  }
}
if (hits.length) throw new Error(`active XP surface remains: ${hits.join(', ')}`);

console.log('PM-055 XP SURFACE RETIREMENT: PASS');
