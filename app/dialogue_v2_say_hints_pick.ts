// dialogue_v2_say_hints_pick.ts — какие фразы «Можно сказать…» показать над полем ввода Диалогов сейчас.
// зачем (владелец 24.10 через координатора: «постоянно должны быть подсказки, потому что я ноль, но хочу учиться»; жалоба
// владельца 25.10: «подсказки почему не относятся никак к реплике собеседника»): прежде фразы подбирались по цели шага (сценарий) и
// по числу своих реплик (свободный разговор) — на что ответил собеседник, не смотрели. Теперь — по ПОСЛЕДНЕЙ реплике собеседника:
// приветствие, «как дела», «как тебя зовут / о себе», заказ, предложение, прощание, вопрос «да/нет». Не распознали — подсказок нет
// (решение координатора 25.10: лучше не показывать, чем нерелевантные). Источник фраз — локальный набор Ядра (ноль сетевых вызовов);
// когда сервер начнёт присылать фразы в ответе хода, меняется только этот модуль. Список кэшируется по ключу — экран получает тот же объект.
// зачем (жалоба владельца 11.11: «подсказки показывают чаще всего фразы невпопад, не в ответ на реплику собеседника, а рандом»;
// журнал: на «…How are you today?» первой подсказкой шло «How are you?»): прежние наборы были собраны по цели шага, а правила
// смотрели на всю реплику и срабатывали по первому слову («Hi! … Do you have a reservation?» → приветствия; любой вопрос о
// заказе → «мне кофе»). Теперь: (1) в сценариях подсказки — готовые ответы, которые сервер прислал вместе с этой репликой
// (их пишет модель, она знает вопрос); (2) запасной локальный набор — только ответы, которые точно подходят: смотрим на
// ПОСЛЕДНИЙ вопрос реплики («как дела», предложение, вопрос «да/нет» без «или»), а приветствие и прощание — лишь когда вопроса
// в реплике нет. Вопросы «как тебя зовут», «что будете заказывать» и любые другие без готового ответа — без локальных подсказок.
import { sanitizeDialogSayHints, type DialogSayHint } from '../components/dialogs/hints/dialog_say_hints_model';
import { localSayHints } from './dialogue_v2_say_hints_local';
import { answerSayHints } from './dialogue_v2_say_hints_answers';
import { isDialogueSoftNudgeReply } from './dialogue_v2_off_language';

const LOG = '[DIALOG-HINTS]';
const NO_HINTS: readonly DialogSayHint[] = Object.freeze([]);
/** Приветствие без вопроса длиннее — уже не «привет», а рассказ: на него «Hello!» не ответ. */
const GREETING_MAX_LENGTH = 40;

type ReplyKind = 'howAreYou' | 'confirm' | 'generic' | 'greet' | 'goodbye';
type Rule = readonly [ReplyKind, string, RegExp];
type TargetRules = Readonly<{
  /** Проверяются по ПОСЛЕДНЕМУ вопросу реплики, по порядку: «как дела» → предложение → «да/нет». */
  question: readonly Rule[];
  /** Вопрос с выбором («here or to go?») — «да/нет» на него не ответ. */
  choice: RegExp;
  /** Проверяются по всей реплике, только когда вопроса в ней нет. */
  statement: readonly Rule[];
}>;

