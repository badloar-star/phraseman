# U10 «Один подходящий ответ» — отчёт (11.11.2026)

Пакет задачи: `docs/work/tasks/u10-one-fitting-answer-2026-11-11.md`.
Коммиты: `2e887c350` (зачёт урока), `2ca604a70` (правила пропуска), `a2c5f76dc` (входной тест),
`ceab48a24` (указательные + сторож выдачи); подключение правил к отбору заданий — в `e290a4dd5`.

## Откуда взялись примеры владельца

«Are you ___?» (free / okay / tired) и «We buy ___» (food / coffee) — задания экзамена уровня. Он не хранит
готовые задания, а собирает их из фраз курса: брал слово фразы, его соблазны и добирал «словами того же
класса». Для смысловых слов это по построению даёт несколько верных вариантов. Из 1600 фраз экзамен мог
собрать 1535 заданий с пропуском; почти все выше первого уровня были неоднозначны
(«___ cooked dinner yesterday» → She / He / I / You).

Теперь пропуск выдаётся только там, где единственность доказывает правило грамматики
(`app/level_exam_gap_rules.ts`), а соблазны строятся этим же правилом.

| Уровень | Было заданий с пропуском | Стало | Какие правила |
|---|---|---|---|
| A1 (уроки 1–8) | 338 | 372 | am/is/are, do/does, have/has, окончание -s, in/on/at, How much |
| A2 (уроки 9–18) | 500 | 164 | a/an, am/is/are, do/does, in/on/at, окончание -s |
| B1 (уроки 19–28) | 500 | 171 | have/has, was/were, a/an, do/does, in/on/at, местоимение |
| B2 (уроки 29–32) | 197 | 73 | am/is/are, a/an, in/on/at, was/were, have/has |

Эталон «They walk ___ the evening» → in (on / at / to) сохранён без изменений.

## Зачёт урока (`app/exam.tsx`, английский банк) — 66 исправленных из 191

| Урок | Было | Стало |
|---|---|---|
| L1 | Correct: He [are] a doctor. → **is** / are / am / was | Correct: He [are] a doctor. → **is** / are / am / be |
| L3 | He ___ every day. → **works** / work / worked / working | He ___ every day. → **works** / work / to work / working |
| L3 | She ___ English. → **speaks** / speak / spoke / speaking | She ___ English. → **speaks** / speak / to speak / speaking |
| L3 | They ___ in London. → **live** / lives / lived / living | They ___ in London. → **live** / lives / to live / living |
| L4 | She ___ not understand. → **does** / do / did / doing | She ___ not understand. → **does** / do / is / doing |
| L4 | He ___ not smoke. → **does** / do / did / doing | He ___ not smoke. → **does** / do / is / doing |
| L4 | They ___ not know the answer. → **do** / does / did / doing | They ___ not know the answer. → **do** / does / are / doing |
| L4 | Correct: He [don't] understand. → **doesn't** / don't / didn't / doesn't not | Correct: He [don't] understand. → **doesn't** / don't / isn't / doesn't not |
| L5 | ___ you speak English? → **Do** / Does / Did / Are | ___ you speak English? → **Do** / Does / Is / Are |
| L5 | ___ she like music? → **Does** / Do / Did / Is | ___ she like music? → **Does** / Do / Are / Is |
| L5 | ___ they play football? → **Do** / Does / Did / Are | ___ they play football? → **Do** / Does / Is / Are |
| L6 | ___ are you? → **How** / Where / What / Who | ___ is your name? → **What** / Where / How / Who |
| L7 | I ___ a car. → **have** / has / had / having | I ___ a car. → **have** / has / haves / having |
| L7 | She ___ two children. → **has** / have / had / having | She ___ two children. → **has** / have / haves / having |
| L7 | Correct: He [have] a new car. → **has** / have / had / having | Correct: He [have] a new car. → **has** / have / haves / having |
| L8 | I wake up ___ 7 o'clock. → **at** / in / on / by | I wake up ___ 7 o'clock. → **at** / in / on / to |
| L8 | She was born ___ Monday. → **on** / in / at / by | She was born ___ Monday. → **on** / in / at / to |
| L8 | He was born ___ 1990. → **in** / on / at / by | He was born ___ 1990. → **in** / on / at / to |
| L8 | Correct: I study [on] the morning. → **in** / on / at / by | Correct: I study [on] the morning. → **in** / on / at / to |
| L10 | You ___ speak louder. → **should** / can / could / must | You ___ speak louder. → **should** / shoulds / should to / are should |
| L10 | She ___ swim very well. → **can** / should / must / shall | She ___ swim very well. → **can** / cans / can to / is can |
| L12 | They ___ a lot of money. → **spent** / spend / spends / spending | They ___ a lot of money last month. → **spent** / spend / spends / spending |
| L11 | Correct: She [sended] a letter. → **sent** / sended / send / sends | Correct: She [sended] a letter. → **sent** / sended / send / sending |
| L12 | Correct: She [goed] to school. → **went** / goed / goes / go | Correct: She [goed] to school. → **went** / goed / going / go |
| L13 | She ___ come tomorrow. → **will** / would / is going / shall be | She ___ come tomorrow. → **will** / wills / is going / shall be |
| L13 | I ___ not be late. → **will** / shall / would / am | I ___ not be late. → **will** / wills / am will / am |
| L13 | It ___ rain tomorrow. → **will** / would / shall / is | It ___ rain tomorrow. → **will** / wills / are / is |
| L16 | Please ___ the light. → **turn on** / turn up / turn in / turn out | Please ___ the light. → **turn on** / turn at / turn in / turn for |
| L16 | Correct: He [look after] his parents. → **looks after** / look after / looked up / looked on | Correct: He [look after] his parents. → **looks after** / look after / looking after / look afters |
| L19 | The cat is ___ the table. → **on** / in / under / between | The cat is ___ the table. → **on** / in / of / between |
| L19 | The book is ___ the bag. → **in** / on / at / between | The book is ___ the bag. → **in** / of / at / between |
| L19 | She lives ___ London. → **in** / on / at / by | She lives ___ London. → **in** / on / at / to |
| L19 | Which sentence is correct? → **The cat is on the table.** / The cat is in the table. / The cat is at the table. / The cat is by table top. | Which sentence is correct? → **The cat is on the table.** / The cat is in the table. / The cat is between the table. / The cat is by table top. |
| L19 | Correct: She lives [in] First Street. → **on** / in / at / by | Correct: The keys are [on] my pocket. → **in** / on / at / between |
| L20 | She is ___ doctor. → **a** / an / the / — | She is ___ doctor. → **a** / an / two / — |
| L20 | I am ___ engineer. → **an** / a / the / — | I am ___ engineer. → **an** / a / two / — |
| L20 | Correct: I am [an] student. → **a** / an / the / — | Correct: I am [an] student. → **a** / an / two / — |
| L21 | Is there ___ who can help me? → **anyone** / somewhere / no one / everyone | Is there ___ who can help me? → **anyone** / somewhere / anywhere / everyone |
| L23 | The letter ___ by her. → **was written** / wrote / is written / had written | The letter ___ by her yesterday. → **was written** / wrote / is written / had written |
| L23 | Cars ___ made in factories. → **are** / is / am / were | Cars ___ made in factories. → **are** / is / am / be |
| L24 | I ___ never been to Paris. → **have** / has / had / was | I ___ never been to Paris. → **have** / has / am / was |
| L24 | She ___ just finished. → **has** / have / had / is | She ___ just finished. → **has** / have / having / are |
| L24 | Correct: She [have] just arrived. → **has** / have / had / is | Correct: She [have] just arrived. → **has** / have / having / are |
| L25 | She ___ when I called. → **was sleeping** / sleep / slept / has slept | She ___ when I called. → **was sleeping** / sleep / were sleeping / has slept |
| L25 | They ___ TV at 8 pm. → **were watching** / watch / watched / have watched | They ___ TV at 8 pm yesterday. → **were watching** / watch / was watching / have watched |
| L25 | I ___ when the phone rang. → **was working** / work / worked / am working | I ___ when the phone rang. → **was working** / work / were working / am working |
| L25 | Correct: They [was] watching TV. → **were** / was / are / is | Correct: They [was] watching TV yesterday. → **were** / was / are / is |
| L26 | If it rains, I ___ stay home. → **will** / would / shall / should | If it rains, I ___ stay home. → **will** / would have / am / was |
| L26 | If I ___ rich, I would travel. → **were** / am / was / be | If I ___ rich, I would travel. → **were** / am / is / be |
| L27 | He said he ___ tired. → **was** / is / were / be | He said he ___ tired. → **was** / am / were / be |
| L27 | She told me she ___ leave. → **would** / will / shall / should | She told me she ___ leave. → **would** / wills / would to / woulds |
| L27 | He asked where I ___. → **lived** / live / living / lives | He asked where I ___. → **lived** / am live / living / lives |
| L27 | Which sentence is correct? → **She told me she would leave.** / He said he is tired. / He asked where I live. / She said she will come. | Which sentence is correct? → **She told me she would leave.** / He said he are tired. / He asked where do I lived. / She said she wills come. |
| L27 | Correct: She said she [will] go. → **would** / will / shall / should | Correct: She said she [will] go. → **would** / will / woulds / would to |
| L32 | She ___ not have come so early. → **should** / shall / would / will | She ___ not have come so early. → **should** / shoulds / should to / is |
| L32 | By the time she arrived, he ___. → **had left** / left / has left / was leaving | By the time she arrived, he ___. → **had left** / leave / has left / is leaving |
| L3 | The sun ___ in the east. → **rises** / rise / rose / rising | The sun ___ in the east. → **rises** / rise / to rise / rising |
| L4 | I ___ not like horror movies. → **do** / does / did / don't | I ___ not like horror movies. → **do** / does / am / don't |
| L6 | ___ do you get to work? → **How** / What / When / Why | ___ do you get to work — by bus or by car? → **How** / What / When / Why |
| L8 | See you ___ Friday. → **on** / in / at / by | See you ___ Friday. → **on** / in / at / to |
| L10 | It ___ rain later; take an umbrella. → **may** / can / should / ought | It ___ rain later; take an umbrella. → **may** / mays / is / ought |
| L20 | I need ___ hour to finish. → **an** / a / the / — | I need ___ hour to finish. → **an** / a / two / — |
| L21 | Do you have ___ friends here? → **any** / some / no / every | I don't have ___ friends here. → **any** / some / no / every |
| L25 | While I ___, the lights went out. → **was cooking** / cook / cooked / am cooking | While I ___, the lights went out. → **was cooking** / cook / were cooking / am cooking |
| L26 | If you heat ice, it ___. → **melts** / melted / will melt / is melting | If you heat ice, it ___. → **melts** / melted / melt / melting |
| L27 | She said that she ___. → **was tired** / is tired / be tired / tired | She said that she ___. → **was tired** / are tired / be tired / tired |
## Входной тест (`app/diagnostic_test.tsx`) — 75 исправленных из 201

