'use strict';
// зачем (владелец 06.11, «Читается» в теории всех курсов; fr: 370 фраз старой теории): ЗАГОТОВКА чтения французской фразы кириллицей в стиле готовых чтений Теории
// (лиэзон, немое e, носовые, ударение только на последнем слоге слов из двух и более слогов). Французская орфография не фонетична, поэтому правила дают только черновик (~60–70 % слов
// верно): каждый результат просматривается глазами, исключения лежат в словаре docs/work/classic_say_fr/words.json (слово → чтение) и в правках целых фраз docs/work/classic_say_fr/phrases.json.
// Украинское чтение выводится из русского правилом ruToUk (э→е, и→і, ё→е/ьо, ы→и), как в готовых чтениях Теории.
// Использование: const { translitFr, ruToUk } = require('./classic_say_translit_fr.cjs'); translitFr('Où habites-tu ?', words) → 'у аби́т тю'.

const ACUTE = '́';
const VOWELS_RU = 'аеёиоуыэюя';
const isVowelRu = (c) => !!c && VOWELS_RU.includes(c);

/** Слово → кириллица без ударения; context: { nextVowel } для связки. Только графемы, без исключений. */
function graphemes(w, hadFinal = false) {
  let s = w.toLowerCase();
  // окончания
  const isVerbEnt = /[a-zéèêàâîôûëï]+ent$/.test(s) && s.length > 4 && !/(ent)$/.test(s.replace(/(m|v)ent$/, ''));
  void isVerbEnt;
  let out = '';
  let i = 0;
  const V = 'aeiouyàâéèêëîïôûùœ';
  const isV = (ch) => !!ch && V.includes(ch);
  const n = s.length;
  const at = (k) => s[k] ?? '';
  while (i < n) {
    const c = s[i];
    const rest = s.slice(i);
    const last = i === n - 1;
    const nx = at(i + 1);
    const nx2 = at(i + 2);
    // носовые
    const nasalNext = (k) => !isV(at(k + 2)) || at(k + 2) === ''; // после n/m не гласная
    if (/^(ain|aim|ein|eim)(?![aeiouyàâéèêëîïôûùœn m])/.test(rest) || (/^(ain|aim|ein|eim)$/.test(rest))) { out += 'эн'; i += 3; continue; }
    if (/^oin(?![aeiouyàâéèêëîïôûùœ])/.test(rest) && nx !== 'n' ) { out += 'уэн'; i += 3; continue; }
    if (/^ien(?![aeiouyàâéèêëîïôûùœ])/.test(rest)) { out += 'ьэн'; i += 3; continue; }
    if (/^(an|am|en|em)(?![aeiouyàâéèêëîïôûùœ])(?!n|m)/.test(rest) || /^(an|am|en|em)$/.test(rest)) {
      if (c === 'e' && /^en$/.test(rest) && i > 0 && s.slice(i - 1, i) === 'i') { out += 'эн'; i += 2; continue; }
      out += 'ан'; i += 2; continue;
    }
    if (/^(on|om)(?![aeiouyàâéèêëîïôûùœ])(?!n|m)/.test(rest) || /^(on|om)$/.test(rest)) { out += 'он'; i += 2; continue; }
    if (/^(in|im|yn|ym)(?![aeiouyàâéèêëîïôûùœ])(?!n|m)/.test(rest) || /^(in|im)$/.test(rest)) { out += 'эн'; i += 2; continue; }
    if (/^(un|um)(?![aeiouyàâéèêëîïôûùœ])(?!n|m)/.test(rest) || /^(un|um)$/.test(rest)) { out += 'ён'; i += 2; continue; }
    // группы гласных
    if (rest.startsWith('eau')) { out += 'о'; i += 3; continue; }
    if (rest.startsWith('oeu') || rest.startsWith('œu')) { out += 'ё'; i += rest.startsWith('oeu') ? 3 : 2; continue; }
    if (rest.startsWith('ou')) { out += 'у'; i += 2; continue; }
    if (rest.startsWith('oi')) { out += 'уа'; i += 2; continue; }
    if (rest === 'ai' && !hadFinal) { out += 'е'; i += 2; continue; } // будущее: partirai → партире́ (а «ais/ait» — «э»)
    if (rest.startsWith('ai') || rest.startsWith('ei') || rest.startsWith('aî')) { out += 'э'; i += 2; continue; }
    if (rest.startsWith('au')) { out += 'о'; i += 2; continue; }
    if (rest.startsWith('eu')) { out += 'ё'; i += 2; continue; }
    if (rest.startsWith('ey')) { out += 'э'; i += 2; continue; }
    if (rest.startsWith('ue') && at(i - 1) === 'g') { out += 'э'; i += 2; continue; }
    // согласные
    if (rest.startsWith('tion')) { out += 'сьон'; i += 4; continue; }
    if (rest.startsWith('ch')) { out += 'ш'; i += 2; continue; }
    if (rest.startsWith('gn')) { out += 'нь'; i += 2; continue; }
    if (rest.startsWith('ph')) { out += 'ф'; i += 2; continue; }
    if (rest.startsWith('th')) { out += 'т'; i += 2; continue; }
    if (rest.startsWith('qu')) { out += 'к'; i += 2; continue; }
    if (rest.startsWith('gu') && 'eiéèêy'.includes(nx2)) { out += 'г'; i += 2; continue; }
    if (rest.startsWith('ill') && i > 0 && isV(at(i - 1))) { out += 'й'; i += 3; if (at(i) === 'e' && i === n - 1) i += 1; continue; }
    if (rest.startsWith('ss')) { out += 'с'; i += 2; continue; }
    if (c === 'c') { out += 'eiéèêy'.includes(nx) ? (at(i - 1) === 's' ? '' : 'с') : 'к'; i += nx === 'c' ? 2 : 1; continue; } // sc + e/i → одно «с» (ascenseur)
    if (c === 'ç') { out += 'с'; i += 1; continue; }
    if (c === 'g') { out += 'eiéèêy'.includes(nx) ? 'ж' : 'г'; i += 1; continue; }
    if (c === 'j') { out += 'ж'; i += 1; continue; }
    if (c === 'h') { i += 1; continue; }
    if (c === 's') { out += (isV(at(i - 1)) && isV(nx)) ? 'з' : 'с'; i += 1; continue; }
    if (c === 'x') { out += 'кс'; i += 1; continue; }
    if (c === 'w') { out += 'в'; i += 1; continue; }
    if (c === 'y') { out += isV(nx) ? 'й' : 'и'; i += 1; continue; }
    const cons = { b: 'б', d: 'д', f: 'ф', k: 'к', l: 'л', m: 'м', n: 'н', p: 'п', r: 'р', t: 'т', v: 'в', z: 'з', q: 'к' };
    if (cons[c]) {
      if (nx === c && c !== 'c') i += 1; // двойные согласные
      out += cons[c]; i += 1; continue;
    }
    // гласные одиночные
    if (c === 'é') { out += 'е'; i += 1; continue; }
    if (c === 'è' || c === 'ê' || c === 'ë') { out += 'э'; i += 1; continue; }
    if (c === 'à' || c === 'â' || c === 'a') { out += 'а'; i += 1; continue; }
    if (c === 'î' || c === 'ï' || c === 'i') { out += 'и'; i += 1; continue; }
    if (c === 'ô' || c === 'o') { out += 'о'; i += 1; continue; }
    if (c === 'û' || c === 'ù' || c === 'u') { out += 'ю'; i += 1; continue; }
    if (c === 'œ') { out += 'ё'; i += 1; continue; }
    if (c === 'e') {
      // e в конце слова — немое; es/ent в конце — немые; перед двумя согласными/в закрытом слоге — «э»; иначе «ё»
      if (last) { i += 1; continue; }
      if (rest === 'es' || rest === 'ent') { i = n; continue; }
      if (rest === 'er' || rest === 'ez') { out += 'е'; i = n; continue; }
      const afterIsCluster = !isV(nx) && !isV(nx2) && nx !== '' && nx2 !== '';
      if (afterIsCluster || (nx && !isV(nx) && nx2 === '')) { out += 'э'; i += 1; continue; }
      out += 'ё'; i += 1; continue;
    }
    i += 1;
  }
  return out;
}

