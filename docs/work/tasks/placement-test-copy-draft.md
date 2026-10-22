# Входной тест «Не хочу с начала» — черновик текстов на 9 языках (Переводчик → Learning V2)

Status: Draft — на опережение для Learning V2; ru — дословно из макета, кроме отмеченных ⚑
Owner: «10 · ПЕРЕВОДЧИК» (поручение координатора 22.10)

Источник: `docs/design/v2-app/chapter-exam-flow.html`, блок «6 · Входной тест (№10)», 5 кадров (`mapEntry`, `tStart`, `tQ`,
`tExtra`, `tDone`). Порядок колонок как в `components/learning-v2/season/season_copy.ts`: ru, uk, en, es, pt-BR, vi, id, tr, pl.

**Правило владельца:** тест бесплатный, пропущенные уроки только **открываются** и не засчитываются как пройденные.
Поэтому нигде нет «пройдено», «засчитано за урок» или звёзд. Статус строки — «открыт», итог — «Открыто до урока N».
Слово «засчитаем» в правиле 2 относится к теме внутри теста, не к уроку.

Обращение на «ты»: uk «ти», es «tú», pt-BR «você», vi «bạn», id «kamu», tr «sen», pl «ty». Термины:
- «Урок» = `SEASON_COPY.lesson`;
- «Не хочу с начала» = `SEASON_COPY.notFromStart`, уже в коде, не дублировать;
- «тест»: uk тест, en test, es prueba, pt-BR teste, vi bài kiểm tra, id tes, tr test, pl test.

## Кадр 1 · Карта, вход

| ключ | ru | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|---|
| entryTitle | Не хочу с начала | Не хочу з початку | Start somewhere else | No quiero desde el principio | Não quero do início | Không muốn học từ đầu | Tidak mau dari awal | Baştan başlamak istemiyorum | Nie chcę od początku |
| entrySub | Короткий тест — откроем всё, что ты уже знаешь | Короткий тест — відкриємо все, що ти вже знаєш | A short test unlocks everything you already know | Una prueba corta abre todo lo que ya sabes | Um teste curto libera tudo o que você já sabe | Bài kiểm tra ngắn — mở mọi thứ bạn đã biết | Tes singkat — kami buka semua yang sudah kamu tahu | Kısa bir test — bildiğin her şeyi açarız | Krótki test — odblokujemy wszystko, co już znasz |

`entryTitle` повторяет готовую `notFromStart`, тексты те же.

## Кадр 2 · Старт теста

| ключ | ru | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|---|
| startTitle | Проверим, что ты уже знаешь | Перевіримо, що ти вже знаєш | Let’s see what you already know | Veamos lo que ya sabes | Vamos ver o que você já sabe | Cùng xem bạn đã biết gì | Yuk, cek apa yang sudah kamu tahu | Neler bildiğine bakalım | Sprawdźmy, co już znasz |
| startBody | Откроем все уроки до темы, которая пока даётся труднее, — начнёшь с неё. | Відкриємо всі уроки до теми, яка поки дається важче, — почнеш із неї. | We’ll unlock every lesson up to the topic that’s still tricky for you — you’ll start there. | Abriremos todas las lecciones hasta el tema que aún te cuesta: empezarás por ahí. | Vamos liberar todas as lições até o tema que ainda é mais difícil — você começa por ele. | Mình sẽ mở mọi bài học đến chủ đề bạn còn thấy khó — bạn bắt đầu từ đó. | Kami buka semua pelajaran sampai topik yang masih terasa sulit — kamu mulai dari situ. | Henüz zorlandığın konuya kadar tüm dersleri açarız — oradan başlarsın. | Odblokujemy wszystkie lekcje aż do tematu, który jeszcze sprawia trudność — od niego zaczniesz. |
| rule1 | Один вопрос на тему каждого урока, по порядку. | Одне запитання на тему кожного уроку, по черзі. | One question on each lesson’s topic, in order. | Una pregunta sobre el tema de cada lección, en orden. | Uma pergunta sobre o tema de cada lição, em ordem. | Mỗi bài học một câu hỏi theo chủ đề, lần lượt. | Satu pertanyaan untuk topik tiap pelajaran, berurutan. | Her dersin konusundan bir soru, sırayla. | Jedno pytanie z tematu każdej lekcji, po kolei. |
| rule2 ⚑ | Ошибка — ещё два вопроса по этой теме. Засчитаем при двух верных из трёх. | Помилка — ще два запитання з цієї теми. Зарахуємо, якщо два з трьох правильні. | A mistake means two more questions on that topic. Two right out of three counts. | Si fallas, dos preguntas más sobre ese tema. Cuenta con dos aciertos de tres. | Errou? Mais duas perguntas sobre o tema. Vale com duas certas de três. | Sai thì thêm hai câu cùng chủ đề. Đúng hai trên ba là đạt. | Salah — dua pertanyaan lagi di topik itu. Lulus jika dua dari tiga benar. | Hata yaparsan bu konudan iki soru daha. Üçte iki doğru yeterli. | Błąd — jeszcze dwa pytania z tego tematu. Zaliczamy przy dwóch dobrych z trzech. |
| rule3 | Тест бесплатный, около 5 минут. | Тест безкоштовний, близько 5 хвилин. | The test is free and takes about 5 minutes. | La prueba es gratis y dura unos 5 minutos. | O teste é grátis e leva cerca de 5 minutos. | Bài kiểm tra miễn phí, khoảng 5 phút. | Tesnya gratis, sekitar 5 menit. | Test ücretsiz, yaklaşık 5 dakika. | Test jest bezpłatny, trwa około 5 minut. |
| startCta | Начать тест | Почати тест | Start the test | Empezar la prueba | Começar o teste | Bắt đầu kiểm tra | Mulai tes | Teste başla | Zacznij test |
| fromStartCta | Начну с начала | Почну з початку | I’ll start from the beginning | Empezaré desde el principio | Vou começar do início | Mình sẽ học từ đầu | Aku mulai dari awal | Baştan başlayacağım | Zacznę od początku |

