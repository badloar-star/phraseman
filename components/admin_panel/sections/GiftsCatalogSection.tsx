// Секция QA-панели: «Справочник подарков» — канонический список ВСЕХ подарков
// прода с артами, иконками наград и описаниями из каталогов (тексты каталогов
// написаны по PHRASEMAN_BIBLE.md — показываем их дословно, как видит игрок).
// Только просмотр: ничего не начисляет и не мутирует.
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import LevelGiftArt from '../../LevelGiftArt';
import { getLevelGiftRewardIcon } from '../../../constants/levelGiftRewardIcons';
import {
  ALL_LEVEL_GIFT_DEFS,
  GIFT_POOL,
  LEVEL_GIFT_MILESTONE_LEVELS,
  PREMIUM_LEVEL_PACK_GIFT_DROP_CHANCE,
  giftDescForLang,
  getMilestoneLevelGift,
  giftTitleForLang,
  giftRarityUiLabel,
  type GiftDef,
  type GiftRarity,
} from '../../../app/level_gift_system';
import { FRIEND_GIFT_CATALOG } from '../../../app/friend_gifts';
import {
  AccordionSection, AdminHint,
  ADMIN_SURFACE_ELEVATED, ADMIN_TEXT, ADMIN_TEXT_MUTED, ADMIN_BORDER_MUTED,
} from '../ui';

const RARITY_ORDER: GiftRarity[] = ['common', 'rare', 'epic'];

const RARITY_COLOR: Record<GiftRarity, string> = {
  common: '#8C94A0',
  rare: '#5CA8FF',
  epic: '#C792EA',
};

const isPackUnlockGift = (g: GiftDef) => g.id.startsWith('prem_level_unlock_');

/** Награды сундука лиги — зеркало серверного ролла (functions/src/league_chest.ts). */
const LEAGUE_CHEST_ROWS: { icon: string; title: string; desc: string; chance: string }[] = [
  { icon: 'diamond-outline', title: 'Осколки 15–35', desc: 'Базовая награда финала недели', chance: 'всегда' },
  { icon: 'flame-outline', title: 'Буст ×2 XP', desc: '3 применения, действует неделю', chance: '45%' },
  { icon: 'flash-outline', title: 'Быстрая энергия', desc: 'Слот за 5 минут, действует неделю', chance: '35%' },
  { icon: 'shield-checkmark-outline', title: 'Щит цепочки +1 день', desc: 'Один пропуск не прервёт серию', chance: '22%' },
  { icon: 'ticket-outline', title: '+5 игр арены', desc: 'Дополнительные рейтинговые матчи', chance: '20%' },
  { icon: 'diamond', title: 'Бонус-осколки 10–22', desc: 'Сверх базовой награды', chance: '15%' },
  { icon: 'cube-outline', title: 'Набор на 48 часов', desc: 'Полный доступ к платному набору', chance: '8%' },
  { icon: 'sparkles-outline', title: 'Аура аватара', desc: 'Новая аура — навсегда', chance: '10% · корона 22%' },
  { icon: 'person-circle-outline', title: 'Аватар', desc: 'Новый аватар — навсегда', chance: '6% · корона 12%' },
  { icon: 'trophy-outline', title: 'Золотая тема', desc: 'Навсегда; дубль → +25 осколков', chance: '5% · корона 8%' },
];

/** Прочие подарочные механики вне каталогов уровня. */
const OTHER_GIFT_ROWS: { icon: string; title: string; desc: string }[] = [
  { icon: 'people-outline', title: 'VIP за друга — 7 дней', desc: 'Друг прошёл первую сессию на бронзу — тебе неделя VIP. До 30 друзей в месяц.' },
  { icon: 'cube-outline', title: 'Ваучер набора 48 ч', desc: 'Открой любой платный набор бесплатно. Сгорает при активации — один раз.' },
  { icon: 'checkbox-outline', title: 'XP за миссии дня', desc: 'Забери награду тостом после выполненной миссии.' },
  { icon: 'ribbon-outline', title: 'Осколки за достижения', desc: 'Готовые награды ждут на экране достижений.' },
];

