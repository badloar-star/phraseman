/**
 * Контракт «Очистить кеш» (app/cache_reset.ts).
 *
 * зачем: у кнопки не было ни одного теста, а список ключей соблазнительно
 * расширять. Цена ошибки несимметрична: лишний ключ в списке — это стёртый
 * прогресс/награда у живого пользователя. Тест сторожит именно ГРАНИЦУ:
 * что чистится только пересоздаваемое и что рядом лежащие очереди целы.
 */
import fs from 'fs';
import path from 'path';

const SOURCE_PATH = path.join(__dirname, '..', 'app', 'cache_reset.ts');
const source = fs.readFileSync(SOURCE_PATH, 'utf8');

/**
 * Код без комментариев: в шапке файла запрещённые ключи ПЕРЕЧИСЛЕНЫ намеренно —
 * как объяснение, чего не трогать. Проверять надо реальные литералы, иначе тест
 * запрещает документировать собственное правило.
 */
const code = source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/[^\n]*/g, '');

/** Ключи, стирание которых = потеря данных пользователя. Список только растёт. */
const FORBIDDEN_SUBSTRINGS = [
  'user_total_xp',
  'shards_balance',
  'user_avatar',
  'stable_id',
  'progress',
  'league_state_v3',
  // Очереди и невостребованные награды из app_messages.ts — соседи кеша сообщений.
  'app_messages_report_reply_pending_claims',
  'app_message_visibility_outbox',
  'app_message_personal_modal_ack_outbox',
  'app_messages_local_preview',
];

describe('cache_reset: границы очистки', () => {
  it('не содержит ключей, потеря которых необратима', () => {
    for (const forbidden of FORBIDDEN_SUBSTRINGS) {
      expect(code).not.toContain(forbidden);
    }
  });

  it('owner-scoped префиксы сообщений заканчиваются двоеточием', () => {
    // Без ":" префикс 'app_messages_cache_v2' поймал бы соседние ключи-очереди,
    // начинающиеся так же. Двоеточие — единственное, что отделяет кеш от данных.
    const appMessagePrefixes = code.match(/'app_messages?[^']*'/g) ?? [];
    expect(appMessagePrefixes.length).toBeGreaterThan(0);
    for (const literal of appMessagePrefixes) {
      expect(literal.endsWith(":'")).toBe(true);
    }
  });

  it('все SCOPED_CACHE_PREFIXES заканчиваются двоеточием', () => {
    const block = code.match(/SCOPED_CACHE_PREFIXES\s*=\s*\[([\s\S]*?)\]\s*as const/);
    expect(block).toBeTruthy();
    const literals = (block![1].match(/'[^']+'/g) ?? []);
    expect(literals.length).toBeGreaterThan(0);
    for (const literal of literals) {
      expect(literal.endsWith(":'")).toBe(true);
    }
  });

  it('чистит обе половины пар «снапшот + метка обновления»', () => {
    // Стереть снапшот без метки = пустой экран до истечения TTL (3 ч).
    const pairs: ReadonlyArray<readonly [string, string]> = [
      ['top_helpers_snapshot_v2', 'top_helpers_remote_at_v2'],
      ['arena_top100_snapshot_v8', 'arena_top100_remote_at_v1'],
    ];
    for (const [snapshot, stamp] of pairs) {
      if (code.includes(snapshot)) expect(code).toContain(stamp);
    }
  });

  it('всегда чистит кеш картинок — это заявленное поведение кнопки', () => {
    expect(source).toContain('clearMemoryCache');
    expect(source).toContain('clearDiskCache');
  });
});

describe('cache_reset: устойчивость', () => {
  const loadModule = () => {
    let removed: string[] = [];
    jest.resetModules();
    jest.doMock('@react-native-async-storage/async-storage', () => ({
      __esModule: true,
      default: {
        getAllKeys: jest.fn(async () => [
          'user_total_xp',
          'global_lb_cache_v4',
          'app_messages_cache_v2:uid-1',
          'app_messages_report_reply_pending_claims_v2:uid-1',
          'ai_explain_local_cache_v1:phrase:abc',
          'league_state_v3',
        ]),
        multiRemove: jest.fn(async (keys: string[]) => { removed = keys; }),
      },
    }));
    jest.doMock('expo-image', () => ({
      __esModule: true,
      Image: {
        clearMemoryCache: jest.fn(async () => true),
        clearDiskCache: jest.fn(async () => true),
      },
    }));
    jest.doMock('../app/referrals_cache', () => ({
      __esModule: true,
      REFERRAL_STATE_STORAGE_KEY: 'referrals_state_cache_v3',
    }));
    jest.doMock('../app/friends_tab_swr_warm', () => ({
      __esModule: true,
      FRIENDS_TAB_SWR_CACHE_KEY: 'friends_tab_swr_v1',
      FRIEND_PROFILES_CACHE_KEY: 'friend_profiles_cache_v1',
    }));
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../app/cache_reset') as typeof import('../app/cache_reset');
    return { mod, getRemoved: () => removed };
  };

  it('стирает кеши и НЕ трогает прогресс, очередь наград и лигу', async () => {
    const { mod, getRemoved } = loadModule();
    const result = await mod.clearAppCaches();
    const removed = getRemoved();

    expect(removed).toContain('global_lb_cache_v4');
    expect(removed).toContain('app_messages_cache_v2:uid-1');
    expect(removed).toContain('ai_explain_local_cache_v1:phrase:abc');

    expect(removed).not.toContain('user_total_xp');
    expect(removed).not.toContain('league_state_v3');
    expect(removed).not.toContain('app_messages_report_reply_pending_claims_v2:uid-1');

    expect(result.removedKeys).toBe(removed.length);
  });
});
