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
  // зачем (сессия макетов 12.11): уроки 9–12; неверное слово ломает фразу при любом прочтении («I find my keys» —
  // правильная фраза, поэтому ошибка взята «I finds»)
  9: [
    hunt(9, 1, ['Is there a bus stop nearby?', 'Yes, there [are|is] a stop by the gate.', 'There {are} no buses tonight.'], 'Остановка одна — значит is.'),
    hunt(9, 2, ['Are there any blankets?', 'Yes, there {are} blankets upstairs.', 'Is there [a|any] hot water?'], 'Hot water не считают штуками — any, а не a.'),
  ],
  10: [
    hunt(10, 1, ['Can I pay by card?', 'Yes, you {can} pay by card.', 'Can I [pays|pay] here?'], 'После can I — pay, без -s.'),
    hunt(10, 2, ['Should I book in advance?', 'Yes, you should [booked|book] today.', 'We {can} wait.'], 'После should — book, без -ed.'),
  ],
  11: [
    hunt(11, 1, ['Did you call the office?', 'Yes, I [calls|called] the office.', 'Did she {check} the address?'], 'Ответ о прошлом — called.'),
    hunt(11, 2, ['Did the bus arrive on time?', 'No, it [arrive|arrived] ten minutes late.', 'We {waited} for the driver.'], 'Это уже было — arrived.'),
  ],
  12: [
    hunt(12, 1, ['Did you find your keys?', 'Yes, I [finds|found] my keys.', 'Did she {bring} the charger?'], 'Это уже было — found.'),
    hunt(12, 2, ['Who took the last cup?', 'He [take|took] the last cup.', 'Did you {see} the sign?'], 'Это уже было — took.'),
  ],
};
