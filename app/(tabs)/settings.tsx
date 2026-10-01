import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity,
  TextInput, Modal, DeviceEventEmitter,
  Keyboard,
  InteractionManager,
  Platform,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import Reanimated from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
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
  SettingsGlassEyebrow,
  SettingsGlassList,
  SettingsGlassRow,
  SettingsGlassSwitch,
  SettingsGlassTile,
} from '../../components/settings/SettingsGlassRows';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { useMyCoinRank } from '../../hooks/use_my_coin_rank';
import { coinRankRowForDisplay, coinRankTitle, isValidCoinRank } from '../coin_rank_table_v1';
import { useTopFadeScroll } from '../../components/TopFadeScrollContext';
import DeleteAccountConfirmModal from '../../components/DeleteAccountConfirmModal';
import { scheduleDailyReminder, cancelAllNotifications, loadNotificationSettings } from '../notifications';
import { emitAppEvent } from '../events';
import { requestOpenDevHub } from '../dev_hub_bus';
import { ENABLE_DEV_TOOLS } from '../config';
import { DebugLogger } from '../debug-logger';
import { useLang } from '../../components/LangContext';
import { usePremium } from '../../components/PremiumContext';
import CustomSwitch from '../../components/CustomSwitch';
import { hapticTap as doHaptic, setHapticCacheEnabled } from '../../hooks/use-haptics';
import { useTabContentBottomPad } from '../../hooks/use-tab-content-bottom-pad';
import { getStoredStudyTarget, type StudyTarget } from '../study_target';
import { triLang } from '../../constants/i18n';
import { getLinkedAuthInfo, signOutAndWipeForAccountSwitch, type LinkedAuth } from '../auth_provider';
import { reserveNameDetailed, warmNameAvailabilityAuth } from '../firestore_leaderboard';
import { enqueueThemedBlockingInfoAlert } from '../themed_blocking_alert_queue';
import { useGlassAlert } from '../../hooks/use-glass-alert';
import GlassInlineAlert from '../../components/account/GlassInlineAlert';
import { navigateAfterModalClose } from '../safe_modal_navigation';
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
import { peekAppMessagesSnapshot, refreshAppMessagesSnapshotOnce } from '../app_messages';
import { selectSettingsMessageSlots, type SettingsMessageSlotSelection } from '../settings_message_slots';
import { flushSettingsPollVotes } from '../settings_poll_vote';
import { animateNextLayoutTransition } from '../smooth_layout';
import { trackEvent } from '../analytics';
import { normalizePaywallAttributionValue } from '../paywall_entry_contract';
import { applyUserSettingsNow, getUserSettingsSnapshot } from '../user_settings_store';
import { themeDisplayName } from '../theme_display_names';
import {
  uiSoundsLabel,
  uiSoundsSub,
  voiceOutLabel,
  voiceOutSub,
} from '../feedback/feedback_i18n';

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

