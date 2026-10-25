// dialogue_v2_say_hints_pick.ts — какие фразы «Можно сказать…» показать над полем ввода Диалогов сейчас.
// зачем (владелец 24.10 через координатора: «постоянно должны быть подсказки, потому что я ноль, но хочу учиться»; жалоба
// владельца 25.10: «подсказки почему не относятся никак к реплике собеседника»): прежде фразы подбирались по цели шага (сценарий) и
// по числу своих реплик (свободный разговор) — на что ответил собеседник, не смотрели. Теперь — по ПОСЛЕДНЕЙ реплике собеседника:
// приветствие, «как дела», «как тебя зовут / о себе», заказ, предложение, прощание, вопрос «да/нет». Не распознали — подсказок нет
// (решение координатора 25.10: лучше не показывать, чем нерелевантные). Источник фраз — локальный набор Ядра (ноль сетевых вызовов);
// когда сервер начнёт присылать фразы в ответе хода, меняется только этот модуль. Список кэшируется по ключу — экран получает тот же объект.
import { sanitizeDialogSayHints, type DialogSayHint } from '../components/dialogs/hints/dialog_say_hints_model';
import { localSayHints, type SayHintGoalKind } from './dialogue_v2_say_hints_local';
import { isDialogueSoftNudgeReply } from './dialogue_v2_off_language';

const LOG = '[DIALOG-HINTS]';
const NO_HINTS: readonly DialogSayHint[] = Object.freeze([]);

type ReplyKind = Extract<SayHintGoalKind, 'greet' | 'howAreYou' | 'introduce' | 'order' | 'confirm' | 'goodbye' | 'generic'>;
type Rule = readonly [ReplyKind, string, RegExp];

