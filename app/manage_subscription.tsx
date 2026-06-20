// ════════════════════════════════════════════════════════════════════════════
// manage_subscription.tsx — внутренний экран «Управление подпиской».
//
// Возвращён после рефакторинга пейвола (раньше manage=1 просто открывал стор).
// Показывает: статус «Premium активирован», название плана, дату след. списания
// и сумму (из RevenueCat customerInfo), список включённого, карточку «Перейти
// на годовой» (Google DEFERRED-проплейшн) и кнопку «Отменить подписку» →
// шит-опрос (logCancelSurvey) → переход в стор для фактической отмены.
//
// Данные о подписке — авторитетно из стора (Purchases.getCustomerInfo). Никаких
// фейковых дат/сумм: если данных нет, поле просто не показывается.
// ════════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
  Linking, Platform, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Purchases, { type CustomerInfo, PRORATION_MODE } from 'react-native-purchases';

import { LinearGradient } from '../components/SafeLinearGradient';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { usePaywallChrome, PaywallCloseButton } from '../components/paywall/paywallShared';
import { initRevenueCat, resolvePremiumPackages, syncRevenueCatIdentity } from './revenuecat_init';
import { storePriceTrim } from './paywall_purchase';
import { inferPremiumPlanFromProductId, revenueCatPremiumMetadata, persistStorePremiumLocally } from './premium_revenuecat_state';
import { logCancelSurvey, logChangePlanStarted } from './firebase';
import { trackEvent } from './analytics';
import { safeRouterBack } from './navigation_back';
import { hapticTap } from '../hooks/use-haptics';
import { emitAppEvent } from './events';
import { invalidatePremiumCache } from './premium_guard';

type ManageSubscriptionCopy = {
  ru: string;
  uk: string;
  es: string;
  'pt-BR': string;
  vi: string;
  id: string;
  tr: string;
  pl: string;
};

// Восемь пунктов «что включено» — сжатые формулировки по Библии Phraseman.
const INCLUDED: ManageSubscriptionCopy[] = [
  { ru: 'Безлимитная энергия — уроки, квизы и экзамены без ожидания', uk: 'Безлімітна енергія — уроки, квізи та іспити без очікування', es: 'Energía ilimitada: lecciones, quizzes y exámenes sin esperas', 'pt-BR': 'Energia ilimitada: aulas, quizzes e exames sem espera', vi: 'Năng lượng không giới hạn: bài học, quiz và bài kiểm tra không phải chờ', id: 'Energi tak terbatas: pelajaran, kuis, dan ujian tanpa menunggu', tr: 'Sınırsız enerji: dersler, quizler ve sınavlar beklemeden', pl: 'Nielimitowana energia: lekcje, quizy i egzaminy bez czekania' },
  { ru: 'Арена без дневного лимита и без затрат энергии', uk: 'Арена без денного ліміту й без витрат енергії', es: 'Arena sin límite diario ni gasto de energía', 'pt-BR': 'Arena sem limite diário nem gasto de energia', vi: 'Arena không giới hạn ngày và không tốn năng lượng', id: 'Arena tanpa batas harian dan tanpa biaya energi', tr: 'Günlük limitsiz ve enerji harcamayan arena', pl: 'Arena bez dziennego limitu i bez zużycia energii' },
  { ru: 'Все уроки текущего уровня открыты полностью', uk: 'Усі уроки поточного рівня відкриті повністю', es: 'Todas las lecciones del nivel actual abiertas', 'pt-BR': 'Todas as aulas do nível atual totalmente abertas', vi: 'Tất cả bài học của cấp hiện tại được mở đầy đủ', id: 'Semua pelajaran level saat ini terbuka penuh', tr: 'Mevcut seviyedeki tüm dersler tamamen açık', pl: 'Wszystkie lekcje bieżącego poziomu są w pełni otwarte' },
  { ru: 'Квизы без дневного лимита', uk: 'Квізи без денного ліміту', es: 'Cuestionarios sin límite diario', 'pt-BR': 'Quizzes sem limite diário', vi: 'Quiz không giới hạn ngày', id: 'Kuis tanpa batas harian', tr: 'Günlük limitsiz quizler', pl: 'Quizy bez dziennego limitu' },
  { ru: 'Неограниченные сохранённые карточки', uk: 'Необмежені збережені картки', es: 'Tarjetas guardadas ilimitadas', 'pt-BR': 'Cartões salvos ilimitados', vi: 'Thẻ đã lưu không giới hạn', id: 'Kartu tersimpan tak terbatas', tr: 'Sınırsız kayıtlı kart', pl: 'Nielimitowane zapisane fiszki' },
  { ru: 'Защита серии и заморозка', uk: 'Захист серії та заморозка', es: 'Protección de racha y congelación', 'pt-BR': 'Proteção de sequência e congelamento', vi: 'Bảo vệ chuỗi ngày và đóng băng', id: 'Perlindungan streak dan pembekuan', tr: 'Seri koruması ve dondurma', pl: 'Ochrona serii i zamrożenie' },
  { ru: 'Премиум-темы оформления', uk: 'Преміум-теми оформлення', es: 'Temas premium', 'pt-BR': 'Temas premium', vi: 'Giao diện premium', id: 'Tema premium', tr: 'Premium temalar', pl: 'Motywy premium' },
  { ru: 'Премиальная подсветка профиля в лидербордах', uk: 'Преміальне підсвічування профілю в лідербордах', es: 'Perfil destacado en las clasificaciones', 'pt-BR': 'Perfil premium destacado nos rankings', vi: 'Hồ sơ Premium nổi bật trên bảng xếp hạng', id: 'Sorotan profil premium di papan peringkat', tr: 'Liderlik tablolarında premium profil vurgusu', pl: 'Wyróżnienie profilu Premium w rankingach' },
];

