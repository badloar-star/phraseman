import React, { memo } from 'react';
import { ScrollView, View } from 'react-native';

import { V2 } from '../../constants/v2Style';
import { nestedBoxShadow, plateBoxShadow } from '../v2/ShadowSurface';
import SkeletonBlock from '../SkeletonShimmer';
import type { LessonMenuGlassTokens } from './LessonMenuGlass';

// ═══════════════════════════════════════════════════════════════════════════
// LessonMenuGateSkeleton.tsx — тело меню урока на время проверки доступа/энергии.
//
// зачем (координатор 13.10, UX без смены логики): пока fail-closed проверка (`lockStateLoaded === false`) не ответила, меню рисовало ПУСТОЙ фон — на каждом заходе и при возврате
// из урока. Здесь — скелет по форме экрана: заголовок урока, строки пунктов тем же размером (76 dp, радиус 14, тень «Тень» без обводок, круг 46). Решение гейта не затронуто: скелет ничего не
// включает и ничего не разрешает (pointerEvents="none", скрыт от скринридера); шапку с «назад» рисует сам экран. Размеры = LessonMenuGlass (ROW_MIN_HEIGHT 76), отступы = ScrollView меню.
// ═══════════════════════════════════════════════════════════════════════════

/** Тот же минимум высоты строки, что у LessonMenuRow (LessonMenuGlass.tsx → ROW_MIN_HEIGHT). */
export const LESSON_MENU_SKELETON_ROW_HEIGHT = 76;
const ROW_COUNT = 4;

type Props = Readonly<{ glass: LessonMenuGlassTokens; bottomInset: number }>;

function LessonMenuGateSkeletonBase({ glass, bottomInset }: Props) {
  return (
    <ScrollView
      testID="lesson-menu-gate-skeleton"
      scrollEnabled={false}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: V2.screenPad, paddingBottom: Math.max(32, bottomInset + 16), gap: 14 }}
    >
      {/* заголовок урока (30/36, отступ 12 — как в меню) */}
      <SkeletonBlock width="62%" height={30} borderRadius={8} baseColor={glass.opaqueControl} style={{ marginTop: 12 }} />
      {Array.from({ length: ROW_COUNT }, (_, i) => (
        // guard-ok: четыре неподвижные строки, порядок не меняется
        <View
          key={`row-${i}`}
          style={{
            minHeight: LESSON_MENU_SKELETON_ROW_HEIGHT,
            borderRadius: 14,
            backgroundColor: glass.plateFillFrom,
            boxShadow: plateBoxShadow(glass),
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            paddingHorizontal: 14,
            paddingVertical: 14,
          }}
        >
          <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: glass.opaqueControl, boxShadow: nestedBoxShadow(glass) }} />
          <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
            <SkeletonBlock width={i % 2 === 0 ? '54%' : '68%'} height={16} borderRadius={6} baseColor={glass.opaqueControl} />
            <SkeletonBlock width="38%" height={14} borderRadius={6} baseColor={glass.opaqueControl} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const LessonMenuGateSkeleton = memo(LessonMenuGateSkeletonBase);
export default LessonMenuGateSkeleton;
