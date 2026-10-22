# «Друзья»: идеи 6, 8 и 9 — черновик текстов на 9 языках (Переводчик → 8 · МОМЕНТЫ)

Status: Draft — для 8 · МОМЕНТЫ; ru — из макета `docs/design/v2-app/friends-full.html` (`friends-full-c.js` идея 6,
`friends-full-d.js` идеи 8–9 и «Уведомления»), кроме отмеченных ⚑ отклонений под правила кода
Owner: «10 · ПЕРЕВОДЧИК» (поручение координатора 22.10)

Порядок колонок как в `app/friends_together/pair_copy.ts`: ru, uk, en, es, pt-BR, vi, id, tr, pl.

## Правила (как в `pair_copy.ts` и `duel_copy.ts`)

- Обращение на «ты»: uk «ти», es «tú», pt-BR «você», vi «bạn», id «kamu», tr «sen», pl «ty».
- **Имена не склоняем.** «Неделя Ирины», «Поддержать Лидию», «от Алекса» для любого имени не собрать, поэтому имя идёт
  подстановкой `{name}` там, где падеж не нужен (перед двоеточием, в начале фразы как подлежащее). В остальных местах —
  «друг» или безличная форма. Это ⚑ отклонения от макета, их проверит «Сверка».
- **Род неизвестен** — глаголы в настоящем времени или безлично («Марк отдыхал» → «Без занятий на этой неделе»).
- Термины берём из кода:
  - «Дать пять» / «Пять отправлено» = `PAIR_COPY.highFive` / `highFived`;
  - «Позвать» = `PAIR_COPY.call`;
  - «Позже» = `duel_copy.later`;
  - «Пик» / «этаж» = `components/spire/spire_strings.ts`;
  - «Фраза дня» = `components/DailyPhraseCard.tsx`;
  - «Энергия закончилась» = `components/energy/EnergyStopSheet.tsx`.

## Идея 6 · Итог недели друга

