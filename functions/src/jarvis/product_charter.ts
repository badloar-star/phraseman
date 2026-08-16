/**
 * Устав Phraseman — описание продукта, на которое опирается Джарвис.
 *
 * зачем это существует (владелец, 2026-08-16): у Джарвиса не было описания
 * продукта, он собирал ответы из кусков исходного кода и путался. «Компас»
 * приняли за стороннее приложение, хотя такого раздела в приложении нет вовсе.
 * Правилами это не лечится: нельзя запретить выдумывать то, чего не знаешь.
 *
 * зачем база, а не только файл в коде (решение владельца, 2026-08-16): устав
 * надо пересматривать раз в месяц, и каждая правка текста не должна требовать
 * разработчика и деплоя. Файл product.md остаётся запасным вариантом — если
 * база недоступна или пуста, Джарвис работает по нему, а не молча без знания.
 *
 * зачем история неизменяема: устав — это то, чем бот отвечает живым людям.
 * Нужно видеть, когда и что поменялось, и уметь вернуть прежнюю версию, если
 * новая оказалась хуже. Поэтому записи истории только создаются: их нельзя ни
 * править, ни удалять (закреплено в firestore.rules).
 *
 * Разбор и правила — чистые функции, чтобы проверялись тестами целиком.
 */

/** Документ с действующим уставом. */
export const PRODUCT_CHARTER_DOC = 'admin_config/product_charter';
/** Неизменяемая история сохранений. */
export const PRODUCT_CHARTER_HISTORY_COLLECTION = 'product_charter_history';

/**
 * Сколько месяцев живёт устав до пересмотра.
 *
 * зачем месяц: владелец попросил «раз в месяц надо обновлять». Реже — описание
 * успевает разойтись с приложением; чаще — превращается в шум, который
 * перестают читать.
 */
export const PRODUCT_CHARTER_REVIEW_MONTHS = 1;

/** Предел текста — тот же порядок, что у знания Джарвиса. */
export const PRODUCT_CHARTER_MAX_CHARS = 20_000;

/**
 * Категории устава.
 *
 * зачем фиксированный список, а не свободный текст (владелец: «пиши сразу так
 * удобными категориями, чтобы было удобно раз в месяц всё проверить»): раз в
 * месяц нужно пройтись по разделам и спросить себя «здесь что-то поменялось?».
 * По сплошному тексту это невозможно — глаз соскальзывает. По списку из семи
 * пунктов проверка занимает минуты.
 *
 * зачем именно эти семь: это то, о чём спрашивают в поддержке, и то, что
 * меняется чаще всего. Порядок — от общего к частному.
 */
export interface ProductCharterSectionMeta {
  readonly key: string;
  readonly title: string;
  /** Что проверить в этом разделе при ежемесячном пересмотре. */
  readonly checkHint: string;
}

export const PRODUCT_CHARTER_SECTIONS: readonly ProductCharterSectionMeta[] = Object.freeze([
  Object.freeze({
    key: 'about',
    title: 'Что за приложение',
    checkHint: 'Платформы, аудитория, языки интерфейса',
  }),
  Object.freeze({
    key: 'navigation',
    title: 'Разделы и навигация',
    checkHint: 'Вкладки внизу, что на главной, куда ведут кнопки',
  }),
  Object.freeze({
    key: 'learning',
    title: 'Как учатся',
    checkHint: 'Уроки, практика, карточки, экзамен, диалоги, голос',
  }),
  Object.freeze({
    key: 'currencies',
    title: 'Валюты и счётчики',
    checkHint: 'Жемчужины, звёзды, энергия, опыт, серия — откуда и на что',
  }),
  Object.freeze({
    key: 'money',
    title: 'Тарифы и оплата',
    checkHint: 'Plus, Pro, что открывают, как платят из разных стран',
  }),
  Object.freeze({
    key: 'social',
    title: 'Друзья, лига, приглашения',
    checkHint: 'Друзья, лига, клуб, награда за друга',
  }),
  Object.freeze({
    key: 'disabled',
    title: 'Чего в приложении НЕТ',
    checkHint: 'Выключенное и незаконченное: турниры, Компас. Самый важный раздел',
  }),
]);

const SECTION_KEYS: ReadonlySet<string> = new Set(PRODUCT_CHARTER_SECTIONS.map((s) => s.key));

export interface ProductCharterSection {
  readonly key: string;
  readonly body: string;
}

