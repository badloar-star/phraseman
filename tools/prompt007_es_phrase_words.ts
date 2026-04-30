/**
 * PROMPT-007: строит испанские `words` + сохраняет прежние как `wordsEn` для уроков 9–16.
 * Дистракторы: по 5 шт.; комментарии D1–D5 с реальной мотивировкой для item review.
 * Запуск: npx tsx tools/prompt007_es_phrase_words.ts
 */
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import type { LessonPhrase, LessonWord } from '../app/lesson_data_types';
import {
  LESSON_9_PHRASES,
  LESSON_10_PHRASES,
  LESSON_11_PHRASES,
  LESSON_12_PHRASES,
  LESSON_13_PHRASES,
  LESSON_14_PHRASES,
  LESSON_15_PHRASES,
  LESSON_16_PHRASES,
} from '../app/lesson_data_9_16.ts';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dir, '..', 'app', 'lesson_data_9_16_phrases_es.gen.ts');

const stripMarkers = (word: string): string => {
  const stripped = word
    .replace(/^\/|\/$/g, '')
    .replace(/«-»/g, '')
    .replace(/[«»]/g, '')
    .replace(/[.!?,;]+$/g, '')
    .trim();
  return stripped === '-' ? '' : stripped;
};

function cleanPhraseLikeLesson1(surface: string): string {
  return surface.split(' ').map(stripMarkers).filter((w) => w.length > 0).join(' ');
}

/** Разбиение испанской поверхности на токены для сборки (¿/¡ отдельно; пунктуация с конца слова отделяется). */
export function tokenizeSpanishSurface(surface: string): string[] {
  const raw = surface.trim();
  const out: string[] = [];
  for (let part of raw.split(/\s+/)) {
    if (!part) continue;
    if (part.startsWith('¿')) {
      out.push('¿');
      part = part.slice(1);
      if (!part) continue;
    } else if (part.startsWith('¡')) {
      out.push('¡');
      part = part.slice(1);
      if (!part) continue;
    }
    const m = part.match(/^(.+?)([.?!,:;]+)$/);
    if (m) {
      out.push(m[1]);
      for (const ch of m[2]) out.push(ch);
    } else {
      out.push(part);
    }
  }
  return out.filter((t) => t.length > 0);
}

const PAD = [
  'muy', 'más', 'menos', 'bien', 'mal', 'poco', 'mucho', 'muchas', 'muchos',
  'tan', 'tanto', 'aún', 'ya', 'solo', 'sólo', 'así', 'casi', 'nunca', 'siempre',
  'aquel', 'aquella', 'algún', 'alguna', 'ningún', 'ninguna', 'cada', 'otro', 'otra',
  'donde', 'cuando', 'porque', 'aunque', 'también', 'tampoco',
];

const DEMOSTRATIVOS = new Set([
  'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas', 'aquel', 'aquella', 'aquellos', 'aquellas',
]);

const ADVERBIOS_COMUNES = new Set([
  'hoy', 'ahora', 'ayer', 'tarde', 'temprano', 'pronto', 'siempre', 'nunca', 'ya', 'todavía', 'mismo', 'aquí', 'allí',
]);

const INFINITIVO_RE = /(ar|er|ir)$/i;

const MODAL_FINITE_POOL: Record<string, string[]> = {
  puedo: ['Puedes', 'Puede', 'Podemos', 'Sabes', 'Tengo'],
  puedes: ['Puedo', 'Puede', 'Podéis', 'Sabe', 'Vas'],
  puede: ['Puedo', 'Pueden', 'Podría', 'Debe', 'Sabe'],
  podemos: ['Pueden', 'Puedo', 'Debemos', 'Tenemos', 'Sabemos'],
  pueden: ['Podemos', 'Puede', 'Puedes', 'Deben', 'Saben'],
  debe: ['Debes', 'Deben', 'Puede', 'Tienes', 'Quieres'],
  debes: ['Debe', 'Debemos', 'Puedes', 'Tienes', 'Haces'],
  debemos: ['Deben', 'Debes', 'Tenemos', 'Podemos', 'Hemos'],
  deben: ['Debe', 'Debemos', 'Pueden', 'Tienen', 'Van'],
  tenemos: ['Tienes', 'Tienen', 'Hemos', 'Vamos', 'Debemos'],
  tienes: ['Tenemos', 'Tiene', 'Tienen', 'Vas', 'Haces'],
  tiene: ['Tienes', 'Tienen', 'Tenemos', 'Hace', 'Viene'],
  tienen: ['Tiene', 'Tenemos', 'Pueden', 'Van', 'Son'],
};

