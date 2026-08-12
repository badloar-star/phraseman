import fs from "node:fs";
import path from "node:path";
import * as ts from "typescript";
import { canonicalJsonV1 } from "../../../modules/learning-v2/policies/decision_registry";
import {
  V2_CANONICAL_INTERFACE_LOCALES,
  V2_CANONICAL_STAGE_KINDS,
  buildV2CanonicalSeasonPlan,
  parseV2CanonicalPlanRequest,
} from "./v2_canonical_generation_plan";

const hash = (char: string) => char.repeat(64);

function input(
  scope:
    | "vertical_slice"
    | "chapter_internal"
    | "full_season" = "vertical_slice",
) {
  const count =
    scope === "vertical_slice" ? 1 : scope === "chapter_internal" ? 8 : 32;
  const episodeIds = Array.from(
    { length: count },
    (_, index) => `episode-${index + 1}`,
  );
  return {
    schemaVersion: "v2-canonical-plan-request.v1" as const,
    workspaceId: "workspace-1",
    jobId: "job-1",
    authoringRevision: 7,
    seasonId: "season-1",
    scope,
    episodeIds,
    recipes: [
      { episodeId: episodeIds[0], dialogue: true, speakingMission: true },
    ],
    languageProfileRef: {
      profileId: "english-general",
      targetLanguage: "en",
      version: 3,
      contentHash: hash("a"),
    },
    decisionRegistryRef: {
      decisionId: "HYP-V2-007",
      version: 1,
      contentHash: hash("7"),
    },
    templateBindings: episodeIds.map((episodeId) => ({
      episodeId,
      templateRefs: [
        { templateId: "phrase-builder", version: 2, contentHash: hash("b") },
      ],
    })),
  };
}

const trusted = (value = input()) =>
  parseV2CanonicalPlanRequest(canonicalJsonV1(value));

const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".mjs",
  ".cjs",
]);
const SOURCE_SCAN_IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".codex-tmp",
]);

function collectSourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`canonical_source_symlink_forbidden:${target}`);
    }
    if (entry.isDirectory()) {
      return SOURCE_SCAN_IGNORED_DIRECTORIES.has(entry.name)
        ? []
        : collectSourceFiles(target);
    }
    return entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name))
      ? [target]
      : [];
  });
}

function staticModuleSpecifier(
  expression: ts.Expression,
  bindings: ReadonlyMap<string, string> = new Map(),
): string | null {
  if (ts.isParenthesizedExpression(expression)) {
    return staticModuleSpecifier(expression.expression, bindings);
  }
  if (
    ts.isStringLiteral(expression) ||
    ts.isNoSubstitutionTemplateLiteral(expression)
  ) {
    return expression.text;
  }
  if (
    ts.isBinaryExpression(expression) &&
    expression.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    const left = staticModuleSpecifier(expression.left, bindings);
    const right = staticModuleSpecifier(expression.right, bindings);
    return left === null || right === null ? null : left + right;
  }
  if (ts.isTemplateExpression(expression)) {
    let value = expression.head.text;
    for (const span of expression.templateSpans) {
      const substitution = staticModuleSpecifier(span.expression, bindings);
      if (substitution === null) return null;
      value += substitution + span.literal.text;
    }
    return value;
  }
  if (ts.isIdentifier(expression)) return bindings.get(expression.text) ?? null;
  return null;
}

