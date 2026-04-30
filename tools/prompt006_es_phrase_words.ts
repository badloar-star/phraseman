/**
 * PROMPT-006: испанские `words` (L2) + `wordsEn` из legacy EN-токенов для уроков 1–8.
 * Источник: app/lesson_data_1_8_phrases_source.ts (скрипт extract_lesson_1_8_phrases_source.ts)
 * Запуск: npx tsx tools/prompt006_es_phrase_words.ts
 */
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import type { LessonPhrase, LessonWord } from '../app/lesson_data_types';
import {
  LESSON_1_PHRASES,
  LESSON_2_PHRASES,
  LESSON_3_PHRASES,
  LESSON_4_PHRASES,
  LESSON_5_PHRASES,
  LESSON_6_PHRASES,
  LESSON_7_PHRASES,
  LESSON_8_PHRASES,
} from '../app/lesson_data_1_8_phrases_source';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dir, '..', 'app', 'lesson_data_1_8_phrases_es.gen.ts');

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
  'tan', 'tanto', 'aún', 'ya', 'solo', 'así', 'casi', 'nunca', 'siempre',
  'aquel', 'aquella', 'algún', 'alguna', 'ningún', 'ninguna', 'cada', 'otro',
  'donde', 'cuando', 'porque', 'aunque', 'también', 'tampoco', 'aquí', 'allí',
  'ahora', 'después', 'antes', 'luego',
];

