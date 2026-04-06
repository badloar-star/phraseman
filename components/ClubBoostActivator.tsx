/**
 * ClubBoostActivator
 * UI для выбора и активации бустов для клуба
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import {
  CLUB_BOOSTS,
  activateBoost,
  getActiveBoostById,
  BoostDef,
} from '../app/club_boosts';
import AnimatedFrame from './AnimatedFrame';
import { getAvatarImageByIndex } from '../constants/avatars';

interface ClubBoostActivatorProps {
  visible: boolean;
  onClose: () => void;
  playerName: string;
  playerPhrasm: number;
  playerXP: number;
  onBoostActivated: () => void;
  playerAvatarEmoji?: string;
  playerFrameId?: string;
}

export default function ClubBoostActivator({
  visible,
  onClose,
  playerName,
  playerPhrasm,
  playerXP,
  onBoostActivated,
  playerAvatarEmoji = '🐣',
  playerFrameId = 'plain',
}: ClubBoostActivatorProps) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const isUK = lang === 'uk';

  const isNumericAvatar = /^\d+$/.test(playerAvatarEmoji);
  const avatarImage = isNumericAvatar ? getAvatarImageByIndex(parseInt(playerAvatarEmoji)) : undefined;

  const [selectedBoost, setSelectedBoost] = useState<BoostDef | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeBoostIds, setActiveBoostIds] = useState<Set<string>>(new Set());

  const slideAnim = useRef(new Animated.Value(0)).current;

  // При открытии модала проверяем какие бусты уже активны
  useEffect(() => {
    if (!visible) return;
    const checkActive = async () => {
      const ids = new Set<string>();
      for (const boost of CLUB_BOOSTS) {
        const active = await getActiveBoostById(boost.id);
        if (active) ids.add(boost.id);
      }
      setActiveBoostIds(ids);
    };
    checkActive();
  }, [visible]);

  const closeBoost = () => setSelectedBoost(null);

  const handleConfirmPurchase = async () => {
    if (!selectedBoost) return;

    const isXPCost = selectedBoost.costCurrency === 'xp';
    const playerBalance = isXPCost ? playerXP : playerPhrasm;

    if (playerBalance < selectedBoost.cost) return;

    setIsProcessing(true);
    try {
      const success = await activateBoost(selectedBoost.id, playerName, selectedBoost.cost);
      if (success) {
        onBoostActivated();
      }
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
            maxHeight: '90%',
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <AnimatedFrame
                  image={avatarImage}
                  emoji={isNumericAvatar ? undefined : playerAvatarEmoji}
                  frameId={playerFrameId}
                  size={36}
                  animated
                />
                <Text style={{ fontSize: f.h2, fontWeight: '700', color: t.textPrimary }}>
                  {isUK ? 'Бусти для клубу' : 'Бусты для клуба'}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={24} color={t.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {selectedBoost ? (
                <View>
                  {/* Back */}
                  <TouchableOpacity
                    onPress={closeBoost}
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}
                  >
                    <Ionicons name="chevron-back" size={20} color={t.accent} />
                    <Text style={{ color: t.accent, marginLeft: 4 }}>
                      {isUK ? 'Назад' : 'Назад'}
                    </Text>
                  </TouchableOpacity>

                  {/* Icon & Name */}
                  <View style={{
                    backgroundColor: t.bgSurface,
                    borderRadius: 16,
                    padding: 16,
                    alignItems: 'center',
                    marginBottom: 12,
                  }}>
                    <Text style={{ fontSize: 40, marginBottom: 8 }}>{selectedBoost.icon}</Text>
                    <Text style={{ fontSize: f.h1, fontWeight: '700', color: t.textPrimary, textAlign: 'center', marginBottom: 8 }}>
                      {isUK ? selectedBoost.nameUK : selectedBoost.nameRU}
                    </Text>
                    <Text style={{ fontSize: f.body, color: t.textSecond, textAlign: 'center', lineHeight: 22 }}>
                      {isUK ? selectedBoost.descUK : selectedBoost.descRU}
                    </Text>
                  </View>

                  {/* Group badge */}
                  <View style={{
                    backgroundColor: t.accent + '22',
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 16,
                    borderLeftWidth: 3,
                    borderLeftColor: t.accent,
                  }}>
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
                  <View style={{ gap: 8, marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: t.bgSurface, borderRadius: 12, padding: 12 }}>
                      <Ionicons name="time-outline" size={18} color={t.accent} />
                      <Text style={{ marginLeft: 10, flex: 1, color: t.textSecond, fontSize: f.body }}>
                        {isUK ? 'Тривалість:' : 'Длительность:'}
                      </Text>
                      <Text style={{ color: t.textPrimary, fontWeight: '700', fontSize: f.body }}>
                        {formatDuration(selectedBoost.durationMs, isUK)}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: t.bgSurface, borderRadius: 12, padding: 12 }}>
                      <Text style={{ fontSize: 18, marginRight: 10 }}>
                        {selectedBoost.costCurrency === 'xp' ? '⭐' : '🪙'}
                      </Text>
                      <Text style={{ flex: 1, color: t.textSecond, fontSize: f.body }}>
                        {isUK ? 'Вартість:' : 'Стоимость:'}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ color: t.textPrimary, fontWeight: '700', fontSize: f.body }}>
                          {selectedBoost.cost}
                        </Text>
                        <Text style={{ color: t.textMuted, fontWeight: '600', fontSize: f.sub }}>
                          {selectedBoost.costCurrency === 'xp' ? 'XP' : 'фр'}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: t.bgSurface, borderRadius: 12, padding: 12 }}>
                      <Text style={{ fontSize: 18, marginRight: 10 }}>
                        {selectedBoost.costCurrency === 'xp' ? '⭐' : '💰'}
                      </Text>
                      <Text style={{ flex: 1, color: t.textSecond, fontSize: f.body }}>
                        {isUK ? 'Ваш баланс:' : 'Ваш баланс:'}
                      </Text>
                      <Text style={{
                        color: (selectedBoost.costCurrency === 'xp' ? playerXP : playerPhrasm) >= selectedBoost.cost ? t.correct : t.wrong,
                        fontWeight: '700',
                        fontSize: f.body,
                      }}>
                        {selectedBoost.costCurrency === 'xp' ? playerXP : playerPhrasm}
                      </Text>
                    </View>
                  </View>

                  {/* Already active warning */}
                  {activeBoostIds.has(selectedBoost.id) && (
                    <View style={{
                      backgroundColor: '#F59E0B22',
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 12,
                      borderLeftWidth: 3,
                      borderLeftColor: '#F59E0B',
                    }}>
                      <Text style={{ color: '#F59E0B', fontWeight: '700', fontSize: f.caption }}>
                        {isUK ? '⚡ Буст вже активний для вашого клубу' : '⚡ Буст уже активен для вашего клуба'}
                      </Text>
                    </View>
                  )}

                  {/* Confirm Button */}
                  <TouchableOpacity
                    onPress={handleConfirmPurchase}
                    disabled={
                      isProcessing ||
                      activeBoostIds.has(selectedBoost.id) ||
                      (selectedBoost.costCurrency === 'xp' ? playerXP : playerPhrasm) < selectedBoost.cost
                    }
                    style={{
                      backgroundColor:
                        activeBoostIds.has(selectedBoost.id) ||
                        (selectedBoost.costCurrency === 'xp' ? playerXP : playerPhrasm) < selectedBoost.cost
                          ? t.textGhost
                          : t.accent,
                      borderRadius: 12,
                      paddingVertical: 14,
                      alignItems: 'center',
                      opacity: isProcessing ? 0.6 : 1,
                    }}
                  >
                    <Text style={{ color: t.correctText, fontWeight: '700', fontSize: f.body }}>
                      {isProcessing
                        ? (isUK ? 'Завантаження...' : 'Загрузка...')
                        : activeBoostIds.has(selectedBoost.id)
                          ? (isUK ? 'Вже активний' : 'Уже активен')
                          : (isUK ? 'Купити для клубу' : 'Купить для клуба')}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {CLUB_BOOSTS.map(boost => {
                    const isActive = activeBoostIds.has(boost.id);
                    return (
                      <TouchableOpacity
                        key={boost.id}
                        onPress={() => setSelectedBoost(boost)}
                        style={{
                          backgroundColor: t.bgSurface,
                          borderRadius: 14,
                          padding: 14,
                          flexDirection: 'row',
                          alignItems: 'center',
                          borderWidth: 1,
                          borderColor: isActive ? '#7C3AED' : t.border,
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={{ fontSize: 28, marginRight: 12 }}>{boost.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: t.textPrimary, fontWeight: '700', fontSize: f.body, marginBottom: 2 }}>
                            {isUK ? boost.nameUK : boost.nameRU}
                          </Text>
                          <Text style={{ color: t.textMuted, fontSize: f.caption }}>
                            {isActive
                              ? (isUK ? '⚡ Зараз активний' : '⚡ Сейчас активен')
                              : formatDuration(boost.durationMs, isUK)}
                          </Text>
                        </View>
                        <View style={{
                          backgroundColor: isActive
                            ? '#7C3AED33'
                            : (boost.costCurrency === 'xp' ? playerXP : playerPhrasm) >= boost.cost
                              ? t.accent + '22'
                              : t.wrong + '22',
                          borderRadius: 10,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          alignItems: 'center',
                        }}>
                          {isActive ? (
                            <Text style={{ color: '#A78BFA', fontWeight: '700', fontSize: f.caption }}>
                              ACTIVE
                            </Text>
                          ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Text style={{
                                color: (boost.costCurrency === 'xp' ? playerXP : playerPhrasm) >= boost.cost ? t.accent : t.wrong,
                                fontWeight: '700',
                                fontSize: f.body,
                              }}>
                                {boost.cost}
                              </Text>
                              <Text style={{
                                color: (boost.costCurrency === 'xp' ? playerXP : playerPhrasm) >= boost.cost ? t.accent : t.wrong,
                                fontWeight: '600',
                                fontSize: 10,
                              }}>
                                {boost.costCurrency === 'xp' ? '⭐' : '🪙'}
                              </Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
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
  if (ms === 0) return isUK ? 'Постійно' : 'Постоянно';
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (hours > 0) return `${hours}${isUK ? 'г' : 'ч'} ${minutes}м`;
  return `${minutes}м`;
}
