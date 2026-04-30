/**
 * Собирает app/flashcards/bundles/official_small_talk_en.json из small_talk_victoria_seed.ts
 * — транскрипция IPA по строке EN (getTranscription), «дословно»/пояснения привязаны к фразе, не к одному шаблону категории.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getTranscription } from "../app/transcription";
import { SMALL_TALK_CATEGORIES, SMALL_TALK_ROWS } from "./small_talk_victoria_seed";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PLACEHOLDERS = {
  en: {
    name: "Alex",
    team: "the design team",
    topic: "user trust",
    place: "Warsaw",
    thing: "async reviews",
    field: "product leadership",
    role: "a senior product role",
    person: "my teammate Sam",
  },
  ru: {
    name: "Алекс",
    team: "продукта",
    topic: "доверие пользователей",
    place: "Варшаве",
    thing: "асинхронных ревью",
    field: "лидерстве",
    role: "senior product",
    person: "Сэмом",
  },
  uk: {
    name: "Алекс",
    team: "продукту",
    topic: "довіри користувачів",
    place: "Варшаві",
    thing: "асинхронних рев'ю",
    field: "лідерстві",
    role: "senior product",
    person: "Семом",
  },
};

function fill(str: string, lang: "en" | "ru" | "uk"): string {
  if (!str || !str.includes("{")) return str;
  const m = PLACEHOLDERS[lang] || PLACEHOLDERS.en;
  return str.replace(/\{(\w+)\}/g, (_, k) => m[k as keyof (typeof PLACEHOLDERS)["en"]] ?? `…${k}…`);
}

type CatKey = keyof typeof SMALL_TALK_CATEGORIES;

function buildCard(row: (typeof SMALL_TALK_ROWS)[number], index: number) {
  const cat = SMALL_TALK_CATEGORIES[row.c as CatKey];
  if (!cat) throw new Error(`Unknown category: ${row.c}`);
  const n = String(index + 1).padStart(3, "0");
  const enF = fill(row.en, "en");
  const ruF = fill(row.ru, "ru");
  const ukF = fill(row.uk, "uk");

  return {
    id: `stx_${n}`,
    en: enF,
    transcription: getTranscription(enF),
    ru: ruF,
    uk: ukF,
    literalRu: `Дословно по смыслу: ${ruF} (${cat.lru})`,
    literalUk: `Дослівно за змістом: ${ukF} (${cat.luk})`,
    explanationRu: `Пример: ${row.exru} ${cat.eru}`,
    explanationUk: `Приклад: ${row.exuk} ${cat.euk}`,
    exampleEn: row.exen,
    exampleRu: row.exru,
    exampleUk: row.exuk,
    register: "neutral",
    level: "B1",
    usageNoteRu:
      "Small talk: вежливый тон, короткие вопросы; на ивентах и нетфорке — без давления и «допроса».",
    usageNoteUk:
      "Small talk: ввічливий тон, короткі питання; на івентах — без тиску й «допиту».",
  };
}

const cards = SMALL_TALK_ROWS.map((r, i) => buildCard(r, i));
if (cards.length !== 60) {
  throw new Error(`Expected 60 cards, got ${cards.length}`);
}

const out = {
  pipeline: "VICTORIA",
  status: "READY_FOR_HUMAN_REVIEW",
  pack: {
    id: "official_small_talk_en",
    titleRu: "Первый контакт",
    titleUk: "Перший контакт",
    descriptionRu:
      "Фразы для small talk и нетфоркинга: знакомства, ивенты, лёгкие темы, работа в общих чертах, комплименты, выход из разговора и договорённости о контакте — без «допроса» и пассивной агрессии.",
    descriptionUk:
      "Фрази для small talk і нетворкингу: знайомства, івенти, легкі теми, робота в загальних рисах, компліменти, вихід з розмови й домовленості про контакт — без «допиту» й пасивної агресії.",
    category: "daily",
    cardCount: 60,
    priceShards: 130,
    targetLevel: "A2-B2",
    authorName: "PhraseMan Team",
    isOfficial: true,
  },
  cards,
};

const dest = path.join(__dirname, "../app/flashcards/bundles/official_small_talk_en.json");
fs.writeFileSync(dest, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log("Wrote", dest, "cards:", cards.length);
