// Модалка разового бонуса осколков за волну релиза (см. config RELEASE_WAVE_BONUS_VERSION).
// Без анимации opacity на оверлее; у осколка — только transform (useNativeDriver), без сбоев на Fabric.
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import {
  getReleaseWaveBonusLabelAmount,
  claimReleaseWaveBonus,
  persistNativeBuildIdAfterReleaseWaveFlow,
} from '../app/release_wave_bonus';
import { oskolokImageForPackShards } from '../app/oskolok';

const TEXTS = {
  ru: {
    title: 'Список дел:',
    body:
      '✅ Починить Арену\n' +
      '✅ Добавить бонусы за друзей\n' +
      '✅ Прокачать тренажёр предлогов\n' +
      '⏳ Выдать всем по осколкам\n' +
      '← вот этим прямо сейчас и занимаемся.',
    sub: (n: number) => `+${n} осколков знаний`,
    cta: 'Забрать',
    ctaPreview: 'Закрыть',
  },
  uk: {
    title: 'Перелік справ:',
    body:
      '✅ Полагодити Арену\n' +
      '✅ Додати бонуси за друзів\n' +
      '✅ Прокачати тренажер прийменників\n' +
      '⏳ Видати всім осколки\n' +
      '← цим саме зараз і займаємось.',
    sub: (n: number) => `+${n} осколків знань`,
    cta: 'Забрати',
    ctaPreview: 'Закрити',
  },
  es: {
    title: 'Lista de tareas:',
    body:
      '✅ Arreglar la Arena\n' +
      '✅ Añadir bonos por invitar amigos\n' +
      '✅ Mejorar la práctica de preposiciones\n' +
      '⏳ Repartir fragmentos a todos\n' +
      '← con esto estamos ahora mismo.',
    sub: (n: number) => `+${n} fragmentos de conocimiento`,
    cta: 'Reclamar',
    ctaPreview: 'Cerrar',
  },
} as const;

type Props = {
  visible: boolean;
  onClose: () => void;
  previewMode?: boolean;
};

export default function ReleaseWaveBonusModal({ visible, onClose, previewMode = false }: Props) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const insets = useSafeAreaInsets();
  const tx = lang === 'es' ? TEXTS.es : TEXTS[lang === 'uk' ? 'uk' : 'ru'];
  const [busy, setBusy] = useState(false);
  const amount = getReleaseWaveBonusLabelAmount();
  const oskolokImage = oskolokImageForPackShards(amount);
  const dimColor = themeMode === 'ocean' || themeMode === 'sakura' ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.62)';

  const shardFloatY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) {
      shardFloatY.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shardFloatY, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(shardFloatY, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible, shardFloatY]);

  /**
   * Клейм идемпотентен. Кнопка «Забрать» — не закрываем при сбое сети (можно тапнуть снова).
   * Тап по фону / back — пробуем клейм и закрываем; flow_closed и persist build пишем
   * только после успешного клейма, иначе при следующем запуске модалка снова предложится.
   */
  const runClaim = async (closeAlways: boolean) => {
    hapticTap();
    if (previewMode) {
      onClose();
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const ok = await claimReleaseWaveBonus();
      if (ok) hapticSuccess();
      if (ok) {
        // Ждём persist до onClose: иначе при быстром сворачивании/убийстве процесса
        // flow_closed в AsyncStorage не успевает записаться — модалка снова на следующем дне.
        await persistNativeBuildIdAfterReleaseWaveFlow();
        onClose();
      } else if (closeAlways) {
        onClose();
      }
    } finally {
      setBusy(false);
    }
  };

  const handlePrimary = () => void runClaim(false);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {
        if (busy) return;
        void runClaim(true);
      }}
    >
      <View style={[styles.root, { backgroundColor: dimColor, paddingBottom: insets.bottom }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            if (busy) return;
            void runClaim(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={tx.ctaPreview}
        />
        <View
          style={[
            styles.card,
            {
              backgroundColor: t.bgCard,
              borderColor: t.accent,
            },
          ]}
        >
          <Text style={styles.emoji}>{'🙏'}</Text>
          <Text style={[styles.title, { color: t.textPrimary }]}>
            {tx.title}
          </Text>
          {/* Чек-лист с эмодзи: выравниваем влево, чтобы галочки шли в столбик ровно;
              у заголовка и блока награды textAlign: 'center' остаётся (см. styles). */}
          <Text style={[styles.body, { color: t.textMuted, fontSize: f.body, lineHeight: 24, marginTop: 12, textAlign: 'left', alignSelf: 'stretch' }]}>
            {tx.body}
          </Text>
          <View
            style={styles.rewardBlock}
            accessibilityLabel={triLang(lang, {
              ru: `Награда ${amount} осколков`,
              uk: `Нагорода ${amount} осколків`,
              es: `Recompensa: ${amount} fragmentos`,
            })}
          >
            <Animated.View
              style={{
                transform: [
                  {
                    translateY: shardFloatY.interpolate({
                      inputRange: [0, 1],
                      outputRange: [5, -5],
                    }),
                  },
                ],
              }}
            >
              <Image
                source={oskolokImage}
                style={styles.oskolokImg}
                resizeMode="contain"
              />
            </Animated.View>
            <Text
              style={[
                styles.rewardLine,
                { color: t.accent, fontSize: f.bodyLg, fontWeight: '800', marginTop: 10 },
              ]}
            >
              {tx.sub(amount)}
            </Text>
            <Text
              style={[
                styles.rewardHint,
                { color: t.textSecond, fontSize: f.caption, marginTop: 4 },
              ]}
            >
              {triLang(lang, {
                ru: 'осколки знаний',
                uk: 'осколки знань',
                es: 'fragmentos de conocimiento',
              })}
            </Text>
          </View>
          <Pressable
            disabled={busy}
            onPress={handlePrimary}
            style={({ pressed }) => [
              styles.btn,
              {
                backgroundColor: t.accent,
                opacity: pressed || busy ? 0.86 : 1,
                marginTop: 24,
              },
            ]}
          >
            {busy && !previewMode ? (
              <ActivityIndicator color={t.correctText} />
            ) : (
              <Text style={{ color: t.correctText, fontSize: f.bodyLg, fontWeight: '800' }}>
                {previewMode ? tx.ctaPreview : tx.cta}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 22,
    alignItems: 'center',
    zIndex: 1,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 4,
  },
  title: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
  },
  body: {
    textAlign: 'center',
  },
  rewardBlock: {
    alignItems: 'center',
    marginTop: 4,
  },
  oskolokImg: {
    width: 120,
    height: 100,
  },
  rewardLine: {
    textAlign: 'center',
  },
  rewardHint: {
    textAlign: 'center',
  },
  btn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    minHeight: 52,
  },
});
