# Task packet: проверка «есть ли данные гостя» не гоняет обычные строки через JSON.parse (журнал iPhone 18.10)

Governance-ID: TG-3644C794A536
Status: В работе
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Пропадают 44 предупреждения `[WARNING] local_account_data:parsed: JSON Parse error: Unexpected character: p/l/b/c/a/3/e`
за вход (журнал iPhone владельца 08:41–08:48, docs/phraseman-2.0/evidence/modals_1018/IPHONE_LOG_FINDINGS_0830.md).
Результат проверки «значимо/пусто» для каждого значения не меняется.

## Scope

- app/local_account_data.ts: isMeaningfulStoredAccountValue — JSON.parse только для значений, начинающихся с `[` или `{`.
- tests/local_account_data.test.ts: строки и числа без JSON — значимы и без предупреждения; битый JSON — значим, с логом.

## Architecture

Факт из журнала: единственный источник метки — catch в isMeaningfulStoredAccountValue (clean_proof и
hasMeaningfulLocalAccountData читают ~2250 значений, часть — обычные строки: имя, язык, тема). Для скаляров JSON.parse
ничего не решает: '0'/'false'/'null' отсеяны раньше, любое другое число/строка → «значимо». Поэтому разбирать нужно
только массивы/объекты (пустые [] и {} отсеяны раньше, но '[ ]' с пробелами — тоже пусто). Битый `[`/`{` по-прежнему
логируется (с первым символом и длиной, без значения) и считается значимым — безопасная сторона (окно смены, а не стирание).

## Security and privacy

В лог — только длина и признак формы, значения не печатаются.

## Technical debt

Классификатор guest_clean_classifier свои значения разбирает отдельно (describeGuestValueShape) — его не трогаем; если
там тоже есть шумный parse, это отдельная задача после замера.

## Verification

Точечные тесты local_account_data + guest_clean_handoff_matrix + auth_provider_behavior через светофор.

## Rollback

`git revert <hash>`.
