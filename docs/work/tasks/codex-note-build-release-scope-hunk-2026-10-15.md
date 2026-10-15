# Записка для Codex: в рабочей копии `build_release.mjs` лежит ханк Ядра (НЕ закоммичен)

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

## Дополнение 15.10 ~11:00 — решение владельца по 36 замечаниям: «Выпускаем 15, Codex чинит потом»

- Все 36 записаны точечно в `scripts/learning_v2_owner_approved_factory_findings.v1.json` (в git), совпадение по всем полям замечания.
- Фильтр — в том же нашем ханке `scopeFactoryReport` рабочей копии `build_release.mjs` (`ownerApprovedFactoryFindingKeys`), в git не положен.
- **Первым смотреть:** `locale_interaction_shape_mismatch` в `en/l01/s09`, index 14, `en:lesson-01:session-09:i15`. Форма задания у ru и uk различается.
- Остальные замечания по коду:
  - `practice_after_independent_boundary` — 20;
  - `intro_target_not_practiced` — 10;
  - `invalid_independent_boundary` — 3;
  - `independent_boundary_missing` — 2.

### Что открылось после снятия паузы

Пауза фабрики раньше обрывала `--check-source-release` до самой смысловой сверки. Теперь сверка выполняется и находит 135 расхождений между ИСХОДНИКАМИ (ваш незакоммиченный WIP) и выпуском.

По занятиям: s02 1, s05 23, s08 23, s09 87, s10 1.

По видам:
- `source_answer_missing` — 45;
- `source_raw_feedback_locale_parity` — 20 (s09);
- `answers.correctResponseId` source↔release — 8 (s09);
- `pair_grid_column_mismatch` — 6 (s05 i11);
- intro uk page 3 в s09: в исходнике «Не пропускайте `is`», в выпуске «Реакция на шутку».

Похоже, исходники уже ушли вперёд относительно выпущенной версии. Выпуск (то, что уезжает в приложение) согласован: файлы канон ↔ копия PASS, озвучка PASS. Нужен ваш ответ: исходники — это новая версия, которую надо заново выпустить, или откат?

## Исходники ушли вперёд выпуска: s05/s08/s09 — перевыпуск после релиза

Решение 15.10 (координатор, следствие слов владельца «выпускаем 15, Codex чинит потом»): для выпущенных s01–s15 сверка исходники ↔ выпуск — СПРАВКА (`ADVISORY`), не блок. Гейт `scripts/learning_v2_release_parity_gate.mjs` → `isReleasedSemanticDriftAdvisory`.

Пауза фабрики, сбой запуска и сверка всего курса по-прежнему блокируют.

Список 135 расхождений:

| Занятие | Расхождений |
|---|---|
| s02 | 1 |
| s05 | 23 |
| s08 | 23 |
| s09 | 87 |
| s10 | 1 |

По видам:
- `source_answer_missing` — 45 (s05, s08);
- `source_raw_feedback_locale_parity` — 20 (s09);
- `answers.correctResponseId` source↔release — 8 (s09);
- `pair_grid_column_mismatch` — 6 (s05 i11, ru/uk/answers);
- intro uk стр. 3 в s09 — заголовок, вопрос и варианты: в исходнике «Не пропускайте `is`», в выпуске «Реакция на шутку»;
- `practice_explanations_unvalidated` — 1 (s02);
- прочее — остальное.

Полный вывод: `node scripts/learning_v2_release_parity_gate.mjs`, строки `[BUILD][WARN] source_release_parity:…`.

Что сделать после релиза: перевыпустить s05/s08/s09 (и s02, s10) из ваших исходников, чтобы гейт сошёлся без справки.

## Типографика D145: mode_feedback_v1 — во временном исключении (15.10, координатор)

`modules/learning-v2/modes/mode_feedback_v1.tsx` (пакет V2, 48e9a2993) использует 5 размеров текста, кроме разрешённых 16/13.

- Сторож `tests/typography_two_sizes_ratchet.test.mjs` падал. Файл внесён в `config/typography-two-sizes-baseline.json` (поле `exemptions`): выпуск принят владельцем (D198).
- Вёрстку не трогали.
- Что сделать Codex в следующем обновлении: перевести размеры на шкалу `V2_TYPE` (16/21 и 13/17) и убрать файл из базы.
