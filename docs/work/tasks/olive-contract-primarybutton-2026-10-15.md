# Контракт olive_phase1_surface: проверять смысл цвета надписи PrimaryButton, а не точную строку

Governance-ID: TG-0216A150F6C2
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (поручение координатора)

## Outcome
Тест перестаёт ждать устаревший текст `: t.correctText;` и проверяет смысл правки 1ec91fd46: на лице кнопки надпись цветом `accentInk` (с запасным `correctText`), в выключенном виде — `correctText`.

## Scope
tests/olive_phase1_surface_contract.test.ts — одно утверждение. Код кнопки не меняется.

## Architecture
Утверждение по регулярному выражению: `isDisabled ? t.correctText : (t.accentInk ?? t.correctText)` независимо от пробелов.

## Security and privacy
Нет: тест читает исходник.

## Technical debt
Нет.

## Verification
Точечный запуск одного файла теста по слоту светофора, один рабочий поток.

## Rollback
git revert.
