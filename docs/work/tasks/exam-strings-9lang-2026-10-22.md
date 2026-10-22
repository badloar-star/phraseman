# Экзамен главы — тексты экранов на 9 языках (Переводчик → Learning V2, заготовка)

Governance-ID: TG-0E7F77E5D514
Status: Ready — передать Learning V2; ru дословно из макетов `chapter-exam-flow.html` и `chapter-exam-season.html`
Owner: «10 · ПЕРЕВОДЧИК» (поручение координатора 22.10)

## Outcome

Словарь «Сезона» (`components/learning-v2/season/season_copy.ts`), чтобы экзамен говорил теми же словами:

| | ru | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|---|
| глава | глава | розділ | chapter | capítulo | capítulo | chương | bab | ünite | rozdział |
| эпизод | эпизод | епізод | episode | episodio | episódio | tập | episode | bölüm | odcinek |
| экзамен главы | Экзамен главы | Іспит розділу | Chapter exam | Examen del capítulo | Exame do capítulo | Bài thi chương | Ujian bab | Ünite sınavı | Egzamin rozdziału |

⚠ tr: «Bölüm» — это ЭПИЗОД, глава — «Ünite». Не путать в «откроется глава N».

### Окно перед экзаменом

| Ключ | ru (макет) | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|---|
| title | Экзамен главы {n} | Іспит розділу {n} | Chapter {n} exam | Examen del capítulo {n} | Exame do capítulo {n} | Bài thi chương {n} | Ujian bab {n} | {n}. ünite sınavı | Egzamin rozdziału {n} |
| statQuestions | вопросов | питань | questions | preguntas | perguntas | câu hỏi | soal | soru | pytań |
| statToPass | чтобы сдать | щоб скласти | to pass | para aprobar | para passar | để đạt | untuk lulus | geçmek için | by zdać |
| statMinutes | минут | хвилин | minutes | minutos | minutos | phút | menit | dakika | minut |
| summary (поручение) | 12 вопросов · сдать от 10 | 12 питань · скласти від 10 | 12 questions · pass with 10 | 12 preguntas · aprueba con 10 | 12 perguntas · passe com 10 | 12 câu hỏi · đạt từ 10 | 12 soal · lulus dengan 10 | 12 soru · 10 ile geçersin | 12 pytań · zdasz od 10 |
| scope | По эпизодам {a}–{b}. Сдашь — сразу откроется глава {n}. | За епізодами {a}–{b}. Складеш — одразу відкриється розділ {n}. | Episodes {a}–{b}. Pass it and chapter {n} opens right away. | Episodios {a}–{b}. Si apruebas, se abre el capítulo {n} al instante. | Episódios {a}–{b}. Passou, o capítulo {n} abre na hora. | Tập {a}–{b}. Đạt là mở ngay chương {n}. | Episode {a}–{b}. Lulus, bab {n} langsung terbuka. | {a}–{b}. bölümler. Geçersen {n}. ünite hemen açılır. | Odcinki {a}–{b}. Zdasz — od razu otworzy się rozdział {n}. |
| unlockShort | Сдашь — откроется глава {n} | Складеш — відкриється розділ {n} | Pass to open chapter {n} | Aprueba y se abre el capítulo {n} | Passe e abra o capítulo {n} | Đạt để mở chương {n} | Lulus untuk membuka bab {n} | Geç, {n}. ünite açılsın | Zdaj, a otworzy się rozdział {n} |
| start | Начать экзамен | Почати іспит | Start the exam | Empezar el examen | Começar o exame | Bắt đầu bài thi | Mulai ujian | Sınava başla | Zacznij egzamin |
| take (карта «Сезона») | Сдать экзамен | Скласти іспит | Take the exam | Hacer el examen | Fazer o exame | Làm bài thi | Ikuti ujian | Sınava gir | Podejdź do egzaminu |
| early | можно сдать заранее | можна скласти заздалегідь | you can take it early | puedes hacerlo antes | dá para fazer antes | có thể thi trước | bisa diikuti lebih awal | önceden girebilirsin | można zdać wcześniej |
| later | Позже | Пізніше | Later | Más tarde | Mais tarde | Để sau | Nanti | Sonra | Później |
| costEnergy | 1 энергия | 1 енергія | 1 energy | 1 de energía | 1 de energia | 1 năng lượng | 1 energi | 1 enerji | 1 energia |
| freeWithPlus | С Plus экзамен бесплатный | З Plus іспит безкоштовний | Free with Plus | Gratis con Plus | Grátis com o Plus | Miễn phí với Plus | Gratis dengan Plus | Plus ile ücretsiz | Z Plus za darmo |

Кнопки «Сдать экзамен» / «Позже» совпадают с уже утверждёнными в приложении («Сдать экзамен» — `home_scene_copy.ts`
после 881740df6, «Позже» — `duel_copy.ts`).

### Во время экзамена

| Ключ | ru (макет) | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|---|
| progress | Экзамен · {i} / 12 | Іспит · {i} / 12 | Exam · {i} / 12 | Examen · {i} / 12 | Exame · {i} / 12 | Bài thi · {i} / 12 | Ujian · {i} / 12 | Sınav · {i} / 12 | Egzamin · {i} / 12 |
| correct | Верно. | Правильно. | Correct. | Correcto. | Certo. | Đúng. | Benar. | Doğru. | Dobrze. |
| next | Дальше | Далі | Next | Siguiente | Próximo | Tiếp | Lanjut | Devam | Dalej |

### Итог