const POOL_BY_LEMMA: Record<string, string[]> = {
  ...MODAL_FINITE_POOL,
  hay: ['Está', 'Están', 'Había', 'Tiene', 'Existen'],
  está: ['Es', 'Hay', 'Anda', 'Queda', 'Sigue'],
  están: ['Es', 'Hay', 'Han', 'Van', 'Serán'],
  en: ['A', 'De', 'Por', 'Con', 'Sin'],
  a: ['De', 'En', 'Por', 'Hasta', 'Sin'],
  de: ['En', 'A', 'Del', 'Con', 'Sin'],
  el: ['La', 'Los', 'Las', 'Un', 'Una'],
  la: ['El', 'Los', 'Las', 'Una', 'Lo'],
  los: ['Las', 'El', 'La', 'Unos', 'Unas'],
  las: ['Los', 'El', 'La', 'Unas', 'Unos'],
  un: ['Una', 'Unos', 'El', 'La', 'Lo'],
  una: ['Un', 'Unas', 'La', 'El', 'Este'],
  unos: ['Unas', 'Un', 'Algunos', 'Varias', 'Los'],
  unas: ['Unos', 'Una', 'Algunas', 'Varios', 'Las'],
  mi: ['Tu', 'Su', 'Mis', 'Nuestro', 'Vuestra'],
  tu: ['Su', 'Mi', 'Tus', 'Vuestro', 'Nuestra'],
  su: ['Mi', 'Tu', 'Sus', 'Nuestro', 'Vuestra'],
  mis: ['Tus', 'Sus', 'Mi', 'Nuestras', 'Vuestras'],
  tus: ['Sus', 'Mis', 'Tu', 'Vuestras', 'Nuestras'],
  no: ['Ni', 'Ya', 'Tampoco', 'Nunca', 'Sí'],
  sí: ['No', 'Tal', 'Quizá', 'Nunca', 'Jamás'],
  y: ['O', 'Pero', 'Ni', 'E', 'U'],
  o: ['Y', 'Ni', 'U', 'Pero', 'Mas'],
  que: ['Quién', 'Cuál', 'Donde', 'Porque', 'Cuando'],
  como: ['Cuando', 'Donde', 'Porque', 'Que', 'Mientras'],
  '\u00bf': ['\u00a1', '.', ',', ';', ':'],
  '?': ['.', '!', ',', ';', ':'],
  '.': [',', ';', ':', '!', '?'],
  '!': ['?', '.', ',', ';', ':'],
  '¡': ['¿', '.', ',', ';', ':'],
};

const INFINITIVO_ALT = ['hablar', 'comer', 'vivir', 'ver', 'hacer', 'decir', 'ir', 'dar', 'poner', 'salir'];

/** Palabras que acaban en -ar/-er/-ir pero no son infinitivo (falsos positivos). */
const NO_INFINITIVO_LEX = new Set([
  'ayer',
  'mujer',
  'taller',
  'primer',
  'invierno',
  'aquí',
  'allí',
  'después',
  'antes',
  'donde',
  'madre',
  'padre',
  'por',
  'para',
]);

function normKey(tok: string): string {
  return stripMarkers(tok)
    .replace(/^[¿¡]+/, '')
    .toLowerCase();
}

/** Misma lógica que ES: puntuación final separada (EN no usa ¿ ¡). */
function tokenizeEnglishSurface(surface: string): string[] {
  return tokenizeSpanishSurface(surface);
}

