# Task packet: пуши «вернись» доходят до Америки и UTC+12+ (тихие часы по поясу, два прогона)

Governance-ID: TG-3B51D9870B08
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: PM-252 замечание 2 (35458ea11); решение координатора 13.10 «чиним сейчас, Америка — крупный рынок»

## Outcome

Человек в любом поясе от UTC−12 до UTC+14 получает «серия под угрозой» / «вернись» днём по своему времени (09:00–22:00).
Сейчас крон раз в сутки в 10:00 UTC — это ночь для всей Америки и для UTC+12+, им пуш не приходит никогда.
Выкладка — вместе со всем сервером 17.10; сейчас только код и коммит.

## Scope

In scope: `functions/src/re_engage_push.ts` (пояс человека с запасным вариантом, причина пропуска, журнал [REENGAGE-TZ]),
`functions/src/index.ts` (расписание `0 10,22 * * *` UTC), `functions/src/re_engage_push.test.ts`.
Out of scope: тексты пушей, окна отбора (3–14 / 15–30 дней, серия 20–24 ч), клиентская запись пояса.

## Architecture

Пояс — уже сохраняемый клиентом `users.pushTokenTimezone` (`Intl…timeZone || 'UTC'`, `app/push_token_registration.ts`).
Запасной вариант, если пояса нет, он невалиден или это `UTC` (клиент пишет `UTC`, когда пояс не определился): пояс по языку
пушей (`pushTokenLang`: ru → Europe/Moscow, uk → Europe/Kyiv, pl → Europe/Warsaw, tr → Europe/Istanbul, vi → Asia/Ho_Chi_Minh,
id → Asia/Jakarta, pt-BR → America/Sao_Paulo); en/es неоднозначны → UTC. Два прогона в сутки: 10:00 UTC покрывает UTC−1…+11,
22:00 UTC — UTC−13…−1 и UTC+11…+14; пересечение защищено cooldown 2 дня. Тесты перебирают все смещения.

## Security and privacy

Журнал [REENGAGE-TZ] — только счётчики по группам (причина, источник пояса, пояс, местный час), без uid, токенов и имён.

## Technical debt

Contain: второй прогон удваивает чтения users с токеном (один скан на прогон). Выход: поле-индекс «смещение пояса» и where по
нужным смещениям — после R1, если стоимость заметна (оценка — в отчёте координатору).

## Verification

`npm run test:one`-аналог для functions: `re_engage_push.test.ts` через run_wait (fn); проверка покрытия всех смещений UTC−12…+14
(в т.ч. +5:30, +12:45, −3:30) хотя бы одним прогоном днём; tsc functions по слоту.

## Rollback

Вернуть расписание `0 10 * * *` и прежний `classifyReEngageUser` (git revert коммита); данные не меняются.
