import fs from 'node:fs';
import path from 'node:path';

// зачем (координатор 18.10, Сверка 6/11, Переводчик 98a1f2cf6): внутренняя вкладка «Видео» → «Главная» путалась с главной вкладкой приложения; теперь «Новое» на 9 языках.
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('внутренняя вкладка раздела «Видео»', () => {
  it('называется «Новое» на всех 9 языках, без «Главная/Home»', () => {
    const tabs = read('components/youtube/YoutubeChannelTabs.tsx');
    const line = tabs.split('\n').find((l) => l.trim().startsWith('home: triLang')) ?? '';
    for (const word of ["ru: 'Новое'", "uk: 'Нове'", "en: 'New'", "es: 'Nuevo'", "'pt-BR': 'Novidades'", "vi: 'Mới'", "id: 'Terbaru'", "tr: 'Yeni'", "pl: 'Nowe'"]) expect(line).toContain(word);
    expect(line).not.toContain('Главная');
    expect(line).not.toContain("en: 'Home'");
  });
});
