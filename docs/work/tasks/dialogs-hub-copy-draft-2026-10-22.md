# Хаб Диалогов: черновик текстов на 8 языках (Переводчик, по макету 556e3086c)

Status: Draft v2 — ответы координатора учтены; владелец выбрал вариант 2. Сверка строк — по новому макету от 2 · ДИЗАЙН (хэш ждём)
Owner: «10 · ПЕРЕВОДЧИК» (поручение координатора 22.10)

Источник: `docs/design/v2-app/dialogs-hub.html` (556e3086c), все три варианта. Порядок колонок как в
`components/dialogs/scene/dialogs_scene_copy.ts`: ru (дословно из макета), uk, en, es, pt-BR, vi, id, tr, pl.

## Сколько места на плитке

Плитка в макете: 58 px высотой, подпись 13/15, жирная, под значком. Влезает одна строка. Вариант 1 делит
342 px в пропорции 1 : 1,5 : 1, это даёт примерно 86 px текста на «Все диалоги» и «Пройденные» и 134 px на
«Свободный диалог». Эталон ширины — русская подпись: «Все диалоги» (11 знаков) занимает около 80 px. Если
перевод длиннее эталона больше чем на пару знаков, ставлю короткое слово, а полный вариант пишу в примечании.
В вариантах 2 и 3 «Свободный диалог» — широкая плитка, места хватает с запасом.

## Плитки и подписи

| ключ | ru | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|---|
| allDialogs | Все диалоги | Усі діалоги | All dialogues | Todos los diálogos | Todos os diálogos | Mọi hội thoại | Semua dialog | Tüm diyaloglar | Wszystkie dialogi |
| freeDialog | Свободный разговор | Вільна розмова | Open conversation | Conversación libre | Conversa livre | Trò chuyện tự do | Percakapan bebas | Serbest konuşma | Swobodna rozmowa |
| doneTile | Пройденные | Пройдені | Completed | Completados | Concluídos | Đã xong | Selesai | Tamamlanan | Ukończone |
| nextLabel | Дальше | Далі | Up next | Siguientes | A seguir | Tiếp theo | Berikutnya | Sıradakiler | Dalej |
| available | {n} доступно | {n} доступно | {n} available | {n} disponibles | {n} disponíveis | {n} đang mở | {n} tersedia | {n} açık | {n} dostępne* |
| ofPair (k из n) | {k} из {n} | {k} з {n} | {k} of {n} | {k} de {n} | {k} de {n} | {k}/{n} | {k} dari {n} | {k}/{n} | {k} z {n} |
| topics | Темы | Теми | Topics | Temas | Temas | Chủ đề | Topik | Konular | Tematy |
| firstDialog | Первый диалог | Перший діалог | First dialogue | Primer diálogo | Primeiro diálogo | Hội thoại đầu tiên | Dialog pertama | İlk diyalog | Pierwszy dialog |
| doneRow (статус строки) | Пройден | Пройдено | Completed | Completado | Concluído | Đã xong | Selesai | Tamamlandı | Ukończony |
| rank | Ранг {n} | Ранг {n} | Rank {n} | Rango {n} | Rank {n} | Hạng {n} | Peringkat {n} | Rütbe {n} | Ranga {n} |
| dialogsCount | {n} диалогов* | {n} діалогів* | {n} dialogues | {n} diálogos | {n} diálogos | {n} hội thoại | {n} dialog | {n} diyalog | {n} dialogów* |

\* Числа со склонением:
- `available` для pl: 1 — «dostępny», 2–4 — «dostępne», 5 и больше — «dostępnych». Для es и pt-BR при 1 — «disponible» / «disponível».
- `dialogsCount` для ru: «диалог / диалога / диалогов», для uk: «діалог / діалоги / діалогів», для pl: «dialog / dialogi / dialogów».
  Для en, es и pt-BR при 1 — единственное число. Склонять так же, как `slavicForm` в `dialogs_scene_copy.ts`.

## Уже есть в приложении: берём оттуда, не дублируем

- «k из n» — это `ofPair`. Он же даёт пилюлю «18 из 30».
- «Все диалоги пройдены», «Начать», «Продолжить», «Все» (фильтр тем), «с {who}» — уже есть в `DIALOGS_SCENE_COPY`.
- «N целей» и «2 из N целей» — это `dialogsSceneGoalsLabel` и `dialogsSceneGoalsDoneLabel`.
- Названия миров уже переведены в `DialogueV2CatalogueContainer.tsx`.

## Решения координатора 22.10 (вопросы закрыты)

1. Название — как в приложении: **«Свободный разговор»**, ничего не переименовываем. Переводы взяты из кода
   (`DialogsTabContent.tsx`, `app/ai_companion_session.tsx`). ⚠️ В `DialogueV2PlusTools.tsx` для id и tr стоят другие слова:
   «Obrolan bebas» и «Serbest sohbet» вместо «Percakapan bebas» и «Serbest konuşma». В хабе беру вариант, который встречается
   в коде чаще. Выравнивание PlusTools — отдельная точечная правка, если координатор скажет.
2. Основа — **вариант 2**: «Свободный разговор» и «Все диалоги» — широкие плитки, темы — плитки 2 × 2. В широкой плитке
   помещаются полные формы, поэтому «Catálogo» и «Katalog» больше не нужны. Короткие слова остаются запасом, если
   на склейке что-то не влезет.
3. Темы — как в приложении. Источник — утверждённый `shared/generated/dialogue_v2_ui_copy.<lang>.json` (`worlds`):
   ru «Общение / Дела / Поездки / Повседневное», uk «Спілкування / Справи / Поїздки / Повсякденне»,
   en «Social / Work / Travel / Everyday», es «Social / Trabajo / Viajes / Día a día»,
   pt-BR «Conversas / Trabalho / Viagens / Dia a dia», vi «Giao tiếp / Công việc / Chuyến đi / Đời thường»,
   id «Pergaulan / Urusan / Perjalanan / Sehari-hari», tr «Sohbet / İşler / Yolculuklar / Gündelik hayat»,
   pl «Rozmowy / Sprawy / Podróże / Codzienność». Подписи-заглушки в `DialogueV2CatalogueContainer.tsx` («Каждый день»
   и т. п.) срабатывают, только если в json нет строки.
4. en «All dialogues» — ок, плитка широкая.

Строки сверю с новым макетом (его переделывают по описи кода), когда 2 · ДИЗАЙН пришлёт хэш.
