export type LearningV2EnglishGrammarOperationV2 = Readonly<{
  id: string;
  lessonOrdinal: number;
  majorSystemId: string;
  communicativeFunctionRu: string;
  decisionRuleRu: string;
  formBoundary: readonly string[];
  positiveExamples: readonly [string, string];
  diagnosticErrorIds: readonly string[];
  prerequisiteOperationIds: readonly string[];
  prohibitedExtensionIds: readonly string[];
  fullSessionBeforeUse: true;
  sourceEvidenceRefs: readonly string[];
}>;

type OperationSeed = readonly [
  lessonOrdinal: number,
  majorSystemId: string,
  slug: string,
  communicativeFunctionRu: string,
  decisionRuleRu: string,
  formBoundary: string,
  exampleOne: string,
  exampleTwo: string,
];

const operation = (...seed: OperationSeed): OperationSeed => Object.freeze(seed);

const OPERATION_SEEDS: readonly OperationSeed[] = Object.freeze([
  operation(1, "present_be_affirmative", "subject_pronouns", "Назвать участника фразы.", "Перед am, is или are ставь явное подлежащее.", "I; you; he; she; it; we; they", "I am here.", "They are here."),
  operation(1, "present_be_affirmative", "agreement", "Связать подлежащее с состоянием или признаком.", "После I выбирай am, после he/she/it — is, после you/we/they — are.", "subject + am|is|are + complement", "She is ready.", "We are ready."),
  operation(1, "present_be_affirmative", "full_forms", "Сказать полную утвердительную фразу.", "В полной форме не пропускай am, is или are.", "I am; he is; we are", "You are right.", "It is cold."),
  operation(1, "present_be_affirmative", "contractions", "Сказать утвердительную фразу естественно и короче.", "Соединяй местоимение и be апострофом, не меняя значение.", "I'm; you're; he's; she's; it's; we're; they're", "I'm ready.", "We're early."),

  operation(2, "present_be_questions_negatives", "negation", "Отрицать состояние или факт.", "Ставь not сразу после am, is или are.", "subject + am|is|are + not", "I am not busy.", "They are not late."),
  operation(2, "present_be_questions_negatives", "yes_no_questions", "Уточнять состояние или факт.", "В вопросе перенеси am, is или are перед подлежащим.", "am|is|are + subject + complement?", "Are you ready?", "Is she here?"),
  operation(2, "present_be_questions_negatives", "short_answers", "Кратко подтвердить или опровергнуть ответ.", "В коротком ответе повторяй подходящую форму be.", "Yes, subject + be; No, subject + be + not", "Yes, I am.", "No, he isn't."),
  operation(2, "present_be_questions_negatives", "wh_questions", "Спросить, кто, что или где.", "Ставь who, what или where перед вопросительным порядком с be.", "who|what|where + be + subject?", "Where are they?", "Who is she?"),

  operation(3, "nouns_core_determiners", "indefinite_article", "Назвать один новый исчисляемый предмет.", "Выбирай an перед гласным звуком, иначе a.", "a|an + singular count noun", "It is a key.", "It is an apple."),
  operation(3, "nouns_core_determiners", "definite_article", "Указать на уже понятный конкретный предмет.", "Используй the, когда собеседнику ясно, о каком предмете речь.", "the + identifiable noun", "The door is open.", "The key is here."),
  operation(3, "nouns_core_determiners", "zero_article", "Говорить о вещах в общем без артикля.", "Не ставь артикль перед множественным существительным в общем значении.", "plural noun with no article", "Books are useful.", "Dogs are friendly."),
  operation(3, "nouns_core_determiners", "plural_nouns", "Назвать больше одного предмета.", "Для регулярного множественного числа добавляй -s или -es.", "singular noun -> plural noun", "These are books.", "Those are boxes."),
  operation(3, "nouns_core_determiners", "demonstratives", "Показать близкий или дальний предмет.", "This/that относятся к одному, these/those — к нескольким.", "this|that + singular; these|those + plural", "This is my bag.", "Those are our seats."),

  operation(4, "existence_place", "there_is_are", "Сообщить, что что-то существует в месте.", "Выбирай there is для одного и there are для нескольких.", "there is + singular; there are + plural", "There is a bank here.", "There are two chairs."),
  operation(4, "existence_place", "existential_questions", "Спросить о наличии.", "Перенеси is или are перед there.", "is|are + there + noun?", "Is there a pharmacy?", "Are there any seats?"),
  operation(4, "existence_place", "existential_some_any", "Указать неопределённое количество при наличии или вопросе.", "Обычно используй some в утверждении и any в вопросе или отрицании.", "some in affirmative; any in question or negative", "There are some shops.", "There isn't any water."),
  operation(4, "existence_place", "basic_place_prepositions", "Точно расположить предмет.", "Ставь in, on, under, next to или between перед местом.", "be + place preposition + noun", "The key is under the table.", "The bank is next to the hotel."),

  operation(5, "possession", "have_has", "Сообщить о наличии или принадлежности.", "С he/she/it выбирай has, с остальными подлежащими — have.", "subject + have|has + object", "I have a ticket.", "She has a car."),
  operation(5, "possession", "possessive_determiners", "Показать владельца перед существительным.", "Ставь my/your/his/her/its/our/their перед предметом.", "possessive determiner + noun", "This is my phone.", "Their room is ready."),
  operation(5, "possession", "possessive_pronouns", "Назвать владельца без повторения предмета.", "Используй mine/yours/his/hers/ours/theirs без следующего существительного.", "be + possessive pronoun", "The bag is mine.", "The seats are ours."),
  operation(5, "possession", "possessive_s", "Связать владельца-существительное с предметом.", "Добавляй 's к имени или существительному владельца.", "owner + 's + possessed noun", "This is Maria's key.", "The dog's bowl is here."),
  operation(5, "possession", "whose_questions", "Спросить, кому принадлежит предмет.", "Ставь whose перед существительным или перед be-вопросом.", "whose + noun + be?", "Whose bag is this?", "Whose keys are these?"),

  operation(6, "present_simple_affirmative", "lexical_frame", "Назвать регулярное действие или устойчивый факт.", "После подлежащего ставь смысловой глагол в present simple.", "subject + lexical verb + complement", "I work at home.", "They live nearby."),
  operation(6, "present_simple_affirmative", "agreement", "Согласовать действие с подлежащим.", "С I/you/we/they используй базовую форму глагола.", "I|you|we|they + base verb", "We start at nine.", "You speak English."),
  operation(6, "present_simple_affirmative", "third_person_s", "Описать регулярное действие he, she или it.", "В утверждении добавляй -s или -es к глаголу после he/she/it.", "he|she|it + verb-s", "She works here.", "He watches TV."),
  operation(6, "present_simple_affirmative", "routine_fact_meaning", "Отличить привычку или факт от единичного момента.", "Выбирай present simple для повторяющегося или устойчивого.", "present simple + routine or stable fact", "I walk every day.", "The shop opens at eight."),

  operation(7, "present_simple_questions_negatives", "do_questions", "Спросить о действии I, you, we или they.", "Ставь do перед подлежащим, а смысловой глагол оставляй базовым.", "do + subject + base verb?", "Do you work here?", "Do they live nearby?"),
  operation(7, "present_simple_questions_negatives", "does_questions", "Спросить о действии he, she или it.", "Ставь does перед подлежащим и убирай -s со смыслового глагола.", "does + he|she|it + base verb?", "Does she work here?", "Does it open early?"),
  operation(7, "present_simple_questions_negatives", "negatives", "Отрицать регулярное действие или факт.", "Используй don't или doesn't перед базовой формой глагола.", "subject + don't|doesn't + base verb", "I don't drive.", "He doesn't work here."),
  operation(7, "present_simple_questions_negatives", "wh_questions", "Уточнить деталь регулярного действия.", "Ставь wh-слово перед do/does и подлежащим.", "wh-word + do|does + subject + base verb?", "Where do you work?", "When does she start?"),
  operation(7, "present_simple_questions_negatives", "frequency_position", "Сообщить частоту действия.", "Ставь usually/often/never перед смысловым глаголом, но после be.", "subject + frequency adverb + lexical verb", "I usually walk.", "She often calls."),

  operation(8, "ability_requests_instructions", "can_ability", "Сообщить о способности.", "После can ставь базовую форму без to.", "subject + can + base verb", "I can swim.", "She can drive."),
  operation(8, "ability_requests_instructions", "cant_ability", "Сообщить об отсутствии способности.", "Ставь can't перед базовой формой глагола.", "subject + can't + base verb", "I can't hear you.", "He can't come."),
  operation(8, "ability_requests_instructions", "can_you_request", "Попросить человека о действии.", "Начинай просьбу с Can you и базового глагола.", "Can you + base verb?", "Can you help me?", "Can you open the door?"),
  operation(8, "ability_requests_instructions", "positive_imperative", "Дать прямую простую инструкцию.", "Начинай инструкцию с базовой формы глагола без подлежащего.", "base verb + complement", "Turn left.", "Open the window."),
  operation(8, "ability_requests_instructions", "negative_imperative_polite", "Остановить действие или вежливо попросить не делать его.", "Ставь don't перед базовым глаголом; please — в начале или конце просьбы.", "don't + base verb; please placement", "Don't touch this.", "Please don't wait."),

  operation(9, "present_continuous", "affirmative", "Описать действие прямо сейчас.", "Используй am/is/are и форму verb-ing.", "subject + am|is|are + verb-ing", "I am waiting now.", "They are working."),
  operation(9, "present_continuous", "negative", "Отрицать действие прямо сейчас.", "Ставь not после am/is/are перед verb-ing.", "subject + be + not + verb-ing", "She isn't sleeping.", "We aren't leaving."),
  operation(9, "present_continuous", "questions", "Спросить о текущем действии.", "Перенеси am/is/are перед подлежащим, verb-ing оставь после него.", "be + subject + verb-ing?", "Are you listening?", "What is he doing?"),
  operation(9, "present_continuous", "happening_now", "Выбрать continuous по смыслу текущего процесса.", "Используй continuous, когда действие идёт в момент речи.", "present continuous + now meaning", "The bus is coming.", "I am talking to you."),
  operation(9, "present_continuous", "ing_spelling", "Правильно образовать частотную форму -ing.", "Убирай конечную немую e или удваивай согласную только по изученной модели.", "make→making; sit→sitting", "She is making dinner.", "He is sitting outside."),

  operation(10, "present_simple_vs_continuous", "habit_vs_now", "Отличить привычку от действия сейчас.", "Выбирай simple для обычного, continuous — для происходящего сейчас.", "present simple contrast present continuous", "I walk every day.", "I am walking now."),
  operation(10, "present_simple_vs_continuous", "stable_vs_temporary", "Отличить устойчивую ситуацию от временной.", "Simple показывает обычное положение дел, continuous — ограниченный временный период.", "stable simple; temporary continuous", "She works in Cork.", "She is working in Dublin this week."),
  operation(10, "present_simple_vs_continuous", "stative_verbs", "Не превращать состояние в процесс без нужного смысла.", "С частотными know, want, need, like обычно используй simple.", "stative verb in present simple", "I know the answer.", "We need help."),
  operation(10, "present_simple_vs_continuous", "time_markers", "Использовать временную подсказку как часть смысла.", "Usually/every day тянут к simple; now/at the moment — к continuous.", "frequency marker vs current-time marker", "He usually drives.", "He is driving at the moment."),

  operation(11, "past_be_existence", "was_were", "Описать прошлое состояние или место.", "После I/he/she/it выбирай was, после you/we/they — were.", "subject + was|were + complement", "I was tired.", "They were at home."),
  operation(11, "past_be_existence", "questions_negatives", "Спросить или отрицать прошлое состояние.", "В вопросе вынеси was/were вперёд; в отрицании добавь not.", "was|were + subject?; subject + was|were not", "Were you busy?", "She wasn't there."),
  operation(11, "past_be_existence", "there_was_were", "Сообщить о наличии в прошлом.", "Выбирай there was для одного и there were для нескольких.", "there was + singular; there were + plural", "There was a problem.", "There were two messages."),
  operation(11, "past_be_existence", "past_state_location", "Привязать состояние или место к прошлому времени.", "Используй past be, когда состояние или место уже относятся к завершённому времени.", "past time anchor + was|were", "We were in London yesterday.", "The shop was closed last night."),

  operation(12, "past_simple_affirmative", "regular_ed", "Назвать завершённое регулярное действие.", "Для регулярного past simple добавляй -ed по изученной модели.", "regular verb + -ed", "I worked yesterday.", "They called me."),
  operation(12, "past_simple_affirmative", "irregular_whole_words", "Использовать частотную неправильную форму целиком.", "Неправильную форму извлекай как целое слово, не собирай по буквам.", "go→went; see→saw; have→had", "We went home.", "I saw the message."),
  operation(12, "past_simple_affirmative", "finished_event", "Показать завершённое прошлое событие.", "Выбирай past simple, когда событие закончено в прошлом.", "past simple + finished event", "She arrived at six.", "I finished the report."),
  operation(12, "past_simple_affirmative", "ed_pronunciation", "Узнать частотные звучания окончания -ed.", "Форма остаётся -ed на письме, даже когда окончание звучит по-разному.", "-ed pronounced /t/|/d/|/ɪd/", "I watched the film.", "We needed help."),

  operation(13, "past_simple_questions_negatives", "did_questions", "Спросить о завершённом действии.", "Ставь did перед подлежащим, а смысловой глагол возвращай в базовую форму.", "did + subject + base verb?", "Did you call her?", "Where did they go?"),
  operation(13, "past_simple_questions_negatives", "didnt_negatives", "Отрицать завершённое действие.", "После didn't используй базовую форму, не past form.", "subject + didn't + base verb", "I didn't call.", "She didn't go."),
  operation(13, "past_simple_questions_negatives", "base_form_restoration", "Не дублировать прошедшее время после did.", "Did и didn't уже несут past, поэтому следующий глагол базовый.", "did + base verb; never did + past form", "Did he see it?", "He didn't see it."),
  operation(13, "past_simple_questions_negatives", "finished_time_anchors", "Указать завершённое время события.", "С past simple используй yesterday, last..., ...ago или точную прошлую дату.", "past simple + finished-time anchor", "I called yesterday.", "We met two days ago."),
  operation(13, "past_simple_questions_negatives", "event_sequence", "Передать простой порядок завершённых событий.", "Связывай последовательные past simple события словами then/after that/finally.", "past event + sequence connector + past event", "I arrived, then I called.", "We ate and then we left."),

  operation(14, "past_continuous", "affirmative", "Показать действие в процессе в прошлом.", "Используй was/were и verb-ing.", "subject + was|were + verb-ing", "I was waiting.", "They were talking."),
  operation(14, "past_continuous", "negative_questions", "Спросить или отрицать прошлый процесс.", "Переноси was/were в вопросе и добавляй not в отрицании.", "was|were + subject + verb-ing?; was|were not + verb-ing", "Were you sleeping?", "He wasn't driving."),
  operation(14, "past_continuous", "background_action", "Дать фон прошлой истории.", "Используй past continuous для процесса, на фоне которого разворачивается событие.", "past continuous as background", "It was raining.", "People were waiting outside."),
  operation(14, "past_continuous", "interrupted_action", "Связать длительный процесс с коротким событием.", "Past continuous показывает процесс, past simple — вмешавшееся событие.", "past continuous + when + past simple", "I was driving when she called.", "We were eating when it started."),
  operation(14, "past_continuous", "when_while", "Выбрать when или while по связи действий.", "While обычно вводит процесс; when может вводить короткое событие.", "while + past continuous; when + past simple", "While I was waiting, I read.", "I was walking when the rain started."),

  operation(15, "planned_future", "going_to_intention", "Сообщить о намерении.", "Используй be going to и базовый глагол для уже принятого плана.", "subject + be going to + base verb", "I am going to call her.", "We are going to travel."),
  operation(15, "planned_future", "going_to_evidence", "Сделать прогноз по видимому признаку.", "Используй going to, когда причина прогноза уже заметна сейчас.", "be going to + prediction from present evidence", "It is going to rain.", "The glass is going to fall."),
  operation(15, "planned_future", "continuous_arrangement", "Сообщить о конкретной договорённости.", "Используй present continuous, когда время или участники уже согласованы.", "present continuous + arranged future time", "I am meeting her at six.", "We are flying on Monday."),
  operation(15, "planned_future", "plan_arrangement_contrast", "Отличить намерение от организованной встречи.", "Going to называет намерение; present continuous — уже устроенную договорённость.", "intention contrast arrangement", "I am going to visit Spain.", "I am meeting Ana in Madrid."),

  operation(16, "will_future", "prediction", "Высказать нейтральный прогноз.", "Используй will и базовый глагол для мнения о будущем без видимого текущего признака.", "subject + will + base verb", "I think it will rain.", "The trip will be easy."),
  operation(16, "will_future", "spontaneous_decision", "Принять решение в момент речи.", "Используй I'll, когда решение возникает прямо сейчас.", "I'll + base verb", "I'll answer the phone.", "I'll take this one."),
  operation(16, "will_future", "promise", "Дать обещание.", "Используй will для добровольного обязательства о будущем действии.", "subject + will + promised action", "I will call you tonight.", "We won't forget."),
  operation(16, "will_future", "offer", "Предложить помощь или действие.", "Используй I'll для предложения своего действия или Shall I...? для вопроса.", "I'll + offer; Shall I + base verb?", "I'll carry that.", "Shall I open the window?"),
  operation(16, "will_future", "future_form_contrast", "Выбрать форму будущего по причине решения.", "Will — прогноз или решение сейчас; going to — намерение; continuous — договорённость.", "will contrast going to contrast present continuous", "I'll call him now.", "I'm meeting him tomorrow."),

  operation(17, "countability_quantification", "count_noncount", "Отличить считаемые предметы от массы или вещества.", "Count nouns допускают число и plural; non-count обычно не имеют plural в этом значении.", "count noun contrast non-count noun", "I need two chairs.", "I need some water."),
  operation(17, "countability_quantification", "much_many", "Спросить или сказать о большом количестве.", "Many выбирай с plural count nouns, much — с non-count nouns.", "many + plural count noun; much + non-count noun", "How many bags are there?", "How much time do we have?"),
  operation(17, "countability_quantification", "few_little", "Показать небольшое количество.", "Few относится к plural count nouns, little — к non-count nouns.", "few + plural count noun; little + non-count noun", "We have a few minutes.", "There is little space."),
  operation(17, "countability_quantification", "some_any_quantity", "Выразить неопределённое количество в разных типах фраз.", "Some обычно выбирай в утверждении и предложении, any — в вопросе и отрицании.", "some|any + count or non-count noun", "Would you like some tea?", "We don't have any milk."),
  operation(17, "countability_quantification", "units_containers", "Посчитать неисчисляемое через единицу.", "Ставь число перед единицей или контейнером, затем of и вещество.", "number + unit + of + non-count noun", "I need two bottles of water.", "She bought a loaf of bread."),

  operation(18, "comparison_degree", "comparatives", "Сравнить два объекта по одному признаку.", "Используй -er или more, затем than при названном втором объекте.", "comparative adjective + than", "This room is smaller.", "The train is more comfortable than the bus."),
  operation(18, "comparison_degree", "superlatives", "Выделить крайний вариант в группе.", "Используй the и форму -est или most.", "the + superlative adjective", "This is the cheapest ticket.", "It is the most useful option."),
  operation(18, "comparison_degree", "as_as", "Показать равную или неравную степень.", "Ставь прилагательное между as и as; для неравенства добавляй not перед первым as.", "as + adjective + as", "This one is as fast as that one.", "The room isn't as quiet as ours."),
  operation(18, "comparison_degree", "too_enough", "Показать избыток или достаточность.", "Too ставь перед прилагательным, enough — после него.", "too + adjective; adjective + enough", "The bag is too heavy.", "The room is big enough."),
  operation(18, "comparison_degree", "so_such", "Усилить степень признака или характеристику предмета.", "So относится к прилагательному, such — к именной группе.", "so + adjective; such + noun phrase", "The view is so beautiful.", "It was such a good day."),

  operation(19, "ability_permission", "can_present_ability", "Сообщить о способности сейчас.", "Используй can и базовый глагол для общей настоящей способности.", "can + base verb", "I can drive.", "She can speak Polish."),
  operation(19, "ability_permission", "could_past_ability", "Сообщить об общей способности в прошлом.", "Используй could для общей прошлой способности, не для одного успешного случая.", "could + base verb for general past ability", "I could swim at six.", "He could read early."),
  operation(19, "ability_permission", "may_permission", "Вежливо попросить или дать разрешение.", "Используй may в более формальной просьбе или разрешении.", "May I + base verb?", "May I come in?", "You may use this seat."),
  operation(19, "ability_permission", "be_able_to", "Выразить способность там, где can не даёт нужной формы.", "Согласуй be и ставь able to перед базовым глаголом.", "be able to + base verb", "I will be able to come.", "She was able to finish."),
  operation(19, "ability_permission", "polite_permission", "Выбрать вежливую форму запроса разрешения.", "Could I...? мягче, чем Can I...?; обе формы требуют базового глагола.", "Could I + base verb?", "Could I open the window?", "Can I sit here?"),

  operation(20, "obligation_prohibition_advice", "must_obligation", "Выразить сильную обязанность или правило говорящего.", "Используй must и базовый глагол для обязательного действия.", "must + base verb", "You must show your ticket.", "I must leave now."),
  operation(20, "obligation_prohibition_advice", "have_to_external", "Выразить внешнее требование.", "Согласуй have to и используй его для требования ситуации или правила.", "have|has to + base verb", "We have to check in.", "She has to wear a badge."),
  operation(20, "obligation_prohibition_advice", "should_advice", "Дать обычный совет.", "Используй should и базовый глагол для рекомендуемого действия.", "should + base verb", "You should rest.", "We should call first."),
  operation(20, "obligation_prohibition_advice", "ought_to_advice", "Дать более подчёркнутый совет.", "После ought всегда ставь to и базовый глагол.", "ought to + base verb", "You ought to tell her.", "We ought to leave early."),
  operation(20, "obligation_prohibition_advice", "neednt", "Сказать, что действие не требуется.", "После needn't ставь базовый глагол без to.", "needn't + base verb", "You needn't wait.", "We needn't pay now."),
  operation(20, "obligation_prohibition_advice", "dont_have_to", "Показать отсутствие необходимости.", "Don't have to означает, что можно не делать, но действие не запрещено.", "don't|doesn't have to + base verb", "You don't have to print it.", "He doesn't have to come."),
  operation(20, "obligation_prohibition_advice", "mustnt", "Выразить прямой запрет.", "Mustn't означает, что действие запрещено, а не просто необязательно.", "mustn't + base verb", "You mustn't smoke here.", "We mustn't touch that."),

  operation(21, "verb_complement_patterns", "gerund_complements", "Поставить действие после глагола, который требует -ing.", "После enjoy и законченного like/prefer-паттерна используй verb-ing.", "verb + gerund", "I enjoy cooking.", "She likes reading."),
  operation(21, "verb_complement_patterns", "infinitive_complements", "Поставить действие после глагола, который требует to.", "После want, need и decide используй to + base verb.", "verb + to-infinitive", "I want to leave.", "We decided to wait."),
  operation(21, "verb_complement_patterns", "want_need_like_prefer", "Выбрать дополнение по смыслу частотного глагола.", "Want/need обычно ведут к to-infinitive; like/prefer допускают изученную форму по заданному смыслу.", "want|need + to-infinitive; like|prefer + learned complement", "I need to call him.", "She prefers walking."),
  operation(21, "verb_complement_patterns", "object_infinitive", "Попросить или ожидать действие другого человека.", "После want/need + object ставь to-infinitive.", "verb + object + to-infinitive", "I want you to stay.", "We need them to help."),
  operation(21, "verb_complement_patterns", "infinitive_purpose", "Объяснить цель действия.", "Ставь to + base verb после основного действия, чтобы ответить «зачем».", "main action + to-infinitive of purpose", "I called to ask a question.", "She went out to buy milk."),

  operation(22, "pronoun_reference", "object_pronouns", "Заменить объект местоимением.", "После глагола или предлога используй me/you/him/her/it/us/them.", "verb|preposition + object pronoun", "Please call me.", "I spoke to them."),
  operation(22, "pronoun_reference", "possessive_pronouns", "Не повторять существительное после указания владельца.", "Mine/yours/his/hers/ours/theirs используются самостоятельно.", "possessive pronoun without following noun", "This seat is hers.", "Those bags are theirs."),
  operation(22, "pronoun_reference", "reflexive_pronouns", "Показать, что участник действует на самого себя.", "Выбирай myself/yourself/himself и другие формы по подлежащему.", "subject + verb + matching reflexive pronoun", "I cut myself.", "They made it themselves."),
  operation(22, "pronoun_reference", "one_ones", "Заменить уже названный исчисляемый предмет.", "One заменяет один предмет, ones — несколько.", "determiner|adjective + one|ones", "I prefer the blue one.", "The small ones are cheaper."),
  operation(22, "pronoun_reference", "another_other", "Отличить ещё один вариант от остальных.", "Another — ещё один singular; other — другие перед существительным.", "another + singular noun; other + noun", "Can I have another key?", "The other rooms are full."),

  operation(23, "present_perfect_experience_result", "form_participles", "Построить present perfect.", "Согласуй have/has и поставь past participle смыслового глагола.", "subject + have|has + past participle", "I have finished.", "She has arrived."),
  operation(23, "present_perfect_experience_result", "experience", "Спросить или сказать о жизненном опыте без законченного времени.", "Используй present perfect, если важен факт опыта, а не когда он был.", "present perfect + life experience", "Have you visited Rome?", "I have tried sushi."),
  operation(23, "present_perfect_experience_result", "present_result", "Показать результат, важный сейчас.", "Выбирай present perfect, когда прошлое действие объясняет текущее состояние.", "present perfect + present result", "I have lost my key.", "She has broken her phone."),
  operation(23, "present_perfect_experience_result", "ever_never", "Уточнить наличие опыта.", "Ever ставь в вопросе перед participle; never — в утвердительной форме без not.", "have + ever|never + past participle", "Have you ever flown?", "I have never driven."),
  operation(23, "present_perfect_experience_result", "just_already_yet_answers", "Показать недавность или ожидаемый результат и кратко ответить.", "Just/already ставь между have и participle; yet обычно в конце вопроса или отрицания.", "have + just|already + participle; yet at end", "We have already paid.", "Has he arrived yet?"),

  operation(24, "present_perfect_duration_contrast", "for_since", "Указать длительность незавершённой ситуации.", "For вводит период, since — точку начала.", "present perfect + for duration; since starting point", "I have lived here for a year.", "She has worked here since May."),
  operation(24, "present_perfect_duration_contrast", "how_long", "Спросить о длительности до настоящего.", "Начинай с How long и используй present perfect.", "How long + have|has + subject + past participle?", "How long have you known her?", "How long has he lived here?"),
  operation(24, "present_perfect_duration_contrast", "perfect_continuous", "Подчеркнуть продолжающийся процесс до настоящего.", "Используй have/has been + verb-ing для ограниченного набора деятельностей.", "have|has been + verb-ing", "I have been waiting for an hour.", "They have been working all day."),
  operation(24, "present_perfect_duration_contrast", "past_simple_contrast", "Отличить связь с настоящим от законченного прошлого.", "Present perfect не называет завершённое прошлое время; с yesterday/last... выбирай past simple.", "present perfect contrast finished past simple", "I have seen that film.", "I saw it last week."),

  operation(25, "past_habits_narrative_ordering", "used_to", "Описать прошлую привычку или состояние, которого больше нет.", "Используй used to и базовый глагол для контраста прошлого с настоящим.", "used to + base verb", "I used to live here.", "She used to be shy."),
  operation(25, "past_habits_narrative_ordering", "habitual_would", "Повторно назвать привычное прошлое действие.", "Would подходит для повторяющегося действия после установленного прошлого контекста, но не для состояния.", "past context + would + action verb", "Every summer, we would swim here.", "He would call every Sunday."),
  operation(25, "past_habits_narrative_ordering", "past_perfect", "Показать более раннее из двух прошлых событий.", "Для раннего события используй had + past participle.", "had + past participle before later past event", "The train had left when we arrived.", "She had finished before I called."),
  operation(25, "past_habits_narrative_ordering", "before_after", "Явно связать порядок прошлых событий.", "Before и after показывают порядок; формы времени выбирай по нужной ясности.", "before|after + past clause", "We ate before we left.", "After she arrived, we started."),
  operation(25, "past_habits_narrative_ordering", "by_the_time", "Обозначить крайний прошлый момент завершения.", "В главной части используй past perfect для уже завершившегося к моменту события.", "past perfect + by the time + past simple", "We had left by the time he called.", "She had finished by the time I arrived."),

  operation(26, "zero_first_conditional", "zero_conditional", "Выразить устойчивое следствие условия.", "Используй present simple в обеих частях для общего факта или правила.", "if|when + present simple, present simple", "If water freezes, it expands.", "When I am tired, I rest."),
  operation(26, "zero_first_conditional", "first_conditional", "Назвать реальное возможное будущее последствие.", "В if-части используй present simple, в результате — will + base verb.", "if + present simple, will + base verb", "If it rains, we will take a taxi.", "I will call if I am late."),
  operation(26, "zero_first_conditional", "future_time_clauses", "Связать будущее действие со временем.", "После when/as soon as/before/after используй present simple, не will.", "future main clause + time clause in present simple", "I will text you when I arrive.", "We will eat after she comes."),
  operation(26, "zero_first_conditional", "if_when_unless", "Выбрать условный союз по смыслу.", "If — условие, when — ожидаемое время, unless — если не.", "if|when|unless + present clause", "If he calls, tell me.", "We won't go unless it stops."),
  operation(26, "zero_first_conditional", "clause_order", "Менять порядок частей условия без изменения смысла.", "При условной части в начале отделяй её запятой; в конце запятая не нужна.", "conditional clause first or second", "If you need help, call me.", "Call me if you need help."),

  operation(27, "second_conditional_wishes", "unreal_condition", "Обсудить нереальную или маловероятную ситуацию.", "Используй past form в if-части и would + base verb в результате.", "if + past simple, would + base verb", "If I had more time, I would travel.", "I would move if I found a job."),
  operation(27, "second_conditional_wishes", "if_i_were", "Дать гипотетический совет или представить другую реальность.", "В формальном стандартном паттерне используй were после I/he/she/it.", "if + subject + were", "If I were you, I would wait.", "If she were here, she would help."),
  operation(27, "second_conditional_wishes", "would_result", "Не ставить would в обычной if-части.", "Would находится в результате; if-часть использует past form.", "if-clause without would; result with would", "If we left now, we would arrive early.", "They would come if they knew."),
  operation(27, "second_conditional_wishes", "wish_present", "Выразить желание изменить настоящее.", "После wish используй past form для нереального настоящего.", "wish + past simple|were", "I wish I had more time.", "She wishes she were here."),

  operation(28, "passive_voice", "present_passive", "Сосредоточиться на действии или результате сейчас.", "Используй am/is/are + past participle; исполнитель необязателен.", "subject + am|is|are + past participle", "The room is cleaned every day.", "Tickets are checked here."),
  operation(28, "passive_voice", "past_passive", "Сообщить о действии над объектом в прошлом.", "Используй was/were + past participle.", "subject + was|were + past participle", "The window was broken yesterday.", "The emails were sent at six."),
  operation(28, "passive_voice", "future_passive", "Сообщить, что действие будет выполнено.", "Используй will be + past participle.", "subject + will be + past participle", "The order will be delivered tomorrow.", "You will be contacted soon."),
  operation(28, "passive_voice", "modal_passive", "Связать passive с обязанностью или возможностью.", "После modal используй be + past participle.", "modal + be + past participle", "The form must be signed.", "This can be fixed."),
  operation(28, "passive_voice", "by_agent", "Назвать исполнителя только когда он важен.", "Добавляй by + agent после passive, если исполнитель несёт нужную информацию.", "passive + by + agent", "The book was written by Orwell.", "The call was answered by Mia."),

  operation(29, "defining_relative_clauses", "who_which_that", "Уточнить человека или предмет необходимой информацией.", "Who относится к людям, which — к вещам, that допустимо для обоих в defining clause.", "person + who|that; thing + which|that", "The woman who called is here.", "The key that works is blue."),
  operation(29, "defining_relative_clauses", "whose", "Уточнить человека или предмет через принадлежность.", "После whose сразу ставь существительное владельца внутри relative clause.", "noun + whose + noun + clause", "The man whose car is outside is waiting.", "I found the guest whose bag was lost."),
  operation(29, "defining_relative_clauses", "where", "Уточнить место через действие в нём.", "Используй where после существительного со значением места.", "place noun + where + clause", "This is the room where we met.", "I know a shop where you can pay by card."),
  operation(29, "defining_relative_clauses", "subject_object_roles", "Понять роль relative pronoun в придаточной части.", "Если pronoun выполняет действие, он subject; если действие направлено на него, он object.", "relative pronoun as subject or object", "The person who helped me was kind.", "The person who I called was busy."),
  operation(29, "defining_relative_clauses", "object_omission", "Опустить объектное relative pronoun там, где смысл ясен.", "Опускай who/which/that только когда после него уже есть отдельное подлежащее.", "noun + omitted object relative + subject + verb", "The film we watched was good.", "The person I called was busy."),

  operation(30, "reported_speech", "reported_statements", "Передать утверждение без прямой цитаты.", "После said (that) используй придаточную часть с нужной сменой точки зрения.", "subject + said (that) + reported clause", "She said that she was tired.", "He said he needed help."),
  operation(30, "reported_speech", "reported_questions", "Передать чужой вопрос.", "После asked используй утвердительный порядок слов и убери do-support вопроса.", "asked + wh-word|if + subject + verb", "She asked where I lived.", "He asked if I was ready."),
  operation(30, "reported_speech", "reported_commands_requests", "Передать приказ или просьбу.", "После told/asked + object используй to-infinitive; для запрета — not to.", "told|asked + object + (not) to-infinitive", "She asked me to wait.", "He told us not to leave."),
  operation(30, "reported_speech", "say_tell_ask", "Выбрать reporting verb по структуре сообщения.", "Say не требует объекта; tell требует человека; ask вводит вопрос или просьбу.", "say + clause; tell + person + clause; ask + question|request", "She told me the news.", "He asked me a question."),
  operation(30, "reported_speech", "bounded_backshift", "Сдвинуть время при передаче прошлого сообщения там, где это нужно.", "При прошлом reporting verb сдвигай present к past в утверждённом ограниченном наборе.", "present→past after past reporting verb", "She said she was busy.", "He said he needed help."),

  operation(31, "complex_questions_clause_linking", "indirect_questions", "Задать вопрос вежливо и непрямо.", "После вводной части используй утвердительный порядок слов.", "introductory phrase + wh-word|if + subject + verb", "Could you tell me where the station is?", "Do you know if it is open?"),
  operation(31, "complex_questions_clause_linking", "question_tags", "Попросить подтверждение предположения.", "Положительное утверждение получает отрицательный tag и наоборот; согласуй auxiliary.", "statement, opposite-polarity auxiliary tag?", "You're ready, aren't you?", "She doesn't drive, does she?"),
  operation(31, "complex_questions_clause_linking", "noun_clauses", "Сделать мысль объектом глагола.", "После know/think/understand используй clause с обычным утвердительным порядком.", "verb + that|wh-clause", "I know that she is busy.", "I understand why he left."),
  operation(31, "complex_questions_clause_linking", "cause_connectors", "Назвать причину.", "Because вводит причину-clause; because of — причину-именную группу.", "result + because + clause; because of + noun", "I stayed home because I was tired.", "The flight was late because of fog."),
  operation(31, "complex_questions_clause_linking", "contrast_connectors", "Связать противоположные факты.", "But соединяет контраст внутри одной фразы; although вводит concessive clause.", "clause + but + clause; although + clause", "It was expensive, but I bought it.", "Although it rained, we went out."),
  operation(31, "complex_questions_clause_linking", "purpose_connectors", "Объяснить цель.", "Используй to + verb для общего участника и so that + clause для явного участника.", "to-infinitive; so that + clause", "I called to confirm the time.", "I wrote it down so that I could remember it."),
  operation(31, "complex_questions_clause_linking", "result_connectors", "Показать результат причины.", "So связывает причину с результатом; therefore допустимо как более формальная связка.", "cause, so + result", "The shop was closed, so we left.", "It was late; therefore, we took a taxi."),

  operation(32, "probability_deduction", "must_inference", "Сделать сильный вывод по признакам.", "Используй must, когда доступные признаки почти исключают другое объяснение.", "must + base verb for present inference", "The lights are on; they must be home.", "You walked all day; you must be tired."),
  operation(32, "probability_deduction", "may_might", "Показать реальную, но неуверенную возможность.", "Используй may или might, когда доказательств недостаточно для сильного вывода.", "may|might + base verb", "She might be at work.", "It may rain later."),
  operation(32, "probability_deduction", "could_possibility", "Предложить одно возможное объяснение.", "Используй could, когда это один правдоподобный вариант среди других.", "could + base verb for possibility", "The noise could be the wind.", "He could be on the train."),
  operation(32, "probability_deduction", "cant_inference", "Исключить объяснение по признакам.", "Используй can't, когда факты делают объяснение невозможным.", "can't + base verb for present deduction", "She can't be at home; I saw her outside.", "This can't be the right key."),
  operation(32, "probability_deduction", "integrated_stance", "Объяснить степень уверенности и основание вывода.", "Выбери modal по силе доказательства и назови наблюдаемый признак.", "evidence + must|may|might|could|can't + base verb", "The road is wet, so it might be slippery.", "His coat is here, so he must be nearby."),
]);

