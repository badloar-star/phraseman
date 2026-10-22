# Хаб Диалогов: черновик текстов на 8 языках (Переводчик, по макету 556e3086c)

Status: Draft — ждёт выбора варианта владельцем; после выбора сверю с выбранным вариантом и отдам в код
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
| allDialogs | Все диалоги | Усі діалоги | All dialogues | Catálogo | Catálogo | Tất cả | Semua dialog | Katalog | Wszystkie |
| freeDialog | Свободный диалог | Вільний діалог | Open conversation | Diálogo libre | Conversa livre | Trò chuyện tự do | Obrolan bebas | Serbest sohbet | Swobodna rozmowa |
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

## Что решить до кода (вопросы — координатору)

1. **«Свободный диалог» или «Свободный разговор».** В макете стоит «диалог». В приложении сейчас «Свободный
   разговор» (`DialogueV2PlusTools.tsx`, `DialogsTabContent.tsx`), и переводы сделаны от «разговора». Я оставил
   устоявшиеся переводы. Исключения — uk («Вільний діалог», чтобы совпадало с русским) и es («Diálogo libre»:
   «Conversación libre» длиннее на 5 знаков и в плитку варианта 1 не влезает). Если в приложении тоже
   переименуют в «диалог», поправлю обе старые строки. en «Free dialogue» не беру: free читается как
   «бесплатно», а функция платная.
2. **«Все диалоги» в узкой плитке.** Полный перевод влезает в uk, en и id. Для es, pt-BR и tr предлагаю
   «Catálogo» / «Katalog»: полный вариант («Todos los diálogos», «Tüm diyaloglar») длиннее эталона в 1,3–1,6 раза.
   Для vi — «Tất cả», для pl — «Wszystkie»: над подписью и так стоит счётчик диалогов. В варианте 3 плитка
   шире, и там можно дать полные «Todos los diálogos» / «Todos os diálogos» / «Tüm diyaloglar» / «Mọi hội thoại».
3. **Название мира «Повседневное».** В макете — «Повседневное», в приложении — «Каждый день»
   (`DialogueV2CatalogueContainer.tsx`). Переводы уже есть, но нужно решить, какое русское слово главное.
4. **en «All dialogues».** 13 знаков против 11 у русского. Это предел, но, по моей оценке, влезает. Если на
   склейке не влезет, ставлю «Catalogue».

Все строки после выбора варианта проверю по ширине на склейке «макет | эмулятор» вместе со «Сверкой».
