# Task packet: вычитка подписей хаба Диалогов v4 и переключателя «Слов» (Переводчик, координатор 22.10)

Governance-ID: TG-C67E140F90CD
Status: Done — замер Inter: переключатель ≤ 150 px, заголовки 22 px ≤ 230 px, всё влезает
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

Вычитка новых строк из 6765d7bc5 (2 · ДИЗАЙН) на 9 языках и замер ширины на 360 dp. Точечные правки:
- `app/learning_v2_lesson_words.tsx`:
  - пустые состояния «Весь курс» и «Этот урок» на ru и uk обращались на «вы» («когда вы встретите»). Интерфейс приложения —
    на «ты» (сторож `informal_address_ru_uk_guard` файлы Learning V2 не видит, поэтому не поймал) → «когда встретишь» /
    «коли зустрінеш». Учебный текст курса («Что вы освоите») не трогаю — это контент;
  - pt-BR «Curso todo» → «Todo o curso» (естественный порядок);
  - vi «Từ của khóa học» → «Từ vựng khóa học» (как плитка «Từ vựng»);
  - id «Kata kursus» → «Kata dalam kursus» (без предлога читается как «слово-курс»).
- `components/dialogs/DialogueV2PlusTools.tsx`: es «Práctica sin escenario» → «Práctica sin guion» («escenario» — «сцена», а
  нужен «сценарий»).

Остальное верно: «Темы» / `topics`, «Все диалоги» / `allDialogs`, «Этот урок / Весь курс» (кроме pt), «Откроется на ранге N»,
подписи тем.

## Scope

In scope: перечисленные подстроки. Out of scope: логика хаба и «Слов», учебный текст Learning V2.

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Не проверено носителями.

## Verification

`babel.parseSync` обоих файлов; замер ширины Inter (переключатель 44 px — половина дорожки ≈ 156 px текста 15 px; заголовок
экрана темы 22 px, одна строка); поиск старых строк в тестах; `git diff --numstat`.

## Rollback

`git revert <коммит>`.
