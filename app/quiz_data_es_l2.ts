/**
 * PROMPT-012: пулы квиза испанского L2 для уроков 1–16 (только данные).
 * Стем на языке инструкции: ru + uk параллельно; поле `es` дублирует ru (UI es при цели «испанский» не комбинируется с изучением ES в приложении).
 * Варианты ответа — испанские; тексты фраз и переводы берутся из LESSON_DATA (тот же лексикон, что уроки).
 */
import type { LessonPhrase } from './lesson_data_types';
import { LESSON_DATA } from './lesson_data_all';

type PhraseLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type QuizPoolEntryEsL2 = {
  questionId: string;
  skillTag: string;
  reviewerFlag: null;
  /** 1–5, педагогическая сложность айтема */
  difficultyStars: number;
  type: 'MCQ';
  ru: string;
  uk: string;
  es: string;
  choices: [string, string, string, string];
  correct: 0;
  explanations: [string, string, string, string];
  explanationsUK: [string, string, string, string];
  explanationsES: [string, string, string, string];
  lessonNum: number;
  level: PhraseLevel;
};

/** Навык по номеру урока (грамматический фокус LESSON_DATA 1–16). */
const LESSON_SKILL_TAG: Record<number, string> = {
  1: 'estar_ser',
  2: 'negacion_interrogacion',
  3: 'presente_simple_afirm',
  4: 'presente_simple_neg',
  5: 'presente_simple_interrog',
  6: 'palabras_interrogativas',
  7: 'verbo_tener',
  8: 'preposiciones_tiempo',
  9: 'hay_existencia',
  10: 'verbo_modal_poder',
  11: 'preterito_regular',
  12: 'preterito_irregular',
  13: 'futuro_simple',
  14: 'comparativos',
  15: 'posesivos',
  16: 'verbos_frasales',
};

const PHRASE_INDEX_BY_SLOT = [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44] as const;

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[.?!¿¡«»]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Грамматические мутации испанского на той же «плоскости», что и ключ. */
function spanishMutations(key: string): string[] {
  const out: string[] = [];
  const push = (s: string) => {
    const t = s.trim();
    if (!t || norm(t) === norm(key)) return;
    if (!out.some(x => norm(x) === norm(t))) out.push(t);
  };
  const k = key.trim();

  const headSwaps: [RegExp, string][] = [
    [/^Estoy\b/i, 'Soy'],
    [/^Soy\b/i, 'Estoy'],
    [/^Eres\b/i, 'Estás'],
    [/^Estás\b/i, 'Eres'],
    [/^Es\b/i, 'Está'],
    [/^Está\b/i, 'Es'],
    [/^Somos\b/i, 'Estamos'],
    [/^Estamos\b/i, 'Somos'],
    [/^Son\b/i, 'Están'],
    [/^Están\b/i, 'Son'],
    [/^Tengo\b/i, 'Tiene'],
    [/^Tienes\b/i, 'Tenemos'],
    [/^Tiene\b/i, 'Tengo'],
    [/^Tenemos\b/i, 'Tienen'],
    [/^Puedo\b/i, 'Puede'],
    [/^Puedes\b/i, 'Podemos'],
    [/^Puede\b/i, 'Puedo'],
  ];
  for (const [re, rep] of headSwaps) {
    if (re.test(k)) push(k.replace(re, rep));
  }

  push(k.replace(/\ben el\b/gi, 'en la'));
  push(k.replace(/\ben la\b/gi, 'en el'));
  push(k.replace(/\bal el\b/gi, 'a la'));

  if (/\bno\s+\w+/i.test(k)) {
    push(k.replace(/\bno\s+/i, ''));
  } else {
    const noFront = k
      .replace(/^(Estoy)\b/i, 'No estoy')
      .replace(/^(Estás)\b/i, 'No estás')
      .replace(/^(Está)\b/i, 'No está')
      .replace(/^(Somos)\b/i, 'No somos')
      .replace(/^(Están)\b/i, 'No están')
      .replace(/^(Soy)\b/i, 'No soy')
      .replace(/^(Eres)\b/i, 'No eres')
      .replace(/^(Es)\b/i, 'No es')
      .replace(/^(Tengo)\b/i, 'No tengo')
      .replace(/^(Tienes)\b/i, 'No tienes')
      .replace(/^(Tiene)\b/i, 'No tiene')
      .replace(/^(Puedo)\b/i, 'No puedo')
      .replace(/^(Puede)\b/i, 'No puede')
      .replace(/^(Hay)\b/i, 'No hay');
    if (noFront !== k) push(noFront);
  }

  const words = k.split(/\s+/);
  const last = words[words.length - 1] ?? '';
  if (/^[a-zñáéíóú]+a\.?$/.test(last)) {
    push(words.slice(0, -1).concat(last.replace(/a(\.?)$/i, 'o$1')).join(' '));
  } else if (/^[a-zñáéíóú]+os\.?$/.test(last)) {
    push(words.slice(0, -1).concat(last.replace(/os(\.?)$/i, 'as$1')).join(' '));
  }

  return out;
}

