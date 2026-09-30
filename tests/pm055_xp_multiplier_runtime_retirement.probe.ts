import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const roots = ['app', 'components', 'modules', 'hooks', 'functions/src'];
const banned = /\b(registerXP|addXP|awardXP|getXPMultiplier|xp_multiplier)\b/;
const allowedFiles = new Set(['functions/src/global_broadcast_claim.ts']);
let found: string[] = [];
for (const root of roots) {
  let out = '';
  try { out = execFileSync('rg', ['-l', '--glob', '!**/*.test.*', banned.source, root], { encoding: 'utf8' }); } catch (error) {
    const status = (error as { status?: number }).status;
    if (status !== 1) throw error;
  }
  found.push(...out.split(/\r?\n/).filter(Boolean));
}
const unexpected = found.filter((file) => !allowedFiles.has(file.replaceAll('\\', '/')));
if (unexpected.length) throw new Error(`active XP multiplier symbols remain: ${unexpected.join(', ')}`);
if (existsSync('app/xp_manager.ts')) throw new Error('retired XP manager still present');

console.log('PM-055 XP MULTIPLIER RETIREMENT: PASS');
