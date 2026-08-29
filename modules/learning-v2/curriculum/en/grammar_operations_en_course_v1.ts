import type { LearningV2EnglishGrammarOperationV1 } from "./grammar_operations_en_v1";

type OperationSeed = readonly [
  id: string,
  lessonOrdinal: number,
  communicativeFunction: string,
  formBoundary: readonly string[],
  prerequisiteOperationIds: readonly string[],
];

const COURSE_EVIDENCE = Object.freeze([
  "EV-CEFR-01",
  "EV-EP-01",
  "OC-SCENARIO-01",
  "OC-AUTHORING-01",
  "PH-GRAMMAR-01",
]);

const PROHIBITED_BY_LESSON: Readonly<Record<number, readonly string[]>> =
  Object.freeze({
    2: Object.freeze(["en.scope.l02.plural_demonstrative", "en.scope.l02.possession", "en.scope.l02.lexical_verb"]),
    3: Object.freeze(["en.scope.l03.do_question", "en.scope.l03.object_pronoun", "en.scope.l03.quantifier_system"]),
    4: Object.freeze(["en.scope.l04.third_person_s", "en.scope.l04.progressive", "en.scope.l04.past"]),
    5: Object.freeze(["en.scope.l05.progressive", "en.scope.l05.frequency_question", "en.scope.l05.past"]),
    6: Object.freeze(["en.scope.l06.progressive_contrast", "en.scope.l06.past_time", "en.scope.l06.duration"]),
    7: Object.freeze(["en.scope.l07.could_would", "en.scope.l07.obligation", "en.scope.l07.conditional"]),
    9: Object.freeze(["en.scope.l09.quantity_question", "en.scope.l09.relative_where", "en.scope.l09.noncount"]),
    10: Object.freeze(["en.scope.l10.comparative", "en.scope.l10.superlative", "en.scope.l10.present_perfect"]),
    11: Object.freeze(["en.scope.l11.simple_continuous_contrast", "en.scope.l11.past_continuous", "en.scope.l11.future_arrangement"]),
    12: Object.freeze(["en.scope.l12.lexical_past", "en.scope.l12.did", "en.scope.l12.past_continuous"]),
    13: Object.freeze(["en.scope.l13.past_continuous", "en.scope.l13.present_perfect", "en.scope.l13.reported_speech"]),
    14: Object.freeze(["en.scope.l14.diagnosis", "en.scope.l14.obligation", "en.scope.l14.complex_reason"]),
    15: Object.freeze(["en.scope.l15.general_will", "en.scope.l15.conditional", "en.scope.l15.future_time_clause"]),
    17: Object.freeze(["en.scope.l17.relative_clause", "en.scope.l17.passive_announcement", "en.scope.l17.future_conditional"]),
    18: Object.freeze(["en.scope.l18.full_conditional", "en.scope.l18.passive_voice"]),
    19: Object.freeze(["en.scope.l19.relative_clause", "en.scope.l19.passive_ingredient"]),
    20: Object.freeze(["en.scope.l20.complex_comparison", "en.scope.l20.double_comparative"]),
    21: Object.freeze(["en.scope.l21.for_since", "en.scope.l21.result_perfect", "en.scope.l21.perfect_continuous"]),
    22: Object.freeze(["en.scope.l22.past_modal", "en.scope.l22.deduction", "en.scope.l22.hypothetical_permission"]),
    23: Object.freeze(["en.scope.l23.question_tag_system", "en.scope.l23.reported_speech", "en.scope.l23.relative_clause"]),
    25: Object.freeze(["en.scope.l25.past_continuous", "en.scope.l25.full_stative_taxonomy"]),
    26: Object.freeze(["en.scope.l26.past_perfect", "en.scope.l26.complex_subordination"]),
    27: Object.freeze(["en.scope.l27.causative", "en.scope.l27.passive_complaint"]),
    28: Object.freeze(["en.scope.l28.second_conditional", "en.scope.l28.third_conditional", "en.scope.l28.will_if_clause"]),
    29: Object.freeze(["en.scope.l29.nondefining_relative", "en.scope.l29.whose_whom", "en.scope.l29.reduced_relative"]),
    30: Object.freeze(["en.scope.l30.full_backshift", "en.scope.l30.reported_question", "en.scope.l30.unknown_conditional"]),
  });

