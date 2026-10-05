/**
 * Сторож дрифта: каждая family, реально используемая контентом
 * (SESSION_KIND_FAMILIES), обязана резолвиться в mode_router_v1 — иначе
 * практика молча падает на старую универсальную карточку без владельца
 * заметив это. Не e2e, не рендерит компоненты — только проверка таблиц.
 *
 * зачем: технический аудит (Advisor, Opus) прямым текстом попросил лёгкий
 * unit-тест на "каждая family из SESSION_KIND_FAMILIES резолвится в
 * роутере", без раздувания до полноценного e2e.
 */

// зачем (05.10): mode_router_v1.tsx импортирует компоненты режимов, а те тянут цепочку UI-модулей (иконки в ESM,
// анимации, стекло, хуки фокуса) — сюит падал до первой проверки. Тест проверяет только ТАБЛИЦЫ роутера и
// компоненты не рендерит, поэтому сами компоненты режимов заменены пустыми.
jest.mock("../modules/learning-v2/modes/phrase_builder_mode_v1", () => ({ __esModule: true, default: () => null }));
jest.mock("../modules/learning-v2/modes/listen_choose_mode_v1", () => ({ __esModule: true, default: () => null }));
jest.mock("../modules/learning-v2/modes/listen_build_dictation_mode_v1", () => ({ __esModule: true, default: () => null }));
jest.mock("../modules/learning-v2/modes/context_gap_grammar_mode_v1", () => ({ __esModule: true, default: () => null }));
jest.mock("../modules/learning-v2/modes/speed_match_mode_v1", () => ({ __esModule: true, default: () => null }));

import { SESSION_KIND_FAMILIES } from "../modules/learning-v2/content/source/episode_01_session_map_v1";
import type { LearningV2ActivityFamilyCode } from "../modules/learning-v2/telemetry";
import {
  isLearningV2ModeRoutedV1,
  MODE_MOCKUP_LABEL_BY_FAMILY_V1,
  MODE_ROUTER_IMPLEMENTED_FAMILIES_V1,
} from "../modules/learning-v2/modes/mode_router_v1";

const ALL_FAMILIES_IN_CONTENT: readonly string[] = Array.from(
  new Set(Object.values(SESSION_KIND_FAMILIES).flat()),
);

/** Семь семей, одобренных владельцем как отдельные режимы
 * (docs/v2/mockups/index.html, раздел "Режимы"). scripted_repeat_compare
 * НЕ проходит через mode_router_v1 (голосовой контракт шире) — он
 * рендерится player'ом отдельной явной веткой, см. комментарий в
 * mode_router_v1.tsx и app/learning_v2_direct_session_player_v1.tsx. */
const SEVEN_APPROVED_FAMILIES: readonly LearningV2ActivityFamilyCode[] = [
  "phrase_builder",
  "listen_choose",
  "sound_contrast",
  "listen_build_dictation",
  "context_gap_grammar",
  "speed_match",
  "scripted_repeat_compare",
];

describe("Learning V2 mode router — family coverage guard", () => {
  it("every family referenced by SESSION_KIND_FAMILIES is one of the 7 approved families", () => {
    // зачем: контент не должен ссылаться на family, для которой нет ни
    // одобренного режима, ни соответствующей записи в телеметрии.
    for (const family of ALL_FAMILIES_IN_CONTENT) {
      expect(SEVEN_APPROVED_FAMILIES).toContain(family);
    }
  });

  it("MODE_ROUTER_IMPLEMENTED_FAMILIES_V1 covers every non-voice family used by content", () => {
    // scripted_repeat_compare сознательно исключена (см. комментарий выше) —
    // остальные 6 обязаны быть в роутере, если контент их использует.
    // зачем (05.10): sound_contrast удалён из роутера НАМЕРЕННО (50eea79a4; подпись в роутере «Удалённый режим (не
    // назначать)») — такие задания плеер рисует универсальной карточкой. Старая карта сессий эпизода 1 всё ещё его
    // называет — это вопрос контента (передано координатору), не дыра роутера.
    const nonVoiceFamiliesInContent = ALL_FAMILIES_IN_CONTENT.filter(
      (family) => family !== "scripted_repeat_compare" && family !== "sound_contrast",
    );
    for (const family of nonVoiceFamiliesInContent) {
      expect(MODE_ROUTER_IMPLEMENTED_FAMILIES_V1).toContain(family);
    }
  });

  it("isLearningV2ModeRoutedV1 resolves true for all 6 router-backed families", () => {
    for (const family of MODE_ROUTER_IMPLEMENTED_FAMILIES_V1) {
      expect(isLearningV2ModeRoutedV1(family)).toBe(true);
    }
  });

  it("isLearningV2ModeRoutedV1 is false for scripted_repeat_compare (player handles it directly)", () => {
    expect(isLearningV2ModeRoutedV1("scripted_repeat_compare")).toBe(false);
  });

  it("MODE_MOCKUP_LABEL_BY_FAMILY_V1 is exhaustive over LearningV2ActivityFamilyCode", () => {
    // Object.freeze с "as const satisfies Readonly<Record<...>>" уже
    // гарантирует это на этапе компиляции — тест ловит регрессию в рантайме
    // если тип когда-нибудь ослабят до Partial.
    const allLabelledFamilies = Object.keys(MODE_MOCKUP_LABEL_BY_FAMILY_V1);
    for (const family of [...SEVEN_APPROVED_FAMILIES, "intro_check"]) {
      expect(allLabelledFamilies).toContain(family);
    }
  });

  it("every family in the router table has a non-empty mockup label", () => {
    for (const family of MODE_ROUTER_IMPLEMENTED_FAMILIES_V1) {
      expect(MODE_MOCKUP_LABEL_BY_FAMILY_V1[family]).toBeTruthy();
    }
  });
});
