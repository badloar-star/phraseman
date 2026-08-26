import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Polygon, Stop } from 'react-native-svg';
import { triLang, type Lang } from '../../constants/i18n';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { hapticTap } from '../../hooks/use-haptics';
import DuoPressable from '../DuoPressable';
import type { LeagueChestRewardRarity } from '../../app/services/league_chest_rewards';
import type { LeagueHubPalette } from './leagueHubPalette';
import LeagueChestScanTeaser from './LeagueChestScanTeaser';

/**
 * Модал-тизер «Что внутри?»: чёрные силуэты наград со знаками вопроса
 * на фоне вращающихся белых лучей. Открывается тапом по сундуку.
 * Моушн: входы конечные, лучи/покачивание — циклы только пока модал visible
 * (модал размонтируется при закрытии; файл зарегистрирован в runtime_lifecycle_ratchet).
 */

interface LeagueChestTeaserModalProps {
  visible: boolean;
  lang: Lang;
  palette: LeagueHubPalette;
  remainingXp: number;
  canClaim: boolean;
  rarities: LeagueChestRewardRarity[];
  onClaim: () => void;
  onClose: () => void;
  /**
   * зачем: гибрид «Световод + Чекан» (макет .motion-mockups/phraseman-hybrid.html,
   * сцена «Тизер · скан сундука») живёт РЯДОМ со старой версией под флагом.
   * Боевой дефолт — 'classic', ничего не меняется без явного включения.
   */
  motionVariant?: 'classic' | 'hybrid';
  /** Гибрид: мс до вскрытия сундука для тикающего таймера. Дефолт 2 дня 14 часов (правдоподобная демка). */
  opensAtMs?: number;
}

const RARITY_RIM: Record<LeagueChestRewardRarity, string> = {
  common: '#7F8793',
  rare: '#4AA3E2',
  epic: '#A06BE0',
  legendary: '#FFD43B',
};

const RAY_COUNT = 12;
const RAY_R = 260;

function teaserTitle(lang: Lang): string {
  return triLang(lang, { ru: 'Что внутри?', uk: 'Що всередині?', en: "What's inside?", es: '¿Qué hay dentro?', 'pt-BR': 'O que tem dentro?', vi: 'Bên trong có gì?', id: 'Apa isinya?', tr: 'İçinde ne var?', pl: 'Co w środku?' });
}

function teaserSubtitle(lang: Lang): string {
  return triLang(lang, {
    ru: 'Общий сундук недели — награды получают все участники',
    uk: 'Спільна скриня тижня — нагороди отримують усі учасники',
    en: "The week's shared chest — everyone gets a reward",
    es: 'El cofre común de la semana: premios para todos',
    'pt-BR': 'O baú comum da semana: prêmios para todos',
    vi: 'Rương chung của tuần — ai cũng nhận quà',
    id: 'Peti bersama minggu ini — semua dapat hadiah',
    tr: 'Haftanın ortak sandığı — herkese ödül var',
    pl: 'Wspólna skrzynia tygodnia — nagrody dla wszystkich',
  });
}

function teaserRemaining(lang: Lang, xp: number): string {
  // Цель общего сундука — те же очки лиги, то есть руны за неделю
  // (владелец, 2026-08-26: «никакого ХП, только руны»).
  const word = runeWord(lang, xp);
  return triLang(lang, {
    ru: `Осталось ${xp.toLocaleString()} ${word} до открытия`,
    uk: `Залишилося ${xp.toLocaleString()} ${word} до відкриття`,
    en: `${xp.toLocaleString()} ${word} left to unlock`,
    es: `Faltan ${xp.toLocaleString()} ${word} para abrirlo`,
    'pt-BR': `Faltam ${xp.toLocaleString()} ${word} para abrir`,
    vi: `Còn ${xp.toLocaleString()} ${word} nữa để mở`,
    id: `Kurang ${xp.toLocaleString()} ${word} untuk membuka`,
    tr: `Açmak için ${xp.toLocaleString()} ${word} kaldı`,
    pl: `Zostało ${xp.toLocaleString()} ${word} do otwarcia`,
  });
}

function claimLabel(lang: Lang): string {
  return triLang(lang, { ru: 'Забрать бонус', uk: 'Забрати бонус', en: 'Claim bonus', es: 'Recoger bono', 'pt-BR': 'Coletar bônus', vi: 'Nhận phần thưởng', id: 'Ambil bonus', tr: 'Bonusu al', pl: 'Odbierz bonus' });
}

function closeLabel(lang: Lang): string {
  return triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' });
}

