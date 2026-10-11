# Task packet: язык серверных пушей и локальных напоминаний = фактический язык интерфейса

Governance-ID: TG-F5490F05CEC7
Status: In progress
Owner: сессия «1 · Ядро» (координатор 12.10: «ДА на правку языка пушей»; диагностика 9e1532a38).

## Outcome
`app/_layout.tsx` (runSessionChecks) на каждом холодном старте считал язык из сырого `app_lang`: uk → uk, es → es,
иначе ru. Этим языком писался `users.pushTokenLang` (по нему сервер решает пуши Шпиля и язык всех серверных пушей)
и перепланировались локальные напоминания. Теперь: фактический язык интерфейса (`peekResolvedUiLang`) →
`coerceInterfaceLang(app_lang)` → язык устройства (`getDeviceBootstrapLocale`, en выключен → ru).

## Scope
In: новый `app/push_ui_lang.ts` (чистая функция выбора), `app/_layout.tsx` (одна строка выбора + лог),
`tests/push_ui_lang.test.ts`, `tests/app_events_overlay_registry.test.ts` (регистрация слушателя Шпиля — отдельный
пункт координатора). Out: сервер, тексты пушей, `notifications.ts`.

## Architecture
Чистая функция `resolvePushUiLang({ resolvedUiLang, storedAppLang, deviceLang })` → `{ lang, source }`. Тем же `lang`
идут регистрация токена и локальные напоминания. Запись `pushTokenLang` — прежний кэш пары stableId/токен/язык/пояс.

## Security and privacy
Поле `pushTokenLang` уже существует и описано; новых данных нет. В логах только коды языков.

## Technical debt
Тексты локальных напоминаний без перевода на язык человека по-прежнему падают в ru внутри notifications.ts — вне задачи.

## Verification
Тест: uk без ручного выбора → uk; pt-BR → pt-BR; ru → ru; en-телефон → язык интерфейса (ru), не en; повторный
старт с тем же языком → записи нет (cacheHit); сторож событий; срез типов.

## Rollback
`git revert`.
