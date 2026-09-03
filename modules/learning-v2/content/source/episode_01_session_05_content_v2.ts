/** Exact Full B1 authority for Session 5; legacy greeting content is excluded. */
import type { LocalizedSource } from './session_shard_from_source_v1';

export const EPISODE_01_SESSION_05_EXACT_WORDS_V2 = Object.freeze([
  { id: 'e01-s05-word-cold', target: 'cold', meaning: { ru: 'холодно / холодный', uk: 'холодно / холодний', es: 'frío', 'pt-BR': 'frio', vi: 'lạnh', id: 'dingin', tr: 'soğuk', pl: 'zimno / zimny' } satisfies LocalizedSource },
  { id: 'e01-s05-word-hot', target: 'hot', meaning: { ru: 'жарко / горячий', uk: 'спекотно / гарячий', es: 'caliente', 'pt-BR': 'quente', vi: 'nóng', id: 'panas', tr: 'sıcak', pl: 'gorąco / gorący' } satisfies LocalizedSource },
  { id: 'e01-s05-word-warm', target: 'warm', meaning: { ru: 'тепло / тёплый', uk: 'тепло / теплий', es: 'templado', 'pt-BR': 'morno', vi: 'ấm', id: 'hangat', tr: 'ılık', pl: 'ciepło / ciepły' } satisfies LocalizedSource },
] as const);

export const EPISODE_01_SESSION_05_EXACT_CANONICAL_V2 = Object.freeze([
  'I am cold.', 'I am hot.', 'I am warm.', 'I am here.',
] as const);

export const EPISODE_01_SESSION_05_EXACT_TITLE_V2 = Object.freeze({
  ru: 'Мне холодно', uk: 'Мені холодно', es: 'Tengo frío', 'pt-BR': 'Estou com frio', vi: 'Tôi lạnh', id: 'Saya kedinginan', tr: 'Üşüyorum', pl: 'Jest mi zimno',
} satisfies LocalizedSource);
export const EPISODE_01_SESSION_05_EXACT_SUMMARY_V2 = Object.freeze({
  ru: 'Три состояния температуры присоединяются к знакомому I am.', uk: 'Три температурні стани приєднуються до знайомого I am.', es: 'Tres estados de temperatura se unen al conocido I am.', 'pt-BR': 'Três estados de temperatura entram no conhecido I am.', vi: 'Ba trạng thái nhiệt độ ghép với I am đã biết.', id: 'Tiga keadaan suhu bergabung dengan I am yang sudah dikenal.', tr: 'Üç sıcaklık durumu bilinen I am ile birleşir.', pl: 'Trzy stany temperatury łączą się ze znanym I am.',
} satisfies LocalizedSource);
export const EPISODE_01_SESSION_05_EXACT_GOAL_V2 = Object.freeze({
  ru: 'Узнать cold, hot и warm и сказать о себе I am …', uk: 'Упізнати cold, hot та warm і сказати про себе I am …', es: 'Reconocer cold, hot y warm y decir I am … sobre ti.', 'pt-BR': 'Reconhecer cold, hot e warm e dizer I am … sobre si.', vi: 'Nhận ra cold, hot và warm rồi nói I am … về mình.', id: 'Mengenali cold, hot, dan warm lalu mengatakan I am … tentang diri sendiri.', tr: 'Cold, hot ve warm sözcüklerini tanıyıp kendin için I am … demek.', pl: 'Rozpoznać cold, hot i warm, a potem powiedzieć o sobie I am …',
} satisfies LocalizedSource);
