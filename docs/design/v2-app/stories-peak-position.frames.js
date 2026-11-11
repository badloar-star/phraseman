/* ── помощники кадров позиции Пика ── */
const icn = (n, d = 120) => `<div class="icn pop" style="--d:${d}ms">${io(n, 58)}</div>`;

/* ── шаблоны: id · имя · группа · статус · когда · данные · кадр ──
   зачем (владелец 11.11: «Сделать новый макет»): три окна позиции Пика, для которых кадр 17 макета «Истории вместо окон» не подошёл —
   он показывал очки и лигу, а окна знают места, монеты ступени, разрыв с соперником и время до итога недели.
   Тексты — дословно из окон (position_moment_strings.ts, moments_strings.ts). Данные — пример. */
const TPL = [
  { id: 'peak_rise', name: 'Пик · позиция выросла', group: 'Пик', kind: 'new', ev: 'spire_position_rise (новое)', when: 'взамен окна «Позиция выросла» после ступени · место в комнате недели стало выше', data: 'fromIndex, toIndex, coinsGained', motion: 'кольцо замыкается, место сменяется: было → стало',
    cta: { label: 'Играть ещё', icon: 'flash' },
    render: () => `<div class="art">${ring(1, `<div class="lvup"><span class="o">7</span><span class="nw">4</span></div>`)}</div><div class="h1">${words('Ты в топ-5', 780)}</div><div class="chip a" style="--d:1050ms">${coin(5, 20)}+120 монет</div>` },

  { id: 'peak_overtake', name: 'Пик · тебя обгоняют', group: 'Пик', kind: 'new', ev: 'spire_position_overtake (новое)', when: 'взамен всплывающей плашки «Тебя обогнали» после ступени · соперник вышел вперёд', data: 'rivalName, rivalCoinRank, gapCoins или gapSteps', motion: 'монета соперника появляется, заголовок встаёт по словам',
    cta: { label: 'Играть', icon: 'flash' },
    render: () => `<div class="art"><div class="pop" style="--d:120ms">${coin(8, 112)}</div></div><div class="h1">${words('Марк обгоняет тебя', 380)}</div><div class="p a" style="--d:700ms">на 120 монет за неделю</div>` },

  { id: 'peak_last_chance', name: 'Пик · последний шанс', group: 'Пик', kind: 'new', ev: 'spire_last_chance (новое)', when: 'взамен окна «Последний шанс» · воскресенье, до топ-5 не хватает, энергия закончилась', data: 'weekEndsAtMs, energyReadyAtMs, gapCoins или gapSteps', motion: 'знак появляется, время до итога встаёт крупно',
    cta: { label: 'Играй без ожидания с Plus', icon: 'sparkles' },
    render: () => `<div class="art">${icn('hourglass')}</div><div class="ov a" style="--d:380ms">Воскресенье · до итога</div><div class="big s a" style="--d:460ms">05:42:10</div><div class="p a" style="--d:820ms">До топ-5 — 120 монет. Энергия вернётся через 01:20:00.</div>` },
];
