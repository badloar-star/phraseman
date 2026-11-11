// ─── Визитка: чьи навыки и показывать ли их зрителю ───────────────────────────
// зачем (владелец 11.11.2026, D207): «друзья видят навыки всегда; посторонние — только на визитке „Про“; без „Про“ навыки
// просто не показываются». Хук только собирает уже имеющиеся данные — НИ ОДНОГО чтения сети здесь нет:
//   своя визитка  → хранилище навыков на телефоне (уровни и доля внутри уровня);
//   друг          → уровни из снимка «Вместе» (тот же ответ профилей друзей), запасной источник — документ визитки;
//   посторонний   → уровни из уже прочитанного документа визитки (сервер пишет их туда только при «Про»).
// Показывать или нет, решает одна функция — skillsBlockVisible; нет уровней → блока нет (нули не подставляем).
import { useEffect, useMemo, useSyncExternalStore } from 'react';

import { getFriendsTogetherSnapshot } from '../../app/friends_together/together_store';
import { skillProgressFromPoints } from '../../modules/skills/skill_levels';
import { SKILL_IDS, type SkillId } from '../../modules/skills/skill_points_table';
import { peekSkills, refreshSkills, subscribeSkills } from '../../modules/skills/skill_store';
import { skillLevelsFromTotals, skillsBlockVisible, type SkillLevels, type SkillViewer } from '../../modules/skills/skill_visibility';

const LOG = '[PROFILE-CARD]';

export type ProfileCardSkillsView = Readonly<{
  levels: SkillLevels;
  /** Доля внутри уровня — только у своей визитки; у чужих известны одни уровни. */
  ratios?: Readonly<Partial<Record<SkillId, number>>>;
}>;

type Input = Readonly<{
  isMe: boolean;
  targetUid: string;
  isFriend: boolean;
  /** У хозяина визитка «Про» — то же условие, что красит визитку в стиль. */
  ownerHasPro: boolean;
  /** Уровни из документа визитки (public_profiles), уже прочитанного для стиля и текста. */
  cardLevels: SkillLevels | null;
}>;

export function useProfileCardSkills({ isMe, targetUid, isFriend, ownerHasPro, cardLevels }: Input): ProfileCardSkillsView | null {
  const mine = useSyncExternalStore(subscribeSkills, peekSkills, peekSkills);

  useEffect(() => {
    if (!isMe) return;
    // зачем: первый кадр берёт память процесса; диск дочитывается фоном, блок появляется без спиннера
    refreshSkills().catch((error: unknown) => {
      console.warn(`${LOG} навыки: своё хранилище не прочиталось (${error instanceof Error ? error.message : String(error)}) — блока навыков не будет`); // guard-ok: catch называет причину
    });
  }, [isMe]);

  return useMemo(() => {
    const viewer: SkillViewer = isMe ? 'self' : isFriend ? 'friend' : 'stranger';
    if (isMe) {
      if (!mine) return null;
      const levels = skillLevelsFromTotals(mine.totals);
      if (!skillsBlockVisible({ viewer, ownerHasPro, levels })) return null;
      const ratios = Object.fromEntries(SKILL_IDS.map((id) => [id, skillProgressFromPoints(mine.totals[id]).ratio])) as Record<SkillId, number>;
      return { levels, ratios };
    }
    const friendLevels = isFriend && targetUid ? getFriendsTogetherSnapshot()?.pairs[targetUid]?.skills ?? null : null;
    const levels = friendLevels ?? cardLevels;
    return skillsBlockVisible({ viewer, ownerHasPro, levels }) && levels ? { levels } : null;
  }, [cardLevels, isFriend, isMe, mine, ownerHasPro, targetUid]);
}