Тексты фраз не менялись (от них зависят идентификаторы вопросов), заменены только неверные варианты.

| Уровень | Было | Стало (варианты) |
|---|---|---|
| A1 | I am ___ engineer. → **an** / a / the / — | **an** / a / two / — |
| A1 | She is ___ teacher. → **a** / an / the / — | **a** / an / two / — |
| A1 | ___ name is Anna. → **Her** / She / His / Him | **Her** / She / Hers / Him |
| A1 | ___ books are on the table. → **These** / This / That / Those | **These** / This / That / It |
| A1 | I need ___ hour to sleep. → **an** / a / the / — | **an** / a / two / — |
| A1 | I have ___ old cat. → **an** / a / the / — | **an** / a / two / — |
| A2 | She ___ every day. → **works** / work / worked / working | **works** / work / to work / working |
| A2 | They ___ not understand. → **do** / does / did / doing | **do** / does / are / doing |
| A2 | He ___ football. → **plays** / play / played / playing | **plays** / play / to play / playing |
| A2 | I ___ to school. → **go** / goes / went / going | **go** / goes / gone / going |
| A2 | She ___ English. → **speaks** / speak / spoke / speaking | **speaks** / speak / to speak / speaking |
| A2 | We ___ not know. → **do** / does / did / doing | **do** / does / are / doing |
| A2 | He ___ not smoke. → **does** / do / did / doing | **does** / do / is / doing |
| A2 | They ___ in London. → **live** / lives / lived / living | **live** / lives / to live / living |
| A2 | She ___ a new car. → **has** / have / had / having | **has** / have / haves / having |
| A2 | I ___ two brothers. → **have** / has / had / having | **have** / has / haves / having |
| A2 | I wake up ___ 7 o'clock. → **at** / in / on / by | **at** / in / on / to |
| A2 | She was born ___ Monday. → **on** / in / at / by | **on** / in / at / to |
| A2 | He lives ___ London. → **in** / on / at / by | **in** / on / at / to |
| A2 | She ___ come tomorrow. → **will** / would / shall / is | **will** / wills / are / is |
| A2 | It ___ rain tomorrow. → **will** / would / is going to / shall | **will** / wills / are / is |
| A2 | Hurry! The train ___! → **is leaving** / leave / leaves / left | **is leaving** / leave / are leaving / leaving |
| A2 | I usually ___ to work by bus. → **go** / goes / went / going | **go** / goes / gone / going |
| A2 | It often ___ in London. → **rains** / rain / rained / raining | **rains** / rain / to rain / raining |
| A2 | We look ___ the teacher in class. → **at** / on / in / to | **at** / of / in / by |
| A2 | She is very kind ___ me. → **to** / for / with / of | **to** / for / at / of |
| A2 | I want ___ coffee, please. → **some** / any / a / an | **some** / any / many / an |
| A2 | It was cold, so I ___ a coat. → **put on** / took off / bought / lost | **put on** / took off / put in / put at |
| A2 | The train ___ at 5 p.m. every day. → **leaves** / leave / is leaving / left | **leaves** / leave / is leaving / leaving |
| A2 | I don't drink milk. I don't like ___. → **it** / this / that / them | **it** / they / he / them |
| A2 | The shop ___ at 6 p.m. on Sundays. → **closes** / close / is closing / is closed | **closes** / close / is closing / closing |
| B1 | We ___ speak tomorrow. → **will** / would / shall / should | **will** / wills / are / did |
| B1 | She ___ when I called. → **was sleeping** / sleep / slept / had slept | **was sleeping** / sleep / were sleeping / is sleep |
| B1 | They ___ a lot of money. → **spent** / spend / spends / spending | **spent** / spended / spends / spending |
| B1 | They ___ already left. → **have** / has / had / did | **have** / has / is / did |
| B1 | I ___ never been to Paris. → **have** / has / had / was | **have** / has / am / was |
| B1 | She ___ just finished. → **has** / have / had / is | **has** / have / having / are |
| B1 | The book ___ written by him. → **was** / were / is / be | **was** / were / am / be |
| B1 | Cars ___ made in factories. → **are** / is / am / were | **are** / is / am / be |
| B1 | You ___ wear a seatbelt. → **should** / can / would / might | **should** / shoulds / should to / are should |
| B1 | She ___ speak three languages. → **can** / should / must / shall | **can** / cans / can to / is can |
| B1 | You ___ eat less sugar. → **should** / can / could / would | **should** / shoulds / should to / are should |
| B1 | She ___ wait for you. → **will** / would / shall / is | **will** / wills / are / is |
| B1 | I ___ not do this. → **should** / shall / would / will | **should** / shoulds / should to / am should |
| B1 | He ___ have helped. → **could** / can / would / shall | **could** / coulds / could to / is could |
| B1 | If it rains, I ___ stay home. → **will** / would / shall / should | **will** / would have / am / was |
| B1 | If you work hard, you ___ succeed. → **will** / would / shall / should | **will** / would have / are / were |
| B1 | Have you ___ read this book? → **ever** / never / always / yet | **ever** / ago / since / very |
| B1 | You look tired. You ___ to bed early. → **should go** / go / went / are going | **should go** / should to go / should going / should went |
| B1 | He asked what time the train ___. → **leaves** / left / is leaving / has left | **leaves** / leave / leaving / to leave |
| B1 | If I ___ you, I would not say that. → **were** / am / am not / was | **were** / am / am not / is |
| B2 | It ___ already done. → **has been** / was / been / had | **has been** / have been / been / had |
| B2 | I should ___ earlier. → **have come** / come / came / had come | **have come** / has come / came / had come |
| B2 | The new law ___ passed last year. → **was** / were / has been / had been | **was** / were / has been / is |
| B2 | English ___ spoken worldwide. → **is** / are / was / were | **is** / are / am / were |
| B2 | He said he ___ tired. → **was** / is / were / be | **was** / am / were / be |
| B2 | She told me she ___ leave. → **would** / will / shall / should | **would** / wills / would to / woulds |
| B2 | He asked where I ___. → **lived** / live / living / lives | **lived** / am live / living / lives |
| B2 | If I ___ rich, I would travel. → **were** / am / was / be | **were** / am / is / be |
| B2 | She would help if she ___. → **knew** / can / could / had | **knew** / can / know / knows |
| B2 | They ___ each other for years. → **have known** / know / knew / known | **have known** / know / knows / known |
| B2 | Not only was the food cold, but the service was also ___. → **poor** / slow / very expensive / rude | **poor** / slowly / expensively / rudely |
| B2 | No sooner had we arrived than it ___. → **began to rain** / began / had begun / rains | **began to rain** / begin to rain / had begun / rains |
| B2 | In five years, this area ___ a new business district. → **will have become** / will be / is / has become | **will have become** / will became / is became / has become |
| B2 | So confusing was the sign that I ___ the wrong way. → **drove** / drives / was driving / was driven | **drove** / drives / driven / was driven |
| B2 | I suggest that he ___ a professional. → **see** / saw / saw a doctor / sees | **see** / saw / to see / seeing |
| B2 | The children might ___ lost in the crowd. → **have been** / be / get / have got | **have been** / been / being / has been |
| C1 | By the time she arrived, he ___ everything. → **had finished** / finish / has finished / was finishing | **had finished** / finish / has finished / is finishing |
| C1 | She ___ have been waiting for hours. → **must** / can / shall / will | **must** / can / musts / must to |
| C1 | Not only ___ she sing, she also dances. → **does** / can / is / has | **does** / do / is / has |
| C1 | ___ had I left when it started raining. → **Hardly** / Barely / No sooner / Scarcely | **Hardly** / Hard / No sooner / Hardest |
| A1 | I have ___ umbrella in my bag. → **an** / a / the / - | **an** / a / two / - |
| A2 | She usually drinks coffee, but today she ___ tea. → **is drinking** / drinks / drink / drank | **is drinking** / are drinking / drink / drinking |
| B1 | If it rains tomorrow, we ___ at home. → **will stay** / stay / stayed / would stay | **will stay** / staying / stayed / would stay |
| B2 | By the time we arrived, the film ___. → **had started** / started / has started / was starting | **had started** / start / has started / is starting |

## Сколько проверено

- экзамен уровня: 1600 фраз → 1535 возможных заданий с пропуском до правки; 780 после — просмотрены все;
- зачёт урока, английский банк: 191 задание — просмотрены все, исправлено 66;
- входной тест: 201 задание — просмотрены все, исправлено 75.

Итого просмотрено 1927 заданий до правки и 780 новых заданий экзамена уровня после.

## Требует решения владельца

1. Экзамен уровня берёт фразы СТАРОГО английского курса, а в уроках уже идёт классический курс. Ученик на
   экзамене видит фразы, которых в его уроках нет. Переводить ли экзамен на фразы классического курса?
2. Плитки уроков классических курсов (EN/ES/FR/DE/IT, 8000 фраз) в этой задаче не пересматривались: там ученик
   собирает фразу по показанному переводу, и «подходит ли другое слово» проверяет отдельный аудит Ревизора.
   Пример того же класса: «I work ___» с вариантами nearby / here / slowly — по переводу верен один, но без
   перевода подходят все. Считать ли это нарушением правила U10?
3. Зачёт урока для ES/DE/IT/FR (`app/classic_final_exam_bank.ts`, появился 11.11 в соседней сессии) собирает
   пропуски из тех же плиток и показывает перевод целой фразы. К нему применим тот же вопрос, что в пункте 2.
4. Старый экран экзамена уровня (`app/level_exam.tsx`, 96 заданий) английскому ученику не показывается — его
   заменил новый экзамен. Задания не правились. Удалить банк или оставить?
5. В зачёте урока и входном тесте лишние верные варианты заменены заведомо неверными формами («wills»,
   «should to», «haves»). Это однозначно, но выглядит менее «естественно», чем прежние варианты. Если
   владелец предпочитает другой способ (контекст в предложении вместо неверных форм) — нужен знак.

