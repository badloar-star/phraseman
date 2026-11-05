// Governance-ID: TG-CC8FDE405D86
import { formatPackPublishDate } from '../app/flashcards/video_pack_date';

import fs from 'node:fs';
import path from 'node:path';

// зачем (правка владельца 05.11): серая строка набора — «N карточек · 12 окт 2026»; нет даты — подписи с датой нет.
test('строка catalog берёт дату публикации, а не длительность', () => {
  const row = fs.readFileSync(path.join(__dirname, '..', 'app', 'flashcards', 'VideoPackRow.tsx'), 'utf8');
  const catalog = row.slice(row.indexOf("variant === 'catalog'"), row.indexOf("variant === 'catalog'") + 600);
  expect(catalog).toContain('formatPackPublishDate(pack.updatedAt, lang)');
  expect(catalog).not.toContain('duration={duration}');
});

describe('дата публикации набора из видео', () => {
  const iso = new Date(Date.UTC(2026, 9, 12, 12, 0, 0)).toISOString();

  test('содержит день и год, без времени', () => {
    for (const lang of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
      const text = formatPackPublishDate(iso, lang);
      expect(text).toContain('2026');
      expect(text).toMatch(/12/);
      expect(text).not.toMatch(/\d:\d\d/);
    }
  });

  test('нет даты, эпоха 0 и мусор → пусто', () => {
    expect(formatPackPublishDate(undefined, 'ru')).toBe('');
    expect(formatPackPublishDate('', 'ru')).toBe('');
    expect(formatPackPublishDate(new Date(0).toISOString(), 'ru')).toBe('');
    expect(formatPackPublishDate('не дата', 'en')).toBe('');
  });
});
