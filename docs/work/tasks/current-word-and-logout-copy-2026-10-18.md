# Task packet: метка «Текущий» (tr/vi) на экране «Все уроки» и тексты кнопки «Выйти» для Входа (координатор 18.10)

Governance-ID: TG-0E076AF97A2D
Status: In progress
Owner: сессия «Специалист по переводам»
Related epic/enabler: f95474baf (Дизайн, «Все уроки» по эталону 1.6); кнопка «Выйти» — сессия «Вход»

## Outcome

1. Метка текущего урока:
   - tr «Güncel» («актуальный, обновлённый») → «Şu anki»;
   - vi «Hiện tại» (читается как «настоящее время») → «Đang học».
2. Сессия «Вход» получает готовые тексты на 9 языках для кнопки «Выйти»: «Сохраняем прогресс…» и «Не удалось сохранить, попробуй ещё раз».

## Scope

In scope:
- `components/learning-v2/LearningV2AllLessonsList.tsx` — только vi и tr в строке «Текущий»;
- тексты для Входа сообщением; код вносит Вход.

Out of scope: вёрстка, логика.

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

Нет нового долга.

## Verification

- сторожа i18n;
- тест экрана «Все уроки», если он сверяет слово.

## Rollback

`git revert`.
