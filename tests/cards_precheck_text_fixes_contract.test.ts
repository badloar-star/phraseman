// зачем (координатор 12.10, «Карточки: недостающие экраны», текстовая сверка pending-строк реестра с кодом): две подтверждённые правки текстов не должны вернуться —
// cards-052 (подсказка «писать могут те, кто добавил набор» вместо пустого места) и cards-059 (короткое «Спасибо — мы проверим набор.» после жалобы на набор).
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const LANGS = ["ru:", "uk:", "en:", "es:", "'pt-BR':", "vi:", "id:", "tr:", "pl:"];

describe('Cards text precheck fixes', () => {
  it('cards-052: a person who cannot write sees a short note, only after the write check finished', () => {
    const src = read('app/community_packs/PackCommentsSheet.tsx');
    expect(src).toContain('const [writeCheckDone, setWriteCheckDone] = useState(false);');
    // сброс при каждом открытии и подъём только после ответа проверки (иначе подсказка мигает у тех, кому писать можно)
    expect(src).toMatch(/setLoadFailed\(false\);\s*setWriteCheckDone\(false\);/);
    expect(src).toMatch(/setCanWrite\(\(prev\) => prev \|\| finalCanWrite\);\s*setWriteCheckDone\(true\);/);
    const at = src.indexOf('testID="pack-comments-write-locked"');
    expect(at).toBeGreaterThan(-1);
    const block = src.slice(at, at + 1400);
    expect(block).toContain('Писать могут те, кто добавил набор себе.');
    for (const lang of LANGS) expect(block).toContain(lang);
    // показывается вместо композера: ветка `canWrite ? композер : writeCheckDone ? подсказка : null`
    expect(src).toMatch(/\) : writeCheckDone \? \(\s*<Text testID="pack-comments-write-locked"/);
  });

  it('cards-059/020: the report-sent toast is the short line on all nine languages (13.10: bottom sheet closes at once, toast only)', () => {
    const src = read('components/ReportPackModal.tsx');
    const at = src.indexOf("ru: 'Жалоба отправлена'");
    expect(at).toBeGreaterThan(-1);
    const block = src.slice(at - 60, at + 700);
    for (const lang of LANGS) expect(block).toContain(lang);
    expect(src).not.toContain('Твоя жалоба сохранена. Мы рассмотрим её');
  });
});
