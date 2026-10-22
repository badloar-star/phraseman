# «Друзья»: пуши и строки ленты уведомлений на 9 языках — черновик для 1 · ЯДРО (Переводчик, координатор 22.10)

Status: Draft — ключи и выбор языка согласовать с 1 · ЯДРО; сервер правит Ядро
Owner: «10 · ПЕРЕВОДЧИК»

## Что сейчас

Все тексты пушей «Друзей» собираются на сервере и зашиты по-русски, без учёта языка получателя:

| где | что |
|---|---|
| `functions/src/friends_together_core.ts:286` `friendNudgePushCopy` | «Позвать»: заголовок и текст, с серией и без |
| `functions/src/friends_together.ts:243` | строка ленты «Пять минут на практику?» |
| `functions/src/friend_activity_likes.ts:401, 440–441` | «Дать пять»: лента + пуш |
| `functions/src/friends_duel.ts:232, 248, 324, 350, 405` | дуэль: вызов, итог, отказ |
| `functions/src/friends_lesson_together.ts:187, 207–208, 266, 287` | «Занятие вместе»: приглашение и награда |

## Предложение по языку (решает Ядро)

Язык получателя — тот же, что уже читают админские рассылки (`admin_push_jobs.ts:216–221`): `data.lang || data.app_lang ||
data.pushTokenLang || progress.lang || progress.app_lang`, нормализовать к одному из 9. Если язык не найден — ru, как сейчас.
Строки ленты (`buildUserNotification.text`) — того же получателя, то есть тот же язык.
Один модуль `functions/src/friends_push_copy.ts`: словарь ниже + `friendsPushText(lang, key, vars)` + склонение ru/uk/pl.
Тогда новые пуши не останутся русскими.

Правила: обращение на «ты»; имя не склоняем (`{name}` — подлежащее или перед двоеточием); род неизвестен — безлично. Термины —
как в приложении (`app/friends_together/pair_copy.ts`, `duel_copy.ts`): «Дать пять» = High five / Chocar los cinco / Toca aqui /
Đập tay / Beri tos / Çak / Przybij piątkę; «занятие» = session / sesión / sessão / buổi học / sesi / oturum / zajęcia.

## Словарь (порядок: ru, uk, en, es, pt-BR, vi, id, tr, pl)