| ключ | ru | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|---|
| weekRailTitle | Итоги недели | Підсумки тижня | Weekly recaps | Resúmenes de la semana | Resumos da semana | Tổng kết tuần | Rekap mingguan | Haftanın özetleri | Podsumowania tygodnia |
| weekRailWhen | пн · 9:00 | пн · 9:00 | Mon · 9:00 | lun · 9:00 | seg · 9:00 | T2 · 9:00 | Sen · 9:00 | Pzt · 9:00 | pon. · 9:00 |
| weekRested ⚑ | Без занятий на этой неделе. Позовёшь? | Без занять цього тижня. Покличеш? | No lessons this week. Give a nudge? | Sin estudiar esta semana. ¿Le avisas? | Sem estudar nesta semana. Quer chamar? | Tuần này chưa học. Rủ không? | Minggu ini belum belajar. Mau ajak? | Bu hafta çalışmadı. Çağırır mısın? | W tym tygodniu bez nauki. Zawołasz? |
| weekDetailTitle ⚑ | Неделя · {name} | Тиждень · {name} | {name}’s week | Semana de {name} | Semana de {name} | Tuần của {name} | Minggu {name} | {name} · hafta | Tydzień · {name} |
| factStreakDays | дней серии | днів серії | streak days | días de racha | dias de sequência | ngày chuỗi | hari beruntun | seri günü | dni serii |
| factLessons | занятий | занять | lessons | lecciones | lições | buổi học | sesi | ders | zajęć |
| factPeakFloor | этаж Пика | поверх Піку | Peak floor | piso del Pico | andar do Pico | tầng Đỉnh | lantai Puncak | Zirve katı | piętro Szczytu |
| bestDay | Лучший день | Найкращий день | Best day | Mejor día | Melhor dia | Ngày tốt nhất | Hari terbaik | En iyi gün | Najlepszy dzień |
| bestDayValue | {day} · {n} занятия и диалог | {day} · {n} заняття й діалог | {day} · {n} lessons and a dialogue | {day} · {n} lecciones y un diálogo | {day} · {n} lições e um diálogo | {day} · {n} buổi học và một hội thoại | {day} · {n} sesi dan satu dialog | {day} · {n} ders ve bir diyalog | {day} · {n} zajęcia i dialog |
| challengeDuel | Вызвать на дуэль | Викликати на дуель | Challenge to a duel | Retar a un duelo | Desafiar para um duelo | Thách đấu | Tantang duel | Düelloya davet et | Wyzwij na pojedynek |
| highFiveToast | Пятюня отправлена | П’ятюню відправлено | High five sent | Choque enviado | Toque enviado | Đã đập tay | Tos terkirim | Çak gönderildi | Piątka wysłana |
| myWeek | Моя неделя | Мій тиждень | My week | Mi semana | Minha semana | Tuần của tôi | Mingguku | Haftam | Mój tydzień |
| myWeekSub | Так её видят друзья в понедельник | Так його бачать друзі в понеділок | How friends see it on Monday | Así la ven tus amigos el lunes | É assim que seus amigos a veem na segunda | Bạn bè thấy thế này vào thứ Hai | Begini teman melihatnya hari Senin | Arkadaşların pazartesi böyle görür | Tak widzą go znajomi w poniedziałek |
| gaveFiveOne | {name} даёт пять | {name} дає п’ять | {name} gave you a high five | {name} te choca los cinco | {name} te deu um toque | {name} đập tay với bạn | {name} memberi tos | {name} sana çak yaptı | {name} przybija piątkę |
| gaveFiveTwo | {a} и {b} дали пять | {a} і {b} дали п’ять | {a} and {b} gave you a high five | {a} y {b} te chocaron los cinco | {a} e {b} te deram um toque | {a} và {b} đập tay với bạn | {a} dan {b} memberi tos | {a} ve {b} sana çak yaptı | {a} i {b} przybili piątkę |
| gaveFiveWhen | сегодня в {t1} и {t2} | сьогодні о {t1} і {t2} | today at {t1} and {t2} | hoy a las {t1} y {t2} | hoje às {t1} e {t2} | hôm nay lúc {t1} và {t2} | hari ini pukul {t1} dan {t2} | bugün {t1} ve {t2} | dziś o {t1} i {t2} |
| showMyWeek | Показывать друзьям мою неделю | Показувати друзям мій тиждень | Show my week to friends | Mostrar mi semana a mis amigos | Mostrar minha semana aos amigos | Cho bạn bè xem tuần của tôi | Tampilkan mingguku ke teman | Haftamı arkadaşlarıma göster | Pokazuj znajomym mój tydzień |
| emptyTitle | Итоги недели — в понедельник | Підсумки тижня — у понеділок | Weekly recaps arrive on Monday | Los resúmenes llegan el lunes | Os resumos chegam na segunda | Tổng kết tuần có vào thứ Hai | Rekap mingguan muncul hari Senin | Haftanın özetleri pazartesi gelir | Podsumowania tygodnia — w poniedziałek |
| emptySub | Первый итог — после 7 дней дружбы | Перший підсумок — після 7 днів дружби | The first one comes after 7 days as friends | El primero llega tras 7 días de amistad | O primeiro chega após 7 dias de amizade | Bản đầu tiên có sau 7 ngày kết bạn | Rekap pertama setelah 7 hari berteman | İlki 7 günlük arkadaşlıktan sonra | Pierwsze — po 7 dniach znajomości |

Примечания к идее 6:
- `weekRailWhen` — день недели лучше брать из `Intl` (`weekday: 'short'`), а не из таблицы. Даты «13–19 октября» тоже через `Intl`.
- Строка «лучшее за неделю» («Поднялась на 2 этажа Пика», «Первая неделя без пропусков») — ⚑ в макете с родом.
  Предлагаю безличные шаблоны:

| ключ | ru | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|---|
| lineFloorsUp | +{n} этажа Пика за неделю | +{n} поверхи Піку за тиждень | +{n} Peak floors this week | +{n} pisos del Pico esta semana | +{n} andares do Pico na semana | +{n} tầng Đỉnh trong tuần | +{n} lantai Puncak minggu ini | Bu hafta +{n} Zirve katı | +{n} piętra Szczytu w tym tygodniu |
| lineNoGaps | Первая неделя без пропусков | Перший тиждень без пропусків | First week with no missed days | Primera semana sin faltar | Primeira semana sem faltas | Tuần đầu không bỏ ngày nào | Minggu pertama tanpa bolos | Boşluksuz ilk hafta | Pierwszy tydzień bez przerw |

  В `lineFloorsUp` для ru, uk и pl нужно склонение (`slavic`): ru «этаж / этажа / этажей», uk «поверх / поверхи / поверхів»,
  pl «piętro / piętra / pięter». Для en, es и pt при 1 — единственное число. То же для `factStreakDays` и `factLessons`
  (ru «день / дня / дней серии», «занятие / занятия / занятий»).

