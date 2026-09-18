/**
 * Отклик под набором сообщества — чистая модель (без Firestore / AsyncStorage / React).
 *
 * зачем (владелец 2026-09-04): «надо чтобы люди могли коммуницировать прямо внутри».
 * Замер боевой базы показал, ПОЧЕМУ это должен быть именно отклик под набором, а не
 * чат и не лента: из 300 аккаунтов друг есть у ОДНОГО, заявок в друзья 0, матчей
 * Арены 0. Ленту «Активность друзей» уже удаляли 16.08 (0–2 события за прогон при
 * 9 000 чтений в сутки, память project_friend_activity_feed_removed). Набор — пока
 * единственный объект, вокруг которого есть и предмет разговора, и автор, которому
 * важен ответ; отклик работает асинхронно и не требует графа друзей.
 *
 * Модель данных (документ `community_packs/{packId}`):
 *   commentsCount: number — денормализованный счётчик, растёт атомарным инкрементом;
 *   подколлекция `pack_comments/{commentId}` — сами отклики.
 *
 * Почему счётчик лежит в документе набора, а не считается запросом: набор и так
 * читается ради лайков, поэтому счётчик в списках стоит НОЛЬ дополнительных чтений.
 * Пересчёт по подколлекции требовал бы запроса на каждый набор в списке — десятки
 * чтений на один экран (правило экономии Firebase в CLAUDE.md).
 *
 * Формат зафиксирован владельцем по макету
 * `docs/prototypes/2026-09-04-pack-comments-concept.html`:
 *   • один уровень, без ответов на ответы — ветки требуют модератора;
 *   • 200 знаков — хватает на «спасибо, пригодилось», мало для спора;
 *   • писать может только тот, кто добавил набор себе (то же правило, что у лайка);
 *   • автор набора закрепляет один отклик и скрывает лишнее у себя;
 *   • никаких личных сообщений — разговор виден всем и привязан к набору.
 */

/** Подколлекция откликов: `community_packs/{packId}/pack_comments/{commentId}`. */
export const COMMUNITY_PACK_COMMENTS_SUBCOLLECTION = 'pack_comments';

/** Поле-счётчик в документе набора. Зеркало правила `communityPackSocialCountersOnly`. */
export const COMMUNITY_PACK_COMMENTS_COUNT_FIELD = 'commentsCount';

/**
 * Потолок длины отклика.
 *
 * зачем: 200 знаков — осознанный предел из макета, а не техническое ограничение.
 * Достаточно для благодарности и просьбы добавить тему; мало, чтобы завязать спор,
 * который потом придётся модерировать.
 */
export const PACK_COMMENT_MAX_LENGTH = 200;

/**
 * За сколько знаков до предела показывать счётчик остатка.
 *
 * зачем: постоянно висящий счётчик — лишний шум в поле, где обычно пишут 5 слов.
 * Появляется только когда предел действительно близко.
 */
export const PACK_COMMENT_COUNTER_THRESHOLD = 30;

/** Сколько последних откликов держим на экране набора без «показать ещё». */
export const PACK_COMMENTS_PAGE_SIZE = 20;

/** Реакции на отклик. Ровно две — жест, а не палитра. */
export const PACK_COMMENT_REACTIONS = ['like', 'fire'] as const;
export type PackCommentReaction = (typeof PACK_COMMENT_REACTIONS)[number];

export type PackCommentStatus =
  /** Лежит на сервере. */
  | 'published'
  /** Ушёл в сеть, ответа ещё нет (оптимистичный показ). */
  | 'sending'
  /** Сеть отказала — человек видит «Повторить / Удалить». */
  | 'failed';

export type PackComment = {
  id: string;
  packId: string;
  /** stable_id автора отклика. */
  authorId: string;
  authorName: string;
  text: string;
  createdAtMs: number;
  /** Закреплён автором НАБОРА (не автором отклика). Не более одного на набор. */
  pinned: boolean;
  /** Счётчики реакций по видам. Отсутствующие виды считаются нулём. */
  reactions: Partial<Record<PackCommentReaction, number>>;
  /** Какие реакции поставил текущий пользователь. */
  myReactions: PackCommentReaction[];
  status: PackCommentStatus;
};

const nonNegativeInt = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
};

