// ════════════════════════════════════════════════════════════════════════════
// season_pass.tsx — экран дорожки Season Pass (макет «Причал»: две линии наград,
// хребет прогресса по центру). Прогресс уровня считается по-настоящему
// (season_pass_model ← registerXP). Клейм (владелец, 2026-08-03: «каждый подарок
// обязан быть рабочим») — локальный: пройденный уровень кладёт подарок в
// season_pass_gift_inventory.ts, открывается SeasonGiftModal с «Позже/Применить».
// Серверная синхронизация клеймов (реплей на смене устройства/переустановке) —
// следующий этап, отдельно от того, работает ли подарок физически сегодня.
// Покупка платной дорожки остаётся витриной — это ДЕНЬГИ, не подарок, ей
// нужна server-side проверка перед включением (см. кнопку «Открыть пропуск» ниже).
// ════════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, FlatList, Image, Modal, Text, TouchableOpacity, View, type ListRenderItemInfo } from 'react-native';
import { FlowText } from '../components/text-integrity/FlowText';
import { Stack, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { triLang, type Lang } from '../constants/i18n';
import { actionToastTri, emitAppEvent, onAppEvent } from './events';
import { hapticTap } from '../hooks/use-haptics';
import { pearlIconForTheme } from './coin_icons';
import { safeRouterBack } from './navigation_back';
import TapScale from '../components/TapScale';
import {
  hydrateSeasonPassProgress,
  peekSeasonPassProgress,
  getSeasonPassSeasonId,
  SEASON_PASS_LEVELS,
  seasonPassDaysLeft,
  type SeasonPassProgress,
} from './season_pass_model';
import {
  SEASON_AURA_STAGE_ASSETS,
  SEASON_REWARD_ICONS,
  SEASON_SECRET_AURA_ASSET,
  SEASON_TRACK,
  type SeasonReward,
  type SeasonTrackNode,
} from './season_pass_track_config';
import SeasonAuraRing from '../components/SeasonAuraRing';
import SeasonGiftModal from '../components/SeasonGiftModal';
import { addSeasonPassGift, loadPendingSeasonPassGiftCount } from './season_pass_gift_inventory';
import { seasonBuyPassOnServer, seasonClaimRewardOnServer } from './season_pass_server';
import { getShardsBalance, loadShardsFromCloud } from './shards_system';

const ROW_HEIGHT = 96;
const NODE_COLUMN_WIDTH = 56;
const SPINE_WIDTH = 4;
// зачем: владелец, 2026-08-03 — цена поднята с 250 до 350 (его прямое решение).
const SEASON_PASS_PRICE_PEARLS = 350;

const REWARD_LABELS: Record<SeasonReward['kind'], Record<Lang, string>> = {
  pearls:            { ru: 'Жемчужины', uk: 'Перлини', es: 'Perlas', 'pt-BR': 'Pérolas', vi: 'Ngọc trai', id: 'Mutiara', tr: 'İnciler', pl: 'Perły' },
  battery:           { ru: 'Полный заряд', uk: 'Повний заряд', es: 'Carga completa', 'pt-BR': 'Carga completa', vi: 'Sạc đầy', id: 'Isi penuh', tr: 'Tam şarj', pl: 'Pełna energia' },
  league_boost:      { ru: 'Буст лиги ×2', uk: 'Буст ліги ×2', es: 'Impulso liga ×2', 'pt-BR': 'Impulso liga ×2', vi: 'Tăng tốc giải ×2', id: 'Dorongan liga ×2', tr: 'Lig desteği ×2', pl: 'Boost ligi ×2' },
  club_totem:        { ru: 'Тотем клуба', uk: 'Тотем клубу', es: 'Tótem del club', 'pt-BR': 'Totem do clube', vi: 'Vật tổ câu lạc bộ', id: 'Totem klub', tr: 'Kulüp totemi', pl: 'Totem klubu' },
  golden_lesson:     { ru: 'Золотой урок', uk: 'Золотий урок', es: 'Lección dorada', 'pt-BR': 'Lição dourada', vi: 'Bài học vàng', id: 'Pelajaran emas', tr: 'Altın ders', pl: 'Złota lekcja' },
  collection_magnet: { ru: 'Магнит коллекции', uk: 'Магніт колекції', es: 'Imán de colección', 'pt-BR': 'Ímã de coleção', vi: 'Nam châm bộ sưu tập', id: 'Magnet koleksi', tr: 'Koleksiyon mıknatısı', pl: 'Magnes kolekcji' },
  turbo_regen:       { ru: 'Второе дыхание', uk: 'Друге дихання', es: 'Segundo aliento', 'pt-BR': 'Segundo fôlego', vi: 'Hồi phục nhanh', id: 'Napas kedua', tr: 'İkinci nefes', pl: 'Drugi oddech' },
  tournament_ticket: { ru: 'Билет на турнир', uk: 'Квиток на турнір', es: 'Entrada al torneo', 'pt-BR': 'Ingresso do torneio', vi: 'Vé giải đấu', id: 'Tiket turnamen', tr: 'Turnuva bileti', pl: 'Bilet na turniej' },
  time_machine:      { ru: 'Машина времени', uk: 'Машина часу', es: 'Máquina del tiempo', 'pt-BR': 'Máquina do tempo', vi: 'Cỗ máy thời gian', id: 'Mesin waktu', tr: 'Zaman makinesi', pl: 'Wehikuł czasu' },
  friend_shield:     { ru: 'Щит другу', uk: 'Щит другові', es: 'Escudo a un amigo', 'pt-BR': 'Escudo a um amigo', vi: 'Khiên cho bạn', id: 'Perisai untuk teman', tr: 'Arkadaşa kalkan', pl: 'Tarcza dla znajomego' },
  aura_secret:       { ru: 'Секретная аура', uk: 'Секретна аура', es: 'Aura secreta', 'pt-BR': 'Aura secreta', vi: 'Hào quang bí mật', id: 'Aura rahasia', tr: 'Gizli aura', pl: 'Sekretna aura' },
  choice_3:          { ru: 'Выбор из трёх', uk: 'Вибір із трьох', es: 'Elige una de tres', 'pt-BR': 'Escolha uma de três', vi: 'Chọn một trong ba', id: 'Pilih satu dari tiga', tr: 'Üçten birini seç', pl: 'Wybór z trzech' },
  xp_bank:           { ru: 'Банк опыта', uk: 'Банк досвіду', es: 'Banco de XP', 'pt-BR': 'Banco de XP', vi: 'Ngân hàng XP', id: 'Bank XP', tr: 'XP bankası', pl: 'Bank XP' },
  plus_days:         { ru: 'Дни Plus', uk: 'Дні Plus', es: 'Días Plus', 'pt-BR': 'Dias Plus', vi: 'Ngày Plus', id: 'Hari Plus', tr: 'Plus günleri', pl: 'Dni Plus' },
  frame:             { ru: 'Рамка профиля', uk: 'Рамка профілю', es: 'Marco de perfil', 'pt-BR': 'Moldura de perfil', vi: 'Khung hồ sơ', id: 'Bingkai profil', tr: 'Profil çerçevesi', pl: 'Ramka profilu' },
  aura_stage:        { ru: 'Аура · стадия', uk: 'Аура · стадія', es: 'Aura · etapa', 'pt-BR': 'Aura · estágio', vi: 'Hào quang · cấp', id: 'Aura · tahap', tr: 'Aura · aşama', pl: 'Aura · etap' },
  nick_color:        { ru: 'Цвет ника', uk: 'Колір ніка', es: 'Color del nombre', 'pt-BR': 'Cor do nome', vi: 'Màu biệt danh', id: 'Warna nama', tr: 'Takma ad rengi', pl: 'Kolor nicku' },
  custom_avatar:     { ru: 'Кастомный аватар', uk: 'Кастомний аватар', es: 'Avatar personalizado', 'pt-BR': 'Avatar personalizado', vi: 'Ảnh đại diện riêng', id: 'Avatar kustom', tr: 'Özel avatar', pl: 'Własny awatar' },
  card_pack:         { ru: 'Набор карточек', uk: 'Набір карток', es: 'Set de tarjetas', 'pt-BR': 'Pacote de cartões', vi: 'Bộ thẻ', id: 'Paket kartu', tr: 'Kart paketi', pl: 'Zestaw fiszek' },
  season_finale:     { ru: 'Финал сезона', uk: 'Фінал сезону', es: 'Final de temporada', 'pt-BR': 'Final da temporada', vi: 'Chung kết mùa', id: 'Final musim', tr: 'Sezon finali', pl: 'Finał sezonu' },
};

const CLAIMED_LEVELS_KEY = 'season_pass_claimed_v1';
const PASS_OWNED_KEY = 'season_pass_owned_v1';

type ClaimedMap = Record<string, true>; // `${seasonId}:${level}:${side}`

export default function SeasonPassScreen() {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const [progress, setProgress] = useState<SeasonPassProgress>(peekSeasonPassProgress);
  const [pendingGiftCount, setPendingGiftCount] = useState(0);
  const [openReward, setOpenReward] = useState<{ reward: SeasonReward; giftId: string } | null>(null);
  const [claimed, setClaimed] = useState<ClaimedMap>({});
  const [passOwned, setPassOwned] = useState(false);
  const [buying, setBuying] = useState(false);
  const [buyConfirmVisible, setBuyConfirmVisible] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  const seasonId = getSeasonPassSeasonId();

  const refreshPendingGiftCount = useCallback(() => {
    loadPendingSeasonPassGiftCount().then(setPendingGiftCount).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    hydrateSeasonPassProgress().then((p) => { if (alive) setProgress(p); });
    refreshPendingGiftCount();
    // Персистентные клеймы + владение пропуском + ник (для превью финала).
    AsyncStorage.multiGet([CLAIMED_LEVELS_KEY, PASS_OWNED_KEY, 'user_name']).then((pairs) => {
      if (!alive) return;
      try {
        const claimedRaw = pairs[0]?.[1];
        if (claimedRaw) setClaimed(JSON.parse(claimedRaw) as ClaimedMap);
      } catch { /* повреждённый кэш клеймов не должен ронять экран */ }
      try {
        const ownedRaw = pairs[1]?.[1];
        if (ownedRaw) {
          const parsed = JSON.parse(ownedRaw) as { seasonId?: string };
          setPassOwned(parsed?.seasonId === getSeasonPassSeasonId());
        }
      } catch { /* то же */ }
      setUserName(pairs[2]?.[1] ?? null);
    }).catch(() => {});
    const subXp = onAppEvent('season_pass_xp_changed', () => {
      if (alive) setProgress(peekSeasonPassProgress());
    });
    const subGifts = onAppEvent('season_pass_gift_inventory_changed', () => {
      if (alive) refreshPendingGiftCount();
    });
    return () => { alive = false; subXp.remove(); subGifts.remove(); };
  }, [refreshPendingGiftCount]);

  const daysLeft = seasonPassDaysLeft();
  const pearlIcon = pearlIconForTheme(themeMode);
  const pct = progress.levelCostXp > 0
    ? Math.min(100, Math.round((progress.intoLevelXp / progress.levelCostXp) * 100))
    : 100;

  const persistClaims = useCallback((next: ClaimedMap) => {
    AsyncStorage.setItem(CLAIMED_LEVELS_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  // ── Покупка платной дорожки (350 жемчужин, владелец 2026-08-03) ──────────
  // Optimistic: локальная проверка баланса → мгновенный unlock → серверная
  // транзакция seasonBuyPass; при отказе сервера откат + понятный тост.
  const onBuyPress = useCallback(() => {
    hapticTap();
    if (passOwned || buying) return;
    setBuyConfirmVisible(true);
  }, [buying, passOwned]);

  const onBuyConfirm = useCallback(async () => {
    if (buying) return;
    hapticTap();
    const balance = await getShardsBalance();
    if (balance < SEASON_PASS_PRICE_PEARLS) {
      setBuyConfirmVisible(false);
      emitAppEvent('action_toast', actionToastTri('warning', {
        ru: `Не хватает жемчужин: нужно ${SEASON_PASS_PRICE_PEARLS}`,
        uk: `Бракує перлин: потрібно ${SEASON_PASS_PRICE_PEARLS}`,
        es: `Faltan perlas: se necesitan ${SEASON_PASS_PRICE_PEARLS}`,
        'pt-BR': `Faltam pérolas: são necessárias ${SEASON_PASS_PRICE_PEARLS}`,
        vi: `Thiếu ngọc trai: cần ${SEASON_PASS_PRICE_PEARLS}`,
        id: `Mutiara kurang: perlu ${SEASON_PASS_PRICE_PEARLS}`,
        tr: `İnci yetersiz: ${SEASON_PASS_PRICE_PEARLS} gerekli`,
        pl: `Za mało pereł: potrzeba ${SEASON_PASS_PRICE_PEARLS}`,
      }));
      router.push('/shards_shop' as never);
      return;
    }
    setBuying(true);
    setBuyConfirmVisible(false);
    // Optimistic unlock — дорожка открывается сразу, двойной тап отсечён buying.
    setPassOwned(true);
    const res = await seasonBuyPassOnServer();
    if (res?.ok || res?.alreadyOwned) {
      await AsyncStorage.setItem(PASS_OWNED_KEY, JSON.stringify({ seasonId, purchasedAt: Date.now() })).catch(() => {});
      emitAppEvent('season_pass_plus_changed', undefined);
      // Сервер списал жемчуг — синхронизируем локальный кэш его балансом.
      void loadShardsFromCloud().catch(() => {});
    } else {
      setPassOwned(false); // откат optimistic-разблокировки
      emitAppEvent('action_toast', actionToastTri(res?.error === 'insufficient_shards' ? 'warning' : 'error', {
        ru: res?.error === 'insufficient_shards' ? 'Сервер: жемчужин недостаточно' : 'Покупка не прошла — попробуй ещё раз',
        uk: res?.error === 'insufficient_shards' ? 'Сервер: перлин недостатньо' : 'Покупка не пройшла — спробуй ще раз',
        es: res?.error === 'insufficient_shards' ? 'Servidor: perlas insuficientes' : 'La compra falló, inténtalo de nuevo',
        'pt-BR': res?.error === 'insufficient_shards' ? 'Servidor: pérolas insuficientes' : 'A compra falhou, tente novamente',
        vi: res?.error === 'insufficient_shards' ? 'Máy chủ: không đủ ngọc' : 'Mua thất bại — thử lại',
        id: res?.error === 'insufficient_shards' ? 'Server: mutiara kurang' : 'Pembelian gagal — coba lagi',
        tr: res?.error === 'insufficient_shards' ? 'Sunucu: inci yetersiz' : 'Satın alma başarısız — tekrar dene',
        pl: res?.error === 'insufficient_shards' ? 'Serwer: za mało pereł' : 'Zakup nie powiódł się — spróbuj ponownie',
      }));
    }
    setBuying(false);
  }, [buying, router, seasonId]);

  const onClaimReward = useCallback(async (reward: SeasonReward, level: number, side: 'free' | 'pass') => {
    hapticTap();
    const key = `${seasonId}:${level}:${side}`;
    if (claimed[key]) return; // защита от двойного тапа/гонки
    const nextClaimed: ClaimedMap = { ...claimed, [key]: true };
    setClaimed(nextClaimed);
    persistClaims(nextClaimed);
    const gift = await addSeasonPassGift(seasonId, level, side, reward.kind, reward.amount);
    refreshPendingGiftCount();
    setOpenReward({ reward, giftId: gift.id });
    // Серверная фиксация клейма (идемпотентна): pearls/plus_days выдаёт сервер,
    // статусы дублируются в облачный снапшот для переезда на новое устройство.
    void seasonClaimRewardOnServer({
      level, side, kind: reward.kind, amount: reward.amount, totalXp: progress.totalXp,
    }).then((res) => {
      if (res?.ok && reward.kind === 'pearls') void loadShardsFromCloud().catch(() => {});
    });
  }, [claimed, persistClaims, progress.totalXp, refreshPendingGiftCount, seasonId]);

  const renderReward = useCallback((reward: SeasonReward | undefined, side: 'free' | 'pass', reached: boolean, level: number) => {
    // Пустая сторона — прозрачный заполнитель ТОЙ ЖЕ формы, что и карточка,
    // чтобы высота строки была одинаковой независимо от того, где лежит награда
    // (макет: узкая колонка с одной картой, вторая половина строки пуста).
    if (!reward) return <View style={{ flex: 1, alignSelf: 'stretch' }} />;
    const icon = SEASON_REWARD_ICONS[reward.kind];
    const label = REWARD_LABELS[reward.kind][lang]
      + (reward.kind === 'aura_stage' ? ` ${['I', 'II', 'III', 'IV'][Math.max(0, (reward.amount ?? 1) - 1)]}` : '')
      + (reward.kind === 'plus_days' || reward.kind === 'xp_bank' ? ` ${reward.amount ?? ''}` : '');
    const isPassLane = side === 'pass';
    // Платная линия клеймится ТОЛЬКО после покупки (passOwned) — выдавать её
    // бесплатно значило бы дыру мимо кассы; до покупки на плитке замочек.
    const isClaimed = !!claimed[`${seasonId}:${level}:${side}`];
    const laneUnlocked = !isPassLane || passOwned;
    const claimable = laneUnlocked && reached && !isClaimed;
    const Wrapper = claimable ? TouchableOpacity : View;
    const wrapperProps = claimable
      ? { activeOpacity: 0.85, onPress: () => onClaimReward(reward, level, side), accessibilityRole: 'button' as const, testID: `season-pass-claim-${side}-${level}` }
      : {};
    return (
      <Wrapper {...wrapperProps} style={{
        flex: 1,
        alignSelf: 'stretch',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: 16,
        paddingHorizontal: 10,
        backgroundColor: isPassLane ? t.goldBg : t.bgCard,
        opacity: reached ? (isClaimed ? 0.55 : 1) : 0.72,
      }}>
        {reward.kind === 'pearls'
          ? (<View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Image source={pearlIcon} style={{ width: 20, height: 20 }} resizeMode="contain" accessible={false} />
              <Text style={{ color: t.textOnCard, fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{reward.amount}</Text>
            </View>)
          : reward.kind === 'aura_stage' || reward.kind === 'season_finale' || reward.kind === 'aura_secret'
            ? (() => {
                // season_finale = финальный вихрь (стадия IV), aura_secret —
                // пурпурный эксклюзив уровня 50; общую корону не показываем.
                const asset = reward.kind === 'aura_secret'
                  ? SEASON_SECRET_AURA_ASSET
                  : SEASON_AURA_STAGE_ASSETS[
                    reward.kind === 'season_finale' ? 3 : Math.max(0, Math.min(3, (reward.amount ?? 1) - 1))
                  ];
                return (
                  <SeasonAuraRing
                    source={asset.source}
                    size={38}
                    pulse={asset.pulse}
                    spin={asset.spin}
                    pulseDurationMs={asset.pulseMs}
                    spinDurationMs={asset.spinMs}
                  />
                );
              })()
            : icon
              ? <Image source={icon} style={{ width: 34, height: 34 }} resizeMode="contain" accessible={false} />
              : null}
        <FlowText
          testID={`season-pass-reward-label-${level}-${side}`}
          provenance="authored"
          style={{ flex: 1, color: t.textOnCard, fontSize: 11.5, fontWeight: '700', lineHeight: 14 }}
        >
          {reward.kind === 'pearls' ? '' : label}
        </FlowText>
        {claimable && (
          <Ionicons name="checkmark-circle-outline" size={18} color={t.textOnCard} />
        )}
        {isPassLane && !passOwned && (
          <Ionicons name="lock-closed" size={14} color={t.textMuted} />
        )}
      </Wrapper>
    );
  }, [claimed, lang, onClaimReward, passOwned, pearlIcon, seasonId, t]);

  const renderItem = useCallback(({ item, index }: ListRenderItemInfo<SeasonTrackNode>) => {
    const reached = progress.level >= item.level;
    const isCurrent = progress.level + 1 === item.level;
    const isLast = index === SEASON_TRACK.length - 1;
    return (
      <View style={{ height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'stretch', gap: 8, paddingHorizontal: 14 }}>
        {renderReward(item.free, 'free', reached, item.level)}
        <View style={{ width: NODE_COLUMN_WIDTH, alignItems: 'center', justifyContent: 'center' }}>
          {/* Хребет: сегмент СВЕРХУ узла (кроме первой строки) и СНИЗУ (кроме
              последней), пройденный участок закрашен акцентом — та же идея,
              что .a-spine i в макете, но реализована по сегментам под FlatList. */}
          {index > 0 && (
            <View style={{
              position: 'absolute', top: 0, left: '50%', marginLeft: -SPINE_WIDTH / 2,
              width: SPINE_WIDTH, height: ROW_HEIGHT / 2, borderRadius: SPINE_WIDTH / 2,
              backgroundColor: progress.level >= item.level - 1 ? t.gold : t.bgSurface,
            }} />
          )}
          {!isLast && (
            <View style={{
              position: 'absolute', bottom: 0, left: '50%', marginLeft: -SPINE_WIDTH / 2,
              width: SPINE_WIDTH, height: ROW_HEIGHT / 2, borderRadius: SPINE_WIDTH / 2,
              backgroundColor: reached ? t.gold : t.bgSurface,
            }} />
          )}
          <View style={{
            width: isCurrent ? 36 : 30,
            height: isCurrent ? 36 : 30,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: reached ? t.gold : isCurrent ? t.accentBg : t.bgSurface,
            zIndex: 2,
          }}>
            <Text style={{
              color: reached ? t.textOnGold : isCurrent ? t.accent : t.textMuted,
              fontSize: isCurrent ? 14 : 12,
              fontWeight: '900',
              fontVariant: ['tabular-nums'],
            }}>
              {item.level}
            </Text>
          </View>
        </View>
        {renderReward(item.pass, 'pass', reached, item.level)}
      </View>
    );
  }, [progress.level, renderReward, t]);

  const getItemLayout = useCallback((_: unknown, index: number) => (
    { length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index }
  ), []);

  const header = useMemo(() => (
    <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <TapScale
          onPress={() => safeRouterBack(router)}
          accessibilityLabel={triLang(lang, {
            ru: 'Назад', uk: 'Назад', es: 'Atrás', 'pt-BR': 'Voltar',
            vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
          })}
          accessibilityRole="button"
          style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="chevron-back" size={24} color={t.textPrimary} />
        </TapScale>
        {/* зачем: владелец — та же кнопка «Подарки», что на статистике (правый
            верхний угол, круглая 44×44, бейдж-счётчик), теперь и на сезоне. */}
        <TouchableOpacity
          testID="season-pass-header-gifts"
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel={triLang(lang, {
            ru: 'Подарки', uk: 'Подарунки', es: 'Regalos', 'pt-BR': 'Presentes',
            vi: 'Quà tặng', id: 'Hadiah', tr: 'Hediyeler', pl: 'Prezenty',
          })}
          onPress={() => { hapticTap(); router.push('/level_gifts_inventory' as any); }}
          style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bgCard }}
        >
          <Ionicons name="gift-outline" size={20} color={pendingGiftCount > 0 ? t.gold : t.textMuted} />
          {pendingGiftCount > 0 && (
            <View style={{ position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: t.gold }}>
              <Text style={{ color: t.textOnGold, fontSize: 9, fontWeight: '900' }}>{pendingGiftCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Text style={{ color: t.textPrimary, fontSize: Math.max(24, f.h1), fontWeight: '900', letterSpacing: -0.3 }}>
          {triLang(lang, {
            ru: 'Сезон 1', uk: 'Сезон 1', es: 'Temporada 1', 'pt-BR': 'Temporada 1',
            vi: 'Mùa 1', id: 'Musim 1', tr: 'Sezon 1', pl: 'Sezon 1',
          })}
        </Text>
        <Text style={{ color: t.textSecond, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
          {triLang(lang, {
            ru: `${daysLeft} дн.`, uk: `${daysLeft} дн.`, es: `${daysLeft} d`, 'pt-BR': `${daysLeft} d`,
            vi: `${daysLeft} ngày`, id: `${daysLeft} hr`, tr: `${daysLeft} g`, pl: `${daysLeft} dni`,
          })}
        </Text>
      </View>
      <View style={{ marginTop: 12, borderRadius: 18, backgroundColor: t.bgCard, padding: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ color: t.textSecond, fontSize: 13, fontWeight: '700' }}>
            {triLang(lang, {
              ru: `Уровень ${progress.level} из ${SEASON_PASS_LEVELS}`,
              uk: `Рівень ${progress.level} із ${SEASON_PASS_LEVELS}`,
              es: `Nivel ${progress.level} de ${SEASON_PASS_LEVELS}`,
              'pt-BR': `Nível ${progress.level} de ${SEASON_PASS_LEVELS}`,
              vi: `Cấp ${progress.level}/${SEASON_PASS_LEVELS}`,
              id: `Level ${progress.level}/${SEASON_PASS_LEVELS}`,
              tr: `Seviye ${progress.level}/${SEASON_PASS_LEVELS}`,
              pl: `Poziom ${progress.level} z ${SEASON_PASS_LEVELS}`,
            })}
          </Text>
          <Text style={{ color: t.textPrimary, fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
            {progress.intoLevelXp}/{progress.levelCostXp} XP
          </Text>
        </View>
        <View style={{ height: 10, borderRadius: 6, overflow: 'hidden', backgroundColor: t.bgSurface }}>
          <View style={{ height: '100%', width: `${pct}%`, borderRadius: 6, backgroundColor: t.gold }} />
        </View>
      </View>
      {/* зачем: честность до старта — выдача наград включается серверным этапом,
          экран не притворяется, что «Забрать» уже работает (гейт владельца). */}
      <View style={{ marginTop: 10, borderRadius: 16, backgroundColor: t.accentBg, paddingHorizontal: 14, paddingVertical: 11 }}>
        <Text style={{ color: t.textOnCard, fontSize: 13, fontWeight: '700', lineHeight: 18 }}>
          {triLang(lang, {
            ru: 'Очки капают за любые занятия. Дошёл до уровня — забирай награду с дорожки.',
            uk: 'Бали крапають за будь-які заняття. Дійшов до рівня — забирай нагороду з доріжки.',
            es: 'Ganas puntos con cada práctica. Al llegar a un nivel, reclama tu recompensa.',
            'pt-BR': 'Você ganha pontos praticando. Ao alcançar um nível, resgate a recompensa.',
            vi: 'Điểm tích lũy từ mọi buổi học. Đạt cấp là nhận thưởng trên lộ trình.',
            id: 'Poin mengalir dari setiap latihan. Capai level, klaim hadiahnya.',
            tr: 'Her çalışmadan puan gelir. Seviyeye ulaşınca ödülünü al.',
            pl: 'Punkty lecą za każdą naukę. Osiągniesz poziom — odbierz nagrodę.',
          })}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6, marginTop: 16, marginBottom: 2 }}>
        <Text /* guard-ok: заголовок КОЛОНКИ дорожки (шапка таблицы над рядами наград), не подпись под названием экрана */ style={{ color: t.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 0.4 }}>
          {triLang(lang, { ru: 'БЕСПЛАТНО', uk: 'БЕЗКОШТОВНО', es: 'GRATIS', 'pt-BR': 'GRÁTIS', vi: 'MIỄN PHÍ', id: 'GRATIS', tr: 'ÜCRETSİZ', pl: 'DARMOWE' })}
        </Text>
        <Text style={{ color: t.gold, fontSize: 12, fontWeight: '800', letterSpacing: 0.4 }}>
          {triLang(lang, { ru: 'ПРОПУСК', uk: 'ПЕРЕПУСТКА', es: 'PASE', 'pt-BR': 'PASSE', vi: 'VÉ MÙA', id: 'PASS', tr: 'BİLET', pl: 'PRZEPUSTKA' })}
        </Text>
      </View>
    </View>
  ), [daysLeft, f.h1, lang, pct, pendingGiftCount, progress.intoLevelXp, progress.level, progress.levelCostXp, router, t]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bgPrimary }}>
      <Stack.Screen options={{ headerShown: false }} />
      <FlatList
        data={SEASON_TRACK as SeasonTrackNode[]}
        keyExtractor={(n) => String(n.level)}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        ListHeaderComponent={header}
        initialNumToRender={10}
        windowSize={7}
        removeClippedSubviews
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      />
      {!passOwned && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: insets.bottom + 14, paddingTop: 10 }}>
          <TouchableOpacity
            testID="season-pass-buy"
            activeOpacity={0.85}
            onPress={onBuyPress}
            accessibilityRole="button"
            accessibilityState={{ busy: buying }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              borderRadius: 18,
              paddingVertical: 16,
              backgroundColor: t.gold,
              opacity: buying ? 0.7 : 1,
            }}
          >
            {buying ? <ActivityIndicator size="small" color={t.textOnGold} /> : null}
            <Text style={{ color: t.textOnGold, fontSize: 16, fontWeight: '900' }}>
              {triLang(lang, {
                ru: 'Открыть пропуск', uk: 'Відкрити перепустку', es: 'Abrir pase', 'pt-BR': 'Abrir passe',
                vi: 'Mở vé mùa', id: 'Buka pass', tr: 'Bileti aç', pl: 'Otwórz przepustkę',
              })}
            </Text>
            <Image source={pearlIcon} style={{ width: 18, height: 18 }} resizeMode="contain" accessible={false} />
            <Text style={{ color: t.textOnGold, fontSize: 16, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
              {SEASON_PASS_PRICE_PEARLS}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Подтверждение покупки: цена + что даёт, кнопки «Позже»/«Купить». */}
      <Modal visible={buyConfirmVisible} transparent animationType="fade" onRequestClose={() => setBuyConfirmVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <View style={{ width: '100%', maxWidth: 360, borderRadius: 26, backgroundColor: t.bgCard, padding: 24, alignItems: 'center', gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Image source={pearlIcon} style={{ width: 40, height: 40 }} resizeMode="contain" accessible={false} />
              <Text style={{ color: t.textPrimary, fontSize: 30, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{SEASON_PASS_PRICE_PEARLS}</Text>
            </View>
            <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '900', textAlign: 'center' }}>
              {triLang(lang, {
                ru: 'Открыть платную дорожку?', uk: 'Відкрити платну доріжку?', es: '¿Abrir la vía de pago?',
                'pt-BR': 'Abrir a trilha paga?', vi: 'Mở nhánh trả phí?', id: 'Buka jalur berbayar?',
                tr: 'Ücretli hattı aç?', pl: 'Otworzyć płatną ścieżkę?',
              })}
            </Text>
            <Text style={{ color: t.textSecond, fontSize: 14, fontWeight: '600', textAlign: 'center', lineHeight: 20 }}>
              {triLang(lang, {
                ru: 'Все золотые награды сезона станут доступны — включая уже пройденные уровни.',
                uk: 'Усі золоті нагороди сезону стануть доступні — включно з уже пройденими рівнями.',
                es: 'Todas las recompensas doradas quedarán disponibles, incluidos los niveles ya superados.',
                'pt-BR': 'Todas as recompensas douradas ficarão disponíveis, incluindo níveis já concluídos.',
                vi: 'Mọi phần thưởng vàng của mùa sẽ mở — kể cả các cấp đã qua.',
                id: 'Semua hadiah emas musim terbuka — termasuk level yang sudah dilewati.',
                tr: 'Sezonun tüm altın ödülleri açılır — geçilen seviyeler dahil.',
                pl: 'Wszystkie złote nagrody sezonu będą dostępne — także zdobyte poziomy.',
              })}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity activeOpacity={0.85} accessibilityRole="button" onPress={() => { hapticTap(); setBuyConfirmVisible(false); }}
                style={{ flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: t.bgSurface }}>
                <Text style={{ color: t.textPrimary, fontSize: 15, fontWeight: '800' }}>
                  {triLang(lang, { ru: 'Позже', uk: 'Пізніше', es: 'Más tarde', 'pt-BR': 'Mais tarde', vi: 'Để sau', id: 'Nanti', tr: 'Daha sonra', pl: 'Później' })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity testID="season-pass-buy-confirm" activeOpacity={0.85} accessibilityRole="button" onPress={onBuyConfirm}
                style={{ flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: t.gold }}>
                <Text style={{ color: t.textOnGold, fontSize: 15, fontWeight: '900' }}>
                  {triLang(lang, { ru: 'Купить', uk: 'Купити', es: 'Comprar', 'pt-BR': 'Comprar', vi: 'Mua', id: 'Beli', tr: 'Satın al', pl: 'Kup' })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <SeasonGiftModal
        visible={openReward != null}
        reward={openReward?.reward ?? null}
        giftId={openReward?.giftId ?? null}
        userName={userName}
        onClose={() => setOpenReward(null)}
      />
    </View>
  );
}
