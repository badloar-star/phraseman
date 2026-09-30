// Модалка дропа карточки «Сокровищницы»: сюрприз ПОСЛЕ результатов активности
// (никогда не CTA до — см. ресёрч overjustification). Анимация по редкости —
// готовые ярусы GiftOpenEffects; legendary получает premium-ярус.
// зачем: владелец 2026-09-29 — перенос на Liquid Glass «1 в 1 с макета»
// (overlays-more.html OM-COLLECTIBLE-NORMAL/-SET-COMPLETE/-SECRET): непрозрачная
// основа из токенов темы (13 тем), без рамок и цветного свечения карточки; цвет
// редкости — только маленькая точка в бейдже. обещание жемчужин в макете убрано.
import React, { useEffect, useMemo } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  findCollectibleCard,
} from '../app/collectibles/catalog';
import type { CollectibleDropOutcome } from '../app/collectibles/storage';
import { soundDirector } from '../modules/audio/sound_director';
import HybridAlertShell, { CascadeItem } from './modal_fx/HybridAlertShell';
import PressableHybrid from './PressableHybrid';
import RewardImpactRings from './celebration/RewardImpactRings';
import { useRewardImpactHybrid } from './celebration/use_reward_impact_hybrid';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { LUM } from '../constants/motionHybrid';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';

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
  /**
   * зачем: гибрид «Световод + Чекан» (макет .motion-mockups/phraseman-hybrid.html,
   * сцена M3 «Сундук-награда») — удар только у карты (RewardImpactRings),
   * HoloFoilCard-эффекты внутри не трогаем. Production default — hybrid; classic — rollback.
   */
  motionVariant?: 'classic' | 'hybrid';
}

