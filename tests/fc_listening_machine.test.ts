/**
 * cards-2.0 (E10): чистая state machine режима «Слушание» (§3.8 мастер-плана).
 * Покрытие: порядки озвучки (последовательность сторон/флипов/пауз), watchdog
 * при молчащем onDone (сессия не виснет, устаревший onDone игнорируется),
 * STOP глушит всё и не тикает после, PAUSE/RESUME (speak с начала, gap заново),
 * SKIP_NEXT/SKIP_PREV, повтор колоды, ветка «текст без озвучки» (backAvailable=false),
 * формула watchdog max(4с, слов×0.6с/rate+2с), счётчик прослушанных.
 */
import {
  ListeningMachine,
  buildCardSteps,
  watchdogMsForSpeak,
  EN_X2_SECOND_RATE_MULT,
  NO_VOICE_GAP_MS,
  LISTENING_DEFAULT_CONFIG,
  type ListeningCard,
  type ListeningConfig,
  type ListeningEffect,
} from '../app/flashcards/listening_machine';

const card = (id: string, over: Partial<ListeningCard> = {}): ListeningCard => ({
  id,
  front: `front ${id}`,
  back: `back ${id}`,
  frontLang: 'en-US',
  frontAvailable: true,
  backLang: 'ru-RU',
  backAvailable: true,
  ...over,
});

const CFG: Partial<ListeningConfig> = { order: 'en_ru', pauseMs: 2000, betweenMs: 1000, rate: 1, loop: false };

function makeHarness(cards: ListeningCard[], cfg: Partial<ListeningConfig> = CFG) {
  const effects: ListeningEffect[] = [];
  const m = new ListeningMachine(cards, cfg, (e) => effects.push(e));
  const lastAsync = () => {
    for (let i = effects.length - 1; i >= 0; i--) {
      const e = effects[i]!;
      if (e.kind === 'speak' || e.kind === 'gap') return e;
    }
    throw new Error('no pending async effect');
  };
  return { m, effects, lastAsync };
}

/** Компактная подпись эффекта для сверки последовательностей. */
const sig = (e: ListeningEffect): string => {
  switch (e.kind) {
    case 'speak': return `speak:${e.side}:${e.lang}@${e.rate}`;
    case 'gap': return `gap:${e.ms}`;
    case 'flip': return `flip:${e.flipped ? 'back' : 'front'}`;
    case 'card': return `card:${e.index}`;
    case 'tick': return 'tick';
    case 'no_voice': return `no_voice:${e.side}`;
    case 'stop_speech': return 'stop';
    case 'progress': return `listened:${e.listened}`;
    case 'done': return `done:${e.cardsListened}`;
  }
};

/** Идеальный хост: на каждый speak/gap немедленно шлёт соответствующий done. */
function autoplay(h: ReturnType<typeof makeHarness>, maxIters = 2000): void {
  let i = 0;
  let iters = 0;
  while (iters++ < maxIters) {
    let acted = false;
    for (; i < h.effects.length; i++) {
      const e = h.effects[i]!;
      if (e.kind === 'done') return;
      if (e.kind === 'speak') {
        i += 1;
        h.m.send({ type: 'SPEAK_DONE', token: e.token });
        acted = true;
        break;
      }
      if (e.kind === 'gap') {
        i += 1;
        h.m.send({ type: 'GAP_DONE', token: e.token });
        acted = true;
        break;
      }
    }
    if (!acted) return;
  }
  throw new Error('autoplay did not terminate');
}

// ── Watchdog-формула (§3.8: max(4с, слов × 0.6с / rate + 2с)) ────────────────

describe('watchdogMsForSpeak', () => {
  it('короткий текст упирается в минимум 4с', () => {
    expect(watchdogMsForSpeak('hello', 1)).toBe(4000); // 1×600+2000=2600 < 4000
  });
  it('длинный текст: слов×600/rate + 2000', () => {
    const ten = Array(10).fill('word').join(' ');
    expect(watchdogMsForSpeak(ten, 1)).toBe(8000);
  });
  it('замедленный rate удлиняет таймаут', () => {
    const ten = Array(10).fill('word').join(' ');
    expect(watchdogMsForSpeak(ten, 0.8)).toBe(Math.round((10 * 600) / 0.8 + 2000)); // 9500
  });
  it('битый rate трактуется как 1', () => {
    expect(watchdogMsForSpeak('a b c d e f g h i j', 0)).toBe(8000);
    expect(watchdogMsForSpeak('a b c d e f g h i j', NaN)).toBe(8000);
  });
});

// ── Порядки озвучки (§3.8) ───────────────────────────────────────────────────

