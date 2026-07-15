# Аудит исследовательских и проектных skills для Phraseman V2

**Дата:** 2026-07-14  
**Цель:** до проектирования V2 проверить, каких специализированных инструкций не хватает для UI/UX, речи, педагогики, анимации, аналитики, планирования и верификации; устанавливать только узкие, проверяемые и совместимые с правилами репозитория skills.

## Метод отбора

Популярность репозитория использовалась только как входной сигнал. Решение об установке принималось по более строгим критериям:

- прямое соответствие задаче V2;
- понятный `SKILL.md` и ограниченная область полномочий;
- отсутствие background daemon, hook automation и скрытых writes;
- отсутствие запроса на project OpenAI API, credentials или массовую генерацию;
- совместимость с Expo SDK 54, React Native и dirty-worktree правилами Phraseman;
- отсутствие дублирования уже более сильного локального skill;
- возможность закрепить точный commit и проверить tree hash;
- отсутствие установки всего чужого репозитория «пакетом».

## Установленные внешние skills

### OpenAI skills

Источник: [openai/skills](https://github.com/openai/skills)  
Pinned commit: `49f948faa9258a0c61caceaf225e179651397431`

| Skill | Почему выбран | Tree hash |
|---|---|---|
| `define-goal` | зафиксировать измеримый objective и границы большого проекта | `48dfb6993eb1cbeb30100cf5b99e9e44c9bd59f42af77b02f1ec5990ca9b9a91` |
| `screenshot` | будущий first-hand capture реальных competitor/app states | `8c8981dade9384e32b10b03512885008e7ad317e23b0cc336c776594e0f95149` |
| `security-threat-model` | доступен для отдельного явно заказанного AppSec-аудита | `5fabd75dd19924b63fdf5766e08a9085de097769e22cd63262e70bd1c666900f` |
| `security-best-practices` | доступен для отдельного secure-code review TypeScript/JS | `88d29b5df5e5562bcdb4271594cc03525f2c008db592586340c64b16577c49d9` |

Security skills не использовались как повод автоматически выпускать отдельный vulnerability report: их собственные trigger rules требуют явного security-запроса. В V2-spec включены только обычные secure-by-default границы, доказанные текущим кодом: server-priced purchase, account scope, idempotency, hash verification и запрет доверять client mastery.

### Product measurement skills

Источник: [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills)  
Pinned commit: `130847d0945555c43b0b1774e2a4f99d35a32ebe`

| Skill | Роль в V2 | Tree hash |
|---|---|---|
| `onboarding` | первые эпизоды, progressive disclosure и early value | `c551c24bab904de467c81dda9e8b666e0d77bb4c187b3b57cb6cef1fab5181bb` |
| `paywalls` | честное объяснение Access Boost и защита от pay-to-win | `6693a76835576a3dde33d2b637c8a2081630f768ad6f439dd9c7f7f648aeeff4` |
| `analytics` | события только ради решений, naming/governance/privacy | `4156cb647c580504cbce4e70f3ecb6d27cacd768102be80472b6062190f9852d` |
| `ab-testing` | гипотеза, primary metric, guardrails, precomputed sample и no peeking | `a2ac35003d3266f7abe151fadb8ea3f2fe26f6e8b2cf9d5c4b677b789a756fc6` |

Установка project-scoped; версии не загружаются с `main/latest` во время вызова.

## Созданные project-specific skills

Пять узких skills созданы через системный `skill-creator` в `.agents/skills`. Каждый содержит `SKILL.md`, `agents/openai.yaml` и один evidence/checklist reference; в них нет scripts, hooks, binaries, background services, MCP dependencies или credentials.

| Skill | Что он запрещает/обеспечивает | Tree hash |
|---|---|---|
| `phraseman-learning-science` | can-do outcomes, retrieval/spacing, transfer и честные CEFR claims | `84d618d987eec4d22647e05b3249e8c78518ef0768069e7d4931b9d8c4004949` |
| `phraseman-speech-pronunciation` | разделение transcript intelligibility, acoustic evidence и system uncertainty | `57b4644ce0a89780496bf7acc129cafbb811bc8b201c8155a506ae116542f2dd` |
| `rn-accessibility-audit` | touch, screen reader, large text, reduced motion и альтернативы gesture/voice | `2a73f0a194dbada18c6c5769b5d20e3d681cfe3d81c5a90fc3fa3393878babf5` |
| `competitor-ux-evidence` | URL/date/state/capture provenance и запрет выдавать marketing render за first-hand observation | `566b632fb2ef9cdb73d701fd3364eace2358a6ba61ca716c19987f791b498705` |
| `learning-telemetry-and-experiments` | privacy-conscious evidence, denominator discipline и predeclared experiments | `3ddbcce0eadb2650b14bb2068dcbd0f37254373e2bc1dd065c3339a3e03cd5bc` |

Все пять прошли `quick_validate.py` и независимые forward-tests.

## Уже доступные и использованные skills

| Область | Skills |
|---|---|
| Продуктовое исследование | `brainstorming`, `competitor-ux-evidence` |
| UI/UX | `ui-ux-pro-max`, `emil-design-eng`, `rn-accessibility-audit` |
| React Native | `react-native-best-practices`, `animations`, `audio` |
| Педагогика и речь | `phraseman-learning-science`, `phraseman-speech-pronunciation` |
| Планирование | `writing-plans`, GSD command guides |
| Параллельная работа | `dispatching-parallel-agents` с bounded read-only задачами |
| Аналитика | `analytics`, `ab-testing`, `learning-telemetry-and-experiments` |
| Визуализация | `visualize` для интерактивного multi-frame storyboard |

## Что сознательно не устанавливалось

- дубликаты общих UI/RN/animation/planning skills;
- repository-wide «установить всё» bundles;
- auto-research, auto-rollback и background swarm workflows;
- внешние OpenAI image/transcription/content-generation skills, запрещённые Phraseman Codex API firewall;
- Figma/Stitch/Penpot automation без выбранного editable-design connector;
- Expo templates, рассчитанные на более новый SDK и конфликтующие с текущими navigation/performance invariants;
- любые skills, которым нужны credentials, unpinned remote instructions или daemon.

## Как аудит изменил спецификацию

- вместо 18 отдельных экранов выбраны общий scaffold и шесть shells;
- voice result разделён на confident success/needs-work и system uncertainty;
- competitor renders помечены official reference, а first-hand capture вынесен в отдельный gate;
- performance stars отделены от typed learning evidence; earned access является их read-only проекцией, а purchased boost — отдельной gate-scoped сущностью;
- delayed transfer выбран primary learning metric вместо XP/session length;
- эксперименты не имеют фиксированного sample size до появления baseline/MDE;
- rollout идёт через один episode, одну chapter и только затем 32;
- background automation не запускается, а все edits сохраняют dirty worktree.

## Reproducibility

Полный локальный install manifest с путями и hashes хранится в `.codex-tmp/skill-audit/install-manifest.md`. Новые внешние skills появляются в полном Codex catalog после нового task/session или перезапуска приложения; project-specific skills уже лежат в репозитории и применялись напрямую в этой работе.
