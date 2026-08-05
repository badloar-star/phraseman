// ════════════════════════════════════════════════════════════════════════════
// season_pass_spine.ts — геометрия «хребта» сезонной дорожки.
//
// зачем 2026-08-03 (владелец, со скриншотом: «эта линия должна быть сплошная и
// непрерывная»): формулы вынесены из season_pass.tsx в отдельный модуль без
// импортов React Native. Причина практическая: экран тянет react-native-svg и
// не поднимается в jest, поэтому геометрию было НЕЧЕМ проверить — а именно в
// ней и жил баг с разрывами. Чистый модуль тестируется напрямую.
// ════════════════════════════════════════════════════════════════════════════

/**
 * Амплитуда бокового изгиба хребта, px.
 *
 * зачем 2026-08-03 (владелец: «линия должна быть сплошная и непрерывная»,
 * тест «кривая не вылезает за колонку узла»): было 16, но формула смещения
 * даёт разброс до ±2.75×амплитуды — при 16 линия уходила на 44 px от центра
 * при полуширине колонки 28. То есть хребет физически вылезал за свою колонку
 * и заезжал под карточки наград, отчего дорожка читалась как кривая и рваная.
 * 8 — максимум, при котором ни одна награда не выводит линию за колонку
 * (проверено перебором по всем kind из SEASON_TRACK).
 */
export const SPINE_WAVE_AMPLITUDE = 8;

/**
 * Боковое смещение узла — детерминировано по типу награды.
 *
 * зачем: изгиб обязан быть стабильным между перерендерами, иначе дорожка
 * «дребезжит». Один и тот же подарок всегда даёт одну и ту же волну.
 */
export function spineWaveOffsetForKind(kind: string | undefined): number {
  if (!kind) return 0;
  let hash = 0;
  for (let i = 0; i < kind.length; i++) hash = (hash * 31 + kind.charCodeAt(i)) | 0;
  return ((hash % 100) / 100) * SPINE_WAVE_AMPLITUDE * 2 - SPINE_WAVE_AMPLITUDE;
}

/**
 * Верхняя половина строки: от X узла НАД ней до X своего узла.
 *
 * зачем 2026-08-03: раньше строка рисовала кривую prevOffset → curOffset →
 * nextOffset, то есть ЗАКАНЧИВАЛАСЬ на X следующего узла. Следующая строка
 * начиналась со своего prevOffset — X узла над ней. Эти координаты не
 * совпадали, и на каждом стыке строк линия скакала вбок на 10-17 px (проверено
 * численно на реальных наградах дорожки) — владелец видел это как разрывы.
 *
 * Всегда начинается со своего `M` — используется и как самостоятельный path
 * (золотая подсветка), и как первый сегмент общей строки в spineFullRowPath.
 */
export function spineTopHalfPath(
  cx: number,
  halfH: number,
  prevOffset: number,
  curOffset: number,
): string {
  const from = cx + prevOffset;
  const to = cx + curOffset;
  return `M ${from} 0 C ${from} ${halfH * 0.5}, ${to} ${halfH * 0.5}, ${to} ${halfH}`;
}

/**
 * Нижняя половина строки: от X своего узла до нижнего края — В ТОТ ЖЕ X.
 *
 * Следующая строка стартует ровно отсюда (её prevOffset — это наш curOffset),
 * поэтому стык совпадает ПО ПОСТРОЕНИЮ, а не по совпадению чисел. nextOffset
 * задаёт лишь направление изгиба, но не конечную точку.
 *
 * зачем 2026-08-03 (владелец, краш RNSVGPathParser «UnexpectedData: C 17.28 81,
 * 19.68 81, 17.28 108»): раньше строка начиналась сразу с `C`, без `M`. Пока
 * она склеивалась с spineTopHalfPath через пробел в одну d-строку, это молча
 * читалось как продолжение уже открытого subpath. Но эта же функция
 * используется и САМОСТОЯТЕЛЬНО (золотая подсветка «пройденного низа» —
 * season_pass.tsx рисует её отдельным <Path>) — там `d` целиком равен этой
 * строке, а path без ведущего moveto синтаксически невалиден. RNSVGPathParser
 * (в отличие от браузерного парсера) на это падает крашем, а не молча
 * игнорирует команду. Явный `M` в начало делает функцию валидной ВСЕГДА,
 * независимо от того, используют её отдельно или как часть большей строки.
 */