## Идея 8 · Фраза дня вдвоём

| ключ | ru | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|---|
| phraseKicker | Фраза дня вдвоём | Вислів дня вдвох | Phrase of the day together | Frase del día en pareja | Frase do dia juntos | Cụm từ hôm nay cùng bạn | Frasa hari ini bersama | Birlikte günün ifadesi | Zwrot dnia razem |
| phraseQuestion | Как сказать «{phrase}»? | Як сказати «{phrase}»? | How do you say “{phrase}”? | ¿Cómo se dice «{phrase}»? | Como se diz “{phrase}”? | Nói “{phrase}” thế nào? | Bagaimana mengatakan “{phrase}”? | “{phrase}” nasıl söylenir? | Jak powiedzieć „{phrase}”? |
| friendsAnsweredLocked | {a} и {b} уже ответили · откроется после твоего | {a} і {b} уже відповіли · відкриється після твоєї | {a} and {b} have answered · see theirs after yours | {a} y {b} ya respondieron · verás sus respuestas tras la tuya | {a} e {b} já responderam · veja depois de responder | {a} và {b} đã trả lời · xem sau khi bạn trả lời | {a} dan {b} sudah menjawab · terbuka setelah kamu | {a} ve {b} cevapladı · seninkinden sonra açılır | {a} i {b} już odpowiedzieli · zobaczysz po swojej |
| friendsAnsweredCount | {n} друга уже ответили | {n} друзі вже відповіли | {n} friends have answered | {n} amigos ya respondieron | {n} amigos já responderam | {n} người bạn đã trả lời | {n} teman sudah menjawab | {n} arkadaşın cevapladı | {n} znajomych już odpowiedziało |
| youAreFirst | Ты первый из друзей — их ответы появятся здесь до полуночи. ⚑ | Ти перший серед друзів — їхні відповіді з’являться тут до півночі. | You’re the first of your friends — their answers appear here until midnight. | Eres el primero de tus amigos: sus respuestas aparecerán aquí hasta medianoche. | Você é o primeiro dos seus amigos — as respostas deles aparecem aqui até a meia-noite. | Bạn là người đầu tiên — câu trả lời của bạn bè sẽ hiện ở đây đến nửa đêm. | Kamu yang pertama — jawaban teman muncul di sini sampai tengah malam. | Arkadaşların arasında ilk sensin — cevapları gece yarısına kadar burada görünür. | Jesteś pierwszy — odpowiedzi znajomych pojawią się tu do północy. |
| offlineToast | Нет связи — ответ не отправлен. Попробуй ещё раз. | Немає зв’язку — відповідь не надіслано. Спробуй ще раз. | No connection — answer not sent. Try again. | Sin conexión: la respuesta no se envió. Inténtalo de nuevo. | Sem conexão — resposta não enviada. Tente de novo. | Không có mạng — chưa gửi câu trả lời. Thử lại nhé. | Tidak ada koneksi — jawaban tidak terkirim. Coba lagi. | Bağlantı yok — cevap gönderilmedi. Tekrar dene. | Brak połączenia — odpowiedź nie została wysłana. Spróbuj ponownie. |
| retry | Повторить | Повторити | Retry | Reintentar | Tentar de novo | Thử lại | Coba lagi | Tekrar dene | Spróbuj ponownie |

Примечания к идее 8:
- ⚑ `youAreFirst`: «Ты первый» в ru, uk, es, pt и pl мужского рода. Род самого человека приложение знает не всегда.
  Безличная замена: ru «Пока никто из друзей не ответил — их ответы появятся здесь до полуночи». Решать координатору;
  уровень безличности должен совпасть с остальными экранами «Друзей».
- Пояснение после ответа («С we всегда are. Марк ошибся — можно дать пять за попытку») — это контент фразы дня. Он приходит
  вместе с фразой, а не из таблицы UI. Хвост «{name} ошибается — можно дать пять за попытку» приму в переводы, если его
  вынесут в UI отдельной строкой.
- `friendsAnsweredCount` для ru, uk и pl склонять: ru «друг ответил / друга ответили / друзей ответили».
- ⚑ «Фраза дня» в коде расходится: uk «Вислів дня» и vi «Cụm từ hôm nay» в `DailyPhraseCard.tsx` и в настройках
  уведомлений, но uk «Фраза дня» и vi «Câu của ngày» в `home_scene_copy.ts`. Я взял вариант карточки фразы дня. Расхождение на Главной стоит выровнять.

