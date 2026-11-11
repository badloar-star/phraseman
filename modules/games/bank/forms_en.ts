/**
 * Банк игры «Три формы» — 30 частых неправильных глаголов одним списком, без привязки к уроку (D207).
 * зачем: владелец 11.11.2026 — «фразы должны корректно подбираться для режимов игры, без багов».
 * Правила вычитки: верна ровно одна форма; неверные — выдуманная форма на -ed и вторая форма (или
 * первая, если вторая совпадает с третьей). Не вошли get (got / gotten — два верных ответа),
 * put, let и read (все три формы пишутся одинаково — выбирать не из чего).
 * Проверка: tests/game_task_bank_en.test.ts.
 */
import type { QuizRound } from '../quiz_core';

const ASK = 'Третья форма?';

/** `third` — верная третья форма; `at` — её место среди вариантов. */
function verb(base: string, second: string, third: string, wrong: readonly [string, string], at: number, note: string): QuizRound {
  const correctIndex = Math.min(Math.max(at, 0), wrong.length);
  const options = [...wrong.slice(0, correctIndex), third, ...wrong.slice(correctIndex)];
  return { id: `forms-en-${base}`, ask: ASK, options, correctIndex, prompt: { kind: 'forms', known: [base, second] }, note };
}

export const FORMS_BANK_EN: readonly QuizRound[] = [
  verb('be', 'was / were', 'been', ['was', 'beed'], 0, 'быть — был — бывший'),
  verb('have', 'had', 'had', ['haved', 'have'], 1, 'иметь — имел — имевшийся'),
  verb('do', 'did', 'done', ['did', 'doed'], 1, 'делать — делал — сделанный'),
  verb('say', 'said', 'said', ['sayed', 'say'], 2, 'сказать — сказал — сказанный'),
  verb('go', 'went', 'gone', ['goed', 'went'], 1, 'идти — шёл — ушедший'),
  verb('make', 'made', 'made', ['maked', 'make'], 0, 'создавать — создал — созданный'),
  verb('know', 'knew', 'known', ['knew', 'knowed'], 2, 'знать — знал — известный'),
  verb('think', 'thought', 'thought', ['thinked', 'think'], 1, 'думать — думал — обдуманный'),
  verb('take', 'took', 'taken', ['took', 'taked'], 2, 'брать — брал — взятый'),
  verb('see', 'saw', 'seen', ['saw', 'seed'], 1, 'видеть — видел — увиденный'),
  verb('come', 'came', 'come', ['came', 'comed'], 2, 'приходить — пришёл — пришедший'),
  verb('find', 'found', 'found', ['finded', 'find'], 1, 'находить — нашёл — найденный'),
  verb('give', 'gave', 'given', ['gave', 'gived'], 1, 'давать — дал — данный'),
  verb('tell', 'told', 'told', ['telled', 'tell'], 0, 'рассказывать — рассказал — рассказанный'),
  verb('feel', 'felt', 'felt', ['feeled', 'fell'], 1, 'чувствовать — чувствовал — почувствовавший'),
  verb('leave', 'left', 'left', ['leaved', 'leave'], 0, 'оставлять — оставил — оставленный'),
  verb('keep', 'kept', 'kept', ['keeped', 'keep'], 1, 'хранить — хранил — сохранённый'),
  verb('begin', 'began', 'begun', ['began', 'begined'], 1, 'начинать — начал — начатый'),
  verb('write', 'wrote', 'written', ['writed', 'wrote'], 0, 'писать — писал — написанный'),
  verb('run', 'ran', 'run', ['ran', 'runned'], 1, 'бежать — бежал — пробежавший'),
  verb('bring', 'brought', 'brought', ['bringed', 'bring'], 0, 'приносить — принёс — принесённый'),
  verb('buy', 'bought', 'bought', ['buyed', 'brought'], 1, 'покупать — купил — купленный'),
  verb('speak', 'spoke', 'spoken', ['spoke', 'speaked'], 1, 'говорить — говорил — произнесённый'),
  verb('eat', 'ate', 'eaten', ['ate', 'eated'], 2, 'есть — ел — съеденный'),
  verb('drink', 'drank', 'drunk', ['drank', 'drinked'], 1, 'пить — пил — выпитый'),
  verb('pay', 'paid', 'paid', ['payed', 'pay'], 1, 'платить — платил — оплаченный'),
  verb('meet', 'met', 'met', ['meeted', 'meet'], 0, 'встречать — встретил — встреченный'),
  verb('hear', 'heard', 'heard', ['heared', 'hear'], 1, 'слышать — слышал — услышанный'),
  verb('send', 'sent', 'sent', ['sended', 'send'], 1, 'отправлять — отправил — отправленный'),
  verb('break', 'broke', 'broken', ['broke', 'breaked'], 2, 'ломать — сломал — сломанный'),
];
