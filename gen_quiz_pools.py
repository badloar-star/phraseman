import re, sys, json
sys.stdout.reconfigure(encoding='utf-8')

path = 'C:/appsprojects/phraseman/app/lesson_data_all.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Parse all lesson arrays: find L{N}_RU and L{N}_UK
# Each entry: { russian: '...', english: '...', level: '...' }
ENTRY_RE = re.compile(
    r"\{\s*russian:\s*'((?:[^'\\]|\\.)*)'\s*,\s*english:\s*'((?:[^'\\]|\\.)*)'\s*(?:,\s*level:\s*'([A-C][12])')?\s*\}",
    re.DOTALL
)
ARRAY_RE = re.compile(r'const\s+(L(\d+)_(RU|UK))\s*:\s*\S+\s*=\s*\[(.*?)\];', re.DOTALL)

arrays = {}
for m in ARRAY_RE.finditer(content):
    name = m.group(1)
    lesson_num = int(m.group(2))
    lang = m.group(3)
    body = m.group(4)
    entries = []
    for e in ENTRY_RE.finditer(body):
        russian = e.group(1).replace("\\'", "'")
        english = e.group(2).replace("\\'", "'")
        level = e.group(3) or None
        entries.append({'russian': russian, 'english': english, 'level': level})
    arrays[(lesson_num, lang)] = entries

# Pair RU+UK by index, collect pool entries
easy = []    # A1, A2
medium = []  # B1, B2
hard = []    # C1, C2

for lesson_num in range(1, 33):
    ru_arr = arrays.get((lesson_num, 'RU'), [])
    uk_arr = arrays.get((lesson_num, 'UK'), [])
    if not ru_arr or not uk_arr:
        print(f'WARNING: missing data for lesson {lesson_num}')
        continue
    for i in range(min(len(ru_arr), len(uk_arr))):
        ru = ru_arr[i]
        uk = uk_arr[i]
        level = ru.get('level')
        if not level:
            continue
        entry = {
            'ru': ru['russian'],
            'uk': uk['russian'],
            'english': ru['english'],
            'lessonNum': lesson_num,
            'level': level,
        }
        if level in ('A1', 'A2'):
            easy.append(entry)
        elif level in ('B1', 'B2'):
            medium.append(entry)
        elif level in ('C1', 'C2'):
            hard.append(entry)

print(f'Easy (A1/A2): {len(easy)} phrases')
print(f'Medium (B1/B2): {len(medium)} phrases')
print(f'Hard (C1/C2): {len(hard)} phrases')

def to_ts_array(name, entries):
    lines = [f'const {name}: QuizPoolEntry[] = [']
    for e in entries:
        ru = e['ru'].replace("'", "\\'")
        uk = e['uk'].replace("'", "\\'")
        eng = e['english'].replace("'", "\\'")
        lines.append(f"  {{ ru: '{ru}', uk: '{uk}', english: '{eng}', lessonNum: {e['lessonNum']}, level: '{e['level']}' }},")
    lines.append('];')
    return '\n'.join(lines)

out_path = 'C:/appsprojects/phraseman/app/quiz_data.ts'

header = """// quiz_data.ts
// КВИЗЫ: три уровня сложности
//   easy   = A1 + A2
//   medium = B1 + B2
//   hard   = C1 + C2
//
// Пулы фраз СТАТИЧЕСКИЕ — вручную выбраны по тегу уровня из lesson_data_all.ts.
// Уроки НЕ ТРОНУТЫ. Фразы не перемещаются между уроками.
//
// Дистракторы генерируются из правильного ответа (мутации):
//   D1: заменить вспомогательный/модальный глагол (was→were, will→would итд)
//   D2: добавить/убрать "not"
//   D3: заменить местоимение (I→He, She→They итд)
//   D4: заменить последнее слово на похожее
//   D5: поменять форму глагола

import { PhraseLevel } from './lesson_data_all';

export interface QuizPhrase {
  ru: string;
  uk: string;
  choices: string[];
  correct: number;
  answer: string;
  lessonNum: number;
  level: PhraseLevel;
}

type QuizPoolEntry = {
  ru: string;
  uk: string;
  english: string;
  lessonNum: number;
  level: PhraseLevel;
};

"""

