import fs from 'fs';

const files = [
  'app/lesson_data_1_8.ts',
  'app/lesson_data_9_16.ts',
  'app/lesson_data_17_24.ts',
  'app/lesson_data_25_32.ts',
];

function extractPhraseBlocks(content) {
  const blocks = [];
  let pos = 0;
  while (true) {
    const idx = content.indexOf('export const LESSON_', pos);
    if (idx === -1) break;
    const sliceFrom = content.slice(idx, idx + 80);
    if (!/_PHRASES/.test(sliceFrom)) {
      pos = idx + 15;
      continue;
    }
    const endDecl = content.indexOf('= [', idx);
    if (endDecl === -1) break;
    const nameMatch = content.slice(idx, endDecl).match(/LESSON_\d+_PHRASES/);
    if (!nameMatch) {
      pos = idx + 1;
      continue;
    }
    const name = nameMatch[0];
    let i = endDecl + 3;
    let depth = 1;
    while (i < content.length && depth > 0) {
      const c = content[i];
      if (c === '[') depth++;
      else if (c === ']') depth--;
      i++;
    }
    blocks.push({ name, body: content.slice(endDecl + 3, i - 1) });
    pos = i;
  }
  return blocks;
}

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const blocks = extractPhraseBlocks(content);
  for (const { name, body } of blocks) {
    const idMatches = [...body.matchAll(/\bid:\s*['"][^'"]+['"]/g)];
    const spanishMatches = [...body.matchAll(/\bspanish:\s*['"]/g)];
    const nId = idMatches.length;
    const nSp = spanishMatches.length;
    if (nId !== nSp) {
      console.log(`${file} ${name}: ids=${nId} spanish=${nSp} MISSING ${nId - nSp}`);
    }
  }
}

console.log('done');
