import {
  isAppMessageAllowedForAudience,
  isAppMessageAllowedForVersion,
  type AppMessagesSnapshot,
  type AppMessageWithState,
  type SettingsMessageSlot,
} from './app_messages';

export type SettingsCampaignVariant = 'treatment' | 'control';

export type SettingsCampaignAssignment = {
  campaignId: string;
  slot: SettingsMessageSlot;
  variant: SettingsCampaignVariant;
};

export type SettingsMessageSlotContext = {
  stableId: string;
  hasPremiumAccess: boolean;
  appVersion: string;
  controlSalt?: string;
};

export type SettingsMessageSlotSelection = {
  top: AppMessageWithState | null;
  bottom: AppMessageWithState | null;
  assignments: SettingsCampaignAssignment[];
  primaryAttribution: SettingsCampaignAssignment | null;
};

function hash32(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function newestForSlot(messages: AppMessageWithState[], slot: SettingsMessageSlot): AppMessageWithState | null {
  return messages
    .filter((message) => message.settingsSlot === slot)
    .sort((left, right) => (right.createdAtMs - left.createdAtMs) || right.id.localeCompare(left.id))[0] ?? null;
}

export function settingsCampaignVariant(
  campaignId: string,
  stableId: string,
  controlPercent: number,
  salt = 'settings-slots-v1',
): SettingsCampaignVariant {
  if (controlPercent <= 0) return 'treatment';
  const bucket = hash32(`${salt}:${campaignId}:${stableId}`) % 100;
  return bucket < controlPercent ? 'control' : 'treatment';
}

export function selectSettingsMessageSlots(
  snapshot: AppMessagesSnapshot | null,
  context: SettingsMessageSlotContext,
): SettingsMessageSlotSelection {
  if (!context.stableId) {
    return { top: null, bottom: null, assignments: [], primaryAttribution: null };
  }
  const eligible = (snapshot?.messages ?? []).filter((message) => (
    message.deliverySurface === 'settings'
    && message.settingsSlot !== null
    && message.active
    && isAppMessageAllowedForAudience(message, context.hasPremiumAccess)
    && isAppMessageAllowedForVersion(message, context.appVersion)
  ));
  const candidates = (['top', 'bottom'] as const)
    .map((slot) => newestForSlot(eligible, slot))
    .filter((message): message is AppMessageWithState => message !== null);
  const assignments = candidates.map((message): SettingsCampaignAssignment => ({
    campaignId: message.id,
    slot: message.settingsSlot!,
    variant: settingsCampaignVariant(
      message.id,
      context.stableId,
      message.controlPercent,
      context.controlSalt,
    ),
  }));
  const treatmentIds = new Set(assignments.filter((item) => item.variant === 'treatment').map((item) => item.campaignId));
  const top = candidates.find((item) => item.settingsSlot === 'top' && treatmentIds.has(item.id)) ?? null;
  const bottom = candidates.find((item) => item.settingsSlot === 'bottom' && treatmentIds.has(item.id)) ?? null;
  return {
    top,
    bottom,
    assignments,
    primaryAttribution: assignments.find((item) => item.slot === 'top') ?? assignments[0] ?? null,
  };
}

export default function __RouteShim() {
  return null;
}
