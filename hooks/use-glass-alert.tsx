// ════════════════════════════════════════════════════════════════════════════
// use-glass-alert.tsx — стеклянная замена нативному Alert.alert.
//
// зачем: макет overlays-runtime («Native alerts») требует стеклянные окна вместо системных
// серых UIAlertController/AlertDialog. Хук повторяет сигнатуру Alert.alert
// (title, message?, buttons?) — тексты, кнопки и обработчики переносятся 1:1, меняется только вид:
//   • 0–1 кнопка  → GlassAlertDialog по центру (overlays-runtime `.or-alert`, Сверка 05.10 — было шторкой снизу);
//   • 2 кнопки    → ThemedConfirmModal (отмена + действие; style:'destructive' → мягкий красный тон);
//   • 3+ кнопок   → ThemedChoiceModal со списком (style:'destructive' → тот же мягкий красный тон).
// Экземпляр рендерится самим экраном через `node` (не глобальная очередь), поэтому
// обработчики остаются в замыкании экрана — так же, как были у Alert.alert.
// ════════════════════════════════════════════════════════════════════════════
import React, { useCallback, useMemo, useRef, useState } from 'react';
import ThemedConfirmModal from '../components/ThemedConfirmModal';
import ThemedChoiceModal from '../components/ThemedChoiceModal';
import { GlassAlertDialog } from '../components/v2/GlassAlertDialog';
import { DebugLogger } from '../app/debug-logger';

export type GlassAlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

type Spec = {
  title: string;
  message: string;
  buttons: GlassAlertButton[];
};

/** delayMs — подождать, пока закроется предыдущий нативный <Modal> (iOS теряет present-over-dismiss). */
export type ShowGlassAlert = (title: string, message?: string, buttons?: GlassAlertButton[], opts?: { delayMs?: number }) => void;

function runButton(btn: GlassAlertButton | undefined, tag: string): void {
  if (!btn?.onPress) return;
  try {
    btn.onPress();
  } catch (error) {
    // зачем: обработчик кнопки не должен падать молча (правило «нет немых catch»)
    DebugLogger.error(`GlassAlert:${tag}`, error, 'warning');
  }
}

export function useGlassAlert(defaultOkLabel = 'OK'): { showGlassAlert: ShowGlassAlert; node: React.ReactElement } {
  const [spec, setSpec] = useState<Spec | null>(null);
  const [open, setOpen] = useState(false);
  // защита от двойного тапа: обработчик кнопки исполняется один раз на показ
  const settledRef = useRef(true);

  const showGlassAlert = useCallback<ShowGlassAlert>((title, message, buttons, opts) => {
    const list = buttons && buttons.length > 0 ? buttons : [{ text: defaultOkLabel }];
    const present = () => {
      settledRef.current = false;
      setSpec({ title, message: message ?? '', buttons: list });
      setOpen(true);
    };
    const delayMs = opts?.delayMs ?? 0;
    if (delayMs > 0) setTimeout(present, delayMs);
    else present();
  }, [defaultOkLabel]);

  const settle = useCallback((btn: GlassAlertButton | undefined, tag: string) => {
    if (settledRef.current) return;
    settledRef.current = true;
    setOpen(false);
    runButton(btn, tag);
  }, []);

  const node = useMemo(() => {
    const buttons = spec?.buttons ?? [];
    if (buttons.length === 2) {
      const cancelBtn = buttons.find((b) => b.style === 'cancel') ?? buttons[0];
      const confirmBtn = buttons.find((b) => b !== cancelBtn) ?? buttons[1];
      return (
        <ThemedConfirmModal
          visible={open}
          title={spec?.title ?? ''}
          message={spec?.message ? spec.message : undefined}
          cancelLabel={cancelBtn.text}
          confirmLabel={confirmBtn.text}
          destructive={confirmBtn.style === 'destructive'}
          onCancel={() => settle(cancelBtn, 'cancel')}
          onConfirm={() => settle(confirmBtn, 'confirm')}
        />
      );
    }
    if (buttons.length <= 1) {
      const only = buttons[0];
      return (
        <GlassAlertDialog
          visible={open && spec != null}
          title={spec?.title ?? ''}
          message={spec?.message ? spec.message : undefined}
          actions={only ? [{ label: only.text, destructive: only.style === 'destructive', onPress: () => settle(only, 'ok') }] : []}
          onRequestClose={() => settle(only?.style === 'cancel' ? only : undefined, 'dismiss')}
        />
      );
    }
    return (
      <ThemedChoiceModal
        visible={open && spec != null}
        title={spec?.title ?? ''}
        message={spec?.message ?? ''}
        choices={buttons.map((b, i) => ({
          label: b.text,
          // зачем: style:'destructive' теперь доходит и до списка (3+ кнопок) — раньше терялся.
          variant: b.style === 'cancel' ? 'secondary' as const : b.style === 'destructive' ? 'destructive' as const : 'primary' as const,
          onPress: () => settle(b, `choice_${i}`),
        }))}
        onRequestClose={() => {
          const cancelBtn = buttons.find((b) => b.style === 'cancel');
          settle(cancelBtn, 'dismiss');
        }}
      />
    );
  }, [open, settle, spec]);

  return { showGlassAlert, node };
}
