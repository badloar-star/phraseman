# Task packet: три красных сторожа зоны Переводчика из полного прогона 25.10 05:00 (Ревизор через координатора)

Governance-ID: TG-90F1B1AA1233
Governance-ID: TG-674175885F7F
Status: Done
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

`docs/work/tasks/fullrun-reds-2026-10-25-0500.md` → Переводчику:
1. `spire_old_names_guard` — старое имя «Шпиль» в `app/premium_theme_copy.ts` (a50cfbf18, пакет премиум-тем):
   условие «Титана» «Достичь последнего Шпиля / Reach the final Spire / Đạt Tháp cuối…» на 9 языках и id-шутка «Menara terakhir…».
   Правка — имя раздела как в приложении (`spire_game_strings.toSpire`: Пик / Пік / Peak / Pico / Đỉnh / Puncak / Zirve / Szczyt):
   ru «Подняться на вершину Пика», uk «Піднятися на вершину Піку», en «Reach the top of Peak», es «Llega a la cima del Pico»,
   pt-BR «Chegue ao topo do Pico», vi «Chinh phục Đỉnh», id «Taklukkan Puncak», tr «Zirve'nin en üstüne çık», pl «Zdobądź Szczyt»;
   id-шутка: «Puncak terakhir ditaklukkan. Lift berhenti, temanya tiba.» (остальные языки шутки говорят «башня» нарицательно — сторож их не трогает).
2. `friends_locale_runtime` — ложное срабатывание: слово `fallback` — это проп `fallback={dailyPollCard}` карточки «Фраза дня вдвоём»
   (ba45e9009), а не языковой запасной текст. Сторож теперь вырезает JSX-проп `fallback=` перед проверкой; смысл (нет веток ru/uk/es
   и запасных строк) прежний.
3. `lesson_menu_locale_runtime` — c8ffad624 намеренно поставил неразрывный пробел «число + слово» (` palavras`); ожидания сторожа
   обновлены на ` `.

## Scope

In scope: `app/premium_theme_copy.ts` (2 строки), `tests/friends_locale_runtime.test.ts`, `tests/lesson_menu_locale_runtime.test.ts`.
Out of scope: экраны «Друзья» и меню урока (не меняются).

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Сторож «Друзей» по-прежнему ловит слово `fallback` в любом другом месте файла — это его замысел.

## Verification

`npm run test:one -- tests/spire_old_names_guard.test.ts tests/friends_locale_runtime.test.ts tests/lesson_menu_locale_runtime.test.ts`.

## Rollback

`git revert <коммит>`.