## Озвучка

Перегенерировать нечего: ни у экзамена уровня, ни у зачёта урока, ни у входного теста нет записанных
аудиофайлов. Тексты фраз курса не менялись.

---

# Часть 2 (ответ владельца «Да, проверить»): плитки уроков и зачёты ES/DE/IT/FR

Коммит: `b758456ce`. Пакет: `docs/work/tasks/u10-classic-tiles-one-fitting-answer-2026-11-11.md`.
Скрипт и решения: `scripts/u10_apply_tile_distractor_fixes.cjs`, `docs/work/u10_tiles_2026_11_11/decisions_<язык>.json`.

## Сколько проверено

| Курс | Фраз | Плиток | Подстановок | Различных пар «верное → соблазн» | Пар-кандидатов | Исправлено плиток |
|---|---|---|---|---|---|---|
| EN | 1600 | 9 276 | 46 380 | 11 599 | 243 | 50 |
| ES | 1600 | 7 821 | 39 105 | 9 616 | 140 | 1 |
| FR | 1600 | 8 761 | 43 805 | 13 094 | 204 | 76 |
| DE | 1600 | 8 907 | 44 535 | 13 094 | 305 | 47 |
| IT | 1600 | 7 851 | 39 255 | 13 276 | 163 | 45 |
| Всего | 8000 | 42 616 | 213 080 | 60 679 | 1 055 | 219 |

Как проверялось: все 60 679 различных пар просмотрены целиком (по одному полному проходу на язык, словарь пар делился на две половины);
каждая пара-кандидат выведена во ВСЕ свои фразы с подстановкой и переводом, решение принималось по подстановке.
Зачёт урока ES/DE/IT/FR (`app/classic_final_exam_bank.ts`) своего контента не имеет — он берёт пропуск и варианты из
этих же плиток, поэтому исправлен тем же коммитом; сам файл не менялся (чужих незакоммиченных правок в нём не было).

## Граница: «грамматично, но перевод отсекает» — НЕ правилось

Пары-кандидаты встречаются в 15 792 местах; исправлено 219, остальные ~15,5 тыс. — либо неграмматичны (род, число,
лицо), либо грамматичны, но показанный перевод их однозначно исключает. Крупнейшие группы второй категории:

| Группа | Мест | Пример | Почему не правилось |
|---|---|---|---|
| EN the → this / that | 1 764 | «[This] door is open» при переводе «Дверь открыта» | в переводе нет «эта» |
| EN a / an → this / that / each / every | ~570 | «We share [this] kitchen» — «Мы делим кухню» | в переводе нет «эту» |
| EN this → the / a | 107 | «I like [the] seat» — «Мне нравится это место» | в переводе есть «это» |
| EN if → when | 61 | «[When] it rains we will stay inside» — «Если пойдёт дождь…» | «если» ≠ «когда» |
| EN here → nearby, nearby → here | 53 | «I work [here]» — «Я работаю неподалеку» | пример владельца: по переводу верен один |
| FR le / la / les → ce / cette / ces | ~350 | «[Cette] fenêtre est ouverte» — «Окно открыто» | в переводе нет «это» |
| FR voudrais ↔ veux | 19 | «Je [veux] du riz» — «Я бы хотел риса» | «хочу» ≠ «хотел бы» |
| ES el / la → este / ese / esta | ~170 | «[Este] móvil está en el coche» — «Телефон в машине» | в переводе нет «этот» |
| ES ayer ↔ anoche | 43 | «Llamé a Ana [anoche]» — «Я вчера позвонил Ане» | «вчера» ≠ «вчера вечером» |
| DE als → wenn | 42 | «[Wenn] ich ankam, war die Tür offen» | для одного события в прошлом нужен als |
| IT dei / delle → molte и т. п. | — | «ci sono [molte] pile» — «лежат батарейки» | «много» в переводе нет |

Решение за владельцем: если и эту категорию считать нарушением, придётся менять сам принцип соблазнов
(сейчас соблазн — слово той же части речи; тогда нужны слова другой части речи или заведомо неверные формы).

## Спорные случаи (исправлены «в пользу ученика», но граница тонкая)

- EN `must ↔ should` («должны» / «следует»), `bought → got`, `carry → take`, `evening → night`;
- FR `acheté → pris` (в магазине «взял» = «купил»), `à → dans` перед местом — снято во всех 63 фразах с «à la / à l’»,
  включая «à la maison», где «dans la maison» значит скорее «в доме»;
- DE `passt → funktioniert`, `stimmt → passt`, `schön → gut`;
- IT `dei / delle → alcuni / alcune`, `ricevuto → preso`.

Оставлены без правки, но близки к границе: EN `could → might` («мог бы»), `put → leave`, `chair → seat`;
FR `pourrait → peut`; DE `sollen → müssen`; IT `vorrebbe → vuole`.

## Что ещё видно

- Несколько замен получились неуклюжими, потому что замена обязана быть уже пройденным словом из соблазнов того же
  верного слова: FR «Nous aimerions [à] prolonger…», FR «à l’arrêt [chambre] bus», EN «before → how». Они заведомо
  неверны, но выглядят случайными — можно подобрать вручную.
- `tests/classic_glossary_lesson_integrity.test.ts` (незакоммиченный тест соседней сессии про словарь) красный для
  es/de/it — к плиткам не относится, словари правит другая сессия.

## Озвучка

Перегенерировать нечего: у классических курсов записанной озвучки нет (системный TTS), тексты фраз не менялись.

## Таблица «курс / урок → было → стало» (219 плиток)

