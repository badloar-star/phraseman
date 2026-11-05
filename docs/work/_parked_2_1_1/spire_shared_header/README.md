Governance-ID: TG-75A4289EFB74

# Контракты общей шапки Пика/Сообщества — ждут макет (запаркованы 05.11)

Решение координатора: два контракта требуют редизайна шапки Сообщества (общая шапка поверх каждого раздела, без sceneTint, `peakSceneTopHex`/`SPIRE_SCENE_INK` для трёх разделов). Редизайн экрана — только по одобренному владельцем макету; макета в `docs/work/release/mockups` нет, поэтому контракты не коммитятся.

- `spire_scene_contract.patch` — правка существующего `tests/spire_scene_contract.test.ts` (вернуть: `git apply …/spire_scene_contract.patch`).
- `spire_single_scroll_owner_contract.test.ts.untracked` — новый тест (вернуть: скопировать в `tests/` без суффикса `.untracked`).

Вернуть вместе с правкой `app/(tabs)/community.tsx` по одобренному макету.
