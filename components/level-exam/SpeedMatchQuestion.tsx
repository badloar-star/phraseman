import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import type { LevelExamSpeedMatchTask } from '../../app/level_exam_types';
import { useTheme } from '../ThemeContext';
import { useLang } from '../LangContext';
import { triLang } from '../../constants/i18n';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { ExamOption, type ExamOptionState } from './ExamGlassParts';

type Props = {
  task: LevelExamSpeedMatchTask;
  matches: Readonly<Record<string, string>>;
  onChange: (matches: Record<string, string>) => void;
};

export default function SpeedMatchQuestion({ task, matches, onChange }: Props) {
  const { lang } = useLang();
  const { theme: t, ds, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const optionColors = { okColor: t.correct, okBg: t.correctBg, noColor: t.wrong, noBg: t.wrongBg } as const;
  const reduceMotion = useReducedMotion();
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const [wrongPair, setWrongPair] = useState<{ sourceId: string; targetId: string } | null>(null);
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (wrongTimer.current) clearTimeout(wrongTimer.current); }, []);
  const matchedTargets = useMemo(() => new Set(
    Object.entries(matches)
      .filter(([sourceId, targetId]) => sourceId === targetId)
      .map(([, targetId]) => targetId),
  ), [matches]);
  const sourcePairs = useMemo(() => (
    task.pairs.length > 1 ? [...task.pairs.slice(1), task.pairs[0]] : [...task.pairs]
  ), [task.pairs]);
  const chooseTarget = (targetId: string) => {
    if (!activeSourceId) return;
    if (activeSourceId !== targetId) {
      const failed = { sourceId: activeSourceId, targetId };
      setWrongPair(failed);
      if (wrongTimer.current) clearTimeout(wrongTimer.current);
      wrongTimer.current = setTimeout(() => setWrongPair(null), reduceMotion ? 0 : 240);
      const next = { ...matches };
      next[activeSourceId] = targetId;
      onChange(next);
      setActiveSourceId(null);
      return;
    }
    const next = { ...matches };
    next[activeSourceId] = targetId;
    onChange(next);
    setActiveSourceId(null);
  };

  // зачем (LANG_AUDIT_CORE_R1): подпись для диктора была английской на любом языке
  return (
    <View accessibilityLabel={triLang(lang, { ru: 'Найди пары на скорость', uk: 'Знайди пари на швидкість', en: 'Speed match', es: 'Parejas rápidas', 'pt-BR': 'Pares rápidos', vi: 'Nối cặp nhanh', id: 'Cocokkan cepat', tr: 'Hızlı eşleştir', pl: 'Szybkie pary' })} style={[styles.board, { gap: ds.spacing.md }]}> 
      <View style={[styles.column, { gap: ds.spacing.sm }]}> 
        {sourcePairs.map((pair) => {
          const active = activeSourceId === pair.scoreUnitId;
          const answered = Object.prototype.hasOwnProperty.call(matches, pair.scoreUnitId);
          const matched = matches[pair.scoreUnitId] === pair.scoreUnitId;
          return (
            <Animated.View key={pair.scoreUnitId} entering={reduceMotion ? undefined : FadeInDown.delay(sourcePairs.indexOf(pair) * 40).duration(260)}>
              <ExamOption
                glass={glass}
                {...optionColors}
                label={pair.target}
                state={((): ExamOptionState => (
                  wrongPair?.sourceId === pair.scoreUnitId ? 'no' : matched ? 'ok' : answered ? 'no' : active ? 'pressed' : 'idle'
                ))()}
                disabled={answered}
                onPress={() => setActiveSourceId(pair.scoreUnitId)}
                accessibilityLabel={pair.target}
              />
            </Animated.View>
          );
        })}
      </View>
      <View style={[styles.column, { gap: ds.spacing.sm }]}> 
        {task.pairs.map((pair, index) => {
          const matched = matchedTargets.has(pair.scoreUnitId);
          return (
            <Animated.View key={pair.scoreUnitId} entering={reduceMotion ? undefined : FadeInDown.delay(index * 40).duration(260)}>
              <ExamOption
                glass={glass}
                {...optionColors}
                label={pair.source}
                state={wrongPair?.targetId === pair.scoreUnitId ? 'no' : matched ? 'ok' : 'idle'}
                onPress={() => chooseTarget(pair.scoreUnitId)}
                disabled={!activeSourceId || matched}
                accessibilityLabel={pair.source}
              />
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  board: { flexDirection: 'row', alignItems: 'stretch' },
  column: { flex: 1 },
});
