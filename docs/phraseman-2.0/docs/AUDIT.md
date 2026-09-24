# Предварительная техническая опора и план полного аудита

## Что фактически прочитано
Источник — GitHub connector в этой переписке. Снимок `79c3f6984528beb2368cf64304b2067f3685cff6` от 21.09.2026; утверждённая рабочая база пока unknown. Ссылка на каждый файл строится по неизменяемому SHA, не по `master`. Этот раздел НЕ называется полным аудитом приложения.

| Код | Файл / диапазон | Наблюдение | Что НЕ доказано |
|---|---|---|---|
| C01 | `app/energy_contract.ts`, 1–180 | cap 100, recovery 6 минут, цены 0/10/20/25, бонусы ёмкости лиги/визитки присутствуют в коде. | Какие флаги реально включены у пользователя. |
| C02 | `app/energy_system.ts`, 1–170 | Читает league-chest, boon overrides, profile level, cached league ID, bonus energy и account generation. | Полная карта всех write paths энергии. |
| C03 | `app/_layout.tsx`, 1–275 | В root присутствуют импорты achievement/reward/modal hosts, XP, prefetch и several bootstrap paths. | Сам импорт не доказывает частоту выполнения и стоимость. |
| C04 | `app/app_resume_policy.ts`, 1–195 | Уже есть keyed coalescing queue, grace 900ms, cloud delay 2500ms, gap 80ms, cancel; ошибки run подавляются через catch. | Все callers, fairness и реальные задержки на устройстве. |
| C05 | `functions/src/index.ts`, 1–150 | Наряду с лигой/подарками есть auth recovery/merge, account deletion, support; указан global maxInstances. | Текущее deployed inventory и реальные счета. |
| C06 | `firebase.json`, 1–190 | Существуют hosting admin и knowlywww, rules/indexes paths, redirects и rewrites. | Какие конфиги задеплоены и какие URLs используются пользователями. |
| C07 | `scripts/canonical_workspace_guard.mjs`, 1–190 | Страж проверяет текущий корень checkout; фиксированные каталог/ветка явно не навязываются. | Локальный путь и branch владельца. |
| C08 | `package.json`, частичный ответ | Присутствуют Expo-команды и learning-v2 quality gates. | Полная версия зависимостей и matching store build; поле package version не равно доказанной версии релиза. |

Default `master` повторно прочитан 23.09.2026: `53bb63352751f1ab3499fad3e8a035890e0d21f9`, 08.08.2026. Code search в раннем запросе вернул этот старый SHA, поэтому результаты поиска нельзя смешивать с сентябрьским срезом.

## Выводы для следующей сессии
Энергия — не замена одной константы: удалить старые capacity overrides, consumers и совместимость состояния. Очередь уже существует — сначала проследить её и объединить оставшиеся jobs; не создавать параллельный оркестратор. Root содержит явные точки снятия наград и прогревов, но по import нельзя объявить конкретную причину всех лагов. Серверные функции связаны также с правами и восстановлением: полное удаление cron вслепую недопустимо.

## Полный аудит без фиктивных «проверены все строки»
После фиксации HEAD выгрузить tracked first-party files и route graph. Для каждого файла записать категория, feature owner, импортируется/достижим, фоновые side effects, status keep/redesign/remove/archive, reviewedBy, reviewedAtSHA, evidence. Для generated/vendor выполнить отдельные проверки и явно записать исключения. Сумма reviewed + excluded + pending должна совпадать со всем inventory. Только так понятен охват.

Проходы: навигация → state/write paths → effects/jobs → data rights/migrations → assets/native bundle → copy/доступность → серверная развертка. Повторные аудиты — по изменённым доменам и инвариантам, не бессмысленное перечитывание всего репозитория на каждую кнопку.

## Первые read-only команды на машине с проектом
```sh
git status --short
git rev-parse HEAD
git branch --show-current
git branch -avv
git worktree list --porcelain
git log -5 --oneline
git ls-files
```
Сначала прочитать существующие AGENTS/config. Никакого `reset --hard`, `clean -fd`, force push или удаления branches. Проверить версии сборок отдельно. Источники файла: `evidence/code_sources.json`.
