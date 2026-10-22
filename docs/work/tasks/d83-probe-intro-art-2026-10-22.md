# Сторож D83: картинка intro_arena — арт, а не код Арены

Governance-ID: TG-0CFB5822CFD1

## Outcome
Проба `tests/d83_arena_client_deleted.probe.ts` снова зелёная: два пути `assets/images/v2art/{dark,light}/intro_arena.webp` в `themed_art_assets.generated.ts` внесены в исключения с причиной. Повод — сообщение 8 · МОМЕНТЫ: красная проба в HEAD после коммита 06dd77148.

## Scope
In scope: исключение в регулярке разрешённых импортов в пробе.
Out of scope: переименование картинки (файлы и реестр принадлежат арту/Дизайну, плитка «Шпиль» пока берёт этот арт), код Арены.

## Architecture
`intro_arena` — имя картинки-иллюстрации в реестре тематического арта, плитка «Шпиль» на Главной временно берёт её (themed_art_registry.ts). К удалённой Арене кода это отношения не имеет; проба ловила слово «arena» в пути. Исключение узкое: только эти два файла .webp.

## Security and privacy
Данных не касается.

## Technical debt
Когда арт Шпиля будет заказан и заменит картинку — убрать исключение вместе с `intro_arena`.

## Verification
Запуск пробы `npx tsx tests/d83_arena_client_deleted.probe.ts` (exit 0).

## Rollback
Убрать добавленную альтернативу из регулярки.
