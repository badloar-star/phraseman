import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { Theme } from '../constants/theme';
import { useTheme } from './ThemeContext';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import {
  semanticToneAccent,
  type SemanticExplanationBlock,
  type SemanticExplanationTone,
} from '../app/explanation_presentation';

type Props = {
  block: SemanticExplanationBlock;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function semanticBlockColor(t: Theme, tone: SemanticExplanationTone): string {
  const key = semanticToneAccent(tone);
  return t[key];
}

export function semanticBlockFill(t: Theme, tone: SemanticExplanationTone): string {
  if (tone === 'wrong') return t.wrongBg;
  if (tone === 'correct') return t.correctBg;
  const color = semanticBlockColor(t, tone);
  return withAlpha(color, tone === 'memory' ? 0.16 : 0.13);
}

function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#') && (color.length === 7 || color.length === 4)) {
    const normalized = color.length === 4
      ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
      : color;
    const suffix = Math.round(alpha * 255).toString(16).padStart(2, '0').toUpperCase();
    return `${normalized}${suffix}`;
  }
  if (color.startsWith('rgb(')) {
    return color.replace(/^rgb\((.*)\)$/i, `rgba($1, ${alpha})`);
  }
  return color;
}

export default function LearningSemanticBlock({ block, compact, style }: Props) {
  const { theme: t, f } = useTheme();
  const accent = semanticBlockColor(t, block.tone);

  return (
    <View
      testID={`semantic-explanation-block-${block.tone}`}
      style={[
        styles.card,
        {
          backgroundColor: semanticBlockFill(t, block.tone),
          paddingHorizontal: compact ? 10 : 12,
          paddingVertical: compact ? 9 : 11,
        },
        style,
      ]}
    >
      <View pointerEvents="none" style={[styles.stripe, { backgroundColor: accent }]} />
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: withAlpha(accent, 0.18) }]}>
          <Ionicons name={block.icon} size={compact ? 14 : 15} color={accent} />
        </View>
        <Text style={[styles.title, { color: accent, fontSize: compact ? f.sub : f.label }]}>
          {block.title}
        </Text>
      </View>
      <Text
        style={[
          styles.text,
          {
            color: t.textPrimary,
            fontSize: compact ? f.sub : f.body,
            lineHeight: (compact ? f.sub : f.body) * 1.42,
            fontWeight: block.emphasizeText ? '800' : '500',
          },
        ]}
      >
        {block.text}
      </Text>
    </View>
  );
}

// зачем (redesign-round-2 «Разбор промаха» вариант A, владелец 04.10): вместо стопки цветных плиток — одна
// спокойная карточка r12 с тонкими разделителями; заголовки «Твой выбор / Почему / Правильно» мелким капсом
// в цвете тона, без заливок и полос; «Твой выбор» зачёркнут. Блок «Запомни» (tone memory) в макете удалён.
export function LearningSemanticGroup({ blocks, testID }: { blocks: readonly SemanticExplanationBlock[]; testID?: string }) {
  const { theme: t, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const rows = blocks.filter((block) => block.tone !== 'memory');
  if (rows.length === 0) return null;
  return (
    <View testID={testID} style={[groupStyles.card, { backgroundColor: glass.opaqueControl }]}>
      {rows.map((block, index) => {
        const accent = semanticBlockColor(t, block.tone);
        return (
          <React.Fragment key={`${block.tone}-${index}`}>
            {index > 0 ? <View style={[groupStyles.divider, { backgroundColor: glass.line }]} /> : null}
            <View testID={`semantic-explanation-block-${block.tone}`} style={groupStyles.row}>
              <View style={groupStyles.head}>
                <Ionicons name={GROUP_ICON[block.tone]} size={15} color={accent} />
                <Text style={[groupStyles.title, { color: accent }]}>{block.title}</Text>
              </View>
              <Text
                style={[
                  groupStyles.text,
                  {
                    color: block.tone === 'wrong' ? glass.secondary : glass.text,
                    fontWeight: block.emphasizeText || block.tone !== 'insight' ? '800' : '500',
                    textDecorationLine: block.tone === 'wrong' ? 'line-through' : 'none',
                  },
                ]}
              >
                {block.text}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const GROUP_ICON: Record<SemanticExplanationTone, React.ComponentProps<typeof Ionicons>['name']> = {
  wrong: 'flag-outline',
  insight: 'bulb-outline',
  memory: 'bookmark-outline',
  correct: 'checkmark',
};

const groupStyles = StyleSheet.create({
  card: { alignSelf: 'stretch', borderRadius: 12, overflow: 'hidden' },
  row: { paddingVertical: 12, paddingHorizontal: 14, gap: 5 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  // `12/900` капсом с разрядкой .5 — шкала D145: 13.
  title: { flex: 1, minWidth: 0, fontSize: 13, lineHeight: 16, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
  // `16/23`
  text: { fontSize: 16, lineHeight: 23 },
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 0,
    gap: 7,
    overflow: 'hidden',
    position: 'relative',
  },
  stripe: {
    bottom: 0,
    left: 0,
    opacity: 0.92,
    position: 'absolute',
    top: 0,
    width: 4,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    paddingLeft: 8,
  },
  icon: {
    alignItems: 'center',
    borderRadius: 7,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  title: {
    flex: 1,
    fontWeight: '900',
    letterSpacing: 0,
    minWidth: 0,
    flexWrap: 'wrap',
    textTransform: 'uppercase',
  },
  text: {
    paddingLeft: 8,
  },
});
