# Пик · «Найди ошибку» — облачные задания с двумя ошибками (разовое чтение 24.10)

Status: Отчёт координатору (правка данных — после релиза с владельцем)
Owner: «10 · ПЕРЕВОДЧИК»

Источник: Firestore `tournamentTasks`, poolVersion `tpool_20260801_v10`, mode `find_oddity` — 315 документов, 317 чтений, записей нет.
Шаблон у всех один: «Найдите фразу, которую нужно исправить.» (в таблице клиента `spire_oddity_prompt.ts` его нет → общая строка + предупреждение `[SPIRE-ODDITY-PROMPT]`; на экране текст верный).

Итог: заданий без ошибки — 0. Заданий, где кроме ответа грамматически неверен ещё вариант, — 61. Вариант-«ловушка» генератора меняет одно слово и часто ломает фразу.

Отдельно, не в таблице: ~70 вариантов грамматичны, но бессмысленны («He is my wife», «I am working on the new river», «Are you the new button?») — с заголовком «Найди ошибку» тоже могут сбить. Чинить вместе при правке генератора.

| taskId | ответ (ошибка по задумке) | вторая ошибка в другом варианте |
|---|---|---|
| tp2_20260801_v10_odd_d1_053203cad62bcce306ac | They is time to sleep. | It is moment to sleep |
| tp2_20260801_v10_odd_d1_0c561f0614ecffe5e346 | I does not eat fish. | eat egg |
| tp2_20260801_v10_odd_d1_175aeac577a4947b1f4a | She be not at home now. | at office |
| tp2_20260801_v10_odd_d1_23aca71c67ae0fe68d82 | They is next to the hotel. | across to / above to the hotel |
| tp2_20260801_v10_odd_d1_2cedcbf3282c00ed1f69 | We is on vacation. | on school / on work |
| tp2_20260801_v10_odd_d1_319c5cc89de4cffe5670 | He go to bed at ten. | at morning |
| tp2_20260801_v10_odd_d1_32b07e168b08fe9e285c | Do you have an room available? | a room quiet / a room new |
| tp2_20260801_v10_odd_d1_336f5101138e73f32a23 | Do you have a extra towel? | an spare towel |
| tp2_20260801_v10_odd_d1_378e7234a535c4eefde8 | I are on vacation. | on school / on work |
| tp2_20260801_v10_odd_d1_47dd8bbb3fc4ae17fc7c | Sorry, They am lost. | I am lose |
| tp2_20260801_v10_odd_d1_65c4adace3fc6e086ec0 | I be allergic to penicillin. | I am allergy to / afraid to |
| tp2_20260801_v10_odd_d1_6d0fa079374db66a622b | There is an big square near the hotel. | a old square |
| tp2_20260801_v10_odd_d1_714804296829f4e0a650 | He am allergic to penicillin. | I am allergy to / afraid to |
| tp2_20260801_v10_odd_d1_79b09c3dbb30beeaa6f7 | I are looking for a blue jacket. | a blue shoes |
| tp2_20260801_v10_odd_d1_7a262ee6825ddbc40519 | It are time to sleep. | It is moment to sleep |
| tp2_20260801_v10_odd_d1_7f50ee23722cb1397972 | Do you have an lunch menu today? | a lunch water |
| tp2_20260801_v10_odd_d1_8371c61561ae89482d31 | She am looking for a blue jacket. | a blue shoes |
| tp2_20260801_v10_odd_d1_8779b8931eb02dd3cc15 | Are he allergic to anything? | afraid to anything |
| tp2_20260801_v10_odd_d1_92775ae7f8aa2f324a14 | You does a great job. | a great work |
| tp2_20260801_v10_odd_d1_9c96e49e8bcfab44131b | She close the door at night. | at evening |
| tp2_20260801_v10_odd_d1_b1b1ace60dc42c00ae6e | You do an great job. | a great work |
| tp2_20260801_v10_odd_d1_b6dcb3fdb022d971d3ce | How many nights are he staying? | How many rooms are you staying |
| tp2_20260801_v10_odd_d1_e13ccf0da741139a4b4b | It be time to say goodbye. | It is day / It is hour to say goodbye |
| tp2_20260801_v10_odd_d1_e8ffda67d00bbee2b787 | Is I far from here? | near from here |
| tp2_20260801_v10_odd_d2_005f891db0faa8833925 | We had a amazing time there. | an long time |
| tp2_20260801_v10_odd_d2_040e693b378646c20f66 | Do you have an rain jacket? | a rain boots |
| tp2_20260801_v10_odd_d2_061beebbb7cca77fcbc5 | There is an small menu in English | menue |
| tp2_20260801_v10_odd_d2_0e80531379347502a64e | Yesterday I made an big soup. | a big rice |
| tp2_20260801_v10_odd_d2_1449cf253dcfcb23599a | I stayed home for an week. | stayed hospital / stayed school |
| tp2_20260801_v10_odd_d2_15485c6f6a3a796f509d | I feels sick every morning. | every mornings |
| tp2_20260801_v10_odd_d2_17c4de2e9abb78408383 | I am working on an new project | a old project |
| tp2_20260801_v10_odd_d2_1a3c4d6357d37d2a19b3 | I does not have access to the file. | have page / screen to the file |
| tp2_20260801_v10_odd_d2_225b7b228dec849a143b | they am stuck on this part. | sure on this part |
| tp2_20260801_v10_odd_d2_3259ac83d62314156bdb | It be warm and beautiful outside. | warm and did outside |
| tp2_20260801_v10_odd_d2_3d7c0001b76bc12b9ed8 | We took an long walk in the forest. | a easy walk |
| tp2_20260801_v10_odd_d2_3eeb35c5d2ba4699f7b8 | We saw an wild deer yesterday. | a old deer |
| tp2_20260801_v10_odd_d2_3fdd0e8984008ce3e8ae | There is an great Italian restaurant | Italians restaurant |
| tp2_20260801_v10_odd_d2_519b6761ef305c9b8628 | If you be tired, we can stay home. | stay place |
| tp2_20260801_v10_odd_d2_525aef8797a94fa7c475 | Could I sees the price tag? | the price did |
| tp2_20260801_v10_odd_d2_5656c941669f4f51f3b8 | Then you boils them in water | in waters |
| tp2_20260801_v10_odd_d2_62537b3b587e93566f7b | Can you move back an little? | a big / a much |
| tp2_20260801_v10_odd_d2_811da34a2059a8107103 | Be it far from here? | near from here |
| tp2_20260801_v10_odd_d2_8af6f88dde8256df7ce5 | I be working on a new project | a old project |
| tp2_20260801_v10_odd_d2_92120100edeeaefb39d9 | We is going to have dinner with them. | have argument / have meeting |
| tp2_20260801_v10_odd_d2_92e8c6b602afae4d593b | Do guests bring an small gift? | a arrive gift |
| tp2_20260801_v10_odd_d2_935cf8595fc7c6359992 | She gave me an good piece of advice. | piece of idea |
| tp2_20260801_v10_odd_d2_96b9a9eac53325cb2251 | Do you have an medium size? | a extra size |
| tp2_20260801_v10_odd_d2_9ef97e43cf5594a20e70 | I does not sleep well at night. | at morning / at week |
| tp2_20260801_v10_odd_d2_a6954f53958b23bfb0a1 | Can I gets a gift bag? | a gift bags |
| tp2_20260801_v10_odd_d2_b2f202025b9f281bae0b | I bought an beautiful scarf for my wife. | a beautifully scarf |
| tp2_20260801_v10_odd_d2_b64c0896b2c7445a1b3c | They be not watching TV right now. | watching film / phone |
| tp2_20260801_v10_odd_d2_c54a9318323536027a8f | Our capital is an beautiful old city. | a ugly old city |
| tp2_20260801_v10_odd_d2_c8f5195ef3f9732e4c02 | Can you recommend an good book? | a old book |
| tp2_20260801_v10_odd_d2_ccbae56da27d00a998af | I have an high temperature today. | a high temperatures |
| tp2_20260801_v10_odd_d2_d61d145668f7b53b54b5 | Do you have an student discount? | a adult discount |
| tp2_20260801_v10_odd_d2_d99bb1354708ba52bbe6 | Are he working from home today? | from hospital / from shop |
| tp2_20260801_v10_odd_d2_db8f9df9625f22f619e0 | I are stuck on this part. | sure on this part |
| tp2_20260801_v10_odd_d2_df9286ce110b7348e071 | How much am it to Spain | to here |
| tp2_20260801_v10_odd_d2_eaa37dff690fcf01a8ce | Is you far from here? | near from here |
| tp2_20260801_v10_odd_d2_edfd7ae4c1241f532c4b | I are going to have dinner with them. | have argument / have meeting |
| tp2_20260801_v10_odd_d2_f59a22776cd177178082 | She am really proud of the team. | late of / heavy of the team |
