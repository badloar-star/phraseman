# Codex: запускатель provision-lock вне репозитория (12.10, Авторизация)

`tests/account_provision_lock_android_runtime_entrypoint.test.ts` читает внешний запускатель
`C:\Users\badlo\Documents\Codex\2026-09-22\new-chat\outputs\ACCOUNT_ANDROID_PROVISION_LOCK_REVIEWED_LAUNCH.ps1` (личная папка) —
**перенести копию внешнего запускателя в репозиторий, иначе тест не идёт в CI** (и на любом другом ПК). Решать Codex.

Контекст: договор обезличенного отказа — 8 полей, как в `runtime-probes/android-account-provision-lock/run-proof.ps1`; тест приведён к нему в a91e96a31 (58/58).
