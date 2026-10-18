# Task packet: БЛОКЕР ВЫПУСКА — вход Apple после конфликта привязки и запертый вход всех провайдеров

Governance-ID: TG-DE1E4260E085
Status: В работе (координатор 18.10 09:18, диагноз по журналу iPhone владельца подтверждён)
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Гость с существующим Apple/Google-аккаунтом входит с первого раза. Если вход в ветке передачи всё же не удался,
следующая попытка не запирается до перезапуска приложения.

## Факты (журнал .expo/metro-console.log, 08:41–08:48)

- Apple: link гостя → auth/email-already-in-use → ветка передачи → signInWithCredential ТЕМ ЖЕ Apple-credential →
  auth/unknown (08:41:39, 08:47:45). У Apple id_token с nonce одноразовый — он израсходован неудачной привязкой.
- RNFirebase на iOS кладёт обновлённый credential в ошибку: `linkErr.userInfo.authCredential`
  (FIRAuthErrorUserInfoUpdatedCredentialKey, RNFBAuthModule.m:1560) — им и нужно входить.
- После провала запись account_provider_handoff_v1 оставалась — каждый следующий вход любого провайдера падал на
  prepareProviderCredentialHandoff: provider_handoff_active до перезапуска.

## Scope

- app/auth_provider.ts, ветка конфликта привязки: взять `linkErr.userInfo.authCredential`, если есть, и входить им;
  журнал [AUTH-HANDOFF] updated_credential provider= present=.
- app/auth_provider.ts, catch входа: провал ДО фазы authenticated (Firebase-сессия не сменилась) — снять запись
  передачи и вернуть поколение гостя, как в ранней ветке account_switch_required; журнал [AUTH-HANDOFF] cleared|kept.
- Тест-контракт.

## Architecture

Обе правки внутри существующей ветки передачи; порядок защиты прогресса гостя (link → проверка чистоты → передача)
не меняется.

## Security and privacy

Токены не логируются — только наличие обновлённого credential и коды.

## Technical debt

Возобновление после «Сменить аккаунт» хранит исходный Apple-credential (уже израсходованный); после смены человек
жмёт Apple заново — теперь это работает через обновлённый credential. Отдельно — после релиза.

## Verification

Адресные тесты входа через светофор; живая проверка — владелец на iPhone (координатор).

## Rollback

`git revert <hash>`.
