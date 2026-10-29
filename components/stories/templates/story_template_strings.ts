// ═══════════════════════════════════════════════════════════════════════════
// story_template_strings.ts — тексты 23 кадров историй (макет stories-templates-v1.html) на 9 языках интерфейса.
//
// зачем (владелец 28.10: шаблоны «именно так» + тексты простые, с цифрами, без метафор): строки — от Переводчика
// (docs/voice/stories-templates-v1-strings-2026-10-28.md, 89bab5bc6) слово в слово, тот же формат, что story_strings.ts: девять значений
// ru, uk, en, es, pt-BR, vi, id, tr, pl. `{x}` — значение события; `{x_w}` — слово к числу `{x}` в нужной форме (таблицы ниже, правило формы —
// общее constants/plural.ts); `{cw}` — слово «монета» к `{coins}` (или к `{gap}` — разрыв в монетах). Уже переведённое (заголовок просмотра,
// ачивка, ранг, итог недели, названия рубежей серии и лиг) здесь не дублируется — кадры берут его из story_strings / moments_strings.
// Где макет угадывал род («Ты выиграл», «обогнала»), Переводчик переписал без рода — пол человека нам неизвестен.
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from '../../../constants/i18n';
import { pluralWord, type PluralForms } from '../../../constants/plural';
import { glueNumbers } from '../../moments/glue_numbers';
import { momentCoinWord } from '../../spire/moments/moments_strings';

type Nine = readonly [string, string, string, string, string, string, string, string, string];
const LANG_INDEX: Readonly<Record<string, number>> = { ru: 0, uk: 1, en: 2, es: 3, 'pt-BR': 4, vi: 5, id: 6, tr: 7, pl: 8 };