| Ключ | ru (макет) | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|---|
| passed | Экзамен сдан · {x} из 12 | Іспит складено · {x} з 12 | Exam passed · {x} of 12 | Examen aprobado · {x} de 12 | Exame aprovado · {x} de 12 | Đã đạt · {x}/12 | Lulus ujian · {x} dari 12 | Sınavı geçtin · 12'de {x} | Egzamin zdany · {x} z 12 |
| failed | Не сдан | Не складено | Not passed | No aprobado | Não aprovado | Chưa đạt | Belum lulus | Geçemedin | Niezdany |
| failedBody | Чтобы сдать, нужно 10. Разберём три ошибки — и через час можно пересдать. | Щоб скласти, треба 10. Розберемо три помилки — і за годину можна перескласти. | You need 10 to pass. Let’s go over three mistakes — you can retake it in an hour. | Necesitas 10 para aprobar. Repasemos tres errores y en una hora puedes repetirlo. | Você precisa de 10 para passar. Vamos revisar três erros — em uma hora dá para refazer. | Cần 10 câu để đạt. Cùng xem lại ba lỗi — một giờ nữa có thể thi lại. | Perlu 10 untuk lulus. Kita bahas tiga kesalahan — sejam lagi bisa ulang. | Geçmek için 10 gerekiyor. Üç hatayı inceleyelim — bir saat sonra yeniden girebilirsin. | Żeby zdać, potrzeba 10. Omówimy trzy błędy — za godzinę możesz podejść ponownie. |
| openedAlso | Эпизоды {a}–{b} главы {n} тоже открыты — можно пройти, когда захочешь | Епізоди {a}–{b} розділу {n} теж відкриті — можна пройти, коли захочеш | Episodes {a}–{b} of chapter {n} are open too — play them whenever you like | Los episodios {a}–{b} del capítulo {n} también están abiertos: hazlos cuando quieras | Os episódios {a}–{b} do capítulo {n} também estão abertos — faça quando quiser | Tập {a}–{b} của chương {n} cũng đã mở — học khi nào bạn muốn | Episode {a}–{b} bab {n} juga terbuka — kerjakan kapan saja | {n}. ünitenin {a}–{b}. bölümleri de açık — istediğin zaman geçebilirsin | Odcinki {a}–{b} rozdziału {n} też są otwarte — przejdź je, kiedy chcesz |
| toChapter | К главе {n} | До розділу {n} | To chapter {n} | Al capítulo {n} | Para o capítulo {n} | Đến chương {n} | Ke bab {n} | {n}. üniteye geç | Do rozdziału {n} |
| review | Разбор ошибок | Розбір помилок | Review mistakes | Repasar errores | Revisar erros | Xem lại lỗi | Tinjau kesalahan | Hataları incele | Przejrzyj błędy |
| reviewOne | Разбор ошибки · {k} | Розбір помилки · {k} | Review mistake · {k} | Repasar error · {k} | Revisar erro · {k} | Xem lại lỗi · {k} | Tinjau kesalahan · {k} | Hatayı incele · {k} | Przejrzyj błąd · {k} |
| retryHour | Пересдать можно через час | Перескласти можна за годину | You can retake it in an hour | Puedes repetirlo en una hora | Dá para refazer em uma hora | Có thể thi lại sau một giờ | Bisa diulang sejam lagi | Bir saat sonra yeniden girebilirsin | Ponownie za godzinę |
| retryHour (поручение) | Новая попытка через час | Нова спроба за годину | New try in an hour | Nuevo intento en una hora | Nova tentativa em uma hora | Thử lại sau một giờ | Coba lagi sejam lagi | Bir saat sonra yeni deneme | Nowa próba za godzinę |

«Разбор ошибок» / «Разбор ошибки» совпадают с утверждёнными в дуэли (`duelReviewLabel`).
В макете стоит «Пересдать можно через час», в поручении — «Новая попытка через час»: эталоном будет макет.

### Разбор ошибок

| Ключ | ru (макет) | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|---|
| reviewHeader | Экзамен главы {n} · {k} {ошибка/ошибки/ошибок} | Іспит розділу {n} · {k} {помилка/помилки/помилок} | Chapter {n} exam · {k} {mistake/mistakes} | Examen del capítulo {n} · {k} {error/errores} | Exame do capítulo {n} · {k} {erro/erros} | Bài thi chương {n} · {k} lỗi | Ujian bab {n} · {k} kesalahan | {n}. ünite sınavı · {k} hata | Egzamin rozdziału {n} · {k} {błąd/błędy/błędów} |
| questionLabel | Вопрос {i} · {задание} | Питання {i} · {завдання} | Question {i} · {task} | Pregunta {i} · {tarea} | Pergunta {i} · {tarefa} | Câu {i} · {bài tập} | Soal {i} · {tugas} | Soru {i} · {görev} | Pytanie {i} · {zadanie} |

Названия заданий («Собери фразу», «Послушай и выбери», «Вставь слово») — из `task_prompt_parts_v1.ts`, отдельно не
переводятся.

## Длина

Кнопки и подписи до ~16 знаков. Длинные места: pl «Podejdź do egzaminu» (19) — как уже утверждено на Главной;
es «Examen del capítulo {n}» (22) в заголовке окна — заголовок крупный, переносится в 2 строки на 360, при
необходимости короче «Examen · capítulo {n}». Остальное в пределах.

## Scope

In scope: тексты экранов экзамена на 9 языках. Out of scope: код (делает Learning V2), входной тест «Не хочу с начала»
(можно отдельным заходом, если нужен).

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Не проверено носителями.
- Сверить дословно с экраном после реализации (закон «текст = макет»).

## Verification

Слова сверены со словарём `season_copy.ts`, `home_scene_copy.ts` (881740df6), `duel_copy.ts`.

## Rollback

Удалить файл.
