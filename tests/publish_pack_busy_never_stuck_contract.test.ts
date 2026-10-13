// зачем (аудит Optimistic UI 13.10, правило №10): «Открыть сообществу» (onPublishPack) снимал publishBusy только после нормального возврата — при исключении кнопка зависала навсегда без сообщения.
// Контракт: вызов обёрнут в try/catch, исключение сводится к исходу 'error' (та же ветка тоста), флаг снимается ВСЕГДА после await, причина пишется в журнал.
import fs from 'node:fs';
import path from 'node:path';

describe('публикация набора: кнопка не зависает', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'flashcards_collection.tsx'), 'utf8').replace(/\r\n/g, '\n');
  const start = src.indexOf('const onPublishPack = useCallback(() => {');
  const block = src.slice(start, src.indexOf('}, [packDeeplink, publishBusy, lang, studyTarget, loadAll]);', start));

  it('исключение из publishLocalAuthorPack → исход error, флаг снят, причина в журнале', () => {
    expect(start).toBeGreaterThan(0);
    expect(block).toContain('res = await publishLocalAuthorPack(packDeeplink, lang, studyTarget);');
    expect(block).toContain('} catch (error: unknown) {');
    expect(block).toContain("console.warn('[PACK-PUBLISH] onPublishPack: исключение");
    expect(block).toContain("res = 'error';");
    // флаг снимается после try/catch — до разбора результата
    expect(block.indexOf('setPublishBusy(false);')).toBeGreaterThan(block.indexOf("res = 'error';"));
    expect(block.indexOf('setPublishBusy(false);')).toBeLessThan(block.indexOf("if (res === 'submitted')"));
  });

  it('замок повторного тапа сохранён: busy ставится до await', () => {
    expect(block.indexOf('if (!packDeeplink || publishBusy) return;')).toBeGreaterThan(-1);
    expect(block.indexOf('setPublishBusy(true);')).toBeLessThan(block.indexOf('res = await publishLocalAuthorPack('));
  });
});
