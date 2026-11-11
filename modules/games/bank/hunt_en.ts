/**
 * Банк игры «Охота на ошибку» — английский классический курс, уроки 1–8 (D207). 2 диалога на урок.
 * зачем: владелец 11.11.2026 — игры должны быть на всех уроках, «фразы должны корректно подбираться».
 * Правила вычитки: три реплики, после исправления каждая — фраза урока или фраза из слов уроков 1..N
 * (диалогу нужны ответы, поэтому берутся и прошлые уроки); неверное слово ровно одно и оно однозначно
 * неверно; слово-обманка стоит в ДРУГОЙ реплике и само верно; объяснение — одна фраза без терминов.
 * Проверка: tests/game_task_bank_en.test.ts.
 */
import type { HuntLine, HuntTask } from '../dialogue_core';

interface Parsed {
  readonly line: HuntLine;
  readonly wrongWord: number;
  readonly fix: string;
}

/**
 * Разметка реплики: `[is|are]` — неверное слово и его замена, `{are}` — слово-обманка.
 * Знак после скобки (`{are}.`) остаётся на слове — так индекс нельзя посчитать с ошибкой.
 */
function parseLine(marked: string, index: number): Parsed {
  let wrongWord = -1;
  let fix = '';
  const tappable: number[] = [];
  const words = marked.split(' ').map((raw, i) => {
    const wrong = /^\[([^|\]]+)\|([^\]]+)\](.*)$/.exec(raw);
    if (wrong) {
      wrongWord = i;
      fix = `${wrong[2]}${wrong[3]}`;
      tappable.push(i);
      return `${wrong[1]}${wrong[3]}`;
    }
    const decoy = /^\{([^}]+)\}(.*)$/.exec(raw);
    if (decoy) {
      tappable.push(i);
      return `${decoy[1]}${decoy[2]}`;
    }
    return raw;
  });
  return { line: { right: index % 2 === 1, words, tappable }, wrongWord, fix };
}

function hunt(lesson: number, n: number, marked: readonly [string, string, string], why: string): HuntTask {
  const parsed = marked.map(parseLine);
  const wrongLine = parsed.findIndex((p) => p.wrongWord >= 0);
  const hit = parsed[wrongLine];
  return {
    id: `hunt-en-l${String(lesson).padStart(2, '0')}-${n}`,
    lines: parsed.map((p) => p.line),
    wrong: { line: wrongLine, word: hit ? hit.wrongWord : -1 },
    fix: hit ? hit.fix : '',
    why,
  };
}

export const HUNT_BANK_EN: Readonly<Record<number, readonly HuntTask[]>> = {
  1: [
    hunt(1, 1, ['The shop is open.', 'The doors [is|are] closed.', 'The lights {are} off.'], 'Doors — их несколько, значит are.'),
    hunt(1, 2, ['I {am} at home.', 'We [is|are] at work.', 'She is late.'], 'С we идёт are.'),
  ],
  2: [
    hunt(2, 1, ['Is the bus here?', 'No, it [are|is] not.', '{Are} we late?'], 'С it идёт is.'),
    hunt(2, 2, ['Are [this|these] seats free?', 'Yes, they {are}.', 'Is your ticket valid?'], 'Seats — их несколько, значит these.'),
  ],
  3: [
    hunt(3, 1, ['I work nearby.', 'She [work|works] nearby.', 'We {walk} to the shop.'], 'Про неё — с -s на конце: works.'),
    hunt(3, 2, ['The shop {opens} at nine.', 'The cafe closes early.', 'The shops [closes|close] late.'], 'Shops — их несколько, поэтому без -s.'),
  ],
  4: [
    hunt(4, 1, ['I do not drive.', 'He [do|does] not drive.', 'We {do} not need help.'], 'С he идёт does.'),
    hunt(4, 2, ['The tap does not work.', 'The lights [does|do] not work.', 'The door {does} not lock.'], 'Lights — их несколько, значит do.'),
  ],
  5: [
    hunt(5, 1, ['Do you take cards?', 'No, we {do} not accept cards.', '[Does|Do] you take cash?'], 'С you вопрос начинается с do.'),
    hunt(5, 2, ['Does this bus {stop} here?', 'No, it does not stop here.', '[Do|Does] the next bus stop here?'], 'Bus — автобус один, значит does.'),
  ],
  6: [
    hunt(6, 1, ['Where do you work?', 'I {work} nearby.', 'When [does|do] you start?'], 'С you идёт do.'),
    hunt(6, 2, ['What time {does} the bus leave?', 'The bus leaves at eight.', 'How much [do|does] a ticket cost?'], 'Ticket — билет один, значит does.'),
  ],
  7: [
    hunt(7, 1, ['Do you have a charger?', 'No, I {do} not have a charger.', 'He [have|has] a charger.'], 'С he идёт has.'),
    hunt(7, 2, ['I have a sore throat.', 'Do you {have} a fever?', 'No, I [has|have] a headache.'], 'С I идёт have.'),
  ],
  8: [
    hunt(8, 1, ['I work every Monday.', 'We meet [in|on] Tuesday.', 'I start {at} seven.'], 'Дни недели — с on.'),
    hunt(8, 2, ['The film starts tonight.', 'The concert starts {at} eight fifteen.', 'The last bus leaves [on|at] eleven.'], 'Время на часах — с at.'),
  ],
};
