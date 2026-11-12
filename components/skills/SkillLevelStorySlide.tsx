/**
 * Кадр историй «навык поднялся на уровень» (D207). Макет docs/design/v2-app/elevate-skills.js, кадр sk-story:
 * «Живёт в историях, а не всплывает поверх урока. Нажатие листает на второй кадр» — событие `skill_level` пишется
 * двумя кадрами (frame: up / next), просмотрщик листает их нажатием.
 *
 * зачем: кадр рисует ФАКТ — уровни и звезду по текущим очкам навыка (закон празднования 01.09); очки уже начислены
 * и от показа не зависят. Очков ещё нет в памяти — берём с диска один раз; текущий уровень ниже записанного — кадра нет.
 */
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import type { StoryEvent } from '../../modules/story_events/story_events_core';
import { peekSkills, refreshSkills, subscribeSkills } from '../../modules/skills/skill_store';
import { skillLevelStoryFromFact } from '../../modules/skills/skill_level_up_story';
import { SKILL_IDS, type SkillId } from '../../modules/skills/skill_points_table';
import type { SkillTotals } from '../../modules/skills/skill_levels';
import SkillLevelUpStory from './SkillLevelUpStory';

const LOG = '[SKILL-LEVEL-STORY]';
const noop = (): void => undefined;

/**
 * Куда ведёт «Тренировать <навык>» (макет: «Тренировать словарь»). Ночное умолчание 12.11, владельцу на утро:
 * раздел, от которого навык растёт (SKILL_SOURCE). «Речь» — экран навыков (своего входа в устные режимы нет); «Социальный» не тренируется.
 */
const TRAIN_ROUTE: Readonly<Partial<Record<SkillId, string>>> = {
  listening: '/(tabs)/video',
  speech: '/skills',
  vocab: '/flashcards',
  grammar: '/(tabs)/lessons',
  speed: '/game_flow',
};

function isSkillId(value: unknown): value is SkillId {
  return typeof value === 'string' && (SKILL_IDS as readonly string[]).includes(value);
}

function SkillLevelStorySlide({ event, onCloseViewer }: Readonly<{ event: StoryEvent; onCloseViewer?: (source: string) => void }>) {
  const router = useRouter();
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

  const route = isSkillId(p.skill) ? TRAIN_ROUTE[p.skill] : undefined;
  const onTrain = useCallback(() => {
    if (!route) return;
    // зачем: просмотр историй — Modal; не закрыть его — раздел откроется под ним (как у кнопки «Plus» в историях)
    onCloseViewer?.('cta_skill_train');
    router.push(route as never);
  }, [onCloseViewer, route, router]);

  if (!story) return <View style={s.fill} />;
  return (
    <View style={s.fill}>
      <SkillLevelUpStory story={story} onClose={noop} onTrain={route ? onTrain : undefined} embedded={frame} testID={`skill-level-story-${frame}`} />
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, alignSelf: 'stretch' },
});

export default memo(SkillLevelStorySlide);
