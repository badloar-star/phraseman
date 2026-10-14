import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getDevPlanOverride } from '../dev_vip_override';
import {
  View, Text, TouchableOpacity,
  Modal, DeviceEventEmitter,
  InteractionManager,
  Platform,
} from 'react-native';
import Reanimated from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTabNav } from '../TabContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../components/ThemeContext';
import { useBouncy, useBouncyStyle } from '../../components/BouncyScrollView';
import RegistrationPromptModal from '../../components/RegistrationPromptModal';
import ScreenGradient from '../../components/ScreenGradient';
import PressableHybrid from '../../components/PressableHybrid';
import {
  SettingsGlassCard,
  SettingsGlassGroup,
  SettingsGlassEyebrow,
  SettingsGlassList,
  SettingsGlassRow,
  SettingsGlassSwitch,
  SettingsGlassTile,
} from '../../components/settings/SettingsGlassRows';
import { KitGlassLayer } from '../../components/v2/KitLiquidGlass';
import { actionBoxShadow, nestedBoxShadow, plateBoxShadow } from '../../components/v2/ShadowSurface';
import { ThemeAccentFill } from '../../components/v2/ThemeAccentFill';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { useMyCoinRank } from '../../hooks/use_my_coin_rank';
import { coinRankRowForDisplay, coinRankTitle, isValidCoinRank } from '../coin_rank_table_v1';
import { useTopFadeScroll } from '../../components/TopFadeScrollContext';
import { enableSmartDailyReminder, cancelAllNotifications, loadNotificationSettings } from '../notifications';
import { actionToastTri, emitAppEvent } from '../events';
import { requestOpenDevHub } from '../dev_hub_bus';
import { ENABLE_DEV_TOOLS } from '../config';
import { DebugLogger } from '../debug-logger';
import { useLang } from '../../components/LangContext';
import { usePremium } from '../../components/PremiumContext';
import CustomSwitch from '../../components/CustomSwitch';
import { hapticTap as doHaptic, setHapticCacheEnabled } from '../../hooks/use-haptics';
import { useTabContentBottomPad } from '../../hooks/use-tab-content-bottom-pad';
import { type StudyTarget } from '../study_target';
import { useStudyTarget } from '../../components/StudyTargetContext';
import { triLang } from '../../constants/i18n';
import { getLinkedAuthInfo, signOutAndWipeForAccountSwitch, type LinkedAuth } from '../auth_provider';
import { readAccountSwitchUnsavedCardsDecision } from '../account_switch_unsaved_cards';
import { enqueueThemedBlockingInfoAlert } from '../themed_blocking_alert_queue';
import { useGlassAlert } from '../../hooks/use-glass-alert';
import { plusTransferSwitchNotice, SETTINGS_OPEN_ACCOUNT_SWITCH_PARAM, shouldShowPlusTransferSwitchNotice } from '../account_switch_copy';
import { peekStableId } from '../stable_id';
import { ACCOUNT_SWITCH_UI_DEADLINE_MS, awaitWithStillRunningNotice, isAccountSwitchStillRunning } from '../account_switch_deadline';
import { accountSwitchStillRunningCopy } from '../account_switch_still_running_copy';
import { useReferralRoulettePolicy } from '../referral_roulette_flag';
import { getClaimableReferralState } from '../referral_vip';
import { captureAccountGeneration, isCurrentAccountGeneration } from '../account_generation';
import { accountScopeKey } from '../account_scope_key';
import { readReferralDrain } from '../referrals_cache';
import { isReferralCloudEnabled } from '../referral_cloud';
import { selectAccountScopedReferralState, selectReferralSurfaceState } from '../referral_surface_state';
import ReferralInviteBannerArt from '../../components/ReferralInviteBannerArt';
import Constants from 'expo-constants';
import { getAppReleaseBuildId } from '../app_build_id';
import { clearAppCaches } from '../cache_reset';
import { openStoreReviewPage } from '../store_review';

import { patchAppSnapshot, resolveHydratedProfileName, useAppSnapshotSelector } from '../app_snapshot_store';
import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
import { useRuntimeActive } from '../../hooks/use_runtime_active';
import { readVipSnapshotForGeneration } from '../premium_vip_storage';
import { SettingsMessageSlotCard } from '../../components/settings/SettingsMessageSlotCard';
import { APP_MESSAGES_SCREEN_MIN_INTERVAL_MS, hasAppMessageCopyForLang, peekAppMessagesSnapshot, refreshAppMessagesSnapshotOnce } from '../app_messages';
import { selectSettingsMessageSlots, type SettingsMessageSlotSelection } from '../settings_message_slots';
import { flushSettingsPollVotes, ownerTail } from '../settings_poll_vote';
import { animateNextLayoutTransition } from '../smooth_layout';
import { trackEvent } from '../analytics';
import { normalizePaywallAttributionValue } from '../paywall_entry_contract';
import { applyUserSettingsNow, getUserSettingsSnapshot } from '../user_settings_store';
import { themeDisplayName } from '../theme_display_names';
import StudyLanguageSheet from '../../components/settings/StudyLanguageSheet';
import {
  uiSoundsLabel,
  uiSoundsSub,
  voiceOutLabel,
  voiceOutSub,
} from '../feedback/feedback_i18n';

const EXEMPT_COLOR_2 = 'rgba(0,0,0,0.75)'; // theme-exempt: затемнение под окном — тёмный скрим в любой теме
const EXEMPT_COLOR_3 = 'rgba(0,0,0,0.62)'; // theme-exempt: затемнение под окном «Сменить аккаунт?» — `.or-dim` .62 образца, тёмный скрим в любой теме
import { noteSwallowedHandler } from '../swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

/** Картинка инвайт-баннера настроек (wire first, generate second — правило asset-хайджины). */

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

// Ключи карточек-подсказок главной — общие с home.tsx, см. app/home_feature_tips.ts.

/**
 * зачем: владелец попросил убрать раздел «Звук» из настроек, «пока он не нужен».
 * Скрываем флагом, а не удалением: разметка и переключатели целы, вернуть раздел —
 * поменять false на true. Состояние (soundSettings/updateSoundSetting) осталось
 * живым и дешёвым (локальный снапшот, без сети), чтобы возврат был мгновенным.
 */
const SHOW_SOUND_SETTINGS = false;

// зачем: собственные имена языков изучения узнаваемы при любом языке интерфейса (как в StudyLanguagePicker);
// зачем D129/D130: флаги теперь есть у всех пяти языков (итальянский и немецкий — 2026-09-30).
const STUDY_TARGET_NATIVE_NAME: Record<StudyTarget, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
};
const STUDY_TARGET_FLAG: Partial<Record<StudyTarget, number>> = {
  en: require('../../assets/images/language_flags/language_en.webp'),
  es: require('../../assets/images/language_flags/language_es_dev.webp'),
  fr: require('../../assets/images/language_flags/language_fr_dev.webp'),
  de: require('../../assets/images/language_flags/language_de.webp'),
  it: require('../../assets/images/language_flags/language_it.webp'),
};

// зачем (PM-214, §141 B; владелец: «открывается мгновенно»): строка аккаунта и тумблер напоминаний раньше рисовались пустыми и «прыгали»
// после загрузки (linkedAuth — сеть/Firestore, настройки уведомлений — диск после первого кадра). Последние известные значения держим в памяти
// процесса по stableId: следующий вход на вкладку начинается сразу с них, а настоящие данные подтягиваются фоном и заменяют снимок.
// Другой аккаунт снимок не увидит (ключ — владелец); связка/отвязка входа сбрасывает его (auth_provider_linked).
type SettingsPeek = { owner: string; linkedAuth: LinkedAuth | null | undefined; notifEnabled: boolean | undefined; notifHour: number | undefined };
let settingsPeek: SettingsPeek | null = null;
// зачем (бэклог №16, координатор 13.10: «Настройки» 1,3–1,4 с по кадрам Сверки — сперва логи): отметки до первого кадра —
// вычисление модуля → первый рендер → коммит → раскладка шапки → первый фокус. Премаунт вкладки (фокус сильно позже коммита)
// отличается от холодного входа маршрутом dev_state. Временный замер, снять после решения по №16.
const SETTINGS_MODULE_EVAL_AT = Date.now();
console.warn(`[SETTINGS-PERF] module_eval at=${SETTINGS_MODULE_EVAL_AT}`); // guard-ok: временный замер №16
function readSettingsPeek(): SettingsPeek | null {
  const owner = peekStableId();
  const hit = owner && settingsPeek && settingsPeek.owner === owner ? settingsPeek : null;
  console.log(`[SETTINGS-PEEK] read owner=${owner ? 'set' : 'none'} hit=${hit ? 'yes' : 'no'} auth=${hit?.linkedAuth === undefined ? 'unknown' : hit.linkedAuth ? 'linked' : 'none'} notif=${hit?.notifEnabled ?? 'unknown'}`);
  return hit;
}
function writeSettingsPeek(patch: Partial<Omit<SettingsPeek, 'owner'>>): void {
  const owner = peekStableId();
  if (!owner) {
    console.warn('[SETTINGS-PEEK] write skipped reason=no_stable_id');
    return;
  }
  settingsPeek = { owner, linkedAuth: undefined, notifEnabled: undefined, notifHour: undefined, ...(settingsPeek?.owner === owner ? settingsPeek : {}), ...patch };
}

