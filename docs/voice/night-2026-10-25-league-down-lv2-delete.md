# Голос PhraseMan: тексты ночи 25.10 — спуск в лиге Пика, Learning V2 ×9, вычитка удаления (Переводчик)

Голос: `docs/work/VOICE.md`. Порядок языков: ru, uk, en, es, pt-BR, vi, id, tr, pl. Подстановки не трогать.

## 1. Пик: спуск в лиге — без зашитых чисел (для Моментов, `moments_strings.ts`)

Решение координатора: правило спуска — «нижние 15 % комнаты и все без ступеней». В тексте не называем ни «пятёрку», ни
проценты: в неполной комнате это неправда. Строк две, выбор по причине спуска.

| Ключ | ru | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|---|
| (а) нижняя зона комнаты | Неделя в самом низу комнаты — спускаемся в {league}. Отыграемся! | Тиждень у самому низу кімнати — спускаємось у {league}. Відіграємося! | A week at the bottom of the room — down to {league}. We’ll bounce back! | Una semana en lo más bajo de la sala: bajamos a {league}. ¡Nos recuperamos! | Uma semana lá embaixo na sala — descemos para {league}. A gente dá a volta! | Một tuần ở cuối phòng — xuống {league}. Mình sẽ gỡ lại! | Seminggu di dasar ruangan — turun ke {league}. Kita balas nanti! | Bu hafta odanın en altındaydın — {league} ligine iniyoruz. Telafi ederiz! | Tydzień na samym dole pokoju — schodzimy do ligi {league}. Odegramy się! |
| (б) 0 ступеней за неделю | Неделя без единой ступени — спускаемся в {league}. Башня соскучилась! | Тиждень без жодної сходинки — спускаємось у {league}. Вежа скучила! | A week without a single step — down to {league}. The tower missed you! | Una semana sin un solo escalón: bajamos a {league}. ¡La torre te echó de menos! | Uma semana sem nenhum degrau — descemos para {league}. A torre sentiu sua falta! | Một tuần không leo bậc nào — xuống {league}. Tòa tháp nhớ bạn đấy! | Seminggu tanpa satu anak tangga pun — turun ke {league}. Menaranya kangen! | Bir hafta hiç basamak yok — {league} ligine iniyoruz. Kule seni özledi! | Tydzień bez ani jednego stopnia — schodzimy do ligi {league}. Wieża się stęskniła! |

(б) — подмигивание без укора: виновата не лень человека, а «башня соскучилась». «Спускаемся» на «мы» — как во всех строках
Пика: человек не один. Если на экране Пика вместо «комнаты» другое слово (группа, этаж) — замените только его, остальное как есть.

Эти строки заменяют вариант «пятёрки последних» из «Пачки 2б» в `docs/work/copy-sweep-2026-10-25.md`.

## 2. Learning V2: 7 языков к строкам, где в ru/uk поменялся смысл (для Learning V2)

