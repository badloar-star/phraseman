// Double Metaphone (Lawrence Philips, public domain) — inlined, no npm dependency.
//
// Why inlined: the `double-metaphone` npm package is pure-ESM and breaks the Metro
// bundler in React Native. This is a self-contained port returning the [primary,
// secondary] phonetic keys for an English word.
//
// We use it ONLY to rescue scoring: two differently-spelled words that share a
// phonetic key sound identical to the recognizer (centre/center, wether/whether,
// homophones the recognizer mis-spells). Comparing phonetic keys lets a perfectly
// pronounced word score full credit even when the engine wrote the other spelling.
//
// Pure function, no React/native imports — fully unit-testable.

const VOWELS = 'AEIOUY';

function isVowel(s: string, pos: number): boolean {
  if (pos < 0 || pos >= s.length) return false;
  return VOWELS.indexOf(s[pos]!) !== -1;
}

function slice(s: string, start: number, len: number): string {
  if (start < 0) return '';
  return s.substr(start, len);
}

function stringAt(s: string, start: number, len: number, list: readonly string[]): boolean {
  if (start < 0 || start >= s.length) return false;
  const sub = s.substr(start, len);
  return list.indexOf(sub) !== -1;
}

/**
 * Compute the Double Metaphone primary & secondary phonetic keys for a word.
 * Returns uppercase keys; secondary equals primary when there is no divergence.
 */