export default function SettingsMain() {
  // зачем (№16, сперва логи): первый рендер этого монтирования — сколько прошло от вычисления модуля.
  const perfRef = React.useRef({ firstRenderAt: 0, committedAt: 0, layoutLogged: false, focusLogged: false });
  if (perfRef.current.firstRenderAt === 0) {
    perfRef.current.firstRenderAt = Date.now();
    console.warn(`[SETTINGS-PERF] first_render sinceModuleMs=${perfRef.current.firstRenderAt - SETTINGS_MODULE_EVAL_AT}`); // guard-ok: временный замер №16
  }
  React.useEffect(() => {
    perfRef.current.committedAt = Date.now();
    console.warn(`[SETTINGS-PERF] commit renderToCommitMs=${perfRef.current.committedAt - perfRef.current.firstRenderAt}`); // guard-ok: временный замер №16
  }, []);
  useFocusEffect(React.useCallback(() => {
    if (perfRef.current.focusLogged) return;
    perfRef.current.focusLogged = true;
    const now = Date.now();
    // premounted=да, если фокус пришёл заметно позже коммита: вкладку подготовили фоном, человек открыл её потом
    const sinceCommit = perfRef.current.committedAt > 0 ? now - perfRef.current.committedAt : -1;
    console.warn(`[SETTINGS-PERF] first_focus sinceRenderMs=${now - perfRef.current.firstRenderAt} sinceCommitMs=${sinceCommit} premounted=${sinceCommit > 500 ? 'да' : 'нет'}`); // guard-ok: временный замер №16
  }, []));
  // зачем (№16, сперва логи): доля первого кадра по поддеревьям — тело экрана и окно входа; только монтирование, только dev.
  const onSettingsProfile = React.useCallback((id: string, phase: string, actualDuration: number) => {
    if (__DEV__ && phase === 'mount') console.warn(`[SETTINGS-PERF] profile id=${id} phase=${phase} actualMs=${Math.round(actualDuration)}`); // guard-ok: временный замер №16
  }, []);
  const tabContentBottomPad = useTabContentBottomPad();
  const router = useRouter();
  // зачем (координатор 11.10, «сперва логи»): phraseman://settings вешал приложение (addViewAt «already has a parent»,
  // белый экран). Монтирование/размонтирование экрана рядом со строками [DEEPLINK-SETTINGS] из _layout показывает,
  // не смонтировались ли две копии настроек одновременно.
  useEffect(() => {
    const mountedAt = Date.now();
    console.log('[DEEPLINK-SETTINGS] screen:mount', JSON.stringify({ at: mountedAt }));
    return () => console.log('[DEEPLINK-SETTINGS] screen:unmount', JSON.stringify({ livedMs: Date.now() - mountedAt }));
  }, []);
  const { theme: t, liquidGlassThemeId, fontSize, setFontSize, f } = useTheme();
  // зачем (владелец 2026-09-29): корень «Настройки» — 1 в 1 по макету PRF-01; все цвета плашек
  // берутся из общих токенов 13 тем Liquid Glass, как на уже перенесённых дочерних экранах.
  const glass = liquidGlassTokens(liquidGlassThemeId);
  // зачем: нативные Alert.alert заменены стеклянными окнами (тот же текст/кнопки/обработчики)
  const { showGlassAlert, node: glassAlertNode } = useGlassAlert();
  const [notifEnabled, setNotifEnabled] = React.useState(() => readSettingsPeek()?.notifEnabled ?? false);
  const [notifHour,    setNotifHour]    = React.useState(() => readSettingsPeek()?.notifHour ?? 19);

  React.useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      loadNotificationSettings().then(s => {
        setNotifEnabled(s.enabled);
        setNotifHour(s.hour);
        writeSettingsPeek({ notifEnabled: s.enabled, notifHour: s.hour });
      }).catch((error: unknown) => {
        console.warn(`[SETTINGS-PEEK] notif_load_failed reason=${error instanceof Error ? error.message : String(error)}`);
      });
    });
    return () => task.cancel();
  }, []);
  // зачем (макет A: «Уведомления … Вкл»): значение в строке не должно устаревать после правки на экране
  // уведомлений — при каждом возврате на «Настройки» перечитываем локальную настройку (без сети).
  useFocusEffect(React.useCallback(() => {
    loadNotificationSettings().then(s => {
      setNotifEnabled(s.enabled);
      writeSettingsPeek({ notifEnabled: s.enabled, notifHour: s.hour });
    }).catch((error: unknown) => {
      console.warn(`[SETTINGS-PEEK] notif_focus_reload_failed reason=${error instanceof Error ? error.message : String(error)}`);
    });
  }, []));

  const { lang, s } = useLang();
  const L = (
    ru: string,
    uk: string,
    en: string,
    es: string,
    ptBr: string,
    vi: string,
    id: string,
    tr: string,
    pl: string,
  ) => triLang(lang, { ru, uk, en, es, 'pt-BR': ptBr, vi, id, tr, pl });
  const showInfoAlert = React.useCallback(
    (title: string, message: string) => {
      void enqueueThemedBlockingInfoAlert(title || L('Сообщение', 'Повідомлення', 'Message', 'Message', 'Mensagem', 'Thông báo', 'Pesan', 'Mesaj', 'Wiadomość'), message, 'OK');
    },
    [lang],
  );

  const LANG_NATIVE: Record<string, string> = {
    ru: 'Русский',
    en: 'English',
    uk: 'Українська',
    es: 'Español',
    'pt-BR': 'Português (Brasil)',
    vi: 'Tiếng Việt',
    id: 'Bahasa Indonesia',
    tr: 'Türkçe',
    pl: 'Polski',
  };

  const toggleNotifications = async (val: boolean) => {
    // зачем (аудит 2026-08-26): Optimistic UI был неполным — переключатель менялся
    // мгновенно (это правильно), но при отказе НЕ откатывался: человек видел
    // «включено», а напоминания не приходили. Настройка пишется на диск внутри
    // scheduleDailyReminder/cancelAllNotifications, поэтому при сбое экран расходился
    // с реальностью. Второй скрытый случай — пустой lang: молчаливый return оставлял
    // переключатель включённым, ничего не запланировав.
    const previous = notifEnabled;
    setNotifEnabled(val);
    writeSettingsPeek({ notifEnabled: val });
    const revert = (error: unknown) => {
      setNotifEnabled(previous);
      writeSettingsPeek({ notifEnabled: previous });
      DebugLogger.error('settings.tsx:toggleNotifications', error, 'warning');
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Не удалось изменить напоминания. Попробуй ещё раз.',
        messageUk: 'Не вдалося змінити нагадування. Спробуй ще раз.',
        messageEn: "Couldn't change the reminders. Try again.",
        messageEs: 'No se pudieron cambiar los recordatorios. Inténtalo de nuevo.',
        messagePtBr: 'Não foi possível alterar os lembretes. Tente de novo.',
        messageVi: 'Không thay đổi được lời nhắc. Hãy thử lại.',
        messageId: 'Pengingat tidak dapat diubah. Coba lagi.',
        messageTr: 'Hatırlatmalar değiştirilemedi. Tekrar dene.',
        messagePl: 'Nie udało się zmienić przypomnień. Spróbuj ponownie.',
      });
    };
    try {
      if (val) {
        if (!lang) {
          revert(new Error('toggle_notifications_missing_lang'));
          return;
        }
        // зачем (умное напоминание, владелец 13.10): отключённую scheduleDailyReminder не зовёт никто — включение = 7 дней «авто».
        await enableSmartDailyReminder(lang, { studyTarget, caller: 'settings_toggle' });
      } else {
        await cancelAllNotifications();
      }
    } catch (error) {
      revert(error);
    }
  };


  const scrollRef = useRef<any>(null);
  const settingsScrollYRef = useRef(0);
  const insets = useStableSafeAreaInsets();
  // зачем: монета текущего ранга вместо аватара-гексагона (PRF-18) — ранг из кэша в памяти, без сети.
  const myCoinRank = useMyCoinRank();
  const myCoinRankRow = isValidCoinRank(myCoinRank) ? coinRankRowForDisplay(myCoinRank) : null;
  const topFadeScroll = useTopFadeScroll();
  // Маска шапки (TopFadeMask) слушает scrollY порогом showThreshold=6, поэтому JS
  // дёргаем только при пересечении порога, а не каждый кадр — скролл идёт UI-потоком.
  const { GestureWrap: BouncyWrap, stretch: bouncyStretch, onBouncyScroll } = useBouncy();
  const handleSettingsScroll = useCallback((e: any) => {
    topFadeScroll?.onScroll?.(e);
    settingsScrollYRef.current = Math.max(0, e?.nativeEvent?.contentOffset?.y ?? 0);
    onBouncyScroll(e);
  }, [onBouncyScroll, topFadeScroll]);
  const bouncyStyle = useBouncyStyle(bouncyStretch);
  const { focusTick, runtimeOwnerId } = useTabNav();
  const settingsTabVisible = runtimeOwnerId === 'settings';
  const settingsRuntimeActive = useRuntimeActive(settingsTabVisible);

  useEffect(() => {
    if (settingsTabVisible && scrollRef.current) {
      scrollRef.current.scrollTo({ y: settingsScrollYRef.current, animated: false });
    }
  }, [settingsTabVisible]);

  const appSnapshot = useAppSnapshotSelector((snapshot) => ({
    profile: snapshot.profile,
    settings: snapshot.settings,
  }), (a, b) => a.profile === b.profile && a.settings === b.settings);
  const [soundSettings, setSoundSettings] = useState(() => {
    const settings = getUserSettingsSnapshot();
    return { uiSounds: settings.uiSounds, voiceOut: settings.voiceOut };
  });
  useEffect(() => {
    if (!appSnapshot.settings) return;
    setSoundSettings({
      uiSounds: appSnapshot.settings.uiSounds ?? getUserSettingsSnapshot().uiSounds,
      voiceOut: appSnapshot.settings.voiceOut,
    });
  }, [appSnapshot.settings]);
  const updateSoundSetting = useCallback((key: 'uiSounds' | 'voiceOut', value: boolean) => {
    setSoundSettings((current) => ({ ...current, [key]: value }));
    applyUserSettingsNow({ ...getUserSettingsSnapshot(), [key]: value });
  }, []);
  const [userName, setUserName] = useState(() => appSnapshot.profile?.name ?? '');
  /** Пока false — ник ещё не прочитан из AsyncStorage (избегаем кадра «Не задано»). */
  const settingsStorageHydratedRef = useRef(false);
  const { isPremium, isVip, isPro, hasPremiumAccess, isIntroFullAccess, introFullAccessEndsAt } = usePremium();
  const initialSettingsMessageOwnerRef = useRef(captureAccountGeneration().stableId ?? '');
  const [settingsMessageOwner, setSettingsMessageOwner] = useState(initialSettingsMessageOwnerRef.current);
  const [settingsMessageSelection, setSettingsMessageSelection] = useState<SettingsMessageSlotSelection>(() => {
    const initial = selectSettingsMessageSlots(peekAppMessagesSnapshot(), {
      stableId: initialSettingsMessageOwnerRef.current,
      hasPremiumAccess,
      appVersion: Constants.expoConfig?.version ?? '',
    });
    // зачем (settings-gap-008, логи до починки): слот опроса при монтировании — из снимка в памяти; видеть, был ли он до сида dev-ссылки.
    if (__DEV__) console.log(`[SETTINGS-POLL] экран: выбор при монтировании (peek) top=${initial.top?.id ?? 'нет'} bottom=${initial.bottom?.id ?? 'нет'} owner=${ownerTail(initialSettingsMessageOwnerRef.current)}`);
    return initial;
  });

  useEffect(() => {
    if (!settingsRuntimeActive) return;
    let cancelled = false;
    const account = captureAccountGeneration();
    // зачем (п.70 №1): было 30 с — каждый заход в «Настройки» тянул 3 запроса до 80 документов; слоты сообщений
    // рисуются из снимка сразу, сеть — не чаще раза в 6 ч (тот же срок, что у корня).
    // Источник снимка (кэш 6 ч или сеть) пишет сам refreshAppMessagesSnapshotOnce: [STARTUP-READS] app_messages: cache (ageMs=…) / сеть.
    void refreshAppMessagesSnapshotOnce({ minIntervalMs: APP_MESSAGES_SCREEN_MIN_INTERVAL_MS }).then((snapshot) => {
      if (cancelled || !account.stableId || !isCurrentAccountGeneration(account, account.stableId)) {
        console.log(`[SETTINGS-POLL] экран: итог обновления не применён — cancelled=${String(cancelled)} owner=${ownerTail(account.stableId ?? '')} поколение=${account.stableId ? String(isCurrentAccountGeneration(account, account.stableId)) : 'нет stableId'}`);
        return;
      }
      const next = selectSettingsMessageSlots(snapshot, {
        stableId: account.stableId,
        hasPremiumAccess,
        appVersion: Constants.expoConfig?.version ?? '',
      });
      setSettingsMessageOwner(account.stableId);
      setSettingsMessageSelection((current) => {
        const currentKey = `${current.top?.id ?? ''}:${current.bottom?.id ?? ''}:${JSON.stringify(current.assignments)}`;
        const nextKey = `${next.top?.id ?? ''}:${next.bottom?.id ?? ''}:${JSON.stringify(next.assignments)}`;
        if (__DEV__) console.log(`[SETTINGS-POLL] экран: итог обновления (источник — строка [STARTUP-READS] app_messages выше) owner=${ownerTail(account.stableId ?? '')} bottom ${current.bottom?.id ?? 'нет'} → ${next.bottom?.id ?? 'нет'} выбор=${currentKey === nextKey ? 'прежний (голос не перечитывается)' : 'заменён'}`);
        if (currentKey === nextKey) return current;
        if (current.top?.id !== next.top?.id || current.bottom?.id !== next.bottom?.id) {
          animateNextLayoutTransition();
        }
        return next;
      });
    }).catch((error: unknown) => { console.warn('[SETTINGS] app_messages: подбор сообщений настроек не удался', error); });
    return () => { cancelled = true; };
  }, [hasPremiumAccess, settingsRuntimeActive]);

  useEffect(() => {
    settingsMessageSelection.assignments.forEach((assignment) => {
      void trackEvent('experiment_exposure', {
        experiment_id: `settings_message_${assignment.campaignId}`,
        variant: assignment.variant,
        slot: assignment.slot,
      });
    });
  }, [settingsMessageSelection.assignments]);

  useEffect(() => {
    if (!settingsRuntimeActive || !settingsMessageOwner) return;
    void flushSettingsPollVotes(settingsMessageOwner);
  }, [settingsMessageOwner, settingsRuntimeActive]);
  const [premiumPlan, setPremiumPlan] = useState<string | null>(null);
  const [vipPlan, setVipPlan] = useState('');
  const [vipUntilMs, setVipUntilMs] = useState(0);
  /** зачем: единый ряд «Ввести код» вверху настроек переключается между
   *  реферальным и промокодом одним тумблером внутри той же карточки —
   *  тип берём не из отдельного экрана, а из этого локального состояния. */
  const [codeEntryMode, setCodeEntryMode] = useState<'referral' | 'promo'>('referral');
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
  const [linkedAuth, setLinkedAuth] = useState<LinkedAuth | null>(() => readSettingsPeek()?.linkedAuth ?? null);
  /** Пока false — getLinkedAuthInfo ещё не завершился (избегаем кадра «Не привязан»). */
  // зачем: со снимком строка аккаунта уже известна — «готовность» не ждёт сети; обновление всё равно идёт фоном (linkedAuthDirtyRef = true).
  const [authReady, setAuthReady] = useState(() => readSettingsPeek()?.linkedAuth !== undefined);
  const linkedAuthDirtyRef = useRef(true);
  const linkedAuthGenerationRef = useRef(0);
  const linkedAuthInFlightRef = useRef<Promise<void> | null>(null);
  /** Поколение, под которое запущен идущий запрос (см. refreshLinkedAuth). */
  const linkedAuthInFlightGenRef = useRef(-1);
  const [authPromptVisible, setAuthPromptVisible] = useState(false);
  // зачем (№16, журнал SP1 13.10 15:58: renderToCommitMs=469): окно входа (2507 строк, 86 хуков, без раннего выхода при visible=false)
  // входило в первый кадр «Настроек». Монтируем его скрытым ПОСЛЕ кадра и взаимодействий — к моменту тапа «Войти» оно уже смонтировано,
  // переход скрытое→открытое прежний; тап раньше этого монтирует его сразу (рендер по visible).
  const [authPromptMounted, setAuthPromptMounted] = useState(false);
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setAuthPromptMounted(true));
    return () => task.cancel();
  }, []);
  const [studySheetVisible, setStudySheetVisible] = useState(false);
  /**
   * зачем: статус чистки кеша показываем прямо в ряду (правая подпись), а не вторым
   * блокирующим Alert — чистка диска идёт секунды, и раньше интерфейс всё это время
   * молчал. ref дублирует состояние, чтобы защита от двойного тапа не зависела от
   * ре-рендера.
   */
  const [clearCacheState, setClearCacheStateRaw] = useState<'idle' | 'running' | 'done' | 'failed'>('idle');
  const clearCacheStateRef = useRef<'idle' | 'running' | 'done' | 'failed'>('idle');
  const clearCacheResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setClearCacheState = useCallback((next: 'idle' | 'running' | 'done' | 'failed') => {
    clearCacheStateRef.current = next;
    setClearCacheStateRaw(next);
    if (clearCacheResetTimerRef.current) {
      clearTimeout(clearCacheResetTimerRef.current);
      clearCacheResetTimerRef.current = null;
    }
    // Итог гаснет сам — подпись «Готово» не должна висеть в настройках вечно.
    if (next === 'done' || next === 'failed') {
      clearCacheResetTimerRef.current = setTimeout(() => {
        clearCacheResetTimerRef.current = null;
        clearCacheStateRef.current = 'idle';
        setClearCacheStateRaw('idle');
      }, next === 'done' ? 2200 : 3200);
    }
  }, []);
  useEffect(() => () => {
    if (clearCacheResetTimerRef.current) clearTimeout(clearCacheResetTimerRef.current);
  }, []);
  /**
   * UI state для flow "Сменить аккаунт" (Variant 2):
   *   'idle'        — пользователь нигде не нажал
   *   'confirm'     — показываем confirm-модалку с предупреждением
   *   'wiping'      — крутится спиннер: forced sync + signOut + wipe
   */
  const [switchAccountStage, setSwitchAccountStageRaw] = useState<'idle' | 'confirm' | 'wiping'>('idle');
  // зачем (AA S2d раунд 2): строка «Plus перейдёт на новый аккаунт» — только при
  // реальном переносе store-Plus (не VIP/промо). Считаем один раз на открытие окна
  // подтверждения, а не на каждый рендер: внутри — точка предупреждения с логом.
  // AA S2d раунд 4 (L-R3-5): один и тот же статус «смена ещё идёт» — по потолку и на повторный тап.
  const showAccountSwitchStillRunning = useCallback(() => {
    // Текст «Дизайна» (90aecd479), 9 языков.
    const stillRunning = accountSwitchStillRunningCopy(lang);
    showInfoAlert(stillRunning.title, stillRunning.body);
  }, [lang, showInfoAlert]);
  const switchConfirmOpen = switchAccountStage === 'confirm';
  const showPlusTransferNotice = useMemo(
    () => switchConfirmOpen && shouldShowPlusTransferSwitchNotice(isPremium, peekStableId()),
    [switchConfirmOpen, isPremium],
  );
  // зачем (владелец, 2026-09-13): «сперва логи». «Сохранить и выйти» мелькало и
  // ничего не происходило, а переходы стадий были нем. ВАЖНО: 'confirm' и
  // 'wiping' живут в ДВУХ РАЗНЫХ нативных <Modal> (ниже по файлу), поэтому
  // переход confirm→wiping = dismiss одного поверх present другого в одном
  // кадре. Именно этот кадр и печатаем, чтобы подтвердить диагноз по фактам.
  const switchStageRef = useRef<'idle' | 'confirm' | 'wiping'>('idle');
  const setSwitchAccountStage = useCallback((next: 'idle' | 'confirm' | 'wiping') => {
    const prev = switchStageRef.current;
    switchStageRef.current = next;
    if (__DEV__) console.log(`[ACC-MUT] switch_stage ${prev}→${next}`); // guard-ok: под __DEV__
    setSwitchAccountStageRaw(next);
  }, []);
  // зачем (§127): кнопка «Сменить аккаунт» из окна входа (отказ account_switch_required) открывает это окно сразу,
  // без поиска пункта в Настройках. Параметр снимаем, чтобы окно не открывалось повторно при возврате на вкладку.
  const openSwitchParam = useLocalSearchParams<{ [SETTINGS_OPEN_ACCOUNT_SWITCH_PARAM]?: string }>()[SETTINGS_OPEN_ACCOUNT_SWITCH_PARAM];
  useEffect(() => {
    if (openSwitchParam !== '1') return;
    if (switchStageRef.current !== 'idle') {
      console.log(`[AUTH-SWITCH-OFFER] settings: param ignored, stage=${switchStageRef.current}`);
    } else {
      console.log('[AUTH-SWITCH-OFFER] settings: open switch dialog from sign-in offer');
      setSwitchAccountStage('confirm');
    }
    router.setParams({ [SETTINGS_OPEN_ACCOUNT_SWITCH_PARAM]: undefined });
  }, [openSwitchParam, router, setSwitchAccountStage]);
  // зачем (Account V2, 8L): защита от двойного тапа на время проверки невыгруженных карточек
  // перед «Сменить без сохранения» (стадия в это время ещё 'idle').
  const unsavedCardsCheckBusyRef = useRef(false);

  useEffect(() => {
    if (!settingsRuntimeActive || settingsReferralSurface.emergencyStop) return;
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
      .catch((error: unknown) => { console.warn('[SETTINGS] referral: состояние рефералов не прочиталось (оставляем кэш)', error); });
    return () => { alive = false; };
  }, [
    focusTick,
    settingsReferralSurface.emergencyStop,
    settingsReferralSurface.softEnabled,
    settingsReferralAccountKey,
    settingsRuntimeActive,
  ]);

  const [hapticTap,  setHapticTap]   = useState(() => appSnapshot.settings?.tapHaptics ?? true);
  // Согласие на аналитику, юр-документы и удаление аккаунта переехали на
  // отдельный экран /privacy_settings (ряд «Приватность и данные»). Здесь эта
  // логика больше не живёт.

  useEffect(() => {
    if (appSnapshot.profile) {
      // зачем: ник теперь меняется и в шторке «Аккаунт» (account_details) —
      // непустое имя из снапшота синхронизируем всегда, иначе ряд в настройках
      // показывал бы старое имя до перезапуска. Пустое имя из снапшота не
      // затирает локально загруженное (историческая защита гидрации).
      setUserName(current => appSnapshot.profile!.name || current);
    }
    if (appSnapshot.settings?.tapHaptics != null) {
      setHapticTap(appSnapshot.settings.tapHaptics);
    }
  }, [appSnapshot.profile, appSnapshot.settings]);

  // зачем (§AUTH-0110, координатор 12.10): прежде свой useState('en') — первый кадр у всех 'en' (даже у тех, кто учит es/de/…),
  // а смена цели в шторке или в другом разделе подхватывалась только по фокусу. Теперь — общий StudyTargetContext: первый кадр
  // из снимка (peek), смена — по событию study_target_changed; refresh по фокусу оставлен как страховка (дёшево, то же хранилище).
  const { studyTarget, refresh: loadStudyTarget } = useStudyTarget();
  const studyTargetLoggedRef = useRef<StudyTarget | null>(null);
  if (studyTargetLoggedRef.current !== studyTarget) {
    if (__DEV__) console.log(`[LANG-SWITCH] settings study_target=${studyTarget} previous=${studyTargetLoggedRef.current ?? 'none'} source=context`); // guard-ok: под __DEV__, одна строка на смену цели
    studyTargetLoggedRef.current = studyTarget;
  }
  useEffect(() => {
    if (!settingsRuntimeActive) return;
    void loadStudyTarget();
  }, [settingsRuntimeActive, focusTick, loadStudyTarget]);
  const currentThemeLabel = themeDisplayName(liquidGlassThemeId, lang);

  const refreshSupplementalAccessState = useCallback(() => {
    const token = captureAccountGeneration();
    readVipSnapshotForGeneration(token)
      .then(vip => {
        if (!token.stableId || !isCurrentAccountGeneration(token, token.stableId)) return;
        setVipPlan(String(vip?.vip_plan ?? '').trim().toLowerCase());
        setVipUntilMs(parseStoredExpiryMs(vip?.vip_until));
      })
      .catch((error: unknown) => { console.warn('[SETTINGS] vip: снимок VIP не прочитался', error); });
  }, []);


  useEffect(() => {
    if (!settingsRuntimeActive && settingsStorageHydratedRef.current) return;
    settingsStorageHydratedRef.current = true;
    let cancelled = false;
    const settingsHydrationStartedAt = Date.now();
    const token = captureAccountGeneration();
    Promise.all([
      AsyncStorage.multiGet(['user_name', 'premium_plan', 'haptics_tap']),
      readVipSnapshotForGeneration(token),
    ])
      .then(([pairs, vip]) => {
        if (cancelled || !token.stableId || !isCurrentAccountGeneration(token, token.stableId)) return;
        const hydratedName = resolveHydratedProfileName(settingsHydrationStartedAt, pairs[0][1]);
        if (hydratedName) setUserName(hydratedName);
        patchAppSnapshot((current) => current.profile ? {
          profile: {
            ...current.profile,
            source: 'storage',
            updatedAt: settingsHydrationStartedAt,
            name: pairs[0][1]?.trim() || current.profile.name,
          },
          settings: current.settings ? {
            ...current.settings,
            source: 'storage',
            updatedAt: Date.now(),
            tapHaptics: pairs[2][1] === null ? current.settings.tapHaptics : pairs[2][1] !== 'false',
          } : undefined,
        } : {});
        setPremiumPlan(getDevPlanOverride()?.plan ?? pairs[1][1]); // зачем (координатор 12.10): dev `plan=` — из памяти, в стор-сборке null
        setVipUntilMs(parseStoredExpiryMs(vip?.vip_until));
        if (pairs[2][1] !== null) setHapticTap(pairs[2][1] !== 'false');
      })
      .catch(noteSwallowedHandler('settings:useEffect.all'));
    refreshSupplementalAccessState();
    return () => { cancelled = true; };
  }, [settingsRuntimeActive, refreshSupplementalAccessState]); // warm once, refresh when opening Settings

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

  const invalidateLinkedAuthWork = useCallback(() => {
    linkedAuthGenerationRef.current += 1;
    linkedAuthDirtyRef.current = true;
    linkedAuthInFlightRef.current = null;
  }, []);

  const refreshLinkedAuth = useCallback((): Promise<void> => {
    // зачем (координатор 14.10, прогон №2 🔴1): почему карточка аккаунта не обновилась после входа — каждое решение с его значением.
    if (__DEV__) console.log(`[SETTINGS-ACCOUNT-CARD] t=${Date.now() % 100000} refresh enter active=${settingsRuntimeActive} inflight=${!!linkedAuthInFlightRef.current} dirty=${linkedAuthDirtyRef.current} gen=${linkedAuthGenerationRef.current}`); // guard-ok: временная трассировка
    if (!settingsRuntimeActive) {
      linkedAuthDirtyRef.current = true;
      return Promise.resolve();
    }
    // зачем (координатор 14.10, 🔴1, журнал прогона №3): после входа событие auth_provider_linked приходит 2+ раз и каждый раз поднимает
    // поколение (2→3→4). Раньше идущий запрос поколения 2 переиспользовался, его ответ «google» отбрасывался как устаревший
    // (applied=false gen=2/4), а нового запроса не было — карточка застревала на «Войти / Не привязан». Теперь запрос прошлого
    // поколения не поглощает свежий: запускаем новый под текущее поколение.
    if (linkedAuthInFlightRef.current) {
      if (linkedAuthInFlightGenRef.current === linkedAuthGenerationRef.current) return linkedAuthInFlightRef.current;
      console.log(`[SETTINGS-ACCOUNT-CARD] refresh stale_inflight_superseded inflightGen=${linkedAuthInFlightGenRef.current} gen=${linkedAuthGenerationRef.current}`); // guard-ok: ветка логируется
    }
    linkedAuthDirtyRef.current = false;
    const generation = linkedAuthGenerationRef.current;
    linkedAuthInFlightGenRef.current = generation;
    const task = getLinkedAuthInfo()
      .then((info) => {
        const applied = settingsRuntimeActive && generation === linkedAuthGenerationRef.current;
        if (__DEV__) console.log(`[SETTINGS-ACCOUNT-CARD] t=${Date.now() % 100000} refresh result=${info?.provider ?? 'none'} applied=${applied} gen=${generation}/${linkedAuthGenerationRef.current} active=${settingsRuntimeActive}`); // guard-ok: временная трассировка
        if (applied) {
          setLinkedAuth(info);
          writeSettingsPeek({ linkedAuth: info });
        }
      })
      .catch((error: unknown) => {
        // зачем: не немой catch — причина видна; снимок НЕ перезаписываем (ошибка сети не должна стирать последнее известное значение).
        console.warn(`[SETTINGS-PEEK] linked_auth_load_failed reason=${error instanceof Error ? error.message : String(error)}`);
        // зачем: при наличии снимка сбой сети не должен стирать уже показанную строку аккаунта.
        if (settingsRuntimeActive && generation === linkedAuthGenerationRef.current && settingsPeek?.linkedAuth === undefined) setLinkedAuth(null);
      })
      .finally(() => {
        if (settingsRuntimeActive && generation === linkedAuthGenerationRef.current) setAuthReady(true);
        if (linkedAuthInFlightRef.current === task) linkedAuthInFlightRef.current = null;
      });
    linkedAuthInFlightRef.current = task;
    return task;
  }, [settingsRuntimeActive]);

  /** Повтор при открытии «Настройки»: Firestore раньше мог не ответить, а вкладка кэширована. */
  useEffect(() => {
    if (__DEV__) console.log(`[SETTINGS-ACCOUNT-CARD] t=${Date.now() % 100000} focus active=${settingsRuntimeActive} dirty=${linkedAuthDirtyRef.current} authReady=${authReady} shown=${linkedAuth?.provider ?? 'none'} focusTick=${focusTick}`); // guard-ok: временная трассировка
    if (!settingsRuntimeActive) return;
    if (linkedAuthDirtyRef.current || !authReady) void refreshLinkedAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: linkedAuth только для журнала, не триггер
  }, [settingsRuntimeActive, focusTick, authReady, refreshLinkedAuth]);

  useEffect(() => {
    if (!settingsRuntimeActive) {
      invalidateLinkedAuthWork();
    }
  }, [invalidateLinkedAuthWork, settingsRuntimeActive]);

  useEffect(() => {
    return () => invalidateLinkedAuthWork();
  }, [invalidateLinkedAuthWork]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('auth_provider_linked', () => {
      if (__DEV__) console.log(`[SETTINGS-ACCOUNT-CARD] t=${Date.now() % 100000} event auth_provider_linked received`); // guard-ok: временная трассировка
      settingsPeek = null; // зачем: связка/отвязка входа меняет строку аккаунта — устаревший снимок показывать нельзя.
      linkedAuthGenerationRef.current += 1;
      linkedAuthDirtyRef.current = true;
      void refreshLinkedAuth();
    });
    return () => sub.remove();
  }, [refreshLinkedAuth]);

  // зачем: владелец (2026-08-03) — тир берём из isPro, а не из локального
  // premium_plan: пожизненный доступ бывает и безденежным (сертификат «Pro —
  // навсегда», промокод, бессрочная выдача из админки), и раньше такой человек
  // видел «Plus активирован» вопреки тому, что написано на его сертификате.
  const tierName = isPro ? 'Pro' : 'Plus';

  const vipExpiryText = vipUntilMs > 0
    ? `${L('Действует до', 'Діє до', 'Active until', 'Activo hasta', 'Ativo até', 'Có hiệu lực đến', 'Aktif sampai', 'Bitiş', 'Ważne do')} ${formatDateTimeShort(vipUntilMs)}`
    : L(`${tierName} без срока окончания`, `${tierName} без дати завершення`, `${tierName} has no end date`, `${tierName} sin fecha de finalización`, `${tierName} sem data de término`, `${tierName} không có ngày kết thúc`, `${tierName} tanpa tanggal akhir`, `${tierName} bitiş tarihi yok`, `${tierName} bez daty zakończenia`);

  const vipAccessTitle = (() => {
    switch (vipPlan) {
      case 'promo':
      case 'promo_lifetime':
        return L('Промокод', 'Промокод', 'Promo code', 'Código promocional', 'Código promocional', 'Mã khuyến mãi', 'Kode promo', 'Promo kod', 'Kod promocyjny');
      case 'referral':
        return L('Plus за приглашения', 'Plus за запрошення', 'Plus for referrals', 'Plus por invitaciones', 'Plus por convites', 'Plus nhờ mời bạn bè', 'Plus dari undangan', 'Davet Plus', 'Plus za zaproszenia');
      case 'survey_vip':
        return L('Plus за опрос', 'Plus за опитування', 'Plus for survey', 'Plus por encuesta', 'Plus por pesquisa', 'Plus từ khảo sát', 'Plus dari survei', 'Anket Plus', 'Plus za ankietę');
      case 'idea_reward':
        return L('Plus за идею', 'Plus за ідею', 'Plus for an idea', 'Plus por idea', 'Plus por ideia', 'Plus cho ý tưởng', 'Plus untuk ide', 'Fikir Plus', 'Plus za pomysł');
      case 'telegram_tester':
        return L('Тестерский Plus', 'Тестерський Plus', 'Tester Plus', 'Plus de tester', 'Plus de testador', 'Plus thử nghiệm', 'Plus tester', 'Test Plus', 'Tester Plus');
      // зачем: бессрочная выдача из админки — это Pro (владелец, 2026-08-03),
      // а срочная остаётся Plus. Отдельного плана у админки нет: и месяц, и
      // «бессрочно» пишут admin_vip, поэтому тир берём из общего tierName.
      case 'admin_vip':
        return L(`Выданный ${tierName}`, `Виданий ${tierName}`, `Granted ${tierName}`, `${tierName} concedido`, `${tierName} concedido`, `${tierName} được cấp`, `${tierName} diberikan`, `Verilen ${tierName}`, `Przyznany ${tierName}`);
      default:
        return L(`Дополнительный ${tierName}-доступ`, `Додатковий ${tierName}-доступ`, `Extra ${tierName} access`, `Acceso ${tierName} adicional`, `Acesso ${tierName} extra`, `Quyền ${tierName} bổ sung`, `Akses ${tierName} tambahan`, `Ek ${tierName} erişimi`, `Dodatkowy dostęp ${tierName}`);
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
  // зачем (D186, владелец 14.10): строки «Полный доступ на 3 дня · Действует до» больше нет — бонус на старт удалён.

  // Список настроек переведён на Telegram-стиль: сгруппированные карточки
  // (components/settings/SettingsGroup). Старые локальные Row/SectionTitle удалены.

  // Верх экрана — по референсу Bevel: отдельная карточка Plus, под ней отдельная
  // карточка ввода кода, ниже широкий инвайт-баннер с картинкой.
  // зачем: подпись-расшифровка под названием убрана (запрет владельца + чистота
  // референса) — ряд Plus однострочный.
  // зачем: паритет profile.html (13.10): по макету A заголовок строки всегда «Подписка Plus»,
  // а статус — значением справа: «Не активна» / план («Год», «Месяц») / «Активна».
  // Тир берём из tierName, чтобы у владельца Pro не было написано «Plus» (правило 2026-08-03).
  const plusRowLabel = hasPremiumAccess
    ? L(`Подписка ${tierName}`, `Підписка ${tierName}`, `${tierName} subscription`, `Suscripción ${tierName}`, `Assinatura ${tierName}`, `Gói ${tierName}`, `Langganan ${tierName}`, `${tierName} aboneliği`, `Subskrypcja ${tierName}`)
    : L('Подписка Plus', 'Підписка Plus', 'Plus subscription', 'Suscripción Plus', 'Assinatura Plus', 'Gói Plus', 'Langganan Plus', 'Plus aboneliği', 'Subskrypcja Plus');
  const plusRowActiveValue = L('Активна', 'Активна', 'Active', 'Activa', 'Ativa', 'Đang hoạt động', 'Aktif', 'Aktif', 'Aktywna');
  const plusRowValue = !hasPremiumAccess
    ? L('Не активна', 'Не активна', 'Not active', 'No activa', 'Não ativa', 'Chưa kích hoạt', 'Tidak aktif', 'Aktif değil', 'Nieaktywna')
    : isPremium && premiumPlan === 'yearly'
      ? L('Год', 'Рік', 'Year', 'Anual', 'Anual', 'Năm', 'Tahunan', 'Yıllık', 'Rok')
      : isPremium && premiumPlan === 'monthly'
        ? L('Месяц', 'Місяць', 'Month', 'Mensual', 'Mensal', 'Tháng', 'Bulanan', 'Aylık', 'Miesiąc')
        : plusRowActiveValue;
  const plusRowPress = () => {
    doHaptic();
    if (hasPremiumAccess) {
      const account = captureAccountGeneration();
      if (!account.stableId || !isCurrentAccountGeneration(account, account.stableId)) return;
      // зачем: settings.tsx уже знает premiumPlan синхронно (см. useState выше,
      // подтянут AsyncStorage-эффектом на монтировании таба) — передаём его дальше,
      // чтобы manage_subscription.tsx открылся с готовым планом без спиннера.
      router.push({
        pathname: '/manage_subscription',
        params: {
          source: 'settings',
          accountGeneration: String(account.generation),
          ...(premiumPlan ? { plan: premiumPlan } : {}),
        },
      } as any);
    } else {
      const attribution = settingsMessageSelection.primaryAttribution;
      const attributionCampaign = normalizePaywallAttributionValue(attribution?.campaignId);
      const attributionVariant = normalizePaywallAttributionValue(attribution?.variant);
      router.push({
        pathname: '/premium_modal',
        params: {
          context: 'generic',
          source: 'settings_premium',
          ...(attributionCampaign && attributionVariant ? {
            attribution_campaign: attributionCampaign,
            attribution_variant: attributionVariant,
          } : {}),
        },
      } as any);
    }
  };

  /** «Очистить кеш»: только пересоздаваемые копии (см. app/cache_reset.ts). Прогресс/аккаунт не трогаем. */
  const confirmClearCache = () => {
    if (clearCacheStateRef.current === 'running') return; // зачем: защита от двойного тапа — чистка диска идёт секунды
    doHaptic();
    showGlassAlert(
      // зачем (аудит по Библии, 2026-08-26): «Вы уверены?» — обращение на «вы»
      // (Правило 14) и вопрос ни о чём. Заголовок называет само действие,
      // кнопки получили глаголы вместо «Да/Нет» (Правило 1).
      L('Очистить кеш?', 'Очистити кеш?', 'Clear cache?', '¿Vaciar la caché?', 'Limpar o cache?', 'Xoá bộ nhớ đệm?', 'Bersihkan cache?', 'Önbellek temizlensin mi?', 'Wyczyścić pamięć podręczną?'),
      // зачем: перечисление («рейтинги, сообщения, друзья») пугало — читалось как
      // удаление данных, хотя это лишь локальные копии. Оставлен голый вопрос:
      // слово «кеш» самодостаточно, кому надо — тот понимает.
      undefined,
      [
        { text: L('Не сейчас', 'Не зараз', 'Not now', 'Ahora no', 'Agora não', 'Để sau', 'Nanti saja', 'Şimdi değil', 'Nie teraz'), style: 'cancel' as const },
        {
          text: L('Очистить', 'Очистити', 'Clear', 'Vaciar', 'Limpar', 'Xoá', 'Bersihkan', 'Temizle', 'Wyczyść'),
          style: 'destructive' as const,
          onPress: () => {
            // зачем: раньше между тапом и алертом «Готово» экран молчал секунды, а
            // ошибка проглатывалась и всё равно показывалось «Готово». Теперь статус
            // живёт прямо в ряду (без спиннера на весь экран) и врать не может.
            setClearCacheState('running');
            void clearAppCaches()
              .then((result) => { setClearCacheState(result.ok ? 'done' : 'failed'); }) // зачем: PM-199-A2 — сбой хранилища не выдаём за «Готово»
              .catch((error: unknown) => {
                // зачем (аудит Optimistic UI «Настроек», 12.10): немой catch — причина сбоя чистки теперь в журнале
                console.warn(`[CACHE-RESET] clear_failed_in_ui reason=${error instanceof Error ? error.message : String(error)}`);
                setClearCacheState('failed');
              });
          },
        },
      ],
    );
  };

  const premiumDetails = hasPremiumAccess && plusAccessDetails.length > 0 ? (
    <View testID="settings-plus-access-details" style={{ marginTop: 10, gap: 10 }}>
      {plusAccessDetails.map((detail) => (
        <View key={detail.key} testID={detail.testID}>
          <SettingsGlassRow
            glass={glass}
            icon={detail.icon}
            title={detail.title}
            sub={detail.subtitle}
            titleTestID={detail.titleTestID}
            subTestID={detail.subtitleTestID}
          />
        </View>
      ))}
    </View>
  ) : null;

  // зачем (макет PRF-01): подписи и значения строк — ровно как в profile.html; девять локалей.
  const accountProviderValue = authReady
    ? (linkedAuth
      ? (linkedAuth.provider === 'apple' ? 'Apple' : 'Google')
      : L('Не привязан', "Не прив\'язано", 'Not linked', 'Sin vincular', 'Não vinculada', 'Chưa liên kết', 'Belum ditautkan', 'Bağlı değil', 'Nie połączono'))
    : undefined;
  const accountLinkedSub = !authReady
    ? undefined
    : linkedAuth
      ? L('аккаунт привязан', 'акаунт прив’язано', 'account linked', 'cuenta vinculada', 'conta vinculada', 'đã liên kết tài khoản', 'akun tertaut', 'hesap bağlı', 'konto połączone')
      // зачем (TG-AA6EC9A6D998, решение координатора 00:50): гостю — честное следствие, а не
      // технический статус: без входа прогресс привязан к этому телефону (копия в облаке есть, но на другой телефон не переносится) и теряется при
      // переустановке. Регистр строчный — строка идёт после звания через « · », как в макете.
      : L('прогресс привязан к этому телефону', 'прогрес прив’язаний до цього телефона', 'progress is tied to this phone', 'progreso vinculado a este teléfono', 'progresso vinculado a este celular', 'tiến độ gắn với điện thoại này', 'progres terikat ke ponsel ini', 'ilerleme bu telefona bağlı', 'postęp przypisany do tego telefonu');
  // зачем (PM-128): звание на языке интерфейса, а не всегда по-русски.
  const profileCardSub = [myCoinRankRow ? coinRankTitle(myCoinRankRow.rank, lang) : undefined, accountLinkedSub].filter(Boolean).join(' · ');
  const profileCardName = userName.trim() || L('Профиль', 'Профіль', 'Profile', 'Perfil', 'Perfil', 'Hồ sơ', 'Profil', 'Profil', 'Profil');
  const studyTargetName = STUDY_TARGET_NATIVE_NAME[studyTarget] ?? studyTarget;
  const studyTargetFlag = STUDY_TARGET_FLAG[studyTarget];
  // Монета ранга вместо аватара (PRF-18); пока ранг неизвестен — нейтральный кружок, не выдуманная медь.
  // зачем (макет A): монета в шапке 44 (`.coin.av`), в карточке профиля 52.
  // зачем (владелец 11.10, журнал 34): пока ранг не известен, вместо серого кружка — монета по умолчанию (ранг 0, «Новичок»): шапка не мигает серым.
  const renderRankCoin = (testID: string, size = 48) => (
    <Image
      testID={myCoinRankRow ? testID : `${testID}-default`}
      accessible={false}
      source={(myCoinRankRow ?? coinRankRowForDisplay(0)).source}
      style={{ width: size, height: size }} contentFit="contain"
    />
  );
  const hapticSeqRef = useRef(0);
  const toggleTapHaptics = (val: boolean) => {
    // зачем (Optimistic UI): переключатель меняется мгновенно, диск догоняет фоном. Аудит «Настроек» 12.10: сбой записи теперь ОТКАТЫВАЕТ тумблер (иначе «включено»,
    // а после перезапуска значение возвращалось) и показывает сообщение; поздний сбой старого тапа более свежий выбор не трогает.
    const previous = hapticTap;
    const seq = ++hapticSeqRef.current;
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
    AsyncStorage.setItem('haptics_tap', String(val)).catch((error: unknown) => {
      DebugLogger.error('settings.tsx:toggleTapHaptics:storage', error, 'warning');
      const reason = error instanceof Error ? error.message : String(error);
      if (hapticSeqRef.current !== seq) {
        console.warn(`[OPT-UI] settings tap_haptics rollback skipped: выбор уже изменён позже reason=${reason}`);
        return;
      }
      console.warn(`[OPT-UI] settings tap_haptics rollback ${String(val)} → ${String(previous)} reason=${reason}`);
      setHapticTap(previous);
      setHapticCacheEnabled(previous);
      patchAppSnapshot((current) => current.settings ? { settings: { ...current.settings, source: 'local', updatedAt: Date.now(), tapHaptics: previous } } : {});
      emitAppEvent('action_toast', actionToastTri('error', {
        ru: 'Не удалось сохранить настройку. Попробуй ещё раз.', uk: 'Не вдалося зберегти налаштування. Спробуй ще раз.', en: "Couldn't save the setting. Try again.",
        es: 'No se pudo guardar el ajuste. Inténtalo de nuevo.', 'pt-BR': 'Não foi possível salvar a configuração. Tente de novo.', vi: 'Không lưu được cài đặt. Hãy thử lại.',
        id: 'Pengaturan tidak dapat disimpan. Coba lagi.', tr: 'Ayar kaydedilemedi. Tekrar dene.', pl: 'Nie udało się zapisać ustawienia. Spróbuj ponownie.',
      }));
    });
  };
  const fontSizeLabel = L('Размер шрифта', 'Розмір шрифту', 'Font size', 'Tamaño de letra', 'Tamanho da fonte', 'Cỡ chữ', 'Ukuran font', 'Yazı boyutu', 'Rozmiar czcionki');
  const tapHapticsLabel = L('Тактильный отклик', 'Тактильний відгук', 'Haptic feedback', 'Respuesta háptica', 'Resposta tátil', 'Phản hồi rung', 'Umpan balik haptik', 'Dokunsal geri bildirim', 'Reakcja haptyczna');

  return (
    <ScreenGradient>
      <React.Profiler id="settings_body" onRender={onSettingsProfile}>
      <BouncyWrap style={bouncyStyle}>
      <Reanimated.ScrollView
        decelerationRate="fast"
        testID="screen-settings"
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        // зачем: лево/право — safe area, низ — высота таббара (tabContentBottomPad уже включает нижний inset);
        // крупный шрифт просто удлиняет прокручиваемое содержимое.
        // зачем: паритет profile.html (13.10): верхний inset уже даёт обёртка вкладок ((tabs)/_layout.tsx, paddingTop: insets.top) —
        // второй раз он опускал заголовок на ≈55px; поля 20, как в макете A.
        contentContainerStyle={{ paddingBottom: tabContentBottomPad, paddingLeft: 20 + insets.left, paddingRight: 20 + insets.right }}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        bounces
        alwaysBounceVertical
        overScrollMode="always"
        onScroll={handleSettingsScroll}
      >

        {/* зачем (redesign-round-1 вариант A «Группы одним блоком», владелец 04.10): шапка «Настройки» 40/46
            без подзаголовка, справа монета ранга; Dev Hub переехал в подвал строкой рядом с версией. */}
        <View
          onLayout={(event) => { if (!perfRef.current.layoutLogged) { perfRef.current.layoutLogged = true; console.warn(`[SETTINGS-PERF] header_layout sinceRenderMs=${Date.now() - perfRef.current.firstRenderAt}`); } /* guard-ok: временный замер №16 */ if (__DEV__) console.log(`[SETTINGS-LAYOUT] шапка «Настройки» y=${Math.round(event.nativeEvent.layout.y)} h=${Math.round(event.nativeEvent.layout.height)} | верхний отступ безопасной зоны=${Math.round(insets.top)} нижний=${Math.round(insets.bottom)} | шрифт заголовка 40/46`); }} // guard-ok: замер раскладки, образец profile.html
          style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginTop: 10 /* зачем: паритет profile.html (13.10): отступ шапки 10 */ }}>
          <Text maxFontSizeMultiplier={1.15} accessibilityRole="header" style={{ flex: 1, minWidth: 0, color: glass.text, fontSize: 40, lineHeight: 46, fontWeight: '700', letterSpacing: -0.6 }}>
            {/* зачем (LANG_AUDIT_AUTH_R1, владелец 13.10 «интерфейс на других языках»): заголовок 40 пт рядом с монетой 44 — на телефоне
                360 dp под слово остаётся ≈264 пт, «Configurações» (282) рвалось посреди слова. Те же слова, что у вкладки внизу ((tabs)/_layout.tsx). */}
            {L('Настройки', 'Параметри', 'Settings', 'Ajustes', 'Ajustes', 'Cài đặt', 'Setelan', 'Ayarlar', 'Ustawienia')}
          </Text>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {renderRankCoin('settings-header-coin', 44)}
          </View>
        </View>

        {/* Карточка профиля `.card.c2`: r22, поля 16, монета 52, имя 18/700, ранг и статус аккаунта;
            справа «Войти», пока аккаунт не привязан. Тап по карточке — данные аккаунта. */}
        <PressableHybrid
          testID="settings-profile-card"
          accessibilityLabel={[profileCardName, profileCardSub].filter(Boolean).join(', ')}
          onPress={() => router.push('/account_details' as never)}
          withSound={false}
          variant="card"
          style={{ marginTop: 22 }}
          contentStyle={{ borderRadius: 22, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: glass.plateFillFrom, boxShadow: plateBoxShadow(glass) /* зачем (стиль «Тень»): карточка профиля — плашка с тенью, без кромки и без клипа */ }}
        >
          <KitGlassLayer radius={22} />
          <View style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
            {renderRankCoin('settings-profile-coin', 52)}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: glass.text, fontSize: 19, lineHeight: 24, fontWeight: '700' /* зачем: имя в карточке профиля — заголовок ≥19 по шкале D145 (макет profile.html показывает 18/22 — Макетам поправить на 19/24) */ }}>{profileCardName}</Text>
            {profileCardSub ? (
              <Text style={{ color: glass.secondary, fontSize: 13, lineHeight: 18, marginTop: 2 }}>{profileCardSub}</Text>
            ) : null}
          </View>
          {authReady && !linkedAuth ? (
            <PressableHybrid
              testID="settings-profile-sign-in"
              accessibilityLabel={L('Войти', 'Увійти', 'Sign in', 'Iniciar sesión', 'Entrar', 'Đăng nhập', 'Masuk', 'Giriş yap', 'Zaloguj się')}
              onPress={() => setAuthPromptVisible(true)}
              withSound={false}
              variant="chip"
              contentStyle={{ minHeight: 30, paddingHorizontal: 12, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: glass.opaqueControl, boxShadow: nestedBoxShadow(glass) }}
            >
              <Text style={{ color: glass.text, fontSize: 13, fontWeight: '700' }}>
                {L('Войти', 'Увійти', 'Sign in', 'Iniciar sesión', 'Entrar', 'Đăng nhập', 'Masuk', 'Giriş yap', 'Zaloguj się')}
              </Text>
            </PressableHybrid>
          ) : null}
        </PressableHybrid>

        <SettingsGlassEyebrow wide glass={glass} title={L('ПРОФИЛЬ', 'ПРОФІЛЬ', 'PROFILE', 'PERFIL', 'PERFIL', 'HỒ SƠ', 'PROFIL', 'PROFİL', 'PROFIL')} />
        <SettingsGlassGroup glass={glass} testID="settings-group-profile">
          {/* зачем: раздел аккаунта — отдельный экран /account_details (данные, вход/выход, удаление);
              authReady защищает от кадра «Не привязан» до ответа. */}
          <SettingsGlassRow
            glass={glass}
            testID="settings-account-row"
            icon="person-outline"
            title={L('Аккаунт', 'Акаунт', 'Account', 'Cuenta', 'Conta', 'Tài khoản', 'Akun', 'Hesap', 'Konto')}
            value={accountProviderValue}
            onPress={() => router.push('/account_details' as never)}
          />
          <SettingsGlassRow
            glass={glass}
            testID="settings-language-row"
            icon="flag-outline"
            title={L('Язык интерфейса', 'Мова інтерфейсу', 'Interface language', 'Idioma de la interfaz', 'Idioma da interface', 'Ngôn ngữ giao diện', 'Bahasa antarmuka', 'Arayüz dili', 'Język interfejsu')}
            value={LANG_NATIVE[lang]}
            onPress={() => router.push('/settings_language' as any)}
          />
          {/* зачем (Сверка profile-001, макет «Язык изучения ›»; владелец 11.10): шторка «Язык изучения» теперь живая (её открывает пилюля
              языка во вкладке «Видео»), поэтому строка открывает ту же шторку и показывает шеврон. Значок — глобус, как в макете A. */}
          <SettingsGlassRow
            glass={glass}
            testID="settings-study-language-row"
            icon="globe-outline"
            title={L('Язык изучения', 'Мова навчання', 'Learning language', 'Idioma de estudio', 'Idioma de estudo', 'Ngôn ngữ học', 'Bahasa belajar', 'Öğrenilen dil', 'Język nauki')}
            value={studyTargetName}
            onPress={() => setStudySheetVisible(true)}
          />
        </SettingsGlassGroup>
        {settingsMessageSelection.top && hasAppMessageCopyForLang(settingsMessageSelection.top, lang) ? ( /* зачем (settings-gap-002): без текста на языке интерфейса плашку не рисуем — ни пустой, ни русской */
          <View testID="settings-message-slot-top" style={{ marginHorizontal: -16 }}>
            <SettingsMessageSlotCard
              campaign={settingsMessageSelection.top}
              lang={lang}
              ownerStableId={settingsMessageOwner}
            />
          </View>
        ) : null}

        <SettingsGlassEyebrow wide glass={glass} title={L('ОБУЧЕНИЕ', 'НАВЧАННЯ', 'LEARNING', 'APRENDIZAJE', 'APRENDIZADO', 'HỌC TẬP', 'PEMBELAJARAN', 'ÖĞRENME', 'NAUKA')} />
        {/* зачем (решение (б), координатор 04.10): звук, вибрация и размер шрифта — рабочие функции не из макета;
            оставлены в «Обучении» той же группой, строки без подписей. */}
        <SettingsGlassGroup glass={glass} testID="settings-group-learning">
          <SettingsGlassRow
            glass={glass}
            testID="settings-edu-row"
            icon="book-outline"
            title={L('Настройки обучения', 'Параметри навчання', 'Learning settings', 'Ajustes del aprendizaje', 'Configurações de aprendizado', 'Cài đặt học tập', 'Pengaturan pembelajaran', 'Öğrenme ayarları', 'Ustawienia nauki')}
            onPress={() => router.push('/settings_edu')}
          />
          {/* зачем: экран расширился с расписания напоминаний до полноценного раздела
              уведомлений (мастер + категории) — название пункта меню ему соответствует. */}
          <SettingsGlassRow
            glass={glass}
            testID="settings-notifications-row"
            icon="notifications-outline"
            title={L('Уведомления', 'Сповіщення', 'Notifications', 'Notificaciones', 'Notificações', 'Thông báo', 'Notifikasi', 'Bildirimler', 'Powiadomienia')}
            value={notifEnabled
              ? L('Вкл', 'Увімк', 'On', 'Activadas', 'Ativadas', 'Bật', 'Aktif', 'Açık', 'Wł.')
              : L('Выкл', 'Вимк', 'Off', 'Desactivadas', 'Desativadas', 'Tắt', 'Nonaktif', 'Kapalı', 'Wył.')}
            onPress={() => router.push('/settings_notifications')}
          />
          <SettingsGlassRow
            glass={glass}
            testID="settings-themes-row"
            icon="layers-outline"
            title={L('Темы', 'Теми', 'Themes', 'Temas', 'Temas', 'Chủ đề', 'Tema', 'Temalar', 'Motywy')}
            value={currentThemeLabel}
            onPress={() => router.push('/settings_themes' as any)}
          />
          {/* sound-settings-start */}
          {SHOW_SOUND_SETTINGS ? (
            <SettingsGlassRow
              glass={glass}
              icon="volume-high"
              title={uiSoundsLabel(lang)}
              right={
                <CustomSwitch
                  testID="settings-ui-sounds-switch"
                  accessibilityLabel={uiSoundsLabel(lang)}
                  value={soundSettings.uiSounds}
                  onValueChange={(value) => updateSoundSetting('uiSounds', value)}
                />
              }
            />
          ) : null}
          {SHOW_SOUND_SETTINGS ? (
            <SettingsGlassRow
              glass={glass}
              icon="megaphone-outline"
              title={voiceOutLabel(lang)}
              right={
                <CustomSwitch
                  testID="settings-voice-out-switch"
                  accessibilityLabel={voiceOutLabel(lang)}
                  value={soundSettings.voiceOut}
                  onValueChange={(value) => updateSoundSetting('voiceOut', value)}
                />
              }
            />
          ) : null}
          {/* sound-settings-end */}
          <SettingsGlassRow
            glass={glass}
            testID="settings-tap-haptics-row"
            icon="phone-portrait-outline"
            title={tapHapticsLabel}
            right={(
              <SettingsGlassSwitch
                testID="settings-tap-haptics-switch"
                glass={glass}
                value={hapticTap}
                onValueChange={toggleTapHaptics}
                accessibilityLabel={tapHapticsLabel}
              />
            )}
          />
          {/* Размер шрифта — три плитки выбора в той же группе. */}
          <SettingsGlassCard glass={glass} testID="settings-font-size-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <SettingsGlassTile glass={glass}>
                <Ionicons name="text" size={20} color={glass.lightTint} />
              </SettingsGlassTile>
              <Text accessibilityRole="header" style={{ flex: 1, minWidth: 0, color: glass.text, fontSize: 16, lineHeight: 22, fontWeight: '600' }}>{fontSizeLabel}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['small', 'medium', 'large'] as const).map(sz => (
                <PressableHybrid
                  key={sz}
                  testID={`settings-font-size-${sz}`}
                  accessibilityState={{ selected: fontSize === sz }}
                  accessibilityLabel={L(
                    sz === 'small' ? 'Малый шрифт' : sz === 'medium' ? 'Средний шрифт' : 'Большой шрифт',
                    sz === 'small' ? 'Малий шрифт' : sz === 'medium' ? 'Середній шрифт' : 'Великий шрифт',
                    sz === 'small' ? 'Small font' : sz === 'medium' ? 'Medium font' : 'Large font',
                    sz === 'small' ? 'Letra pequeña' : sz === 'medium' ? 'Letra mediana' : 'Letra grande',
                    sz === 'small' ? 'Fonte pequena' : sz === 'medium' ? 'Fonte média' : 'Fonte grande',
                    sz === 'small' ? 'Chữ nhỏ' : sz === 'medium' ? 'Chữ vừa' : 'Chữ lớn',
                    sz === 'small' ? 'Font kecil' : sz === 'medium' ? 'Font sedang' : 'Font besar',
                    sz === 'small' ? 'Küçük yazı' : sz === 'medium' ? 'Orta yazı' : 'Büyük yazı',
                    sz === 'small' ? 'Mała czcionka' : sz === 'medium' ? 'Średnia czcionka' : 'Duża czcionka',
                  )}
                  onPress={() => { setFontSize(sz); }}
                  withSound={false}
                  variant="chip"
                  style={{ flex: 1 }}
                  // зачем: выбранность читается тоном (glass.selected) и цветом текста, без цветной рамки.
                  contentStyle={{ minHeight: 56, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: fontSize === sz ? glass.selected : glass.opaqueControl, boxShadow: nestedBoxShadow(glass) }}
                >
                  <Text style={{ fontSize: sz === 'small' ? 12 : sz === 'medium' ? 14 : 17, fontWeight: '700', color: fontSize === sz ? glass.text : glass.mutedText }}>A</Text>
                  {/* зачем: короткое слово в равнодолевой плитке — при нехватке места переносится, не сжимается (запрет на подгонку шрифта). */}
                  <Text style={{ fontSize: 13, lineHeight: 17, marginTop: 2, textAlign: 'center', color: fontSize === sz ? glass.text : glass.mutedText }}>
                    {L(
                      sz === 'small' ? 'Малый' : sz === 'medium' ? 'Средний' : 'Большой',
                      sz === 'small' ? 'Малий' : sz === 'medium' ? 'Середній' : 'Великий',
                      sz === 'small' ? 'Small' : sz === 'medium' ? 'Medium' : 'Large',
                      sz === 'small' ? 'Pequeño' : sz === 'medium' ? 'Mediano' : 'Grande',
                      sz === 'small' ? 'Pequeno' : sz === 'medium' ? 'Médio' : 'Grande',
                      sz === 'small' ? 'Nhỏ' : sz === 'medium' ? 'Vừa' : 'Lớn',
                      sz === 'small' ? 'Kecil' : sz === 'medium' ? 'Sedang' : 'Besar',
                      sz === 'small' ? 'Küçük' : sz === 'medium' ? 'Orta' : 'Büyük',
                      sz === 'small' ? 'Mały' : sz === 'medium' ? 'Średni' : 'Duży',
                    )}
                  </Text>
                </PressableHybrid>
              ))}
            </View>
          </SettingsGlassCard>
        </SettingsGlassGroup>

        <SettingsGlassEyebrow wide glass={glass} title="PHRASEMAN PLUS" />
        <SettingsGlassGroup glass={glass} testID="settings-group-plus">
          <SettingsGlassRow
            glass={glass}
            testID="settings-plus-row"
            icon={hasPremiumAccess ? 'diamond' : 'diamond-outline'}
            title={plusRowLabel}
            value={plusRowValue}
            haptic={false}
            onPress={plusRowPress}
          />
          {/* зачем 2026-08-04 (владелец: «кнопка должна быть всегда там без исключений»): ряд ввода
              промокода безусловный, без зависимости от remote-флага и сети. */}
          <SettingsGlassRow
            glass={glass}
            testID="settings-promo-code-row"
            icon="pricetag-outline"
            title={L('Ввести промокод', 'Ввести промокод', 'Enter code', 'Introducir código', 'Inserir código', 'Nhập mã', 'Masukkan kode', 'Kodu gir', 'Wpisz kod')}
            onPress={() => {
              router.push({ pathname: '/promo_code_entry', params: { source: 'settings' } } as any);
            }}
          />
          {/* зачем (решение (б), координатор 04.10): приглашение друга — строкой в группе Plus вместо отдельного
              баннера с картинкой; видна, пока раздел приглашений включён. */}
          {settingsReferralRowVisible ? (
            <SettingsGlassRow
              glass={glass}
              testID="settings-invite-banner"
              icon="gift-outline"
              title={L('Пригласить друга', 'Запросити друга', 'Invite a friend', 'Invitar a un amigo', 'Convidar um amigo', 'Mời một người bạn', 'Ajak teman', 'Arkadaş davet et', 'Zaproś znajomego')}
              onPress={() => {
                router.push({ pathname: '/referrals', params: { source: 'settings' } } as any);
              }}
            />
          ) : null}
        </SettingsGlassGroup>
        {premiumDetails}
        {/* Единый ряд «Ввести код» (реферальный/промокод) — жёстко выключен (shield): код и переходы
            сохранены, показ не возвращается без решения владельца. */}
        {false ? (
          <SettingsGlassList marginTop={12}>
            <SettingsGlassRow
              glass={glass}
              testID="settings-code-entry-submit"
              icon={codeEntryMode === 'promo' ? 'ticket-outline' : 'gift'}
              title={codeEntryMode === 'promo'
                ? L('Ввести промокод', 'Ввести промокод', 'Enter code', 'Introducir código', 'Inserir código', 'Nhập mã', 'Masukkan kode', 'Kodu gir', 'Wpisz kod')
                : L('Ввести реферальный код', 'Ввести реферальний код', 'Enter referral code', 'Introducir código de invitación', 'Inserir código de indicação', 'Nhập mã giới thiệu', 'Masukkan kode referal', 'Davet kodunu gir', 'Wpisz kod polecenia')}
              onPress={() => {
                if (codeEntryMode === 'promo') {
                  router.push({ pathname: '/promo_code_entry', params: { source: 'settings' } } as any);
                } else {
                  // зачем: отдельный экран ввода удалён — тот же единый экран рефералов,
                  // ?enter=1 сразу выдвигает шит «Код от друга».
                  router.push({ pathname: '/referrals', params: { enter: '1', source: 'settings' } } as any);
                }
              }}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['referral', 'promo'] as const).map(mode => (
                <PressableHybrid
                  key={mode}
                  testID={`settings-code-entry-mode-${mode}`}
                  accessibilityState={{ selected: codeEntryMode === mode }}
                  accessibilityLabel={mode === 'promo'
                    ? L('Промокод', 'Промокод', 'Promo code', 'Código promocional', 'Código promocional', 'Mã khuyến mãi', 'Kode promo', 'Promo kod', 'Kod promocyjny')
                    : L('Реферальный код', 'Реферальний код', 'Referral code', 'Código de invitación', 'Código de indicação', 'Mã giới thiệu', 'Kode referal', 'Davet kodu', 'Kod polecenia')}
                  onPress={() => setCodeEntryMode(mode)}
                  withSound={false}
                  variant="chip"
                  style={{ flex: 1 }}
                  contentStyle={{ minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: codeEntryMode === mode ? glass.selected : glass.opaqueControl }}
                >
                  <Text style={{ color: codeEntryMode === mode ? glass.text : glass.mutedText, fontSize: 13, lineHeight: 18, fontWeight: '700' }}>
                    {mode === 'promo'
                      ? L('Промокод', 'Промокод', 'Promo code', 'Código promocional', 'Código promocional', 'Mã khuyến mãi', 'Kode promo', 'Promo kod', 'Kod promocyjny')
                      : L('Реферальный код', 'Реферальний код', 'Referral code', 'Código de invitación', 'Código de indicação', 'Mã giới thiệu', 'Kode referal', 'Davet kodu', 'Kod polecenia')}
                  </Text>
                </PressableHybrid>
              ))}
            </View>
          </SettingsGlassList>
        ) : null}

        <SettingsGlassEyebrow wide glass={glass} title={L('ПОМОЩЬ', 'ДОПОМОГА', 'HELP', 'AYUDA', 'AJUDA', 'TRỢ GIÚP', 'BANTUAN', 'YARDIM', 'POMOC')} />
        <SettingsGlassGroup glass={glass} testID="settings-group-help">
          <SettingsGlassRow
            glass={glass}
            testID="settings-support-report-row"
            icon="chatbox-outline"
            title={L('Написать в поддержку', 'Написати в підтримку', 'Contact support', 'Escribir a soporte', 'Escrever para o suporte', 'Liên hệ hỗ trợ', 'Tulis ke dukungan', 'Desteğe yaz', 'Napisz do pomocy')}
            onPress={() => {
              router.push('/support_report' as never);
            }}
          />
          {/* Один ряд → отдельный экран privacy_settings (согласие на аналитику, Политика, Условия, удаление аккаунта). */}
          <SettingsGlassRow
            glass={glass}
            testID="settings-privacy-row"
            icon="shield-outline"
            title={L('Приватность и данные', 'Приватність і дані', 'Privacy and data', 'Privacidad y datos', 'Privacidade e dados', 'Quyền riêng tư và dữ liệu', 'Privasi dan data', 'Gizlilik ve veriler', 'Prywatność i dane')}
            onPress={() => router.push('/privacy_settings' as never)}
          />
          {/* Рабочая функция не из макета (решение (б)): чистка только пересоздаваемых копий (app/cache_reset.ts);
              статус живёт в правой подписи, а не в блокирующем алерте. */}
          <SettingsGlassRow
            glass={glass}
            testID="settings-clear-cache-row"
            icon="trash-outline"
            title={L('Очистить кеш', 'Очистити кеш', 'Clear cache', 'Borrar caché', 'Limpar cache', 'Xóa bộ nhớ đệm', 'Hapus cache', 'Önbelleği temizle', 'Wyczyść pamięć podręczną')}
            value={clearCacheState === 'running'
              ? L('Чистим…', 'Чистимо…', 'Clearing…', 'Borrando…', 'Limpando…', 'Đang xóa…', 'Menghapus…', 'Temizleniyor…', 'Czyszczenie…')
              : clearCacheState === 'done'
                ? L('Готово', 'Готово', 'Done', 'Listo', 'Pronto', 'Xong', 'Selesai', 'Tamam', 'Gotowe')
                : clearCacheState === 'failed'
                  ? L('Не удалось', 'Не вдалося', 'Failed', 'No se pudo', 'Não deu certo', 'Không thành công', 'Gagal', 'Başarısız', 'Nie udało się')
                  : undefined}
            haptic={false}
            onPress={confirmClearCache}
          />
          {/* Рабочая функция не из макета (решение (б)): страница отзыва в сторе (deep-link + веб-фолбэк). */}
          <SettingsGlassRow
            glass={glass}
            testID="settings-rate-app-row"
            icon="star-outline"
            title={Platform.OS === 'ios'
              ? L('Оценить в App Store', 'Оцінити в App Store', 'Rate on the App Store', 'Valorar en el App Store', 'Avaliar na App Store', 'Đánh giá trên App Store', 'Beri nilai di App Store', "App Store'da değerlendir", 'Oceń w App Store')
              : L('Оценить в Google Play', 'Оцінити в Google Play', 'Rate on Google Play', 'Valorar en Google Play', 'Avaliar no Google Play', 'Đánh giá trên Google Play', 'Beri nilai di Google Play', "Google Play'de değerlendir", 'Oceń w Google Play')}
            onPress={() => {
              void openStoreReviewPage();
            }}
          />
        </SettingsGlassGroup>

        {settingsMessageSelection.bottom && hasAppMessageCopyForLang(settingsMessageSelection.bottom, lang) ? ( /* зачем (settings-gap-002): без текста на языке интерфейса плашку не рисуем — ни пустой, ни русской */
          <View testID="settings-message-slot-bottom" style={{ marginHorizontal: -16 }}>
            <SettingsMessageSlotCard
              campaign={settingsMessageSelection.bottom}
              lang={lang}
              ownerStableId={settingsMessageOwner}
              marginTop={20}
            />
          </View>
        ) : null}

        {/* Подвал макета A: «Версия 2.0.0 (118) · Dev Hub» мелко по центру; Dev Hub — только в дев-сборке. */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', marginTop: 26, paddingBottom: 12 }}>
          <Text style={{ color: glass.mutedText, fontSize: 13, lineHeight: 18, textAlign: 'center' }}>
            {`${L('Версия', 'Версія', 'Version', 'Versión', 'Versão', 'Phiên bản', 'Versi', 'Sürüm', 'Wersja')} ${Constants.expoConfig?.version ?? ''} (${getAppReleaseBuildId()})`}
          </Text>
          {ENABLE_DEV_TOOLS ? (
            <>
              <Text style={{ color: glass.mutedText, fontSize: 13, lineHeight: 18 }}>{' · '}</Text>
              <TouchableOpacity
                testID="settings-dev-hub-button"
                accessibilityRole="button"
                accessibilityLabel={L('Открыть Dev Hub', 'Відкрити Dev Hub', 'Open Dev Hub', 'Abrir Dev Hub', 'Abrir Dev Hub', 'Mở Dev Hub', 'Buka Dev Hub', "Dev Hub'ı aç", 'Otwórz Dev Hub')}
                activeOpacity={0.7}
                hitSlop={12}
                onPressIn={() => doHaptic()}
                onPress={() => requestOpenDevHub('settings_top')}
              >
                <Text style={{ color: glass.mutedText, fontSize: 13, lineHeight: 18, textDecorationLine: 'underline' }}>Dev Hub</Text>{/* i18n-ok: ссылка в Dev Hub, только dev-сборка */}
              </TouchableOpacity>
            </>
          ) : null}
        </View>

      </Reanimated.ScrollView>
      </BouncyWrap>
      </React.Profiler>


      <StudyLanguageSheet
        visible={studySheetVisible}
        onClose={() => { setStudySheetVisible(false); void loadStudyTarget(); }}
        lang={lang}
        activeTarget={studyTarget}
        logTag="[SETTINGS-STUDY-LANG]"
      />
      {authPromptMounted || authPromptVisible ? (
      <React.Profiler id="settings_auth_modal" onRender={onSettingsProfile}>
      <RegistrationPromptModal
        visible={authPromptVisible}
        context="settings"
        onClose={() => setAuthPromptVisible(false)}
        onSignedIn={() => {
          setAuthPromptVisible(false);
          linkedAuthGenerationRef.current += 1;
          linkedAuthDirtyRef.current = true;
          void refreshLinkedAuth();
        }}
      />
      </React.Profiler>
      ) : null}

      {/* ── Смена аккаунта: подтверждение + лоадер в ОДНОМ нативном <Modal> ──
          зачем (владелец, 2026-09-13): «нажимаю сохранить и выйти — мелькает и
          ничего». Раньше здесь были ДВА <Modal> (confirm и wiping), и переход
          confirm→wiping закрывал первый и презентовал второй в ОДНОМ кадре.
          На iOS это present-during-dismiss: стек презентаций ломается, окно не
          появляется, а экран перестаёт принимать тапы — ровно симптом владельца.
          Тот же класс бага уже был найден и починен в AccountLogoutFlow.tsx
          (см. его шапку, строки 119-125) и описан в этом же файле выше, но
          здесь фикс не применили. Теперь модал ОДИН, стадия меняет только его
          СОДЕРЖИМОЕ — нативного present/dismiss между стадиями больше нет. */}
      <Modal
        visible={switchAccountStage === 'confirm' || switchAccountStage === 'wiping'}
        transparent
        animationType="fade"
        onRequestClose={() => { if (switchAccountStage === 'confirm') setSwitchAccountStage('idle'); }}
      >
        {switchAccountStage === 'wiping' ? (
          <View style={{ flex: 1, backgroundColor: EXEMPT_COLOR_2, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
            <View
              style={{
                width: '100%',
                maxWidth: 280,
                backgroundColor: t.bgCard,
                borderRadius: 16,
                padding: 28,
                alignItems: 'center',
                overflow: 'hidden',
              }}
            >
              <Ionicons name="shield-checkmark" size={28} color={t.accentText} />
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>
                {L('Аккаунт', 'Акаунт', 'Account', 'Cuenta', 'Conta', 'Tài khoản', 'Akun', 'Hesap', 'Konto')}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 6, textAlign: 'center' }}>
                {L('Не закрывай приложение', 'Не закривай застосунок', 'Do not close the app', 'No cierres la app', 'Não feche o app', 'Đừng đóng ứng dụng', 'Jangan tutup aplikasi', 'Uygulamayı kapatma', 'Nie zamykaj aplikacji')}
              </Text>
            </View>
          </View>
        ) : (
        // зачем (auth-gap-012, образец accounts-gaps-states.html switch = общее окно `.or-alert`): карточка в виде GlassAlertCard —
        // поля 24, r25, поля 20, заголовок 23/29 по центру, текст --sec по центру, кнопки-пилюли 44 в ряд. Модал остаётся ОДИН на обе
        // стадии (второй <Modal> ломает стек презентаций iOS, см. шапку блока), поэтому стили повторены здесь, а не взят GlassAlertDialog.
        <View style={{ flex: 1, backgroundColor: EXEMPT_COLOR_3, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
          <View
            testID="settings-switch-confirm-card"
            style={{
              width: '100%',
              maxWidth: 380,
              backgroundColor: glass.opaqueSheet,
              boxShadow: plateBoxShadow(glass),
              borderRadius: 25,
              padding: 20,
              // стиль «Тень»: окно без кромки, с тенью — как GlassAlertCard.
              overflow: 'hidden',
            }}
          >
            <KitGlassLayer radius={25} />
            <Text accessibilityRole="header" style={{ color: glass.text, fontSize: 23, lineHeight: 29, fontWeight: '800', textAlign: 'center' }}>
              {L('Сменить аккаунт?', 'Змінити акаунт?', 'Switch account?', '¿Cambiar de cuenta?', 'Trocar de conta?', 'Đổi tài khoản?', 'Ganti akun?', 'Hesap değiştirilsin mi?', 'Zmienić konto?')}
            </Text>
            <Text style={{ color: glass.secondary, fontSize: 16, lineHeight: 22, textAlign: 'center', marginTop: 9 }}>
              {L(
                'Текущий прогресс останется привязан к аккаунту, под которым ты сейчас вошёл. Чтобы вернуться — войди под ним снова.',
                "Поточний прогрес залишиться прив\'язаним до акаунта, під яким ти зараз увійшов. Щоб повернутися до нього — увійди тим самим акаунтом знову.",
                'Your current progress will stay linked to the account you are logged in with now. To come back to it — log in with that account again.',
                'Tu progreso quedará vinculado a la cuenta con la que iniciaste sesión. Para recuperarlo, vuelve a entrar con la misma cuenta.',
                'Seu progresso atual ficará vinculado à conta em que você está conectado agora. Para voltar, entre nela novamente.',
                'Tiến độ hiện tại sẽ gắn với tài khoản bạn đang đăng nhập. Muốn quay lại, hãy đăng nhập lại bằng tài khoản đó.',
                'Progres saat ini akan tetap terhubung ke akun yang sedang kamu pakai. Untuk kembali, masuk lagi dengan akun yang sama.',
                'Mevcut ilerlemen şu anda giriş yaptığın hesaba bağlı kalacak. Geri dönmek için aynı hesapla tekrar giriş yap.',
                'Obecny postęp pozostanie przypisany do konta, na którym jesteś teraz zalogowany. Aby wrócić, zaloguj się na nie ponownie.',
              )}
            </Text>
            {showPlusTransferNotice ? (
              // зачем (§127): при активном Plus — что с ним будет (Transfer в RevenueCat); только вместе с переносом AccountV2.
              // абзацы — `.or-body` + `.or-next` образца: один цвет --sec, по центру, следующий через 9.
              <Text testID="settings-switch-plus-notice" style={{ color: glass.secondary, fontSize: 16, lineHeight: 22, textAlign: 'center', marginTop: 9 }}>
                {plusTransferSwitchNotice(lang)}
              </Text>
            ) : null}
            <Text style={{ color: glass.secondary, fontSize: 16, lineHeight: 22, textAlign: 'center', marginTop: 9 }}>
              {L(
                'Перед выходом надёжно сохраним прогресс. Если соединение не ответит — отменим смену аккаунта, чтобы ничего не потерялось.',
                'Перед виходом надійно збережемо прогрес. Якщо з’єднання не відповість — скасуємо зміну акаунта, щоб нічого не загубилося.',
                'Before logging out we will safely save your progress. If the connection does not respond, we will cancel the account switch so nothing is lost.',
                'Antes de cerrar sesión guardaremos tu progreso de forma segura. Si la conexión no responde, cancelaremos el cambio de cuenta para que no pierdas nada.',
                'Antes de sair, salvaremos seu progresso com segurança. Se a conexão não responder, cancelaremos a troca de conta para que nada se perca.',
                'Trước khi đăng xuất, chúng tôi sẽ lưu tiến độ của bạn an toàn. Nếu kết nối không phản hồi, việc đổi tài khoản sẽ bị hủy để không mất gì.',
                'Sebelum keluar, progresmu akan disimpan dengan aman. Jika koneksi tidak merespons, pergantian akun dibatalkan agar tidak ada yang hilang.',
                'Çıkmadan önce ilerlemeni güvenle kaydedeceğiz. Bağlantı yanıt vermezse hiçbir şey kaybolmasın diye hesap değişimini iptal edeceğiz.',
                'Przed wylogowaniem bezpiecznie zapiszemy Twój postęp. Jeśli połączenie nie odpowie, anulujemy zmianę konta, aby nic nie przepadło.',
              )}
            </Text>

            {/* `.or-actions`: две пилюли 44 в ряд через 9, отступ 18; ghost — плашка с малой тенью, главная — акцент (как GlassAlertCard). */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 18 }}>
              <TouchableOpacity
                testID="settings-switch-cancel"
                accessibilityRole="button"
                activeOpacity={0.88}
                onPress={() => { doHaptic(); setSwitchAccountStage('idle'); }}
                style={{ flex: 1, minHeight: 44, borderRadius: 22, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: glass.buttonFill, boxShadow: nestedBoxShadow(glass) }}
              >
                <Text numberOfLines={2} style={{ color: glass.text, fontSize: 16, fontWeight: '700', textAlign: 'center' }}>
                  {L('Отмена', 'Скасувати', 'Cancel', 'Cancelar', 'Cancelar', 'Hủy', 'Batal', 'Vazgeç', 'Anuluj')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                testID="settings-switch-continue"
                activeOpacity={0.8}
                onPress={async function runAccountSwitchAttempt(): Promise<void> {
                  // зачем (8L): «Сохранить и сменить» из подтверждения повторяет эту же попытку;
                  // повторный вход во время идущей смены (двойной тап) игнорируем с причиной в логе.
                  if (switchStageRef.current === 'wiping') {
                    console.log('[ACC-MUT] settings:switch_attempt ignored reason=already_wiping');
                    return;
                  }
                  // зачем (AA S2d раунд 4, L-R3-5): смена пережила потолок 45 с и ещё идёт —
                  // повторный тап показывает тот же статус, а не отказ замка смены.
                  if (isAccountSwitchStillRunning()) {
                    console.log('[ACC-MUT] settings:switch_attempt ignored reason=still_running_after_deadline');
                    showAccountSwitchStillRunning();
                    return;
                  }
                  doHaptic();
                  const attemptStartedAtMs = Date.now();
                  // зачем (AA S2d, §139): оверлей «стираю» не висит бесконечно — через
                  // 45 с снимаем его и говорим «ещё идёт»; саму смену не обрываем
                  // (маркер/карантин, возобновляется), её результат обработается ниже.
                  const onSwitchStillRunning = () => {
                    setSwitchAccountStage('idle');
                    showAccountSwitchStillRunning();
                  };
                  setSwitchAccountStage('wiping');
                  settingsPeek = null; // зачем: выход/смена аккаунта — снимок строки аккаунта и напоминаний больше не актуален.
                  const res = await awaitWithStillRunningNotice(signOutAndWipeForAccountSwitch(), ACCOUNT_SWITCH_UI_DEADLINE_MS, onSwitchStillRunning);
                  setSwitchAccountStage('idle');
                  // Общий forced-путь «Сменить без сохранения» для всех блокировок
                  // смены аккаунта. Аварийная копия (включая очередь осколков)
                  // пишется внутри signOutAndWipeForAccountSwitch — даже при
                  // зависшем списании/карантине данные остаются восстановимыми.
                  const runForcedAccountSwitchWithoutSavingNow = async () => {
                    if (switchStageRef.current === 'wiping') {
                      console.log('[ACC-MUT] settings:forced_switch ignored reason=already_wiping');
                      return;
                    }
                    if (isAccountSwitchStillRunning()) {
                      console.log('[ACC-MUT] settings:forced_switch ignored reason=still_running_after_deadline');
                      showAccountSwitchStillRunning();
                      return;
                    }
                    setSwitchAccountStage('wiping');
                    const forced = await awaitWithStillRunningNotice(signOutAndWipeForAccountSwitch({
                      allowWipeWithoutSync: true,
                      allowPendingShardSpendDiscard: true,
                    }), ACCOUNT_SWITCH_UI_DEADLINE_MS, onSwitchStillRunning);
                    setSwitchAccountStage('idle');
                    // зачем (§AUTH-0105, ревью аудита двойного тапа 0dfe1c9c9): принудительная смена тоже может
                    // сорваться ПОСЛЕ записи маркера (recovery_required / wipe_failed) — тогда «Всё осталось на
                    // месте» неправда. Показываем то же окно, что обычная смена (~«Нужно завершить смену»).
                    if (!forced.ok && (forced.reason === 'recovery_required' || forced.reason === 'wipe_failed')) {
                      console.warn('[ACC-MUT] settings:forced_switch_failed_kind', { reason: forced.reason, kind: 'recovery' });
                      showGlassAlert(
                        L('Нужно завершить смену аккаунта', 'Потрібно завершити зміну акаунта', 'Finish the account switch', 'Hay que terminar el cambio de cuenta', 'É preciso concluir a troca de conta', 'Cần hoàn tất việc đổi tài khoản', 'Selesaikan pergantian akun', 'Hesap değişimini tamamlaman gerekiyor', 'Trzeba dokończyć zmianę konta'),
                        L(
                          'Защитный маркер уже мог быть записан. Перезапусти приложение, чтобы продолжить восстановление состояния.',
                          'Захисний маркер уже міг бути записаний. Перезапусти застосунок, щоб продовжити відновлення стану.',
                          'A safety marker may already have been written. Restart the app to continue restoring the state.',
                          'Puede que ya se haya guardado un marcador de seguridad. Reinicia la app para continuar la recuperación.',
                          'Um marcador de segurança pode já ter sido gravado. Reinicie o app para continuar a recuperação.',
                          'Dấu an toàn có thể đã được ghi. Hãy khởi động lại ứng dụng để tiếp tục khôi phục.',
                          'Penanda pengaman mungkin sudah tertulis. Mulai ulang aplikasi untuk melanjutkan pemulihan.',
                          'Güvenlik işareti yazılmış olabilir. Kurtarmaya devam etmek için uygulamayı yeniden başlat.',
                          'Znacznik bezpieczeństwa mógł już zostać zapisany. Uruchom aplikację ponownie, aby dokończyć przywracanie.',
                        ),
                        [{ text: L('Закрыть', 'Закрити', 'Close', 'Cerrar', 'Fechar', 'Đóng', 'Tutup', 'Kapat', 'Zamknij') }],
                        { delayMs: 360 },
                      );
                      return;
                    }
                    if (!forced.ok) {
                      showInfoAlert(
                        L(
                          'Смена аккаунта отменена',
                          'Зміну акаунта скасовано',
                          'Account switch canceled',
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
                          'The safety check did not allow deleting local data. Everything stayed in place — try again later.',
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
                  // зачем (Account V2, 8L, решение координатора §85): если карточки не выгружены
                  // (замок 8J или отказ выгрузки страниц из-за замка/потолка), «Сменить без
                  // сохранения» сотрёт их с телефона. Сначала спрашиваем: ещё раз сохранить
                  // или сменить без сохранения. Окно — тот же стеклянный алерт экрана.
                  const runForcedAccountSwitchWithoutSaving = async () => {
                    if (unsavedCardsCheckBusyRef.current) {
                      console.log('[ACC-MUT] settings:unsaved_cards_check ignored reason=busy');
                      return;
                    }
                    unsavedCardsCheckBusyRef.current = true;
                    let decision: Awaited<ReturnType<typeof readAccountSwitchUnsavedCardsDecision>>;
                    try {
                      decision = await readAccountSwitchUnsavedCardsDecision(attemptStartedAtMs);
                    } finally {
                      unsavedCardsCheckBusyRef.current = false;
                    }
                    if (decision.kind === 'confirm_unsaved_cards') {
                      console.log(`[ACC-MUT] settings:unsaved_cards_confirm shown reason=${decision.reason}`);
                      showGlassAlert(
                        L(
                          'Несохранённые карточки будут удалены с этого телефона',
                          'Незбережені картки буде видалено з цього телефона',
                          'Unsaved cards will be deleted from this phone',
                          'Las tarjetas sin guardar se eliminarán de este teléfono',
                          'Os cartões não salvos serão apagados deste telefone',
                          'Các thẻ chưa lưu sẽ bị xóa khỏi điện thoại này',
                          'Kartu yang belum disimpan akan dihapus dari ponsel ini',
                          'Kaydedilmemiş kartlar bu telefondan silinecek',
                          'Niezapisane fiszki zostaną usunięte z tego telefonu',
                        ),
                        '',
                        [
                          {
                            text: L('Сохранить и сменить', 'Зберегти і змінити', 'Save and switch', 'Guardar y cambiar', 'Salvar e trocar', 'Lưu và đổi', 'Simpan dan ganti', 'Kaydet ve değiştir', 'Zapisz i zmień'),
                            onPress: () => { void runAccountSwitchAttempt(); },
                          },
                          {
                            text: L('Сменить без сохранения', 'Змінити без збереження', 'Switch without saving', 'Cambiar sin guardar', 'Trocar sem salvar', 'Đổi mà không lưu', 'Ganti tanpa menyimpan', 'Yine de değiştir', 'Zmień bez zapisywania'),
                            style: 'destructive',
                            onPress: () => { void runForcedAccountSwitchWithoutSavingNow(); },
                          },
                          {
                            text: L('Остаться здесь', 'Залишитися тут', 'Stay here', 'Quedarme aquí', 'Ficar aqui', 'Ở lại đây', 'Tetap di sini', 'Burada kal', 'Zostań tutaj'),
                            style: 'cancel',
                          },
                        ],
                        { delayMs: 360 }, // зачем: предыдущий алерт только что закрылся
                      );
                      return;
                    }
                    await runForcedAccountSwitchWithoutSavingNow();
                  };
                  if (!res.ok && res.reason === 'pending_shard_spend') {
                    showGlassAlert(
                      L(
                        'Покупка ещё синхронизируется',
                        'Покупка ще синхронізується',
                        'The purchase is still syncing',
                        'La compra aún se está sincronizando',
                        'A compra ainda está sincronizando',
                        'Giao dịch mua vẫn đang đồng bộ',
                        'Pembelian masih disinkronkan',
                        'Satın alma hâlâ eşitleniyor',
                        'Zakup nadal się synchronizuje',
                      ),
                      L(
                        'Смена аккаунта отменена: незавершённое списание монет нельзя переносить или пропускать. Подключись к интернету и попробуй снова.',
                        'Зміну акаунта скасовано: незавершене списання монет не можна переносити або пропускати. Підключися до інтернету й спробуй ще раз.',
                        'Account switch canceled: an unfinished coin charge cannot be carried over or skipped. Connect to the internet and try again.',
                        'El cambio de cuenta se canceló: un gasto de monedas pendiente no se puede trasladar ni omitir. Conéctate a internet e inténtalo de nuevo.',
                        'A troca de conta foi cancelada: um gasto de moedas pendente não pode ser transferido nem ignorado. Conecte-se à internet e tente novamente.',
                        'Đã hủy đổi tài khoản: khoản trừ xu đang chờ không thể chuyển hoặc bỏ qua. Hãy kết nối internet rồi thử lại.',
                        'Pergantian akun dibatalkan: pengeluaran koin yang tertunda tidak dapat dipindahkan atau dilewati. Sambungkan internet lalu coba lagi.',
                        'Hesap değişimi iptal edildi: bekleyen jeton harcaması taşınamaz veya atlanamaz. İnternete bağlanıp tekrar dene.',
                        'Zmiana konta została anulowana: oczekującego wydatku monet nie można przenieść ani pominąć. Połącz się z internetem i spróbuj ponownie.',
                      ),
                      [
                        {
                          text: L('Остаться здесь', 'Залишитися тут', 'Stay here', 'Quedarme aquí', 'Ficar aqui', 'Ở lại đây', 'Tetap di sini', 'Burada kal', 'Zostań tutaj'),
                          style: 'cancel',
                        },
                        {
                          text: L('Сменить без сохранения', 'Змінити без збереження', 'Switch without saving', 'Cambiar sin guardar', 'Trocar sem salvar', 'Đổi mà không lưu', 'Ganti tanpa menyimpan', 'Yine de değiştir', 'Zmień bez zapisywania'),
                          style: 'destructive',
                          onPress: runForcedAccountSwitchWithoutSaving,
                        },
                      ],
                      { delayMs: 360 }, // зачем: модалка подтверждения смены аккаунта только что закрылась
                    );
                    return;
                  }
                  if (!res.ok && res.reason === 'shard_queue_quarantined') {
                    showGlassAlert(
                      L(
                        'Нужна проверка монет',
                        'Потрібна перевірка монет',
                        'Coins need to be checked',
                        'Se deben revisar las monedas',
                        'É preciso verificar as moedas',
                        'Cần kiểm tra xu',
                        'Koin perlu diperiksa',
                        'Jetonların kontrol edilmesi gerekiyor',
                        'Monety wymagają sprawdzenia',
                      ),
                      L(
                        'Смена аккаунта отменена: локальная очередь монет повреждена или принадлежит неизвестному аккаунту. Данные сохранены для восстановления.',
                        'Зміну акаунта скасовано: локальна черга монет пошкоджена або належить невідомому акаунту. Дані збережено для відновлення.',
                        'Account switch canceled: the local coin queue is corrupted or belongs to an unknown account. Data was kept for recovery.',
                        'El cambio de cuenta se canceló: la cola local de monedas está dañada o pertenece a una cuenta desconocida. Los datos se conservaron para recuperarlos.',
                        'A troca de conta foi cancelada: a fila local de moedas está danificada ou pertence a uma conta desconhecida. Os dados foram preservados para recuperação.',
                        'Đã hủy đổi tài khoản: hàng đợi xu cục bộ bị hỏng hoặc thuộc về tài khoản không xác định. Dữ liệu đã được giữ lại để khôi phục.',
                        'Pergantian akun dibatalkan: antrean koin lokal rusak atau milik akun yang tidak diketahui. Data disimpan untuk pemulihan.',
                        'Hesap değişimi iptal edildi: yerel jeton kuyruğu bozuk veya bilinmeyen bir hesaba ait. Veriler kurtarma için saklandı.',
                        'Zmiana konta została anulowana: lokalna kolejka monet jest uszkodzona lub należy do nieznanego konta. Dane zachowano do odzyskania.',
                      ),
                      [
                        {
                          text: L('Остаться здесь', 'Залишитися тут', 'Stay here', 'Quedarme aquí', 'Ficar aqui', 'Ở lại đây', 'Tetap di sini', 'Burada kal', 'Zostań tutaj'),
                          style: 'cancel',
                        },
                        {
                          text: L('Сменить без сохранения', 'Змінити без збереження', 'Switch without saving', 'Cambiar sin guardar', 'Trocar sem salvar', 'Đổi mà không lưu', 'Ganti tanpa menyimpan', 'Yine de değiştir', 'Zmień bez zapisywania'),
                          style: 'destructive',
                          onPress: runForcedAccountSwitchWithoutSaving,
                        },
                      ],
                      { delayMs: 360 }, // зачем: модалка подтверждения смены аккаунта только что закрылась
                    );
                    return;
                  }
                  if (!res.ok && res.reason === 'sync_failed') {
                    // Прогресс не доехал до облака — switch отменён, данные целы.
                    // Даём выбор: повторить при сети или явно сменить без сохранения.
                    showGlassAlert(
                      L('Прогресс не сохранён', 'Прогрес не збережено', 'Progress not saved', 'Progreso no guardado', 'Progresso não salvo', 'Chưa lưu tiến độ', 'Progres belum disimpan', 'İlerleme kaydedilmedi', 'Postęp nie został zapisany'),
                      L(
                        'Смена аккаунта отменена, всё на месте. Попробуй ещё раз.',
                        'Зміну акаунта скасовано, усе на місці. Спробуй ще раз.',
                        'The account switch was canceled, everything is in place. Try again.',
                        'El cambio de cuenta se canceló, todo sigue en su sitio. Inténtalo de nuevo.',
                        'A troca de conta foi cancelada, tudo continua no lugar. Tente de novo.',
                        'Đã hủy đổi tài khoản, mọi thứ vẫn nguyên. Hãy thử lại.',
                        'Pergantian akun dibatalkan, semuanya tetap aman. Coba lagi.',
                        'Hesap değişimi iptal edildi, her şey yerinde. Tekrar dene.',
                        'Zmiana konta anulowana, wszystko zostało na miejscu. Spróbuj ponownie.',
                      ),
                      [
                        {
                          text: L('Остаться здесь', 'Залишитися тут', 'Stay here', 'Quedarme aquí', 'Ficar aqui', 'Ở lại đây', 'Tetap di sini', 'Burada kal', 'Zostań tutaj'),
                          style: 'cancel',
                        },
                        {
                          text: L('Сменить без сохранения', 'Змінити без збереження', 'Switch without saving', 'Cambiar sin guardar', 'Trocar sem salvar', 'Đổi mà không lưu', 'Ganti tanpa menyimpan', 'Yine de değiştir', 'Zmień bez zapisywania'),
                          style: 'destructive',
                          onPress: runForcedAccountSwitchWithoutSaving,
                        },
                      ],
                      { delayMs: 360 }, // зачем: модалка подтверждения смены аккаунта только что закрылась
                    );
                    return;
                  }
                  if (!res.ok) {
                    // зачем (макет overlays-runtime.html OR-ACCOUNT-SWITCH-*): два исхода вместо
                    // общего «Выход не прошёл». До маркера — «Повторить»; после — только перезапуск.
                    const recovery = res.reason === 'recovery_required' || res.reason === 'wipe_failed';
                    console.warn('[ACC-MUT] settings:switch_failed_kind', { reason: res.reason, kind: recovery ? 'recovery' : 'precommit' });
                    if (recovery) {
                      showGlassAlert(
                        L('Нужно завершить смену аккаунта', 'Потрібно завершити зміну акаунта', 'Finish the account switch', 'Hay que terminar el cambio de cuenta', 'É preciso concluir a troca de conta', 'Cần hoàn tất việc đổi tài khoản', 'Selesaikan pergantian akun', 'Hesap değişimini tamamlaman gerekiyor', 'Trzeba dokończyć zmianę konta'),
                        L(
                          'Защитный маркер уже мог быть записан. Перезапусти приложение, чтобы продолжить восстановление состояния.',
                          'Захисний маркер уже міг бути записаний. Перезапусти застосунок, щоб продовжити відновлення стану.',
                          'A safety marker may already have been written. Restart the app to continue restoring the state.',
                          'Puede que ya se haya guardado un marcador de seguridad. Reinicia la app para continuar la recuperación.',
                          'Um marcador de segurança pode já ter sido gravado. Reinicie o app para continuar a recuperação.',
                          'Dấu an toàn có thể đã được ghi. Hãy khởi động lại ứng dụng để tiếp tục khôi phục.',
                          'Penanda pengaman mungkin sudah tertulis. Mulai ulang aplikasi untuk melanjutkan pemulihan.',
                          'Güvenlik işareti yazılmış olabilir. Kurtarmaya devam etmek için uygulamayı yeniden başlat.',
                          'Znacznik bezpieczeństwa mógł już zostać zapisany. Uruchom aplikację ponownie, aby dokończyć przywracanie.',
                        ),
                        [{ text: L('Закрыть', 'Закрити', 'Close', 'Cerrar', 'Fechar', 'Đóng', 'Tutup', 'Kapat', 'Zamknij') }],
                        { delayMs: 360 },
                      );
                      return;
                    }
                    showGlassAlert(
                      L('Смена аккаунта не началась', 'Зміна акаунта не почалася', "The account switch didn't start", 'El cambio de cuenta no empezó', 'A troca de conta não começou', 'Việc đổi tài khoản chưa bắt đầu', 'Pergantian akun belum dimulai', 'Hesap değişimi başlamadı', 'Zmiana konta się nie rozpoczęła'),
                      L(
                        'Защитная проверка остановила смену до записи маркера. Аккаунт и локальные данные не изменены.',
                        'Захисна перевірка зупинила зміну до запису маркера. Акаунт і локальні дані не змінено.',
                        'A safety check stopped the switch before the marker was written. Your account and local data are unchanged.',
                        'Una comprobación de seguridad detuvo el cambio antes de guardar el marcador. Tu cuenta y tus datos no cambiaron.',
                        'Uma verificação de segurança parou a troca antes de gravar o marcador. Sua conta e seus dados não mudaram.',
                        'Kiểm tra an toàn đã dừng việc đổi trước khi ghi dấu. Tài khoản và dữ liệu trên máy không thay đổi.',
                        'Pemeriksaan keamanan menghentikan pergantian sebelum penanda ditulis. Akun dan data lokal tidak berubah.',
                        'Güvenlik kontrolü değişimi işaret yazılmadan durdurdu. Hesabın ve yerel verilerin değişmedi.',
                        'Kontrola bezpieczeństwa zatrzymała zmianę przed zapisaniem znacznika. Konto i dane lokalne są bez zmian.',
                      ),
                      [
                        { text: L('Закрыть', 'Закрити', 'Close', 'Cerrar', 'Fechar', 'Đóng', 'Tutup', 'Kapat', 'Zamknij'), style: 'cancel' },
                        { text: L('Повторить', 'Повторити', 'Retry', 'Reintentar', 'Tentar de novo', 'Thử lại', 'Coba lagi', 'Tekrar dene', 'Ponów'), onPress: () => setSwitchAccountStage('confirm') },
                      ],
                      { delayMs: 360 },
                    );
                    return;
                  }
                  setLinkedAuth(null);
                  setAuthPromptVisible(true);
                  if (!res.synced) {
                    // зачем (overlays-runtime 038, OR-ACCOUNT-SWITCH-UNSYNCED-BACKUP): окно с одной кнопкой «Продолжить» и значком
                    // закладки, а не общим «OK». Тексты и логика выхода прежние.
                    console.log('[ACCOUNT-SWITCH-UI] unsynced backup notice shown synced=false'); // guard-ok: ветка окна логируется
                    void enqueueThemedBlockingInfoAlert(
                      L('Можно выбрать аккаунт', 'Можна вибрати акаунт', 'You can choose an account', 'Puedes elegir cuenta', 'Você pode escolher a conta', 'Bạn có thể chọn tài khoản', 'Kamu bisa memilih akun', 'Hesap seçebilirsin', 'Możesz wybrać konto'),
                      L(
                        'Сервер не ответил перед выходом, поэтому мы сохранили аварийную копию на устройстве. Теперь войди в нужный Google-аккаунт.',
                        'Сервер не відповів перед виходом, тому ми зберегли аварійну копію на пристрої. Тепер увійди в потрібний Google-акаунт.',
                        'The server did not respond before signing out, so we saved an emergency backup on the device. Now sign in to the right Google account.',
                        'El servidor no respondió antes de salir, así que guardamos una copia de emergencia en el dispositivo. Ahora entra con la cuenta de Google correcta.',
                        'O servidor não respondeu antes de sair, então salvamos uma cópia de emergência no dispositivo. Agora entre na conta Google correta.',
                        'Máy chủ không phản hồi trước khi đăng xuất, nên chúng tôi đã lưu bản sao khẩn cấp trên thiết bị. Bây giờ hãy đăng nhập vào tài khoản Google đúng.',
                        'Server tidak merespons sebelum keluar, jadi kami menyimpan salinan darurat di perangkat. Sekarang masuk ke akun Google yang benar.',
                        'Çıkmadan önce sunucu yanıt vermedi, bu yüzden cihazda acil bir kopya sakladık. Şimdi doğru Google hesabıyla giriş yap.',
                        'Serwer nie odpowiedział przed wylogowaniem, więc zapisaliśmy awaryjną kopię na urządzeniu. Teraz zaloguj się na właściwe konto Google.',
                      ),
                      L('Продолжить', 'Продовжити', 'Continue', 'Continuar', 'Continuar', 'Tiếp tục', 'Lanjutkan', 'Devam et', 'Kontynuuj'),
                      { icon: 'bookmark' },
                    );
                  }
                }}
                accessibilityRole="button"
                style={{ flex: 1, minHeight: 44, borderRadius: 22, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: glass.accent, boxShadow: actionBoxShadow(glass) }}
              >
                <ThemeAccentFill glass={glass} radius={22} />
                {/* зачем (координатор 10.10): главное действие окна — цветом акцента темы; зелёный t.correct только для «успех» */}
                <Text numberOfLines={2} style={{ color: glass.accentInk, fontSize: 16, fontWeight: '700', textAlign: 'center' }}>
                  {L('Продолжить', 'Продовжити', 'Continue', 'Continuar', 'Continuar', 'Tiếp tục', 'Lanjutkan', 'Devam et', 'Kontynuuj')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        )}
      </Modal>

      {/* зачем (12.10, аудит COVERAGE_AUDIT_R1 §C): «Модал имени», окно «Аккаунт» и второй экземпляр
          удаления аккаунта удалены — ни один путь их не открывал. Смена имени и удаление аккаунта
          живут в app/account_details.tsx (NicknameEditModal, DeleteAccountConfirmModal). */}
      {glassAlertNode}

    </ScreenGradient>
  );
}
