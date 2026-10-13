# Логи в релизе R1: что видно и как сделать видимыми причины (Ядро, 13.10)

Исследование по коду на HEAD, по заданию координатора после находки Авторизации (768b66ceb). **Кода не меняли.**

## Короткий ответ

1. **В журнал обращения в поддержку не попадает ни `console.*`, ни журнал отладки.** Туда идут только явные вызовы
   `recordSupportDiagnostic(...)`: структурные события из фиксированного списка — переход на экран, смена состояния
   приложения, действие фичи, обращение. Причины из `catch` и ранних выходов туда не доходят **ни в релизе, ни в dev**.
2. Сейчас причина отказа из денежного или аккаунтного потока доходит до команды только через **Crashlytics**,
   и то лишь если в этом месте стоит `DebugLogger.error` / `logAppError`. `console.warn` в релизе пишет только в системный журнал
   самого телефона: у пользователя его не прочитать.
3. **Минимальный путь:** один помощник `releaseReason(область, код, итог)`, который кладёт **код** причины в уже существующий
   журнал обращения: без текста, без идентификаторов, под той же схемой и политикой §10. Дальше — точечно
   ≈ 30 мест в 12 файлах, около 2–3 часов работы, без массовых правок.

## 1. Каналы в релизе — факты

| Канал | Что туда пишет | Видно в релизе? | Где |
|---|---|---|---|
| `console.log` / `info` / `debug` | всё «что происходит» | **нет** — вырезается при сборке | `babel.config.js`: `transform-remove-console`, `exclude: ['warn', 'error']` |
| `console.warn` / `console.error` | причины, часть трасс | только в системном журнале телефона (logcat / консоль Xcode) — у пользователя недоступно | там же |
| `DebugLogger.info` / `DebugLogger.warn` | трассы `[PAYWALL]`, `[LESSON-RESULT-SAVE]` и др. | **нет**: пишет только при `isDevRuntime` и никуда не сохраняет | `app/debug-logger.ts:320-330` |
| `DebugLogger.error` | ошибки | ① в `debug_logs_v1` на телефоне — **этот ключ никто не читает** (читатели есть только внутри `debug-logger.ts`); ② `logAppError` → **Crashlytics** (не фатальная ошибка, повтор того же отпечатка — не чаще порога); ③ `app_errors` в Firestore — только при `critical` | `app/debug-logger.ts:296-317`, `app/app_health.ts:137-185` |
| `reportSwallowed` / `swallowError` / `noteSwallowed*` | проглоченные ошибки | `console.warn` (телефон) + `debug_logs_v1` (никто не читает). **В Crashlytics не идут** | `app/debug-logger.ts:257-293` |
| Журнал обращения `support_diagnostics_v1` | только `recordSupportDiagnostic` из `app/app_activity.ts:34-55` (навигация, состояние, `feature_action`) и `app/support_report_outbox.ts` | **да** — прикладывается к обращению (≤ 200 событий, 24 ч, ≤ 64 КБ) | `app/support_diagnostics.ts:18-21,143`; схема `app/support_diagnostic_schema.ts` |

**Вывод:** «вечные» логи в `catch` и на ранних выходах, написанные через `console.log` или `DebugLogger.info/warn`,
в релизе мертвы. Через `console.warn` и `reportSwallowed` они живы только на телефоне разработчика.

## 2. Схема журнала обращения — почему это безопасный канал

`sanitizeSupportDiagnosticEvent` пропускает:
- `event` — из списка: `navigation`, `app_state`, `support_report`, `customization_*`, `account_delete`, `auth_transition`, `feature_action`;
- `result` — из списка: `start`, `success`, `blocked`, `error`, `info`;
- `reason` — из списка из 12 кодов;
- `action` — `^[a-zA-Z][a-zA-Z0-9_.:-]{0,79}$`, **отбрасывает** куски длиной 20+ символов и UUID (`support_diagnostic_schema.ts:75-84`).

Свободный текст, email, имя, uid и токены туда физически не проходят. Поток уже описан в политике (§10 Support diagnostics) —
нового сбора данных не появляется.

## 3. Минимальный безопасный путь

### Шаг 1. Помощник (Ядро, ≈ 30 мин + тест)

`app/release_reason.ts`:

```ts
// releaseReason('purchase', 'rc_cancelled', 'blocked')
export function releaseReason(area: ReleaseArea, code: string, result: 'blocked' | 'error' | 'info' = 'blocked'): void
```

- `area` — закрытый список: `purchase`, `restore_purchase`, `auth`, `account_switch`, `account_restore`, `account_delete`, `energy`.
- Пишет `recordSupportDiagnostic({ event: 'feature_action', action: \`${area}:${code}\`, result, subject: 'app' })`.
  Код проходит ту же схему: длинное или похожее на идентификатор отбрасывается.