- ⚑ `rule2`: в макете «Ошибся — …». Это мужской род, а род человека приложение знает не всегда. Заменил на «Ошибка — …»
  (uk «Помилка — …», pl «Błąd — …»). В остальных языках рода нет.
- `fromStartCta` от первого лица, как в макете. На кнопке шириной во весь экран (16 px) самые длинные — en и es, около 27 знаков.
  Если на склейке тесно, запасные варианты: en «Start from the beginning», es «Empezar desde el principio».

## Кадры 3–4 · Вопрос по теме урока

| ключ | ru | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|---|
| progress | Тест · урок {n} из {m} | Тест · урок {n} з {m} | Test · lesson {n} of {m} | Prueba · lección {n} de {m} | Teste · lição {n} de {m} | Kiểm tra · bài {n}/{m} | Tes · pelajaran {n} dari {m} | Test · ders {n}/{m} | Test · lekcja {n} z {m} |
| topicKicker | Урок {n} | Урок {n} | Lesson {n} | Lección {n} | Lição {n} | Bài {n} | Pelajaran {n} | Ders {n} | Lekcja {n} |
| extraQuestions | Ещё 2 вопроса по этой теме | Ще 2 запитання з цієї теми | 2 more questions on this topic | 2 preguntas más sobre este tema | Mais 2 perguntas sobre este tema | Thêm 2 câu về chủ đề này | 2 pertanyaan lagi di topik ini | Bu konudan 2 soru daha | Jeszcze 2 pytania z tego tematu |

- `topicKicker` = готовая `SEASON_COPY.lesson`, не дублировать.
- Сами вопросы («Вставь слово», ситуация, варианты) — контент заданий курса, не эта таблица.
- `progress` для vi и tr в виде «{n}/{m}» — так же, как `chapterOf` в `season_copy.ts`.

## Кадр 5 · Итог

| ключ | ru | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|---|
| resultTitle | Открыто до урока {n} | Відкрито до уроку {n} | Unlocked up to lesson {n} | Abierto hasta la lección {n} | Liberado até a lição {n} | Đã mở đến bài {n} | Terbuka sampai pelajaran {n} | {n}. derse kadar açıldı | Odblokowano do lekcji {n} |
| resultBody | Темы уроков 1–{k} ты знаешь. Урок {n} «{title}» начнём вместе — он пока даётся труднее. | Теми уроків 1–{k} ти знаєш. Урок {n} «{title}» почнемо разом — він поки дається важче. | You know the topics of lessons 1–{k}. We’ll start lesson {n}, “{title}”, together — it’s still tricky for you. | Ya conoces los temas de las lecciones 1–{k}. La lección {n}, «{title}», la empezamos juntos: aún te cuesta. | Você já conhece os temas das lições 1–{k}. A lição {n}, “{title}”, vamos começar juntos — ela ainda é mais difícil. | Bạn đã biết chủ đề các bài 1–{k}. Bài {n} “{title}” mình sẽ học cùng nhau — bài này bạn còn thấy khó. | Kamu sudah tahu topik pelajaran 1–{k}. Pelajaran {n} “{title}” kita mulai bersama — yang ini masih terasa sulit. | 1–{k}. derslerin konularını biliyorsun. {n}. ders “{title}” ile birlikte başlayacağız — o henüz zor geliyor. | Tematy lekcji 1–{k} już znasz. Lekcję {n} „{title}” zaczniemy razem — ta jeszcze sprawia trudność. |
| rowOpened | открыт | відкрито | unlocked | abierta | liberada | đã mở | terbuka | açık | odblokowana |
| rowStartHere | начнём здесь | почнемо тут | start here | empezamos aquí | começamos aqui | bắt đầu ở đây | mulai di sini | buradan başlıyoruz | zaczynamy tutaj |
| resultCta | Начать урок {n} | Почати урок {n} | Start lesson {n} | Empezar la lección {n} | Começar a lição {n} | Bắt đầu bài {n} | Mulai pelajaran {n} | {n}. derse başla | Zacznij lekcję {n} |

- `rowOpened` — именно «открыт», не «пройден»: по правилу владельца урок не засчитывается. Род слова «урок»:
  es «lección» и pt «lição» — женский род, отсюда «abierta» и «liberada»; pl «lekcja» — «odblokowana»; в uk безлично «відкрито».
- pt-BR «liberada» — общий термин открытия (как `unlock = liberada`).
- В `resultBody` при `k = 1` читается «уроков 1–1». Для этого случая нужна отдельная строка:
  ru «Тему урока 1 ты знаешь. …», uk «Тему уроку 1 ти знаєш. …», en «You know the topic of lesson 1. …» и т. д. Добавлю, если Learning V2 подтвердит.

## Нет в макете — нужны решения (не придумываю, только отмечаю)

1. **Ошибка уже на теме урока 1**: ничего не открыто. Какой итог и какая кнопка?
2. **Все 32 темы засчитаны**: «Открыто до урока 32» или отдельный итог «Открыто всё»?
3. **Выход крестиком посреди теста**: сохраняется ли открытое до этого места и есть ли окно подтверждения?
4. **Нет сети** на старте или посреди теста.

Тексты для этих состояний напишу, когда появятся кадры или слово владельца.
