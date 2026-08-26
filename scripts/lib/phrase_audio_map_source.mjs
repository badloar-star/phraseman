import fs from 'node:fs';

function parseJsStringLiteral(raw) {
  if (raw.startsWith('"')) return JSON.parse(raw);
  return raw
    .slice(1, -1)
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\');
}

function recordBlock(source, name) {
  const marker = new RegExp(`const\\s+${name}[^=]*=\\s*\\{`, 'u').exec(source);
  if (!marker) return new Map();
  const start = marker.index + marker[0].length;
  const end = source.indexOf('\n};', start);
  if (end < 0) return new Map();

  const values = new Map();
  const block = source.slice(start, end);
  const line = /^\s*("(?:\\.|[^"\\])*"):\s*("(?:\\.|[^"\\])*")\s*,?\s*$/gmu;
  for (const match of block.matchAll(line)) {
    values.set(JSON.parse(match[1]), JSON.parse(match[2]));
  }
  return values;
}

/** Read both the current COMPACT_URL_MAP_V2 source and the legacy full-URL map. */
export function parsePhraseAudioMapSource(source) {
  const result = new Map();
  const baseMatch = /const\s+BASE\s*=\s*('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")\s*;/u.exec(source);
  const foldersMatch = /const\s+FOLDERS[^=]*=\s*(\[[^;\n]*\])\s*;/u.exec(source);
  const base = baseMatch ? parseJsStringLiteral(baseMatch[1]) : '';
  let folders = [];
  try {
    folders = foldersMatch ? JSON.parse(foldersMatch[1]) : [];
  } catch {
    folders = [];
  }

  for (const [key, packed] of recordBlock(source, 'ENTRIES')) {
    if (packed.startsWith('https://')) {
      result.set(key, packed);
      continue;
    }
    const first = packed.indexOf('|');
    const last = packed.lastIndexOf('|');
    const folder = folders[Number(packed.slice(0, first))];
    if (!base || first <= 0 || last <= first || typeof folder !== 'string') continue;
    const file = packed.slice(first + 1, last);
    const version = packed.slice(last + 1);
    result.set(key, `${base}${folder}%2F${file}.mp3?alt=media&v=${version}`);
  }

  for (const [key, url] of recordBlock(source, 'URL_OVERRIDES')) {
    if (url.startsWith('https://')) result.set(key, url);
  }

  // Legacy generated maps stored complete URLs directly in one object.
  if (result.size === 0) {
    const fullUrlLine = /^\s*("(?:\\.|[^"\\])*"):\s*("https:\/\/(?:\\.|[^"\\])*")\s*,?\s*$/gmu;
    for (const match of source.matchAll(fullUrlLine)) {
      result.set(JSON.parse(match[1]), JSON.parse(match[2]));
    }
  }

  return result;
}

export function readPhraseAudioMapFile(file) {
  return parsePhraseAudioMapSource(fs.readFileSync(file, 'utf8'));
}