export function spineBottomHalfPath(
  cx: number,
  halfH: number,
  rowHeight: number,
  curOffset: number,
  nextOffset: number,
): string {
  const from = cx + curOffset;
  const control = cx + (curOffset + nextOffset) / 2;
  return `M ${from} ${halfH} C ${from} ${halfH * 1.5}, ${control} ${halfH * 1.5}, ${from} ${rowHeight}`;
}

/**
 * Вся строка целиком — ОДНА гладкая кривая от верхнего края до нижнего, с
 * ОДНИМ `M` и одной непрерывной цепочкой команд. Замена ручной конкатенации
 * `spineTopHalfPath + ' ' + spineBottomHalfPath` в родителе.
 *
 * зачем 2026-08-03 (владелец, скриншот: линия «уводит в сторону» ровно в точке
 * узла): конкатенация двух самостоятельных M-путей — это ДВА отдельных subpath
 * в одной d-строке, а не один гладкий контур. Формально не крашится (второй
 * `M` валиден), но между ними нет непрерывности кривизны: первый subpath
 * подходит к точке узла своей касательной, второй уходит от неё уже другой —
 * визуально это читается как излом/скачок ровно там, где рисуется узел.
 * Здесь — одна кривая через симметричную точку (halfH), поэтому касательная
 * в halfH одна и та же по построению, а не по совпадению чисел.
 */
export function spineFullRowPath(
  cx: number,
  halfH: number,
  rowHeight: number,
  prevOffset: number,
  curOffset: number,
  nextOffset: number,
): string {
  // зачем: конец строки ОБЯЗАН быть в X ЭТОГО узла (curOffset), не соседнего —
  // именно этот X читает prevOffset следующей строки. nextOffset задаёт только
  // control-point (направление изгиба второй половины), а не конечную точку;
  // так же было устроено в spineBottomHalfPath ДО объединения в одну кривую.
  const from = cx + prevOffset;
  const mid = cx + curOffset;
  const control = cx + (curOffset + nextOffset) / 2;
  return `M ${from} 0 C ${from} ${halfH * 0.5}, ${mid} ${halfH * 0.5}, ${mid} ${halfH} C ${mid} ${halfH * 1.5}, ${control} ${halfH * 1.5}, ${mid} ${rowHeight}`;
}

/**
 * ВЕСЬ хребет дорожки — ОДИН path через N узлов, один `M`, одна непрерывная
 * цепочка `C`-команд без единого разрыва.
 *
 * зачем 2026-08-03 (владелец: «линия прерывается на каждом подарке», реальный
 * скриншот с 5 видимыми разрывами ровно на границах строк): spineFullRowPath
 * чинила гладкость ВНУТРИ одной строки, но экран рисовал 60 независимых
 * `<Svg>` — по одному на строку `FlatList`. Между соседними SVG-полотнами нет
 * физической связи: разный антиалиасинг края канваса, округление субпикселей
 * разных `View`, порядок монтирования строк — линия читалась как рваная НЕ
 * из-за формулы кривой (та была верна), а потому что кривых было 60, а не 1.
 * Единственный способ получить ФИЗИЧЕСКИ одну линию — вынести её из построчного
 * renderItem в единое полотно на всю прокручиваемую высоту дорожки.
 *
 * `offsets[i]` — боковое смещение узла i (см. spineWaveOffsetForKind).
 * Строка i идёт от Y=i*rowHeight до Y=(i+1)*rowHeight, тем же построением, что
 * и spineFullRowPath: конец сегмента — X ЭТОГО узла, следующий control-point
 * начинается ровно оттуда же — стыки совпадают по построению, а не по числам.
 */