export function doubleMetaphone(word: string): [string, string] {
  const input = String(word).toUpperCase().replace(/[^A-Z]/g, '');
  if (!input) return ['', ''];

  let primary = '';
  let secondary = '';
  let pos = 0;
  const length = input.length;
  const last = length - 1;
  const padded = `${input}     `; // guard against index overrun

  const add = (p: string, s?: string) => {
    primary += p;
    secondary += s === undefined ? p : s;
  };

  const isSlavoGermanic = /W|K|CZ|WITZ/.test(input);

  // Skip silent initial letters.
  if (stringAt(padded, 0, 2, ['GN', 'KN', 'PN', 'WR', 'PS'])) pos = 1;
  if (input[0] === 'X') {
    add('S'); // 'Z' sound at start
    pos = 1;
  }

  while (pos < length && (primary.length < 4 || secondary.length < 4)) {
    const c = padded[pos]!;
    switch (c) {
      case 'A': case 'E': case 'I': case 'O': case 'U': case 'Y':
        if (pos === 0) add('A');
        pos += 1;
        break;

      case 'B':
        add('P');
        pos += padded[pos + 1] === 'B' ? 2 : 1;
        break;

      case 'Ç':
        add('S');
        pos += 1;
        break;

      case 'C':
        if (
          pos > 1 &&
          !isVowel(padded, pos - 2) &&
          stringAt(padded, pos - 1, 3, ['ACH']) &&
          padded[pos + 2] !== 'I' &&
          (padded[pos + 2] !== 'E' || stringAt(padded, pos - 2, 6, ['BACHER', 'MACHER']))
        ) {
          add('K');
          pos += 2;
          break;
        }
        if (pos === 0 && stringAt(padded, 0, 6, ['CAESAR'])) {
          add('S');
          pos += 2;
          break;
        }
        if (stringAt(padded, pos, 4, ['CHIA'])) {
          add('K');
          pos += 2;
          break;
        }
        if (stringAt(padded, pos, 2, ['CH'])) {
          if (pos > 0 && stringAt(padded, pos, 4, ['CHAE'])) {
            add('K', 'X');
            pos += 2;
            break;
          }
          if (
            pos === 0 &&
            (stringAt(padded, pos + 1, 5, ['HARAC', 'HARIS']) ||
              stringAt(padded, pos + 1, 3, ['HOR', 'HYM', 'HIA', 'HEM'])) &&
            !stringAt(padded, 0, 5, ['CHORE'])
          ) {
            add('K');
            pos += 2;
            break;
          }
          if (
            stringAt(padded, 0, 4, ['VAN ', 'VON ']) ||
            stringAt(padded, 0, 3, ['SCH']) ||
            stringAt(padded, pos - 2, 6, ['ORCHES', 'ARCHIT', 'ORCHID']) ||
            stringAt(padded, pos + 2, 1, ['T', 'S']) ||
            ((stringAt(padded, pos - 1, 1, ['A', 'O', 'U', 'E']) || pos === 0) &&
              stringAt(padded, pos + 2, 1, ['L', 'R', 'N', 'M', 'B', 'H', 'F', 'V', 'W', ' ']))
          ) {
            add('K');
          } else if (pos > 0) {
            add(stringAt(padded, 0, 2, ['MC']) ? 'K' : 'X', 'K');
          } else {
            add('X');
          }
          pos += 2;
          break;
        }
        if (stringAt(padded, pos, 2, ['CZ']) && !stringAt(padded, pos - 2, 4, ['WICZ'])) {
          add('S', 'X');
          pos += 2;
          break;
        }
        if (stringAt(padded, pos + 1, 3, ['CIA'])) {
          add('X');
          pos += 3;
          break;
        }
        if (stringAt(padded, pos, 2, ['CC']) && !(pos === 1 && padded[0] === 'M')) {
          if (
            stringAt(padded, pos + 2, 1, ['I', 'E', 'H']) &&
            !stringAt(padded, pos + 2, 2, ['HU'])
          ) {
            if (
              (pos === 1 && padded[pos - 1] === 'A') ||
              stringAt(padded, pos - 1, 5, ['UCCEE', 'UCCES'])
            ) {
              add('KS');
            } else {
              add('X');
            }
            pos += 3;
            break;
          }
          add('K');
          pos += 2;
          break;
        }
        if (stringAt(padded, pos, 2, ['CK', 'CG', 'CQ'])) {
          add('K');
          pos += 2;
          break;
        }
        if (stringAt(padded, pos, 2, ['CI', 'CE', 'CY'])) {
          add(stringAt(padded, pos, 3, ['CIO', 'CIE', 'CIA']) ? 'S' : 'S', 'S');
          pos += 2;
          break;
        }
        add('K');
        if (stringAt(padded, pos + 1, 2, [' C', ' Q', ' G'])) pos += 3;
        else if (
          stringAt(padded, pos + 1, 1, ['C', 'K', 'Q']) &&
          !stringAt(padded, pos + 1, 2, ['CE', 'CI'])
        ) {
          pos += 2;
        } else pos += 1;
        break;

      case 'D':
        if (stringAt(padded, pos, 2, ['DG'])) {
          if (stringAt(padded, pos + 2, 1, ['I', 'E', 'Y'])) {
            add('J');
            pos += 3;
          } else {
            add('TK');
            pos += 2;
          }
          break;
        }
        if (stringAt(padded, pos, 2, ['DT', 'DD'])) {
          add('T');
          pos += 2;
          break;
        }
        add('T');
        pos += 1;
        break;

      case 'F':
        add('F');
        pos += padded[pos + 1] === 'F' ? 2 : 1;
        break;

      case 'G':
        if (padded[pos + 1] === 'H') {
          if (pos > 0 && !isVowel(padded, pos - 1)) {
            add('K');
            pos += 2;
            break;
          }
          if (pos < 3 && pos === 0) {
            add(padded[pos + 2] === 'I' ? 'J' : 'K');
            pos += 2;
            break;
          }
          if (
            (pos > 1 && stringAt(padded, pos - 2, 1, ['B', 'H', 'D'])) ||
            (pos > 2 && stringAt(padded, pos - 3, 1, ['B', 'H', 'D'])) ||
            (pos > 3 && stringAt(padded, pos - 4, 1, ['B', 'H']))
          ) {
            pos += 2;
            break;
          }
          if (pos > 2 && padded[pos - 1] === 'U' && stringAt(padded, pos - 3, 1, ['C', 'G', 'L', 'R', 'T'])) {
            add('F');
          } else if (pos > 0 && padded[pos - 1] !== 'I') {
            add('K');
          }
          pos += 2;
          break;
        }
        if (padded[pos + 1] === 'N') {
          if (pos === 1 && isVowel(padded, 0) && !isSlavoGermanic) {
            add('KN', 'N');
          } else if (!stringAt(padded, pos + 2, 2, ['EY']) && padded[pos + 1] !== 'Y' && !isSlavoGermanic) {
            add('N', 'KN');
          } else {
            add('KN');
          }
          pos += 2;
          break;
        }
        if (stringAt(padded, pos + 1, 2, ['LI']) && !isSlavoGermanic) {
          add('KL', 'L');
          pos += 2;
          break;
        }
        if (
          pos === 0 &&
          (padded[pos + 1] === 'Y' ||
            stringAt(padded, pos + 1, 2, ['ES', 'EP', 'EB', 'EL', 'EY', 'IB', 'IL', 'IN', 'IE', 'EI', 'ER']))
        ) {
          add('K', 'J');
          pos += 2;
          break;
        }
        if (
          (stringAt(padded, pos + 1, 2, ['ER']) || padded[pos + 1] === 'Y') &&
          !stringAt(padded, 0, 6, ['DANGER', 'RANGER', 'MANGER']) &&
          !stringAt(padded, pos - 1, 1, ['E', 'I']) &&
          !stringAt(padded, pos - 1, 3, ['RGY', 'OGY'])
        ) {
          add('K', 'J');
          pos += 2;
          break;
        }
        if (
          stringAt(padded, pos + 1, 1, ['E', 'I', 'Y']) ||
          stringAt(padded, pos - 1, 4, ['AGGI', 'OGGI'])
        ) {
          if (
            stringAt(padded, 0, 4, ['VAN ', 'VON ']) ||
            stringAt(padded, 0, 3, ['SCH']) ||
            stringAt(padded, pos + 1, 2, ['ET'])
          ) {
            add('K');
          } else if (stringAt(padded, pos + 1, 4, ['IER '])) {
            add('J');
          } else {
            add('J', 'K');
          }
          pos += 2;
          break;
        }
        add('K');
        pos += padded[pos + 1] === 'G' ? 2 : 1;
        break;

      case 'H':
        if ((pos === 0 || isVowel(padded, pos - 1)) && isVowel(padded, pos + 1)) {
          add('H');
          pos += 2;
        } else {
          pos += 1;
        }
        break;

      case 'J':
        if (stringAt(padded, pos, 4, ['JOSE']) || stringAt(padded, 0, 4, ['SAN '])) {
          if ((pos === 0 && padded[pos + 4] === ' ') || stringAt(padded, 0, 4, ['SAN '])) {
            add('H');
          } else {
            add('J', 'H');
          }
          pos += 1;
          break;
        }
        if (pos === 0) {
          add('J', 'A');
        } else if (
          isVowel(padded, pos - 1) &&
          !isSlavoGermanic &&
          (padded[pos + 1] === 'A' || padded[pos + 1] === 'O')
        ) {
          add('J', 'H');
        } else if (pos === last) {
          add('J', '');
        } else if (
          !stringAt(padded, pos + 1, 1, ['L', 'T', 'K', 'S', 'N', 'M', 'B', 'Z']) &&
          !stringAt(padded, pos - 1, 1, ['S', 'K', 'L'])
        ) {
          add('J');
        }
        pos += padded[pos + 1] === 'J' ? 2 : 1;
        break;

      case 'K':
        add('K');
        pos += padded[pos + 1] === 'K' ? 2 : 1;
        break;

      case 'L':
        if (padded[pos + 1] === 'L') {
          if (
            (pos === length - 3 &&
              stringAt(padded, pos - 1, 4, ['ILLO', 'ILLA', 'ALLE'])) ||
            ((stringAt(padded, last - 1, 2, ['AS', 'OS']) || stringAt(padded, last, 1, ['A', 'O'])) &&
              stringAt(padded, pos - 1, 4, ['ALLE']))
          ) {
            add('L', '');
            pos += 2;
            break;
          }
          add('L');
          pos += 2;
          break;
        }
        add('L');
        pos += 1;
        break;

      case 'M':
        if (
          (stringAt(padded, pos - 1, 3, ['UMB']) &&
            (pos + 1 === last || stringAt(padded, pos + 2, 2, ['ER']))) ||
          padded[pos + 1] === 'M'
        ) {
          pos += 2;
        } else {
          pos += 1;
        }
        add('M');
        break;

      case 'N':
        add('N');
        pos += padded[pos + 1] === 'N' ? 2 : 1;
        break;

      case 'Ñ':
        add('N');
        pos += 1;
        break;

      case 'P':
        if (padded[pos + 1] === 'H') {
          add('F');
          pos += 2;
          break;
        }
        add('P');
        pos += stringAt(padded, pos + 1, 1, ['P', 'B']) ? 2 : 1;
        break;

      case 'Q':
        add('K');
        pos += padded[pos + 1] === 'Q' ? 2 : 1;
        break;

      case 'R':
        if (
          pos === last &&
          !isSlavoGermanic &&
          stringAt(padded, pos - 2, 2, ['IE']) &&
          !stringAt(padded, pos - 4, 2, ['ME', 'MA'])
        ) {
          add('', 'R');
        } else {
          add('R');
        }
        pos += padded[pos + 1] === 'R' ? 2 : 1;
        break;

      case 'S':
        if (stringAt(padded, pos - 1, 3, ['ISL', 'YSL'])) {
          pos += 1;
          break;
        }
        if (pos === 0 && stringAt(padded, 0, 5, ['SUGAR'])) {
          add('X', 'S');
          pos += 1;
          break;
        }
        if (stringAt(padded, pos, 2, ['SH'])) {
          if (stringAt(padded, pos + 1, 4, ['HEIM', 'HOEK', 'HOLM', 'HOLZ'])) {
            add('S');
          } else {
            add('X');
          }
          pos += 2;
          break;
        }
        if (stringAt(padded, pos, 3, ['SIO', 'SIA']) || stringAt(padded, pos, 4, ['SIAN'])) {
          add(isSlavoGermanic ? 'S' : 'S', isSlavoGermanic ? 'S' : 'X');
          pos += 3;
          break;
        }
        if ((pos === 0 && stringAt(padded, pos + 1, 1, ['M', 'N', 'L', 'W'])) || stringAt(padded, pos + 1, 1, ['Z'])) {
          add('S', 'X');
          pos += padded[pos + 1] === 'Z' ? 2 : 1;
          break;
        }
        if (stringAt(padded, pos, 2, ['SC'])) {
          if (padded[pos + 2] === 'H') {
            if (stringAt(padded, pos + 3, 2, ['OO', 'ER', 'EN', 'UY', 'ED', 'EM'])) {
              if (stringAt(padded, pos + 3, 2, ['ER', 'EN'])) {
                add('X', 'SK');
              } else {
                add('SK');
              }
            } else if (pos === 0 && !isVowel(padded, 3) && padded[3] !== 'W') {
              add('X', 'S');
            } else {
              add('X');
            }
            pos += 3;
            break;
          }
          if (stringAt(padded, pos + 2, 1, ['I', 'E', 'Y'])) {
            add('S');
            pos += 3;
            break;
          }
          add('SK');
          pos += 3;
          break;
        }
        if (pos === last && stringAt(padded, pos - 2, 2, ['AI', 'OI'])) {
          add('', 'S');
        } else {
          add('S');
        }
        pos += stringAt(padded, pos + 1, 1, ['S', 'Z']) ? 2 : 1;
        break;

      case 'T':
        if (stringAt(padded, pos, 4, ['TION'])) {
          add('X');
          pos += 3;
          break;
        }
        if (stringAt(padded, pos, 3, ['TIA', 'TCH'])) {
          add('X');
          pos += 3;
          break;
        }
        if (stringAt(padded, pos, 2, ['TH']) || stringAt(padded, pos, 3, ['TTH'])) {
          if (
            stringAt(padded, pos + 2, 2, ['OM', 'AM']) ||
            stringAt(padded, 0, 4, ['VAN ', 'VON ']) ||
            stringAt(padded, 0, 3, ['SCH'])
          ) {
            add('T');
          } else {
            add('0', 'T');
          }
          pos += 2;
          break;
        }
        add('T');
        pos += stringAt(padded, pos + 1, 1, ['T', 'D']) ? 2 : 1;
        break;

      case 'V':
        add('F');
        pos += padded[pos + 1] === 'V' ? 2 : 1;
        break;

      case 'W':
        if (stringAt(padded, pos, 2, ['WR'])) {
          add('R');
          pos += 2;
          break;
        }
        if (pos === 0 && (isVowel(padded, pos + 1) || stringAt(padded, pos, 2, ['WH']))) {
          if (isVowel(padded, pos + 1)) {
            add('A', 'F');
          } else {
            add('A');
          }
        }
        if (
          (pos === last && isVowel(padded, pos - 1)) ||
          stringAt(padded, pos - 1, 5, ['EWSKI', 'EWSKY', 'OWSKI', 'OWSKY']) ||
          stringAt(padded, 0, 3, ['SCH'])
        ) {
          add('', 'F');
          pos += 1;
          break;
        }
        if (stringAt(padded, pos, 4, ['WICZ', 'WITZ'])) {
          add('TS', 'FX');
          pos += 4;
          break;
        }
        pos += 1;
        break;

      case 'X':
        if (!(pos === last && (stringAt(padded, pos - 3, 3, ['IAU', 'EAU']) || stringAt(padded, pos - 2, 2, ['AU', 'OU'])))) {
          add('KS');
        }
        pos += stringAt(padded, pos + 1, 1, ['C', 'X']) ? 2 : 1;
        break;

      case 'Z':
        if (padded[pos + 1] === 'H') {
          add('J');
          pos += 2;
          break;
        }
        if (
          stringAt(padded, pos + 1, 2, ['ZO', 'ZI', 'ZA']) ||
          (isSlavoGermanic && pos > 0 && padded[pos - 1] !== 'T')
        ) {
          add('S', 'TS');
        } else {
          add('S');
        }
        pos += padded[pos + 1] === 'Z' ? 2 : 1;
        break;

      default:
        pos += 1;
        break;
    }
  }

  return [primary.slice(0, 4), secondary.slice(0, 4)];
}

/** True when two words share a Double Metaphone key (sound alike). */
export function soundsAlike(a: string, b: string): boolean {
  const ca = String(a).trim();
  const cb = String(b).trim();
  if (!ca || !cb) return false;
  const [ap, as] = doubleMetaphone(ca);
  const [bp, bs] = doubleMetaphone(cb);
  if (!ap && !bp) return false;
  return ap === bp || ap === bs || as === bp || as === bs;
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
