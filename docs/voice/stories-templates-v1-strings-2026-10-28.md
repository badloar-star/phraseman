# Шаблоны историй v1 — строки на 9 языках (Переводчик, 28.10)

Для: Моменты (внедряют 23 кадра из `docs/design/v2-app/stories-templates-v1.html`), координатор.

## Как читать

- Формат строки — как в `components/stories/story_strings.ts`: девять значений по порядку `ru, uk, en, es, pt-BR, vi, id, tr, pl`.
  Строки ниже можно вставить в объект `S` как есть.
- `{x}` — значение из события. `{x_w}` — слово к числу `{x}` в нужной форме, по таблице «Слова к числам» через `pluralWord()` (`constants/plural.ts`).
  `{cw}` и `{pw}` — монеты, уже считаются в `storyText()` / `momentCoinWord()`.
- Уже переведено и лежит в коде — не дублирую, беру как есть:
  - `story_strings.ts`: `title` «Твои события», `today` «сегодня», `achOverline`, `achNext`, `rankOverline`, `rankTitle`, `rankPaid`, `themeOverline`, `weekResult`, `weekPlace`, `weekCoins`;
  - `moments_strings.ts`: `stayTitle` «Остаёшься в {league}» (с предложным падежом лиги), `floorTag`, названия лиг, названия рубежей серии.
- Данные, которые **не переводятся**: имя друга, название набора, ачивки и темы (из каталогов, уже на 9 языках), текст праздника от администратора, фраза дня и её смысл, код приглашения, месяц и даты.
  Месяц и даты — через `Intl.DateTimeFormat(lang)`, не строкой.
- Без рода: в макете «Ты выиграл», «Марина обогнала тебя», «Тимур принял приглашение». Пол человека мы не знаем, поэтому переписано без рода (ниже помечено ⚑). Обращение на «ты».
- Намеренно без `{x_w}`: в tr — `streakBigUnit`, `weekStreakUnit` (слово после числа не меняется), в `monthTitle` во всех языках, кроме ru/uk, — там «days» стоит после «из {daysInMonth}».
  Подставлять переменную, которой в строке нет, — безопасно: `storyText()` её пропускает.
- Подписи с условием («без единой подсказки», «с первой попытки», «лучший месяц», «без подсказок», «новых сегодня нет») — отдельные строки. Кадр показывает их, только когда событие это подтверждает. Для обычного случая есть общий заголовок.

## Кнопки (6)

```ts
  ctaCatchUp: ['Догнать', 'Наздогнати', 'Catch up', 'Alcanzar', 'Alcançar', 'Đuổi kịp', 'Kejar', 'Yetiş', 'Dogoń'],
  ctaDuel: ['Вызвать на дуэль', 'Викликати на дуель', 'Challenge to a duel', 'Retar a un duelo', 'Desafiar para um duelo', 'Thách đấu', 'Tantang duel', 'Düelloya davet et', 'Wyzwij na pojedynek'],
  ctaOpenPack: ['Открыть набор', 'Відкрити набір', 'Open pack', 'Abrir pack', 'Abrir pacote', 'Mở bộ thẻ', 'Buka paket', 'Paketi aç', 'Otwórz zestaw'],
  ctaAddToCards: ['Добавить в карточки', 'Додати в картки', 'Add to cards', 'Añadir a tarjetas', 'Adicionar aos cartões', 'Thêm vào thẻ', 'Tambahkan ke kartu', 'Kartlara ekle', 'Dodaj do kart'],
  ctaShareLink: ['Поделиться ссылкой', 'Поділитися посиланням', 'Share link', 'Compartir enlace', 'Compartilhar link', 'Chia sẻ liên kết', 'Bagikan tautan', 'Bağlantıyı paylaş', 'Udostępnij link'],
  ctaUseTheme: ['Включить тему', 'Увімкнути тему', 'Turn on theme', 'Activar tema', 'Ativar tema', 'Bật chủ đề', 'Aktifkan tema', 'Temayı aç', 'Włącz motyw'],
```

## Кадры

