import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';

import { trackSoftUpsellEvent } from '../../../app/analytics';
import {
  createSoftUpsellAttribution,
  softUpsellEventId,
  softUpsellRouteParams,
  type SoftUpsellAttribution,
} from '../../../app/soft_upsell_attribution';
import SoftContextualUpsellCard from '../../SoftContextualUpsellCard';
import { qaToast } from '../qa_utils';
import { SOFT_UPSELL_ADMIN_PREVIEWS, type SoftUpsellAdminPreview } from '../soft_upsell_preview_catalog';
import { AccordionSection, AdminHint, ButtonRow } from '../ui';

interface Props { open: boolean; onToggle: (id: string) => void }
type SelectedPreview = Readonly<{ preview: SoftUpsellAdminPreview; attribution: SoftUpsellAttribution }>;

export default function SoftUpsellPreviewSection({ open, onToggle }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<SelectedPreview | null>(null);

  const openPreview = useCallback((preview: SoftUpsellAdminPreview) => {
    const attribution = createSoftUpsellAttribution({
      impressionId: Crypto.randomUUID(),
      trigger: preview.opportunity.trigger,
      context: preview.opportunity.context,
      mode: 'test',
    });
    setSelected({ preview, attribution });
    void trackSoftUpsellEvent('soft_upsell_eligible', {
      context: attribution.context,
      trigger: attribution.trigger,
      studyTarget: preview.opportunity.studyTarget,
      overlayOccupied: false,
      schemaVersion: 1,
      triggerValue: preview.opportunity.value,
      soft_upsell_impression_id: attribution.impressionId,
      soft_upsell_trigger: attribution.trigger,
      soft_upsell_context: attribution.context,
      soft_upsell_mode: attribution.mode,
      event_id: softUpsellEventId(attribution, 'eligible'),
    } as never);
  }, []);

  const impression = useCallback(() => {
    if (!selected) return;
    const { preview, attribution } = selected;
    return trackSoftUpsellEvent('soft_upsell_impression', {
      context: attribution.context, trigger: attribution.trigger,
      studyTarget: preview.opportunity.studyTarget, overlayOccupied: false,
      schemaVersion: 1, triggerValue: preview.opportunity.value, destination: 'paywall',
      soft_upsell_impression_id: attribution.impressionId,
      soft_upsell_trigger: attribution.trigger, soft_upsell_context: attribution.context,
      soft_upsell_mode: attribution.mode, event_id: softUpsellEventId(attribution, 'impression'),
    } as never);
  }, [selected]);

  const dismiss = useCallback(() => {
    if (!selected) return;
    const { preview, attribution } = selected;
    setSelected(null);
    void trackSoftUpsellEvent('soft_upsell_dismiss', {
      context: attribution.context, trigger: attribution.trigger,
      studyTarget: preview.opportunity.studyTarget, overlayOccupied: false,
      schemaVersion: 1, triggerValue: preview.opportunity.value,
      soft_upsell_impression_id: attribution.impressionId,
      soft_upsell_trigger: attribution.trigger, soft_upsell_context: attribution.context,
      soft_upsell_mode: attribution.mode, event_id: softUpsellEventId(attribution, 'dismiss'),
    } as never);
  }, [selected]);

  const openPaywall = useCallback(() => {
    if (!selected) return false;
    const { preview, attribution } = selected;
    setSelected(null);
    void trackSoftUpsellEvent('soft_upsell_cta', {
      context: attribution.context, trigger: attribution.trigger,
      studyTarget: preview.opportunity.studyTarget, overlayOccupied: false,
      schemaVersion: 1, triggerValue: preview.opportunity.value, destination: 'paywall',
      soft_upsell_impression_id: attribution.impressionId,
      soft_upsell_trigger: attribution.trigger, soft_upsell_context: attribution.context,
      soft_upsell_mode: attribution.mode, event_id: softUpsellEventId(attribution, 'cta'),
    } as never);
    router.push({
      pathname: '/premium_modal',
      params: { context: attribution.context, source: 'soft_upsell', ...softUpsellRouteParams(attribution) },
    } as never);
    qaToast('info', 'Открыта тестовая цепочка paywall');
    return true;
  }, [router, selected]);

  return (
    <>
      <AccordionSection
        id="soft_upsell_previews"
        icon="sparkles-outline"
        title="Мягкие пейволы — превью"
        badge={SOFT_UPSELL_ADMIN_PREVIEWS.length}
        open={open}
        onToggle={onToggle}
      >
        <AdminHint>Тестовая цепочка — не попадёт в Production funnel.</AdminHint>
        <AdminHint>События появятся в Test funnel только при включённом согласии на аналитику.</AdminHint>
        {SOFT_UPSELL_ADMIN_PREVIEWS.map((preview) => (
          <ButtonRow
            key={preview.id}
            testID={`admin-soft-upsell-preview-${preview.id}`}
            icon={preview.icon}
            label={preview.adminLabel}
            sub={preview.adminDescription}
            onPress={() => openPreview(preview)}
          />
        ))}
      </AccordionSection>

      {selected && (
        <SoftContextualUpsellCard
          visible
          proof={selected.preview.proof}
          title={selected.preview.title}
          body={selected.preview.body}
          ctaLabel={selected.preview.ctaLabel}
          dismissLabel="Не сейчас"
          dismissAccessibilityLabel="Закрыть тестовое предложение"
          dismissAccessibilityHint="Возвращает в настройки без открытия paywall"
          ctaAccessibilityLabel={selected.preview.ctaLabel}
          ctaAccessibilityHint="Открывает настоящий paywall в изолированном Test funnel"
          opportunity={selected.preview.opportunity}
          onImpression={impression}
          onDismiss={dismiss}
          onCta={openPaywall}
        />
      )}
    </>
  );
}