// Причины отмены для шит-опроса (logCancelSurvey).
const CANCEL_REASONS: ({ key: string } & ManageSubscriptionCopy)[] = [
  { key: 'too_expensive', ru: 'Слишком дорого', uk: 'Занадто дорого', es: 'Demasiado caro', 'pt-BR': 'Muito caro', vi: 'Quá đắt', id: 'Terlalu mahal', tr: 'Çok pahalı', pl: 'Za drogo' },
  { key: 'not_using', ru: 'Не пользуюсь достаточно', uk: 'Не користуюся достатньо', es: 'No lo uso lo suficiente', 'pt-BR': 'Não uso o suficiente', vi: 'Tôi không dùng đủ nhiều', id: 'Saya tidak cukup sering memakainya', tr: 'Yeterince kullanmıyorum', pl: 'Nie korzystam wystarczająco' },
  { key: 'missing_features', ru: 'Не хватает функций', uk: 'Бракує функцій', es: 'Faltan funciones', 'pt-BR': 'Faltam recursos', vi: 'Thiếu tính năng', id: 'Fitur kurang', tr: 'Özellikler eksik', pl: 'Brakuje funkcji' },
  { key: 'technical', ru: 'Технические проблемы', uk: 'Технічні проблеми', es: 'Problemas técnicos', 'pt-BR': 'Problemas técnicos', vi: 'Sự cố kỹ thuật', id: 'Masalah teknis', tr: 'Teknik sorunlar', pl: 'Problemy techniczne' },
  { key: 'temporary', ru: 'Временно, вернусь позже', uk: 'Тимчасово, повернусь пізніше', es: 'Temporal, vuelvo luego', 'pt-BR': 'Temporário, volto depois', vi: 'Tạm thời, tôi sẽ quay lại sau', id: 'Sementara, nanti saya kembali', tr: 'Geçici, sonra döneceğim', pl: 'Tymczasowo, wrócę później' },
  { key: 'other', ru: 'Другое', uk: 'Інше', es: 'Otro', 'pt-BR': 'Outro', vi: 'Khác', id: 'Lainnya', tr: 'Diğer', pl: 'Inne' },
];

const DATE_LOCALE_BY_LANG: Record<Lang, string> = {
  ru: 'ru-RU',
  uk: 'uk-UA',
  es: 'es-ES',
  'pt-BR': 'pt-BR',
  vi: 'vi-VN',
  id: 'id-ID',
  tr: 'tr-TR',
  pl: 'pl-PL',
};