function operation(seed: OperationSeed): LearningV2EnglishGrammarOperationV1 {
  const [id, lessonOrdinal, communicativeFunction, formBoundary, prerequisiteOperationIds] = seed;
  return Object.freeze({
    id,
    lessonOrdinal,
    communicativeFunction,
    formBoundary: Object.freeze([...formBoundary]),
    prerequisiteOperationIds: Object.freeze([...prerequisiteOperationIds]),
    prohibitedExtensionIds: PROHIBITED_BY_LESSON[lessonOrdinal] ?? Object.freeze(["en.scope.unapproved_extension"]),
    sourceEvidenceRefs: COURSE_EVIDENCE,
  });
}

const SEEDS = Object.freeze([
  ["en.demonstrative.this_is.singular", 2, "Указать на одного близкого человека или предмет.", ["This is + singular referent"], ["en.copula.you_are.affirmative"]],
  ["en.demonstrative.that_is.singular", 2, "Указать на одного более далёкого человека или предмет.", ["That is + singular referent"], ["en.demonstrative.this_is.singular"]],
  ["en.question.who_is.singular", 2, "Спросить, кто перед нами.", ["Who is + singular reference?"], ["en.demonstrative.this_is.singular"]],
  ["en.question.what_is.singular", 2, "Спросить, что перед нами.", ["What is + singular reference?"], ["en.demonstrative.that_is.singular"]],
  ["en.pronoun.he_she_it.reference", 2, "Заменить знакомого человека или предмет короткой ссылкой.", ["he / she / it + is"], ["en.question.who_is.singular", "en.question.what_is.singular"]],

  ["en.possessive.determiners.my_your", 3, "Показать, что знакомая вещь относится ко мне или собеседнику.", ["my / your + noun"], ["en.demonstrative.this_is.singular"]],
  ["en.possessive.determiners.his_her_its", 3, "Показать принадлежность знакомому человеку или предмету.", ["his / her / its + noun"], ["en.pronoun.he_she_it.reference", "en.possessive.determiners.my_your"]],
  ["en.possessive.singular_s", 3, "Назвать владельца вещи через имя или существительное.", ["singular owner + 's + noun"], ["en.possessive.determiners.my_your"]],
  ["en.noun.plural.recognition", 3, "Различить один и несколько знакомых предметов.", ["singular noun / regular plural noun"], ["en.demonstrative.this_is.singular"]],
  ["en.have_has.affirmative_possession", 3, "Сказать, что у знакомого участника есть вещь.", ["I/you/we/they have + noun", "he/she/it has + noun"], ["en.pronoun.he_she_it.reference", "en.noun.plural.recognition"]],

  ["en.present_simple.i_you.affirmative", 4, "Сказать о знакомом действии с I или you.", ["I/you + base verb + object/complement"], ["en.copula.you_are.affirmative"]],
  ["en.lexical.like_want.object", 4, "Назвать простой объект предпочтения или желания.", ["I/you like/want + familiar noun"], ["en.present_simple.i_you.affirmative"]],
  ["en.present_simple.do.i_you.question", 4, "Спросить собеседника о предпочтении или желании.", ["Do + you + base verb + object?"], ["en.present_simple.i_you.affirmative"]],
  ["en.present_simple.dont.i_you.negative", 4, "Отрицать знакомое действие или предпочтение.", ["I/you don't + base verb"], ["en.present_simple.i_you.affirmative"]],
  ["en.complement.want_to.base", 4, "Назвать желаемое действие после want.", ["I/you want to + base verb"], ["en.lexical.like_want.object"]],

  ["en.present_simple.we_they.affirmative", 5, "Описать обычное действие группы.", ["we/they + base verb"], ["en.present_simple.i_you.affirmative", "en.noun.plural.recognition"]],
  ["en.present_simple.third_person_s.affirmative", 5, "Описать обычное действие одного другого участника.", ["he/she/it + verb-s"], ["en.pronoun.he_she_it.reference", "en.present_simple.i_you.affirmative"]],
  ["en.present_simple.have_has.agreement", 5, "Выбрать have или has по участнику.", ["I/you/we/they have", "he/she/it has"], ["en.have_has.affirmative_possession", "en.present_simple.third_person_s.affirmative"]],
  ["en.present_simple.do_does.form_contrast", 5, "Различить do и does по участнику до построения вопроса.", ["I/you/we/they do", "he/she/it does"], ["en.present_simple.third_person_s.affirmative"]],

  ["en.present_simple.do_does.questions", 6, "Спросить о привычном действии любого знакомого участника.", ["Do/Does + subject + base verb?"], ["en.present_simple.do_does.form_contrast"]],
  ["en.present_simple.dont_doesnt.negatives", 6, "Отрицать привычное действие любого знакомого участника.", ["subject + don't/doesn't + base verb"], ["en.present_simple.do_does.form_contrast"]],
  ["en.question.when.present_simple", 6, "Спросить, когда происходит знакомое действие.", ["When + do/does + subject + base verb?"], ["en.present_simple.do_does.questions"]],
  ["en.question.what_time.present_simple", 6, "Спросить точное время знакомого действия.", ["What time + do/does + subject + base verb?"], ["en.question.when.present_simple"]],
  ["en.question.how_often.present_simple", 6, "Спросить, как часто происходит действие.", ["How often + do/does + subject + base verb?"], ["en.present_simple.do_does.questions"]],
  ["en.frequency.adverb.position", 6, "Поставить частотное слово в знакомую утвердительную фразу.", ["subject + frequency adverb + lexical verb", "subject + be + frequency adverb"], ["en.present_simple.we_they.affirmative", "en.copula.you_are.affirmative"]],

  ["en.modal.can.ability", 7, "Сказать, что знакомое действие возможно или умеется.", ["subject + can + base verb"], ["en.present_simple.i_you.affirmative"]],
  ["en.modal.cant.ability_negative", 7, "Сказать, что знакомое действие невозможно или не умеется.", ["subject + can't + base verb"], ["en.modal.can.ability"]],
  ["en.request.can_you", 7, "Попросить собеседника выполнить простое действие.", ["Can you + base verb, please?"], ["en.modal.can.ability", "en.present_simple.do.i_you.question"]],
  ["en.imperative.positive", 7, "Дать одну короткую положительную инструкцию.", ["base verb + complement"], ["en.present_simple.i_you.affirmative"]],
  ["en.imperative.negative", 7, "Дать одну короткую отрицательную инструкцию.", ["Don't + base verb + complement"], ["en.imperative.positive", "en.present_simple.dont.i_you.negative"]],
  ["en.politeness.please.position", 7, "Добавить please к знакомой просьбе без изменения действия.", ["Please + imperative", "request + please"], ["en.request.can_you", "en.imperative.positive"]],

  ["en.existential.there_is.affirmative", 9, "Сказать, что один предмет или место существует рядом.", ["There is + singular noun"], ["en.copula.i_am.affirmative", "en.noun.plural.recognition"]],
  ["en.existential.there_are.affirmative", 9, "Сказать, что несколько предметов существуют рядом.", ["There are + plural noun"], ["en.existential.there_is.affirmative", "en.noun.plural.recognition"]],
  ["en.existential.is_there.question", 9, "Спросить о наличии одного предмета или места.", ["Is there + singular noun?"], ["en.existential.there_is.affirmative"]],
  ["en.existential.are_there.question", 9, "Спросить о наличии нескольких предметов.", ["Are there + plural noun?"], ["en.existential.there_are.affirmative"]],
  ["en.place.prepositions.basic", 9, "Указать положение знакомого предмета.", ["in/on/under/next to + place"], ["en.demonstrative.this_is.singular"]],
  ["en.quantifier.some_any.existence", 9, "Выбрать some или any в утверждении и вопросе о наличии.", ["There is/are some...", "Is/Are there any...?"], ["en.existential.are_there.question"]],

  ["en.article.indefinite.buying_unit", 10, "Назвать одну исчисляемую единицу товара.", ["a/an + singular count noun"], ["en.noun.plural.recognition"]],
  ["en.quantity.plural_units", 10, "Назвать несколько исчисляемых единиц.", ["number + plural count noun"], ["en.article.indefinite.buying_unit", "en.noun.plural.recognition"]],
  ["en.noun.count_noncount.operational", 10, "Различить счётную единицу и вещество в покупке.", ["count noun / non-count noun in buying frame"], ["en.quantity.plural_units"]],
  ["en.quantifier.how_much.question", 10, "Спросить цену или количество несчётного товара.", ["How much + non-count noun...?", "How much is/are...?"], ["en.noun.count_noncount.operational"]],
  ["en.quantifier.how_many.question", 10, "Спросить количество счётных единиц.", ["How many + plural count noun...?"], ["en.noun.count_noncount.operational"]],
  ["en.quantifier.some_any.request", 10, "Попросить или проверить наличие некоторого количества.", ["Can I have some...?", "Do you have any...?"], ["en.quantifier.some_any.existence", "en.request.can_you"]],
  ["en.measure.container_frame", 10, "Назвать порцию или упаковку товара.", ["a + container + of + noun"], ["en.article.indefinite.buying_unit", "en.noun.count_noncount.operational"]],

  ["en.present_continuous.affirmative", 11, "Сказать, что знакомое действие происходит сейчас.", ["subject + am/is/are + verb-ing"], ["en.present_simple.third_person_s.affirmative", "en.copula.you_are.affirmative"]],
  ["en.present_continuous.negative", 11, "Сказать, что действие сейчас не происходит.", ["subject + am/is/are not + verb-ing"], ["en.present_continuous.affirmative"]],
  ["en.present_continuous.question", 11, "Спросить, происходит ли действие сейчас.", ["Am/Is/Are + subject + verb-ing?"], ["en.present_continuous.affirmative"]],
  ["en.present_participle.selected_forms", 11, "Выбрать целую знакомую форму на -ing.", ["selected whole-word verb-ing forms"], ["en.present_continuous.affirmative"]],

  ["en.past_copula.was_were.affirmative", 12, "Сказать, где или в каком состоянии участник был раньше.", ["I/he/she/it was", "you/we/they were"], ["en.pronoun.he_she_it.reference", "en.present_simple.we_they.affirmative"]],
  ["en.past_copula.was_were.negative", 12, "Отрицать прошлое место или состояние.", ["subject + wasn't/weren't"], ["en.past_copula.was_were.affirmative"]],
  ["en.past_copula.was_were.question", 12, "Спросить о прошлом месте или состоянии.", ["Was/Were + subject + complement?"], ["en.past_copula.was_were.affirmative"]],
  ["en.existential.there_was_were", 12, "Сказать или спросить, что существовало раньше.", ["There was/were...", "Was/Were there...?"], ["en.existential.there_is.affirmative", "en.past_copula.was_were.affirmative"]],
  ["en.past.finished_time_anchor", 12, "Закрепить законченное прошлое точным временным сигналом.", ["yesterday / last + time unit / time + ago"], ["en.past_copula.was_were.affirmative"]],

  ["en.past_simple.affirmative_regular", 13, "Рассказать об одном законченном действии правильным глаголом.", ["subject + selected regular past form"], ["en.past.finished_time_anchor", "en.present_simple.i_you.affirmative"]],
  ["en.past_simple.affirmative_irregular", 13, "Рассказать об одном законченном действии частотной неправильной формой.", ["subject + selected irregular past form"], ["en.past_simple.affirmative_regular"]],
  ["en.past_simple.did.question", 13, "Спросить о законченном действии.", ["Did + subject + base verb?"], ["en.past_simple.affirmative_regular", "en.present_simple.do_does.questions"]],
  ["en.past_simple.didnt.negative", 13, "Отрицать законченное действие.", ["subject + didn't + base verb"], ["en.past_simple.did.question"]],
  ["en.narrative.sequence.basic", 13, "Соединить короткую последовательность законченных действий.", ["first / then / after that + past clause"], ["en.past_simple.affirmative_regular"]],

  ["en.have_has.symptom", 14, "Назвать простой симптом через have или has.", ["subject + have/has + symptom noun"], ["en.present_simple.have_has.agreement"]],
  ["en.feel.adjective", 14, "Назвать простое самочувствие через feel.", ["subject + feel/feels + adjective"], ["en.present_simple.third_person_s.affirmative"]],
  ["en.modal.should.advice", 14, "Дать простой совет.", ["subject + should + base verb"], ["en.modal.can.ability"]],
  ["en.modal.shouldnt.advice", 14, "Посоветовать не делать действие.", ["subject + shouldn't + base verb"], ["en.modal.should.advice"]],
  ["en.connector.because.reason", 14, "Добавить одну знакомую причину ко второй простой части.", ["simple clause + because + simple clause"], ["en.present_simple.i_you.affirmative", "en.modal.should.advice"]],

  ["en.suggestion.lets", 15, "Предложить совместное действие.", ["Let's + base verb"], ["en.imperative.positive"]],
  ["en.future.be_going_to.intention", 15, "Назвать заранее выбранное намерение.", ["subject + am/is/are going to + base verb"], ["en.present_continuous.affirmative", "en.complement.want_to.base"]],
  ["en.complement.need_to.base", 15, "Назвать необходимое следующее действие.", ["subject + need(s) to + base verb"], ["en.complement.want_to.base", "en.present_simple.third_person_s.affirmative"]],
  ["en.future.time_anchor.basic", 15, "Привязать план к знакомому будущему времени.", ["tomorrow / next + time unit with plan frame"], ["en.future.be_going_to.intention"]],

  ["en.direction.from_to", 17, "Назвать исходную и конечную точку движения.", ["from + place + to + place"], ["en.place.prepositions.basic"]],
  ["en.direction.go_turn_take.path", 17, "Дать маршрут одной знакомой командой.", ["go/turn/take + path or place"], ["en.imperative.positive", "en.direction.from_to"]],
  ["en.instruction.sequence.travel", 17, "Дать несколько коротких маршрутных действий по порядку.", ["first/then + imperative"], ["en.direction.go_turn_take.path", "en.narrative.sequence.basic"]],
  ["en.question.which.known_choice", 17, "Спросить, какой из известных вариантов нужен.", ["Which + familiar noun...?"], ["en.question.what_is.singular"]],

  ["en.request.id_like", 18, "Вежливо назвать нужный предмет или услугу.", ["I'd like + noun / approved chunk"], ["en.lexical.like_want.object"]],
  ["en.request.could_you.polite", 18, "Вежливо попросить знакомое действие в сервисной ситуации.", ["Could you + base verb, please?"], ["en.request.can_you"]],
  ["en.have.reservation_possession", 18, "Сообщить о бронировании или документе через have.", ["I have + reservation/document noun"], ["en.have_has.affirmative_possession"]],
  ["en.determiner.service_noun", 18, "Выбрать ограниченный determiner у знакомого сервисного существительного.", ["a/an/the/my + approved service noun"], ["en.article.indefinite.buying_unit", "en.possessive.determiners.my_your"]],

  ["en.quantifier.a_little", 19, "Назвать небольшое количество несчётного продукта.", ["a little + non-count noun"], ["en.noun.count_noncount.operational"]],
  ["en.quantifier.a_few", 19, "Назвать небольшое количество счётных предметов.", ["a few + plural count noun"], ["en.quantifier.how_many.question"]],
  ["en.quantity.enough.food", 19, "Сказать, что количества достаточно.", ["enough + noun", "adjective + enough"], ["en.quantifier.a_little", "en.quantifier.a_few"]],
  ["en.preposition.with_without", 19, "Заказать знакомый продукт с компонентом или без него.", ["noun + with/without + ingredient"], ["en.measure.container_frame"]],
  ["en.food.preference_restriction", 19, "Связать знакомое предпочтение с ограничением еды.", ["I want/need + approved food frame"], ["en.lexical.like_want.object", "en.complement.need_to.base"]],

  ["en.comparison.comparative_er", 20, "Сравнить два знакомых варианта коротким прилагательным.", ["adjective-er + than"], ["en.feel.adjective"]],
  ["en.comparison.more_adjective", 20, "Сравнить два варианта через more.", ["more + adjective + than"], ["en.comparison.comparative_er"]],
  ["en.comparison.better_worse", 20, "Сравнить качество знакомыми формами better или worse.", ["better/worse + than"], ["en.comparison.comparative_er"]],
  ["en.comparison.than_clause", 20, "Назвать второй объект сравнения после than.", ["comparative + than + familiar noun/pronoun"], ["en.comparison.comparative_er"]],
  ["en.reference.one_ones", 20, "Не повторять знакомое существительное при выборе варианта.", ["the/this + one", "the/these + ones"], ["en.question.which.known_choice", "en.noun.plural.recognition"]],
  ["en.comparison.superlative_est", 20, "Выбрать один крайний вариант среди знакомого набора коротким прилагательным.", ["the + adjective-est"], ["en.comparison.comparative_er"]],
  ["en.comparison.superlative_most", 20, "Выбрать крайний вариант через most в ограниченном наборе.", ["the most + adjective"], ["en.comparison.more_adjective", "en.comparison.superlative_est"]],

  ["en.present_perfect.have_has_participle", 21, "Построить ограниченную форму опыта с have/has и знакомым причастием.", ["subject + have/has + selected past participle"], ["en.present_simple.have_has.agreement", "en.past_simple.affirmative_irregular"]],
  ["en.present_perfect.experience", 21, "Спросить или сообщить о жизненном опыте без законченного времени.", ["Have/Has + subject + past participle?"], ["en.present_perfect.have_has_participle"]],
  ["en.present_perfect.ever", 21, "Спросить, случался ли опыт когда-либо.", ["Have/Has + subject + ever + past participle?"], ["en.present_perfect.experience"]],
  ["en.present_perfect.never", 21, "Сказать, что такого опыта никогда не было.", ["subject + have/has never + past participle"], ["en.present_perfect.experience"]],
  ["en.present_perfect.short_answers", 21, "Кратко ответить на вопрос об опыте.", ["Yes, subject have/has", "No, subject haven't/hasn't"], ["en.present_perfect.experience"]],
  ["en.present_perfect.vs_finished_past", 21, "Различить опыт без времени и законченное событие с прошлым временем.", ["present perfect experience / past simple + finished time"], ["en.present_perfect.experience", "en.past_simple.affirmative_regular"]],

  ["en.modal.may.permission", 22, "Попросить или дать формальное разрешение в ограниченной ситуации.", ["May I + base verb?", "You may + base verb"], ["en.modal.can.ability", "en.request.can_you"]],
  ["en.modal.must.obligation", 22, "Назвать обязательное действие правила.", ["subject + must + base verb"], ["en.modal.can.ability"]],
  ["en.modal.mustnt.prohibition", 22, "Назвать действие, которое запрещено.", ["subject + mustn't + base verb"], ["en.modal.must.obligation"]],
  ["en.obligation.have_to", 22, "Назвать внешнюю необходимость.", ["subject + have/has to + base verb"], ["en.present_simple.have_has.agreement", "en.modal.must.obligation"]],
  ["en.obligation.dont_have_to", 22, "Сказать, что действие не обязательно.", ["subject + don't/doesn't have to + base verb"], ["en.obligation.have_to", "en.present_simple.dont_doesnt.negatives"]],
  ["en.modal.should_vs_must", 22, "Различить совет и обязательное правило.", ["should / must in matched situations"], ["en.modal.should.advice", "en.modal.must.obligation"]],

  ["en.question.follow_up_wh", 23, "Задать короткий уточняющий вопрос по знакомой информации.", ["wh-word + familiar question frame"], ["en.question.when.present_simple", "en.question.which.known_choice"]],
  ["en.pronoun.object", 23, "Сослаться на знакомого участника как на объект действия.", ["verb/preposition + me/you/him/her/it/us/them"], ["en.pronoun.he_she_it.reference", "en.present_simple.we_they.affirmative"]],
  ["en.connector.and.addition", 23, "Добавить вторую простую мысль.", ["simple clause + and + simple clause"], ["en.present_simple.i_you.affirmative"]],
  ["en.connector.but.contrast", 23, "Противопоставить две простые знакомые мысли.", ["simple clause + but + simple clause"], ["en.connector.and.addition"]],
  ["en.connector.so.result", 23, "Назвать простой результат знакомой причины.", ["simple clause + so + simple clause"], ["en.connector.because.reason", "en.connector.and.addition"]],
  ["en.discourse.clarification_echo", 23, "Попросить повторить или уточнить знакомую часть сообщения.", ["Sorry? / Which...? / What do you mean? as approved chunks"], ["en.question.follow_up_wh"]],

  ["en.present_contrast.simple_vs_continuous", 25, "Различить обычное действие и происходящее сейчас или временно.", ["present simple / present continuous in matched context"], ["en.present_simple.third_person_s.affirmative", "en.present_continuous.affirmative"]],
  ["en.stative.selected_present_limit", 25, "Не использовать continuous с небольшим утверждённым набором глаголов состояния.", ["selected stative verb in present simple"], ["en.present_contrast.simple_vs_continuous"]],
  ["en.present_continuous.future_arrangement", 25, "Назвать уже согласованную будущую встречу.", ["present continuous + future time anchor"], ["en.present_continuous.affirmative", "en.future.time_anchor.basic"]],

  ["en.past_continuous.affirmative", 26, "Назвать действие, шедшее в определённый момент прошлого.", ["subject + was/were + verb-ing"], ["en.past_copula.was_were.affirmative", "en.present_continuous.affirmative"]],
  ["en.past_continuous.negative", 26, "Отрицать фоновое действие в прошлом.", ["subject + wasn't/weren't + verb-ing"], ["en.past_continuous.affirmative"]],
  ["en.past_continuous.question", 26, "Спросить о действии, шедшем в момент прошлого.", ["Was/Were + subject + verb-ing?"], ["en.past_continuous.affirmative"]],
  ["en.past_link.while_background", 26, "Связать два фоновых прошлых действия через while.", ["while + past continuous clause"], ["en.past_continuous.affirmative"]],
  ["en.past_link.when_event", 26, "Связать фоновое действие с коротким событием через when.", ["past continuous + when + past simple"], ["en.past_continuous.affirmative", "en.past_simple.affirmative_regular"]],

  ["en.service.doesnt_work_vs_isnt_working", 27, "Различить постоянную неисправность и наблюдаемую проблему сейчас.", ["doesn't work / isn't working"], ["en.present_contrast.simple_vs_continuous", "en.present_simple.dont_doesnt.negatives"]],
  ["en.degree.too_adjective", 27, "Сказать, что качество превышает допустимый предел.", ["too + adjective"], ["en.comparison.more_adjective"]],
  ["en.degree.not_adjective_enough", 27, "Сказать, что качества недостаточно.", ["not + adjective + enough"], ["en.quantity.enough.food", "en.degree.too_adjective"]],
  ["en.complement.need_noun_vs_need_to", 27, "Различить нужный предмет и нужное действие.", ["need + noun / need to + base verb"], ["en.complement.need_to.base"]],

  ["en.conditional.zero", 28, "Назвать стабильный результат знакомого условия.", ["if + present simple, present simple/imperative"], ["en.present_simple.do_does.form_contrast", "en.imperative.positive"]],
  ["en.future.will.result", 28, "Назвать решение или результат в главной части.", ["subject + will + base verb"], ["en.future.be_going_to.intention", "en.modal.can.ability"]],
  ["en.conditional.first_will", 28, "Назвать реальное будущее условие и результат.", ["if + present simple, subject + will + base verb"], ["en.conditional.zero", "en.future.will.result"]],
  ["en.conditional.first_can", 28, "Назвать возможное действие при реальном условии.", ["if + present simple, subject + can + base verb"], ["en.conditional.zero", "en.modal.can.ability"]],
  ["en.conditional.first_imperative", 28, "Дать инструкцию на случай реального условия.", ["if + present simple, imperative"], ["en.conditional.zero", "en.imperative.positive"]],
  ["en.conditional.clause_order", 28, "Менять порядок двух частей реального условия без изменения смысла.", ["if-clause first / result clause first"], ["en.conditional.first_will"]],

  ["en.relative.who.subject", 29, "Уточнить знакомого человека через его действие.", ["person + who + verb..."], ["en.pronoun.he_she_it.reference", "en.connector.and.addition"]],
  ["en.relative.that.subject", 29, "Уточнить знакомый предмет через его действие или свойство.", ["thing + that + verb..."], ["en.relative.who.subject", "en.demonstrative.that_is.singular"]],
  ["en.relative.where.place", 29, "Уточнить знакомое место через действие в нём.", ["place + where + clause"], ["en.place.prepositions.basic", "en.relative.who.subject"]],
  ["en.relative.object_omission.bounded", 29, "Понять ограниченный объектный relative, где that можно опустить.", ["thing + (that) + subject + verb"], ["en.relative.that.subject", "en.pronoun.object"]],

  ["en.reporting.say.complement", 30, "Передать содержание короткого сообщения после say.", ["say + that/approved clause"], ["en.connector.and.addition", "en.past_simple.affirmative_regular"]],
  ["en.reporting.tell.object_complement", 30, "Передать сообщение конкретному человеку после tell.", ["tell + object pronoun + approved clause"], ["en.reporting.say.complement", "en.pronoun.object"]],
  ["en.reporting.present_meaning.bounded", 30, "Передать знакомое сообщение о настоящем без полной таблицы backshift.", ["said/told + bounded present-meaning clause"], ["en.reporting.say.complement"]],
  ["en.reporting.past_meaning.bounded", 30, "Передать знакомое сообщение о законченном прошлом в утверждённом наборе.", ["said/told + bounded past clause"], ["en.reporting.present_meaning.bounded", "en.past_simple.affirmative_regular"]],
  ["en.reporting.request_to", 30, "Передать короткую просьбу о знакомом действии.", ["tell/ask + object + to + base verb"], ["en.reporting.tell.object_complement", "en.request.could_you.polite", "en.complement.want_to.base"]],
] satisfies readonly OperationSeed[]);

export const LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_02_30_V1 = Object.freeze(
  SEEDS.map(operation),
);