| Курс | Урок | Фраза — перевод | Было | Стало | Почему |
|---|---|---|---|---|---|
| en | 04 | This machine does not accept coins. — Этот автомат не принимает монеты. | **accept** / ~~take~~ | **accept** / meet | machine does not take coins — обычная фраза |
| en | 08 | She studies in the evening. — Она учится вечером. | **evening** / ~~night~~ | **evening** / midnight | Friday night / that night = «в пятницу вечером», «в тот вечер» |
| en | 08 | The last class is on Friday evening. — Последнее занятие в пятницу вечером. | **evening** / ~~night~~ | **evening** / midnight | Friday night / that night = «в пятницу вечером», «в тот вечер» |
| en | 08 | We take a break in the evening. — Мы делаем перерыв вечером. | **evening** / ~~night~~ | **evening** / noon | Friday night / that night = «в пятницу вечером», «в тот вечер» |
| en | 10 | You should keep the receipt. — Вам следует сохранить чек. | **should** / ~~must~~ | **should** / is | must — тоже «следует/должен» |
| en | 10 | He should get some rest. — Ему стоит отдохнуть. | **get** / ~~take~~ | **get** / wait | take some rest — тоже «отдохнуть» |
| en | 10 | He should get some rest. — Ему стоит отдохнуть. | **some** / ~~a~~ | **some** / many | get a rest — та же фраза по-русски |
| en | 10 | She should call the office. — Ей следует позвонить в офис. | **should** / ~~must~~ | **should** / is | must — тоже «следует/должен» |
| en | 10 | You must wear a helmet. — Вы должны надеть шлем. | **must** / ~~should~~ | **must** / is | should wear — тоже «должны надеть» |
| en | 12 | They bought the last two tickets. — Они купили последние два билета. | **bought** / ~~got~~ | **bought** / fell | got = купил в разговорной речи |
| en | 12 | She brought a spare key. — Она принесла запасной ключ. | **brought** / ~~got~~ | **brought** / told | I got you a towel = «принёс тебе полотенце» |
| en | 12 | I brought you a towel. — Я принес тебе полотенце. | **brought** / ~~got~~ | **brought** / think | I got you a towel = «принёс тебе полотенце» |
| en | 12 | I forgot my password. — Я забыл свой пароль. | **forgot** / ~~left~~ | **forgot** / opened | left their bags = «забыли сумки» |
| en | 12 | Did they catch the bus? — Они успели на автобус? | **catch** / ~~take~~ | **catch** / open | take the bus — тоже «сядем на автобус» |
| en | 12 | Who did you meet at the station? — Кого ты встретил на вокзале? | **at** / ~~in~~ | **at** / before | in the station / in the harbour / in the cinema — тот же перевод |
| en | 13 | I will carry the heavy box. — Я понесу тяжелую коробку. | **carry** / ~~take~~ | **carry** / stop | take the box — «понесу/донести» так же естественно |
| en | 15 | We brought our own cups. — Мы принесли свои чашки. | **brought** / ~~got~~ | **brought** / need | I got you a towel = «принёс тебе полотенце» |
| en | 15 | They forgot their own bags. — Они забыли свои сумки. | **forgot** / ~~left~~ | **forgot** / found | left their bags = «забыли сумки» |
| en | 16 | She gets up before six. — Она встает до шести. | **before** / ~~by~~ | **before** / how | by six / by lunch — тоже «до шести», «до обеда» |
| en | 16 | We set off for the harbour before lunch. — Мы отправились в порт до обеда. | **before** / ~~by~~ | **before** / how | by six / by lunch — тоже «до шести», «до обеда» |
| en | 16 | We set off for the harbour before lunch. — Мы отправились в порт до обеда. | **for** / ~~by~~ | **for** / after | то же слово снято в соседней плитке этой фразы |
| en | 20 | We bought an umbrella. — Мы купили зонт. | **bought** / ~~got~~ | **bought** / fell | got = купил в разговорной речи |
| en | 20 | I bought a lamp. The lamp is broken. — Я купил лампу. Лампа сломана. | **bought** / ~~got~~ | **bought** / fell | got = купил в разговорной речи |
| en | 20 | She bought an alarm clock. The clock is loud. — Она купила будильник. Часы громкие. | **bought** / ~~got~~ | **bought** / need | got = купил в разговорной речи |
| en | 21 | Do you need anything else? — Вам что-нибудь еще нужно? | **anything** / ~~something~~ | **anything** / everyone | Do you need something else? — тот же перевод «что-нибудь» |
| en | 21 | Is anything missing? — Что-нибудь пропало? | **anything** / ~~something~~ | **anything** / nothing | Do you need something else? — тот же перевод «что-нибудь» |
| en | 21 | Have you got anything smaller? — У вас есть что-нибудь поменьше? | **anything** / ~~something~~ | **anything** / everyone | Do you need something else? — тот же перевод «что-нибудь» |
| en | 21 | She did not buy anything today. — Она сегодня ничего не купила. | **anything** / ~~something~~ | **anything** / nothing | Do you need something else? — тот же перевод «что-нибудь» |
| en | 22 | They complained about waiting in the rain. — Они жаловались на ожидание под дождем. | **about** / ~~of~~ | **about** / under | complained of / told you of — допустимо |
| en | 22 | They complained about waiting in the rain. — Они жаловались на ожидание под дождем. | **in** / ~~of~~ | **in** / before | то же слово снято в соседней плитке этой фразы |
| en | 22 | We stopped to buy water, then carried on walking. — Мы остановились, чтобы купить воды, а затем продолжили идти. | **buy** / ~~get~~ | **buy** / work | get water / get tickets = купить |
| en | 25 | The lights were not working that evening. — В тот вечер не работал свет. | **evening** / ~~night~~ | **evening** / morning | Friday night / that night = «в пятницу вечером», «в тот вечер» |
| en | 26 | If we leave now, we will catch the bus. — Если мы сейчас уйдем, мы сядем на автобус. | **catch** / ~~take~~ | **catch** / check | take the bus — тоже «сядем на автобус» |
| en | 26 | If we leave now, we will catch the bus. — Если мы сейчас уйдем, мы сядем на автобус. | **leave** / ~~take~~ | **leave** / need | то же слово снято в соседней плитке этой фразы |
| en | 27 | They said they might be late. — Они сказали, что могут опоздать. | **might** / ~~can~~ | **might** / were | they can be late — тоже «могут опоздать» |
| en | 28 | She poured herself some water. — Она налила себе воды. | **some** / ~~a~~ | **some** / each | get a rest — та же фраза по-русски |
| en | 28 | They helped each other carry the boxes. — Они помогали друг другу нести коробки. | **carry** / ~~take~~ | **carry** / keep | take the box — «понесу/донести» так же естественно |
| en | 28 | They helped each other carry the boxes. — Они помогали друг другу нести коробки. | **helped** / ~~take~~ | **helped** / need | то же слово снято в соседней плитке этой фразы |
| en | 29 | Where did you use to buy your tickets? — Где вы раньше покупали билеты? | **buy** / ~~get~~ | **buy** / work | get water / get tickets = купить |
| en | 29 | Was this the shop you used to visit? — Это был тот магазин, в который вы раньше ходили? | **the** / ~~that~~ | **the** / no | перевод «тот магазин», «то письмо» — that подходит |
| en | 30 | The bike that he bought needs new tyres. — Велосипеду, который он купил, нужны новые шины. | **bought** / ~~got~~ | **bought** / need | got = купил в разговорной речи |
| en | 30 | Is this the letter you were waiting for? — Это то письмо, которое вы ждали? | **the** / ~~that~~ | **the** / no | перевод «тот магазин», «то письмо» — that подходит |
| en | 32 | The niece I told you about is waiting at the harbour. — Племянница, о которой я вам рассказывал, ждет в порту. | **about** / ~~of~~ | **about** / under | complained of / told you of — допустимо |
| en | 32 | The niece I told you about is waiting at the harbour. — Племянница, о которой я вам рассказывал, ждет в порту. | **at** / ~~in~~ | **at** / before | in the station / in the harbour / in the cinema — тот же перевод |
| en | 32 | The niece I told you about is waiting at the harbour. — Племянница, о которой я вам рассказывал, ждет в порту. | **about** / ~~in~~ | **about** / with | то же слово снято в соседней плитке этой фразы |
| en | 32 | The niece I told you about is waiting at the harbour. — Племянница, о которой я вам рассказывал, ждет в порту. | **at** / ~~of~~ | **at** / with | то же слово снято в соседней плитке этой фразы |
| en | 32 | We helped each other carry the suitcases. — Мы помогли друг другу донести чемоданы. | **carry** / ~~take~~ | **carry** / check | take the box — «понесу/донести» так же естественно |
| en | 32 | We helped each other carry the suitcases. — Мы помогли друг другу донести чемоданы. | **helped** / ~~take~~ | **helped** / heard | то же слово снято в соседней плитке этой фразы |
| en | 32 | We can avoid the queue at the cinema by booking online. — Мы можем избежать очереди в кинотеатр, забронировав билеты онлайн. | **at** / ~~in~~ | **at** / after | in the station / in the harbour / in the cinema — тот же перевод |
| en | 32 | We can avoid the queue at the cinema by booking online. — Мы можем избежать очереди в кинотеатр, забронировав билеты онлайн. | **by** / ~~in~~ | **by** / before | то же слово снято в соседней плитке этой фразы |
| es | 04 | Soy el médico. — Я тот самый врач. | **el** / ~~ese~~ | **el** / las | перевод «Я тот самый врач» — «Soy ese médico» подходит |
| fr | 01 | Je suis à la maison. — Я дома. | **à** / ~~dans~~ | **à** / vers | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 01 | Tu es à la maison. — Ты дома. | **à** / ~~dans~~ | **à** / vers | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 01 | Paul est à la maison. — Поль дома. | **à** / ~~dans~~ | **à** / vers | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 01 | Nous sommes à la gare. — Мы на вокзале. | **à** / ~~dans~~ | **à** / vers | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 01 | Vous êtes à la gare. — Вы на вокзале. | **à** / ~~dans~~ | **à** / vers | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 01 | Le sac est à la maison. — Сумка дома. | **à** / ~~dans~~ | **à** / vers | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 02 | Nous ne sommes pas à la gare. — Нас нет на станции. | **à** / ~~dans~~ | **à** / vers | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 02 | Vous n’êtes pas à la maison. — Вас нет дома. | **à** / ~~dans~~ | **à** / vers | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 02 | Je ne suis pas encore à la maison. — Меня ещё нет дома. | **à** / ~~dans~~ | **à** / vers | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 03 | Léa est à la gare ? — Леа на вокзале? | **à** / ~~dans~~ | **à** / vers | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 03 | Vous êtes à la maison ? — Вы дома? | **à** / ~~dans~~ | **à** / vers | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 03 | Est-ce que tu es à la gare ? — Ты на вокзале? | **à** / ~~dans~~ | **à** / vers | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 03 | Est-ce que le train est à l’heure ? — Поезд идёт по расписанию? | **à** / ~~dans~~ | **à** / vers | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 03 | Est-ce que le vélo est à la maison ? — Велосипед дома? | **à** / ~~dans~~ | **à** / vers | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 05 | Tu as mal à la tête. — У тебя болит голова. | **à** / ~~dans~~ | **à** / vers | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 05 | J’ai mal à la gorge. — У меня болит горло. | **à** / ~~dans~~ | **à** / vers | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 06 | Les chambres sont à l’étage. — Номера наверху. | **à** / ~~dans~~ | **à** / vers | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 07 | Nous habitons à la campagne. — Мы живём в сельской местности. | **à** / ~~dans~~ | **à** / vers | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 07 | Tu rentres à la maison. — Ты возвращаешься домой. | **à** / ~~dans~~ | **à** / vers | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 08 | Qui est à la porte ? — Кто стоит у двери? | **à** / ~~dans~~ | **à** / avec | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 09 | Elle prépare ses affaires. — Она собирает свои вещи. | **affaires** / ~~bagages~~ | **affaires** / clés | prépare ses bagages — «собирает свои вещи» |
| fr | 09 | Je laisse mon numéro à la réception. — Я оставляю свой номер на ресепшене. | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 10 | Il y a un colis à la réception. — На ресепшене лежит посылка. | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 11 | Je vais à la gare. — Я иду на вокзал. | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 11 | Tu vas à la gare. — Ты идешь на вокзал. | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 11 | Nous allons à l’école. — Мы идём в школу. | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 11 | Vous allez à l’école. — Вы идёте в школу. | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 11 | Elles vont à la banque. — Они идут в банк. | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 11 | Tu vas à la piscine. — Ты идёшь в бассейн. | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 11 | Je vais à la pharmacie. — Я иду в аптеку. | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 11 | Elle va à l’hôpital. — Она идёт в больницу. | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 11 | Tu vas à la gare en voiture. — Ты едешь на вокзал на машине. | **à** / ~~dans~~ | **à** / avec | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 11 | Tu vas à la gare en voiture. — Ты едешь на вокзал на машине. | **en** / ~~dans~~ | **en** / de | то же слово снято в соседней плитке этой фразы |
| fr | 11 | Vous allez à la plage en train ? — Вы едете на пляж на поезде? | **à** / ~~dans~~ | **à** / avec | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 11 | Vous allez à la plage en train ? — Вы едете на пляж на поезде? | **en** / ~~dans~~ | **en** / sur | то же слово снято в соседней плитке этой фразы |
| fr | 11 | Nous allons à la mairie demain. — Завтра мы идём в мэрию. | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 11 | Est-ce que tu vas à la poste ? — Ты идёшь на почту? | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 11 | Paul ne va pas à la réunion. — Поль не идёт на собрание. | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 11 | Vous allez à l’accueil ou au guichet ? — Вы идёте к стойке информации или в кассу? | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 11 | Elle va à l’arrêt de bus. — Она идёт на автобусную остановку. | **à** / ~~dans~~ | **à** / avec | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 11 | Elle va à l’arrêt de bus. — Она идёт на автобусную остановку. | **de** / ~~dans~~ | **de** / chambre | то же слово снято в соседней плитке этой фразы |
| fr | 12 | Il achète un kilo de pommes. — Он покупает килограмм яблок. | **achète** / ~~prend~~ | **achète** / mangent | il prend un kilo de pommes — «покупает» |
| fr | 14 | Demain, je dois passer à la pharmacie. — Завтра мне нужно зайти в аптеку. | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 15 | On va passer à la banque. — Мы собираемся зайти в банк. | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 15 | Je vais laisser la clé à l’accueil. — Я оставлю ключ на ресепшене. | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 16 | Ne touchez pas à la vitre ! — Не прикасайтесь к стеклу! | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 18 | J’ai acheté du pain. — Я купил хлеб. | **acheté** / ~~pris~~ | **acheté** / goûté | j’ai pris du pain — в магазине значит «купил» |
| fr | 18 | Nous avons acheté deux billets. — Мы купили два билета. | **acheté** / ~~pris~~ | **acheté** / signé | j’ai pris du pain — в магазине значит «купил» |
| fr | 19 | Paul est allé à la gare. — Поль пошел на вокзал. | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 19 | Léa est allée à la banque. — Леа пошла в банк. | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 20 | Nous habitions à la campagne. — Мы жили в сельской местности. | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 20 | À l’époque, on payait en espèces. — Тогда мы расплачивались наличными. | **À** / ~~Dans~~ | **À** / Avec | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 20 | À l’époque, on payait en espèces. — Тогда мы расплачивались наличными. | **en** / ~~dans~~ | **en** / contre | то же слово снято в соседней плитке этой фразы |
| fr | 20 | Tu allais à l’école à pied. — Ты ходил в школу пешком. | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 20 | Tu allais à l’école à pied. — Ты ходил в школу пешком. | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 21 | J’étais à la gare quand tu as écrit. — Я был на вокзале, когда ты написал. | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 21 | Paul allait au garage quand son vélo a déraillé. — Поль ехал в мастерскую, когда на его велосипеде слетела цепь. | **quand** / ~~lorsque~~ | **quand** / car | lorsque — синоним quand |
| fr | 23 | Je lui laisse ma clé à la réception. — Я оставляю ей свой ключ на ресепшене. | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 24 | Je vais à la gare et Léa y va aussi. — Я иду на вокзал, и Леа тоже. | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 25 | Nous devons en commander davantage. — Нам нужно заказать ещё. | **davantage** / ~~plus~~ | **davantage** / bien | en commander plus — «заказать ещё» |
| fr | 27 | Tu passeras à l’atelier après l’exposition. — Ты зайдёшь в мастерскую после выставки. | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 27 | Tu passeras à l’atelier après l’exposition. — Ты зайдёшь в мастерскую после выставки. | **après** / ~~dans~~ | **après** / derrière | то же слово снято в соседней плитке этой фразы |
| fr | 27 | Je serai à la maison à six heures. — Я буду дома в шесть часов. | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 27 | Je serai à la maison à six heures. — Я буду дома в шесть часов. | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 28 | Je souhaiterais déplacer mon rendez-vous. — Я хотел бы перенести встречу. | **souhaiterais** / ~~voudrais~~ | **souhaiterais** / ai | Je voudrais… — тот же перевод «я хотел бы» |
| fr | 28 | Nous aimerions prolonger notre séjour. — Мы хотели бы продлить наше пребывание. | **aimerions** / ~~voudrions~~ | **aimerions** / avons | Nous voudrions… — тот же перевод «мы хотели бы» |
| fr | 28 | Nous aimerions prolonger notre séjour. — Мы хотели бы продлить наше пребывание. | **prolonger** / ~~voudrions~~ | **prolonger** / à | то же слово снято в соседней плитке этой фразы |
| fr | 29 | C’est le bus qui va à la gare. — Это автобус, который едет до вокзала. | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 29 | Je connais un café qui sert du thé à la menthe. — Я знаю кафе, где подают мятный чай. | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 29 | La dame qui a trouvé mes clés est à l’accueil. — Женщина, которая нашла мои ключи, у стойки регистрации. | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 30 | Il faut que nous soyons à l’heure. — Нам нужно быть вовремя. | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 30 | Il faut que j’aille à la poste. — Мне нужно сходить на почту. | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 30 | Il faut que tu ailles à la banque. — Тебе нужно сходить в банк. | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 30 | Il faut que vous alliez à l’accueil. — Вам нужно подойти к стойке регистрации. | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| fr | 31 | Le pain que j’avais acheté était encore chaud. — Хлеб, который я купил, был ещё тёплым. | **acheté** / ~~pris~~ | **acheté** / achetons | j’ai pris du pain — в магазине значит «купил» |
| fr | 31 | Elle avait préparé du thé à la menthe et mon plat préféré. — Она заварила мятный чай и приготовила мое любимое блюдо. | **à** / ~~dans~~ | **à** / derrière | dans la gare / dans la pharmacie — тот же перевод «на вокзале», «в аптеку» |
| de | 08 | Der Schlüssel passt nicht. — Ключ не подходит. | **passt** / ~~funktioniert~~ | **passt** / kocht | Der Schlüssel funktioniert nicht — близко к «ключ не подходит» |
| de | 10 | Mit einem Freund gehe ich ins Kino. — Я иду в кино с другом. | **ins** / ~~zum~~ | **ins** / in | zum Kino gehen — тоже «иду в кино» |
| de | 17 | Die Gäste sind angekommen. — Гости приехали. | **angekommen** / ~~gekommen~~ | **angekommen** / abgefahren | Die Gäste sind gekommen — «гости приехали» |
| de | 17 | Anna ist mit dem Bus gefahren. — Анна поехала на автобусе. | **gefahren** / ~~abgefahren~~ | **gefahren** / eingestiegen | mit dem Bus abgefahren — «поехала на автобусе» |
| de | 17 | Bist du zu Fuß gekommen? — Ты пришёл пешком? | **gekommen** / ~~angekommen~~ | **gekommen** / gegessen | angekommen — тоже «пришёл/приехал» |
| de | 17 | Ist Anna mit dem Zug gefahren? — Анна ездила на поезде? | **gefahren** / ~~abgefahren~~ | **gefahren** / eingestiegen | mit dem Bus abgefahren — «поехала на автобусе» |
| de | 17 | Wohin seid ihr gefahren? — Куда вы ездили? | **gefahren** / ~~abgefahren~~ | **gefahren** / aufgestanden | mit dem Bus abgefahren — «поехала на автобусе» |
| de | 18 | Damals hatte ich kein Auto. — Тогда у меня не было машины. | **Damals** / ~~Früher~~ | **Damals** / In | Früher hatte ich kein Auto — «тогда/раньше не было машины» |
| de | 20 | Diese Jacke passt besser. — Эта куртка лучше сидит. | **passt** / ~~funktioniert~~ | **passt** / warten | Der Schlüssel funktioniert nicht — близко к «ключ не подходит» |
| de | 21 | Wir gehen zur Post, weil ein Paket angekommen ist. — Мы идём на почту, потому что пришла посылка. | **angekommen** / ~~gekommen~~ | **angekommen** / ausgestiegen | Die Gäste sind gekommen — «гости приехали» |
| de | 22 | Ich hoffe, dass der Schlüssel passt. — Надеюсь, ключ подойдёт. | **passt** / ~~funktioniert~~ | **passt** / warten | Der Schlüssel funktioniert nicht — близко к «ключ не подходит» |
| de | 22 | Ich weiß, dass der Brief angekommen ist. — Я знаю, что письмо пришло. | **angekommen** / ~~gekommen~~ | **angekommen** / eingezogen | Die Gäste sind gekommen — «гости приехали» |
| de | 25 | Der rote Mantel passt. — Красное пальто подходит. | **passt** / ~~funktioniert~~ | **passt** / beginnt | Der Schlüssel funktioniert nicht — близко к «ключ не подходит» |
| de | 25 | Die rote Jacke passt. — Красная куртка подходит. | **passt** / ~~funktioniert~~ | **passt** / braucht | Der Schlüssel funktioniert nicht — близко к «ключ не подходит» |
| de | 25 | Das rote Kleid passt. — Красное платье подходит. | **passt** / ~~funktioniert~~ | **passt** / braucht | Der Schlüssel funktioniert nicht — близко к «ключ не подходит» |
| de | 25 | Der neue Schlüssel passt. — Новый ключ подходит. | **passt** / ~~funktioniert~~ | **passt** / bezahlen | Der Schlüssel funktioniert nicht — близко к «ключ не подходит» |
| de | 26 | Es ist schön, dich zu sehen. — Приятно тебя видеть. | **schön** / ~~gut~~ | **schön** / leer | Es ist gut, dich zu sehen — «приятно тебя видеть» |
| de | 28 | Die Adresse kann noch geändert werden. — Адрес ещё можно изменить. | **kann** / ~~könnte~~ | **kann** / möchte | Die Adresse könnte noch geändert werden — «адрес ещё можно изменить» |
| de | 29 | Ich hätte gern ein Wasser. — Я хотел бы воды. | **gern** / ~~bitte~~ | **gern** / langsamer | Ich hätte bitte ein Wasser — та же просьба |
| de | 29 | Anna hätte gern die Rechnung. — Анна хотела бы получить счёт. | **gern** / ~~bitte~~ | **gern** / kurz | Ich hätte bitte ein Wasser — та же просьба |
| de | 29 | Könnte ich den Mantel anprobieren? — Можно мне примерить пальто? | **Könnte** / ~~Darf~~ | **Könnte** / Kannst | Darf ich den Mantel anprobieren? — тот же перевод «можно мне примерить» |
| de | 29 | Könnte ich mit Karte bezahlen? — Можно было бы заплатить картой? | **Könnte** / ~~Darf~~ | **Könnte** / Kannst | Darf ich den Mantel anprobieren? — тот же перевод «можно мне примерить» |
| de | 29 | Könnte ich mit Karte bezahlen? — Можно было бы заплатить картой? | **Könnte** / ~~Kann~~ | **Könnte** / Müssen | Kann ich mit Karte bezahlen? — та же просьба |
| de | 29 | Könnte die Firma den Schrank morgen liefern? — Могла бы фирма доставить шкаф завтра? | **Könnte** / ~~Darf~~ | **Könnte** / Kannst | Darf ich den Mantel anprobieren? — тот же перевод «можно мне примерить» |
| de | 29 | Könnte die Firma den Schrank morgen liefern? — Могла бы фирма доставить шкаф завтра? | **Könnte** / ~~Kann~~ | **Könnte** / Müssen | Kann ich mit Karte bezahlen? — та же просьба |
| de | 29 | Ich würde gern einen Tisch reservieren. — Я хотел бы забронировать столик. | **gern** / ~~bitte~~ | **gern** / langsamer | Ich hätte bitte ein Wasser — та же просьба |
| de | 29 | Wir würden gern länger bleiben. — Мы хотели бы остаться подольше. | **gern** / ~~bitte~~ | **gern** / zuerst | Ich hätte bitte ein Wasser — та же просьба |
| de | 29 | Tom würde gern früher anfangen. — Том хотел бы начать пораньше. | **gern** / ~~bitte~~ | **gern** / freundlich | Ich hätte bitte ein Wasser — та же просьба |
| de | 29 | Anna würde gern den Kurs wechseln. — Анна хотела бы перейти на другой курс. | **gern** / ~~bitte~~ | **gern** / möglich | Ich hätte bitte ein Wasser — та же просьба |
| de | 29 | Dürfte ich hier parken? — Можно было бы мне здесь припарковаться? | **Dürfte** / ~~Kann~~ | **Dürfte** / Muss | Kann ich mich hier hinsetzen? — тот же перевод «можно мне…» |
| de | 29 | Dürfte ich hier parken? — Можно было бы мне здесь припарковаться? | **Dürfte** / ~~Könnte~~ | **Dürfte** / Dürft | Könnte ich hier parken? — «можно было бы мне…» |
| de | 29 | Dürfte ich hier parken? — Можно было бы мне здесь припарковаться? | **Dürfte** / ~~Darf~~ | **Dürfte** / Kannst | Darf ich hier parken? — та же просьба |
| de | 29 | Dürften wir kurz telefonieren? — Можно нам ненадолго позвонить? | **Dürften** / ~~Könnten~~ | **Dürften** / Sind | Könnten wir kurz telefonieren? — «можно нам позвонить?» |
| de | 29 | Dürften wir kurz telefonieren? — Можно нам ненадолго позвонить? | **telefonieren** / ~~anrufen~~ | **telefonieren** / anprobieren | kurz anrufen — «ненадолго позвонить» |
| de | 29 | Dürfte ich mich hier hinsetzen? — Можно мне сюда присесть? | **Dürfte** / ~~Kann~~ | **Dürfte** / Dürft | Kann ich mich hier hinsetzen? — тот же перевод «можно мне…» |
| de | 29 | Dürften die Kinder im Hof spielen? — Можно было бы детям поиграть во дворе? | **Dürften** / ~~Könnten~~ | **Dürften** / Sind | Könnten wir kurz telefonieren? — «можно нам позвонить?» |
| de | 29 | Man könnte die Kisten hier abstellen. — Можно было бы поставить ящики здесь. | **könnte** / ~~darf~~ | **könnte** / darfst | Darf ich den Mantel anprobieren? — тот же перевод «можно мне примерить» |
| de | 29 | Man könnte die Kisten hier abstellen. — Можно было бы поставить ящики здесь. | **könnte** / ~~kann~~ | **könnte** / möchte | Kann ich mit Karte bezahlen? — та же просьба |
| de | 30 | Anna fragt, ob die Rechnung stimmt. — Анна спрашивает, правильный ли счёт. | **stimmt** / ~~passt~~ | **stimmt** / merkst | ob die Rechnung passt — разговорное «верен ли счёт» |
| de | 30 | Ich weiß nicht, welche Größe mir passt. — Я не знаю, какой размер мне подходит. | **passt** / ~~funktioniert~~ | **passt** / beginnt | Der Schlüssel funktioniert nicht — близко к «ключ не подходит» |
| de | 32 | Wenn der Laden offen wäre, könnte ich Brot kaufen. — Если бы магазин был открыт, я мог бы купить хлеб. | **könnte** / ~~kann~~ | **könnte** / darfst | Kann ich mit Karte bezahlen? — та же просьба |
| de | 32 | Wenn ich die Gegend besser kennen würde, könnte ich dir den Weg zeigen. — Если бы я лучше знал этот район, я мог бы показать тебе дорогу. | **könnte** / ~~kann~~ | **könnte** / darfst | Kann ich mit Karte bezahlen? — та же просьба |
| de | 32 | Wenn das Taxi früher gekommen wäre, hätten wir den Anschluss geschafft. — Если бы такси приехало пораньше, мы бы успели на пересадку. | **gekommen** / ~~angekommen~~ | **gekommen** / gegessen | angekommen — тоже «пришёл/приехал» |
| de | 32 | Hätte ich die Nummer gespeichert, könnte ich jetzt anrufen. — Если бы я сохранил номер, я мог бы сейчас позвонить. | **könnte** / ~~kann~~ | **könnte** / darfst | Kann ich mit Karte bezahlen? — та же просьба |
| de | 32 | Mit einem zweiten Schlüssel wäre ich ins Haus gekommen. — Со вторым ключом я бы тогда смог попасть домой. | **gekommen** / ~~angekommen~~ | **gekommen** / gegessen | angekommen — тоже «пришёл/приехал» |
| de | 32 | Wenn ich noch einmal wählen könnte, würde ich diesmal den direkten Zug nehmen. — Если бы я мог выбрать ещё раз, на этот раз я бы поехал прямым поездом. | **könnte** / ~~darf~~ | **könnte** / müssen | Darf ich den Mantel anprobieren? — тот же перевод «можно мне примерить» |
| de | 32 | Wenn ich noch einmal wählen könnte, würde ich diesmal den direkten Zug nehmen. — Если бы я мог выбрать ещё раз, на этот раз я бы поехал прямым поездом. | **könnte** / ~~kann~~ | **könnte** / darfst | Kann ich mit Karte bezahlen? — та же просьба |
| it | 01 | Siamo alla stazione. — Мы на вокзале. | **alla** / ~~nella~~ | **alla** / mia | nella stazione — тот же перевод «на вокзале» |
| it | 02 | Non siamo alla stazione. — Нас нет на станции. | **alla** / ~~nella~~ | **alla** / mia | nella stazione — тот же перевод «на вокзале» |
| it | 03 | Lea è alla stazione? — Леа на вокзале? | **alla** / ~~nella~~ | **alla** / mia | nella stazione — тот же перевод «на вокзале» |
| it | 03 | Sei alla stazione? — Ты на вокзале? | **alla** / ~~nella~~ | **alla** / mia | nella stazione — тот же перевод «на вокзале» |
| it | 03 | La sala è libera? — Зал свободен? | **libera** / ~~vuota~~ | **libera** / buio | camera vuota — «свободная комната» |
| it | 03 | L’uscita è vicino alla biglietteria? — Выход находится рядом с билетной кассой? | **alla** / ~~nella~~ | **alla** / ai | nella stazione — тот же перевод «на вокзале» |
| it | 04 | Questi sono dei vicini. — Это соседи. | **dei** / ~~alcuni~~ | **dei** / del | alcuni libri — тот же перевод без артикля |
| it | 04 | Queste sono delle foto. — Это фотографии. | **delle** / ~~alcune~~ | **delle** / del | alcune pile — тот же перевод без артикля |
| it | 05 | Ha degli spiccioli? — У вас есть мелочь? | **degli** / ~~alcuni~~ | **degli** / del | alcuni spiccioli — тот же перевод |
| it | 06 | L’indirizzo è sulla mappa. — Адрес указан на карте. | **sulla** / ~~nella~~ | **sulla** / dalla | nella mappa — «на карте» |
| it | 08 | Chi è alla porta? — Кто стоит у двери? | **alla** / ~~nella~~ | **alla** / mia | nella stazione — тот же перевод «на вокзале» |
| it | 09 | Il mio indirizzo è sulla mappa. — Мой адрес указан на карте. | **sulla** / ~~nella~~ | **sulla** / dalla | nella mappa — «на карте» |
| it | 09 | Lascio il mio numero alla reception. — Я оставляю свой номер на ресепшене. | **alla** / ~~nella~~ | **alla** / mia | nella stazione — тот же перевод «на вокзале» |
| it | 10 | Ci sono dei libri sul tavolo. — На столе лежат книги. | **dei** / ~~alcuni~~ | **dei** / molte | alcuni libri — тот же перевод без артикля |
| it | 10 | Nel cassetto ci sono delle pile. — В ящике лежат батарейки. | **delle** / ~~alcune~~ | **delle** / molte | alcune pile — тот же перевод без артикля |
| it | 10 | Ci sono dei bagni? — Есть ли здесь туалеты? | **dei** / ~~alcuni~~ | **dei** / molte | alcuni libri — тот же перевод без артикля |
| it | 10 | C’è una camera libera? — Есть ли свободная комната? | **libera** / ~~vuota~~ | **libera** / buio | camera vuota — «свободная комната» |
| it | 10 | C’è un pacco alla reception. — На ресепшене есть посылка. | **alla** / ~~nella~~ | **alla** / mia | nella stazione — тот же перевод «на вокзале» |
| it | 10 | Ci sono dei posti liberi sulla banchina. — На платформе есть свободные места. | **dei** / ~~alcuni~~ | **dei** / molte | alcuni libri — тот же перевод без артикля |
| it | 11 | Paolo non va alla riunione. — Паоло не идёт на собрание. | **alla** / ~~nella~~ | **alla** / mia | nella stazione — тот же перевод «на вокзале» |
| it | 11 | Va alla reception o alla biglietteria? — Вы идёте к стойке информации или в кассу? | **alla** / ~~nella~~ | **alla** / mia | nella stazione — тот же перевод «на вокзале» |
| it | 11 | Va alla reception o alla biglietteria? — Вы идёте к стойке информации или в кассу? | **alla** / ~~nella~~ | **alla** / mia | nella stazione — тот же перевод «на вокзале» |
| it | 11 | Lei va alla fermata dell’autobus. — Она идёт на автобусную остановку. | **alla** / ~~nella~~ | **alla** / mia | nella stazione — тот же перевод «на вокзале» |
| it | 11 | Andiamo in fondo alla strada. — Мы идём до конца улицы. | **alla** / ~~nella~~ | **alla** / mia | nella stazione — тот же перевод «на вокзале» |
| it | 12 | Mangiano delle fragole. — Они едят клубнику. | **delle** / ~~alcune~~ | **delle** / molte | alcune pile — тот же перевод без артикля |
| it | 13 | Lui porta dei pantaloni blu. — На ней синие брюки. | **dei** / ~~alcuni~~ | **dei** / delle | alcuni libri — тот же перевод без артикля |
| it | 16 | Non aggiunga sale! — Не добавляйте соль! | **aggiunga** / ~~metta~~ | **aggiunga** / a | Non metta sale — «не добавляйте соль» |
| it | 16 | Accendi la lampada accanto al letto! — Включи лампу у кровати! | **accanto** / ~~vicino~~ | **accanto** / po’ | vicino al letto — «у кровати» |
| it | 17 | I bambini si svegliano alla stessa ora. — Дети просыпаются одновременно. | **alla** / ~~nella~~ | **alla** / mia | nella stazione — тот же перевод «на вокзале» |
| it | 17 | Non mi alzo prima delle sei. — Я не встаю раньше шести часов. | **delle** / ~~alcune~~ | **delle** / molte | alcune pile — тот же перевод без артикля |
| it | 18 | Ho ricevuto il pacco. — Я получил посылку. | **ricevuto** / ~~preso~~ | **ricevuto** / chiuso | Ho preso il pacco — «получил/забрал посылку» |
| it | 19 | Paolo è andato alla stazione ferroviaria. — Паоло пошел на вокзал. | **alla** / ~~nella~~ | **alla** / mia | nella stazione — тот же перевод «на вокзале» |
| it | 20 | La stazione ferroviaria era in fondo alla strada. — Железнодорожный вокзал находился в конце улицы. | **alla** / ~~nella~~ | **alla** / mia | nella stazione — тот же перевод «на вокзале» |
| it | 21 | Erano in viaggio quando ho ricevuto la notizia. — Они были в пути, когда я получил известие. | **ricevuto** / ~~preso~~ | **ricevuto** / arrivato | Ho preso il pacco — «получил/забрал посылку» |
| it | 24 | Conosci questa città e ci hai dei parenti. — Ты знаешь этот город, и у тебя там родственники. | **dei** / ~~alcuni~~ | **dei** / delle | alcuni libri — тот же перевод без артикля |
| it | 25 | Ci servono dei cavi per il palco; dobbiamo ordinarne tre. — Нам нужны кабели для сцены; нужно заказать три. | **dei** / ~~alcuni~~ | **dei** / delle | alcuni libri — тот же перевод без артикля |
| it | 25 | Mancano dei bicchieri: vado a prenderne altri. — Не хватает стаканов, я пойду возьму ещё. | **dei** / ~~alcuni~~ | **dei** / delle | alcuni libri — тот же перевод без артикля |
| it | 25 | Ci sono delle chiatte sul canale e ne vedo due. — На канале баржи, и я вижу две. | **delle** / ~~alcune~~ | **delle** / il | alcune pile — тот же перевод без артикля |
| it | 28 | Potrebbe richiamarmi dopo le dieci? — Не могли бы вы перезвонить мне после 10:00? | **richiamarmi** / ~~chiamarmi~~ | **richiamarmi** / a | Potrebbe chiamarmi dopo le dieci — та же просьба позвонить |
| it | 29 | Questo è l’autobus che va alla stazione ferroviaria. — Это автобус, который едет до вокзала. | **alla** / ~~nella~~ | **alla** / mia | nella stazione — тот же перевод «на вокзале» |
| it | 29 | La signora che ha trovato le mie chiavi è alla reception. — Женщина, которая нашла мои ключи, у стойки регистрации. | **alla** / ~~nella~~ | **alla** / mia | nella stazione — тот же перевод «на вокзале» |
| it | 30 | È necessario che Lei vada alla reception. — Вам нужно подойти к стойке регистрации. | **alla** / ~~nella~~ | **alla** / mia | nella stazione — тот же перевод «на вокзале» |
| it | 31 | Lei ha riletto la lettera che aveva ricevuto. — Она перечитала письмо, которое до этого получила. | **ricevuto** / ~~avuto~~ | **ricevuto** / dimenticato | la lettera che aveva avuto — «которое получила» |
| it | 31 | Non avevamo ricevuto il codice. — Мы не получили код. | **ricevuto** / ~~preso~~ | **ricevuto** / abbassato | Ho preso il pacco — «получил/забрал посылку» |
| it | 32 | Prenderemmo un taxi se avessimo dei bagagli. — Мы бы взяли такси, если бы у нас был багаж. | **dei** / ~~alcuni~~ | **dei** / delle | alcuni libri — тот же перевод без артикля |

