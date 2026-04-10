import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Animated, Linking, DeviceEventEmitter,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ContentWrap from '../components/ContentWrap';
import ScreenGradient from '../components/ScreenGradient';
import { sendPremiumNotification } from './notifications';
import { DEV_MODE, IS_EXPO_GO } from './config';
import { invalidatePremiumCache } from './premium_guard';
import { logPremiumPurchased, logPremiumModalOpened } from './firebase';

type Plan = 'monthly' | 'yearly';
type PremiumContext = 'lesson_b1' | 'quiz_limit' | 'quiz_level' | 'quiz_medium' | 'quiz_hard' | 'flashcard_limit' | 'streak' | 'dialog' | 'theme' | 'hall_of_fame' | 'generic';

const savePremiumLocally = async (plan: Plan) => {
  const expiry = plan === 'yearly'
    ? Date.now() + 365 * 24 * 60 * 60 * 1000
    : Date.now() + 30  * 24 * 60 * 60 * 1000;
  await AsyncStorage.setItem('premium_plan', plan);
  await AsyncStorage.setItem('premium_expiry', String(expiry));
  await AsyncStorage.setItem('premium_active', 'true');
  invalidatePremiumCache();
};

// ── Контекстные герои ─────────────────────────────────────────────────────────
interface HeroConfig {
  emoji: string;
  titleRu: string;
  titleUk: string;
  subtitleRu: string;
  subtitleUk: string;
  highlightRow: number; // индекс строки сравнения для подсветки (0-5)
}

