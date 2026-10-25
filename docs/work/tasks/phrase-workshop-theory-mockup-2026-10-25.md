# Task packet: «Мастерская фраз» — макет на свежих снимках Сверки + кнопка «Теория» и шторка теории занятия

Governance-ID: TG-4C0931E42D86
Status: In progress
Owner: 3 · МАКЕТЫ (заказ 2 · ДИЗАЙН 25.10, решение владельца «теория в составе»)
Related epic/enabler: app/phrase_workshop_theory_v1.ts, docs/design/v2-app/phrase-workshop-real.html

## Outcome

Макет на свежих снимках classic_mode («Графит», светлая, max): вход у пройденного урока (Plus / замок / «копится» + тост),
экран режима «Мастерская фраз» (без сердец, «Теория» в ряду инструментов) и шторка теории — страницы вступления того занятия,
откуда фраза (урок 1, занятие 17 для «We are safe»): «Смысл / Схема / Ловушка», роли текста как на вступлении. Только ru/uk.

## Scope

In scope: docs/design/v2-app/phrase-workshop-real.html (+ артефакт Mgiat3h327LrNzinagLX87), этот пакет. Out of scope: код шторки (Дизайн).

## Architecture

No architecture change. Тексты — intro.json занятия из generated_release; цвета — токены graphite · light · max и introTextRoles.

## Security and privacy

Макет, данных нет.

## Technical debt

- Accept temporarily: кнопки «Устно» и «Отменить» на кадре дорисованы по корпусу кнопки «Теория» — на снимке под ними была dev-плашка «DEV: grammar hint» (только dev-сборка). Пересъём без плашки — Сверка, когда будет release-кадр.

## Verification

Кадры собраны real_compose на настоящих снимках; dev-плашка снимка убрана; страница без ошибок консоли.

## Rollback

git revert коммита — только макет.
