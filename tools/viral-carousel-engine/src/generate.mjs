import fs from "fs";
import path from "path";
import { createRequire } from "module";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const archiver = require("archiver");

const WIDTH = 1080;
const HEIGHT = 1350;
const DEFAULT_BATCH = "viral_ru_en_50_2026-06-12";
const CTA = "Скачивай бесплатно по ссылке в шапке профиля.";
const ALLOWED_FORMATS = new Set([
  "diagnosis_ru_learner",
  "meant_vs_heard",
  "english_emergency_kit",
  "live_situation_breakdown",
  "textbook_vs_real_english",
]);
const ALLOWED_STYLES = new Set(["dark_drama", "cream_editorial"]);

function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function escXml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function csvEscape(value = "") {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function toCsv(rows) {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

function measureText(text, size) {
  let units = 0;
  for (const ch of text) {
    if (ch === " ") units += 0.34;
    else if (".,:;!?()[]{}'\"-–—".includes(ch)) units += 0.28;
    else if (/[A-ZА-ЯЁ]/.test(ch)) units += 0.68;
    else if (/[A-Za-z]/.test(ch)) units += 0.55;
    else if (/[0-9]/.test(ch)) units += 0.56;
    else units += 0.62;
  }
  return units * size;
}

function wrapParagraph(paragraph, size, maxWidth) {
  const words = paragraph.trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (measureText(candidate, size) <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function wrapText(text, size, maxWidth) {
  return String(text)
    .split("\n")
    .flatMap((paragraph) => wrapParagraph(paragraph, size, maxWidth));
}

function fitText(text, maxWidth, maxHeight, startSize, minSize, lineHeight) {
  for (let size = startSize; size >= minSize; size -= 1) {
    const lines = wrapText(text, size, maxWidth);
    const height = lines.length * size * lineHeight;
    const widest = Math.max(...lines.map((line) => measureText(line, size)), 0);
    if (height <= maxHeight && widest <= maxWidth + 4) {
      return { size, lines, height, widest };
    }
  }
  const size = minSize;
  const lines = wrapText(text, size, maxWidth);
  return { size, lines, height: lines.length * size * lineHeight, widest: maxWidth };
}

function tspanLines(lines, x, y, size, lineHeight) {
  return lines
    .map((line, index) => {
      const dy = index === 0 ? 0 : size * lineHeight;
      return `<tspan x="${x}" dy="${index === 0 ? 0 : dy}">${escXml(line)}</tspan>`;
    })
    .join("");
}

function hasMostlyEnglish(text) {
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  const cyr = (text.match(/[А-Яа-яЁё]/g) || []).length;
  return latin >= 24 && latin > cyr;
}

function renderSvg(post, slide, index) {
  const isDark = post.style === "dark_drama";
  const left = 92;
  const right = 92;
  const maxWidth = WIDTH - left - right;
  const top = index === 0 ? 218 : 232;
  const titleFit = fitText(slide.title, maxWidth, 420, index === 0 ? 76 : 70, 44, 1.03);
  const bodyTop = top + titleFit.height + 58;
  const bodyMaxHeight = HEIGHT - bodyTop - 116;
  const phraseCard = post.style === "cream_editorial" && hasMostlyEnglish(slide.body);
  const bodyWidth = phraseCard ? maxWidth - 88 : maxWidth;
  const bodyFit = fitText(slide.body, bodyWidth, phraseCard ? bodyMaxHeight - 82 : bodyMaxHeight, phraseCard ? 42 : 40, 25, 1.34);
  const bodyX = phraseCard ? left + 44 : left;
  const bodyY = phraseCard ? bodyTop + 58 : bodyTop + bodyFit.size;
  const bodyColor = isDark ? "#e2e7e1" : "#3a3a34";
  const titleColor = isDark ? "#f5f7f2" : "#101211";
  const titleWeight = 850;
  const bodyWeight = 455;
  const cardHeight = bodyFit.height + 92;
  const variant = post.visual_variant || {};
  const accent = variant.accent || (isDark ? "#10d875" : "#e11d48");
  const creamBg = variant.background || "#f4f0e8";
  const darkBg = variant.background || "#070807";

  const bg = isDark
    ? `
      <rect width="${WIDTH}" height="${HEIGHT}" fill="${darkBg}"/>
      <circle cx="-10" cy="120" r="420" fill="${accent}" opacity="0.18" filter="url(#blur)"/>
      <circle cx="1040" cy="1220" r="310" fill="#ffffff" opacity="0.035" filter="url(#blurSoft)"/>
      <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="url(#grain)" opacity="0.06"/>
    `
    : `
      <rect width="${WIDTH}" height="${HEIGHT}" fill="${creamBg}"/>
      <circle cx="1020" cy="80" r="410" fill="#ffffff" opacity="0.55" filter="url(#blurSoft)"/>
      <circle cx="42" cy="1270" r="360" fill="${accent}" opacity="0.075" filter="url(#blurSoft)"/>
    `;

  const phraseBox = phraseCard
    ? `<rect x="${left}" y="${bodyTop}" width="${maxWidth}" height="${Math.min(cardHeight, HEIGHT - bodyTop - 90)}" rx="28" fill="#ffffff" stroke="rgba(0,0,0,0.10)" stroke-width="3"/>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <filter id="blur"><feGaussianBlur stdDeviation="95"/></filter>
    <filter id="blurSoft"><feGaussianBlur stdDeviation="65"/></filter>
    <pattern id="grain" width="9" height="9" patternUnits="userSpaceOnUse">
      <rect width="9" height="9" fill="transparent"/>
      <circle cx="1" cy="1" r="0.7" fill="#ffffff" opacity="0.25"/>
    </pattern>
  </defs>
  ${bg}
  ${phraseBox}
  <text x="${left}" y="${top + titleFit.size}" fill="${titleColor}" font-family="Segoe UI, Arial, sans-serif" font-size="${titleFit.size}" font-weight="${titleWeight}" letter-spacing="0">
    ${tspanLines(titleFit.lines, left, top + titleFit.size, titleFit.size, 1.03)}
  </text>
  <text x="${bodyX}" y="${bodyY}" fill="${bodyColor}" font-family="Segoe UI, Arial, sans-serif" font-size="${bodyFit.size}" font-weight="${bodyWeight}" letter-spacing="0">
    ${tspanLines(bodyFit.lines, bodyX, bodyY, bodyFit.size, 1.34)}
  </text>
</svg>`;
}

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function postText(post) {
  return [post.caption || "", ...(post.slides || []).flatMap((slide) => [slide.title || "", slide.body || ""])].join("\n");
}

function normalizedText(post) {
  return postText(post).toLocaleLowerCase("ru-RU");
}

function containsAny(text, terms) {
  return terms.some((term) => text.includes(term.toLocaleLowerCase("ru-RU")));
}

function countEnglishPhraseLines(post) {
  return (post.slides || []).reduce((count, slide) => {
    const lines = `${slide.title || ""}\n${slide.body || ""}`.split(/\n+/);
    return count + lines.filter((line) => /[A-Za-z][A-Za-z'’.,!? -]{3,}/.test(line)).length;
  }, 0);
}

function countSlidesWithEnglish(post) {
  return (post.slides || []).filter((slide) => /[A-Za-z]{2,}/.test(`${slide.title || ""} ${slide.body || ""}`)).length;
}

function hasStrongFirstSlide(post) {
  const first = post.slides?.[0];
  if (!first) return false;
  const text = `${first.title || ""} ${first.body || ""}`.toLocaleLowerCase("ru-RU");
  return /[?!]/.test(text) || containsAny(text, ["не ", "если", "почему", "вместо", "звучит", "ошибка", "во рту", "реальн", "рабоч", "ситуац", "сохрани"]);
}

function hasRetentionBridge(post) {
  const text = normalizedText(post);
  return containsAny(text, ["ниже", "дальше", "следующих", "вот где", "разбираем", "мини-", "сохрани", "держи", "проверь"]);
}

function hasFirstSlideRetentionBridge(post) {
  const first = post.slides?.[0];
  if (!first) return false;
  const text = `${first.title || ""} ${first.body || ""}`.toLocaleLowerCase("ru-RU");
  return containsAny(text, ["ниже", "дальше", "следующих", "вот где", "разбираем", "сохрани", "держи", "проверь", "листай"]);
}

function hasAdultUseCase(post) {
  const text = normalizedText(post);
  return containsAny(text, ["работ", "звон", "врач", "банк", "аэропорт", "аренд", "собесед", "чат", "кафе", "отел", "школ", "реб", "support", "customer", "дедлайн", "заказ", "сервис", "разговор"]);
}

function hasSaveValue(post) {
  const text = normalizedText(post);
  return countEnglishPhraseLines(post) >= 3 || containsAny(text, ["сохрани", "набор", "фраз", "шаблон", "вариант", "мини-"]);
}

function hasRespectfulAdultTone(post) {
  const text = normalizedText(post);
  return !containsAny(text, ["тупой", "лох", "кринж", "зубри", "быстро выучи", "секрет носителей за 5 минут"]);
}

const AUDIENCE_VALIDATOR_AGENTS = [
  { id: "adult_work_call", audience: "30+ работа и звонки", threshold: 76, should: ["работ", "звон", "чат", "ответ", "собесед"] },
  { id: "busy_parent", audience: "родители 30+", threshold: 74, should: ["реб", "школ", "врач", "дом", "взросл"] },
  { id: "relocation_adult", audience: "переезд/жизнь за границей", threshold: 75, should: ["банк", "аренд", "документ", "аэропорт", "support"] },
  { id: "travel_practical", audience: "путешествия 30+", threshold: 74, should: ["аэропорт", "кафе", "отел", "заказ", "путеше"] },
  { id: "medical_safety", audience: "медицина и безопасность", threshold: 73, should: ["врач", "боль", "urgent", "check", "started"] },
  { id: "service_conflict", audience: "сервис/поддержка", threshold: 75, should: ["банк", "support", "charge", "refund", "problem", "check"] },
  { id: "beginner_a2", audience: "A2 боится говорить", threshold: 78, should: ["коротк", "готов", "фраз", "пауза", "не понял"] },
  { id: "intermediate_b1", audience: "B1 хочет звучать взрослее", threshold: 78, should: ["тон", "звуч", "мягч", "взросл", "естествен"] },
  { id: "skeptical_adult", audience: "скептик устал от инфоцыганства", threshold: 80, should: ["реальн", "ситуац", "не идеаль", "не теория", "практик"] },
  { id: "save_collector", audience: "сохраняет полезные карусели", threshold: 82, should: ["сохрани", "набор", "5", "фраз", "мини-", "шаблон"] },
  { id: "commenter_prompt", audience: "комментирует свои варианты", threshold: 70, should: ["как бы", "какая", "проверь", "вопрос", "?"] },
  { id: "instagram_scanner", audience: "быстро сканирует первый слайд", threshold: 82, should: ["не ", "если", "почему", "вместо", "звучит"] },
  { id: "facebook_reader", audience: "читает длиннее в Facebook", threshold: 74, should: ["почему", "разница", "смысл", "главн", "разбираем"] },
  { id: "threads_text_mindset", audience: "любит узнаваемую мысль", threshold: 72, should: ["ты", "мозг", "страх", "понима", "молч"] },
  { id: "anti_schoolbook", audience: "не хочет школьный английский", threshold: 80, should: ["жив", "реальн", "учебник", "дослов", "носител"] },
  { id: "tone_politeness", audience: "боится звучать грубо", threshold: 80, should: ["груб", "мягк", "команд", "please", "could", "would"] },
  { id: "retention_editor", audience: "редактор удержания", threshold: 84, should: ["ниже", "дальше", "вот", "мини-", "почему", "разбираем"] },
  { id: "product_fit", audience: "потенциальный пользователь Phraseman", threshold: 86, should: ["Phraseman", "мобильное приложение", "озвуч", "практик", "фраз"] },
  { id: "no_generic_lessons", audience: "устал от общих уроков", threshold: 82, should: ["ситуац", "вместо", "реальн", "готов", "разговор"] },
  { id: "share_to_friend", audience: "отправляет другу", threshold: 76, should: ["ошибка", "не говори", "звучит", "русск", "вариант"] },
];

function evaluateAudienceAgent(post, agent) {
  const text = normalizedText(post);
  let score = 0;
  const shouldHits = agent.should.filter((term) => text.includes(term.toLocaleLowerCase("ru-RU"))).length;
  score += Math.min(25, shouldHits * 7);
  if (hasStrongFirstSlide(post)) score += 15;
  if (hasFirstSlideRetentionBridge(post)) score += 12;
  if (hasAdultUseCase(post)) score += 12;
  if (hasSaveValue(post)) score += 12;
  if (countEnglishPhraseLines(post) >= 3) score += 10;
  if (countSlidesWithEnglish(post) >= 2) score += 6;
  if ((post.slides || []).length >= 7 && (post.slides || []).length <= 9) score += 4;
  if (hasRespectfulAdultTone(post)) score += 4;
  if (postText(post).includes("Phraseman")) score += 5;
  if ((post.caption || "").length >= 180) score += 4;
  if (!hasStrongFirstSlide(post)) score -= 18;
  if (!hasFirstSlideRetentionBridge(post)) score -= 12;
  if (!hasSaveValue(post)) score -= 16;
  score = clampScore(score);
  return {
    id: agent.id,
    audience: agent.audience,
    threshold: agent.threshold,
    score,
    should_hits: shouldHits,
    passed: score >= agent.threshold,
  };
}

function runAudienceValidators(post) {
  return AUDIENCE_VALIDATOR_AGENTS.map((agent) => evaluateAudienceAgent(post, agent));
}

function carouselRetentionLine(post) {
  const byFormat = {
    diagnosis_ru_learner: "Ниже — где именно ломается ответ и какие первые фразы возвращают контроль.",
    meant_vs_heard: "Листай дальше: покажу, где фраза звучит резче, чем ты хотел.",
    english_emergency_kit: "Сохрани: это набор на момент, когда мозг уже не ищет грамматику.",
    live_situation_breakdown: "Разбираем не слово, а порядок: вход, деталь, спокойная просьба.",
    textbook_vs_real_english: "Проверь себя: возможно, ты тоже переводишь эту фразу с русского.",
  };
  return byFormat[post.format] || "Листай дальше: тут не теория, а готовый ход для разговора.";
}

function shortenAtWord(value, maxLength) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) return text;
  const sliced = text.slice(0, maxLength).trim();
  const lastSpace = sliced.lastIndexOf(" ");
  return `${sliced.slice(0, lastSpace > 80 ? lastSpace : maxLength).trim()}...`;
}

function applyCarouselResearchUpgrades(post) {
  const first = post.slides?.[0];
  if (first?.title) {
    first.title = first.title.replace(/^Если если\s+/i, "Если ");
  }
  if (first && first.body && !hasFirstSlideRetentionBridge(post)) {
    const line = carouselRetentionLine(post);
    const base = shortenAtWord(first.body, 340 - line.length);
    first.body = `${base} ${line}`;
  }
  post.research_upgrade = {
    source: "carousel pattern audit",
    principles: [
      "first slide names a real adult situation or painful translation mistake",
      "early retention bridge tells why to keep swiping",
      "middle slides deliver ready phrases, not abstract grammar",
      "final slide explains Phraseman as a mobile app and ties the CTA to the carousel's exact pain",
    ],
    locked_styles: ["dark_drama", "cream_editorial"],
  };
  return post;
}

function validateBatch(data) {
  const errors = [];
  const ids = new Set();
  const captions = new Set();
  const firstTitles = new Set();
  const forbiddenSpellings = ["Фрейзмен", "PhraseMan", "PHRASEMAN", "phraseman"];
  const forbiddenSlideTerms = [/\b\d{1,2}\s*\/\s*\d{1,2}\b/i, /\bslide\b/i, /слайд/i, /подписывайся внизу/i, /footer/i];
  const englishMarker = /английск|English|на английском|английская речь|английский разговор|английском разговоре/i;

  assert(data && Array.isArray(data.posts), "posts array is required", errors);
  for (const post of data.posts || []) {
    const prefix = post.post_id || "missing_id";
    assert(post.post_id, "post_id is required", errors);
    assert(!ids.has(post.post_id), `${prefix}: duplicate post_id`, errors);
    ids.add(post.post_id);
    assert(ALLOWED_FORMATS.has(post.format), `${prefix}: invalid format ${post.format}`, errors);
    assert(ALLOWED_STYLES.has(post.style), `${prefix}: invalid style ${post.style}`, errors);
    assert(Array.isArray(post.slides), `${prefix}: slides array is required`, errors);
    assert(post.slides?.length >= 7 && post.slides?.length <= 10, `${prefix}: slide count must be 7-10`, errors);
    assert(post.caption && post.caption.length > 120, `${prefix}: caption is too short`, errors);
    assert(!captions.has(post.caption), `${prefix}: duplicate caption`, errors);
    captions.add(post.caption);

    const allText = [post.caption, ...(post.slides || []).flatMap((slide) => [slide.title || "", slide.body || ""])].join("\n");
    assert(!/если\s+если/i.test(allText), `${prefix}: duplicated "если если" hook`, errors);
    for (const bad of forbiddenSpellings) {
      assert(!allText.includes(bad), `${prefix}: forbidden product spelling ${bad}`, errors);
    }

    const first = post.slides?.[0];
    const firstText = `${first?.title || ""} ${first?.body || ""}`;
    assert(englishMarker.test(firstText), `${prefix}: first slide must clearly mention English`, errors);
    assert(!firstTitles.has(first?.title), `${prefix}: duplicate first slide title`, errors);
    firstTitles.add(first?.title);

    for (const [index, slide] of (post.slides || []).entries()) {
      const slideText = `${slide.title || ""} ${slide.body || ""}`;
      assert(slide.title && slide.body, `${prefix}: slide ${index + 1} needs title and body`, errors);
      assert(slide.title.length <= 118, `${prefix}: slide ${index + 1} title is too long`, errors);
      assert(slide.body.length <= 360, `${prefix}: slide ${index + 1} body is too long`, errors);
      for (const rule of forbiddenSlideTerms) {
        assert(!rule.test(slideText), `${prefix}: slide ${index + 1} contains forbidden visual term`, errors);
      }
    }

    const last = post.slides?.[post.slides.length - 1];
    const lastText = `${last?.title || ""} ${last?.body || ""}`;
    const lastTextLower = lastText.toLocaleLowerCase("ru-RU");
    const lastTitleLower = (last?.title || "").trim().toLowerCase();
    assert(lastText.includes("Phraseman"), `${prefix}: final slide missing Phraseman`, errors);
    assert(lastText.includes("мобильное приложение"), `${prefix}: final slide missing mobile app explanation`, errors);
    assert(lastText.includes("живого английского"), `${prefix}: final slide must explain the product category`, errors);
    assert(lastText.includes("Не игра ради очков"), `${prefix}: final slide must include app positioning against generic gamified learning`, errors);
    assert(lastText.endsWith(CTA), `${prefix}: final slide must end with exact CTA`, errors);
    const finalContextRules = {
      diagnosis_ru_learner: ["затык", "готовую фразу", "без паники"],
      meant_vs_heard: ["тон", "без лишней резкости"],
      english_emergency_kit: ["под рукой", "ответить сразу"],
      live_situation_breakdown: ["сценарий", "следующий шаг"],
      textbook_vs_real_english: ["дословный перевод", "живыми фразами"],
    };
    for (const marker of finalContextRules[post.format] || []) {
      assert(lastTextLower.includes(marker), `${prefix}: final slide is not woven into ${post.format}; missing "${marker}"`, errors);
    }
    for (const opener of ["для этого есть", "поэтому я сделал", "в phraseman"]) {
      assert(!lastTitleLower.startsWith(opener), `${prefix}: generic final opener ${opener}`, errors);
    }
    assert(post.caption.includes("Phraseman") && post.caption.includes("мобильное приложение") && post.caption.includes("реальным ситуациям") && post.caption.includes("Не игра ради очков") && post.caption.includes(CTA), `${prefix}: caption missing product CTA`, errors);
    const audienceResults = runAudienceValidators(post);
    post.audience_validation = audienceResults;
    for (const result of audienceResults.filter((item) => !item.passed)) {
      assert(false, `${prefix}: audience validator ${result.id} failed (${result.score}/${result.threshold}) for ${result.audience}`, errors);
    }
  }
  return errors;
}

const darkVariants = [
  { accent: "#10d875", background: "#070807" },
  { accent: "#29d3ff", background: "#08090b" },
  { accent: "#ff4d6d", background: "#090707" },
  { accent: "#f59e0b", background: "#0a0906" },
];

const creamVariants = [
  { accent: "#e11d48", background: "#f4f0e8" },
  { accent: "#2563eb", background: "#f5f1e7" },
  { accent: "#0f9f6e", background: "#f2efe5" },
  { accent: "#7c3aed", background: "#f6f0e9" },
];

function visualVariant(style, n) {
  const source = style === "dark_drama" ? darkVariants : creamVariants;
  return source[n % source.length];
}

const diagnosisTopics = [
  ["на рабочем звонке", "надо ответить менеджеру", "Give me a second.\nLet me think.\nWhat I mean is..."],
  ["у врача", "надо объяснить боль", "It started yesterday.\nIt feels sharp.\nCould you check it?"],
  ["на собеседовании", "спрашивают про опыт", "I worked on...\nMy main role was...\nWhat I learned was..."],
  ["в банке", "надо спорить про списание", "I don't recognize this charge.\nCould you check it for me?\nI'd like to dispute it."],
  ["с арендодателем", "что-то сломалось дома", "The heating stopped working.\nCould someone take a look?\nIt's quite urgent."],
  ["в аэропорту", "рейс меняют в последний момент", "Could you tell me what's changed?\nIs there another option?\nWhere should I go?"],
  ["в small talk", "тебе задают обычный вопрос", "Pretty good, thanks.\nHow about you?\nThat sounds interesting."],
  ["в чате на работе", "надо мягко не согласиться", "I see your point.\nI'm not sure that will work.\nCould we try another way?"],
  ["в кафе", "заказ пошёл не так", "Sorry, I ordered this without onions.\nCould you fix it?\nNo worries, thank you."],
  ["в школе у ребёнка", "надо говорить со взрослым тоном", "Could we talk about this?\nI'm a bit concerned.\nWhat would you suggest?"],
];

const meantVsHeardTopics = [
  ["попросить файл", "Send me the file, please.", "Could you send me the file when you get a chance?", "просьба, а не команда"],
  ["отказаться от встречи", "I can't come.", "I'm afraid I can't make it today.", "мягкий отказ без холода"],
  ["попросить повторить", "Repeat.", "Could you say that again?", "нормальная просьба, не приказ"],
  ["сказать, что не понял", "I don't understand you.", "Sorry, I didn't quite catch that.", "не обвиняешь собеседника"],
  ["попросить скидку", "Give me a discount.", "Is there any chance of a discount?", "вопрос вместо давления"],
  ["напомнить о задаче", "You forgot to send it.", "Just checking if you had a chance to send it.", "напоминание без атаки"],
  ["попросить подождать", "Wait.", "Could you give me a moment?", "вежливая пауза"],
  ["поправить ошибку", "You are wrong.", "I think there might be a small mistake here.", "исправление без конфликта"],
  ["сказать, что занята", "I am busy.", "I'm tied up right now, but I can reply later.", "граница без грубости"],
  ["попросить объяснить проще", "Explain normally.", "Could you explain it in a simpler way?", "ясность без раздражения"],
];

const emergencyTopics = [
  ["если не понял английский на слух", ["Sorry, I didn't catch that.", "Could you say it a bit slower?", "What do you mean by that?", "Could you write it down?", "So, you mean...?"]],
  ["если на английском надо выиграть паузу", ["Let me think for a second.", "That's a good question.", "I need a moment.", "How can I put this?", "What I mean is..."]],
  ["если нужно мягко пожаловаться", ["I'm sorry, but there's a problem.", "This doesn't seem right.", "Could you check this for me?", "I'd like to understand what happened.", "Is there a way to fix it?"]],
  ["если надо говорить с врачом", ["I've been feeling unwell.", "It hurts here.", "It started two days ago.", "It gets worse when I move.", "What should I do next?"]],
  ["если надо написать арендодателю", ["Something seems to be broken.", "Could you arrange a repair?", "It's been happening since yesterday.", "Here are the photos.", "Could you let me know the next step?"]],
  ["если на работе надо не согласиться", ["I see the idea.", "I'm not sure this is the best option.", "My concern is...", "Could we consider another way?", "Maybe we can try this first."]],
  ["если в банке списали деньги", ["I don't recognize this transaction.", "Could you check the details?", "I'd like to dispute this charge.", "When will I get an update?", "Could you send me confirmation?"]],
  ["если в аэропорту всё поменялось", ["Has the gate changed?", "Is the flight delayed?", "Where can I get help?", "Do I need to rebook?", "Could you show me where to go?"]],
  ["если в магазине надо вернуть товар", ["I'd like to return this.", "It doesn't work properly.", "I bought it yesterday.", "Here is the receipt.", "Could I get a refund?"]],
  ["если в разговоре страшно начать", ["Can I ask you something?", "I wanted to check one thing.", "This may sound basic, but...", "I'm still learning English.", "Could you help me with this?"]],
];

const liveTopics = [
  ["в банке списали деньги", "You took my money.", "I don't recognize this charge.", "Could you check what this payment is for?", "I'd like to dispute it if possible."],
  ["у врача нужно описать боль", "I have a pain.", "I've been having pain here.", "It started yesterday and gets worse when I move.", "What would you recommend?"],
  ["арендодатель игнорирует ремонт", "Fix it now.", "I'm following up about the repair.", "The problem is still there and it's affecting the flat.", "Could you confirm when someone can come?"],
  ["на работе дедлайн нереальный", "This is impossible.", "I'm concerned about the timeline.", "To do it properly, we'll need more time.", "Can we adjust the deadline?"],
  ["в кафе принесли не то", "This is wrong.", "Sorry, I think there was a mix-up.", "I ordered it without cheese.", "Could you change it, please?"],
  ["в отеле не работает карта", "My card doesn't open.", "My key card isn't working.", "I tried it twice and it still won't open.", "Could you reset it for me?"],
  ["на собеседовании не понял вопрос", "What?", "Sorry, could you repeat the question?", "Do you mean my last role or this position?", "I'd be happy to answer that."],
  ["в школе надо поговорить с учителем", "My child has problem.", "I'd like to talk about something I'm concerned about.", "Could you tell me what you've noticed?", "What can we do at home?"],
  ["в customer support нужна компенсация", "Give compensation.", "I'd like to ask about compensation.", "The issue caused extra costs for me.", "What options are available?"],
  ["в рабочем чате нужно уточнить задачу", "I don't understand task.", "Could you clarify one thing?", "Do you want me to focus on speed or quality first?", "I'll start once I understand the priority."],
];

const textbookTopics = [
  ["I very like it", "I really like it.", "I'm really into it.", "В русском хочется усилить глагол напрямую. В английском усилитель ставится иначе."],
  ["Tell me please", "Could you tell me, please?", "Could you let me know?", "Русский порядок слов звучит естественно нам, но в английском это часто команда."],
  ["I feel myself bad", "I feel bad.", "I don't feel well.", "После feel не нужен myself, если ты говоришь про состояние."],
  ["How is it called?", "What is it called?", "What's the word for this?", "Русская конструкция переносится в английский, но вопрос строится иначе."],
  ["I am agree", "I agree.", "I totally agree.", "Agree уже глагол. Ему не нужен am."],
  ["I have 30 years", "I am 30.", "I'm in my thirties.", "Возраст в английском - это состояние, а не то, что у тебя есть."],
  ["I wait you", "I'll wait for you.", "I'll be waiting for you.", "В английском wait почти всегда требует for перед человеком."],
  ["Make photo", "Take a photo.", "Could you take a picture?", "Фото в английском не делают, а берут."],
  ["Open me the door", "Open the door for me.", "Could you open the door for me?", "Русский порядок звучит странно, лучше вынести for me в конец."],
  ["I need to go on job", "I need to go to work.", "I have to head to work.", "Work без артикля и без job, когда речь о месте/процессе работы."],
];

function appFinal(features, angle, format) {
  const finalByFormat = {
    diagnosis_ru_learner: `Phraseman — мобильное приложение для живого английского: ${features}. Оно тренирует именно этот затык: услышал вопрос → вспомнил готовую фразу → ответил без паники. Не игра ради очков. ${CTA}`,
    meant_vs_heard: `Phraseman — мобильное приложение для живого английского: ${features}. Оно показывает не только перевод, а тон: как попросить, уточнить и отказаться без лишней резкости. Не игра ради очков. ${CTA}`,
    english_emergency_kit: `Phraseman — мобильное приложение для живого английского: ${features}. Такие наборы лежат под рукой, когда нужно ответить сразу: врач, аэропорт, работа, сервис. Не игра ради очков. ${CTA}`,
    live_situation_breakdown: `Phraseman — мобильное приложение для живого английского: ${features}. Ты тренируешь не отдельные слова, а сценарий: вход, деталь, просьба, следующий шаг. Не игра ради очков. ${CTA}`,
    textbook_vs_real_english: `Phraseman — мобильное приложение для живого английского: ${features}. Оно заменяет дословный перевод живыми фразами, которые звучат естественно в разговоре. Не игра ради очков. ${CTA}`,
  };
  return finalByFormat[format] || `Phraseman — мобильное приложение для живого английского: ${features}. Оно тренирует такие ситуации готовыми фразами, озвучкой и короткой практикой. Не игра ради очков. ${CTA}`;
}

function captionFor(post, pain, takeaway) {
  return `${pain} Главный сдвиг: ${takeaway} Phraseman — мобильное приложение для живого английского: готовые фразы по реальным ситуациям, озвучка, короткие уроки и объяснения по-русски. Не игра ради очков — практика для разговора. ${CTA}`;
}

function diagnosisPost(n, [context, trigger, practice]) {
  const pain = `Английский вроде есть, но ${context} речь внезапно пропадает.`;
  const hooks = [
    {
      title: `Ты понимаешь английский ${context}.\nНо когда ${trigger} — тишина`,
      body: "Это не лень и не отсутствие таланта. Это навык быстрого ответа, который почти никто не тренировал.",
    },
    {
      title: `Английский ${context} есть в голове.\nВо рту — пусто`,
      body: "Ты знаешь больше, чем можешь произнести. Проблема не в знаниях, а в скорости доступа к фразе.",
    },
    {
      title: `Один вопрос на английском ${context} —\nи мозг открывает пустой экран`,
      body: `Особенно когда ${trigger}. В этот момент нужна не грамматика, а готовый первый ход.`,
    },
    {
      title: `Ситуация: ${context}.\nАнглийский становится пассивным`,
      body: "Ты узнаёшь слова, но не успеваешь собрать их в спокойный взрослый ответ.",
    },
  ];
  const hook = hooks[n % hooks.length];
  return {
    post_id: String(n).padStart(3, "0"),
    format: "diagnosis_ru_learner",
    style: "dark_drama",
    problem_angle: pain,
    core_insight: "Понимание не равно готовая речь в моменте.",
    relevant_app_features: ["живые фразы", "озвучка", "короткие уроки"],
    visual_variant: visualVariant("dark_drama", n),
    caption: captionFor(null, pain, "нужны готовые фразы-мостики, которые можно произнести сразу."),
    slides: [
      hook,
      { title: "Ты узнаёшь фразу,\nно не достаёшь её", body: "В голове есть знакомые слова. В реальном разговоре нужен готовый вход, а не словарь по частям." },
      { title: "Мозг начинает переводить\nс русского", body: "Пока ты собираешь идеальное предложение, собеседник уже ждёт ответ." },
      { title: "Страх ошибки съедает\nпервые три секунды", body: "Именно эти три секунды решают: ты входишь в разговор или снова улыбаешься и молчишь." },
      { title: "Что обычно делают зря", body: "Учат ещё один список слов. Но список не помогает, если нет готовой фразы для старта." },
      { title: "Что помогает быстрее", body: "Тренировать короткие фразы-мостики. Они дают время, тон и начало ответа." },
      { title: "Мини-репетиция", body: practice },
      { title: "Тебе нужен не идеальный английский,\nа готовый первый ход", body: appFinal("живые английские фразы, озвучка и мини-практика", pain, "diagnosis_ru_learner") },
    ],
  };
}

function meantPost(n, [intent, literal, better, tone]) {
  const pain = `На английском ты хотел ${intent}, но дословная фраза меняет тон.`;
  const style = n % 2 === 0 ? "cream_editorial" : "dark_drama";
  return {
    post_id: String(n).padStart(3, "0"),
    format: "meant_vs_heard",
    style,
    problem_angle: pain,
    core_insight: "В английском вежливость часто живёт в конструкции, а не в слове please.",
    relevant_app_features: ["живые фразы", "объяснения по-русски", "озвучка"],
    visual_variant: visualVariant(style, n),
    caption: captionFor(null, pain, "заменяй прямую команду на мягкую конструкцию, чтобы звучать взросло и спокойно."),
    slides: [
      { title: `На английском ты хотел ${intent}.\nА прозвучал резче, чем думал`, body: "Русская прямота часто ломает английский тон, даже если смысл понятен." },
      { title: "Что ты имел в виду", body: `Нормальную человеческую просьбу: без давления, без конфликта, без лишней неловкости.` },
      { title: "Что часто пишут дословно", body: literal },
      { title: "Почему это цепляет слух", body: "Фраза короткая и прямая. Для английского сервиса, работы или переписки она может звучать как команда." },
      { title: "Вариант мягче", body: better },
      { title: "Разница не в словаре", body: `Разница в тоне: ${tone}. Поэтому важно учить фразы целиком.` },
      { title: "Мини-правило", body: "Если русская фраза звучит как приказ, в английском добавь could, would, chance, afraid или just checking." },
      { title: "Чтобы тебя понимали без лишней резкости", body: appFinal("готовые мягкие формулы, русские пояснения и аудио", pain, "meant_vs_heard") },
    ],
  };
}

function emergencyPost(n, [situation, phrases]) {
  const pain = `В английском разговоре нужна не теория, а набор фраз для ситуации: ${situation}.`;
  const style = "cream_editorial";
  return {
    post_id: String(n).padStart(3, "0"),
    format: "english_emergency_kit",
    style,
    problem_angle: pain,
    core_insight: "Сохраняемые карусели работают, когда дают готовые фразы под стрессовый момент.",
    relevant_app_features: ["10,000+ фраз", "озвучка", "тренировка произношения"],
    visual_variant: visualVariant(style, n),
    caption: captionFor(null, pain, "выучи не одно слово, а короткий сценарий из 3-5 фраз."),
    slides: [
      { title: `Если ${situation},\nне ищи грамматику в панике`, body: "Держи короткий набор английских фраз, которые можно сказать сразу." },
      { title: "Фраза для старта", body: phrases[0] },
      { title: "Фраза, чтобы замедлить разговор", body: phrases[1] },
      { title: "Фраза для уточнения", body: phrases[2] },
      { title: "Фраза, чтобы перевести в текст", body: phrases[3] },
      { title: "Фраза, чтобы проверить смысл", body: phrases[4] },
      { title: "Почему это работает", body: "Ты не строишь английский с нуля. Ты достаёшь готовую формулу под ситуацию и сохраняешь взрослый тон." },
      { title: "Такие наборы надо держать под рукой", body: appFinal("10,000+ живых фраз, озвучка и тренировка произношения", pain, "english_emergency_kit") },
    ],
  };
}

function livePost(n, [situation, bad, first, follow, finalRequest]) {
  const pain = `Реальная ситуация на английском: ${situation}.`;
  const style = "cream_editorial";
  return {
    post_id: String(n).padStart(3, "0"),
    format: "live_situation_breakdown",
    style,
    problem_angle: pain,
    core_insight: "Ситуационный сценарий лучше, чем случайные слова.",
    relevant_app_features: ["жизненные ситуации", "короткие уроки", "аудио"],
    visual_variant: visualVariant(style, n),
    caption: captionFor(null, pain, "говори не одним резким предложением, а маленькой цепочкой: вход, детали, просьба."),
    slides: [
      { title: `На английском ${situation}.\nИ нельзя просто молчать`, body: "Вот как пройти ситуацию без резкости и детского ощущения." },
      { title: "Так звучит слишком прямо", body: bad },
      { title: "Сначала мягкий вход", body: first },
      { title: "Потом конкретная деталь", body: follow },
      { title: "И только потом просьба", body: finalRequest },
      { title: "Почему порядок важен", body: "Английский тон часто строится как маленькая лестница: контекст, факт, просьба. Не удар одной фразой." },
      { title: "Мини-шаблон", body: "I'm sorry, but...\nThe problem is...\nCould you...?\nWhat are the next steps?" },
      { title: "В реальности побеждает сценарий,\nа не отдельное слово", body: appFinal("сценарии для реальных ситуаций, аудио и короткие уроки", pain, "live_situation_breakdown") },
    ],
  };
}

function textbookPost(n, [wrong, correct, natural, reason]) {
  const pain = `На английском ${wrong} выдаёт перевод с русского.`;
  const style = n % 2 === 0 ? "cream_editorial" : "dark_drama";
  return {
    post_id: String(n).padStart(3, "0"),
    format: "textbook_vs_real_english",
    style,
    problem_angle: pain,
    core_insight: "Натуральность появляется, когда фраза учится целиком.",
    relevant_app_features: ["живые альтернативы", "русские объяснения", "озвучка"],
    visual_variant: visualVariant(style, n),
    caption: captionFor(null, pain, "не переводи конструкцию дословно, запоминай живую формулу целиком."),
    slides: [
      { title: `На английском ${wrong}\nзвучит как русский шаблон`, body: "Смысл могут понять. Но фраза сразу выдаёт перевод в голове." },
      { title: "Школьный вариант", body: wrong },
      { title: "Нормальный вариант", body: correct },
      { title: "Живее в разговоре", body: natural },
      { title: "Почему русскоязычные так говорят", body: reason },
      { title: "Мини-правило", body: "Если фраза собрана из русских кирпичиков, проверь её как готовую английскую формулу." },
      { title: "Повтори вслух", body: `${correct}\n${natural}` },
      { title: "Чтобы говорить не учебником,\nа живыми фразами", body: appFinal("живые альтернативы, русские объяснения и озвучка", pain, "textbook_vs_real_english") },
    ],
  };
}

function createPosts(count = 50) {
  const builders = [
    [diagnosisTopics, diagnosisPost],
    [meantVsHeardTopics, meantPost],
    [emergencyTopics, emergencyPost],
    [liveTopics, livePost],
    [textbookTopics, textbookPost],
  ];
  const posts = [];
  for (let i = 0; i < count; i += 1) {
    const [list, builder] = builders[i % builders.length];
    const topic = list[Math.floor(i / builders.length) % list.length];
    posts.push(applyCarouselResearchUpgrades(builder(i + 1, topic)));
  }
  return { batch_name: DEFAULT_BATCH, generated_at: new Date().toISOString(), posts };
}

async function zipDir(sourceDir, zipPath, rootName) {
  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = new archiver.ZipArchive({ zlib: { level: 9 } });
    output.on("close", resolve);
    archive.on("error", reject);
    archive.pipe(output);
    archive.directory(sourceDir, rootName);
    archive.finalize();
  });
}

function writeQualityReport(outputRoot, data, errors) {
  const formatCounts = {};
  const styleCounts = {};
  for (const post of data.posts) {
    formatCounts[post.format] = (formatCounts[post.format] || 0) + 1;
    styleCounts[post.style] = (styleCounts[post.style] || 0) + 1;
  }
  const lines = [
    "# Viral Carousel Quality Report",
    "",
    `Batch: ${data.batch_name}`,
    `Posts: ${data.posts.length}`,
    `Slides: ${data.posts.reduce((sum, post) => sum + post.slides.length, 0)}`,
    `Validation: ${errors.length ? "FAILED" : "PASSED"}`,
    "",
    "## Format Mix",
    "",
    ...Object.entries(formatCounts).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Style Mix",
    "",
    ...Object.entries(styleCounts).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Pipeline Improvements Applied",
    "",
    "- Deterministic 1080x1350 SVG-to-PNG rendering through sharp.",
    "- Auto text wrapping and font shrinking before PNG export.",
    "- Strict first-slide English marker validation.",
    "- Carousel research upgrade: stronger first-slide retention bridge, save value, adult use case, and real-situation framing.",
    "- 20 audience validator agents with hard score thresholds before export.",
    "- Visual style remains locked to the proven themes: `dark_drama` and `cream_editorial`.",
    "- Contextual final-slide CTA validation: Phraseman is named as a mobile app, positioned against generic points/gamified learning, and tied to the carousel format.",
    "- Duplicate post, duplicate caption, counter, footer, top-label and bad-spelling guards.",
    "- Publer CSV keeps one row per carousel, not one row per slide.",
    "- ZIP export for batch handoff.",
    "",
    "## Audience Validators",
    "",
    ...AUDIENCE_VALIDATOR_AGENTS.map((agent) => `- ${agent.id}: ${agent.audience}, threshold ${agent.threshold}`),
    "",
    "## GitHub References",
    "",
    "- DataTalksClub/carousel-automation: template batch rendering pattern.",
    "- frinyvonnick/node-html-to-image: HTML-to-image API reference.",
    "- Hainrixz/open-carrusel: local-first carousel workflow reference.",
  ];
  fs.writeFileSync(path.join(outputRoot, "quality_report.md"), `${lines.join("\n")}\n`, "utf8");
}

async function renderBatch(data, outputRoot, baseUrl = "") {
  fs.mkdirSync(outputRoot, { recursive: true });
  const manifest = [];
  const captionsRows = [["post_id", "format", "style", "caption"]];
  const publerRows = [["Date", "Text", "Link", "Media URL", "Title", "Label", "Alt text(s)", "Comment(s)", "Pin board", "Post subtype"]];

  for (const post of data.posts) {
    const postDirName = `post_${post.post_id}`;
    const postDir = path.join(outputRoot, postDirName);
    fs.mkdirSync(postDir, { recursive: true });
    const slideFiles = [];

    for (let i = 0; i < post.slides.length; i += 1) {
      const filename = `slide_${String(i + 1).padStart(2, "0")}.png`;
      const outputPath = path.join(postDir, filename);
      const svg = renderSvg(post, post.slides[i], i);
      await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(outputPath);
      slideFiles.push(filename);
    }

    fs.writeFileSync(path.join(postDir, "caption.txt"), post.caption, "utf8");
    fs.writeFileSync(path.join(postDir, "metadata.json"), JSON.stringify(post, null, 2), "utf8");
    manifest.push({
      post_id: post.post_id,
      format: post.format,
      style: post.style,
      slides: slideFiles.length,
      dir: postDirName,
      files: slideFiles,
    });
    captionsRows.push([post.post_id, post.format, post.style, post.caption]);
    const urls = baseUrl
      ? slideFiles.map((file) => `${baseUrl.replace(/\/$/, "")}/${postDirName}/${file}`).join(",")
      : "";
    publerRows.push(["", post.caption, "", urls, "", "english_carousel", "", "", "", "carousel"]);
  }

  fs.writeFileSync(path.join(outputRoot, "posts.json"), JSON.stringify(data, null, 2), "utf8");
  fs.writeFileSync(path.join(outputRoot, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  fs.writeFileSync(path.join(outputRoot, "captions.csv"), toCsv(captionsRows), "utf8");
  fs.writeFileSync(path.join(outputRoot, "publer_upload_template.csv"), toCsv(publerRows), "utf8");
}

async function main() {
  const args = parseArgs();
  const count = Number(args.count || 50);
  const batch = args.batch || DEFAULT_BATCH;
  const input = args.input ? path.resolve(args.input) : null;
  const outputRoot = path.resolve(args.output || "output", batch);
  const data = input ? JSON.parse(fs.readFileSync(input, "utf8")) : createPosts(count);
  data.batch_name = batch;
  const errors = validateBatch(data);

  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }

  if (args["validate-only"]) {
    console.log(`OK: ${data.posts.length} posts passed validation`);
    return;
  }

  await renderBatch(data, outputRoot, args["base-url"] || "");
  writeQualityReport(outputRoot, data, errors);
  const zipPath = path.resolve(args.output || "output", `${batch}.zip`);
  await zipDir(outputRoot, zipPath, batch);

  console.log(`Generated ${data.posts.length} carousels`);
  console.log(`Output: ${outputRoot}`);
  console.log(`ZIP: ${zipPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
