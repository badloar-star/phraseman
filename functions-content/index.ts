// ═══════════════════════════════════════════════════════════════════════════
// functions-content/index.ts — кодбаза контент-фабрики Learning V2.
//
// зачем: владелец 2026-08-23. Замер загрузки основного бандла показал, что из
// его 380 МБ RSS **236 МБ** приходится на эти девять функций: они тянут в
// память все авторские сессии курса (`authored_sessions_v1` →
// episode_01_session_01..25). Cloud Functions gen2 грузит index.js кодбазы
// целиком при старте ЛЮБОЙ её функции, поэтому за этот контент платили все
// 240 функций — включая те, что к курсу отношения не имеют.
//
// После выноса основной бандл теряет 236 МБ, а сама фабрика получает
// собственный лимит памяти (ей нужно больше 256 MiB — это её честная цена,
// а не общий налог).
//
// Исходники НЕ дублируются: tsconfig с rootDir ".." компилирует те же файлы
// functions/src/content_factory/*, что и основная кодбаза.
// ═══════════════════════════════════════════════════════════════════════════

export { learningV2ActivityAuxiliarySessionGetV1 } from '../functions/src/content_factory/v2_activity_auxiliary_session_callable_v1';
export { learningV2ActivityReleasedSessionGetV1 } from '../functions/src/content_factory/v2_activity_released_session_callable_v1';
export { learningV2CourseReleasedSessionGetV2 } from '../functions/src/content_factory/v2_course_released_session_callable_v2';
export { learningV2CourseReleasedSessionGetV3 } from '../functions/src/content_factory/v2_course_released_session_callable_v3';
export { learningV2CourseActiveCatalogGetV1 } from '../functions/src/content_factory/v2_course_active_catalog_callable_v1';
export { adminPublishAuthoredLearningV2Course } from '../functions/src/content_factory/learning_v2_publish_authored_course_v1';
export { adminImportV2OwnerEpisodeStage } from '../functions/src/content_factory/v2_owner_episode_stage_repository_v1';
export { adminConfirmV2OwnerEpisode } from '../functions/src/content_factory/v2_owner_episode_confirmation_adapter_v1';
export { adminGetV2OwnerGeneratorSetupCatalog } from '../functions/src/content_factory/v2_owner_generator_setup_catalog_v1';
