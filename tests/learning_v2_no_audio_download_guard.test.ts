// зачем (D47/PM-205, владелец): озвучку Learning V2 НЕ скачиваем нигде — ни
// прогревом занятия, ни фоновой закачкой урока, ни координатором, ни по запросу
// экрана. Звук даёт стартовый пакет в сборке + TTS телефона, занятие не
// отклоняется из-за отсутствия своей озвучки. Раньше это стерегли тесты пустышек
// удалённого транспорта; теперь сторож смотрит на исходники и файлы.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");
const read = (rel: string): string => readFileSync(join(root, rel), "utf8");

const DELETED_MODULES = [
  "app/learning_v2_activity_audio_preload_v1.ts",
  "app/learning_v2_activity_audio_transport_v1.ts",
  "app/use_learning_v2_activity_audio_session_v1.ts",
  "app/use_learning_v2_activity_local_audio_playback_v1.ts",
  "app/learning_v2_lesson_background_prefetch_v1.ts",
  "app/learning_v2_audio_prefetch_coordinator_v1.ts",
  "app/learning_v2_audio_prefetch_background_v1.ts",
];

const FORBIDDEN_IN_V2_SOURCES =
  /learning_v2_activity_audio_(preload|transport)_v1|learning_v2_lesson_background_prefetch_v1|learning_v2_audio_prefetch_(coordinator|background)_v1|use_learning_v2_activity_audio_session_v1|downloadLearningV2ActivityAudioBytesV1|createLearningV2ActivityAudioTransportV1|prefetchLearningV2LessonInBackgroundV1|preloadCurrentLearningV2ActivityAudioSessionV1\(/u;

// Живые файлы V2, где скачивание могло бы вернуться. Комментарии «зачем» вырезаем:
// они вправе называть удалённое, код — нет.
const LIVE_V2_FILES = [
  "app/learning_v2_course_session_audio_preload_v1.ts",
  "app/learning_v2_lesson_audio_pack_v1.ts",
  "app/learning_v2_bootstrap_audio_seed_v1.ts",
  "app/learning_v2_direct_session_player_v1.tsx",
  "app/learning-v2/session/[id].tsx",
  "app/(tabs)/lessons.tsx",
];

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/(^|[^:])\/\/.*$/gmu, "$1");
}

describe("Learning V2: скачивания озвучки нет (D47)", () => {
  test.each(DELETED_MODULES)("модуль %s удалён", (rel) => {
    expect(existsSync(join(root, rel))).toBe(false);
  });

  test.each(LIVE_V2_FILES)("в %s нет ссылок на удалённую цепочку скачивания", (rel) => {
    expect(stripComments(read(rel))).not.toMatch(FORBIDDEN_IN_V2_SOURCES);
  });

  test("подготовка озвучки курса не ходит в сеть", () => {
    const src = stripComments(read("app/learning_v2_course_session_audio_preload_v1.ts"));
    expect(src).not.toMatch(/firebasestorage|\bfetch\(/u);
  });
});
