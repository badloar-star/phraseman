// ═══════════════════════════════════════════════════════════════════════════
// PhraseWorkshopTheorySheet.tsx — шторка «Теория» поверх раунда «Мастерской фраз».
//
// зачем (владелец 25.10: «теория» в составе режима; вердикт Макетов, версия 4 «Мастерской фраз»): тап по «Теория» открывает шторку
// с вступлением того занятия, откуда пришла фраза: «Смысл / Схема / Ловушка» (1–3 страницы). Место в раунде не теряется.
//   • шторка — KitSheetModal (радиус 28, opaqueSheet, ручка, выезд 440 мс, перетаскивание вниз);
//   • в шапке в одном ряду пилюли страниц (выбранная — ctaFill/ctaFillInk, остальные — opaqueControl/text) и круглая «✕» 40;
//     одна страница — без пилюль; листание — свайпом и тапом по пилюле; внизу точки страниц;
//   • заголовок страницы 22/28 700, текст 16/25; роли как на вступлении занятия (IntroRoleText, цвета активной темы).
// Данные приходят снаружи (phraseWorkshopTheoryFor): шторка ничего не читает и не пишет.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { KitSheetModal } from '../../v2/KitSheetModal';
import PressableHybrid from '../../PressableHybrid';
import IntroRoleText from '../IntroRoleText';
import { lv2Alpha, useLv2Glass } from '../LearningV2Glass';
import type { PhraseWorkshopTheoryKind, PhraseWorkshopTheoryPage } from '../../../app/phrase_workshop_theory_v1';

const LOG = '[PHRASE-WORKSHOP]';

// ⚠ ЖДУТ УТВЕРЖДЕНИЯ ПЕРЕВОДЧИКА (10): подписи пилюль страниц — только ru/uk (теории на других языках нет)
const KIND_LABEL: Readonly<Record<PhraseWorkshopTheoryKind, Readonly<{ ru: string; uk: string }>>> = {
  concept: { ru: 'Смысл', uk: 'Сенс' },
  formula: { ru: 'Схема', uk: 'Схема' },
  trap: { ru: 'Ловушка', uk: 'Пастка' },
};
const CLOSE_LABEL = { ru: 'Закрыть', uk: 'Закрити' } as const;

type Props = Readonly<{
  visible: boolean;
  onClose: () => void;
  pages: readonly PhraseWorkshopTheoryPage[];
  lang: 'ru' | 'uk';
}>;

/** В тексте вступления английские слова обёрнуты в обратные кавычки (разметка автора) — для показа они не нужны, роли раскрасит разбор. */
const clean = (text: string): string => text.replace(/`/g, '');

function PhraseWorkshopTheorySheetBase({ visible, onClose, pages, lang }: Props) {
  const g = useLv2Glass();
  const scrollRef = useRef<ScrollView | null>(null);
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setIndex(0);
    scrollRef.current?.scrollTo({ x: 0, animated: false });
    console.log(`${LOG} theory:open`, JSON.stringify({ pages: pages.map((p) => p.kind) })); // guard-ok: одна строка на открытие шторки
  }, [visible, pages]);

  const onLayout = useCallback((event: LayoutChangeEvent) => setWidth(Math.round(event.nativeEvent.layout.width)), []);
  const goTo = useCallback((next: number) => {
    setIndex(next);
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
  }, [width]);
  const onMomentumEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width <= 0) return;
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    setIndex(Math.max(0, Math.min(pages.length - 1, next)));
  }, [pages.length, width]);

  const header = (
    <View style={styles.header}>
      <View style={styles.pills}>
        {/* guard-ok: страниц не больше трёх (Смысл / Схема / Ловушка), виртуализация не нужна */}
        {pages.length > 1 ? pages.map((page, i) => {
          const selected = i === index;
          return (
            <PressableHybrid
              key={page.pageId || `${page.kind}-${i}`}
              variant="chip"
              testID={`phrase-workshop-theory-pill-${page.kind}`}
              accessibilityRole="button"
              accessibilityLabel={KIND_LABEL[page.kind][lang]}
              accessibilityState={{ selected }}
              onPress={() => goTo(i)}
              style={[styles.pill, { backgroundColor: selected ? g.ctaFill : g.opaqueControl }]}
              contentStyle={styles.pillContent}
            >
              <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={[styles.pillText, { color: selected ? g.ctaFillInk : g.text }]}>{KIND_LABEL[page.kind][lang]}</Text>
            </PressableHybrid>
          );
        }) : null}
      </View>
      <PressableHybrid
        variant="icon"
        testID="phrase-workshop-theory-close"
        accessibilityRole="button"
        accessibilityLabel={CLOSE_LABEL[lang]}
        onPress={onClose}
        style={[styles.close, { backgroundColor: g.opaqueControl }]}
        contentStyle={styles.closeContent}
      >
        <Ionicons name="close" size={20} color={g.text} />
      </PressableHybrid>
    </View>
  );

  return (
    <KitSheetModal visible={visible} onRequestClose={onClose} closeLabel={CLOSE_LABEL[lang]} header={header} testID="phrase-workshop-theory-sheet">
      <View onLayout={onLayout} style={styles.pager}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={pages.length > 1}
          onMomentumScrollEnd={onMomentumEnd}
          keyboardShouldPersistTaps="handled"
        >
          {/* guard-ok: страниц не больше трёх, листание постраничное */}
          {pages.map((page, i) => (
            <View key={page.pageId || `${page.kind}-${i}`} style={{ width: width || undefined, minWidth: width || 1 }}>
              {page.title ? <Text maxFontSizeMultiplier={1.3} style={[styles.title, { color: g.text }]}>{clean(page.title)}</Text> : null}
              <Text maxFontSizeMultiplier={1.3} style={[styles.body, { color: g.text }]}>
                <IntroRoleText text={clean(page.body)} glass={g} />
              </Text>
            </View>
          ))}
        </ScrollView>
        {pages.length > 1 ? (
          <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no">
            {pages.map((page, i) => (
              <View key={page.pageId || `${page.kind}-${i}`} style={[styles.dot, { backgroundColor: i === index ? g.text : lv2Alpha(g.text, 0.28) }]} />
            ))}
          </View>
        ) : null}
      </View>
    </KitSheetModal>
  );
}

export const PhraseWorkshopTheorySheet = memo(PhraseWorkshopTheorySheetBase);

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 14 },
  pills: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: { borderRadius: 18, minHeight: 36, flexShrink: 1 },
  pillContent: { minHeight: 36, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  pillText: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  close: { width: 40, height: 40, borderRadius: 20 },
  closeContent: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  pager: { paddingHorizontal: 0 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700', paddingHorizontal: 18, marginBottom: 10 },
  body: { fontSize: 16, lineHeight: 25, paddingHorizontal: 18 },
  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 18 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
});
