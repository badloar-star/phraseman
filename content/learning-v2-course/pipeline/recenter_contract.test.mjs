import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  applicableRequirements,
  loadRequirementManifest,
  resolveRequirementSourcePath,
  validateRequirementManifest,
} from "./recenter_contract.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const desktopCodexRoot =
  process.env.PHRASEMAN_CODEX_START_DIR ||
  "C:/Users/badlo/OneDrive/Desktop/Codex";
const manifestFile = path.join(
  repoRoot,
  "content/learning-v2-course/curriculum/de/REQUIREMENT_MANIFEST_V1.json",
);

const load = () =>
  loadRequirementManifest(manifestFile, {
    repoRoot,
    desktopCodexRoot,
  });

const openingSourcePath =
  "factory/judgements/owner/2026-09-19_clear_lesson_opening_and_vibe.md";
const openingRequirementRows = [
  {
    id: "DE-OPENING-001",
    sourcePath: openingSourcePath,
    sourceSection: "Сцена сессии сразу ориентирует.",
    phase: ["PRE_AUTHOR", "POST_AUTHOR"],
    applicability: "always",
    severity: "HOLD",
    assertion:
      "PRE_AUTHOR фиксирует конкретную сцену и первые две ориентирующие фразы; POST_AUTHOR доказывает по exact RU+UK bytes, что ученик без догадок понимает место, участников или предметы и ближайшую практическую задачу, а урок не начинается с правила или описания конвейера.",
    family: "owner_judgements",
  },
  {
    id: "DE-OPENING-002",
    sourcePath: openingSourcePath,
    sourceSection: "Первое интро продолжает эту сцену.",
    phase: ["PRE_AUTHOR", "POST_AUTHOR"],
    applicability: "always",
    severity: "HOLD",
    assertion:
      "PRE_AUTHOR связывает первое интро с planned scene; POST_AUTHOR доказывает по exact RU+UK bytes, что новое немецкое слово показано вместе с понятным значением и сразу применено в той же конкретной сцене без универсальной подмены.",
    family: "owner_judgements",
  },
  {
    id: "DE-OPENING-003",
    sourcePath: openingSourcePath,
    sourceSection: "Польза фразы видна до разбора ловушки.",
    phase: ["PRE_AUTHOR", "POST_AUTHOR"],
    applicability: "always",
    severity: "HOLD",
    assertion:
      "PRE_AUTHOR планирует практическую причину произнести фразу до разбора; POST_AUTHOR доказывает по exact RU+UK bytes, что эта причина ясна раньше форм, звуков, порядка слов и диагностических ловушек.",
    family: "owner_judgements",
  },
  {
    id: "DE-OPENING-004",
    sourcePath: openingSourcePath,
    sourceSection: "Один проход без догадок.",
    phase: ["PRE_AUTHOR", "POST_AUTHOR"],
    applicability: "always",
    severity: "HOLD",
    assertion:
      "PRE_AUTHOR проектирует вход для одного чтения; POST_AUTHOR доказывает по exact RU+UK bytes, что обычный новичок может назвать сцену, задачу и нужную фразу без перечитывания, достраивания истории или знания грамматического термина.",
    family: "owner_judgements",
  },
  {
    id: "DE-OPENING-005",
    sourcePath: openingSourcePath,
    sourceSection: "Живой, спокойный голос.",
    phase: ["PRE_AUTHOR", "POST_AUTHOR"],
    applicability: "always",
    severity: "HOLD",
    assertion:
      "PRE_AUTHOR задаёт конкретный, тёплый и спокойный голос; POST_AUTHOR доказывает по exact RU+UK bytes отсутствие канцелярита и создание живого вайба точной ситуацией и деталью, а не приклеенной шуткой или театральностью.",
    family: "owner_judgements",
  },
  {
    id: "DE-OPENING-006",
    sourcePath: openingSourcePath,
    sourceSection: "Три интро образуют один вход в урок.",
    phase: ["PRE_AUTHOR", "POST_AUTHOR"],
    applicability: "always",
    severity: "HOLD",
    assertion:
      "PRE_AUTHOR связывает три intro targets одним местом, предметом и целью; POST_AUTHOR доказывает по exact RU+UK bytes, что страницы выполняют разные функции без повторной переориентации ученика.",
    family: "owner_judgements",
  },
  {
    id: "DE-OPENING-007",
    sourcePath: openingSourcePath,
    sourceSection: "## Независимая проверка",
    phase: ["PRE_AUTHOR"],
    applicability: "always",
    severity: "HOLD",
    assertion:
      "Свежий PRE_AUTHOR guardian до authoring независимо проверяет, что planned scene и три intro targets способны дать понятный вход в exact session; незакрытая проверка означает HOLD.",
    family: "owner_judgements",
  },
  {
    id: "DE-OPENING-008",
    sourcePath: openingSourcePath,
    sourceSection: "## Независимая проверка",
    phase: ["POST_AUTHOR"],
    applicability: "always",
    severity: "HOLD",
    assertion:
      "POST_AUTHOR проверяет только доступные exact RU+UK authored bytes на выполнение шести opening-правил и не утверждает, что последующие reader или progression judges уже запускались либо прошли.",
    family: "owner_judgements",
  },
  {
    id: "DE-OPENING-009",
    sourcePath: openingSourcePath,
    sourceSection: "## Независимая проверка",
    phase: ["RELEASE_PROJECTION"],
    applicability: "always",
    severity: "HOLD",
    assertion:
      "RELEASE_PROJECTION проверяет доступный current contentJudgeBundle с PASS-квитанциями judge_reader и judge_progression и отклоняет прежние PASS после любого изменения owner-verdict hash; это evidence release attempt, а не обещание будущей проверки.",
    family: "owner_judgements",
  },
];

