import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLang } from '../components/LangContext';
import { useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { onAppEvent } from './events';
import { peekRunesBalance, subscribeRunesBalance } from './runes_system';
import { peekLastKnownShardsBalance } from './shards_system';
import { RUNE_GLYPH_PRIMARY } from '../constants/runes';
import {
  SHOP_CATEGORIES,
  SHOP_ITEMS,
  shopItemsForCategory,
  shopText,
  type ShopCategoryId,
  type ShopItem,
} from './shop_catalog';

/**
 * shop.tsx — магазин: две валюты, товары по три в ряд, фильтр-док снизу.
 *
 * зачем (владелец, 24.08): руны зарабатываются в уроках и лигах и тратятся на
 * усиления прогресса, жемчуг покупается за деньги и уходит на спины, косметику
 * и наборы. Разделение ролей защищает обе валюты от обесценивания.
 *
 * ВРЕМЕННО: другого входа в магазин в приложении нет — только пункт в DEV-центре
 * (`components/dev/devToolRegistry.ts`, секция `shop`). Когда экран примут,
 * вход появится в обычной навигации.
 *
 * Макет: docs/v2/mockups/28-shop.html — там же проверены состояния плиток,
 * поведение дока и нижнего листа.
 */

/** Тайминги дока взяты у витрины достижений — движение обязано совпадать. */
const DOCK = {
  rowStaggerMs: 46,
  rowTranslateY: 18,
  rowScaleFrom: 0.9,
  scrimOpacity: 0.38,
  scrimMs: 200,
  capsuleMinHeight: 52,
  dockBottomGap: 6,
  menuGap: 10,
  rowMinHeight: 52,
  rowGap: 8,
  reducedMotionMs: 120,
  springOpen: { damping: 20, stiffness: 240, mass: 0.75 },
  springClose: { damping: 24, stiffness: 280, mass: 0.75 },
} as const;

const SHEET_HIDDEN = 520;

/**
 * Тексты экрана на всех языках интерфейса.
 * зачем: витрину видят все локали, а дописывать переводы задним числом — верный
 * способ оставить часть строк русскими у иноязычного игрока.
 */
const COPY = {
  screenTitle: { ru: 'Магазин', uk: 'Магазин', es: 'Tienda', 'pt-BR': 'Loja', vi: 'Cửa hàng', id: 'Toko', tr: 'Mağaza', pl: 'Sklep' },
  back: { ru: 'Назад', uk: 'Назад', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' },
  devOnly: {
    ru: 'Временно: вход только через DEV-центр',
    uk: 'Тимчасово: вхід лише через DEV-центр',
    es: 'Temporal: solo se entra desde el centro DEV',
    'pt-BR': 'Temporário: entrada apenas pelo centro DEV',
    vi: 'Tạm thời: chỉ vào được từ trung tâm DEV',
    id: 'Sementara: hanya bisa masuk lewat pusat DEV',
    tr: 'Geçici: yalnızca DEV merkezinden girilir',
    pl: 'Tymczasowo: wejście tylko przez centrum DEV',
  },
  badgeNew: { ru: 'НОВОЕ', uk: 'НОВЕ', es: 'NUEVO', 'pt-BR': 'NOVO', vi: 'MỚI', id: 'BARU', tr: 'YENİ', pl: 'NOWE' },
  badgeBest: { ru: 'ВЫГОДНО', uk: 'ВИГІДНО', es: 'MEJOR', 'pt-BR': 'MELHOR', vi: 'HỜI', id: 'HEMAT', tr: 'AVANTAJ', pl: 'OKAZJA' },
  emptyTitle: { ru: 'Здесь пока пусто', uk: 'Тут поки порожньо', es: 'Aquí no hay nada aún', 'pt-BR': 'Ainda não há nada aqui', vi: 'Ở đây chưa có gì', id: 'Di sini masih kosong', tr: 'Burası şimdilik boş', pl: 'Tu jeszcze pusto' },
  emptyBody: {
    ru: 'Новые товары открываются по мере прохождения курса',
    uk: 'Нові товари відкриваються в міру проходження курсу',
    es: 'Los artículos nuevos se abren conforme avanzas en el curso',
    'pt-BR': 'Novos itens são liberados conforme você avança no curso',
    vi: 'Vật phẩm mới mở dần khi bạn học tiếp khoá học',
    id: 'Barang baru terbuka seiring kamu maju di kursus',
    tr: 'Yeni ürünler kursta ilerledikçe açılır',
    pl: 'Nowe przedmioty odblokowują się w miarę postępów w kursie',
  },
  closeCategories: { ru: 'Закрыть категории', uk: 'Закрити категорії', es: 'Cerrar categorías', 'pt-BR': 'Fechar categorias', vi: 'Đóng danh mục', id: 'Tutup kategori', tr: 'Kategorileri kapat', pl: 'Zamknij kategorie' },
  close: { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' },
  notNow: { ru: 'Не сейчас', uk: 'Не зараз', es: 'Ahora no', 'pt-BR': 'Agora não', vi: 'Để sau', id: 'Nanti saja', tr: 'Şimdi değil', pl: 'Nie teraz' },
  topUpPearls: { ru: 'Пополнить жемчуг', uk: 'Поповнити перлини', es: 'Recargar perlas', 'pt-BR': 'Recarregar pérolas', vi: 'Nạp ngọc trai', id: 'Isi mutiara', tr: 'İnci yükle', pl: 'Doładuj perły' },
  notEnoughRunes: { ru: 'Не хватает рун', uk: 'Не вистачає рун', es: 'Faltan runas', 'pt-BR': 'Faltam runas', vi: 'Không đủ rune', id: 'Rune tidak cukup', tr: 'Rün yetersiz', pl: 'Brakuje run' },
  notEnoughPearls: { ru: 'Не хватает жемчуга', uk: 'Не вистачає перлин', es: 'Faltan perlas', 'pt-BR': 'Faltam pérolas', vi: 'Không đủ ngọc trai', id: 'Mutiara tidak cukup', tr: 'İnci yetersiz', pl: 'Brakuje pereł' },
  done: { ru: 'готово', uk: 'готово', es: 'listo', 'pt-BR': 'pronto', vi: 'xong', id: 'siap', tr: 'hazır', pl: 'gotowe' },
  dropped: { ru: 'Выпало', uk: 'Випало', es: 'Te tocó', 'pt-BR': 'Você tirou', vi: 'Bạn nhận được', id: 'Kamu dapat', tr: 'Çıkan', pl: 'Wypadło' },
} as const;

/** Родительный падеж валюты для строк вида «У тебя 5 рун». */
const CURRENCY_GENITIVE = {
  runes: { ru: 'рун', uk: 'рун', es: 'runas', 'pt-BR': 'runas', vi: 'rune', id: 'rune', tr: 'rün', pl: 'run' },
  pearls: { ru: 'жемчужин', uk: 'перлин', es: 'perlas', 'pt-BR': 'pérolas', vi: 'ngọc trai', id: 'mutiara', tr: 'inci', pl: 'pereł' },
} as const;

const BUY_FOR = {
  ru: (n: number) => `Купить за ${n}`,
  uk: (n: number) => `Купити за ${n}`,
  es: (n: number) => `Comprar por ${n}`,
  'pt-BR': (n: number) => `Comprar por ${n}`,
  vi: (n: number) => `Mua với ${n}`,
  id: (n: number) => `Beli seharga ${n}`,
  tr: (n: number) => `${n} karşılığında al`,
  pl: (n: number) => `Kup za ${n}`,
} as const;

const YOU_HAVE = {
  ru: (n: number, c: string) => `У тебя ${n} ${c}`,
  uk: (n: number, c: string) => `У тебе ${n} ${c}`,
  es: (n: number, c: string) => `Tienes ${n} ${c}`,
  'pt-BR': (n: number, c: string) => `Você tem ${n} ${c}`,
  vi: (n: number, c: string) => `Bạn có ${n} ${c}`,
  id: (n: number, c: string) => `Kamu punya ${n} ${c}`,
  tr: (n: number, c: string) => `${n} ${c} var`,
  pl: (n: number, c: string) => `Masz ${n} ${c}`,
} as const;

const CATEGORY_LABEL = {
  ru: (t: string) => `Категория: ${t}`,
  uk: (t: string) => `Категорія: ${t}`,
  es: (t: string) => `Categoría: ${t}`,
  'pt-BR': (t: string) => `Categoria: ${t}`,
  vi: (t: string) => `Danh mục: ${t}`,
  id: (t: string) => `Kategori: ${t}`,
  tr: (t: string) => `Kategori: ${t}`,
  pl: (t: string) => `Kategoria: ${t}`,
} as const;


/** Медальоны товаров: тон задаёт категорию, обводок нет — только перелив. */
const MEDAL_TONES: Record<ShopItem['tone'], readonly [string, string, string]> = {
  xp: ['#4b3ea8', '#241d52', '#C7BDFF'],
  shield: ['#1d6b45', '#0d3623', '#7CE8AC'],
  energy: ['#8a6a12', '#443105', '#FFD666'],
  spin: ['#7C5CE0', '#3A2678', '#DCD0FF'],
  theme: ['#b0562b', '#4d2413', '#FFC7A6'],
  cards: ['#2f5fb0', '#16294f', '#B7D0FF'],
  plus: ['#C9A84C', '#6B551F', '#23190A'],
  aura: ['#a8397e', '#4a1637', '#FFB6DF'],
};

function CurrencyMark({ currency, size, color }: { currency: 'runes' | 'pearls'; size: number; color: string }) {
  if (currency === 'runes') {
    return <Text style={{ fontSize: size, color, fontWeight: '900', lineHeight: size * 1.25 }}>{RUNE_GLYPH_PRIMARY}</Text>;
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        backgroundColor: color,
      }}
    />
  );
}

type TileProps = Readonly<{
  item: ShopItem;
  affordable: boolean;
  onPress: () => void;
}>;

function ShopTile({ item, affordable, onPress }: TileProps) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const [from, to, glyph] = MEDAL_TONES[item.tone];
  const priceColor = item.currency === 'runes' ? t.gold : '#A78BFA';
  return (
    <Pressable
      testID={`shop-tile-${item.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${shopText(lang, item.title)}. ${item.price} ${triLang(lang, CURRENCY_GENITIVE[item.currency])}`}
      accessibilityState={{ disabled: false }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: t.bgSurface, transform: [{ scale: pressed ? 0.96 : 1 }] },
      ]}
    >
      {item.badge ? (
        <View style={[styles.badge, { backgroundColor: item.badge === 'hot' ? t.wrong : t.gold }]}>
          <Text style={[styles.badgeText, { color: item.badge === 'hot' ? '#FFFFFF' : t.textOnGold }]}>
            {triLang(lang, item.badge === 'hot' ? COPY.badgeNew : COPY.badgeBest)}
          </Text>
        </View>
      ) : null}
      {/* Недоступный товар гасим ТОНОМ медальона, а не прозрачностью: opacity
          утащила бы за собой подпись и цену ниже нормы контраста. */}
      <View style={[styles.medal, { backgroundColor: affordable ? from : t.bgSurface2 }]}>
        <Ionicons name={item.icon} size={25} color={affordable ? glyph : t.textGhost} />
        <View style={[styles.medalShade, { backgroundColor: affordable ? to : 'transparent' }]} />
      </View>
      <Text
        numberOfLines={2}
        style={[styles.tileTitle, { color: affordable ? t.textPrimary : t.textMuted, fontSize: f.caption }]}
      >
        {shopText(lang, item.title)}
      </Text>
      <View style={styles.priceRow}>
        <CurrencyMark currency={item.currency} size={12} color={affordable ? priceColor : t.textMuted} />
        <Text style={[styles.priceText, { color: affordable ? priceColor : t.textMuted, fontSize: f.body }]}>
          {item.price}
        </Text>
      </View>
    </Pressable>
  );
}

