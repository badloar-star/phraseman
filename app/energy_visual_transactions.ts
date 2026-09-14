export type EnergyVisualTransaction = Readonly<{
  operationId: string;
  from: number;
  to: number;
  reason: 'spend' | 'passive' | 'video' | 'gift' | 'refill' | 'refund' | 'expiry' | 'entitlement';
  source?: 'lesson' | 'training' | 'arena' | 'video' | 'gift' | 'pearls' | 'system';
}>;

type Listener = (event: EnergyVisualTransaction) => void;
const listeners = new Set<Listener>();
const delivered = new Set<string>();

export const energyVisualTransactions = {
  publish(event: EnergyVisualTransaction): void {
    if (!event.operationId || delivered.has(event.operationId) || event.from === event.to) return;
    delivered.add(event.operationId);
    if (delivered.size > 256) {
      const oldest = delivered.values().next().value as string | undefined;
      if (oldest) delivered.delete(oldest);
    }
    listeners.forEach((listener) => listener(event));
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  resetForTest(): void {
    delivered.clear();
    listeners.clear();
  },
};

/* expo-router route shim */
export default function __RouteShim() { return null; }
