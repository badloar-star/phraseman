// зачем (владелец 01.10): нигде нет экранов загрузки/ошибки/пустоты. Эти семь файлов
// показывают данные из кэша/локально, сеть обновляет тихо; текстов-заглушек в них быть не должно.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const strip = (path) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');

const BANNED = [
  'Загружаем данные', 'Данные недоступны', 'Вопросы не загрузились', 'Видео временно недоступны',
  'Нет доступных видео', 'Видео этого плейлиста пока недоступны', 'Не удалось загрузить каталог',
  'Плеер временно не загрузился', 'Пока нет данных', 'Здесь пока нет опубликованных видео',
  'Каталог давно не обновлялся', 'Показываем сохранённый каталог',
];
const FILES = [
  '../app/coin_rank.tsx',
  '../app/diagnostic_test.tsx',
  '../components/ActivityHeatmap365.tsx',
  '../components/home/v2/HomeV2VideoRail.tsx',
  '../app/lingman_playlist.tsx',
  '../app/lingman_videos.tsx',
  '../components/youtube/YoutubeInlinePlayer.tsx',
];

for (const file of FILES) {
  test(`${file} не содержит текстов загрузки/ошибки/пустоты`, () => {
    const src = strip(file);
    for (const text of BANNED) assert.ok(!src.includes(text), `${file}: найден «${text}»`);
  });
}

test('плеер без кнопки «Повторить» и без lingman-player-error', () => {
  const src = strip('../components/youtube/YoutubeInlinePlayer.tsx');
  assert.doesNotMatch(src, /lingman-player-error|copy\.retry|copy\.loadError/);
});

test('лингман-экраны без VideoStateBlock и retry', () => {
  assert.doesNotMatch(strip('../app/lingman_videos.tsx'), /VideoStateBlock|youtube-catalog-retry|youtube-catalog-error/);
  assert.doesNotMatch(strip('../app/lingman_playlist.tsx'), /VideoStateBlock/);
});
