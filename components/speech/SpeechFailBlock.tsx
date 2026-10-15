// SpeechFailBlock.tsx — блок результата речи «не засчитано» (эталон Макетов speech-result-states.html, 91eee157a): плашка «Сказано» с фразой целиком, пропущенные слова — мягкий красный тон,
// под плашкой одна строка «Не услышали слово «X» — скажи фразу целиком».
//
// зачем (координатор 15.10, строгая проверка речи — владелец): один и тот же блок в уроке, курсе V2 и Карточках «Устно» — человек сразу видит, что повторить. Кнопки «Ещё раз» и «Пропустить»
// остаются у хоста (у каждого экрана свой переход), блок рисует только плашку и строку. Стиль «Тень»: без обводок, тень и тон; цвета — токены темы (`bad`/`badSoft`, `opaqueCard`, `text`, `secondary`).
// Слова идут строками с переносом: у пропущенного слова своя плашка (радиус 7, поля 1×5) — инлайн-текст RN так не скруглить.
import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { buildSpeechFailView, speechFailLineParts, speechFailLineText, speechFailDisplayWord } from '../../app/speech_fail_view';
import type { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { plateBoxShadow } from '../v2/ShadowSurface';

type GlassTokens = ReturnType<typeof liquidGlassTokens>;

export type SpeechFailBlockProps = Readonly<{
  /** Целевая фраза целиком — как показываем и сравниваем. */
  targetText: string;
  /** Пропущенные слова из оценщика (`missingWords`): нормализованные слова цели. */
  missingWords: readonly string[] | null | undefined;
  lang: string;
  glass: GlassTokens;
  /** Подпись плашки («Сказано»); хост берёт готовую строку своего экрана. */
  kicker: string;
  /** Множитель системного размера текста (у хостов он уже есть); по умолчанию 1. */
  textScale?: number;
  testID?: string;
}>;

function SpeechFailBlock({ targetText, missingWords, lang, glass, kicker, textScale = 1, testID = 'speech-fail-block' }: SpeechFailBlockProps) {
  const view = useMemo(() => buildSpeechFailView(targetText, missingWords), [targetText, missingWords]);
  // зачем: пропущенных нет (оценщик не назвал слово — например, провал по порогу или порядку слов): плашка с фразой и общая строка не нужны, хост покажет прежний вид
  if (view.missedCount === 0 || view.firstMissed === null) return null;
  const [before, word, after] = speechFailLineParts(lang, view.firstMissed);
  const phrase: number = 22 * textScale;
  const phraseLine: number = 32 * textScale;
  return (
    <View testID={testID} style={styles.root} accessible accessibilityRole="alert" accessibilityLiveRegion="polite"
      accessibilityLabel={`${kicker}: ${view.tokens.map((t) => t.text).join(' ')}. ${speechFailLineText(lang, view.firstMissed)}`}>
      <View style={[styles.plate, { backgroundColor: glass.opaqueCard, boxShadow: plateBoxShadow(glass) }]}>
        {/* guard-ok: капитель плашки «Сказано» по эталону 2.0 (короткая подпись разрешена владельцем 24.09), не расшифровка под названием */}
        <Text style={[styles.kicker, { color: glass.secondary, fontSize: 13 * textScale, lineHeight: 17 * textScale }]}>{kicker}</Text>
        <View style={styles.words} testID={`${testID}-phrase`}>
          {view.tokens.map((token, i) => (
            token.missed ? (
              <View key={`w-${i}`} testID={`${testID}-missed`} style={[styles.missChip, { backgroundColor: glass.badSoft }]}>
                <Text style={{ color: glass.bad, fontSize: phrase, lineHeight: phraseLine, fontWeight: '600' }}>{token.text}</Text>
              </View>
            ) : (
              <Text key={`w-${i}`} style={{ color: glass.text, fontSize: phrase, lineHeight: phraseLine, fontWeight: '600' }}>{token.text}</Text>
            )
          ))}
        </View>
      </View>
      <Text style={[styles.line, { color: glass.secondary, fontSize: 16 * textScale, lineHeight: 22 * textScale }]} testID={`${testID}-line`}>
        {before}
        <Text style={{ color: glass.text, fontWeight: '700' }}>{speechFailDisplayWord(word)}</Text>
        {after}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignSelf: 'stretch' },
  // макет `.said`: радиус 20, поля 16/18, без обводки (тень и тон)
  plate: { borderRadius: 20, paddingVertical: 16, paddingHorizontal: 18 },
  // макет `.said .k`: капитель с разрядкой 2,5 (кегль 13 по D145: меньше 13 нельзя)
  kicker: { fontWeight: '700', letterSpacing: 2.5, textTransform: 'uppercase' },
  // макет `.said .v`: фраза 22/32, начертание 600; слова в строке через зазор пробела
  words: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 6, marginTop: 8 },
  // макет `.w`: плашка слова — радиус 7, поля 1×5
  missChip: { borderRadius: 7, paddingHorizontal: 5, paddingVertical: 1 },
  // макет `.line`: 16/22, по центру, 14 от плашки
  line: { marginTop: 14, fontWeight: '500', textAlign: 'center' },
});

export default memo(SpeechFailBlock);