## Идея 9 · Подарок энергии

| ключ | ru | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|---|
| supportTile | Поддержать | Підтримати | Support | Apoyar | Apoiar | Ủng hộ | Dukung | Destekle | Wesprzyj |
| giftTitle ⚑ | Поддержать энергией | Підтримати енергією | Send energy | Enviar energía | Enviar energia | Tặng năng lượng | Kirim energi | Enerji gönder | Wyślij energię |
| giftBody | Друг получит +1 энергию — ещё одно занятие без ожидания. Один подарок в день, только друзьям без Plus. | Друг отримає +1 енергію — ще одне заняття без очікування. Один подарунок на день, лише друзям без Plus. | Your friend gets +1 energy — one more lesson with no waiting. One gift a day, only for friends without Plus. | Tu amigo recibirá +1 de energía: una lección más sin esperar. Un regalo al día, solo para amigos sin Plus. | Seu amigo recebe +1 de energia — mais uma lição sem esperar. Um presente por dia, só para amigos sem Plus. | Bạn của bạn nhận +1 năng lượng — thêm một buổi học không phải chờ. Mỗi ngày một quà, chỉ cho bạn bè chưa có Plus. | Temanmu dapat +1 energi — satu sesi lagi tanpa menunggu. Satu hadiah per hari, hanya untuk teman tanpa Plus. | Arkadaşın +1 enerji alır — beklemeden bir ders daha. Günde bir hediye, yalnızca Plus’ı olmayan arkadaşlara. | Znajomy dostanie +1 energii — jeszcze jedne zajęcia bez czekania. Jeden prezent dziennie, tylko dla znajomych bez Plus. |
| factEnergy | энергия | енергія | energy | energía | energia | năng lượng | energi | enerji | energii |
| factOnePerDay | 1 в день | 1 на день | 1 a day | 1 al día | 1 por dia | 1 mỗi ngày | 1 per hari | Günde 1 | 1 dziennie |
| factFromYou | от тебя | від тебе | from you | de tu parte | de você | từ bạn | darimu | senden | od ciebie |
| factClaimBy | до 23:59 | до 23:59 | until 23:59 | hasta las 23:59 | até 23:59 | đến 23:59 | sampai 23.59 | 23.59’a kadar | do 23:59 |
| factClaim | забрать | забрати | to claim | para recoger | para pegar | để nhận | untuk diambil | almak için | odbierz |
| send | Отправить | Надіслати | Send | Enviar | Enviar | Gửi | Kirim | Gönder | Wyślij |
| giftSentToast ⚑ | Энергия отправлена · следующий подарок завтра | Енергію надіслано · наступний подарунок завтра | Energy sent · next gift tomorrow | Energía enviada · próximo regalo mañana | Energia enviada · próximo presente amanhã | Đã gửi năng lượng · quà tiếp theo vào ngày mai | Energi terkirim · hadiah berikutnya besok | Enerji gönderildi · sonraki hediye yarın | Energia wysłana · kolejny prezent jutro |
| rowGiftWaiting ⚑ | Энергия в подарок | Енергія в подарунок | Sent you energy | Te envió energía | Enviou energia para você | Đã tặng bạn năng lượng | Mengirimimu energi | Sana enerji gönderdi | Energia w prezencie |
| rowGiftClaimed ⚑ | Поддержка энергией | Підтримка енергією | Supported you with energy | Te apoyó con energía | Apoiou você com energia | Đã ủng hộ bạn năng lượng | Mendukungmu dengan energi | Seni enerjiyle destekledi | Wsparcie energią |
| claimedToast | {name}: +1 энергия | {name}: +1 енергія | +1 energy from {name} | +1 de energía de {name} | +1 de energia de {name} | +1 năng lượng từ {name} | +1 energi dari {name} | {name}: +1 enerji | {name}: +1 energii |
| thanks | Спасибо | Дякую | Thanks | Gracias | Valeu | Cảm ơn | Makasih | Teşekkürler | Dzięki |
| fullToast | Энергия полная — подарок подождёт до полуночи | Енергія повна — подарунок зачекає до півночі | Energy is full — the gift will wait until midnight | La energía está llena: el regalo espera hasta medianoche | A energia está cheia — o presente espera até a meia-noite | Năng lượng đã đầy — quà sẽ chờ đến nửa đêm | Energi penuh — hadiah menunggu sampai tengah malam | Enerji dolu — hediye gece yarısına kadar bekler | Energia pełna — prezent poczeka do północy |
| outGiftTitle ⚑ | Подарок от друга | Подарунок від друга | A gift from a friend | Un regalo de un amigo | Um presente de um amigo | Quà từ một người bạn | Hadiah dari teman | Arkadaştan hediye | Prezent od znajomego |
| outGiftSub | +1 энергия · хватит на занятие | +1 енергія · вистачить на заняття | +1 energy · enough for a lesson | +1 de energía · suficiente para una lección | +1 de energia · dá para uma lição | +1 năng lượng · đủ cho một buổi học | +1 energi · cukup untuk satu sesi | +1 enerji · bir derse yeter | +1 energii · wystarczy na zajęcia |
| claimAndContinue | Забрать и продолжить | Забрати й продовжити | Claim and continue | Recoger y continuar | Pegar e continuar | Nhận và tiếp tục | Ambil dan lanjutkan | Al ve devam et | Odbierz i kontynuuj |
| plusFriendTile ⚑ | У друга Plus | У друга Plus | Friend has Plus | Tu amigo tiene Plus | Seu amigo tem Plus | Bạn này có Plus | Teman punya Plus | Arkadaşında Plus var | Znajomy ma Plus |

