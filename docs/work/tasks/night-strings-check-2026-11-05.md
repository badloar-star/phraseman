# Task packet: проверка ночных строк на 9 языках (тур Пика, энергия, награда)

Governance-ID: TG-F23DB88B47C2
Status: In progress
Owner: 10 · ПЕРЕВОДЧИК
Related epic/enabler: ночной выпуск 05.11 (координатор, 00:03)

## Outcome

Массивы строк Пика и энергии в components/spire/spire_game_strings.ts и components/spire/moments/moments_strings.ts проверены на 9 языках: нет пустых, англоязычных заглушек в не-en, одинаковых текстов в разных языках, потерянных плейсхолдеров. Дыры исправлены правкой только строк. Успех: отчёт координатору с хэшами до 00:30.

## Scope

In scope: components/spire/spire_game_strings.ts и components/spire/moments/moments_strings.ts — только строки массивов ключей tour*, peakTour*, peakEnergy*, награда за повышение.
Out of scope: логика экранов, тесты, другие ключи, app/community_pack_create.tsx (проверяется отдельно, без правок).

## Architecture

No architecture change: правка строковых литералов в массивах, структура не меняется.

## Security and privacy

Не затрагивается: персональных данных нет.

## Technical debt

Contain: проверка регулярками по строкам, без полного парсинга TS. Выход — проверка тестами приложения после выпуска.

## Verification

Скрипт в scratchpad (node) по git show HEAD:<файл>: число значений = 9, нет пустых, нет дублей между языками, плейсхолдеры совпадают с ru. Результат — список в отчёт.

## Rollback

`git revert` коммита правки строк; данных пользователя не затрагивает.
