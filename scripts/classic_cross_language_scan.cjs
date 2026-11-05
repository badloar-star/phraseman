// classic_cross_language_scan — привязка к «чужому» языку в текстах локалей (Ревизор 05.11, P0 владельца).
// Правило: в тексте локали, КРОМЕ ru/uk, нельзя упоминать русский язык/кириллицу («Russian letters», «lettres russes», «russische», «letras rusas»…).
// Для ru/uk допустимы только их собственные слова; для остальных — запрет. Экспорт scan() используется тестом tests/classic_no_cross_language_refs.test.ts.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', 'modules', 'classic-courses');
const LOCALES = new Set(['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']);
const EXEMPT = new Set(['ru', 'uk']);
// корни слов «русский / кириллица» на 9 языках (+ украинские «російськ/кирилиц» на случай упоминания в чужой локали)
const BAD = /russian|cyrillic|kyrillisch|russische|russisch|русск|кириллиц|кирилиц|російськ|letras? rusas?|alfabeto ruso|ruso\b|lettres? russes?|lettere russe|alfabeto russo|\brusse\b|\brusso\b|tiếng nga|chữ (?:cái )?(?:nga|kirin)|bahasa rusia|huruf (?:rusia|kiril)|rus (?:harfleri|alfabesi)|kiril|rosyjsk|cyrylic|cyrylic|ros(?:yjski|yjska|yjskie)|rosyjskimi literami|portuguese russo|em russo|letras russas?/i;
function walk(v, loc, trail, out, file) {
  if (typeof v === 'string') { if (loc && !EXEMPT.has(loc)) { const m = v.match(BAD); if (m) out.push({ file, at: trail, loc, hit: m[0], text: v.slice(0, 140) }); } return; }
  if (Array.isArray(v)) { v.forEach((x, i) => walk(x, loc, `${trail}[${i}]`, out, file)); return; }
  if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) {
    const next = LOCALES.has(k) ? k : (/^(?:title|text|lines|sub|hint)([A-Z]{2})$/.test(k) && LOCALES.has(k.slice(-2).toLowerCase()) ? k.slice(-2).toLowerCase() : loc);
    walk(x, next, `${trail}.${k}`, out, file);
  }
}
function scan() {
  const out = [];
  for (const course of fs.readdirSync(ROOT).filter((d) => fs.statSync(path.join(ROOT, d)).isDirectory())) {
    for (const f of fs.readdirSync(path.join(ROOT, course)).filter((n) => n.endsWith('.json'))) {
      walk(JSON.parse(fs.readFileSync(path.join(ROOT, course, f), 'utf8')), null, `${course}/${f}`, out, `${course}/${f}`);
    }
  }
  return out;
}
module.exports = { scan, BAD };
if (require.main === module) {
  const r = scan();
  const byFile = {};
  r.forEach((x) => { const k = `${x.file} [${x.loc}]`; byFile[k] = (byFile[k] || 0) + 1; });
  console.log('нарушений:', r.length);
  console.log(JSON.stringify(byFile, null, 1));
  r.slice(0, 12).forEach((x) => console.log(`${x.at}: «${x.hit}» в «${x.text}»`));
}
