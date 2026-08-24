"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminGetV2OwnerGeneratorSetupCatalog = exports.adminConfirmV2OwnerEpisode = exports.adminImportV2OwnerEpisodeStage = exports.adminPublishAuthoredLearningV2Course = exports.learningV2CourseActiveCatalogGetV1 = exports.learningV2CourseReleasedSessionGetV3 = exports.learningV2CourseReleasedSessionGetV2 = exports.learningV2ActivityReleasedSessionGetV1 = exports.learningV2ActivityAuxiliarySessionGetV1 = void 0;
var v2_activity_auxiliary_session_callable_v1_1 = require("../functions/src/content_factory/v2_activity_auxiliary_session_callable_v1");
Object.defineProperty(exports, "learningV2ActivityAuxiliarySessionGetV1", { enumerable: true, get: function () { return v2_activity_auxiliary_session_callable_v1_1.learningV2ActivityAuxiliarySessionGetV1; } });
var v2_activity_released_session_callable_v1_1 = require("../functions/src/content_factory/v2_activity_released_session_callable_v1");
Object.defineProperty(exports, "learningV2ActivityReleasedSessionGetV1", { enumerable: true, get: function () { return v2_activity_released_session_callable_v1_1.learningV2ActivityReleasedSessionGetV1; } });
var v2_course_released_session_callable_v2_1 = require("../functions/src/content_factory/v2_course_released_session_callable_v2");
Object.defineProperty(exports, "learningV2CourseReleasedSessionGetV2", { enumerable: true, get: function () { return v2_course_released_session_callable_v2_1.learningV2CourseReleasedSessionGetV2; } });
var v2_course_released_session_callable_v3_1 = require("../functions/src/content_factory/v2_course_released_session_callable_v3");
Object.defineProperty(exports, "learningV2CourseReleasedSessionGetV3", { enumerable: true, get: function () { return v2_course_released_session_callable_v3_1.learningV2CourseReleasedSessionGetV3; } });
var v2_course_active_catalog_callable_v1_1 = require("../functions/src/content_factory/v2_course_active_catalog_callable_v1");
Object.defineProperty(exports, "learningV2CourseActiveCatalogGetV1", { enumerable: true, get: function () { return v2_course_active_catalog_callable_v1_1.learningV2CourseActiveCatalogGetV1; } });
var learning_v2_publish_authored_course_v1_1 = require("../functions/src/content_factory/learning_v2_publish_authored_course_v1");
Object.defineProperty(exports, "adminPublishAuthoredLearningV2Course", { enumerable: true, get: function () { return learning_v2_publish_authored_course_v1_1.adminPublishAuthoredLearningV2Course; } });
var v2_owner_episode_stage_repository_v1_1 = require("../functions/src/content_factory/v2_owner_episode_stage_repository_v1");
Object.defineProperty(exports, "adminImportV2OwnerEpisodeStage", { enumerable: true, get: function () { return v2_owner_episode_stage_repository_v1_1.adminImportV2OwnerEpisodeStage; } });
var v2_owner_episode_confirmation_adapter_v1_1 = require("../functions/src/content_factory/v2_owner_episode_confirmation_adapter_v1");
Object.defineProperty(exports, "adminConfirmV2OwnerEpisode", { enumerable: true, get: function () { return v2_owner_episode_confirmation_adapter_v1_1.adminConfirmV2OwnerEpisode; } });
var v2_owner_generator_setup_catalog_v1_1 = require("../functions/src/content_factory/v2_owner_generator_setup_catalog_v1");
Object.defineProperty(exports, "adminGetV2OwnerGeneratorSetupCatalog", { enumerable: true, get: function () { return v2_owner_generator_setup_catalog_v1_1.adminGetV2OwnerGeneratorSetupCatalog; } });
//# sourceMappingURL=index.js.map