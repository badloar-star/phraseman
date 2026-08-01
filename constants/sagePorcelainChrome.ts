export const SAGE_PORCELAIN_CHROME = {
  accentHover: '#294E43',
  accentPressed: '#223F37',
  focusRing: '#8FC0AA',
  info: '#2E5366',
  infoBg: '#DDEBF0',
  disabledBg: '#D1D9D1',
  disabledText: '#61706A',
} as const;
export function sagePorcelainShadow(level: 1 | 2 | 3) {
  return {
    shadowColor: '#23322B',
    shadowOffset: { width: 0, height: level === 1 ? 2 : level === 2 ? 4 : 8 },
    shadowOpacity: level === 1 ? 0.06 : level === 2 ? 0.10 : 0.14,
    shadowRadius: level === 1 ? 6 : level === 2 ? 12 : 20,
    elevation: level === 1 ? 2 : level === 2 ? 4 : 7,
  };
}
