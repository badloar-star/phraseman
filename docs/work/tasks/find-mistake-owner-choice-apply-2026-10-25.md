# Task packet: «Найди ошибку» выбрано владельцем — применить везде + сторож старого названия (Переводчик, 25.10)

Governance-ID: TG-674175885F7F
Status: Done
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

Координатор 25.10: владелец выбрал «Найди ошибку» (вариант из f315dd6f0). Название задания Пика find_oddity на 9 языках:
Найди ошибку / Знайди помилку / Find the mistake / Encuentra el error / Encontre o erro / Tìm lỗi sai / Temukan kesalahan / Hatayı bul / Znajdź błąd.
- Строка интерфейса `promptOdd` (`components/spire/spire_game_strings.ts`) уже такая с c0029b09d — правка не нужна.
- Поиск по `app`, `components`, `constants`, `hooks`, `modules`, `functions/src`, `docs/design/v2-app`: в строках интерфейса старого
  названия нет; осталось только в комментариях кода и в подписи колонки макета `spire-gaps-states.html` («Найди лишнее · find_oddity»)
  — подпись меняю на «Найди ошибку · find_oddity».
- Сторож `tests/spire_old_names_guard.test.ts`: новый случай — старое название «Найди лишнее» на 9 языках не появляется в строках
  интерфейса (тот же разбор строк без комментариев и журнала, что для «Шпиль»), и `promptOdd` равно выбранным 9 строкам.

## Scope

In scope: тест-сторож, подпись колонки макета. Out of scope: комментарии в чужих файлах (сторож их не считает).

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Комментарии в `SpireTaskView.tsx`, `spire_oddity_prompt.ts`, `spire_mistake_capture.ts` ещё говорят «Найди лишнее» — сторож их
  не считает (не видны человеку); переименовать при следующей правке этих файлов их владельцами.
- В облачном пуле шаблон по-прежнему «Найдите фразу, которую нужно исправить.» — смысл совпадает с новым названием, правка не нужна.

## Verification

Лёгкая проверка условий сторожа скриптом; прогон `npm run test:one -- tests/spire_old_names_guard.test.ts` через слот.

## Rollback

`git revert <коммит>`.
