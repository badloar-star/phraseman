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

const CONTENT_STUDIO_DIRECT_DENY_COLLECTIONS = [
  'content_mode_templates',
  'content_mode_template_draft_revisions',
  'content_mode_template_versions',
  'content_mode_template_lifecycle',
  'content_season_drafts',
  'content_season_revisions',
  'content_season_lifecycle',
  'content_episode_drafts',
  'content_episode_revisions',
  'content_episode_lifecycle',
  'content_studio_review_queue',
  'content_studio_localization_units',
  'content_studio_review_receipts',
  'content_studio_validation_receipts',
  'content_studio_waivers',
  'content_studio_preview_sessions',
  'content_studio_preview_receipts',
  'content_app_support_manifests',
] as const;

const CONTENT_STUDIO_CATCH_ALL_ONLY_COLLECTIONS = [
  'content_factory_stages',
  'content_factory_correction_events',
  'content_factory_artifact_orphans',
  'content_factory_releases',
  'content_factory_catalog',
  'content_factory_catalog_releases',
  'content_factory_release_history',
  'admin_command_operations',
  'content_factory_jobs',
  'content_factory_job_units',
  'content_factory_job_reviews',
  'content_factory_source_registry',
  'content_factory_daily_budget',
  'content_factory_budget_reservations',
] as const;

interface RootMatchBlock {
  readonly pattern: string;
  readonly normalizedPattern: string;
  readonly block: string;
  readonly index: number;
}

interface MatchDeclaration {
  readonly pattern: string;
  readonly index: number;
  readonly depth: number;
  readonly openingBraceIndex: number;
}

const EXPECTED_RECURSIVE_SUFFIX_RULES = new Map([
  ['{**}/app_message_states/{*}', 'allow list: if isAdmin();'],
  ['{**}/promo_redemptions/{*}', 'allow list: if isAdmin();'],
]);
const SEMANTIC_DOCUMENTS_CONTAINER_PATTERN = 'databases/{*}/documents';

function normalizeCaptureNames(pattern: string): string {
  return pattern
    .replace(/\{[A-Za-z_][A-Za-z0-9_]*=\*\*\}/g, '{**}')
    .replace(/\{[A-Za-z_][A-Za-z0-9_]*\}/g, '{*}');
}

function semanticDocumentsContainers(
  declarations: readonly MatchDeclaration[],
): MatchDeclaration[] {
  return declarations.filter(
    (declaration) =>
      normalizeCaptureNames(declaration.pattern) === SEMANTIC_DOCUMENTS_CONTAINER_PATTERN,
  );
}

function serviceLevelMatchDeclarations(
  declarations: readonly MatchDeclaration[],
): MatchDeclaration[] {
  if (declarations.length === 0) return [];
  const serviceLevelDepth = Math.min(...declarations.map((declaration) => declaration.depth));
  return declarations.filter((declaration) => declaration.depth === serviceLevelDepth);
}

function maskCommentsAndStrings(source: string): string {
  return source.replace(
    /'(?:\\[\s\S]|[^'\\])*'|"(?:\\[\s\S]|[^"\\])*"|\/\/[^\r\n]*|\/\*[\s\S]*?\*\//g,
    (token) => token.replace(/[^\r\n]/g, ' '),
  );
}

function isRulesWhitespace(character: string | undefined): boolean {
  return character !== undefined && /\s/.test(character);
}

function isRulesIdentifierCharacter(character: string | undefined): boolean {
  return character !== undefined && /[A-Za-z0-9_]/.test(character);
}

function isRulesIdentifierStartCharacter(character: string | undefined): boolean {
  return character !== undefined && /[A-Za-z_]/.test(character);
}

function skipRulesWhitespace(source: string, startIndex: number): number {
  let index = startIndex;
  while (isRulesWhitespace(source[index])) index += 1;
  return index;
}

function captureAt(
  structuralSource: string,
  openingBraceIndex: number,
): { readonly pattern: string; readonly endIndex: number } | null {
  let cursor = skipRulesWhitespace(structuralSource, openingBraceIndex + 1);
  if (!isRulesIdentifierStartCharacter(structuralSource[cursor])) return null;

  const identifierStart = cursor;
  cursor += 1;
  while (isRulesIdentifierCharacter(structuralSource[cursor])) cursor += 1;
  const identifier = structuralSource.slice(identifierStart, cursor);
  cursor = skipRulesWhitespace(structuralSource, cursor);

  if (structuralSource[cursor] === '}') {
    return { pattern: `{${identifier}}`, endIndex: cursor + 1 };
  }
  if (structuralSource[cursor] !== '=') return null;

  cursor = skipRulesWhitespace(structuralSource, cursor + 1);
  if (structuralSource[cursor] !== '*' || structuralSource[cursor + 1] !== '*') return null;
  cursor = skipRulesWhitespace(structuralSource, cursor + 2);
  if (structuralSource[cursor] !== '}') return null;

  return { pattern: `{${identifier}=**}`, endIndex: cursor + 1 };
}

function matchPathAt(
  structuralSource: string,
  leadingSlashIndex: number,
): { readonly pattern: string; readonly openingBraceIndex: number } | null {
  const segments: string[] = [];
  let cursor = leadingSlashIndex + 1;

  while (cursor < structuralSource.length) {
    cursor = skipRulesWhitespace(structuralSource, cursor);
    if (structuralSource[cursor] === '{') {
      const capture = captureAt(structuralSource, cursor);
      if (!capture) return null;
      segments.push(capture.pattern);
      cursor = capture.endIndex;
    } else {
      const segmentStart = cursor;
      while (
        cursor < structuralSource.length
        && !isRulesWhitespace(structuralSource[cursor])
        && !['/', '{', '}'].includes(structuralSource[cursor])
      ) {
        cursor += 1;
      }
      if (cursor === segmentStart) return null;
      segments.push(structuralSource.slice(segmentStart, cursor));
    }

    cursor = skipRulesWhitespace(structuralSource, cursor);
    if (structuralSource[cursor] === '/') {
      cursor += 1;
      continue;
    }
    if (structuralSource[cursor] === '{') {
      return {
        pattern: segments.join('/'),
        openingBraceIndex: cursor,
      };
    }
    return null;
  }

  return null;
}

