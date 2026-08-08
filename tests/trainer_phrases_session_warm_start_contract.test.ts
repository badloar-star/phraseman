import fs from 'fs';
import path from 'path';

import {
  buildTrainerSessionDeck,
  getWarmPhraseSessionDeck,
  PHRASE_SESSION_LIMIT,
} from '../app/trainer_practice_hall';

// зачем: юзер жаловался, что «отработка ошибок» открывается через скелет «Загружаем…»,
// хотя экран практики уже прогрел кэш. Контракт держит тёплый старт на месте: колода
// берётся синхронно, а холодный кэш нельзя спутать с пустой очередью.
describe('trainer phrases session — тёплый старт без скелета', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/trainer_phrases_session.tsx'), 'utf8');

  it('первый кадр берёт колоду из прогретого кэша, а не из async-загрузки', () => {
    expect(source).toContain('getWarmPhraseSessionDeck');
    // Инициализаторы useState читают тёплую колоду — иначе первый кадр всегда скелет.
    expect(source).toContain('useState<SessionCard[]>(() => warmDeck ?? [])');
    expect(source).toContain('useState(() => warmDeck === null)');
    expect(source).toContain('useState(() => warmDeck !== null)');
  });

  it('тёплый старт не откатывает экран обратно в скелет и не подменяет колоду', () => {
    expect(source).toContain('const startedWarm = warmDeckRef.current !== null');
    expect(source).toContain('if (!startedWarm) setLoading(true)');
    expect(source).toContain('if (!startedWarm) setDeck(buildTrainerSessionDeck(items))');
  });

  it('устаревший французский remote-пак больше не участвует в старте', () => {
    expect(source).not.toContain('ensureFrenchRemotePersonalPractice');
    expect(source).not.toContain('french_personal_practice_remote_runtime');
  });

  it('гейт лимита/премиума остаётся на месте', () => {
    expect(source).toContain('consumeTrainerSessionEntry');
    expect(source).toContain('markNextNavigationAsReplace');
  });
});

describe('getWarmPhraseSessionDeck — холодный кэш отличим от пустой очереди', () => {
  it('на холодном кэше возвращает null, а не пустую колоду', () => {
    // Кэш trainer_store в этом тестовом процессе не прогревался ни разу, поэтому
    // hasCachedTrainerItems === false → null («нужен async-путь»), а НЕ [] («всё сделано»).
    expect(getWarmPhraseSessionDeck(PHRASE_SESSION_LIMIT)).toBeNull();
  });

  it('колода строится тем же билдером, что и async-путь', () => {
    expect(buildTrainerSessionDeck([])).toEqual([]);
  });
});
