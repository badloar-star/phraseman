# Ключ en в названиях тем; разбор Шпиля — таблица ruleNote

Governance-ID: TG-FF20C91F9924
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (поручение координатора 14.10)
Related epic/enabler: cards-three-fixes-2026-10-14.md

## Outcome
1) У всех названий тем в `app/theme_display_names.ts` есть английское название; тип делает `en` обязательным, тест сторожит все 9 языков. 2) По Шпилю: проверено, где показывается `explanation.ruleNote`; результат — записью координатору (см. Scope).

## Scope
Файл названий тем и новый тест. `settings_themes.tsx` и `ugcCardThemePresets.ts` проверены сканом: ключ en в них уже есть (по запросу координатора 8 / 6 мест относились только к названиям тем). Клиентскую таблицу ruleNote Шпиля НЕ делаю: сервер вырезает `explanation` из публичных заданий (`functions/src/spire_pack_contract.ts:465`), клиент Шпиля ruleNote нигде не показывает — подключать таблице некуда; решение за координатором.

## Architecture
Чистые данные: словарь THEME_DISPLAY_NAMES, тип ThemeDisplayName.

## Security and privacy
Не применимо.

## Technical debt
Старые названия тем (indigo, sagePorcelain, midnight, ember, aurora, volt, dark, gold) — устаревшие ключи; удалять их не в этой задаче.

## Verification
Точечный jest под слотом светофора; скан 3 файлов на объекты с ru без en.

## Rollback
git revert коммита.
