# Замер бандлера в режиме стор-релиза и состав node_modules

Governance-ID: TG-B50D22CAB99B
Status: анализ завершён, код не менялся
Owner: сессия «4 · ТЕМЫ 2.0» (запрос координатора 23:05)
Related epic/enabler: память ПК при запущенном бандлере

## Outcome

Документ metro-memory-root-cause-2026-10-10.md получает «Поправку 2»: замер режима без Learning V2 (5,5 ГБ — те же, что в dev) и находка про ≈13,6 ГБ папок сборки Gradle в node_modules.

## Scope

In scope: чтение, замеры, документ, строка во входящие. Out of scope: правки конфигурации бандлера, перезапуск, запуск второго бандлера.

## Architecture

Изменений кода нет. Предложение (не применено): исключить `node_modules/**/android/(build|.cxx|.gradle)` из карты файлов.

## Security and privacy

Не применимо.

## Technical debt

Куча живого процесса и его NODE_OPTIONS не измерены; главный вклад в 5,5 ГБ не установлен.

## Verification

Обход node_modules скриптом (чтение), командная строка процесса, замеры по PID.

## Rollback

`git revert` коммита с документом.
