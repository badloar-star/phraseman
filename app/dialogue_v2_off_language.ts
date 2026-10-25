/**
 * Диалоги: реплика ученика не на изучаемом языке.
 *
 * зачем (владелец 18.10 через координатора 09:58): человек изучает английский, а пишет по-русски или по-французски —
 * собеседник должен ответить на ИЗУЧАЕМОМ языке в духе «извини, я не понимаю, о чём ты», каждый раз по-разному, и реплика
 * не засчитывается как ответ. Определение — на клиенте и бесплатно: такая реплика не уходит на сервер, не тратит ни квоту,
 * ни энергию, ни вызов OpenAI.
 *
 * ЗАМОК ВЛАДЕЛЬЦА 18.10 уточнён словом владельца 24.10 (подсказки для новичков): вместо «не понимаю» собеседник мягко
 * зовёт сказать то же на изучаемом языке и показывает на подсказки «Можно сказать…» под лентой (они всегда видны, кроме it —
 * там фразы без ссылки на подсказки). Реплика по-прежнему не засчитывается и ничего не тратит.
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

/** Короткие слова, которые есть в нескольких языках (или в английском как «no», «a», «in») — не улика. */
const AMBIGUOUS: ReadonlySet<string> = new Set(['no', 'a', 'i', 'o', 'e', 'y', 'de', 'la', 'le', 'un', 'una', 'in', 'do', 'to', 'me', 'mi', 'tu', 'ma', 'ne', 'na', 'w', 'z', 'ja', 'si', 'ok', 'ya', 'da', 'del', 'al', 'es', 'en', 'die', 'was', 'son', 'per', 'con', 'as']);

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
  // зачем (Ревизор 18.10): «No, no, no, thanks» при английском считалось испанским — «no» трижды. Считаем только РАЗНЫЕ слова,
  // двусмысленные короткие (no/a/de/la/un/in/…) признаком чужого языка не считаем, и слово из списка изучаемого языка — тоже.
  const distinct = [...new Set(words)].filter((word) => !AMBIGUOUS.has(word));
  const score = (lang: string) => distinct.reduce((sum, word) => sum + (SETS[lang]?.has(word) && (lang === target || !SETS[target]?.has(word)) ? 1 : 0), 0);
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
    'No worries! Let\'s try it in English — the hints below can help.',
    'That\'s okay! Can you say it in English? Pick a hint if you like.',
    'Let\'s keep going in English. Try one of the phrases below!',
    'Good try! Now say it in English — a hint is right below.',
    'No problem. Try a short sentence in English.',
    'Let\'s practise in English! You can start with a hint below.',
    'It\'s fine! Just a few words in English is great.',
    'Try it in English — even one word is a good start.',
    'Let\'s say it in English together. Look at the hints below.',
    'Almost there! Can you say that in English?',
    'Take your time. Try it in English, step by step.',
    'Let\'s switch to English. Tap a hint and send it!',
  ],
  es: [
    '¡No pasa nada! Vamos a intentarlo en español. Las pistas de abajo te ayudan.',
    'Está bien. ¿Puedes decirlo en español? Elige una pista si quieres.',
    'Sigamos en español. ¡Prueba una de las frases de abajo!',
    '¡Buen intento! Ahora dilo en español; hay una pista justo abajo.',
    'Sin problema. Prueba con una frase corta en español.',
    '¡Practiquemos en español! Puedes empezar con una pista de abajo.',
    '¡Todo bien! Unas pocas palabras en español ya están genial.',
    'Inténtalo en español: una sola palabra ya es un buen comienzo.',
    'Digámoslo en español juntos. Mira las pistas de abajo.',
    '¡Casi! ¿Puedes decirlo en español?',
    'Con calma. Inténtalo en español, paso a paso.',
    'Pasemos al español. ¡Toca una pista y envíala!',
  ],
  fr: [
    'Pas de souci ! Essayons en français, les indices en bas peuvent t\'aider.',
    'D\'accord. Tu peux le dire en français ? Choisis un indice si tu veux.',
    'Continuons en français. Essaie une des phrases en bas !',
    'Bel essai ! Maintenant, dis-le en français : un indice est juste en bas.',
    'Pas de problème. Essaie une petite phrase en français.',
    'On pratique en français ! Tu peux commencer avec un indice en bas.',
    'Tout va bien ! Quelques mots en français, c\'est déjà super.',
    'Essaie en français : un seul mot, c\'est déjà un bon début.',
    'Disons-le ensemble en français. Regarde les indices en bas.',
    'Presque ! Tu peux le dire en français ?',
    'Prends ton temps. Essaie en français, petit à petit.',
    'Passons au français. Touche un indice et envoie-le !',
  ],
  de: [
    'Kein Problem! Versuch es auf Deutsch – die Tipps unten helfen dir.',
    'Alles gut. Kannst du es auf Deutsch sagen? Nimm gern einen Tipp.',
    'Machen wir auf Deutsch weiter. Probier einen Satz von unten!',
    'Guter Versuch! Jetzt sag es auf Deutsch – ein Tipp ist gleich unten.',
    'Kein Stress. Versuch einen kurzen Satz auf Deutsch.',
    'Lass uns Deutsch üben! Du kannst mit einem Tipp unten anfangen.',
    'Alles in Ordnung! Ein paar Wörter auf Deutsch sind schon super.',
    'Versuch es auf Deutsch – schon ein Wort ist ein guter Anfang.',
    'Sagen wir es zusammen auf Deutsch. Schau dir die Tipps unten an.',
    'Fast! Kannst du das auf Deutsch sagen?',
    'Lass dir Zeit. Versuch es auf Deutsch, Schritt für Schritt.',
    'Wechseln wir zu Deutsch. Wähl einen Tipp und schick ihn ab!',
  ],
  // it: подсказок «Можно сказать…» для итальянского нет — фразы на них не ссылаются, а предлагают начать с простого слова
  it: [
    'Nessun problema! Proviamo in italiano.',
    'Va bene. Puoi dirlo in italiano?',
    'Continuiamo in italiano. Prova con una frase semplice!',
    'Bel tentativo! Ora prova a dirlo in italiano.',
    'Nessuna fretta. Prova con una frase breve in italiano.',
    'Facciamo pratica in italiano! Inizia con un semplice «Ciao».',
    'Tutto bene! Anche poche parole in italiano vanno benissimo.',
    'Prova in italiano: anche una sola parola è un buon inizio.',
    'Diciamolo insieme in italiano. Per esempio: «Buongiorno!»',
    'Quasi! Puoi dirlo in italiano?',
    'Con calma. Prova in italiano, un passo alla volta.',
    'Passiamo all\'italiano. Una parola alla volta va benissimo!',
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

const SOFT_NUDGE_TEXTS: ReadonlySet<string> = new Set(Object.values(NOT_UNDERSTOOD).flat());

/** Это мягкий ответ «скажи то же на изучаемом языке»? — подсказки отвечают не на него, а на вопрос собеседника перед ним. */
export function isDialogueSoftNudgeReply(text: string): boolean {
  return SOFT_NUDGE_TEXTS.has(text);
}

/* expo-router route shim: служебный модуль в app/ не должен считаться экраном */
export default function __DialogueV2OffLanguageRouteShim() { return null; }
