import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import ts from "typescript";

import type {
  AchievementPrerequisite,
  CatalogMatch,
  CatalogReward,
  CatalogSnapshot,
  EffectiveWindow,
  NormalizedAuditEvent,
} from "./types";

type ReleaseCandidate = {
  commit: string;
  appVersion: string | null;
  activatedAtMs: number;
  provenance: EffectiveWindow["provenance"];
};

type StaticFunction = {
  parameters: readonly string[];
  body: ts.ConciseBody;
};

type StaticContext = {
  constants: Map<string, ts.Expression>;
  functions: Map<string, StaticFunction>;
};

const MANIFESTS: ReadonlyArray<{
  path: string;
  provenance: EffectiveWindow["provenance"];
}> = [
  {
    path: "docs/xp-integrity/build-manifest.json",
    provenance: "build_manifest",
  },
  {
    path: "docs/xp-integrity/verified-releases.json",
    provenance: "verified_release_commit",
  },
  {
    path: "scripts/xp_integrity/build-manifest.json",
    provenance: "build_manifest",
  },
  {
    path: "scripts/xp_integrity/verified-releases.json",
    provenance: "verified_release_commit",
  },
];

const COUNTER_RULES: ReadonlyArray<{
  pattern: RegExp;
  counterKey: string;
}> = [
  { pattern: /^streak_(\d+)$/, counterKey: "streak_count" },
  { pattern: /^lesson_(\d+)$/, counterKey: "lessons_completed" },
  { pattern: /^login_(\d+)$/, counterKey: "login_days" },
  { pattern: /^combo_(\d+)$/, counterKey: "combo_count" },
  { pattern: /^social_friends_(\d+)$/, counterKey: "friends_count" },
  { pattern: /^league_chat_(\d+)$/, counterKey: "league_chat_messages" },
  { pattern: /^trainer_(\d+)_correct$/, counterKey: "trainer_correct_count" },
];

function prerequisiteForId(achievementId: string): AchievementPrerequisite {
  const weekly = /^weekly_xp_(\d+)$/.exec(achievementId);
  if (weekly) return { kind: "weekly_xp", minimum: Number(weekly[1]) };

  const lifetime = /^xp_(\d+)$/.exec(achievementId);
  if (lifetime) return { kind: "lifetime_xp", minimum: Number(lifetime[1]) };

  for (const rule of COUNTER_RULES) {
    const match = rule.pattern.exec(achievementId);
    if (match) {
      return {
        kind: "counter",
        counterKey: rule.counterKey,
        minimum: Number(match[1]),
      };
    }
  }

  return { kind: "unsupported", ruleId: achievementId };
}

function propertyName(node: ts.PropertyName): string | null {
  if (
    ts.isIdentifier(node) ||
    ts.isStringLiteralLike(node) ||
    ts.isNumericLiteral(node)
  ) {
    return node.text;
  }
  return null;
}

export function parseAchievementCatalog(
  source: string,
  fileName: string,
): Map<string, CatalogReward> {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const rewards = new Map<string, CatalogReward>();

  const catalogDeclarations = sourceFile.statements.flatMap((statement) => {
    if (
      !ts.isVariableStatement(statement) ||
      !statement.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
      )
    ) {
      return [];
    }
    return statement.declarationList.declarations.filter(
      (declaration) =>
        ts.isIdentifier(declaration.name) &&
        declaration.name.text === "ALL_ACHIEVEMENTS",
    );
  });
  if (catalogDeclarations.length !== 1) return rewards;
  const initializer = catalogDeclarations[0].initializer;
  if (!initializer || !ts.isArrayLiteralExpression(initializer)) return rewards;

  for (const element of initializer.elements) {
    if (!ts.isObjectLiteralExpression(element)) continue;
    let achievementId: string | null = null;
    let xp: number | null = null;

    for (const property of element.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const name = propertyName(property.name);
      if (name === "id" && ts.isStringLiteralLike(property.initializer)) {
        achievementId = property.initializer.text;
      }
      if (name === "xp" && ts.isNumericLiteral(property.initializer)) {
        xp = Number(property.initializer.text);
      }
    }

    if (achievementId !== null && xp !== null && Number.isFinite(xp)) {
      if (rewards.has(achievementId)) return new Map();
      rewards.set(achievementId, {
        achievementId,
        xp,
        prerequisite: prerequisiteForId(achievementId),
      });
    }
  }
  return rewards;
}