function GroupHeader({ label, count }: { label: string; count?: number }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Text style={{ color: ADMIN_TEXT, fontSize: 13, fontWeight: '800' }}>{label}</Text>
      {count !== undefined && (
        <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: 12, fontWeight: '700' }}>{count}</Text>
      )}
    </View>
  );
}

function LevelGiftRow({ gift, milestoneLevels }: { gift: GiftDef; milestoneLevels: number[] }) {
  const artVariant = gift.id.startsWith('prem_') || gift.id.startsWith('premium_') ? 'premium' : gift.rarity;
  const giftTitleRu = giftTitleForLang(gift, 'ru');
  const giftTitleEs = giftTitleForLang(gift, 'es');
  const giftDescRu = giftDescForLang(gift, 'ru');
  const giftDescEs = giftDescForLang(gift, 'es');
  const metaParts: string[] = [`вес ${gift.weight}`];
  if (milestoneLevels.length > 0) metaParts.push(`веха: ур. ${milestoneLevels.join(', ')}`);
  if (gift.choices?.length) metaParts.push(`выбор из ${gift.choices.length}`);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9, borderBottomWidth: 0.5, borderBottomColor: ADMIN_BORDER_MUTED, gap: 10 }}>
      <LevelGiftArt themeMode="minimalDark" variant={artVariant} size={34} />
      <Image source={getLevelGiftRewardIcon(gift.id)} style={{ width: 26, height: 26 }} contentFit="contain" />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ color: ADMIN_TEXT, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
            {gift.icon} {giftTitleRu}
          </Text>
          <Text style={{ color: RARITY_COLOR[gift.rarity], fontSize: 10, fontWeight: '800' }}>
            {giftRarityUiLabel(gift.rarity, 'ru')}
          </Text>
        </View>
        {!!giftDescRu && (
          <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: 11, lineHeight: 15, marginTop: 1 }}>
            {giftDescRu}
          </Text>
        )}
        {(giftTitleEs !== giftTitleRu || giftDescEs !== giftDescRu) && (
          <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: 10, lineHeight: 14, marginTop: 1, opacity: 0.82 }}>
            ES: {giftTitleEs}{giftDescEs ? ` — ${giftDescEs}` : ''}
          </Text>
        )}
        <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: 10, marginTop: 2, opacity: 0.8 }}>
          {gift.id} · {metaParts.join(' · ')}
        </Text>
      </View>
    </View>
  );
}

function IconRow({ icon, title, desc, right }: { icon: string; title: string; desc: string; right?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: ADMIN_BORDER_MUTED, gap: 12 }}>
      <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: ADMIN_SURFACE_ELEVATED, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon as any} size={17} color={ADMIN_TEXT} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: ADMIN_TEXT, fontSize: 13, fontWeight: '700' }}>{title}</Text>
        <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: 11, lineHeight: 15, marginTop: 1 }}>{desc}</Text>
      </View>
      {!!right && (
        <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: 11, fontWeight: '800' }}>{right}</Text>
      )}
    </View>
  );
}

