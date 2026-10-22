// зачем (Ревизор 3.173, после удаления записей 22.10): в занятиях звучит только голос телефона. Вместе с записями ушёл
// старый сторож learning_v2_no_audio_download_guard — этот не даёт скачиванию звука тихо вернуться в живой код
// Learning V2 (экраны app/ и компоненты): ни загрузки файла, ни ссылки на Storage.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const DOWNLOAD_CALLS = [
  /\bdownloadAsync\s*\(/,
  /\bgetDownloadURL\s*\(/,
  /\bdownloadFileAsync\s*\(/,
  /\bcreateDownloadResumable\s*\(/,
];

function walk(dirRel: string): string[] {
  const abs = path.join(ROOT, dirRel);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((entry) => {
    const rel = `${dirRel}/${entry.name}`;
    if (entry.isDirectory()) return walk(rel);
    return /\.(ts|tsx)$/.test(entry.name) ? [rel] : [];
  });
}

const liveLearningV2Files = (): string[] => [
  ...fs.readdirSync(path.join(ROOT, 'app'))
    .filter((name) => /^learning_v2_.*\.(ts|tsx)$/.test(name))
    .map((name) => `app/${name}`),
  ...walk('app/learning-v2'),
  ...walk('components/learning-v2'),
];

// Комментарии не считаются: в них рассказывают историю удалённой загрузки.
const withoutComments = (source: string): string => source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('Learning V2: только голос телефона — скачивания звука нет', () => {
  it('живые файлы Learning V2 найдены (сторож смотрит туда, куда надо)', () => {
    expect(liveLearningV2Files().length).toBeGreaterThan(20);
  });

  it('ни один живой файл Learning V2 не скачивает звук', () => {
    const offenders = liveLearningV2Files().flatMap((rel) => {
      const code = withoutComments(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
      return DOWNLOAD_CALLS.filter((pattern) => pattern.test(code)).map((pattern) => `${rel}: ${pattern.source}`);
    });
    expect(offenders).toEqual([]);
  });
});
