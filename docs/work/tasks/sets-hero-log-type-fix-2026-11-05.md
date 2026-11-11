# Task packet: исправление типа в логе [SETS-HERO] (FlashcardsCategoryHub)

Governance-ID: TG-3ECE5E66DA68
Status: In progress
Owner: сессия «Темы»
Related epic/enabler: TG-5FC55E5780A5 (лог [SETS-HERO])

## Outcome

Общая проверка типов снова зелёная: лог `[SETS-HERO]` вынесен из JSX-выражения (где `console.log` даёт тип void и ломает проверку типов) в оператор перед `return`. Мерка: проверка типов файла проходит, лог остаётся.

## Scope

In scope: `app/flashcards/FlashcardsCategoryHub.tsx` — перенос одной строки лога.
Out of scope: поведение героя, раскладка, другие строки лога.

## Architecture

Без изменения архитектуры: лог — побочный оператор до `return`, не влияет на рендер.

## Security and privacy

Не применимо: в лог пишутся только счётчики и язык интерфейса.

## Technical debt

- Accept temporarily: лог снимается после починки вкладки «Наборы» (владелец — сессия «Темы»).

## Verification

- Парсер (`@babel/parser`, typescript+jsx) — OK.
- Проверка типов файла под светофором (`npm run typecheck` по затронутому файлу) — итог по строке ошибок.

## Rollback

Вернуть прежнюю строку в JSX: ошибка типов вернётся.
