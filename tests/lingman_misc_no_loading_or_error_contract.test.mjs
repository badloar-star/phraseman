// зачем (владелец 01.10): нигде нет экранов загрузки/ошибки/пустоты. Эти семь файлов
// показывают данные из кэша/локально, сеть обновляет тихо; текстов-заглушек в них быть не должно.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeEol } from './helpers/read_source_esm.mjs';

const strip = (path) => normalizeEol(readFileSync(new URL(path, import.meta.url), 'utf8')).replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');

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

// зачем (04.10, Ядро): 82eb12007 (паритет «Видео» с макетом, состояние «Ошибка») вернул текст ошибки каталога —
// но ТОЛЬКО для самого первого открытия без каталога и без сохранённой копии (D158: «Сейчас недоступно» —
// лишь когда кэша нет совсем). Разрешаем его в одном файле и сторожим именно это условие.
const ALLOWED_IN_FILE = { '../app/lingman_videos.tsx': ['Не удалось загрузить каталог'] };

for (const file of FILES) {
  test(`${file} не содержит текстов загрузки/ошибки/пустоты`, () => {
    const src = strip(file);
    const allowed = ALLOWED_IN_FILE[file] ?? [];
    for (const text of BANNED) {
      if (allowed.includes(text)) continue;
      assert.ok(!src.includes(text), `${file}: найден «${text}»`);
    }
  });
}

// зачем (правило владельца «экранов-ошибок нигде», 18.10): «Не удалось загрузить каталог» больше не выводится — без каталога и
// без сохранённой копии показывается спокойное «Пока пусто · Обновим, как появится связь».
test('каталог «Видео» без кэша — спокойное «Пока пусто», не ошибка (D158 + правило 18.10)', () => {
  const src = strip('../app/lingman_videos.tsx');
  const branch = src.indexOf('catalogExhausted && !catalog && !snapshot ? (');
  const shown = src.indexOf('{quietEmptyTitle(lang)}');
  assert.ok(branch > -1 && shown > branch, 'спокойное «Пока пусто» — в ветке без каталога и без копии');
  assert.equal(src.split('{copy.catalogFailed}').length - 1, 0, 'catalogFailed больше не выводится');
});

test('плеер без кнопки «Повторить» и без lingman-player-error', () => {
  const src = strip('../components/youtube/YoutubeInlinePlayer.tsx');
  assert.doesNotMatch(src, /lingman-player-error|copy\.retry|copy\.loadError/);
});

test('лингман-экраны без VideoStateBlock и retry', () => {
  assert.doesNotMatch(strip('../app/lingman_videos.tsx'), /VideoStateBlock|youtube-catalog-retry|youtube-catalog-error/);
  assert.doesNotMatch(strip('../app/lingman_playlist.tsx'), /VideoStateBlock/);
});
