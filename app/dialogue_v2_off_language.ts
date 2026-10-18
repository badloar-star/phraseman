/**
 * Диалоги: реплика ученика не на изучаемом языке.
 *
 * зачем (владелец 18.10 через координатора 09:58): человек изучает английский, а пишет по-русски или по-французски —
 * собеседник должен ответить на ИЗУЧАЕМОМ языке в духе «извини, я не понимаю, о чём ты», каждый раз по-разному, и реплика
 * не засчитывается как ответ. Определение — на клиенте и бесплатно: такая реплика не уходит на сервер, не тратит ни квоту,
 * ни энергию, ни вызов OpenAI.
 *
 * Определитель осторожный: короткие реплики, имена и смешанный текст пропускаются как обычно (ложное «не понимаю» на
 * правильный ответ хуже, чем пропущенная чужая фраза). Журнал решений — [DIALOG-OFF-LANG] у вызывающего.
 */
// зачем (координатор 18.10): итальянский открыт (D188) — ответы «не понимаю» нужны и на it.
export type DialogueOffLanguageTarget = 'en' | 'es' | 'fr' | 'de' | 'it';

export type DialogueOffLanguageVerdict = Readonly<{
  offLanguage: boolean;
  /** Что решило: письменность, перевес частых слов чужого языка или «пропуск». */
  reason: 'script' | 'stopwords' | 'too_short' | 'target_or_unclear';
  detected: string | null;
}>;

// Частые служебные слова: только слова, которые почти не встречаются в других языках набора.
const STOPWORDS: Readonly<Record<string, readonly string[]>> = {
  en: ['the', 'and', 'is', 'are', 'you', 'i', 'my', 'your', 'what', 'have', 'this', 'that', 'with', 'for', 'not', 'it', 'do', 'to', 'of', 'am', 'was', 'can', 'want', 'like', 'how', 'yes', 'please', 'thank', 'thanks', 'hello', 'hi', 'would', 'will', 'me'],
  es: ['el', 'la', 'los', 'las', 'y', 'es', 'que', 'de', 'en', 'un', 'una', 'yo', 'tú', 'tu', 'mi', 'por', 'para', 'con', 'no', 'sí', 'quiero', 'tengo', 'estoy', 'muy', 'gracias', 'hola', 'pero', 'cómo', 'qué', 'soy', 'del', 'al'],
  fr: ['le', 'la', 'les', 'et', 'est', 'je', 'tu', 'vous', 'nous', 'un', 'une', 'des', 'du', 'de', 'pas', 'ne', 'que', 'qui', 'pour', 'avec', 'mon', 'ma', 'mes', 'suis', 'bonjour', 'merci', 'oui', 'très', 'c\'est', 'j\'ai', 'veux', 'au', 'aux'],
  de: ['der', 'die', 'das', 'und', 'ist', 'ich', 'du', 'sie', 'wir', 'nicht', 'ein', 'eine', 'mit', 'für', 'mein', 'meine', 'bin', 'habe', 'ja', 'nein', 'danke', 'hallo', 'auch', 'aber', 'wie', 'was', 'zu', 'den', 'dem'],
  pt: ['o', 'os', 'as', 'e', 'é', 'eu', 'você', 'não', 'sim', 'um', 'uma', 'com', 'para', 'meu', 'minha', 'obrigado', 'obrigada', 'olá', 'muito', 'estou', 'tenho', 'quero', 'mas', 'do', 'da'],
  it: ['il', 'lo', 'gli', 'e', 'è', 'io', 'tu', 'non', 'sì', 'un', 'una', 'con', 'per', 'mio', 'mia', 'grazie', 'ciao', 'molto', 'sono', 'ho', 'voglio', 'ma', 'che', 'della', 'del'],
  pl: ['i', 'jest', 'nie', 'tak', 'się', 'ja', 'ty', 'to', 'na', 'w', 'z', 'że', 'mam', 'jestem', 'chcę', 'dziękuję', 'cześć', 'bardzo', 'ale', 'jak', 'co', 'mój', 'moja'],
  tr: ['ve', 'bir', 'bu', 'ben', 'sen', 'değil', 'evet', 'hayır', 'çok', 'teşekkür', 'merhaba', 'var', 'yok', 'ama', 'ne', 'nasıl', 'için', 'ile', 'mi', 'mı'],
  id: ['dan', 'yang', 'saya', 'kamu', 'tidak', 'ya', 'ini', 'itu', 'dengan', 'untuk', 'terima', 'kasih', 'halo', 'sangat', 'mau', 'ada', 'tapi', 'apa', 'bagaimana'],
};

