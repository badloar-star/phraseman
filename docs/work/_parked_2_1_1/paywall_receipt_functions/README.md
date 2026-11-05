Governance-ID: TG-F3F6AB3C4F02

# Припаркованные серверные файлы атрибуции покупок по чеку (сирота Codex), 06.11

Парный архив к `docs/work/_parked_2_1_1/paywall_receipt_attribution.patch` (клиентская часть). Решение координатора: «если файлы в functions от неё — запаркуй, не коммить»; цель — к финальной фазе `functions/src` чистое = HEAD, иначе задеплоится не то.

Файлы (копии с суффиксом `.untracked`):
- `paywall_receipt_attribution.ts` — серверная атрибуция;
- `paywall_receipt_attribution.test.ts` — её тест;
- `paywall_funnel_rules.emulator.test.ts` — тест правил воронки в эмуляторе.

HEAD их не импортирует (проверено `git grep` по functions, app, components, tests, scripts).

## Как вернуть
```bash
cd docs/work/_parked_2_1_1/paywall_receipt_functions
for f in *.untracked; do cp "$f" "../../../../functions/src/${f%.untracked}"; done
```
Вернуть только вместе с клиентским патчем и правкой `firestore.rules` по воронке; перед возвратом — решение владельца, тесты функций и эмулятор правил.
