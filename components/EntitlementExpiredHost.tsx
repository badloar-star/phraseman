// Глобальная карточка «Premium/VIP закончился» — закрывает «немое место №1»
// (см. docs/reports/missing_feedback_designs_2026-06-11.html): подписка истекает,
// а приложение молчит до первого упора в пейвол.
//
// Слушает premium_deactivated / vip_deactivated. Показывает карточку ТОЛЬКО если
// подписка реально была активна (флаг ставится на *_activated): события деактивации
// эмитятся снапшотами PremiumContext и у юзеров, никогда не имевших подписки.
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname, useRouter } from 'expo-router';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
  type AccountGenerationToken,
} from '../app/account_generation';
import { emitAppEvent, onAppEvent } from '../app/events';
import { isTournamentInterruptionProtectedPath } from '../app/tournament_interruption_guard';
import {
  getVerifiedPremiumAccessStatus,
  getVerifiedRealPremiumStatus,
  getVerifiedVipStatus,
  invalidatePremiumCache,
} from '../app/premium_guard';
import { navigateAfterModalClose } from '../app/safe_modal_navigation';
import { useReferralRouletteEnabled } from '../app/referral_roulette_flag';
import { useLang } from './LangContext';
import { useOverlayVisible } from './OverlayArbiter';
import RewardCardV2 from './reward_v2/RewardCardV2';
import { DebugLogger } from '../app/debug-logger';

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

type Copy = { kicker: string; title: string; value: string; cta: string; invite: string; ghost: string };

const TEXTS: Record<string, Copy> = {
  ru: {
    kicker: 'Plus-доступ завершился',
    title: 'Plus закончился',
    value: 'Прогресс цел. Верни безлимит уроков и все темы.',
    cta: 'Продлить Plus',
    invite: 'Пригласить друга',
    ghost: 'Позже',
  },
  uk: {
    kicker: 'Plus-доступ завершився',
    title: 'Plus закінчився',
    value: 'Прогрес цілий. Поверни безліміт уроків і всі теми.',
    cta: 'Продовжити Plus',
    invite: 'Запросити друга',
    ghost: 'Пізніше',
  },
  es: {
    kicker: 'Acceso Plus finalizado',
    title: 'Plus terminó',
    value: 'Tu progreso está a salvo. Recupera lecciones ilimitadas y todos los temas.',
    cta: 'Renovar Plus',
    invite: 'Invitar a un amigo',
    ghost: 'Más tarde',
  },
  'pt-BR': {
    kicker: 'Acesso Plus encerrado',
    title: 'O Plus acabou',
    value: 'Seu progresso está salvo. Recupere aulas ilimitadas e todos os temas.',
    cta: 'Renovar Plus',
    invite: 'Convidar um amigo',
    ghost: 'Depois',
  },
  vi: {
    kicker: 'Plus đã kết thúc',
    title: 'Plus đã hết hạn',
    value: 'Tiến độ vẫn an toàn. Lấy lại bài học không giới hạn và mọi chủ đề.',
    cta: 'Gia hạn Plus',
    invite: 'Mời bạn bè',
    ghost: 'Để sau',
  },
  id: {
    kicker: 'Akses Plus berakhir',
    title: 'Plus berakhir',
    value: 'Progresmu aman. Dapatkan kembali pelajaran tanpa batas dan semua tema.',
    cta: 'Perpanjang Plus',
    invite: 'Undang teman',
    ghost: 'Nanti',
  },
  tr: {
    kicker: 'Plus erişimi sona erdi',
    title: 'Plus bitti',
    value: 'İlerlemen güvende. Sınırsız ders ve tüm temaları geri al.',
    cta: 'Plus’ı yenile',
    invite: 'Arkadaşını davet et',
    ghost: 'Sonra',
  },
  pl: {
    kicker: 'Dostęp Plus wygasł',
    title: 'Plus się skończył',
    value: 'Twój postęp jest bezpieczny. Odzyskaj nielimitowane lekcje i wszystkie motywy.',
    cta: 'Przedłuż Plus',
    invite: 'Zaproś znajomego',
    ghost: 'Później',
  },
};

