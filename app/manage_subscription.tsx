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

// Восемь пунктов «что включено» — сжатые формулировки по Библии Phraseman.
const INCLUDED: { ru: string; uk: string; es: string }[] = [
  { ru: 'Безлимитная энергия — уроки, квизы и экзамены без ожидания', uk: 'Безлімітна енергія — уроки, квізи та іспити без очікування', es: 'Energía ilimitada: lecciones, quizzes y exámenes sin esperas' },
  { ru: 'Арена без дневного лимита и без затрат энергии', uk: 'Арена без денного ліміту й без витрат енергії', es: 'Arena sin límite diario ni gasto de energía' },
  { ru: 'Все уроки текущего уровня открыты полностью', uk: 'Усі уроки поточного рівня відкриті повністю', es: 'Todas las lecciones del nivel actual abiertas' },
  { ru: 'Квизы без дневного лимита', uk: 'Квізи без денного ліміту', es: 'Cuestionarios sin límite diario' },
  { ru: 'Неограниченные сохранённые карточки', uk: 'Необмежені збережені картки', es: 'Tarjetas guardadas ilimitadas' },
  { ru: 'Защита серии и заморозка', uk: 'Захист серії та заморозка', es: 'Protección de racha y congelación' },
  { ru: 'Премиум-темы оформления', uk: 'Преміум-теми оформлення', es: 'Temas premium' },
  { ru: 'Премиальная подсветка профиля в лидербордах', uk: 'Преміальне підсвічування профілю в лідербордах', es: 'Perfil destacado en las clasificaciones' },
];

// Причины отмены для шит-опроса (logCancelSurvey).
const CANCEL_REASONS: { key: string; ru: string; uk: string; es: string }[] = [
  { key: 'too_expensive', ru: 'Слишком дорого', uk: 'Занадто дорого', es: 'Demasiado caro' },
  { key: 'not_using', ru: 'Не пользуюсь достаточно', uk: 'Не користуюся достатньо', es: 'No lo uso lo suficiente' },
  { key: 'missing_features', ru: 'Не хватает функций', uk: 'Бракує функцій', es: 'Faltan funciones' },
  { key: 'technical', ru: 'Технические проблемы', uk: 'Технічні проблеми', es: 'Problemas técnicos' },
  { key: 'temporary', ru: 'Временно, вернусь позже', uk: 'Тимчасово, повернусь пізніше', es: 'Temporal, vuelvo luego' },
  { key: 'other', ru: 'Другое', uk: 'Інше', es: 'Otro' },
];

function getStoreManageUrl(): string {
  return Platform.OS === 'ios'
    ? 'https://apps.apple.com/account/subscriptions'
    : 'https://play.google.com/store/account/subscriptions';
}

function formatDate(ms: number | null, lang: Lang): string | null {
  if (!ms || !Number.isFinite(ms)) return null;
  try {
    const locale = lang === 'ru' ? 'ru-RU' : lang === 'uk' ? 'uk-UA' : lang === 'es' ? 'es-ES' : 'en-US';
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
  const LP = (ru: string, uk: string, es: string) => triLang(L, { ru, uk, es });

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
    ? LP('Навсегда', 'Назавжди', 'De por vida')
    : currentPlan === 'yearly'
      ? LP('Годовая подписка', 'Річна підписка', 'Suscripción anual')
      : LP('Месячная подписка', 'Місячна підписка', 'Suscripción mensual');

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
              {LP('Premium активирован', 'Premium активовано', 'Premium activado')}
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
                      {LP('Следующее списание', 'Наступне списання', 'Próximo cobro')}
                    </Text>
                    <Text style={[S.infoValue, { color: chrome.textPrimary }]}>{nextDate}</Text>
                  </View>
                </View>
              )}
              {isLifetime && (
                <Text style={[S.lifetimeNote, { color: chrome.textMuted }]}>
                  {LP('Разовая покупка — без списаний и автопродления.', 'Разова покупка — без списань і автопродовження.', 'Compra única, sin cobros ni renovación.')}
                </Text>
              )}

              <Text style={[S.sectionTitle, { color: chrome.textMuted }]}>
                {LP('ЧТО ВКЛЮЧЕНО', 'ЩО ВКЛЮЧЕНО', 'QUÉ INCLUYE')}
              </Text>
              <View style={[S.infoCard, { backgroundColor: chrome.cardBg, borderColor: chrome.cardBorder }]}>
                {INCLUDED.map((b, i) => (
                  <View key={i} style={[S.benefitRow, i > 0 && { marginTop: 10 }]}>
                    <Ionicons name="checkmark-circle" size={16} color={chrome.tc.heroAccent} style={{ marginTop: 1 }} />
                    <Text style={[S.benefitText, { color: chrome.textPrimary }]}>{LP(b.ru, b.uk, b.es)}</Text>
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
                      {LP('Перейти на годовой план', 'Перейти на річний план', 'Cambiar al plan anual')}
                    </Text>
                    <Text style={[S.changeSub, { color: chrome.textMuted }]}>
                      {yearlyPriceStr
                        ? LP(`Дешевле в пересчёте — ${yearlyPriceStr}/год`, `Дешевше в перерахунку — ${yearlyPriceStr}/рік`, `Más barato al año — ${yearlyPriceStr}/año`)
                        : LP('Дешевле в пересчёте на месяц', 'Дешевше в перерахунку на місяць', 'Más barato por mes')}
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
                    {LP('Отменить подписку', 'Скасувати підписку', 'Cancelar suscripción')}
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
                {LP('Почему уходишь?', 'Чому йдеш?', '¿Por qué te vas?')}
              </Text>
              <Text style={[S.sheetSub, { color: chrome.textMuted }]}>
                {LP('Это поможет нам стать лучше.', 'Це допоможе нам стати кращими.', 'Nos ayuda a mejorar.')}
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
                    <Text style={[S.reasonText, { color: chrome.textPrimary }]}>{LP(r.ru, r.uk, r.es)}</Text>
                  </TouchableOpacity>
                );
              })}
              {cancelReason === 'other' && (
                <TextInput
                  value={cancelText}
                  onChangeText={setCancelText}
                  placeholder={LP('Расскажи подробнее…', 'Розкажи детальніше…', 'Cuéntanos más…')}
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
                  {LP('Перейти к отмене', 'Перейти до скасування', 'Ir a cancelar')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { hapticTap(); setShowCancelSheet(false); }} style={S.sheetSecondary}>
                <Text style={[S.sheetSecondaryText, { color: chrome.textMuted }]}>
                  {LP('Остаться в Premium', 'Залишитися в Premium', 'Quedarme en Premium')}
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
