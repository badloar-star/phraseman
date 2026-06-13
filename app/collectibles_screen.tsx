// «Сокровищница» — коллекция карточек-фраз (идиомы/сленг/пословицы).
// Концепция v2 (утв. 2026-06-10): 30 сетов × 10 + секретная 11-я; залоченные
// карточки видны, но «чисто серые» (grayscale-арт + замок, НЕ «?»); открытые
// цветные и тапаются в полноэкранную деталку (как «Фраза дня»). Вход — из
// Статистики, между «Подарками» и «Достижениями». Выдача — только сервер
// (collectiblesClaimDrop), этот экран лишь читает локальную копию инвентаря.
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import ContentWrap from '../components/ContentWrap';
import ScreenGradient from '../components/ScreenGradient';
import TapScale from '../components/TapScale';
import { useLang } from '../components/LangContext';
import { useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { useAudio } from '../hooks/use-audio';
import { onAppEvent } from './events';
import { safeRouterBack } from './navigation_back';
import {
  COLLECTIBLE_RARITY_COLORS,
  COLLECTIBLE_RARITY_LABEL_RU,
  COLLECTIBLE_SETS,
  collectiblesTotalCount,
  type CollectibleCardData,
  type CollectibleSecretData,
  type CollectibleSetData,
} from './collectibles/catalog';
import {
  getCollectiblesOwnedMap,
  markCollectiblesSeen,
  type CollectiblesOwnedMap,
} from './collectibles/storage';
import { grayscaleSvg } from './collectibles/svg_gray';
import { isCollectiblesEnabled } from './remote_flags';

const SECRET_GOLD = '#FBBF24';

type DetailTarget =
  | { kind: 'card'; set: CollectibleSetData; card: CollectibleCardData }
  | { kind: 'secret'; set: CollectibleSetData; card: CollectibleSecretData };

/* ── ячейка карточки ──────────────────────────────────────── */
const CardCell = React.memo(function CardCell({
  card,
  owned,
  onPress,
  textPrimary,
  textMuted,
}: {
  card: CollectibleCardData;
  owned: boolean;
  onPress: () => void;
  textPrimary: string;
  textMuted: string;
}) {
  const rarityColor = COLLECTIBLE_RARITY_COLORS[card.rarity];
  const xml = useMemo(() => {
    if (!card.svg) return null;
    return owned ? card.svg : grayscaleSvg(card.id, card.svg);
  }, [card.id, card.svg, owned]);

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={{ width: '31%', marginBottom: 10 }}
    >
      <View
        style={{
          aspectRatio: 200 / 160,
          borderRadius: 13,
          backgroundColor: owned ? `${rarityColor}14` : 'rgba(127,127,127,0.10)',
          borderWidth: 1,
          borderColor: owned ? `${rarityColor}55` : 'rgba(127,127,127,0.22)',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {xml ? (
          <View style={{ opacity: owned ? 1 : 0.6, width: '92%', aspectRatio: 200 / 160 }}>
            <SvgXml
              xml={xml}
              width="100%"
              height="100%"
              onError={(e) => console.warn('[CollectibleSVG]', card.id, e.message)}
            />
          </View>
        ) : (
          <Text style={{ color: owned ? rarityColor : textMuted, fontSize: 24, fontWeight: '900' }}>
            {card.en.slice(0, 1).toUpperCase()}
          </Text>
        )}
        {!owned && (
          <View
            style={{
              position: 'absolute',
              right: 5,
              bottom: 5,
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: 'rgba(0,0,0,0.45)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="lock-closed" size={10} color="#E7E7EC" />
          </View>
        )}
      </View>
      <Text
        numberOfLines={1}
        style={{
          marginTop: 4,
          fontSize: 10.5,
          fontWeight: '700',
          textAlign: 'center',
          color: owned ? textPrimary : textMuted,
        }}
      >
        {card.en}
      </Text>
    </TouchableOpacity>
  );
});

/* ── ячейка секретки ──────────────────────────────────────── */
const SecretCell = React.memo(function SecretCell({
  secret,
  owned,
  onPress,
  textPrimary,
  textMuted,
}: {
  secret: CollectibleSecretData;
  owned: boolean;
  onPress: () => void;
  textPrimary: string;
  textMuted: string;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={{ width: '31%', marginBottom: 10 }}
    >
      <View
        style={{
          aspectRatio: 200 / 160,
          borderRadius: 13,
          backgroundColor: owned ? `${SECRET_GOLD}16` : 'rgba(127,127,127,0.07)',
          borderWidth: 1,
          borderColor: owned ? `${SECRET_GOLD}66` : 'rgba(127,127,127,0.28)',
          borderStyle: owned ? 'solid' : 'dashed',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {owned ? (
          secret.svg ? (
            <View style={{ width: '92%', aspectRatio: 200 / 160 }}>
              <SvgXml xml={secret.svg} width="100%" height="100%" />
            </View>
          ) : (
            <Ionicons name="star" size={26} color={SECRET_GOLD} />
          )
        ) : (
          <Text style={{ color: textMuted, fontSize: 18, fontWeight: '900', letterSpacing: 2 }}>???</Text>
        )}
      </View>
      <Text
        numberOfLines={1}
        style={{
          marginTop: 4,
          fontSize: 10.5,
          fontWeight: '700',
          textAlign: 'center',
          color: owned ? textPrimary : textMuted,
        }}
      >
        {owned ? secret.en : '···'}
      </Text>
    </TouchableOpacity>
  );
});

/* ── секция сета ──────────────────────────────────────────── */
function SetSection({
  set,
  ownedMap,
  onOpenCard,
  t,
  f,
}: {
  set: CollectibleSetData;
  ownedMap: CollectiblesOwnedMap;
  onOpenCard: (target: DetailTarget) => void;
  t: ReturnType<typeof useTheme>['theme'];
  f: ReturnType<typeof useTheme>['f'];
}) {
  const ownedInSet = set.cards.filter((c) => ownedMap[c.id] != null).length;
  const secretOwned = ownedMap[set.secret.id] != null;
  const totalOwned = ownedInSet + (secretOwned ? 1 : 0);
  const complete = totalOwned >= set.cards.length + 1;

  return (
    <View
      style={{
        borderRadius: 18,
        backgroundColor: t.bgCard,
        borderWidth: 1,
        borderColor: complete ? `${SECRET_GOLD}55` : t.border,
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 4,
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
        <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900', flex: 1 }} numberOfLines={1}>
          {set.titleRu}
        </Text>
        {complete && <Ionicons name="checkmark-circle" size={16} color={SECRET_GOLD} />}
        <Text style={{ color: complete ? SECRET_GOLD : t.textSecond, fontSize: f.sub, fontWeight: '800' }}>
          {totalOwned}/{set.cards.length + 1}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        {set.cards.map((card) => (
          <CardCell
            key={card.id}
            card={card}
            owned={ownedMap[card.id] != null}
            onPress={() => onOpenCard({ kind: 'card', set, card })}
            textPrimary={t.textPrimary}
            textMuted={t.textMuted}
          />
        ))}
        <SecretCell
          secret={set.secret}
          owned={secretOwned}
          onPress={() => onOpenCard({ kind: 'secret', set, card: set.secret })}
          textPrimary={t.textPrimary}
          textMuted={t.textMuted}
        />
      </View>
    </View>
  );
}

/* ── полноэкранная деталка (как «Фраза дня») ──────────────── */
function CardDetailModal({
  target,
  onClose,
  onNavigate,
}: {
  target: DetailTarget | null;
  onClose: () => void;
  onNavigate: (next: DetailTarget) => void;
}) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const { speak } = useAudio();

  if (!target) return null;
  const { card, set } = target;
  const isSecret = target.kind === 'secret';
  const rarityColor = isSecret
    ? SECRET_GOLD
    : COLLECTIBLE_RARITY_COLORS[(card as CollectibleCardData).rarity];
  const rarityLabel = isSecret
    ? 'Секретная'
    : COLLECTIBLE_RARITY_LABEL_RU[(card as CollectibleCardData).rarity];

  // Навигация по сету: только открытые позиции (включая секретку в конце).
  const siblings: DetailTarget[] = [
    ...set.cards.map((c) => ({ kind: 'card', set, card: c } as DetailTarget)),
    { kind: 'secret', set, card: set.secret },
  ];
  const index = siblings.findIndex((s) => s.card.id === card.id);

  const section = (title: string, body: string) => !!body && (
    <View style={{ marginTop: 14 }}>
      <Text style={{ color: t.textMuted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {title}
      </Text>
      <Text style={{ color: t.textPrimary, fontSize: f.body, lineHeight: 21, marginTop: 4 }}>
        {body}
      </Text>
    </View>
  );

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(2,3,6,0.92)' }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 6 }}>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: `${rarityColor}26`,
                borderWidth: 1,
                borderColor: `${rarityColor}66`,
              }}
            >
              <Text style={{ color: rarityColor, fontSize: 11.5, fontWeight: '900' }}>{rarityLabel}</Text>
            </View>
            <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700', marginLeft: 10, flex: 1 }} numberOfLines={1}>
              {set.titleRu}
            </Text>
            <TapScale onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={26} color={t.textPrimary} />
            </TapScale>
          </View>

          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            <View
              style={{
                alignSelf: 'center',
                width: 240,
                height: 192,
                borderRadius: 22,
                backgroundColor: `${rarityColor}18`,
                borderWidth: 1,
                borderColor: `${rarityColor}55`,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {card.svg ? (
                <SvgXml xml={card.svg} width={222} height={178} />
              ) : (
                <Text style={{ color: rarityColor, fontSize: 52, fontWeight: '900' }}>
                  {card.en.slice(0, 1).toUpperCase()}
                </Text>
              )}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.h1, fontWeight: '900', textAlign: 'center', flexShrink: 1 }}>
                {card.en}
              </Text>
              <TapScale
                onPress={() => {
                  hapticTap();
                  const en = card.en.trim();
                  if (en) speak(en);
                }}
                hitSlop={10}
              >
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: `${rarityColor}26`, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="volume-high" size={18} color={rarityColor} />
                </View>
              </TapScale>
            </View>
            {!!card.ipa && (
              <Text style={{ color: t.textMuted, fontSize: f.sub, textAlign: 'center', marginTop: 4 }}>
                [{card.ipa}]
              </Text>
            )}
            <Text style={{ color: t.textSecond, fontSize: f.h2, fontWeight: '800', textAlign: 'center', marginTop: 8 }}>
              {card.ru}
            </Text>

            {section('Дословно', card.literalRu)}
            {section('Что значит', card.meaningRu)}
            {!!card.exampleEn && (
              <View style={{ marginTop: 14 }}>
                <Text style={{ color: t.textMuted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Пример
                </Text>
                <Text style={{ color: t.textPrimary, fontSize: f.body, lineHeight: 21, marginTop: 4, fontWeight: '700' }}>
                  {card.exampleEn}
                </Text>
                <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: 21, marginTop: 2 }}>
                  {card.exampleRu}
                </Text>
              </View>
            )}
            {section('История', card.originRu)}
          </ScrollView>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 22, paddingBottom: 14 }}>
            <TapScale
              onPress={() => {
                if (index > 0) onNavigate(siblings[index - 1]);
              }}
              hitSlop={10}
            >
              <Ionicons name="chevron-back-circle" size={34} color={index > 0 ? t.textSecond : `${String(t.textMuted)}55`} />
            </TapScale>
            <TapScale
              onPress={() => {
                if (index < siblings.length - 1) onNavigate(siblings[index + 1]);
              }}
              hitSlop={10}
            >
              <Ionicons name="chevron-forward-circle" size={34} color={index < siblings.length - 1 ? t.textSecond : `${String(t.textMuted)}55`} />
            </TapScale>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

/* ── экран ────────────────────────────────────────────────── */
export default function CollectiblesScreen() {
  // Kill-switch из Remote Config (collectibles_enabled, дефолт true).
  if (!isCollectiblesEnabled()) {
    return null;
  }

  const router = useRouter();
  const { lang } = useLang();
  const { theme: t, f } = useTheme();
  const [ownedMap, setOwnedMap] = useState<CollectiblesOwnedMap>({});
  const [detail, setDetail] = useState<DetailTarget | null>(null);

  const load = useCallback(async () => {
    const map = await getCollectiblesOwnedMap();
    setOwnedMap(map);
    // Открыли экран — все текущие карточки считаются «увиденными» (бейдж NEW гаснет).
    void markCollectiblesSeen(Object.keys(map));
  }, []);

  useFocusEffect(useCallback(() => {
    void load();
    return undefined;
  }, [load]));

  useEffect(() => {
    const sub = onAppEvent('collectibles_changed', () => { void load(); });
    return () => sub.remove();
  }, [load]);

  const ownedCount = useMemo(
    () => Object.keys(ownedMap).filter((id) =>
      COLLECTIBLE_SETS.some((s) => s.secret.id === id || s.cards.some((c) => c.id === id)),
    ).length,
    [ownedMap],
  );
  const total = collectiblesTotalCount();

  const openDetail = useCallback((target: DetailTarget) => {
    hapticTap();
    setDetail(target);
  }, []);

  // Деталка по открытым позициям: листание пропускает залоченные.
  const navigateDetail = useCallback((next: DetailTarget) => {
    const owned = ownedMap[next.card.id] != null;
    if (owned) setDetail(next);
  }, [ownedMap]);

  return (
    <ScreenGradient>
      <SafeAreaView testID="screen-collectibles" style={{ flex: 1 }}>
        <ContentWrap>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingTop: Platform.OS === 'android' ? 28 : 15, paddingBottom: 15, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
            <TapScale onPress={() => safeRouterBack(router)} hitSlop={12}>
              <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
            </TapScale>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', marginLeft: 8, flex: 1 }} numberOfLines={1}>
              {triLang(lang, {
                ru: 'Сокровищница',
                uk: 'Скарбниця',
                es: 'Tesorería',
                'pt-BR': 'Tesouraria',
                vi: 'Kho báu',
                id: 'Perbendaharaan',
                tr: 'Hazine',
                pl: 'Skarbiec',
              })}
            </Text>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: t.bgCard,
                borderWidth: 1,
                borderColor: t.border,
              }}
            >
              <Text style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '900' }}>
                {ownedCount}/{total}
              </Text>
            </View>
          </View>

          <FlatList
            data={COLLECTIBLE_SETS}
            keyExtractor={(s) => s.setId}
            renderItem={({ item }) => (
              <SetSection set={item} ownedMap={ownedMap} onOpenCard={openDetail} t={t} f={f} />
            )}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            initialNumToRender={3}
            windowSize={7}
            removeClippedSubviews
            decelerationRate="normal"
          />
        </ContentWrap>
      </SafeAreaView>

      <CardDetailModal
        target={detail}
        onClose={() => setDetail(null)}
        onNavigate={navigateDetail}
      />
    </ScreenGradient>
  );
}
