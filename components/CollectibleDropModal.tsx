// Модалка дропа карточки «Сокровищницы»: сюрприз ПОСЛЕ результатов активности
// (никогда не CTA до — см. ресёрч overjustification). Анимация по редкости —
// готовые ярусы GiftOpenEffects; legendary получает premium-ярус.
import React, { useEffect, useMemo } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { GiftOpenBurst, type GiftAnimTier } from './GiftOpenEffects';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import { hapticSuccess } from '../hooks/use-haptics';
import {
  COLLECTIBLE_RARITY_COLORS,
  COLLECTIBLE_RARITY_LABEL_RU,
  findCollectibleCard,
  findCollectibleSet,
} from '../app/collectibles/catalog';
import type { CollectibleDropOutcome } from '../app/collectibles/storage';

function dropAnimTier(rarity: string): GiftAnimTier {
  if (rarity === 'legendary') return 'premium';
  if (rarity === 'epic') return 'epic';
  if (rarity === 'rare') return 'confetti';
  return 'sparkle';
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
    if (outcome) void hapticSuccess();
  }, [outcome]);

  const rarityColor = outcome ? COLLECTIBLE_RARITY_COLORS[outcome.rarity] ?? '#9AA6C0' : '#9AA6C0';
  const tier = useMemo(() => dropAnimTier(outcome?.rarity ?? 'common'), [outcome?.rarity]);

  if (!outcome || !found) return null;
  const card = found.card;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(2,3,6,0.88)', alignItems: 'center', justifyContent: 'center', padding: 22 }}>
        <View
          style={{
            width: '100%',
            maxWidth: 360,
            borderRadius: 24,
            backgroundColor: t.bgCard,
            borderWidth: 1.5,
            borderColor: `${rarityColor}80`,
            paddingVertical: 20,
            paddingHorizontal: 18,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.1 }}>
            {triLang(lang, {
              ru: 'Новая карточка!',
              uk: 'Нова картка!',
              es: '¡Nueva carta!',
              'pt-BR': 'Nova carta!',
              vi: 'Thẻ mới!',
              id: 'Kartu baru!',
              tr: 'Yeni kart!',
              pl: 'Nowa karta!',
            })}
          </Text>

          <View style={{ marginTop: 14, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                width: 200,
                height: 160,
                borderRadius: 18,
                backgroundColor: `${rarityColor}1C`,
                borderWidth: 1,
                borderColor: `${rarityColor}55`,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {card.svg ? (
                <SvgXml xml={card.svg} width={184} height={147} />
              ) : (
                <Text style={{ color: rarityColor, fontSize: 44, fontWeight: '900' }}>
                  {card.en.slice(0, 1).toUpperCase()}
                </Text>
              )}
            </View>
            <GiftOpenBurst tier={tier} size={210} />
          </View>

          <View
            style={{
              marginTop: 12,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: `${rarityColor}26`,
              borderWidth: 1,
              borderColor: `${rarityColor}66`,
            }}
          >
            <Text style={{ color: rarityColor, fontSize: 12, fontWeight: '900', letterSpacing: 0.4 }}>
              {COLLECTIBLE_RARITY_LABEL_RU[outcome.rarity] ?? outcome.rarity}
            </Text>
          </View>

          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900', textAlign: 'center', marginTop: 10 }}>
            {card.en}
          </Text>
          <Text style={{ color: t.textSecond, fontSize: f.body, textAlign: 'center', marginTop: 4 }}>
            {card.ru}
          </Text>
          {!!set && (
            <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 6 }}>
              {set.titleRu}
            </Text>
          )}

          {outcome.setCompleted && (
            <View
              style={{
                marginTop: 14,
                width: '100%',
                borderRadius: 16,
                backgroundColor: 'rgba(251,191,36,0.12)',
                borderWidth: 1,
                borderColor: 'rgba(251,191,36,0.45)',
                paddingVertical: 10,
                paddingHorizontal: 12,
                alignItems: 'center',
                gap: 3,
              }}
            >
              <Text style={{ color: '#FBBF24', fontSize: f.body, fontWeight: '900' }}>
                {triLang(lang, {
                  ru: 'Сет собран! +15 осколков',
                  uk: 'Сет зібрано! +15 уламків',
                  es: '¡Set completo! +15 fragmentos',
                  'pt-BR': 'Conjunto completo! +15 fragmentos',
                  vi: 'Đủ bộ! +15 mảnh',
                  id: 'Set lengkap! +15 pecahan',
                  tr: 'Set tamam! +15 parça',
                  pl: 'Komplet! +15 odłamków',
                })}
              </Text>
              {!!secret && (
                <Text style={{ color: t.textSecond, fontSize: f.sub, textAlign: 'center' }}>
                  {triLang(lang, {
                    ru: `Секретная карточка открыта: ${secret.card.en}`,
                    uk: `Секретну картку відкрито: ${secret.card.en}`,
                    es: `Carta secreta desbloqueada: ${secret.card.en}`,
                    'pt-BR': `Carta secreta liberada: ${secret.card.en}`,
                    vi: `Mở thẻ bí mật: ${secret.card.en}`,
                    id: `Kartu rahasia terbuka: ${secret.card.en}`,
                    tr: `Gizli kart açıldı: ${secret.card.en}`,
                    pl: `Sekretna karta odblokowana: ${secret.card.en}`,
                  })}
                </Text>
              )}
            </View>
          )}

          <TouchableOpacity
            testID="collectible-drop-claim"
            activeOpacity={0.85}
            onPress={onClose}
            style={{
              marginTop: 16,
              width: '100%',
              minHeight: 48,
              borderRadius: 15,
              backgroundColor: t.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: t.correctText ?? '#0B0B0E', fontSize: f.body, fontWeight: '900' }}>
              {triLang(lang, {
                ru: 'Класс!',
                uk: 'Клас!',
                es: '¡Genial!',
                'pt-BR': 'Legal!',
                vi: 'Tuyệt!',
                id: 'Keren!',
                tr: 'Harika!',
                pl: 'Super!',
              })}
            </Text>
          </TouchableOpacity>

          {!!onOpenCollection && (
            <TouchableOpacity
              testID="collectible-drop-open-collection"
              activeOpacity={0.8}
              onPress={onOpenCollection}
              style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10 }}
            >
              <Ionicons name="albums-outline" size={16} color={t.textSecond} />
              <Text style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '800' }}>
                {triLang(lang, {
                  ru: 'В Сокровищницу',
                  uk: 'До Скарбниці',
                  es: 'A la colección',
                  'pt-BR': 'Para a coleção',
                  vi: 'Xem bộ sưu tập',
                  id: 'Ke koleksi',
                  tr: 'Koleksiyona git',
                  pl: 'Do kolekcji',
                })}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}
