import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity,
  TextInput, Modal, ScrollView, Animated, DeviceEventEmitter,
  Linking,
  Platform,
  Keyboard,
  InteractionManager,
  Pressable,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import TapScale from '../../components/TapScale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTabNav } from '../TabContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, FontSize, FONT_SIZE_LABELS, FONT_SCALE } from '../../components/ThemeContext';
import ReportErrorButton from '../../components/ReportErrorButton';
import { useBouncy, useBouncyStyle } from '../../components/BouncyScrollView';
import RegistrationPromptModal from '../../components/RegistrationPromptModal';
import ScreenGradient from '../../components/ScreenGradient';
import { useTopFadeScroll } from '../../components/TopFadeScrollContext';
import DeleteAccountConfirmModal from '../../components/DeleteAccountConfirmModal';
import CompassDepthSurface from '../../components/CompassDepthSurface';
import { scheduleDailyReminder, cancelAllNotifications, loadNotificationSettings } from '../notifications';
import { DebugLogger } from '../debug-logger';
import { useLang } from '../../components/LangContext';
import { usePremium } from '../../components/PremiumContext';
import CustomSwitch from '../../components/CustomSwitch';
import { hapticTap as doHaptic, setHapticCacheEnabled } from '../../hooks/use-haptics';
import {
  ENABLE_DEV_TOOLS,
  ENABLE_DEV_STUDY_TARGET_LANG,
  KNOWLY_LEGAL_PRIVACY_URL,
  KNOWLY_LEGAL_TERMS_URL,
} from '../config';
import {
  devStudyTargetsForUiLang,
  emitDevStudyTargetChanged,
  getDevStudyTargetLang,
  isStudyTargetSourceUiLang,
  setDevStudyTargetLang,
  studyTargetLabelForSourceUiLang,
  type StudyTargetLang,
} from '../study_target_lang_dev';
import {
  getStoredStudyTarget,
  setStoredStudyTarget,
  studyTargetsForSourceLocale,
} from '../study_target';
import { triLang, type Lang } from '../../constants/i18n';
import { SETTINGS_TESTERS_ROUTE, ADMIN_CELEBRATION_LAB_ROUTE } from '../../constants/devRoutes';
import { COMPASS_RICH, compassShadow } from '../../constants/compassTheme';
import { getLinkedAuthInfo, signOutAndWipeForAccountSwitch, type LinkedAuth } from '../auth_provider';
import { reserveName } from '../firestore_leaderboard';
import { syncMyLeagueMemberProfileNow } from '../firestore_leagues';
import { enqueueThemedBlockingInfoAlert } from '../themed_blocking_alert_queue';
import { navigateAfterModalClose } from '../safe_modal_navigation';
import { useEffectivePlatformOS } from '../platform_ui_preview';

