# «Слова» (этот урок / весь курс) — тексты макета на 9 языках для 2 · ДИЗАЙН (Переводчик, координатор 22.10)

Status: Готово к переносу — ключи ниже; почти всё уже переведено в коде, поэтому берём оттуда (одно слово — один перевод)
Owner: «10 · ПЕРЕВОДЧИК»

Макет: `docs/design/v2-app/words-lesson-course.html` (54f47688e), кадры 1–6. Порядок: ru, uk, en, es, pt-BR, vi, id, tr, pl.
Обращение на «ты», без рода. Замер Inter (шрифт макета) на 360 dp — в последнем столбце.

## Ключи

| ключ | где в макете | откуда взять / текст | замер |
|---|---|---|---|
| lessonTitle | шапка «3. Словарь» (20 px, одна строка, ~220 px) | `{n}. ` + «Словарь / Словник / Dictionary / Diccionario / Dicionário / Từ điển / Kamus / Sözlük / Słownik» — как в `LearningV2LessonDictionaryOverlayV1.tsx` | ≤ 147 px |
| courseTitle | шапка «Слова курса» | уже в `app/learning_v2_lesson_words.tsx` (вычитано 22.10): Слова курса / Слова курсу / Course words / Palabras del curso / Palavras do curso / Từ vựng khóa học / Kata dalam kursus / Kurs kelimeleri / Słowa kursu | max id 181 px |
| switchLabels | таблетка «Этот урок / Весь курс» (13 px) | уже в коде: Этот урок·Весь курс / Цей урок·Весь курс / This lesson·Whole course / Esta lección·Todo el curso / Esta lição·Todo o curso / Bài này·Cả khóa học / Pelajaran ini·Seluruh kursus / Bu ders·Tüm kurs / Ta lekcja·Cały kurs | ≤ 150 px |
| searchPlaceholder | «Поиск слова» | как в прежнем словаре: Поиск слова / Пошук слова / Search a word / Buscar una palabra / Buscar uma palavra / Tìm từ / Cari kata / Kelime ara / Szukaj słowa | ≤ 270 px |
| clearSearch (чтец) | крестик в поиске | как в прежнем словаре: Очистить поиск / Очистити пошук / Clear search / Borrar la búsqueda / Limpar a busca / Xóa tìm kiếm / Hapus pencarian / Aramayı temizle / Wyczyść wyszukiwanie | — |
| nothingFound | кадр 6 | как в прежнем словаре: Ничего не нашлось / Нічого не знайшлося / Nothing found / No se encontró nada / Nada encontrado / Không tìm thấy gì / Tidak ada yang ditemukan / Bir şey bulunamadı / Nic nie znaleziono | переносится |
| sectionLesson | раздел «Урок N» + число | `SEASON_COPY.lesson` («Урок {n}» / Lesson {n} / Lección {n} / Lição {n} / Bài {n} / Pelajaran {n} / Ders {n} / Lekcja {n}); число — отдельно, как в макете | — |
| closedTail | «Ещё N слов откроются в эпизодах урока» | уже `learningV2ClosedWordsLineV1` (`app/learning_v2_lesson_words_closed_v1.ts`), склонения ru/uk/pl | переносится |
| emptyLesson / emptyCourse | кадр 4 | уже в коде, на «ты» (правка Переводчика 22.10): «Слова появятся здесь, когда встретишь их в занятиях этого урока / курса» и 8 языков | переносится |
| speakWord (чтец) | динамик в строке | как в «кармане слов» `LearningV2WordPocketOverlayV1.tsx`: «Озвучить слово {word}» / Озвучити слово / Play {word} / Escuchar {word} / Ouvir {word} / Phát âm {word} / Putar {word} / {word} kelimesini dinle / Odtwórz słowo {word} | — |
| saveWord / removeWord (чтец) | закладка «в карточки» | как во «встрече со словом» `app/learning_v2_new_word_encounter_copy.ts`: «Сохранить {word} в карточки» / «Убрать {word} из карточек» и 8 языков | — |
| back (чтец) | круглая «назад» | уже в экране | — |

## ⚑ Расхождение макета и кода

Кадр 4 макета показывает пустое состояние на «вы» («когда вы встретите…»), подписанное «текст из кода дословно».
Сегодня код переведён на «ты» («когда встретишь…»): интерфейс приложения обращается на «ты», а сторож
`informal_address_ru_uk_guard` файлы Learning V2 не видит. Для «Сверки» это согласованное отклонение. Если координатор решит
иначе, вернём «вы» и в коде.

## Не нужно

Новых переводов не требуется: все подписи макета уже есть в коде, кроме сборки заголовка «`{n}. Словарь`» —
он склеивается из готового слова. Свои ключи Дизайн заводит сам; при переносе прошу брать строки из указанных мест,
а не переводить заново.
