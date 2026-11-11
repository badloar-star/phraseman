import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { triLang, type Lang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import {
  buildBreakdownSentence,
  splitQuotedText,
  type MistakeBreakdown,
} from '../app/mistake_breakdown_model';
import { useTheme } from './ThemeContext';

type Props = {
  lang: Lang;
  breakdown: MistakeBreakdown;
  userAnswer?: string | null;
  targetAnswer?: string | null;
};

/**
 * Разбор ошибки «по полям» внутри AiMistakeCard.
 *
 * зачем (владелец 11.11, аудит разбора → «Да, делай карточку»): прежняя раскладка зачёркивала ответ целиком,
 * печатала правильную фразу дважды и показывала пояснение сплошным абзацем. Здесь промах виден ОДНИМ словом
 * прямо во фразе (было → стало), правило стоит отдельной строкой, слова изучаемого языка выделены цветом.
 * Обводок нет: блоки разделены тоном подложки (стиль «Тень»), как в соседней LearningSemanticGroup.
 */
export default function MistakeBreakdownView({ lang, breakdown, userAnswer, targetAnswer }: Props) {
  const { theme: t, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const user = String(userAnswer ?? '').trim();
  const target = String(targetAnswer ?? '').trim();
  const noMistake = breakdown.verdict === 'no_mistake';
  const segments = React.useMemo(
    () => buildBreakdownSentence({ userAnswer: user, targetAnswer: target, breakdown }),
    [user, target, breakdown],
  );

  // Цвет слова в пояснении: «не то» — тоном ошибки, «нужно» — тоном верного, остальные слова курса — акцентом.
  const quotedColor = (word: string): string => {
    const folded = word.trim().toLowerCase();
    if (!noMistake && breakdown.wrong && folded === breakdown.wrong.toLowerCase()) return t.wrong;
    if (!noMistake && breakdown.right && folded === breakdown.right.toLowerCase()) return t.correct;
    return t.accentText;
  };
  const renderQuoted = (value: string) => splitQuotedText(value).map((part, index) => (
    part.quoted
      ? <Text key={`q${index}:${part.text}`} style={[styles.quoted, { color: quotedColor(part.text) }]}>{part.text}</Text>
      : <Text key={`p${index}:${part.text}`}>{part.text}</Text>
  ));

  return (
    <View testID="mistake-breakdown" style={styles.root}>
      <View style={[styles.sentenceSurface, { backgroundColor: glass.opaqueControl }]}>
        {segments.length > 0 ? (
          <Text testID="mistake-breakdown-sentence" style={[styles.sentence, { color: glass.text }]}>
            {segments.map((segment, index) => {
              if (segment.tone === 'wrong') {
                return (
                  <Text key={`w${index}:${segment.text}`} style={[styles.wrongWord, { color: t.wrong, backgroundColor: t.wrongBg }]}>
                    {segment.text}
                  </Text>
                );
              }
              if (segment.tone === 'right') {
                return (
                  <Text key={`r${index}:${segment.text}`} style={[styles.rightWord, { color: t.correct, backgroundColor: t.correctBg }]}>
                    {segment.text}
                  </Text>
                );
              }
              return <Text key={`s${index}:${segment.text}`}>{segment.text}</Text>;
            })}
          </Text>
        ) : noMistake ? (
          // «Ошибки нет»: ответ ученика НЕ зачёркиваем — показываем фразу как верную.
          <View testID="mistake-breakdown-correct" style={styles.correctRow}>
            <Ionicons name="checkmark-circle" size={20} color={t.correct} style={styles.correctIcon} />
            <Text style={[styles.sentence, styles.correctText, { color: glass.text }]}>{user || target}</Text>
          </View>
        ) : (
          // Сервер не смог указать слово (или его нет во фразе): две фразы целиком, без выдуманной подсветки.
          <View testID="mistake-breakdown-plain" style={styles.plainPair}>
            {user ? (
              <Text style={[styles.plainUser, { color: glass.secondary }]}>{user}</Text>
            ) : null}
            {target ? (
              <Text style={[styles.sentence, { color: glass.text }]}>{target}</Text>
            ) : null}
          </View>
        )}
      </View>

      <View style={styles.explain}>
        {breakdown.rule ? (
          <Text
            testID="mistake-breakdown-rule"
            style={[styles.rule, { color: noMistake ? t.correct : t.textPrimary }]}
          >
            {renderQuoted(breakdown.rule)}
          </Text>
        ) : null}
        <Text testID="mistake-breakdown-why" style={[styles.why, { color: glass.text }]}>
          {renderQuoted(breakdown.why)}
        </Text>
        {breakdown.youSaid ? (
          <Text testID="mistake-breakdown-you-said" style={[styles.aside, { color: glass.secondary }]}>
            {youSaidLabel(lang)}
            <Text style={[styles.asideStrong, { color: glass.text }]}>{breakdown.youSaid}</Text>
          </Text>
        ) : null}
      </View>

      {breakdown.pair.length === 2 ? (
        <View testID="mistake-breakdown-pair" style={styles.pair}>
          {breakdown.pair.map((example, index) => (
            <View key={`e${index}:${example}`} style={styles.pairRow}>
              <View style={[styles.pairDot, { backgroundColor: glass.secondary }]} />
              <Text style={[styles.pairText, { color: glass.text }]}>{example}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {breakdown.also.length > 0 ? (
        <Text testID="mistake-breakdown-also" style={[styles.aside, { color: glass.secondary }]}>
          {alsoLabel(lang)}
          {breakdown.also.map((swap, index) => (
            <Text key={`a${index}:${swap.wrong}:${swap.right}`}>
              {index > 0 ? ', ' : ''}
              {swap.wrong ? <Text style={{ color: t.wrong, textDecorationLine: 'line-through' }}>{swap.wrong}</Text> : null}
              {swap.wrong && swap.right ? ' → ' : ''}
              {swap.right ? <Text style={[styles.asideStrong, { color: t.correct }]}>{swap.right}</Text> : null}
            </Text>
          ))}
        </Text>
      ) : null}
    </View>
  );
}

function youSaidLabel(lang: Lang): string {
  return triLang(lang, {
    ru: 'У тебя получилось: ',
    uk: 'У тебе вийшло: ',
    en: 'Your version says: ',
    es: 'Tu versión dice: ',
    'pt-BR': 'Sua versão diz: ',
    vi: 'Câu của bạn nghĩa là: ',
    id: 'Versimu berarti: ',
    tr: 'Senin cümlen şunu diyor: ',
    pl: 'Twoja wersja znaczy: ',
  });
}

function alsoLabel(lang: Lang): string {
  return triLang(lang, {
    ru: 'Ещё: ',
    uk: 'Ще: ',
    en: 'Also: ',
    es: 'Además: ',
    'pt-BR': 'Também: ',
    vi: 'Ngoài ra: ',
    id: 'Juga: ',
    tr: 'Ayrıca: ',
    pl: 'Także: ',
  });
}

const styles = StyleSheet.create({
  root: { alignSelf: 'stretch', gap: 12, width: '100%' },
  // Та же подложка и скругление, что у LearningSemanticGroup: карточка не меняет «семью» поверхностей.
  sentenceSurface: { alignSelf: 'stretch', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14 },
  // 18/28: фраза — главный объект карточки; высокий интерлиньяж оставляет воздух плашкам слов при переносе.
  sentence: { fontSize: 18, fontWeight: '700', lineHeight: 28 },
  wrongWord: { fontWeight: '700', textDecorationLine: 'line-through' },
  rightWord: { fontWeight: '800' },
  correctRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 8 },
  correctIcon: { marginTop: 4 },
  correctText: { flex: 1, minWidth: 0 },
  plainPair: { gap: 4 },
  plainUser: { fontSize: 16, fontWeight: '500', lineHeight: 23 },
  explain: { gap: 4, paddingHorizontal: 2 },
  rule: { fontSize: 17, fontWeight: '800', lineHeight: 24 },
  // 16/23 — тот же кегль пояснения, что был в строке «Почему».
  why: { fontSize: 16, fontWeight: '500', lineHeight: 23 },
  quoted: { fontWeight: '800' },
  aside: { fontSize: 15, fontWeight: '500', lineHeight: 22, paddingHorizontal: 2 },
  asideStrong: { fontWeight: '700' },
  pair: { gap: 4, paddingHorizontal: 2 },
  pairRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 10 },
  pairDot: { borderRadius: 3, height: 6, marginTop: 9, opacity: 0.6, width: 6 },
  pairText: { flex: 1, fontSize: 16, fontWeight: '600', lineHeight: 23, minWidth: 0 },
});
