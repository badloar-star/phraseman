# Task packet: убрать конвейер записанного звука Learning V2 из приложения и выпуска («только TTS»)

Governance-ID: TG-A0C261A4D23C
Governance-ID: TG-D5DFC34F2B94
Governance-ID: TG-BEFF3D1C0C56
Governance-ID: TG-6210FE02D210
Governance-ID: TG-1CAEB7FFAB3B
Status: Готово — 74b488a48 (приложение, тесты, pre-commit-сторож), 680974d97 (генераторы и гейты)
Owner: 5 · ВХОД И АККАУНТ (задание Codex № 5 передано владельцем 22.10: Codex без токенов)

## Outcome

Владелец 22.10: в занятиях только голос телефона (TTS), записанных mp3 нет. После перевода клиента и плеера на
device_system_tts_only (Learning V2, связка B) удалить из приложения генерат записанного звука и снять генераторы и гейты
выпуска, иначе конвейер вернёт файлы. Выигрыш — ≈ 8 МБ из бандла (см. release-bundle-size-cold-start-2026-10-22.md).

## Scope

Опись 22.10, до удаления.

Файлы приложения (удалить вместе с ленивыми require):
- app/learning_v2_factory_single_voice_v1.generated.ts ← app/learning_v2_factory_production_audio_v1.ts:34
- app/learning_v2_factory_lesson_audio_index_v1.generated.ts ← app/learning_v2_lesson_audio_pack_v1.ts:33
- app/learning_v2_factory_production_audio_entries_v1.generated.ts ← app/learning_v2_factory_production_audio_v1.ts:32
- app/learning_v2_published_audio_sessions_v1.generated.ts
- уточнить у Learning V2: app/learning_v2_bootstrap_audio_assets_v1.generated.ts (встроенные звуки урока) — в списке
  координатора его нет, без согласия не трогать.
Генераторы и гейты (scripts/): build_learning_v2_factory_single_voice_module.mjs, build_learning_v2_factory_lesson_audio_index.mjs,
build_learning_v2_factory_audio_module.mjs, learning_v2_reencode_bundle_audio_64k.mjs, check_learning_v2_storage_audio_inventory.mjs
(+ learning_v2_storage_audio_inventory.v1.json), learning_v2_ceiling_committed_gate.mjs, check_learning_v2_single_voice_committed.mjs,
build_learning_v2_bootstrap_audio_pack.mjs (уточнить), learning_v2_storage_audio_plan.mjs.
Выпуск, который их зовёт: scripts/release_precheck.mjs, scripts/build_rehearsal.sh,
scripts/learning_v2_refresh_voiced_release.sh (package.json и .husky/pre-commit их не зовут — проверено 22.10).
Сторожа: content_lazy_startup, learning_v2_no_audio_download_guard, learning_v2_lesson1_bundle_builds,
learning_v2_one_voice_per_task, learning_v2_continuous_map_perf_contract, learning_v2_released_audio_completeness_guard,
learning_v2_prewarm_index_audible_subset, release_precheck_learning_v2_failure_classification — переписать под «только TTS»
или удалить по смыслу.

## Architecture

Отдельные коммиты: (1) приложение — удалить 4 файла и ленивые require (Learning V2 уже переводит потребителей на TTS);
(2) выпуск — генераторы, гейты, их вызовы в release_precheck/build_rehearsal/refresh_voiced_release; (3) сторожа.

## Security and privacy

Не затрагиваются.

## Technical debt

functions/src/generated/support_repo_context.json упоминает файлы — пересобирается своим генератором поддержки.

## Verification

Проверка типов (по слоту), точечные тесты Learning V2 и выпуска; поиск остаточных ссылок по всем путям.

## Rollback

`git revert <hash>` по каждому коммиту.

## Опись после ответа Learning V2 (22.10, после 72f72a94e)

Удаляются целиком (в app/ после B никто не импортирует; Learning V2 подтвердил):
- 5 генератов: single_voice, lesson_audio_index, production_audio_entries, published_audio_sessions, bootstrap_audio_assets;
- 4 модуля: course_session_audio_preload_v1, lesson_audio_pack_v1, bootstrap_audio_seed_v1, factory_production_audio_v1;
- assets/audio/learning-v2-bootstrap-v1 (68 mp3, 4,9 МБ) — только записи фраз урока, звуков интерфейса нет.
Не трогать (Learning V2): learning_v2_session1_production_audio_v1, es_session1/es_session2_production_audio_v1,
modules/learning-v2/runtime/course_session_audio_child_v1.
Ворота: learning_v2_audio_coverage_gate (eas-build-post-install через plan_b_gates) — убрать сторож полноты записей,
проверка сборки выпущенных занятий (bundle_availability) остаётся; learning_v2_ceiling_committed_gate — сверять только
потолок. Чужая незакоммиченная правка Codex от 14.10 в tests/learning_v2_lesson1_bundle_builds.test.ts — файл удаляется
по смыслу («полная озвучка встроенных занятий»), правка сохранена патчем до удаления.

## Итог 22.10

- 74b488a48: 9 модулей/данных записей, 68 mp3, 12 сторожей; моки сняты в 7 тестах; контракт подготовки — прогрев
  НЕ готовит записи; pre-commit-сторож выпуска сессий без проверки пути поиска записей.
- 680974d97: 16 скриптов конвейера записей; audio_coverage_gate — только «выпущенные собираются из бандла»;
  ceiling_committed_gate — только потолок.
- Бандл: −8448 КБ исходника (две таблицы по ≈3,9 МБ), −1529 КБ mp3; итого ≈ −9,8 МБ.
- Проверка: полная проверка типов — 0 ошибок; связанные сьюты 12/12. Красные до правки и не связаны: pm212.probe
  (44 чужих побочных эффекта), гейт owner_reported_issues (строка 18), rune_reward_composite_gate (tsx не разбирает
  react-native).
- Не тронуто: scripts/generate_learning_v2_factory_production_audio.mjs (+test) — чужая незакоммиченная правка, решение
  за координатором; functions v2_canonical_generation_plan.test.ts — список путей, отсутствующий файл переносит так же,
  как уже удалённый activity_audio_preload_v1.
- Ворота потолка сейчас красные из-за ЧУЖОЙ незакоммиченной правки app/learning_v2_bundle_availability_v1.generated.ts.
