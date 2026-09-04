import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useLang } from '../../components/LangContext';
import { useTheme } from '../../components/ThemeContext';
import { triLang } from '../../constants/i18n';
import { hapticTap } from '../../hooks/use-haptics';
import { purchaseVoiceMinutePack, type VoiceMinutePack } from './purchase';
import {
  peekVoiceMinutePackages,
  peekVoiceMinutePriceStrings,
  primeVoiceMinutePackages,
} from './packages_cache';
import { peekMaxVoiceAccess, peekVoiceMinutes } from './peek_cache';
import { resolveVoiceMinutesView, voiceMinutesToDisplay } from './entitlement_view';
import { VOICE_MINUTE_PRODUCTS } from './catalog';
import { grantVoiceMinutesInDev, isVoiceMinuteDevGrantAvailable } from './dev_grant';
import { readVoiceMinuteWalletStatus, type VoiceMinuteWalletStatus } from './wallet';
import { DebugLogger } from '../../app/debug-logger';

type Props = Readonly<{
  onCredited?: (wallet: VoiceMinuteWalletStatus) => void;
  onBusyChange?: (busy: boolean) => void;
}>;

const minutesFromSeconds = (seconds: number): string => (seconds / 60).toLocaleString(undefined, {
  maximumFractionDigits: seconds % 60 === 0 ? 0 : 1,
});

