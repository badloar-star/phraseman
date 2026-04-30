// Simulate source bytes vs JS-evaluated
const sourceText = "вип\\\\'єте"; // bytes: в, и, п, \, \, ', є, т, е (the source TS file actually has these literal bytes)
console.log('sourceText:', JSON.stringify(sourceText), 'len', sourceText.length);

function processEscapes(s) {
  return s
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}
console.log('after process:', JSON.stringify(processEscapes(sourceText)));

// Source line 3503: вип\\\'єте — actual file bytes (after grep -n strips quoting)
// Reading with fs.readFileSync, bytes are literally вип\\' єте (where \\ is two backslashes, \' is backslash+apos = total 3 backslashes + 1 apos? No.)
// Let's be careful: the TS source file contains text exactly like: вип\\\'єте (each \\\\ in grep output means a real backslash in file).
// fs reads them as raw chars. Need to test reading.

const fs = require('fs');
const data = fs.readFileSync('app/lesson_data_9_16.ts', 'utf8');
const i = data.indexOf("Чи ви сьогодні пізніше вип");
console.log('found at', i);
console.log('substring:', JSON.stringify(data.slice(i, i+45)));
