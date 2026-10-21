# Теория урока 1 — вычитка vi, id, tr (Переводчик → 12 · ТЕОРИЯ)

Governance-ID: TG-28A4FF0AE9DC
Status: Ready for 12 · ТЕОРИЯ
Owner: «10 · ПЕРЕВОДЧИК» (вычитка); правка файлов — 12 · ТЕОРИЯ
Источник: коммит 6b1794e3e, `docs/work/theory_drafts/lesson_01_{vi,id,tr}.md`

## Общий вывод

Все три текста написаны под носителя, а не переведены с русского, и ловушки выбраны верно
(vi — «Tôi mệt» без связки; id — «dia» для обоих полов; tr — связка-окончание «-ım» и «değil» в конце).
Структура и упражнения совпадают с ru. Ошибок носителя мало: tr — 4, id — 4, vi — 0 (только уточнения).

---

## A. Ошибки носителя (обязательно исправить)

### tr
1. §06 body: «İngilizcede **seçmen** gerekir» — «seçmen» = «избиратель». → **«İngilizcede seçim yapman gerekir»**.
2. §10 «I'm shy. — **Utanıyorum.**» — это «мне стыдно (сейчас)». «Shy» как черта — **«Utangacım.»**
3. §05 «You are early. — **Erkencisin.**» — так говорят о «жаворонке» (рано встаёт). → **«Erken geldin.»**
4. §13 tip: «Bu hataların çoğu **iki türlü**» — разговорно-неточно. → **«Bu hataların çoğu iki türdendir:»**

### id
1. §10 и §14 «It's locked. — **Dikunci.**» — «Dikunci» = «кто-то запирает». Состояние — **«Terkunci.»**
2. §13 tip: «Hampir semua kesalahan ini **ada dua jenis**» — неграмотно. → **«Hampir semua kesalahan ini termasuk salah satu dari dua jenis:»**
3. §07 body: «Bahasa Inggris **wajib punya awal**» — так не говорят. → **«Bahasa Inggris harus diawali dengan It is:»**
4. §02 body: «**dulu** siapa atau apa» — «dulu» здесь звучит как «раньше, в прошлом». → **«pertama siapa atau apa»**

### vi
Ошибок носителя нет.

---

## B. Стоит улучшить (по желанию автора)

### Все три языка
- **§03 «người Anh / orang Inggris» (= англичане).** Речь о любом носителе. → vi «người nói tiếng Anh», id «penutur bahasa Inggris».
  В tr такой фразы нет.
- **§08 we = мы обоих видов.** Во vi (chúng tôi / chúng ta) и id (kami / kita) есть два «мы», и в примерах они
  уже стоят вперемешку («Chúng tôi đi cùng nhau» / «Chúng ta muộn rồi»; «Kami bersama» / «Kita terlambat»). Ученик
  может решить, что это ошибка. Одна строка в tip снимает вопрос:
  - vi: «We dùng cho cả chúng tôi lẫn chúng ta — tiếng Anh không phân biệt.»
  - id: «We dipakai untuk kami maupun kita — bahasa Inggris tidak membedakannya.»

### id
- **Метафора «penjepit» (прищепка) для am/is/are** (§01 tip, §09 подпись ячейки, §13 tip). Носитель споткнётся:
  во vi — «từ nối», в tr — «bağlayıcı» («связка»). → **«penghubung»** во всех трёх местах
  («Tiga kata ini seperti penghubung…», подпись «siapa · penghubung · di mana», «kata penghubungnya lupa»).

### tr
- §07 body: «İngilizcede **baş kısım şart**» — понятно, но неуклюже. → «İngilizcede cümle **It is ile başlamalı**: …»
- §11 заголовок «**Neredesin**: home, inside…» («где ты?») — раздел не про вопрос. → «**Nerede**: home, inside, upstairs — fazla kelime yok»
- §03 «I am new. — Ben buranın yenisiyim.» — грамотно, но тяжело. → «Burada yeniyim.»

### vi
- §02/§08 «We are together. — Chúng tôi **đi** cùng nhau.» — «đi» добавляет «идём». → «Chúng tôi ở cùng nhau.»
- §06 «Nói về **đàn ông** … về **phụ nữ**» (мужчина/женщина — только взрослые). Для мальчика/девочки тоже he/she. → «Nói về một người nam dùng he, người nữ dùng she.»

---

## C. Не мои языки, но заметил в ru (`lesson_01_ru.md`)

- §09 body: «Если **сомневаетесь**, сначала **найдите** … возьмите его скрепку» — обращение на «вы».
  В приложении везде «ты» (D188 / правило текстов). → «Если сомневаешься, сначала найди, о ком фраза, а потом возьми его скрепку.»
  Стоит пройти поиском по всему ru-файлу.

## Scope / Architecture / Security and privacy

Только тексты черновиков теории. Без кода. Данные не затрагиваются.

## Technical debt

- Вычитка не заменяет носителя: tr/id/vi — моя проверка, не носителя.

## Verification

Автор применяет правки в `lesson_01_{vi,id,tr}.md`; остальные 5 языков — следующим файлом.

## Rollback

Удалить файл.
