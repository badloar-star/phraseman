# Припаркованная работа: атрибуция покупок по чеку (сирота Codex), 06.11

Решение «5 · ВХОД» по поручению координатора: вариант Б (покупку в 150 не рискуем).

Что внутри: `paywall_receipt_attribution.patch` (git diff шести файлов: app/paywall_funnel.ts +24/−2, app/paywall_purchase.ts +48/−10, functions/src/admin_paywall_variant_stats(.test).ts, tests/paywall_funnel_behavior.test.ts, tests/paywall_purchase_behavior.test.ts) и `paywall_receipt_attribution.test.mjs.untracked` (новый тест, был вне git).

Почему припаркована: правка меняет путь покупки (шаги store_confirmed/access_applied, impressionId, периодType) и пишет в воронку SHA-256 от transactionId — этого в политике конфиденциальности нет (политика говорит о чеках только в общем виде); автор неизвестен, зелёный прогон тестов до решения не подтверждён.

Как вернуть: `git apply docs/work/_parked_2_1_1/paywall_receipt_attribution.patch`, вернуть тест `git mv`/cp в tests/ без суффикса `.untracked`, затем прогнать paywall_funnel_behavior, paywall_purchase_behavior, paywall_receipt_attribution и ДО выкладки добавить в политику абзац про хеш идентификатора транзакции.
