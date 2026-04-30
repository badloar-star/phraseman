const fs = require('fs');

const files = [
  'app/lesson_data_1_8.ts',
  'app/lesson_data_9_16.ts',
  'app/lesson_data_17_24.ts',
  'app/lesson_data_25_32.ts',
];

const phrases = [];

function unescape(s) {
  return s.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const lessonSections = [];
  const sectionRe = /export const LESSON_(\d+)_PHRASES[^=]*=\s*\[/g;
  let m;
  while ((m = sectionRe.exec(content)) !== null) {
    lessonSections.push({ lesson: parseInt(m[1]), start: m.index + m[0].length });
  }
  for (let li = 0; li < lessonSections.length; li++) {
    const sec = lessonSections[li];
    const end = li + 1 < lessonSections.length ? lessonSections[li + 1].start : content.length;
    const segment = content.slice(sec.start, end);

    const idRe = /id:\s*(?:'([^']+)'|(\d+))/g;
    let idm;
    const ids = [];
    while ((idm = idRe.exec(segment)) !== null) {
      const id = idm[1] || ('lesson' + sec.lesson + '_phrase_' + idm[2]);
      ids.push({ id, idx: idm.index });
    }
    for (let i = 0; i < ids.length; i++) {
      const startIdx = ids[i].idx;
      const endIdx = i + 1 < ids.length ? ids[i + 1].idx : segment.length;
      const block = segment.slice(startIdx, endIdx);

      const eMatch = /english:\s*'((?:[^'\\]|\\.)*)'/.exec(block) || /english:\s*"((?:[^"\\]|\\.)*)"/.exec(block);
      const rMatch = /russian:\s*'((?:[^'\\]|\\.)*)'/.exec(block) || /russian:\s*"((?:[^"\\]|\\.)*)"/.exec(block);
      const uMatch = /ukrainian:\s*'((?:[^'\\]|\\.)*)'/.exec(block) || /ukrainian:\s*"((?:[^"\\]|\\.)*)"/.exec(block);

      const offsetInFile = sec.start + startIdx;
      const before = content.slice(0, offsetInFile);
      const lineNum = before.split('\n').length;

      phrases.push({
        id: ids[i].id,
        lesson: sec.lesson,
        file: f,
        line: lineNum,
        english: eMatch ? unescape(eMatch[1]) : '',
        russian: rMatch ? unescape(rMatch[1]) : '',
        ukrainian: uMatch ? unescape(uMatch[1]) : '',
      });
    }
  }
}

const filtered = phrases.filter(p => p.lesson >= 1 && p.lesson <= 32);
fs.writeFileSync('docs/reports/_phrases_extracted_1_32.json', JSON.stringify(filtered, null, 2));

const counts = {};
for (const p of filtered) counts[p.lesson] = (counts[p.lesson] || 0) + 1;
console.log('Total phrases L1-32:', filtered.length);
for (const k of Object.keys(counts).sort((a, b) => +a - +b)) console.log('L' + k + ': ' + counts[k]);
const missing = filtered.filter(p => !p.russian || !p.ukrainian || !p.english);
console.log('Missing fields:', missing.length);
if (missing.length) console.log('Sample missing:', missing.slice(0, 5));
