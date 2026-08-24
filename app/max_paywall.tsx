import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PurchasesPackage } from 'react-native-purchases';

import ScreenGradient from '../components/ScreenGradient';
import MaxHomeOrb from '../components/home/MaxHomeOrb';
import { PaywallEntrance } from '../components/paywall/PaywallMotion';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { getMaxHomeOrbLayers } from './max_home_orb_assets';
import { emitAppEvent } from './events';
import { trackEvent } from './analytics';
import {
  confirmMaxSubscriptionActivation,
  loadMaxSubscriptionPackage,
  purchaseMaxSubscription,
  restoreMaxSubscription,
} from '../modules/max_subscription/purchase';
import {
  finishMaxPaywallNavigation,
  isMaxPaywallPrimaryActionDisabled,
  isMaxPaywallRestoreDisabled,
  maxPaywallAnalyticsSource,
  runMaxPaywallPrimaryAction,
  shouldShowMaxPaywallPrimarySpinner,
} from '../modules/max_subscription/paywall_state';
import { hasPendingMaxActivationForCurrentAccount } from '../modules/max_subscription/pending';
import { safeRouterBack } from './navigation_back';

// зачем: продающий экран MAX-подписки — владелец 2026-08-24 отверг черновой
// вариант (мелкий текст, буква "MAX" вместо орба, нет объяснения фич, без
// анимации) и утвердил макет: дышащий орб (тот же ассет, что на главной и в
// звонке) → честное «ИИ-учитель» → 3 крупные карточки реальных фич (не общие
// слова — то, что MAX правда умеет: голосовой диалог, разбор ошибок,
// персональный план) → таблица сравнения минут звонка по тирам → карточка
// цены → CTA. Масштаб элементов — эталон «Статистика» (память
// feedback_design_etalon_stats_krupno): полноширинные карточки radius 22,
// медальоны 52, числа весом 900, ничего мельче f.sub.

const FEATURE_ICONS = ['mic', 'create', 'compass'] as const;

function featureCopy(lang: Lang) {
  return [
    triLang(lang, {
      ru: 'Настоящий голосовой диалог', uk: 'Справжній голосовий діалог', es: 'Diálogo de voz real',
      'pt-BR': 'Diálogo de voz real', vi: 'Hội thoại giọng nói thực sự', id: 'Dialog suara nyata',
      tr: 'Gerçek sesli diyalog', pl: 'Prawdziwy dialog głosowy',
    }),
    triLang(lang, {
      ru: 'Разбор ошибок после звонка', uk: 'Розбір помилок після дзвінка', es: 'Análisis de errores tras la llamada',
      'pt-BR': 'Análise de erros após a ligação', vi: 'Phân tích lỗi sau cuộc gọi', id: 'Ulasan kesalahan setelah panggilan',
      tr: 'Aramadan sonra hata analizi', pl: 'Analiza błędów po rozmowie',
    }),
    triLang(lang, {
      ru: 'Помнит твой прогресс', uk: 'Пам’ятає твій прогрес', es: 'Recuerda tu progreso',
      'pt-BR': 'Lembra do seu progresso', vi: 'Ghi nhớ tiến trình của bạn', id: 'Mengingat progresmu',
      tr: 'İlerlemeni hatırlar', pl: 'Pamięta twoje postępy',
    }),
  ];
}

