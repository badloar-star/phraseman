import type { ArenaTelemetryDescriptor } from '../modules/arena/telemetry';

export function trackArenaTelemetry(descriptor: ArenaTelemetryDescriptor): void {
  void import('./analytics').then(({ trackEvent }) => trackEvent(descriptor.event, descriptor.params)).catch(() => {});
}
