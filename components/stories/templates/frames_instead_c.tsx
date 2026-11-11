// ═══════════════════════════════════════════════════════════════════════════
// frames_instead_c.tsx — кадры 18–20 «истории вместо окон»: медаль урока, экзамен уровня открыт, экзамен Lingman открыт.
//
// зачем (владелец 11.11: «сделай макеты для медали и экзаменов» → «Да, в приложение»): три уведомления итога урока, у которых
// не было кадра. Разметка и задержки — из `render()` кадров макета docs/design/v2-app/stories-lesson-notifs.html построчно:
// медаль 148 появляется пружиной на 120 мс, строка над заголовком — 380, заголовок — 460 (у Lingman без строки — 380), подпись —
// 760 (у экзамена уровня — 800); конфетти один раз (18 штук с 600 мс) — только у золота и у экзамена Lingman.
// Слова — те же, что у уведомлений (components/lesson_moments/lesson_notif_copy.ts); картинки медалей — те же файлы, что на итоге урока.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import type { Lang } from '../../../constants/i18n';
import { cefrLevelLine, examOpenSub, lessonMedalSub, lessonMedalTitle, levelExamOpenTitle, lingmanExamOpenTitle, type LessonMedalStep } from '../../lesson_moments/lesson_notif_copy';
import { Art, Confetti, FrameRoot, H1, Ov, P } from './story_template_kit';
import { Enter } from './story_template_motion';
import { useStoryTemplatePalette } from './story_template_palette';
import { IconDisc } from './story_instead_parts';
import { insteadText } from './story_instead_strings';

/** Данные кадров — только то, что знало уведомление: урок, ступень медали, оценка (нужна тексту «Поделиться»), уровень. */
export type LessonMedalStory = Readonly<{ lessonNo: number; tier: LessonMedalStep; score: number }>;
export type LevelExamOpenStory = Readonly<{ cefrLevel: string; lessonNo: number; score: number }>;
export type LingmanExamOpenStory = Readonly<{ lessonNo: number; score: number }>;

type FrameProps<T> = Readonly<{ tpl: T; lang: Lang }>;

// картинки приложения подключаются через require, как на экране итога урока
const MEDAL_IMAGE: Readonly<Record<LessonMedalStep, number>> = {
  bronze: require('../../../assets/images/levels/bronza.webp'),
  silver: require('../../../assets/images/levels/serebro.webp'),
  gold: require('../../../assets/images/levels/zoloto.webp'),
};

// ── 18 · медаль урока (взамен уведомления о медали на итоге урока) ──────────────────────────────────

export const LessonMedalFrame = memo(function LessonMedalFrame({ tpl, lang }: FrameProps<LessonMedalStory>) {
  const pal = useStoryTemplatePalette();
  return (
    <FrameRoot testID="story-tpl-instead-medal" layer={tpl.tier === 'gold' ? <Confetti n={18} d0={600} /> : undefined}>
      <Art>
        <Enter kind="pop" d={120}>
          <View style={f.medalBox}>
            {/* зачем: в макете у картинки тень по контуру; в приложении — круглое свечение цвета темы за медалью (тень по контуру без шейдера не рисуется) */}
            <View style={[f.medalGlow, { boxShadow: `0 18px 34px ${pal.accGlow}` }]} />
            <Image source={MEDAL_IMAGE[tpl.tier]} style={f.medal} contentFit="contain" accessible={false} />
          </View>
        </Enter>
      </Art>
      <Ov text={insteadText(lang, 'lessonOverline', { lessonNo: tpl.lessonNo })} d={380} />
      <H1 text={lessonMedalTitle(tpl.tier, lang)} d0={460} />
      <P text={lessonMedalSub(lang)} d={760} />
    </FrameRoot>
  );
});

// ── 19 · экзамен уровня открыт (взамен уведомления «Экзамен уровня открыт») ─────────────────────────

export const LevelExamOpenFrame = memo(function LevelExamOpenFrame({ tpl, lang }: FrameProps<LevelExamOpenStory>) {
  return (
    <FrameRoot testID="story-tpl-instead-level-exam">
      <Art><IconDisc icon="school" /></Art>
      <Ov text={cefrLevelLine(tpl.cefrLevel, lang)} d={380} />
      <H1 text={levelExamOpenTitle(lang)} d0={460} />
      <P text={examOpenSub(lang)} d={800} />
    </FrameRoot>
  );
});

// ── 20 · экзамен Lingman открыт (взамен уведомления «Экзамен Lingman открыт») ───────────────────────

export const LingmanExamOpenFrame = memo(function LingmanExamOpenFrame({ lang }: FrameProps<LingmanExamOpenStory>) {
  return (
    <FrameRoot testID="story-tpl-instead-lingman-exam" layer={<Confetti n={18} d0={600} />}>
      <Art><IconDisc icon="ribbon" /></Art>
      <H1 text={lingmanExamOpenTitle(lang)} d0={380} />
      <P text={examOpenSub(lang)} d={760} />
    </FrameRoot>
  );
});

const f = StyleSheet.create({
  // .mdl: 148 × 148, картинка вписана целиком
  medalBox: { width: 148, height: 148, alignItems: 'center', justifyContent: 'center' },
  medal: { width: 148, height: 148 },
  medalGlow: { position: 'absolute', width: 96, height: 96, borderRadius: 48 },
});
