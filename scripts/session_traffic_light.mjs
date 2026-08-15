#!/usr/bin/env node
// зачем: на машине параллельно работают несколько сессий Claude. Тяжёлые
// прогоны (Jest, сборка, ComfyUI, генерация на видеокарте) конфликтуют за
// GPU/память. Этот скрипт — простой кооперативный семафор поверх
// SESSION_TRAFFIC_LIGHT.md: занять, отпустить, посмотреть, подождать.
//
// Кооперативный, не принудительный: он никого не блокирует силой, но делает
// занятость видимой обеим сессиям и владельцу.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'SESSION_TRAFFIC_LIGHT.md');
const FREE = 'СВОБОДНО';

// Страховка от зависшего замка: если сессия упала, не удержав файл, через это
// время замок считается протухшим и его можно перехватить.
const STALE_MINUTES = 30;

function read() {
  if (!fs.existsSync(FILE)) {
    throw new Error(`Нет файла светофора: ${FILE}`);
  }
  return fs.readFileSync(FILE, 'utf8');
}

function parse(text) {
  const status = /```\r?\n([^\r\n]*)\r?\n```/u.exec(text)?.[1]?.trim() ?? FREE;
  const holder = /\*\*Кто держит:\*\*\s*(.*)/u.exec(text)?.[1]?.trim() ?? '—';
  const doing = /\*\*Что делает:\*\*\s*(.*)/u.exec(text)?.[1]?.trim() ?? '—';
  const since = /\*\*Занято с:\*\*\s*(.*)/u.exec(text)?.[1]?.trim() ?? '—';
  return { status, holder, doing, since, busy: status !== FREE };
}

function write(text, { status, holder, doing, since, until }) {
  return text
    .replace(/```\r?\n[^\r\n]*\r?\n```/u, '```\n' + status + '\n```')
    .replace(/\*\*Кто держит:\*\*.*/u, `**Кто держит:** ${holder}`)
    .replace(/\*\*Что делает:\*\*.*/u, `**Что делает:** ${doing}`)
    .replace(/\*\*Занято с:\*\*.*/u, `**Занято с:** ${since}`)
    .replace(/\*\*Ожидаемо до:\*\*.*/u, `**Ожидаемо до:** ${until}`);
}

function staleMinutes(since) {
  const at = Date.parse(since);
  if (Number.isNaN(at)) return null;
  return Math.round((Date.now() - at) / 60_000);
}

const [command, ...rest] = process.argv.slice(2);
const text = read();
const state = parse(text);

if (command === 'status' || command === undefined) {
  if (!state.busy) {
    console.log('СВОБОДНО — можно запускать тяжёлое.');
    process.exit(0);
  }
  const age = staleMinutes(state.since);
  console.log(`ЗАНЯТО: ${state.holder} — ${state.doing}`);
  console.log(`  с ${state.since}${age === null ? '' : ` (${age} мин назад)`}`);
  if (age !== null && age > STALE_MINUTES) {
    console.log(`  ВНИМАНИЕ: замок держится дольше ${STALE_MINUTES} мин — вероятно, протух.`);
    console.log('  Перехватить: node scripts/session_traffic_light.mjs take "<кто>" "<что>" --force');
  }
  process.exit(1);
}

if (command === 'take') {
  const holder = rest[0];
  const doing = rest[1];
  const force = rest.includes('--force');
  if (!holder || !doing) {
    console.error('Использование: take "<кто>" "<что делает>" [--force]');
    process.exit(2);
  }
  if (state.busy && !force) {
    const age = staleMinutes(state.since);
    console.error(`Занято: ${state.holder} — ${state.doing}`);
    if (age !== null && age > STALE_MINUTES) {
      console.error(`Замок старше ${STALE_MINUTES} мин, можно перехватить с --force.`);
    } else {
      console.error('Подожди и повтори, либо делай лёгкую работу.');
    }
    process.exit(1);
  }
  const now = new Date().toISOString();
  fs.writeFileSync(
    FILE,
    write(text, {
      status: 'ЗАНЯТО',
      holder,
      doing,
      since: now,
      until: 'пока идёт задача',
    }),
    'utf8',
  );
  console.log(`ВЗЯЛ: ${holder} — ${doing}`);
  process.exit(0);
}

if (command === 'release') {
  fs.writeFileSync(
    FILE,
    write(text, {
      status: FREE,
      holder: '—',
      doing: '—',
      since: '—',
      until: '—',
    }),
    'utf8',
  );
  console.log('ОТПУСТИЛ — свободно.');
  process.exit(0);
}

console.error('Команды: status | take "<кто>" "<что>" [--force] | release');
process.exit(2);