function LeagueChestTeaserModalComponent({ visible, lang, palette, remainingXp, canClaim, rarities, onClaim, onClose, motionVariant = 'classic', opensAtMs }: LeagueChestTeaserModalProps) {
  const reduceMotion = useReduceMotion();
  const backdrop = useRef(new Animated.Value(0)).current;
  const raySpin = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;

  // зачем: цикл лучей/покачивания — только у классики; в гибриде своя
  // хореография живёт в LeagueChestScanTeaser, параллель бессмысленна.
  const isClassic = motionVariant === 'classic';

  useEffect(() => {
    if (!visible || !isClassic) return;
    backdrop.setValue(0);
    Animated.timing(backdrop, { toValue: 1, duration: 240, useNativeDriver: true }).start();
    if (reduceMotion) return;

    raySpin.setValue(0);
    bob.setValue(0);
    const spinLoop = Animated.loop(
      Animated.timing(raySpin, { toValue: 1, duration: 24000, easing: Easing.linear, useNativeDriver: true }),
    );
    const bobLoop = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: -4, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(bob, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    spinLoop.start();
    bobLoop.start();
    return () => {
      spinLoop.stop();
      bobLoop.stop();
    };
  }, [visible, isClassic, reduceMotion, backdrop, raySpin, bob]);

  if (!visible) return null;

  if (motionVariant === 'hybrid') {
    return (
      <LeagueChestScanTeaser
        visible={visible}
        lang={lang}
        palette={palette}
        opensAtMs={opensAtMs ?? Date.now() + (2 * 24 + 14) * 3_600_000}
        onClose={onClose}
      />
    );
  }

  const rayRotate = raySpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const backdropOpacity = backdrop.interpolate({ inputRange: [0, 1], outputRange: [0, 0.72] });
  const cardScale = backdrop.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] });
  const cardOpacity = backdrop;

  // Лучи-звёздочка: тонкие треугольники из центра, SVG, вращаются контейнером.
  const rayPolygons = Array.from({ length: RAY_COUNT }, (_, i) => {
    const angle = (i * 360) / RAY_COUNT;
    return (
      <Polygon
        key={angle}
        points={`${RAY_R - 7},${RAY_R - 26} ${RAY_R + 7},${RAY_R - 26} ${RAY_R},0`}
        fill="url(#teaserRay)"
        transform={`rotate(${angle} ${RAY_R} ${RAY_R})`}
      />
    );
  });

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={closeLabel(lang)} accessibilityRole="button" />

        <Animated.View style={[styles.card, { backgroundColor: palette.surface, opacity: cardOpacity, transform: [{ scale: cardScale }] }]} testID="league-chest-teaser">
          <View pointerEvents="none" style={styles.raysWrap}>
            <Animated.View style={{ transform: [{ rotate: rayRotate }] }}>
              <Svg width={RAY_R * 2} height={RAY_R * 2}>
                <Defs>
                  <SvgLinearGradient id="teaserRay" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.16" />
                    <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                  </SvgLinearGradient>
                </Defs>
                {rayPolygons}
              </Svg>
            </Animated.View>
          </View>

          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={closeLabel(lang)} style={styles.closeBtn} hitSlop={10}>
            <Ionicons name="close" size={20} color={palette.muted} />
          </Pressable>

          <Text style={[styles.title, { color: palette.text }]}>{teaserTitle(lang)}</Text>
          <Text style={[styles.subtitle, { color: palette.muted }]}>{teaserSubtitle(lang)}</Text>

          <View style={styles.grid}>
            {rarities.map((rarity, index) => (
              <Reanimated.View
                key={`${rarity}-${index}`}
                entering={reduceMotion ? undefined : FadeInDown.delay(160 + index * 80).duration(320).springify()}
              >
                {/* зачем: без обводок — кромка редкости тоном (внешний слой = цвет редкости) */}
                <Animated.View style={[styles.box, { backgroundColor: RARITY_RIM[rarity], transform: [{ translateY: bob }] }]}>
                  <View style={[styles.boxInner, { backgroundColor: palette.elevated }]}>
                    <Ionicons name="gift" size={26} color="rgba(255,255,255,0.14)" />
                    <Text style={[styles.question, { color: RARITY_RIM[rarity] }]}>?</Text>
                  </View>
                  <View style={[styles.rarityDot, { backgroundColor: RARITY_RIM[rarity] }]} />
                </Animated.View>
              </Reanimated.View>
            ))}
          </View>

          {canClaim ? (
            <DuoPressable
              accessibilityLabel={claimLabel(lang)}
              onPress={onClaim}
              edgeColor={palette.surface}
              edgeHeight={4}
              style={[styles.claimBtn, { backgroundColor: palette.accent }]}
            >
              <Text style={[styles.claimText, { color: palette.accentText }]}>{claimLabel(lang)}</Text>
              <Ionicons name="gift" size={18} color={palette.accentText} />
            </DuoPressable>
          ) : (
            <Text style={[styles.remaining, { color: palette.muted }]}>{teaserRemaining(lang, remainingXp)}</Text>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

export const LeagueChestTeaserModal = memo(LeagueChestTeaserModalComponent);

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000' },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 20,
    alignItems: 'center',
    overflow: 'hidden',
  },
  raysWrap: {
    position: 'absolute',
    top: -RAY_R + 120,
    left: '50%',
    marginLeft: -RAY_R,
    width: RAY_R * 2,
    height: RAY_R * 2,
    opacity: 0.9,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.2, textAlign: 'center' },
  subtitle: { fontSize: 12.5, fontWeight: '700', textAlign: 'center', marginTop: 6, lineHeight: 18, maxWidth: 290 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 20 },
  box: { width: 74, height: 74, borderRadius: 18, padding: 2, position: 'relative' },
  boxInner: { flex: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  question: { position: 'absolute', fontSize: 30, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  rarityDot: { position: 'absolute', top: -4, right: -4, width: 12, height: 12, borderRadius: 6 },
  claimBtn: {
    marginTop: 22,
    minHeight: 50,
    borderRadius: 17,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'stretch',
  },
  claimText: { fontSize: 16, fontWeight: '700' },
  remaining: { marginTop: 20, fontSize: 13, fontWeight: '700', textAlign: 'center' },
});
