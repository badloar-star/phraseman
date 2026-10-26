# Task packet — Макеты, ночная пачка 26.10: «назад» в Диалогах, новые строки реестра, нумерация video.html, сцена Диалогов

Governance-ID: TG-36DCC8AEEFDC

## Outcome
1) В docs/work/back-button-mockup-truth-2026-10-26.md — размеры «назад» Диалогов на эталоне против кода (DialogueGlassBackButton 44, BackGlyph 23/18/28/22) и отдельный раздел «Владельцу на утро» (экраны без эталона).
2) Реестр: строки для эталонов без строк — friends-full.html (дуэль), chapter-exam-season.html (экзамен главы, распределение), dialogs-hub-v4.html (тема); статус честный, по коду (pending, без match).
3) Реестр: номера телефонов video.html пересчитаны по подписям, перечень старый → новый.
4) Эталон сцены Диалогов — тексты по dc9e1d07d.

## Scope
Только docs/phraseman-2.0/registries/visual_parity.json, эталоны в docs/design/v2-app, отчёты в docs/work. Код приложения не меняю; match/reviewed_by ставит координатор.

## Architecture
Скрипты в C:/Temp/claude/mb/spire3; реестр пишется JSON.stringify(reg, null, 2) + LF; новые строки — по образцу соседних (source, mockup{file,phone,label,mapping}, screen, state, code, statuses null), release r1 только там, где экран в выпуске.

## Security and privacy
Только документы и макеты, данных нет.

## Technical debt
Новые строки сразу красные (pending) до кадров Сверки; это честно и видно в гейте.

## Verification
Гейт --release=r1 --defer-triage до/после: число строк растёт ровно на добавленные, прочих новых нарушений нет; тесты visual_parity_gate (быстрые) зелёные; номера video.html сверены по подписи телефона в браузере.

## Rollback
git revert соответствующего коммита.

Governance-ID: TG-F1DEB9A96127

Governance-ID: TG-36D31AA874DE

Governance-ID: TG-E68D605568EA

Governance-ID: TG-DED1DC9B03E7

Governance-ID: TG-DD5456EB6584

Governance-ID: TG-00E5D4B30675

Governance-ID: TG-FE3E162F1B87

Governance-ID: TG-658890AF4022

Governance-ID: TG-42A8D0D1DDBC

Governance-ID: TG-28152AE821EA

Governance-ID: TG-1791D60C5488

Governance-ID: TG-27F2A90EB80E

Governance-ID: TG-EDA01A381680

Governance-ID: TG-A93444A9399C

Governance-ID: TG-3752C34D5A62

Governance-ID: TG-7D64306418C2
