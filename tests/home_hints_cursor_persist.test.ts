import AsyncStorage from '@react-native-async-storage/async-storage';

import { normalizeCursor, selectNextHomeHint, type HomeHintCursor } from '../app/home_hints';
import { parseHomeHintCursor, readHomeHintCursor, writeHomeHintCursor } from '../app/home_hints_cursor_store';
import { SELECTED_HOME_HINTS_SNAPSHOT } from '../app/home_hints_selected';

// зачем: владелец 2026-09-15 — «фразы на блоке статистики всегда одни и те же,
// 1-2 по кругу, когда должны быть все, по очереди». Выбор был честно
// последовательным, но курсор жил только в useRef и обнулялся на каждом
// холодном старте -> всегда индекс 0. Этот сторож ловит именно возврат такого
// поведения: без сохранённого курсора очередь физически не двигается.

const storage = AsyncStorage as unknown as { __reset: () => void };

describe('home hint cursor survives app restarts', () => {
  beforeEach(() => {
    storage.__reset();
  });

  it('сохраняет курсор и продолжает очередь после перезапуска, а не начинает заново', async () => {
    expect(await readHomeHintCursor()).toBeNull();

    // Первый запуск приложения: подсказка №1.
    const firstRun = selectNextHomeHint(
      SELECTED_HOME_HINTS_SNAPSHOT,
      'free',
      normalizeCursor(null, SELECTED_HOME_HINTS_SNAPSHOT),
    );
    await writeHomeHintCursor(firstRun.cursor);

    // Второй запуск: курсор читается из хранилища — подсказка обязана быть ДРУГОЙ.
    const restored = await readHomeHintCursor();
    expect(restored).not.toBeNull();
    const secondRun = selectNextHomeHint(
      SELECTED_HOME_HINTS_SNAPSHOT,
      'free',
      normalizeCursor(restored, SELECTED_HOME_HINTS_SNAPSHOT),
    );
    expect(secondRun.hint?.id).not.toBe(firstRun.hint?.id);
  });

  it('проходит ВСЕ подсказки аудитории до первого повтора', async () => {
    const audience = 'free' as const;
    const queueLength = SELECTED_HOME_HINTS_SNAPSHOT.items.filter(
      (item) => item.audience === 'all' || item.audience === audience,
    ).length;
    expect(queueLength).toBeGreaterThan(50);

    const seen: string[] = [];
    for (let run = 0; run < queueLength; run += 1) {
      // Каждая итерация имитирует новый холодный старт: курсор только из хранилища.
      const stored = await readHomeHintCursor();
      const selected = selectNextHomeHint(
        SELECTED_HOME_HINTS_SNAPSHOT,
        audience,
        normalizeCursor(stored, SELECTED_HOME_HINTS_SNAPSHOT),
      );
      expect(selected.hint).not.toBeNull();
      seen.push(selected.hint!.id);
      await writeHomeHintCursor(selected.cursor);
    }

    expect(new Set(seen).size).toBe(queueLength);

    // Только после полного круга очередь начинается заново.
    const afterFullLoop = selectNextHomeHint(
      SELECTED_HOME_HINTS_SNAPSHOT,
      audience,
      normalizeCursor(await readHomeHintCursor(), SELECTED_HOME_HINTS_SNAPSHOT),
    );
    expect(afterFullLoop.hint?.id).toBe(seen[0]);
  });

  it('переживает мусор в хранилище, не роняя показ подсказки', async () => {
    await AsyncStorage.setItem('home_hints_cursor_v1', '{не json');
    expect(await readHomeHintCursor()).toBeNull();

    await AsyncStorage.setItem('home_hints_cursor_v1', JSON.stringify({ snapshotVersion: 42 }));
    expect(await readHomeHintCursor()).toBeNull();

    expect(parseHomeHintCursor({ snapshotVersion: 'v1', nextIndexByAudience: { all: -5, free: NaN, plus: 3.7 } }))
      .toEqual({ snapshotVersion: 'v1', nextIndexByAudience: { all: 0, free: 0, plus: 3 } });
  });

  it('сбрасывает курсор при смене версии снапшота подсказок', async () => {
    const stale: HomeHintCursor = { snapshotVersion: 'старая-версия', nextIndexByAudience: { all: 7, free: 7, plus: 7 } };
    await writeHomeHintCursor(stale);
    const normalized = normalizeCursor(await readHomeHintCursor(), SELECTED_HOME_HINTS_SNAPSHOT);
    expect(normalized.snapshotVersion).toBe(SELECTED_HOME_HINTS_SNAPSHOT.version);
    expect(normalized.nextIndexByAudience.free).toBe(0);
  });
});
