// зачем (удобство №9, координатор 04.11): «Назад на 10 с», «Медленнее» 0,75× и «Продолжить с m:ss». Сторож: арифметика, строки 9 языков,
// позиция брошенного ролика лежит в стираемом семействе (не в общем ключе), мост скорости есть, плеер подключает ряд кнопок только в карточке.
import fs from 'node:fs';
import path from 'node:path';
import { backTarget, formatClock, youtubeConvenienceCopy, YOUTUBE_SLOW_RATE } from '../components/youtube/youtube_convenience_strings';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('удобства плеера: арифметика и строки', () => {
  it('назад на 10 с не уходит ниже нуля; время как м:сс', () => {
    expect(backTarget(75)).toBe(65);
    expect(backTarget(4)).toBe(0);
    expect(backTarget(Number.NaN)).toBe(0);
    expect(formatClock(222)).toBe('3:42');
    expect(formatClock(-5)).toBe('0:00');
    expect(YOUTUBE_SLOW_RATE).toBe(0.75);
  });
  it('все 9 языков: непустые подписи, время подставляется', () => {
    for (const lang of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
      const c = youtubeConvenienceCopy(lang);
      expect(c.back10.length).toBeGreaterThan(3);
      expect(c.slower.length).toBeGreaterThan(3);
      expect(c.continueFrom('3:42')).toContain('3:42');
    }
  });
});

describe('проводка', () => {
  it('позиция ролика — в стираемом семействе story_events_v1:, старый общий ключ убирается', () => {
    const src = read('app/youtube_resume_position.ts');
    expect(src).toContain("'story_events_v1:youtube_resume'");
    expect(src).toContain("removeItem(LEGACY_STORAGE_KEY)");
  });
  it('мост скорости в странице плеера; плеер подключает ряд кнопок', () => {
    expect(read('app/lingman_youtube.ts')).toContain('window.__lingmanRate');
    const player = read('components/youtube/YoutubeInlinePlayer.tsx');
    expect(player).toContain('<YoutubePlayerConveniences');
    expect(player).toContain('__lingmanRate');
  });
});
