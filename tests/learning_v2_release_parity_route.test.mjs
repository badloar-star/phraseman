import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import ignore from "ignore";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const releasePrecheck = fs.readFileSync("scripts/release_precheck.mjs", "utf8");
const updateReleaseGate = fs.readFileSync("scripts/update_release_gate.mjs", "utf8");
// зачем (план Б R1, 7747a43d8): сборка и precheck зовут гейты №3/№4 через обёртку плана Б; без PHRASEMAN_R1_HIDE_V2 она
// запускает оба гейта (сначала выпуск = исходник), при плане Б и потолке 0 — «НЕПРИМЕНИМО».
const planBWrapper = fs.readFileSync("scripts/learning_v2_plan_b_gates.mjs", "utf8");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    ...options,
  });
  assert.equal(
    result.error,
    undefined,
    `failed to start ${command}: ${result.error?.message ?? "unknown error"}`,
  );
  return result;
}

function writeExecutable(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
  if (process.platform !== "win32") fs.chmodSync(filePath, 0o755);
}

function createCommandShim(binDir, name, shimPath) {
  if (process.platform === "win32") {
    writeExecutable(
      path.join(binDir, `${name}.cmd`),
      `@echo off\r\n"${process.execPath}" "${shimPath}" ${name} %*\r\n`,
    );
    return;
  }
  writeExecutable(
    path.join(binDir, name),
    `#!/bin/sh\nexec "${process.execPath}" "${shimPath}" ${name} "$@"\n`,
  );
}

function createRouteFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-release-route-"));
  const fixture = path.join(root, "project");
  const scriptsDir = path.join(fixture, "scripts");
  const binDir = path.join(fixture, "node_modules", ".bin");
  const logPath = path.join(root, "commands.log");
  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.mkdirSync(binDir, { recursive: true });

  fs.writeFileSync(
    path.join(fixture, "package.json"),
    JSON.stringify({
      name: "learning-v2-release-route-fixture",
      private: true,
      scripts: {
        "learning-v2:release-parity-gate": packageJson.scripts["learning-v2:release-parity-gate"],
        "release:keys": packageJson.scripts["release:keys"],
        "update:gate": packageJson.scripts["update:gate"],
        "eas:update:production": packageJson.scripts["eas:update:production"],
        "eas-build-post-install": packageJson.scripts["eas-build-post-install"],
      },
    }, null, 2),
    "utf8",
  );
  fs.copyFileSync(
    path.resolve("scripts/update_release_gate.mjs"),
    path.join(scriptsDir, "update_release_gate.mjs"),
  );

  fs.copyFileSync(
    path.resolve("scripts/learning_v2_plan_b_gates.mjs"),
    path.join(scriptsDir, "learning_v2_plan_b_gates.mjs"),
  );
  // Гейт выпуска в цепочке сборки идёт через обёртку (node, не npm run) — заглушка пишет в журнал и падает.
  fs.writeFileSync(
    path.join(scriptsDir, "learning_v2_release_parity_gate.mjs"),
    `import { appendFileSync } from "node:fs";\nappendFileSync(process.env.ROUTE_TEST_LOG, "stub learning_v2_release_parity_gate.mjs\\n");\nprocess.exit(process.env.ROUTE_TEST_FORCE_PARITY_SUCCESS === "1" ? 0 : 42);\n`,
    "utf8",
  );

  for (const name of [
    "deploy_lock_guard.mjs",
    "eas_production_version_gate.mjs",
    "learning_v2_audio_coverage_gate.mjs",
    "store_route_reachability.mjs",
    "visual_parity_gate.mjs",
  ]) {
    fs.writeFileSync(
      path.join(scriptsDir, name),
      `import { appendFileSync } from "node:fs";\nappendFileSync(process.env.ROUTE_TEST_LOG, "stub ${name}\\n");\n`,
      "utf8",
    );
  }

  fs.writeFileSync(
    path.join(fixture, ".release-card.md"),
    [
      "## Type",
      "fix",
      "## Goal",
      "Prove release routing.",
      "## Allowed changes",
      "Test fixture only.",
      "## Forbidden changes",
      "No publish.",
      "## Risk level",
      "Test-only.",
      "## Manual tests",
      "Not applicable.",
      "",
    ].join("\n"),
    "utf8",
  );

  const shimPath = path.join(root, "route-command-shim.mjs");
  fs.writeFileSync(
    shimPath,
    `import { appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const [command, ...args] = process.argv.slice(2);
appendFileSync(process.env.ROUTE_TEST_LOG, \`${"${command}"} ${"${args.join(\" \")}"}\\n\`);

if (command === "npm" && args[0] === "run" && args[1] === "update:gate" && process.env.ROUTE_TEST_INSIDE_UPDATE_GATE !== "1") {
  const result = spawnSync(process.execPath, [process.env.npm_execpath, "run", "update:gate"], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: { ...process.env, ROUTE_TEST_INSIDE_UPDATE_GATE: "1" },
  });
  process.exit(result.status ?? 1);
}

if (command === "npm" && args[0] === "run" && args[1] === "learning-v2:release-parity-gate") {
  process.exit(process.env.ROUTE_TEST_FORCE_PARITY_SUCCESS === "1" ? 0 : 42);
}

process.exit(0);
`,
    "utf8",
  );

  for (const command of ["npm", "npx", "cross-env", "eas"]) {
    createCommandShim(binDir, command, shimPath);
  }

  run("git", ["init", "--quiet"], { cwd: fixture });
  run("git", ["config", "user.email", "route-test@example.invalid"], { cwd: fixture });
  run("git", ["config", "user.name", "Release Route Test"], { cwd: fixture });
  fs.mkdirSync(path.join(fixture, ".git", "empty-hooks"), { recursive: true });
  run("git", ["config", "core.hooksPath", ".git/empty-hooks"], { cwd: fixture });
  run("git", ["add", "."], { cwd: fixture });
  const commit = run("git", ["commit", "--quiet", "--no-verify", "-m", "route fixture"], { cwd: fixture });
  assert.equal(commit.status, 0, commit.stderr);

  const env = {
    ...process.env,
    PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ""}`,
    PHRASEMAN_ALLOW_PROTECTED_BRANCH: "1",
    ROUTE_TEST_LOG: logPath,
  };
  if (process.env.ROUTE_TEST_FORCE_PARITY_SUCCESS === "1") {
    env.ROUTE_TEST_FORCE_PARITY_SUCCESS = "1";
  }

  return {
    fixture,
    logPath,
    env,
    cleanup() {
      const relative = path.relative(os.tmpdir(), root);
      assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
      fs.rmSync(root, { recursive: true, force: true });
    },
  };
}

function runNpmRoute(fixture, scriptName) {
  const bundledNpmCli = path.join(
    path.dirname(process.execPath),
    "node_modules",
    "npm",
    "bin",
    "npm-cli.js",
  );
  const npmCli = process.env.npm_execpath || bundledNpmCli;
  assert.ok(fs.existsSync(npmCli), `real npm CLI not found at ${npmCli}`);
  return run(process.execPath, [npmCli, "run", scriptName], {
    cwd: fixture.fixture,
    env: fixture.env,
  });
}

function readRouteLog(fixture) {
  return fs.existsSync(fixture.logPath)
    ? fs.readFileSync(fixture.logPath, "utf8").trim().split(/\r?\n/u)
    : [];
}

test("exposes one canonical Learning V2 parity command", () => {
  assert.equal(
    packageJson.scripts["learning-v2:release-parity-gate"],
    "node scripts/learning_v2_release_parity_gate.mjs",
  );
});

test("native build post-install blocks stale Learning V2 app content", () => {
  assert.match(
    packageJson.scripts["eas-build-post-install"],
    /(?:^|&&\s*)node scripts\/learning_v2_plan_b_gates\.mjs(?:\s*&&|$)/u,
  );
  assert.match(planBWrapper, /GATES\s*=\s*\['scripts\/learning_v2_release_parity_gate\.mjs'/u);
});

test("local release precheck blocks stale Learning V2 app content", () => {
  assert.match(
    releasePrecheck,
    /script:\s*['"]scripts\/learning_v2_plan_b_gates\.mjs['"]/u,
  );
  assert.match(planBWrapper, /GATES\s*=\s*\['scripts\/learning_v2_release_parity_gate\.mjs'/u);
  assert.match(releasePrecheck, /if\s*\(result\.status\s*!==\s*0\)[\s\S]*?failed\s*\+=\s*1/u);
  assert.match(releasePrecheck, /if\s*\(failed\s*>\s*0\)[\s\S]*?process\.exit\(1\)/u);
});

test("production update gate blocks stale Learning V2 app content", () => {
  assert.match(
    updateReleaseGate,
    /['"]Learning V2 release parity['"][\s\S]{0,160}['"]learning-v2:release-parity-gate['"]/u,
  );
  assert.match(updateReleaseGate, /if\s*\(!run\(label, command, commandArgs\)\)\s*process\.exit\(1\)/u);
});

test("the routed gate owns the source-to-release semantic check", () => {
  const gate = fs.readFileSync("scripts/learning_v2_release_parity_gate.mjs", "utf8");
  assert.match(gate, /build_release\.mjs/u);
  assert.match(gate, /--check-source-release/u);
  assert.match(gate, /locales\s*=\s*\["ru",\s*"uk"\]/u);
  assert.match(gate, /"--locales"[\s\S]{0,80}locales\.join/u);
});

test("the routed production gate blocks on release-quality evidence", () => {
  const gate = fs.readFileSync("scripts/learning_v2_release_parity_gate.mjs", "utf8");
  assert.match(gate, /const qualityResult\s*=\s*validateReleaseQuality\(\)/u);
  assert.match(gate, /printQualityResult\(qualityResult\)/u);
  assert.match(
    gate,
    /scopeResult\.ready\s*&&\s*semanticResult\.ready\s*&&\s*qualityResult\.ready\s*&&\s*copyResult\.ready/u,
  );
});

test("the EAS archive contains the parity gate while omitted authorities fail closed at runtime", () => {
  const easArchive = ignore().add(fs.readFileSync(".easignore", "utf8"));
  assert.equal(easArchive.ignores("scripts/learning_v2_release_parity_gate.mjs"), false);
  assert.equal(easArchive.ignores("scripts/learning_v2_plan_b_gates.mjs"), false);
  assert.equal(easArchive.ignores("scripts/unrelated-authoring-tool.mjs"), true);
  assert.equal(easArchive.ignores("content/learning-v2-course/release/en/l01/s01/learner.json"), true);
  assert.equal(easArchive.ignores("assets/audio/learning-v2/factory-production-v1/manifest.json"), true);
});

test("the packaged EAS gate emits a deliberate release-quality block without omitted authorities", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-eas-archive-"));
  const fixture = path.join(root, "project");
  const scriptsDir = path.join(fixture, "scripts");
  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.copyFileSync(
    path.resolve("scripts/learning_v2_release_parity_gate.mjs"),
    path.join(scriptsDir, "learning_v2_release_parity_gate.mjs"),
  );

  try {
    const result = run(process.execPath, ["scripts/learning_v2_release_parity_gate.mjs"], {
      cwd: fixture,
    });
    const output = `${result.stdout}\n${result.stderr}`;

    assert.equal(result.status, 1, output);
    assert.match(output, /Learning V2 English release identity scope: BLOCKED/u);
    assert.match(output, /SOURCE_ROOT_MISSING/u);
    assert.match(output, /Learning V2 release quality evidence: BLOCKED/u);
    assert.match(output, /RELEASE_QUALITY_ROOT_MISSING/u);
    assert.doesNotMatch(output, /MODULE_NOT_FOUND/u);
  } finally {
    const relative = path.relative(os.tmpdir(), root);
    assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("production OTA stops before deploy and publish when Learning V2 parity fails", () => {
  const fixture = createRouteFixture();
  try {
    const result = runNpmRoute(fixture, "eas:update:production");
    const commands = readRouteLog(fixture);

    assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.ok(commands.includes("npm run update:gate"), commands.join("\n"));
    assert.ok(commands.includes("npm run learning-v2:release-parity-gate"), commands.join("\n"));
    assert.ok(!commands.includes("stub deploy_lock_guard.mjs"), commands.join("\n"));
    assert.ok(!commands.some((line) => line.startsWith("cross-env ")), commands.join("\n"));
    assert.ok(!commands.some((line) => line.startsWith("eas ")), commands.join("\n"));
  } finally {
    fixture.cleanup();
  }
});

test("EAS post-install stops before later build gates when Learning V2 parity fails", () => {
  const fixture = createRouteFixture();
  try {
    const result = runNpmRoute(fixture, "eas-build-post-install");
    const commands = readRouteLog(fixture);

    assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.ok(commands.includes("npm run release:keys"), commands.join("\n"));
    assert.ok(commands.includes("stub eas_production_version_gate.mjs"), commands.join("\n"));
    assert.ok(commands.includes("stub learning_v2_release_parity_gate.mjs"), commands.join("\n"));
    // обёртка запускает оба гейта V2 (все причины сразу), но цепочка дальше не идёт
    assert.ok(!commands.includes("stub store_route_reachability.mjs"), commands.join("\n"));
    assert.ok(!commands.includes("stub visual_parity_gate.mjs"), commands.join("\n"));
  } finally {
    fixture.cleanup();
  }
});
