// ════════════════════════════════════════════════════════════════════════════
// packHideWithUndo.ts — «Скрыть набор» с отменой (решение владельца 13.10, требование Apple 1.2 для пользовательского контента).
//
// зачем: набор пропадает из ленты СРАЗУ (локальное состояние), запись «скрыт на устройстве» идёт фоном; тост «Набор скрыт» несёт «Отменить»
// (около 5 с — длительность тоста с действием, ActionToast); отмена снимает скрытие и возвращает набор. Сбой записи — набор возвращается и
// тост об ошибке. Другие списки (хаб каталога) узнают из события community_pack_hidden_changed — без повторного чтения на каждом экране.
// Журнал [PACK-HIDE]: вход, каждый выход, запись, отмена, сбои.
// ════════════════════════════════════════════════════════════════════════════
import { actionToastTri, emitAppEvent } from '../events';
import { DebugLogger } from '../debug-logger';
import type { Lang } from '../../constants/i18n';
import type { RuntimeStudyTarget } from '../target_storage_keys';
import { hideCommunityPackOnDevice, unhideCommunityPackOnDevice } from './communityPackHiddenStorage';
import { packHideFailureToast } from './packQuickAdd';

const LOG = '[PACK-HIDE]';

const hiddenToast = (onUndo: () => void) => ({
  ...actionToastTri('info', {
    ru: 'Набор скрыт', uk: 'Набір приховано', en: 'Pack hidden', es: 'Pack oculto', 'pt-BR': 'Pacote oculto',
    vi: 'Đã ẩn bộ thẻ', id: 'Paket disembunyikan', tr: 'Paket gizlendi', pl: 'Zestaw ukryty',
  }),
  action: {
    labelRu: 'Отменить', labelUk: 'Скасувати', labelEn: 'Undo', labelEs: 'Deshacer', labelPtBr: 'Desfazer',
    labelVi: 'Hoàn tác', labelId: 'Urungkan', labelTr: 'Geri al', labelPl: 'Cofnij',
    onPress: onUndo,
  },
});

export type HidePackWithUndoInput = Readonly<{
  packId: string;
  studyTarget?: RuntimeStudyTarget;
  lang: Lang;
  /** Набор убран из видимого списка сразу (родитель закрывает экран набора / убирает плитку). */
  onHiddenOptimistic: () => void;
  /** Скрытие не записалось или отменено — набор вернулся в список. */
  onRestored: () => void;
}>;

const inFlight = new Set<string>();

export async function hidePackWithUndo(input: HidePackWithUndoInput): Promise<'hidden' | 'failed' | 'skipped'> {
  const { packId, studyTarget, lang, onHiddenOptimistic, onRestored } = input;
  if (inFlight.has(packId)) {
    DebugLogger.warn(LOG, `уже скрывается — повторный тап пропущен pack=${packId}`);
    return 'skipped';
  }
  inFlight.add(packId);
  const startedAt = Date.now();
  DebugLogger.info(LOG, `вход: pack=${packId} target=${String(studyTarget)} lang=${lang}`);
  // Optimistic UI: набор пропадает до записи на устройство.
  emitAppEvent('community_pack_hidden_changed', { packId, hidden: true });
  onHiddenOptimistic();
  try {
    await hideCommunityPackOnDevice(packId, studyTarget);
    DebugLogger.info(LOG, `записано на устройство pack=${packId} за ${Date.now() - startedAt} мс`);
    // зачем: каталог мог открыться раньше записи (replace-навигация) и прочитать старый список — повтор события после записи догоняет его
    emitAppEvent('community_pack_hidden_changed', { packId, hidden: true });
  } catch (error: unknown) {
    DebugLogger.warn(LOG, `запись не удалась pack=${packId}: ${error instanceof Error ? error.message : String(error)} — набор возвращается`);
    emitAppEvent('community_pack_hidden_changed', { packId, hidden: false });
    onRestored();
    emitAppEvent('action_toast', packHideFailureToast());
    inFlight.delete(packId);
    return 'failed';
  }
  inFlight.delete(packId);
  const undo = () => {
    DebugLogger.info(LOG, `отмена нажата pack=${packId}`);
    emitAppEvent('community_pack_hidden_changed', { packId, hidden: false });
    onRestored();
    // guard-ok: запись ждётся цепочкой then/catch ниже; при сбое набор снова скрыт и человек видит тост
    void unhideCommunityPackOnDevice(packId, studyTarget)
      .then(() => DebugLogger.info(LOG, `скрытие снято pack=${packId}`))
      .catch((error: unknown) => {
        DebugLogger.warn(LOG, `снять скрытие не удалось pack=${packId}: ${error instanceof Error ? error.message : String(error)} — набор снова скрыт`);
        emitAppEvent('community_pack_hidden_changed', { packId, hidden: true });
        emitAppEvent('action_toast', packHideFailureToast());
      });
  };
  emitAppEvent('action_toast', hiddenToast(undo));
  DebugLogger.info(LOG, `тост «Набор скрыт» с «Отменить» показан pack=${packId}`);
  return 'hidden';
}