function matchDeclarationAt(
  structuralSource: string,
  index: number,
  depth: number,
): MatchDeclaration | null {
  const keyword = 'match';
  if (!structuralSource.startsWith(keyword, index)) return null;
  if (isRulesIdentifierCharacter(structuralSource[index - 1])) return null;

  let cursor = index + keyword.length;
  if (!isRulesWhitespace(structuralSource[cursor])) return null;
  cursor = skipRulesWhitespace(structuralSource, cursor);
  if (structuralSource[cursor] !== '/') return null;

  const path = matchPathAt(structuralSource, cursor);
  if (!path) return null;
  return {
    pattern: path.pattern,
    index,
    depth,
    openingBraceIndex: path.openingBraceIndex,
  };
}

function parseMatchDeclarations(structuralSource: string): MatchDeclaration[] {
  const declarations: MatchDeclaration[] = [];
  let depth = 0;

  for (let index = 0; index < structuralSource.length; index += 1) {
    const declaration = matchDeclarationAt(structuralSource, index, depth);
    if (declaration) declarations.push(declaration);

    if (structuralSource[index] === '{') depth += 1;
    if (structuralSource[index] === '}') depth -= 1;
  }

  return declarations;
}

function matchBlockEnd(structuralSource: string, openingBraceIndex: number): number {
  let depth = 0;

  for (let index = openingBraceIndex; index < structuralSource.length; index += 1) {
    if (structuralSource[index] === '{') depth += 1;
    if (structuralSource[index] === '}') {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }

  return structuralSource.length;
}

function rootMatchBlocks(source: string): RootMatchBlock[] {
  const structuralSource = maskCommentsAndStrings(source);
  const declarations = parseMatchDeclarations(structuralSource);
  const serviceLevelMatches = serviceLevelMatchDeclarations(declarations);
  const documentsMatches = semanticDocumentsContainers(serviceLevelMatches);

  return documentsMatches.flatMap((documentsMatch) => {
    const documentsBlockEnd = matchBlockEnd(
      structuralSource,
      documentsMatch.openingBraceIndex,
    );
    const rootDepth = documentsMatch.depth + 1;

    return declarations
      .filter(
        (declaration) =>
          declaration.depth === rootDepth
          && declaration.index > documentsMatch.openingBraceIndex
          && declaration.index < documentsBlockEnd,
      )
      .map((declaration) => {
        const end = matchBlockEnd(structuralSource, declaration.openingBraceIndex);

        return {
          pattern: declaration.pattern,
          normalizedPattern: normalizeCaptureNames(declaration.pattern),
          block: source.slice(declaration.index, end),
          index: declaration.index,
        };
      });
  });
}

function rootRecursiveMatchBlocks(source: string): RootMatchBlock[] {
  return rootMatchBlocks(source).filter((match) => /\{[^{}\/=]+=\*\*\}/.test(match.pattern));
}

function canonicalAllowStatement(statement: string): string {
  return maskCommentsAndStrings(statement).replace(/\s+/g, '');
}

function canonicalAllowStatements(block: string): string[] {
  const structuralBlock = maskCommentsAndStrings(block);
  return [...structuralBlock.matchAll(/\ballow\b[\s\S]*?;/g)].map((match) =>
    canonicalAllowStatement(match[0]),
  );
}

function hasOnlyAllowStatement(block: string, expectedAllow: string): boolean {
  return canonicalAllowStatements(block).join('|') === canonicalAllowStatement(expectedAllow);
}

function isCanonicalNonRecursiveCapture(segment: string): boolean {
  if (segment[0] !== '{' || segment[segment.length - 1] !== '}') return false;
  const identifier = segment.slice(1, -1);
  if (!isRulesIdentifierStartCharacter(identifier[0])) return false;
  return [...identifier.slice(1)].every((character) =>
    isRulesIdentifierCharacter(character),
  );
}

function contentStudioRootGuardErrors(rootMatches: RootMatchBlock[]): string[] {
  const errors: string[] = [];

  for (const collection of CONTENT_STUDIO_DIRECT_DENY_COLLECTIONS) {
    const matches = rootMatches.filter(
      (match) => match.pattern.split('/')[0] === collection,
    );
    if (matches.length !== 1) {
      errors.push(
        `Expected exactly one direct deny root match for ${collection}, found ${matches.length}.`,
      );
      continue;
    }

    const [match] = matches;
    const segments = match.pattern.split('/');
    if (
      segments.length !== 2
      || segments[0] !== collection
      || !isCanonicalNonRecursiveCapture(segments[1])
    ) {
      errors.push(
        `Direct deny root match for ${collection} must have semantic shape ${collection}/{capture}.`,
      );
    }
    if (!hasOnlyAllowStatement(match.block, 'allow read, write: if false;')) {
      errors.push(
        `Direct deny root match for ${collection} must contain only allow read, write: if false;.`,
      );
    }
  }

  for (const collection of CONTENT_STUDIO_CATCH_ALL_ONLY_COLLECTIONS) {
    const matches = rootMatches.filter(
      (match) => match.pattern.split('/')[0] === collection,
    );
    if (matches.length !== 0) {
      errors.push(
        `Expected no root match for catch-all-only ${collection}, found ${matches.length}.`,
      );
    }
  }

  return errors;
}

function rootAccessGuardErrors(source: string): string[] {
  const errors: string[] = [];
  const structuralSource = maskCommentsAndStrings(source);
  const declarations = parseMatchDeclarations(structuralSource);
  const serviceLevelMatches = serviceLevelMatchDeclarations(declarations);
  const documentsMatches = semanticDocumentsContainers(serviceLevelMatches);

  if (documentsMatches.length !== 1) {
    errors.push(
      `Expected exactly one semantic documents container, found ${documentsMatches.length}.`,
    );
  }
  if (serviceLevelMatches.length !== 1) {
    errors.push(
      `Expected semantic documents container to be the only match declaration at service-level depth, found ${serviceLevelMatches.length}.`,
    );
  } else if (
    documentsMatches.length !== 1
    || serviceLevelMatches[0].index !== documentsMatches[0].index
  ) {
    errors.push('The only service-level match must be the semantic documents container.');
  }

  const rootMatches = rootMatchBlocks(source);
  const recursiveMatches = rootMatches.filter((match) =>
    /\{[^{}\/=]+=\*\*\}/.test(match.pattern),
  );
  const allowedPatterns = new Set(['{**}', ...EXPECTED_RECURSIVE_SUFFIX_RULES.keys()]);

  const rootLeadingCaptureMatches = rootMatches.filter((match) => match.pattern.startsWith('{'));
  for (const match of rootLeadingCaptureMatches) {
    if (!allowedPatterns.has(match.normalizedPattern)) {
      errors.push(`Unexpected root-leading capture pattern: ${match.normalizedPattern}.`);
    }
  }

  const pathWideMatches = recursiveMatches.filter(
    (match) => match.normalizedPattern === '{**}',
  );
  if (pathWideMatches.length !== 1) {
    errors.push(
      `Expected exactly one path-wide recursive wildcard, found ${pathWideMatches.length}.`,
    );
  } else {
    const [pathWide] = pathWideMatches;
    if (!hasOnlyAllowStatement(pathWide.block, 'allow read, write: if false;')) {
      errors.push('Path-wide recursive wildcard must contain only the deny-all allow line.');
    }
    if (pathWide.block.includes('isAdmin()') || pathWide.block.includes('request.auth')) {
      errors.push('Path-wide recursive wildcard must not contain admin/auth grants.');
    }
  }

  for (const [pattern, expectedAllow] of EXPECTED_RECURSIVE_SUFFIX_RULES) {
    const matches = recursiveMatches.filter((match) => match.normalizedPattern === pattern);
    if (matches.length !== 1) {
      errors.push(`Expected exactly one recursive suffix ${pattern}, found ${matches.length}.`);
      continue;
    }
    if (!hasOnlyAllowStatement(matches[0].block, expectedAllow)) {
      errors.push(`${pattern} must contain only: ${expectedAllow}`);
    }
  }

  errors.push(...contentStudioRootGuardErrors(rootMatches));

  if (rootMatches[rootMatches.length - 1]?.normalizedPattern !== '{**}') {
    errors.push('The deny-only path-wide recursive wildcard must be the final root match.');
  }

  return errors;
}

describe('firestore.rules security baseline', () => {
  const rules = readFileSync(rulesPath, 'utf8');

  test('users collection is restricted to owner/admin, including stableId auth mapping', () => {
    expect(rules).toContain('match /users/{userId} {');
    expect(rules).toContain('function userDocOwnerMatchesAuth(userId) {');
    expect(rules).toContain('function newUserDocOwnerMatchesAuth(userId) {');
    expect(rules).toContain('function authLinkMapsToUser(userId) {');
    expect(rules).toContain('auth_links/$(request.auth.uid)');
    expect(rules).toContain('data.stable_id == userId');
    expect(rules).toContain('stableUserMatchesAuth(userId) || authLinkMapsToUser(userId)');
    expect(rules).toContain('function accountDeletionNotPending(userId) {');
    expect(rules).toContain('account_deletion_tombstones/$(userId)');
    expect(rules).toMatch(/allow update:[^;]*accountDeletionNotPending\(userId\)/);
    expect(rules).toMatch(/allow create:[^;]*accountDeletionNotPending\(userId\)/);
    // Read is owner/admin OR the doc does not exist yet (empty read is safe and must
    // not break the 1.5.41 sign-in transaction's tx.get on a brand-new localStableId —
    // see userDocMissing). delete stays strictly owner/admin. update is owner/admin AND
    // must not touch premium fields. The update rule may AND additional guards
    // (e.g. hasNoShardWrites()), so match the owner + premium-guard prefix instead of
    // pinning the exact (and growing) full line.
    expect(rules).toContain('allow read: if userDocOwnerMatchesAuth(userId) || userDocMissing(userId);');
    expect(rules).toMatch(
      /allow delete:\s*if\s+userDocOwnerMatchesAuth\(userId\)\s*&&\s*userDocGiftHistoryAllowsDelete\(\)/,
    );
    expect(rules).toMatch(
      /allow update:\s*if\s+userDocOwnerMatchesAuth\(userId\)\s*&&[\s\S]*?progressHasNoPremiumWrites\(\)/,
    );
    // Create is owner/admin AND must not pre-populate premium/VIP fields in the brand-new
    // doc. Firestore evaluates a set() on a non-existent doc against `allow create`, so
    // without a premium guard here a tampered client could self-grant VIP on its very first
    // write (resource is null on create → diff impossible → guard checks key presence).
    expect(rules).toMatch(
      /allow create:\s*if\s+newUserDocOwnerMatchesAuth\(userId\)\s*&&[\s\S]*?newDocHasNoPremiumWrites\(\)/,
    );
    expect(rules).toContain('function newDocHasNoPremiumWrites() {');
    // The create guard must inspect the NEW progress map's keys (not a diff — there is no
    // prior resource on create) and reject any blocked premium key.
    expect(rules).toMatch(
      /function newDocHasNoPremiumWrites\(\) \{[\s\S]*?\.get\('progress', \{\}\)[\s\S]*?\.keys\(\)\.hasAny\(blockedPremiumProgressKeys\(\)\)/,
    );
    expect(rules).toContain('function hasNoIdentityAuthorityWrites() {');
    expect(rules).toContain('function newDocHasNoIdentityAuthorityWrites() {');
    expect(rules).toMatch(
      /allow update:[\s\S]*?hasNoIdentityAuthorityWrites\(\)[\s\S]*?hasNoProgressAuthorityMarkerWrites\(\)/,
    );
    expect(rules).toMatch(
      /allow create:[\s\S]*?newDocHasNoIdentityAuthorityWrites\(\)[\s\S]*?newDocHasNoProgressAuthorityMarkerWrites\(\)/,
    );
    for (const field of [
      'identityHidden',
      'canonicalStableId',
      'duplicateOfStableId',
      'identityMergedAt',
      'identityCanonicalizedAt',
    ]) {
      expect(rules).toContain(`'${field}'`);
    }
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
    expect(rules).not.toMatch(/allow update:[^;]*userDocMissing\(userId\)/);
  });

  // ── Paywall-bypass guard (premium/VIP self-grant) ────────────────────────
  // Entitlement flags live INSIDE the client-writable `progress` map
  // (premium_plan, vip_active, …). Firestore map rules can't restrict
  // individual keys with hasOnly, so the `users/{userId}` update rule must
  // call progressHasNoPremiumWrites(), which denies any diff that touches a
  // premium/VIP key (unless the writer is admin). If this regresses, a normal
  // client can write progress.premium_plan='yearly' via the SDK and bypass the
  // paywall (see app/cloud_sync.ts PREMIUM_PROGRESS_KEYS, app/premium_guard.ts).
  // The 21 keys below MUST stay in sync with PREMIUM_PROGRESS_KEYS in cloud_sync.ts.
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

  function compactServerOwnedProgressKeysFromRules(): string[] {
    const builderBlock = rules.match(
      /function blockedServerOwnedProgressKeys\(\) \{[\s\S]*?\n    \}/,
    );
    if (!builderBlock) throw new Error('blockedServerOwnedProgressKeys() is missing');

    const idsByVariable = new Map(
      [...builderBlock[0].matchAll(/let (\w+) = '([^']+)';/g)]
        .map((match) => [match[1], match[2]] as const),
    );
    const returnStart = builderBlock[0].indexOf('return [');
    const fixedListEnd = builderBlock[0].indexOf(']', returnStart);
    if (returnStart < 0 || fixedListEnd < 0) {
      throw new Error('blockedServerOwnedProgressKeys() fixed list is malformed');
    }

    const expanded = [...builderBlock[0]
      .slice(returnStart, fixedListEnd + 1)
      .matchAll(/'([^']+)'/g)]
      .map((match) => match[1]);

    const patternCalls = [...builderBlock[0].matchAll(
      /serverProgressKeysForIds\((\w+), '([^']*)', '([^']*)'\)/g,
    )];
    for (const [, idsVariable, prefix, suffix] of patternCalls) {
      const ids = idsByVariable.get(idsVariable);
      if (!ids) throw new Error(`Missing id manifest: ${idsVariable}`);
      expanded.push(...ids.split(',').map((id) => `${prefix}${id}${suffix}`));
    }

    return expanded;
  }

  test('users update rule is gated on progressHasNoPremiumWrites() (paywall self-grant guard)', () => {
    // The guard must be wired into the update rule, not merely defined.
    // We assert the gate is PRESENT in the users update rule rather than pinning the
    // exact full line — the rule legitimately ANDs further guards (e.g. hasNoShardWrites()),
    // and a strict string match would break every time a new guard is added.
    expect(rules).toContain('function progressHasNoPremiumWrites() {');
    expect(rules).toMatch(
      /allow update:\s*if\s+userDocOwnerMatchesAuth\(userId\)\s*&&[\s\S]*?progressHasNoPremiumWrites\(\)/,
    );
    // It must inspect the diff of the progress map's affected keys and feed the
    // result to both the premium and compact server-owned manifests.
    expect(rules).toMatch(
      /function progressHasNoPremiumWrites\(\) \{[\s\S]*?newProgress\.diff\(oldProgress\)\.affectedKeys\(\)[\s\S]*?affectedProgressKeys\.hasAny\(blockedPremiumProgressKeys\(\)\)[\s\S]*?affectedProgressKeys\.hasAny\(blockedServerOwnedProgressKeys\(\)\)/,
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
    // Patterned lesson/exam fields are expanded from compact id manifests to stay
    // below Firestore's 1,000-expression limit. Always-blocked keys such as
    // collectibles remain shared with the create guard.
    const compactKeys = compactServerOwnedProgressKeysFromRules();
    const sharedList = rules.match(
      /function blockedPremiumProgressKeys\(\) \{[\s\S]*?\n    \}/,
    );
    expect(sharedList).not.toBeNull();
    const sharedKeys = [...sharedList![0].matchAll(/'([^']+)'/g)]
      .map((match) => match[1]);
    const blockedAnywhere = new Set([...compactKeys, ...sharedKeys]);
    for (const key of SERVER_OWNED_PROGRESS_KEYS) {
      // During server-authoritative progress cutover, clients must not be able
      // to overwrite XP, streaks, lessons, exams, or collectibles directly.
      expect(blockedAnywhere.has(key)).toBe(true);
    }

    const expectedCompactKeys = SERVER_OWNED_PROGRESS_KEYS.filter(
      (key) => !['collectibles_owned_v1', 'collectibles_state_v1'].includes(key),
    );
    expect(compactKeys).toHaveLength(802);
    expect(new Set(compactKeys).size).toBe(802);
    expect(new Set(compactKeys)).toEqual(new Set(expectedCompactKeys));
    expect(rules).toContain("ids.replace(',', suffix + ',' + prefix)");
    expect(rules).toContain(".split(',')");
    expect(rules).not.toContain('legacyProgressHasNoPremiumWrites');
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

    const blockedByRules = new Set(compactServerOwnedProgressKeysFromRules());
    expect(
      representativeKeys
        .filter((key) => key !== 'shard_survey_last_at_ms')
        .filter((key) => !blockedByRules.has(key)),
    ).toEqual([]);
    expect(rules).toContain("'shard_survey_last_at_ms'");
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

  test('progressHasNoPremiumWrites() preserves the deliberate admin escape hatch', () => {
    // Admin (custom claim) keeps manual VIP grant/revoke via the web SDK.
    expect(rules).toMatch(
      /function progressHasNoPremiumWrites\(\) \{[\s\S]*?return isAdmin\(\)/,
    );
  });

  test('gift grants are one-time immutable pairs on user create and update', () => {
    const allGiftFields = [
      'intro_access_granted_at_ms',
      'intro_access_until_ms',
      'loyalty_gift_granted_at_ms',
      'loyalty_gift_until_ms',
    ] as const;

    expect(rules).toContain('function giftGrantPairUpdateIsSafe(');
    expect(rules).toContain('function giftAccessWritesAreSafe() {');
    expect(rules).toContain('function newDocHasOnlyValidGiftAccessWrites() {');
    expect(rules).toMatch(
      /allow update:\s*if\s+userDocOwnerMatchesAuth\(userId\)[\s\S]*?giftAccessWritesAreSafe\(\)/,
    );
    expect(rules).toMatch(
      /allow create:\s*if\s+newUserDocOwnerMatchesAuth\(userId\)[\s\S]*?newDocHasOnlyValidGiftAccessWrites\(\)/,
    );

    const giftFieldsBlock = rules.match(
      /function giftGrantFields\(\) \{[\s\S]*?\n    \}/,
    );
    expect(giftFieldsBlock).not.toBeNull();
    for (const field of allGiftFields) {
      expect(giftFieldsBlock![0]).toContain(`'${field}'`);
    }

    const pairUpdateBlock = rules.match(
      /function giftGrantPairUpdateIsSafe\([\s\S]*?\n    \}/,
    );
    expect(pairUpdateBlock).not.toBeNull();
    // Untouched legacy gift fields must not block unrelated progress writes.
    expect(pairUpdateBlock![0]).toMatch(/!affectedKeys\.hasAny\(pairFields\)/);
    // Any actual gift write must create both fields together and only when neither
    // member of that pair existed before. That makes later replace/extend/remove fail.
    expect(pairUpdateBlock![0]).toMatch(/affectedKeys\.hasAll\(pairFields\)/);
    expect(pairUpdateBlock![0]).toMatch(/!oldProgress\.keys\(\)\.hasAny\(pairFields\)/);
    expect(pairUpdateBlock![0]).toMatch(/newProgress\.keys\(\)\.hasAll\(pairFields\)/);
  });

  test('gift persistence has a narrow update path within the Rules expression budget', () => {
    // Keep the legal gift write on a small self-contained allow branch that cannot
    // carry unrelated progress/top-level mutations. Its entitlement invariants stay
    // independent from future growth of the general user-progress guard.
    const giftOnlyBlock = rules.match(
      /function giftAccessOnlyUpdateIsSafe\(userId\) \{[\s\S]*?\n    \}/,
    );
    expect(giftOnlyBlock).not.toBeNull();
    expect(giftOnlyBlock![0]).toMatch(
      /request\.resource\.data\.diff\(resource\.data\)\.affectedKeys\(\)/,
    );
    expect(giftOnlyBlock![0]).toMatch(
      /topLevelAffectedKeys\.hasOnly\(\['progress', 'updatedAt'\]\)/,
    );
    expect(giftOnlyBlock![0]).toMatch(
      /newProgress\.diff\(oldProgress\)\.affectedKeys\(\)/,
    );
    expect(giftOnlyBlock![0]).toMatch(
      /progressAffectedKeys\.hasOnly\(giftGrantFields\(\)\)/,
    );
    expect(giftOnlyBlock![0]).toMatch(
      /progressAffectedKeys\.hasAny\(giftGrantFields\(\)\)/,
    );
    expect(giftOnlyBlock![0]).toContain('giftAccessWritesAreSafe()');
    expect(rules).toContain('allow update: if giftAccessOnlyUpdateIsSafe(userId);');
  });

  test('gift pair values are numeric strings near request.time and last at most 72 hours', () => {
    const valueGuard = rules.match(
      /function giftGrantPairIsValid\([\s\S]*?\n    \}/,
    );
    const windowGuard = rules.match(
      /function giftGrantPairHasValidWindow\([\s\S]*?\n    \}/,
    );
    expect(valueGuard).not.toBeNull();
    expect(windowGuard).not.toBeNull();
    expect(valueGuard![0]).toContain('is string');
    expect(valueGuard![0]).toContain("matches('^[0-9]{13}$')");
    expect(windowGuard![0]).toContain('int(progress[grantedAtKey])');
    expect(windowGuard![0]).toContain('int(progress[untilKey])');
    expect(windowGuard![0]).toContain('request.time.toMillis()');
    expect(windowGuard![0]).toMatch(/grantedAtMs >= requestTimeMs - 10 \* 60 \* 1000/);
    expect(windowGuard![0]).toMatch(/grantedAtMs <= requestTimeMs \+ 10 \* 60 \* 1000/);
    expect(windowGuard![0]).toMatch(/untilMs > grantedAtMs/);
    expect(windowGuard![0]).toMatch(/untilMs - grantedAtMs <= 72 \* 60 \* 60 \* 1000/);
  });

  test('a client cannot delete a user document that contains gift history', () => {
    expect(rules).toContain('function userDocGiftHistoryAllowsDelete() {');
    expect(rules).toMatch(
      /function userDocGiftHistoryAllowsDelete\(\) \{[\s\S]*?resource\.data\.get\('progress', \{\}\)[\s\S]*?\.keys\(\)\.hasAny\(giftGrantFields\(\)\)/,
    );
    expect(rules).toMatch(
      /allow delete:\s*if\s+userDocOwnerMatchesAuth\(userId\)\s*&&\s*userDocGiftHistoryAllowsDelete\(\)/,
    );
  });

  test('users shard_log allows owner read and create only', () => {
    expect(rules).toContain('match /shard_log/{logId} {');
    expect(rules).toContain('allow read, create: if userDocOwnerMatchesAuth(userId);');
    expect(rules).toContain('allow update, delete: if false;');
  });

  test('canonical identity accepts direct auth uid or the server-owned auth link before a user doc exists', () => {
    expect(rules).toMatch(
      /function canonicalUserMatchesAuth\(stableUid\) \{[\s\S]*?isOwner\(stableUid\)[\s\S]*?stableUserMatchesAuth\(stableUid\)[\s\S]*?authLinkMapsToUser\(stableUid\)/,
    );
  });

  test('notification center accepts the same canonical ownership proofs as other user inboxes', () => {
    const block = rules.match(/match \/users\/\{userId\}\/notifications\/\{notificationId\} \{[\s\S]*?\n    \}/);
    expect(block).not.toBeNull();
    expect(block![0]).toContain('allow read: if userDocOwnerMatchesAuth(userId);');
    expect(block![0]).toContain('userDocOwnerMatchesAuth(userId)');
    expect(block![0]).not.toContain('canonicalUserMatchesAuth(userId)');
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
    expect(cardPacksBlock![0]).toContain("resource.data.status == 'published'");
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

  test('catch-all rule is deny-all', () => {
    expect(rootAccessGuardErrors(rules)).toEqual([]);
  });

  test('root access guard rejects overlapping root blocks regardless of formatting', () => {
    const finalCatchAll = '    match /{document=**} {';
    const broadBlocks = [
      ...['  ', '      ', '\t'].map((indentation) => [
        `${indentation}match /{any=**} {`,
        `${indentation}  allow read, write: if isAdmin();`,
        `${indentation}}`,
      ].join('\n')),
      [
        '  match /{any=**}',
        '  {',
        '    allow read, write: if isAdmin();',
        '  }',
      ].join('\n'),
      '  match /{any=**} { allow read, write: if isAdmin(); }',
      '  match / {any=**} { allow read, write: if isAdmin(); }',
      '  match /{ any = ** } { allow read, write: if isAdmin(); }',
      [
        '  match /{',
        '    any',
        '    =',
        '    **',
        '  } { allow read, write: if isAdmin(); }',
      ].join('\n'),
      '  match / /* after slash */ {any=**} { allow read, write: if isAdmin(); }',
      [
        '  match / // after slash',
        '  {any=**} { allow read, write: if isAdmin(); }',
      ].join('\n'),
      '  match /{ /* before id */ any /* before equals */ = /* before stars */ ** /* before close */ } { allow read, write: if isAdmin(); }',
      [
        '  match /{',
        '    // before id',
        '    any // after id',
        '    = // after equals',
        '    ** // after stars',
        '  } { allow read, write: if isAdmin(); }',
      ].join('\n'),
    ];

    for (const broadBlock of broadBlocks) {
      const injectedBroadRule = `${broadBlock}\n\n${finalCatchAll}`;
      const mutatedRules = rules.replace(finalCatchAll, injectedBroadRule);

      expect(mutatedRules).not.toBe(rules);
      expect(rootAccessGuardErrors(mutatedRules)).toContain(
        'Expected exactly one path-wide recursive wildcard, found 2.',
      );
    }

    const documentsContainer = '  match /databases/{database}/documents {';
    const serviceLevelBypasses = [
      {
        replacement: [
          '  match /databases/{database}/documents/{doc=**} {',
          '    allow read, write: if request.auth != null;',
          '  }',
          '',
          documentsContainer,
        ].join('\n'),
        expectedErrors: [
          'Expected semantic documents container to be the only match declaration at service-level depth, found 2.',
        ],
      },
      {
        replacement: [
          '  match /databases/{db}/documents {',
          '    match /{doc=**} { allow read, write: if request.auth != null; }',
          '  }',
          '',
          documentsContainer,
        ].join('\n'),
        expectedErrors: [
          'Expected exactly one semantic documents container, found 2.',
          'Expected exactly one path-wide recursive wildcard, found 2.',
        ],
      },
    ];
    const serviceLevelBypassResults = serviceLevelBypasses.map(
      ({ replacement, expectedErrors }) => {
        const mutatedRules = rules.replace(documentsContainer, replacement);
        return {
          changed: mutatedRules !== rules,
          errors: rootAccessGuardErrors(mutatedRules),
          expectedErrors,
        };
      },
    );
    const wrapperOpenedRules = rules.replace(
      documentsContainer,
      [
        '  match /databases/{outerDatabase}/documents/{collection}/{doc} {',
        '    allow read, write: if request.auth != null;',
        '    match /databases/{database}/documents {',
      ].join('\n'),
    );
    const wrapperBypassRules = wrapperOpenedRules.replace(
      /(\r?\n  })(\r?\n})(\s*)$/,
      (_match, documentsClose: string, serviceClose: string, trailing: string) => {
        const newline = documentsClose.startsWith('\r\n') ? '\r\n' : '\n';
        return `${documentsClose}${newline}  }${serviceClose}${trailing}`;
      },
    );
    const nestedDocumentsLookalike = [
      '    match /databases/{tenantId}/documents {',
      '      match /{doc=**} { allow read, write: if false; }',
      '    }',
      '',
      finalCatchAll,
    ].join('\n');
    const safeNestedLookalikeRules = rules.replace(
      finalCatchAll,
      nestedDocumentsLookalike,
    );

    const safelyRenamedSuffixCaptures = rules
      .replace(
        'match /{path=**}/app_message_states/{messageId} {',
        'match /{path=**}/app_message_states/{stateId} {',
      )
      .replace(
        'match /{path=**}/promo_redemptions/{code} {',
        'match /{path=**}/promo_redemptions/{redemptionId} {',
      );
    const safeAllowFormatterResults = [
      'allow read , write : if false ;',
      'allow read,write:if false;',
    ].map((formattedAllow) => {
      const formattedRules = rules.replace(
        /(match \/content_mode_templates\/\{docId\} \{\s*)allow read, write: if false;/,
        `$1${formattedAllow}`,
      );
      return {
        changed: formattedRules !== rules,
        errors: rootAccessGuardErrors(formattedRules),
      };
    });
    const safeSuffixFormatterRules = rules.replace(
      /(match \/\{path=\*\*\}\/app_message_states\/\{messageId\} \{\s*)allow list: if isAdmin\(\);/,
      '$1allow list : if isAdmin ( ) ;',
    );

    expect({
      serviceLevelBypassResults,
      wrapperBypassResult: {
        changed: wrapperBypassRules !== rules,
        errors: rootAccessGuardErrors(wrapperBypassRules),
      },
      safeNestedLookalikeResult: {
        changed: safeNestedLookalikeRules !== rules,
        errors: rootAccessGuardErrors(safeNestedLookalikeRules),
      },
      safeRenameChanged:
        safelyRenamedSuffixCaptures.includes('app_message_states/{stateId}')
        && safelyRenamedSuffixCaptures.includes('promo_redemptions/{redemptionId}'),
      safeRenameErrors: rootAccessGuardErrors(safelyRenamedSuffixCaptures),
      safeAllowFormatterResults,
      safeSuffixFormatterResult: {
        changed: safeSuffixFormatterRules !== rules,
        errors: rootAccessGuardErrors(safeSuffixFormatterRules),
      },
    }).toEqual({
      serviceLevelBypassResults: serviceLevelBypasses.map(({ expectedErrors }) => ({
        changed: true,
        errors: expect.arrayContaining(expectedErrors),
        expectedErrors,
      })),
      wrapperBypassResult: {
        changed: true,
        errors: expect.arrayContaining([
          'The only service-level match must be the semantic documents container.',
        ]),
      },
      safeNestedLookalikeResult: { changed: true, errors: [] },
      safeRenameChanged: true,
      safeRenameErrors: [],
      safeAllowFormatterResults: [
        { changed: true, errors: [] },
        { changed: true, errors: [] },
      ],
      safeSuffixFormatterResult: { changed: true, errors: [] },
    });

    const nonRecursiveRootWildcard =
      '  match /{collection}/{doc} { allow read, write: if isAdmin(); }';
    const rulesWithNonRecursiveRootWildcard = rules.replace(
      finalCatchAll,
      `${nonRecursiveRootWildcard}\n\n${finalCatchAll}`,
    );

    expect(rootAccessGuardErrors(rulesWithNonRecursiveRootWildcard)).toContain(
      'Unexpected root-leading capture pattern: {*}/{*}.',
    );

    const maskedDecoys = [
      '    // match /{any=**} { allow read, write: if isAdmin(); }',
      '    /* match /{any=**} { allow read, write: if isAdmin(); } */',
      '    function recursiveWildcardDecoy() {',
      "      return 'match /{any=**} { allow read, write: if isAdmin(); }';",
      '    }',
      '',
      finalCatchAll,
    ].join('\n');
    const rulesWithMaskedDecoys = rules.replace(finalCatchAll, maskedDecoys);

    expect(rulesWithMaskedDecoys).not.toBe(rules);
    expect(rootAccessGuardErrors(rulesWithMaskedDecoys)).toEqual([]);
  });

  test('Learning V2 Content Studio collections have exact deny-only blocks before catch-all', () => {
    const serverOnlyCollections = [
      ...CONTENT_STUDIO_DIRECT_DENY_COLLECTIONS,
      ...CONTENT_STUDIO_CATCH_ALL_ONLY_COLLECTIONS,
    ];
    expect(serverOnlyCollections).toHaveLength(32);
    expect(new Set(serverOnlyCollections).size).toBe(32);
    expect(contentStudioRootGuardErrors(rootMatchBlocks(rules))).toEqual([]);

    const finalCatchAll = '    match /{document=**} {';
    const overlapCases = [
      {
        block:
          '    match /content_episode_drafts/{anything} { allow read, write: if isAdmin(); }',
        expected:
          'Expected exactly one direct deny root match for content_episode_drafts, found 2.',
      },
      {
        block: '    match /content_factory_jobs/{id} { allow read, write: if isAdmin(); }',
        expected:
          'Expected no root match for catch-all-only content_factory_jobs, found 1.',
      },
    ];
    const overlapErrors = overlapCases.map(({ block }) => {
      const mutatedRules = rules.replace(finalCatchAll, `${block}\n\n${finalCatchAll}`);
      return rootAccessGuardErrors(mutatedRules);
    });

    expect(overlapErrors).toEqual(
      overlapCases.map(({ expected }) => expect.arrayContaining([expected])),
    );
  });

  test('legacy catch-all-only browser operations have minimal explicit admin rules', () => {
    const expectedBlocks = [
      ['admin_digest_runs', 'runId', 'allow list: if isAdmin();'],
      ['admin_digests', 'dayKey', 'allow get: if isAdmin();'],
      ['support_inbox', 'messageId', 'allow list: if isAdmin();'],
      ['admin_push_jobs', 'jobId', 'allow list, create: if isAdmin();'],
      ['revenuecat_premium_events', 'eventId', 'allow list: if isAdmin();'],
      ['revenuecat_shard_transactions', 'transactionId', 'allow list: if isAdmin();'],
      ['users_dedup_archive', 'userId', 'allow create, update: if isAdmin();'],
    ] as const;

    for (const [collection, documentId, permission] of expectedBlocks) {
      const block = rules.match(
        new RegExp(`match /${collection}/\\{${documentId}\\} \\{[\\s\\S]*?\\n    \\}`),
      );
      expect(block).not.toBeNull();
      expect(block![0]).toContain(permission);
      expect(block![0].match(/\ballow\b/g)).toHaveLength(1);
    }

    for (const collection of ['adminContentDrafts', 'adminContentRollbacks']) {
      const block = rules.match(
        new RegExp(`match /${collection}/fr/quiz/\\{version\\} \\{[\\s\\S]*?\\n    \\}`),
      );
      expect(block).not.toBeNull();
      expect(block![0]).toContain('allow create, update: if isAdmin();');
      expect(block![0].match(/\ballow\b/g)).toHaveLength(1);
    }

    for (const collection of ['app_message_states', 'promo_redemptions']) {
      const block = rules.match(
        new RegExp(`match /\\{path=\\*\\*\\}/${collection}/\\{[^}]+\\} \\{[\\s\\S]*?\\n    \\}`),
      );
      expect(block).not.toBeNull();
      expect(block![0]).toContain('allow list: if isAdmin();');
      expect(block![0].match(/\ballow\b/g)).toHaveLength(1);
    }

    expect(rules).toMatch(
      /match \/app_message_states\/\{messageId\} \{[\s\S]*?allow read, create, update, delete: if userDocOwnerMatchesAuth\(userId\);/,
    );
    expect(rules).toMatch(
      /match \/promo_redemptions\/\{code\} \{[\s\S]*?allow read: if userDocOwnerMatchesAuth\(userId\);/,
    );
  });

  test('legacy operations formerly masked by catch-all remain explicit without broadening users', () => {
    const cardPacks = rules.match(/match \/card_packs\/\{packId\} \{[\s\S]*?\n    \}/);
    expect(cardPacks).not.toBeNull();
    expect(cardPacks![0]).toContain(
      "allow read: if isAdmin() || resource.data.status == 'published';",
    );

    const arenaProfiles = rules.match(/match \/arena_profiles\/\{userId\} \{[\s\S]*?\n    \}/);
    expect(arenaProfiles).not.toBeNull();
    expect(arenaProfiles![0]).toContain('allow update, delete: if isAdmin();');
    expect(arenaProfiles![0]).toContain('allow create: if false;');

    const errorReports = rules.match(/match \/error_reports\/\{docId\} \{[\s\S]*?\n    \}/);
    expect(errorReports).not.toBeNull();
    expect(errorReports![0]).toContain('allow create: if isAdmin();');
    expect(errorReports![0]).toContain('allow read, update, delete: if isAdmin();');

    const referrals = rules.match(/match \/referral_attributions\/\{id\} \{[\s\S]*?\n    \}/);
    expect(referrals).not.toBeNull();
    expect(referrals![0]).toContain('allow update: if isAdmin();');
    expect(referrals![0]).toContain('allow create, delete: if false;');

    const arenaSessions = rules.match(/match \/arena_sessions\/\{sessionId\} \{[\s\S]*?\n    \}/);
    expect(arenaSessions).not.toBeNull();
    expect(arenaSessions![0]).toContain('allow update: if isAdmin();');
    expect(arenaSessions![0]).toContain('resource.data.playerIds.hasAny([request.auth.uid])');

    const arenaRooms = rules.match(/match \/arena_rooms\/\{roomId\} \{[\s\S]*?\n    \}/);
    expect(arenaRooms).not.toBeNull();
    expect(arenaRooms![0]).toContain('allow delete: if isAdmin();');
    expect(arenaRooms![0]).toContain('request.resource.data.hostId == request.auth.uid');

    const matchmaking = rules.match(/match \/matchmaking_queue\/\{entryId\} \{[\s\S]*?\n    \}/);
    expect(matchmaking).not.toBeNull();
    expect(matchmaking![0]).toContain('allow list, delete: if isAdmin();');
    expect(matchmaking![0]).not.toContain('allow read, delete: if isAdmin();');
    expect(matchmaking![0]).toContain('resource.data.userId == request.auth.uid');
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

  test('arena_rooms updates are field-restricted', () => {
    expect(rules).toContain('match /arena_rooms/{roomId} {');
    expect(rules).toContain(".hasOnly(['guestId', 'guestName', 'status', 'sessionId']);");
  });

  test('arena_invites allows only status updates from participants', () => {
    expect(rules).toContain('match /arena_invites/{inviteId} {');
    expect(rules).toContain(".hasOnly(['status']);");
    expect(rules).toContain('canonicalUserMatchesAuth(resource.data.friendStableUid)');
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

  test('auth_links are scoped to the signed-in provider uid and owned stable id', () => {
    const authLinksBlock = rules.match(/match \/auth_links\/\{providerUid\} \{[\s\S]*?\n    \}/);
    expect(authLinksBlock).not.toBeNull();
    expect(authLinksBlock![0]).toContain('function ownsAuthLinkDoc()');
    expect(authLinksBlock![0]).toContain('request.auth.uid == providerUid');
    expect(authLinksBlock![0]).toContain('function stableIdOwnedByThisAuth(stableId)');
    expect(authLinksBlock![0]).toContain('&& stableUserMatchesAuth(stableId);');
    expect(authLinksBlock![0]).toContain('allow read: if isAdmin() || ownsAuthLinkDoc();');
    expect(authLinksBlock![0]).toContain('allow create: if ownsAuthLinkDoc()');
    expect(authLinksBlock![0]).toContain('&& stableIdOwnedByThisAuth(request.resource.data.stable_id);');
    expect(authLinksBlock![0]).toContain('allow update: if (');
    expect(authLinksBlock![0]).toContain("(!resource.data.keys().hasAny(['providerUid']) || resource.data.providerUid == providerUid)");
    expect(authLinksBlock![0]).toContain("request.resource.data.provider in ['google', 'apple']");
    expect(authLinksBlock![0]).toContain("(!resource.data.keys().hasAny(['provider']) || request.resource.data.provider == resource.data.provider)");
    expect(authLinksBlock![0]).toContain("'providerUid', 'provider', 'linkedAt'");
    expect(authLinksBlock![0]).toContain('request.resource.data.stable_id == resource.data.stable_id');
    expect(authLinksBlock![0]).toContain('|| authLinkLegacyUpdateOk();');
    expect(authLinksBlock![0]).not.toContain('allow read: if request.auth != null;');
    expect(authLinksBlock![0]).not.toContain('allow update: if request.auth != null');
  });

  // ── updatedAt в whitelist auth_links update (2026-07-02) ─────────────────
  // Клиентский fallback (cloud_sync, «Хвост B») пишет auth_links c полем updatedAt.
  // Раньше updatedAt отсутствовал в hasOnly([...]) → на ПОВТОРНОМ входе update молча
  // DENIED, и мост provider→stableId не обновлялся. updatedAt должен быть в whitelist.
  test('auth_links update whitelist includes updatedAt for the client fallback write', () => {
    const authLinksBlock = rules.match(/match \/auth_links\/\{providerUid\} \{[\s\S]*?\n    \}/);
    expect(authLinksBlock).not.toBeNull();
    expect(authLinksBlock![0]).toContain("'providerUid', 'provider', 'linkedAt', 'updatedAt'");
  });

  test('auth_links keep a narrow legacy update path for the 1.5.41 sign-in transaction', () => {
    const authLinksBlock = rules.match(/match \/auth_links\/\{providerUid\} \{[\s\S]*?\n    \}/);
    expect(authLinksBlock).not.toBeNull();
    expect(authLinksBlock![0]).toContain('function authLinkLegacyUpdateOk()');
    expect(authLinksBlock![0]).toContain('return ownsAuthLinkDoc()');
    expect(authLinksBlock![0]).toContain(".hasOnly(['stable_id', 'email', 'displayName', 'lastSignInAt', 'devicePlatform'])");
    expect(authLinksBlock![0]).toContain('request.resource.data.stable_id == resource.data.stable_id');
    expect(authLinksBlock![0]).toContain('|| stableIdOwnedByThisAuth(request.resource.data.stable_id)');
    expect(authLinksBlock![0]).toContain('|| authLinkLegacyUpdateOk();');
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

  test('catch-all is still the last match block (D-09 regression guard)', () => {
    const matches = rootMatchBlocks(rules);
    const lastMatch = matches[matches.length - 1];
    expect(lastMatch).toBeDefined();
    expect(lastMatch.normalizedPattern).toBe('{**}');
    expect(rootAccessGuardErrors(rules)).toEqual([]);
  });

  test('existing rules untouched — users, leaderboard, banned_users, auth_links blocks still present', () => {
    expect(rules).toContain('match /users/{userId} {');
    expect(rules).toContain('match /leaderboard/{userId} {');
    expect(rules).toContain('match /banned_users/{docId} {');
    expect(rules).toContain('match /auth_links/{providerUid} {');
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

  test('explain blocks sit at ROOT level, before the deny-all catch-all', () => {
    const pathWideMatches = rootRecursiveMatchBlocks(rules).filter(
      (match) => match.normalizedPattern === '{**}',
    );
    expect(pathWideMatches).toHaveLength(1);
    const catchAllIdx = pathWideMatches[0].index;
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
