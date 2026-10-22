// зачем (координатор 22.10, после сверки «теория ↔ разборы» 3a458f6fe): разборы ошибок в заданиях называют грамматику терминами
// («подлежащее», «глагол», «Present Continuous»…), а теория объясняет простыми словами. Решили не переписывать ~1800 разборов, а
// ввести термин в теории: к уроку, где термин впервые встречается в разборах, ученик уже видел его в теории этого или прошлого урока.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const SESSIONS = path.join(ROOT, 'content', 'learning-v2-course', 'sessions', 'en');
const THEORY = path.join(ROOT, 'modules', 'learning-v2', 'theory', 'generated');

/** Термины разборов (ru). «окончание» и «сказуемое» не входят: первое — обычное слово, второе встречается раз (правит Learning V2). */
const TERMS: Readonly<Record<string, RegExp>> = {
  глагол: /глагол/,
  отрицание: /отрицани/,
  артикль: /артикл/,
  'множественное число': /множественн/,
  'единственное число': /единственн\w* числ/,
  существительное: /существительн/,
  связка: /связк/,
  'Present Simple': /Present Simple/,
  'Present Continuous': /Present Continuous/,
  подлежащее: /подлежащ/,
  прилагательное: /прилагательн/,
  местоимение: /местоимени/,
  притяжательное: /притяжательн/,
};

type Interaction = { modePayload?: { choiceFeedback?: { feedbackByLocale?: { ru?: string } }[]; slotFeedback?: { feedbackByLocale?: { ru?: string } }[] } };

function feedbackOfLesson(lessonDir: string): string {
  const parts: string[] = [];
  for (const session of fs.readdirSync(lessonDir)) {
    const file = path.join(lessonDir, session, 'practice.atomic.json');
    if (!fs.existsSync(file)) continue;
    const data = JSON.parse(fs.readFileSync(file, 'utf8')) as { interactionsByLocale?: { ru?: Interaction[] } };
    for (const it of data.interactionsByLocale?.ru ?? []) {
      for (const fb of [...(it.modePayload?.choiceFeedback ?? []), ...(it.modePayload?.slotFeedback ?? [])]) {
        if (fb.feedbackByLocale?.ru) parts.push(fb.feedbackByLocale.ru);
      }
    }
  }
  return parts.join('\n');
}

const lessons = fs.readdirSync(SESSIONS).filter((d) => /^l\d{2}$/.test(d)).map((d) => Number(d.slice(1))).sort((a, b) => a - b);
const feedback = new Map(lessons.map((n) => [n, feedbackOfLesson(path.join(SESSIONS, `l${String(n).padStart(2, '0')}`))]));
const theory = new Map(lessons.map((n) => {
  const file = path.join(THEORY, `lesson_${String(n).padStart(2, '0')}.ru.json`);
  return [n, fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''];
}));

describe('термины из разборов введены в теории не позже урока, где их встречает ученик', () => {
  it('данные курса прочитаны', () => {
    expect(lessons.length).toBeGreaterThanOrEqual(22);
  });

  it.each(Object.keys(TERMS))('%s', (term) => {
    const re = TERMS[term]!;
    const first = lessons.find((n) => re.test(feedback.get(n) ?? ''));
    if (first === undefined) return;
    const introduced = lessons.find((n) => re.test(theory.get(n) ?? ''));
    expect({ term, firstInFeedback: first, introducedInTheory: introduced ?? null, ok: introduced !== undefined && introduced <= first })
      .toEqual({ term, firstInFeedback: first, introducedInTheory: introduced ?? null, ok: true });
  });
});
