# Task packet: гейт «в стор-бандле нет dev-строк»

Governance-ID: TG-6E64942F3FAD
Status: In progress
Owner: сессия «1 · Ядро» (координатор 12.10).

## Outcome
Дизайн подменяет dev-модули заглушками в стор-режиме (02cea12a1, resolveRequest в конфиге сборщика), но стор-бандл никто
не собирал. Нужна проверка: после стор-экспорта (EXPO_PUBLIC_STORE_RELEASE=1) в бандле нет строк «[DEV-STATE]»,
«dev_vip_override», «HUB-LIFECYCLE». Скрипт-гейт в release:precheck, работает только когда есть стор-экспорт.

## Scope
In: `scripts/store_bundle_dev_strings_gate.mjs` (новый), подключение в `scripts/release_precheck.mjs`, заглушка в
`tests/release_precheck_learning_v2_failure_classification.test.mjs`, тест гейта, пункт «день сборки» в отчёте.
Out: сам экспорт (тяжёлый, по команде в день сборки), правки заглушек Дизайна.

## Architecture
Гейт читает только папку `dist-store/` (отдельная от dev-экспорта, чтобы не проверить старый dev-бандл): все .js/.hbc,
байтовый поиск ASCII-строк (Hermes хранит строки в таблице как есть). Папки нет — громкое «пропущено» и код 0.
Найдена строка — код 1 с файлом и строкой.

## Security and privacy
Без данных.

## Technical debt
Список запрещённых строк — в одном месте; новые dev-маркеры дописывать туда.

## Verification
Тест: нет папки → пропуск; чистый бандл → OK; строка в .js и в бинарном .hbc → отказ. Сторож классификации — зелёный.

## Rollback
`git revert`.
