/**
 * ActiveBoostBar
 * Отображает прогресс активного буста с оставшимся временем
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang, type Lang } from '../constants/i18n';
import {
  getActiveBoosts,
  formatBoostTimeRemainingForLang,
  getBoostDef,
  boostNameForLang,
  ActiveBoost,
} from '../app/club_boosts';

interface ActiveBoostBarProps {
  containerStyle?: any;
}

export default function ActiveBoostBar({ containerStyle }: ActiveBoostBarProps) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();

  const [activeBoosts, setActiveBoosts] = useState<ActiveBoost[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<{ [key: string]: string }>(
    {}
  );

  const updateTimeRemaining = useCallback((boosts: ActiveBoost[]) => {
    const timeMap: { [key: string]: string } = {};

    for (let i = 0; i < boosts.length; i++) {
      const boost = boosts[i];
      const key = `${boost.id}_${i}`;
      const formatted = formatBoostTimeRemainingForLang(boost, lang as Lang);
      timeMap[key] = formatted;
    }

    setTimeRemaining(timeMap);
  }, [lang]);

  // Загружаем активные бустеры
  useEffect(() => {
    const load = async () => {
      const boosts = await getActiveBoosts();
      setActiveBoosts(boosts);
      updateTimeRemaining(boosts);
    };

    load();
  }, [updateTimeRemaining]);

  // Обновляем оставшееся время каждую секунду
  useEffect(() => {
    const interval = setInterval(() => {
      updateTimeRemaining(activeBoosts);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeBoosts, updateTimeRemaining]);

  if (activeBoosts.length === 0) {
    return null;
  }

  // Берём первый активный буст для показа
  const primaryBoost = activeBoosts[0];
  const boostDef = getBoostDef(primaryBoost.id);
  if (!boostDef) return null;

  const key = `${primaryBoost.id}_0`;
  const timeStr = timeRemaining[key] || '';

  // Extract multiplier from boost name
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: t.accent + '22', borderColor: t.accent },
        containerStyle,
      ]}
    >
      {/* Icon and name with multiplier */}
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <Text style={{ fontSize: f.numMd, marginRight: 10 }}>
          {boostDef.icon}
        </Text>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <Text
              style={{
                color: t.accent,
                fontWeight: '700',
                fontSize: f.sub,
              }}
            >
              {boostNameForLang(boostDef, lang as Lang)}
            </Text>
            {activeBoosts.length > 1 && (
              <View style={{ backgroundColor: t.accent + '44', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ color: t.accent, fontSize: f.caption, fontWeight: '600' }}>
                  {activeBoosts.length > 1 ? `+${activeBoosts.length - 1}` : ''}
                </Text>
              </View>
            )}
          </View>
          <Text
            style={{
              color: t.textMuted,
              fontSize: f.caption,
            }}
          >
            {triLang(lang as Lang, {
              ru: 'Активировал',
              uk: 'Активував',
              es: 'Activado por',
            })}
            : {primaryBoost.activatedBy}
            {activeBoosts.length > 1 && (
              <Text style={{ color: t.accent }}>
                {triLang(lang as Lang, {
                  ru: ` (еще ${activeBoosts.length - 1})`,
                  uk: ` (ще ${activeBoosts.length - 1})`,
                  es: ` (+${activeBoosts.length - 1})`,
                })}
              </Text>
            )}
          </Text>
        </View>
      </View>

      {/* Timer */}
      <View style={{ alignItems: 'flex-end' }}>
        <Text
          style={{
            color: t.accent,
            fontWeight: '700',
            fontSize: f.body,
          }}
        >
          {timeStr}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 8,
  },
});