// зачем: владелец выбрал вариант D («две карточки рядом») — тиры сравниваются
// не строками таблицы, а двумя плитками: слева бесплатный лимит, справа MAX.
// Поэтому кроме honest-строки `value` (её дословно сторожат контрактные тесты
// и она несёт полную формулировку) нужны разрезанные куски: `amount` — число
// крупно, `note` — условие тише под ним. Дублирование намеренное: склейка
// через split(' ') развалилась бы на восьми языках, где число и единица
// разделены по-разному («120 dk/ay», «120 phút/tháng», «3 mnt»).
function minutesRows(lang: Lang) {
  return [
    {
      // Одна объединённая строка не создаёт ложного обещания второго пробника
      // после апгрейда Free -> Плюс/Про.
      label: triLang(lang, {
        ru: 'Бесплатно / Плюс / Про', uk: 'Безкоштовно / Плюс / Про', es: 'Gratis / Plus / Pro',
        'pt-BR': 'Grátis / Plus / Pro', vi: 'Miễn phí / Plus / Pro', id: 'Gratis / Plus / Pro',
        tr: 'Ücretsiz / Plus / Pro', pl: 'Bezpłatnie / Plus / Pro',
      }),
      value: triLang(lang, {
        ru: '3 мин · один раз на аккаунт', uk: '3 хв · один раз на акаунт', es: '3 min · una vez por cuenta',
        'pt-BR': '3 min · uma vez por conta', vi: '3 phút · một lần cho mỗi tài khoản', id: '3 mnt · sekali per akun',
        tr: '3 dk · hesap başına bir kez', pl: '3 min · raz na konto',
      }),
      amount: triLang(lang, {
        ru: '3 мин', uk: '3 хв', es: '3 min', 'pt-BR': '3 min',
        vi: '3 phút', id: '3 mnt', tr: '3 dk', pl: '3 min',
      }),
      note: triLang(lang, {
        ru: 'один раз на аккаунт', uk: 'один раз на акаунт', es: 'una vez por cuenta',
        'pt-BR': 'uma vez por conta', vi: 'một lần cho mỗi tài khoản', id: 'sekali per akun',
        tr: 'hesap başına bir kez', pl: 'raz na konto',
      }),
      highlight: false,
    },
    {
      label: 'MAX',
      value: triLang(lang, {
        ru: '120 мин / мес · 20 мин в день', uk: '120 хв / міс · 20 хв на день',
        es: '120 min/mes · 20 min al día', 'pt-BR': '120 min/mês · 20 min por dia',
        vi: '120 phút/tháng · 20 phút mỗi ngày', id: '120 mnt/bln · 20 menit per hari',
        tr: '120 dk/ay · günde 20 dk', pl: '120 min/mies. · 20 min dziennie',
      }),
      amount: triLang(lang, {
        ru: '120 мин', uk: '120 хв', es: '120 min', 'pt-BR': '120 min',
        vi: '120 phút', id: '120 mnt', tr: '120 dk', pl: '120 min',
      }),
      note: triLang(lang, {
        ru: 'в месяц · 20 мин в день', uk: 'на місяць · 20 хв на день',
        es: 'al mes · 20 min al día', 'pt-BR': 'por mês · 20 min por dia',
        vi: 'mỗi tháng · 20 phút mỗi ngày', id: 'per bulan · 20 menit per hari',
        tr: 'ayda · günde 20 dk', pl: 'miesięcznie · 20 min dziennie',
      }),
      highlight: true,
    },
  ];
}

