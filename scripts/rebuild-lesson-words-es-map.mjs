/**
 * Сливает курируемый список в app/lesson_words_es_map.ts (ручные глоссы).
 * Полный автоген по всем словам без inline `es:`: npm run lesson:words-es-gen
 * Запуск этого скрипта: node scripts/rebuild-lesson-words-es-map.mjs
 */
import fs from 'fs';

const path = 'app/lesson_words_es_map.ts';
const src = fs.readFileSync(path, 'utf8');
const existing = {};
for (const m of src.matchAll(/\n\s*([A-Za-z0-9_-]+):\s*'((?:[^'\\]|\\.)*)',/g)) {
  existing[m[1]] = m[2].replace(/\\'/g, "'");
}

const extra = {
  // Урок 2
  enemies: 'enemigos',
  wrong: 'equivocado / incorrecto',
  park: 'parque',
  sure: 'seguro / segura',
  expensive: 'caro',
  doctor: 'médico / doctor',
  scary: 'aterrador / que da miedo',
  alone: 'solo / sola',
  danger: 'peligro',
  open: 'abierto',
  joke: 'broma / chiste',
  afraid: 'asustado / con miedo',
  far: 'lejano / lejos',
  office: 'oficina',
  mood: 'humor / estado de ánimo',
  true: 'verdadero / cierto',
  trap: 'trampa',
  guilty: 'culpable',
  dangerous: 'peligroso',
  building: 'edificio',
  mean: 'malvado / mezquino',
  serious: 'serio',
  enemy: 'enemigo',
  // Урок 3
  accept: 'aceptar',
  understand: 'entender',
  live: 'vivir',
  drink: 'beber',
  watch: 'mirar',
  call: 'llamar',
  cook: 'cocinar',
  cost: 'costar',
  help: 'ayudar',
  know: 'saber / conocer',
  believe: 'creer',
  buy: 'comprar',
  read: 'leer',
  come: 'venir',
  listen: 'escuchar',
  drive: 'conducir',
  deserve: 'merecer',
  feel: 'sentir',
  promise: 'prometer',
  travel: 'viajar',
  value: 'valorar',
  forget: 'olvidar',
  love: 'amar / querer',
  remember: 'recordar',
  order: 'pedir',
  look: 'parecer',
  seem: 'parecer',
  sound: 'sonar',
  use: 'usar',
  wait: 'esperar',
  wash: 'lavar',
  news: 'noticias',
  people: 'gente / personas',
  answer: 'respuesta',
  meat: 'carne',
  music: 'música',
  food: 'comida',
  dollar: 'dólar',
  pain: 'dolor',
  time: 'tiempo',
  glasses: 'gafas / lentes',
  password: 'contraseña',
  internet: 'internet',
  rest: 'descanso',
  terms: 'condiciones',
  problem: 'problema',
  address: 'dirección',
  often: 'a menudo',
  speak: 'hablar',
  eat: 'comer',
  write: 'escribir',
  teach: 'enseñar',
  wear: 'llevar (puesto)',
  take: 'tomar / llevar',
  london: 'Londres',
  coffee: 'café',
  english: 'inglés (idioma)',
  book: 'libro',
  letter: 'carta',
  dish: 'plato',
  dinner: 'cena',
  math: 'matemáticas',
  key: 'llave',
  pizza: 'pizza',
  tea: 'té',
  strange: 'extraño / raro',
  great: 'genial / estupendo',
  good: 'bueno',
  books: 'libro',
  calls: 'llamar',
  cooks: 'cocinar',
  costs: 'costar',
  dishes: 'plato',
  drinks: 'beber',
  eats: 'comer',
  helps: 'ayudar',
  keys: 'llave',
  knows: 'saber',
  letters: 'carta',
  lives: 'vivir',
  loves: 'amar',
  remembers: 'recordar',
  seems: 'parecer',
  sounds: 'sonar',
  speaks: 'hablar',
  takes: 'tomar',
  teaches: 'enseñar',
  uses: 'usar',
  washes: 'lavar',
  wears: 'llevar (puesto)',
  writes: 'escribir',
};

const all = { ...existing, ...extra };
for (const [k, v] of Object.entries(extra)) {
  if (existing[k] && existing[k] !== v) {
    console.warn(`override ${k}: was "${existing[k]}" -> "${v}"`);
  }
}

const keys = Object.keys(all).sort((a, b) => a.localeCompare(b));
let out =
  '/**\n' +
  ' * Испанские эквиваленты слов из словаря уроков.\n' +
  ' * Ключ = поле `en` в `lesson_words.tsx`. Файл можно пересобрать: `node scripts/rebuild-lesson-words-es-map.mjs`.\n' +
  ' */\n' +
  'export const LESSON_WORD_ES: Record<string, string> = {\n';
for (const k of keys) {
  const esc = all[k].replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  out += `  ${k}: '${esc}',\n`;
}
out += '};\n';
fs.writeFileSync(path, out, 'utf8');
console.log('wrote', keys.length, 'entries to', path);
