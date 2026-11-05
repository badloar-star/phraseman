// ЗАМОК ВЛАДЕЛЬЦА 05.11 (TestFlight 149, дословно): «Убрать описание из страницы!!! 1 и 2».
// На вкладке «Друзья» нет строк-описаний наград «1 — друг прошёл первый урок…» и «2 — трое друзей…», полоски прогресса и заметки о потолке;
// остаются заголовок, код друга + копирование, «Поделиться кодом», «Как это работает», «Добавить друга». Правила наград — только внутри «Как это работает».
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('замок владельца 05.11: Друзья без строк наград 1/2', () => {
  const ladder = read('components/referral_ladder.tsx');
  const friends = read('app/(tabs)/friends.tsx');

  it('компонент лесенки в режиме compactFriends не рисует шаги, полоску и cap-заметку', () => {
    expect(ladder).toContain('compactFriends');
    const hidden = ladder.slice(ladder.indexOf('{compactFriends ? null : (\n        <>'));
    expect(hidden).toContain('testID="referral-ladder-step-1"');
    expect(hidden).toContain('testID="referral-ladder-step-2"');
    expect(hidden).toContain('testID="referral-ladder-bar"');
    expect(hidden).toContain('testID="referral-ladder-cap"');
  });

  it('вкладка «Друзья» всегда зовёт лесенку в компактном режиме', () => {
    const at = friends.indexOf('<ReferralLadder\n');
    expect(at).toBeGreaterThan(0);
    expect(friends.slice(at, at + 120)).toContain('compactFriends');
  });

  it('код, «Поделиться» и «Как это работает» остаются', () => {
    for (const id of ['referral-ladder-code', 'referral-ladder-share', 'referral-ladder-how']) expect(ladder).toContain(`testID="${id}"`);
  });
});
