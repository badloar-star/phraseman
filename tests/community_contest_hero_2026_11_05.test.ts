// «Наборы» rev8 (слово владельца через координатора 05.11): герой конкурса — «Набор месяца / Ещё N дней / Условия участия ›», арт-карточки справа;
// пьедестала и «Твой набор · N место» нет (владелец убрал). Лайки и комментарии в рядах не затронуты.
import fs from 'node:fs';
import path from 'node:path';

import { communityDaysLabel, communityDaysLeftLabel, communitySceneText } from '../components/packs/community_scene_strings';
import type { Lang } from '../constants/i18n';

const scene = fs.readFileSync(path.join(__dirname, '..', 'components/packs/CommunityScene.tsx'), 'utf8').replace(/\r\n/g, '\n');
const LANGS: readonly Lang[] = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

describe('герой конкурса «Наборы» rev8: тексты', () => {
  it('«Ещё N дней» с формой слова — ru/uk/pl по числам, остальные языки по макету', () => {
    expect(communityDaysLeftLabel('ru', 5)).toBe('Ещё 5 дней');
    expect(communityDaysLeftLabel('ru', 1)).toBe('Ещё 1 день');
    expect(communityDaysLeftLabel('ru', 22)).toBe('Ещё 22 дня');
    expect(communityDaysLeftLabel('uk', 5)).toBe('Ще 5 днів');
    expect(communityDaysLeftLabel('en', 5)).toBe('5 days left');
    expect(communityDaysLeftLabel('en', 1)).toBe('1 day left');
    expect(communityDaysLeftLabel('pl', 5)).toBe('Jeszcze 5 dni');
    for (const lang of LANGS) expect(communityDaysLeftLabel(lang, 5)).toContain('5');
  });
  it('«Набор месяца» переведён на все 9 языков, до начала конкурса остаётся прежний счёт', () => {
    expect(communitySceneText('ru', 'Набор месяца', 'Pack of the month')).toBe('Набор месяца');
    for (const lang of LANGS) expect(communitySceneText(lang, 'Набор месяца', 'Pack of the month').length).toBeGreaterThan(3);
    expect(communitySceneText('uk', 'Набор месяца', 'Pack of the month')).toBe('Набір місяця');
    expect(communityDaysLabel('ru', 12)).toBe('12 дней');
  });
});

describe('герой конкурса: раскладка', () => {
  it('«Набор месяца» + «Ещё N дней» + кнопка «Условия участия ›» + арт-карточки справа', () => {
    expect(scene).toContain("LP('Набор месяца', 'Pack of the month')");
    expect(scene).toContain('communityDaysLeftLabel(lang, schedule.days)');
    expect(scene).toContain('testID="community-contest-rules"');
    expect(scene).toContain('<CommunitySceneBackdrop /><CommunitySceneFan />');
    expect(scene).toContain('<CommunityContestRules visible={rules} lang={lang}');
  });
  it('пьедестала и «Твой набор · N место» нет; сцена не фиксирована на 580', () => {
    expect(scene).not.toContain('community-podium');
    expect(scene).not.toContain('myPlace');
    expect(scene).not.toContain('podiumBlock');
    expect(scene).not.toContain("height: 580");
    expect(scene).toContain('minHeight: 330');
  });
  it('«место набора» убрано и с плитки каталога: бейджа месячного места и подписки на рейтинг в плитке нет', () => {
    expect(scene).not.toContain('community-month-place-');
    expect(scene).not.toContain('tileRank');
    expect(scene).not.toContain('monthlyContestPlace');
  });
});
