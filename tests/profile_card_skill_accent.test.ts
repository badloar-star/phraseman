import { PROFILE_CARD_PRO_STYLE_IDS, type ProfileCardLook } from '../app/profile_card_styles';
import { profileCardSkillAccent } from '../components/skills/profile_card_skill_accent';

// Эталон: docs/design/v2-app/elevate-light.css, переменная --pacc у .pcd и .pcd-<стиль> (макет утверждён владельцем 11.11).
const MOCKUP_ACCENT: Readonly<Record<ProfileCardLook, string>> = {
  normal: '#C1C4FF',
  holo: '#B9FFE6',
  obs: '#F3E2B8',
  aura: '#F0DCFF',
  ice: '#BFEAFF',
  space: '#9FB0FF',
  neon: '#00E5FF',
};

describe('цвет навыков на визитке', () => {
  it('у каждого из семи видов совпадает с макетом', () => {
    const looks: ProfileCardLook[] = ['normal', ...PROFILE_CARD_PRO_STYLE_IDS];
    expect(looks).toHaveLength(7);
    for (const look of looks) {
      expect(`${look}:${profileCardSkillAccent(look).toUpperCase()}`).toBe(`${look}:${MOCKUP_ACCENT[look]}`);
    }
  });
});
