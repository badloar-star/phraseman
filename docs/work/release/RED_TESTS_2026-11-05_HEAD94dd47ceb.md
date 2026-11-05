Governance-ID: TG-C0B92FBDFC71

# RED_TESTS — полный прогон на снимке HEAD 94dd47ceb (05.11, 16:28–17:38)

Снимок устарел на десятки коммитов: часть красного уже вылечена (плитки Plus, блокер типов, порог 96%). Перед починкой любого пункта — перепроверить точечно.

Итого: корневой прогон — красных файлов 237, функции — 52; тесты .mjs и .cjs — строки с крестиком в логах mjs.log (143) и cjs.log (13) в C:/Temp/claude/adm/full_gate.

Владелец определён по пути файла (эвристика); «последний коммит» — кто трогал тест последним.

## Learning V2 / курс — файлов: 132

| файл | упало | первый упавший | последний коммит |
|---|---|---|---|
| functions/src/content_factory/v2_required_session_publication.test.ts | 7 | publishes only the session-set pinned by the approved release/season/episode chain | 4792f3e59 |
| functions/src/content_factory/v2_unified_course_release_v2.test.ts | 6 | Learning V2 unified direct 32×56 course release v2 binds exactly 32 owner lessons and 1792 direct session coor | 68f4ef973 |
| functions/src/content_factory/v2_unified_course_release_v1.test.ts | 5 | unified Learning V2 course release binds all 32 owner episodes and every runtime projection into one canonical | 689a29414 |
| functions/src/content_factory/v2_unified_course_release_repository_v1.test.ts | 5 | unified release immutable repository persists A and B, atomically rolls back to exact A bytes, and reads one a | 1c450880c |
| functions/src/content_factory/v2_unified_course_release_confirmation_readback_v1.test.ts | 5 | Learning V2 unified release owner-confirmation readback reads all exact generations with bounded concurrency a | 1c450880c |
| tests/native_intent_v2_session_link.test.ts | 4 | [V2-HANDOFF] внешняя ссылка в занятие V2 (не стор-сборка) неканонический id → карта курса, а не «Сессия недост | a57a28c97 |
| tests/learning_v2_locale_gate.test.ts | 3 | Learning V2: курс только на языке интерфейса с пояснениями (R92) язык ещё не известен — вход не режется (маршр | 05cf3a61b |
| functions/src/content_factory/v2_unified_course_release_repository_v2.test.ts | 3 | Learning V2 direct 32×56 release repository v2 persists A and B, rolls back to exact A and cold-loads one acti | 68f4ef973 |
| tests/lesson33_pipeline.test.ts | 2 | lesson 33 pipeline protocol checks protocol file contents, not only file existence | ad0c7ed1d |
| tests/learning_v2_mode_feedback_lane.test.tsx | 2 | scripted repeat i14 renders the shared authored feedback lane | 9544a228d |
| functions/src/learning_v2/firestore_progress_event_store.integration.test.ts | 2 | Firestore progress adapter transaction ordering resolves the server-published session-set and rejects client s | 4792f3e59 |
| functions/src/content_factory/v2_unified_course_release_activation_v1.test.ts | 2 | Learning V2 unified release activation preflight binds all 32 exact owner confirmations without granting activ | 1c450880c |
| tests/gustav_fr_lesson_rebuild_candidate.test.ts | 1 | Gustav French lesson rebuild candidate creates a real isolated Lesson 1 candidate without app activation | d3278d400 |
| tests/classic_courses_pack_2026_11_04.test.ts | 1 | классические курсы: рантайм-данные es manifest.json совпадает с файлами (размер, sha256, rev) | c9fc7b59b |
| tests/learning_v2_scripted_repeat_player_lifecycle.test.tsx | 1 |   ● Test suite failed to run | 055c8c934 |
| tests/gustav_fr_lesson32_blueprint_rebuild_with_delivery.test.ts | 1 | Gustav French lesson 32 blueprint rebuild with delivery rebuilds Lesson 32 as French-native final review and k | d3278d400 |
| tests/gustav_fr_lesson26_blueprint_rebuild_with_delivery.test.ts | 1 | Gustav French lesson 26 blueprint rebuild with delivery rebuilds Lesson 26 as French-native si conditionals an | d3278d400 |
| tests/gustav_fr_lesson30_blueprint_rebuild_with_delivery.test.ts | 1 | Gustav French lesson 30 blueprint rebuild with delivery rebuilds Lesson 30 as French-native relative pronouns  | d3278d400 |
| tests/gustav_fr_lesson28_blueprint_rebuild_with_delivery.test.ts | 1 | Gustav French lesson 28 blueprint rebuild with delivery rebuilds Lesson 28 as French-native pronominal verbs a | d3278d400 |
| tests/gustav_fr_lesson31_blueprint_rebuild_with_delivery.test.ts | 1 | Gustav French lesson 31 blueprint rebuild with delivery rebuilds Lesson 31 as French-native causative/percepti | d3278d400 |
| tests/gustav_fr_lesson27_blueprint_rebuild_with_delivery.test.ts | 1 | Gustav French lesson 27 blueprint rebuild with delivery rebuilds Lesson 27 as French-native discours indirect  | d3278d400 |
| tests/gustav_fr_lesson29_blueprint_rebuild_with_delivery.test.ts | 1 | Gustav French lesson 29 blueprint rebuild with delivery rebuilds Lesson 29 as French-native imparfait past hab | d3278d400 |
| tests/gustav_fr_lesson25_blueprint_rebuild_with_delivery.test.ts | 1 | Gustav French lesson 25 blueprint rebuild with delivery rebuilds Lesson 25 as French-native imparfait/passé co | d3278d400 |
| tests/gustav_fr_lesson02_delivery_gate_chain.test.ts | 1 | Gustav French lesson 2 delivery gate chain creates closed audio/server/runtime/cache/activation gates without  | d3278d400 |
| tests/gustav_fr_lesson24_blueprint_rebuild_with_delivery.test.ts | 1 | Gustav French lesson 24 blueprint rebuild with delivery rebuilds Lesson 24 as French-native present-perfect fu | d3278d400 |
| tests/gustav_fr_lesson23_blueprint_rebuild_with_delivery.test.ts | 1 | Gustav French lesson 23 blueprint rebuild with delivery rebuilds Lesson 23 as French-native passive voice and  | d3278d400 |
| tests/gustav_fr_lesson21_blueprint_rebuild_with_delivery.test.ts | 1 | Gustav French lesson 21 blueprint rebuild with delivery rebuilds Lesson 21 as French-native indefinite/negativ | d3278d400 |
| tests/gustav_fr_lesson22_blueprint_rebuild_with_delivery.test.ts | 1 | Gustav French lesson 22 blueprint rebuild with delivery rebuilds Lesson 22 as French-native infinitive/gerondi | d3278d400 |
| tests/gustav_fr_lesson12_blueprint_rebuild_with_delivery.test.ts | 1 | Gustav French lesson 12 blueprint rebuild with delivery rebuilds Lesson 12 as French-native irregular passe co | d3278d400 |
| tests/gustav_fr_lesson15_blueprint_rebuild_with_delivery.test.ts | 1 | Gustav French lesson 15 blueprint rebuild with delivery rebuilds Lesson 15 as French-native possessive determi | d3278d400 |
| tests/gustav_fr_lesson13_blueprint_rebuild_with_delivery.test.ts | 1 | Gustav French lesson 13 blueprint rebuild with delivery rebuilds Lesson 13 as French-native futur proche and k | d3278d400 |
| tests/gustav_fr_lesson10_blueprint_rebuild_with_delivery.test.ts | 1 | Gustav French lesson 10 blueprint rebuild with delivery rebuilds Lesson 10 as French-native modal verbs and ke | d3278d400 |
| tests/gustav_fr_lesson14_blueprint_rebuild_with_delivery.test.ts | 1 | Gustav French lesson 14 blueprint rebuild with delivery rebuilds Lesson 14 as French-native comparatif and kee | d3278d400 |
| tests/gustav_fr_lesson09_blueprint_rebuild_with_delivery.test.ts | 1 | Gustav French lesson 9 blueprint rebuild with delivery rebuilds Lesson 9 as French-native il y a and keeps del | d3278d400 |
| tests/gustav_fr_lesson11_blueprint_rebuild_with_delivery.test.ts | 1 | Gustav French lesson 11 blueprint rebuild with delivery rebuilds Lesson 11 as French-native passe compose with | d3278d400 |
| tests/gustav_fr_lesson19_blueprint_rebuild_with_delivery.test.ts | 1 | Gustav French lesson 19 blueprint rebuild with delivery rebuilds Lesson 19 as French-native B1 place-prepositi | d3278d400 |
| tests/gustav_fr_lesson20_blueprint_rebuild_with_delivery.test.ts | 1 | Gustav French lesson 20 blueprint rebuild with delivery rebuilds Lesson 20 as French-native B1 article grammar | d3278d400 |
| tests/classic_theory_drills_contract.test.ts | 1 | classic theory view: drills built from theory.json it: every drill has one plain instruction, first drill of a | 537e3d084 |
| tests/gustav_fr_lesson06_blueprint_rebuild_with_delivery.test.ts | 1 | Gustav French lesson 6 blueprint rebuild with delivery rebuilds Lesson 6 as French-native open questions and k | d3278d400 |
| tests/gustav_fr_lesson08_blueprint_rebuild_with_delivery.test.ts | 1 | Gustav French lesson 8 blueprint rebuild with delivery rebuilds Lesson 8 as French-native time markers and kee | d3278d400 |
| tests/gustav_fr_lesson16_blueprint_rebuild_with_delivery.test.ts | 1 | Gustav French lesson 16 blueprint rebuild with delivery rebuilds Lesson 16 as French-native idiomatic verb con | d3278d400 |
| tests/gustav_fr_lesson17_blueprint_rebuild_with_delivery.test.ts | 1 | Gustav French lesson 17 blueprint rebuild with delivery rebuilds Lesson 17 as French-native current-action gra | d3278d400 |
| tests/gustav_fr_lesson07_blueprint_rebuild_with_delivery.test.ts | 1 | Gustav French lesson 7 blueprint rebuild with delivery rebuilds Lesson 7 as French-native avoir and keeps deli | d3278d400 |
| tests/gustav_fr_lesson05_blueprint_rebuild_with_delivery.test.ts | 1 | Gustav French lesson 5 blueprint rebuild with delivery rebuilds Lesson 5 as French-native yes/no questions and | d3278d400 |
| tests/gustav_fr_lesson18_blueprint_rebuild_with_delivery.test.ts | 1 | Gustav French lesson 18 blueprint rebuild with delivery rebuilds Lesson 18 as French-native imperative/request | d3278d400 |
| tests/gustav_fr_lesson03_blueprint_rebuild_with_delivery.test.ts | 1 | Gustav French lesson 3 blueprint rebuild with delivery rebuilds Lesson 3 as present-tense affirmative actions  | d3278d400 |
| tests/gustav_fr_lesson04_blueprint_rebuild_with_delivery.test.ts | 1 | Gustav French lesson 4 blueprint rebuild with delivery rebuilds Lesson 4 as present-tense negation and keeps d | d3278d400 |
| tests/gustav_fr_lesson01_blueprint_rebuild_explicit_activation_receipt_gate.test.ts | 1 | Gustav French lesson 1 blueprint rebuild explicit activation receipt gate requires LLM/source review plus all  | d3278d400 |
| tests/gustav_fr_lesson02_review_pipeline.test.ts | 1 | Gustav French lesson 2 review pipeline creates packet, accepted decisions, decision gate and RU/UK pack candid | d3278d400 |
| tests/gustav_fr_lesson01_blueprint_rebuild_payload_hash_lock_gate.test.ts | 1 | Gustav French lesson 1 blueprint rebuild payload/hash-lock gate plans isolated payload and hash-lock outputs w | d3278d400 |
| tests/gustav_fr_lesson_llm_review_requests.test.ts | 1 | Gustav French lesson LLM official-source review requests creates one strict request per lesson row without fil | d3278d400 |
| tests/gustav_fr_lesson01_blueprint_rebuild_runtime_cache_integrity_gate.test.ts | 1 | Gustav French lesson 1 blueprint rebuild runtime cache integrity gate derives cache identity from app manifest | d3278d400 |
| tests/gustav_fr_lesson01_blueprint_rebuild_server_upload_evidence_gate.test.ts | 1 | Gustav French lesson 1 blueprint rebuild server upload evidence gate keeps upload evidence missing and blocks  | d3278d400 |
| tests/gustav_fr_lesson01_blueprint_rebuild_server_pack_manifest_gate.test.ts | 1 | Gustav French lesson 1 blueprint rebuild server pack manifest gate drafts source-locale-scoped server entries  | d3278d400 |
| tests/gustav_fr_lesson01_blueprint_rebuild_rollback_manifest_gate.test.ts | 1 | Gustav French lesson 1 blueprint rebuild rollback manifest gate drafts source-locale-scoped rollback entries w | d3278d400 |
| tests/gustav_fr_lesson02_blueprint_rebuild_pack.test.ts | 1 | Gustav French lesson 2 blueprint rebuild pack creates a French-native negation/question lesson with isolated R | d3278d400 |
| tests/learning_v2_session_intro_feedback_behavior.test.tsx | 1 | intro shows only concise error feedback after wrong answers and no analysis after a correct answer | a82a3b220 |
| tests/gustav_fr_lesson_correction_candidate_review_requests.test.ts | 1 | Gustav French correction candidate review requests builds isolated fresh LLM review requests for corrected les | d3278d400 |
| tests/lesson_exit_sheet_contract.test.tsx | 1 | окно выхода из урока снято (владелец 22.10) lesson1 сохраняет ответы и место после каждого ответа и восстанавл | 078617ada |
| tests/gustav_fr_lesson_correction_candidate_review_external_handoff.test.ts | 1 | Gustav French correction candidate review external handoff creates a safe outside-Codex runner for the separat | d3278d400 |
| tests/gustav_fr_lesson_llm_review_execution_runner.test.ts | 1 | Gustav French lesson LLM review execution runner defaults to dry-run and keeps LLM spending, decision writes a | d3278d400 |
| tests/gustav_fr_lesson01_blueprint_rebuild_pack_draft.test.ts | 1 | Gustav French lesson 1 blueprint rebuild pack draft materializes reviewed Lesson 1 into isolated RU/UK pack dr | d3278d400 |
| tests/gustav_fr_lesson_hash_lock_materialization_contract.test.ts | 1 | Gustav French lesson hash-lock materialization contract requires source-locale rollback hash locks before mani | d3278d400 |
| tests/gustav_fr_lesson01_review_draft_llm_packet.test.ts | 1 | Gustav French lesson 1 review-draft LLM packet creates a strict request-only official-source review packet for | d3278d400 |
| tests/gustav_fr_lesson01_blueprint_rebuild_audio_tts_manifest_gate.test.ts | 1 | Gustav French lesson 1 blueprint rebuild audio/TTS manifest gate creates isolated RU/UK TTS slots while keepin | d3278d400 |
| tests/gustav_fr_lesson_manifest_rewrite_hash_lock_gate.test.ts | 1 | Gustav French lesson manifest rewrite/hash-lock gate blocks server manifest rewrite until payload hashes, byte | d3278d400 |
| tests/gustav_fr_lesson_server_upload_evidence_gate.test.ts | 1 | Gustav French lesson server upload evidence gate requires remote evidence before runtime delivery can open | d3278d400 |
| tests/gustav_fr_lesson01_pack_candidate.test.ts | 1 | Gustav French lesson 1 pack candidate materialization writes RU and UK source-locale pack candidates while kee | d3278d400 |
| tests/gustav_fr_lesson01_blueprint_rebuild_runtime_delivery_gate.test.ts | 1 | Gustav French lesson 1 blueprint rebuild runtime delivery gate proves Lesson 1 runtime delivery remains a clos | d3278d400 |
| tests/gustav_fr_lesson_server_upload_policy_gate.test.ts | 1 | Gustav French lesson server upload policy gate keeps French server upload closed until paths, checksums, paylo | d3278d400 |
| tests/gustav_fr_lesson_non_accepted_fix_work_order.test.ts | 1 | Gustav French lesson non-accepted fix work order materializes isolated reviewer-only queues for known non-acce | d3278d400 |
| tests/gustav_fr_lesson_hash_lock_writer_dry_run_gate.test.ts | 1 | Gustav French lesson hash-lock writer dry-run gate previews the future hash-lock manifest while keeping the re | d3278d400 |
| tests/gustav_fr_lesson_manifest_writer_apply_boundary_gate.test.ts | 1 | Gustav French lesson manifest writer/apply boundary gate prevents one-step promotion from manifest rewrite to  | d3278d400 |
| tests/gustav_fr_lesson_server_payload_materialization_gate.test.ts | 1 | Gustav French lesson server payload materialization gate defines isolated future payload outputs and keeps mat | d3278d400 |
| tests/gustav_fr_lesson_server_pack_manifest_gate.test.ts | 1 | Gustav French lesson server pack manifest gate creates source-locale-scoped French server manifest drafts with | d3278d400 |
| tests/gustav_fr_lesson_review_queue.test.ts | 1 | Gustav French lesson review queue queues all rebuilt French lesson rows for LLM/source review without auto-acc | d3278d400 |
| tests/lesson_words_training_queue_guard.test.ts | 1 | lesson words training queue guard waits for stored progress before mounting vocabulary training | 703287796 |
| tests/gustav_fr_lesson_non_accepted_rows_gate.test.ts | 1 | Gustav French lesson non-accepted rows gate blocks audio/server/runtime until every reviewed row is accepted a | d3278d400 |
| tests/gustav_fr_lesson01_blueprint_rebuild_candidate.test.ts | 1 | Gustav French lesson 1 blueprint rebuild candidate creates a readable 50-row French-native A1 lesson from the  | d3278d400 |
| tests/lessons_tabs_memory.test.ts | 1 | вкладка «Обучение»: карта V2 по умолчанию, старые уроки — кнопкой стартовая страница всегда Classic после реше | 078617ada |
| tests/gustav_fr_lesson01_blueprint_rebuild_theory_vocab_pack.test.ts | 1 | Gustav French lesson 1 blueprint rebuild theory/vocab pack builds theory, vocabulary groups, and practice hook | d3278d400 |
| tests/gustav_fr_lesson_llm_review_external_handoff.test.ts | 1 | Gustav French lesson LLM review external handoff creates a safe outside-Codex execution handoff for pending re | d3278d400 |
| tests/gustav_fr_lesson02_review_draft.test.ts | 1 | Gustav French lesson 2 full review draft creates a no-apply A1 French-native negation/question draft with 50 r | d3278d400 |
| tests/gustav_fr_core_lesson_delivery_closeout_bridge_gate.test.ts | 1 | Gustav French core lesson delivery closeout bridge gate summarizes the remaining core lesson production blocke | d3278d400 |
| tests/gustav_english_lesson_surgical_blueprint.test.ts | 1 | Gustav English lesson surgical blueprint analyzes every English lesson, vocabulary slot, distractor shape, the | 9f46ea4cc |
| tests/lesson_first_try_counts.test.ts | 1 | итог урока по первым попыткам экран итога берёт счёт из модуля первых попыток; балл и звёзды — по итоговому пр | e2137389a |
| tests/gustav_fr_lesson_correction_candidate_work_order.test.ts | 1 | Gustav French lesson correction candidate work order materializes reviewer correction payloads as isolated can | d3278d400 |
| tests/gustav_fr_lesson_llm_review_decision_progress_gate.test.ts | 1 | Gustav French lesson LLM review decision progress gate tracks partial decision coverage and next resume point  | d3278d400 |
| tests/gustav_fr_lesson01_review_draft.test.ts | 1 | Gustav French lesson 1 full review draft creates a readable no-apply draft with 50 French-native rows, wordsFr | d3278d400 |
| tests/gustav_fr_lesson_missing_review_batch_work_order.test.ts | 1 | Gustav French missing LLM review batch work order materializes the remaining review batches without calling Op | d3278d400 |
| tests/gustav_fr_lesson_decision_import_source_gate.test.ts | 1 | Gustav French lesson decision import source gate accepts only the canonical French reviewer decision source an | d3278d400 |
| tests/gustav_fr_lesson_llm_review_batch_plan.test.ts | 1 | Gustav French lesson LLM review batch plan plans resumable paid-review batches without calling OpenAI or openi | d3278d400 |
| tests/gustav_fr_lesson01_audio_tts_manifest_gate.test.ts | 1 | Gustav French lesson 1 audio TTS manifest gate prepares source-locale TTS slots but keeps audio/server/runtime | d3278d400 |
| tests/gustav_fr_surgical_lesson_work_order.test.ts | 1 | Gustav French surgical lesson work order turns the English surgical blueprint into strict no-generation work o | d3278d400 |
| tests/gustav_fr_lesson_runtime_delivery_gate.test.ts | 1 | Gustav French lesson runtime delivery gate keeps French lesson packs out of runtime delivery until review, aud | d3278d400 |
| tests/gustav_fr_lesson01_theory_materialization.test.ts | 1 | Gustav French lesson 1 theory materialization writes a French-native theory candidate with English theory shap | d3278d400 |
| tests/gustav_fr_lesson_llm_review_execution_readiness_gate.test.ts | 1 | Gustav French lesson LLM review execution readiness gate separates prepared requests from live execution, deci | d3278d400 |
| tests/gustav_fr_lesson01_blueprint_rebuild_review_gate.test.ts | 1 | Gustav French lesson 1 blueprint rebuild review gate accepts all reviewed Lesson 1 rows while keeping producti | d3278d400 |
| tests/gustav_fr_lesson_review_route_materialization_gate.test.ts | 1 | Gustav French lesson review route materialization gate allowlists only isolated reviewer outputs and keeps app | d3278d400 |
| tests/gustav_fr_lesson_audio_manifest_gate.test.ts | 1 | Gustav French lesson audio manifest gate plans all lesson audio slots but blocks TTS/server/runtime until LLM  | d3278d400 |
| tests/gustav_fr_theory_vocab_intro_parity_gate.test.ts | 1 | Gustav French theory/vocabulary/intro parity gate proves all 32 lessons have French theory, vocabulary and ser | d3278d400 |
| tests/lesson_was_perfect_first_try.test.ts | 1 | показ ИДЕАЛ не зависит от сводки прохождения; журнал [LESSON-RESULT] решение m09 строится из счёта первых попы | e2137389a |
| tests/gustav_fr_lesson_llm_review_partial_quarantine_gate.test.ts | 1 | Gustav French LLM review partial quarantine gate allows resume tracking while keeping partial decisions away f | d3278d400 |
| tests/gustav_fr_lesson02_next_pass_work_order.test.ts | 1 | Gustav French lesson 2 next-pass work order prepares the next large pass from the English negation/question bl | d3278d400 |
| tests/gustav_fr_lesson_audio_tts_batch_plan.test.ts | 1 | Gustav French lesson audio TTS batch plan plans resumable TTS batches but blocks live audio until all rows are | d3278d400 |
| tests/gustav_fr_lesson01_review_draft_llm_decisions_codex.test.ts | 1 | Gustav French lesson 1 Codex LLM-style official-source decisions writes 50 accepted review-draft decisions wit | d3278d400 |
| tests/gustav_fr_lesson_review_outcome_routing_gate.test.ts | 1 | Gustav French lesson review outcome routing gate keeps accepted/regeneration/rejected/skipped routes closed un | d3278d400 |
| tests/gustav_fr_lesson01_integrity_gate.test.ts | 1 | Gustav French lesson 1 combined integrity gate accepts structural integrity across pack, theory, review and au | d3278d400 |
| tests/learning_v2_system_tts_only.test.ts | 1 | Learning V2 system TTS only opts every live Learning V2 speech surface into device TTS | 72f72a94e |
| tests/gustav_fr_lesson_llm_review_live_handoff.test.ts | 1 | Gustav French LLM review live handoff prints the bounded first live command without spending, importing or ope | d3278d400 |
| tests/gustav_fr_lesson_correction_candidate_review_decision_schema_gate.test.ts | 1 | Gustav French correction candidate review decision schema gate keeps corrected candidates on HOLD until a comp | d3278d400 |
| tests/gustav_fr_lesson_review_materialized_integrity_gate.test.ts | 1 | Gustav French lesson review materialized integrity gate keeps materialized artifacts absent and audio/server/r | d3278d400 |
| tests/gustav_fr_lesson_cefr_reclassification_plan.test.ts | 1 | Gustav French lesson CEFR reclassification plan creates a no-apply metadata plan for all 32 French lessons and | d3278d400 |
| tests/gustav_fr_lesson_review_decision_import_dry_run.test.ts | 1 | Gustav French lesson review decision import dry-run waits for schema-valid LLM decisions before any reviewed l | d3278d400 |
| tests/gustav_fr_lesson_correction_candidate_review_import_dry_run.test.ts | 1 | Gustav French correction candidate review import dry-run waits for schema-valid correction decisions before st | d3278d400 |
| tests/gustav_fr_lesson_decision_staging_gate.test.ts | 1 | Gustav French lesson decision staging gate keeps external/canonical decision staging dry-run only until a 1600 | d3278d400 |
| tests/gustav_fr_lesson_audio_checksum_gate.test.ts | 1 | Gustav French lesson audio checksum gate keeps server/runtime closed until all 1600 mp3 files exist and match  | d3278d400 |
| tests/gustav_core_lessons_sequence_reconciliation.test.ts | 1 | Gustav French lesson sequence reconciliation keeps current generated lesson ledgers on HOLD and creates builde | c65476519 |
| tests/gustav_fr_lesson01_review_draft_llm_decision_gate.test.ts | 1 | Gustav French lesson 1 review-draft LLM decision gate allows only materialization contract after 50 accepted o | d3278d400 |
| tests/lesson_menu_trace_contract.test.ts | 1 | lesson_menu: трассировка [LESSON-MENU] обработчики старта: вход, ранние выходы с причиной, навигация | 6ddbd5f6d |
| tests/gustav_core_lessons_scope_sequence_work_order.test.ts | 1 | Gustav fr-002 core lessons scope sequence work order creates a French-specific 32-lesson sequence while keepin | c65476519 |
| tests/classic_lesson_topics_fresh.test.ts | 1 | classic lesson topics file is fresh app/classic_lesson_topics.gen.ts matches theory.json (run: node scripts/ge | be7dd6d79 |
| functions/src/content_factory/v2_course_released_session_adapter_v2.test.ts | 1 |   ● Test suite failed to run | 68f4ef973 |
| functions/src/content_factory/v2_unified_course_release_repository_v3.test.ts | 1 |   ● Test suite failed to run | 68f4ef973 |
| functions/src/content_factory/v2_unified_course_release_v3.test.ts | 1 |   ● Test suite failed to run | 68f4ef973 |
| functions/src/content_factory/v2_course_released_session_adapter_v3.test.ts | 1 |   ● Test suite failed to run | 68f4ef973 |
| functions/src/content_factory/v2_activity_released_session_callable_v1.test.ts | 1 | Learning V2 released Activity session callable requires Auth/App Check and returns only the checked learner pa | 1c450880c |
| functions/src/learning_v2/activity_released_session_submission_callable_v2.test.ts | 1 | Learning V2 released submission callable rebinds identity, evaluates against active package+sidecar and stores | 1c450880c |
| functions/src/learning_v2/activity_released_session_completion_callable_v1.test.ts | 1 |   ● Test suite failed to run | 68f4ef973 |
| functions/src/content_factory/v2_course_active_catalog_callable_v1.test.ts | 1 | Learning V2 active course catalog callable maps non-HTTP resolver errors to a generic unavailable response | 68f4ef973 |
| functions/src/content_factory/v2_activity_auxiliary_session_callable_v1.test.ts | 1 | Learning V2 activity auxiliary session callable requires Auth and App Check outside an explicit demo emulator | 1c450880c |
| functions/src/learning_v2_access_production_callable.test.ts | 1 | V2 production access callable seam keeps App Check and the production export wired | a36ad0450 |

## не определён — файлов: 41

| файл | упало | первый упавший | последний коммит |
|---|---|---|---|
| tests/classic_data_no_english_source_guard.test.ts | 10 | данные классики: язык интерфейса получает свой текст, а не английский источник es / theory.json | be9d586e0 |
| tests/phrase_workshop_wiring_2026_10_25.test.ts | 3 | мастерская фраз: экран урока (lesson1) никаких зачётов старого курса: разблокировка, ошибки, «последний урок», | 99ea06049 |
| tests/light_accent_graphics_ratchet.test.ts | 3 | графика на сыром accent в светлой теме (храповик) в файле нет новых мест сверх базовой линии | 524ee6c6f |
| tests/gustav_fr_daily_phrase_production_v1_gate.test.ts | 2 | Gustav French Daily Phrases production v1 gate accepts a source-backed 176-row French idiom/expression subset  | d3278d400 |
| tests/i18n_missing_en_fallback.test.ts | 2 | no unguarded direct reads of a language dictionary that lacks `en` scan_direct_lang_index finds no new unguard | 1d0187b88 |
| tests/render_test_registry_contract.test.ts | 2 | render tests are registered in both runners every render-config entry points to an existing test file | d4c10f643 |
| tests/phone_state_native_config_contract.test.ts | 2 | Android backup whitelist excludes encrypted PhoneState databases | efe19ae9d |
| tests/english_ui_enable_preflight.test.ts | 2 | English interface enable preflight (crash of 27.08 must not repeat) there are ZERO language dictionaries witho | 97f63a0bd |
| tests/jest_write_guard.test.ts | 2 | Jest source write guard blocks tests from writing into application source files | b62b419ba |
| tests/scroll_inertia_contract.test.ts | 1 | scroll inertia contract requires explicit sharp deceleration on every ordinary app scroll surface | 50eea79a4 |
| tests/screen_back_content_below_contract.test.ts | 1 | ЗАМОК ВЛАДЕЛЬЦА 22.10: контент начинается ниже кнопки «назад/✕» и не лежит под ней экран с общей кнопкой резер | 99abc00dc |
| tests/test_runner_coverage_contract.test.ts | 1 | раннеры тестов каждая запись testMatch без шаблона указывает на существующий файл | 54308265a |
| tests/optimistic_ui_audit_r1_contract.test.ts | 1 | Optimistic UI audit R1 — cheap gaps stay closed comment reactions, pins, deletes and hides roll back and tell  | bbd479b74 |
| tests/gustav_fr_activation_completion_audit_v2.test.ts | 1 | Gustav French activation completion audit v2 keeps French production activation on HOLD until every content, a | d3278d400 |
| tests/rune_balance_snapshot_preservation_contract.test.ts | 1 | Rune balance survives every snapshot progress rebuild no other module rebuilds the progress section without ca | 589d11248 |
| tests/owner_locks_announcements_2026_10_28.test.ts | 1 | замок владельца 28.10 — объявления = макет (36 шаблонов) гейт: results.json снят с текущего макета, порог = за | 5de36ea7e |
| tests/feedback_outbox.test.ts | 1 | general feedback outbox delivery receipt serializes mount flush and enqueue so a delayed dequeue cannot erase  | 50eea79a4 |
| tests/gustav_french_dev_surface_parity.test.ts | 1 | Gustav French dev surface parity keeps Gustav source-of-truth docs on LLM official-source review instead of hu | c1f840a29 |
| tests/v2done_top_fade_and_repeat.test.ts | 1 | «Итог урока»: «Повторить ошибки» и подпись подпись под «Урок пройден» — только тема урока, как в эталоне m10 ( | 58b094a3b |
| tests/heisenberg_review_gate.test.ts | 1 | Heisenberg human review gate apply dry-run reports and rejects a machine-only GO ledger | b86873d57 |
| tests/daily_poll_card_contract.test.ts | 1 | daily poll card source contract вкладка «Друзья» показывает карточку первым блоком списка | a882a1427 |
| tests/gustav_fr_personal_practice_native_bank_review_chain.test.ts | 1 | Gustav French personal practice native bank review chain prepares external execution and keeps post-review gat | d3278d400 |
| tests/source_guard_eol_normalized_contract.test.ts | 1 | source guards that compare multiline text read files through normalizeEol/readSource | a2f943bde |
| tests/gustav_fr_legacy_seed_quarantine_gate.test.ts | 1 | Gustav French legacy seed quarantine gate prevents old French seed lessons and early L1/L2 candidates from bec | d3278d400 |
| tests/max_removed_contract.test.ts | 1 | MAX removed (owner 2026-10-04) MAX упоминается только в разрешённых местах | 996173bc8 |
| tests/level_spin_star_callable_retired.test.ts | 1 | spin logic stays deleted: no server spin modules, no spin source in the wallet white list | 4d1c8004b |
| tests/app_messages_read_persistence_ui_contract.test.ts | 1 | app messages read persistence UI contract keeps unread dots outside the text flow so inbox rows stay centered | d7f171eef |
| tests/gustav_fr_personal_practice_native_bank_candidate.test.ts | 1 | Gustav French personal practice native bank candidate materializes 56 French-native practice slots without ope | d3278d400 |
| tests/number_noun_pairs_guard.test.ts | 1 | число + существительное на экранах R1 в экранах R1 нет склейки «число + слово» вне помощника склонения (сканер | 768a01af2 |
| tests/skeleton_geom_log.test.ts | 1 | журнал [SKELETON-GEOM] шесть экранов подключены: и скелетон, и готовый блок мерят одно имя экрана | 21c0a936a |
| tests/gustav_fr_personal_practice_native_bank_review_requests.test.ts | 1 | Gustav French personal practice native bank review requests builds strict LLM review requests for all 56 nativ | d3278d400 |
| tests/gustav_fr_blueprint_surface_parity.test.ts | 1 | Gustav French blueprint surface parity plan maps every English surface to a French-native build plan without a | d3278d400 |
| tests/gustav_fr_conjugation_drill_gate.test.ts | 1 | Gustav French conjugation drill gate materializes French-native conjugation drills as the irregular-verb equiv | d3278d400 |
| tests/gustav_fr_preposition_drill_gate.test.ts | 1 | Gustav French preposition drill gate materializes French-native preposition drills as server-pack candidates w | d3278d400 |
| tests/gustav_fr_app_level_parity_gate.test.ts | 1 | Gustav French app-level parity gate maps French lessons to app A1/A2/B1/B2 and keeps production on HOLD until  | d3278d400 |
| tests/progress_preservation_owner_lock_2026_11_04.test.ts | 1 | ЗАМОК ВЛАДЕЛЬЦА 04.11: прогресс старого курса не удаляется число удалений ключей хранилища не выросло ни в одн | 3eaf064ad |
| tests/gustav_english_blueprint_extractor.test.ts | 1 | Gustav English blueprint extractor materializes the English app blueprint before French content parity can pas | 9f46ea4cc |
| tests/gustav_fr_daily_phrase_global_readiness_bridge_gate.test.ts | 1 | Gustav French Daily Phrase global readiness bridge gate marks Daily Phrases as locally ready while global Fren | d3278d400 |
| tests/gustav_fr_storage_cloud_isolation_bridge_gate.test.ts | 1 | Gustav French storage/cloud isolation bridge gate promotes storage/cloud isolation evidence while keeping migr | d3278d400 |
| tests/gustav_fr_grammar_drill_global_readiness_bridge_gate.test.ts | 1 | Gustav French grammar drill global readiness bridge gate closes the local preposition/conjugation materializat | d3278d400 |
| tests/android_clipping_crash_guard.test.ts | 1 | Android clipping crash guard keeps app-owned virtualized lists out of ReactClippingViewManager | ad0c7ed1d |

## Админка / Джарвис / функции — файлов: 40

| файл | упало | первый упавший | последний коммит |
|---|---|---|---|
| functions/src/support_inbox_triage.test.ts | 28 | supportInboxOnNewMail — full trigger wiring, not just its pure parts live guarded mode seals one council-revie | fb1c86ff5 |
| tests/admin_revenue_analytics_contract.test.ts | 5 | admin revenue analytics contract unifies Reports and User reports cards with the clean admin style | a75d8ee22 |
| functions/src/tournament_pool_v11_dry_run.test.ts | 5 | tournament v11 zero-write dry-run artifacts emits the complete hash-pinned audit packet without provider calls | 6c02e4088 |
| tests/gustav_fr_daily_phrase_admin_workflow_handlers.test.ts | 3 | Gustav French Daily Phrases admin workflow handlers builds RU and UK previews from the accepted French Daily P | d3278d400 |
| functions/src/content_factory/v2_episode_localization_release_index_v1.test.ts | 3 | V2 episode localization release index binds eight ordered locale indexes and all twelve distinct session gener | 1c450880c |
| functions/src/content_factory/v2_e1_compilation_worker.test.ts | 2 | V2 E1 compilation worker compiles the queued job into an artifact, succeeds stages and replays idempotently | 1c450880c |
| functions/src/content_factory/v2_content_compilation.test.ts | 2 | compiles only when the resolved profile body matches the pinned hash | 4792f3e59 |
| functions/src/resend_secret_contract.test.ts | 2 | RESEND_API_KEY Secret Manager contract binds the secret to every deployed runtime that can send through Resend | db402696b |
| functions/src/gift_perk_producers_contract.test.ts | 2 | canonical server-owned gift perk producers keeps new authority callables in both selective deployment commands | efe19ae9d |
| tests/gustav_fr_admin_activation_rollback_gate.test.ts | 1 | Gustav French admin activation/rollback gate keeps activation blocked and rollback sourceLocale-scoped until e | d3278d400 |
| tests/gustav_fr_admin_source_locale_write_contract.test.ts | 1 | Gustav admin sourceLocale write contract requires sourceLocale-scoped official French admin write candidates a | d3278d400 |
| tests/admin_legacy_detailed_analytics_contract.test.ts | 1 | live legacy detailed analytics integration exposes cached protected callable bridges exactly once without dire | 96c32bb97 |
| tests/gustav_fr_admin_equivalence_matrix.test.ts | 1 | Gustav French admin target equivalence matrix maps every required official French admin surface and keeps bloc | d3278d400 |
| tests/gustav_fr_admin_write_path_isolation_gate.test.ts | 1 | Gustav French admin write-path isolation gate separates existing marketplace/UGC writes from official French c | d3278d400 |
| tests/gustav_fr_admin_global_readiness_bridge_gate.test.ts | 1 | Gustav French admin global readiness bridge gate summarizes admin parity/isolation/rollback readiness without  | d3278d400 |
| tests/gustav_fr_admin_parity_isolation_gate.test.ts | 1 | Gustav French admin parity/isolation gate keeps French admin delivery in HOLD while mapping exact production a | d3278d400 |
| tests/gustav_admin_website_parity_atlas.test.ts | 1 | Gustav admin website parity atlas keeps admin/index.html parity as a French production blocker until mapped | c65476519 |
| functions/src/content_factory/v2_canonical_generation_plan.test.ts | 1 | pure canonical V2 generation plan is not imported by the live second-queue callable path | 54308265a |
| functions/src/content_factory/v2_generator_owner_e2e_seam_v1.test.ts | 1 | Learning V2 neutral owner-generator E2E seam connects canonical plan, manual import, preview, synthetic confir | 1c450880c |
| functions/src/tournament_pool_v11_bundle.test.ts | 1 |   ● Test suite failed to run | fb1c86ff5 |
| functions/src/user_ideas.test.ts | 1 | adminDecideUserIdea refuses a non-admin caller | 0217c4a21 |
| functions/src/support_25_letters_sim.test.ts | 1 | 25 писем: как Джарвис поступит с каждым на дружелюбный ответ без утверждений система даёт зелёный свет | 33bedd3cf |
| functions/src/tournament_pool_v11_runtime.test.ts | 1 |   ● Test suite failed to run | 6c02e4088 |
| functions/src/record_age_consent_snapshot.test.ts | 1 | recordAgeConsentSnapshot callable identity boundary uses strict App Check and canonical resolver options and i | 95eec1717 |
| functions/src/jarvis/learning_metrics.test.ts | 1 | server-owned learning cohort metrics progress writer prepares metrics before spin reads and commits them only  | efe19ae9d |
| functions/src/jarvis/legacy_agent_rules_guard.test.ts | 1 | Legacy agent collections stay closed to clients even after the code was removed the legacy admin catch-all sti | e7eb7d316 |
| functions/src/tournament_pool_v11_selector.test.ts | 1 |   ● Test suite failed to run | 6c02e4088 |
| functions/src/pm229_server_silent_catch.test.ts | 1 | PM-229 server silent catch ratchet новых немых catch нет (ратчет) | 495c9f3ad |
| functions/src/content_factory/v2_episode_content_qa.test.ts | 1 | passes a well-formed compiled unit | 4792f3e59 |
| functions/src/pm230_admin_callable_guard.test.ts | 1 | PM-230 admin callables: проверка прав каждый admin*-эндпоинт проверяет права сам или через перечисленный обраб | 9082014f7 |
| functions/src/dialogue_ai_language_source_contract.test.ts | 1 | dialogue server language isolation source contract validates review targets before identity, evidence, rate-li | bf95cb1c9 |
| functions/src/app_check_sealed.test.ts | 1 | App Check запломбирован навсегда (решение владельца 2026-08-17) ни одна боевая функция не требует App Check | a36ad0450 |
| functions/src/friend_block.test.ts | 1 |   ● Test suite failed to run | 7232941b9 |
| functions/src/support_repository_context_artifact.test.ts | 1 |   ● Test suite failed to run | 1c450880c |
| functions/src/gift_access.test.ts | 1 | introFullAccessClaim policy uses authenticated stable identity, App Check and no caller-owned identity or time | f34bf2ed1 |
| functions/src/jarvis/jarvis_money_writer_index_contract.test.ts | 1 | Jarvis money real-writer and index contract Firestore has exact composites for the fail-closed money queries | 33636dd55 |
| functions/src/tournament_pool_v11_capacity.test.ts | 1 | strict V11 grammar candidate capacity provides raw headroom in every difficulty without mistaking option tripl | 96c32bb97 |
| functions/src/coin_exchange_wallet_reward.test.ts | 1 | coin exchange protected Learning V2 wallet reward is deterministic and fails closed on a conflicting protected | 4792f3e59 |
| functions/src/arena_target_profile_path.test.ts | 1 |   ● Test suite failed to run | 6c02e4088 |
| functions/src/functions_build_boundary.test.ts | 1 | Functions TypeScript build boundary keeps imported server-safe Learning V2 modules in the emitted Functions tr | 58023df0f |

## Сообщество / друзья — файлов: 25

| файл | упало | первый упавший | последний коммит |
|---|---|---|---|
| tests/gustav_french_server_object_remote_verify_v2_packet.test.ts | 14 | Gustav French server object remote verify V2 packet holds when the production manifest is absent | c65476519 |
| tests/gustav_french_upload_remote_verify_parity_v2_packet.test.ts | 3 | Gustav French upload remote verify parity V2 packet proves upload evidence and remote dry-run check the exact  | c65476519 |
| tests/gustav_production_server_manifest_publish_gate_v2_packet.test.ts | 3 | Gustav production server manifest publish gate V2 packet holds when production server manifest is not publishe | c65476519 |
| tests/gustav_french_remote_verify_live_handoff_v2_packet.test.ts | 2 | Gustav French remote verify live handoff V2 packet prepares a read-only live runbook while waiting for credent | c65476519 |
| tests/gustav_runtime_server_delivery_contract_v2_packet.test.ts | 2 | Gustav runtime/server delivery contract V2 packet reflects materialized local runtime artifacts without openin | c65476519 |
| tests/gustav_production_server_manifest_local_promotion_v2_packet.test.ts | 2 | Gustav production server manifest local promotion V2 packet locally promotes the audited draft into server_del | c65476519 |
| tests/gustav_french_runtime_registration_server_layout_v2_packet.test.ts | 2 | Gustav French runtime registration/server layout V2 packet passes when upload evidence covers every runtime-re | c65476519 |
| tests/video_pack_owned_from_local_ids.test.ts | 2 | подключение строки видео-наборов и экран ролика берут owned из локальных id, а не зашитое false | b09b57b42 |
| tests/pack_row_shared_contract.test.ts | 1 | ClampedText — одно видимое исключение сторожа обрезки (решение координатора 11.10) трещотка потребителей: толь | f49b25ec0 |
| tests/friends_profiles_batch_long_ttl.test.ts | 1 | Шпиль: ручное обновление друзей — контракт по строкам файлов хук: потягивание — один вызов за раз, ряд не стир | 24619137c |
| tests/pack_rows_likes_comments_visible.test.ts | 1 | в строках наборов есть сердце, лайки и комментарии «Мои наборы»: круглая ▶ «Тренировать» в строке; «Из видео»: | 50591eb6a |
| tests/cards_pack_opt_ui_gaps_contract.test.ts | 1 | Карточки набора: замки, сообщения и откаты (дыры 6, 7, 10) «Добавить себе»: лайк не обгоняет запись, откат доб | 6cbdab013 |
| tests/gustav_ai_prompt_contract_v2_packet.test.ts | 1 | Gustav AI prompt contract V2 packet keeps every critical AI surface language-scoped, cache-scoped and blocked  | c65476519 |
| tests/gustav_french_remote_verify_command_rehearsal_v2_packet.test.ts | 1 | Gustav French remote verify command rehearsal V2 packet is ready to run live verify as soon as a read-only cre | c65476519 |
| tests/friends_ladder_empty_2026_10_29.test.tsx | 1 | пустая вкладка «Друзья» и лесенка с лесенкой — только слот лесенки, без прежнего текста и отдельной кнопки «До | b9f898423 |
| tests/community_root_tabs.test.tsx | 1 |   ● Test suite failed to run | 23d50f571 |
| tests/premium_theme_remote_packs.test.ts | 1 | premium achievement themes re-resolves mounted home art after a remote pack finishes downloading | a50cfbf18 |
| tests/gustav_runtime_cache_integrity_rollback_v2_packet.test.ts | 1 | Gustav runtime cache integrity rollback V2 packet keeps French runtime cache keys scoped by target, source loc | c65476519 |
| tests/gustav_content_quality_gates_v2_packet.test.ts | 1 | Gustav Content Quality Gates V2 packet keeps all French rows and AI outputs quality-gated without opening gene | c65476519 |
| tests/gustav_fr_daily_phrase_runtime_pack_adapter.test.ts | 1 | Gustav French Daily Phrase runtime pack adapter adapts accepted server rows into DailyPhrase without English i | 6c02e4088 |
| tests/admin_video_pack_title_contract.test.ts | 1 | admin video pack auto title the draft save carries the titles; publish and backfill read them from the version | d7bde78f6 |
| tests/gustav_french_remote_verify_dry_run_readiness_v2_packet.test.ts | 1 | Gustav French remote verify dry-run readiness V2 packet proves the exact 36 scoped French remote checks are re | c65476519 |
| tests/gustav_french_server_pack_upload_execution_gate_v2_packet.test.ts | 1 | Gustav French server pack upload execution gate V2 packet defaults to dry-run and keeps upload/download/activa | c65476519 |
| tests/gustav_french_server_pack_upload_evidence_v2_packet.test.ts | 1 | Gustav French server pack upload evidence V2 packet builds a 36-object source-scoped upload evidence plan from | c65476519 |
| tests/gustav_runtime_download_activation_gate_v2_packet.test.ts | 1 | Gustav runtime download activation gate V2 packet accepts the approved French production target transition whi | c65476519 |

## Дизайн / Темы — файлов: 17

| файл | упало | первый упавший | последний коммит |
|---|---|---|---|
| tests/button_audit_design_fixes_contract.test.ts | 3 | аудит кнопок: Видео, добавки Макетов R57/R59 (15.10) закладка в сетке держит прокрутку: строка «Сохранённые» с | 99abc00dc |
| tests/button_fill_sweep_guard.test.ts | 2 | кнопки не на слабой заливке контрола число кнопок с opaqueControl в style не выше потолка | c0ab59ae4 |
| tests/home_scene_special_wiring.test.ts | 1 | [HOME-SCENE] подключение к сцене кнопка «Продолжить» не тронута: LessonPrepCtaBody внутри V2Pressable, слот ос | f7935cd1d |
| tests/home_survey_sheet_contract.test.ts | 1 | Home-owned survey entry (Today row + sheet) one Today row for both: an active survey campaign first, otherwise | 99adcd778 |
| tests/home_poll_v2_contract.test.ts | 1 | home polls v2 bundled content and application wiring keeps exactly 100 sets and 230 questions in the files; th | 99adcd778 |
| tests/safe_top_one_canvas_contract.test.ts | 1 | верх экрана: зона часов — часть общего полотна «Сцена» Главной рисует фон под часами, а шапку и содержимое ото | 1e1613865 |
| tests/modal_theme_hardcode_guard.test.ts | 1 | модалы, шторки, тосты и церемонии слушаются тему новых жёстких цветов в модалах нет: счёт по файлу не выше пот | 78499c31f |
| tests/today_scene_wiring_contract.test.ts | 1 | «Сегодня» в стиле «Сцена»: подключение кнопка «назад» на сцене берёт цвет верха сцены — круг и значок по её яр | 723c84038 |
| tests/scenes_edge_cases_2026_10_22.test.ts | 1 | сцены Главной и Диалогов: шрифт 1,3 и длинные подписи Главная: на крупном шрифте герой вписан в свободное мест | c324cdb53 |
| tests/themed_art_guard.test.ts | 1 | сторож арта 2.0 [THEMED-ART-GUARD] в репозитории (assets/images/v2art) нет ни одного отвергнутого файла | d189f9e10 |
| tests/scene_shadow_and_stars_contract.test.ts | 1 | Сцена: резкий край, тень блока, мерцающие звёзды звёзды неба: каждая 5-я мерцает Reanimated-слоем, без setStat | d5e22b877 |
| tests/scene_bottom_edge_contract.test.ts | 1 | Нижний край сцены: скруглён и не закрыт карточкой у всех сцен нижний край скруглён радиусом 28 (Главная, Диало | fb28e7feb |
| tests/zz_button_measure.test.ts | 1 | measure | 7a97f2fd7 |
| tests/coral_theme_removal_guard.test.ts | 1 | removed Coral theme regression guard resolves any stored theme through the whitelist with a graphite fallback | af7d97b80 |
| tests/home_first_frame_defer_2026_10_22.test.ts | 1 | первый кадр Главной: декоративные слои — со второго кадра герой «Сцены» — со 2-го кадра, тот же FadeIn при сме | 0d836a476 |
| tests/cards_set_header_safe_area_contract.test.ts | 1 | экран набора Карточек: отступ сверху не зависит от первого кадра системы нет родного SafeAreaView, корень берё | 0f2b1b5b0 |
| tests/hybrid_button_layout_contract.test.ts | 1 | hybrid button layout contract direct text buttons style the animated content layer explicitly | efe19ae9d |

## Карточки / диалоги / экзамены — файлов: 11

| файл | упало | первый упавший | последний коммит |
|---|---|---|---|
| tests/flashcards_training_target_language_behavior.test.ts | 1 |   ● Test suite failed to run | 29128ef22 |
| tests/flashcards_recall_pending_start_behavior.test.ts | 1 |   ● Test suite failed to run | 29128ef22 |
| tests/dialogs_chain7_fixes_contract.test.ts | 1 | «Свободный разговор»: цвета плитки — только токены темы заливка плитки, значок, подписи и значок Plus — токены | 6765d7bc5 |
| tests/gustav_fr_personal_practice_mistake_taxonomy_review_chain.test.ts | 1 | Gustav French personal practice mistake taxonomy review chain prepares external execution and keeps taxonomy i | d3278d400 |
| tests/flashcards_entry_fail_open_contract.test.ts | 1 | вход в тренировку карточек: отказ гранта не закрывает дверь локальный старт объявлен ДО защищённого блока, ина | d3780d189 |
| tests/mistake_practice_review_prepare.test.ts | 1 | повтор исправленных: подготовка экран: pool из маршрута, review в журнал, цена повтора в копилке | 43b60a3c8 |
| tests/gustav_fr_personal_practice_mistake_taxonomy_candidate.test.ts | 1 | Gustav French personal practice mistake taxonomy candidate materializes a French-native mistake taxonomy for a | d3278d400 |
| tests/gustav_fr_personal_practice_mistake_taxonomy_review_requests.test.ts | 1 | Gustav French personal practice mistake taxonomy review requests builds strict LLM review requests for all 56  | d3278d400 |
| tests/flashcards_rev8_catalog_contract.test.ts | 1 | rev8 catalog presentation uses one shared compact row in all catalog surfaces | b1c17565a |
| tests/dev_dialog_feedback_fixture.test.ts | 1 | dev_dialog_feedback=sent карточка отзыва открывается «отправленной» только для диалога и ничего не отправляет  | 337e0e9be |
| tests/gustav_fr_flashcard_global_readiness_bridge_gate.test.ts | 1 | Gustav French flashcard global readiness bridge gate promotes French flashcard packs to local surface ready wh | d3278d400 |

## Пик (Шпиль) — файлов: 10

| файл | упало | первый упавший | последний коммит |
|---|---|---|---|
| functions/src/spire_pack_build_multilingual.test.ts | 8 | loadMultilingualPool(es) — independently approved release generated asset exists and exposes all 4,000 reviewe | dac44f015 |
| tests/flashcards_speaking_quota_unavailable_behavior.test.ts | 2 | unavailable quota is retryable with the same receipt and never double-consumes | 29128ef22 |
| functions/src/spire_week_simulation.test.ts | 2 | 8) пул новой недели es/de/fr/it — bundled-пул не пуст | b9f716cc9 |
| tests/spire_position_moments_contract.test.tsx | 1 | m05A · строка «Ты» едет вверх через линию ТОП-5 итоговый кадр: «Ты в топ-5», «Ты» на 5-м месте, +10 монет, кно | 78ece6a39 |
| tests/spire_reject_rollback.test.ts | 1 | экран Шпиля: откат по исходу досылки главный экран показывает плашку существующей строкой на 9 языках | 2f48406f2 |
| tests/spire_position_moments_triggers.test.ts | 1 | m05 разрыв в единицах места (оба режима) тексты: ступени склоняются, монеты — как было | 939c1f2c5 |
| tests/dev_spire_rank_by.test.ts | 1 | dev_state?spireRankBy стор-заглушка: подмены нет; хук игры берёт подмену поверх конфига | b6b6c613d |
| tests/spire_oddity_prompt.test.ts | 1 | spire_oddity_prompt все шаблоны «Найди лишнее» из пулов покрыты таблицей | 9898b202d |
| tests/spire_all_members_profile.test.tsx | 1 |   ● Test suite failed to run | a6361c04b |
| functions/src/spire_pack_flags_fail_closed.test.ts | 1 |   ● Test suite failed to run | 315c3edb6 |

## Релиз / окружение — файлов: 4

| файл | упало | первый упавший | последний коммит |
|---|---|---|---|
| tests/dialogue_v2_content_release_candidate.test.ts | 5 | Dialogue V2 deterministic content release candidate pins all 304 draft target packets while remaining explicit | 7edbc5096 |
| tests/season_shared_modal.test.tsx | 3 | available exam uses shared sheet, preserves price, facts and each action | 3a6cc6572 |
| tests/gustav_french_runtime_content_integrity_audit.test.ts | 2 | Gustav French runtime content integrity audit blocks placeholders and mojibake from French runtime/reviewer co | c65476519 |
| tests/gustav_target_content_builders_contract.test.ts | 1 | Gustav target content builders contract requires Gustav to build full target-language surfaces instead of tran | c65476519 |

## Plus / оплата — файлов: 3

| файл | упало | первый упавший | последний коммит |
|---|---|---|---|
| tests/paywall_purchase_failure_ui_contract.test.ts | 1 | ревью п.1: stale вокруг purchasePackage флаг purchaseInvoked ставится ВНУТРИ обёртки, прямо перед purchasePack | 2af8e107f |
| tests/paywall_purchase_activation_contract.test.ts | 1 | new paywalls activate Premium locally after RevenueCat success shared A/B/C purchase hook persists CustomerInf | 047082609 |
| tests/paywall_c_native_render.test.tsx | 1 |   ● Test suite failed to run | 32e96110a |

## Звук / видео — файлов: 3

| файл | упало | первый упавший | последний коммит |
|---|---|---|---|
| tests/youtube_connect_once_contract.test.ts | 4 | YouTube: подключение один раз, сверка по YouTube-id сверка канала по youtubeChannelId, а не по внутреннему ном | 906b220c7 |
| tests/youtube_transcript_browser_only.test.ts | 2 | YouTube-расшифровка без серверного секрета админка: GIS-вход, публичный client_id, скачивание VTT в браузере,  | 2b2f5cacc |
| tests/audio_player_arbiter_guard.test.ts | 1 | PM-203: плееры аудио живут под арбитром allowlist не устаревает: каждая запись реально без арбитра и с непусто | e2137389a |

## Моменты — файлов: 2

| файл | упало | первый упавший | последний коммит |
|---|---|---|---|
| functions/src/dialogue_v2_opening_line.test.ts | 5 | Dialogue V2 opening line (server) the provider transport puts the opening as the first assistant turn, before  | a1b97ba76 |
| tests/moments_perf_leaves_2026_10_26.test.ts | 1 | Моменты: перерисовка только там, где меняется число №7 конфетти: частицы ставятся заранее невидимыми (до залпа | 9a0c461e1 |

## Вход и аккаунт — файлов: 1

| файл | упало | первый упавший | последний коммит |
|---|---|---|---|
| tests/account_provision_lock_android_runtime_entrypoint.test.ts | 3 | Android Account V2 provision-lock entrypoint and host runner keeps tracked fixtures complete while generated A | a91e96a31 |

