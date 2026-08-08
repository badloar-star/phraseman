// Модалка дропа карточки «Сокровищницы»: сюрприз ПОСЛЕ результатов активности
// (никогда не CTA до — см. ресёрч overjustification). Анимация по редкости —
// готовые ярусы GiftOpenEffects; legendary получает premium-ярус.
import React, { useEffect, useMemo } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import CollectibleArt from './CollectibleArt';
import { GiftOpenBurst, type GiftAnimTier } from './GiftOpenEffects';
import HoloFoilCard from './HoloFoilCard';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import { hapticSuccess } from '../hooks/use-haptics';
import {
  COLLECTIBLE_RARITY_COLORS,
  COLLECTIBLE_RARITY_LABEL_RU,
  COLLECTIBLE_RARITY_LABELS,
  collectibleCardTextForLang,
  collectibleSetTitleForLang,
  findCollectibleCard,
  findCollectibleSet,
} from '../app/collectibles/catalog';
import type { CollectibleDropOutcome } from '../app/collectibles/storage';
import { soundDirector } from '../modules/audio/sound_director';

function dropAnimTier(rarity: string): GiftAnimTier {
  if (rarity === 'legendary') return 'premium';
  if (rarity === 'epic') return 'epic';
  // rare раньше выдавал 'confetti' — конфетти-салют убран по просьбе, теперь искры.
  if (rarity === 'rare') return 'sparkle';
  return 'sparkle';
}

function rarityLabelForLang(rarity: string, lang: string): string {
  const labels = COLLECTIBLE_RARITY_LABELS[rarity as keyof typeof COLLECTIBLE_RARITY_LABELS];
  const labelEs = labels?.es;
  return String(labels?.[lang] ?? labelEs ?? COLLECTIBLE_RARITY_LABEL_RU[rarity as keyof typeof COLLECTIBLE_RARITY_LABEL_RU] ?? rarity);
}

interface CollectibleDropModalProps {
  outcome: CollectibleDropOutcome | null;
  onClose: () => void;
  onOpenCollection?: () => void;
}