describe('порядки озвучки', () => {
  it('EN→RU: лицо EN → пауза → флип → перевод → межкарточная пауза', () => {
    const h = makeHarness([card('a')]);
    h.m.start();
    autoplay(h);
    expect(h.effects.map(sig)).toEqual([
      'card:0',
      'flip:front',
      'speak:front:en-US@1',
      'gap:2000',
      'flip:back',
      'speak:back:ru-RU@1',
      'gap:1000',
      'listened:1',
      'done:1',
    ]);
  });

  it('RU→EN (recall): перевод → пауза «вспомнить» → флип на EN → EN', () => {
    const h = makeHarness([card('a')], { ...CFG, order: 'ru_en' });
    h.m.start();
    autoplay(h);
    expect(h.effects.map(sig)).toEqual([
      'card:0',
      'flip:back',
      'speak:back:ru-RU@1',
      'gap:2000',
      'flip:front',
      'speak:front:en-US@1',
      'gap:1000',
      'listened:1',
      'done:1',
    ]);
  });

  it('EN×2: второй проход медленнее (×0.8), перевод показывается визуально', () => {
    const h = makeHarness([card('a')], { ...CFG, order: 'en_x2' });
    h.m.start();
    autoplay(h);
    expect(h.effects.map(sig)).toEqual([
      'card:0',
      'flip:front',
      'speak:front:en-US@1',
      'gap:2000',
      `speak:front:en-US@${EN_X2_SECOND_RATE_MULT}`,
      'flip:back',
      'gap:1000',
      'listened:1',
      'done:1',
    ]);
  });

  it('только EN: одна озвучка, перевод — визуально после паузы', () => {
    const h = makeHarness([card('a')], { ...CFG, order: 'en_only' });
    h.m.start();
    autoplay(h);
    expect(h.effects.map(sig)).toEqual([
      'card:0',
      'flip:front',
      'speak:front:en-US@1',
      'gap:2000',
      'flip:back',
      'gap:1000',
      'listened:1',
      'done:1',
    ]);
  });

  it('tick звучит между карточками, но не перед первой', () => {
    const h = makeHarness([card('a'), card('b'), card('c')]);
    h.m.start();
    autoplay(h);
    const s = h.effects.map(sig);
    expect(s.filter((x) => x === 'tick')).toHaveLength(2);
    expect(s[0]).toBe('card:0'); // без tick перед первой
    expect(s[s.length - 1]).toBe('done:3');
  });
});

// ── Watchdog: зависший onDone не вешает сессию ───────────────────────────────

describe('watchdog', () => {
  it('WATCHDOG_FIRE двигает дальше вместо молчащего onDone', () => {
    const h = makeHarness([card('a')]);
    h.m.start();
    const speakEff = h.lastAsync();
    expect(speakEff.kind).toBe('speak');
    // onDone так и не пришёл → хост стреляет watchdog
    h.m.send({ type: 'WATCHDOG_FIRE', token: (speakEff as any).token });
    const s = h.effects.map(sig);
    expect(s).toContain('stop'); // машина дублирует Speech.stop() эффектом
    expect(s[s.length - 1]).toBe('gap:2000'); // перешли к паузе «подумать»
  });

  it('устаревший SPEAK_DONE после watchdog игнорируется (нет двойного шага)', () => {
    const h = makeHarness([card('a'), card('b')]);
    h.m.start();
    const speakEff = h.lastAsync() as Extract<ListeningEffect, { kind: 'speak' }>;
    h.m.send({ type: 'WATCHDOG_FIRE', token: speakEff.token });
    const count = h.effects.length;
    // «Завис» и вдруг ожил старый onDone
    h.m.send({ type: 'SPEAK_DONE', token: speakEff.token });
    expect(h.effects.length).toBe(count); // ничего не произошло
  });

  it('watchdogMs в эффекте совпадает с формулой', () => {
    const c = card('a', { front: 'one two three four five six seven eight nine ten' });
    const h = makeHarness([c]);
    h.m.start();
    const speakEff = h.lastAsync() as Extract<ListeningEffect, { kind: 'speak' }>;
    expect(speakEff.watchdogMs).toBe(watchdogMsForSpeak(c.front, 1));
  });
});

// ── STOP ─────────────────────────────────────────────────────────────────────

describe('STOP', () => {
  it('глушит всё и не тикает после — никакие события не рождают эффектов', () => {
    const h = makeHarness([card('a'), card('b')]);
    h.m.start();
    const speakEff = h.lastAsync() as Extract<ListeningEffect, { kind: 'speak' }>;
    h.m.send({ type: 'STOP' });
    expect(h.effects.map(sig)).toContain('stop');
    expect(h.m.snapshot.phase).toBe('stopped');
    const count = h.effects.length;
    h.m.send({ type: 'SPEAK_DONE', token: speakEff.token });
    h.m.send({ type: 'GAP_DONE', token: speakEff.token });
    h.m.send({ type: 'WATCHDOG_FIRE', token: speakEff.token });
    h.m.send({ type: 'RESUME' });
    h.m.send({ type: 'SKIP_NEXT' });
    expect(h.effects.length).toBe(count);
    expect(h.m.snapshot.phase).toBe('stopped');
  });
});

