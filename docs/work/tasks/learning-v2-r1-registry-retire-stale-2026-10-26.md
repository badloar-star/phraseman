# Task packet — реестр сверки: строки урока V2 r1 на мёртвые экраны и устаревшие эталоны

Governance-ID: TG-EEF7FBD6691A

## Outcome
Каждая из 87 строк learning-v2-* (release r1) в docs/phraseman-2.0/registries/visual_parity.json проверена по коду: строки на экраны, которых люди не видят (карта глав вместо «Сезона», мёртвые компоненты), помечены «снято, экран не показывается» с причиной и не удалены; строки окна запуска занятия переведены на утверждённый 25.10 эталон lesson-preparing-live.html. Отчёт в docs/work.

## Scope
Только реестр visual_parity.json (поля строк learning-v2-*), отчёт docs/work/learning-v2-r1-registry-retire-2026-10-26.md. Код приложения, гейт и макеты других зон не трогаются; статусы match/reviewed_by/no_release_surface ставит только координатор.

## Architecture
Скрипт-опись в C:/Temp/claude/mb/spire3 читает реестр, по git grep проверяет импорты кода строки вне dev; правка — точечная запись полей (retired, mockup, triage.final_bucket) с сохранением формата JSON.stringify(reg, null, 2) + LF. Статус не меняется на no_release_surface без доказательства, которое понимает гейт.

## Security and privacy
Только документы и реестр; данных пользователей нет.

## Technical debt
Гейт не знает доказательства «компонент не импортируется» — для зелёного статуса таких строк нужен либо новый вид release_surface_proof (Ядро), либо решение координатора/владельца. Это будет в отчёте.

## Verification
node --test tests/visual_parity_gate.test.mjs (быстрые тесты + пересборка); node scripts/visual_parity_gate.mjs --release=r1 --defer-triage — число строк не меняется, нарушений не больше, чем было; numstat реестра равен числу правленых строк.

## Rollback
git revert коммита реестра и отчёта.

Governance-ID: TG-7406583378C4