- В dev дополнительно `console.log` с тем же текстом (не `warn` — без LogBox).
- **Не** `console.warn`, **не** Firestore, **не** новый ключ хранилища. Дёшево: событие кладётся в память, на диск пачкой раз в 30 с
  (`app/support_diagnostics_flush.ts`).
- Для `result: 'error'` — ещё и хлебная крошка в Crashlytics, чтобы рядом с падением было видно, что ему предшествовало.
  Готовой обёртки нет: в `app/firebase.ts:99` только `recordError`. Нужна новая `crashlyticsBreadcrumb(action)` через
  `getCrashlytics()?.log(...)`. Необязательно, можно вторым шагом.
- Тест: код с uid или email отбрасывается схемой; `area` вне списка — ошибка типа; в dev одна строка в консоли.

### Шаг 2. Точечный перевод — только ранние выходы и `catch`, НЕ трассы шагов

| Поток | Файлы | Сколько мест (оценка) | Пример кода причины |
|---|---|---|---|
| Покупка Plus | `app/paywall_purchase.ts`, `app/premium_modal.tsx`, `app/paywall_navigation.ts` | ≈ 8 | `purchase:rc_cancelled`, `purchase:pending`, `purchase:offering_missing`, `purchase:entitlement_not_active` |
| Восстановление покупок | `app/paywall_purchase.ts` (restore), `app/manage_subscription.tsx` | ≈ 3 | `restore_purchase:empty`, `restore_purchase:failed` |
| Вход, смена аккаунта | `components/CleanOnboarding.tsx`, `components/RegistrationPromptModal.tsx`, `app/onboarding_account_switch_confirm.ts`, `app/auth_provider.ts` | ≈ 8 | `auth:google_cancelled`, `account_switch:declined`, `account_switch:credential_in_use` |
| Восстановление удалённого аккаунта | `app/account_delete_restore_prompt.ts` | ≈ 3 | `account_restore:declined_back`, `account_restore:failed` |
| Удаление аккаунта | `components/DeleteAccountConfirmModal.tsx`, `app/account_delete_quarantine.ts` | ≈ 4 | `account_delete:reauth_required`, `account_delete:server_rejected` |
| Списание энергии | `hooks/useFirstQuestionEnergyGate.ts`, `components/EnergyContext.tsx`, `app/lesson1.tsx` | ≈ 4 | `energy:insufficient`, `energy:not_ready`, `energy:charge_failed` |
| **Итого** | **12 файлов** | **≈ 30** | |

Существующие `console.*` строки **остаются** как есть: они нужны в dev и в журнале бандлера. Помощник **добавляется рядом**,
одной строкой в каждой ветке отказа. Никаких массовых замен.

Сейчас в этих потоках: `console.log` с метками `[PURCHASE]`, `[PAYWALL]`, `[ACCOUNT-RESTORE]`, `[AUTH-SWITCH-OFFER]`, `[ONBOARDING-AUTH]`,
`[ENERGY-GATE]`, `[ACCOUNT-DELETE]` — ≈ 72 вызова (все вырезаются в релизе), `console.warn` — ≈ 50. Большинство — трассы шагов,
в журнал обращения из них стоит переносить только ≈ 30 веток с причиной отказа.

### Шаг 3. Проверка

- Робот или Сверка в стор-сборке: провалить покупку (тестовый отказ), закрыть окно входа, получить «нет энергии» →
  открыть «Сообщить о проблеме» → в приложенном журнале видны `purchase:…`, `auth:…`, `energy:…`.
- Сторож: `releaseReason` вызывается в каждом из перечисленных файлов; запрет `console.warn` для причин в этих файлах
  не вводим (это массовая правка).

## 4. Оценка и порядок

| Шаг | Кто | Время | Риск |
|---|---|---|---|
| 1. Помощник + тест | Ядро | 30–40 мин | низкий: новый файл, поверх готовой схемы |
| 2. Покупка, восстановление покупок, энергия | Ядро + Авторизация (покупка) | ≈ 1 ч | низкий: одна строка в ветке, поведение не меняется |
| 2. Вход, смена, восстановление и удаление аккаунта | Авторизация | ≈ 1 ч | низкий; файлы Авторизации — правит она |
| 3. Проверка в стор-сборке | Сверка | 20 мин | — |

Коммиты кода — в окна :00–:05 и :30–:35. До сборки 16.10 успевается. Если времени нет — шаги 1–2 только для покупки и энергии
(деньги), остальное — после R1.

## 5. Попутно (не блокирует)

- `debug_logs_v1` пишется (до 160 записей со стеками), но никем не читается: ни экраном, ни обращением.
  Либо подключить к обращению (тогда нужна маскировка `DebugLogger.error` — сейчас там сырой текст ошибки и стек, `debug-logger.ts:297-312`),
  либо перестать писать (экономия записи на каждую ошибку). Решать после R1.
- `reportSwallowed` не уходит в Crashlytics: проглоченные ошибки в релизе невидимы совсем. Подключать не стоит
  (шум и квоты), лучше коды причин через `releaseReason` там, где они важны.