const SETS = Object.fromEntries(Object.entries(STOPWORDS).map(([lang, words]) => [lang, new Set(words)])) as Record<string, Set<string>>;

const NON_LATIN = /[Ѐ-ӿͰ-Ͽ֐-׿؀-ۿ฀-๿぀-ヿ㐀-鿿가-힯]/u;

/** Решение по одной реплике. Цели набора все латинские, поэтому чужая письменность — сразу «не тот язык». */
export function detectDialogueOffLanguage(text: string, target: DialogueOffLanguageTarget): DialogueOffLanguageVerdict {
  const letters = [...text].filter((ch) => /\p{L}/u.test(ch));
  if (letters.length === 0) return { offLanguage: false, reason: 'too_short', detected: null };
  const nonLatin = letters.filter((ch) => NON_LATIN.test(ch)).length;
  // Больше половины букв не латиницей — это не английский/испанский/французский/немецкий (имя латиницей внутри не спасёт).
  if (nonLatin / letters.length > 0.5) {
    return { offLanguage: true, reason: 'script', detected: /[Ѐ-ӿ]/u.test(text) ? 'cyrillic' : 'non_latin' };
  }
  const words = text.toLowerCase().normalize('NFC').split(/[^\p{L}']+/u).filter(Boolean);
  if (words.length < 3) return { offLanguage: false, reason: 'too_short', detected: null };
  const score = (lang: string) => words.reduce((sum, word) => sum + (SETS[lang]?.has(word) ? 1 : 0), 0);
  const targetScore = score(target);
  let best: string | null = null;
  let bestScore = 0;
  for (const lang of Object.keys(SETS)) {
    if (lang === target) continue;
    const value = score(lang);
    if (value > bestScore) { best = lang; bestScore = value; }
  }
  // Явный перевес: ≥2 частых слова чужого языка, вдвое больше, чем изучаемого, и изучаемого не больше одного.
  if (best && bestScore >= 2 && bestScore >= targetScore * 2 + 1 && targetScore <= 1) {
    return { offLanguage: true, reason: 'stopwords', detected: best };
  }
  return { offLanguage: false, reason: 'target_or_unclear', detected: null };
}

/** Ответы собеседника на ИЗУЧАЕМОМ языке — «извини, не понимаю». По 12 вариантов, чтобы не звучать заевшей пластинкой. */
const NOT_UNDERSTOOD: Readonly<Record<DialogueOffLanguageTarget, readonly string[]>> = {
  en: [
    "Sorry, I don't understand what you mean.",
    "Hmm, I'm not sure what you said. Could you try in English?",
    "Sorry, I didn't get that. Can you say it in English?",
    "I'm afraid I don't follow. What do you mean?",
    "Wait, I lost you there. Could you say that again in English?",
    "Sorry, that went over my head. Try English?",
    "I don't quite understand. Can you put it another way?",
    "Pardon? I only speak English, I'm afraid.",
    "Oops, I didn't catch that. In English, please?",
    "Sorry, I have no idea what that means. Say it in English?",
    "Hmm, you lost me. Could you rephrase that in English?",
    "I'm sorry, I can't understand that. One more time in English?",
  ],
  es: [
    'Perdona, no entiendo lo que quieres decir.',
    'Mmm, no estoy seguro de lo que dijiste. ¿Puedes decirlo en español?',
    'Lo siento, no te he entendido. ¿Me lo dices en español?',
    'Me temo que no te sigo. ¿Qué quieres decir?',
    'Espera, me he perdido. ¿Puedes repetirlo en español?',
    'Perdona, eso no lo entiendo. ¿Lo intentas en español?',
    'No te entiendo bien. ¿Puedes decirlo de otra manera?',
    '¿Cómo? Solo hablo español, lo siento.',
    'Uy, no lo he pillado. ¿En español, por favor?',
    'Lo siento, no sé qué significa eso. ¿Me lo dices en español?',
    'Mmm, me he perdido. ¿Puedes reformularlo en español?',
    'Perdona, no puedo entender eso. ¿Otra vez en español?',
  ],
  fr: [
    'Désolé, je ne comprends pas ce que tu veux dire.',
    'Hmm, je ne suis pas sûr de ce que tu as dit. Tu peux le dire en français ?',
    'Pardon, je n\'ai pas compris. Tu me le dis en français ?',
    'J\'ai peur de ne pas te suivre. Tu veux dire quoi ?',
    'Attends, je suis perdu. Tu peux répéter en français ?',
    'Désolé, ça m\'échappe. Tu essaies en français ?',
    'Je ne comprends pas bien. Tu peux le dire autrement ?',
    'Pardon ? Je ne parle que français, désolé.',
    'Oups, je n\'ai pas saisi. En français, s\'il te plaît ?',
    'Désolé, je ne sais pas ce que ça veut dire. Tu le dis en français ?',
    'Hmm, tu m\'as perdu. Tu peux reformuler en français ?',
    'Je suis désolé, je ne comprends pas. Encore une fois en français ?',
  ],
  de: [
    'Entschuldige, ich verstehe nicht, was du meinst.',
    'Hm, ich bin nicht sicher, was du gesagt hast. Kannst du es auf Deutsch sagen?',
    'Sorry, das habe ich nicht verstanden. Sagst du es mir auf Deutsch?',
    'Ich fürchte, ich komme nicht mit. Was meinst du?',
    'Moment, da bin ich raus. Kannst du das auf Deutsch wiederholen?',
    'Entschuldige, das verstehe ich nicht. Versuchst du es auf Deutsch?',
    'Ich verstehe das nicht ganz. Kannst du es anders sagen?',
    'Wie bitte? Ich spreche leider nur Deutsch.',
    'Ups, das habe ich nicht mitbekommen. Auf Deutsch, bitte?',
    'Tut mir leid, ich weiß nicht, was das heißt. Sagst du es auf Deutsch?',
    'Hm, da hast du mich verloren. Kannst du es auf Deutsch umformulieren?',
    'Entschuldigung, das kann ich nicht verstehen. Noch einmal auf Deutsch?',
  ],
  it: [
    'Scusa, non capisco cosa intendi.',
    'Mmm, non sono sicuro di cosa hai detto. Puoi dirlo in italiano?',
    'Scusa, non ho capito. Me lo dici in italiano?',
    'Temo di non seguirti. Cosa vuoi dire?',
    'Aspetta, mi sono perso. Puoi ripeterlo in italiano?',
    'Scusa, questo non lo capisco. Provi in italiano?',
    'Non ti capisco bene. Puoi dirlo in un altro modo?',
    'Come? Purtroppo parlo solo italiano.',
    'Ops, non ho afferrato. In italiano, per favore?',
    'Mi dispiace, non so cosa significa. Me lo dici in italiano?',
    'Mmm, mi hai perso. Puoi riformularlo in italiano?',
    'Scusami, non riesco a capirlo. Ancora una volta in italiano?',
  ],
};

/** Следующий вариант ответа: случайный, но не тот же, что в прошлый раз. */
export function pickDialogueNotUnderstoodReply(
  target: DialogueOffLanguageTarget,
  previousIndex: number | null,
  random: () => number = Math.random,
): Readonly<{ text: string; index: number }> {
  const pool = NOT_UNDERSTOOD[target];
  let index = Math.floor(random() * pool.length) % pool.length;
  if (pool.length > 1 && index === previousIndex) index = (index + 1 + Math.floor(random() * (pool.length - 1))) % pool.length;
  return { text: pool[index]!, index };
}

export const DIALOGUE_NOT_UNDERSTOOD_POOL_SIZE = 12;

/* expo-router route shim: служебный модуль в app/ не должен считаться экраном */
export default function __DialogueV2OffLanguageRouteShim() { return null; }
