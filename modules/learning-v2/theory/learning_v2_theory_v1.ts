// Теория урока Learning V2: ленивая загрузка из сборки по уроку и языку интерфейса.
//
// зачем (решение владельца №42, вид A lesson-theory.html): теория открывается мгновенно и без сети — данные лежат в сборке
// (modules/learning-v2/theory/generated, собирает scripts/build_learning_v2_theory.mjs из черновиков «12 · ТЕОРИЯ») и
// разбираются только при первом открытии урока. Нет файла на языке интерфейса — английский, затем русский.
// Журнал [V2-THEORY]: откуда взяли (язык, откат), сколько разделов, какой раздел открыть для занятия.
import type { IntroBinaryInteraction, IntroBuildInteraction, IntroChoiceInteraction, IntroI18nText, IntroSpotInteraction } from "../../../app/lesson_data_types";
import { LEARNING_V2_THEORY_AVAILABLE, requireLearningV2TheoryJson } from "./generated";

const LOG = "[V2-THEORY]";

// зачем (координатор 22.10): кнопка «Теория» в подвале эпизода — за флагом, пока «Сверка» не сверит шторку с макетом
// по dev-маршруту /dev_learning_v2_theory. Включение — замена false → true, без нового кода.
export const LEARNING_V2_THEORY_BUTTON_ENABLED = false;

export type LearningV2TheoryFormulaPartV1 = Readonly<{ text: string; accent: boolean }>;
export type LearningV2TheoryExampleV1 = Readonly<{ en: string; translation: string; hi?: string }>;
export type LearningV2TheoryFixV1 = Readonly<{ wrong: string; right: string }>;
export type LearningV2TheoryDrillV1 =
  | (IntroChoiceInteraction & { type: "choice" })
  | (IntroSpotInteraction & { type: "spot_slip" })
  | (IntroBinaryInteraction & { type: "binary" })
  | (IntroBuildInteraction & { type: "word_bank" });

export type LearningV2TheoryBlockV1 =
  | Readonly<{ kind: "body" | "tip"; text: string }>
  | Readonly<{ kind: "formula"; formula: readonly LearningV2TheoryFormulaPartV1[] }>
  | Readonly<{ kind: "examples"; examples: readonly LearningV2TheoryExampleV1[] }>
  | Readonly<{ kind: "fix"; fixes: readonly LearningV2TheoryFixV1[] }>
  | Readonly<{ kind: "drill"; drill: LearningV2TheoryDrillV1 }>;

export type LearningV2TheorySectionV1 = Readonly<{ num: string; title: string; defaultOpen: boolean; blocks: readonly LearningV2TheoryBlockV1[] }>;

export type LearningV2TheoryV1 = Readonly<{
  lesson: number;
  /** Язык, с которого реально взят текст (может отличаться от языка интерфейса — откат). */
  lang: string;
  title: string;
  sections: readonly LearningV2TheorySectionV1[];
  /** Номер занятия → номер раздела, на котором открыть теорию из эпизода. */
  sessionSection: Readonly<Record<string, string>>;
}>;

type RawDrill = Record<string, unknown> & { type: string };
type RawBlock = Record<string, unknown> & { kind: string };
type RawTheory = { schema?: string; lesson: number; lang: string; title: string; sections: { num: string; title: string; defaultOpen: boolean; blocks: RawBlock[] }[]; sessionSection?: Record<string, string> };

const cache = new Map<string, LearningV2TheoryV1 | null>();
const key = (lesson: number, lang: string) => `lesson_${String(lesson).padStart(2, "0")}.${lang}`;
const toI18n = (value: unknown): IntroI18nText => {
  const s = typeof value === "string" ? value : "";
  return { ru: s, uk: s, es: s, ptBr: s, vi: s, id: s, tr: s, pl: s };
};

