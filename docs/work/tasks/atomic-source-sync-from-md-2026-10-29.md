# Task packet: пересборка 2.0.4 (--extend) + синхронизация practice.atomic.json ← md по ru/uk текстам

Governance-ID: TG-A93D8087B256
Governance-ID: TG-4122AE6DE8C3
Governance-ID: TG-7FC88B2FEEB0
Governance-ID: TG-CFE0D4D57676
Governance-ID: TG-0DC9F57CEDEC
Governance-ID: TG-E97D841DF9F7
Governance-ID: TG-A8A0DB130E80
Governance-ID: TG-E69A696E51AB
Governance-ID: TG-9A533CF596EE
Governance-ID: TG-B160B96893DC
Governance-ID: TG-7A4734065B8B
Governance-ID: TG-561D3A610742
Governance-ID: TG-9480194E07CD
Governance-ID: TG-2F3418B697D5
Governance-ID: TG-08ECFB64D88C
Governance-ID: TG-99AB0126F12E
Governance-ID: TG-CACD993623DD
Governance-ID: TG-D3704A462FA5
Governance-ID: TG-770D11C62852
Governance-ID: TG-C0DDEA36BBF6
Governance-ID: TG-6E347283B338
Governance-ID: TG-274CCCA09CB3
Governance-ID: TG-0E3C4F34E645
Governance-ID: TG-611433CBCC9E
Governance-ID: TG-02E223623E99
Governance-ID: TG-C80A064E52E3
Governance-ID: TG-F7619B26E819
Status: In progress
Owner: Learning V2 session; координатор 29.10 (А — да; Б — делать мне, dry-run до записи)

## Outcome

А. Манифест --extend в снимке HEAD: ~1160 занятий, прошедших сверку, — с новыми текстами в generated_release/en + манифест + индекс заданий;
632 занятия остаются прежними. Перенос только чистых целевых путей, коммит, список 632 по урокам — Ревизору.
Б. Скрипт синхронизации practice.atomic.json из md только для текстовых полей (prompt, accessibilityLabel, choiceFeedback,
gappedTargetPhrase): занятие строится функциями самого сборщика (parsePractice, buildInteraction); всё остальное — id, варианты,
ответы, английские реплики — сверяется байт в байт, иначе занятие не трогается. После синхронизации сверка atomicMarkdownParityIssues = пусто.
Сначала dry-run с отчётом координатору; запись — только в atomic-файлы, чистые в git. 23 случая correct_response_missing — список Теории.
Предложение сторожа pre-commit: изменение блока заданий md без atomic того же занятия — отказ.

## Scope

Скрипт вне репозитория (scratchpad); запись — content/learning-v2-course/sessions/en/**/practice.atomic.json (после dry-run и слова координатора);
перенос — content/learning-v2-course/release/en, modules/learning-v2/content/factory_native/generated_release/en, манифест/каталог/индекс.

## Architecture

md (final.ru/uk.md) и practice.atomic.json — два источника блока заданий; сборщик и манифест требуют их совпадения.

## Security and privacy

Не затрагивается: учебные тексты.

## Technical debt

Два источника одних заданий — корень ловушки; сторож pre-commit закрывает повтор.

## Verification

Сверка сборщика по каждому занятию; сторожа курса; сравнение озвучиваемых строк было/стало.

## Rollback

Revert коммитов переноса и синхронизации.