const germanInteractionRequirements = [
  {
    id: "DE-INTERACTION-001",
    sourcePath: "repo/docs/v2/curriculum/de/OWNER_DECISIONS.md",
    sourceSection:
      "## Применимое общее решение владельца 2026-10-03 — одна немецкая фраза на одно взаимодействие",
    phase: ["PRE_AUTHOR", "POST_AUTHOR", "RELEASE_PROJECTION"],
    applicability: "always",
    severity: "HOLD",
    assertion:
      "Каждая немецкая learner-facing interaction проверяет ровно одну фразу целевого языка и один соответствующий target; context_gap_grammar имеет ровно один видимый ___ с одним естественным немецким fragment, assessed target/audio/voice не содержит ;, ； или |, correctText непуст и конкретен, а dictation target точно равен referenceAudio.transcript. Последовательность нескольких реплик сохраняется без потерь как отдельные interaction с собственными ID, evaluator/ответом, аудио и feedback; RU и UK сохраняют одинаковые число и порядок.",
    family: "interaction_granularity",
  },
  {
    id: "DE-INTERACTION-002",
    sourcePath: "factory/КОНСТИТУЦИЯ.md",
    sourceSection: "Assessed target/audio/voice содержит только целевой язык.",
    phase: ["PRE_AUTHOR", "POST_AUTHOR", "RELEASE_PROJECTION"],
    applicability: "always",
    severity: "HOLD",
    assertion:
      "Немецкие assessed target, audio и voice содержат только немецкий язык; локализованные служебные маркеры, подписи интерфейса и пояснения не допускаются внутри немецкой target-фразы или audio transcript.",
    family: "interaction_granularity",
  },
];

function germanInteractionContractIssues(manifest) {
  return germanInteractionRequirements.flatMap((expected) => {
    const actual = manifest.requirements.find(
      (item) => item.id === expected.id,
    );
    return JSON.stringify(actual) === JSON.stringify(expected)
      ? []
      : [`german_interaction_requirement_mismatch:${expected.id}`];
  });
}

