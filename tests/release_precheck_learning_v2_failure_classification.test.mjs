import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PRECHECK = path.resolve(HERE, "../scripts/release_precheck.mjs");

test("Learning V2 parity failure cannot masquerade as a missing EAS secret", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "phraseman-release-precheck-"));
  t.after(() => fs.rmSync(root, { force: true, recursive: true }));
  const scripts = path.join(root, "scripts");
  fs.mkdirSync(scripts, { recursive: true });
  fs.copyFileSync(PRECHECK, path.join(scripts, "release_precheck.mjs"));
  // зачем (план Б R1, 7747a43d8): precheck зовёт гейты V2 через обёртку — копируем настоящую, она зовёт заглушки ниже.
  fs.copyFileSync(path.resolve(HERE, "../scripts/learning_v2_plan_b_gates.mjs"), path.join(scripts, "learning_v2_plan_b_gates.mjs"));
  fs.writeFileSync(path.join(root, "app.json"), JSON.stringify({
    expo: { android: { versionCode: 1 }, ios: { buildNumber: "1" } },
  }));
  fs.writeFileSync(path.join(root, "eas.json"), JSON.stringify({ build: { production: { env: {} } } }));

  for (const script of [
    "release_keys_gate.mjs",
    "eas_production_version_gate.mjs",
    "learning_v2_audio_coverage_gate.mjs",
    "visual_parity_gate.mjs",
    // зачем (12.10): гейт переходов на вырезанные маршруты появился в precheck 10.10 — без заглушки копия падала
    // «модуль не найден», и сторож считал 2 провала вместо 1 (красный не по своей причине).
    "store_route_reachability.mjs",
    // зачем (12.10): гейт dev-строк стор-бандла подключён в precheck — без заглушки копия падала бы «модуль не найден».
    "store_bundle_dev_strings_gate.mjs",
    // зачем (Ядро 12.10): гейт стор-заглушек dev-модулей подключён в precheck — без заглушки копия падала бы «модуль не найден».
    "store_release_stubs_gate.mjs",
    // зачем (Ядро 12.10): гейт пакетов фразы дня (.dpk) подключён в precheck — без заглушки копия падала бы «модуль не найден».
    "daily_phrase_dpk_assets_gate.mjs",
  ]) {
    fs.writeFileSync(path.join(scripts, script), "process.exitCode = 0;\n");
  }
  fs.writeFileSync(path.join(scripts, "learning_v2_release_parity_gate.mjs"), [
    'console.error("source_release_parity: EXPO_PUBLIC_RC_IOS is missing for production");',
    "process.exitCode = 1;",
  ].join("\n"));

  const run = spawnSync(process.execPath, [path.join(scripts, "release_precheck.mjs")], {
    cwd: root,
    encoding: "utf8",
  });
  const output = `${run.stdout}\n${run.stderr}`;

  assert.equal(run.status, 1, output);
  assert.match(output, /source_release_parity/u);
  assert.match(output, /ОТКАЗ: не прошло гейтов — 1/u);
  assert.doesNotMatch(output, /пропущено: значение живёт в секретах EAS/u);
});
