import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Theme } from '../../constants/theme';
import type { CardItem, FlashcardContentLang } from './types';
import ReportErrorButton from '../../components/ReportErrorButton';

/** Прибирає дубль із заголовком секції «ДОСЛІВНО» (у JSON часто лишають «Дослівно: …»). */
function stripLiteralHeadingDuplicate(text: string, lang: FlashcardContentLang): string {
  let s = text.trim();
  s = s.replace(/^Literally\s*:\s*/i, '').trim();
  if (lang === 'uk') {
    s = s.replace(/^Дослівно\s*за\s*змістом\s*:\s*/i, '').trim();
    return s.replace(/^Дослівно\s*:\s*/i, '').trim();
  }
  if (lang === 'es') {
    s = s.replace(/^Traducción\s+literal\s*:\s*/i, '').trim();
    return s.replace(/^Literal\s*:\s*/i, '').trim();
  }
  return s.replace(/^Дословно\s*:\s*/i, '').trim();
}

/** Прибирає дубль заголовка секції контексту, якщо він потрапив у рядок даних. */
function stripUsageHeadingDuplicate(text: string, lang: FlashcardContentLang): string {
  let s = text.trim();
  if (lang === 'uk') {
    s = s.replace(/^Де\s+сказати\s*:\s*/i, '').trim();
  } else if (lang === 'es') {
    s = s.replace(/^Dónde\s+decirlo\s*:\s*/i, '').trim();
  } else {
    s = s.replace(/^Где\s+уместно\s*:\s*/i, '').trim();
  }
  return s;
}

type Props = {
  item: CardItem;
  lang: FlashcardContentLang;
  t: Theme;
  f: Record<string, number>;
};

const LITERAL_LABEL: Record<FlashcardContentLang, string> = { ru: 'Дословно', uk: 'Дослівно', es: 'Literal' };

/**
 * Розгорнуті деталі: дослівний переклад (поля literal*) — окрема секція з міткою; пояснення/контекст/нотатка — далі в блоці з рейкою.
 */
function FlashcardDetailsBodyImpl({ item, lang, t, f }: Props) {
  const literalText = useMemo(() => {
    const raw =
      lang === 'uk'
        ? item.literalUk
        : lang === 'es'
          ? item.literalEs ?? item.literalUk ?? item.literalRu
          : item.literalRu;
    if (!raw?.trim()) return null;
    const s = stripLiteralHeadingDuplicate(raw.trim(), lang);
    return s.length > 0 ? s : null;
  }, [item.literalRu, item.literalUk, item.literalEs, lang]);

  const bodyText = useMemo(() => {
    const parts: string[] = [];

    const explanationRaw =
      lang === 'uk'
        ? item.explanationUk
        : lang === 'es'
          ? item.explanationEs ?? item.explanationUk ?? item.explanationRu
          : item.explanationRu;
    if (explanationRaw?.trim()) {
      parts.push(stripLiteralHeadingDuplicate(explanationRaw.trim(), lang));
    }

    const usageRaw =
      lang === 'uk'
        ? item.usageNoteUk
        : lang === 'es'
          ? item.usageNoteEs ?? item.usageNoteUk ?? item.usageNoteRu
          : item.usageNoteRu;
    if (usageRaw?.trim()) {
      parts.push(stripUsageHeadingDuplicate(usageRaw.trim(), lang));
    }

    const desc = item.description?.trim() ?? '';
    if (desc) parts.push(desc);

    return parts.filter((p) => p.length > 0).join('\n\n');
  }, [
    item.description,
    item.explanationRu,
    item.explanationUk,
    item.explanationEs,
    item.usageNoteRu,
    item.usageNoteUk,
    item.usageNoteEs,
    lang,
  ]);

  const reportDataText = useMemo(() => {
    const bits: string[] = [`EN: ${item.en}`];
    if (literalText) bits.push(`${LITERAL_LABEL[lang]}: ${literalText}`);
    if (bodyText) bits.push(bodyText);
    return bits.join('\n\n');
  }, [item.en, literalText, bodyText, lang]);

  if (!literalText && !bodyText) return null;

  return (
    <View style={ss.body}>
      {literalText && (
        <View style={[ss.block, bodyText ? ss.blockWithLiteral : ss.blockLast]}>
          <Text
            maxFontSizeMultiplier={1.35}
            style={{
              color: t.textSecond,
              fontSize: f.sub,
              lineHeight: Math.round(f.sub * 1.35),
              fontWeight: '700',
              marginBottom: 6,
            }}
          >
            {LITERAL_LABEL[lang]}:
          </Text>
          <View style={[ss.blockRail, { borderLeftColor: `${t.accent}99` }]}>
            <Text
              maxFontSizeMultiplier={1.35}
              style={{
                color: t.textPrimary,
                fontSize: f.body,
                lineHeight: Math.round(f.body * 1.5),
                fontWeight: '500',
              }}
            >
              {literalText}
            </Text>
          </View>
        </View>
      )}
      {bodyText && (
        <View style={[ss.block, ss.blockLast, ss.descBlockWrap]}>
          <View style={[ss.blockRail, { borderLeftColor: `${t.textMuted}66` }]}>
            <Text
              maxFontSizeMultiplier={1.35}
              style={{
                color: t.textMuted,
                fontSize: f.body,
                lineHeight: Math.round(f.body * 1.5),
                fontStyle: 'italic',
              }}
            >
              {bodyText}
            </Text>
          </View>
          <ReportErrorButton
            variant="icon-flag"
            screen="flashcards"
            dataId={`flashcard_detail_${item.id}`}
            dataText={reportDataText}
            style={ss.flagCorner}
            accessibilityLabel={
              lang === 'uk'
                ? 'Повідомити про помилку в описі картки'
                : lang === 'es'
                  ? 'Informar de un error en la nota de la tarjeta'
                  : 'Сообщить об ошибке в описании карточки'
            }
          />
        </View>
      )}
    </View>
  );
}

const ss = StyleSheet.create({
  body: {
    backgroundColor: 'transparent',
    paddingBottom: 2,
  },
  block: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  blockWithLiteral: {
    paddingBottom: 4,
  },
  blockLast: {
    paddingBottom: 10,
  },
  descBlockWrap: {
    position: 'relative',
    paddingBottom: 36,
  },
  flagCorner: {
    position: 'absolute',
    right: 6,
    bottom: 6,
  },
  blockRail: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingTop: 2,
    paddingBottom: 2,
  },
});

export default React.memo(FlashcardDetailsBodyImpl);
