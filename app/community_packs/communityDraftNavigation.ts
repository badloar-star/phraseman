/** A failed or stale save must not dismiss the editor that still holds the draft. */
export async function leaveAfterCommunityDraftSave({ lock, save, leave, error, isCurrent }: Readonly<{
  lock: { current: boolean };
  save: () => Promise<void>;
  leave: () => void;
  error: () => void;
  isCurrent: () => boolean;
}>): Promise<void> {
  if (lock.current) return;
  lock.current = true;
  try {
    await save();
    if (isCurrent()) leave();
    else console.warn('[COMMUNITY-DRAFT] leave_skipped_stale_editor'); // зачем: сохранение прошло, но редактор уже не тот — выход не нужен; причина видна в журнале
  } catch (cause) {
    // зачем (Ревизор 29.10, запрет владельца на немой catch): ошибка сохранения не должна пропадать, даже когда редактор уже закрыт и показывать её некому
    const current = isCurrent();
    console.warn('[COMMUNITY-DRAFT] leave_save_failed', JSON.stringify({ editorStillCurrent: current, reason: cause instanceof Error ? cause.message : String(cause) }));
    if (current) error();
  } finally {
    lock.current = false;
  }
}

export default function CommunityDraftNavigationModule() { return null; }
