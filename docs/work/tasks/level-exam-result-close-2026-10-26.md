# Task packet: ✕ на итоге экзамена уровня (эталон learn.html K6–K7)

Governance-ID: TG-2FDA3F852587
Status: In progress
Owner: Learning V2 session; таблица эталонов «назад» Макетов 988d643cd, задача координатора 26.10

## Outcome

На итоге экзамена уровня (LevelExamResult) слева сверху общий ✕, как на эталоне K6–K7: выход к урокам (safeRouterBack, запасной
/lessons_list). Раньше на итоге не было ни «назад», ни ✕ — только кнопка внизу.

## Scope

components/level-exam/LevelExamResult.tsx (необязательный onClose, SafeTopCloseButton + полоса ScreenBackZone до прокрутки),
components/level-exam/LevelExamV2.tsx (передаёт onClose). Тест-сторож. Обратный отсчёт не трогаю — его места в таблице нет.

## Architecture

Общий ScreenCloseButton-вариант SafeTopCloseButton — то же место и круг, что у «назад»; Android-«назад» зовёт тот же обработчик
(внутри компонента). Без onClose — прежний вид.

## Security and privacy

Нет данных.

## Technical debt

Кадр Сверки итога K6–K7 после правки (сдвиг контента на полосу кнопки).

## Verification

tests/level_exam_result_close_2026_10_26.test.ts; кадр Сверки.

## Rollback

Revert коммита.
