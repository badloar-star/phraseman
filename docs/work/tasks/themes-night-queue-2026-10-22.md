# Task packet: ночная очередь «4 · ТЕМЫ» — сторожа пейвола, реестр картинок «Сцены», кольцо Plus по isPlus, вступление «Скажи так»

Governance-ID: TG-D2854889FC2C
Governance-ID: TG-5B37B0F6CDF8
Governance-ID: TG-375C10F566BC
Governance-ID: TG-6B87BB0FF7F0
Governance-ID: TG-32A736F6D1F4
Governance-ID: TG-839FB3B68267
Governance-ID: TG-A06B02AF9DB8
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: приказы координатора 21–22.10

## Outcome

1. Тест paywall_v3_source_contract снова проверяет те же утверждения, но в PaywallPlanRows.tsx, куда после 1359f5244 переехала разметка планов.
2. Имена home_scene_* (10) и dialogs_scene_* (8) в реестре themed art; генератор подключает все новые картинки; один коммит реестра и generated.
3. Кольцо Plus у чужих: isPlus === true && (plusUntilMs === 0 || plusUntilMs > Date.now()); без isPlus кольца нет.
4. Вступление «Скажи так» (learning_v2_session_intro.tsx) по макету.

## Scope

In scope: tests/paywall_v3_source_contract.test.mjs (только пути и регулярки), components/theme/themed_art_registry.ts, themed_art_assets.generated.ts, картинки v2art, components/plus/plus_ring_spec.ts и места чтения профилей чужих, learning_v2_session_intro.tsx, тесты.
Out of scope: платёжная логика, сервер, четыре режима с чужими правками повтора аудио, Главная (3 · МАКЕТЫ).

## Architecture

Тест: меняется только файл, в котором ищется разметка; сами утверждения не ослабляются. Реестр: имена добавляются, generated пересобирается скриптом. Кольцо: чистая функция isPlusProfile получает новые поля, чтение из уже загруженных профилей, новых запросов нет.

## Security and privacy

Новых данных не собираем: используется уже публичное поле профиля. Политика уже предложена координатору.

## Technical debt

- Pay now: устаревший структурный тест пейвола.
- Defer: в картинках v2art остаётся известный долг по совмещению слоёв (ACCENT_MISALIGNED_DEBT).

## Verification

Точечные тесты через слот; генератор в режиме проверки; node --test для .mjs.

## Rollback

`git revert` соответствующих коммитов.
