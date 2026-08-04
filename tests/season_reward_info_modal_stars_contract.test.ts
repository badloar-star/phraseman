// ════════════════════════════════════════════════════════════════════════════
// season_reward_info_modal_stars_contract.test.ts — просмотровая модалка
// подарка обязана говорить ценой в звёздах, а не номером уровня.
//
// зачем 2026-08-04 (владелец, со скриншотом: «исправь "откроется на уровне" на
// нужно накопить звёзд для открытия и кол-во звёзд, как в других играх»):
// «Откроется на уровне N» ничего не говорило игроку — карточка на дорожке уже
// давно считает цену подарка в звёздах (seasonPassStarsToUnlockLevel), а эта
// подсказка молчаливо жила старым текстом с абстрактным уровнем.
//
// Модалка в jest не поднимается (reanimated), поэтому контракт проверяется по
// исходнику — тот же приём, что в season_gift_applied_state_contract.test.ts.
// ════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';

const SOURCE = fs.readFileSync(
  path.join(__dirname, '..', 'components', 'SeasonRewardInfoModal.tsx'),
  'utf8',
);

describe('SeasonRewardInfoModal — цена «upcoming» в звёздах, не в уровне', () => {
  test('текст про номер уровня удалён', () => {
    expect(SOURCE).not.toContain('Откроется на уровне');
    expect(SOURCE).not.toContain('Відкриється на рівні');
  });

  test('порог считается той же функцией, что и на карточке дорожки', () => {
    expect(SOURCE).toContain("import { seasonPassStarsToUnlockLevel } from '../app/season_pass_model';");
    expect(SOURCE).toContain('const starsToUnlock = seasonPassStarsToUnlockLevel(level);');
  });

  test('подсказка «upcoming» показывает звёзды, а не level', () => {
    expect(SOURCE).toMatch(/Нужно накопить \$\{starsToUnlock\} ⭐/);
    expect(SOURCE).toMatch(/Потрібно назбирати \$\{starsToUnlock\} ⭐/);
  });
});
