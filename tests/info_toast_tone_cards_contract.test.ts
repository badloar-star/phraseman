// зачем (Макеты cards-082 и cards-072, разбор 13.10): «Видео сейчас не открывается» и «Набор сохранён на устройстве, публикация не завершена» —
// сообщения, а не ошибки: заголовок «Сообщение» (тон info), а не «Что-то пошло не так» с белой полосой.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));

describe('тон тостов-сообщений Карточек', () => {
  it('ролик не открылся — info в трёх местах: строка набора, герой набора, экран набора из видео', () => {
    expect(read('app/flashcards/VideoPackRow.tsx')).toContain("const videoFailed = useMemo(() => actionToastTri('info', {");
    expect(read('app/flashcards/PackVideoHero.tsx')).toContain("const failToast = useMemo(() => actionToastTri('info', {");
    expect(read('app/flashcards/VideoSetView.tsx')).toContain("const failToast = useMemo(() => actionToastTri('info', {");
    for (const rel of ['app/flashcards/VideoPackRow.tsx', 'app/flashcards/PackVideoHero.tsx', 'app/flashcards/VideoSetView.tsx']) {
      expect(read(rel)).not.toMatch(/actionToastTri\('error', \{\s+ru: 'Видео сейчас не открывается/);
    }
  });

  it('набор сохранён на устройстве, не дошла публикация — info, а настоящие ошибки сохранения остаются error', () => {
    const create = read('app/community_pack_create.tsx');
    expect(create).toContain("actionToastTri('info', {\n            ru: 'Набор сохранён на устройстве.");
    expect(create).toContain("ru: short || 'Не удалось сохранить набор.'");
    expect(create).toContain("actionToastTri('error', {\n          ru: short || 'Не удалось сохранить набор.',");
  });
});
