import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity,
  TextInput, Alert, Modal, ScrollView, DeviceEventEmitter,
  Platform, KeyboardAvoidingView, ActivityIndicator,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTabNav } from '../TabContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, FontSize, FONT_SIZE_LABELS, FONT_SCALE } from '../../components/ThemeContext';
import RegistrationPromptModal from '../../components/RegistrationPromptModal';
import ScreenGradient from '../../components/ScreenGradient';
import { scheduleDailyReminder, cancelAllNotifications, loadNotificationSettings } from '../notifications';
import { DebugLogger } from '../debug-logger';
import { useLang } from '../../components/LangContext';
import { usePremium } from '../../components/PremiumContext';
import CustomSwitch from '../../components/CustomSwitch';
import EnergyBar from '../../components/EnergyBar';
import { hapticTap as doHaptic, setHapticCacheEnabled } from '../../hooks/use-haptics';
import { DEV_MODE, ENABLE_DEV_STUDY_TARGET_LANG, FORCE_PREMIUM } from '../config';
import {
  emitDevStudyTargetChanged,
  getDevStudyTargetLang,
  setDevStudyTargetLang,
  type StudyTargetLang,
} from '../study_target_lang_dev';
import { triLang, type Lang } from '../../constants/i18n';
import { BRAND_SHARDS_ES } from '../../constants/terms_es';
import { getLinkedAuthInfo, signOutAndWipeForAccountSwitch, deleteAccountAndWipe, type LinkedAuth } from '../auth_provider';
import { isNameAvailable, reserveName } from '../firestore_leaderboard';

