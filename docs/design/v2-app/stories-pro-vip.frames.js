/* ── помощники кадров поздравлений Pro и VIP ── */
const pbig = (d = 160, cls = '') => `<span class="pmark inl pbig pop ${cls}" style="--d:${d}ms"><i>✦</i></span>`;

/* ── шаблоны: id · имя · группа · статус · когда · данные · кадр ──
   зачем (владелец 11.11: «Сделать макет»): праздничные окна после покупки Phraseman Pro и после выдачи VIP командой.
   Тексты — дословно из окна (components/premium_celebration/celebrationLiquidCopy.ts). У VIP окно говорит «Plus» —
   так устроено в приложении (у VIP своя только зелёная палитра окна), кадр повторяет это. Данные — пример. */
const TPL = [
  { id: 'pro_on', name: 'Pro активирован', group: 'Plus', kind: 'new', ev: 'pro_activated (новое)', when: 'взамен праздничного окна после покупки Phraseman Pro на Главной', data: '—', motion: 'знак встаёт, конфетти один раз',
    cta: { label: 'К занятиям', icon: 'play' },
    render: () => `${confetti(18, 600)}<div class="art">${pbig(160)}</div><div class="ov a" style="--d:380ms">Pro</div><div class="h1">${words('Pro активирован', 460)}</div><div class="p a" style="--d:760ms">Уроки и тренировки не уменьшают запас энергии.</div>` },

  { id: 'vip_on', name: 'VIP · Plus активирован', group: 'Plus', kind: 'new', ev: 'vip_granted (новое)', when: 'взамен праздничного окна после выдачи VIP командой на Главной · окно активации промокода на своём экране остаётся: это ответ на ввод кода', data: '—', motion: 'знак встаёт, конфетти один раз',
    cta: { label: 'К занятиям', icon: 'play' },
    render: () => `${confetti(18, 600)}<div class="art">${pbig(160)}</div><div class="ov a" style="--d:380ms">Plus включён</div><div class="h1">${words('Plus активирован', 460)}</div><div class="p a" style="--d:760ms">Всё на месте — теперь ещё и с Plus.</div>` },
];