const S = {
  // ── кнопки действия ──
  ctaCatchUp: ['Догнать', 'Наздогнати', 'Catch up', 'Alcanzar', 'Alcançar', 'Đuổi kịp', 'Kejar', 'Yetiş', 'Dogoń'],
  ctaDuel: ['Вызвать на дуэль', 'Викликати на дуель', 'Challenge to a duel', 'Retar a un duelo', 'Desafiar para um duelo', 'Thách đấu', 'Tantang duel', 'Düelloya davet et', 'Wyzwij na pojedynek'],
  ctaOpenPack: ['Открыть набор', 'Відкрити набір', 'Open pack', 'Abrir pack', 'Abrir pacote', 'Mở bộ thẻ', 'Buka paket', 'Paketi aç', 'Otwórz zestaw'],
  ctaAddToCards: ['Добавить в карточки', 'Додати в картки', 'Add to cards', 'Añadir a tarjetas', 'Adicionar aos cartões', 'Thêm vào thẻ', 'Tambahkan ke kartu', 'Kartlara ekle', 'Dodaj do kart'],
  ctaShareLink: ['Поделиться ссылкой', 'Поділитися посиланням', 'Share link', 'Compartir enlace', 'Compartilhar link', 'Chia sẻ liên kết', 'Bagikan tautan', 'Bağlantıyı paylaş', 'Udostępnij link'],
  ctaUseTheme: ['Включить тему', 'Увімкнути тему', 'Turn on theme', 'Activar tema', 'Ativar tema', 'Bật chủ đề', 'Aktifkan tema', 'Temayı aç', 'Włącz motyw'],
  // кнопка объявления «Plus» (макет stories-announcements-v1): те же слова, что у кнопки диалогов (app/dialogue_v2_freeform.tsx openPlus)
  ctaOpenPlus: ['Открыть Plus', 'Відкрити Plus', 'Open Plus', 'Abrir Plus', 'Abrir Plus', 'Mở Plus', 'Buka Plus', 'Plus’ı aç', 'Otwórz Plus'],
  // опрос объявления: те же слова, что у «Опроса дня» (components/friends/DailyPollCard.tsx) — не новый перевод
  pollVoteFailed: ['Не получилось отправить голос. Попробуй ещё раз.', 'Не вдалося надіслати голос. Спробуй ще раз.', 'Couldn’t send your vote. Try again.', 'No se pudo enviar tu voto. Inténtalo de nuevo.', 'Não foi possível enviar seu voto. Tente de novo.', 'Không gửi được phiếu. Thử lại nhé.', 'Suaramu gagal terkirim. Coba lagi.', 'Oy gönderilemedi. Tekrar dene.', 'Nie udało się wysłać głosu. Spróbuj ponownie.'],
  // ── общее ──
  you: ['Ты', 'Ти', 'You', 'Tú', 'Você', 'Bạn', 'Kamu', 'Sen', 'Ty'],
  // 1 · серия
  streakOverline: ['Серия · {days} {days_w}', 'Серія · {days} {days_w}', 'Streak · {days} {days_w}', 'Racha · {days} {days_w}', 'Sequência · {days} {days_w}', 'Chuỗi · {days} {days_w}', 'Rangkaian · {days} {days_w}', 'Seri · {days} {days_w}', 'Seria · {days} {days_w}'],
  streakNext: ['Следующий рубеж — {next} {next_w}', 'Наступний рубіж — {next} {next_w}', 'Next goal — {next} {next_w}', 'Próxima meta: {next} {next_w}', 'Próxima meta: {next} {next_w}', 'Mốc tiếp theo — {next} {next_w}', 'Target berikutnya — {next} {next_w}', 'Sonraki hedef — {next} {next_w}', 'Następny cel — {next} {next_w}'],
  // 2 · серия, большой рубеж
  streakBigUnit: ['{days_w} подряд', '{days_w} поспіль', '{days_w} in a row', '{days_w} seguidos', '{days_w} seguidos', '{days_w} liên tiếp', '{days_w} berturut-turut', 'gün üst üste', '{days_w} z rzędu'],
  streakBigTitle: ['Ни одного пропуска', 'Жодного пропуску', 'Not a single day missed', 'Sin faltar ni un día', 'Sem faltar nenhum dia', 'Không bỏ ngày nào', 'Tanpa absen sehari pun', 'Tek gün bile kaçırmadın', 'Ani jednego dnia przerwy'],
  streakSince: ['Начало {date} · следующий рубеж — {next}', 'Початок {date} · наступний рубіж — {next}', 'Started {date} · next goal — {next}', 'Desde el {date} · próxima meta: {next}', 'Desde {date} · próxima meta: {next}', 'Bắt đầu {date} · mốc tiếp theo — {next}', 'Mulai {date} · target berikutnya — {next}', 'Başlangıç {date} · sonraki hedef — {next}', 'Od {date} · następny cel — {next}'],
  // 3 · ачивка
  achCount: ['Ачивка · {opened} из {total}', 'Ачівка · {opened} з {total}', 'Achievement · {opened} of {total}', 'Logro · {opened} de {total}', 'Conquista · {opened} de {total}', 'Thành tích · {opened}/{total}', 'Pencapaian · {opened} dari {total}', 'Başarım · {opened}/{total}', 'Osiągnięcie · {opened} z {total}'],
  // 4 · новый уровень
  levelOverline: ['Новый уровень', 'Новий рівень', 'New level', 'Nuevo nivel', 'Novo nível', 'Cấp độ mới', 'Level baru', 'Yeni seviye', 'Nowy poziom'],
  levelTitle: ['Уровень {toLevel} открыт', 'Рівень {toLevel} відкрито', 'Level {toLevel} unlocked', 'Nivel {toLevel} desbloqueado', 'Nível {toLevel} liberado', 'Đã mở cấp độ {toLevel}', 'Level {toLevel} terbuka', '{toLevel} seviyesi açıldı', 'Poziom {toLevel} odblokowany'],
  levelBehind: ['Позади {chapters} {chapters_w} и {lessons} {lessons_w}', 'Позаду {chapters} {chapters_w} і {lessons} {lessons_w}', '{chapters} {chapters_w} and {lessons} {lessons_w} done', '{chapters} {chapters_w} y {lessons} {lessons_w} completados', '{chapters} {chapters_w} e {lessons} {lessons_w} concluídos', 'Đã xong {chapters} {chapters_w} và {lessons} {lessons_w}', '{chapters} {chapters_w} dan {lessons} {lessons_w} selesai', '{chapters} {chapters_w} ve {lessons} {lessons_w} tamamlandı', 'Za tobą {chapters} {chapters_w} i {lessons} {lessons_w}'],
  // 5 · урок
  lessonOverline: ['Урок {lessonNo}', 'Урок {lessonNo}', 'Lesson {lessonNo}', 'Lección {lessonNo}', 'Lição {lessonNo}', 'Bài {lessonNo}', 'Pelajaran {lessonNo}', 'Ders {lessonNo}', 'Lekcja {lessonNo}'],
  lessonTitle: ['Урок пройден', 'Урок пройдено', 'Lesson complete', 'Lección completada', 'Lição concluída', 'Đã xong bài học', 'Pelajaran selesai', 'Ders tamamlandı', 'Lekcja ukończona'],
  lessonTitleNoHints: ['Без единой подсказки', 'Без жодної підказки', 'Not a single hint', 'Sin ninguna pista', 'Sem nenhuma dica', 'Không dùng gợi ý nào', 'Tanpa satu petunjuk pun', 'Hiç ipucu almadan', 'Bez ani jednej podpowiedzi'],
  lessonCorrectOf: ['из {total} верно', 'з {total} правильно', 'of {total} correct', 'de {total} correctas', 'de {total} certas', '/{total} câu đúng', 'dari {total} benar', '/{total} doğru', 'z {total} dobrze'],
  lessonCoinsUnit: ['{cw}', '{cw}', '{cw}', '{cw}', '{cw}', '{cw}', '{cw}', '{cw}', '{cw}'],
  lessonMinutes: ['{minutes} мин', '{minutes} хв', '{minutes} min', '{minutes} min', '{minutes} min', '{minutes} phút', '{minutes} mnt', '{minutes} dk', '{minutes} min'],
  lessonMinutesUnit: ['на урок', 'на урок', 'per lesson', 'en la lección', 'na lição', 'cho bài học', 'untuk pelajaran', 'derste', 'na lekcję'],
  // 6 · экзамен главы
  examOverline: ['Экзамен главы {chapter}', 'Іспит розділу {chapter}', 'Chapter {chapter} exam', 'Examen del capítulo {chapter}', 'Exame do capítulo {chapter}', 'Bài thi chương {chapter}', 'Ujian bab {chapter}', '{chapter}. ünite sınavı', 'Egzamin rozdziału {chapter}'],
  examTitle: ['Экзамен сдан', 'Іспит складено', 'Exam passed', 'Examen aprobado', 'Exame aprovado', 'Đã qua bài thi', 'Ujian lulus', 'Sınav geçildi', 'Egzamin zdany'],
  examTitleFirstTry: ['Сдан с первой попытки', 'Складено з першої спроби', 'Passed on the first try', 'Aprobado al primer intento', 'Aprovado na primeira tentativa', 'Qua ngay lần đầu', 'Lulus di percobaan pertama', 'İlk denemede geçildi', 'Zdany za pierwszym razem'],
  examOf: ['из {total}', 'з {total}', 'of {total}', 'de {total}', 'de {total}', '/{total}', 'dari {total}', '/{total}', 'z {total}'],
  examNextOpen: ['Глава {nextChapter} открыта', 'Розділ {nextChapter} відкрито', 'Chapter {nextChapter} unlocked', 'Capítulo {nextChapter} desbloqueado', 'Capítulo {nextChapter} liberado', 'Đã mở chương {nextChapter}', 'Bab {nextChapter} terbuka', '{nextChapter}. ünite açıldı', 'Rozdział {nextChapter} odblokowany'],
  // 7 · Пик, вершина недели
  peakOverline: ['Пик · {league}', 'Пік · {league}', 'Peak · {league}', 'Pico · {league}', 'Pico · {league}', 'Đỉnh · {league}', 'Puncak · {league}', 'Zirve · {league}', 'Szczyt · {league}'],
  peakSummitTitle: ['Ты на вершине недели', 'Ти на вершині тижня', 'You reached the top this week', 'Llegaste a la cima de la semana', 'Você chegou ao topo da semana', 'Bạn đã lên đỉnh tuần này', 'Kamu sampai di puncak minggu ini', 'Haftanın zirvesindesin', 'Jesteś na szczycie tygodnia'],
  peakSummitFloor: ['Этаж {floor} из {floors} · {coins} {cw} за подъём', 'Поверх {floor} з {floors} · {coins} {cw} за підйом', 'Floor {floor} of {floors} · {coins} {cw} for the climb', 'Piso {floor} de {floors} · {coins} {cw} por la subida', 'Andar {floor} de {floors} · {coins} {cw} pela subida', 'Tầng {floor}/{floors} · {coins} {cw} cho lần leo', 'Lantai {floor} dari {floors} · {coins} {cw} untuk pendakian', 'Kat {floor}/{floors} · tırmanış için {coins} {cw}', 'Piętro {floor} z {floors} · {coins} {cw} za wspinaczkę'],
  // 9 · дуэль
  duelOverline: ['Дуэль на 5 фраз', 'Дуель на 5 висловів', '5-phrase duel', 'Duelo de 5 frases', 'Duelo de 5 frases', 'Đấu 5 cụm từ', 'Duel 5 frasa', '5 ifadelik düello', 'Pojedynek na 5 zwrotów'],
  duelWinTitle: ['Победа {my} : {their}', 'Перемога {my} : {their}', 'You won {my} : {their}', 'Ganaste {my} : {their}', 'Vitória {my} : {their}', 'Thắng {my} : {their}', 'Menang {my} : {their}', '{my} : {their} kazandın', 'Wygrana {my} : {their}'],
  duelDetails: ['{name} · {min} мин {sec} с · можно взять реванш', '{name} · {min} хв {sec} с · можна взяти реванш', '{name} · {min} min {sec} s · rematch available', '{name} · {min} min {sec} s · puedes pedir la revancha', '{name} · {min} min {sec} s · dá para pedir revanche', '{name} · {min} phút {sec} giây · có thể đấu lại', '{name} · {min} mnt {sec} dtk · bisa tanding ulang', '{name} · {min} dk {sec} sn · rövanş alabilirsin', '{name} · {min} min {sec} s · możesz wziąć rewanż'],
  // 10 · друг обогнал
  weekCoinsOverline: ['Монеты недели', 'Монети тижня', 'Coins this week', 'Monedas de la semana', 'Moedas da semana', 'Xu trong tuần', 'Koin minggu ini', 'Haftanın jetonları', 'Monety tygodnia'],
  overtakenTitle: ['{name} обходит тебя', '{name} обходить тебе', '{name} is ahead of you', '{name} te ha adelantado', '{name} passou na sua frente', '{name} đã vượt bạn', '{name} menyalipmu', '{name} seni geçti', '{name} cię wyprzedza'],
  overtakenGap: ['Разрыв {gap} {cw} · до конца недели {daysLeft} {daysLeft_w}', 'Різниця {gap} {cw} · до кінця тижня {daysLeft} {daysLeft_w}', 'Gap: {gap} {cw} · {daysLeft} {daysLeft_w} left this week', 'Diferencia: {gap} {cw} · quedan {daysLeft} {daysLeft_w} de semana', 'Diferença: {gap} {cw} · faltam {daysLeft} {daysLeft_w} na semana', 'Cách {gap} {cw} · còn {daysLeft} {daysLeft_w} hết tuần', 'Selisih {gap} {cw} · minggu ini sisa {daysLeft} {daysLeft_w}', 'Fark {gap} {cw} · haftanın bitmesine {daysLeft} {daysLeft_w}', 'Różnica {gap} {cw} · do końca tygodnia {daysLeft} {daysLeft_w}'],
  // 11 · новый друг
  friendsOverline: ['Друзья', 'Друзі', 'Friends', 'Amigos', 'Amigos', 'Bạn bè', 'Teman', 'Arkadaşlar', 'Znajomi'],
  friendJoinedTitle: ['{name} теперь в друзьях', '{name} тепер у друзях', '{name} is now your friend', '{name} ya está en tus amigos', '{name} agora está nos seus amigos', '{name} đã là bạn của bạn', '{name} sekarang temanmu', '{name} artık arkadaşın', '{name} jest teraz w znajomych'],
  friendJoinedText: ['Вы видите серии друг друга', 'Ви бачите серії одне одного', 'You can see each other’s streaks', 'Podéis ver la racha del otro', 'Vocês veem a sequência um do outro', 'Hai bạn thấy chuỗi của nhau', 'Kalian bisa melihat rangkaian satu sama lain', 'Birbirinizin serisini görüyorsunuz', 'Widzicie nawzajem swoje serie'],
  // 12 · набор выучен
  packLearnedOverline: ['Набор выучен', 'Набір вивчено', 'Pack learned', 'Pack aprendido', 'Pacote aprendido', 'Đã học xong bộ thẻ', 'Paket dikuasai', 'Paket öğrenildi', 'Zestaw opanowany'],
  packLearnedTitle: ['«{packTitle}» — все {cards}', '«{packTitle}» — усі {cards}', '“{packTitle}” — all {cards}', '«{packTitle}»: las {cards}', '“{packTitle}”: todos os {cards}', '“{packTitle}” — cả {cards} thẻ', '“{packTitle}” — semua {cards}', '“{packTitle}” — {cards} kartın hepsi', '„{packTitle}” — wszystkie {cards}'],
  packLearnedText: ['{pct} % с первого раза · {days} {days_w}', '{pct} % з першого разу · {days} {days_w}', '{pct}% on the first try · {days} {days_w}', '{pct} % a la primera · {days} {days_w}', '{pct}% de primeira · {days} {days_w}', '{pct}% đúng ngay lần đầu · {days} {days_w}', '{pct}% langsung benar · {days} {days_w}', 'İlk seferde %{pct} · {days} {days_w}', '{pct}% za pierwszym razem · {days} {days_w}'],
  // 13 · твой набор добавляют
  communityWeekOverline: ['Сообщество · за неделю', 'Спільнота · за тиждень', 'Community · this week', 'Comunidad · esta semana', 'Comunidade · nesta semana', 'Cộng đồng · tuần này', 'Komunitas · minggu ini', 'Topluluk · bu hafta', 'Społeczność · w tym tygodniu'],
  packAddedTitle: ['Набор добавили {count} {count_w}', 'Набір додали {count} {count_w}', '{count} {count_w} added your pack', '{count} {count_w} añadieron tu pack', '{count} {count_w} adicionaram seu pacote', '{count} {count_w} đã thêm bộ thẻ của bạn', '{count} {count_w} menambahkan paketmu', 'Paketini {count} {count_w} ekledi', 'Twój zestaw dodało {count} {count_w}'],
  packAddedText: ['«{packTitle}» · {cards} {cards_w}', '«{packTitle}» · {cards} {cards_w}', '“{packTitle}” · {cards} {cards_w}', '«{packTitle}» · {cards} {cards_w}', '“{packTitle}” · {cards} {cards_w}', '“{packTitle}” · {cards} {cards_w}', '“{packTitle}” · {cards} {cards_w}', '“{packTitle}” · {cards} {cards_w}', '„{packTitle}” · {cards} {cards_w}'],
  // 14 · фраза дня; «Послушать» — те же слова, что у кнопки «Послушать» сцены Главной (home_scene_special_copy.listen)
  phraseOverline: ['Фраза дня', 'Вислів дня', 'Phrase of the day', 'Frase del día', 'Frase do dia', 'Cụm từ hôm nay', 'Frasa hari ini', 'Günün ifadesi', 'Zwrot dnia'],
  phraseListen: ['Послушать · {time}', 'Послухати · {time}', 'Listen · {time}', 'Escuchar · {time}', 'Ouvir · {time}', 'Nghe · {time}', 'Dengarkan · {time}', 'Dinle · {time}', 'Posłuchaj · {time}'],
  // 15 · твоя неделя
  weekTitle: ['Твоя неделя', 'Твій тиждень', 'Your week', 'Tu semana', 'Sua semana', 'Tuần của bạn', 'Minggumu', 'Senin haftan', 'Twój tydzień'],
  weekLessonsUnit: ['{lessons_w}', '{lessons_w}', '{lessons_w}', '{lessons_w}', '{lessons_w}', '{lessons_w}', '{lessons_w}', '{lessons_w}', '{lessons_w}'],
  weekMinutesUnit: ['{minutes_w}', '{minutes_w}', '{minutes_w}', '{minutes_w}', '{minutes_w}', '{minutes_w}', '{minutes_w}', '{minutes_w}', '{minutes_w}'],
  weekStreakUnit: ['{streak_w} серии', '{streak_w} серії', 'streak {streak_w}', '{streak_w} de racha', '{streak_w} de sequência', '{streak_w} chuỗi', '{streak_w} rangkaian', 'seri günü', '{streak_w} serii'],
  hoursMinutes: ['{h} ч {m}', '{h} год {m}', '{h} h {m}', '{h} h {m}', '{h} h {m}', '{h} giờ {m}', '{h} j {m}', '{h} sa {m}', '{h} godz. {m}'],
  // 16 · итог месяца
  monthTitle: ['{active} {active_w} из {daysInMonth}', '{active} {active_w} з {daysInMonth}', '{active} of {daysInMonth} days', '{active} de {daysInMonth} días', '{active} de {daysInMonth} dias', '{active}/{daysInMonth} ngày', '{active} dari {daysInMonth} hari', '{daysInMonth} günün {active} günü', '{active} z {daysInMonth} dni'],
  monthText: ['{lessons} {lessons_w} · {exams} {exams_w}', '{lessons} {lessons_w} · {exams} {exams_w}', '{lessons} {lessons_w} · {exams} {exams_w}', '{lessons} {lessons_w} · {exams} {exams_w}', '{lessons} {lessons_w} · {exams} {exams_w}', '{lessons} {lessons_w} · {exams} {exams_w}', '{lessons} {lessons_w} · {exams} {exams_w}', '{lessons} {lessons_w} · {exams} {exams_w}', '{lessons} {lessons_w} · {exams} {exams_w}'],
  monthBest: ['лучший месяц', 'найкращий місяць', 'your best month', 'tu mejor mes', 'seu melhor mês', 'tháng tốt nhất', 'bulan terbaikmu', 'en iyi ayın', 'najlepszy miesiąc'],
  // 17 · пригласи друга
  inviteOverline: ['Вдвоём веселее', 'Удвох веселіше', 'Better together', 'Mejor en compañía', 'Juntos é melhor', 'Học cùng vui hơn', 'Lebih seru berdua', 'Birlikte daha keyifli', 'We dwoje raźniej'],
  inviteTitle: ['Пригласи друга', 'Запроси друга', 'Invite a friend', 'Invita a un amigo', 'Convide um amigo', 'Mời bạn bè', 'Ajak teman', 'Bir arkadaşını davet et', 'Zaproś znajomego'],
  inviteCodeLabel: ['Твой код', 'Твій код', 'Your code', 'Tu código', 'Seu código', 'Mã của bạn', 'Kodemu', 'Kodun', 'Twój kod'],
  inviteText: ['Дуэли на 5 фраз и общая серия откроются сразу', 'Дуелі на 5 висловів і спільна серія відкриються одразу', '5-phrase duels and a shared streak unlock right away', 'Los duelos de 5 frases y la racha compartida se activan al momento', 'Os duelos de 5 frases e a sequência em dupla liberam na hora', 'Đấu 5 cụm từ và chuỗi chung mở ngay', 'Duel 5 frasa dan rangkaian bersama langsung terbuka', '5 ifadelik düellolar ve ortak seri hemen açılır', 'Pojedynki na 5 zwrotów i wspólna seria otworzą się od razu'],
  // 19 · ранг монеты (остальное — story_strings: rankOverline, rankTitle, rankPaid)
  rankNext: ['следующий — {next}', 'наступний — {next}', 'next: {next}', 'siguiente: {next}', 'próximo: {next}', 'tiếp theo: {next}', 'berikutnya: {next}', 'sonraki: {next}', 'następna: {next}'],
  // 20 · новая тема
  themeUnlockedTitle: ['«{theme}» открыта', '«{theme}» відкрито', '“{theme}” unlocked', '«{theme}» desbloqueado', '“{theme}” liberado', 'Đã mở “{theme}”', '“{theme}” terbuka', '“{theme}” açıldı', '„{theme}” odblokowany'],
  themesOpened: ['Открыто тем: {opened} из {total}', 'Відкрито тем: {opened} з {total}', 'Themes unlocked: {opened} of {total}', 'Temas desbloqueados: {opened} de {total}', 'Temas liberados: {opened} de {total}', 'Đã mở {opened}/{total} chủ đề', 'Tema terbuka: {opened} dari {total}', 'Açılan tema: {opened}/{total}', 'Odblokowane motywy: {opened} z {total}'],
  // 21 · отметка монет
  coinsBigUnit: ['{cw} на счету', '{cw} на рахунку', '{cw} in your wallet', '{cw} en tu cuenta', '{cw} na sua conta', '{cw} trong ví', '{cw} di dompet', 'hesabında {cw}', '{cw} na koncie'],
  coinsMilestoneTitle: ['Новая отметка', 'Нова позначка', 'New milestone', 'Nueva marca', 'Nova marca', 'Mốc mới', 'Pencapaian baru', 'Yeni eşik', 'Nowy próg'],
  coinsMilestoneText: ['Накоплено за {days} {days_w} · хватает на ранг {rank}', 'Зібрано за {days} {days_w} · вистачає на ранг {rank}', 'Saved over {days} {days_w} · enough for rank {rank}', 'Ahorradas en {days} {days_w} · alcanza para el rango {rank}', 'Juntadas em {days} {days_w} · dá para o rank {rank}', 'Tích lũy trong {days} {days_w} · đủ cho hạng {rank}', 'Terkumpul dalam {days} {days_w} · cukup untuk peringkat {rank}', '{days} {days_w} içinde biriktirildi · {rank}. rütbeye yetiyor', 'Zebrane w {days} {days_w} · starczy na rangę {rank}'],
  // 22 · ошибки
  mistakesOverline: ['Мои ошибки', 'Мої помилки', 'My mistakes', 'Mis errores', 'Meus erros', 'Lỗi của tôi', 'Kesalahanku', 'Hatalarım', 'Moje błędy'],
  mistakesClearedTitle: ['Разобрано ошибок: {cleared}', 'Розібрано помилок: {cleared}', 'Mistakes reviewed: {cleared}', 'Errores repasados: {cleared}', 'Erros revisados: {cleared}', 'Đã xem lại {cleared} lỗi', 'Kesalahan dibahas: {cleared}', 'İncelenen hata: {cleared}', 'Przerobione błędy: {cleared}'],
  mistakesLeft: ['Осталось: {left}', 'Залишилося: {left}', 'Left: {left}', 'Quedan: {left}', 'Restam: {left}', 'Còn lại: {left}', 'Sisa: {left}', 'Kalan: {left}', 'Zostało: {left}'],
  mistakesNoNew: ['новых сегодня нет', 'нових сьогодні немає', 'no new ones today', 'hoy no hay nuevos', 'nenhum novo hoje', 'hôm nay không có lỗi mới', 'hari ini tidak ada yang baru', 'bugün yeni yok', 'dziś brak nowych'],
  // 23 · диалог
  dialogOverline: ['Диалог «{title}»', 'Діалог «{title}»', 'Dialogue “{title}”', 'Diálogo «{title}»', 'Diálogo “{title}”', 'Hội thoại “{title}”', 'Dialog “{title}”', '“{title}” diyaloğu', 'Dialog „{title}”'],
  dialogGoalsTitle: ['Выполнено целей: {done} из {total}', 'Виконано цілей: {done} з {total}', 'Goals done: {done} of {total}', 'Objetivos cumplidos: {done} de {total}', 'Metas cumpridas: {done} de {total}', 'Hoàn thành {done}/{total} mục tiêu', 'Tujuan tercapai: {done} dari {total}', 'Tamamlanan hedef: {done}/{total}', 'Wykonane cele: {done} z {total}'],
  dialogStats: ['{turns} {turns_w} · {minutes} {minutes_w}', '{turns} {turns_w} · {minutes} {minutes_w}', '{turns} {turns_w} · {minutes} {minutes_w}', '{turns} {turns_w} · {minutes} {minutes_w}', '{turns} {turns_w} · {minutes} {minutes_w}', '{turns} {turns_w} · {minutes} {minutes_w}', '{turns} {turns_w} · {minutes} {minutes_w}', '{turns} {turns_w} · {minutes} {minutes_w}', '{turns} {turns_w} · {minutes} {minutes_w}'],
  dialogNoHints: ['без подсказок', 'без підказок', 'no hints', 'sin pistas', 'sem dicas', 'không dùng gợi ý', 'tanpa petunjuk', 'ipucusuz', 'bez podpowiedzi'],
  // ── анонс конкурса «Набор месяца» (владелец 29.10, макет claude.ai/artifact/GukYuSACfWas4P9toiG7sS v2) ──
  // зачем: ru — тексты макета, утверждённого владельцем; остальные 8 языков — черновик Моментов, Переводчик выверяет после коммита
  ctaOpenPacks: ['Открыть наборы', 'Відкрити набори', 'Open packs', 'Abrir packs', 'Abrir pacotes', 'Mở các bộ thẻ', 'Buka paket', 'Paketleri aç', 'Otwórz zestawy'],
  contestSponsors: ['Apple и Google не спонсоры конкурса.', 'Apple і Google не є спонсорами конкурсу.', 'Apple and Google are not sponsors of this contest.', 'Apple y Google no patrocinan este concurso.', 'Apple e Google não patrocinam este concurso.', 'Apple và Google không tài trợ cuộc thi này.', 'Apple dan Google bukan sponsor kontes ini.', 'Apple ve Google bu yarışmanın sponsoru değildir.', 'Apple i Google nie są sponsorami konkursu.'],
  contestOverline: ['Набор месяца', 'Набір місяця', 'Pack of the month', 'Pack del mes', 'Pacote do mês', 'Bộ thẻ của tháng', 'Paket bulan ini', 'Ayın paketi', 'Zestaw miesiąca'],
  contestStartTitle: ['С {date} — конкурс наборов каждый месяц', 'З {date} — конкурс наборів щомісяця', 'From {date}: a pack contest every month', 'Desde el {date}: concurso de packs cada mes', 'A partir de {date}: concurso de pacotes todo mês', 'Từ {date}: cuộc thi bộ thẻ mỗi tháng', 'Mulai {date}: kontes paket tiap bulan', '{date} itibarıyla her ay paket yarışması', 'Od {date} — konkurs zestawów co miesiąc'],
  contestStartText: ['Сделай набор карточек. Три набора с самым большим числом голосов за месяц получают Plus.', 'Створи набір карток. Три набори з найбільшою кількістю голосів за місяць отримують Plus.', 'Make a card pack. The three packs with the most votes in a month get Plus.', 'Crea un pack de tarjetas. Los tres packs con más votos del mes reciben Plus.', 'Crie um pacote de cartões. Os três pacotes com mais votos no mês ganham Plus.', 'Tạo một bộ thẻ. Ba bộ thẻ có nhiều phiếu nhất trong tháng nhận Plus.', 'Buat paket kartu. Tiga paket dengan suara terbanyak dalam sebulan mendapat Plus.', 'Bir kart paketi oluştur. Ayın en çok oy alan üç paketi Plus kazanır.', 'Stwórz zestaw kart. Trzy zestawy z największą liczbą głosów w miesiącu dostają Plus.'],
  contestCards: ['{cards} {cards_w}', '{cards} {cards_w}', '{cards} {cards_w}', '{cards} {cards_w}', '{cards} {cards_w}', '{cards} {cards_w}', '{cards} {cards_w}', '{cards} {cards_w}', '{cards} {cards_w}'],
  contestSamplePackA: ['Еда и кафе', 'Їжа й кафе', 'Food and café', 'Comida y café', 'Comida e café', 'Đồ ăn và quán cà phê', 'Makanan dan kafe', 'Yemek ve kafe', 'Jedzenie i kawiarnia'],
  contestSamplePackB: ['B2 глаголы', 'B2 дієслова', 'B2 verbs', 'Verbos B2', 'Verbos B2', 'Động từ B2', 'Kata kerja B2', 'B2 fiiller', 'Czasowniki B2'],
  contestSamplePackC: ['Поездка', 'Подорож', 'Trip', 'Viaje', 'Viagem', 'Chuyến đi', 'Perjalanan', 'Seyahat', 'Podróż'],
  contestVoteOverline: ['Как голосовать', 'Як голосувати', 'How to vote', 'Cómo votar', 'Como votar', 'Cách bình chọn', 'Cara memilih', 'Nasıl oy verilir', 'Jak głosować'],
  contestVoteTitle: ['Голос — это ♥ на наборе', 'Голос — це ♥ на наборі', 'A vote is a ♥ on a pack', 'Un voto es un ♥ en un pack', 'Um voto é um ♥ em um pacote', 'Một phiếu là một ♥ trên bộ thẻ', 'Satu suara adalah ♥ pada paket', 'Oy, pakete verilen bir ♥', 'Głos to ♥ przy zestawie'],
  contestVoteDays: ['{days_w} в приложении', '{days_w} у застосунку', '{days_w} in the app', '{days_w} en la app', '{days_w} no app', '{days_w} trong ứng dụng', '{days_w} di aplikasi', 'uygulamada {days_w}', '{days_w} w aplikacji'],
  contestVoteLessons: ['{done_w}', '{done_w}', '{done_w}', '{done_w}', '{done_w}', '{done_w}', '{done_w}', '{done_w}', '{done_w}'],
  contestVoteVotes: ['{votes_w} в месяц', '{votes_w} на місяць', '{votes_w} a month', '{votes_w} al mes', '{votes_w} por mês', '{votes_w} mỗi tháng', '{votes_w} per bulan', 'ayda {votes_w}', '{votes_w} w miesiącu'],
  contestVoteText: ['За свой набор голосовать нельзя. Участвуют наборы, созданные в этом месяце.', 'За свій набір голосувати не можна. Беруть участь набори, створені цього місяця.', 'You can’t vote for your own pack. Only packs made this month take part.', 'No puedes votar por tu propio pack. Participan los packs creados este mes.', 'Não dá para votar no seu próprio pacote. Participam os pacotes criados neste mês.', 'Không thể bình chọn cho bộ thẻ của mình. Chỉ các bộ thẻ tạo trong tháng này tham gia.', 'Tidak bisa memilih paket sendiri. Yang ikut hanya paket yang dibuat bulan ini.', 'Kendi paketine oy veremezsin. Bu ay oluşturulan paketler katılır.', 'Nie można głosować na własny zestaw. Biorą udział zestawy utworzone w tym miesiącu.'],
  contestPrizesOverline: ['Призы за места', 'Призи за місця', 'Prizes by place', 'Premios por puesto', 'Prêmios por colocação', 'Giải thưởng theo hạng', 'Hadiah per peringkat', 'Sıralama ödülleri', 'Nagrody za miejsca'],
  contestPrizesTitle: ['Итоги — 1 числа каждого месяца', 'Підсумки — 1 числа щомісяця', 'Results on the 1st of every month', 'Resultados el día 1 de cada mes', 'Resultados no dia 1 de cada mês', 'Kết quả vào ngày 1 hằng tháng', 'Hasil tiap tanggal 1', 'Sonuçlar her ayın 1’inde', 'Wyniki 1. dnia każdego miesiąca'],
  contestPrizesText: ['Plus включается сам. Победителю придёт своя история.', 'Plus вмикається сам. Переможцю прийде своя історія.', 'Plus turns on by itself. Winners get their own story.', 'Plus se activa solo. Los ganadores reciben su propia historia.', 'O Plus é ativado sozinho. Quem vence recebe uma história própria.', 'Plus tự bật. Người thắng sẽ nhận câu chuyện riêng.', 'Plus aktif otomatis. Pemenang mendapat cerita sendiri.', 'Plus kendiliğinden açılır. Kazananlara özel bir hikâye gelir.', 'Plus włącza się sam. Zwycięzca dostanie własną historię.'],
  contestPlace: ['{place} место', '{place} місце', 'Place {place}', 'Puesto {place}', '{place}º lugar', 'Hạng {place}', 'Peringkat {place}', '{place}. sıra', '{place}. miejsce'],
  contestPlusMonths: ['{months} {months_w}', '{months} {months_w}', '{months} {months_w}', '{months} {months_w}', '{months} {months_w}', '{months} {months_w}', '{months} {months_w}', '{months} {months_w}', '{months} {months_w}'],
  contestInviteOverline: ['Зови друзей', 'Клич друзів', 'Invite friends', 'Invita a amigos', 'Convide amigos', 'Mời bạn bè', 'Ajak teman', 'Arkadaşlarını davet et', 'Zaproś znajomych'],
  contestInviteTitle: ['{coins} {cw} тебе и другу', '{coins} {cw} тобі й другові', '{coins} {cw} for you and a friend', '{coins} {cw} para ti y tu amigo', '{coins} {cw} para você e um amigo', '{coins} {cw} cho bạn và bạn bè', '{coins} {cw} untukmu dan teman', 'Sana ve arkadaşına {coins} {cw}', '{coins} {cw} dla ciebie i znajomego'],
  contestInviteText: ['Монеты придут, когда друг пройдёт первый урок.', 'Монети прийдуть, коли друг пройде перший урок.', 'The coins arrive when your friend finishes the first lesson.', 'Las monedas llegan cuando tu amigo termina la primera lección.', 'As moedas chegam quando seu amigo conclui a primeira lição.', 'Xu sẽ đến khi bạn bè học xong bài đầu tiên.', 'Koin masuk saat temanmu menyelesaikan pelajaran pertama.', 'Arkadaşın ilk dersi bitirince coinler gelir.', 'Monety przyjdą, gdy znajomy ukończy pierwszą lekcję.'],
  contestInviteOne: ['друг прошёл урок', 'друг пройшов урок', 'friend did a lesson', 'amigo hizo una lección', 'amigo fez uma lição', 'bạn đã học một bài', 'teman selesai satu pelajaran', 'arkadaş ders bitirdi', 'znajomy zrobił lekcję'],
  contestInviteOneReward: ['{coins} {cw} обоим', '{coins} {cw} обом', '{coins} {cw} each', '{coins} {cw} cada uno', '{coins} {cw} para cada um', 'Mỗi người {coins} {cw}', '{coins} {cw} masing-masing', 'İkinize {coins} {cw}', 'Po {coins} {cw}'],
  // зачем (координатор 29.10): Plus за друзей — тоже только когда каждый прошёл урок; подпись плитки говорит это прямо
  contestInviteThree: ['{friends_w} прошли урок', '{friends_w} пройшли урок', '{friends_w} did a lesson', '{friends_w} hicieron una lección', '{friends_w} fizeram uma lição', '{friends_w} đã học một bài', '{friends_w} selesai satu pelajaran', '{friends_w} ders bitirdi', '{friends_w} zrobiło lekcję'],
  contestInviteThreeReward: ['Plus на {plusDays} {plusDays_w}', 'Plus на {plusDays} {plusDays_w}', 'Plus for {plusDays} {plusDays_w}', 'Plus por {plusDays} {plusDays_w}', 'Plus por {plusDays} {plusDays_w}', 'Plus {plusDays} {plusDays_w}', 'Plus {plusDays} {plusDays_w}', '{plusDays} {plusDays_w} Plus', 'Plus na {plusDays} {plusDays_w}'],
} as const satisfies Readonly<Record<string, Nine>>;

