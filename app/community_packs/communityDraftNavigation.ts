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
  } catch {
    if (isCurrent()) error();
  } finally {
    lock.current = false;
  }
}

export default function CommunityDraftNavigationModule() { return null; }
