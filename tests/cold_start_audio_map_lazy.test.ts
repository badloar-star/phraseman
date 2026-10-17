// зачем (координатор 17.10, [COLD-START]): _layout импортирует модуль посева озвучки статически; сам набор (1,2 МБ, 3801 require mp3)
// обязан подключаться лениво — при первом посеве/поиске файла, после первого кадра Главной, а не при загрузке модуля.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('[COLD-START] набор озвучки V2 не грузится при запуске', () => {
  const seed = read('app/learning_v2_bootstrap_audio_seed_v1.ts');

  it('набор импортируется только как тип, значение — require внутри функции', () => {
    expect(seed).not.toMatch(/^import \{[^}]*LEARNING_V2_BOOTSTRAP_AUDIO_ENTRIES_V1[^}]*\} from "\.\/learning_v2_bootstrap_audio_assets_v1\.generated";/m);
    expect(seed).toContain('import type { LEARNING_V2_BOOTSTRAP_AUDIO_ENTRIES_V1 } from "./learning_v2_bootstrap_audio_assets_v1.generated";');
    expect(seed).toMatch(/function bootstrapAudioEntries\(\)[\s\S]*require\("\.\/learning_v2_bootstrap_audio_assets_v1\.generated"\)/);
  });

  it('на верхнем уровне модуля нет обхода набора (Map/filter строятся при первом обращении)', () => {
    expect(seed).not.toMatch(/^const entryByContentHash = new Map/m);
    expect(seed).not.toMatch(/^const launchSeedEntries = /m);
  });
});