export default function CollectibleDropModal({ outcome, onClose, onOpenCollection }: CollectibleDropModalProps) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();

  const found = outcome ? findCollectibleCard(outcome.cardId) : null;
  const set = outcome ? findCollectibleSet(outcome.setId) : null;
  const secret = outcome?.secretCardId ? findCollectibleCard(outcome.secretCardId) : null;

  useEffect(() => {
    if (!outcome) return;
    void hapticSuccess();
    soundDirector.request('pm.reward.collectible', {
      scope: 'collectible-drop',
      dedupeKey: `${outcome.setId}:${outcome.cardId}`,
    });
  }, [outcome]);

  const rarityColor = outcome ? COLLECTIBLE_RARITY_COLORS[outcome.rarity] ?? '#9AA6C0' : '#9AA6C0';
  const tier = useMemo(() => dropAnimTier(outcome?.rarity ?? 'common'), [outcome?.rarity]);

  if (!outcome || !found) return null;
  const card = found.card;
  const cardText = collectibleCardTextForLang(card, lang);
  const setTitle = set ? collectibleSetTitleForLang(set, lang) : '';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: `${rarityColor}80` }]}>
          <Text style={[styles.kicker, { color: t.textSecond, fontSize: f.sub }]}>
            {triLang(lang, { ru: 'Новая карточка!', uk: 'Нова картка!', es: '¡Nueva carta!', 'pt-BR': 'Nova carta!', vi: 'Thẻ mới!', id: 'Kartu baru!', tr: 'Yeni kart!', pl: 'Nowa karta!' })}
          </Text>

          <View style={styles.artWrap}>
            <HoloFoilCard
              rarity={outcome.rarity}
              rarityColor={rarityColor}
              width={200}
              height={160}
              tiltEnabled={false}
              style={{ backgroundColor: `${rarityColor}1C`, borderRadius: 18 }}
            >
              <CollectibleArt
                cardId={card.id}
                svg={card.svg}
                width={200}
                height={160}
                contentFit="cover"
                borderRadius={16}
                accessibilityLabel={card.en}
                fallback={
                  <Text style={[styles.artFallback, { color: rarityColor }]}>
                    {card.en.slice(0, 1).toUpperCase()}
                  </Text>
                }
              />
            </HoloFoilCard>
            <GiftOpenBurst tier={tier} size={210} />
          </View>

          <View style={[styles.rarityBadge, { backgroundColor: `${rarityColor}26`, borderColor: `${rarityColor}66` }]}>
            <Text style={[styles.rarityText, { color: rarityColor }]}>
              {rarityLabelForLang(outcome.rarity, lang)}
            </Text>
          </View>

          <Text style={[styles.cardName, { color: t.textPrimary, fontSize: f.h2 }]}>{card.en}</Text>
          <Text style={[styles.cardTranslation, { color: t.textSecond, fontSize: f.body }]}>{cardText.translation}</Text>

          {!!set && (
            <Text style={[styles.setName, { color: t.textMuted, fontSize: f.sub }]}>{setTitle}</Text>
          )}

          {outcome.setCompleted && (
            <View style={styles.setCompletedBox}>
              <Text style={[styles.setCompletedTitle, { fontSize: f.body }]}>
                {triLang(lang, { ru: 'Сет собран! +15 жемчужин', uk: 'Сет зібрано! +15 перлин', es: '¡Set completo! +15 perlas', 'pt-BR': 'Conjunto completo! +15 pérolas', vi: 'Đủ bộ! +15 ngọc trai', id: 'Set lengkap! +15 mutiara', tr: 'Set tamam! +15 inci', pl: 'Komplet! +15 pereł' })}
              </Text>
              {!!secret && (
                <Text style={[styles.setCompletedSub, { color: t.textSecond, fontSize: f.sub }]}>
                  {triLang(lang, { ru: `Секретная карточка открыта: ${secret.card.en}`, uk: `Секретну картку відкрито: ${secret.card.en}`, es: `Carta secreta desbloqueada: ${secret.card.en}`, 'pt-BR': `Carta secreta liberada: ${secret.card.en}`, vi: `Mở thẻ bí mật: ${secret.card.en}`, id: `Kartu rahasia terbuka: ${secret.card.en}`, tr: `Gizli kart açıldı: ${secret.card.en}`, pl: `Sekretna karta odblokowana: ${secret.card.en}` })}
                </Text>
              )}
            </View>
          )}

          <TouchableOpacity
            testID="collectible-drop-claim"
            activeOpacity={0.85}
            onPress={onClose}
            style={[styles.ctaBtn, { backgroundColor: t.accent }]}
          >
            <Text style={[styles.ctaBtnText, { color: t.correctText ?? '#0B0B0E', fontSize: f.body }]}>
              {triLang(lang, { ru: 'Класс!', uk: 'Клас!', es: '¡Genial!', 'pt-BR': 'Legal!', vi: 'Tuyệt!', id: 'Keren!', tr: 'Harika!', pl: 'Super!' })}
            </Text>
          </TouchableOpacity>

          {!!onOpenCollection && (
            <TouchableOpacity
              testID="collectible-drop-open-collection"
              activeOpacity={0.8}
              onPress={onOpenCollection}
              style={styles.collectionBtn}
            >
              <Ionicons name="albums-outline" size={16} color={t.textSecond} />
              <Text style={[styles.collectionBtnText, { color: t.textSecond, fontSize: f.sub }]}>
                {triLang(lang, { ru: 'В коллекцию', uk: 'До колекції', es: 'A la colección', 'pt-BR': 'Para a coleção', vi: 'Xem bộ sưu tập', id: 'Ke koleksi', tr: 'Koleksiyona git', pl: 'Do kolekcji' })}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2,3,6,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 0,
    paddingVertical: 20,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  kicker: { fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.1 },
  artWrap: { marginTop: 14, alignItems: 'center', justifyContent: 'center' },
  artFallback: { fontSize: 44, fontWeight: '900' },
  rarityBadge: {
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  rarityText: { fontSize: 12, fontWeight: '900', letterSpacing: 0.4 },
  cardName: { fontWeight: '900', textAlign: 'center', marginTop: 10 },
  cardTranslation: { textAlign: 'center', marginTop: 4 },
  setName: { marginTop: 6 },
  setCompletedBox: {
    marginTop: 14,
    width: '100%',
    borderRadius: 16,
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderWidth: 0,
    borderColor: 'rgba(251,191,36,0.45)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 3,
  },
  setCompletedTitle: { color: '#FBBF24', fontWeight: '900' },
  setCompletedSub: { textAlign: 'center' },
  ctaBtn: {
    marginTop: 16,
    width: '100%',
    minHeight: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnText: { fontWeight: '900' },
  collectionBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  collectionBtnText: { fontWeight: '800' },
});
