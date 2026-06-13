import React, { useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import BouncyScrollView from '../components/BouncyScrollView';
import LevelGiftArt from '../components/LevelGiftArt';
import ScreenGradient from '../components/ScreenGradient';
import { useLang } from '../components/LangContext';
import { useTheme } from '../components/ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import { triLang } from '../constants/i18n';
import { getLevelGiftRewardIcon } from '../constants/levelGiftRewardIcons';
import {
  ALL_LEVEL_GIFT_DEFS,
  GIFT_POOL,
  LEVEL_GIFT_MILESTONE_LEVELS,
  PREMIUM_LEVEL_PACK_GIFT_DROP_CHANCE,
  getMilestoneLevelGift,
  giftDisplayDescForLang,
  giftDisplayTitleForLang,
  giftRarityUiLabel,
  type GiftDef,
  type GiftRarity,
} from './level_gift_system';
import { FRIEND_GIFT_CATALOG } from './friend_gifts';
import { safeRouterBack } from './navigation_back';

const RARITY_ORDER: GiftRarity[] = ['common', 'rare', 'epic'];

const RARITY_COLOR: Record<GiftRarity, string> = {
  common: '#8C94A0',
  rare: '#5CA8FF',
  epic: '#C792EA',
};

const RARITY_BG: Record<GiftRarity, string> = {
  common: '#8C94A022',
  rare: '#5CA8FF22',
  epic: '#C792EA22',
};

const isPackUnlockGift = (g: GiftDef) => g.id.startsWith('prem_level_unlock_');
const isPremiumGift = (g: GiftDef) => !GIFT_POOL.some(f => f.id === g.id) && !isPackUnlockGift(g);

const LEAGUE_CHEST_REWARDS: { icon: string; title: string; desc: string; chance: string }[] = [
  { icon: 'diamond-outline',      title: 'Осколки',         desc: 'Базовая награда — 15–35 осколков за финал недели',    chance: 'всегда' },
  { icon: 'flame-outline',        title: 'Буст ×2 XP',      desc: '3 применения, действует неделю',                      chance: '45%' },
  { icon: 'flash-outline',        title: 'Быстрая энергия', desc: 'Слот за 5 минут, действует неделю',                   chance: '35%' },
  { icon: 'shield-checkmark-outline', title: 'Щит цепочки', desc: 'Один пропуск не прервёт твою серию',                 chance: '22%' },
  { icon: 'ticket-outline',       title: '+5 игр арены',    desc: 'Дополнительные рейтинговые матчи',                    chance: '20%' },
  { icon: 'diamond',              title: 'Бонус-осколки',   desc: 'Сверх базовой награды — ещё 10–22 осколка',           chance: '15%' },
  { icon: 'cube-outline',         title: 'Набор на 48 ч',   desc: 'Полный доступ к платному набору бесплатно',           chance: '8%' },
  { icon: 'sparkles-outline',     title: 'Аура аватара',    desc: 'Новая аура — навсегда',                               chance: '10%' },
  { icon: 'person-circle-outline', title: 'Аватар',         desc: 'Новый аватар — навсегда',                             chance: '6%' },
  { icon: 'trophy-outline',       title: 'Золотая тема',    desc: 'Редкая тема навсегда. Если уже есть — +25 осколков', chance: '5%' },
];

// Описания в стиле Библии Phraseman — кратко, с глаголом, на языке Игры
const LEVEL_GIFT_BIBLE_DESC: Partial<Record<string, string>> = {
  energy_full:         'Все слоты энергии — сейчас. Можно начинать прямо сейчас.',
  energy_plus1:        'Один бонусный слот энергии до полуночи.',
  energy_plus2:        'Два бонусных слота энергии до полуночи.',
  energy_plus3:        'Три бонусных слота энергии до полуночи.',
  xp_50:               'Мгновенные +50 опыта — прямо на счёт.',
  xp_100:              'Мгновенные +100 опыта — прямо на счёт.',
  xp_250:              'Мгновенные +250 опыта. Хорошая прибавка к уровню.',
  hint_1:              'Дополнительная подсказка в уроках сегодня.',
  hint_3:              'Три подсказки для уроков сегодня — используй с умом.',
  shards_3:            'Три осколка знаний — накопи на что-то ценное.',
  shards_6:            'Шесть осколков за один раз. Редкая удача.',
  shards_10:           'Десять осколков — крупная находка.',
  xp_bank_150:         'Следующие 150 XP удваиваются. Активируется автоматически во время занятия.',
  xp_bank_300:         'Следующие 300 XP удваиваются. Чем дольше учишься — тем больше берёшь.',
  xp_bank_600:         'Следующие 600 XP удваиваются. Большой буст для долгого занятия.',
  focus_10m_25:        '10 минут с множителем XP ×1.25. Включается на следующем занятии.',
  focus_15m_50:        '15 минут с множителем XP ×1.5. Максимум отдачи за сессию.',
  arena_extra_5:       '+5 рейтинговых матчей сегодня — до 10 игр вместо 5.',
  xp_2x_24h:          'Все занятия дают +100% опыта целый день.',
  xp_2x_48h:          'Все занятия дают +100% опыта два дня подряд.',
  chain_shield_1:      'Один день без занятий не прервёт твою серию.',
  chain_shield_3:      'Три дня защиты серии. Пропусти без потерь.',
  cosmetic_avatar_common: 'Случайный новый аватар откроется бесплатно.',
  cosmetic_avatar_aura:   'Случайная аура откроется и появится вокруг аватара.',
  club_boost_free:     'Следующий буст клуба активируешь бесплатно — без осколков.',
  wager_discount_25:   'Следующее пари обойдётся на 25% дешевле. Один раз.',
  pack_voucher_48h:    'Любой платный набор — бесплатно на 48 часов. Один раз.',
  choice_3_level:      'Открой три варианта и выбери одну награду.',
};

function SectionTitle({ title, count }: { title: string; count?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 }}>
      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 0.3, opacity: 0.9 }}>{title}</Text>
      {count !== undefined && (
        <View style={{ backgroundColor: '#ffffff20', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 }}>
          <Text style={{ color: '#ffffff90', fontSize: 11, fontWeight: '700' }}>{count}</Text>
        </View>
      )}
    </View>
  );
}

