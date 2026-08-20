import { AUTHORED_EPISODE_01_SESSIONS } from "../modules/learning-v2/content/source/authored_sessions_v1";
import { assertEpisode01Sessions25To32Contract } from "../modules/learning-v2/content/source/episode_01_sessions_25_32_support_v1";

test("sessions 25–32 match the fourth-chapter map and complete the eight locales", () => {
  assertEpisode01Sessions25To32Contract(AUTHORED_EPISODE_01_SESSIONS);
});

const chapter = AUTHORED_EPISODE_01_SESSIONS.filter(
  (source) =>
    source.requiredSessionOrdinal >= 25 && source.requiredSessionOrdinal <= 32,
);
const locales = ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"] as const;

test("sessions 25–32 use distinct semantic titles and never repeat a phrase", () => {
  const expectedRuTitles = [
    "Мы вместе: are",
    "Они и предметы во множественном числе",
    "Не с we и they",
    "Вопросы с are",
    "Короткие we’re и they’re",
    "isn’t и aren’t",
    "Вся таблица to be",
    "Проверка: вся таблица to be",
  ];
  expect(chapter.map((source) => source.title.ru)).toEqual(expectedRuTitles);
  chapter.forEach((source) =>
    expect(new Set(source.phrases.map((phrase) => phrase.english)).size).toBe(
      15,
    ),
  );
});

test("every phrase asks for its native meaning without leaking its English answer", () => {
  chapter.forEach((source) =>
    source.phrases.forEach((phrase) =>
      locales.forEach((locale) => {
        const detail = phrase.localizedDetails?.[locale];
        expect(detail?.meaning).toBeTruthy();
        expect(detail?.meaning).not.toContain(phrase.english);
        detail?.words.forEach((word) => {
          expect(word.prompt).toContain(detail.meaning);
          // A native word may incidentally contain English letters (for example
          // Portuguese "calmos" contains "calm"). Only a standalone English
          // answer token would leak the answer.
          const escaped = word.correct.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
          expect(word.prompt).not.toMatch(
            new RegExp(`(^|[^A-Za-z])${escaped}($|[^A-Za-z])`, "u"),
          );
          expect(word.distractors).toHaveLength(5);
          expect(new Set(word.distractors.map(({ value }) => value)).size).toBe(
            5,
          );
          word.distractors.forEach(({ value, reason }) => {
            expect(value).not.toMatch(/^\d+$/u);
            expect(reason).toContain(word.correct);
            expect(reason).toContain(value);
          });
        });
      }),
    ),
  );
});

test("each localized introduction explains its specific form in four substantial sentences", () => {
  chapter.forEach((source) =>
    source.introPages.forEach((page) =>
      locales.forEach((locale) => {
        const body = page.body[locale] ?? "";
        expect(body.length).toBeGreaterThanOrEqual(300);
        expect(body.length).toBeLessThanOrEqual(700);
        expect((body.match(/[.!?。]/gu) ?? []).length).toBeGreaterThanOrEqual(
          4,
        );
        expect(page.question.prompt[locale]).not.toContain(
          page.question.choices[0][locale],
        );
        expect(
          page.question.choices.filter(
            (choice) => choice[locale] === page.question.choices[0][locale],
          ),
        ).toHaveLength(1);
      }),
    ),
  );
});

test("representative meanings stay native in every locale and contractions keep their surface tokens", () => {
  const byEnglish = (english: string) =>
    chapter
      .flatMap((source) => source.phrases)
      .find((phrase) => phrase.english === english);
  const questions = byEnglish("Are we ready?");
  const expectedQuestions = {
    ru: "Мы готовы?",
    uk: "Ми готові?",
    es: "¿Estamos listos?",
    "pt-BR": "Estamos prontos?",
    vi: "Chúng tôi sẵn sàng phải không?",
    id: "Apakah kami siap?",
    tr: "Hazır mıyız?",
    pl: "Czy jesteśmy gotowi?",
  } as const;
  locales.forEach((locale) =>
    expect(questions?.localizedDetails?.[locale].meaning).toBe(
      expectedQuestions[locale],
    ),
  );
  [
    "We’re ready.",
    "They’re ready.",
    "He isn’t ready.",
    "We aren’t ready.",
  ].forEach((english) => {
    const phrase = byEnglish(english);
    expect(phrase?.words.map((word) => word.correct)[0]).toBe(
      english.split(" ")[0].replace(/[.]/gu, ""),
    );
    locales.forEach((locale) => {
      expect(
        phrase?.localizedDetails?.[locale].explanation.length,
      ).toBeGreaterThanOrEqual(100);
      expect(phrase?.localizedDetails?.[locale].meaning).not.toContain(
        "undefined",
      );
    });
  });
});

