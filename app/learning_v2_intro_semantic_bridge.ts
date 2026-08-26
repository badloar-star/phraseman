import type { IntroTextPart, IntroTextSemantic } from "./lesson_data_types";

// зачем: аудит 2026-08-23 показал, что Learning V2 красит текст ТОЛЬКО по полю
// `semantic`. Legacy `tone` remains a visual hint only: it cannot prove that a
// linguistic form is wrong. New Learning V2 authoring marks every target run
// explicitly, so a random danger-coloured native explanation must never become
// a struck-through English error.

/** Роль куска текста на экране интро. */
export type IntroPartRole =
  /** Изучаемый язык, верная форма — цвет языка, крупнее. */
  | "target"
  /** Изучаемый язык, ОШИБОЧНАЯ форма — красный, зачёркнутый. */
  | "targetWrong"
  /** Перевод/пояснение на родном — приглушённый. */
  | "gloss"
  /** Служебный маркер «Правильно:» — зелёный. */
  | "markerCorrect"
  /** Служебный маркер «Не так:» и ловушки (the/a) — золотой. */
  | "markerWarning"
  /** Подпись схемы («+ предмет?») — акцент схемы. */
  | "formula"
  /** Смысловое выделение на родном языке — жирный, цвет обычного текста. */
  | "emphasis"
  /** Обычный текст объяснения. */
  | "plain";

const CYRILLIC = /[Ѐ-ӿ]/u;
const LATIN = /[A-Za-z]/u;

/**
 * Есть ли в куске латиница при отсутствии кириллицы.
 *
 * зачем: правило «латиница = изучаемый язык» надёжно ТОЛЬКО для кириллических
 * локалей (ru/uk). Для es/pt-BR/vi/id/tr/pl родной язык сам на латинице, и
 * отличить его от английского по алфавиту невозможно — там опираемся на `tone`
 * напрямую. Проверено по данным: все 32 спорных случая «accent на кириллице»
 * приходят из ru/uk.
 */
function looksLikeTargetLanguage(text: string): boolean {
  return LATIN.test(text) && !CYRILLIC.test(text);
}

/**
 * Выводит роль куска из старой разметки `tone`.
 *
 * Соответствие «тон → цвет» взято из эталонного рендерера `toneStyle`
 * (app/lesson_intro_rich.tsx), который в старом пути уроков красит правильно.
 *
 * `nativeScriptIsCyrillic` — родной язык интерфейса записан кириллицей (ru/uk).
 * Только в этом случае включается алфавитная развилка.
 */
export function introPartRole(
  part: IntroTextPart,
  nativeScriptIsCyrillic: boolean,
): IntroPartRole {
  // Новая разметка, если появится, всегда главнее моста.
  const explicit: IntroTextSemantic | undefined = part.semantic;
  if (explicit === "targetCorrect") return "target";
  if (explicit === "targetWrong") return "targetWrong";
  if (explicit === "nativeGloss") return "gloss";
  if (explicit === "explanation") return "plain";

  const text = part.text ?? "";
  // Алфавитная развилка работает только там, где родной язык — кириллица.
  const isTarget = nativeScriptIsCyrillic
    ? looksLikeTargetLanguage(text)
    : false;

  switch (part.tone) {
    // Danger is a palette instruction, not linguistic evidence. Only explicit
    // semantic="targetWrong" may produce a strike-through.
    case "danger":
      return "plain";

    // 97% латиница — почти всегда изучаемый язык. Кириллические 3%
    // («фразовый глагол», «частица») — термины, им цвет языка не положен.
    case "accent":
      return nativeScriptIsCyrillic
        ? isTarget
          ? "target"
          : "emphasis"
        : "target";

    // 99% кириллица в ru/uk — это слово «Правильно:», служебный маркер.
    case "success":
      return isTarget ? "target" : "markerCorrect";

    // Смешанный: латиница — ловушка (the/a), кириллица — префикс «Не так: ».
    case "warning":
      return "markerWarning";

    // 93% кириллица — подписи схем («+ предмет + место»).
    case "formula":
      return "formula";

    // Перевод рядом с примером.
    case "muted":
      return isTarget ? "target" : "gloss";

    // Смысловое выделение: на латинице это изучаемый язык, на родном — просто вес.
    case "strong":
      return isTarget ? "target" : "emphasis";

    case "code":
      return "formula";

    case "normal":
    case undefined:
    default:
      return isTarget ? "target" : "plain";
  }
}
