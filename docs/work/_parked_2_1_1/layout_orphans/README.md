Governance-ID: TG-8CF0797B373B

# Припаркованные остатки в app/_layout.tsx и app/cloud_sync.ts

Поручение координатора 06.11: к полному прогону рабочее дерево по этим двум файлам = HEAD. Это остатки трёх сирот (Codex), чьи модули лежали вне репозитория:

1. **«Витрина визитки профиля»** (выбор заслуженных наград на визитке): `useProfileCardShowcaseSync()` в `_layout.tsx`, ключ `profile_card_showcase_v1:` в `cloud_sync.ts`. Хвост того, что Вход запарковал в `../profile_showcase.patch`; план — `docs/superpowers/plans/2026-10-28-profile-card-showcase.md`.
2. **«Аудио-исход»** (диагностика итога включения аудио-режима при старте): `reportRootAudioModeOutcome` в `_layout.tsx`.
3. **«Восстановление награды руны Learning V2»** (старый защищённый намерение награды после выключения LV2 UI): эффект `lv2_existing_rune_reward_recovery` в `_layout.tsx`.

## Что лежит здесь
- `layout_orphans_tracked.patch` — разница `app/_layout.tsx` (5 хунков) и `app/cloud_sync.ts` (1 хунк) относительно HEAD.
- `untracked/` — копии модулей и тестов этих сирот с суффиксом `.untracked` (чтобы сторожа коммита не разбирали их как код): `app/audio_mode_outcome_diagnostics`, `app/learning_v2_session_rune_reward_recovery_bootstrap`, `app/profile_card_showcase_store`, `hooks/use_profile_card_showcase{,_sync}`, `shared/profile_card_showcase{,_ids}`, `functions/src/profile_card_showcase_projection.test` и 11 тестов `tests/*`. Сами файлы из рабочего дерева НЕ удалялись.

## Как вернуть
```bash
git apply docs/work/_parked_2_1_1/layout_orphans/layout_orphans_tracked.patch
# если новых файлов в дереве нет — вернуть их из копий:
cd docs/work/_parked_2_1_1/layout_orphans/untracked
find . -type f -name '*.untracked' | while read f; do t="../../../../../${f%.untracked}"; [ -e "$t" ] || { mkdir -p "$(dirname "$t")"; cp "$f" "$t"; }; done
cd -
```

## Что ещё грязное у этих сирот и осталось в дереве (не парковалось)
`app/audio_session_coordinator.ts`, `tests/audio_session_coordinator.test.ts`, `tests/loud_playback_audio_mode_contract.test.ts` (аудио-исход); `app/profile_card_public.ts`, `app/public_profile_snapshot.ts`, `functions/src/public_profile_projection.ts` (витрина; в проекции — хунк `profileCardShowcase`), `tests/profile_card_public_swr.test.ts`; `tests/learning_v2_session1_rune_reward_composite_gate.ts` (восстановление награды). Они самостоятельны и без патча `_layout.tsx` безвредны.

## Перед возвратом в релиз
- «Витрина»: проверить политику конфиденциальности (публичный профиль показывает выбранные награды), E2E на эмуляторе.
- «Аудио-исход»: проверить на устройстве, что диагностика не мешает старту.
- «Восстановление награды»: проверить, что пустая очередь делает одно локальное чтение и не создаёт награды.
- Решение владельца, типы и тесты зелёные.
