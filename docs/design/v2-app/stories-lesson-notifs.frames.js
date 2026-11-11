/* ── помощники кадров уведомлений итога урока ── */
const icn = (n, d = 120) => `<div class="icn pop" style="--d:${d}ms">${io(n, 58)}</div>`;
/* настоящая картинка медали приложения (assets/images/levels) — та же, что в уведомлении и на итоге урока */
const medal = (tier, d = 120) => `<img class="mdl pop" src="assets/medal_${tier}.webp" width="148" height="148" style="--d:${d}ms" alt="">`;

/* ── шаблоны: id · имя · группа · статус · когда · данные · кадр ──
   зачем (владелец 11.11: «сделай макеты для медали и экзаменов»): три уведомления итога урока, у которых ещё нет кадра истории.
   Тексты — дословно из уведомлений (app/lesson_complete.tsx); кнопка «Поделиться» — та же, что у уведомления. Данные — пример. */
const TPL = [
  { id: 'medal_bronze', name: 'Медаль урока · бронза', group: 'Уроки', kind: 'new', ev: 'lesson_medal (новое)', when: 'взамен уведомления о медали на итоге урока · лучший результат урока впервые дал бронзу', data: 'lessonId, medalTier', motion: 'медаль появляется, заголовок встаёт по словам',
    cta: { label: 'Поделиться', icon: 'share' },
    render: () => `<div class="art">${medal('bronze')}</div><div class="ov a" style="--d:380ms">Урок 12</div><div class="h1">${words('Бронзовая медаль!', 460)}</div><div class="p a" style="--d:760ms">Урок позади! Следующий уже стучится</div>` },

  { id: 'medal_silver', name: 'Медаль урока · серебро', group: 'Уроки', kind: 'new', ev: 'lesson_medal (новое)', when: 'взамен уведомления о медали на итоге урока · лучший результат урока поднялся до серебра', data: 'lessonId, medalTier', motion: 'медаль появляется, заголовок встаёт по словам',
    cta: { label: 'Поделиться', icon: 'share' },
    render: () => `<div class="art">${medal('silver')}</div><div class="ov a" style="--d:380ms">Урок 12</div><div class="h1">${words('Серебряная медаль!', 460)}</div><div class="p a" style="--d:760ms">Урок позади! Следующий уже стучится</div>` },

  { id: 'medal_gold', name: 'Медаль урока · золото', group: 'Уроки', kind: 'new', ev: 'lesson_medal (новое)', when: 'взамен уведомления о медали на итоге урока · лучший результат урока поднялся до золота', data: 'lessonId, medalTier', motion: 'медаль появляется, конфетти один раз — только у золота',
    cta: { label: 'Поделиться', icon: 'share' },
    render: () => `${confetti(18, 600)}<div class="art">${medal('gold')}</div><div class="ov a" style="--d:380ms">Урок 12</div><div class="h1">${words('Золотая медаль!', 460)}</div><div class="p a" style="--d:760ms">Урок позади! Следующий уже стучится</div>` },

  { id: 'level_exam_open', name: 'Экзамен уровня открыт', group: 'Экзамены', kind: 'new', ev: 'level_exam_unlocked (новое)', when: 'взамен уведомления «Экзамен уровня открыт» на итоге урока · все уроки уровня пройдены на 4,5 и выше', data: 'cefrLevel', motion: 'знак появляется, заголовок встаёт по словам',
    cta: { label: 'Поделиться', icon: 'share' },
    render: () => `<div class="art">${icn('school')}</div><div class="ov a" style="--d:380ms">Уровень A1</div><div class="h1">${words('Экзамен уровня открыт', 460)}</div><div class="p a" style="--d:800ms">Проверим, что осело в голове?</div>` },

  { id: 'lingman_exam_open', name: 'Экзамен Lingman открыт', group: 'Экзамены', kind: 'new', ev: 'lingman_exam_unlocked (новое)', when: 'взамен уведомления «Экзамен Lingman открыт» на итоге урока · все 32 урока на 5,0 и все экзамены уровней сданы', data: '—', motion: 'знак появляется, конфетти один раз',
    cta: { label: 'Поделиться', icon: 'share' },
    render: () => `${confetti(18, 600)}<div class="art">${icn('ribbon')}</div><div class="h1">${words('Экзамен Lingman открыт', 380)}</div><div class="p a" style="--d:760ms">Проверим, что осело в голове?</div>` },
];
