# Task packet: learn-014 — пилюля пейвола «Урок N закрыт» показывала не тот урок

Governance-ID: TG-9CB05C432821
Governance-ID: TG-F83F727E805C
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по запросу координатора (Макеты, learn-014 / A13)
Related epic/enabler: f7bdeb251 (утверждённые тексты окна Plus, пилюля «что закончилось»), paywall-context-texts.md

## Outcome

1. Ответ по A13: полный пейвол «Дальше — в Plus» с тарифами при тапе по закрытому уроку — ОСОЗНАННОЕ решение (тап ведёт сразу на пейвол без промежуточной шторки — комментарий в app/(tabs)/lessons.tsx, история с 20.06.2026; контекстные тексты и пилюля утверждены владельцем 11.10, f7bdeb251; образец — paywall-context-redesign.html). Шторка A13 «Урок 4 входит в Plus» в коде никогда не была отдельным окном → Макетам перерисовать A13 по контекстному пейволу.
2. Найденный дефект: список уроков передавал в пейвол `lessons_done = число пройденных`, а пилюля читает «закрытый урок = lessons_done + 1» → при тапе по уроку 4 у человека с 0 пройденных пилюля «Урок 1 закрыт». Исправление: `lessons_done = номер тапнутого урока − 1` (как в lesson_premium_gate и lesson_menu).

## Scope

In scope: app/(tabs)/lessons.tsx — `openLessonPaywall` (один параметр), контракт-тест.

Out of scope: сам пейвол и тексты, лимит бесплатных уроков (деньги, не меняю), шторка A13 как новое окно.

## Architecture

No architecture change: параметр маршрута `lessons_done` потребляет только `paywallEntryFactsFromParams` (пилюля); аналитика `logCoursePaywallAfterLesson3` его не читает.

## Security and privacy

Не затрагивает данные и права.

## Technical debt

Pay now: три места передавали `lessons_done` по-разному (счёт пройденных против номера−1).

## Verification

Контракт-тест на строку; журнал/кадр learn-014 после пересъёмки (пилюля «Урок N закрыт» совпадает с тапнутым).

## Rollback

git revert коммита.
