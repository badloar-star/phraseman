# Task packet: тексты под правило «открыт только первый эпизод», окно экзамена, цель занятия

Governance-ID: TG-FA7DE990BDE3
Governance-ID: TG-B2ED2286C9EF
Status: In progress
Owner: Learning V2 session; решения координатора и владельца 25.10

## Outcome

- Подпись под каруселью после сдачи: «Начнём с эпизода {a}»; итог экзамена: «{сцена}. Начнём с эпизода {a}» (a — точка старта);
  итог теста: «Начнём с урока {n}», «Темы уроков {range} ты уже знаешь.», строки «знаешь»; без «· 12 вопросов, сдать от 10».
- Окно экзамена «сдан/пауза» (макет exam-window-real.html, вид — Дизайн): ключи examWinPassed, examWinScore, examWinAttempt.
- Окно занятия: заголовок «Чему научишься», служебная цель фабрики заменяется названием сцены (вариант A владельца).

## Scope

season_copy_card.ts, season_exam_caption.ts, learning_v2_chapter_exam_result_copy.ts, placement_copy.ts, learning_v2_chapter_exam_v1
(startSessionId), app/learning-v2/chapter-exam.tsx (одна строка), app/learning_v2_outcome_display_v1.ts (новый), lessons.tsx (вызов),
сторожа. Out of scope: вид окна экзамена (Дизайн), переписывание целей (фабрика).

## Architecture

Только тексты и выбор строки показа; данные прогресса не меняются.

## Security and privacy

Новых данных, разрешений и сторонних сервисов нет: меняются только тексты интерфейса и выбор строки из уже встроенного контента;
сети и Firestore не касается.

## Technical debt

Contain: служебные цели прячутся на показе, пока фабрика не перепишет (спецификация в factory-spec-exam-bank-and-outcomes).

## Verification

Тесты подписей, итогов, показа цели; typecheck.

## Rollback

Revert коммита.
