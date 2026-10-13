# Task packet: статический проход по зоне Дизайна — тексты вне переводов (EN-интерфейс и 9 языков)

Governance-ID: TG-EC0D582F26E5
Governance-ID: TG-0F0C23267F2B
Governance-ID: TG-5AD047091445
Governance-ID: TG-71C649E647D4
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по команде координатора
Related epic/enabler: scripts/scan_untranslated_ui.mjs (общий храповик, config/untranslated-ui-baseline.json), EN_UI_READINESS_R1.md, I18N_FALLBACK_5LANG_R1.md

## Outcome

Список находок по файлам зоны (Карточки, Диалоги-клиент, Видео, Главная, пейволы-вид): (1) кириллица и видимые тексты в JSX/props (title, placeholder, accessibilityLabel, тосты, Alert), НЕ идущие через переводы; (2) переводные объекты неполной ширины (<9 языков) — они показывают запасной язык. Для каждой находки — решение: исправить сейчас (переводы есть на все 9 языков), передать Ядру на тексты, пропустить (dev-only, логи). Зонный сторож-храповик: текущее число находок = потолок, новые не добавляются.

## Scope

In scope: новый скрипт scripts/scan_i18n_design_zone.mjs + база config/i18n-design-zone-baseline.json + тест-запуск; документ docs/phraseman-2.0/I18N_DESIGN_ZONE_R1_2026-10-13.md со списком; правки строк только если перевод на все 9 языков уже есть в коде.

Уточнение координатора 13.10: храповик по всему app/ и components/, чинить только зону Дизайна.

Out of scope: новые тексты и переводы (Ядру), зоны других сессий, существующий общий сторож (не меняю, дополняю зонным).

## Architecture

Зонный сторож отличается от общего `scan_untranslated_ui.mjs`: смотрит ТОЛЬКО файлы зоны и считает не только русские литералы вне переводчика, но и неполные языковые объекты (<9). Файл базы — по файлам, чтобы падение числа было видно.

## Security and privacy

Не затрагивает данные и права.

## Technical debt

Contain: неполные переводные объекты остаются (запасной язык), пока Ядро не даст тексты; потолок не даёт им расти.

## Verification

Запуск скрипта: OK против базы; тест `tests/i18n_design_zone_ratchet.test.mjs` (node:test).

## Rollback

git revert коммита.