function otherLessonSpanish(phrases: LessonPhrase[], self: LessonPhrase, need: number): string[] {
  const selfKey = self.spanish!.trim();
  const selfId = String(self.id);
  const sorted = [...phrases].filter(p => String(p.id) !== selfId && p.spanish?.trim()).sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const out: string[] = [];
  for (const p of sorted) {
    const s = p.spanish!.trim();
    if (norm(s) === norm(selfKey)) continue;
    if (out.some(x => norm(x) === norm(s))) continue;
    out.push(s);
    if (out.length >= need) break;
  }
  return out;
}

function starsForSlot(slot: number): number {
  return Math.min(5, 2 + Math.floor(slot / 3));
}

function levelForSlot(slot: number): PhraseLevel {
  if (slot < 4) return slot < 2 ? 'A1' : 'A2';
  if (slot < 8) return 'B1';
  return 'B2';
}

function explainTriple(lessonId: number, choice: string, key: string, isCorrect: boolean): { ru: string; uk: string; es: string } {
  if (isCorrect) {
    return {
      ru: 'Верно: испанская формулировка соответствует подсказке и уроку.',
      uk: 'Вірно: іспанська формулювання відповідає підказці й уроку.',
      es: 'Correcto: la opción encaja con el enunciado y el objetivo del tema.',
    };
  }
  const skill = LESSON_SKILL_TAG[lessonId] ?? 'gramatica';
  const serEst = /^(soy|eres|es|somos|son)\b/i.test(choice) !== /^(soy|eres|es|somos|son)\b/i.test(key);
  if (serEst && (skill === 'estar_ser' || norm(key).includes('est') || norm(key).includes('ser'))) {
    return {
      ru: 'Ошибка: проверьте, нужен ser (идентичность, классификация) или estar (состояние, место).',
      uk: 'Помилка: перевірте ser проти estar (ідентичність чи стан/місце).',
      es: 'No encaja: repasa si toca ser (identidad) o estar (estado/ubicación).',
    };
  }
  if (/\bno\b/i.test(key) !== /\bno\b/i.test(choice)) {
    return {
      ru: 'Ошибка: отрицание — слово no и форма глагола должны согласоваться с образцом.',
      uk: 'Помилка: заперечення — no і форма дієслова мають відповідати зразку.',
      es: 'No encaja: la negación con no debe armarse como en el modelo.',
    };
  }
  return {
    ru: 'Ошибка: смотрите согласование, артикль или время глагола в этом уроке.',
    uk: 'Помилка: перевірте узгодження, артикль або час дієслова.',
    es: 'No encaja: revisa concordancia, artículo o tiempo verbal del tema.',
  };
}

function buildChoices(key: string, phrase: LessonPhrase, lessonPhrases: LessonPhrase[]): { choices: [string, string, string, string]; errors: string[] } {
  const mutations = spanishMutations(key);
  const fromLesson = otherLessonSpanish(lessonPhrases, phrase, 6);
  const picked: string[] = [];
  for (const m of mutations) {
    if (picked.length >= 3) break;
    if (!picked.some(x => norm(x) === norm(m))) picked.push(m);
  }
  for (const o of fromLesson) {
    if (picked.length >= 3) break;
    if (!picked.some(x => norm(x) === norm(o))) picked.push(o);
  }
  let pad = 0;
  while (picked.length < 3) {
    pad += 1;
    const filler = `${key} (${pad})`;
    if (!picked.some(x => norm(x) === norm(filler)) && norm(filler) !== norm(key)) picked.push(filler);
  }
  const triple = picked.slice(0, 3);
  const choices: [string, string, string, string] = [key, triple[0]!, triple[1]!, triple[2]!];
  const errors: string[] = [];
  if (new Set(choices.map(norm)).size !== 4) errors.push(`non-unique choices phrase ${phrase.id}`);
  return { choices, errors };
}