function parseStoredExpiryMs(value: string | null | undefined): number {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function formatDateTimeShort(ms: number): string {
  if (!ms) return '';
  const d = new Date(ms);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear());
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year}, ${hour}:${minute}`;
}

export default function SettingsMain() {
  const router = useRouter();
  const effectiveOs = useEffectivePlatformOS();
  const { theme: t, isDark, themeMode, fontSize, setFontSize, f } = useTheme();
  const isCompassTheme = themeMode === 'compass';
  /**
   * Ocean / Sakura — это «светлые карточки на тёмном цветном фоне». Темы
   * рассчитаны на отрисовку контента ВНУТРИ светлой карточки (`t.bgCard`),
   * а `textPrimary` у них тёмный (navy / wine). На голом ScreenGradient
   * (без карточки) этот тёмный текст становится нечитаемым: тёмно-синий
   * на синем градиенте, тёмно-винный на розовом. Поэтому здесь, в рядах
   * которые рендерятся прямо на градиенте, подменяем цвета на светлые.
   * Внутри модалок / карточек — оставляем штатные t.textPrimary и пр.
   */
  const isGradientLight = false;
  const screenPrimary = t.textPrimary;
  const screenMuted = t.textMuted;
  const screenSecond = t.textSecond;
  const screenGhost = t.textGhost;
  const screenBorder = t.border;
  /**
   * Чипы на градиенте (Океан/Сакура): `t.bgCard` — светлая плитка → текст только тёмный (`t.textPrimary`).
   * Выбранное состояние: не `correctBg` (полупрозрачный «просвечивает» градиент) — плотная заливка + белый текст.
   */
  const chipSurfaceOff = t.bgCard;
  const chipTextOff = isGradientLight ? t.textPrimary : screenPrimary;
  /** Плотная заливка: сакура — яркая магента (#B0105C на тёмном фоне почти сливалась с белым при грязном рендере / субпиксели). */
  const chipSurfaceOn = t.correctBg;
  const chipTextOn = isGradientLight ? '#FFFFFF' : t.correct;
  const chipBorderOn = isGradientLight ? chipSurfaceOn : t.correct;
  /** Плашка Premium/VIP на градиенте: не correctBg (просвечивает) — как обычная светлая карточка + тёмный текст. */
  const premiumActiveSurface = isGradientLight ? t.bgCard : t.correctBg;
  const premiumActiveTitle = isGradientLight ? t.textPrimary : t.correct;
  const premiumActiveSub = isGradientLight ? t.textMuted : t.textSecond;
  const premiumActiveIcon = isGradientLight ? t.accent : t.correct;
  const vipActiveSurface = isGradientLight ? t.bgCard : t.accentBg;
  const vipActiveTitle = isGradientLight ? t.textPrimary : t.accent;
  const vipActiveSub = isGradientLight ? t.textMuted : t.textSecond;
  const vipActiveBorder = isGradientLight ? t.accent : t.accent;
  /** Обводка неактивного чипа на градиенте — чтобы светлая плитка не «терялась» в фоне. */
  const chipBorderOff = isGradientLight ? 'rgba(255,255,255,0.42)' : screenBorder;
  const [notifEnabled, setNotifEnabled] = React.useState(false);
  const [notifHour,    setNotifHour]    = React.useState(19);

  React.useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      loadNotificationSettings().then(s => {
        setNotifEnabled(s.enabled);
        setNotifHour(s.hour);
      });
    });
    return () => task.cancel();
  }, []);

  const { lang, s } = useLang();
  const L = (
    ru: string,
    uk: string,
    es: string,
    ptBr: string,
    vi: string,
    id: string,
    tr: string,
    pl: string,
  ) => triLang(lang, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });
  const showInfoAlert = React.useCallback(
    (title: string, message: string) => {
      void enqueueThemedBlockingInfoAlert(title || L('Сообщение', 'Повідомлення', 'Message', 'Mensagem', 'Thông báo', 'Pesan', 'Mesaj', 'Wiadomość'), message, 'OK');
    },
    [lang],
  );

  /**
   * Закрыть модалку имени после снятия фокуса с клавиатуры и завершения нативной анимации Modal —
   * иначе на Android/iOS возможен «слой-призрак», который ест тапы (фон анимируется, скролл мёртв).
   */
  const closeNameModal = useCallback(() => {
    Keyboard.dismiss();
    const delay = Platform.OS === 'android' ? 220 : 160;
    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => setNameModal(false), delay);
    });
  }, []);
  const LANG_NATIVE: Record<string, string> = {
    ru: 'Русский',
    uk: 'Українська',
    es: 'Español',
    'pt-BR': 'Português (Brasil)',
    vi: 'Tiếng Việt',
    id: 'Bahasa Indonesia',
    tr: 'Türkçe',
    pl: 'Polski',
  };

  const toggleNotifications = async (val: boolean) => {
    setNotifEnabled(val);
    try {
      if (val) {
        if (!lang) return;
        await scheduleDailyReminder(notifHour, 0, lang, { studyTarget });
      } else {
        await cancelAllNotifications();
      }
    } catch (error) {
      DebugLogger.error('settings.tsx:toggleNotifications', error, 'warning');
    }
  };
  const scrollRef = useRef<any>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const topFadeScroll = useTopFadeScroll();
  const { GestureWrap: BouncyWrap, stretch: bouncyStretch, onBouncyScroll } = useBouncy();
  const bouncyStyle = useBouncyStyle(bouncyStretch);
  const { activeIdx, focusTick, goHome } = useTabNav();
  const SETTINGS_TAB_IDX = 4;

  useEffect(() => {
    if (activeIdx === SETTINGS_TAB_IDX && scrollRef.current) {
      scrollRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [activeIdx]);

  const [userName, setUserName] = useState('');
  /** Пока false — ник ещё не прочитан из AsyncStorage (избегаем кадра «Не задано»). */
  const [nameReady, setNameReady] = useState(false);
  const [nameModal, setNameModal] = useState(false);
  const [newName, setNewName]     = useState('');
  const { isPremium, isVip, hasPremiumAccess } = usePremium();
  const [premiumPlan, setPremiumPlan] = useState<string | null>(null);
  const [vipUntilMs, setVipUntilMs] = useState(0);
  const [linkedAuth, setLinkedAuth] = useState<LinkedAuth | null>(null);
  /** Пока false — getLinkedAuthInfo ещё не завершился (избегаем кадра «Не привязан»). */
  const [authReady, setAuthReady] = useState(false);
  const [authPromptVisible, setAuthPromptVisible] = useState(false);
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [deleteAccountModalVisible, setDeleteAccountModalVisible] = useState(false);
  /**
   * UI state для flow "Сменить аккаунт" (Variant 2):
   *   'idle'        — пользователь нигде не нажал
   *   'confirm'     — показываем confirm-модалку с предупреждением
   *   'wiping'      — крутится спиннер: forced sync + signOut + wipe
   */
  const [switchAccountStage, setSwitchAccountStage] = useState<'idle' | 'confirm' | 'wiping'>('idle');

  const [hapticTap,  setHapticTap]   = useState(true);
  const [studyTarget, setStudyTarget] = useState<StudyTargetLang>('en');
  const loadStudyTarget = useCallback(async () => {
    if (!isStudyTargetSourceUiLang(lang)) {
      setStudyTarget('en');
      return;
    }
    if (ENABLE_DEV_STUDY_TARGET_LANG) {
      const devTarget = await getDevStudyTargetLang(lang);
      if (devTarget === 'es') {
        setStudyTarget('es');
        return;
      }
      if (devTarget === 'fr') {
        setStudyTarget('fr');
        return;
      }
    }
    setStudyTarget(await getStoredStudyTarget(lang));
  }, [lang]);
  useEffect(() => {
    void loadStudyTarget();
  }, [loadStudyTarget, activeIdx]);
  const currentThemeLabel = (() => {
    const names: Record<string, Record<Lang, string>> = {
      dark: { ru: 'Форест', uk: 'Форест', es: 'Bosque', 'pt-BR': 'Floresta', vi: 'Rừng', id: 'Hutan', tr: 'Orman', pl: 'Las' },
      neon: { ru: 'Неон', uk: 'Неон', es: 'Neón', 'pt-BR': 'Neon', vi: 'Neon', id: 'Neon', tr: 'Neon', pl: 'Neon' },
      gold: { ru: 'Золото', uk: 'Золото', es: 'Oro', 'pt-BR': 'Ouro', vi: 'Vàng', id: 'Emas', tr: 'Altın', pl: 'Złoto' },
      coral: { ru: 'Корал', uk: 'Корал', es: 'Coral', 'pt-BR': 'Coral', vi: 'San hô', id: 'Koral', tr: 'Mercan', pl: 'Koral' },
      minimalLight: { ru: 'Скетч', uk: 'Скетч', es: 'Boceto', 'pt-BR': 'Esboço', vi: 'Phác thảo', id: 'Sketsa', tr: 'Eskiz', pl: 'Szkic' },
      minimalDark: { ru: 'Графит', uk: 'Графіт', es: 'Grafito', 'pt-BR': 'Grafite', vi: 'Than chì', id: 'Grafit', tr: 'Grafit', pl: 'Grafit' },
      compass: { ru: 'Компас', uk: 'Компас', es: 'Brújula', 'pt-BR': 'Bússola', vi: 'La bàn', id: 'Kompas', tr: 'Pusula', pl: 'Kompas' },
    };
    const entry = names[themeMode] ?? names.minimalDark;
    return entry[lang];
  })();

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.multiGet(['user_name', 'premium_plan', 'vip_until', 'vip_expiry', 'haptics_tap', 'user_total_xp'])
      .then(pairs => {
        if (cancelled) return;
        if (pairs[0][1]) {
          setUserName(pairs[0][1]);
        }
        setPremiumPlan(pairs[1][1]);
        setVipUntilMs(parseStoredExpiryMs(pairs[2][1] ?? pairs[3][1]));
        if (pairs[4][1] !== null) setHapticTap(pairs[4][1] !== 'false');
        setNameReady(true);
      })
      .catch(() => {
        if (!cancelled) setNameReady(true);
      });
    return () => { cancelled = true; };
  }, [activeIdx]); // обновляем при переключении на этот таб

  useEffect(() => {
    const refreshVipUntil = () => {
      AsyncStorage.multiGet(['vip_until', 'vip_expiry'])
        .then(pairs => setVipUntilMs(parseStoredExpiryMs(pairs[0][1] ?? pairs[1][1])))
        .catch(() => {});
    };
    const onVipActivated = DeviceEventEmitter.addListener('vip_activated', refreshVipUntil);
    const onAccessChanged = DeviceEventEmitter.addListener('premium_access_changed', refreshVipUntil);
    return () => {
      onVipActivated.remove();
      onAccessChanged.remove();
    };
  }, []);

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

  /** Повтор при открытии «Настройки»: Firestore раньше мог не ответить, а вкладка кэширована. */
  useEffect(() => {
    if (activeIdx !== SETTINGS_TAB_IDX) return;
    let cancelled = false;
    void (async () => {
      try {
        const info = await getLinkedAuthInfo();
        if (!cancelled) setLinkedAuth(info);
      } catch {
        if (!cancelled) setLinkedAuth(null);
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [activeIdx, focusTick]);

  const BAD_WORDS = ['хуй','піздець','пизда','блядь','бляд','ёбан','єбан','єбать','ебать','ебал','залупа','мудак','мудила','сука','пидор','пидар','хуйня','піздюк','нахуй','нахій','сучка','мразь','тварь','ублюдок','ёб','йоб','fuck','shit','bitch','cunt','dick','ass','asshole','faggot','nigger','bastard'];
  const containsBadWord = (s: string) => {
    const low = s.toLowerCase();
    return BAD_WORDS.some(w => low.includes(w));
  };

  const updateLocalNameReferences = useCallback(async (fromName: string, toName: string) => {
    try {
      const lb = await AsyncStorage.getItem('leaderboard');
      if (lb) {
        const arr = JSON.parse(lb);
        const updated = arr.map((e: any) => e.name === fromName ? { ...e, name: toName } : e);
        await AsyncStorage.setItem('leaderboard', JSON.stringify(updated));
      }
    } catch (error) {
      DebugLogger.error('settings.tsx:renameName:leaderboard', error, 'warning');
    }

    try {
      const wlb = await AsyncStorage.getItem('week_leaderboard');
      if (wlb) {
        const arr = JSON.parse(wlb);
        const updated = arr.map((e: any) => e.name === fromName ? { ...e, name: toName } : e);
        await AsyncStorage.setItem('week_leaderboard', JSON.stringify(updated));
      }
    } catch (error) {
      DebugLogger.error('settings.tsx:renameName:weekLeaderboard', error, 'warning');
    }

    try {
      const ls = await AsyncStorage.getItem('league_state_v3');
      if (ls) {
        const state = JSON.parse(ls);
        if (state.group) {
          state.group = state.group.map((m: any) => m.isMe ? { ...m, name: toName } : m);
          await AsyncStorage.setItem('league_state_v3', JSON.stringify(state));
        }
      }
    } catch (error) {
      DebugLogger.error('settings.tsx:renameName:leagueState', error, 'warning');
    }

    try {
      const lrp = await AsyncStorage.getItem('league_result_pending');
      if (lrp) {
        const result = JSON.parse(lrp);
        if (result.group) {
          result.group = result.group.map((m: any) => m.isMe ? { ...m, name: toName } : m);
          await AsyncStorage.setItem('league_result_pending', JSON.stringify(result));
        }
      }
    } catch (error) {
      DebugLogger.error('settings.tsx:renameName:leagueResultPending', error, 'warning');
    }
  }, []);

  const syncArenaDisplayName = useCallback(async (displayName: string) => {
    try {
      const { CLOUD_SYNC_ENABLED, IS_EXPO_GO } = await import('../config');
      if (CLOUD_SYNC_ENABLED && !IS_EXPO_GO) {
        const { ensureArenaAuthUid } = await import('../user_id_policy');
        const uid = await ensureArenaAuthUid();
        if (uid) {
          const firestore = (await import('@react-native-firebase/firestore')).default;
          await firestore()
            .collection('arena_profiles')
            .doc(uid)
            .set({ displayName, updatedAt: Date.now() }, { merge: true });
        }
      }
    } catch (error) {
      DebugLogger.error('settings.tsx:renameName:arenaProfile', error, 'warning');
    }
  }, []);

  const saveName = async () => {
    const trimmed = newName.trim();
    if (!trimmed) { showInfoAlert('', L('Введи имя', "Введіть ім\'я", 'Escribe un nombre o apodo', 'Digite um nome ou apelido', 'Nhập tên hoặc biệt danh', 'Masukkan nama atau nama panggilan', 'Bir ad veya takma ad gir', 'Wpisz imię lub pseudonim')); return; }
    if (trimmed.length < 2) { showInfoAlert('', L('Минимум 2 символа', 'Мінімум 2 символи', 'Mínimo 2 caracteres', 'Mínimo de 2 caracteres', 'Tối thiểu 2 ký tự', 'Minimal 2 karakter', 'En az 2 karakter', 'Minimum 2 znaki')); return; }
    if (trimmed.length > 20) { showInfoAlert('', L('Максимум 20 символов', 'Максимум 20 символів', 'Máximo 20 caracteres', 'Máximo de 20 caracteres', 'Tối đa 20 ký tự', 'Maksimal 20 karakter', 'En fazla 20 karakter', 'Maksymalnie 20 znaków')); return; }
    if (containsBadWord(trimmed)) { showInfoAlert('', L('Недопустимое имя', "Недопустиме ім\'я", 'Nombre no válido', 'Nome inválido', 'Tên không hợp lệ', 'Nama tidak valid', 'Geçersiz ad', 'Niedozwolona nazwa')); return; }

    const oldName = userName.trim();
    if (trimmed === oldName) {
      closeNameModal();
      return;
    }

    try {
      await AsyncStorage.setItem('user_name', trimmed);
      setUserName(trimmed);
      await updateLocalNameReferences(oldName, trimmed);
      closeNameModal();
    } catch (error) {
      DebugLogger.error('settings.tsx:renameName:localApply', error, 'warning');
      showInfoAlert('', L(
        'Имя не сохранилось локально. Попробуй ещё раз.',
        'Не вдалося зберегти імʼя локально. Спробуйте ще раз.',
        'No pudimos guardar el nombre localmente. Inténtalo de nuevo.',
        'Não foi possível salvar o nome localmente. Tente novamente.',
        'Không thể lưu tên cục bộ. Hãy thử lại.',
        'Nama belum bisa disimpan secara lokal. Coba lagi.',
        'Ad yerel olarak kaydedilemedi. Tekrar dene.',
        'Nie udało się zapisać nazwy lokalnie. Spróbuj ponownie.',
      ));
      return;
    }

    void (async () => {
      try {
        const reservation = await reserveName(trimmed, oldName);
        if (reservation === 'taken') {
          if (oldName) await AsyncStorage.setItem('user_name', oldName);
          else await AsyncStorage.removeItem('user_name');
          setUserName(oldName);
          await updateLocalNameReferences(trimmed, oldName);
          showInfoAlert('', L('Это имя уже занято. Выбери другое.', "Це ім\'я вже зайняте. Оберіть інше.", 'Este nombre ya está en uso. Elige otro.', 'Esse nome já está em uso. Escolha outro.', 'Tên này đã được dùng. Hãy chọn tên khác.', 'Nama ini sudah dipakai. Pilih yang lain.', 'Bu ad zaten kullanılıyor. Başka bir ad seç.', 'Ta nazwa jest już zajęta. Wybierz inną.'));
          return;
        }
        if (reservation !== 'ok') {
          DebugLogger.error('settings.tsx:renameName:reserveName', new Error('reserveName failed'), 'warning');
          return;
        }
        await syncArenaDisplayName(trimmed);
        void syncMyLeagueMemberProfileNow();
      } catch (error) {
        DebugLogger.error('settings.tsx:renameName:reserveName', error, 'warning');
      }
    })();
  };

  const vipExpiryText = vipUntilMs > 0
    ? `${L('Действует до', 'Діє до', 'Active until', 'Ativo até', 'Có hiệu lực đến', 'Aktif sampai', 'Bitiş', 'Ważne do')} ${formatDateTimeShort(vipUntilMs)}`
    : L('VIP без срока окончания', 'VIP без дати завершення', 'VIP has no end date', 'VIP sem data de término', 'VIP không có ngày kết thúc', 'VIP tanpa tanggal akhir', 'VIP bitiş tarihi yok', 'VIP bez daty zakończenia');

  const Row = ({ icon, label, sub, onPress, right, danger, testID }: {
    icon: string; label: string; sub?: string;
    onPress: () => void; right?: React.ReactNode; danger?: boolean; testID?: string;
  }) => (
    <TouchableOpacity
      testID={testID}
      accessibilityLabel={testID ? `qa-${testID}` : undefined}
      accessible={!!testID}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 16,
          borderBottomWidth: isCompassTheme ? 0 : 0.5,
          borderBottomColor: screenBorder,
        },
        isCompassTheme && {
          marginHorizontal: 20,
          marginVertical: 4,
          borderRadius: 8,
          borderWidth: 0.5,
          borderColor: COMPASS_RICH.hairlineQuiet,
          backgroundColor: COMPASS_RICH.charcoalRaised,
          overflow: 'hidden',
        },
        isCompassTheme && compassShadow(1),
      ]}
      onPress={() => { doHaptic(); onPress(); }} activeOpacity={0.7}
    >
      {isCompassTheme ? <CompassDepthSurface radius={8} quiet /> : null}
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
      <BouncyWrap>
      <Animated.ScrollView
        testID="screen-settings"
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40, paddingTop: insets.top }}
        keyboardShouldPersistTaps="handled"
        decelerationRate="normal"
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false, listener: (e: any) => { topFadeScroll?.onScroll?.(e); onBouncyScroll(e); } },
        )}
      >
        <Animated.View style={bouncyStyle}>

        {/* Хедер */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={L('На главную', 'На головну', 'Inicio', 'Início', 'Trang chính', 'Beranda', 'Ana sayfa', 'Strona główna')}
            onPressIn={() => doHaptic()}
            onPress={() => goHome()}
            style={{
              width: 36, height: 36,
              borderRadius: isCompassTheme ? 8 : 18,
              backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard,
              borderWidth: 0.5,
              borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : screenBorder,
              justifyContent: 'center', alignItems: 'center',
              marginRight: 12, flexShrink: 0, overflow: 'hidden',
              ...(isCompassTheme ? compassShadow(1) : {}),
            }}
          >
            {isCompassTheme ? <CompassDepthSurface radius={8} quiet /> : null}
            <Ionicons name="chevron-back" size={20} color={chipTextOff} />
          </TouchableOpacity>
          <Text style={{ color: screenPrimary, fontSize: f.h2 + 6, fontWeight: 'bold', flex: 1 }}>
            {L('Настройки', 'Налаштування', 'Ajustes', 'Configurações', 'Cài đặt', 'Pengaturan', 'Ayarlar', 'Ustawienia')}
          </Text>
        </View>

        {/* ── DEV: Превью празднований (самый верх, только для разработчика) ──────── */}
        {ENABLE_DEV_TOOLS && (
          <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 }}>
            <Text style={{ color: screenMuted, fontSize: f.label, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
              {L('Дизайн-лаборатория (DEV)', 'Дизайн-лабораторія (DEV)', 'Laboratorio de diseño (DEV)', 'Laboratório de design (DEV)', 'Phòng thiết kế (DEV)', 'Lab desain (DEV)', 'Tasarım laboratuvarı (DEV)', 'Laboratorium projektowe (DEV)')}
            </Text>
            <TouchableOpacity
              testID="settings-open-celebration-lab"
              activeOpacity={0.85}
              onPressIn={() => doHaptic()}
              onPress={() => router.push(ADMIN_CELEBRATION_LAB_ROUTE as any)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 16,
                borderRadius: 16,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: 'rgba(255,215,128,0.45)',
                backgroundColor: 'rgba(255,196,77,0.10)',
              }}
            >
              <LinearGradient
                colors={['rgba(255,213,128,0.16)', 'rgba(255,170,60,0.06)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={{
                width: 42, height: 42, borderRadius: 21,
                alignItems: 'center', justifyContent: 'center',
                marginRight: 14,
                backgroundColor: 'rgba(255,196,77,0.18)',
                borderWidth: 1, borderColor: 'rgba(255,215,128,0.4)',
              }}>
                <Text style={{ fontSize: 22 }}>🎉</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: screenPrimary, fontSize: f.bodyLg, fontWeight: '800' }}>
                  {L('Празднование победы', 'Святкування перемоги', 'Celebración de victoria', 'Celebração de vitória', 'Ăn mừng chiến thắng', 'Perayaan kemenangan', 'Zafer kutlaması', 'Świętowanie zwycięstwa')}
                </Text>
                <Text style={{ color: screenMuted, fontSize: f.caption, marginTop: 3, lineHeight: 17 }}>
                  {L('Превью нового экрана завершения урока', 'Прев’ю нового екрана завершення уроку', 'Vista previa de la nueva pantalla de fin de lección', 'Prévia da nova tela de fim de lição', 'Xem trước màn hình hoàn thành bài học mới', 'Pratinjau layar penyelesaian pelajaran baru', 'Yeni ders bitiş ekranının önizlemesi', 'Podgląd nowego ekranu ukończenia lekcji')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,215,128,0.9)" />
            </TouchableOpacity>
          </View>
        )}

        {isStudyTargetSourceUiLang(lang) && (
          <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 6 }}>
            <Text style={{ color: screenMuted, fontSize: f.label, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
              {L('Изучаемый язык', 'Мова, яку вивчаєте', 'Idioma de estudio', 'Idioma de estudo', 'Ngôn ngữ học', 'Bahasa yang dipelajari', 'Öğrenilen dil', 'Język nauki')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(ENABLE_DEV_STUDY_TARGET_LANG ? devStudyTargetsForUiLang(lang) : studyTargetsForSourceLocale(lang)).map(code => {
                const active = studyTarget === code;
                const label = studyTargetLabelForSourceUiLang(code, lang);
                return (
                  <TouchableOpacity
                    key={code}
                    activeOpacity={0.85}
                    onPress={() => {
                      doHaptic();
                      void (async () => {
                        if (ENABLE_DEV_STUDY_TARGET_LANG && (code === 'es' || code === 'fr')) {
                          await setDevStudyTargetLang(code, lang);
                        } else {
                          await setStoredStudyTarget(code === 'en' ? code : 'en', lang);
                          if (ENABLE_DEV_STUDY_TARGET_LANG) {
                            await setDevStudyTargetLang('en', lang);
                          }
                        }
                        emitDevStudyTargetChanged();
                        await loadStudyTarget();
                      })();
                    }}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: isCompassTheme ? 8 : 12,
                      borderWidth: active ? (isCompassTheme ? 1 : 2) : 0.5,
                      borderColor: isCompassTheme ? (active ? COMPASS_RICH.hairlineStrong : COMPASS_RICH.hairlineQuiet) : active ? (isGradientLight ? chipSurfaceOn : t.accent) : chipBorderOff,
                      backgroundColor: isCompassTheme ? (active ? COMPASS_RICH.champagne : COMPASS_RICH.charcoalRaised) : active ? chipSurfaceOn : chipSurfaceOff,
                      overflow: 'hidden',
                      ...(isCompassTheme && active ? compassShadow(1) : {}),
                    }}
                  >
                    {isCompassTheme ? <CompassDepthSurface radius={8} quiet={!active} cream={active} /> : null}
                    <Text style={{ color: isCompassTheme ? (active ? COMPASS_RICH.textDark : screenPrimary) : active ? chipTextOn : chipTextOff, fontSize: f.body, fontWeight: active ? '800' : '600' }}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={{ color: screenGhost, fontSize: f.caption - 1, marginTop: 8, lineHeight: 18 }}>
              {L(
                ENABLE_DEV_STUDY_TARGET_LANG
                  ? 'French доступен только в DEV-режиме. В публичной версии открыт английский.'
                  : 'В публичной версии сейчас открыт английский.',
                ENABLE_DEV_STUDY_TARGET_LANG
                  ? 'French доступна лише в DEV-режимі. У публічній версії відкрита англійська.'
                  : 'У публічній версії зараз відкрита англійська.',
                ENABLE_DEV_STUDY_TARGET_LANG
                  ? 'French is DEV-only. The public version keeps English active.'
                  : 'The public version currently keeps English active.',
                ENABLE_DEV_STUDY_TARGET_LANG
                  ? 'French is DEV-only. The public version keeps English active.'
                  : 'The public version currently keeps English active.',
                ENABLE_DEV_STUDY_TARGET_LANG
                  ? 'French is DEV-only. The public version keeps English active.'
                  : 'The public version currently keeps English active.',
                ENABLE_DEV_STUDY_TARGET_LANG
                  ? 'French is DEV-only. The public version keeps English active.'
                  : 'The public version currently keeps English active.',
                ENABLE_DEV_STUDY_TARGET_LANG
                  ? 'French is DEV-only. The public version keeps English active.'
                  : 'The public version currently keeps English active.',
                ENABLE_DEV_STUDY_TARGET_LANG
                  ? 'French is DEV-only. The public version keeps English active.'
                  : 'The public version currently keeps English active.',
              )}
            </Text>
          </View>
        )}

        <SectionTitle title={L('Профиль', 'Профіль', 'Perfil', 'Perfil', 'Hồ sơ', 'Profil', 'Profil', 'Profil')} />

        <Row
          testID="settings-profile-row"
          icon="person-outline"
          label={L('Имя / никнейм', 'Ім\'я / нікнейм', 'Nombre o apodo', 'Nome / apelido', 'Tên / biệt danh', 'Nama / panggilan', 'Ad / takma ad', 'Imię / pseudonim')}
          sub={
            false && !nameReady ? '' : (userName || L('Не задано', 'Не задано', 'No indicado', 'Não definido', 'Chưa đặt', 'Belum diatur', 'Ayarlanmadı', 'Nie ustawiono'))
          }
          onPress={() => { setNewName(userName); setNameModal(true); }}
        />
        <Row
          icon="person-circle-outline"
          label={L('Аккаунт', 'Акаунт', 'Cuenta', 'Conta', 'Tài khoản', 'Akun', 'Hesap', 'Konto')}
          sub={
            false && !authReady ? '' : linkedAuth
                ? `${linkedAuth.provider === 'apple' ? 'Apple' : 'Google'}${linkedAuth.email ? ` · ${linkedAuth.email}` : ''}`
                : L('Не привязан', "Не прив\'язано", 'Sin vincular', 'Não vinculada', 'Chưa liên kết', 'Belum ditautkan', 'Bağlı değil', 'Nie połączono')
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
              backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgSurface,
              borderRadius: isCompassTheme ? 8 : 12, padding: 12,
              borderWidth: 1, borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : t.accent + '55',
              overflow: 'hidden',
              ...(isCompassTheme ? compassShadow(1) : {}),
            }}
          >
            {isCompassTheme ? <CompassDepthSurface radius={8} quiet /> : null}
            <Ionicons name="information-circle-outline" size={20} color={t.accent} />
            <Text style={{ flex: 1, color: t.textSecond, fontSize: f.caption, lineHeight: 18 }}>
              {L(
                'Установите никнейм, чтобы участвовать в клубах и рейтинге',
                'Встановіть нікнейм, щоб брати участь у клубах та рейтингу',
                'Añade un nombre o apodo para participar en el club y en la clasificación.',
                'Adicione um apelido para participar dos clubes e do ranking.',
                'Đặt biệt danh để tham gia câu lạc bộ và bảng xếp hạng.',
                'Tambahkan nama panggilan untuk ikut klub dan peringkat.',
                'Kulüplere ve sıralamaya katılmak için bir takma ad ekle.',
                'Ustaw pseudonim, aby brać udział w klubach i rankingach.',
              )}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={t.accent} />
          </TouchableOpacity>
        )}

        <Row
          testID="settings-language-row"
          icon="language-outline"
          label={s.settings.lang}
          sub={LANG_NATIVE[lang]}
          onPress={() => router.push('/settings_language' as any)}
        />

        <SectionTitle title={L('Внешний вид', 'Зовнішній вигляд', 'Apariencia', 'Aparência', 'Giao diện', 'Tampilan', 'Görünüm', 'Wygląd')} />
        <Row
          icon="color-palette-outline"
          label={L('Темы', 'Теми', 'Temas', 'Temas', 'Chủ đề', 'Tema', 'Temalar', 'Motywy')}
          sub={currentThemeLabel}
          onPress={() => router.push('/settings_themes' as any)}
        />


        {/* РАЗМЕР ШРИФТА */}
        <View style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: screenBorder }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
            <Ionicons name="text-outline" size={22} color={screenSecond} style={{ marginRight: 14 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: screenPrimary, fontSize: f.bodyLg }}>{L('Размер шрифта', 'Розмір шрифту', 'Tamaño de letra', 'Tamanho da fonte', 'Cỡ chữ', 'Ukuran font', 'Yazı boyutu', 'Rozmiar czcionki')}</Text>
              <Text style={{ color: screenMuted, fontSize: f.caption, marginTop: 2 }}>
                {triLang(lang, {
                  ru: FONT_SIZE_LABELS[fontSize].ru,
                  uk: FONT_SIZE_LABELS[fontSize].uk,
                  es: FONT_SIZE_LABELS[fontSize].es,
                  'pt-BR': FONT_SIZE_LABELS[fontSize]['pt-BR'],
                  vi: FONT_SIZE_LABELS[fontSize].vi,
                  id: FONT_SIZE_LABELS[fontSize].id,
                  tr: FONT_SIZE_LABELS[fontSize].tr,
                  pl: FONT_SIZE_LABELS[fontSize].pl,
                })}
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
                  borderRadius: isCompassTheme ? 8 : 10,
                  borderWidth: fontSize === sz ? (isCompassTheme ? 1 : 2) : 0.5,
                  borderColor: isCompassTheme
                    ? (fontSize === sz ? COMPASS_RICH.hairlineStrong : COMPASS_RICH.hairlineQuiet)
                    : fontSize === sz ? chipBorderOn : (isGradientLight ? chipBorderOff : t.border),
                  backgroundColor: isCompassTheme
                    ? (fontSize === sz ? COMPASS_RICH.champagne : COMPASS_RICH.charcoalRaised)
                    : fontSize === sz ? chipSurfaceOn : chipSurfaceOff,
                  overflow: 'hidden',
                  ...(isCompassTheme && fontSize === sz ? compassShadow(1) : {}),
                }}
              >
                {isCompassTheme ? <CompassDepthSurface radius={8} quiet={fontSize !== sz} cream={fontSize === sz} /> : null}
                <Text style={{
                  fontSize: sz === 'small' ? 12 : sz === 'medium' ? 14 : sz === 'large' ? 17 : 20,
                  fontWeight: '700',
                  color: isCompassTheme ? (fontSize === sz ? COMPASS_RICH.textDark : screenSecond) : fontSize === sz ? chipTextOn : t.textSecond,
                }}>A</Text>
                <Text numberOfLines={1} style={{ fontSize: f.label, color: isCompassTheme ? (fontSize === sz ? COMPASS_RICH.textDark : screenMuted) : fontSize === sz ? chipTextOn : t.textMuted, marginTop: 4, textAlign: 'center' }}>
                  {L(
                    sz === 'small' ? 'Малый' : sz === 'medium' ? 'Средний' : 'Большой',
                    sz === 'small' ? 'Малий' : sz === 'medium' ? 'Середній' : 'Великий',
                    sz === 'small' ? 'Pequeño' : sz === 'medium' ? 'Mediano' : 'Grande',
                    sz === 'small' ? 'Pequeno' : sz === 'medium' ? 'Médio' : 'Grande',
                    sz === 'small' ? 'Nhỏ' : sz === 'medium' ? 'Vừa' : 'Lớn',
                    sz === 'small' ? 'Kecil' : sz === 'medium' ? 'Sedang' : 'Besar',
                    sz === 'small' ? 'Küçük' : sz === 'medium' ? 'Orta' : 'Büyük',
                    sz === 'small' ? 'Mały' : sz === 'medium' ? 'Średni' : 'Duży',
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
            <Text style={{ color: screenPrimary, fontSize: f.bodyLg }}>{L('Тактильный отклик', 'Тактильний відгук', 'Respuesta háptica', 'Resposta tátil', 'Phản hồi rung', 'Umpan balik haptik', 'Dokunsal geri bildirim', 'Reakcja haptyczna')}</Text>
            <Text style={{ color: screenMuted, fontSize: f.caption, marginTop: 2 }}>{L('Вибрация на каждом нажатии', 'Вібрація на кожному натисканні', 'Vibración ligera al pulsar', 'Vibração leve a cada toque', 'Rung nhẹ khi chạm', 'Getaran ringan setiap ketukan', 'Her dokunuşta hafif titreşim', 'Lekka wibracja przy każdym dotknięciu')}</Text>
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

        <SectionTitle title={L('Обучение', 'Навчання', 'Aprendizaje', 'Aprendizado', 'Học tập', 'Pembelajaran', 'Öğrenme', 'Nauka')} />
        <Row icon="school-outline"        label={L('Настройки обучения', 'Налаштування навчання', 'Ajustes del aprendizaje', 'Configurações de aprendizado', 'Cài đặt học tập', 'Pengaturan pembelajaran', 'Öğrenme ayarları', 'Ustawienia nauki')}   onPress={() => router.push('/settings_edu')} />
        <Row icon="notifications-outline" label={L('Напоминания', 'Нагадування', 'Recordatorios', 'Lembretes', 'Nhắc nhở', 'Pengingat', 'Hatırlatıcılar', 'Przypomnienia')} sub={L('Ежедневная мотивация', 'Щоденна мотивація', 'Motivación diaria', 'Motivação diária', 'Động lực hằng ngày', 'Motivasi harian', 'Günlük motivasyon', 'Codzienna motywacja')} onPress={() => router.push('/settings_notifications')} />


<SectionTitle title={L('Ещё', 'Ще', 'Más', 'Mais', 'Thêm', 'Lainnya', 'Daha fazla', 'Więcej')} />
        <Row
          icon="at-outline"
          label={L('Написать в поддержку', 'Написати в підтримку', 'Escribir a soporte', 'Escrever para o suporte', 'Liên hệ hỗ trợ', 'Tulis ke dukungan', 'Desteğe yaz', 'Napisz do pomocy')}
          sub="support.phraseman@gmail.com"
          onPress={() => {
            doHaptic();
            void Linking.openURL(
              'mailto:support.phraseman@gmail.com?subject=' + encodeURIComponent('Phraseman'),
            );
          }}
        />
        {effectiveOs === 'android' && (
          <Row icon="people-outline" label={L('Бета-тестеры', 'Бета-тестери', 'Probadores beta', 'Testadores beta', 'Người thử nghiệm beta', 'Penguji beta', 'Beta test kullanıcıları', 'Beta testerzy')} onPress={() => router.push('/beta_testers' as any)} />
        )}
        {ENABLE_DEV_TOOLS && (
          <Row
            icon="construct-outline"
            label={L('Админ панель', 'Адмін панель', 'Panel admin', 'Painel admin', 'Bảng quản trị', 'Panel admin', 'Yönetici paneli', 'Panel admina')}
            onPress={() => router.push(SETTINGS_TESTERS_ROUTE as any)}
            testID="settings-open-testers"
          />
        )}
        {isVip && !isPremium && (
          <View testID="settings-vip-card" style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginHorizontal: 20,
            marginTop: 20,
            marginBottom: -4,
            backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : vipActiveSurface,
            borderRadius: isCompassTheme ? 8 : 14,
            padding: 14,
            borderWidth: 1,
            borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : vipActiveBorder,
            overflow: 'hidden',
            ...(isCompassTheme ? compassShadow(2) : {}),
          }}>
            {isCompassTheme ? <CompassDepthSurface radius={8} selected /> : null}
            <Ionicons name="shield-checkmark-outline" size={24} color={isCompassTheme ? COMPASS_RICH.champagne : vipActiveTitle} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: isCompassTheme ? COMPASS_RICH.cream : vipActiveTitle, fontSize: f.body, fontWeight: '900' }}>VIP</Text>
              <Text testID="settings-vip-subtitle" style={{ color: isCompassTheme ? COMPASS_RICH.textMuted : vipActiveSub, fontSize: f.caption, marginTop: 2 }}>
                {L('VIP аккаунт', 'VIP акаунт', 'Cuenta VIP', 'Conta VIP', 'Tài khoản VIP', 'Akun VIP', 'VIP hesap', 'Konto VIP')}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
                <Ionicons name="time-outline" size={13} color={isCompassTheme ? COMPASS_RICH.textMuted : vipActiveSub} />
                <Text testID="settings-vip-expiry" style={{ color: isCompassTheme ? COMPASS_RICH.textMuted : vipActiveSub, fontSize: f.caption, fontWeight: '800', flex: 1 }}>
                  {vipExpiryText}
                </Text>
              </View>
            </View>
          </View>
        )}
        {/* Premium — одна плашка: контекст уже учитывает DEV / FORCE_PREMIUM / RevenueCat / VIP */}
        {hasPremiumAccess ? (
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              margin: 20,
              backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : premiumActiveSurface,
              borderRadius: isCompassTheme ? 8 : 14,
              padding: 16,
              borderWidth: 1,
              borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : t.correct,
              overflow: 'hidden',
              ...(isCompassTheme ? compassShadow(2) : {}),
            }}
            onPress={() => router.push({ pathname: '/premium_modal', params: { manage: '1' } } as any)}
            activeOpacity={0.85}
          >
            {isCompassTheme ? <CompassDepthSurface radius={8} selected /> : null}
            <Ionicons name="diamond" size={26} color={isCompassTheme ? COMPASS_RICH.champagne : premiumActiveIcon} style={{ marginRight: 14 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: isCompassTheme ? COMPASS_RICH.cream : premiumActiveTitle, fontSize: f.bodyLg, fontWeight: '800' }}>
                Premium {L('активирован', 'активовано', 'activo', 'ativado', 'đã kích hoạt', 'aktif', 'aktif', 'aktywne')} ✓
              </Text>
              <Text style={{ color: isCompassTheme ? COMPASS_RICH.textMuted : premiumActiveSub, fontSize: f.caption, marginTop: 2 }}>
                {isVip && !isPremium
                  ? `${L('VIP доступ активен', 'VIP доступ активний', 'VIP access active', 'Acesso VIP ativo', 'Quyền VIP đang hoạt động', 'Akses VIP aktif', 'VIP erişim aktif', 'Dostęp VIP aktywny')} · ${vipExpiryText}`
                  : premiumPlan === 'yearly'
                  ? L('Годовая подписка', 'Річна підписка', 'Suscripción anual', 'Assinatura anual', 'Gói hằng năm', 'Langganan tahunan', 'Yıllık abonelik', 'Subskrypcja roczna')
                  : premiumPlan === 'monthly'
                    ? L('Ежемесячная подписка', 'Щомісячна підписка', 'Suscripción mensual', 'Assinatura mensal', 'Gói hằng tháng', 'Langganan bulanan', 'Aylık abonelik', 'Subskrypcja miesięczna')
                    : L('Подписка активна', 'Підписка активна', 'Suscripción activa', 'Assinatura ativa', 'Gói đăng ký đang hoạt động', 'Langganan aktif', 'Abonelik aktif', 'Subskrypcja aktywna')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={isCompassTheme ? COMPASS_RICH.champagne : premiumActiveIcon} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              {
                flexDirection: 'row',
                alignItems: 'center',
                margin: 20,
                backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard,
                borderRadius: isCompassTheme ? 8 : 14,
                padding: 16,
                borderWidth: 0.5,
                borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : t.border,
                overflow: 'hidden',
              },
              isCompassTheme && compassShadow(1),
            ]}
            onPress={() => router.push({ pathname: '/premium_modal', params: { context: 'generic', source: 'settings_premium' } } as any)}
            activeOpacity={0.85}
          >
            {isCompassTheme ? <CompassDepthSurface radius={8} quiet /> : null}
            <Ionicons name="diamond-outline" size={26} color={t.textSecond} style={{ marginRight: 14 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700' }}>
                Premium
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 2 }}>
                {L('Месячный или годовой план', 'Місячний або річний план', 'Plan mensual o anual', 'Plano mensal ou anual', 'Gói tháng hoặc năm', 'Paket bulanan atau tahunan', 'Aylık veya yıllık plan', 'Plan miesięczny albo roczny')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.textGhost} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          testID="settings-delete-account"
          accessibilityRole="button"
          hitSlop={{ top: 12, right: 20, bottom: 12, left: 20 }}
          activeOpacity={0.7}
          onPress={() => {
            doHaptic();
            setDeleteAccountModalVisible(true);
          }}
          style={{ alignSelf: 'center', marginTop: -4, paddingHorizontal: 18, paddingVertical: 10 }}
        >
          <Text style={{ color: screenGhost, fontSize: f.caption, fontWeight: '600', textAlign: 'center' }}>
            {L('Удалить аккаунт и данные', 'Видалити акаунт і дані', 'Eliminar cuenta y datos', 'Excluir conta e dados', 'Xóa tài khoản và dữ liệu', 'Hapus akun dan data', 'Hesabı ve verileri sil', 'Usuń konto i dane')}
          </Text>
        </TouchableOpacity>

        {/* Подвал */}
        <View style={{ alignItems:'center', paddingVertical:32, marginTop:20, borderTopWidth:0.5, borderTopColor:screenBorder }}>
          <View style={{ flexDirection:'row', gap:16, marginBottom:20 }}>
            <TapScale
              onPress={() => {
                doHaptic();
                void Linking.openURL(KNOWLY_LEGAL_PRIVACY_URL);
              }}
              withHaptic={false}
            >
              <Text style={{ color:screenGhost, fontSize:f.caption, textDecorationLine:'underline' }}>
                Privacy Policy
              </Text>
            </TapScale>
            <TapScale
              onPress={() => {
                doHaptic();
                void Linking.openURL(KNOWLY_LEGAL_TERMS_URL);
              }}
              withHaptic={false}
            >
              <Text style={{ color:screenGhost, fontSize:f.caption, textDecorationLine:'underline' }}>
                Terms of Use
              </Text>
            </TapScale>
          </View>
          <TouchableOpacity activeOpacity={1}>
            <Text style={{ color:screenMuted, fontSize:f.caption, fontWeight:'600', letterSpacing:0.5, textAlign:'center' }}>
              PHRASEMAN
            </Text>
            <Text style={{ color:screenMuted, fontSize:f.caption, marginTop:4, textAlign:'center' }}>
              by Knowly
            </Text>
          </TouchableOpacity>
          <View style={{ alignItems: 'center', marginTop: 16 }}>
            <ReportErrorButton
              screen="settings_tab"
              dataId="settings_main"
              dataText={triLang(lang, {
                ru: 'Настройки',
                uk: 'Налаштування',
                es: 'Ajustes',
                'pt-BR': 'Configurações',
                vi: 'Cài đặt',
                id: 'Pengaturan',
                tr: 'Ayarlar',
                pl: 'Ustawienia',
              })}
            />
          </View>
        </View>

        </Animated.View>
      </Animated.ScrollView>
      </BouncyWrap>


      <RegistrationPromptModal
        visible={authPromptVisible}
        context="settings"
        onClose={() => setAuthPromptVisible(false)}
        onSignedIn={() => {
          setAuthPromptVisible(false);
          getLinkedAuthInfo().then(setLinkedAuth).catch(() => {});
        }}
      />

      <DeleteAccountConfirmModal
        visible={deleteAccountModalVisible}
        onRequestClose={() => setDeleteAccountModalVisible(false)}
      />

      <Modal visible={accountModalVisible} transparent animationType="fade" onRequestClose={() => setAccountModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
          <View
            style={[
              {
                width: '100%',
                maxWidth: 380,
                backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard,
                borderRadius: isCompassTheme ? 10 : 16,
                padding: 20,
                borderWidth: 1,
                borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : t.border,
                overflow: 'hidden',
              },
              isCompassTheme && compassShadow(3),
            ]}
          >
            {isCompassTheme ? <CompassDepthSurface radius={10} selected /> : null}
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', marginBottom: 8 }}>
              {L('Аккаунт', 'Акаунт', 'Cuenta', 'Conta', 'Tài khoản', 'Akun', 'Hesap', 'Konto')}
            </Text>
            <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: 22 }}>
              {linkedAuth ? (linkedAuth.provider === 'apple' ? 'Apple' : 'Google') : L('Не привязан', "Не прив\'язано", 'Sin vincular', 'Não vinculada', 'Chưa liên kết', 'Belum ditautkan', 'Bağlı değil', 'Nie połączono')}
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
                  {L('Отмена', 'Скасувати', 'Cancelar', 'Cancelar', 'Hủy', 'Batal', 'Vazgeç', 'Anuluj')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  navigateAfterModalClose(
                    () => setAccountModalVisible(false),
                    () => setSwitchAccountStage('confirm'),
                  );
                }}
                style={{ paddingHorizontal: 10, paddingVertical: 8 }}
              >
                <Text style={{ color: t.correct, fontSize: f.body, fontWeight: '800' }}>
                  {L('Сменить аккаунт', 'Змінити акаунт', 'Cambiar de cuenta', 'Trocar de conta', 'Đổi tài khoản', 'Ganti akun', 'Hesap değiştir', 'Zmień konto')}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              testID="account-modal-delete-account"
              activeOpacity={0.8}
              onPress={() => {
                navigateAfterModalClose(
                  () => setAccountModalVisible(false),
                  () => setDeleteAccountModalVisible(true),
                );
              }}
              style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 0.5, borderTopColor: t.border }}
            >
              <Text style={{ color: t.wrong, fontSize: f.caption, fontWeight: '800', textAlign: 'right' }}>
                {L('Удалить аккаунт и данные', 'Видалити акаунт і дані', 'Eliminar cuenta y datos', 'Excluir conta e dados', 'Xóa tài khoản và dữ liệu', 'Hapus akun dan data', 'Hesabı ve verileri sil', 'Usuń konto i dane')}
              </Text>
            </TouchableOpacity>
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
          <View
            style={[
              {
                width: '100%',
                maxWidth: 380,
                backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard,
                borderRadius: isCompassTheme ? 10 : 16,
                padding: 20,
                borderWidth: 1,
                borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : t.border,
                overflow: 'hidden',
              },
              isCompassTheme && compassShadow(3),
            ]}
          >
            {isCompassTheme ? <CompassDepthSurface radius={10} selected /> : null}
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', marginBottom: 12 }}>
              {L('Сменить аккаунт?', 'Змінити акаунт?', '¿Cambiar de cuenta?', 'Trocar de conta?', 'Đổi tài khoản?', 'Ganti akun?', 'Hesap değiştirilsin mi?', 'Zmienić konto?')}
            </Text>
            <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: 22, marginBottom: 8 }}>
              {L(
                'Текущий прогресс останется привязан к аккаунту, под которым ты сейчас вошёл. Чтобы вернуться — войди под ним снова.',
                "Поточний прогрес залишиться прив\'язаним до акаунту, під яким ти зараз увійшов. Щоб повернутися до нього — увійди тим самим акаунтом знову.",
                'Tu progreso quedará vinculado a la cuenta con la que iniciaste sesión. Para recuperarlo, vuelve a entrar con la misma cuenta.',
                'Seu progresso atual ficará vinculado à conta em que você está conectado agora. Para voltar, entre nela novamente.',
                'Tiến độ hiện tại sẽ gắn với tài khoản bạn đang đăng nhập. Muốn quay lại, hãy đăng nhập lại bằng tài khoản đó.',
                'Progres saat ini akan tetap terhubung ke akun yang sedang kamu pakai. Untuk kembali, masuk lagi dengan akun yang sama.',
                'Mevcut ilerlemen şu anda giriş yaptığın hesaba bağlı kalacak. Geri dönmek için aynı hesapla tekrar giriş yap.',
                'Obecny postęp pozostanie przypisany do konta, na którym jesteś teraz zalogowany. Aby wrócić, zaloguj się na nie ponownie.',
              )}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.sub, lineHeight: 20 }}>
              {L(
                'Перед выходом сохраним всё в облако. Если нет интернета — выход будет отменён.',
                'Перед виходом ми збережемо все в хмарі. Якщо немає інтернету — вихід буде відкладено.',
                'Antes de cerrar sesión guardamos todo en la nube. Sin conexión, se cancelará el cierre de sesión.',
                'Antes de sair, vamos salvar tudo na nuvem. Sem internet, a saída será cancelada.',
                'Trước khi đăng xuất, chúng tôi sẽ lưu mọi thứ lên đám mây. Nếu không có internet, việc đăng xuất sẽ bị hủy.',
                'Sebelum keluar, semuanya akan disimpan ke cloud. Jika tidak ada internet, proses keluar akan dibatalkan.',
                'Çıkmadan önce her şeyi buluta kaydedeceğiz. İnternet yoksa çıkış iptal edilir.',
                'Przed wylogowaniem zapiszemy wszystko w chmurze. Bez internetu wylogowanie zostanie anulowane.',
              )}
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 22 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSwitchAccountStage('idle')}
                style={{ paddingHorizontal: 10, paddingVertical: 8 }}
              >
                <Text style={{ color: t.textMuted, fontSize: f.body, fontWeight: '700' }}>
                  {L('Отмена', 'Скасувати', 'Cancelar', 'Cancelar', 'Hủy', 'Batal', 'Vazgeç', 'Anuluj')}
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
                    showInfoAlert(
                      L('Выход не прошёл. Попробуй снова.', 'Не вдалося вийти', 'No se pudo cerrar sesión', 'Não foi possível sair', 'Không thể đăng xuất', 'Tidak dapat keluar', 'Çıkış yapılamadı', 'Nie udało się wylogować'),
                      res.reason === 'sync_failed'
                        ? L(
                            'Нет связи с сервером. Прогресс не сохранён в облако — попробуй позже, когда появится интернет.',
                            "Немає зв\'язку з сервером. Прогрес не збережено в хмару — спробуй пізніше, коли з\'явиться інтернет.",
                            'Sin conexión con el servidor: el progreso no se guardó en la nube. Inténtalo de nuevo cuando tengas internet.',
                            'Sem conexão com o servidor: o progresso não foi salvo na nuvem. Tente de novo quando tiver internet.',
                            'Không có kết nối với máy chủ: tiến độ chưa được lưu lên đám mây. Hãy thử lại khi có internet.',
                            'Tidak ada koneksi ke server: progres belum disimpan ke cloud. Coba lagi saat internet tersedia.',
                            'Sunucuyla bağlantı yok: ilerleme buluta kaydedilmedi. İnternet olduğunda tekrar dene.',
                            'Brak połączenia z serwerem: postęp nie został zapisany w chmurze. Spróbuj ponownie, gdy będzie internet.',
                          )
                        : L('Неизвестная ошибка. Попробуй ещё раз.', 'Невідома помилка. Спробуй ще раз.', 'Error desconocido. Inténtalo de nuevo.', 'Erro desconhecido. Tente novamente.', 'Lỗi không xác định. Hãy thử lại.', 'Error tidak dikenal. Coba lagi.', 'Bilinmeyen hata. Tekrar dene.', 'Nieznany błąd. Spróbuj ponownie.'),
                    );
                    return;
                  }
                  setLinkedAuth(null);
                  setAuthPromptVisible(true);
                }}
                style={{ paddingHorizontal: 10, paddingVertical: 8 }}
              >
                <Text style={{ color: t.correct, fontSize: f.body, fontWeight: '800' }}>
                  {L('Продолжить', 'Продовжити', 'Continuar', 'Continuar', 'Tiếp tục', 'Lanjutkan', 'Devam et', 'Kontynuuj')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Лоадер во время forced sync + signOut + wipe ── */}
      <Modal visible={switchAccountStage === 'wiping'} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <View
            style={[
              {
                width: '100%',
                maxWidth: 280,
                backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard,
                borderRadius: isCompassTheme ? 10 : 16,
                padding: 28,
                borderWidth: 1,
                borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : t.border,
                alignItems: 'center',
                overflow: 'hidden',
              },
              isCompassTheme && compassShadow(3),
            ]}
          >
            {isCompassTheme ? <CompassDepthSurface radius={10} selected /> : null}
            <Ionicons name="shield-checkmark" size={28} color={t.correct} />
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>
              {L('Аккаунт', 'Акаунт', 'Cuenta', 'Conta', 'Tài khoản', 'Akun', 'Hesap', 'Konto')}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 6, textAlign: 'center' }}>
              {L('Не закрывай приложение', 'Не закривай застосунок', 'No cierres la app', 'Não feche o app', 'Đừng đóng ứng dụng', 'Jangan tutup aplikasi', 'Uygulamayı kapatma', 'Nie zamykaj aplikacji')}
            </Text>
          </View>
        </View>
      </Modal>

      {/* Модал имени */}
      <Modal
        visible={nameModal}
        transparent
        animationType="fade"
        onRequestClose={closeNameModal}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}
          onPress={closeNameModal}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View
              style={[
                {
                  width: '80%',
                  minWidth: 280,
                  backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard,
                  borderRadius: isCompassTheme ? 10 : 16,
                  padding: 24,
                  borderWidth: isCompassTheme ? 1 : 0,
                  borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : 'transparent',
                  overflow: 'hidden',
                },
                isCompassTheme && compassShadow(3),
              ]}
            >
            {isCompassTheme ? <CompassDepthSurface radius={10} selected /> : null}
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '600', marginBottom: 16 }}>
              {L('Изменить имя', 'Змінити ім\'я', 'Cambiar nombre', 'Alterar nome', 'Đổi tên', 'Ubah nama', 'Adı değiştir', 'Zmień nazwę')}
            </Text>
            <TextInput
              accessibilityLabel={L('Имя профиля', 'Ім\'я профілю', 'Nombre de perfil', 'Nome do perfil', 'Tên hồ sơ', 'Nama profil', 'Profil adı', 'Nazwa profilu')}
              style={{
                backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalSoft : t.bgPrimary,
                color: t.textPrimary,
                fontSize: f.h2,
                padding: 14,
                borderRadius: isCompassTheme ? 8 : 10,
                borderWidth: 1,
                borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : t.border,
                marginBottom: 20,
              }}
              value={newName}
              onChangeText={setNewName}
              placeholder={L('Введи имя...', 'Введіть ім\'я...', 'Escribe tu nombre...', 'Digite seu nome...', 'Nhập tên...', 'Masukkan nama...', 'Adını gir...', 'Wpisz imię...')}
              placeholderTextColor={t.textGhost}
              autoFocus maxLength={20}
              returnKeyType="done"
              onSubmitEditing={saveName}
              blurOnSubmit
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  {
                    flex: 1,
                    padding: 12,
                    borderRadius: isCompassTheme ? 8 : 10,
                    borderWidth: 1,
                    borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : t.border,
                    alignItems: 'center',
                    backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : 'transparent',
                    overflow: 'hidden',
                  },
                  isCompassTheme && compassShadow(1),
                ]}
                onPress={() => { doHaptic(); closeNameModal(); }}
              >
                {isCompassTheme ? <CompassDepthSurface radius={8} quiet /> : null}
                <Text style={{ color: t.textMuted, fontSize: f.body }} numberOfLines={1} adjustsFontSizeToFit>{L('Отмена', 'Скасувати', 'Cancelar', 'Cancelar', 'Hủy', 'Batal', 'Vazgeç', 'Anuluj')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  {
                    flex: 1,
                    padding: 12,
                    borderRadius: isCompassTheme ? 8 : 10,
                    backgroundColor: isCompassTheme ? COMPASS_RICH.champagne : t.accent,
                    borderWidth: 1,
                    borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : t.accent,
                    alignItems: 'center',
                    overflow: 'hidden',
                  },
                  isCompassTheme && compassShadow(1),
                ]}
                onPress={() => { doHaptic(); void saveName(); }}
              >
                {isCompassTheme ? <CompassDepthSurface radius={8} cream /> : null}
                <Text style={{ color: isCompassTheme ? COMPASS_RICH.textDark : t.correctText, fontSize: f.body, fontWeight: '700' }} numberOfLines={1} adjustsFontSizeToFit>{L('Сохранить', 'Зберегти', 'Guardar', 'Salvar', 'Lưu', 'Simpan', 'Kaydet', 'Zapisz')}</Text>
              </TouchableOpacity>
            </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

    </ScreenGradient>
  );
}