/** Финальные немые согласные: срезаются в graphemes через явный список конечных букв. */
function stripSilentFinal(w) {
  let s = w.toLowerCase();
  // слова на -ent глагольные и -es: обрабатывает graphemes; здесь только конечные согласные
  if (/^(plus|sens|tous|fils|ours|os|bus|us|lys)$/.test(s)) return s;
  s = s.replace(/(?<=[aeiouyàâéèêëîïôûùœ])(s|t|d|x|z|p)$/, '');
  s = s.replace(/(?<=[bcdfghjklmnpqrstvwxz])(s|t)$/, (m, g, off, str) => (str.length > 2 && /[bcdfgklmnprstvz][st]$/.test(str) ? '' : m));
  return s;
}

function syllableCount(ru) {
  return (ru.replace(/ьэн|ьон|уэн|ьо/g, 'а').match(new RegExp(`[${VOWELS_RU}]`, 'g')) ?? []).length;
}

function markLast(ru) {
  if (syllableCount(ru) < 2 || ru.includes(ACUTE)) return ru;
  // последняя гласная (носовые: на «он/ан/эн/ён» — гласная перед н)
  for (let k = ru.length - 1; k >= 0; k -= 1) if (isVowelRu(ru[k])) return ru.slice(0, k + 1) + ACUTE + ru.slice(k + 1);
  return ru;
}

