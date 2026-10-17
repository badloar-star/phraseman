# Task packet: dev-параметр `seen=reset` / `seen=<окно>` — сброс «уже показано» для окон «один раз на аккаунт»

Governance-ID: TG-2462BAA0E815
Status: В работе (координатор 18.10 00:12, блокирует Сверку)
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Сверка снимает окна «один раз на аккаунт» без pm clear: ссылка dev_state `seen=reset` (все) или `seen=<окно>` удаляет
ровно ключи «уже показано» этих окон для текущего stableId. Только в dev-сборке.

## Scope

Новый app/dev_seen_reset.ts (чистая функция: окно → ключи; список ключей с привязкой к stableId) + шаг в
app/dev_state_fixtures.ts (параметр `seen`, шаг после общего гейта isDevStateAvailable), лог
`[DEV-STATE] seen reset {window, keys, removed}`. Окна и ключи:
- energy: energy_onboarding_shown
- welcome: welcome_back_shown_at_v1, winback_shown_at_v1
- plus: premium_celebration_seen_v1, vip_celebration_seen_v1, intro_full_access_welcome_seen_v1,
  intro_full_access_ended_seen_v1, after_win_upsell_last_shown_v1, streak_paywall_shown
- referral: referral_access_ended_seen_for_v1, referral_welcome_seen::<stableId>
- stories: story_events_v1:* (локальные; облако может вернуть при восстановлении — пишется в лог)
- team: локально сбрасывать нечего — «прочитано» подтверждается сервером (ack); ветка пишет это в лог и ничего не
  удаляет (снятие пола объявлений app_messages_modal_floor_v2 только заново поставит пол «сейчас»).

## Architecture

Шаг применяется внутри applyDevState, после `if (!isDevStateAvailable()) return` — в стор-сборке ссылка не доходит.

## Security and privacy

Только локальные ключи текущего устройства; сервер не трогаем.

## Technical debt

«Сообщение команды» локально не сбрасывается — нужен серверный dev-путь, если понадобится.

## Verification

tests/dev_seen_reset.test.ts: ключи по окнам; reset = все; ветка в applyDevState после гейта dev-сборки.

## Rollback

Обратный собственный патч.