Примечания к идее 9:
- ⚑ Имя в макете стоит в падеже: «Поддержать Лидию», «Энергия у Лидии», «от Алекса», «Подарок от Алекса», «У Марка Plus».
  Имя видно на монете над текстом, поэтому в тексте его убрал. В `claimedToast` имя стоит без падежа (`{name}:`), для en,
  es, pt, vi и id «from {name}» безопасно.
- Если владелец хочет имя в «Подарок от …»: в ru, uk и pl нужен родительный, а правила по окончанию («Мила → Милы»)
  на любом имени ломаются. Безопаснее «{name} дарит +1 энергию».
- В tr «Teşekkürler» и в pt-BR «Valeu» — разговорные варианты «Спасибо», в тон «Дать пять». Если нужен нейтральный: «Obrigado(a)» — с родом, поэтому не беру.
- Окно «Энергия закончилась» и «Plus — без ограничений» уже есть в коде (`EnergyStopSheet.tsx`, `NoEnergyModal.tsx`) — их не дублировать.
- 🔴 По макету идея 9 ждёт **D-решения владельца**: ECONOMY.md запрещает новые источники энергии. Тексты готовы, но до решения это не код.

## Уведомления (идеи 6 и 9; у идеи 8 пуша нет)

| ключ | ru | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|---|
| pushHighFiveTitle | {name} даёт пять | {name} дає п’ять | {name} gave you a high five | {name} te choca los cinco | {name} te deu um toque | {name} đập tay với bạn | {name} memberi tos | {name} sana çak yaptı | {name} przybija piątkę |
| pushHighFiveBody | Пятюня получена. | П’ятюню отримано. | High five received. | Choque recibido. | Toque recebido. | Đã nhận cú đập tay. | Tos diterima. | Çak alındı. | Piątka odebrana. |
| pushEnergyTitle | {name} поддерживает тебя | {name} підтримує тебе | {name} is cheering you on | {name} te apoya | {name} está apoiando você | {name} đang ủng hộ bạn | {name} mendukungmu | {name} seni destekliyor | {name} cię wspiera |
| pushEnergyBody | +1 энергия ждёт во вкладке «Друзья». | +1 енергія чекає у вкладці «Друзі». | +1 energy is waiting in the Friends tab. | +1 de energía te espera en la pestaña Amigos. | +1 de energia espera por você na aba Amigos. | +1 năng lượng đang chờ ở tab Bạn bè. | +1 energi menunggu di tab Teman. | +1 enerji Arkadaşlar sekmesinde seni bekliyor. | +1 energii czeka w zakładce „Znajomi”. |

Название вкладки сверено с кодом (`app/(tabs)/community.tsx`): uk «Друзі», en «Friends», es и pt «Amigos», vi «Bạn bè», id «Teman», tr «Arkadaşlar», pl «Znajomi».

## Что проверить 8 · МОМЕНТЫ

