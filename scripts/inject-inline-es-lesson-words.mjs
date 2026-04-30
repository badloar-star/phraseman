/**
 * Injects `es` into every word row in app/lesson_words.tsx (after uk).
 * Sources: scripts/lesson_words_es_map.json + CURATED.
 */
import fs from 'fs';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TSX = `${ROOT}/app/lesson_words.tsx`;
const MAP = `${ROOT}/scripts/lesson_words_es_map.json`;

const CURATED = {
  home: 'En casa',
  line: 'Cola',
  store: 'Tienda',
  work: 'Trabajo',
  right: 'Correcto; a la derecha',
  way: 'Camino; forma',
  watch: 'Mirar',
  please: 'Por favor',
  car: 'Coche',
  address: 'Dirección',
  AM: 'a. m.',
  PM: 'p. m.',
  I: 'Yo',
  you: 'Tú / usted',
  he: 'Él',
  she: 'Ella',
  we: 'Nosotros, nosotras',
  it: 'Eso / ello',
  they: 'Ellos / ellas',
  english: 'Inglés',
  math: 'Matemáticas',
  "o'clock": 'en punto',
};

const map = {
  ...JSON.parse(fs.readFileSync(MAP, 'utf8')),
  ...{
    mondays: 'Los lunes',
    tuesdays: 'Los martes',
    wednesdays: 'Los miércoles',
    thursday: 'Jueves',
    thursdays: 'Los jueves',
    fridays: 'Los viernes',
    saturdays: 'Los sábados',
    sundays: 'Los domingos',
    sunday: 'Domingo',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    weekends: 'Fines de semana',
  },
  ...CURATED,
};

function jsxQuote(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

const re1 =
  /^(\s*)\{ en: '((?:\\'|[^'])*)', ru: '((?:\\'|[^'])*)', uk: '((?:\\'|[^'])*)'(?:, es: '((?:\\'|[^'])*)')?, pos: '((?:\\'|[^'])*)' \}(,?)$/;

const re2 =
  /^(\s*)\{ en: "((?:\\"|[^"])*)", ru: '((?:\\'|[^'])*)', uk: '((?:\\'|[^'])*)'(?:, es: '((?:\\'|[^'])*)')?, pos: '((?:\\'|[^'])*)' \}(,?)$/;

const lines = fs.readFileSync(TSX, 'utf8').split(/\r?\n/);
const out = lines.map((line) => {
  let m = line.match(re1);
  let en;
  let dq = false;
  if (m) {
    en = m[2];
  } else {
    m = line.match(re2);
    if (m) {
      dq = true;
      en = m[2];
    } else {
      return line;
    }
  }

  const gloss = map[en] ?? map[en.charAt(0).toUpperCase() + en.slice(1)];
  if (!gloss || !String(gloss).trim()) {
    throw new Error(`Missing ES for en=${JSON.stringify(en)}`);
  }
  const es = String(gloss).trim();
  const ind = m[1];
  const ru = m[3];
  const uk = m[4];
  const pos = m[6];
  const trail = m[7] || '';

  if (dq) {
    return `${ind}{ en: "${en.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}", ru: '${jsxQuote(ru)}', uk: '${jsxQuote(uk)}', es: '${jsxQuote(es)}', pos: '${jsxQuote(pos)}' }${trail}`;
  }
  return `${ind}{ en: '${jsxQuote(en)}', ru: '${jsxQuote(ru)}', uk: '${jsxQuote(uk)}', es: '${jsxQuote(es)}', pos: '${jsxQuote(pos)}' }${trail}`;
});

fs.writeFileSync(TSX, out.join('\n'), 'utf8');
console.log('OK', TSX);
