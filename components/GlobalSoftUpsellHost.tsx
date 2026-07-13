import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';

import { accountScopeKey } from '../app/account_scope_key';
import { captureAccountGeneration, isCurrentAccountGeneration, subscribeAccountGeneration } from '../app/account_generation';
import { selectSoftUpsellCopy } from '../app/soft_upsell_copy';
import { softUpsellRouteParams } from '../app/soft_upsell_attribution';
import {
  subscribeSoftUpsellTriggers,
  type SoftUpsellTriggerEnvelope,
} from '../app/soft_upsell_trigger_adapters';
import { useSoftUpsellOpportunity } from '../hooks/use_soft_upsell_opportunity';
import { useLang } from './LangContext';
import { usePremium } from './PremiumContext';
import { useStudyTarget } from './StudyTargetContext';
import SoftContextualUpsellCard from './SoftContextualUpsellCard';
import { triLang, type Lang } from '../constants/i18n';

export default function GlobalSoftUpsellHost() {
  const router = useRouter();
  const { lang } = useLang();
  const { hasPremiumAccess } = usePremium();
  const { studyTarget } = useStudyTarget();
  const [envelope, setEnvelope] = useState<SoftUpsellTriggerEnvelope | null>(null);
  const [accountToken, setAccountToken] = useState(() => captureAccountGeneration());

  useEffect(() => subscribeSoftUpsellTriggers((next) => {
    if (isCurrentAccountGeneration(next.accountToken)) setEnvelope(next);
  }), []);
  useEffect(() => {
    const subscription = subscribeAccountGeneration((next) => {
      setAccountToken(next);
      setEnvelope(null);
    });
    return () => subscription.remove();
  }, []);

  const accountScope = accountScopeKey(accountToken) ?? `inactive:${accountToken.generation}`;
  const candidates = useMemo(() => envelope ? [envelope.candidate] : [], [envelope]);
  const flow = useSoftUpsellOpportunity({
    candidates,
    accountScope,
    studyTarget,
    hasPremiumAccess,
  });
  const copy = flow.opportunity
    ? selectSoftUpsellCopy({ opportunity: flow.opportunity, locale: lang })
    : null;

  if (!flow.opportunity || !flow.attribution || !copy) return null;
  const dismissLabel = triLang(lang as Lang, {
    ru: 'Не сейчас', uk: 'Не зараз', es: 'Ahora no', 'pt-BR': 'Agora não',
    vi: 'Không phải bây giờ', id: 'Nanti saja', tr: 'Şimdi değil', pl: 'Nie teraz',
  });
  return (
    <SoftContextualUpsellCard
      visible
      proof={copy.proof}
      title={copy.title}
      body={copy.body}
      ctaLabel={copy.ctaLabel}
      dismissLabel={dismissLabel}
      dismissAccessibilityLabel={dismissLabel}
      dismissAccessibilityHint={dismissLabel}
      ctaAccessibilityLabel={copy.ctaLabel}
      ctaAccessibilityHint="Открыть варианты Premium"
      opportunity={flow.opportunity}
      onImpression={() => { void flow.onImpression(); }}
      onDismiss={() => { void flow.onDismiss().finally(() => setEnvelope(null)); }}
      onCta={() => {
        const attribution = flow.attribution;
        return flow.onCta().then((accepted) => {
          if (!accepted || !attribution) return accepted;
          setEnvelope(null);
          try {
            router.push({
              pathname: '/premium_modal',
              params: { source: 'soft_upsell', context: attribution.context, ...softUpsellRouteParams(attribution) },
            } as never);
          } catch {
            void flow.onNavigationFailure();
          }
          return accepted;
        });
      }}
    />
  );
}