/** Пули дистракторов по ключу нормализованного токена (ES-419 учебная норма). */
const POOL_BY_LEMMA: Record<string, string[]> = {
  hay: ['Está', 'Están', 'Había', 'Tiene', 'Existen'],
  está: ['Es', 'Están', 'Hay', 'Anda', 'Queda'],
  están: ['Está', 'Es', 'Hay', 'Van', 'Sigue'],
  estoy: ['Estás', 'Está', 'Soy', 'He', 'Voy'],
  estás: ['Estoy', 'Está', 'Eres', 'Vas', 'Has'],
  estamos: ['Están', 'Está', 'Somos', 'Vamos', 'Tenemos'],
  soy: ['Eres', 'Es', 'Estoy', 'Fui', 'Será'],
  eres: ['Es', 'Eres', 'Soy', 'Estás', 'Serás'],
  es: ['Son', 'Está', 'Eres', 'Soy', 'Serán'],
  somos: ['Sois', 'Son', 'Estamos', 'Seremos', 'Vamos'],
  son: ['Es', 'Están', 'Somos', 'Serán', 'Van'],
  tengo: ['Tiene', 'Tienes', 'Tenemos', 'Hago', 'Voy'],
  tienes: ['Tengo', 'Tiene', 'Tenéis', 'Haces', 'Vas'],
  tiene: ['Tienes', 'Tengo', 'Tienen', 'Hace', 'Va'],
  tenemos: ['Tienen', 'Tiene', 'Tengo', 'Hacemos', 'Vamos'],
  tienen: ['Tiene', 'Tenemos', 'Tengo', 'Hacen', 'Van'],
  no: ['Ni', 'Sí', 'Tampoco', 'Nunca', 'Jamás'],
  sí: ['No', 'Tal', 'Quizá', 'Nunca', 'Jamás'],
  en: ['A', 'De', 'Por', 'Con', 'Sin'],
  a: ['En', 'De', 'Hasta', 'Por', 'Hacia'],
  de: ['Del', 'En', 'A', 'Con', 'Sobre'],
  al: ['El', 'A', 'En', 'Del', 'Las'],
  del: ['Al', 'De', 'La', 'En', 'Un'],
  con: ['Sin', 'Sobre', 'Entre', 'Para', 'De'],
  para: ['Por', 'Según', 'Con', 'Hasta', 'Desde'],
  por: ['Para', 'Sobre', 'Con', 'De', 'Porque'],
  desde: ['Hasta', 'Para', 'En', 'Por', 'Tras'],
  el: ['La', 'Los', 'Las', 'Un', 'Una'],
  la: ['El', 'Los', 'Las', 'Una', 'Lo'],
  los: ['Las', 'El', 'La', 'Unos', 'Unas'],
  las: ['Los', 'El', 'La', 'Unas', 'Unos'],
  lo: ['Le', 'La', 'Los', 'Las', 'El'],
  un: ['Una', 'Unos', 'El', 'La', 'Algunos'],
  una: ['Un', 'Unas', 'La', 'El', 'Alguna'],
  unos: ['Unas', 'Un', 'Los', 'Algunas', 'Varios'],
  unas: ['Unos', 'Una', 'Las', 'Algunos', 'Varias'],
  mi: ['Tu', 'Su', 'Mis', 'Nuestro', 'Vuestra'],
  tu: ['Su', 'Mi', 'Tus', 'Vuestro', 'Nuestra'],
  tus: ['Mis', 'Sus', 'Sus', 'Nuestras', 'Sus'],
  su: ['Tu', 'Mi', 'Sus', 'Nuestro', 'Vuestra'],
  mis: ['Tus', 'Sus', 'Tu', 'Nuestras', 'Sus'],
  sus: ['Sus', 'Mis', 'Nuestros', 'Vuestras', 'Sus'],
  yo: ['Tú', 'Él', 'Ella', 'Nosotros', 'Ellos'],
  tú: ['Yo', 'Usted', 'Vos', 'Él', 'Ellos'],
  él: ['Ella', 'Ellos', 'Usted', 'Yo', 'Nosotros'],
  ella: ['Él', 'Ellas', 'Usted', 'Yo', 'Nosotros'],
  nosotros: ['Vosotros', 'Ellos', 'Ustedes', 'Yo', 'Tú'],
  ellos: ['Ellas', 'Nosotros', 'Ustedes', 'Él', 'Ella'],
  ellas: ['Ellos', 'Nosotros', 'Ellas', 'Usted', 'Yo'],
  ustedes: ['Nosotros', 'Ellos', 'Ellas', 'Tú', 'Vos'],
  qué: ['Quién', 'Cuál', 'Cómo', 'Dónde', 'Cuánto'],
  cómo: ['Qué', 'Cuándo', 'Dónde', 'Por', 'Porque'],
  cuándo: ['Dónde', 'Cómo', 'Por', 'Cuánto', 'Qué'],
  dónde: ['Cuándo', 'Adónde', 'Cómo', 'Qué', 'Cuál'],
  cuánto: ['Cuánta', 'Qué', 'Tanto', 'Mucho', 'Poco'],
  quién: ['Qué', 'Cuál', 'Cuyo', 'Quienes', 'Cómo'],
  cuál: ['Qué', 'Quién', 'Cuáles', 'Cómo', 'Dónde'],
  y: ['O', 'Pero', 'Ni', 'E', 'U'],
  o: ['Y', 'Ni', 'U', 'Mas', 'Pero'],
  que: ['Qué', 'Quién', 'Cual', 'Donde', 'Como'],
  si: ['Sí', 'No', 'Pero', 'Pues', 'Aun'],
  '¿': ['¡', '?', '!', ';', ':', '.', ','],
  '?': ['.', ',', '!', '¿', ':'],
  '.': ['!', '?', ';', ':', ','],
  '!': ['.', '?', '¡', ';', ':'],
  '¡': ['!', '?', '.', '¿', ','],
  bebo: ['Bebes', 'Bebe', 'Bebemos', 'Voy', 'Soy'],
  bebes: ['Bebo', 'Beben', 'Haces', 'Vas', 'Tienes'],
  beben: ['Bebes', 'Bebo', 'Hacen', 'Van', 'Tienen'],
  hago: ['Haces', 'Hace', 'Voy', 'Soy', 'Tengo'],
  haces: ['Hago', 'Hace', 'Hacen', 'Vas', 'Tienes'],
  hace: ['Hago', 'Haces', 'Hacen', 'Va', 'Tiene'],
  hacemos: ['Hace', 'Hacen', 'Hago', 'Vamos', 'Tenemos'],
  hacen: ['Haces', 'Hace', 'Hacemos', 'Van', 'Tienen'],
  trabajo: ['Trabaja', 'Trabajamos', 'Trabajan', 'Vivo', 'Estoy'],
  trabaja: ['Trabajo', 'Trabajas', 'Trabajan', 'Vive', 'Está'],
  trabajamos: ['Trabajan', 'Trabaja', 'Estamos', 'Vamos', 'Tenemos'],
  trabajan: ['Trabajo', 'Trabaja', 'Trabajamos', 'Van', 'Están'],
  voy: ['Vas', 'Va', 'Vamos', 'Soy', 'Estoy'],
  vas: ['Voy', 'Va', 'Vamos', 'Eres', 'Estás'],
  va: ['Voy', 'Vas', 'Van', 'Es', 'Está'],
  vamos: ['Van', 'Voy', 'Vas', 'Somos', 'Vamos'],
  van: ['Va', 'Vamos', 'Voy', 'Son', 'Están'],
  vivo: ['Vives', 'Vive', 'Vivimos', 'Estoy', 'Soy'],
  vives: ['Vivo', 'Vive', 'Viven', 'Estás', 'Eres'],
  vive: ['Vivo', 'Vives', 'Viven', 'Está', 'Es'],
  vivimos: ['Viven', 'Vive', 'Estamos', 'Somos', 'Tenemos'],
  viven: ['Vive', 'Vives', 'Vivimos', 'Están', 'Son'],
};

