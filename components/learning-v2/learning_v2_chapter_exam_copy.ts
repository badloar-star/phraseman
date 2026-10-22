// learning_v2_chapter_exam_copy.ts — тексты экрана экзамена главы на 9 языках.
// зачем (координатор 22.10, эталоны chapter-exam-flow.html / chapter-exam-season.html): ru — дословно из макетов, остальные
// языки — от 10 · ПЕРЕВОДЧИКА (docs/work/tasks/exam-strings-9lang-2026-10-22.md, словарь «Сезона»: tr глава = «ünite», эпизод =
// «bölüm»). Числа подставляются; 12 и 10 постоянные, минуты считаются из данных курса.

type Lang9 = "ru" | "uk" | "en" | "es" | "pt-BR" | "vi" | "id" | "tr" | "pl";
type Row = Readonly<Record<Lang9, string>>;

const COPY = {
  title: { ru: "Экзамен главы {n}", uk: "Іспит розділу {n}", en: "Chapter {n} exam", es: "Examen del capítulo {n}", "pt-BR": "Exame do capítulo {n}", vi: "Bài thi chương {n}", id: "Ujian bab {n}", tr: "{n}. ünite sınavı", pl: "Egzamin rozdziału {n}" },
  questions: { ru: "вопросов", uk: "питань", en: "questions", es: "preguntas", "pt-BR": "perguntas", vi: "câu hỏi", id: "soal", tr: "soru", pl: "pytań" },
  toPass: { ru: "чтобы сдать", uk: "щоб скласти", en: "to pass", es: "para aprobar", "pt-BR": "para passar", vi: "để đạt", id: "untuk lulus", tr: "geçmek için", pl: "by zdać" },
  minutes: { ru: "минут", uk: "хвилин", en: "minutes", es: "minutos", "pt-BR": "minutos", vi: "phút", id: "menit", tr: "dakika", pl: "minut" },
  scope: { ru: "По эпизодам {a}–{b}.", uk: "За епізодами {a}–{b}.", en: "Episodes {a}–{b}.", es: "Episodios {a}–{b}.", "pt-BR": "Episódios {a}–{b}.", vi: "Tập {a}–{b}.", id: "Episode {a}–{b}.", tr: "{a}–{b}. bölümler.", pl: "Odcinki {a}–{b}." },
  unlocks: { ru: "Сдашь — сразу откроется глава {n}.", uk: "Складеш — одразу відкриється розділ {n}.", en: "Pass it and chapter {n} opens right away.", es: "Si apruebas, se abre el capítulo {n} al instante.", "pt-BR": "Passou, o capítulo {n} abre na hora.", vi: "Đạt là mở ngay chương {n}.", id: "Lulus, bab {n} langsung terbuka.", tr: "Geçersen {n}. ünite hemen açılır.", pl: "Zdasz — od razu otworzy się rozdział {n}." },
  start: { ru: "Начать экзамен", uk: "Почати іспит", en: "Start the exam", es: "Empezar el examen", "pt-BR": "Começar o exame", vi: "Bắt đầu bài thi", id: "Mulai ujian", tr: "Sınava başla", pl: "Zacznij egzamin" },
  plusFree: { ru: "С Plus экзамен бесплатный", uk: "З Plus іспит безкоштовний", en: "Free with Plus", es: "Gratis con Plus", "pt-BR": "Grátis com o Plus", vi: "Miễn phí với Plus", id: "Gratis dengan Plus", tr: "Plus ile ücretsiz", pl: "Z Plus za darmo" },
  later: { ru: "Позже", uk: "Пізніше", en: "Later", es: "Más tarde", "pt-BR": "Mais tarde", vi: "Để sau", id: "Nanti", tr: "Sonra", pl: "Później" },
  // Во время экзамена (таблица Переводчика, раздел «Во время экзамена»)
  progress: { ru: "Экзамен · {i} / 12", uk: "Іспит · {i} / 12", en: "Exam · {i} / 12", es: "Examen · {i} / 12", "pt-BR": "Exame · {i} / 12", vi: "Bài thi · {i} / 12", id: "Ujian · {i} / 12", tr: "Sınav · {i} / 12", pl: "Egzamin · {i} / 12" },
  next: { ru: "Дальше", uk: "Далі", en: "Next", es: "Siguiente", "pt-BR": "Próximo", vi: "Tiếp", id: "Lanjut", tr: "Devam", pl: "Dalej" },
} as const satisfies Record<string, Row>;

export type LearningV2ChapterExamCopyKey = keyof typeof COPY;

export function learningV2ChapterExamCopy(
  lang: string,
  key: LearningV2ChapterExamCopyKey,
  vars: Readonly<Record<string, string | number>> = {},
): string {
  const row: Row = COPY[key];
  const template = row[lang as Lang9] ?? row.en;
  return template.replace(/\{(\w+)\}/gu, (_, name: string) => String(vars[name] ?? ""));
}

// зачем (координатор 22.10, эталон «12 вопросов · от 10 верных · ~5 минут»): «10 чтобы сдать» звучало коряво; здесь — порог
// с согласованием по числу (ru/uk/pl, es/pt-BR — единственное при 1).
export function learningV2ChapterExamPassFrom(lang: string, n: number): string {
  const one = n % 10 === 1 && n % 100 !== 11;
  switch (lang) {
    case "ru": return `от ${n} ${one ? "верного" : "верных"}`;
    case "uk": return `від ${n} ${one ? "правильної" : "правильних"}`;
    case "es": return `al menos ${n} ${n === 1 ? "acierto" : "aciertos"}`;
    case "pt-BR": return `pelo menos ${n} ${n === 1 ? "acerto" : "acertos"}`;
    case "vi": return `từ ${n} câu đúng`;
    case "id": return `minimal ${n} benar`;
    case "tr": return `en az ${n} doğru`;
    case "pl": return `od ${n} ${n === 1 ? "poprawnej" : "poprawnych"}`;
    default: return `at least ${n} correct`;
  }
}