const EVIDENCE_REFS = Object.freeze(["EV-CAM-B1-GRAMMAR-01", "OC-FULL-B1-SCOPE-01"] as const);

export const LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2: readonly LearningV2EnglishGrammarOperationV2[] = Object.freeze(
  OPERATION_SEEDS.map((seed, index) => {
    const [lessonOrdinal, majorSystemId, slug, communicativeFunctionRu, decisionRuleRu, form, exampleOne, exampleTwo] = seed;
    const id = `en.grammar.${majorSystemId}.${slug}`;
    const prerequisiteOperationIds = index === 0
      ? Object.freeze([] as string[])
      : Object.freeze([`en.grammar.${OPERATION_SEEDS[index - 1][1]}.${OPERATION_SEEDS[index - 1][2]}`]);

    return Object.freeze({
      id,
      lessonOrdinal,
      majorSystemId,
      communicativeFunctionRu,
      decisionRuleRu,
      formBoundary: Object.freeze([form]),
      positiveExamples: Object.freeze([exampleOne, exampleTwo]) as readonly [string, string],
      diagnosticErrorIds: Object.freeze([`${id}.wrong_form_or_meaning`]),
      prerequisiteOperationIds,
      prohibitedExtensionIds: Object.freeze([`${majorSystemId}.outside_approved_boundary`]),
      fullSessionBeforeUse: true as const,
      sourceEvidenceRefs: EVIDENCE_REFS,
    });
  }),
);