function normKey(tok: string): string {
  return stripMarkers(tok)
    .replace(/^[¿¡]+/, '')
    .toLowerCase();
}

/** Краткая педагогическая формулировка для каждого дистрактора в порядке D1…D5. */
function pedagogicalHints(correct: string, distractors: string[], cat: string): string[] {
  const ck = normKey(correct);
  return distractors.map((d, idx) => {
    const dk = normKey(d);
    if (['verbo_estar', 'estar'].includes(cat) || ['estoy', 'estás', 'está', 'estamos', 'están'].includes(ck))
      return `${d}: plausible error porque se elige SER o otra persona del paradigma copulativo (${dk}).`;
    if (['verbo_ser', 'ser'].includes(cat) || ['soy', 'eres', 'es', 'somos', 'son'].includes(ck))
      return `${d}: plausible error porque se confunde SER con ESTAR o tiempo verbal incorrecto (${dk}).`;
    if (['verbo_tener', 'tener'].includes(cat) || ['tengo', 'tienes', 'tiene', 'tenemos', 'tienen'].includes(ck))
      return `${d}: plausible error por interferencia con HABER/ESTAR o concordancia de persona (${dk}).`;
    if (cat === 'impersonal_haber' || ck === 'hay')
      return `${d}: plausible error porque se confunde HAY con ESTÁ/TIENE (${dk}).`;
    if (cat === 'adj')
      return `${d}: concordancia de género/número o régimen adjetival (${dk}).`;
    if (cat === 'preposicion')
      return `${d}: calco EN/RU sobre elección prep. (locución temporal/local) (${dk}).`;
    if (cat === 'articulo')
      return `${d}: género/número o contracción al/del no aplicada (${dk}).`;
    if (cat === 'pronombre')
      return `${d}: persona o caso pronominal equivocado (${dk}).`;
    if (cat === 'negacion_afirmacion' || ck === 'no')
      return `${d}: marca de polaridad equivocada o doble negación (${dk}).`;
    if (cat === 'interrogativo')
      return `${d}: palabra interrogativa equivocada (ámbito semántico) (${dk}).`;
    if (cat === 'verbo_presente_indicativo' || cat === 'verbo')
      return `${d}: desinencia persona/número o verbo lexicalmente incoherente (${dk}).`;
    if (cat === 'lexico_oracion' || cat === 'lexico_temporal')
      return `${d}: colisión léxica o colocación no idiomática en el hueco (${dk}).`;
    if (cat === 'puntuacion')
      return `${d}: marca de enunciación (¿?¡!) típica de calco inglés (${dk}).`;
    return `${d}: confusión con elemento de la misma oración o interferencia léxica (${dk}).`;
  });
}

