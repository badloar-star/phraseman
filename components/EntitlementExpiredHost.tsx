// Глобальная карточка «Premium/VIP закончился» — закрывает «немое место №1»
// (см. docs/reports/missing_feedback_designs_2026-06-11.html): подписка истекает,
// а приложение молчит до первого упора в пейвол.
//
// Слушает premium_deactivated / vip_deactivated. Показывает карточку ТОЛЬКО если
// подписка реально была активна (флаг ставится на *_activated): события деактивации
// эмитятся снапшотами PremiumContext и у юзеров, никогда не имевших подписки.
import React, { memo, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname, useRouter } from 'expo-router';
import { useReferralRouletteEnabled } from '../app/referral_roulette_flag';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
  type AccountGenerationToken,
} from '../app/account_generation';
import { emitAppEvent, onAppEvent } from '../app/events';
import {
  getVerifiedPremiumAccessStatus,
  getVerifiedRealPremiumStatus,
  getVerifiedVipStatus,
  invalidatePremiumCache,
} from '../app/premium_guard';
import { navigateAfterModalClose } from '../app/safe_modal_navigation';
import { useLang } from './LangContext';
import { useOverlayVisible } from './OverlayArbiter';
import HybridSheetShell from './modal_fx/HybridSheetShell';
import { useTheme } from './ThemeContext';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { DebugLogger } from '../app/debug-logger';
import { getDevOverlaysSnapshot, subscribeDevOverlays } from '../app/dev_overlays_off';

const EXEMPT_COLOR_1 = 'rgba(0,0,0,0.5)'; // theme-exempt: затемнение под окном/шторкой и тень — постоянные в любой теме
import { noteSwallowedHandler, noteSwallowedAs } from '../app/swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

type Kind = 'premium' | 'vip';

const WAS_ACTIVE_KEY: Record<Kind, string> = {
  premium: 'entitlement_was_active_premium',
  vip: 'entitlement_was_active_vip',
};
const LAST_SHOWN_KEY: Record<Kind, string> = {
  premium: 'entitlement_expired_shown_premium',
  vip: 'entitlement_expired_shown_vip',
};
/** Одна и та же деактивация не должна долбить карточкой каждый старт. */
const SHOW_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

function accountEntitlementStorageKey(baseKey: string, stableId: string): string {
  return `${baseKey}::${encodeURIComponent(stableId)}`;
}

function entitlementAccountIsCurrent(token: AccountGenerationToken): token is AccountGenerationToken & { stableId: string } {
  return token.phase === 'active'
    && !!token.stableId
    && isCurrentAccountGeneration(token, token.stableId);
}

type Copy = { title: string; value: string; cta: string; invite: string; ghost: string };

// зачем: владелец 2026-09-29 — карточка «Plus закончился» на Liquid Glass «1 в 1» с
// макета coins.html PAY-09: значок, заголовок, одна строка без обещаний («Plus
// завершён. Прогресс сохранён. Актуальные условия — в предложении магазина»),
// «Продлить Plus» и «Позже». Старые обещания (про уроки и темы),
// кикер и «Пригласить друга» (рулетка/рефералка удалены) убраны. Раньше en
// падал в русский текст — добавлен явный en.
const TEXTS: Record<string, Copy> = {
  ru: {
    title: 'Plus закончился',
    value: 'Plus завершён. Прогресс сохранён. Актуальные условия доступны в предложении магазина.',
    cta: 'Продлить Plus',
    invite: 'Пригласить друга',
    ghost: 'Позже',
  },
  uk: {
    title: 'Plus закінчився',
    value: 'Plus завершено. Прогрес збережено. Актуальні умови доступні в пропозиції магазину.',
    cta: 'Продовжити Plus',
    invite: 'Запросити друга',
    ghost: 'Пізніше',
  },
  en: {
    title: 'Plus has ended',
    value: 'Plus has ended. Your progress is saved. Current terms are shown in the store offer.',
    cta: 'Renew Plus',
    invite: 'Invite a friend',
    ghost: 'Later',
  },
  es: {
    title: 'Plus terminó',
    value: 'Plus ha terminado. Tu progreso está guardado. Las condiciones actuales están en la oferta de la tienda.',
    cta: 'Renovar Plus',
    invite: 'Invitar a un amigo',
    ghost: 'Más tarde',
  },
  'pt-BR': {
    title: 'O Plus acabou',
    value: 'O Plus terminou. Seu progresso está salvo. As condições atuais estão na oferta da loja.',
    cta: 'Renovar Plus',
    invite: 'Convidar um amigo',
    ghost: 'Depois',
  },
  vi: {
    title: 'Plus đã hết hạn',
    value: 'Plus đã kết thúc. Tiến độ của bạn đã được lưu. Điều kiện hiện tại có trong ưu đãi trên cửa hàng.',
    cta: 'Gia hạn Plus',
    invite: 'Mời bạn bè',
    ghost: 'Để sau',
  },
  id: {
    title: 'Plus berakhir',
    value: 'Plus telah berakhir. Progresmu tersimpan. Ketentuan terkini ada di penawaran toko.',
    cta: 'Perpanjang Plus',
    invite: 'Undang teman',
    ghost: 'Nanti',
  },
  tr: {
    title: 'Plus bitti',
    value: 'Plus sona erdi. İlerlemen kayıtlı. Güncel koşullar mağaza teklifinde.',
    cta: 'Plus’ı yenile',
    invite: 'Arkadaşını davet et',
    ghost: 'Sonra',
  },
  pl: {
    title: 'Plus się skończył',
    value: 'Plus dobiegł końca. Twój postęp jest zapisany. Aktualne warunki są w ofercie sklepu.',
    cta: 'Przedłuż Plus',
    invite: 'Zaproś znajomego',
    ghost: 'Później',
  },
};

