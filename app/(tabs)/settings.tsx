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
  ActivityIndicator,
} from 'react-native';
import Reanimated, { runOnJS, useSharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import TapScale from '../../components/TapScale';
import { useRouter } from 'expo-router';
import { useTabNav } from '../TabContext';
import Ionicons from '@expo/vector-icons/Ionicons';
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
import {
  clampHomeFeatureTipReplayCount,
  HOME_FEATURE_TIPS_DONE_KEY,
  HOME_FEATURE_TIPS_INDEX_KEY,
  HOME_FEATURE_TIPS_MAX_REPLAYS,
  HOME_FEATURE_TIPS_REPLAY_COUNT_KEY,
  HOME_FEATURE_TIPS_RESET_EVENT,
} from '../home_feature_tips';
import { useTabContentBottomPad } from '../../hooks/use-tab-content-bottom-pad';
import {
  ENABLE_DEV_TOOLS,
  ENABLE_DEV_STUDY_TARGET_LANG,
} from '../config';
import {
  getDevStudyTargetLang,
  isStudyTargetSourceUiLang,
  type StudyTargetLang,
} from '../study_target_lang_dev';
import { getStoredStudyTarget } from '../study_target';
import StudyLanguagePicker from '../../components/settings/StudyLanguagePicker';
import { triLang, type Lang } from '../../constants/i18n';
import type { ThemeMode } from '../../constants/theme';
import { SETTINGS_TESTERS_ROUTE } from '../../constants/devRoutes';
import { COMPASS_RICH, compassShadow } from '../../constants/compassTheme';
import { getLinkedAuthInfo, signOutAndWipeForAccountSwitch, type LinkedAuth } from '../auth_provider';
import { reserveNameDetailed, warmNameAvailabilityAuth } from '../firestore_leaderboard';
import { syncMyLeagueMemberProfileNow } from '../firestore_leagues';
import { enqueueThemedBlockingInfoAlert } from '../themed_blocking_alert_queue';
import { navigateAfterModalClose } from '../safe_modal_navigation';
import { isIdeasEnabled, isPromoCodesEnabled, isTopHelpersEnabled } from '../remote_flags';
import { useReferralRoulettePolicy } from '../referral_roulette_flag';
import { getClaimableReferralState } from '../referral_vip';
import { captureAccountGeneration, isCurrentAccountGeneration } from '../account_generation';
import { accountScopeKey } from '../account_scope_key';
import { readReferralDrain } from '../referrals_cache';
import { isReferralCloudEnabled } from '../referral_cloud';
import { selectAccountScopedReferralState, selectReferralSurfaceState } from '../referral_surface_state';
import { Image } from 'expo-image';
import Constants from 'expo-constants';
import { getAppReleaseBuildId } from '../app_build_id';
import { clearAppCaches } from '../cache_reset';

import { patchAppSnapshot, useAppSnapshotSelector } from '../app_snapshot_store';
import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';

/** Картинка инвайт-баннера настроек (wire first, generate second — правило asset-хайджины). */
const INVITE_GIFT_BANNER = require('../../assets/images/settings/invite_gift_banner.webp');

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

type PlusAccessDetail = {
  key: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  testID?: string;
  titleTestID?: string;
  subtitleTestID?: string;
};

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
    panel: '#0A0A0A',
    chip: '#0A0A0A',
    border: 'rgba(255,255,255,0.10)',
    divider: 'rgba(255,255,255,0.07)',
    notice: '#121212',
  },
  businessLight: {
    panel: '#FFFFFF',
    chip: '#FFFFFF',
    border: 'rgba(0,0,0,0.10)',
    divider: 'rgba(0,0,0,0.06)',
    notice: '#FAFAFA',
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
  candyBlue: {
    panel: '#16282F',
    chip: '#16282F',
    border: 'rgba(178,213,229,0.13)',
    divider: 'rgba(178,213,229,0.07)',
    notice: '#1A2E36',
  },
  indigo: {
    panel: '#222140',
    chip: '#222140',
    border: 'rgba(200,195,255,0.13)',
    divider: 'rgba(200,195,255,0.07)',
    notice: '#26254A',
  },
  vanilla: {
    panel: '#FFFDF6',
    chip: '#FFFDF6',
    border: 'rgba(58,44,8,0.22)',
    divider: 'rgba(58,44,8,0.12)',
    notice: '#F8F0DA',
  },
};
// Ключи карточек-подсказок главной — общие с home.tsx, см. app/home_feature_tips.ts.

