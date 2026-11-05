// зачем (координатор 05.11, «лёгкое событие переход в лигу», 150): одна история в ленте «Ты поднимаешься в лигу X · +1000 монет» — БЕЗ новых серверных функций и без пакета «достижения Пика».
// Событие уже живёт как spire_week с исходом 'up': название лиги и сумма берутся из payload (floor = лига, promotionCoins = награда сервера, боевое 1000). Сторож фиксирует контракт.
import * as fs from 'fs';
import * as path from 'path';
import { storyTemplateFromEvent } from '../components/stories/templates/story_template_from_event';
import { storyText } from '../components/stories/story_strings';

const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

function event(payload: Record<string, unknown>) {
  return { id: 'e1', type: 'spire_week', atMs: 1, payload } as never;
}

describe('история «переход в лигу» (spire_week, исход up)', () => {
  it('награда и лига берутся из payload, а не зашиты', () => {
    const tpl = storyTemplateFromEvent(event({ outcome: 'up', floor: 4, place: 1, total: 30, weekCoins: 470, promotionCoins: 1000 }));
    expect(tpl).toMatchObject({ id: 'peakweek', outcome: 'up', tier: 4, promotionCoins: 1000 });
    const other = storyTemplateFromEvent(event({ outcome: 'up', floor: 2, place: 2, total: 30, weekCoins: 10, promotionCoins: 250 }));
    expect(other).toMatchObject({ outcome: 'up', tier: 2, promotionCoins: 250 });
  });

  it('без награды сервера строки «+N» нет: promotionCoins отсутствует → 0', () => {
    const tpl = storyTemplateFromEvent(event({ outcome: 'up', floor: 1, place: 1, total: 30, weekCoins: 5 }));
    expect(tpl).toMatchObject({ outcome: 'up', promotionCoins: 0 });
  });

  it('«+N» показывается только при подъёме (оба кадра) и сумма не зашита', () => {
    for (const rel of ['components/stories/templates/frames_progress.tsx', 'components/stories/StorySlides.tsx']) {
      const src = read(rel);
      expect(src).toMatch(/outcome === 'up' && (tpl\.)?promotionCoins > 0/);
      expect(src).toMatch(/promotionCoins > 0 \? `\+\$\{storyThousands\((tpl\.)?promotionCoins\)\}`/);
    }
  });

  it('заголовок «поднимаешься в {лига}» есть на 9 языках, подставляет лигу и без слова «ступень»', () => {
    for (const lang of LANGS) {
      const text = storyText(lang, 'weekUp', { league: 'LEAGUE_X' });
      expect(text).toContain('LEAGUE_X');
      expect(text).not.toMatch(/ступен|ступін|step\b|escal/i);
    }
  });
});
