# Task packet: прототип экзамена v2 и «Мастерская фраз» — 4 замены цветов по карте Тем

Governance-ID: TG-496B21BEF461
Status: In progress
Owner: 3 · МАКЕТЫ (заказ координатора 25.10)
Related epic/enabler: docs/work/exam-workshop-theme-token-map-2026-10-25.md (4 · ТЕМЫ)

## Outcome

Координатор 25.10: внести 4 замены ради контраста из карты Тем, чтобы склейка «макет | эмулятор» сходилась:
полоса/курсор/точки → accentGraphic; «Верно/Неверно» — текст цветом text жирным, цвет на значке ✓/✕ (good/bad);
подсветка ошибки — text на badSoft; неактивная кнопка — buttonFillDisabled/buttonInkDisabled (не прозрачность).
Мастерская — вход по W1–W5: accentText на accentSoft (Plus и замок), «фраз мало» — secondary/iconMuted на opaqueControl.

## Scope

In scope: chapter-exam-v2-prototype.html (+ артефакт PYJfpbH1Upz9KCLngxVyG9), phrase-workshop-real.html (+ Mgiat3h327LrNzinagLX87), пакет.
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
