# Task packet: список кадров моментов круга 2 для Макетов

Governance-ID: TG-2553BDCD0FEA
Status: Planned
Owner: 6 · СВЕРКА
Related epic/enabler: none

## Outcome

Один документ для сессии «Макеты»: какие кадры моментов с /dev_moments_preview снимаются в круге 2, по какой ссылке и с каким эталоном. Результат — файл `docs/phraseman-2.0/PARITY_MOMENTS_R2_SHOTLIST_2026-10-15.md`; успех — Макеты и Дизайн видят полный список без чтения кода.

## Scope

In scope: новый файл-список в `docs/phraseman-2.0/`; данные берутся только чтением `app/dev_moments_preview.tsx`.

Out of scope: запуск эмулятора и съёмка (ждёт слова владельца), правки кода приложения, правки реестра паритета.

## Architecture

No architecture change: документ, код и данные не меняются.

## Security and privacy

Не затрагивает: нет данных пользователей, секретов, прав доступа. Ссылки — только dev-маршрут на моках.

## Technical debt

Accept temporarily: параметры m11 уточняются у Дизайна (владелец — Сверка, срок — следующий круг; влияние — один кадр не в списке).

## Verification

Проверка вручную: параметры в таблице совпадают с шапкой `app/dev_moments_preview.tsx`; файл читается без доработок. Скрипт съёмки `C:/Temp/claude/sv/mom2.sh` подготовлен, не запускался.

## Rollback

Удалить новый файл списка и этот пакет (`git revert` коммита).
