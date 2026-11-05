// Governance-ID: TG-466C0900CB4D
// Сторож (владелец 05.11: «макет Пика одобрен, реализовать ТОЧНО так же, как на макете»): полноэкранный тур Пика —
// ровно 3 страницы, ровно тексты peakTour1..3 (дословно, 9 языков непустые), заголовков нет, цвета только из темы.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PEAK_TOUR_FULL_PAGES, PEAK_TOUR_FULL_TEXT_KEYS } from '../components/spire/peak/peak_tour_full_core';
import { spireGameText } from '../components/spire/spire_game_strings';

const src = fs.readFileSync(path.join(__dirname, '..', 'components/spire/peak/PeakTourFull.tsx'), 'utf8');
const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const OWNER_RU = [
  'Пик — игра для тех, кто любит соревноваться. А ещё это отдельный способ попрактиковаться и заработать монеты.',
  '5 учеников, которые заработали больше всех монет за неделю, переходят в следующую лигу, увеличивают запас энергии для занятий и получают +1000 монет.',
  'Если дошёл до последнего этажа Пика, переходишь в новую лигу в любом случае, независимо от количества монет.',
];

describe('полноэкранный тур Пика: 1:1 по утверждённому макету', () => {
  it('3 страницы и ключи peakTour1..3', () => {
    expect(PEAK_TOUR_FULL_PAGES).toBe(3);
    expect([...PEAK_TOUR_FULL_TEXT_KEYS]).toEqual(['peakTour1', 'peakTour2', 'peakTour3']);
  });

  it('тексты дословно от владельца (ru) и непустые на всех 9 языках', () => {
    PEAK_TOUR_FULL_TEXT_KEYS.forEach((key, i) => {
      expect(spireGameText('ru', key)).toBe(OWNER_RU[i]);
      for (const lang of LANGS) expect(spireGameText(lang as never, key).trim().length).toBeGreaterThan(20);
    });
  });

  it('заголовков нет: ключи tour*Title/tour*Coins в туре не используются', () => {
    expect(src).not.toMatch(/tour\dTitle|tour\dText|Coins['"`]/);
    expect(src).not.toMatch(/accessibilityRole="header"/);
  });

  it('рисунки как в макете: башня, пять строк с монетами ранга, плашки лиги/энергии/+1 000, окно башни на 15 этаже', () => {
    expect(src).toContain('SpireTowerDeferred');
    expect(src).toContain('coinRankSourceForSize');
    expect(src).toMatch(/TOP5[\s\S]*\[12, 1840\][\s\S]*\[5, 1275\]/);
    expect(src).toMatch(/\+1\$\{NBSP\}000/);
    expect(src).toMatch(/myFloor=\{15\}[\s\S]*myCoinRank=\{7\}/);
    expect(src).toContain('name="flash"');
  });

  it('цвета только из темы: нет сырых литералов, нет обводок, нет мелких подписей', () => {
    const lines = src.split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l));
    const body = lines.join('\n');
    expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
    expect(body).not.toMatch(/borderWidth|borderColor|adjustsFontSizeToFit/);
    expect(body).not.toMatch(/fontSize: (?:[0-9]|1[0-3])\b/);
  });

  it('лог [PEAK-TOUR-FULL]: shown / page / skip / start', () => {
    expect(src).toContain("'[PEAK-TOUR-FULL]'");
    for (const ev of ['shown', 'page', 'skip', 'start']) expect(src).toContain(`LOG, '${ev}'`);
  });

  it('кнопки: «Пропустить» на каждой странице, «Далее» на всю ширину, на последней «Начать»', () => {
    expect(src).toMatch(/spireGameText\(lang, 'skip'\)/);
    expect(src).toMatch(/last \? 'start' : 'next'/);
    expect(src).toMatch(/pagingEnabled/);
  });
});