export default function SettingsMain() {
  const tabContentBottomPad = useTabContentBottomPad();
  const router = useRouter();
  const { theme: t, isDark, themeMode, fontSize, setFontSize, f, isFlat: isFlatUi } = useTheme();
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
  const closeNameModalNow = useCallback(() => {
    Keyboard.dismiss();
    setNameModal(false);
  }, []);
  const closeNameModal = useCallback(() => {
    if (nameSavingRef.current) return;
    closeNameModalNow();
  }, [closeNameModalNow]);
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
  const insets = useStableSafeAreaInsets();
  const topFadeScroll = useTopFadeScroll();
  // Маска шапки (TopFadeMask) слушает scrollY порогом showThreshold=6, поэтому JS
  // дёргаем только при пересечении порога, а не каждый кадр — скролл идёт UI-потоком.
  const topFadeShown = useSharedValue(false);
  const topFadeOnScroll = topFadeScroll?.onScroll;
  const notifyTopFade = useCallback((y: number) => {
    topFadeOnScroll?.({ nativeEvent: { contentOffset: { y } } });
  }, [topFadeOnScroll]);
  const { GestureWrap: BouncyWrap, stretch: bouncyStretch, onAnimatedScroll } = useBouncy({
    onScrollWorklet: (y: number) => {
      'worklet';
      const shown = y > 6;
      if (shown !== topFadeShown.value) {
        topFadeShown.value = shown;
        runOnJS(notifyTopFade)(y);
      }
    },
  });
  const bouncyStyle = useBouncyStyle(bouncyStretch);
  const { activeIdx, focusTick, goHome } = useTabNav();
  const SETTINGS_TAB_IDX = 4;
  // Повторные показы подсказок ограничены (наборы №2..№6); после последнего
  // кнопка исчезает навсегда — финальный набор прямо обещает это юзеру.
  const [homeTipsReplayCount, setHomeTipsReplayCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(HOME_FEATURE_TIPS_REPLAY_COUNT_KEY)
      .then((raw) => {
        if (cancelled) return;
        setHomeTipsReplayCount(clampHomeFeatureTipReplayCount(Number(raw ?? 0)));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const homeTipsReplayAvailable = homeTipsReplayCount < HOME_FEATURE_TIPS_MAX_REPLAYS;
  const resetHomeFeatureTips = useCallback(() => {
    doHaptic();
    const nextReplayCount = clampHomeFeatureTipReplayCount(homeTipsReplayCount + 1);
    setHomeTipsReplayCount(nextReplayCount);
    void AsyncStorage.multiSet([
      [HOME_FEATURE_TIPS_INDEX_KEY, '0'],
      [HOME_FEATURE_TIPS_DONE_KEY, '0'],
      [HOME_FEATURE_TIPS_REPLAY_COUNT_KEY, String(nextReplayCount)],
    ])
      .finally(() => {
        DeviceEventEmitter.emit(HOME_FEATURE_TIPS_RESET_EVENT, nextReplayCount);
        goHome();
      });
  }, [goHome, homeTipsReplayCount]);
  const settingsTabVisible = activeIdx === SETTINGS_TAB_IDX;

  useEffect(() => {
    if (settingsTabVisible && scrollRef.current) {
      scrollRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [settingsTabVisible]);

  const appSnapshot = useAppSnapshotSelector((snapshot) => ({
    profile: snapshot.profile,
    settings: snapshot.settings,
  }), (a, b) => a.profile === b.profile && a.settings === b.settings);
  const [userName, setUserName] = useState(() => appSnapshot.profile?.name ?? '');
  /** Пока false — ник ещё не прочитан из AsyncStorage (избегаем кадра «Не задано»). */
  const [nameReady, setNameReady] = useState(() => !!appSnapshot.profile);
  const [nameModal, setNameModal] = useState(false);
  const [newName, setNewName]     = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const nameSavingRef = useRef(false);
  const settingsStorageHydratedRef = useRef(false);
  useEffect(() => {
    if (nameModal) warmNameAvailabilityAuth();
  }, [nameModal]);
  const { isPremium, isVip, hasPremiumAccess, isIntroFullAccess, introFullAccessEndsAt } = usePremium();
  const [premiumPlan, setPremiumPlan] = useState<string | null>(null);
  const [vipPlan, setVipPlan] = useState('');
  const [vipUntilMs, setVipUntilMs] = useState(0);
  const [ideasOn, setIdeasOn] = useState(isIdeasEnabled());
  const [promoCodesOn, setPromoCodesOn] = useState(isPromoCodesEnabled());
  const [topHelpersOn, setTopHelpersOn] = useState(isTopHelpersEnabled());
  const roulettePolicy = useReferralRoulettePolicy();
  const settingsReferralToken = captureAccountGeneration();
  const settingsReferralAccountKey = accountScopeKey(settingsReferralToken);
  const [settingsReferralDrain, setSettingsReferralDrain] = useState(() => (
    readReferralDrain(settingsReferralToken)?.value ?? null
  ));
  const [settingsReferralStateKey, setSettingsReferralStateKey] = useState<string | null>(() => (
    settingsReferralAccountKey
  ));
  const scopedSettingsReferralState = selectAccountScopedReferralState(settingsReferralAccountKey, {
    accountKey: settingsReferralStateKey,
    drain: settingsReferralDrain,
  });
  const settingsReferralSurface = selectReferralSurfaceState({
    referralEnabled: isReferralCloudEnabled(),
    remotePolicy: roulettePolicy,
    persistedDrain: scopedSettingsReferralState.drain,
  });
  const settingsReferralDrainVisible = settingsReferralSurface.drainVisible;
  const settingsReferralRowVisible = settingsReferralSurface.marketingVisible
    || settingsReferralDrainVisible;
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

  useEffect(() => {
    if (!settingsTabVisible || settingsReferralSurface.emergencyStop) return;
    const token = captureAccountGeneration();
    if (accountScopeKey(token) !== settingsReferralAccountKey) return;
    const cached = readReferralDrain(token);
    setSettingsReferralStateKey(settingsReferralAccountKey);
    setSettingsReferralDrain(cached?.value ?? null);
    let alive = true;
    void getClaimableReferralState()
      .then((state) => {
        if (!alive || !state.ok || !isCurrentAccountGeneration(token)) return;
        setSettingsReferralStateKey(accountScopeKey(token));
        setSettingsReferralDrain(state.drain);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [
    focusTick,
    settingsReferralSurface.emergencyStop,
    settingsReferralSurface.softEnabled,
    settingsReferralAccountKey,
    settingsTabVisible,
  ]);

  const [hapticTap,  setHapticTap]   = useState(() => appSnapshot.settings?.tapHaptics ?? true);
  // Согласие на аналитику, юр-документы и удаление аккаунта переехали на
  // отдельный экран /privacy_settings (ряд «Приватность и данные»). Здесь эта
  // логика больше не живёт.

  useEffect(() => {
    if (appSnapshot.profile) {
      setUserName(current => current || appSnapshot.profile!.name);
      setNameReady(true);
    }
    if (appSnapshot.settings?.tapHaptics != null) {
      setHapticTap(appSnapshot.settings.tapHaptics);
    }
  }, [appSnapshot.profile, appSnapshot.settings]);

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
  }, [loadStudyTarget]);
  useEffect(() => {
    if (!settingsTabVisible) return;
    void loadStudyTarget();
  }, [settingsTabVisible, focusTick, loadStudyTarget]);
  const currentThemeLabel = (() => {
    const names: Record<string, Record<Lang, string>> = {
      dark: { ru: 'Форест', uk: 'Форест', es: 'Bosque', 'pt-BR': 'Floresta', vi: 'Rừng', id: 'Hutan', tr: 'Orman', pl: 'Las' },
      gold: { ru: 'Золото', uk: 'Золото', es: 'Oro', 'pt-BR': 'Ouro', vi: 'Vàng', id: 'Emas', tr: 'Altın', pl: 'Złoto' },
      coral: { ru: 'Корал', uk: 'Корал', es: 'Coral', 'pt-BR': 'Coral', vi: 'San hô', id: 'Koral', tr: 'Mercan', pl: 'Koral' },
      minimalDark: { ru: 'Оникс', uk: 'Онікс', es: 'Ónix', 'pt-BR': 'Ônix', vi: 'Mã não', id: 'Onyx', tr: 'Oniks', pl: 'Onyks' },
      business: { ru: 'Бизнес', uk: 'Бізнес', es: 'Negocios', 'pt-BR': 'Negócios', vi: 'Doanh nghiệp', id: 'Bisnis', tr: 'İş', pl: 'Biznes' },
      businessLight: { ru: 'Бизнес светлый', uk: 'Бізнес світлий', es: 'Negocios claro', 'pt-BR': 'Negócios claro', vi: 'Doanh nghiệp sáng', id: 'Bisnis terang', tr: 'İş açık', pl: 'Biznes jasny' },
      midnight: { ru: 'Полночь', uk: 'Північ', es: 'Medianoche', 'pt-BR': 'Meia-noite', vi: 'Nửa đêm', id: 'Tengah malam', tr: 'Gece yarısı', pl: 'Północ' },
      ember: { ru: 'Янтарь', uk: 'Бурштин', es: 'Ámbar', 'pt-BR': 'Âmbar', vi: 'Hổ phách', id: 'Amber', tr: 'Kehribar', pl: 'Bursztyn' },
      aurora: { ru: 'Сияние', uk: 'Сяйво', es: 'Aurora', 'pt-BR': 'Aurora', vi: 'Cực quang', id: 'Aurora', tr: 'Aurora', pl: 'Zorza' },
      volt: { ru: 'Лайм', uk: 'Лайм', es: 'Lima', 'pt-BR': 'Lima', vi: 'Chanh', id: 'Lime', tr: 'Limon', pl: 'Limetka' },
      candyBlue: { ru: 'Кенди Блу', uk: 'Кенді Блу', es: 'Azul caramelo', 'pt-BR': 'Azul candy', vi: 'Xanh kẹo', id: 'Biru permen', tr: 'Şeker mavisi', pl: 'Cukrowy błękit' },
      indigo: { ru: 'Индиго', uk: 'Індиго', es: 'Índigo', 'pt-BR': 'Índigo', vi: 'Chàm', id: 'Indigo', tr: 'İndigo', pl: 'Indygo' },
      vanilla: { ru: 'Ванилла', uk: 'Ванілла', es: 'Vainilla', 'pt-BR': 'Baunilha', vi: 'Va ni', id: 'Vanila', tr: 'Vanilya', pl: 'Wanilia' },
    };
    const entry = names[themeMode] ?? names.minimalDark;
    return entry[lang];
  })();

  const refreshSupplementalAccessState = useCallback(() => {
    AsyncStorage.multiGet(['vip_plan', 'vip_until', 'vip_expiry'])
      .then(pairs => {
        setVipPlan(String(pairs[0][1] ?? '').trim().toLowerCase());
        setVipUntilMs(parseStoredExpiryMs(pairs[1][1] ?? pairs[2][1]));
      })
      .catch(() => {});
  }, []);


  useEffect(() => {
    if (!settingsTabVisible && settingsStorageHydratedRef.current) return;
    settingsStorageHydratedRef.current = true;
    let cancelled = false;
    AsyncStorage.multiGet(['user_name', 'premium_plan', 'vip_until', 'vip_expiry', 'haptics_tap', 'user_total_xp'])
      .then(pairs => {
        if (cancelled) return;
        if (pairs[0][1]) {
          setUserName(pairs[0][1]);
        }
        patchAppSnapshot((current) => current.profile ? {
          profile: {
            ...current.profile,
            source: 'storage',
            updatedAt: Date.now(),
            name: pairs[0][1]?.trim() || current.profile.name,
          },
          settings: current.settings ? {
            ...current.settings,
            source: 'storage',
            updatedAt: Date.now(),
            tapHaptics: pairs[4][1] === null ? current.settings.tapHaptics : pairs[4][1] !== 'false',
          } : undefined,
        } : {});
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
    setTopHelpersOn(isTopHelpersEnabled());
    refreshSupplementalAccessState();
    return () => { cancelled = true; };
  }, [settingsTabVisible, refreshSupplementalAccessState]); // warm once, refresh when opening Settings

  useEffect(() => {
    const refreshRemoteFlags = () => {
      setIdeasOn(isIdeasEnabled());
      setPromoCodesOn(isPromoCodesEnabled());
      setTopHelpersOn(isTopHelpersEnabled());
    };
    const sub = DeviceEventEmitter.addListener('remote_config_changed', refreshRemoteFlags);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const refreshVipUntil = () => {
      refreshSupplementalAccessState();
    };
    const onVipActivated = DeviceEventEmitter.addListener('vip_activated', refreshVipUntil);
    const onAccessChanged = DeviceEventEmitter.addListener('premium_access_changed', refreshVipUntil);
    const onIntroChanged = DeviceEventEmitter.addListener('intro_full_access_changed', refreshVipUntil);
    return () => {
      onVipActivated.remove();
      onAccessChanged.remove();
      onIntroChanged.remove();
    };
  }, [refreshSupplementalAccessState]);

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
    if (!settingsTabVisible) return;
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
  }, [settingsTabVisible, focusTick]);

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
    if (nameSavingRef.current) return;
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

    nameSavingRef.current = true;
    setNameSaving(true);
    try {
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
        patchAppSnapshot((current) => current.profile ? {
          profile: {
            ...current.profile,
            source: 'local',
            updatedAt: Date.now(),
            name: trimmed,
          },
        } : {});
        await updateLocalNameReferences(oldName, trimmed);
        closeNameModalNow();
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

      void syncArenaDisplayName(trimmed).catch((error) => {
        DebugLogger.error('settings.tsx:renameName:arenaSync', error, 'warning');
      });
      void syncMyLeagueMemberProfileNow();
    } finally {
      nameSavingRef.current = false;
      setNameSaving(false);
    }
  };

  const vipExpiryText = vipUntilMs > 0
    ? `${L('Действует до', 'Діє до', 'Active until', 'Ativo até', 'Có hiệu lực đến', 'Aktif sampai', 'Bitiş', 'Ważne do')} ${formatDateTimeShort(vipUntilMs)}`
    : L('Plus без срока окончания', 'Plus без дати завершення', 'Plus has no end date', 'Plus sem data de término', 'Plus không có ngày kết thúc', 'Plus tanpa tanggal akhir', 'Plus bitiş tarihi yok', 'Plus bez daty zakończenia');

  const vipAccessTitle = (() => {
    switch (vipPlan) {
      case 'promo':
      case 'promo_lifetime':
        return L('Промокод', 'Промокод', 'Promo code', 'Código promocional', 'Mã khuyến mãi', 'Kode promo', 'Promo kod', 'Kod promocyjny');
      case 'referral':
        return L('Подарок за приглашения', 'Подарунок за запрошення', 'Referral gift', 'Presente por convite', 'Quà mời bạn bè', 'Hadiah undangan', 'Davet hediyesi', 'Prezent za zaproszenia');
      case 'survey_vip':
        return L('Plus за опрос', 'Plus за опитування', 'Plus for survey', 'Plus por pesquisa', 'Plus từ khảo sát', 'Plus dari survei', 'Anket Plus', 'Plus za ankietę');
      case 'idea_reward':
        return L('Plus за идею', 'Plus за ідею', 'Plus for an idea', 'Plus por ideia', 'Plus cho ý tưởng', 'Plus untuk ide', 'Fikir Plus', 'Plus za pomysł');
      case 'telegram_tester':
        return L('Тестерский Plus', 'Тестерський Plus', 'Tester Plus', 'Plus de testador', 'Plus thử nghiệm', 'Plus tester', 'Test Plus', 'Tester Plus');
      case 'admin_vip':
        return L('Выданный Plus', 'Виданий Plus', 'Granted Plus', 'Plus concedido', 'Plus được cấp', 'Plus diberikan', 'Verilen Plus', 'Przyznany Plus');
      default:
        return L('Дополнительный Plus-доступ', 'Додатковий Plus-доступ', 'Extra Plus access', 'Acesso Plus extra', 'Quyền Plus bổ sung', 'Akses Plus tambahan', 'Ek Plus erişimi', 'Dodatkowy dostęp Plus');
    }
  })();

  const plusAccessDetails: PlusAccessDetail[] = [];
  if (isVip) {
    plusAccessDetails.push({
      key: 'vip',
      icon: vipPlan === 'referral' ? 'people-outline' : vipPlan === 'survey_vip' ? 'chatbox-ellipses-outline' : 'ticket-outline',
      title: vipAccessTitle,
      subtitle: vipExpiryText,
      testID: 'settings-vip-card',
      titleTestID: 'settings-vip-subtitle',
      subtitleTestID: 'settings-vip-expiry',
    });
  }
  if (isIntroFullAccess && introFullAccessEndsAt && introFullAccessEndsAt > Date.now()) {
    plusAccessDetails.push({
      key: 'intro',
      icon: 'sparkles-outline',
      title: L('Полный доступ на 3 дня', 'Повний доступ на 3 дні', 'Full access for 3 days', 'Acesso completo por 3 dias', 'Truy cập đầy đủ 3 ngày', 'Akses penuh 3 hari', '3 gün tam erişim', 'Pełny dostęp na 3 dni'),
      subtitle: `${L('Действует до', 'Діє до', 'Active until', 'Ativo até', 'Có hiệu lực đến', 'Aktif sampai', 'Bitiş', 'Ważne do')} ${formatDateTimeShort(introFullAccessEndsAt)}`,
    });
  }

  // Список настроек переведён на Telegram-стиль: сгруппированные карточки
  // (components/settings/SettingsGroup). Старые локальные Row/SectionTitle удалены.

  // Верх экрана — по референсу Bevel: плашка Plus + ввод реферального кода +
  // промокод одной группой, под ней широкий инвайт-баннер с картинкой.
  const plusRowLabel = hasPremiumAccess
    ? `${premiumPlan === 'lifetime' ? 'Pro' : 'Plus'} ${L('активирован', 'активовано', 'activo', 'ativado', 'đã kích hoạt', 'aktif', 'aktif', 'aktywne')} ✓`
    : 'Phraseman Plus';
  const plusRowSub = hasPremiumAccess
    ? (isPremium && premiumPlan === 'lifetime'
      ? L('Phraseman Pro · разовая покупка', 'Phraseman Pro · разова покупка', 'Phraseman Pro · compra única', 'Phraseman Pro · compra única', 'Phraseman Pro · mua một lần', 'Phraseman Pro · pembelian sekali', 'Phraseman Pro · tek seferlik satın alma', 'Phraseman Pro · zakup jednorazowy')
      : isPremium && premiumPlan === 'yearly'
      ? L('Годовая подписка', 'Річна підписка', 'Suscripción anual', 'Assinatura anual', 'Gói hằng năm', 'Langganan tahunan', 'Yıllık abonelik', 'Subskrypcja roczna')
      : isPremium && premiumPlan === 'monthly'
        ? L('Ежемесячная подписка', 'Щомісячна підписка', 'Suscripción mensual', 'Assinatura mensal', 'Gói hằng tháng', 'Langganan bulanan', 'Aylık abonelik', 'Subskrypcja miesięczna')
        : L('Plus доступ активен', 'Plus доступ активний', 'Plus access active', 'Acesso Plus ativo', 'Quyền Plus đang hoạt động', 'Akses Plus aktif', 'Plus erişim aktif', 'Dostęp Plus aktywny'))
    : L('Месячный или годовой план', 'Місячний або річний план', 'Plan mensual o anual', 'Plano mensal ou anual', 'Gói tháng hoặc năm', 'Paket bulanan atau tahunan', 'Aylık veya yıllık plan', 'Plan miesięczny albo roczny');
  const plusRowPress = () => {
    doHaptic();
    if (hasPremiumAccess) {
      router.push({ pathname: '/premium_modal', params: { manage: '1' } } as any);
    } else {
      router.push({ pathname: '/premium_modal', params: { context: 'generic', source: 'settings_premium' } } as any);
    }
  };

  /** «Очистить кеш»: только косметические кеши (картинки, SWR друзей/рефералки). Прогресс/аккаунт не трогаем. */
  const confirmClearCache = () => {
    doHaptic();
    Alert.alert(
      L('Очистить кеш?', 'Очистити кеш?', '¿Borrar caché?', 'Limpar cache?', 'Xóa bộ nhớ đệm?', 'Hapus cache?', 'Önbellek temizlensin mi?', 'Wyczyścić pamięć podręczną?'),
      L('Удалим кеш картинок и временные данные. Прогресс, аккаунт и покупки останутся на месте.', 'Видалимо кеш зображень і тимчасові дані. Прогрес, акаунт і покупки залишаться.', 'Borraremos la caché de imágenes y datos temporales. El progreso, la cuenta y las compras se mantienen.', 'Vamos apagar o cache de imagens e dados temporários. Progresso, conta e compras permanecem.', 'Xóa cache hình ảnh và dữ liệu tạm. Tiến trình, tài khoản và gói mua vẫn giữ nguyên.', 'Cache gambar dan data sementara akan dihapus. Progres, akun, dan pembelian tetap aman.', 'Görsel önbelleği ve geçici veriler silinir. İlerleme, hesap ve satın alımlar korunur.', 'Usuniemy pamięć podręczną obrazów i dane tymczasowe. Postęp, konto i zakupy zostają.'),
      [
        { text: L('Отмена', 'Скасувати', 'Cancelar', 'Cancelar', 'Hủy', 'Batal', 'Vazgeç', 'Anuluj'), style: 'cancel' as const },
        {
          text: L('Очистить', 'Очистити', 'Borrar', 'Limpar', 'Xóa', 'Hapus', 'Temizle', 'Wyczyść'),
          style: 'destructive' as const,
          onPress: () => {
            void clearAppCaches().then(() => {
              Alert.alert(L('Готово', 'Готово', 'Listo', 'Pronto', 'Xong', 'Selesai', 'Tamam', 'Gotowe'), L('Кеш очищен.', 'Кеш очищено.', 'Caché borrada.', 'Cache limpo.', 'Đã xóa bộ nhớ đệm.', 'Cache dihapus.', 'Önbellek temizlendi.', 'Pamięć podręczna wyczyszczona.'));
            }).catch(() => {});
          },
        },
      ],
    );
  };

  const premiumDetails = hasPremiumAccess && plusAccessDetails.length > 0 ? (
          <View
            testID="settings-plus-access-details"
            style={{
              marginHorizontal: SETTINGS_GROUP_MARGIN,
              marginTop: 8,
              marginBottom: 16,
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: isCompassTheme ? 8 : 12,
              backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : settingsPanelBg,
              borderWidth: 0,
              borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : settingsBorder,
              overflow: 'hidden',
              ...(isCompassTheme ? compassShadow(1) : {}),
            }}
          >
            {isCompassTheme ? <CompassDepthSurface radius={8} quiet /> : null}
            {plusAccessDetails.map((detail, index) => (
              <View
                key={detail.key}
                testID={detail.testID}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 10,
                  borderTopWidth: index === 0 ? 0 : 0.5,
                  borderTopColor: isCompassTheme ? COMPASS_RICH.hairline : settingsDivider,
                }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isCompassTheme ? COMPASS_RICH.charcoal : t.bgSurface,
                    marginRight: 10,
                  }}
                >
                  <Ionicons name={detail.icon} size={18} color={isCompassTheme ? COMPASS_RICH.champagne : t.accent} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    testID={detail.titleTestID}
                    style={{
                      color: isCompassTheme ? COMPASS_RICH.cream : t.textPrimary,
                      fontSize: f.caption,
                      fontWeight: '900',
                    }}
                  >
                    {detail.title}
                  </Text>
                  <Text
                    testID={detail.subtitleTestID}
                    style={{
                      color: isCompassTheme ? COMPASS_RICH.textMuted : t.textSecond,
                      fontSize: f.caption,
                      lineHeight: 18,
                      fontWeight: '700',
                      marginTop: 2,
                    }}
                  >
                    {detail.subtitle}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null;

  return (
    <ScreenGradient>
      <BouncyWrap style={bouncyStyle}>
      <Reanimated.ScrollView
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
        onScroll={onAnimatedScroll}
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
              borderWidth: 0,
              borderColor: 'transparent',
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

        {/* Верхняя группа по референсу Bevel: Plus + ввод реферального кода + промокод. */}
        <SettingsGroup marginTop={8} surfaceColor={settingsPanelBg} borderColor={settingsBorder} dividerColor={settingsDivider}>
          <SettingsRow
            testID="settings-plus-row"
            icon={hasPremiumAccess ? 'diamond' : 'diamond-outline'}
            color="yellow"
            label={plusRowLabel}
            sub={plusRowSub}
            onPress={plusRowPress}
          />
          {settingsReferralSurface.marketingVisible ? (
            <SettingsRow
              testID="settings-referral-code-row"
              icon="gift"
              color="pink"
              label={L('Ввести реферальный код', 'Ввести реферальний код', 'Introducir código de invitación', 'Inserir código de indicação', 'Nhập mã giới thiệu', 'Masukkan kode referal', 'Davet kodunu gir', 'Wpisz kod polecenia')}
              // зачем: отдельный экран ввода удалён — тот же единый экран рефералов,
              // ?enter=1 сразу выдвигает шит «Код от друга».
              onPress={() => { doHaptic(); router.push('/referrals?enter=1' as any); }}
            />
          ) : null}
          {!hasPremiumAccess && promoCodesOn ? (
            <SettingsRow
              testID="settings-promo-code-row"
              icon="ticket-outline"
              color="purple"
              label={L('Ввести промокод', 'Ввести промокод', 'Introducir código', 'Inserir código', 'Nhập mã', 'Masukkan kode', 'Kodu gir', 'Wpisz kod')}
              onPress={() => { doHaptic(); router.push('/promo_code_entry' as any); }}
            />
          ) : null}
        </SettingsGroup>
        {premiumDetails}
        {settingsReferralRowVisible ? (
          <TouchableOpacity
            testID="settings-invite-banner"
            accessibilityRole="button"
            accessibilityLabel={L('Пригласи друга — выиграй Plus', 'Запроси друга — виграй Plus', 'Invita a un amigo y gana Plus', 'Convide um amigo e ganhe Plus', 'Mời bạn bè — thắng Plus', 'Undang teman — menangkan Plus', 'Arkadaşını davet et — Plus kazan', 'Zaproś znajomego — wygraj Plus')}
            activeOpacity={0.88}
            onPress={() => { doHaptic(); router.push('/referrals' as any); }}
            style={{
              marginHorizontal: SETTINGS_GROUP_MARGIN,
              marginTop: 12,
              borderRadius: 16,
              overflow: 'hidden',
              backgroundColor: settingsPanelBg,
              borderWidth: 0,
              borderColor: settingsBorder,
              ...(isCompassTheme ? compassShadow(1) : {}),
            }}
          >
            {isCompassTheme ? <CompassDepthSurface radius={8} quiet /> : null}
            <Image
              source={INVITE_GIFT_BANNER}
              style={{ width: '100%', height: 132 }}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={120}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '800' }}>
                  {L('Пригласи друга — выиграй Plus', 'Запроси друга — виграй Plus', 'Invita a un amigo y gana Plus', 'Convide um amigo e ganhe Plus', 'Mời bạn bè — thắng Plus', 'Undang teman — menangkan Plus', 'Arkadaşını davet et — Plus kazan', 'Zaproś znajomego — wygraj Plus')}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 2, lineHeight: 17 }}>
                  {settingsReferralSurface.softEnabled
                    ? L('Когда друг оформит Plus или Pro, ты получишь шанс выиграть Plus от 1 до 365 дней', 'Коли друг оформить Plus або Pro, ти отримаєш шанс виграти Plus від 1 до 365 днів', 'Cuando tu amigo compre Plus o Pro, tendrás la oportunidad de ganar Plus de 1 a 365 días', 'Quando seu amigo assinar Plus ou Pro, você terá a chance de ganhar Plus de 1 a 365 dias', 'Khi bạn bè mua Plus hoặc Pro, bạn có cơ hội thắng Plus từ 1 đến 365 ngày', 'Saat temanmu membeli Plus atau Pro, kamu berkesempatan memenangkan Plus 1–365 hari', 'Arkadaşın Plus veya Pro satın aldığında 1–365 gün Plus kazanma şansın olur', 'Gdy znajomy kupi Plus lub Pro, dostaniesz szansę wygrać Plus od 1 do 365 dni')
                    : L('У тебя остались шансы выиграть Plus — забери их до срока', 'У тебе залишилися шанси виграти Plus — забери їх до строку', 'Te quedan oportunidades de ganar Plus: úsalas antes del plazo', 'Você ainda tem chances de ganhar Plus — use-as antes do prazo', 'Bạn vẫn còn cơ hội thắng Plus — hãy dùng trước hạn', 'Kamu masih punya kesempatan memenangkan Plus — pakai sebelum batas waktu', 'Plus kazanma şansların duruyor — süresi dolmadan kullan', 'Masz jeszcze szanse wygrać Plus — wykorzystaj je przed terminem')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={t.textGhost} />
            </View>
          </TouchableOpacity>
        ) : null}

        {isStudyTargetSourceUiLang(lang) && (
          <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 6 }}>
            <Text style={{ color: screenMuted, fontSize: f.label, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
              {L('Изучаемый язык', 'Мова, яку вивчаєте', 'Idioma de estudio', 'Idioma de estudo', 'Ngôn ngữ học', 'Bahasa yang dipelajari', 'Öğrenilen dil', 'Język nauki')}
            </Text>
            <StudyLanguagePicker
              lang={lang}
              activeTarget={studyTarget}
              labelFontSize={f.caption}
              palette={{
                surfaceOn: isCompassTheme ? COMPASS_RICH.champagne : chipSurfaceOn,
                surfaceOff: isCompassTheme ? COMPASS_RICH.charcoalRaised : chipSurfaceOff,
                borderOn: isCompassTheme ? COMPASS_RICH.hairlineStrong : (isGradientLight ? chipSurfaceOn : t.accent),
                borderOff: isCompassTheme ? COMPASS_RICH.hairlineQuiet : chipBorderOff,
                textOn: isCompassTheme ? COMPASS_RICH.textDark : chipTextOn,
                textOff: isCompassTheme ? screenPrimary : chipTextOff,
                badge: t.accent,
              }}
              onSwitched={loadStudyTarget}
            />
            <Text style={{ color: screenGhost, fontSize: f.caption - 1, marginTop: 8, lineHeight: 18 }}>
              {L(
                ENABLE_DEV_STUDY_TARGET_LANG
                  ? 'French и Spanish доступны только в DEV-режиме. В публичной версии открыт английский.'
                  : 'В публичной версии сейчас открыт английский.',
                ENABLE_DEV_STUDY_TARGET_LANG
                  ? 'French і Spanish доступні лише в DEV-режимі. У публічній версії відкрита англійська.'
                  : 'У публічній версії зараз відкрита англійська.',
                ENABLE_DEV_STUDY_TARGET_LANG
                  ? 'French and Spanish are DEV-only. The public version keeps English active.'
                  : 'The public version currently keeps English active.',
                ENABLE_DEV_STUDY_TARGET_LANG
                  ? 'French and Spanish are DEV-only. The public version keeps English active.'
                  : 'The public version currently keeps English active.',
                ENABLE_DEV_STUDY_TARGET_LANG
                  ? 'French and Spanish are DEV-only. The public version keeps English active.'
                  : 'The public version currently keeps English active.',
                ENABLE_DEV_STUDY_TARGET_LANG
                  ? 'French and Spanish are DEV-only. The public version keeps English active.'
                  : 'The public version currently keeps English active.',
                ENABLE_DEV_STUDY_TARGET_LANG
                  ? 'French and Spanish are DEV-only. The public version keeps English active.'
                  : 'The public version currently keeps English active.',
                ENABLE_DEV_STUDY_TARGET_LANG
                  ? 'French and Spanish are DEV-only. The public version keeps English active.'
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
            label={L('Язык интерфейса', 'Мова інтерфейсу', 'Idioma de la interfaz', 'Idioma da interface', 'Ngôn ngữ giao diện', 'Bahasa antarmuka', 'Arayüz dili', 'Język interfejsu')}
            sub={LANG_NATIVE[lang]}
            onPress={() => router.push('/settings_language' as any)}
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
              borderWidth: 0, borderColor: 'transparent',
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



        <SettingsSectionTitle title={L('Внешний вид и отклик', 'Вигляд і відгук', 'Apariencia y respuesta', 'Aparência e resposta', 'Giao diện và phản hồi', 'Tampilan dan respons', 'Görünüm ve geri bildirim', 'Wygląd i reakcje')} />
        <SettingsGroup surfaceColor={settingsPanelBg} borderColor={settingsBorder} dividerColor={settingsDivider}>
          <SettingsRow
            icon="color-palette"
            color="purple"
            label={L('Темы', 'Теми', 'Temas', 'Temas', 'Chủ đề', 'Tema', 'Temalar', 'Motywy')}
            sub={currentThemeLabel}
            onPress={() => router.push('/settings_themes' as any)}
          />

          {/* РАЗМЕР ШРИФТА — в плоском IG-режиме типографика фиксирована, настройка скрыта */}
          {isFlatUi ? null : (
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
                  {/* зачем: динамическое сжатие шрифта убрано (запрещённый паттерн) — подпись
                      короткое слово в равнодолевой (flex:1) плитке без фиксированной высоты,
                      при нехватке места просто перенесётся на 2 строки, guard-ok */}
                  <Text numberOfLines={2} style={{ fontSize: f.label, color: isCompassTheme ? (fontSize === sz ? COMPASS_RICH.textDark : screenMuted) : fontSize === sz ? chipTextOn : t.textMuted, marginTop: 4, textAlign: 'center' }}>
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
          )}

          {/* Тактильный отклик — глобальный */}
          <SettingsRow
            icon="phone-portrait"
            color="orange"
            label={L('Тактильный отклик', 'Тактильний відгук', 'Respuesta háptica', 'Resposta tátil', 'Phản hồi rung', 'Umpan balik haptik', 'Dokunsal geri bildirim', 'Reakcja haptyczna')}
            hideChevron
            right={
              <CustomSwitch
                value={hapticTap}
                onValueChange={val => {
                  setHapticTap(val);
                  setHapticCacheEnabled(val);
                  patchAppSnapshot((current) => current.settings ? {
                    settings: {
                      ...current.settings,
                      source: 'local',
                      updatedAt: Date.now(),
                      tapHaptics: val,
                    },
                  } : {});
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
            onPress={() => router.push('/settings_notifications')}
          />
          {homeTipsReplayAvailable ? (
            <SettingsRow
              testID="settings-show-home-tips"
              icon="bulb"
              color="teal"
              label={L('Показать подсказки снова', 'Показати підказки знову', 'Mostrar consejos de nuevo', 'Mostrar dicas de novo', 'Hiện lại mẹo', 'Tampilkan tips lagi', 'İpuçlarını yeniden göster', 'Pokaż wskazówki ponownie')}
              onPress={resetHomeFeatureTips}
            />
          ) : null}
          {/* «Все подарки» — только в админ-панели (Справочник подарков), не в проде.
              Каталог живёт в components/admin_panel/sections/GiftsCatalogSection.tsx. */}
        </SettingsGroup>

        {/* «Сообщество» и «Ещё» слиты в одну секцию — раньше каждая держала по
            одному ряду и плодила лишние заголовки. Приглашения/реферальный код
            переехали в верхнюю группу и инвайт-баннер (референс Bevel). */}
        <SettingsSectionTitle title={L('Сообщество и помощь', 'Спільнота й допомога', 'Comunidad y ayuda', 'Comunidade e ajuda', 'Cộng đồng và trợ giúp', 'Komunitas dan bantuan', 'Topluluk ve yardım', 'Społeczność i pomoc')} />
        <SettingsGroup surfaceColor={settingsPanelBg} borderColor={settingsBorder} dividerColor={settingsDivider}>
          {topHelpersOn ? (
            <SettingsRow
              testID="settings-top-helpers-row"
              icon="ribbon"
              color="yellow"
              label={L('Топ хелперов', 'Топ хелперів', 'Top Helpers', 'Top Helpers', 'Top Helpers', 'Top Helpers', 'Top Helpers', 'Top Helpers')}
              onPress={() => router.push('/top_helpers' as any)}
            />
          ) : null}
          {ideasOn ? (
            <SettingsRow
              testID="settings-ideas-row"
              icon="bulb"
              color="yellow"
              label={L('Идеи', 'Ідеї', 'Ideas', 'Ideias', 'Ý tưởng', 'Ide', 'Fikirler', 'Pomysły')}
              onPress={() => router.push('/ideas_submit' as any)}
            />
          ) : null}
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

        {/* Приватность и данные — всё, что касается данных пользователя, собрано в
            один блок внизу: согласие на аналитику (раньше терялось в «Профиле»),
            юридические документы (раньше только мелким шрифтом в подвале) и
            удаление аккаунта (раньше голой серой строкой без группы). */}
        {/* Один ряд → отдельный экран privacy_settings, где ВСЁ вместе: галочка
            согласия на аналитику, Политика конфиденциальности, Условия
            использования и удаление аккаунта. */}
        <SettingsSectionTitle title={L('Приватность и данные', 'Приватність і дані', 'Privacidad y datos', 'Privacidade e dados', 'Quyền riêng tư và dữ liệu', 'Privasi dan data', 'Gizlilik ve veriler', 'Prywatność i dane')} />
        <SettingsGroup surfaceColor={settingsPanelBg} borderColor={settingsBorder} dividerColor={settingsDivider}>
          <SettingsRow
            testID="settings-privacy-row"
            icon="lock-closed"
            color="teal"
            label={L('Приватность и данные', 'Приватність і дані', 'Privacidad y datos', 'Privacidade e dados', 'Quyền riêng tư và dữ liệu', 'Privasi dan data', 'Gizlilik ve veriler', 'Prywatność i dane')}
            onPress={() => router.push('/privacy_settings' as never)}
          />
          <SettingsRow
            testID="settings-clear-cache-row"
            icon="trash-bin"
            color="gray"
            label={L('Очистить кеш картинок', 'Очистити кеш зображень', 'Borrar caché de imágenes', 'Limpar cache de imagens', 'Xóa bộ nhớ đệm hình ảnh', 'Hapus cache gambar', 'Görsel önbelleğini temizle', 'Wyczyść pamięć obrazów')}
            onPress={confirmClearCache}
          />
        </SettingsGroup>

        {/* Подвал — бренд и версия (юр. документы переехали в «Приватность и данные»). */}
        <View style={{ alignItems:'center', paddingVertical:32, marginTop:20, borderTopWidth:0.5, borderTopColor:screenBorder }}>
          <TouchableOpacity activeOpacity={1}>
            <Text style={{ color:screenMuted, fontSize:f.caption, fontWeight:'600', letterSpacing:0.5, textAlign:'center' }}>
              PHRASEMAN
            </Text>
            <Text style={{ color:screenMuted, fontSize:f.caption, marginTop:4, textAlign:'center' }}>
              by Knowly
            </Text>
            <Text style={{ color:screenMuted, fontSize:f.caption - 1, marginTop:6, textAlign:'center' }}>
              {`${Constants.expoConfig?.version ?? ''} (${getAppReleaseBuildId()})`}
            </Text>
          </TouchableOpacity>
        </View>

      </Reanimated.ScrollView>
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
                borderWidth: 0,
                borderColor: 'transparent',
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
                borderWidth: 0,
                borderColor: 'transparent',
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
                'Перед выходом надёжно сохраним прогресс. Если соединение не ответит — отменим смену аккаунта, чтобы ничего не потерялось.',
                'Перед виходом надійно збережемо прогрес. Якщо з’єднання не відповість — скасуємо зміну акаунту, щоб нічого не загубилося.',
                'Antes de cerrar sesión guardaremos tu progreso de forma segura. Si la conexión no responde, cancelaremos el cambio de cuenta para que no pierdas nada.',
                'Antes de sair, salvaremos seu progresso com segurança. Se a conexão não responder, cancelaremos a troca de conta para que nada se perca.',
                'Trước khi đăng xuất, chúng tôi sẽ lưu tiến độ của bạn an toàn. Nếu kết nối không phản hồi, việc đổi tài khoản sẽ bị hủy để không mất gì.',
                'Sebelum keluar, progresmu akan disimpan dengan aman. Jika koneksi tidak merespons, pergantian akun dibatalkan agar tidak ada yang hilang.',
                'Çıkmadan önce ilerlemeni güvenle kaydedeceğiz. Bağlantı yanıt vermezse hiçbir şey kaybolmasın diye hesap değişimini iptal edeceğiz.',
                'Przed wylogowaniem bezpiecznie zapiszemy Twój postęp. Jeśli połączenie nie odpowie, anulujemy zmianę konta, aby nic nie przepadło.',
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
                  // Общий forced-путь «Сменить без сохранения» для всех блокировок
                  // смены аккаунта. Аварийная копия (включая очередь осколков)
                  // пишется внутри signOutAndWipeForAccountSwitch — даже при
                  // зависшем списании/карантине данные остаются восстановимыми.
                  const runForcedAccountSwitchWithoutSaving = async () => {
                    setSwitchAccountStage('wiping');
                    const forced = await signOutAndWipeForAccountSwitch({
                      allowWipeWithoutSync: true,
                      allowPendingShardSpendDiscard: true,
                    });
                    setSwitchAccountStage('idle');
                    if (!forced.ok) {
                      showInfoAlert(
                        L(
                          'Смена аккаунта отменена',
                          'Зміну акаунту скасовано',
                          'Cambio de cuenta cancelado',
                          'Troca de conta cancelada',
                          'Đã hủy đổi tài khoản',
                          'Pergantian akun dibatalkan',
                          'Hesap değişimi iptal edildi',
                          'Zmiana konta anulowana',
                        ),
                        L(
                          'Защитная проверка не разрешила удалить локальные данные. Всё осталось на месте — попробуй снова позже.',
                          'Захисна перевірка не дозволила видалити локальні дані. Усе залишилося на місці — спробуй ще раз пізніше.',
                          'La comprobación de seguridad no permitió borrar los datos locales. Todo sigue en su lugar; inténtalo más tarde.',
                          'A verificação de segurança não permitiu apagar os dados locais. Tudo continua no lugar; tente novamente mais tarde.',
                          'Kiểm tra an toàn không cho phép xóa dữ liệu cục bộ. Mọi thứ vẫn nguyên; hãy thử lại sau.',
                          'Pemeriksaan keamanan tidak mengizinkan penghapusan data lokal. Semuanya tetap aman; coba lagi nanti.',
                          'Güvenlik kontrolü yerel verilerin silinmesine izin vermedi. Her şey yerinde kaldı; daha sonra tekrar dene.',
                          'Kontrola bezpieczeństwa nie zezwoliła na usunięcie danych lokalnych. Wszystko pozostało na miejscu; spróbuj ponownie później.',
                        ),
                      );
                      return;
                    }
                    setLinkedAuth(null);
                    setAuthPromptVisible(true);
                  };
                  if (!res.ok && res.reason === 'pending_shard_spend') {
                    Alert.alert(
                      L(
                        'Покупка ещё синхронизируется',
                        'Покупка ще синхронізується',
                        'La compra aún se está sincronizando',
                        'A compra ainda está sincronizando',
                        'Giao dịch mua vẫn đang đồng bộ',
                        'Pembelian masih disinkronkan',
                        'Satın alma hâlâ eşitleniyor',
                        'Zakup nadal się synchronizuje',
                      ),
                      L(
                        'Смена аккаунта отменена: незавершённое списание монет нельзя переносить или пропускать. Подключись к интернету и попробуй снова.',
                        'Зміну акаунту скасовано: незавершене списання монет не можна переносити або пропускати. Підключися до інтернету й спробуй ще раз.',
                        'El cambio de cuenta se canceló: un gasto de monedas pendiente no se puede trasladar ni omitir. Conéctate a internet e inténtalo de nuevo.',
                        'A troca de conta foi cancelada: um gasto de monedas pendente não pode ser transferido nem ignorado. Conecte-se à internet e tente novamente.',
                        'Đã hủy đổi tài khoản: khoản trừ xu đang chờ không thể chuyển hoặc bỏ qua. Hãy kết nối internet rồi thử lại.',
                        'Pergantian akun dibatalkan: pengeluaran shard yang tertunda tidak dapat dipindahkan atau dilewati. Sambungkan internet lalu coba lagi.',
                        'Hesap değişimi iptal edildi: bekleyen jeton harcaması taşınamaz veya atlanamaz. İnternete bağlanıp tekrar dene.',
                        'Zmiana konta została anulowana: oczekującego wydatku monet nie można przenieść ani pominąć. Połącz się z internetem i spróbuj ponownie.',
                      ),
                      [
                        {
                          text: L('Понятно', 'Зрозуміло', 'Entendido', 'Entendi', 'Đã hiểu', 'Mengerti', 'Anladım', 'Rozumiem'),
                          style: 'cancel',
                        },
                        {
                          text: L('Сменить без сохранения', 'Змінити без збереження', 'Cambiar sin guardar', 'Trocar sem salvar', 'Đổi mà không lưu', 'Ganti tanpa menyimpan', 'Kaydetmeden değiştir', 'Zmień bez zapisywania'),
                          style: 'destructive',
                          onPress: runForcedAccountSwitchWithoutSaving,
                        },
                      ],
                    );
                    return;
                  }
                  if (!res.ok && res.reason === 'shard_queue_quarantined') {
                    Alert.alert(
                      L(
                        'Нужна проверка монет',
                        'Потрібна перевірка монет',
                        'Se deben revisar los monedas',
                        'É preciso verificar os monedas',
                        'Cần kiểm tra xu',
                        'Shard perlu diperiksa',
                        'Parçaların kontrol edilmesi gerekiyor',
                        'Odłamki wymagają sprawdzenia',
                      ),
                      L(
                        'Смена аккаунта отменена: локальная очередь монет повреждена или принадлежит неизвестному аккаунту. Данные сохранены для восстановления.',
                        'Зміну акаунту скасовано: локальна черга монет пошкоджена або належить невідомому акаунту. Дані збережено для відновлення.',
                        'El cambio de cuenta se canceló: la cola local de monedas está dañada o pertenece a una cuenta desconocida. Los datos se conservaron para recuperarlos.',
                        'A troca de conta foi cancelada: a fila local de monedas está danificada ou pertence a uma conta desconhecida. Os dados foram preservados para recuperação.',
                        'Đã hủy đổi tài khoản: hàng đợi xu cục bộ bị hỏng hoặc thuộc về tài khoản không xác định. Dữ liệu đã được giữ lại để khôi phục.',
                        'Pergantian akun dibatalkan: antrean shard lokal rusak atau milik akun yang tidak diketahui. Data disimpan untuk pemulihan.',
                        'Hesap değişimi iptal edildi: yerel jeton kuyruğu bozuk veya bilinmeyen bir hesaba ait. Veriler kurtarma için saklandı.',
                        'Zmiana konta została anulowana: lokalna kolejka monet jest uszkodzona lub należy do nieznanego konta. Dane zachowano do odzyskania.',
                      ),
                      [
                        {
                          text: L('Понятно', 'Зрозуміло', 'Entendido', 'Entendi', 'Đã hiểu', 'Mengerti', 'Anladım', 'Rozumiem'),
                          style: 'cancel',
                        },
                        {
                          text: L('Сменить без сохранения', 'Змінити без збереження', 'Cambiar sin guardar', 'Trocar sem salvar', 'Đổi mà không lưu', 'Ganti tanpa menyimpan', 'Kaydetmeden değiştir', 'Zmień bez zapisywania'),
                          style: 'destructive',
                          onPress: runForcedAccountSwitchWithoutSaving,
                        },
                      ],
                    );
                    return;
                  }
                  if (!res.ok && res.reason === 'sync_failed') {
                    // Прогресс не доехал до облака — switch отменён, данные целы.
                    // Даём выбор: повторить при сети или явно сменить без сохранения.
                    Alert.alert(
                      L('Прогресс не сохранён', 'Прогрес не збережено', 'Progreso no guardado', 'Progresso não salvo', 'Chưa lưu tiến độ', 'Progres belum disimpan', 'İlerleme kaydedilmedi', 'Postęp nie został zapisany'),
                      L(
                        'Не удалось надёжно сохранить прогресс — похоже, нет соединения. Смена аккаунта отменена, всё осталось на месте. Проверь интернет и попробуй снова.',
                        'Не вдалося надійно зберегти прогрес — схоже, немає з’єднання. Зміну акаунту скасовано, все залишилося на місці. Перевір інтернет і спробуй ще раз.',
                        'No pudimos guardar tu progreso de forma segura: parece que no hay conexión. El cambio de cuenta se canceló y todo sigue en su lugar. Revisa tu internet e inténtalo de nuevo.',
                        'Não foi possível salvar seu progresso com segurança — parece que não há conexão. A troca de conta foi cancelada e tudo continua no lugar. Verifique a internet e tente novamente.',
                        'Không thể lưu tiến độ an toàn — có vẻ mất kết nối. Việc đổi tài khoản đã bị hủy, mọi thứ vẫn nguyên. Kiểm tra internet và thử lại.',
                        'Kami tidak bisa menyimpan progres dengan aman — sepertinya tidak ada koneksi. Pergantian akun dibatalkan dan semuanya tetap aman. Periksa internet lalu coba lagi.',
                        'İlerlemen güvenle kaydedilemedi — bağlantı yok gibi görünüyor. Hesap değişimi iptal edildi, her şey yerinde. İnterneti kontrol edip tekrar dene.',
                        'Nie udało się bezpiecznie zapisać postępu — wygląda na brak połączenia. Zmiana konta została anulowana, wszystko zostało na miejscu. Sprawdź internet i spróbuj ponownie.',
                      ),
                      [
                        {
                          text: L('Понятно', 'Зрозуміло', 'Entendido', 'Entendi', 'Đã hiểu', 'Mengerti', 'Anladım', 'Rozumiem'),
                          style: 'cancel',
                        },
                        {
                          text: L('Сменить без сохранения', 'Змінити без збереження', 'Cambiar sin guardar', 'Trocar sem salvar', 'Đổi mà không lưu', 'Ganti tanpa menyimpan', 'Kaydetmeden değiştir', 'Zmień bez zapisywania'),
                          style: 'destructive',
                          onPress: runForcedAccountSwitchWithoutSaving,
                        },
                      ],
                    );
                    return;
                  }
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
                borderWidth: 0,
                borderColor: 'transparent',
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
                  borderWidth: 0,
                  borderColor: 'transparent',
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
              editable={!nameSaving}
              autoFocus maxLength={20}
              returnKeyType="done"
              onSubmitEditing={() => { if (!nameSaving) void saveName(); }}
              blurOnSubmit
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                activeOpacity={0.7}
                disabled={nameSaving}
                style={[
                  {
                    flex: 1,
                    padding: 12,
                    borderRadius: isCompassTheme ? 8 : 10,
                    borderWidth: 0,
                    borderColor: 'transparent',
                    alignItems: 'center',
                    backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgSurface,
                    opacity: nameSaving ? 0.6 : 1,
                    overflow: 'hidden',
                  },
                  isCompassTheme && compassShadow(1),
                ]}
                onPress={() => { if (nameSaving) return; doHaptic(); closeNameModal(); }}
              >
                {isCompassTheme ? <CompassDepthSurface radius={8} quiet /> : null}
                <Text style={{ color: t.textMuted, fontSize: f.body }} numberOfLines={1}>{L('Отмена', 'Скасувати', 'Cancelar', 'Cancelar', 'Hủy', 'Batal', 'Vazgeç', 'Anuluj')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={nameSaving}
                style={[
                  {
                    flex: 1,
                    padding: 12,
                    borderRadius: isCompassTheme ? 8 : 10,
                    backgroundColor: isCompassTheme ? COMPASS_RICH.champagne : t.accent,
                    borderWidth: 0,
                    borderColor: 'transparent',
                    alignItems: 'center',
                    minHeight: 48,
                    justifyContent: 'center',
                    opacity: nameSaving ? 0.82 : 1,
                    overflow: 'hidden',
                  },
                  isCompassTheme && compassShadow(1),
                ]}
                onPress={() => { if (nameSaving) return; doHaptic(); void saveName(); }}
              >
                {isCompassTheme ? <CompassDepthSurface radius={8} cream /> : null}
                <View style={{ minHeight: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, maxWidth: '100%' }}>
                  {nameSaving ? (
                    <ActivityIndicator size="small" color={isCompassTheme ? COMPASS_RICH.textDark : t.correctText} />
                  ) : null}
                  {/* зачем: динамическое сжатие шрифта убрано (запрещённый паттерн) — статично
                      уменьшен размер (было до 15, стало до 13), чтобы длинные варианты перевода
                      («Kaydediliyor», «Zapisywanie») влезали в flex:1-кнопку рядом с индикатором
                      без ужимания на рендере, guard-ok */}
                  <Text
                    style={{ color: isCompassTheme ? COMPASS_RICH.textDark : t.correctText, fontSize: Math.min(f.body, 13), fontWeight: '700', flexShrink: 1 }}
                    numberOfLines={1}
                  >
                    {nameSaving
                      ? L('Сохраняем', 'Зберігаємо', 'Guardando', 'Salvando', 'Đang lưu', 'Menyimpan', 'Kaydediliyor', 'Zapisywanie')
                      : L('Сохранить', 'Зберегти', 'Guardar', 'Salvar', 'Lưu', 'Simpan', 'Kaydet', 'Zapisz')}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

    </ScreenGradient>
  );
}
