// зачем (01.10): жемчуг старых v1-наборов не начисляется (D70/D104) — его нельзя
// показывать наградой; видимая награда за жалобу — только монеты.
import { REPORT_REWARD_TIERS_V1, reportRewardHasVisibleReward } from '../app/report_reward_bundle';

describe('награда за жалобу: видны только монеты', () => {
  it('legacy v1 (только жемчуг) — награды не показываем', () => {
    expect(reportRewardHasVisibleReward(REPORT_REWARD_TIERS_V1.legacy)).toBe(false);
  });
  it('v1 с монетами — показываем', () => {
    expect(reportRewardHasVisibleReward(REPORT_REWARD_TIERS_V1.minor)).toBe(true);
  });
  it('без награды — не показываем', () => {
    expect(reportRewardHasVisibleReward(REPORT_REWARD_TIERS_V1.none)).toBe(false);
  });
});
