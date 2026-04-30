# Localization Audit (UK) — 2026-04-27

## Scope

- Goal: remove RU text leaks in Ukrainian UI and fix the "Сообщить о проблеме" issue.
- Areas checked: shared components (`components/*`) and app screens (`app/*`) with report UI and modal actions.
- Primary user-reported cases: lesson flow and phrase builder screens.

## Fixes Applied

- `components/ReportErrorButton.tsx`
  - Fully localized report entry + modal copy for `ru/uk`.
  - Localized category labels for all screen types used by the report flow.
  - Localized accessibility label fallback.
  - Added safer trigger text rendering (`numberOfLines`, ellipsis, shrink) to prevent visual overflow/"floating" text.
- `app/lesson_words.tsx`
  - Normalized Ukrainian cancel label: `Відміна` -> `Скасувати`.
- `app/community_pack_create.tsx`
  - RU grammar typo fix in confirmation text: `из продажа` -> `из продажи`.

## Coverage Checklist (ReportErrorButton Consumers)

- [x] `app/lesson1.tsx`
- [x] `app/diagnostic_test.tsx`
- [x] `app/quizzes.tsx`
- [x] `app/exam.tsx`
- [x] `app/dialogs.tsx`
- [x] `app/lesson_words.tsx`
- [x] `app/help_faq.tsx`
- [x] `app/lesson_irregular_verbs.tsx`
- [x] `app/lesson_help.tsx`
- [x] `app/flashcards_collection.tsx`
- [x] `app/flashcards/FlashcardDetailsBody.tsx`
- [x] `app/review.tsx`

## Validation Notes

- Searched for key leak phrases across `app` and `components`:
  - `Сообщить о проблеме`
  - `Отправить` / `Отправка`
  - `Комментарий`
  - `Отмена` / `Відміна`
- Confirmed no remaining `Відміна` entries.
- Remaining RU hits are expected in:
  - explicit RU branches (`isUK ? uk : ru`),
  - content datasets (`messageRu`, `topic/topicUK`, vocabulary data),
  - identical words valid in both locales (`Готово`, `Тема`, `Контекст`).

## Residual Risk

- Some screens still use inline `isUK ? ... : ...` strings instead of centralized i18n keys; this is maintainable short-term but increases drift risk.
- Recommended next step: migrate high-traffic UI copy to a shared dictionary (e.g. `LangContext` string groups), then enforce via lint rule/check script.

## Outcome

- User-reported bug fixed.
- Ukrainian localization coverage for report UI stabilized across all known entry points.
- No lint errors on changed files during this pass.
