# Task packet: PhraseMan 2.0 — программа упрощения (исполнение пакета документации)

Governance-ID: TG-B8B185E8E6FC
Governance-ID: TG-0D37B324E0CA
Governance-ID: TG-C1C352FE9875
Governance-ID: TG-47C260F8AF2C
Governance-ID: TG-FCBAFE1B7982
Governance-ID: TG-DDAB4B34D59F
Governance-ID: TG-B08D6ACD9EB2
Governance-ID: TG-41CB66802AB9
Governance-ID: TG-DE517B0959B7
Governance-ID: TG-36B729A96807
Governance-ID: TG-B349960D5E16
Governance-ID: TG-1F89C5868888
Governance-ID: TG-D37959D20725
Governance-ID: TG-3610401D354E
Governance-ID: TG-1FF932BEB949
Governance-ID: TG-C79166411E7F
Governance-ID: TG-DD937B7EA088
Governance-ID: TG-4E689EE56031
Governance-ID: TG-D362784CED68
Governance-ID: TG-330034F7AD47
Governance-ID: TG-CCE215FD9897
Governance-ID: TG-63EFB63FC983
Governance-ID: TG-09E9D3C81346
Governance-ID: TG-96FF2E4299C6
Governance-ID: TG-E6899B5F3660
Governance-ID: TG-CF5CE52DCE76
Governance-ID: TG-2BC9D5EE4B85
Governance-ID: TG-BBDFD166EF4A
Governance-ID: TG-4CBF51E96CF5
Governance-ID: TG-00F952498F82
Governance-ID: TG-6A0C730989BF
Governance-ID: TG-D01E85DD6809
Governance-ID: TG-7F99C66A2E36
Governance-ID: TG-E0D674ECEA2A
Governance-ID: TG-078EE769AB98
Governance-ID: TG-C73362423E1A
Governance-ID: TG-816719164EA2
Status: In progress
Owner: сессия Claude 2026-09-24 (оркестратор Opus 5.5, исполнители — субагенты по таблице моделей)
Related epic/enabler: E01–E24 пакета `docs/phraseman-2.0/`

## Outcome

Приложение упрощается по пакету PhraseMan 2.0 (257 задач, 24 эпика): убрать лишнюю
геймификацию (спины, подарки, жемчуг, XP, фанфары, темы, арена из релиза), оставить
путь YouTube → набор → практика. Прогресс ведётся в `docs/phraseman-2.0/PROGRESS.md`,
чтобы любая следующая LLM продолжила с того же места. Успех конкретной задачи —
принятые критерии её карточки с evidence, а не «файлы изменены».

## Scope

In scope: задачи пакета по порядку «сначала лёгкие»: read-only инвентаризация (PM-001,
PM-004…009), мелкие удаления L0/L1, затем S1. Удаление видимых элементов делает эта
программа; новый внешний вид — отдельная сессия интерфейса.

Out of scope без явного решения владельца: деньги/балансы/миграции данных (S2), удаление
серверных функций, открытые решения D04/D13/D16/D21/D23/D27/D18, удаление веток.

## Architecture

Решение владельца 2026-09-24: 1.6.x больше не выпускается, изменения 2.0 идут прямо в
общую ветку `feature/referral-roulette` без флага. Удаление — вертикальными срезами
(маршрут → экран → импорты → провайдеры → таймеры → серверные jobs → ассеты → строки →
тесты), общие зависимости не удаляются вместе с одним потребителем.

## Security and privacy

Сырые исходники владельца (голосовая запись, скриншоты) НЕ коммитятся — репозиторий
публичный; лежат в `docs/phraseman-2.0/sources/` (в .gitignore). Удаление
механик, собирающих данные, требует сверки Privacy Policy (PM-248).

## Technical debt

- Contain: старые сторожа (лиги, уроки за жемчуг, энергия) будут противоречить 2.0 —
  меняются осознанно в той же задаче, что и логика, с записью в PROGRESS.md.

## Verification

Точечные тесты `npm run test:one -- tests/<файл>`, точечный tsc, сторожа pre-commit;
для каждой задачи — evidence в PROGRESS.md и `registries/tasks.json`.

## Rollback

Каждая задача — отдельный атомарный коммит; откат — `git revert <sha>` конкретной задачи
(кроме файлов Арены — их не откатывать, см. CLAUDE.md). Необратимые шаги (миграции
балансов) только после согласования владельцем.