function sourceModuleReferencesFromText(
  file: string,
  source: string,
): readonly (string | null)[] {
  const extension = path.extname(file);
  const scriptKind =
    extension === ".tsx"
      ? ts.ScriptKind.TSX
      : [".js", ".mjs", ".cjs"].includes(extension)
        ? ts.ScriptKind.JS
        : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
  const constBindings = new Map<string, string>();
  for (let pass = 0; pass < 8; pass += 1) {
    let changed = false;
    for (const statement of sourceFile.statements) {
      if (
        !ts.isVariableStatement(statement) ||
        !(statement.declarationList.flags & ts.NodeFlags.Const)
      ) {
        continue;
      }
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || !declaration.initializer) {
          continue;
        }
        const value = staticModuleSpecifier(
          declaration.initializer,
          constBindings,
        );
        if (
          value !== null &&
          constBindings.get(declaration.name.text) !== value
        ) {
          constBindings.set(declaration.name.text, value);
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
  const createRequireNames = new Set<string>();
  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !["node:module", "module"].includes(statement.moduleSpecifier.text) ||
      !statement.importClause?.namedBindings ||
      !ts.isNamedImports(statement.importClause.namedBindings)
    ) {
      continue;
    }
    for (const element of statement.importClause.namedBindings.elements) {
      if (
        (element.propertyName?.text ?? element.name.text) === "createRequire"
      ) {
        createRequireNames.add(element.name.text);
      }
    }
  }
  const loaderNames = new Set<string>(["require"]);
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) {
        continue;
      }
      if (
        ts.isCallExpression(declaration.initializer) &&
        ts.isIdentifier(declaration.initializer.expression) &&
        createRequireNames.has(declaration.initializer.expression.text)
      ) {
        loaderNames.add(declaration.name.text);
      } else if (
        ts.isIdentifier(declaration.initializer) &&
        loaderNames.has(declaration.initializer.text)
      ) {
        loaderNames.add(declaration.name.text);
      }
    }
  }
  const references: (string | null)[] = [];
  const isModuleRequire = (expression: ts.Expression) => {
    if (ts.isPropertyAccessExpression(expression)) {
      return (
        ts.isIdentifier(expression.expression) &&
        expression.expression.text === "module" &&
        expression.name.text === "require"
      );
    }
    return (
      ts.isElementAccessExpression(expression) &&
      ts.isIdentifier(expression.expression) &&
      expression.expression.text === "module" &&
      expression.argumentExpression !== undefined &&
      staticModuleSpecifier(expression.argumentExpression, constBindings) ===
        "require"
    );
  };
  const visit = (node: ts.Node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      references.push(node.moduleSpecifier.text);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression
    ) {
      references.push(
        staticModuleSpecifier(node.moduleReference.expression, constBindings),
      );
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          loaderNames.has(node.expression.text)) ||
        isModuleRequire(node.expression))
    ) {
      references.push(
        node.arguments.length === 1
          ? staticModuleSpecifier(node.arguments[0], constBindings)
          : null,
      );
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal)
    ) {
      references.push(node.argument.literal.text);
    } else if (ts.isCallExpression(node)) {
      for (const argument of node.arguments) {
        const value = staticModuleSpecifier(argument, constBindings);
        if (
          (value?.startsWith(".") || value?.includes("/")) &&
          (value.includes("v2_canonical_") ||
            value.includes("v2_generation_workspace_contract"))
        ) {
          references.push(value);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return references;
}

function sourceModuleReferences(file: string): readonly (string | null)[] {
  return sourceModuleReferencesFromText(file, fs.readFileSync(file, "utf8"));
}

describe("pure canonical V2 generation plan", () => {
  it("has exactly thirteen kinds and exactly eight interface locales", () => {
    expect(V2_CANONICAL_STAGE_KINDS).toEqual([
      "v2_season_outline",
      "v2_episode_outline",
      "v2_scene_set",
      "v2_dialogue_script",
      "v2_speaking_mission",
      "v2_voice_targets",
      "v2_activity_instances",
      "v2_activity_graph",
      "v2_asset_manifest",
      "v2_localization",
      "v2_preview_receipt",
      "v2_episode_bundle",
      "v2_season_qa",
    ]);
    expect(new Set(V2_CANONICAL_STAGE_KINDS).size).toBe(13);
    expect(V2_CANONICAL_INTERFACE_LOCALES).toEqual([
      "ru",
      "uk",
      "es",
      "pt-BR",
      "vi",
      "id",
      "tr",
      "pl",
    ]);
  });

  it("builds all four optional-branch combinations with exact parallel dependencies", () => {
    for (const [dialogue, speakingMission] of [
      [false, false],
      [true, false],
      [false, true],
      [true, true],
    ] as const) {
      const value = input();
      value.recipes = [{ episodeId: "episode-1", dialogue, speakingMission }];
      const plan = buildV2CanonicalSeasonPlan(trusted(value));
      const byKind = (kind: string) =>
        plan.stages.find((stage) => stage.kind === kind);
      const outline = byKind("v2_episode_outline")!;
      const scene = byKind("v2_scene_set")!;
      const voice = byKind("v2_voice_targets")!;
      const instances = byKind("v2_activity_instances")!;
      expect(scene.dependsOn).toEqual([outline.stageId]);
      expect(voice.dependsOn).toEqual([outline.stageId]);
      expect(byKind("v2_dialogue_script")?.dependsOn).toEqual(
        dialogue ? [outline.stageId] : undefined,
      );
      expect(byKind("v2_speaking_mission")?.dependsOn).toEqual(
        speakingMission ? [outline.stageId] : undefined,
      );
      expect(instances.dependsOn).toEqual([
        scene.stageId,
        voice.stageId,
        ...(dialogue ? [byKind("v2_dialogue_script")!.stageId] : []),
        ...(speakingMission ? [byKind("v2_speaking_mission")!.stageId] : []),
      ]);
      expect(plan.optionalStageDispositions).toEqual([
        {
          episodeId: "episode-1",
          dialogue: dialogue ? "required" : "not_required_by_recipe",
          speakingMission: speakingMission
            ? "required"
            : "not_required_by_recipe",
        },
      ]);
    }
  });

  it("binds stage identity to workspace, job and authoring revision", () => {
    const first = buildV2CanonicalSeasonPlan(trusted());
    const second = buildV2CanonicalSeasonPlan(
      trusted({ ...input(), jobId: "job-2" }),
    );
    const third = buildV2CanonicalSeasonPlan(
      trusted({ ...input(), authoringRevision: 8 }),
    );
    expect(new Set(first.stages.map((stage) => stage.stageId))).not.toEqual(
      new Set(second.stages.map((stage) => stage.stageId)),
    );
    expect(new Set(first.stages.map((stage) => stage.stageId))).not.toEqual(
      new Set(third.stages.map((stage) => stage.stageId)),
    );
    expect(first.planFingerprint).not.toBe(second.planFingerprint);
    expect(first.planFingerprint).not.toBe(third.planFingerprint);
  });

  it("is deterministic across recipe and template-binding input permutations", () => {
    const value = input("chapter_internal");
    value.recipes = [
      { episodeId: "episode-2", dialogue: false, speakingMission: true },
      { episodeId: "episode-1", dialogue: true, speakingMission: false },
    ];
    value.templateBindings = value.templateBindings.map((binding) => ({
      ...binding,
      templateRefs: [
        ...binding.templateRefs,
        { templateId: "listen-choose", version: 1, contentHash: hash("c") },
      ],
    }));
    const first = buildV2CanonicalSeasonPlan(trusted(value));
    const second = buildV2CanonicalSeasonPlan(
      trusted({
        ...value,
        recipes: [...value.recipes].reverse(),
        templateBindings: [...value.templateBindings]
          .reverse()
          .map((binding) => ({
            ...binding,
            templateRefs: [...binding.templateRefs].reverse(),
          })),
      }),
    );
    expect(second).toEqual(first);
  });

  it("normalizes omitted, empty and explicit-false recipes to one semantic plan", () => {
    const base = input();
    const { recipes: _recipes, ...withoutRecipes } = base;
    const omitted = buildV2CanonicalSeasonPlan(
      trusted(withoutRecipes as ReturnType<typeof input>),
    );
    const empty = buildV2CanonicalSeasonPlan(trusted({ ...base, recipes: [] }));
    const explicitFalse = buildV2CanonicalSeasonPlan(
      trusted({
        ...base,
        recipes: [
          { episodeId: "episode-1", dialogue: false, speakingMission: false },
        ],
      }),
    );
    expect(empty).toEqual(omitted);
    expect(explicitFalse).toEqual(omitted);

    const speakingOnly = buildV2CanonicalSeasonPlan(
      trusted({
        ...base,
        recipes: [{ episodeId: "episode-1", speakingMission: true }],
      } as ReturnType<typeof input>),
    );
    const speakingWithExplicitFalseDialogue = buildV2CanonicalSeasonPlan(
      trusted({
        ...base,
        recipes: [
          { episodeId: "episode-1", dialogue: false, speakingMission: true },
        ],
      }),
    );
    expect(speakingWithExplicitFalseDialogue).toEqual(speakingOnly);

    const dialogueOnly = buildV2CanonicalSeasonPlan(
      trusted({
        ...base,
        recipes: [{ episodeId: "episode-1", dialogue: true }],
      } as ReturnType<typeof input>),
    );
    const dialogueWithExplicitFalseSpeaking = buildV2CanonicalSeasonPlan(
      trusted({
        ...base,
        recipes: [
          { episodeId: "episode-1", dialogue: true, speakingMission: false },
        ],
      }),
    );
    expect(dialogueWithExplicitFalseSpeaking).toEqual(dialogueOnly);
  });

  it("pins the language profile, templates and per-locale preview closure", () => {
    const plan = buildV2CanonicalSeasonPlan(trusted());
    const season = plan.stages.find(
      (stage) => stage.kind === "v2_season_outline",
    )!;
    const instances = plan.stages.find(
      (stage) => stage.kind === "v2_activity_instances",
    )!;
    const locales = plan.stages.filter(
      (stage) => stage.kind === "v2_localization",
    );
    const assets = plan.stages.find(
      (stage) => stage.kind === "v2_asset_manifest",
    )!;
    const preview = plan.stages.find(
      (stage) => stage.kind === "v2_preview_receipt",
    )!;
    expect(season.externalRequirements).toEqual([
      {
        dependencyType: "language_profile",
        profileId: "english-general",
        version: 3,
        contentHash: hash("a"),
      },
      {
        dependencyType: "published_template",
        templateId: "phrase-builder",
        version: 2,
        contentHash: hash("b"),
      },
    ]);
    expect(instances.externalRequirements).toEqual([
      {
        dependencyType: "published_template",
        templateId: "phrase-builder",
        version: 2,
        contentHash: hash("b"),
      },
    ]);
    expect(locales.map((stage) => stage.locale)).toEqual(
      V2_CANONICAL_INTERFACE_LOCALES,
    );
    expect(preview.dependsOn).toEqual([
      assets.stageId,
      ...locales.map((stage) => stage.stageId),
    ]);
  });

  it("keeps 1/8/32 plans inside the exact bounded node ranges", () => {
    const counts = (
      scope: "vertical_slice" | "chapter_internal" | "full_season",
      optional: boolean,
    ) => {
      const value = input(scope);
      value.recipes = optional
        ? value.episodeIds.map((episodeId) => ({
            episodeId,
            dialogue: true,
            speakingMission: true,
          }))
        : [];
      return buildV2CanonicalSeasonPlan(trusted(value)).stages.length;
    };
    expect([
      counts("vertical_slice", false),
      counts("vertical_slice", true),
    ]).toEqual([18, 20]);
    expect([
      counts("chapter_internal", false),
      counts("chapter_internal", true),
    ]).toEqual([130, 146]);
    expect([counts("full_season", false), counts("full_season", true)]).toEqual(
      [514, 578],
    );
  });

  it("keeps season-wide prerequisites inside the byte-safe 32-dependency receipt boundary", () => {
    const withUniqueTemplates = (count: number) => {
      const value = input("full_season");
      const refs = Array.from({ length: count }, (_, index) => ({
        templateId: `template-${index + 1}`,
        version: 1,
        contentHash: index.toString(16).padStart(64, "0"),
      }));
      value.templateBindings = value.episodeIds.map(
        (episodeId, episodeIndex) => ({
          episodeId,
          templateRefs: episodeIndex === 0 ? refs : [refs[0]],
        }),
      );
      return value;
    };
    const maximum = buildV2CanonicalSeasonPlan(
      trusted(withUniqueTemplates(28)),
    );
    expect(
      maximum.stages.find((stage) => stage.kind === "v2_season_outline")
        ?.externalRequirements,
    ).toHaveLength(29);
    expect(() => trusted(withUniqueTemplates(29))).toThrow(
      "v2_canonical_season_prerequisite_capacity",
    );
  });

  it("rejects ambiguous identifiers and incomplete prerequisite bindings", () => {
    expect(() => trusted({ ...input(), workspaceId: "bad:id" })).toThrow(
      "v2_canonical_workspace_invalid",
    );
    expect(() => trusted({ ...input(), templateBindings: [] })).toThrow(
      "v2_canonical_template_binding_invalid",
    );
    expect(() =>
      trusted({
        ...input(),
        languageProfileRef: {
          ...input().languageProfileRef,
          contentHash: "bad",
        },
      }),
    ).toThrow("v2_canonical_profile_invalid");
    expect(() =>
      trusted({
        ...input(),
        languageProfileRef: {
          ...input().languageProfileRef,
          targetLanguage: "bad_language",
        },
      }),
    ).toThrow("v2_canonical_profile_invalid");
    expect(() =>
      trusted({
        ...input(),
        decisionRegistryRef: {
          ...input().decisionRegistryRef,
          decisionId: "OTHER",
        },
      }),
    ).toThrow("v2_canonical_decision_registry_invalid");
  });

  it("accepts only strict canonical bytes and never executes object accessors or Proxy traps", () => {
    const base = input();
    expect(() =>
      parseV2CanonicalPlanRequest(JSON.stringify(base, null, 2)),
    ).toThrow("v2_canonical_plan_request_noncanonical");
    expect(() =>
      parseV2CanonicalPlanRequest(canonicalJsonV1({ ...base, extra: true })),
    ).toThrow("v2_canonical_plan_input_invalid");
    expect(() =>
      parseV2CanonicalPlanRequest(
        canonicalJsonV1({
          ...base,
          templateBindings: [
            {
              ...base.templateBindings[0],
              templateRefs: [
                { ...base.templateBindings[0].templateRefs[0], extra: true },
              ],
            },
          ],
        }),
      ),
    ).toThrow("v2_canonical_template_invalid");
    let getterCalled = false;
    const hostile = Object.defineProperty({}, "schemaVersion", {
      enumerable: true,
      get() {
        getterCalled = true;
        return "v2-canonical-plan-request.v1";
      },
    });
    expect(() => buildV2CanonicalSeasonPlan(hostile as never)).toThrow(
      "v2_canonical_plan_request_untrusted",
    );
    expect(getterCalled).toBe(false);
    let proxyTraps = 0;
    const proxy = new Proxy(
      {},
      {
        get() {
          proxyTraps += 1;
          return undefined;
        },
        ownKeys() {
          proxyTraps += 1;
          return [];
        },
      },
    );
    expect(() => buildV2CanonicalSeasonPlan(proxy as never)).toThrow(
      "v2_canonical_plan_request_untrusted",
    );
    expect(proxyTraps).toBe(0);
  });

  it("detects comment-separated and CommonJS canonical-module loaders", () => {
    const canonical = "./v2_canonical_stage_validation_b2";
    const cases = [
      `import/*comment*/(${JSON.stringify(canonical)});`,
      `module.require(${JSON.stringify(canonical)});`,
      `module["re" + "quire"](${JSON.stringify(canonical)});`,
      `const prefix = "./v2_canonical_"; const target = prefix + "stage_validation_b2"; module.require(target);`,
      `import { createRequire } from "node:module"; const loader = createRequire(import.meta.url); loader(\`./v2_canonical_stage_validation_b2\`);`,
      `const target = "./v2_canonical_" + "stage_validation_b2"; customLoader(target);`,
    ];
    for (const [index, source] of cases.entries()) {
      expect(
        sourceModuleReferencesFromText(
          `/virtual/canonical-consumer-${index}.cjs`,
          source,
        ),
      ).toContain(canonical);
    }
    for (const target of [
      "../learning-v2/contracts/activity_catalog_v2",
      "../learning-v2/contracts/voice_playback_policy_v1",
    ]) {
      const source = `const base = ${JSON.stringify(
        target.slice(0, target.lastIndexOf("/") + 1),
      )}; const leaf = ${JSON.stringify(
        target.slice(target.lastIndexOf("/") + 1),
      )}; module.require(base + leaf);`;
      expect(
        sourceModuleReferencesFromText(
          "/virtual/modules/audio/canonical-consumer.cjs",
          source,
        ),
      ).toContain(target);
    }
  });

  it("is not imported by the live second-queue callable path", () => {
    const root = path.resolve(__dirname);
    const adminContract = fs.readFileSync(
      path.join(root, "v2_admin_generation_contract.ts"),
      "utf8",
    );
    const callable = fs.readFileSync(
      path.join(root, "..", "admin_v2_generation.ts"),
      "utf8",
    );
    const b2InternalFiles = [
      "v2_canonical_stage_validation_b2.ts",
      "v2_canonical_stage_validation_b2_common.ts",
      "v2_canonical_stage_validation_b2_contract.ts",
      "v2_canonical_stage_validation_b2_dialogue.ts",
      "v2_canonical_stage_validation_b2_scene.ts",
      "v2_canonical_stage_validation_b2_speaking.ts",
    ] as const;
    expect(adminContract).not.toContain("v2_canonical_generation_plan");
    expect(callable).not.toContain("v2_canonical_generation_plan");
    const importSpecifiers = (file: string) => {
      const references = sourceModuleReferences(path.join(root, file));
      expect(references).not.toContain(null);
      return references
        .filter((value): value is string => value !== null)
        .sort();
    };
    expect(importSpecifiers("v2_canonical_generation_plan.ts")).toEqual([
      "../../../modules/learning-v2/contracts/language_tag_v1",
      "../../../modules/learning-v2/policies/decision_registry",
    ]);
    expect(importSpecifiers("v2_canonical_generation_plan_v2.ts")).toEqual([
      "../../../modules/learning-v2/contracts/activity_catalog_v2",
      "../../../modules/learning-v2/contracts/language_tag_v1",
      "../../../modules/learning-v2/contracts/voice_playback_policy_v1",
      "../../../modules/learning-v2/policies/decision_registry",
      "./v2_canonical_generation_plan",
    ]);
    const repositoryRoot = path.resolve(root, "../../..");
    const activityCatalogV2 = path.join(
      repositoryRoot,
      "modules/learning-v2/contracts/activity_catalog_v2.ts",
    );
    const voicePlaybackPolicyV1 = path.join(
      repositoryRoot,
      "modules/learning-v2/contracts/voice_playback_policy_v1.ts",
    );
    const languageTagV1 = path.join(
      repositoryRoot,
      "modules/learning-v2/contracts/language_tag_v1.ts",
    );
    const activitySessionPackageV2 = path.join(
      repositoryRoot,
      "modules/learning-v2/contracts/activity_session_package_v2.ts",
    );
    const localEvaluatorCapsuleV1 = path.join(
      repositoryRoot,
      "modules/learning-v2/runtime/local_evaluator_capsule_v1.ts",
    );
    const voicePcmSignalObserverV1 = path.join(
      repositoryRoot,
      "modules/learning-v2/runtime/voice_pcm_signal_observer_v1.ts",
    );
    const nativePcmDecoderV1 = path.join(
      repositoryRoot,
      "modules/learning-v2-pcm-decoder/index.ts",
    );
    const nativePcmDecoderTypesV1 = path.join(
      repositoryRoot,
      "modules/learning-v2-pcm-decoder/types.ts",
    );
    const activityInstancesPackageV2 = path.join(
      root,
      "v2_activity_instances_package_v2.ts",
    );
    const activitySessionProjection = path.join(
      root,
      "v2_activity_session_projection.ts",
    );
    const sessionPackageRecoveryDecision = path.join(
      root,
      "v2_session_package_recovery_decision_v1.ts",
    );
    expect(
      sourceModuleReferences(activityCatalogV2)
        .filter((value): value is string => value !== null)
        .sort(),
    ).toEqual(["../policies/decision_registry", "./activity"]);
    expect(
      sourceModuleReferences(voicePlaybackPolicyV1)
        .filter((value): value is string => value !== null)
        .sort(),
    ).toEqual(["../policies/decision_registry"]);
    expect(
      sourceModuleReferences(activitySessionPackageV2)
        .filter((value): value is string => value !== null)
        .sort(),
    ).toEqual(["../policies/decision_registry", "./activity_catalog_v2"]);
    expect(
      sourceModuleReferences(localEvaluatorCapsuleV1)
        .filter((value): value is string => value !== null)
        .sort(),
    ).toEqual([
      "../contracts/activity_catalog_v2",
      "../policies/decision_registry",
    ]);
    expect(
      sourceModuleReferences(voicePcmSignalObserverV1)
        .filter((value): value is string => value !== null)
        .sort(),
    ).toEqual(["../policies/decision_registry"]);
    expect(
      sourceModuleReferences(nativePcmDecoderV1)
        .filter((value): value is string => value !== null)
        .sort(),
    ).toEqual([
      "../learning-v2/runtime/voice_pcm_signal_observer_v1",
      "./types",
      "expo-modules-core",
    ]);
    expect(importSpecifiers("v2_activity_instances_package_v2.ts")).toEqual([
      "../../../modules/learning-v2/contracts/activity_session_package_v2",
      "../../../modules/learning-v2/policies/decision_registry",
      "../../../modules/learning-v2/runtime/local_evaluator_capsule_v1",
      "./v2_activity_session_projection",
      "./v2_canonical_generation_plan_v2",
    ]);
    expect(importSpecifiers("v2_activity_session_projection.ts")).toEqual([
      "../../../modules/learning-v2/contracts/activity_catalog_v2",
      "../../../modules/learning-v2/contracts/activity_session_package_v2",
      "../../../modules/learning-v2/policies/decision_registry",
      "../../../modules/learning-v2/runtime/local_evaluator_capsule_v1",
    ]);
    expect(
      importSpecifiers("v2_session_package_recovery_decision_v1.ts"),
    ).toEqual(["../../../modules/learning-v2/policies/decision_registry"]);
    expect(importSpecifiers("v2_generation_workspace_contract.ts")).toEqual([
      "../../../modules/learning-v2/policies/decision_registry",
      "./v2_canonical_generation_plan",
    ]);
    expect(importSpecifiers("v2_generation_workspace_contract_v2.ts")).toEqual([
      "../../../modules/learning-v2/policies/decision_registry",
      "./v2_canonical_generation_plan_v2",
      "./v2_repository_capability_observation_v1",
    ]);
    expect(
      importSpecifiers("v2_repository_capability_observation_v1.ts"),
    ).toEqual(
      [
        "../../../modules/learning-v2/content/language_profile",
        "../../../modules/learning-v2/contracts/activity",
        "../../../modules/learning-v2/contracts/validation",
        "../../../modules/learning-v2/policies/decision_registry",
        "./v2_canonical_generation_plan_v2",
      ].sort(),
    );
    expect(
      importSpecifiers("v2_authenticated_repository_contract_v1.ts"),
    ).toEqual([
      "../../../modules/learning-v2/policies/decision_registry",
      "./v2_firebase_repository_trust_root_v1",
      "node:crypto",
    ]);
    expect(
      importSpecifiers("v2_voice_native_decoder_page_receipt_v1.ts"),
    ).toEqual([
      "../../../modules/learning-v2/policies/decision_registry",
      "../../../modules/learning-v2/runtime/voice_native_decoder_observer_v1",
      "./v2_voice_audio_episode_receipt_v1",
      "./v2_voice_audio_manifest_v1",
    ]);
    expect(
      importSpecifiers("v2_voice_native_decoder_episode_receipt_v1.ts"),
    ).toEqual([
      "../../../modules/learning-v2/policies/decision_registry",
      "./v2_voice_audio_episode_receipt_v1",
      "./v2_voice_audio_manifest_v1",
      "./v2_voice_native_decoder_page_receipt_v1",
    ]);
    expect(importSpecifiers("v2_voice_pcm_signal_page_receipt_v1.ts")).toEqual([
      "../../../modules/learning-v2/policies/decision_registry",
      "../../../modules/learning-v2/runtime/voice_pcm_signal_observer_v1",
      "./v2_voice_audio_episode_receipt_v1",
      "./v2_voice_audio_manifest_v1",
      "./v2_voice_native_decoder_page_receipt_v1",
    ]);
    expect(
      importSpecifiers("v2_voice_pcm_signal_episode_receipt_v1.ts"),
    ).toEqual([
      "../../../modules/learning-v2/policies/decision_registry",
      "../../../modules/learning-v2/runtime/voice_pcm_signal_observer_v1",
      "./v2_voice_audio_episode_receipt_v1",
      "./v2_voice_audio_manifest_v1",
      "./v2_voice_native_decoder_episode_receipt_v1",
      "./v2_voice_pcm_signal_page_receipt_v1",
    ]);
    expect(importSpecifiers("v2_repository_singleflight_state_v1.ts")).toEqual([
      "../../../modules/learning-v2/policies/decision_registry",
      "./v2_firebase_repository_trust_root_v1",
    ]);
    expect(importSpecifiers("v2_firebase_repository_trust_root_v1.ts")).toEqual(
      ["../../../modules/learning-v2/policies/decision_registry"],
    );
    expect(
      importSpecifiers("v2_firebase_repository_persistence_v1.ts"),
    ).toEqual(["./v2_repository_singleflight_state_v1", "node:crypto"]);
    expect(importSpecifiers("v2_firebase_admin_repository_io_v1.ts")).toEqual([
      "../../../modules/learning-v2/policies/decision_registry",
      "./v2_authenticated_repository_contract_v1",
      "./v2_firebase_repository_persistence_v1",
      "./v2_firebase_repository_trust_root_v1",
      "./v2_voice_profile_repository_contract_v1",
      "firebase-admin",
      "node:crypto",
    ]);
    expect(
      importSpecifiers("v2_authenticated_repository_materialization_v1.ts"),
    ).toEqual([
      "../../../modules/learning-v2/policies/decision_registry",
      "./v2_authenticated_repository_contract_v1",
      "./v2_canonical_generation_plan_v2",
      "./v2_firebase_admin_repository_io_v1",
      "./v2_firebase_repository_trust_root_v1",
      "./v2_repository_capability_observation_v1",
      "./v2_repository_singleflight_state_v1",
      "node:crypto",
    ]);
    expect(
      importSpecifiers("v2_firebase_authenticated_repository_adapter_v1.ts"),
    ).toEqual([
      "../../../modules/learning-v2/policies/decision_registry",
      "./v2_activity_instances_validator_capability_v1",
      "./v2_authenticated_repository_contract_v1",
      "./v2_authenticated_repository_materialization_v1",
      "./v2_canonical_generation_plan_v2",
      "./v2_firebase_admin_repository_io_v1",
      "./v2_firebase_repository_persistence_v1",
      "./v2_firebase_repository_trust_root_v1",
      "./v2_repository_capability_observation_v1",
      "./v2_repository_singleflight_state_v1",
      "node:crypto",
    ]);
    expect(importSpecifiers("v2_activity_stage_commit_contract_v1.ts")).toEqual(
      [
        "../../../modules/learning-v2/policies/decision_registry",
        "./v2_firebase_repository_trust_root_v1",
      ],
    );
    expect(
      importSpecifiers("v2_firebase_activity_stage_commit_adapter_v1.ts"),
    ).toEqual([
      "../../../modules/learning-v2/policies/decision_registry",
      "./v2_activity_stage_commit_contract_v1",
      "./v2_canonical_generation_plan_v2",
      "./v2_firebase_admin_repository_io_v1",
      "./v2_firebase_authenticated_repository_adapter_v1",
      "./v2_firebase_repository_persistence_v1",
      "./v2_generation_workspace_contract_v2",
      "./v2_repository_capability_observation_v1",
      "node:crypto",
    ]);
    expect(
      importSpecifiers("v2_activity_instances_validator_capability_v1.ts"),
    ).toEqual([
      "../../../modules/learning-v2/contracts/activity_catalog_v2",
      "../../../modules/learning-v2/policies/decision_registry",
      "../../../modules/learning-v2/runtime/local_evaluator_capsule_v1",
      "./v2_activity_instances_package_v2",
      "./v2_activity_session_projection",
      "./v2_canonical_generation_plan_v2",
      "./v2_repository_capability_observation_v1",
    ]);
    expect(importSpecifiers("v2_activity_instances_validator_v1.ts")).toEqual([
      "../../../modules/learning-v2/policies/decision_registry",
      "./v2_activity_instances_package_v2",
      "./v2_canonical_generation_plan_v2",
      "./v2_generation_workspace_contract_v2",
    ]);
    expect(
      importSpecifiers("v2_activity_instances_child_readback_v1.ts"),
    ).toEqual([
      "../../../modules/learning-v2/contracts/activity_session_package_v2",
      "../../../modules/learning-v2/policies/decision_registry",
      "./v2_activity_instances_package_v2",
      "./v2_firebase_repository_persistence_v1",
      "node:crypto",
    ]);
    expect(
      importSpecifiers(
        "v2_firebase_activity_instances_validator_adapter_v1.ts",
      ),
    ).toEqual([
      "../../../modules/learning-v2/policies/decision_registry",
      "./v2_activity_instances_child_readback_v1",
      "./v2_activity_instances_package_v2",
      "./v2_activity_instances_validator_v1",
      "./v2_canonical_generation_plan_v2",
      "./v2_firebase_activity_stage_commit_adapter_v1",
      "./v2_firebase_admin_repository_io_v1",
      "./v2_firebase_authenticated_repository_adapter_v1",
      "./v2_firebase_repository_persistence_v1",
    ]);
    expect(
      importSpecifiers("v2_activity_instances_machine_receipt_v1.ts"),
    ).toEqual([
      "../../../modules/learning-v2/policies/decision_registry",
      "./v2_activity_instances_package_v2",
      "./v2_activity_instances_validator_v1",
      "./v2_activity_stage_commit_contract_v1",
    ]);
    expect(
      importSpecifiers(
        "v2_firebase_activity_instances_machine_receipt_adapter_v1.ts",
      ),
    ).toEqual([
      "../../../modules/learning-v2/policies/decision_registry",
      "./v2_activity_instances_machine_receipt_v1",
      "./v2_canonical_generation_plan_v2",
      "./v2_firebase_activity_instances_validator_adapter_v1",
      "./v2_firebase_admin_repository_io_v1",
      "./v2_firebase_repository_persistence_v1",
      "./v2_generation_workspace_contract_v2",
      "node:crypto",
    ]);
    expect(importSpecifiers("v2_voice_profile_contracts_v1.ts")).toEqual([
      "../../../modules/learning-v2/contracts/language_tag_v1",
      "../../../modules/learning-v2/contracts/voice_playback_policy_v1",
      "../../../modules/learning-v2/policies/decision_registry",
    ]);
    expect(importSpecifiers("v2_activity_audio_target_catalog_v1.ts")).toEqual([
      "../../../modules/learning-v2/contracts/voice_playback_policy_v1",
      "../../../modules/learning-v2/policies/decision_registry",
      "./v2_activity_session_projection",
      "./v2_voice_profile_contracts_v1",
    ]);
    expect(importSpecifiers("v2_voice_targets_package_v2.ts")).toEqual([
      "../../../modules/learning-v2/contracts/voice_playback_policy_v1",
      "../../../modules/learning-v2/policies/decision_registry",
      "./v2_activity_audio_target_catalog_v1",
      "./v2_canonical_generation_plan_v2",
      "./v2_generation_workspace_contract_v2",
      "./v2_voice_profile_contracts_v1",
    ]);
    expect(importSpecifiers("v2_voice_targets_validator_v1.ts")).toEqual([
      "../../../modules/learning-v2/policies/decision_registry",
      "./v2_canonical_generation_plan_v2",
      "./v2_generation_workspace_contract_v2",
      "./v2_voice_targets_package_v2",
    ]);
    expect(importSpecifiers("v2_voice_targets_machine_receipt_v1.ts")).toEqual([
      "../../../modules/learning-v2/policies/decision_registry",
      "./v2_generation_workspace_contract_v2",
      "./v2_voice_targets_package_v2",
      "./v2_voice_targets_validator_v1",
    ]);
    expect(
      importSpecifiers(
        "v2_firebase_voice_targets_machine_receipt_adapter_v1.ts",
      ),
    ).toEqual([
      "../../../modules/learning-v2/policies/decision_registry",
      "./v2_firebase_admin_repository_io_v1",
      "./v2_firebase_repository_persistence_v1",
      "./v2_generation_workspace_contract_v2",
      "./v2_voice_targets_machine_receipt_v1",
      "./v2_voice_targets_package_v2",
      "./v2_voice_targets_validator_v1",
      "node:crypto",
    ]);
    expect(
      importSpecifiers("v2_voice_profile_repository_contract_v1.ts"),
    ).toEqual([
      "../../../modules/learning-v2/policies/decision_registry",
      "./v2_voice_profile_contracts_v1",
    ]);
    expect(
      importSpecifiers("v2_firebase_voice_profile_repository_adapter_v1.ts"),
    ).toEqual([
      "../../../modules/learning-v2/policies/decision_registry",
      "./v2_canonical_generation_plan_v2",
      "./v2_firebase_admin_repository_io_v1",
      "./v2_firebase_repository_trust_root_v1",
      "./v2_voice_profile_contracts_v1",
      "./v2_voice_profile_repository_contract_v1",
    ]);
    expect(
      importSpecifiers("v2_firebase_voice_targets_authenticated_input_v1.ts"),
    ).toEqual([
      "../../../modules/learning-v2/policies/decision_registry",
      "./v2_canonical_generation_plan_v2",
      "./v2_firebase_voice_profile_repository_adapter_v1",
      "./v2_generation_workspace_contract_v2",
      "./v2_voice_targets_package_v2",
      "./v2_voice_targets_validator_v1",
    ]);
    expect(importSpecifiers("v2_voice_tts_work_order_v1.ts")).toEqual([
      "../../../modules/learning-v2/policies/decision_registry",
      "./v2_canonical_generation_plan_v2",
      "./v2_firebase_voice_targets_authenticated_input_v1",
      "./v2_voice_profile_contracts_v1",
      "./v2_voice_targets_package_v2",
    ]);
    expect(importSpecifiers("v2_openai_voice_tts_provider_v1.ts")).toEqual([
      "../../../modules/learning-v2/policies/decision_registry",
      "./v2_canonical_generation_plan_v2",
      "./v2_voice_mp3_codec_v1",
      "./v2_voice_tts_work_order_v1",
      "node:crypto",
    ]);
    expect(importSpecifiers("v2_voice_mp3_codec_v1.ts")).toEqual([
      "../../../modules/learning-v2/policies/decision_registry",
    ]);
    expect(
      importSpecifiers("v2_firebase_voice_audio_persistence_v1.ts"),
    ).toEqual([
      "../../../modules/learning-v2/policies/decision_registry",
      "./v2_canonical_generation_plan_v2",
      "./v2_firebase_admin_repository_io_v1",
      "./v2_firebase_repository_persistence_v1",
      "./v2_openai_voice_tts_provider_v1",
      "./v2_voice_mp3_codec_v1",
    ]);
    expect(importSpecifiers("v2_voice_audio_manifest_v1.ts")).toEqual([
      "../../../modules/learning-v2/policies/decision_registry",
      "./v2_canonical_generation_plan_v2",
      "./v2_firebase_voice_audio_persistence_v1",
      "./v2_voice_tts_work_order_v1",
    ]);
    expect(
      importSpecifiers("v2_firebase_voice_audio_manifest_adapter_v1.ts"),
    ).toEqual([
      "../../../modules/learning-v2/policies/decision_registry",
      "./v2_canonical_generation_plan_v2",
      "./v2_firebase_admin_repository_io_v1",
      "./v2_firebase_repository_persistence_v1",
      "./v2_firebase_voice_audio_persistence_v1",
      "./v2_voice_audio_manifest_v1",
      "node:crypto",
    ]);
    expect(importSpecifiers("v2_voice_audio_page_receipt_v1.ts")).toEqual([
      "../../../modules/learning-v2/policies/decision_registry",
      "./v2_voice_audio_manifest_v1",
    ]);
    expect(
      importSpecifiers("v2_firebase_voice_audio_page_receipt_adapter_v1.ts"),
    ).toEqual([
      "../../../modules/learning-v2/policies/decision_registry",
      "./v2_canonical_generation_plan_v2",
      "./v2_firebase_admin_repository_io_v1",
      "./v2_firebase_repository_persistence_v1",
      "./v2_voice_audio_manifest_v1",
      "./v2_voice_audio_page_receipt_v1",
      "./v2_voice_mp3_codec_v1",
      "node:crypto",
    ]);
    expect(importSpecifiers("v2_voice_audio_episode_receipt_v1.ts")).toEqual([
      "../../../modules/learning-v2/policies/decision_registry",
      "./v2_firebase_repository_persistence_v1",
      "./v2_voice_audio_manifest_v1",
      "./v2_voice_audio_page_receipt_v1",
    ]);
    expect(
      importSpecifiers("v2_firebase_voice_audio_episode_receipt_adapter_v1.ts"),
    ).toEqual([
      "../../../modules/learning-v2/policies/decision_registry",
      "./v2_canonical_generation_plan_v2",
      "./v2_firebase_admin_repository_io_v1",
      "./v2_firebase_repository_persistence_v1",
      "./v2_firebase_voice_audio_page_receipt_adapter_v1",
      "./v2_voice_audio_episode_receipt_v1",
      "./v2_voice_audio_manifest_v1",
      "./v2_voice_audio_page_receipt_v1",
      "node:crypto",
    ]);
    expect(importSpecifiers("v2_canonical_stage_validation.ts")).toEqual([
      "../../../modules/learning-v2/policies/decision_registry",
      "./v2_canonical_generation_plan",
      "./v2_canonical_stage_validation_b2",
      "./v2_generation_workspace_contract",
    ]);
    expect(importSpecifiers("v2_canonical_stage_validation_b2.ts")).toEqual([
      "./v2_canonical_stage_validation_b2_contract",
      "./v2_canonical_stage_validation_b2_contract",
      "./v2_canonical_stage_validation_b2_dialogue",
      "./v2_canonical_stage_validation_b2_scene",
      "./v2_canonical_stage_validation_b2_speaking",
    ]);
    expect(
      importSpecifiers("v2_canonical_stage_validation_b2_contract.ts"),
    ).toEqual(["./v2_canonical_generation_plan"]);
    expect(
      importSpecifiers("v2_canonical_stage_validation_b2_common.ts"),
    ).toEqual([
      "../../../modules/learning-v2/policies/decision_registry",
      "./v2_canonical_generation_plan",
      "./v2_canonical_stage_validation_b2_contract",
    ]);
    const expectedStageImports = new Map<
      (typeof b2InternalFiles)[number],
      readonly string[]
    >([
      [
        "v2_canonical_stage_validation_b2_dialogue.ts",
        [
          "../../../modules/learning-v2/policies/decision_registry",
          "./v2_canonical_stage_validation_b2_common",
          "./v2_canonical_stage_validation_b2_contract",
        ],
      ],
      [
        "v2_canonical_stage_validation_b2_scene.ts",
        [
          "../../../modules/learning-v2/policies/decision_registry",
          "./v2_canonical_stage_validation_b2_common",
          "./v2_canonical_stage_validation_b2_contract",
        ],
      ],
      [
        "v2_canonical_stage_validation_b2_speaking.ts",
        [
          "../../../modules/learning-v2/policies/decision_registry",
          "./v2_canonical_generation_plan",
          "./v2_canonical_stage_validation_b2_common",
          "./v2_canonical_stage_validation_b2_contract",
        ],
      ],
    ]);
    for (const [file, expectedImports] of expectedStageImports) {
      expect(importSpecifiers(file)).toEqual(expectedImports);
    }
    const canonicalRealPath = (file: string) =>
      fs.realpathSync.native(path.resolve(file));
    const allowedCanonicalConsumers = new Set(
      [
        "v2_canonical_generation_plan.ts",
        "v2_canonical_generation_plan_v2.ts",
        "v2_generation_workspace_contract.ts",
        "v2_generation_workspace_contract_v2.ts",
        "v2_repository_capability_observation_v1.ts",
        "v2_authenticated_repository_contract_v1.ts",
        "v2_repository_singleflight_state_v1.ts",
        "v2_firebase_repository_trust_root_v1.ts",
        "v2_firebase_repository_persistence_v1.ts",
        "v2_firebase_admin_repository_io_v1.ts",
        "v2_authenticated_repository_materialization_v1.ts",
        "v2_firebase_authenticated_repository_adapter_v1.ts",
        "v2_activity_stage_commit_contract_v1.ts",
        "v2_firebase_activity_stage_commit_adapter_v1.ts",
        "v2_activity_instances_validator_capability_v1.ts",
        "v2_activity_instances_validator_v1.ts",
        "v2_activity_instances_child_readback_v1.ts",
        "v2_firebase_activity_instances_validator_adapter_v1.ts",
        "v2_activity_instances_machine_receipt_v1.ts",
        "v2_firebase_activity_instances_machine_receipt_adapter_v1.ts",
        "v2_voice_profile_contracts_v1.ts",
        "v2_activity_audio_target_catalog_v1.ts",
        "v2_voice_targets_package_v2.ts",
        "v2_voice_targets_validator_v1.ts",
        "v2_voice_targets_machine_receipt_v1.ts",
        "v2_firebase_voice_targets_machine_receipt_adapter_v1.ts",
        "v2_voice_profile_repository_contract_v1.ts",
        "v2_firebase_voice_profile_repository_adapter_v1.ts",
        "v2_firebase_voice_targets_authenticated_input_v1.ts",
        "v2_voice_tts_work_order_v1.ts",
        "v2_openai_voice_tts_provider_v1.ts",
        "v2_voice_mp3_codec_v1.ts",
        "v2_firebase_voice_audio_persistence_v1.ts",
        "v2_voice_audio_manifest_v1.ts",
        "v2_firebase_voice_audio_manifest_adapter_v1.ts",
        "v2_voice_audio_page_receipt_v1.ts",
        "v2_firebase_voice_audio_page_receipt_adapter_v1.ts",
        "v2_voice_audio_episode_receipt_v1.ts",
        "v2_firebase_voice_audio_episode_receipt_adapter_v1.ts",
        "v2_voice_native_decoder_page_receipt_v1.ts",
        "v2_voice_native_decoder_episode_receipt_v1.ts",
        "v2_voice_pcm_signal_page_receipt_v1.ts",
        "v2_voice_pcm_signal_episode_receipt_v1.ts",
        "v2_canonical_stage_validation.ts",
        "v2_activity_instances_package_v2.ts",
        "v2_activity_session_projection.ts",
        "v2_session_package_recovery_decision_v1.ts",
        ...b2InternalFiles,
      ]
        .map((file) => canonicalRealPath(path.resolve(root, file)))
        .concat([
          canonicalRealPath(activitySessionPackageV2),
          canonicalRealPath(localEvaluatorCapsuleV1),
          canonicalRealPath(languageTagV1),
          canonicalRealPath(voicePcmSignalObserverV1),
          canonicalRealPath(nativePcmDecoderV1),
          canonicalRealPath(nativePcmDecoderTypesV1),
        ]),
    );
    const functionsSourceRoot = path.join(root, "..");
    const canonicalTargets = new Set(
      [
        "v2_canonical_generation_plan.ts",
        "v2_canonical_generation_plan_v2.ts",
        "v2_generation_workspace_contract.ts",
        "v2_generation_workspace_contract_v2.ts",
        "v2_repository_capability_observation_v1.ts",
        "v2_authenticated_repository_contract_v1.ts",
        "v2_repository_singleflight_state_v1.ts",
        "v2_firebase_repository_trust_root_v1.ts",
        "v2_firebase_repository_persistence_v1.ts",
        "v2_firebase_admin_repository_io_v1.ts",
        "v2_authenticated_repository_materialization_v1.ts",
        "v2_firebase_authenticated_repository_adapter_v1.ts",
        "v2_activity_stage_commit_contract_v1.ts",
        "v2_firebase_activity_stage_commit_adapter_v1.ts",
        "v2_activity_instances_validator_capability_v1.ts",
        "v2_activity_instances_validator_v1.ts",
        "v2_activity_instances_child_readback_v1.ts",
        "v2_firebase_activity_instances_validator_adapter_v1.ts",
        "v2_activity_instances_machine_receipt_v1.ts",
        "v2_firebase_activity_instances_machine_receipt_adapter_v1.ts",
        "v2_voice_profile_contracts_v1.ts",
        "v2_activity_audio_target_catalog_v1.ts",
        "v2_voice_targets_package_v2.ts",
        "v2_voice_targets_validator_v1.ts",
        "v2_voice_targets_machine_receipt_v1.ts",
        "v2_firebase_voice_targets_machine_receipt_adapter_v1.ts",
        "v2_voice_profile_repository_contract_v1.ts",
        "v2_firebase_voice_profile_repository_adapter_v1.ts",
        "v2_firebase_voice_targets_authenticated_input_v1.ts",
        "v2_voice_tts_work_order_v1.ts",
        "v2_openai_voice_tts_provider_v1.ts",
        "v2_voice_mp3_codec_v1.ts",
        "v2_firebase_voice_audio_persistence_v1.ts",
        "v2_voice_audio_manifest_v1.ts",
        "v2_firebase_voice_audio_manifest_adapter_v1.ts",
        "v2_voice_audio_page_receipt_v1.ts",
        "v2_firebase_voice_audio_page_receipt_adapter_v1.ts",
        "v2_voice_audio_episode_receipt_v1.ts",
        "v2_firebase_voice_audio_episode_receipt_adapter_v1.ts",
        "v2_voice_native_decoder_page_receipt_v1.ts",
        "v2_voice_native_decoder_episode_receipt_v1.ts",
        "v2_voice_pcm_signal_page_receipt_v1.ts",
        "v2_voice_pcm_signal_episode_receipt_v1.ts",
        "v2_canonical_stage_validation.ts",
        ...b2InternalFiles,
      ].map((file) => canonicalRealPath(path.resolve(root, file))),
    );
    canonicalTargets.add(canonicalRealPath(activityCatalogV2));
    canonicalTargets.add(canonicalRealPath(voicePlaybackPolicyV1));
    canonicalTargets.add(canonicalRealPath(languageTagV1));
    canonicalTargets.add(canonicalRealPath(activitySessionPackageV2));
    canonicalTargets.add(canonicalRealPath(localEvaluatorCapsuleV1));
    canonicalTargets.add(canonicalRealPath(voicePcmSignalObserverV1));
    canonicalTargets.add(canonicalRealPath(nativePcmDecoderV1));
    canonicalTargets.add(canonicalRealPath(nativePcmDecoderTypesV1));
    canonicalTargets.add(canonicalRealPath(activityInstancesPackageV2));
    canonicalTargets.add(canonicalRealPath(activitySessionProjection));
    canonicalTargets.add(canonicalRealPath(sessionPackageRecoveryDecision));
    const configPath = ts.findConfigFile(
      path.resolve(root, "../.."),
      ts.sys.fileExists,
      "tsconfig.json",
    );
    if (!configPath) throw new Error("functions_tsconfig_missing");
    const config = ts.readConfigFile(configPath, ts.sys.readFile);
    const parsedConfig = ts.parseJsonConfigFileContent(
      config.config,
      ts.sys,
      path.dirname(configPath),
    );
    const sourceRoots = [
      functionsSourceRoot,
      path.join(repositoryRoot, "modules"),
      path.join(repositoryRoot, "app"),
      path.join(repositoryRoot, "components"),
      path.join(repositoryRoot, "constants"),
      path.join(repositoryRoot, "hooks"),
      path.join(repositoryRoot, "contexts"),
      path.join(repositoryRoot, "lib"),
      path.join(repositoryRoot, "shared"),
      path.join(repositoryRoot, "duel"),
      path.join(repositoryRoot, "plugins"),
      path.join(repositoryRoot, "functions-english-test"),
      path.join(repositoryRoot, "scripts"),
      path.join(repositoryRoot, "tools"),
    ].filter((directory) => fs.existsSync(directory));
    const unauthorizedImports = sourceRoots
      .flatMap((directory) => collectSourceFiles(directory))
      .filter((file) => !/\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(file))
      .filter((file) => !allowedCanonicalConsumers.has(canonicalRealPath(file)))
      .filter((file) => {
        const source = fs.readFileSync(file, "utf8");
        return sourceModuleReferences(file).some((specifier) => {
          if (specifier === null) {
            return (
              source.includes("v2_canonical_") ||
              source.includes("v2_generation_workspace_contract") ||
              source.includes("v2_repository_capability_observation_v1") ||
              source.includes("v2_authenticated_repository_contract_v1") ||
              source.includes("v2_repository_singleflight_state_v1") ||
              source.includes("v2_firebase_repository_trust_root_v1") ||
              source.includes("v2_firebase_repository_persistence_v1") ||
              source.includes("v2_firebase_admin_repository_io_v1") ||
              source.includes(
                "v2_authenticated_repository_materialization_v1",
              ) ||
              source.includes(
                "v2_firebase_authenticated_repository_adapter_v1",
              ) ||
              source.includes("v2_activity_stage_commit_contract_v1") ||
              source.includes("v2_firebase_activity_stage_commit_adapter_v1") ||
              source.includes(
                "v2_activity_instances_validator_capability_v1",
              ) ||
              source.includes("v2_activity_instances_validator_v1") ||
              source.includes("v2_activity_instances_child_readback_v1") ||
              source.includes(
                "v2_firebase_activity_instances_validator_adapter_v1",
              ) ||
              source.includes("v2_activity_instances_machine_receipt_v1") ||
              source.includes(
                "v2_firebase_activity_instances_machine_receipt_adapter_v1",
              ) ||
              source.includes("v2_voice_profile_contracts_v1") ||
              source.includes("v2_activity_audio_target_catalog_v1") ||
              source.includes("v2_voice_targets_package_v2") ||
              source.includes("v2_voice_targets_validator_v1") ||
              source.includes("v2_voice_targets_machine_receipt_v1") ||
              source.includes(
                "v2_firebase_voice_targets_machine_receipt_adapter_v1",
              ) ||
              source.includes("v2_voice_profile_repository_contract_v1") ||
              source.includes(
                "v2_firebase_voice_profile_repository_adapter_v1",
              ) ||
              source.includes(
                "v2_firebase_voice_targets_authenticated_input_v1",
              ) ||
              source.includes("v2_voice_tts_work_order_v1") ||
              source.includes("v2_openai_voice_tts_provider_v1") ||
              source.includes("v2_voice_mp3_codec_v1") ||
              source.includes("v2_firebase_voice_audio_persistence_v1") ||
              source.includes("v2_voice_audio_manifest_v1") ||
              source.includes("v2_firebase_voice_audio_manifest_adapter_v1") ||
              source.includes("v2_voice_audio_page_receipt_v1") ||
              source.includes(
                "v2_firebase_voice_audio_page_receipt_adapter_v1",
              ) ||
              source.includes("v2_voice_audio_episode_receipt_v1") ||
              source.includes(
                "v2_firebase_voice_audio_episode_receipt_adapter_v1",
              ) ||
              source.includes("v2_voice_native_decoder_page_receipt_v1") ||
              source.includes("v2_voice_native_decoder_episode_receipt_v1") ||
              source.includes("v2_voice_pcm_signal_observer_v1") ||
              source.includes("learning-v2-pcm-decoder") ||
              source.includes("v2_voice_pcm_signal_page_receipt_v1") ||
              source.includes("v2_voice_pcm_signal_episode_receipt_v1") ||
              source.includes("activity_catalog_v2") ||
              source.includes("voice_playback_policy_v1") ||
              source.includes("activity_session_package_v2") ||
              source.includes("local_evaluator_capsule_v1") ||
              source.includes("v2_activity_instances_package_v2") ||
              source.includes("v2_activity_session_projection") ||
              source.includes("v2_session_package_recovery_decision_v1")
            );
          }
          const resolved = ts.resolveModuleName(
            specifier,
            file,
            parsedConfig.options,
            ts.sys,
          ).resolvedModule?.resolvedFileName;
          return (
            (resolved !== undefined &&
              fs.existsSync(resolved) &&
              canonicalTargets.has(canonicalRealPath(resolved))) ||
            specifier.includes("v2_canonical_") ||
            specifier.includes("v2_generation_workspace_contract") ||
            specifier.includes("v2_repository_capability_observation_v1") ||
            specifier.includes("v2_authenticated_repository_contract_v1") ||
            specifier.includes("v2_repository_singleflight_state_v1") ||
            specifier.includes("v2_firebase_repository_trust_root_v1") ||
            specifier.includes("v2_firebase_repository_persistence_v1") ||
            specifier.includes("v2_firebase_admin_repository_io_v1") ||
            specifier.includes(
              "v2_authenticated_repository_materialization_v1",
            ) ||
            specifier.includes(
              "v2_firebase_authenticated_repository_adapter_v1",
            ) ||
            specifier.includes("v2_activity_stage_commit_contract_v1") ||
            specifier.includes(
              "v2_firebase_activity_stage_commit_adapter_v1",
            ) ||
            specifier.includes(
              "v2_activity_instances_validator_capability_v1",
            ) ||
            specifier.includes("v2_activity_instances_validator_v1") ||
            specifier.includes("v2_activity_instances_child_readback_v1") ||
            specifier.includes(
              "v2_firebase_activity_instances_validator_adapter_v1",
            ) ||
            specifier.includes("v2_activity_instances_machine_receipt_v1") ||
            specifier.includes(
              "v2_firebase_activity_instances_machine_receipt_adapter_v1",
            ) ||
            specifier.includes("v2_voice_profile_contracts_v1") ||
            specifier.includes("v2_activity_audio_target_catalog_v1") ||
            specifier.includes("v2_voice_targets_package_v2") ||
            specifier.includes("v2_voice_targets_validator_v1") ||
            specifier.includes("v2_voice_targets_machine_receipt_v1") ||
            specifier.includes(
              "v2_firebase_voice_targets_machine_receipt_adapter_v1",
            ) ||
            specifier.includes("v2_voice_profile_repository_contract_v1") ||
            specifier.includes(
              "v2_firebase_voice_profile_repository_adapter_v1",
            ) ||
            specifier.includes(
              "v2_firebase_voice_targets_authenticated_input_v1",
            ) ||
            specifier.includes("v2_voice_tts_work_order_v1") ||
            specifier.includes("v2_openai_voice_tts_provider_v1") ||
            specifier.includes("v2_voice_mp3_codec_v1") ||
            specifier.includes("v2_firebase_voice_audio_persistence_v1") ||
            specifier.includes("v2_voice_audio_manifest_v1") ||
            specifier.includes("v2_firebase_voice_audio_manifest_adapter_v1") ||
            specifier.includes("v2_voice_audio_page_receipt_v1") ||
            specifier.includes(
              "v2_firebase_voice_audio_page_receipt_adapter_v1",
            ) ||
            specifier.includes("v2_voice_audio_episode_receipt_v1") ||
            specifier.includes(
              "v2_firebase_voice_audio_episode_receipt_adapter_v1",
            ) ||
            specifier.includes("v2_voice_native_decoder_page_receipt_v1") ||
            specifier.includes("v2_voice_native_decoder_episode_receipt_v1") ||
            specifier.includes("v2_voice_pcm_signal_observer_v1") ||
            specifier.includes("learning-v2-pcm-decoder") ||
            specifier.includes("v2_voice_pcm_signal_page_receipt_v1") ||
            specifier.includes("v2_voice_pcm_signal_episode_receipt_v1") ||
            specifier.includes("activity_catalog_v2") ||
            specifier.includes("voice_playback_policy_v1") ||
            specifier.includes("activity_session_package_v2") ||
            specifier.includes("local_evaluator_capsule_v1") ||
            specifier.includes("v2_activity_instances_package_v2") ||
            specifier.includes("v2_activity_session_projection") ||
            specifier.includes("v2_session_package_recovery_decision_v1")
          );
        });
      });
    expect(unauthorizedImports).toEqual([]);
  });

  it("contains no missing dependency or cycle in the compiler-produced DAG", () => {
    const plan = buildV2CanonicalSeasonPlan(trusted(input("full_season")));
    const positions = new Map(
      plan.stages.map((stage, index) => [stage.stageId, index]),
    );
    for (const [index, stage] of plan.stages.entries()) {
      for (const dependency of stage.dependsOn) {
        expect(positions.has(dependency)).toBe(true);
        expect(positions.get(dependency)).toBeLessThan(index);
      }
    }
  });

  it("carries no execution, publication, review or release authority", () => {
    const plan = buildV2CanonicalSeasonPlan(trusted());
    expect(plan).toMatchObject({
      executionAuthority: "none",
      publicationPolicy: "draft_only_no_consumer",
      runtimeConsumer: false,
      releaseEligible: false,
      releaseAuthority: false,
    });
    expect(plan).not.toHaveProperty("approved");
    expect(plan).not.toHaveProperty("reviewed");
  });
});
