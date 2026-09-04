/**
 * Модель отклика под набором: арифметика, порядок, слияние с сервером.
 *
 * зачем именно эти проверки: каждая закрывает ловушку, которая уже стоила работы
 * в соседнем соц-слое лайков — потерянная оптимистичная «+1» (mergeServerCounts),
 * плавающий порядок при одинаковом времени, счётчик, уходящий в минус.
 */
import {
  PACK_COMMENT_MAX_LENGTH,
  appendCommentOptimistic,
  commentCounterState,
  comparePackComments,
  formatCommentsCount,
  markCommentFailed,
  markCommentPublished,
  mergeServerComments,
  normalizePackCommentText,
  readPackCommentsCount,
  removeComment,
  shouldShowCommentsCount,
  sortPackComments,
  toggleCommentReactionOptimistic,
  togglePinnedComment,
  validatePackComment,
  type PackComment,
} from '../app/community_packs/packComments';

const comment = (over: Partial<PackComment> = {}): PackComment => ({
  id: 'c1',
  packId: 'p1',
  authorId: 'u1',
  authorName: 'Илья',
  text: 'Пригодилось',
  createdAtMs: 1_000,
  pinned: false,
  reactions: {},
  myReactions: [],
  status: 'published',
  ...over,
});

describe('счётчик откликов', () => {
  it('читает битые и отсутствующие значения как ноль', () => {
    expect(readPackCommentsCount(undefined)).toBe(0);
    expect(readPackCommentsCount({})).toBe(0);
    expect(readPackCommentsCount({ commentsCount: -5 })).toBe(0);
    expect(readPackCommentsCount({ commentsCount: 'нет' })).toBe(0);
    expect(readPackCommentsCount({ commentsCount: 7.9 })).toBe(7);
  });

  it('ноль скрыт — решение владельца 2026-09-04', () => {
    expect(shouldShowCommentsCount(0)).toBe(false);
    expect(shouldShowCommentsCount(undefined)).toBe(false);
    expect(shouldShowCommentsCount(1)).toBe(true);
  });

  it('большие числа сжимаются, чтобы не ломать ряд на плитке', () => {
    expect(formatCommentsCount(7)).toBe('7');
    expect(formatCommentsCount(999)).toBe('999');
    expect(formatCommentsCount(1200)).toBe('1,2К');
    expect(formatCommentsCount(1200, 'en')).toBe('1.2K');
    expect(formatCommentsCount(1000)).toBe('1К');
  });
});

describe('текст отклика', () => {
  it('схлопывает пробелы и переносы, чтобы «пустой» отклик не прошёл', () => {
    expect(normalizePackCommentText('  \n\n\n  ')).toBe('');
    expect(normalizePackCommentText('а   б\r\n\n\n\nв')).toBe('а б\n\nв');
  });

  it('обрезает по пределу ПОСЛЕ схлопывания — хвост не теряется из-за пробелов', () => {
    const padded = `${' '.repeat(50)}${'я'.repeat(PACK_COMMENT_MAX_LENGTH)}`;
    expect(normalizePackCommentText(padded)).toHaveLength(PACK_COMMENT_MAX_LENGTH);
  });

  it('писать может только тот, кто добавил набор себе', () => {
    expect(validatePackComment('Спасибо', false)).toEqual({ ok: false, reason: 'not_added' });
    expect(validatePackComment('Спасибо', true)).toEqual({ ok: true, text: 'Спасибо' });
  });

  it('пустой отклик отклоняется с названной причиной', () => {
    expect(validatePackComment('   ', true)).toEqual({ ok: false, reason: 'empty' });
  });

  it('счётчик остатка появляется только у предела', () => {
    expect(commentCounterState('коротко').visible).toBe(false);
    const long = 'я'.repeat(PACK_COMMENT_MAX_LENGTH - 10);
    expect(commentCounterState(long)).toEqual({ visible: true, left: 10 });
  });
});

