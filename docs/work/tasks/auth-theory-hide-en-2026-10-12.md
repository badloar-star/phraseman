# Task packet: теория уроков без своего языка — скрыть пункт для английского (THEORY_FALLBACK), 5 языков — в lesson_help на их языке

Governance-ID: TG-5FF5807CA87F
Status: Done (решение владельца: hide или es)
Owner: 5 · АВТОРИЗАЦИЯ (координатор 12.10: «по умолчанию пункт скрыт, переключатель THEORY_FALLBACK = 'hide' | 'es'»)
Related epic/enabler: продолжение 81f8f9b66 (theoryContentKey), I18N_FALLBACK_5LANG_R1.md

## Outcome

Человек с интерфейсом без своей теории не видит чужой язык в «Правилах и объяснениях». Английский: своей теории нет ни в hint, ни в
lesson_help → пункт меню урока и кнопка теории в уроке СКРЫТЫ (THEORY_FALLBACK='hide'); режим 'es' — испанская теория (81f8f9b66), одной
строкой. pt-BR/vi/id/tr/pl: у lesson_help есть их вводные экраны урока на родном языке (иначе переведённое «недоступно») — пункт не
скрывается, ведёт в /lesson_help вместо /hint. ru/uk/es — без изменений. Журнал [I18N-FALLBACK] screen=theory action=hide|es|lesson_help.

## Scope

In scope: `constants/i18n.ts` (THEORY_FALLBACK, theoryEntryFor(lang)), `app/lesson_menu.tsx` (пункт меню), `app/lesson1.tsx` (кнопка
теории в уроке), `app/hint.tsx` / `app/lesson_theory_v2.tsx` / `app/lesson_help.tsx` — защита при прямом заходе (en в режиме hide);
тест на оба режима.

Out of scope: перевод теории, решение владельца (показывать испанскую или скрывать).

## Architecture

Единая функция «куда вести за теорией» по языку интерфейса: 'hint' | 'lesson_help' | 'hidden'. Инвариант: ru/uk/es — прежний маршрут.

## Security and privacy

Не затрагивает данные.

## Technical debt

- Accept temporarily: английской теории нет; выход — перевод теории или решение владельца 'es'. Владелец — координатор.

## Verification

- jest (runInBand): theoryEntryFor для ru/uk/es/en/5 языков в обоих режимах; меню урока без пункта не оставляет пустой строки (данные
  списка фильтруются, а не рендерят null-строку).
- Контракты экранов урока/меню, проверка синтаксиса; Сверка — кадр меню урока в uiLang=en.

## Rollback

THEORY_FALLBACK='es' — показать испанскую; `git revert` — вернуть прежнее.
