import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'fs';
import { join, relative } from 'path';
import { spawnSync } from 'child_process';

const root = join(__dirname, '..');
const functionsRoot = join(root, 'functions', 'src');
const authorityGuard = join(root, 'scripts', 'personal_shard_authority_guard.mjs');

function probeAuthorityGuard(source: string): { status: number | null; stderr: string } {
  const result = spawnSync(process.execPath, [
    authorityGuard,
    '--source-base64', Buffer.from(source).toString('base64'),
    '--file', 'mutation-probe.ts',
  ], { encoding: 'utf8' });
  return { status: result.status, stderr: result.stderr };
}

function probeAuthorityGuardTree(directory: string): { status: number | null; stderr: string } {
  const result = spawnSync(process.execPath, [authorityGuard, '--tree', directory], { encoding: 'utf8' });
  return { status: result.status, stderr: result.stderr };
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const file = join(directory, name);
    if (statSync(file).isDirectory()) return sourceFiles(file);
    return name.endsWith('.ts') && !name.endsWith('.test.ts') ? [file] : [];
  });
}

const forbiddenPersonalWritePatterns = [
  /\b[A-Za-z_$][\w$]*\.shards\s*=/,
  /\[['"]shards['"]\]\s*=/,
  /(?:tx|transaction)\.(?:set|update)\([^\n,]*(?:userRef|target\.ref|refereeRef|referrerRef|winner\.ref|accountKey\()[\s\S]{0,140}?\{\s*shards\s*:/,
  /shards\s*:\s*admin\.firestore\.FieldValue\.(?:increment|delete)\s*\(/,
  /shards_updated_(?:at_ms|op|reason)\s*:/,
] as const;

const forbiddenPersonalReadPatterns = [
  /\b(?:user|account|data|userRow|userData)(?:\?\.|\.)shards\b/,
  /\buserSnap\.data\(\)(?:\?\.|\.)shards\b/,
] as const;

const competitiveFiles = [
  'arena_v2.ts',
  'arena_expansion.ts',
  'tournaments.ts',
  'tournament_weekly_payout.ts',
] as const;

describe('Economy Constitution: server never owns the personal pearl balance', () => {
  test('all server source, including competition, has no direct personal balance mutation', () => {
    const violations: string[] = [];
    for (const file of sourceFiles(functionsRoot)) {
      const rel = relative(functionsRoot, file).replace(/\\/g, '/');
      const source = readFileSync(file, 'utf8');
      for (const pattern of forbiddenPersonalWritePatterns) {
        if (pattern.test(source)) violations.push(`${rel}:${pattern}`);
      }
      for (const pattern of forbiddenPersonalReadPatterns) {
        if (pattern.test(source)) violations.push(`${rel}:${pattern}`);
      }
    }
    expect(violations).toEqual([]);
    const generic = readFileSync(join(functionsRoot, 'shards_apply_delta.ts'), 'utf8');
    expect(generic).toContain("throw new HttpsError('failed-precondition', 'personal_balance_is_client_owned')");
    expect(generic).not.toContain("collection('users').doc(uid)");
    const astGuard = spawnSync(process.execPath, [authorityGuard, '--tree', functionsRoot], { encoding: 'utf8' });
    expect({ status: astGuard.status, stderr: astGuard.stderr }).toEqual({ status: 0, stderr: '' });
  });

  test.each([
    ['computed read', `const value = user['shards'];`],
    ['optional computed read', `const value = user?.['shards'];`],
    ['destructured read', `const { shards } = user;`],
    ['aliased dynamic read', `const walletKey = 'shards'; const value = user[walletKey];`],
    ['computed Firestore write', `tx.update(userRef, { ['shards']: 7 });`],
    ['aliased Firestore write', `const walletKey = 'shards'; tx.set(userRef, { [walletKey]: 7 });`],
    ['object-patch alias write', `const patch = { shards: 7 }; tx.update(userRef, patch);`],
    ['spread object-patch alias write', `const patch = { shards: 7 }; const wrapped = { ...patch }; tx.set(userRef, wrapped);`],
    ['multi-hop object-patch alias write', `const patch = { shards: 7 }; const alias = patch; tx.update(userRef, alias);`],
    ['retired response field', `return { senderBalanceAfter: 7 };`],
    ['retired affordability error', `throw new Error('insufficient_balance');`],
  ])('AST authority guard rejects %s', (_label, source) => {
    const result = probeAuthorityGuard(source);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('mutation-probe.ts');
  });

  test('AST authority guard permits shard amounts on isolated external receipts', () => {
    expect(probeAuthorityGuard(`const amount = pack.shards; tx.create(receiptRef, { shards: amount });`))
      .toEqual({ status: 0, stderr: '' });
  });

  test('AST authority guard walks native nested paths and reports a real violation', () => {
    const tempParent = join(root, '.codex-tmp');
    mkdirSync(tempParent, { recursive: true });
    const tempRoot = mkdtempSync(join(tempParent, 'personal-shard-authority-'));
    const nested = join(tempRoot, 'nested');
    mkdirSync(nested);

    try {
      writeFileSync(join(nested, 'safe.ts'), 'tx.create(receiptRef, { shards: pack.shards });');
      expect(probeAuthorityGuardTree(tempRoot)).toEqual({ status: 0, stderr: '' });

      writeFileSync(join(nested, 'violation.ts'), 'tx.update(userRef, { shards: 7 });');
      const violation = probeAuthorityGuardTree(tempRoot);
      expect(violation.status).not.toBe(0);
      expect(violation.stderr).toContain('violation.ts');
      expect(violation.stderr).toContain('personal-firestore-shards-write');
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('competition never reads legacy shards for permission or returns a wallet projection', () => {
    for (const rel of competitiveFiles) {
      const source = readFileSync(join(functionsRoot, rel), 'utf8');
      expect(source).not.toMatch(/(?:user|userData|userSnap\.data\(\))\.shards\b/);
      expect(source).not.toContain('not_enough_gems');
      expect(source).not.toContain('gemsLeft:');
      expect(source).not.toContain('gemBalance,');
    }
  });

  test('every competitive pearl delta is an immutable external fact', () => {
    const arena = readFileSync(join(functionsRoot, 'arena_v2.ts'), 'utf8');
    expect(arena).toContain("source: 'arena_v2_season'");
    expect(arena).not.toContain("source: 'arena_v2_spin'");
    const tournaments = readFileSync(join(functionsRoot, 'tournaments.ts'), 'utf8');
    for (const source of [
      'tournament_entry', 'tournament_lobby_leave', 'tournament_cancel', 'tournament_prize',
    ]) expect(tournaments).toContain(`source: '${source}'`);
    const weekly = readFileSync(join(functionsRoot, 'tournament_weekly_payout.ts'), 'utf8');
    expect(weekly).toContain("source: 'tournament_weekly_bank'");
  });

  test('Firebase deploy cannot bypass a fresh compiled-runtime parity gate', () => {
    const firebase = readFileSync(join(root, 'firebase.json'), 'utf8');
    const pkg = readFileSync(join(root, 'functions', 'package.json'), 'utf8');
    const parity = readFileSync(join(root, 'scripts', 'functions_runtime_parity_gate.mjs'), 'utf8');
    const clean = readFileSync(join(root, 'scripts', 'clean_functions_runtime.mjs'), 'utf8');
    expect(firebase).toContain('npm --prefix functions run build');
    expect(firebase).toContain('node scripts/functions_runtime_parity_gate.mjs');
    expect(pkg).toContain('functions_runtime_parity_gate.mjs');
    expect(pkg).toContain('clean_functions_runtime.mjs');
    expect(clean).toContain("main !== 'lib/functions/src/index.js'");
    expect(parity).toContain('orphan compiled module has no source');
    expect(parity).toContain('compiled runtime matches the personal-economy boundary');
    expect(parity).toContain('personalShardAuthorityViolations');
    expect(parity).toContain('personal_shard_authority_guard.mjs');
  });
});