| ключ | ru | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|---|
| nudgeStreakTitle | {name}: серия вдвоём ждёт | {name}: серія вдвох чекає | {name}: your streak together is waiting | {name}: su racha juntos te espera | {name}: a sequência de vocês espera | {name}: chuỗi chung đang chờ | {name}: rangkaian bersama menunggu | {name}: birlikte serin bekliyor | {name}: wasza wspólna seria czeka |
| nudgeStreakBody | {n} {дней} подряд. Одно маленькое занятие — и огонь не погаснет. | {n} {днів} поспіль. Одне маленьке заняття — і вогонь не згасне. | {n} {days} in a row. One short session keeps the flame alive. | {n} {días} seguidos. Una sesión corta y la llama sigue viva. | {n} {dias} seguidos. Uma sessão curta e a chama continua acesa. | {n} ngày liên tiếp. Một buổi học ngắn để lửa không tắt. | {n} hari berturut-turut. Satu sesi singkat dan apinya tetap menyala. | {n} gün üst üste. Kısa bir oturum ve alev sönmez. | {n} {dni} z rzędu. Jedne krótkie zajęcia i płomień nie zgaśnie. |
| nudgeTitle | {name}: пять минут практики? | {name}: п’ять хвилин практики? | {name}: five minutes of practice? | {name}: ¿cinco minutos de práctica? | {name}: cinco minutos de prática? | {name}: năm phút luyện tập nhé? | {name}: latihan lima menit? | {name}: beş dakika pratik? | {name}: pięć minut ćwiczeń? |
| nudgeBody | Одно маленькое занятие. | Одне маленьке заняття. | Just one short session. | Solo una sesión corta. | Só uma sessão curta. | Chỉ một buổi học ngắn. | Cukup satu sesi singkat. | Sadece kısa bir oturum. | Tylko jedne krótkie zajęcia. |
| nudgeFeed | Пять минут на практику? | П’ять хвилин на практику? | Five minutes to practice? | ¿Cinco minutos para practicar? | Cinco minutos para praticar? | Năm phút luyện tập nhé? | Lima menit untuk latihan? | Pratik için beş dakika? | Pięć minut na ćwiczenia? |
| highFiveTitle | {name} даёт пять | {name} дає п’ять | {name} gave you a high five | {name} te choca los cinco | {name} te deu um toque | {name} đập tay với bạn | {name} memberi tos | {name} sana çak yaptı | {name} przybija piątkę |
| highFiveBody | Пятюня получена. | П’ятюню отримано. | High five received. | Choque recibido. | Toque recebido. | Đã nhận cú đập tay. | Tos diterima. | Çak alındı. | Piątka odebrana. |
| highFiveFeed | Пятюня на удачу уже здесь. | П’ятюня на щастя вже тут. | A high five for luck is here. | Un choque de manos para la suerte. | Um toque para dar sorte chegou. | Cú đập tay lấy may đã tới. | Tos keberuntungan sudah datang. | Şans için bir çak geldi. | Piątka na szczęście już jest. |
| duelTitle | {name} вызывает на дуэль | {name} викликає на дуель | {name} challenges you to a duel | {name} te reta a un duelo | {name} desafia você para um duelo | {name} thách đấu bạn | {name} menantangmu duel | {name} seni düelloya davet ediyor | {name} wyzywa cię na pojedynek |
| duelBody | 5 фраз · 24 часа на ответ | 5 фраз · 24 години на відповідь | 5 phrases · 24 hours to answer | 5 frases · 24 horas para responder | 5 frases · 24 horas para responder | 5 câu · 24 giờ để trả lời | 5 frasa · 24 jam untuk menjawab | 5 cümle · cevap için 24 saat | 5 fraz · 24 godziny na odpowiedź |
| duelFeed | Вызов на дуэль | Виклик на дуель | Duel challenge | Desafío a duelo | Desafio para duelo | Lời thách đấu | Tantangan duel | Düello daveti | Wyzwanie na pojedynek |
| duelResultTitle | Итог дуэли | Підсумок дуелі | Duel result | Resultado del duelo | Resultado do duelo | Kết quả trận đấu | Hasil duel | Düello sonucu | Wynik pojedynku |
| duelResultBody ⚑ | {name}: ответ на дуэль готов | {name}: відповідь на дуель готова | {name} has played the duel | {name} ya jugó el duelo | {name} já jogou o duelo | {name} đã chơi trận đấu | {name} sudah main duel | {name} düelloyu oynadı | {name}: odpowiedź na pojedynek gotowa |
| duelDeclinedFeed ⚑ | Дуэль не принята | Дуель не прийнято | Duel declined | Duelo rechazado | Duelo recusado | Lời thách đấu bị từ chối | Duel ditolak | Düello reddedildi | Pojedynek nieprzyjęty |
| lessonInviteTitle | {name} зовёт на занятие | {name} кличе на заняття | {name} invites you to a session | {name} te invita a una sesión | {name} chama você para uma sessão | {name} rủ bạn học cùng | {name} mengajakmu ke sesi | {name} seni oturuma çağırıyor | {name} zaprasza cię na zajęcia |
| lessonInviteBody | Урок {l} · Занятие {s} | Урок {l} · Заняття {s} | Lesson {l} · Session {s} | Lección {l} · Sesión {s} | Lição {l} · Sessão {s} | Bài {l} · Buổi {s} | Pelajaran {l} · Sesi {s} | Ders {l} · Oturum {s} | Lekcja {l} · Zajęcia {s} |
| lessonInviteFeed | Зовёт на занятие | Кличе на заняття | Invites you to a session | Te invita a una sesión | Chama você para uma sessão | Rủ bạn học cùng | Mengajakmu ke sesi | Seni oturuma çağırıyor | Zaprasza na zajęcia |
| lessonDoneTitle | Занятие вместе | Заняття разом | Session together | Sesión juntos | Sessão juntos | Học cùng nhau | Sesi bersama | Birlikte oturum | Wspólne zajęcia |
| lessonDoneBody | +{n} {монеты} вам обоим | +{n} {монети} вам обом | +{n} {coins} for both of you | +{n} {monedas} para los dos | +{n} {moedas} para vocês dois | +{n} xu cho cả hai | +{n} koin untuk kalian berdua | İkinize de +{n} jeton | +{n} {monet} dla was obojga |
| lessonDoneFeed | +{n} за занятие вместе | +{n} за заняття разом | +{n} for a session together | +{n} por una sesión juntos | +{n} por uma sessão juntos | +{n} cho buổi học cùng nhau | +{n} untuk sesi bersama | Birlikte oturum için +{n} | +{n} za wspólne zajęcia |

Склонения (как `slavic` в `pair_copy.ts`):
- дни: ru «день / дня / дней», uk «день / дні / днів», pl «dzień / dni / dni»; en «day / days», es «día / días»,
  pt «dia / dias»; vi, id, tr — без изменения.
- монеты: ru «монета / монеты / монет», uk «монета / монети / монет», pl «moneta / monety / monet»;
  en «coin / coins», es «moneda / monedas», pt «moeda / moedas».

⚑ Строки с родом — сейчас в коде «ответил(а) на дуэль» и «не принял(а) дуэль». Предлагаю безличные формы (как в
`duel_copy.ts`: «род неизвестен — безлично»): ru «{name}: ответ на дуэль готов», «дуэль не принята». В en, es, pt, vi, id
и tr рода нет, там формы естественные. Строка ленты — отдельная строка под заголовком «имя + подпись по типу» (`NotificationCenterButton`: rowTitle / rowPreview),
поэтому `duelDeclinedFeed` — самостоятельная фраза с заглавной, как соседние строки ленты (поправлено 22.10 после вычитки модуля Ядра).

## Не трогаю

Сервер — зона 1 · ЯДРО, правка и выкладка у него. Подбор языка, ключи и сторож («ни одной кириллической строки в пушах
вне словаря») — на его решение. После правки Ядра вычитаю, что в словарь ушло ровно это.
