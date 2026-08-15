/**
 * Снимок формулировок firestore.rules (regex / ожидаемые подстроки).
 *
 * ВАЖНО ДЛЯ СБОРОК / РЕЛИЗОВ (2026):
 * Правила в облаке могли быть осознанно изменены под продукт; этот файл тогда «красный»,
 * хотя доступ для пользователей корректен. Не подгоняйте правила вслепую под тест —
 * сначала осознанная проверка безопасности; тест обновлять только когда формулировка
 * в rules стабильна и согласована.
 */
import { readFileSync } from 'fs';
import path from 'path';

const rulesPath = path.join(process.cwd(), 'firestore.rules');

type ParsedMatchBlock = { path: string; source: string };
type ParsedAllowStatement = { operations: string; expression: string };

function stripRulesComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\r\n]/g, ' '))
    .replace(/\/\/[^\r\n]*/g, '');
}

function balancedBlockEnd(source: string, openBrace: number): number | null {
  let depth = 1;
  let quote = '';
  let escaped = false;
  for (let index = openBrace + 1; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === "'" || char === '"') quote = char;
    else if (char === '{') depth += 1;
    else if (char === '}') depth -= 1;
    if (depth === 0) return index + 1;
  }
  return null;
}

function rootMatchBlocks(source: string): ParsedMatchBlock[] {
  const executable = stripRulesComments(source);
  const databaseHeader = /\bmatch\s+\/databases\/\{database\}\/documents\s*\{/g.exec(executable);
  if (!databaseHeader || databaseHeader.index === undefined) return [];
  const databaseOpenBrace = databaseHeader.index + databaseHeader[0].lastIndexOf('{');
  const databaseEnd = balancedBlockEnd(executable, databaseOpenBrace);
  if (databaseEnd === null) return [];

  const blocks: ParsedMatchBlock[] = [];
  let depth = 1;
  let quote = '';
  let escaped = false;
  for (let index = databaseOpenBrace + 1; index < databaseEnd - 1; index += 1) {
    const char = executable[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === '{') {
      depth += 1;
      continue;
    }
    if (char === '}') {
      depth -= 1;
      continue;
    }
    if (depth !== 1 || !executable.startsWith('match', index)) continue;
    const previous = index > 0 ? executable[index - 1] : '';
    if (/[A-Za-z0-9_]/.test(previous)) continue;
    const header = /^match\s+\/([^\s]+)\s*\{/.exec(executable.slice(index));
    if (!header) continue;
    const openBrace = index + header[0].lastIndexOf('{');
    const end = balancedBlockEnd(executable, openBrace);
    if (end === null || end > databaseEnd) continue;
    blocks.push({ path: header[1], source: executable.slice(index, end) });
    index = end - 1;
  }
  return blocks;
}

function allowStatements(block: string): ParsedAllowStatement[] {
  return Array.from(
    block.matchAll(/\ballow\s+([^:;]+?)\s*:\s*if\s+([\s\S]*?);/g),
    (match) => ({
      operations: match[1].replace(/\s+/g, ' ').trim(),
      expression: match[2].replace(/\s+/g, ' ').trim(),
    }),
  );
}

function identityRuleGuardViolations(source: string): string[] {
  const violations: string[] = [];
  const blocks = rootMatchBlocks(source);
  const collectionBlocks = (collection: string) => blocks.filter(
    (block) => block.path.startsWith(`${collection}/`),
  );
  const exactBlock = (pathPattern: string) => blocks.filter((block) => block.path === pathPattern);

  const authLinkBlocks = collectionBlocks('auth_links');
  if (
    authLinkBlocks.length !== 1 ||
    authLinkBlocks[0].path !== 'auth_links/{providerUid}'
  ) {
    violations.push('auth_links:exact_root_count');
  } else {
    const statements = allowStatements(authLinkBlocks[0].source);
    if (
      statements.length !== 2 ||
      statements[0].operations !== 'read' ||
      statements[0].expression !== 'isAdmin() || ownsAuthLinkDoc()' ||
      statements[1].operations !== 'create, update, delete' ||
      statements[1].expression !== 'false'
    ) {
      violations.push('auth_links:allow_contract');
    }
  }

  const tombstoneBlocks = collectionBlocks('account_deletion_tombstones');
  if (
    tombstoneBlocks.length !== 1 ||
    tombstoneBlocks[0].path !== 'account_deletion_tombstones/{userId}'
  ) {
    violations.push('tombstones:exact_root_count');
  } else {
    const statements = allowStatements(tombstoneBlocks[0].source);
    if (
      statements.length !== 1 ||
      statements[0].operations !== 'read, write' ||
      statements[0].expression !== 'false'
    ) {
      violations.push('tombstones:allow_contract');
    }
  }

  const catchAllBlocks = exactBlock('{collection}/{document=**}');
  if (catchAllBlocks.length !== 1) {
    violations.push('catch_all:exact_root_count');
  } else {
    const statements = allowStatements(catchAllBlocks[0].source);
    const catchAll = statements.length === 1 ? statements[0] : null;
    if (!catchAll || catchAll.operations !== 'read, write') {
      violations.push('catch_all:allow_contract');
    } else {
      const conjuncts = catchAll.expression.split('&&').map((term) => term.trim());
      if (catchAll.expression.includes('||') || conjuncts[0] !== 'isAdmin()') {
        violations.push('catch_all:not_conjunctive_admin_gate');
      }
      for (const collection of ['auth_links', 'account_deletion_tombstones']) {
        if (!conjuncts.includes(`collection != '${collection}'`)) {
          violations.push(`catch_all:${collection}`);
        }
      }
    }
  }
  return violations;
}

function identityRulesFixture(overrides: {
  catchAllExpression?: string;
  extraBlocks?: string;
} = {}): string {
  return `service cloud.firestore {
  match /databases/{database}/documents {
    match /auth_links/{providerUid} {
      allow read: if isAdmin() || ownsAuthLinkDoc();
      allow create, update, delete: if false;
    }
    match /account_deletion_tombstones/{userId} {
      allow read, write: if false;
    }
${overrides.extraBlocks ?? ''}
    match /{collection}/{document=**} {
      allow read, write: if ${overrides.catchAllExpression ?? "isAdmin() && collection != 'auth_links' && collection != 'account_deletion_tombstones'"};
    }
  }
}`;
}

describe('firestore.rules security baseline', () => {
  const rules = readFileSync(rulesPath, 'utf8');
  const executableRules = stripRulesComments(rules);

  function exactRootMatchBlocks(pathPattern: string): string[] {
    return rootMatchBlocks(executableRules)
      .filter((block) => block.path === pathPattern)
      .map((block) => block.source);
  }

  function activeAllowLines(block: string): string[] {
    return allowStatements(block).map(
      ({ operations, expression }) => `allow ${operations}: if ${expression};`,
    );
  }

  const SERVER_OWNED_USER_IDENTITY_FIELDS = [
    'firebaseAuthUid',
    'linkedAuth',
    'identityHidden',
    'canonicalStableId',
    'duplicateOfStableId',
    'anon_merge_claim',
    'identityCanonicalizedAt',
    'identityMergedAt',
    'identityCleanupAt',
    'identityCleanupReason',
  ] as const;

  test('identity rule parser accepts the current rules', () => {
    expect(identityRuleGuardViolations(rules)).toEqual([]);
  });

  test('identity rule parser rejects OR-bypassed catch-all exclusions', () => {
    const mutated = identityRulesFixture({
      catchAllExpression:
        "collection != 'auth_links' && collection != 'account_deletion_tombstones' || isAdmin()",
    });
    expect(identityRuleGuardViolations(mutated)).not.toEqual([]);
  });

  test.each([
    ['tab', '\t'],
    ['two spaces', '  '],
    ['five spaces', '     '],
  ])('identity rule parser rejects a %s-indented duplicate permissive auth_links root', (
    _label,
    indent,
  ) => {
    const mutated = identityRulesFixture({
      extraBlocks: `${indent}match /auth_links/{document=**} {
${indent}  allow read, write: if isAdmin();
${indent}}`,
    });
    expect(identityRuleGuardViolations(mutated)).toContain('auth_links:exact_root_count');
  });

  test.each([
    ['tab', '\t'],
    ['two spaces', '  '],
    ['five spaces', '     '],
  ])('identity rule parser rejects a %s-indented duplicate permissive tombstone root', (
    _label,
    indent,
  ) => {
    const mutated = identityRulesFixture({
      extraBlocks: `${indent}match /account_deletion_tombstones/{document=**} {
${indent}  allow read, write: if isAdmin();
${indent}}`,
    });
    expect(identityRuleGuardViolations(mutated)).toContain('tombstones:exact_root_count');
  });

  test('identity rule parser ignores a permissive nested user recovery control', () => {
    const mutated = identityRulesFixture({
      extraBlocks: `    match /users/{uid} {
      match /auth_recovery_codes/{doc} {
        allow read, write: if true;
      }
    }`,
    });
    expect(identityRuleGuardViolations(mutated)).toEqual([]);
  });

  test('identity rule parser ignores comment-fake catch-all exclusions', () => {
    const mutated = identityRulesFixture({
      catchAllExpression: `isAdmin()
        // && collection != 'auth_links'
        /* && collection != 'account_deletion_tombstones' */`,
    });
    expect(identityRuleGuardViolations(mutated)).not.toEqual([]);
  });

  test('users create is server-only and identity guards remain fail-closed', () => {
    const fields = rules.match(/function serverOwnedUserIdentityFields\(\) \{[\s\S]*?\n    \}/);
    const guard = rules.match(/function newDocHasNoServerIdentityWrites\(\) \{[\s\S]*?\n    \}/);
    expect(fields).not.toBeNull();
    expect(guard).not.toBeNull();
    expect(guard![0]).not.toContain('isAdmin()');
    expect(guard![0]).toContain('.hasAny(serverOwnedUserIdentityFields())');
    for (const field of SERVER_OWNED_USER_IDENTITY_FIELDS) {
      expect(fields![0]).toContain(`'${field}'`);
    }
    expect(rules).toContain('allow create: if false;');
  });

  test('users update and delete cannot change or remove server-owned identity', () => {
    const updateGuard = rules.match(/function hasNoServerIdentityWrites\(\) \{[\s\S]*?\n    \}/);
    const deleteGuard = rules.match(/function userDocHasNoServerIdentity\(\) \{[\s\S]*?\n    \}/);
    expect(updateGuard).not.toBeNull();
    expect(deleteGuard).not.toBeNull();
    expect(updateGuard![0]).not.toContain('isAdmin()');
    expect(deleteGuard![0]).not.toContain('isAdmin()');
    expect(updateGuard![0]).toContain('.hasAny(serverOwnedUserIdentityFields())');
    expect(deleteGuard![0]).toContain('.hasAny(serverOwnedUserIdentityFields())');
    expect(rules).toMatch(
      /allow update:\s*if\s+userDocOwnerMatchesAuth\(userId\)[\s\S]*?hasNoServerIdentityWrites\(\)/,
    );
    expect(rules).toContain(
      'allow delete: if userDocOwnerMatchesAuth(userId) && userDocHasNoServerIdentity();',
    );
  });

  test('legacy browser-admin catch-all cannot bypass users identity guards', () => {
    const catchAllBlock = rules.match(/match \/\{collection\}\/\{document=\*\*\} \{[\s\S]*?\n    \}/);
    expect(catchAllBlock).not.toBeNull();
    expect(catchAllBlock![0]).toContain("collection != 'users'");
  });

  test('Arena runtime pool is client-readable but server-owned', () => {
    expect(rules).toMatch(/match \/arena_questions\/\{qId\} \{[\s\S]*?allow read:\s*if request\.auth != null;[\s\S]*?allow write:\s*if false;/);
  });

  test('public profile projections are server-owned', () => {
    const blocks = exactRootMatchBlocks('public_profiles/{userId}');
    expect(blocks).toHaveLength(1);
    expect(activeAllowLines(blocks[0])).toEqual([
      'allow read: if request.auth != null;',
      'allow update: if false;',
      'allow create, delete: if false;',
    ]);
  });

  test('users collection is restricted to owner/admin, including stableId auth mapping', () => {
    expect(rules).toContain('match /users/{userId} {');
    expect(rules).toContain('function userDocOwnerMatchesAuth(userId) {');
    expect(rules).toContain('function newUserDocOwnerMatchesAuth(userId) {');
    expect(rules).toContain('&& (isAdmin() || authLinkMapsToUser(userId))');
    expect(rules).toContain('allow create: if false;');
    expect(rules).toContain('function authLinkMapsToUser(userId) {');
    expect(rules).toContain('auth_links/$(request.auth.uid)');
    expect(rules).toContain('data.stable_id == userId');
    expect(rules).toContain('stableUserMatchesAuth(userId) || authLinkMapsToUser(userId)');
    expect(rules).toContain('function accountDeletionNotPending(userId) {');
    expect(rules).toContain('account_deletion_tombstones/$(userId)');
    expect(rules).toMatch(/allow update:[^;]*accountDeletionNotPending\(userId\)/);
    expect(rules).toContain('allow create: if false;');
    // Read is owner/admin OR the doc does not exist yet (empty read is safe and must
    // not break the 1.5.41 sign-in transaction's tx.get on a brand-new localStableId —
    // see userDocMissing). delete stays strictly owner/admin. update is owner/admin AND
    // must not touch premium fields. The update rule may AND additional guards
    // (e.g. hasNoShardWrites()), so match the owner + premium-guard prefix instead of
    // pinning the exact (and growing) full line.
    expect(rules).toContain('allow read: if userDocOwnerMatchesAuth(userId) || userDocMissing(userId);');
    expect(rules).toContain(
      'allow delete: if userDocOwnerMatchesAuth(userId) && userDocHasNoServerIdentity();',
    );
    expect(rules).toMatch(
      /allow update:\s*if\s+userDocOwnerMatchesAuth\(userId\)\s*&&[\s\S]*?progressHasNoPremiumWrites\(\)/,
    );
    // Create is owner/admin AND must not pre-populate premium/VIP fields in the brand-new
    // doc. Firestore evaluates a set() on a non-existent doc against `allow create`, so
    // without a premium guard here a tampered client could self-grant VIP on its very first
    // write (resource is null on create → diff impossible → guard checks key presence).
    expect(rules).toContain('allow create: if false;');
    expect(rules).toContain('function newDocHasNoPremiumWrites() {');
    // The create guard must inspect the NEW progress map's keys (not a diff — there is no
    // prior resource on create) and reject any blocked premium key.
    expect(rules).toMatch(
      /function newDocHasNoPremiumWrites\(\) \{[\s\S]*?\.get\('progress', \{\}\)[\s\S]*?\.keys\(\)\.hasAny\(blockedPremiumProgressKeys\(\)\)/,
    );
  });

  // ── Missing-doc read guard (1.5.41 sign-in transaction fix, R1) ──────────
  // Корень потери аккаунта на 1.5.41 (после halt-rollback с 1.5.44): клиентская
  // транзакция входа делает tx.get(users/{новый localStableId}); пока этот док не
  // существует и на него не указывает ни firebaseAuthUid, ни auth_links — старое
  // правило read возвращало PERMISSION_DENIED, что валило ВСЮ транзакцию
  // (transaction_[firestore/unknown]) и вход → пользователю казалось, что создан
  // новый аккаунт. userDocMissing разрешает read ТОЛЬКО когда документа нет:
  // пустое чтение ничего не раскрывает, а транзакция доходит до конца и клиент
  // свапается на привязанный stable_id. Существующие чужие доки остаются закрыты.
  test('read of a non-existent user doc is allowed (so the 1.5.41 sign-in tx survives)', () => {
    expect(rules).toContain('function userDocMissing(userId) {');
    // Разрешение только для аутентифицированного и ТОЛЬКО для отсутствующего дока.
    expect(rules).toMatch(
      /function userDocMissing\(userId\) \{[\s\S]*?request\.auth != null[\s\S]*?!exists\(\/databases\/\$\(database\)\/documents\/users\/\$\(userId\)\)/,
    );
    // read объединяет владельца И missing-doc; delete этого послабления НЕ получает.
    expect(rules).toContain('allow read: if userDocOwnerMatchesAuth(userId) || userDocMissing(userId);');
    expect(rules).not.toContain('allow delete: if userDocOwnerMatchesAuth(userId) || userDocMissing(userId);');
    // update тоже НЕ должен получать missing-doc послабление (создание идёт через
    // allow create + newUserDocOwnerMatchesAuth, который требует firebaseAuthUid==auth.uid).
    const userUpdateGuard = rules.match(
      /allow update:\s*if\s+userDocOwnerMatchesAuth\(userId\)[\s\S]*?;/,
    );
    expect(userUpdateGuard).not.toBeNull();
    expect(userUpdateGuard![0]).not.toContain('userDocMissing(userId)');
  });

  // ── Paywall-bypass guard (premium/VIP self-grant) ────────────────────────
  // Entitlement flags live INSIDE the client-writable `progress` map
  // (premium_plan, vip_active, …). Firestore map rules can't restrict
  // individual keys with hasOnly, so the `users/{userId}` update rule must
  // call progressHasNoPremiumWrites(), which denies any diff that touches a
  // premium/VIP key (unless the writer is admin). If this regresses, a normal
  // client can write progress.premium_plan='yearly' via the SDK and bypass the
  // paywall (see app/cloud_sync.ts PREMIUM_PROGRESS_KEYS, app/premium_guard.ts).
  // These keys MUST stay in sync with PREMIUM_PROGRESS_KEYS in cloud_sync.ts.
  const PREMIUM_PROGRESS_KEYS = [
    'premium_plan',
    'premium_expiry',
    'premium_rc_product_id',
    'premium_rc_period_type',
    'premium_rc_store',
    'premium_rc_environment',
    'premium_rc_event_type',
    'premium_rc_updated_at',
    'premium_rc_expiry_ms',
    'premium_rc_purchased_at_ms',
    'premium_rc_cancelled_at',
    'premium_rc_active_lineage',
    'premium_rc_reconcile_needed',
    'admin_premium_override',
    'premium_admin_grant_at',
    'had_premium_ever',
    'vip_active',
    'vip_plan',
    'vip_from',
    'vip_until',
    'vip_admin_override',
    'vip_admin_grant_at',
    'vip_migrated_from_admin_grant_at',
    'intro_access_until_ms',
    'intro_access_granted_at_ms',
    'loyalty_gift_until_ms',
    'loyalty_gift_granted_at_ms',
  ] as const;

  const SERVER_OWNED_PROGRESS_KEYS = [
    'user_total_xp',
    'user_prev_xp',
    'user_level',
    'weekly_xp',
    'weekly_xp_period_start',
    'week_points',
    'week_points_v2',
    'streak_count',
    'last_active_date',
    'streak_last_date',
    'collectibles_owned_v1',
    'collectibles_state_v1',
    'unlocked_lessons',
    'lesson_progress_v2::fr::unlocked_lessons',
    ...Array.from({ length: 80 }, (_, index) => index + 1).flatMap((lessonId) => [
      `lesson${lessonId}_best_score`,
      `lesson${lessonId}_pass_count`,
      `lesson${lessonId}_progress`,
      `lesson${lessonId}_cellIndex`,
      `lesson_progress_v2::fr::${lessonId}`,
      `lesson_progress_v2::fr::lesson${lessonId}_best_score`,
      `lesson_progress_v2::fr::lesson${lessonId}_pass_count`,
      `lesson_progress_v2::fr::lesson${lessonId}_progress`,
      `lesson_progress_v2::fr::lesson${lessonId}_cellIndex`,
    ]),
    ...(['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'final'] as const).flatMap((level) =>
      (['pct', 'best_pct', 'passed', 'pass_count', 'completed_at'] as const).flatMap((field) => [
        `level_exam_${level}_${field}`,
        `level_exams_v2::fr::level_exam_${level}_${field}`,
      ]),
    ),
  ] as const;

  test('users update rule is gated on progressHasNoPremiumWrites() (paywall self-grant guard)', () => {
    // The guard must be wired into the update rule, not merely defined.
    // We assert the gate is PRESENT in the users update rule rather than pinning the
    // exact full line — the rule legitimately ANDs further guards (e.g. hasNoShardWrites()),
    // and a strict string match would break every time a new guard is added.
    expect(rules).toContain('function progressHasNoPremiumWrites() {');
    expect(rules).toMatch(
      /allow update:\s*if\s+userDocOwnerMatchesAuth\(userId\)\s*&&[\s\S]*?progressHasNoPremiumWrites\(\)/,
    );
    // It must inspect the diff of the progress map's affected keys.
    expect(rules).toMatch(
      /function progressHasNoPremiumWrites\(\) \{[\s\S]*?\.get\('progress', \{\}\)[\s\S]*?\.diff\(resource\.data\.get\('progress', \{\}\)\)[\s\S]*?\.affectedKeys\(\)[\s\S]*?\.hasAny\(\[/,
    );
  });

  test('ordinary user-field updates short-circuit the large progress guard', () => {
    expect(rules).toMatch(
      /function progressHasNoPremiumWrites\(\) \{[\s\S]*?request\.resource\.data\.diff\(resource\.data\)\.affectedKeys\(\)\.hasAny\(\['progress'\]\)/,
    );
  });

  test('blockedPremiumProgressKeys() lists every premium/VIP entitlement key', () => {
    // The denied-keys list was extracted into blockedPremiumProgressKeys() so that BOTH
    // the update guard (progressHasNoPremiumWrites) and the create guard
    // (newDocHasNoPremiumWrites) check the exact same set. Pin the list in that function.
    const guardBlock = rules.match(
      /function blockedPremiumProgressKeys\(\) \{[\s\S]*?\n    \}/,
    );
    expect(guardBlock).not.toBeNull();
    for (const key of PREMIUM_PROGRESS_KEYS) {
      // Each entitlement key must appear inside the blocked-keys list so a
      // client diff (update) or key-presence check (create) touching it is rejected.
      expect(guardBlock![0]).toContain(`'${key}'`);
    }
  });

  test('both update and create premium guards consume blockedPremiumProgressKeys()', () => {
    // If either guard stops sharing the list, the two can silently drift (a key added to
    // one but not the other reopens the bypass on that path).
    expect(rules).toMatch(
      /function progressHasNoPremiumWrites\(\) \{[\s\S]*?\.hasAny\(blockedPremiumProgressKeys\(\)\)/,
    );
    expect(rules).toMatch(
      /function newDocHasNoPremiumWrites\(\) \{[\s\S]*?\.hasAny\(blockedPremiumProgressKeys\(\)\)/,
    );
  });

  test('premium guards block every server-owned progress key', () => {
    // The blocked keys now live in two functions: server-authoritative XP/streak/lesson
    // keys stay inside progressHasNoPremiumWrites(), while always-blocked keys (e.g.
    // collectibles) were lifted into blockedPremiumProgressKeys() so create+update share
    // them. A key is safe if it appears in EITHER block. Check the union.
    const updateGuard = rules.match(
      /function progressHasNoPremiumWrites\(\) \{[\s\S]*?\n    \}/,
    );
    const sharedList = rules.match(
      /function blockedPremiumProgressKeys\(\) \{[\s\S]*?\n    \}/,
    );
    expect(updateGuard).not.toBeNull();
    expect(sharedList).not.toBeNull();
    const blockedAnywhere = updateGuard![0] + sharedList![0];
    for (const key of SERVER_OWNED_PROGRESS_KEYS) {
      // During server-authoritative progress cutover, clients must not be able
      // to overwrite XP, streaks, lessons, exams, or collectibles directly.
      expect(blockedAnywhere).toContain(`'${key}'`);
    }
  });

  test('cloud_sync filters representative server-owned progress keys blocked by rules', () => {
    const cloudSync = readFileSync(path.join(process.cwd(), 'app/cloud_sync.ts'), 'utf8');
    const representativeKeys = [
      'user_total_xp',
      'lesson1_progress',
      'lesson_progress_v2::fr::1',
      'lesson_progress_v2::fr::lesson1_progress',
      'lesson_progress_v2::fr::lesson1_best_score',
      'level_exam_A1_pct',
      'level_exams_v2::fr::level_exam_A1_pct',
      'shard_survey_last_at_ms',
    ];

    for (const key of representativeKeys) {
      expect(rules).toContain(`'${key}'`);
    }
    expect(cloudSync).toMatch(
      /lesson_progress_v2::fr::\(\?:\\d\+\|lesson\\d\+_\(\?:best_score\|pass_count\|progress\|cellIndex\)\|unlocked_lessons\)/,
    );
    expect(cloudSync).toMatch(
      /level_exams_v2::fr::level_exam_\[A-Za-z0-9_-\]\+_\(\?:pct\|best_pct\|passed\|pass_count\|completed_at\)/,
    );
    expect(cloudSync).toMatch(/SERVER_OWNED_PROGRESS_KEYS[\s\S]*?'shard_survey_last_at_ms'/);
    expect(cloudSync.slice(0, cloudSync.indexOf('SERVER_OWNED_PROGRESS_KEYS')))
      .toContain("'shard_survey_last_at_ms'");
  });

  test('progressHasNoPremiumWrites() denies premium writes from browser admins too', () => {
    const guard = rules.match(/function progressHasNoPremiumWrites\(\) \{[\s\S]*?\n    \}/)?.[0] ?? '';
    expect(guard).not.toMatch(/return\s+isAdmin\(\)\s*\|\|/);
    expect(guard).toContain('.hasAny(blockedPremiumProgressKeys())');
  });

  test('users shard_log allows owner read and create only', () => {
    expect(rules).toContain('match /shard_log/{logId} {');
    expect(rules).toContain('allow read, create: if userDocOwnerMatchesAuth(userId);');
    expect(rules).toContain('allow update, delete: if false;');
  });

  test('leaderboard writes are restricted to admin callables while owners can delete', () => {
    const leaderboardBlock = rules.match(/match \/leaderboard\/\{userId\} \{[\s\S]*?\n    \}/);
    expect(leaderboardBlock).not.toBeNull();
    expect(leaderboardBlock![0]).toContain('allow read: if request.auth != null;');
    expect(leaderboardBlock![0]).toContain('allow create, update: if isAdmin();');
    expect(leaderboardBlock![0]).toContain('allow delete: if userDocOwnerMatchesAuth(userId);');
    expect(leaderboardBlock![0]).not.toContain('allow write: if request.auth != null;');
    expect(leaderboardBlock![0]).not.toContain('allow create: if newUserDocOwnerMatchesAuth(userId);');
  });

  test('leaderboard_stats aggregate is client-readable but admin-write only', () => {
    const statsBlock = rules.match(/match \/leaderboard_stats\/\{docId\} \{[\s\S]*?\n    \}/);
    expect(statsBlock).not.toBeNull();
    expect(statsBlock![0]).toContain('allow read: if true;');
    expect(statsBlock![0]).toContain('allow create, update, delete: if isAdmin();');
    expect(statsBlock![0]).not.toContain('allow write: if request.auth != null;');
  });

  test('card_packs marketplace exposes only published metadata to clients', () => {
    const cardPacksBlock = rules.match(/match \/card_packs\/\{packId\} \{[\s\S]*?\n    \}/);
    expect(cardPacksBlock).not.toBeNull();
    expect(cardPacksBlock![0]).toContain(
      "allow read: if isAdmin() || resource.data.status == 'published';",
    );
    expect(cardPacksBlock![0]).toContain('allow create, update, delete: if isAdmin();');
    expect(cardPacksBlock![0]).not.toContain('allow write: if request.auth != null;');
  });

  test('league_groups uses Cloud Functions for writes and keeps client reads only', () => {
    const leagueGroupsBlock = rules.match(/match \/league_groups\/\{groupId\} \{[\s\S]*?\n    \}/);
    expect(leagueGroupsBlock).not.toBeNull();
    expect(leagueGroupsBlock![0]).toContain('allow read: if request.auth != null;');
    expect(leagueGroupsBlock![0]).toContain('allow create, update, delete: if isAdmin();');
    expect(leagueGroupsBlock![0]).not.toContain('allow write: if request.auth != null;');
    expect(leagueGroupsBlock![0]).not.toContain('request.resource.data.diff(resource.data)');
    expect(leagueGroupsBlock![0]).not.toContain('allow read, write: if request.auth != null;');
  });

  test('league_groups write path is exported through callable functions', () => {
    const functionsIndex = readFileSync(path.join(process.cwd(), 'functions/src/index.ts'), 'utf8');
    expect(functionsIndex).toContain("require('./league_groups');");
    expect(functionsIndex).toMatch(/leagueJoinOrUpdateGroup,\s*leagueUpdateMyMember,\s*leagueSyncMyBoost[\s\S]*?=\s*require\('\.\/league_groups'\);/);
    expect(functionsIndex).toContain('exports.leagueJoinOrUpdateGroup = leagueJoinOrUpdateGroup;');
    expect(functionsIndex).toContain('exports.leagueUpdateMyMember = leagueUpdateMyMember;');
    expect(functionsIndex).toContain('exports.leagueSyncMyBoost = leagueSyncMyBoost;');
  });

  test('admin catch-all remains admin-only and is followed by a terminal deny', () => {
    const catchAllBlock = rules.match(/match \/\{collection\}\/\{document=\*\*\} \{[\s\S]*?\n    \}/);
    expect(catchAllBlock).not.toBeNull();
    expect(catchAllBlock![0]).toMatch(/allow read, write: if isAdmin\(\)[\s\S]*?;/);
    expect(catchAllBlock![0]).not.toContain('allow read, write: if false;');

    const terminalDenyStart = rules.lastIndexOf('match /{document=**} {');
    expect(terminalDenyStart).toBeGreaterThan(catchAllBlock!.index!);
    expect(rules.slice(terminalDenyStart)).toMatch(
      /^match \/\{document=\*\*\} \{\s*allow read, write: if false;\s*\}/,
    );
  });

  test('cloud sync strips every server-owned gift entitlement key', () => {
    const cloudSync = readFileSync(path.join(process.cwd(), 'app', 'cloud_sync.ts'), 'utf8');
    const keySet = cloudSync.match(/const PREMIUM_PROGRESS_KEYS = new Set\(\[([\s\S]*?)\]\);/);
    expect(keySet).not.toBeNull();
    for (const key of [
      'intro_access_until_ms',
      'intro_access_granted_at_ms',
      'loyalty_gift_until_ms',
      'loyalty_gift_granted_at_ms',
    ]) {
      expect(keySet![1]).toContain(`'${key}'`);
    }
  });

  test('referral ledger migration state is server-owned on user create and update', () => {
    const guardBlock = rules.match(
      /function blockedPremiumProgressKeys\(\) \{[\s\S]*?\n    \}/,
    );
    expect(guardBlock).not.toBeNull();
    expect(guardBlock![0]).toContain("'referral_spin_ledger_version'");
    expect(guardBlock![0]).toContain("'referral_spin_ledger_migrated_at_ms'");
    expect(rules).toMatch(
      /function progressHasNoPremiumWrites\(\) \{[\s\S]*?\.hasAny\(blockedPremiumProgressKeys\(\)\)/,
    );
    expect(rules).toMatch(
      /function newDocHasNoPremiumWrites\(\) \{[\s\S]*?\.hasAny\(blockedPremiumProgressKeys\(\)\)/,
    );
  });

  test('referral spin credit ledger subcollection rejects every client write', () => {
    const ledgerBlock = rules.match(
      /match \/referral_spin_credit_ledger\/\{creditId\} \{[\s\S]*?\n      \}/,
    );
    expect(ledgerBlock).not.toBeNull();
    expect(ledgerBlock![0]).toMatch(/allow create, update, delete:\s*if false;/);
  });

  test('app diagnostics collections are server/admin-write only with admin read', () => {
    // Hardened: client create is now denied (was `request.auth != null`).
    // Diagnostics docs are written by Cloud Functions (Admin SDK), read by admin.
    expect(rules).toMatch(/match \/app_errors\/\{docId\} \{[\s\S]*?allow create: if false;[\s\S]*?allow read, update, delete: if isAdmin\(\);/);
    expect(rules).toMatch(/match \/app_activity\/\{docId\} \{[\s\S]*?allow create: if false;[\s\S]*?allow read, update, delete: if isAdmin\(\);/);
  });

  test('website checkout admin page can save prices and manage web orders only as admin', () => {
    const checkoutBlock = rules.match(/match \/web_checkout\/\{docId\} \{[\s\S]*?\n    \}/);
    expect(checkoutBlock).not.toBeNull();
    expect(checkoutBlock![0]).toContain('allow read, create, update: if isAdmin();');
    expect(checkoutBlock![0]).toContain('allow delete: if false;');
    expect(checkoutBlock![0]).not.toContain('request.auth != null');

    const orderBlock = rules.match(/match \/web_premium_orders\/\{orderId\} \{[\s\S]*?\n    \}/);
    expect(orderBlock).not.toBeNull();
    expect(orderBlock![0]).toContain('allow read, update: if isAdmin();');
    expect(orderBlock![0]).toContain('allow create, delete: if false;');
    expect(orderBlock![0]).not.toContain('request.auth != null');
  });

  test('admin email contacts and campaigns are server-created with admin read/update', () => {
    const contactsBlock = rules.match(/match \/email_contacts\/\{docId\} \{[\s\S]*?\n    \}/);
    expect(contactsBlock).not.toBeNull();
    expect(contactsBlock![0]).toContain('allow read, update, delete: if isAdmin();');
    expect(contactsBlock![0]).toContain('allow create: if false;');
    expect(contactsBlock![0]).not.toContain('request.auth != null');

    const campaignsBlock = rules.match(/match \/email_campaigns\/\{docId\} \{[\s\S]*?\n    \}/);
    expect(campaignsBlock).not.toBeNull();
    expect(campaignsBlock![0]).toContain('allow read, update, delete: if isAdmin();');
    expect(campaignsBlock![0]).toContain('allow create: if false;');
    expect(campaignsBlock![0]).not.toContain('request.auth != null');
  });

  test('arena_rooms is decommissioned and denies all client access', () => {
    const arenaRoomsBlock = rules.match(/match \/arena_rooms\/\{roomId\} \{[\s\S]*?\n    \}/);
    expect(arenaRoomsBlock).not.toBeNull();
    expect(arenaRoomsBlock![0]).toContain('allow read, write: if false;');
  });

  test('arena_questions runtime pool is decommissioned and denies all client access', () => {
    const arenaQuestionsBlock = rules.match(/match \/arena_questions\/\{qId\} \{[\s\S]*?\n    \}/);
    expect(arenaQuestionsBlock).not.toBeNull();
    expect(arenaQuestionsBlock![0]).toContain('allow read, write: if false;');
  });

  test('arena_invites legacy flow is decommissioned and denies all client access', () => {
    const arenaInvitesBlock = rules.match(/match \/arena_invites\/\{inviteId\} \{[\s\S]*?\n    \}/);
    expect(arenaInvitesBlock).not.toBeNull();
    expect(arenaInvitesBlock![0]).toContain('allow read, write: if false;');
  });

  test('friend activity my_events keeps client reads but restricts writes to admins/server', () => {
    expect(rules).toContain('match /users/{userId}/my_events/{eventId} {');
    expect(rules).toMatch(/my_events\/\{eventId\} \{[\s\S]*?allow read: if request\.auth != null;/);
    expect(rules).toMatch(/my_events\/\{eventId\} \{[\s\S]*?allow create, update, delete: if isAdmin\(\);/);
    expect(rules).not.toMatch(/my_events\/\{eventId\} \{[\s\S]*?allow create, update, delete: if canonicalUserMatchesAuth\(userId\);/);
  });

  test('friend activity likes are server-written with readable counters and owner-only daily state', () => {
    expect(rules).toContain('match /users/{userId}/friend_activity_like_daily_limits/{dayId} {');
    expect(rules).toMatch(/friend_activity_like_daily_limits\/\{dayId\} \{[\s\S]*?allow read: if canonicalUserMatchesAuth\(userId\);/);
    expect(rules).toMatch(/friend_activity_like_daily_limits\/\{dayId\} \{[\s\S]*?allow create, update, delete: if isAdmin\(\);/);
    expect(rules).toMatch(/activity_like_stats\/\{docId\} \{[\s\S]*?allow read: if request\.auth != null;/);
    expect(rules).toMatch(/activity_like_stats\/\{docId\} \{[\s\S]*?allow create, update, delete: if isAdmin\(\);/);
  });

  test('app messages allow user-owned read state and per-message reactions', () => {
    expect(rules).toContain('match /app_messages/{messageId} {');
    expect(rules).toContain('match /app_message_states/{messageId} {');
    expect(rules).toMatch(/app_message_states\/\{messageId\} \{[\s\S]*?allow read, create, update, delete: if userDocOwnerMatchesAuth\(userId\);/);
    expect(rules).toMatch(/app_messages\/\{messageId\} \{[\s\S]*?allow read: if request\.auth != null;/);
    expect(rules).toMatch(/reactions\/\{userId\} \{[\s\S]*?request\.resource\.data\.messageId == messageId/);
    expect(rules).toMatch(/reactions\/\{userId\} \{[\s\S]*?request\.resource\.data\.reaction in \['like', 'dislike'\]/);
    expect(rules).toContain('match /poll_votes/{userId} {');
    expect(rules).toMatch(/poll_votes\/\{userId\} \{[\s\S]*?allow create, update: if appMessagePollVoteOk\(messageId, userId\);/);
    expect(rules).toMatch(/function appMessagePollVoteOk\(messageId, userId\) \{[\s\S]*?request\.resource\.data\.optionId in message\.poll\.optionIds/);
  });

  test('auth_links reads stay scoped while all browser writes are denied', () => {
    const authLinksBlocks = exactRootMatchBlocks('auth_links/{providerUid}');
    expect(authLinksBlocks).toHaveLength(1);
    const authLinksBlock = authLinksBlocks[0];
    expect(authLinksBlock).toContain('function ownsAuthLinkDoc()');
    expect(authLinksBlock).toContain('request.auth.uid == providerUid');
    expect(activeAllowLines(authLinksBlock)).toEqual([
      'allow read: if isAdmin() || ownsAuthLinkDoc();',
      'allow create, update, delete: if false;',
    ]);
  });

  test('auth_links are excluded from the browser-admin catch-all write grant', () => {
    expect(rules).toContain("&& collection != 'auth_links'");
  });

  test.each([
    'auth_recovery_codes',
    'auth_recovery_rate_limits',
    'auth_recovery_events',
    'auth_recovery_challenges',
    'auth_recovery_delivery_intents',
    'auth_recovery_idempotency',
    'auth_recovery_clean_rate_limits',
  ])('%s is server-only for every browser client, including admins', (collection) => {
    const blocks = exactRootMatchBlocks(`${collection}/{document=**}`);
    expect(blocks).toHaveLength(1);
    expect(activeAllowLines(blocks[0])).toEqual(['allow read, write: if false;']);
  });

  test('identity deletion and recovery roots are excluded from the browser-admin catch-all', () => {
    const catchAllBlocks = exactRootMatchBlocks('{collection}/{document=**}');
    expect(catchAllBlocks).toHaveLength(1);
    const catchAllAllows = activeAllowLines(catchAllBlocks[0]);
    expect(catchAllAllows).toHaveLength(1);
    expect(catchAllAllows[0]).toMatch(/^allow read, write: if isAdmin\(\) && /);
    expect(catchAllAllows[0]).toMatch(/;$/);
    for (const collection of [
      'account_deletion_tombstones',
      'account_deletion_auth_markers',
      'auth_recovery_codes',
      'auth_recovery_rate_limits',
      'auth_recovery_events',
      'auth_recovery_challenges',
      'auth_recovery_delivery_intents',
      'auth_recovery_idempotency',
      'auth_recovery_clean_rate_limits',
    ]) {
      expect(catchAllBlocks[0]).toContain(`&& collection != '${collection}'`);
    }
  });

  test('account deletion auth marker keeps exact owner read and denies every browser write', () => {
    const blocks = exactRootMatchBlocks('account_deletion_auth_markers/{authUid}');
    expect(blocks).toHaveLength(1);
    expect(activeAllowLines(blocks[0])).toEqual([
      'allow read: if request.auth != null && request.auth.uid == authUid;',
      'allow write: if false;',
    ]);
  });

  test('user_consents keeps owner/admin read but denies every browser write (accountability record)', () => {
    // Документ хранит ФАКТ и ДАТУ согласия пользователя (analytics/AI-explain/
    // AI-dialog/age-bracket) — если клиент мог бы переписать его напрямую через
    // Firestore SDK, документ переставал бы годиться как доказательство согласия.
    // Запись разрешена ТОЛЬКО через Cloud Functions (Admin SDK, ниже) — см. также
    // app/ai_explain_consent.ts / app/ai_dialog_consent.ts комментарии.
    const blocks = exactRootMatchBlocks('user_consents/{userId}');
    expect(blocks).toHaveLength(1);
    expect(activeAllowLines(blocks[0])).toEqual([
      'allow read: if isAdmin() || isOwner(userId) || stableUserMatchesAuth(userId);',
      'allow write: if false;',
    ]);
  });

  test('user_consents writers (age bracket, AI-explain, AI-dialog consent) all use the Admin SDK path', () => {
    // Admin SDK bypasses firestore.rules entirely — this is what keeps these
    // callables working even though the rule above denies every client write.
    for (const file of [
      'functions/src/record_age_consent_snapshot.ts',
      'functions/src/record_ai_consent_factory.ts',
    ]) {
      const source = readFileSync(path.join(process.cwd(), file), 'utf8');
      expect(source).toContain("import * as admin from 'firebase-admin';");
      expect(source).toContain('admin.firestore()');
    }
    // record_ai_explain_consent.ts / record_ai_dialog_consent.ts are thin
    // wrappers around record_ai_consent_factory.ts — confirm they route through
    // it rather than writing user_consents some other way.
    const explainCallable = readFileSync(path.join(process.cwd(), 'functions/src/record_ai_explain_consent.ts'), 'utf8');
    expect(explainCallable).toContain("createRecordAiConsentCallable('aiExplainConsent')");
    const dialogCallable = readFileSync(path.join(process.cwd(), 'functions/src/record_ai_dialog_consent.ts'), 'utf8');
    expect(dialogCallable).toContain("createRecordAiConsentCallable('aiDialogConsent')");
  });

  test('auth_links server writes remain on the Admin SDK path', () => {
    const authIdentity = readFileSync(path.join(process.cwd(), 'functions/src/auth_identity.ts'), 'utf8');
    expect(authIdentity).toContain("import * as admin from 'firebase-admin';");
    expect(authIdentity).toContain("const AUTH_LINKS = 'auth_links';");
    expect(authIdentity).toContain('transaction.set(authLinkRef, linkPatch, { merge: true });');
    expect(authIdentity).toContain('transaction.create(authLinkRef, authLinkData);');
  });
});

describe('firestore.rules friend system (Phase 1)', () => {
  const rules = readFileSync(rulesPath, 'utf8');

  test('friend_code_index rule allows authenticated read', () => {
    expect(rules).toContain('match /friend_code_index/{code} {');
    expect(rules).toMatch(/match \/friend_code_index\/\{code\} \{[\s\S]*?allow read: if request\.auth != null;/);
  });

  test('friend_code_index writes are restricted to Cloud Functions/admin', () => {
    const friendCodeBlock = rules.match(/match \/friend_code_index\/\{code\} \{[\s\S]*?\n    \}/);
    expect(friendCodeBlock).not.toBeNull();
    expect(friendCodeBlock![0]).toContain('allow read: if request.auth != null;');
    expect(friendCodeBlock![0]).toContain('allow create, update, delete: if isAdmin();');
    expect(friendCodeBlock![0]).not.toContain('allow create: if request.auth != null');
  });

  test('friend_code_index write path is exported through callable function', () => {
    const functionsIndex = readFileSync(path.join(process.cwd(), 'functions/src/index.ts'), 'utf8');
    const friendCodes = readFileSync(path.join(process.cwd(), 'functions/src/friend_codes.ts'), 'utf8');
    expect(functionsIndex).toContain("const { friendEnsureMyCode } = require('./friend_codes');");
    expect(functionsIndex).toContain('exports.friendEnsureMyCode = friendEnsureMyCode;');
    expect(friendCodes).toContain('if (linkedAuthUid === authUid) return;');
  });

  test('friend_requests create requires senderUid to match the signed-in canonical user (anti-impersonation)', () => {
    expect(rules).toContain('match /users/{targetUid}/friend_requests/{senderUid} {');
    expect(rules).toMatch(/friend_requests\/\{senderUid\}[\s\S]*?canonicalUserMatchesAuth\(senderUid\)/);
  });

  test('friend_requests create checks banned_users (SEC-05)', () => {
    expect(rules).toMatch(/friend_requests\/\{senderUid\}[\s\S]*?!exists\(\/databases\/\$\(database\)\/documents\/banned_users\/\$\(senderUid\)\)/);
  });

  test('friend_requests create requires status == pending', () => {
    expect(rules).toMatch(/friend_requests\/\{senderUid\}[\s\S]*?request\.resource\.data\.status == 'pending'/);
  });

  test('friend_requests create permits only a bounded sender display name', () => {
    expect(rules).toMatch(/friend_requests\/\{senderUid\}[\s\S]*?fromName[\s\S]*?request\.resource\.data\.fromName is string[\s\S]*?request\.resource\.data\.fromName\.size\(\) <= 40/);
  });

  test('friend_requests forbids self-targeting', () => {
    expect(rules).toMatch(/friend_requests\/\{senderUid\}[\s\S]*?targetUid != senderUid/);
  });

  test('friend_requests update is field-restricted to status and updatedAt', () => {
    expect(rules).toMatch(/friend_requests\/\{senderUid\}[\s\S]*?affectedKeys\(\)[\s\S]*?\.hasOnly\(\['status', 'updatedAt'\]\)/);
  });

  test('friend_requests update only permits accepted or declined statuses', () => {
    expect(rules).toMatch(/friend_requests\/\{senderUid\}[\s\S]*?request\.resource\.data\.status in \['accepted', 'declined'\]/);
  });

  test('friend_requests delete restricted to target', () => {
    expect(rules).toMatch(/friend_requests\/\{senderUid\}[\s\S]*?allow delete: if canonicalUserMatchesAuth\(targetUid\) \|\| canonicalUserMatchesAuth\(senderUid\);/);
  });

  test('friends subcollection rule exists with canonical owner create', () => {
    expect(rules).toContain('match /users/{ownerUid}/friends/{friendUid} {');
    expect(rules).toMatch(/friends\/\{friendUid\}[\s\S]*?allow create: if request\.auth != null[\s\S]*?canonicalUserMatchesAuth\(ownerUid\)/);
  });

  test('friends subcollection forbids self-friending', () => {
    expect(rules).toMatch(/friends\/\{friendUid\}[\s\S]*?ownerUid != friendUid/);
  });

  test('friends subcollection forbids updates', () => {
    expect(rules).toMatch(/friends\/\{friendUid\}[\s\S]*?allow update: if false;/);
  });

  test('friends subcollection delete allows ownerUid or friendUid (bidirectional)', () => {
    // Updated in Plan 02-01 to support bidirectional client-side removal.
    expect(rules).toMatch(/friends\/\{friendUid\}[\s\S]*?allow delete: if canonicalUserMatchesAuth\(ownerUid\) \|\| canonicalUserMatchesAuth\(friendUid\);/);
  });

  test('terminal deny is still the last match block (D-09 regression guard)', () => {
    const matches = [...rules.matchAll(/match \/[^\s]+ \{/g)];
    const lastMatch = matches[matches.length - 1];
    expect(lastMatch).toBeDefined();
    expect(lastMatch![0]).toContain('match /{document=**}');

    const lastMatchIndex = lastMatch!.index ?? -1;
    expect(lastMatchIndex).toBeGreaterThan(-1);
    expect(rules.slice(lastMatchIndex)).toMatch(
      /^match \/\{document=\*\*\} \{\s*allow read, write: if false;\s*\}\s*\}\s*\}\s*$/,
    );
  });

  test('existing rules untouched — users, leaderboard, banned_users, auth_links blocks still present', () => {
    expect(rules).toContain('match /users/{userId} {');
    expect(rules).toContain('match /leaderboard/{userId} {');
    expect(rules).toContain('match /banned_users/{docId} {');
    expect(rules).toContain('match /auth_links/{providerUid} {');
  });

  test('shard operation and global reward claim receipts are server-only', () => {
    const receiptBlock = rules.match(/match \/shard_operation_receipts\/\{opId\} \{[\s\S]*?\n      \}/);
    expect(receiptBlock).not.toBeNull();
    expect(receiptBlock![0]).toContain('allow read, write: if false;');

    const rewardClaimsBlock = rules.match(/match \/reward_claims\/\{claimId\} \{[\s\S]*?\n      \}/);
    expect(rewardClaimsBlock).not.toBeNull();
    expect(rewardClaimsBlock![0]).toContain('allow read: if userDocOwnerMatchesAuth(userId);');
    expect(rewardClaimsBlock![0]).toContain('allow create: if false;');
  });

  test('gift perks reject client forge while shard inbox only permits seen fields', () => {
    expect(rules).toContain('function hasNoServerGiftPerkWrites()');
    expect(rules).toContain('&& hasNoServerGiftPerkWrites()');
    const perkGuard = rules.slice(
      rules.indexOf('function hasNoServerGiftPerkWrites()'),
      rules.indexOf('function newDocHasNoServerGiftPerkWrites()'),
    );
    const newPerkGuard = rules.slice(
      rules.indexOf('function newDocHasNoServerGiftPerkWrites()'),
      rules.indexOf('function hasNoProgressAuthorityMarkerWrites()'),
    );
    expect(perkGuard).not.toContain('isAdmin()');
    expect(newPerkGuard).not.toContain('isAdmin()');
    for (const key of ['chain_shield', 'gift_xp_multiplier', 'club_gift_free_boost_v1']) {
      expect(perkGuard).toContain(`'${key}'`);
      expect(newPerkGuard).toContain(`'${key}'`);
    }
    const inbox = rules.match(/match \/shard_rewards\/\{rewardId\} \{[\s\S]*?\n      \}/);
    expect(inbox).not.toBeNull();
    expect(inbox![0]).toContain("affectedKeys().hasOnly(['seen', 'seenAt'])");
    expect(inbox![0]).toContain('allow create: if false;');
    expect(inbox![0]).not.toContain('request.resource.data.qa');
    expect(rules).toContain('match /gift_perk_consumptions/{receiptId} {');
  });

  test('shard earn daily counters are server-only', () => {
    const counterBlock = rules.match(
      /match \/shard_earn_daily_counters\/\{dayKey\} \{[\s\S]*?\n      \}/,
    );
    expect(counterBlock).not.toBeNull();
    expect(counterBlock![0]).toContain('allow read, write: if false;');
  });

  test('legacy admin catch-all excludes users and explicit shard subcollection denies remain', () => {
    const catchAllBlock = rules.match(
      /match \/\{collection\}\/\{document=\*\*\} \{[\s\S]*?\n    \}/,
    );
    expect(catchAllBlock).not.toBeNull();
    expect(catchAllBlock![0]).toContain("collection != 'users'");

    const usersRootBlock = rules.match(
      /^    match \/users\/\{userId\} \{[\s\S]*?(?=^    match \/)/m,
    );
    expect(usersRootBlock).not.toBeNull();
    expect(usersRootBlock![0]).toMatch(
      /match \/shard_operation_receipts\/\{opId\} \{\s*allow read, write: if false;\s*\}/,
    );
    expect(usersRootBlock![0]).toMatch(
      /match \/shard_earn_daily_counters\/\{dayKey\} \{\s*allow read, write: if false;\s*\}/,
    );
  });
});

describe('firestore.rules coin exchange (coins → stars, 2026-07-20 plan §6)', () => {
  const rules = readFileSync(rulesPath, 'utf8');

  test('exchange state, history and trade ledger are server-only', () => {
    for (const name of ['economy', 'economy_exchange_history', 'coin_exchange_trades', 'coin_migrations']) {
      const re = new RegExp('match /' + name + '/\\{document=\\*\\*\\} \\{[\\s\\S]*?\\n    \\}');
      const block = rules.match(re);
      expect(block).not.toBeNull();
      expect(block![0]).toContain('allow read, write: if false;');
      const catchAllStart = rules.indexOf('match /{collection}/{document=**} {');
      expect(rules.slice(catchAllStart)).toContain(`collection != '${name}'`);
    }
  });

  test('v2 star journal subcollection is server-only', () => {
    const block = rules.match(/match \/v2_star_journal\/\{entryId\} \{[\s\S]*?\n      \}/);
    expect(block).not.toBeNull();
    expect(block![0]).toContain('allow read, write: if false;');
  });

  test('star wallet and coin migration fields are covered by both shard write guards', () => {
    const guardBodies = rules.match(/function (?:hasNoShardWrites|newDocHasNoShardWrites)\(\) \{[\s\S]*?\n    \}/g);
    expect(guardBodies).not.toBeNull();
    expect(guardBodies!.length).toBeGreaterThanOrEqual(2);
    for (const body of guardBodies!) {
      expect(body).toContain("'v2_access_stars'");
      expect(body).toContain("'v2_access_stars_updated_at_ms'");
      expect(body).toContain("'coins_migration_v1'");
      expect(body).toContain("'coins_migration_v1_record'");
    }
  });
});

describe('firestore.rules Explain like I\'m five (Phase 5)', () => {
  const rules = readFileSync(rulesPath, 'utf8');

  // Публичный кэш объяснений: клиент читает напрямую, но НИКОГДА не пишет публичный контент.
  // Запись контента — только Admin SDK из CF explainPhrase (инвариант аудита).
  // delete: isAdmin() — это «Сбросить объяснение» в админке (2026-06-10, раздел «Непонятно
  // объяснили»): удаление дока заставляет следующий запрос сгенерировать фразу заново.
  test('phrase_explanations: world-readable, content writes denied, admin may only DELETE (reset)', () => {
    const block = rules.match(/match \/phrase_explanations\/\{phraseHash\} \{[\s\S]*?\n    \}/);
    expect(block).not.toBeNull();
    expect(block![0]).toContain('allow read: if true;');
    expect(block![0]).toContain('allow create, update: if false;');
    expect(block![0]).toContain('allow delete: if isAdmin();');
    // Клиент (и даже админ из браузера) не должен СОЗДАВАТЬ/МЕНЯТЬ публичный контент.
    expect(block![0]).not.toContain('allow write: if request.auth != null;');
    expect(block![0]).not.toContain('allow create, update: if isAdmin()');
  });

  // Три внутренние CF-only коллекции: read И write полностью закрыты (если false), а НЕ
  // isAdmin() — они не открыты admin-панели; копирование isAdmin() провалило бы этот тест.
  const SERVER_ONLY_EXPLAIN_COLLECTIONS = [
    'explain_global_budget',
    'explain_user_limits',
    'explain_billing',
  ] as const;

  for (const collection of SERVER_ONLY_EXPLAIN_COLLECTIONS) {
    test(`${collection} is server-only: read AND write are denied (if false, not isAdmin())`, () => {
      const block = rules.match(new RegExp(`match /${collection}/\\{docId\\} \\{[\\s\\S]*?\\n    \\}`));
      expect(block).not.toBeNull();
      expect(block![0]).toContain('allow read: if false;');
      expect(block![0]).toContain('allow write: if false;');
      // Никаких клиентских/админских лазеек: ни isAdmin(), ни authed read/write.
      expect(block![0]).not.toContain('isAdmin()');
      expect(block![0]).not.toContain('request.auth != null');
    });
  }

  // Жалобы «Непонятно объяснили» (2026-06-10): пишет ТОЛЬКО CF (create/update: false),
  // админка читает и разбирает — паттерн user_reports. НЕ публичные: никакого read:true
  // и никакого request.auth != null (только isAdmin).
  test('explain_reports (счётчики): admin read+delete, никакой клиентской записи', () => {
    const block = rules.match(/match \/explain_reports\/\{docId\} \{[\s\S]*?\n    \}/);
    expect(block).not.toBeNull();
    expect(block![0]).toContain('allow read, delete: if isAdmin();');
    expect(block![0]).toContain('allow create, update: if false;');
    expect(block![0]).not.toContain('read: if true');
    expect(block![0]).not.toContain('request.auth != null');
  });

  test('explain_report_entries (лента жалоб): admin read/update/delete, create только CF', () => {
    const block = rules.match(/match \/explain_report_entries\/\{docId\} \{[\s\S]*?\n    \}/);
    expect(block).not.toBeNull();
    expect(block![0]).toContain('allow read, update, delete: if isAdmin();');
    expect(block![0]).toContain('allow create: if false;');
    expect(block![0]).not.toContain('read: if true');
    expect(block![0]).not.toContain('request.auth != null');
  });

  test('explain blocks sit at ROOT level, before the admin-gated catch-all', () => {
    const catchAllIdx = rules.indexOf('match /{collection}/{document=**} {');
    expect(catchAllIdx).toBeGreaterThan(-1);
    for (const collection of [
      'phrase_explanations',
      ...SERVER_ONLY_EXPLAIN_COLLECTIONS,
      'explain_reports',
      'explain_report_entries',
    ]) {
      const idx = rules.indexOf(`match /${collection}/`);
      expect(idx).toBeGreaterThan(-1);
      expect(idx).toBeLessThan(catchAllIdx);
    }
  });
});

describe('RevenueCat premium lineage roots are server-only', () => {
  const rules = readFileSync(rulesPath, 'utf8');

  for (const collection of ['revenuecat_premium_lineages', 'revenuecat_premium_denials']) {
    test(`${collection} denies all direct client access`, () => {
      const block = rules.match(new RegExp(`match /${collection}/\\{docId\\} \\{[\\s\\S]*?\\n    \\}`));
      expect(block).not.toBeNull();
      expect(block![0]).toContain('allow read, write: if false;');
      expect(block![0]).not.toContain('isAdmin()');
      expect(block![0]).not.toContain('request.auth != null');
      const catchAll = rules.match(/match \/\{collection\}\/\{document=\*\*\} \{[\s\S]*?\n    \}/);
      expect(catchAll).not.toBeNull();
      expect(catchAll![0]).toContain(`collection != '${collection}'`);
    });
  }

  test('RevenueCat premium event receipts allow admin listing but deny browser-admin mutation', () => {
    const block = rules.match(/match \/revenuecat_premium_events\/\{eventId\} \{[\s\S]*?\n    \}/);
    expect(block).not.toBeNull();
    expect(block![0]).toContain('allow list: if isAdmin();');
    expect(block![0]).not.toMatch(/allow\s+(create|update|delete|write)/);
    const catchAll = rules.match(/match \/\{collection\}\/\{document=\*\*\} \{[\s\S]*?\n    \}/);
    expect(catchAll).not.toBeNull();
    expect(catchAll![0]).toContain("collection != 'revenuecat_premium_events'");
  });
});

describe('firestore.rules friends bidirectional create/delete (Plan 02-01)', () => {
  const rules = readFileSync(rulesPath, 'utf8');

  // FR-NEW-1: friendUid can create when accepted request exists
  test('FR-NEW-1: friends create rule allows friendUid when accepted request exists (get() check)', () => {
    expect(rules).toMatch(
      /friends\/\{friendUid\}[\s\S]*?canonicalUserMatchesAuth\(friendUid\)[\s\S]*?exists\(\/databases\/\$\(database\)\/documents\/users\/\$\(friendUid\)\/friend_requests\/\$\(ownerUid\)\)/,
    );
    expect(rules).toMatch(
      /friends\/\{friendUid\}[\s\S]*?get\(\/databases\/\$\(database\)\/documents\/users\/\$\(friendUid\)\/friend_requests\/\$\(ownerUid\)\)\.data\.status in \['pending', 'accepted'\]/,
    );
  });

  // FR-NEW-2: friendUid cannot create when no accepted request exists (rule requires get() check)
  test('FR-NEW-2: friends create rule still requires accepted request — ownerUid != friendUid guard unchanged', () => {
    // The rule gates friendUid create on exists() + status == accepted.
    // Verify the exists() call is present as the guard.
    expect(rules).toMatch(
      /exists\(\/databases\/\$\(database\)\/documents\/users\/\$\(friendUid\)\/friend_requests\/\$\(ownerUid\)\)/,
    );
  });

  // FR-NEW-3: third-party uid cannot create — ownerUid and friendUid are the only allowed actors
  test('FR-NEW-3: friends create rule does NOT include catch-all write for third parties', () => {
    // Rule only permits the canonical ownerUid OR canonical friendUid.
    // Verify it does NOT contain a permissive fallback like 'if request.auth != null' alone.
    const friendsBlock = rules.match(
      /match \/users\/\{ownerUid\}\/friends\/\{friendUid\} \{[\s\S]*?\}/,
    );
    expect(friendsBlock).not.toBeNull();
    // The create line must contain ownerUid or friendUid as auth check (not just request.auth != null alone).
    expect(friendsBlock![0]).toMatch(/canonicalUserMatchesAuth\(ownerUid\)/);
    expect(friendsBlock![0]).toMatch(/canonicalUserMatchesAuth\(friendUid\)/);
  });

  // FR-NEW-4: ownerUid can delete (existing behavior preserved)
  test('FR-NEW-4: friends delete still allows ownerUid', () => {
    expect(rules).toMatch(
      /friends\/\{friendUid\}[\s\S]*?allow delete:[\s\S]*?canonicalUserMatchesAuth\(ownerUid\)/,
    );
  });

  // FR-NEW-5: friendUid can now delete (new bidirectional behavior)
  test('FR-NEW-5: friends delete now allows friendUid (bidirectional removal)', () => {
    expect(rules).toMatch(
      /friends\/\{friendUid\}[\s\S]*?allow delete:[\s\S]*?canonicalUserMatchesAuth\(friendUid\)/,
    );
  });

  // FR-NEW-6: third-party uid cannot delete — only ownerUid or friendUid
  test('FR-NEW-6: friends delete is restricted to ownerUid OR friendUid (not catch-all)', () => {
    // The delete rule must include both ownerUid and friendUid with OR operator.
    expect(rules).toMatch(
      /allow delete: if canonicalUserMatchesAuth\(ownerUid\) \|\| canonicalUserMatchesAuth\(friendUid\);/,
    );
  });
});

describe('firestore.rules YouTube catalog access contract', () => {
  const rules = readFileSync(rulesPath, 'utf8');

  test('signed-in clients read only the public pointer and active ready snapshot', () => {
    expect(rules).toContain('function isActiveYoutubeSnapshot(version)');
    expect(rules).toMatch(/match \/youtube_catalog\/\{docId\} \{[\s\S]*?docId == 'public'[\s\S]*?request\.auth != null/);
    expect(rules).toMatch(/docId in \['config', 'sync_state'\][\s\S]*?isAdmin\(\)/);
    expect(rules).toMatch(/match \/youtube_catalog_snapshots\/\{version\} \{[\s\S]*?isActiveYoutubeSnapshot\(version\)[\s\S]*?resource\.data\.status == 'ready'/);
    expect(rules).toMatch(/match \/\{document=\*\*\} \{[\s\S]*?isReadyYoutubeSnapshot\(version\)/);
  });

  test('all browser writes and history access are denied, including browser admins', () => {
    const catalogBlock = rules.match(/match \/youtube_catalog\/\{docId\} \{[\s\S]*?\n    \}/);
    expect(catalogBlock).not.toBeNull();
    expect(catalogBlock![0]).toContain('allow create, update, delete: if false;');
    expect(rules).toMatch(/match \/youtube_catalog_history\/\{document=\*\*\} \{\s*allow read, write: if false;\s*\}/);
    const catchAll = rules.match(/match \/\{collection\}\/\{document=\*\*\} \{[\s\S]*?\n    \}/);
    expect(catchAll).not.toBeNull();
    for (const root of ['youtube_catalog', 'youtube_catalog_snapshots', 'youtube_catalog_history']) {
      expect(catchAll![0]).toContain(`collection != '${root}'`);
    }
  });
});
