# Task packet: эталон «Обучения» способ 2 под замок и экзамен главы на способе 2

Governance-ID: TG-CE3503E498D0
Status: In progress
Owner: сессия «3 · МАКЕТЫ»
Related epic/enabler: выбор владельца 21.10 ~22:10 через координатора: «Обучение» — способ 2 «Сезон и карусель карт» («ХОЧУ!»); решения по экзамену в реестре (12 вопросов, сдать от 10, пересдача через час, Free 1 энергия, Plus бесплатно)

## Outcome

(1) course-hybrid-1-4.html (раздел «Способ 2 · Сезон и карусель карт») зафиксирован эталоном: строка в docs/design/v2-app/APPROVED_2026-10-21_LOCKED.md, хэш в approved-2026-10-21.lock.json через scripts/approved_2026_10_21_lock_update.mjs, сторож tests/approved_2026_10_21_locked.test.mjs зелёный. (2) Новая страница docs/design/v2-app/chapter-exam-season.html: экзамен главы и тест-распределение «Не хочу с начала», переложенные на способ 2 (экзамен — последняя карта карусели), по решениям реестра; основа chapter-exam-flow.html (c94511870).

## Scope

In scope: строка в APPROVED-записке, список файлов в скрипте пересчёта, пересчитанный lock.json; новая страница экзамена; эта записка.

Out of scope: код приложения, сами экраны course-hybrid-1-4.html (не меняются), прочие замки.

## Architecture

No architecture change: замок — тот же образец (SHA-256 + node:test); страница экзамена собирается генератором из деталей курса (concepts.css/js, hybrid) и стилей chapter-exam-flow.

## Security and privacy

Учебные тексты и вымышленный прогресс; новых данных нет.

## Technical debt

- Accept temporarily: награда за экзамен и «~7 минут» — примеры из прежних макетов; точные числа даст код.

## Verification

node --test tests/approved_2026_10_21_locked.test.mjs — 4/4; страница экзамена проверена безоконным браузером в обеих темах, классы сверены с kit.css (.dim, .ph).

## Rollback

git revert коммитов замка и страницы.