---

# Часть 3 (решение владельца «Только служебные слова»): соблазны, которые грамматически встают в слот

Скрипт и правила: `scripts/u10_closed_class_distractors.cjs`. Сторож: `tests/u10_closed_class_distractors_guard.test.ts`.
Полная таблица пар (516 пар): `docs/work/u10_tiles_2026_11_11/part3_pairs.md`, счётчики: `part3_stats.json`.

## Поправка к части 2: объём категории был занижен

«~15,5 тыс. мест» в части 2 — это только места пар, отобранных поиском синонимов, а не размер категории. Точный замер по
спискам классов слов сторожа, все 213 080 подстановок пяти курсов:

| Вид подстановки | Сколько |
|---|---|
| смысловое слово ↔ смысловое | 130 294 |
| артикль / указательное / притяжательное ↔ такое же | 33 080 |
| местоимение ↔ местоимение | 15 043 |
| предлог ↔ предлог | 11 586 |
| союз ↔ союз | 5 620 |
| вспомогательный ↔ вспомогательный (только EN) | 5 619 |
| «да / нет» ↔ такое же | 20 |
| соблазн другого класса | 11 818 (5,5 %) |

Случайная выборка 30 английских плиток со смысловыми словами: грамматично и осмысленно встают 83 соблазна из 150 (55 %).
Реальный размер категории — порядка 100 тыс. соблазнов, около 80 % плиток. Владельцу показаны эти цифры; выбран вариант
«только служебные слова», смысловые слова остаются (верный вариант там определяет перевод).

