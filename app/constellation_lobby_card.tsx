// ════════════════════════════════════════════════════════════════════════════
// constellation_lobby_card.tsx — hero-карточка «Созвездий» в лобби арены (F1).
//
// Positioning управляется флагами (I1): secondary/primary/only — решает
// arena_lobby.tsx, карточка сама только рисует и зовёт onPress. Мини-фон неба —
// СТАТИЧНЫЕ звёзды (без бесконечных анимаций — Performance Bible; «живость»
// даёт градиент + свечение точек), никаких подписок и таймеров.
// ════════════════════════════════════════════════════════════════════════════

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import DuoPressable from '../components/DuoPressable';
import { useTheme } from '../components/ThemeContext';
import { triLang, type Lang } from '../constants/i18n';

interface ConstellationLobbyCardProps {
  lang: Lang;
  onPress: () => void;
  /** primary/only — карточка крупнее (главная кнопка арены). */
  prominent?: boolean;
}

/** Детеминированные «звёзды» фона: без Math.random в рендере. */
const CARD_STARS: ReadonlyArray<{ x: number; y: number; size: number; opacity: number }> = [
  { x: 8, y: 22, size: 2, opacity: 0.9 }, { x: 18, y: 64, size: 1.5, opacity: 0.5 },
  { x: 27, y: 18, size: 1.5, opacity: 0.6 }, { x: 36, y: 70, size: 2, opacity: 0.8 },
  { x: 47, y: 30, size: 1.5, opacity: 0.5 }, { x: 56, y: 58, size: 2.5, opacity: 0.9 },
  { x: 66, y: 20, size: 1.5, opacity: 0.55 }, { x: 74, y: 66, size: 2, opacity: 0.7 },
  { x: 84, y: 34, size: 1.5, opacity: 0.6 }, { x: 92, y: 56, size: 2, opacity: 0.85 },
  { x: 13, y: 44, size: 1, opacity: 0.4 }, { x: 62, y: 42, size: 1, opacity: 0.4 },
  { x: 88, y: 14, size: 1, opacity: 0.45 }, { x: 41, y: 12, size: 1, opacity: 0.4 },
];

// Линии мини-созвездия между «звёздами» фона (индексы CARD_STARS).
const CARD_LINKS: ReadonlyArray<[number, number]> = [[0, 2], [2, 4], [4, 5], [5, 7], [7, 9]];

