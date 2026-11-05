// Governance-ID: TG-50B98E144DEE
// Сторож (владелец 05.11, гнев на кадре 5562: тур Пика показал «Поднимайся выше всех за неделю / Каждую неделю — новый пик…»):
// оба тура — PeakTour (новый экран) и SpireTour (старая картинка-тур) — показывают РОВНО три утверждённых 04.11 текста peakTour1..3 и никаких tour*Title.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { peakTourKeys } from '../components/spire/peak/peak_tour_core';
import { setSpireTextRankBy, spireGameText } from '../components/spire/spire_game_strings';

const OWNER_RU = [
  'Пик — игра для тех, кто любит соревноваться. А ещё это отдельный способ попрактиковаться и заработать монеты.',
  '5 учеников, которые заработали больше всех монет за неделю, переходят в следующую лигу, увеличивают запас энергии для занятий и получают +1000 монет.',
  'Если дошёл до последнего этажа Пика, переходишь в новую лигу в любом случае, независимо от количества монет.',
];
const src = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('тур Пика: только утверждённые тексты владельца', () => {
  afterEach(() => setSpireTextRankBy('steps'));

  it.each([['coins'], ['steps']] as const)('PeakTour, режим %s и глобальный режим текстов coins/steps: три текста дословно, заголовков нет', (rankBy) => {
    for (const globalMode of ['coins', 'steps'] as const) {
      setSpireTextRankBy(globalMode);
      for (const page of [0, 1, 2] as const) {
        const keys = peakTourKeys(page, rankBy);
        expect(keys.title).toBeNull();
        expect(spireGameText('ru', keys.text)).toBe(OWNER_RU[page]);
      }
    }
  });

  it('SpireTour: берёт peakTour1..3 и не рисует заголовок', () => {
    const tour = src('components/spire/SpireTour.tsx');
    expect(tour).toContain("'peakTour1' : page === 1 ? 'peakTour2' : 'peakTour3'");
    expect(tour).not.toMatch(/tour[123]Title|tour[123]Text\b/);
    expect(tour).not.toContain('accessibilityRole="header"');
  });

  it('оба тура пишут [PEAK-TOUR-COPY]', () => {
    expect(src('components/spire/SpireTour.tsx')).toContain('[PEAK-TOUR-COPY]');
    expect(src('components/spire/peak/PeakTour.tsx')).toContain('[PEAK-TOUR-COPY]');
  });
});
