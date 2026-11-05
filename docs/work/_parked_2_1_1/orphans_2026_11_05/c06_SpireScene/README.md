Governance-ID: TG-36D28DDC3544

# Припаркованная сирота c06_SpireScene

Решение координатора 06.11 («дерево = HEAD + свежая работа живых сессий»): файлы не трогались больше 18 часов, ни один свежий файл не зависит от их грязной версии (проверено по импортам и добавленным экспортам), HEAD их не импортирует. Сборка 149 собиралась из `git archive` (`eas_novcs_47206b7f1`), в прод они не попали.

## Файлы (4)
Изменённые (патч `tracked.patch`): 4
- components/spire/scene/SpireScene.tsx
- components/spire/scene/SpireScenePedestal.tsx
- components/spire/scene/spire_scene_backdrop.tsx
- components/spire/scene/spire_scene_backdrop_math.ts

Новые (копии с суффиксом `.untracked` в `untracked/`): 0
—

## Как вернуть
```bash
git apply docs/work/_parked_2_1_1/orphans_2026_11_05/c06_SpireScene/tracked.patch   # если есть
cd docs/work/_parked_2_1_1/orphans_2026_11_05/c06_SpireScene/untracked 2>/dev/null && find . -type f -name '*.untracked' | while read f; do t="../../../../../../${f%.untracked}"; mkdir -p "$(dirname "$t")"; cp "$f" "$t"; done
```
Перед возвратом в релиз: решение владельца, типы и связанные тесты зелёные, кадры эмулятора.
