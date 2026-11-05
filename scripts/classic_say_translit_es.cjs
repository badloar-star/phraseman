'use strict';
// зачем (владелец 06.11, «Читается» в теории всех курсов; 307 примеров теории es в старом формате без чтения): испанская орфография почти фонетична, поэтому чтение
// кириллицей с ударением строится ПРАВИЛАМИ, а не от руки — и проверяется на готовых чтениях теории es (236 примеров, которые написал человек): правила подогнаны так,
// чтобы воспроизводить их стиль (э/е, ль, ья/ье, й для ll и y, ударение U+0301 только в словах из двух и более слогов).
// Использование: const { translitEs } = require('./classic_say_translit_es.cjs'); translitEs('¿Dónde estás?', 'ru') → 'до́нде эста́с'.

const ACUTE = '́';
const STRONG = 'aeoáéó';
const WEAK = 'iuü';
const ACC_WEAK = 'íú';
const VOW = 'aeiouáéíóúü';
const NAMES = new Set(['ana', 'luis']);

const isV = (ch) => !!ch && VOW.includes(ch);

/** Разбор слова на группы гласных (ядра слогов) с учётом дифтонгов/хиатусов. Возвращает массив ядер [{start,end,stress}] по индексам букв. */
function nuclei(w) {
  if (w === 'luis') return [{ start: 1, end: 1, hasAccent: false }, { start: 2, end: 2, hasAccent: true }]; // зачем: теория читает имя как Лу-и́с (две гласные), не как односложное
  const out = [];
  let i = 0;
  while (i < w.length) {
    if (!isV(w[i])) { i += 1; continue; }
    // «qu»/«gu» перед e,i: u не гласная
    if (w[i] === 'u' && i > 0 && ((w[i - 1] === 'q') || (w[i - 1] === 'g' && 'eiéí'.includes(w[i + 1] ?? '')))) { i += 1; continue; }
    let j = i + 1;
    const cur = { start: i, end: i, hasAccent: 'áéíóú'.includes(w[i]) };
    // присоединяем следующую гласную, если это дифтонг
    while (j < w.length && isV(w[j])) {
      const a = w[j - 1];
      const b = w[j];
      const aStrongUn = 'aeo'.includes(a);
      const bStrongUn = 'aeo'.includes(b);
      const aWeakUn = 'iuü'.includes(a);
      const bWeakUn = 'iuü'.includes(b);
      const aStrongAcc = 'áéó'.includes(a);
      const bStrongAcc = 'áéó'.includes(b);
      const diph = ((aWeakUn && (bStrongUn || bStrongAcc)) || ((aStrongUn || aStrongAcc) && bWeakUn) || (aWeakUn && bWeakUn));
      if (!diph) break;
      cur.end = j;
      cur.hasAccent = cur.hasAccent || 'áéíóú'.includes(b);
      j += 1;
    }
    out.push(cur);
    i = j;
  }
  return out;
}

function stressIndex(w, ns) {
  // односложное без знака («él», «fui»), но дифтонг с написанным ударением знак сохраняет (quién → кье́н) — так в теории es
  if (ns.length <= 1) return ns.length === 1 && ns[0].hasAccent && ns[0].end > ns[0].start ? 0 : -1;
  const accIdx = ns.findIndex((n) => n.hasAccent);
  if (accIdx >= 0) return accIdx;
  if (ns.length <= 1) return -1; // односложное (в т.ч. «él», «fui») — без знака
  const last = w[w.length - 1];
  return 'aeiouns'.includes(last) ? ns.length - 2 : ns.length - 1;
}

/** Индекс буквы внутри ядра, на которую ставится знак: сильная гласная; иначе вторая слабая (в «ui» — i, в «iu» — u). */
function markLetterIndex(w, n) {
  let best = -1;
  for (let k = n.start; k <= n.end; k += 1) {
    if ('aeoáéó'.includes(w[k])) { best = k; break; }
  }
  if (best >= 0) return best;
  // слабые: акцентированная, иначе последняя
  for (let k = n.start; k <= n.end; k += 1) if ('íú'.includes(w[k])) return k;
  return n.end;
}

