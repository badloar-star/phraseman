Governance-ID: TG-36D28DDC3544

# Припаркованная сирота c48_owner_lock_whole_top_2026_10_25_test

Решение координатора 06.11 («дерево = HEAD + свежая работа живых сессий»): файлы не трогались больше 18 часов, ни один свежий файл не зависит от их грязной версии (проверено по импортам и добавленным экспортам), HEAD их не импортирует. Сборка 149 собиралась из `git archive` (`eas_novcs_47206b7f1`), в прод они не попали.

## Файлы (1)
Изменённые (патч `tracked.patch`): 1
- tests/owner_lock_whole_top_2026_10_25.test.ts

Новые (копии с суффиксом `.untracked` в `untracked/`): 0
—

## Как вернуть
```bash
git apply docs/work/_parked_2_1_1/orphans_2026_11_05/c48_owner_lock_whole_top_2026_10_25_test/tracked.patch   # если есть
cd docs/work/_parked_2_1_1/orphans_2026_11_05/c48_owner_lock_whole_top_2026_10_25_test/untracked 2>/dev/null && find . -type f -name '*.untracked' | while read f; do t="../../../../../../${f%.untracked}"; mkdir -p "$(dirname "$t")"; cp "$f" "$t"; done
```
Перед возвратом в релиз: решение владельца, типы и связанные тесты зелёные, кадры эмулятора.
