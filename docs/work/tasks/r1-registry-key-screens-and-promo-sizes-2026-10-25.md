# Task packet: реестр сверки — Главная, «Сегодня», урок V2 в R1; кегль 5 образцов промокода

Governance-ID: TG-F736B28DEF68
Status: In progress
Owner: 3 · МАКЕТЫ (координатор 25.10 по разбору c00798d52)

## Outcome

1) Гейт «приложение = макет» почти не видит самые заметные экраны. Завести их в R1 в реестре
docs/phraseman-2.0/registries/visual_parity.json: Главная (components/home/v2), «Сегодня» (today_scene), урок Learning V2.
Дубли не плодить: у существующих строк проставить release, новые — только где строк нет («Сегодня»), каждая с ссылкой на
утверждённый эталон и состоянием для съёмки. 2) Образцы промокода 009–012/015 (promo-code-states.html): кегль заголовка/полей
и отступ карточки — по коду promo_code_entry.tsx (разбор: в приложении ≈26 против 24 px, карточка на ~6 px ниже).

## Scope

In scope: visual_parity.json (только свои строки, коммит через --patch), docs/design/v2-app/promo-code-states.html, этот пакет.
Out of scope: код приложения, статусы match/вердикты (ставит координатор/Сверка), съёмка.

## Architecture

No architecture change. Новые строки — status pending, без evidence; release:"r1" у существующих строк без поля release.

## Security and privacy

Только реестр и макет; данных нет.

## Technical debt

- Accept temporarily: гейт R1 станет краснее (новые pending) — для OTA он и так пропускается флагом --allow-parity-gate.

## Verification

JSON валиден; гейт с --release=r1 видит новые строки; visual_parity_gate тест-сторожа не падают по формату (matrix_row_missing не
растёт); numstat реестра = только мои строки; страница промокода без ошибок.

## Rollback

Вернуть свои хунки реестра и страницу из git.
