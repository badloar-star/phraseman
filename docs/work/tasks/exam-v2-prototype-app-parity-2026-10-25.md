# Task packet: прототип экзамена v2 — отличия от экрана приложения e3bf67ebd для склейки Сверки

Governance-ID: TG-B2B35924FDAE
Status: In progress
Owner: 3 · МАКЕТЫ (заказ координатора 25.10)
Related epic/enabler: docs/work/exam-workshop-theme-token-map-2026-10-25.md (4 · ТЕМЫ)

## Outcome

Learning V2 25.10 (экран экзамена e3bf67ebd, банк bec35cd02): чтобы склейка Сверки «прототип | приложение» сошлась, прототип
повторяет приложение: подложка плашки вердикта goodSoft / badSoft, значок 18 dp; микрофон — ctaFill + значок ctaFillInk + тень плиты;
мини-обложка «Глава N открыта» — заливка accent, значок accentInk, без градиента; подвалы — opaqueSheet; тени — тень плиты темы.

## Scope

In scope: docs/design/v2-app/chapter-exam-v2-prototype.html (+ артефакт PYJfpbH1Upz9KCLngxVyG9), этот пакет.
Out of scope: код приложения, карта Тем.

## Architecture

No architecture change. Значения токенов сняты liquidGlassTokens (npx tsx): экзамен — ink · светлая · max (как снимок exam_v2);
Мастерская — polar · тёмная · max (ближайшая к старому снимку 18.10; точной темы нет — пересобрать на свежем кадре Сверки).

## Security and privacy

Макеты, данных нет.

## Technical debt

- Accept temporarily: тема кадров Мастерской подобрана по близости цвета (снимок 18.10, палитра с тех пор менялась).

## Verification

Прогон прототипа (сдал / не сдал / повтор) без ошибок; цвета в DOM = токены; кадры Мастерской пересобраны.

## Rollback

git revert коммита — только макеты.
