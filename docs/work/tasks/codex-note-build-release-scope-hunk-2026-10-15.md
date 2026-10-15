# Записка для Codex: в рабочей копии `build_release.mjs` лежит ханк Ядра (НЕ закоммичен)

Governance-ID: TG-123F2B2FC865
Status: Handoff (Ядро → Codex)
Owner: Codex (файл), Ядро (ханк)

## Что и почему

Решение владельца 15.10 ~09:00 «Оба исправления»: гейт паритета Learning V2 проверяет только выпущенные занятия (потолок бандла 15).

- Часть гейта уже в HEAD: `8ff883523` — `scripts/learning_v2_release_parity_gate.mjs`, тест и список 19 звуков, одобренных владельцем.
- Вторая часть — в `content/learning-v2-course/pipeline/build_release.mjs`. Она положена **только в рабочую копию, поверх вашего незакоммиченного WIP**.
- Ханк ложится лишь поверх вашей версии, на HEAD он не применяется.
- Координатор запретил коммитить ваш WIP за вас.

## Ханк (кратко)

- Новая `scopeFactoryReport(report, sessions)`: пауза фабрики (`factory_intro_practice`) учитывает замечания только переданных занятий.
- `holdForFactoryIntroPractice(context, scopeSessions = null)`: без scope — прежнее поведение (сборка канона).
- В `main()` при `CHECK_SOURCE_RELEASE` передаётся `String(SESSION).split(",")…` — список занятий из `--session`.
- Пометка в коде: `// зачем (координатор 15.10, V2 показан в R1)`.
- Источник: `docs/phraseman-2.0/handoff/V2_GATE_RELEASED_SCOPE.patch` (ханки `build_release.mjs`).

## Что сделать Codex

Коммитить `build_release.mjs` вместе с этим ханком, не выкидывая его. Иначе локальный `npm run release:precheck` снова проверит весь курс (186 занятий).

## Состояние гейта на 15.10 10:15

| Проверка | Результат |
|---|---|
| Качество | PASS (19 звуков s06–s15 — справка `AUDIO_EVIDENCE_OWNER_APPROVED`) |
| Файлы канон ↔ копия | PASS |
| Смысловая сверка | **BLOCKED**: ваша пауза фабрики, 36 замечаний методики внутри выпускаемых s06–s15 |

Разбивка 36 замечаний:
- по коду:
  - `practice_after_independent_boundary` — 20;
  - `intro_target_not_practiced` — 10;
  - `invalid_independent_boundary` — 3;
  - `independent_boundary_missing` — 2;
  - `locale_interaction_shape_mismatch` — 1 (ru): похоже на настоящий дефект — разная форма задания у ru и uk;
- по занятиям: s06 10, s07 1, s09 6, s10 6, s11 3, s12 2, s13 2, s14 1, s15 5.

Решение по 36 — за владельцем: «выпускаем» (точечный список, как для звуков) или вы чините.

На сервере EAS гейт паритета пропускается, поэтому сборку 16.10 это не держит.