export function spineTrackPath(
  cx: number,
  rowHeight: number,
  offsets: readonly number[],
  overscanTop = 0,
  overscanBottom = 0,
): string {
  if (offsets.length === 0) return '';
  const halfH = rowHeight / 2;
  const firstX = cx + offsets[0];
  // зачем 2026-08-04 (владелец: «полоса не должна начинаться под словами
  // ПРОПУСК, пусть уходит вверх за сейф-зону и вниз — будто бесконечная»):
  // хребет начинался ровно в Y=0 первого узла, то есть у него был видимый
  // ТОРЕЦ прямо под шапкой — линия читалась как отрезок с началом и концом,
  // а не как дорожка, уходящая за экран. Оверскан — прямые продолжения в ТОМ
  // ЖЕ X, что и крайние узлы: вверх из первого, вниз из последнего. Прямые, а
  // не кривые, потому что за пределами дорожки нет узла, к которому изгибаться,
  // и любая волна там читалась бы как ложный узел. X не меняется — контракт
  // «линия не вылезает за колонку» остаётся выполнен по построению.
  let d = overscanTop > 0 ? `M ${firstX} ${-overscanTop} L ${firstX} 0` : `M ${firstX} 0`;
  for (let i = 0; i < offsets.length; i += 1) {
    const top = i * rowHeight;
    const mid = cx + offsets[i];
    const nextOffset = i + 1 < offsets.length ? offsets[i + 1] : offsets[i];
    const control = cx + (offsets[i] + nextOffset) / 2;
    const bottom = (i + 1) * rowHeight;
    d += ` C ${mid} ${top + halfH * 0.5}, ${mid} ${top + halfH * 0.5}, ${mid} ${top + halfH}`;
    d += ` C ${mid} ${top + halfH * 1.5}, ${control} ${top + halfH * 1.5}, ${control} ${bottom}`;
  }
  if (overscanBottom > 0) {
    // Хвост вниз продолжается из ФАКТИЧЕСКОЙ конечной точки последнего
    // сегмента (control последней строки), а не из cx + offsets[last]: иначе
    // между кривой и хвостом был бы скачок вбок — ровно тот класс разрыва,
    // который чинили выше.
    const lastOffset = offsets[offsets.length - 1];
    const lastX = cx + lastOffset;
    const endY = offsets.length * rowHeight;
    d += ` L ${lastX} ${endY + overscanBottom}`;
  }
  return d;
}

/**
 * Тот же путь, ОБРЕЗАННЫЙ на конкретном уровне прогресса — для золотой
 * подсветки «пройденного» участка. `reachedLevel` — индекс последнего
 * пройденного узла (0 = ничего не пройдено, узел 0 ещё не тронут).
 * Останавливается РОВНО в X узла reachedLevel (середина его строки) — та же
 * точка, где рисуется кружок уровня, а не на границе строки.
 *
 * зачем 2026-08-04: `overscanTop` повторяет верхний хвост серого пути. Золото
 * лежит ПОВЕРХ серого и начинается в той же точке, поэтому без хвоста серый
 * торчал бы над золотым на всю высоту оверскана — над шапкой висел бы тусклый
 * огрызок. Нижнего хвоста здесь нет и быть не должно: золото обязано
 * обрываться ровно на достигнутом уровне, это и есть индикатор прогресса.
 */
export type SpineTrackRegionPaths = Readonly<{
  divider: string;
  free: string;
  plus: string;
}>;

/**
 * Closes the existing season spine to the screen edges so the same curve can
 * separate the decorative Free and Plus background fills.
 *
 * The divider comes directly from spineTrackPath(), not from a second BÃ©zier
 * implementation. A later geometry change therefore moves the visible line
 * and both background regions together.
 */
export function spineTrackRegionPaths(
  width: number,
  rowHeight: number,
  offsets: readonly number[],
  overscanTop = 0,
  overscanBottom = 0,
): SpineTrackRegionPaths {
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(rowHeight) || rowHeight <= 0 || offsets.length === 0) {
    return { divider: '', free: '', plus: '' };
  }

  const divider = spineTrackPath(width / 2, rowHeight, offsets, overscanTop, overscanBottom);
  const top = -Math.max(0, overscanTop);
  const bottom = offsets.length * rowHeight + Math.max(0, overscanBottom);

  return {
    divider,
    free: `${divider} L 0 ${bottom} L 0 ${top} Z`,
    plus: `${divider} L ${width} ${bottom} L ${width} ${top} Z`,
  };
}

export function spineTrackProgressPath(
  cx: number,
  rowHeight: number,
  offsets: readonly number[],
  reachedLevel: number,
  overscanTop = 0,
): string {
  const lastIndex = Math.max(0, Math.min(reachedLevel, offsets.length - 1));
  if (reachedLevel <= 0 || offsets.length === 0) return '';
  const halfH = rowHeight / 2;
  const firstX = cx + offsets[0];
  let d = overscanTop > 0 ? `M ${firstX} ${-overscanTop} L ${firstX} 0` : `M ${firstX} 0`;
  for (let i = 0; i <= lastIndex; i += 1) {
    const top = i * rowHeight;
    const mid = cx + offsets[i];
    d += ` C ${mid} ${top + halfH * 0.5}, ${mid} ${top + halfH * 0.5}, ${mid} ${top + halfH}`;
    if (i < lastIndex) {
      const nextOffset = offsets[i + 1];
      const control = cx + (offsets[i] + nextOffset) / 2;
      const bottom = (i + 1) * rowHeight;
      d += ` C ${mid} ${top + halfH * 1.5}, ${control} ${top + halfH * 1.5}, ${control} ${bottom}`;
    }
  }
  return d;
}