// ── PAUSE / RESUME ───────────────────────────────────────────────────────────

describe('PAUSE / RESUME', () => {
  it('пауза во время speak: stop_speech, устаревший onDone игнорируется, RESUME озвучивает сторону заново', () => {
    const h = makeHarness([card('a')]);
    h.m.start();
    const firstSpeak = h.lastAsync() as Extract<ListeningEffect, { kind: 'speak' }>;
    h.m.send({ type: 'PAUSE' });
    expect(h.m.snapshot.phase).toBe('paused');
    expect(sig(h.effects[h.effects.length - 1]!)).toBe('stop');
    const count = h.effects.length;
    h.m.send({ type: 'SPEAK_DONE', token: firstSpeak.token }); // late onDone
    expect(h.effects.length).toBe(count);
    h.m.send({ type: 'RESUME' });
    const resumed = h.lastAsync() as Extract<ListeningEffect, { kind: 'speak' }>;
    expect(resumed.kind).toBe('speak');
    expect(resumed.text).toBe(firstSpeak.text); // тот же шаг, с начала
    expect(resumed.token).not.toBe(firstSpeak.token); // новый token
    expect(h.m.snapshot.phase).toBe('playing');
  });

  it('пауза во время gap: RESUME перезапускает паузу целиком', () => {
    const h = makeHarness([card('a')]);
    h.m.start();
    const speakEff = h.lastAsync() as Extract<ListeningEffect, { kind: 'speak' }>;
    h.m.send({ type: 'SPEAK_DONE', token: speakEff.token });
    const gapEff = h.lastAsync() as Extract<ListeningEffect, { kind: 'gap' }>;
    expect(gapEff.kind).toBe('gap');
    h.m.send({ type: 'PAUSE' });
    h.m.send({ type: 'GAP_DONE', token: gapEff.token }); // старый таймер дожил
    h.m.send({ type: 'RESUME' });
    const resumed = h.lastAsync() as Extract<ListeningEffect, { kind: 'gap' }>;
    expect(resumed.kind).toBe('gap');
    expect(resumed.ms).toBe(gapEff.ms);
    expect(resumed.token).not.toBe(gapEff.token);
  });
});

// ── SKIP ─────────────────────────────────────────────────────────────────────

describe('SKIP_NEXT / SKIP_PREV', () => {
  it('SKIP_NEXT: следующая карточка с tick, недослушанная не засчитывается', () => {
    const h = makeHarness([card('a'), card('b')]);
    h.m.start();
    h.m.send({ type: 'SKIP_NEXT' });
    const s = h.effects.map(sig);
    expect(s).toContain('card:1');
    expect(s).toContain('tick');
    expect(s).not.toContain('listened:1'); // «a» не дослушана
    autoplay(h);
    expect(sig(h.effects[h.effects.length - 1]!)).toBe('done:1'); // только «b»
  });

  it('SKIP_NEXT на последней без повтора завершает сессию', () => {
    const h = makeHarness([card('a')]);
    h.m.start();
    h.m.send({ type: 'SKIP_NEXT' });
    expect(sig(h.effects[h.effects.length - 1]!)).toBe('done:0');
    expect(h.m.snapshot.phase).toBe('done');
  });

  it('SKIP_PREV: к предыдущей; на первой — рестарт текущей', () => {
    const h = makeHarness([card('a'), card('b')]);
    h.m.start();
    h.m.send({ type: 'SKIP_NEXT' }); // → b
    h.m.send({ type: 'SKIP_PREV' }); // → a
    const s = h.effects.map(sig);
    expect(s.filter((x) => x === 'card:0')).toHaveLength(2);
    h.m.send({ type: 'SKIP_PREV' }); // рестарт a
    expect(h.m.snapshot.cardIndex).toBe(0);
    const speakEff = h.lastAsync() as Extract<ListeningEffect, { kind: 'speak' }>;
    expect(speakEff.text).toBe('front a');
  });

  it('скип в паузе: карточка меняется, но озвучка не стартует до RESUME', () => {
    const h = makeHarness([card('a'), card('b')]);
    h.m.start();
    h.m.send({ type: 'PAUSE' });
    const count = h.effects.length;
    h.m.send({ type: 'SKIP_NEXT' });
    const added = h.effects.slice(count).map(sig);
    expect(added).toContain('card:1');
    expect(added.some((x) => x.startsWith('speak'))).toBe(false);
    h.m.send({ type: 'RESUME' });
    const speakEff = h.lastAsync() as Extract<ListeningEffect, { kind: 'speak' }>;
    expect(speakEff.text).toBe('front b');
  });
});