export default function SettingsMain() {
  const tabContentBottomPad = useTabContentBottomPad();
  const router = useRouter();
  const { theme: t, liquidGlassThemeId, fontSize, setFontSize, f } = useTheme();
  // зачем (владелец 2026-09-29): корень «Настройки» — 1 в 1 по макету PRF-01; все цвета плашек
  // берутся из общих токенов 13 тем Liquid Glass, как на уже перенесённых дочерних экранах.
  const glass = liquidGlassTokens(liquidGlassThemeId);
  // зачем: нативные Alert.alert заменены стеклянными окнами (тот же текст/кнопки/обработчики)
  const { showGlassAlert, node: glassAlertNode } = useGlassAlert();
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

  /**
   * Сообщение поверх открытой модалки имени.
   *
   * showInfoAlert (enqueueThemedBlockingInfoAlert → ThemedBlockingAlertHost → OverlayArbiter)
   * рендерит themedAlert НАТИВНЫМ <Modal>. Модалка имени тут — тоже нативный <Modal>. На iOS
   * презентовать один <Modal> поверх другого (present-over-present) ломает стек презентаций:
   * алерт не появляется ВООБЩЕ («Сохранить ничего не делает»), а экран виснет.
   *
   * зачем (Liquid Glass, overlays-runtime «native alert · name»): раньше тут был системный
   * Alert.alert. Теперь — стеклянный слой ВНУТРИ самой модалки имени (GlassInlineAlert — обычный
   * View, не <Modal>), поэтому конфликта презентаций по-прежнему нет, а вид стеклянный.
   */
  const [nameInlineAlert, setNameInlineAlert] = useState<string | null>(null);
  const alertOverName = React.useCallback(
    (message: string) => {
      setNameInlineAlert(message);
    },
    [],
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
    setNameInlineAlert(null);
    Keyboard.dismiss();
    setNameModal(false);
  }, []);
  const closeNameModal = useCallback(() => {
    if (nameSavingRef.current) return;
    closeNameModalNow();
  }, [closeNameModalNow]);
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
    const revert = (error: unknown) => {
      setNotifEnabled(previous);
      DebugLogger.error('settings.tsx:toggleNotifications', error, 'warning');
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Не удалось изменить напоминания. Попробуй ещё раз.',
        messageUk: 'Не вдалося змінити нагадування. Спробуй ще раз.',
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
        await scheduleDailyReminder(notifHour, 0, lang, { studyTarget });
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
  const [nameModal, setNameModal] = useState(false);
  const [newName, setNewName]     = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const nameSavingRef = useRef(false);
  /**
   * зачем (Optimistic UI): раньше «Сохранить» держало модалку открытой и крутило
   * спиннер, пока ждали ответ nameReserve — юзер упирался в блокирующий Alert
   * только ПОСЛЕ round-trip. Теперь модалка закрывается и новый ник виден в
   * профиле СРАЗУ по тапу, а бронь на сервере (14-дневный кулдаун — источник
   * истины, НЕ ослаблен) идёт фоном. Если сервер отклонит — откатываем ник
   * обратно и показываем некритичную инлайн-плашку (не блокирующий Alert).
   * nameChangeGuardRef — last-write-guard: поздний ответ устаревшей попытки
   * не может откатить уже более свежее локальное имя (гонка double-tap/повтор).
   */
  const [, setNameChangeNotice] = useState<string | null>(null);
  const nameChangeGuardRef = useRef(0);
  const settingsStorageHydratedRef = useRef(false);
  useEffect(() => {
    if (nameModal) warmNameAvailabilityAuth();
  }, [nameModal]);
  const { isPremium, isVip, isPro, hasPremiumAccess, isIntroFullAccess, introFullAccessEndsAt } = usePremium();
  const initialSettingsMessageOwnerRef = useRef(captureAccountGeneration().stableId ?? '');
  const [settingsMessageOwner, setSettingsMessageOwner] = useState(initialSettingsMessageOwnerRef.current);
  const [settingsMessageSelection, setSettingsMessageSelection] = useState<SettingsMessageSlotSelection>(() => (
    selectSettingsMessageSlots(peekAppMessagesSnapshot(), {
      stableId: initialSettingsMessageOwnerRef.current,
      hasPremiumAccess,
      appVersion: Constants.expoConfig?.version ?? '',
    })
  ));

  useEffect(() => {
    if (!settingsRuntimeActive) return;
    let cancelled = false;
    const account = captureAccountGeneration();
    void refreshAppMessagesSnapshotOnce({ minIntervalMs: 30_000 }).then((snapshot) => {
      if (cancelled || !account.stableId || !isCurrentAccountGeneration(account, account.stableId)) return;
      const next = selectSettingsMessageSlots(snapshot, {
        stableId: account.stableId,
        hasPremiumAccess,
        appVersion: Constants.expoConfig?.version ?? '',
      });
      setSettingsMessageOwner(account.stableId);
      setSettingsMessageSelection((current) => {
        const currentKey = `${current.top?.id ?? ''}:${current.bottom?.id ?? ''}:${JSON.stringify(current.assignments)}`;
        const nextKey = `${next.top?.id ?? ''}:${next.bottom?.id ?? ''}:${JSON.stringify(next.assignments)}`;
        if (currentKey === nextKey) return current;
        if (current.top?.id !== next.top?.id || current.bottom?.id !== next.bottom?.id) {
          animateNextLayoutTransition();
        }
        return next;
      });
    }).catch(() => {});
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
  const [linkedAuth, setLinkedAuth] = useState<LinkedAuth | null>(null);
  /** Пока false — getLinkedAuthInfo ещё не завершился (избегаем кадра «Не привязан»). */
  const [authReady, setAuthReady] = useState(false);
  const linkedAuthDirtyRef = useRef(true);
  const linkedAuthGenerationRef = useRef(0);
  const linkedAuthInFlightRef = useRef<Promise<void> | null>(null);
  const [authPromptVisible, setAuthPromptVisible] = useState(false);
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
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [deleteAccountModalVisible, setDeleteAccountModalVisible] = useState(false);
  /**
   * UI state для flow "Сменить аккаунт" (Variant 2):
   *   'idle'        — пользователь нигде не нажал
   *   'confirm'     — показываем confirm-модалку с предупреждением
   *   'wiping'      — крутится спиннер: forced sync + signOut + wipe
   */
  const [switchAccountStage, setSwitchAccountStageRaw] = useState<'idle' | 'confirm' | 'wiping'>('idle');
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
      .catch(() => {});
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

  const [studyTarget, setStudyTarget] = useState<StudyTarget>('en');
  const loadStudyTarget = useCallback(async () => {
    setStudyTarget(await getStoredStudyTarget(lang));
  }, [lang]);
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
      .catch(() => {});
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
        setPremiumPlan(pairs[1][1]);
        setVipUntilMs(parseStoredExpiryMs(vip?.vip_until));
        if (pairs[2][1] !== null) setHapticTap(pairs[2][1] !== 'false');
      })
      .catch(() => {
      });
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
    if (!settingsRuntimeActive) {
      linkedAuthDirtyRef.current = true;
      return Promise.resolve();
    }
    if (linkedAuthInFlightRef.current) return linkedAuthInFlightRef.current;
    linkedAuthDirtyRef.current = false;
    const generation = linkedAuthGenerationRef.current;
    const task = getLinkedAuthInfo()
      .then((info) => {
        if (settingsRuntimeActive && generation === linkedAuthGenerationRef.current) setLinkedAuth(info);
      })
      .catch(() => {
        if (settingsRuntimeActive && generation === linkedAuthGenerationRef.current) setLinkedAuth(null);
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
    if (!settingsRuntimeActive) return;
    if (linkedAuthDirtyRef.current || !authReady) void refreshLinkedAuth();
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
      linkedAuthGenerationRef.current += 1;
      linkedAuthDirtyRef.current = true;
      void refreshLinkedAuth();
    });
    return () => sub.remove();
  }, [refreshLinkedAuth]);

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

  }, []);

  const saveName = async () => {
    if (nameSavingRef.current) return;
    const trimmed = newName.trim();
    if (!trimmed) { alertOverName(L('Введи имя', "Введіть ім\'я", 'Enter a name', 'Escribe un nombre o apodo', 'Digite um nome ou apelido', 'Nhập tên hoặc biệt danh', 'Masukkan nama atau nama panggilan', 'Bir ad veya takma ad gir', 'Wpisz imię lub pseudonim')); return; }
    if (trimmed.length < 2) { alertOverName(L('Минимум 2 символа', 'Мінімум 2 символи', 'Minimum 2 characters', 'Mínimo 2 caracteres', 'Mínimo de 2 caracteres', 'Tối thiểu 2 ký tự', 'Minimal 2 karakter', 'En az 2 karakter', 'Minimum 2 znaki')); return; }
    if (trimmed.length > 20) { alertOverName(L('Максимум 20 символов', 'Максимум 20 символів', 'Maximum 20 characters', 'Máximo 20 caracteres', 'Máximo de 20 caracteres', 'Tối đa 20 ký tự', 'Maksimal 20 karakter', 'En fazla 20 karakter', 'Maksymalnie 20 znaków')); return; }
    if (containsBadWord(trimmed)) { alertOverName(L('Недопустимое имя', "Недопустиме ім\'я", 'Invalid name', 'Nombre no válido', 'Nome inválido', 'Tên không hợp lệ', 'Nama tidak valid', 'Geçersiz ad', 'Niedozwolona nazwa')); return; }

    const oldName = userName.trim();
    if (trimmed === oldName) {
      closeNameModal();
      return;
    }

    // зачем (Optimistic UI, last-write-guard): если юзер успеет запустить ещё одну
    // попытку смены ника, поздний ответ ЭТОЙ попытки не должен откатить уже более
    // свежее локальное состояние (double-tap / повторный сабмит).
    const myGuard = ++nameChangeGuardRef.current;
    const isStaleAttempt = () => nameChangeGuardRef.current !== myGuard;

    nameSavingRef.current = true;
    setNameSaving(true);
    setNameChangeNotice(null);

    // зачем (Optimistic UI, ГЕНУИННО): раньше ник применялся локально ТОЛЬКО
    // после ответа reserveNameDetailed — то есть UI ждал round-trip как и до
    // «оптимистичного» коммита, несмотря на комментарий. Теперь показываем
    // новое имя и закрываем модалку СРАЗУ по тапу, а бронь (14-дневный кулдаун
    // и проверка уникальности — источник истины, НЕ ослаблены) идёт в фоне.
    // Если сервер отклонит — откатываем ник обратно на oldName и показываем
    // некритичную инлайн-плашку (nameChangeNotice), а не блокирующий Alert.
    setUserName(trimmed);
    patchAppSnapshot((current) => current.profile ? {
      profile: {
        ...current.profile,
        source: 'local',
        updatedAt: Date.now(),
        name: trimmed,
      },
    } : {});
    closeNameModalNow();
    void AsyncStorage.setItem('user_name', trimmed).catch((error) => {
      DebugLogger.error('settings.tsx:renameName:localApplyOptimistic', error, 'warning');
    });
    void updateLocalNameReferences(oldName, trimmed).catch((error) => {
      DebugLogger.error('settings.tsx:renameName:localReferencesOptimistic', error, 'warning');
    });

    const rollbackToOldName = () => {
      if (isStaleAttempt()) return; // более свежая попытка уже решила исход UI
      setUserName(oldName);
      patchAppSnapshot((current) => current.profile ? {
        profile: {
          ...current.profile,
          source: 'local',
          updatedAt: Date.now(),
          name: oldName,
        },
      } : {});
      void AsyncStorage.setItem('user_name', oldName).catch((error) => {
        DebugLogger.error('settings.tsx:renameName:rollbackStorage', error, 'warning');
      });
      void updateLocalNameReferences(trimmed, oldName).catch((error) => {
        DebugLogger.error('settings.tsx:renameName:rollbackReferences', error, 'warning');
      });
    };

    try {
      // Жёсткая проверка уникальности: бронируем имя на сервере В ФОНЕ, пока
      // юзер уже видит новое имя. При отказе сервера — откатываем.
      let reservation: Awaited<ReturnType<typeof reserveNameDetailed>>;
      try {
        reservation = await reserveNameDetailed(trimmed, oldName, { source: 'settings' });
      } catch (error) {
        DebugLogger.error('settings.tsx:renameName:reserveName', error, 'warning');
        reservation = { status: 'error' };
      }

      if (isStaleAttempt()) return; // более свежая попытка уже решила исход UI

      if (reservation.status === 'taken') {
        rollbackToOldName();
        setNameChangeNotice(L('Это имя уже занято. Выбери другое.', "Це ім\'я вже зайняте. Оберіть інше.", 'This name is already taken. Choose another.', 'Este nombre ya está en uso. Elige otro.', 'Esse nome já está em uso. Escolha outro.', 'Tên này đã được dùng. Hãy chọn tên khác.', 'Nama ini sudah dipakai. Pilih yang lain.', 'Bu ad zaten kullanılıyor. Başka bir ad seç.', 'Ta nazwa jest już zajęta. Wybierz inną.'));
        return;
      }
      if (reservation.status === 'cooldown') {
        rollbackToOldName();
        setNameChangeNotice(L(
          'Ник можно менять не чаще одного раза в 14 дней.',
          'Нік можна змінювати не частіше одного разу на 14 днів.',
          'You can change your nickname no more than once every 14 days.',
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
        rollbackToOldName();
        setNameChangeNotice(L(
          'Имя не проверилось. Проверь интернет и попробуй ещё раз.',
          'Не вдалося перевірити імʼя. Перевір мережу й спробуй ще раз.',
          'Could not verify the name. Check your connection and try again.',
          'No se pudo comprobar el nombre. Revisa la conexión e inténtalo de nuevo.',
          'Não foi possível verificar o nome. Verifique a conexão e tente novamente.',
          'Không thể kiểm tra tên. Kiểm tra kết nối và thử lại.',
          'Tidak bisa memeriksa nama. Periksa koneksi dan coba lagi.',
          'Ad doğrulanamadı. Bağlantını kontrol et ve tekrar dene.',
          'Nie udało się sprawdzić nazwy. Sprawdź połączenie i spróbuj ponownie.',
        ));
        return;
      }

    } finally {
      nameSavingRef.current = false;
      setNameSaving(false);
    }
  };

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
  if (isIntroFullAccess && introFullAccessEndsAt && introFullAccessEndsAt > Date.now()) {
    plusAccessDetails.push({
      key: 'intro',
      icon: 'sparkles-outline',
      title: L('Полный доступ на 3 дня', 'Повний доступ на 3 дні', 'Full access for 3 days', 'Acceso completo por 3 días', 'Acesso completo por 3 dias', 'Truy cập đầy đủ 3 ngày', 'Akses penuh 3 hari', '3 gün tam erişim', 'Pełny dostęp na 3 dni'),
      subtitle: `${L('Действует до', 'Діє до', 'Active until', 'Activo hasta', 'Ativo até', 'Có hiệu lực đến', 'Aktif sampai', 'Bitiş', 'Ważne do')} ${formatDateTimeShort(introFullAccessEndsAt)}`,
    });
  }

  // Список настроек переведён на Telegram-стиль: сгруппированные карточки
  // (components/settings/SettingsGroup). Старые локальные Row/SectionTitle удалены.

  // Верх экрана — по референсу Bevel: отдельная карточка Plus, под ней отдельная
  // карточка ввода кода, ниже широкий инвайт-баннер с картинкой.
  // зачем: подпись-расшифровка под названием убрана (запрет владельца + чистота
  // референса) — ряд Plus однострочный; при активном Plus справа короткий план.
  const plusRowLabel = hasPremiumAccess
    ? `${tierName} ${L('активирован', 'активовано', 'active', 'activo', 'ativado', 'đã kích hoạt', 'aktif', 'aktif', 'aktywne')} ✓`
    : 'Phraseman Plus';
  const plusRowValue = hasPremiumAccess && isPremium
    ? (premiumPlan === 'yearly'
      ? L('Год', 'Рік', 'Year', 'Anual', 'Anual', 'Năm', 'Tahunan', 'Yıllık', 'Rok')
      : premiumPlan === 'monthly'
        ? L('Месяц', 'Місяць', 'Month', 'Mensual', 'Mensal', 'Tháng', 'Bulanan', 'Aylık', 'Miesiąc')
        : undefined)
    : undefined;
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
              .catch(() => { setClearCacheState('failed'); });
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
      : L('аккаунт не привязан', 'акаунт не прив’язано', 'account not linked', 'cuenta sin vincular', 'conta não vinculada', 'chưa liên kết tài khoản', 'akun belum ditautkan', 'hesap bağlı değil', 'konto niepołączone');
  // зачем (PM-128): звание на языке интерфейса, а не всегда по-русски.
  const profileCardSub = [myCoinRankRow ? coinRankTitle(myCoinRankRow.rank, lang) : undefined, accountLinkedSub].filter(Boolean).join(' · ');
  const profileCardName = userName.trim() || L('Профиль', 'Профіль', 'Profile', 'Perfil', 'Perfil', 'Hồ sơ', 'Profil', 'Profil', 'Profil');
  const studyTargetName = STUDY_TARGET_NATIVE_NAME[studyTarget] ?? studyTarget;
  const studyTargetFlag = STUDY_TARGET_FLAG[studyTarget];
  // Монета ранга вместо аватара (PRF-18); пока ранг неизвестен — нейтральный кружок, не выдуманная медь.
  const renderRankCoin = (testID: string) => (myCoinRankRow ? (
    <Image testID={testID} accessible={false} source={myCoinRankRow.source} style={{ width: 48, height: 48 }} contentFit="contain" />
  ) : (
    <View testID={`${testID}-loading`} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: glass.opaqueControl }} />
  ));
  const toggleTapHaptics = (val: boolean) => {
    // зачем (Optimistic UI): переключатель меняется мгновенно, диск догоняет фоном; сбой записи
    // не откатывает UI (следующая гидрация возьмёт значение из снапшота), но причина пишется в лог.
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
    AsyncStorage.setItem('haptics_tap', String(val)).catch((error) => {
      DebugLogger.error('settings.tsx:toggleTapHaptics:storage', error, 'warning');
    });
  };
  const fontSizeLabel = L('Размер шрифта', 'Розмір шрифту', 'Font size', 'Tamaño de letra', 'Tamanho da fonte', 'Cỡ chữ', 'Ukuran font', 'Yazı boyutu', 'Rozmiar czcionki');
  const tapHapticsLabel = L('Тактильный отклик', 'Тактильний відгук', 'Haptic feedback', 'Respuesta háptica', 'Resposta tátil', 'Phản hồi rung', 'Umpan balik haptik', 'Dokunsal geri bildirim', 'Reakcja haptyczna');

  return (
    <ScreenGradient>
      <BouncyWrap style={bouncyStyle}>
      <Reanimated.ScrollView
        decelerationRate="fast"
        testID="screen-settings"
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        // зачем: верх/лево/право — safe area, низ — высота таббара (tabContentBottomPad уже включает нижний inset);
        // крупный шрифт просто удлиняет прокручиваемое содержимое.
        contentContainerStyle={{ paddingBottom: tabContentBottomPad, paddingTop: insets.top, paddingLeft: 15 + insets.left, paddingRight: 15 + insets.right }}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        bounces
        alwaysBounceVertical
        overScrollMode="always"
        onScroll={handleSettingsScroll}
      >

        {/* зачем (владелец 01.10): в дев-сборке вход в Dev Hub — в самом верху «Настроек». */}
        {ENABLE_DEV_TOOLS ? (
          <TouchableOpacity
            testID="settings-dev-hub-button"
            accessibilityRole="button"
            accessibilityLabel="Открыть Dev Hub"
            activeOpacity={0.8}
            onPressIn={() => doHaptic()}
            onPress={() => requestOpenDevHub('settings_top')}
            style={{ marginTop: 12, minHeight: 48, borderRadius: 16, backgroundColor: glass.opaqueControl, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 }}
          >
            <Ionicons name="flask-outline" size={20} color={glass.text} />
            <Text style={{ color: glass.text, fontSize: 16, fontWeight: '700', flex: 1 }}>Dev Hub</Text>
            <Ionicons name="chevron-forward" size={18} color={glass.mutedText} />
          </TouchableOpacity>
        ) : null}
        {/* Шапка PRF-01: «Настройки» 34/40 + «Профиль и приложение» 15/20 + монета ранга 48. */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 12 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text accessibilityRole="header" style={{ color: glass.text, fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5 }}>
              {L('Настройки', 'Налаштування', 'Settings', 'Ajustes', 'Configurações', 'Cài đặt', 'Pengaturan', 'Ayarlar', 'Ustawienia')}
            </Text>
            <Text style={{ color: glass.mutedText, fontSize: 15, lineHeight: 20, marginTop: 7 }}>
              {L('Профиль и приложение', 'Профіль і застосунок', 'Profile and app', 'Perfil y aplicación', 'Perfil e aplicativo', 'Hồ sơ và ứng dụng', 'Profil dan aplikasi', 'Profil ve uygulama', 'Profil i aplikacja')}
            </Text>
          </View>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {renderRankCoin('settings-header-coin')}
          </View>
        </View>

        {/* Карточка профиля: имя, «ранг · аккаунт привязан», монета текущего ранга; тап — данные аккаунта. */}
        <View style={{ marginTop: 24 }}>
          <SettingsGlassRow
            glass={glass}
            testID="settings-profile-card"
            leading={renderRankCoin('settings-profile-coin')}
            title={profileCardName}
            sub={profileCardSub || undefined}
            onPress={() => router.push('/account_details' as never)}
          />
        </View>

        <SettingsGlassEyebrow glass={glass} title={L('ПРОФИЛЬ', 'ПРОФІЛЬ', 'PROFILE', 'PERFIL', 'PERFIL', 'HỒ SƠ', 'PROFIL', 'PROFİL', 'PROFIL')} />
        <SettingsGlassList>
          {/* зачем: раздел аккаунта — отдельный экран /account_details (данные, вход/выход, удаление);
              authReady защищает от кадра «Не привязан» до ответа. */}
          <SettingsGlassRow
            glass={glass}
            testID="settings-account-row"
            icon="person-outline"
            title={L('Аккаунт', 'Акаунт', 'Account', 'Cuenta', 'Conta', 'Tài khoản', 'Akun', 'Hesap', 'Konto')}
            sub={L('Данные, вход и удаление', 'Дані, вхід і видалення', 'Details, sign-in and deletion', 'Datos, acceso y eliminación', 'Dados, login e exclusão', 'Dữ liệu, đăng nhập và xóa', 'Data, masuk, dan penghapusan', 'Veriler, giriş ve silme', 'Dane, logowanie i usuwanie')}
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
          {/* зачем: выбор языка изучения из настроек не активируется (PRF-23 — иллюстрация,
              у StudyLanguagePicker нет живого вызова), поэтому плашка показывает текущий язык
              изучения без шеврона и без нажатия — чтобы не обещать действие, которого нет. */}
          <SettingsGlassRow
            glass={glass}
            testID="settings-study-language-row"
            leading={studyTargetFlag ? (
              <Image source={studyTargetFlag} accessible={false} style={{ width: 40, height: 40, borderRadius: 11 }} contentFit="cover" />
            ) : undefined}
            icon="language-outline"
            title={L('Язык изучения', 'Мова навчання', 'Learning language', 'Idioma de estudio', 'Idioma de estudo', 'Ngôn ngữ học', 'Bahasa belajar', 'Öğrenilen dil', 'Język nauki')}
            sub={L('Прогресс хранится отдельно', 'Прогрес зберігається окремо', 'Progress is stored separately', 'El progreso se guarda por separado', 'O progresso fica separado', 'Tiến độ được lưu riêng', 'Progres disimpan terpisah', 'İlerleme ayrı saklanır', 'Postęp jest zapisywany osobno')}
            value={studyTargetName}
          />
          {/* Строки ниже — не из макета PRF-01, но рабочие функции: оформлены тем же видом и оставлены
              в разделе «Профиль» (подписка и код относятся к аккаунту). */}
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
            icon="ticket-outline"
            title={L('Ввести промокод', 'Ввести промокод', 'Enter code', 'Introducir código', 'Inserir código', 'Nhập mã', 'Masukkan kode', 'Kodu gir', 'Wpisz kod')}
            onPress={() => {
              router.push({ pathname: '/promo_code_entry', params: { source: 'settings' } } as any);
            }}
          />
        </SettingsGlassList>
        {premiumDetails}
        {settingsMessageSelection.top ? (
          <View testID="settings-message-slot-top" style={{ marginHorizontal: -16 }}>
            <SettingsMessageSlotCard
              campaign={settingsMessageSelection.top}
              lang={lang}
              ownerStableId={settingsMessageOwner}
            />
          </View>
        ) : null}
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
        {settingsReferralRowVisible ? (
          <PressableHybrid
            testID="settings-invite-banner"
            accessibilityLabel={L('Пригласи друга — выиграй Plus', 'Запроси друга — виграй Plus', 'Invite a friend — win Plus', 'Invita a un amigo y gana Plus', 'Convide um amigo e ganhe Plus', 'Mời bạn bè — thắng Plus', 'Undang teman — menangkan Plus', 'Arkadaşını davet et — Plus kazan', 'Zaproś znajomego — wygraj Plus')}
            onPress={() => {
              router.push({ pathname: '/referrals', params: { source: 'settings' } } as any);
            }}
            withSound={false}
            variant="card"
            style={{ marginTop: 12 }}
            contentStyle={{ borderRadius: 14, overflow: 'hidden', backgroundColor: glass.opaqueCard }}
          >
            <ReferralInviteBannerArt />
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: glass.text, fontSize: 16, lineHeight: 21, fontWeight: '700' }}>
                  {L('Пригласи друга — выиграй Plus', 'Запроси друга — виграй Plus', 'Invite a friend — win Plus', 'Invita a un amigo y gana Plus', 'Convide um amigo e ganhe Plus', 'Mời bạn bè — thắng Plus', 'Undang teman — menangkan Plus', 'Arkadaşını davet et — Plus kazan', 'Zaproś znajomego — wygraj Plus')}
                </Text>
                <Text style={{ color: glass.mutedText, fontSize: 13, lineHeight: 18, marginTop: 3 }}>
                  {settingsReferralSurface.softEnabled
                    ? L('Когда друг оформит Plus или Pro, ты получишь шанс выиграть Plus от 1 до 365 дней', 'Коли друг оформить Plus або Pro, ти отримаєш шанс виграти Plus від 1 до 365 днів', 'When a friend gets Plus or Pro, you get a chance to win Plus for 1 to 365 days', 'Cuando tu amigo compre Plus o Pro, tendrás la oportunidad de ganar Plus de 1 a 365 días', 'Quando seu amigo assinar Plus ou Pro, você terá a chance de ganhar Plus de 1 a 365 dias', 'Khi bạn bè mua Plus hoặc Pro, bạn có cơ hội thắng Plus từ 1 đến 365 ngày', 'Saat temanmu membeli Plus atau Pro, kamu berkesempatan memenangkan Plus 1–365 hari', 'Arkadaşın Plus veya Pro satın aldığında 1–365 gün Plus kazanma şansın olur', 'Gdy znajomy kupi Plus lub Pro, dostaniesz szansę wygrać Plus od 1 do 365 dni')
                    : L('У тебя остались шансы выиграть Plus — забери их до срока', 'У тебе залишилися шанси виграти Plus — забери їх до строку', 'You still have chances to win Plus — use them before they expire', 'Te quedan oportunidades de ganar Plus: úsalas antes del plazo', 'Você ainda tem chances de ganhar Plus — use-as antes do prazo', 'Bạn vẫn còn cơ hội thắng Plus — hãy dùng trước hạn', 'Kamu masih punya kesempatan memenangkan Plus — pakai sebelum batas waktu', 'Plus kazanma şansların duruyor — süresi dolmadan kullan', 'Masz jeszcze szanse wygrać Plus — wykorzystaj je przed terminem')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={glass.secondary} />
            </View>
          </PressableHybrid>
        ) : null}

        <SettingsGlassEyebrow glass={glass} title={L('ОБУЧЕНИЕ', 'НАВЧАННЯ', 'LEARNING', 'APRENDIZAJE', 'APRENDIZADO', 'HỌC TẬP', 'PEMBELAJARAN', 'ÖĞRENME', 'NAUKA')} />
        <SettingsGlassList>
          <SettingsGlassRow
            glass={glass}
            testID="settings-edu-row"
            icon="create-outline"
            title={L('Настройки обучения', 'Налаштування навчання', 'Learning settings', 'Ajustes del aprendizaje', 'Configurações de aprendizado', 'Cài đặt học tập', 'Pengaturan pembelajaran', 'Öğrenme ayarları', 'Ustawienia nauki')}
            sub={L('Проверка, ввод и озвучка', 'Перевірка, введення та озвучення', 'Answer checking, input and voice', 'Comprobación, escritura y voz', 'Verificação, digitação e voz', 'Kiểm tra, nhập và giọng đọc', 'Pemeriksaan, input, dan suara', 'Kontrol, giriş ve ses', 'Sprawdzanie, wpisywanie i głos')}
            onPress={() => router.push('/settings_edu')}
          />
          {/* зачем: экран расширился с расписания напоминаний до полноценного раздела
              уведомлений (мастер + категории) — название пункта меню ему соответствует. */}
          <SettingsGlassRow
            glass={glass}
            testID="settings-notifications-row"
            icon="notifications-outline"
            title={L('Уведомления', 'Сповіщення', 'Notifications', 'Notificaciones', 'Notificações', 'Thông báo', 'Notifikasi', 'Bildirimler', 'Powiadomienia')}
            sub={L('Напоминания и итоги', 'Нагадування та підсумки', 'Reminders and summaries', 'Recordatorios y resúmenes', 'Lembretes e resumos', 'Lời nhắc và tổng kết', 'Pengingat dan ringkasan', 'Hatırlatmalar ve özetler', 'Przypomnienia i podsumowania')}
            onPress={() => router.push('/settings_notifications')}
          />
        </SettingsGlassList>
        {/* sound-settings-start */}
        {SHOW_SOUND_SETTINGS && (<>
        <SettingsGlassEyebrow glass={glass} title={L('Звук', 'Звук', 'Sound', 'Sonido', 'Som', 'Âm thanh', 'Suara', 'Ses', 'Dźwięk')} />
        <SettingsGlassList>
          <SettingsGlassRow
            glass={glass}
            icon="volume-high"
            title={uiSoundsLabel(lang)}
            sub={uiSoundsSub(lang)}
            right={
              <CustomSwitch
                testID="settings-ui-sounds-switch"
                accessibilityLabel={uiSoundsLabel(lang)}
                value={soundSettings.uiSounds}
                onValueChange={(value) => updateSoundSetting('uiSounds', value)}
              />
            }
          />
          <SettingsGlassRow
            glass={glass}
            icon="megaphone-outline"
            title={voiceOutLabel(lang)}
            sub={voiceOutSub(lang)}
            right={
              <CustomSwitch
                testID="settings-voice-out-switch"
                accessibilityLabel={voiceOutLabel(lang)}
                value={soundSettings.voiceOut}
                onValueChange={(value) => updateSoundSetting('voiceOut', value)}
              />
            }
          />
        </SettingsGlassList>
        </>)}
        {/* sound-settings-end */}

        <SettingsGlassEyebrow glass={glass} title={L('ВНЕШНИЙ ВИД И ПОМОЩЬ', 'ВИГЛЯД І ДОПОМОГА', 'APPEARANCE AND HELP', 'APARIENCIA Y AYUDA', 'APARÊNCIA E AJUDA', 'GIAO DIỆN VÀ TRỢ GIÚP', 'TAMPILAN DAN BANTUAN', 'GÖRÜNÜM VE YARDIM', 'WYGLĄD I POMOC')} />
        <SettingsGlassList>
          <SettingsGlassRow
            glass={glass}
            testID="settings-themes-row"
            icon="layers-outline"
            title={L('Темы', 'Теми', 'Themes', 'Temas', 'Temas', 'Chủ đề', 'Tema', 'Temalar', 'Motywy')}
            sub={L('Только тёмные варианты', 'Лише темні варіанти', 'Dark variants only', 'Solo variantes oscuras', 'Somente variantes escuras', 'Chỉ có bản tối', 'Hanya varian gelap', 'Yalnızca koyu varyantlar', 'Tylko ciemne warianty')}
            value={currentThemeLabel}
            onPress={() => router.push('/settings_themes' as any)}
          />
          {/* Не из макета PRF-01, но рабочая функция: размер шрифта — три плитки выбора в той же плашке. */}
          <SettingsGlassCard glass={glass} testID="settings-font-size-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <SettingsGlassTile glass={glass}>
                <Ionicons name="text" size={20} color={glass.lightTint} />
              </SettingsGlassTile>
              <Text accessibilityRole="header" style={{ flex: 1, minWidth: 0, color: glass.text, fontSize: 16, lineHeight: 21, fontWeight: '700' }}>{fontSizeLabel}</Text>
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
                  contentStyle={{ minHeight: 56, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: fontSize === sz ? glass.selected : glass.opaqueControl, borderWidth: 1, borderColor: glass.glassEdge }}
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
          {/* Не из макета PRF-01, но рабочая функция: глобальный тактильный отклик. */}
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
          {/* Один ряд → отдельный экран privacy_settings (согласие на аналитику, Политика, Условия, удаление аккаунта). */}
          <SettingsGlassRow
            glass={glass}
            testID="settings-privacy-row"
            icon="lock-closed-outline"
            title={L('Приватность и данные', 'Приватність і дані', 'Privacy and data', 'Privacidad y datos', 'Privacidade e dados', 'Quyền riêng tư và dữ liệu', 'Privasi dan data', 'Gizlilik ve veriler', 'Prywatność i dane')}
            onPress={() => router.push('/privacy_settings' as never)}
          />
          {/* Не из макета PRF-01, но рабочая функция: чистка только пересоздаваемых копий (app/cache_reset.ts);
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
          <SettingsGlassRow
            glass={glass}
            testID="settings-support-report-row"
            icon="chatbubble-ellipses-outline"
            title={L('Написать в поддержку', 'Написати в підтримку', 'Contact support', 'Escribir a soporte', 'Escrever para o suporte', 'Liên hệ hỗ trợ', 'Tulis ke dukungan', 'Desteğe yaz', 'Napisz do pomocy')}
            onPress={() => {
              router.push('/support_report' as never);
            }}
          />
          {/* Не из макета PRF-01, но рабочая функция: страница отзыва в сторе (deep-link + веб-фолбэк). */}
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
        </SettingsGlassList>

        {settingsMessageSelection.bottom ? (
          <View testID="settings-message-slot-bottom" style={{ marginHorizontal: -16 }}>
            <SettingsMessageSlotCard
              campaign={settingsMessageSelection.bottom}
              lang={lang}
              ownerStableId={settingsMessageOwner}
              marginTop={20}
            />
          </View>
        ) : null}

        {/* Подвал — бренд и версия (юр. документы переехали в «Приватность и данные»). */}
        <View style={{ alignItems: 'center', paddingVertical: 32, marginTop: 20 }}>
          <Text style={{ color: glass.mutedText, fontSize: 13, lineHeight: 18, fontWeight: '600', letterSpacing: 0.5, textAlign: 'center' }}>
            PHRASEMAN
          </Text>
          <Text style={{ color: glass.mutedText, fontSize: 13, lineHeight: 18, marginTop: 4, textAlign: 'center' }}>
            by Knowly
          </Text>
          <Text style={{ color: glass.mutedText, fontSize: 12, lineHeight: 16, marginTop: 6, textAlign: 'center' }}>
            {`${Constants.expoConfig?.version ?? ''} (${getAppReleaseBuildId()})`}
          </Text>
        </View>

      </Reanimated.ScrollView>
      </BouncyWrap>


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
                backgroundColor: t.bgCard,
                borderRadius: 16,
                padding: 20,
                borderWidth: 0,
                borderColor: 'transparent',
                overflow: 'hidden',
              },
            ]}
          >
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', marginBottom: 8 }}>
              {L('Аккаунт', 'Акаунт', 'Account', 'Cuenta', 'Conta', 'Tài khoản', 'Akun', 'Hesap', 'Konto')}
            </Text>
            <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: 22 }}>
              {linkedAuth ? (linkedAuth.provider === 'apple' ? 'Apple' : 'Google') : L('Не привязан', "Не прив\'язано", 'Not linked', 'Sin vincular', 'Não vinculada', 'Chưa liên kết', 'Belum ditautkan', 'Bağlı değil', 'Nie połączono')}
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
                  {L('Отмена', 'Скасувати', 'Cancel', 'Cancelar', 'Cancelar', 'Hủy', 'Batal', 'Vazgeç', 'Anuluj')}
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
                  {L('Сменить аккаунт', 'Змінити акаунт', 'Switch account', 'Cambiar de cuenta', 'Trocar de conta', 'Đổi tài khoản', 'Ganti akun', 'Hesap değiştir', 'Zmień konto')}
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
                {L('Удалить аккаунт и данные', 'Видалити акаунт і дані', 'Delete account and data', 'Eliminar cuenta y datos', 'Excluir conta e dados', 'Xóa tài khoản và dữ liệu', 'Hapus akun dan data', 'Hesabı ve verileri sil', 'Usuń konto i dane')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
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
              <Ionicons name="shield-checkmark" size={28} color={t.correct} />
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>
                {L('Аккаунт', 'Акаунт', 'Account', 'Cuenta', 'Conta', 'Tài khoản', 'Akun', 'Hesap', 'Konto')}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 6, textAlign: 'center' }}>
                {L('Не закрывай приложение', 'Не закривай застосунок', 'Do not close the app', 'No cierres la app', 'Não feche o app', 'Đừng đóng ứng dụng', 'Jangan tutup aplikasi', 'Uygulamayı kapatma', 'Nie zamykaj aplikacji')}
              </Text>
            </View>
          </View>
        ) : (
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
          <View
            style={[
              {
                width: '100%',
                maxWidth: 380,
                backgroundColor: t.bgCard,
                borderRadius: 16,
                padding: 20,
                // Карточка отделена тоном (bgCard на скриме), без обводки — правило владельца.
                overflow: 'hidden',
              },
            ]}
          >
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', marginBottom: 12 }}>
              {L('Сменить аккаунт?', 'Змінити акаунт?', 'Switch account?', '¿Cambiar de cuenta?', 'Trocar de conta?', 'Đổi tài khoản?', 'Ganti akun?', 'Hesap değiştirilsin mi?', 'Zmienić konto?')}
            </Text>
            <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: 22, marginBottom: 8 }}>
              {L(
                'Текущий прогресс останется привязан к аккаунту, под которым ты сейчас вошёл. Чтобы вернуться — войди под ним снова.',
                "Поточний прогрес залишиться прив\'язаним до акаунту, під яким ти зараз увійшов. Щоб повернутися до нього — увійди тим самим акаунтом знову.",
                'Your current progress will stay linked to the account you are logged in with now. To come back to it — log in with that account again.',
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
                'Before logging out we will safely save your progress. If the connection does not respond, we will cancel the account switch so nothing is lost.',
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
                  {L('Отмена', 'Скасувати', 'Cancel', 'Cancelar', 'Cancelar', 'Hủy', 'Batal', 'Vazgeç', 'Anuluj')}
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
                          'Account switch cancelled',
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
                        'Зміну акаунту скасовано: незавершене списання монет не можна переносити або пропускати. Підключися до інтернету й спробуй ще раз.',
                        'Account switch cancelled: an unfinished coin charge cannot be carried over or skipped. Connect to the internet and try again.',
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
                          text: L('Сменить без сохранения', 'Змінити без збереження', 'Switch without saving', 'Cambiar sin guardar', 'Trocar sem salvar', 'Đổi mà không lưu', 'Ganti tanpa menyimpan', 'Kaydetmeden değiştir', 'Zmień bez zapisywania'),
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
                        'Зміну акаунту скасовано: локальна черга монет пошкоджена або належить невідомому акаунту. Дані збережено для відновлення.',
                        'Account switch cancelled: the local coin queue is corrupted or belongs to an unknown account. Data was kept for recovery.',
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
                          text: L('Сменить без сохранения', 'Змінити без збереження', 'Switch without saving', 'Cambiar sin guardar', 'Trocar sem salvar', 'Đổi mà không lưu', 'Ganti tanpa menyimpan', 'Kaydetmeden değiştir', 'Zmień bez zapisywania'),
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
                        'Не удалось надёжно сохранить прогресс — похоже, нет соединения. Смена аккаунта отменена, всё осталось на месте. Проверь интернет и попробуй снова.',
                        'Не вдалося надійно зберегти прогрес — схоже, немає з’єднання. Зміну акаунту скасовано, все залишилося на місці. Перевір інтернет і спробуй ще раз.',
                        'Could not safely save your progress — it looks like there is no connection. The account switch was cancelled, everything stayed in place. Check your internet and try again.',
                        'No pudimos guardar tu progreso de forma segura: parece que no hay conexión. El cambio de cuenta se canceló y todo sigue en su lugar. Revisa tu internet e inténtalo de nuevo.',
                        'Não foi possível salvar seu progresso com segurança — parece que não há conexão. A troca de conta foi cancelada e tudo continua no lugar. Verifique a internet e tente novamente.',
                        'Không thể lưu tiến độ an toàn — có vẻ mất kết nối. Việc đổi tài khoản đã bị hủy, mọi thứ vẫn nguyên. Kiểm tra internet và thử lại.',
                        'Kami tidak bisa menyimpan progres dengan aman — sepertinya tidak ada koneksi. Pergantian akun dibatalkan dan semuanya tetap aman. Periksa internet lalu coba lagi.',
                        'İlerlemen güvenle kaydedilemedi — bağlantı yok gibi görünüyor. Hesap değişimi iptal edildi, her şey yerinde. İnterneti kontrol edip tekrar dene.',
                        'Nie udało się bezpiecznie zapisać postępu — wygląda na brak połączenia. Zmiana konta została anulowana, wszystko zostało na miejscu. Sprawdź internet i spróbuj ponownie.',
                      ),
                      [
                        {
                          text: L('Остаться здесь', 'Залишитися тут', 'Stay here', 'Quedarme aquí', 'Ficar aqui', 'Ở lại đây', 'Tetap di sini', 'Burada kal', 'Zostań tutaj'),
                          style: 'cancel',
                        },
                        {
                          text: L('Сменить без сохранения', 'Змінити без збереження', 'Switch without saving', 'Cambiar sin guardar', 'Trocar sem salvar', 'Đổi mà không lưu', 'Ganti tanpa menyimpan', 'Kaydetmeden değiştir', 'Zmień bez zapisywania'),
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
                        L('Нужно завершить смену аккаунта', 'Потрібно завершити зміну акаунту', 'Finish the account switch', 'Hay que terminar el cambio de cuenta', 'É preciso concluir a troca de conta', 'Cần hoàn tất việc đổi tài khoản', 'Selesaikan pergantian akun', 'Hesap değişimini tamamlaman gerekiyor', 'Trzeba dokończyć zmianę konta'),
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
                      L('Смена аккаунта не началась', 'Зміна акаунту не почалася', "The account switch didn't start", 'El cambio de cuenta no empezó', 'A troca de conta não começou', 'Việc đổi tài khoản chưa bắt đầu', 'Pergantian akun belum dimulai', 'Hesap değişimi başlamadı', 'Zmiana konta się nie rozpoczęła'),
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
                    showInfoAlert(
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
                    );
                  }
                }}
                style={{ paddingHorizontal: 10, paddingVertical: 8 }}
              >
                <Text style={{ color: t.correct, fontSize: f.body, fontWeight: '800' }}>
                  {L('Продолжить', 'Продовжити', 'Continue', 'Continuar', 'Continuar', 'Tiếp tục', 'Lanjutkan', 'Devam et', 'Kontynuuj')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        )}
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
                  backgroundColor: glass.opaqueSheet,
                  borderRadius: 24,
                  padding: 24,
                  borderWidth: 0,
                  borderColor: 'transparent',
                  overflow: 'hidden',
                },
              ]}
            >
            <Text style={{ color: glass.text, fontSize: f.h2, fontWeight: '700', marginBottom: 16 }}>
              {L('Изменить имя', 'Змінити ім\'я', 'Change name', 'Cambiar nombre', 'Alterar nome', 'Đổi tên', 'Ubah nama', 'Adı değiştir', 'Zmień nazwę')}
            </Text>
            <TextInput
              accessibilityLabel={L('Имя профиля', 'Ім\'я профілю', 'Profile name', 'Nombre de perfil', 'Nome do perfil', 'Tên hồ sơ', 'Nama profil', 'Profil adı', 'Nazwa profilu')}
              style={{
                backgroundColor: glass.opaqueControl,
                color: glass.text,
                fontSize: f.h2,
                padding: 14,
                minHeight: 52,
                borderRadius: 16,
                borderWidth: 1, // guard-ok: тонкая (1px) полупрозрачная кромка поля — разрешена для PhraseMan 2.0
                borderColor: glass.line,
                marginBottom: 20,
              }}
              value={newName}
              onChangeText={setNewName}
              placeholder={L('Введи имя...', 'Введіть ім\'я...', 'Enter a name...', 'Escribe tu nombre...', 'Digite seu nome...', 'Nhập tên...', 'Masukkan nama...', 'Adını gir...', 'Wpisz imię...')}
              placeholderTextColor={glass.mutedText}
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
                    minHeight: 48,
                    justifyContent: 'center',
                    borderRadius: 24,
                    borderWidth: 0,
                    borderColor: 'transparent',
                    alignItems: 'center',
                    backgroundColor: glass.selected,
                    opacity: nameSaving ? 0.6 : 1,
                    overflow: 'hidden',
                  },
                ]}
                onPress={() => { if (nameSaving) return; doHaptic(); closeNameModal(); }}
              >
                <Text style={{ color: glass.text, fontSize: f.body, fontWeight: '700' }} numberOfLines={1}>{L('Отмена', 'Скасувати', 'Cancel', 'Cancelar', 'Cancelar', 'Hủy', 'Batal', 'Vazgeç', 'Anuluj')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={nameSaving}
                style={[
                  {
                    flex: 1,
                    padding: 12,
                    borderRadius: 24,
                    backgroundColor: glass.accent,
                    borderWidth: 0,
                    borderColor: 'transparent',
                    alignItems: 'center',
                    minHeight: 48,
                    justifyContent: 'center',
                    opacity: nameSaving ? 0.82 : 1,
                    overflow: 'hidden',
                  },
                ]}
                onPress={() => { if (nameSaving) return; doHaptic(); void saveName(); }}
              >
                <View style={{ minHeight: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, maxWidth: '100%' }}>
                  {nameSaving ? (
                    <ActivityIndicator size="small" color={glass.ctaInk} />
                  ) : null}
                  {/* зачем: динамическое сжатие шрифта убрано (запрещённый паттерн) — статично
                      уменьшен размер (было до 15, стало до 13), чтобы длинные варианты перевода
                      («Kaydediliyor», «Zapisywanie») влезали в flex:1-кнопку рядом с индикатором
                      без ужимания на рендере, guard-ok */}
                  <Text
                    style={{ color: glass.accentInk, fontSize: Math.min(f.body, 13), fontWeight: '700', flexShrink: 1 }}
                    numberOfLines={1}
                  >
                    {nameSaving
                      ? L('Сохраняем', 'Зберігаємо', 'Saving', 'Guardando', 'Salvando', 'Đang lưu', 'Menyimpan', 'Kaydediliyor', 'Zapisywanie')
                      : L('Сохранить', 'Зберегти', 'Save', 'Guardar', 'Salvar', 'Lưu', 'Simpan', 'Kaydet', 'Zapisz')}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            <GlassInlineAlert
              visible={nameInlineAlert != null}
              title={L('Сообщение', 'Повідомлення', 'Message', 'Message', 'Mensagem', 'Thông báo', 'Pesan', 'Mesaj', 'Wiadomość')}
              message={nameInlineAlert ?? undefined}
              onClose={() => setNameInlineAlert(null)}
            />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {glassAlertNode}

    </ScreenGradient>
  );
}