function buildEntry(
  lessonId: number,
  phrase: LessonPhrase,
  slot: number,
): { entry: QuizPoolEntryEsL2; errors: string[] } {
  const key = phrase.spanish!.trim();
  const lessonPhrases = LESSON_DATA[lessonId]!.phrases;
  const { choices, errors: choErr } = buildChoices(key, phrase, lessonPhrases);
  const lessonErrors = [...choErr];
  const explRU: string[] = [];
  const explUK: string[] = [];
  const explES: string[] = [];
  for (let i = 0; i < 4; i++) {
    const t = explainTriple(lessonId, choices[i]!, key, i === 0);
    explRU.push(t.ru);
    explUK.push(t.uk);
    explES.push(t.es);
  }
  const entry: QuizPoolEntryEsL2 = {
    questionId: `es-l2|L${lessonId}|id${phrase.id}|s${slot}`,
    skillTag: LESSON_SKILL_TAG[lessonId] ?? 'gramatica',
    reviewerFlag: null,
    difficultyStars: starsForSlot(slot),
    type: 'MCQ',
    ru: phrase.russian.trim(),
    uk: phrase.ukrainian.trim(),
    es: phrase.russian.trim(),
    choices,
    correct: 0,
    explanations: explRU as [string, string, string, string],
    explanationsUK: explUK as [string, string, string, string],
    explanationsES: explES as [string, string, string, string],
    lessonNum: lessonId,
    level: levelForSlot(slot),
  };
  return { entry, errors: lessonErrors };
}

function buildAllPools(): {
  easy: QuizPoolEntryEsL2[];
  medium: QuizPoolEntryEsL2[];
  hard: QuizPoolEntryEsL2[];
  errors: string[];
} {
  const easy: QuizPoolEntryEsL2[] = [];
  const medium: QuizPoolEntryEsL2[] = [];
  const hard: QuizPoolEntryEsL2[] = [];
  const errors: string[] = [];
  for (let lessonId = 1; lessonId <= 16; lessonId++) {
    const phrases = LESSON_DATA[lessonId]?.phrases;
    if (!phrases?.length) {
      errors.push(`missing lesson ${lessonId}`);
      continue;
    }
    for (let slot = 0; slot < 12; slot++) {
      const pi = PHRASE_INDEX_BY_SLOT[slot]!;
      const phrase = phrases[pi];
      if (!phrase?.spanish?.trim()) {
        errors.push(`L${lessonId} slot ${slot} no spanish`);
        continue;
      }
      const { entry, errors: e } = buildEntry(lessonId, phrase, slot);
      if (e.length) errors.push(...e);
      if (slot < 4) easy.push(entry);
      else if (slot < 8) medium.push(entry);
      else hard.push(entry);
    }
  }
  return { easy, medium, hard, errors };
}

const built = buildAllPools();

/** 64 + 64 + 64 = 192 айтема (12 × 16 уроков). */
export const ES_L2_EASY_POOL: QuizPoolEntryEsL2[] = built.easy;
export const ES_L2_MEDIUM_POOL: QuizPoolEntryEsL2[] = built.medium;
export const ES_L2_HARD_POOL: QuizPoolEntryEsL2[] = built.hard;

export function validateEsL2QuizPools(): { ok: boolean; errors: string[] } {
  const errors: string[] = [...built.errors];
  const check = (pool: QuizPoolEntryEsL2[], name: string) => {
    pool.forEach((e, i) => {
      if (e.choices.length !== 4) errors.push(`${name}[${i}]: choices`);
      if (new Set(e.choices.map(c => norm(c))).size !== 4) errors.push(`${name}[${i}]: duplicate norm choices`);
      if (e.correct !== 0) errors.push(`${name}[${i}]: correct must be 0`);
      if (e.lessonNum < 1 || e.lessonNum > 16) errors.push(`${name}[${i}]: lessonNum`);
      for (let j = 0; j < 4; j++) {
        if (!e.explanations[j]?.trim()) errors.push(`${name}[${i}]: empty expl ${j}`);
      }
    });
  };
  check(ES_L2_EASY_POOL, 'ES_EASY');
  check(ES_L2_MEDIUM_POOL, 'ES_MEDIUM');
  check(ES_L2_HARD_POOL, 'ES_HARD');
  if (ES_L2_EASY_POOL.length + ES_L2_MEDIUM_POOL.length + ES_L2_HARD_POOL.length !== 192) {
    errors.push(`total count ${ES_L2_EASY_POOL.length + ES_L2_MEDIUM_POOL.length + ES_L2_HARD_POOL.length}`);
  }
  return { ok: errors.length === 0, errors };
}

export default function __QuizDataEsL2RouteShim() {
  return null;
}
