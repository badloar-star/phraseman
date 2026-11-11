/**
 * Правила «доказуемого пропуска» для экзамена уровня.
 *
 * зачем (владелец, пункт U10 «Один подходящий ответ», 11.11): в задании «пропуск + варианты» в пропуск обязан подходить РОВНО
 * один вариант — грамматически и по смыслу. Прежний отбор брал соблазны плитки и добирал «словами того же класса», поэтому
 * выходило «Are you ___?» → free / okay / tired и «We buy ___» → food / coffee: все варианты верны, а засчитывался один.
 * Смысловые слова (существительные, прилагательные, наречия, вопросительные слова, предлоги места) взаимозаменяемы по
 * построению, и машина не может доказать, что соблазн не подходит. Поэтому пропуск выдаётся только там, где единственность
 * доказывается ПРАВИЛОМ ГРАММАТИКИ, а соблазны строятся этим же правилом (каждый заведомо нарушает согласование):
 *   time  — in/on/at перед однозначным указанием времени («They walk ___ the evening» → in);
 *   how   — How перед much/many/old/often/long/far;
 *   art   — a/an по первому звуку следующего слова; соблазны — второй артикль и слова множественного числа;
 *   verb  — окончание -s после he/she/it и его отсутствие после I/you/we/they (только слова, размеченные как глагол);
 *   past  — was/were по соседнему местоимению;
 *   have  — have/has по соседнему местоимению;
 *   do    — do/does по соседнему местоимению (отрицание и вопрос);
 *   be    — am/is/are по соседнему местоимению;
 *   subj  — местоимение-подлежащее по соседнему вспомогательному глаголу.
 * Нет правила — нет пропуска: лучше взять другую фразу, чем засчитать ошибку за верный ответ.
 * Модуль чистый (без React Native и данных курса) — его читает и экзамен, и сторож tests/level_exam_gap_rules.test.ts.
 */

export type GapRuleId = 'time' | 'how' | 'art' | 'verb' | 'past' | 'have' | 'do' | 'be' | 'subj';

export type GapRuleInput = {
  /** Целая английская фраза. */
  sentence: string;
  /** Слово, которое уходит в пропуск (как в плитке). */
  answer: string;
  /** Разметка класса слова из данных урока (есть только в уроках 1–8). */
  category?: string;
  /** Авторские соблазны плитки — берутся первыми, если правило доказывает, что они неверны. */
  authored: readonly string[];
  /** Слова того же класса из словаря пройденных уроков (для правила verb). */
  categoryPool: readonly string[];
  /** Слово есть в словаре пройденных уроков (слово владельца 05.11: в экзамене только пройденное). */
  isKnown: (word: string) => boolean;
};

export type GapRuleResult = { rule: GapRuleId; answer: string; distractors: [string, string, string] };

/** Порядок важен: сначала содержательные правила, местоимение-подлежащее — последним (оно есть почти в каждой фразе). */
export const GAP_RULE_ORDER: readonly GapRuleId[] = ['time', 'how', 'art', 'verb', 'past', 'have', 'do', 'be', 'subj'];

const SUBJECTS = ['i', 'you', 'he', 'she', 'it', 'we', 'they'] as const;
const OBJECTS = ['me', 'him', 'us', 'them'] as const;
type Subject = (typeof SUBJECTS)[number];

/** С какими подлежащими согласуется вспомогательный глагол. */
const AGREEMENT: Readonly<Record<string, readonly Subject[]>> = {
  am: ['i'],
  is: ['he', 'she', 'it'], has: ['he', 'she', 'it'], does: ['he', 'she', 'it'],
  are: ['you', 'we', 'they'],
  have: ['i', 'you', 'we', 'they'], do: ['i', 'you', 'we', 'they'],
  was: ['i', 'he', 'she', 'it'],
  were: ['you', 'we', 'they'],
};
const BE_FORMS = ['am', 'is', 'are'] as const;
const CLAUSE_STARTERS = new Set(['if', 'when', 'while', 'that', 'because', 'and', 'but', 'so', 'before', 'after', 'until', 'although', 'though']);
const QUESTION_WORDS = new Set(['what', 'where', 'when', 'why', 'how', 'who']);