function git(repoRoot: string, args: readonly string[]): string {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function tryGit(repoRoot: string, args: readonly string[]): string | null {
  try {
    return git(repoRoot, args);
  } catch {
    return null;
  }
}

function releaseTags(repoRoot: string): ReleaseCandidate[] {
  const output = tryGit(repoRoot, [
    "for-each-ref",
    "--format=%(refname:short)%09%(creatordate:iso-strict)",
    "refs/tags",
  ]);
  if (!output) return [];

  const candidates: ReleaseCandidate[] = [];
  for (const line of output.split(/\r?\n/)) {
    const [tag, date] = line.split("\t");
    const match = /^(?:release\/)?v(\d+\.\d+\.\d+)$/.exec(tag);
    if (!match) continue;
    const commit = tryGit(repoRoot, ["rev-parse", `${tag}^{commit}`]);
    const activatedAtMs = Date.parse(date);
    if (!commit || !Number.isFinite(activatedAtMs)) continue;
    candidates.push({
      commit,
      appVersion: match[1],
      activatedAtMs,
      provenance: "release_tag",
    });
  }
  return candidates;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function manifestEntries(
  repoRoot: string,
  relativePath: string,
  provenance: EffectiveWindow["provenance"],
): ReleaseCandidate[] {
  const committedManifest = tryGit(repoRoot, ["show", `HEAD:${relativePath}`]);
  if (committedManifest === null) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(committedManifest);
  } catch {
    return [];
  }
  const rawEntries = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.releases)
      ? parsed.releases
      : [];
  const repositoryHead = tryGit(repoRoot, ["rev-parse", "--verify", "HEAD"]);
  if (!repositoryHead) return [];
  const fullCommitPattern = new RegExp(
    `^[0-9a-fA-F]{${repositoryHead.length}}$`,
  );

  const candidates: ReleaseCandidate[] = [];
  for (const raw of rawEntries) {
    if (!isRecord(raw)) continue;
    const version = typeof raw.version === "string" ? raw.version : null;
    const sha = typeof raw.sha === "string" ? raw.sha : null;
    const activation =
      raw.activatedAt ?? raw.activationTime ?? raw.effectiveFrom;
    const activatedAtMs =
      typeof activation === "number"
        ? activation
        : typeof activation === "string"
          ? Date.parse(activation)
          : Number.NaN;
    if (
      !version ||
      !sha ||
      !fullCommitPattern.test(sha) ||
      !Number.isFinite(activatedAtMs)
    ) {
      continue;
    }
    const commit = tryGit(repoRoot, [
      "rev-parse",
      "--verify",
      `${sha}^{commit}`,
    ]);
    if (!commit || commit.toLowerCase() !== sha.toLowerCase()) continue;
    candidates.push({ commit, appVersion: version, activatedAtMs, provenance });
  }
  return candidates;
}

function verifiedCandidates(repoRoot: string): ReleaseCandidate[] {
  const all = [
    ...releaseTags(repoRoot),
    ...MANIFESTS.flatMap(({ path, provenance }) =>
      manifestEntries(repoRoot, path, provenance),
    ),
  ];
  const unique = new Map<string, ReleaseCandidate>();
  for (const candidate of all) {
    const key = [
      candidate.commit,
      candidate.appVersion,
      candidate.activatedAtMs,
      candidate.provenance,
    ].join("|");
    unique.set(key, candidate);
  }
  return [...unique.values()].sort(
    (left, right) =>
      left.activatedAtMs - right.activatedAtMs ||
      left.commit.localeCompare(right.commit),
  );
}

function sourceAt(
  repoRoot: string,
  commit: string,
  path: string,
): string | null {
  return tryGit(repoRoot, ["show", `${commit}:${path}`]);
}

function staticContext(source: string, fileName: string): StaticContext {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const context: StaticContext = { constants: new Map(), functions: new Map() };

  const recordVariable = (declaration: ts.VariableDeclaration): void => {
    if (!ts.isIdentifier(declaration.name) || !declaration.initializer) return;
    const name = declaration.name.text;
    const initializer = declaration.initializer;
    if (
      ts.isArrowFunction(initializer) ||
      ts.isFunctionExpression(initializer)
    ) {
      context.functions.set(name, {
        parameters: initializer.parameters
          .map((parameter) =>
            ts.isIdentifier(parameter.name) ? parameter.name.text : "",
          )
          .filter(Boolean),
        body: initializer.body,
      });
    } else {
      context.constants.set(name, initializer);
    }
  };

  for (const statement of sourceFile.statements) {
    if (ts.isVariableStatement(statement)) {
      statement.declarationList.declarations.forEach(recordVariable);
    } else if (
      ts.isFunctionDeclaration(statement) &&
      statement.name &&
      statement.body
    ) {
      context.functions.set(statement.name.text, {
        parameters: statement.parameters
          .map((parameter) =>
            ts.isIdentifier(parameter.name) ? parameter.name.text : "",
          )
          .filter(Boolean),
        body: statement.body,
      });
    }
  }
  return context;
}