function HintBar({ text }: { text: string }) {
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 8, backgroundColor: '#ffffff0A', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 }}>
      <Text style={{ color: '#ffffff70', fontSize: 12, lineHeight: 18 }}>{text}</Text>
    </View>
  );
}

function GiftCard({ gift, lang, isLast }: { gift: GiftDef; lang: string; isLast: boolean }) {
  const artVariant = gift.id.startsWith('prem_') || isPremiumGift(gift) ? 'premium' : gift.rarity;
  const title = giftDisplayTitleForLang(gift, lang as any);
  const desc = LEVEL_GIFT_BIBLE_DESC[gift.id] ?? giftDisplayDescForLang(gift, lang as any);
  const rarityColor = RARITY_COLOR[gift.rarity] ?? '#8C94A0';
  const rarityBg = RARITY_BG[gift.rarity] ?? '#8C94A022';
  const rarityLabel = giftRarityUiLabel(gift.rarity, lang as any);

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: isLast ? 0 : 0.5,
      borderBottomColor: '#ffffff12',
      gap: 12,
    }}>
      <LevelGiftArt themeMode="minimalDark" variant={artVariant} size={36} />
      <Image source={getLevelGiftRewardIcon(gift.id)} style={{ width: 28, height: 28 }} contentFit="contain" />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', flexShrink: 1 }} numberOfLines={1}>
            {gift.icon} {title}
          </Text>
          <View style={{ backgroundColor: rarityBg, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1.5 }}>
            <Text style={{ color: rarityColor, fontSize: 10, fontWeight: '800' }}>
              {rarityLabel.replace('✨ ', '')}
            </Text>
          </View>
        </View>
        <Text style={{ color: '#ffffff80', fontSize: 12, lineHeight: 17 }} numberOfLines={2}>
          {desc}
        </Text>
      </View>
    </View>
  );
}

