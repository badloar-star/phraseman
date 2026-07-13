import React from 'react';
import ThemedConfirmModal from '../ThemedConfirmModal';

export function CustomizationPurchaseConfirmModal({
  visible, title, message, cancelLabel, confirmLabel, onCancel, onConfirm,
}: {
  visible: boolean; title: string; message: string; cancelLabel: string; confirmLabel: string; onCancel: () => void; onConfirm: () => void;
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
    />
  );
}
