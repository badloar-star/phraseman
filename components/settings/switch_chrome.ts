// зачем (Сверка 11.10, светлая «Максимум» / «Акцент»): дорожка выключенного переключателя (opaqueControl) почти сливалась с карточкой
// (контраст 1.1–1.3:1), а кромка glassEdge в светлой — 12 % чёрного, то есть тоже невидима. В светлой кромка дорожки берётся из
// secondary (6.6:1) с прозрачностью 65 % — около 3:1 к карточке, как требует контраст границы элемента управления; в тёмной —
// прежняя glassEdge (кит .switch: border 1 px var(--line-2)). Ручка и включённая дорожка не менялись.
export function switchTrackBorder(glass: Readonly<{ isLight?: boolean; glassEdge: string; secondary: string }>): string {
  return glass.isLight ? `${glass.secondary.slice(0, 7)}A6` : glass.glassEdge;
}
