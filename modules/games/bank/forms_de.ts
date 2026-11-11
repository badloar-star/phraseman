/**
 * Банк игры «Три формы» — 30 частых немецких глаголов, которые меняют корень, одним списком (D207).
 * зачем: владелец 11.11.2026 — «оно должно работать на всех языках», «фразы должны корректно подбираться».
 * Показаны первая и вторая формы (gehen — ging), спрашивается третья (gegangen). Правила вычитки: верна
 * ровно одна форма; неверные — выдуманная «правильная» форма на -t и вторая форма. Не вошли глаголы с
 * двумя верными третьими формами (werden: geworden / worden; senden: gesendet / gesandt).
 * Проверка: tests/game_task_bank_de_fr.test.ts.
 */
import type { QuizRound } from '../quiz_core';

const ASK = 'Третья форма?';

/** `third` — верная третья форма; `invented` — выдуманная; `at` — место верной среди вариантов. */
function verb(base: string, second: string, third: string, invented: string, at: number, note: string): QuizRound {
  const wrong = [second, invented];
  const correctIndex = Math.min(Math.max(at, 0), wrong.length);
  const options = [...wrong.slice(0, correctIndex), third, ...wrong.slice(correctIndex)];
  return { id: `forms-de-${base}`, ask: ASK, options, correctIndex, prompt: { kind: 'forms', known: [base, second] }, note };
}

export const FORMS_BANK_DE: readonly QuizRound[] = [
  verb('sein', 'war', 'gewesen', 'geseint', 0, 'sein — быть'),
  verb('gehen', 'ging', 'gegangen', 'gegeht', 1, 'gehen — идти'),
  verb('kommen', 'kam', 'gekommen', 'gekommt', 2, 'kommen — приходить'),
  verb('sehen', 'sah', 'gesehen', 'geseht', 0, 'sehen — видеть'),
  verb('geben', 'gab', 'gegeben', 'gegebt', 1, 'geben — давать'),
  verb('nehmen', 'nahm', 'genommen', 'genehmt', 2, 'nehmen — брать'),
  verb('finden', 'fand', 'gefunden', 'gefindet', 1, 'finden — находить'),
  verb('sprechen', 'sprach', 'gesprochen', 'gesprecht', 0, 'sprechen — говорить'),
  verb('essen', 'aß', 'gegessen', 'geessen', 2, 'essen — есть'),
  verb('trinken', 'trank', 'getrunken', 'getrinkt', 1, 'trinken — пить'),
  verb('lesen', 'las', 'gelesen', 'gelest', 0, 'lesen — читать'),
  verb('schreiben', 'schrieb', 'geschrieben', 'geschreibt', 2, 'schreiben — писать'),
  verb('fahren', 'fuhr', 'gefahren', 'gefahrt', 1, 'fahren — ехать'),
  verb('schlafen', 'schlief', 'geschlafen', 'geschlaft', 0, 'schlafen — спать'),
  verb('helfen', 'half', 'geholfen', 'gehelft', 2, 'helfen — помогать'),
  verb('treffen', 'traf', 'getroffen', 'getrefft', 1, 'treffen — встречать'),
  verb('stehen', 'stand', 'gestanden', 'gestandet', 0, 'stehen — стоять'),
  verb('liegen', 'lag', 'gelegen', 'geliegt', 2, 'liegen — лежать'),
  verb('sitzen', 'saß', 'gesessen', 'gesitzt', 1, 'sitzen — сидеть'),
  verb('bleiben', 'blieb', 'geblieben', 'gebleibt', 0, 'bleiben — оставаться'),
  verb('tragen', 'trug', 'getragen', 'getragt', 2, 'tragen — нести'),
  verb('laufen', 'lief', 'gelaufen', 'gelauft', 1, 'laufen — бежать'),
  verb('rufen', 'rief', 'gerufen', 'geruft', 0, 'rufen — звать'),
  verb('singen', 'sang', 'gesungen', 'gesingt', 2, 'singen — петь'),
  verb('schwimmen', 'schwamm', 'geschwommen', 'geschwimmt', 1, 'schwimmen — плавать'),
  verb('fliegen', 'flog', 'geflogen', 'gefliegt', 0, 'fliegen — лететь'),
  verb('ziehen', 'zog', 'gezogen', 'gezieht', 2, 'ziehen — тянуть'),
  verb('beginnen', 'begann', 'begonnen', 'gebeginnt', 1, 'beginnen — начинать'),
  verb('schließen', 'schloss', 'geschlossen', 'geschließt', 0, 'schließen — закрывать'),
  verb('halten', 'hielt', 'gehalten', 'gehaltet', 2, 'halten — держать'),
];