1. Все ⚑: расхождения с макетом ради правил «без падежа» и «без рода». «Сверке» передать как согласованное отклонение
   или вернуть в макет.
2. `youAreFirst`: оставить род или взять безличную форму.
3. Склонения: `factStreakDays`, `factLessons`, `lineFloorsUp`, `friendsAnsweredCount` (ru, uk, pl).
4. Даты и дни недели — через `Intl`, не таблицей.

## Идея 8 · добавка 22.10 (вопрос о значении, по просьбе 8 · МОМЕНТЫ)

В контенте фразы дня нет английских вариантов-ловушек, только квест «что значит идиома». Поэтому вопрос карточки — про
значение. Без рода. ⚑ Имя без падежа: варианты «Ответ от {name}» и «дать пять {name}» требуют родительного и дательного
падежа в ru, uk и pl («от Ирины», «Ирине») — для любого имени их не собрать. Поэтому `{name}:` стоит перед двоеточием,
а в `tryHighFive` имени нет (его и так видно на монете).

| ключ | ru | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|---|
| phraseQuestionMeaning | Что значит «{phrase}»? | Що означає «{phrase}»? | What does “{phrase}” mean? | ¿Qué significa «{phrase}»? | O que significa “{phrase}”? | “{phrase}” nghĩa là gì? | Apa arti “{phrase}”? | “{phrase}” ne anlama geliyor? | Co znaczy „{phrase}”? |
| friendsAnsweredOne | {name}: ответ откроется после твоего | {name}: відповідь відкриється після твоєї | {name}: see the answer after yours | {name}: verás su respuesta tras la tuya | {name}: a resposta aparece depois da sua | {name}: xem câu trả lời sau khi bạn trả lời | {name}: jawabannya terbuka setelah jawabanmu | {name}: cevabı seninkinden sonra açılır | {name}: odpowiedź zobaczysz po swojej |
| friendsAnsweredMany | Уже ответили: {n} · ответы откроются после твоего | Вже відповіли: {n} · відповіді відкриються після твоєї | Answered: {n} · see them after yours | Ya respondieron: {n} · las verás tras la tuya | Já responderam: {n} · aparecem depois da sua | Đã trả lời: {n} · xem sau khi bạn trả lời | Sudah menjawab: {n} · terbuka setelah jawabanmu | Cevaplayan: {n} · seninkinden sonra açılır | Już odpowiedzieli: {n} · zobaczysz po swojej |
| firstFriend | Пока никто из друзей не ответил — их ответы появятся здесь до полуночи | Поки ніхто з друзів не відповів — їхні відповіді з’являться тут до півночі | None of your friends has answered yet — their answers will show here until midnight | Aún no ha respondido ningún amigo: sus respuestas aparecerán aquí hasta medianoche | Nenhum amigo respondeu ainda — as respostas aparecem aqui até a meia-noite | Chưa có bạn nào trả lời — câu trả lời sẽ hiện ở đây đến nửa đêm | Belum ada teman yang menjawab — jawaban mereka muncul di sini sampai tengah malam | Henüz hiçbir arkadaşın cevap vermedi — cevapları gece yarısına kadar burada görünür | Nikt ze znajomych jeszcze nie odpowiedział — ich odpowiedzi pojawią się tu do północy |
| tryHighFive | Можно дать пять за попытку | Можна дати п’ять за спробу | You can give a high five for trying | Puedes chocar los cinco por el intento | Dá para mandar um toque pela tentativa | Có thể đập tay khích lệ cho lần thử | Kamu bisa memberi tos untuk usahanya | Denemesi için çak yapabilirsin | Możesz przybić piątkę za próbę |

Примечания:
- `friendsAnsweredMany` — с двоеточием перед числом, чтобы не склонять «друг / друга / друзей» и глагол
  («ответил / ответили»). Число справа от двоеточия читается одинаково при любом `{n}`; формы 1 / 2–4 / 5+ не нужны.
  Для одного друга — `friendsAnsweredOne`.
- `phraseQuestionMeaning` — так же, как подпись «Что значит» в `DailyPhraseCard.tsx`. Кавычки — по правилам языка:
  «» в ru, uk, es; “” в en, pt-BR, vi, id, tr; „” в pl.
- Заменяют прежние `phraseQuestion` (перевод фразы), `friendsAnsweredLocked`, `friendsAnsweredCount` и `youAreFirst`.
  Прежние строки оставлены выше для истории.
