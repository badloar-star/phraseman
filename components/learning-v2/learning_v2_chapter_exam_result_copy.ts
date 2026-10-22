// learning_v2_chapter_exam_result_copy.ts — тексты итога и разбора экзамена главы на 9 языках (макет chapter-exam-season.html, разделы 4–5).
// зачем (координатор 22.10, шаг 3): ru — дословно из макета; остальные языки — из таблицы 10 · ПЕРЕВОДЧИКА
// (docs/work/tasks/exam-strings-9lang-2026-10-22.md); итог и разбор вычитаны Переводчиком 22.10 (exam-result-strings-2026-10-22.md).
// Отдельный файл, а не learning_v2_chapter_exam_copy.ts: тот файл параллельно правит другая сессия.

type Lang9 = "ru" | "uk" | "en" | "es" | "pt-BR" | "vi" | "id" | "tr" | "pl";
type Row = Readonly<Record<Lang9, string>>;

const COPY = {
  score: { ru: "{x} из 12", uk: "{x} з 12", en: "{x} of 12", es: "{x} de 12", "pt-BR": "{x} de 12", vi: "{x}/12", id: "{x} dari 12", tr: "12'de {x}", pl: "{x} z 12" },
  passedTitle: { ru: "Экзамен сдан", uk: "Іспит складено", en: "Exam passed", es: "Examen aprobado", "pt-BR": "Exame aprovado", vi: "Đã đạt", id: "Lulus ujian", tr: "Sınavı geçtin", pl: "Egzamin zdany" },
  failedTitle: { ru: "Почти получилось", uk: "Майже вийшло", en: "Almost there", es: "Casi lo logras", "pt-BR": "Quase lá", vi: "Suýt đạt", id: "Hampir berhasil", tr: "Az kaldı", pl: "Prawie się udało" },
  unlocked: { ru: "Глава {n} открыта", uk: "Розділ {n} відкрито", en: "Chapter {n} unlocked", es: "Capítulo {n} desbloqueado", "pt-BR": "Capítulo {n} desbloqueado", vi: "Chương {n} đã mở", id: "Bab {n} terbuka", tr: "{n}. ünite açıldı", pl: "Rozdział {n} otwarty" },
  openedAlso: { ru: "Эпизоды {a}–{b} главы {n} тоже открыты, их можно пройти позже", uk: "Епізоди {a}–{b} розділу {n} теж відкриті — можна пройти, коли захочеш", en: "Episodes {a}–{b} of chapter {n} are open too — play them whenever you like", es: "Los episodios {a}–{b} del capítulo {n} también están abiertos: hazlos cuando quieras", "pt-BR": "Os episódios {a}–{b} do capítulo {n} também estão abertos — faça quando quiser", vi: "Tập {a}–{b} của chương {n} cũng đã mở — học khi nào bạn muốn", id: "Episode {a}–{b} bab {n} juga terbuka — kerjakan kapan saja", tr: "{n}. ünitenin {a}–{b}. bölümleri de açık — istediğin zaman geçebilirsin", pl: "Odcinki {a}–{b} rozdziału {n} też są otwarte — przejdź je, kiedy chcesz" },
  toChapter: { ru: "К главе {n}", uk: "До розділу {n}", en: "To chapter {n}", es: "Al capítulo {n}", "pt-BR": "Para o capítulo {n}", vi: "Đến chương {n}", id: "Ke bab {n}", tr: "{n}. üniteye geç", pl: "Do rozdziału {n}" },
  review: { ru: "Разбор ошибок", uk: "Розбір помилок", en: "Review mistakes", es: "Repasar errores", "pt-BR": "Revisar erros", vi: "Xem lại lỗi", id: "Tinjau kesalahan", tr: "Hataları incele", pl: "Przejrzyj błędy" },
  reviewOne: { ru: "Разбор ошибки · {k}", uk: "Розбір помилки · {k}", en: "Review mistake · {k}", es: "Repasar error · {k}", "pt-BR": "Revisar erro · {k}", vi: "Xem lại lỗi · {k}", id: "Tinjau kesalahan · {k}", tr: "Hatayı incele · {k}", pl: "Przejrzyj błąd · {k}" },
  questionLabel: { ru: "Вопрос {i}", uk: "Питання {i}", en: "Question {i}", es: "Pregunta {i}", "pt-BR": "Pergunta {i}", vi: "Câu {i}", id: "Soal {i}", tr: "Soru {i}", pl: "Pytanie {i}" },
  // зачем: в макете «Ты ответил:» — с родом; нейтральная форма на всех языках (Переводчик 22.10)
  yourAnswer: { ru: "Твой ответ:", uk: "Твоя відповідь:", en: "Your answer:", es: "Tu respuesta:", "pt-BR": "Sua resposta:", vi: "Bạn trả lời:", id: "Jawabanmu:", tr: "Cevabın:", pl: "Twoja odpowiedź:" },
  repeatEpisode: { ru: "Повторить эпизод {n}", uk: "Повторити епізод {n}", en: "Replay episode {n}", es: "Repetir el episodio {n}", "pt-BR": "Repetir o episódio {n}", vi: "Học lại tập {n}", id: "Ulangi episode {n}", tr: "{n}. bölümü tekrarla", pl: "Powtórz odcinek {n}" },
} as const satisfies Record<string, Row>;

