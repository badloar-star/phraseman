let devAllCustomizationAccessOwner: string | null = null;

export function setDevAllCustomizationAccessActive(
  active: boolean,
  ownerStableId?: string | null,
): void {
  const owner = ownerStableId?.trim() || null;
  devAllCustomizationAccessOwner = typeof __DEV__ !== 'undefined' && __DEV__ && active
    ? owner
    : null;
}

export function isDevAllCustomizationAccessActive(ownerStableId?: string | null): boolean {
  const owner = ownerStableId?.trim() || null;
  return typeof __DEV__ !== 'undefined'
    && __DEV__
    && owner !== null
    && owner === devAllCustomizationAccessOwner;
}