## Правила

Соблазн правится, только если правило согласования ДОКАЗЫВАЕТ, что он грамматически встаёт в слот:

- **артикли, указательные, притяжательные** — число (EN), род и число (ES / FR / IT, род существительного берётся из самого
  курса), тип склонения и окончание (DE), элизия (FR), звуковые формы il / lo, un / uno (IT), a / an (EN);
- **местоимения-подлежащие** — лицо и число по форме соседнего глагола (EN, FR, DE);
- **английские вспомогательные** — внутри группы: модальные между собой; be / do / have — по соседнему местоимению;
- **союзы** — подчинительные между собой («если ↔ когда»); сочинительный на месте подчинительного МЕЖДУ двумя
  предложениями («Leía el mensaje [pero] sonó el móvil», «Leggevo [però] hai chiamato», «I was reading [but] the phone
  rang») — он там грамматичен. Не встают: сочинительный союз в начале фразы, сочинительный в немецком придаточном (глагол
  в конце), «sino / ni / né / sondern» без отрицания слева, испанские «e / u» не перед своим звуком, «но» между двумя
  существительными.

Замена — слово ТОГО ЖЕ класса, которое то же правило доказуемо отсекает в этом слоте («[Both] door is open»,
«[Him] can wait», «He [have] not drive», «No estás en [lo] cocina», «Je suis à [cet] maison», «Leía el mensaje [sino]
sonó el móvil»), сначала из соблазнов, уже знакомых по этому верному слову. Так соблазн остаётся ошибкой той же части
речи (стандарт Ревизора). Слово другого класса ставится, только когда в своём классе доказуемо неверной формы нет.

