# Главная · 12 новых состояний сцены — строки ×9 (Переводчик → 8 · МОМЕНТЫ, координатор 25.10)

Status: Готово к вставке; ключи — предложение, согласовать с 8 · МОМЕНТЫ (подключают сцены)
Owner: «10 · ПЕРЕВОДЧИК»

Источник: `docs/work/tasks/home-scene-new-states-spec-2026-10-25.md`, живой макет `docs/design/v2-app/home-new-states.html` (a5618fcc4).
Порядок в кортежах: ru, uk, en, es, pt-BR, vi, id, tr, pl. На «ты», без «кухни» (механики, жаргона, времени ради времени).
Названия разделов — как в приложении: «Мои ошибки» (Mis errores / Meus erros / Lỗi của tôi / Kesalahanku / Hatalarım / Moje błędy),
«Фраза дня» (`DailyPhraseCard`: Phrase of the day / Frase del día / Frase do dia / Cụm từ hôm nay / Frasa hari ini / Günün ifadesi / Fraza dnia; uk «Вислів дня»),
«Карточки» (`home_continue_mark`: Cards / Tarjetas / Cartões / Thẻ học / Kartu / Kartlar / Karty), Пик (Peak / Pico / Đỉnh / Puncak / Zirve / Szczyt),
«Комната недели» (`spire_strings.roomWeek`).

## Подстановки и формы числа

`{n}`, `{a}`, `{b}`, `{h}` — числа; `{w}` — слово в форме по числу (ru/uk/pl — три формы `one/few/many`, en/es/pt-BR — `one/other`, vi/id/tr — одна форма).
`{name}` — имя друга как есть (не склоняем, пол не угадываем — поэтому имя стоит перед двоеточием). `{phrase}`, `{word}` — английский текст как есть.
`{date}` — дата, отформатированная кодом по языку.

```ts
// ошибка (mistakes_pile: «Накопилось {n} {w}»)
mistakeW: { ru: ['ошибка', 'ошибки', 'ошибок'], uk: ['помилка', 'помилки', 'помилок'], pl: ['błąd', 'błędy', 'błędów'] },
// фраза (milestone «{n} {w}!», fun_stats «{n} {w} вслух»)
phraseW: { ru: ['фраза', 'фразы', 'фраз'], uk: ['фраза', 'фрази', 'фраз'], pl: ['zdanie', 'zdania', 'zdań'], en: ['phrase', 'phrases'], es: ['frase', 'frases'], 'pt-BR': ['frase', 'frases'] },
// раз (fun_stats «… {n} {w}»)
timesW: { ru: ['раз', 'раза', 'раз'], uk: ['раз', 'рази', 'разів'], pl: ['raz', 'razy', 'razy'], en: ['time', 'times'], es: ['vez', 'veces'], 'pt-BR': ['vez', 'vezes'] },
// урок (milestone «{n} {w}!», friend_nudge)
lessonW: { ru: ['урок', 'урока', 'уроков'], uk: ['урок', 'уроки', 'уроків'], pl: ['lekcja', 'lekcje', 'lekcji'], en: ['lesson', 'lessons'], es: ['lección', 'lecciones'], 'pt-BR': ['lição', 'lições'] },
// задание (personal_best)
taskW: { ru: ['задание', 'задания', 'заданий'], uk: ['завдання', 'завдання', 'завдань'], pl: ['zadanie', 'zadania', 'zadań'], en: ['task', 'tasks'], es: ['tarea', 'tareas'], 'pt-BR': ['tarefa', 'tarefas'] },
// слово (words_due «Пора повторить {n} {w}»)
wordW: { ru: ['слово', 'слова', 'слов'], uk: ['слово', 'слова', 'слів'], pl: ['słowo', 'słowa', 'słów'], en: ['word', 'words'], es: ['palabra', 'palabras'], 'pt-BR': ['palavra', 'palavras'] },
// новое слово (weekly_recap)
newWordW: { ru: ['новое слово', 'новых слова', 'новых слов'], uk: ['нове слово', 'нові слова', 'нових слів'], pl: ['nowe słowo', 'nowe słowa', 'nowych słów'], en: ['new word', 'new words'], es: ['palabra nueva', 'palabras nuevas'], 'pt-BR': ['palavra nova', 'palavras novas'] },
// день (weekly_recap «{a} {w} из 7»)
dayW: { ru: ['день', 'дня', 'дней'], uk: ['день', 'дні', 'днів'], pl: ['dzień', 'dni', 'dni'], en: ['day', 'days'], es: ['día', 'días'], 'pt-BR': ['dia', 'dias'] },
// монета (weekly_recap «+{n} {w}»)
coinW: { ru: ['монета', 'монеты', 'монет'], uk: ['монета', 'монети', 'монет'], pl: ['moneta', 'monety', 'monet'], en: ['coin', 'coins'], es: ['moneda', 'monedas'], 'pt-BR': ['moeda', 'moedas'] },
// vi/id/tr — без форм: lỗi / câu / lần / bài / bài / từ / từ mới / ngày / xu; kesalahan / frasa / kali / pelajaran / tugas / kata / kata baru / hari / koin;
// hata / ifade / kez / ders / görev / kelime / yeni kelime / gün / jeton.
```