function distractorsFor(correct: string, allToks: string[], idx: number, lessonId: number): string[] {
  const key = normKey(correct);
  const pool: string[] = [];
  const used = new Set<string>([correct.toLowerCase(), key]);

  const pushU = (w: string) => {
    const k = w.toLowerCase();
    if (!used.has(k) && w.length > 0) {
      if (k !== normKey(correct)) {
        used.add(k);
        pool.push(w);
      }
    }
  };

  for (const d of POOL_BY_LEMMA[key] ?? []) pushU(d);
  const isPunctTok = (t: string) => /^[¿?¡!.:,;]+$/.test(t) || ['.', '?', '!', ',', ';', ':', '¿', '¡'].includes(t);
  for (let i = 0; i < allToks.length; i++) {
    if (i === idx) continue;
    const o = stripMarkers(allToks[i]);
    if (o && !isPunctTok(o)) pushU(o);
  }
  const seed = lessonId * 997 + idx * 31;
  for (let j = 0; j < PAD.length && pool.length < 14; j++) {
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
    const lk = p.toLowerCase();
    if (!used.has(lk)) {
      used.add(lk);
      five.push(p);
    }
    if (padI > 220) break;
  }
  return five.slice(0, 5);
}

function categoryForToken(tok: string, lessonId: number): string {
  const k = normKey(tok);
  if (['¿', '?', '.', '!', '¡', ',', ';', ':'].includes(tok) || /^[.?!,:;]+$/.test(tok))
    return 'puntuacion';
  const ser = new Set(['soy', 'eres', 'es', 'somos', 'son']);
  const estar = new Set(['estoy', 'estás', 'está', 'estamos', 'están']);
  const tener = new Set(['tengo', 'tienes', 'tiene', 'tenemos', 'tienen']);
  const wh = new Set([
    'qué', 'cómo', 'cuándo', 'cuando', 'dónde', 'adónde', 'quién', 'cuánto',
    'cuánta', 'cuál', 'cuáles',
  ]);
  if (ser.has(k)) return 'verbo_ser';
  if (estar.has(k)) return 'verbo_estar';
  if (tener.has(k)) return 'verbo_tener';
  if (haySet(k)) return 'impersonal_haber';
  if (['en', 'a', 'de', 'del', 'al', 'con', 'sin', 'sobre', 'entre', 'hasta', 'desde', 'por'].includes(k))
    return 'preposicion';
  if (['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'lo'].includes(k))
    return 'articulo';
  if (['mi', 'tu', 'su', 'mis', 'tus', 'sus', 'nuestro', 'nuestra', 'nuestros', 'nuestras'].includes(k))
    return 'posesivo';
  if (['yo', 'tú', 'él', 'ella', 'nosotros', 'nosotras', 'ellos', 'ellas', 'usted', 'ustedes'].includes(k))
    return 'pronombre';
  if (['no', 'sí', 'ni', 'tampoco'].includes(k)) return 'negacion_afirmacion';
  if (wh.has(k)) return 'interrogativo';
  if (lessonId <= 8 && /^[¿?]/.test(tok) === false && k.endsWith('o')) {
    /** heurística débil adj M.sg. */
    if (['listo', 'ocupado', 'contento', 'enfermo', 'barato', 'nervioso'].includes(k)) return 'adj';
  }
  if (
    lessonId === 8 &&
    ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'].includes(
      k,
    )
  )
    return 'lexico_temporal';
  return 'lexico_oracion';
}

function haySet(k: string): boolean {
  return k === 'hay' || k === 'había';
}

function buildPhrase(p: LessonPhrase, lessonId: number): LessonPhrase {
  const surf = p.spanish?.trim();
  if (!surf) throw new Error(`Missing spanish for ${p.id}`);
  const wordsEn: LessonWord[] = JSON.parse(JSON.stringify(p.words)) as LessonWord[];
  const toks = tokenizeSpanishSurface(surf);
  const rebuilt = cleanPhraseLikeLesson1(toks.join(' '));
  const check = cleanPhraseLikeLesson1(surf.replace(/^¿\s*/, '¿').replace(/\s+/g, ' '));
  if (rebuilt !== check && rebuilt.replace(/\s/g, '') !== check.replace(/\s/g, '')) {
    console.warn(`Token join mismatch ${p.id}: «${rebuilt}» vs «${check}»`);
  }

  const newWords: LessonWord[] = toks.map((t, i) => {
    const correct = stripMarkers(t) || t;
    const dArr = distractorsFor(correct, toks, i, lessonId);
    const cat = categoryForToken(t, lessonId);
    return {
      text: t,
      correct: t,
      distractors: dArr,
      category: cat,
    } as LessonWord;
  });

  return {
    ...p,
    words: newWords,
    wordsEn,
  };
}

function escapeStr(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/** Уплощаем второй префикс «Dn:»: оставляем только пояснение после « porque / por … » */
function trimHintLine(full: string, n: number): string {
  const m = full.match(/^[^:]+:\s*(.+)$/);
  const body = m ? m[1]!.trim() : full;
  return `D${n}: ${body}`;
}

function serializeWordFixed(w: LessonWord): string {
  const dStr = w.distractors.map((x) => `'${escapeStr(x)}'`).join(', ');
  const cat = w.category ? `, category: '${escapeStr(w.category)}'` : '';
  const hints = pedagogicalHints(w.correct!, w.distractors, String(w.category));
  const tail = hints.map((h, i) => trimHintLine(h, i + 1)).join('; ');
  return `      { text: '${escapeStr(w.text)}', correct: '${escapeStr(w.correct)}', distractors: [${dStr}]${cat} }, // ${tail}`;
}

function serializeLesson(name: string, phrases: LessonPhrase[], lessonId: number): string {
  const titleES = LESSON_TITLE_ES[lessonId - 1] ?? `Lesson ${lessonId}`;
  const header = `\n// LESSON ${lessonId} — ${titleES}\n`;
  const body = phrases
    .map((p) => {
      const built = buildPhrase(p, lessonId);
      const altLine = built.alternatives?.length
        ? `    alternatives: [${built.alternatives.map((a) => `'${escapeStr(a)}'`).join(', ')}],\n`
        : '';
      const altEsLine = built.alternativesEs?.length
        ? `    alternativesEs: [${built.alternativesEs.map((a) => `'${escapeStr(a)}'`).join(', ')}],\n`
        : '';
      const wLines = built.words!.map((w) => serializeWordFixed(w)).join('\n');
      const wordsEnLines = built.wordsEn!
        .map((w) => {
          const dStr = w.distractors.map((x) => `'${escapeStr(x)}'`).join(', ');
          const c = w.category ? `, category: '${escapeStr(w.category)}'` : '';
          return `      { text: '${escapeStr(w.text)}', correct: '${escapeStr(w.correct)}', distractors: [${dStr}]${c} }`;
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
  return `${header}export const ${name}: LessonPhrase[] = [\n${body}\n];\n`;
}

/** Заголовки из constants/lessons LESSON_NAMES_ES (1–8) */
const LESSON_TITLE_ES = [
  'Pronombres personales y verbo to be',
  'Negación e interrogación con to be',
  'Present Simple: afirmación',
  'Present Simple: negación',
  'Present Simple: preguntas',
  'Interrogativos (preguntas abiertas)',
  'Verbo to have',
  'Preposiciones de tiempo',
];

function emitQATable(phrases: LessonPhrase[], lessonId: number): string {
  let trap = 0;
  const lines = phrases.map((p, i) => {
    /** ~30%+ trap: marca skill ser/estar/tener/interference */
    const span = (p.spanish ?? '').toLowerCase();
    const isTrap =
      /\best(oy|ás|á|amos|án)\b/.test(span) && /\b(soy|eres|es|somos|son)\b/.test(span) === false
        ? 1
        : 0;
    if (/tengo|tienes|tiene/.test(span) && /\bhay\b/.test(span)) trap++;
    const skill =
      /\b(estoy|estás|está|somos|están)\b/i.test(span) ? 'estar'
      : /\b(soy|eres|es|son)\b/i.test(span) ? 'ser'
      : /\bteng/.test(span) ? 'tener'
      : /¿/.test(span) ? 'pregunta'
      : 'presente';

    let risk = 0;
    if (skill === 'ser' || skill === 'estar') risk = 1;

    const note =
      lessonId <= 2 && skill === 'estar' ?
        'ser/estar (estado/atributo)'
      : lessonId === 7 ?
        'tener posesión ES vs have EN'
      : lessonId === 8 ?
        'prep. tiempo ES-419'
      : '—';

    return `/* ${String(p.id)} | skill:${skill} | risk:${risk} | ${note} */`;
  });
  return `/* QA LESSON_${lessonId} */\n${lines.join('\n')}\n`;
}

function main() {
  const hdr =
    '// AUTO-GENERATED by tools/prompt006_es_phrase_words.ts — испанские токены L2 + wordsEn (EN).\n// Re-run: npx tsx tools/prompt006_es_phrase_words.ts (needs lesson_data_1_8_phrases_source.ts)\n\nimport type { LessonPhrase } from \'./lesson_data_types\';\n\n';
  let qaBlocks = '';
  const chunks = [
    (() => {
      const phrases = LESSON_1_PHRASES;
      qaBlocks += emitQATable(phrases, 1);
      return serializeLesson('LESSON_1_PHRASES', phrases, 1);
    })(),
    (() => {
      qaBlocks += emitQATable(LESSON_2_PHRASES, 2);
      return serializeLesson('LESSON_2_PHRASES', LESSON_2_PHRASES, 2);
    })(),
    (() => {
      qaBlocks += emitQATable(LESSON_3_PHRASES, 3);
      return serializeLesson('LESSON_3_PHRASES', LESSON_3_PHRASES, 3);
    })(),
    (() => {
      qaBlocks += emitQATable(LESSON_4_PHRASES, 4);
      return serializeLesson('LESSON_4_PHRASES', LESSON_4_PHRASES, 4);
    })(),
    (() => {
      qaBlocks += emitQATable(LESSON_5_PHRASES, 5);
      return serializeLesson('LESSON_5_PHRASES', LESSON_5_PHRASES, 5);
    })(),
    (() => {
      qaBlocks += emitQATable(LESSON_6_PHRASES, 6);
      return serializeLesson('LESSON_6_PHRASES', LESSON_6_PHRASES, 6);
    })(),
    (() => {
      qaBlocks += emitQATable(LESSON_7_PHRASES, 7);
      return serializeLesson('LESSON_7_PHRASES', LESSON_7_PHRASES, 7);
    })(),
    (() => {
      qaBlocks += emitQATable(LESSON_8_PHRASES, 8);
      return serializeLesson('LESSON_8_PHRASES', LESSON_8_PHRASES, 8);
    })(),
  ];
  writeFileSync(OUT, hdr + chunks.join('\n') + '\n\n/* ─── QA TABLES (комментарии) ─── */\n' + qaBlocks, 'utf8');
  console.log('Wrote', OUT);
}

main();
