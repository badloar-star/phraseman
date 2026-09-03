/**
 * Exact Full B1 Session 4 content authority.  It deliberately does not reuse
 * the historical `You are set/done/free` source: this packet continues only
 * the already introduced `I am` frame.
 */
import type { LocalizedSource } from "./session_shard_from_source_v1";

export const EPISODE_01_SESSION_04_EXACT_WORDS_V2 = Object.freeze([
  Object.freeze({
    id: "e01-s04-word-hungry",
    target: "hungry",
    meaning: Object.freeze({ ru: "голоден", uk: "голодний", es: "hambriento", "pt-BR": "com fome", vi: "đói", id: "lapar", tr: "aç", pl: "głodny" } satisfies LocalizedSource),
  }),
  Object.freeze({
    id: "e01-s04-word-thirsty",
    target: "thirsty",
    meaning: Object.freeze({ ru: "хочется пить", uk: "хочеться пити", es: "sediento", "pt-BR": "com sede", vi: "khát", id: "haus", tr: "susamış", pl: "spragniony" } satisfies LocalizedSource),
  }),
  Object.freeze({
    id: "e01-s04-word-sick",
    target: "sick",
    meaning: Object.freeze({ ru: "болен", uk: "хворий", es: "enfermo", "pt-BR": "doente", vi: "ốm", id: "sakit", tr: "hasta", pl: "chory" } satisfies LocalizedSource),
  }),
] as const);

export const EPISODE_01_SESSION_04_EXACT_PHRASES_V2 = Object.freeze([
  "I am hungry.",
  "I am thirsty.",
  "I am sick.",
  "I am here.",
] as const);

export const EPISODE_01_SESSION_04_EXACT_TITLE_V2 = Object.freeze({
  ru: "Я голоден", uk: "Я голодний", es: "Tengo hambre", "pt-BR": "Estou com fome", vi: "Tôi đói", id: "Saya lapar", tr: "Açım", pl: "Jestem głodny",
} satisfies LocalizedSource);

export const EPISODE_01_SESSION_04_EXACT_SUMMARY_V2 = Object.freeze({
  ru: "Три новых состояния присоединяются к уже знакомому I am.", uk: "Три нові стани приєднуються до вже знайомого I am.", es: "Tres estados nuevos se unen al conocido I am.", "pt-BR": "Três novos estados entram no já conhecido I am.", vi: "Ba trạng thái mới ghép với I am đã biết.", id: "Tiga keadaan baru bergabung dengan I am yang sudah dikenal.", tr: "Üç yeni durum, bilinen I am ile birleşir.", pl: "Trzy nowe stany łączą się ze znanym I am.",
} satisfies LocalizedSource);

export const EPISODE_01_SESSION_04_EXACT_GOAL_V2 = Object.freeze({
  ru: "Узнать hungry, thirsty и sick, а затем сказать о себе I am …", uk: "Упізнати hungry, thirsty та sick, а потім сказати про себе I am …", es: "Reconocer hungry, thirsty y sick y decir I am … sobre ti.", "pt-BR": "Reconhecer hungry, thirsty e sick e dizer I am … sobre si.", vi: "Nhận ra hungry, thirsty và sick rồi nói I am … về mình.", id: "Mengenali hungry, thirsty, dan sick lalu mengatakan I am … tentang diri sendiri.", tr: "Hungry, thirsty ve sick sözcüklerini tanıyıp kendin için I am … demek.", pl: "Rozpoznać hungry, thirsty i sick, a potem powiedzieć o sobie I am …",
} satisfies LocalizedSource);
