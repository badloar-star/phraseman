// task_prompt_parts_v1.ts — разбор нынешних текстов заданий Learning V2 на поля макета №23.
// зачем (владелец, реестр №23, docs/design/v2-app/learning-v2-tasks-review.html, колонка «Предлагаем»): в каждом задании
// «что сделать» — короткая постоянная строка режима со значком, «ситуация» — отдельная карточка, «цель» (что собрать /
// сказать) — крупно. В контенте всё это склеено в одну строку («Соберите фразу — коллега ищет вас, а вы уже в комнате»).
// Контент НЕ меняем (Codex без токенов) — делим правилом. Чистые функции: ни сети, ни Firebase, ни состояния.
// Ситуация бывает только на языках, на которых курс написан (ru, uk); «что сделать» и подписи — на всех 9.

export type LearningV2TaskFamilyV1 =
  | "listen_choose"
  | "listen_build_dictation"
  | "phrase_builder"
  | "context_gap_grammar"
  | "speed_match"
  | "scripted_repeat_compare"
  | "sound_contrast";

/** Ключ значка из макета (kit.js IC): ear, headset, puzzle, create, swap, mic. */
export type LearningV2TaskIconV1 = "ear" | "headset" | "puzzle" | "create" | "swap" | "mic";

export type LearningV2TaskPromptPartsV1 = Readonly<{
  instruction: string;
  icon: LearningV2TaskIconV1;
  /** Ситуация отдельной карточкой; null — в строке не было ничего, кроме инструкции. */
  situation: string | null;
  /** Цель крупно: подпись («Скажите по-английски», «Ответьте») и текст; null — цели нет. */
  goal: Readonly<{ label: string | null; text: string }> | null;
  /** Каким правилом разобрано — для журнала [V2-TASK-PARTS]. */
  rule: "dash_lead" | "imperative_tail" | "colon_quote" | "listen_speaker" | "imperative_only" | "generic_only" | "whole_prompt" | "empty";
}>;

type Locale9 = "ru" | "uk" | "en" | "es" | "pt-BR" | "vi" | "id" | "tr" | "pl";
type Copy9 = Readonly<Record<Locale9, string>>;
const pick = (copy: Copy9, locale: string): string => copy[locale as Locale9] ?? copy.en;

const INSTRUCTION: Readonly<Record<LearningV2TaskFamilyV1, Readonly<{ icon: LearningV2TaskIconV1; copy: Copy9 }>>> = {
  listen_choose: { icon: "ear", copy: { ru: "Послушай и выбери", uk: "Послухай і вибери", en: "Listen and choose", es: "Escucha y elige", "pt-BR": "Ouça e escolha", vi: "Nghe và chọn", id: "Dengar dan pilih", tr: "Dinle ve seç", pl: "Posłuchaj i wybierz" } },
  listen_build_dictation: { icon: "headset", copy: { ru: "Послушай и собери", uk: "Послухай і склади", en: "Listen and build", es: "Escucha y arma", "pt-BR": "Ouça e monte", vi: "Nghe và ghép", id: "Dengar dan susun", tr: "Dinle ve kur", pl: "Posłuchaj i ułóż" } },
  phrase_builder: { icon: "puzzle", copy: { ru: "Собери фразу", uk: "Склади фразу", en: "Build the phrase", es: "Arma la frase", "pt-BR": "Monte a frase", vi: "Ghép câu", id: "Susun frasa", tr: "Cümleyi kur", pl: "Ułóż zdanie" } },
  context_gap_grammar: { icon: "create", copy: { ru: "Вставь слово", uk: "Встав слово", en: "Fill in the word", es: "Completa la palabra", "pt-BR": "Complete a palavra", vi: "Điền từ", id: "Isi katanya", tr: "Kelimeyi yerleştir", pl: "Wstaw słowo" } },
  speed_match: { icon: "swap", copy: { ru: "Найди пары", uk: "Знайди пари", en: "Match the pairs", es: "Une las parejas", "pt-BR": "Ligue os pares", vi: "Ghép cặp", id: "Cocokkan pasangan", tr: "Eşleri bul", pl: "Połącz pary" } },
  scripted_repeat_compare: { icon: "mic", copy: { ru: "Скажи вслух", uk: "Скажи вголос", en: "Say it out loud", es: "Dilo en voz alta", "pt-BR": "Diga em voz alta", vi: "Nói to lên", id: "Ucapkan dengan keras", tr: "Sesli söyle", pl: "Powiedz na głos" } },
  sound_contrast: { icon: "ear", copy: { ru: "Различи звуки", uk: "Розрізни звуки", en: "Tell the sounds apart", es: "Distingue los sonidos", "pt-BR": "Diferencie os sons", vi: "Phân biệt âm", id: "Bedakan bunyinya", tr: "Sesleri ayırt et", pl: "Rozróżnij dźwięki" } },
};