const plain = (c) => ({ á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u' }[c] ?? c);

function translitWord(raw, loc, firstOfSentence) {
  const lower = raw.toLowerCase();
  if (lower === 'inglés' && loc === 'ru') return 'инглэ́с'; // зачем: так записано в теории es (единственное «э» после «л»)
  const w = lower;
  const ns = nuclei(w);
  const si = stressIndex(w, ns);
  const stressLetter = si >= 0 ? markLetterIndex(w, ns[si]) : -1;
  const nucOf = (k) => ns.findIndex((n) => k >= n.start && k <= n.end);
  const isSoftE = (ch) => 'eiéí'.includes(ch ?? '');
  const uk = loc === 'uk';
  let out = '';
  let llA = false;
  let prevCons = false; // предыдущий выданный звук — согласная (для е/э)
  const e = (afterConsonant) => (uk ? 'е' : (afterConsonant ? 'е' : 'э'));
  const emit = (s, isCons) => { out += s; prevCons = isCons; };
  for (let k = 0; k < w.length; k += 1) {
    const c = w[k];
    const nx = w[k + 1];
    const pv = w[k - 1];
    let piece = null;
    let consumed = 0;
    if (isV(c)) {
      const base = plain(c);
      const n = nuclei(w)[nucOf(k)];
      const inDiph = n && n.end > n.start;
      let letter;
      // скользящий i/u перед сильной гласной в том же ядре
      const glideBefore = inDiph && 'iu'.includes(base) && !'íú'.includes(c) && k < n.end;
      if (glideBefore && base === 'i') {
        // i + гласная: после согласной «ь»+я/е/ё/ю, в начале слова «й»
        const nb = plain(w[k + 1]);
        const map = { a: 'я', e: uk ? 'є' : 'е', o: 'ё', u: 'ю' };
        const silentU = pv === 'u' && (w[k - 2] === 'q' || w[k - 2] === 'g'); // «qu»/«gu»: u не звучит, i после согласной (quién → кье́н)
        if (k === 0 || (isV(pv ?? '') && !silentU)) { piece = 'й'; letter = null; out += piece; prevCons = true; continue; }
        if (nb in map && nb !== 'i') {
          const seq = { a: 'ья', e: uk ? 'ьє' : 'ье', o: 'ьо', u: 'ью' }[nb];
          out += seq; prevCons = false; k += 1;
          if (k === stressLetter) out += ACUTE;
          continue;
        }
        if (nb === 'i') { out += 'и'; prevCons = false; continue; }
      }
      if (glideBefore && base === 'u') {
        const nb = plain(w[k + 1]);
        const seq = { a: 'уа', e: uk ? 'уе' : 'уэ', i: uk ? 'уі' : 'уи', o: 'уо' }[nb];
        if (seq) { out += seq; prevCons = false; k += 1; if (k === stressLetter) out += ACUTE; continue; }
      }
      // скользящий i/u ПОСЛЕ сильной (ai, ei, oi, au, eu)
      if (inDiph && 'iu'.includes(base) && !'íú'.includes(c) && k > n.start && 'aeoáéó'.includes(pv)) {
        out += base === 'i' ? 'й' : 'у';
        prevCons = base === 'i';
        continue;
      }
      switch (base) {
        case 'a': letter = llA ? 'я' : 'а'; llA = false; break;
        case 'e': letter = e(prevCons && out.length > 0 && !/[ьъ]$/.test(out)); break;
        case 'i': letter = uk ? 'і' : 'и'; break;
        case 'o': letter = 'о'; break;
        case 'u': letter = 'у'; break;
        default: letter = base;
      }
      out += letter;
      prevCons = false;
      if (k === stressLetter) out += ACUTE;
      continue;
    }
    // согласные
    switch (c) {
      case 'b': piece = 'б'; break;
      case 'c':
        if (nx === 'h') { piece = 'ч'; consumed = 1; } else if (isSoftE(nx)) piece = pv === 's' ? '' : 'с'; else piece = 'к'; break;
      case 'd': piece = 'д'; break;
      case 'f': piece = 'ф'; break;
      case 'g':
        if (nx === 'u' && isSoftE(w[k + 2])) { piece = 'г'; consumed = 1; } else if (isSoftE(nx)) piece = 'х'; else piece = 'г'; break;
      case 'h': piece = ''; break;
      case 'j': piece = 'х'; break;
      case 'k': piece = 'к'; break;
      case 'l':
        if (nx === 'l') {
          const after = w[k + 2];
          piece = 'iíî'.includes(after ?? '') ? 'й-' : 'й';
          if (after === 'a' && isV(pv ?? '')) llA = true;
          consumed = 1;
        } else piece = isV(nx ?? '') ? 'л' : 'ль';
        break;
      case 'm': piece = 'м'; break;
      case 'n': piece = 'н'; break;
      case 'ñ': piece = 'нь'; break;
      case 'p': piece = 'п'; break;
      case 'q': piece = 'к'; if (nx === 'u') consumed = 1; break;
      case 'r': piece = 'р'; if (nx === 'r') { piece = 'рр'; consumed = 1; } break;
      case 's': piece = 'с'; break;
      case 't': piece = 'т'; break;
      case 'v': piece = 'в'; break;
      case 'w': piece = 'в'; break;
      case 'x': piece = 'кс'; break;
      case 'y':
        piece = (isV(nx ?? '') || (k === w.length - 1 && isV(pv ?? '') && w.length > 1)) ? 'й' : (w.length === 1 && uk ? 'і' : 'и'); break;
      case 'z': piece = 'с'; break;
      default: piece = c;
    }
    out += piece;
    k += consumed;
    if (piece !== '') prevCons = true; // зачем: после «й» и «ь» «е» остаётся «е» (айе́р, бийе́те), как после согласной
  }
  const isName = NAMES.has(lower);
  if (isName || (raw[0] !== raw[0].toLowerCase() && !firstOfSentence)) out = out[0].toUpperCase() + out.slice(1);
  return out;
}

function translitEs(text, loc) {
  const words = String(text).split(/[^\p{L}]+/u).filter(Boolean);
  return words.map((w, i) => translitWord(w, loc, i === 0)).join(' ');
}

module.exports = { translitEs, translitWord, nuclei };
