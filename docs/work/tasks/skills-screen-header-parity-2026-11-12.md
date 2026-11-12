# Экран «Навыки»: шапка как в макете (12.11)

Governance-ID: TG-ED939BF83AEF

## Outcome

Шапка экрана «Навыки» = макет `elevate-skills.js:20` (обновлён `a63ef41bc` по решениям владельца 11.11):
`top({ back: true, mid: '<div class="ttl">Навыки</div>', right: '<span class="gpill">Всего N</span>' })` —
заголовок слева сразу за кнопкой «назад» (`.top .ttl`: 20 px, 700, flex 1), справа плашка «Всего N», N — сумма уровней
всех навыков. Было: заголовок по центру 17/700, справа пустое место.

## Scope

`app/skills.tsx` (только шапка). Данные, расчёты и остальной экран не меняются.

## Architecture

N считается из тех же очков, что строки экрана (`skillProgressFromPoints`), — первый кадр из памяти, без сети.

## Security and privacy

Данные не меняются.

## Technical debt

Нет.

## Verification

Проверка типов файла, тесты навыков, снимок на эмуляторе рядом с макетом.

## Rollback

`git revert` коммита.

## Сверка (12.11, 03:35)

Снимок: `docs/phraseman-2.0/evidence/parity/elevate-skills-header-check_2026-11-12.png` — «Навыки» слева за кнопкой, справа «Всего 1».
Проверки: типы 0, тесты skills_core 18, skills_exam_theory_wiring 5, profile_card_skill_accent 1, game_quiz_core 9, layout_stability 16 — passed.

## Дополнение: шапка «Разминки» (12.11)

Макет `elevate-mechanics.app.js:36`: `<div class="top">…back…<div class="ttl">Разминка</div><span class="gpill">монеты</span>` —
заголовок слева за кнопкой (`.top .ttl` 20/700, flex 1). В приложении стоял по центру 17/700 (снимок 03:36). Поправлено так же,
как у «Навыков». Файл: `app/warmup.tsx` (только стиль заголовка).
