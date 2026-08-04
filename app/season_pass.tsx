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
import { softShadow } from '../constants/androidGlow';
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
  SEASON_AURA_STAGE_NAMES,
  getSeasonAuraStageAsset,
  getSeasonRewardIcon,
  getSeasonSecretAuraAsset,
  seasonAuraStageIndex,
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
// зачем 2026-08-04 (владелец: «иконки увеличить в 2 раза», уточнено — 116px не
// влезает в ROW_HEIGHT=108, зафиксированную геометрией волнистой линии
// прогресса; согласован умеренный рост ~1.3×, который держит текущую высоту
// строки): было 58, физический потолок слота внутри строки — не более ~76.
export const SEASON_REWARD_ART_SIZE = 76;
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
// зачем 2026-08-04: растёт вместе с SEASON_REWARD_ART_SIZE в том же масштабе
// (~1.3×), чтобы аура и обычные арты остались одного визуального веса.
export const SEASON_AURA_ART_SIZE = 84;
// зачем 2026-08-03 (владелец: «иконка жемчужа слишком маленькая»): монета
// жемчужин стоит В СТРОКЕ с числом, а не одна на всю плитку, поэтому её размер
// чуть меньше сплошного арта — так пара «иконка + количество» целиком влезает
// в ширину карточки и не жмёт число.
export const SEASON_PEARL_ART_SIZE = 58;
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
// 350). Пропуск покупают ОБА тира, подписка вход не заменяет.
//
// зачем (уточнение того же дня): здесь стояло «премиум получает платную линию
// бесплатно — покупка ему просто не показывается». Это описание УСТАРЕЛО и
// противоречило коду: ровно тот баг («плашка 250 у меня пропала») починен ниже,
// кнопка скрывается только у уже купивших. Подписка расширяет ШИРИНУ выдачи
// (Plus забирает обе линии), но не отменяет саму покупку.
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

