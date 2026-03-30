/**
 * ClubBoostActivator
 * UI для выбора и активации бустов для клуба
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import {
  CLUB_BOOSTS,
  activateBoost,
  getBoostNotification,
  BoostDef,
} from '../app/club_boosts';

interface ClubBoostActivatorProps {
  visible: boolean;
  onClose: () => void;
  playerName: string;
  playerPhrasm: number; // текущий баланс фразменов
  playerXP: number; // текущий баланс XP
  onBoostActivated: (boostId: string, notification: string) => void;
}

export default function ClubBoostActivator({
  visible,
  onClose,
  playerName,
  playerPhrasm,
  playerXP,
  onBoostActivated,
}: ClubBoostActivatorProps) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const isUK = lang === 'uk';

  const [selectedBoost, setSelectedBoost] = useState<BoostDef | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const slideAnim = useRef(new Animated.Value(300)).current;

  const openBoost = (boost: BoostDef) => {
    setSelectedBoost(boost);
  };

  const closeBoost = () => {
    setSelectedBoost(null);
  };

  const handleConfirmPurchase = async () => {
    if (!selectedBoost) return;

    // Проверяем баланс в зависимости от типа валюты
    const isXPCost = selectedBoost.costCurrency === 'xp';
    const playerBalance = isXPCost ? playerXP : playerPhrasm;
    const currencyName = isXPCost ? 'XP' : (isUK ? 'фразменів' : 'фразменов');

    if (playerBalance < selectedBoost.cost) {
      Alert.alert(
        isUK ? 'Недостатньо' : 'Недостаточно',
        isUK
          ? `Вам потрібно ${selectedBoost.cost} ${currencyName}, у вас ${playerBalance}`
          : `Вам нужно ${selectedBoost.cost} ${currencyName}, у вас ${playerBalance}`
      );
      return;
    }

    setIsProcessing(true);

    try {
      const success = await activateBoost(
        selectedBoost.id,
        playerName,
        selectedBoost.cost
      );

      if (success) {
        const notification = getBoostNotification(
          selectedBoost.id,
          playerName,
          isUK
        );
        onBoostActivated(selectedBoost.id, notification);

        Alert.alert(
          isUK ? 'Успіх!' : 'Успешно!',
          isUK
            ? `Буст активований для всіх членів клубу!`
            : `Буст активирован для всех членов клуба!`
        );

        closeBoost();
        onClose();
      } else {
        Alert.alert(
          isUK ? 'Помилка' : 'Ошибка',
          isUK ? 'Не вдалося активувати буст' : 'Не удалось активировать буст'
        );
      }
    } catch (error) {
      Alert.alert(
        isUK ? 'Помилка' : 'Ошибка',
        isUK ? 'Непередбачена помилка' : 'Непредвиденная ошибка'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.55)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 20,
        }}
        onPress={onClose}
      >
        <Animated.View
          style={{
            backgroundColor: t.bgCard,
            borderRadius: 24,
            paddingHorizontal: 16,
            paddingVertical: 24,
            maxHeight: '70%',
            width: '100%',
            maxWidth: 400,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <Pressable onPress={() => {}}>
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  fontSize: f.h2,
                  fontWeight: '700',
                  color: t.textPrimary,
                }}
              >
                {isUK ? 'Бусти для клубу' : 'Бусты для клуба'}
              </Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ all: 8 }}>
                <Ionicons name="close" size={24} color={t.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Boosts Grid */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {selectedBoost ? (
                // Detail View
                <View>
                  {/* Back Button */}
                  <TouchableOpacity
                    onPress={closeBoost}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: 16,
                    }}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={20}
                      color={t.accent}
                    />
                    <Text style={{ color: t.accent, marginLeft: 4 }}>
                      {isUK ? 'Назад' : 'Назад'}
                    </Text>
                  </TouchableOpacity>

                  {/* Boost Icon & Name */}
                  <View
                    style={{
                      backgroundColor: t.bgSurface,
                      borderRadius: 16,
                      padding: 24,
                      alignItems: 'center',
                      marginBottom: 16,
                    }}
                  >
                    <Text style={{ fontSize: 56, marginBottom: 12 }}>
                      {selectedBoost.icon}
                    </Text>
                    <Text
                      style={{
                        fontSize: f.h1,
                        fontWeight: '700',
                        color: t.textPrimary,
                        textAlign: 'center',
                        marginBottom: 8,
                      }}
                    >
                      {isUK ? selectedBoost.nameUK : selectedBoost.nameRU}
                    </Text>
                    <Text
                      style={{
                        fontSize: f.body,
                        color: t.textSecond,
                        textAlign: 'center',
                        lineHeight: 22,
                      }}
                    >
                      {isUK ? selectedBoost.descUK : selectedBoost.descRU}
                    </Text>
                  </View>

                  {/* Group Benefits Badge */}
                  <View
                    style={{
                      backgroundColor: t.accent + '22',
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 16,
                      borderLeftWidth: 3,
                      borderLeftColor: t.accent,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Ionicons name="people-outline" size={18} color={t.accent} />
                      <Text style={{ color: t.accent, fontWeight: '700', fontSize: f.body }}>
                        {isUK ? 'Для всіх членів клубу' : 'Для всех членов клуба'}
                      </Text>
                    </View>
                    <Text style={{ color: t.textMuted, fontSize: f.caption, lineHeight: 18 }}>
                      {isUK
                        ? 'Цей буст активується для всіх гравців в клубі, а не тільки для вас!'
                        : 'Этот буст активируется для всех игроков в клубе, а не только для вас!'}
                    </Text>
                  </View>

                  {/* Details */}
                  <View style={{ gap: 12, marginBottom: 20 }}>
                    {/* Duration */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: t.bgSurface,
                        borderRadius: 12,
                        padding: 12,
                      }}
                    >
                      <Ionicons
                        name="time-outline"
                        size={18}
                        color={t.accent}
                      />
                      <Text
                        style={{
                          marginLeft: 10,
                          flex: 1,
                          color: t.textSecond,
                          fontSize: f.body,
                        }}
                      >
                        {isUK ? 'Тривалість:' : 'Длительность:'}
                      </Text>
                      <Text
                        style={{
                          color: t.textPrimary,
                          fontWeight: '700',
                          fontSize: f.body,
                        }}
                      >
                        {formatDuration(selectedBoost.durationMs, isUK)}
                      </Text>
                    </View>

                    {/* Cost */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: t.bgSurface,
                        borderRadius: 12,
                        padding: 12,
                      }}
                    >
                      <Text style={{ fontSize: 18, marginRight: 10 }}>
                        {selectedBoost.costCurrency === 'xp' ? '⭐' : '🪙'}
                      </Text>
                      <Text
                        style={{
                          flex: 1,
                          color: t.textSecond,
                          fontSize: f.body,
                        }}
                      >
                        {isUK ? 'Вартість:' : 'Стоимость:'}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text
                          style={{
                            color: t.textPrimary,
                            fontWeight: '700',
                            fontSize: f.body,
                          }}
                        >
                          {selectedBoost.cost}
                        </Text>
                        <Text
                          style={{
                            color: t.textMuted,
                            fontWeight: '600',
                            fontSize: f.sub,
                          }}
                        >
                          {selectedBoost.costCurrency === 'xp' ? 'XP' : (isUK ? 'фр' : 'фр')}
                        </Text>
                      </View>
                    </View>

                    {/* Your Balance */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: t.bgSurface,
                        borderRadius: 12,
                        padding: 12,
                      }}
                    >
                      <Text style={{ fontSize: 18, marginRight: 10 }}>
                        {selectedBoost.costCurrency === 'xp' ? '⭐' : '💰'}
                      </Text>
                      <Text
                        style={{
                          flex: 1,
                          color: t.textSecond,
                          fontSize: f.body,
                        }}
                      >
                        {isUK ? 'Ваш баланс:' : 'Ваш баланс:'}
                      </Text>
                      <Text
                        style={{
                          color:
                            (selectedBoost.costCurrency === 'xp' ? playerXP : playerPhrasm) >= selectedBoost.cost
                              ? t.correct
                              : t.wrong,
                          fontWeight: '700',
                          fontSize: f.body,
                        }}
                      >
                        {selectedBoost.costCurrency === 'xp' ? playerXP : playerPhrasm}
                      </Text>
                    </View>
                  </View>

                  {/* Confirm Button */}
                  <TouchableOpacity
                    onPress={handleConfirmPurchase}
                    disabled={
                      isProcessing || (selectedBoost.costCurrency === 'xp' ? playerXP : playerPhrasm) < selectedBoost.cost
                    }
                    style={{
                      backgroundColor:
                        (selectedBoost.costCurrency === 'xp' ? playerXP : playerPhrasm) >= selectedBoost.cost
                          ? t.accent
                          : t.textGhost,
                      borderRadius: 12,
                      paddingVertical: 14,
                      alignItems: 'center',
                      opacity: isProcessing ? 0.6 : 1,
                    }}
                  >
                    <Text
                      style={{
                        color: '#fff',
                        fontWeight: '700',
                        fontSize: f.body,
                      }}
                    >
                      {isProcessing
                        ? (isUK ? 'Завантаження...' : 'Загрузка...')
                        : isUK
                          ? 'Купити для клубу'
                          : 'Купить для клуба'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                // Boosts List
                <View style={{ gap: 10 }}>
                  {CLUB_BOOSTS.map(boost => (
                    <TouchableOpacity
                      key={boost.id}
                      onPress={() => openBoost(boost)}
                      style={{
                        backgroundColor: t.bgSurface,
                        borderRadius: 14,
                        padding: 14,
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: t.border,
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 28, marginRight: 12 }}>
                        {boost.icon}
                      </Text>

                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: t.textPrimary,
                            fontWeight: '700',
                            fontSize: f.body,
                            marginBottom: 2,
                          }}
                        >
                          {isUK ? boost.nameUK : boost.nameRU}
                        </Text>
                        <Text
                          style={{
                            color: t.textMuted,
                            fontSize: f.caption,
                          }}
                        >
                          {formatDuration(boost.durationMs, isUK)}
                        </Text>
                      </View>

                      <View
                        style={{
                          backgroundColor:
                            (boost.costCurrency === 'xp' ? playerXP : playerPhrasm) >= boost.cost
                              ? t.accent + '22'
                              : t.wrong + '22',
                          borderRadius: 10,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          alignItems: 'center',
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text
                            style={{
                              color:
                                (boost.costCurrency === 'xp' ? playerXP : playerPhrasm) >= boost.cost
                                  ? t.accent
                                  : t.wrong,
                              fontWeight: '700',
                              fontSize: f.body,
                            }}
                          >
                            {boost.cost}
                          </Text>
                          <Text
                            style={{
                              color:
                                (boost.costCurrency === 'xp' ? playerXP : playerPhrasm) >= boost.cost
                                  ? t.accent
                                  : t.wrong,
                              fontWeight: '600',
                              fontSize: 10,
                            }}
                          >
                            {boost.costCurrency === 'xp' ? '⭐' : '🪙'}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function formatDuration(ms: number, isUK: boolean): string {
  if (ms === 0) {
    return isUK ? 'Постійно' : 'Постоянно';
  }

  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));

  if (hours > 0) {
    return `${hours}${isUK ? 'г' : 'ч'} ${minutes}${isUK ? 'м' : 'м'}`;
  }
  return `${minutes}${isUK ? 'м' : 'м'}`;
}
