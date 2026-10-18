/**
 * Скелет каталога «Диалоги»: четыре карточки категорий той же геометрии, что настоящие (DialogueV2CatalogueSection, свёрнутая карточка `.card.c2`).
 *
 * зачем (E2, координатор 12.10; правила владельца «никаких спиннеров на весь экран», «раздел открывается мгновенно»): пока каталога нет (холодный вход без снимка, проекция не прошла),
 * хаб оставался пустым под шапкой и «прыгал», когда данные приходили. Скелет занимает те же места — плитка 55, строка названия, дробь, дорожка 7 — данные подставляются без смещения.
 * Цвета — тон текста активной темы (как у плиток настоящих карточек).
 */
import React, { memo } from 'react';
import { View } from 'react-native';

import SkeletonBlock from '../SkeletonShimmer';
import { dialogueGlassCardStyle, useDialogueGlass } from './glass/DialogueGlassKit';
import { glassTone } from './glass/glassTone';
import { noteSkeletonGeom } from '../../app/skeleton_geom_log';

const CARD_COUNT = 4;

export const DialogueV2CatalogueSkeleton = memo(function DialogueV2CatalogueSkeleton() {
  const glass = useDialogueGlass();
  const base = glassTone(glass.text, 0.09);
  const highlight = glassTone(glass.text, 0.15);
  return (
    // та же обёртка, что у DialogueV2CatalogueSection: категории через 13, первая — 32 под шапкой хаба
    <View testID="dialogue-v2-catalogue-skeleton" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ gap: 13, marginTop: 32 }}>
      {Array.from({ length: CARD_COUNT }, (_unused, index) => (
        <View key={index} /* guard-ok: статичный список одинаковых заглушек */ onLayout={index === 0 ? (event) => noteSkeletonGeom('dialogs', 'skeleton', event.nativeEvent.layout.height) : undefined} style={[dialogueGlassCardStyle(glass, 22), { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 18 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 22, minHeight: 55 }}>
            <SkeletonBlock width={55} height={55} borderRadius={14} baseColor={base} highlightColor={highlight} />
            <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
              <SkeletonBlock width={index % 2 === 0 ? '62%' : '48%'} height={20} borderRadius={8} baseColor={base} highlightColor={highlight} />
              <SkeletonBlock width="40%" height={14} borderRadius={7} baseColor={base} highlightColor={highlight} />
            </View>
            <SkeletonBlock width={44} height={28} borderRadius={9} baseColor={base} highlightColor={highlight} />
          </View>
          <View style={{ height: 7, borderRadius: 4, backgroundColor: glass.line, marginTop: 18, marginHorizontal: 4 }} />
        </View>
      ))}
    </View>
  );
});

export default DialogueV2CatalogueSkeleton;