function evaluateExpression(
  expression: ts.Expression,
  context: StaticContext,
  locals: ReadonlyMap<string, number>,
  resolving: Set<string>,
): number | boolean | null {
  if (ts.isNumericLiteral(expression)) return Number(expression.text);
  if (expression.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (expression.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isParenthesizedExpression(expression)) {
    return evaluateExpression(
      expression.expression,
      context,
      locals,
      resolving,
    );
  }
  if (ts.isIdentifier(expression)) {
    if (locals.has(expression.text)) return locals.get(expression.text) ?? null;
    if (expression.text === "Infinity") return Number.POSITIVE_INFINITY;
    const initializer = context.constants.get(expression.text);
    if (!initializer || resolving.has(expression.text)) return null;
    resolving.add(expression.text);
    const value = evaluateExpression(initializer, context, locals, resolving);
    resolving.delete(expression.text);
    return value;
  }
  if (ts.isPrefixUnaryExpression(expression)) {
    const value = evaluateExpression(
      expression.operand,
      context,
      locals,
      resolving,
    );
    if (typeof value !== "number") return null;
    if (expression.operator === ts.SyntaxKind.MinusToken) return -value;
    if (expression.operator === ts.SyntaxKind.PlusToken) return value;
    return null;
  }
  if (ts.isConditionalExpression(expression)) {
    const condition = evaluateExpression(
      expression.condition,
      context,
      locals,
      resolving,
    );
    if (typeof condition !== "boolean") return null;
    return evaluateExpression(
      condition ? expression.whenTrue : expression.whenFalse,
      context,
      locals,
      resolving,
    );
  }
  if (ts.isBinaryExpression(expression)) {
    const left = evaluateExpression(
      expression.left,
      context,
      locals,
      resolving,
    );
    const right = evaluateExpression(
      expression.right,
      context,
      locals,
      resolving,
    );
    switch (expression.operatorToken.kind) {
      case ts.SyntaxKind.PlusToken:
        return typeof left === "number" && typeof right === "number"
          ? left + right
          : null;
      case ts.SyntaxKind.MinusToken:
        return typeof left === "number" && typeof right === "number"
          ? left - right
          : null;
      case ts.SyntaxKind.AsteriskToken:
        return typeof left === "number" && typeof right === "number"
          ? left * right
          : null;
      case ts.SyntaxKind.SlashToken:
        return typeof left === "number" && typeof right === "number"
          ? left / right
          : null;
      case ts.SyntaxKind.AsteriskAsteriskToken:
        return typeof left === "number" && typeof right === "number"
          ? left ** right
          : null;
      case ts.SyntaxKind.LessThanToken:
        return typeof left === "number" && typeof right === "number"
          ? left < right
          : null;
      case ts.SyntaxKind.LessThanEqualsToken:
        return typeof left === "number" && typeof right === "number"
          ? left <= right
          : null;
      case ts.SyntaxKind.GreaterThanToken:
        return typeof left === "number" && typeof right === "number"
          ? left > right
          : null;
      case ts.SyntaxKind.GreaterThanEqualsToken:
        return typeof left === "number" && typeof right === "number"
          ? left >= right
          : null;
      case ts.SyntaxKind.EqualsEqualsEqualsToken:
      case ts.SyntaxKind.EqualsEqualsToken:
        return left === right;
      default:
        return null;
    }
  }
  if (ts.isCallExpression(expression)) {
    const args = expression.arguments.map((argument) =>
      evaluateExpression(argument, context, locals, resolving),
    );
    if (args.some((value) => typeof value !== "number")) return null;
    const numbers = args as number[];
    if (ts.isIdentifier(expression.expression)) {
      return evaluateFunction(
        expression.expression.text,
        numbers,
        context,
        resolving,
      );
    }
    if (
      ts.isPropertyAccessExpression(expression.expression) &&
      ts.isIdentifier(expression.expression.expression) &&
      expression.expression.expression.text === "Math"
    ) {
      const name = expression.expression.name.text;
      const operations: Record<string, (...values: number[]) => number> = {
        round: Math.round,
        floor: Math.floor,
        ceil: Math.ceil,
        max: Math.max,
        min: Math.min,
        pow: Math.pow,
        sqrt: Math.sqrt,
        abs: Math.abs,
      };
      return operations[name]?.(...numbers) ?? null;
    }
  }
  return null;
}

function evaluateStatements(
  statements: readonly ts.Statement[],
  context: StaticContext,
  locals: Map<string, number>,
  resolving: Set<string>,
): number | null {
  for (const statement of statements) {
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || !declaration.initializer)
          return null;
        const value = evaluateExpression(
          declaration.initializer,
          context,
          locals,
          resolving,
        );
        if (typeof value !== "number") return null;
        locals.set(declaration.name.text, value);
      }
      continue;
    }
    if (ts.isIfStatement(statement)) {
      const condition = evaluateExpression(
        statement.expression,
        context,
        locals,
        resolving,
      );
      if (typeof condition !== "boolean") return null;
      const selected = condition
        ? statement.thenStatement
        : statement.elseStatement;
      if (!selected) continue;
      const selectedStatements = ts.isBlock(selected)
        ? selected.statements
        : [selected];
      const result = evaluateStatements(
        selectedStatements,
        context,
        locals,
        resolving,
      );
      if (result !== null) return result;
      continue;
    }
    if (ts.isReturnStatement(statement) && statement.expression) {
      const value = evaluateExpression(
        statement.expression,
        context,
        locals,
        resolving,
      );
      return typeof value === "number" ? value : null;
    }
  }
  return null;
}