export default function SettingsMain() {
  const router = useRouter();
  const { theme: t, isDark, themeMode, fontSize, setFontSize, f } = useTheme();
  /**
   * Ocean / Sakura — это «светлые карточки на тёмном цветном фоне». Темы
   * рассчитаны на отрисовку контента ВНУТРИ светлой карточки (`t.bgCard`),
   * а `textPrimary` у них тёмный (navy / wine). На голом ScreenGradient
   * (без карточки) этот тёмный текст становится нечитаемым: тёмно-синий
   * на синем градиенте, тёмно-винный на розовом. Поэтому здесь, в рядах
   * которые рендерятся прямо на градиенте, подменяем цвета на светлые.
   * Внутри модалок / карточек — оставляем штатные t.textPrimary и пр.
   */
  const isGradientLight = themeMode === 'ocean' || themeMode === 'sakura';
  const screenPrimary = isGradientLight
    ? (themeMode === 'ocean' ? 'rgba(240,252,255,0.95)' : 'rgba(255,248,252,0.95)')
    : t.textPrimary;
  const screenMuted = isGradientLight
    ? (themeMode === 'ocean' ? 'rgba(200,230,255,0.78)' : 'rgba(255,210,230,0.75)')
    : t.textMuted;
  const screenSecond = isGradientLight
    ? (themeMode === 'ocean' ? 'rgba(180,235,255,0.9)' : 'rgba(255,205,225,0.9)')
    : t.textSecond;
  const screenGhost = isGradientLight
    ? (themeMode === 'ocean' ? 'rgba(180,220,250,0.55)' : 'rgba(255,200,220,0.55)')
    : t.textGhost;
  const screenBorder = isGradientLight
    ? (themeMode === 'ocean' ? 'rgba(200,230,255,0.18)' : 'rgba(255,200,220,0.18)')
    : t.border;
  const [notifEnabled, setNotifEnabled] = React.useState(false);
  const [notifHour,    setNotifHour]    = React.useState(19);

  React.useEffect(() => {
    loadNotificationSettings().then(s => {
      setNotifEnabled(s.enabled);
      setNotifHour(s.hour);
    });
  }, []);

  const { lang, s } = useLang();
  const L = (ru: string, uk: string, es: string) => triLang(lang, { ru, uk, es });
  const deleteConfirmWord = L('УДАЛИТЬ', 'ВИДАЛИТИ', 'ELIMINAR');

  const LANG_NATIVE: Record<Lang, string> = {
    ru: 'Русский',
    uk: 'Українська',
    es: 'Español',
  };

  const toggleNotifications = async (val: boolean) => {
    setNotifEnabled(val);
    try {
      if (val) {
        if (!lang) return;
        await scheduleDailyReminder(notifHour, 0, lang);
      } else {
        await cancelAllNotifications();
      }
    } catch (error) {
      DebugLogger.error('settings.tsx:toggleNotifications', error, 'warning');
    }
  };
  const scrollRef = useRef<any>(null);
  const { activeIdx } = useTabNav();

  useEffect(() => {
    if (activeIdx === 4 && scrollRef.current) {
      scrollRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [activeIdx]);

  const [userName, setUserName] = useState('');
  /** Пока false — ник ещё не прочитан из AsyncStorage (избегаем кадра «Не задано»). */
  const [nameReady, setNameReady] = useState(false);
  const [nameModal, setNameModal] = useState(false);
  const [newName, setNewName]     = useState('');
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [devThanksModal, setDevThanksModal] = useState(false);
  const { isPremium } = usePremium();
  const [premiumPlan, setPremiumPlan] = useState<string | null>(null);
  const [isDevPlatinum, setIsDevPlatinum] = useState(false);
  const [linkedAuth, setLinkedAuth] = useState<LinkedAuth | null>(null);
  /** Пока false — getLinkedAuthInfo ещё не завершился (избегаем кадра «Не привязан»). */
  const [authReady, setAuthReady] = useState(false);
  const [authPromptVisible, setAuthPromptVisible] = useState(false);
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  /**
   * UI state для flow "Сменить аккаунт" (Variant 2):
   *   'idle'        — пользователь нигде не нажал
   *   'confirm'     — показываем confirm-модалку с предупреждением
   *   'wiping'      — крутится спиннер: forced sync + signOut + wipe
   */
  const [switchAccountStage, setSwitchAccountStage] = useState<'idle' | 'confirm' | 'wiping'>('idle');

  // DEV: по умолчанию включён "Платинум Премиум", если тестер не выключил явно
  const reloadDevPlatinum = () => {
    if (!__DEV__ && !DEV_MODE) return;
    AsyncStorage.getItem('tester_no_premium').then(val => {
      setIsDevPlatinum(val !== 'true');
    });
  };

  useEffect(() => {
    reloadDevPlatinum();
    const sub1 = DeviceEventEmitter.addListener('premium_deactivated', reloadDevPlatinum);
    const sub2 = DeviceEventEmitter.addListener('premium_activated', reloadDevPlatinum);
    return () => { sub1.remove(); sub2.remove(); };
  }, []);

  const [hapticTap,  setHapticTap]   = useState(true);
  const [studyTarget, setStudyTarget] = useState<StudyTargetLang>('en');
  useEffect(() => {
    if (!ENABLE_DEV_STUDY_TARGET_LANG) return;
    void getDevStudyTargetLang(lang).then(setStudyTarget);
  }, [lang, activeIdx]);
  const isUK = lang === 'uk';
  const isES = lang === 'es';
  const currentThemeLabel = (() => {
    const names: Record<string, { ru: string; uk: string; es: string }> = {
      dark: { ru: 'Форест', uk: 'Форест', es: 'Bosque' },
      neon: { ru: 'Неон', uk: 'Неон', es: 'Neón' },
      gold: { ru: 'Корал', uk: 'Корал', es: 'Coral' },
      ocean: { ru: 'Океан', uk: 'Океан', es: 'Océano' },
      sakura: { ru: 'Сакура', uk: 'Сакура', es: 'Sakura' },
      minimalLight: { ru: 'Скетч', uk: 'Скетч', es: 'Boceto' },
      minimalDark: { ru: 'Графит', uk: 'Графіт', es: 'Grafito' },
    };
    const entry = names[themeMode] ?? names.minimalDark;
    if (isES) return entry.es;
    return isUK ? entry.uk : entry.ru;
  })();

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.multiGet(['user_name', 'premium_plan', 'haptics_tap', 'user_total_xp'])
      .then(pairs => {
        if (cancelled) return;
        if (pairs[0][1]) {
          setUserName(pairs[0][1]);
        }
        setPremiumPlan(pairs[1][1]);
        if (pairs[2][1] !== null) setHapticTap(pairs[2][1] !== 'false');
        setNameReady(true);
      })
      .catch(() => {
        if (!cancelled) setNameReady(true);
      });
    return () => { cancelled = true; };
  }, [activeIdx]); // обновляем при переключении на этот таб

  useEffect(() => {
    let alive = true;
    const refreshLinkedAuth = async () => {
      try {
        const info = await getLinkedAuthInfo();
        if (alive) setLinkedAuth(info);
      } catch {
        if (alive) setLinkedAuth(null);
      } finally {
        if (alive) setAuthReady(true);
      }
    };
    refreshLinkedAuth();
    const sub = DeviceEventEmitter.addListener('auth_provider_linked', refreshLinkedAuth);
    return () => { alive = false; sub.remove(); };
  }, []);

  const BAD_WORDS = ['хуй','піздець','пизда','блядь','бляд','ёбан','єбан','єбать','ебать','ебал','залупа','мудак','мудила','сука','пидор','пидар','хуйня','піздюк','нахуй','нахій','сучка','мразь','тварь','ублюдок','ёб','йоб','fuck','shit','bitch','cunt','dick','ass','asshole','faggot','nigger','bastard'];
  const containsBadWord = (s: string) => {
    const low = s.toLowerCase();
    return BAD_WORDS.some(w => low.includes(w));
  };

  const saveName = async () => {
    const trimmed = newName.trim();
    if (!trimmed) { Alert.alert('', L('Введите имя', "Введіть ім'я", 'Escribe un nombre o apodo')); return; }
    if (trimmed.length < 2) { Alert.alert('', L('Минимум 2 символа', 'Мінімум 2 символи', 'Mínimo 2 caracteres')); return; }
    if (trimmed.length > 20) { Alert.alert('', L('Максимум 20 символов', 'Максимум 20 символів', 'Máximo 20 caracteres')); return; }
    if (containsBadWord(trimmed)) { Alert.alert('', L('Недопустимое имя', "Недопустиме ім'я", 'Nombre no válido')); return; }

    // Быстрая read-only проверка (UI feedback) + атомарная резервация (транзакция)
    const available = await isNameAvailable(trimmed);
    if (!available) {
      Alert.alert('', L('Это имя уже занято. Выберите другое.', "Це ім'я вже зайняте. Оберіть інше.", 'Este nombre ya está en uso. Elige otro.'));
      return;
    }

    const oldName = userName;
    const reservation = await reserveName(trimmed, oldName);
    if (reservation === 'taken') {
      Alert.alert('', L('Это имя уже занято. Выберите другое.', "Це ім'я вже зайняте. Оберіть інше.", 'Este nombre ya está en uso. Elige otro.'));
      return;
    }
    if (reservation !== 'ok') {
      Alert.alert(
        '',
        L(
          'Не удалось проверить уникальность имени. Попробуйте ещё раз.',
          'Не вдалося перевірити унікальність імені. Спробуйте ще раз.',
          'No pudimos comprobar si el nombre está libre. Inténtalo de nuevo.',
        ),
      );
      return;
    }
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
    } catch (error) {
      DebugLogger.error('settings.tsx:renameName:leaderboard', error, 'warning');
    }

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
    } catch (error) {
      DebugLogger.error('settings.tsx:renameName:weekLeaderboard', error, 'warning');
    }

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
    } catch (error) {
      DebugLogger.error('settings.tsx:renameName:leagueState', error, 'warning');
    }

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
    } catch (error) {
      DebugLogger.error('settings.tsx:renameName:leagueResultPending', error, 'warning');
    }

    // Обновляем displayName в arena_profiles, чтобы топ-100 арены и карточки соперников
    // показывали актуальный ник, а не дефолтное «Игрок» с момента первого матча.
    try {
      const { CLOUD_SYNC_ENABLED, IS_EXPO_GO } = await import('../config');
      if (CLOUD_SYNC_ENABLED && !IS_EXPO_GO) {
        const { ensureAnonUser } = await import('../cloud_sync');
        const uid = await ensureAnonUser();
        if (uid) {
          const firestore = (await import('@react-native-firebase/firestore')).default;
          await firestore()
            .collection('arena_profiles')
            .doc(uid)
            .set({ displayName: trimmed, updatedAt: Date.now() }, { merge: true });
        }
      }
    } catch (error) {
      DebugLogger.error('settings.tsx:renameName:arenaProfile', error, 'warning');
    }

    setNameModal(false);
  };

  const Row = ({ icon, label, sub, onPress, right, danger }: {
    icon: string; label: string; sub?: string;
    onPress: () => void; right?: React.ReactNode; danger?: boolean;
  }) => (
    <TouchableOpacity
      style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: screenBorder }}
      onPress={() => { doHaptic(); onPress(); }} activeOpacity={0.7}
    >
      <Ionicons name={icon as any} size={22} color={danger ? t.wrong : screenSecond} style={{ marginRight: 14 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: danger ? t.wrong : screenPrimary, fontSize: f.bodyLg }}>{label}</Text>
        {sub && <Text style={{ color: screenMuted, fontSize: f.caption, marginTop: 2 }}>{sub}</Text>}
      </View>
      {right || <Ionicons name="chevron-forward" size={18} color={screenGhost} />}
    </TouchableOpacity>
  );

  const SectionTitle = ({ title }: { title: string }) => (
    <Text style={{ color: screenMuted, fontSize: f.label, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
      {title}
    </Text>
  );

  return (
    <ScreenGradient>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

        <View style={{ paddingHorizontal:20, paddingTop:14, paddingBottom:4, flexDirection:'row', alignItems:'center' }}>
          <Text style={{ color: screenPrimary, fontSize: f.h2 + 6, fontWeight: 'bold', flex:1 }}>
            {L('Настройки', 'Налаштування', 'Ajustes')}
          </Text>
          <EnergyBar size={20} />
        </View>

        {ENABLE_DEV_STUDY_TARGET_LANG && (
          <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 6 }}>
            <Text style={{ color: screenMuted, fontSize: f.label, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
              {L('Изучаемый язык', 'Мова, яку вивчаєте', 'Idioma de estudio')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(lang === 'es' ? (['en'] as const) : (['en', 'es'] as const)).map(code => {
                const active = studyTarget === code;
                const label =
                  code === 'en'
                    ? L('Английский', 'Англійська', 'Inglés')
                    : L('Испанский', 'Іспанська', 'Español');
                return (
                  <TouchableOpacity
                    key={code}
                    activeOpacity={0.85}
                    onPress={() => {
                      doHaptic();
                      void (async () => {
                        await setDevStudyTargetLang(code, lang);
                        emitDevStudyTargetChanged();
                        setStudyTarget(await getDevStudyTargetLang(lang));
                      })();
                    }}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 12,
                      borderWidth: active ? 2 : 0.5,
                      borderColor: active ? t.accent : screenBorder,
                      backgroundColor: active ? t.correctBg : t.bgCard,
                    }}
                  >
                    <Text style={{ color: active ? t.correct : screenPrimary, fontSize: f.body, fontWeight: active ? '800' : '600' }}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={{ color: screenGhost, fontSize: f.caption - 1, marginTop: 8, lineHeight: 18 }}>
              {lang === 'es'
                ? L(
                    'При испанском интерфейсе можно учить только английский.',
                    'При іспанському інтерфейсі можна вчити лише англійську.',
                    'Con la interfaz en español solo puedes estudiar inglés.',
                  )
                : L(
                    'Только в dev-сборке. Испанский — с интерфейсом на русском или украинском.',
                    'Лише в dev-збірці. Іспанська — з інтерфейсом російською чи українською.',
                    'Solo en build de desarrollo. El español como meta requiere interfaz en ruso o ucraniano.',
                  )}
            </Text>
          </View>
        )}

        <SectionTitle title={L('Профиль', 'Профіль', 'Perfil')} />

<Row
          icon="person-outline"
          label={L('Имя / никнейм', 'Ім\'я / нікнейм', 'Nombre o apodo')}
          sub={
            !nameReady
              ? '…'
              : (userName || L('Не задано', 'Не задано', 'No indicado'))
          }
          onPress={() => { setNewName(userName); setNameModal(true); }}
        />
        <Row
          icon="person-circle-outline"
          label={L('Аккаунт', 'Акаунт', 'Cuenta')}
          sub={
            !authReady
              ? '…'
              : linkedAuth
                ? `${linkedAuth.provider === 'apple' ? 'Apple' : 'Google'}${linkedAuth.email ? ` · ${linkedAuth.email}` : ''}`
                : L('Не привязан', 'Не привʼязано', 'Sin vincular')
          }
          onPress={() => {
            if (!linkedAuth) {
              setAuthPromptVisible(true);
              return;
            }
            setAccountModalVisible(true);
          }}
        />

        {/* Баннер: нет ника */}
        {nameReady && !userName && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => { doHaptic(); setNewName(''); setNameModal(true); }}
            style={{
              marginHorizontal: 20, marginTop: 8, marginBottom: 4,
              flexDirection: 'row', alignItems: 'center', gap: 10,
              backgroundColor: t.bgSurface,
              borderRadius: 12, padding: 12,
              borderWidth: 1, borderColor: t.accent + '55',
            }}
          >
            <Ionicons name="information-circle-outline" size={20} color={t.accent} />
            <Text style={{ flex: 1, color: t.textSecond, fontSize: f.caption, lineHeight: 18 }}>
              {L(
                'Установите никнейм, чтобы участвовать в клубах и рейтинге',
                'Встановіть нікнейм, щоб брати участь у клубах та рейтингу',
                'Añade un nombre o apodo para participar en el club y en la clasificación.',
              )}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={t.accent} />
          </TouchableOpacity>
        )}

        <Row
          icon="language-outline"
          label={s.settings.lang}
          sub={LANG_NATIVE[lang]}
          onPress={() => router.push('/settings_language' as any)}
        />

        <SectionTitle title={L('Внешний вид', 'Зовнішній вигляд', 'Apariencia')} />
        <Row
          icon="color-palette-outline"
          label={L('Темы', 'Теми', 'Temas')}
          sub={currentThemeLabel}
          onPress={() => router.push('/settings_themes' as any)}
        />


        {/* РАЗМЕР ШРИФТА */}
        <View style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: screenBorder }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
            <Ionicons name="text-outline" size={22} color={screenSecond} style={{ marginRight: 14 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: screenPrimary, fontSize: f.bodyLg }}>{L('Размер шрифта', 'Розмір шрифту', 'Tamaño de letra')}</Text>
              <Text style={{ color: screenMuted, fontSize: f.caption, marginTop: 2 }}>
                {triLang(lang, FONT_SIZE_LABELS[fontSize])}
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
                <Text numberOfLines={1} style={{ fontSize: f.label, color: fontSize === sz ? t.correct : t.textMuted, marginTop: 4, textAlign: 'center' }}>
                  {L(
                    sz === 'small' ? 'Малый' : sz === 'medium' ? 'Средний' : 'Большой',
                    sz === 'small' ? 'Малий' : sz === 'medium' ? 'Середній' : 'Великий',
                    sz === 'small' ? 'Pequeño' : sz === 'medium' ? 'Mediano' : 'Grande',
                  )}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Тактильный отклик — глобальный */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: screenBorder }}>
          <Ionicons name="phone-portrait-outline" size={22} color={screenSecond} style={{ marginRight: 14 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: screenPrimary, fontSize: f.bodyLg }}>{L('Тактильный отклик', 'Тактильний відгук', 'Respuesta háptica')}</Text>
            <Text style={{ color: screenMuted, fontSize: f.caption, marginTop: 2 }}>{L('Вибрация на каждом нажатии', 'Вібрація на кожному натисканні', 'Vibración ligera al pulsar')}</Text>
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

        <SectionTitle title={L('Обучение', 'Навчання', 'Aprendizaje')} />
        <Row icon="school-outline"        label={L('Настройки обучения', 'Налаштування навчання', 'Ajustes del aprendizaje')}   onPress={() => router.push('/settings_edu')} />
        <Row icon="notifications-outline" label={L('Напоминания', 'Нагадування', 'Recordatorios')} sub={L('Ежедневная мотивация', 'Щоденна мотивація', 'Motivación diaria')} onPress={() => router.push('/settings_notifications')} />


