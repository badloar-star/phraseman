// Сторож истории замеров речи (статистика раздела «Уроки с МАКСом»).
//
// зачем (владелец 2026-08-31): формулы трендов существовали давно и НЕ
// ВЫЗЫВАЛИСЬ НИОТКУДА — считать было не из чего, замеры никто не копил. Это
// класс бага «механизм есть, а данных не дали»: экран статистики показал бы
// нули и был бы честно бесполезен. Тест сторожит сам факт накопления.

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  __resetSpeechHistoryMemoryForTests,
  appendSpeechSample,
  clearSpeechHistory,
  loadSpeechHistory,
} from '../app/max_speech_history';
import { computeVoiceTrends, TREND_WINDOW_MS } from '../app/max_voice_metrics';

const NOW = 1_756_000_000_000;

beforeEach(async () => {
  __resetSpeechHistoryMemoryForTests();
  await AsyncStorage.clear();
});

describe('накопление замеров речи', () => {
  it('пустая история не падает и даёт нулевые тренды', async () => {
    const history = await loadSpeechHistory();
    expect(history).toEqual([]);
    expect(computeVoiceTrends(history, NOW).spokeMinutes).toBe(0);
  });

  it('замер сохраняется и переживает перезапуск процесса', async () => {
    await appendSpeechSample(
      { atMs: NOW, speechSec: 300, uniqueWords: 40, cleanPhrases: 4, totalPhrases: 5 },
      NOW,
    );
    __resetSpeechHistoryMemoryForTests();
    const history = await loadSpeechHistory();
    expect(history).toHaveLength(1);
    expect(history[0].speechSec).toBe(300);
  });

  it('звонок без единой секунды речи не пишется — он занизил бы средние', async () => {
    await appendSpeechSample(
      { atMs: NOW, speechSec: 0, uniqueWords: 0, cleanPhrases: 0, totalPhrases: 0 },
      NOW,
    );
    expect(await loadSpeechHistory()).toHaveLength(0);
  });

  it('замеры старше окна тренда выбрасываются, файл не растёт вечно', async () => {
    const old = NOW - TREND_WINDOW_MS - 86_400_000;
    await appendSpeechSample(
      { atMs: old, speechSec: 120, uniqueWords: 10, cleanPhrases: 1, totalPhrases: 2 },
      old,
    );
    await appendSpeechSample(
      { atMs: NOW, speechSec: 300, uniqueWords: 40, cleanPhrases: 4, totalPhrases: 5 },
      NOW,
    );
    const history = await loadSpeechHistory();
    expect(history).toHaveLength(1);
    expect(history[0].atMs).toBe(NOW);
  });

  it('тренды считаются по накопленному — цифры не выдуманы', async () => {
    for (let i = 0; i < 3; i += 1) {
      await appendSpeechSample(
        {
          atMs: NOW - i * 86_400_000,
          speechSec: 300,
          uniqueWords: 20,
          cleanPhrases: 4,
          totalPhrases: 5,
        },
        NOW,
      );
    }
    const trends = computeVoiceTrends(await loadSpeechHistory(), NOW);
    expect(trends.spokeMinutes).toBe(15); // 3 × 300 сек
    expect(trends.vocabWords).toBe(60);
    expect(trends.cleanPhrasePct).toBe(80); // 12 из 15
  });

  it('процент чистых фраз скрыт, пока звонков мало — на выборке из одного это шум', async () => {
    await appendSpeechSample(
      { atMs: NOW, speechSec: 300, uniqueWords: 20, cleanPhrases: 1, totalPhrases: 5 },
      NOW,
    );
    expect(computeVoiceTrends(await loadSpeechHistory(), NOW).cleanPhrasePct).toBeNull();
  });

  it('битые данные на диске не роняют экран', async () => {
    await AsyncStorage.setItem('@phraseman/max/speech-history/v1', 'это не json');
    __resetSpeechHistoryMemoryForTests();
    expect(await loadSpeechHistory()).toEqual([]);
  });

  it('очистка убирает историю: она личная и уходит вместе с данными', async () => {
    await appendSpeechSample(
      { atMs: NOW, speechSec: 300, uniqueWords: 40, cleanPhrases: 4, totalPhrases: 5 },
      NOW,
    );
    await clearSpeechHistory();
    __resetSpeechHistoryMemoryForTests();
    expect(await loadSpeechHistory()).toEqual([]);
  });

  it('в истории хранятся ТОЛЬКО числа — расшифровки речи там нет никогда', async () => {
    await appendSpeechSample(
      { atMs: NOW, speechSec: 300, uniqueWords: 40, cleanPhrases: 4, totalPhrases: 5 },
      NOW,
    );
    const raw = await AsyncStorage.getItem('@phraseman/max/speech-history/v1');
    expect(raw).toBeTruthy();
    // Приватность: в записи допустимы ТОЛЬКО известные числовые поля. Любой
    // лишний ключ — повод пересмотреть, не утекает ли туда текст речи.
    const rows = JSON.parse(String(raw)) as Record<string, unknown>[];
    for (const row of rows) {
      expect(Object.keys(row).sort()).toEqual(
        ['atMs', 'cleanPhrases', 'speechSec', 'totalPhrases', 'uniqueWords'],
      );
      for (const value of Object.values(row)) expect(typeof value).toBe('number');
    }
  });
});
