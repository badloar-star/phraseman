# Тест уровня английского — разбор заданий (Learning V2, 28.10)

Жалобы владельца (через координатора): бредовые задания («ситуация: этого не было вчера», «it didn't cheer up quickly») и задания, где верны
несколько вариантов («they are going to pay» / «they are paying»), «в очень многих заданиях».

## Как устроен тест и почему так вышло

Своего банка у теста нет: `app/learning_v2_placement_v1.ts` брал ЛЮБОЕ задание «вставь грамматику» (`context_gap_grammar`) из занятий
урока 1–22 — это 4449 заданий. Задания писались для занятия, где рядом подсказка и тема — в тесте контекста нет. Отсюда:

| Что не так | Где | Пример (id) | Решение |
|---|---|---|---|
| Несколько верных ответов: тест сам отрезал подсказку «Передайте … через Present Continuous / going to» | урок 15, все задания пары «going to / continuous» | `lesson-15:session:25:i12` «We ___ for our membership on Friday» — are paying / are going to pay | Убраны из теста; взяты going to с am / is / are (одна форма верна) |
| Время только в подсказке, в английской фразе его нет — Do и Did оба верны | урок 13, шаблон «Вопрос о вчерашнем действии» | `lesson-13:session:01:i12` «___ you wash the tea strainer?» | Убраны; взяты фразы с yesterday / last night / last week внутри |
| Бессмыслица: подсказка «Этого не было вчера. Выберите отрицание» + фраза без времени | урок 13, 12 заданий | `lesson-13:session:17:i12` «I ___ cheer up quickly» (пример владельца) | Убраны из теста |
| Время только в подсказке («В тот момент прошлого») — were и are оба верны | урок 14 | `lesson-14:session:01:i12` «We ___ reading a picture book» | Убраны; взяты фразы с when / while |
| Действие прямо сейчас, а верным считается Present Simple — неверный английский | урок 6 | `lesson-06:session:01:i14` «Вы достали хлеб — скажите, что печёте» → «I bake bread»; `06/14` «Ты смеёшься над моей шуткой» → «You laugh at my joke» | Убраны; оставлены 3 задания-привычки |
| little / a little — оба верны грамматически, различие только в подсказке | урок 17 | `lesson-17:session:17:i12` «We have ___ privacy» | Убраны |
| Не грамматика темы, а «назови предмет» | урок 3, занятия 25–32 | `lesson-03:session:25:i14` socket / adapter / box | Убраны |
| Странная ситуация / подсказка не о том, что во фразе | уроки 2, 7 | `lesson-02:session:19:i14` «Мама спрашивает: Are you guilty?»; `lesson-07:session:14:i14` «Спросите учительницу об английском» → «Does the pupil learn English?» | Убраны |
| Перевод подсказки: в en / es / pl / pt-BR / tr / vi / id стоит русский текст (переведён только uk) | все уроки, поле `localizedScene` | `lesson-13:session:17:i12` | Переводчику (тест уровня открыт только для ru / uk — в тесте не видно, в уроках видно) |

**Решение:** тест больше не берёт что попало. В `app/learning_v2_placement_items_v1.ts` — 129 проверенных вручную заданий (по 6 на урок,
урок 6 — 3). Критерии: тема урока; естественная английская фраза; ровно один верный вариант; время и лицо видны в самой фразе, а не только
в подсказке. Тест собирает только занятия с этими заданиями (быстрее: 3–6 занятий вместо перебора 56). Сторож:
`tests/learning_v2_placement_v1_data.test.ts` — у каждого урока теста ≥ 3 проверенных, каждый вопрос из списка.

## Что осталось сделать (не в этом коммите)

- **Фабрика / Теория — сами уроки.** Задания выше остаются в занятиях уроков: уроки 6 (сцены «прямо сейчас» с Present Simple), 13 (шаблон
  «Этого не было вчера» без времени во фразе), 14 (время только в подсказке) нужно переписать: время — в английской фразе, сцена урока 6 —
  привычка. Это контент `content/learning-v2-course/**` (Codex) — я не трогаю.
- **Переводчик:** `localizedScene` у заданий уроков — русский текст во всех языках, кроме uk. Список изменённых id — таблица ниже.
- **Дизайн («Пожаловаться»):** в отчёт нужен `interactionId` (вида `lesson-13:session:17:i12`), урок, занятие, подсказка, фраза с пропуском,
  выбранный вариант и верный вариант.
- **Вход:** состав теста — те же 22 урока, по 3 вопроса на тему; изменился только источник вопросов.


## Задания, которые теперь показывает тест (129)

| Урок | id | Подсказка (ru) | Фраза | Верно | Неверно |
|---|---|---|---|---|---|
| 1 | lesson-01:session:05:i15 | Вставьте слово — наставница спрашивает, как вы себя чувствуете; всё в порядке | I ___ fine. | am | is / are |
| 1 | lesson-01:session:11:i13 | Вставьте слово — сестра вежливо отказалась от приглашения и переживает, что поступила грубо. Скажите ей, что она не грубит | You ___ not rude. | are | am / is |
| 1 | lesson-01:session:13:i13 | Подруга выше всех в компании. Скажите ей: «ты высокая». | You ___ tall. | are | am / is |
| 1 | lesson-01:session:19:i14 | Вставьте слово — друзья ушли, вы остались в кафе одни. Скажите о себе | I ___ alone. | am | is / are |
| 1 | lesson-01:session:25:i14 | Вы сравнили сегодняшний спектакль с прошлогодним. Скажите о сегодняшнем: «Он другой» | It ___ different. | is | am / are |
| 1 | lesson-01:session:31:i14 | Две чашки похожи. Вставьте слово | They ___ similar. | are | is / am |
| 2 | lesson-02:session:01:i14 | Сестре предложенная экскурсия неинтересна. Дополните фразу | She ___ not interested. | is | am / are |
| 2 | lesson-02:session:04:i14 | Доводы организатора о новом маршруте вас с другом пока не убедили. Дополните фразу | We ___ not convinced. | are | am / is |
| 2 | lesson-02:session:09:i14 | Костя уже сел в кресло во втором ряду. Дополните вопрос, мягкое ли оно | ___ it soft? | Is | Are / Am |
| 2 | lesson-02:session:10:i14 | Анна и Олег осматривают собранный шкаф. Дополните вопрос, довольны ли они | ___ they satisfied? | Are | Am / Is |
| 2 | lesson-02:session:27:i14 | Друг проснулся. Подруга спрашивает: «Is he asleep?» Дополните короткое «нет» | No, he ___ not. | is | am / are |
| 2 | lesson-02:session:29:i14 | Спросите помощника, где сейчас хозяин с женой | Where ___ they? | are | am / is |
| 3 | lesson-03:session:10:i14 | Продавец показывает на кресло у входа в отдел. Дополните фразу | It is ___ armchair. | an | a / is |
| 3 | lesson-03:session:13:i14 | Продавщица показывает на часы на стене. Дополните фразу | It is ___ clock. | a | an / is |
| 3 | lesson-03:session:14:i14 | Официантка кладёт на тарелку яйцо. Дополните фразу | It is ___ egg. | an | a / is |
| 3 | lesson-03:session:16:i14 | На бланке написаны улица и номер дома. Дополните фразу | It is ___ address. | an | a / is |
| 3 | lesson-03:session:18:i14 | Подруга пересчитывает коробки. Дополните её вопрос | Are they ___? | boxes | box / are |
| 3 | lesson-03:session:19:i14 | Подруга показывает на карте города. Дополните её вопрос | Are they ___? | cities | city / are |
| 4 | lesson-04:session:01:i12 | Вы впервые говорите подруге о старой библиотеке. Дополните фразу | There is ___ old library nearby. | an | a / the |
| 4 | lesson-04:session:04:i11 | На карте рядом с рынком отмечено несколько ресторанов. Дополните фразу | There ___ restaurants near the market. | are | is / a |
| 4 | lesson-04:session:05:i10 | Вы видите на плане одно кафе рядом с супермаркетом. Дополните фразу | There ___ a cafe near the supermarket. | is | are / am |
| 4 | lesson-04:session:09:i12 | Вы ищете аптеку. Дополните ваш вопрос | ___ there a pharmacy near here? | Is | Are / Am |
| 4 | lesson-04:session:18:i12 | Подруга спрашивает про масло. Его немного. Дополните фразу | There is ___ butter here. | some | a / an |
| 4 | lesson-04:session:19:i12 | Брат хочет узнать, есть ли рис. Дополните его вопрос | Is there ___ rice here? | any | a / an |
| 5 | lesson-05:session:02:i14 | У отеля есть сад. Выберите форму | The hotel ___ a garden. | has | have / is |
| 5 | lesson-05:session:06:i14 | У подруги есть ручка. Выберите форму | She ___ a pen. | has | have / is |
| 5 | lesson-05:session:17:i14 | Вы возвращаете другу шлем, который он оставил у вас. Выберите слово | The helmet is ___. | yours | your / mine |
| 5 | lesson-05:session:18:i14 | Кольцо принадлежит вашему брату. Выберите слово | The ring is ___. | his | he / hers |
| 5 | lesson-05:session:20:i14 | Подруга спрашивает, чей рюкзак. Он принадлежит вашему мужу. Выберите слово | The backpack is my ___. | husband’s | husband / wife’s |
| 5 | lesson-05:session:21:i14 | Подруга спрашивает, чья собака лает на лестнице. Собака соседа. Выберите слово | The dog is the ___. | neighbour’s | neighbour / neighbours |
| 6 | lesson-06:session:09:i14 | Скажите о себе: «Я начинаю смену в четыре». Выберите слово | I ___ the shift at four. | start | starts / am start |
| 6 | lesson-06:session:12:i14 | Скажите о себе: «Я рисую красками дома». Выберите слово | I ___ at home. | paint | paints / am paint |
| 6 | lesson-06:session:13:i14 | Скажите о себе и брате: «Мы плаваем в этом бассейне». Выберите слово | We ___ in this pool. | swim | swims / are swim |
| 7 | lesson-07:session:03:i14 | Скажите брату, что чернил нет. Выберите слово | There ___ no ink here. | is | are / am |
| 7 | lesson-07:session:06:i14 | Скажите мастеру, что плоскогубцев нет. Выберите слово | There ___ no pliers here. | are | is / am |
| 7 | lesson-07:session:10:i14 | Спросите подругу о вентиляторе. Выберите слово | Does the fan ___? | work | works / is work |
| 7 | lesson-07:session:13:i14 | Спросите друга о дяде. Выберите слово | Does your uncle ___ golf? | play | plays / is play |
| 7 | lesson-07:session:18:i14 | Скажите «У него нет дома». Выберите слово | He ___ have a house. | doesn't | don't / isn't |
| 7 | lesson-07:session:20:i14 | Скажите брату, что спичек нет. Выберите слово | There ___ no matches here. | are | is / am |
| 8 | lesson-08:session:01:i14 | Коллега спрашивает, что вы умеете. Выберите слово | I can ___. | type | types / to type |
| 8 | lesson-08:session:02:i14 | Брат спрашивает, умеете ли вы бросать мяч. Выберите слово | I can ___ the ball. | throw | throws / to throw |
| 8 | lesson-08:session:09:i14 | Выберите форму: «Он не умеет нырять» | He ___ dive. | can’t | can / is can’t |
| 8 | lesson-08:session:12:i14 | Выберите форму: «Он не умеет готовить яйца пашот» | He ___ poach eggs. | can’t | can / is can’t |
| 8 | lesson-08:session:17:i14 | Начните просьбу «Можешь одолжить мне ручку?» | ___ you lend me a pen? | Can | Are / Is |
| 8 | lesson-08:session:19:i14 | Начните просьбу «Можешь это объяснить?» | ___ you explain it? | Can | Are / Is |
| 9 | lesson-09:session:02:i14 | Выберите форму для they | They ___ stirring the batter. | are | am / is |
| 9 | lesson-09:session:09:i14 | Выберите форму отрицания с they | They ___ not looking. | are | am / is |
| 9 | lesson-09:session:14:i14 | Выберите форму для одной собаки | The dog ___ carrying a slipper. | is | am / are |
| 9 | lesson-09:session:16:i14 | Выберите форму действия после is not | The flash is not ___. | working | work / works |
| 9 | lesson-09:session:17:i14 | Начните вопрос об одной молнии | ___ the zipper working? | Is | Are / Am |
| 9 | lesson-09:session:18:i14 | Выберите форму для действия сейчас | I am ___. | shivering | shiver / shivers |
| 10 | lesson-10:session:03:i12 | Прогулка идёт сейчас. Выберите форму walk | We are ___ along the shore. | walking | walk / walks |
| 10 | lesson-10:session:07:i12 | Речь об одной сумке. Выберите форму belong | This bag ___ to me. | belongs | belong / belonging |
| 10 | lesson-10:session:11:i12 | Выберите форму leave после am | I am ___ a voicemail. | leaving | leave / leaves |
| 10 | lesson-10:session:14:i12 | Выберите форму wait после am | I am ___ at baggage claim. | waiting | wait / waits |
| 10 | lesson-10:session:20:i12 | Выберите форму have после do | Do you ___ the tracking number? | have | has / having |
| 10 | lesson-10:session:22:i12 | Выберите вспомогательный глагол для вопроса с you | ___ you recognize the accent? | Do | Does / Are |
| 11 | lesson-11:session:01:i12 | Вспомните, каким был этот дом в прошлом году | It ___ empty last year. | was | were / am |
| 11 | lesson-11:session:04:i12 | Расскажите о вчерашней занятости одного парикмахера | The hairdresser ___ busy yesterday. | was | were / are |
| 11 | lesson-11:session:06:i12 | Расскажите, как дети чувствовали себя в субботу | The children ___ happy on Saturday. | were | was / is |
| 11 | lesson-11:session:11:i12 | Друг спросил Were you in the waiting room? Ответьте за себя и сестру: нет | No, we ___. | weren't | wasn't / don't |
| 11 | lesson-11:session:12:i12 | Друг спросил Was the fried egg cold? Оно было горячим. Ответьте отрицательно | No, it ___. | wasn't | weren't / didn't |
| 11 | lesson-11:session:19:i12 | Рядом с дверью были три бумажных пакета. Выберите форму | There ___ three paper bags next to the door. | were | was / is |
| 12 | lesson-12:session:02:i12 | Вчера они проверили дорожный знак. Выберите форму | They ___ the road sign yesterday. | checked | check / checks |
| 12 | lesson-12:session:04:i12 | Вчера они передвинули садовый стул. Выберите форму | They ___ the garden chair yesterday. | moved | move / moves |
| 12 | lesson-12:session:09:i12 | Речь о прошлом. Выберите форму | They ___ a gift bag yesterday. | chose | choose / chooses |
| 12 | lesson-12:session:12:i12 | Речь о прошлом. Выберите форму | They ___ some soft cheese yesterday. | had | have / has |
| 12 | lesson-12:session:14:i12 | Речь о прошлом. Выберите форму | Someone ___ his coin purse yesterday. | stole | steal / steals |
| 12 | lesson-12:session:17:i12 | Речь о прошлом. Выберите форму | She ___ the boat trip yesterday. | enjoyed | enjoy / enjoys |
| 13 | lesson-13:session:22:i14 | Спросите, помог ли друг нести сумку. | Did he ___ you with the bag? | help | helped / helping |
| 13 | lesson-13:session:26:i12 | Вопрос о вчерашнем действии. Выберите начало | ___ you clean the curtain rail yesterday? | Did | Do / Does |
| 13 | lesson-13:session:28:i12 | Вопрос о вчерашнем действии. Выберите начало | ___ you miss the train yesterday? | Did | Do / Does |
| 13 | lesson-13:session:29:i12 | Вопрос о вчерашнем действии. Выберите начало | ___ you feel frightened last night? | Did | Do / Does |
| 13 | lesson-13:session:30:i12 | Вопрос о вчерашнем действии. Выберите начало | ___ you wait in the departure lounge yesterday? | Did | Do / Does |
| 13 | lesson-13:session:31:i11 | Спросите о вчерашней стирке. | ___ you wash the towels yesterday? | Did | Do / Does |
| 14 | lesson-14:session:09:i12 | Выберите форму для смысла: Я не играл на надувном замке | I ___ playing on the bouncy castle. | wasn’t | was / weren’t |
| 14 | lesson-14:session:26:i12 | В тот момент прошлого. Выберите was или were | We ___ looking for a bucket hat when you called. | were | was / are |
| 14 | lesson-14:session:27:i12 | В тот момент прошлого. Выберите was или were | We ___ walking towards the lighthouse when it started to rain. | were | was / are |
| 14 | lesson-14:session:29:i12 | В тот момент прошлого. Выберите was или were | We ___ cleaning a photo frame when you arrived. | were | was / are |
| 14 | lesson-14:session:33:i12 | В тот момент прошлого. Выберите was или were | She ___ bending down while I was holding her bag. | was | were / is |
| 14 | lesson-14:session:34:i12 | В тот момент прошлого. Выберите was или were | We ___ standing still while she was taking a photo. | were | was / are |
| 15 | lesson-15:session:01:i12 | План уже принят. Выберите am, is или are | We ___ going to alter the dress. | are | am / is |
| 15 | lesson-15:session:03:i12 | План уже принят. Выберите am, is или are | We ___ going to compost the leaves. | are | am / is |
| 15 | lesson-15:session:05:i12 | План уже принят. Выберите am, is или are | We ___ going to choose a room with a walk-in shower. | are | am / is |
| 15 | lesson-15:session:09:i12 | Прогноз по видимому признаку. Выберите is или are | The shelf ___ going to collapse. | is | are / am |
| 15 | lesson-15:session:10:i12 | Прогноз по видимому признаку. Выберите is или are | The biscuits ___ going to crumble. | are | is / am |
| 15 | lesson-15:session:12:i12 | Прогноз по видимому признаку. Выберите is или are | The boards ___ going to rot. | are | is / am |
| 16 | lesson-16:session:01:i12 | Дополните прогноз с will | I think the heatwave ___ tomorrow. | will end | will to end / will ends |
| 16 | lesson-16:session:02:i12 | Дополните прогноз с will | I think we ___ a chance to swim. | will have | will to have / will haves |
| 16 | lesson-16:session:03:i12 | Дополните прогноз с will | I think it ___ breezy on Sunday. | will be | will to be / will is |
| 16 | lesson-16:session:06:i12 | Дополните прогноз с will | I think the tickets ___ sold out by Friday. | will be | will to be / will is |
| 16 | lesson-16:session:07:i12 | Дополните прогноз с will | I think the surcharge ___ ten pounds. | will be | will to be / will is |
| 16 | lesson-16:session:08:i12 | Дополните прогноз с will | I think the meat ___ chewy. | will be | will to be / will is |
| 17 | lesson-17:session:01:i12 | Выберите форму для указанного количества или общего названия. | We need ___. | bedding | a bedding / beddings |
| 17 | lesson-17:session:07:i12 | Выберите форму для указанного количества или общего названия. | We need ___. | equipment | an equipment / equipments |
| 17 | lesson-17:session:08:i12 | Выберите форму для указанного количества или общего названия. | We can see ___. | damage | a damage / damages |
| 17 | lesson-17:session:09:i12 | Выберите слово количества: отдельные предметы или неисчисляемое название. | We don't have ___ semolina. | much | many / a much |
| 17 | lesson-17:session:11:i12 | Выберите many для отдельных предметов/людей или much для неисчисляемого. | There isn't ___ pollution here. | much | many / a much |
| 17 | lesson-17:session:13:i12 | Выберите many для отдельных предметов/людей или much для неисчисляемого. | We don't have ___ funding. | much | many / a much |
| 18 | lesson-18:session:01:i12 | Выберите сравнительную форму. | This living space is ___ than ours. | brighter | bright / more brighter |
| 18 | lesson-18:session:04:i12 | Выберите сравнительную форму. | The still water is ___ than the juice. | cheaper | cheap / more cheaper |
| 18 | lesson-18:session:10:i12 | Выберите значение «самый» в этой группе. | This repair shop is ___. | the oldest | oldest / the older |
| 18 | lesson-18:session:12:i12 | Выберите значение «самый» в этой группе. | The plain yoghurt is ___ option. | the cheapest | cheapest / the cheaper |
| 18 | lesson-18:session:17:i12 | Выразите одинаковое качество. | This green tea is ___ that one. | as cheap as | as cheaper as / as cheap than |
| 18 | lesson-18:session:18:i12 | Выразите одинаковое качество. | This cleaning spray is ___ that one. | as strong as | as stronger as / as strong than |
| 19 | lesson-19:session:01:i12 | Выберите форму после can. | We can ___ a meeting. | arrange | to arrange / arranges |
| 19 | lesson-19:session:06:i12 | Выберите форму после can. | Noise can ___ your sleep. | affect | to affect / affects |
| 19 | lesson-19:session:09:i12 | Выберите форму для умения в прошлом. | At twelve, we ___ travel independently. | could | could to / coulds |
| 19 | lesson-19:session:10:i12 | Выберите форму для умения в прошлом. | At ten, I ___ read a poem. | could | could to / coulds |
| 19 | lesson-19:session:17:i12 | Начните вежливый вопрос о разрешении. | ___ extend my stay? | May I | I may / May I to |
| 19 | lesson-19:session:18:i12 | Начните вежливый вопрос о разрешении. | ___ use the remote control? | May I | I may / May I to |
| 20 | lesson-20:session:01:i12 | Дополните фразу о необходимости. | She ___ show identification. | must | musts / must to |
| 20 | lesson-20:session:07:i12 | Дополните фразу о необходимости. | We ___ turn back now. | must | musts / must to |
| 20 | lesson-20:session:09:i12 | Дополните фразу о необходимости. | We ___ call the applicant. | have to | has to / have |
| 20 | lesson-20:session:10:i12 | Дополните фразу о необходимости. | He ___ travel overseas. | has to | have to / has |
| 20 | lesson-20:session:13:i12 | Дополните фразу о необходимости. | He ___ bring this document. | has to | have to / has |
| 20 | lesson-20:session:17:i12 | Дополните совет. | She ___ unwind after work. | should | shoulds / should to |
| 21 | lesson-21:session:04:i12 | Поставьте действие после avoid. | I avoid ___ a fuss. | making | make / to make |
| 21 | lesson-21:session:05:i12 | Поставьте действие после mind. | I do not mind ___ again after an interruption. | starting | start / to start |
| 21 | lesson-21:session:07:i12 | Дополните фразу о приятном занятии. | I enjoy ___ a documentary about nature. | watching | watch / to watch |
| 21 | lesson-21:session:11:i12 | Выберите правильную форму с to. | I hope ___ a good time. | to have | to having / to has |
| 21 | lesson-21:session:12:i12 | Выберите правильную форму с to. | I intend ___ without a car. | to go | to going / to goes |
| 21 | lesson-21:session:21:i12 | Выберите правильную форму с to. | I want ___ a message. | to leave | to leaving / to leaves |
| 22 | lesson-22:session:01:i12 | Выберите местоимение для этой фразы. | I do not want to disappoint ___. | you | your / yours |
| 22 | lesson-22:session:03:i12 | Выберите местоимение для этой фразы. | I admire ___. | them | they / their |
| 22 | lesson-22:session:09:i12 | Выберите местоимение для этой фразы. | This rain jacket is ___. | ours | our / us |
| 22 | lesson-22:session:10:i12 | Выберите местоимение для этой фразы. | This yoga mat is ___. | hers | her / she |
| 22 | lesson-22:session:14:i12 | Выберите форму глагола. | Could I ___ separately? | pay | pays / paying |
| 22 | lesson-22:session:17:i12 | Выберите местоимение для этой фразы. | You should not blame ___. | yourself | you / your |
