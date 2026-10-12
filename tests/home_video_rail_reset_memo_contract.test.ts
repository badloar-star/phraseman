// зачем (Ядро 13.10, аудит языка Авторизации): в одном запуске en → es → en полоса видео Главной оставалась скелетонами — эффект сброса D130 для не-каталожной цели (en) ставил пусто и 'loading',
// а эффект ленты en при возврате ничего не эмитил (кэш уже в памяти, сеть уже обновляла ленту). Сброс обязан брать снимок из памяти сам и писать, откуда взял.
import fs from 'node:fs';
import path from 'node:path';

describe('Главная: сброс ленты видео при смене языка', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'home.tsx'), 'utf8').replace(/\r\n/g, '\n');
  const start = src.indexOf('const homeRailTargetRef = useRef(studyTarget);');
  const block = src.slice(start, src.indexOf('}, [studyTarget]);', start));

  it('для не-каталожной цели берётся снимок из памяти (только непустой), каталожной — peek каталога', () => {
    expect(start).toBeGreaterThan(0);
    expect(block).toContain('const catalog = homeVideoRailUsesCatalog(studyTarget);');
    expect(block).toContain('const peek = catalog ? peekHomeVideoRailForTarget(studyTarget) : null;');
    expect(block).toContain('const memo = !catalog && homeVideoSnapshotMemo && homeVideoSnapshotMemo.videos.length > 0 ? homeVideoSnapshotMemo : null;');
    expect(block).toContain('setHomeV2Videos(peek?.videos ?? memo?.videos ?? []);');
    expect(block).toContain("setHomeV2VideoStatus(peek || memo ? 'ready' : 'loading');");
  });

  it('ветка сброса пишет в журнал цель, источник и число видео', () => {
    expect(block).toContain("console.warn('[LANG-SURFACE] home_rail:reset'");
    expect(block).toContain("source: peek ? 'catalog' : memo ? 'memo' : 'none'");
  });
});
