import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { openTreasureChest, canOpenTreasureChest } from '../app/variable_reward_system';
import { registerXP } from '../app/xp_manager';
import { emitAppEvent } from '../app/events';
import XpGainBadge from './XpGainBadge';

interface Props {
  onBonusXPEarned?: (bonusXP: number) => void;
  isPremium?: boolean;
}

export default function DailyTreasureChest({ onBonusXPEarned, isPremium = false }: Props) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const isUK = lang === 'uk';
  const isES = lang === 'es';

  const [canOpen, setCanOpen] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [bonusXPResult, setBonusXPResult] = useState<number | null>(null);
  const [showBonusDisplay, setShowBonusDisplay] = useState(false);

  const lidRotation = useRef(new Animated.Value(0)).current;
  const chestScale = useRef(new Animated.Value(1)).current;
  const bonusOpacity = useRef(new Animated.Value(0)).current;

  // Check if chest can be opened on mount
  useEffect(() => {
    checkChestAvailability();
  }, []);

  const checkChestAvailability = async () => {
    const available = await canOpenTreasureChest();
    setCanOpen(available);
  };

  const handleOpenChest = async () => {
    if (!canOpen || isOpening) return;

    setIsOpening(true);

    // Animate chest opening
    Animated.sequence([
      Animated.spring(chestScale, {
        toValue: 1.1,
        useNativeDriver: true,
        friction: 5,
        tension: 150,
      }),
      Animated.parallel([
        Animated.timing(lidRotation, {
          toValue: -45, // Rotate lid back
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(chestScale, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Try to open the chest
    const result = await openTreasureChest(isPremium);

    if (result) {
      setBonusXPResult(result.bonusXP);
      setShowBonusDisplay(true);

      // Add XP to user total via manager (multipliers, leaderboard, achievements)
      if (result.bonusXP > 0) {
        try {
          const [nameRaw, langRaw] = await Promise.all([
            AsyncStorage.getItem('user_name'),
            AsyncStorage.getItem('app_lang'),
          ]);
          if (nameRaw) {
            await registerXP(
              result.bonusXP,
              'bonus_chest',
              nameRaw,
              langRaw === 'uk' ? 'uk' : langRaw === 'es' ? 'es' : 'ru',
            );
          }
          onBonusXPEarned?.(result.bonusXP);
        } catch {
        }
      }

      // Show bonus animation
      Animated.sequence([
        Animated.timing(bonusOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(bonusOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowBonusDisplay(false);
        setBonusXPResult(null);
        setCanOpen(false);
        // Reset animations
        lidRotation.setValue(0);
      });
    } else {
      // Already opened or invalid attempt
      emitAppEvent('action_toast', {
        type: 'info',
        messageRu: `Сундук закрыт. ${isPremium ? 'Вы уже открыли максимум сундуков сегодня' : 'Возвращайтесь завтра для нового сундука'}`,
        messageUk: `Сундук закритий. ${isPremium ? 'Ви вже відкрили максимум сундуків сьогодні' : 'Повертайтеся завтра для нового сундука'}`,
        messageEs: `Cofre cerrado. ${isPremium ? 'Ya has abierto todos los cofres permitidos hoy' : 'Vuelve mañana por otro cofre'}`,
      });

      // Reset animations
      Animated.timing(lidRotation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      setIsOpening(false);
    }
  };

  const lidRotationInterpolate = lidRotation.interpolate({
    inputRange: [-45, 0],
    outputRange: ['-45deg', '0deg'],
  });

  return (
    <View style={[styles.container, { backgroundColor: t.bgCard, borderColor: t.accent }]}>
      {/* Title */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: t.accent, fontSize: f.sub }]}>
          {isUK ? '💎 СКАРБ ДНЯ' : isES ? '💎 COFRE DEL DÍA' : '💎 КЛАД ДНЯ'}
        </Text>
      </View>

      {/* Chest */}
      <TouchableOpacity
        onPress={handleOpenChest}
        disabled={!canOpen || isOpening}
        style={[
          styles.chestContainer,
          { opacity: canOpen && !isOpening ? 1 : 0.6 },
        ]}
        activeOpacity={0.8}
      >
        <Animated.View
          style={[
            styles.chest,
            {
              transform: [{ scale: chestScale }],
            },
          ]}
        >
          {/* Lid */}
          <Animated.View
            style={[
              styles.lid,
              {
                transform: [{ rotate: lidRotationInterpolate }],
                backgroundColor: t.accent,
              },
            ]}
          >
            <Text style={styles.lidEmoji}>📦</Text>
          </Animated.View>

          {/* Body */}
          <View style={[styles.body, { backgroundColor: t.accent + '33' }]}>
            <Text style={styles.chestEmoji}>💰</Text>
          </View>
        </Animated.View>
      </TouchableOpacity>

      {/* Bonus Display */}
      {showBonusDisplay && bonusXPResult !== null && (
        <Animated.View
          style={[
            styles.bonusDisplay,
            {
              opacity: bonusOpacity,
              backgroundColor: bonusXPResult > 0 ? t.correct + '22' : t.textMuted + '11',
            },
          ]}
        >
          {bonusXPResult > 0 ? (
            <XpGainBadge amount={bonusXPResult} visible={showBonusDisplay} style={{ fontSize: f.h2 + 6 }} />
          ) : (
            <Text style={[styles.bonusText, { color: t.textMuted, fontSize: f.h2 + 6 }]}>
              {bonusXPResult} XP
            </Text>
          )}
          {bonusXPResult > 0 && (
            <Text style={[styles.bonusLabel, { color: t.correct, fontSize: f.label }]}>
              {bonusXPResult <= 10
                ? (isUK ? '🎁 Малий приз' : isES ? '🎁 Premio pequeño' : '🎁 Малый приз')
                : bonusXPResult <= 20
                  ? (isUK ? '🎊 Середній приз' : isES ? '🎊 Premio medio' : '🎊 Средний приз')
                  : (isUK ? '🏆 Великий приз!' : isES ? '🏆 ¡Gran premio!' : '🏆 Большой приз!')}
            </Text>
          )}
        </Animated.View>
      )}

      {/* Info */}
      {!canOpen && (
        <View style={styles.info}>
          <Ionicons name="checkmark-circle" size={16} color={t.correct} />
          <Text style={[styles.infoText, { color: t.textMuted, fontSize: f.label }]}>
            {isUK
              ? 'Відкрито сьогодні. Повертайтесь завтра!'
              : isES
                ? 'Ya lo abriste hoy. ¡Vuelve mañana!'
                : 'Открыто сегодня. Вернитесь завтра!'}
          </Text>
        </View>
      )}

      {canOpen && (
        <View style={styles.info}>
          <Ionicons name="sparkles" size={16} color={t.accent} />
          <Text style={[styles.infoText, { color: t.accent, fontSize: f.label }]}>
            {isUK
              ? 'Натисніть щоб отримати бонус XP'
              : isES
                ? 'Toca para ganar XP extra'
                : 'Нажмите чтобы получить бонус XP'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  chestContainer: {
    marginVertical: 12,
  },
  chest: {
    alignItems: 'center',
  },
  lid: {
    width: 80,
    height: 60,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: -10,
    zIndex: 10,
  },
  lidEmoji: {
    fontSize: 32,
  },
  body: {
    width: 100,
    height: 70,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  chestEmoji: {
    fontSize: 48,
  },
  bonusDisplay: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  bonusText: {
    fontSize: 24,
    fontWeight: '700',
  },
  bonusLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
