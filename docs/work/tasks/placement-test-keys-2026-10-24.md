# Тест «Не хочу с начала» — ключи на 9 языках для 2 · ДИЗАЙН (Переводчик, координатор 24.10)

Status: Готово к вставке
Owner: «10 · ПЕРЕВОДЧИК»

Источник ru — `docs/design/v2-app/chapter-exam-season.html`, раздел «6 · Тест-распределение» (811988480). Это уточнение черновика
`placement-test-copy-draft.md` (bac49ace2): пунктуация ru — как в новом макете. Порядок кортежа — как в
`components/learning-v2/season/season_copy.ts`: ru, uk, en, es, pt-BR, vi, id, tr, pl. Без рода, на «ты».
Правило владельца: тест бесплатный, уроки только **открываются**.

Готовые строки, `{n}` — номер урока, `{m}` — всего уроков, `{k}` — последний знакомый урок, `{title}` — тема урока:

```ts
  placementStartTitle: ['Проверим, что ты уже знаешь', 'Перевіримо, що ти вже знаєш', 'Let’s see what you already know', 'Veamos lo que ya sabes', 'Vamos ver o que você já sabe', 'Cùng xem bạn đã biết gì', 'Yuk, cek apa yang sudah kamu tahu', 'Neler bildiğine bakalım', 'Sprawdźmy, co już znasz'],
  placementStartBody: ['Откроем все уроки до темы, которая пока даётся труднее, и начнёшь с неё.', 'Відкриємо всі уроки до теми, яка поки дається важче, і почнеш із неї.', 'We’ll unlock every lesson up to the topic that’s still tricky for you, and you’ll start there.', 'Abriremos todas las lecciones hasta el tema que aún te cuesta, y empezarás por ahí.', 'Vamos liberar todas as lições até o tema que ainda é mais difícil, e você começa por ele.', 'Mình sẽ mở mọi bài học đến chủ đề bạn còn thấy khó, và bạn bắt đầu từ đó.', 'Kami buka semua pelajaran sampai topik yang masih terasa sulit, lalu kamu mulai dari situ.', 'Henüz zorlandığın konuya kadar tüm dersleri açarız ve oradan başlarsın.', 'Odblokujemy wszystkie lekcje aż do tematu, który jeszcze sprawia trudność, i od niego zaczniesz.'],
  placementRule1: ['Один вопрос на тему каждого урока, по порядку.', 'Одне запитання на тему кожного уроку, по черзі.', 'One question on each lesson’s topic, in order.', 'Una pregunta sobre el tema de cada lección, en orden.', 'Uma pergunta sobre o tema de cada lição, em ordem.', 'Mỗi bài học một câu hỏi theo chủ đề, lần lượt.', 'Satu pertanyaan untuk topik tiap pelajaran, berurutan.', 'Her dersin konusundan bir soru, sırayla.', 'Jedno pytanie z tematu każdej lekcji, po kolei.'],
  placementRule2: ['Ошибёшься — будет ещё два вопроса по этой теме. Засчитаем при двух верных из трёх.', 'Помилишся — буде ще два запитання з цієї теми. Зарахуємо, якщо два з трьох правильні.', 'Make a mistake and you get two more questions on that topic. Two right out of three counts.', 'Si fallas, tendrás dos preguntas más sobre ese tema. Cuenta con dos aciertos de tres.', 'Se errar, vêm mais duas perguntas sobre o tema. Vale com duas certas de três.', 'Sai thì thêm hai câu cùng chủ đề. Đúng hai trên ba là đạt.', 'Kalau salah, ada dua pertanyaan lagi di topik itu. Lulus jika dua dari tiga benar.', 'Hata yaparsan bu konudan iki soru daha gelir. Üçte iki doğru yeterli.', 'Pomylisz się — będą jeszcze dwa pytania z tego tematu. Zaliczamy przy dwóch dobrych z trzech.'],
  placementRule3: ['Тест бесплатный, около 5 минут.', 'Тест безкоштовний, близько 5 хвилин.', 'The test is free and takes about 5 minutes.', 'La prueba es gratis y dura unos 5 minutos.', 'O teste é grátis e leva cerca de 5 minutos.', 'Bài kiểm tra miễn phí, khoảng 5 phút.', 'Tesnya gratis, sekitar 5 menit.', 'Test ücretsiz, yaklaşık 5 dakika.', 'Test jest bezpłatny, trwa około 5 minut.'],
  placementStartCta: ['Начать тест', 'Почати тест', 'Start the test', 'Empezar la prueba', 'Começar o teste', 'Bắt đầu kiểm tra', 'Mulai tes', 'Teste başla', 'Zacznij test'],
  placementFromStart: ['Начну с начала', 'Почну з початку', 'I’ll start from the beginning', 'Empezaré desde el principio', 'Vou começar do início', 'Mình sẽ học từ đầu', 'Aku mulai dari awal', 'Baştan başlayacağım', 'Zacznę od początku'],
  placementProgress: ['Тест · урок {n} из {m}', 'Тест · урок {n} з {m}', 'Test · lesson {n} of {m}', 'Prueba · lección {n} de {m}', 'Teste · lição {n} de {m}', 'Kiểm tra · bài {n}/{m}', 'Tes · pelajaran {n} dari {m}', 'Test · ders {n}/{m}', 'Test · lekcja {n} z {m}'],
  placementExtra: ['Ещё 2 вопроса по этой теме', 'Ще 2 запитання з цієї теми', '2 more questions on this topic', '2 preguntas más sobre este tema', 'Mais 2 perguntas sobre este tema', 'Thêm 2 câu về chủ đề này', '2 pertanyaan lagi di topik ini', 'Bu konudan 2 soru daha', 'Jeszcze 2 pytania z tego tematu'],
  placementResultTitle: ['Открыто до урока {n}', 'Відкрито до уроку {n}', 'Unlocked up to lesson {n}', 'Abierto hasta la lección {n}', 'Liberado até a lição {n}', 'Đã mở đến bài {n}', 'Terbuka sampai pelajaran {n}', '{n}. derse kadar açıldı', 'Odblokowano do lekcji {n}'],
  placementResultBody: ['Темы уроков 1–{k} ты знаешь. Урок {n} «{title}» начнём вместе, он пока даётся труднее.', 'Теми уроків 1–{k} ти знаєш. Урок {n} «{title}» почнемо разом, він поки дається важче.', 'You know the topics of lessons 1–{k}. We’ll start lesson {n}, “{title}”, together, as it’s still tricky for you.', 'Ya conoces los temas de las lecciones 1–{k}. La lección {n}, «{title}», la empezamos juntos, porque aún te cuesta.', 'Você já conhece os temas das lições 1–{k}. A lição {n}, “{title}”, vamos começar juntos, porque ainda é mais difícil.', 'Bạn đã biết chủ đề các bài 1–{k}. Bài {n} “{title}” mình sẽ học cùng nhau, vì bài này bạn còn thấy khó.', 'Kamu sudah tahu topik pelajaran 1–{k}. Pelajaran {n} “{title}” kita mulai bersama, karena masih terasa sulit.', '1–{k}. derslerin konularını biliyorsun. {n}. ders “{title}” ile birlikte başlayacağız, çünkü henüz zor geliyor.', 'Tematy lekcji 1–{k} już znasz. Lekcję {n} „{title}” zaczniemy razem, bo jeszcze sprawia trudność.'],
  placementResultBodyOne: ['Тему урока 1 ты знаешь. Урок {n} «{title}» начнём вместе, он пока даётся труднее.', 'Тему уроку 1 ти знаєш. Урок {n} «{title}» почнемо разом, він поки дається важче.', 'You know the topic of lesson 1. We’ll start lesson {n}, “{title}”, together, as it’s still tricky for you.', 'Ya conoces el tema de la lección 1. La lección {n}, «{title}», la empezamos juntos, porque aún te cuesta.', 'Você já conhece o tema da lição 1. A lição {n}, “{title}”, vamos começar juntos, porque ainda é mais difícil.', 'Bạn đã biết chủ đề bài 1. Bài {n} “{title}” mình sẽ học cùng nhau, vì bài này bạn còn thấy khó.', 'Kamu sudah tahu topik pelajaran 1. Pelajaran {n} “{title}” kita mulai bersama, karena masih terasa sulit.', '1. dersin konusunu biliyorsun. {n}. ders “{title}” ile birlikte başlayacağız, çünkü henüz zor geliyor.', 'Temat lekcji 1 już znasz. Lekcję {n} „{title}” zaczniemy razem, bo jeszcze sprawia trudność.'],
  placementRowOpened: ['открыт', 'відкрито', 'unlocked', 'abierta', 'liberada', 'đã mở', 'terbuka', 'açık', 'odblokowana'],
  placementRowStartHere: ['начнём здесь', 'почнемо тут', 'start here', 'empezamos aquí', 'começamos aqui', 'bắt đầu ở đây', 'mulai di sini', 'buradan başlıyoruz', 'zaczynamy tutaj'],
  placementResultCta: ['Начать урок {n}', 'Почати урок {n}', 'Start lesson {n}', 'Empezar la lección {n}', 'Começar a lição {n}', 'Bắt đầu bài {n}', 'Mulai pelajaran {n}', '{n}. derse başla', 'Zacznij lekcję {n}'],
```

Уже есть в коде, не дублировать: `SEASON_COPY.notFromStart` («Не хочу с начала»), `SEASON_COPY.lesson` («Урок {n}» на карточке темы).

⚑ Отличия от макета:
- `placementRule2`: в макете «Ошибся, и будет…» — с родом. Заменено на будущее время «Ошибёшься — будет…»: смысл тот же, рода нет.
- `placementResultBodyOne` — при `k = 1`, чтобы не было «уроков 1–1». В макете этого кадра нет.

Замер на 360 dp (Inter): «Начать тест» и «Начну с начала» — кнопки во всю ширину, самое длинное en «I’ll start from the beginning»
≈ 230 из ~320 dp. Тексты правил и итога переносятся. Шапка «Тест · урок 32 из 32» ≤ 180 dp.

Состояний, которых нет в макете (ошибка на уроке 1, все темы засчитаны, выход посреди, нет сети), не пишу — нужны кадры.