export type StoryTemplateStringKey = keyof typeof S;
export const STORY_TEMPLATE_STRING_KEYS = Object.keys(S) as readonly StoryTemplateStringKey[];

// ── слова к числам (таблица Переводчика «Слова к числам»; vi, id, tr — слово после числа не меняется) ──────────────
const f3 = (one: string, few: string, many: string): PluralForms => ({ one, few, many });
const f2 = (one: string, many: string): PluralForms => ({ one, few: many, many });
const f1 = (word: string): PluralForms => ({ one: word, few: word, many: word });
type WordRow = Readonly<Record<Lang, PluralForms>>;

const WORDS = {
  day: { ru: f3('день', 'дня', 'дней'), uk: f3('день', 'дні', 'днів'), pl: f3('dzień', 'dni', 'dni'), en: f2('day', 'days'), es: f2('día', 'días'), 'pt-BR': f2('dia', 'dias'), vi: f1('ngày'), id: f1('hari'), tr: f1('gün') },
  lesson: { ru: f3('урок', 'урока', 'уроков'), uk: f3('урок', 'уроки', 'уроків'), pl: f3('lekcja', 'lekcje', 'lekcji'), en: f2('lesson', 'lessons'), es: f2('lección', 'lecciones'), 'pt-BR': f2('lição', 'lições'), vi: f1('bài học'), id: f1('pelajaran'), tr: f1('ders') },
  minute: { ru: f3('минута', 'минуты', 'минут'), uk: f3('хвилина', 'хвилини', 'хвилин'), pl: f3('minuta', 'minuty', 'minut'), en: f2('minute', 'minutes'), es: f2('minuto', 'minutos'), 'pt-BR': f2('minuto', 'minutos'), vi: f1('phút'), id: f1('menit'), tr: f1('dakika') },
  chapter: { ru: f3('глава', 'главы', 'глав'), uk: f3('розділ', 'розділи', 'розділів'), pl: f3('rozdział', 'rozdziały', 'rozdziałów'), en: f2('chapter', 'chapters'), es: f2('capítulo', 'capítulos'), 'pt-BR': f2('capítulo', 'capítulos'), vi: f1('chương'), id: f1('bab'), tr: f1('ünite') },
  person: { ru: f3('человек', 'человека', 'человек'), uk: f3('людина', 'людини', 'людей'), pl: f3('osoba', 'osoby', 'osób'), en: f2('person', 'people'), es: f2('persona', 'personas'), 'pt-BR': f2('pessoa', 'pessoas'), vi: f1('người'), id: f1('orang'), tr: f1('kişi') },
  card: { ru: f3('карточка', 'карточки', 'карточек'), uk: f3('картка', 'картки', 'карток'), pl: f3('karta', 'karty', 'kart'), en: f2('card', 'cards'), es: f2('tarjeta', 'tarjetas'), 'pt-BR': f2('cartão', 'cartões'), vi: f1('thẻ'), id: f1('kartu'), tr: f1('kart') },
  turn: { ru: f3('реплика', 'реплики', 'реплик'), uk: f3('репліка', 'репліки', 'реплік'), pl: f3('kwestia', 'kwestie', 'kwestii'), en: f2('line', 'lines'), es: f2('frase', 'frases'), 'pt-BR': f2('fala', 'falas'), vi: f1('lượt nói'), id: f1('giliran'), tr: f1('replik') },
  exam: { ru: f3('экзамен', 'экзамена', 'экзаменов'), uk: f3('іспит', 'іспити', 'іспитів'), pl: f3('egzamin', 'egzaminy', 'egzaminów'), en: f2('exam', 'exams'), es: f2('examen', 'exámenes'), 'pt-BR': f2('exame', 'exames'), vi: f1('bài thi'), id: f1('ujian'), tr: f1('sınav') },
  // анонс конкурса (29.10) — ru по макету владельца; остальные языки — черновик, Переводчик выверяет
  month: { ru: f3('месяц', 'месяца', 'месяцев'), uk: f3('місяць', 'місяці', 'місяців'), pl: f3('miesiąc', 'miesiące', 'miesięcy'), en: f2('month', 'months'), es: f2('mes', 'meses'), 'pt-BR': f2('mês', 'meses'), vi: f1('tháng'), id: f1('bulan'), tr: f1('ay') },
  friend: { ru: f3('друг', 'друга', 'друзей'), uk: f3('друг', 'друзі', 'друзів'), pl: f3('znajomy', 'znajomych', 'znajomych'), en: f2('friend', 'friends'), es: f2('amigo', 'amigos'), 'pt-BR': f2('amigo', 'amigos'), vi: f1('bạn'), id: f1('teman'), tr: f1('arkadaş') },
  vote: { ru: f3('голос', 'голоса', 'голосов'), uk: f3('голос', 'голоси', 'голосів'), pl: f3('głos', 'głosy', 'głosów'), en: f2('vote', 'votes'), es: f2('voto', 'votos'), 'pt-BR': f2('voto', 'votos'), vi: f1('phiếu'), id: f1('suara'), tr: f1('oy') },
  lessonDone: { ru: f3('пройденный урок', 'пройденных урока', 'пройденных уроков'), uk: f3('пройдений урок', 'пройдені уроки', 'пройдених уроків'), pl: f3('ukończona lekcja', 'ukończone lekcje', 'ukończonych lekcji'), en: f2('lesson done', 'lessons done'), es: f2('lección hecha', 'lecciones hechas'), 'pt-BR': f2('lição feita', 'lições feitas'), vi: f1('bài học đã xong'), id: f1('pelajaran selesai'), tr: f1('tamamlanan ders') },
} as const satisfies Readonly<Record<string, WordRow>>;

