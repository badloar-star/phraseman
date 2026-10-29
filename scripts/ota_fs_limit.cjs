// [OTA-FS-LIMIT] Ограничитель одновременных чтений/записей файлов для экспорта OTA.
// зачем (29.10, сборка 2.0.3-OTA1): после пересборки курса граф вырос до ~16,8 тыс. модулей, и Metro при тёплом
// кэше читает записи кэша веером (metro-cache FileStore.get → fs.promises.readFile на каждый модуль сразу).
// Датчик показал пик 8960 открытых файлов в одном процессе — на Windows это EMFILE, экспорт падал на 92%.
// graceful-fs fs.promises не патчит, поэтому держим свою очередь. Подключается ТОЛЬКО из scripts/ota_from_head.sh
// через NODE_OPTIONS=--require; в бандл приложения не попадает.
'use strict';
const fs = require('fs');

const LIMIT = Number.parseInt(process.env.OTA_FS_LIMIT || '1024', 10) || 1024;
const MAX_RETRIES = 8;
let active = 0;
let peakActive = 0;
let peakQueued = 0;
let retries = 0;
let emfileGaveUp = 0;
const queue = [];

function acquire() {
  if (active < LIMIT) {
    active += 1;
    if (active > peakActive) peakActive = active;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    queue.push(resolve);
    if (queue.length > peakQueued) peakQueued = queue.length;
  });
}

function release() {
  const next = queue.shift();
  if (next) next();
  else active -= 1;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function limited(original, api) {
  return async function limitedFsCall(...args) {
    await acquire();
    try {
      for (let attempt = 0; ; attempt += 1) {
        try {
          return await original.apply(fs.promises, args);
        } catch (error) {
          if (!error || error.code !== 'EMFILE') throw error;
          if (attempt >= MAX_RETRIES) {
            emfileGaveUp += 1;
            process.stderr.write(`[OTA-FS-LIMIT] EMFILE после ${attempt} повторов: ${api} ${String(args[0]).slice(0, 160)}\n`);
            throw error;
          }
          retries += 1;
          await sleep(25 * (attempt + 1));
        }
      }
    } finally {
      release();
    }
  };
}

fs.promises.readFile = limited(fs.promises.readFile, 'readFile');
fs.promises.writeFile = limited(fs.promises.writeFile, 'writeFile');

process.on('exit', (code) => {
  // Пишем только в процессах, где ограничитель реально работал, чтобы не засорять журнал npx/дочерних.
  if (peakActive < 64 && retries === 0) return;
  process.stderr.write(`[OTA-FS-LIMIT] pid=${process.pid} exit=${code} limit=${LIMIT} peakActive=${peakActive} peakQueued=${peakQueued} emfileRetries=${retries} emfileGaveUp=${emfileGaveUp}\n`);
});
