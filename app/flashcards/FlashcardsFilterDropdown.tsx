import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from '../../components/SafeLinearGradient';
import { useTheme } from '../../components/ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { plateBoxShadow } from '../../components/v2/ShadowSurface';
import type { Theme } from '../../constants/theme';
import type { Lang } from '../../constants/i18n';
import { triLang } from '../../constants/i18n';
import { FilterGroup } from './selectors';

import { noAndroidOutline } from '../../constants/androidGlow';
import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
import { DebugLogger } from '../debug-logger';
type Props = {
  visible: boolean;
  lang: Lang;
  activeFilter: string;
  filterGroups: FilterGroup[];
  t: Theme;
  f: Record<string, number>;
  savedGlass?: boolean;
  /** Шапка экрана: меню берёт верх от её измеренного низа (cards-gap-023). */
  headerRef?: React.RefObject<View | null>;
  /** Низ шапки в окне, посчитанный экраном при раскладке (кэш для первого кадра меню). */
  anchorBottomRef?: React.MutableRefObject<number | null>;
  onClose: () => void;
  onSelect: (key: string) => void;
};

// зачем (cards-gap-023, Макеты 15.10; сперва логи): зазор между низом шапки и верхом меню из образца (106 - 95).
const FILTER_MENU_GAP = 11;