function MilestoneRow({ level, title, isLast }: { level: number; title: string; isLast: boolean }) {
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: isLast ? 0 : 0.5,
      borderBottomColor: '#ffffff12',
      gap: 14,
    }}>
      <View style={{ width: 48, height: 28, backgroundColor: '#ffffff12', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#ffffff60', fontSize: 11, fontWeight: '900' }}>ур.{level}</Text>
      </View>
      <Text style={{ color: '#ffffffCC', fontSize: 13, fontWeight: '600', flex: 1 }} numberOfLines={1}>{title}</Text>
      <Ionicons name="checkmark-circle" size={16} color="#4ADE80" style={{ opacity: 0.6 }} />
    </View>
  );
}

function FriendGiftRow({ icon, title, desc, cost, isLast }: { icon: string; title: string; desc: string; cost: number; isLast: boolean }) {
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: isLast ? 0 : 0.5,
      borderBottomColor: '#ffffff12',
      gap: 12,
    }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#5CA8FF20', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 2 }}>{title}</Text>
        <Text style={{ color: '#ffffff80', fontSize: 12, lineHeight: 17 }}>{desc}</Text>
      </View>
      <View style={{ backgroundColor: '#FFD70025', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <Text style={{ fontSize: 11 }}>💎</Text>
        <Text style={{ color: '#FFD700', fontSize: 12, fontWeight: '800' }}>{cost}</Text>
      </View>
    </View>
  );
}

function ChestRow({ icon, title, desc, chance, isLast }: { icon: string; title: string; desc: string; chance: string; isLast: boolean }) {
  const isAlways = chance === 'всегда';
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: isLast ? 0 : 0.5,
      borderBottomColor: '#ffffff12',
      gap: 12,
    }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: isAlways ? '#F59E0B20' : '#ffffff10', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon as any} size={18} color={isAlways ? '#F59E0B' : '#ffffffAA'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 2 }}>{title}</Text>
        <Text style={{ color: '#ffffff80', fontSize: 12, lineHeight: 17 }}>{desc}</Text>
      </View>
      <View style={{ backgroundColor: isAlways ? '#F59E0B20' : '#ffffff0F', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
        <Text style={{ color: isAlways ? '#F59E0B' : '#ffffff80', fontSize: 12, fontWeight: '800' }}>{chance}</Text>
      </View>
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View style={{
      marginHorizontal: 16,
      backgroundColor: '#ffffff08',
      borderRadius: 16,
      borderWidth: 0.5,
      borderColor: '#ffffff18',
      overflow: 'hidden',
    }}>
      {children}
    </View>
  );
}

