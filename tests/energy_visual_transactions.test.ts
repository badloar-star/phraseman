import { energyVisualTransactions, type EnergyVisualTransaction } from '../app/energy_visual_transactions';

afterEach(() => energyVisualTransactions.resetForTest());

it('publishes each operation once', () => {
  const seen: EnergyVisualTransaction[] = [];
  const unsubscribe = energyVisualTransactions.subscribe((event) => seen.push(event));
  const event = { operationId: 'energy:lesson:attempt-1', from: 86, to: 66, reason: 'spend', source: 'lesson' } as const;
  energyVisualTransactions.publish(event);
  energyVisualTransactions.publish(event);
  unsubscribe();
  expect(seen).toEqual([event]);
});
