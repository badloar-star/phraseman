# Task packet: оптимизация плиток Сообщества и сторожа цвета в зоне Дизайна

Governance-ID: TG-40EB00535D49
Governance-ID: TG-802A1516AC1E
Status: In progress
Owner: сессия «2 · ДИЗАЙН»
Related epic/enabler: none

## Outcome

1. Плитки раздела «Наборы» (Сообщество) работают быстрее на лайках и прокрутке: место набора в конкурсе считается один раз на версию хранилища, а не в каждой плитке; один таймер и один слушатель на весь список вместо сотни; токены темы считаются на смену темы; плитка в memo и не перерисовывается из-за чужого лайка. Цель: сортировок на лайк 100 → 1, таймеров 100 → 1, перерисовок плиток на лайк 100 → 1–2. Замер «до/после» через `cardsPerfLog` на эмуляторе после его освобождения; шаг E (первые 12 плиток) только после замера.
2. Сторожа цвета в зоне Дизайна зелёные: `two_theme_static_colors_contract`, `modal_theme_hardcode_guard` по `CommunityWinnerDialog.tsx`, `flashcards_packs.tsx`, `CommunityPackSocialBar.tsx` — на токенах темы там, где это поверхности и тексты, `theme-exempt` только для арта (белое на тёмной сцене плиток, золото приза, затемнение под окном).

Успех: оптимистичное «+1» лайка и защита от позднего ответа сервера не менялись; тесты плиток, лайков и каталога зелёные.

## Scope

In scope: `components/packs/CommunityScene.tsx`, новые `components/packs/community_scene_shared.ts` и `components/packs/community_tile_props_equal.ts`, тесты к ним, `components/packs/CommunityWinnerDialog.tsx`, `app/flashcards_packs.tsx`, `app/community_packs/CommunityPackSocialBar.tsx` (только пометки `theme-exempt`), перепин устаревшей строки в `tests/optimistic_spire_community_audit.test.ts`.

Out of scope: `components/scene/SceneBackdrop.tsx` и `components/dialogs/scene/use_dialogs_scene_theme.ts` (у «Тем»), сам список `FlashcardsCategoryHub.tsx` до замера, логика лайка и сервер.

## Architecture

No architecture change по данным: общий модуль живёт в памяти процесса, подписывается на существующее `packSocialLive`, сети и Firestore не касается. Инвариант: место и месяц те же, что считала каждая плитка сама.

## Security and privacy

Данные не собираются и не передаются, права и правила не меняются. Политика конфиденциальности не затрагивается.

## Technical debt

Pay now: дублирующиеся таймеры и пересчёты в плитках. Contain: тест на «один таймер, одна сортировка на версию» и тест сравнения пропов. Accept temporarily: первый кадр (шаг E) ждёт замера, владелец — Дизайн, выход — замер на эмуляторе.

## Verification

- Точечно под слотом: `community_scene_shared_2026_10_29`, `community_tile_props_equal_2026_10_29`, `community_month_contest`, `community_podium_navigation`, `community_root_tabs`, `community_pack_like_owner_fix`, `pack_like_local_write_failure`, `optimistic_spire_community_audit`, `two_theme_static_colors_contract`, `modal_theme_hardcode_guard`; проверка типов.
- Эмулятор: «до/после» по первому кадру и числу рендеров плиток при лайке (`cardsPerfLog`).

## Rollback

Откатить коммиты по шагам: поведение и данные не меняются, общий модуль можно убрать вместе с возвратом плитки к прежнему коду.