```ts
  // ── общее ──
  you: ['Ты', 'Ти', 'You', 'Tú', 'Você', 'Bạn', 'Kamu', 'Sen', 'Ty'],

  // 1 · Серия · 7 дней (название рубежа — из строк моментов серии)
  streakOverline: ['Серия · {days} {days_w}', 'Серія · {days} {days_w}', 'Streak · {days} {days_w}', 'Racha · {days} {days_w}', 'Sequência · {days} {days_w}', 'Chuỗi · {days} {days_w}', 'Rangkaian · {days} {days_w}', 'Seri · {days} {days_w}', 'Seria · {days} {days_w}'],
  streakNext: ['Следующий рубеж — {next} {next_w}', 'Наступний рубіж — {next} {next_w}', 'Next goal — {next} {next_w}', 'Próxima meta: {next} {next_w}', 'Próxima meta: {next} {next_w}', 'Mốc tiếp theo — {next} {next_w}', 'Target berikutnya — {next} {next_w}', 'Sonraki hedef — {next} {next_w}', 'Następny cel — {next} {next_w}'],

  // 2 · Серия · 100 дней (крупное число — {days})
  streakBigUnit: ['{days_w} подряд', '{days_w} поспіль', '{days_w} in a row', '{days_w} seguidos', '{days_w} seguidos', '{days_w} liên tiếp', '{days_w} berturut-turut', 'gün üst üste', '{days_w} z rzędu'],
  streakBigTitle: ['Ни одного пропуска', 'Жодного пропуску', 'Not a single day missed', 'Sin faltar ni un día', 'Sem faltar nenhum dia', 'Không bỏ ngày nào', 'Tanpa absen sehari pun', 'Tek gün bile kaçırmadın', 'Ani jednego dnia przerwy'],
  streakSince: ['Начало {date} · следующий рубеж — {next}', 'Початок {date} · наступний рубіж — {next}', 'Started {date} · next goal — {next}', 'Desde el {date} · próxima meta: {next}', 'Desde {date} · próxima meta: {next}', 'Bắt đầu {date} · mốc tiếp theo — {next}', 'Mulai {date} · target berikutnya — {next}', 'Başlangıç {date} · sonraki hedef — {next}', 'Od {date} · następny cel — {next}'],

  // 3 · Ачивка (имя — из каталога; «Следующая — …» = achNext)
  achCount: ['Ачивка · {opened} из {total}', 'Ачівка · {opened} з {total}', 'Achievement · {opened} of {total}', 'Logro · {opened} de {total}', 'Conquista · {opened} de {total}', 'Thành tích · {opened}/{total}', 'Pencapaian · {opened} dari {total}', 'Başarım · {opened}/{total}', 'Osiągnięcie · {opened} z {total}'],

  // 4 · Новый уровень
  levelOverline: ['Новый уровень', 'Новий рівень', 'New level', 'Nuevo nivel', 'Novo nível', 'Cấp độ mới', 'Level baru', 'Yeni seviye', 'Nowy poziom'],
  levelTitle: ['Уровень {toLevel} открыт', 'Рівень {toLevel} відкрито', 'Level {toLevel} unlocked', 'Nivel {toLevel} desbloqueado', 'Nível {toLevel} liberado', 'Đã mở cấp độ {toLevel}', 'Level {toLevel} terbuka', '{toLevel} seviyesi açıldı', 'Poziom {toLevel} odblokowany'],
  levelBehind: ['Позади {chapters} {chapters_w} и {lessons} {lessons_w}', 'Позаду {chapters} {chapters_w} і {lessons} {lessons_w}', '{chapters} {chapters_w} and {lessons} {lessons_w} done', '{chapters} {chapters_w} y {lessons} {lessons_w} completados', '{chapters} {chapters_w} e {lessons} {lessons_w} concluídos', 'Đã xong {chapters} {chapters_w} và {lessons} {lessons_w}', '{chapters} {chapters_w} dan {lessons} {lessons_w} selesai', '{chapters} {chapters_w} ve {lessons} {lessons_w} tamamlandı', 'Za tobą {chapters} {chapters_w} i {lessons} {lessons_w}'],

  // 5 · Урок пройден
  lessonOverline: ['Урок {lessonNo}', 'Урок {lessonNo}', 'Lesson {lessonNo}', 'Lección {lessonNo}', 'Lição {lessonNo}', 'Bài {lessonNo}', 'Pelajaran {lessonNo}', 'Ders {lessonNo}', 'Lekcja {lessonNo}'],
  lessonTitle: ['Урок пройден', 'Урок пройдено', 'Lesson complete', 'Lección completada', 'Lição concluída', 'Đã xong bài học', 'Pelajaran selesai', 'Ders tamamlandı', 'Lekcja ukończona'],
  lessonTitleNoHints: ['Без единой подсказки', 'Без жодної підказки', 'Not a single hint', 'Sin ninguna pista', 'Sem nenhuma dica', 'Không dùng gợi ý nào', 'Tanpa satu petunjuk pun', 'Hiç ipucu almadan', 'Bez ani jednej podpowiedzi'],
  lessonCorrectOf: ['из {total} верно', 'з {total} правильно', 'of {total} correct', 'de {total} correctas', 'de {total} certas', '/{total} câu đúng', 'dari {total} benar', '/{total} doğru', 'z {total} dobrze'],
  lessonCoinsUnit: ['{cw}', '{cw}', '{cw}', '{cw}', '{cw}', '{cw}', '{cw}', '{cw}', '{cw}'],
  lessonMinutes: ['{minutes} мин', '{minutes} хв', '{minutes} min', '{minutes} min', '{minutes} min', '{minutes} phút', '{minutes} mnt', '{minutes} dk', '{minutes} min'],
  lessonMinutesUnit: ['на урок', 'на урок', 'per lesson', 'en la lección', 'na lição', 'cho bài học', 'untuk pelajaran', 'derste', 'na lekcję'],

  // 6 · Экзамен главы сдан (крупно: {correct} и «из {total}»)
  examOverline: ['Экзамен главы {chapter}', 'Іспит розділу {chapter}', 'Chapter {chapter} exam', 'Examen del capítulo {chapter}', 'Exame do capítulo {chapter}', 'Bài thi chương {chapter}', 'Ujian bab {chapter}', '{chapter}. ünite sınavı', 'Egzamin rozdziału {chapter}'],
  examTitle: ['Экзамен сдан', 'Іспит складено', 'Exam passed', 'Examen aprobado', 'Exame aprovado', 'Đã qua bài thi', 'Ujian lulus', 'Sınav geçildi', 'Egzamin zdany'],
  examTitleFirstTry: ['Сдан с первой попытки', 'Складено з першої спроби', 'Passed on the first try', 'Aprobado al primer intento', 'Aprovado na primeira tentativa', 'Qua ngay lần đầu', 'Lulus di percobaan pertama', 'İlk denemede geçildi', 'Zdany za pierwszym razem'],
  examOf: ['из {total}', 'з {total}', 'of {total}', 'de {total}', 'de {total}', '/{total}', 'dari {total}', '/{total}', 'z {total}'],
  examNextOpen: ['Глава {nextChapter} открыта', 'Розділ {nextChapter} відкрито', 'Chapter {nextChapter} unlocked', 'Capítulo {nextChapter} desbloqueado', 'Capítulo {nextChapter} liberado', 'Đã mở chương {nextChapter}', 'Bab {nextChapter} terbuka', '{nextChapter}. ünite açıldı', 'Rozdział {nextChapter} odblokowany'],

  // 7 · Пик · вершина недели (лига — название из moments_strings)
  peakOverline: ['Пик · {league}', 'Пік · {league}', 'Peak · {league}', 'Pico · {league}', 'Pico · {league}', 'Đỉnh · {league}', 'Puncak · {league}', 'Zirve · {league}', 'Szczyt · {league}'],
  peakSummitTitle: ['Ты на вершине недели', 'Ти на вершині тижня', 'You reached the top this week', 'Llegaste a la cima de la semana', 'Você chegou ao topo da semana', 'Bạn đã lên đỉnh tuần này', 'Kamu sampai di puncak minggu ini', 'Haftanın zirvesindesin', 'Jesteś na szczycie tygodnia'],
  peakSummitFloor: ['Этаж {floor} из {floors} · {coins} {cw} за подъём', 'Поверх {floor} з {floors} · {coins} {cw} за підйом', 'Floor {floor} of {floors} · {coins} {cw} for the climb', 'Piso {floor} de {floors} · {coins} {cw} por la subida', 'Andar {floor} de {floors} · {coins} {cw} pela subida', 'Tầng {floor}/{floors} · {coins} {cw} cho lần leo', 'Lantai {floor} dari {floors} · {coins} {cw} untuk pendakian', 'Kat {floor}/{floors} · tırmanış için {coins} {cw}', 'Piętro {floor} z {floors} · {coins} {cw} za wspinaczkę'],

  // 8 · Пик · итог недели: «Итог недели · {league}» = weekResult + « · » + лига;
  //     заголовок = weekPlace; подпись = stayTitle (weekUp / weekDown) + « · » + weekCoins.

  // 9 · Дуэль выиграна ⚑ (в макете «Ты выиграл 4 : 2» — с родом)
  duelOverline: ['Дуэль на 5 фраз', 'Дуель на 5 висловів', '5-phrase duel', 'Duelo de 5 frases', 'Duelo de 5 frases', 'Đấu 5 cụm từ', 'Duel 5 frasa', '5 ifadelik düello', 'Pojedynek na 5 zwrotów'],
  duelWinTitle: ['Победа {my} : {their}', 'Перемога {my} : {their}', 'You won {my} : {their}', 'Ganaste {my} : {their}', 'Vitória {my} : {their}', 'Thắng {my} : {their}', 'Menang {my} : {their}', '{my} : {their} kazandın', 'Wygrana {my} : {their}'],
  duelDetails: ['{name} · {min} мин {sec} с · можно взять реванш', '{name} · {min} хв {sec} с · можна взяти реванш', '{name} · {min} min {sec} s · rematch available', '{name} · {min} min {sec} s · puedes pedir la revancha', '{name} · {min} min {sec} s · dá para pedir revanche', '{name} · {min} phút {sec} giây · có thể đấu lại', '{name} · {min} mnt {sec} dtk · bisa tanding ulang', '{name} · {min} dk {sec} sn · rövanş alabilirsin', '{name} · {min} min {sec} s · możesz wziąć rewanż'],

  // 10 · Друг обогнал ⚑ (в макете «Марина обогнала тебя»)
  weekCoinsOverline: ['Монеты недели', 'Монети тижня', 'Coins this week', 'Monedas de la semana', 'Moedas da semana', 'Xu trong tuần', 'Koin minggu ini', 'Haftanın jetonları', 'Monety tygodnia'],
  overtakenTitle: ['{name} обходит тебя', '{name} обходить тебе', '{name} is ahead of you', '{name} te ha adelantado', '{name} passou na sua frente', '{name} đã vượt bạn', '{name} menyalipmu', '{name} seni geçti', '{name} cię wyprzedza'],
  overtakenGap: ['Разрыв {gap} {cw} · до конца недели {daysLeft} {daysLeft_w}', 'Різниця {gap} {cw} · до кінця тижня {daysLeft} {daysLeft_w}', 'Gap: {gap} {cw} · {daysLeft} {daysLeft_w} left this week', 'Diferencia: {gap} {cw} · quedan {daysLeft} {daysLeft_w} de semana', 'Diferença: {gap} {cw} · faltam {daysLeft} {daysLeft_w} na semana', 'Cách {gap} {cw} · còn {daysLeft} {daysLeft_w} hết tuần', 'Selisih {gap} {cw} · minggu ini sisa {daysLeft} {daysLeft_w}', 'Fark {gap} {cw} · haftanın bitmesine {daysLeft} {daysLeft_w}', 'Różnica {gap} {cw} · do końca tygodnia {daysLeft} {daysLeft_w}'],

  // 11 · Новый друг ⚑ (в макете «Тимур принял приглашение»)
  friendsOverline: ['Друзья', 'Друзі', 'Friends', 'Amigos', 'Amigos', 'Bạn bè', 'Teman', 'Arkadaşlar', 'Znajomi'],
  friendJoinedTitle: ['{name} теперь в друзьях', '{name} тепер у друзях', '{name} is now your friend', '{name} ya está en tus amigos', '{name} agora está nos seus amigos', '{name} đã là bạn của bạn', '{name} sekarang temanmu', '{name} artık arkadaşın', '{name} jest teraz w znajomych'],
  friendJoinedText: ['Вы видите серии друг друга', 'Ви бачите серії одне одного', 'You can see each other’s streaks', 'Podéis ver la racha del otro', 'Vocês veem a sequência um do outro', 'Hai bạn thấy chuỗi của nhau', 'Kalian bisa melihat rangkaian satu sama lain', 'Birbirinizin serisini görüyorsunuz', 'Widzicie nawzajem swoje serie'],

  // 12 · Набор выучен (название — из события)
  packLearnedOverline: ['Набор выучен', 'Набір вивчено', 'Pack learned', 'Pack aprendido', 'Pacote aprendido', 'Đã học xong bộ thẻ', 'Paket dikuasai', 'Paket öğrenildi', 'Zestaw opanowany'],
  packLearnedTitle: ['«{packTitle}» — все {cards}', '«{packTitle}» — усі {cards}', '“{packTitle}” — all {cards}', '«{packTitle}»: las {cards}', '“{packTitle}”: todos os {cards}', '“{packTitle}” — cả {cards} thẻ', '“{packTitle}” — semua {cards}', '“{packTitle}” — {cards} kartın hepsi', '„{packTitle}” — wszystkie {cards}'],
  packLearnedText: ['{pct} % с первого раза · {days} {days_w}', '{pct} % з першого разу · {days} {days_w}', '{pct}% on the first try · {days} {days_w}', '{pct} % a la primera · {days} {days_w}', '{pct}% de primeira · {days} {days_w}', '{pct}% đúng ngay lần đầu · {days} {days_w}', '{pct}% langsung benar · {days} {days_w}', 'İlk seferde %{pct} · {days} {days_w}', '{pct}% za pierwszym razem · {days} {days_w}'],

  // 13 · Твой набор добавляют
  communityWeekOverline: ['Сообщество · за неделю', 'Спільнота · за тиждень', 'Community · this week', 'Comunidad · esta semana', 'Comunidade · nesta semana', 'Cộng đồng · tuần này', 'Komunitas · minggu ini', 'Topluluk · bu hafta', 'Społeczność · w tym tygodniu'],
  packAddedTitle: ['Набор добавили {count} {count_w}', 'Набір додали {count} {count_w}', '{count} {count_w} added your pack', '{count} {count_w} añadieron tu pack', '{count} {count_w} adicionaram seu pacote', '{count} {count_w} đã thêm bộ thẻ của bạn', '{count} {count_w} menambahkan paketmu', 'Paketini {count} {count_w} ekledi', 'Twój zestaw dodało {count} {count_w}'],
  packAddedText: ['«{packTitle}» · {cards} {cards_w}', '«{packTitle}» · {cards} {cards_w}', '“{packTitle}” · {cards} {cards_w}', '«{packTitle}» · {cards} {cards_w}', '“{packTitle}” · {cards} {cards_w}', '“{packTitle}” · {cards} {cards_w}', '“{packTitle}” · {cards} {cards_w}', '“{packTitle}” · {cards} {cards_w}', '„{packTitle}” · {cards} {cards_w}'],

  // 14 · Фраза дня (фраза и смысл — из события)
  phraseOverline: ['Фраза дня', 'Вислів дня', 'Phrase of the day', 'Frase del día', 'Frase do dia', 'Cụm từ hôm nay', 'Frasa hari ini', 'Günün ifadesi', 'Zwrot dnia'],

  // 15 · Твоя неделя (диапазон дат — Intl)
  weekTitle: ['Твоя неделя', 'Твій тиждень', 'Your week', 'Tu semana', 'Sua semana', 'Tuần của bạn', 'Minggumu', 'Senin haftan', 'Twój tydzień'],
  weekLessonsUnit: ['{lessons_w}', '{lessons_w}', '{lessons_w}', '{lessons_w}', '{lessons_w}', '{lessons_w}', '{lessons_w}', '{lessons_w}', '{lessons_w}'],
  weekMinutesUnit: ['{minutes_w}', '{minutes_w}', '{minutes_w}', '{minutes_w}', '{minutes_w}', '{minutes_w}', '{minutes_w}', '{minutes_w}', '{minutes_w}'],
  weekStreakUnit: ['{streak_w} серии', '{streak_w} серії', 'streak {streak_w}', '{streak_w} de racha', '{streak_w} de sequência', '{streak_w} chuỗi', '{streak_w} rangkaian', 'seri günü', '{streak_w} serii'],
  hoursMinutes: ['{h} ч {m}', '{h} год {m}', '{h} h {m}', '{h} h {m}', '{h} h {m}', '{h} giờ {m}', '{h} j {m}', '{h} sa {m}', '{h} godz. {m}'],

  // 16 · Итог месяца (название месяца — Intl)
  monthTitle: ['{active} {active_w} из {daysInMonth}', '{active} {active_w} з {daysInMonth}', '{active} of {daysInMonth} days', '{active} de {daysInMonth} días', '{active} de {daysInMonth} dias', '{active}/{daysInMonth} ngày', '{active} dari {daysInMonth} hari', '{daysInMonth} günün {active} günü', '{active} z {daysInMonth} dni'],
  monthText: ['{lessons} {lessons_w} · {exams} {exams_w}', '{lessons} {lessons_w} · {exams} {exams_w}', '{lessons} {lessons_w} · {exams} {exams_w}', '{lessons} {lessons_w} · {exams} {exams_w}', '{lessons} {lessons_w} · {exams} {exams_w}', '{lessons} {lessons_w} · {exams} {exams_w}', '{lessons} {lessons_w} · {exams} {exams_w}', '{lessons} {lessons_w} · {exams} {exams_w}', '{lessons} {lessons_w} · {exams} {exams_w}'],
  monthBest: ['лучший месяц', 'найкращий місяць', 'your best month', 'tu mejor mes', 'seu melhor mês', 'tháng tốt nhất', 'bulan terbaikmu', 'en iyi ayın', 'najlepszy miesiąc'],

  // 17 · Пригласи друга (код — из события)
  inviteOverline: ['Вдвоём веселее', 'Удвох веселіше', 'Better together', 'Mejor en compañía', 'Juntos é melhor', 'Học cùng vui hơn', 'Lebih seru berdua', 'Birlikte daha keyifli', 'We dwoje raźniej'],
  inviteTitle: ['Пригласи друга', 'Запроси друга', 'Invite a friend', 'Invita a un amigo', 'Convide um amigo', 'Mời bạn bè', 'Ajak teman', 'Bir arkadaşını davet et', 'Zaproś znajomego'],
  inviteCodeLabel: ['Твой код', 'Твій код', 'Your code', 'Tu código', 'Seu código', 'Mã của bạn', 'Kodemu', 'Kodun', 'Twój kod'],
  inviteText: ['Дуэли на 5 фраз и общая серия откроются сразу', 'Дуелі на 5 висловів і спільна серія відкриються одразу', '5-phrase duels and a shared streak unlock right away', 'Los duelos de 5 frases y la racha compartida se activan al momento', 'Os duelos de 5 frases e a sequência em dupla liberam na hora', 'Đấu 5 cụm từ và chuỗi chung mở ngay', 'Duel 5 frasa dan rangkaian bersama langsung terbuka', '5 ifadelik düellolar ve ortak seri hemen açılır', 'Pojedynki na 5 zwrotów i wspólna seria otworzą się od razu'],

  // 18 · Праздник — заголовок, текст и дата приходят из объявления администратора; своих строк у кадра нет.

  // 19 · Ранг монеты: rankOverline, rankTitle, rankPaid + это
  rankNext: ['следующий — {next}', 'наступний — {next}', 'next: {next}', 'siguiente: {next}', 'próximo: {next}', 'tiếp theo: {next}', 'berikutnya: {next}', 'sonraki: {next}', 'następna: {next}'],

  // 20 · Новая тема (имя и условие — из каталога тем)
  themeUnlockedTitle: ['«{theme}» открыта', '«{theme}» відкрито', '“{theme}” unlocked', '«{theme}» desbloqueado', '“{theme}” liberado', 'Đã mở “{theme}”', '“{theme}” terbuka', '“{theme}” açıldı', '„{theme}” odblokowany'],
  themesOpened: ['Открыто тем: {opened} из {total}', 'Відкрито тем: {opened} з {total}', 'Themes unlocked: {opened} of {total}', 'Temas desbloqueados: {opened} de {total}', 'Temas liberados: {opened} de {total}', 'Đã mở {opened}/{total} chủ đề', 'Tema terbuka: {opened} dari {total}', 'Açılan tema: {opened}/{total}', 'Odblokowane motywy: {opened} z {total}'],

  // 21 · 10 000 монет (крупно — число; подпись под ним — {cw} + «на счету»)
  coinsBigUnit: ['{cw} на счету', '{cw} на рахунку', '{cw} in your wallet', '{cw} en tu cuenta', '{cw} na sua conta', '{cw} trong ví', '{cw} di dompet', 'hesabında {cw}', '{cw} na koncie'],
  coinsMilestoneTitle: ['Новая отметка', 'Нова позначка', 'New milestone', 'Nueva marca', 'Nova marca', 'Mốc mới', 'Pencapaian baru', 'Yeni eşik', 'Nowy próg'],
  coinsMilestoneText: ['Накоплено за {days} {days_w} · хватает на ранг {rank}', 'Зібрано за {days} {days_w} · вистачає на ранг {rank}', 'Saved over {days} {days_w} · enough for rank {rank}', 'Ahorradas en {days} {days_w} · alcanza para el rango {rank}', 'Juntadas em {days} {days_w} · dá para o rank {rank}', 'Tích lũy trong {days} {days_w} · đủ cho hạng {rank}', 'Terkumpul dalam {days} {days_w} · cukup untuk peringkat {rank}', '{days} {days_w} içinde biriktirildi · {rank}. rütbeye yetiyor', 'Zebrane w {days} {days_w} · starczy na rangę {rank}'],

  // 22 · Ошибки разобраны
  mistakesOverline: ['Мои ошибки', 'Мої помилки', 'My mistakes', 'Mis errores', 'Meus erros', 'Lỗi của tôi', 'Kesalahanku', 'Hatalarım', 'Moje błędy'],
  mistakesClearedTitle: ['Разобрано ошибок: {cleared}', 'Розібрано помилок: {cleared}', 'Mistakes reviewed: {cleared}', 'Errores repasados: {cleared}', 'Erros revisados: {cleared}', 'Đã xem lại {cleared} lỗi', 'Kesalahan dibahas: {cleared}', 'İncelenen hata: {cleared}', 'Przerobione błędy: {cleared}'],
  mistakesLeft: ['Осталось: {left}', 'Залишилося: {left}', 'Left: {left}', 'Quedan: {left}', 'Restam: {left}', 'Còn lại: {left}', 'Sisa: {left}', 'Kalan: {left}', 'Zostało: {left}'],
  mistakesNoNew: ['новых сегодня нет', 'нових сьогодні немає', 'no new ones today', 'hoy no hay nuevos', 'nenhum novo hoje', 'hôm nay không có lỗi mới', 'hari ini tidak ada yang baru', 'bugün yeni yok', 'dziś brak nowych'],

  // 23 · Диалог пройден (название диалога — из события)
  dialogOverline: ['Диалог «{title}»', 'Діалог «{title}»', 'Dialogue “{title}”', 'Diálogo «{title}»', 'Diálogo “{title}”', 'Hội thoại “{title}”', 'Dialog “{title}”', '“{title}” diyaloğu', 'Dialog „{title}”'],
  dialogGoalsTitle: ['Выполнено целей: {done} из {total}', 'Виконано цілей: {done} з {total}', 'Goals done: {done} of {total}', 'Objetivos cumplidos: {done} de {total}', 'Metas cumpridas: {done} de {total}', 'Hoàn thành {done}/{total} mục tiêu', 'Tujuan tercapai: {done} dari {total}', 'Tamamlanan hedef: {done}/{total}', 'Wykonane cele: {done} z {total}'],
  dialogStats: ['{turns} {turns_w} · {minutes} {minutes_w}', '{turns} {turns_w} · {minutes} {minutes_w}', '{turns} {turns_w} · {minutes} {minutes_w}', '{turns} {turns_w} · {minutes} {minutes_w}', '{turns} {turns_w} · {minutes} {minutes_w}', '{turns} {turns_w} · {minutes} {minutes_w}', '{turns} {turns_w} · {minutes} {minutes_w}', '{turns} {turns_w} · {minutes} {minutes_w}', '{turns} {turns_w} · {minutes} {minutes_w}'],
  dialogNoHints: ['без подсказок', 'без підказок', 'no hints', 'sin pistas', 'sem dicas', 'không dùng gợi ý', 'tanpa petunjuk', 'ipucusuz', 'bez podpowiedzi'],
```

