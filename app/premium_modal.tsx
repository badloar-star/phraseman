import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import Constants from 'expo-constants';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ContentWrap from '../components/ContentWrap';
import ScreenGradient from '../components/ScreenGradient';
import { sendPremiumNotification } from './notifications';
import { DEV_MODE } from './config';

const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

type Plan = 'monthly' | 'yearly';

const savePremiumLocally = async (plan: Plan) => {
  const expiry = plan === 'yearly'
    ? Date.now() + 365 * 24 * 60 * 60 * 1000
    : Date.now() + 30  * 24 * 60 * 60 * 1000;
  await AsyncStorage.setItem('premium_plan', plan);
  await AsyncStorage.setItem('premium_expiry', String(expiry));
  await AsyncStorage.setItem('premium_active', 'true');
};

const FEATURES_RU = [
  { icon: 'book-outline',       text: 'Все 32 урока' },
  { icon: 'aperture-outline',   text: 'Квизы всех уровней' },
  { icon: 'trophy-outline',     text: 'Зал славы и клубы' },
  { icon: 'chatbubbles-outline',text: 'Все 20 диалогов' },
  { icon: 'ribbon-outline',     text: 'Финальный экзамен' },
  { icon: 'infinite-outline',   text: 'Неограниченный доступ' },
];
const FEATURES_UK = [
  { icon: 'book-outline',       text: 'Всі 32 уроки' },
  { icon: 'aperture-outline',   text: 'Квізи всіх рівнів' },
  { icon: 'trophy-outline',     text: 'Зал слави та клуби' },
  { icon: 'chatbubbles-outline',text: 'Всі 20 діалогів' },
  { icon: 'ribbon-outline',     text: 'Фінальний іспит' },
  { icon: 'infinite-outline',   text: 'Необмежений доступ' },
];
// Для streak-paywall: список с заморозкой наверху
const STREAK_FEATURES_RU = [
  { icon: 'snow-outline',       text: 'Заморозка стрика на 1 день' },
  ...FEATURES_RU,
];
const STREAK_FEATURES_UK = [
  { icon: 'snow-outline',       text: 'Заморозка стріку на 1 день' },
  ...FEATURES_UK,
];

type ViewMode = 'purchase' | 'manage' | 'change_plan';