function EntitlementExpiredHost() {
  const { lang } = useLang();
  const router = useRouter();
  const pathname = usePathname();
  const rouletteOn = useReferralRouletteEnabled();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const tournamentInterruptionProtected = isTournamentInterruptionProtectedPath(pathname);
  const [kind, setKind] = useState<Kind | null>(null);
  const [accountGeneration, setAccountGeneration] = useState(captureAccountGeneration);
  const overlayVisible = useOverlayVisible(
    'entitlementExpired',
    kind != null && !tournamentInterruptionProtected,
  );

  const maybeShow = useCallback(async (k: Kind, expectedAccount: AccountGenerationToken) => {
    if (!entitlementAccountIsCurrent(expectedAccount)) return;
    const stableId = expectedAccount.stableId;
    const wasActiveKey = accountEntitlementStorageKey(WAS_ACTIVE_KEY[k], stableId);
    const lastShownKey = accountEntitlementStorageKey(LAST_SHOWN_KEY[k], stableId);
    try {
      invalidatePremiumCache();
      const hasAnyPlusAccess = await getVerifiedPremiumAccessStatus().catch(() => null);
      if (!entitlementAccountIsCurrent(expectedAccount) || hasAnyPlusAccess == null) return;
      if (hasAnyPlusAccess) {
        // A source can deactivate while another source still keeps Plus active
        // (for example: promo VIP active, real premium inactive on startup).
        await AsyncStorage.removeItem(wasActiveKey).catch(() => {});
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
      setAccountGeneration(next);
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
      void AsyncStorage.setItem(key, '1').catch(() => {});
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
        const rcExpiryRaw = await AsyncStorage.getItem('premium_rc_expiry_ms').catch(() => null);
        const rcExpiry = rcExpiryRaw ? Number(rcExpiryRaw) : 0;
        if (!Number.isFinite(rcExpiry) || rcExpiry <= 0) return;
        const remaining = rcExpiry - Date.now();
        if (remaining <= 0 || remaining > TWO_HOURS_MS) return;
        const alreadyShown = await AsyncStorage.getItem(WARN_SHOWN_KEY).catch(() => null);
        if (alreadyShown === '1') return;
        await AsyncStorage.setItem(WARN_SHOWN_KEY, '1').catch(() => {});
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
      void AsyncStorage.setItem(key, String(Date.now())).catch(() => {});
    }
    setKind(null);
  }, [kind]);

  if (!kind || !overlayVisible) return null;

  const tx = TEXTS[lang] ?? TEXTS.ru;
  const normalizedKind = kind === 'vip' && !rouletteOn ? 'premium' : kind;

  return (
    <RewardCardV2
      visible
      semantic="gold"
      kicker={tx.kicker}
      allowKickerWrap
      icon={'👑'}
      title={tx.title}
      value={tx.value}
      ctaLabel={tx.cta}
      onCta={() => {
        if (isTournamentInterruptionProtectedPath(pathnameRef.current)) return;
        const context = normalizedKind === 'premium' ? 'premium_expired' : 'vip_expired';
        navigateAfterModalClose(markShownAndClose, () => {
          if (isTournamentInterruptionProtectedPath(pathnameRef.current)) return;
          router.push({
            pathname: '/premium_modal',
            params: { context },
          } as never);
        });
      }}
      /** зачем: владелец (2026-08-02, вариант А) — второй путь с карточки: позвать
          друга (/referrals). Друг оформит Plus/Pro → пригласившему придёт «Награда
          за друга». Продление остаётся главным CTA, реферал — tonal-кнопкой ниже. */
      secondaryLabel={rouletteOn ? tx.invite : undefined}
      onSecondary={rouletteOn ? () => {
        if (isTournamentInterruptionProtectedPath(pathnameRef.current)) return;
        navigateAfterModalClose(markShownAndClose, () => {
          if (isTournamentInterruptionProtectedPath(pathnameRef.current)) return;
          router.push({ pathname: '/referrals' } as never);
        });
      } : undefined}
      ghostLabel={tx.ghost}
      onGhost={markShownAndClose}
      /** Карточка продления: тап по фону = «Позже», не CTA. */
      backdropAction="ghost"
    />
  );
}

export default memo(EntitlementExpiredHost);
