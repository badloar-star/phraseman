export type LearningV2EnglishSessionLexicalSenseAssignmentV2 = Readonly<{
  id: string;
  english: string;
  glossRu: string;
  partOfSpeech: string;
}>;

export type LearningV2EnglishSessionLexicalAssignmentV2 = Readonly<{
  sessionId: `lesson-${string}:session:${string}`;
  absoluteSessionOrdinal: number;
  grammarOperationId: string;
  newSenses: readonly LearningV2EnglishSessionLexicalSenseAssignmentV2[];
  retrievalSenseIds: readonly string[];
  canonicalExamples: readonly string[];
}>;

const I_AM_OPERATION_ID = "en.grammar.present_be_affirmative.i_am";
const HE_SHE_IT_IS_OPERATION_ID = "en.grammar.present_be_affirmative.he_she_it_is";
const YOU_WE_THEY_ARE_OPERATION_ID = "en.grammar.present_be_affirmative.you_we_they_are";
const FULL_BE_CHOICE_OPERATION_ID = "en.grammar.present_be_affirmative.full_form_choice";
const BE_NEGATION_OPERATION_ID = "en.grammar.present_be_questions_negatives.negation";
const BE_YES_NO_QUESTIONS_OPERATION_ID = "en.grammar.present_be_questions_negatives.yes_no_questions";
const BE_SHORT_ANSWERS_OPERATION_ID = "en.grammar.present_be_questions_negatives.short_answers";
const BE_WH_QUESTIONS_OPERATION_ID = "en.grammar.present_be_questions_negatives.wh_questions";
const INDEFINITE_ARTICLE_OPERATION_ID = "en.grammar.nouns_core_determiners.indefinite_article";
const DEFINITE_ARTICLE_OPERATION_ID = "en.grammar.nouns_core_determiners.definite_article";
const PLURAL_NOUNS_OPERATION_ID = "en.grammar.nouns_core_determiners.plural_nouns";
const ZERO_ARTICLE_OPERATION_ID = "en.grammar.nouns_core_determiners.zero_article";
const DEMONSTRATIVES_OPERATION_ID = "en.grammar.nouns_core_determiners.demonstratives";
const THERE_IS_ARE_OPERATION_ID = "en.grammar.existence_place.there_is_are";
const EXISTENTIAL_QUESTIONS_OPERATION_ID = "en.grammar.existence_place.existential_questions";
const EXISTENTIAL_SOME_ANY_OPERATION_ID = "en.grammar.existence_place.existential_some_any";
const PLACE_PREPOSITIONS_OPERATION_ID = "en.grammar.existence_place.basic_place_prepositions";

const sense = (
  english: string,
  glossRu: string,
  partOfSpeech = "adjective",
): LearningV2EnglishSessionLexicalSenseAssignmentV2 => Object.freeze({
  id: `en.${english}.${partOfSpeech}.01`,
  english,
  glossRu,
  partOfSpeech,
});

const assignment = (
  sessionOrdinal: number,
  grammarOperationId: string,
  newSenses: readonly LearningV2EnglishSessionLexicalSenseAssignmentV2[],
  retrievalSenseIds: readonly string[],
  canonicalExamples: readonly string[],
): LearningV2EnglishSessionLexicalAssignmentV2 => Object.freeze({
  sessionId: `lesson-${String(Math.floor((sessionOrdinal - 1) / 56) + 1).padStart(2, "0")}:session:${String(((sessionOrdinal - 1) % 56) + 1).padStart(2, "0")}`,
  absoluteSessionOrdinal: sessionOrdinal,
  grammarOperationId,
  newSenses: Object.freeze([...newSenses]),
  retrievalSenseIds: Object.freeze([...retrievalSenseIds]),
  canonicalExamples: Object.freeze([...canonicalExamples]),
});

// Chapter 1 keeps one atomic grammar operation (I + am) while expanding the
// useful vocabulary available inside that operation. Session 8 is a pure
// checkpoint and therefore deliberately has no lexical assignment.
export const LEARNING_V2_ENGLISH_SESSION_LEXICAL_ASSIGNMENTS_V2:
readonly LearningV2EnglishSessionLexicalAssignmentV2[] = Object.freeze([
  assignment(
    1,
    I_AM_OPERATION_ID,
    [
      sense("here", "здесь", "adverb"),
      sense("ready", "готов"),
      sense("fine", "в порядке"),
    ],
    [],
    ["I am here.", "I am ready.", "I am fine."],
  ),
  assignment(
    2,
    I_AM_OPERATION_ID,
    [
      sense("happy", "счастлив"),
      sense("sad", "грустен"),
      sense("tired", "устал"),
    ],
    ["en.here.adverb.01", "en.ready.adjective.01", "en.fine.adjective.01"],
    ["I am happy.", "I am sad.", "I am tired."],
  ),
  assignment(
    3,
    I_AM_OPERATION_ID,
    [
      sense("busy", "занят"),
      sense("free", "свободен"),
      sense("late", "опоздал"),
    ],
    ["en.happy.adjective.01", "en.sad.adjective.01", "en.tired.adjective.01"],
    ["I am busy.", "I am free.", "I am late."],
  ),
  assignment(
    4,
    I_AM_OPERATION_ID,
    [
      sense("hungry", "голоден"),
      sense("thirsty", "хочу пить"),
      sense("sick", "болен"),
    ],
    ["en.busy.adjective.01", "en.free.adjective.01", "en.late.adjective.01"],
    ["I am hungry.", "I am thirsty.", "I am sick."],
  ),
  assignment(
    5,
    I_AM_OPERATION_ID,
    [
      sense("cold", "мне холодно"),
      sense("hot", "мне жарко"),
      sense("warm", "мне тепло"),
    ],
    ["en.hungry.adjective.01", "en.thirsty.adjective.01", "en.sick.adjective.01"],
    ["I am cold.", "I am hot.", "I am warm."],
  ),
  assignment(
    6,
    I_AM_OPERATION_ID,
    [
      sense("calm", "спокоен"),
      sense("nervous", "нервничаю"),
      sense("excited", "взволнован"),
    ],
    ["en.cold.adjective.01", "en.hot.adjective.01", "en.warm.adjective.01"],
    ["I am calm.", "I am nervous.", "I am excited."],
  ),
  assignment(
    7,
    I_AM_OPERATION_ID,
    [
      sense("angry", "зол"),
      sense("scared", "мне страшно"),
    ],
    ["en.calm.adjective.01", "en.nervous.adjective.01", "en.excited.adjective.01"],
    ["I am angry.", "I am scared.", "I am calm."],
  ),

  // Chapter 2 keeps he/she/it + is atomic. Sessions 9-12 expand descriptions
  // of people; Sessions 13-15 transfer the same operation to things and tasks.
  // Session 16 is the chapter checkpoint and introduces no new vocabulary.
  assignment(
    9,
    HE_SHE_IT_IS_OPERATION_ID,
    [
      sense("tall", "высокий"),
      sense("short", "низкий"),
      sense("young", "молодой"),
    ],
    ["en.angry.adjective.01", "en.scared.adjective.01", "en.calm.adjective.01"],
    ["He is tall.", "She is short.", "He is young."],
  ),
  assignment(
    10,
    HE_SHE_IT_IS_OPERATION_ID,
    [
      sense("old", "пожилой"),
      sense("kind", "добрый"),
      sense("funny", "забавный"),
    ],
    ["en.tall.adjective.01", "en.short.adjective.01", "en.young.adjective.01"],
    ["She is old.", "He is kind.", "She is funny."],
  ),
  assignment(
    11,
    HE_SHE_IT_IS_OPERATION_ID,
    [
      sense("smart", "умный"),
      sense("strong", "сильный"),
      sense("quiet", "тихий"),
    ],
    ["en.old.adjective.01", "en.kind.adjective.01", "en.funny.adjective.01"],
    ["She is smart.", "He is strong.", "She is quiet."],
  ),
  assignment(
    12,
    HE_SHE_IT_IS_OPERATION_ID,
    [
      sense("loud", "громкий"),
      sense("friendly", "дружелюбный"),
      sense("helpful", "отзывчивый"),
    ],
    ["en.smart.adjective.01", "en.strong.adjective.01", "en.quiet.adjective.01"],
    ["He is loud.", "She is friendly.", "He is helpful."],
  ),
  assignment(
    13,
    HE_SHE_IT_IS_OPERATION_ID,
    [
      sense("small", "маленький"),
      sense("big", "большой"),
      sense("clean", "чистый"),
    ],
    ["en.loud.adjective.01", "en.friendly.adjective.01", "en.helpful.adjective.01"],
    ["It is small.", "It is big.", "It is clean."],
  ),
  assignment(
    14,
    HE_SHE_IT_IS_OPERATION_ID,
    [
      sense("dirty", "грязный"),
      sense("open", "открытый"),
      sense("closed", "закрытый"),
    ],
    ["en.small.adjective.01", "en.big.adjective.01", "en.clean.adjective.01"],
    ["It is dirty.", "It is open.", "It is closed."],
  ),
  assignment(
    15,
    HE_SHE_IT_IS_OPERATION_ID,
    [
      sense("easy", "лёгкий"),
      sense("difficult", "сложный"),
      sense("important", "важный"),
    ],
    ["en.dirty.adjective.01", "en.open.adjective.01", "en.closed.adjective.01"],
    ["It is easy.", "It is difficult.", "It is important."],
  ),

  // Chapter 3 introduces the final subject group for affirmative present be.
  // The lexical sequence moves from direct feedback to group location and
  // description without repeating the states introduced in Chapters 1-2.
  assignment(
    17,
    YOU_WE_THEY_ARE_OPERATION_ID,
    [
      sense("welcome", "желанный"),
      sense("safe", "в безопасности"),
      sense("right", "прав"),
    ],
    ["en.easy.adjective.01", "en.difficult.adjective.01", "en.important.adjective.01"],
    ["You are welcome.", "You are safe.", "You are right."],
  ),
  assignment(
    18,
    YOU_WE_THEY_ARE_OPERATION_ID,
    [
      sense("wrong", "неправ"),
      sense("early", "рано", "adverb"),
      sense("lucky", "везучий"),
    ],
    ["en.welcome.adjective.01", "en.safe.adjective.01", "en.right.adjective.01"],
    ["You are wrong.", "You are early.", "You are lucky."],
  ),
  assignment(
    19,
    YOU_WE_THEY_ARE_OPERATION_ID,
    [
      sense("together", "вместе", "adverb"),
      sense("alone", "одни"),
      sense("nearby", "рядом", "adverb"),
    ],
    ["en.wrong.adjective.01", "en.early.adverb.01", "en.lucky.adjective.01"],
    ["We are together.", "We are alone.", "We are nearby."],
  ),
  assignment(
    20,
    YOU_WE_THEY_ARE_OPERATION_ID,
    [
      sense("lost", "потерялись"),
      sense("prepared", "подготовлены"),
      sense("careful", "осторожны"),
    ],
    ["en.together.adverb.01", "en.alone.adjective.01", "en.nearby.adverb.01"],
    ["We are lost.", "We are prepared.", "We are careful."],
  ),
  assignment(
    21,
    YOU_WE_THEY_ARE_OPERATION_ID,
    [
      sense("inside", "внутри", "adverb"),
      sense("outside", "снаружи", "adverb"),
      sense("upstairs", "наверху", "adverb"),
    ],
    ["en.lost.adjective.01", "en.prepared.adjective.01", "en.careful.adjective.01"],
    ["They are inside.", "They are outside.", "They are upstairs."],
  ),
  assignment(
    22,
    YOU_WE_THEY_ARE_OPERATION_ID,
    [
      sense("rich", "богатые"),
      sense("poor", "бедные"),
      sense("famous", "знаменитые"),
    ],
    ["en.inside.adverb.01", "en.outside.adverb.01", "en.upstairs.adverb.01"],
    ["They are rich.", "They are poor.", "They are famous."],
  ),
  assignment(
    23,
    YOU_WE_THEY_ARE_OPERATION_ID,
    [
      sense("married", "женаты"),
      sense("single", "не в отношениях"),
      sense("different", "разные"),
    ],
    ["en.rich.adjective.01", "en.poor.adjective.01", "en.famous.adjective.01"],
    ["They are married.", "They are single.", "They are different."],
  ),

  // Chapter 4 interleaves all previously introduced subject groups so the
  // learner chooses am/is/are from the subject instead of memorising one row.
  assignment(
    25,
    FULL_BE_CHOICE_OPERATION_ID,
    [
      sense("proud", "гордый"),
      sense("ashamed", "стыдно"),
      sense("surprised", "удивлённый"),
    ],
    ["en.married.adjective.01", "en.single.adjective.01", "en.different.adjective.01"],
    ["I am proud.", "She is ashamed.", "They are surprised."],
  ),
  assignment(
    26,
    FULL_BE_CHOICE_OPERATION_ID,
    [
      sense("bored", "скучно"),
      sense("confused", "растерянный"),
      sense("worried", "обеспокоенный"),
    ],
    ["en.proud.adjective.01", "en.ashamed.adjective.01", "en.surprised.adjective.01"],
    ["You are bored.", "He is confused.", "We are worried."],
  ),
  assignment(
    27,
    FULL_BE_CHOICE_OPERATION_ID,
    [
      sense("awake", "не спит"),
      sense("asleep", "спит"),
      sense("available", "доступен"),
    ],
    ["en.bored.adjective.01", "en.confused.adjective.01", "en.worried.adjective.01"],
    ["I am awake.", "She is asleep.", "They are available."],
  ),
  assignment(
    28,
    FULL_BE_CHOICE_OPERATION_ID,
    [
      sense("correct", "правильный"),
      sense("certain", "уверен"),
      sense("serious", "серьёзный"),
    ],
    ["en.awake.adjective.01", "en.asleep.adjective.01", "en.available.adjective.01"],
    ["It is correct.", "I am certain.", "You are serious."],
  ),
  assignment(
    29,
    FULL_BE_CHOICE_OPERATION_ID,
    [
      sense("local", "местный"),
      sense("foreign", "иностранный"),
      sense("online", "в сети"),
    ],
    ["en.correct.adjective.01", "en.certain.adjective.01", "en.serious.adjective.01"],
    ["It is local.", "They are foreign.", "We are online."],
  ),
  assignment(
    30,
    FULL_BE_CHOICE_OPERATION_ID,
    [
      sense("alive", "жив"),
      sense("dead", "мёртв"),
      sense("missing", "пропал"),
    ],
    ["en.local.adjective.01", "en.foreign.adjective.01", "en.online.adjective.01"],
    ["He is alive.", "It is dead.", "She is missing."],
  ),
  assignment(
    31,
    FULL_BE_CHOICE_OPERATION_ID,
    [
      sense("equal", "равны"),
      sense("similar", "похожи"),
      sense("separate", "раздельны"),
    ],
    ["en.alive.adjective.01", "en.dead.adjective.01", "en.missing.adjective.01"],
    ["They are equal.", "We are similar.", "They are separate."],
  ),
  // Chapters 5–7 deliberately keep the already introduced present-be system
  // in changed contexts. Each ordinary packet receives one useful state that
  // is naturally expressed with its assigned full or contracted be form;
  // checkpoints 40 and 48 remain lexically empty.
  assignment(33, "en.grammar.present_be_affirmative.contractions", [sense("okay", "в порядке")], [], ["I am okay.", "I'm okay."]),
  assignment(34, "en.grammar.present_be_affirmative.contractions", [sense("afraid", "испуган")], [], ["She is afraid.", "She's afraid."]),
  assignment(35, "en.grammar.present_be_affirmative.contractions", [sense("ill", "болен")], [], ["He is ill.", "He's ill."]),
  assignment(36, "en.grammar.present_be_affirmative.contractions", [sense("sleepy", "хочется спать")], [], ["I am sleepy.", "I'm sleepy."]),
  assignment(37, "en.grammar.present_be_affirmative.contractions", [sense("lonely", "одинок")], [], ["They are lonely.", "They're lonely."]),
  assignment(38, "en.grammar.present_be_affirmative.contractions", [sense("weak", "слаб")], [], ["He is weak.", "He's weak."]),
  assignment(39, "en.grammar.present_be_affirmative.contractions", [sense("brave", "смел")], [], ["She is brave.", "She's brave."]),
  assignment(41, FULL_BE_CHOICE_OPERATION_ID, [sense("honest", "честный")], [], ["He is honest.", "He's honest."]),
  assignment(42, FULL_BE_CHOICE_OPERATION_ID, [sense("polite", "вежливый")], [], ["She is polite.", "She's polite."]),
  assignment(43, FULL_BE_CHOICE_OPERATION_ID, [sense("patient", "терпеливый")], [], ["We are patient.", "We're patient."]),
  assignment(44, FULL_BE_CHOICE_OPERATION_ID, [sense("curious", "любопытный")], [], ["I am curious.", "I'm curious."]),
  assignment(45, FULL_BE_CHOICE_OPERATION_ID, [sense("useful", "полезный")], [], ["It is useful.", "It's useful."]),
  assignment(46, FULL_BE_CHOICE_OPERATION_ID, [sense("useless", "бесполезный")], [], ["It is useless.", "It's useless."]),
  assignment(47, FULL_BE_CHOICE_OPERATION_ID, [sense("dangerous", "опасный")], [], ["It is dangerous.", "It's dangerous."]),
  assignment(49, FULL_BE_CHOICE_OPERATION_ID, [sense("cheap", "дешёвый")], [], ["It is cheap.", "It's cheap."]),
  assignment(50, FULL_BE_CHOICE_OPERATION_ID, [sense("expensive", "дорогой")], [], ["It is expensive.", "It's expensive."]),
  assignment(51, FULL_BE_CHOICE_OPERATION_ID, [sense("heavy", "тяжёлый")], [], ["It is heavy.", "It's heavy."]),
  assignment(52, FULL_BE_CHOICE_OPERATION_ID, [sense("light", "лёгкий")], [], ["It is light.", "It's light."]),
  assignment(53, FULL_BE_CHOICE_OPERATION_ID, [sense("full", "полный")], [], ["It is full.", "It's full."]),
  assignment(
    54,
    FULL_BE_CHOICE_OPERATION_ID,
    [sense("familiar", "знакомый"), sense("unfamiliar", "незнакомый"), sense("unknown", "неизвестный")],
    [],
    ["It's familiar.", "It's unfamiliar.", "It's unknown."],
  ),
  assignment(
    55,
    FULL_BE_CHOICE_OPERATION_ID,
    [sense("responsible", "ответственный"), sense("independent", "самостоятельный"), sense("dependent", "зависимый")],
    ["en.familiar.adjective.01", "en.unfamiliar.adjective.01", "en.unknown.adjective.01"],
    ["She's responsible.", "She's independent.", "She's dependent."],
  ),
  assignment(
    57,
    BE_NEGATION_OPERATION_ID,
    [sense("sure", "уверен"), sense("interested", "заинтересован"), sense("comfortable", "чувствует себя комфортно")],
    ["en.responsible.adjective.01", "en.independent.adjective.01", "en.dependent.adjective.01"],
    ["I am not sure.", "She is not interested.", "We are not comfortable."],
  ),
  assignment(
    58,
    BE_NEGATION_OPERATION_ID,
    [sense("confident", "уверен в себе"), sense("relaxed", "расслаблен"), sense("satisfied", "доволен")],
    ["en.sure.adjective.01", "en.interested.adjective.01", "en.comfortable.adjective.01"],
    ["He is not confident.", "They are not relaxed.", "I am not satisfied."],
  ),
  assignment(
    59,
    BE_NEGATION_OPERATION_ID,
    [sense("aware", "осведомлён"), sense("convinced", "убеждён"), sense("concerned", "обеспокоен")],
    ["en.confident.adjective.01", "en.relaxed.adjective.01", "en.satisfied.adjective.01"],
    ["I am not aware.", "She is not convinced.", "We are not concerned."],
  ),
  assignment(
    60,
    BE_NEGATION_OPERATION_ID,
    [sense("visible", "видимый"), sense("hidden", "скрытый"), sense("clear", "ясный")],
    ["en.aware.adjective.01", "en.convinced.adjective.01", "en.concerned.adjective.01"],
    ["It is not visible.", "It is not hidden.", "It is not clear."],
  ),
  // Lesson 2, Chapter 1 stays with the already introduced negation operation.
  // These states make a real/fake/necessity contrast possible without adding
  // questions, articles, or any later grammar.
  assignment(61, BE_NEGATION_OPERATION_ID, [sense("real", "настоящий")], [], ["It is not real."]),
  assignment(62, BE_NEGATION_OPERATION_ID, [sense("fake", "поддельный")], [], ["It is not fake."]),
  assignment(63, BE_NEGATION_OPERATION_ID, [sense("necessary", "необходимый")], [], ["It is not necessary."]),
  // Lesson 2, Chapter 2 introduces the yes/no word order with be. The
  // vocabulary is deliberately usable in a one-question real-world check.
  assignment(65, BE_YES_NO_QUESTIONS_OPERATION_ID, [sense("possible", "возможный")], [], ["Is it possible?"]),
  assignment(66, BE_YES_NO_QUESTIONS_OPERATION_ID, [sense("impossible", "невозможный")], [], ["Is it impossible?"]),
  assignment(67, BE_YES_NO_QUESTIONS_OPERATION_ID, [sense("urgent", "срочный")], [], ["Is it urgent?"]),
  assignment(68, BE_YES_NO_QUESTIONS_OPERATION_ID, [sense("private", "личный")], [], ["Is it private?"]),
  assignment(69, BE_YES_NO_QUESTIONS_OPERATION_ID, [sense("public", "публичный")], [], ["Is it public?"]),
  assignment(70, BE_YES_NO_QUESTIONS_OPERATION_ID, [sense("obvious", "очевидный")], [], ["Is it obvious?"]),
  assignment(71, BE_YES_NO_QUESTIONS_OPERATION_ID, [sense("silent", "тихий")], [], ["Is it silent?"]),
  // Lesson 2, Chapter 3 keeps the answer short but complete: the be form
  // carries the reply and the new state supplies a reason to ask it.
  assignment(73, BE_SHORT_ANSWERS_OPERATION_ID, [sense("well", "хорошо себя чувствую", "adverb")], [], ["Yes, I am well."]),
  assignment(74, BE_SHORT_ANSWERS_OPERATION_ID, [sense("unwell", "плохо себя чувствует")], [], ["Yes, I am unwell."]),
  assignment(75, BE_SHORT_ANSWERS_OPERATION_ID, [sense("guilty", "виноват")], [], ["No, she is not guilty."]),
  assignment(76, BE_SHORT_ANSWERS_OPERATION_ID, [sense("yes", "да", "response"), sense("innocent", "невиновен")], [], ["Yes, he is innocent."]),
  assignment(77, BE_SHORT_ANSWERS_OPERATION_ID, [sense("no", "нет", "response"), sense("broken", "сломанный")], [], ["No, it is not broken."]),
  assignment(78, BE_SHORT_ANSWERS_OPERATION_ID, [sense("complete", "полный")], [], ["Yes, it is complete."]),
  assignment(79, BE_SHORT_ANSWERS_OPERATION_ID, [sense("valid", "действительный")], [], ["Yes, it is valid."]),
  // Lesson 2, Chapter 4 introduces who/what/where before the be question.
  // Each location or quality keeps the question meaningful without importing
  // an article, noun system, or later clause pattern.
  assignment(81, BE_WH_QUESTIONS_OPERATION_ID, [sense("absent", "отсутствует")], [], ["Who is absent?"]),
  assignment(82, BE_WH_QUESTIONS_OPERATION_ID, [sense("careless", "неосторожный")], [], ["Who is careless?"]),
  assignment(83, BE_WH_QUESTIONS_OPERATION_ID, [sense("generous", "щедрый")], [], ["Who is generous?"]),
  assignment(84, BE_WH_QUESTIONS_OPERATION_ID, [sense("flexible", "гибкий")], [], ["What is flexible?"]),
  assignment(85, BE_WH_QUESTIONS_OPERATION_ID, [sense("away", "не здесь", "adverb")], [], ["Where is it? It is away."]),
  assignment(86, BE_WH_QUESTIONS_OPERATION_ID, [sense("elsewhere", "в другом месте", "adverb")], [], ["Where is it? It is elsewhere."]),
  assignment(87, BE_WH_QUESTIONS_OPERATION_ID, [sense("unusual", "необычный")], [], ["What is unusual?"]),
  // Lessons 2 Chapters 5–7 are deliberate retrieval and transfer. Every
  // question stays within the four already introduced be-question operations
  // while its adjective supports a practical decision.
  assignment(89, BE_YES_NO_QUESTIONS_OPERATION_ID, [sense("active", "активный")], [], ["Is it active?"]),
  assignment(90, BE_YES_NO_QUESTIONS_OPERATION_ID, [sense("inactive", "неактивный")], [], ["Is it inactive?"]),
  assignment(91, BE_YES_NO_QUESTIONS_OPERATION_ID, [sense("formal", "официальный")], [], ["Is it formal?"]),
  assignment(92, BE_YES_NO_QUESTIONS_OPERATION_ID, [sense("informal", "неофициальный")], [], ["Is it informal?"]),
  assignment(93, BE_YES_NO_QUESTIONS_OPERATION_ID, [sense("official", "официальный")], [], ["Is it official?"]),
  assignment(94, BE_YES_NO_QUESTIONS_OPERATION_ID, [sense("unofficial", "неофициальный")], [], ["Is it unofficial?"]),
  assignment(95, BE_YES_NO_QUESTIONS_OPERATION_ID, [sense("relevant", "относящийся к делу")], [], ["Is it relevant?"]),
  assignment(97, BE_YES_NO_QUESTIONS_OPERATION_ID, [sense("accurate", "точный")], [], ["Is it accurate?"]),
  assignment(98, BE_YES_NO_QUESTIONS_OPERATION_ID, [sense("inaccurate", "неточный")], [], ["Is it inaccurate?"]),
  assignment(99, BE_YES_NO_QUESTIONS_OPERATION_ID, [sense("uncertain", "неопределённый")], [], ["Is it uncertain?"]),
  assignment(100, BE_YES_NO_QUESTIONS_OPERATION_ID, [sense("legal", "законный")], [], ["Is it legal?"]),
  assignment(101, BE_YES_NO_QUESTIONS_OPERATION_ID, [sense("illegal", "незаконный")], [], ["Is it illegal?"]),
  assignment(102, BE_YES_NO_QUESTIONS_OPERATION_ID, [sense("appropriate", "уместный")], [], ["Is it appropriate?"]),
  assignment(103, BE_YES_NO_QUESTIONS_OPERATION_ID, [sense("acceptable", "приемлемый")], [], ["Is it acceptable?"]),
  assignment(105, BE_YES_NO_QUESTIONS_OPERATION_ID, [sense("unacceptable", "неприемлемый")], [], ["Is it unacceptable?"]),
  assignment(106, BE_YES_NO_QUESTIONS_OPERATION_ID, [sense("effective", "действенный")], [], ["Is it effective?"]),
  assignment(107, BE_YES_NO_QUESTIONS_OPERATION_ID, [sense("ineffective", "недейственный")], [], ["Is it ineffective?"]),
  assignment(108, BE_YES_NO_QUESTIONS_OPERATION_ID, [sense("fair", "справедливый")], [], ["Is it fair?"]),
  assignment(109, BE_YES_NO_QUESTIONS_OPERATION_ID, [sense("unfair", "несправедливый")], [], ["Is it unfair?"]),
  assignment(110, BE_YES_NO_QUESTIONS_OPERATION_ID, [sense("reliable", "надёжный")], [], ["Is it reliable?"]),
  assignment(111, BE_YES_NO_QUESTIONS_OPERATION_ID, [sense("unreliable", "ненадёжный")], [], ["Is it unreliable?"]),
  // Lesson 3 begins with singular count nouns. The indefinite article is part
  // of every canonical example; no plural or demonstrative form is introduced
  // in this prerequisite-safe chapter.
  assignment(113, INDEFINITE_ARTICLE_OPERATION_ID, [sense("key", "ключ", "noun")], [], ["It is a key."]),
  assignment(114, INDEFINITE_ARTICLE_OPERATION_ID, [sense("apple", "яблоко", "noun")], [], ["It is an apple."]),
  assignment(115, INDEFINITE_ARTICLE_OPERATION_ID, [sense("book", "книга", "noun")], [], ["It is a book."]),
  assignment(116, INDEFINITE_ARTICLE_OPERATION_ID, [sense("bag", "сумка", "noun")], [], ["It is a bag."]),
  assignment(117, INDEFINITE_ARTICLE_OPERATION_ID, [sense("map", "карта", "noun")], [], ["It is a map."]),
  assignment(118, INDEFINITE_ARTICLE_OPERATION_ID, [sense("pen", "ручка", "noun")], [], ["It is a pen."]),
  assignment(119, INDEFINITE_ARTICLE_OPERATION_ID, [sense("cup", "чашка", "noun")], [], ["It is a cup."]),
  // Chapter 2 makes one already identifiable singular item the topic. Its
  // adjective complements were all grounded in Lessons 1–2.
  assignment(121, DEFINITE_ARTICLE_OPERATION_ID, [sense("door", "дверь", "noun")], [], ["The door is open."]),
  assignment(122, DEFINITE_ARTICLE_OPERATION_ID, [sense("lock", "замок", "noun")], [], ["The lock is open."]),
  assignment(123, DEFINITE_ARTICLE_OPERATION_ID, [sense("room", "комната", "noun")], [], ["The room is clean."]),
  assignment(124, DEFINITE_ARTICLE_OPERATION_ID, [sense("table", "стол", "noun")], [], ["The table is clean."]),
  assignment(125, DEFINITE_ARTICLE_OPERATION_ID, [sense("window", "окно", "noun")], [], ["The window is open."]),
  assignment(126, DEFINITE_ARTICLE_OPERATION_ID, [sense("picture", "картинка", "noun")], [], ["The picture is small."]),
  assignment(127, DEFINITE_ARTICLE_OPERATION_ID, [sense("coat", "пальто", "noun")], [], ["The coat is warm."]),
  // Plural forms are introduced before any general zero-article statement can
  // require them. The demonstratives are still withheld until their own chapter.
  assignment(129, PLURAL_NOUNS_OPERATION_ID, [sense("books", "книги", "plural_noun")], [], ["Books are here."]),
  assignment(130, PLURAL_NOUNS_OPERATION_ID, [sense("boxes", "коробки", "plural_noun")], [], ["Boxes are open."]),
  assignment(131, PLURAL_NOUNS_OPERATION_ID, [sense("bags", "сумки", "plural_noun")], [], ["Bags are here."]),
  assignment(132, PLURAL_NOUNS_OPERATION_ID, [sense("maps", "карты", "plural_noun")], [], ["Maps are here."]),
  assignment(133, PLURAL_NOUNS_OPERATION_ID, [sense("pens", "ручки", "plural_noun")], [], ["Pens are here."]),
  assignment(134, PLURAL_NOUNS_OPERATION_ID, [sense("cups", "чашки", "plural_noun")], [], ["Cups are full."]),
  assignment(135, PLURAL_NOUNS_OPERATION_ID, [sense("tickets", "билеты", "plural_noun")], [], ["Tickets are here."]),
  // Zero article now follows plural formation and uses general statements
  // rather than an undeclared singular/article construction.
  assignment(137, ZERO_ARTICLE_OPERATION_ID, [sense("dogs", "собаки", "plural_noun")], [], ["Dogs are friendly."]),
  assignment(138, ZERO_ARTICLE_OPERATION_ID, [sense("cats", "кошки", "plural_noun")], [], ["Cats are quiet."]),
  assignment(139, ZERO_ARTICLE_OPERATION_ID, [sense("cars", "машины", "plural_noun")], [], ["Cars are expensive."]),
  assignment(140, ZERO_ARTICLE_OPERATION_ID, [sense("chairs", "стулья", "plural_noun")], [], ["Chairs are comfortable."]),
  assignment(141, ZERO_ARTICLE_OPERATION_ID, [sense("tables", "столы", "plural_noun")], [], ["Tables are useful."]),
  assignment(142, ZERO_ARTICLE_OPERATION_ID, [sense("windows", "окна", "plural_noun")], [], ["Windows are open."]),
  assignment(143, ZERO_ARTICLE_OPERATION_ID, [sense("parks", "парки", "plural_noun")], [], ["Parks are safe."]),
  // Demonstratives follow both singular and plural noun formation. The two
  // transfer chapters keep that complete noun system in changed everyday sets.
  assignment(145, DEMONSTRATIVES_OPERATION_ID, [sense("phone", "телефон", "noun")], [], ["This is a phone."]),
  assignment(146, DEMONSTRATIVES_OPERATION_ID, [sense("wallet", "кошелёк", "noun")], [], ["That is a wallet."]),
  assignment(147, DEMONSTRATIVES_OPERATION_ID, [sense("photos", "фотографии", "plural_noun")], [], ["These are photos."]),
  assignment(148, DEMONSTRATIVES_OPERATION_ID, [sense("children", "дети", "plural_noun")], [], ["Those are children."]),
  assignment(149, DEMONSTRATIVES_OPERATION_ID, [sense("car", "машина", "noun")], [], ["This is a car."]),
  assignment(150, DEMONSTRATIVES_OPERATION_ID, [sense("ticket", "билет", "noun")], [], ["That is a ticket."]),
  assignment(151, DEMONSTRATIVES_OPERATION_ID, [sense("bottles", "бутылки", "plural_noun")], [], ["These are bottles."]),
  assignment(153, DEMONSTRATIVES_OPERATION_ID, [sense("kitchen", "кухня", "noun")], [], ["This is a kitchen."]),
  assignment(154, DEMONSTRATIVES_OPERATION_ID, [sense("bathroom", "ванная", "noun")], [], ["That is a bathroom."]),
  assignment(155, DEMONSTRATIVES_OPERATION_ID, [sense("bedrooms", "спальни", "plural_noun")], [], ["These are bedrooms."]),
  assignment(156, DEMONSTRATIVES_OPERATION_ID, [sense("hotels", "отели", "plural_noun")], [], ["Those are hotels."]),
  assignment(157, DEMONSTRATIVES_OPERATION_ID, [sense("office", "офис", "noun")], [], ["This is an office."]),
  assignment(158, DEMONSTRATIVES_OPERATION_ID, [sense("airport", "аэропорт", "noun")], [], ["That is an airport."]),
  assignment(159, DEMONSTRATIVES_OPERATION_ID, [sense("restaurants", "рестораны", "plural_noun")], [], ["These are restaurants."]),
  assignment(161, DEMONSTRATIVES_OPERATION_ID, [sense("hospital", "больница", "noun")], [], ["This is a hospital."]),
  assignment(162, DEMONSTRATIVES_OPERATION_ID, [sense("cinema", "кинотеатр", "noun")], [], ["That is a cinema."]),
  assignment(163, DEMONSTRATIVES_OPERATION_ID, [sense("libraries", "библиотеки", "plural_noun")], [], ["These are libraries."]),
  assignment(164, DEMONSTRATIVES_OPERATION_ID, [sense("stations", "станции", "plural_noun")], [], ["Those are stations."]),
  assignment(165, DEMONSTRATIVES_OPERATION_ID, [sense("museum", "музей", "noun")], [], ["This is a museum."]),
  assignment(166, DEMONSTRATIVES_OPERATION_ID, [sense("supermarket", "супермаркет", "noun")], [], ["That is a supermarket."]),
  assignment(167, DEMONSTRATIVES_OPERATION_ID, [sense("cafes", "кафе", "plural_noun")], [], ["These are cafes."]),
  // Lesson 4 starts with existence in a place. All noun/article and plural
  // prerequisites are already grounded in Lesson 3.
  assignment(169, THERE_IS_ARE_OPERATION_ID, [sense("bank", "банк", "noun")], [], ["There is a bank here."]),
  assignment(170, THERE_IS_ARE_OPERATION_ID, [sense("garden", "сад", "noun")], [], ["There is a garden here."]),
  assignment(171, THERE_IS_ARE_OPERATION_ID, [sense("library", "библиотека", "noun")], [], ["There is a library here."]),
  assignment(172, THERE_IS_ARE_OPERATION_ID, [sense("station", "станция", "noun")], [], ["There is a station here."]),
  assignment(173, THERE_IS_ARE_OPERATION_ID, [sense("cafe", "кафе", "noun")], [], ["There is a cafe here."]),
  assignment(174, THERE_IS_ARE_OPERATION_ID, [sense("lift", "лифт", "noun")], [], ["There is a lift here."]),
  assignment(175, THERE_IS_ARE_OPERATION_ID, [sense("bridge", "мост", "noun")], [], ["There is a bridge here."]),
  // The question chapter asks only about existence; some/any is withheld for
  // its dedicated following operation.
  assignment(177, EXISTENTIAL_QUESTIONS_OPERATION_ID, [sense("pharmacy", "аптека", "noun")], [], ["Is there a pharmacy?"]),
  assignment(178, EXISTENTIAL_QUESTIONS_OPERATION_ID, [sense("doctor", "врач", "noun")], [], ["Is there a doctor?"]),
  assignment(179, EXISTENTIAL_QUESTIONS_OPERATION_ID, [sense("bus", "автобус", "noun")], [], ["Is there a bus?"]),
  assignment(180, EXISTENTIAL_QUESTIONS_OPERATION_ID, [sense("train", "поезд", "noun")], [], ["Is there a train?"]),
  assignment(181, EXISTENTIAL_QUESTIONS_OPERATION_ID, [sense("seats", "места", "plural_noun")], [], ["Are there seats?"]),
  assignment(182, EXISTENTIAL_QUESTIONS_OPERATION_ID, [sense("toilets", "туалеты", "plural_noun")], [], ["Are there toilets?"]),
  assignment(183, EXISTENTIAL_QUESTIONS_OPERATION_ID, [sense("taxis", "такси", "plural_noun")], [], ["Are there taxis?"]),
  // Some/any is introduced only after existence questions; affirmative and
  // negative statements make the contrast observable in a real location.
  assignment(185, EXISTENTIAL_SOME_ANY_OPERATION_ID, [sense("water", "вода", "noun")], [], ["There isn't any water."]),
  assignment(186, EXISTENTIAL_SOME_ANY_OPERATION_ID, [sense("shops", "магазины", "plural_noun")], [], ["There are some shops."]),
  assignment(187, EXISTENTIAL_SOME_ANY_OPERATION_ID, [sense("buses", "автобусы", "plural_noun")], [], ["There are some buses."]),
  assignment(188, EXISTENTIAL_SOME_ANY_OPERATION_ID, [sense("trees", "деревья", "plural_noun")], [], ["There are some trees."]),
  assignment(189, EXISTENTIAL_SOME_ANY_OPERATION_ID, [sense("milk", "молоко", "noun")], [], ["There isn't any milk."]),
  assignment(190, EXISTENTIAL_SOME_ANY_OPERATION_ID, [sense("trains", "поезда", "plural_noun")], [], ["There aren't any trains."]),
  assignment(191, EXISTENTIAL_SOME_ANY_OPERATION_ID, [sense("coffee", "кофе", "noun")], [], ["There isn't any coffee."]),
  // The place-preposition chapter stays inside the exact approved inventory:
  // in, on, under, next to, between, behind and near.
  assignment(193, PLACE_PREPOSITIONS_OPERATION_ID, [sense("under", "под", "preposition")], [], ["The key is under the table."]),
  assignment(194, PLACE_PREPOSITIONS_OPERATION_ID, [sense("in", "в", "preposition")], [], ["The bag is in the room."]),
  assignment(195, PLACE_PREPOSITIONS_OPERATION_ID, [sense("on", "на", "preposition")], [], ["The book is on the table."]),
  assignment(196, PLACE_PREPOSITIONS_OPERATION_ID, [sense("next", "рядом", "adjective")], [], ["The bank is next to the hotel."]),
  assignment(197, PLACE_PREPOSITIONS_OPERATION_ID, [sense("between", "между", "preposition")], [], ["The cafe is between the banks."]),
  assignment(198, PLACE_PREPOSITIONS_OPERATION_ID, [sense("behind", "за", "preposition")], [], ["The bus is behind the hotel."]),
  assignment(199, PLACE_PREPOSITIONS_OPERATION_ID, [sense("near", "рядом с", "preposition")], [], ["The park is near the bank."]),
  assignment(201, PLACE_PREPOSITIONS_OPERATION_ID, [sense("entrance", "вход", "noun")], [], ["The entrance is near the bank."]),
  assignment(202, PLACE_PREPOSITIONS_OPERATION_ID, [sense("exit", "выход", "noun")], [], ["The exit is near the station."]),
  assignment(203, PLACE_PREPOSITIONS_OPERATION_ID, [sense("platform", "платформа", "noun")], [], ["The platform is next to the train."]),
  assignment(204, PLACE_PREPOSITIONS_OPERATION_ID, [sense("corner", "угол", "noun")], [], ["The corner is behind the cafe."]),
  assignment(205, PLACE_PREPOSITIONS_OPERATION_ID, [sense("reception", "стойка регистрации", "noun")], [], ["The reception is in the hotel."]),
  assignment(206, PLACE_PREPOSITIONS_OPERATION_ID, [sense("market", "рынок", "noun")], [], ["The market is near the park."]),
  assignment(207, PLACE_PREPOSITIONS_OPERATION_ID, [sense("fountain", "фонтан", "noun")], [], ["The fountain is in the park."]),
  assignment(209, PLACE_PREPOSITIONS_OPERATION_ID, [sense("crossing", "переход", "noun")], [], ["The crossing is near the station."]),
  assignment(210, PLACE_PREPOSITIONS_OPERATION_ID, [sense("tunnel", "туннель", "noun")], [], ["The tunnel is behind the park."]),
  assignment(211, PLACE_PREPOSITIONS_OPERATION_ID, [sense("aisle", "проход", "noun")], [], ["The aisle is in the market."]),
  assignment(212, PLACE_PREPOSITIONS_OPERATION_ID, [sense("floor", "этаж", "noun")], [], ["The floor is in the hotel."]),
  assignment(213, PLACE_PREPOSITIONS_OPERATION_ID, [sense("shelf", "полка", "noun")], [], ["The shelf is in the room."]),
  assignment(214, PLACE_PREPOSITIONS_OPERATION_ID, [sense("gate", "выход на посадку", "noun")], [], ["The gate is near the airport."]),
  assignment(215, PLACE_PREPOSITIONS_OPERATION_ID, [sense("queue", "очередь", "noun")], [], ["The queue is outside the cafe."]),
  assignment(217, PLACE_PREPOSITIONS_OPERATION_ID, [sense("bench", "скамейка", "noun")], [], ["The bench is in the park."]),
  assignment(218, PLACE_PREPOSITIONS_OPERATION_ID, [sense("path", "дорожка", "noun")], [], ["The path is near the garden."]),
  assignment(219, PLACE_PREPOSITIONS_OPERATION_ID, [sense("lamp", "лампа", "noun")], [], ["The lamp is on the table."]),
  assignment(220, PLACE_PREPOSITIONS_OPERATION_ID, [sense("mirror", "зеркало", "noun")], [], ["The mirror is in the bathroom."]),
  assignment(221, PLACE_PREPOSITIONS_OPERATION_ID, [sense("stairs", "лестница", "plural_noun")], [], ["The stairs are near the lift."]),
  assignment(222, PLACE_PREPOSITIONS_OPERATION_ID, [sense("roof", "крыша", "noun")], [], ["The roof is on the hotel."]),
  assignment(223, PLACE_PREPOSITIONS_OPERATION_ID, [sense("wall", "стена", "noun")], [], ["The wall is behind the bench."]),
  // Lesson 5 / Session 2 is a prerequisite-safe retrieval packet. `hotel` is
  // introduced through its existing place-preposition example; the session
  // introduces no possession form beyond its declared review set.
  assignment(226, PLACE_PREPOSITIONS_OPERATION_ID, [sense("hotel", "отель", "noun")], [], ["The bank is next to the hotel."]),
  assignment(227, PLACE_PREPOSITIONS_OPERATION_ID, [sense("desk", "письменный стол", "noun")], [], ["The key is on the desk."]),
  assignment(228, PLACE_PREPOSITIONS_OPERATION_ID, [sense("curtain", "занавеска", "noun")], [], ["The bag is behind the curtain."]),
  assignment(229, PLACE_PREPOSITIONS_OPERATION_ID, [sense("drawer", "ящик", "noun")], [], ["The key is in the drawer."]),
  assignment(230, PLACE_PREPOSITIONS_OPERATION_ID, [sense("ceiling", "потолок", "noun")], [], ["The lamp is on the ceiling."]),
  assignment(231, PLACE_PREPOSITIONS_OPERATION_ID, [sense("remote", "пульт", "noun")], [], ["The remote is on the table."]),
  assignment(233, "en.grammar.possession.possessive_determiners", [sense("charger", "зарядное устройство", "noun")], [], ["This is my charger."]),
  assignment(234, "en.grammar.possession.possessive_determiners", [sense("pocket", "карман", "noun")], [], ["The key is in my pocket."]),
  assignment(235, "en.grammar.possession.possessive_determiners", [sense("backpack", "рюкзак", "noun")], [], ["The book is in her backpack."]),
  assignment(236, "en.grammar.possession.possessive_determiners", [sense("notebook", "тетрадь", "noun")], [], ["The notebook is on her desk."]),
  assignment(237, "en.grammar.possession.possessive_determiners", [sense("umbrella", "зонт", "noun")], [], ["The umbrella is in his bag."]),
  assignment(238, "en.grammar.possession.possessive_determiners", [sense("suitcase", "чемодан", "noun")], [], ["The suitcase is next to their car."]),
  assignment(239, "en.grammar.possession.possessive_determiners", [sense("helmet", "шлем", "noun")], [], ["The helmet is on my desk."]),
  assignment(241, "en.grammar.possession.possessive_pronouns", [sense("jacket", "куртка", "noun")], [], ["The jacket is mine."]),
  assignment(242, "en.grammar.possession.possessive_pronouns", [sense("gloves", "перчатки", "plural_noun")], [], ["The gloves are ours."]),
  assignment(243, "en.grammar.possession.possessive_pronouns", [sense("tablet", "планшет", "noun")], [], ["The tablet is hers."]),
  assignment(244, "en.grammar.possession.possessive_pronouns", [sense("scarf", "шарф", "noun")], [], ["The scarf is yours."]),
  assignment(245, "en.grammar.possession.possessive_pronouns", [sense("necklace", "ожерелье", "noun")], [], ["The necklace is hers."]),
  assignment(246, "en.grammar.possession.possessive_pronouns", [sense("boots", "ботинки", "plural_noun")], [], ["The boots are theirs."]),
  assignment(247, "en.grammar.possession.possessive_pronouns", [sense("camera", "камера", "noun")], [], ["The camera is mine."]),
  assignment(249, "en.grammar.possession.possessive_s", [sense("lunchbox", "ланчбокс", "noun")], [], ["Maria's lunchbox is here."]),
  assignment(250, "en.grammar.possession.possessive_s", [sense("badge", "значок", "noun")], [], ["Ava's badge is here."]),
  assignment(251, "en.grammar.possession.possessive_s", [sense("passport", "паспорт", "noun")], [], ["Noah's passport is here."]),
  assignment(252, "en.grammar.possession.possessive_s", [sense("keycard", "ключ-карта", "noun")], [], ["Mia's keycard is here."]),
  assignment(253, "en.grammar.possession.possessive_s", [sense("skateboard", "скейтборд", "noun")], [], ["Liam's skateboard is here."]),
  assignment(254, "en.grammar.possession.possessive_s", [sense("headphones", "наушники", "plural_noun")], [], ["Leo's headphones are here."]),
  assignment(255, "en.grammar.possession.possessive_s", [sense("guitar", "гитара", "noun")], [], ["Nora's guitar is here."]),
  assignment(257, "en.grammar.possession.whose_questions", [sense("watch", "наручные часы", "noun")], [], ["Whose watch is this?"]),
  assignment(258, "en.grammar.possession.whose_questions", [sense("ring", "кольцо", "noun")], [], ["Whose ring is this?"]),
  assignment(259, "en.grammar.possession.whose_questions", [sense("bracelet", "браслет", "noun")], [], ["Whose bracelet is this?"]),
  assignment(260, "en.grammar.possession.whose_questions", [sense("sunglasses", "солнцезащитные очки", "plural_noun")], [], ["Whose sunglasses are these?"]),
  assignment(261, "en.grammar.possession.whose_questions", [sense("earrings", "серьги", "plural_noun")], [], ["Whose earrings are these?"]),
  assignment(262, "en.grammar.possession.whose_questions", [sense("laptop", "ноутбук", "noun")], [], ["Whose laptop is this?"]),
  assignment(263, "en.grammar.possession.whose_questions", [sense("violin", "скрипка", "noun")], [], ["Whose violin is this?"]),
  assignment(265, "en.grammar.existence_place.basic_place_prepositions", [sense("locker", "шкафчик", "noun")], [], ["The key is in the locker."]),
  assignment(266, "en.grammar.existence_place.basic_place_prepositions", [sense("scooter", "самокат", "noun")], [], ["The scooter is next to the hotel."]),
  assignment(267, "en.grammar.existence_place.basic_place_prepositions", [sense("tram", "трамвай", "noun")], [], ["The tram is near the station."]),
  assignment(268, "en.grammar.existence_place.basic_place_prepositions", [sense("bicycle", "велосипед", "noun")], [], ["The bicycle is behind the hotel."]),
  assignment(269, "en.grammar.existence_place.basic_place_prepositions", [sense("motorbike", "мотоцикл", "noun")], [], ["The motorbike is near the hotel."]),
  assignment(270, "en.grammar.existence_place.basic_place_prepositions", [sense("ferry", "паром", "noun")], [], ["The ferry is near the station."]),
  assignment(271, "en.grammar.existence_place.basic_place_prepositions", [sense("subway", "метро", "noun")], [], ["The subway is near the station."]),
  assignment(273, "en.grammar.existence_place.basic_place_prepositions", [sense("garage", "гараж", "noun")], [], ["The bicycle is in the garage."]),
  assignment(274, "en.grammar.existence_place.basic_place_prepositions", [sense("playground", "детская площадка", "noun")], [], ["The playground is near the park."]),
  assignment(275, "en.grammar.existence_place.basic_place_prepositions", [sense("stadium", "стадион", "noun")], [], ["The stadium is near the park."]),
  assignment(276, "en.grammar.existence_place.basic_place_prepositions", [sense("pool", "бассейн", "noun")], [], ["The pool is near the park."]),
  assignment(277, "en.grammar.existence_place.basic_place_prepositions", [sense("court", "корт", "noun")], [], ["The court is near the stadium."]),
  assignment(278, "en.grammar.existence_place.basic_place_prepositions", [sense("kiosk", "киоск", "noun")], [], ["The kiosk is near the ferry."]),
  assignment(279, "en.grammar.existence_place.basic_place_prepositions", [sense("mural", "настенная роспись", "noun")], [], ["The mural is on the wall."]),
  assignment(282, "en.grammar.possession.whose_questions", [sense("folder", "папка", "noun")], [], ["Whose folder is this?"]),
  assignment(283, "en.grammar.possession.whose_questions", [sense("parcel", "посылка", "noun")], [], ["Whose parcel is this?"]),
  assignment(284, "en.grammar.possession.whose_questions", [sense("receipt", "чек", "noun")], [], ["Whose receipt is this?"]),
  assignment(285, "en.grammar.possession.whose_questions", [sense("keychain", "брелок", "noun")], [], ["Whose keychain is this?"]),
  assignment(286, "en.grammar.possession.whose_questions", [sense("bookmark", "закладка", "noun")], [], ["Whose bookmark is this?"]),
  assignment(287, "en.grammar.possession.whose_questions", [sense("calendar", "календарь", "noun")], [], ["Whose calendar is this?"]),
  assignment(290, "en.grammar.present_simple_affirmative.agreement", [sense("practice", "практиковаться", "verb")], [], ["We practice English."]),
  assignment(291, "en.grammar.present_simple_affirmative.agreement", [sense("learn", "учиться", "verb")], [], ["They learn English."]),
  assignment(292, "en.grammar.present_simple_affirmative.agreement", [sense("paint", "рисовать красками", "verb")], [], ["They paint."]),
  assignment(293, "en.grammar.present_simple_affirmative.agreement", [sense("swim", "плавать", "verb")], [], ["They swim."]),
  assignment(294, "en.grammar.present_simple_affirmative.agreement", [sense("laugh", "смеяться", "verb")], [], ["They laugh."]),
  assignment(295, "en.grammar.present_simple_affirmative.agreement", [sense("sing", "петь", "verb")], [], ["They sing."]),
  assignment(297, "en.grammar.present_simple_affirmative.third_person_s", [sense("drive", "водить машину", "verb")], [], ["She drives."]),
  assignment(298, "en.grammar.present_simple_affirmative.third_person_s", [sense("smile", "улыбаться", "verb")], [], ["She smiles."]),
  assignment(299, "en.grammar.present_simple_affirmative.third_person_s", [sense("draw", "рисовать", "verb")], [], ["She draws."]),
  assignment(300, "en.grammar.present_simple_affirmative.third_person_s", [sense("cook", "готовить", "verb")], [], ["She cooks."]),
  assignment(301, "en.grammar.present_simple_affirmative.third_person_s", [sense("write", "писать", "verb")], [], ["He writes."]),
  assignment(302, "en.grammar.present_simple_affirmative.third_person_s", [sense("read", "читать", "verb")], [], ["She reads books."]),
  assignment(303, "en.grammar.present_simple_affirmative.third_person_s", [sense("teach", "преподавать", "verb")], [], ["She teaches English."]),
  assignment(306, "en.grammar.present_simple_affirmative.routine_fact_meaning", [sense("jog", "бегать трусцой", "verb")], [], ["I jog every day."]),
  assignment(307, "en.grammar.present_simple_affirmative.routine_fact_meaning", [sense("exercise", "тренироваться", "verb")], [], ["I exercise every day."]),
  assignment(308, "en.grammar.present_simple_affirmative.routine_fact_meaning", [sense("stretch", "разминаться", "verb")], [], ["I stretch every day."]),
  assignment(309, "en.grammar.present_simple_affirmative.routine_fact_meaning", [sense("call", "звонить", "verb")], [], ["I call my friend every day."]),
  assignment(310, "en.grammar.present_simple_affirmative.routine_fact_meaning", [sense("clean", "убирать", "verb")], [], ["I clean my room every day."]),
  assignment(311, "en.grammar.present_simple_affirmative.routine_fact_meaning", [sense("shower", "принимать душ", "verb")], [], ["I shower every day."]),
  // Lesson 6 / Chapter 5 begins lower-support application of the complete
  // affirmative system. The new verb is grounded in a natural routine while
  // the grammar remains inside the already introduced present-simple review.
  assignment(313, "en.grammar.present_simple_affirmative.routine_fact_meaning", [sense("study", "учиться", "verb")], [], ["I study every day."]),
  assignment(314, "en.grammar.present_simple_affirmative.routine_fact_meaning", [sense("drink", "пить", "verb")], [], ["I drink water every day."]),
  assignment(315, "en.grammar.present_simple_affirmative.routine_fact_meaning", [sense("sleep", "спать", "verb")], [], ["I sleep every night."]),
  assignment(316, "en.grammar.present_simple_affirmative.routine_fact_meaning", [sense("live", "жить", "verb")], [], ["I live here."]),
  assignment(317, "en.grammar.present_simple_affirmative.routine_fact_meaning", [sense("shop", "делать покупки", "verb")], [], ["I shop here."]),
  assignment(318, "en.grammar.present_simple_affirmative.routine_fact_meaning", [sense("rest", "отдыхать", "verb")], [], ["I rest here."]),
  assignment(319, "en.grammar.present_simple_affirmative.routine_fact_meaning", [sense("cycle", "ездить на велосипеде", "verb")], [], ["I cycle every day."]),
  // Lesson 6 / Chapter 6 moves the familiar affirmative system into short
  // conversational application without introducing future grammar.
  assignment(321, "en.grammar.present_simple_affirmative.lexical_frame", [sense("chat", "беседовать", "verb")], [], ["We chat at home.", "They chat here."]),
  assignment(322, "en.grammar.present_simple_affirmative.lexical_frame", [sense("share", "пользоваться вместе", "verb")], [], ["We share a room."]),
  assignment(323, "en.grammar.present_simple_affirmative.agreement", [sense("speak", "говорить", "verb")], [], ["You speak English."]),
  assignment(324, "en.grammar.possession.whose_questions", [sense("hat", "головной убор", "noun")], [], ["Whose hat is this?"]),
  assignment(325, "en.grammar.possession.whose_questions", [sense("pencil", "карандаш", "noun")], [], ["Whose pencil is this?"]),
  assignment(326, "en.grammar.possession.whose_questions", [sense("mug", "кружка", "noun")], [], ["Whose mug is this?"]),
  assignment(327, "en.grammar.possession.whose_questions", [sense("glove", "перчатка", "noun")], [], ["Whose glove is this?"]),
  // Chapter checkpoint: no new senses. Retrieve four familiar items across
  // both reviewed systems so the independent packet does not become a
  // lexically empty grammar shell.
  assignment(
    328,
    "en.grammar.present_simple_affirmative.lexical_frame",
    [],
    ["en.chat.verb.01", "en.speak.verb.01", "en.mug.noun.01", "en.glove.noun.01"],
    ["We chat at home.", "You speak English.", "Whose mug is this?", "Whose glove is this?"],
  ),
  // Chapter 7 transfer begins with one shared object that naturally connects
  // whose/demonstrative review to familiar Present Simple agreement and -s.
  assignment(
    329,
    "en.grammar.present_simple_affirmative.third_person_s",
    [sense("newspaper", "газета", "noun")],
    [],
    [
      "Whose newspaper is this?",
      "She reads this newspaper every day.",
      "We read newspapers every day.",
      "Whose newspapers are these?",
    ],
  ),
  // Reuse the newspaper from the previous packet in a new everyday action.
  // The base/third-person contrast keeps all examples inside familiar
  // Present Simple while whose/demonstratives remain available for review.
  assignment(
    330,
    "en.grammar.present_simple_affirmative.third_person_s",
    [sense("deliver", "доставлять", "verb")],
    [],
    [
      "They deliver newspapers.",
      "She delivers this newspaper.",
      "Whose newspaper is this?",
      "Whose newspapers are these?",
    ],
  ),
  // Diagnose the subject/verb and singular/plural cues with one familiar
  // object. Sell is useful outside the exercise and takes the regular -s form,
  // so the packet does not smuggle in a later spelling rule.
  assignment(
    331,
    "en.grammar.present_simple_affirmative.third_person_s",
    [sense("sell", "продавать", "verb")],
    [],
    [
      "They sell lamps.",
      "She sells this lamp.",
      "Whose lamp is this?",
      "Whose lamps are these?",
    ],
  ),
  // Fade support by making the learner choose the familiar noun/number cue
  // and the matching base or third-person verb form in one everyday context.
  assignment(
    332,
    "en.grammar.present_simple_affirmative.third_person_s",
    [sense("wear", "носить", "verb")],
    [],
    [
      "They wear hats.",
      "She wears this hat.",
      "Whose hat is this?",
      "Whose hats are these?",
    ],
  ),
  // Diagnose the decisive subject/number cue in a fresh clothing context:
  // `they wear` contrasts with `she wears`, while `uniform/uniforms` keeps
  // demonstrative and whose agreement visible without adding future grammar.
  assignment(
    333,
    "en.grammar.present_simple_affirmative.third_person_s",
    [sense("uniform", "униформа", "noun")],
    [],
    [
      "They wear uniforms.",
      "She wears this uniform.",
      "Whose uniform is this?",
      "Whose uniforms are these?",
    ],
  ),
  // Retrieve the known roof context by ear while keeping the decisive
  // base/third-person cue audible: `they repair` versus `she repairs`.
  // Repair is useful beyond this packet and takes the regular -s form.
  assignment(
    334,
    "en.grammar.present_simple_affirmative.third_person_s",
    [sense("repair", "ремонтировать", "verb")],
    [],
    [
      "They repair roofs.",
      "She repairs this roof.",
      "Whose roof is this?",
      "Whose roofs are these?",
    ],
  ),
  // Shift the familiar paint/mural context into spoken production. The noun
  // contrast makes the agreement cue explicit without adding a new verb:
  // plural `artists paint` versus singular `this artist paints`.
  assignment(
    335,
    "en.grammar.present_simple_affirmative.third_person_s",
    [sense("artist", "художник", "noun")],
    [],
    [
      "Artists paint murals.",
      "This artist paints murals.",
      "Whose mural is this?",
      "Whose murals are these?",
    ],
  ),
  // Final Lesson 6 checkpoint: introduce nothing new. Retrieve four chapter
  // senses while independently contrasting base and third-person forms with
  // the already explained whose/demonstrative frames.
  assignment(
    336,
    "en.grammar.present_simple_affirmative.third_person_s",
    [],
    [
      "en.newspaper.noun.01",
      "en.deliver.verb.01",
      "en.uniform.noun.01",
      "en.repair.verb.01",
    ],
    [
      "They repair uniforms.",
      "She delivers this newspaper.",
      "Whose uniform is this?",
      "Whose newspapers are these?",
    ],
  ),
  // The first do-question packet uses a familiar work frame. Factory makes
  // the new question useful while `do` stays before the subject and the
  // lexical verb remains the known base form.
  assignment(
    337,
    "en.grammar.present_simple_questions_negatives.do_questions",
    [sense("factory", "фабрика", "noun")],
    [],
    [
      "Do you work in a factory?",
      "Do they work in factories?",
      "Do you have a key?",
      "Do they have a newspaper?",
    ],
  ),
  // Apply the new do-question frame with less support in a delivery context.
  // Package is a useful concrete noun and keeps every example inside the
  // approved do + subject + base-verb question boundary.
  assignment(
    338,
    "en.grammar.present_simple_questions_negatives.do_questions",
    [sense("package", "посылка", "noun")],
    [],
    [
      "Do you have a package?",
      "Do they deliver packages?",
      "Do you work at a hotel?",
      "Do they have folders?",
    ],
  ),
  // Make the diagnostic contrast concrete: the learner hears that do takes
  // the question lead while the known lexical verb remains in its base form.
  assignment(
    339,
    "en.grammar.present_simple_questions_negatives.do_questions",
    [sense("poster", "плакат", "noun")],
    [],
    [
      "Do you have a poster?",
      "Do they sell posters?",
      "Do you have a desk?",
      "Do they sell books?",
    ],
  ),
  // Guided application keeps the do-question frame visible while a common
  // plural-only item adds a useful everyday question without new grammar.
  assignment(
    340,
    "en.grammar.present_simple_questions_negatives.do_questions",
    [sense("glasses", "очки", "plural_noun")],
    [],
    [
      "Do you wear glasses?",
      "Do they wear glasses?",
      "Do you have a bag?",
      "Do they have a receipt?",
    ],
  ),
  // Lesson 7 / Chapter 1 completes the do-question progression with useful
  // work-and-service nouns. Each packet keeps do before the subject and the
  // lexical verb in its base form; the checkpoint retrieves, but introduces
  // nothing.
  assignment(
    341,
    "en.grammar.present_simple_questions_negatives.do_questions",
    [sense("shift", "смена", "noun")],
    [],
    ["Do you start a shift early?"],
  ),
  assignment(
    342,
    "en.grammar.present_simple_questions_negatives.do_questions",
    [sense("customer", "клиент; покупатель", "noun")],
    [],
    ["Do you work with a customer?"],
  ),
  assignment(
    343,
    "en.grammar.present_simple_questions_negatives.do_questions",
    [sense("schedule", "расписание; график", "noun")],
    [],
    ["Do you have a schedule?"],
  ),
  assignment(
    344,
    "en.grammar.present_simple_questions_negatives.do_questions",
    [],
    [
      "en.factory.noun.01",
      "en.package.noun.01",
      "en.poster.noun.01",
      "en.schedule.noun.01",
    ],
    [
      "Do you work in a factory?",
      "Do you have a package?",
      "Do you have a poster?",
      "Do you have a schedule?",
    ],
  ),
  // Lesson 7 / Chapter 2: does-questions keep the lexical verb in its base
  // form while the subject is singular. The seven contexts deliberately move
  // from a person to everyday equipment and services; the checkpoint is
  // retrieval-only.
  assignment(345, "en.grammar.present_simple_questions_negatives.does_questions", [sense("manager", "руководитель; менеджер", "noun")], [], ["Does the manager work here?"]),
  assignment(346, "en.grammar.present_simple_questions_negatives.does_questions", [sense("machine", "устройство; машина", "noun")], [], ["Does the machine work?"]),
  assignment(347, "en.grammar.present_simple_questions_negatives.does_questions", [sense("printer", "принтер", "noun")], [], ["Does the printer work?"]),
  assignment(348, "en.grammar.present_simple_questions_negatives.does_questions", [sense("alarm", "будильник; сигнализация", "noun")], [], ["Does the alarm work?"]),
  assignment(349, "en.grammar.present_simple_questions_negatives.does_questions", [sense("screen", "экран", "noun")], [], ["Does the screen work?"]),
  assignment(350, "en.grammar.present_simple_questions_negatives.does_questions", [sense("server", "сервер", "noun")], [], ["Does the server work?"]),
  assignment(351, "en.grammar.present_simple_questions_negatives.does_questions", [sense("website", "веб-сайт", "noun")], [], ["Does the website work?"]),
  assignment(352, "en.grammar.present_simple_questions_negatives.does_questions", [], ["en.manager.noun.01", "en.printer.noun.01", "en.alarm.noun.01", "en.website.noun.01"], ["Does the manager work here?", "Does the printer work?", "Does the alarm work?", "Does the website work?"]),
  // Lesson 7 / Chapter 3: a short, useful habit is the only lexical target
  // in each negative. This keeps the diagnostic grammar focus on don't /
  // doesn't plus a base verb rather than hiding it in a new phrase pattern.
  assignment(353, "en.grammar.present_simple_questions_negatives.negatives", [sense("smoke", "курить", "verb")], [], ["I don't smoke."]),
  assignment(354, "en.grammar.present_simple_questions_negatives.negatives", [sense("gamble", "играть в азартные игры", "verb")], [], ["I don't gamble."]),
  assignment(355, "en.grammar.present_simple_questions_negatives.negatives", [sense("complain", "жаловаться", "verb")], [], ["I don't complain."]),
  assignment(356, "en.grammar.present_simple_questions_negatives.negatives", [sense("shout", "кричать", "verb")], [], ["I don't shout."]),
  assignment(357, "en.grammar.present_simple_questions_negatives.negatives", [sense("lie", "лгать", "verb")], [], ["I don't lie."]),
  assignment(358, "en.grammar.present_simple_questions_negatives.negatives", [sense("argue", "спорить", "verb")], [], ["I don't argue."]),
  assignment(359, "en.grammar.present_simple_questions_negatives.negatives", [sense("cheat", "жульничать", "verb")], [], ["I don't cheat."]),
  assignment(360, "en.grammar.present_simple_questions_negatives.negatives", [], ["en.smoke.verb.01", "en.complain.verb.01", "en.lie.verb.01", "en.cheat.verb.01"], ["I don't smoke.", "I don't complain.", "I don't lie.", "I don't cheat."]),
  // Lesson 7 / Chapter 4: each new everyday action is grounded in one short
  // where-question, so the learner can hear the wh-word before do and keep
  // the lexical verb in its base form.
  assignment(361, "en.grammar.present_simple_questions_negatives.wh_questions", [sense("meet", "встречаться", "verb")], [], ["Where do you meet?"]),
  assignment(362, "en.grammar.present_simple_questions_negatives.wh_questions", [sense("park", "парковаться", "verb")], [], ["Where do you park?"]),
  assignment(363, "en.grammar.present_simple_questions_negatives.wh_questions", [sense("stay", "останавливаться; оставаться", "verb")], [], ["Where do you stay?"]),
  assignment(364, "en.grammar.present_simple_questions_negatives.wh_questions", [sense("eat", "есть", "verb")], [], ["Where do you eat?"]),
  assignment(365, "en.grammar.present_simple_questions_negatives.wh_questions", [sense("play", "играть", "verb")], [], ["Where do you play?"]),
  assignment(366, "en.grammar.present_simple_questions_negatives.wh_questions", [sense("travel", "путешествовать", "verb")], [], ["Where do you travel?"]),
  assignment(367, "en.grammar.present_simple_questions_negatives.wh_questions", [sense("visit", "посещать", "verb")], [], ["Where do you visit?"]),
  assignment(368, "en.grammar.present_simple_questions_negatives.wh_questions", [], ["en.meet.verb.01", "en.stay.verb.01", "en.play.verb.01", "en.visit.verb.01"], ["Where do you meet?", "Where do you stay?", "Where do you play?", "Where do you visit?"]),
  // Lesson 7 / Chapter 5: frequency adverbs stay in their canonical position
  // before one new everyday action, so vocabulary growth does not blur the
  // word-order contrast being practiced.
  assignment(369, "en.grammar.present_simple_questions_negatives.frequency_position", [sense("recycle", "перерабатывать; сдавать на переработку", "verb")], [], ["I usually recycle."]),
  assignment(370, "en.grammar.present_simple_questions_negatives.frequency_position", [sense("volunteer", "быть волонтёром", "verb")], [], ["I often volunteer."]),
  assignment(371, "en.grammar.present_simple_questions_negatives.frequency_position", [sense("commute", "ездить на работу или учёбу", "verb")], [], ["I usually commute."]),
  assignment(372, "en.grammar.present_simple_questions_negatives.frequency_position", [sense("relax", "отдыхать; расслабляться", "verb")], [], ["I often relax."]),
  assignment(373, "en.grammar.present_simple_questions_negatives.frequency_position", [sense("pack", "собирать вещи; упаковывать", "verb")], [], ["I usually pack."]),
  assignment(374, "en.grammar.present_simple_questions_negatives.frequency_position", [sense("iron", "гладить", "verb")], [], ["I often iron."]),
  assignment(375, "en.grammar.present_simple_questions_negatives.frequency_position", [sense("bake", "печь; выпекать", "verb")], [], ["I usually bake."]),
  assignment(376, "en.grammar.present_simple_questions_negatives.frequency_position", [], ["en.recycle.verb.01", "en.commute.verb.01", "en.pack.verb.01", "en.bake.verb.01"], ["I usually recycle.", "I usually commute.", "I usually pack.", "I usually bake."]),
  // Lesson 7 / Chapter 6: supported review changes the action and context,
  // while retaining the already taught frequency-adverb position.
  assignment(377, "en.grammar.present_simple_questions_negatives.frequency_position", [sense("meditate", "медитировать", "verb")], [], ["I often meditate."]),
  assignment(378, "en.grammar.present_simple_questions_negatives.frequency_position", [sense("decorate", "украшать", "verb")], [], ["I usually decorate."]),
  assignment(379, "en.grammar.present_simple_questions_negatives.frequency_position", [sense("sew", "шить", "verb")], [], ["I often sew."]),
  assignment(380, "en.grammar.present_simple_questions_negatives.frequency_position", [sense("polish", "полировать; чистить", "verb")], [], ["I usually polish."]),
  assignment(381, "en.grammar.present_simple_questions_negatives.frequency_position", [sense("donate", "жертвовать; отдавать", "verb")], [], ["I often donate."]),
  assignment(382, "en.grammar.present_simple_questions_negatives.frequency_position", [sense("organize", "организовывать", "verb")], [], ["I usually organize."]),
  assignment(383, "en.grammar.present_simple_questions_negatives.frequency_position", [sense("photograph", "фотографировать", "verb")], [], ["I often photograph birds."]),
  assignment(384, "en.grammar.present_simple_questions_negatives.frequency_position", [], ["en.meditate.verb.01", "en.sew.verb.01", "en.donate.verb.01", "en.photograph.verb.01"], ["I often meditate.", "I often sew.", "I often donate.", "I often photograph birds."]),
  // Lesson 7 / Chapter 7: transfer uses fresh leisure and household actions;
  // it preserves a familiar frequency-position cue but no packet repeats a
  // Chapter 5 or Chapter 6 lexical target.
  assignment(385, "en.grammar.present_simple_questions_negatives.frequency_position", [sense("camp", "ходить в поход с ночёвкой", "verb")], [], ["I often camp."]),
  assignment(386, "en.grammar.present_simple_questions_negatives.frequency_position", [sense("hike", "ходить в пеший поход", "verb")], [], ["I usually hike."]),
  assignment(387, "en.grammar.present_simple_questions_negatives.frequency_position", [sense("dance", "танцевать", "verb")], [], ["I often dance."]),
  assignment(388, "en.grammar.present_simple_questions_negatives.frequency_position", [sense("ski", "кататься на лыжах", "verb")], [], ["I usually ski."]),
  assignment(389, "en.grammar.present_simple_questions_negatives.frequency_position", [sense("surf", "заниматься сёрфингом", "verb")], [], ["I often surf."]),
  assignment(390, "en.grammar.present_simple_questions_negatives.frequency_position", [sense("browse", "просматривать", "verb")], [], ["I usually browse online."]),
  assignment(391, "en.grammar.present_simple_questions_negatives.frequency_position", [sense("stream", "смотреть или передавать потоково", "verb")], [], ["I often stream films."]),
  assignment(392, "en.grammar.present_simple_questions_negatives.frequency_position", [], ["en.camp.verb.01", "en.dance.verb.01", "en.surf.verb.01", "en.stream.verb.01"], ["I often camp.", "I often dance.", "I often surf.", "I often stream films."]),
  // Lesson 8 / Chapter 1: each ability target takes a bare verb after can.
  // The examples are intentionally short so the new lexical sense never
  // hides the modal boundary.
  assignment(393, "en.grammar.ability_requests_instructions.can_ability", [sense("whistle", "свистеть", "verb")], [], ["I can whistle."]),
  assignment(394, "en.grammar.ability_requests_instructions.can_ability", [sense("juggle", "жонглировать", "verb")], [], ["I can juggle."]),
  assignment(395, "en.grammar.ability_requests_instructions.can_ability", [sense("type", "печатать на клавиатуре", "verb")], [], ["I can type."]),
  assignment(396, "en.grammar.ability_requests_instructions.can_ability", [sense("balance", "удерживать равновесие", "verb")], [], ["I can balance."]),
  assignment(397, "en.grammar.ability_requests_instructions.can_ability", [sense("translate", "переводить", "verb")], [], ["I can translate."]),
  assignment(398, "en.grammar.ability_requests_instructions.can_ability", [sense("whisper", "шептать", "verb")], [], ["I can whisper."]),
  assignment(399, "en.grammar.ability_requests_instructions.can_ability", [sense("climb", "взбираться", "verb")], [], ["I can climb."]),
  assignment(400, "en.grammar.ability_requests_instructions.can_ability", [], ["en.whistle.verb.01", "en.type.verb.01", "en.translate.verb.01", "en.climb.verb.01"], ["I can whistle.", "I can type.", "I can translate.", "I can climb."]),
  // Lesson 8 / Chapter 2: the lexical target remains a base verb after can't;
  // no new negative pattern is introduced by the contextual material.
  assignment(401, "en.grammar.ability_requests_instructions.cant_ability", [sense("skate", "кататься на коньках", "verb")], [], ["I can't skate."]),
  assignment(402, "en.grammar.ability_requests_instructions.cant_ability", [sense("dive", "нырять", "verb")], [], ["I can't dive."]),
  assignment(403, "en.grammar.ability_requests_instructions.cant_ability", [sense("code", "писать код", "verb")], [], ["I can't code."]),
  assignment(404, "en.grammar.ability_requests_instructions.cant_ability", [sense("knit", "вязать", "verb")], [], ["I can't knit."]),
  assignment(405, "en.grammar.ability_requests_instructions.cant_ability", [sense("steer", "управлять рулём", "verb")], [], ["I can't steer."]),
  assignment(406, "en.grammar.ability_requests_instructions.cant_ability", [sense("spell", "писать по буквам", "verb")], [], ["I can't spell."]),
  assignment(407, "en.grammar.ability_requests_instructions.cant_ability", [sense("calculate", "считать; вычислять", "verb")], [], ["I can't calculate."]),
  assignment(408, "en.grammar.ability_requests_instructions.cant_ability", [], ["en.skate.verb.01", "en.code.verb.01", "en.steer.verb.01", "en.calculate.verb.01"], ["I can't skate.", "I can't code.", "I can't steer.", "I can't calculate."]),
  // Lesson 8 / Chapter 3: requests use Can you + one base verb. The short
  // contexts make the request function visible while grounding a useful
  // service action in each packet.
  assignment(409, "en.grammar.ability_requests_instructions.can_you_request", [sense("lend", "одолжить", "verb")], [], ["Can you lend me a pen?"]),
  assignment(410, "en.grammar.ability_requests_instructions.can_you_request", [sense("pass", "передать", "verb")], [], ["Can you pass me the key?"]),
  assignment(411, "en.grammar.ability_requests_instructions.can_you_request", [sense("explain", "объяснить", "verb")], [], ["Can you explain it?"]),
  assignment(412, "en.grammar.ability_requests_instructions.can_you_request", [sense("hold", "держать", "verb")], [], ["Can you hold this?"]),
  assignment(413, "en.grammar.ability_requests_instructions.can_you_request", [sense("fetch", "принести", "verb")], [], ["Can you fetch it?"]),
  assignment(414, "en.grammar.ability_requests_instructions.can_you_request", [sense("remind", "напомнить", "verb")], [], ["Can you remind me?"]),
  assignment(415, "en.grammar.ability_requests_instructions.can_you_request", [sense("reserve", "забронировать", "verb")], [], ["Can you reserve a table?"]),
  assignment(416, "en.grammar.ability_requests_instructions.can_you_request", [], ["en.lend.verb.01", "en.explain.verb.01", "en.fetch.verb.01", "en.reserve.verb.01"], ["Can you lend me a pen?", "Can you explain it?", "Can you fetch it?", "Can you reserve a table?"]),
  // Lesson 8 / Chapter 4: a direct instruction begins with a base verb. The
  // object remains familiar and each packet introduces one practical action.
  assignment(417, "en.grammar.ability_requests_instructions.positive_imperative", [sense("attach", "прикрепить", "verb")], [], ["Attach it."]),
  assignment(418, "en.grammar.ability_requests_instructions.positive_imperative", [sense("plug", "подключить в розетку", "verb")], [], ["Plug it in."]),
  assignment(419, "en.grammar.ability_requests_instructions.positive_imperative", [sense("charge", "зарядить", "verb")], [], ["Charge it."]),
  assignment(420, "en.grammar.ability_requests_instructions.positive_imperative", [sense("fold", "сложить", "verb")], [], ["Fold it."]),
  assignment(421, "en.grammar.ability_requests_instructions.positive_imperative", [sense("measure", "измерить", "verb")], [], ["Measure it."]),
  assignment(422, "en.grammar.ability_requests_instructions.positive_imperative", [sense("label", "подписать; маркировать", "verb")], [], ["Label it."]),
  assignment(423, "en.grammar.ability_requests_instructions.positive_imperative", [sense("wipe", "вытереть", "verb")], [], ["Wipe it."]),
  assignment(424, "en.grammar.ability_requests_instructions.positive_imperative", [], ["en.attach.verb.01", "en.charge.verb.01", "en.measure.verb.01", "en.wipe.verb.01"], ["Attach it.", "Charge it.", "Measure it.", "Wipe it."]),
  // Lesson 8 / Chapter 5: each safety or etiquette action is framed as a
  // polite negative imperative; the lexical target is a single base verb.
  assignment(425, "en.grammar.ability_requests_instructions.negative_imperative_polite", [sense("rush", "торопиться", "verb")], [], ["Don't rush."]),
  assignment(426, "en.grammar.ability_requests_instructions.negative_imperative_polite", [sense("interrupt", "перебивать", "verb")], [], ["Please don't interrupt."]),
  assignment(427, "en.grammar.ability_requests_instructions.negative_imperative_polite", [sense("spill", "проливать", "verb")], [], ["Don't spill it."]),
  assignment(428, "en.grammar.ability_requests_instructions.negative_imperative_polite", [sense("scratch", "царапать", "verb")], [], ["Don't scratch it."]),
  assignment(429, "en.grammar.ability_requests_instructions.negative_imperative_polite", [sense("bend", "сгибать", "verb")], [], ["Don't bend it."]),
  assignment(430, "en.grammar.ability_requests_instructions.negative_imperative_polite", [sense("panic", "паниковать", "verb")], [], ["Don't panic."]),
  assignment(431, "en.grammar.ability_requests_instructions.negative_imperative_polite", [sense("shove", "толкать грубо", "verb")], [], ["Don't shove."]),
  assignment(432, "en.grammar.ability_requests_instructions.negative_imperative_polite", [], ["en.rush.verb.01", "en.spill.verb.01", "en.bend.verb.01", "en.shove.verb.01"], ["Don't rush.", "Don't spill it.", "Don't bend it.", "Don't shove."]),
  // Lesson 8 / Chapter 6: review lowers support through unfamiliar but useful
  // capability verbs, while the exact modal frame remains I can + base verb.
  assignment(433, "en.grammar.ability_requests_instructions.can_ability", [sense("negotiate", "вести переговоры", "verb")], [], ["I can negotiate."]),
  assignment(434, "en.grammar.ability_requests_instructions.can_ability", [sense("navigate", "ориентироваться; прокладывать путь", "verb")], [], ["I can navigate."]),
  assignment(435, "en.grammar.ability_requests_instructions.can_ability", [sense("assemble", "собирать", "verb")], [], ["I can assemble it."]),
  assignment(436, "en.grammar.ability_requests_instructions.can_ability", [sense("operate", "управлять; работать с устройством", "verb")], [], ["I can operate it."]),
  assignment(437, "en.grammar.ability_requests_instructions.can_ability", [sense("supervise", "контролировать работу", "verb")], [], ["I can supervise."]),
  assignment(438, "en.grammar.ability_requests_instructions.can_ability", [sense("diagnose", "диагностировать", "verb")], [], ["I can diagnose it."]),
  assignment(439, "en.grammar.ability_requests_instructions.can_ability", [sense("adapt", "адаптироваться", "verb")], [], ["I can adapt."]),
  assignment(440, "en.grammar.ability_requests_instructions.can_ability", [], ["en.negotiate.verb.01", "en.assemble.verb.01", "en.supervise.verb.01", "en.adapt.verb.01"], ["I can negotiate.", "I can assemble it.", "I can supervise.", "I can adapt."]),
  // Lesson 8 / Chapter 7: transfer keeps the modal production demand while
  // supplying distinct work-and-study actions rather than recycled prompts.
  assignment(441, "en.grammar.ability_requests_instructions.can_ability", [sense("research", "исследовать", "verb")], [], ["I can research."]),
  assignment(442, "en.grammar.ability_requests_instructions.can_ability", [sense("evaluate", "оценивать", "verb")], [], ["I can evaluate."]),
  assignment(443, "en.grammar.ability_requests_instructions.can_ability", [sense("persuade", "убеждать", "verb")], [], ["I can persuade."]),
  assignment(444, "en.grammar.ability_requests_instructions.can_ability", [sense("manage", "управлять; справляться", "verb")], [], ["I can manage."]),
  assignment(445, "en.grammar.ability_requests_instructions.can_ability", [sense("design", "проектировать", "verb")], [], ["I can design."]),
  assignment(446, "en.grammar.ability_requests_instructions.can_ability", [sense("solve", "решать", "verb")], [], ["I can solve it."]),
  assignment(447, "en.grammar.ability_requests_instructions.can_ability", [sense("improve", "улучшать", "verb")], [], ["I can improve."]),
  assignment(448, "en.grammar.ability_requests_instructions.can_ability", [], ["en.research.verb.01", "en.persuade.verb.01", "en.design.verb.01", "en.improve.verb.01"], ["I can research.", "I can persuade.", "I can design.", "I can improve."]),
  assignment(449, "en.grammar.present_continuous.affirmative", [sense("observe", "наблюдать", "verb")], [], ["I am observing."]),
  // Lesson 9 / Chapter 1: one visible action is grounded in an affirmative
  // present-continuous context. The selected verbs also make the spelling
  // patterns audible before their dedicated chapter.
  assignment(450, "en.grammar.present_continuous.affirmative", [sense("stir", "помешивать", "verb")], [], ["I am stirring."]),
  assignment(451, "en.grammar.present_continuous.affirmative", [sense("pour", "наливать", "verb")], [], ["I am pouring."]),
  assignment(452, "en.grammar.present_continuous.affirmative", [sense("wave", "махать рукой", "verb")], [], ["I am waving."]),
  assignment(453, "en.grammar.present_continuous.affirmative", [sense("knock", "стучать", "verb")], [], ["I am knocking."]),
  assignment(454, "en.grammar.present_continuous.affirmative", [sense("dig", "копать", "verb")], [], ["I am digging."]),
  assignment(455, "en.grammar.present_continuous.affirmative", [sense("clap", "хлопать", "verb")], [], ["I am clapping."]),
  assignment(456, "en.grammar.present_continuous.affirmative", [], ["en.stir.verb.01", "en.wave.verb.01", "en.dig.verb.01", "en.clap.verb.01"], ["I am stirring.", "I am waving.", "I am digging.", "I am clapping."]),
  assignment(457, "en.grammar.present_continuous.negative", [sense("guess", "угадывать", "verb")], [], ["I am not guessing."]),
  // Lesson 9 / Chapter 2: negative current-action contexts retain be + not
  // + verb-ing and introduce only one observable action per packet.
  assignment(458, "en.grammar.present_continuous.negative", [sense("snore", "храпеть", "verb")], [], ["I am not snoring."]),
  assignment(459, "en.grammar.present_continuous.negative", [sense("blink", "моргать", "verb")], [], ["I am not blinking."]),
  assignment(460, "en.grammar.present_continuous.negative", [sense("frown", "хмуриться", "verb")], [], ["I am not frowning."]),
  assignment(461, "en.grammar.present_continuous.negative", [sense("sneeze", "чихать", "verb")], [], ["I am not sneezing."]),
  assignment(462, "en.grammar.present_continuous.negative", [sense("yawn", "зевать", "verb")], [], ["I am not yawning."]),
  assignment(463, "en.grammar.present_continuous.negative", [sense("dream", "видеть сны", "verb")], [], ["I am not dreaming."]),
  assignment(464, "en.grammar.present_continuous.negative", [], ["en.snore.verb.01", "en.frown.verb.01", "en.yawn.verb.01", "en.dream.verb.01"], ["I am not snoring.", "I am not frowning.", "I am not yawning.", "I am not dreaming."]),
  assignment(465, "en.grammar.present_continuous.questions", [sense("inspect", "осматривать; проверять", "verb")], [], ["Are you inspecting it?"]),
  // Lesson 9 / Chapter 3: present-continuous questions make a currently
  // observable action the sole lexical target in each packet.
  assignment(466, "en.grammar.present_continuous.questions", [sense("shiver", "дрожать", "verb")], [], ["Are you shivering?"]),
  assignment(467, "en.grammar.present_continuous.questions", [sense("sweat", "потеть", "verb")], [], ["Are you sweating?"]),
  assignment(468, "en.grammar.present_continuous.questions", [sense("grin", "широко улыбаться", "verb")], [], ["Are you grinning?"]),
  assignment(469, "en.grammar.present_continuous.questions", [sense("sigh", "вздыхать", "verb")], [], ["Are you sighing?"]),
  assignment(470, "en.grammar.present_continuous.questions", [sense("crawl", "ползти", "verb")], [], ["Are you crawling?"]),
  assignment(471, "en.grammar.present_continuous.questions", [sense("march", "маршировать", "verb")], [], ["Are you marching?"]),
  assignment(472, "en.grammar.present_continuous.questions", [], ["en.shiver.verb.01", "en.grin.verb.01", "en.crawl.verb.01", "en.march.verb.01"], ["Are you shivering?", "Are you grinning?", "Are you crawling?", "Are you marching?"]),
  assignment(473, "en.grammar.present_continuous.happening_now", [sense("glow", "светиться", "verb")], [], ["It is glowing."]),
  // Lesson 9 / Chapter 4: current-process meaning is grounded in changing
  // movement or state, with be + verb-ing kept explicit in every example.
  assignment(474, "en.grammar.present_continuous.happening_now", [sense("spin", "крутиться", "verb")], [], ["I am spinning."]),
  assignment(475, "en.grammar.present_continuous.happening_now", [sense("slide", "скользить", "verb")], [], ["I am sliding."]),
  assignment(476, "en.grammar.present_continuous.happening_now", [sense("drift", "дрейфовать; медленно двигаться", "verb")], [], ["I am drifting."]),
  assignment(477, "en.grammar.present_continuous.happening_now", [sense("melt", "таять", "verb")], [], ["The ice is melting."]),
  assignment(478, "en.grammar.present_continuous.happening_now", [sense("queue", "стоять в очереди", "verb")], [], ["I am queuing."]),
  assignment(479, "en.grammar.present_continuous.happening_now", [sense("float", "плавать на поверхности", "verb")], [], ["I am floating."]),
  assignment(480, "en.grammar.present_continuous.happening_now", [], ["en.spin.verb.01", "en.drift.verb.01", "en.queue.verb.01", "en.float.verb.01"], ["I am spinning.", "I am drifting.", "I am queuing.", "I am floating."]),
  assignment(481, "en.grammar.present_continuous.ing_spelling", [sense("submit", "подавать; отправлять", "verb")], [], ["I am submitting it."]),
  // Lesson 9 / Chapter 5: the lexical choices deliberately expose the
  // bounded -ing spelling patterns explained by this operation.
  assignment(482, "en.grammar.present_continuous.ing_spelling", [sense("tie", "завязывать", "verb")], [], ["I am tying."]),
  assignment(483, "en.grammar.present_continuous.ing_spelling", [sense("hop", "прыгать на одной ноге", "verb")], [], ["I am hopping."]),
  assignment(484, "en.grammar.present_continuous.ing_spelling", [sense("rub", "тереть", "verb")], [], ["I am rubbing."]),
  assignment(485, "en.grammar.present_continuous.ing_spelling", [sense("admit", "признавать", "verb")], [], ["I am admitting it."]),
  assignment(486, "en.grammar.present_continuous.ing_spelling", [sense("occur", "происходить", "verb")], [], ["It is occurring."]),
  assignment(487, "en.grammar.present_continuous.ing_spelling", [sense("refer", "ссылаться; направлять", "verb")], [], ["I am referring to it."]),
  assignment(488, "en.grammar.present_continuous.ing_spelling", [], ["en.tie.verb.01", "en.rub.verb.01", "en.occur.verb.01", "en.refer.verb.01"], ["I am tying.", "I am rubbing.", "It is occurring.", "I am referring to it."]),
  // Lesson 9 / Chapter 6: lower-support review keeps the current-action frame
  // but changes the observation and production targets.
  assignment(489, "en.grammar.present_continuous.affirmative", [sense("whirl", "кружиться", "verb")], [], ["I am whirling."]),
  assignment(490, "en.grammar.present_continuous.affirmative", [sense("rehearse", "репетировать", "verb")], [], ["I am rehearsing."]),
  assignment(491, "en.grammar.present_continuous.affirmative", [sense("scan", "сканировать; быстро просматривать", "verb")], [], ["I am scanning it."]),
  assignment(492, "en.grammar.present_continuous.affirmative", [sense("glance", "бросать взгляд", "verb")], [], ["I am glancing at it."]),
  assignment(493, "en.grammar.present_continuous.affirmative", [sense("tremble", "дрожать", "verb")], [], ["I am trembling."]),
  assignment(494, "en.grammar.present_continuous.affirmative", [sense("wander", "бродить", "verb")], [], ["I am wandering."]),
  assignment(495, "en.grammar.present_continuous.affirmative", [sense("hesitate", "колебаться", "verb")], [], ["I am hesitating."]),
  assignment(496, "en.grammar.present_continuous.affirmative", [], ["en.whirl.verb.01", "en.scan.verb.01", "en.tremble.verb.01", "en.hesitate.verb.01"], ["I am whirling.", "I am scanning it.", "I am trembling.", "I am hesitating."]),
  // Lesson 9 / Chapter 7: transfer calls for distinct observable interaction
  // verbs while maintaining the familiar current-action form.
  assignment(497, "en.grammar.present_continuous.affirmative", [sense("murmur", "бормотать тихо", "verb")], [], ["I am murmuring."]),
  assignment(498, "en.grammar.present_continuous.affirmative", [sense("stare", "пристально смотреть", "verb")], [], ["I am staring."]),
  assignment(499, "en.grammar.present_continuous.affirmative", [sense("peer", "вглядываться", "verb")], [], ["I am peering."]),
  assignment(500, "en.grammar.present_continuous.affirmative", [sense("gaze", "смотреть пристально", "verb")], [], ["I am gazing."]),
  assignment(501, "en.grammar.present_continuous.affirmative", [sense("gesture", "жестикулировать", "verb")], [], ["I am gesturing."]),
  assignment(502, "en.grammar.present_continuous.affirmative", [sense("mutter", "бормотать", "verb")], [], ["I am muttering."]),
  assignment(503, "en.grammar.present_continuous.affirmative", [sense("nod", "кивать", "verb")], [], ["I am nodding."]),
  assignment(504, "en.grammar.present_continuous.affirmative", [], ["en.murmur.verb.01", "en.peer.verb.01", "en.gesture.verb.01", "en.nod.verb.01"], ["I am murmuring.", "I am peering.", "I am gesturing.", "I am nodding."]),
  // Lesson 10 / Chapter 1: each lexical action appears once as a routine and
  // once as a happening-now contrast, making the grammar decision visible.
  assignment(505, "en.grammar.present_simple_vs_continuous.habit_vs_now", [sense("row", "грести", "verb")], [], ["I row every week.", "I am rowing now."]),
  assignment(506, "en.grammar.present_simple_vs_continuous.habit_vs_now", [sense("fish", "ловить рыбу", "verb")], [], ["I fish every week.", "I am fishing now."]),
  assignment(507, "en.grammar.present_simple_vs_continuous.habit_vs_now", [sense("collect", "собирать; коллекционировать", "verb")], [], ["I collect stamps.", "I am collecting stamps now."]),
  assignment(508, "en.grammar.present_simple_vs_continuous.habit_vs_now", [sense("craft", "мастерить", "verb")], [], ["I craft every week.", "I am crafting now."]),
  assignment(509, "en.grammar.present_simple_vs_continuous.habit_vs_now", [sense("weave", "плести; ткать", "verb")], [], ["I weave every week.", "I am weaving now."]),
  assignment(510, "en.grammar.present_simple_vs_continuous.habit_vs_now", [sense("brew", "заваривать", "verb")], [], ["I brew tea every day.", "I am brewing tea now."]),
  assignment(511, "en.grammar.present_simple_vs_continuous.habit_vs_now", [sense("carve", "вырезать", "verb")], [], ["I carve every week.", "I am carving now."]),
  assignment(512, "en.grammar.present_simple_vs_continuous.habit_vs_now", [], ["en.row.verb.01", "en.collect.verb.01", "en.weave.verb.01", "en.carve.verb.01"], ["I row every week.", "I am collecting stamps now.", "I weave every week.", "I am carving now."]),
  // Lesson 10 / Chapter 2: a familiar work-role noun appears in a stable
  // versus temporary work-context contrast, keeping the grammar decision
  // visible rather than treating the noun as an isolated list item.
  assignment(513, "en.grammar.present_simple_vs_continuous.stable_vs_temporary", [sense("chef", "повар", "noun")], [], ["She works as a chef.", "She is working as a chef this month."]),
  assignment(514, "en.grammar.present_simple_vs_continuous.stable_vs_temporary", [sense("guide", "гид", "noun")], [], ["She works as a guide.", "She is working as a guide this month."]),
  assignment(515, "en.grammar.present_simple_vs_continuous.stable_vs_temporary", [sense("editor", "редактор", "noun")], [], ["She works as an editor.", "She is working as an editor this month."]),
  assignment(516, "en.grammar.present_simple_vs_continuous.stable_vs_temporary", [sense("cashier", "кассир", "noun")], [], ["She works as a cashier.", "She is working as a cashier this month."]),
  assignment(517, "en.grammar.present_simple_vs_continuous.stable_vs_temporary", [sense("nurse", "медсестра; медбрат", "noun")], [], ["She works as a nurse.", "She is working as a nurse this month."]),
  assignment(518, "en.grammar.present_simple_vs_continuous.stable_vs_temporary", [sense("pilot", "пилот", "noun")], [], ["She works as a pilot.", "She is working as a pilot this month."]),
  assignment(519, "en.grammar.present_simple_vs_continuous.stable_vs_temporary", [sense("clerk", "служащий; клерк", "noun")], [], ["She works as a clerk.", "She is working as a clerk this month."]),
  assignment(520, "en.grammar.present_simple_vs_continuous.stable_vs_temporary", [], ["en.chef.noun.01", "en.editor.noun.01", "en.nurse.noun.01", "en.clerk.noun.01"], ["She works as a chef.", "She is working as an editor this month.", "She works as a nurse.", "She is working as a clerk this month."]),
  // Lesson 10 / Chapter 3: each lexical target is a stative verb grounded in
  // ordinary present simple, making an inappropriate continuous form visible
  // as the diagnostic contrast rather than another target to memorize.
  assignment(521, "en.grammar.present_simple_vs_continuous.stative_verbs", [sense("admire", "восхищаться", "verb")], [], ["I admire it."]),
  assignment(522, "en.grammar.present_simple_vs_continuous.stative_verbs", [sense("deserve", "заслуживать", "verb")], [], ["I deserve it."]),
  assignment(523, "en.grammar.present_simple_vs_continuous.stative_verbs", [sense("doubt", "сомневаться", "verb")], [], ["I doubt it."]),
  assignment(524, "en.grammar.present_simple_vs_continuous.stative_verbs", [sense("expect", "ожидать", "verb")], [], ["I expect it."]),
  assignment(525, "en.grammar.present_simple_vs_continuous.stative_verbs", [sense("imagine", "представлять", "verb")], [], ["I imagine it."]),
  assignment(526, "en.grammar.present_simple_vs_continuous.stative_verbs", [sense("recognize", "узнавать; распознавать", "verb")], [], ["I recognize it."]),
  assignment(527, "en.grammar.present_simple_vs_continuous.stative_verbs", [sense("trust", "доверять", "verb")], [], ["I trust you."]),
  assignment(528, "en.grammar.present_simple_vs_continuous.stative_verbs", [], ["en.admire.verb.01", "en.doubt.verb.01", "en.imagine.verb.01", "en.trust.verb.01"], ["I admire it.", "I doubt it.", "I imagine it.", "I trust you."]),
  // Lesson 10 / Chapter 4: the lexical target is a time marker or time noun;
  // paired examples make the simple-versus-now interpretation explicit.
  assignment(529, "en.grammar.present_simple_vs_continuous.time_markers", [sense("dawn", "рассвет", "noun")], [], ["I walk at dawn.", "I am walking now."]),
  assignment(530, "en.grammar.present_simple_vs_continuous.time_markers", [sense("noon", "полдень", "noun")], [], ["I eat at noon.", "I am eating now."]),
  assignment(531, "en.grammar.present_simple_vs_continuous.time_markers", [sense("sunrise", "восход солнца", "noun")], [], ["I run at sunrise.", "I am running now."]),
  assignment(532, "en.grammar.present_simple_vs_continuous.time_markers", [sense("sunset", "закат", "noun")], [], ["I rest at sunset.", "I am resting now."]),
  assignment(533, "en.grammar.present_simple_vs_continuous.time_markers", [sense("midnight", "полночь", "noun")], [], ["I sleep at midnight.", "I am sleeping now."]),
  assignment(534, "en.grammar.present_simple_vs_continuous.time_markers", [sense("weekday", "будний день", "noun")], [], ["I work every weekday.", "I am working now."]),
  assignment(535, "en.grammar.present_simple_vs_continuous.time_markers", [sense("season", "время года; сезон", "noun")], [], ["I travel every season.", "I am travelling now."]),
  assignment(536, "en.grammar.present_simple_vs_continuous.time_markers", [], ["en.dawn.noun.01", "en.sunrise.noun.01", "en.midnight.noun.01", "en.season.noun.01"], ["I walk at dawn.", "I run at sunrise.", "I sleep at midnight.", "I travel every season."]),
  // Lesson 10 / Chapter 5: review contexts retain an explicit normal-versus-
  // current contrast while a single useful time or agenda noun is introduced.
  assignment(537, "en.grammar.present_simple_vs_continuous.time_markers", [sense("festival", "фестиваль", "noun")], [], ["The festival happens every year.", "The festival is happening now."]),
  assignment(538, "en.grammar.present_simple_vs_continuous.time_markers", [sense("ceremony", "церемония", "noun")], [], ["The ceremony happens every year.", "The ceremony is happening now."]),
  assignment(539, "en.grammar.present_simple_vs_continuous.time_markers", [sense("anniversary", "годовщина", "noun")], [], ["The anniversary happens every year.", "The anniversary is happening now."]),
  assignment(540, "en.grammar.present_simple_vs_continuous.time_markers", [sense("deadline", "крайний срок", "noun")], [], ["The deadline comes every month.", "The deadline is coming now."]),
  assignment(541, "en.grammar.present_simple_vs_continuous.time_markers", [sense("semester", "семестр", "noun")], [], ["The semester starts every year.", "The semester is starting now."]),
  assignment(542, "en.grammar.present_simple_vs_continuous.time_markers", [sense("quarter", "квартал; четверть года", "noun")], [], ["The quarter starts every year.", "The quarter is starting now."]),
  assignment(543, "en.grammar.present_simple_vs_continuous.time_markers", [sense("session", "сессия; занятие", "noun")], [], ["The session starts every day.", "The session is starting now."]),
  assignment(544, "en.grammar.present_simple_vs_continuous.time_markers", [], ["en.festival.noun.01", "en.anniversary.noun.01", "en.semester.noun.01", "en.session.noun.01"], ["The festival happens every year.", "The anniversary is happening now.", "The semester starts every year.", "The session is starting now."]),
  // Lesson 10 / Chapter 6: review provides a new event-planning noun in a
  // recurring-versus-current frame, preserving the studied tense contrast.
  assignment(545, "en.grammar.present_simple_vs_continuous.time_markers", [sense("conference", "конференция", "noun")], [], ["The conference happens every year.", "The conference is happening now."]),
  assignment(546, "en.grammar.present_simple_vs_continuous.time_markers", [sense("workshop", "практический семинар", "noun")], [], ["The workshop happens every month.", "The workshop is happening now."]),
  assignment(547, "en.grammar.present_simple_vs_continuous.time_markers", [sense("briefing", "инструктаж; брифинг", "noun")], [], ["The briefing happens every week.", "The briefing is happening now."]),
  assignment(548, "en.grammar.present_simple_vs_continuous.time_markers", [sense("agenda", "повестка; план", "noun")], [], ["The agenda changes every week.", "The agenda is changing now."]),
  assignment(549, "en.grammar.present_simple_vs_continuous.time_markers", [sense("milestone", "важный этап", "noun")], [], ["The milestone comes every year.", "The milestone is coming now."]),
  assignment(550, "en.grammar.present_simple_vs_continuous.time_markers", [sense("launch", "запуск", "noun")], [], ["The launch happens every year.", "The launch is happening now."]),
  assignment(551, "en.grammar.present_simple_vs_continuous.time_markers", [sense("release", "выпуск; релиз", "noun")], [], ["The release happens every month.", "The release is happening now."]),
  assignment(552, "en.grammar.present_simple_vs_continuous.time_markers", [], ["en.conference.noun.01", "en.briefing.noun.01", "en.milestone.noun.01", "en.release.noun.01"], ["The conference happens every year.", "The briefing is happening now.", "The milestone comes every year.", "The release is happening now."]),
  // Lesson 10 / Chapter 7: transfer changes the agenda vocabulary while
  // retaining the same observable contrast and no repeated target noun.
  assignment(553, "en.grammar.present_simple_vs_continuous.time_markers", [sense("forecast", "прогноз", "noun")], [], ["The forecast changes every day.", "The forecast is changing now."]),
  assignment(554, "en.grammar.present_simple_vs_continuous.time_markers", [sense("period", "период", "noun")], [], ["The period starts every year.", "The period is starting now."]),
  assignment(555, "en.grammar.present_simple_vs_continuous.time_markers", [sense("term", "срок; учебный семестр", "noun")], [], ["The term starts every year.", "The term is starting now."]),
  assignment(556, "en.grammar.present_simple_vs_continuous.time_markers", [sense("phase", "этап; фаза", "noun")], [], ["The phase changes every month.", "The phase is changing now."]),
  assignment(557, "en.grammar.present_simple_vs_continuous.time_markers", [sense("occasion", "случай; повод", "noun")], [], ["The occasion happens every year.", "The occasion is happening now."]),
  assignment(558, "en.grammar.present_simple_vs_continuous.time_markers", [sense("appointment", "назначенная встреча", "noun")], [], ["The appointment happens every week.", "The appointment is happening now."]),
  assignment(559, "en.grammar.present_simple_vs_continuous.time_markers", [sense("reminder", "напоминание", "noun")], [], ["The reminder comes every day.", "The reminder is coming now."]),
  assignment(560, "en.grammar.present_simple_vs_continuous.time_markers", [], ["en.forecast.noun.01", "en.term.noun.01", "en.occasion.noun.01", "en.reminder.noun.01"], ["The forecast changes every day.", "The term is starting now.", "The occasion happens every year.", "The reminder is coming now."]),
  // Lesson 11 / Chapter 1: past-be states introduce one adjective at a time
  // while the past anchor is carried solely by was/were.
  assignment(561, "en.grammar.past_be_existence.was_were", [sense("grateful", "благодарный", "adjective")], [], ["I was grateful."]),
  assignment(562, "en.grammar.past_be_existence.was_were", [sense("jealous", "ревнивый; завистливый", "adjective")], [], ["I was jealous."]),
  assignment(563, "en.grammar.past_be_existence.was_were", [sense("relieved", "испытавший облегчение", "adjective")], [], ["I was relieved."]),
  assignment(564, "en.grammar.past_be_existence.was_were", [sense("shocked", "потрясённый", "adjective")], [], ["I was shocked."]),
  assignment(565, "en.grammar.past_be_existence.was_were", [sense("upset", "расстроенный", "adjective")], [], ["I was upset."]),
  assignment(566, "en.grammar.past_be_existence.was_were", [sense("thrilled", "в восторге", "adjective")], [], ["I was thrilled."]),
  assignment(567, "en.grammar.past_be_existence.was_were", [sense("embarrassed", "смущённый", "adjective")], [], ["I was embarrassed."]),
  assignment(568, "en.grammar.past_be_existence.was_were", [], ["en.grateful.adjective.01", "en.relieved.adjective.01", "en.upset.adjective.01", "en.embarrassed.adjective.01"], ["I was grateful.", "I was relieved.", "I was upset.", "I was embarrassed."]),
  // Lesson 11 / Chapter 2: each past-be question asks about one new state;
  // the lexicon does not introduce a past-action form ahead of its chapter.
  assignment(569, "en.grammar.past_be_existence.questions_negatives", [sense("anxious", "тревожный", "adjective")], [], ["Were you anxious?"]),
  assignment(570, "en.grammar.past_be_existence.questions_negatives", [sense("dizzy", "испытывающий головокружение", "adjective")], [], ["Were you dizzy?"]),
  assignment(571, "en.grammar.past_be_existence.questions_negatives", [sense("suspicious", "подозрительный", "adjective")], [], ["Were you suspicious?"]),
  assignment(572, "en.grammar.past_be_existence.questions_negatives", [sense("cautious", "осторожный", "adjective")], [], ["Were you cautious?"]),
  assignment(573, "en.grammar.past_be_existence.questions_negatives", [sense("restless", "неугомонный; беспокойный", "adjective")], [], ["Were you restless?"]),
  assignment(574, "en.grammar.past_be_existence.questions_negatives", [sense("homesick", "скучающий по дому", "adjective")], [], ["Were you homesick?"]),
  assignment(575, "en.grammar.past_be_existence.questions_negatives", [sense("uneasy", "неспокойный", "adjective")], [], ["Were you uneasy?"]),
  assignment(576, "en.grammar.past_be_existence.questions_negatives", [], ["en.anxious.adjective.01", "en.suspicious.adjective.01", "en.restless.adjective.01", "en.uneasy.adjective.01"], ["Were you anxious?", "Were you suspicious?", "Were you restless?", "Were you uneasy?"]),
  // Lesson 11 / Chapter 3: each concrete trace or condition is introduced in
  // a single there-was statement, isolating the past-existence grammar.
  assignment(577, "en.grammar.past_be_existence.there_was_were", [sense("leak", "протечка", "noun")], [], ["There was a leak."]),
  assignment(578, "en.grammar.past_be_existence.there_was_were", [sense("crack", "трещина", "noun")], [], ["There was a crack."]),
  assignment(579, "en.grammar.past_be_existence.there_was_were", [sense("crowd", "толпа", "noun")], [], ["There was a crowd."]),
  assignment(580, "en.grammar.past_be_existence.there_was_were", [sense("puddle", "лужа", "noun")], [], ["There was a puddle."]),
  assignment(581, "en.grammar.past_be_existence.there_was_were", [sense("shadow", "тень", "noun")], [], ["There was a shadow."]),
  assignment(582, "en.grammar.past_be_existence.there_was_were", [sense("footprint", "след ноги", "noun")], [], ["There was a footprint."]),
  assignment(583, "en.grammar.past_be_existence.there_was_were", [sense("signal", "сигнал", "noun")], [], ["There was a signal."]),
  assignment(584, "en.grammar.past_be_existence.there_was_were", [], ["en.leak.noun.01", "en.crowd.noun.01", "en.shadow.noun.01", "en.signal.noun.01"], ["There was a leak.", "There was a crowd.", "There was a shadow.", "There was a signal."]),
  // Lesson 11 / Chapter 4: places are introduced one at a time in a completed
  // past-location frame, so the new noun never competes with a new verb form.
  assignment(585, "en.grammar.past_be_existence.past_state_location", [sense("suburb", "пригород", "noun")], [], ["We were in the suburb yesterday."]),
  assignment(586, "en.grammar.past_be_existence.past_state_location", [sense("harbor", "гавань; порт", "noun")], [], ["We were at the harbor yesterday."]),
  assignment(587, "en.grammar.past_be_existence.past_state_location", [sense("village", "деревня; посёлок", "noun")], [], ["We were in the village yesterday."]),
  assignment(588, "en.grammar.past_be_existence.past_state_location", [sense("basement", "подвал", "noun")], [], ["We were in the basement yesterday."]),
  assignment(589, "en.grammar.past_be_existence.past_state_location", [sense("balcony", "балкон", "noun")], [], ["We were on the balcony yesterday."]),
  assignment(590, "en.grammar.past_be_existence.past_state_location", [sense("courtyard", "внутренний двор", "noun")], [], ["We were in the courtyard yesterday."]),
  assignment(591, "en.grammar.past_be_existence.past_state_location", [sense("hallway", "коридор", "noun")], [], ["We were in the hallway yesterday."]),
  assignment(592, "en.grammar.past_be_existence.past_state_location", [], ["en.suburb.noun.01", "en.village.noun.01", "en.balcony.noun.01", "en.hallway.noun.01"], ["We were in the suburb yesterday.", "We were in the village yesterday.", "We were on the balcony yesterday.", "We were in the hallway yesterday."]),
  // Lesson 11 / Chapter 5: distinct outdoor locations keep the completed-time
  // cue constant while each packet carries only one new lexical target.
  assignment(593, "en.grammar.past_be_existence.past_state_location", [sense("lighthouse", "маяк", "noun")], [], ["We were at the lighthouse yesterday."]),
  assignment(594, "en.grammar.past_be_existence.past_state_location", [sense("meadow", "луг", "noun")], [], ["We were in the meadow yesterday."]),
  assignment(595, "en.grammar.past_be_existence.past_state_location", [sense("shoreline", "береговая линия", "noun")], [], ["We were on the shoreline yesterday."]),
  assignment(596, "en.grammar.past_be_existence.past_state_location", [sense("quarry", "карьер", "noun")], [], ["We were at the quarry yesterday."]),
  assignment(597, "en.grammar.past_be_existence.past_state_location", [sense("orchard", "фруктовый сад", "noun")], [], ["We were in the orchard yesterday."]),
  assignment(598, "en.grammar.past_be_existence.past_state_location", [sense("waterfall", "водопад", "noun")], [], ["We were at the waterfall yesterday."]),
  assignment(599, "en.grammar.past_be_existence.past_state_location", [sense("canyon", "каньон", "noun")], [], ["We were in the canyon yesterday."]),
  assignment(600, "en.grammar.past_be_existence.past_state_location", [], ["en.lighthouse.noun.01", "en.shoreline.noun.01", "en.orchard.noun.01", "en.canyon.noun.01"], ["We were at the lighthouse yesterday.", "We were on the shoreline yesterday.", "We were in the orchard yesterday.", "We were in the canyon yesterday."]),
  // Lesson 11 / Chapter 6: domestic locations provide a changed context for
  // past-state practice without introducing a second target in any packet.
  assignment(601, "en.grammar.past_be_existence.past_state_location", [sense("attic", "чердак", "noun")], [], ["We were in the attic yesterday."]),
  assignment(602, "en.grammar.past_be_existence.past_state_location", [sense("pantry", "кладовая", "noun")], [], ["We were in the pantry yesterday."]),
  assignment(603, "en.grammar.past_be_existence.past_state_location", [sense("porch", "крыльцо; веранда", "noun")], [], ["We were on the porch yesterday."]),
  assignment(604, "en.grammar.past_be_existence.past_state_location", [sense("cabin", "домик; хижина", "noun")], [], ["We were in the cabin yesterday."]),
  assignment(605, "en.grammar.past_be_existence.past_state_location", [sense("wardrobe", "шкаф для одежды", "noun")], [], ["We were by the wardrobe yesterday."]),
  assignment(606, "en.grammar.past_be_existence.past_state_location", [sense("fireplace", "камин", "noun")], [], ["We were by the fireplace yesterday."]),
  assignment(607, "en.grammar.past_be_existence.past_state_location", [sense("staircase", "лестница", "noun")], [], ["We were on the staircase yesterday."]),
  assignment(608, "en.grammar.past_be_existence.past_state_location", [], ["en.attic.noun.01", "en.porch.noun.01", "en.wardrobe.noun.01", "en.staircase.noun.01"], ["We were in the attic yesterday.", "We were on the porch yesterday.", "We were by the wardrobe yesterday.", "We were on the staircase yesterday."]),
  // Lesson 11 / Chapter 7: transfer broadens the location set while retaining
  // a single finished-time past-be choice for every new sense.
  assignment(609, "en.grammar.past_be_existence.past_state_location", [sense("observatory", "обсерватория", "noun")], [], ["We were at the observatory yesterday."]),
  assignment(610, "en.grammar.past_be_existence.past_state_location", [sense("campus", "университетский кампус", "noun")], [], ["We were on the campus yesterday."]),
  assignment(611, "en.grammar.past_be_existence.past_state_location", [sense("theater", "театр", "noun")], [], ["We were at the theater yesterday."]),
  assignment(612, "en.grammar.past_be_existence.past_state_location", [sense("laboratory", "лаборатория", "noun")], [], ["We were in the laboratory yesterday."]),
  assignment(613, "en.grammar.past_be_existence.past_state_location", [sense("clinic", "клиника", "noun")], [], ["We were at the clinic yesterday."]),
  assignment(614, "en.grammar.past_be_existence.past_state_location", [sense("gallery", "галерея", "noun")], [], ["We were in the gallery yesterday."]),
  assignment(615, "en.grammar.past_be_existence.past_state_location", [sense("courthouse", "здание суда", "noun")], [], ["We were at the courthouse yesterday."]),
  assignment(616, "en.grammar.past_be_existence.past_state_location", [], ["en.observatory.noun.01", "en.theater.noun.01", "en.clinic.noun.01", "en.courthouse.noun.01"], ["We were at the observatory yesterday.", "We were at the theater yesterday.", "We were at the clinic yesterday.", "We were at the courthouse yesterday."]),
  // Lesson 12 / Chapter 1: each regular past form names one completed action;
  // the changed objects prevent a rote repeated task while preserving -ed.
  assignment(617, "en.grammar.past_simple_affirmative.regular_ed", [sense("arrive", "прибывать", "verb")], [], ["I arrived early."]),
  assignment(618, "en.grammar.past_simple_affirmative.regular_ed", [sense("follow", "следовать", "verb")], [], ["I followed the map."]),
  assignment(619, "en.grammar.past_simple_affirmative.regular_ed", [sense("invite", "приглашать", "verb")], [], ["I invited my friend."]),
  assignment(620, "en.grammar.past_simple_affirmative.regular_ed", [sense("join", "присоединяться", "verb")], [], ["I joined the group."]),
  assignment(621, "en.grammar.past_simple_affirmative.regular_ed", [sense("miss", "пропускать", "verb")], [], ["I missed the bus."]),
  assignment(622, "en.grammar.past_simple_affirmative.regular_ed", [sense("move", "переезжать; двигать", "verb")], [], ["I moved the chair."]),
  assignment(623, "en.grammar.past_simple_affirmative.regular_ed", [sense("return", "возвращаться", "verb")], [], ["I returned home."]),
  assignment(624, "en.grammar.past_simple_affirmative.regular_ed", [], ["en.arrive.verb.01", "en.invite.verb.01", "en.miss.verb.01", "en.return.verb.01"], ["I arrived early.", "I invited my friend.", "I missed the bus.", "I returned home."]),
  // Lesson 12 / Chapter 2: each frequent irregular verb is presented as one
  // whole past form in a distinct finished event, never as letter assembly.
  assignment(625, "en.grammar.past_simple_affirmative.irregular_whole_words", [sense("choose", "выбирать", "verb")], [], ["I chose the blue one."]),
  assignment(626, "en.grammar.past_simple_affirmative.irregular_whole_words", [sense("grow", "расти", "verb")], [], ["The plant grew fast."]),
  assignment(627, "en.grammar.past_simple_affirmative.irregular_whole_words", [sense("hide", "прятать", "verb")], [], ["I hid the key."]),
  assignment(628, "en.grammar.past_simple_affirmative.irregular_whole_words", [sense("rise", "подниматься", "verb")], [], ["The sun rose early."]),
  assignment(629, "en.grammar.past_simple_affirmative.irregular_whole_words", [sense("shake", "трясти", "verb")], [], ["I shook the bottle."]),
  assignment(630, "en.grammar.past_simple_affirmative.irregular_whole_words", [sense("steal", "красть", "verb")], [], ["Someone stole my bike."]),
  assignment(631, "en.grammar.past_simple_affirmative.irregular_whole_words", [sense("throw", "бросать", "verb")], [], ["I threw the ball."]),
  assignment(632, "en.grammar.past_simple_affirmative.irregular_whole_words", [], ["en.choose.verb.01", "en.hide.verb.01", "en.shake.verb.01", "en.throw.verb.01"], ["I chose the blue one.", "I hid the key.", "I shook the bottle.", "I threw the ball."]),
  // Lesson 12 / Chapter 3: one finished event per packet gives past simple a
  // concrete result while the target verb changes each time.
  assignment(633, "en.grammar.past_simple_affirmative.finished_event", [sense("announce", "объявлять", "verb")], [], ["They announced the result."]),
  assignment(634, "en.grammar.past_simple_affirmative.finished_event", [sense("celebrate", "праздновать", "verb")], [], ["We celebrated the win."]),
  assignment(635, "en.grammar.past_simple_affirmative.finished_event", [sense("compete", "соревноваться", "verb")], [], ["I competed yesterday."]),
  assignment(636, "en.grammar.past_simple_affirmative.finished_event", [sense("notice", "замечать", "verb")], [], ["I noticed the answer."]),
  assignment(637, "en.grammar.past_simple_affirmative.finished_event", [sense("escape", "сбегать; спасаться", "verb")], [], ["The bird escaped." ]),
  assignment(638, "en.grammar.past_simple_affirmative.finished_event", [sense("fail", "не удаваться", "verb")], [], ["The plan failed."]),
  assignment(639, "en.grammar.past_simple_affirmative.finished_event", [sense("graduate", "оканчивать учебное заведение", "verb")], [], ["She graduated last year."]),
  assignment(640, "en.grammar.past_simple_affirmative.finished_event", [], ["en.announce.verb.01", "en.compete.verb.01", "en.escape.verb.01", "en.graduate.verb.01"], ["They announced the result.", "I competed yesterday.", "The bird escaped.", "She graduated last year."]),
  // Lesson 12 / Chapter 4: distinct regular verbs make the written -ed form
  // stable while the listening/pronunciation activity can vary its sound cue.
  assignment(641, "en.grammar.past_simple_affirmative.ed_pronunciation", [sense("wash", "мыть", "verb")], [], ["I washed the cup."]),
  assignment(642, "en.grammar.past_simple_affirmative.ed_pronunciation", [sense("finish", "заканчивать", "verb")], [], ["I finished the task."]),
  assignment(643, "en.grammar.past_simple_affirmative.ed_pronunciation", [sense("help", "помогать", "verb")], [], ["I helped my friend."]),
  assignment(644, "en.grammar.past_simple_affirmative.ed_pronunciation", [sense("change", "менять", "verb")], [], ["I changed the plan."]),
  assignment(645, "en.grammar.past_simple_affirmative.ed_pronunciation", [sense("love", "любить", "verb")], [], ["I loved the film."]),
  assignment(646, "en.grammar.past_simple_affirmative.ed_pronunciation", [sense("kick", "пинать", "verb")], [], ["I kicked the ball."]),
  assignment(647, "en.grammar.past_simple_affirmative.ed_pronunciation", [sense("plant", "сажать", "verb")], [], ["I planted a tree."]),
  assignment(648, "en.grammar.past_simple_affirmative.ed_pronunciation", [], ["en.wash.verb.01", "en.help.verb.01", "en.love.verb.01", "en.plant.verb.01"], ["I washed the cup.", "I helped my friend.", "I loved the film.", "I planted a tree."]),
  // Lesson 12 / Chapter 5: review changes the event domain and introduces one
  // event noun per packet without adding a second grammatical target.
  assignment(649, "en.grammar.past_simple_affirmative.finished_event", [sense("exhibit", "выставка", "noun")], [], ["The exhibit opened yesterday."]),
  assignment(650, "en.grammar.past_simple_affirmative.finished_event", [sense("auction", "аукцион", "noun")], [], ["The auction ended early."]),
  assignment(651, "en.grammar.past_simple_affirmative.finished_event", [sense("reunion", "встреча выпускников", "noun")], [], ["The reunion started late."]),
  assignment(652, "en.grammar.past_simple_affirmative.finished_event", [sense("parade", "парад", "noun")], [], ["The parade passed here."]),
  assignment(653, "en.grammar.past_simple_affirmative.finished_event", [sense("evacuation", "эвакуация", "noun")], [], ["The evacuation ended safely."]),
  assignment(654, "en.grammar.past_simple_affirmative.finished_event", [sense("outage", "отключение", "noun")], [], ["The outage lasted an hour."]),
  assignment(655, "en.grammar.past_simple_affirmative.finished_event", [sense("detour", "объезд", "noun")], [], ["The detour added time."]),
  assignment(656, "en.grammar.past_simple_affirmative.finished_event", [], ["en.exhibit.noun.01", "en.reunion.noun.01", "en.evacuation.noun.01", "en.detour.noun.01"], ["The exhibit opened yesterday.", "The reunion started late.", "The evacuation ended safely.", "The detour added time."]),
  // Lesson 12 / Chapter 6: practical disruptions make a fresh completed-event
  // context while keeping one lexical target per learner-facing packet.
  assignment(657, "en.grammar.past_simple_affirmative.finished_event", [sense("collision", "столкновение", "noun")], [], ["The collision blocked traffic."]),
  assignment(658, "en.grammar.past_simple_affirmative.finished_event", [sense("flood", "наводнение", "noun")], [], ["The flood closed the road."]),
  assignment(659, "en.grammar.past_simple_affirmative.finished_event", [sense("shortage", "нехватка", "noun")], [], ["The shortage affected shops."]),
  assignment(660, "en.grammar.past_simple_affirmative.finished_event", [sense("strike", "забастовка", "noun")], [], ["The strike stopped trains."]),
  assignment(661, "en.grammar.past_simple_affirmative.finished_event", [sense("delay", "задержка", "noun")], [], ["The delay changed plans."]),
  assignment(662, "en.grammar.past_simple_affirmative.finished_event", [sense("rescue", "спасательная операция", "noun")], [], ["The rescue saved them."]),
  assignment(663, "en.grammar.past_simple_affirmative.finished_event", [sense("warning", "предупреждение", "noun")], [], ["The warning arrived early."]),
  assignment(664, "en.grammar.past_simple_affirmative.finished_event", [], ["en.collision.noun.01", "en.shortage.noun.01", "en.delay.noun.01", "en.warning.noun.01"], ["The collision blocked traffic.", "The shortage affected shops.", "The delay changed plans.", "The warning arrived early."]),
  // Lesson 12 / Chapter 7: transfer uses community events and outcomes with a
  // single completed-event decision and no repeated lexical target.
  assignment(665, "en.grammar.past_simple_affirmative.finished_event", [sense("donation", "пожертвование", "noun")], [], ["The donation helped families."]),
  assignment(666, "en.grammar.past_simple_affirmative.finished_event", [sense("petition", "петиция", "noun")], [], ["The petition reached council."]),
  assignment(667, "en.grammar.past_simple_affirmative.finished_event", [sense("survey", "опрос", "noun")], [], ["The survey revealed a need."]),
  assignment(668, "en.grammar.past_simple_affirmative.finished_event", [sense("campaign", "кампания", "noun")], [], ["The campaign raised funds."]),
  assignment(669, "en.grammar.past_simple_affirmative.finished_event", [sense("grant", "грант", "noun")], [], ["The grant supported the project."]),
  assignment(670, "en.grammar.past_simple_affirmative.finished_event", [sense("shelter", "приют", "noun")], [], ["The shelter welcomed families."]),
  assignment(671, "en.grammar.past_simple_affirmative.finished_event", [sense("volunteer", "волонтёр", "noun")], [], ["The volunteer helped yesterday."]),
  assignment(672, "en.grammar.past_simple_affirmative.finished_event", [], ["en.donation.noun.01", "en.survey.noun.01", "en.grant.noun.01", "en.volunteer.noun.01"], ["The donation helped families.", "The survey revealed a need.", "The grant supported the project.", "The volunteer helped yesterday."]),
  // Lesson 13 / Chapter 1: did carries the time signal, so each question
  // grounds one new verb in its uninflected base form.
  assignment(673, "en.grammar.past_simple_questions_negatives.did_questions", [sense("borrow", "брать взаймы", "verb")], [], ["Did you borrow the book?"]),
  assignment(674, "en.grammar.past_simple_questions_negatives.did_questions", [sense("compare", "сравнивать", "verb")], [], ["Did you compare the prices?"]),
  assignment(675, "en.grammar.past_simple_questions_negatives.did_questions", [sense("consider", "рассматривать; обдумывать", "verb")], [], ["Did you consider the offer?"]),
  assignment(676, "en.grammar.past_simple_questions_negatives.did_questions", [sense("depend", "зависеть", "verb")], [], ["Did it depend on time?"]),
  assignment(677, "en.grammar.past_simple_questions_negatives.did_questions", [sense("describe", "описывать", "verb")], [], ["Did you describe the place?"]),
  assignment(678, "en.grammar.past_simple_questions_negatives.did_questions", [sense("discuss", "обсуждать", "verb")], [], ["Did you discuss the plan?"]),
  assignment(679, "en.grammar.past_simple_questions_negatives.did_questions", [sense("examine", "осматривать; изучать", "verb")], [], ["Did you examine the report?"]),
  assignment(680, "en.grammar.past_simple_questions_negatives.did_questions", [], ["en.borrow.verb.01", "en.consider.verb.01", "en.describe.verb.01", "en.examine.verb.01"], ["Did you borrow the book?", "Did you consider the offer?", "Did you describe the place?", "Did you examine the report?"]),
  // Lesson 13 / Chapter 2: each negative keeps the new verb in base form,
  // making the did-not diagnostic explicit without repeated targets.
  assignment(681, "en.grammar.past_simple_questions_negatives.didnt_negatives", [sense("attend", "посещать", "verb")], [], ["I didn't attend the meeting."]),
  assignment(682, "en.grammar.past_simple_questions_negatives.didnt_negatives", [sense("believe", "верить", "verb")], [], ["I didn't believe the story."]),
  assignment(683, "en.grammar.past_simple_questions_negatives.didnt_negatives", [sense("cancel", "отменять", "verb")], [], ["I didn't cancel the trip."]),
  assignment(684, "en.grammar.past_simple_questions_negatives.didnt_negatives", [sense("contribute", "вносить вклад", "verb")], [], ["I didn't contribute a note."]),
  assignment(685, "en.grammar.past_simple_questions_negatives.didnt_negatives", [sense("complete", "завершать", "verb")], [], ["I didn't complete the form."]),
  assignment(686, "en.grammar.past_simple_questions_negatives.didnt_negatives", [sense("confirm", "подтверждать", "verb")], [], ["I didn't confirm the date."]),
  assignment(687, "en.grammar.past_simple_questions_negatives.didnt_negatives", [sense("contact", "связываться", "verb")], [], ["I didn't contact the office."]),
  assignment(688, "en.grammar.past_simple_questions_negatives.didnt_negatives", [], ["en.attend.verb.01", "en.cancel.verb.01", "en.complete.verb.01", "en.contact.verb.01"], ["I didn't attend the meeting.", "I didn't cancel the trip.", "I didn't complete the form.", "I didn't contact the office."]),
  // Lesson 13 / Chapter 3: the base verb after did is the sole new target;
  // each question supplies a different context for restoration practice.
  assignment(689, "en.grammar.past_simple_questions_negatives.base_form_restoration", [sense("accept", "принимать", "verb")], [], ["Did you accept the invite?"]),
  assignment(690, "en.grammar.past_simple_questions_negatives.base_form_restoration", [sense("avoid", "избегать", "verb")], [], ["Did you avoid the noise?"]),
  assignment(691, "en.grammar.past_simple_questions_negatives.base_form_restoration", [sense("check", "проверять", "verb")], [], ["Did you check the receipt?"]),
  assignment(692, "en.grammar.past_simple_questions_negatives.base_form_restoration", [sense("handle", "обрабатывать; решать", "verb")], [], ["Did you handle the request?"]),
  assignment(693, "en.grammar.past_simple_questions_negatives.base_form_restoration", [sense("enter", "входить", "verb")], [], ["Did you enter the code?"]),
  assignment(694, "en.grammar.past_simple_questions_negatives.base_form_restoration", [sense("mention", "упоминать", "verb")], [], ["Did you mention the address?"]),
  assignment(695, "en.grammar.past_simple_questions_negatives.base_form_restoration", [sense("prefer", "предпочитать", "verb")], [], ["Did you prefer the first one?"]),
  assignment(696, "en.grammar.past_simple_questions_negatives.base_form_restoration", [], ["en.accept.verb.01", "en.check.verb.01", "en.enter.verb.01", "en.prefer.verb.01"], ["Did you accept the invite?", "Did you check the receipt?", "Did you enter the code?", "Did you prefer the first one?"]),
  // Lesson 13 / Chapter 4: every new time noun is grounded in a distinct
  // finished-time anchor, while the lexical item itself is never repeated.
  assignment(697, "en.grammar.past_simple_questions_negatives.finished_time_anchors", [sense("yesterday", "вчера", "adverb")], [], ["Did you call yesterday?"]),
  assignment(698, "en.grammar.past_simple_questions_negatives.finished_time_anchors", [sense("weekend", "выходные", "noun")], [], ["Did you travel last weekend?"]),
  assignment(699, "en.grammar.past_simple_questions_negatives.finished_time_anchors", [sense("century", "век", "noun")], [], ["Did it happen last century?"]),
  assignment(700, "en.grammar.past_simple_questions_negatives.finished_time_anchors", [sense("decade", "десятилетие", "noun")], [], ["Did it change last decade?"]),
  assignment(701, "en.grammar.past_simple_questions_negatives.finished_time_anchors", [sense("eve", "канун", "noun")], [], ["Did you leave on the eve?"]),
  assignment(702, "en.grammar.past_simple_questions_negatives.finished_time_anchors", [sense("era", "эпоха", "noun")], [], ["Did it start in that era?"]),
  assignment(703, "en.grammar.past_simple_questions_negatives.finished_time_anchors", [sense("cutoff", "крайний срок; отсечка", "noun")], [], ["Did you meet the cutoff?"]),
  assignment(704, "en.grammar.past_simple_questions_negatives.finished_time_anchors", [], ["en.yesterday.adverb.01", "en.century.noun.01", "en.eve.noun.01", "en.cutoff.noun.01"], ["Did you call yesterday?", "Did it happen last century?", "Did you leave on the eve?", "Did you meet the cutoff?"]),
  // Lesson 13 / Chapter 5: each packet adds one concrete event noun while the
  // two completed actions make the sequence connector meaningful.
  assignment(705, "en.grammar.past_simple_questions_negatives.event_sequence", [sense("voucher", "ваучер", "noun")], [], ["I paid, then I kept the voucher."]),
  assignment(706, "en.grammar.past_simple_questions_negatives.event_sequence", [sense("permit", "разрешение", "noun")], [], ["I arrived, then I showed the permit."]),
  assignment(707, "en.grammar.past_simple_questions_negatives.event_sequence", [sense("crate", "ящик", "noun")], [], ["I signed, then I took the crate."]),
  assignment(708, "en.grammar.past_simple_questions_negatives.event_sequence", [sense("invoice", "счёт; накладная", "noun")], [], ["I checked, then I filed the invoice."]),
  assignment(709, "en.grammar.past_simple_questions_negatives.event_sequence", [sense("wristband", "браслет", "noun")], [], ["I registered, then I wore the wristband."]),
  assignment(710, "en.grammar.past_simple_questions_negatives.event_sequence", [sense("envelope", "конверт", "noun")], [], ["I wrote, then I sealed the envelope."]),
  assignment(711, "en.grammar.past_simple_questions_negatives.event_sequence", [sense("portfolio", "портфолио; папка работ", "noun")], [], ["I printed, then I filed the portfolio."]),
  assignment(712, "en.grammar.past_simple_questions_negatives.event_sequence", [], ["en.voucher.noun.01", "en.crate.noun.01", "en.wristband.noun.01", "en.portfolio.noun.01"], ["I paid, then I kept the voucher.", "I signed, then I took the crate.", "I registered, then I wore the wristband.", "I printed, then I filed the portfolio."]),
  // Lesson 13 / Chapter 6: work objects give the review a changed context;
  // each target noun appears once inside a completed past sequence.
  assignment(713, "en.grammar.past_simple_questions_negatives.event_sequence", [sense("briefcase", "портфель", "noun")], [], ["I arrived, then I opened the briefcase."]),
  assignment(714, "en.grammar.past_simple_questions_negatives.event_sequence", [sense("clipboard", "планшет с зажимом", "noun")], [], ["I checked, then I carried the clipboard."]),
  assignment(715, "en.grammar.past_simple_questions_negatives.event_sequence", [sense("toolkit", "набор инструментов", "noun")], [], ["I unpacked, then I used the toolkit."]),
  assignment(716, "en.grammar.past_simple_questions_negatives.event_sequence", [sense("apron", "фартук", "noun")], [], ["I changed, then I wore the apron."]),
  assignment(717, "en.grammar.past_simple_questions_negatives.event_sequence", [sense("headset", "гарнитура", "noun")], [], ["I arrived, then I wore the headset."]),
  assignment(718, "en.grammar.past_simple_questions_negatives.event_sequence", [sense("microphone", "микрофон", "noun")], [], ["I spoke, then I switched off the microphone."]),
  assignment(719, "en.grammar.past_simple_questions_negatives.event_sequence", [sense("projector", "проектор", "noun")], [], ["I connected, then I started the projector."]),
  assignment(720, "en.grammar.past_simple_questions_negatives.event_sequence", [], ["en.briefcase.noun.01", "en.toolkit.noun.01", "en.headset.noun.01", "en.projector.noun.01"], ["I arrived, then I opened the briefcase.", "I unpacked, then I used the toolkit.", "I arrived, then I wore the headset.", "I connected, then I started the projector."]),
  // Lesson 13 / Chapter 7: travel-and-place nouns make final transfer prompts
  // distinct while retaining the same past-event sequence decision.
  assignment(721, "en.grammar.past_simple_questions_negatives.event_sequence", [sense("warehouse", "склад", "noun")], [], ["I arrived, then I entered the warehouse."]),
  assignment(722, "en.grammar.past_simple_questions_negatives.event_sequence", [sense("terminal", "терминал", "noun")], [], ["I arrived, then I waited in the terminal."]),
  assignment(723, "en.grammar.past_simple_questions_negatives.event_sequence", [sense("dock", "пристань; док", "noun")], [], ["I arrived, then I stood on the dock."]),
  assignment(724, "en.grammar.past_simple_questions_negatives.event_sequence", [sense("trunk", "багажник; сундук", "noun")], [], ["I packed, then I carried the trunk."]),
  assignment(725, "en.grammar.past_simple_questions_negatives.event_sequence", [sense("satchel", "сумка через плечо", "noun")], [], ["I packed, then I wore the satchel."]),
  assignment(726, "en.grammar.past_simple_questions_negatives.event_sequence", [sense("itinerary", "маршрут путешествия", "noun")], [], ["I checked, then I followed the itinerary."]),
  assignment(727, "en.grammar.past_simple_questions_negatives.event_sequence", [sense("luggage", "багаж", "noun")], [], ["I landed, then I collected the luggage."]),
  assignment(728, "en.grammar.past_simple_questions_negatives.event_sequence", [], ["en.warehouse.noun.01", "en.dock.noun.01", "en.satchel.noun.01", "en.luggage.noun.01"], ["I arrived, then I entered the warehouse.", "I arrived, then I stood on the dock.", "I packed, then I wore the satchel.", "I landed, then I collected the luggage."]),
  // Lesson 14 / Chapter 1: one ordinary background action per packet makes
  // past continuous visible as was/were + -ing rather than a new word list.
  assignment(729, "en.grammar.past_continuous.affirmative", [sense("sketch", "делать набросок", "verb")], [], ["I was sketching."]),
  assignment(730, "en.grammar.past_continuous.affirmative", [sense("stitch", "сшивать", "verb")], [], ["I was stitching."]),
  assignment(731, "en.grammar.past_continuous.affirmative", [sense("garden", "заниматься садом", "verb")], [], ["I was gardening."]),
  assignment(732, "en.grammar.past_continuous.affirmative", [sense("pray", "молиться", "verb")], [], ["I was praying."]),
  assignment(733, "en.grammar.past_continuous.affirmative", [sense("mop", "мыть шваброй", "verb")], [], ["I was mopping."]),
  assignment(734, "en.grammar.past_continuous.affirmative", [sense("sweep", "подметать", "verb")], [], ["I was sweeping."]),
  assignment(735, "en.grammar.past_continuous.affirmative", [sense("water", "поливать", "verb")], [], ["I was watering the plants."]),
  assignment(736, "en.grammar.past_continuous.affirmative", [], ["en.sketch.verb.01", "en.garden.verb.01", "en.mop.verb.01", "en.water.verb.01"], ["I was sketching.", "I was gardening.", "I was mopping.", "I was watering the plants."]),
  // Lesson 14 / Chapter 2: question and negative forms change the grammar
  // choice while each packet carries exactly one fresh concrete noun.
  assignment(737, "en.grammar.past_continuous.negative_questions", [sense("ladder", "лестница", "noun")], [], ["Were you carrying the ladder?"]),
  assignment(738, "en.grammar.past_continuous.negative_questions", [sense("lantern", "фонарь", "noun")], [], ["Weren't you holding the lantern?"]),
  assignment(739, "en.grammar.past_continuous.negative_questions", [sense("cushion", "подушка", "noun")], [], ["Were you moving the cushion?"]),
  assignment(740, "en.grammar.past_continuous.negative_questions", [sense("blanket", "одеяло", "noun")], [], ["Weren't you folding the blanket?"]),
  assignment(741, "en.grammar.past_continuous.negative_questions", [sense("visor", "козырёк; защитный щиток", "noun")], [], ["Were you wearing the visor?"]),
  assignment(742, "en.grammar.past_continuous.negative_questions", [sense("compass", "компас", "noun")], [], ["Weren't you using the compass?"]),
  assignment(743, "en.grammar.past_continuous.negative_questions", [sense("thermos", "термос", "noun")], [], ["Were you filling the thermos?"]),
  assignment(744, "en.grammar.past_continuous.negative_questions", [], ["en.ladder.noun.01", "en.cushion.noun.01", "en.visor.noun.01", "en.thermos.noun.01"], ["Were you carrying the ladder?", "Were you moving the cushion?", "Were you wearing the visor?", "Were you filling the thermos?"]),
  // Lesson 14 / Chapter 3: the changing location/object makes the ongoing
  // background action meaningful, with one new noun per packet.
  assignment(745, "en.grammar.past_continuous.background_action", [sense("awning", "навес", "noun")], [], ["I was opening the awning."]),
  assignment(746, "en.grammar.past_continuous.background_action", [sense("pavement", "тротуар", "noun")], [], ["I was crossing the pavement."]),
  assignment(747, "en.grammar.past_continuous.background_action", [sense("fence", "забор", "noun")], [], ["I was painting the fence."]),
  assignment(748, "en.grammar.past_continuous.background_action", [sense("pavilion", "павильон", "noun")], [], ["I was watching the pavilion."]),
  assignment(749, "en.grammar.past_continuous.background_action", [sense("railing", "перила; ограждение", "noun")], [], ["I was holding the railing."]),
  assignment(750, "en.grammar.past_continuous.background_action", [sense("statue", "статуя", "noun")], [], ["I was drawing the statue."]),
  assignment(751, "en.grammar.past_continuous.background_action", [sense("mailbox", "почтовый ящик", "noun")], [], ["I was checking the mailbox."]),
  assignment(752, "en.grammar.past_continuous.background_action", [], ["en.awning.noun.01", "en.fence.noun.01", "en.railing.noun.01", "en.mailbox.noun.01"], ["I was opening the awning.", "I was painting the fence.", "I was holding the railing.", "I was checking the mailbox."]),
  // Lesson 14 / Chapter 4: a distinct interruption cue lets the learner
  // contrast the background action with one completed past event.
  assignment(753, "en.grammar.past_continuous.interrupted_action", [sense("doorbell", "дверной звонок", "noun")], [], ["I was reading when the doorbell rang."]),
  assignment(754, "en.grammar.past_continuous.interrupted_action", [sense("siren", "сирена", "noun")], [], ["I was walking when the siren sounded."]),
  assignment(755, "en.grammar.past_continuous.interrupted_action", [sense("thunder", "гром", "noun")], [], ["I was resting when thunder started."]),
  assignment(756, "en.grammar.past_continuous.interrupted_action", [sense("vibration", "вибрация", "noun")], [], ["I was working when the vibration began."]),
  assignment(757, "en.grammar.past_continuous.interrupted_action", [sense("ringtone", "мелодия звонка", "noun")], [], ["I was cooking when the ringtone played."]),
  assignment(758, "en.grammar.past_continuous.interrupted_action", [sense("flash", "вспышка", "noun")], [], ["I was driving when a flash appeared."]),
  assignment(759, "en.grammar.past_continuous.interrupted_action", [sense("announcement", "объявление", "noun")], [], ["I was waiting when the announcement started."]),
  assignment(760, "en.grammar.past_continuous.interrupted_action", [], ["en.doorbell.noun.01", "en.thunder.noun.01", "en.ringtone.noun.01", "en.announcement.noun.01"], ["I was reading when the doorbell rang.", "I was resting when thunder started.", "I was cooking when the ringtone played.", "I was waiting when the announcement started."]),
  // Lesson 14 / Chapter 5: while/when frames remain visible as the relation
  // marker while every packet introduces one distinct setting noun.
  assignment(761, "en.grammar.past_continuous.when_while", [sense("cafeteria", "кафетерий", "noun")], [], ["I was eating while the cafeteria was quiet."]),
  assignment(762, "en.grammar.past_continuous.when_while", [sense("corridor", "коридор", "noun")], [], ["I was walking when the corridor became busy."]),
  assignment(763, "en.grammar.past_continuous.when_while", [sense("elevator", "лифт", "noun")], [], ["I was waiting while the elevator was moving."]),
  assignment(764, "en.grammar.past_continuous.when_while", [sense("lobby", "вестибюль", "noun")], [], ["I was sitting when the lobby became full."]),
  assignment(765, "en.grammar.past_continuous.when_while", [sense("lounge", "зона отдыха", "noun")], [], ["I was reading while the lounge was empty."]),
  assignment(766, "en.grammar.past_continuous.when_while", [sense("terrace", "терраса", "noun")], [], ["I was talking when the terrace became cold."]),
  assignment(767, "en.grammar.past_continuous.when_while", [sense("crosswalk", "пешеходный переход", "noun")], [], ["I was waiting while the crosswalk was clear."]),
  assignment(768, "en.grammar.past_continuous.when_while", [], ["en.cafeteria.noun.01", "en.elevator.noun.01", "en.lounge.noun.01", "en.crosswalk.noun.01"], ["I was eating while the cafeteria was quiet.", "I was waiting while the elevator was moving.", "I was reading while the lounge was empty.", "I was waiting while the crosswalk was clear."]),
  // Lesson 14 / Chapter 6: changing domestic contexts support transfer without
  // repeating the prior packets' nouns or adding grammar.
  assignment(769, "en.grammar.past_continuous.when_while", [sense("laundry", "прачечная; стирка", "noun")], [], ["I was folding while the laundry was dry."]),
  assignment(770, "en.grammar.past_continuous.when_while", [sense("carport", "навес для машины", "noun")], [], ["I was working while the carport was open."]),
  assignment(771, "en.grammar.past_continuous.when_while", [sense("driveway", "подъездная дорожка", "noun")], [], ["I was waiting while the driveway was clear."]),
  assignment(772, "en.grammar.past_continuous.when_while", [sense("shed", "сарай", "noun")], [], ["I was cleaning while the shed was empty."]),
  assignment(773, "en.grammar.past_continuous.when_while", [sense("archway", "арка; арочный проход", "noun")], [], ["I was leaving when the archway closed."]),
  assignment(774, "en.grammar.past_continuous.when_while", [sense("pathway", "дорожка", "noun")], [], ["I was walking while the pathway was quiet."]),
  assignment(775, "en.grammar.past_continuous.when_while", [sense("greenhouse", "теплица", "noun")], [], ["I was planting while the greenhouse was warm."]),
  assignment(776, "en.grammar.past_continuous.when_while", [], ["en.laundry.noun.01", "en.driveway.noun.01", "en.archway.noun.01", "en.greenhouse.noun.01"], ["I was folding while the laundry was dry.", "I was waiting while the driveway was clear.", "I was leaving when the archway closed.", "I was planting while the greenhouse was warm."]),
  // Lesson 14 / Chapter 7: final transfer selects public-place contexts while
  // holding the same when/while relation and one new sense per packet.
  assignment(777, "en.grammar.past_continuous.when_while", [sense("optician", "оптик", "noun")], [], ["I was waiting while the optician was open."]),
  assignment(778, "en.grammar.past_continuous.when_while", [sense("bakery", "пекарня", "noun")], [], ["I was shopping while the bakery was busy."]),
  assignment(779, "en.grammar.past_continuous.when_while", [sense("barber", "парикмахер", "noun")], [], ["I was waiting while the barber was free."]),
  assignment(780, "en.grammar.past_continuous.when_while", [sense("bookstore", "книжный магазин", "noun")], [], ["I was reading while the bookstore was quiet."]),
  assignment(781, "en.grammar.past_continuous.when_while", [sense("boutique", "бутик", "noun")], [], ["I was browsing while the boutique was open."]),
  assignment(782, "en.grammar.past_continuous.when_while", [sense("florist", "цветочный магазин; флорист", "noun")], [], ["I was waiting while the florist was closed."]),
  assignment(783, "en.grammar.past_continuous.when_while", [sense("newsstand", "газетный киоск", "noun")], [], ["I was walking when the newsstand opened."]),
  assignment(784, "en.grammar.past_continuous.when_while", [], ["en.optician.noun.01", "en.barber.noun.01", "en.boutique.noun.01", "en.newsstand.noun.01"], ["I was waiting while the optician was open.", "I was waiting while the barber was free.", "I was browsing while the boutique was open.", "I was walking when the newsstand opened."]),
  assignment(785, "en.grammar.planned_future.going_to_intention", [sense("aquarium", "океанариум", "noun")], [], ["I'm going to visit the aquarium."]),
  assignment(786, "en.grammar.planned_future.going_to_intention", [sense("planetarium", "планетарий", "noun")], [], ["I'm going to visit the planetarium."]),
  assignment(787, "en.grammar.planned_future.going_to_intention", [sense("zoo", "зоопарк", "noun")], [], ["I'm going to visit the zoo."]),
  assignment(788, "en.grammar.planned_future.going_to_intention", [sense("aqueduct", "акведук", "noun")], [], ["I'm going to visit the aqueduct."]),
  assignment(789, "en.grammar.planned_future.going_to_intention", [sense("castle", "замок", "noun")], [], ["I'm going to visit the castle."]),
  assignment(790, "en.grammar.planned_future.going_to_intention", [sense("monument", "памятник", "noun")], [], ["I'm going to visit the monument."]),
  assignment(791, "en.grammar.planned_future.going_to_intention", [sense("sanctuary", "заповедник; убежище", "noun")], [], ["I'm going to visit the sanctuary."]),
  assignment(792, "en.grammar.planned_future.going_to_intention", [], ["en.aquarium.noun.01", "en.zoo.noun.01", "en.castle.noun.01", "en.sanctuary.noun.01"], ["I'm going to visit the aquarium.", "I'm going to visit the zoo.", "I'm going to visit the castle.", "I'm going to visit the sanctuary."]),
  // Lesson 15 / Chapter 2: each visible cue gives going to an evidence-based
  // meaning, while the cue itself is the one new lexical target.
  assignment(793, "en.grammar.planned_future.going_to_evidence", [sense("darkness", "темнота", "noun")], [], ["The darkness is going to cover the road."]),
  assignment(794, "en.grammar.planned_future.going_to_evidence", [sense("gust", "порыв ветра", "noun")], [], ["The gust is going to move the sign."]),
  assignment(795, "en.grammar.planned_future.going_to_evidence", [sense("hail", "град", "noun")], [], ["The hail is going to hit the roof."]),
  assignment(796, "en.grammar.planned_future.going_to_evidence", [sense("mist", "туман", "noun")], [], ["The mist is going to hide the hill."]),
  assignment(797, "en.grammar.planned_future.going_to_evidence", [sense("drizzle", "морось", "noun")], [], ["The drizzle is going to wet the path."]),
  assignment(798, "en.grammar.planned_future.going_to_evidence", [sense("lightning", "молния", "noun")], [], ["The lightning is going to light the sky."]),
  assignment(799, "en.grammar.planned_future.going_to_evidence", [sense("frost", "иней; мороз", "noun")], [], ["The frost is going to cover the grass."]),
  assignment(800, "en.grammar.planned_future.going_to_evidence", [], ["en.darkness.noun.01", "en.hail.noun.01", "en.drizzle.noun.01", "en.frost.noun.01"], ["The darkness is going to cover the road.", "The hail is going to hit the roof.", "The drizzle is going to wet the path.", "The frost is going to cover the grass."]),
  // Lesson 15 / Chapter 3: a calendar-like arrangement is grounded by one
  // distinct appointment noun rather than another future-form target.
  assignment(801, "en.grammar.planned_future.continuous_arrangement", [sense("dentist", "стоматолог", "noun")], [], ["I'm seeing the dentist tomorrow."]),
  assignment(802, "en.grammar.planned_future.continuous_arrangement", [sense("plumber", "сантехник", "noun")], [], ["I'm meeting the plumber tomorrow."]),
  assignment(803, "en.grammar.planned_future.continuous_arrangement", [sense("mechanic", "механик", "noun")], [], ["I'm seeing the mechanic tomorrow."]),
  assignment(804, "en.grammar.planned_future.continuous_arrangement", [sense("landlord", "арендодатель", "noun")], [], ["I'm meeting the landlord tomorrow."]),
  assignment(805, "en.grammar.planned_future.continuous_arrangement", [sense("accountant", "бухгалтер", "noun")], [], ["I'm seeing the accountant tomorrow."]),
  assignment(806, "en.grammar.planned_future.continuous_arrangement", [sense("lawyer", "юрист", "noun")], [], ["I'm meeting the lawyer tomorrow."]),
  assignment(807, "en.grammar.planned_future.continuous_arrangement", [sense("architect", "архитектор", "noun")], [], ["I'm seeing the architect tomorrow."]),
  assignment(808, "en.grammar.planned_future.continuous_arrangement", [], ["en.dentist.noun.01", "en.mechanic.noun.01", "en.accountant.noun.01", "en.architect.noun.01"], ["I'm seeing the dentist tomorrow.", "I'm seeing the mechanic tomorrow.", "I'm seeing the accountant tomorrow.", "I'm seeing the architect tomorrow."]),
  // Lesson 15 / Chapter 4: future plan/arrangement contrast is carried by
  // familiar frames; a new occasion noun differentiates each packet.
  assignment(809, "en.grammar.planned_future.plan_arrangement_contrast", [sense("rehearsal", "репетиция", "noun")], [], ["I'm going to prepare for the rehearsal.", "I'm meeting the group for the rehearsal."]),
  assignment(810, "en.grammar.planned_future.plan_arrangement_contrast", [sense("audition", "прослушивание", "noun")], [], ["I'm going to prepare for the audition.", "I'm meeting the coach for the audition."]),
  assignment(811, "en.grammar.planned_future.plan_arrangement_contrast", [sense("interview", "собеседование", "noun")], [], ["I'm going to prepare for the interview.", "I'm meeting the manager for the interview."]),
  assignment(812, "en.grammar.planned_future.plan_arrangement_contrast", [sense("trial", "пробное занятие; испытание", "noun")], [], ["I'm going to prepare for the trial.", "I'm meeting the team for the trial."]),
  assignment(813, "en.grammar.planned_future.plan_arrangement_contrast", [sense("lesson", "занятие", "noun")], [], ["I'm going to prepare for the lesson.", "I'm meeting the tutor for the lesson."]),
  assignment(814, "en.grammar.planned_future.plan_arrangement_contrast", [sense("inspection", "проверка; осмотр", "noun")], [], ["I'm going to prepare for the inspection.", "I'm meeting the inspector for the inspection."]),
  assignment(815, "en.grammar.planned_future.plan_arrangement_contrast", [sense("consultation", "консультация", "noun")], [], ["I'm going to prepare for the consultation.", "I'm meeting the adviser for the consultation."]),
  assignment(816, "en.grammar.planned_future.plan_arrangement_contrast", [], ["en.rehearsal.noun.01", "en.interview.noun.01", "en.lesson.noun.01", "en.consultation.noun.01"], ["I'm going to prepare for the rehearsal.", "I'm meeting the manager for the interview.", "I'm going to prepare for the lesson.", "I'm meeting the adviser for the consultation."]),
  // Lesson 15 / Chapter 5: future review keeps the grammatical decision fixed
  // while each packet adds one distinct travel-planning noun.
  assignment(817, "en.grammar.planned_future.going_to_intention", [sense("trail", "тропа", "noun")], [], ["I'm going to walk the trail."]),
  assignment(818, "en.grammar.planned_future.going_to_intention", [sense("campsite", "место для лагеря", "noun")], [], ["I'm going to book the campsite."]),
  assignment(819, "en.grammar.planned_future.going_to_intention", [sense("viewpoint", "смотровая площадка", "noun")], [], ["I'm going to visit the viewpoint."]),
  assignment(820, "en.grammar.planned_future.going_to_intention", [sense("marina", "пристань для яхт", "noun")], [], ["I'm going to visit the marina."]),
  assignment(821, "en.grammar.planned_future.going_to_intention", [sense("cottage", "коттедж", "noun")], [], ["I'm going to rent the cottage."]),
  assignment(822, "en.grammar.planned_future.going_to_intention", [sense("lodge", "домик; лодж", "noun")], [], ["I'm going to book the lodge."]),
  assignment(823, "en.grammar.planned_future.going_to_intention", [sense("lookout", "наблюдательный пункт", "noun")], [], ["I'm going to reach the lookout."]),
  assignment(824, "en.grammar.planned_future.going_to_intention", [], ["en.trail.noun.01", "en.viewpoint.noun.01", "en.cottage.noun.01", "en.lookout.noun.01"], ["I'm going to walk the trail.", "I'm going to visit the viewpoint.", "I'm going to rent the cottage.", "I'm going to reach the lookout."]),
  // Lesson 15 / Chapter 6: civic-planning destinations give future review a
  // changed context while every packet introduces one noun only.
  assignment(825, "en.grammar.planned_future.going_to_intention", [sense("embassy", "посольство", "noun")], [], ["I'm going to visit the embassy."]),
  assignment(826, "en.grammar.planned_future.going_to_intention", [sense("consulate", "консульство", "noun")], [], ["I'm going to visit the consulate."]),
  assignment(827, "en.grammar.planned_future.going_to_intention", [sense("municipality", "муниципалитет", "noun")], [], ["I'm going to visit the municipality."]),
  assignment(828, "en.grammar.planned_future.going_to_intention", [sense("registry", "реестр; регистрационная служба", "noun")], [], ["I'm going to visit the registry."]),
  assignment(829, "en.grammar.planned_future.going_to_intention", [sense("notary", "нотариус", "noun")], [], ["I'm going to meet the notary."]),
  assignment(830, "en.grammar.planned_future.going_to_intention", [sense("bureau", "бюро", "noun")], [], ["I'm going to visit the bureau."]),
  assignment(831, "en.grammar.planned_future.going_to_intention", [sense("council", "совет", "noun")], [], ["I'm going to visit the council."]),
  assignment(832, "en.grammar.planned_future.going_to_intention", [], ["en.embassy.noun.01", "en.municipality.noun.01", "en.notary.noun.01", "en.council.noun.01"], ["I'm going to visit the embassy.", "I'm going to visit the municipality.", "I'm going to meet the notary.", "I'm going to visit the council."]),
  // Lesson 15 / Chapter 7: final transfer gives each future plan a different
  // service destination; the checkpoint retrieves without new vocabulary.
  assignment(833, "en.grammar.planned_future.going_to_intention", [sense("broker", "брокер", "noun")], [], ["I'm going to meet the broker."]),
  assignment(834, "en.grammar.planned_future.going_to_intention", [sense("therapist", "терапевт", "noun")], [], ["I'm going to meet the therapist."]),
  assignment(835, "en.grammar.planned_future.going_to_intention", [sense("veterinarian", "ветеринар", "noun")], [], ["I'm going to meet the veterinarian."]),
  assignment(836, "en.grammar.planned_future.going_to_intention", [sense("tailor", "портной", "noun")], [], ["I'm going to meet the tailor."]),
  assignment(837, "en.grammar.planned_future.going_to_intention", [sense("receptionist", "администратор", "noun")], [], ["I'm going to meet the receptionist."]),
  assignment(838, "en.grammar.planned_future.going_to_intention", [sense("librarian", "библиотекарь", "noun")], [], ["I'm going to meet the librarian."]),
  assignment(839, "en.grammar.planned_future.going_to_intention", [sense("translator", "переводчик", "noun")], [], ["I'm going to meet the translator."]),
  assignment(840, "en.grammar.planned_future.going_to_intention", [], ["en.broker.noun.01", "en.veterinarian.noun.01", "en.receptionist.noun.01", "en.translator.noun.01"], ["I'm going to meet the broker.", "I'm going to meet the veterinarian.", "I'm going to meet the receptionist.", "I'm going to meet the translator."]),
  // Lesson 16 / Chapter 1: one prediction cue per packet gives will a clear
  // evidence-free prediction meaning without duplicate lexical targets.
  assignment(841, "en.grammar.will_future.prediction", [sense("outlook", "перспектива; прогноз", "noun")], [], ["The outlook will change."]),
  assignment(842, "en.grammar.will_future.prediction", [sense("temperature", "температура", "noun")], [], ["The temperature will rise."]),
  assignment(843, "en.grammar.will_future.prediction", [sense("humidity", "влажность", "noun")], [], ["The humidity will fall."]),
  assignment(844, "en.grammar.will_future.prediction", [sense("horizon", "горизонт", "noun")], [], ["The horizon will clear."]),
  assignment(845, "en.grammar.will_future.prediction", [sense("tide", "прилив", "noun")], [], ["The tide will rise."]),
  assignment(846, "en.grammar.will_future.prediction", [sense("current", "течение", "noun")], [], ["The current will slow."]),
  assignment(847, "en.grammar.will_future.prediction", [sense("climate", "климат", "noun")], [], ["The climate will change."]),
  assignment(848, "en.grammar.will_future.prediction", [], ["en.outlook.noun.01", "en.humidity.noun.01", "en.tide.noun.01", "en.climate.noun.01"], ["The outlook will change.", "The humidity will fall.", "The tide will rise.", "The climate will change."]),
  // Lesson 16 / Chapter 2: immediate practical needs support spontaneous will
  // decisions, with a unique concrete target in each packet.
  assignment(849, "en.grammar.will_future.spontaneous_decision", [sense("raincoat", "дождевик", "noun")], [], ["I'll bring the raincoat."]),
  assignment(850, "en.grammar.will_future.spontaneous_decision", [sense("adapter", "адаптер", "noun")], [], ["I'll get the adapter."]),
  assignment(851, "en.grammar.will_future.spontaneous_decision", [sense("medicine", "лекарство", "noun")], [], ["I'll bring the medicine."]),
  assignment(852, "en.grammar.will_future.spontaneous_decision", [sense("towel", "полотенце", "noun")], [], ["I'll get the towel."]),
  assignment(853, "en.grammar.will_future.spontaneous_decision", [sense("battery", "батарейка", "noun")], [], ["I'll find the battery."]),
  assignment(854, "en.grammar.will_future.spontaneous_decision", [sense("bandage", "бинт; пластырь", "noun")], [], ["I'll bring a bandage."]),
  assignment(855, "en.grammar.will_future.spontaneous_decision", [sense("flashlight", "фонарик", "noun")], [], ["I'll get the flashlight."]),
  assignment(856, "en.grammar.will_future.spontaneous_decision", [], ["en.raincoat.noun.01", "en.medicine.noun.01", "en.battery.noun.01", "en.flashlight.noun.01"], ["I'll bring the raincoat.", "I'll bring the medicine.", "I'll find the battery.", "I'll get the flashlight."]),
  // Lesson 16 / Chapter 3: a separate beneficiary grounds each promise while
  // will is kept explicit and no target noun repeats in the chapter.
  assignment(857, "en.grammar.will_future.promise", [sense("neighbor", "сосед", "noun")], [], ["I'll help the neighbor."]),
  assignment(858, "en.grammar.will_future.promise", [sense("teammate", "товарищ по команде", "noun")], [], ["I'll support my teammate."]),
  assignment(859, "en.grammar.will_future.promise", [sense("colleague", "коллега", "noun")], [], ["I'll call my colleague."]),
  assignment(860, "en.grammar.will_future.promise", [sense("relative", "родственник", "noun")], [], ["I'll visit my relative."]),
  assignment(861, "en.grammar.will_future.promise", [sense("classmate", "одноклассник", "noun")], [], ["I'll remind my classmate."]),
  assignment(862, "en.grammar.will_future.promise", [sense("passenger", "пассажир", "noun")], [], ["I'll guide the passenger."]),
  assignment(863, "en.grammar.will_future.promise", [sense("guest", "гость", "noun")], [], ["I'll welcome the guest."]),
  assignment(864, "en.grammar.will_future.promise", [], ["en.neighbor.noun.01", "en.colleague.noun.01", "en.classmate.noun.01", "en.guest.noun.01"], ["I'll help the neighbor.", "I'll call my colleague.", "I'll remind my classmate.", "I'll welcome the guest."]),
  // Lesson 16 / Chapter 4: each offer is framed around one useful object, so
  // the learner can distinguish offer meaning without repeated targets.
  assignment(865, "en.grammar.will_future.offer", [sense("seat", "место; сиденье", "noun")], [], ["I'll save you a seat."]),
  assignment(866, "en.grammar.will_future.offer", [sense("directions", "указания; маршрут", "noun")], [], ["I'll show you the directions."]),
  assignment(867, "en.grammar.will_future.offer", [sense("menu", "меню", "noun")], [], ["I'll bring you the menu."]),
  assignment(868, "en.grammar.will_future.offer", [sense("quilt", "стёганое одеяло", "noun")], [], ["I'll bring you the quilt."]),
  assignment(869, "en.grammar.will_future.offer", [sense("pillow", "подушка", "noun")], [], ["I'll get you the pillow."]),
  assignment(870, "en.grammar.will_future.offer", [sense("guidebook", "путеводитель", "noun")], [], ["I'll lend you the guidebook."]),
  assignment(871, "en.grammar.will_future.offer", [sense("reservation", "бронирование", "noun")], [], ["I'll check the reservation."]),
  assignment(872, "en.grammar.will_future.offer", [], ["en.seat.noun.01", "en.menu.noun.01", "en.pillow.noun.01", "en.reservation.noun.01"], ["I'll save you a seat.", "I'll bring you the menu.", "I'll get you the pillow.", "I'll check the reservation."]),
  // Lesson 16 / Chapter 5: each situation noun makes the will/going-to choice
  // meaningful while retaining exactly one new lexical target per packet.
  assignment(873, "en.grammar.will_future.future_form_contrast", [sense("prediction", "предсказание", "noun")], [], ["The prediction will change.", "I'm going to check the prediction."]),
  assignment(874, "en.grammar.will_future.future_form_contrast", [sense("intention", "намерение", "noun")], [], ["The intention will help.", "I'm going to explain the intention."]),
  assignment(875, "en.grammar.will_future.future_form_contrast", [sense("choice", "выбор", "noun")], [], ["The choice will matter.", "I'm going to make the choice."]),
  assignment(876, "en.grammar.will_future.future_form_contrast", [sense("promise", "обещание", "noun")], [], ["The promise will help.", "I'm going to keep the promise."]),
  assignment(877, "en.grammar.will_future.future_form_contrast", [sense("decision", "решение", "noun")], [], ["The decision will matter.", "I'm going to make the decision."]),
  assignment(878, "en.grammar.will_future.future_form_contrast", [sense("proposal", "предложение", "noun")], [], ["The proposal will help.", "I'm going to read the proposal."]),
  assignment(879, "en.grammar.will_future.future_form_contrast", [sense("commitment", "обязательство", "noun")], [], ["The commitment will matter.", "I'm going to keep the commitment."]),
  assignment(880, "en.grammar.will_future.future_form_contrast", [], ["en.prediction.noun.01", "en.choice.noun.01", "en.decision.noun.01", "en.commitment.noun.01"], ["The prediction will change.", "I'm going to make the choice.", "The decision will matter.", "I'm going to keep the commitment."]),
  // Lesson 16 / Chapter 6: transfer contexts use distinct upcoming-event nouns
  // while keeping the future-form contrast available for diagnosis.
  assignment(881, "en.grammar.will_future.future_form_contrast", [sense("timetable", "расписание", "noun")], [], ["The timetable will matter.", "I'm going to check the timetable."]),
  assignment(882, "en.grammar.will_future.future_form_contrast", [sense("shipment", "поставка; отправление", "noun")], [], ["The shipment will arrive.", "I'm going to track the shipment."]),
  assignment(883, "en.grammar.will_future.future_form_contrast", [sense("maintenance", "техническое обслуживание", "noun")], [], ["The maintenance will start.", "I'm going to schedule maintenance."]),
  assignment(884, "en.grammar.will_future.future_form_contrast", [sense("renovation", "ремонт; реконструкция", "noun")], [], ["The renovation will finish.", "I'm going to check the renovation."]),
  assignment(885, "en.grammar.will_future.future_form_contrast", [sense("migration", "переезд; миграция", "noun")], [], ["The migration will start.", "I'm going to plan the migration."]),
  assignment(886, "en.grammar.will_future.future_form_contrast", [sense("upgrade", "обновление", "noun")], [], ["The upgrade will help.", "I'm going to install the upgrade."]),
  assignment(887, "en.grammar.will_future.future_form_contrast", [sense("delivery", "доставка", "noun")], [], ["The delivery will arrive.", "I'm going to track the delivery."]),
  assignment(888, "en.grammar.will_future.future_form_contrast", [], ["en.timetable.noun.01", "en.maintenance.noun.01", "en.migration.noun.01", "en.delivery.noun.01"], ["The timetable will matter.", "I'm going to schedule maintenance.", "The migration will start.", "I'm going to track the delivery."]),
  // Lesson 16 / Chapter 7: final transfer uses distinct outcome nouns while
  // preserving the future-form contrast and retrieval-only checkpoint.
  assignment(889, "en.grammar.will_future.future_form_contrast", [sense("outcome", "результат", "noun")], [], ["The outcome will matter.", "I'm going to review the outcome."]),
  assignment(890, "en.grammar.will_future.future_form_contrast", [sense("priority", "приоритет", "noun")], [], ["The priority will change.", "I'm going to set the priority."]),
  assignment(891, "en.grammar.will_future.future_form_contrast", [sense("risk", "риск", "noun")], [], ["The risk will grow.", "I'm going to reduce the risk."]),
  assignment(892, "en.grammar.will_future.future_form_contrast", [sense("benefit", "выгода; польза", "noun")], [], ["The benefit will help.", "I'm going to explain the benefit."]),
  assignment(893, "en.grammar.will_future.future_form_contrast", [sense("impact", "влияние", "noun")], [], ["The impact will matter.", "I'm going to measure the impact."]),
  assignment(894, "en.grammar.will_future.future_form_contrast", [sense("resource", "ресурс", "noun")], [], ["The resource will help.", "I'm going to use the resource."]),
  assignment(895, "en.grammar.will_future.future_form_contrast", [sense("strategy", "стратегия", "noun")], [], ["The strategy will work.", "I'm going to follow the strategy."]),
  assignment(896, "en.grammar.will_future.future_form_contrast", [], ["en.outcome.noun.01", "en.risk.noun.01", "en.impact.noun.01", "en.strategy.noun.01"], ["The outcome will matter.", "I'm going to reduce the risk.", "The impact will matter.", "I'm going to follow the strategy."]),
  // Lesson 17 / Chapter 1: each mass noun is grounded in a countability frame
  // so the lexical target and grammar decision support one another.
  assignment(897, "en.grammar.countability_quantification.count_noncount", [sense("furniture", "мебель", "noun")], [], ["There is furniture here."]),
  assignment(898, "en.grammar.countability_quantification.count_noncount", [sense("jewelry", "украшения", "noun")], [], ["There is jewelry here."]),
  assignment(899, "en.grammar.countability_quantification.count_noncount", [sense("research", "исследование", "noun")], [], ["There is research here."]),
  assignment(900, "en.grammar.countability_quantification.count_noncount", [sense("traffic", "дорожное движение", "noun")], [], ["There is traffic here."]),
  assignment(901, "en.grammar.countability_quantification.count_noncount", [sense("advice", "совет", "noun")], [], ["There is advice here."]),
  assignment(902, "en.grammar.countability_quantification.count_noncount", [sense("progress", "прогресс", "noun")], [], ["There is progress here."]),
  assignment(903, "en.grammar.countability_quantification.count_noncount", [sense("evidence", "доказательства", "noun")], [], ["There is evidence here."]),
  assignment(904, "en.grammar.countability_quantification.count_noncount", [], ["en.furniture.noun.01", "en.research.noun.01", "en.advice.noun.01", "en.evidence.noun.01"], ["There is furniture here.", "There is research here.", "There is advice here.", "There is evidence here."]),
  // Lesson 17 / Chapter 2: each item exposes the much/many choice with one
  // fresh lexical target and a compact natural quantification frame.
  assignment(905, "en.grammar.countability_quantification.much_many", [sense("noise", "шум", "noun")], [], ["There isn't much noise."]),
  assignment(906, "en.grammar.countability_quantification.much_many", [sense("space", "пространство", "noun")], [], ["There isn't much space."]),
  assignment(907, "en.grammar.countability_quantification.much_many", [sense("patience", "терпение", "noun")], [], ["There isn't much patience."]),
  assignment(908, "en.grammar.countability_quantification.much_many", [sense("baggage", "багаж", "noun")], [], ["There isn't much baggage."]),
  assignment(909, "en.grammar.countability_quantification.much_many", [sense("homework", "домашняя работа", "noun")], [], ["There isn't much homework."]),
  assignment(910, "en.grammar.countability_quantification.much_many", [sense("knowledge", "знание", "noun")], [], ["There isn't much knowledge."]),
  assignment(911, "en.grammar.countability_quantification.much_many", [sense("workload", "рабочая нагрузка", "noun")], [], ["There isn't much workload."]),
  assignment(912, "en.grammar.countability_quantification.much_many", [], ["en.noise.noun.01", "en.patience.noun.01", "en.homework.noun.01", "en.workload.noun.01"], ["There isn't much noise.", "There isn't much patience.", "There isn't much homework.", "There isn't much workload."]),
  // Lesson 17 / Chapter 3: a low-quantity frame gives each new mass noun a
  // concrete little-meaning without repeating prior lexical targets.
  assignment(913, "en.grammar.countability_quantification.few_little", [sense("confidence", "уверенность", "noun")], [], ["There is little confidence."]),
  assignment(914, "en.grammar.countability_quantification.few_little", [sense("privacy", "приватность", "noun")], [], ["There is little privacy."]),
  assignment(915, "en.grammar.countability_quantification.few_little", [sense("energy", "энергия", "noun")], [], ["There is little energy."]),
  assignment(916, "en.grammar.countability_quantification.few_little", [sense("oxygen", "кислород", "noun")], [], ["There is little oxygen."]),
  assignment(917, "en.grammar.countability_quantification.few_little", [sense("sunlight", "солнечный свет", "noun")], [], ["There is little sunlight."]),
  assignment(918, "en.grammar.countability_quantification.few_little", [sense("freedom", "свобода", "noun")], [], ["There is little freedom."]),
  assignment(919, "en.grammar.countability_quantification.few_little", [sense("comfort", "комфорт", "noun")], [], ["There is little comfort."]),
  assignment(920, "en.grammar.countability_quantification.few_little", [], ["en.confidence.noun.01", "en.energy.noun.01", "en.sunlight.noun.01", "en.comfort.noun.01"], ["There is little confidence.", "There is little energy.", "There is little sunlight.", "There is little comfort."]),
  // Lesson 17 / Chapter 4: some/any quantity contexts introduce one pantry
  // target at a time while preserving the diagnostic quantity choice.
  assignment(921, "en.grammar.countability_quantification.some_any_quantity", [sense("groceries", "продукты", "noun")], [], ["There are some groceries."]),
  assignment(922, "en.grammar.countability_quantification.some_any_quantity", [sense("snacks", "закуски", "noun")], [], ["There are some snacks."]),
  assignment(923, "en.grammar.countability_quantification.some_any_quantity", [sense("ingredients", "ингредиенты", "noun")], [], ["There are some ingredients."]),
  assignment(924, "en.grammar.countability_quantification.some_any_quantity", [sense("supplies", "запасы; принадлежности", "noun")], [], ["There are some supplies."]),
  assignment(925, "en.grammar.countability_quantification.some_any_quantity", [sense("utensils", "кухонные принадлежности", "noun")], [], ["There are some utensils."]),
  assignment(926, "en.grammar.countability_quantification.some_any_quantity", [sense("napkins", "салфетки", "noun")], [], ["There are some napkins."]),
  assignment(927, "en.grammar.countability_quantification.some_any_quantity", [sense("leftovers", "остатки еды", "noun")], [], ["There are some leftovers."]),
  assignment(928, "en.grammar.countability_quantification.some_any_quantity", [], ["en.groceries.noun.01", "en.ingredients.noun.01", "en.utensils.noun.01", "en.leftovers.noun.01"], ["There are some groceries.", "There are some ingredients.", "There are some utensils.", "There are some leftovers."]),
  // Lesson 17 / Chapter 5: each container noun appears in a unit-of frame,
  // keeping the countability operation observable and targets non-repeating.
  assignment(929, "en.grammar.countability_quantification.units_containers", [sense("jar", "банка", "noun")], [], ["There is a jar of jam."]),
  assignment(930, "en.grammar.countability_quantification.units_containers", [sense("carton", "картонная упаковка", "noun")], [], ["There is a carton of milk."]),
  assignment(931, "en.grammar.countability_quantification.units_containers", [sense("packet", "пакетик", "noun")], [], ["There is a packet of rice."]),
  assignment(932, "en.grammar.countability_quantification.units_containers", [sense("can", "банка; жестяная банка", "noun")], [], ["There is a can of soup."]),
  assignment(933, "en.grammar.countability_quantification.units_containers", [sense("tube", "тюбик", "noun")], [], ["There is a tube of cream."]),
  assignment(934, "en.grammar.countability_quantification.units_containers", [sense("sachet", "пакетик", "noun")], [], ["There is a sachet of tea."]),
  assignment(935, "en.grammar.countability_quantification.units_containers", [sense("roll", "рулон", "noun")], [], ["There is a roll of paper."]),
  assignment(936, "en.grammar.countability_quantification.units_containers", [], ["en.jar.noun.01", "en.packet.noun.01", "en.tube.noun.01", "en.roll.noun.01"], ["There is a jar of jam.", "There is a packet of rice.", "There is a tube of cream.", "There is a roll of paper."]),
  // Lesson 17 / Chapter 6: quantity transfer introduces a distinct food item
  // in each frame, preserving one lexical target per non-checkpoint packet.
  assignment(937, "en.grammar.countability_quantification.units_containers", [sense("lentils", "чечевица", "noun")], [], ["There is a bag of lentils."]),
  assignment(938, "en.grammar.countability_quantification.units_containers", [sense("oats", "овёс", "noun")], [], ["There is a bowl of oats."]),
  assignment(939, "en.grammar.countability_quantification.units_containers", [sense("flour", "мука", "noun")], [], ["There is a bag of flour."]),
  assignment(940, "en.grammar.countability_quantification.units_containers", [sense("vinegar", "уксус", "noun")], [], ["There is a bottle of vinegar."]),
  assignment(941, "en.grammar.countability_quantification.units_containers", [sense("yeast", "дрожжи", "noun")], [], ["There is a packet of yeast."]),
  assignment(942, "en.grammar.countability_quantification.units_containers", [sense("cereal", "хлопья", "noun")], [], ["There is a box of cereal."]),
  assignment(943, "en.grammar.countability_quantification.units_containers", [sense("pasta", "паста; макароны", "noun")], [], ["There is a bowl of pasta."]),
  assignment(944, "en.grammar.countability_quantification.units_containers", [], ["en.lentils.noun.01", "en.flour.noun.01", "en.yeast.noun.01", "en.pasta.noun.01"], ["There is a bag of lentils.", "There is a bag of flour.", "There is a packet of yeast.", "There is a bowl of pasta."]),
  // Lesson 17 / Chapter 7: transfer changes the ingredient domain but keeps
  // the unit/container decision and one fresh lexical target per packet.
  assignment(945, "en.grammar.countability_quantification.units_containers", [sense("cinnamon", "корица", "noun")], [], ["There is a spoon of cinnamon."]),
  assignment(946, "en.grammar.countability_quantification.units_containers", [sense("cocoa", "какао", "noun")], [], ["There is a cup of cocoa."]),
  assignment(947, "en.grammar.countability_quantification.units_containers", [sense("honey", "мёд", "noun")], [], ["There is a jar of honey."]),
  assignment(948, "en.grammar.countability_quantification.units_containers", [sense("mustard", "горчица", "noun")], [], ["There is a jar of mustard."]),
  assignment(949, "en.grammar.countability_quantification.units_containers", [sense("syrup", "сироп", "noun")], [], ["There is a bottle of syrup."]),
  assignment(950, "en.grammar.countability_quantification.units_containers", [sense("pepper", "перец", "noun")], [], ["There is a pinch of pepper."]),
  assignment(951, "en.grammar.countability_quantification.units_containers", [sense("oil", "масло", "noun")], [], ["There is a bottle of oil."]),
  assignment(952, "en.grammar.countability_quantification.units_containers", [], ["en.cinnamon.noun.01", "en.honey.noun.01", "en.syrup.noun.01", "en.oil.noun.01"], ["There is a spoon of cinnamon.", "There is a jar of honey.", "There is a bottle of syrup.", "There is a bottle of oil."]),
  // Lesson 18 / Chapter 1: each comparison retains the base adjective beside
  // its comparative form, grounding one distinct descriptive target.
  assignment(953, "en.grammar.comparison_degree.comparatives", [sense("narrow", "узкий", "adjective")], [], ["This road is narrow. That road is narrower."]),
  assignment(954, "en.grammar.comparison_degree.comparatives", [sense("wide", "широкий", "adjective")], [], ["This river is wide. That river is wider."]),
  assignment(955, "en.grammar.comparison_degree.comparatives", [sense("shallow", "мелкий", "adjective")], [], ["This pool is shallow. That pool is shallower."]),
  assignment(956, "en.grammar.comparison_degree.comparatives", [sense("steep", "крутой", "adjective")], [], ["This hill is steep. That hill is steeper."]),
  assignment(957, "en.grammar.comparison_degree.comparatives", [sense("gentle", "пологий; мягкий", "adjective")], [], ["This slope is gentle. That slope is gentler."]),
  assignment(958, "en.grammar.comparison_degree.comparatives", [sense("rough", "неровный; грубый", "adjective")], [], ["This path is rough. That path is rougher."]),
  assignment(959, "en.grammar.comparison_degree.comparatives", [sense("smooth", "гладкий", "adjective")], [], ["This surface is smooth. That surface is smoother."]),
  assignment(960, "en.grammar.comparison_degree.comparatives", [], ["en.narrow.adjective.01", "en.shallow.adjective.01", "en.gentle.adjective.01", "en.smooth.adjective.01"], ["This road is narrow. That road is narrower.", "This pool is shallow. That pool is shallower.", "This slope is gentle. That slope is gentler.", "This surface is smooth. That surface is smoother."]),
  // Lesson 18 / Chapter 2: each superlative retains its base adjective in the
  // opening clause, providing explicit lexical grounding and a real contrast.
  assignment(961, "en.grammar.comparison_degree.superlatives", [sense("durable", "прочный", "adjective")], [], ["This bus is durable. It is the most durable bus."]),
  assignment(962, "en.grammar.comparison_degree.superlatives", [sense("adaptable", "адаптивный", "adjective")], [], ["This plan is adaptable. It is the most adaptable plan."]),
  assignment(963, "en.grammar.comparison_degree.superlatives", [sense("practical", "практичный", "adjective")], [], ["This bag is practical. It is the most practical bag."]),
  assignment(964, "en.grammar.comparison_degree.superlatives", [sense("efficient", "эффективный", "adjective")], [], ["This route is efficient. It is the most efficient route."]),
  assignment(965, "en.grammar.comparison_degree.superlatives", [sense("precise", "точный", "adjective")], [], ["This answer is precise. It is the most precise answer."]),
  assignment(966, "en.grammar.comparison_degree.superlatives", [sense("convenient", "удобный", "adjective")], [], ["This time is convenient. It is the most convenient time."]),
  assignment(967, "en.grammar.comparison_degree.superlatives", [sense("affordable", "доступный по цене", "adjective")], [], ["This room is affordable. It is the most affordable room."]),
  assignment(968, "en.grammar.comparison_degree.superlatives", [], ["en.durable.adjective.01", "en.practical.adjective.01", "en.precise.adjective.01", "en.affordable.adjective.01"], ["This bus is durable. It is the most durable bus.", "This bag is practical. It is the most practical bag.", "This answer is precise. It is the most precise answer.", "This room is affordable. It is the most affordable room."]),
  // Lesson 18 / Chapter 3: one adjective per packet is held in a balanced
  // as…as comparison, making equality rather than degree the target meaning.
  assignment(969, "en.grammar.comparison_degree.as_as", [sense("modest", "скромный", "adjective")], [], ["This room is as modest as that room."]),
  assignment(970, "en.grammar.comparison_degree.as_as", [sense("loyal", "верный", "adjective")], [], ["This dog is as loyal as that dog."]),
  assignment(971, "en.grammar.comparison_degree.as_as", [sense("tidy", "аккуратный", "adjective")], [], ["This desk is as tidy as that desk."]),
  assignment(972, "en.grammar.comparison_degree.as_as", [sense("stable", "устойчивый", "adjective")], [], ["This chair is as stable as that chair."]),
  assignment(973, "en.grammar.comparison_degree.as_as", [sense("lively", "живой; энергичный", "adjective")], [], ["This street is as lively as that street."]),
  assignment(974, "en.grammar.comparison_degree.as_as", [sense("solid", "прочный", "adjective")], [], ["This wall is as solid as that wall."]),
  assignment(975, "en.grammar.comparison_degree.as_as", [sense("cheerful", "жизнерадостный", "adjective")], [], ["This host is as cheerful as that host."]),
  assignment(976, "en.grammar.comparison_degree.as_as", [], ["en.modest.adjective.01", "en.tidy.adjective.01", "en.lively.adjective.01", "en.cheerful.adjective.01"], ["This room is as modest as that room.", "This desk is as tidy as that desk.", "This street is as lively as that street.", "This host is as cheerful as that host."]),
  // Lesson 18 / Chapter 4: a unique adjective in each packet makes too/enough
  // a meaningful adequacy decision rather than a repeated sentence pattern.
  assignment(977, "en.grammar.comparison_degree.too_enough", [sense("fragile", "хрупкий", "adjective")], [], ["This glass is too fragile."]),
  assignment(978, "en.grammar.comparison_degree.too_enough", [sense("noisy", "шумный", "adjective")], [], ["This room is too noisy."]),
  assignment(979, "en.grammar.comparison_degree.too_enough", [sense("overwhelmed", "перегруженный", "adjective")], [], ["I am too overwhelmed."]),
  assignment(980, "en.grammar.comparison_degree.too_enough", [sense("crowded", "переполненный", "adjective")], [], ["This bus is too crowded."]),
  assignment(981, "en.grammar.comparison_degree.too_enough", [sense("distant", "далёкий", "adjective")], [], ["The station is too distant."]),
  assignment(982, "en.grammar.comparison_degree.too_enough", [sense("costly", "дорогой", "adjective")], [], ["This repair is too costly."]),
  assignment(983, "en.grammar.comparison_degree.too_enough", [sense("pressing", "неотложный", "adjective")], [], ["This matter is too pressing."]),
  assignment(984, "en.grammar.comparison_degree.too_enough", [], ["en.fragile.adjective.01", "en.overwhelmed.adjective.01", "en.distant.adjective.01", "en.pressing.adjective.01"], ["This glass is too fragile.", "I am too overwhelmed.", "The station is too distant.", "This matter is too pressing."]),
  // Lesson 18 / Chapter 5: each result frame introduces one vivid adjective
  // or noun while keeping so/such as the only grammatical decision.
  assignment(985, "en.grammar.comparison_degree.so_such", [sense("considerate", "внимательный к другим", "adjective")], [], ["She is so considerate."]),
  assignment(986, "en.grammar.comparison_degree.so_such", [sense("exhausted", "измученный", "adjective")], [], ["I am so exhausted."]),
  assignment(987, "en.grammar.comparison_degree.so_such", [sense("impressive", "впечатляющий", "adjective")], [], ["The view is so impressive."]),
  assignment(988, "en.grammar.comparison_degree.so_such", [sense("delicate", "нежный; хрупкий", "adjective")], [], ["This fabric is so delicate."]),
  assignment(989, "en.grammar.comparison_degree.so_such", [sense("remarkable", "выдающийся", "adjective")], [], ["The result is so remarkable."]),
  assignment(990, "en.grammar.comparison_degree.so_such", [sense("remark", "замечание", "noun")], [], ["It is such a remark."]),
  assignment(991, "en.grammar.comparison_degree.so_such", [sense("gesture", "жест", "noun")], [], ["It is such a gesture."]),
  assignment(992, "en.grammar.comparison_degree.so_such", [], ["en.considerate.adjective.01", "en.impressive.adjective.01", "en.remarkable.adjective.01", "en.gesture.noun.01"], ["She is so considerate.", "The view is so impressive.", "The result is so remarkable.", "It is such a gesture."]),
  // Lesson 18 / Chapter 6: each transfer prompt introduces one event noun in
  // a meaningful result frame, retaining the so/such contrast.
  assignment(993, "en.grammar.comparison_degree.so_such", [sense("applause", "аплодисменты", "noun")], [], ["There was such applause."]),
  assignment(994, "en.grammar.comparison_degree.so_such", [sense("confusion", "путаница", "noun")], [], ["There was such confusion."]),
  assignment(995, "en.grammar.comparison_degree.so_such", [sense("excitement", "волнение", "noun")], [], ["There was such excitement."]),
  assignment(996, "en.grammar.comparison_degree.so_such", [sense("relief", "облегчение", "noun")], [], ["There was such relief."]),
  assignment(997, "en.grammar.comparison_degree.so_such", [sense("laughter", "смех", "noun")], [], ["There was such laughter."]),
  assignment(998, "en.grammar.comparison_degree.so_such", [sense("silence", "тишина", "noun")], [], ["There was such silence."]),
  assignment(999, "en.grammar.comparison_degree.so_such", [sense("curiosity", "любопытство", "noun")], [], ["There was such curiosity."]),
  assignment(1000, "en.grammar.comparison_degree.so_such", [], ["en.applause.noun.01", "en.excitement.noun.01", "en.laughter.noun.01", "en.curiosity.noun.01"], ["There was such applause.", "There was such excitement.", "There was such laughter.", "There was such curiosity."]),
  // Lesson 18 / Chapter 7: final transfer keeps the same diagnostic relation
  // while every packet carries a unique environmental noun.
  assignment(1001, "en.grammar.comparison_degree.so_such", [sense("heat", "жара; тепло", "noun")], [], ["There was such heat."]),
  assignment(1002, "en.grammar.comparison_degree.so_such", [sense("cold", "холод", "noun")], [], ["There was such cold."]),
  assignment(1003, "en.grammar.comparison_degree.so_such", [sense("dust", "пыль", "noun")], [], ["There was such dust."]),
  assignment(1004, "en.grammar.comparison_degree.so_such", [sense("smoke", "дым", "noun")], [], ["There was such smoke."]),
  assignment(1005, "en.grammar.comparison_degree.so_such", [sense("rainfall", "осадки", "noun")], [], ["There was such rainfall."]),
  assignment(1006, "en.grammar.comparison_degree.so_such", [sense("wind", "ветер", "noun")], [], ["There was such wind."]),
  assignment(1007, "en.grammar.comparison_degree.so_such", [sense("fog", "туман", "noun")], [], ["There was such fog."]),
  assignment(1008, "en.grammar.comparison_degree.so_such", [], ["en.heat.noun.01", "en.dust.noun.01", "en.rainfall.noun.01", "en.fog.noun.01"], ["There was such heat.", "There was such dust.", "There was such rainfall.", "There was such fog."]),
  // Lesson 19 / Chapter 1: every ability sentence keeps can visible and gives
  // the learner one unique base-verb target.
  assignment(1009, "en.grammar.ability_permission.can_present_ability", [sense("interpret", "интерпретировать", "verb")], [], ["I can interpret it."]),
  assignment(1010, "en.grammar.ability_permission.can_present_ability", [sense("classify", "классифицировать", "verb")], [], ["I can classify it."]),
  assignment(1011, "en.grammar.ability_permission.can_present_ability", [sense("illustrate", "иллюстрировать", "verb")], [], ["I can illustrate it."]),
  assignment(1012, "en.grammar.ability_permission.can_present_ability", [sense("estimate", "оценивать", "verb")], [], ["I can estimate it."]),
  assignment(1013, "en.grammar.ability_permission.can_present_ability", [sense("memorize", "запоминать", "verb")], [], ["I can memorize it."]),
  assignment(1014, "en.grammar.ability_permission.can_present_ability", [sense("concentrate", "концентрироваться", "verb")], [], ["I can concentrate."]),
  assignment(1015, "en.grammar.ability_permission.can_present_ability", [sense("summarize", "подводить итог", "verb")], [], ["I can summarize it."]),
  assignment(1016, "en.grammar.ability_permission.can_present_ability", [], ["en.interpret.verb.01", "en.illustrate.verb.01", "en.memorize.verb.01", "en.summarize.verb.01"], ["I can interpret it.", "I can illustrate it.", "I can memorize it.", "I can summarize it."]),
  // Lesson 19 / Chapter 2: a completed earlier skill is expressed through
  // could plus one new base verb in each packet.
  assignment(1017, "en.grammar.ability_permission.could_past_ability", [sense("simulate", "моделировать", "verb")], [], ["I could simulate it."]),
  assignment(1018, "en.grammar.ability_permission.could_past_ability", [sense("construct", "строить", "verb")], [], ["I could construct it."]),
  assignment(1019, "en.grammar.ability_permission.could_past_ability", [sense("restore", "восстанавливать", "verb")], [], ["I could restore it."]),
  assignment(1020, "en.grammar.ability_permission.could_past_ability", [sense("identify", "определять", "verb")], [], ["I could identify it."]),
  assignment(1021, "en.grammar.ability_permission.could_past_ability", [sense("influence", "влиять", "verb")], [], ["I could influence it."]),
  assignment(1022, "en.grammar.ability_permission.could_past_ability", [sense("verify", "проверять", "verb")], [], ["I could verify it."]),
  assignment(1023, "en.grammar.ability_permission.could_past_ability", [sense("predict", "предсказывать", "verb")], [], ["I could predict it."]),
  assignment(1024, "en.grammar.ability_permission.could_past_ability", [], ["en.simulate.verb.01", "en.restore.verb.01", "en.influence.verb.01", "en.predict.verb.01"], ["I could simulate it.", "I could restore it.", "I could influence it.", "I could predict it."]),
  // Lesson 19 / Chapter 3: each permission request contains one distinct noun
  // target while may remains the explicit formal-permission signal.
  assignment(1025, "en.grammar.ability_permission.may_permission", [sense("application", "заявление", "noun")], [], ["May I submit the application?"]),
  assignment(1026, "en.grammar.ability_permission.may_permission", [sense("document", "документ", "noun")], [], ["May I copy the document?"]),
  assignment(1027, "en.grammar.ability_permission.may_permission", [sense("clearance", "допуск", "noun")], [], ["May I show the clearance?"]),
  assignment(1028, "en.grammar.ability_permission.may_permission", [sense("certificate", "сертификат", "noun")], [], ["May I collect the certificate?"]),
  assignment(1029, "en.grammar.ability_permission.may_permission", [sense("license", "лицензия", "noun")], [], ["May I check the license?"]),
  assignment(1030, "en.grammar.ability_permission.may_permission", [sense("signature", "подпись", "noun")], [], ["May I add my signature?"]),
  assignment(1031, "en.grammar.ability_permission.may_permission", [sense("lanyard", "шнурок для бейджа", "noun")], [], ["May I wear the lanyard?"]),
  assignment(1032, "en.grammar.ability_permission.may_permission", [], ["en.application.noun.01", "en.clearance.noun.01", "en.license.noun.01", "en.lanyard.noun.01"], ["May I submit the application?", "May I show the clearance?", "May I check the license?", "May I wear the lanyard?"]),
  // Lesson 19 / Chapter 4: be able to remains the productive ability frame;
  // every packet adds a distinct workplace-action verb.
  assignment(1033, "en.grammar.ability_permission.be_able_to", [sense("coordinate", "координировать", "verb")], [], ["I will be able to coordinate."]),
  assignment(1034, "en.grammar.ability_permission.be_able_to", [sense("facilitate", "облегчать; содействовать", "verb")], [], ["I will be able to facilitate the meeting."]),
  assignment(1035, "en.grammar.ability_permission.be_able_to", [sense("delegate", "делегировать", "verb")], [], ["I will be able to delegate the task."]),
  assignment(1036, "en.grammar.ability_permission.be_able_to", [sense("allocate", "распределять", "verb")], [], ["I will be able to allocate the budget."]),
  assignment(1037, "en.grammar.ability_permission.be_able_to", [sense("collaborate", "сотрудничать", "verb")], [], ["I will be able to collaborate."]),
  assignment(1038, "en.grammar.ability_permission.be_able_to", [sense("streamline", "оптимизировать", "verb")], [], ["I will be able to streamline the process."]),
  assignment(1039, "en.grammar.ability_permission.be_able_to", [sense("prioritize", "определять приоритеты", "verb")], [], ["I will be able to prioritize the work."]),
  assignment(1040, "en.grammar.ability_permission.be_able_to", [], ["en.coordinate.verb.01", "en.delegate.verb.01", "en.collaborate.verb.01", "en.prioritize.verb.01"], ["I will be able to coordinate.", "I will be able to delegate the task.", "I will be able to collaborate.", "I will be able to prioritize the work."]),
  // Lesson 19 / Chapter 5: polite requests introduce one concrete shared-space
  // noun each, while can/could carries the permission distinction.
  assignment(1041, "en.grammar.ability_permission.polite_permission", [sense("socket", "розетка", "noun")], [], ["Can I use the socket?"]),
  assignment(1042, "en.grammar.ability_permission.polite_permission", [sense("thermostat", "термостат", "noun")], [], ["Could I adjust the thermostat?"]),
  assignment(1043, "en.grammar.ability_permission.polite_permission", [sense("blinds", "жалюзи", "noun")], [], ["Could I close the blinds?"]),
  assignment(1044, "en.grammar.ability_permission.polite_permission", [sense("radiator", "радиатор", "noun")], [], ["Can I turn off the radiator?"]),
  assignment(1045, "en.grammar.ability_permission.polite_permission", [sense("whiteboard", "маркерная доска", "noun")], [], ["Could I use the whiteboard?"]),
  assignment(1046, "en.grammar.ability_permission.polite_permission", [sense("stool", "табурет", "noun")], [], ["Can I move the stool?"]),
  assignment(1047, "en.grammar.ability_permission.polite_permission", [sense("outlet", "розетка", "noun")], [], ["Could I use this outlet?"]),
  assignment(1048, "en.grammar.ability_permission.polite_permission", [], ["en.socket.noun.01", "en.blinds.noun.01", "en.whiteboard.noun.01", "en.outlet.noun.01"], ["Can I use the socket?", "Could I close the blinds?", "Could I use the whiteboard?", "Could I use this outlet?"]),
  // Lesson 19 / Chapters 6–7: mixed review keeps ability and permission
  // meaningful while extending a distinct operational vocabulary.
  assignment(1049, "en.grammar.ability_permission.polite_permission", [sense("clarify", "уточнять", "verb")], [], ["Could I clarify the plan?"]),
  assignment(1050, "en.grammar.ability_permission.be_able_to", [sense("postpone", "откладывать", "verb")], [], ["I will be able to postpone the meeting."]),
  assignment(1051, "en.grammar.ability_permission.may_permission", [sense("reschedule", "переносить на другое время", "verb")], [], ["May I reschedule the meeting?"]),
  assignment(1052, "en.grammar.ability_permission.can_present_ability", [sense("arrange", "организовывать", "verb")], [], ["I can arrange the meeting."]),
  assignment(1053, "en.grammar.ability_permission.could_past_ability", [sense("accommodate", "учитывать; размещать", "verb")], [], ["I could accommodate the request."]),
  assignment(1054, "en.grammar.ability_permission.polite_permission", [sense("inquire", "справляться; запрашивать информацию", "verb")], [], ["Could I inquire about the date?"]),
  assignment(1055, "en.grammar.ability_permission.be_able_to", [sense("reconsider", "пересматривать решение", "verb")], [], ["I will be able to reconsider the plan."]),
  assignment(1056, "en.grammar.ability_permission.polite_permission", [], ["en.clarify.verb.01", "en.reschedule.verb.01", "en.inquire.verb.01", "en.reconsider.verb.01"], ["Could I clarify the plan?", "May I reschedule the meeting?", "Could I inquire about the date?", "I will be able to reconsider the plan."]),
  assignment(1057, "en.grammar.ability_permission.may_permission", [sense("protocol", "протокол", "noun")], [], ["May I read the protocol?"]),
  assignment(1058, "en.grammar.ability_permission.can_present_ability", [sense("guideline", "рекомендация; правило", "noun")], [], ["I can follow the guideline."]),
  assignment(1059, "en.grammar.ability_permission.could_past_ability", [sense("contingency", "непредвиденная ситуация", "noun")], [], ["I could explain the contingency."]),
  assignment(1060, "en.grammar.ability_permission.be_able_to", [sense("procedure", "процедура", "noun")], [], ["I will be able to apply the procedure."]),
  assignment(1061, "en.grammar.ability_permission.polite_permission", [sense("framework", "структура; основа", "noun")], [], ["Can I use the framework?"]),
  assignment(1062, "en.grammar.ability_permission.may_permission", [sense("criterion", "критерий", "noun")], [], ["May I check the criterion?"]),
  assignment(1063, "en.grammar.ability_permission.polite_permission", [sense("policy", "политика; правило", "noun")], [], ["Could I revise the policy?"]),
  assignment(1064, "en.grammar.ability_permission.polite_permission", [], ["en.protocol.noun.01", "en.contingency.noun.01", "en.framework.noun.01", "en.policy.noun.01"], ["May I read the protocol?", "I could explain the contingency.", "Can I use the framework?", "Could I revise the policy?"]),
  // Lesson 20 / Chapter 1: must is grounded in concrete obligations rather
  // than abstract rule labels; the checkpoint retrieves only familiar targets.
  assignment(1065, "en.grammar.obligation_prohibition_advice.must_obligation", [sense("prescription", "рецепт врача", "noun")], [], ["You must bring the prescription."]),
  assignment(1066, "en.grammar.obligation_prohibition_advice.must_obligation", [sense("waiver", "отказ от претензий; согласие", "noun")], [], ["You must sign the waiver."]),
  assignment(1067, "en.grammar.obligation_prohibition_advice.must_obligation", [sense("orientation", "вводный инструктаж", "noun")], [], ["You must attend the orientation."]),
  assignment(1068, "en.grammar.obligation_prohibition_advice.must_obligation", [sense("consent", "согласие", "noun")], [], ["You must give consent."]),
  assignment(1069, "en.grammar.obligation_prohibition_advice.must_obligation", [sense("checklist", "контрольный список", "noun")], [], ["You must complete the checklist."]),
  assignment(1070, "en.grammar.obligation_prohibition_advice.must_obligation", [sense("workstation", "рабочее место", "noun")], [], ["You must clean the workstation."]),
  assignment(1071, "en.grammar.obligation_prohibition_advice.must_obligation", [sense("attendance", "посещаемость; присутствие", "noun")], [], ["You must record attendance."]),
  assignment(1072, "en.grammar.obligation_prohibition_advice.must_obligation", [], ["en.prescription.noun.01", "en.orientation.noun.01", "en.checklist.noun.01", "en.attendance.noun.01"], ["You must bring the prescription.", "You must attend the orientation.", "You must complete the checklist.", "You must record attendance."]),
  // Lesson 20 / Chapter 2: externally imposed requirements make have to
  // semantically visible, with one distinct administrative noun per packet.
  assignment(1073, "en.grammar.obligation_prohibition_advice.have_to_external", [sense("vaccination", "вакцинация", "noun")], [], ["We have to show the vaccination record."]),
  assignment(1074, "en.grammar.obligation_prohibition_advice.have_to_external", [sense("fingerprint", "отпечаток пальца", "noun")], [], ["We have to provide a fingerprint."]),
  assignment(1075, "en.grammar.obligation_prohibition_advice.have_to_external", [sense("registration", "регистрация", "noun")], [], ["We have to complete the registration."]),
  assignment(1076, "en.grammar.obligation_prohibition_advice.have_to_external", [sense("induction", "вводный курс", "noun")], [], ["We have to attend the induction."]),
  assignment(1077, "en.grammar.obligation_prohibition_advice.have_to_external", [sense("training", "обучение", "noun")], [], ["We have to finish the training."]),
  assignment(1078, "en.grammar.obligation_prohibition_advice.have_to_external", [sense("membership", "членство", "noun")], [], ["We have to renew the membership."]),
  assignment(1079, "en.grammar.obligation_prohibition_advice.have_to_external", [sense("screening", "проверка; досмотр", "noun")], [], ["We have to pass the screening."]),
  assignment(1080, "en.grammar.obligation_prohibition_advice.have_to_external", [], ["en.vaccination.noun.01", "en.registration.noun.01", "en.training.noun.01", "en.screening.noun.01"], ["We have to show the vaccination record.", "We have to complete the registration.", "We have to finish the training.", "We have to pass the screening."]),
  // Lesson 20 / Chapter 3: should is advice, so every lexical target is an
  // optional self-care or practical action rather than an imposed duty.
  assignment(1081, "en.grammar.obligation_prohibition_advice.should_advice", [sense("hydrate", "поддерживать водный баланс", "verb")], [], ["You should hydrate."]),
  assignment(1082, "en.grammar.obligation_prohibition_advice.should_advice", [sense("ventilate", "проветривать", "verb")], [], ["You should ventilate the room."]),
  assignment(1083, "en.grammar.obligation_prohibition_advice.should_advice", [sense("consult", "консультироваться", "verb")], [], ["You should consult a doctor."]),
  assignment(1084, "en.grammar.obligation_prohibition_advice.should_advice", [sense("unplug", "отключать от сети", "verb")], [], ["You should unplug the device."]),
  assignment(1085, "en.grammar.obligation_prohibition_advice.should_advice", [sense("recharge", "перезаряжать", "verb")], [], ["You should recharge the battery."]),
  assignment(1086, "en.grammar.obligation_prohibition_advice.should_advice", [sense("moderate", "умерять", "verb")], [], ["You should moderate the pace."]),
  assignment(1087, "en.grammar.obligation_prohibition_advice.should_advice", [sense("alternate", "чередовать", "verb")], [], ["You should alternate the tasks."]),
  assignment(1088, "en.grammar.obligation_prohibition_advice.should_advice", [], ["en.hydrate.verb.01", "en.consult.verb.01", "en.recharge.verb.01", "en.alternate.verb.01"], ["You should hydrate.", "You should consult a doctor.", "You should recharge the battery.", "You should alternate the tasks."]),
  // Lesson 20 / Chapter 4: ought to carries considered social advice, grounded
  // in distinct relationship-repair and judgement verbs.
  assignment(1089, "en.grammar.obligation_prohibition_advice.ought_to_advice", [sense("apologize", "извиняться", "verb")], [], ["You ought to apologize."]),
  assignment(1090, "en.grammar.obligation_prohibition_advice.ought_to_advice", [sense("reconcile", "мириться; примирять", "verb")], [], ["You ought to reconcile with her."]),
  assignment(1091, "en.grammar.obligation_prohibition_advice.ought_to_advice", [sense("acknowledge", "признавать", "verb")], [], ["You ought to acknowledge the mistake."]),
  assignment(1092, "en.grammar.obligation_prohibition_advice.ought_to_advice", [sense("respect", "уважать", "verb")], [], ["You ought to respect the boundary."]),
  assignment(1093, "en.grammar.obligation_prohibition_advice.ought_to_advice", [sense("appreciate", "ценить", "verb")], [], ["You ought to appreciate the effort."]),
  assignment(1094, "en.grammar.obligation_prohibition_advice.ought_to_advice", [sense("compromise", "идти на компромисс", "verb")], [], ["You ought to compromise."]),
  assignment(1095, "en.grammar.obligation_prohibition_advice.ought_to_advice", [sense("confess", "признаваться", "verb")], [], ["You ought to confess the truth."]),
  assignment(1096, "en.grammar.obligation_prohibition_advice.ought_to_advice", [], ["en.apologize.verb.01", "en.acknowledge.verb.01", "en.appreciate.verb.01", "en.confess.verb.01"], ["You ought to apologize.", "You ought to acknowledge the mistake.", "You ought to appreciate the effort.", "You ought to confess the truth."]),
  // Lesson 20 / Chapter 5: needn't removes an unnecessary action or document
  // in a concrete service context, without implying prohibition.
  assignment(1097, "en.grammar.obligation_prohibition_advice.neednt", [sense("print", "распечатывать", "verb")], [], ["You needn't print the ticket."]),
  assignment(1098, "en.grammar.obligation_prohibition_advice.neednt", [sense("deposit", "залог", "noun")], [], ["You needn't pay the deposit."]),
  assignment(1099, "en.grammar.obligation_prohibition_advice.neednt", [sense("rsvp", "подтверждать участие", "verb")], [], ["You needn't RSVP today."]),
  assignment(1100, "en.grammar.obligation_prohibition_advice.neednt", [sense("confirmation", "подтверждение", "noun")], [], ["You needn't bring the confirmation."]),
  assignment(1101, "en.grammar.obligation_prohibition_advice.neednt", [sense("replacement", "замена", "noun")], [], ["You needn't request a replacement."]),
  assignment(1102, "en.grammar.obligation_prohibition_advice.neednt", [sense("download", "скачивать", "verb")], [], ["You needn't download the file."]),
  assignment(1103, "en.grammar.obligation_prohibition_advice.neednt", [sense("refund", "возврат денег", "noun")], [], ["You needn't ask for a refund."]),
  assignment(1104, "en.grammar.obligation_prohibition_advice.neednt", [], ["en.print.verb.01", "en.rsvp.verb.01", "en.replacement.noun.01", "en.refund.noun.01"], ["You needn't print the ticket.", "You needn't RSVP today.", "You needn't request a replacement.", "You needn't ask for a refund."]),
  // Lesson 20 / Chapter 6: don't have to is grounded in optional preparation
  // materials, distinct from the urgent absence of necessity in Chapter 5.
  assignment(1105, "en.grammar.obligation_prohibition_advice.dont_have_to", [sense("backup", "резервная копия", "noun")], [], ["You don't have to make a backup."]),
  assignment(1106, "en.grammar.obligation_prohibition_advice.dont_have_to", [sense("password", "пароль", "noun")], [], ["You don't have to share the password."]),
  assignment(1107, "en.grammar.obligation_prohibition_advice.dont_have_to", [sense("photocopy", "фотокопия", "noun")], [], ["You don't have to bring a photocopy."]),
  assignment(1108, "en.grammar.obligation_prohibition_advice.dont_have_to", [sense("handbook", "справочник; руководство", "noun")], [], ["You don't have to read the handbook."]),
  assignment(1109, "en.grammar.obligation_prohibition_advice.dont_have_to", [sense("stapler", "степлер", "noun")], [], ["You don't have to bring a stapler."]),
  assignment(1110, "en.grammar.obligation_prohibition_advice.dont_have_to", [sense("calculator", "калькулятор", "noun")], [], ["You don't have to use a calculator."]),
  assignment(1111, "en.grammar.obligation_prohibition_advice.dont_have_to", [sense("manual", "инструкция", "noun")], [], ["You don't have to keep the manual."]),
  assignment(1112, "en.grammar.obligation_prohibition_advice.dont_have_to", [], ["en.backup.noun.01", "en.photocopy.noun.01", "en.stapler.noun.01", "en.manual.noun.01"], ["You don't have to make a backup.", "You don't have to bring a photocopy.", "You don't have to bring a stapler.", "You don't have to keep the manual."]),
  // Lesson 20 / Chapter 7: mustn't is reserved for genuine prohibitions with
  // a concrete unsafe, dishonest, or rule-breaking action in each packet.
  assignment(1113, "en.grammar.obligation_prohibition_advice.mustnt", [sense("trespass", "проникать без разрешения", "verb")], [], ["You mustn't trespass here."]),
  assignment(1114, "en.grammar.obligation_prohibition_advice.mustnt", [sense("disclose", "раскрывать", "verb")], [], ["You mustn't disclose the password."]),
  assignment(1115, "en.grammar.obligation_prohibition_advice.mustnt", [sense("tamper", "вмешиваться; портить", "verb")], [], ["You mustn't tamper with the device."]),
  assignment(1116, "en.grammar.obligation_prohibition_advice.mustnt", [sense("obstruct", "загораживать", "verb")], [], ["You mustn't obstruct the exit."]),
  assignment(1117, "en.grammar.obligation_prohibition_advice.mustnt", [sense("litter", "мусорить", "verb")], [], ["You mustn't litter here."]),
  assignment(1118, "en.grammar.obligation_prohibition_advice.mustnt", [sense("bypass", "обходить", "verb")], [], ["You mustn't bypass the check."]),
  assignment(1119, "en.grammar.obligation_prohibition_advice.mustnt", [sense("impersonate", "выдавать себя за другого", "verb")], [], ["You mustn't impersonate anyone."]),
  assignment(1120, "en.grammar.obligation_prohibition_advice.mustnt", [], ["en.trespass.verb.01", "en.tamper.verb.01", "en.litter.verb.01", "en.impersonate.verb.01"], ["You mustn't trespass here.", "You mustn't tamper with the device.", "You mustn't litter here.", "You mustn't impersonate anyone."]),
  // Lesson 21 / Chapter 1: every new hobby verb appears in its -ing form after
  // a gerund-complement verb, giving the form a meaningful lexical context.
  assignment(1121, "en.grammar.verb_complement_patterns.gerund_complements", [sense("sculpt", "ваять; лепить", "verb")], [], ["I enjoy sculpting."]),
  assignment(1122, "en.grammar.verb_complement_patterns.gerund_complements", [sense("snorkel", "нырять с маской", "verb")], [], ["She likes snorkeling."]),
  assignment(1123, "en.grammar.verb_complement_patterns.gerund_complements", [sense("crochet", "вязать крючком", "verb")], [], ["We enjoy crocheting."]),
  assignment(1124, "en.grammar.verb_complement_patterns.gerund_complements", [sense("compose", "сочинять", "verb")], [], ["He likes composing music."]),
  assignment(1125, "en.grammar.verb_complement_patterns.gerund_complements", [sense("journal", "вести дневник", "verb")], [], ["I enjoy journaling."]),
  assignment(1126, "en.grammar.verb_complement_patterns.gerund_complements", [sense("birdwatch", "наблюдать за птицами", "verb")], [], ["They like birdwatching."]),
  assignment(1127, "en.grammar.verb_complement_patterns.gerund_complements", [sense("stargaze", "наблюдать за звёздами", "verb")], [], ["We enjoy stargazing."]),
  assignment(1128, "en.grammar.verb_complement_patterns.gerund_complements", [], ["en.sculpt.verb.01", "en.crochet.verb.01", "en.journal.verb.01", "en.stargaze.verb.01"], ["I enjoy sculpting.", "We enjoy crocheting.", "I enjoy journaling.", "We enjoy stargazing."]),
  // Lesson 21 / Chapter 2: each new verb naturally selects a following to-
  // infinitive, making the complement pattern visible in a meaningful goal.
  assignment(1129, "en.grammar.verb_complement_patterns.infinitive_complements", [sense("aspire", "стремиться", "verb")], [], ["I aspire to lead."]),
  assignment(1130, "en.grammar.verb_complement_patterns.infinitive_complements", [sense("refuse", "отказываться", "verb")], [], ["She refused to sign."]),
  assignment(1131, "en.grammar.verb_complement_patterns.infinitive_complements", [sense("attempt", "пытаться", "verb")], [], ["We attempted to solve it."]),
  assignment(1132, "en.grammar.verb_complement_patterns.infinitive_complements", [sense("afford", "позволить себе", "verb")], [], ["I can't afford to travel."]),
  assignment(1133, "en.grammar.verb_complement_patterns.infinitive_complements", [sense("pretend", "притворяться", "verb")], [], ["He pretended to agree."]),
  assignment(1134, "en.grammar.verb_complement_patterns.infinitive_complements", [sense("intend", "намереваться", "verb")], [], ["They intend to stay."]),
  assignment(1135, "en.grammar.verb_complement_patterns.infinitive_complements", [sense("strive", "стараться", "verb")], [], ["I strive to improve."]),
  assignment(1136, "en.grammar.verb_complement_patterns.infinitive_complements", [], ["en.aspire.verb.01", "en.attempt.verb.01", "en.pretend.verb.01", "en.strive.verb.01"], ["I aspire to lead.", "We attempted to solve it.", "He pretended to agree.", "I strive to improve."]),
  // Lesson 21 / Chapter 3: preferences and needs choose meaningful personal
  // goals; each lexical noun appears in one permitted complement frame.
  assignment(1137, "en.grammar.verb_complement_patterns.want_need_like_prefer", [sense("internship", "стажировка", "noun")], [], ["I want an internship."]),
  assignment(1138, "en.grammar.verb_complement_patterns.want_need_like_prefer", [sense("promotion", "повышение", "noun")], [], ["She wants a promotion."]),
  assignment(1139, "en.grammar.verb_complement_patterns.want_need_like_prefer", [sense("relocation", "переезд", "noun")], [], ["We need a relocation plan."]),
  assignment(1140, "en.grammar.verb_complement_patterns.want_need_like_prefer", [sense("scholarship", "стипендия", "noun")], [], ["He wants a scholarship."]),
  assignment(1141, "en.grammar.verb_complement_patterns.want_need_like_prefer", [sense("flexibility", "гибкость", "noun")], [], ["I prefer flexibility."]),
  assignment(1142, "en.grammar.verb_complement_patterns.want_need_like_prefer", [sense("stability", "стабильность", "noun")], [], ["They prefer stability."]),
  assignment(1143, "en.grammar.verb_complement_patterns.want_need_like_prefer", [sense("autonomy", "самостоятельность", "noun")], [], ["We want autonomy."]),
  assignment(1144, "en.grammar.verb_complement_patterns.want_need_like_prefer", [], ["en.internship.noun.01", "en.relocation.noun.01", "en.flexibility.noun.01", "en.autonomy.noun.01"], ["I want an internship.", "We need a relocation plan.", "I prefer flexibility.", "We want autonomy."]),
  // Lesson 21 / Chapter 4: requests and preferences make the object +
  // infinitive complement explicit while each packet adds one fresh action.
  assignment(1145, "en.grammar.verb_complement_patterns.object_infinitive", [sense("approve", "одобрять", "verb")], [], ["I want you to approve it."]),
  assignment(1146, "en.grammar.verb_complement_patterns.object_infinitive", [sense("notify", "уведомлять", "verb")], [], ["We need them to notify us."]),
  assignment(1147, "en.grammar.verb_complement_patterns.object_infinitive", [sense("relocate", "перемещать; переселять", "verb")], [], ["They want us to relocate."]),
  assignment(1148, "en.grammar.verb_complement_patterns.object_infinitive", [sense("accompany", "сопровождать", "verb")], [], ["I need you to accompany me."]),
  assignment(1149, "en.grammar.verb_complement_patterns.object_infinitive", [sense("nominate", "выдвигать кандидатуру", "verb")], [], ["We want them to nominate her."]),
  assignment(1150, "en.grammar.verb_complement_patterns.object_infinitive", [sense("authorize", "разрешать официально", "verb")], [], ["I need you to authorize it."]),
  assignment(1151, "en.grammar.verb_complement_patterns.object_infinitive", [sense("encourage", "поощрять", "verb")], [], ["She wants us to encourage him."]),
  assignment(1152, "en.grammar.verb_complement_patterns.object_infinitive", [], ["en.approve.verb.01", "en.relocate.verb.01", "en.nominate.verb.01", "en.encourage.verb.01"], ["I want you to approve it.", "They want us to relocate.", "We want them to nominate her.", "She wants us to encourage him."]),
  // Lesson 21 / Chapter 5: every new action has a visible practical purpose
  // in a to-infinitive phrase instead of a detached lexical example.
  assignment(1153, "en.grammar.verb_complement_patterns.infinitive_purpose", [sense("enroll", "записываться", "verb")], [], ["I called to enroll."]),
  assignment(1154, "en.grammar.verb_complement_patterns.infinitive_purpose", [sense("exchange", "обменивать", "verb")], [], ["She went out to exchange it."]),
  assignment(1155, "en.grammar.verb_complement_patterns.infinitive_purpose", [sense("retrieve", "забирать; извлекать", "verb")], [], ["We came to retrieve the file."]),
  assignment(1156, "en.grammar.verb_complement_patterns.infinitive_purpose", [sense("weigh", "взвешивать", "verb")], [], ["He stopped to weigh the parcel."]),
  assignment(1157, "en.grammar.verb_complement_patterns.infinitive_purpose", [sense("renew", "продлевать", "verb")], [], ["I visited to renew my membership."]),
  assignment(1158, "en.grammar.verb_complement_patterns.infinitive_purpose", [sense("activate", "активировать", "verb")], [], ["They called to activate the card."]),
  assignment(1159, "en.grammar.verb_complement_patterns.infinitive_purpose", [sense("calibrate", "калибровать", "verb")], [], ["We met to calibrate the device."]),
  assignment(1160, "en.grammar.verb_complement_patterns.infinitive_purpose", [], ["en.enroll.verb.01", "en.retrieve.verb.01", "en.renew.verb.01", "en.calibrate.verb.01"], ["I called to enroll.", "We came to retrieve the file.", "I visited to renew my membership.", "We met to calibrate the device."]),
  // Lesson 21 / Chapter 6: delayed mixed review keeps complement choices in
  // use while adding distinct education and support nouns.
  assignment(1161, "en.grammar.verb_complement_patterns.want_need_like_prefer", [sense("tutorial", "обучающий разбор", "noun")], [], ["I want a tutorial."]),
  assignment(1162, "en.grammar.verb_complement_patterns.want_need_like_prefer", [sense("seminar", "семинар", "noun")], [], ["We need a seminar."]),
  assignment(1163, "en.grammar.verb_complement_patterns.gerund_complements", [sense("webinar", "вебинар", "noun")], [], ["She likes the webinar."]),
  assignment(1164, "en.grammar.verb_complement_patterns.want_need_like_prefer", [sense("mentorship", "наставничество", "noun")], [], ["They prefer mentorship."]),
  assignment(1165, "en.grammar.verb_complement_patterns.infinitive_purpose", [sense("referral", "направление; рекомендация", "noun")], [], ["I called to request a referral."]),
  assignment(1166, "en.grammar.verb_complement_patterns.object_infinitive", [sense("syllabus", "программа курса", "noun")], [], ["I need you to read the syllabus."]),
  assignment(1167, "en.grammar.verb_complement_patterns.want_need_like_prefer", [sense("curriculum", "учебный план", "noun")], [], ["We prefer this curriculum."]),
  assignment(1168, "en.grammar.verb_complement_patterns.want_need_like_prefer", [], ["en.tutorial.noun.01", "en.webinar.noun.01", "en.referral.noun.01", "en.curriculum.noun.01"], ["I want a tutorial.", "She likes the webinar.", "I called to request a referral.", "We prefer this curriculum."]),
  // Lesson 21 / Chapter 7: final retrieval uses new career-development nouns
  // in the already established complement patterns, not as isolated labels.
  assignment(1169, "en.grammar.verb_complement_patterns.want_need_like_prefer", [sense("apprenticeship", "ученичество; стажировка", "noun")], [], ["I want an apprenticeship."]),
  assignment(1170, "en.grammar.verb_complement_patterns.want_need_like_prefer", [sense("credential", "квалификационный документ", "noun")], [], ["She needs a credential."]),
  assignment(1171, "en.grammar.verb_complement_patterns.infinitive_purpose", [sense("qualification", "квалификация", "noun")], [], ["We met to discuss the qualification."]),
  assignment(1172, "en.grammar.verb_complement_patterns.want_need_like_prefer", [sense("vacancy", "вакансия", "noun")], [], ["They want a vacancy list."]),
  assignment(1173, "en.grammar.verb_complement_patterns.gerund_complements", [sense("prospect", "перспектива", "noun")], [], ["I like the prospect."]),
  assignment(1174, "en.grammar.verb_complement_patterns.object_infinitive", [sense("employer", "работодатель", "noun")], [], ["I need the employer to reply."]),
  assignment(1175, "en.grammar.verb_complement_patterns.object_infinitive", [sense("applicant", "заявитель; кандидат", "noun")], [], ["We want the applicant to reply."]),
  assignment(1176, "en.grammar.verb_complement_patterns.want_need_like_prefer", [], ["en.apprenticeship.noun.01", "en.qualification.noun.01", "en.prospect.noun.01", "en.applicant.noun.01"], ["I want an apprenticeship.", "We met to discuss the qualification.", "I like the prospect.", "We want the applicant to reply."]),
  // Lesson 22 / Chapter 1: each new social verb directly selects a familiar
  // object pronoun so reference is part of the lexical meaning in context.
  assignment(1177, "en.grammar.pronoun_reference.object_pronouns", [sense("recommend", "рекомендовать", "verb")], [], ["Please recommend me for the role."]),
  assignment(1178, "en.grammar.pronoun_reference.object_pronouns", [sense("offer", "предлагать", "verb")], [], ["They offer us help."]),
  assignment(1179, "en.grammar.pronoun_reference.object_pronouns", [sense("advise", "советовать", "verb")], [], ["She advised him."]),
  assignment(1180, "en.grammar.pronoun_reference.object_pronouns", [sense("congratulate", "поздравлять", "verb")], [], ["We congratulated her."]),
  assignment(1181, "en.grammar.pronoun_reference.object_pronouns", [sense("reassure", "успокаивать; заверять", "verb")], [], ["I reassured them."]),
  assignment(1182, "en.grammar.pronoun_reference.object_pronouns", [sense("warn", "предупреждать", "verb")], [], ["He warned me."]),
  assignment(1183, "en.grammar.pronoun_reference.object_pronouns", [sense("praise", "хвалить", "verb")], [], ["They praised us."]),
  assignment(1184, "en.grammar.pronoun_reference.object_pronouns", [], ["en.recommend.verb.01", "en.advise.verb.01", "en.reassure.verb.01", "en.praise.verb.01"], ["Please recommend me for the role.", "She advised him.", "I reassured them.", "They praised us."]),
  // Lesson 22 / Chapter 2: ownership reference stays visible by pairing each
  // new concrete item with a possessive pronoun rather than a determiner.
  assignment(1185, "en.grammar.pronoun_reference.possessive_pronouns", [sense("artifact", "артефакт", "noun")], [], ["This artifact is hers."]),
  assignment(1186, "en.grammar.pronoun_reference.possessive_pronouns", [sense("easel", "мольберт", "noun")], [], ["That easel is mine."]),
  assignment(1187, "en.grammar.pronoun_reference.possessive_pronouns", [sense("tent", "палатка", "noun")], [], ["The tent is ours."]),
  assignment(1188, "en.grammar.pronoun_reference.possessive_pronouns", [sense("souvenir", "сувенир", "noun")], [], ["The souvenir is theirs."]),
  assignment(1189, "en.grammar.pronoun_reference.possessive_pronouns", [sense("stroller", "детская коляска", "noun")], [], ["The stroller is hers."]),
  assignment(1190, "en.grammar.pronoun_reference.possessive_pronouns", [sense("trolley", "тележка", "noun")], [], ["The trolley is ours."]),
  assignment(1191, "en.grammar.pronoun_reference.possessive_pronouns", [sense("pouch", "чехол; маленькая сумка", "noun")], [], ["The pouch is theirs."]),
  assignment(1192, "en.grammar.pronoun_reference.possessive_pronouns", [], ["en.artifact.noun.01", "en.tent.noun.01", "en.stroller.noun.01", "en.pouch.noun.01"], ["This artifact is hers.", "The tent is ours.", "The stroller is hers.", "The pouch is theirs."]),
  // Lesson 22 / Chapter 3: each action makes the reflexive referent necessary
  // or meaningful, rather than attaching a reflexive pronoun mechanically.
  assignment(1193, "en.grammar.pronoun_reference.reflexive_pronouns", [sense("injure", "травмировать", "verb")], [], ["I injured myself."]),
  assignment(1194, "en.grammar.pronoun_reference.reflexive_pronouns", [sense("introduce", "представлять", "verb")], [], ["She introduced herself."]),
  assignment(1195, "en.grammar.pronoun_reference.reflexive_pronouns", [sense("blame", "винить", "verb")], [], ["They blamed themselves."]),
  assignment(1196, "en.grammar.pronoun_reference.reflexive_pronouns", [sense("prepare", "готовить", "verb")], [], ["We prepared ourselves."]),
  assignment(1197, "en.grammar.pronoun_reference.reflexive_pronouns", [sense("defend", "защищать", "verb")], [], ["He defended himself."]),
  assignment(1198, "en.grammar.pronoun_reference.reflexive_pronouns", [sense("behave", "вести себя", "verb")], [], ["You behaved yourself."]),
  assignment(1199, "en.grammar.pronoun_reference.reflexive_pronouns", [sense("motivate", "мотивировать", "verb")], [], ["I motivated myself."]),
  assignment(1200, "en.grammar.pronoun_reference.reflexive_pronouns", [], ["en.injure.verb.01", "en.blame.verb.01", "en.defend.verb.01", "en.motivate.verb.01"], ["I injured myself.", "They blamed themselves.", "He defended himself.", "I motivated myself."]),
  // Lesson 22 / Chapter 4: each product-quality adjective is contrasted with
  // one/ones, making the reference form do visible selection work.
  assignment(1201, "en.grammar.pronoun_reference.one_ones", [sense("portable", "портативный", "adjective")], [], ["I prefer the portable one."]),
  assignment(1202, "en.grammar.pronoun_reference.one_ones", [sense("waterproof", "водонепроницаемый", "adjective")], [], ["The waterproof one is better."]),
  assignment(1203, "en.grammar.pronoun_reference.one_ones", [sense("adjustable", "регулируемый", "adjective")], [], ["I need the adjustable one."]),
  assignment(1204, "en.grammar.pronoun_reference.one_ones", [sense("foldable", "складной", "adjective")], [], ["The foldable ones fit."]),
  assignment(1205, "en.grammar.pronoun_reference.one_ones", [sense("reusable", "многоразовый", "adjective")], [], ["We want the reusable ones."]),
  assignment(1206, "en.grammar.pronoun_reference.one_ones", [sense("compact", "компактный", "adjective")], [], ["She chose the compact one."]),
  assignment(1207, "en.grammar.pronoun_reference.one_ones", [sense("lightweight", "лёгкий по весу", "adjective")], [], ["The lightweight one is hers."]),
  assignment(1208, "en.grammar.pronoun_reference.one_ones", [], ["en.portable.adjective.01", "en.adjustable.adjective.01", "en.reusable.adjective.01", "en.lightweight.adjective.01"], ["I prefer the portable one.", "I need the adjustable one.", "We want the reusable ones.", "The lightweight one is hers."]),
  // Lesson 22 / Chapter 5: replacement and selection nouns make another/other
  // carry a concrete contrast rather than repeat the same object label.
  assignment(1209, "en.grammar.pronoun_reference.another_other", [sense("option", "вариант", "noun")], [], ["Can I have another option?"]),
  assignment(1210, "en.grammar.pronoun_reference.another_other", [sense("substitute", "замена", "noun")], [], ["We need a substitute."]),
  assignment(1211, "en.grammar.pronoun_reference.another_other", [sense("alternative", "альтернатива", "noun")], [], ["She chose the alternative."]),
  assignment(1212, "en.grammar.pronoun_reference.another_other", [sense("spare", "запасной предмет", "noun")], [], ["The spare is for the other bike."]),
  assignment(1213, "en.grammar.pronoun_reference.another_other", [sense("duplicate", "копия", "noun")], [], ["This duplicate is for the other file."]),
  assignment(1214, "en.grammar.pronoun_reference.another_other", [sense("counterpart", "аналог; соответствующая часть", "noun")], [], ["The counterpart is in the other set."]),
  assignment(1215, "en.grammar.pronoun_reference.another_other", [sense("remainder", "остаток", "noun")], [], ["The remainder is in the other box."]),
  assignment(1216, "en.grammar.pronoun_reference.another_other", [], ["en.option.noun.01", "en.alternative.noun.01", "en.duplicate.noun.01", "en.remainder.noun.01"], ["Can I have another option?", "She chose the alternative.", "This duplicate is for the other file.", "The remainder is in the other box."]),
  // Lesson 22 / Chapter 6: delayed review adds distinct communication nouns in
  // request, reference, and purpose frames already taught in this lesson.
  assignment(1217, "en.grammar.verb_complement_patterns.infinitive_purpose", [sense("inquiry", "запрос; справка", "noun")], [], ["I called to make an inquiry."]),
  assignment(1218, "en.grammar.pronoun_reference.one_ones", [sense("response", "ответ", "noun")], [], ["She needs another response."]),
  assignment(1219, "en.grammar.pronoun_reference.object_pronouns", [sense("request", "запрос; просьба", "noun")], [], ["Can I send you a request?"]),
  assignment(1220, "en.grammar.pronoun_reference.another_other", [sense("complaint", "жалоба", "noun")], [], ["They filed another complaint."]),
  assignment(1221, "en.grammar.pronoun_reference.one_ones", [sense("endorsement", "рекомендация; одобрение", "noun")], [], ["I want an endorsement."]),
  assignment(1222, "en.grammar.pronoun_reference.another_other", [sense("instruction", "инструкция", "noun")], [], ["We need another instruction."]),
  assignment(1223, "en.grammar.pronoun_reference.object_pronouns", [sense("notification", "уведомление", "noun")], [], ["He sent me a notification."]),
  assignment(1224, "en.grammar.pronoun_reference.another_other", [], ["en.inquiry.noun.01", "en.request.noun.01", "en.endorsement.noun.01", "en.notification.noun.01"], ["I called to make an inquiry.", "Can I send you a request?", "I want an endorsement.", "He sent me a notification."]),
  // Lesson 22 / Chapter 7: final mixed reference review adds practical service
  // nouns while preserving the established purpose and pronoun frames.
  assignment(1225, "en.grammar.verb_complement_patterns.infinitive_purpose", [sense("cancellation", "отмена", "noun")], [], ["I called to discuss the cancellation."]),
  assignment(1226, "en.grammar.ability_permission.polite_permission", [sense("extension", "продление", "noun")], [], ["Could I request an extension?"]),
  assignment(1227, "en.grammar.verb_complement_patterns.infinitive_purpose", [sense("eligibility", "право на участие", "noun")], [], ["We met to check eligibility."]),
  assignment(1228, "en.grammar.pronoun_reference.object_pronouns", [sense("availability", "доступность", "noun")], [], ["They confirmed availability for us."]),
  assignment(1229, "en.grammar.pronoun_reference.one_ones", [sense("accessibility", "доступность для всех", "noun")], [], ["I prefer better accessibility."]),
  assignment(1230, "en.grammar.pronoun_reference.another_other", [sense("warranty", "гарантия", "noun")], [], ["We need another warranty option."]),
  assignment(1231, "en.grammar.pronoun_reference.possessive_pronouns", [sense("coverage", "страховое покрытие", "noun")], [], ["The coverage is theirs."]),
  assignment(1232, "en.grammar.pronoun_reference.another_other", [], ["en.cancellation.noun.01", "en.eligibility.noun.01", "en.accessibility.noun.01", "en.coverage.noun.01"], ["I called to discuss the cancellation.", "We met to check eligibility.", "I prefer better accessibility.", "The coverage is theirs."]),
  // Lesson 23 / Chapter 1: each technical-action verb is grounded in a clear
  // present-perfect result, so the participle form has a visible consequence.
  assignment(1233, "en.grammar.present_perfect_experience_result.form_participles", [sense("install", "устанавливать", "verb")], [], ["I have installed it."]),
  assignment(1234, "en.grammar.present_perfect_experience_result.form_participles", [sense("update", "обновлять", "verb")], [], ["She has updated it."]),
  assignment(1235, "en.grammar.present_perfect_experience_result.form_participles", [sense("publish", "публиковать", "verb")], [], ["We have published it."]),
  assignment(1236, "en.grammar.present_perfect_experience_result.form_participles", [sense("archive", "архивировать", "verb")], [], ["They have archived it."]),
  assignment(1237, "en.grammar.present_perfect_experience_result.form_participles", [sense("synchronize", "синхронизировать", "verb")], [], ["I have synchronized it."]),
  assignment(1238, "en.grammar.present_perfect_experience_result.form_participles", [sense("configure", "настраивать", "verb")], [], ["He has configured it."]),
  assignment(1239, "en.grammar.present_perfect_experience_result.form_participles", [sense("maintain", "поддерживать в рабочем состоянии", "verb")], [], ["We have maintained it."]),
  assignment(1240, "en.grammar.present_perfect_experience_result.form_participles", [], ["en.install.verb.01", "en.publish.verb.01", "en.synchronize.verb.01", "en.maintain.verb.01"], ["I have installed it.", "We have published it.", "I have synchronized it.", "We have maintained it."]),
  // Lesson 23 / Chapter 2: experience questions and answers use distinct,
  // concrete activities whose regular participles remain fully visible.
  assignment(1241, "en.grammar.present_perfect_experience_result.experience", [sense("explore", "исследовать", "verb")], [], ["Have you explored the cave?"]),
  assignment(1242, "en.grammar.present_perfect_experience_result.experience", [sense("witness", "быть свидетелем", "verb")], [], ["I have witnessed a parade."]),
  assignment(1243, "en.grammar.present_perfect_experience_result.experience", [sense("sample", "пробовать", "verb")], [], ["She has sampled the cheese."]),
  assignment(1244, "en.grammar.present_perfect_experience_result.experience", [sense("tour", "осматривать; совершать тур", "verb")], [], ["We have toured the castle."]),
  assignment(1245, "en.grammar.present_perfect_experience_result.experience", [sense("sail", "плавать под парусом", "verb")], [], ["They have sailed across the bay."]),
  assignment(1246, "en.grammar.present_perfect_experience_result.experience", [sense("cruise", "путешествовать на круизном судне", "verb")], [], ["I have cruised before."]),
  assignment(1247, "en.grammar.present_perfect_experience_result.experience", [sense("paraglide", "летать на параплане", "verb")], [], ["He has paraglided before."]),
  assignment(1248, "en.grammar.present_perfect_experience_result.experience", [], ["en.explore.verb.01", "en.sample.verb.01", "en.sail.verb.01", "en.paraglide.verb.01"], ["Have you explored the cave?", "She has sampled the cheese.", "They have sailed across the bay.", "He has paraglided before."]),
  // Lesson 23 / Chapter 3: every new verb creates a current, observable
  // present-perfect result rather than merely naming a past event.
  assignment(1249, "en.grammar.present_perfect_experience_result.present_result", [sense("misplace", "положить не туда; потерять", "verb")], [], ["I have misplaced my card."]),
  assignment(1250, "en.grammar.present_perfect_experience_result.present_result", [sense("erase", "стирать; удалять", "verb")], [], ["She has erased the file."]),
  assignment(1251, "en.grammar.present_perfect_experience_result.present_result", [sense("overheat", "перегреваться", "verb")], [], ["It has overheated."]),
  assignment(1252, "en.grammar.present_perfect_experience_result.present_result", [sense("expire", "истекать", "verb")], [], ["My pass has expired."]),
  assignment(1253, "en.grammar.present_perfect_experience_result.present_result", [sense("disconnect", "отсоединять", "verb")], [], ["We have disconnected the cable."]),
  assignment(1254, "en.grammar.present_perfect_experience_result.present_result", [sense("corrupt", "повреждать данные", "verb")], [], ["They have corrupted the file."]),
  assignment(1255, "en.grammar.present_perfect_experience_result.present_result", [sense("malfunction", "неисправно работать", "verb")], [], ["The device has malfunctioned."]),
  assignment(1256, "en.grammar.present_perfect_experience_result.present_result", [], ["en.misplace.verb.01", "en.overheat.verb.01", "en.disconnect.verb.01", "en.malfunction.verb.01"], ["I have misplaced my card.", "It has overheated.", "We have disconnected the cable.", "The device has malfunctioned."]),
  // Lesson 23 / Chapter 4: each new action is a plausible life experience for
  // ever/never, with a regular participle grounded in the full question or answer.
  assignment(1257, "en.grammar.present_perfect_experience_result.ever_never", [sense("parachute", "прыгать с парашютом", "verb")], [], ["Have you ever parachuted?"]),
  assignment(1258, "en.grammar.present_perfect_experience_result.ever_never", [sense("rescue", "спасать", "verb")], [], ["I have never rescued anyone."]),
  assignment(1259, "en.grammar.present_perfect_experience_result.ever_never", [sense("debate", "участвовать в дебатах", "verb")], [], ["Have you ever debated?"]),
  assignment(1260, "en.grammar.present_perfect_experience_result.ever_never", [sense("perform", "выступать", "verb")], [], ["I have never performed on stage."]),
  assignment(1261, "en.grammar.present_perfect_experience_result.ever_never", [sense("present", "выступать с презентацией", "verb")], [], ["Have you ever presented?"]),
  assignment(1262, "en.grammar.present_perfect_experience_result.ever_never", [sense("host", "вести мероприятие", "verb")], [], ["They have never hosted a show."]),
  assignment(1263, "en.grammar.present_perfect_experience_result.ever_never", [sense("direct", "режиссировать; руководить", "verb")], [], ["I have never directed a play."]),
  assignment(1264, "en.grammar.present_perfect_experience_result.ever_never", [], ["en.parachute.verb.01", "en.debate.verb.01", "en.present.verb.01", "en.direct.verb.01"], ["Have you ever parachuted?", "Have you ever debated?", "Have you ever presented?", "I have never directed a play."]),
  // Lesson 23 / Chapter 5: completed workflow actions give already/yet/just
  // a concrete result state in every new lexical example.
  assignment(1265, "en.grammar.present_perfect_experience_result.just_already_yet_answers", [sense("dispatch", "отправлять", "verb")], [], ["We have already dispatched it."]),
  assignment(1266, "en.grammar.present_perfect_experience_result.just_already_yet_answers", [sense("process", "обрабатывать", "verb")], [], ["Has she processed it yet?"]),
  assignment(1267, "en.grammar.present_perfect_experience_result.just_already_yet_answers", [sense("upload", "загружать", "verb")], [], ["I have just uploaded it."]),
  assignment(1268, "en.grammar.present_perfect_experience_result.just_already_yet_answers", [sense("validate", "проверять на соответствие", "verb")], [], ["They have already validated it."]),
  assignment(1269, "en.grammar.present_perfect_experience_result.just_already_yet_answers", [sense("finalize", "окончательно оформлять", "verb")], [], ["Have you finalized it yet?"]),
  assignment(1270, "en.grammar.present_perfect_experience_result.just_already_yet_answers", [sense("provision", "предоставлять; обеспечивать", "verb")], [], ["We have just provisioned it."]),
  assignment(1271, "en.grammar.present_perfect_experience_result.just_already_yet_answers", [sense("escalate", "передавать на более высокий уровень", "verb")], [], ["I have already escalated it."]),
  assignment(1272, "en.grammar.present_perfect_experience_result.just_already_yet_answers", [], ["en.dispatch.verb.01", "en.upload.verb.01", "en.finalize.verb.01", "en.escalate.verb.01"], ["We have already dispatched it.", "I have just uploaded it.", "Have you finalized it yet?", "I have already escalated it."]),
  // Lesson 23 / Chapter 6: delayed review keeps present-perfect result meaning
  // alive with distinct project-status nouns in completed current outcomes.
  assignment(1273, "en.grammar.present_perfect_experience_result.present_result", [sense("backlog", "накопившиеся задачи", "noun")], [], ["I have cleared the backlog."]),
  assignment(1274, "en.grammar.present_perfect_experience_result.present_result", [sense("incident", "инцидент", "noun")], [], ["We have reported the incident."]),
  assignment(1275, "en.grammar.present_perfect_experience_result.present_result", [sense("rollback", "откат версии", "noun")], [], ["They have started a rollback."]),
  assignment(1276, "en.grammar.present_perfect_experience_result.present_result", [sense("patch", "исправление; патч", "noun")], [], ["She has installed the patch."]),
  assignment(1277, "en.grammar.present_perfect_experience_result.present_result", [sense("deployment", "развёртывание", "noun")], [], ["We have completed the deployment."]),
  assignment(1278, "en.grammar.present_perfect_experience_result.present_result", [sense("hotfix", "срочное исправление", "noun")], [], ["I have applied the hotfix."]),
  assignment(1279, "en.grammar.present_perfect_experience_result.present_result", [sense("integration", "интеграция", "noun")], [], ["They have tested the integration."]),
  assignment(1280, "en.grammar.present_perfect_experience_result.present_result", [], ["en.backlog.noun.01", "en.rollback.noun.01", "en.deployment.noun.01", "en.integration.noun.01"], ["I have cleared the backlog.", "They have started a rollback.", "We have completed the deployment.", "They have tested the integration."]),
  // Lesson 23 / Chapter 7: final retrieval uses achievement and recovery verbs
  // whose present-perfect forms name a meaningful current accomplishment.
  assignment(1281, "en.grammar.present_perfect_experience_result.present_result", [sense("accomplish", "выполнять; достигать", "verb")], [], ["I have accomplished the task."]),
  assignment(1282, "en.grammar.present_perfect_experience_result.present_result", [sense("resolve", "решать; устранять", "verb")], [], ["She has resolved the issue."]),
  assignment(1283, "en.grammar.present_perfect_experience_result.present_result", [sense("settle", "урегулировать", "verb")], [], ["We have settled the dispute."]),
  assignment(1284, "en.grammar.present_perfect_experience_result.present_result", [sense("heal", "заживать; исцеляться", "verb")], [], ["He has healed."]),
  assignment(1285, "en.grammar.present_perfect_experience_result.present_result", [sense("attain", "достигать", "verb")], [], ["They have attained the goal."]),
  assignment(1286, "en.grammar.present_perfect_experience_result.present_result", [sense("achieve", "достигать", "verb")], [], ["I have achieved the target."]),
  assignment(1287, "en.grammar.present_perfect_experience_result.present_result", [sense("reduce", "сокращать", "verb")], [], ["We have reduced the cost."]),
  assignment(1288, "en.grammar.present_perfect_experience_result.present_result", [], ["en.accomplish.verb.01", "en.settle.verb.01", "en.attain.verb.01", "en.reduce.verb.01"], ["I have accomplished the task.", "We have settled the dispute.", "They have attained the goal.", "We have reduced the cost."]),
  // Lesson 24 / Chapter 1: duration verbs pair with an explicit for/since
  // phrase, making continuity the reason for the present-perfect form.
  assignment(1289, "en.grammar.present_perfect_duration_contrast.for_since", [sense("reside", "проживать", "verb")], [], ["I have resided here for a year."]),
  assignment(1290, "en.grammar.present_perfect_duration_contrast.for_since", [sense("serve", "работать; служить", "verb")], [], ["She has served here since May."]),
  assignment(1291, "en.grammar.present_perfect_duration_contrast.for_since", [sense("train", "тренировать", "verb")], [], ["We have trained them for a year."]),
  assignment(1292, "en.grammar.present_perfect_duration_contrast.for_since", [sense("lease", "арендовать", "verb")], [], ["They have leased it since June."]),
  assignment(1293, "en.grammar.present_perfect_duration_contrast.for_since", [sense("subscribe", "подписываться", "verb")], [], ["I have subscribed for a year."]),
  assignment(1294, "en.grammar.present_perfect_duration_contrast.for_since", [sense("specialize", "специализироваться", "verb")], [], ["He has specialized in design since 2020."]),
  assignment(1295, "en.grammar.present_perfect_duration_contrast.for_since", [sense("coach", "тренировать", "verb")], [], ["We have coached them for years."]),
  assignment(1296, "en.grammar.present_perfect_duration_contrast.for_since", [], ["en.reside.verb.01", "en.train.verb.01", "en.subscribe.verb.01", "en.coach.verb.01"], ["I have resided here for a year.", "We have trained them for a year.", "I have subscribed for a year.", "We have coached them for years."]),
  // Lesson 24 / Chapter 2: each long-running role gives how long a concrete
  // referent and uses a regular, grounded present-perfect participle.
  assignment(1297, "en.grammar.present_perfect_duration_contrast.how_long", [sense("represent", "представлять", "verb")], [], ["How long have you represented the team?"]),
  assignment(1298, "en.grammar.present_perfect_duration_contrast.how_long", [sense("occupy", "занимать", "verb")], [], ["How long have you occupied this office?"]),
  assignment(1299, "en.grammar.present_perfect_duration_contrast.how_long", [sense("preside", "председательствовать", "verb")], [], ["How long has she presided here?"]),
  assignment(1300, "en.grammar.present_perfect_duration_contrast.how_long", [sense("chair", "председательствовать", "verb")], [], ["How long have you chaired the group?"]),
  assignment(1301, "en.grammar.present_perfect_duration_contrast.how_long", [sense("govern", "управлять", "verb")], [], ["How long has he governed it?"]),
  assignment(1302, "en.grammar.present_perfect_duration_contrast.how_long", [sense("support", "поддерживать", "verb")], [], ["How long have they supported us?"]),
  assignment(1303, "en.grammar.present_perfect_duration_contrast.how_long", [sense("assist", "помогать", "verb")], [], ["How long have you assisted her?"]),
  assignment(1304, "en.grammar.present_perfect_duration_contrast.how_long", [], ["en.represent.verb.01", "en.preside.verb.01", "en.govern.verb.01", "en.assist.verb.01"], ["How long have you represented the team?", "How long has she presided here?", "How long has he governed it?", "How long have you assisted her?"]),
  // Lesson 24 / Chapter 3: each new process verb stays visibly in progress in
  // a present-perfect continuous duration frame.
  assignment(1305, "en.grammar.present_perfect_duration_contrast.perfect_continuous", [sense("renovate", "ремонтировать", "verb")], [], ["I have been renovating for a week."]),
  assignment(1306, "en.grammar.present_perfect_duration_contrast.perfect_continuous", [sense("investigate", "расследовать", "verb")], [], ["She has been investigating all day."]),
  assignment(1307, "en.grammar.present_perfect_duration_contrast.perfect_continuous", [sense("demonstrate", "демонстрировать", "verb")], [], ["We have been demonstrating it for an hour."]),
  assignment(1308, "en.grammar.present_perfect_duration_contrast.perfect_continuous", [sense("fabricate", "изготавливать", "verb")], [], ["They have been fabricating it since May."]),
  assignment(1309, "en.grammar.present_perfect_duration_contrast.perfect_continuous", [sense("fundraise", "собирать средства", "verb")], [], ["I have been fundraising for a month."]),
  assignment(1310, "en.grammar.present_perfect_duration_contrast.perfect_continuous", [sense("refine", "улучшать; уточнять", "verb")], [], ["He has been refining it for hours."]),
  assignment(1311, "en.grammar.present_perfect_duration_contrast.perfect_continuous", [sense("expand", "расширять", "verb")], [], ["We have been expanding it since June."]),
  assignment(1312, "en.grammar.present_perfect_duration_contrast.perfect_continuous", [], ["en.renovate.verb.01", "en.demonstrate.verb.01", "en.fundraise.verb.01", "en.expand.verb.01"], ["I have been renovating for a week.", "We have been demonstrating it for an hour.", "I have been fundraising for a month.", "We have been expanding it since June."]),
  // Lesson 24 / Chapter 4: each evidence-handling verb makes the contrast
  // concrete: present perfect links a completed action to now, while Past
  // Simple places the same kind of action at a finished time.
  assignment(1313, "en.grammar.present_perfect_duration_contrast.past_simple_contrast", [sense("assess", "оценивать", "verb")], [], ["I have assessed the report.", "I assessed it last week."]),
  assignment(1314, "en.grammar.present_perfect_duration_contrast.past_simple_contrast", [sense("review", "проверять; рассматривать", "verb")], [], ["She has reviewed the file.", "She reviewed it yesterday."]),
  assignment(1315, "en.grammar.present_perfect_duration_contrast.past_simple_contrast", [sense("analyze", "анализировать", "verb")], [], ["We have analyzed the data.", "We analyzed it last month."]),
  assignment(1316, "en.grammar.present_perfect_duration_contrast.past_simple_contrast", [sense("record", "записывать; фиксировать", "verb")], [], ["They have recorded the result.", "They recorded it on Monday."]),
  assignment(1317, "en.grammar.present_perfect_duration_contrast.past_simple_contrast", [sense("annotate", "снабжать примечаниями", "verb")], [], ["I have annotated the draft.", "I annotated it yesterday."]),
  assignment(1318, "en.grammar.present_perfect_duration_contrast.past_simple_contrast", [sense("highlight", "выделять", "verb")], [], ["She has highlighted the error.", "She highlighted it last night."]),
  assignment(1319, "en.grammar.present_perfect_duration_contrast.past_simple_contrast", [sense("compile", "составлять", "verb")], [], ["We have compiled the list.", "We compiled it last week."]),
  assignment(1320, "en.grammar.present_perfect_duration_contrast.past_simple_contrast", [], ["en.assess.verb.01", "en.analyze.verb.01", "en.annotate.verb.01", "en.compile.verb.01"], ["I have assessed the report.", "We analyzed the data.", "I annotated the draft yesterday.", "We compiled the list last week."]),
  // Lesson 24 / Chapter 5: a changed workplace context retrieves completed
  // present-perfect actions, with every new verb still carrying a useful
  // current-result meaning rather than a detached word list.
  assignment(1321, "en.grammar.present_perfect_duration_contrast.past_simple_contrast", [sense("assign", "назначать; поручать", "verb")], [], ["I have assigned the task."]),
  assignment(1322, "en.grammar.present_perfect_duration_contrast.past_simple_contrast", [sense("brief", "кратко информировать", "verb")], [], ["She has briefed the team."]),
  assignment(1323, "en.grammar.present_perfect_duration_contrast.past_simple_contrast", [sense("initiate", "начинать; инициировать", "verb")], [], ["We have initiated the review."]),
  assignment(1324, "en.grammar.present_perfect_duration_contrast.past_simple_contrast", [sense("track", "отслеживать", "verb")], [], ["They have tracked the progress."]),
  assignment(1325, "en.grammar.present_perfect_duration_contrast.past_simple_contrast", [sense("outline", "кратко излагать", "verb")], [], ["I have outlined the plan."]),
  assignment(1326, "en.grammar.present_perfect_duration_contrast.past_simple_contrast", [sense("distribute", "распределять; раздавать", "verb")], [], ["She has distributed the notes."]),
  assignment(1327, "en.grammar.present_perfect_duration_contrast.past_simple_contrast", [sense("circulate", "распространять", "verb")], [], ["We have circulated the update."]),
  assignment(1328, "en.grammar.present_perfect_duration_contrast.past_simple_contrast", [], ["en.assign.verb.01", "en.initiate.verb.01", "en.outline.verb.01", "en.circulate.verb.01"], ["I have assigned the task.", "We have initiated the review.", "I have outlined the plan.", "We have circulated the update."]),
  // Lesson 24 / Chapter 6: community actions are changed-context retrieval;
  // the completed action matters now, so it remains a natural present-perfect
  // result rather than a bare event label.
  assignment(1329, "en.grammar.present_perfect_duration_contrast.past_simple_contrast", [sense("participate", "участвовать", "verb")], [], ["I have participated in the event."]),
  assignment(1330, "en.grammar.present_perfect_duration_contrast.past_simple_contrast", [sense("endorse", "поддерживать; одобрять", "verb")], [], ["She has endorsed the project."]),
  assignment(1331, "en.grammar.present_perfect_duration_contrast.past_simple_contrast", [sense("recruit", "набирать; привлекать", "verb")], [], ["We have recruited volunteers."]),
  assignment(1332, "en.grammar.present_perfect_duration_contrast.past_simple_contrast", [sense("mobilize", "мобилизовать", "verb")], [], ["They have mobilized the group."]),
  assignment(1333, "en.grammar.present_perfect_duration_contrast.past_simple_contrast", [sense("mediate", "выступать посредником", "verb")], [], ["I have mediated the dispute."]),
  assignment(1334, "en.grammar.present_perfect_duration_contrast.past_simple_contrast", [sense("advocate", "выступать в поддержку", "verb")], [], ["She has advocated for the plan."]),
  assignment(1335, "en.grammar.present_perfect_duration_contrast.past_simple_contrast", [sense("network", "налаживать профессиональные связи", "verb")], [], ["We have networked with local groups."]),
  assignment(1336, "en.grammar.present_perfect_duration_contrast.past_simple_contrast", [], ["en.participate.verb.01", "en.recruit.verb.01", "en.mediate.verb.01", "en.network.verb.01"], ["I have participated in the event.", "We have recruited volunteers.", "I have mediated the dispute.", "We have networked with local groups."]),
  // Lesson 24 / Chapter 7: final integration uses reflective outcomes in a
  // changed personal-development context; the present perfect reports a
  // completed action whose result is relevant at the time of speaking.
  assignment(1337, "en.grammar.present_perfect_duration_contrast.past_simple_contrast", [sense("reflect", "размышлять; анализировать опыт", "verb")], [], ["I have reflected on the feedback."]),
  assignment(1338, "en.grammar.present_perfect_duration_contrast.past_simple_contrast", [sense("sustain", "поддерживать; сохранять", "verb")], [], ["She has sustained the effort."]),
  assignment(1339, "en.grammar.present_perfect_duration_contrast.past_simple_contrast", [sense("adjust", "корректировать", "verb")], [], ["We have adjusted the plan."]),
  assignment(1340, "en.grammar.present_perfect_duration_contrast.past_simple_contrast", [sense("respond", "отвечать; реагировать", "verb")], [], ["They have responded to the feedback."]),
  assignment(1341, "en.grammar.present_perfect_duration_contrast.past_simple_contrast", [sense("persist", "продолжать несмотря на трудности", "verb")], [], ["I have persisted with the task."]),
  assignment(1342, "en.grammar.present_perfect_duration_contrast.past_simple_contrast", [sense("consolidate", "закреплять; объединять", "verb")], [], ["She has consolidated the notes."]),
  assignment(1343, "en.grammar.present_perfect_duration_contrast.past_simple_contrast", [sense("transform", "преобразовывать", "verb")], [], ["We have transformed the process."]),
  assignment(1344, "en.grammar.present_perfect_duration_contrast.past_simple_contrast", [], ["en.reflect.verb.01", "en.adjust.verb.01", "en.persist.verb.01", "en.transform.verb.01"], ["I have reflected on the feedback.", "We have adjusted the plan.", "I have persisted with the task.", "We have transformed the process."]),
  // Lesson 25 / Chapter 1: each verb names a sustained former state, role, or
  // routine, so `used to` has a meaningful past-habit contrast with now.
  assignment(1345, "en.grammar.past_habits_narrative_ordering.used_to", [sense("own", "владеть", "verb")], [], ["I used to own a bike."]),
  assignment(1346, "en.grammar.past_habits_narrative_ordering.used_to", [sense("keep", "вести; хранить", "verb")], [], ["She used to keep a diary."]),
  assignment(1347, "en.grammar.past_habits_narrative_ordering.used_to", [sense("raise", "выращивать; воспитывать", "verb")], [], ["We used to raise chickens."]),
  assignment(1348, "en.grammar.past_habits_narrative_ordering.used_to", [sense("rent", "арендовать", "verb")], [], ["They used to rent a cabin."]),
  assignment(1349, "en.grammar.past_habits_narrative_ordering.used_to", [sense("belong", "принадлежать; состоять", "verb")], [], ["I used to belong to a club."]),
  assignment(1350, "en.grammar.past_habits_narrative_ordering.used_to", [sense("care", "заботиться", "verb")], [], ["He used to care for animals."]),
  assignment(1351, "en.grammar.past_habits_narrative_ordering.used_to", [sense("gather", "собираться", "verb")], [], ["We used to gather there."]),
  assignment(1352, "en.grammar.past_habits_narrative_ordering.used_to", [], ["en.own.verb.01", "en.raise.verb.01", "en.belong.verb.01", "en.gather.verb.01"], ["I used to own a bike.", "We used to raise chickens.", "I used to belong to a club.", "We used to gather there."]),
  // Lesson 25 / Chapter 2: recurring seasonal actions make habitual `would`
  // distinct from a one-off past event and provide a varied narrative setting.
  assignment(1353, "en.grammar.past_habits_narrative_ordering.habitual_would", [sense("paddle", "грести веслом", "verb")], [], ["Every summer, we would paddle on the lake."]),
  assignment(1354, "en.grammar.past_habits_narrative_ordering.habitual_would", [sense("race", "соревноваться в беге", "verb")], [], ["Each spring, they would race in the park."]),
  assignment(1355, "en.grammar.past_habits_narrative_ordering.habitual_would", [sense("trade", "обмениваться", "verb")], [], ["After school, we would trade cards."]),
  assignment(1356, "en.grammar.past_habits_narrative_ordering.habitual_would", [sense("hunt", "охотиться", "verb")], [], ["Every autumn, they would hunt in the forest."]),
  assignment(1357, "en.grammar.past_habits_narrative_ordering.habitual_would", [sense("forage", "собирать дикорастущую еду", "verb")], [], ["Each summer, we would forage for berries."]),
  assignment(1358, "en.grammar.past_habits_narrative_ordering.habitual_would", [sense("roam", "бродить", "verb")], [], ["On Sundays, I would roam around town."]),
  assignment(1359, "en.grammar.past_habits_narrative_ordering.habitual_would", [sense("pick", "собирать; выбирать", "verb")], [], ["Every June, she would pick flowers."]),
  assignment(1360, "en.grammar.past_habits_narrative_ordering.habitual_would", [], ["en.paddle.verb.01", "en.trade.verb.01", "en.forage.verb.01", "en.pick.verb.01"], ["Every summer, we would paddle on the lake.", "After school, we would trade cards.", "Each summer, we would forage for berries.", "Every June, she would pick flowers."]),
  // Lesson 25 / Chapter 3: the new verbs make the earlier completed action
  // in a two-event narrative visible, giving Past Perfect a real sequencing job.
  assignment(1361, "en.grammar.past_habits_narrative_ordering.past_perfect", [sense("unlock", "отпирать; разблокировать", "verb")], [], ["They had unlocked the gate before we arrived."]),
  assignment(1362, "en.grammar.past_habits_narrative_ordering.past_perfect", [sense("board", "садиться на транспорт", "verb")], [], ["She had boarded before the train left."]),
  assignment(1363, "en.grammar.past_habits_narrative_ordering.past_perfect", [sense("depart", "отправляться", "verb")], [], ["The plane had departed before we arrived."]),
  assignment(1364, "en.grammar.past_habits_narrative_ordering.past_perfect", [sense("load", "загружать", "verb")], [], ["We had loaded the car before it rained."]),
  assignment(1365, "en.grammar.past_habits_narrative_ordering.past_perfect", [sense("unload", "разгружать", "verb")], [], ["They had unloaded the boxes before dinner."]),
  assignment(1366, "en.grammar.past_habits_narrative_ordering.past_perfect", [sense("evacuate", "эвакуироваться; эвакуировать", "verb")], [], ["Residents had evacuated before the storm arrived."]),
  assignment(1367, "en.grammar.past_habits_narrative_ordering.past_perfect", [sense("secure", "обеспечивать безопасность", "verb")], [], ["They had secured the area before the show."]),
  assignment(1368, "en.grammar.past_habits_narrative_ordering.past_perfect", [], ["en.unlock.verb.01", "en.depart.verb.01", "en.unload.verb.01", "en.secure.verb.01"], ["They had unlocked the gate before we arrived.", "The plane had departed before we arrived.", "They had unloaded the boxes before dinner.", "They had secured the area before the show."]),
  // Lesson 25 / Chapter 4: each action is placed on one side of a `before` or
  // `after` boundary, so the connector carries real narrative ordering.
  assignment(1369, "en.grammar.past_habits_narrative_ordering.before_after", [sense("cross", "пересекать", "verb")], [], ["After she crossed the bridge, we stopped."]),
  assignment(1370, "en.grammar.past_habits_narrative_ordering.before_after", [sense("reach", "достигать; добираться", "verb")], [], ["Before we reached the station, it rained."]),
  assignment(1371, "en.grammar.past_habits_narrative_ordering.before_after", [sense("turn", "поворачивать", "verb")], [], ["After he turned the key, the door opened."]),
  assignment(1372, "en.grammar.past_habits_narrative_ordering.before_after", [sense("protect", "защищать", "verb")], [], ["Before they protected the plants, it snowed."]),
  assignment(1373, "en.grammar.past_habits_narrative_ordering.before_after", [sense("greet", "приветствовать", "verb")], [], ["After I greeted the guest, we sat down."]),
  assignment(1374, "en.grammar.past_habits_narrative_ordering.before_after", [sense("guide", "вести; направлять", "verb")], [], ["Before she guided us, we were lost."]),
  assignment(1375, "en.grammar.past_habits_narrative_ordering.before_after", [sense("escort", "сопровождать", "verb")], [], ["After we escorted the guest, we rested."]),
  assignment(1376, "en.grammar.past_habits_narrative_ordering.before_after", [], ["en.cross.verb.01", "en.turn.verb.01", "en.greet.verb.01", "en.escort.verb.01"], ["After she crossed the bridge, we stopped.", "After he turned the key, the door opened.", "After I greeted the guest, we sat down.", "After we escorted the guest, we rested."]),
  // Lesson 25 / Chapter 5: completed preparation actions make the deadline
  // boundary of `by the time` concrete in each Past Perfect narrative.
  assignment(1377, "en.grammar.past_habits_narrative_ordering.by_the_time", [sense("seal", "запечатывать", "verb")], [], ["By the time we arrived, they had sealed the boxes."]),
  assignment(1378, "en.grammar.past_habits_narrative_ordering.by_the_time", [sense("sort", "сортировать", "verb")], [], ["By noon, she had sorted the files."]),
  assignment(1379, "en.grammar.past_habits_narrative_ordering.by_the_time", [sense("file", "подшивать; регистрировать", "verb")], [], ["By Friday, I had filed the forms."]),
  assignment(1380, "en.grammar.past_habits_narrative_ordering.by_the_time", [sense("stack", "складывать стопкой", "verb")], [], ["By the time guests arrived, we had stacked the chairs."]),
  assignment(1381, "en.grammar.past_habits_narrative_ordering.by_the_time", [sense("store", "хранить; размещать на хранение", "verb")], [], ["By winter, they had stored the equipment."]),
  assignment(1382, "en.grammar.past_habits_narrative_ordering.by_the_time", [sense("count", "считать; подсчитывать", "verb")], [], ["By the time the show began, he had counted the tickets."]),
  assignment(1383, "en.grammar.past_habits_narrative_ordering.by_the_time", [sense("mark", "отмечать; помечать", "verb")], [], ["By the deadline, we had marked every page."]),
  assignment(1384, "en.grammar.past_habits_narrative_ordering.by_the_time", [], ["en.seal.verb.01", "en.file.verb.01", "en.store.verb.01", "en.mark.verb.01"], ["By the time we arrived, they had sealed the boxes.", "By Friday, I had filed the forms.", "By winter, they had stored the equipment.", "By the deadline, we had marked every page."]),
  // Lesson 25 / Chapter 6: conversational retelling adds distinct actions of
  // memory, discovery, and response without changing the established past
  // narrative grammar frame.
  assignment(1385, "en.grammar.past_habits_narrative_ordering.by_the_time", [sense("recall", "вспоминать", "verb")], [], ["Years later, I recalled the day."]),
  assignment(1386, "en.grammar.past_habits_narrative_ordering.by_the_time", [sense("spot", "замечать", "verb")], [], ["On the walk home, she spotted the note."]),
  assignment(1387, "en.grammar.past_habits_narrative_ordering.by_the_time", [sense("realize", "осознавать", "verb")], [], ["When it ended, we realized the truth."]),
  assignment(1388, "en.grammar.past_habits_narrative_ordering.by_the_time", [sense("deny", "отрицать", "verb")], [], ["At first, they denied the error."]),
  assignment(1389, "en.grammar.past_habits_narrative_ordering.by_the_time", [sense("suggest", "предлагать", "verb")], [], ["After class, he suggested a change."]),
  assignment(1390, "en.grammar.past_habits_narrative_ordering.by_the_time", [sense("report", "сообщать", "verb")], [], ["That evening, I reported the issue."]),
  assignment(1391, "en.grammar.past_habits_narrative_ordering.by_the_time", [sense("reveal", "раскрывать; сообщать", "verb")], [], ["Later, she revealed the mistake."]),
  assignment(1392, "en.grammar.past_habits_narrative_ordering.by_the_time", [], ["en.recall.verb.01", "en.realize.verb.01", "en.suggest.verb.01", "en.reveal.verb.01"], ["Years later, I recalled the day.", "When it ended, we realized the truth.", "After class, he suggested a change.", "Later, she revealed the mistake."]),
  // Lesson 25 / Chapter 7: final transfer retains the past-narrative frame
  // while shifting to recovery and response outcomes in changed contexts.
  assignment(1393, "en.grammar.past_habits_narrative_ordering.by_the_time", [sense("endure", "выдерживать; переносить", "verb")], [], ["During the storm, we endured the cold."]),
  assignment(1394, "en.grammar.past_habits_narrative_ordering.by_the_time", [sense("survive", "пережить; выжить", "verb")], [], ["She survived the delay."]),
  assignment(1395, "en.grammar.past_habits_narrative_ordering.by_the_time", [sense("resist", "сопротивляться", "verb")], [], ["They resisted the pressure."]),
  assignment(1396, "en.grammar.past_habits_narrative_ordering.by_the_time", [sense("cope", "справляться", "verb")], [], ["I coped with the change."]),
  assignment(1397, "en.grammar.past_habits_narrative_ordering.by_the_time", [sense("thrive", "успешно развиваться", "verb")], [], ["We thrived in the new role."]),
  assignment(1398, "en.grammar.past_habits_narrative_ordering.by_the_time", [sense("struggle", "испытывать трудности", "verb")], [], ["He struggled at first."]),
  assignment(1399, "en.grammar.past_habits_narrative_ordering.by_the_time", [sense("flourish", "процветать", "verb")], [], ["The garden flourished that year."]),
  assignment(1400, "en.grammar.past_habits_narrative_ordering.by_the_time", [], ["en.endure.verb.01", "en.resist.verb.01", "en.thrive.verb.01", "en.flourish.verb.01"], ["During the storm, we endured the cold.", "They resisted the pressure.", "We thrived in the new role.", "The garden flourished that year."]),
  // Lesson 26 / Chapter 1: observable cause-and-effect facts make the zero
  // conditional useful without introducing a hypothetical future outcome.
  assignment(1401, "en.grammar.zero_first_conditional.zero_conditional", [sense("evaporate", "испаряться", "verb")], [], ["If water evaporates, it becomes gas."]),
  assignment(1402, "en.grammar.zero_first_conditional.zero_conditional", [sense("condense", "конденсироваться", "verb")], [], ["When air condenses, it forms drops."]),
  assignment(1403, "en.grammar.zero_first_conditional.zero_conditional", [sense("contract", "сжиматься", "verb")], [], ["If metal contracts, it gets smaller."]),
  assignment(1404, "en.grammar.zero_first_conditional.zero_conditional", [sense("dissolve", "растворяться", "verb")], [], ["When sugar dissolves, it disappears."]),
  assignment(1405, "en.grammar.zero_first_conditional.zero_conditional", [sense("sink", "тонуть", "verb")], [], ["If a stone sinks, it goes down."]),
  assignment(1406, "en.grammar.zero_first_conditional.zero_conditional", [sense("absorb", "впитывать", "verb")], [], ["When a towel absorbs water, it gets wet."]),
  assignment(1407, "en.grammar.zero_first_conditional.zero_conditional", [sense("vibrate", "вибрировать", "verb")], [], ["When a string vibrates, it makes sound."]),
  assignment(1408, "en.grammar.zero_first_conditional.zero_conditional", [], ["en.evaporate.verb.01", "en.contract.verb.01", "en.sink.verb.01", "en.vibrate.verb.01"], ["If water evaporates, it becomes gas.", "If metal contracts, it gets smaller.", "If a stone sinks, it goes down.", "When a string vibrates, it makes sound."]),
  // Lesson 26 / Chapter 2: practical contingent actions keep the result in
  // the future clause and make First Conditional distinct from a general fact.
  assignment(1409, "en.grammar.zero_first_conditional.first_conditional", [sense("refill", "наполнять снова", "verb")], [], ["If the bottle is empty, I will refill it."]),
  assignment(1410, "en.grammar.zero_first_conditional.first_conditional", [sense("replace", "заменять", "verb")], [], ["If the part is broken, I will replace it."]),
  assignment(1411, "en.grammar.zero_first_conditional.first_conditional", [sense("text", "писать сообщение", "verb")], [], ["If you text me, I will reply."]),
  assignment(1412, "en.grammar.zero_first_conditional.first_conditional", [sense("reply", "отвечать", "verb")], [], ["If you email, I will reply."]),
  assignment(1413, "en.grammar.zero_first_conditional.first_conditional", [sense("book", "бронировать", "verb")], [], ["If seats are available, I will book them."]),
  assignment(1414, "en.grammar.zero_first_conditional.first_conditional", [sense("forward", "пересылать", "verb")], [], ["If you send it, I will forward it."]),
  assignment(1415, "en.grammar.zero_first_conditional.first_conditional", [sense("transfer", "переводить", "verb")], [], ["If the account is ready, I will transfer the money."]),
  assignment(1416, "en.grammar.zero_first_conditional.first_conditional", [], ["en.refill.verb.01", "en.text.verb.01", "en.book.verb.01", "en.transfer.verb.01"], ["If the bottle is empty, I will refill it.", "If you text me, I will reply.", "If seats are available, I will book them.", "If the account is ready, I will transfer the money."]),
  // Lesson 26 / Chapter 3: each present-form time clause fixes when a future
  // action will happen, without incorrectly placing `will` inside that clause.
  assignment(1417, "en.grammar.zero_first_conditional.future_time_clauses", [sense("unpack", "распаковывать", "verb")], [], ["When I unpack, I will call."]),
  assignment(1418, "en.grammar.zero_first_conditional.future_time_clauses", [sense("land", "приземляться", "verb")], [], ["When the plane lands, we will meet."]),
  assignment(1419, "en.grammar.zero_first_conditional.future_time_clauses", [sense("register", "регистрироваться", "verb")], [], ["When you register, I will send a link."]),
  assignment(1420, "en.grammar.zero_first_conditional.future_time_clauses", [sense("recover", "восстанавливаться", "verb")], [], ["When I recover, I will return."]),
  assignment(1421, "en.grammar.zero_first_conditional.future_time_clauses", [sense("sign", "подписывать", "verb")], [], ["When you sign, we will start."]),
  assignment(1422, "en.grammar.zero_first_conditional.future_time_clauses", [sense("wait", "ждать", "verb")], [], ["When you wait outside, I will open the door."]),
  assignment(1423, "en.grammar.zero_first_conditional.future_time_clauses", [sense("signal", "подавать сигнал", "verb")], [], ["When you signal, I will stop."]),
  assignment(1424, "en.grammar.zero_first_conditional.future_time_clauses", [], ["en.unpack.verb.01", "en.register.verb.01", "en.sign.verb.01", "en.signal.verb.01"], ["When I unpack, I will call.", "When you register, I will send a link.", "When you sign, we will start.", "When you signal, I will stop."]),
  // Lesson 26 / Chapter 4: safety and contingency actions distinguish an `if`
  // trigger from an `unless` condition that blocks the planned response.
  assignment(1425, "en.grammar.zero_first_conditional.if_when_unless", [sense("detour", "объезжать", "verb")], [], ["If the road closes, we will detour."]),
  assignment(1426, "en.grammar.zero_first_conditional.if_when_unless", [sense("engage", "срабатывать; включаться", "verb")], [], ["Unless the lock engages, we will not leave."]),
  assignment(1427, "en.grammar.zero_first_conditional.if_when_unless", [sense("restart", "перезапускать", "verb")], [], ["If the app freezes, restart it."]),
  assignment(1428, "en.grammar.zero_first_conditional.if_when_unless", [sense("spoil", "портиться", "verb")], [], ["If food spoils, it smells bad."]),
  assignment(1429, "en.grammar.zero_first_conditional.if_when_unless", [sense("discard", "выбрасывать", "verb")], [], ["Unless the label is clear, discard the package."]),
  assignment(1430, "en.grammar.zero_first_conditional.if_when_unless", [sense("shelter", "укрываться", "verb")], [], ["Unless the storm stops, we will shelter indoors."]),
  assignment(1431, "en.grammar.zero_first_conditional.if_when_unless", [sense("lock", "запирать", "verb")], [], ["If water rises, lock the gate."]),
  assignment(1432, "en.grammar.zero_first_conditional.if_when_unless", [], ["en.detour.verb.01", "en.restart.verb.01", "en.discard.verb.01", "en.lock.verb.01"], ["If the road closes, we will detour.", "If the app freezes, restart it.", "Unless the label is clear, discard the package.", "If water rises, lock the gate."]),
  // Lesson 26 / Chapter 5: practical imperatives demonstrate that either
  // clause order carries the same conditional relationship.
  assignment(1433, "en.grammar.zero_first_conditional.clause_order", [sense("listen", "слушать", "verb")], [], ["Listen carefully if you join the tour."]),
  assignment(1434, "en.grammar.zero_first_conditional.clause_order", [sense("schedule", "назначать по времени", "verb")], [], ["Schedule a visit if you need advice."]),
  assignment(1435, "en.grammar.zero_first_conditional.clause_order", [sense("order", "заказывать", "verb")], [], ["Order early if you want delivery."]),
  assignment(1436, "en.grammar.zero_first_conditional.clause_order", [sense("select", "выбирать", "verb")], [], ["Select a size if the page opens."]),
  assignment(1437, "en.grammar.zero_first_conditional.clause_order", [sense("try", "пробовать", "verb")], [], ["Try it if you want a sample."]),
  assignment(1438, "en.grammar.zero_first_conditional.clause_order", [sense("save", "сохранять", "verb")], [], ["Save the link if you need it later."]),
  assignment(1439, "en.grammar.zero_first_conditional.clause_order", [sense("search", "искать", "verb")], [], ["Search online if you need details."]),
  assignment(1440, "en.grammar.zero_first_conditional.clause_order", [], ["en.listen.verb.01", "en.order.verb.01", "en.try.verb.01", "en.search.verb.01"], ["Listen carefully if you join the tour.", "Order early if you want delivery.", "Try it if you want a sample.", "Search online if you need details."]),
  // Lesson 26 / Chapter 6: a changed environmental context retrieves the
  // conditional system through concrete actions and observable consequences.
  assignment(1441, "en.grammar.zero_first_conditional.clause_order", [sense("reuse", "использовать повторно", "verb")], [], ["We reuse jars at home."]),
  assignment(1442, "en.grammar.zero_first_conditional.clause_order", [sense("preserve", "сохранять", "verb")], [], ["Trees preserve the soil."]),
  assignment(1443, "en.grammar.zero_first_conditional.clause_order", [sense("conserve", "экономить; беречь", "verb")], [], ["We conserve water every day."]),
  assignment(1444, "en.grammar.zero_first_conditional.clause_order", [sense("waste", "тратить впустую", "verb")], [], ["Do not waste paper."]),
  assignment(1445, "en.grammar.zero_first_conditional.clause_order", [sense("pollute", "загрязнять", "verb")], [], ["Factories pollute the river."]),
  assignment(1446, "en.grammar.zero_first_conditional.clause_order", [sense("compost", "компостировать", "verb")], [], ["We compost food scraps."]),
  assignment(1447, "en.grammar.zero_first_conditional.clause_order", [sense("harvest", "собирать урожай", "verb")], [], ["Farmers harvest crops."]),
  assignment(1448, "en.grammar.zero_first_conditional.clause_order", [], ["en.reuse.verb.01", "en.conserve.verb.01", "en.pollute.verb.01", "en.harvest.verb.01"], ["We reuse jars at home.", "We conserve water every day.", "Factories pollute the river.", "Farmers harvest crops."]),
  // Lesson 26 / Chapter 7: community decisions transfer the conditional
  // system to a civic context, with every action in a distinct relationship.
  assignment(1449, "en.grammar.zero_first_conditional.clause_order", [sense("vote", "голосовать", "verb")], [], ["If neighbours vote, we will count the results."]),
  assignment(1450, "en.grammar.zero_first_conditional.clause_order", [sense("elect", "избирать", "verb")], [], ["People elect leaders if they agree."]),
  assignment(1451, "en.grammar.zero_first_conditional.clause_order", [sense("propose", "предлагать", "verb")], [], ["We will propose a change if people ask."]),
  assignment(1452, "en.grammar.zero_first_conditional.clause_order", [sense("reject", "отклонять", "verb")], [], ["Council will reject it unless evidence improves."]),
  assignment(1453, "en.grammar.zero_first_conditional.clause_order", [sense("rally", "объединяться для поддержки", "verb")], [], ["Residents rally when they need help."]),
  assignment(1454, "en.grammar.zero_first_conditional.clause_order", [sense("petition", "подавать петицию", "verb")], [], ["People petition if a rule seems unfair."]),
  assignment(1455, "en.grammar.zero_first_conditional.clause_order", [sense("campaign", "проводить кампанию", "verb")], [], ["Groups campaign when they want change."]),
  assignment(1456, "en.grammar.zero_first_conditional.clause_order", [], ["en.vote.verb.01", "en.propose.verb.01", "en.rally.verb.01", "en.campaign.verb.01"], ["If neighbours vote, we will count the results.", "We will propose a change if people ask.", "Residents rally when they need help.", "Groups campaign when they want change."]),
  // Lesson 27 / Chapter 1: imaginative possessions and abilities make each
  // second-conditional outcome clearly unreal rather than a future plan.
  assignment(1457, "en.grammar.second_conditional_wishes.unreal_condition", [sense("invent", "изобретать", "verb")], [], ["If I had a workshop, I would invent toys."]),
  assignment(1458, "en.grammar.second_conditional_wishes.unreal_condition", [sense("cultivate", "выращивать", "verb")], [], ["If I had a farm, I would cultivate herbs."]),
  assignment(1459, "en.grammar.second_conditional_wishes.unreal_condition", [sense("adopt", "брать к себе; усыновлять", "verb")], [], ["If I had a shelter, I would adopt a dog."]),
  assignment(1460, "en.grammar.second_conditional_wishes.unreal_condition", [sense("fund", "финансировать", "verb")], [], ["If I had savings, I would fund a library."]),
  assignment(1461, "en.grammar.second_conditional_wishes.unreal_condition", [sense("sponsor", "спонсировать", "verb")], [], ["If I had a company, I would sponsor a team."]),
  assignment(1462, "en.grammar.second_conditional_wishes.unreal_condition", [sense("manufacture", "изготавливать", "verb")], [], ["If I had a factory, I would manufacture furniture."]),
  assignment(1463, "en.grammar.second_conditional_wishes.unreal_condition", [sense("build", "строить", "verb")], [], ["If I had time, I would build a treehouse."]),
  assignment(1464, "en.grammar.second_conditional_wishes.unreal_condition", [], ["en.invent.verb.01", "en.adopt.verb.01", "en.sponsor.verb.01", "en.build.verb.01"], ["If I had a workshop, I would invent toys.", "If I had a shelter, I would adopt a dog.", "If I had a company, I would sponsor a team.", "If I had time, I would build a treehouse."]),
  // Lesson 27 / Chapter 2: `If I were …` puts varied imagined roles ahead of
  // their hypothetical actions, keeping the were-form meaningful and visible.
  assignment(1465, "en.grammar.second_conditional_wishes.if_i_were", [sense("paramedic", "фельдшер; парамедик", "noun")], [], ["If I were a paramedic, I would help people."]),
  assignment(1466, "en.grammar.second_conditional_wishes.if_i_were", [sense("journalist", "журналист", "noun")], [], ["If I were a journalist, I would report stories."]),
  assignment(1467, "en.grammar.second_conditional_wishes.if_i_were", [sense("scientist", "учёный", "noun")], [], ["If I were a scientist, I would test ideas."]),
  assignment(1468, "en.grammar.second_conditional_wishes.if_i_were", [sense("botanist", "ботаник", "noun")], [], ["If I were a botanist, I would grow herbs."]),
  assignment(1469, "en.grammar.second_conditional_wishes.if_i_were", [sense("musician", "музыкант", "noun")], [], ["If I were a musician, I would compose music."]),
  assignment(1470, "en.grammar.second_conditional_wishes.if_i_were", [sense("farmer", "фермер", "noun")], [], ["If I were a farmer, I would harvest crops."]),
  assignment(1471, "en.grammar.second_conditional_wishes.if_i_were", [sense("engineer", "инженер", "noun")], [], ["If I were an engineer, I would build bridges."]),
  assignment(1472, "en.grammar.second_conditional_wishes.if_i_were", [], ["en.paramedic.noun.01", "en.scientist.noun.01", "en.musician.noun.01", "en.engineer.noun.01"], ["If I were a paramedic, I would help people.", "If I were a scientist, I would test ideas.", "If I were a musician, I would compose music.", "If I were an engineer, I would build bridges."]),
  // Lesson 27 / Chapter 3: each outcome starts with `would` and depends on an
  // imagined condition, giving the result clause its own meaningful action.
  assignment(1473, "en.grammar.second_conditional_wishes.would_result", [sense("rearrange", "переставлять", "verb")], [], ["If I had a bigger room, I would rearrange the furniture."]),
  assignment(1474, "en.grammar.second_conditional_wishes.would_result", [sense("upgrade", "обновлять", "verb")], [], ["If I earned more, I would upgrade my computer."]),
  assignment(1475, "en.grammar.second_conditional_wishes.would_result", [sense("landscape", "благоустраивать участок", "verb")], [], ["If I had a garden, I would landscape it."]),
  assignment(1476, "en.grammar.second_conditional_wishes.would_result", [sense("backpack", "путешествовать с рюкзаком", "verb")], [], ["If I had a free week, I would backpack abroad."]),
  assignment(1477, "en.grammar.second_conditional_wishes.would_result", [sense("invest", "вкладывать деньги", "verb")], [], ["If I had savings, I would invest them."]),
  assignment(1478, "en.grammar.second_conditional_wishes.would_result", [sense("mentor", "наставлять", "verb")], [], ["If I had experience, I would mentor new staff."]),
  assignment(1479, "en.grammar.second_conditional_wishes.would_result", [sense("launch", "запускать", "verb")], [], ["If I had money, I would launch a business."]),
  assignment(1480, "en.grammar.second_conditional_wishes.would_result", [], ["en.rearrange.verb.01", "en.landscape.verb.01", "en.invest.verb.01", "en.launch.verb.01"], ["If I had a bigger room, I would rearrange the furniture.", "If I had a garden, I would landscape it.", "If I had savings, I would invest them.", "If I had money, I would launch a business."]),
  // Lesson 27 / Chapter 4: each abstract noun makes a present wish concrete
  // while preserving the past-form meaning of an unreal current state.
  assignment(1481, "en.grammar.second_conditional_wishes.wish_present", [sense("clarity", "ясность", "noun")], [], ["I wish I had more clarity."]),
  assignment(1482, "en.grammar.second_conditional_wishes.wish_present", [sense("recognition", "признание", "noun")], [], ["She wishes she had recognition."]),
  assignment(1483, "en.grammar.second_conditional_wishes.wish_present", [sense("independence", "независимость", "noun")], [], ["We wish we had more independence."]),
  assignment(1484, "en.grammar.second_conditional_wishes.wish_present", [sense("belonging", "чувство принадлежности", "noun")], [], ["They wish they had a sense of belonging."]),
  assignment(1485, "en.grammar.second_conditional_wishes.wish_present", [sense("routine", "распорядок", "noun")], [], ["I wish I had a better routine."]),
  assignment(1486, "en.grammar.second_conditional_wishes.wish_present", [sense("purpose", "цель; смысл", "noun")], [], ["He wishes he had a clear purpose."]),
  assignment(1487, "en.grammar.second_conditional_wishes.wish_present", [sense("adventure", "приключение", "noun")], [], ["She wishes she had more adventure."]),
  assignment(1488, "en.grammar.second_conditional_wishes.wish_present", [], ["en.clarity.noun.01", "en.independence.noun.01", "en.routine.noun.01", "en.adventure.noun.01"], ["I wish I had more clarity.", "We wish we had more independence.", "I wish I had a better routine.", "She wishes she had more adventure."]),
  // Lesson 27 / Chapter 5: changed-context wishes name practical supports and
  // opportunities that are absent in the current situation.
  assignment(1489, "en.grammar.second_conditional_wishes.wish_present", [sense("solution", "решение", "noun")], [], ["I wish I had a solution."]),
  assignment(1490, "en.grammar.second_conditional_wishes.wish_present", [sense("access", "доступ", "noun")], [], ["She wishes she had access to the course."]),
  assignment(1491, "en.grammar.second_conditional_wishes.wish_present", [sense("guidance", "руководство; совет", "noun")], [], ["We wish we had guidance."]),
  assignment(1492, "en.grammar.second_conditional_wishes.wish_present", [sense("feedback", "обратная связь", "noun")], [], ["They wish they had feedback."]),
  assignment(1493, "en.grammar.second_conditional_wishes.wish_present", [sense("opportunity", "возможность", "noun")], [], ["He wishes he had an opportunity."]),
  assignment(1494, "en.grammar.second_conditional_wishes.wish_present", [sense("balance", "баланс", "noun")], [], ["I wish I had more balance."]),
  assignment(1495, "en.grammar.second_conditional_wishes.wish_present", [sense("skill", "навык", "noun")], [], ["She wishes she had a new skill."]),
  assignment(1496, "en.grammar.second_conditional_wishes.wish_present", [], ["en.solution.noun.01", "en.guidance.noun.01", "en.opportunity.noun.01", "en.skill.noun.01"], ["I wish I had a solution.", "We wish we had guidance.", "He wishes he had an opportunity.", "She wishes she had a new skill."]),
  // Lesson 27 / Chapter 6: relationship terms transfer unreal conditions and
  // present wishes into a changed interpersonal decision context.
  assignment(1497, "en.grammar.second_conditional_wishes.wish_present", [sense("conflict", "конфликт", "noun")], [], ["I wish the conflict were over."]),
  assignment(1498, "en.grammar.second_conditional_wishes.wish_present", [sense("agreement", "соглашение", "noun")], [], ["An agreement would help if both sides accepted it."]),
  assignment(1499, "en.grammar.second_conditional_wishes.wish_present", [sense("misunderstanding", "недопонимание", "noun")], [], ["The misunderstanding would end if we talked."]),
  assignment(1500, "en.grammar.second_conditional_wishes.wish_present", [sense("empathy", "сопереживание", "noun")], [], ["If we had more empathy, we would listen."]),
  assignment(1501, "en.grammar.second_conditional_wishes.wish_present", [sense("tolerance", "терпимость", "noun")], [], ["I wish there were more tolerance."]),
  assignment(1502, "en.grammar.second_conditional_wishes.wish_present", [sense("loyalty", "верность", "noun")], [], ["Loyalty would matter if the team changed."]),
  assignment(1503, "en.grammar.second_conditional_wishes.wish_present", [sense("boundary", "граница", "noun")], [], ["We would respect a boundary if we knew it."]),
  assignment(1504, "en.grammar.second_conditional_wishes.wish_present", [], ["en.conflict.noun.01", "en.misunderstanding.noun.01", "en.tolerance.noun.01", "en.boundary.noun.01"], ["I wish the conflict were over.", "The misunderstanding would end if we talked.", "I wish there were more tolerance.", "We would respect a boundary if we knew it."]),
  // Lesson 27 / Chapter 7: final transfer names reflective capacities that
  // make unreal conditions and wishes personally meaningful in new contexts.
  assignment(1505, "en.grammar.second_conditional_wishes.wish_present", [sense("perspective", "точка зрения", "noun")], [], ["I wish I had more perspective."]),
  assignment(1506, "en.grammar.second_conditional_wishes.wish_present", [sense("ambition", "амбиция", "noun")], [], ["If I had more ambition, I would take risks."]),
  assignment(1507, "en.grammar.second_conditional_wishes.wish_present", [sense("potential", "потенциал", "noun")], [], ["Potential would grow if we had support."]),
  assignment(1508, "en.grammar.second_conditional_wishes.wish_present", [sense("motivation", "мотивация", "noun")], [], ["If I had motivation, I would practise daily."]),
  assignment(1509, "en.grammar.second_conditional_wishes.wish_present", [sense("resilience", "стойкость", "noun")], [], ["Resilience would help if work got hard."]),
  assignment(1510, "en.grammar.second_conditional_wishes.wish_present", [sense("identity", "самоидентичность", "noun")], [], ["If I had a clear identity, I would feel confident."]),
  assignment(1511, "en.grammar.second_conditional_wishes.wish_present", [sense("insight", "понимание; озарение", "noun")], [], ["If I had insight, I would choose differently."]),
  assignment(1512, "en.grammar.second_conditional_wishes.wish_present", [], ["en.perspective.noun.01", "en.potential.noun.01", "en.resilience.noun.01", "en.insight.noun.01"], ["I wish I had more perspective.", "Potential would grow if we had support.", "Resilience would help if work got hard.", "If I had insight, I would choose differently."]),
  // Lesson 28 / Chapter 1: visible everyday processes foreground their result,
  // so present passive is grounded in what is done rather than by whom.
  assignment(1513, "en.grammar.passive_voice.present_passive", [sense("produce", "производить", "verb")], [], ["Food is produced locally."]),
  assignment(1514, "en.grammar.passive_voice.present_passive", [sense("generate", "генерировать; производить", "verb")], [], ["Power is generated here."]),
  assignment(1515, "en.grammar.passive_voice.present_passive", [sense("package", "упаковывать", "verb")], [], ["Orders are packaged carefully."]),
  assignment(1516, "en.grammar.passive_voice.present_passive", [sense("ship", "отправлять; перевозить", "verb")], [], ["Boxes are shipped daily."]),
  assignment(1517, "en.grammar.passive_voice.present_passive", [sense("wrap", "заворачивать", "verb")], [], ["Gifts are wrapped here."]),
  assignment(1518, "en.grammar.passive_voice.present_passive", [sense("bottle", "разливать по бутылкам", "verb")], [], ["Juice is bottled nearby."]),
  assignment(1519, "en.grammar.passive_voice.present_passive", [sense("display", "выставлять; показывать", "verb")], [], ["Maps are displayed at the entrance."]),
  assignment(1520, "en.grammar.passive_voice.present_passive", [], ["en.produce.verb.01", "en.package.verb.01", "en.wrap.verb.01", "en.display.verb.01"], ["Food is produced locally.", "Orders are packaged carefully.", "Gifts are wrapped here.", "Maps are displayed at the entrance."]),
  // Lesson 28 / Chapter 2: dated completed events make the object-first past
  // passive meaningful while each new verb has a visible finished result.
  assignment(1521, "en.grammar.passive_voice.past_passive", [sense("rename", "переименовывать", "verb")], [], ["The street was renamed last year."]),
  assignment(1522, "en.grammar.passive_voice.past_passive", [sense("bury", "закапывать", "verb")], [], ["The time capsule was buried in 1990."]),
  assignment(1523, "en.grammar.passive_voice.past_passive", [sense("swap", "менять местами", "verb")], [], ["The seats were swapped before the show."]),
  assignment(1524, "en.grammar.passive_voice.past_passive", [sense("delete", "удалять", "verb")], [], ["The file was deleted by mistake."]),
  assignment(1525, "en.grammar.passive_voice.past_passive", [sense("copy", "копировать", "verb")], [], ["The form was copied yesterday."]),
  assignment(1526, "en.grammar.passive_voice.past_passive", [sense("locate", "находить; определять местонахождение", "verb")], [], ["The missing bag was located at noon."]),
  assignment(1527, "en.grammar.passive_voice.past_passive", [sense("stamp", "ставить штамп", "verb")], [], ["The letters were stamped at the post office."]),
  assignment(1528, "en.grammar.passive_voice.past_passive", [], ["en.rename.verb.01", "en.swap.verb.01", "en.copy.verb.01", "en.stamp.verb.01"], ["The street was renamed last year.", "The seats were swapped before the show.", "The form was copied yesterday.", "The letters were stamped at the post office."]),
  // Lesson 28 / Chapter 3: future service and media outcomes use `will be`
  // plus a participle, keeping the future result foregrounded over its agent.
  assignment(1529, "en.grammar.passive_voice.future_passive", [sense("deploy", "развёртывать", "verb")], [], ["The update will be deployed tonight."]),
  assignment(1530, "en.grammar.passive_voice.future_passive", [sense("broadcast", "транслировать", "verb")], [], ["The game will be broadcast live."]),
  assignment(1531, "en.grammar.passive_voice.future_passive", [sense("release", "выпускать", "verb")], [], ["The album will be released Friday."]),
  assignment(1532, "en.grammar.passive_voice.future_passive", [sense("issue", "выдавать; выпускать", "verb")], [], ["New cards will be issued soon."]),
  assignment(1533, "en.grammar.passive_voice.future_passive", [sense("provide", "предоставлять", "verb")], [], ["Help will be provided."]),
  assignment(1534, "en.grammar.passive_voice.future_passive", [sense("post", "публиковать; размещать", "verb")], [], ["Details will be posted online."]),
  assignment(1535, "en.grammar.passive_voice.future_passive", [sense("list", "вносить в список", "verb")], [], ["The results will be listed tomorrow."]),
  assignment(1536, "en.grammar.passive_voice.future_passive", [], ["en.deploy.verb.01", "en.release.verb.01", "en.provide.verb.01", "en.list.verb.01"], ["The update will be deployed tonight.", "The album will be released Friday.", "Help will be provided.", "The results will be listed tomorrow."]),
  // Lesson 28 / Chapter 4: modal-passive procedures make obligation,
  // permission, and recommendation meaningful without naming an agent.
  assignment(1537, "en.grammar.passive_voice.modal_passive", [sense("sanitize", "дезинфицировать", "verb")], [], ["Equipment must be sanitized."]),
  assignment(1538, "en.grammar.passive_voice.modal_passive", [sense("sterilize", "стерилизовать", "verb")], [], ["Tools should be sterilized."]),
  assignment(1539, "en.grammar.passive_voice.modal_passive", [sense("dispose", "утилизировать", "verb")], [], ["Waste must be disposed of."]),
  assignment(1540, "en.grammar.passive_voice.modal_passive", [sense("revise", "пересматривать", "verb")], [], ["Plans can be revised."]),
  assignment(1541, "en.grammar.passive_voice.modal_passive", [sense("restrict", "ограничивать", "verb")], [], ["Access must be restricted."]),
  assignment(1542, "en.grammar.passive_voice.modal_passive", [sense("insure", "страховать", "verb")], [], ["Packages should be insured."]),
  assignment(1543, "en.grammar.passive_voice.modal_passive", [sense("enforce", "обеспечивать соблюдение", "verb")], [], ["Rules must be enforced."]),
  assignment(1544, "en.grammar.passive_voice.modal_passive", [], ["en.sanitize.verb.01", "en.dispose.verb.01", "en.restrict.verb.01", "en.enforce.verb.01"], ["Equipment must be sanitized.", "Waste must be disposed of.", "Access must be restricted.", "Rules must be enforced."]),
  // Lesson 28 / Chapter 5: named creators make the optional `by` agent
  // informative rather than a mechanically appended phrase.
  assignment(1545, "en.grammar.passive_voice.by_agent", [sense("sculptor", "скульптор", "noun")], [], ["The mural was painted by a sculptor."]),
  assignment(1546, "en.grammar.passive_voice.by_agent", [sense("filmmaker", "кинематографист", "noun")], [], ["The film was directed by a filmmaker."]),
  assignment(1547, "en.grammar.passive_voice.by_agent", [sense("composer", "композитор", "noun")], [], ["The song was composed by a composer."]),
  assignment(1548, "en.grammar.passive_voice.by_agent", [sense("illustrator", "иллюстратор", "noun")], [], ["The book was illustrated by an illustrator."]),
  assignment(1549, "en.grammar.passive_voice.by_agent", [sense("inventor", "изобретатель", "noun")], [], ["The machine was invented by an inventor."]),
  assignment(1550, "en.grammar.passive_voice.by_agent", [sense("analyst", "аналитик", "noun")], [], ["The report was reviewed by an analyst."]),
  assignment(1551, "en.grammar.passive_voice.by_agent", [sense("photographer", "фотограф", "noun")], [], ["The photo was taken by a photographer."]),
  assignment(1552, "en.grammar.passive_voice.by_agent", [], ["en.sculptor.noun.01", "en.composer.noun.01", "en.inventor.noun.01", "en.photographer.noun.01"], ["The mural was painted by a sculptor.", "The song was composed by a composer.", "The machine was invented by an inventor.", "The photo was taken by a photographer."]),
  // Lesson 28 / Chapter 6: cumulative passive and unreal-condition review
  // stays lexical through distinct wishable capacities, without reopening a
  // grammar operation or reusing a prior lexical sense.
  assignment(1553, "en.grammar.second_conditional_wishes.wish_present", [sense("certainty", "уверенность; определённость", "noun")], [], ["I wish I had more certainty."]),
  assignment(1554, "en.grammar.second_conditional_wishes.wish_present", [sense("composure", "самообладание", "noun")], [], ["She wishes she had more composure."]),
  assignment(1555, "en.grammar.second_conditional_wishes.wish_present", [sense("momentum", "движущая сила; импульс", "noun")], [], ["I wish I had more momentum."]),
  assignment(1556, "en.grammar.second_conditional_wishes.wish_present", [sense("assurance", "уверенность", "noun")], [], ["She wishes she had assurance."]),
  assignment(1557, "en.grammar.second_conditional_wishes.wish_present", [sense("focus", "сосредоточенность", "noun")], [], ["I wish I had more focus."]),
  assignment(1558, "en.grammar.second_conditional_wishes.wish_present", [sense("direction", "направление", "noun")], [], ["She wishes she had direction."]),
  assignment(1559, "en.grammar.second_conditional_wishes.wish_present", [sense("wisdom", "мудрость", "noun")], [], ["I wish I had more wisdom."]),
  assignment(1560, "en.grammar.second_conditional_wishes.wish_present", [], ["en.certainty.noun.01", "en.composure.noun.01", "en.focus.noun.01", "en.wisdom.noun.01"], ["I wish I had more certainty.", "She wishes she had more composure.", "I wish I had more focus.", "I wish I had more wisdom."]),
  // Lesson 28 / Chapter 7: the final mixed review closes with public standing
  // and identity vocabulary, each in a distinct wish frame.
  assignment(1561, "en.grammar.second_conditional_wishes.wish_present", [sense("reputation", "репутация", "noun")], [], ["I wish I had a better reputation."]),
  assignment(1562, "en.grammar.second_conditional_wishes.wish_present", [sense("legacy", "наследие", "noun")], [], ["She wishes she had a lasting legacy."]),
  assignment(1563, "en.grammar.second_conditional_wishes.wish_present", [sense("credibility", "доверие; достоверность", "noun")], [], ["I wish I had more credibility."]),
  assignment(1564, "en.grammar.second_conditional_wishes.wish_present", [sense("integrity", "честность; принципиальность", "noun")], [], ["She wishes she had more integrity."]),
  assignment(1565, "en.grammar.second_conditional_wishes.wish_present", [sense("notoriety", "известность; дурная слава", "noun")], [], ["I wish I had less notoriety."]),
  assignment(1566, "en.grammar.second_conditional_wishes.wish_present", [sense("prestige", "престиж", "noun")], [], ["She wishes she had more prestige."]),
  assignment(1567, "en.grammar.second_conditional_wishes.wish_present", [sense("renown", "слава", "noun")], [], ["I wish I had greater renown."]),
  assignment(1568, "en.grammar.second_conditional_wishes.wish_present", [], ["en.reputation.noun.01", "en.credibility.noun.01", "en.notoriety.noun.01", "en.renown.noun.01"], ["I wish I had a better reputation.", "I wish I had more credibility.", "I wish I had less notoriety.", "I wish I had greater renown."]),
  // Lesson 29 / Chapter 1: defining relatives distinguish a person or thing
  // from a set by naming a concrete role, object, or route.
  assignment(1569, "en.grammar.defining_relative_clauses.who_which_that", [sense("vendor", "продавец", "noun")], [], ["The vendor who helped is kind.", "The device that works is new."]),
  assignment(1570, "en.grammar.defining_relative_clauses.who_which_that", [sense("device", "устройство", "noun")], [], ["The device that works is new."]),
  assignment(1571, "en.grammar.defining_relative_clauses.who_which_that", [sense("tool", "инструмент", "noun")], [], ["The tool that fits is useful."]),
  assignment(1572, "en.grammar.defining_relative_clauses.who_which_that", [sense("route", "маршрут", "noun")], [], ["The route that passes here is short."]),
  assignment(1573, "en.grammar.defining_relative_clauses.who_which_that", [sense("candidate", "кандидат", "noun")], [], ["The candidate who spoke is prepared."]),
  assignment(1574, "en.grammar.defining_relative_clauses.who_which_that", [sense("resident", "житель", "noun")], [], ["The resident who called is waiting."]),
  assignment(1575, "en.grammar.defining_relative_clauses.who_which_that", [sense("method", "метод", "noun")], [], ["The method that works is simple."]),
  assignment(1576, "en.grammar.defining_relative_clauses.who_which_that", [], ["en.vendor.noun.01", "en.tool.noun.01", "en.candidate.noun.01", "en.method.noun.01"], ["The vendor who helped is kind.", "The tool that fits is useful.", "The candidate who spoke is prepared.", "The method that works is simple."]),
  // Lesson 29 / Chapter 2: `whose` attaches each distinct possession to its
  // owner, keeping the relationship visible in a single defining clause.
  assignment(1577, "en.grammar.defining_relative_clauses.whose", [sense("estate", "имущество; поместье", "noun")], [], ["The woman whose estate was sold is calm.", "I met the man whose heirloom was lost."]),
  assignment(1578, "en.grammar.defining_relative_clauses.whose", [sense("heirloom", "семейная реликвия", "noun")], [], ["I met the man whose heirloom was lost."]),
  assignment(1579, "en.grammar.defining_relative_clauses.whose", [sense("surname", "фамилия", "noun")], [], ["The guest whose surname changed is here."]),
  assignment(1580, "en.grammar.defining_relative_clauses.whose", [sense("fortune", "состояние; удача", "noun")], [], ["The person whose fortune grew is modest."]),
  assignment(1581, "en.grammar.defining_relative_clauses.whose", [sense("trademark", "товарный знак", "noun")], [], ["The firm whose trademark changed is known."]),
  assignment(1582, "en.grammar.defining_relative_clauses.whose", [sense("ancestry", "происхождение", "noun")], [], ["The student whose ancestry is mixed is proud."]),
  assignment(1583, "en.grammar.defining_relative_clauses.whose", [sense("property", "собственность", "noun")], [], ["The owner whose property was damaged is upset."]),
  assignment(1584, "en.grammar.defining_relative_clauses.whose", [], ["en.estate.noun.01", "en.surname.noun.01", "en.trademark.noun.01", "en.property.noun.01"], ["The woman whose estate was sold is calm.", "The guest whose surname changed is here.", "The firm whose trademark changed is known.", "The owner whose property was damaged is upset."]),
  // Lesson 29 / Chapter 3: `where` selects a distinct usable location and
  // pairs it with one action that makes that location identifiable.
  assignment(1585, "en.grammar.defining_relative_clauses.where", [sense("theatre", "театр", "noun")], [], ["I know a theatre where you can sit quietly.", "This is the hostel where we stayed."]),
  assignment(1586, "en.grammar.defining_relative_clauses.where", [sense("hostel", "хостел", "noun")], [], ["This is the hostel where we stayed."]),
  assignment(1587, "en.grammar.defining_relative_clauses.where", [sense("canteen", "столовая", "noun")], [], ["I know a canteen where they serve soup."]),
  assignment(1588, "en.grammar.defining_relative_clauses.where", [sense("atrium", "атриум", "noun")], [], ["This is the atrium where we met."]),
  assignment(1589, "en.grammar.defining_relative_clauses.where", [sense("studio", "студия", "noun")], [], ["I know a studio where you can record music."]),
  assignment(1590, "en.grammar.defining_relative_clauses.where", [sense("archive", "архив", "noun")], [], ["This is the archive where records are kept."]),
  assignment(1591, "en.grammar.defining_relative_clauses.where", [sense("nursery", "питомник; ясли", "noun")], [], ["I know a nursery where plants grow."]),
  assignment(1592, "en.grammar.defining_relative_clauses.where", [], ["en.theatre.noun.01", "en.canteen.noun.01", "en.studio.noun.01", "en.nursery.noun.01"], ["I know a theatre where you can sit quietly.", "I know a canteen where they serve soup.", "I know a studio where you can record music.", "I know a nursery where plants grow."]),
  // Lesson 29 / Chapter 4: subject and object relative roles contrast people
  // who act with people whom another person addresses or remembers.
  assignment(1593, "en.grammar.defining_relative_clauses.subject_object_roles", [sense("benefactor", "благотворитель", "noun")], [], ["The benefactor who helped me was generous.", "The benefactor who I called was busy."]),
  assignment(1594, "en.grammar.defining_relative_clauses.subject_object_roles", [sense("referee", "судья", "noun")], [], ["The referee who stopped the game was calm."]),
  assignment(1595, "en.grammar.defining_relative_clauses.subject_object_roles", [sense("curator", "куратор", "noun")], [], ["The curator who chose the art was careful."]),
  assignment(1596, "en.grammar.defining_relative_clauses.subject_object_roles", [sense("apprentice", "ученик; подмастерье", "noun")], [], ["The apprentice who I taught was ready."]),
  assignment(1597, "en.grammar.defining_relative_clauses.subject_object_roles", [sense("donor", "донор; жертвователь", "noun")], [], ["The donor who gave money was private."]),
  assignment(1598, "en.grammar.defining_relative_clauses.subject_object_roles", [sense("critic", "критик", "noun")], [], ["The critic who reviewed it was fair."]),
  assignment(1599, "en.grammar.defining_relative_clauses.subject_object_roles", [sense("visitor", "посетитель", "noun")], [], ["The visitor who I met was friendly."]),
  assignment(1600, "en.grammar.defining_relative_clauses.subject_object_roles", [], ["en.benefactor.noun.01", "en.curator.noun.01", "en.donor.noun.01", "en.visitor.noun.01"], ["The benefactor who helped me was generous.", "The curator who chose the art was careful.", "The donor who gave money was private.", "The visitor who I met was friendly."]),
  // Lesson 29 / Chapter 5: object relative clauses omit the object pronoun
  // while a distinct item remains the thing seen, read, or chosen.
  assignment(1601, "en.grammar.defining_relative_clauses.object_omission", [sense("manuscript", "рукопись", "noun")], [], ["The manuscript we read was clear.", "The sculpture I chose was unusual."]),
  assignment(1602, "en.grammar.defining_relative_clauses.object_omission", [sense("sculpture", "скульптура", "noun")], [], ["The sculpture I chose was unusual."]),
  assignment(1603, "en.grammar.defining_relative_clauses.object_omission", [sense("recipe", "рецепт", "noun")], [], ["The recipe we tried was simple."]),
  assignment(1604, "en.grammar.defining_relative_clauses.object_omission", [sense("instrument", "инструмент", "noun")], [], ["The instrument I played was old."]),
  assignment(1605, "en.grammar.defining_relative_clauses.object_omission", [sense("novel", "роман", "noun")], [], ["The novel we discussed was long."]),
  assignment(1606, "en.grammar.defining_relative_clauses.object_omission", [sense("memoir", "мемуары", "noun")], [], ["The memoir I borrowed was moving."]),
  assignment(1607, "en.grammar.defining_relative_clauses.object_omission", [sense("blueprint", "чертёж; план", "noun")], [], ["The blueprint we used was detailed."]),
  assignment(1608, "en.grammar.defining_relative_clauses.object_omission", [], ["en.manuscript.noun.01", "en.recipe.noun.01", "en.novel.noun.01", "en.blueprint.noun.01"], ["The manuscript we read was clear.", "The recipe we tried was simple.", "The novel we discussed was long.", "The blueprint we used was detailed."]),
  // Lesson 29 / Chapter 6: the cumulative review keeps each lexical target in
  // one distinct, meaningful condition or relative-clause context.
  assignment(1609, "en.grammar.defining_relative_clauses.object_omission", [sense("adaptability", "адаптивность", "noun")], [], ["The adaptability we need is growing."]),
  assignment(1610, "en.grammar.defining_relative_clauses.object_omission", [sense("coherence", "связность", "noun")], [], ["The coherence we noticed was useful."]),
  assignment(1611, "en.grammar.defining_relative_clauses.object_omission", [sense("precision", "точность", "noun")], [], ["The precision we require is high."]),
  assignment(1612, "en.grammar.defining_relative_clauses.object_omission", [sense("awareness", "осведомлённость", "noun")], [], ["The awareness we gained was valuable."]),
  assignment(1613, "en.grammar.defining_relative_clauses.object_omission", [sense("endurance", "выносливость", "noun")], [], ["The endurance we built was real."]),
  assignment(1614, "en.grammar.defining_relative_clauses.object_omission", [sense("judgement", "суждение", "noun")], [], ["The judgement we trusted was sound."]),
  assignment(1615, "en.grammar.defining_relative_clauses.object_omission", [sense("foresight", "предусмотрительность", "noun")], [], ["The foresight we needed was rare."]),
  assignment(1616, "en.grammar.defining_relative_clauses.object_omission", [], ["en.adaptability.noun.01", "en.precision.noun.01", "en.endurance.noun.01", "en.foresight.noun.01"], ["The adaptability we need is growing.", "The precision we require is high.", "The endurance we built was real.", "The foresight we needed was rare."]),
  // Lesson 29 / Chapter 7: closing review assigns only new reflective nouns
  // to distinct relative-clause contexts and retains the existing grammar.
  assignment(1617, "en.grammar.defining_relative_clauses.object_omission", [sense("synthesis", "синтез; обобщение", "noun")], [], ["The synthesis we reached was clear."]),
  assignment(1618, "en.grammar.defining_relative_clauses.object_omission", [sense("nuance", "нюанс", "noun")], [], ["The nuance we noticed was important."]),
  assignment(1619, "en.grammar.defining_relative_clauses.object_omission", [sense("aptitude", "способность", "noun")], [], ["The aptitude we saw was rare."]),
  assignment(1620, "en.grammar.defining_relative_clauses.object_omission", [sense("dexterity", "ловкость", "noun")], [], ["The dexterity we admired was impressive."]),
  assignment(1621, "en.grammar.defining_relative_clauses.object_omission", [sense("maturity", "зрелость", "noun")], [], ["The maturity we observed was welcome."]),
  assignment(1622, "en.grammar.defining_relative_clauses.object_omission", [sense("initiative", "инициатива", "noun")], [], ["The initiative we supported was useful."]),
  assignment(1623, "en.grammar.defining_relative_clauses.object_omission", [sense("discernment", "проницательность", "noun")], [], ["The discernment we valued was sound."]),
  assignment(1624, "en.grammar.defining_relative_clauses.object_omission", [], ["en.synthesis.noun.01", "en.aptitude.noun.01", "en.maturity.noun.01", "en.discernment.noun.01"], ["The synthesis we reached was clear.", "The aptitude we saw was rare.", "The maturity we observed was welcome.", "The discernment we valued was sound."]),
  // Lesson 30 / Chapter 1: reported statements transmit a different personal
  // state in each source utterance while retaining backshifted meaning.
  assignment(1625, "en.grammar.reported_speech.reported_statements", [sense("optimistic", "оптимистичный", "adjective")], [], ["She said that she was optimistic.", "He said he was disappointed."]),
  assignment(1626, "en.grammar.reported_speech.reported_statements", [sense("disappointed", "разочарованный", "adjective")], [], ["He said he was disappointed."]),
  assignment(1627, "en.grammar.reported_speech.reported_statements", [sense("frustrated", "раздосадованный", "adjective")], [], ["She said that she was frustrated."]),
  assignment(1628, "en.grammar.reported_speech.reported_statements", [sense("astonished", "потрясённый", "adjective")], [], ["He said he was astonished."]),
  assignment(1629, "en.grammar.reported_speech.reported_statements", [sense("devastated", "опустошённый", "adjective")], [], ["She said that she was devastated."]),
  assignment(1630, "en.grammar.reported_speech.reported_statements", [sense("hesitant", "нерешительный", "adjective")], [], ["He said he was hesitant."]),
  assignment(1631, "en.grammar.reported_speech.reported_statements", [sense("resentful", "обиженный", "adjective")], [], ["She said that she was resentful."]),
  assignment(1632, "en.grammar.reported_speech.reported_statements", [], ["en.optimistic.adjective.01", "en.frustrated.adjective.01", "en.devastated.adjective.01", "en.resentful.adjective.01"], ["She said that she was optimistic.", "She said that she was frustrated.", "She said that she was devastated.", "She said that she was resentful."]),
  // Lesson 30 / Chapter 2: indirect questions request one distinct piece of
  // practical information, preserving question order without a question mark.
  assignment(1633, "en.grammar.reported_speech.reported_questions", [sense("origin", "происхождение", "noun")], [], ["She asked where the origin was.", "He asked if the destination was ready."]),
  assignment(1634, "en.grammar.reported_speech.reported_questions", [sense("destination", "пункт назначения", "noun")], [], ["He asked if the destination was ready."]),
  assignment(1635, "en.grammar.reported_speech.reported_questions", [sense("preference", "предпочтение", "noun")], [], ["She asked what my preference was."]),
  assignment(1636, "en.grammar.reported_speech.reported_questions", [sense("location", "местоположение", "noun")], [], ["He asked where the location was."]),
  assignment(1637, "en.grammar.reported_speech.reported_questions", [sense("duration", "продолжительность", "noun")], [], ["She asked how long the duration was."]),
  assignment(1638, "en.grammar.reported_speech.reported_questions", [sense("motive", "мотив", "noun")], [], ["He asked what the motive was."]),
  assignment(1639, "en.grammar.reported_speech.reported_questions", [sense("rationale", "обоснование", "noun")], [], ["She asked what the rationale was."]),
  assignment(1640, "en.grammar.reported_speech.reported_questions", [], ["en.origin.noun.01", "en.preference.noun.01", "en.duration.noun.01", "en.rationale.noun.01"], ["She asked where the origin was.", "She asked what my preference was.", "She asked how long the duration was.", "She asked what the rationale was."]),
  // Lesson 30 / Chapter 3: reported commands and requests carry a precise
  // action without repeating any new verb within the chapter.
  assignment(1641, "en.grammar.reported_speech.reported_commands_requests", [sense("comply", "соблюдать", "verb")], [], ["She asked me to comply.", "He told us to apologise."]),
  assignment(1642, "en.grammar.reported_speech.reported_commands_requests", [sense("apologise", "извиняться", "verb")], [], ["He told us to apologise."]),
  assignment(1643, "en.grammar.reported_speech.reported_commands_requests", [sense("refrain", "воздерживаться", "verb")], [], ["She told me to refrain from shouting."]),
  assignment(1644, "en.grammar.reported_speech.reported_commands_requests", [sense("withdraw", "отзывать; уходить", "verb")], [], ["He asked us to withdraw the claim."]),
  assignment(1645, "en.grammar.reported_speech.reported_commands_requests", [sense("resume", "возобновлять", "verb")], [], ["She told me to resume work."]),
  assignment(1646, "en.grammar.reported_speech.reported_commands_requests", [sense("cooperate", "сотрудничать", "verb")], [], ["He asked us to cooperate."]),
  assignment(1647, "en.grammar.reported_speech.reported_commands_requests", [sense("elaborate", "развивать; уточнять", "verb")], [], ["She asked me to elaborate on the point."]),
  assignment(1648, "en.grammar.reported_speech.reported_commands_requests", [], ["en.comply.verb.01", "en.refrain.verb.01", "en.resume.verb.01", "en.elaborate.verb.01"], ["She asked me to comply.", "She told me to refrain from shouting.", "She told me to resume work.", "She asked me to elaborate on the point."]),
  // Lesson 30 / Chapter 4: say, tell, and ask distinguish message types and
  // recipients with one new reportable noun per activity.
  assignment(1649, "en.grammar.reported_speech.say_tell_ask", [sense("rumour", "слух", "noun")], [], ["She told me the rumour.", "He asked me about the confession."]),
  assignment(1650, "en.grammar.reported_speech.say_tell_ask", [sense("confession", "признание", "noun")], [], ["He asked me about the confession."]),
  assignment(1651, "en.grammar.reported_speech.say_tell_ask", [sense("allegation", "утверждение; обвинение", "noun")], [], ["She told us the allegation."]),
  assignment(1652, "en.grammar.reported_speech.say_tell_ask", [sense("invitation", "приглашение", "noun")], [], ["He asked me about the invitation."]),
  assignment(1653, "en.grammar.reported_speech.say_tell_ask", [sense("verdict", "вердикт", "noun")], [], ["She told me the verdict."]),
  assignment(1654, "en.grammar.reported_speech.say_tell_ask", [sense("testimony", "показание", "noun")], [], ["He told us the testimony."]),
  assignment(1655, "en.grammar.reported_speech.say_tell_ask", [sense("disclosure", "раскрытие; сообщение", "noun")], [], ["She asked me about the disclosure."]),
  assignment(1656, "en.grammar.reported_speech.say_tell_ask", [], ["en.rumour.noun.01", "en.allegation.noun.01", "en.verdict.noun.01", "en.disclosure.noun.01"], ["She told me the rumour.", "She told us the allegation.", "She told me the verdict.", "She asked me about the disclosure."]),
  // Lesson 30 / Chapter 5: bounded backshift reports one concrete status at a
  // time, avoiding a second lexical use inside the chapter.
  assignment(1657, "en.grammar.reported_speech.bounded_backshift", [sense("unavailable", "недоступный", "adjective")], [], ["She said she was unavailable.", "He said he was overdue."]),
  assignment(1658, "en.grammar.reported_speech.bounded_backshift", [sense("overdue", "просроченный", "adjective")], [], ["He said he was overdue."]),
  assignment(1659, "en.grammar.reported_speech.bounded_backshift", [sense("pending", "ожидающий решения", "adjective")], [], ["She said the request was pending."]),
  assignment(1660, "en.grammar.reported_speech.bounded_backshift", [sense("sufficient", "достаточный", "adjective")], [], ["He said the evidence was sufficient."]),
  assignment(1661, "en.grammar.reported_speech.bounded_backshift", [sense("confidential", "конфиденциальный", "adjective")], [], ["She said the file was confidential."]),
  assignment(1662, "en.grammar.reported_speech.bounded_backshift", [sense("voluntary", "добровольный", "adjective")], [], ["He said the work was voluntary."]),
  assignment(1663, "en.grammar.reported_speech.bounded_backshift", [sense("compulsory", "обязательный", "adjective")], [], ["She said the course was compulsory."]),
  assignment(1664, "en.grammar.reported_speech.bounded_backshift", [], ["en.unavailable.adjective.01", "en.pending.adjective.01", "en.confidential.adjective.01", "en.compulsory.adjective.01"], ["She said she was unavailable.", "She said the request was pending.", "She said the file was confidential.", "She said the course was compulsory."]),
  // Lesson 30 / Chapter 6: mixed review uses discrete professional qualities
  // in one independent meaningful frame apiece.
  assignment(1665, "en.grammar.reported_speech.reported_statements", [sense("consistency", "последовательность", "noun")], [], ["She said that consistency mattered."]),
  assignment(1666, "en.grammar.reported_speech.reported_statements", [sense("reliability", "надёжность", "noun")], [], ["He said reliability was essential."]),
  assignment(1667, "en.grammar.reported_speech.reported_statements", [sense("discretion", "осмотрительность", "noun")], [], ["She said discretion was necessary."]),
  assignment(1668, "en.grammar.reported_speech.reported_statements", [sense("diligence", "старательность", "noun")], [], ["He said diligence was valuable."]),
  assignment(1669, "en.grammar.reported_speech.reported_statements", [sense("accountability", "ответственность", "noun")], [], ["She said accountability was required."]),
  assignment(1670, "en.grammar.reported_speech.reported_statements", [sense("tact", "тактичность", "noun")], [], ["He said tact was important."]),
  assignment(1671, "en.grammar.reported_speech.reported_statements", [sense("impartiality", "беспристрастность", "noun")], [], ["She said impartiality was vital."]),
  assignment(1672, "en.grammar.reported_speech.reported_statements", [], ["en.consistency.noun.01", "en.discretion.noun.01", "en.accountability.noun.01", "en.impartiality.noun.01"], ["She said that consistency mattered.", "She said discretion was necessary.", "She said accountability was required.", "She said impartiality was vital."]),
  // Lesson 30 / Chapter 7: final reported-speech review names distinct
  // organizational capacities while retaining the existing grammar route.
  assignment(1673, "en.grammar.reported_speech.reported_statements", [sense("innovation", "инновация", "noun")], [], ["She said innovation was needed."]),
  assignment(1674, "en.grammar.reported_speech.reported_statements", [sense("collaboration", "сотрудничество", "noun")], [], ["He said collaboration was strong."]),
  assignment(1675, "en.grammar.reported_speech.reported_statements", [sense("leadership", "лидерство", "noun")], [], ["She said leadership was visible."]),
  assignment(1676, "en.grammar.reported_speech.reported_statements", [sense("stewardship", "ответственное управление", "noun")], [], ["He said stewardship was important."]),
  assignment(1677, "en.grammar.reported_speech.reported_statements", [sense("productivity", "производительность", "noun")], [], ["She said productivity was rising."]),
  assignment(1678, "en.grammar.reported_speech.reported_statements", [sense("proficiency", "владение; квалификация", "noun")], [], ["He said proficiency was improving."]),
  assignment(1679, "en.grammar.reported_speech.reported_statements", [sense("transparency", "прозрачность", "noun")], [], ["She said transparency was expected."]),
  assignment(1680, "en.grammar.reported_speech.reported_statements", [], ["en.innovation.noun.01", "en.leadership.noun.01", "en.productivity.noun.01", "en.transparency.noun.01"], ["She said innovation was needed.", "She said leadership was visible.", "She said productivity was rising.", "She said transparency was expected."]),
  // Lesson 31 / Chapter 1: indirect questions seek one distinct practical
  // location or service detail without reverting to direct-question order.
  assignment(1681, "en.grammar.complex_questions_clause_linking.indirect_questions", [sense("concourse", "зал вокзала; вестибюль", "noun")], [], ["Could you tell me where the concourse is?", "Do you know if the landmark is open?"]),
  assignment(1682, "en.grammar.complex_questions_clause_linking.indirect_questions", [sense("landmark", "достопримечательность", "noun")], [], ["Do you know if the landmark is open?"]),
  assignment(1683, "en.grammar.complex_questions_clause_linking.indirect_questions", [sense("vicinity", "окрестность", "noun")], [], ["Could you tell me where the vicinity is?"]),
  assignment(1684, "en.grammar.complex_questions_clause_linking.indirect_questions", [sense("opening", "открытие; вход", "noun")], [], ["Do you know if the opening is clear?"]),
  assignment(1685, "en.grammar.complex_questions_clause_linking.indirect_questions", [sense("capacity", "вместимость", "noun")], [], ["Could you tell me what the capacity is?"]),
  assignment(1686, "en.grammar.complex_questions_clause_linking.indirect_questions", [sense("accommodation", "размещение", "noun")], [], ["Do you know if accommodation is available?"]),
  assignment(1687, "en.grammar.complex_questions_clause_linking.indirect_questions", [sense("entranceway", "входной проход", "noun")], [], ["Could you tell me where the entranceway is?"]),
  assignment(1688, "en.grammar.complex_questions_clause_linking.indirect_questions", [], ["en.concourse.noun.01", "en.landmark.noun.01", "en.capacity.noun.01", "en.entranceway.noun.01"], ["Could you tell me where the concourse is?", "Do you know if the landmark is open?", "Could you tell me what the capacity is?", "Could you tell me where the entranceway is?"]),
  // Lesson 31 / Chapter 2: question tags check a single observable quality or
  // habit at a time, with no lexical target reused inside the chapter.
  assignment(1689, "en.grammar.complex_questions_clause_linking.question_tags", [sense("attentive", "внимательный", "adjective")], [], ["You're attentive, aren't you?", "She's candid, isn't she?"]),
  assignment(1690, "en.grammar.complex_questions_clause_linking.question_tags", [sense("candid", "откровенный", "adjective")], [], ["She's candid, isn't she?"]),
  assignment(1691, "en.grammar.complex_questions_clause_linking.question_tags", [sense("punctual", "пунктуальный", "adjective")], [], ["He's punctual, isn't he?"]),
  assignment(1692, "en.grammar.complex_questions_clause_linking.question_tags", [sense("decisive", "решительный", "adjective")], [], ["You're decisive, aren't you?"]),
  assignment(1693, "en.grammar.complex_questions_clause_linking.question_tags", [sense("observant", "наблюдательный", "adjective")], [], ["She's observant, isn't she?"]),
  assignment(1694, "en.grammar.complex_questions_clause_linking.question_tags", [sense("courteous", "вежливый", "adjective")], [], ["He's courteous, isn't he?"]),
  assignment(1695, "en.grammar.complex_questions_clause_linking.question_tags", [sense("methodical", "методичный", "adjective")], [], ["You're methodical, aren't you?"]),
  assignment(1696, "en.grammar.complex_questions_clause_linking.question_tags", [], ["en.attentive.adjective.01", "en.punctual.adjective.01", "en.observant.adjective.01", "en.methodical.adjective.01"], ["You're attentive, aren't you?", "He's punctual, isn't he?", "She's observant, isn't she?", "You're methodical, aren't you?"]),
  // Lesson 31 / Chapter 3: noun clauses make each new abstract relation the
  // content understood, known, or explained.
  assignment(1697, "en.grammar.complex_questions_clause_linking.noun_clauses", [sense("assumption", "предположение", "noun")], [], ["I understand why the assumption failed.", "I know that the consequence matters."]),
  assignment(1698, "en.grammar.complex_questions_clause_linking.noun_clauses", [sense("consequence", "последствие", "noun")], [], ["I know that the consequence matters."]),
  assignment(1699, "en.grammar.complex_questions_clause_linking.noun_clauses", [sense("implication", "следствие; смысл", "noun")], [], ["I understand why the implication is serious."]),
  assignment(1700, "en.grammar.complex_questions_clause_linking.noun_clauses", [sense("obstacle", "препятствие", "noun")], [], ["I know that the obstacle is real."]),
  assignment(1701, "en.grammar.complex_questions_clause_linking.noun_clauses", [sense("condition", "условие", "noun")], [], ["I understand why the condition changed."]),
  assignment(1702, "en.grammar.complex_questions_clause_linking.noun_clauses", [sense("circumstance", "обстоятельство", "noun")], [], ["I know that the circumstance is unusual."]),
  assignment(1703, "en.grammar.complex_questions_clause_linking.noun_clauses", [sense("premise", "предпосылка", "noun")], [], ["I understand why the premise is weak."]),
  assignment(1704, "en.grammar.complex_questions_clause_linking.noun_clauses", [], ["en.assumption.noun.01", "en.implication.noun.01", "en.condition.noun.01", "en.premise.noun.01"], ["I understand why the assumption failed.", "I understand why the implication is serious.", "I understand why the condition changed.", "I understand why the premise is weak."]),
  // Lesson 31 / Chapter 4: cause connectors connect distinct visible causes
  // with their result, one new cause noun per activity.
  assignment(1705, "en.grammar.complex_questions_clause_linking.cause_connectors", [sense("congestion", "перегруженность; затор", "noun")], [], ["The road was slow because of congestion.", "I stayed home because of fatigue."]),
  assignment(1706, "en.grammar.complex_questions_clause_linking.cause_connectors", [sense("fatigue", "усталость", "noun")], [], ["I stayed home because of fatigue."]),
  assignment(1707, "en.grammar.complex_questions_clause_linking.cause_connectors", [sense("illness", "болезнь", "noun")], [], ["The meeting was cancelled because of illness."]),
  assignment(1708, "en.grammar.complex_questions_clause_linking.cause_connectors", [sense("closure", "закрытие", "noun")], [], ["The shop was empty because of closure."]),
  assignment(1709, "en.grammar.complex_questions_clause_linking.cause_connectors", [sense("disruption", "сбой; нарушение", "noun")], [], ["The service was late because of disruption."]),
  assignment(1710, "en.grammar.complex_questions_clause_linking.cause_connectors", [sense("blackout", "отключение электричества", "noun")], [], ["The room was dark because of a blackout."]),
  assignment(1711, "en.grammar.complex_questions_clause_linking.cause_connectors", [sense("downpour", "ливень", "noun")], [], ["The match stopped because of a downpour."]),
  assignment(1712, "en.grammar.complex_questions_clause_linking.cause_connectors", [], ["en.congestion.noun.01", "en.illness.noun.01", "en.disruption.noun.01", "en.downpour.noun.01"], ["The road was slow because of congestion.", "The meeting was cancelled because of illness.", "The service was late because of disruption.", "The match stopped because of a downpour."]),
  // Lesson 31 / Chapter 5: contrast connectors set one new quality against a
  // distinct outcome, so the contrast is meaningful rather than repetitive.
  assignment(1713, "en.grammar.complex_questions_clause_linking.contrast_connectors", [sense("inconvenient", "неудобный", "adjective")], [], ["It was inconvenient, but we used it.", "Although it was scarce, we shared it."]),
  assignment(1714, "en.grammar.complex_questions_clause_linking.contrast_connectors", [sense("scarce", "дефицитный", "adjective")], [], ["Although it was scarce, we shared it."]),
  assignment(1715, "en.grammar.complex_questions_clause_linking.contrast_connectors", [sense("abundant", "обильный", "adjective")], [], ["It was abundant, but we saved it."]),
  assignment(1716, "en.grammar.complex_questions_clause_linking.contrast_connectors", [sense("impactful", "значимый", "adjective")], [], ["Although it was impactful, it was brief."]),
  assignment(1717, "en.grammar.complex_questions_clause_linking.contrast_connectors", [sense("outdated", "устаревший", "adjective")], [], ["It was outdated, but it worked."]),
  assignment(1718, "en.grammar.complex_questions_clause_linking.contrast_connectors", [sense("unpredictable", "непредсказуемый", "adjective")], [], ["Although it was unpredictable, we tried it."]),
  assignment(1719, "en.grammar.complex_questions_clause_linking.contrast_connectors", [sense("profitable", "выгодный", "adjective")], [], ["It was profitable, but risky."]),
  assignment(1720, "en.grammar.complex_questions_clause_linking.contrast_connectors", [], ["en.inconvenient.adjective.01", "en.abundant.adjective.01", "en.outdated.adjective.01", "en.profitable.adjective.01"], ["It was inconvenient, but we used it.", "It was abundant, but we saved it.", "It was outdated, but it worked.", "It was profitable, but risky."]),
  // Lesson 31 / Chapter 6: purpose connectors make each new action serve one
  // concrete learning or work purpose, with no within-chapter reuse.
  assignment(1721, "en.grammar.complex_questions_clause_linking.purpose_connectors", [sense("memorise", "запоминать", "verb")], [], ["I repeated it so that I could memorise it.", "I stored it to safeguard it."]),
  assignment(1722, "en.grammar.complex_questions_clause_linking.purpose_connectors", [sense("safeguard", "защищать", "verb")], [], ["I stored it to safeguard it."]),
  assignment(1723, "en.grammar.complex_questions_clause_linking.purpose_connectors", [sense("simplify", "упрощать", "verb")], [], ["I changed it to simplify the task."]),
  assignment(1724, "en.grammar.complex_questions_clause_linking.purpose_connectors", [sense("reinforce", "укреплять", "verb")], [], ["I practised to reinforce the skill."]),
  assignment(1725, "en.grammar.complex_questions_clause_linking.purpose_connectors", [sense("trace", "отслеживать", "verb")], [], ["I labelled it to trace the source."]),
  assignment(1726, "en.grammar.complex_questions_clause_linking.purpose_connectors", [sense("articulate", "чётко формулировать", "verb")], [], ["I spoke slowly to articulate the idea."]),
  assignment(1727, "en.grammar.complex_questions_clause_linking.purpose_connectors", [sense("retain", "сохранять в памяти", "verb")], [], ["I reviewed it to retain the detail."]),
  assignment(1728, "en.grammar.complex_questions_clause_linking.purpose_connectors", [], ["en.memorise.verb.01", "en.simplify.verb.01", "en.trace.verb.01", "en.retain.verb.01"], ["I repeated it so that I could memorise it.", "I changed it to simplify the task.", "I labelled it to trace the source.", "I reviewed it to retain the detail."]),
  // Lesson 31 / Chapter 7: result connectors link distinct events to their
  // consequence, maintaining the result relationship in every example.
  assignment(1729, "en.grammar.complex_questions_clause_linking.result_connectors", [sense("overload", "перегрузка", "noun")], [], ["There was an overload, so we paused.", "There was a setback; therefore, we changed course."]),
  assignment(1730, "en.grammar.complex_questions_clause_linking.result_connectors", [sense("setback", "неудача; задержка", "noun")], [], ["There was a setback; therefore, we changed course."]),
  assignment(1731, "en.grammar.complex_questions_clause_linking.result_connectors", [sense("breakthrough", "прорыв", "noun")], [], ["There was a breakthrough, so we continued."]),
  assignment(1732, "en.grammar.complex_questions_clause_linking.result_connectors", [sense("adjustment", "корректировка", "noun")], [], ["There was an adjustment; therefore, we waited."]),
  assignment(1733, "en.grammar.complex_questions_clause_linking.result_connectors", [sense("renewal", "обновление", "noun")], [], ["There was a renewal, so we celebrated."]),
  assignment(1734, "en.grammar.complex_questions_clause_linking.result_connectors", [sense("resolution", "решение", "noun")], [], ["There was a resolution; therefore, we relaxed."]),
  assignment(1735, "en.grammar.complex_questions_clause_linking.result_connectors", [sense("repercussion", "последствие", "noun")], [], ["There was a repercussion, so we responded."]),
  assignment(1736, "en.grammar.complex_questions_clause_linking.result_connectors", [], ["en.overload.noun.01", "en.breakthrough.noun.01", "en.renewal.noun.01", "en.repercussion.noun.01"], ["There was an overload, so we paused.", "There was a breakthrough, so we continued.", "There was a renewal, so we celebrated.", "There was a repercussion, so we responded."]),
  // Lesson 32 / Chapter 1: `must` deductions infer one distinct state from a
  // visible clue, preserving evidence-based meaning.
  assignment(1737, "en.grammar.probability_deduction.must_inference", [sense("occupied", "занятый", "adjective")], [], ["The door is locked; it must be occupied.", "She has no keys; she must be misplaced."]),
  assignment(1738, "en.grammar.probability_deduction.must_inference", [sense("misplaced", "потерявшийся; не на месте", "adjective")], [], ["She has no keys; she must be misplaced."]),
  assignment(1739, "en.grammar.probability_deduction.must_inference", [sense("allergic", "аллергичный", "adjective")], [], ["His eyes are red; he must be allergic."]),
  assignment(1740, "en.grammar.probability_deduction.must_inference", [sense("mistaken", "ошибающийся", "adjective")], [], ["The number is wrong; you must be mistaken."]),
  assignment(1741, "en.grammar.probability_deduction.must_inference", [sense("starving", "очень голодный", "adjective")], [], ["They skipped lunch; they must be starving."]),
  assignment(1742, "en.grammar.probability_deduction.must_inference", [sense("delayed", "задержанный", "adjective")], [], ["The train is not here; it must be delayed."]),
  assignment(1743, "en.grammar.probability_deduction.must_inference", [sense("disoriented", "дезориентированный", "adjective")], [], ["He cannot find the exit; he must be disoriented."]),
  assignment(1744, "en.grammar.probability_deduction.must_inference", [], ["en.occupied.adjective.01", "en.allergic.adjective.01", "en.starving.adjective.01", "en.disoriented.adjective.01"], ["The door is locked; it must be occupied.", "His eyes are red; he must be allergic.", "They skipped lunch; they must be starving.", "He cannot find the exit; he must be disoriented."]),
  // Lesson 32 / Chapter 2: may and might maintain genuine uncertainty over
  // distinct weather events and conditions.
  assignment(1745, "en.grammar.probability_deduction.may_might", [sense("snowfall", "снегопад", "noun")], [], ["There might be snowfall later.", "There may be sunshine tomorrow."]),
  assignment(1746, "en.grammar.probability_deduction.may_might", [sense("sunshine", "солнечный свет", "noun")], [], ["There may be sunshine tomorrow."]),
  assignment(1747, "en.grammar.probability_deduction.may_might", [sense("thunderstorm", "гроза", "noun")], [], ["There might be a thunderstorm tonight."]),
  assignment(1748, "en.grammar.probability_deduction.may_might", [sense("breeze", "лёгкий ветер", "noun")], [], ["There may be a breeze outside."]),
  assignment(1749, "en.grammar.probability_deduction.may_might", [sense("sleet", "мокрый снег", "noun")], [], ["There might be sleet soon."]),
  assignment(1750, "en.grammar.probability_deduction.may_might", [sense("dew", "роса", "noun")], [], ["There may be dew overnight."]),
  assignment(1751, "en.grammar.probability_deduction.may_might", [sense("rainbow", "радуга", "noun")], [], ["There might be a rainbow nearby."]),
  assignment(1752, "en.grammar.probability_deduction.may_might", [], ["en.snowfall.noun.01", "en.thunderstorm.noun.01", "en.sleet.noun.01", "en.rainbow.noun.01"], ["There might be snowfall later.", "There might be a thunderstorm tonight.", "There might be sleet soon.", "There might be a rainbow nearby."]),
  // Lesson 32 / Chapter 3: `could` assigns a plausible source to one distinct
  // clue, preserving uncertainty rather than claiming a fact.
  assignment(1753, "en.grammar.probability_deduction.could_possibility", [sense("engine", "двигатель", "noun")], [], ["The noise could be an engine.", "The sound could be an echo."]),
  assignment(1754, "en.grammar.probability_deduction.could_possibility", [sense("echo", "эхо", "noun")], [], ["The sound could be an echo."]),
  assignment(1755, "en.grammar.probability_deduction.could_possibility", [sense("reflection", "отражение", "noun")], [], ["The light could be a reflection."]),
  assignment(1756, "en.grammar.probability_deduction.could_possibility", [sense("scent", "запах", "noun")], [], ["The smell could be a scent from flowers."]),
  assignment(1757, "en.grammar.probability_deduction.could_possibility", [sense("rustle", "шелест", "noun")], [], ["The noise could be a rustle in the trees."]),
  assignment(1758, "en.grammar.probability_deduction.could_possibility", [sense("tremor", "дрожь; толчок", "noun")], [], ["The movement could be a tremor."]),
  assignment(1759, "en.grammar.probability_deduction.could_possibility", [sense("flicker", "мерцание", "noun")], [], ["The light could be a flicker from a screen."]),
  assignment(1760, "en.grammar.probability_deduction.could_possibility", [], ["en.engine.noun.01", "en.reflection.noun.01", "en.rustle.noun.01", "en.flicker.noun.01"], ["The noise could be an engine.", "The light could be a reflection.", "The noise could be a rustle in the trees.", "The light could be a flicker from a screen."]),
  // Lesson 32 / Chapter 4: `can't` inference rejects one distinct impossible
  // interpretation against visible contrary evidence.
  assignment(1761, "en.grammar.probability_deduction.cant_inference", [sense("authentic", "подлинный", "adjective")], [], ["The label is wrong; it can't be authentic.", "The parts do not fit; they can't be compatible."]),
  assignment(1762, "en.grammar.probability_deduction.cant_inference", [sense("compatible", "совместимый", "adjective")], [], ["The parts do not fit; they can't be compatible."]),
  assignment(1763, "en.grammar.probability_deduction.cant_inference", [sense("legitimate", "законный", "adjective")], [], ["The document has no stamp; it can't be legitimate."]),
  assignment(1764, "en.grammar.probability_deduction.cant_inference", [sense("feasible", "осуществимый", "adjective")], [], ["The budget is too low; it can't be feasible."]),
  assignment(1765, "en.grammar.probability_deduction.cant_inference", [sense("plausible", "правдоподобный", "adjective")], [], ["The times disagree; it can't be plausible."]),
  assignment(1766, "en.grammar.probability_deduction.cant_inference", [sense("coherent", "логичный; связный", "adjective")], [], ["The story changes; it can't be coherent."]),
  assignment(1767, "en.grammar.probability_deduction.cant_inference", [sense("identical", "идентичный", "adjective")], [], ["The colours differ; they can't be identical."]),
  assignment(1768, "en.grammar.probability_deduction.cant_inference", [], ["en.authentic.adjective.01", "en.legitimate.adjective.01", "en.plausible.adjective.01", "en.identical.adjective.01"], ["The label is wrong; it can't be authentic.", "The document has no stamp; it can't be legitimate.", "The times disagree; it can't be plausible.", "The colours differ; they can't be identical."]),
  // Lesson 32 / Chapter 5: integrated stance follows one distinct clue to a
  // calibrated inference, rather than repeating a clue or conclusion.
  assignment(1769, "en.grammar.probability_deduction.integrated_stance", [sense("streak", "полоса; след", "noun")], [], ["There is a wet streak, so it might be recent rain.", "There is warmth, so someone must be nearby."]),
  assignment(1770, "en.grammar.probability_deduction.integrated_stance", [sense("warmth", "тепло", "noun")], [], ["There is warmth, so someone must be nearby."]),
  assignment(1771, "en.grammar.probability_deduction.integrated_stance", [sense("glare", "яркий отблеск", "noun")], [], ["There is a glare, so it could be a screen."]),
  assignment(1772, "en.grammar.probability_deduction.integrated_stance", [sense("aroma", "аромат", "noun")], [], ["There is an aroma, so dinner might be ready."]),
  assignment(1773, "en.grammar.probability_deduction.integrated_stance", [sense("indentation", "вмятина; углубление", "noun")], [], ["There is an indentation, so it could be a chair mark."]),
  assignment(1774, "en.grammar.probability_deduction.integrated_stance", [sense("tyre", "шина", "noun")], [], ["There is a tyre mark, so a van must be close."]),
  assignment(1775, "en.grammar.probability_deduction.integrated_stance", [sense("residue", "остаток; след", "noun")], [], ["There is residue, so the work may be unfinished."]),
  assignment(1776, "en.grammar.probability_deduction.integrated_stance", [], ["en.streak.noun.01", "en.glare.noun.01", "en.indentation.noun.01", "en.residue.noun.01"], ["There is a wet streak, so it might be recent rain.", "There is a glare, so it could be a screen.", "There is an indentation, so it could be a chair mark.", "There is residue, so the work may be unfinished."]),
  // Lesson 32 / Chapter 6: final mixed review uses a distinct transferable
  // capability in each meaningful statement.
  assignment(1777, "en.grammar.probability_deduction.integrated_stance", [sense("versatility", "разносторонность", "noun")], [], ["Versatility may be useful in this role."]),
  assignment(1778, "en.grammar.probability_deduction.integrated_stance", [sense("objectivity", "объективность", "noun")], [], ["Objectivity must matter in this review."]),
  assignment(1779, "en.grammar.probability_deduction.integrated_stance", [sense("tenacity", "настойчивость", "noun")], [], ["Tenacity could help after a setback."]),
  assignment(1780, "en.grammar.probability_deduction.integrated_stance", [sense("ingenuity", "изобретательность", "noun")], [], ["Ingenuity might solve the problem."]),
  assignment(1781, "en.grammar.probability_deduction.integrated_stance", [sense("fluency", "беглость речи", "noun")], [], ["Fluency may grow with practice."]),
  assignment(1782, "en.grammar.probability_deduction.integrated_stance", [sense("resourcefulness", "находчивость", "noun")], [], ["Resourcefulness must be helpful here."]),
  assignment(1783, "en.grammar.probability_deduction.integrated_stance", [sense("prudence", "благоразумие", "noun")], [], ["Prudence could prevent an error."]),
  assignment(1784, "en.grammar.probability_deduction.integrated_stance", [], ["en.versatility.noun.01", "en.tenacity.noun.01", "en.fluency.noun.01", "en.prudence.noun.01"], ["Versatility may be useful in this role.", "Tenacity could help after a setback.", "Fluency may grow with practice.", "Prudence could prevent an error."]),
  // Lesson 32 / Chapter 7: the final blueprint review introduces only new
  // transferable process nouns, each in its own evidential statement.
  assignment(1785, "en.grammar.probability_deduction.integrated_stance", [sense("adaptation", "адаптация", "noun")], [], ["Adaptation may be necessary after change."]),
  assignment(1786, "en.grammar.probability_deduction.integrated_stance", [sense("mitigation", "смягчение риска", "noun")], [], ["Mitigation could reduce the impact."]),
  assignment(1787, "en.grammar.probability_deduction.integrated_stance", [sense("calibration", "настройка; калибровка", "noun")], [], ["Calibration must improve the result."]),
  assignment(1788, "en.grammar.probability_deduction.integrated_stance", [sense("validation", "проверка; подтверждение", "noun")], [], ["Validation may confirm the outcome."]),
  assignment(1789, "en.grammar.probability_deduction.integrated_stance", [sense("optimization", "оптимизация", "noun")], [], ["Optimization could save time."]),
  assignment(1790, "en.grammar.probability_deduction.integrated_stance", [sense("prioritization", "расстановка приоритетов", "noun")], [], ["Prioritization must guide the work."]),
  assignment(1791, "en.grammar.probability_deduction.integrated_stance", [sense("alignment", "согласованность", "noun")], [], ["Alignment may prevent confusion."]),
  assignment(1792, "en.grammar.probability_deduction.integrated_stance", [], ["en.adaptation.noun.01", "en.calibration.noun.01", "en.optimization.noun.01", "en.alignment.noun.01"], ["Adaptation may be necessary after change.", "Calibration must improve the result.", "Optimization could save time.", "Alignment may prevent confusion."]),
  // Preserve the operation's previously auto-grounded V1 candidate when a
  // later packet makes that operation's lexical plan explicit. The next two
  // entries repair the first missing non-checkpoint packet for their operation.
  assignment(281, "en.grammar.present_simple_affirmative.lexical_frame", [sense("work", "работать", "verb")], [], ["I work at home."]),
  assignment(289, "en.grammar.present_simple_affirmative.agreement", [sense("start", "начинать", "verb")], [], ["We start at nine."]),
  assignment(305, "en.grammar.present_simple_affirmative.routine_fact_meaning", [sense("walk", "ходить пешком", "verb")], [], ["I walk every day."]),
]);

const assignmentSessionIds = LEARNING_V2_ENGLISH_SESSION_LEXICAL_ASSIGNMENTS_V2
  .map((item) => item.sessionId);
if (new Set(assignmentSessionIds).size !== assignmentSessionIds.length) {
  throw new Error("learning_v2_session_lexical_assignment_session_ids_not_unique");
}

const assignedSenseIds = LEARNING_V2_ENGLISH_SESSION_LEXICAL_ASSIGNMENTS_V2
  .flatMap((item) => item.newSenses.map((itemSense) => itemSense.id));
if (new Set(assignedSenseIds).size !== assignedSenseIds.length) {
  throw new Error("learning_v2_session_lexical_assignment_sense_ids_not_unique");
}