export default function VoiceMinutePackPanel({ onCredited, onBusyChange }: Props) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  // зачем (владелец 2026-08-30, «модал грузится долго»): первый кадр — из
  // кэша пакетов (прогретого пре-экраном/пейволом), баланс — из peek минут;
  // сеть лишь подтверждает. Спиннеры остаются только холодному первому запуску.
  const [packs, setPacks] = useState<VoiceMinutePack[]>(() => peekVoiceMinutePackages() ?? []);
  const [wallet, setWallet] = useState<VoiceMinuteWalletStatus | null>(null);
  const [loading, setLoading] = useState(() => peekVoiceMinutePackages() === null);
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  // зачем (Библия текстов, правило 3: живой человек, без канцелярита):
  // «оплату разовой покупки в магазине» → простыми словами и короче.
  const purchaseHint = triLang(lang, {
    ru: 'Разовая покупка в магазине. Минуты не сгорают.',
    en: 'A one-time store purchase. Minutes never expire.',
    uk: 'Разова покупка в магазині. Хвилини не згорають.',
    es: 'Compra única en la tienda. Los minutos no caducan.',
    'pt-BR': 'Compra única na loja. Os minutos não expiram.',
    vi: 'Mua một lần trong cửa hàng. Số phút không hết hạn.',
    id: 'Pembelian sekali di toko. Menit tidak kedaluwarsa.',
    tr: 'Mağazadan tek seferlik satın alma. Dakikaların süresi dolmaz.',
    pl: 'Jednorazowy zakup w sklepie. Minuty nie wygasają.',
  });
  const priceLoadingLabel = triLang(lang, {
    ru: 'Загружаем цену…', en: 'Loading price…', uk: 'Завантажуємо ціну…', es: 'Cargando precio…',
    'pt-BR': 'Carregando preço…', vi: 'Đang tải giá…', id: 'Memuat harga…',
    tr: 'Fiyat yükleniyor…', pl: 'Ładowanie ceny…',
  });
  const priceUnavailableLabel = triLang(lang, {
    ru: 'Цена недоступна', en: 'Price unavailable', uk: 'Ціна недоступна', es: 'Precio no disponible',
    'pt-BR': 'Preço indisponível', vi: 'Giá chưa khả dụng', id: 'Harga tidak tersedia',
    tr: 'Fiyat kullanılamıyor', pl: 'Cena niedostępna',
  });

  useEffect(() => {
    onBusyChange?.(purchaseBusy);
    return () => { if (purchaseBusy) onBusyChange?.(false); };
  }, [onBusyChange, purchaseBusy]);

  const refresh = useCallback(async (force = false) => {
    const startedAt = Date.now();
    // Кэш свежий → primeVoiceMinutePackages вернётся мгновенно, спиннер цен
    // даже не мигнёт; force — только ручной «Попробовать снова».
    if (peekVoiceMinutePackages() === null || force) setLoading(true);
    setError('');
    const [catalogResult, walletResult] = await Promise.allSettled([
      primeVoiceMinutePackages(force),
      readVoiceMinuteWalletStatus(),
    ]);
    DebugLogger.info(
      '[MINUTE-PACKS]',
      `panel refresh in ${Date.now() - startedAt}ms: catalog=${catalogResult.status} wallet=${walletResult.status}`,
    );

    const availablePacks = catalogResult.status === 'fulfilled'
      ? catalogResult.value.filter((pack) => pack.priceString.trim() !== '')
      : [];
    setPacks(availablePacks);
    if (walletResult.status === 'fulfilled') setWallet(walletResult.value);

    const catalogReady = availablePacks.length === VOICE_MINUTE_PRODUCTS.length;
    const walletReady = walletResult.status === 'fulfilled';
    if (!catalogReady && !walletReady) {
      setError(triLang(lang, {
        ru: 'Не удалось загрузить баланс и цены. Проверь интернет.',
        en: 'Could not load your balance and prices. Check your connection.',
        uk: 'Не вдалося завантажити баланс і ціни. Перевір інтернет.',
        es: 'No se pudieron cargar el saldo y los precios. Revisa tu conexión.',
        'pt-BR': 'Não foi possível carregar o saldo e os preços. Verifique a conexão.',
        vi: 'Không tải được số dư và giá. Hãy kiểm tra kết nối.',
        id: 'Saldo dan harga tidak dapat dimuat. Periksa koneksi.',
        tr: 'Bakiye ve fiyatlar yüklenemedi. Bağlantını kontrol et.',
        pl: 'Nie udało się wczytać salda i cen. Sprawdź połączenie.',
      }));
    } else if (!catalogReady) {
      setError(triLang(lang, {
        ru: 'Не удалось загрузить цены магазина. Попробуй ещё раз.',
        en: 'Could not load store prices. Please try again.',
        uk: 'Не вдалося завантажити ціни магазину. Спробуй ще раз.',
        es: 'No se pudieron cargar los precios de la tienda. Inténtalo de nuevo.',
        'pt-BR': 'Não foi possível carregar os preços da loja. Tente novamente.',
        vi: 'Không tải được giá từ cửa hàng. Hãy thử lại.',
        id: 'Harga toko tidak dapat dimuat. Coba lagi.',
        tr: 'Mağaza fiyatları yüklenemedi. Tekrar dene.',
        pl: 'Nie udało się wczytać cen sklepu. Spróbuj ponownie.',
      }));
    } else if (!walletReady) {
      setError(triLang(lang, {
        ru: 'Баланс ещё грузится, но купить уже можно.',
        en: 'Your balance is still loading, but you can already buy.',
        uk: 'Баланс ще вантажиться, але купити вже можна.',
        es: 'El saldo aún se está cargando, pero ya puedes comprar.',
        'pt-BR': 'O saldo ainda está carregando, mas você já pode comprar.',
        vi: 'Số dư đang tải, nhưng bạn đã có thể mua.',
        id: 'Saldo masih dimuat, tapi kamu sudah bisa membeli.',
        tr: 'Bakiye hâlâ yükleniyor ama satın alabilirsin.',
        pl: 'Saldo jeszcze się wczytuje, ale możesz już kupować.',
      }));
    }
    setLoading(false);
  }, [lang]);

  useEffect(() => { void refresh(); }, [refresh]);

  // зачем: владелец 2026-08-29 — в дев-сборке нужно проверять начисление минут
  // без списания денег. Долгое нажатие по карточке начисляет пакет напрямую
  // админской функцией; в релизе devGrantEnabled=false и ветки нет вовсе.
  const devGrantEnabled = isVoiceMinuteDevGrantAvailable();
  const devGrant = async (minutes: number) => {
    if (purchaseBusy) return;
    hapticTap();
    setPurchaseBusy(true);
    setError('');
    setStatus(`DEV: +${minutes}`);
    // Optimistic UI: баланс растёт сразу, ответ сервера его затем подтверждает.
    const optimistic = wallet;
    if (optimistic) {
      setWallet({ ...optimistic, availableSeconds: optimistic.availableSeconds + minutes * 60 });
    }
    try {
      const result = await grantVoiceMinutesInDev(minutes);
      if (result.status === 'credited' && result.wallet) {
        setWallet(result.wallet);
        onCredited?.(result.wallet);
        setStatus('');
        return;
      }
      if (optimistic) setWallet(optimistic);
      setError(`DEV: начисление не прошло — ${result.reason ?? result.status}`);
    } finally {
      setPurchaseBusy(false);
      setStatus('');
    }
  };

  const buy = async (pack: VoiceMinutePack) => {
    if (purchaseBusy) return;
    hapticTap();
    setPurchaseBusy(true);
    setError('');
    setStatus(triLang(lang, {
      ru: 'Открываем оплату…', en: 'Opening payment…', uk: 'Відкриваємо оплату…',
      es: 'Abriendo el pago…', 'pt-BR': 'Abrindo o pagamento…', vi: 'Đang mở thanh toán…',
      id: 'Membuka pembayaran…', tr: 'Ödeme açılıyor…', pl: 'Otwieramy płatność…',
    }));
    try {
      const result = await purchaseVoiceMinutePack(pack);
      if (result.status === 'credited' && result.wallet) {
        setWallet(result.wallet);
        setStatus(triLang(lang, {
          ru: 'Минуты добавлены', en: 'Minutes added', uk: 'Хвилини додано', es: 'Minutos añadidos',
          'pt-BR': 'Minutos adicionados', vi: 'Đã thêm phút', id: 'Menit ditambahkan',
          tr: 'Dakikalar eklendi', pl: 'Minuty dodane',
        }));
        onCredited?.(result.wallet);
        return;
      }
      if (result.status === 'stale') {
        setError(triLang(lang, {
          ru: 'Аккаунт изменился. Открой экран снова.', en: 'The account changed. Open this screen again.',
          uk: 'Акаунт змінився. Відкрий цей екран знову.', es: 'La cuenta cambió. Abre esta pantalla de nuevo.',
          'pt-BR': 'A conta mudou. Abra esta tela novamente.', vi: 'Tài khoản đã thay đổi. Hãy mở lại màn hình.',
          id: 'Akun berubah. Buka layar ini lagi.', tr: 'Hesap değişti. Bu ekranı yeniden aç.',
          pl: 'Konto się zmieniło. Otwórz ten ekran ponownie.',
        }));
      } else {
        // Библия: коротко и по-человечески; главное — успокоить, что минуты
        // придут сами, дожимать ничего не надо.
        setError(triLang(lang, {
          ru: 'Магазин ещё подтверждает платёж — минуты придут сразу после этого.',
          en: 'The store is still confirming the payment — minutes will arrive right after.',
          uk: 'Магазин ще підтверджує платіж — хвилини прийдуть одразу після цього.',
          es: 'La tienda aún confirma el pago; los minutos llegarán justo después.',
          'pt-BR': 'A loja ainda está confirmando o pagamento — os minutos chegam logo depois.',
          vi: 'Cửa hàng đang xác nhận thanh toán — số phút sẽ đến ngay sau đó.',
          id: 'Toko masih mengonfirmasi pembayaran — menit akan masuk setelahnya.',
          tr: 'Mağaza ödemeyi hâlâ onaylıyor — dakikalar hemen ardından gelecek.',
          pl: 'Sklep jeszcze potwierdza płatność — minuty pojawią się zaraz potem.',
        }));
      }
    } catch (purchaseError) {
      if (!(purchaseError as { userCancelled?: boolean })?.userCancelled) {
        // Библия: без двойного пассива; главный страх человека — «деньги ушли,
        // минут нет» — отвечаем на него прямо.
        setError(triLang(lang, {
          ru: 'Магазин пока не подтвердил платёж. Если деньги списались — минуты начислятся сами.',
          en: 'The store has not confirmed the payment yet. If you were charged, the minutes will arrive on their own.',
          uk: 'Магазин поки не підтвердив платіж. Якщо гроші списалися — хвилини нарахуються самі.',
          es: 'La tienda aún no confirmó el pago. Si se cobró, los minutos llegarán solos.',
          'pt-BR': 'A loja ainda não confirmou o pagamento. Se foi cobrado, os minutos chegarão sozinhos.',
          vi: 'Cửa hàng chưa xác nhận thanh toán. Nếu đã trừ tiền, số phút sẽ tự được cộng.',
          id: 'Toko belum mengonfirmasi pembayaran. Jika sudah terpotong, menit akan masuk sendiri.',
          tr: 'Mağaza ödemeyi henüz onaylamadı. Para çekildiyse dakikalar kendiliğinden gelecek.',
          pl: 'Sklep jeszcze nie potwierdził płatności. Jeśli pobrano środki, minuty dojdą same.',
        }));
      }
    } finally {
      setPurchaseBusy(false);
      setStatus('');
    }
  };

  const packsByProductId = new Map(packs.map((pack) => [pack.productId, pack] as const));
  const packSlots = VOICE_MINUTE_PRODUCTS.map((definition) => ({
    ...definition,
    pack: packsByProductId.get(definition.productId) ?? null,
  }));

  return (
    <View style={styles.root}>
      <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>MAX · {triLang(lang, {
        ru: 'минуты', en: 'minutes', uk: 'хвилини', es: 'minutos', 'pt-BR': 'minutos',
        vi: 'phút', id: 'menit', tr: 'dakika', pl: 'minuty',
      })}</Text>
      <View testID="voice-minute-wallet-balance" style={[styles.balance, { backgroundColor: t.bgCard }]}>
        <Text style={[styles.balanceLabel, { color: t.textMuted, fontSize: f.sub }]}> {triLang(lang, {
          ru: 'Доступно', en: 'Available', uk: 'Доступно', es: 'Disponible', 'pt-BR': 'Disponível',
          vi: 'Khả dụng', id: 'Tersedia', tr: 'Kullanılabilir', pl: 'Dostępne',
        })}</Text>
        <Text style={[styles.balanceValue, { color: t.textPrimary, fontSize: f.h1 }]}>
          {(() => {
            // Первый кадр — из peek последнего известного остатка; ответ
            // callable затем его подтверждает. Пустой кошелёк сам по себе не
            // означает ноль: подтверждённый пробник всё ещё даёт 3 минуты.
            // Единый resolver также не выдумывает пробник при unknown/none.
            const peek = peekVoiceMinutes();
            const walletSec = wallet
              ? wallet.availableSeconds + wallet.reservedSeconds
              : peek?.seconds ?? null;
            const view = resolveVoiceMinutesView({
              walletSec,
              walletAvailableSec: wallet?.availableSeconds ?? peek?.seconds ?? null,
              access: peekMaxVoiceAccess(),
            });
            const minutes = voiceMinutesToDisplay(view);
            return minutes === null ? '—' : minutesFromSeconds(minutes * 60);
          })()} {triLang(lang, {
            ru: 'мин', en: 'min', uk: 'хв', es: 'min', 'pt-BR': 'min', vi: 'phút', id: 'mnt', tr: 'dk', pl: 'min',
          })}
        </Text>
      </View>

      {/* зачем (владелец 2026-09-04): подпись «Минуты не сгорают и без дневного
          лимита» убрана — это запрещённая подпись-расшифровка мелкими буквами
          под заголовком. Названия пакетов и цена говорят сами за себя; текст
          для незрячих сохранён в accessibilityHint кнопки покупки. */}

      {packSlots.map((slot) => {
        const pack = slot.pack;
        // Последний известный ценник (диск) показываем сразу; кнопка оживёт,
        // когда доедет живой пакет — покупке нужен настоящий PurchasesPackage.
        const cachedPrice = peekVoiceMinutePriceStrings()?.[slot.productId] ?? '';
        const priceLabel = pack?.priceString
          || cachedPrice
          || (loading ? priceLoadingLabel : priceUnavailableLabel);
        const disabled = purchaseBusy || (!pack && !devGrantEnabled);
        return (
        <Pressable
          key={slot.productId}
          testID={`voice-minute-pack-${slot.minutes}`}
          accessibilityRole="button"
          accessibilityLabel={`${slot.minutes} ${triLang(lang, { ru: 'минут', en: 'minutes', uk: 'хвилин', es: 'minutos', 'pt-BR': 'minutos', vi: 'phút', id: 'menit', tr: 'dakika', pl: 'minut' })}, ${priceLabel}`}
          accessibilityHint={purchaseHint}
          accessibilityState={{ disabled, busy: purchaseBusy }}
          disabled={disabled}
          hitSlop={4}
          onPress={() => { if (pack) void buy(pack); }}
          onLongPress={devGrantEnabled ? () => { void devGrant(slot.minutes); } : undefined}
          delayLongPress={600}
          style={({ pressed }) => [
            styles.pack,
            { backgroundColor: t.bgCard, borderColor: t.border, opacity: disabled ? 0.74 : pressed ? 0.82 : 1 },
          ]}
        >
          <View style={styles.packCopy}>
            <Text style={[styles.packMinutes, { color: t.textPrimary, fontSize: f.h3 }]}>{slot.minutes} {triLang(lang, {
              ru: 'минут', en: 'minutes', uk: 'хвилин', es: 'minutos', 'pt-BR': 'minutos',
              vi: 'phút', id: 'menit', tr: 'dakika', pl: 'minut',
            })}</Text>
          </View>
          <View style={[styles.pricePill, { backgroundColor: pack ? t.accent : t.bgSurface2 }]}>
            {loading && !pack ? <ActivityIndicator color={t.textMuted} size="small" /> : null}
            <Text style={[styles.price, { color: pack ? t.correctText : t.textMuted, fontSize: f.body }]}>{priceLabel}</Text>
          </View>
        </Pressable>
        );
      })}

      {devGrantEnabled ? (
        <Text style={[styles.devHint, { color: t.gold, fontSize: f.sub }]}>
          DEV: удерживай карточку — минуты начислятся без оплаты
        </Text>
      ) : null}

      {purchaseBusy ? (
        <View style={styles.processing} accessibilityLiveRegion="polite">
          <ActivityIndicator color={t.accent} />
          <Text style={[styles.processingText, { color: t.textMuted, fontSize: f.sub }]}>
            {status || triLang(lang, { ru: 'Подтверждаем покупку…', en: 'Confirming your purchase…', uk: 'Підтверджуємо покупку…', es: 'Confirmando tu compra…', 'pt-BR': 'Confirmando sua compra…', vi: 'Đang xác nhận giao dịch…', id: 'Mengonfirmasi pembelian…', tr: 'Satın alma onaylanıyor…', pl: 'Potwierdzamy zakup…' })}
          </Text>
        </View>
      ) : null}
      {error ? <Text accessibilityLiveRegion="assertive" style={[styles.error, { color: t.wrong, fontSize: f.sub }]}>{error}</Text> : null}
      {!loading && (packs.length !== VOICE_MINUTE_PRODUCTS.length || wallet === null) ? (
        <Pressable accessibilityRole="button" onPress={() => void refresh(true)} style={styles.retry}>
          <Text style={{ color: t.accent, fontSize: f.body, fontWeight: '700' }}>{triLang(lang, {
            ru: 'Попробовать снова', en: 'Try again', uk: 'Спробувати знову', es: 'Intentar de nuevo',
            'pt-BR': 'Tentar novamente', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Spróbuj ponownie',
          })}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  title: { fontWeight: '700', textAlign: 'center' },
  balance: { alignItems: 'center', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12 },
  balanceLabel: { fontWeight: '400' },
  balanceValue: { fontWeight: '700', marginTop: 2 },
  pack: { minHeight: 84, borderRadius: 18, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, gap: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  packCopy: { flex: 1, gap: 3 },
  packMinutes: { fontWeight: '700' },
  pricePill: { minHeight: 44, minWidth: 112, maxWidth: 148, borderRadius: 14, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', gap: 4 },
  price: { fontWeight: '800', textAlign: 'center' },
  processing: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  processingText: { flexShrink: 1, fontWeight: '400' },
  devHint: { lineHeight: 18, textAlign: 'center', fontWeight: '700' },
  error: { lineHeight: 20, textAlign: 'center' },
  retry: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
