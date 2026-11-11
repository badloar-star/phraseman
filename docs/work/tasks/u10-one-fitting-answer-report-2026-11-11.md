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