export default function GiftsCatalogSection({ open, onToggle }: {
  open: boolean; onToggle: (id: string) => void;
}) {
  const { f2pByRarity, premiumPool, packUnlocks, milestoneByGiftId, milestoneRows, totalCount } = useMemo(() => {
    const f2pIds = new Set(GIFT_POOL.map((g) => g.id));
    const f2p = GIFT_POOL;
    const packs = ALL_LEVEL_GIFT_DEFS.filter(isPackUnlockGift);
    const premium = ALL_LEVEL_GIFT_DEFS.filter((g) => !f2pIds.has(g.id) && !isPackUnlockGift(g));

    const byGift: Record<string, number[]> = {};
    const rows: { level: number; title: string }[] = [];
    for (const level of LEVEL_GIFT_MILESTONE_LEVELS) {
      const gift = getMilestoneLevelGift(level);
      if (!gift) continue;
      (byGift[gift.id] ??= []).push(level);
      rows.push({ level, title: `${gift.icon} ${giftTitleForLang(gift, 'ru')} / ${giftTitleForLang(gift, 'es')}` });
    }

    const grouped = RARITY_ORDER.map((rarity) => ({
      rarity,
      gifts: f2p.filter((g) => g.rarity === rarity),
    }));

    return {
      f2pByRarity: grouped,
      premiumPool: premium,
      packUnlocks: packs,
      milestoneByGiftId: byGift,
      milestoneRows: rows,
      totalCount: f2p.length + premium.length + packs.length + FRIEND_GIFT_CATALOG.length + LEAGUE_CHEST_ROWS.length,
    };
  }, []);

  return (
    <AccordionSection
      id="gifts_catalog"
      icon="gift-outline"
      title="Справочник подарков"
      badge={totalCount}
      open={open}
      onToggle={onToggle}
    >
      <AdminHint>
        Все подарки прода в одном списке: арты, иконки и описания — дословно из каталогов
        (тексты по Библии Phraseman, как их видит игрок). Только просмотр — ничего не начисляет.
      </AdminHint>

      {f2pByRarity.map(({ rarity, gifts }) => (
        <View key={rarity}>
          <GroupHeader label={`За уровень — ${giftRarityUiLabel(rarity, 'ru').replace('✨ ', '')}`} count={gifts.length} />
          {gifts.map((gift) => (
            <LevelGiftRow key={gift.id} gift={gift} milestoneLevels={milestoneByGiftId[gift.id] ?? []} />
          ))}
        </View>
      ))}

      <GroupHeader label="За уровень — премиум-пул" count={premiumPool.length} />
      {premiumPool.map((gift) => (
        <LevelGiftRow key={gift.id} gift={gift} milestoneLevels={[]} />
      ))}

      <GroupHeader label="Наборы навсегда — премиум-дорожка" count={packUnlocks.length} />
      <AdminHint>
        Шанс {Math.round(PREMIUM_LEVEL_PACK_GIFT_DROP_CHANCE * 100)}% на уровень, без повтора
        уже открытого набора.
      </AdminHint>
      {packUnlocks.map((gift) => (
        <LevelGiftRow key={gift.id} gift={gift} milestoneLevels={[]} />
      ))}

      <GroupHeader label="Вехи уровней — гарантия" count={milestoneRows.length} />
      {milestoneRows.map(({ level, title }) => (
        <View key={level} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 7, borderBottomWidth: 0.5, borderBottomColor: ADMIN_BORDER_MUTED, gap: 10 }}>
          <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: 12, fontWeight: '800', width: 56 }}>ур. {level}</Text>
          <Text style={{ color: ADMIN_TEXT, fontSize: 12, fontWeight: '600', flex: 1 }} numberOfLines={1}>{title}</Text>
        </View>
      ))}

      <GroupHeader label="Подарки друзьям" count={FRIEND_GIFT_CATALOG.length} />
      <AdminHint>Лимиты сервера: 3 подарка в день, одному другу — 1 в день.</AdminHint>
      {FRIEND_GIFT_CATALOG.map((gift) => (
        <IconRow
          key={gift.id}
          icon={gift.icon}
          title={`${gift.labelRu} / ${gift.labelEs}`}
          desc={`${gift.descRu} / ${gift.descEs}`}
          right={`${gift.costShards} оск.`}
        />
      ))}

      <GroupHeader label="Сундук лиги — финал недели" count={LEAGUE_CHEST_ROWS.length} />
      <AdminHint>Ролл серверный и детерминированный; «корона» — повышенный шанс для победителя недели.</AdminHint>
      {LEAGUE_CHEST_ROWS.map((row) => (
        <IconRow key={row.title} icon={row.icon} title={row.title} desc={row.desc} right={row.chance} />
      ))}

      <GroupHeader label="Остальные подарочные механики" count={OTHER_GIFT_ROWS.length} />
      {OTHER_GIFT_ROWS.map((row) => (
        <IconRow key={row.title} icon={row.icon} title={row.title} desc={row.desc} />
      ))}
    </AccordionSection>
  );
}
