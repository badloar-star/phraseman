import { AUTHORED_EPISODE_01_SESSIONS } from "../modules/learning-v2/content/source/authored_sessions_v1";
import { assertEpisode01Sessions33To40Contract } from "../modules/learning-v2/content/source/episode_01_sessions_33_40_support_v1";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("sessions 33–40 match the fifth-chapter map and never form questions with do or does", () => {
  assertEpisode01Sessions33To40Contract(AUTHORED_EPISODE_01_SESSIONS);
});

const chapter = AUTHORED_EPISODE_01_SESSIONS.filter(
  (source) =>
    source.requiredSessionOrdinal >= 33 && source.requiredSessionOrdinal <= 40,
);
const locales = ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"] as const;
const supportSource = readFileSync(
  resolve(
    process.cwd(),
    "modules/learning-v2/content/source/episode_01_sessions_33_40_support_v1.ts",
  ),
  "utf8",
);

test("sessions 33–40 contain no prose template engine or universal feedback tail", () => {
  expect(supportSource).not.toMatch(
    /pageFields\.map|INTRO_FOCUS|const COPY|wordReason\s*=|localizedDetails\(/u,
  );
  expect(supportSource).not.toMatch(
    /Это меняет точный смысл готовой фразы|This changes the exact meaning of the completed phrase|меняет нужную часть фразы|changes the needed part of the phrase/iu,
  );
});
const byOrdinalForExactMeaning = (ordinal: number) => {
  const source = chapter.find(
    (item) => item.requiredSessionOrdinal === ordinal,
  );
  if (!source) throw new Error(`missing session ${ordinal}`);
  return source;
};

test("sessions 33–40 use authored locale meanings, distinct topic intros, voice, and negative checkpoint recall", () => {
  const byOrdinal = (ordinal: number) =>
    chapter.find((source) => source.requiredSessionOrdinal === ordinal)!;
  chapter.forEach((source) => {
    source.phrases.forEach((phrase) =>
      locales.forEach((locale) => {
        const detail = phrase.localizedDetails?.[locale];
        expect(detail?.meaning).toBeTruthy();
        expect(detail?.meaning).not.toContain(phrase.english);
        expect(detail?.meaning).not.toMatch(
          /Короткая естественная|Коротка природна|Una frase breve|Uma frase curta|Một câu ngắn|Kalimat pendek|Bilinen bir kişi|Krótkie, naturalne/u,
        );
        expect(detail?.meaning).not.toMatch(
          /\[\[|meaning|significado|nghĩa|arti|anlam|znaczenie/iu,
        );
        expect(detail?.explanation).toMatch(/[.!?。]/u);
        expect(detail?.explanation).toMatch(/[.!?。][\s\S]+[.!?。]/u);
        expect(detail?.explanation).toContain(phrase.english);
        expect(detail?.explanation).not.toMatch(
          /Это меняет точный смысл готовой фразы|This changes the exact meaning of the completed phrase/iu,
        );
        detail?.words.forEach((word) => {
          expect(word.distractors).toHaveLength(5);
          expect(
            new Set(word.distractors.map((entry) => entry.value)).size,
          ).toBe(5);
          expect(
            new Set(word.distractors.map((entry) => entry.reason)).size,
          ).toBe(5);
          word.distractors.forEach((entry) => {
            expect(entry.reason).toContain(word.correct);
            expect(entry.reason).toContain(entry.value);
            expect(entry.reason).toContain(detail!.meaning);
            expect(entry.reason).not.toMatch(
              /Это меняет точный смысл готовой фразы|This changes the exact meaning of the completed phrase/iu,
            );
            expect(entry.reason.length).toBeGreaterThanOrEqual(40);
            expect(entry.reason).toContain(detail!.meaning);
          });
        });
      }),
    );
    locales.forEach((locale) => {
      const bodies = source.introPages.map((page) => page.body[locale] ?? "");
      expect(new Set(bodies).size).toBe(3);
      bodies.forEach((body) => {
        expect(body.length).toBeGreaterThanOrEqual(300);
        expect(body).not.toMatch(/сесси|урок|previous|next|already|familiar/iu);
      });
    });
  });
  expect(byOrdinal(33).phrases.map((phrase) => phrase.english)).not.toEqual(
    expect.arrayContaining([
      "What is my cup?",
      "What is your key?",
      "What is this book?",
      "What is that bag?",
    ]),
  );
  expect(byOrdinal(36).phrases.map((phrase) => phrase.english)).not.toContain(
    "How are we?",
  );
  expect(
    byOrdinal(39).phrases.every((phrase) =>
      phrase.features.includes("spoken_production"),
    ),
  ).toBe(true);
  expect(
    byOrdinal(40).phrases.some((phrase) =>
      /\b(?:is not|are not|isn’t|aren’t)\b/iu.test(phrase.english),
    ),
  ).toBe(true);
});

test("every semantic family has exact native meanings in all eight locales", () => {
  const expected = {
    33: {
      ru: "Что это?",
      uk: "Що це?",
      es: "¿Qué es esto?",
      "pt-BR": "O que é isto?",
      vi: "Đây là gì?",
      id: "Ini apa?",
      tr: "Bu ne?",
      pl: "Co to jest?",
    },
    34: {
      ru: "Где он?",
      uk: "Де він?",
      es: "¿Dónde está él?",
      "pt-BR": "Onde ele está?",
      vi: "Anh ấy ở đâu?",
      id: "Dia di mana?",
      tr: "O nerede?",
      pl: "Gdzie on jest?",
    },
    35: {
      ru: "Кто он?",
      uk: "Хто він?",
      es: "¿Quién es él?",
      "pt-BR": "Quem é ele?",
      vi: "Anh ấy là ai?",
      id: "Dia siapa?",
      tr: "O kim?",
      pl: "Kim on jest?",
    },
    36: {
      ru: "Как ты?",
      uk: "Як ти?",
      es: "¿Cómo estás?",
      "pt-BR": "Como você está?",
      vi: "Bạn thế nào?",
      id: "Apa kabar?",
      tr: "Nasılsın?",
      pl: "Jak się masz?",
    },
  } as const;
  Object.entries(expected).forEach(([ordinal, meanings]) => {
    const source = chapter.find(
      (item) => item.requiredSessionOrdinal === Number(ordinal),
    );
    if (!source) throw new Error(`missing session ${ordinal}`);
    const first = source.phrases[0];
    locales.forEach((locale) =>
      expect(first.localizedDetails?.[locale].meaning).toBe(meanings[locale]),
    );
  });
});

test("the chapter keeps its exact speech map and checkpoint negatives", () => {
  const forbidden = [
    "What is my cup?",
    "What is your key?",
    "What is this book?",
    "What is that bag?",
    "How are we?",
  ];
  const s33 = byOrdinalForExactMeaning(33).phrases.map(
    (phrase) => phrase.english,
  );
  const s39 = byOrdinalForExactMeaning(39).phrases.map(
    (phrase) => phrase.english,
  );
  const s40 = byOrdinalForExactMeaning(40).phrases.map(
    (phrase) => phrase.english,
  );
  expect(s33).not.toEqual(expect.arrayContaining(forbidden));
  expect(s39).toEqual(
    expect.arrayContaining([
      "What is this?",
      "Where is he?",
      "Who is she?",
      "How are you?",
    ]),
  );
  expect(s39).not.toEqual(
    expect.arrayContaining([
      "What is my book?",
      "What is your bag?",
      "Where is my cup?",
    ]),
  );
  expect(s40).toEqual(
    expect.arrayContaining([
      "He is not ready.",
      "She is not here.",
      "They are not busy.",
    ]),
  );
  expect(
    s40.filter((phrase) => /\b(?:is not|are not)\b/u.test(phrase)),
  ).toHaveLength(3);
});