export default function MaxPaywall() {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string | string[] }>();
  const analyticsSource = maxPaywallAnalyticsSource(params.source);
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const [maxPackage, setMaxPackage] = useState<PurchasesPackage>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'purchase' | 'restore' | 'activation' | null>(null);
  const [storeConfirmed, setStoreConfirmed] = useState(false);
  const [pendingHydrated, setPendingHydrated] = useState(false);
  const [error, setError] = useState('');
  const [offerError, setOfferError] = useState('');

  useEffect(() => {
    void trackEvent('paywall_shown', {
      context: 'max_subscription',
      source: analyticsSource,
      paywall: 'max',
    });
  }, [analyticsSource]);

  useEffect(() => {
    let active = true;
    void hasPendingMaxActivationForCurrentAccount()
      .then((pending) => { if (active) setStoreConfirmed(pending); })
      .finally(() => { if (active) setPendingHydrated(true); });
    return () => { active = false; };
  }, []);

  const loadStoreOffer = useCallback(async (isCurrent: () => boolean = () => true) => {
    setLoading(true);
    try {
      const pkg = await loadMaxSubscriptionPackage();
      if (!isCurrent()) return;
      setMaxPackage(pkg);
      if (!pkg) setOfferError(triLang(lang, {
        ru: 'Не удалось загрузить предложение магазина.', uk: 'Не вдалося завантажити пропозицію магазину.',
        es: 'No se pudo cargar la oferta de la tienda.', 'pt-BR': 'Não foi possível carregar a oferta da loja.',
        vi: 'Không thể tải ưu đãi từ cửa hàng.', id: 'Penawaran toko tidak dapat dimuat.',
        tr: 'Mağaza teklifi yüklenemedi.', pl: 'Nie udało się wczytać oferty sklepu.',
      }));
      else setOfferError('');
    } catch {
      if (isCurrent()) setOfferError(triLang(lang, {
        ru: 'Не удалось загрузить предложение магазина.', uk: 'Не вдалося завантажити пропозицію магазину.',
        es: 'No se pudo cargar la oferta de la tienda.', 'pt-BR': 'Não foi possível carregar a oferta da loja.',
        vi: 'Không thể tải ưu đãi từ cửa hàng.', id: 'Penawaran toko tidak dapat dimuat.',
        tr: 'Mağaza teklifi yüklenemedi.', pl: 'Nie udało się wczytać oferty sklepu.',
      }));
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    let active = true;
    void loadStoreOffer(() => active);
    return () => { active = false; };
  }, [loadStoreOffer]);

  const retryStoreOffer = () => {
    if (busy) return;
    setOfferError('');
    void loadStoreOffer();
  };

  const finish = () => {
    emitAppEvent('premium_activated');
    finishMaxPaywallNavigation(params.source, router);
  };

  const confirmActivation = async (): Promise<boolean> => {
    setStoreConfirmed(true);
    setBusy('activation');
    setError(triLang(lang, {
      ru: 'Магазин принял покупку. Проверяем активацию MAX…', uk: 'Магазин прийняв покупку. Перевіряємо активацію MAX…',
      es: 'La tienda recibió la compra. Comprobando MAX…', 'pt-BR': 'A loja recebeu a compra. Verificando o MAX…',
      vi: 'Cửa hàng đã nhận giao dịch. Đang kiểm tra MAX…', id: 'Toko menerima pembelian. Memeriksa MAX…',
      tr: 'Mağaza satın almayı aldı. MAX kontrol ediliyor…', pl: 'Sklep przyjął zakup. Sprawdzamy MAX…',
    }));
    const active = await confirmMaxSubscriptionActivation();
    if (active) {
      finish();
      return true;
    }
    setError(triLang(lang, {
      ru: 'Покупка ещё обрабатывается. Нажми «Проверить активацию» позже.',
      uk: 'Покупка ще обробляється. Натисни «Перевірити активацію» пізніше.',
      es: 'La compra aún se está procesando. Comprueba la activación más tarde.',
      'pt-BR': 'A compra ainda está sendo processada. Verifique a ativação mais tarde.',
      vi: 'Giao dịch vẫn đang được xử lý. Hãy kiểm tra lại sau.',
      id: 'Pembelian masih diproses. Periksa lagi nanti.',
      tr: 'Satın alma hâlâ işleniyor. Daha sonra tekrar kontrol et.',
      pl: 'Zakup jest nadal przetwarzany. Sprawdź ponownie później.',
    }));
    return false;
  };

  const restoreDisabled = isMaxPaywallRestoreDisabled({
    pendingHydrated,
    storeConfirmed,
    busy: busy !== null,
  });

  const buy = async () => {
    const primaryDisabled = isMaxPaywallPrimaryActionDisabled({
      loading,
      pendingHydrated,
      storeConfirmed,
      hasPackage: !!maxPackage,
      busy: busy !== null,
    });
    if (primaryDisabled) return;
    const analyticsProps = {
      context: 'max_subscription',
      source: analyticsSource,
      plan: 'max_monthly',
      paywall: 'max',
    } as const;
    void trackEvent('paywall_cta_click', {
      ...analyticsProps,
      action: storeConfirmed ? 'activation' : 'purchase',
    });
    if (!storeConfirmed) {
      void trackEvent('purchase_started', {
        ...analyticsProps,
        product_id: maxPackage?.product.identifier,
      });
    }
    setBusy(storeConfirmed ? 'activation' : 'purchase');
    setError('');
    try {
      const outcome = await runMaxPaywallPrimaryAction(storeConfirmed, {
        purchase: purchaseMaxSubscription,
        confirm: confirmActivation,
      });
      if (outcome.storeConfirmed) setStoreConfirmed(true);
      if (!outcome.purchaseResult || outcome.storeConfirmed) return;
      const result = outcome.purchaseResult;
      setError(result.status === 'pending'
        ? triLang(lang, {
          ru: 'Платёж ожидает подтверждения. MAX включится автоматически.', uk: 'Платіж очікує підтвердження. MAX увімкнеться автоматично.',
          es: 'El pago está pendiente. MAX se activará automáticamente.', 'pt-BR': 'O pagamento está pendente. O MAX será ativado automaticamente.',
          vi: 'Thanh toán đang chờ xác nhận. MAX sẽ tự động được bật.', id: 'Pembayaran sedang diproses. MAX akan aktif otomatis.',
          tr: 'Ödeme onay bekliyor. MAX otomatik açılacak.', pl: 'Płatność czeka na potwierdzenie. MAX włączy się automatycznie.',
        })
        : triLang(lang, {
          ru: 'Покупка MAX сейчас недоступна. Попробуй позже.', uk: 'Покупка MAX зараз недоступна. Спробуй пізніше.',
          es: 'La compra de MAX no está disponible ahora. Inténtalo más tarde.', 'pt-BR': 'A compra do MAX não está disponível agora. Tente mais tarde.',
          vi: 'Hiện chưa thể mua MAX. Hãy thử lại sau.', id: 'Pembelian MAX saat ini tidak tersedia. Coba lagi nanti.',
          tr: 'MAX satın alma şu anda kullanılamıyor. Daha sonra tekrar dene.', pl: 'Zakup MAX jest teraz niedostępny. Spróbuj później.',
        }));
    } catch (purchaseError) {
      if (!(purchaseError as { userCancelled?: boolean })?.userCancelled) {
        setError(triLang(lang, {
          ru: 'Не удалось подтвердить статус покупки. Проверь активацию или восстанови покупку.',
          uk: 'Не вдалося підтвердити статус покупки. Перевір активацію або віднови покупку.',
          es: 'No se pudo confirmar el estado de la compra. Comprueba la activación o restaura la compra.',
          'pt-BR': 'Não foi possível confirmar o status da compra. Verifique a ativação ou restaure a compra.',
          vi: 'Không thể xác nhận trạng thái giao dịch. Hãy kiểm tra kích hoạt hoặc khôi phục giao dịch.',
          id: 'Status pembelian tidak dapat dikonfirmasi. Periksa aktivasi atau pulihkan pembelian.',
          tr: 'Satın alma durumu doğrulanamadı. Etkinleştirmeyi kontrol et veya satın almayı geri yükle.',
          pl: 'Nie udało się potwierdzić statusu zakupu. Sprawdź aktywację lub przywróć zakup.',
        }));
      }
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    if (restoreDisabled) return;
    setBusy('restore');
    setError('');
    try {
      const result = await restoreMaxSubscription();
      if (result.status === 'restored') {
        void trackEvent('subscription_restored', {
          context: 'max_subscription',
          source: analyticsSource,
          plan: 'max_monthly',
          paywall: 'max',
        });
        await confirmActivation();
        return;
      }
      setError(triLang(lang, {
        ru: 'Активная подписка MAX не найдена.', uk: 'Активну підписку MAX не знайдено.',
        es: 'No se encontró una suscripción MAX activa.', 'pt-BR': 'Nenhuma assinatura MAX ativa foi encontrada.',
        vi: 'Không tìm thấy gói MAX đang hoạt động.', id: 'Langganan MAX aktif tidak ditemukan.',
        tr: 'Etkin MAX aboneliği bulunamadı.', pl: 'Nie znaleziono aktywnej subskrypcji MAX.',
      }));
    } catch {
      setError(triLang(lang, {
        ru: 'Не удалось восстановить покупку.', uk: 'Не вдалося відновити покупку.',
        es: 'No se pudo restaurar la compra.', 'pt-BR': 'Não foi possível restaurar a compra.',
        vi: 'Không thể khôi phục giao dịch.', id: 'Pembelian tidak dapat dipulihkan.',
        tr: 'Satın alma geri yüklenemedi.', pl: 'Nie udało się przywrócić zakupu.',
      }));
    } finally {
      setBusy(null);
    }
  };

  const price = maxPackage?.product.priceString ?? '';
  const primaryDisabled = isMaxPaywallPrimaryActionDisabled({
    loading,
    pendingHydrated,
    storeConfirmed,
    hasPackage: !!maxPackage,
    busy: busy !== null,
  });
  const primarySpinner = shouldShowMaxPaywallPrimarySpinner({
    loading,
    pendingHydrated,
    storeConfirmed,
    busy: busy !== null,
  });
  const visibleError = error || (!storeConfirmed ? offerError : '');
  const orbLayers = getMaxHomeOrbLayers(themeMode);
  const features = featureCopy(lang as Lang);
  const rows = minutesRows(lang as Lang);
  const accentSoft = `${t.accent}24`;
  // Плитка бесплатного тира: подложка тоном, без обводки (запрет владельца).
  const neutralSoft = `${t.textPrimary}0F`;

  return (
    <ScreenGradient>
      <SafeAreaView testID="max-paywall-screen" style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 12, paddingTop: 4 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, {
              ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij',
            })}
            onPress={() => safeRouterBack(router)}
            hitSlop={10}
            style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bgSurface2 }}
          >
            <Ionicons name="close" size={22} color={t.textPrimary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 14 }} showsVerticalScrollIndicator={false}>
          <PaywallEntrance index={0}>
            <View style={{ alignItems: 'center', paddingTop: 4 }}>
              <MaxHomeOrb layers={orbLayers} size={92} ownerVisible />
              <Text
                style={{ color: t.textPrimary, fontSize: f.h1, fontWeight: '900', textAlign: 'center', marginTop: 16, lineHeight: f.h1 * 1.16 }}
                maxFontSizeMultiplier={2}
              >
                {triLang(lang, {
                  ru: 'Разговаривай с ИИ-учителем MAX', uk: 'Розмовляй з ШІ-вчителем MAX', es: 'Habla con MAX, tu profesor de IA',
                  'pt-BR': 'Fale com o MAX, seu professor de IA', vi: 'Trò chuyện với gia sư AI MAX', id: 'Ngobrol dengan guru AI MAX',
                  tr: 'Yapay zekâ öğretmenin MAX ile konuş', pl: 'Rozmawiaj z nauczycielem AI MAX',
                })}
              </Text>
              <Text style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '600', textAlign: 'center', marginTop: 10, lineHeight: f.sub * 1.45 }} maxFontSizeMultiplier={2}>
                {triLang(lang, {
                  ru: 'Искусственный интеллект понимает твою речь голосом, ловит ошибки и объясняет их сразу',
                  uk: 'Штучний інтелект розуміє твоє мовлення голосом, ловить помилки і одразу пояснює їх',
                  es: 'La inteligencia artificial entiende lo que dices, detecta errores y los explica al instante',
                  'pt-BR': 'A inteligência artificial entende sua fala, identifica erros e os explica na hora',
                  vi: 'Trí tuệ nhân tạo nghe hiểu lời nói của bạn, phát hiện lỗi và giải thích ngay',
                  id: 'Kecerdasan buatan memahami ucapanmu, menangkap kesalahan, dan langsung menjelaskannya',
                  tr: 'Yapay zekâ konuşmanı sesli olarak anlar, hataları yakalar ve hemen açıklar',
                  pl: 'Sztuczna inteligencja rozumie twoją mowę, wyłapuje błędy i od razu je tłumaczy',
                })}
              </Text>
            </View>
          </PaywallEntrance>

          <View style={{ gap: 12, marginTop: 10 }}>
            {features.map((title, i) => (
              <PaywallEntrance key={title} index={i + 1}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: t.bgSurface2, borderRadius: 22, padding: 16 }}>
                  <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={FEATURE_ICONS[i]} size={24} color={t.accent} />
                  </View>
                  <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.sub, fontWeight: '800', lineHeight: f.sub * 1.28 }} maxFontSizeMultiplier={2}>
                    {title}
                  </Text>
                </View>
              </PaywallEntrance>
            ))}
          </View>

          <PaywallEntrance index={4}>
            <View style={{ backgroundColor: t.bgSurface2, borderRadius: 22, padding: 18, marginTop: 10 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '800', marginBottom: 14 }} maxFontSizeMultiplier={2}>
                {triLang(lang, {
                  ru: 'Лимиты голосовых звонков', uk: 'Ліміти голосових дзвінків', es: 'Límites de llamadas de voz',
                  'pt-BR': 'Limites de chamadas de voz', vi: 'Giới hạn cuộc gọi thoại', id: 'Batas panggilan suara',
                  tr: 'Sesli arama limitleri', pl: 'Limity rozmów głosowych',
                })}
              </Text>
              {/* зачем: вариант D владельца — тиры не строками таблицы, а двумя
                  плитками рядом. Прошлая табличная вёрстка на длинных языках
                  (vi/tr/pl) рвала значение на две строки с рваным краем, а до
                  того тексты и вовсе наезжали друг на друга. В плитках число
                  ведёт, условие тише под ним, MAX выделен тоном — выигрыш виден
                  без чтения. Колонки равной ширины (flex 1), высота выравнивается
                  общей строкой заголовка. */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {rows.map((row) => (
                  <View
                    key={row.label}
                    accessibilityLabel={`${row.label}: ${row.value}`}
                    style={{
                      flex: 1,
                      backgroundColor: row.highlight ? accentSoft : neutralSoft,
                      borderRadius: 16,
                      padding: 14,
                    }}
                  >
                    <Text
                      style={{ fontSize: f.sub, fontWeight: row.highlight ? '900' : '800', color: row.highlight ? t.textPrimary : t.textSecond, lineHeight: f.sub * 1.28, minHeight: f.sub * 1.28 * 2 }}
                      maxFontSizeMultiplier={2}
                    >
                      {row.label}
                    </Text>
                    {/* зачем: на плитке MAX текст красим textPrimary, а НЕ accent.
                        Замер по 4 темам: акцент на своей же полупрозрачной подложке даёт
                        2.98 («небо») и 4.05 («роза») — ниже порогов 3:1 (крупное) и
                        4.5:1 (обычное). Выделяет плитку сама подложка accentSoft. */}
                    <Text
                      style={{ fontSize: f.numMd + 2, fontWeight: '900', color: t.textPrimary, lineHeight: (f.numMd + 2) * 1.06, marginTop: 8, fontVariant: ['tabular-nums'] }}
                      maxFontSizeMultiplier={1.4}
                    >
                      {row.amount}
                    </Text>
                    <Text
                      style={{ fontSize: f.sub, fontWeight: '700', color: t.textSecond, lineHeight: f.sub * 1.3, marginTop: 5 }}
                      maxFontSizeMultiplier={2}
                    >
                      {row.note}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </PaywallEntrance>

          <PaywallEntrance index={5}>
            <View style={{ backgroundColor: accentSoft, borderRadius: 24, padding: 20, marginTop: 10 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '900' }} maxFontSizeMultiplier={2}>
                {triLang(lang, { ru: 'Подписка MAX', uk: 'Підписка MAX', es: 'Suscripción MAX', 'pt-BR': 'Assinatura MAX', vi: 'Gói MAX', id: 'Langganan MAX', tr: 'MAX aboneliği', pl: 'Subskrypcja MAX' })}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7, marginTop: 12 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.numLg + 6, fontWeight: '900', fontVariant: ['tabular-nums'] }} maxFontSizeMultiplier={1.4}>
                  {price || triLang(lang, {
                    ru: 'Цена временно недоступна', uk: 'Ціна тимчасово недоступна', es: 'Precio no disponible temporalmente',
                    'pt-BR': 'Preço temporariamente indisponível', vi: 'Giá tạm thời không khả dụng', id: 'Harga sementara tidak tersedia',
                    tr: 'Fiyat geçici olarak kullanılamıyor', pl: 'Cena jest chwilowo niedostępna',
                  })}
                </Text>
                {price ? (
                  <Text style={{ color: t.textSecond, fontSize: f.body, fontWeight: '700' }} maxFontSizeMultiplier={2}>
                    {triLang(lang, { ru: '/ мес', uk: '/ міс', es: '/ mes', 'pt-BR': '/ mês', vi: '/ tháng', id: '/ bln', tr: '/ ay', pl: '/ mies.' })}
                  </Text>
                ) : null}
              </View>
              <Text style={{ color: t.textSecond, fontSize: f.body, fontWeight: '700', marginTop: 6 }} maxFontSizeMultiplier={2}>
                {triLang(lang, {
                  ru: 'Включает всё из Плюс + 120 минут MAX', uk: 'Включає все з Плюс + 120 хвилин MAX', es: 'Incluye todo Plus + 120 min de MAX',
                  'pt-BR': 'Inclui tudo do Plus + 120 min de MAX', vi: 'Bao gồm mọi thứ của Plus + 120 phút MAX', id: 'Termasuk semua fitur Plus + 120 menit MAX',
                  tr: 'Tüm Plus özellikleri + 120 dk MAX içerir', pl: 'Zawiera wszystko z Plus + 120 min MAX',
                })}
              </Text>
            </View>
          </PaywallEntrance>

          {visibleError ? (
            <Text accessibilityLiveRegion="polite" style={{ color: t.wrong, textAlign: 'center', fontSize: f.body, fontWeight: '700', marginTop: 4 }} maxFontSizeMultiplier={2}>
              {visibleError}
            </Text>
          ) : null}

          <PaywallEntrance index={6} style={{ marginTop: 6 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: primaryDisabled, busy: busy !== null }}
              disabled={primaryDisabled}
              onPress={buy}
              style={{ minHeight: 60, borderRadius: 28, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center', opacity: primaryDisabled ? 0.55 : 1 }}
            >
              {primarySpinner ? <ActivityIndicator color={t.correctText} /> : (
                <Text style={{ color: t.correctText, fontSize: f.bodyLg, fontWeight: '900' }} maxFontSizeMultiplier={2}>
                  {storeConfirmed
                    ? triLang(lang, { ru: 'Проверить активацию', uk: 'Перевірити активацію', es: 'Comprobar activación', 'pt-BR': 'Verificar ativação', vi: 'Kiểm tra kích hoạt', id: 'Periksa aktivasi', tr: 'Etkinleştirmeyi kontrol et', pl: 'Sprawdź aktywację' })
                    : triLang(lang, { ru: 'Подключить MAX', uk: 'Підключити MAX', es: 'Activar MAX', 'pt-BR': 'Ativar MAX', vi: 'Đăng ký MAX', id: 'Aktifkan MAX', tr: 'MAX’i etkinleştir', pl: 'Włącz MAX' })}
                </Text>
              )}
            </Pressable>
            {!loading && !maxPackage && !storeConfirmed ? (
              <Pressable
                accessibilityRole="button"
                onPress={retryStoreOffer}
                disabled={busy !== null}
                style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}
              >
                <Text style={{ color: t.accent, fontSize: f.body, fontWeight: '800' }} maxFontSizeMultiplier={2}>
                  {triLang(lang, {
                    ru: 'Повторить загрузку цены', uk: 'Повторити завантаження ціни', es: 'Volver a cargar el precio',
                    'pt-BR': 'Recarregar o preço', vi: 'Tải lại giá', id: 'Muat ulang harga',
                    tr: 'Fiyatı yeniden yükle', pl: 'Wczytaj cenę ponownie',
                  })}
                </Text>
              </Pressable>
            ) : null}
            <Text style={{ color: t.textMuted, fontSize: f.label, textAlign: 'center', marginTop: 10, lineHeight: f.label * 1.4 }} maxFontSizeMultiplier={2}>
                {price ? triLang(lang, {
                  ru: `${price} / мес · без пробного периода · отмена в любой момент`, uk: `${price} / міс · без пробного періоду · скасування будь-коли`,
                es: `${price} / mes · sin prueba · cancela cuando quieras`, 'pt-BR': `${price} / mês · sem teste · cancele quando quiser`,
                vi: `${price} / tháng · không dùng thử · hủy bất cứ lúc nào`, id: `${price} / bln · tanpa uji coba · batalkan kapan saja`,
                tr: `${price} / ay · deneme yok · istediğin an iptal et`, pl: `${price} / mies. · bez okresu próbnego · anuluj w każdej chwili`,
                }) : triLang(lang, {
                  ru: 'Цена будет показана магазином до подтверждения покупки.', uk: 'Магазин покаже ціну до підтвердження покупки.',
                  es: 'La tienda mostrará el precio antes de confirmar la compra.', 'pt-BR': 'A loja mostrará o preço antes da confirmação da compra.',
                  vi: 'Cửa hàng sẽ hiển thị giá trước khi xác nhận giao dịch.', id: 'Toko akan menampilkan harga sebelum pembelian dikonfirmasi.',
                  tr: 'Satın alma onaylanmadan önce mağaza fiyatı gösterecek.', pl: 'Sklep pokaże cenę przed potwierdzeniem zakupu.',
                })}
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 18, marginTop: 16 }}>
                <Pressable
                  onPress={restore}
                  disabled={restoreDisabled}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: restoreDisabled, busy: busy === 'restore' }}
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <Text style={{ color: t.textMuted, fontWeight: '700', fontSize: f.label }} maxFontSizeMultiplier={2}>
                  {triLang(lang, { ru: 'Восстановить', uk: 'Відновити', es: 'Restaurar', 'pt-BR': 'Restaurar', vi: 'Khôi phục', id: 'Pulihkan', tr: 'Geri yükle', pl: 'Przywróć' })}
                </Text>
              </Pressable>
              <Pressable onPress={() => Linking.openURL('https://phraseman.app/terms').catch(() => {})} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ color: t.textMuted, fontSize: f.label }} maxFontSizeMultiplier={2}>
                  {triLang(lang, { ru: 'Условия', uk: 'Умови', es: 'Términos', 'pt-BR': 'Termos', vi: 'Điều khoản', id: 'Ketentuan', tr: 'Koşullar', pl: 'Warunki' })}
                </Text>
              </Pressable>
              <Pressable onPress={() => Linking.openURL('https://phraseman.app/privacy').catch(() => {})} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ color: t.textMuted, fontSize: f.label }} maxFontSizeMultiplier={2}>
                  {triLang(lang, { ru: 'Конфиденциальность', uk: 'Конфіденційність', es: 'Privacidad', 'pt-BR': 'Privacidade', vi: 'Quyền riêng tư', id: 'Privasi', tr: 'Gizlilik', pl: 'Prywatność' })}
                </Text>
              </Pressable>
            </View>
          </PaywallEntrance>
        </ScrollView>
      </SafeAreaView>
    </ScreenGradient>
  );
}