function toDrill(raw: RawDrill): LearningV2TheoryDrillV1 | null {
  if (raw.type === "choice") return { ...(raw as unknown as IntroChoiceInteraction), type: "choice", why: toI18n(raw.why) };
  if (raw.type === "spot_slip") return { ...(raw as unknown as IntroSpotInteraction), type: "spot_slip", hint: toI18n(raw.hint), fix: toI18n(raw.fix) };
  if (raw.type === "binary") return { ...(raw as unknown as IntroBinaryInteraction), type: "binary", question: toI18n(raw.question), explain: toI18n(raw.explain) };
  if (raw.type === "word_bank") {
    const labels = Array.isArray(raw.slotLabels) ? raw.slotLabels.map(toI18n) : undefined;
    return { ...(raw as unknown as IntroBuildInteraction), type: "word_bank", prompt: toI18n(raw.prompt), ...(labels ? { slotLabels: labels } : {}) };
  }
  return null;
}

function toTheory(raw: RawTheory): LearningV2TheoryV1 {
  return {
    lesson: raw.lesson,
    lang: raw.lang,
    title: raw.title,
    sessionSection: raw.sessionSection ?? {},
    sections: raw.sections.map((section) => ({
      num: section.num,
      title: section.title,
      defaultOpen: section.defaultOpen,
      blocks: section.blocks.flatMap((block): LearningV2TheoryBlockV1[] => {
        if (block.kind === "drill") {
          const drill = toDrill(block.drill as RawDrill);
          return drill ? [{ kind: "drill", drill }] : [];
        }
        return [block as unknown as LearningV2TheoryBlockV1];
      }),
    })),
  };
}

/** Есть ли теория урока хоть на одном языке (для показа кнопки «Теория»). */
export function hasLearningV2TheoryV1(lesson: number, lang: string): boolean {
  return [lang, "en", "ru"].some((candidate) => LEARNING_V2_THEORY_AVAILABLE[key(lesson, candidate)] === true);
}

/** Теория урока на языке интерфейса (откат: английский, русский). Нет — null с причиной в журнале. */
export function loadLearningV2TheoryV1(lesson: number, lang: string): LearningV2TheoryV1 | null {
  const cacheKey = key(lesson, lang);
  if (cache.has(cacheKey)) return cache.get(cacheKey) ?? null;
  for (const candidate of [lang, "en", "ru"]) {
    const k = key(lesson, candidate);
    if (LEARNING_V2_THEORY_AVAILABLE[k] !== true) continue;
    try {
      const raw = requireLearningV2TheoryJson(k) as RawTheory | null;
      if (!raw || !Array.isArray(raw.sections)) {
        console.warn(`${LOG} load_bad_shape`, JSON.stringify({ lesson, lang, candidate })); // guard-ok: причина пропуска
        continue;
      }
      const theory = toTheory(raw);
      cache.set(cacheKey, theory);
      console.log(`${LOG} load`, JSON.stringify({ lesson, lang, from: candidate, fallback: candidate !== lang, sections: theory.sections.length })); // guard-ok: строка на загрузку
      return theory;
    } catch (error) {
      console.warn(`${LOG} load_failed`, JSON.stringify({ lesson, lang, candidate, reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch с причиной
    }
  }
  console.warn(`${LOG} load_missing`, JSON.stringify({ lesson, lang })); // guard-ok: ранний выход с причиной
  cache.set(cacheKey, null);
  return null;
}

/** Раздел, на котором открыть теорию из эпизода: по карте урока, иначе первый. */
export function learningV2TheorySectionForSessionV1(theory: LearningV2TheoryV1, sessionOrdinal: number | null | undefined): string {
  const mapped = sessionOrdinal != null ? theory.sessionSection[String(sessionOrdinal)] : undefined;
  const exists = mapped && theory.sections.some((section) => section.num === mapped);
  const result = exists ? mapped! : theory.sections[0]?.num ?? "01";
  console.log(`${LOG} section_for_session`, JSON.stringify({ lesson: theory.lesson, sessionOrdinal: sessionOrdinal ?? null, mapped: mapped ?? null, result })); // guard-ok: какой раздел открыли и почему
  return result;
}

/** Только для тестов. */
export function __resetLearningV2TheoryCacheForTests(): void {
  cache.clear();
}
