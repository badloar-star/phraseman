import {
  existsSync,
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
import { normalizeEol } from './helpers/read_source';

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

// Исключения ТОЛЬКО для чтения shards (запись проверяется у всех без исключений).
const personalShardReadAllowlist: Readonly<Record<string, string>> = {
  // зачем: D195 владелец 15.10 — одноразовый пересчёт старого жемчуга в монеты, только чтение users/{id}.shards;
  // в shards не пишет и не обнуляет (метка «пересчитано» — своё поле legacyBonusConvertedV1). Тест ниже это сторожит.
  'legacy_bonus_convert.ts': 'D195: одноразовый пересчёт в монеты, только чтение',
};

const competitiveFiles = [
  // зачем: D78 — arena_v2.ts и arena_expansion.ts удалены вместе с серверной Ареной.
  'tournaments.ts',
  'tournament_weekly_payout.ts',
] as const;

describe('Economy Constitution: server never owns the personal pearl balance', () => {
  test('all server source, including competition, has no direct personal balance mutation', () => {
    const violations: string[] = [];
    for (const file of sourceFiles(functionsRoot)) {
      const rel = relative(functionsRoot, file).replace(/\\/g, '/');
      const source = normalizeEol(readFileSync(file, 'utf8'));
      for (const pattern of forbiddenPersonalWritePatterns) {
        if (pattern.test(source)) violations.push(`${rel}:${pattern}`);
      }
      if (personalShardReadAllowlist[rel]) continue;
      for (const pattern of forbiddenPersonalReadPatterns) {
        if (pattern.test(source)) violations.push(`${rel}:${pattern}`);
      }
    }
    expect(violations).toEqual([]);
    // зачем: D70/D78 — заглушка shards_apply_delta удалена целиком: писателя баланса жемчуга нет вовсе.
    expect(existsSync(join(functionsRoot, 'shards_apply_delta.ts'))).toBe(false);
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

  test('legacy_bonus_convert (D195) только читает shards: ни записи, ни обнуления, метка — своё поле', () => {
    const source = normalizeEol(readFileSync(join(functionsRoot, 'legacy_bonus_convert.ts'), 'utf8'));
    const code = source.split('\n').filter((line) => !/^\s*(?:\/\/|\*|\/\*)/.test(line)).join('\n');
    for (const pattern of forbiddenPersonalWritePatterns) expect([String(pattern), pattern.test(code)]).toEqual([String(pattern), false]);
    // ни ключа shards в объекте записи, ни FieldValue по shards, ни строкового пути 'shards'
    expect(code).not.toMatch(/\bshards\s*:/);
    expect(code).not.toMatch(/['"]shards['"]/);
    // единственное обращение — чтение из снимка пользователя для пересчёта
    expect(code.match(/\bshards\b/g)).toEqual(['shards']);
    expect(code).toMatch(/data\?\.shards/);
    expect(code).toMatch(/legacyBonusConvertedV1/);
  });

  test('competition never reads legacy shards for permission or returns a wallet projection', () => {
    for (const rel of competitiveFiles) {
      const source = normalizeEol(readFileSync(join(functionsRoot, rel), 'utf8'));
      expect(source).not.toMatch(/(?:user|userData|userSnap\.data\(\))\.shards\b/);
      expect(source).not.toContain('not_enough_gems');
      expect(source).not.toContain('gemsLeft:');
      expect(source).not.toContain('gemBalance,');
    }
  });

  test('every competitive pearl delta is an immutable external fact', () => {
    const tournaments = normalizeEol(readFileSync(join(functionsRoot, 'tournaments.ts'), 'utf8'));
    for (const source of [
      'tournament_entry', 'tournament_lobby_leave', 'tournament_cancel', 'tournament_prize',
    ]) expect(tournaments).toContain(`source: '${source}'`);
    const weekly = normalizeEol(readFileSync(join(functionsRoot, 'tournament_weekly_payout.ts'), 'utf8'));
    expect(weekly).toContain("source: 'tournament_weekly_bank'");
  });

  test('Firebase deploy cannot bypass a fresh compiled-runtime parity gate', () => {
    const firebase = normalizeEol(readFileSync(join(root, 'firebase.json'), 'utf8'));
    const pkg = normalizeEol(readFileSync(join(root, 'functions', 'package.json'), 'utf8'));
    const parity = normalizeEol(readFileSync(join(root, 'scripts', 'functions_runtime_parity_gate.mjs'), 'utf8'));
    const clean = normalizeEol(readFileSync(join(root, 'scripts', 'clean_functions_runtime.mjs'), 'utf8'));
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
