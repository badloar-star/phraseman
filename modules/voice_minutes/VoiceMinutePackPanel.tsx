import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useLang } from '../../components/LangContext';
import { useTheme } from '../../components/ThemeContext';
import { triLang } from '../../constants/i18n';
import { hapticTap } from '../../hooks/use-haptics';
import {
  loadVoiceMinutePackages,
  purchaseVoiceMinutePack,
  type VoiceMinutePack,
} from './purchase';
import { VOICE_MINUTE_PRODUCTS } from './catalog';
import { grantVoiceMinutesInDev, isVoiceMinuteDevGrantAvailable } from './dev_grant';
import { readVoiceMinuteWalletStatus, type VoiceMinuteWalletStatus } from './wallet';

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
  const [packs, setPacks] = useState<VoiceMinutePack[]>([]);
  const [wallet, setWallet] = useState<VoiceMinuteWalletStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const purchaseHint = triLang(lang, {
    ru: 'Откроет оплату разовой покупки в магазине. Минуты не сгорают.',
    en: 'Opens store payment for a one-time purchase. Minutes never expire.',
    uk: 'Відкриє оплату разової покупки в магазині. Хвилини не згорають.',
    es: 'Abre el pago en la tienda para una compra única. Los minutos no caducan.',
    'pt-BR': 'Abre o pagamento na loja para uma compra avulsa. Os minutos não expiram.',
    vi: 'Mở thanh toán trong cửa hàng cho giao dịch một lần. Số phút không hết hạn.',
    id: 'Membuka pembayaran toko untuk pembelian sekali. Menit tidak kedaluwarsa.',
    tr: 'Tek seferlik satın alma için mağaza ödemesini açar. Dakikaların süresi dolmaz.',
    pl: 'Otwiera płatność w sklepie za jednorazowy zakup. Minuty nie wygasają.',
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

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    const [catalogResult, walletResult] = await Promise.allSettled([
      loadVoiceMinutePackages(),
      readVoiceMinuteWalletStatus(),
    ]);

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
        ru: 'Баланс пока не загрузился. Пакеты и цены уже доступны.',
        en: 'Your balance has not loaded yet. Packs and prices are available.',
        uk: 'Баланс ще не завантажився. Пакети й ціни вже доступні.',
        es: 'El saldo aún no se cargó. Los paquetes y precios están disponibles.',
        'pt-BR': 'O saldo ainda não carregou. Os pacotes e preços estão disponíveis.',
        vi: 'Số dư chưa tải. Các gói và giá đã sẵn sàng.',
        id: 'Saldo belum dimuat. Paket dan harga sudah tersedia.',
        tr: 'Bakiye henüz yüklenmedi. Paketler ve fiyatlar hazır.',
        pl: 'Saldo jeszcze się nie wczytało. Pakiety i ceny są dostępne.',
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
        setError(triLang(lang, {
          ru: 'Платёж обрабатывается. Минуты появятся только после подтверждения магазина.',
          en: 'Payment is processing. Minutes appear only after the store confirms it.',
          uk: 'Платіж обробляється. Хвилини з’являться лише після підтвердження магазину.',
          es: 'El pago se está procesando. Los minutos aparecerán tras la confirmación de la tienda.',
          'pt-BR': 'O pagamento está sendo processado. Os minutos aparecerão após a confirmação da loja.',
          vi: 'Thanh toán đang được xử lý. Phút chỉ xuất hiện sau khi cửa hàng xác nhận.',
          id: 'Pembayaran sedang diproses. Menit muncul setelah dikonfirmasi toko.',
          tr: 'Ödeme işleniyor. Dakikalar mağaza onayından sonra görünür.',
          pl: 'Płatność jest przetwarzana. Minuty pojawią się po potwierdzeniu sklepu.',
        }));
      }
    } catch (purchaseError) {
      if (!(purchaseError as { userCancelled?: boolean })?.userCancelled) {
        setError(triLang(lang, {
          ru: 'Не удалось получить результат. Платёж или подтверждение ещё обрабатывается магазином.',
          en: 'Confirmation is unavailable. The payment or minute credit may still be processing in the store.',
          uk: 'Не вдалося отримати підтвердження. Платіж або нарахування ще обробляється магазином.',
          es: 'No se pudo confirmar. El pago o los minutos pueden seguir procesándose en la tienda.',
          'pt-BR': 'Não foi possível confirmar. O pagamento ou os minutos podem ainda estar em processamento na loja.',
          vi: 'Chưa thể xác nhận. Thanh toán hoặc số phút có thể vẫn đang được cửa hàng xử lý.',
          id: 'Konfirmasi belum tersedia. Pembayaran atau kredit menit mungkin masih diproses toko.',
          tr: 'Onay alınamadı. Ödeme veya dakika yüklemesi mağazada hâlâ işleniyor olabilir.',
          pl: 'Nie udało się potwierdzić. Płatność lub minuty mogą nadal być przetwarzane przez sklep.',
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
          {wallet ? minutesFromSeconds(wallet.availableSeconds) : '—'} {triLang(lang, {
            ru: 'мин', en: 'min', uk: 'хв', es: 'min', 'pt-BR': 'min', vi: 'phút', id: 'mnt', tr: 'dk', pl: 'min',
          })}
        </Text>
      </View>

      <Text style={[styles.hint, { color: t.textMuted, fontSize: f.sub }]}>
        {triLang(lang, {
          ru: 'Купленные минуты не сгорают и не имеют дневного лимита.',
          en: 'Purchased minutes never expire and have no daily cap.',
          uk: 'Придбані хвилини не згорають і не мають денного ліміту.',
          es: 'Los minutos comprados no caducan y no tienen límite diario.',
          'pt-BR': 'Os minutos comprados não expiram e não têm limite diário.',
          vi: 'Phút đã mua không hết hạn và không có giới hạn hằng ngày.',
          id: 'Menit yang dibeli tidak kedaluwarsa dan tanpa batas harian.',
          tr: 'Satın alınan dakikaların süresi dolmaz ve günlük sınırı yoktur.',
          pl: 'Kupione minuty nie wygasają i nie mają limitu dziennego.',
        })}
      </Text>

      {packSlots.map((slot) => {
        const pack = slot.pack;
        const priceLabel = pack?.priceString || (loading ? priceLoadingLabel : priceUnavailableLabel);
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
            {status || triLang(lang, { ru: 'Проверяем начисление минут…', en: 'Verifying your minute credit…', uk: 'Перевіряємо нарахування хвилин…', es: 'Verificando tus minutos…', 'pt-BR': 'Verificando seus minutos…', vi: 'Đang xác minh số phút…', id: 'Memverifikasi kredit menit…', tr: 'Dakika yüklemesi doğrulanıyor…', pl: 'Weryfikujemy naliczenie minut…' })}
          </Text>
        </View>
      ) : null}
      {error ? <Text accessibilityLiveRegion="assertive" style={[styles.error, { color: t.wrong, fontSize: f.sub }]}>{error}</Text> : null}
      {!loading && (packs.length !== VOICE_MINUTE_PRODUCTS.length || wallet === null) ? (
        <Pressable accessibilityRole="button" onPress={() => void refresh()} style={styles.retry}>
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
  hint: { lineHeight: 20, textAlign: 'center' },
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