describe('порядок в ветке', () => {
  it('закреплённый автором всегда сверху', () => {
    const pinned = comment({ id: 'old', createdAtMs: 1, pinned: true });
    const fresh = comment({ id: 'new', createdAtMs: 999 });
    expect(sortPackComments([fresh, pinned])[0].id).toBe('old');
  });

  it('дальше свежие первыми', () => {
    const a = comment({ id: 'a', createdAtMs: 10 });
    const b = comment({ id: 'b', createdAtMs: 20 });
    expect(sortPackComments([a, b]).map((c) => c.id)).toEqual(['b', 'a']);
  });

  it('при одинаковом времени порядок стабилен — список не дёргается', () => {
    const a = comment({ id: 'a', createdAtMs: 5 });
    const b = comment({ id: 'b', createdAtMs: 5 });
    expect(comparePackComments(a, b)).toBeLessThan(0);
    expect(comparePackComments(b, a)).toBeGreaterThan(0);
  });
});

describe('оптимистичная отправка', () => {
  it('свой отклик виден сразу со статусом «отправляется»', () => {
    const list = appendCommentOptimistic([], comment({ id: 'mine' }));
    expect(list).toHaveLength(1);
    expect(list[0].status).toBe('sending');
  });

  it('успех переводит его в «опубликован»', () => {
    const list = markCommentPublished([comment({ id: 'mine', status: 'sending' })], 'mine');
    expect(list[0].status).toBe('published');
  });

  it('отказ НЕ удаляет текст — человек может повторить', () => {
    const list = markCommentFailed([comment({ id: 'mine', status: 'sending' })], 'mine');
    expect(list[0].status).toBe('failed');
    expect(list[0].text).toBe('Пригодилось');
  });

  it('удаление убирает строку', () => {
    expect(removeComment([comment({ id: 'mine' })], 'mine')).toHaveLength(0);
  });
});

describe('слияние с сервером', () => {
  it('НЕ стирает отклик, который ещё в пути', () => {
    const pending = comment({ id: 'mine', status: 'sending', createdAtMs: 50 });
    const server = [comment({ id: 'other', createdAtMs: 10 })];
    const merged = mergeServerComments([pending, ...server], server);
    expect(merged.map((c) => c.id)).toEqual(['mine', 'other']);
  });

  it('серверная версия вытесняет локальную по id', () => {
    const local = comment({ id: 'mine', status: 'sending', text: 'старое' });
    const server = [comment({ id: 'mine', status: 'published', text: 'новое' })];
    const merged = mergeServerComments([local], server);
    expect(merged).toHaveLength(1);
    expect(merged[0].text).toBe('новое');
    expect(merged[0].status).toBe('published');
  });

  it('неудачная отправка переживает слияние', () => {
    const failed = comment({ id: 'mine', status: 'failed', createdAtMs: 99 });
    const merged = mergeServerComments([failed], [comment({ id: 'other' })]);
    expect(merged.some((c) => c.id === 'mine')).toBe(true);
  });
});

describe('реакции', () => {
  it('переключаются и считаются', () => {
    const on = toggleCommentReactionOptimistic(comment(), 'like');
    expect(on.reactions.like).toBe(1);
    expect(on.myReactions).toEqual(['like']);
    const off = toggleCommentReactionOptimistic(on, 'like');
    expect(off.reactions.like).toBe(0);
    expect(off.myReactions).toEqual([]);
  });

  it('счётчик не уходит в минус, когда сервер отдал ноль', () => {
    const stale = comment({ reactions: { like: 0 }, myReactions: ['like'] });
    expect(toggleCommentReactionOptimistic(stale, 'like').reactions.like).toBe(0);
  });

  it('два вида реакций независимы', () => {
    const withLike = toggleCommentReactionOptimistic(comment(), 'like');
    const both = toggleCommentReactionOptimistic(withLike, 'fire');
    expect(both.myReactions.sort()).toEqual(['fire', 'like']);
  });
});

describe('закрепление автором набора', () => {
  it('закреплённый ровно один', () => {
    const list = [comment({ id: 'a', pinned: true }), comment({ id: 'b' })];
    const next = togglePinnedComment(list, 'b');
    expect(next.find((c) => c.id === 'b')?.pinned).toBe(true);
    expect(next.find((c) => c.id === 'a')?.pinned).toBe(false);
    expect(next.filter((c) => c.pinned)).toHaveLength(1);
  });

  it('повторное нажатие снимает закрепление', () => {
    const list = [comment({ id: 'a', pinned: true })];
    expect(togglePinnedComment(list, 'a')[0].pinned).toBe(false);
  });
});
