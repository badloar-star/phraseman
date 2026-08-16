import React from 'react';
import ThemedConfirmModal from '../ThemedConfirmModal';

export function CustomizationPurchaseConfirmModal({
  visible, title, message, cancelLabel, confirmLabel, onCancel, onConfirm, motionVariant,
}: {
  visible: boolean; title: string; message: string; cancelLabel: string; confirmLabel: string; onCancel: () => void; onConfirm: () => void;
  /** dev-only: витрина движения запускает гибрид «Световод» рядом с боевым видом. Default 'classic'. */
  motionVariant?: 'classic' | 'hybrid';
}) {
  return (
    <ThemedConfirmModal
      visible={visible}
      title={title}
      message={message}
      cancelLabel={cancelLabel}
      confirmLabel={confirmLabel}
      onCancel={onCancel}
      onConfirm={onConfirm}
      confirmVariant="accent"
      testIDPrefix="customization-purchase"
      motionVariant={motionVariant}
    />
  );
}
