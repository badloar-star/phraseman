import React, { memo } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenGradient from './ScreenGradient';
import LessonArtBackdrop from './LessonArtBackdrop';
import SkeletonBlock from './SkeletonShimmer';
import type { Theme } from '../constants/theme';

interface LessonLoadingSkeletonProps {
  theme: Theme;
  /** Компактная геометрия (linked-slice задачи плана) — те же отступы, что у загруженного экрана. */
  compact?: boolean;
  /** Горизонтальный паддинг контента — должен совпадать с lessonHorizontalPadding загруженного экрана. */
  horizontalPadding?: number;
}

/**
 * зачем: единый скелетон урока — заменяет ТРИ разных состояния (пустой View,
 * полноэкранный ActivityIndicator в двух местах) одной геометрией, повторяющей
 * реальный layout урока (шапка, задание, ответная строка, плитки слов,
 * прогресс-бар), чтобы переход скелетон→контент не дёргал экран (Performance
 * Bible: instant first frame, никаких полноэкранных спиннеров).
 * Обёрнут в ScreenGradient/LessonArtBackdrop — тот же фон, что у готового
 * экрана, чтобы не было белой/чёрной вспышки на смене состояний.
 */
function LessonLoadingSkeletonBase({ theme: t, compact = false, horizontalPadding = 20 }: LessonLoadingSkeletonProps) {
  return (
    <ScreenGradient>
      <LessonArtBackdrop variant="practice" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Шапка: кнопка назад+название слева, энергия/статы справа — как в реальном хедере */}
        <View
          style={{
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: horizontalPadding < 20 ? 10 : 15,
            paddingVertical: compact ? 7 : 12,
            gap: 6,
          }}
        >
          <SkeletonBlock width={96} height={32} borderRadius={20} baseColor={t.bgCard} />
          <View style={{ flex: 1 }} />
          <SkeletonBlock width={64} height={24} borderRadius={12} />
        </View>

        <View style={{ paddingHorizontal: horizontalPadding, paddingTop: compact ? 2 : 10, flex: 1 }}>
          {/* Инструкция «Собери фразу:» */}
          <SkeletonBlock width={140} height={14} style={{ alignSelf: 'center', marginBottom: 10 }} />
          {/* Фраза-задание (2 строки) */}
          <SkeletonBlock width="86%" height={22} style={{ alignSelf: 'center', marginBottom: 8 }} />
          <SkeletonBlock width="64%" height={22} style={{ alignSelf: 'center', marginBottom: 20 }} />
          {/* Ответная строка (подчёркнутая зона) */}
          <SkeletonBlock width="70%" height={28} style={{ alignSelf: 'center', marginBottom: 24 }} />

          {/* Плитки слов — 2 колонки, как wordOptionItems */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <SkeletonBlock
                key={i}
                width="48%"
                height={compact ? 34 : 44}
                borderRadius={12}
                baseColor={t.bgCard}
                style={{ marginBottom: compact ? 5 : 10 }}
              />
            ))}
          </View>

          <View style={{ flex: 1 }} />

          {/* Прогресс-бар внизу */}
          <View style={{ paddingVertical: compact ? 3 : 6, marginBottom: 8 }}>
            <SkeletonBlock width="100%" height={8} borderRadius={4} baseColor={t.bgSurface} />
          </View>
        </View>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const LessonLoadingSkeleton = memo(LessonLoadingSkeletonBase);
export default LessonLoadingSkeleton;
