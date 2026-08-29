import * as fs from 'fs';
import * as path from 'path';
import { ARENA_SOUNDS, arenaSound, arenaSoundEventId } from '../modules/arena/sound_catalog';

/**
 * Звуки Арены.
 *
 * Владелец: «для звуков должны быть написаны промпты для генерации, каждый
 * звук — три промпта, разные стили, начало каждого промпта с названия, куда и
 * для чего этот звук будет применён, чтобы другая ллмка тоже поняла».
 *
 * Три вещи обязаны сходиться: промпты в документе, каталог и места вызова.
 * Разъезжаются они молча — звук без промпта никогда не сгенерируют, звук без
 * вызова никогда не прозвучит, и заметить это можно только на слух.
 */

const ROOT = path.resolve(__dirname, '..');
const doc = fs.readFileSync(path.join(ROOT, 'docs/arena/SOUND_PROMPTS.md'), 'utf8');

/** Разбирает документ: имя файла → блок текста до следующего звука. */
function promptBlocks(): Map<string, string> {
  const blocks = new Map<string, string>();
  const parts = doc.split(/^### `/m).slice(1);
  for (const part of parts) {
    const file = part.slice(0, part.indexOf('`'));
    blocks.set(file, part);
  }
  return blocks;
}

const BLOCKS = promptBlocks();

describe('каталог', () => {
  it('ключи и файлы не повторяются', () => {
    expect(new Set(ARENA_SOUNDS.map((s) => s.key)).size).toBe(ARENA_SOUNDS.length);
    expect(new Set(ARENA_SOUNDS.map((s) => s.file)).size).toBe(ARENA_SOUNDS.length);
    expect(new Set(ARENA_SOUNDS.map((s) => s.eventId)).size).toBe(ARENA_SOUNDS.length);
  });

  it('все события Арены названы одинаково', () => {
    for (const spec of ARENA_SOUNDS) {
      expect(spec.eventId.startsWith('pm.arena.')).toBe(true);
      expect(spec.file.startsWith('ar_')).toBe(true);
      expect(spec.file.endsWith('.mp3')).toBe(true);
    }
  });

  it('громкость и длительность в разумных пределах', () => {
    for (const spec of ARENA_SOUNDS) {
      expect(spec.volume).toBeGreaterThan(0);
      expect(spec.volume).toBeLessThanOrEqual(0.7);
      expect(spec.durationMs).toBeGreaterThan(0);
      expect(spec.durationMs).toBeLessThanOrEqual(2000);
    }
  });

  /**
   * На этом уже обжигались в турнире: кулдаун длиннее секундного шага глотал
   * каждый второй тик, и игрок слышал «3…1» вместо «3, 2, 1».
   */
  it('кулдаун отсчёта строго короче секунды', () => {
    expect(arenaSound('countdownTick').cooldownMs).toBeLessThan(1000);
    expect(arenaSound('timerTick').cooldownMs).toBeLessThan(1000);
  });

  /** Доска пар — быстрые серии тыков; длинный кулдаун слипает их в щелчок. */
  it('пары и полёт звёзд звучат сериями, а не по одному', () => {
    expect(arenaSound('pairMatch').cooldownMs).toBeLessThanOrEqual(100);
    expect(arenaSound('starFly').cooldownMs).toBeLessThanOrEqual(100);
  });

  /** Исход матча важнее тика таймера — иначе фанфару перебьёт щелчок. */
  it('исход матча перебивает всё остальное', () => {
    const result = arenaSound('resultWin').priority;
    for (const key of ['timerTick', 'optionTap', 'taskIn', 'opponentAnswered'] as const) {
      expect(result).toBeGreaterThan(arenaSound(key).priority);
    }
  });

  it('неизвестный звук — явная ошибка, а не тишина', () => {
    expect(() => arenaSound('нетакого' as never)).toThrow();
  });

  it('идентификатор события достаётся по ключу', () => {
    expect(arenaSoundEventId('answerCorrect')).toBe('pm.arena.answer_correct');
  });
});

describe('промпты сходятся с каталогом', () => {
  it('у КАЖДОГО звука есть блок промптов', () => {
    for (const spec of ARENA_SOUNDS) {
      expect(BLOCKS.has(spec.file)).toBe(true);
    }
  });

  it('лишних промптов без звука в каталоге нет', () => {
    const known = new Set(ARENA_SOUNDS.map((spec) => spec.file));
    for (const file of BLOCKS.keys()) {
      expect(known.has(file)).toBe(true);
    }
  });

  /** Требование владельца дословно: три промпта, разные стили. */
  it('у каждого звука ровно три промпта', () => {
    for (const spec of ARENA_SOUNDS) {
      const block = BLOCKS.get(spec.file)!;
      for (const style of ['**A.**', '**B.**', '**C.**']) {
        expect(block).toContain(style);
      }
      expect(block).not.toContain('**D.**');
    }
  });

  /**
   * «Начало каждого промпта с названия, куда и для чего этот звук будет
   * применён, чтобы другая ллмка тоже поняла». Проверяем, что промпт
   * действительно описывает применение, а не просто просит звук.
   */
  it('каждый промпт объясняет, где звук применяется', () => {
    for (const spec of ARENA_SOUNDS) {
      const block = BLOCKS.get(spec.file)!;
      for (const style of ['A', 'B', 'C']) {
        const start = block.indexOf(`**${style}.**`);
        const text = block.slice(start, start + 400).toLowerCase();
        // Промпт обязан называть приложение и момент, а не быть «short beep».
        expect(/quiz|duel|match|language|arena|player|game/.test(text)).toBe(true);
        expect(text.length).toBeGreaterThan(120);
      }
    }
  });

  it('у каждого звука описан момент применения по-русски', () => {
    for (const spec of ARENA_SOUNDS) {
      expect(BLOCKS.get(spec.file)!).toContain('Момент:');
    }
  });

  it('документ называет генератор и целевую папку', () => {
    expect(doc).toContain('Adobe Firefly');
    expect(doc).toContain('assets/sounds/ar/');
  });
});

describe('каталог сходится с объявлениями директора', () => {
  const events = fs.readFileSync(path.join(ROOT, 'modules/audio/sound_events.ts'), 'utf8');

  /**
   * Числа в двух местах расходятся молча: каталог говорит одно, директор
   * играет другое, и услышать это можно только ушами.
   */
  it('каждый звук объявлен и ровно с теми числами, что в каталоге', () => {
    // зачем 2026-08-28: часть файлов Арены уже сгенерирована и подключена, у
    // таких строк источник — require(...), а не null. Числа при этом обязаны
    // совпадать с каталогом по-прежнему, поэтому сверяем ХВОСТ объявления
    // (громкость, приоритет, кулдаун, длительность, семейство), а не весь текст.
    for (const spec of ARENA_SOUNDS) {
      const tail = `, ${spec.volume}, ${spec.priority}, ${spec.cooldownMs}, ${spec.durationMs}, 'arena')`;
      const at = events.indexOf(`'${spec.eventId}':`);
      expect(at).toBeGreaterThan(-1);
      const line = events.slice(at, events.indexOf('\n', at));
      expect(line).toContain(tail);
    }
  });

  it('объявлений Арены ровно столько же, сколько в каталоге', () => {
    const declared = events.match(/'pm\.arena\.[a-z_]+':/g) ?? [];
    expect(declared.length).toBe(ARENA_SOUNDS.length);
  });

  /**
   * Звук Арены либо ещё не сгенерирован (источник null — директор молча
   * пропускает такое событие), либо подключён файлом, который РЕАЛЬНО лежит
   * на диске. Третьего не дано: require на несуществующий файл роняет сборку
   * Metro целиком, а не только звук.
   *
   * зачем 2026-08-28: прежняя редакция требовала, чтобы источники были пусты
   * ВСЕГДА. Это сторожило временное состояние «файлов ещё нет», и первый же
   * подключённый звук ронял тест на ровном месте.
   */
  it('источник либо пуст, либо ведёт на существующий файл', () => {
    const dir = path.join(__dirname, '..', 'modules', 'audio');
    for (const spec of ARENA_SOUNDS) {
      const at = events.indexOf(`'${spec.eventId}':`);
      expect(at).toBeGreaterThan(-1);
      const line = events.slice(at, events.indexOf('\n', at));
      const req = line.match(/require\('([^']+)'\)/);
      if (!req) {
        expect(line).toContain('event(null,');
        continue;
      }
      expect(fs.existsSync(path.join(dir, req[1]))).toBe(true);
    }
  });

  it('семейство «arena» заведено', () => {
    expect(events).toContain("| 'arena'");
  });
});
