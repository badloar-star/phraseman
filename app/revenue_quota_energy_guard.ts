export type ChargedOperationGuard = Readonly<{
  charge: (operationId: string) => void;
  take: () => string | null;
}>;

export function createChargedOperationGuard(): ChargedOperationGuard {
  let operationId: string | null = null;
  return Object.freeze({
    charge(nextOperationId: string) {
      const normalized = nextOperationId.trim();
      if (!normalized) throw new Error('charged_operation_id_required');
      if (operationId && operationId !== normalized) throw new Error('charged_operation_already_set');
      operationId = normalized;
    },
    take() {
      const current = operationId;
      operationId = null;
      return current;
    },
  });
}

export default function __RouteShim() {
  return null;
}
