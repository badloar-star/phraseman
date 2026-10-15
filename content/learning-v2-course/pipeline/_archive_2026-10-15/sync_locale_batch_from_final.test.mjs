import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-batch-sync-"));
const session = path.join(root, "sessions/en/l01/s01");
fs.mkdirSync(session, { recursive: true });
fs.mkdirSync(path.join(root, "pipeline"), { recursive: true });
fs.copyFileSync(path.join(import.meta.dirname, "sync_locale_batch_from_final.mjs"), path.join(root, "pipeline/sync_locale_batch_from_final.mjs"));
fs.writeFileSync(path.join(session, "final.uk.md"), "# Перевірка\n\n**1 · Завдання**\n");
fs.writeFileSync(path.join(session, "locales_batch.md"), "старий текст\n");
const run = spawnSync(process.execPath, [path.join(root, "pipeline/sync_locale_batch_from_final.mjs"), "--root", root, "--scope", "en/l01/s01", "--write"], { encoding: "utf8" });
assert.equal(run.status, 0, run.stdout + run.stderr);
assert.equal(fs.readFileSync(path.join(session, "locales_batch.md"), "utf8"), "===LOCALE: uk===\n# Перевірка\n\n**1 · Завдання**\n");
fs.rmSync(root, { recursive: true, force: true });
