# Снимок флагов перед OTA на 2.0.2 (Ревизор, 25.10, только чтение)

**Ревизия: HEAD 011931951.** На момент сборки сверить заново — любой коммит в `app/remote_flags.ts` или `app/phrase_workshop_flag.ts` после
этого хэша меняет таблицу. Сравнение: `app/remote_flags.ts` в c77e48270 (последняя правка до 24.10) против 011931951.

## 1. Флаги, добавленные / изменённые 24.10–25.10 (DEFAULT_FLAGS)

| Флаг | Было | Сейчас | Из Пульта | Должно быть (координатор) | Итог |
|---|---|---|---|---|---|
| `learning_chapter_exam_v2_enabled` | — | **true** | да | true, но ВЫКЛ, если нет склейки «прототип \| эмулятор» | ⚠️ решение координатора до сборки |
| `dialogue_freeform_translate_enabled` | — | false | да | false | ✅ |
| `plus_server_recheck_enabled` | — | false | да | false | ✅ |
| `apple_signin_revoke_enabled` | — | false | да | false | ✅ |
| `account_delete_variant_b_ui_enabled` | — | false | да | false | ✅ (пока никем не читается — экран не закоммичен) |
| `spire_gold` | — | false | да | false (до выкладки функций Пика) | ✅ |
| `spire_streak_heart` | — | false | да | false | ✅ |
| `learning_cant_speak_enabled` | — | false | да | — | ✅ |
| `premium_theme_webgl_motion_enabled` | — | false | да | — | ✅ |
| `paywall_promo_code_visible` | — | true | да | — | ✅ промокод виден, только если ЕЩЁ И `promo_codes_enabled` (= false) |

Не в `remote_flags`:

| Флаг | Где | Сейчас | Должно быть | Итог |
|---|---|---|---|---|
| «Мастерская фраз» | `app/phrase_workshop_flag.ts` `PHRASE_WORKSHOP_ENABLED_IN_RELEASE` | **false** (вкл только при `__DEV__`) | false | ✅ |
| `paywall_m_enabled` | — | **флага нет**: `components/paywall/m/` не в git, ключ нигде в коммитах | false | ✅ М в OTA не попадёт вовсе (появится — сверить, что false) |
| `legacy_bonus_enabled` | — | **флага на клиенте нет**: бонус наследия решает сервер (`legacyBonusConvertMine`), клиент с 2.0.2 менял только вид (LegacyBonusHero) | как в бою | ✅ поведение как в бою |
| `paywall_close_visible` / `paywall_restore_visible` | — | ключи удалены (03e763def), «закрыть» и «восстановить» — жёсткое true | всегда видны | ✅ |

Расхождений с ожидаемым нет; единственное открытое — `learning_chapter_exam_v2_enabled = true` (ждёт склейки или решения выключить).

## 2. Нативная часть и версия

- `app.json`: version 2.0.2, **runtimeVersion "2.0.2"**, versionCode 144, buildNumber 144. `app.config.js` с 009c40c97 не менялся,
  version / runtimeVersion не переопределяет.
- `package.json`, `package-lock.json`, `eas.json`, babel / metro, `plugins/`, `patches/` — без изменений с 009c40c97 (0 строк зависимостей).
- Нативные API, которые новый код зовёт за флагами: `auth().revokeToken` (apple_signin_revoke) — есть в установленном
  @react-native-firebase/auth ^21.14.0 (iOS RNFBAuthModule.m, Android ReactNativeFirebaseAuthModule.java), lock не менялся →
  та же версия, что в сборке 144. `@react-native-masked-view/masked-view` 0.3.2 — в 2.0.2 уже есть.

## 3. Флаги, которым нужен сервер, которого нет в бою — обязаны быть ВЫКЛ

| Флаг | Что зовёт при ВКЛ | Сервер | Сейчас |
|---|---|---|---|
| `dialogue_freeform_translate_enabled` | `dialogueV2FreeformTranslate` (aafa29de4) — единственный новый callable клиента с 009c40c97 | не выложен | false ✅ |
| `account_delete_variant_b_ui_enabled` | экран удаления «через 14 дней / удалить сразу» → поведение 713677ddd (Auth живёт 14 дней, revoke сессий) + шлюз отсрочки 0750164ff | не выложен | false ✅ |
| `spire_gold` | правило золота `spire_golden` / `spire_progress` (ec03e9e58, ccd507589) | не выложен | false ✅ (+ второй замок: золото только при `goldRule ≥ 1` от сервера) |
| `apple_signin_revoke_enabled` | нативный `revokeToken` + ключ Apple в консоли Firebase (сервер не нужен; часть потока удаления варианта Б) | — | false ✅ — включать вместе с вариантом Б |
| `plus_server_recheck_enabled` | существующие `getVerifiedPremiumAccessStatus` / `forcePremiumAccessCloudRestore` | уже в бою | false ✅ (можно включать без выкладки) |

Связано с политикой конфиденциальности: 7868dd51c уже описывает «удалить сразу» — а `account_delete_variant_b_ui_enabled` = false и
713677ddd не выложен (см. ведомость, 🟡 на решение координатора/владельца).

## Как проверено

`git show <rev>:app/remote_flags.ts` → разбор блока `DEFAULT_FLAGS` и списка `allowedBools` (скрипт, только чтение); `git grep` по ключам
в app/components на ревизии; `git diff 009c40c97 011931951 -- package.json …`; чтение `app.json` / `app.config.js` на ревизии; новые
`httpsCallable` в диффе клиента с 009c40c97.