## Строки по состояниям

```ts
// 1. mistakes_pile — «Накопились ошибки»
pileKicker: ['Мои ошибки', 'Мої помилки', 'My mistakes', 'Mis errores', 'Meus erros', 'Lỗi của tôi', 'Kesalahanku', 'Hatalarım', 'Moje błędy'],
pileTitle: ['Накопилось {n} {w}', 'Накопичилося {n} {w}', '{n} mistakes have piled up', 'Se acumularon {n} errores', 'Acumularam {n} erros', 'Đã dồn lại {n} lỗi', '{n} kesalahan menumpuk', '{n} hata birikti', 'Uzbierało się {n} {w}'],
pileLine: ['Половину можно разобрать прямо сейчас', 'Половину можна розібрати просто зараз', 'You can clear half of them right now', 'Puedes repasar la mitad ahora mismo', 'Dá para revisar metade agora mesmo', 'Có thể ôn một nửa ngay bây giờ', 'Separuhnya bisa dibahas sekarang juga', 'Yarısını hemen şimdi çözebilirsin', 'Połowę możesz przejrzeć od razu'],
pileCta: ['Разобрать', 'Розібрати', 'Review', 'Repasar', 'Revisar', 'Ôn lại', 'Bahas', 'Gözden geçir', 'Przejrzyj'],

// 2. mistake_poke — «Серьёзно?»
pokeKicker: ['Ошибка из твоего списка', 'Помилка з твого списку', 'A mistake from your list', 'Un error de tu lista', 'Um erro da sua lista', 'Một lỗi trong danh sách của bạn', 'Kesalahan dari daftarmu', 'Listendeki bir hata', 'Błąd z twojej listy'],
pokeTitle: ['Серьёзно? Опять «{phrase}»?', 'Серйозно? Знову «{phrase}»?', 'Seriously? "{phrase}" again?', '¿En serio? ¿Otra vez «{phrase}»?', 'Sério? «{phrase}» de novo?', 'Thật sao? Lại «{phrase}» nữa à?', 'Serius? «{phrase}» lagi?', 'Ciddi mi? Yine mi «{phrase}»?', 'Serio? Znowu „{phrase}”?'],
// подсказка для ошибки «лишнее слово» (макет: «Без am — и всё верно»); для других типов ошибок — своя строка, пришлите типы
pokeLineExtraWord: ['Без {word} — и всё верно', 'Без {word} — і все правильно', "Drop {word} and it's right", 'Sin {word}, y está bien', 'Sem {word}, e fica certo', 'Bỏ {word} là đúng', 'Tanpa {word}, sudah benar', '{word} olmadan doğru', 'Bez {word} — i jest dobrze'],
pokeCta: ['Исправить', 'Виправити', 'Fix it', 'Corregir', 'Corrigir', 'Sửa', 'Perbaiki', 'Düzelt', 'Popraw'],

// 3. phrase_of_day_unseen — «Фраза дня»
podKicker: ['Фраза дня', 'Вислів дня', 'Phrase of the day', 'Frase del día', 'Frase do dia', 'Cụm từ hôm nay', 'Frasa hari ini', 'Günün ifadesi', 'Fraza dnia'],
podCta: ['Послушать', 'Послухати', 'Listen', 'Escuchar', 'Ouvir', 'Nghe', 'Dengarkan', 'Dinle', 'Posłuchaj'],
podChipSave: ['В карточки', 'До карток', 'Save to Cards', 'A Tarjetas', 'Para Cartões', 'Vào Thẻ học', 'Ke Kartu', 'Kartlara ekle', 'Do Kart'],

// 4. fun_stats — «Про тебя» (три факта по кругу)
funKicker: ['Про тебя', 'Про тебе', 'About you', 'Sobre ti', 'Sobre você', 'Về bạn', 'Tentang kamu', 'Senin hakkında', 'O tobie'],
funAloudTitle: ['{n} {w} вслух', '{n} {w} вголос', '{n} {w} out loud', '{n} {w} en voz alta', '{n} {w} em voz alta', '{n} câu nói thành tiếng', '{n} frasa diucapkan', '{n} ifade sesli', '{n} {w} na głos'],
// макет: «Это три часа разговора» — число часов из статистики; {h} — целое число часов
funAloudLine: ['Это около {h} ч разговора', 'Це близько {h} год розмови', "That's about {h} h of talking", 'Son unas {h} h de conversación', 'São cerca de {h} h de conversa', 'Khoảng {h} giờ trò chuyện', 'Sekitar {h} jam percakapan', 'Yaklaşık {h} saatlik konuşma', 'To około {h} godz. rozmowy'],
funWordTitle: ['Слово недели — «{word}»', 'Слово тижня — «{word}»', 'Word of the week: "{word}"', 'Palabra de la semana: «{word}»', 'Palavra da semana: «{word}»', 'Từ của tuần: «{word}»', 'Kata minggu ini: «{word}»', 'Haftanın kelimesi: «{word}»', 'Słowo tygodnia: „{word}”'],
// макет: «Ты сказал его 31 раз» — род ученика угадывать нельзя; нейтрально
funWordLine: ['Звучало в твоих ответах {n} {w}', 'Звучало у твоїх відповідях {n} {w}', "You've said it {n} {w}", 'Lo has dicho {n} {w}', 'Você disse {n} {w}', 'Bạn đã nói {n} lần', 'Kamu sudah mengucapkannya {n} kali', '{n} kez söyledin', 'Padło w twoich odpowiedziach {n} {w}'],
funFasterTitle: ['Быстрее {a} из {b}', 'Швидше за {a} з {b}', 'Faster than {a} of {b}', 'Más rápido que {a} de {b}', 'Mais rápido que {a} de {b}', 'Nhanh hơn {a}/{b} người', 'Mengungguli {a} dari {b} orang', '{b} kişi içinde {a} kişiden hızlısın', 'Szybciej niż {a} z {b}'],
funFasterLine: ['В твоей комнате недели', 'У твоїй кімнаті тижня', 'In your room of the week', 'En tu sala de la semana', 'Na sua sala da semana', 'Trong phòng của tuần', 'Di ruang minggu ini', 'Haftanın odasında', 'W twoim pokoju tygodnia'],
funCta: ['Моя статистика', 'Моя статистика', 'My stats', 'Mis estadísticas', 'Minhas estatísticas', 'Thống kê của tôi', 'Statistikku', 'İstatistiklerim', 'Moje statystyki'],

// 5. milestone — «Новый рубеж» (100 фраз / 10 уроков / новый ранг монеты)
mileKicker: ['Новый рубеж', 'Новий рубіж', 'New milestone', 'Nuevo hito', 'Novo marco', 'Cột mốc mới', 'Pencapaian baru', 'Yeni eşik', 'Nowy próg'],
milePhrasesTitle: ['{n} {w}!', '{n} {w}!', '{n} {w}!', '¡{n} {w}!', '{n} {w}!', '{n} câu!', '{n} frasa!', '{n} ifade!', '{n} {w}!'],
mileLessonsTitle: ['{n} {w}!', '{n} {w}!', '{n} {w}!', '¡{n} {w}!', '{n} {w}!', '{n} bài!', '{n} pelajaran!', '{n} ders!', '{n} {w}!'],
mileRankTitle: ['Новый ранг монеты!', 'Новий ранг монети!', 'New coin rank!', '¡Nuevo rango de moneda!', 'Novo rank da moeda!', 'Hạng xu mới!', 'Peringkat koin baru!', 'Yeni jeton rütbesi!', 'Nowa ranga monety!'],
milePhrasesLine: ['Это уже настоящий разговорник', 'Це вже справжній розмовник', "That's a real phrasebook now", 'Ya es todo un libro de frases', 'Já é um guia de conversação de verdade', 'Giờ đã thành cuốn sổ tay hội thoại thật sự', 'Sudah jadi buku frasa sungguhan', 'Artık gerçek bir konuşma kılavuzu', 'To już prawdziwe rozmówki'],
mileCta: ['Посмотреть', 'Переглянути', 'Take a look', 'Ver', 'Ver', 'Xem', 'Lihat', 'Göz at', 'Zobacz'],

// 6. personal_best — «Рекорд дня»
bestKicker: ['Твой рекорд — {n} {w}', 'Твій рекорд — {n} {w}', 'Your record: {n} {w}', 'Tu récord: {n} {w}', 'Seu recorde: {n} {w}', 'Kỷ lục của bạn: {n} bài', 'Rekormu: {n} tugas', 'Rekorun: {n} görev', 'Twój rekord: {n} {w}'],
bestTitle: ['Побьёшь сегодня?', 'Поб’єш сьогодні?', 'Beat it today?', '¿Lo superas hoy?', 'Vai bater hoje?', 'Hôm nay phá kỷ lục chứ?', 'Pecahkan hari ini?', 'Bugün kırar mısın?', 'Pobijesz dziś?'],
bestLine: ['{a} из {b}', '{a} з {b}', '{a} of {b}', '{a} de {b}', '{a} de {b}', '{a}/{b}', '{a} dari {b}', '{a}/{b}', '{a} z {b}'],
// кнопка — существующая «Продолжить»

// 7. words_due — «Слова на повтор» (макет: «12 слов просятся на повтор»; переставлено, чтобы глагол не спорил с числом: «21 слово просятся»)
wordsKicker: ['Карточки', 'Картки', 'Cards', 'Tarjetas', 'Cartões', 'Thẻ học', 'Kartu', 'Kartlar', 'Karty'],
wordsTitle: ['Пора повторить {n} {w}', 'Час повторити {n} {w}', 'Time to review {n} {w}', 'Hora de repasar {n} {w}', 'Hora de revisar {n} {w}', 'Đến lúc ôn {n} từ', 'Saatnya mengulang {n} kata', '{n} kelimeyi tekrar etme zamanı', 'Czas powtórzyć {n} {w}'],
wordsLine: ['Пока не забылись', 'Поки не забулися', 'Before they slip away', 'Antes de que se olviden', 'Antes que escapem da memória', 'Trước khi quên mất', 'Sebelum terlupa', 'Unutmadan önce', 'Zanim wylecą z głowy'],
wordsCta: ['Повторить', 'Повторити', 'Review', 'Repasar', 'Revisar', 'Ôn tập', 'Ulangi', 'Tekrar et', 'Powtórz'],

// 8. friend_nudge — «Друг сегодня» (макет: «Аня прошла 3 урока сегодня» — имя не склоняем, род не угадываем)
friendKicker: ['Друзья', 'Друзі', 'Friends', 'Amigos', 'Amigos', 'Bạn bè', 'Teman', 'Arkadaşlar', 'Znajomi'],
friendTitle: ['{name}: сегодня {n} {w}', '{name}: сьогодні {n} {w}', '{name}: {n} {w} today', '{name}: {n} {w} hoy', '{name}: {n} {w} hoje', '{name}: {n} bài hôm nay', '{name}: {n} pelajaran hari ini', '{name}: bugün {n} ders', '{name}: dziś {n} {w}'],
friendLine: ['Догонишь?', 'Наздоженеш?', 'Catch up?', '¿Te pones al día?', 'Bora alcançar?', 'Bắt kịp nhé?', 'Mau menyusul?', 'Yetişir misin?', 'Dogonisz?'],
friendCta: ['Догнать', 'Наздогнати', 'Catch up', 'Alcanzar', 'Alcançar', 'Bắt kịp', 'Susul', 'Yetiş', 'Dogoń'],

// 9. peak_overtaken — «Тебя обогнали» (число места — отдельная плашка, строка идёт после него)
peakKicker: ['Пик · комната недели', 'Пік · кімната тижня', 'Peak · room of the week', 'Pico · sala de la semana', 'Pico · sala da semana', 'Đỉnh · phòng của tuần', 'Puncak · ruang minggu ini', 'Zirve · haftanın odası', 'Szczyt · pokój tygodnia'],
peakTitle: ['Тебя обогнали', 'Тебе обігнали', 'Someone passed you', 'Te adelantaron', 'Passaram na sua frente', 'Bạn đã bị vượt', 'Kamu tersalip', 'Seni geçtiler', 'Ktoś cię wyprzedził'],
peakLine: ['место — вернёшь?', 'місце — повернеш?', 'place — take it back?', 'puesto — ¿lo recuperas?', 'lugar — vai recuperar?', 'hạng — giành lại chứ?', 'peringkat — rebut lagi?', '. sıra — geri alır mısın?', 'miejsce — odzyskasz?'],
peakCta: ['В Пик', 'До Піку', 'To Peak', 'Al Pico', 'Para o Pico', 'Về Đỉnh', 'Ke Puncak', "Zirve'ye", 'Do Szczytu'],

// 10. holiday — праздник (31.10; 31.12–01.01)
halloweenKicker: ['{date} · Хэллоуин', '{date} · Гелловін', '{date} · Halloween', '{date} · Halloween', '{date} · Halloween', '{date} · Halloween', '{date} · Halloween', '{date} · Cadılar Bayramı', '{date} · Halloween'],
halloweenTitle: ['Страшно полезный урок', 'Страшенно корисний урок', 'A frightfully useful lesson', 'Una lección terroríficamente útil', 'Uma lição assustadoramente útil', 'Bài học hữu ích đến rợn người', 'Pelajaran seram tapi berguna', 'Korkunç derecede faydalı bir ders', 'Strasznie przydatna lekcja'],
newYearKicker: ['Новый год', 'Новий рік', 'New Year', 'Año Nuevo', 'Ano-Novo', 'Năm mới', 'Tahun Baru', 'Yılbaşı', 'Nowy Rok'],
newYearTitle: ['Новый год — новые фразы', 'Новий рік — нові фрази', 'New year, new phrases', 'Año nuevo, frases nuevas', 'Ano novo, frases novas', 'Năm mới, câu mới', 'Tahun baru, frasa baru', 'Yeni yıl, yeni ifadeler', 'Nowy rok, nowe zwroty'],
holidayLine: ['Урок {l} · Эпизод {e}', 'Урок {l} · Епізод {e}', 'Lesson {l} · Episode {e}', 'Lección {l} · Episodio {e}', 'Lição {l} · Episódio {e}', 'Bài {l} · Tập {e}', 'Pelajaran {l} · Episode {e}', 'Ders {l} · Bölüm {e}', 'Lekcja {l} · Odcinek {e}'],
// кнопка — существующая «Продолжить»

// 11. weekly_recap — «Итоги недели» (три мини-слайда)
weekKicker: ['Итоги недели', 'Підсумки тижня', 'Your week', 'Tu semana', 'Sua semana', 'Tổng kết tuần', 'Ringkasan minggu', 'Haftanın özeti', 'Podsumowanie tygodnia'],
weekDaysTitle: ['{a} {w} из 7', '{a} {w} з 7', '{a} {w} out of 7', '{a} {w} de 7', '{a} {w} de 7', '{a}/7 ngày', '{a} dari 7 hari', '7 günde {a} gün', '{a} {w} z 7'],
weekDaysLine: ['Почти без пропусков', 'Майже без пропусків', 'Hardly a day missed', 'Casi sin faltar', 'Quase sem faltas', 'Gần như không bỏ ngày nào', 'Hampir tanpa absen', 'Neredeyse hiç kaçırmadın', 'Prawie bez przerw'],
weekWordsTitle: ['{n} {w}', '{n} {w}', '{n} {w}', '{n} {w}', '{n} {w}', '{n} từ mới', '{n} kata baru', '{n} yeni kelime', '{n} {w}'],
weekWordsLine: ['Больше, чем на прошлой неделе', 'Більше, ніж минулого тижня', 'More than last week', 'Más que la semana pasada', 'Mais que na semana passada', 'Nhiều hơn tuần trước', 'Lebih banyak dari minggu lalu', 'Geçen haftadan fazla', 'Więcej niż w zeszłym tygodniu'],
weekCoinsTitle: ['+{n} {w}', '+{n} {w}', '+{n} {w}', '+{n} {w}', '+{n} {w}', '+{n} xu', '+{n} koin', '+{n} jeton', '+{n} {w}'],
weekCoinsLine: ['И ранг всё ближе', 'І ранг усе ближче', 'And the next rank is closer', 'Y el siguiente rango, más cerca', 'E o próximo rank, mais perto', 'Và hạng mới đã gần hơn', 'Dan peringkat berikutnya makin dekat', 'Ve sıradaki rütbe daha yakın', 'A kolejna ranga coraz bliżej'],
weekCta: ['Смотреть итоги', 'Переглянути підсумки', 'See your week', 'Ver resumen', 'Ver resumo', 'Xem tổng kết', 'Lihat ringkasan', 'Özete bak', 'Zobacz podsumowanie'],

// 12. mistake_mastered — «Ошибка выучена»
masteredKicker: ['Мои ошибки', 'Мої помилки', 'My mistakes', 'Mis errores', 'Meus erros', 'Lỗi của tôi', 'Kesalahanku', 'Hatalarım', 'Moje błędy'],
masteredStamp: ['выучено', 'вивчено', 'learned', 'aprendido', 'aprendido', 'đã thuộc', 'sudah hafal', 'öğrenildi', 'opanowane'],
masteredTitle: ['Выучено!', 'Вивчено!', 'Learned!', '¡Aprendido!', 'Aprendido!', 'Đã thuộc!', 'Sudah hafal!', 'Öğrenildi!', 'Opanowane!'],
masteredLine: ['Пять раз подряд без ошибки', 'П’ять разів поспіль без помилки', 'Five times in a row, no mistakes', 'Cinco veces seguidas sin fallar', 'Cinco vezes seguidas sem errar', 'Năm lần liên tiếp không sai', 'Lima kali berturut-turut tanpa salah', 'Üst üste beş kez hatasız', 'Pięć razy z rzędu bez błędu'],
masteredCta: ['Мои ошибки', 'Мої помилки', 'My mistakes', 'Mis errores', 'Meus erros', 'Lỗi của tôi', 'Kesalahanku', 'Hatalarım', 'Moje błędy'],

// time_of_day — не сцена, а строка у «Продолжить»
todMorning: ['С утра — самое то', 'Зранку — саме те', 'Mornings are perfect for this', 'La mañana es ideal para esto', 'De manhã é perfeito', 'Buổi sáng là lúc tuyệt nhất', 'Pagi hari paling pas', 'Sabahlar bunun için ideal', 'Rano to idealna pora'],
todEvening: ['Пара минут перед сном', 'Кілька хвилин перед сном', 'A few minutes before bed', 'Unos minutos antes de dormir', 'Uns minutos antes de dormir', 'Vài phút trước khi ngủ', 'Beberapa menit sebelum tidur', 'Uyumadan önce birkaç dakika', 'Kilka minut przed snem'],
```

## Отступления от макета (ru)

- «Ты сказал его 31 раз» → «Звучало в твоих ответах {n} {w}» — нельзя угадывать род ученика.
- «Аня прошла 3 урока сегодня» → «{name}: сегодня {n} {w}» — нельзя угадывать род друга и склонять имя.
- «12 слов просятся на повтор» → «Пора повторить {n} {w}» — при 21, 31… глагол спорил бы с числом («21 слово просятся»).
- «Это три часа разговора» → «Это около {h} ч разговора» — число часов из статистики, слово «часа» не склоняется по числу у сокращения.
- `pokeLineExtraWord` — только для ошибки «лишнее слово»; для других типов (пропущенное, не то слово) нужны свои строки — пришлите типы.

## Длина

Самые длинные — tr `funFasterTitle` (~32 знака) и es `halloweenTitle` (~33). Заголовок сцены в макете переносится на две строки (класс `long`) — влезает.
