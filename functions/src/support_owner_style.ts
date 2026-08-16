/**
 * Обучение на живых ответах владельца.
 *
 * зачем (владелец, 2026-08-16: «он обязан учиться на имейлах которые я
 * отправлял лично… как алгоритм комментариев на ютубе с ИИ»): на проде из
 * 234 писем Джарвис не дал НИ ОДНОГО настоящего ответа — только заглушку
 * «команда посмотрит вручную». Причина не в модели: у неё просто нет
 * примеров того, как отвечает живой человек этого продукта.
 *
 * Владелец отвечает напрямую из Gmail, и эти письма уже проходят мимо нас
 * при обходе папки «Отправленные» — раньше мы брали из них только заголовки
 * и выбрасывали текст. Теперь текст сохраняется как образец голоса.
 *
 * зачем не дообучение модели, а примеры в промпте: дообучение стоит денег,
 * требует выгрузки переписки наружу и обновляется неделями. Несколько живых
 * пар «вопрос → ваш ответ» в промпте дают тот же эффект уже на следующем
 * письме и остаются под контролем — видно, чему именно он научился.
 *
 * Модуль чистый: без Firestore и сети, чтобы правила проверялись тестами.
 */

/** Сколько примеров показывать модели. Больше — дороже и хуже фокус. */
export const OWNER_STYLE_EXAMPLE_LIMIT = 5;

/** Короче — это «спасибо, принято», из такого учиться нечему. */
export const OWNER_STYLE_MIN_CHARS = 80;

/** Длиннее — почти наверняка пересланная простыня, а не ответ. */
export const OWNER_STYLE_MAX_CHARS = 1_800;

export interface OwnerStyleExample {
  readonly question: string;
  readonly answer: string;
  readonly savedAtMs: number;
}

/**
 * Убирает из письма процитированную переписку.
 *
 * зачем: Gmail подклеивает к ответу всю предыдущую ветку («16 авг. 2026 г.
 * Phraseman Support писал: > …»). Без чистки в пример попадёт не голос
 * владельца, а копия старого письма — и модель начнёт цитировать саму себя.
 */
export function stripQuotedTail(raw: unknown): string {
  const text = String(raw ?? '').replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const kept: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('>')) break;
    // «вт, 11 авг. 2026 г., 23:20 Имя <почта> писал:» и англоязычный аналог.
    // зачем опора на ХВОСТ, а не на начало строки: русский Gmail начинает
    // шапку с дня недели («вт,»), английский — с «On», испанский иначе.
    // Общее у всех одно — строка заканчивается на «писал:/wrote:» и несёт
    // внутри год. Первый вариант регулярки ждал дату в начале и молча
    // пропускал русскую шапку — поймал тест на реальной строке из письма.
    if (/(?:пишет|писал(?:а)?|wrote|escribió)\s*:?\s*$/i.test(trimmed)
      && /\d{4}|\d{1,2}:\d{2}/.test(trimmed)) break;
    // Второй вид шапки, найденный на НАСТОЯЩЕМ письме из прода: Gmail
    // иногда обрывает её на адресе, без слова «писал» —
    // «вт, 11 авг. 2026 г., 23:20 Имя <почта>:». Признак: дата, адрес в
    // угловых скобках и двоеточие в конце. Синтетический тест это не ловил.
    if (/<[^<>@\s]+@[^<>\s]+>\s*:?\s*$/.test(trimmed) && /\d{1,2}:\d{2}|\d{4}/.test(trimmed)) break;
    if (/^-{2,}\s*(?:Original Message|Пересылаемое сообщение)/i.test(trimmed)) break;
    kept.push(line);
  }
  return kept.join('\n').trim();
}

/**
 * Годится ли ответ владельца как образец голоса.
 *
 * зачем строгий отбор: один плохой пример портит все последующие ответы —
 * модель копирует именно манеру. Лучше ноль примеров, чем случайная
 * односложная отписка в роли эталона.
 */
export function isUsableOwnerStyleExample(input: {
  readonly question: unknown;
  readonly answer: unknown;
}): boolean {
  const answer = String(input.answer ?? '').trim();
  const question = String(input.question ?? '').trim();
  if (answer.length < OWNER_STYLE_MIN_CHARS || answer.length > OWNER_STYLE_MAX_CHARS) return false;
  if (question.length < 20) return false;
  // Автоответы и служебные пересылки голосом владельца не являются.
  if (/^(?:fwd|fw|re)\s*:/i.test(answer)) return false;
  if (/(?:out of office|автоответ|delivery status notification)/i.test(answer)) return false;
  return true;
}

/**
 * Собирает блок примеров для промпта.
 *
 * зачем помечать как ОБРАЗЕЦ ГОЛОСА, а не как факты: письма владельца
 * содержат конкретику прошлых обращений (чужие суммы, чужие ники). Модель
 * обязана перенять манеру, но не переносить эти детали в новый ответ.
 */
/**
 * Отбирает примеры, близкие по теме к новому письму.
 *
 * зачем по теме, а не просто последние (владелец, 2026-08-16: «запоминать
 * контекст, что я говорю людям, и использовать такое же потом при повторных
 * обращениях, не слово в слово»): на вопрос про оплату полезны прошлые
 * ответы про оплату, а не про уроки. Так Джарвис переиспользует именно то,
 * что владелец уже однажды объяснил по этой теме.
 *
 * зачем простое пересечение слов, а не эмбеддинги: писем владельца десятки,
 * а не миллионы. Векторный поиск здесь — лишний сервис, лишние деньги и
 * лишняя точка отказа ради задачи, которую решает пересчёт по словам.
 */
export function selectOwnerStyleExamples(
  examples: readonly OwnerStyleExample[],
  issue: unknown,
  limit: number = OWNER_STYLE_EXAMPLE_LIMIT,
): readonly OwnerStyleExample[] {
  const words = (text: unknown): Set<string> => new Set(
    String(text ?? '').toLowerCase().match(/[\p{L}]{4,}/gu) ?? [],
  );
  const issueWords = words(issue);
  if (issueWords.size === 0) return Object.freeze(examples.slice(0, limit));

  const scored = examples.map((ex) => {
    const exWords = words(`${ex.question} ${ex.answer}`);
    let shared = 0;
    for (const w of issueWords) if (exWords.has(w)) shared += 1;
    return { ex, score: shared };
  });

  // зачем свежесть вторым ключом: при равной близости полезнее недавний
  // ответ — продукт меняется, и старое объяснение могло устареть.
  scored.sort((a, b) => (b.score - a.score) || (b.ex.savedAtMs - a.ex.savedAtMs));
  return Object.freeze(scored.filter((s) => s.score > 0).slice(0, limit).map((s) => s.ex));
}

export function renderOwnerStyleExamples(examples: readonly OwnerStyleExample[]): string {
  const usable = examples.slice(0, OWNER_STYLE_EXAMPLE_LIMIT);
  if (usable.length === 0) return '';
  const blocks = usable
    .map((ex, i) => `Пример ${i + 1}.\nПисьмо клиента: ${ex.question}\nОтвет владельца: ${ex.answer}`)
    .join('\n\n');
  return [
    'ОБРАЗЦЫ ЖИВОГО ГОЛОСА ВЛАДЕЛЬЦА (как он сам отвечает клиентам).',
    'Перенимай ТОН, длину, обращение и манеру — но НЕ переноси факты, суммы,',
    'имена и обстоятельства из этих примеров в новый ответ: они про других людей.',
    '',
    blocks,
  ].join('\n');
}
