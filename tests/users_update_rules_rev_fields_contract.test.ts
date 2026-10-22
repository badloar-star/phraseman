// зачем (вопрос 27; условие координатора к 5755b2f94 перед сборкой): синк кладёт flashcardPagesRev_en / _fr в общий
// патч users/{uid}. Если правило update получит разрешённый список (hasOnly) или эти поля попадут в запретный, весь
// патч синка будет отклонён — прогресс перестанет сохраняться. Сторож держит оба условия.
import { readFileSync } from 'fs';
import path from 'path';

const rules = readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8').replace(/\r\n/g, '\n');
const REV_FIELDS = ['flashcardPagesRev_en', 'flashcardPagesRev_fr', 'flashcardPagesRev'];

function usersUpdateRule(): string {
  const start = rules.indexOf('match /users/{userId} {');
  expect(start).toBeGreaterThan(0);
  const update = rules.indexOf('allow update:', start);
  const end = rules.indexOf(';', update);
  return rules.slice(update, end);
}

function functionBody(name: string): string {
  const start = rules.indexOf(`function ${name}(`);
  expect(start).toBeGreaterThan(0);
  // Тело — до следующего объявления функции.
  const next = rules.indexOf('function ', start + 9);
  return rules.slice(start, next > 0 ? next : start + 4000);
}

describe('правило update users/{uid} пропускает поля ревизии карточек', () => {
  const rule = usersUpdateRule();
  const helpers = [...rule.matchAll(/([A-Za-z]+)\(/g)].map((match) => match[1])
    .filter((name) => !['userDocOwnerMatchesAuth', 'isAdmin', 'authLinkMapsToUser', 'accountDeletionNotPending'].includes(name));

  it('нет разрешённого списка (hasOnly) ни в правиле, ни в его проверках', () => {
    expect(rule).not.toContain('hasOnly');
    for (const name of helpers) expect({ name, hasOnly: functionBody(name).includes('hasOnly') }).toEqual({ name, hasOnly: false });
  });

  it('ни один запретный список не называет поля ревизии', () => {
    for (const name of [...helpers, 'serverOwnedUserIdentityFields']) {
      const body = functionBody(name);
      for (const field of REV_FIELDS) {
        expect({ name, field, listed: body.includes(`'${field}'`) }).toEqual({ name, field, listed: false });
      }
    }
  });

  it('проверки правила — те, что сверило Ядро (новая проверка требует пересверки этого сторожа)', () => {
    expect(helpers.sort()).toEqual([
      'hasNoLevelRewardSpinWrites',
      'hasNoProgressAuthorityMarkerWrites',
      'hasNoServerGiftPerkWrites',
      'hasNoServerIdentityWrites',
      'hasNoShardWrites',
      'hasNoTopLevelPremiumWrites',
      'progressHasNoPremiumWrites',
    ]);
  });
});