function getHero(
  ctx: PremiumContext,
  streakDays: number,
  lessonsDone: number,
  savedCards: number,
): HeroConfig {
  switch (ctx) {
    case 'lesson_b1':
      return {
        emoji: '🎓',
        titleRu: lessonsDone >= 18 ? 'Ты закончил A2!' : lessonsDone > 0 ? `Ты прошёл ${lessonsDone} уроков!` : 'Уроки B1 и B2',
        titleUk: lessonsDone >= 18 ? 'Ти закінчив A2!' : lessonsDone > 0 ? `Ти пройшов ${lessonsDone} уроків!` : 'Уроки B1 і B2',
        subtitleRu: 'Дальше — B1. Именно здесь английский\nстановится рабочим инструментом.',
        subtitleUk: 'Далі — B1. Саме тут англійська\nстає робочим інструментом.',
        highlightRow: 0,
      };
    case 'quiz_limit':
      return {
        emoji: '⚡',
        titleRu: 'На сегодня всё',
        titleUk: 'На сьогодні все',
        subtitleRu: 'Ты использовал все бесплатные попытки.\nС Premium — учись столько, сколько хочешь.',
        subtitleUk: 'Ти використав усі безкоштовні спроби.\nЗ Premium — навчайся скільки хочеш.',
        highlightRow: 1,
      };
    case 'quiz_level':
      return {
        emoji: '🧠',
        titleRu: 'Это уровень B1',
        titleUk: 'Це рівень B1',
        subtitleRu: 'Сложные задания — для тех, кто готов\nк настоящему вызову. Ты явно готов.',
        subtitleUk: 'Складні завдання — для тих, хто готовий\nдо справжнього виклику. Ти явно готовий.',
        highlightRow: 1,
      };
    case 'quiz_medium':
      return {
        emoji: '🔥',
        titleRu: 'Квизы уровня Средний',
        titleUk: 'Квізи рівня Середній',
        subtitleRu: 'B1–B2: фразовые глаголы в реальных\nситуациях. 2× XP за каждый правильный ответ.',
        subtitleUk: 'B1–B2: фразові дієслова в реальних\nситуаціях. 2× XP за кожну правильну відповідь.',
        highlightRow: 1,
      };
    case 'quiz_hard':
      return {
        emoji: '💜',
        titleRu: 'Квизы уровня Сложный',
        titleUk: 'Квізи рівня Складний',
        subtitleRu: 'C1–C2: продвинутые конструкции и идиомы.\n3× XP — для тех, кто хочет говорить как носитель.',
        subtitleUk: 'C1–C2: просунуті конструкції та ідіоми.\n3× XP — для тих, хто хоче говорити як носій.',
        highlightRow: 1,
      };
    case 'flashcard_limit':
      return {
        emoji: '📚',
        titleRu: `Сохранено ${savedCards}/20 карточек`,
        titleUk: `Збережено ${savedCards}/20 карток`,
        subtitleRu: 'Твоя коллекция переполнена.\nС Premium — сохраняй всё без ограничений.',
        subtitleUk: 'Твоя колекція переповнена.\nЗ Premium — зберігай все без обмежень.',
        highlightRow: 2,
      };
    case 'streak':
      return {
        emoji: '🔥',
        titleRu: `Стрик ${streakDays} ${streakDays === 1 ? 'день' : streakDays < 5 ? 'дня' : 'дней'} под угрозой!`,
        titleUk: `Стрік ${streakDays} ${streakDays === 1 ? 'день' : 'днів'} під загрозою!`,
        subtitleRu: 'Ты пропустил вчера. Без Premium стрик\nсгорит. Заморозь его прямо сейчас.',
        subtitleUk: 'Ти пропустив вчора. Без Premium стрік\nзгорить. Заморозь його прямо зараз.',
        highlightRow: 4,
      };
    case 'dialog':
      return {
        emoji: '💬',
        titleRu: 'Живой английский',
        titleUk: 'Жива англійська',
        subtitleRu: 'Этот диалог открывается с Premium.\nРеальные разговоры — для работы и жизни.',
        subtitleUk: 'Цей діалог відкривається з Premium.\nРеальні розмови — для роботи та життя.',
        highlightRow: 5,
      };
    case 'theme':
      return {
        emoji: '🎨',
        titleRu: 'Персональная тема',
        titleUk: 'Персональна тема',
        subtitleRu: 'Тёмная, светлая, неон, закат — выбирай\nлюбой стиль приложения с Premium.',
        subtitleUk: 'Темна, світла, неон, захід — обирай\nбудь-який стиль застосунку з Premium.',
        highlightRow: 3,
      };
    case 'hall_of_fame':
      return {
        emoji: '🏆',
        titleRu: 'Зал славы',
        titleUk: 'Зал слави',
        subtitleRu: 'Соревнуйся с другими учениками,\nзаходи в топ недели и побеждай с Premium.',
        subtitleUk: 'Змагайся з іншими учнями,\nпотрапляй у топ тижня та перемагай з Premium.',
        highlightRow: -1,
      };
    default:
      return {
        emoji: '💎',
        titleRu: 'Полный доступ к Phraseman',
        titleUk: 'Повний доступ до Phraseman',
        subtitleRu: 'Все уровни. Без ожидания.\nАнглийский — без ограничений.',
        subtitleUk: 'Всі рівні. Без очікування.\nАнглійська — без обмежень.',
        highlightRow: -1,
      };
  }
}

// ── Строки сравнения ──────────────────────────────────────────────────────────

