# Ядро · сухой прогон утреннего серверного пакета на финальном HEAD (25.10)

Governance-ID: TG-18395D804ACC
Governance-ID: TG-7FA621BDE003
Governance-ID: TG-57AC268D3026
Governance-ID: TG-BE7A5599AF33

## Outcome
Сухой прогон (без `--execute`) пакета из docs/work/release/SERVER_PACKAGE_2026-10-25.md на HEAD после коммита флагов.
В пакете 25 функций default (23 + adminCommunityPackQaReview + adminCommunityPackTranslateLocales), firestore:rules, storage и hosting:admin, без V4.
Результат — координатору до 08:30.

## Scope
Скрипт сухого прогона в scratchpad. Репозиторий не меняется, в прод ничего не уходит.
adminCommunityPackApplyQaFixes* в пакет не входят: изменённые в 3b2d18705 normalizeFindings и buildWholePackSwap зовёт только QaReview.

## Architecture
`check_live_functions_vs_head.mjs --only` → `deploy_from_clean_head.sh --only` (git archive HEAD, сборка, firebase --dry-run).

## Security and privacy
Не выкладываем. Пароли и токены не вводятся. App Check не трогаем.

## Technical debt
Новой не добавляется. Остаётся 🟡 Ревизора по 3892d1578: сверку сирот пропускать, пока идёт досылка Пика (spireFlushNow inFlight). Это после релиза.

## Verification
Коды возврата обеих команд и строки [DEPLOY-CLEAN].

## Rollback
Не нужен: сухой прогон ничего не меняет.

## Проверка после выкладки (25.10, координатор)
Только чтение журналов Cloud Logging: [AI-CONSENT], [SPIRE-REPORT] batch_done, статусы premiumTheme*, ошибки сервисов пакета. Ничего не меняется.
