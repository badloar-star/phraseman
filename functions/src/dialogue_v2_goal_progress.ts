// ═══════════════════════════════════════════════════════════════════════════
// dialogue_v2_goal_progress.ts — «вопросные» цели Диалогов V2: распознать, что ученик задал вопрос, и засчитать цель.
//
// зачем (координатор 28.10: «Задать один вопрос» не проходит ни у кого): прогресс целей решала только модель
// (`activeObjectiveId` на ходе, `objectiveResults` в итоге), а её прошлые ответы в истории урезаны до {"replies":…} — она
// не помнит, на какой цели стояла, и вопрос ученика не засчитывала. Здесь детерминированная страховка: цель вида «Ask…» /
// «Hacer una pregunta» / «Poser une question» / «Eine Frage stellen» засчитывается, когда в реплике есть вопрос — со знаком
// «?»/«¿» или без него, в начале или в середине реплики. Чистые функции: ни сети, ни текста ученика в журналах.
// ═══════════════════════════════════════════════════════════════════════════

export type DialogueV2GoalObjective = Readonly<{ id: string; label: string }>;

export type DialogueV2QuestionDetection = Readonly<{
  question: boolean;
  /** Какое правило решило (без текста ученика): question_mark, wh:<слово>, aux:<слово>, inversion, tag, none. */
  rule: string;
}>;

/** Цель, которую выполняет вопрос ученика (подпись — на языке обучения). */
const QUESTION_OBJECTIVE_RE: Readonly<Record<string, RegExp>> = Object.freeze({
  en: /^ask\b/i,
  es: /^(preguntar\b|hacer (una|alguna|un par de) pregunta|formular (una )?pregunta)/i,
  fr: /^(poser (une|des|la) question|demander\b|faire répéter)/i,
  de: /(frage(n)? stellen\b|^fragen\b|^nachfragen\b)/i,
});

/** Подходит ли подпись цели под «спросить». Неизвестный язык — только английское «Ask». */
export function isQuestionObjectiveLabel(label: string, studyTarget: string): boolean {
  const text = String(label ?? '').trim();
  if (!text) return false;
  const re = QUESTION_OBJECTIVE_RE[studyTarget] ?? QUESTION_OBJECTIVE_RE.en;
  return re.test(text);
}

const SUBJECTS_EN = 'i|you|we|they|he|she|it|there|this|that|these|those|the|a|an|my|your|his|her|our|their|anyone|someone|somebody|anybody|anything|something|everything|everyone';
const EN_WH = /^(what|where|when|why|who|whom|whose|which|how)\b/;
const EN_WH_EXCLAMATION = /^(what an? |how (nice|great|lovely|cool|interesting|sad|beautiful|wonderful|funny|kind|sweet|awful|terrible|amazing)\b)/;
const EN_AUX = new RegExp(`^(do|does|did|can|could|will|would|shall|should|may|might|must|is|are|am|was|were|have|has|had|isn't|aren't|don't|doesn't|didn't|won't|wouldn't|can't|couldn't|shouldn't|haven't|hasn't)\\s+(${SUBJECTS_EN})\\b`);
const EN_TAG = /,\s*(right|isn't it|aren't you|don't you|didn't you|won't you|can't you|is it|are you|do you|okay|ok)$/;
// «Have a nice day» / «Had a great time» — пожелание и рассказ, не вопрос.
const EN_AUX_NOT_QUESTION = /^(have|has|had)\s+(a|an)\s/;
const EN_ABOUT = /^(how|what) about\b/;
// «When I was young, I lived here» — придаточное: вопросительное слово, сразу подлежащее, дальше запятая и главная часть.
const EN_WH_SUBORDINATE = new RegExp(`^(when|where|why|how|what|who|which)\\s+(${SUBJECTS_EN})\\b[^,]*,`);

// зачем: JS \b знает только ASCII — после «qué»/«dónde» граница не срабатывала, а «qui» совпадало бы с «quitter»;
// конец слова — через \p{L}\p{N} с флагом u.
const END = '(?![\\p{L}\\p{N}])';
// Без ударения — только «donde/quien/cual/cuanto»: «cuando/como/que» в начале чаще утверждение.
const ES_WH = new RegExp(`^(qué|dónde|cuándo|por qué|quién|quiénes|cuál|cuáles|cómo|cuánto|cuánta|cuántos|cuántas|adónde|de dónde|a qué|para qué|con quién|donde|quien|cual|cuanto|cuantos|cuanta|cuantas)${END}`, 'u');
const FR_WH = new RegExp(`^(est-ce que|est-ce qu|qu'est-ce|qu’est-ce|où|quand|pourquoi|qui|quel|quelle|quels|quelles|comment|combien|lequel|laquelle|à quelle|à qui|de quoi|d'où|d’où)${END}`, 'u');
const FR_INVERSION = new RegExp(`^[\\p{L}’']+-(t-)?(tu|vous|il|elle|on|ils|elles|je|nous)${END}`, 'u');
const DE_WH = new RegExp(`^(was|wo|wann|warum|wieso|weshalb|wer|wen|wem|wessen|welche|welcher|welches|welchen|welchem|wie|wieviel|wie viel|woher|wohin|womit|worüber|wozu)${END}`, 'u');
const DE_VERB_FIRST = /^(kannst|kann|können|könnt|hast|haben|habt|hat|bist|sind|seid|ist|gibt|möchtest|möchten|möchte|willst|wollen|darf|darfst|dürfen|magst|mögen|weißt|wissen|kommst|kommen|gehst|gehen|machst|machen|sollen|soll|sollte|solltest|würdest|würden|würde|hättest|hätten|warst|waren|war|hattest|hatten|brauchst|brauchen|findest|finden|meinst|kennst|kennen|spielst|arbeitest|wohnst|lernst|isst|trinkst|fährst|siehst)\s+(du|sie|ihr|wir|es|er|man|ich|das|der|die|dein|deine|ihr|ihre|jemand|etwas)\b/;

