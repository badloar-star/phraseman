import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/ThemeContext';
import { usePremium } from '../components/PremiumContext';
import ScreenGradient from '../components/ScreenGradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hapticTap } from '../hooks/use-haptics';
import EnergyBar from '../components/EnergyBar';
import {
  DIALOG_SCENARIO_GROUPS,
  getScenariosByCategory,
  type DialogScenario,
} from './ai_dialog_scenarios';

const CARD_H = 72;
const CARD_RADIUS = 16;

export default function AiDialogHome() {
  const { theme: t, f } = useTheme();
  const { hasPremiumAccess } = usePremium();
  const router = useRouter();

  const groups = useMemo(
    () =>
      DIALOG_SCENARIO_GROUPS.map((g) => ({
        ...g,
        scenarios: getScenariosByCategory(g.category),
      })).filter((g) => g.scenarios.length > 0),
    [],
  );

  const openScenario = (scenario: DialogScenario) => {
    hapticTap();
    if (!scenario.active) return; // locked — пока ничего
    router.push({ pathname: '/ai_dialog_session', params: { scenarioId: scenario.id } } as never);
  };

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Header — дословно как меню уроков */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              paddingHorizontal: 14,
              paddingBottom: 6,
            }}
          >
            <TouchableOpacity
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: t.bgCard,
                borderWidth: 0.5,
                borderColor: t.border,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
                flexShrink: 0,
              }}
              onPress={() => {
                hapticTap();
                router.back();
              }}
            >
              <Ionicons name="chevron-back" size={20} color={t.textPrimary} />
            </TouchableOpacity>
            <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
              <Text
                style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '700' }}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                Разговор с Филом
              </Text>
            </View>
            <View style={{ flexShrink: 0 }}>
              <EnergyBar size={30} />
            </View>
          </View>

          {/* Подзаголовок */}
          <Text
            style={{
              color: t.textMuted,
              fontSize: f.sub,
              paddingHorizontal: 18,
              paddingTop: 2,
              lineHeight: Math.round(f.sub * 1.45),
            }}
            maxFontSizeMultiplier={1.2}
          >
            Безопасное место поговорить по-английски. Без оценок и спешки.
          </Text>

          {/* Главный вход — открытый разговор с Филом (MVP-1) */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              hapticTap();
              router.push({ pathname: '/ai_companion_session' } as never);
            }}
            style={{
              marginTop: 14,
              marginHorizontal: 14,
              borderRadius: CARD_RADIUS,
              overflow: 'hidden',
              backgroundColor: t.accent,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 18,
              paddingVertical: 18,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.18,
              shadowRadius: 9,
              elevation: 6,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 13,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 14,
              }}
            >
              <Ionicons name="chatbubbles" size={24} color="#fff" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: '#fff', fontSize: f.body, fontWeight: '800' }} numberOfLines={1}>
                Поговори с Филом
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: f.caption, marginTop: 2 }} numberOfLines={1}>
                Свободный разговор о чём угодно
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Группы сценариев (вторичная полка) */}
          {groups.map((g) => (
            <View key={g.category}>
              {/* Заголовок группы — как CEFR header */}
              <View
                style={{
                  paddingHorizontal: 18,
                  paddingTop: 18,
                  paddingBottom: 7,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: t.accent }} />
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }} numberOfLines={1}>
                  {g.labelRu}
                </Text>
              </View>

              {/* Карточки сценариев */}
              {g.scenarios.map((scenario) => {
                const locked = !scenario.active;
                const premiumLockHint = locked; // в Фазе 0 неактивные = «скоро»
                return (
                  <View
                    key={scenario.id}
                    style={{
                      marginTop: 5,
                      marginHorizontal: 14,
                      borderRadius: CARD_RADIUS,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: locked ? 2 : 4 },
                      shadowOpacity: locked ? 0.08 : 0.18,
                      shadowRadius: locked ? 4 : 9,
                      elevation: locked ? 2 : 6,
                    }}
                  >
                    <TouchableOpacity
                      activeOpacity={0.82}
                      onPress={() => openScenario(scenario)}
                      style={{
                        height: CARD_H,
                        borderRadius: CARD_RADIUS,
                        overflow: 'hidden',
                        backgroundColor: t.bgCard,
                        borderWidth: 1,
                        borderColor: t.border,
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 18,
                        opacity: locked ? 0.55 : 1,
                      }}
                    >
                      {/* Иконка категории */}
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          backgroundColor: t.bgSurface,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 14,
                        }}
                      >
                        <Ionicons name={scenario.icon as never} size={22} color={t.textSecond} />
                      </View>

                      {/* Тексты */}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          style={{
                            color: t.textMuted,
                            fontSize: f.label,
                            fontWeight: '700',
                            letterSpacing: 0.8,
                          }}
                          numberOfLines={1}
                        >
                          {scenario.cefr} · СЦЕНАРИЙ
                        </Text>
                        <Text
                          style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', marginTop: 2 }}
                          numberOfLines={1}
                        >
                          {scenario.titleRu}
                        </Text>
                      </View>

                      {/* Состояние справа */}
                      {locked ? (
                        <Ionicons name="lock-closed" size={16} color={t.textMuted} style={{ opacity: 0.75 }} />
                      ) : (
                        <Ionicons name="chevron-forward" size={18} color={t.textSecond} />
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          ))}

          {/* Лимит free */}
          {!hasPremiumAccess && (
            <Text
              style={{
                color: t.textMuted,
                fontSize: f.caption,
                textAlign: 'center',
                paddingTop: 18,
                paddingHorizontal: 18,
              }}
              maxFontSizeMultiplier={1.2}
            >
              Сегодня бесплатно: 1 разговор
            </Text>
          )}
        </Animated.ScrollView>
      </SafeAreaView>
    </ScreenGradient>
  );
}