export default function CollectibleDropModal({ outcome, onClose, onOpenCollection, motionVariant = 'hybrid' }: CollectibleDropModalProps) {
  const { f, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const { lang } = useLang();
  const isHybrid = motionVariant === 'hybrid';
  const reduceMotion = useReduceMotion();

  const found = outcome ? findCollectibleCard(outcome.cardId) : null;
  const secret = outcome?.secretCardId ? findCollectibleCard(outcome.secretCardId) : null;

  // зачем: классический путь проигрывает звук/хаптик сразу на монтировании —
  // в hybrid этим управляет useRewardImpactHybrid (удар синхронизирован со
  // звуком сундука/удара), второй независимый триггер тут не нужен.
  useEffect(() => {
    if (!outcome || isHybrid) return;
    void hapticSuccess();
    soundDirector.request('pm.reward.chest_open', {
      scope: 'collectible-drop',
      dedupeKey: `${outcome.setId}:${outcome.cardId}`,
    });
  }, [outcome, isHybrid]);

  // зачем: цвет редкости — семантика, но только маленькая точка бейджа; карточка/кольца нейтральны.
  const rarityColor = outcome ? COLLECTIBLE_RARITY_COLORS[outcome.rarity] ?? '#9AA6C0' : '#9AA6C0';
  const tier = useMemo(() => dropAnimTier(outcome?.rarity ?? 'common'), [outcome?.rarity]);

  const impact = useRewardImpactHybrid({
    visible: isHybrid && !!outcome,
    rarity: outcome?.rarity ?? 'common',
    impactSoundId: 'pm.reward.chest_open',
    scope: 'collectible-drop-hybrid',
  });

  if (!outcome || !found) return null;
  const card = found.card;
  const cardText = collectibleCardTextForLang(card, lang);

  const newCardKicker = triLang(lang, { ru: 'Новая карточка!', uk: 'Нова картка!', en: 'New card!', es: '¡Nueva carta!', 'pt-BR': 'Nova carta!', vi: 'Thẻ mới!', id: 'Kartu baru!', tr: 'Yeni kart!', pl: 'Nowa karta!' });
  const claimLabel = triLang(lang, { ru: 'Класс!', uk: 'Клас!', en: 'Awesome!', es: '¡Genial!', 'pt-BR': 'Legal!', vi: 'Tuyệt!', id: 'Keren!', tr: 'Harika!', pl: 'Super!' });
  const collectionLabel = triLang(lang, { ru: 'В коллекцию', uk: 'До колекції', en: 'To the collection', es: 'A la colección', 'pt-BR': 'Para a coleção', vi: 'Xem bộ sưu tập', id: 'Ke koleksi', tr: 'Koleksiyona git', pl: 'Do kolekcji' });
  const setCompletedLabel = triLang(lang, { ru: 'Сет собран!', uk: 'Сет зібрано!', en: 'Set complete!', es: '¡Set completo!', 'pt-BR': 'Conjunto completo!', vi: 'Đủ bộ!', id: 'Set lengkap!', tr: 'Set tamam!', pl: 'Komplet!' });
  const secretLabel = secret ? triLang(lang, { ru: `Секретная карточка открыта: ${secret.card.en}`, uk: `Секретну картку відкрито: ${secret.card.en}`, en: `Secret card unlocked: ${secret.card.en}`, es: `Carta secreta desbloqueada: ${secret.card.en}`, 'pt-BR': `Carta secreta liberada: ${secret.card.en}`, vi: `Mở thẻ bí mật: ${secret.card.en}`, id: `Kartu rahasia terbuka: ${secret.card.en}`, tr: `Gizli kart açıldı: ${secret.card.en}`, pl: `Sekretna karta odblokowana: ${secret.card.en}` }) : '';

  const rarityText = rarityLabelForLang(outcome.rarity, lang);

  // Общие куски макета: арт, бейдж редкости, названия, блок «сет собран».
  const art = (
    <View style={styles.artWrap}>
      {isHybrid && (
        <RewardImpactRings
          show={impact.showRings}
          dustCount={impact.dustCount}
          color={glass.secondary}
          ring0Style={impact.styles.ring0}
          ring1Style={impact.styles.ring1}
        />
      )}
      <HoloFoilCard
        rarity={outcome.rarity}
        rarityColor={glass.secondary}
        width={200}
        height={160}
        tiltEnabled={false}
        style={{ backgroundColor: glass.opaqueControl, borderRadius: 18 }}
      >
        <CollectibleArt
          cardId={card.id}
          svg={card.svg}
          width={200}
          height={160}
          contentFit="cover"
          borderRadius={16}
          accessibilityLabel={card.en}
          fallback={<Text style={[styles.artFallback, { color: glass.text }]}>{card.en.slice(0, 1).toUpperCase()}</Text>}
        />
      </HoloFoilCard>
      {!isHybrid && <GiftOpenBurst tier={tier} size={210} />}
    </View>
  );
  const badge = (
    <View style={[styles.rarityBadge, { backgroundColor: glass.opaqueControl }]} accessible accessibilityLabel={rarityText}>
      <View style={[styles.rarityDot, { backgroundColor: rarityColor }]} />
      <Text style={[styles.rarityText, { color: glass.text }]}>{rarityText}</Text>
    </View>
  );
  const names = (
    <>
      <Text accessibilityRole="header" style={[styles.cardName, { color: glass.text, fontSize: f.h2 }]}>{card.en}</Text>
      <Text style={[styles.cardTranslation, { color: glass.secondary, fontSize: f.body }]}>{cardText.translation}</Text>
    </>
  );
  const setBox = outcome.setCompleted ? (
    <View style={[styles.setCompletedBox, { backgroundColor: glass.opaqueControl }]}>
      <Text style={[styles.setCompletedTitle, { color: glass.text, fontSize: f.body }]}>{setCompletedLabel}</Text>
      {!!secret && <Text style={[styles.setCompletedSub, { color: glass.secondary, fontSize: f.sub }]}>{secretLabel}</Text>}
    </View>
  ) : null;

  if (isHybrid) {
    return (
      <HybridAlertShell visible onRequestClose={onClose} shadowColor="rgba(0,0,0,0.5)" testID="collectible-drop-hybrid-backdrop" backdropColor="rgba(2,3,6,0.88)">
        <View style={[styles.card, { backgroundColor: glass.opaqueSheet }]}>
          <CascadeItem delay={LUM.ladder[1]} reduceMotion={reduceMotion}>
            <Text style={[styles.kicker, { color: glass.secondary, fontSize: f.sub }]}>{newCardKicker}</Text>
          </CascadeItem>
          {art}
          <CascadeItem delay={LUM.ladder[2]} reduceMotion={reduceMotion}>{badge}</CascadeItem>
          <CascadeItem delay={LUM.ladder[3]} reduceMotion={reduceMotion}>{names}</CascadeItem>
          {setBox && <CascadeItem delay={LUM.ladder[3]} reduceMotion={reduceMotion}>{setBox}</CascadeItem>}

          <CascadeItem delay={LUM.ladder[4]} reduceMotion={reduceMotion}>
            <PressableHybrid
              testID="collectible-drop-claim-hybrid"
              accessibilityRole="button"
              accessibilityLabel={claimLabel}
              onPress={onClose}
              variant="primary"
              style={styles.ctaBtn}
              contentStyle={[styles.ctaInner, { backgroundColor: glass.accent }]}
            >
              <Text style={[styles.ctaBtnText, { color: glass.accentInk, fontSize: f.body }]}>{claimLabel}</Text>
            </PressableHybrid>
          </CascadeItem>

          {!!onOpenCollection && (
            <CascadeItem delay={LUM.ladder[4]} reduceMotion={reduceMotion}>
              <PressableHybrid
                testID="collectible-drop-open-collection-hybrid"
                accessibilityRole="button"
                accessibilityLabel={collectionLabel}
                onPress={onOpenCollection}
                variant="secondary"
                style={styles.collectionBtn}
                contentStyle={styles.collectionInner}
              >
                <Ionicons name="albums-outline" size={16} color={glass.secondary} />
                <Text style={[styles.collectionBtnText, { color: glass.secondary, fontSize: f.sub }]}>{collectionLabel}</Text>
              </PressableHybrid>
            </CascadeItem>
          )}
        </View>
      </HybridAlertShell>
    );
  }

  // Классический путь (откат): тот же материал макета, без анимации каскада.
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom', 'left', 'right']}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, { backgroundColor: glass.opaqueSheet }]}>
            <Text style={[styles.kicker, { color: glass.secondary, fontSize: f.sub }]}>{newCardKicker}</Text>
            {art}
            {badge}
            {names}
            {setBox}
            <TouchableOpacity
              testID="collectible-drop-claim"
              accessibilityRole="button"
              accessibilityLabel={claimLabel}
              activeOpacity={0.85}
              onPress={onClose}
              style={[styles.ctaBtn, styles.ctaInner, { backgroundColor: glass.accent }]}
            >
              <Text style={[styles.ctaBtnText, { color: glass.accentInk, fontSize: f.body }]}>{claimLabel}</Text>
            </TouchableOpacity>

            {!!onOpenCollection && (
              <TouchableOpacity
                testID="collectible-drop-open-collection"
                accessibilityRole="button"
                accessibilityLabel={collectionLabel}
                activeOpacity={0.8}
                onPress={onOpenCollection}
                style={[styles.collectionBtn, styles.collectionInner]}
              >
                <Ionicons name="albums-outline" size={16} color={glass.secondary} />
                <Text style={[styles.collectionBtnText, { color: glass.secondary, fontSize: f.sub }]}>{collectionLabel}</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(2,3,6,0.88)' },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 22 },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  kicker: { fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, textAlign: 'center' },
  artWrap: { marginTop: 14, alignItems: 'center', justifyContent: 'center' },
  artFallback: { fontSize: 44, fontWeight: '800' },
  rarityBadge: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  rarityDot: { width: 8, height: 8, borderRadius: 4 },
  rarityText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  cardName: { fontWeight: '800', textAlign: 'center', marginTop: 10 },
  cardTranslation: { textAlign: 'center', marginTop: 4 },
  setCompletedBox: {
    marginTop: 14,
    width: '100%',
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 4,
  },
  setCompletedTitle: { fontWeight: '800', textAlign: 'center' },
  setCompletedSub: { textAlign: 'center' },
  ctaBtn: { marginTop: 16, width: '100%' },
  ctaInner: {
    minHeight: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnText: { fontWeight: '800' },
  collectionBtn: { marginTop: 10, alignSelf: 'center', minHeight: 44 },
  collectionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  collectionBtnText: { fontWeight: '700' },
});