export default function FlashcardsFilterDropdown({
  visible,
  lang,
  activeFilter,
  filterGroups,
  t,
  f,
  savedGlass = false,
  headerRef,
  anchorBottomRef,
  onClose,
  onSelect,
}: Props) {
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  // зачем (Макеты, кандидат cards-gap-023: «меню фильтра перекрывает шапку»; сперва логи): где меню оказалось в окне при заданном top=56 и какой верхний отступ у экрана —
  // по строке [FILTER-MENU] видно, лежит ли меню поверх шапки (y < insets.top + высота шапки) и надо ли сдвигать на insets.top.
  const insets = useStableSafeAreaInsets();
  const menuRef = useRef<View>(null);
  // зачем (cards-gap-023, Макеты 15.10; сперва логи): верх меню = низ шапки + зазор образца (cards-gaps-states №23: низ шапки 95, меню 106), а не константа 56;
  // без замера — insets.top + 56 (как меню действий в CollectionHeader). Замер повторяется при каждом открытии.
  const [measuredBottom, setMeasuredBottom] = useState<number | null>(null);
  const anchor = measuredBottom ?? anchorBottomRef?.current ?? null;
  const menuTop = anchor != null ? anchor + FILTER_MENU_GAP : insets.top + 56;
  useEffect(() => {
    if (!visible) return;
    const node = headerRef?.current;
    if (!node) {
      DebugLogger.info('[CARDS-FILTER-MENU]', `measure skipped: no header ref; cached=${String(anchorBottomRef?.current ?? null)} menuTop=${Math.round(menuTop)} insets.top=${Math.round(insets.top)}`);
      return;
    }
    node.measureInWindow((x, y, w, h) => {
      const bottom = y + h;
      if (!Number.isFinite(bottom) || h <= 0 || bottom < insets.top) {
        DebugLogger.info('[CARDS-FILTER-MENU]', `measure ignored: bad value y=${String(y)} h=${String(h)} bottom=${String(bottom)} insets.top=${Math.round(insets.top)}`);
        return;
      }
      if (anchorBottomRef) anchorBottomRef.current = bottom;
      setMeasuredBottom(bottom);
      DebugLogger.info('[CARDS-FILTER-MENU]', `opened: headerY=${Math.round(y)} headerH=${Math.round(h)} headerBottom=${Math.round(bottom)} menuTop=${Math.round(bottom + FILTER_MENU_GAP)} insets.top=${Math.round(insets.top)} savedGlass=${String(savedGlass)}`);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);
  useEffect(() => {
    if (!visible) return undefined;
    const timer = setTimeout(() => {
      menuRef.current?.measureInWindow((x, y, w, h) => {
        DebugLogger.info('[FILTER-MENU]', `открыто: меню в окне x=${Math.round(x)} y=${Math.round(y)} ${Math.round(w)}×${Math.round(h)}; top прописан=56, insets.top=${Math.round(insets.top)}, savedGlass=${String(savedGlass)}`);
      });
    }, 60);
    return () => clearTimeout(timer);
  }, [visible, insets.top, savedGlass]);
  if (!visible) return null;

  return (
    <>
      <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={onClose} />
      <View
        ref={menuRef}
        collapsable={false}
        style={{
          position: 'absolute',
          top: menuTop,
          right: 16,
          zIndex: 9999,
          backgroundColor: savedGlass ? g.sheet : t.bgSurface,
          borderRadius: 14,
          // зачем (Тень 12.10): меню «Сохранённых» без кромки — плашка с тенью темы; overflow внешней обёртки убран (клип тени),
          // скругление содержимого держит слой блюра и ScrollView со своим overflow
          ...(savedGlass ? { boxShadow: plateBoxShadow(g) } : { overflow: 'hidden' as const }),
          minWidth: 200,
          maxHeight: 420,
          ...(savedGlass ? null : {
            shadowColor: '#000', // theme-exempt: тень выпадающего меню — чёрная в любой теме
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
          }),
          ...noAndroidOutline,
        }}
      >
        {savedGlass ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 14, overflow: 'hidden' }]}>
          {/* зачем: владелец 18.10 — ореол текста от BlurView без blurTarget (на Android dimezis снимает экран вместе с текстом
              этого же меню и кладёт размытую копию под строки). На Android живой блюр выключен, тон и градиент остаются; iOS как было. */}
          {Platform.OS !== 'android' ? <BlurView intensity={16} blurReductionFactor={3} experimentalBlurMethod="none" tint="systemUltraThinMaterialDark" style={StyleSheet.absoluteFill} /> : null}
          <LinearGradient colors={[g.selected, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
        </View> : null}
        <ScrollView decelerationRate="fast" bounces={false} showsVerticalScrollIndicator={false} style={{ borderRadius: 14, overflow: 'hidden' }}>
          <TouchableOpacity
            onPress={() => onSelect('all')}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}
          >
            <Text style={{ fontSize: f.body, color: savedGlass ? g.text : activeFilter === 'all' ? t.accentText : t.textPrimary, fontWeight: activeFilter === 'all' ? '700' : '400' }}>
              {triLang(lang, {
                ru: 'Все',
                uk: 'Всі',
                en: 'All',
                es: 'Todas',
                'pt-BR': 'Todas',
                vi: 'Tất cả',
                id: 'Semua',
                tr: 'Tümü',
                pl: 'Wszystkie',
              })}
            </Text>
            {activeFilter === 'all' && <Ionicons name="checkmark" size={16} color={savedGlass ? g.lightTint : t.accentText} />}
          </TouchableOpacity>

          {filterGroups.map((group) => (
            <View key={group.groupKey}>
              <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, borderTopWidth: 0.5 /* shadow-ok: разделитель-линия групп меню */, borderTopColor: savedGlass ? g.dividerTone : t.border, backgroundColor: savedGlass ? g.card : t.bgSurface }}>
                <Text style={{ fontSize: f.caption, color: savedGlass ? g.secondary : t.accentText, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>{group.groupLabel}</Text>
              </View>
              {group.items.map((opt) => {
                const active = activeFilter === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => onSelect(opt.key)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 24,
                      paddingVertical: 10,
                      borderTopWidth: 0.5, // shadow-ok: разделитель-линия между пунктами меню
                      borderTopColor: savedGlass ? g.dividerTone : t.border,
                    }}
                  >
                    <Text style={{ fontSize: f.body, color: savedGlass ? g.text : active ? t.accentText : t.textPrimary, fontWeight: active ? '700' : '400' }}>{opt.label}</Text>
                    {active && <Ionicons name="checkmark" size={16} color={savedGlass ? g.lightTint : t.accentText} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </View>
    </>
  );
}