/** Какая таблица к какому плейсхолдеру (Переводчик 28.10): `{days}` → `{days_w}` и т. д. */
const WORD_OF: Readonly<Record<string, keyof typeof WORDS>> = {
  days: 'day', next: 'day', daysLeft: 'day', active: 'day', streak: 'day',
  lessons: 'lesson', minutes: 'minute', chapters: 'chapter', count: 'person', cards: 'card', turns: 'turn', exams: 'exam',
  // анонс конкурса: {months} месяцев Plus, {friends} друзей, {votes} голосов, {done} пройденных уроков, {plusDays} дней Plus
  months: 'month', friends: 'friend', votes: 'vote', done: 'lessonDone', plusDays: 'day',
};

/** Число из переменной: 1180, «1 180» (с неразрывным пробелом) → 1180; не число → null. */
function countOf(value: string | number | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const digits = value.replace(/[^\d]/g, '');
  return digits ? Number(digits) : null;
}

/** Число с разрядами для текста (1 420, 10 000) — неразрывный пробел, число не рвётся. */
export function tplNumber(n: number): string {
  const value = Math.max(0, Math.round(Number(n)) || 0);
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Слово к числу по таблице (день/урок/…) в форме под число — для подписей под крупными числами. */
export function tplWord(lang: Lang, table: keyof typeof WORDS, n: number): string {
  const row: WordRow = WORDS[table];
  return pluralWord(lang, n, row[lang] ?? row.en);
}

/** Текст кадра на языке интерфейса: подставляет значения, слова к числам ({x_w}) и слово «монета» ({cw}). Неизвестный язык — английский. */
export function tplText(lang: Lang, key: StoryTemplateStringKey, vars: Readonly<Record<string, string | number>> = {}): string {
  const row = S[key] as Nine;
  const raw = row[LANG_INDEX[lang] ?? LANG_INDEX.en!]!;
  const filled: Record<string, string> = {};
  for (const [name, value] of Object.entries(vars)) {
    filled[name] = typeof value === 'number' ? tplNumber(value) : value;
    const table = WORD_OF[name];
    const n = countOf(value);
    if (table && n !== null) filled[`${name}_w`] = tplWord(lang, table, n);
  }
  const coins = countOf(vars.coins) ?? countOf(vars.gap);
  if (coins !== null) filled.cw = momentCoinWord(lang, coins);
  // зачем (координатор 18.10, длинные языки): число не отрывается от слова при переносе — неразрывный пробел на подстановке
  return glueNumbers(raw.replace(/\{(\w+)\}/g, (whole, name: string) => filled[name] ?? whole));
}