function openingContractIssues(manifest) {
  const actualRows = manifest.requirements.filter(
    (item) => item.sourcePath === openingSourcePath,
  );
  return openingRequirementRows
    .flatMap((expected) => {
      const actual = actualRows.find((item) => item.id === expected.id);
      return JSON.stringify(actual) === JSON.stringify(expected)
        ? []
        : [`opening_requirement_mismatch:${expected.id}`];
    })
    .concat(
      actualRows.length === openingRequirementRows.length
        ? []
        : [`opening_requirement_count_mismatch:${actualRows.length}`],
    );
}

test("German requirement manifest is complete, explicit, and hash-current", () => {
  const manifest = load();
  assert.deepEqual(
    validateRequirementManifest(manifest, {
      repoRoot,
      desktopCodexRoot,
    }),
    [],
  );

  assert.equal(manifest.schemaVersion, "learning-v2-de-requirements.v1");
  assert.equal(manifest.targetLanguage, "de");
  assert.deepEqual(manifest.interfaceLocales, ["ru", "uk"]);

  const requiredFamilies = new Set([
    "desktop_codex",
    "constitution",
    "work_method",
    "owner_judgements",
    "exemplars",
    "exact_packet",
    "progression",
    "locales_ru_uk",
    "feedback",
    "diagnostics",
    "release",
    "owner_map_freshness",
    "english_isolation",
    "interaction_granularity",
  ]);
  const actualFamilies = new Set(
    manifest.requirements.map((item) => item.family),
  );
  for (const family of requiredFamilies) {
    assert.ok(
      actualFamilies.has(family),
      `missing_requirement_family:${family}`,
    );
  }
});

test("manifest rejects duplicate IDs, globs, unknown fields, and stale hashes", () => {
  const manifest = structuredClone(load());
  manifest.requirements.push({ ...manifest.requirements[0] });
  manifest.requirements[1].sourcePath = "factory/judgements/owner/*.md";
  manifest.requirements[2].unexpected = true;
  manifest.sourceDocuments[0].sha256 = "0".repeat(64);

  const issues = validateRequirementManifest(manifest, {
    repoRoot,
    desktopCodexRoot,
  }).join("\n");
  assert.match(issues, /duplicate_requirement_id/u);
  assert.match(issues, /source_path_glob_forbidden/u);
  assert.match(issues, /unknown_requirement_field:unexpected/u);
  assert.match(issues, /source_hash_stale/u);
});

test("phase and applicability filtering is closed and deterministic", () => {
  const manifest = load();
  const preVoice = applicableRequirements(manifest, {
    phase: "PRE_AUTHOR",
    applicability: "voice",
  });
  assert.ok(preVoice.length > 0);
  assert.ok(preVoice.every((item) => item.phase.includes("PRE_AUTHOR")));
  assert.ok(
    preVoice.every((item) => ["always", "voice"].includes(item.applicability)),
  );

  assert.throws(
    () =>
      applicableRequirements(manifest, {
        phase: "UNKNOWN",
        applicability: "voice",
      }),
    /recenter_phase_unknown:UNKNOWN/u,
  );
});

test("latest owner override applies lexical growth and a new situation to every session type", () => {
  const manifest = load();
  const lexical = manifest.requirements.find(
    (item) => item.id === "DE-PROGRESSION-001",
  );
  const situation = manifest.requirements.find(
    (item) => item.id === "DE-PROGRESSION-002",
  );

  assert.equal(lexical?.applicability, "always");
  assert.match(lexical?.assertion || "", /1–5/u);
  assert.equal(situation?.applicability, "always");
  assert.match(situation?.assertion || "", /нов/u);
});