// ── Повтор колоды ────────────────────────────────────────────────────────────

describe('повтор колоды (loop)', () => {
  it('после последней карточки — снова первая, счётчик растёт, done нет', () => {
    const h = makeHarness([card('a'), card('b')], { ...CFG, loop: true });
    h.m.start();
    // Проиграем 5 полных карточек (a,b,a,b,a) вручную
    for (let k = 0; k < 5; k++) {
      // каждая карточка en_ru: speak → gap → speak → gap
      for (let step = 0; step < 4; step++) {
        const e = h.lastAsync();
        if (e.kind === 'speak') h.m.send({ type: 'SPEAK_DONE', token: e.token });
        else h.m.send({ type: 'GAP_DONE', token: e.token });
      }
    }
    expect(h.m.snapshot.listened).toBe(5);
    expect(h.effects.map(sig)).not.toContain('done:5');
    expect(h.m.snapshot.phase).toBe('playing');
    // Выключили повтор → колода завершится на последней карточке
    h.m.setLoop(false);
    for (let step = 0; step < 4; step++) {
      const e = h.lastAsync();
      if (e.kind === 'speak') h.m.send({ type: 'SPEAK_DONE', token: e.token });
      else h.m.send({ type: 'GAP_DONE', token: e.token });
    }
    expect(sig(h.effects[h.effects.length - 1]!)).toBe('done:6');
  });
});

// ── «Текст без озвучки» (uk без голоса → фолбэк ru → нет и его) ─────────────

describe('ветка «текст без озвучки»', () => {
  it('backAvailable=false: speak заменяется на no_voice + gap, флип сохраняется', () => {
    const h = makeHarness([card('a', { backAvailable: false, backLang: 'uk-UA' })]);
    h.m.start();
    autoplay(h);
    expect(h.effects.map(sig)).toEqual([
      'card:0',
      'flip:front',
      'speak:front:en-US@1',
      'gap:2000',
      'flip:back', // сторона показана визуально
      'no_voice:back',
      `gap:${NO_VOICE_GAP_MS}`, // gap вместо речи
      'gap:1000',
      'listened:1',
      'done:1',
    ]);
  });

  it('недоступное лицо тоже пропускается без зависания', () => {
    const h = makeHarness([card('a', { frontAvailable: false })]);
    h.m.start();
    autoplay(h);
    const s = h.effects.map(sig);
    expect(s).toContain('no_voice:front');
    expect(s[s.length - 1]).toBe('done:1');
  });
});

// ── Разное ───────────────────────────────────────────────────────────────────

describe('разное', () => {
  it('пустая колода не стартует', () => {
    const h = makeHarness([]);
    h.m.start();
    expect(h.effects).toHaveLength(0);
    expect(h.m.snapshot.phase).toBe('idle');
  });

  it('смена порядка на лету перезапускает текущую карточку', () => {
    const h = makeHarness([card('a')]);
    h.m.start();
    h.m.setOrder('ru_en');
    const s = h.effects.map(sig);
    expect(s).toContain('stop');
    const speakEff = h.lastAsync() as Extract<ListeningEffect, { kind: 'speak' }>;
    expect(speakEff.side).toBe('back'); // ru_en начинает с перевода
    expect(h.m.snapshot.config.order).toBe('ru_en');
  });

  it('сессия из 10 карточек даёт cardsListened=10 (порог ★ по §4)', () => {
    const cards = Array.from({ length: 10 }, (_, i) => card(`c${i}`));
    const h = makeHarness(cards);
    h.m.start();
    autoplay(h);
    expect(sig(h.effects[h.effects.length - 1]!)).toBe('done:10');
  });

  it('дефолтный конфиг соответствует §3.8', () => {
    expect(LISTENING_DEFAULT_CONFIG.pauseMs).toBe(2000);
    expect(LISTENING_DEFAULT_CONFIG.betweenMs).toBe(1000);
    expect(LISTENING_DEFAULT_CONFIG.rate).toBe(1);
    expect(LISTENING_DEFAULT_CONFIG.order).toBe('en_ru');
    // buildCardSteps дефолтом даёт en_ru план
    const steps = buildCardSteps(card('x'), { ...LISTENING_DEFAULT_CONFIG });
    expect(steps[0]).toEqual({ type: 'flip', flipped: false });
  });
});
