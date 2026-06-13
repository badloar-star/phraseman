import fs from "fs";
import path from "path";
import sharp from "sharp";

const WIDTH = 1080;
const HEIGHT = 1350;
const DEFAULT_BATCH = "social_mix_30plus_2026-06-12";
const CTA_SOFT = "Phraseman помогает тренировать живые фразы с озвучкой и объяснениями по-русски.";

function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) args[key] = true;
    else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function csvEscape(value = "") {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function toCsv(rows) {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

function escXml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function measureText(text, size) {
  let units = 0;
  for (const ch of String(text)) {
    if (ch === " ") units += 0.34;
    else if (".,:;!?()[]{}'\"-–—".includes(ch)) units += 0.28;
    else if (/[A-ZА-ЯЁ]/.test(ch)) units += 0.68;
    else if (/[A-Za-z]/.test(ch)) units += 0.55;
    else if (/[0-9]/.test(ch)) units += 0.56;
    else units += 0.62;
  }
  return units;
}

function wrapText(text, size, maxWidth) {
  const lines = [];
  for (const paragraph of String(text).split("\n")) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (measureText(next, size) * size <= maxWidth || !line) line = next;
      else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function fitText(text, maxWidth, maxHeight, startSize, minSize, lineHeight) {
  for (let size = startSize; size >= minSize; size -= 1) {
    const lines = wrapText(text, size, maxWidth);
    if (lines.length * size * lineHeight <= maxHeight) return { size, lines };
  }
  return { size: minSize, lines: wrapText(text, minSize, maxWidth) };
}

function tspans(lines, x, size, lineHeight) {
  return lines
    .map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : size * lineHeight}">${escXml(line)}</tspan>`)
    .join("");
}

const palettes = [
  { name: "adult-ink-lime", bg: "#101415", text: "#f6f6ee", muted: "#c8d0c8", accent: "#c9f24a", card: "#f6f6ee", cardText: "#101415" },
  { name: "workday-cream-blue", bg: "#f3eee4", text: "#161412", muted: "#4f4a43", accent: "#2563eb", card: "#111827", cardText: "#f8fafc" },
  { name: "airport-navy-orange", bg: "#08142a", text: "#f8fbff", muted: "#cbd7ef", accent: "#ff8a00", card: "#f8fbff", cardText: "#08142a" },
  { name: "clinic-sage-coral", bg: "#eef3ed", text: "#101511", muted: "#435047", accent: "#ff6b4a", card: "#102018", cardText: "#f7fff8" },
];

const situations = [
  {
    key: "work_call",
    label: "рабочий звонок",
    pain: "На рабочем звонке английский есть в голове, но ответ не выходит вовремя.",
    bad: "I don't know.",
    better: ["Let me check that.", "I need a minute to think.", "What I mean is...", "Could you clarify one thing?", "I'll get back to you today."],
    adultWhy: "30+ часто учат английский не для экзамена, а чтобы звучать спокойно в работе.",
  },
  {
    key: "doctor",
    label: "врач",
    pain: "У врача страшно говорить неточно: хочется объяснить боль понятно и без паники.",
    bad: "I have pain.",
    better: ["It hurts here.", "It started yesterday.", "It gets worse when I move.", "It feels sharp.", "What should I do next?"],
    adultWhy: "Медицина цепляет взрослых: это не учебник, а безопасность.",
  },
  {
    key: "bank",
    label: "банк",
    pain: "В банке или поддержке хочется спорить спокойно, а не звучать грубо.",
    bad: "You took my money.",
    better: ["I don't recognize this charge.", "Could you check the details?", "I'd like to dispute it.", "When will I get an update?", "Could you send confirmation?"],
    adultWhy: "Деньги, документы и сервис дают сильную мотивацию сохранять пост.",
  },
  {
    key: "travel",
    label: "аэропорт",
    pain: "В аэропорту английский нужен быстро: ворота, задержка, пересадка, багаж.",
    bad: "Where I go?",
    better: ["Has the gate changed?", "Is the flight delayed?", "Where can I get help?", "Do I need to rebook?", "Could you show me where to go?"],
    adultWhy: "Путешествия 30+ дают понятный страх: потеряться и не суметь спросить.",
  },
  {
    key: "school",
    label: "школа ребёнка",
    pain: "С учителем ребёнка хочется говорить взрослым тоном, даже если английский неидеальный.",
    bad: "My child has problem.",
    better: ["I'd like to talk about something I'm concerned about.", "Could you tell me what you've noticed?", "What can we do at home?", "Is there anything we should practice?", "Thank you for letting me know."],
    adultWhy: "Родительские ситуации дают аудитории 30+ сильное узнавание.",
  },
  {
    key: "rental",
    label: "аренда",
    pain: "Когда дома что-то сломалось, хочется написать арендодателю без агрессии.",
    bad: "Fix it now.",
    better: ["The heating stopped working.", "Could someone take a look?", "It's quite urgent.", "When could you arrange a repair?", "Thank you for your help."],
    adultWhy: "Бытовые проблемы за границей дают практическую ценность здесь и сейчас.",
  },
  {
    key: "small_talk",
    label: "small talk",
    pain: "Small talk пугает не темой, а тем, что надо быстро и естественно ответить.",
    bad: "Normal.",
    better: ["Pretty good, thanks.", "Can't complain.", "How about you?", "That sounds interesting.", "I've been meaning to ask you..."],
    adultWhy: "Люди 30+ хотят не казаться закрытыми или странными в обычном разговоре.",
  },
  {
    key: "interview",
    label: "собеседование",
    pain: "На собеседовании английский должен звучать уверенно, но не заученно.",
    bad: "I have experience.",
    better: ["My main experience is in...", "I was responsible for...", "One project I'm proud of is...", "What I learned there was...", "I'm looking for a role where..."],
    adultWhy: "Карьера и деньги делают английский не хобби, а рычагом.",
  },
  {
    key: "hotel",
    label: "отель",
    pain: "В отеле нужно объяснить проблему спокойно: номер, карта, шум, поздний заезд.",
    bad: "My room is bad.",
    better: ["There seems to be a problem with my room.", "The key card isn't working.", "Could someone take a look?", "Is it possible to change rooms?", "Thank you for sorting this out."],
    adultWhy: "В поездках взрослые хотят решить вопрос без конфликта и стыда.",
  },
  {
    key: "restaurant",
    label: "ресторан",
    pain: "В ресторане сложно исправить заказ так, чтобы не звучать раздражённо.",
    bad: "This is wrong.",
    better: ["Sorry, I think there was a mix-up.", "I ordered it without cheese.", "Could you change it, please?", "No worries, thank you.", "Could we also get the bill?"],
    adultWhy: "Сервисные ситуации дают быстрые, сохраняемые фразы.",
  },
  {
    key: "deadline",
    label: "дедлайн на работе",
    pain: "Когда дедлайн нереальный, английский должен звучать профессионально, а не резко.",
    bad: "This is impossible.",
    better: ["I'm concerned about the timeline.", "To do it properly, we'll need more time.", "Can we adjust the deadline?", "What should we prioritize first?", "I can send an update by Friday."],
    adultWhy: "Рабочий английский для 30+ часто про границы и ответственность.",
  },
  {
    key: "refund",
    label: "возврат денег",
    pain: "В поддержке хочется попросить возврат уверенно, но без агрессии.",
    bad: "Give me my money back.",
    better: ["I'd like to request a refund.", "The issue hasn't been resolved.", "Could you explain my options?", "How long does the refund usually take?", "Could you send me confirmation?"],
    adultWhy: "Деньги и сервис дают сильную практическую ценность.",
  },
  {
    key: "documents",
    label: "документы",
    pain: "Когда речь про документы, хочется уточнить всё без лишней паники.",
    bad: "What papers need?",
    better: ["Which documents do I need to provide?", "Is a copy enough?", "Could you confirm the deadline?", "Where should I upload it?", "Do I need to bring the original?"],
    adultWhy: "Документы, визы и формы дают взрослой аудитории высокий уровень внимания.",
  },
  {
    key: "phone_call",
    label: "телефонный звонок",
    pain: "По телефону английский сложнее: нет жестов, мимики и времени подумать.",
    bad: "I don't hear.",
    better: ["Sorry, the line is breaking up.", "Could you repeat the last part?", "Let me write that down.", "Could you send it by email as well?", "Thanks, that's clear now."],
    adultWhy: "Телефонные фразы часто сохраняют, потому что стресс знаком почти всем.",
  },
  {
    key: "meeting_disagreement",
    label: "несогласие на встрече",
    pain: "Не согласиться по-английски хочется мягко, но не выглядеть слабым.",
    bad: "You are wrong.",
    better: ["I see your point.", "I'm not sure I agree with that part.", "My concern is...", "Could we look at another option?", "Maybe we can test it first."],
    adultWhy: "30+ нужен английский для статуса и уважительного тона.",
  },
  {
    key: "presentation",
    label: "презентация",
    pain: "На презентации страшно не забыть слова и не зависнуть после вопроса.",
    bad: "I will tell about...",
    better: ["Today I'd like to walk you through...", "The main point is...", "Let me give you an example.", "That's a great question.", "I'll follow up with the details."],
    adultWhy: "Публичная речь на английском бьёт прямо в страх оценки.",
  },
];

const mistakePairs = [
  ["I am agree", "I agree.", "agree уже глагол, ему не нужен am"],
  ["I very like it", "I really like it.", "very не усиливает глагол напрямую"],
  ["How is it called?", "What is it called?", "русская конструкция переносится в английский"],
  ["Tell me please", "Could you tell me, please?", "прямой порядок звучит как команда"],
  ["I wait you", "I'll wait for you.", "wait почти всегда требует for перед человеком"],
  ["Make a photo", "Take a photo.", "фото по-английски не делают, а берут"],
  ["I feel myself bad", "I don't feel well.", "myself здесь лишний"],
  ["Open me the door", "Open the door for me.", "for me уходит в конец"],
  ["I have 30 years", "I'm 30.", "возраст в английском — состояние, а не possession"],
  ["Explain me", "Explain it to me.", "после explain нужен объект, потом to me"],
  ["Discuss about it", "Discuss it.", "discuss уже включает идею about"],
  ["I live here 5 years", "I've lived here for 5 years.", "срок до настоящего момента требует present perfect"],
  ["I am boring", "I am bored.", "boring — я скучный, bored — мне скучно"],
  ["I didn't went", "I didn't go.", "после didn't глагол возвращается в базовую форму"],
  ["Can you borrow me money?", "Can you lend me money?", "borrow — брать, lend — давать"],
  ["I need go", "I need to go.", "после need перед глаголом нужен to"],
  ["Advices", "Advice.", "advice обычно неисчисляемое"],
];

const hooks = {
  confession: [
    "Неприятная правда: взрослые часто знают больше английского, чем могут сказать вслух.",
    "Если тебе 30+, английский ломается не на грамматике. Он ломается в моменте.",
    "Самая взрослая проблема в английском: ты не хочешь звучать глупо перед людьми.",
  ],
  save: [
    "Сохрани эти фразы. Они нужны не для теста, а для реальной жизни.",
    "Мини-набор фраз, который однажды спасёт разговор.",
    "Это не словарик. Это аварийный набор для взрослого английского.",
  ],
  challenge: [
    "Проверь себя: как бы ты сказал это без дословного перевода?",
    "Русскоязычные часто ошибаются здесь не из-за уровня, а из-за привычки переводить.",
    "Если первая мысль была дословной, ты не один. Вот нормальный вариант.",
  ],
};

const adultAngles = [
  "для работы",
  "для поездки",
  "для разговора с врачом",
  "для переписки",
  "для родителей",
  "для собеседования",
  "для сервиса и поддержки",
  "для жизни за границей",
  "для тех, кто давно не учился",
  "для тех, кто всё понимает, но молчит",
];

function textThread(id, situation) {
  const lines = [
    hooks.confession[id % hooks.confession.length],
    "",
    `Ситуация: ${situation.label}.`,
    situation.pain,
    "",
    "Что обычно происходит:",
    "1. человек понимает вопрос",
    "2. начинает переводить с русского",
    "3. боится ошибки",
    "4. отвечает слишком резко или молчит",
    "",
    "Лучше иметь готовые входы:",
    ...situation.better.slice(0, 3).map((phrase) => `• ${phrase}`),
    "",
    "Не надо ждать идеального английского. Нужен первый спокойный ход.",
  ];
  return {
    type: "text_thread",
    platform_priority: ["threads", "facebook"],
    hook: lines[0],
    text: lines.join("\n"),
    why_viral: ["узнаваемая взрослая боль", "комментарии про личный опыт", "можно сохранить как опору"],
  };
}

function phraseBank(id, situation) {
  const title = `5 фраз на английском для ситуации: ${situation.label}`;
  const text = [
    title,
    "",
    ...situation.better.map((phrase, index) => `${index + 1}. ${phrase}`),
    "",
    "Смысл не в том, чтобы выучить список.",
    "Смысл в том, чтобы в стрессовый момент не собирать английский с нуля.",
  ].join("\n");
  return {
    type: "saveable_phrase_bank",
    platform_priority: ["instagram", "facebook", "threads"],
    hook: title,
    text,
    image_title: title,
    image_body: situation.better.join("\n"),
    why_viral: ["сохраняемость", "практическая ситуация", "короткий список"],
  };
}

function mistakeFix(id, pair) {
  const [wrong, right, reason] = pair;
  const text = [
    `Не говори: ${wrong}`,
    `Лучше: ${right}`,
    "",
    `Почему: ${reason}.`,
    "",
    "Такие ошибки не страшные. Но они сразу выдают перевод с русского.",
    "Сохрани, если хочешь звучать естественнее.",
  ].join("\n");
  return {
    type: "mistake_fix",
    platform_priority: ["instagram", "threads", "facebook"],
    hook: `Не говори: ${wrong}`,
    text,
    image_title: `${wrong}\n→\n${right}`,
    image_body: reason,
    why_viral: ["быстрый дофамин исправления", "легко репостнуть", "простая польза"],
  };
}

function commentPrompt(id, situation) {
  const prompt = `Как бы ты сказал по-английски: "${situation.bad}" без грубости?`;
  return {
    type: "comment_prompt",
    platform_priority: ["threads", "facebook"],
    hook: prompt,
    text: [
      prompt,
      "",
      "Мой вариант:",
      situation.better[0],
      "",
      "А теперь интересно: какой вариант первым пришёл тебе в голову?",
    ].join("\n"),
    why_viral: ["просит лёгкий комментарий", "нет стыда", "люди сравнивают варианты"],
  };
}

function miniStory(id, situation) {
  return {
    type: "adult_micro_story",
    platform_priority: ["facebook", "threads"],
    hook: `Взрослый английский начинается не с Present Perfect, а с фразы в моменте.`,
    text: [
      "Взрослый английский начинается не с Present Perfect.",
      "",
      `Он начинается, когда ${situation.label}, тебе нужно сказать что-то простое, но спокойно.`,
      "",
      `Не ${situation.bad}`,
      `А: ${situation.better[0]}`,
      "",
      situation.adultWhy,
      "",
      CTA_SOFT,
    ].join("\n"),
    why_viral: ["эмоциональный контекст", "мягкая продажа", "30+ узнают себя"],
  };
}

function carouselSeed(id, situation) {
  return {
    type: "carousel_seed",
    platform_priority: ["instagram", "facebook"],
    hook: `Английский для взрослых: ${situation.label}`,
    text: [
      `Карусель: ${situation.label}`,
      "",
      `Слайд 1: ${situation.pain}`,
      `Слайд 2: Неудачный дословный вариант — ${situation.bad}`,
      "Слайд 3: Почему это звучит не так",
      `Слайд 4-8: ${situation.better.join(" / ")}`,
      "Финал: тренируй готовые фразы, а не отдельные слова.",
    ].join("\n"),
    image_title: `Английский\nдля ситуации:\n${situation.label}`,
    image_body: situation.better.slice(0, 3).join("\n"),
    why_viral: ["IG/FB любят сохраняемые карточки", "понятная серия", "сценарность"],
  };
}

function reelScript(id, situation) {
  const hook = `POV: ты реально попал в ситуацию "${situation.label}" и английский нужен сейчас`;
  return {
    type: "reel_script",
    platform_priority: ["instagram", "threads", "facebook"],
    hook,
    text: [
      hook,
      "",
      "Формат видео:",
      "1. первый кадр — реальная взрослая ситуация, не студийная лекция",
      `2. плохой вариант на экране: ${situation.bad}`,
      "3. короткая пауза/реакция лицом",
      "4. живой вариант:",
      ...situation.better.slice(0, 3).map((phrase) => `• ${phrase}`),
      "5. финал: одна фраза, которую хочется сохранить",
      "",
      "Смысл: не объяснять английский с доски, а показать момент, где он нужен.",
    ].join("\n"),
    video_script: {
      duration_sec: 28,
      opening_frame: `Крупный живой кадр: ${situation.label}. Текст: "Английский нужен не потом, а сейчас"`,
      beat_1: `Показать дословный вариант: ${situation.bad}`,
      beat_2: "Реакция: человек понимает, что звучит резко/странно.",
      beat_3: situation.better.slice(0, 3),
      retention_device: "каждая следующая фраза закрывает реальную проблему в сцене",
    },
    why_viral: ["реальная сцена вместо урока", "лицо/эмоция", "польза встроена в сюжет"],
  };
}

function roleplaySketch(id, situation) {
  const hook = `Тот самый момент, когда ${situation.label}, а ты переводишь с русского`;
  return {
    type: "roleplay_sketch",
    platform_priority: ["instagram", "threads", "facebook"],
    hook,
    text: [
      hook,
      "",
      "Скетч:",
      `Русская мысль: ${situation.bad}`,
      "Внутренний голос: звучит слишком резко.",
      `Нормальный английский: ${situation.better[0]}`,
      `Если нужно мягче: ${situation.better[1]}`,
      "",
      "Такой формат цепляет не потому, что он смешной сам по себе.",
      "Он цепляет, потому что человек узнаёт свой стыд и получает выход.",
    ].join("\n"),
    video_script: {
      duration_sec: 35,
      opening_frame: `Низко-полированный живой кадр, подпись: "${situation.bad}"`,
      roles: ["русская мысль", "взрослый английский", "реакция собеседника"],
      payoff: situation.better[0],
      comment_prompt: "А как бы ты сказал это мягче?",
    },
    why_viral: ["узнавание", "комедийная роль", "легко отправить другу"],
  };
}

function nativeSurprise(id, pair) {
  const [wrong, right, reason] = pair;
  const hook = `Английский странный: почему не "${wrong}", а "${right}"?`;
  return {
    type: "native_surprise",
    platform_priority: ["instagram", "threads", "facebook"],
    hook,
    text: [
      hook,
      "",
      `Русская логика говорит: ${wrong}`,
      `Живой английский говорит: ${right}`,
      "",
      `Почему: ${reason}.`,
      "",
      "Это тот тип поста, который хочется переслать: вроде мелочь, но мозг щёлкает.",
    ].join("\n"),
    video_script: {
      duration_sec: 18,
      opening_frame: `Крупный текст: "${wrong}" зачёркнуто`,
      reveal: right,
      explanation: reason,
      retention_device: "сначала конфликт с русской логикой, потом быстрый ответ",
    },
    image_title: `${wrong}\nне равно\n${right}`,
    image_body: reason,
    why_viral: ["когнитивный щелчок", "английский кажется нелогичным", "короткое объяснение"],
  };
}

function buildContent(count) {
  const builders = [
    (id, topicIndex) => textThread(id, situations[(topicIndex * 5) % situations.length]),
    (id, topicIndex) => phraseBank(id, situations[(topicIndex * 5 + 2) % situations.length]),
    (id, topicIndex) => mistakeFix(id, mistakePairs[(topicIndex * 3) % mistakePairs.length]),
    (id, topicIndex) => commentPrompt(id, situations[(topicIndex * 5 + 4) % situations.length]),
    (id, topicIndex) => miniStory(id, situations[(topicIndex * 5 + 6) % situations.length]),
    (id, topicIndex) => carouselSeed(id, situations[(topicIndex * 5 + 8) % situations.length]),
  ];
  const items = [];
  const hooksSeen = new Map();
  for (let i = 0; i < count; i += 1) {
    const topicIndex = Math.floor(i / builders.length);
    const built = builders[i % builders.length](i, topicIndex);
    const duplicateCount = hooksSeen.get(built.hook) || 0;
    hooksSeen.set(built.hook, duplicateCount + 1);
    if (duplicateCount > 0) {
      const angle = adultAngles[(i + duplicateCount) % adultAngles.length];
      built.hook = `${built.hook} — ${angle}, вариант ${duplicateCount + 1}`;
      built.text = `${built.hook}\n\n${built.text}`;
      if (built.image_title) built.image_title = `${built.image_title}\n${angle}`;
    }
    items.push({
      id: `sm_${String(i + 1).padStart(3, "0")}`,
      audience: "30+ Russian-speaking English learners",
      created_for: "Instagram + Facebook + Threads",
      ...built,
    });
  }
  return items;
}

function buildViralReelContent(perType = 10) {
  const builders = [
    {
      type: "reel_script",
      build: (id, topicIndex) => reelScript(id, situations[(topicIndex * 5 + 1) % situations.length]),
    },
    {
      type: "roleplay_sketch",
      build: (id, topicIndex) => roleplaySketch(id, situations[(topicIndex * 5 + 3) % situations.length]),
    },
    {
      type: "native_surprise",
      build: (id, topicIndex) => nativeSurprise(id, mistakePairs[(topicIndex * 3 + 1) % mistakePairs.length]),
    },
  ];
  const items = [];
  const hooksSeen = new Map();
  for (const builder of builders) {
    for (let i = 0; i < perType; i += 1) {
      const built = builder.build(items.length, i);
      const duplicateCount = hooksSeen.get(built.hook) || 0;
      hooksSeen.set(built.hook, duplicateCount + 1);
      if (duplicateCount > 0) {
        const angle = adultAngles[(i + duplicateCount) % adultAngles.length];
        built.hook = `${built.hook} — ${angle}, вариант ${duplicateCount + 1}`;
        built.text = `${built.hook}\n\n${built.text}`;
        if (built.image_title) built.image_title = `${built.image_title}\n${angle}`;
      }
      items.push({
        id: `vr_${String(items.length + 1).padStart(3, "0")}`,
        audience: "30+ Russian-speaking English learners",
        created_for: "Instagram Reels + Facebook Reels + Threads",
        ...built,
      });
    }
  }
  return items;
}

function validate(items) {
  const errors = [];
  const hooksSeen = new Set();
  for (const item of items) {
    if (!item.text || item.text.length < 80) errors.push(`${item.id}: text too short`);
    if (!item.platform_priority?.length) errors.push(`${item.id}: platform priority missing`);
    if (hooksSeen.has(item.hook)) errors.push(`${item.id}: duplicate hook`);
    hooksSeen.add(item.hook);
    if (/подписывайся|лайкни/i.test(item.text)) errors.push(`${item.id}: cheap engagement bait`);
    if (!/английск|English|[A-Za-z]{2,}/.test(item.text)) {
      errors.push(`${item.id}: English marker missing`);
    }
  }
  return errors;
}

function renderCardSvg(item, palette) {
  const titleFit = fitText(item.image_title || item.hook, 850, 470, 82, 42, 1.02);
  const bodyFit = fitText(item.image_body || item.text, 800, 430, 40, 25, 1.28);
  const titleY = 154 + titleFit.size;
  const bodyY = 710 + bodyFit.size;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.bg}"/>
      <stop offset="100%" stop-color="${palette.card}"/>
    </linearGradient>
    <filter id="shadow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="26" stdDeviation="30" flood-color="#000" flood-opacity="0.25"/>
    </filter>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${palette.bg}"/>
  <circle cx="935" cy="190" r="280" fill="${palette.accent}" opacity="0.18"/>
  <circle cx="130" cy="1190" r="250" fill="${palette.accent}" opacity="0.12"/>
  <rect x="70" y="86" width="940" height="1130" rx="46" fill="${palette.card}" opacity="0.10"/>
  <text x="92" y="92" fill="${palette.accent}" font-family="Arial Narrow, Impact, Arial, sans-serif" font-size="30" font-weight="900" letter-spacing="3">ENGLISH 30+</text>
  <text x="92" y="${titleY}" fill="${palette.text}" font-family="Arial Narrow, Impact, Arial, sans-serif" font-size="${titleFit.size}" font-weight="900" letter-spacing="0">
    ${tspans(titleFit.lines, 92, titleFit.size, 1.02)}
  </text>
  <rect x="92" y="650" width="850" height="420" rx="32" fill="${palette.card}" filter="url(#shadow)"/>
  <text x="138" y="${bodyY}" fill="${palette.cardText}" font-family="Segoe UI, Arial, sans-serif" font-size="${bodyFit.size}" font-weight="700" letter-spacing="0">
    ${tspans(bodyFit.lines.slice(0, 9), 138, bodyFit.size, 1.28)}
  </text>
  <rect x="92" y="1168" width="330" height="54" rx="27" fill="${palette.accent}"/>
  <text x="122" y="1204" fill="${palette.bg}" font-family="Arial Narrow, Impact, Arial, sans-serif" font-size="28" font-weight="900">Phraseman</text>
</svg>`;
}

async function renderImages(items, outputRoot) {
  const media = {};
  let imageIndex = 0;
  for (const item of items) {
    if (!item.image_title) continue;
    const dir = path.join(outputRoot, "media");
    fs.mkdirSync(dir, { recursive: true });
    const filename = `${item.id}.png`;
    const palette = palettes[imageIndex % palettes.length];
    imageIndex += 1;
    const svg = renderCardSvg(item, palette);
    await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(path.join(dir, filename));
    media[item.id] = {
      file: `media/${filename}`,
      palette: palette.name,
      size: `${WIDTH}x${HEIGHT}`,
    };
  }
  return media;
}

function platformRows(items, media, platform) {
  const rows = [["id", "type", "platform_priority", "text", "media_file", "why_viral"]];
  for (const item of items) {
    const priority = item.platform_priority.join(">");
    const shouldInclude =
      platform === "all" ||
      item.platform_priority.includes(platform) ||
      (platform === "instagram" && item.image_title);
    if (!shouldInclude) continue;
    rows.push([
      item.id,
      item.type,
      priority,
      item.text,
      media[item.id]?.file || "",
      item.why_viral.join("; "),
    ]);
  }
  return rows;
}

function reelScriptRows(items) {
  const rows = [["id", "type", "hook", "text", "duration_sec", "opening_frame", "retention_device", "why_viral"]];
  for (const item of items) {
    if (!item.video_script) continue;
    rows.push([
      item.id,
      item.type,
      item.hook,
      item.text,
      item.video_script.duration_sec || "",
      item.video_script.opening_frame || "",
      item.video_script.retention_device || "",
      item.why_viral.join("; "),
    ]);
  }
  return rows;
}

function writeStrategyReport(outputRoot, items, errors) {
  const counts = {};
  const platformCounts = {};
  for (const item of items) {
    counts[item.type] = (counts[item.type] || 0) + 1;
    for (const platform of item.platform_priority) {
      platformCounts[platform] = (platformCounts[platform] || 0) + 1;
    }
  }
  const lines = [
    "# Social Mix Strategy: English for Russian Speakers 30+",
    "",
    "## What Actually Travels",
    "",
    "- Adult pain beats school motivation: work calls, doctors, banks, travel, children's school, rent, interviews.",
    "- Saveable beats decorative: 3-5 ready phrases, one situation, one reason why the literal Russian translation fails.",
    "- Text posts work when they invite recognition: `I know this`, `this happened to me`, `I would say it differently`.",
    "- Comments grow from low-pressure prompts: ask for one phrase, not a big opinion.",
    "- Images should be used as memory cards, not as mandatory wrappers for every idea.",
    "- Verified 100k+ Instagram Reels in this niche were not polished lesson cards. They were live scenes, roleplay, humor, and one fast language surprise embedded inside a real situation.",
    "",
    "## Platform Mix",
    "",
    "- Threads: text-first confession, mini-rant, one correction, comment prompt.",
    "- Instagram: saveable cards, carousels, phrase banks, mistake cards.",
    "- Instagram Reels: face and scene first; the language lesson appears after the hook, not before it.",
    "- Facebook: longer adult stories, practical scripts, discussion prompts, group-style value posts.",
    "",
    "## Platform Signals Used",
    "",
    "- Instagram: ranking predicts what each user is likely to find valuable; creator guidance says media type is not automatically preferred over another, so the generator uses image cards only when they improve save/share value.",
    "- Facebook: feed ranking rewards posts that spark real back-and-forth discussion and meaningful interactions; the generator avoids cheap engagement bait and uses practical adult prompts.",
    "- Threads: text, photos, videos, and mixed threads are supported; the generator treats Threads as text-first and comment-first, with images only as optional support.",
    "",
    "Sources:",
    "",
    "- Instagram Creators: https://creators.instagram.com/grow/algorithms-and-ranking",
    "- Instagram Creators FAQ: https://creators.instagram.com/faq",
    "- Meta Facebook Feed ranking: https://about.fb.com/news/2018/01/news-feed-fyi-bringing-people-closer-together/",
    "- Threads Help: https://help.instagram.com/788669719351544/",
    "",
    "## 30+ Filter",
    "",
    "- No teen slang as the core promise.",
    "- No shame-based `you are wrong` tone.",
    "- No generic `learn English fast` claim.",
    "- Every post must answer: where would an adult need this in real life?",
    "",
    "## Generated Mix",
    "",
    ...Object.entries(counts).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Platform Priorities",
    "",
    ...Object.entries(platformCounts).map(([key, value]) => `- ${key}: ${value}`),
    "",
    `Validation: ${errors.length ? "FAILED" : "PASSED"}`,
    ...errors.map((error) => `- ${error}`),
  ];
  fs.writeFileSync(path.join(outputRoot, "strategy_report.md"), `${lines.join("\n")}\n`, "utf8");
}

async function main() {
  const args = parseArgs();
  const count = Number(args.count || 120);
  const perType = Number(args["per-type"] || 10);
  const batch = args.batch || DEFAULT_BATCH;
  const outputRoot = path.resolve(args.output || "output", batch);
  fs.mkdirSync(outputRoot, { recursive: true });
  const items = args["viral-reels-only"] ? buildViralReelContent(perType) : buildContent(count);
  const errors = validate(items);
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  const media = await renderImages(items, outputRoot);
  const payload = {
    batch_name: batch,
    generated_at: new Date().toISOString(),
    research_model: "public Russian-language Instagram/Facebook/Threads samples + Meta ranking docs + adult-use-case heuristics",
    audience: "Russian-speaking adults 30+ learning English for real life",
    items,
    media,
  };
  fs.writeFileSync(path.join(outputRoot, "social_posts.json"), JSON.stringify(payload, null, 2), "utf8");
  fs.writeFileSync(path.join(outputRoot, "threads_text_posts.csv"), toCsv(platformRows(items, media, "threads")), "utf8");
  fs.writeFileSync(path.join(outputRoot, "instagram_mix_posts.csv"), toCsv(platformRows(items, media, "instagram")), "utf8");
  fs.writeFileSync(path.join(outputRoot, "facebook_mix_posts.csv"), toCsv(platformRows(items, media, "facebook")), "utf8");
  fs.writeFileSync(path.join(outputRoot, "all_platform_mix.csv"), toCsv(platformRows(items, media, "all")), "utf8");
  fs.writeFileSync(path.join(outputRoot, "reel_scripts.csv"), toCsv(reelScriptRows(items)), "utf8");
  writeStrategyReport(outputRoot, items, errors);
  console.log(`Generated ${items.length} social posts`);
  console.log(`Image cards: ${Object.keys(media).length}`);
  console.log(`Output: ${outputRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
