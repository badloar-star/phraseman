Governance-ID: TG-36D28DDC3544

# Припаркованная сирота c03_phone_state_preference_bridge

Решение координатора 06.11 («дерево = HEAD + свежая работа живых сессий»): файлы не трогались больше 18 часов, ни один свежий файл не зависит от их грязной версии (проверено по импортам и добавленным экспортам), HEAD их не импортирует. Сборка 149 собиралась из `git archive` (`eas_novcs_47206b7f1`), в прод они не попали.

## Файлы (8)
Изменённые (патч `tracked.patch`): 4
- app/phone_state_preference_bridge.ts
- app/phone_state_progress_cutover.ts
- app/phone_state_runtime.ts
- modules/phone-state/domains/progress_api.ts

Новые (копии с суффиксом `.untracked` в `untracked/`): 4
- tests/generated_classic_progress_journal_scope.ts
- tests/generated_classic_publication_scope.ts
- tests/helpers/classic_phone_state_production_journal.ts
- tests/red-fixtures/classic-completion/phone_state_target_collision.red.ts

## Как вернуть
```bash
git apply docs/work/_parked_2_1_1/orphans_2026_11_05/c03_phone_state_preference_bridge/tracked.patch   # если есть
cd docs/work/_parked_2_1_1/orphans_2026_11_05/c03_phone_state_preference_bridge/untracked 2>/dev/null && find . -type f -name '*.untracked' | while read f; do t="../../../../../../${f%.untracked}"; mkdir -p "$(dirname "$t")"; cp "$f" "$t"; done
```
Перед возвратом в релиз: решение владельца, типы и связанные тесты зелёные, кадры эмулятора.
