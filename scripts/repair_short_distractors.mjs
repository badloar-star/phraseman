import fs from 'node:fs';

const TARGET_LESSONS = new Set([22, 23, 24, 25, 26, 27, 28, 29, 30, 32]);
const FILES = ['app/lesson_data_17_24.ts', 'app/lesson_data_25_32.ts'];

const stripEdgePunct = (value) => {
  const raw = String(value ?? '');
  const prefix = raw.match(/^[¿¡]*/)?.[0] ?? '';
  const suffix = raw.match(/[.,!?;:]+$/)?.[0] ?? '';
  return {
    prefix,
    suffix,
    core: raw.slice(prefix.length, raw.length - suffix.length),
  };
};

const norm = (value) => stripEdgePunct(value).core.trim().toLowerCase();
const hasCyrillic = (value) => /[А-Яа-яЁёІіЇїЄєҐґ]/.test(value);
const hasSpanish = (value) => /[áéíóúñü¿¡ÁÉÍÓÚÑÜ]/.test(value);

function readStringLiterals(src) {
  const out = [];
  const re = /(['"])((?:\\.|(?!\1).)*?)\1/g;
  let m;
  while ((m = re.exec(src))) {
    out.push(m[2].replace(/\\'/g, "'").replace(/\\"/g, '"'));
  }
  return out;
}

function quoteLike(value, quote) {
  const q = quote || "'";
  return q + String(value).replace(/\\/g, '\\\\').replace(new RegExp(q, 'g'), `\\${q}`) + q;
}

function uniqueAppend(correct, distractors, candidates, suffix) {
  const seen = new Set([norm(correct), ...distractors.map(norm)]);
  const out = [...distractors];
  for (const candidate of candidates) {
    if (out.length >= 5) break;
    if (!candidate || candidate.includes(' ')) continue;
    const { core } = stripEdgePunct(candidate);
    const value = core + suffix;
    const key = norm(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function englishCandidates(correct, category) {
  const c = norm(correct);
  const cat = String(category ?? '').toLowerCase();
  const pools = [];

  const pronouns = ['I', 'you', 'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'our', 'their'];
  const articles = ['a', 'an', 'the', 'this', 'that', 'these', 'those', 'my', 'your'];
  const preps = ['in', 'on', 'at', 'to', 'for', 'with', 'from', 'by', 'under', 'over', 'near', 'behind', 'between'];
  const be = ['am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'do', 'did'];
  const verbs = ['do', 'does', 'did', 'make', 'makes', 'made', 'go', 'goes', 'went', 'come', 'comes', 'came', 'take', 'takes', 'took', 'get', 'gets', 'got'];
  const gerunds = ['working', 'reading', 'writing', 'cooking', 'waiting', 'watching', 'learning', 'driving', 'talking', 'cleaning'];
  const nouns = ['time', 'day', 'work', 'home', 'room', 'door', 'phone', 'message', 'ticket', 'book', 'question', 'answer', 'plan', 'task'];
  const adjectives = ['good', 'new', 'old', 'busy', 'ready', 'hard', 'easy', 'useful', 'important', 'late', 'early'];
  const adverbs = ['now', 'today', 'yesterday', 'always', 'never', 'often', 'here', 'there', 'well', 'late'];
  const relatives = ['who', 'which', 'that', 'whose', 'whom', 'where', 'when'];

  if (cat.includes('pronoun')) pools.push(pronouns);
  if (cat.includes('article') || c === 'a' || c === 'an' || c === 'the') pools.push(articles);
  if (cat.includes('prepos') || preps.includes(c)) pools.push(preps);
  if (cat.includes('irregular') || be.includes(c)) pools.push(be);
  if (cat.includes('verb')) pools.push(verbs);
  if (cat.includes('noun')) pools.push(nouns);
  if (cat.includes('adj')) pools.push(adjectives);
  if (cat.includes('adverb')) pools.push(adverbs);
  if (cat.includes('relative') || ['who', 'which', 'that', 'where', 'when'].includes(c)) pools.push(relatives);

  if (c.endsWith('ing')) pools.unshift(gerunds, verbs);
  else if (c.endsWith('ed')) pools.unshift(verbs, gerunds);
  else if (c.endsWith('s') && c.length > 3 && !c.endsWith('ss')) pools.unshift(verbs, nouns);

  pools.push(pronouns, articles, preps, be, gerunds, nouns, adjectives, adverbs);
  return pools.flat();
}

function spanishCandidates(correct, category) {
  const cat = String(category ?? '').toLowerCase();
  const pools = [];
  const pronouns = ['yo', 'tú', 'él', 'ella', 'usted', 'nosotros', 'ellos', 'me', 'te', 'se', 'nos', 'lo', 'la', 'le'];
  const articles = ['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas'];
  const preps = ['a', 'de', 'en', 'por', 'para', 'con', 'sin', 'desde', 'hasta', 'sobre'];
  const verbs = ['soy', 'eres', 'es', 'estoy', 'estás', 'está', 'tengo', 'tiene', 'hago', 'hace', 'voy', 'va', 'puedo', 'puede'];
  const nouns = ['casa', 'tiempo', 'día', 'trabajo', 'persona', 'lugar', 'mesa', 'puerta', 'libro', 'teléfono'];
  const adjectives = ['bueno', 'nuevo', 'grande', 'pequeño', 'importante', 'fácil', 'difícil', 'listo', 'ocupado'];
  const adverbs = ['ahora', 'hoy', 'ayer', 'siempre', 'nunca', 'también', 'bien', 'mal', 'aquí', 'allí'];
  const neg = ['no', 'nunca', 'nada', 'tampoco', 'ya'];

  if (cat.includes('pronombre')) pools.push(pronouns);
  if (cat.includes('articulo')) pools.push(articles);
  if (cat.includes('prepos')) pools.push(preps);
  if (cat.includes('verbo')) pools.push(verbs);
  if (cat.includes('sustantivo')) pools.push(nouns);
  if (cat.includes('adj')) pools.push(adjectives);
  if (cat.includes('adverb')) pools.push(adverbs);
  if (cat.includes('neg')) pools.push(neg);
  pools.push(pronouns, articles, preps, verbs, nouns, adjectives, adverbs, neg);
  return pools.flat();
}

function russianCandidates(correct, category) {
  const cat = String(category ?? '').toLowerCase();
  const pools = [];
  const pronouns = ['я', 'ты', 'он', 'она', 'мы', 'они', 'меня', 'мне', 'его', 'ему', 'её', 'ей', 'нас', 'нам', 'их', 'им'];
  const preps = ['в', 'на', 'к', 'у', 'с', 'по', 'для', 'от', 'до', 'за', 'под', 'над', 'о'];
  const verbs = ['делаю', 'делает', 'делал', 'делали', 'делать', 'иду', 'идёт', 'шёл', 'будет', 'могу', 'может'];
  const nouns = ['время', 'день', 'дом', 'работа', 'место', 'вопрос', 'ответ', 'план', 'задача', 'телефон'];
  const adjectives = ['новый', 'новая', 'новое', 'важный', 'важная', 'сложный', 'сложно', 'полезный', 'готовый'];
  const adverbs = ['сейчас', 'сегодня', 'вчера', 'часто', 'редко', 'всегда', 'никогда', 'здесь', 'там'];
  const neg = ['не', 'ни', 'нет', 'никогда', 'без'];

  if (cat.includes('pronoun')) pools.push(pronouns);
  if (cat.includes('preposition')) pools.push(preps);
  if (cat.includes('verb')) pools.push(verbs);
  if (cat.includes('noun')) pools.push(nouns);
  if (cat.includes('adj')) pools.push(adjectives);
  if (cat.includes('adverb')) pools.push(adverbs);
  if (cat.includes('neg')) pools.push(neg);
  pools.push(pronouns, preps, verbs, nouns, adjectives, adverbs, neg);
  return pools.flat();
}

function candidatesFor(correct, category) {
  const value = String(correct ?? '');
  if (hasCyrillic(value)) return russianCandidates(value, category);
  if (hasSpanish(value) || String(category ?? '').match(/articulo|pronombre|verbo|sustantivo|preposicion|adverbio|puntuacion/i)) {
    return spanishCandidates(value, category);
  }
  return englishCandidates(value, category);
}

function repairFile(file) {
  let currentLesson = null;
  let changed = 0;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const next = lines.map((line) => {
    const lessonMatch = line.match(/id:\s*['"]lesson(\d+)_phrase_\d+['"]/);
    if (lessonMatch) currentLesson = Number(lessonMatch[1]);
    if (!TARGET_LESSONS.has(currentLesson)) return line;
    if (!line.includes('distractors:')) return line;

    const distractorMatch = line.match(/distractors:\s*\[([^\]]*)\]/);
    if (!distractorMatch) return line;
    const distractors = readStringLiterals(distractorMatch[1]);
    if (distractors.length >= 5) return line;

    const correctMatch = line.match(/correct:\s*(['"])((?:\\.|(?!\1).)*?)\1/);
    if (!correctMatch) return line;
    const correct = correctMatch[2].replace(/\\'/g, "'").replace(/\\"/g, '"');
    if (/^[.,!?;:¿¡]+$/.test(correct.trim())) return line;
    const categoryMatch = line.match(/category:\s*(['"])((?:\\.|(?!\1).)*?)\1/);
    const category = categoryMatch?.[2] ?? '';
    const quote = distractorMatch[1].trim().startsWith('"') ? '"' : "'";
    const suffix = stripEdgePunct(correct).suffix;
    const repaired = uniqueAppend(correct, distractors, candidatesFor(correct, category), suffix);
    if (repaired.length === distractors.length) return line;
    changed += 1;
    const replacement = `distractors: [${repaired.map((v) => quoteLike(v, quote)).join(', ')}]`;
    return line.replace(/distractors:\s*\[[^\]]*\]/, replacement);
  });
  fs.writeFileSync(file, next.join('\n'), 'utf8');
  return changed;
}

for (const file of FILES) {
  const count = repairFile(file);
  console.log(`${file}: repaired ${count} distractor arrays`);
}
