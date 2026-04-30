import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLang } from '../components/LangContext';
import { getVolumetricShadow, useTheme } from '../components/ThemeContext';
import { hapticSoftImpact, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { triLang, type Lang } from '../constants/i18n';
import {
  buildMarketplaceOwnedCards,
  bundledPacksForOwned,
  fallbackBundledMarketPacks,
  loadMarketplacePacks,
  peekWarmMarketplacePacks,
  packTitleForInterface,
  type FlashcardMarketPack,
} from './flashcards/marketplace';
import {
  isPackCeremoniallyOpened,
  markPackCeremoniallyOpened,
} from './flashcards/openedPacksTracker';
import { fetchCommunityPackCards, fetchCommunityPackMeta } from './community_packs/communityFirestore';
import { bundledPackTilePng } from './flashcards/packMarketplaceIcons';
import type { CardItem } from './flashcards/types';
import { resolveFlashcardBackText, type FlashcardContentLang } from './flashcards/types';

function flashLang(l: Lang): FlashcardContentLang {
  if (l === 'uk') return 'uk';
  if (l === 'es') return 'es';
  return 'ru';
}

const { width: WIN_W, height: WIN_H } = Dimensions.get('window');

const CONFETTI_COLORS = ['#FFD700', '#34C759', '#007AFF', '#FF3B30', '#AF52DE', '#FF9500'];

// ────────────────────────────────────────────────────────────────────────────
// Confetti — використовуємо ті самі частинки, що й у ClubResultModal
// ────────────────────────────────────────────────────────────────────────────
function ConfettiPiece({ color, delay, startX }: { color: string; delay: number; startX: number }) {
  const y = useRef(new Animated.Value(-20)).current;
  const rot = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(y, {
          toValue: WIN_H + 20,
          duration: 2200 + Math.random() * 800,
          useNativeDriver: true,
        }),
        Animated.timing(rot, { toValue: 1080, duration: 2000, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(1600),
          Animated.timing(op, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [delay, y, rot, op]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: startX,
        width: 8,
        height: 8,
        borderRadius: 2,
        backgroundColor: color,
        opacity: op,
        transform: [
          { translateY: y },
          { rotate: rot.interpolate({ inputRange: [0, 1080], outputRange: ['0deg', '1080deg'] }) },
        ],
      }}
    />
  );
}

function ConfettiBurst({ count = 28 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        key: i,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: Math.floor(Math.random() * 600),
        startX: Math.floor(Math.random() * WIN_W),
      })),
    [count],
  );
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p) => (
        <ConfettiPiece key={p.key} color={p.color} delay={p.delay} startX={p.startX} />
      ))}
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// FlippableCard — одна карточка з 3D flip-анімацією
// ────────────────────────────────────────────────────────────────────────────

interface FlippableCardProps {
  card: CardItem;
  index: number;
  cardWidth: number;
  cardHeight: number;
  packIcon?: any;
  accent: string;
  flipped: boolean;
  onFlip: (index: number) => void;
  lang: Lang;
}

