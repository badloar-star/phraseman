import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity,
  TextInput, Modal, ScrollView, Animated, DeviceEventEmitter,
  Linking,
  Alert,
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
import { useBouncy, useBouncyStyle } from '../../components/BouncyScrollView';
import RegistrationPromptModal from '../../components/RegistrationPromptModal';
import ScreenGradient from '../../components/ScreenGradient';
import {
  SettingsGroup,
  SettingsRow,
  SettingsCustomRow,
  SettingsSectionTitle,
  SettingsIconTile,
  SETTINGS_GROUP_MARGIN,
} from '../../components/settings/SettingsGroup';
import { useTopFadeScroll } from '../../components/TopFadeScrollContext';
import DeleteAccountConfirmModal from '../../components/DeleteAccountConfirmModal';
import CompassDepthSurface from '../../components/CompassDepthSurface';
import { scheduleDailyReminder, cancelAllNotifications, loadNotificationSettings } from '../notifications';
import { DebugLogger } from '../debug-logger';
import { useLang } from '../../components/LangContext';
import { usePremium } from '../../components/PremiumContext';
import CustomSwitch from '../../components/CustomSwitch';
import { hapticTap as doHaptic, setHapticCacheEnabled } from '../../hooks/use-haptics';
import { useTabContentBottomPad } from '../../hooks/use-tab-content-bottom-pad';
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
import type { ThemeMode } from '../../constants/theme';
import { SETTINGS_TESTERS_ROUTE } from '../../constants/devRoutes';
import { COMPASS_RICH, compassShadow } from '../../constants/compassTheme';
import { getLinkedAuthInfo, signOutAndWipeForAccountSwitch, type LinkedAuth } from '../auth_provider';
import { reserveNameDetailed } from '../firestore_leaderboard';
import { syncMyLeagueMemberProfileNow } from '../firestore_leagues';
import { enqueueThemedBlockingInfoAlert } from '../themed_blocking_alert_queue';
import { navigateAfterModalClose } from '../safe_modal_navigation';
import { useEffectivePlatformOS } from '../platform_ui_preview';
import { isIdeasEnabled, isPromoCodesEnabled } from '../remote_flags';
import { getAnalyticsConsentState, setAnalyticsConsent } from '../analytics_consent';
import { recordConsentToCloud } from '../age_consent_cloud';

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

type SettingsSurfacePalette = {
  panel: string;
  chip: string;
  border: string;
  divider: string;
  notice: string;
};

const SETTINGS_SURFACES: Record<ThemeMode, SettingsSurfacePalette> = {
  dark: {
    panel: '#19231D',
    chip: '#19231D',
    border: 'rgba(214,255,226,0.10)',
    divider: 'rgba(214,255,226,0.07)',
    notice: '#1C281F',
  },
  gold: {
    panel: '#1C1912',
    chip: '#1C1912',
    border: 'rgba(232,205,139,0.14)',
    divider: 'rgba(232,205,139,0.08)',
    notice: '#211C12',
  },
  coral: {
    panel: '#24191D',
    chip: '#24191D',
    border: 'rgba(255,220,228,0.11)',
    divider: 'rgba(255,220,228,0.07)',
    notice: '#2A1C20',
  },
  minimalDark: {
    panel: '#1C1C1E',
    chip: '#1C1C1E',
    border: 'rgba(255,255,255,0.12)',
    divider: 'rgba(255,255,255,0.08)',
    notice: '#202124',
  },
  business: {
    panel: '#141414',
    chip: '#141414',
    border: 'rgba(255,255,255,0.10)',
    divider: 'rgba(255,255,255,0.07)',
    notice: '#1C1C1C',
  },
  midnight: {
    panel: '#1B1D25',
    chip: '#1B1D25',
    border: 'rgba(225,232,255,0.12)',
    divider: 'rgba(225,232,255,0.07)',
    notice: '#202330',
  },
  ember: {
    panel: '#241B18',
    chip: '#241B18',
    border: 'rgba(255,222,205,0.12)',
    divider: 'rgba(255,222,205,0.07)',
    notice: '#2B201B',
  },
  aurora: {
    panel: '#182222',
    chip: '#182222',
    border: 'rgba(215,255,244,0.12)',
    divider: 'rgba(215,255,244,0.07)',
    notice: '#1B2828',
  },
  volt: {
    panel: '#1F2417',
    chip: '#1F2417',
    border: 'rgba(226,255,122,0.13)',
    divider: 'rgba(226,255,122,0.07)',
    notice: '#242B19',
  },
};

