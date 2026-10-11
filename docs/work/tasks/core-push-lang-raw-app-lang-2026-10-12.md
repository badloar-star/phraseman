# Task packet: язык серверных пушей и напоминаний берётся из сырого app_lang (диагностика)

Governance-ID: TG-F2E5C095C230
Status: In progress (логи; правка — после «да» координатора)
Owner: сессия «1 · Ядро» (координатор 12.10, после bc4b295ca).

## Outcome
Сервер шлёт пуши Шпиля по `users.pushTokenLang`. Его пишет `registerPushTokenForServerPush(lang)`; на каждом запуске
`app/_layout.tsx` (runSessionChecks) считает `lang` из сырого `app_lang`: `uk → uk`, `es → es`, ИНАЧЕ `ru`. Значит:
у pt-BR/vi/id/tr/pl (выбранных или по устройству) и у uk-устройства без ручного выбора на сервер уходит `ru`, и этим же
языком перепланируются локальные напоминания. Сначала логи [PUSH-LANG], правка — после подтверждения.

## Scope
In: `app/_layout.tsx` (одна строка лога), `app/push_token_registration.ts` (лог записи языка).
Out: сервер, тексты пушей.

## Architecture
Только наблюдение: что лежит в app_lang, какой язык интерфейса фактически, какой ушёл на сервер, был ли кэш-пропуск.

## Security and privacy
В лог — только коды языков, без токена и uid.

## Technical debt
Правка выбора языка (фактический язык интерфейса) — следующим шагом.

## Verification
babel_check; лог виден в Metro при холодном старте с включёнными уведомлениями.

## Rollback
`git revert`.
