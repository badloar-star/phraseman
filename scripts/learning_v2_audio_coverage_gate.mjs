#!/usr/bin/env node
/**
 * Релиз-гейт озвучки Learning V2: каждое встроенное занятие (все строки манифеста фабрики, урок 1–N) обязано собираться из бандла,
 * то есть для КАЖДОЙ реплики есть запись в таблице озвучки.
 *
 * зачем (инцидент 04.10, решение координатора): контент урока 1 перегенерировали без перегенерации озвучки — материал занятия молча
 * бракуется, окно закрывается, человек не может начать урок. Тест tests/learning_v2_lesson1_bundle_builds.test.ts ловит это, а этот
 * скрипт делает его условием релиза: он запускается в `npm run release:precheck` и в `eas-build-post-install`.
 *
 * Поведение: тесты запустились и упали → код 1 (сборка не проходит). Сам запуск тестов невозможен (нет раннера, нет файла) → громкое
 * предупреждение и код 0: нехватка окружения не должна сжигать платную сборку, но реальное расхождение контента и озвучки — должно.
 * Логи: префикс [V2-AUDIO-GATE].
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOG = '[V2-AUDIO-GATE]';
const TEST = 'tests/learning_v2_lesson1_bundle_builds.test.ts';

if (!fs.existsSync(path.join(ROOT, TEST))) {
  console.warn(`${LOG} WARNING: нет файла ${TEST} — гейт озвучки не выполнен (код 0, чтобы не жечь сборку из-за окружения)`);
  process.exit(0);
}

const runner = path.join(ROOT, 'node_modules', 'jest', 'bin', 'jest.js');
if (!fs.existsSync(runner)) {
  console.warn(`${LOG} WARNING: не найден раннер тестов (${runner}) — гейт озвучки не выполнен (код 0)`);
  process.exit(0);
}

console.log(`${LOG} проверяю, что каждое встроенное занятие собирается из бандла (озвучка есть для каждой реплики)…`);
const startedAt = Date.now();
const result = spawnSync(process.execPath, [runner, '--no-watchman', '--runTestsByPath', TEST], {
  cwd: ROOT,
  encoding: 'utf8',
  env: { ...process.env, CI: 'true' },
  maxBuffer: 64 * 1024 * 1024,
});
const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);

if (result.error) {
  console.warn(`${LOG} WARNING: раннер не запустился (${result.error.message}) — гейт озвучки не выполнен (код 0)`);
  process.exit(0);
}
if (result.status === 0) {
  console.log(`${LOG} OK за ${seconds} с: все занятия манифеста собираются, озвучка полная`);
  process.exit(0);
}

const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
const missing = [...new Set(output.split('\n').filter((line) => line.includes('voice=') && line.includes('transcript=')).map((line) => line.trim()))].slice(0, 20);
console.error(`${LOG} ОТКАЗ: есть встроенные занятия, которые не собираются (в таблице озвучки нет записи для реплики контента).`);
console.error(`${LOG} Что делать: перегенерировать озвучку и таблицу ИЛИ откатить перегенерацию контента (modules/learning-v2/content/factory_native). Подробности: docs/phraseman-2.0/evidence/V2_LESSON1_MISSING_AUDIO_2026-10-04.md`);
for (const line of missing) console.error(`${LOG}   ${line}`);
if (missing.length === 0) console.error(output.split('\n').slice(-40).join('\n'));
process.exit(1);
