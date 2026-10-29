# Task packet: заготовка патча «включить сцены у людей в выпуске» (не коммитить до сигнала после Сверки)

Governance-ID: TG-AB0C9D5419E9
Status: Подготовка (патч НЕ применён и НЕ закоммичен)
Owner: 2 · ДИЗАЙН (поручение координатора 22.10: решение владельца — все сцены включаются у людей в выпуске, но только после вердикта 6 · СВЕРКИ «как в эталоне»; «подготовь один коммит… держи как готовый дифф в docs/work; без stash и worktree»)

## Outcome

Готовый патч docs/work/patches/scene_flags_release_2026-10-22.patch: HOME_SCENE_V2_ENABLED, TODAY_SCENE_V2_ENABLED, DIALOGS_SCENE_V2_ENABLED становятся true в релизе (сейчас: IS_DEV / IS_DEV / ENABLE_DEV_TOOLS && !IS_STORE_RELEASE), контрактные тесты флагов обновлены.
SPIRE_SCENE_V2_ENABLED (components/spire/scene/spire_scene_flag.ts) входит в патч с 22.10 (флаг Пика вынесен в отдельный модуль; контракт tests/spire_scene_contract.test.ts проверяет true и отсутствие зависимости от dev). Патч применяется командой git apply после сигнала координатора и коммитится отдельным коммитом.

## Scope

- docs/work/patches/scene_flags_release_2026-10-22.patch — сам патч (в рабочее дерево кода и тестов не применяется).
- Состав патча (с Пиком: components/spire/scene/spire_scene_flag.ts, tests/spire_scene_contract.test.ts): components/home/v2/scene/HomeScene.tsx, components/home/v2/today_scene/today_scene_flag.ts, components/dialogs/scene/dialogs_scene_flags.ts, tests/today_scene_wiring_contract.test.ts, tests/dialogs_scene_contract.test.ts.

## Architecture

Патч строится из текущих версий файлов отдельно от рабочего дерева (каталог-черновик вне проекта), проверяется git apply --check. Файлы чужих сессий не трогаются: файл HomeScene.tsx принадлежит 3 · МАКЕТЫ, правка в нём — одна строка флага и убранная константа IS_DEV.
Откат после включения — одна строка false в каждом флаге.

## Security and privacy

Данных не собираем. Включение сцен у людей меняет только вид и использует уже имеющиеся локальные данные; новых чтений базы нет.

## Technical debt

Картинки героя «Диалогов» (dialogs_scene_*) до регистрации в реестре — заглушки; включение флага до этого покажет заглушки у людей (решает координатор).

## Verification

git apply --check на текущем дереве; после сигнала — типы, тесты флагов (today_scene_wiring_contract, dialogs_scene_contract, home_scene*), храповики; затем коммит через safe_commit.

## Rollback

Не применять патч / git revert коммита; в коде — false в трёх флагах.