const NUMBER_WORDS = new Set(['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']);
const AT_TIMES = new Set(['noon', 'midnight', 'night']);
const WEEKDAYS = new Set(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
const MONTHS = new Set(['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']);
const SEASONS = new Set(['winter', 'spring', 'summer', 'autumn']);
const DAY_PARTS = new Set(['morning', 'afternoon', 'evening']);

const HOW_FOLLOWERS = new Set(['much', 'many', 'old', 'often', 'long', 'far']);

/** Согласная буква, но гласный звук → an. */
const AN_BEFORE_CONSONANT_LETTER = /^(hour|honest|honou?r|heir)/u;
/** Гласная буква, но согласный звук → a. */
const A_BEFORE_VOWEL_LETTER = /^(uni|use|usu|user|euro|one$|once$|u$|utensil|ukulele)/u;
/** После a/an стоит не единственное исчисляемое — множественный соблазн может оказаться верным. */
const ARTICLE_UNSAFE_NEXT = new Set(['few', 'little', 'lot', 'bit', 'couple', 'great', 'good', 'hundred', 'thousand', 'million', 'dozen', 'fish', 'sheep', 'deer', 'series', 'species', 'aircraft', 'means']);
const PLURAL_ONLY_WORDS = ['these', 'those', 'many', 'two', 'three', 'several'] as const;

/** Основа совпадает с прошедшим временем: «She read it» верно без -s, согласование ничего не доказывает. */
const BASE_EQUALS_PAST = new Set(['read', 'put', 'cut', 'cost', 'let', 'hit', 'hurt', 'set', 'shut', 'quit', 'spread', 'beat', 'bet', 'fit']);
/** Неправильные формы прошедшего времени: «She took off glasses» верно без -s, как соблазн не годится. */
const IRREGULAR_PAST = new Set(('was were had did went got gave took made came saw knew thought told said found left felt kept met paid sent spent sold '
  + 'bought brought built caught chose drank drove ate fell forgot heard held lost ran sat slept spoke stood taught understood woke wore won wrote '
  + 'began broke became grew threw flew rang sang swam meant led lent done gone seen been taken given written eaten chosen spoken broken forgotten known shown').split(' '));
const VERB_CATEGORIES = new Set(['verb', 'verbo', 'verbs']);

type Tokenized = { tokens: string[]; lower: string[]; index: number };

function lowerOf(value: string): string {
  return value.trim().toLocaleLowerCase();
}

/** Слова фразы и место ответа; ответ обязан встречаться ровно один раз (иначе пропуск неоднозначен сам по себе). */
function tokenize(sentence: string, answer: string): Tokenized | null {
  const tokens = sentence.match(/[A-Za-z0-9']+/gu) || [];
  const lower = tokens.map(lowerOf);
  const key = lowerOf(answer);
  const first = lower.indexOf(key);
  if (first < 0 || lower.indexOf(key, first + 1) >= 0) return null;
  return { tokens, lower, index: first };
}

function isSubject(value: string | undefined): value is Subject {
  return !!value && (SUBJECTS as readonly string[]).includes(value);
}

/** Пишем соблазн так же, как стоит ответ: в начале фразы — с заглавной; «I» всегда заглавная. */
function styled(word: string, like: string): string {
  if (word === 'i') return 'I';
  return /^[A-Z]/u.test(like) ? word.charAt(0).toLocaleUpperCase() + word.slice(1) : word;
}

function stableIndex(seed: string, size: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return size > 0 ? hash % size : 0;
}

/**
 * Собирает три соблазна из доказанно неверных слов: сначала авторские (если они в этом списке), потом остальные по кругу
 * от детерминированной точки (одна и та же фраза всегда даёт один и тот же набор — экзамен восстанавливается по seed).
 */
function pick(input: GapRuleInput, rule: GapRuleId, provenWrong: readonly string[], required: readonly string[] = []): GapRuleResult | null {
  const answerKey = lowerOf(input.answer);
  const pool = [...new Set(provenWrong.map(lowerOf))].filter((word) => word !== answerKey && input.isKnown(word));
  const must = required.map(lowerOf).filter((word) => pool.includes(word));
  if (must.length !== required.length) return null;
  const authored = input.authored.map(lowerOf).filter((word) => pool.includes(word) && !must.includes(word));
  const start = stableIndex(`${rule}:${input.sentence}`, pool.length);
  const rotated = pool.map((_word, offset) => pool[(start + offset) % pool.length]!);
  const chosen = [...new Set([...must, ...authored, ...rotated])].slice(0, 3);
  if (chosen.length !== 3) return null;
  const answer = input.answer.trim();
  return { rule, answer, distractors: [styled(chosen[0]!, answer), styled(chosen[1]!, answer), styled(chosen[2]!, answer)] };
}

/** Указательные согласуются как it / they: «This is…», «Are these bags ours?» (урок притяжательных держится на них). */
const DEMONSTRATIVE_AS: Readonly<Record<string, Subject>> = { this: 'it', that: 'it', these: 'they', those: 'they' };

function subjectOf(value: string | undefined): Subject | null {
  if (isSubject(value)) return value;
  return (value && DEMONSTRATIVE_AS[value]) || null;
}

type AdjacentSubject = { subject: Subject; question: boolean };

/**
 * Подлежащее рядом с глаголом: «He ___ …» (слева, в начале фразы/придаточного) или «___ he …?» (справа, в вопросе).
 * Слева указательное считается подлежащим, только когда стоит само («This is…»); «That he is…» — союз, поэтому «that»
 * перед местоимением сюда не попадает: слева проверяется слово вплотную к пропуску.
 */
function adjacentSubject(t: Tokenized): AdjacentSubject | null {
  const before = subjectOf(t.lower[t.index - 1]);
  const after = subjectOf(t.lower[t.index + 1]);
  const startsClause = (position: number): boolean => position === 0 || CLAUSE_STARTERS.has(t.lower[position - 1] ?? '');
  if (before && startsClause(t.index - 1)) return { subject: before, question: false };
  const opensQuestion = t.index === 0 || (t.index === 1 && QUESTION_WORDS.has(t.lower[0] ?? ''));
  if (after && opensQuestion) return { subject: after, question: true };
  return null;
}

function beFor(subject: Subject): (typeof BE_FORMS)[number] {
  return subject === 'i' ? 'am' : AGREEMENT.is!.includes(subject) ? 'is' : 'are';
}

/** Формы am/is/are, которые с этим подлежащим не согласуются («She am», «She are»). */
function wrongBeForms(subject: Subject): string[] {
  return BE_FORMS.filter((form) => form !== beFor(subject));
}

function ruleTime(input: GapRuleInput, t: Tokenized): GapRuleResult | null {
  const answer = t.lower[t.index]!;
  if (!['in', 'on', 'at'].includes(answer)) return null;
  const nextRaw = t.tokens[t.index + 1] ?? '';
  const next = t.lower[t.index + 1] ?? '';
  const afterNext = t.lower[t.index + 2] ?? '';
  let expected = '';
  if (NUMBER_WORDS.has(next) || /^\d{1,2}$/u.test(next) || AT_TIMES.has(next)) expected = 'at';
  else if (WEEKDAYS.has(nextRaw) || WEEKDAYS.has(nextRaw.replace(/s$/u, ''))) expected = 'on';
  else if (MONTHS.has(nextRaw) || SEASONS.has(next) || /^\d{4}$/u.test(next) || (next === 'the' && DAY_PARTS.has(afterNext))) expected = 'in';
  if (expected !== answer) return null;
  // «to» перед временем не ставится никогда; by/from/until сюда нельзя — «by nine», «from Monday» верны
  return pick(input, 'time', ['in', 'on', 'at', 'to'], ['in', 'on', 'at'].filter((word) => word !== answer));
}

function ruleHow(input: GapRuleInput, t: Tokenized): GapRuleResult | null {
  if (t.index !== 0 || t.lower[0] !== 'how' || !HOW_FOLLOWERS.has(t.lower[1] ?? '')) return null;
  return pick(input, 'how', ['what', 'where', 'when', 'why']);
}

function ruleArticle(input: GapRuleInput, t: Tokenized): GapRuleResult | null {
  const answer = t.lower[t.index]!;
  if (answer !== 'a' && answer !== 'an') return null;
  const next = t.lower[t.index + 1] ?? '';
  if (!/^[a-z]+$/u.test(next) || ARTICLE_UNSAFE_NEXT.has(next)) return null;
  const vowelSound = AN_BEFORE_CONSONANT_LETTER.test(next) || (/^[aeiou]/u.test(next) && !A_BEFORE_VOWEL_LETTER.test(next));
  if ((vowelSound ? 'an' : 'a') !== answer) return null;
  // «the» и притяжательные сюда нельзя — они грамматически встают на место артикля; слова множественного числа перед
  // единственным существительным не встают никогда («these question», «two idea»)
  return pick(input, 'art', [answer === 'a' ? 'an' : 'a', ...PLURAL_ONLY_WORDS], [answer === 'a' ? 'an' : 'a']);
}

function thirdPersonOf(base: string): string[] {
  return [`${base}s`, `${base}es`, base.endsWith('y') ? `${base.slice(0, -1)}ies` : ''].filter(Boolean);
}

function ruleVerb(input: GapRuleInput, t: Tokenized): GapRuleResult | null {
  if (!VERB_CATEGORIES.has(lowerOf(input.category ?? ''))) return null;
  const answer = t.lower[t.index]!;
  if (answer in AGREEMENT || t.index !== 1 || !isSubject(t.lower[0]) || t.lower[2] === 'not') return null;
  const subject = t.lower[0] as Subject;
  const verbs = [...new Set(input.categoryPool.map(lowerOf))].filter((word) => /^[a-z]+$/u.test(word) && !(word in AGREEMENT));
  const plainBase = (word: string): boolean => !/(s|ed|ing)$/u.test(word) && !BASE_EQUALS_PAST.has(word) && !IRREGULAR_PAST.has(word);
  if (AGREEMENT.is!.includes(subject)) {
    // после he/she/it: верна только форма на -s; соблазны — основы без -s («She speak», «She live»)
    const base = verbs.find((word) => thirdPersonOf(word).includes(answer));
    if (!base || !plainBase(base)) return null;
    return pick(input, 'verb', [base, ...verbs.filter(plainBase)], [base]);
  }
  // после I/you/we/they: верна только основа; соблазны — формы на -s («They lives», «They works»)
  if (!plainBase(answer)) return null;
  const withS = thirdPersonOf(answer).find((word) => verbs.includes(word));
  if (!withS) return null;
  const sForms = verbs.filter((word) => /s$/u.test(word) && !/ss$/u.test(word) && verbs.some((base) => thirdPersonOf(base).includes(word)));
  return pick(input, 'verb', [withS, ...sForms], [withS]);
}

function rulePast(input: GapRuleInput, t: Tokenized): GapRuleResult | null {
  const answer = t.lower[t.index]!;
  if (answer !== 'was' && answer !== 'were') return null;
  const subject = adjacentSubject(t)?.subject;
  if (!subject || !AGREEMENT[answer]!.includes(subject)) return null;
  // настоящее время согласованной формы («She is writing») было бы верным, поэтому берём только несогласованные формы
  return pick(input, 'past', [answer === 'was' ? 'were' : 'was', ...wrongBeForms(subject)]);
}

function ruleHave(input: GapRuleInput, t: Tokenized): GapRuleResult | null {
  const answer = t.lower[t.index]!;
  if (answer !== 'have' && answer !== 'has') return null;
  const subject = adjacentSubject(t)?.subject;
  if (!subject || !AGREEMENT[answer]!.includes(subject)) return null;
  return pick(input, 'have', [answer === 'have' ? 'has' : 'have', ...wrongBeForms(subject)]);
}

function ruleDo(input: GapRuleInput, t: Tokenized): GapRuleResult | null {
  const answer = t.lower[t.index]!;
  if (answer !== 'do' && answer !== 'does') return null;
  const found = adjacentSubject(t);
  if (!found || !AGREEMENT[answer]!.includes(found.subject)) return null;
  const subject = found.subject;
  // утверждение без «not» («I do it») — смысловой глагол, а не вспомогательный: такой пропуск не берём
  if (!found.question && t.lower[t.index + 1] !== 'not') return null;
  return pick(input, 'do', [answer === 'do' ? 'does' : 'do', ...wrongBeForms(subject)]);
}

function ruleBe(input: GapRuleInput, t: Tokenized): GapRuleResult | null {
  const answer = t.lower[t.index]!;
  if (!(BE_FORMS as readonly string[]).includes(answer)) return null;
  const subject = adjacentSubject(t)?.subject;
  if (!subject || beFor(subject) !== answer) return null;
  // третий соблазн — do/does и have/has, не согласованные с подлежащим («He do not here», «I has okay»)
  const third = AGREEMENT.is!.includes(subject) ? ['do', 'have'] : ['does', 'has'];
  return pick(input, 'be', [...wrongBeForms(subject), ...third], wrongBeForms(subject));
}

function ruleSubject(input: GapRuleInput, t: Tokenized): GapRuleResult | null {
  const answer = t.lower[t.index]!;
  if (!isSubject(answer)) return null;
  const before = t.lower[t.index - 1] ?? '';
  const after = t.lower[t.index + 1] ?? '';
  const startsClause = t.index === 0 || CLAUSE_STARTERS.has(before);
  const afterQuestionVerb = before in AGREEMENT && (t.index === 1 || (t.index === 2 && QUESTION_WORDS.has(t.lower[0] ?? '')));
  const verb = startsClause && after in AGREEMENT ? after : afterQuestionVerb ? before : '';
  if (!verb || !AGREEMENT[verb]!.includes(answer)) return null;
  // неверны: подлежащие, не согласованные с глаголом («They is»), и формы дополнения («Him is», «Us are»)
  return pick(input, 'subj', [...SUBJECTS.filter((word) => !AGREEMENT[verb]!.includes(word)), ...OBJECTS]);
}

const RULES: Readonly<Record<GapRuleId, (input: GapRuleInput, t: Tokenized) => GapRuleResult | null>> = {
  time: ruleTime, how: ruleHow, art: ruleArticle, verb: ruleVerb, past: rulePast, have: ruleHave, do: ruleDo, be: ruleBe, subj: ruleSubject,
};

/** Пропуск по одному правилу; null — правило к этому слову не применимо или не хватило доказанно неверных соблазнов. */
export function provableGapByRule(rule: GapRuleId, input: GapRuleInput): GapRuleResult | null {
  if (!/^[A-Za-z']+$/u.test(input.answer.trim())) return null;
  const tokenized = tokenize(input.sentence, input.answer);
  return tokenized ? RULES[rule](input, tokenized) : null;
}

/** Первый пропуск, который доказывается хоть одним правилом (в порядке GAP_RULE_ORDER). */
export function provableGap(input: GapRuleInput): GapRuleResult | null {
  for (const rule of GAP_RULE_ORDER) {
    const result = provableGapByRule(rule, input);
    if (result) return result;
  }
  return null;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
