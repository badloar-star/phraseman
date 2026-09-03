#!/usr/bin/env node
// Пакетный запуск конвейера: пишет сессии подряд, сам собирает релиз и макет.
//
// зачем (владелец, 03.09): «дальше продолжай писать сессии» — нужен один
// запуск на несколько сессий, а не ручной вызов на каждую. Конвейер уже умеет
// ждать сброса лимита подписки, поэтому пакет переживает ночь.
//
// Запуск: node run_batch.mjs --from en/l01/s05 --count 4 [--backend claude]
//
// Логи: префикс [BATCH]. Каждая сессия — свой run.log рядом с ней.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const LOG = (...a) => console.log("[BATCH]", new Date().toLocaleTimeString(), ...a);

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const FROM = opt("from", null);
const COUNT = Number(opt("count", "1"));
const BACKEND = opt("backend", "claude");

if (!FROM) { LOG("ранний выход: нужен --from en/l01/s05"); process.exit(2); }
const m = /^([a-z]{2})\/l(\d{2})\/s(\d{2})$/.exec(FROM);
if (!m) { LOG(`ранний выход: --from ожидает en/l01/s05, получено ${FROM}`); process.exit(2); }
const [, lang, lesson] = m;
const first = Number(m[3]);

const node = (script, extra) => {
  const r = spawnSync(process.execPath, [path.join(HERE, script), ...extra], {
    encoding: "utf8", cwd: HERE, maxBuffer: 64 * 1024 * 1024, stdio: "inherit",
  });
  if (r.error) { LOG(`✗ ${script}: ${r.error.message}`); return false; }
  if (r.status !== 0) { LOG(`✗ ${script} завершился с кодом ${r.status}`); return false; }
  return true;
};

const done = [];
const failed = [];
for (let i = 0; i < COUNT; i++) {
  const n = String(first + i).padStart(2, "0");
  const id = `${lang}/l${lesson}/s${n}`;
  const dir = path.join(ROOT, "sessions", id);
  const finalRu = path.join(dir, "final.ru.md");

  if (fs.existsSync(finalRu) && !fs.existsSync(path.join(dir, "ЗАБРАКОВАНА.txt"))) {
    LOG(`${id}: final.ru.md уже есть — пропуск`);
    done.push(id);
    continue;
  }
  LOG(`=== ${id}: пишу (${i + 1} из ${COUNT}) ===`);
  const t0 = Date.now();
  if (!node("run.mjs", ["full", "--session", id, "--backend", BACKEND])) {
    LOG(`${id}: конвейер не завершился — останавливаю пакет, чтобы не множить брак`);
    failed.push(id);
    break;
  }
  LOG(`${id}: написана за ${Math.round((Date.now() - t0) / 60000)} мин`);

  // статус: если судья дал BLOCK, конвейер не локализует и пишет это в status.json
  const st = path.join(dir, "status.json");
  if (fs.existsSync(st)) {
    try {
      const s = JSON.parse(fs.readFileSync(st, "utf8"));
      if (s.blocked?.length) { LOG(`${id}: BLOCK от ${s.blocked.join(", ")} — в релиз не пойдёт`); failed.push(id); continue; }
    } catch (e) { LOG(`${id}: status.json нечитаем (${e.message})`); }
  }
  if (node("build_release.mjs", ["--session", id, "--locales", "ru,uk"])) {
    done.push(id);
    // зачем (владелец, 03.09): «после добавления новой сессии всегда обновляй
    // макет, чтобы я имел возможность сразу проверять». Пересборка макета —
    // чистый скрипт без вызовов модели, ~1 секунда, поэтому после КАЖДОЙ
    // сессии, а не раз в десять.
    LOG(`${id}: обновляю макет — можно проверять`);
    node("build_mockup.mjs", ["--out", path.join(ROOT, "mockup", "index.html")]);
  } else failed.push(id);
}
LOG(`ГОТОВО. Написано: ${done.length ? done.join(", ") : "—"}${failed.length ? " | не прошли: " + failed.join(", ") : ""}`);