footer = """
// ── Генерация дистракторов из правильного ответа ─────────────────────────────

const AUX_SWAPS: [RegExp, string[]][] = [
  [/\\bam\\b/gi,       ['is', 'are', 'was']],
  [/\\bis\\b/gi,       ['am', 'are', 'was']],
  [/\\bare\\b/gi,      ['is', 'was', 'were']],
  [/\\bwas\\b/gi,      ['were', 'is', 'are']],
  [/\\bwere\\b/gi,     ['was', 'is', 'are']],
  [/\\bdo\\b/gi,       ['does', 'did', "don't"]],
  [/\\bdoes\\b/gi,     ['do', 'did', "doesn't"]],
  [/\\bdid\\b/gi,      ['do', 'does', "didn't"]],
  [/\\bwill\\b/gi,     ['would', 'shall', "won't"]],
  [/\\bwould\\b/gi,    ['will', 'could', 'should']],
  [/\\bhave\\b/gi,     ['has', 'had', "haven't"]],
  [/\\bhas\\b/gi,      ['have', 'had', "hasn't"]],
  [/\\bhad\\b/gi,      ['have', 'has', "hadn't"]],
  [/\\bcan\\b/gi,      ['could', 'must', "can't"]],
  [/\\bcould\\b/gi,    ['can', 'would', "couldn't"]],
  [/\\bmust\\b/gi,     ['should', 'can', "mustn't"]],
  [/\\bshould\\b/gi,   ['must', 'would', "shouldn't"]],
  [/\\bdon't\\b/gi,   ["doesn't", "didn't", 'do']],
  [/\\bdoesn't\\b/gi, ["don't", "didn't", 'does']],
  [/\\bdidn't\\b/gi,  ["don't", "doesn't", 'did']],
  [/\\bwon't\\b/gi,   ["wouldn't", "couldn't", 'will']],
  [/\\bcan't\\b/gi,   ["couldn't", "won't", 'can']],
  [/\\bknew\\b/gi,     ['know', 'knows', 'known']],
  [/\\bwent\\b/gi,     ['go', 'goes', 'gone']],
  [/\\bcame\\b/gi,     ['come', 'comes', 'coming']],
  [/\\bsaid\\b/gi,     ['say', 'says', 'saying']],
  [/\\bgot\\b/gi,      ['get', 'gets', 'getting']],
  [/\\bmade\\b/gi,     ['make', 'makes', 'making']],
  [/\\btook\\b/gi,     ['take', 'takes', 'taking']],
  [/\\bsaw\\b/gi,      ['see', 'sees', 'seen']],
];

const PRONOUN_SWAPS: [RegExp, string][] = [
  [/^I\\b/,       'He'],
  [/^I\\b/,       'She'],
  [/^I\\b/,       'They'],
  [/^He\\b/,      'She'],
  [/^He\\b/,      'I'],
  [/^She\\b/,     'He'],
  [/^She\\b/,     'They'],
  [/^They\\b/,    'We'],
  [/^They\\b/,    'He'],
  [/^We\\b/,      'They'],
  [/^We\\b/,      'I'],
  [/^You\\b/,     'I'],
  [/^You\\b/,     'They'],
  [/\\bme\\b/gi,   'him'],
  [/\\bhim\\b/gi,  'me'],
  [/\\bmy\\b/gi,   'his'],
  [/\\bhis\\b/gi,  'my'],
];

const makeMutations = (answer: string): string[] => {
  const mutations: string[] = [];
  const answerLow = answer.toLowerCase();

  for (const [pat, reps] of AUX_SWAPS) {
    if (!new RegExp(pat.source, 'gi').test(answer)) continue;
    for (const rep of reps) {
      const m = answer.replace(new RegExp(pat.source, 'gi'), rep);
      if (m !== answer && m.toLowerCase() !== answerLow) mutations.push(m);
    }
  }

  if (/\\bnot\\b/i.test(answer)) {
    const m = answer.replace(/\\s+not\\b/i, '').trim();
    if (m !== answer) mutations.push(m);
  } else {
    const auxMatch = answer.match(/\\b(am|is|are|was|were|do|does|did|will|would|have|has|had|can|could|must|should)\\b/i);
    if (auxMatch && auxMatch.index !== undefined) {
      const pos = auxMatch.index + auxMatch[0].length;
      mutations.push(answer.slice(0, pos) + ' not' + answer.slice(pos));
    }
  }

  for (const [pat, rep] of PRONOUN_SWAPS) {
    const m = answer.replace(pat, rep);
    if (m !== answer && m.toLowerCase() !== answerLow) {
      mutations.push(m);
      break;
    }
  }

  const words = answer.split(' ');
  if (words.length >= 3) {
    const LAST_WORD_SUBS: Record<string, string[]> = {
      'home':     ['school', 'work', 'here'],
      'school':   ['home', 'work', 'there'],
      'work':     ['home', 'school', 'here'],
      'day':      ['week', 'time', 'night'],
      'week':     ['day', 'month', 'time'],
      'good':     ['bad', 'great', 'fine'],
      'bad':      ['good', 'great', 'fine'],
      'big':      ['small', 'large', 'little'],
      'small':    ['big', 'large', 'little'],
      'fast':     ['slow', 'quickly', 'late'],
      'slow':     ['fast', 'quickly', 'early'],
      'happy':    ['sad', 'angry', 'tired'],
      'sad':      ['happy', 'angry', 'tired'],
      'now':      ['later', 'soon', 'today'],
      'here':     ['there', 'away', 'home'],
      'there':    ['here', 'away', 'back'],
      'today':    ['tomorrow', 'yesterday', 'now'],
      'tomorrow': ['today', 'yesterday', 'soon'],
      'morning':  ['evening', 'night', 'afternoon'],
      'evening':  ['morning', 'night', 'afternoon'],
    };
    const lastWord = words[words.length - 1].toLowerCase().replace(/[^a-z]/g, '');
    if (LAST_WORD_SUBS[lastWord]) {
      for (const sub of LAST_WORD_SUBS[lastWord]) {
        const m = words.slice(0, -1).join(' ') + ' ' + sub;
        if (m.toLowerCase() !== answerLow) { mutations.push(m); break; }
      }
    }
  }

  if (words.length >= 2) {
    const lastW = words[words.length - 1];
    let m = '';
    if (lastW.endsWith('s') && lastW.length > 3 && !lastW.endsWith('ss')) {
      m = [...words.slice(0, -1), lastW.slice(0, -1)].join(' ');
    } else if (/^[a-z]+$/.test(lastW) && lastW.length > 2) {
      m = [...words.slice(0, -1), lastW + 's'].join(' ');
    }
    if (m && m !== answer && m.toLowerCase() !== answerLow) mutations.push(m);
  }

  const seen = new Set<string>([answerLow]);
  return mutations.filter(m => {
    const ml = m.toLowerCase();
    if (seen.has(ml)) return false;
    seen.add(ml);
    return true;
  });
};

// ── Публичные пулы (для тестирования / будущего использования) ───────────────
export const QUIZ_EASY_POOL   = EASY_POOL;
export const QUIZ_MEDIUM_POOL = MEDIUM_POOL;
export const QUIZ_HARD_POOL   = HARD_POOL;

const POOLS: Record<'easy'|'medium'|'hard', QuizPoolEntry[]> = {
  easy:   EASY_POOL,
  medium: MEDIUM_POOL,
  hard:   HARD_POOL,
};

const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5);

// ── Основная функция ──────────────────────────────────────────────────────────
export const getQuizPhrases = (
  level: 'easy'|'medium'|'hard',
  count: number = 10,
  lang: 'ru'|'uk' = 'ru'
): QuizPhrase[] => {
  const pool = POOLS[level];
  if (pool.length === 0) return [];

  const shuffled = shuffle(pool);
  const selected: QuizPoolEntry[] = [];
  const usedAnswers = new Set<string>();
  let lastLesson = -1;

  for (const item of shuffled) {
    if (selected.length >= count) break;
    if (item.lessonNum === lastLesson) continue;
    if (usedAnswers.has(item.english)) continue;
    selected.push(item);
    usedAnswers.add(item.english);
    lastLesson = item.lessonNum;
  }

  for (const item of shuffled) {
    if (selected.length >= count) break;
    if (!usedAnswers.has(item.english)) {
      selected.push(item);
      usedAnswers.add(item.english);
    }
  }

  return selected.map(entry => {
    const answer = entry.english;
    const prompt = lang === 'uk' ? entry.uk : entry.ru;

    const mutations = makeMutations(answer);
    const distractors: string[] = [];
    for (const m of mutations) {
      if (distractors.length >= 3) break;
      if (m !== answer && !distractors.includes(m)) distractors.push(m);
    }

    const fallbacks = [
      'No, ' + answer.charAt(0).toLowerCase() + answer.slice(1),
      answer + ', right?',
      'Please ' + answer.charAt(0).toLowerCase() + answer.slice(1),
      'Yes, ' + answer.charAt(0).toLowerCase() + answer.slice(1),
    ].filter(m => m !== answer && !distractors.includes(m));

    while (distractors.length < 3 && fallbacks.length > 0) {
      distractors.push(fallbacks.shift()!);
    }
    let safeIdx = 1;
    while (distractors.length < 3) distractors.push(answer + ' (' + safeIdx++ + ')');

    const allChoices = shuffle([...distractors.slice(0, 3), answer]);
    const correct = allChoices.indexOf(answer);

    return {
      ru:      entry.ru,
      uk:      entry.uk,
      choices: allChoices,
      correct: correct === -1 ? 3 : correct,
      answer,
      lessonNum: entry.lessonNum,
      level:   entry.level as PhraseLevel,
    };
  });
};

export default { getQuizPhrases };
"""

easy_ts = to_ts_array('EASY_POOL', easy)
medium_ts = to_ts_array('MEDIUM_POOL', medium)
hard_ts = to_ts_array('HARD_POOL', hard)

result = header + easy_ts + '\n\n' + medium_ts + '\n\n' + hard_ts + '\n' + footer

with open(out_path, 'w', encoding='utf-8') as f:
    f.write(result)

print(f'Written to {out_path}')
print(f'Total lines: {len(result.splitlines())}')