function getStoreManageUrl(): string {
  return Platform.OS === 'ios'
    ? 'https://apps.apple.com/account/subscriptions'
    : 'https://play.google.com/store/account/subscriptions';
}

function formatDate(ms: number | null, lang: Lang): string | null {
  if (!ms || !Number.isFinite(ms)) return null;
  try {
    const locale = DATE_LOCALE_BY_LANG[lang] ?? 'en-US';
    return new Date(ms).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return null;
  }
}

export default function ManageSubscription() {
  const router = useRouter();
  const { lang } = useLang();
  const L = lang as Lang;
  const chrome = usePaywallChrome();
  const LP = (
    ru: string,
    uk: string,
    es: string,
    ptBR: string,
    vi: string,
    id: string,
    tr: string,
    pl: string,
  ) => triLang(L, { ru, uk, es, 'pt-BR': ptBR, vi, id, tr, pl });

  const [info, setInfo] = useState<CustomerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [yearlyPriceStr, setYearlyPriceStr] = useState('');
  const [yearlyPkg, setYearlyPkg] = useState<import('react-native-purchases').PurchasesPackage | null>(null);
  const [changing, setChanging] = useState(false);
  const [showCancelSheet, setShowCancelSheet] = useState(false);
  const [cancelReason, setCancelReason] = useState<string | null>(null);
  const [cancelText, setCancelText] = useState('');

  useEffect(() => {
    let dead = false;
    void (async () => {
      try {
        await initRevenueCat();
        await syncRevenueCatIdentity();
        const ci = await Purchases.getCustomerInfo();
        if (!dead) setInfo(ci);
        const o = await Purchases.getOfferings();
        const pkgs = resolvePremiumPackages(o.current?.availablePackages ?? []);
        if (!dead && pkgs.yearly) {
          setYearlyPkg(pkgs.yearly);
          setYearlyPriceStr(storePriceTrim(pkgs.yearly.product?.priceString));
        }
      } catch { /* данных нет — покажем минимум */ }
      finally { if (!dead) setLoading(false); }
    })();
    return () => { dead = true; };
  }, []);

  const metadata = info ? revenueCatPremiumMetadata(info) : {};
  const currentPlan = inferPremiumPlanFromProductId(metadata.productId, 'monthly');
  const nextDate = formatDate(metadata.expiryMs ?? null, L);
  const isLifetime = currentPlan === 'lifetime';
  const isMonthly = currentPlan === 'monthly';

  const planLabel = isLifetime
    ? LP('Навсегда', 'Назавжди', 'De por vida', 'Para sempre', 'Trọn đời', 'Selamanya', 'Ömür boyu', 'Na zawsze')
    : currentPlan === 'yearly'
      ? LP('Годовая подписка', 'Річна підписка', 'Suscripción anual', 'Assinatura anual', 'Gói năm', 'Langganan tahunan', 'Yıllık abonelik', 'Subskrypcja roczna')
      : LP('Месячная подписка', 'Місячна підписка', 'Suscripción mensual', 'Assinatura mensal', 'Gói tháng', 'Langganan bulanan', 'Aylık abonelik', 'Subskrypcja miesięczna');

  // ── смена плана: месячный → годовой (DEFERRED-проплейшн на Android) ──────────
  const handleChangePlan = useCallback(async () => {
    if (changing || !yearlyPkg) return;
    hapticTap();
    void logChangePlanStarted('monthly', 'yearly');
    void trackEvent('change_plan_started', { from: 'monthly', to: 'yearly' });
    setChanging(true);
    try {
      const opts = Platform.OS === 'android'
        ? { googleProductChangeInfo: { oldProductIdentifier: metadata.productId ?? '', prorationMode: PRORATION_MODE.DEFERRED } }
        : undefined;
      const { customerInfo } = await Purchases.purchasePackage(yearlyPkg, opts as any);
      const meta = revenueCatPremiumMetadata(customerInfo, yearlyPkg.product.identifier);
      await persistStorePremiumLocally('yearly', meta);
      invalidatePremiumCache();
      emitAppEvent('premium_activated');
      void trackEvent('change_plan_completed', { from: 'monthly', to: 'yearly' });
      setInfo(customerInfo);
    } catch (err: unknown) {
      if (!(err as { userCancelled?: boolean })?.userCancelled) {
        void trackEvent('change_plan_failed', { from: 'monthly', to: 'yearly' });
      }
    } finally {
      setChanging(false);
    }
  }, [changing, yearlyPkg, metadata.productId]);

  // ── отмена: опрос → стор ────────────────────────────────────────────────────
  const submitCancel = useCallback(() => {
    hapticTap();
    logCancelSurvey(cancelReason ?? 'unknown', cancelText, 'manage');
    void trackEvent('subscription_cancel_survey', { reason: cancelReason ?? 'unknown' });
    setShowCancelSheet(false);
    void Linking.openURL(getStoreManageUrl()).catch(() => {});
  }, [cancelReason, cancelText]);

  return (
    <LinearGradient colors={chrome.bgColors} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={S.root}>
      <SafeAreaView style={S.safe}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={S.scroll}>
          <PaywallCloseButton onPress={() => { hapticTap(); safeRouterBack(router); }} chrome={chrome} />

          <View style={[S.statusBadge, { backgroundColor: `${chrome.tc.heroAccent}1A`, borderColor: `${chrome.tc.heroAccent}40` }]}>
            <Ionicons name="checkmark-circle" size={16} color={chrome.tc.heroAccent} />
            <Text style={[S.statusText, { color: chrome.tc.heroAccent }]}>
              {LP('Premium активирован', 'Premium активовано', 'Premium activado', 'Premium ativado', 'Premium đã kích hoạt', 'Premium aktif', 'Premium etkinleştirildi', 'Premium aktywowany')}
            </Text>
          </View>

          <Text style={[S.title, { color: chrome.textPrimary }]}>{planLabel}</Text>

          {loading ? (
            <ActivityIndicator color={chrome.tc.heroAccent} style={{ marginTop: 18 }} />
          ) : (
            <>
              {!isLifetime && nextDate && (
                <View style={[S.infoCard, { backgroundColor: chrome.cardBg, borderColor: chrome.cardBorder }]}>
                  <View style={S.infoRow}>
                    <Text style={[S.infoLabel, { color: chrome.textMuted }]}>
                      {LP('Следующее списание', 'Наступне списання', 'Próximo cobro', 'Próxima cobrança', 'Lần thanh toán tiếp theo', 'Tagihan berikutnya', 'Sonraki ödeme', 'Następna płatność')}
                    </Text>
                    <Text style={[S.infoValue, { color: chrome.textPrimary }]}>{nextDate}</Text>
                  </View>
                </View>
              )}
              {isLifetime && (
                <Text style={[S.lifetimeNote, { color: chrome.textMuted }]}>
                  {LP('Разовая покупка — без списаний и автопродления.', 'Разова покупка — без списань і автопродовження.', 'Compra única, sin cobros ni renovación.', 'Compra única, sem cobranças nem renovação automática.', 'Mua một lần, không thu phí và không tự gia hạn.', 'Pembelian sekali, tanpa tagihan dan perpanjangan otomatis.', 'Tek seferlik satın alma, ödeme ve otomatik yenileme yok.', 'Jednorazowy zakup, bez opłat i automatycznego odnawiania.')}
                </Text>
              )}

              <Text style={[S.sectionTitle, { color: chrome.textMuted }]}>
                {LP('ЧТО ВКЛЮЧЕНО', 'ЩО ВКЛЮЧЕНО', 'QUÉ INCLUYE', 'O QUE INCLUI', 'BAO GỒM', 'YANG TERMASUK', 'NELER DAHİL', 'CO ZAWIERA')}
              </Text>
              <View style={[S.infoCard, { backgroundColor: chrome.cardBg, borderColor: chrome.cardBorder }]}>
                {INCLUDED.map((b, i) => (
                  <View key={i} style={[S.benefitRow, i > 0 && { marginTop: 10 }]}>
                    <Ionicons name="checkmark-circle" size={16} color={chrome.tc.heroAccent} style={{ marginTop: 1 }} />
                    <Text style={[S.benefitText, { color: chrome.textPrimary }]}>{LP(b.ru, b.uk, b.es, b['pt-BR'], b.vi, b.id, b.tr, b.pl)}</Text>
                  </View>
                ))}
              </View>

              {/* Карточка «Перейти на годовой» — только если сейчас месячный и годовой пакет есть. */}
              {isMonthly && yearlyPkg && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleChangePlan}
                  disabled={changing}
                  style={[S.changeCard, { borderColor: `${chrome.tc.heroAccent}55`, backgroundColor: `${chrome.tc.heroAccent}10` }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[S.changeTitle, { color: chrome.textPrimary }]}>
                      {LP('Перейти на годовой план', 'Перейти на річний план', 'Cambiar al plan anual', 'Mudar para o plano anual', 'Chuyển sang gói năm', 'Beralih ke paket tahunan', 'Yıllık plana geç', 'Przejdź na plan roczny')}
                    </Text>
                    <Text style={[S.changeSub, { color: chrome.textMuted }]}>
                      {yearlyPriceStr
                        ? LP(`Дешевле в пересчёте — ${yearlyPriceStr}/год`, `Дешевше в перерахунку — ${yearlyPriceStr}/рік`, `Más barato al año — ${yearlyPriceStr}/año`, `Mais barato no ano — ${yearlyPriceStr}/ano`, `Rẻ hơn tính theo năm — ${yearlyPriceStr}/năm`, `Lebih murah per tahun — ${yearlyPriceStr}/tahun`, `Yıllık daha ucuz — ${yearlyPriceStr}/yıl`, `Taniej rocznie — ${yearlyPriceStr}/rok`)
                        : LP('Дешевле в пересчёте на месяц', 'Дешевше в перерахунку на місяць', 'Más barato por mes', 'Mais barato por mês', 'Rẻ hơn tính theo tháng', 'Lebih murah per bulan', 'Aylık hesapta daha ucuz', 'Taniej w przeliczeniu na miesiąc')}
                    </Text>
                  </View>
                  {changing
                    ? <ActivityIndicator color={chrome.tc.heroAccent} />
                    : <Ionicons name="arrow-forward-circle" size={26} color={chrome.tc.heroAccent} />}
                </TouchableOpacity>
              )}

              {/* Отмена — только для подписок (не lifetime). */}
              {!isLifetime && (
                <TouchableOpacity onPress={() => { hapticTap(); setShowCancelSheet(true); }} style={S.cancelBtn}>
                  <Text style={[S.cancelText, { color: chrome.textMuted }]}>
                    {LP('Отменить подписку', 'Скасувати підписку', 'Cancelar suscripción', 'Cancelar assinatura', 'Hủy gói đăng ký', 'Batalkan langganan', 'Aboneliği iptal et', 'Anuluj subskrypcję')}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </ScrollView>

        {/* ── шит-опрос отмены ── */}
        {showCancelSheet && (
          <View style={S.sheetOverlay}>
            <View style={[S.sheet, { backgroundColor: chrome.bgColors[1] ?? '#11151a', borderColor: chrome.cardBorder }]}>
              <Text style={[S.sheetTitle, { color: chrome.textPrimary }]}>
                {LP('Почему уходишь?', 'Чому йдеш?', '¿Por qué te vas?', 'Por que você vai sair?', 'Vì sao bạn rời đi?', 'Mengapa kamu pergi?', 'Neden ayrılıyorsun?', 'Dlaczego odchodzisz?')}
              </Text>
              <Text style={[S.sheetSub, { color: chrome.textMuted }]}>
                {LP('Это поможет нам стать лучше.', 'Це допоможе нам стати кращими.', 'Nos ayuda a mejorar.', 'Isso nos ajuda a melhorar.', 'Điều này giúp chúng tôi cải thiện.', 'Ini membantu kami menjadi lebih baik.', 'Bu, daha iyi olmamıza yardımcı olur.', 'To pomoże nam się poprawić.')}
              </Text>
              {CANCEL_REASONS.map((r) => {
                const sel = cancelReason === r.key;
                return (
                  <TouchableOpacity
                    key={r.key}
                    onPress={() => { hapticTap(); setCancelReason(r.key); }}
                    style={[S.reasonRow, { borderColor: sel ? chrome.tc.heroAccent : chrome.cardBorder, backgroundColor: sel ? `${chrome.tc.heroAccent}14` : 'transparent' }]}
                  >
                    <Ionicons name={sel ? 'radio-button-on' : 'radio-button-off'} size={18} color={sel ? chrome.tc.heroAccent : chrome.textMuted} />
                    <Text style={[S.reasonText, { color: chrome.textPrimary }]}>{LP(r.ru, r.uk, r.es, r['pt-BR'], r.vi, r.id, r.tr, r.pl)}</Text>
                  </TouchableOpacity>
                );
              })}
              {cancelReason === 'other' && (
                <TextInput
                  value={cancelText}
                  onChangeText={setCancelText}
                  placeholder={LP('Расскажи подробнее…', 'Розкажи детальніше…', 'Cuéntanos más…', 'Conte mais…', 'Nói rõ hơn…', 'Ceritakan lebih lanjut…', 'Biraz daha anlat…', 'Napisz więcej…')}
                  placeholderTextColor={chrome.textMuted}
                  style={[S.input, { color: chrome.textPrimary, borderColor: chrome.cardBorder }]}
                  multiline
                />
              )}
              <TouchableOpacity
                onPress={submitCancel}
                disabled={!cancelReason}
                style={[S.sheetPrimary, { backgroundColor: chrome.tc.ctaBg, opacity: cancelReason ? 1 : 0.5 }]}
              >
                <Text style={[S.sheetPrimaryText, { color: chrome.tc.ctaText }]}>
                  {LP('Перейти к отмене', 'Перейти до скасування', 'Ir a cancelar', 'Ir para o cancelamento', 'Đi tới hủy gói', 'Lanjut ke pembatalan', 'İptale git', 'Przejdź do anulowania')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { hapticTap(); setShowCancelSheet(false); }} style={S.sheetSecondary}>
                <Text style={[S.sheetSecondaryText, { color: chrome.textMuted }]}>
                  {LP('Остаться в Premium', 'Залишитися в Premium', 'Quedarme en Premium', 'Ficar no Premium', 'Ở lại Premium', 'Tetap di Premium', "Premium'da kal", 'Zostań w Premium')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const S = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 7,
    paddingHorizontal: 13, paddingVertical: 7, borderRadius: 14, borderWidth: 1, marginTop: 8,
  },
  statusText: { fontSize: 12.5, fontWeight: '800' },
  title: { fontSize: 26, fontWeight: '900', textAlign: 'center', marginTop: 14, letterSpacing: -0.6 },
  infoCard: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, marginTop: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoLabel: { fontSize: 13, fontWeight: '600' },
  infoValue: { fontSize: 14, fontWeight: '800' },
  lifetimeNote: { fontSize: 12.5, textAlign: 'center', marginTop: 12, lineHeight: 17 },
  sectionTitle: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2, marginTop: 22, marginLeft: 4 },
  benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  benefitText: { flex: 1, fontSize: 13, lineHeight: 18 },
  changeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 15, marginTop: 18,
  },
  changeTitle: { fontSize: 15, fontWeight: '800' },
  changeSub: { fontSize: 12, marginTop: 2 },
  cancelBtn: { alignSelf: 'center', marginTop: 24, paddingVertical: 8, paddingHorizontal: 12 },
  cancelText: { fontSize: 13, textDecorationLine: 'underline', opacity: 0.7 },
  sheetOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.62)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 34 },
  sheetTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.4 },
  sheetSub: { fontSize: 13, marginTop: 4, marginBottom: 14 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 12, marginTop: 8 },
  reasonText: { flex: 1, fontSize: 14, fontWeight: '600' },
  input: { borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 10, minHeight: 70, fontSize: 14, textAlignVertical: 'top' },
  sheetPrimary: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  sheetPrimaryText: { fontSize: 16, fontWeight: '900' },
  sheetSecondary: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  sheetSecondaryText: { fontSize: 14, fontWeight: '700' },
});
