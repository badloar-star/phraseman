import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import SoftContextualUpsellCard from '../../SoftContextualUpsellCard';
import { qaToast } from '../qa_utils';
import {
  SOFT_UPSELL_ADMIN_PREVIEWS,
  type SoftUpsellAdminPreview,
} from '../soft_upsell_preview_catalog';
import {
  AccordionSection,
  AdminHint,
  ADMIN_BORDER_MUTED,
  ADMIN_SURFACE,
  ADMIN_TEXT,
  ButtonRow,
} from '../ui';

interface Props {
  open: boolean;
  onToggle: (id: string) => void;
}

export default function SoftUpsellPreviewSection({ open, onToggle }: Props) {
  const [selected, setSelected] = useState<SoftUpsellAdminPreview | null>(null);

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
        <AdminHint>
          Локальное превью. Ничего не публикует и не меняет у пользователей.
        </AdminHint>
        {SOFT_UPSELL_ADMIN_PREVIEWS.map((preview) => (
          <ButtonRow
            key={preview.id}
            testID={`admin-soft-upsell-preview-${preview.id}`}
            icon={preview.icon}
            label={preview.adminLabel}
            sub={preview.adminDescription}
            onPress={() => setSelected(preview)}
          />
        ))}
      </AccordionSection>

      <Modal
        visible={selected != null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.72)',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <View
            accessibilityViewIsModal
            accessibilityLabel="Локальное QA-превью мягкого пейвола"
            style={{
              width: '100%',
              maxWidth: 560,
              maxHeight: '90%',
              alignSelf: 'center',
              backgroundColor: ADMIN_SURFACE,
              borderColor: ADMIN_BORDER_MUTED,
              borderWidth: 1,
              borderRadius: 14,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                minHeight: 52,
                flexDirection: 'row',
                alignItems: 'center',
                paddingLeft: 16,
                borderBottomColor: ADMIN_BORDER_MUTED,
                borderBottomWidth: 1,
              }}
            >
              <Text style={{ color: ADMIN_TEXT, fontSize: 16, fontWeight: '700', flex: 1 }}>
                Локальное QA-превью
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Закрыть локальное превью"
                accessibilityHint="Возвращает в раздел мягких пейволов"
                onPress={() => setSelected(null)}
                style={{ width: 52, minHeight: 52, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="close" size={24} color={ADMIN_TEXT} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {selected && (
                <SoftContextualUpsellCard
                  title={selected.title}
                  body={selected.body}
                  ctaLabel={selected.ctaLabel}
                  dismissLabel="Не сейчас"
                  dismissAccessibilityLabel="Закрыть предложение"
                  dismissAccessibilityHint="Закрывает только локальное QA-превью"
                  ctaAccessibilityLabel={selected.ctaLabel}
                  ctaAccessibilityHint="Показывает результат локальной проверки без навигации"
                  opportunity={selected.opportunity}
                  onImpression={() => undefined}
                  onDismiss={() => setSelected(null)}
                  onCta={() => qaToast('info', `QA: ${selected.ctaLabel}`)}
                />
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
