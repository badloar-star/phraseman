import { AUTHORED_INTROS_33_TO_40 } from "../modules/learning-v2/content/source/episode_01_sessions_33_40_intro_data_v1";

const locales = ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"] as const;
const forbidden =
  /сесси|урок|курс|previous|next|lesson|course|already|familiar/iu;

test("literal intro data for 33 through 40 has all role-locale coordinates", () => {
  ([33, 34, 35, 36, 37, 38, 39, 40] as const).forEach((ordinal) => {
    const intro = AUTHORED_INTROS_33_TO_40[ordinal];
    if (!intro) throw new Error(`missing authored intro ${ordinal}`);
    expect(intro.pages).toHaveLength(3);
    expect(new Set(intro.pages.map((page) => page.kind)).size).toBe(3);
    locales.forEach((locale) => {
      const bodies = intro.pages.map((page) => page.body[locale] ?? "");
      expect(bodies).toHaveLength(3);
      expect(
        new Set(bodies.map((body) => body.replace(/\s+/gu, " ").trim())).size,
      ).toBe(3);
      intro.pages.forEach((page) => {
        expect(page.title[locale]).toBeTruthy();
        expect(page.prompt[locale]).toBeTruthy();
        expect(page.explanation[locale]).toBeTruthy();
        expect(page.body[locale]?.length).toBeGreaterThanOrEqual(300);
        expect(page.body[locale]?.length).toBeLessThanOrEqual(700);
        expect(page.body[locale]).not.toMatch(forbidden);
        expect(page.choices).toHaveLength(3);
      });
    });
  });
});

test("40 is a mixed checkpoint with explicit negatives, ownership, and plural identity", () => {
  const intro = AUTHORED_INTROS_33_TO_40[40];
  if (!intro) throw new Error("missing authored intro 40");

  expect(intro.pages.map((page) => page.choices[0])).toEqual([
    "She is not here.",
    "Is this your key?",
    "Who are they?",
  ]);

  locales.forEach((locale) => {
    const copy = intro.pages.map((page) => page.body[locale] ?? "").join("\n");
    expect(copy).toMatch(/She is not here\./);
    expect(copy).toMatch(/Is this your key\?/);
    expect(copy).toMatch(/Who are they\?/);
    expect(copy).toMatch(/not/);
  });
});

test("39 is explicitly authored for connected voice practice", () => {
  const intro = AUTHORED_INTROS_33_TO_40[39];
  if (!intro) throw new Error("missing authored intro 39");

  expect(intro.pages.map((page) => page.choices[0])).toEqual([
    "What is this?",
    "Where are they?",
    "How are you?",
  ]);

  locales.forEach((locale) => {
    const copy = intro.pages.map((page) => page.body[locale] ?? "").join("\n");
    expect(copy).toMatch(/What is this\?/);
    expect(copy).toMatch(/Where are they\?/);
    expect(copy).toMatch(/How are you\?/);
    expect(copy).toMatch(
      /voice|голос|голосом|голосі|voz|giọng|suara|ses|głos/iu,
    );
  });
});

test("38 assigns his and her to the owner rather than the object", () => {
  const intro = AUTHORED_INTROS_33_TO_40[38];
  if (!intro) throw new Error("missing authored intro 38");

  expect(intro.pages.map((page) => page.choices[0])).toEqual([
    "This is his book.",
    "That is her bag.",
    "Is this her key?",
  ]);

  locales.forEach((locale) => {
    const copy = intro.pages.map((page) => page.body[locale] ?? "").join("\n");
    expect(copy).toMatch(/his book/i);
    expect(copy).toMatch(/her bag/i);
    expect(copy).toMatch(/her key/i);
    expect(copy).not.toMatch(/your cup/i);
  });
});

test("37 keeps my and your attached to the owner of the named thing", () => {
  const intro = AUTHORED_INTROS_33_TO_40[37];
  if (!intro) throw new Error("missing authored intro 37");

  expect(intro.pages.map((page) => page.choices[0])).toEqual([
    "This is my book.",
    "Is this your key?",
    "That is your cup.",
  ]);

  locales.forEach((locale) => {
    const copy = intro.pages.map((page) => page.body[locale] ?? "").join("\n");
    expect(copy).toMatch(/my book/i);
    expect(copy).toMatch(/your key/i);
    expect(copy).toMatch(/your cup/i);
    expect(copy).not.toMatch(/Who are they\?/);
  });
});

test("36 keeps How for states and separates it from identity and location", () => {
  const intro = AUTHORED_INTROS_33_TO_40[36];
  if (!intro) throw new Error("missing authored intro 36");

  expect(intro.pages.map((page) => page.choices[0])).toEqual([
    "How is she?",
    "How are you?",
    "He is tired.",
  ]);

  locales.forEach((locale) => {
    const bodies = intro.pages.map((page) => page.body[locale] ?? "");
    expect(bodies.every((body) => /How/.test(body))).toBe(true);
    expect(bodies.join("\n")).toMatch(/How are you\?/);
    expect(bodies.join("\n")).toMatch(/How is (he|she)\?/);
    expect(bodies.join("\n")).not.toMatch(/What is this\?/);
  });
});

test("35 teaches Who as an identity question without borrowing a What or Where frame", () => {
  const intro = AUTHORED_INTROS_33_TO_40[35];
  if (!intro) throw new Error("missing authored intro 35");

  expect(intro.pages.map((page) => page.choices[0])).toEqual([
    "Who is she?",
    "He is my brother.",
    "Who are they?",
  ]);

  locales.forEach((locale) => {
    const [concept, formula, trap] = intro.pages.map(
      (page) => page.body[locale] ?? "",
    );
    expect(concept).toMatch(/Who/);
    expect(formula).toMatch(/my (mother|father|brother|sister)/i);
    expect(trap).toMatch(/Who are they\?/);
    expect(`${concept}\n${formula}\n${trap}`).not.toMatch(
      /What is this\?|Where is he\?/,
    );
  });
});
