import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import vm from 'node:vm';

const ROOT = resolve(import.meta.dirname, '..');
const TMP = resolve(ROOT, '.codex-tmp/learning-v2-lesson1');
const OUTPUT_DIR = resolve(
  ROOT,
  '.superpowers/brainstorm/871-1787210859/content',
);

function valueAfter(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function readPacket(from, to) {
  const dataPath = resolve(TMP, `s${pad(from)}-${pad(to)}-real-data.js`);
  const context = { window: {} };
  vm.runInNewContext(readFileSync(dataPath, 'utf8'), context, { filename: dataPath });
  return context.window.__LEARNING_V2_REAL_SESSION_DATA__;
}

const through = Number(valueAfter(process.argv.slice(2), '--through'));
if (
  !Number.isInteger(through) ||
  through < 5 ||
  through > 56 ||
  (through % 5 !== 0 && through !== 56)
) {
  throw new Error('through_must_be_a_multiple_of_5_between_5_and_55_or_56');
}

const packets = [];
for (let from = 1; from <= through; from += 5) {
  packets.push(readPacket(from, Math.min(from + 4, through)));
}
const sessions = packets.flatMap((packet) => packet.sessions);
const ordinals = sessions.map((session) => session.ordinal);
const expected = Array.from({ length: through }, (_, index) => index + 1);
if (JSON.stringify(ordinals) !== JSON.stringify(expected)) {
  throw new Error(`ready_mock_non_contiguous:${ordinals.join(',')}`);
}

const data = {
  ...packets[0],
  autoStatus: packets.every((packet) => packet.autoStatus === 'PASS') ? 'PASS' : 'HOLD',
  manualStatus: 'HOLD',
  sessions,
};
const dataName = `lesson1-ready-01-${pad(through)}-data.js`;
const htmlName = `lesson1-ready-01-${pad(through)}.html`;
const templateFrom = through === 56 ? 56 : through - 4;
const templatePath = resolve(TMP, `s${pad(templateFrom)}-${pad(through)}-real.html`);
const html = readFileSync(templatePath, 'utf8')
  .replace(/<script src="\.\/[^"\n]+-data\.js"><\/script>/u, `<script src="./${dataName}"></script>`)
  .replace('56 полных интерактивных сессий', `${through} собранных интерактивных сессий · AUTO PASS / MANUAL HOLD`)
  .replace('<a class="viewlink" href="./lesson1-all-56-review.html">Все созданные материалы</a>', '');

mkdirSync(OUTPUT_DIR, { recursive: true });
const dataPath = resolve(OUTPUT_DIR, dataName);
const htmlPath = resolve(OUTPUT_DIR, htmlName);
writeFileSync(dataPath, `window.__LEARNING_V2_REAL_SESSION_DATA__=${JSON.stringify(data)};\n`, 'utf8');
writeFileSync(htmlPath, html, 'utf8');
process.stdout.write(`READY MOCK ${htmlPath}\nDATA ${dataPath}\nSESSIONS ${sessions.length}\n`);
