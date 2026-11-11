import { readFileSync } from 'fs';
import { join } from 'path';
import { classifyCoinWalletSource } from './coin_wallet_policy';

// ЗАМОК ВЛАДЕЛЬЦА 22.10: «сервер для сохранения, а не решений… монеты и всё остальное выдаётся телефоном… сервер
// сохраняет для синхронизации, чтобы не потерялось».
// зачем (11.11): «Урок вместе» удалён вместе с курсом занятий — его серверных функций и источника монет больше нет;
// сторож теперь держит замок для дуэли и следит, что снятые источники монет кошелёк не принимает.
// Ослабить или удалить — только по новому слову владельца (docs/work/OWNER_LOCKS.md).

const src = (file: string): string => readFileSync(join(__dirname, file), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');

describe('ЗАМОК ВЛАДЕЛЬЦА 22.10 «сервер хранит, телефон решает» — «Друзья» и кошелёк', () => {
  test('снятые источники монет («Урок вместе», экзамен главы) кошелёк больше не принимает', () => {
    const log = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      expect(() => classifyCoinWalletSource(`lessontogether_${'a'.repeat(40)}`)).toThrow('coin_wallet_source_not_allowed');
      expect(() => classifyCoinWalletSource('chapterexam_l01_c2_1')).toThrow('coin_wallet_source_not_allowed');
    } finally {
      log.mockRestore();
    }
  });

  test('сервер дуэли не пишет в журнал монет и не сверяет занятие', () => {
    for (const file of ['friends_duel.ts', 'friends_duel_core.ts']) {
      const code = src(file);
      expect([file, /from '\.\/stars_ledger'|prepareStarOperations|commitStarOperations/.test(code)]).toEqual([file, false]);
      expect([file, /LessonCompletionReader|judgeLessonClaim|readRequiredSessionCompletionFact/.test(code)]).toEqual([file, false]);
    }
  });

  test('сервер дуэли хранит ходы и не выносит вердикт: ни в документ, ни в уведомление, ни в ответ (итог — на телефоне)', () => {
    const code = src('friends_duel.ts');
    expect(code).not.toMatch(/duelOutcome|invertDuelOutcome|outcomeForChallenger|\boutcome\s*:/);
    expect(src('friends_duel_core.ts')).not.toMatch(/export function (duelOutcome|invertDuelOutcome)\b/);
  });

  test('серверных функций «Урока вместе» нет в экспортах', () => {
    expect(src('index.ts')).not.toMatch(/friendsLessonTogetherClaim|friendsLessonInvite|friendsLessonTogetherMark/);
  });
});