export default function SettingsGifts() {
  const router = useRouter();
  const { lang } = useLang();

  const { f2pByRarity, premiumPool, packUnlocks, milestoneRows, totalF2p } = useMemo(() => {
    const f2pSet = new Set(GIFT_POOL.map(g => g.id));
    const f2p = GIFT_POOL;
    const packs = ALL_LEVEL_GIFT_DEFS.filter(isPackUnlockGift);
    const premium = ALL_LEVEL_GIFT_DEFS.filter(g => !f2pSet.has(g.id) && !isPackUnlockGift(g));

    const grouped = RARITY_ORDER.map(rarity => ({
      rarity,
      gifts: f2p.filter(g => g.rarity === rarity),
    }));

    const rows: { level: number; title: string }[] = [];
    for (const level of LEVEL_GIFT_MILESTONE_LEVELS) {
      const gift = getMilestoneLevelGift(level);
      if (!gift) continue;
      const title = giftDisplayTitleForLang(gift, lang as any);
      rows.push({ level, title: `${gift.icon} ${title}` });
    }

    return {
      f2pByRarity: grouped,
      premiumPool: premium,
      packUnlocks: packs,
      milestoneRows: rows,
      totalF2p: f2p.length,
    };
  }, [lang]);

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Хедер */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          gap: 8,
        }}>
          <TouchableOpacity
            onPress={() => { hapticTap(); safeRouterBack(router, '/(tabs)/settings' as any); }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800' }}>
              {triLang(lang, {
                ru: 'Все подарки',
                uk: 'Всі подарунки',
                es: 'Todos los regalos',
                'pt-BR': 'Todos os presentes',
                vi: 'Tất cả quà',
                id: 'Semua hadiah',
                tr: 'Tüm hediyeler',
                pl: 'Wszystkie nagrody',
              })}
            </Text>
            <Text style={{ color: '#ffffff60', fontSize: 12, marginTop: 1 }}>
              {triLang(lang, {
                ru: 'Что можно получить в Phraseman',
                uk: 'Що можна отримати в Phraseman',
                es: 'Lo que puedes ganar en Phraseman',
                'pt-BR': 'O que você pode ganhar no Phraseman',
                vi: 'Những gì bạn có thể nhận trong Phraseman',
                id: 'Apa yang bisa kamu dapatkan di Phraseman',
                tr: 'Phraseman\'da kazanabileceklerin',
                pl: 'Co możesz zdobyć w Phraseman',
              })}
            </Text>
          </View>
          <Text style={{ fontSize: 22 }}>🎁</Text>
        </View>

        <BouncyScrollView
          decelerationRate="normal"
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* F2P подарки по редкости */}
          {f2pByRarity.map(({ rarity, gifts }) => {
            if (gifts.length === 0) return null;
            const rarityColor = RARITY_COLOR[rarity];
            const label = triLang(lang, {
              ru: rarity === 'common' ? 'Обычные' : rarity === 'rare' ? 'Редкие' : 'Эпические',
              uk: rarity === 'common' ? 'Звичайні' : rarity === 'rare' ? 'Рідкісні' : 'Епічні',
              es: rarity === 'common' ? 'Comunes' : rarity === 'rare' ? 'Raros' : 'Épicos',
              'pt-BR': rarity === 'common' ? 'Comuns' : rarity === 'rare' ? 'Raros' : 'Épicos',
              vi: rarity === 'common' ? 'Thường' : rarity === 'rare' ? 'Hiếm' : 'Huyền thoại',
              id: rarity === 'common' ? 'Umum' : rarity === 'rare' ? 'Langka' : 'Epik',
              tr: rarity === 'common' ? 'Yaygın' : rarity === 'rare' ? 'Nadir' : 'Destansı',
              pl: rarity === 'common' ? 'Zwykłe' : rarity === 'rare' ? 'Rzadkie' : 'Epickie',
            });
            return (
              <View key={rarity}>
                <SectionTitle
                  title={triLang(lang, {
                    ru: `За уровень — ${label}`,
                    uk: `За рівень — ${label}`,
                    es: `Por nivel — ${label}`,
                    'pt-BR': `Por nível — ${label}`,
                    vi: `Theo cấp — ${label}`,
                    id: `Per level — ${label}`,
                    tr: `Seviyeye göre — ${label}`,
                    pl: `Za poziom — ${label}`,
                  })}
                  count={gifts.length}
                />
                <Card>
                  {gifts.map((gift, i) => (
                    <GiftCard key={gift.id} gift={gift} lang={lang} isLast={i === gifts.length - 1} />
                  ))}
                </Card>
              </View>
            );
          })}

          {/* Вехи уровней */}
          <SectionTitle
            title={triLang(lang, {
              ru: 'Гарантированные вехи',
              uk: 'Гарантовані віхи',
              es: 'Hitos garantizados',
              'pt-BR': 'Marcos garantidos',
              vi: 'Mốc được đảm bảo',
              id: 'Pencapaian terjamin',
              tr: 'Garantili kilometre taşları',
              pl: 'Gwarantowane kamienie milowe',
            })}
            count={milestoneRows.length}
          />
          <HintBar text={triLang(lang, {
            ru: 'На этих уровнях подарок всегда один — не зависит от случайности',
            uk: 'На цих рівнях подарунок завжди один — не залежить від випадку',
            es: 'En estos niveles el regalo es siempre el mismo — no depende del azar',
            'pt-BR': 'Nestes níveis o presente é sempre o mesmo — não depende do acaso',
            vi: 'Ở những cấp này, quà luôn giống nhau — không phụ thuộc vào may mắn',
            id: 'Di level ini hadiahnya selalu sama — tidak bergantung pada keberuntungan',
            tr: 'Bu seviyelerde hediye her zaman aynı — şansa bağlı değil',
            pl: 'Na tych poziomach nagroda jest zawsze ta sama — nie zależy od losowości',
          })} />
          <Card>
            {milestoneRows.map((row, i) => (
              <MilestoneRow key={row.level} level={row.level} title={row.title} isLast={i === milestoneRows.length - 1} />
            ))}
          </Card>

          {/* Наборы навсегда */}
          {packUnlocks.length > 0 && (
            <>
              <SectionTitle
                title={triLang(lang, {
                  ru: 'Наборы навсегда',
                  uk: 'Набори назавжди',
                  es: 'Paquetes permanentes',
                  'pt-BR': 'Pacotes permanentes',
                  vi: 'Gói vĩnh viễn',
                  id: 'Paket selamanya',
                  tr: 'Kalıcı paketler',
                  pl: 'Pakiety na zawsze',
                })}
                count={packUnlocks.length}
              />
              <HintBar text={triLang(lang, {
                ru: `Открываются по мере роста уровня. Шанс ${Math.round(PREMIUM_LEVEL_PACK_GIFT_DROP_CHANCE * 100)}% за уровень, каждый набор — только раз`,
                uk: `Відкриваються з підвищенням рівня. Шанс ${Math.round(PREMIUM_LEVEL_PACK_GIFT_DROP_CHANCE * 100)}% за рівень, кожен набір — тільки раз`,
                es: `Se abren al subir de nivel. ${Math.round(PREMIUM_LEVEL_PACK_GIFT_DROP_CHANCE * 100)}% de probabilidad por nivel, cada paquete solo una vez`,
                'pt-BR': `Abertos ao subir de nível. Chance de ${Math.round(PREMIUM_LEVEL_PACK_GIFT_DROP_CHANCE * 100)}% por nível, cada pacote apenas uma vez`,
                vi: `Mở khi lên cấp. Cơ hội ${Math.round(PREMIUM_LEVEL_PACK_GIFT_DROP_CHANCE * 100)}% mỗi cấp, mỗi gói chỉ một lần`,
                id: `Dibuka saat naik level. Peluang ${Math.round(PREMIUM_LEVEL_PACK_GIFT_DROP_CHANCE * 100)}% per level, setiap paket hanya sekali`,
                tr: `Seviye atlayınca açılır. Level başına ${Math.round(PREMIUM_LEVEL_PACK_GIFT_DROP_CHANCE * 100)}% şans, her paket yalnızca bir kez`,
                pl: `Odblokowują się wraz z levelowaniem. Szansa ${Math.round(PREMIUM_LEVEL_PACK_GIFT_DROP_CHANCE * 100)}% za poziom, każdy pakiet tylko raz`,
              })} />
              <Card>
                {packUnlocks.map((gift, i) => (
                  <GiftCard key={gift.id} gift={gift} lang={lang} isLast={i === packUnlocks.length - 1} />
                ))}
              </Card>
            </>
          )}

          {/* Подарки другу */}
          <SectionTitle
            title={triLang(lang, {
              ru: 'Подарки другу',
              uk: 'Подарунки другу',
              es: 'Regalos para amigos',
              'pt-BR': 'Presentes para amigos',
              vi: 'Quà cho bạn bè',
              id: 'Hadiah untuk teman',
              tr: 'Arkadaşa hediyeler',
              pl: 'Prezenty dla przyjaciela',
            })}
            count={FRIEND_GIFT_CATALOG.length}
          />
          <HintBar text={triLang(lang, {
            ru: 'До 3 подарков в день, одному другу — не больше 1 в день',
            uk: 'До 3 подарунків на день, одному другу — не більше 1 на день',
            es: 'Hasta 3 regalos al día, a un mismo amigo máximo 1 al día',
            'pt-BR': 'Até 3 presentes por dia, a um amigo no máximo 1 por dia',
            vi: 'Tối đa 3 quà mỗi ngày, cho một bạn không quá 1 mỗi ngày',
            id: 'Hingga 3 hadiah per hari, untuk satu teman maksimal 1 per hari',
            tr: 'Günde en fazla 3 hediye, bir arkadaşa en fazla 1 hediye',
            pl: 'Do 3 prezentów dziennie, jednemu przyjacielowi maks. 1 dziennie',
          })} />
          <Card>
            {FRIEND_GIFT_CATALOG.map((gift, i) => (
              <FriendGiftRow
                key={gift.id}
                icon={gift.icon}
                title={gift.labelRu}
                desc={gift.descRu}
                cost={gift.costShards}
                isLast={i === FRIEND_GIFT_CATALOG.length - 1}
              />
            ))}
          </Card>

          {/* Сундук лиги */}
          <SectionTitle
            title={triLang(lang, {
              ru: 'Сундук лиги — финал недели',
              uk: 'Скриня ліги — фінал тижня',
              es: 'Cofre de liga — final de semana',
              'pt-BR': 'Baú de liga — final de semana',
              vi: 'Rương liên minh — cuối tuần',
              id: 'Peti liga — akhir minggu',
              tr: 'Lig sandığı — hafta finali',
              pl: 'Skrzynia ligi — finał tygodnia',
            })}
            count={LEAGUE_CHEST_REWARDS.length}
          />
          <HintBar text={triLang(lang, {
            ru: 'Достигни вершины лиги к воскресенью — сундук откроется автоматически',
            uk: 'Досягни вершини ліги до неділі — скриня відкриється автоматично',
            es: 'Llega a la cima de la liga antes del domingo — el cofre se abrirá solo',
            'pt-BR': 'Alcance o topo da liga até domingo — o baú abrirá automaticamente',
            vi: 'Đạt đỉnh bảng xếp hạng trước Chủ nhật — rương sẽ tự mở',
            id: 'Capai puncak liga sebelum Minggu — peti akan terbuka otomatis',
            tr: 'Pazar gününden önce ligin zirvesine ulaş — sandık otomatik açılır',
            pl: 'Osiągnij szczyt ligi przed niedzielą — skrzynia otworzy się automatycznie',
          })} />
          <Card>
            {LEAGUE_CHEST_REWARDS.map((row, i) => (
              <ChestRow
                key={row.title}
                icon={row.icon}
                title={row.title}
                desc={row.desc}
                chance={row.chance}
                isLast={i === LEAGUE_CHEST_REWARDS.length - 1}
              />
            ))}
          </Card>

          {/* Реферальный подарок */}
          <SectionTitle
            title={triLang(lang, {
              ru: 'За приглашение друга',
              uk: 'За запрошення друга',
              es: 'Por invitar a un amigo',
              'pt-BR': 'Por convidar um amigo',
              vi: 'Khi mời bạn bè',
              id: 'Untuk mengundang teman',
              tr: 'Arkadaş davet etmek için',
              pl: 'Za zaproszenie przyjaciela',
            })}
          />
          <Card>
            <View style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#C792EA20', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18 }}>👥</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 3 }}>
                  {triLang(lang, {
                    ru: 'VIP на 7 дней',
                    uk: 'VIP на 7 днів',
                    es: '7 días VIP',
                    'pt-BR': '7 dias VIP',
                    vi: 'VIP 7 ngày',
                    id: 'VIP 7 hari',
                    tr: '7 günlük VIP',
                    pl: 'VIP na 7 dni',
                  })}
                </Text>
                <Text style={{ color: '#ffffff80', fontSize: 12, lineHeight: 17 }}>
                  {triLang(lang, {
                    ru: 'Друг прошёл первую сессию и получил бронзу — тебе 7 дней VIP. До 30 друзей в месяц.',
                    uk: 'Друг пройшов першу сесію і отримав бронзу — тобі 7 днів VIP. До 30 друзів на місяць.',
                    es: 'Tu amigo completa la primera sesión y gana bronce — tú recibes 7 días VIP. Hasta 30 amigos al mes.',
                    'pt-BR': 'Seu amigo completa a primeira sessão e ganha bronze — você recebe 7 dias VIP. Até 30 amigos por mês.',
                    vi: 'Bạn bè hoàn thành phiên đầu và đạt đồng — bạn nhận VIP 7 ngày. Tối đa 30 bạn mỗi tháng.',
                    id: 'Temanmu menyelesaikan sesi pertama dan mendapat perunggu — kamu dapat VIP 7 hari. Maks. 30 teman per bulan.',
                    tr: 'Arkadaşın ilk oturumu tamamlar ve bronz alır — sana 7 günlük VIP gelir. Ayda maks. 30 arkadaş.',
                    pl: 'Znajomy ukończy pierwszą sesję i zdobędzie brąz — dostajesz VIP na 7 dni. Do 30 przyjaciół miesięcznie.',
                  })}
                </Text>
              </View>
            </View>
          </Card>

          <View style={{ height: 8 }} />
        </BouncyScrollView>
      </SafeAreaView>
    </ScreenGradient>
  );
}
