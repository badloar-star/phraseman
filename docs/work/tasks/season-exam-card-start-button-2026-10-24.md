# Карта «Экзамен главы» до эталона: кнопка «Начать экзамен», видимые ⚡1 / Plus (Р1)

Governance-ID: TG-8D30FE9EBE87

## Outcome
Координатор 24.10 (Р1): экзамен главы утверждён владельцем на способе 2 — 9-я карта, «⚡ 1» у Free, «Plus бесплатно», можно сдать
заранее. Довести карту до эталона chapter-exam-season.html: кнопка «Начать экзамен» с ⚡1 и строкой для Plus. Движок экзамена —
Learning V2, его не трогаем. Не зелёный и не прошёл Сверку к 06:30 — SEASON_CHAPTER_EXAM_ENABLED остаётся выключенным в релизе.

## Scope
components/learning-v2/season/season_flags.ts — SEASON_CHAPTER_EXAM_START_ENABLED = true; пины tests/season_pure.test.ts и
tests/season_wire_contract.test.ts. Карта и раскрытая карта уже рисуют кнопку с ⚡1 и строку Plus — им не хватало только флага.

## Architecture
В выпуске карты экзамена по-прежнему нет: SEASON_CHAPTER_EXAM_ENABLED = ENABLE_DEV_TOOLS && !IS_STORE_RELEASE. В dev-сборке
Сверка видит карту целиком, с кнопкой. Включение в выпуск — одна строка того же файла, после вердикта Сверки.

## Security and privacy
Нет новых данных и сервисов; экран вопросов работает без сети, монеты — прежним путём.

## Technical debt
Экран вопросов Learning V2: крестик закрывает без подтверждения после списания ⚡1; при неполном выпуске главы зачитываются
невыпущенные эпизоды; «сдан» хранится только на телефоне — переданы Learning V2.

## Verification
Срез типов Сезона, тесты Сезона.

## Rollback
git revert коммита (вернёт false).
