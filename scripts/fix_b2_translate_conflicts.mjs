/**
 * Свести translate_meaning в B2: одинаковый EN-вопрос → один помеченный ответ (как у primary).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const filePath = path.join(root, 'assets', 'arena_questions_b2.json');

function mergeTranslateCard(sec, pri) {
  const C = pri.correct;
  const old = sec.correct;
  const idx = sec.options.indexOf(old);
  if (idx === -1) {
    throw new Error(`${sec.id}: old correct not found in options`);
  }
  const cIdx = sec.options.indexOf(C);
  if (cIdx !== -1 && cIdx !== idx) {
    const priWrong = pri.options.filter((o) => o !== C);
    const filler = priWrong.find((o) => !sec.options.includes(o));
    if (filler === undefined) {
      throw new Error(`${sec.id}: no filler from primary ${pri.id}`);
    }
    sec.options[idx] = filler;
    sec.correct = C;
  } else {
    sec.options[idx] = C;
    sec.correct = C;
  }
  if (new Set(sec.options).size !== 4) {
    throw new Error(`${sec.id}: duplicate options after merge`);
  }
}

// [ primaryId, secondaryIds[] ]
const GROUPS = [
  ['b2_024', ['b2_1829']],
  ['b2_055', ['b2_759']],
  ['b2_072', ['b2_2093']],
  ['b2_083', ['b2_2016']],
  ['b2_119', ['b2_1998']],
  ['b2_673', ['b2_314']],
  ['b2_493', ['b2_842', 'b2_1232']],
  ['b2_523', ['b2_754']],
  ['b2_579', ['b2_907']],
  ['b2_599', ['b2_837']],
  ['b2_659', ['b2_1436']],
  ['b2_768', ['b2_982']],
  ['b2_821', ['b2_1071']],
  ['b2_1062', ['b2_1272', 'b2_1480', 'b2_1679']],
  ['b2_1107', ['b2_1759']],
  ['b2_1207', ['b2_1426', 'b2_1619']],
  ['b2_1312', ['b2_1535']],
  ['b2_1382', ['b2_1590']],
  ['b2_1485', ['b2_1689']],
  ['b2_1525', ['b2_1729']],
];

const raw = fs.readFileSync(filePath, 'utf8');
const arr = JSON.parse(raw);
const byId = new Map(arr.map((q) => [q.id, q]));

for (const [pid, secondaries] of GROUPS) {
  const pri = byId.get(pid);
  if (!pri || pri.type !== 'translate_meaning') {
    throw new Error(`missing or wrong type primary ${pid}`);
  }
  for (const sid of secondaries) {
    const sec = byId.get(sid);
    if (!sec || sec.type !== 'translate_meaning') {
      throw new Error(`missing secondary ${sid}`);
    }
    mergeTranslateCard(sec, pri);
  }
}

fs.writeFileSync(filePath, JSON.stringify(arr, null, 2) + '\n', 'utf8');
console.log('Updated', filePath, 'groups', GROUPS.length);
