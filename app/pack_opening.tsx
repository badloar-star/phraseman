import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from '../components/SafeLinearGradient';
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
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useStudyTarget } from '../components/StudyTargetContext';
import { getVolumetricShadow, useTheme } from '../components/ThemeContext';
import { hapticSoftImpact, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { triLang, type Lang } from '../constants/i18n';
import {
  buildMarketplaceOwnedCards,
  bundledPacksForOwned,
  reserveBundledMarketPacks,
  loadMarketplacePacks,
  peekWarmMarketplacePacks,
  packTitleForInterface,
  type FlashcardMarketPack,
} from './flashcards/marketplace';
import {
  markPackCeremoniallyOpened,
} from './flashcards/openedPacksTracker';
import { fetchCommunityPackCards, fetchCommunityPackMeta } from './community_packs/communityFirestore';
import { packTileImageForPack } from './flashcards/packMarketplaceIcons';
import { resolveFlashcardBackText, type CardItem, type FlashcardContentLang } from './flashcards/types';
import { flashcardContentLang } from './spanish_content_gate';
import {
  flashcardsCommunityPacksAvailableForTarget,
  flashcardsOfficialPacksAvailableForTarget,
  frenchFlashcardsGateCopy,
} from './flashcards_target_gate';
import BouncyScrollView from '../components/BouncyScrollView';

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
// FlippableCard — atomic reveal without separate front/back compositor layers
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
  cardLang: FlashcardContentLang;
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
  cardLang,
}: FlippableCardProps) {
  const { theme: t, themeMode, f } = useTheme();
  const flipProgress = useRef(new Animated.Value(flipped ? 1 : 0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const previousFlipped = useRef(flipped);

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

  useEffect(() => {
    const wasFlipped = previousFlipped.current;
    previousFlipped.current = flipped;

    flipProgress.stopAnimation();
    glow.stopAnimation();

    if (!flipped) {
      flipProgress.setValue(0);
      glow.setValue(0);
      return;
    }

    if (wasFlipped) {
      flipProgress.setValue(1);
      glow.setValue(0);
      return;
    }

    flipProgress.setValue(0);
    glow.setValue(0);

    const openFlip = Animated.parallel([
      Animated.timing(flipProgress, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 130,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 520,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]);

    openFlip.start();
    return () => {
      openFlip.stop();
    };
  }, [flipped, flipProgress, glow]);

  const onPress = useCallback(() => {
    if (flipped) return;
    void hapticSoftImpact();
    onFlip(index);
  }, [flipped, onFlip, index]);

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });
  const flipScale = flipProgress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.04, 1] });
  const flipLift = flipProgress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -5, 0] });
  const cardBackRotate = flipProgress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const cardContentRotate = flipProgress.interpolate({ inputRange: [0, 1], outputRange: ['-180deg', '0deg'] });
  const cardBackOpacity = flipProgress.interpolate({
    inputRange: [0, 0.499, 0.501, 1],
    outputRange: [1, 1, 0, 0],
  });
  const cardContentOpacity = flipProgress.interpolate({
    inputRange: [0, 0.499, 0.501, 1],
    outputRange: [0, 0, 1, 1],
  });

  const cardTransform = {
    transform: [
      { scale: flipped ? flipScale : pulseScale },
      { translateY: flipLift },
    ],
  };
  const faceChrome = {
    backgroundColor: t.bgCard,
    borderColor: accent,
    ...getVolumetricShadow(themeMode, t, 2),
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

        <Animated.View
          style={[
            styles.cardFlipShell,
            cardTransform,
          ]}
        >
          <Animated.View
            style={[
              styles.cardFace,
              styles.cardFaceFront,
              faceChrome,
              {
                opacity: cardContentOpacity,
                transform: [{ perspective: 900 }, { rotateY: cardContentRotate }],
              },
            ]}
          >
            <>
              <Text
                style={[styles.cardEN, { color: t.textPrimary, fontSize: f.h3 }]}
                numberOfLines={2}
              >
                {card.en}
              </Text>
              <View style={[styles.cardSep, { backgroundColor: t.borderLight }]} />
              <Text
                style={[styles.cardRU, { color: t.textSecond, fontSize: f.body }]}
                numberOfLines={3}
              >
                {resolveFlashcardBackText(card, cardLang)}
              </Text>
            </>
          </Animated.View>

          <Animated.View
            style={[
              styles.cardFace,
              faceChrome,
              {
                opacity: cardBackOpacity,
                transform: [{ perspective: 900 }, { rotateY: cardBackRotate }],
              },
            ]}
          >
            <>
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
                  'pt-BR': 'Toque para abrir',
                  vi: 'Chạm để mở',
                  id: 'Ketuk untuk membuka',
                  tr: 'Açmak için dokun',
                  pl: 'Stuknij, aby otworzyć',
                })}
              </Text>
            </>
          </Animated.View>
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
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
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

  const packUiLang: Parameters<typeof packTitleForInterface>[1] = lang;
  const cardContentLang = useMemo(() => flashcardContentLang(lang, studyTarget), [lang, studyTarget]);
  const officialPacksEnabled = flashcardsOfficialPacksAvailableForTarget(studyTarget);
  const communityPacksEnabled = flashcardsCommunityPacksAvailableForTarget(studyTarget);

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
        setError(triLang(lang, { ru: 'Неизвестный набор', uk: 'Невідомий набір', es: 'Paquete desconocido', 'pt-BR': 'Pack desconhecido', vi: 'Bộ không xác định', id: 'Pack tidak dikenal', tr: 'Bilinmeyen paket', pl: 'Nieznany pakiet' }));
        setLoading(false);
        return;
      }
      if (!officialPacksEnabled && !communityPacksEnabled) {
        setError(frenchFlashcardsGateCopy(lang).body);
        setLoading(false);
        return;
      }
      try {
        // 1) Спочатку перевіряємо bundled, але тільки коли official packs дозволені для target.
        const warm = officialPacksEnabled ? peekWarmMarketplacePacks() ?? reserveBundledMarketPacks() : [];
        let foundPack = warm.find((p) => p.id === packId) ?? null;

        if (!foundPack && officialPacksEnabled) {
          const all = await loadMarketplacePacks();
          foundPack = all.find((p) => p.id === packId) ?? null;
        }

        // 2) UGC → дотягуємо метадані з Firestore
        if (!foundPack && communityPacksEnabled) {
          foundPack = await fetchCommunityPackMeta(packId, studyTarget);
        }

        if (!foundPack) {
          if (!cancelled) {
            setError(triLang(lang, { ru: 'Набор не найден', uk: 'Набір не знайдено', es: 'Paquete no encontrado', 'pt-BR': 'Pack não encontrado', vi: 'Không tìm thấy bộ', id: 'Pack tidak ditemukan', tr: 'Paket bulunamadı', pl: 'Nie znaleziono pakietu' }));
            setLoading(false);
          }
          return;
        }

        // 3) Картки
        let packCards: CardItem[] = [];
        if (foundPack.isCommunityUgc) {
          if (!communityPacksEnabled) {
            setError(frenchFlashcardsGateCopy(lang).body);
            setLoading(false);
            return;
          }
          packCards = await fetchCommunityPackCards(packId, studyTarget);
        } else {
          if (!officialPacksEnabled) {
            setError(frenchFlashcardsGateCopy(lang).body);
            setLoading(false);
            return;
          }
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
          setError(triLang(lang, { ru: 'Ошибка', uk: 'Помилка', es: 'Error', 'pt-BR': 'Erro', vi: 'Lỗi', id: 'Error', tr: 'Hata', pl: 'Błąd' }));
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [packId, lang, officialPacksEnabled, communityPacksEnabled, studyTarget]);

  // ── Конфетті + помітка про церемонію коли всі відкриті ─────────────────────
  useEffect(() => {
    if (cards.length === 0) return;
    if (flippedSet.size < cards.length) return;
    setShowConfetti(true);
    void hapticSuccess();
    void markPackCeremoniallyOpened(packId, studyTarget);
    const timer = setTimeout(() => setShowConfetti(false), 3500);
    return () => clearTimeout(timer);
  }, [flippedSet, cards.length, packId, studyTarget]);

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
  const tile = pack ? packTileImageForPack(pack) : undefined;

  const opened = flippedSet.size;
  const total = cards.length;
  const allOpened = total > 0 && opened >= total;

  // ── Loading / error ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <ScreenGradient artBackdrop="flashcards">
        <View style={styles.fillCenter}>
          <Stack.Screen options={{ headerShown: false }} />
        </View>
      </ScreenGradient>
    );
  }

  if (error || !pack) {
    return (
      <ScreenGradient artBackdrop="flashcards">
        <View style={styles.fillCenter}>
          <Stack.Screen options={{ headerShown: false }} />
          <Text style={{ color: t.textMuted, fontSize: f.body, marginBottom: 16 }}>
            {error ?? triLang(lang, { ru: 'Набор не найден', uk: 'Набір не знайдено', es: 'Paquete no encontrado', 'pt-BR': 'Pack não encontrado', vi: 'Không tìm thấy bộ', id: 'Pack tidak ditemukan', tr: 'Paket bulunamadı', pl: 'Nie znaleziono pakietu' })}
          </Text>
          <Pressable
            onPress={() => router.replace('/(tabs)/home' as any)}
            style={[styles.primaryBtn, { backgroundColor: accent }]}
          >
            <Text style={{ color: '#fff', fontSize: f.body, fontWeight: '700' }}>
              {triLang(lang, { ru: 'Назад', uk: 'Назад', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' })}
            </Text>
          </Pressable>
        </View>
      </ScreenGradient>
    );
  }

  const title = packTitleForInterface(pack, packUiLang);

  return (
    <ScreenGradient artBackdrop="flashcards">
      <View style={{ flex: 1 }}>
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
              'pt-BR': `${opened} de ${total} abertos`,
              vi: `Đã mở ${opened} / ${total}`,
              id: `${opened} dari ${total} dibuka`,
              tr: `${opened} / ${total} açıldı`,
              pl: `Otwarto ${opened} z ${total}`,
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
              'pt-BR': '💡 Toque em um cartão para abrir',
              vi: '💡 Chạm vào thẻ để mở',
              id: '💡 Ketuk kartu untuk membuka',
              tr: '💡 Açmak için bir karta dokun',
              pl: '💡 Stuknij kartę, aby ją otworzyć',
            })}
          </Text>
        </View>
      )}

      {/* Сітка карточок */}
      <BouncyScrollView
        decelerationRate="normal"
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
              key={`${packId}:${card.id || 'card'}:${idx}`}
              card={card}
              index={idx}
              cardWidth={cardWidth}
              cardHeight={cardHeight}
              packIcon={tile}
              accent={accent}
              flipped={flippedSet.has(idx)}
              onFlip={onFlipOne}
              lang={lang}
              cardLang={cardContentLang}
            />
          ))}
        </View>
      </BouncyScrollView>

      {/* Низова панель з кнопками */}
      <View
        style={[
          styles.footer,
          {
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
                  'pt-BR': 'Abrir todos',
                  vi: 'Mở tất cả',
                  id: 'Buka semua',
                  tr: 'Tümünü aç',
                  pl: 'Otwórz wszystkie',
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
                  'pt-BR': 'Ir para os cartões',
                  vi: 'Đi đến thẻ',
                  id: 'Ke kartu',
                  tr: 'Kartlara git',
                  pl: 'Przejdź do kart',
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
                'pt-BR': '🎉 Começar a estudar',
                vi: '🎉 Bắt đầu học',
                id: '🎉 Mulai belajar',
                tr: '🎉 Öğrenmeye başla',
                pl: '🎉 Zacznij się uczyć',
              })}
            </Text>
          </Pressable>
        )}
      </View>

        {showConfetti && <ConfettiBurst count={32} />}
      </View>
    </ScreenGradient>
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
  cardFlipShell: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardFace: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
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
