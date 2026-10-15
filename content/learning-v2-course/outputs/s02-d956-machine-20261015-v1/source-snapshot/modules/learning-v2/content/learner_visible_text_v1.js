"use strict";

// This is deliberately dependency-free CommonJS: both the Node release
// pipeline and the native TypeScript runtime load this exact projection.
// Visible task text must never have separate cleanup rules in those two paths.
function sanitizeLearnerVisiblePromptV1(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s*(?:[,;]|—|-)\s*(?:среди|серед)\s+(?:плиток|слів)(?=\s|$)[^.!?]*$/iu, "")
    .replace(/\s*(?:[,;]|—|-)\s*(?:(?:одна|две|дві)\s+)?(?:лишн|чуж|зайв)[^.!?]*(?:плитк|скрепк|скріпк|слов|форм)[^.!?]*$/iu, "")
    .replace(/\s*(?:[,;]|—|-)\s*(?:с|із|зі)\s+[^.!?]*(?:лишн|чуж|зайв)[^.!?]*(?:плитк|скрепк|скріпк|слов|форм)[^.!?]*$/iu, "")
    .replace(/\s*(?:[,;]|—|-)\s*(?:есть|є)\s+[^.!?]*(?:лишн|чуж|зайв)[^.!?]*(?:плитк|слов|вопрос|питан)[^.!?]*$/iu, "")
    .replace(/\s*\([^)]*(?:лишн|чуж|зайв)[^)]*(?:плитк|скрепк|скріпк|слов|форм)[^)]*\)\s*$/iu, "")
    .replace(/\s*(?:[,;]|—|-)\s*(?:among the tiles|with (?:an?|one|two) extra tiles?|there (?:is|are) extra tiles?)\b[^.!?]*$/iu, "")
    .replace(/^(?:проверьте\s+себя|проверь\s+себя|перевірте\s+себе|перевір\s+себе|check\s+yourself|comprueba|compruébalo|verifique|confira|sprawdź\s+się)\s*[:—-]?\s*/iu, "")
    .replace(/(^|[\s(])(соберите|собери|складіть|склади)\s+без\s+(?:подсказк[иу]|підказк[иу]|опоры|опори)(?=\s|$)/giu, "$1$2 фразу")
    .replace(/\s+(?:без\s+(?:подсказк[иу]|підказк[иу]|опоры|опори)|самостоятельно|самостійно|without\s+(?:a\s+)?hints?|on\s+your\s+own|sin\s+(?:pistas?|ayuda)|sem\s+(?:dicas?|ajuda)|bez\s+podpowiedzi|samodzielnie)(?=\s*(?:[—,:;-]|$))/giu, "")
    .replace(/^[а-яіїє]/u, (letter) => letter.toLocaleUpperCase())
    .replace(/[,:;]\s*$/u, "")
    .trim();
}

function projectLearnerVisiblePromptV1({ title, family, correctText, isWordCard = false }) {
  const normalizedCorrectText = String(correctText ?? "").toLowerCase().replace(/[.?!]$/u, "");
  let prompt = String(title ?? "");
  const tail = /\s+—\s+(.+)$/u.exec(prompt);
  if (tail && normalizedCorrectText && tail[1].toLowerCase().replace(/[.?!]$/u, "") === normalizedCorrectText && family !== "word_card" && !isWordCard)
    prompt = prompt.slice(0, tail.index).trim();
  if (family === "speed_match")
    prompt = prompt.replace(/\s*\(Speed Match,\s*[4-7]\s+(?:пар|пары|пари)\)\s*$/iu, "").trim();
  return sanitizeLearnerVisiblePromptV1(prompt);
}

module.exports = Object.freeze({
  sanitizeLearnerVisiblePromptV1,
  projectLearnerVisiblePromptV1,
});

