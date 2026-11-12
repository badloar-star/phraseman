/**
 * Кадр историй «навык поднялся на уровень» (D207). Макет docs/design/v2-app/elevate-skills.js, кадр sk-story:
 * «Живёт в историях, а не всплывает поверх урока. Нажатие листает на второй кадр» — событие `skill_level` пишется
 * двумя кадрами (frame: up / next), просмотрщик листает их нажатием.
 *
 * зачем: кадр рисует ФАКТ — уровни и звезду по текущим очкам навыка (закон празднования 01.09); очки уже начислены
 * и от показа не зависят. Очков ещё нет в памяти — берём с диска один раз; текущий уровень ниже записанного — кадра нет.
 */
import React, { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StoryEvent } from '../../modules/story_events/story_events_core';
import { peekSkills, refreshSkills, subscribeSkills } from '../../modules/skills/skill_store';
import { skillLevelStoryFromFact } from '../../modules/skills/skill_level_up_story';
import { SKILL_IDS, type SkillId } from '../../modules/skills/skill_points_table';
import type { SkillTotals } from '../../modules/skills/skill_levels';
import SkillLevelUpStory from './SkillLevelUpStory';

const LOG = '[SKILL-LEVEL-STORY]';
const noop = (): void => undefined;

function isSkillId(value: unknown): value is SkillId {
  return typeof value === 'string' && (SKILL_IDS as readonly string[]).includes(value);
}

function SkillLevelStorySlide({ event }: Readonly<{ event: StoryEvent }>) {
  const [totals, setTotals] = useState<SkillTotals | null>(() => peekSkills()?.totals ?? null);

  useEffect(() => {
    const off = subscribeSkills((state) => setTotals(state?.totals ?? null));
    if (!peekSkills()) {
      refreshSkills().catch((error: unknown) => {
        console.warn(`${LOG} refresh:failed ${error instanceof Error ? error.message : String(error)}`); // guard-ok: catch называет причину
      });
    }
    return off;
  }, []);

  const p = event.payload;
  const frame = p.frame === 'next' ? 'next' : 'up';
  const story = useMemo(() => {
    if (!isSkillId(p.skill) || !totals) return null;
    return skillLevelStoryFromFact(p.skill, Number(p.fromLevel), Number(p.toLevel), frame, totals);
  }, [frame, p.fromLevel, p.skill, p.toLevel, totals]);

  useEffect(() => {
    if (story || !totals) return;
    console.warn(`${LOG} no_frame ${JSON.stringify({ skill: p.skill, from: p.fromLevel, to: p.toLevel, frame })}`); // guard-ok: ранний выход называет причину
  }, [frame, p.fromLevel, p.skill, p.toLevel, story, totals]);

  if (!story) return <View style={s.fill} />;
  return (
    <View style={s.fill}>
      <SkillLevelUpStory story={story} onClose={noop} embedded={frame} testID={`skill-level-story-${frame}`} />
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, alignSelf: 'stretch' },
});

export default memo(SkillLevelStorySlide);
