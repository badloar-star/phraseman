export function shouldRenderNoEnergyModal(
  visible: boolean,
  hasPremiumAccess: boolean,
  qaIgnorePremiumAccess = false,
): boolean {
  return visible && (!hasPremiumAccess || qaIgnorePremiumAccess);
}