// Порядок важен: «Hello! How are you?» — это «как дела», а не приветствие; «Nice to meet you, what's your name?» — «о себе».
// Ключ (второе поле) пишется в журнал — по нему видно, какое правило сработало.
const RULES: Readonly<Record<'en' | 'es' | 'fr' | 'de', readonly Rule[]>> = {
  en: [
    ['howAreYou', 'how_are_you', /\bhow are you\b|\bhow's it going\b|\bhow are things\b|\bhow have you been\b|\bhow do you do\b/i],
    ['introduce', 'your_name', /\bwhat(?:'s| is) your name\b|\bwho are you\b|\btell me (?:a bit )?about yourself\b|\bwhere are you from\b|\bintroduce yourself\b/i],
    ['order', 'order', /\bwhat (?:would you like|can i get you)\b|\bready to order\b|\banything (?:else|to drink|to eat)\b|\bwhat(?:'ll| will) you have\b|\btake your order\b/i],
    ['confirm', 'proposal', /\bshall we\b|\bhow about\b|\bwhat about\b|\blet's\b|\bdo you want to\b|\bwould you like to\b|\bwhy don't we\b/i],
    ['goodbye', 'goodbye', /\bgood ?bye\b|\bbye\b|\bsee you\b|\btake care\b|\bhave a (?:nice|good|great) day\b/i],
    ['greet', 'greeting', /^\s*(?:hi|hello|hey|good (?:morning|afternoon|evening))\b/i],
    ['generic', 'yes_no', /(?:^|[.!?]\s+)(?:do|does|did|are|is|was|were|can|could|will|would|have|has|should)\b[^?]*\?/i],
  ],
  es: [
    ['howAreYou', 'como_estas', /c[oó]mo est[aá]s|c[oó]mo est[aá] usted|qu[eé] tal(?! si)|c[oó]mo te va/i],
    ['introduce', 'como_te_llamas', /c[oó]mo te llamas|c[oó]mo se llama usted|cu[aá]l es tu nombre|de d[oó]nde eres|h[aá]blame de ti/i],
    ['order', 'pedido', /qu[eé] (?:te|le) (?:pongo|sirvo|gustar[ií]a)|qu[eé] (?:vas|va) a (?:tomar|pedir)|algo (?:m[aá]s|de beber|para beber)|desea[s]? (?:algo|pedir)/i],
    ['confirm', 'propuesta', /qu[eé] tal si|te parece|quieres (?:ir|venir|quedar)|te gustar[ií]a|podemos|vamos a/i],
    ['goodbye', 'adios', /adi[oó]s|hasta (?:luego|pronto|ma[nñ]ana)|que tengas (?:un )?buen d[ií]a/i],
    ['greet', 'saludo', /^\s*¡?\s*(?:hola|buen(?:os|as) (?:d[ií]as|tardes|noches))/i],
    ['generic', 'si_no', /¿(?!\s*(?:qu[eé]|c[oó]mo|d[oó]nde|cu[aá]ndo|qui[eé]n|cu[aá]l|cu[aá]nt|por qu[eé]))[^?]*\?/i],
  ],
  fr: [
    ['howAreYou', 'comment_ca_va', /comment (?:[cç]a va|vas-tu|allez-vous)|[cç]a va\s*\?/i],
    ['introduce', 'comment_tu_t_appelles', /comment (?:tu t'appelles|vous vous appelez|t'appelles-tu)|quel est ton nom|d'o[uù] (?:viens-tu|venez-vous|tu viens)|pr[ée]sente-toi/i],
    ['order', 'commande', /qu'est-ce que (?:je vous sers|vous (?:d[ée]sirez|prenez)|tu prends)|vous d[ée]sirez|autre chose|que (?:puis-je|je peux) vous servir/i],
    ['confirm', 'proposition', /on pourrait|[cç]a te dit|[cç]a vous dit|tu veux (?:aller|venir)|voulez-vous|et si on/i],
    ['goodbye', 'au_revoir', /au revoir|[aà] bient[oô]t|[aà] plus|bonne journ[ée]e/i],
    ['greet', 'salutation', /^\s*(?:bonjour|salut|bonsoir)\b/i],
    ['generic', 'oui_non', /(?:^|[.!?]\s+)(?:est-ce que|as-tu|avez-vous|es-tu|[eê]tes-vous|peux-tu|pouvez-vous|veux-tu|tu (?:as|es|veux|peux|aimes))\b[^?]*\?/i],
  ],
  de: [
    ['howAreYou', 'wie_gehts', /wie geht'?s|wie geht es (?:dir|ihnen)/i],
    ['introduce', 'wie_heisst_du', /wie hei(?:ß|ss)t du|wie hei(?:ß|ss)en sie|wie ist dein name|woher kommst du|erz[äa]hl.* von dir/i],
    ['order', 'bestellung', /was (?:m[öo]chtest|m[öo]chten|darf es sein|h[äa]tten|nimmst|nehmen)|sonst noch|schon gew[äa]hlt/i],
    ['confirm', 'vorschlag', /wollen wir|sollen wir|wie w[äa]re es|hast du lust|lass uns/i],
    ['goodbye', 'abschied', /tsch[üu]ss|auf wiedersehen|bis (?:bald|sp[äa]ter|morgen)|sch[öo]nen tag/i],
    ['greet', 'gruss', /^\s*(?:hallo|hi|guten (?:morgen|tag|abend)|servus|moin)\b/i],
    ['generic', 'ja_nein', /(?:^|[.!?]\s+)(?:hast|haben|bist|sind|ist|kannst|k[öo]nnen|willst|wollen|m[öo]chtest|magst|gehst|kommst)\b[^?]*\?/i],
  ],
};

export type PartnerReplyKind = Readonly<{ kind: ReplyKind; key: string }>;

/** Каким ответом подсказывать на реплику собеседника. null — не распознали (подсказок нет). */
export function sayHintKindForPartnerReply(text: string, studyTarget: string): PartnerReplyKind | null {
  const rules = RULES[studyTarget as keyof typeof RULES];
  if (!rules || typeof text !== 'string' || !text.trim()) return null;
  for (const [kind, key, re] of rules) if (re.test(text)) return { kind, key };
  return null;
}

export type PartnerReplyForHints = Readonly<{ id: string; text: string }>;

/**
 * Последняя реплика собеседника, на которую подсказываем ответ: мягкий ответ «скажи на изучаемом языке» пропускаем — отвечать
 * нужно на вопрос собеседника перед ним (подсказки «внизу», на которые он ссылается, должны быть про этот вопрос).
 */
export function lastPartnerReplyForHints<M extends Readonly<{ id: string; author: string; text: string }>>(
  messages: readonly M[],
  isPartner: (message: M) => boolean,
): Readonly<{ reply: PartnerReplyForHints | null; skippedNudge: number }> {
  let skippedNudge = 0;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]!;
    if (!isPartner(message)) continue;
    if (isDialogueSoftNudgeReply(message.text)) { skippedNudge += 1; continue; }
    return { reply: { id: message.id, text: message.text }, skippedNudge };
  }
  return { reply: null, skippedNudge };
}

const cache = new Map<string, readonly DialogSayHint[]>();
let lastLoggedKey = '';

/**
 * Подсказки на последнюю реплику собеседника. reply — последняя реплика собеседника, которая не мягкий ответ «скажи на изучаемом языке»
 * (её выбирает маршрут); skippedNudge — сколько мягких ответов пропущено (для журнала).
 */
export function dialogueV2SayHintsForPartnerReply(input: Readonly<{
  screen: 'scenario' | 'freeform';
  studyTarget: string;
  interfaceLang: string;
  reply: PartnerReplyForHints | null;
  skippedNudge?: number;
}>): readonly DialogSayHint[] {
  const { screen, studyTarget, interfaceLang, reply } = input;
  const match = reply ? sayHintKindForPartnerReply(reply.text, studyTarget) : null;
  const logKey = `${screen}|${studyTarget}|${interfaceLang}|${reply?.id ?? '-'}|${match?.key ?? '-'}`;
  const hints = match ? cachedHints(studyTarget, match.kind, interfaceLang) : NO_HINTS;
  if (logKey !== lastLoggedKey) {
    lastLoggedKey = logKey;
    console.log(LOG, JSON.stringify({
      screen, replyId: reply?.id ?? null, replyText: reply ? reply.text.slice(0, 60) : null, skippedNudge: input.skippedNudge ?? 0,
      source: match ? 'local_by_reply' : 'none', kind: match?.kind ?? null, key: match?.key ?? null,
      reason: !reply ? 'no_partner_reply' : match ? 'matched' : 'reply_not_recognized_hidden',
      shown: hints.map((hint) => hint.text), studyTarget, interfaceLang,
    })); // guard-ok: одна строка на смену реплики/решения
  }
  return hints;
}

function cachedHints(studyTarget: string, kind: SayHintGoalKind, interfaceLang: string): readonly DialogSayHint[] {
  const key = `${studyTarget}|${kind}|${interfaceLang}`;
  let hints = cache.get(key);
  if (!hints) {
    hints = sanitizeDialogSayHints(localSayHints({ studyTarget, goalKind: kind, interfaceLang }));
    cache.set(key, hints);
  }
  return hints;
}