export default function ShopScreen() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const insets = useStableSafeAreaInsets();
  const reduceMotion = useReduceMotion();

  // Первый кадр рисуется сразу правильными числами: оба кошелька читаются
  // синхронно из снапшота, никаких «0 и прыжок» (Performance Bible).
  const [runes, setRunes] = useState(() => peekRunesBalance().balance);
  const [pearls, setPearls] = useState(() => peekLastKnownShardsBalance() ?? 0);
  const [category, setCategory] = useState<ShopCategoryId>('all');
  const [dockOpen, setDockOpen] = useState(false);
  const [sheetItem, setSheetItem] = useState<ShopItem | null>(null);
  const [notice, setNotice] = useState('');

  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dockProgress = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(SHEET_HIDDEN)).current;
  const scrimOpacity = useRef(new Animated.Value(0)).current;
  /** Защита от двойного тапа: пока покупка в полёте, второй тап игнорируется. */
  const buyingRef = useRef(false);

  useEffect(() => subscribeRunesBalance((value) => setRunes(value.balance)), []);
  useEffect(() => {
    // onAppEvent отдаёт { remove }, а не функцию-очистку — оборачиваем.
    const subscription = onAppEvent('shards_balance_updated', ({ balance }) => setPearls(balance));
    return () => subscription.remove();
  }, []);
  useEffect(() => () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
  }, []);

  const items = useMemo(() => shopItemsForCategory(category), [category]);
  const categoryLabel = useMemo(
    () => shopText(lang, SHOP_CATEGORIES.find((c) => c.id === category)?.title ?? SHOP_CATEGORIES[0].title),
    [category, lang],
  );
  const categoryIcon = useMemo(
    () => SHOP_CATEGORIES.find((c) => c.id === category)?.icon ?? SHOP_CATEGORIES[0].icon,
    [category],
  );

  const showNotice = useCallback((text: string) => {
    setNotice(text);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 2400);
  }, []);

  const animateDock = useCallback((open: boolean) => {
    if (reduceMotion) {
      dockProgress.setValue(open ? 1 : 0);
      return;
    }
    Animated.spring(dockProgress, {
      toValue: open ? 1 : 0,
      ...(open ? DOCK.springOpen : DOCK.springClose),
      useNativeDriver: true,
    }).start();
  }, [dockProgress, reduceMotion]);

  const setDock = useCallback((open: boolean) => {
    setDockOpen(open);
    animateDock(open);
  }, [animateDock]);

  const closeSheet = useCallback(() => {
    if (reduceMotion) {
      sheetY.setValue(SHEET_HIDDEN);
      scrimOpacity.setValue(0);
      setSheetItem(null);
      return;
    }
    Animated.parallel([
      Animated.timing(sheetY, {
        toValue: SHEET_HIDDEN,
        duration: 260,
        easing: Easing.bezier(0.38, 0.7, 0.125, 1),
        useNativeDriver: true,
      }),
      Animated.timing(scrimOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) setSheetItem(null); });
  }, [reduceMotion, scrimOpacity, sheetY]);

  const openSheet = useCallback((item: ShopItem) => {
    if (dockOpen) setDock(false);
    setSheetItem(item);
    sheetY.setValue(reduceMotion ? 0 : SHEET_HIDDEN);
    scrimOpacity.setValue(reduceMotion ? 1 : 0);
    if (reduceMotion) return;
    Animated.parallel([
      Animated.spring(sheetY, { toValue: 0, damping: 24, stiffness: 260, mass: 0.9, useNativeDriver: true }),
      Animated.timing(scrimOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [dockOpen, reduceMotion, scrimOpacity, setDock, sheetY]);

  // Аппаратная «назад»: закрывает сначала лист, потом док, и только затем экран.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sheetItem) { closeSheet(); return true; }
      if (dockOpen) { setDock(false); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [closeSheet, dockOpen, setDock, sheetItem]);

  /**
   * Покупка. Пока экран за DEV-входом, списание ЛОКАЛЬНОЕ и демонстрационное:
   * подключать реальные траты рун нельзя, писателя баланса намеренно ровно один
   * (`level_spin_star_grants.ts`, это сторожит контрактный тест экономики).
   *
   * Optimistic-контур уже на месте: мгновенная реакция, защита от двойного тапа,
   * понятный ответ. Когда появится серверная трата — сюда добавится вызов и
   * откат баланса по ошибке.
   */
  const buy = useCallback((item: ShopItem) => {
    if (buyingRef.current) return;
    const balance = item.currency === 'runes' ? runes : pearls;
    if (balance < item.price) {
      void hapticTap();
      closeSheet();
      setCategory('pearls');
      showNotice(triLang(lang, item.currency === 'runes' ? COPY.notEnoughRunes : COPY.notEnoughPearls));
      return;
    }
    buyingRef.current = true;
    void hapticTap();
    closeSheet();
    // Случайный товар обязан сказать, ЧТО именно выпало, иначе покупка
    // ощущается списанием в никуда.
    showNotice(item.randomPool
      ? `${triLang(lang, COPY.dropped)}: ${shopText(lang, item.randomPool[Math.floor(Math.random() * item.randomPool.length)])}`
      : `${shopText(lang, item.title)} — ${triLang(lang, COPY.done)}`);
    setTimeout(() => { buyingRef.current = false; }, 400);
  }, [closeSheet, lang, pearls, runes, showNotice]);

  const dockBottom = Math.max(insets.bottom, 8) + DOCK.dockBottomGap;
  const menuBottom = dockBottom + DOCK.capsuleMinHeight + DOCK.menuGap;

  const sheetBalance = sheetItem ? (sheetItem.currency === 'runes' ? runes : pearls) : 0;
  const sheetAffordable = sheetItem ? sheetBalance >= sheetItem.price : false;

  return (
    <View style={[styles.root, { backgroundColor: t.bgPrimary, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          testID="shop-back"
          accessibilityRole="button"
          accessibilityLabel={triLang(lang, COPY.back)}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="chevron-back" size={24} color={t.textMuted} />
        </Pressable>
        <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>{triLang(lang, COPY.screenTitle)}</Text>
      </View>

      {/* Пометка о временном входе — прямое требование владельца. */}
      <View style={[styles.devNotice, { backgroundColor: t.bgSurface }]}>
        <Ionicons name="construct-outline" size={15} color={t.gold} />
        <Text style={[styles.devNoticeText, { color: t.textMuted, fontSize: f.caption }]}>
          {triLang(lang, COPY.devOnly)}
        </Text>
      </View>

      <View style={styles.wallets}>
        {(['runes', 'pearls'] as const).map((currency) => (
          <Pressable
            key={currency}
            testID={`shop-wallet-${currency}`}
            accessibilityRole="button"
            accessibilityLabel={`${triLang(lang, CURRENCY_GENITIVE[currency])}: ${currency === 'runes' ? runes : pearls}`}
            onPress={() => setCategory(currency === 'runes' ? 'boost' : 'pearls')}
            style={({ pressed }) => [
              styles.wallet,
              { backgroundColor: t.bgSurface, transform: [{ scale: pressed ? 0.975 : 1 }] },
            ]}
          >
            <View style={[styles.walletIcon, { backgroundColor: currency === 'runes' ? '#6B551F' : '#4A3390' }]}>
              <CurrencyMark currency={currency} size={17} color={currency === 'runes' ? '#E3CC88' : '#C4B5FD'} />
            </View>
            <Text style={[styles.walletAmount, { color: t.textPrimary, fontSize: f.h3 }]}>
              {currency === 'runes' ? runes : pearls}
            </Text>
            <Ionicons name="add" size={19} color={t.textMuted} style={styles.walletPlus} />
          </Pressable>
        ))}
      </View>

      <ScrollView
        testID="shop-scroll"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: menuBottom + 40 }]}
      >
        <View style={styles.grid}>
          {items.map((item) => (
            <ShopTile
              key={item.id}
              item={item}
              affordable={(item.currency === 'runes' ? runes : pearls) >= item.price}
              onPress={() => openSheet(item)}
            />
          ))}
        </View>
        {items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={38} color={t.textGhost} />
            <Text style={[styles.emptyTitle, { color: t.textPrimary, fontSize: f.body }]}>{triLang(lang, COPY.emptyTitle)}</Text>
            <Text style={[styles.emptyBody, { color: t.textMuted, fontSize: f.caption }]}>
              {triLang(lang, COPY.emptyBody)}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {notice ? (
        <View style={[styles.toast, { backgroundColor: t.bgSurface2, bottom: menuBottom + 12 }]}>
          <Text accessibilityLiveRegion="polite" style={[styles.toastText, { color: t.textPrimary, fontSize: f.caption }]}>
            {notice}
          </Text>
        </View>
      ) : null}

      {/* ── Док категорий ─────────────────────────────────────────── */}
      {dockOpen ? (
        <Animated.View
          style={[StyleSheet.absoluteFillObject, styles.dockScrim, {
            opacity: dockProgress.interpolate({ inputRange: [0, 1], outputRange: [0, DOCK.scrimOpacity] }),
          }]}
        >
          <Pressable
            testID="shop-dock-scrim"
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, COPY.closeCategories)}
            onPress={() => setDock(false)}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
      ) : null}

      {dockOpen ? (
        <View style={[styles.dockMenu, { bottom: menuBottom }]} pointerEvents="box-none">
          {SHOP_CATEGORIES.map((cat, index) => {
            // Стаггер снизу вверх: нижний ряд трогается первым, список «растёт»
            // от капсулы — как в витрине достижений.
            const order = SHOP_CATEGORIES.length - index - 1;
            const start = Math.min(0.85, order * 0.09);
            const selected = cat.id === category;
            return (
              <Animated.View
                key={cat.id}
                style={{
                  opacity: dockProgress.interpolate({ inputRange: [start, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
                  transform: reduceMotion ? [] : [
                    {
                      translateY: dockProgress.interpolate({
                        inputRange: [start, 1],
                        outputRange: [DOCK.rowTranslateY, 0],
                        extrapolate: 'clamp',
                      }),
                    },
                    {
                      scale: dockProgress.interpolate({
                        inputRange: [start, 1],
                        outputRange: [DOCK.rowScaleFrom, 1],
                        extrapolate: 'clamp',
                      }),
                    },
                  ],
                }}
              >
                <Pressable
                  testID={`shop-category-${cat.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={shopText(lang, cat.title)}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    void hapticTap();
                    setCategory(cat.id);
                    setDock(false);
                  }}
                  style={({ pressed }) => [
                    styles.dockRow,
                    { backgroundColor: selected ? t.bgSurface2 : t.bgCard, opacity: pressed ? 0.84 : 1 },
                  ]}
                >
                  <View style={[styles.dockRowIcon, { backgroundColor: selected ? t.accentBg : t.bgSurface }]}>
                    <Ionicons name={cat.icon} size={18} color={selected ? t.accent : t.textMuted} />
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[styles.dockRowLabel, {
                      color: t.textPrimary,
                      fontSize: f.body,
                      fontWeight: selected ? '900' : '700',
                    }]}
                  >
                    {shopText(lang, cat.title)}
                  </Text>
                  {selected ? (
                    <Ionicons name="checkmark" size={19} color={t.accent} />
                  ) : (
                    <Text style={[styles.dockRowCount, { color: t.textMuted, fontSize: f.caption }]}>
                      {cat.id === 'all' ? SHOP_ITEMS.length : shopItemsForCategory(cat.id).length}
                    </Text>
                  )}
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      ) : null}

      <View style={[styles.dockCapsuleWrap, { bottom: dockBottom }]} pointerEvents="box-none">
        <Pressable
          testID="shop-dock-capsule"
          accessibilityRole="button"
          accessibilityLabel={triLang(lang, CATEGORY_LABEL)(categoryLabel)}
          accessibilityState={{ expanded: dockOpen }}
          onPress={() => {
            void hapticTap();
            setDock(!dockOpen);
          }}
          style={({ pressed }) => [
            styles.capsule,
            { backgroundColor: t.bgCard, opacity: pressed ? 0.86 : 1 },
          ]}
        >
          <Ionicons name={categoryIcon} size={17} color={t.accent} />
          <Text style={[styles.capsuleLabel, { color: t.textPrimary, fontSize: f.body }]}>{categoryLabel}</Text>
          <Ionicons name={dockOpen ? 'chevron-down' : 'chevron-up'} size={16} color={t.textMuted} />
        </Pressable>
      </View>

      {/* ── Нижний лист подтверждения ─────────────────────────────── */}
      {sheetItem ? (
        <>
          <Animated.View style={[StyleSheet.absoluteFillObject, styles.sheetScrim, { opacity: scrimOpacity }]}>
            <Pressable
              testID="shop-sheet-scrim"
              accessibilityRole="button"
              accessibilityLabel={triLang(lang, COPY.close)}
              onPress={closeSheet}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>
          <Animated.View
            testID="shop-sheet"
            style={[
              styles.sheet,
              {
                backgroundColor: t.bgCard,
                paddingBottom: Math.max(insets.bottom, 16) + 8,
                transform: [{ translateY: sheetY }],
              },
            ]}
          >
            <View style={[styles.grab, { backgroundColor: t.bgSurface2 }]} />
            <View style={[styles.sheetMedal, { backgroundColor: MEDAL_TONES[sheetItem.tone][0] }]}>
              <Ionicons name={sheetItem.icon} size={32} color={MEDAL_TONES[sheetItem.tone][2]} />
            </View>
            <Text style={[styles.sheetTitle, { color: t.textPrimary, fontSize: f.h3 }]}>{shopText(lang, sheetItem.title)}</Text>
            <Text style={[styles.sheetBody, { color: t.textMuted, fontSize: f.body }]}>{shopText(lang, sheetItem.detail)}</Text>
            <Pressable
              testID="shop-sheet-confirm"
              accessibilityRole="button"
              accessibilityLabel={sheetAffordable
                ? triLang(lang, BUY_FOR)(sheetItem.price)
                : triLang(lang, COPY.topUpPearls)}
              onPress={() => buy(sheetItem)}
              style={({ pressed }) => [
                styles.cta,
                {
                  backgroundColor: sheetAffordable
                    ? (sheetItem.currency === 'runes' ? t.gold : '#8B6FE8')
                    : '#8B6FE8',
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              {sheetAffordable ? (
                <CurrencyMark
                  currency={sheetItem.currency}
                  size={15}
                  color={sheetItem.currency === 'runes' ? t.textOnGold : '#FFFFFF'}
                />
              ) : null}
              <Text style={[styles.ctaLabel, {
                color: sheetAffordable && sheetItem.currency === 'runes' ? t.textOnGold : '#FFFFFF',
                fontSize: f.body,
              }]}>
                {sheetAffordable ? triLang(lang, BUY_FOR)(sheetItem.price) : triLang(lang, COPY.topUpPearls)}
              </Text>
            </Pressable>
            <Pressable
              testID="shop-sheet-cancel"
              accessibilityRole="button"
              accessibilityLabel={triLang(lang, COPY.notNow)}
              onPress={closeSheet}
              style={({ pressed }) => [styles.ctaFlat, { backgroundColor: t.bgSurface, opacity: pressed ? 0.86 : 1 }]}
            >
              <Text style={[styles.ctaLabel, { color: t.textPrimary, fontSize: f.body }]}>{triLang(lang, COPY.notNow)}</Text>
            </Pressable>
            <Text style={[styles.sheetBalance, { color: t.textMuted, fontSize: f.caption }]}>
              {triLang(lang, YOU_HAVE)(sheetBalance, triLang(lang, CURRENCY_GENITIVE[sheetItem.currency]))}
            </Text>
          </Animated.View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingTop: 6 },
  backButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '900', letterSpacing: -0.3, flex: 1 },
  devNotice: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    marginHorizontal: 16, marginTop: 4, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12,
  },
  devNoticeText: { fontWeight: '700', flex: 1 },
  wallets: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 12 },
  wallet: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, padding: 11 },
  walletIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  walletAmount: { fontWeight: '900', letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  walletPlus: { marginLeft: 'auto' },
  scrollContent: { paddingTop: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, paddingHorizontal: 16 },
  // Три в ряд: ширина считается от отступов (16*2) и двух зазоров по 9.
  tile: {
    width: '31.4%', borderRadius: 18, paddingTop: 12, paddingBottom: 10, paddingHorizontal: 6,
    alignItems: 'center', gap: 7, overflow: 'hidden',
  },
  medal: { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  medalShade: { ...StyleSheet.absoluteFillObject, opacity: 0.35, zIndex: -1 },
  tileTitle: { fontWeight: '800', textAlign: 'center', minHeight: 32 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceText: { fontWeight: '900', fontVariant: ['tabular-nums'] },
  badge: { position: 'absolute', top: 0, right: 0, paddingHorizontal: 6, paddingVertical: 3, borderTopRightRadius: 18, borderBottomLeftRadius: 10 },
  badgeText: { fontSize: 8.5, fontWeight: '900', letterSpacing: 0.3 },
  empty: { alignItems: 'center', paddingHorizontal: 30, paddingVertical: 34, gap: 8 },
  emptyTitle: { fontWeight: '800' },
  emptyBody: { textAlign: 'center', lineHeight: 19 },
  toast: { position: 'absolute', left: 16, right: 16, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 },
  toastText: { fontWeight: '800', textAlign: 'center' },
  dockScrim: { backgroundColor: '#000000', zIndex: 5 },
  dockMenu: { position: 'absolute', left: 14, right: 14, gap: DOCK.rowGap, zIndex: 6 },
  dockRow: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    minHeight: DOCK.rowMinHeight, paddingHorizontal: 15, borderRadius: 17,
  },
  dockRowIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dockRowLabel: { flex: 1 },
  dockRowCount: { fontWeight: '800', fontVariant: ['tabular-nums'] },
  dockCapsuleWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 6 },
  capsule: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    minHeight: DOCK.capsuleMinHeight, paddingHorizontal: 18, borderRadius: 26,
    shadowColor: '#000000', shadowOpacity: 0.34, shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  capsuleLabel: { fontWeight: '900' },
  sheetScrim: { backgroundColor: 'rgba(6,8,18,0.68)', zIndex: 8 },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 9,
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingHorizontal: 18, paddingTop: 14, alignItems: 'stretch',
  },
  grab: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetMedal: { width: 68, height: 68, borderRadius: 22, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  sheetTitle: { fontWeight: '900', textAlign: 'center', letterSpacing: -0.2 },
  sheetBody: { textAlign: 'center', marginTop: 8, marginBottom: 18, lineHeight: 21 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 16, paddingVertical: 15 },
  ctaFlat: { alignItems: 'center', justifyContent: 'center', borderRadius: 16, paddingVertical: 15, marginTop: 9 },
  ctaLabel: { fontWeight: '900' },
  sheetBalance: { textAlign: 'center', fontWeight: '700', marginTop: 12 },
});