## Исправление по сверке координатора (союзы)

Первая версия правила считала сочинительный союз доказуемо неверным везде, где справа не стоит местоимение, и ставила
«pues» (103 места, ES) и «però» (69 мест, IT) на место подчинительного союза между двумя предложениями — а там они
грамматичны. Причина: правило «союзу нужно целое предложение» писалось для случая «хлеб и масло» и срабатывало шире;
«pues» стоял в группе сочинительных, хотя он причинный. Правило переписано (см. выше), часть 3 пересобрана целиком от
состояния до неё; те же случаи проверены во всех пяти курсах (EN but / so / and, FR mais / car / donc / et, DE aber / denn /
sondern, ES pero, IT ma / e) и закреплены в стороже.

## Счётчики

| Курс | Класс | Заменено | из них словом того же класса | словом другого класса | Оставлено: правило отсекает | Оставлено: правило не решает |
|---|---|---|---|---|---|---|
| EN | артикли, указательные, притяжательные | 4836 | 4836 | 0 | 2486 | 12 |
| EN | местоимения-подлежащие | 3599 | 2721 | 878 | 1825 | 0 |
| EN | вспомогательные глаголы | 1075 | 643 | 432 | 669 | 3875 |
| EN | союзы | 391 | 71 | 320 | 129 | 46 |
| EN | предлоги | 0 | 0 | 0 | 0 | 2867 |
| ES | артикли, указательные, притяжательные | 693 | 693 | 0 | 6195 | 433 |
| ES | местоимения-подлежащие | 0 | 0 | 0 | 0 | 164 |
| ES | союзы | 327 | 285 | 42 | 446 | 404 |
| ES | предлоги | 0 | 0 | 0 | 0 | 3005 |
| FR | артикли, указательные, притяжательные | 541 | 541 | 0 | 5272 | 312 |
| FR | местоимения-подлежащие | 556 | 555 | 1 | 4104 | 226 |
| FR | союзы | 217 | 12 | 205 | 310 | 748 |
| FR | предлоги | 0 | 0 | 0 | 0 | 1545 |
| DE | артикли, указательные, притяжательные | 80 | 80 | 0 | 6575 | 18 |
| DE | местоимения-подлежащие | 452 | 145 | 307 | 1931 | 1445 |
| DE | союзы | 614 | 614 | 0 | 131 | 743 |
| DE | предлоги | 0 | 0 | 0 | 0 | 2105 |
| IT | артикли, указательные, притяжательные | 67 | 67 | 0 | 5368 | 192 |
| IT | местоимения-подлежащие | 0 | 0 | 0 | 0 | 741 |
| IT | союзы | 258 | 63 | 195 | 376 | 480 |
| IT | предлоги | 0 | 0 | 0 | 0 | 2044 |
| **Всего** | | **13706** | **11326** | **2380** | **35817** | **21405** |

Повторный полный проход теми же правилами после правки: подходящих служебных соблазнов — 0 во всех пяти курсах.

## Где встало слово другого класса (2380 мест, 148 пар — помечены * в `part3_pairs.md`)

| Курс и класс | Мест | Почему в своём классе неверной формы нет |
|---|---|---|
| EN местоимения-подлежащие | 878 | в плитке уже пять местоимений из семи, а при прошедшем времени и модальном глаголе все местоимения согласуются («[They] can wait») |
| EN вспомогательные глаголы | 432 | модальные взаимозаменяемы, а подлежащее — существительное: согласованием ничего не отсечь («The shop [must] open») |
| EN союзы | 320 | подчинительные союзы взаимозаменяемы, а сочинительный между двумя предложениями тоже грамматичен; доказуемо неверных («sino», «né» без отрицания, союз в начале фразы) не хватило |
| DE местоимения-подлежащие | 307 | в плитке уже пять местоимений из семи, а при прошедшем времени и модальном глаголе все местоимения согласуются («[They] can wait») |
| FR союзы | 205 | подчинительные союзы взаимозаменяемы, а сочинительный между двумя предложениями тоже грамматичен; доказуемо неверных («sino», «né» без отрицания, союз в начале фразы) не хватило |
| IT союзы | 195 | подчинительные союзы взаимозаменяемы, а сочинительный между двумя предложениями тоже грамматичен; доказуемо неверных («sino», «né» без отрицания, союз в начале фразы) не хватило |
| ES союзы | 42 | подчинительные союзы взаимозаменяемы, а сочинительный между двумя предложениями тоже грамматичен; доказуемо неверных («sino», «né» без отрицания, союз в начале фразы) не хватило |
| FR местоимения-подлежащие | 1 | в плитке уже пять местоимений из семи, а при прошедшем времени и модальном глаголе все местоимения согласуются («[They] can wait») |

