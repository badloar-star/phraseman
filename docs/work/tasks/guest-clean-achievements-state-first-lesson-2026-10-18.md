# Task packet: «чистый гость» — пустой achievements_state и last_opened_lesson=1 не считаются прогрессом (сценарий №1)

Governance-ID: TG-2F328AA93D1B
Status: В работе
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Свежий гость, который лишь открыл первый урок (ничего не пройдя), входит в существующий аккаунт без окна
«Телефон уже связан». Пустой список достижений `achievements_state` и метка `last_opened_lesson='1'` — заготовки.

## Scope

- app/guest_clean_classifier.ts: два правила (по форме значения, как у achievements_v1 и unlocked_lessons).
- tests/guest_clean_handoff_matrix.test.ts: заготовки чисты; полученное достижение и урок ≠1 — прогресс.

## Architecture

Факт (эмулятор 18.10 10:39, logcat): `GUEST-CLEAN summary progress=2` у гостя с 0 монет/0 уроков: `achievements_state`
(arr32, все unlockedAt:null — та же форма, что achievements_v1, уже «default» по isUnearnedAchievementList) и
`last_opened_lesson=1` (открыт первый урок, 0/50 пройдено). Правила по ЗНАЧЕНИЮ, не по имени: любое полученное
достижение или иной номер урока — по-прежнему прогресс (при сомнении — прогресс).

## Security and privacy

Новых данных нет; классификатор влияет только на ветку входа в существующий аккаунт.

## Technical debt

Опись ключей, которые свежий гость пишет при первом открытии урока, не полная — новые ложные «прогрессы» ловит
журнал [GUEST-CLEAN] (по одной строке на ключ).

## Verification

Точечные тесты матрицы и классификатора через светофор; повтор сценария №1 на эмуляторе.

## Rollback

`git revert <hash>`.
