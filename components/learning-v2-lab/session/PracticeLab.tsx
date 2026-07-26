// зачем: RN-порт source/src/session/PracticeLab.tsx — дом «Моей практики».
// Тот же визуальный язык, что у тропы: три больших тактильных блока с иконкой
// и крупным значением, минимум текста и ОДНА главная кнопка «Продолжить тропу».
// «Повторить сегодня» и «Работа над ошибками» запускают сессию разбора ошибок
// (те же движки, но карточки помечены бейджем «Разбираем ошибку»);
// челлендж закрыт по фикстуре.
import React, { memo, useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import TapScale from '../../TapScale';
import { GraphemeText } from '../kimi/primitives';
import { C, LEADING, RADIUS, SPACE, TEXT, TOUCH_MIN, WEIGHT } from '../kimi/tokens';
import type { PracticeHomeVM } from './contracts';
import { mistakeLabFixture, practiceHomeFixture } from './fixtures';
import { SessionRunner } from './SessionRunner';

export interface PracticeLabProps {
  readonly onExit: () => void;
  readonly bottomPadding?: number;
}

export const PracticeLab = memo(function PracticeLab({ onExit, bottomPadding = 0 }: PracticeLabProps) {
  const [stage, setStage] = useState<'home' | 'session'>('home');

  // зачем: выход из разбора ошибок возвращает в дом практики, а не сразу на
  // карту — иначе ученик теряет место, где только что работал.
  const handleSessionExit = useCallback(() => setStage('home'), []);

  if (stage === 'session') {
    return <SessionRunner session={mistakeLabFixture} onExit={handleSessionExit} showErrorChips />;
  }

  return (
    <PracticeHome
      vm={practiceHomeFixture}
      bottomPadding={bottomPadding}
      onStart={() => setStage('session')}
      onContinuePath={onExit}
    />
  );
});

const PracticeHome = memo(function PracticeHome(props: {
  readonly vm: PracticeHomeVM;
  readonly bottomPadding: number;
  readonly onStart: (blockId: string) => void;
  readonly onContinuePath: () => void;
}) {
  const { vm, bottomPadding, onStart, onContinuePath } = props;

  return (
    <View style={s.root}>
      <ScrollView
        // guard-ok: ровно три блока, фиксировано фикстурой — виртуализация дороже
        contentContainerStyle={[s.body, { paddingBottom: bottomPadding + SPACE.s6 }]}
        showsVerticalScrollIndicator={false}
        testID="v2-practice-home"
      >
        <View style={s.hero}>
          <Text style={s.kicker}>Моя практика</Text>
          <GraphemeText text={vm.title} maxGraphemes={40} style={s.title} />
        </View>

        <View style={s.blocks}>
          {vm.blocks.map((block) => {
            const locked = block.state === 'locked';
            return (
              <TapScale
                key={block.id}
                onPress={() => {
                  if (locked) return;
                  onStart(block.id);
                }}
                disabled={locked}
                withHaptic
                scaleTo={0.97}
                accessibilityLabel={
                  locked
                    ? `${block.title} — ${block.lockNote ?? 'закрыто'}`
                    : `${block.title}. ${block.countDisplay}`
                }
                accessibilityState={{ disabled: locked }}
                style={[s.block, locked ? s.blockLocked : null]}
                testID={`v2-practice-block-${block.id}`}
              >
                <View style={[s.blockIcon, locked ? s.blockIconLocked : null]}>
                  <Text style={s.blockGlyph}>
                    {locked ? '🔒' : block.icon === 'review' ? '↻' : block.icon === 'target' ? '🎯' : '🏆'}
                  </Text>
                </View>
                <View style={s.blockTexts}>
                  <GraphemeText
                    text={locked && block.lockNote ? block.lockNote : block.countDisplay}
                    maxGraphemes={40}
                    style={[s.blockCount, locked ? s.blockCountLocked : null]}
                  />
                  <GraphemeText text={block.title} maxGraphemes={30} style={s.blockTitle} />
                </View>
              </TapScale>
            );
          })}
        </View>
      </ScrollView>

      <View style={s.dock}>
        <TapScale
          onPress={onContinuePath}
          withHaptic
          scaleTo={0.97}
          accessibilityLabel={vm.continueLabel}
          style={s.cta}
          testID="v2-practice-continue"
        >
          <Text style={s.ctaText}>{vm.continueLabel}</Text>
        </TapScale>
      </View>
    </View>
  );
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bgCanvas },
  body: { padding: SPACE.s5, gap: SPACE.s5 },
  hero: { gap: SPACE.s2 },
  kicker: {
    fontSize: TEXT.xs,
    fontWeight: WEIGHT.bold,
    color: C.fgSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: TEXT.xxl,
    fontWeight: WEIGHT.bold,
    color: C.fgPrimary,
    lineHeight: TEXT.xxl * LEADING.tight,
  },
  blocks: { gap: SPACE.s3 },
  block: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s4,
    minHeight: 96,
    paddingVertical: SPACE.s4,
    paddingHorizontal: SPACE.s4,
    borderRadius: RADIUS.xl,
    backgroundColor: C.bgSurface,
  },
  blockLocked: { opacity: 0.55 },
  blockIcon: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.pill,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockIconLocked: { backgroundColor: C.bgSubtle },
  blockGlyph: { fontSize: 26 },
  blockTexts: { flex: 1, gap: 2 },
  blockCount: { fontSize: TEXT.xl, fontWeight: WEIGHT.bold, color: C.fgPrimary },
  blockCountLocked: { fontSize: TEXT.md, color: C.fgSecondary },
  blockTitle: { fontSize: TEXT.md, color: C.fgSecondary },
  dock: {
    paddingHorizontal: SPACE.s4,
    paddingTop: SPACE.s3,
    paddingBottom: SPACE.s5,
    backgroundColor: C.bgSurface,
  },
  cta: {
    minHeight: TOUCH_MIN + 8,
    borderRadius: RADIUS.lg,
    backgroundColor: C.accentPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontSize: TEXT.lg, fontWeight: WEIGHT.bold, color: C.accentOnPrimary },
});