test("mixed-person forms use native agreement, negation and question morphology", () => {
  const byEnglish = (english: string) =>
    chapter
      .flatMap((source) => source.phrases)
      .find((phrase) => phrase.english === english);
  const expected = {
    "I am ready.": {
      ru: "Я готов.",
      uk: "Я готовий.",
      es: "Estoy listo.",
      "pt-BR": "Estou pronto.",
      pl: "Jestem gotowy.",
    },
    "She is happy.": {
      ru: "Она счастлива.",
      uk: "Вона щаслива.",
      es: "Ella está feliz.",
      "pt-BR": "Ela está feliz.",
      pl: "Ona jest szczęśliwa.",
    },
    "He isn’t ready.": { tr: "O hazır değil." },
    "Are we ready?": {
      es: "¿Estamos listos?",
      "pt-BR": "Estamos prontos?",
      tr: "Hazır mıyız?",
      pl: "Czy jesteśmy gotowi?",
    },
    "Are they ready?": { tr: "Hazırlar mı?" },
  } as const;
  Object.entries(expected).forEach(([english, meanings]) =>
    Object.entries(meanings).forEach(([locale, meaning]) => {
      const details = byEnglish(english)?.localizedDetails as
        | Record<string, { meaning: string }>
        | undefined;
      expect(details?.[locale].meaning).toBe(meaning);
    }),
  );
});

test("objects, roles and weather keep their semantic class in all eight locales", () => {
  const byEnglish = (english: string) =>
    chapter
      .flatMap((source) => source.phrases)
      .find((phrase) => phrase.english === english);
  const expected = {
    "They are books.": {
      ru: "Это книги.",
      uk: "Це книги.",
      es: "Son libros.",
      "pt-BR": "São livros.",
      vi: "Đó là những quyển sách.",
      id: "Itu buku-buku.",
      tr: "Bunlar kitap.",
      pl: "To są książki.",
    },
    "They aren’t bags.": {
      ru: "Это не сумки.",
      uk: "Це не сумки.",
      es: "No son bolsas.",
      "pt-BR": "Não são bolsas.",
      vi: "Đó không phải là những cái túi.",
      id: "Itu bukan tas-tas.",
      tr: "Bunlar çanta değil.",
      pl: "To nie są torby.",
    },
    "Are they books?": {
      ru: "Это книги?",
      uk: "Це книги?",
      es: "¿Son libros?",
      "pt-BR": "São livros?",
      vi: "Đó có phải là những quyển sách không?",
      id: "Apakah itu buku-buku?",
      tr: "Bunlar kitap mı?",
      pl: "Czy to są książki?",
    },
    "We are friends.": {
      ru: "Мы друзья.",
      uk: "Ми друзі.",
      es: "Somos amigos.",
      "pt-BR": "Somos amigos.",
      vi: "Chúng tôi là bạn bè.",
      id: "Kami adalah teman.",
      tr: "Biz arkadaşız.",
      pl: "Jesteśmy przyjaciółmi.",
    },
    "They are teachers.": {
      ru: "Они учителя.",
      uk: "Вони вчителі.",
      es: "Son profesores.",
      "pt-BR": "São professores.",
      vi: "Họ là giáo viên.",
      id: "Mereka adalah guru.",
      tr: "Onlar öğretmen.",
      pl: "Są nauczycielami.",
    },
    "It is warm.": {
      ru: "Тепло.",
      uk: "Тепло.",
      es: "Hace calor.",
      "pt-BR": "Está quente.",
      vi: "Trời ấm.",
      id: "Cuacanya hangat.",
      tr: "Hava sıcak.",
      pl: "Jest ciepło.",
    },
    "It is not cold.": {
      ru: "Не холодно.",
      uk: "Не холодно.",
      es: "No hace frío.",
      "pt-BR": "Não está frio.",
      vi: "Trời không lạnh.",
      id: "Cuacanya tidak dingin.",
      tr: "Hava soğuk değil.",
      pl: "Nie jest zimno.",
    },
  } as const;
  Object.entries(expected).forEach(([english, meanings]) =>
    Object.entries(meanings).forEach(([locale, expectedMeaning]) => {
      expect(
        byEnglish(english)?.localizedDetails?.[
          locale as (typeof locales)[number]
        ].meaning,
      ).toBe(expectedMeaning);
    }),
  );
});