function FlippableCard({
  card,
  index,
  cardWidth,
  cardHeight,
  packIcon,
  accent,
  flipped,
  onFlip,
  lang,
}: FlippableCardProps) {
  const { theme: t, themeMode, f } = useTheme();
  const rotate = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  // Idle pulse на «рубашці» — м’яке дихання
  useEffect(() => {
    if (flipped) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [flipped, pulse]);

  // Flip-анімація при зміні `flipped`
  useEffect(() => {
    if (!flipped) return;
    Animated.sequence([
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1.12,
          duration: 160,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: 1,
          duration: 420,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(scale, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(glow, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [flipped, rotate, scale, glow]);

  const onPress = useCallback(() => {
    if (flipped) return;
    void hapticSoftImpact();
    onFlip(index);
  }, [flipped, onFlip, index]);

  const frontInterp = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backInterp = rotate.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });

  const frontTransform = {
    transform: [
      { perspective: 1000 },
      { scale: flipped ? scale : pulseScale },
      { rotateY: frontInterp },
    ],
  };
  const backTransform = {
    transform: [
      { perspective: 1000 },
      { scale },
      { rotateY: backInterp },
    ],
  };

  return (
    <Pressable onPress={onPress} disabled={flipped}>
      <View style={{ width: cardWidth, height: cardHeight, marginBottom: 14 }}>
        {/* Glow halo при відкритті */}
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderRadius: 18,
              backgroundColor: accent,
              opacity: glowOpacity,
              transform: [{ scale: 1.18 }],
            },
          ]}
        />

        {/* Рубашка карточки */}
        <Animated.View
          style={[
            styles.cardFace,
            frontTransform,
            {
              backgroundColor: t.bgCard,
              borderColor: accent,
              ...getVolumetricShadow(themeMode, t, 2),
            },
          ]}
        >
          <LinearGradient
            colors={[accent, t.bgCard]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFillObject, { borderRadius: 16, opacity: 0.35 }]}
          />
          {packIcon ? (
            <Image source={packIcon} style={styles.cardBackIcon} contentFit="contain" />
          ) : (
            <Ionicons name="albums-outline" size={42} color={accent} />
          )}
          <Text style={[styles.cardBackHint, { color: t.textMuted, fontSize: f.label }]}>
            {triLang(lang, {
              ru: 'Нажми, чтобы открыть',
              uk: 'Натисни, щоб відкрити',
              es: 'Toca para abrir',
            })}
          </Text>
        </Animated.View>

        {/* Лицевая сторона */}
        <Animated.View
          style={[
            styles.cardFace,
            backTransform,
            styles.cardFaceFront,
            {
              backgroundColor: t.bgCard,
              borderColor: accent,
              ...getVolumetricShadow(themeMode, t, 2),
            },
          ]}
        >
          <Text
            style={[styles.cardEN, { color: t.textPrimary, fontSize: f.h3 }]}
            numberOfLines={2}
            adjustsFontSizeToFit
          >
            {card.en}
          </Text>
          <View style={[styles.cardSep, { backgroundColor: t.borderLight }]} />
          <Text
            style={[styles.cardRU, { color: t.textSecond, fontSize: f.body }]}
            numberOfLines={3}
          >
            {resolveFlashcardBackText(card, flashLang(lang))}
          </Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Pack Opening Screen
// ────────────────────────────────────────────────────────────────────────────

const GRID_COLS = 2;
const H_PADDING = 16;
const GRID_GAP = 12;

export default function PackOpeningScreen() {
  const { theme: t, themeMode, f } = useTheme();
  const { lang } = useLang();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ packId?: string }>();
  const packId = typeof params.packId === 'string' ? params.packId : '';

  const [pack, setPack] = useState<FlashcardMarketPack | null>(null);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [flippedSet, setFlippedSet] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revealAll, setRevealAll] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const onBackPress = () => {
      router.replace('/(tabs)/home' as any);
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [router]);

  // ── Завантаження мета пака + карток ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!packId) {
        setError(triLang(lang, { ru: 'Неизвестный набор', uk: 'Невідомий набір', es: 'Paquete desconocido' }));
        setLoading(false);
        return;
      }
      try {
        // 1) Спочатку перевіряємо bundled
        const warm = peekWarmMarketplacePacks() ?? fallbackBundledMarketPacks();
        let foundPack = warm.find((p) => p.id === packId) ?? null;

        if (!foundPack) {
          const all = await loadMarketplacePacks();
          foundPack = all.find((p) => p.id === packId) ?? null;
        }

        // 2) UGC → дотягуємо метадані з Firestore
        if (!foundPack) {
          foundPack = await fetchCommunityPackMeta(packId);
        }

        if (!foundPack) {
          if (!cancelled) {
            setError(triLang(lang, { ru: 'Набор не найден', uk: 'Набір не знайдено', es: 'Paquete no encontrado' }));
            setLoading(false);
          }
          return;
        }

        // 3) Картки
        let packCards: CardItem[] = [];
        if (foundPack.isCommunityUgc) {
          packCards = await fetchCommunityPackCards(packId);
        } else {
          const owned = bundledPacksForOwned([packId]);
          packCards =
            owned.length > 0 ? buildMarketplaceOwnedCards(owned) : buildMarketplaceOwnedCards([foundPack]);
        }

        if (cancelled) return;
        setPack(foundPack);
        setCards(packCards);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError(triLang(lang, { ru: 'Ошибка загрузки', uk: 'Помилка завантаження', es: 'Error al cargar' }));
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [packId, lang]);

  // ── Конфетті + помітка про церемонію коли всі відкриті ─────────────────────
  useEffect(() => {
    if (cards.length === 0) return;
    if (flippedSet.size < cards.length) return;
    setShowConfetti(true);
    void hapticSuccess();
    void markPackCeremoniallyOpened(packId);
    const timer = setTimeout(() => setShowConfetti(false), 3500);
    return () => clearTimeout(timer);
  }, [flippedSet, cards.length, packId]);

  const onFlipOne = useCallback((idx: number) => {
    setFlippedSet((prev) => {
      if (prev.has(idx)) return prev;
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
  }, []);

  const onRevealAll = useCallback(() => {
    if (revealAll) return;
    setRevealAll(true);
    void hapticTap();
    // Каскад розкриття інших карток із 80мс затримкою
    let delay = 0;
    cards.forEach((_, idx) => {
      setTimeout(() => onFlipOne(idx), delay);
      delay += 80;
    });
  }, [cards, revealAll, onFlipOne]);

  const onGoToCards = useCallback(() => {
    void hapticTap();
    router.replace({ pathname: '/flashcards_collection', params: { pack: packId } } as any);
  }, [router, packId]);

  const cardWidth = useMemo(
    () => Math.floor((WIN_W - H_PADDING * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS),
    [],
  );
  const cardHeight = Math.round(cardWidth * 1.35);

  const accent = t.accent ?? '#5CC8FF';
  const tile = pack ? bundledPackTilePng(pack.id) : undefined;

  const opened = flippedSet.size;
  const total = cards.length;
  const allOpened = total > 0 && opened >= total;

  // ── Loading / error ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.fillCenter, { backgroundColor: t.bgPrimary }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: t.textMuted, fontSize: f.body }}>
          {triLang(lang, { ru: 'Готовим набор…', uk: 'Готуємо набір…', es: 'Preparando el paquete…' })}
        </Text>
      </View>
    );
  }

  if (error || !pack) {
    return (
      <View style={[styles.fillCenter, { backgroundColor: t.bgPrimary }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: t.textMuted, fontSize: f.body, marginBottom: 16 }}>
          {error ?? triLang(lang, { ru: 'Набор не найден', uk: 'Набір не знайдено', es: 'Paquete no encontrado' })}
        </Text>
        <Pressable
          onPress={() => router.replace('/(tabs)/home' as any)}
          style={[styles.primaryBtn, { backgroundColor: accent }]}
        >
          <Text style={{ color: '#fff', fontSize: f.body, fontWeight: '700' }}>
            {triLang(lang, { ru: 'Назад', uk: 'Назад', es: 'Atrás' })}
          </Text>
        </Pressable>
      </View>
    );
  }

  const title = packTitleForInterface(pack, flashLang(lang));

  return (
    <View style={{ flex: 1, backgroundColor: t.bgPrimary }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Заголовок */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.replace('/flashcards')} hitSlop={12}>
          <Ionicons name="close" size={26} color={t.textMuted} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.headerTitle, { color: t.textPrimary, fontSize: f.h3 }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.headerSub, { color: t.textMuted, fontSize: f.label }]}>
            {triLang(lang, {
              ru: `Открыто ${opened} из ${total}`,
              uk: `Відкрито ${opened} з ${total}`,
              es: `${opened} de ${total} abiertas`,
            })}
          </Text>
        </View>
        <View style={{ width: 26 }} />
      </View>

      {/* Прогрес-бар */}
      <View style={[styles.progressTrack, { backgroundColor: t.borderLight }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: accent,
              width: total > 0 ? `${Math.round((opened / total) * 100)}%` : '0%',
            },
          ]}
        />
      </View>

      {/* Підказка зверху коли ще нічого не відкрив */}
      {opened === 0 && (
        <View style={styles.hint}>
          <Text style={[styles.hintText, { color: t.textMuted, fontSize: f.body }]}>
            {triLang(lang, {
              ru: '💡 Нажми на карточку, чтобы открыть',
              uk: '💡 Натисни на картку, щоб відкрити',
              es: '💡 Toca una tarjeta para abrirla',
            })}
          </Text>
        </View>
      )}

      {/* Сітка карточок */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: H_PADDING,
          paddingTop: 12,
          paddingBottom: 140,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {cards.map((card, idx) => (
            <FlippableCard
              key={card.id ?? `${packId}_${idx}`}
              card={card}
              index={idx}
              cardWidth={cardWidth}
              cardHeight={cardHeight}
              packIcon={tile}
              accent={accent}
              flipped={flippedSet.has(idx)}
              onFlip={onFlipOne}
              lang={lang}
            />
          ))}
        </View>
      </ScrollView>

      {/* Низова панель з кнопками */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: t.bgPrimary,
            borderTopColor: t.borderLight,
            paddingBottom: insets.bottom + 14,
          },
        ]}
      >
        {!allOpened ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={onRevealAll}
              style={[styles.secondaryBtn, { borderColor: accent }]}
            >
              <Text style={{ color: accent, fontSize: f.body, fontWeight: '600' }}>
                {triLang(lang, {
                  ru: 'Открыть все',
                  uk: 'Відкрити всі',
                  es: 'Abrir todas',
                })}
              </Text>
            </Pressable>
            <Pressable
              onPress={onGoToCards}
              style={[styles.primaryBtn, { backgroundColor: accent, flex: 1 }]}
            >
              <Text style={{ color: '#fff', fontSize: f.body, fontWeight: '700' }}>
                {triLang(lang, {
                  ru: 'Перейти к карточкам',
                  uk: 'Перейти до карток',
                  es: 'Ir a las tarjetas',
                })}
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={onGoToCards}
            style={[styles.primaryBtn, { backgroundColor: accent }]}
          >
            <Text style={{ color: '#fff', fontSize: f.bodyLg, fontWeight: '700' }}>
              {triLang(lang, {
                ru: '🎉 Начать учить',
                uk: '🎉 Почати вчити',
                es: '🎉 Empezar a estudiar',
              })}
            </Text>
          </Pressable>
        )}
      </View>

      {showConfetti && <ConfettiBurst count={32} />}
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  fillCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: { fontWeight: '700' },
  headerSub: { marginTop: 2 },
  progressTrack: {
    height: 4,
    marginHorizontal: 16,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  hint: { paddingTop: 14, alignItems: 'center' },
  hintText: { textAlign: 'center' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardFace: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    borderWidth: 1.5,
    backfaceVisibility: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    overflow: 'hidden',
  },
  cardFaceFront: {
    justifyContent: 'flex-start',
    paddingTop: 18,
  },
  cardBackIcon: { width: '60%', height: '50%' },
  cardBackHint: { marginTop: 10, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardEN: { fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  cardTr: { fontStyle: 'italic', textAlign: 'center', marginBottom: 8 },
  cardSep: { width: '70%', height: 1, marginVertical: 8, alignSelf: 'center', opacity: 0.5 },
  cardRU: { textAlign: 'center', marginTop: 4 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  secondaryBtn: {
    height: 52,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
});
