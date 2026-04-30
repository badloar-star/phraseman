const data = JSON.parse(require('fs').readFileSync('docs/reports/_phrases_full.json','utf8'));
const p = data.find(x => x.id === 'lesson13_phrase_15');
console.log('uk JSON:', JSON.stringify(p.ukrainian));
console.log('uk plain:', p.ukrainian);
const re = new RegExp('\\\\\'');
console.log('match backslash+apos:', re.test(p.ukrainian));