function EntitlementExpiredHost() {
  const { lang } = useLang();
  const { f, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const router = useRouter();
  // зачем (coins.html PAY-09; владелец 02.08, вариант А): вторая кнопка зовёт в приглашения — пока раздел включён.
  const rouletteOn = useReferralRouletteEnabled();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const [kind, setKind] = useState<Kind | null>(null);
  const [accountGeneration, setAccountGeneration] = useState(captureAccountGeneration);
  // зачем (координатор 12.10, settings-gap-008: holder=entitlementExpired закрыл экран и шаг робота не нашёл строку): dev_state?overlays=off гасит и это окно — только dev, в памяти
  const devOverlaysSnapshot = useSyncExternalStore(subscribeDevOverlays, getDevOverlaysSnapshot, getDevOverlaysSnapshot);
  const devOverlaysOff = devOverlaysSnapshot.startsWith('1');
  const overlayVisible = useOverlayVisible('entitlementExpired', kind != null && !devOverlaysOff);

  const maybeShow = useCallback(async (k: Kind, expectedAccount: AccountGenerationToken) => {
    if (!entitlementAccountIsCurrent(expectedAccount)) return;
    const stableId = expectedAccount.stableId;
    const wasActiveKey = accountEntitlementStorageKey(WAS_ACTIVE_KEY[k], stableId);
    const lastShownKey = accountEntitlementStorageKey(LAST_SHOWN_KEY[k], stableId);
    try {
      invalidatePremiumCache();
      const hasAnyPlusAccess = await getVerifiedPremiumAccessStatus().catch(noteSwallowedAs('EntitlementExpiredHost:promise_1', null));
      if (!entitlementAccountIsCurrent(expectedAccount) || hasAnyPlusAccess == null) return;
      if (hasAnyPlusAccess) {
        // A source can deactivate while another source still keeps Plus active
        // (for example: promo VIP active, real premium inactive on startup).
        await AsyncStorage.removeItem(wasActiveKey).catch(noteSwallowedHandler('EntitlementExpiredHost:promise_2'));
        return;
      }
      const wasActive = await AsyncStorage.getItem(wasActiveKey);
      if (!entitlementAccountIsCurrent(expectedAccount)) return;
      if (wasActive !== '1') return;
      await AsyncStorage.removeItem(wasActiveKey);
      if (!entitlementAccountIsCurrent(expectedAccount)) return;
      const lastShownRaw = await AsyncStorage.getItem(lastShownKey);
      if (!entitlementAccountIsCurrent(expectedAccount)) return;
      const lastShown = lastShownRaw ? Number(lastShownRaw) : 0;
      if (Number.isFinite(lastShown) && Date.now() - lastShown < SHOW_COOLDOWN_MS) return;
      // prev ?? k: premium-карточка приоритетнее, второй кандидат не перетирает первого.
      setKind((prev) => prev ?? k);
    } catch (e) {
      // Состояние недоступно — лучше промолчать, чем спамить ложной карточкой.
      DebugLogger.error('EntitlementExpiredHost:lastShown', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  }, []);

  useEffect(() => {
    const acceptAccount = (next: AccountGenerationToken) => {
      // Any visible decision belongs to the previous account. Close it before
      // adopting the next generation, including direct active A → active B swaps.
      setKind(null);
      // зачем (аудит скорости R1_PERF_FIRST_FRAME, координатор 12.10): captureAccountGeneration() каждый раз отдаёт новый объект —
      // на монтировании это был лишний рендер хоста и повторный прогон проверки истечения. Новый объект — только при смене полей
      // (как app/(tabs)/home.tsx); смена аккаунта по-прежнему принимается.
      setAccountGeneration((prev) => (
        prev.generation === next.generation && prev.stableId === next.stableId && prev.phase === next.phase ? prev : next
      ));
    };
    acceptAccount(captureAccountGeneration());
    const subscription = subscribeAccountGeneration(acceptAccount);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const markWasActive = (k: Kind) => {
      const token = captureAccountGeneration();
      if (!entitlementAccountIsCurrent(token)) return;
      const key = accountEntitlementStorageKey(WAS_ACTIVE_KEY[k], token.stableId);
      void AsyncStorage.setItem(key, '1').catch(noteSwallowedHandler('EntitlementExpiredHost:promise_3'));
    };
    const checkDeactivated = (k: Kind) => {
      const token = captureAccountGeneration();
      if (!entitlementAccountIsCurrent(token)) return;
      void maybeShow(k, token);
    };
    const subs = [
      onAppEvent('premium_activated', () => {
        markWasActive('premium');
      }),
      onAppEvent('vip_activated', () => {
        markWasActive('vip');
      }),
      onAppEvent('premium_deactivated', () => {
        checkDeactivated('premium');
      }),
      onAppEvent('vip_deactivated', () => {
        checkDeactivated('vip');
      }),
    ];
    return () => subs.forEach((s) => s.remove());
  }, [maybeShow]);

  /**
   * Детекция ЕСТЕСТВЕННОГО истечения: premium_guard при RC-expiry пишет
   * premium_active=false БЕЗ события (premium_guard.ts:158), а события
   * *_deactivated стреляют только из QA-панели/снапшотов. Поэтому диффаем
   * по хранилищу на каждом старте: статус активен → поддерживаем флаг
   * «был активен»; статус неактивен при стоящем флаге → показываем карточку.
   */
  useEffect(() => {
    if (accountGeneration.phase !== 'active' || !accountGeneration.stableId) return;
    let cancelled = false;
    const checkedAccount = accountGeneration;
    const stableId = accountGeneration.stableId;
    const isCurrent = () => !cancelled && entitlementAccountIsCurrent(checkedAccount);
    (async () => {
      try {
        const [isPrem, isVip] = await Promise.all([
          getVerifiedRealPremiumStatus(),
          getVerifiedVipStatus(),
        ]);
        if (!isCurrent()) return;
        if (isPrem) {
          await AsyncStorage.setItem(
            accountEntitlementStorageKey(WAS_ACTIVE_KEY.premium, stableId),
            '1',
          );
        } else {
          await maybeShow('premium', checkedAccount);
        }
        if (!isCurrent()) return;
        if (isVip) {
          await AsyncStorage.setItem(
            accountEntitlementStorageKey(WAS_ACTIVE_KEY.vip, stableId),
            '1',
          );
        } else if (!isPrem) {
          // VIP-карточку не дублируем поверх premium-кейса в одной сессии.
          await maybeShow('vip', checkedAccount);
        }
      } catch (e) {
      // Guard недоступен (ранний старт) — попробуем в следующей сессии.
      DebugLogger.error('EntitlementExpiredHost:isCurrent', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    })();
    return () => {
      cancelled = true;
    };
  }, [accountGeneration, maybeShow]);

  /** #3 немое место: предупреждение «триал кончается через 2 ч» (только тост, без модалки). */
  useEffect(() => {
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
    const WARN_SHOWN_KEY = 'entitlement_trial_ending_shown';
    (async () => {
      try {
        const rcExpiryRaw = await AsyncStorage.getItem('premium_rc_expiry_ms').catch(noteSwallowedAs('EntitlementExpiredHost:promise_4', null));
        const rcExpiry = rcExpiryRaw ? Number(rcExpiryRaw) : 0;
        if (!Number.isFinite(rcExpiry) || rcExpiry <= 0) return;
        const remaining = rcExpiry - Date.now();
        if (remaining <= 0 || remaining > TWO_HOURS_MS) return;
        const alreadyShown = await AsyncStorage.getItem(WARN_SHOWN_KEY).catch(noteSwallowedAs('EntitlementExpiredHost:promise_5', null));
        if (alreadyShown === '1') return;
        await AsyncStorage.setItem(WARN_SHOWN_KEY, '1').catch(noteSwallowedHandler('EntitlementExpiredHost:promise_6'));
        const msgRu = remaining < 30 * 60 * 1000
          ? 'Триал заканчивается менее чем через 30 мин ⏳'
          : 'Триал заканчивается менее чем через 2 ч ⏳';
        emitAppEvent('action_toast', {
          type: 'info',
          messageRu: msgRu,
          messageUk: msgRu,
          messageEs: remaining < 30 * 60 * 1000 ? 'El trial termina en menos de 30 min ⏳' : 'El trial termina en menos de 2 h ⏳',
        });
      } catch (e) {
      // ignore
      DebugLogger.error('EntitlementExpiredHost:msgRu', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    })();
  }, [lang]);

  const markShownAndClose = useCallback(() => {
    const token = captureAccountGeneration();
    if (kind && entitlementAccountIsCurrent(token)) {
      const key = accountEntitlementStorageKey(LAST_SHOWN_KEY[kind], token.stableId);
      void AsyncStorage.setItem(key, String(Date.now())).catch(noteSwallowedHandler('EntitlementExpiredHost:promise_7'));
    }
    setKind(null);
  }, [kind]);

  if (!kind || !overlayVisible || devOverlaysOff) return null;

  const tx = TEXTS[lang] ?? TEXTS.ru;

  return (
    <HybridSheetShell
      visible
      // зачем: тап по фону/свайп/«назад» = «Позже», не CTA (как было у карточки продления).
      onClose={markShownAndClose}
      closeLabel={tx.ghost}
      material="liquid-glass-opaque"
      glowColor={EXEMPT_COLOR_1}
      testID="entitlement-expired-sheet"
    >
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.content} decelerationRate="fast"
      >
        <View style={[styles.tile, { backgroundColor: glass.opaqueControl }]} accessible={false} importantForAccessibility="no-hide-descendants">
          <Ionicons name="lock-closed" size={26} color={glass.text} />
        </View>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: glass.text, fontSize: 24, lineHeight: 30 }]}
        >
          {tx.title}
        </Text>
        <Text style={[styles.value, { color: glass.secondary, fontSize: 16, lineHeight: 22 }]}>
          {tx.value}
        </Text>
        <TouchableOpacity
          testID="entitlement-expired-cta"
          accessibilityRole="button"
          accessibilityLabel={tx.cta}
          activeOpacity={0.88}
          style={[styles.cta, { backgroundColor: glass.accent }]}
          onPress={() => {
            const context = kind === 'premium' ? 'premium_expired' : 'vip_expired';
            navigateAfterModalClose(markShownAndClose, () => {
              router.push({
                pathname: '/premium_modal',
                params: { context, source: 'entitlement_expired' },
              } as never);
            });
          }}
        >
          <Text style={[styles.ctaText, { color: glass.accentInk, fontSize: 16 }]}>{tx.cta}</Text>
        </TouchableOpacity>
        {rouletteOn ? (
          <TouchableOpacity
            testID="entitlement-expired-invite"
            accessibilityRole="button"
            accessibilityLabel={tx.invite}
            activeOpacity={0.8}
            style={[styles.invite, { backgroundColor: glass.buttonFill }]}
            onPress={() => {
              navigateAfterModalClose(markShownAndClose, () => {
                router.push({ pathname: '/referrals' } as never);
              });
            }}
          >
            <Text style={[styles.ctaText, { color: glass.text, fontSize: 16 }]}>{tx.invite}</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          testID="entitlement-expired-ghost"
          accessibilityRole="button"
          accessibilityLabel={tx.ghost}
          activeOpacity={0.7}
          style={styles.ghost}
          onPress={markShownAndClose}
        >
          <Text style={[styles.ghostText, { color: glass.text, fontSize: 16 }]}>{tx.ghost}</Text>
        </TouchableOpacity>
      </ScrollView>
    </HybridSheetShell>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, flexShrink: 1 },
  content: { alignItems: 'center', paddingTop: 18, paddingBottom: 4 },
  // зачем (coins.html PAY-09): плитка 61/16, заголовок 24, текст 16 (D145), кнопки-пилюли 48/24;
  // «Пригласить друга» — капсула с тонким контуром, «Позже» — капсула без контура.
  tile: { width: 61, height: 61, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 16, fontWeight: '700', textAlign: 'center' },
  value: { marginTop: 7, textAlign: 'center' },
  cta: { alignSelf: 'stretch', marginTop: 22, minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  ctaText: { fontWeight: '700' },
  // `.cta.gh` на кадре — тёмная капсула; рамок в этом окне нет (сторож), поэтому тон заливкой.
  invite: { alignSelf: 'stretch', marginTop: 10, minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  ghost: { alignSelf: 'stretch', marginTop: 10, minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  ghostText: { fontWeight: '700' },
});

export default memo(EntitlementExpiredHost);