export type LearningV2ChapterExamResultCopyKey = keyof typeof COPY;

export function learningV2ChapterExamResultCopy(
  lang: string,
  key: LearningV2ChapterExamResultCopyKey,
  vars: Readonly<Record<string, string | number>> = {},
): string {
  const row: Row = COPY[key];
  const template = row[lang as Lang9] ?? row.en;
  return template.replace(/\{(\w+)\}/gu, (_, name: string) => String(vars[name] ?? ""));
}

const RU_WORDS: Readonly<Record<number, string>> = { 3: "три ошибки", 4: "четыре ошибки", 5: "пять ошибок", 6: "шесть ошибок", 7: "семь ошибок", 8: "восемь ошибок", 9: "девять ошибок", 10: "десять ошибок", 11: "одиннадцать ошибок", 12: "двенадцать ошибок" };
const UK_WORDS: Readonly<Record<number, string>> = { 3: "три помилки", 4: "чотири помилки", 5: "п’ять помилок", 6: "шість помилок", 7: "сім помилок", 8: "вісім помилок", 9: "дев’ять помилок", 10: "десять помилок", 11: "одинадцять помилок", 12: "дванадцять помилок" };

/**
 * «Чтобы сдать, нужно 10. Разберём три ошибки, и через час можно пересдать.» — с числом ошибок попытки.
 * зачем: при провале ошибок всегда 3–12 (сдано меньше 10 из 12), поэтому форма всегда множественная; ru/uk — числом-словом, как в
 * макете; остальные языки — числом (вычитано Переводчиком 22.10).
 */
export function learningV2ChapterExamFailedBody(lang: string, mistakes: number): string {
  const k = Math.max(3, Math.min(12, mistakes));
  switch (lang) {
    case "ru": return `Чтобы сдать, нужно 10. Разберём ${RU_WORDS[k]}, и через час можно пересдать.`;
    case "uk": return `Щоб скласти, треба 10. Розберемо ${UK_WORDS[k]} — і за годину можна перескласти.`;
    case "es": return `Necesitas 10 para aprobar. Repasemos ${k} errores y en una hora puedes repetirlo.`;
    case "pt-BR": return `Você precisa de 10 para passar. Vamos revisar ${k} erros — em uma hora dá para refazer.`;
    case "vi": return `Cần 10 câu để đạt. Cùng xem lại ${k} lỗi — một giờ nữa có thể thi lại.`;
    case "id": return `Perlu 10 untuk lulus. Kita bahas ${k} kesalahan — sejam lagi bisa ulang.`;
    case "tr": return `Geçmek için 10 gerekiyor. ${k} hatayı inceleyelim — bir saat sonra yeniden girebilirsin.`;
    case "pl": return `Żeby zdać, potrzeba 10. Omówimy ${k} ${k <= 4 ? "błędy" : "błędów"} — za godzinę możesz podejść ponownie.`;
    default: return `You need 10 to pass. Let’s go over ${k} mistakes — you can retake it in an hour.`;
  }
}

/** Подзаголовок разбора: «Экзамен главы 2 · 3 ошибки». */
export function learningV2ChapterExamReviewSubtitle(lang: string, chapter: number, mistakes: number): string {
  const few = mistakes % 10 >= 2 && mistakes % 10 <= 4 && (mistakes % 100 < 12 || mistakes % 100 > 14);
  const one = mistakes % 10 === 1 && mistakes % 100 !== 11;
  switch (lang) {
    case "ru": return `Экзамен главы ${chapter} · ${mistakes} ${one ? "ошибка" : few ? "ошибки" : "ошибок"}`;
    case "uk": return `Іспит розділу ${chapter} · ${mistakes} ${one ? "помилка" : few ? "помилки" : "помилок"}`;
    case "pl": return `Egzamin rozdziału ${chapter} · ${mistakes} ${mistakes === 1 ? "błąd" : few ? "błędy" : "błędów"}`;
    case "es": return `Examen del capítulo ${chapter} · ${mistakes} ${mistakes === 1 ? "error" : "errores"}`;
    case "pt-BR": return `Exame do capítulo ${chapter} · ${mistakes} ${mistakes === 1 ? "erro" : "erros"}`;
    case "vi": return `Bài thi chương ${chapter} · ${mistakes} lỗi`;
    case "id": return `Ujian bab ${chapter} · ${mistakes} kesalahan`;
    case "tr": return `${chapter}. ünite sınavı · ${mistakes} hata`;
    default: return `Chapter ${chapter} exam · ${mistakes} ${mistakes === 1 ? "mistake" : "mistakes"}`;
  }
}