function evaluateFunction(
  name: string,
  args: readonly number[],
  context: StaticContext,
  resolving: Set<string>,
): number | null {
  const definition = context.functions.get(name);
  if (
    !definition ||
    definition.parameters.length !== args.length ||
    resolving.has(`fn:${name}`)
  ) {
    return null;
  }
  resolving.add(`fn:${name}`);
  const locals = new Map(
    definition.parameters.map((parameter, index) => [parameter, args[index]]),
  );
  const value = ts.isBlock(definition.body)
    ? evaluateStatements(definition.body.statements, context, locals, resolving)
    : evaluateExpression(definition.body, context, locals, resolving);
  resolving.delete(`fn:${name}`);
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseLevelFormula(
  source: string | null,
  fileName: string,
  functionNames: readonly string[],
): { maxLevel: number; thresholds: number[] } | null {
  if (source === null) return null;
  const context = staticContext(source, fileName);
  const maxExpression = context.constants.get("MAX_LEVEL");
  if (!maxExpression) return null;
  const maxLevel = evaluateExpression(
    maxExpression,
    context,
    new Map(),
    new Set(),
  );
  if (
    typeof maxLevel !== "number" ||
    !Number.isInteger(maxLevel) ||
    maxLevel < 1 ||
    maxLevel > 1000
  ) {
    return null;
  }
  const functionName = functionNames.find((name) =>
    context.functions.has(name),
  );
  if (!functionName) return null;
  const thresholds: number[] = [];
  for (let level = 1; level <= maxLevel; level += 1) {
    const threshold = evaluateFunction(
      functionName,
      [level],
      context,
      new Set(),
    );
    if (threshold === null || threshold < 0 || !Number.isFinite(threshold))
      return null;
    thresholds.push(threshold);
  }
  return { maxLevel, thresholds };
}

function arraysEqual(
  left: readonly number[],
  right: readonly number[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

export function loadVerifiedCatalogHistory(
  repoRoot: string,
): CatalogSnapshot[] {
  const candidates = verifiedCandidates(repoRoot);
  const distinctActivationTimes = [
    ...new Set(candidates.map((candidate) => candidate.activatedAtMs)),
  ].sort((left, right) => left - right);

  return candidates.map((candidate) => {
    const nextActivation =
      distinctActivationTimes.find((time) => time > candidate.activatedAtMs) ??
      null;
    const effective: EffectiveWindow = {
      fromMsInclusive: candidate.activatedAtMs,
      toMsExclusive: nextActivation,
      provenance: candidate.provenance,
    };
    const achievementSource = sourceAt(
      repoRoot,
      candidate.commit,
      "app/achievements.ts",
    );
    const rewards = achievementSource
      ? parseAchievementCatalog(achievementSource, "app/achievements.ts")
      : new Map<string, CatalogReward>();
    const clientFormula = parseLevelFormula(
      sourceAt(repoRoot, candidate.commit, "constants/theme.ts"),
      "constants/theme.ts",
      ["TOTAL_XP_FOR_LEVEL", "totalXPForLevel"],
    );
    const serverFormula = parseLevelFormula(
      sourceAt(repoRoot, candidate.commit, "functions/src/xp_levels.ts"),
      "functions/src/xp_levels.ts",
      ["totalXPForLevel", "TOTAL_XP_FOR_LEVEL"],
    );
    const formulaAgrees =
      clientFormula !== null &&
      serverFormula !== null &&
      clientFormula.maxLevel === serverFormula.maxLevel &&
      arraysEqual(clientFormula.thresholds, serverFormula.thresholds);
    const thresholds = clientFormula?.thresholds ?? [];
    const maxLevel = clientFormula?.maxLevel ?? 0;
    const formulaId = createHash("sha256")
      .update(JSON.stringify({ maxLevel, thresholds }))
      .digest("hex");

    return {
      commit: candidate.commit,
      appVersion: candidate.appVersion,
      effective,
      rewards,
      levelFormula: {
        sourceCommit: candidate.commit,
        formulaId,
        effective,
        totalXpThresholds: thresholds,
        maxLevel,
      },
      complete: rewards.size > 0 && formulaAgrees,
    };
  });
}

function inWindow(snapshot: CatalogSnapshot, timeMs: number): boolean {
  return (
    timeMs >= snapshot.effective.fromMsInclusive &&
    (snapshot.effective.toMsExclusive === null ||
      timeMs < snapshot.effective.toMsExclusive)
  );
}

function samePrerequisite(
  left: AchievementPrerequisite,
  right: AchievementPrerequisite,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function hasRuleConsensus(
  candidates: readonly CatalogSnapshot[],
  achievementId: string,
): boolean {
  if (
    candidates.length < 2 ||
    candidates.some((candidate) => !candidate.complete)
  )
    return false;
  const firstReward = candidates[0].rewards.get(achievementId);
  if (!firstReward) return false;
  const firstFormula = candidates[0].levelFormula;
  return candidates.every((candidate) => {
    const reward = candidate.rewards.get(achievementId);
    return (
      reward !== undefined &&
      reward.xp === firstReward.xp &&
      samePrerequisite(reward.prerequisite, firstReward.prerequisite) &&
      candidate.levelFormula.maxLevel === firstFormula.maxLevel &&
      arraysEqual(
        candidate.levelFormula.totalXpThresholds,
        firstFormula.totalXpThresholds,
      )
    );
  });
}

export function matchCatalogForEvent(
  catalogs: readonly CatalogSnapshot[],
  event: Pick<
    NormalizedAuditEvent,
    "appVersion" | "serverCreatedAtMs" | "clientCreatedAtMs"
  >,
  achievementId: string,
): CatalogMatch {
  if (
    event.serverCreatedAtMs === null ||
    !Number.isFinite(event.serverCreatedAtMs)
  ) {
    return { kind: "unmapped", reason: "missing_server_time" };
  }

  let candidates = catalogs.filter((catalog) =>
    inWindow(catalog, event.serverCreatedAtMs as number),
  );
  if (candidates.length === 0) return { kind: "unmapped", reason: "gap" };
  if (!candidates.some((candidate) => candidate.rewards.has(achievementId))) {
    return { kind: "unmapped", reason: "unknown_version" };
  }
  if (candidates.some((candidate) => !candidate.rewards.has(achievementId))) {
    return { kind: "unmapped", reason: "provenance_conflict" };
  }

  if (event.appVersion !== null) {
    const versionExists = catalogs.some(
      (catalog) => catalog.appVersion === event.appVersion,
    );
    if (!versionExists) return { kind: "unmapped", reason: "unknown_version" };
    const narrowed = candidates.filter(
      (candidate) => candidate.appVersion === event.appVersion,
    );
    if (narrowed.length === 0)
      return { kind: "unmapped", reason: "provenance_conflict" };
    candidates = narrowed;
  }

  if (event.clientCreatedAtMs !== null) {
    if (!Number.isFinite(event.clientCreatedAtMs)) {
      return { kind: "unmapped", reason: "provenance_conflict" };
    }
    const narrowed = candidates.filter((candidate) =>
      inWindow(candidate, event.clientCreatedAtMs as number),
    );
    if (narrowed.length === 0)
      return { kind: "unmapped", reason: "provenance_conflict" };
    candidates = narrowed;
  }

  if (candidates.length === 1) {
    const [snapshot] = candidates;
    if (!snapshot.complete)
      return { kind: "unmapped", reason: "provenance_conflict" };
    return { kind: "exact", snapshot, basis: "verified_server_window" };
  }
  if (hasRuleConsensus(candidates, achievementId)) {
    return { kind: "consensus", candidates };
  }
  return { kind: "unmapped", reason: "overlap" };
}
