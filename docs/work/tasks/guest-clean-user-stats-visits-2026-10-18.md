# Task packet: «чистый гость» — user_stats_v1 только с посещениями не прогресс (сценарий №9)

Governance-ID: TG-E4DEEF785FBF
Status: В работе
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Гость, который лишь заходил в разделы (карточки, магазин) без уроков, ответов и покупок, входит в существующий аккаунт
без окна «Телефон уже связан».

## Scope

- app/guest_clean_classifier.ts: правило по значению для `user_stats_v1`.
- tests/guest_clean_handoff_matrix.test.ts: только посещения — чист; начатый урок/ответ/покупка — прогресс.

## Architecture

Факт (эмулятор 18.10 11:10, logcat): `GUEST-CLEAN summary progress=1` — единственный ключ `user_stats_v1` формы
{lessonsStarted:0, lessonsAbandoned:0, answersTotal:0, answersCorrect:0, energyHits:0, featuresOpened:{flashcards:N}, …}.
Счётчики поведения (app/user_stats.ts) — аналитика для админки; «жалко потерять» в них только учёба и покупки.
Правило: default ⇔ lessonsStarted, lessonsAbandoned, answersTotal, answersCorrect = 0 и shardPackPurchases,
cardPackPurchases пусты; иначе — прогресс; не разобралось — прогресс.

## Security and privacy

Новых данных нет.

## Technical debt

Ключи других языков изучения (targetKey) правилом не покрыты — наблюдался только английский; при сомнении — прогресс.

## Verification

Точечные тесты матрицы/классификатора через светофор; повтор №9 на эмуляторе.

## Rollback

`git revert <hash>`.
