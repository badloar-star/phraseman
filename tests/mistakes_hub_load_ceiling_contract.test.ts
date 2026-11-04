// Сторож (load_ceiling, 04.11): медленная загрузка хаба «Мои ошибки» — это warning с диагностикой и не чаще раза в 30 минут,
// critical только при реальном отказе чтения; хеш журнала уступает JS-поток, но порядок и проверки целостности прежние.
import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const hub = fs.readFileSync(path.join(root, 'app', 'mistakes_hub.tsx'), 'utf8');
const store = fs.readFileSync(path.join(root, 'app', 'mistake_practice_store.ts'), 'utf8');

describe('mistakes_hub: потолок загрузки', () => {
  it('потолок 20 с', () => {
    expect(hub).toMatch(/export const HUB_LOAD_CEILING_MS = 20_000;/);
  });

  it('запись о потолке — warning с lateMs/appState/сводкой чтения, не чаще раза в 30 минут', () => {
    expect(hub).toMatch(/CEILING_REPORT_COOLDOWN_MS = 30 \* 60_000/);
    expect(hub).toMatch(/DebugLogger\.error\('mistakes_hub:load_ceiling',[^\n]*'warning'\)/);
    expect(hub).not.toMatch(/DebugLogger\.error\('mistakes_hub:load_ceiling',[^\n]*'critical'\)/);
    expect(hub).toMatch(/lateMs=\$\{lateMs\}/);
    expect(hub).toMatch(/mistakeJournalReadSummary\(\)/);
    expect(hub).toMatch(/lastCeilingReportAtMs = Date\.now\(\)/);
  });

  it('critical — только настоящий отказ чтения (catch)', () => {
    expect(hub).toMatch(/DebugLogger\.error\('mistakes_hub:load_failed',[^\n]*'critical'\)/);
  });
});

describe('журнал ошибок: чтение с уступкой потока не меняет проверки', () => {
  it('проверка хеша куска и сверка числа событий на месте, порядок кусков прежний', () => {
    expect(store).toMatch(/const chunkHashOk = sha256Utf8\(chunkRaw as string\) === chunkId;/);
    expect(store).toMatch(/if \(!chunkHashOk\) corruptJournal\('chunk_hash'/);
    expect(store).toMatch(/event_count_mismatch/);
    expect(store).toMatch(/for \(const page of reversedPages\.reverse\(\)\)/);
  });

  it('уступка потока — каждые ~12 мс и только между кусками', () => {
    expect(store).toMatch(/Date\.now\(\) - lastYieldAt > 12/);
    expect(store).toMatch(/setTimeout\(resolve, 0\)/);
  });

  it('чтение не пишет и не удаляет данные журнала', () => {
    const fresh = store.slice(store.indexOf('async function loadMistakeEventJournalFresh'), store.indexOf('export function loadMistakeEventJournal('));
    expect(fresh).not.toMatch(/setItem|removeItem|multiRemove|multiSet/);
  });
});
