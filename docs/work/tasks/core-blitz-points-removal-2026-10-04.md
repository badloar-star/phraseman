# Task packet: Блиц без очков и комбо — считаем только монеты

Governance-ID: TG-02FC10309D27
Status: Done — блиц без очков/комбо/рекорда, монеты те же (тест fc_blitz_coins_unchanged)
Owner: сессия 1 · ЯДРО (по задаче владельца через координатора, 04.10)
Related epic/enabler: PhraseMan 2.0 упрощение

## Outcome

Владелец: «ОЧКИ ИЗ БЛИЦА УБИРАЙ ВООБЩЕ, ТОЛЬКО МОНЕТЫ СЧИТАЕМ». В режиме Блиц нет счёта,
комбо-множителя, рекорда, комбо-звуков. Монеты за Блиц начисляются ровно как раньше
(3 за карточку впервые, 1 за повтор, без бонуса серии). Мера успеха: тест «за ту же игру
монет столько же» зелёный; в коде Блица нет score/combo/best.

## Scope

In scope: app/flashcards/blitz_logic.ts (редьюсер без очков/серии),
app/flashcards/blitz_record.ts (удалить), логика app/flashcards_blitz_session.tsx
(счёт, рекорд, анимации комбо/«+N», комбо-звук и комбо-вибрация),
app/flashcards/SoundService.ts (combo_x* и comboSfxForStreak, если больше нигде),
тесты fc_blitz, fc_blitz_record, flashcards_blitz_access_behavior, sound_service.

Out of scope: вид экрана Блица (сессия 2), начисление монет (usePracticeRunes,
practice_rune_*), серверная выдача монет, лидерборд/достижения (очков Блица там нет).

## Architecture

Сейчас: applyBlitzAnswer считает score/streak/comboHit; экран анимирует счёт и комбо,
сохраняет рекорд в AsyncStorage fc_blitz_best_v1. Монеты идут отдельной веткой
practiceRunes.onCorrectAnswer(cardId) — от очков не зависят. Станет: редьюсер ведёт
только lives/correct/wrong; монетная ветка не меняется.

## Security and privacy

Нет новых данных. Удаляется локальный ключ рекорда (только на устройстве, не уходит
в сеть). Политика конфиденциальности не затрагивается.

## Technical debt

- Contain: старый ключ fc_blitz_best_v1 остаётся сиротой на устройствах (байты);
  чистка — по слову координатора. Exit: при следующей ревизии локальных ключей.
- Pay now: мёртвые комбо-звуки и стили удаляются вместе с логикой.

## Verification

- npm run test:one -- tests/fc_blitz.test.ts tests/flashcards_blitz_access_behavior.test.ts
  tests/sound_service.test.ts + новый тест равенства монет.
- tsc по затронутым файлам.
- grep: score/combo/best/comboSfx в Блице — пусто.

## Rollback

git revert коммита. Данные пользователей не меняются (монеты начисляются тем же путём),
откат безопасен.