Шапка «Твои события · сегодня» уже есть в коде: `title`, `today`.

## Слова к числам (`pluralWord`)

ru, uk, pl — три формы `one / few / many`. Остальные — `one / many`.
В vi, id и tr слово после числа не меняется, поэтому `one = many`. В tr после числа всегда единственное число («5 gün»).

| Таблица | ru | uk | pl | en | es | pt-BR | vi | id | tr |
|---|---|---|---|---|---|---|---|---|---|
| day | день / дня / дней | день / дні / днів | dzień / dni / dni | day / days | día / días | dia / dias | ngày | hari | gün |
| lesson | урок / урока / уроков | урок / уроки / уроків | lekcja / lekcje / lekcji | lesson / lessons | lección / lecciones | lição / lições | bài học | pelajaran | ders |
| minute | минута / минуты / минут | хвилина / хвилини / хвилин | minuta / minuty / minut | minute / minutes | minuto / minutos | minuto / minutos | phút | menit | dakika |
| chapter | глава / главы / глав | розділ / розділи / розділів | rozdział / rozdziały / rozdziałów | chapter / chapters | capítulo / capítulos | capítulo / capítulos | chương | bab | ünite |
| person | человек / человека / человек | людина / людини / людей | osoba / osoby / osób | person / people | persona / personas | pessoa / pessoas | người | orang | kişi |
| card | карточка / карточки / карточек | картка / картки / карток | karta / karty / kart | card / cards | tarjeta / tarjetas | cartão / cartões | thẻ | kartu | kart |
| turn (реплика) | реплика / реплики / реплик | репліка / репліки / реплік | kwestia / kwestie / kwestii | line / lines | frase / frases | fala / falas | lượt nói | giliran | replik |
| exam | экзамен / экзамена / экзаменов | іспит / іспити / іспитів | egzamin / egzaminy / egzaminów | exam / exams | examen / exámenes | exame / exames | bài thi | ujian | sınav |

