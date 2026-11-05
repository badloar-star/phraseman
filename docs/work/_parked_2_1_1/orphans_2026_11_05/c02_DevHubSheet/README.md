Governance-ID: TG-36D28DDC3544

# Припаркованная сирота c02_DevHubSheet

Решение координатора 06.11 («дерево = HEAD + свежая работа живых сессий»): файлы не трогались больше 18 часов, ни один свежий файл не зависит от их грязной версии (проверено по импортам и добавленным экспортам), HEAD их не импортирует. Сборка 149 собиралась из `git archive` (`eas_novcs_47206b7f1`), в прод они не попали.

## Файлы (11)
Изменённые (патч `tracked.patch`): 3
- components/dev/DevHubSheet.tsx
- components/dev/devToolRegistry.ts
- components/dev/motion_showcase/sections/screens_learn.ts

Новые (копии с суффиксом `.untracked` в `untracked/`): 8
- modules/dev/native_audio_hub_controller.ts
- modules/dev/native_audio_local_payload.ts
- modules/dev/native_audio_safe_fixture.ts
- tests/dev_native_audio_safe_fixture.test.ts
- tests/learning_v2_full_off_policy.test.ts
- tests/native_audio_hub_controller.test.ts
- tests/native_audio_local_payload.test.ts
- tests/native_audio_privacy_contract.test.ts

## Как вернуть
```bash
git apply docs/work/_parked_2_1_1/orphans_2026_11_05/c02_DevHubSheet/tracked.patch   # если есть
cd docs/work/_parked_2_1_1/orphans_2026_11_05/c02_DevHubSheet/untracked 2>/dev/null && find . -type f -name '*.untracked' | while read f; do t="../../../../../../${f%.untracked}"; mkdir -p "$(dirname "$t")"; cp "$f" "$t"; done
```
Перед возвратом в релиз: решение владельца, типы и связанные тесты зелёные, кадры эмулятора.
