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
import Svg, { Path } from 'react-native-svg';
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
  seasonPassStarsToUnlockLevel,
  type SeasonPassProgress,
} from './season_pass_model';
import {
  spineTrackPath,
  spineTrackProgressPath,
  spineWaveOffsetForKind,
} from './season_pass_spine';
import {
  SEASON_TRACK,
  getSeasonAuraStageAsset,
  getSeasonRewardIcon,
  getSeasonSecretAuraAsset,
  type SeasonReward,
  type SeasonTrackNode,
} from './season_pass_track_config';
import SeasonAuraRing from '../components/SeasonAuraRing';
import SeasonGiftModal from '../components/SeasonGiftModal';
import SeasonRewardInfoModal, { type SeasonRewardCardStatus } from '../components/SeasonRewardInfoModal';
import { addSeasonPassGift, loadPendingSeasonPassGiftCount } from './season_pass_gift_inventory';
import { seasonBuyPassOnServer, seasonClaimRewardOnServer } from './season_pass_server';
import { getShardsBalance, loadShardsFromCloud } from './shards_system';
import { getVerifiedPremiumAccessStatus } from './premium_guard';

const ROW_HEIGHT = 108;
// зачем 2026-08-03 (владелец: «контейнеры с подарками слишком близко друг к
// другу, раздели их слегка чтобы не сливались»): вертикальный воздух между
// карточками. Живёт ВНУТРИ ROW_HEIGHT (padding строки), а не добавляется к
// нему: шаг узлов хребта считается из ROW_HEIGHT, и любое изменение высоты
// строки увело бы линию от карточек.
const ROW_GAP = 14;
export const SEASON_REWARD_ART_SIZE = 58;
/**
 * Реальный размер картинки внутри слота награды — с полями по краям.
 *
 * зачем 2026-08-03 (владелец: «все лого обязательно должны быть не обрезаны, а
 * фулл размер и стоять ровно и красиво»): арт нарисован ВПРИТЫК к краям файла
 * (проверено на battery.webp и club_totem.webp — предмет начинается от верхней
 * границы 256×256 и кончается у нижней). resizeMode «contain» тут бессилен:
 * резать нечего, полей просто нет в исходнике. Слот остаётся прежним, чтобы не
 * поехала геометрия строки, а картинка внутри ужимается на ~14% и центрируется —
 * появляется воздух по краям, и соседние иконки визуально встают на одну линию.
 *
 * Когда арт перерисуют с собственными полями, это значение можно вернуть к
 * SEASON_REWARD_ART_SIZE.
 */
