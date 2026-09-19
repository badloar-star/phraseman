const DISTRACTOR_META_SUFFIXES: readonly RegExp[] = [
  /\s*(?:[,;]|—|-)\s*(?:среди|серед)\s+(?:плиток|слів)(?=\s|$)[^.!?]*$/iu,
  /\s*(?:[,;]|—|-)\s*(?:(?:одна|две|дві)\s+)?(?:лишн|чуж|зайв)[^.!?]*(?:плитк|скрепк|скріпк|слов|форм)[^.!?]*$/iu,
  /\s*(?:[,;]|—|-)\s*(?:с|із|зі)\s+[^.!?]*(?:лишн|чуж|зайв)[^.!?]*(?:плитк|скрепк|скріпк|слов|форм)[^.!?]*$/iu,
  /\s*(?:[,;]|—|-)\s*(?:есть|є)\s+[^.!?]*(?:лишн|чуж|зайв)[^.!?]*(?:плитк|слов|вопрос|питан)[^.!?]*$/iu,
  /\s*\([^)]*(?:лишн|чуж|зайв)[^)]*(?:плитк|скрепк|скріпк|слов|форм)[^)]*\)\s*$/iu,
  /\s*(?:[,;]|—|-)\s*(?:among the tiles|with (?:an?|one|two) extra tiles?|there (?:is|are) extra tiles?)\b[^.!?]*$/iu,
  /\s*(?:[,;]|—|-)\s*(?:entre las fichas|con (?:una|dos) fichas? (?:extra|sobrantes?))\b[^.!?]*$/iu,
  /\s*(?:[,;]|—|-)\s*(?:entre as peças|com (?:uma|duas) peças? (?:extra|sobrantes?))\b[^.!?]*$/iu,
  /\s*(?:[,;]|—|-)\s*(?:wśród kafelków|z dodatkowym kafelkiem|z dodatkowymi kafelkami)\b[^.!?]*$/iu,
];

/**
 * Removes author/editor commentary that reveals a builder distractor before
 * the learner acts. Extra tiles remain in the task; only the answer-spoiling
 * instruction such as “among the tiles is an extra …” is removed.
 */
export function sanitizeLearningV2LearnerPromptV1(value: string): string {
  let result = value.trim();
  for (const pattern of DISTRACTOR_META_SUFFIXES) {
    result = result.replace(pattern, "").trim();
  }
  result = result
    .replace(
      /^(?:проверьте\s+себя|проверь\s+себя|перевірте\s+себе|перевір\s+себе|check\s+yourself|comprueba|compruébalo|verifique|confira|sprawdź\s+się)\s*[:—-]?\s*/iu,
      "",
    )
    .replace(
      /(^|[\s(])(соберите|собери|складіть|склади)\s+без\s+(?:подсказк[иу]|підказк[иу]|опоры|опори)(?=\s|$)/giu,
      "$1$2 фразу",
    )
    .replace(
      /\s+(?:без\s+(?:подсказк[иу]|підказк[иу]|опоры|опори)|самостоятельно|самостійно|without\s+(?:a\s+)?hints?|on\s+your\s+own|sin\s+(?:pistas?|ayuda)|sem\s+(?:dicas?|ajuda)|bez\s+podpowiedzi|samodzielnie)(?=\s*(?:[—,:;-]|$))/giu,
      "",
    )
    .replace(/^[а-яіїє]/u, (letter) => letter.toLocaleUpperCase())
    .replace(/[,:;]\s*$/u, "")
    .trim();
  return result;
}
