// P0 владельца 05.11: «лента видео не должна пропадать целиком — нет сети: показать кэш». Лог эмулятора без сети: disk_stale ageMin=15945 → catch → silent retries exhausted → лента скрыта.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app/home_video_rail_source.ts'), 'utf8').replace(/\r\n/g, '\n');

describe('лента видео Главной: сбой сети → устаревший кэш вместо пустоты', () => {
  it('есть чтение устаревшей записи и возврат её при сбое сети', () => {
    expect(src).toContain('async function readStaleRailFromDisk(');
    expect(src).toContain('home_rail:network_failed → устаревший кэш вместо пустоты');
    expect(src).toContain('return stale.result;');
  });
  it('без кэша ошибка не глотается: причина в журнале и повторный выброс', () => {
    expect(src).toContain('home_rail:network_failed, кэша нет → ошибка');
    expect(src).toMatch(/throw error;/);
  });
  it('свежесть обычного пути не менялась: срок записи по-прежнему отсекает устаревшее в readRailFromDisk', () => {
    expect(src).toContain('ageMs >= RAIL_TTL_MS');
  });
});
