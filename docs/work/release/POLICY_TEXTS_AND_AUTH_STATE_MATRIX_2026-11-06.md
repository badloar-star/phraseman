# Тексты политики (для Сайта) и матрица состояний входа (для E2E-гейта Ревизора) — 06.11, «5 · ВХОД»

Governance-ID: TG-4D0326414D27

## 1. Готовые абзацы политики конфиденциальности (EN; файл `legal/privacy_policy_en.json`, затем `legal:sync`; публикацию ведёт «Сайт»)

**Обновить политику ДО релиза, в котором эти фичи видны людям.** Новых разрешений и сторонних сервисов нет — уточнение того, что хранится и удаляется.

### 1.1 Награда за полный просмотр видео (раздел о видео-каталоге, после абзаца «If you save a video to your favourites…»)

> When you watch a video in the in-app catalogue through to the end (at least 70% of its length), the App grants a one-time coin reward for that video. To make the reward work across devices and to prevent it from being granted twice, we store in your account the ID of the video and the time the reward was granted. This record is used only to apply the reward once and to detect abuse; it is not shown to other users and is deleted together with your account.

Основание: `docs/work/tasks/video-full-reward-server-core-2026-11-05.md` («Security and privacy»: сервер хранит videoId и время награды; ключ операции — хеш пары uid+videoId). Если Ядро при выкладке изменит порог 70 % — поправить число.

### 1.2 Удаление всех связанных записей входа (Q26; раздел об удалении аккаунта, после «Once the 14 days elapse, deletion runs and becomes irreversible.»)

> When deletion runs, we also remove every other sign-in record (Google, Apple, or email) that was linked to your account, so that signing in again with the same provider afterwards creates a new, empty account.

Основание: `functions/src/account_delete.ts` (`deleteExtraClosureAuthUsers`), в бою: accountdeletemine 00068, worker 00041, retrycron 00035. Администраторские записи не удаляются — в политику не выносим.

## 2. Матрица состояний входа: Google / Apple / e-mail × помеха → тест → что нужно в E2E-гейте

Эталон поведения (владелец 18.10 и 05.11): вход и выход заканчиваются успехом; единственное разрешённое сообщение — «нет сети».
Apple — только iOS; e-mail — только dev-сборка (`dev-emulator-login`), в релизе e-mail-входа нет.

| Состояние | Google | Apple (iOS) | e-mail (dev) | Тест в HEAD | Для E2E-гейта |
|---|---|---|---|---|---|
| Вход нового | `created_new` | то же | `dev-emulator-login` | `account_switch_owner_rules_1018` | вход, прогресс пуст, окон нет |
| Вход существующего (пустой гость) | сразу в аккаунт | то же | — | `account_switch_owner_rules_1018` (правило 1) | прогресс аккаунта на экране |
| Гость с прогрессом → существующий | шторка «Войти в другой аккаунт?» | то же | — | `account_switch_owner_rules_1018` (правило 3) | «Отмена» — гость и урок на месте |
| Ошибка сети при входе | единственный текст «Связь пропала…» | то же | — | `auth_only_success_targets_1018` | авиарежим → тап → только этот текст, ничего не стёрто |
| Отмена окна провайдера | тихий возврат, без текста | то же | — | `aa_release_floor_auth_ui`, `auth_only_success_targets_1018` | отмена → кнопки снова нажимаются, текста нет |
| Двойной тап | второй игнорируется | то же | — | `aa_auth_double_tap_contract` | два быстрых тапа → один вход |
| Повторный вход тем же | остаёшься в аккаунте | то же | — | — (нужен эмулятор) | вход в уже открытый — без окон |
| Смена аккаунта (выход → другой) | выход тихо, затем вход | то же | — | `a5_logout_recovery_success_2026_11_06`, `account_switch_recovery_resume_contract` | выход до шторки входа без «Не удалось выйти», затем вход в №2 |
| Удаление и возврат ≤14 дней | окно «Восстановить аккаунт?» | то же | — | `delete_quiet_retry_all_2026_11_06`, `account_delete_variant_b_windows` | A9→A10 на №3 (runbook §1) |
| Вход в окончательно удалённый | чистый новичок, без окна | то же | — | `aa_release_floor_auth_ui`, `startup_restore_retry` | runbook §2 (после реального окончания удаления) |
| Убить приложение посреди входа/выхода | довод или откат | то же | — | `auth_provider_behavior` (карантин смены) | `adb shell am force-stop` посреди входа → после запуска без окон |
| Переустановка | тихое восстановление | iOS Keychain | — | `startup_restore_retry`, `startup_cloud_recovery_presentation` | `adb uninstall` + установка → вход → прогресс вернулся |

Открытые места (не покрыты тестами, нужен эмулятор): повторный вход тем же, «убить приложение», переустановка, свернуть во время выбора аккаунта, медленная сеть. Все описаны в `auth-scenario-matrix-2026-10-18.md` (B1–B10).
