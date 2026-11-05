// classic_plain_reader_extract — достаёт тексты теории и интро классики для одной локали (ru|uk) в единую форму.
// зачем (Ревизор 05.11, стандарт docs/work/classic_plain_explanation_standard_2026-11-05.md): один разбор формата двух схем
// (studio/2 у en/es: localized.<loc>{…}; chapters у fr/de/it: *ByLocale; интро: titleRU/textRU/linesRU или *ByLocale) для проверки «пятилетнего читателя» и сторожа терминов.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', 'modules', 'classic-courses');
const ID_LIKE = /^(?:[a-z]{2}(?:-classic-r1)?:\d\d(?::\d\d)?|\d\d\.\d\d)$/; // служебные адреса примеров («es:01:06», «01.01») — не текст для читателя
const strings = (v, o = []) => { if (typeof v === 'string') { if (!ID_LIKE.test(v)) o.push(v); } else if (Array.isArray(v)) v.forEach((x) => strings(x, o)); else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, o)); return o; };
function byLocale(v, loc, o = []) {
  if (Array.isArray(v)) v.forEach((x) => byLocale(x, loc, o));
  else if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) {
      if ((k === 'textByLocale' || k === 'titleByLocale') && x && typeof x === 'object') strings(x[loc], o);
      else byLocale(x, loc, o);
    }
  }
  return o;
}
function theoryTexts(course, lesson, loc) {
  const j = JSON.parse(fs.readFileSync(path.join(ROOT, course, 'theory.json'), 'utf8')).data[String(lesson)];
  if (!j) return [];
  const out = [];
  if (j.localized && j.localized[loc]) strings(j.localized[loc], out);
  byLocale(j, loc, out);
  return out;
}
function introTexts(course, lesson, loc) {
  const screens = JSON.parse(fs.readFileSync(path.join(ROOT, course, 'intro.json'), 'utf8'))[String(lesson)] || [];
  const out = [];
  const suffix = loc.toUpperCase();
  for (const s of screens) {
    if (typeof s[`title${suffix}`] === 'string') out.push(s[`title${suffix}`]);
    if (typeof s[`text${suffix}`] === 'string') out.push(s[`text${suffix}`]);
    byLocale(s, loc, out);
    if (Array.isArray(s[`lines${suffix}`])) strings(s[`lines${suffix}`].map((l) => (l.parts ? l.parts.map((p) => p.text) : l.text)), out);
  }
  return [...new Set(out)];
}
module.exports = { theoryTexts, introTexts, ROOT };