test("Turkish questions preserve vowel harmony and distinguish people from objects", () => {
  const byEnglish = (english: string) =>
    chapter
      .flatMap((source) => source.phrases)
      .find((phrase) => phrase.english === english);
  expect(byEnglish("Are we ready?")?.localizedDetails?.tr.meaning).toBe(
    "Hazır mıyız?",
  );
  expect(byEnglish("Are we busy?")?.localizedDetails?.tr.meaning).toBe(
    "Meşgul müyüz?",
  );
  expect(byEnglish("Are we tired?")?.localizedDetails?.tr.meaning).toBe(
    "Yorgun muyuz?",
  );
  expect(byEnglish("Are they ready?")?.localizedDetails?.tr.meaning).toBe(
    "Hazırlar mı?",
  );
  expect(byEnglish("Are they books?")?.localizedDetails?.tr.meaning).toBe(
    "Bunlar kitap mı?",
  );
});

test("each distractor receives its own localized causal diagnosis", () => {
  chapter.forEach((source) =>
    source.phrases.forEach((phrase) =>
      locales.forEach((locale) => {
        const detail = phrase.localizedDetails?.[locale];
        detail?.words.forEach((word) => {
          const reasons = word.distractors.map(({ reason }) => reason);
          expect(new Set(reasons).size).toBe(5);
          reasons.forEach((reason) => {
            expect(reason.length).toBeGreaterThanOrEqual(40);
            expect(reason).toContain(detail.meaning);
          });
        });
      }),
    ),
  );
});

test("Turkish plural predicates carry their own harmony through negatives and questions", () => {
  const byEnglish = (english: string) =>
    chapter
      .flatMap((source) => source.phrases)
      .find((phrase) => phrase.english === english);
  const tr = (english: string) =>
    byEnglish(english)?.localizedDetails?.tr.meaning;
  expect(tr("They are not ready.")).toBe("Hazır değiller.");
  expect(tr("They are not happy.")).toBe("Mutlu değiller.");
  expect(tr("Are they tired?")).toBe("Yorgunlar mı?");
  expect(tr("Are they busy?")).toBe("Meşguller mi?");
  expect(tr("Are they teachers?")).toBe("Onlar öğretmen mi?");
});

test("localized meanings keep addressee and plural-friend semantics explicit", () => {
  const byEnglish = (english: string) =>
    chapter
      .flatMap((source) => source.phrases)
      .find((phrase) => phrase.english === english);
  expect(byEnglish("You are ready.")?.localizedDetails?.["pt-BR"].meaning).toBe(
    "Você está pronto.",
  );
  expect(byEnglish("We are friends.")?.localizedDetails?.vi.meaning).toBe(
    "Chúng tôi là bạn bè.",
  );
  expect(byEnglish("They are friends.")?.localizedDetails?.vi.meaning).toBe(
    "Họ là bạn bè.",
  );
});

test("contraction explanations state that the contraction itself contains the negation", () => {
  const phrase = chapter
    .flatMap((source) => source.phrases)
    .find((item) => item.english === "He isn’t ready.");
  expect(phrase?.localizedDetails?.ru.explanation).toContain(
    "объединяет is/are и not",
  );
});

test("intro pages use their own authored contrast instead of the prior generic filler", () => {
  const bodies = chapter.flatMap((source) =>
    source.introPages.map((page) => page.body.ru),
  );
  expect(new Set(bodies).size).toBe(24);
  bodies.forEach((body) =>
    expect(body).not.toContain(
      "Каждое английское слово занимает место, которое передаёт именно это намерение.",
    ),
  );
});

test("intro prose never narrates the course, a session, or learning chronology", () => {
  const forbidden =
    /сесси|урок|session|sessão|buổi|sesi|oturum|sesji|previous|next|already|familiar/iu;
  chapter.forEach((source) =>
    source.introPages.forEach((page) =>
      locales.forEach((locale) =>
        expect(page.body[locale]).not.toMatch(forbidden),
      ),
    ),
  );
});