const CLITIC_RU = { l: 'л', j: 'ж', n: 'н', d: 'д', c: 'с', qu: 'к', s: 'с', m: 'м', t: 'т' };
const LIAISON_Z = new Set(['les', 'des', 'ces', 'mes', 'tes', 'ses', 'nos', 'vos', 'leurs', 'nous', 'vous', 'ils', 'elles', 'aux', 'deux', 'trois', 'six', 'dix', 'quels', 'quelles']);
const VOWEL_START = /^(h?[aeiouyàâéèêëîïôûœ])/i;

/** Слово (без знаков препинания) → чтение со знаком ударения; словарь исключений имеет приоритет. */
function readWord(raw, words) {
  const w = raw.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(words, w)) return words[w];
  const m = /^(l|j|n|d|c|qu|s|m|t)[’'](.+)$/.exec(w);
  if (m) {
    const rest = Object.prototype.hasOwnProperty.call(words, m[2]) ? words[m[2]].replace(new RegExp(ACUTE, 'g'), '') : graphemes(stripSilentFinal(m[2]), stripSilentFinal(m[2]).length < m[2].length);
    const cl = m[1] === 'c' && /^(est|était|etait)/.test(m[2]) ? 'с' : CLITIC_RU[m[1]];
    return markLast(cl + rest);
  }
  return markLast(graphemes(stripSilentFinal(w), stripSilentFinal(w).length < w.length));
}

/** Фраза → чтение (строка). words — словарь исключений { слово: чтение }. Лиэзон «з» после mes/nous/vous/ils… перед гласной. */
function translitFr(text, words = {}) {
  const raw = String(text).replace(/[«»"?!.,;:…]/g, ' ').split(/\s+/).filter(Boolean);
  const toks = [];
  for (const r of raw) {
    if (Object.prototype.hasOwnProperty.call(words, r.toLowerCase())) { toks.push(r); continue; } // слово через дефис есть в словаре целиком (rendez-vous)
    for (const part of r.split(/-(?=[\p{L}])/u)) if (part) toks.push(part);
  }
  const out = [];
  for (let i = 0; i < toks.length; i += 1) {
    let reading = readWord(toks[i], words);
    const prev = i > 0 ? toks[i - 1].toLowerCase() : '';
    if (LIAISON_Z.has(prev) && VOWEL_START.test(toks[i].toLowerCase()) && !/^(h)/i.test(toks[i])) reading = 'з' + reading;
    // зачем (Ревизор 06.11, класс 2): после c'est перед гласной лиэзон [t] обязателен — «сэ тюн», «сэ та» (c'est un/une/à/ici)
    else if (/^c[’']est$/.test(prev) && VOWEL_START.test(toks[i].toLowerCase()) && !/^(h)/i.test(toks[i])) reading = 'т' + reading;
    out.push(reading);
  }
  return out.join(' ');
}

/** Украинское чтение из русского: э→е, и→і, ы→и, ё→е после ж/ш/д/н/т/з и в начале, иначе ьо. */
function ruToUk(ru) {
  return ru
    .replace(/э/g, 'е').replace(/Э/g, 'Е')
    // зачем (Ревизор 06.11, класс 3): [i] по-украински всегда «і», в том числе после к — qui/qu'il/ci = «кі/кіль» (Теория пишет так же: 29.01, 08.12)
    .replace(/и/g, 'і').replace(/И/g, 'І')
    .replace(/ы/g, 'и')
    .replace(/ье/g, 'ьє') // бьэн → бьєн
    // зачем: так Теория пишет ё по-украински на 294 готовых чтениях: жё→же, слово «ён» (un; в связке «тён»)→ен, ё в начале слова→е, дёо́р→део́р, иначе ё→ьо (лё→льо, кё→кьо)
    .replace(/(?<=ж)ё/g, 'е')
    .replace(/(?<=^|\s)(т?)ён(?=\s|$)/g, '$1ен')
    .replace(/(?<=^|\s)ё/g, 'е')
    .replace(/дёо/g, 'део')
    // зачем (Ревизор 06.11, класс 4): после мягкого знака ё не удваивает его — mieux «мьё» → «мьо́», не «мььо́»
    .replace(/(?<=ь)ё/g, 'о')
    .replace(/ё/g, 'ьо');
}

module.exports = { translitFr, ruToUk, graphemes, stripSilentFinal, markLast, syllableCount };
