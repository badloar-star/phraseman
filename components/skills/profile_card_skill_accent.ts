/**
 * Цвет звезды и полосок навыков на визитке — по одному на каждый из семи видов.
 * Эталон — макет docs/design/v2-app/elevate-light.css, переменная `--pacc` у классов `.pcd`, `.pcd-holo` … `.pcd-neon`.
 *
 * зачем из палитры вида: палитры визитки под замком владельца (profile_card_looks.ts) и здесь не меняются — где цвет макета
 * уже есть в палитре вида, он берётся оттуда и уедет вместе с ней. У обычной визитки, «Ауры» и «Космоса» такого цвета
 * в палитре нет: их три значения сняты с макета.
 */
import type { ProfileCardLook } from '../../app/profile_card_styles';
import { PROFILE_CARD_LOOKS } from '../profile-card/profile_card_looks';

const MOCKUP_ONLY_ACCENT = {
  normal: '#C1C4FF', // theme-exempt: облик карточки профиля — коллекционный арт, цвет снят с макета (.pcd --pacc)
  aura: '#F0DCFF', // theme-exempt: облик карточки профиля — коллекционный арт, цвет снят с макета (.pcd-aura --pacc)
  space: '#9FB0FF', // theme-exempt: облик карточки профиля — коллекционный арт, цвет снят с макета (.pcd-space --pacc)
} as const;

export function profileCardSkillAccent(look: ProfileCardLook): string {
  const tokens = PROFILE_CARD_LOOKS[look];
  switch (look) {
    case 'obs': return tokens.rankText;
    case 'holo':
    case 'ice': return tokens.primary?.fill.colors[1] ?? tokens.title;
    case 'neon': return tokens.badge?.fill.colors[0] ?? tokens.title;
    default: return MOCKUP_ONLY_ACCENT[look];
  }
}