export interface ProductCharter {
  readonly sections: readonly ProductCharterSection[];
  readonly revision: number;
  readonly reviewBy: string | null;
  readonly updatedAtMs: number | null;
  readonly updatedBy: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Разбирает устав из документа базы.
 *
 * зачем не падать на мусоре: устав читает и Джарвис, и панель. Сломанный
 * документ не должен ронять ни утренний прогон, ни вход в админку —
 * пустой устав честнее выдуманного.
 *
 * зачем отбрасывать неизвестные ключи: раздел, которого нет в списке, не
 * покажется в панели и не попадёт в ежемесячную проверку. Незаметный раздел
 * устаревает молча — ровно то, от чего эта работа и затевалась.
 */
export function parseProductCharter(raw: unknown): ProductCharter {
  const doc = isRecord(raw) ? raw : {};
  const rawSections = Array.isArray(doc.sections) ? doc.sections : [];
  const seen = new Set<string>();
  const sections: ProductCharterSection[] = [];
  for (const item of rawSections) {
    if (!isRecord(item)) continue;
    const key = String(item.key ?? '').trim();
    const body = String(item.body ?? '').trim();
    if (!SECTION_KEYS.has(key) || seen.has(key) || !body) continue;
    seen.add(key);
    sections.push(Object.freeze({ key, body }));
  }
  // Порядок задаёт список категорий, а не база: он же порядок проверки.
  const ordered = PRODUCT_CHARTER_SECTIONS
    .map((meta) => sections.find((s) => s.key === meta.key))
    .filter((s): s is ProductCharterSection => Boolean(s));

  const revision = Number(doc.revision ?? 0);
  const updatedAtMs = Number(doc.updatedAtMs ?? 0);
  const reviewBy = typeof doc.reviewBy === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(doc.reviewBy)
    ? doc.reviewBy
    : null;

  return Object.freeze({
    sections: Object.freeze(ordered),
    revision: Number.isSafeInteger(revision) && revision >= 0 ? revision : 0,
    reviewBy,
    updatedAtMs: Number.isFinite(updatedAtMs) && updatedAtMs > 0 ? updatedAtMs : null,
    updatedBy: typeof doc.updatedBy === 'string' && doc.updatedBy ? doc.updatedBy : null,
  });
}

/** Дата следующего пересмотра — ровно через месяц от сохранения. */
export function nextProductCharterReviewDate(nowMs: number): string {
  const date = new Date(nowMs);
  date.setUTCMonth(date.getUTCMonth() + PRODUCT_CHARTER_REVIEW_MONTHS);
  return date.toISOString().slice(0, 10);
}

/**
 * Собирает устав в текст для промпта Джарвиса.
 *
 * зачем заголовки категорий в текст: без них модель видит семь абзацев без
 * связи. Заголовок «Чего в приложении НЕТ» сам по себе несёт запрет.
 */
export function renderProductCharter(charter: ProductCharter): string {
  if (charter.sections.length === 0) return '';
  const titleOf = (key: string): string =>
    PRODUCT_CHARTER_SECTIONS.find((s) => s.key === key)?.title ?? key;
  const blocks = charter.sections.map((section) => `## ${titleOf(section.key)}\n${section.body}`);
  return `# Устав Phraseman\n\n${blocks.join('\n\n')}`.slice(0, PRODUCT_CHARTER_MAX_CHARS);
}

/**
 * Что изменилось между версиями — по разделам.
 *
 * зачем по разделам, а не по символам: владельцу нужно понять «что я поменял в
 * прошлый раз», а не читать посимвольную разницу. Раздел — минимальная
 * единица, в которой изменение осмысленно.
 */
export interface ProductCharterChange {
  readonly key: string;
  readonly title: string;
  readonly kind: 'added' | 'removed' | 'edited';
}

export function diffProductCharters(
  before: ProductCharter,
  after: ProductCharter,
): readonly ProductCharterChange[] {
  const changes: ProductCharterChange[] = [];
  for (const meta of PRODUCT_CHARTER_SECTIONS) {
    const from = before.sections.find((s) => s.key === meta.key)?.body ?? '';
    const to = after.sections.find((s) => s.key === meta.key)?.body ?? '';
    if (from === to) continue;
    const kind: ProductCharterChange['kind'] = !from ? 'added' : !to ? 'removed' : 'edited';
    changes.push(Object.freeze({ key: meta.key, title: meta.title, kind }));
  }
  return Object.freeze(changes);
}

/**
 * Проверяет присланный из панели устав.
 *
 * зачем валидация здесь, а не только в панели: панель можно обойти. Всё, что
 * доходит до базы, обязано быть проверено на сервере.
 */
export function validateProductCharterSections(raw: unknown): readonly ProductCharterSection[] {
  if (!Array.isArray(raw)) throw new Error('sections must be an array');
  const seen = new Set<string>();
  const sections: ProductCharterSection[] = [];
  let total = 0;
  for (const item of raw) {
    if (!isRecord(item)) throw new Error('section must be an object');
    const key = String(item.key ?? '').trim();
    if (!SECTION_KEYS.has(key)) throw new Error(`unknown section: ${key}`);
    if (seen.has(key)) throw new Error(`duplicate section: ${key}`);
    const body = String(item.body ?? '').trim();
    total += body.length;
    if (total > PRODUCT_CHARTER_MAX_CHARS) throw new Error('charter is too long');
    seen.add(key);
    if (body) sections.push(Object.freeze({ key, body }));
  }
  return Object.freeze(sections);
}
