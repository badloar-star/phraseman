import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

function parseCli(argv) {
  if (argv.length < 2 || argv[0] !== '--files') throw new Error('usage: select_change_gates.mjs --files <path> [path...]');
  const files = argv.slice(1).map((file) => file.trim()).filter(Boolean);
  if (!files.length || files.some((file) => file.startsWith('--') || path.isAbsolute(file))) throw new Error('files must be relative non-empty paths');
  return files.map((file) => file.replaceAll('\\', '/'));
}

function globToRegExp(glob) {
  let output = '^';
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index];
    if (char === '*' && glob[index + 1] === '*') { output += '.*'; index += 1; }
    else if (char === '*') output += '[^/]*';
    else output += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`${output}$`);
}

const matrix = JSON.parse(await readFile(path.resolve('config/change-gate-matrix.json'), 'utf8'));
if (matrix.schemaVersion !== 1 || matrix.mode !== 'observe' || !Array.isArray(matrix.universal) || !matrix.packs) throw new Error('invalid change gate matrix');
const compiled = Object.entries(matrix.packs).map(([name, pack]) => ({ name, ...pack, regexes: (pack.patterns ?? []).map(globToRegExp) }));

try {
  const files = parseCli(process.argv.slice(2));
  const selected = new Set();
  for (const file of files) {
    for (const pack of compiled) if (pack.regexes.some((regex) => regex.test(file))) selected.add(pack.name);
  }
  if (!selected.size) selected.add('manual-triage');
  const packs = [...selected].sort();
  const checks = [...new Set(packs.flatMap((name) => matrix.packs[name].checks))].sort();
  const independentReview = packs.some((name) => matrix.packs[name].critical);
  console.log(JSON.stringify({ schemaVersion: 1, mode: matrix.mode, files, universal: [...matrix.universal].sort(), packs, checks, independentReview }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
