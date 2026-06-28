/**
 * Контракт клиентских хелперов вовлечения чата лиги:
 *  - resolveLeagueChatText: локализация поста (i18n[lang] → i18n.ru → text);
 *  - toggleLeagueChatReaction: поставить / снять / сменить эмодзи (локальное
 *    состояние своей реакции);
 *  - voteLeagueChatPoll: один голос на сообщение (повторный — игнор).
 *
 * Записи реакций/голосов идут increment(±1) в тот же документ (firestore-мок),
 * своё состояние хранится в AsyncStorage (мок) — это и проверяем.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getMyLeagueChatPollVote,
  getMyLeagueChatReaction,
  resolveLeagueChatText,
  toggleLeagueChatReaction,
  voteLeagueChatPoll,
  type LeagueChatMessage,
} from '../app/firestore_league_chat';

function baseMessage(over: Partial<LeagueChatMessage> = {}): LeagueChatMessage {
  return {
    id: 'm1',
    groupId: 'g1',
    weekId: '2026-W26',
    leagueId: 3,
    authorUid: '__league_system__',
    authorName: 'Compass',
    text: 'fallback text',
    status: 'visible',
    createdAt: 1,
    ...over,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('resolveLeagueChatText', () => {
  it('возвращает строку нужного языка из i18n', () => {
    const m = baseMessage({ i18n: { ru: 'привет', uk: 'привіт', es: 'hola', tr: 'merhaba' } });
    expect(resolveLeagueChatText(m, 'uk')).toBe('привіт');
    expect(resolveLeagueChatText(m, 'tr')).toBe('merhaba');
  });

  it('падает на ru, если язык отсутствует в i18n', () => {
    const m = baseMessage({ i18n: { ru: 'привет' } as any });
    expect(resolveLeagueChatText(m, 'vi')).toBe('привет');
  });

  it('падает на text, если i18n нет вовсе', () => {
    const m = baseMessage({ text: 'plain' });
    expect(resolveLeagueChatText(m, 'es')).toBe('plain');
  });
});

describe('toggleLeagueChatReaction', () => {
  it('ставит реакцию, повторный тап снимает', async () => {
    expect(await toggleLeagueChatReaction('m1', '🔥')).toBe('🔥');
    expect(await getMyLeagueChatReaction('m1')).toBe('🔥');

    expect(await toggleLeagueChatReaction('m1', '🔥')).toBeUndefined();
    expect(await getMyLeagueChatReaction('m1')).toBeUndefined();
  });

  it('смена эмодзи переносит реакцию на новый', async () => {
    await toggleLeagueChatReaction('m1', '🔥');
    expect(await toggleLeagueChatReaction('m1', '👏')).toBe('👏');
    expect(await getMyLeagueChatReaction('m1')).toBe('👏');
  });

  it('реакции на разные сообщения независимы', async () => {
    await toggleLeagueChatReaction('m1', '🔥');
    await toggleLeagueChatReaction('m2', '❤️');
    expect(await getMyLeagueChatReaction('m1')).toBe('🔥');
    expect(await getMyLeagueChatReaction('m2')).toBe('❤️');
  });
});

describe('voteLeagueChatPoll', () => {
  it('засчитывает первый голос и хранит выбор', async () => {
    expect(await voteLeagueChatPoll('poll1', 'a')).toBe(true);
    expect(await getMyLeagueChatPollVote('poll1')).toBe('a');
  });

  it('повторный голос игнорируется (один голос на сообщение)', async () => {
    expect(await voteLeagueChatPoll('poll1', 'a')).toBe(true);
    expect(await voteLeagueChatPoll('poll1', 'b')).toBe(false);
    expect(await getMyLeagueChatPollVote('poll1')).toBe('a');
  });
});
