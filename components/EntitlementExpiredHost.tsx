// Глобальная карточка «Premium/VIP закончился» — закрывает «немое место №1»
// (см. docs/reports/missing_feedback_designs_2026-06-11.html): подписка истекает,
// а приложение молчит до первого упора в пейвол.
//
// Слушает premium_deactivated / vip_deactivated. Показывает карточку ТОЛЬКО если
// подписка реально была активна (флаг ставится на *_activated): события деактивации
// эмитятся снапшотами PremiumContext и у юзеров, никогда не имевших подписки.
import React, { memo, useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
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
import RewardCardV2 from './reward_v2/RewardCardV2';
import { useReferralRouletteEnabled } from '../app/referral_roulette_flag';

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

type Copy = { kicker: string; title: string; value: string; cta: string; ghost: string };

const TEXTS: Record<string, Record<Kind, Copy>> = {
  ru: {
    premium: {
      kicker: 'Подписка завершилась',
      title: 'Plus закончился',
      value: 'Прогресс цел. Верни безлимит уроков и все темы.',
      cta: 'Продлить',
      ghost: 'Позже',
    },
    vip: {
      kicker: 'Plus-доступ завершился',
      title: 'Plus закончился',
      value: 'Пригласи друга: когда он оформит Plus или Pro, получишь ключ. Награда — Plus от 1 дня до 365 дней.',
      cta: 'Продлить Plus',
      ghost: 'Позже',
    },
  },
  uk: {
    premium: {
      kicker: 'Підписка завершилась',
      title: 'Plus закінчився',
      value: 'Прогрес цілий. Поверни безліміт уроків і всі теми.',
      cta: 'Продовжити',
      ghost: 'Пізніше',
    },
    vip: {
      kicker: 'Plus-доступ завершився',
      title: 'Plus закінчився',
      value: 'Запроси друга: коли він оформить Plus або Pro, отримаєш ключ. Нагорода — Plus від 1 до 365 днів.',
      cta: 'Продовжити Plus',
      ghost: 'Пізніше',
    },
  },
  es: {
    premium: {
      kicker: 'Suscripción finalizada',
      title: 'Plus terminó',
      value: 'Tu progreso está a salvo. Recupera lecciones ilimitadas y todos los temas.',
      cta: 'Renovar',
      ghost: 'Más tarde',
    },
    vip: {
      kicker: 'Acceso Plus finalizado',
      title: 'Plus terminó',
      value: 'Invita a un amigo: cuando compre Plus o Pro recibirás una llave. Recompensa: Plus de 1 a 365 días.',
      cta: 'Pasar a Plus',
      ghost: 'Más tarde',
    },
  },
  'pt-BR': {
    premium: {
      kicker: 'Assinatura encerrada',
      title: 'O Plus acabou',
      value: 'Seu progresso está salvo. Recupere aulas ilimitadas e todos os temas.',
      cta: 'Renovar',
      ghost: 'Depois',
    },
    vip: {
      kicker: 'Acesso Plus encerrado',
      title: 'O Plus acabou',
      value: 'Convide um amigo: quando ele assinar Plus ou Pro você recebe uma chave. Recompensa: Plus de 1 a 365 dias.',
      cta: 'Assinar Plus',
      ghost: 'Depois',
    },
  },
  vi: {
    premium: {
      kicker: 'Gói đã kết thúc',
      title: 'Plus đã hết hạn',
      value: 'Tiến độ vẫn an toàn. Lấy lại bài học không giới hạn và mọi chủ đề.',
      cta: 'Gia hạn',
      ghost: 'Để sau',
    },
    vip: {
      kicker: 'Plus đã kết thúc',
      title: 'Plus đã hết hạn',
      value: 'Mời một người bạn: khi họ mua Plus hoặc Pro, bạn nhận một chìa khóa. Phần thưởng: Plus từ 1 đến 365 ngày.',
      cta: 'Nâng cấp Plus',
      ghost: 'Để sau',
    },
  },
  id: {
    premium: {
      kicker: 'Langganan berakhir',
      title: 'Plus berakhir',
      value: 'Progresmu aman. Dapatkan kembali pelajaran tanpa batas dan semua tema.',
      cta: 'Perpanjang',
      ghost: 'Nanti',
    },
    vip: {
      kicker: 'Akses Plus berakhir',
      title: 'Plus berakhir',
      value: 'Undang teman: saat dia membeli Plus atau Pro kamu mendapat kunci. Hadiah: Plus 1–365 hari.',
      cta: 'Ambil Plus',
      ghost: 'Nanti',
    },
  },
  tr: {
    premium: {
      kicker: 'Abonelik sona erdi',
      title: 'Plus bitti',
      value: 'İlerlemen güvende. Sınırsız ders ve tüm temaları geri al.',
      cta: 'Yenile',
      ghost: 'Sonra',
    },
    vip: {
      kicker: 'Plus erişimi sona erdi',
      title: 'Plus bitti',
      value: 'Bir arkadaşını davet et: Plus veya Pro satın aldığında bir anahtar kazan. Ödül: 1–365 gün Plus.',
      cta: 'Plus’a geç',
      ghost: 'Sonra',
    },
  },
  pl: {
    premium: {
      kicker: 'Subskrypcja wygasła',
      title: 'Plus się skończyło',
      value: 'Twój postęp jest bezpieczny. Odzyskaj nielimitowane lekcje i wszystkie motywy.',
      cta: 'Przedłuż',
      ghost: 'Później',
    },
    vip: {
      kicker: 'Dostęp Plus wygasł',
      title: 'Plus się skończył',
      value: 'Zaproś znajomego: gdy kupi Plus lub Pro, dostaniesz klucz. Nagroda: Plus od 1 do 365 dni.',
      cta: 'Przejdź na Plus',
      ghost: 'Później',
    },
  },
};

function EntitlementExpiredHost() {
  const { lang } = useLang();
  const router = useRouter();
  const rouletteOn = useReferralRouletteEnabled();
  const [kind, setKind] = useState<Kind | null>(null);
  const overlayVisible = useOverlayVisible('entitlementExpired', kind != null);

  const maybeShow = useCallback(async (k: Kind) => {
    try {
      invalidatePremiumCache();
      const hasAnyPlusAccess = await getVerifiedPremiumAccessStatus().catch(() => false);
      if (hasAnyPlusAccess) {
        // A source can deactivate while another source still keeps Plus active
        // (for example: promo VIP active, real premium inactive on startup).
        await AsyncStorage.removeItem(WAS_ACTIVE_KEY[k]).catch(() => {});
        return;
      }
      const wasActive = await AsyncStorage.getItem(WAS_ACTIVE_KEY[k]);
      if (wasActive !== '1') return;
      await AsyncStorage.removeItem(WAS_ACTIVE_KEY[k]);
      const lastShownRaw = await AsyncStorage.getItem(LAST_SHOWN_KEY[k]);
      const lastShown = lastShownRaw ? Number(lastShownRaw) : 0;
      if (Number.isFinite(lastShown) && Date.now() - lastShown < SHOW_COOLDOWN_MS) return;
      // prev ?? k: premium-карточка приоритетнее, второй кандидат не перетирает первого.
      setKind((prev) => prev ?? k);
    } catch {
      // Состояние недоступно — лучше промолчать, чем спамить ложной карточкой.
    }
  }, []);

  useEffect(() => {
    const subs = [
      onAppEvent('premium_activated', () => {
        void AsyncStorage.setItem(WAS_ACTIVE_KEY.premium, '1').catch(() => {});
      }),
      onAppEvent('vip_activated', () => {
        void AsyncStorage.setItem(WAS_ACTIVE_KEY.vip, '1').catch(() => {});
      }),
      onAppEvent('premium_deactivated', () => {
        void maybeShow('premium');
      }),
      onAppEvent('vip_deactivated', () => {
        void maybeShow('vip');
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
    let cancelled = false;
    (async () => {
      try {
        const [isPrem, isVip] = await Promise.all([
          getVerifiedRealPremiumStatus(),
          getVerifiedVipStatus(),
        ]);
        if (cancelled) return;
        if (isPrem) {
          await AsyncStorage.setItem(WAS_ACTIVE_KEY.premium, '1');
        } else {
          await maybeShow('premium');
        }
        if (isVip) {
          await AsyncStorage.setItem(WAS_ACTIVE_KEY.vip, '1');
        } else if (!isPrem) {
          // VIP-карточку не дублируем поверх premium-кейса в одной сессии.
          await maybeShow('vip');
        }
      } catch {
        // Guard недоступен (ранний старт) — попробуем в следующей сессии.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [maybeShow]);

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
      } catch {
        /* ignore */
      }
    })();
  }, [lang]);

  const markShownAndClose = useCallback(() => {
    if (kind) void AsyncStorage.setItem(LAST_SHOWN_KEY[kind], String(Date.now())).catch(() => {});
    setKind(null);
  }, [kind]);

  if (!kind || !overlayVisible) return null;

  const langTexts = TEXTS[lang] ?? TEXTS.ru;
  const copyKind: Kind = kind === 'vip' && !rouletteOn ? 'premium' : kind;
  const tx = langTexts[copyKind];

  return (
    <RewardCardV2
      visible
      semantic={copyKind === 'premium' ? 'gold' : 'social'}
      kicker={tx.kicker}
      icon={copyKind === 'premium' ? '👑' : '🤝'}
      title={tx.title}
      value={tx.value}
      ctaLabel={tx.cta}
      onCta={() => {
        const context = copyKind === 'premium' ? 'premium_expired' : 'vip_expired';
        navigateAfterModalClose(markShownAndClose, () => {
          router.push({
            pathname: '/premium_modal',
            params: { context },
          } as never);
        });
      }}
      ghostLabel={tx.ghost}
      onGhost={markShownAndClose}
      /** Маркетинговая карточка: тап по фону = «Позже», не CTA. */
      backdropAction="ghost"
    />
  );
}

export default memo(EntitlementExpiredHost);
