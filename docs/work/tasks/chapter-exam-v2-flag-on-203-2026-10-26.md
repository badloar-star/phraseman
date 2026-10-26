# Task packet: экзамен главы v2 включён в сборке 2.0.3 для глав 1–3 урока 1 (слово владельца)

Governance-ID: TG-8F6766822560
Status: In progress
Owner: Learning V2 session; слово владельца 26.10 через координатора

## Outcome

В сборке 2.0.3 по умолчанию: главы 1–3 урока 1 — новый экзамен v2 (банки 1:1, 1:2, 1:3), остальные главы — прежний экзамен.
Экзамен по-прежнему открывается только при языке интерфейса ru/uk (как весь курс V2); выключить можно из Пульта.

## Scope

app/remote_flags.ts — DEFAULT_FLAGS.learning_chapter_exam_v2_enabled = true с комментарием; тесты: по умолчанию v2 у глав 1–3, у главы
без банка — прежний, выключен из Пульта — прежний у всех; маршрут: v2 → ChapterExamV2Run, иначе ChapterExamRun.

## Architecture

isChapterExamV2EnabledFor = флаг (Пульт или значение по умолчанию) && есть банк главы. Гейт языка интерфейса стоит в маршруте раньше выбора.

## Security and privacy

Нет данных.

## Technical debt

Тексты экрана экзамена — ru/uk (экзамен открыт только для ru/uk интерфейса); склейка Сверки с макетом — после сборки.

## Verification

learning_v2_chapter_exam_v2_app, learning_v2_exam_chapter_credit_parity, chapter_exam_v2_ui_lang_gate, learning_v2_visibility_switch_contract,
dev-превью и «назад» экзамена; проверка типов приложения.

## Rollback

Выключить в Пульте или revert коммита.