// Ключ (второе поле) пишется в журнал — по нему видно, какое правило сработало.
const RULES: Readonly<Record<'en' | 'es' | 'fr' | 'de', TargetRules>> = {
  en: {
    question: [
      ['howAreYou', 'how_are_you', /\bhow are you\b|\bhow's it going\b|\bhow are things\b|\bhow have you been\b|\bhow do you do\b/i],
      ['confirm', 'proposal', /\bshall we\b|\bhow about\b(?! you\b)|\bwhy don't we\b|\bwhat do you say\b/i],
      ['generic', 'yes_no', /^(?:(?:and|so|but|well),? )?(?:do|does|did|are|is|was|were|can|could|will|would|have|has|should|may)\b/i],
    ],
    choice: /\bor\b/i,
    statement: [
      ['goodbye', 'goodbye', /\bgood ?bye\b|\bbye\b|\bsee you\b|\btake care\b|\bhave a (?:nice|good|great) day\b/i],
      ['greet', 'greeting', /^\s*(?:hi|hello|hey|good (?:morning|afternoon|evening))\b/i],
    ],
  },
  es: {
    question: [
      ['howAreYou', 'como_estas', /c[oó]mo est[aá]s|c[oó]mo est[aá] usted|qu[eé] tal(?! si)|c[oó]mo te va/i],
      ['confirm', 'propuesta', /qu[eé] tal si|te parece|quedamos/i],
      // «да/нет» — вопрос из трёх и более слов без вопросительного слова (в вопросе они пишутся с ударением: qué, cómo, dónde…)
      ['generic', 'si_no', /^(?!.*(?:^|[\s¿])(?:qué|cómo|dónde|cuándo|quién|cuál|cuánt))¿?\s*\S+\s+\S+\s+\S+/i],
    ],
    choice: /\so\s/i,
    statement: [
      ['goodbye', 'adios', /adi[oó]s|hasta (?:luego|pronto|ma[nñ]ana)|que tengas (?:un )?buen d[ií]a/i],
      ['greet', 'saludo', /^\s*¡?\s*(?:hola|buen(?:os|as) (?:d[ií]as|tardes|noches))/i],
    ],
  },
  fr: {
    question: [
      ['howAreYou', 'comment_ca_va', /comment (?:[cç]a va|vas-tu|allez-vous)|^(?:et toi, )?[cç]a va\s*\?/i],
      ['confirm', 'proposition', /on pourrait|[cç]a te dit|[cç]a vous dit|et si on/i],
      ['generic', 'oui_non', /^(?:est-ce que|as-tu|avez-vous|es-tu|[eê]tes-vous|peux-tu|pouvez-vous|veux-tu|voulez-vous|aimes-tu|aimez-vous|tu (?:as|es|veux|peux|aimes|viens)|vous (?:avez|[eê]tes|voulez|pouvez|aimez))(?![a-zà-ÿ])/i],
    ],
    choice: /\sou\s/i,
    statement: [
      ['goodbye', 'au_revoir', /au revoir|[aà] bient[oô]t|[aà] plus|bonne journ[ée]e/i],
      ['greet', 'salutation', /^\s*(?:bonjour|salut|bonsoir)\b/i],
    ],
  },
  de: {
    question: [
      ['howAreYou', 'wie_gehts', /wie geht'?s|wie geht es (?:dir|ihnen)/i],
      ['confirm', 'vorschlag', /wollen wir|sollen wir|wie w[äa]re es|lass uns/i],
      ['generic', 'ja_nein', /^(?:hast|haben|habt|bist|sind|seid|ist|kannst|k[öo]nnen|k[öo]nnt|willst|wollen|m[öo]chtest|m[öo]chten|magst|gehst|kommst|darf|gibt)(?![a-zäöüß])/i],
    ],
    choice: /\soder\s/i,
    statement: [
      ['goodbye', 'abschied', /tsch[üu]ss|auf wiedersehen|bis (?:bald|sp[äa]ter|morgen)|sch[öo]nen tag/i],
      ['greet', 'gruss', /^\s*(?:hallo|hi|guten (?:morgen|tag|abend)|servus|moin)\b/i],
    ],
  },
};

export type PartnerReplyKind = Readonly<{ kind: ReplyKind; key: string }>;

/** Последнее предложение реплики с вопросительным знаком — на него ученик и отвечает; null — вопроса в реплике нет. */
export function lastQuestionOfReply(text: string): string | null {
  const sentences = text.match(/[^.!?…]+[.!?…]*/gu) ?? [];
  for (let index = sentences.length - 1; index >= 0; index -= 1) {
    const sentence = sentences[index]!.trim();
    if (sentence.includes('?')) return sentence;
  }
  return null;
}

/** Каким ответом подсказывать на реплику собеседника. null — готового точного ответа нет (локальных подсказок нет). */
export function sayHintKindForPartnerReply(text: string, studyTarget: string): PartnerReplyKind | null {
  const rules = RULES[studyTarget as keyof typeof RULES];
  if (!rules || typeof text !== 'string' || !text.trim()) return null;
  const question = lastQuestionOfReply(text);
  if (question) {
    for (const [kind, key, re] of rules.question) {
      if (!re.test(question)) continue;
      if (kind === 'generic' && rules.choice.test(question)) return null;
      return { kind, key };
    }
    return null;
  }
  for (const [kind, key, re] of rules.statement) {
    if (!re.test(text)) continue;
    if (kind === 'greet' && text.trim().length > GREETING_MAX_LENGTH) return null;
    return { kind, key };
  }
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

/** Готовые ответы, которые сервер прислал вместе с репликой собеседника (сценарии); replyText — текст той самой реплики. */
export type ServerSayHintsForReply = Readonly<{ replyText: string; hints: readonly DialogSayHint[] }>;

/**
 * Подсказки на последнюю реплику собеседника. reply — последняя реплика собеседника, которая не мягкий ответ «скажи на изучаемом языке»
 * (её выбирает маршрут); skippedNudge — сколько мягких ответов пропущено (для журнала). serverHints — ответы сервера на эту реплику:
 * есть и относятся именно к ней — показываем их, иначе запасной локальный набор.
 */
export function dialogueV2SayHintsForPartnerReply(input: Readonly<{
  screen: 'scenario' | 'freeform';
  studyTarget: string;
  interfaceLang: string;
  reply: PartnerReplyForHints | null;
  skippedNudge?: number;
  serverHints?: ServerSayHintsForReply | null;
}>): readonly DialogSayHint[] {
  const { screen, studyTarget, interfaceLang, reply } = input;
  const server = input.serverHints ?? null;
  const serverForThisReply = reply !== null && server !== null && server.replyText === reply.text;
  const fromServer = server !== null && serverForThisReply && server.hints.length > 0 ? server.hints : null;
  const match = reply && !fromServer ? sayHintKindForPartnerReply(reply.text, studyTarget) : null;
  const hints = fromServer ?? (match ? cachedHints(studyTarget, match.kind, interfaceLang) : NO_HINTS);
  const logKey = `${screen}|${studyTarget}|${interfaceLang}|${reply?.id ?? '-'}|${fromServer ? `server:${fromServer.length}` : match?.key ?? '-'}`;
  if (logKey !== lastLoggedKey) {
    lastLoggedKey = logKey;
    console.log(LOG, JSON.stringify({
      screen, replyId: reply?.id ?? null, replyText: reply ? reply.text.slice(0, 60) : null, skippedNudge: input.skippedNudge ?? 0,
      question: reply ? (lastQuestionOfReply(reply.text) ?? '').slice(0, 60) || null : null,
      source: fromServer ? 'server' : match ? 'local_by_reply' : 'none', kind: match?.kind ?? null, key: match?.key ?? null,
      server: !server ? 'absent' : !serverForThisReply ? 'for_other_reply' : server.hints.length > 0 ? 'used' : 'empty',
      reason: !reply ? 'no_partner_reply' : fromServer ? 'server_answers' : match ? 'matched' : 'reply_not_recognized_hidden',
      shown: hints.map((hint) => hint.text), studyTarget, interfaceLang,
    })); // guard-ok: одна строка на смену реплики/решения
  }
  return hints;
}

function cachedHints(studyTarget: string, kind: ReplyKind, interfaceLang: string): readonly DialogSayHint[] {
  const key = `${studyTarget}|${kind}|${interfaceLang}`;
  let hints = cache.get(key);
  if (!hints) {
    hints = sanitizeDialogSayHints(
      kind === 'greet' || kind === 'goodbye'
        ? localSayHints({ studyTarget, goalKind: kind, interfaceLang })
        : answerSayHints({ studyTarget, kind: kind === 'howAreYou' ? 'howAreYou' : kind === 'confirm' ? 'proposal' : 'yesNo', interfaceLang }),
    );
    cache.set(key, hints);
  }
  return hints;
}