| Ключ | ru | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|---|
| `saveFirstEver` | Первая карточка в коллекции! Тренируй её когда угодно в «Карточках» | Перша картка в колекції! Тренуй її будь-коли в «Картках» | First card in your collection! Practice it anytime in Cards | ¡Primera tarjeta en tu colección! Practícala cuando quieras en Tarjetas | Primeiro cartão na coleção! Pratique quando quiser em Cartões | Thẻ đầu tiên trong bộ sưu tập! Luyện bất cứ lúc nào ở mục Thẻ | Kartu pertama di koleksimu! Latih kapan saja di Kartu | Koleksiyondaki ilk kart! İstediğin zaman Kartlar’da çalış | Pierwsza karta w kolekcji! Ćwicz ją kiedy chcesz w Kartach |
| `repeatedAloud` | Повторено вслух | Повторено вголос | Said out loud | Dicho en voz alta | Falado em voz alta | Đã nói thành tiếng | Sudah diucapkan | Sesli söylendi | Powiedziane na głos |
| «Твой ответ» (подпись над распознанным) | Твой ответ | Твоя відповідь | Your answer | Tu respuesta | Sua resposta | Câu trả lời của bạn | Jawabanmu | Cevabın | Twoja odpowiedź |
| то же в озвучке для незрячих | `{stars} из 3 звёзд, {verdict}. Твой ответ: {text}` | `{stars} з 3 зірок, {verdict}. Твоя відповідь: {text}` | `{stars} of 3 stars, {verdict}. Your answer: {text}` | `{stars} de 3 estrellas, {verdict}. Tu respuesta: {text}` | `{stars} de 3 estrelas, {verdict}. Sua resposta: {text}` | `{stars}/3 sao, {verdict}. Câu trả lời của bạn: {text}` | `{stars} dari 3 bintang, {verdict}. Jawabanmu: {text}` | `3 yıldızdan {stars}, {verdict}. Cevabın: {text}` | `{stars} z 3 gwiazdek, {verdict}. Twoja odpowiedź: {text}` |
| `WRONG_VERDICT_BY_LOCALE` | Не то. Попробуй ещё раз | Не те. Спробуй ще раз | Not that one. Try again | No es eso. Inténtalo otra vez | Não é isso. Tente de novo | Chưa đúng. Thử lại nhé | Belum tepat. Coba lagi | Olmadı. Tekrar dene | Nie to. Spróbuj jeszcze raz |
| `newWordFlipHint` (вы → ты) | Нажми на карточку — она перевернётся | Натисни на картку — вона перевернеться | Tap the card to flip it | Toca la tarjeta para darle la vuelta | Toque no cartão para virar | Chạm vào thẻ để lật | Ketuk kartu untuk membaliknya | Kartı çevirmek için dokun | Dotknij karty, żeby ją odwrócić |
| `answer` (вы → ты) | Ответь | Дай відповідь | Answer | Responde | Responda | Trả lời | Jawab | Cevap ver | Odpowiedz |

Названия раздела («Карточки» / Cards / Tarjetas …) сверить с подписью вкладки в этом языке и взять её дословно. pt-BR в
приложении на «você», поэтому «Responda» и «Toque», а не «Responde».

### Новая подпись: судья не успел (медленный телефон, таймаут)

| Ключ | ru | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|---|
| «Не успел разобрать» | Не успел разобрать — скажи ещё раз | Не встиг розібрати — скажи ще раз | Didn’t catch that in time — say it again | No me dio tiempo a entenderlo: dilo otra vez | Não deu tempo de entender — fala de novo | Mình chưa kịp nghe ra — nói lại nhé | Belum sempat menangkap — ucapkan lagi ya | Yetişemedim — bir daha söyle | Nie zdążyłem rozpoznać — powiedz jeszcze raz |

Мужской род у приложения («не успел», «не разобрал») — как в соседних строках SpeakingPanel; род ученика не угадываем.
Если подписи нужно короче (под кнопкой ≤ 60 знаков) — все строки выше влезают.

Экзамен v2 («Где споткнулся», «Опечатка — пишется») по слову координатора взят из утверждённого владельцем прототипа и
не трогается. Мои варианты для этих двух строк в `learning-v2-visible-copy-voice-return-2026-10-25.md` снимаются.

## 3. Вычитка удаления аккаунта (для 5 · ВХОД)

- `handoffFailed` (`components/account/delete_account_variant_b_copy.ts`): черновик верный — тепло, честно, без шуток; что
  случилось и что делать, понятно. Поправил одно слово в es: «No salió» → «No funcionó» (для окна удаления «No salió» слишком
  разговорно). Остальные 8 оставлены как есть.
- «3 из 32 · уроков» (`app/account_restore_summary_copy.ts`): все 9 верны. В vi и tr «3/32» правильно — «3 trên 32» и
  «32 dersten 3» в плашке звучат громоздко, а дробь там читают как «3 из 32». В ru/uk/pl «уроков/уроків/lekcji» под числом
  согласуется с «из 32». Править нечего.
