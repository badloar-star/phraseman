/* ── помощники кадров «подписка подключена» ──
   знак уровня — как в пейволе «Два пути» (PaywallDuoHero): Ultra — коралловый градиент и звезда ✦, Plus — фиолетово-синий и ромб ◆ */
const pbig = (tier, d = 160) => `<span class="pmark inl pbig pop ${tier === 'plus' ? 'tplus' : ''}" style="--d:${d}ms"><i>${tier === 'plus' ? '◆' : '✦'}</i></span>`;

/* ── шаблоны: id · имя · группа · статус · когда · данные · кадр ──
   зачем (владелец 11.11: «Pro нету! есть Ультра и Плюс! переделай! они отличаются иконки по цвету»): праздничное окно после покупки
   или выдачи подписки приходит кадром. Уровень берётся из продукта магазина (месячная — Plus, годовая — Ultra; выдача командой и
   прочее — Plus), как во всём приложении (app/subscription_tier.ts). Тексты — из окна (celebrationLiquidCopy). Данные — пример. */
const TPL = [
  { id: 'sub_plus', name: 'Plus активирован', group: 'Подписка', kind: 'new', ev: 'plus_activated (уровень plus)', when: 'взамен праздничного окна на Главной после покупки месячной подписки или выдачи командой', data: 'tier', motion: 'знак встаёт, конфетти один раз',
    cta: { label: 'К занятиям', icon: 'play' },
    render: () => `${confetti(18, 600)}<div class="art">${pbig('plus')}</div><div class="ov a" style="--d:380ms">Plus</div><div class="h1">${words('Plus активирован', 460)}</div><div class="p a" style="--d:760ms">Уроки и тренировки не уменьшают запас энергии.</div>` },

  { id: 'sub_ultra', name: 'Ultra активирован', group: 'Подписка', kind: 'new', ev: 'plus_activated (уровень ultra)', when: 'взамен праздничного окна на Главной после покупки годовой подписки', data: 'tier', motion: 'знак встаёт, конфетти один раз',
    cta: { label: 'К занятиям', icon: 'play' },
    render: () => `${confetti(18, 600)}<div class="art">${pbig('ultra')}</div><div class="ov a" style="--d:380ms">Ultra</div><div class="h1">${words('Ultra активирован', 460)}</div><div class="p a" style="--d:760ms">Уроки и тренировки не уменьшают запас энергии.</div>` },
];