const GOAL_SAY: Copy9 = { ru: "Скажите по-английски", uk: "Скажіть англійською", en: "Say it in English", es: "Dilo en inglés", "pt-BR": "Diga em inglês", vi: "Nói bằng tiếng Anh", id: "Katakan dalam bahasa Inggris", tr: "İngilizce söyle", pl: "Powiedz po angielsku" };

// Первое слово — повелительное наклонение ru/uk: Соберите, Вставьте, Послушайте, Складіть, Вставте, Поєднайте…
const IMPERATIVE_RE = /^[A-Za-zА-ЯЁЇІЄҐа-яёїієґ’'ʼ-]+(?:ите|йте|іть|їть|те)$/iu;
// Режимы на слух: «Послушайте <кого/что> и соберите/выберите …» — команда уходит в заголовок, остаётся говорящий.
const LISTEN_LEAD_RE = /^(?:послушайте|прослушайте|послухайте|прослухайте)[,]?\s+/iu;
const LISTEN_TAIL_RE = /\s+(?:и|та|й|і)\s+(?:соберите|выберите|запишите|складіть|виберіть|запишіть)\b.*$/iu;
const LISTEN_TAIL_FALLBACK_RE = /\s+(?:и|та|й|і)\s+(?:собер|выбер|запиш|склад|вибер)[^\s]*.*$/iu;
// Винительный падеж первого слова → именительный, чтобы подпись читалась как ситуация («Реплика начальницы.»).
const LISTEN_NOUN_NOMINATIVE: Readonly<Record<string, string>> = {
  "реплику": "Реплика", "запись": "Запись", "фразу": "Фраза", "просьбу": "Просьба", "вопрос": "Вопрос", "ответ": "Ответ",
  "объявление": "Объявление", "сообщение": "Сообщение", "историю": "История", "речь": "Речь",
  "репліку": "Репліка", "запис": "Запис", "запитання": "Запитання", "прохання": "Прохання", "відповідь": "Відповідь",
  "оголошення": "Оголошення", "повідомлення": "Повідомлення", "історію": "Історія", "мову": "Мова",
};
// Строки, где кроме инструкции ничего нет («Послушайте и выберите», «Соедините слова со значениями»).
const GENERIC_ONLY_RE = /^(?:послушайте(?: и выберите(?: фразу| слово| услышанное)?)?|послухайте(?: й виберіть(?: фразу| слово| почуте)?)?|соберите (?:фразу|услышанную фразу|услышанную просьбу)|складіть (?:фразу|почуту фразу|почуте прохання)|послушайте и соберите (?:фразу|вопрос)|послухайте й складіть (?:фразу|запитання)|соедините .{0,40}|з[’']?єднайте .{0,40}|поєднайте .{0,40}|скажите вслух|скажіть уголос|вставьте слово|вставте слово|заполни(?:те)? пропуск|заповніть пропуск)\.?$/iu;

const capitalize = (text: string): string => (text ? text[0].toLocaleUpperCase() + text.slice(1) : text);
const sentence = (text: string): string => {
  const trimmed = text.trim().replace(/[;,:]\s*$/u, "");
  if (!trimmed) return trimmed;
  return /[.!?…»"]$/u.test(trimmed) ? capitalize(trimmed) : `${capitalize(trimmed)}.`;
};
/** Предложения строки; текст в «…» неделим, поэтому «?» и «.» внутри цитаты предложение не обрывают. */
export function splitSentencesV1(text: string): string[] {
  // «…?» Ответьте — цитата, закончившаяся знаком конца, перед заглавной буквой закрывает предложение
  const marked = text.replace(/([.!?…]»)\s+(?=[А-ЯЁЇІЄҐA-Z])/gu, "$1\u0001");
  return marked.split("\u0001").flatMap((chunk) =>
    chunk.match(/(?:«[^»]*»|[^.!?…«])+[.!?…]*/gu) ?? [chunk]).map((part) => part.trim()).filter(Boolean);
}
const firstWord = (text: string): string => text.trim().split(/\s+/u)[0]?.replace(/[,:;.!?]$/u, "") ?? "";
// Команда не первым словом: «Коротко скажите…», «Weekly поставьте…», «На «Is he absent?» ответьте…» — ищем среди первых
// четырёх слов вне цитат; окончания строже, чем у первого слова (голое «-те» ловило бы «на работе»).
const IMPERATIVE_INNER_RE = /^[А-ЯЁЇІЄҐа-яёїієґ’'ʼ-]+(?:ите|йте|ьте|вте|іть|їть)$/iu;
const isImperative = (text: string): boolean => {
  if (IMPERATIVE_RE.test(firstWord(text))) return true;
  const words = text.replace(/«[^»]*»/gu, " ").trim().split(/\s+/u).slice(0, 4).map((word) => word.replace(/[,.:;!?]+$/u, ""));
  // «Вы видите дно» — после подлежащего «вы/ви» это не команда, а обычный глагол с тем же окончанием
  const youIndex = words.findIndex((word) => /^(?:вы|ви)$/iu.test(word));
  return words.slice(1).some((word, i) => IMPERATIVE_INNER_RE.test(word) && (youIndex < 0 || i + 1 < youIndex));
};

type Meaning = Readonly<Record<string, string>> | null | undefined;
const meaningFor = (meaning: Meaning, locale: string): string | null => {
  const value = meaning?.[locale] ?? meaning?.ru;
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

/** Смысл фразы из данных задания (разбор фразы), а не из склеенной строки. */
function phraseMeaning(modePayload: unknown, locale: string): string | null {
  if (!modePayload || typeof modePayload !== "object") return null;
  const payload = modePayload as { explanationV1?: { phrase?: { meaningByLocale?: Meaning } } };
  return meaningFor(payload.explanationV1?.phrase?.meaningByLocale, locale);
}

export function splitLearningV2TaskPromptV1(input: Readonly<{
  family: string;
  prompt: string;
  interfaceLocale: string;
  modePayload?: unknown;
  /** id задания — только для журнала; тексты по id не подставляются (владелец 22.10: «правило для всех»). */
  interactionId?: string;
}>): LearningV2TaskPromptPartsV1 {
  const family = (input.family in INSTRUCTION ? input.family : "listen_choose") as LearningV2TaskFamilyV1;
  const head = INSTRUCTION[family];
  const instruction = pick(head.copy, input.interfaceLocale);
  const prompt = (input.prompt ?? "").replace(/\s+/gu, " ").trim();
  const meaning = phraseMeaning(input.modePayload, input.interfaceLocale);
  const sayGoal = (family === "phrase_builder" || family === "scripted_repeat_compare") && meaning
    ? { label: family === "phrase_builder" ? pick(GOAL_SAY, input.interfaceLocale) : null, text: meaning }
    : null;
  // зачем (владелец 22.10: «ничего не склеено», правило для всех): команда в ситуации — это цель. Если цели ещё нет — команда
  // становится целью; если цель уже есть (перевод фразы) или режим на слух (команда в заголовке) — команда убирается.
  const hearing = family === "listen_choose" || family === "listen_build_dictation" || family === "sound_contrast";
  const done = (rule: LearningV2TaskPromptPartsV1["rule"], situation: string | null, goal: LearningV2TaskPromptPartsV1["goal"]) => {
    let finalSituation = situation ? sentence(situation) : null;
    let finalGoal = goal;
    if (finalSituation) {
      const parts = splitSentencesV1(finalSituation);
      const commands = parts.filter((part) => isImperative(part));
      if (commands.length) {
        finalSituation = parts.filter((part) => !isImperative(part)).join(" ") || null;
        if (!finalGoal && !hearing) finalGoal = { label: null, text: sentence(commands.join(" ")) };
      }
    }
    // «…коробка с антеннами. Как она называется по-английски?» — вопрос в конце и есть цель задания
    if (finalSituation && !finalGoal && !hearing) {
      const parts = splitSentencesV1(finalSituation);
      const last = parts[parts.length - 1] ?? "";
      if (/\?$/u.test(last) && !/^«/u.test(last) && !/»\??$/u.test(last)) {
        finalSituation = parts.slice(0, -1).join(" ") || null;
        finalGoal = { label: null, text: last };
      }
    }
    return Object.freeze({ instruction, icon: head.icon, situation: finalSituation, goal: finalGoal, rule });
  };

  if (!prompt) return done("empty", null, sayGoal);
  // Найди пары: в строке только инструкция-дубль — ситуации нет (макет: убран повтор заголовков).
  if (family === "speed_match") return done("generic_only", null, null);
  if (GENERIC_ONLY_RE.test(prompt)) return done("generic_only", null, sayGoal);

  // 1б) Команда с цитатой где угодно: «<ситуация>. Спросите соседа: «Вы водите погрузчик?». Выберите слово.» —
  // подпись цели = команда, цель = цитата, ситуация = предложения до команды; хвост-команда уже в заголовке.
  const quoteCommand = [...prompt.matchAll(/(?:^|[.!?…]\s+)([^.!?…«»]{2,120}?)\s*:?\s*«([^»]+)»/gu)].at(-1);
  if (quoteCommand && isImperative(quoteCommand[1]) && (family === "context_gap_grammar" || family === "phrase_builder" || family === "scripted_repeat_compare")) {
    const clauseStart = (quoteCommand.index ?? 0) + quoteCommand[0].indexOf(quoteCommand[1]);
    const before = prompt.slice(0, clauseStart).trim();
    const beforeSentences = before.match(/[^.!?…]+[.!?…]*/gu)?.map((part) => part.trim()).filter((part) => part && !isImperative(part)) ?? [];
    return done(
      "colon_quote",
      beforeSentences.length ? beforeSentences.join(" ") : null,
      { label: capitalize(quoteCommand[1].trim()), text: quoteCommand[2].trim() },
    );
  }

  // 1) «Соберите фразу — <ситуация>» / «Вставьте слово — <ситуация>; ответьте, что …».
  const dash = prompt.match(/^([^«:]{1,60}?)\s+[—–]\s+(.+)$/u);
  if (dash && isImperative(dash[1])) {
    const rest = dash[2];
    const tail = rest.match(/^(.+?);\s*(.+)$/u);
    if (tail && isImperative(tail[2])) {
      return done("dash_lead", tail[1], sayGoal ?? { label: null, text: sentence(tail[2]) });
    }
    return done("dash_lead", rest, sayGoal);
  }

  // 1в) Режимы на слух: команда — в заголовок, говорящий — в ситуацию.
  const listeningFamily = family === "listen_choose" || family === "listen_build_dictation";
  if (listeningFamily && isImperative(prompt) && !LISTEN_LEAD_RE.test(prompt)) {
    // «Соберите услышанное» / «Соберите фразу со значением «Тебе холодно»» — ситуации нет; цитата — цель.
    const quote = prompt.match(/^([^«]+?)\s*:?\s*«([^»]+)»/u);
    return done("generic_only", null, quote ? { label: capitalize(quote[1].trim()), text: quote[2].trim() } : sayGoal);
  }
  if (listeningFamily && LISTEN_LEAD_RE.test(prompt)) {
    let rest = prompt.replace(LISTEN_LEAD_RE, "")
      // «Послушайте и соберите сообщение…» / «Послушайте и соберите: вы сканируете…» — команда целиком в заголовок
      .replace(/^(?:и|та|й|і)\s+(?:соберите|выберите|запишите|складіть|виберіть|запишіть)[:,]?\s*/iu, "")
      .replace(LISTEN_TAIL_RE, "").replace(LISTEN_TAIL_FALLBACK_RE, "").trim();
    // «Брата: он говорит о второй строке» — после двоеточия уже готовая ситуация
    const afterColon = rest.match(/^[^:]{1,40}:\s+(.+)$/u)?.[1];
    if (afterColon) rest = afterColon;
    rest = rest.replace(/^(?:что|як|що)\s+/iu, "").replace(/[.!?…]+$/u, "");
    const firstToken = rest.split(/\s+/u)[0]?.toLocaleLowerCase() ?? "";
    const nominative = LISTEN_NOUN_NOMINATIVE[firstToken];
    const words = rest.split(/\s+/u).filter(Boolean);
    if (nominative && words.length === 1) return done("generic_only", null, sayGoal);
    if (nominative) return done("listen_speaker", `${nominative} ${words.slice(1).join(" ")}`, sayGoal);
    // Без глагола остаётся только говорящий в винительном падеже («друга у двери») — склонять правилом нельзя: ситуации нет.
    const hasVerb = words.some((word) => /(?:ет|ит|ут|ют|ат|ят|ете|ите|ить|ать|ють|ять|єте|же|ає|ує|яє|ює)$/iu.test(word.replace(/[,.:;!?]+$/u, "")));
    if (!hasVerb) return done("generic_only", null, sayGoal);
    // «Послушайте брата» — один винительный падеж говорящего без контекста: склонять правилом нельзя, ситуации нет.
    if (words.length <= 1 || /^(?:её|его|ее|її|його)$/iu.test(rest)) return done("generic_only", null, sayGoal);
    return done("listen_speaker", rest, sayGoal);
  }

  // 2) «Вежливо спросите с Could I: «Можно мне …»» — подсказка до двоеточия, цель в кавычках.
  const colon = prompt.match(/^([^:«]{3,240}):\s*«([^»]+)»\.?$/u);
  if (colon) {
    const before = colon[1].match(/[^.!?…]+[.!?…]*/gu)?.map((part) => part.trim()).filter(Boolean) ?? [colon[1]];
    const last = before[before.length - 1] ?? "";
    const label = isImperative(last) ? capitalize(last.replace(/[.!?…]+$/u, "")) : pick(GOAL_SAY, input.interfaceLocale);
    const context = isImperative(last) ? before.slice(0, -1).join(" ") : colon[1];
    return done("colon_quote", context || null, { label, text: colon[2].trim() });
  }

  // 3) «Речь о прошлом. Выберите форму глагола.» — ситуация до первого повелительного предложения, цель — оно.
  // зачем: «?» внутри кавычек («Are you well?») не конец предложения — иначе команда в конце оставалась в ситуации.
  const sentences = splitSentencesV1(prompt);
  const firstImperative = sentences.findIndex((part) => isImperative(part));
  if (sentences.length > 1 && firstImperative > 0) {
    const listeningTail = family === "listen_choose" || family === "listen_build_dictation";
    return done(
      "imperative_tail",
      sentences.slice(0, firstImperative).join(" "),
      // режимы на слух: «Послушайте и соберите ваш ответ» уже в заголовке режима — цели нет
      listeningTail ? sayGoal : sayGoal ?? { label: null, text: sentence(sentences.slice(firstImperative).join(" ")) },
    );
  }

  // 4) Одна команда без контекста («Вежливо попросите воды») — это цель; в режимах на слух она говорит, кого слушаем,
  // поэтому остаётся ситуацией. Иначе строка целиком — ситуация. Смысл не теряем.
  const listening = family === "listen_choose" || family === "listen_build_dictation" || family === "sound_contrast";
  if (!listening && (sentences.every((part) => isImperative(part)) || isImperative(sentences[0] ?? ""))) {
    return done("imperative_only", null, sayGoal ?? { label: null, text: sentence(prompt) });
  }
  return done("whole_prompt", prompt, sayGoal);
}

export type LearningV2IntroSayPartsV1 = Readonly<{
  situation: string | null;
  phrase: Readonly<{ text: string; meaning: string | null }> | null;
  /** Разбор по словам: только слова, у которых в тексте есть перевод «…». */
  parts: readonly Readonly<{ word: string; meaning: string }>[];
  why: string | null;
  /** Чего не нашлось в тексте — дизайн рисует без этого блока. */
  missing: readonly ("situation" | "phrase" | "parts" | "why")[];
}>;

/**
 * Интро «Скажи так» из нынешнего абзаца страницы. Два формата текста: `I am here` — «Я здесь» и голая латиница
 * The ticket is in my pocket — «Билет в моём кармане» / Make an effort — приложить усилие.
 * Фраза — самая длинная английская пара (от 3 слов); разбор — пары из 1–2 слов; ситуация — русские предложения без
 * латиницы до фразы (не команды); «почему» — последнее предложение после фразы с латиницей, не пара, иначе первое
 * русское утверждение после фразы.
 */
const LATIN_PAIR_RE = /([A-Za-z][A-Za-z'’]*(?:[ ,][ ]?[A-Za-z][A-Za-z'’]*)*[?!.]?)\s+[—–]\s+(«[^»]+»|[^.;«»\n]+)/gu;
const hasLatin = (text: string) => /[A-Za-z]/u.test(text);
export type LearningV2IntroSayPartsWithQuestionV1 = LearningV2IntroSayPartsV1 & Readonly<{ question: string | null }>;

/** Интро страницы тем же правилом; question всегда null — вопрос берите из данных страницы (подстановок по id нет). */
export function learningV2IntroSayPartsForPageV1(input: Readonly<{ pageId: string; body: string; interfaceLocale: string }>): LearningV2IntroSayPartsWithQuestionV1 {
  return Object.freeze({ ...splitLearningV2IntroBodyV1(input.body), question: null });
}

export function splitLearningV2IntroBodyV1(body: string): LearningV2IntroSayPartsV1 {
  const text = (body ?? "").replace(/`/gu, "").replace(/\s+/gu, " ").trim();
  const sentences = text.match(/[^.!?…]+(?:[.!?…]+|$)/gu)?.map((part) => part.trim()).filter(Boolean) ?? [];
  const pairs = [...text.matchAll(LATIN_PAIR_RE)].map((match) => {
    const raw = match[2].trim();
    // зачем: «It is dusty — коротко It's dusty: «Она пыльная»» — без кавычек в переводе остался английский хвост;
    // тогда перевод — ближайшие «…» в том же предложении.
    const quotedLater = hasLatin(raw) && !raw.startsWith("«")
      ? text.slice((match.index ?? 0) + match[0].length).match(/^[^.!?…]*?«([^»]+)»/u)?.[1] ?? null
      : null;
    return {
      code: match[1].trim().replace(/[.,]$/u, ""),
      meaning: (quotedLater ?? raw.replace(/^«|»$/gu, "")).trim().replace(/[:,]$/u, ""),
      at: match.index ?? 0,
    };
  });
  const words = (code: string) => code.split(/\s+/u).length;
  const phrasePair = [...pairs].filter((pair) => words(pair.code) >= 3).sort((a, b) => words(b.code) - words(a.code))[0] ?? null;
  const phraseSentenceIndex = phrasePair ? sentences.findIndex((part) => part.includes(phrasePair.code)) : -1;
  const situationSentences = sentences
    .slice(0, phraseSentenceIndex < 0 ? sentences.length : phraseSentenceIndex)
    .filter((part) => !hasLatin(part) && !isImperative(part));
  const seen = new Set<string>();
  const parts = pairs
    .filter((pair) => words(pair.code) <= 2)
    .filter((pair) => (seen.has(pair.code.toLowerCase()) ? false : (seen.add(pair.code.toLowerCase()), true)))
    .map((pair) => ({ word: pair.code, meaning: pair.meaning }));
  const after = phraseSentenceIndex < 0 ? [] : sentences.slice(phraseSentenceIndex + 1);
  const isPairSentence = (part: string) => /[A-Za-z][A-Za-z'’ ]*\s+[—–]\s+/u.test(part);
  const why = [...after].reverse().find((part) => hasLatin(part) && !isPairSentence(part))
    ?? after.find((part) => !hasLatin(part) && !isImperative(part))
    ?? null;
  const missing: ("situation" | "phrase" | "parts" | "why")[] = [];
  if (!situationSentences.length) missing.push("situation");
  if (!phrasePair) missing.push("phrase");
  if (!parts.length) missing.push("parts");
  if (!why) missing.push("why");
  return Object.freeze({
    situation: situationSentences.length ? situationSentences.join(" ") : null,
    phrase: phrasePair ? Object.freeze({ text: sentence(phrasePair.code), meaning: phrasePair.meaning ? sentence(phrasePair.meaning) : null }) : null,
    parts: Object.freeze(parts.map((part) => Object.freeze(part))),
    why,
    missing: Object.freeze(missing),
  });
}

/** Перевод нового слова сразу: «занятый» из ««занятый»: сейчас вы делаете что-то…»; без кавычек — до двоеточия. */
export function learningV2WordCardTranslationV1(definition: string | null | undefined): string | null {
  const text = (definition ?? "").trim();
  if (!text) return null;
  const quoted = text.match(/^«([^»]+)»/u)?.[1]?.trim();
  if (quoted) return quoted;
  const head = text.split(/[:—–]/u)[0]?.trim();
  return head || null;
}

