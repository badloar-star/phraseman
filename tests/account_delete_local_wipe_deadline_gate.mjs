import fs from 'node:fs';

const source = fs.readFileSync(
  new URL('../app/auth_provider.ts', import.meta.url),
  'utf8',
);

const timeoutMatch = source.match(/const ACCOUNT_DELETE_LOCAL_WIPE_TIMEOUT_MS\s*=\s*([\d_]+);/);
if (!timeoutMatch) throw new Error('dedicated full-wipe deadline is missing');
const timeoutMs = Number(timeoutMatch[1].replaceAll('_', ''));
if (timeoutMs < 5_000) throw new Error(`full-wipe deadline is too short: ${timeoutMs}ms`);

if (!/withLocalStepDeadline\(\s*\(\)\s*=>\s*flight!,\s*false,\s*ACCOUNT_DELETE_LOCAL_WIPE_TIMEOUT_MS,/s.test(source)) {
  throw new Error('the complete registered wipe flight must use its dedicated deadline');
}
if (!/persistAccountDeletePendingAuth\(pendingDeleteProviderUid,\s*pendingDeleteStableId\),\s*null,\s*ACCOUNT_DELETE_LOCAL_WIPE_TIMEOUT_MS,/s.test(source)) {
  throw new Error('durable deletion guard write must share the local transaction deadline');
}
if (!/advanceAccountDeletePendingAuthLock\([\s\S]*?'local_data_cleared',[\s\S]*?transition_persist_failed[\s\S]*?ACCOUNT_DELETE_LOCAL_WIPE_TIMEOUT_MS,/s.test(source)) {
  throw new Error('local_data_cleared proof must share the local transaction deadline');
}
if (!/timeoutMs\s*=\s*ACCOUNT_DELETE_LOCAL_STEP_TIMEOUT_MS/.test(source)) {
  throw new Error('ordinary local steps must retain their bounded default deadline');
}

console.log('PASS account deletion local wipe deadline gate');
