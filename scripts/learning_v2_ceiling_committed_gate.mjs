#!/usr/bin/env node
/**
 * Ворота: потолок Learning V2 в рабочей папке = закоммиченному.
 *
 * зачем (координатор 15.10 ночь, разбор Сайта a0a83a309): EAS собирает РАБОЧУЮ папку, а не HEAD. Незакоммиченный
 * прогон сторожа доступности (UPDATE_LEARNING_V2_AVAILABILITY) переписывал потолок на 145 — с ним в сборку уехали бы
 * занятия без квитанций прослушивания, либо ворота паритета упали бы на сервере. Потолок меняется ТОЛЬКО сторожем
 * и ТОЛЬКО коммитом; здесь — стоп, если в папке лежит другое число.
 * (Набор записей сборки и таблица голосов сверялись здесь до 22.10 — удалены вместе с записями, «только TTS».)
 *
 * Без git (сервер EAS получает архив без .git) — проверка невозможна: громкое предупреждение и код 0,
 * настоящая проверка — локально до запуска EAS (release:precheck, репетиция сборки).
 * Логи: [V2-CEILING-GATE].
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOG = "[V2-CEILING-GATE]";
// зачем (владелец 22.10, «только TTS»): набор записей сборки и таблица голосов удалены вместе с записями — сверяем потолок.
const FILES = [
  "app/learning_v2_bundle_availability_v1.generated.ts",
];

// зачем (сторож store_release_gate_levers): в стор-сборке, где Learning V2 вырезан router.ctx.js, потолок V2 сборку не
// касается — тот же пропуск, что у остальных ворот V2 (решение только при доказанном вырезании всех маршрутов).
const surface = await import("./store_release_surface.mjs").catch((error) => {
  console.warn(`${LOG} помощник поверхности стор-сборки не загрузился (${error instanceof Error ? error.message : String(error)}) — ворота строгие`);
  return null;
});
if (surface && surface.announceLearningV2StoreSkip(LOG, ROOT)) process.exit(0);

const inGit = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: ROOT, encoding: "utf8" });
if (inGit.status !== 0 || inGit.stdout.trim() !== "true") {
  console.warn(`${LOG} WARNING: не git-рабочая папка (${(inGit.stderr || "").trim().slice(0, 120) || "нет .git"}) — сверка потолка с коммитом пропущена (код 0)`);
  process.exit(0);
}

const drifted = [];
for (const file of FILES) {
  const diff = spawnSync("git", ["diff", "--quiet", "HEAD", "--", file], { cwd: ROOT });
  // 0 — совпадает с HEAD, 1 — отличается, иное — ошибка git (тоже стоп: не можем доказать равенство).
  if (diff.status !== 0) drifted.push(`${file} (git diff код ${diff.status})`);
}
const committed = spawnSync("git", ["show", `HEAD:${FILES[0]}`], { cwd: ROOT, encoding: "utf8" });
const ceiling = /LEARNING_V2_BUNDLE_CONTIGUOUS_CEILING_V1 = (\d+);/u.exec(committed.stdout ?? "")?.[1] ?? "нет";

if (drifted.length > 0) {
  console.error(`${LOG} ОТКАЗ: в рабочей папке потолок НЕ равен закоммиченному (закоммиченный потолок: ${ceiling}).`);
  for (const line of drifted) console.error(`${LOG}   отличается: ${line}`);
  console.error(`${LOG} Что делать: вернуть файлы к HEAD (это сгенерированные артефакты) или закоммитить осознанно — потолок меняется только сторожем доступности и только коммитом.`);
  process.exit(1);
}
console.log(`${LOG} OK: потолок ${ceiling} в рабочей папке = HEAD`);
