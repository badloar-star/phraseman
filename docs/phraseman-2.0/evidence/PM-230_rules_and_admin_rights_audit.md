# PM-230 — Аудит firestore.rules и прав админки (2026-10-01, сессия «Ядро», E22)

Статический аудит исходников. В облако ничего не выкладывалось, прод и Firestore не трогались, эмулятор правил не запускался (NOT_RUN — см. §5).

## 1. A1 (валюта/ранг/агрегат не доверяют клиенту)

Критерий заменён решением владельца **D66** (local-first, решено координатором 01.10, Q7): монеты и ранг авторитетны на клиенте, сервер хранит и синхронизирует, но не пересчитывает. Править нечего; правила Firestore по-прежнему не дают одному клиенту писать чужие документы (см. §2).

## 2. A2 (минимальные права, защита не отключена ради скорости)

Разбор `firestore.rules` (442 блока `match`), тест `tests/pm230_firestore_rules_least_privilege.test.ts` (6/6 PASS):

| Проверка | Факт |
|---|---|
| Запись (`create/update/delete/write`) под `if true` или голым `request.auth != null` | **0** |
| Публичное чтение (`if true`) | 3: `leaderboard_stats`, `phrase_explanations`, `choice_explanations` (прогретый кэш/агрегат, запись только сервером или админом) |
| Чтение «любым вошедшим» без проверки владельца | 31, список зафиксирован в тесте и может только сокращаться |
| `isAdmin()` | claim `admin == true` из токена (`request.auth.token.keys().hasAny(['admin'])`), без чтения документов |
| Последний блок | запрет по умолчанию `match /{document=**} { allow read, write: if false; }` |

Расширить доступ молча больше нельзя: новая запись в «публичное»/«любым вошедшим» роняет тест.

### Права админских функций
`functions/src/pm230_admin_callable_guard.test.ts` (4/4 PASS): из 225 `export const admin* = onCall(` 217 содержат проверку прав прямо в теле (`require*`/`assert*`/`hasClaimedPermission`/`request.auth`), 8 делегируют обработчику, и тест проверяет проверку уже в нём (adminPublishNavLayout, adminPublishAlertsConfig, adminListGlobalBroadcasts, adminProductAnalytics, adminSubscriptionAnalytics, adminCreateV2GenerationPlan, adminSupportDispatchReply, adminSupportSendReply). Новая админская функция без проверки роняет тест. App Check не проверяется и не включается (пломба 2026-08-17).

## 3. Что можно ужесточить (не сделано, нужна проверка на эмуляторе и решение)

1. `user_warnings` читает любой вошедший, а клиент (`app/user_warning_check.ts`) делает `where('uid','==',uid)`. Предложение: `allow read: if isAdmin() || (resource.data.uid is string && canonicalUserMatchesAuth(resource.data.uid));`. Не менять без прогона на эмуляторе: от этого зависит показ предупреждений.
2. `remote_config`, `app_meta`, `config/spire_v1`, `app_messages` читаются любым вошедшим — это публичные настройки, ужесточать нечем.
3. После релиза клиента 2.0 (D91) убрать из правил коллекции удалённых Арены/Лиг: `league_groups`, `league_chest_events`, `league_crowns`, `tournamentSchedule`, `tournamentSeasons`, `entries`, `tournamentBank`, `botProfiles` (читаются любым вошедшим). Сейчас оставлены, потому что старые клиенты их ещё читают; вместе с правкой обновить список в тесте.

## 4. Деплой
Правила не выкладывались. Владельцу после релиза 2.0: `firebase deploy --only firestore:rules` (вместе с новым блоком `ai_operation_billing`, PM-231).

## 5. NOT_RUN
Эмулятор правил (`*.emulator.test.ts`) не запускался: аудит статический. Реальный отказ на конкретных запросах проверять эмулятором перед любым ужесточением из §3.