const PAD_EN = [
  'very', 'really', 'quite', 'too', 'also', 'just', 'still', 'even', 'only', 'maybe', 'never', 'always',
  'today', 'now', 'then', 'here', 'there', 'often', 'again',
];

const EN_POOL_BY_LEMMA: Record<string, string[]> = {
  there: ['Their', "They're", 'Three', 'Here', 'This'],
  is: ['Are', 'Am', 'Be', 'Was', 'Has'],
  are: ['Is', 'Am', 'Be', 'Were', 'Art'],
  am: ['Is', 'Are', 'Be', 'Was', 'M'],
  was: ['Is', 'Were', 'Be', 'Has', 'Did'],
  were: ['Was', 'Are', 'Be', 'We', 'Where'],
  be: ['Been', 'Being', 'Is', 'Are', 'Am'],
  have: ['Has', 'Had', 'Having', 'He', 'Half'],
  has: ['Have', 'Having', 'Had', 'Hast', 'As'],
  had: ['Has', 'Have', 'Have', 'Hard', 'Hat'],
  do: ['Does', 'Did', 'Done', 'Do', 'Dog'],
  does: ['Do', 'Did', 'Done', 'Dose', 'Dogs'],
  did: ['Do', 'Does', 'Done', 'Dead', 'Dip'],
  can: ['Could', 'Must', 'May', 'Will', 'Should'],
  could: ['Can', 'Must', 'May', 'Would', 'Would'],
  must: ['Can', 'Should', 'Will', 'May', 'Need'],
  should: ['Could', 'Must', 'Would', 'Shall', 'Would'],
  will: ['Well', 'Shall', 'Would', 'Can', "We'll"],
  would: ['Will', 'Could', 'Should', 'Wood', 'Wound'],
  may: ['Can', 'Might', 'Must', 'My', 'Many'],
  might: ['May', 'Night', 'Right', 'mite', 'Mild'],
  shall: ['Will', 'Sell', 'Shell', 'Shall', 'Shall'],
  a: ['An', 'The', 'And', 'As', 'At'],
  an: ['A', 'The', 'And', 'Am', 'In'],
  the: ['Then', 'Than', 'That', 'This', 'Thus'],
  and: ['An', 'End', 'Ant', 'Hand', 'Land'],
  or: ['Are', 'Our', 'Of', 'For', 'Nor'],
  but: ['Bat', 'Bit', 'Buy', 'Bus', 'Bun'],
  if: ['It', 'Is', 'In', 'Of', 'Off'],
  in: ['On', 'At', 'To', 'Of', 'By'],
  on: ['In', 'At', 'To', 'Of', 'By'],
  at: ['In', 'On', 'To', 'It', 'As'],
  to: ['Two', 'Too', 'So', 'Go', 'Top'],
  of: ['Off', 'If', 'Or', 'For', 'Oh'],
  for: ['Four', 'Far', 'Fire', 'From', 'Fold'],
  with: ['Wish', 'Width', 'Will', 'White', 'Which'],
  from: ['Form', 'Frog', 'For', 'Rome', 'Front'],
  by: ['Buy', 'But', 'My', 'Be', 'Bay'],
  about: ['Above', 'Around', 'Bought', 'Abort', 'Abut'],
  into: ['Onto', 'In', 'To', 'Info', 'Intro'],
  not: ['No', 'Now', 'Any', 'None', 'Know'],
  no: ['Not', 'Now', 'Any', 'Know', 'Nor'],
  yes: ['Yet', 'You', 'Yesterday', 'Less', 'Mess'],
  i: ['Me', 'My', 'Eye', 'Hi', 'Mine'],
  you: ['Your', 'Yours', 'We', 'They', 'He'],
  he: ['She', 'They', 'We', 'You', 'It'],
  she: ['He', 'They', 'We', 'You', 'Sea'],
  it: ['Is', 'Its', 'If', 'In', 'At'],
  we: ['Way', 'Us', 'Our', 'Why', 'West'],
  they: ['Them', 'Their', 'There', 'Thee', 'These'],
  me: ['My', 'Be', 'We', 'He', 'Sea'],
  him: ['His', 'He', 'Them', 'Ham', 'Hum'],
  her: ['Here', 'Him', 'His', 'Hair', 'Hers'],
  us: ['As', 'Is', 'Up', 'Use', 'Bus'],
  my: ['Me', 'Mine', 'I', 'May', 'By'],
  your: ['You', 'Yours', 'Our', 'Their', 'Year'],
  his: ['He', 'Him', 'Has', 'Is', 'This'],
  their: ['There', 'They', 'The', 'Them', 'Three'],
  this: ['That', 'These', 'Those', 'Thus', 'Thin'],
  that: ['This', 'These', 'Those', 'Than', 'Then'],
  these: ['The', 'Those', 'This', 'Theses', 'Thee'],
  those: ['These', 'That', 'The', 'Though', 'Wrote'],
  some: ['Same', 'Sum', 'Any', 'Come', 'Sometimes'],
  any: ['Many', 'Much', 'My', 'And', 'A'],
  many: ['Much', 'Money', 'May', 'Any', 'Main'],
  much: ['Many', 'Such', 'March', 'Luck', 'Chip'],
  all: ['Ill', 'Awl', 'Alley', 'Ally', 'Ale'],
  every: ['Very', 'Even', 'Ever', 'Entry', 'Erase'],
  both: ['Bath', 'Boss', 'Boat', 'Bolt', 'Bone'],
  such: ['Much', 'Such', 'Search', 'Suck', 'Touch'],
  who: ['How', 'Whom', 'Whose', 'Two', 'Why'],
  what: ['Wheat', 'Wait', 'That', 'Watt', 'Want'],
  when: ['Went', 'Then', 'Where', 'Went', 'Win'],
  where: ['Were', 'Wear', 'What', 'Wheat', 'Wire'],
  why: ['Way', 'While', 'Cry', 'Try', 'White'],
  how: ['Who', 'Now', 'Cow', 'Low', 'Hoe'],
  which: ['Witch', 'Whistle', 'Rich', 'Winch', 'Wilch'],
  '?': ['.', '!', ',', ';', ':'],
  '.': [',', ';', ':', '!', '?'],
  '!': ['?', '.', ',', ';', ':'],
};