/** Счётчик откликов из «сырых» полей документа; отсутствующее/битое значение → 0. */
export function readPackCommentsCount(data: Record<string, unknown> | undefined | null): number {
  return nonNegativeInt(data?.[COMMUNITY_PACK_COMMENTS_COUNT_FIELD]);
}

/**
 * Привести текст отклика к виду, пригодному для отправки.
 *
 * зачем: схлопываем повторные переводы строк и пробелы — иначе «пустой» на вид
 * отклик из одних переносов пройдёт проверку длины и создаст мусорную строку в
 * ветке. Обрезка по пределу идёт ПОСЛЕ схлопывания, чтобы человек не терял
 * осмысленный хвост из-за лишних пробелов.
 */
export function normalizePackCommentText(raw: string): string {
  const collapsed = String(raw ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return collapsed.slice(0, PACK_COMMENT_MAX_LENGTH);
}

export type PackCommentValidation =
  | { ok: true; text: string }
  | { ok: false; reason: 'empty' | 'too_long' | 'not_added' };

/**
 * Можно ли отправить этот отклик.
 *
 * `added` — добавил ли пользователь набор себе. Правило владельца, уже действующее
 * для лайка: сначала возьми набор, потом высказывайся. Отсекает случайных прохожих
 * и почти всю накрутку.
 */
export function validatePackComment(raw: string, added: boolean): PackCommentValidation {
  if (!added) return { ok: false, reason: 'not_added' };
  const text = normalizePackCommentText(raw);
  if (!text) return { ok: false, reason: 'empty' };
  // normalize уже обрезал по пределу, но проверка остаётся: если предел когда-нибудь
  // начнут применять до нормализации, отказ будет назван, а не проглочен молча.
  if (text.length > PACK_COMMENT_MAX_LENGTH) return { ok: false, reason: 'too_long' };
  return { ok: true, text };
}

/** Показывать ли счётчик остатка знаков и не пора ли подсветить его тревожным тоном. */
export function commentCounterState(text: string): { visible: boolean; left: number } {
  const left = PACK_COMMENT_MAX_LENGTH - String(text ?? '').length;
  return { visible: left <= PACK_COMMENT_COUNTER_THRESHOLD, left: Math.max(0, left) };
}

/**
 * Порядок откликов в ветке: закреплённый автором сверху, дальше свежие первыми.
 *
 * зачем стабильный хвост по id: при одинаковой миллисекунде (два отклика из одной
 * пачки после офлайна) порядок иначе плавает между перерисовками и список дёргается.
 */
export function comparePackComments(a: PackComment, b: PackComment): number {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
  const fresh = b.createdAtMs - a.createdAtMs;
  if (fresh !== 0) return fresh;
  return a.id.localeCompare(b.id);
}

export function sortPackComments(comments: readonly PackComment[]): PackComment[] {
  return [...comments].sort(comparePackComments);
}

/**
 * Оптимистичное добавление своего отклика: он виден СРАЗУ, до ответа сервера.
 *
 * зачем: правило Optimistic UI владельца — интерфейс реагирует мгновенно, сеть
 * догоняет фоном. Статус `sending` отличает «уже на сервере» от «ещё в пути»,
 * чтобы при отказе можно было предложить «Повторить», а не потерять текст.
 */
export function appendCommentOptimistic(
  comments: readonly PackComment[],
  draft: PackComment,
): PackComment[] {
  return sortPackComments([...comments, { ...draft, status: 'sending' }]);
}

/** Отметить отправленный отклик как принятый сервером. */
export function markCommentPublished(
  comments: readonly PackComment[],
  commentId: string,
): PackComment[] {
  return comments.map((c) => (c.id === commentId ? { ...c, status: 'published' } : c));
}

/**
 * Отметить отклик как непринятый.
 *
 * зачем НЕ удалять его молча: текст написан человеком, и потерять его — худшее,
 * что можно сделать. Строка остаётся с пометкой и кнопками «Повторить / Удалить».
 */
export function markCommentFailed(
  comments: readonly PackComment[],
  commentId: string,
): PackComment[] {
  return comments.map((c) => (c.id === commentId ? { ...c, status: 'failed' } : c));
}

/** Убрать отклик из ветки (отмена неудачной отправки или удаление своего). */
export function removeComment(
  comments: readonly PackComment[],
  commentId: string,
): PackComment[] {
  return comments.filter((c) => c.id !== commentId);
}

/**
 * Оптимистичное переключение реакции: одна реакция каждого вида от пользователя.
 *
 * зачем Math.max(0, …): серверный счётчик может прийти нулём, пока локально стоит
 * снятие — без нижней границы цифра ушла бы в минус и показала «-1».
 */
export function toggleCommentReactionOptimistic(
  comment: PackComment,
  reaction: PackCommentReaction,
): PackComment {
  const had = comment.myReactions.includes(reaction);
  const current = nonNegativeInt(comment.reactions[reaction]);
  return {
    ...comment,
    reactions: { ...comment.reactions, [reaction]: Math.max(0, current + (had ? -1 : 1)) },
    myReactions: had
      ? comment.myReactions.filter((r) => r !== reaction)
      : [...comment.myReactions, reaction],
  };
}

/**
 * Закрепить отклик автором набора: закреплённый ровно один.
 *
 * Повторное нажатие на уже закреплённый — снимает закрепление.
 */
export function togglePinnedComment(
  comments: readonly PackComment[],
  commentId: string,
): PackComment[] {
  const target = comments.find((c) => c.id === commentId);
  const nextPinned = !(target?.pinned ?? false);
  return sortPackComments(
    comments.map((c) => ({ ...c, pinned: c.id === commentId ? nextPinned : false })),
  );
}

/**
 * Слить серверную ветку с локальной, сохранив ещё не долетевшие отклики.
 *
 * ЛОВУШКА, ради которой это отдельная функция (тот же класс, что у лайков —
 * см. mergeServerCounts в packSocial.ts): сервер отвечает позже, чем человек
 * пишет. Наивная замена списка серверным стирала бы отклик, отправленный
 * секунду назад, — он исчезал бы на глазах у автора. Поэтому строки со
 * статусом `sending`/`failed` переживают слияние, а серверные версии заменяют
 * локальные по id.
 *
 * зачем УЖЕ ОПУБЛИКОВАННЫЙ локальный отклик тоже переживает слияние, не
 * только pending/failed (владелец 17.09.2026: «оставил коммент, он пропал»):
 * между тем как publishPackComment получил успешный ответ (status меняется
 * на 'published') и следующим fetchPackComments — Firestore может отдать
 * снимок БЕЗ этого документа (задержка репликации на read-стороне после
 * успешной записи, или чтение попало на реплику до распространения). Прежняя
 * версия фильтровала `status !== 'published'`, поэтому такой отклик не
 * подходил ни под «pending» (уже published), ни под «пришедший с сервера»
 * (сервер его ещё не отдал) — исчезал молча. Теперь любой локальный
 * комментарий, которого нет в текущем серверном снимке, остаётся видимым;
 * как только сервер его подтвердит (появится в serverIds), локальная копия
 * заменяется серверной версией по id — счётчики реакций и т.п. досчитаются.
 */
export function mergeServerComments(
  local: readonly PackComment[],
  server: readonly PackComment[],
): PackComment[] {
  const serverIds = new Set(server.map((c) => c.id));
  const missingFromServer = local.filter((c) => !serverIds.has(c.id));
  return sortPackComments([...server, ...missingFromServer]);
}

/**
 * Показывать ли счётчик откликов рядом с лайками и добавлениями.
 *
 * Решение владельца 2026-09-04: ноль скрыт. «💬 0» на всех наборах — поле мёртвых
 * нулей и сигнал «тут никто не пишет»; значок должен появляться вместе с первым
 * откликом, тогда он событие, а не декорация. Лайк и добавление показывают ноль
 * законно: их значок несёт ДЕЙСТВИЕ, а счётчик откликов — только число.
 */
export function shouldShowCommentsCount(count: number | undefined | null): boolean {
  return nonNegativeInt(count) > 0;
}

/**
 * Компактная запись большого числа для тесных мест (плитка шириной в треть экрана).
 *
 * зачем: четырёхзначное число ломает ряд из трёх счётчиков — проверено замером
 * макета, где строка каталога переполнялась уже на 7px.
 */
export function formatCommentsCount(count: number | undefined | null, lang?: string): string {
  const n = nonNegativeInt(count);
  if (n < 1000) return String(n);
  const thousands = n / 1000;
  const decimal = lang === 'en' ? '.' : ',';
  const suffix = lang === 'en' ? 'K' : 'К';
  const head = thousands >= 100 ? String(Math.floor(thousands)) : thousands.toFixed(1).replace('.0', '');
  return `${head.replace('.', decimal)}${suffix}`;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