export const SEASON_REWARD_ART_INNER = Math.round(SEASON_REWARD_ART_SIZE * 0.86);
export const SEASON_AURA_ART_SIZE = 64;
// зачем 2026-08-03 (владелец: «иконка жемчужа слишком маленькая»): монета
// жемчужин стоит В СТРОКЕ с числом, а не одна на всю плитку, поэтому её размер
// чуть меньше сплошного арта — так пара «иконка + количество» целиком влезает
// в ширину карточки и не жмёт число.
export const SEASON_PEARL_ART_SIZE = 44;
const NODE_COLUMN_WIDTH = 56;
const SPINE_WIDTH = 4;
// зачем 2026-08-03 (владелец — «искривление на разных типах подарков» вместо
// прямой линии; ПОВТОРНО, со скриншотом реальных разрывов на КАЖДОМ подарке):
// первая версия рисовала SVG-путь НА СТРОКУ — 60 независимых <Svg>-полотен по
// одному на renderItem FlatList. Даже с идеально гладкой кривой ВНУТРИ каждого
// полотна между соседними канвасами нет физической связи (антиалиасинг края
// каждого SVG, округление субпикселей соседних View) — линия читалась рваной
// не из-за формулы, а из-за того, что кривых было 60. Хребет теперь рисуется
// ОДНИМ SVG-полотном на всю прокручиваемую высоту дорожки (trackSpine ниже,
// второй элемент ListHeaderComponent) — физически одна кривая, а не 60 склеек.
// Геометрия живёт в season_pass_spine.ts — чистом модуле без импортов
// React Native, чтобы её можно было проверить тестом (экран тянет
// react-native-svg и в jest не поднимается).
// зачем: владелец, 2026-08-03 — финальное решение: 250 жемчужин ДЛЯ ВСЕХ (не
// 350). Разница между фри и премиум не в цене, а в том, что премиум получает
// платную линию БЕСПЛАТНО льготой подписки — покупка ему просто не показывается.
const SEASON_PASS_PRICE_PEARLS = 250;

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
  frame:             { ru: 'Визитка', uk: 'Візитка', es: 'Tarjeta de perfil', 'pt-BR': 'Cartão de perfil', vi: 'Thẻ hồ sơ', id: 'Kartu profil', tr: 'Profil kartı', pl: 'Wizytówka' },
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
  // зачем 2026-08-03 (владелец: «модальные окна для каждого подарка на сезоне
  // чтобы можно было открыть и посмотреть что это такое»): openReward выше —
  // модалка КЛЕЙМА (реально выдаёт награду, применяет эффект). openInfoReward —
  // отдельная просмотровая модалка: тап по ЛЮБОЙ карточке (любого статуса)
  // открывает описание; «Забрать»/«Нужен пропуск» — кнопки УЖЕ ВНУТРИ неё.
  const [openInfoReward, setOpenInfoReward] = useState<{
    reward: SeasonReward; level: number; side: 'free' | 'pass'; status: SeasonRewardCardStatus;
  } | null>(null);
  const [claimed, setClaimed] = useState<ClaimedMap>({});
  const [passOwned, setPassOwned] = useState(false);
  // зачем: владелец, 2026-08-03 — «пропуск 250 для всех, но премиум хапает
  // обе стороны, фри только фри». Pro/Plus получает pass-линию БЕСПЛАТНО как
  // льготу подписки (не покупает отдельно), фри-юзер для той же линии обязан
  // купить пропуск — laneUnlocked ниже читает ЭТОТ флаг, не passOwned одному.
  const [isPremium, setIsPremium] = useState(false);
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
    getVerifiedPremiumAccessStatus().then((active) => { if (alive) setIsPremium(active); }).catch(() => {});
    const subStars = onAppEvent('season_pass_stars_changed', () => {
      if (alive) setProgress(peekSeasonPassProgress());
    });
    const subGifts = onAppEvent('season_pass_gift_inventory_changed', () => {
      if (alive) refreshPendingGiftCount();
    });
    const subPremium = onAppEvent('premium_access_changed', ({ active }) => {
      if (alive) setIsPremium(active);
    });
    return () => { alive = false; subStars.remove(); subGifts.remove(); subPremium.remove(); };
  }, [refreshPendingGiftCount]);

  // зачем 2026-08-03: daysLeft и pct удалены вместе со счётчиком дней и
  // прогресс-полоской (владелец: «убери полоску уровня», «убери 59 дней»).
  // Держать вычисления без потребителя — тихий мусор в каждом рендере.
  const pearlIcon = pearlIconForTheme(themeMode);
  // Pro/Plus владеет обеими линиями наград БЕЗ покупки (владелец: «премиум
  // хапает обе стороны, фри только фри») — покупка за 250 актуальна лишь фри.
  const laneUnlockedForPass = isPremium || passOwned;

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

  /**
   * Тап по закрытому подарку.
   *
   * зачем 2026-08-03 (владелец: «при нажатии на любой подарок написано, что
   * нужен пропуск чтобы получить подарок»): молчаливая плитка читалась как
   * поломка. Объясняем причину и сразу открываем окно покупки — путь от
   * «хочу этот подарок» до покупки в один тап, без поиска кнопки внизу.
   */
  const onLockedRewardPress = useCallback(() => {
    hapticTap();
    emitAppEvent('action_toast', actionToastTri('info', {
      ru: 'Нужен пропуск сезона, чтобы забирать подарки',
      uk: 'Потрібна перепустка сезону, щоб забирати подарунки',
      es: 'Necesitas el pase de temporada para reclamar regalos',
      'pt-BR': 'Você precisa do passe da temporada para resgatar presentes',
      vi: 'Cần vé mùa để nhận quà',
      id: 'Butuh season pass untuk mengambil hadiah',
      tr: 'Hediyeleri almak için sezon bileti gerekli',
      pl: 'Aby odbierać prezenty, potrzebna jest przepustka sezonu',
    }));
    if (buying) return;
    setBuyConfirmVisible(true);
  }, [buying]);

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
      level, side, kind: reward.kind, amount: reward.amount, totalStars: progress.totalStars,
    }).then((res) => {
      if (res?.ok && reward.kind === 'pearls') void loadShardsFromCloud().catch(() => {});
    });
  }, [claimed, persistClaims, progress.totalStars, refreshPendingGiftCount, seasonId]);

  const renderReward = useCallback((reward: SeasonReward | undefined, side: 'free' | 'pass', reached: boolean, level: number) => {
    // Пустая сторона — прозрачный заполнитель ТОЙ ЖЕ формы, что и карточка,
    // чтобы высота строки была одинаковой независимо от того, где лежит награда
    // (макет: узкая колонка с одной картой, вторая половина строки пуста).
    if (!reward) return <View style={{ flex: 1, alignSelf: 'stretch' }} />;
    const icon = getSeasonRewardIcon(reward.kind, themeMode);
    const label = REWARD_LABELS[reward.kind][lang]
      + (reward.kind === 'aura_stage' ? ` ${['I', 'II', 'III', 'IV'][Math.max(0, (reward.amount ?? 1) - 1)]}` : '')
      + (reward.kind === 'plus_days' || reward.kind === 'xp_bank' ? ` ${reward.amount ?? ''}` : '');
    const isPassLane = side === 'pass';
    const isClaimed = !!claimed[`${seasonId}:${level}:${side}`];
    // Порог открытия подарка в звёздах — накопительный счёт за сезон, тот же,
    // что показан в шапке. Считается чистой функцией шкалы, а не «на глаз»:
    // расхождение с реальной ценой уровня было бы ложью в интерфейсе.
    const starsToUnlock = seasonPassStarsToUnlockLevel(level);
    /**
     * зачем 2026-08-03 (владелец: «пропуск я же говорил надо купить, он не даётся
     * просто так, ты не можешь получать подарки просто так… юзер видит свой
     * потенциальный уже тир и прогресс, но без пропуска ничего не может
     * получить»): здесь стояло `!isPassLane || laneUnlockedForPass` — БЕСПЛАТНАЯ
     * линия выдавалась любому без покупки, замок висел только на платной.
     * Теперь пропуск — вход в обе линии: без него дорожка видна целиком
     * (прогресс, уровни, что именно ждёт впереди), но забрать нельзя ничего.
     */
    const laneUnlocked = laneUnlockedForPass;
    const claimable = laneUnlocked && reached && !isClaimed;
    /**
     * зачем 2026-08-03 (владелец: «при нажатии на любой подарок написано, что
     * нужен пропуск чтобы получить подарок»): закрытая плитка была немым View —
     * тап по ней просто не давал НИЧЕГО, и игрок не понимал, сломано это или
     * заблокировано. Теперь она нажимается и честно объясняет, что нужен
     * пропуск, а достижимость уровня подсказывает, стоит ли покупать сейчас.
     */
    const locked = !laneUnlocked && reached && !isClaimed;
    const Wrapper = claimable || locked ? TouchableOpacity : View;
    const wrapperProps = claimable
      ? { activeOpacity: 0.85, onPress: () => onClaimReward(reward, level, side), accessibilityRole: 'button' as const, testID: `season-pass-claim-${side}-${level}` }
      : locked
        ? {
          activeOpacity: 0.85,
          onPress: onLockedRewardPress,
          accessibilityRole: 'button' as const,
          accessibilityLabel: 'Нужен пропуск сезона, чтобы забрать подарок',
          testID: `season-pass-locked-${side}-${level}`,
        }
        : {};
    return (
      <Wrapper {...wrapperProps} style={{
        flex: 1,
        alignSelf: 'stretch',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        // зачем 2026-08-03: строка порога звёзд добавила карточке третий ярус
        // (арт → название → цена), а высота плитки уменьшилась на ROW_GAP.
        // Вертикальные отступы ужаты, чтобы содержимое влезало без обрезки —
        // ужимать ШРИФТ (adjustsFontSizeToFit) на коротких подписях нельзя.
        gap: 1,
        borderRadius: 16,
        paddingHorizontal: 8,
        paddingVertical: 4,
        position: 'relative',
        backgroundColor: isPassLane ? t.goldBg : t.bgCard,
        opacity: reached ? (isClaimed ? 0.55 : 1) : 0.72,
      }}>
        {/* зачем 2026-08-03 (владелец: «иконка жемчужа слишком маленькая»):
            иконка была 20×20 при артах соседних подарков 58–64 — жемчужины
            читались как мелочь на фоне остальных наград. Теперь монета того же
            масштаба, что и прочие арты (SEASON_PEARL_ART_SIZE), число рядом
            подросло до 18. Высота плитки не меняется: у жемчужин пустая
            подпись, её место и забирает выросшая иконка. */}
        {reward.kind === 'pearls'
          ? (<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Image source={pearlIcon} style={{ width: SEASON_PEARL_ART_SIZE, height: SEASON_PEARL_ART_SIZE }} resizeMode="contain" accessible={false} />
              <Text style={{ color: t.textOnCard, fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{reward.amount}</Text>
            </View>)
          : reward.kind === 'aura_stage' || reward.kind === 'season_finale' || reward.kind === 'aura_secret'
            ? (() => {
                // season_finale = финальный вихрь (стадия IV), aura_secret —
                // пурпурный эксклюзив уровня 50; общую корону не показываем.
                const asset = reward.kind === 'aura_secret'
                  ? getSeasonSecretAuraAsset(themeMode)
                  : getSeasonAuraStageAsset(
                    reward.kind === 'season_finale' ? 4 : (reward.amount ?? 1),
                    themeMode,
                  );
                return (
                  <SeasonAuraRing
                    asset={asset}
                    size={SEASON_AURA_ART_SIZE}
                  />
                );
              })()
            : icon
              /* зачем 2026-08-03 (владелец: «все лого обязательно должны быть не
                 обрезаны, а фулл размер и стоять ровно и красиво»): resizeMode
                 «contain» ничего не резал — предмет упирается в края САМОГО
                 файла (проверено: батарея и тотем нарисованы без полей сверху и
                 снизу в квадрате 256×256). Из-за этого арт выглядел обрезанным
                 и соседние иконки стояли на разной высоте. Слот сохраняет
                 прежний размер (геометрия строки не едет), а картинка внутри
                 него уменьшена и отцентрована — предмет больше не касается
                 краёв, и все логотипы встают ровно. */
              ? (
                <View style={{
                  width: SEASON_REWARD_ART_SIZE,
                  height: SEASON_REWARD_ART_SIZE,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Image
                    source={icon}
                    style={{ width: SEASON_REWARD_ART_INNER, height: SEASON_REWARD_ART_INNER }}
                    resizeMode="contain"
                    accessible={false}
                  />
                </View>
              )
              : null}
        <FlowText
          testID={`season-pass-reward-label-${level}-${side}`}
          provenance="authored"
          style={{ color: t.textOnCard, fontSize: 11.2, fontWeight: '800', lineHeight: 13.5, textAlign: 'center' }}
        >
          {reward.kind === 'pearls' ? '' : label}
        </FlowText>
        {/* зачем 2026-08-03 (владелец: «просто возле каждого подарка показывай
            сколько звёзд надо набрать чтобы он открылся»): порог заменил
            прогресс-полоску уровня. Число накопительное — сравнивается напрямую
            с общим счётом звёзд в шапке. У уже открытого подарка порог гаснет
            до галочки: цена выполнена, повторять её незачем. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 }}>
          {reached ? (
            <Ionicons name="checkmark" size={12} color={t.textMuted} />
          ) : (
            <Text
              testID={`season-pass-reward-threshold-${level}-${side}`}
              style={{ color: t.textMuted, fontSize: 11, fontWeight: '800', fontVariant: ['tabular-nums'] }} /* guard-ok: ЦЕНА подарка в звёздах (число + ⭐), а не подпись-расшифровка названия — владелец запросил её явно */
            >
              {starsToUnlock} ⭐
            </Text>
          )}
        </View>
        {claimable && (
          <Ionicons name="checkmark-circle-outline" size={18} color={t.textOnCard} style={{ position: 'absolute', top: 7, right: 7 }} />
        )}
        {/* Замок теперь на ОБЕИХ линиях: без пропуска не выдаётся ничего. */}
        {!laneUnlockedForPass && (
          <Ionicons name="lock-closed" size={14} color={t.textMuted} style={{ position: 'absolute', top: 8, right: 8 }} />
        )}
      </Wrapper>
    );
  }, [claimed, laneUnlockedForPass, lang, onClaimReward, onLockedRewardPress, pearlIcon, seasonId, t, themeMode]);

  const renderItem = useCallback(({ item }: ListRenderItemInfo<SeasonTrackNode>) => {
    const reached = progress.level >= item.level;
    return (
      // зачем 2026-08-03 (владелец: «контейнеры с подарками слишком близко друг
      // к другу, раздели их слегка чтобы не сливались»): карточки стояли
      // вплотную по вертикали и читались одним сплошным полотном. Высота строки
      // (ROW_HEIGHT) осталась прежней — её держит геометрия хребта, — а воздух
      // добавлен paddingVertical внутри строки: карточка стала ниже, зазор
      // между соседними появился, узлы линии никуда не поехали.
      <View style={{ height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'stretch', gap: 10, paddingHorizontal: 14, paddingVertical: ROW_GAP / 2 }}>
        {renderReward(item.free, 'free', reached, item.level)}
        {/* зачем 2026-08-03 (владелец: «убери кружочки с цифрами»): маркеры
            уровней убраны целиком. Прогресс читается по самой линии — золотая
            часть до достигнутого уровня, тусклая дальше, — а «какой это
            уровень» теперь говорит порог звёзд на самой карточке подарка. */}
        <View style={{ width: NODE_COLUMN_WIDTH }} pointerEvents="none" />
        {renderReward(item.pass, 'pass', reached, item.level)}
      </View>
    );
  }, [progress.level, renderReward]);

  const getItemLayout = useCallback((_: unknown, index: number) => (
    { length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index }
  ), []);

  // Смещения узлов ВСЕЙ дорожки — по kind, не зависит от прогресса игрока,
  // считается один раз за жизнь экрана (SEASON_TRACK — статичная константа).
  const spineOffsets = useMemo(
    () => (SEASON_TRACK as SeasonTrackNode[]).map((n) => spineWaveOffsetForKind(n.pass?.kind ?? n.free?.kind)),
    [],
  );
  const spineCx = NODE_COLUMN_WIDTH / 2;
  const spineTrackHeight = ROW_HEIGHT * spineOffsets.length;
  const spineGrayPath = useMemo(
    () => spineTrackPath(spineCx, ROW_HEIGHT, spineOffsets),
    [spineCx, spineOffsets],
  );
  const spineGoldPath = useMemo(
    () => spineTrackProgressPath(spineCx, ROW_HEIGHT, spineOffsets, progress.level),
    [spineCx, spineOffsets, progress.level],
  );
  // Единое SVG-полотно хребта — ОДНА линия на всю прокручиваемую высоту
  // дорожки, а не по одной на строку (см. комментарий у SPINE_WIDTH выше:
  // построчные полотна физически не могут дать сплошную линию). Вставлено
  // ВТОРЫМ элементом ListHeaderComponent через Fragment: нулевой высоты в
  // потоке (height:0, overflow:visible), поэтому его Y=0 совпадает ровно с
  // Y=0 первого узла данных, независимо от содержимого/высоты `header` above.
  //
  // X-позиция колонки узла НЕ константа в пикселях — ширина боковых карточек
  // (flex:1) зависит от фактической ширины экрана, которую нельзя вычислить
  // заранее в JS. Вместо абсолютного `left` в пикселях контейнер повторяет
  // ТУ ЖЕ flex-структуру строки (paddingHorizontal 14, row, gap 8, flex:1 по
  // бокам, NODE_COLUMN_WIDTH по центру) — flexbox гарантированно вычисляет
  // одинаковую ширину для одинаковой структуры, поэтому колонка здесь
  // совпадает по X с колонкой узла в каждой реальной строке БЕЗ измерения.
  const trackSpine = useMemo(() => (
    <View style={{ height: 0, overflow: 'visible' }} pointerEvents="none">
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 14 }}>
        <View style={{ flex: 1 }} />
        <Svg
          width={NODE_COLUMN_WIDTH}
          height={spineTrackHeight}
          viewBox={`0 0 ${NODE_COLUMN_WIDTH} ${spineTrackHeight}`}
        >
          <Path d={spineGrayPath} stroke={t.bgSurface} strokeWidth={SPINE_WIDTH} strokeLinecap="round" fill="none" />
          {spineGoldPath ? (
            <Path d={spineGoldPath} stroke={t.gold} strokeWidth={SPINE_WIDTH} strokeLinecap="round" fill="none" />
          ) : null}
        </Svg>
        <View style={{ flex: 1 }} />
      </View>
    </View>
  ), [spineGoldPath, spineGrayPath, spineTrackHeight, t.bgSurface, t.gold]);

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
      {/* зачем 2026-08-03 (владелец: «убери 59 дней там написано вверху»):
          счётчик оставшихся дней давил срочностью на каждом заходе, а решения
          игрока не менял — сезон и так виден по дорожке. Заголовок теперь
          занимает строку целиком и читается как титул экрана. */}
      <Text style={{ color: t.textPrimary, fontSize: Math.max(24, f.h1), fontWeight: '900', letterSpacing: -0.3 }}>
        {triLang(lang, {
          ru: 'Сезон 1', uk: 'Сезон 1', es: 'Temporada 1', 'pt-BR': 'Temporada 1',
          vi: 'Mùa 1', id: 'Musim 1', tr: 'Sezon 1', pl: 'Sezon 1',
        })}
      </Text>
      {/* зачем 2026-08-03 (владелец: «убери полоску уровня, просто возле каждого
          подарка показывай сколько звёзд надо набрать»): полоска показывала
          прогресс ТОЛЬКО текущего уровня и дублировала то, что теперь честнее
          читается по золотой части хребта. Осталась строка-факт: где я и сколько
          всего звёзд набрал — именно это число сравнивается с порогом у каждого
          подарка ниже. */}
      <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: t.textSecond, fontSize: 14, fontWeight: '800' }}>
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
        <Text style={{ color: t.textPrimary, fontSize: 15, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
          {progress.totalStars} ⭐
        </Text>
      </View>
      {/* зачем 2026-08-03 (владелец: «смени текст "бесплатно и пропуск" на
          "пропуск и плюс пропуск"»): «БЕСПЛАТНО» врало — с гейтом покупки эта
          линия бесплатной больше не является, её тоже открывает пропуск.
          Названия теперь описывают два тира одной покупки. */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6, marginTop: 18, marginBottom: 4 }}>
        <Text /* guard-ok: заголовок КОЛОНКИ дорожки (шапка таблицы над рядами наград), не подпись под названием экрана */ style={{ color: t.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 0.4 }}>
          {triLang(lang, { ru: 'ПРОПУСК', uk: 'ПЕРЕПУСТКА', es: 'PASE', 'pt-BR': 'PASSE', vi: 'VÉ MÙA', id: 'PASS', tr: 'BİLET', pl: 'PRZEPUSTKA' })}
        </Text>
        <Text style={{ color: t.gold, fontSize: 12, fontWeight: '800', letterSpacing: 0.4 }}>
          {triLang(lang, { ru: 'ПЛЮС ПРОПУСК', uk: 'ПЛЮС ПЕРЕПУСТКА', es: 'PASE PLUS', 'pt-BR': 'PASSE PLUS', vi: 'VÉ MÙA PLUS', id: 'PASS PLUS', tr: 'PLUS BİLET', pl: 'PLUS PRZEPUSTKA' })}
        </Text>
      </View>
    </View>
  ), [f.h1, lang, pendingGiftCount, progress.level, progress.totalStars, router, t]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bgPrimary }}>
      <Stack.Screen options={{ headerShown: false }} />
      <FlatList
        data={SEASON_TRACK as SeasonTrackNode[]}
        keyExtractor={(n) => String(n.level)}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        ListHeaderComponent={
          <>
            {header}
            {trackSpine}
          </>
        }
        initialNumToRender={10}
        windowSize={7}
        // зачем 2026-08-03: trackSpine — элемент height:0 в потоке с реальным
        // визуальным контентом высотой на ВСЮ дорожку (overflow за пределы
        // заявленной высоты). removeClippedSubviews на Android умеет отклипать
        // (unmount) содержимое ListHeaderComponent, выходящее за его заявленные
        // границы, при скролле — это дало бы «линия обрывается» СНОВА, но уже
        // по причине рантайм-оптимизации, не архитектуры. 60 строк — не тот
        // объём, где эта оптимизация ощутимо нужна; отключено ради надёжности.
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      />
      {/* Кнопка покупки скрыта у Premium — платная линия уже открыта льготой
          подписки, показывать «купить» за то, что и так бесплатно, — плохой UX. */}
      {!laneUnlockedForPass && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: insets.bottom + 14, paddingTop: 10 }}>
          <TouchableOpacity /* guard-ok: видимый текст «Открыть пропуск 250» внутри — реальный лейбл, не декоративная кнопка */
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
