import React, { useMemo, useState } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenGradient from '../components/ScreenGradient';
import EnergyBar from '../components/EnergyBar';
import { usePremium } from '../components/PremiumContext';
import { useTheme } from '../components/ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import {
  DIALOG_SCENARIO_GROUPS,
  getPublicDialogScenarios,
  getScenariosByCategory,
  type DialogScenario,
  type DialogScenarioCategory,
} from './ai_dialog_scenarios';

type CategoryFilter = 'all' | DialogScenarioCategory;

const CARD_RADIUS = 18;

export default function AiDialogHome() {
  const { theme: t, f, themeMode } = useTheme();
  const { hasPremiumAccess } = usePremium();
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');

  const groups = useMemo(
    () =>
      DIALOG_SCENARIO_GROUPS.map((group) => ({
        ...group,
        scenarios: getScenariosByCategory(group.category),
      })).filter((group) => activeCategory === 'all' || group.category === activeCategory),
    [activeCategory],
  );

  const activeCount = getPublicDialogScenarios().length;
  const accent = false ? '#F2C48D' : t.accent;
  const progressColor = false ? '#7CFF00' : '#22C55E';

  const openScenario = (scenario: DialogScenario) => {
    hapticTap();
    router.push({ pathname: '/ai_dialog_session', params: { scenarioId: scenario.id } } as never);
  };

  const selectCategory = (category: CategoryFilter) => {
    hapticTap();
    setActiveCategory(category);
  };

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 34 }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              paddingHorizontal: 14,
              paddingBottom: 8,
            }}
          >
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Назад"
              onPress={() => {
                hapticTap();
                router.back();
              }}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: t.bgCard,
                borderWidth: 0.5,
                borderColor: t.border,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}
            >
              <Ionicons name="chevron-back" size={22} color={t.textPrimary} />
            </TouchableOpacity>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '800' }}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                Диалоги
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 1 }} numberOfLines={1}>
                {activeCount} сценариев с Тео
              </Text>
            </View>
            <EnergyBar size={30} />
          </View>

          <View
            style={{
              marginTop: 6,
              marginHorizontal: 14,
              borderRadius: 22,
              backgroundColor: t.bgCard,
              borderWidth: 1,
              borderColor: t.border,
              padding: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 5 },
              shadowOpacity: 0.14,
              shadowRadius: 12,
              elevation: 5,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: accent,
                }}
              >
                <Ionicons name="chatbubbles" size={27} color="#fff" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '900' }} numberOfLines={1}>
                  Тренировка разговора
                </Text>
                <Text
                  style={{
                    color: t.textMuted,
                    fontSize: f.sub,
                    lineHeight: Math.round(f.sub * 1.35),
                    marginTop: 3,
                  }}
                  numberOfLines={2}
                  maxFontSizeMultiplier={1.15}
                >
                  Выбери ситуацию и отвечай своими словами.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Открыть свободный разговор с Тео"
              activeOpacity={0.86}
              onPress={() => {
                hapticTap();
                router.push({ pathname: '/ai_companion_session' } as never);
              }}
              style={{
                minHeight: 50,
                marginTop: 14,
                borderRadius: 16,
                backgroundColor: accent,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Ionicons name="sparkles-outline" size={20} color="#fff" />
              <Text
                style={{ color: '#fff', fontSize: f.body, fontWeight: '900', marginLeft: 10, flex: 1 }}
                numberOfLines={1}
              >
                Свободный разговор
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={{ paddingHorizontal: 14, paddingTop: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <CategoryChip
                label="Все"
                selected={activeCategory === 'all'}
                onPress={() => selectCategory('all')}
                textSize={f.caption}
                accent={accent}
                bg={t.bgCard}
                border={t.border}
                text={t.textPrimary}
                muted={t.textMuted}
              />
              {DIALOG_SCENARIO_GROUPS.map((group) => (
                <CategoryChip
                  key={group.category}
                  label={group.shortLabelRu}
                  selected={activeCategory === group.category}
                  onPress={() => selectCategory(group.category)}
                  textSize={f.caption}
                  accent={accent}
                  bg={t.bgCard}
                  border={t.border}
                  text={t.textPrimary}
                  muted={t.textMuted}
                />
              ))}
            </View>
          </View>

          {groups.map((group) => (
            <View key={group.category}>
              <View
                style={{
                  paddingHorizontal: 18,
                  paddingTop: 18,
                  paddingBottom: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: accent }} />
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900' }} numberOfLines={1}>
                  {group.labelRu}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '700' }}>
                  {group.scenarios.length}
                </Text>
              </View>

              {group.scenarios.map((scenario, index) => (
                <TouchableOpacity
                  key={scenario.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Открыть сценарий ${scenario.titleRu}`}
                  activeOpacity={0.84}
                  onPress={() => openScenario(scenario)}
                  style={{
                    minHeight: 94,
                    marginTop: index === 0 ? 0 : 8,
                    marginHorizontal: 14,
                    borderRadius: CARD_RADIUS,
                    overflow: 'hidden',
                    backgroundColor: t.bgCard,
                    borderWidth: 1,
                    borderColor: t.border,
                    paddingHorizontal: 15,
                    paddingVertical: 13,
                    flexDirection: 'row',
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.1,
                    shadowRadius: 7,
                    elevation: 3,
                  }}
                >
                  <View
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 15,
                      backgroundColor: t.bgSurface,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 13,
                    }}
                  >
                    <Ionicons name={scenario.icon as never} size={23} color={accent} />
                  </View>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text
                        style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900', flex: 1 }}
                        numberOfLines={1}
                      >
                        {scenario.titleRu}
                      </Text>
                      <View
                        style={{
                          minWidth: 34,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: t.bgSurface,
                          alignItems: 'center',
                          justifyContent: 'center',
                          paddingHorizontal: 8,
                        }}
                      >
                        <Text style={{ color: progressColor, fontSize: f.label, fontWeight: '900' }}>
                          {scenario.cefr}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={{
                        color: t.textMuted,
                        fontSize: f.sub,
                        lineHeight: Math.round(f.sub * 1.32),
                        marginTop: 5,
                      }}
                      numberOfLines={2}
                      maxFontSizeMultiplier={1.15}
                    >
                      {scenario.goalRu}
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward" size={19} color={t.textSecond} style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              ))}
            </View>
          ))}

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

function CategoryChip(props: {
  label: string;
  selected: boolean;
  onPress: () => void;
  textSize: number;
  accent: string;
  bg: string;
  border: string;
  text: string;
  muted: string;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected: props.selected }}
      activeOpacity={0.82}
      onPress={props.onPress}
      style={{
        minHeight: 44,
        flex: 1,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
        backgroundColor: props.selected ? props.accent : props.bg,
        borderWidth: 1,
        borderColor: props.selected ? props.accent : props.border,
      }}
    >
      <Text
        style={{
          color: props.selected ? '#fff' : props.text || props.muted,
          fontSize: props.textSize,
          fontWeight: '900',
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.82}
      >
        {props.label}
      </Text>
    </TouchableOpacity>
  );
}