Какая таблица к какому плейсхолдеру: `days_w`, `next_w`, `daysLeft_w`, `active_w`, `streak_w` — day; `lessons_w` — lesson; `minutes_w` — minute; `chapters_w` — chapter; `count_w` — person; `cards_w` — card; `turns_w` — turn; `exams_w` — exam.

**Падеж в ru/uk/pl.** `levelBehind`, `monthText`, `dialogStats`, `packAddedText` и подписи под крупными числами стоят в именительном падеже: «8 глав и 96 уроков», «18 уроков · 2 экзамена». Таблицы выше дают ровно эти формы.
Исключение — `overtakenGap`: «Разрыв 80 монет» тоже именительный, `{cw}` подходит.

## Что поменял против макета и почему

| Кадр | Макет | Здесь | Почему |
|---|---|---|---|
| Дуэль | Ты выиграл 4 : 2 | Победа 4 : 2 | пол не знаем; en/es — «You won», там рода нет |
| Друг обогнал | Марина обогнала тебя | {name} обходит тебя | род имени неизвестен; настоящее время рода не требует |
| Новый друг | Тимур принял приглашение | {name} теперь в друзьях | то же; подпись «Теперь вы видите…» → «Вы видите…», чтобы «теперь» не повторялось |
| Серия · 100 | Сто дней без пропусков | Ни одного пропуска | число уже крупно над заголовком; заголовок подходит к любому рубежу |
| 10 000 монет | Первые десять тысяч | Новая отметка | то же — подходит к любой отметке |
| Ошибки | 12 ошибок разобрано | Разобрано ошибок: 12 | «1 ошибка разобрана / 2 ошибки разобрано» — форма глагола зависит от числа |
| Диалог | Цель 6 из 6 выполнена | Выполнено целей: 6 из 6 | то же |
| Тема | 7 из 29 тем открыто | Открыто тем: 7 из 29 | «из 21 темы» — форма зависит от числа |
| Набор выучен | 92 % знаю с первого раза | 92 % с первого раза | без «знаю» от первого лица в подписи, которую пишет приложение |
| Урок | Пройден без единой подсказки | «Урок пройден» + условная «Без единой подсказки» | обычный урок без условия тоже нужен |
| Экзамен | Сдан с первой попытки | «Экзамен сдан» + условная «Сдан с первой попытки» | то же |

Переводы кроме ru и uk — предложение, носителем не проверены (как и остальные строки историй).