function enLemmaKey(tok: string): string {
  const k = stripMarkers(tok).toLowerCase();
  if (k === "i'm" || k === "i've" || k === "i'll") return k.slice(0, 1);
  return k.replace(/^['"]/, '').replace(/['"]$/, '');
}

function distractorsForEnglish(correct: string, allToks: string[], idx: number, lessonId: number): string[] {
  const key = enLemmaKey(correct);
  const pool: string[] = [];
  const used = new Set<string>([correct.toLowerCase(), stripMarkers(correct).toLowerCase()]);

  const pushU = (w: string) => {
    const sk = stripMarkers(w).toLowerCase();
    if (!w || !sk) return;
    if (!used.has(sk)) {
      used.add(sk);
      pool.push(w);
    }
  };

  for (const d of EN_POOL_BY_LEMMA[key] ?? []) pushU(d);
  for (let i = 0; i < allToks.length; i++) {
    if (i === idx) continue;
    const o = stripMarkers(allToks[i]);
    if (o && o !== '?' && o !== '.' && o !== '!') pushU(o);
  }
  const seed = lessonId * 991 + idx * 29;
  for (let j = 0; j < PAD_EN.length && pool.length < 14; j++) {
    pushU(PAD_EN[(seed + j) % PAD_EN.length]);
  }
  const five: string[] = [];
  for (const x of pool) {
    if (five.length >= 5) break;
    five.push(x);
  }
  let padI = 0;
  while (five.length < 5) {
    const p = PAD_EN[(seed + padI++) % PAD_EN.length];
    if (!used.has(p)) {
      used.add(p);
      five.push(p);
    }
    if (padI > 200) break;
  }
  return five.slice(0, 5);
}

function enCategoryForToken(tok: string): string | undefined {
  const k = enLemmaKey(tok);
  if (['in', 'on', 'at', 'to', 'of', 'by', 'for', 'with', 'from', 'about', 'into'].includes(k)) return 'preposition';
  return undefined;
}

function wordsEnMisaligned(existing: LessonWord[] | undefined, enToks: string[]): boolean {
  if (!existing?.length) return true;
  if (existing.length !== enToks.length) return true;
  for (let i = 0; i < enToks.length; i++) {
    const a = stripMarkers(existing[i].text);
    const b = stripMarkers(enToks[i]);
    if (a.toLowerCase() !== b.toLowerCase()) return true;
  }
  return false;
}

function buildEnglishWords(enToks: string[], lessonId: number): LessonWord[] {
  return enToks.map((t, i) => {
    const correct = stripMarkers(t) || t;
    const d = distractorsForEnglish(correct, enToks, i, lessonId);
    const cat = enCategoryForToken(t);
    return {
      text: t,
      correct: t,
      distractors: d,
      ...(cat ? { category: cat } : {}),
    } as LessonWord;
  });
}

function isInfinitivo(surface: string): boolean {
  const k = normKey(surface);
  if (k.length < 4) return false;
  if (/^(por|para|muy|tan|más|menos)$/.test(k)) return false;
  if (NO_INFINITIVO_LEX.has(k)) return false;
  return INFINITIVO_RE.test(k);
}

function distractorsFor(
  correct: string,
  allToks: string[],
  idx: number,
  lessonId: number,
  category: string,
): string[] {
  const key = normKey(correct);
  const pool: string[] = [];
  const used = new Set<string>([correct.toLowerCase(), stripMarkers(correct).toLowerCase()]);

  const pushU = (w: string) => {
    const k = w.toLowerCase();
    const sk = stripMarkers(w).toLowerCase();
    if (!w || sk.length === 0) return;
    if (!used.has(k) && !used.has(sk)) {
      used.add(k);
      used.add(sk);
      pool.push(w);
    }
  };

  if (category === 'verbo_infinitivo') {
    for (const d of INFINITIVO_ALT) pushU(d);
  }
  for (const d of POOL_BY_LEMMA[key] ?? []) pushU(d);
  for (let i = 0; i < allToks.length; i++) {
    if (i === idx) continue;
    const o = stripMarkers(allToks[i]);
    if (o && o !== '¿' && o !== '?' && o !== '.' && o !== '!') pushU(o);
  }
  const seed = lessonId * 997 + idx * 31;
  for (let j = 0; j < PAD.length && pool.length < 12; j++) {
    pushU(PAD[(seed + j) % PAD.length]);
  }
  const five: string[] = [];
  for (const x of pool) {
    if (five.length >= 5) break;
    five.push(x);
  }
  let padI = 0;
  while (five.length < 5) {
    const p = PAD[(seed + padI++) % PAD.length];
    if (!used.has(p)) {
      used.add(p);
      five.push(p);
    }
    if (padI > 200) break;
  }
  return five.slice(0, 5);
}

function categoryForToken(tok: string, lessonId: number): string {
  const k = normKey(tok);
  if (tok === '¿' || tok === '?' || tok === '.' || tok === '!' || tok === '¡') return 'puntuacion';
  if (['hay', 'había', 'hubo', 'habrá'].includes(k)) return 'impersonal_haber';
  if (['en', 'a', 'de', 'por', 'para', 'con', 'sin', 'sobre', 'entre', 'hasta', 'desde'].includes(k))
    return 'preposicion';
  if (['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'lo'].includes(k)) return 'articulo';
  if (
    ['mi', 'tu', 'su', 'mis', 'tus', 'sus', 'nuestro', 'nuestra', 'nuestros', 'nuestras', 'vuestro', 'vuestra'].includes(
      k,
    )
  )
    return 'posesivo';
  if (['no', 'sí', 'ni', 'tampoco'].includes(k)) return 'negacion_afirmacion';
  if (DEMOSTRATIVOS.has(k)) return 'demostrativo';
  if (ADVERBIOS_COMUNES.has(k)) return 'adverbio';
  if (k === 'que') return 'conjuncion';
  if (k === 'mismo' || k === 'misma') return 'adjetivo';
  if (
    [
      'puedo', 'puedes', 'puede', 'podemos', 'pueden',
      'debe', 'debes', 'debemos', 'deben',
      'tenemos', 'tienes', 'tiene', 'tienen',
      'quiero', 'quieres', 'quiere',
    ].includes(k)
  )
    return 'verbo_modal_o_perifrasis';
  if (isInfinitivo(tok)) return 'verbo_infinitivo';
  if (lessonId === 10) {
    if (['traducir', 'firmar', 'arreglar', 'comprar', 'revisar', 'explicar', 'terminar', 'viajar'].includes(k))
      return 'verbo_infinitivo';
    return 'lexico_oracion';
  }
  if (lessonId >= 11 && lessonId <= 12) return 'aspecto_tiempo_past';
  if (lessonId === 13) return 'futuro_simple_ir_a';
  if (lessonId === 14) return 'grado_comparacion';
  if (lessonId === 15) return 'posesivo_concordancia';
  if (lessonId === 16) return 'verbo_frasal_es';
  return 'lexico_oracion';
}

/** Una строка D1…D5: мотивировка именно для пары (clave, дистрактор). */
function rationaleForDistractor(
  correctRaw: string,
  distractor: string,
  category: string,
  lessonId: number,
  allToks: string[],
  idx: number,
): string {
  const c = stripMarkers(correctRaw) || correctRaw;
  const d = stripMarkers(distractor) || distractor;
  const ck = normKey(c);
  const dk = normKey(d);

  const isSister = allToks.some((t, j) => j !== idx && normKey(t) === dk);

  if (category === 'puntuacion') {
    if (c === '¿') {
      return `apertura de enunciado (¡ / . / ,) ignorando norma ¿? en español`;
    }
    if (c === '?') return `cierre de enunciado (. / ! / …) en lugar de interrogación`;
    if (c === '.') return `pausa equivocada (; , ! ?) en cierre declarativo`;
    return `marca de puntuación ajena al valor ilocutivo`;
  }

  if (isSister) {
    return `constituyente colindante de la misma oración (trampa de orden / slot)`;
  }

  if ((ck === 'hay' || ck === 'había') && ['está', 'están', 'es', 'son'].includes(dk)) {
    return `existencia impersonal (haber) vs ubicación/estado (estar/ser); PROMPT-003 l9`;
  }
  if ((ck === 'hay' || ck === 'había') && dk === 'tiene') {
    return `calco posesivo rus./ukr. «у меня есть» → *tiene* en lugar de hay`;
  }
  if ((ck === 'hay' || ck === 'había') && dk === 'existen') {
    return `existen — registro marcado; en A2 coloquial prima hay`;
  }

  if (category === 'articulo') {
    return `sustituye el artículo correcto «${c}» por «${d}» (género/número o definición indebida)`;
  }
  if (category === 'preposicion') {
    return `«${d}» en el lugar de «${c}» (confusión en la red preposicional española; mapa EN on/in/at ≠ ES)`;
  }
  if (category === 'posesivo' || category === 'posesivo_concordancia') {
    return `«${d}» por «${c}» (otra persona o número del posesivo; interferencia RU/UK → ES)`;
  }
  if (category === 'demostrativo') {
    if (!DEMOSTRATIVOS.has(dk))
      return `«${d}» en el lugar de «${c}» (intruso no deíctico en posición de demostrativo)`;
    return `«${d}» por «${c}» (grado demostrativo o concordancia; este/ese/aquel)`;
  }
  if (category === 'negacion_afirmacion') {
    return `polaridad o adverbio de negación mal elegido (no/ni/tampoco…)`;
  }
  if (category === 'verbo_modal_o_perifrasis') {
    if (lessonId === 10) {
      return `«${d}» vs «${c}» (persona/tiempo modal o deber); EN *can* + base ↔ ES pued- + infinitivo — PROMPT-003 l10`;
    }
    return `«${d}» vs «${c}» (modal o perífrasis vecina)`;
  }
  if (category === 'verbo_infinitivo') {
    return `«${d}» colado en el slot de «${c}» (otro infinitivo tras modal / tener que / deber)`;
  }
  if (category === 'impersonal_haber') {
    return `alternativa a haber impersonal (aspecto o verbo locativo)`;
  }
  if (category === 'conjuncion' && ck === 'que') {
    return `relativo/conector confundido (quien/cuando/porque) en perífrasis o subordinación`;
  }
  if (category === 'adverbio') {
    return `adv. temporal o foco próximo (hoy/ahora/ya…) mal encajado`;
  }
  if (category === 'grado_comparacion') {
    return `grado adjetival alterno (más/menos/tan) o colocación`;
  }
  if (category === 'aspecto_tiempo_past') {
    return `forma pret/imperf/incorrecto auxiliar (interferencia aspectual l11–12)`;
  }
  if (category === 'futuro_simple_ir_a') {
    return `futuro competidor (ir a + inf / tiempo mal elegido)`;
  }
  if (category === 'verbo_frasal_es') {
    return `colocación verbal / partícula en falso amigo con inglés phrasal`;
  }

  if (PAD.includes(dk) || dk.length < 3) {
    return `palabra función o relleno frecuente (ruido plausible en producción oral)`;
  }
  return `colisión léxica o vecino semántico del campo léxico del turno`;
}

function buildRationaleComment(
  correctRaw: string,
  distractors: string[],
  category: string,
  lessonId: number,
  allToks: string[],
  idx: number,
): string {
  const parts = distractors.map((dist, i) =>
    `D${i + 1}: ${rationaleForDistractor(correctRaw, dist, category, lessonId, allToks, idx)}`,
  );
  return ` // ${parts.join('; ')}`;
}

const ALT_ES_BY_EN_ID: Record<string, string[]> = {};

/** Ручные испанские параллели к англ. alternatives (инвариант региона нейтрален). */
function seedAltMap() {
  ALT_ES_BY_EN_ID['lesson9_phrase_3'] = ['¿Hay un parque amplio en esta ciudad?'];
  ALT_ES_BY_EN_ID['lesson9_phrase_7'] = ['Hay muchos coches por la calle.'];
  ALT_ES_BY_EN_ID['lesson9_phrase_21'] = ['Hay una mesa redonda en esta habitación.'];
  ALT_ES_BY_EN_ID['lesson9_phrase_37'] = ['Hay una bicicleta roja en mi garaje.'];
  ALT_ES_BY_EN_ID['lesson9_phrase_45'] = ['Hay muchas nubes grises en el cielo.'];
}

function buildPhrase(p: LessonPhrase, lessonId: number): LessonPhrase {
  const surf = p.spanish?.trim();
  if (!surf) throw new Error(`Missing spanish for ${p.id}`);
  const enToks = tokenizeEnglishSurface((p.english ?? '').trim());
  let wordsEn: LessonWord[] = JSON.parse(JSON.stringify(p.wordsEn ?? [])) as LessonWord[];
  if (wordsEnMisaligned(wordsEn, enToks)) {
    wordsEn = buildEnglishWords(enToks, lessonId);
  }
  const toks = tokenizeSpanishSurface(surf);
  const rebuilt = cleanPhraseLikeLesson1(toks.join(' '));
  const check = cleanPhraseLikeLesson1(surf.replace(/^¿\s*/, '¿').replace(/\s+/g, ' '));
  if (rebuilt !== check && rebuilt.replace(/\s/g, '') !== check.replace(/\s/g, '')) {
    console.warn(`Token join mismatch ${p.id}: «${rebuilt}» vs «${check}»`);
  }

  const newWords: LessonWord[] = toks.map((t, i) => {
    const correct = stripMarkers(t) || t;
    const cat = categoryForToken(t, lessonId);
    const d = distractorsFor(correct, toks, i, lessonId, cat);
    return {
      text: t,
      correct: t,
      distractors: d,
      category: cat,
    } as LessonWord;
  });

  const altEs = ALT_ES_BY_EN_ID[String(p.id)];

  return {
    ...p,
    words: newWords,
    wordsEn,
    alternativesEs: altEs ?? p.alternativesEs,
  };
}

function escapeStr(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function serializeWord(
  w: LessonWord,
  lessonId: number,
  allToks: string[],
  idx: number,
): string {
  const dStr = w.distractors.map((x) => `'${escapeStr(x)}'`).join(', ');
  const cat = w.category ? `, category: '${escapeStr(w.category)}'` : '';
  const dComment = buildRationaleComment(w.correct, w.distractors, w.category ?? 'lexico_oracion', lessonId, allToks, idx);
  return `      { text: '${escapeStr(w.text)}', correct: '${escapeStr(w.correct)}', distractors: [${dStr}]${cat} },${dComment}`;
}

function serializeLesson(name: string, phrases: LessonPhrase[], lessonId: number): string {
  const body = phrases
    .map((p) => {
      const built = buildPhrase(p, lessonId);
      const altLine =
        built.alternatives?.length ?
          `    alternatives: [${built.alternatives.map((a) => `'${escapeStr(a)}'`).join(', ')}],\n`
        : '';
      const altEsLine =
        built.alternativesEs?.length ?
          `    alternativesEs: [${built.alternativesEs.map((a) => `'${escapeStr(a)}'`).join(', ')}],\n`
        : '';
      const toks = tokenizeSpanishSurface(built.spanish ?? '');
      const wLines = built.words!.map((w, i) => serializeWord(w, lessonId, toks, i)).join('\n');
      const wordsEnLines =
        built.wordsEn!.map((w) => {
          const dStr = w.distractors.map((x) => `'${escapeStr(x)}'`).join(', ');
          const cat = w.category ? `, category: '${escapeStr(w.category)}'` : '';
          return `      { text: '${escapeStr(w.text)}', correct: '${escapeStr(w.correct)}', distractors: [${dStr}]${cat} }`;
        })
        .join(',\n');
      return `  {
    id: '${escapeStr(String(built.id))}',
    english: '${escapeStr(built.english)}',
${altLine}${altEsLine}    russian: '${escapeStr(built.russian)}',
    ukrainian: '${escapeStr(built.ukrainian)}',
    spanish: '${escapeStr(built.spanish ?? '')}',
    words: [
${wLines}
    ],
    wordsEn: [
${wordsEnLines}
    ],
  },`;
    })
    .join('\n');
  return `export const ${name}: LessonPhrase[] = [\n${body}\n];\n`;
}

function main() {
  seedAltMap();
  const hdr = `// AUTO-GENERATED by tools/prompt007_es_phrase_words.ts — испанские токены L2 + wordsEn (EN).\n// Regenerar: npx tsx tools/prompt007_es_phrase_words.ts\n// wordsEn se reconstruye desde english si falta o no alinea con los tokens EN.\n\nimport type { LessonPhrase } from './lesson_data_types';\n\n`;
  const chunks = [
    serializeLesson('LESSON_9_PHRASES', LESSON_9_PHRASES, 9),
    serializeLesson('LESSON_10_PHRASES', LESSON_10_PHRASES, 10),
    serializeLesson('LESSON_11_PHRASES', LESSON_11_PHRASES, 11),
    serializeLesson('LESSON_12_PHRASES', LESSON_12_PHRASES, 12),
    serializeLesson('LESSON_13_PHRASES', LESSON_13_PHRASES, 13),
    serializeLesson('LESSON_14_PHRASES', LESSON_14_PHRASES, 14),
    serializeLesson('LESSON_15_PHRASES', LESSON_15_PHRASES, 15),
    serializeLesson('LESSON_16_PHRASES', LESSON_16_PHRASES, 16),
  ];
  writeFileSync(OUT, hdr + chunks.join('\n'), 'utf8');
  console.log('Wrote', OUT);
}

main();
