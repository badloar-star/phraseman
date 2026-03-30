import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity,
  TextInput, Alert, Modal, Linking, ScrollView, Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTabNav } from '../TabContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, FontSize, FONT_SIZE_LABELS, FONT_SCALE } from '../../components/ThemeContext';
import AnimatedFrame from '../../components/AnimatedFrame';
import ScreenGradient from '../../components/ScreenGradient';
import { getLevelFromXP } from '../../constants/theme';
import { getBestAvatarForLevel, getBestFrameForLevel } from '../../constants/avatars';
import { scheduleDailyReminder, cancelAllNotifications, loadNotificationSettings } from '../notifications';
import { useLang } from '../../components/LangContext';
import CustomSwitch from '../../components/CustomSwitch';
import { hapticTap as doHaptic, setHapticCacheEnabled } from '../../hooks/use-haptics';
import { DEV_MODE, STORE_URL } from '../config';
import { getReferralCode, getReferralStats } from '../referral_system';

export default function SettingsMain() {
  const router = useRouter();
  const { theme: t, isDark, themeMode, setThemeMode, toggle: toggleTheme, fontSize, setFontSize, f } = useTheme();
  const [notifEnabled, setNotifEnabled] = React.useState(false);
  const [notifHour,    setNotifHour]    = React.useState(19);

  React.useEffect(() => {
    loadNotificationSettings().then(s => {
      setNotifEnabled(s.enabled);
      setNotifHour(s.hour);
    });
  }, []);

  const toggleNotifications = async (val: boolean) => {
    setNotifEnabled(val);
    try {
      if (val) {
        await scheduleDailyReminder(notifHour, 0, lang as 'ru'|'uk');
      } else {
        await cancelAllNotifications();
      }
    } catch {
      // expo-notifications недоступен в Expo Go — игнорируем
    }
  };
  const { lang, setLang } = useLang();
  const scrollRef = useRef<any>(null);
  const { activeIdx } = useTabNav();

  useEffect(() => {
    if (activeIdx === 4 && scrollRef.current) {
      scrollRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [activeIdx]);

  const [userName, setUserName] = useState('');
  const [nameModal, setNameModal] = useState(false);
  const [newName, setNewName]     = useState('');
  const [isPremium, setIsPremium]     = useState(false);
  const [premiumPlan, setPremiumPlan] = useState<string | null>(null);
  const [homeStyle, setHomeStyle]     = useState<'classic' | 'new'>('new');
  const [hapticTap,  setHapticTap]   = useState(true);
  const [userAvatar, setUserAvatar]   = useState('🐣');
  const [userFrame,  setUserFrame]    = useState('plain');
  const [referralCode, setReferralCode] = useState('');
  const [referralStats, setReferralStats] = useState({ totalReferrals: 0, totalBonus: 0 });
  const isUK = lang === 'uk';

  useEffect(() => {
    AsyncStorage.multiGet(['user_name', 'premium_active', 'premium_plan', 'haptics_tap', 'user_total_xp', 'user_avatar', 'user_frame', 'home_style']).then(pairs => {
      if (pairs[0][1]) {
        setUserName(pairs[0][1]);
        // Load referral code and stats
        getReferralCode(pairs[0][1]).then(setReferralCode).catch(() => {});
        getReferralStats(pairs[0][1]).then(setReferralStats).catch(() => {});
      }
      setIsPremium(pairs[1][1] === 'true');
      setPremiumPlan(pairs[2][1]);
      if (pairs[3][1] !== null) setHapticTap(pairs[3][1] !== 'false');
      const xp  = parseInt(pairs[4][1] || '0') || 0;
      const lvl = getLevelFromXP(xp);
      setUserAvatar(pairs[5][1] || getBestAvatarForLevel(lvl));
      setUserFrame(pairs[6][1]  || getBestFrameForLevel(lvl).id);
      setHomeStyle((pairs[7][1] as 'classic' | 'new') || 'new');
    });
  }, [activeIdx]); // обновляем при переключении на этот таб

  const BAD_WORDS = ['хуй','піздець','пизда','блядь','бляд','ёбан','єбан','єбать','ебать','ебал','залупа','мудак','мудила','сука','пидор','пидар','хуйня','піздюк','нахуй','нахій','сучка','мразь','тварь','ублюдок','ёб','йоб','fuck','shit','bitch','cunt','dick','ass','asshole','faggot','nigger','bastard'];
  const containsBadWord = (s: string) => {
    const low = s.toLowerCase();
    return BAD_WORDS.some(w => low.includes(w));
  };

  const saveName = async () => {
    const trimmed = newName.trim();
    if (!trimmed) { Alert.alert('', isUK ? "Введіть ім'я" : 'Введите имя'); return; }
    if (trimmed.length < 2) { Alert.alert('', isUK ? 'Мінімум 2 символи' : 'Минимум 2 символа'); return; }
    if (trimmed.length > 20) { Alert.alert('', isUK ? 'Максимум 20 символів' : 'Максимум 20 символов'); return; }
    if (containsBadWord(trimmed)) { Alert.alert('', isUK ? 'Недопустиме ім\'я' : 'Недопустимое имя'); return; }

    const oldName = userName;
    await AsyncStorage.setItem('user_name', trimmed);
    setUserName(trimmed);

    // Обновляем имя в leaderboard
    try {
      const lb = await AsyncStorage.getItem('leaderboard');
      if (lb) {
        const arr = JSON.parse(lb);
        const updated = arr.map((e: any) =>
          e.name === oldName ? { ...e, name: trimmed } : e
        );
        await AsyncStorage.setItem('leaderboard', JSON.stringify(updated));
      }
    } catch {}

    // Обновляем имя в week_leaderboard
    try {
      const wlb = await AsyncStorage.getItem('week_leaderboard');
      if (wlb) {
        const arr = JSON.parse(wlb);
        const updated = arr.map((e: any) =>
          e.name === oldName ? { ...e, name: trimmed } : e
        );
        await AsyncStorage.setItem('week_leaderboard', JSON.stringify(updated));
      }
    } catch {}

    // Обновляем имя в league_state_v3 — находим isMe:true и меняем name
    try {
      const ls = await AsyncStorage.getItem('league_state_v3');
      if (ls) {
        const state = JSON.parse(ls);
        if (state.group) {
          state.group = state.group.map((m: any) =>
            m.isMe ? { ...m, name: trimmed } : m
          );
          await AsyncStorage.setItem('league_state_v3', JSON.stringify(state));
        }
      }
    } catch {}

    // Обновляем имя в league_result_pending (если есть)
    try {
      const lrp = await AsyncStorage.getItem('league_result_pending');
      if (lrp) {
        const result = JSON.parse(lrp);
        if (result.group) {
          result.group = result.group.map((m: any) =>
            m.isMe ? { ...m, name: trimmed } : m
          );
          await AsyncStorage.setItem('league_result_pending', JSON.stringify(result));
        }
      }
    } catch {}

    setNameModal(false);
  };

  const Row = ({ icon, label, sub, onPress, right, danger }: {
    icon: string; label: string; sub?: string;
    onPress: () => void; right?: React.ReactNode; danger?: boolean;
  }) => (
    <TouchableOpacity
      style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: t.border }}
      onPress={() => { doHaptic(); onPress(); }} activeOpacity={0.7}
    >
      <Ionicons name={icon as any} size={22} color={danger ? t.wrong : t.textSecond} style={{ marginRight: 14 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: danger ? t.wrong : t.textPrimary, fontSize: f.bodyLg }}>{label}</Text>
        {sub && <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 2 }}>{sub}</Text>}
      </View>
      {right || <Ionicons name="chevron-forward" size={18} color={t.textGhost} />}
    </TouchableOpacity>
  );

  const SectionTitle = ({ title }: { title: string }) => (
    <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
      {title}
    </Text>
  );

  return (
    <ScreenGradient>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        <View style={{ paddingHorizontal:20, paddingTop:14, paddingBottom:4 }}>
          <Text style={{ color: t.textPrimary, fontSize: f.h2 + 6, fontWeight: 'bold' }}>
            {isUK ? 'Налаштування' : 'Настройки'}
          </Text>
        </View>

        <SectionTitle title={isUK ? 'Профіль' : 'Профиль'} />

        {/* Аватар */}
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: t.border }}
          onPress={() => { doHaptic(); router.push('/avatar_select'); }}
          activeOpacity={0.7}
        >
          <AnimatedFrame emoji={userAvatar} frameId={userFrame} size={40} style={{ marginRight: 14 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.bodyLg }}>{isUK ? 'Аватар і рамка' : 'Аватар и рамка'}</Text>
            <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 2 }}>{isUK ? 'Налаштувати вигляд профілю' : 'Настроить внешний вид профиля'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.textGhost} />
        </TouchableOpacity>

        <Row
          icon="person-outline"
          label={isUK ? 'Ім\'я / нікнейм' : 'Имя / никнейм'}
          sub={userName || (isUK ? 'Не задано' : 'Не задано')}
          onPress={() => { setNewName(userName); setNameModal(true); }}
        />

        {/* Язык */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
          <Ionicons name="language-outline" size={22} color={t.textSecond} style={{ marginRight: 14 }} />
          <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, flex: 1 }}>
            {isUK ? 'Мова інтерфейсу' : 'Язык интерфейса'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['ru', 'uk'] as const).map(l => (
              <TouchableOpacity
                key={l}
                activeOpacity={0.8}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: lang === l ? t.textSecond : t.border, backgroundColor: lang === l ? t.accentBg : 'transparent' }}
                onPress={() => { doHaptic(); setLang(l); }}
              >
                <Text style={{ color: lang === l ? t.textPrimary : t.textMuted, fontSize: f.sub, fontWeight: '600' }}>
                  {l.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <SectionTitle title={isUK ? 'Зовнішній вигляд' : 'Внешний вид'} />
        <View style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
            <Ionicons
              name={themeMode === 'neon' ? 'flash-outline' : themeMode === 'gold' ? 'card-outline' : themeMode === 'dark' ? 'moon-outline' : 'leaf-outline'}
              size={22} color={t.textSecond} style={{ marginRight: 14 }}
            />
            <Text style={{ color: t.textPrimary, fontSize: f.bodyLg }}>{isUK ? 'Тема' : 'Тема'}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {([
              { mode: 'dark'  as const, labelRU: 'Форест', labelUK: 'Форест', bg: '#152019', accent: '#47C870', text: '#F0F7F2', dot1: '#47C870', dot2: '#253630' },
              { mode: 'neon'  as const, labelRU: 'Неон',   labelUK: 'Неон',   bg: '#202020', accent: '#C8FF00', text: '#F0F0F0', dot1: '#C8FF00', dot2: '#343434' },
              { mode: 'gold'  as const, labelRU: 'Корал',  labelUK: 'Корал',  bg: '#14142A', accent: '#FF6464', text: '#FFFFFF',  dot1: '#FF6464', dot2: '#25254A' },
            ]).map(item => {
              const active = themeMode === item.mode;
              return (
                <TouchableOpacity
                  key={item.mode}
                  onPress={() => { doHaptic(); setThemeMode(item.mode); }}
                  activeOpacity={0.8}
                  style={{
                    flex: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 2,
                    borderRadius: 12,
                    borderWidth: active ? 2.5 : 0.5,
                    borderColor: active ? item.accent : 'rgba(128,128,128,0.25)',
                    backgroundColor: item.bg,
                  }}
                >
                  {/* Превью цветов темы */}
                  <View style={{ flexDirection: 'row', gap: 4, marginBottom: 6 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.accent }} />
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.dot1 + '88' }} />
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.dot2 }} />
                  </View>
                  <Text style={{ fontSize: 11, color: item.text, fontWeight: active ? '700' : '400', textAlign: 'center' }} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1}>
                    {isUK ? item.labelUK : item.labelRU}
                  </Text>
                  {active && (
                    <View style={{ width: 14, height: 3, borderRadius: 2, backgroundColor: item.accent, marginTop: 4 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>


        {/* РАЗМЕР ШРИФТА */}
        <View style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
            <Ionicons name="text-outline" size={22} color={t.textSecond} style={{ marginRight: 14 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.bodyLg }}>{isUK ? 'Розмір шрифту' : 'Размер шрифта'}</Text>
              <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 2 }}>
                {isUK ? FONT_SIZE_LABELS[fontSize].uk : FONT_SIZE_LABELS[fontSize].ru}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['small','medium','large'] as const).map(sz => (
              <TouchableOpacity
                key={sz}
                onPress={() => { doHaptic(); setFontSize(sz); }}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: 10,
                  borderRadius: 10,
                  borderWidth: fontSize === sz ? 2 : 0.5,
                  borderColor: fontSize === sz ? t.correct : t.border,
                  backgroundColor: fontSize === sz ? t.correctBg : t.bgCard,
                }}
              >
                <Text style={{
                  fontSize: sz === 'small' ? 12 : sz === 'medium' ? 14 : sz === 'large' ? 17 : 20,
                  fontWeight: '700',
                  color: fontSize === sz ? t.correct : t.textSecond,
                }}>A</Text>
                <Text numberOfLines={1} style={{ fontSize: 10, color: fontSize === sz ? t.correct : t.textMuted, marginTop: 4, textAlign: 'center' }}>
                  {isUK
                    ? (sz==='small'?'Малий':sz==='medium'?'Середній':sz==='large'?'Великий':'Дуже великий')
                    : (sz==='small'?'Малый':sz==='medium'?'Средний':sz==='large'?'Большой':'Очень большой')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Тактильный отклик — глобальный */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
          <Ionicons name="phone-portrait-outline" size={22} color={t.textSecond} style={{ marginRight: 14 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.bodyLg }}>{isUK ? 'Тактильний відгук' : 'Тактильный отклик'}</Text>
            <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 2 }}>{isUK ? 'Вібрація на кожному натисканні' : 'Вибрация на каждом нажатии'}</Text>
          </View>
          <CustomSwitch
            value={hapticTap}
            onValueChange={val => {
              setHapticTap(val);
              setHapticCacheEnabled(val);
              AsyncStorage.setItem('haptics_tap', String(val));
            }}
          />
        </View>

        {/* Стиль главного экрана (для тестеров) */}
        <View style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Ionicons name="layers-outline" size={22} color={t.textSecond} style={{ marginRight: 14 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.bodyLg }}>{isUK ? 'Стиль головного екрану' : 'Стиль главного экрана'}</Text>
              <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 2 }}>
                {isUK ? '🧪 Для тестерів — оберіть варіант і залиште відгук!' : '🧪 Для тестеров — выберите вариант и оставьте отзыв!'}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {([
              { key: 'new'     as const, labelRU: 'Новый',      labelUK: 'Новий',     icon: '✨' },
              { key: 'classic' as const, labelRU: 'Классический', labelUK: 'Класичний', icon: '📋' },
            ]).map(opt => (
              <TouchableOpacity
                key={opt.key}
                activeOpacity={0.8}
                onPress={() => {
                  doHaptic();
                  setHomeStyle(opt.key);
                  AsyncStorage.setItem('home_style', opt.key);
                }}
                style={{
                  flex: 1, alignItems: 'center', paddingVertical: 12,
                  borderRadius: 14,
                  borderWidth: homeStyle === opt.key ? 2 : 0.5,
                  borderColor: homeStyle === opt.key ? t.correct : t.border,
                  backgroundColor: homeStyle === opt.key ? t.correctBg : t.bgCard,
                }}
              >
                <Text style={{ fontSize: 20, marginBottom: 4 }}>{opt.icon}</Text>
                <Text style={{ color: homeStyle === opt.key ? t.correct : t.textPrimary, fontSize: f.sub, fontWeight: '700' }}>
                  {isUK ? opt.labelUK : opt.labelRU}
                </Text>
                {homeStyle === opt.key && (
                  <View style={{ width: 20, height: 3, borderRadius: 2, backgroundColor: t.correct, marginTop: 4 }} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <SectionTitle title={isUK ? 'Навчання' : 'Обучение'} />
        <Row icon="school-outline"        label={isUK ? 'Налаштування навчання' : 'Настройки обучения'}   onPress={() => router.push('/settings_edu')} />
        <Row icon="notifications-outline" label={isUK ? 'Нагадування' : 'Напоминания'} sub={isUK ? 'Щоденна мотивація' : 'Ежедневная мотивация'} onPress={() => router.push('/settings_notifications')} />

        <SectionTitle title={isUK ? 'Реферальна програма' : 'Реферальная программа'} />
        <View style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name="share-social-outline" size={22} color={t.textSecond} style={{ marginRight: 14 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '600' }}>
                {isUK ? 'Твій код' : 'Твой код'}
              </Text>
            </View>
          </View>
          {referralCode && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <View style={{ flex: 1, backgroundColor: t.bgSurface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}>
                  <Text style={{ color: t.accent, fontSize: f.bodyLg, fontWeight: '700', textAlign: 'center', letterSpacing: 1 }}>
                    {referralCode}
                  </Text>
                </View>
                <TouchableOpacity
                  style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: t.accentBg }}
                  onPress={async () => {
                    try {
                      await Share.share({
                        message: isUK
                          ? `Приєднуйся до мене у Phraseman! Код: ${referralCode}\n${STORE_URL}`
                          : `Присоединяйся ко мне в Phraseman! Код: ${referralCode}\n${STORE_URL}`,
                      });
                      doHaptic();
                    } catch {}
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="share-outline" size={18} color={t.textPrimary} />
                </TouchableOpacity>
              </View>
              {referralStats.totalReferrals > 0 && (
                <View style={{ backgroundColor: t.bgCard + '80', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }}>
                  <Text style={{ color: t.textMuted, fontSize: f.caption, marginBottom: 4 }}>
                    {isUK ? '📊 Статистика' : '📊 Статистика'}
                  </Text>
                  <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '600' }}>
                    {isUK
                      ? `${referralStats.totalReferrals} запрошень · +${referralStats.totalBonus} Фразменів`
                      : `${referralStats.totalReferrals} приглашений · +${referralStats.totalBonus} Phrasemen`}
                  </Text>
                </View>
              )}
            </>
          )}
          {!referralCode && (
            <Text style={{ color: t.textMuted, fontSize: f.caption }}>
              {isUK ? 'Завантаження...' : 'Загрузка...'}
            </Text>
          )}
        </View>

        <SectionTitle title={isUK ? 'Ще' : 'Ещё'} />
        <Row icon="play-circle-outline" label={isUK ? 'Переглянути онбординг' : 'Просмотреть онбординг'} sub={isUK ? 'Повторить пошаговое введение' : 'Повторить пошаговое введение'} onPress={async () => { doHaptic(); await AsyncStorage.removeItem('onboarding_done'); router.replace('/(tabs)/home' as any); }} />
        <Row icon="person-add-outline"  label={isUK ? 'Запросити друга' : 'Пригласить друга'}  sub={isUK ? 'Поділися застосунком' : 'Поделиться приложением'} onPress={async () => { try { await Share.share({ message: isUK ? `Вивчаю англійську з Phraseman — зручно та ефективно! 🔥 Спробуй і ти! ${STORE_URL}` : `Учу английский с Phraseman — удобно и эффективно! 🔥 Попробуй и ты! ${STORE_URL}`, url: STORE_URL }); } catch {} }} />
        <Row icon="help-circle-outline" label={isUK ? 'Допомога' : 'Помощь'}                             onPress={() => router.push('/help')} />
        <Row icon="mail-outline"        label={isUK ? 'Пропозиція або зауваження' : 'Предложение или замечание'} onPress={async () => {
          const url = 'mailto:badloar@gmail.com';
          const can = await Linking.canOpenURL(url);
          if (can) Linking.openURL(url);
        }} />
        <Row icon="people-outline"      label={isUK ? 'Бета-тестери' : 'Бета-тестеры'} onPress={() => Alert.alert(
          isUK ? 'Бета-тестери' : 'Бета-тестеры',
          isUK
            ? 'У цьому списку будуть відображені імена найактивніших і найкорисніших бета-тестерів. Вони залишатимуться тут протягом року після офіційного релізу.'
            : 'В этом списке будут отображены имена самых активных и полезных бета-тестеров. Они будут здесь на протяжении года после официального релиза.',
          [{ text: 'OK' }]
        )} />


        {/* Premium */}
        {isPremium ? (
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', margin: 20, backgroundColor: t.correctBg, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: t.correct }}
            onPress={() => router.push('/premium_modal')}
            activeOpacity={0.85}
          >
            <Ionicons name="diamond" size={26} color={t.correct} style={{ marginRight: 14 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.correct, fontSize: f.bodyLg, fontWeight: '800' }}>
                Premium {isUK ? 'активовано' : 'активирован'} ✓
              </Text>
              <Text style={{ color: t.textSecond, fontSize: f.caption, marginTop: 2 }}>
                {premiumPlan === 'yearly'
                  ? (isUK ? 'Річна підписка' : 'Годовая подписка')
                  : premiumPlan === 'monthly'
                    ? (isUK ? 'Щомісячна підписка' : 'Ежемесячная подписка')
                    : (isUK ? 'Підписка активна' : 'Подписка активна')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.correct} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', margin: 20, backgroundColor: t.bgCard, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: t.border }}
            onPress={() => router.push('/premium_modal')}
            activeOpacity={0.85}
          >
            <Ionicons name="diamond-outline" size={26} color={t.textSecond} style={{ marginRight: 14 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700' }}>Premium</Text>
              <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 2 }}>
                {isUK ? '7 днів безкоштовно · €3.99/міс або €23.99/рік' : '7 дней бесплатно · €3.99/мес или €23.99/год'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.textGhost} />
          </TouchableOpacity>
        )}

        {/* Подвал */}
        <View style={{ alignItems:'center', paddingVertical:32, marginTop:20, borderTopWidth:0.5, borderTopColor:t.border }}>
          <Text style={{ color:t.textMuted, fontSize:f.caption, fontWeight:'600', letterSpacing:0.5 }}>
            PHRASEMAN
          </Text>
          <Text style={{ color:t.textMuted, fontSize:f.caption, marginTop:4 }}>
            by Professor Lingman
          </Text>
        </View>

      </ScrollView>

      {/* Модал имени */}
      <Modal visible={nameModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '80%', backgroundColor: t.bgCard, borderRadius: 16, padding: 24 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '600', marginBottom: 16 }}>
              {isUK ? 'Змінити ім\'я' : 'Изменить имя'}
            </Text>
            <TextInput
              style={{ backgroundColor: t.bgPrimary, color: t.textPrimary, fontSize: f.h2, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: t.border, marginBottom: 20 }}
              value={newName}
              onChangeText={setNewName}
              placeholder={isUK ? 'Введіть ім\'я...' : 'Введите имя...'}
              placeholderTextColor={t.textGhost}
              autoFocus maxLength={20}
              returnKeyType="done"
              onSubmitEditing={saveName}
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity activeOpacity={0.7} style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: t.border, alignItems: 'center' }} onPress={() => { doHaptic(); setNameModal(false); }}>
                <Text style={{ color: t.textMuted, fontSize: f.body }} numberOfLines={1} adjustsFontSizeToFit>{isUK ? 'Скасувати' : 'Отмена'}</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.8} style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: t.bgSurface, alignItems: 'center' }} onPress={() => { doHaptic(); saveName(); }}>
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }} numberOfLines={1} adjustsFontSizeToFit>{isUK ? 'Зберегти' : 'Сохранить'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenGradient>
  );
}