test("mandatory German authorities are content-addressed and every source has a requirement row", () => {
  const manifest = load();
  const sourcePaths = new Set(
    manifest.sourceDocuments.map((item) => item.sourcePath),
  );
  for (const required of [
    "repo/AGENTS.md",
    "repo/docs/superpowers/specs/2026-09-19-learning-v2-german-grammar-first-course-design.md",
    "repo/docs/v2/curriculum/de/TASK_PACKET_STAGE_0.md",
    "repo/docs/v2/curriculum/de/RESEARCH_DOSSIER.ru.md",
    "repo/docs/v2/curriculum/de/SOURCE_EVIDENCE_LEDGER.md",
    "repo/docs/v2/curriculum/de/OWNER_DECISIONS.md",
    "repo/docs/v2/curriculum/de/LINGUISTIC_REVIEW_RECEIPT_2026-10-04.md",
    "repo/modules/learning-v2/curriculum/de/research_authority_de_v1.ts",
    "factory/pipeline/prompts/judge_recenter_pre.md",
    "factory/pipeline/prompts/judge_recenter_post.md",
    "factory/pipeline/prompts/judge_recenter_release.md",
    "factory/judgements/owner/2026-09-19_clear_lesson_opening_and_vibe.md",
  ])
    assert.ok(
      sourcePaths.has(required),
      `missing_authority_source:${required}`,
    );

  const usedPaths = new Set(
    manifest.requirements.map((item) => item.sourcePath),
  );
  for (const sourcePath of sourcePaths) {
    assert.ok(
      usedPaths.has(sourcePath),
      `source_without_requirement:${sourcePath}`,
    );
  }
});

test("clear lesson opening owner verdict has exact phase-safe semantic rows", () => {
  const manifest = load();

  assert.ok(
    manifest.sourceDocuments.some(
      (item) => item.sourcePath === openingSourcePath,
    ),
    `missing_authority_source:${openingSourcePath}`,
  );
  assert.deepEqual(openingContractIssues(manifest), []);
});

test("every clear-opening semantic row fails closed on a plausible non-empty mutation", () => {
  const manifest = load();
  for (const expected of openingRequirementRows) {
    const broken = structuredClone(manifest);
    const row = broken.requirements.find((item) => item.id === expected.id);
    row.assertion = `${row.assertion} Будущие проверки считаются уже пройденными.`;
    assert.deepEqual(
      openingContractIssues(broken),
      [`opening_requirement_mismatch:${expected.id}`],
      expected.id,
    );
  }
});

test("German one-phrase interaction owner decision is exact and language-isolated", () => {
  const manifest = load();
  assert.equal(manifest.requirements.length, 102);
  assert.deepEqual(germanInteractionContractIssues(manifest), []);
  assert.ok(
    !manifest.sourceDocuments.some(
      (item) =>
        item.sourcePath ===
        "factory/judgements/owner/2026-10-03_single_phrase_per_interaction.md",
    ),
    "German manifest must not import the English owner judgement source",
  );
});

test("German one-phrase interaction contract fails closed on weakening and source drift", () => {
  const manifest = load();
  const mutations = [
    (row) => {
      row.phase = ["PRE_AUTHOR", "POST_AUTHOR"];
    },
    (row) => {
      row.applicability = "release";
    },
    (row) => {
      row.sourcePath =
        "factory/judgements/owner/2026-10-03_single_phrase_per_interaction.md";
    },
    (row) => {
      row.assertion = row.assertion.replace(
        "RU и UK сохраняют одинаковые число и порядок.",
        "",
      );
    },
    (row) => {
      row.assertion = row.assertion.replace(
        "correctText непуст и конкретен",
        "correctText может быть общей заглушкой",
      );
    },
    (row) => {
      row.assertion = row.assertion.replace(
        "dictation target точно равен referenceAudio.transcript",
        "dictation может расходиться с audio",
      );
    },
    (row) => {
      row.assertion = row.assertion.replace(";, ； или |", "|");
    },
  ];
  for (const mutate of mutations) {
    const broken = structuredClone(manifest);
    const row = broken.requirements.find(
      (item) => item.id === germanInteractionRequirements[0].id,
    );
    assert.ok(row);
    mutate(row);
    assert.deepEqual(germanInteractionContractIssues(broken), [
      "german_interaction_requirement_mismatch:DE-INTERACTION-001",
    ]);
  }
});