function sentences(text: string): string[] {
  return text
    .split(/[.!…;\n\r]+/u)
    .map((part) => part.trim().replace(/^[\s"“”«»„'‘’(\-–—,:]+/u, '').toLocaleLowerCase())
    .filter((part) => part.length > 0);
}

function detectSentence(sentence: string, studyTarget: string): string | null {
  if (studyTarget === 'es') {
    const wh = ES_WH.exec(sentence);
    return wh ? `wh:${wh[1]}` : null;
  }
  if (studyTarget === 'fr') {
    const wh = FR_WH.exec(sentence);
    if (wh) return `wh:${wh[1]}`;
    return FR_INVERSION.test(sentence) ? 'inversion' : null;
  }
  if (studyTarget === 'de') {
    const wh = DE_WH.exec(sentence);
    if (wh) return `wh:${wh[1]}`;
    const verb = DE_VERB_FIRST.exec(sentence);
    return verb ? `aux:${verb[1]}` : null;
  }
  // en и любой неизвестный язык
  if (EN_WH_EXCLAMATION.test(sentence) || EN_WH_SUBORDINATE.test(sentence)) return null;
  const wh = EN_WH.exec(sentence);
  if (wh) return `wh:${wh[1]}`;
  const aux = EN_AUX_NOT_QUESTION.test(sentence) ? null : EN_AUX.exec(sentence);
  if (aux) return `aux:${aux[1]}`;
  return EN_TAG.test(sentence) ? 'tag' : null;
}

/**
 * Вопрос после запятой («I'm from Kyiv, do you like it here»): только порядок слов вопроса и «how/what about» —
 * вопросительное слово после запятой чаще начинает придаточное («When I was young, …»), его не берём.
 */
function detectClause(clause: string, studyTarget: string): string | null {
  if (studyTarget === 'fr') return FR_INVERSION.test(clause) ? 'inversion' : null;
  if (studyTarget === 'de') {
    const verb = DE_VERB_FIRST.exec(clause);
    return verb ? `aux:${verb[1]}` : null;
  }
  if (studyTarget === 'es') return null;
  if (EN_ABOUT.test(clause)) return 'about';
  const aux = EN_AUX_NOT_QUESTION.test(clause) ? null : EN_AUX.exec(clause);
  return aux ? `aux:${aux[1]}` : null;
}

/** Задал ли ученик вопрос: «?»/«¿» где угодно, вопросительное слово или порядок слов в начале любого предложения. */
export function detectLearnerQuestion(text: string, studyTarget: string): DialogueV2QuestionDetection {
  // NFC: в NFD диакритика — отдельный символ, и «où»/«dónde» не совпали бы (урок 26.10, сторож пушей).
  const value = String(text ?? '').normalize('NFC');
  if (/[?？¿]/u.test(value)) return { question: true, rule: 'question_mark' };
  for (const sentence of sentences(value)) {
    const rule = detectSentence(sentence, studyTarget);
    if (rule) return { question: true, rule };
    for (const clause of sentence.split(',').slice(1).map((part) => part.trim()).filter(Boolean)) {
      const clauseRule = detectClause(clause, studyTarget);
      if (clauseRule) return { question: true, rule: `clause_${clauseRule}` };
    }
  }
  return { question: false, rule: 'none' };
}

export type DialogueV2GoalAdvance = Readonly<{
  activeObjectiveId: string | null;
  advanced: boolean;
  /** Почему так решено (для журнала): not_question_objective, not_a_question, advanced, last_objective_kept, no_active. */
  reason: string;
  activeIsQuestionObjective: boolean;
  detection: DialogueV2QuestionDetection;
}>;

/**
 * Ход: модель держит активной «вопросную» цель, а реплика ученика — вопрос → указатель на следующую цель.
 * Последнюю цель не сдвигаем: указатель на последней цели — это и есть «осталась последняя», конец диалога тогда принимается.
 */
export function advanceQuestionObjective(input: Readonly<{
  activeObjectiveId: string | null;
  objectives: readonly DialogueV2GoalObjective[];
  userMessage: string;
  studyTarget: string;
}>): DialogueV2GoalAdvance {
  const detection = detectLearnerQuestion(input.userMessage, input.studyTarget);
  const index = input.activeObjectiveId === null ? -1 : input.objectives.findIndex((o) => o.id === input.activeObjectiveId);
  if (index < 0) {
    return { activeObjectiveId: input.activeObjectiveId, advanced: false, reason: 'no_active', activeIsQuestionObjective: false, detection };
  }
  const isQuestion = isQuestionObjectiveLabel(input.objectives[index].label, input.studyTarget);
  if (!isQuestion) {
    return { activeObjectiveId: input.activeObjectiveId, advanced: false, reason: 'not_question_objective', activeIsQuestionObjective: false, detection };
  }
  if (!detection.question) {
    return { activeObjectiveId: input.activeObjectiveId, advanced: false, reason: 'not_a_question', activeIsQuestionObjective: true, detection };
  }
  if (index >= input.objectives.length - 1) {
    return { activeObjectiveId: input.activeObjectiveId, advanced: false, reason: 'last_objective_kept', activeIsQuestionObjective: true, detection };
  }
  return { activeObjectiveId: input.objectives[index + 1].id, advanced: true, reason: 'advanced', activeIsQuestionObjective: true, detection };
}
