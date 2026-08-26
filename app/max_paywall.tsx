import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PurchasesPackage } from 'react-native-purchases';

import ScreenGradient from '../components/ScreenGradient';
import MaxHomeOrb from '../components/home/MaxHomeOrb';
import { PaywallCtaShine, PaywallEntrance } from '../components/paywall/PaywallMotion';
import { isShortScreen } from '../constants/layout-scale';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
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
//
// зачем (владелец, 2026-08-24): «пейвол MAX — чтобы не было скролла, всё видно
// в самом верху, как пейвол на онбординге». Прошлая вёрстка складывала шесть
// блоков в ScrollView, и цена с кнопкой жили ниже сгиба — человек принимал
// решение о покупке, не видя цены. Теперь макет повторяет ScreenFrame
// онбординга (components/CleanOnboarding.tsx):
//   • экран — flex-колонка: шапка → контент → закреплённый футер;
//     ВАЖНО (исправлено 2026-08-24 по скриншоту владельца): контент — не View
//     с flex:1, а ScrollView с flexGrow:1. Голый flex:1 в RN включает и
//     flexShrink:1 — контейнер сжимался ниже своего содержимого, дети
//     вылезали за его границы, и футер с ценой рисовался ПОВЕРХ плиток
//     лимитов («$22.99 / мес» поверх «3 мин / 120 мин»). Пока контент влезает,
//     скролла не видно и ощущение «всё в самом верху» сохраняется; когда не
//     влезает — прокрутка честнее наложения. Возвращать сюда View с flex:1
//     нельзя: это ровно тот баг;
//   • футер (цена + CTA + сноска + ссылки) закреплён у нижнего края и виден
//     всегда, как в онбординге, где кнопка никогда не уезжает за сгиб;
//   • контент ужимается под высоту: SHORT (<700pt, iPhone SE/8) отдаёт
//     компактный ритм отступов, обычный — просторный;
//   • блок лимитов свёрнут из карточки с двумя плитками в одну строку
//     «3 мин бесплатно / 120 мин в MAX» — цифры остались крупными и честными,
//     но перестали занимать четверть экрана.
// Три контейнера фич владелец попросил сохранить — они и остались тремя
// контейнерами, просто с медальоном 44 и без лишнего внутреннего воздуха.

const FEATURE_ICONS = ['mic', 'create', 'compass'] as const;