Что стоит в этих местах: артикль или притяжательное из первых уроков (EN the / a / my, FR un / une / mon, DE ein / mein / kein,
ES un / una, IT un / il / mio). По ним ждётся решение владельца — не трогались.

## Не правилось

- **Смысловые слова** (food / coffee, phone / bag) — 130 294 подстановки: решение владельца.
- **Предлоги** — 11566 подстановок: правило не может доказать, что замена предлога неграмматична, а пример владельца
  «They walk ___ the evening» → in с соблазнами on / at / to — эталон. Наугад не правилось.
- **Французское «vers» из части 2** (20 фраз, «Je suis [est] la maison») пересмотрено по новому принципу: предлога, который
  перед «la / l’» доказуемо неграмматичен, правило не находит, поэтому оставлен нынешний вариант (слово другого класса).
- **Местоимения в испанском и итальянском** (905) — подлежащее обычно опущено; правило по форме глагола не писалось.
- **Числительные** — смысловые слова.
- **«Правило не решает»** — 21405 мест: предлоги (11566), английские вспомогательные разных групп и при
  существительном-подлежащем, немецкие определители разного типа склонения (род существительного в данных не размечен),
  союзы там, где не видно, предложение справа или именная группа, местоимения без соседнего глагола.

## Спорные и неточные места

- Правила намеренно осторожны, поэтому часть грамматически подходящих служебных соблазнов могла остаться — прежде всего
  немецкие определители, испанские и итальянские местоимения, предлоги.
- Небольшая избыточная правка: союз «или» между двумя существительными («Ana [o] Luis», «zwischen der Bank [oder] dem
  Hotel») и единичные случаи, где «определитель» на деле был местоимением-дополнением.
- 2380 замен словом другого класса противоречат пункту «а» инструкции аудита Ревизора («соблазн другой части речи
  выдаёт себя»). Сторожа не менялись и зелёные; нужен знак владельца — оставить так или вернуть в этих местах прежний соблазн.
- Проверка — правилом и просмотром пар с примером; каждое из 13706 мест глазами не читалось.

## Крупнейшие пары «было → стало»

| Курс | Класс | Пара | Мест | Замена (× сколько раз; * — другой класс) | Пример (прежний соблазн в скобках) — перевод |
|---|---|---|---|---|---|
| en | det | the → ~~this~~ | 803 | both×726, many×76, few×1 | [This] door is open — Дверь открыта. |
| en | det | the → ~~that~~ | 782 | many×691, few×20, both×67, those×4 | [That] door is open — Дверь открыта. |
| en | det | the → ~~each~~ | 682 | few×634, many×44, both×1, those×3 | [Each] door is open — Дверь открыта. |
| en | aux | is → ~~was~~ | 299 | am×19, were×15, have×14, a*×150, the*×92, my*×9 | She [was] busy — Она занята. |
| en | subj | i → ~~we~~ | 236 | it×39, him×99, the*×12, me×37, a*×5, your*×1, us×22, my*×1, them×19, he×1 | [We] work nearby — Я работаю неподалеку. |
| en | subj | i → ~~you~~ | 210 | him×58, the*×23, a*×15, it×15, us×31, my*×7, me×34, them×27 | [You] work nearby — Я работаю неподалеку. |
| en | subj | i → ~~they~~ | 207 | the*×32, it×4, him×20, a*×40, he×1, me×45, us×34, my*×15, them×16 | [They] work nearby — Я работаю неподалеку. |
| en | subj | we → ~~you~~ | 185 | it×11, him×66, i×5, the*×12, a*×9, me×37, us×25, my*×3, them×17 | [You] are ready — Мы готовы. |
| en | det | a → ~~that~~ | 182 | few×169, many×13 | We share [that] kitchen — Мы делим кухню. |
| en | det | a → ~~this~~ | 178 | many×170, few×8 | We share [this] kitchen — Мы делим кухню. |
| en | subj | we → ~~they~~ | 176 | him×26, he×3, it×3, i×2, the*×41, a*×22, my*×15, us×18, me×27, your*×1, them×18 | [They] are ready — Мы готовы. |
| en | det | a → ~~each~~ | 173 | several×166, few×5, those×2 | We share [each] kitchen — Мы делим кухню. |
| en | subj | she → ~~he~~ | 172 | him×61, they×5, i×10, the*×11, me×24, my*×7, a*×9, us×22, them×23 | [He] is busy — Она занята. |
| en | subj | i → ~~she~~ | 161 | the*×9, me×49, him×50, my*×2, a*×11, us×23, them×16, they×1 | [She] can swim — Я умею плавать. |
| es | conj | cuando → ~~porque~~ | 79 | sino×13, u×21, e×27, ni×1, y×17 | Leía el mensaje [porque] sonó el móvil — Я читал сообщение, когда зазвонил телефон. |
| es | conj | cuando → ~~si~~ | 79 | e×17, sino×59, u×2, y×1 | Leía el mensaje [si] sonó el móvil — Я читал сообщение, когда зазвонил телефон. |
| es | conj | cuando → ~~pero~~ | 61 | u×37, e×17, sino×7 | Leía el mensaje [pero] sonó el móvil — Я читал сообщение, когда зазвонил телефон. |
| es | det | la → ~~esta~~ | 58 | lo×22, el×5, los×20, las×7, unos×3, un×1 | No estás en [esta] cocina — Ты не на кухне. |
| es | det | la → ~~cada~~ | 57 | los×9, lo×29, unos×4, las×8, el×5, ese×1, estos×1 | Luis está en [cada] cocina — Луис на кухне. |
| es | conj | cuando → ~~aunque~~ | 41 | un*×39, sino×1, u×1 | Leía el mensaje [aunque] sonó el móvil — Я читал сообщение, когда зазвонил телефон. |
| es | det | el → ~~cada~~ | 40 | la×7, las×5, los×7, esta×18, unos×3 | [Cada] móvil no está en el bolsillo — Телефон не в кармане. |
| fr | subj | il → ~~on~~ | 145 | tu×125, elles×1, nous×2, vous×14, je×2, ils×1 | [On] a un sac — У него есть сумка. |
| fr | det | le → ~~ce~~ | 82 | une×4, des×11, cette×4, ces×62, la×1 | Est-ce que [ce] café est fermé — Кафе закрыто? |
| fr | subj | elle → ~~il~~ | 81 | je×13, j’×40, ils×9, vous×15, elles×4 | [Il] est au bureau — Она в офисе. |
| fr | det | la → ~~cette~~ | 77 | des×3, cet×61, ce×13 | Je suis à [cette] maison — Я дома. |
| fr | subj | elle → ~~on~~ | 77 | j’×37, ils×5, vous×17, je×12, elles×3, nous×2, tu×1 | [On] est au bureau — Она в офисе. |
| fr | subj | je → ~~il~~ | 56 | vous×29, tu×17, nous×3, ils×4, elles×3 | [Il] travaille ici — Я здесь работаю. |
| fr | subj | je → ~~on~~ | 50 | tu×29, vous×15, elles×2, nous×1, ils×3 | [On] travaille ici — Я здесь работаю. |
| de | subj | wir → ~~sie~~ | 140 | er×28, ein*×42, ich×24, es×21, mein*×2, du×23 | [Sie] sind hier — Мы здесь. |
| de | conj | wenn → ~~obwohl~~ | 94 | aber×30, als×30, denn×34 | [Obwohl] es regnet bleibe ich zu Hause — Если пойдёт дождь, я останусь дома. |
| de | conj | wenn → ~~weil~~ | 94 | denn×35, aber×23, als×36 | [Weil] es regnet bleibe ich zu Hause — Если пойдёт дождь, я останусь дома. |
| de | conj | wenn → ~~nachdem~~ | 93 | als×28, denn×24, aber×41 | [Nachdem] es regnet bleibe ich zu Hause — Если пойдёт дождь, я останусь дома. |
| de | conj | weil → ~~wenn~~ | 53 | denn×13, sondern×24, aber×16 | Ich bleibe hier [wenn] ich müde bin — Я останусь здесь, потому что устал. |
| de | conj | weil → ~~obwohl~~ | 53 | aber×19, denn×17, sondern×16, und×1 | Ich bleibe hier [obwohl] ich müde bin — Я останусь здесь, потому что устал. |
| de | conj | weil → ~~nachdem~~ | 53 | sondern×13, denn×21, aber×18, und×1 | Ich bleibe hier [nachdem] ich müde bin — Я останусь здесь, потому что устал. |
| it | conj | quando → ~~perché~~ | 43 | il*×15, un*×19, mio*×3, dei*×1, o×2, ma×3 | Leggevo [perché] hai chiamato — Я читал, когда ты позвонил. |
| it | conj | quando → ~~se~~ | 40 | un*×18, né×20, però×2 | Leggevo [se] hai chiamato — Я читал, когда ты позвонил. |
| it | conj | quando → ~~e~~ | 38 | mio*×20, il*×14, dei*×3, una*×1 | Leggevo [e] hai chiamato — Я читал, когда ты позвонил. |
| it | conj | quando → ~~ma~~ | 38 | dei*×20, mio*×14, una*×3, mia*×1 | Leggevo [ma] hai chiamato — Я читал, когда ты позвонил. |
| it | conj | mentre → ~~se~~ | 21 | però×10, il*×2, né×8, un*×1 | [Se] riordinavo Lea ha trovato lo scontrino — Пока я убирался, Леа нашла чек. |
| it | conj | mentre → ~~perché~~ | 18 | o×7, mio*×3, un*×7, il*×1 | [Perché] riordinavo Lea ha trovato lo scontrino — Пока я убирался, Леа нашла чек. |
| it | conj | mentre → ~~e~~ | 11 | dei*×3, il*×3, mio*×5 | Ho sentito un rumore [e] leggevo — Я услышал шум, когда читал. |