// SEASON_AURA_STAGE_NAMES живёт в season_pass_track_config.ts — общий источник
// для экрана дорожки И обеих модалок (клейм + просмотр), см. импорт выше.

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
  /**
   * зачем 2026-08-03 (владелец, дословно: «250 СТОИТ ВХОД ДЛЯ ВСЕХ И ДЛЯ ФРИ И
   * ДЛЯ ПРЕМИУМ! просто фри таер будет получать только подарки слева, а плюс
   * таер будет получать и слева и справа»): здесь стояло
   * `isPremium || passOwned` — премиум получал дорожку БЕСПЛАТНО, и кнопка
   * покупки у него пропадала совсем (ровно тот симптом «плашка 250 исчезла»).
   *
   * Правильная модель в двух независимых осях:
   *  • ВХОД в дорожку — только покупка пропуска, цена 250 одна для всех.
   *    Подписка вход не заменяет, поэтому здесь больше нет isPremium.
   *  • ШИРИНА выдачи — тир: фри забирает левую линию, Plus обе (passLaneAllowed).
   */
  const passBought = passOwned;
  // Правая (платная) линия — привилегия тира, но работает только после входа.
  const passLaneAllowed = isPremium;

  const persistClaims = useCallback((next: ClaimedMap) => {
    AsyncStorage.setItem(CLAIMED_LEVELS_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  // ── Покупка пропуска сезона (SEASON_PASS_PRICE_PEARLS, одна цена для всех) ──
  // зачем 2026-08-03: в заголовке стояло «платной дорожки (350 жемчужин)» —
  // оба факта устарели. Цена 250 и одинакова для фри и Plus, а «платной
  // дорожки» в интерфейсе нет: колонки называются ПРОПУСК и ПЛЮС ПРОПУСК.
  // Цену не дублируем числом — читаем из константы, чтобы снова не разошлось.
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
  /*
   * зачем 2026-08-03 (владелец: «фри таер получает только слева, плюс и слева и
   * справа»): причин закрытия теперь ДВЕ, и лечатся они по-разному. Игроку без
   * пропуска нужна покупка. А купивший фри упирается в правую линию — ему
   * предлагать покупку нельзя: пропуск у него уже есть, второй раз не продать,
   * и окно «Купить за 250» читалось бы как поломка. Ему нужен Plus.
   */
  const onLockedRewardPress = useCallback((isPassLane: boolean) => {
    hapticTap();
    if (passBought && isPassLane && !passLaneAllowed) {
      emitAppEvent('action_toast', actionToastTri('info', {
        ru: 'Правая линия подарков — для Plus',
        uk: 'Права лінія подарунків — для Plus',
        es: 'La vía derecha de regalos es para Plus',
        'pt-BR': 'A trilha direita de presentes é para o Plus',
        vi: 'Nhánh quà bên phải dành cho Plus',
        id: 'Jalur hadiah kanan untuk Plus',
        tr: 'Sağdaki hediye hattı Plus için',
        pl: 'Prawa ścieżka prezentów jest dla Plus',
      }));
      // Тот же вход в витрину подписки, что у остальных экранов: контекст
      // говорит воронке, ОТКУДА пришёл игрок и что ему обещать.
      router.push({ pathname: '/premium_modal', params: { context: 'season_pass_lane', source: 'season_pass_lane' } } as never);
      return;
    }
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
  }, [buying, passBought, passLaneAllowed, router]);

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
    // зачем 2026-08-04 (владелец: «аура глубина у нее названия и стадия ее
    // надо название добавить»): было «Аура · стадія II» — номер без имени,
    // непонятно, что это за свечение. Собственное имя стадии (SEASON_AURA_STAGE_NAMES)
    // встаёт ПЕРЕД римской цифрой, а не вместо неё — цифра всё ещё нужна, чтобы
    // соотнести карточку с прогресс-хребтом («стадия II» видна и там, и тут).
    const auraStageIndex = seasonAuraStageIndex(reward.amount);
    const label = (reward.kind === 'aura_stage'
      ? SEASON_AURA_STAGE_NAMES[lang][auraStageIndex]
      : REWARD_LABELS[reward.kind][lang])
      + (reward.kind === 'aura_stage' ? ` ${['I', 'II', 'III', 'IV'][auraStageIndex]}` : '')
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
     *
     * зачем 2026-08-03 (владелец: «фри таер будет получать только подарки
     * слева, а плюс таер и слева и справа»): вход и ширина выдачи — РАЗНЫЕ
     * условия. Пропуск открывает дорожку всем одинаково, но правая линия
     * остаётся за Plus: без подписки она видна и заперта даже после покупки.
     */
    const laneUnlocked = passBought && (!isPassLane || passLaneAllowed);
    const claimable = laneUnlocked && reached && !isClaimed;
    /**
     * зачем 2026-08-03 (владелец: «при нажатии на любой подарок написано, что
     * нужен пропуск чтобы получить подарок»): закрытая плитка была немым View —
     * тап по ней просто не давал НИЧЕГО, и игрок не понимал, сломано это или
     * заблокировано. Теперь она нажимается и честно объясняет, что нужен
     * пропуск, а достижимость уровня подсказывает, стоит ли покупать сейчас.
     */
    const locked = !laneUnlocked && reached && !isClaimed;
    /**
     * зачем 2026-08-03 (владелец: «модалы для КАЖДОГО подарка, и открыть модал
     * можно даже когда оно ещё недоступно, с прикольными текстами»): раньше
     * тап вёл себя тремя разными способами — сразу забирал (claimable), кидал
     * тост (locked) или молчал вообще (claimed / ещё не достигнутый уровень).
     * Немой тап читался как поломка: игрок не мог посмотреть, что его ждёт
     * впереди. Теперь вход ЕДИНЫЙ — любая карточка в любом статусе открывает
     * описание, а действие («Забрать» / «Нужен пропуск») живёт кнопкой ВНУТРИ
     * модалки, а не побочным эффектом тапа. Клейм остаётся под теми же
     * условиями: смотреть можно всё, забрать — только заслуженное.
     */
    const status: SeasonRewardCardStatus = claimable
      ? 'claimable'
      : isClaimed ? 'claimed' : locked ? 'locked' : 'upcoming';
    const wrapperProps = {
      activeOpacity: 0.85,
      // Открытие описания — чистый setState, без сети и записи: мгновенный
      // отклик на тап независимо от статуса карточки.
      onPress: () => { hapticTap(); setOpenInfoReward({ reward, level, side, status }); },
      accessibilityRole: 'button' as const,
      // Метка нужна КАЖДОЙ карточке: у жемчужин подпись пустая (её место
      // занимает выросшая иконка), и без label скринридер объявил бы кнопку
      // безымянной. Название награды + статус — то, что игрок хочет услышать.
      accessibilityLabel: `${reward.kind === 'pearls' ? `${reward.amount} ${REWARD_LABELS.pearls[lang]}` : label}. ${
        claimable ? 'Можно забрать'
          : isClaimed ? 'Уже забрано'
            : locked
              ? (passBought && isPassLane && !passLaneAllowed
                ? 'Правая линия подарков доступна с Plus'
                : 'Нужен пропуск сезона, чтобы забрать подарок')
              : `Откроется при ${starsToUnlock} звёздах`
      }`,
      testID: claimable
        ? `season-pass-claim-${side}-${level}`
        : locked ? `season-pass-locked-${side}-${level}` : `season-pass-info-${side}-${level}`,
    };
    // зачем 2026-08-04 (владелец: «звёздочки должны быть под контейнером, а не
    // в контейнере»): порог цены раньше был третьим ярусом ВНУТРИ плитки — тот
    // же фон, что у названия и арта. Теперь плитка (TouchableOpacity, только
    // фон+арт+название) и цена (Text) — два раздельных слоя одной колонки:
    // цена больше не толкает геометрию карточки и читается как подпись К ней,
    // а не часть заполненной поверхности.
    return (
      <View style={{ flex: 1, alignSelf: 'stretch', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <TouchableOpacity {...wrapperProps} style={{
        width: '100%',
        flexGrow: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        borderRadius: 16,
        paddingHorizontal: 8,
        paddingVertical: 4,
        position: 'relative',
        backgroundColor: isPassLane ? t.goldBg : t.bgSurface,
        // зачем 2026-08-04 (владелец: «строго цвета контейнеров изменить чтобы
        // лучше выделялись на фоне белом»): на светлых темах (sagePorcelain
        // bgCard #FCFDF9 против bgPrimary #F0F1EC, businessLight — оба #FFFFFF)
        // карточка и фон экрана визуально сливались в одно пятно. bgSurface
        // темнее bgCard в каждой теме — уже даёт тон без обводки (запрет
        // владельца на borderWidth/borderColor), а мягкая тень поверх достаёт
        // контраст и на плоских белых темах, где даже bgSurface почти не
        // отличается от фона. softShadow держит Android без квадратов вокруг
        // скругления (см. constants/androidGlow.ts).
        ...softShadow({ color: t.cardShadow, radius: 8, opacity: 0.18, offsetY: 3, backgroundColor: isPassLane ? t.goldBg : t.bgSurface, elevation: 3 }),
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
        {/* зачем 2026-08-04 (владелец, со скриншотами: «А ПОЧЕМУ НЕТ НАЗВАНИЙ»):
            у части карточек подпись пропадала совсем. Причина — не пустой
            текст, а обрезка: длинные названия («Магнит коллекции», «Кастомний
            аватар», «Тотем клубу») не влезают в одну строку 11.2pt, переносятся
            на вторую и выдавливаются третьим ярусом карточки (порог звёзд).
            minHeight в ДВЕ строки (13.5 × 2) резервирует место заранее: место
            под вторую строку есть всегда, поэтому она не выталкивается и
            подпись видна целиком. Побочно это даёт стабильную геометрию —
            высота одинакова у коротких и длинных названий, плитки не пляшут
            по вертикали. Обрезать текст здесь запрещено намеренно: FlowText
            не пропускает numberOfLines (см. UnsafeNativeTextProp), лечим
            только вёрсткой, без ужимания шрифта. */}
        <FlowText
          testID={`season-pass-reward-label-${level}-${side}`}
          provenance="authored"
          style={{
            color: t.textOnCard,
            fontSize: 11.2,
            fontWeight: '800',
            lineHeight: 13.5,
            textAlign: 'center',
            minHeight: reward.kind === 'pearls' ? 0 : 27,
          }}
        >
          {reward.kind === 'pearls' ? '' : label}
        </FlowText>
        {claimable && (
          <Ionicons name="checkmark-circle-outline" size={18} color={t.textOnCard} style={{ position: 'absolute', top: 7, right: 7 }} />
        )}
        {/* Замок висит на КАЖДОЙ линии, которая этому игроку недоступна: без
            пропуска — на обеих, у фри с пропуском — только на правой. */}
        {!laneUnlocked && (
          <Ionicons name="lock-closed" size={14} color={t.textMuted} style={{ position: 'absolute', top: 8, right: 8 }} />
        )}
      </TouchableOpacity>
        {/* зачем 2026-08-04 (владелец: «звёздочки должны быть под контейнером,
            а не в контейнере»): порог цены раньше стоял третьим ярусом ВНУТРИ
            плитки — тот же фон, что у названия и арта, вплотную под подписью.
            Теперь это отдельная строка ПОД плиткой, без фона: читается как
            цена ЭТОЙ карточки, а не часть заполненной поверхности. Число
            накопительное — сравнивается напрямую с общим счётом звёзд в
            шапке. У уже открытого подарка порог гаснет до галочки: цена
            выполнена, повторять её незачем. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }} pointerEvents="none">
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
      </View>
    );
  }, [claimed, lang, onClaimReward, onLockedRewardPress, passBought, passLaneAllowed, pearlIcon, seasonId, t, themeMode]);

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
        // зачем 2026-08-04 (владелец: «полоска при скролле внизу исчезает»):
        // комментарий ниже уже ПРЕДУПРЕЖДАЛ об этом риске, но проп никогда не
        // был реально выставлен — remove­ClippedSubviews на Android включён по
        // умолчанию для FlatList/VirtualizedList. trackSpine — элемент
        // height:0 в потоке с реальным визуальным контентом высотой на ВСЮ
        // дорожку (overflow за пределы заявленной height:0). Как только его
        // заявленные (нулевые) границы уезжают за пределы окна отрисовки при
        // скролле вниз, Android физически отклипывает (unmount) весь View —
        // золотая линия прогресса пропадает, хотя JS-состояние не менялось.
        // 60 строк — не тот объём, где эта оптимизация ощутимо нужна;
        // отключаем явно вместо того, чтобы полагаться на дефолт.
        removeClippedSubviews={false}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      />
      {/* зачем 2026-08-03 (владелец: «250 стоит вход для всех и для фри и для
          премиум», плашка у него пропала): кнопка пряталась по
          `!laneUnlockedForPass`, где premium давал доступ бесплатно — подписчик
          вообще не видел, что вход платный. Скрываем ТОЛЬКО у уже купивших. */}
      {!passBought && (
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
            {/* зачем 2026-08-03 (владелец: «купить платную дорожку — неактуальный
                текст, он не отображает суть; пропуск покупают и премиум и фри»):
                «платная дорожка» — внутренний термин, которого нет в интерфейсе:
                колонки называются ПРОПУСК и ПЛЮС ПРОПУСК, а покупка одна и та же
                для обоих тиров. Слово «платная» вдобавок противопоставляло
                платное бесплатному, хотя бесплатной линии больше нет. */}
            <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '900', textAlign: 'center' }}>
              {triLang(lang, {
                ru: 'Купить пропуск сезона?', uk: 'Купити перепустку сезону?', es: '¿Comprar el pase de temporada?',
                'pt-BR': 'Comprar o passe da temporada?', vi: 'Mua vé mùa?', id: 'Beli pass musim?',
                tr: 'Sezon bileti alınsın mı?', pl: 'Kupić przepustkę sezonu?',
              })}
            </Text>
            {/* зачем 2026-08-04 (владелец: «убери текст объясняющий вообще, оставь
                только купить пропуск сезона»): пояснение про линии наград убрано,
                заголовок самодостаточен. */}
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
      {/* Просмотровая модалка «что это такое» — открывается тапом по ЛЮБОЙ
          карточке, включая ещё не заработанные. Ничего не выдаёт сама:
          «Забрать» переводит в клейм-модалку, «Нужен пропуск» — в покупку.

          зачем 2026-08-04 (владелец, со скриншотами: «А ПОЧЕМУ НЕТ НАЗВАНИЙ И
          ЦВЕТА И ТД!?! КАК ПОНЯТЬ ЧТО ЭТ!?» — «Візитка… что визитка?», «Колір
          ніка… ага… какой»): модалка и тексты SEASON_MODAL_COPY были написаны
          целиком, и ответы на эти вопросы в них уже лежали («оформление всей
          карточки», «бирюза сезона»), состояние openInfoReward заводилось тапом
          по карточке — но САМ КОМПОНЕНТ в дерево не попадал. Тап менял state,
          на экране не происходило НИЧЕГО, и узнать, что за награда, было
          физически негде: на плитке помещается только короткое название.
          Это единственная точка, где игрок читает описание — не удалять при
          рефакторинге экрана, иначе баг возвращается молча. */}
      <SeasonRewardInfoModal
        visible={openInfoReward != null}
        reward={openInfoReward?.reward ?? null}
        level={openInfoReward?.level ?? 0}
        side={openInfoReward?.side ?? 'free'}
        status={openInfoReward?.status ?? 'upcoming'}
        onClose={() => setOpenInfoReward(null)}
        onClaim={(reward, level, side) => { setOpenInfoReward(null); void onClaimReward(reward, level, side); }}
        onNeedPass={() => {
          const isPassLane = openInfoReward?.side === 'pass';
          setOpenInfoReward(null);
          onLockedRewardPress(!!isPassLane);
        }}
      />
    </View>
  );
}
