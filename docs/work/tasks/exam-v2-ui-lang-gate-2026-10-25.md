# Task packet: экзамен главы v2 — только для языков интерфейса с текстами курса (ru/uk)

Governance-ID: TG-E48AD35B3659
Status: In progress
Owner: Learning V2 session; 🔴 координатора 25.10 — у экрана экзамена v2 тексты только ru/uk

## Outcome

На языке интерфейса без текстов курса (es, pt-BR, tr, pl, vi, id, en) экзамен главы не открывается — ни v2, ни прежний: уводит на
Главную, как весь курс V2 (D129/locale gate). Раньше это держал общий выключатель курса, но пока язык интерфейса не определён,
он пропускал вход; теперь язык (из LangContext, известен всегда) проверяется и в самом выборе экрана экзамена.

## Scope

app/learning-v2/chapter-exam.tsx (ChapterExamSwitch: проверка isLearningV2OpenForUiLangV1(lang)), тест.

## Architecture

Одно правило для всего V2: isLearningV2OpenForUiLangV1 (LEARNING_V2_EXPLANATION_UI_LANGS = ru, uk). Отказ — тот же Redirect на
LEARNING_V2_HIDDEN_REDIRECT с записью в журнал.

## Security and privacy

Только навигация; данных и сети нет.

## Technical debt

Если курс V2 откроют для других языков интерфейса, понадобятся ключи chapter_exam_v2_copy на все 9 языков (Переводчик).

## Verification

Тест: es — закрыто, ru/uk — открыто; маршрут экзамена проверяет язык до выбора v2/прежнего.

## Rollback

Revert коммита.
