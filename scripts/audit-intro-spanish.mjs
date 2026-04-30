import fs from 'fs';

const files = [
  'app/lesson_data_1_8.ts',
  'app/lesson_data_9_16.ts',
  'app/lesson_data_17_24.ts',
  'app/lesson_data_25_32.ts',
];

function extractArrayAfter(content, markerSuffix) {
  const blocks = [];
  let pos = 0;
  while (true) {
    const idx = content.indexOf('export const LESSON_', pos);
    if (idx === -1) break;
    const hdr = content.slice(idx, idx + 120);
    if (!hdr.includes(markerSuffix)) {
      pos = idx + 20;
      continue;
    }
    const nameMatch = hdr.match(new RegExp(`LESSON_\\d+_${markerSuffix}`));
    if (!nameMatch) {
      pos = idx + 1;
      continue;
    }
    const name = nameMatch[0];
    const endDecl = content.indexOf('= [', idx);
    if (endDecl === -1) break;
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
  for (const suffix of ['INTRO_SCREENS', 'ENCOURAGEMENT_SCREENS']) {
    const blocks = extractArrayAfter(content, suffix);
    if (blocks.length === 0 && file === 'app/lesson_data_1_8.ts') {
      console.error('no blocks', suffix);
    }
    for (const { name, body } of blocks) {
      const nTextRU = (body.match(/\btextRU:/g) || []).length;
      const nTextES = (body.match(/\btextES:/g) || []).length;
      const nTrRu = (body.match(/\btrRU:/g) || []).length;
      const nTrEs = (body.match(/\btrES:/g) || []).length;
      if (nTextRU !== nTextES) {
        console.log(`${file} ${name}: textRU=${nTextRU} textES=${nTextES} (missing ${nTextRU - nTextES})`);
      }
      if (nTrRu !== nTrEs) {
        console.log(`${file} ${name}: trRU=${nTrRu} trES=${nTrEs} (missing ${nTrRu - nTrEs})`);
      }
    }
  }
}

console.log('audit-intro-spanish done');
