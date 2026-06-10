// Утилиты QA-панели (dev-only). Тост одной строкой для подтверждений превью.
import { actionToastTri, emitAppEvent } from '../../app/events';

export function qaToast(kind: 'success' | 'error' | 'info', text: string): void {
  emitAppEvent(
    'action_toast',
    actionToastTri(kind, {
      ru: text,
      uk: text,
      es: text,
      'pt-BR': text,
      vi: text,
      id: text,
      tr: text,
      pl: text,
    }),
  );
}
