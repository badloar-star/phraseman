export type CustomizationDevPreview = Readonly<{
  avatarValue: string;
  storedAuraSelection: string | null;
}>;

export type CustomizationDevSandbox =
  | Readonly<{ active: false }>
  | Readonly<{
      active: true;
      ownerStableId: string;
      baseline: CustomizationDevPreview;
      preview: CustomizationDevPreview;
    }>;

export type CustomizationDevSandboxResult = Readonly<{
  sandbox: CustomizationDevSandbox;
  preview: CustomizationDevPreview;
}>;

const DISABLED: CustomizationDevSandbox = Object.freeze({ active: false });

function exactPreview(preview: CustomizationDevPreview): CustomizationDevPreview {
  return Object.freeze({
    avatarValue: preview.avatarValue,
    storedAuraSelection: preview.storedAuraSelection,
  });
}

function exactOwner(ownerStableId: string): string {
  const owner = ownerStableId.trim();
  if (!owner) throw new Error('customization_dev_sandbox_account_mismatch');
  return owner;
}

export function createCustomizationDevSandbox(): CustomizationDevSandbox {
  return DISABLED;
}

export function toggleCustomizationDevSandbox(
  sandbox: CustomizationDevSandbox,
  ownerStableId: string,
  currentPreview: CustomizationDevPreview,
): CustomizationDevSandboxResult {
  const owner = exactOwner(ownerStableId);
  if (sandbox.active) {
    if (sandbox.ownerStableId !== owner) {
      throw new Error('customization_dev_sandbox_account_mismatch');
    }
    return Object.freeze({ sandbox: DISABLED, preview: sandbox.baseline });
  }
  const baseline = exactPreview(currentPreview);
  const enabled: CustomizationDevSandbox = Object.freeze({
    active: true,
    ownerStableId: owner,
    baseline,
    preview: baseline,
  });
  return Object.freeze({ sandbox: enabled, preview: baseline });
}

export function previewInCustomizationDevSandbox(
  sandbox: CustomizationDevSandbox,
  ownerStableId: string,
  nextPreview: CustomizationDevPreview,
): CustomizationDevSandboxResult {
  const owner = exactOwner(ownerStableId);
  if (!sandbox.active || sandbox.ownerStableId !== owner) {
    throw new Error('customization_dev_sandbox_account_mismatch');
  }
  const preview = exactPreview(nextPreview);
  return Object.freeze({
    sandbox: Object.freeze({ ...sandbox, preview }),
    preview,
  });
}

export function clearCustomizationDevSandbox(
  sandbox: CustomizationDevSandbox,
): CustomizationDevSandboxResult | null {
  if (!sandbox.active) return null;
  return Object.freeze({ sandbox: DISABLED, preview: sandbox.baseline });
}
