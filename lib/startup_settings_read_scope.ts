/** Boot-only reuse of completed settings reads. No I/O, promises or auth imports. */
export interface SettingsBootReadScope {
  peek(): string | null;
  /** Call the returned function only after parsing/normalizing a successful read. */
  beginRead(): (raw: string) => void;
  close(): void;
}

let mutationRevision = 0;
let activeMutations = 0;

/** Must precede both local memory publication and dispatch of a settings write. */
export function beginSettingsStorageMutation(): () => void {
  mutationRevision += 1;
  activeMutations += 1;
  let finished = false;
  return () => {
    if (finished) return;
    finished = true;
    activeMutations -= 1;
    mutationRevision += 1;
  };
}

export function createSettingsBootReadScope(
  isAccountCurrent: () => boolean,
): SettingsBootReadScope {
  let closed = false;
  let ready: { raw: string; revision: number } | null = null;
  const canReuse = (): boolean => !closed && activeMutations === 0 && isAccountCurrent();

  return {
    peek(): string | null {
      if (!canReuse() || ready?.revision !== mutationRevision) {
        ready = null;
        return null;
      }
      return ready.raw;
    },
    beginRead(): (raw: string) => void {
      const revision = mutationRevision;
      const eligible = canReuse();
      return (raw) => {
        if (eligible && canReuse() && revision === mutationRevision) {
          ready = { raw, revision };
        }
      };
    },
    close(): void {
      closed = true;
      ready = null;
    },
  };
}