export default function SettingsMain() {
  const tabContentBottomPad = useTabContentBottomPad();
  const router = useRouter();
  const effectiveOs = useEffectivePlatformOS();
  const { theme: t, isDark, themeMode, fontSize, setFontSize, f } = useTheme();
  const isCompassTheme = false;
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
  const settingsSurface = SETTINGS_SURFACES[themeMode];
  const settingsPanelBg = isCompassTheme ? COMPASS_RICH.charcoalRaised : settingsSurface.panel;
  const settingsChipBg = isCompassTheme ? COMPASS_RICH.charcoalRaised : settingsSurface.chip;
  const settingsBorder = isCompassTheme ? COMPASS_RICH.hairlineQuiet : settingsSurface.border;
  const settingsDivider = isCompassTheme ? COMPASS_RICH.hairlineQuiet : settingsSurface.divider;
  const settingsNoticeBg = isCompassTheme ? COMPASS_RICH.charcoalRaised : settingsSurface.notice;
  const screenBorder = settingsBorder;
  /**
   * Settings-плашки отделены от tabbar chrome: как в Telegram, это один спокойный
   * surface-слой для каждой темы, а выбранность читается рамкой и текстом.
   */
  const chipSurfaceOff = settingsChipBg;
  const chipTextOff = isGradientLight ? t.textPrimary : screenPrimary;
  /** Плотная заливка: сакура — яркая магента (#B0105C на тёмном фоне почти сливалась с белым при грязном рендере / субпиксели). */
  const chipSurfaceOn = settingsChipBg;
  const chipTextOn = isGradientLight ? '#FFFFFF' : t.correct;
  const chipBorderOn = isGradientLight ? chipSurfaceOn : t.correct;
  /** Плашка Premium/VIP на градиенте: не correctBg (просвечивает) — как обычная светлая карточка + тёмный текст. */
  const premiumActiveSurface = isGradientLight ? t.bgCard : settingsNoticeBg;
  const premiumActiveTitle = isGradientLight ? t.textPrimary : t.correct;
  const premiumActiveSub = isGradientLight ? t.textMuted : t.textSecond;
  const premiumActiveIcon = isGradientLight ? t.accent : t.correct;
  const vipActiveSurface = isGradientLight ? t.bgCard : settingsNoticeBg;
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
   * Алерт, который можно показывать ПОВЕРХ открытой модалки имени.
   *
   * showInfoAlert (enqueueThemedBlockingInfoAlert → ThemedBlockingAlertHost → OverlayArbiter)
   * рендерит themedAlert НАТИВНЫМ <Modal>. Модалка имени тут — тоже нативный <Modal>. На iOS
   * презентовать один <Modal> поверх другого (present-over-present) ломает стек презентаций:
   * алерт не появляется ВООБЩЕ («Сохранить ничего не делает»), а экран виснет — кнопки/тапы
   * мертвы, помогает только выход из приложения. Это воспроизводится на ЛЮБОМ имени, даже
   * пустом/коротком, потому что валидация зовёт алерт ещё до всякой сети.
   *
   * Системный Alert.alert (UIAlertController на iOS) — НЕ RN-<Modal>, он корректно
   * накладывается поверх открытого <Modal>, конфликта презентаций нет. Поэтому внутри
   * saveName используем именно его.
   */
  const alertOverName = React.useCallback(
    (message: string) => {
      Alert.alert(
        L('Сообщение', 'Повідомлення', 'Message', 'Mensagem', 'Thông báo', 'Pesan', 'Mesaj', 'Wiadomość'),
        message,
      );
    },
    [lang],
  );

  /**
   * Закрыть модалку имени СИНХРОННО. Нативный animationType="fade" самого <Modal> сам
   * проигрывает выход, а при visible=false React размонтирует всё субдерево модалки
   * (включая backdrop-Pressable), поэтому «слоя-призрака», который ест тапы, не остаётся.
   *
   * ВАЖНО: НЕ откладывать закрытие через InteractionManager.runAfterInteractions+setTimeout.
   * На тяжёлом экране настроек (анимации + autoFocus-клавиатура) interaction-handle мог не
   * закрыться никогда → колбэк не выполнялся → модалка не закрывалась. Это и давало два бага:
   * «Сохранить ничего не делает» (saveName закрывал через этот колбэк) и «после Отмена→Сохранить
   * всё виснет» (backdrop оставался поверх экрана и съедал все тапы).
   */
  const closeNameModal = useCallback(() => {
    Keyboard.dismiss();
    setNameModal(false);
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
  const [ideasOn, setIdeasOn] = useState(isIdeasEnabled());
  const [promoCodesOn, setPromoCodesOn] = useState(isPromoCodesEnabled());
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
  // Согласие на необязательную аналитику (PostHog + non-essential Firebase).
  // Источник правды — analytics_consent.ts (синхронный снапшот после гидрации).
  // Тумблер даёт отзыв согласия в любой момент, как требует GDPR ст.7(3) и как
  // обещает модал согласия. 'granted' → вкл; 'denied'/'unset' → выкл.
  const [analyticsOn, setAnalyticsOn] = useState(getAnalyticsConsentState() === 'granted');

  // Применить выбор согласия: локально (источник правды + гейт сбора) + в облако
  // (accountability/GDPR, дата отзыва/выдачи). Best-effort — сбой облака не ломает UX.
  const applyAnalyticsConsent = useCallback((val: boolean) => {
    setAnalyticsOn(val);
    void (async () => {
      await setAnalyticsConsent(val ? 'granted' : 'denied');
      void recordConsentToCloud();
    })();
  }, []);

  // Тоггл «Отправлять данные об использовании». Включение — сразу. Выключение
  // включённой галочки — через подтверждение «Вы уверены?».
  const onToggleAnalytics = useCallback((val: boolean) => {
    if (!val && analyticsOn) {
      Alert.alert(
        L('Выключить отправку данных?', 'Вимкнути надсилання даних?', '¿Desactivar el envío de datos?',
          'Desativar o envio de dados?', 'Tắt gửi dữ liệu?', 'Matikan pengiriman data?',
          'Veri gönderimi kapatılsın mı?', 'Wyłączyć wysyłanie danych?'),
        L('Эти данные помогают улучшать приложение. Их сбор не обязателен — можно включить снова в любой момент.',
          'Ці дані допомагають покращувати додаток. Збір не обов\'язковий — можна ввімкнути знову будь-коли.',
          'Estos datos ayudan a mejorar la app. No es obligatorio; puedes volver a activarlo cuando quieras.',
          'Esses dados ajudam a melhorar o app. Não é obrigatório; você pode reativar quando quiser.',
          'Dữ liệu này giúp cải thiện ứng dụng. Không bắt buộc — bạn có thể bật lại bất cứ lúc nào.',
          'Data ini membantu meningkatkan aplikasi. Tidak wajib — bisa diaktifkan lagi kapan saja.',
          'Bu veriler uygulamayı geliştirmeye yardımcı olur. Zorunlu değil — istediğin zaman tekrar açabilirsin.',
          'Te dane pomagają ulepszać aplikację. Nie są wymagane — możesz włączyć ponownie w każdej chwili.'),
        [
          { text: L('Отмена', 'Скасувати', 'Cancelar', 'Cancelar', 'Hủy', 'Batal', 'İptal', 'Anuluj'), style: 'cancel' },
          {
            text: L('Выключить', 'Вимкнути', 'Desactivar', 'Desativar', 'Tắt', 'Matikan', 'Kapat', 'Wyłącz'),
            style: 'destructive',
            onPress: () => applyAnalyticsConsent(false),
          },
        ],
      );
      return;
    }
    applyAnalyticsConsent(val);
  }, [analyticsOn, applyAnalyticsConsent, lang]);

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
      gold: { ru: 'Золото', uk: 'Золото', es: 'Oro', 'pt-BR': 'Ouro', vi: 'Vàng', id: 'Emas', tr: 'Altın', pl: 'Złoto' },
      coral: { ru: 'Корал', uk: 'Корал', es: 'Coral', 'pt-BR': 'Coral', vi: 'San hô', id: 'Koral', tr: 'Mercan', pl: 'Koral' },
      minimalDark: { ru: 'Графит', uk: 'Графіт', es: 'Grafito', 'pt-BR': 'Grafite', vi: 'Than chì', id: 'Grafit', tr: 'Grafit', pl: 'Grafit' },
      business: { ru: 'Бизнес', uk: 'Бізнес', es: 'Negocios', 'pt-BR': 'Negócios', vi: 'Doanh nghiệp', id: 'Bisnis', tr: 'İş', pl: 'Biznes' },
      midnight: { ru: 'Полночь', uk: 'Північ', es: 'Medianoche', 'pt-BR': 'Meia-noite', vi: 'Nửa đêm', id: 'Tengah malam', tr: 'Gece yarısı', pl: 'Północ' },
      ember: { ru: 'Янтарь', uk: 'Бурштин', es: 'Ámbar', 'pt-BR': 'Âmbar', vi: 'Hổ phách', id: 'Amber', tr: 'Kehribar', pl: 'Bursztyn' },
      aurora: { ru: 'Сияние', uk: 'Сяйво', es: 'Aurora', 'pt-BR': 'Aurora', vi: 'Cực quang', id: 'Aurora', tr: 'Aurora', pl: 'Zorza' },
      volt: { ru: 'Вольт', uk: 'Вольт', es: 'Volt', 'pt-BR': 'Volt', vi: 'Volt', id: 'Volt', tr: 'Volt', pl: 'Volt' },
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
    setIdeasOn(isIdeasEnabled());
    setPromoCodesOn(isPromoCodesEnabled());
    setAnalyticsOn(getAnalyticsConsentState() === 'granted');
    return () => { cancelled = true; };
  }, [activeIdx]); // обновляем при переключении на этот таб

  useEffect(() => {
    const refreshRemoteFlags = () => {
      setIdeasOn(isIdeasEnabled());
      setPromoCodesOn(isPromoCodesEnabled());
    };
    const sub = DeviceEventEmitter.addListener('remote_config_changed', refreshRemoteFlags);
    return () => sub.remove();
  }, []);

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
    if (!trimmed) { alertOverName(L('Введи имя', "Введіть ім\'я", 'Escribe un nombre o apodo', 'Digite um nome ou apelido', 'Nhập tên hoặc biệt danh', 'Masukkan nama atau nama panggilan', 'Bir ad veya takma ad gir', 'Wpisz imię lub pseudonim')); return; }
    if (trimmed.length < 2) { alertOverName(L('Минимум 2 символа', 'Мінімум 2 символи', 'Mínimo 2 caracteres', 'Mínimo de 2 caracteres', 'Tối thiểu 2 ký tự', 'Minimal 2 karakter', 'En az 2 karakter', 'Minimum 2 znaki')); return; }
    if (trimmed.length > 20) { alertOverName(L('Максимум 20 символов', 'Максимум 20 символів', 'Máximo 20 caracteres', 'Máximo de 20 caracteres', 'Tối đa 20 ký tự', 'Maksimal 20 karakter', 'En fazla 20 karakter', 'Maksymalnie 20 znaków')); return; }
    if (containsBadWord(trimmed)) { alertOverName(L('Недопустимое имя', "Недопустиме ім\'я", 'Nombre no válido', 'Nome inválido', 'Tên không hợp lệ', 'Nama tidak valid', 'Geçersiz ad', 'Niedozwolona nazwa')); return; }

    const oldName = userName.trim();
    if (trimmed === oldName) {
      closeNameModal();
      return;
    }

    // Жёсткая проверка уникальности: бронируем имя на сервере СНАЧАЛА и применяем
    // локально только при 'ok'. Раньше имя применялось до ответа сервера (и при
    // 'taken' откатывалось «как получится») — из-за чего дубликаты просачивались.
    let reservation: Awaited<ReturnType<typeof reserveNameDetailed>>;
    try {
      reservation = await reserveNameDetailed(trimmed, oldName, { source: 'settings' });
    } catch (error) {
      DebugLogger.error('settings.tsx:renameName:reserveName', error, 'warning');
      reservation = { status: 'error' };
    }

    if (reservation.status === 'taken') {
      alertOverName(L('Это имя уже занято. Выбери другое.', "Це ім\'я вже зайняте. Оберіть інше.", 'Este nombre ya está en uso. Elige otro.', 'Esse nome já está em uso. Escolha outro.', 'Tên này đã được dùng. Hãy chọn tên khác.', 'Nama ini sudah dipakai. Pilih yang lain.', 'Bu ad zaten kullanılıyor. Başka bir ad seç.', 'Ta nazwa jest już zajęta. Wybierz inną.'));
      return;
    }
    if (reservation.status === 'cooldown') {
      alertOverName(L(
        'Ник можно менять не чаще одного раза в 14 дней.',
        'Нік можна змінювати не частіше одного разу на 14 днів.',
        'Puedes cambiar el nombre solo una vez cada 14 días.',
        'Você só pode mudar o nome uma vez a cada 14 dias.',
        'Bạn chỉ có thể đổi tên 14 ngày một lần.',
        'Nama hanya bisa diganti sekali setiap 14 hari.',
        'Adı en fazla 14 günde bir değiştirebilirsin.',
        'Nazwę można zmieniać najwyżej raz na 14 dni.',
      ));
      return;
    }
    if (reservation.status !== 'ok') {
      alertOverName(L(
        'Имя не проверилось. Проверь интернет и попробуй ещё раз.',
        'Не вдалося перевірити імʼя. Перевір мережу й спробуй ще раз.',
        'No se pudo comprobar el nombre. Revisa la conexión e inténtalo de nuevo.',
        'Não foi possível verificar o nome. Verifique a conexão e tente novamente.',
        'Không thể kiểm tra tên. Kiểm tra kết nối và thử lại.',
        'Tidak bisa memeriksa nama. Periksa koneksi dan coba lagi.',
        'Ad doğrulanamadı. Bağlantını kontrol et ve tekrar dene.',
        'Nie udało się sprawdzić nazwy. Sprawdź połączenie i spróbuj ponownie.',
      ));
      return;
    }

    // Бронь подтверждена — применяем локально и закрываем модалку.
    try {
      await AsyncStorage.setItem('user_name', trimmed);
      setUserName(trimmed);
      await updateLocalNameReferences(oldName, trimmed);
      closeNameModal();
    } catch (error) {
      DebugLogger.error('settings.tsx:renameName:localApply', error, 'warning');
      alertOverName(L(
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

    await syncArenaDisplayName(trimmed).catch((error) => {
      DebugLogger.error('settings.tsx:renameName:arenaSync', error, 'warning');
    });
    void syncMyLeagueMemberProfileNow();
  };

  const vipExpiryText = vipUntilMs > 0
    ? `${L('Действует до', 'Діє до', 'Active until', 'Ativo até', 'Có hiệu lực đến', 'Aktif sampai', 'Bitiş', 'Ważne do')} ${formatDateTimeShort(vipUntilMs)}`
    : L('Plus без срока окончания', 'Plus без дати завершення', 'Plus has no end date', 'Plus sem data de término', 'Plus không có ngày kết thúc', 'Plus tanpa tanggal akhir', 'Plus bitiş tarihi yok', 'Plus bez daty zakończenia');

  // Список настроек переведён на Telegram-стиль: сгруппированные карточки
  // (components/settings/SettingsGroup). Старые локальные Row/SectionTitle удалены.

  return (
    <ScreenGradient>
      <BouncyWrap style={bouncyStyle}>
      <Animated.ScrollView
        testID="screen-settings"
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabContentBottomPad, paddingTop: insets.top }}
        keyboardShouldPersistTaps="handled"
        decelerationRate="normal"
        scrollEventThrottle={16}
        bounces
        alwaysBounceVertical
        overScrollMode="always"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false, listener: (e: any) => { topFadeScroll?.onScroll?.(e); onBouncyScroll(e); } },
        )}
      >

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
              backgroundColor: settingsPanelBg,
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

        <SettingsSectionTitle title={L('Профиль', 'Профіль', 'Perfil', 'Perfil', 'Hồ sơ', 'Profil', 'Profil', 'Profil')} />

        <SettingsGroup surfaceColor={settingsPanelBg} borderColor={settingsBorder} dividerColor={settingsDivider}>
          <SettingsRow
            testID="settings-profile-row"
            icon="person"
            color="blue"
            label={L('Имя / никнейм', 'Ім\'я / нікнейм', 'Nombre o apodo', 'Nome / apelido', 'Tên / biệt danh', 'Nama / panggilan', 'Ad / takma ad', 'Imię / pseudonim')}
            sub={userName || L('Не задано', 'Не задано', 'No indicado', 'Não definido', 'Chưa đặt', 'Belum diatur', 'Ayarlanmadı', 'Nie ustawiono')}
            onPress={() => { setNewName(userName); setNameModal(true); }}
          />
          <SettingsRow
            icon="key"
            color="green"
            label={L('Аккаунт', 'Акаунт', 'Cuenta', 'Conta', 'Tài khoản', 'Akun', 'Hesap', 'Konto')}
            sub={
              linkedAuth
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
          <SettingsRow
            testID="settings-language-row"
            icon="language"
            color="teal"
            label={s.settings.lang}
            sub={LANG_NATIVE[lang]}
            onPress={() => router.push('/settings_language' as any)}
          />
          <SettingsRow
            testID="settings-analytics-consent"
            icon="stats-chart"
            color="teal"
            label={L('Отправлять данные об использовании', 'Надсилати дані про використання', 'Enviar datos de uso', 'Enviar dados de uso', 'Gửi dữ liệu sử dụng', 'Kirim data penggunaan', 'Kullanım verisi gönder', 'Wysyłać dane o użytkowaniu')}
            sub={L(
              'Помогает улучшать приложение. Можно выключить в любой момент.',
              'Допомагає покращувати додаток. Можна вимкнути будь-коли.',
              'Ayuda a mejorar la app. Puedes desactivarlo cuando quieras.',
              'Ajuda a melhorar o app. Você pode desativar quando quiser.',
              'Giúp cải thiện ứng dụng. Có thể tắt bất cứ lúc nào.',
              'Membantu meningkatkan aplikasi. Bisa dimatikan kapan saja.',
              'Uygulamayı geliştirmeye yardımcı olur. İstediğin zaman kapatabilirsin.',
              'Pomaga ulepszać aplikację. Możesz wyłączyć w każdej chwili.',
            )}
            hideChevron
            right={<CustomSwitch value={analyticsOn} onValueChange={onToggleAnalytics} />}
          />
        </SettingsGroup>
        {/* Баннер: нет ника */}
        {nameReady && !userName && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => { doHaptic(); setNewName(''); setNameModal(true); }}
            style={{
              marginHorizontal: SETTINGS_GROUP_MARGIN, marginTop: 8, marginBottom: 4,
              flexDirection: 'row', alignItems: 'center', gap: 10,
              backgroundColor: settingsNoticeBg,
              borderRadius: 12, padding: 12,
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


        <SettingsSectionTitle title={L('Внешний вид', 'Зовнішній вигляд', 'Apariencia', 'Aparência', 'Giao diện', 'Tampilan', 'Görünüm', 'Wygląd')} />
        <SettingsGroup surfaceColor={settingsPanelBg} borderColor={settingsBorder} dividerColor={settingsDivider}>
          <SettingsRow
            icon="color-palette"
            color="purple"
            label={L('Темы', 'Теми', 'Temas', 'Temas', 'Chủ đề', 'Tema', 'Temalar', 'Motywy')}
            sub={currentThemeLabel}
            onPress={() => router.push('/settings_themes' as any)}
          />

          {/* РАЗМЕР ШРИФТА */}
          <SettingsCustomRow>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <SettingsIconTile icon="text" color="pink" />
              <View style={{ flex: 1, marginLeft: 12 }}>
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
                      : fontSize === sz ? chipBorderOn : chipBorderOff,
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
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontSize: f.label, color: isCompassTheme ? (fontSize === sz ? COMPASS_RICH.textDark : screenMuted) : fontSize === sz ? chipTextOn : t.textMuted, marginTop: 4, textAlign: 'center' }}>
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
          </SettingsCustomRow>

          {/* Тактильный отклик — глобальный */}
          <SettingsRow
            icon="phone-portrait"
            color="orange"
            label={L('Тактильный отклик', 'Тактильний відгук', 'Respuesta háptica', 'Resposta tátil', 'Phản hồi rung', 'Umpan balik haptik', 'Dokunsal geri bildirim', 'Reakcja haptyczna')}
            sub={L('Вибрация на каждом нажатии', 'Вібрація на кожному натисканні', 'Vibración ligera al pulsar', 'Vibração leve a cada toque', 'Rung nhẹ khi chạm', 'Getaran ringan setiap ketukan', 'Her dokunuşta hafif titreşim', 'Lekka wibracja przy każdym dotknięciu')}
            hideChevron
            right={
              <CustomSwitch
                value={hapticTap}
                onValueChange={val => {
                  setHapticTap(val);
                  setHapticCacheEnabled(val);
                  AsyncStorage.setItem('haptics_tap', String(val));
                }}
              />
            }
          />
        </SettingsGroup>

        <SettingsSectionTitle title={L('Обучение', 'Навчання', 'Aprendizaje', 'Aprendizado', 'Học tập', 'Pembelajaran', 'Öğrenme', 'Nauka')} />
        <SettingsGroup surfaceColor={settingsPanelBg} borderColor={settingsBorder} dividerColor={settingsDivider}>
          <SettingsRow
            icon="school"
            color="indigo"
            label={L('Настройки обучения', 'Налаштування навчання', 'Ajustes del aprendizaje', 'Configurações de aprendizado', 'Cài đặt học tập', 'Pengaturan pembelajaran', 'Öğrenme ayarları', 'Ustawienia nauki')}
            onPress={() => router.push('/settings_edu')}
          />
          <SettingsRow
            icon="notifications"
            color="red"
            label={L('Напоминания', 'Нагадування', 'Recordatorios', 'Lembretes', 'Nhắc nhở', 'Pengingat', 'Hatırlatıcılar', 'Przypomnienia')}
            sub={L('Ежедневная мотивация', 'Щоденна мотивація', 'Motivación diaria', 'Motivação diária', 'Động lực hằng ngày', 'Motivasi harian', 'Günlük motivasyon', 'Codzienna motywacja')}
            onPress={() => router.push('/settings_notifications')}
          />
          {/* «Все подарки» — только в админ-панели (Справочник подарков), не в проде.
              Каталог живёт в components/admin_panel/sections/GiftsCatalogSection.tsx. */}
        </SettingsGroup>

        {ideasOn ? (
          <>
            <SettingsSectionTitle title={L('Сообщество', 'Спільнота', 'Comunidad', 'Comunidade', 'Cộng đồng', 'Komunitas', 'Topluluk', 'Społeczność')} />
            <SettingsGroup surfaceColor={settingsPanelBg} borderColor={settingsBorder} dividerColor={settingsDivider}>
              <SettingsRow
                testID="settings-ideas-row"
                icon="bulb"
                color="yellow"
                label={L('Идеи', 'Ідеї', 'Ideas', 'Ideias', 'Ý tưởng', 'Ide', 'Fikirler', 'Pomysły')}
                sub={L('Твоя идея — год доступа', 'Твоя ідея — рік доступу', 'Tu idea — un año de acceso', 'Sua ideia — um ano de acesso', 'Ý tưởng của bạn — một năm truy cập', 'Idemu — setahun akses', 'Fikrin — bir yıl erişim', 'Twój pomysł — rok dostępu')}
                onPress={() => router.push('/ideas_submit' as any)}
              />
            </SettingsGroup>
          </>
        ) : null}

        {promoCodesOn ? (
          <>
            <SettingsSectionTitle title={L('Промокоды', 'Промокоди', 'Códigos promocionales', 'Códigos promocionais', 'Mã khuyến mãi', 'Kode promo', 'Promosyon kodları', 'Kody promocyjne')} />
            <SettingsGroup surfaceColor={settingsPanelBg} borderColor={settingsBorder} dividerColor={settingsDivider}>
              <SettingsRow
                testID="settings-promo-code-row"
                icon="ticket-outline"
                color="purple"
                label={L('Ввести промокод', 'Ввести промокод', 'Introducir código', 'Inserir código', 'Nhập mã', 'Masukkan kode', 'Kodu gir', 'Wpisz kod')}
                sub={L('Активируй код и получи Plus', 'Активуй код і отримай Plus', 'Activa un código y consigue Plus', 'Ative um código e ganhe Plus', 'Kích hoạt mã để nhận Plus', 'Aktifkan kode dan dapatkan Plus', 'Kodu etkinleştir ve Plus al', 'Aktywuj kod i odbierz Plus')}
                onPress={() => router.push('/promo_code_entry' as any)}
              />
            </SettingsGroup>
          </>
        ) : null}



        <SettingsSectionTitle title={L('Ещё', 'Ще', 'Más', 'Mais', 'Thêm', 'Lainnya', 'Daha fazla', 'Więcej')} />
        <SettingsGroup surfaceColor={settingsPanelBg} borderColor={settingsBorder} dividerColor={settingsDivider}>
          <SettingsRow
            icon="mail"
            color="blue"
            label={L('Написать в поддержку', 'Написати в підтримку', 'Escribir a soporte', 'Escrever para o suporte', 'Liên hệ hỗ trợ', 'Tulis ke dukungan', 'Desteğe yaz', 'Napisz do pomocy')}
            sub="support.phraseman@gmail.com"
            onPress={() => {
              doHaptic();
              void Linking.openURL(
                'mailto:support.phraseman@gmail.com?subject=' + encodeURIComponent('Phraseman'),
              );
            }}
          />
          {effectiveOs === 'android' ? (
            <SettingsRow
              icon="people"
              color="green"
              label={L('Бета-тестеры', 'Бета-тестери', 'Probadores beta', 'Testadores beta', 'Người thử nghiệm beta', 'Penguji beta', 'Beta test kullanıcıları', 'Beta testerzy')}
              onPress={() => router.push('/beta_testers' as any)}
            />
          ) : null}
          {ENABLE_DEV_TOOLS ? (
            <SettingsRow
              icon="construct"
              color="gray"
              label={L('Админ панель', 'Адмін панель', 'Panel admin', 'Painel admin', 'Bảng quản trị', 'Panel admin', 'Yönetici paneli', 'Panel admina')}
              onPress={() => router.push(SETTINGS_TESTERS_ROUTE as any)}
              testID="settings-open-testers"
            />
          ) : null}
        </SettingsGroup>
        {isVip && !isPremium && (
          <View testID="settings-vip-card" style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginHorizontal: SETTINGS_GROUP_MARGIN,
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
              <Text style={{ color: isCompassTheme ? COMPASS_RICH.cream : vipActiveTitle, fontSize: f.body, fontWeight: '900' }}>Plus</Text>
              <Text testID="settings-vip-subtitle" style={{ color: isCompassTheme ? COMPASS_RICH.textMuted : vipActiveSub, fontSize: f.caption, marginTop: 2 }}>
                {L('Plus аккаунт', 'Plus акаунт', 'Cuenta Plus', 'Conta Plus', 'Tài khoản Plus', 'Akun Plus', 'Plus hesap', 'Konto Plus')}
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
              margin: SETTINGS_GROUP_MARGIN,
              marginVertical: 20,
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
                {premiumPlan === 'lifetime' ? 'Pro' : 'Plus'} {L('активирован', 'активовано', 'activo', 'ativado', 'đã kích hoạt', 'aktif', 'aktif', 'aktywne')} ✓
              </Text>
              <Text style={{ color: isCompassTheme ? COMPASS_RICH.textMuted : premiumActiveSub, fontSize: f.caption, marginTop: 2 }}>
                {isVip && !isPremium
                  ? `${L('Plus доступ активен', 'Plus доступ активний', 'Plus access active', 'Acesso Plus ativo', 'Quyền Plus đang hoạt động', 'Akses Plus aktif', 'Plus erişim aktif', 'Dostęp Plus aktywny')} · ${vipExpiryText}`
                  : premiumPlan === 'lifetime'
                  ? L('Доступ навсегда · разовый платёж', 'Доступ назавжди · разовий платіж', 'Acceso para siempre · pago único', 'Acesso para sempre · pagamento único', 'Truy cập trọn đời · thanh toán một lần', 'Akses selamanya · sekali bayar', 'Sonsuza dek erişim · tek ödeme', 'Dostęp na zawsze · jedna płatność')
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
                margin: SETTINGS_GROUP_MARGIN,
                marginVertical: 20,
                backgroundColor: settingsPanelBg,
                borderRadius: isCompassTheme ? 8 : 14,
                padding: 16,
                borderWidth: 0.5,
                borderColor: settingsBorder,
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
                Plus
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
          <View style={{ flexDirection:'row', flexWrap:'wrap', justifyContent:'center', alignItems:'center', gap:16, marginBottom:20, paddingHorizontal:16 }}>
            <TapScale
              onPress={() => {
                doHaptic();
                void Linking.openURL(KNOWLY_LEGAL_PRIVACY_URL);
              }}
              withHaptic={false}
            >
              <Text numberOfLines={1} style={{ color:screenGhost, fontSize:f.caption, textDecorationLine:'underline' }}>
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
              <Text numberOfLines={1} style={{ color:screenGhost, fontSize:f.caption, textDecorationLine:'underline' }}>
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
        </View>

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
                'Перед выходом попробуем сохранить всё в облако. Если сервер не ответит — сделаем аварийную копию на устройстве и всё равно дадим выбрать аккаунт.',
                'Перед виходом спробуємо зберегти все в хмарі. Якщо сервер не відповість — зробимо аварійну копію на пристрої й усе одно дамо вибрати акаунт.',
                'Antes de cerrar sesión intentaremos guardar todo en la nube. Si el servidor no responde, haremos una copia de emergencia en el dispositivo y podrás elegir cuenta.',
                'Antes de sair, vamos tentar salvar tudo na nuvem. Se o servidor não responder, criaremos uma cópia de emergência no dispositivo e você poderá escolher a conta.',
                'Trước khi đăng xuất, chúng tôi sẽ thử lưu mọi thứ lên đám mây. Nếu máy chủ không phản hồi, chúng tôi sẽ tạo bản sao khẩn cấp trên thiết bị và vẫn cho bạn chọn tài khoản.',
                'Sebelum keluar, kami akan mencoba menyimpan semuanya ke cloud. Jika server tidak merespons, kami membuat salinan darurat di perangkat dan tetap membiarkan kamu memilih akun.',
                'Çıkmadan önce her şeyi buluta kaydetmeyi deneyeceğiz. Sunucu yanıt vermezse cihazda acil bir kopya oluşturup yine de hesap seçmene izin vereceğiz.',
                'Przed wylogowaniem spróbujemy zapisać wszystko w chmurze. Jeśli serwer nie odpowie, zrobimy awaryjną kopię na urządzeniu i nadal pozwolimy wybrać konto.',
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
                      L('Неизвестная ошибка. Попробуй ещё раз.', 'Невідома помилка. Спробуй ще раз.', 'Error desconocido. Inténtalo de nuevo.', 'Erro desconhecido. Tente novamente.', 'Lỗi không xác định. Hãy thử lại.', 'Error tidak dikenal. Coba lagi.', 'Bilinmeyen hata. Tekrar dene.', 'Nieznany błąd. Spróbuj ponownie.'),
                    );
                    return;
                  }
                  setLinkedAuth(null);
                  setAuthPromptVisible(true);
                  if (!res.synced) {
                    showInfoAlert(
                      L('Можно выбрать аккаунт', 'Можна вибрати акаунт', 'Puedes elegir cuenta', 'Você pode escolher a conta', 'Bạn có thể chọn tài khoản', 'Kamu bisa memilih akun', 'Hesap seçebilirsin', 'Możesz wybrać konto'),
                      L(
                        'Сервер не ответил перед выходом, поэтому мы сохранили аварийную копию на устройстве. Теперь войди в нужный Google-аккаунт.',
                        'Сервер не відповів перед виходом, тому ми зберегли аварійну копію на пристрої. Тепер увійди в потрібний Google-акаунт.',
                        'El servidor no respondió antes de salir, así que guardamos una copia de emergencia en el dispositivo. Ahora entra con la cuenta de Google correcta.',
                        'O servidor não respondeu antes de sair, então salvamos uma cópia de emergência no dispositivo. Agora entre na conta Google correta.',
                        'Máy chủ không phản hồi trước khi đăng xuất, nên chúng tôi đã lưu bản sao khẩn cấp trên thiết bị. Bây giờ hãy đăng nhập vào tài khoản Google đúng.',
                        'Server tidak merespons sebelum keluar, jadi kami menyimpan salinan darurat di perangkat. Sekarang masuk ke akun Google yang benar.',
                        'Çıkmadan önce sunucu yanıt vermedi, bu yüzden cihazda acil bir kopya sakladık. Şimdi doğru Google hesabıyla giriş yap.',
                        'Serwer nie odpowiedział przed wylogowaniem, więc zapisaliśmy awaryjną kopię na urządzeniu. Teraz zaloguj się na właściwe konto Google.',
                      ),
                    );
                  }
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
                <Text style={{ color: t.textMuted, fontSize: f.body }} numberOfLines={1}>{L('Отмена', 'Скасувати', 'Cancelar', 'Cancelar', 'Hủy', 'Batal', 'Vazgeç', 'Anuluj')}</Text>
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
                <Text style={{ color: isCompassTheme ? COMPASS_RICH.textDark : t.correctText, fontSize: f.body, fontWeight: '700' }} numberOfLines={1}>{L('Сохранить', 'Зберегти', 'Guardar', 'Salvar', 'Lưu', 'Simpan', 'Kaydet', 'Zapisz')}</Text>
              </TouchableOpacity>
            </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

    </ScreenGradient>
  );
}
