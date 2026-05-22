// Модалка разового бонуса осколков за волну релиза (см. config RELEASE_WAVE_BONUS_VERSION).
// Без анимации opacity на оверлее; у осколка — только transform (useNativeDriver), без сбоев на Fabric.
import React, { useEffect, useRef, useState } from 'react';
import { LinearGradient } from './SafeLinearGradient';
import { Animated, Easing, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
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
import {
  RewardModalBackdrop,
  rewardModalAccentColor,
  rewardModalPanelBorder,
  rewardModalPanelColors,
  rewardModalPrimaryButtonColors,
  rewardModalPrimaryButtonText,
  rewardModalSoftSurface,
} from './RewardModalBackdrop';

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
  'pt-BR': {
    title: 'Lista de tarefas:',
    body:
      '✅ Corrigir a Arena\n' +
      '✅ Adicionar bônus por amigos\n' +
      '✅ Melhorar o treino de preposições\n' +
      '⏳ Entregar fragmentos para todos\n' +
      '← é exatamente disso que estamos cuidando agora.',
    sub: (n: number) => `+${n} fragmentos de conhecimento`,
    cta: 'Resgatar',
    ctaPreview: 'Fechar',
  },
  vi: {
    title: 'Danh sách việc cần làm:',
    body:
      '✅ Sửa Arena\n' +
      '✅ Thêm thưởng khi mời bạn bè\n' +
      '✅ Nâng cấp luyện giới từ\n' +
      '⏳ Phát mảnh kiến thức cho mọi người\n' +
      '← đây chính là việc chúng tôi đang làm lúc này.',
    sub: (n: number) => `+${n} mảnh kiến thức`,
    cta: 'Nhận',
    ctaPreview: 'Đóng',
  },
  'id': {
    title: 'Daftar tugas:',
    body:
      '✅ Memperbaiki Arena\n' +
      '✅ Menambahkan bonus teman\n' +
      '✅ Meningkatkan latihan preposisi\n' +
      '⏳ Membagikan shard untuk semua\n' +
      '← ini yang sedang kami kerjakan sekarang.',
    sub: (n: number) => `+${n} shard pengetahuan`,
    cta: 'Ambil',
    ctaPreview: 'Tutup',
  },
  tr: {
    title: 'Yapılacaklar:',
    body:
      '✅ Arena’yı düzelt\n' +
      '✅ Arkadaş bonusları ekle\n' +
      '✅ Edat antrenmanını güçlendir\n' +
      '⏳ Herkese parça dağıt\n' +
      '← tam şu anda bununla ilgileniyoruz.',
    sub: (n: number) => `+${n} bilgi parçası`,
    cta: 'Al',
    ctaPreview: 'Kapat',
  },
  pl: {
    title: 'Lista zadań:',
    body:
      '✅ Naprawić Arenę\n' +
      '✅ Dodać bonusy za znajomych\n' +
      '✅ Ulepszyć trening przyimków\n' +
      '⏳ Rozdać wszystkim odłamki\n' +
      '← właśnie tym się teraz zajmujemy.',
    sub: (n: number) => `+${n} odłamków wiedzy`,
    cta: 'Odbierz',
    ctaPreview: 'Zamknij',
  },
} as const;

const pickReleaseWaveText = (lang: string) => TEXTS[lang as keyof typeof TEXTS] ?? TEXTS.ru;

type Props = {
  visible: boolean;
  onClose: () => void;
  previewMode?: boolean;
};

export default function ReleaseWaveBonusModal({ visible, onClose, previewMode = false }: Props) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const insets = useSafeAreaInsets();
  const tx = pickReleaseWaveText(lang);
  const [busy, setBusy] = useState(false);
  const amount = getReleaseWaveBonusLabelAmount();
  const oskolokImage = oskolokImageForPackShards(amount);
  const dimColor = 'rgba(0,0,0,0.62)';
  const modalAccent = rewardModalAccentColor(themeMode, t);
  const primaryButtonColors = rewardModalPrimaryButtonColors(themeMode);

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
        <RewardModalBackdrop themeMode={themeMode} intensity="strong" />
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
              backgroundColor: 'transparent',
              borderColor: rewardModalPanelBorder(themeMode, t),
              shadowColor: modalAccent,
            },
          ]}
        >
          <LinearGradient
            colors={rewardModalPanelColors(themeMode, t)}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
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
            style={[
              styles.rewardBlock,
              {
                backgroundColor: rewardModalSoftSurface(themeMode, t),
                borderColor: rewardModalPanelBorder(themeMode, t),
              },
            ]}
            accessibilityLabel={triLang(lang, {
              ru: `Награда ${amount} осколков`,
              uk: `Нагорода ${amount} осколків`,
              es: `Recompensa: ${amount} fragmentos`,
              'pt-BR': `Recompensa: ${amount} fragmentos`,
              vi: `Phần thưởng: ${amount} mảnh`,
              id: `Hadiah: ${amount} fragmen`,
              tr: `Ödül: ${amount} parça`,
              pl: `Nagroda: ${amount} odłamków`,
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
                { color: modalAccent, fontSize: f.bodyLg, fontWeight: '800', marginTop: 10 },
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
                'pt-BR': 'fragmentos de conhecimento',
                vi: 'mảnh kiến thức',
                id: 'fragmen pengetahuan',
                tr: 'bilgi parçaları',
                pl: 'odłamki wiedzy',
              })}
            </Text>
          </View>
          <Pressable
            disabled={busy}
            onPress={handlePrimary}
            style={({ pressed }) => [
              styles.btn,
              {
                opacity: pressed || busy ? 0.86 : 1,
                marginTop: 24,
              },
            ]}
          >
            {false && busy && !previewMode ? (
              <View />
            ) : (
              <LinearGradient
                colors={primaryButtonColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.btnGradient}
              >
                <Text style={{ color: rewardModalPrimaryButtonText(themeMode), fontSize: f.bodyLg, fontWeight: '800' }}>
                  {previewMode ? tx.ctaPreview : tx.cta}
                </Text>
              </LinearGradient>
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
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.24,
    shadowRadius: 26,
    elevation: 18,
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
    alignSelf: 'stretch',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
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
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    minHeight: 52,
  },
  btnGradient: {
    width: '100%',
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
});