<SectionTitle title={L('Ещё', 'Ще', 'Más')} />
        <Row
          icon="person-add-outline"
          label={L('Пригласить друга', 'Запросити друга', 'Invitar a un amigo')}
          sub={L('Бонусы вам обоим', 'Бонуси вам обом', 'Recompensas para ambos')}
          onPress={() => { doHaptic(); router.push('/settings_invite_friend' as any); }}
        />
        <Row icon="help-circle-outline" label={L('Помощь / FAQ', 'Допомога / FAQ', 'Ayuda / FAQ')} sub={L('Ответы на частые вопросы', 'Відповіді на часті запитання', 'Respuestas a preguntas frecuentes')} onPress={() => { doHaptic(); router.push('/help_faq' as any); }} />
        <Row
          icon="mail-outline"
          label={L('Идеи и предложения', 'Ідеї й пропозиції', 'Comentarios e ideas')}
          sub={L(
            'До +100 осколков, если идея зайдёт',
            'До +100 осколків, якщо ідею приймемо',
            `Hasta +100 ${BRAND_SHARDS_ES.toLowerCase()} si incorporamos tu idea`,
          )}
          onPress={() => router.push('/suggestion_screen' as any)}
        />
        <Row
          icon="at-outline"
          label={L('Написать в поддержку', 'Написати в підтримку', 'Escribir a soporte')}
          sub="support.phraseman@gmail.com"
          onPress={() => {
            doHaptic();
            void Linking.openURL(
              'mailto:support.phraseman@gmail.com?subject=' + encodeURIComponent('Phraseman'),
            );
          }}
        />
        {/* "Частые вопросы" удалён — дублирует раздел "Помощь / FAQ" выше */}
        <Row icon="people-outline" label={L('Бета-тестеры', 'Бета-тестери', 'Probadores beta')} onPress={() => router.push('/beta_testers' as any)} />
        {(__DEV__ || DEV_MODE) && (
          <Row
            icon="shield-outline"
            label={L('Админ панель', 'Адмін панель', 'Panel de administración')}
            onPress={() => router.push('/settings_testers' as any)}
          />
        )}
        {/* Premium */}
        {((__DEV__ || DEV_MODE) && isDevPlatinum) || FORCE_PREMIUM ? (
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', margin: 20, backgroundColor: 'rgba(120,0,180,0.18)', borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: '#9B30FF' }}
            onPress={() => { doHaptic(); setDevThanksModal(true); }}
            activeOpacity={0.85}
          >
            <Ionicons name="diamond" size={26} color="#9B30FF" style={{ marginRight: 14 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#C060FF', fontSize: f.bodyLg, fontWeight: '800' }}>
                ПЛАТИНУМ ПРЕМИУМ ✓
              </Text>
              <Text style={{ color: '#A070D0', fontSize: f.caption, marginTop: 2 }}>
                {L('DEV-режим · все функции открыты', 'DEV-режим · всі функції відкрито', 'Modo DEV · todas las funciones desbloqueadas')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9B30FF" />
          </TouchableOpacity>
        ) : isPremium ? (
          <>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', margin: 20, backgroundColor: t.correctBg, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: t.correct }}
            onPress={() => router.push({ pathname: '/premium_modal', params: { manage: '1' } } as any)}
            activeOpacity={0.85}
          >
            <Ionicons name="diamond" size={26} color={t.correct} style={{ marginRight: 14 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.correct, fontSize: f.bodyLg, fontWeight: '800' }}>
                Premium {L('активирован', 'активовано', 'activo')} ✓
              </Text>
              <Text style={{ color: t.textSecond, fontSize: f.caption, marginTop: 2 }}>
                {premiumPlan === 'yearly'
                  ? L('Годовая подписка', 'Річна підписка', 'Suscripción anual')
                  : premiumPlan === 'monthly'
                    ? L('Ежемесячная подписка', 'Щомісячна підписка', 'Suscripción mensual')
                    : L('Подписка активна', 'Підписка активна', 'Suscripción activa')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.correct} />
          </TouchableOpacity>
          </>
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
                {L('7 дней бесплатно · месячный или годовой план', '7 днів безкоштовно · місячний або річний план', '7 días gratis · plan mensual o anual')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.textGhost} />
          </TouchableOpacity>
        )}

        {/* Удалить аккаунт */}
        <View style={{ marginHorizontal: 20, marginTop: 32, marginBottom: 8 }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: t.wrong + '60' }}
            onPress={() => {
              doHaptic();
              setDeleteConfirmInput('');
              setDeleteModal(true);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={18} color={t.wrong} style={{ marginRight: 8 }} />
            <Text style={{ color: t.wrong, fontSize: f.body, fontWeight: '500' }}>
              {L('Удалить аккаунт', 'Видалити акаунт', 'Eliminar cuenta')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Подвал */}
        <View style={{ alignItems:'center', paddingVertical:32, marginTop:20, borderTopWidth:0.5, borderTopColor:screenBorder }}>
          <View style={{ flexDirection:'row', gap:16, marginBottom:20 }}>
            <TouchableOpacity onPress={() => router.push('/privacy_screen' as any)}>
              <Text style={{ color:screenGhost, fontSize:f.caption, textDecorationLine:'underline' }}>
                Privacy Policy
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/terms_screen' as any)}>
              <Text style={{ color:screenGhost, fontSize:f.caption, textDecorationLine:'underline' }}>
                Terms of Use
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity activeOpacity={1}>
            <Text style={{ color:screenMuted, fontSize:f.caption, fontWeight:'600', letterSpacing:0.5, textAlign:'center' }}>
              PHRASEMAN
            </Text>
            <Text style={{ color:screenMuted, fontSize:f.caption, marginTop:4, textAlign:'center' }}>
              by Professor Lingman
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      <RegistrationPromptModal
        visible={authPromptVisible}
        context="settings"
        onClose={() => setAuthPromptVisible(false)}
        onSignedIn={() => {
          setAuthPromptVisible(false);
          getLinkedAuthInfo().then(setLinkedAuth).catch(() => {});
        }}
      />

      <Modal visible={accountModalVisible} transparent animationType="fade" onRequestClose={() => setAccountModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
          <View style={{ width: '100%', maxWidth: 380, backgroundColor: t.bgCard, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: t.border }}>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', marginBottom: 8 }}>
              {L('Аккаунт', 'Акаунт', 'Cuenta')}
            </Text>
            <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: 22 }}>
              {linkedAuth ? (linkedAuth.provider === 'apple' ? 'Apple' : 'Google') : L('Не привязан', 'Не привʼязано', 'Sin vincular')}
            </Text>
            {!!linkedAuth?.email && (
              <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 2 }}>
                {linkedAuth.email}
              </Text>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 22 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setAccountModalVisible(false)}
                style={{ paddingHorizontal: 10, paddingVertical: 8 }}
              >
                <Text style={{ color: t.textMuted, fontSize: f.body, fontWeight: '700' }}>
                  {L('Отмена', 'Скасувати', 'Cancelar')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setAccountModalVisible(false);
                  setSwitchAccountStage('confirm');
                }}
                style={{ paddingHorizontal: 10, paddingVertical: 8 }}
              >
                <Text style={{ color: t.correct, fontSize: f.body, fontWeight: '800' }}>
                  {L('Сменить аккаунт', 'Змінити акаунт', 'Cambiar de cuenta')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Confirm "Сменить аккаунт" (Variant 2: clean device on switch) ── */}
      <Modal
        visible={switchAccountStage === 'confirm'}
        transparent
        animationType="fade"
        onRequestClose={() => setSwitchAccountStage('idle')}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
          <View style={{ width: '100%', maxWidth: 380, backgroundColor: t.bgCard, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: t.border }}>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', marginBottom: 12 }}>
              {L('Сменить аккаунт?', 'Змінити акаунт?', '¿Cambiar de cuenta?')}
            </Text>
            <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: 22, marginBottom: 8 }}>
              {L(
                'Текущий прогресс останется привязан к аккаунту, под которым ты сейчас вошёл. Чтобы вернуться — войди под ним снова.',
                'Поточний прогрес залишиться привʼязаним до акаунту, під яким ти зараз увійшов. Щоб повернутися до нього — увійди тим самим акаунтом знову.',
                'Tu progreso quedará vinculado a la cuenta con la que iniciaste sesión. Para recuperarlo, vuelve a entrar con la misma cuenta.',
              )}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.sub, lineHeight: 20 }}>
              {L(
                'Перед выходом сохраним всё в облако. Если нет интернета — выход будет отменён.',
                'Перед виходом ми збережемо все в хмарі. Якщо немає інтернету — вихід буде відкладено.',
                'Antes de cerrar sesión guardamos todo en la nube. Sin conexión, se cancelará el cierre de sesión.',
              )}
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 22 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSwitchAccountStage('idle')}
                style={{ paddingHorizontal: 10, paddingVertical: 8 }}
              >
                <Text style={{ color: t.textMuted, fontSize: f.body, fontWeight: '700' }}>
                  {L('Отмена', 'Скасувати', 'Cancelar')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={async () => {
                  doHaptic();
                  setSwitchAccountStage('wiping');
                  const res = await signOutAndWipeForAccountSwitch();
                  setSwitchAccountStage('idle');
                  if (!res.ok) {
                    Alert.alert(
                      L('Не удалось выйти', 'Не вдалося вийти', 'No se pudo cerrar sesión'),
                      res.reason === 'sync_failed'
                        ? L(
                            'Нет связи с сервером. Прогресс не сохранён в облако — попробуй позже, когда появится интернет.',
                            'Немає звʼязку з сервером. Прогрес не збережено в хмару — спробуй пізніше, коли зʼявиться інтернет.',
                            'Sin conexión con el servidor: el progreso no se guardó en la nube. Inténtalo de nuevo cuando tengas internet.',
                          )
                        : L('Неизвестная ошибка. Попробуй ещё раз.', 'Невідома помилка. Спробуй ще раз.', 'Error desconocido. Inténtalo de nuevo.'),
                    );
                    return;
                  }
                  setLinkedAuth(null);
                  setAuthPromptVisible(true);
                }}
                style={{ paddingHorizontal: 10, paddingVertical: 8 }}
              >
                <Text style={{ color: t.correct, fontSize: f.body, fontWeight: '800' }}>
                  {L('Продолжить', 'Продовжити', 'Continuar')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Лоадер во время forced sync + signOut + wipe ── */}
      <Modal visible={switchAccountStage === 'wiping'} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <View style={{ width: '100%', maxWidth: 280, backgroundColor: t.bgCard, borderRadius: 16, padding: 28, borderWidth: 1, borderColor: t.border, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={t.correct} />
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>
              {L('Сохраняем прогресс…', 'Зберігаємо прогрес…', 'Guardando el progreso…')}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 6, textAlign: 'center' }}>
              {L('Не закрывай приложение', 'Не закривай застосунок', 'No cierres la app')}
            </Text>
          </View>
        </View>
      </Modal>

      {/* Модал благодарности тестеру (DEV Platinum) */}
      <Modal visible={devThanksModal} transparent animationType="fade" onRequestClose={() => setDevThanksModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
          <View style={{ width: '100%', maxWidth: 360, backgroundColor: 'rgba(30,0,60,0.98)', borderRadius: 24, padding: 28, borderWidth: 1.5, borderColor: '#9B30FF', alignItems: 'center' }}>
            <Text style={{ fontSize: 52, marginBottom: 12 }}>💜</Text>
            <Text style={{ color: '#C060FF', fontSize: f.h2 + 2, fontWeight: '800', textAlign: 'center', marginBottom: 16 }}>
              {L('Спасибо за помощь!', 'Дякуємо за допомогу!', '¡Gracias por tu ayuda!')}
            </Text>
            <Text style={{ color: '#D090FF', fontSize: f.body, textAlign: 'center', lineHeight: 24, marginBottom: 12 }}>
              {L(
                'Ты — часть команды, которая делает Phraseman лучше.\nТвоё участие в тестировании бесценно для нас.',
                'Ти — частина команди, яка робить Phraseman кращим.\nТвоя участь у тестуванні безцінна для нас.',
                'Formas parte del equipo que mejora Phraseman.\nTu ayuda como probador beta es muy valiosa para nosotros.',
              )}
            </Text>
            <Text style={{ color: '#A070CC', fontSize: f.caption, textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
              {L(
                'Как бета-тестер ты имеешь полный доступ ко всем функциям.\nСпасибо, что тратишь своё время на улучшение приложения! 🚀',
                'Як бета-тестер ти маєш повний доступ до всіх функцій.\nДякуємо, що витрачаєш свій час на покращення застосунку! 🚀',
                'Como probador beta tienes acceso completo a todas las funciones.\n¡Gracias por dedicar tu tiempo a mejorar la app! 🚀',
              )}
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={{ backgroundColor: '#7B20CF', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 48, width: '100%', alignItems: 'center' }}
              onPress={() => { doHaptic(); setDevThanksModal(false); }}
            >
              <Text style={{ color: '#fff', fontSize: f.bodyLg, fontWeight: '700' }}>
                {L('Закрыть', 'Закрити', 'Cerrar')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Модал имени */}
      <Modal visible={nameModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '80%', backgroundColor: t.bgCard, borderRadius: 16, padding: 24 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '600', marginBottom: 16 }}>
              {L('Изменить имя', 'Змінити ім\'я', 'Cambiar nombre')}
            </Text>
            <TextInput
              style={{ backgroundColor: t.bgPrimary, color: t.textPrimary, fontSize: f.h2, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: t.border, marginBottom: 20 }}
              value={newName}
              onChangeText={setNewName}
              placeholder={L('Введите имя...', 'Введіть ім\'я...', 'Escribe tu nombre...')}
              placeholderTextColor={t.textGhost}
              autoFocus maxLength={20}
              returnKeyType="done"
              onSubmitEditing={saveName}
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity activeOpacity={0.7} style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: t.border, alignItems: 'center' }} onPress={() => { doHaptic(); setNameModal(false); }}>
                <Text style={{ color: t.textMuted, fontSize: f.body }} numberOfLines={1} adjustsFontSizeToFit>{L('Отмена', 'Скасувати', 'Cancelar')}</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.8} style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: t.bgSurface, alignItems: 'center' }} onPress={() => { doHaptic(); saveName(); }}>
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }} numberOfLines={1} adjustsFontSizeToFit>{L('Сохранить', 'Зберегти', 'Guardar')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Модал подтверждения удаления аккаунта */}
      <Modal visible={deleteModal} transparent animationType="fade" onRequestClose={() => setDeleteModal(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={{ width: '85%', backgroundColor: t.bgCard, borderRadius: 16, padding: 24 }}>
            <Text style={{ color: t.wrong, fontSize: f.h2, fontWeight: '700', marginBottom: 8 }}>
              {L('Удалить аккаунт?', 'Видалити акаунт?', '¿Eliminar cuenta?')}
            </Text>
            <Text style={{ color: t.textSecond, fontSize: f.caption, marginBottom: 12, lineHeight: 20 }}>
              {L('Будет безвозвратно удалено:', 'Буде безповоротно видалено:', 'Se eliminará de forma permanente:')}
            </Text>
            {[
              L('📊 Весь XP и уровень', '📊 Весь XP та рівень', '📊 Todo el XP y el nivel'),
              L('🔥 Стрик и серия', '🔥 Стрік та серія', '🔥 Racha y días seguidos'),
              L('📚 Прогресс по всем урокам', '📚 Прогрес по всіх уроках', '📚 Progreso en todas las lecciones'),
              L('🃏 Сохранённые карточки', '🃏 Збережені картки', '🃏 Tarjetas guardadas'),
              L('🏆 Все достижения и медали', '🏆 Всі досягнення та медалі', '🏆 Logros y medallas'),
              L('🌍 Позиция в лиге и клубе', '🌍 Позиція у лізі та клубі', '🌍 Puesto en la liga y en el club'),
              L('⚙️ Все настройки', '⚙️ Всі налаштування', '⚙️ Todos los ajustes'),
            ].map((item, i) => (
              <Text key={i} style={{ color: t.textSecond, fontSize: f.caption, marginBottom: 4, lineHeight: 20 }}>
                {item}
              </Text>
            ))}
            <Text style={{ color: t.wrong, fontSize: f.caption, fontWeight: '600', marginTop: 10, marginBottom: 16, lineHeight: 20 }}>
              {L(
                '⚠️ Удаление аккаунта не отменяет подписку автоматически.',
                '⚠️ Видалення акаунта не скасовує підписку автоматично.',
                '⚠️ Eliminar la cuenta no cancela la suscripción automáticamente.',
              )}
            </Text>
            <Text style={{ color: t.textPrimary, fontSize: f.caption, marginBottom: 8 }}>
              {L(
                'Введите "УДАЛИТЬ" для подтверждения:',
                'Введіть "ВИДАЛИТИ" для підтвердження:',
                'Escribe «ELIMINAR» para confirmar:',
              )}
            </Text>
            <TextInput
              style={{
                backgroundColor: t.bgPrimary,
                color: t.textPrimary,
                fontSize: f.body,
                padding: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: t.border,
                marginBottom: 20,
                outlineStyle: 'none' as any,
              }}
              value={deleteConfirmInput}
              onChangeText={setDeleteConfirmInput}
              placeholder={deleteConfirmWord}
              placeholderTextColor={t.textGhost}
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus={false}
              maxLength={12}
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: t.border, alignItems: 'center' }}
                onPress={() => { doHaptic(); setDeleteModal(false); setDeleteConfirmInput(''); }}
              >
                <Text style={{ color: t.textMuted, fontSize: f.body }}>{L('Отмена', 'Скасувати', 'Cancelar')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={deleteConfirmInput !== deleteConfirmWord}
                activeOpacity={0.7}
                style={{
                  flex: 1, padding: 12, borderRadius: 10, alignItems: 'center',
                  backgroundColor: deleteConfirmInput === deleteConfirmWord ? t.wrong : t.bgSurface,
                  opacity: deleteConfirmInput === deleteConfirmWord ? 1 : 0.35,
                }}
                onPress={async () => {
                  doHaptic();
                  setDeleteModal(false);
                  setDeleteConfirmInput('');
                  // ВАЖНО: используем единый flow deleteAccountAndWipe (auth_provider.ts).
                  // Старая последовательность (deleteCloudData → AsyncStorage.clear) НЕ:
                  //   • сбрасывала stable_id в Keychain/SecureStore + in-memory cache
                  //     → следующий getStableId() возвращал старый UUID;
                  //   • не делала Google revoke + Firebase signOut + ensureAnonUser
                  //     → ре-логин через Google (после force sign-out из админки) висел
                  //     в loading-state навсегда из-за orphan auth_links/{providerUid}.
                  // Сам orphan-link дополнительно лечится в signInWithProvider
                  // (ветка !remoteUserSnap.exists), так что повторный логин уйдёт в created_new.
                  // withStorageLock здесь избыточен: deleteAccountAndWipe не конкурирует
                  // с активными синками — мы уже после signOut'а.
                  const res = await deleteAccountAndWipe();
                  if (!res.ok) {
                    Alert.alert(L('Ошибка', 'Помилка', 'Error'), L('Не удалось удалить данные.', 'Не вдалося видалити дані.', 'No se pudieron eliminar los datos.'));
                    return;
                  }
                  Alert.alert(
                    L('Аккаунт удалён', 'Акаунт видалено', 'Cuenta eliminada'),
                    L('Все ваши данные были удалены.', 'Всі ваші дані було видалено.', 'Se han eliminado todos tus datos.'),
                    [{ text: 'OK', onPress: () => { DeviceEventEmitter.emit('account_deleted'); } }]
                  );
                }}
              >
                <Text style={{ color: '#fff', fontSize: f.body, fontWeight: '700' }}>
                  {L('Удалить', 'Видалити', 'Eliminar')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </ScreenGradient>
  );
}


