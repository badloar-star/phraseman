# Task packet: контракты «остановка занятия» — предикат isAttemptsStopEffect вместо прямого сравнения

Governance-ID: TG-E7EC78D6E1B9
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по команде координатора 13.10 (Авторизация 787f9e1ee)

## Outcome

Пять устаревших контрактов `fc_speaking`, `fc_swipe`, `irregular_verbs`, `lesson_session`, `lesson_words` `_attempts_integration` ждут `attemptEffect === 'attempts_exhausted'`, а экраны после 750314a24 идут через `isAttemptsStopEffect(…)` (`attempts_exhausted` ИЛИ `energy_exhausted`). Тесты обновляются на предикат БЕЗ ослабления, и по коду каждого экрана подтверждается, что при `energy_exhausted` занятие действительно останавливается (деньги: нельзя продолжать бесплатно без энергии).

## Scope

In scope: пять файлов `tests/*_attempts_integration.test.*`; чтение кода экранов (`app/flashcards_speaking*`, `flashcards_swipe`, `lesson_irregular_verbs`, `lesson1`/сессии уроков, `lesson_words`) без правок. Если по коду остановки нет — не чиню молча, а сообщаю координатору (экран, строка, что происходит) и ставлю красный контракт.

Out of scope: логика энергии, сам предикат, экраны (кодовый коммит — только в окна).

## Architecture

Контракт проверяет, что экран (а) использует общий предикат `isAttemptsStopEffect` на эффекте регистрации вердикта и (б) в ветке остановки зовёт ту же паузу/остановку, что прежде была для `attempts_exhausted`. Тест фиксирует обе части, а не только строку предиката.

## Security and privacy

Данные не затрагиваются. Это защита от бесплатного продолжения без энергии.

## Technical debt

Contain: контракты читают исходники по строкам; общий хелпер проверки «экран останавливается по предикату» убрал бы повтор в пяти файлах — после R1.

## Verification

`npm run test:one` по пяти файлам и по соседним контрактам энергии; чтение кода каждого экрана.

## Rollback

git revert коммита.