test("German target-language-only interaction contract fails closed on weakening and English substitution", () => {
  const manifest = load();
  const mutations = [
    (row) => {
      row.phase = ["PRE_AUTHOR", "POST_AUTHOR"];
    },
    (row) => {
      row.applicability = "release";
    },
    (row) => {
      row.sourcePath =
        "factory/judgements/owner/2026-10-03_single_phrase_per_interaction.md";
    },
    (row) => {
      row.assertion = row.assertion.replace(
        "содержат только немецкий язык",
        "могут содержать локализованные маркеры",
      );
    },
    (row) => {
      row.assertion = row.assertion.replace(
        "не допускаются внутри немецкой target-фразы или audio transcript",
        "допускаются внутри немецкой target-фразы или audio transcript",
      );
    },
  ];
  for (const mutate of mutations) {
    const broken = structuredClone(manifest);
    const row = broken.requirements.find(
      (item) => item.id === germanInteractionRequirements[1].id,
    );
    assert.ok(row);
    mutate(row);
    assert.deepEqual(germanInteractionContractIssues(broken), [
      "german_interaction_requirement_mismatch:DE-INTERACTION-002",
    ]);
  }
});

test("sourceSection is an exact locator present in the cited source", () => {
  const manifest = load();
  for (const requirement of manifest.requirements) {
    const absolutePath = resolveRequirementSourcePath(requirement.sourcePath, {
      repoRoot,
      desktopCodexRoot,
    });
    const text = fs.readFileSync(absolutePath, "utf8");
    assert.ok(
      text.includes(requirement.sourceSection),
      `source_section_missing:${requirement.id}:${requirement.sourceSection}`,
    );
  }

  const broken = structuredClone(manifest);
  broken.requirements[0].sourceSection = "SECTION THAT DOES NOT EXIST";
  assert.match(
    validateRequirementManifest(broken, {
      repoRoot,
      desktopCodexRoot,
    }).join("\n"),
    /source_section_missing/u,
  );
});

test("independent high-risk obligations have independent stable IDs", () => {
  const manifest = load();
  const byId = new Map(manifest.requirements.map((item) => [item.id, item]));
  for (const id of [
    "DE-PROGRESSION-005",
    "DE-LISTEN-001",
    "DE-LISTEN-002",
    "DE-BLUEPRINT-001",
    "DE-BLUEPRINT-002",
    "DE-BLUEPRINT-003",
    "DE-BLUEPRINT-004",
    "DE-BLUEPRINT-005",
    "DE-BLUEPRINT-006",
    "DE-BLUEPRINT-007",
    "DE-BLUEPRINT-008",
    "DE-RELEASE-004",
    "DE-RELEASE-005",
    "DE-RELEASE-006",
    "DE-RELEASE-007",
    "DE-RELEASE-008",
    "DE-RELEASE-009",
    "DE-RELEASE-010",
    "DE-RELEASE-011",
  ])
    assert.ok(byId.has(id), `missing_independent_requirement:${id}`);

  assert.equal(byId.get("DE-LISTEN-001")?.applicability, "always");
  assert.equal(
    byId.get("DE-LISTEN-001")?.sourcePath,
    "factory/judgements/owner/2026-09-19_every_session_progression_and_exact_audio_meaning.md",
  );
  assert.equal(byId.get("DE-LISTEN-002")?.applicability, "always");
  assert.equal(byId.get("DE-MOCKUP-001")?.applicability, "always");
  assert.deepEqual(byId.get("DE-MOCKUP-001")?.phase, ["RELEASE_PROJECTION"]);
  assert.ok(
    applicableRequirements(manifest, {
      phase: "RELEASE_PROJECTION",
      applicability: "release",
    }).some((item) => item.id === "DE-MOCKUP-001"),
  );
});
