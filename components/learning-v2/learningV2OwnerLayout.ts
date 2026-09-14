/** Owner exports 0–7, 12 September 2026. Geometry only; palette comes from useTheme. */
export const LEARNING_V2_OWNER_LAYOUT = Object.freeze({
  lessons: { pagePadding: 8, cardRadius: 18, cardGap: 6, headingSize: 17 },
  map: { pagePadding: 8, cardRadius: 29, cardGap: 13, headingSize: 16, bodySize: 15, targetHeight: 56, nodeSize: 101, mapStep: 128 },
  modal: { pagePadding: 21, cardRadius: 19, cardGap: 13, headingSize: 25, bodySize: 14, targetHeight: 54, nodeSize: 92 },
  intro: { pagePadding: 6, cardRadius: 14, cardGap: 6, headingSize: 21, bodySize: 14, targetHeight: 58 },
  word: { pagePadding: 31, cardRadius: 33, cardGap: 21, bodySize: 21, cardHeight: 245 },
});

/** Exact System column of the current English owner curriculum, not story arcs. */
export const LEARNING_V2_OWNER_EN_TITLES_RU: readonly string[] = Object.freeze([
  "Present be: утверждение + not",
  "Present be: вопросы, короткие ответы, who/what/where",
  "Существительные, a/an/the, this/that/these/those",
  "There is/are, some/any, предлоги места",
  "Have/has, притяжательные, 's, whose",
  "Present Simple: утверждение, -s",
  "Present Simple: do/does, don't, частота",
  "Can/can't, просьбы, инструкции",
  "Present Continuous",
  "Simple vs Continuous",
  "Was/were, there was",
  "Past Simple: утверждение, неправильные",
  "Past Simple: did, didn't, последовательность",
  "Past Continuous, when/while",
  "Going to, arrangements",
  "Will: решения, прогнозы, обещания",
  "Исчисляемость, much/many, few/little",
  "Сравнение, superlatives, too/enough",
  "Could, may, be able to, разрешение",
  "Must, have to, should, mustn't",
  "Gerund / infinitive после глагола + object/reflexive pronouns, one/ones",
  "Предлоги времени и места + фразовые глаголы (новый слот, решение владельца 03.09)",
  "Present Perfect: опыт и результат",
  "Present Perfect: for/since, vs Past Simple",
  "Used to, past perfect, порядок событий",
  "Zero и First Conditional",
  "Second Conditional, wishes",
  "Passive",
  "Определительные придаточные",
  "Косвенная речь",
  "Непрямые вопросы, tags, связки",
  "Must/might/can't для вывода"
]);