const formatDate = (ts: number, lang: string): string => {
  const d = new Date(ts);
  return d.toLocaleDateString(lang === 'uk' ? 'uk-UA' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
};

export default function PremiumModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ context?: string; streak?: string }>();
  // context=streak → специальный заголовок и активация заморозки при покупке
  const isStreakContext = params.context === 'streak';
  const streakDays = parseInt(params.streak || '0') || 0;
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const isUK = lang === 'uk';
  const [selected, setSelected] = useState<Plan>('yearly');
  const [restoring, setRestoring] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [packages, setPackages] = useState<{ monthly?: PurchasesPackage; yearly?: PurchasesPackage }>({});
  const [viewMode, setViewMode]         = useState<ViewMode>('purchase');
  const [activePlan, setActivePlan]     = useState<Plan | null>(null);
  const [expiryTs, setExpiryTs]         = useState<number>(0);
  const [cancelled, setCancelled]       = useState(false);

  useEffect(() => {
    AsyncStorage.multiGet(['premium_active','premium_plan','premium_expiry']).then(res => {
      const active  = res.find(r => r[0] === 'premium_active')?.[1];
      const plan    = res.find(r => r[0] === 'premium_plan')?.[1] as Plan | null;
      const expiry  = parseInt(res.find(r => r[0] === 'premium_expiry')?.[1] || '0');
      if (active === 'true' && plan && expiry > Date.now()) {
        setActivePlan(plan);
        setExpiryTs(expiry);
        setViewMode('manage');
      }
    });
  }, []);

  const features = isStreakContext
    ? (isUK ? STREAK_FEATURES_UK : STREAK_FEATURES_RU)
    : (isUK ? FEATURES_UK : FEATURES_RU);

  const handleCancelSubscription = () => {
    Alert.alert(
      isUK ? 'Скасувати підписку?' : 'Отменить подписку?',
      isUK
        ? `Підписка залишиться активною до ${formatDate(expiryTs, lang)}. Після цього доступ до Premium буде закрито.`
        : `Подписка останется активной до ${formatDate(expiryTs, lang)}. После этого доступ к Premium будет закрыт.`,
      [
        { text: isUK ? 'Назад' : 'Назад', style: 'cancel' },
        {
          text: isUK ? 'Скасувати підписку' : 'Отменить подписку',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.setItem('premium_cancelled', 'true');
            setCancelled(true);
          },
        },
      ]
    );
  };

  const handleChangePlan = async (newPlan: Plan) => {
    if (newPlan === activePlan) return;
    // Switching from yearly to monthly — yearly stays active until expiry
    if (activePlan === 'yearly' && newPlan === 'monthly') {
      Alert.alert(
        isUK ? 'Зміна плану' : 'Смена плана',
        isUK
          ? `Річний план буде активний до ${formatDate(expiryTs, lang)}. Після цього буде підключено щомісячну підписку.`
          : `Годовой план будет активен до ${formatDate(expiryTs, lang)}. После этого будет подключена ежемесячная подписка.`,
        [
          { text: isUK ? 'Скасувати' : 'Отмена', style: 'cancel' },
          {
            text: isUK ? 'Підтвердити' : 'Подтвердить',
            onPress: async () => {
              await AsyncStorage.setItem('premium_pending_plan', 'monthly');
              await savePremiumLocally('monthly');
              const newExpiry = Date.now() + 30 * 24 * 60 * 60 * 1000;
              setActivePlan('monthly');
              setExpiryTs(newExpiry);
              setViewMode('manage');
            },
          },
        ]
      );
    } else {
      await savePremiumLocally(newPlan);
      const newExpiry = newPlan === 'yearly'
        ? Date.now() + 365 * 24 * 60 * 60 * 1000
        : Date.now() + 30  * 24 * 60 * 60 * 1000;
      setActivePlan(newPlan);
      setExpiryTs(newExpiry);
      setViewMode('manage');
    }
  };

  useEffect(() => {
    if (IS_EXPO_GO || DEV_MODE) return;
    Purchases.getOfferings()
      .then(offerings => {
        const pkgs = offerings.current?.availablePackages ?? [];
        const monthly = pkgs.find(p => p.product.identifier.includes('monthly'));
        const yearly  = pkgs.find(p => p.product.identifier.includes('yearly'));
        setPackages({ monthly, yearly });
      })
      .catch(() => {});
  }, []);

  // При покупке в контексте streak — сразу активируем заморозку,
  // чтобы updateStreakOnActivity() сохранил стрик при первой активности.
  const activateFreezeIfNeeded = async () => {
    if (isStreakContext) {
      await AsyncStorage.setItem('streak_freeze', JSON.stringify({ active: true }));
    }
  };

  const handlePurchase = async (plan: Plan) => {
    setSelected(plan);
    // In Expo Go or DEV_MODE: simulate successful purchase
    if (IS_EXPO_GO || DEV_MODE) {
      await savePremiumLocally(plan);
      await activateFreezeIfNeeded();
      sendPremiumNotification(lang as 'ru' | 'uk');
      Alert.alert('Premium ✅', isUK ? 'Premium активовано!' : 'Premium активирован!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
      return;
    }
    const pkg = plan === 'yearly' ? packages.yearly : packages.monthly;
    if (!pkg) {
      Alert.alert(
        isUK ? 'Магазин недоступний' : 'Магазин недоступен',
        isUK ? 'Спробуйте ще раз або перевірте підключення.' : 'Попробуйте ещё раз или проверьте подключение.',
        [{ text: 'OK' }]
      );
      return;
    }
    setPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const isActive = !!customerInfo.entitlements.active['premium']
        || customerInfo.activeSubscriptions.length > 0;
      if (isActive) {
        await savePremiumLocally(plan);
        await activateFreezeIfNeeded();
        sendPremiumNotification(lang as 'ru' | 'uk');
        Alert.alert('Premium ✅', isUK ? 'Premium активовано!' : 'Premium активирован!');
        router.back();
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert(
          isUK ? 'Помилка' : 'Ошибка',
          e.message || (isUK ? 'Щось пішло не так.' : 'Что-то пошло не так.')
        );
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const info = await Purchases.restorePurchases();
      const isActive = !!info.entitlements.active['premium']
        || info.activeSubscriptions.length > 0;
      if (isActive) {
        const plan: Plan = info.activeSubscriptions.some(s => s.includes('yearly')) ? 'yearly' : 'monthly';
        await savePremiumLocally(plan);
        sendPremiumNotification(lang as 'ru' | 'uk');
        Alert.alert('Premium ✅', isUK ? 'Підписку відновлено!' : 'Подписка восстановлена!');
        router.back();
      } else {
        Alert.alert(
          isUK ? 'Відновлення покупок' : 'Восстановление покупок',
          isUK ? 'Активних підписок не знайдено.' : 'Активных подписок не найдено.',
          [{ text: 'OK' }]
        );
      }
    } catch (e: any) {
      Alert.alert(isUK ? 'Помилка' : 'Ошибка', e.message);
    } finally {
      setRestoring(false);
    }
  };

  // ── Manage subscription view ────────────────────────────────────────────────
  if (viewMode === 'manage' && activePlan) {
    const amount = activePlan === 'yearly' ? '€23.99' : '€3.99';
    const period = activePlan === 'yearly'
      ? (isUK ? 'рік' : 'год')
      : (isUK ? 'місяць' : 'месяц');
    return (
      <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
          </TouchableOpacity>
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', marginLeft: 8 }}>Premium</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>

          {/* Status card */}
          <View style={{ backgroundColor: t.bgCard, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: t.correct, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="diamond" size={28} color={t.correct} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700' }}>
                  {isUK ? 'Premium активовано ✓' : 'Premium активирован ✓'}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 2 }}>
                  {activePlan === 'yearly'
                    ? (isUK ? 'Річна підписка' : 'Годовая подписка')
                    : (isUK ? 'Щомісячна підписка' : 'Ежемесячная подписка')}
                </Text>
              </View>
            </View>
            {!cancelled && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 0.5, borderTopColor: t.border }}>
                <View>
                  <Text style={{ color: t.textMuted, fontSize: f.label }}>{isUK ? 'Наступний платіж' : 'Следующий платёж'}</Text>
                  <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '600', marginTop: 2 }}>{formatDate(expiryTs, lang)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: t.textMuted, fontSize: f.label }}>{isUK ? 'Сума' : 'Сумма'}</Text>
                  <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '600', marginTop: 2 }}>{amount} / {period}</Text>
                </View>
              </View>
            )}
            {cancelled && (
              <View style={{ paddingTop: 12, borderTopWidth: 0.5, borderTopColor: t.border }}>
                <Text style={{ color: t.wrong, fontSize: f.sub }}>
                  {isUK
                    ? `Підписку скасовано. Доступ активний до ${formatDate(expiryTs, lang)}`
                    : `Подписка отменена. Доступ активен до ${formatDate(expiryTs, lang)}`}
                </Text>
              </View>
            )}
          </View>

          {/* Change plan */}
          {!cancelled && (
            <TouchableOpacity
              style={{ backgroundColor: t.bgCard, borderRadius: 16, padding: 18, borderWidth: 0.5, borderColor: t.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              onPress={() => setViewMode('change_plan')}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ionicons name="swap-horizontal-outline" size={22} color={t.textSecond} />
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '600' }}>
                  {isUK ? 'Змінити план' : 'Сменить план'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
            </TouchableOpacity>
          )}

          {/* Cancel */}
          {!cancelled && (
            <TouchableOpacity
              style={{ borderRadius: 16, padding: 18, borderWidth: 0.5, borderColor: t.wrong + '66', backgroundColor: t.bgCard, flexDirection: 'row', alignItems: 'center', gap: 12 }}
              onPress={handleCancelSubscription}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle-outline" size={22} color={t.wrong} />
              <Text style={{ color: t.wrong, fontSize: f.body, fontWeight: '600' }}>
                {isUK ? 'Скасувати підписку' : 'Отменить подписку'}
              </Text>
            </TouchableOpacity>
          )}

          <Text style={{ color: t.textGhost, fontSize: f.label, textAlign: 'center', marginTop: 4 }}>
            {isUK
              ? 'Підписка управляється через App Store / Google Play'
              : 'Подписка управляется через App Store / Google Play'}
          </Text>
        </ScrollView>
        </ContentWrap>
      </SafeAreaView>
      </ScreenGradient>
    );
  }

  // ── Change plan view ─────────────────────────────────────────────────────────
  if (viewMode === 'change_plan' && activePlan) {
    const otherPlan: Plan = activePlan === 'yearly' ? 'monthly' : 'yearly';
    return (
      <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
          <TouchableOpacity onPress={() => setViewMode('manage')}>
            <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
          </TouchableOpacity>
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', marginLeft: 8 }}>
            {isUK ? 'Змінити план' : 'Сменить план'}
          </Text>
        </View>
        <View style={{ padding: 20, gap: 12 }}>
          {/* Current plan */}
          {([activePlan, otherPlan] as Plan[]).map(plan => {
            const isCurrent = plan === activePlan;
            return (
              <TouchableOpacity
                key={plan}
                style={{
                  borderRadius: 16, padding: 18,
                  borderWidth: isCurrent ? 2 : 1,
                  borderColor: isCurrent ? t.correct : t.border,
                  backgroundColor: isCurrent ? t.bgSurface : t.bgCard,
                }}
                onPress={() => handleChangePlan(plan)}
                activeOpacity={isCurrent ? 1 : 0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700' }}>
                      {plan === 'yearly'
                        ? (isUK ? 'Річна підписка' : 'Годовая подписка')
                        : (isUK ? 'Щомісячна підписка' : 'Ежемесячная подписка')}
                    </Text>
                    {isCurrent && (
                      <Text style={{ color: t.correct, fontSize: f.sub, marginTop: 3, fontWeight: '600' }}>
                        {isUK ? '✓ Поточний план' : '✓ Текущий план'}
                      </Text>
                    )}
                  </View>
                  <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '700' }}>
                    {plan === 'yearly' ? '€23.99' : '€3.99'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={{ backgroundColor: t.bgSurface, borderRadius: 12, padding: 14, gap: 4 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '600', textAlign: 'center' }}>
              {isUK ? 'ℹ️ Наступний платіж' : 'ℹ️ Следующий платёж'}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.sub, textAlign: 'center', lineHeight: f.sub * 1.5 }}>
              {isUK
                ? `Новий план набуде чинності після закінчення поточного періоду${expiryTs ? ` (до ${formatDate(expiryTs, lang)})` : ''}. До цього моменту нічого не знімається.`
                : `Новый план вступит в силу после окончания текущего периода${expiryTs ? ` (до ${formatDate(expiryTs, lang)})` : ''}. До этого момента ничего не списывается.`}
            </Text>
          </View>
        </View>
        </ContentWrap>
      </SafeAreaView>
      </ScreenGradient>
    );
  }

  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex: 1 }}>
      <ContentWrap>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40, alignItems: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        {/* Крестик */}
        <TouchableOpacity
          style={{ alignSelf: 'flex-end', padding: 8, marginBottom: 4 }}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={26} color={t.textMuted} />
        </TouchableOpacity>

        {/* Заголовок — стрик или стандартный */}
        {isStreakContext ? (
          <>
            <Text style={{ fontSize: 56, marginBottom: 12 }}>🔥</Text>
            <Text style={{ color: t.textPrimary, fontSize: f.numLg, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>
              {isUK ? `Стрік ${streakDays} днів під загрозою!` : `Стрик ${streakDays} дней под угрозой!`}
            </Text>
            <View style={{ backgroundColor: t.bgCard, borderRadius: 14, padding: 14, marginBottom: 24, borderWidth: 1, borderColor: t.border }}>
              <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', lineHeight: f.body * 1.5 }}>
                {isUK
                  ? 'Ти пропустив вчорашній день. Без Premium стрік згорить при першій активності. Купи Premium зараз — і ми заморозимо його на сьогодні!'
                  : 'Ты пропустил вчерашний день. Без Premium стрик сгорит при первой активности. Купи Premium сейчас — и мы заморозим его на сегодня!'}
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: t.bgCard, borderWidth: 1.5, borderColor: t.border, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="diamond-outline" size={36} color={t.textSecond} />
            </View>
            <Text style={{ color: t.textPrimary, fontSize: f.numLg, fontWeight: '700', marginBottom: 6 }}>Premium</Text>
            <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', marginBottom: 28 }}>
              {isUK ? 'Повний доступ до всіх матеріалів' : 'Полный доступ ко всем материалам'}
            </Text>
          </>
        )}

        {/* Фичи */}
        <View style={{ width: '100%', marginBottom: 28 }}>
          {features.map((feat, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: t.bgCard, borderWidth: 0.5, borderColor: t.border, justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
                <Ionicons name={feat.icon as any} size={18} color={t.textSecond} />
              </View>
              <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.body }}>{feat.text}</Text>
              <Ionicons name="checkmark" size={18} color={t.correct} />
            </View>
          ))}
        </View>

        {/* Выбор плана */}
        <View style={{ width: '100%', gap: 12, marginBottom: 20 }}>

          {/* Годовая — рекомендуемый */}
          <TouchableOpacity
            style={{
              borderRadius: 16, padding: 18,
              borderWidth: selected === 'yearly' ? 2 : 1,
              borderColor: selected === 'yearly' ? t.textSecond : t.border,
              backgroundColor: selected === 'yearly' ? t.bgSurface : t.bgCard,
              opacity: purchasing && selected === 'yearly' ? 0.7 : 1,
            }}
            onPress={() => handlePurchase('yearly')}
            activeOpacity={0.85}
            disabled={purchasing}
          >
            {/* Бейдж "Лучший выбор" */}
            <View style={{ position: 'absolute', top: -10, right: 16, backgroundColor: t.textSecond, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 }}>
              <Text style={{ color: t.bgPrimary, fontSize: f.label, fontWeight: '700' }}>
                {isUK ? '⭐ Найкращий вибір' : '⭐ Лучший выбор'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700' }}>
                  {isUK ? 'Річна підписка' : 'Годовая подписка'}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 4 }}>
                  {isUK ? '7 днів безкоштовно' : '7 дней бесплатно'}
                </Text>
                <Text style={{ color: t.textSecond, fontSize: f.caption, marginTop: 3 }}>
                  {isUK ? '💰 Економиш 50% vs місячна' : '💰 Экономишь 50% vs ежемесячная'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '700' }}>€23.99</Text>
                <Text style={{ color: t.correct, fontSize: f.caption, fontWeight: '700', marginTop: 2 }}>
                  ≈€2.00 / {isUK ? 'міс' : 'мес'}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.caption, textDecorationLine: 'line-through' }}>
                  €47.88/{isUK ? 'рік' : 'год'}
                </Text>
              </View>
            </View>
            {selected === 'yearly' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: t.border }}>
                <Ionicons name="shield-checkmark-outline" size={14} color={t.correct} />
                <Text style={{ color: t.textSecond, fontSize: f.caption }}>
                  {isUK ? 'Всі майбутні оновлення включено' : 'Все будущие обновления включены'}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Месячная подписка */}
          <TouchableOpacity
            style={{
              borderRadius: 16, padding: 18,
              borderWidth: selected === 'monthly' ? 2 : 1,
              borderColor: selected === 'monthly' ? t.textSecond : t.border,
              backgroundColor: selected === 'monthly' ? t.bgSurface : t.bgCard,
              opacity: purchasing && selected === 'monthly' ? 0.7 : 1,
            }}
            onPress={() => handlePurchase('monthly')}
            activeOpacity={0.85}
            disabled={purchasing}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700' }}>
                  {isUK ? 'Щомісячна підписка' : 'Ежемесячная подписка'}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 4 }}>
                  {isUK ? '7 днів безкоштовно' : '7 дней бесплатно'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '700' }}>€3.99</Text>
                <Text style={{ color: t.textMuted, fontSize: f.caption }}>
                  {isUK ? '/ місяць' : '/ месяц'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Главная CTA кнопка */}
        <TouchableOpacity
          style={{ width: '100%', backgroundColor: t.textSecond, borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 12, opacity: purchasing ? 0.7 : 1 }}
          onPress={() => handlePurchase(selected)}
          activeOpacity={0.85}
          disabled={purchasing}
        >
          {purchasing
            ? <ActivityIndicator color={t.bgPrimary} />
            : <Text style={{ color: t.bgPrimary, fontSize: f.h2, fontWeight: '700' }} numberOfLines={1} adjustsFontSizeToFit>
                {isUK ? '🚀 Почати 7 днів безкоштовно' : '🚀 Начать 7 дней бесплатно'}
              </Text>
          }
        </TouchableOpacity>

        {/* Восстановить покупку */}
        <TouchableOpacity
          style={{ paddingVertical: 12, paddingHorizontal: 20 }}
          onPress={handleRestore}
          disabled={restoring}
          activeOpacity={0.7}
        >
          <Text style={{ color: restoring ? t.textGhost : t.textSecond, fontSize: f.body, textAlign: 'center' }}>
            {restoring
              ? (isUK ? 'Відновлення...' : 'Восстанавливаем...')
              : (isUK ? 'Відновити підписку' : 'Восстановить подписку')
            }
          </Text>
        </TouchableOpacity>

        {/* Продолжить бесплатно */}
        <TouchableOpacity style={{ padding: 12 }} onPress={() => router.back()}>
          <Text style={{ color: t.textGhost, fontSize: f.body, textDecorationLine: 'underline' }}>
            {isStreakContext
              ? (isUK ? 'Ні, дякую — стрік згорить' : 'Нет, спасибо — стрик сгорит')
              : (isUK ? 'Продовжити безкоштовно (Урок 1)' : 'Продолжить бесплатно (Урок 1)')}
          </Text>
        </TouchableOpacity>

        {/* Мелкий текст */}
        <Text style={{ color: t.textGhost, fontSize: f.label, textAlign: 'center', marginTop: 16, lineHeight: 17 }}>
          {isUK
            ? 'Після завершення триалу підписка поновлюється автоматично. Скасування в налаштуваннях App Store / Google Play.'
            : 'После окончания триала подписка продлевается автоматически. Отмена в настройках App Store / Google Play.'}
        </Text>
      </ScrollView>
      </ContentWrap>
    </SafeAreaView>
    </ScreenGradient>
  );
}