function ConstellationLobbyCardInner({ lang, onPress, prominent = false }: ConstellationLobbyCardProps) {
  const { theme: t, f } = useTheme();

  const title = triLang(lang, {
    ru: 'Созвездия', uk: 'Сузір’я', es: 'Constelaciones', 'pt-BR': 'Constelações',
    vi: 'Chòm sao', id: 'Rasi bintang', tr: 'Takımyıldızlar', pl: 'Gwiazdozbiory',
  });
  const subtitle = triLang(lang, {
    ru: '4 игрока · захвати ночное небо',
    uk: '4 гравці · захопи нічне небо',
    es: '4 jugadores · conquista el cielo',
    'pt-BR': '4 jogadores · conquiste o céu',
    vi: '4 người chơi · chiếm bầu trời',
    id: '4 pemain · kuasai langit',
    tr: '4 oyuncu · gökyüzünü fethet',
    pl: '4 graczy · podbij niebo',
  });
  const cta = triLang(lang, {
    ru: 'Играть', uk: 'Грати', es: 'Jugar', 'pt-BR': 'Jogar',
    vi: 'Chơi', id: 'Main', tr: 'Oyna', pl: 'Graj',
  });
  const badge = triLang(lang, {
    ru: 'НОВЫЙ РЕЖИМ', uk: 'НОВИЙ РЕЖИМ', es: 'NUEVO MODO', 'pt-BR': 'NOVO MODO',
    vi: 'CHẾ ĐỘ MỚI', id: 'MODE BARU', tr: 'YENİ MOD', pl: 'NOWY TRYB',
  });
  // Созвездия — dev-фича, доступна только тестерам. Явно помечаем «БЕТА».
  const betaBadge = triLang(lang, {
    ru: 'БЕТА', uk: 'БЕТА', es: 'BETA', 'pt-BR': 'BETA',
    vi: 'BETA', id: 'BETA', tr: 'BETA', pl: 'BETA',
  });

  // Тёмное небо поверх темы: полупрозрачный чёрный градиент — выглядит нативно
  // во всех 8 темах (базовый тон темы просвечивает по краям).
  const skyColors = useMemo(
    () => ['rgba(6,10,26,0.92)', 'rgba(14,20,44,0.88)', 'rgba(8,12,30,0.94)'] as const,
    [],
  );

  return (
    <DuoPressable
      testID="constellation-lobby-card"
      accessibilityLabel="qa-constellation-lobby-card"
      accessible
      accessibilityRole="button"
      onPress={onPress}
      edgeColor={`${t.accent}66`}
      wrapStyle={styles.wrap}
      style={[styles.card, prominent && styles.cardProminent, { borderColor: `${t.accent}44` }]}
    >
      <LinearGradient colors={skyColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {/* Статичные звёзды + линии мини-созвездия */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {CARD_LINKS.map(([a, b], i) => {
          const sa = CARD_STARS[a];
          const sb = CARD_STARS[b];
          const dx = sb.x - sa.x;
          const dy = sb.y - sa.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          return (
            <View
              key={`l${i}`}
              style={{
                position: 'absolute',
                left: `${sa.x}%`,
                top: `${sa.y}%`,
                width: `${len}%`,
                height: 1,
                backgroundColor: `${t.accent}2E`,
                transform: [{ rotate: `${angle}deg` }],
                transformOrigin: 'left center',
              }}
            />
          );
        })}
        {CARD_STARS.map((s, i) => (
          <View
            key={`s${i}`}
            style={{
              position: 'absolute',
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.size * 2,
              height: s.size * 2,
              borderRadius: s.size,
              backgroundColor: '#EAF2FF',
              opacity: s.opacity,
              shadowColor: '#9CC2FF',
              shadowOpacity: 0.9,
              shadowRadius: 3,
              shadowOffset: { width: 0, height: 0 },
            }}
          />
        ))}
      </View>

      <View style={styles.row}>
        <View style={styles.textWrap}>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: `${t.accent}26`, borderColor: `${t.accent}55` }]}>
              <Text style={[styles.badgeText, { color: t.accent, fontSize: f.caption - 2 }]}>{badge}</Text>
            </View>
            {/* Бета: жёлто-янтарная плашка — визуально «экспериментально». */}
            <View style={[styles.badge, { backgroundColor: 'rgba(255,196,0,0.18)', borderColor: 'rgba(255,196,0,0.6)' }]}>
              <Text style={[styles.badgeText, { color: '#FFD24A', fontSize: f.caption - 2 }]}>{betaBadge}</Text>
            </View>
          </View>
          <Text style={[styles.title, { color: '#F4F7FF', fontSize: prominent ? f.h2 + 3 : f.h2 }]}>
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: 'rgba(226,234,255,0.72)', fontSize: f.caption }]}>
            {subtitle}
          </Text>
        </View>
        <View style={[styles.ctaPill, { backgroundColor: t.accent }]}>
          <Text style={[styles.ctaText, { color: t.correctText, fontSize: f.sub }]}>{cta}</Text>
          <Ionicons name="arrow-forward" size={16} color={t.correctText} />
        </View>
      </View>
    </DuoPressable>
  );
}

export const ConstellationLobbyCard = memo(ConstellationLobbyCardInner);

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    marginTop: 10,
  },
  card: {
    borderRadius: 20,
    borderWidth: 0,
    paddingVertical: 16,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  cardProminent: {
    paddingVertical: 22,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textWrap: {
    flex: 1,
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  title: {
    fontWeight: '900',
  },
  subtitle: {
    fontWeight: '600',
  },
  ctaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  ctaText: {
    fontWeight: '900',
  },
});