function featureCopy(lang: Lang) {
  return [
    triLang(lang, {
      ru: 'Настоящий голосовой диалог', en: 'Real voice conversation', uk: 'Справжній голосовий діалог', es: 'Diálogo de voz real',
      'pt-BR': 'Diálogo de voz real', vi: 'Hội thoại giọng nói thực sự', id: 'Dialog suara nyata',
      tr: 'Gerçek sesli diyalog', pl: 'Prawdziwy dialog głosowy',
    }),
    triLang(lang, {
      ru: 'Разбор ошибок после звонка', en: 'Error breakdown after the call', uk: 'Розбір помилок після дзвінка', es: 'Análisis de errores tras la llamada',
      'pt-BR': 'Análise de erros após a ligação', vi: 'Phân tích lỗi sau cuộc gọi', id: 'Ulasan kesalahan setelah panggilan',
      tr: 'Aramadan sonra hata analizi', pl: 'Analiza błędów po rozmowie',
    }),
    triLang(lang, {
      ru: 'Помнит твой прогресс', en: 'Remembers your progress', uk: 'Пам’ятає твій прогрес', es: 'Recuerda tu progreso',
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
        ru: 'Бесплатно / Плюс / Про', en: 'Free / Plus / Pro', uk: 'Безкоштовно / Плюс / Про', es: 'Gratis / Plus / Pro',
        'pt-BR': 'Grátis / Plus / Pro', vi: 'Miễn phí / Plus / Pro', id: 'Gratis / Plus / Pro',
        tr: 'Ücretsiz / Plus / Pro', pl: 'Bezpłatnie / Plus / Pro',
      }),
      value: triLang(lang, {
        ru: '3 мин · один раз на аккаунт', en: '3 min · once per account', uk: '3 хв · один раз на акаунт', es: '3 min · una vez por cuenta',
        'pt-BR': '3 min · uma vez por conta', vi: '3 phút · một lần cho mỗi tài khoản', id: '3 mnt · sekali per akun',
        tr: '3 dk · hesap başına bir kez', pl: '3 min · raz na konto',
      }),
      amount: triLang(lang, {
        ru: '3 мин', en: '3 min', uk: '3 хв', es: '3 min', 'pt-BR': '3 min',
        vi: '3 phút', id: '3 mnt', tr: '3 dk', pl: '3 min',
      }),
      note: triLang(lang, {
        ru: 'один раз на аккаунт', en: 'once per account', uk: 'один раз на акаунт', es: 'una vez por cuenta',
        'pt-BR': 'uma vez por conta', vi: 'một lần cho mỗi tài khoản', id: 'sekali per akun',
        tr: 'hesap başına bir kez', pl: 'raz na konto',
      }),
      highlight: false,
    },
    {
      label: 'MAX',
      value: triLang(lang, {
        ru: '120 мин / мес · 20 мин в день', en: '120 min / mo · 20 min a day', uk: '120 хв / міс · 20 хв на день',
        es: '120 min/mes · 20 min al día', 'pt-BR': '120 min/mês · 20 min por dia',
        vi: '120 phút/tháng · 20 phút mỗi ngày', id: '120 mnt/bln · 20 menit per hari',
        tr: '120 dk/ay · günde 20 dk', pl: '120 min/mies. · 20 min dziennie',
      }),
      amount: triLang(lang, {
        ru: '120 мин', en: '120 min', uk: '120 хв', es: '120 min', 'pt-BR': '120 min',
        vi: '120 phút', id: '120 mnt', tr: '120 dk', pl: '120 min',
      }),
      note: triLang(lang, {
        ru: 'в месяц · 20 мин в день', en: 'per month · 20 min a day', uk: 'на місяць · 20 хв на день',
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
        ru: 'Не удалось загрузить предложение магазина.', en: 'Couldn\'t load the store offer.', uk: 'Не вдалося завантажити пропозицію магазину.',
        es: 'No se pudo cargar la oferta de la tienda.', 'pt-BR': 'Não foi possível carregar a oferta da loja.',
        vi: 'Không thể tải ưu đãi từ cửa hàng.', id: 'Penawaran toko tidak dapat dimuat.',
        tr: 'Mağaza teklifi yüklenemedi.', pl: 'Nie udało się wczytać oferty sklepu.',
      }));
      else setOfferError('');
    } catch {
      if (isCurrent()) setOfferError(triLang(lang, {
        ru: 'Не удалось загрузить предложение магазина.', en: 'Couldn\'t load the store offer.', uk: 'Не вдалося завантажити пропозицію магазину.',
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
      // зачем (аудит по Библии, 2026-08-26): «покупка» — запрещённое слово
      // словаря (→ оплата), а «проверяем активацию» звучало как техпроцесс.
      ru: 'Оплата принята. Открываем MAX…', en: 'Payment accepted. Opening MAX…', uk: 'Оплату прийнято. Відкриваємо MAX…',
      es: 'Pago recibido. Abriendo MAX…', 'pt-BR': 'Pagamento recebido. Abrindo o MAX…',
      vi: 'Đã nhận thanh toán. Đang mở MAX…', id: 'Pembayaran diterima. Membuka MAX…',
      tr: 'Ödeme alındı. MAX açılıyor…', pl: 'Płatność przyjęta. Otwieramy MAX…',
    }));
    const active = await confirmMaxSubscriptionActivation();
    if (active) {
      finish();
      return true;
    }
    setError(triLang(lang, {
      ru: 'Покупка ещё обрабатывается. Нажми «Проверить активацию» позже.', en: 'The purchase is still processing. Tap "Check activation" later.',
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
          ru: 'Платёж ожидает подтверждения. MAX включится автоматически.', en: 'Payment is pending confirmation. MAX will turn on automatically.', uk: 'Платіж очікує підтвердження. MAX увімкнеться автоматично.',
          es: 'El pago está pendiente. MAX se activará automáticamente.', 'pt-BR': 'O pagamento está pendente. O MAX será ativado automaticamente.',
          vi: 'Thanh toán đang chờ xác nhận. MAX sẽ tự động được bật.', id: 'Pembayaran sedang diproses. MAX akan aktif otomatis.',
          tr: 'Ödeme onay bekliyor. MAX otomatik açılacak.', pl: 'Płatność czeka na potwierdzenie. MAX włączy się automatycznie.',
        })
        : triLang(lang, {
          ru: 'MAX сейчас не открыть. Попробуй позже.', en: 'MAX purchase isn\'t available right now. Try again later.', uk: 'MAX зараз не відкрити. Спробуй пізніше.',
          es: 'MAX no se puede abrir ahora. Inténtalo más tarde.', 'pt-BR': 'Não dá para abrir o MAX agora. Tente mais tarde.',
          vi: 'Hiện chưa mở được MAX. Hãy thử lại sau.', id: 'MAX belum bisa dibuka sekarang. Coba lagi nanti.',
          tr: 'MAX şu anda açılamıyor. Daha sonra tekrar dene.', pl: 'MAX nie da się teraz otworzyć. Spróbuj później.',
        }));
    } catch (purchaseError) {
      if (!(purchaseError as { userCancelled?: boolean })?.userCancelled) {
        setError(triLang(lang, {
          ru: 'Не удалось подтвердить статус покупки. Проверь активацию или восстанови покупку.', en: 'Couldn\'t confirm the purchase status. Check activation or restore the purchase.',
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
        ru: 'Активная подписка MAX не найдена.', en: 'No active MAX subscription found.', uk: 'Активну підписку MAX не знайдено.',
        es: 'No se encontró una suscripción MAX activa.', 'pt-BR': 'Nenhuma assinatura MAX ativa foi encontrada.',
        vi: 'Không tìm thấy gói MAX đang hoạt động.', id: 'Langganan MAX aktif tidak ditemukan.',
        tr: 'Etkin MAX aboneliği bulunamadı.', pl: 'Nie znaleziono aktywnej subskrypcji MAX.',
      }));
    } catch {
      setError(triLang(lang, {
        ru: 'Не удалось восстановить покупку.', en: 'Couldn\'t restore the purchase.', uk: 'Не вдалося відновити покупку.',
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
  // зачем: экран стремится поместиться в высоту без прокрутки. Низкий экран
  // (iPhone SE/8, <700pt) получает сжатый вертикальный ритм — тот же приём, что
  // в онбординге (isShortScreen), где кнопка никогда не уезжает за сгиб.
  // Кегли НЕ трогаем: ужимаем только воздух, иначе нарушим правило «всё крупное».
  const { height: windowHeight } = useWindowDimensions();
  const shortScreen = isShortScreen(windowHeight);
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  // зачем: замер высоты на iPhone SE (667pt) показал переполнение на ~45pt при
  // орбе 72. Сжатый ритм ниже нужен, чтобы прокрутка на таких экранах вообще
  // не понадобилась. На низком экране орб уходит в 56 и ритм сжимается до
  // минимума; на обычном телефоне (≥700pt) всё остаётся просторным.
  const gap = shortScreen ? 6 : 12;
  const orbSize = shortScreen ? 56 : 92;
  const freeRow = rows[0];
  const maxRow = rows[1];

  return (
    <ScreenGradient>
      <SafeAreaView testID="max-paywall-screen" style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 12, paddingTop: 4 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, {
              ru: 'Закрыть', en: 'Close', uk: 'Закрити', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij',
            })}
            onPress={() => safeRouterBack(router)}
            hitSlop={10}
            style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bgSurface2 }}
          >
            <Ionicons name="close" size={22} color={t.textPrimary} />
          </Pressable>
        </View>

        {/* зачем: контент занимает ровно оставшуюся высоту и НЕ скроллится —
            владелец 2026-08-24: «чтобы не было скролла, всё видно в самом
            верху». justifyContent center выравнивает блок по остатку места:
            на высоком экране появляется воздух сверху и снизу, на низком —
            блок прижимается без обрезки. */}
        {/* зачем (2026-08-24, баг владельца «цена налезла на плитки лимитов»):
            раньше здесь был View с flex:1 — а flex:1 в RN означает и
            flexShrink:1, поэтому при нехватке высоты контейнер сжимался НИЖЕ
            своего содержимого. Дети не ужимаются вместе с ним: они вылезали
            наружу, и закреплённый футер с ценой рисовался ПОВЕРХ плиток
            «3 мин / 120 мин». Скриншот с наложением $22.99 — ровно этот случай.

            Теперь тот же блок — ScrollView: пока контент влезает, он ведёт себя
            как прежде (flexGrow:1 + justifyContent:'center' держат центрирование
            и воздух сверху/снизу, полоса прокрутки не появляется), а когда не
            влезает — честно прокручивается вместо наложения. Правило владельца
            «цена и кнопка всегда на виду» не нарушено: футер остаётся отдельным
            закреплённым сиблингом ниже и никогда не уезжает за сгиб. */}
        <ScrollView decelerationRate="fast"
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, justifyContent: 'center', gap }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <PaywallEntrance index={0}>
            <View style={{ alignItems: 'center' }}>
              <MaxHomeOrb layers={orbLayers} size={orbSize} ownerVisible />
              <Text
                style={{ color: t.textPrimary, fontSize: f.h1, fontWeight: '900', textAlign: 'center', marginTop: shortScreen ? 10 : 16, lineHeight: f.h1 * 1.16 }}
                maxFontSizeMultiplier={2}
              >
                {triLang(lang, {
                  ru: 'Разговаривай с ИИ-учителем MAX', en: 'Talk with MAX, your AI teacher', uk: 'Розмовляй з ШІ-вчителем MAX', es: 'Habla con MAX, tu profesor de IA',
                  'pt-BR': 'Fale com o MAX, seu professor de IA', vi: 'Trò chuyện với gia sư AI MAX', id: 'Ngobrol dengan guru AI MAX',
                  tr: 'Yapay zekâ öğretmenin MAX ile konuş', pl: 'Rozmawiaj z nauczycielem AI MAX',
                })}
              </Text>
              {/* зачем: длинный абзац-описание занимал три строки и выталкивал
                  цену за сгиб. На низком экране он скрыт — заголовок и три
                  контейнера фич говорят то же самое, но короче. */}
              {shortScreen ? null : (
                <Text style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '600', textAlign: 'center', marginTop: 8, lineHeight: f.sub * 1.4 }} maxFontSizeMultiplier={2}>
                  {triLang(lang, {
                    ru: 'Искусственный интеллект понимает твою речь голосом, ловит ошибки и объясняет их сразу', en: 'Artificial intelligence understands your speech, catches mistakes, and explains them right away',
                    uk: 'Штучний інтелект розуміє твоє мовлення голосом, ловить помилки і одразу пояснює їх',
                    es: 'La inteligencia artificial entiende lo que dices, detecta errores y los explica al instante',
                    'pt-BR': 'A inteligência artificial entende sua fala, identifica erros e os explica na hora',
                    vi: 'Trí tuệ nhân tạo nghe hiểu lời nói của bạn, phát hiện lỗi và giải thích ngay',
                    id: 'Kecerdasan buatan memahami ucapanmu, menangkap kesalahan, dan langsung menjelaskannya',
                    tr: 'Yapay zekâ konuşmanı sesli olarak anlar, hataları yakalar ve hemen açıklar',
                    pl: 'Sztuczna inteligencja rozumie twoją mowę, wyłapuje błędy i od razu je tłumaczy',
                  })}
                </Text>
              )}
            </View>
          </PaywallEntrance>

          {/* Три контейнера фич — владелец попросил сохранить именно контейнеры.
              Ужат только внутренний воздух: медальон 44 вместо 52, padding 12. */}
          <View style={{ gap: shortScreen ? 6 : 8 }}>
            {features.map((title, i) => (
              <PaywallEntrance key={title} index={i + 1}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.bgSurface2, borderRadius: 18, paddingVertical: shortScreen ? 7 : 12, paddingHorizontal: shortScreen ? 12 : 14 }}>
                  <View style={{ width: shortScreen ? 38 : 44, height: shortScreen ? 38 : 44, borderRadius: shortScreen ? 13 : 15, backgroundColor: accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={FEATURE_ICONS[i]} size={shortScreen ? 20 : 22} color={t.accent} />
                  </View>
                  <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.sub, fontWeight: '800', lineHeight: f.sub * 1.28 }} maxFontSizeMultiplier={2}>
                    {title}
                  </Text>
                </View>
              </PaywallEntrance>
            ))}
          </View>

          {/* зачем: прежде лимиты были карточкой с заголовком и двумя плитками —
              четверть экрана ради двух чисел. Свёрнуто в одну строку: слева
              бесплатный тир, справа MAX на акцентной подложке. Числа остались
              крупными (numMd) и честными — контрактные тесты сторожат полные
              формулировки, они живут в accessibilityLabel. */}
          <PaywallEntrance index={4}>
            {/* зачем: заголовок обязателен — без него два числа висят без
                объяснения, что это минуты звонка (и контракт
                max_release_blockers сторожит именно эту строку). Держим его
                тише плиток: это подпись к паре, а не отдельный раздел. */}
            <Text style={{ color: t.textSecond, fontSize: f.label, fontWeight: '800', marginBottom: 6 }} maxFontSizeMultiplier={2}>
              {triLang(lang, {
                ru: 'Лимиты голосовых звонков', en: 'Voice call limits', uk: 'Ліміти голосових дзвінків', es: 'Límites de llamadas de voz',
                'pt-BR': 'Limites de chamadas de voz', vi: 'Giới hạn cuộc gọi thoại', id: 'Batas panggilan suara',
                tr: 'Sesli arama limitleri', pl: 'Limity rozmów głosowych',
              })}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'stretch' }}>
              <View
                accessibilityLabel={`${freeRow.label}: ${freeRow.value}`}
                style={{ flex: 1, backgroundColor: neutralSoft, borderRadius: 16, paddingVertical: shortScreen ? 7 : 10, paddingHorizontal: 12 }}
              >
                <Text style={{ fontSize: f.numMd, fontWeight: '900', color: t.textPrimary, lineHeight: f.numMd * 1.1, fontVariant: ['tabular-nums'] }} maxFontSizeMultiplier={1.4}>
                  {freeRow.amount}
                </Text>
                <Text style={{ fontSize: f.label, fontWeight: '700', color: t.textSecond, lineHeight: f.label * 1.32, marginTop: 3 }} maxFontSizeMultiplier={2}>
                  {freeRow.label}
                </Text>
              </View>
              {/* зачем: текст на акцентной подложке — textPrimary, а НЕ accent.
                  Замер по 4 темам: акцент на своей же полупрозрачной подложке даёт
                  2.98 («небо») и 4.05 («роза») — ниже порогов 3:1 (крупное) и
                  4.5:1 (обычное). Выделяет плитку сама подложка accentSoft. */}
              <View
                accessibilityLabel={`${maxRow.label}: ${maxRow.value}`}
                style={{ flex: 1, backgroundColor: accentSoft, borderRadius: 16, paddingVertical: shortScreen ? 7 : 10, paddingHorizontal: 12 }}
              >
                <Text style={{ fontSize: f.numMd, fontWeight: '900', color: t.textPrimary, lineHeight: f.numMd * 1.1, fontVariant: ['tabular-nums'] }} maxFontSizeMultiplier={1.4}>
                  {maxRow.amount}
                </Text>
                <Text style={{ fontSize: f.label, fontWeight: '700', color: t.textSecond, lineHeight: f.label * 1.32, marginTop: 3 }} maxFontSizeMultiplier={2}>
                  {maxRow.note}
                </Text>
              </View>
            </View>
          </PaywallEntrance>
        </ScrollView>

        {/* зачем: футер закреплён у нижнего края и НИКОГДА не уезжает за сгиб —
            ровно как в онбординге (ScreenFrame footer). Здесь живёт цена: до
            правки она была карточкой в середине скролла, и человек жал кнопку,
            не видя суммы. */}
        <PaywallEntrance index={5} style={{ paddingHorizontal: 20, paddingBottom: Math.max(12, bottomInset) }}>
          {visibleError ? (
            <Text accessibilityLiveRegion="polite" style={{ color: t.wrong, textAlign: 'center', fontSize: f.body, fontWeight: '700', marginBottom: 8 }} maxFontSizeMultiplier={2}>
              {visibleError}
            </Text>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6, marginBottom: shortScreen ? 6 : 10 }}>
            <Text style={{ color: t.textPrimary, fontSize: price ? f.numLg : f.body, fontWeight: '900', fontVariant: ['tabular-nums'] }} maxFontSizeMultiplier={1.4}>
              {price || triLang(lang, {
                ru: 'Цена временно недоступна', en: 'Price temporarily unavailable', uk: 'Ціна тимчасово недоступна', es: 'Precio no disponible temporalmente',
                'pt-BR': 'Preço temporariamente indisponível', vi: 'Giá tạm thời không khả dụng', id: 'Harga sementara tidak tersedia',
                tr: 'Fiyat geçici olarak kullanılamıyor', pl: 'Cena jest chwilowo niedostępna',
              })}
            </Text>
            {price ? (
              <Text style={{ color: t.textSecond, fontSize: f.body, fontWeight: '700' }} maxFontSizeMultiplier={2}>
                {triLang(lang, { ru: '/ мес', en: '/ mo', uk: '/ міс', es: '/ mes', 'pt-BR': '/ mês', vi: '/ tháng', id: '/ bln', tr: '/ ay', pl: '/ mies.' })}
              </Text>
            ) : null}
          </View>

          <View style={{ borderRadius: 28, overflow: 'hidden' }}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: primaryDisabled, busy: busy !== null }}
              disabled={primaryDisabled}
              onPress={buy}
              style={{ minHeight: shortScreen ? 54 : 60, borderRadius: 28, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center', opacity: primaryDisabled ? 0.55 : 1 }}
            >
              {primarySpinner ? <ActivityIndicator color={t.correctText} /> : (
                <Text style={{ color: t.correctText, fontSize: f.bodyLg, fontWeight: '900' }} maxFontSizeMultiplier={2}>
                  {storeConfirmed
                    ? triLang(lang, { ru: 'Проверить активацию', en: 'Check activation', uk: 'Перевірити активацію', es: 'Comprobar activación', 'pt-BR': 'Verificar ativação', vi: 'Kiểm tra kích hoạt', id: 'Periksa aktivasi', tr: 'Etkinleştirmeyi kontrol et', pl: 'Sprawdź aktywację' })
                    : triLang(lang, { ru: 'Подключить MAX', en: 'Activate MAX', uk: 'Підключити MAX', es: 'Activar MAX', 'pt-BR': 'Ativar MAX', vi: 'Đăng ký MAX', id: 'Aktifkan MAX', tr: 'MAX’i etkinleştir', pl: 'Włącz MAX' })}
                </Text>
              )}
            </Pressable>
            {/* Блик по кнопке — тот же приём, что в пейволах A–G; гаснет вне
                фокуса и при reduce-motion (PaywallMotion). */}
            {primaryDisabled ? null : <PaywallCtaShine />}
          </View>

          {!loading && !maxPackage && !storeConfirmed ? (
            <Pressable
              accessibilityRole="button"
              // зачем: кнопка гаснет на время покупки/восстановления, но без
              // accessibilityState озвучка молчала и слепой пользователь жал
              // мёртвую кнопку. Тот же паттерн, что у CTA и «Восстановить».
              accessibilityState={{ disabled: busy !== null, busy: busy !== null }}
              onPress={retryStoreOffer}
              disabled={busy !== null}
              style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 2 }}
            >
              <Text style={{ color: t.accent, fontSize: f.body, fontWeight: '800' }} maxFontSizeMultiplier={2}>
                {triLang(lang, {
                  ru: 'Повторить загрузку цены', en: 'Retry loading the price', uk: 'Повторити завантаження ціни', es: 'Volver a cargar el precio',
                  'pt-BR': 'Recarregar o preço', vi: 'Tải lại giá', id: 'Muat ulang harga',
                  tr: 'Fiyatı yeniden yükle', pl: 'Wczytaj cenę ponownie',
                })}
              </Text>
            </Pressable>
          ) : null}

          <Text style={{ color: t.textMuted, fontSize: f.label, textAlign: 'center', marginTop: 8, lineHeight: f.label * 1.35 }} maxFontSizeMultiplier={2}>
            {price ? triLang(lang, {
              ru: `${price} / мес · без пробного периода · отмена в любой момент`, en: `${price} / mo · no trial · cancel anytime`, uk: `${price} / міс · без пробного періоду · скасування будь-коли`,
              es: `${price} / mes · sin prueba · cancela cuando quieras`, 'pt-BR': `${price} / mês · sem teste · cancele quando quiser`,
              vi: `${price} / tháng · không dùng thử · hủy bất cứ lúc nào`, id: `${price} / bln · tanpa uji coba · batalkan kapan saja`,
              tr: `${price} / ay · deneme yok · istediğin an iptal et`, pl: `${price} / mies. · bez okresu próbnego · anuluj w każdej chwili`,
            }) : triLang(lang, {
              ru: 'Цена будет показана магазином до подтверждения покупки.', en: 'The store will show the price before you confirm the purchase.', uk: 'Магазин покаже ціну до підтвердження покупки.',
              es: 'La tienda mostrará el precio antes de confirmar la compra.', 'pt-BR': 'A loja mostrará o preço antes da confirmação da compra.',
              vi: 'Cửa hàng sẽ hiển thị giá trước khi xác nhận giao dịch.', id: 'Toko akan menampilkan harga sebelum pembelian dikonfirmasi.',
              tr: 'Satın alma onaylanmadan önce mağaza fiyatı gösterecek.', pl: 'Sklep pokaże cenę przed potwierdzeniem zakupu.',
            })}
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 18, marginTop: 2 }}>
            <Pressable
              onPress={restore}
              disabled={restoreDisabled}
              accessibilityRole="button"
              accessibilityState={{ disabled: restoreDisabled, busy: busy === 'restore' }}
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              <Text style={{ color: t.textMuted, fontWeight: '700', fontSize: f.label }} maxFontSizeMultiplier={2}>
                {triLang(lang, { ru: 'Восстановить', en: 'Restore', uk: 'Відновити', es: 'Restaurar', 'pt-BR': 'Restaurar', vi: 'Khôi phục', id: 'Pulihkan', tr: 'Geri yükle', pl: 'Przywróć' })}
              </Text>
            </Pressable>
            <Pressable onPress={() => Linking.openURL('https://phraseman.app/terms').catch(() => {})} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ color: t.textMuted, fontSize: f.label }} maxFontSizeMultiplier={2}>
                {triLang(lang, { ru: 'Условия', en: 'Terms', uk: 'Умови', es: 'Términos', 'pt-BR': 'Termos', vi: 'Điều khoản', id: 'Ketentuan', tr: 'Koşullar', pl: 'Warunki' })}
              </Text>
            </Pressable>
            <Pressable onPress={() => Linking.openURL('https://phraseman.app/privacy').catch(() => {})} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ color: t.textMuted, fontSize: f.label }} maxFontSizeMultiplier={2}>
                {triLang(lang, { ru: 'Конфиденциальность', en: 'Privacy', uk: 'Конфіденційність', es: 'Privacidad', 'pt-BR': 'Privacidade', vi: 'Quyền riêng tư', id: 'Privasi', tr: 'Gizlilik', pl: 'Prywatność' })}
              </Text>
            </Pressable>
          </View>
        </PaywallEntrance>
      </SafeAreaView>
    </ScreenGradient>
  );
}
