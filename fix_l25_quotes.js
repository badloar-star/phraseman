const fs = require('fs');
let content = fs.readFileSync('app/lesson_data_all.ts', 'utf8');

const start = content.indexOf('const LESSON_25_PHRASES: LessonPhrase[]');
const end = content.indexOf('\nALL_LESSONS.push({ id: 25');

let block = content.slice(start, end);

// Fix: for english/russian/ukrainian field values that contain an apostrophe,
// switch from single-quote delimiters to double-quote delimiters
// We parse manually to avoid regex issues
function fixFieldQuotes(text) {
  // Find patterns like: field:'...' where field is english, russian, or ukrainian
  const fields = ['english', 'russian', 'ukrainian'];
  let result = text;
  for (const field of fields) {
    const pattern = field + ":'";
    let pos = 0;
    while (true) {
      const idx = result.indexOf(pattern, pos);
      if (idx === -1) break;
      const valueStart = idx + pattern.length;
      // Find the closing single quote (not escaped)
      let end = valueStart;
      while (end < result.length) {
        if (result[end] === '\\') { end += 2; continue; }
        if (result[end] === "'") break;
        end++;
      }
      const value = result.slice(valueStart, end);
      // If value contains an apostrophe, switch to double quotes
      if (value.includes("'")) {
        const newField = field + ':"' + value + '"';
        result = result.slice(0, idx) + newField + result.slice(end + 1);
        pos = idx + newField.length;
      } else {
        pos = end + 1;
      }
    }
  }
  return result;
}

const fixed = fixFieldQuotes(block);
const changed = fixed !== block;
content = content.slice(0, start) + fixed + content.slice(end);
fs.writeFileSync('app/lesson_data_all.ts', content, 'utf8');
console.log('Done, changes made:', changed);
