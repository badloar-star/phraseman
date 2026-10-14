#!/usr/bin/env node
/**
 * Гейты Learning V2 №3 (выпуск = исходник) и №4 (озвучка встроенных занятий) — с режимом «план Б».
 *
 * зачем (владелец 13.10 11:00, координатор; docs/phraseman-2.0/R1_PLAN_B_HIDE_V2.md): если к 15.10 12:00 гейты №3/№4 не зелёные,
 * Learning V2 в первом выпуске скрыт. Тогда эти гейты неприменимы — но только если V2 ДЕЙСТВИТЕЛЬНО скрыт: потолок выпущенных
 * занятий в бандле = 0 (вкладка V2 и маршрут learning-v2/course при нуле не открываются, lessons.tsx startLessonsPage).
 * Скрытость проверяется по сгенерированному файлу, а не принимается на веру.
 *
 *   без PHRASEMAN_R1_HIDE_V2      — как раньше: запускаются оба гейта, красный гейт = красный итог;
 *   PHRASEMAN_R1_HIDE_V2=1, потолок 0   — «НЕПРИМЕНИМО», код 0;
 *   PHRASEMAN_R1_HIDE_V2=1, потолок > 0 — ОТКАЗ: план Б заявлен, а занятия V2 в бандле;
 *   PHRASEMAN_R1_HIDE_V2=1, рубильник LEARNING_V2_HIDDEN = true (app/learning_v2_visibility_switch.ts) — «НЕПРИМЕНИМО»
 *     при любом потолке: рубильник закрывает каждый вход в V2 (сторож tests/learning_v2_visibility_switch_contract.test.ts).
 *     зачем (координатор 14.10): если Codex перегенерирует потолок выше 0, а владелец 15.10 скажет «скрыть», план Б
 *     исполняется одной строкой рубильника, без отката артефакта Codex.
 *
 * Вызывается из scripts/release_precheck.mjs и package.json → eas-build-post-install (сервер EAS).
 */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const TAG = '[V2-PLAN-B]';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const GENERATED = new URL('../app/learning_v2_bundle_availability_v1.generated.ts', import.meta.url);
const SWITCH = new URL('../app/learning_v2_visibility_switch.ts', import.meta.url);
const GATES = ['scripts/learning_v2_release_parity_gate.mjs', 'scripts/learning_v2_audio_coverage_gate.mjs'];

export function readBundleCeiling(source) {
  const match = /LEARNING_V2_BUNDLE_CONTIGUOUS_CEILING_V1\s*=\s*(\d+)/.exec(source);
  return match ? Number(match[1]) : null;
}

/** Положение рубильника «V2 скрыт»: true / false, или null, если строка не найдена (тогда рубильник не засчитывается). */
export function readVisibilitySwitch(source) {
  const match = /export const LEARNING_V2_HIDDEN(?::\s*boolean)?\s*=\s*(true|false)\s*;/.exec(source);
  return match ? match[1] === 'true' : null;
}

export function planBVerdict({ hide, ceiling, switchHidden = null }) {
  if (!hide) return { kind: 'run_gates' };
  if (switchHidden === true) return { kind: 'not_applicable', by: 'switch' };
  if (ceiling === null) return { kind: 'refuse', reason: 'потолок не найден в сгенерированном файле' };
  if (ceiling !== 0) return { kind: 'refuse', reason: `план Б заявлен, но в бандле выпущено занятий подряд: ${ceiling}` };
  return { kind: 'not_applicable', by: 'ceiling0' };
}

function main() {
  const hide = process.env.PHRASEMAN_R1_HIDE_V2 === '1';
  let ceiling = null;
  try {
    ceiling = readBundleCeiling(readFileSync(GENERATED, 'utf8'));
  } catch (error) {
    console.error(`${TAG} не прочитан сгенерированный файл потолка: ${error instanceof Error ? error.message : String(error)}`);
  }
  let switchHidden = null;
  try {
    switchHidden = readVisibilitySwitch(readFileSync(SWITCH, 'utf8'));
  } catch (error) {
    console.error(`${TAG} не прочитан рубильник V2: ${error instanceof Error ? error.message : String(error)}`);
  }
  const verdict = planBVerdict({ hide, ceiling, switchHidden });
  console.log(`${TAG} вход: PHRASEMAN_R1_HIDE_V2=${hide ? '1' : 'нет'} потолок=${ceiling ?? 'нет'} рубильник=${switchHidden ?? 'нет'} → ${verdict.kind}${verdict.by ? ` (${verdict.by})` : ''}`);
  if (!hide && switchHidden === true) {
    console.warn(`${TAG} рубильник «V2 скрыт» включён, но PHRASEMAN_R1_HIDE_V2 не задан — гейты №3/№4 запускаются как обычно`);
  }
  if (verdict.kind === 'refuse') {
    console.error(`${TAG} ОТКАЗ: ${verdict.reason}`);
    process.exit(1);
  }
  if (verdict.kind === 'not_applicable') {
    const why = verdict.by === 'switch' ? 'рубильник LEARNING_V2_HIDDEN' : 'потолок 0';
    console.log(`${TAG} НЕПРИМЕНИМО: V2 скрыт (${why}) — гейты №3 (выпуск = исходник) и №4 (озвучка) не запускаются`);
    process.exit(0);
  }
  // Оба гейта запускаются всегда (как раньше в release_precheck): владелец видит все причины сразу, а не первую.
  const failed = [];
  for (const script of GATES) {
    const result = spawnSync(process.execPath, [script], { cwd: ROOT, stdio: 'inherit', env: process.env });
    if (result.status !== 0) {
      console.error(`${TAG} гейт упал: ${script} (код ${result.status ?? 'нет'}${result.error ? `, ${result.error.message}` : ''})`);
      failed.push(script);
    }
  }
  if (failed.length > 0) {
    console.error(`${TAG} ОТКАЗ: красных гейтов V2 — ${failed.length} из ${GATES.length}`);
    process.exit(1);
  }
  console.log(`${TAG} гейты №3/№4 зелёные (V2 в выпуске, потолок ${ceiling})`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