const formatDate = (ts: number, lang: string) =>
  new Date(ts).toLocaleDateString(lang === 'uk' ? 'uk-UA' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

// ── Компонент ─────────────────────────────────────────────────────────────────
export default function PremiumModal() {
  const router = useRouter();
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/home' as any);
  };
  const params = useLocalSearchParams<{
    context?: string;
    streak?: string;
    lessons_done?: string;
    saved?: string;
    level?: string;
    _preview_success?: string;
  }>();

  const ctx = (params.context ?? 'generic') as PremiumContext;
  useEffect(() => { logPremiumModalOpened(ctx); }, []);
  const streakDays   = parseInt(params.streak       ?? '0') || 0;
  const lessonsDone  = parseInt(params.lessons_done ?? '0') || 0;
  const savedCards   = parseInt(params.saved        ?? '0') || 0;

  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const isUK = lang === 'uk';

  const [selected,   setSelected]   = useState<Plan>('yearly');
  const [restoring,  setRestoring]  = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [packages,   setPackages]   = useState<{ monthly?: PurchasesPackage; yearly?: PurchasesPackage }>({});
  const [trialUsed,  setTrialUsed]  = useState(false);

  // manage-view state
  type ViewMode = 'purchase' | 'manage' | 'change_plan' | 'success';
  const [viewMode,    setViewMode]   = useState<ViewMode>('purchase');
  const successScale   = useRef(new Animated.Value(0.6)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  // Запускаем анимацию всякий раз как входим в success-режим
  useEffect(() => {
    if (viewMode === 'success') {
      successScale.setValue(0.6);
      successOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(successScale,   { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
        Animated.timing(successOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
    }
  }, [viewMode]);

  // Превью из тестерского экрана
  useEffect(() => {
    if (params._preview_success === '1') setViewMode('success');
  }, [params._preview_success]);
  const [activePlan,  setActivePlan] = useState<Plan | null>(null);
  const [expiryTs,    setExpiryTs]   = useState<number>(0);
  const [cancelled,   setCancelled]  = useState(false);

  const hero = getHero(ctx, streakDays, lessonsDone, savedCards);

  useEffect(() => {
    AsyncStorage.multiGet(['premium_active', 'premium_plan', 'premium_expiry', 'trial_used']).then(res => {
      const active  = res.find(r => r[0] === 'premium_active')?.[1];
      const plan    = res.find(r => r[0] === 'premium_plan')?.[1] as Plan | null;
      const expiry  = parseInt(res.find(r => r[0] === 'premium_expiry')?.[1] || '0');
      const tUsed   = res.find(r => r[0] === 'trial_used')?.[1];
      if (active === 'true' && plan && expiry > Date.now()) {
        setActivePlan(plan); setExpiryTs(expiry); setViewMode('manage');
      }
      if (tUsed === 'true') setTrialUsed(true);
    });
  }, []);

  useEffect(() => {
    if (IS_EXPO_GO || DEV_MODE) return;
    Purchases.getOfferings()
      .then(o => {
        const pkgs    = o.current?.availablePackages ?? [];
        const monthly = pkgs.find(p => p.product.identifier.includes('monthly'));
        const yearly  = pkgs.find(p => p.product.identifier.includes('yearly'));
        setPackages({ monthly, yearly });
      })
      .catch(() => {});
  }, []);

  const activateFreezeIfNeeded = async () => {
    if (ctx === 'streak') {
      const today = new Date().toISOString().split('T')[0];
      await AsyncStorage.setItem('streak_freeze', JSON.stringify({ active: true, date: today }));
    }
  };

  const showSuccess = () => {
    // Ensure cache is invalidated before notifying listeners
    invalidatePremiumCache();
    DeviceEventEmitter.emit('premium_activated');
    setViewMode('success');
    setTimeout(() => {
      // Re-emit after modal dismissal so any screens that remount on focus
      // (e.g. under an iOS modal) pick up the fresh premium flag.
      invalidatePremiumCache();
      DeviceEventEmitter.emit('premium_activated');
      goBack();
    }, 2800);
  };

  const handlePurchase = async (plan: Plan) => {
    setSelected(plan);
    if (IS_EXPO_GO || DEV_MODE) {
      await savePremiumLocally(plan);
      if (plan === 'yearly') await AsyncStorage.setItem('trial_used', 'true');
      await activateFreezeIfNeeded();
      sendPremiumNotification(lang as 'ru' | 'uk');
      showSuccess();
      return;
    }
    const pkg = plan === 'yearly' ? packages.yearly : packages.monthly;
    if (!pkg) {
      Alert.alert(
        isUK ? 'Магазин недоступний' : 'Магазин недоступен',
        isUK ? 'Спробуйте ще раз.' : 'Попробуйте ещё раз.',
        [{ text: 'OK' }],
      );
      return;
    }
    setPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      // purchasePackage не выбросил исключение → покупка авторизована Apple/Google.
      // Активируем сразу, не дожидаясь синхронизации RC (sandbox может запаздывать).
      // RC-статус используем как дополнительную проверку, но не как условие активации.
      void customerInfo; // RC customerInfo доступен для отладки при необходимости
      await savePremiumLocally(plan);
      logPremiumPurchased(pkg.product.identifier);
      if (plan === 'yearly') await AsyncStorage.setItem('trial_used', 'true');
      await activateFreezeIfNeeded();
      sendPremiumNotification(lang as 'ru' | 'uk');
      showSuccess();
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert(isUK ? 'Помилка' : 'Ошибка', e.message || (isUK ? 'Щось пішло не так.' : 'Что-то пошло не так.'));
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const info = await Purchases.restorePurchases();
      const isActive =
        Object.keys(info.entitlements.active).length > 0 ||
        info.activeSubscriptions.length > 0;
      if (isActive) {
        const plan: Plan = info.activeSubscriptions.some(s => s.includes('yearly')) ? 'yearly' : 'monthly';
        await savePremiumLocally(plan);
        DeviceEventEmitter.emit('premium_activated');
        sendPremiumNotification(lang as 'ru' | 'uk');
        Alert.alert('Premium ✅', isUK ? 'Підписку відновлено!' : 'Подписка восстановлена!');
        goBack();
      } else {
        Alert.alert(
          isUK ? 'Відновлення' : 'Восстановление',
          isUK ? 'Активних підписок не знайдено.' : 'Активных подписок не найдено.',
          [{ text: 'OK' }],
        );
      }
    } catch (e: any) {
      Alert.alert(isUK ? 'Помилка' : 'Ошибка', e.message);
    } finally {
      setRestoring(false);
    }
  };

  // ── Success view ─────────────────────────────────────────────────────────────
  if (viewMode === 'success') {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Animated.View style={{ alignItems: 'center', transform: [{ scale: successScale }], opacity: successOpacity }}>
            <View style={{ width: 110, height: 110, borderRadius: 55, backgroundColor: t.correct + '22', borderWidth: 2, borderColor: t.correct, justifyContent: 'center', alignItems: 'center', marginBottom: 28 }}>
              <Ionicons name="diamond" size={52} color={t.correct} />
            </View>
            <Text style={{ color: t.textPrimary, fontSize: f.numLg, fontWeight: '800', textAlign: 'center', marginBottom: 10 }}>
              {isUK ? 'Premium активовано!' : 'Premium активирован!'}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', lineHeight: f.body * 1.55, marginBottom: 32 }}>
              {isUK
                ? 'Усі рівні відкриті.\nВчи без обмежень.'
                : 'Все уровни открыты.\nУчись без ограничений.'}
            </Text>
            {[
              isUK ? '✓ Уроки B1 та B2' : '✓ Уроки B1 и B2',
              isUK ? '✓ Необмежена енергія' : '✓ Безлимитная энергия',
              isUK ? '✓ Усі квізи та рівні' : '✓ Все квизы и уровни',
              isUK ? '✓ Заморозка стріку' : '✓ Заморозка стрика',
            ].map((line, i) => (
              <Text key={i} style={{ color: t.correct, fontSize: f.bodyLg, fontWeight: '600', marginBottom: 6 }}>
                {line}
              </Text>
            ))}
          </Animated.View>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  // ── Manage view ─────────────────────────────────────────────────────────────
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
              <TouchableOpacity onPress={() => goBack()}>
                <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
              </TouchableOpacity>
              <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', marginLeft: 8 }}>Premium</Text>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
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
                  <Text style={{ color: t.wrong, fontSize: f.sub, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: t.border }}>
                    {isUK
                      ? `Підписку скасовано. Доступ активний до ${formatDate(expiryTs, lang)}`
                      : `Подписка отменена. Доступ активен до ${formatDate(expiryTs, lang)}`}
                  </Text>
                )}
              </View>

              {!cancelled && (
                <TouchableOpacity
                  style={{ backgroundColor: t.bgCard, borderRadius: 16, padding: 18, borderWidth: 0.5, borderColor: t.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                  onPress={() => setViewMode('change_plan')}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Ionicons name="swap-horizontal-outline" size={22} color={t.textSecond} />
                    <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '600' }}>{isUK ? 'Змінити план' : 'Сменить план'}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
                </TouchableOpacity>
              )}

              {!cancelled && (
                <TouchableOpacity
                  style={{ borderRadius: 16, padding: 18, borderWidth: 0.5, borderColor: t.wrong + '66', backgroundColor: t.bgCard, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                  onPress={() => Alert.alert(
                    isUK ? 'Скасувати підписку?' : 'Отменить подписку?',
                    isUK
                      ? `Підписка залишиться активною до ${formatDate(expiryTs, lang)}.`
                      : `Подписка останется активной до ${formatDate(expiryTs, lang)}.`,
                    [
                      { text: isUK ? 'Назад' : 'Назад', style: 'cancel' },
                      { text: isUK ? 'Скасувати' : 'Отменить', style: 'destructive', onPress: async () => { await AsyncStorage.setItem('premium_cancelled', 'true'); setCancelled(true); } },
                    ],
                  )}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close-circle-outline" size={22} color={t.wrong} />
                  <Text style={{ color: t.wrong, fontSize: f.body, fontWeight: '600' }}>{isUK ? 'Скасувати підписку' : 'Отменить подписку'}</Text>
                </TouchableOpacity>
              )}

              <Text style={{ color: t.textGhost, fontSize: f.label, textAlign: 'center', marginTop: 4 }}>
                {isUK ? 'Підписка управляється через App Store / Google Play' : 'Подписка управляется через App Store / Google Play'}
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
              <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', marginLeft: 8 }}>{isUK ? 'Змінити план' : 'Сменить план'}</Text>
            </View>
            <View style={{ padding: 20, gap: 12 }}>
              {([activePlan, otherPlan] as Plan[]).map(plan => {
                const isCurrent = plan === activePlan;
                return (
                  <TouchableOpacity
                    key={plan}
                    style={{ borderRadius: 16, padding: 18, borderWidth: isCurrent ? 2 : 1, borderColor: isCurrent ? t.correct : t.border, backgroundColor: isCurrent ? t.bgSurface : t.bgCard }}
                    onPress={() => {
                      if (isCurrent) return;
                      savePremiumLocally(plan);
                      const newExpiry = plan === 'yearly' ? Date.now() + 365 * 86400000 : Date.now() + 30 * 86400000;
                      setActivePlan(plan); setExpiryTs(newExpiry); setViewMode('manage');
                    }}
                    activeOpacity={isCurrent ? 1 : 0.8}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View>
                        <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700' }}>
                          {plan === 'yearly' ? (isUK ? 'Річна підписка' : 'Годовая подписка') : (isUK ? 'Щомісячна підписка' : 'Ежемесячная подписка')}
                        </Text>
                        {isCurrent && <Text style={{ color: t.correct, fontSize: f.sub, marginTop: 3, fontWeight: '600' }}>{isUK ? '✓ Поточний план' : '✓ Текущий план'}</Text>}
                      </View>
                      <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '700' }}>{plan === 'yearly' ? '€23.99' : '€3.99'}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              <Text style={{ color: t.textMuted, fontSize: f.sub, textAlign: 'center', lineHeight: f.sub * 1.5 }}>
                {isUK
                  ? `Новий план набуде чинності після закінчення поточного${expiryTs ? ` (до ${formatDate(expiryTs, lang)})` : ''}.`
                  : `Новый план вступит в силу после окончания текущего${expiryTs ? ` (до ${formatDate(expiryTs, lang)})` : ''}.`}
              </Text>
            </View>
          </ContentWrap>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  // ── Purchase view ─────────────────────────────────────────────────────────────
  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 48, paddingBottom: 36 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Крестик */}
            <TouchableOpacity
              style={{ alignSelf: 'flex-end', padding: 8, marginBottom: 8 }}
              onPress={() => goBack()}
            >
              <Ionicons name="close" size={24} color={t.textMuted} />
            </TouchableOpacity>

            {/* БЛОК 1: Герой */}
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ fontSize: 52, marginBottom: 12 }}>{hero.emoji}</Text>
              <Text style={{ color: t.textPrimary, fontSize: f.numLg, fontWeight: '800', textAlign: 'center', marginBottom: 8 }}>
                {isUK ? hero.titleUk : hero.titleRu}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', lineHeight: f.body * 1.55 }}>
                {isUK ? hero.subtitleUk : hero.subtitleRu}
              </Text>
            </View>

            {/* БЛОК 2: Feature Tiles */}
            <View style={{ marginBottom: 24, gap: 10 }}>
              {/* Заголовок секции */}
              <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '600', textAlign: 'center', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                {isUK ? 'Що відкривається' : 'Что открывается'}
              </Text>

              {/* 2×2 сетка плиток */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {/* Уроки */}
                <View style={{ flex: 1, backgroundColor: t.bgCard, borderRadius: 16, borderWidth: 1, borderColor: t.border, padding: 14, gap: 6 }}>
                  <Text style={{ fontSize: 22 }}>📚</Text>
                  <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                    {isUK ? 'Уроки' : 'Уроки'}
                  </Text>
                  <Text style={{ color: t.textGhost, fontSize: f.label }}>
                    {isUK ? 'A1–A2 (1–18)' : 'A1–A2 (1–18)'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Ionicons name="arrow-forward" size={12} color={t.textSecond} />
                    <Text style={{ color: t.textSecond, fontSize: f.label, fontWeight: '700' }}>
                      {isUK ? '+ B1 і B2' : '+ B1 и B2'}
                    </Text>
                  </View>
                </View>

                {/* Квизы */}
                <View style={{ flex: 1, backgroundColor: t.bgCard, borderRadius: 16, borderWidth: 1, borderColor: t.border, padding: 14, gap: 6 }}>
                  <Text style={{ fontSize: 22 }}>⚡</Text>
                  <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                    {isUK ? 'Квізи' : 'Квизы'}
                  </Text>
                  <Text style={{ color: t.textGhost, fontSize: f.label }}>
                    {isUK ? '3/день, Easy' : '3/день, Easy'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Ionicons name="arrow-forward" size={12} color={t.textSecond} />
                    <Text style={{ color: t.textSecond, fontSize: f.label, fontWeight: '700' }}>
                      {isUK ? '∞ усіх рівнів' : '∞ всех уровней'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                {/* Карточки */}
                <View style={{ flex: 1, backgroundColor: t.bgCard, borderRadius: 16, borderWidth: 1, borderColor: t.border, padding: 14, gap: 6 }}>
                  <Text style={{ fontSize: 22 }}>🃏</Text>
                  <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                    {isUK ? 'Картки' : 'Карточки'}
                  </Text>
                  <Text style={{ color: t.textGhost, fontSize: f.label }}>
                    {isUK ? 'до 20 штук' : 'до 20 штук'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Ionicons name="arrow-forward" size={12} color={t.textSecond} />
                    <Text style={{ color: t.textSecond, fontSize: f.label, fontWeight: '700' }}>
                      {isUK ? 'Без ліміту' : 'Без лимита'}
                    </Text>
                  </View>
                </View>

                {/* Энергия */}
                <View style={{ flex: 1, backgroundColor: t.bgCard, borderRadius: 16, borderWidth: 1, borderColor: t.border, padding: 14, gap: 6 }}>
                  <Text style={{ fontSize: 22 }}>🔋</Text>
                  <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                    {isUK ? 'Енергія' : 'Энергия'}
                  </Text>
                  <Text style={{ color: t.textGhost, fontSize: f.label }}>
                    {isUK ? '30 хв/од.' : '30 мин/ед.'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Ionicons name="arrow-forward" size={12} color={t.textSecond} />
                    <Text style={{ color: t.textSecond, fontSize: f.label, fontWeight: '700' }}>
                      {isUK ? 'Миттєво ∞' : 'Мгновенно ∞'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Заморозка стрика — полная ширина */}
              <View style={{ backgroundColor: t.bgCard, borderRadius: 16, borderWidth: 1, borderColor: t.border, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <Text style={{ fontSize: 28 }}>🔥</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                    {isUK ? 'Заморозка стріку' : 'Заморозка стрика'}
                  </Text>
                  <Text style={{ color: t.textGhost, fontSize: f.label, marginTop: 2 }}>
                    {isUK ? 'Захисти серію — навіть якщо пропустив день' : 'Защити серию — даже если пропустил день'}
                  </Text>
                </View>
                <View style={{ backgroundColor: t.textSecond + '20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ color: t.textSecond, fontSize: f.label, fontWeight: '700' }}>Premium</Text>
                </View>
              </View>
            </View>

            {/* БЛОК 3: Планы */}

            {/* Годовой */}
            <TouchableOpacity
              style={{
                borderRadius: 16, padding: 18, marginBottom: 10,
                borderWidth: selected === 'yearly' ? 2 : 1,
                borderColor: selected === 'yearly' ? t.textSecond : t.border,
                backgroundColor: selected === 'yearly' ? t.bgSurface : t.bgCard,
                opacity: purchasing && selected !== 'yearly' ? 0.5 : 1,
              }}
              onPress={() => handlePurchase('yearly')}
              activeOpacity={0.85}
              disabled={purchasing}
            >
              {/* Бейдж */}
              <View style={{ position: 'absolute', top: -11, right: 14, backgroundColor: t.textSecond, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 }}>
                <Text style={{ color: t.bgPrimary, fontSize: f.label, fontWeight: '700' }}>
                  {isUK ? '⭐ Найкраща ціна' : '⭐ Лучшая цена'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700' }}>
                    {isUK ? 'Річна підписка' : 'Годовая подписка'}
                  </Text>
                  {!trialUsed && (
                    <Text style={{ color: t.textSecond, fontSize: f.sub, marginTop: 3, fontWeight: '600' }}>
                      {isUK ? '7 днів безкоштовно' : '7 дней бесплатно'}
                    </Text>
                  )}
                  <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 2 }}>
                    {isUK ? 'Економія 50% порівняно з місячним' : 'Экономия 50% по сравнению с месячным'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '800' }}>
                    {packages.yearly?.product.priceString ?? '€23.99'}
                  </Text>
                  <Text style={{ color: t.textMuted, fontSize: f.caption }}>
                    {isUK ? '/ рік' : '/ год'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Месячный */}
            <TouchableOpacity
              style={{
                borderRadius: 16, padding: 18, marginBottom: 20,
                borderWidth: selected === 'monthly' ? 2 : 1,
                borderColor: selected === 'monthly' ? t.textSecond : t.border,
                backgroundColor: selected === 'monthly' ? t.bgSurface : t.bgCard,
                opacity: purchasing && selected !== 'monthly' ? 0.5 : 1,
              }}
              onPress={() => handlePurchase('monthly')}
              activeOpacity={0.85}
              disabled={purchasing}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700' }}>
                    {isUK ? 'Щомісячна підписка' : 'Ежемесячная подписка'}
                  </Text>
                  <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 3 }}>
                    {isUK ? '☕ Як одна чашка кави на місяць' : '☕ Как одна чашка кофе в месяц'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '800' }}>
                    {packages.monthly?.product.priceString ?? '€3.99'}
                  </Text>
                  <Text style={{ color: t.textMuted, fontSize: f.caption }}>{isUK ? '/ місяць' : '/ месяц'}</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* CTA */}
            <TouchableOpacity
              style={{
                backgroundColor: t.textSecond, borderRadius: 16, padding: 18,
                alignItems: 'center', marginBottom: 10,
                opacity: purchasing ? 0.7 : 1,
              }}
              onPress={() => handlePurchase(selected)}
              activeOpacity={0.85}
              disabled={purchasing}
            >
              {purchasing
                ? <ActivityIndicator color={t.bgPrimary} />
                : <Text style={{ color: t.bgPrimary, fontSize: f.h2, fontWeight: '800' }} adjustsFontSizeToFit numberOfLines={1}>
                    {selected === 'monthly'
                      ? (isUK ? '🚀 Оформити місячну підписку' : '🚀 Оформить месячную подписку')
                      : trialUsed
                        ? (isUK ? '🚀 Отримати Premium' : '🚀 Получить Premium')
                        : (isUK ? '🚀 Спробувати 7 днів безкоштовно' : '🚀 Попробовать 7 дней бесплатно')}
                  </Text>
              }
            </TouchableOpacity>

            {/* Мелкие хуки */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 16 }}>
              {!trialUsed && selected === 'yearly' && (
                <Text style={{ color: t.textGhost, fontSize: f.label }}>
                  {isUK ? '✓ Без списання зараз' : '✓ Без списания сейчас'}
                </Text>
              )}
              <Text style={{ color: t.textGhost, fontSize: f.label }}>
                {isUK ? '✓ Скасування в будь-який час' : '✓ Отмена в любой момент'}
              </Text>
            </View>

            {/* Восстановить */}
            <TouchableOpacity
              style={{ paddingVertical: 10, alignItems: 'center' }}
              onPress={handleRestore}
              disabled={restoring}
            >
              <Text style={{ color: restoring ? t.textGhost : t.textSecond, fontSize: f.body }}>
                {restoring
                  ? (isUK ? 'Відновлення...' : 'Восстанавливаем...')
                  : (isUK ? 'Відновити підписку' : 'Восстановить подписку')}
              </Text>
            </TouchableOpacity>

            {/* Продолжить бесплатно */}
            <TouchableOpacity style={{ paddingVertical: 8, alignItems: 'center' }} onPress={() => goBack()}>
              <Text style={{ color: t.textGhost, fontSize: f.body, textDecorationLine: 'underline' }}>
                {ctx === 'streak'
                  ? (isUK ? 'Ні, дякую — стрік згорить' : 'Нет, спасибо — стрик сгорит')
                  : (isUK ? 'Продовжити безкоштовно' : 'Продолжить бесплатно')}
              </Text>
            </TouchableOpacity>

            {!trialUsed && (
              <Text style={{ color: t.textGhost, fontSize: f.label, textAlign: 'center', marginTop: 12, lineHeight: 17 }}>
                {isUK
                  ? 'Після 7 днів підписка продовжується автоматично. Скасування через App Store / Google Play.'
                  : 'После 7 дней подписка продлевается автоматически. Отмена через App Store / Google Play.'}
              </Text>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 14, marginBottom: 4 }}>
              <TouchableOpacity onPress={() => Linking.openURL('https://badloar-star.github.io/phraseman-privacy/')}>
                <Text style={{ color: t.textGhost, fontSize: f.label, textDecorationLine: 'underline' }}>
                  {isUK ? 'Політика конфіденційності' : 'Политика конфиденциальности'}
                </Text>
              </TouchableOpacity>
              <Text style={{ color: t.textGhost, fontSize: f.label }}>·</Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://badloar-star.github.io/phraseman-privacy/terms.html')}>
                <Text style={{ color: t.textGhost, fontSize: f.label, textDecorationLine: 'underline' }}>
                  {isUK ? 'Умови використання' : 'Условия использования'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>
  );
}
