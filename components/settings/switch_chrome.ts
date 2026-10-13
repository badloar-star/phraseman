// зачем (Сверка 11.10, светлая «Максимум» / «Акцент»): дорожка выключенного переключателя (opaqueControl) почти сливалась с карточкой
// (контраст 1.1–1.3:1), а кромка glassEdge в светлой — 12 % чёрного, то есть тоже невидима. В светлой кромка дорожки берётся из
// secondary (6.6:1) с прозрачностью 65 % — около 3:1 к карточке, как требует контраст границы элемента управления; в тёмной —
// прежняя glassEdge (кит .switch: border 1 px var(--line-2)). Ручка и включённая дорожка не менялись.
export function switchTrackBorder(glass: Readonly<{ isLight?: boolean; glassEdge: string; secondary: string }>): string {
  return glass.isLight ? `${glass.secondary.slice(0, 7)}A6` : glass.glassEdge;
}

// зачем (координатор 12.10, стиль «Тень»: контейнеры без обводок): в «Настройках обучения» дорожка выключенного переключателя отделяется
// ТОНОМ, а не кромкой. В светлой теме заливка — secondary 65 % (≈3:1 к карточке, как у прежней кромки), ручка белая, чтобы читалась на тёмной
// дорожке; в тёмной — прежняя opaqueControl и ручка secondary (там дорожка и так видна).
export function switchOffTrackTone(
  glass: Readonly<{ isLight?: boolean; opaqueControl: string; secondary: string }>,
): Readonly<{ track: string; knob: string }> {
  return glass.isLight
    ? { track: `${glass.secondary.slice(0, 7)}A6`, knob: '#FFFFFF' } // theme-exempt: ручка переключателя всегда светлая, как у iOS/Android
    : { track: glass.opaqueControl, knob: glass.secondary };
}

// зачем (разбор diff Темами 13.10, Г5; settings-gap-013/014/015/034, образец settings-gaps-states `.gs-sw.on`): включённый переключатель — дорожка цвета АКЦЕНТА темы и тёмная
// «чернильная» подпись акцента на бегунке (в Графите — светлая дорожка и чёрный бегунок, в Авроре — мятная и тёмно-зелёный), а не тёмная дорожка с белым бегунком.
// accentGraphic = accent в тёмном и проверенный на контраст в светлом; accentInk — подпись на акценте. Общий токен для трёх копий LocalSwitch (замена — Авторизация/Дизайн).
export function switchOnTone(
  glass: Readonly<{ accentGraphic: string; accentInk: string }>,
): Readonly<{ track: string; knob: string }> {
  return { track: glass.accentGraphic, knob: glass.accentInk };
}
