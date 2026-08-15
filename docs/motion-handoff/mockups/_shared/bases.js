/* ============================================================================
   BASES — фоновые экраны, воспроизведённые по РЕАЛЬНОМУ коду phraseman v1.5.53
   Источники: constants/theme.ts, goldTheme.ts, cinemaThemes.ts,
              screenBackground.ts, components/ScreenGradient.tsx
   + сверено со скриншотами из .dev-screens/
   ========================================================================== */

/* ── Темы: значения 1:1 из constants/ ───────────────────────────────────── */
const THEMES = {
  dark: {
    label: 'Dark', // theme.ts DARK + ScreenGradient orbs :76-79
    vars: {
      bg: '#07120B', bg1: '#07120B', bg2: '#030805', bg3: '#010201',
      card: '#101710', surf: '#17241A', surf2: '#203028',
      tx: '#F0F7F2', second: '#58CC89', mut: '#8AB49A', ghost: '#506A5C',
      bd: 'rgba(255,255,255,0.07)', bdLight: '#1D2D23',
      acc: '#47C870', accBg: 'rgba(71,200,112,0.14)', onAcc: '#042010',
      gold: '#FFC800', goldBg: 'rgba(255,200,0,0.14)', onGold: '#1A1A1A',
      wrong: '#F05454', wrongBg: 'rgba(240,84,84,0.12)',
      cardG1: '#2B4A32', cardG2: '#070B08',
      glow: 'rgba(71,200,112,0.32)', hair: 'rgba(88,204,137,0.18)',
    },
    orbs: [[.85, .06, 200, '#47C870', .15], [.10, .42, 150, '#2A7A4A', .13],
           [.60, .78, 130, '#1A5C35', .10], [.25, .22, 70, '#58CC89', .07]],
  },
  midnight: {
    label: 'Midnight', // cinemaThemes.ts CINEMA.midnight — флагман «Чёрного кино»
    vars: {
      bg: '#080B17', bg1: '#080B17', bg2: '#03040A', bg3: '#010102',
      card: '#0D101E', surf: '#151A31', surf2: '#202641',
      tx: '#FFFFFF', second: '#B79CFF', mut: '#A9AECB', ghost: '#6E7390',
      bd: 'rgba(143,160,255,0.17)', bdLight: '#2A3052',
      acc: '#8FA0FF', accBg: 'rgba(143,160,255,0.18)', onAcc: '#0D1030',
      gold: '#FFD27A', goldBg: 'rgba(255,210,122,0.16)', onGold: '#1F1604',
      wrong: '#FF6E8A', wrongBg: 'rgba(255,110,138,0.16)',
      cardG1: '#293463', cardG2: '#06070D',
      glow: 'rgba(91,124,255,0.38)', hair: 'rgba(143,160,255,0.30)',
      bloomA: '#5B7CFF', bloomB: '#A95BFF',
    },
    bloom: true,
  },
  gold: {
    label: 'Black Gold', // goldTheme.ts GOLD_RICH + GOLD_GRADIENTS
    vars: {
      bg: '#080706', bg1: '#080706', bg2: '#030303', bg3: '#010101',
      card: '#111111', surf: '#171717', surf2: '#1A1711',
      tx: '#F7F1E4', second: '#D8C9A5', mut: '#B8AD92', ghost: '#6D6554',
      bd: 'rgba(214,179,90,0.14)', bdLight: 'rgba(214,179,90,0.28)',
      acc: '#D6B35A', accBg: 'rgba(214,179,90,0.13)', onAcc: '#1A1204',
      gold: '#F6E3A1', goldBg: 'rgba(246,227,161,0.10)', onGold: '#1A1204',
      wrong: '#C46B5A', wrongBg: 'rgba(196,107,90,0.12)',
      cardG1: '#1D1A12', cardG2: '#040403',
      glow: 'rgba(246,227,161,0.26)', hair: 'rgba(246,227,161,0.38)',
      ctaG1: '#F0D98C', ctaG2: '#C8A34C', ctaG3: '#765316',
    },
    orbs: [[.82, .05, 165, '#F6E3A1', .032], [.08, .40, 150, '#6E4B14', .045],
           [.63, .82, 135, '#9F7A2D', .030], [.28, .19, 72, '#D6B35A', .025]],
  },
  minimalDark: {
    label: 'Graphite', // theme.ts MINIMAL_DARK + orbs :91-94
    vars: {
      bg: '#111318', bg1: '#111318', bg2: '#08090D', bg3: '#010102',
      card: '#121214', surf: '#171717', surf2: '#202024',
      tx: '#F5F5F5', second: '#6EA8FF', mut: '#A7ABB3', ghost: '#747A84',
      bd: 'rgba(255,255,255,0.14)', bdLight: '#2E2E33',
      acc: '#6EA8FF', accBg: 'rgba(110,168,255,0.18)', onAcc: '#0E1A2F',
      gold: '#E9B949', goldBg: 'rgba(233,185,73,0.16)', onGold: '#1A1A1A',
      wrong: '#F26D6D', wrongBg: 'rgba(242,109,109,0.16)',
      cardG1: '#1F2937', cardG2: '#0B0B0C',
      glow: 'rgba(110,168,255,0.16)', hair: 'rgba(255,255,255,0.14)',
    },
    orbs: [[.82, .05, 205, '#6B7280', .16], [.08, .46, 160, '#4B5563', .14],
           [.58, .80, 140, '#374151', .12], [.28, .20, 80, '#9CA3AF', .08]],
  },
  indigo: {
    label: 'Indigo', // theme.ts INDIGO + orbs :116-119
    vars: {
      bg: '#14131F', bg1: '#14131F', bg2: '#0C0B16', bg3: '#010102',
      card: '#1C1B2E', surf: '#222140', surf2: '#2A2952',
      tx: '#F1EFFF', second: '#B7B3D9', mut: '#9A95C2', ghost: '#605C8A',
      bd: 'rgba(200,195,255,0.14)', bdLight: '#34325E',
      acc: '#C8C3FF', accBg: 'rgba(200,195,255,0.14)', onAcc: '#17162B',
      gold: '#FFC53D', goldBg: 'rgba(255,197,61,0.14)', onGold: '#1A1408',
      wrong: '#F26D8A', wrongBg: 'rgba(242,109,138,0.14)',
      cardG1: '#273468', cardG2: '#16152A',
      glow: 'rgba(200,195,255,0.16)', hair: 'rgba(200,195,255,0.14)',
    },
    orbs: [[.82, .05, 205, '#9A95C2', .14], [.08, .46, 160, '#3D3A72', .13],
           [.58, .80, 140, '#273468', .12], [.28, .20, 80, '#C8C3FF', .07]],
  },
};

/* ── Фон экрана: градиент + пульсирующие орбы (+ блум у cinema) ─────────── */
function bgLayer(themeKey) {
  const t = THEMES[themeKey] || THEMES.dark;
  const orbs = (t.orbs || []).map(([x, y, r, c, o], i) =>
    `<i class="orb o${i}" style="left:${x * 100}%;top:${y * 100}%;width:${r}px;height:${r}px;
      margin:-${r / 2}px 0 0 -${r / 2}px;background:radial-gradient(circle,${c} 0%,transparent 66%);opacity:${o}"></i>`).join('');
  const bloom = t.bloom ? `
    <i class="bloom-core"></i>
    <i class="bloom-a" style="background:radial-gradient(ellipse at 50% 100%,${t.vars.bloomA}66 0%,transparent 62%)"></i>
    <i class="bloom-b" style="background:radial-gradient(ellipse at 50% 100%,${t.vars.bloomB}4d 0%,transparent 70%)"></i>
    <i class="stardust"></i>` : '';
  return `<div class="bgl">${orbs}${bloom}</div>`;
}

const BASES = {

  home: (tk) => `
  <div class="bs">${bgLayer(tk)}
    <div class="bs-st"><span>9:41</span><span class="bs-si">▁▃▅ ᯤ ▮</span></div>
    <div class="bs-top">
      <div class="bs-av"><span>🦊</span><i class="bs-lv">12</i></div>
      <div class="bs-who"><b>Максим</b><span>Wordsmith</span></div>
      <div class="bs-stats">
        <div class="bs-pill"><span>🔥</span>28</div>
        <div class="bs-pill"><span>⚡</span>4</div>
      </div>
    </div>
    <div class="bs-xpwrap"><div class="bs-xp"><i style="width:64%"></i></div><em>1240 / 2000 XP</em></div>
    <div class="bs-scroll">
      <div class="bs-c bs-hero">
        <div class="bs-glasstile" style="--tint:var(--acc)">📖</div>
        <div class="bs-badge" style="--tint:var(--acc)">A2 · УРОК 14</div>
        <div class="bs-h">Present Perfect</div>
        <div class="bs-sub">Опыт, который важен сейчас</div>
        <div class="bs-track"><i style="width:42%"></i></div>
        <div class="bs-cta">Продолжить</div>
      </div>
      <div class="bs-c bs-tint-b">
        <div class="bs-glasstile sm" style="--tint:#8FA0FF">🗂</div>
        <div class="bs-badge" style="--tint:#8FA0FF">КАРТОЧКИ</div>
        <div class="bs-h sm">124 слова к повтору</div>
      </div>
      <div class="bs-c bs-tint-r">
        <div class="bs-glasstile sm" style="--tint:var(--wrong)">⚔️</div>
        <div class="bs-badge" style="--tint:var(--wrong)">АРЕНА</div>
        <div class="bs-h sm">Онлайн 312</div>
      </div>
    </div>
    <div class="bs-tabs">${['🏠', '📚', '⚔️', '👥', '⚙️'].map((e, i) => `<div class="bs-tab${i === 0 ? ' on' : ''}"><span>${e}</span></div>`).join('')}</div>
  </div>`,

  lessons: (tk) => `
  <div class="bs">${bgLayer(tk)}
    <div class="bs-st"><span>9:41</span><span class="bs-si">▁▃▅ ᯤ ▮</span></div>
    <div class="bs-nav"><div class="bs-circ">‹</div><b>Выбери уровень</b><div class="bs-circ sm">⚙</div></div>
    <div class="bs-scroll">
      ${[['A1-A2', 'Легко', 'Простые фразы повседневной речи', '🍃', '#38BDF8'],
         ['B1-B2', 'Средне', 'Сложнее — больше опыта за серию', '🔥', '#F87171'],
         ['C1-C2', 'Сложно', 'Элитный уровень. Максимум опыта', '💎', '#C4B5FD']]
        .map(([b, t, s, e, col]) => `
        <div class="bs-c bs-wash" style="--tint:${col}">
          <div class="bs-badge" style="--tint:${col}">${b}</div>
          <div class="bs-h">${t}</div>
          <div class="bs-sub">${s}</div>
          <div class="bs-glasstile abs" style="--tint:${col}">${e}</div>
        </div>`).join('')}
      <div class="bs-c">
        <div class="bs-badge" style="--tint:#5EEAD4">A1 WORDS</div>
        <div class="bs-h">Кухня и готовка</div>
        <div class="bs-sub">Предметы, действия и базовые слова</div>
      </div>
    </div>
    <div class="bs-tabs">${['🏠', '📚', '⚔️', '👥', '⚙️'].map((e, i) => `<div class="bs-tab${i === 1 ? ' on' : ''}"><span>${e}</span></div>`).join('')}</div>
  </div>`,

  lesson: (tk) => `
  <div class="bs">${bgLayer(tk)}
    <div class="bs-st"><span>9:41</span><span class="bs-si">▁▃▅ ᯤ ▮</span></div>
    <div class="bs-nav"><div class="bs-circ">‹</div>
      <div class="bs-chip">УРОК 14 · <em>A2</em></div><div class="bs-pill"><span>⚡</span>4</div></div>
    <div class="bs-track big"><i style="width:58%"></i></div>
    <div class="bs-lbody">
      <div class="bs-label">Составь фразу</div>
      <div class="bs-phrase">Я никогда не был в Лондоне</div>
      <div class="bs-slots"><span class="f">I</span><span class="f">have</span><span class="f">never</span><span class="e"></span><span class="e"></span></div>
      <div class="bs-words">${['been', 'to', 'was', 'in', 'gone', 'London'].map(w => `<span>${w}</span>`).join('')}</div>
    </div>
    <div class="bs-foot"><div class="bs-cta wide">Проверить</div></div>
  </div>`,

  stats: (tk) => `
  <div class="bs">${bgLayer(tk)}
    <div class="bs-st"><span>9:41</span><span class="bs-si">▁▃▅ ᯤ ▮</span></div>
    <div class="bs-nav"><div class="bs-circ">‹</div><b>Статистика</b><div class="bs-circ sm">⋯</div></div>
    <div class="bs-scroll">
      <div class="bs-c">
        <div class="bs-flame"><span>🔵</span><div><b>28</b><em>дней подряд</em></div><i>34 лучший</i></div>
        <div class="bs-week">${['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d, i) =>
          `<div class="bs-day${i < 3 ? ' on' : ''}"><i></i><span>${d}</span></div>`).join('')}</div>
        <div class="bs-inner">🛡 Заморозить цепочку<em>Бесплатно (Премиум)</em></div>
      </div>
      <div class="bs-c bs-sm2"><div class="bs-badge" style="--tint:var(--acc)">АКТИВНЫЕ МНОЖИТЕЛИ</div>
        <div class="bs-h sm">×1.00 <em style="opacity:.5;font-size:12px;font-weight:500">нет бонусов</em></div></div>
      <div class="bs-c">
        <div class="bs-ring"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="33" fill="none" stroke="var(--surf2)" stroke-width="8"/>
          <circle cx="40" cy="40" r="33" fill="none" stroke="var(--acc)" stroke-width="8" stroke-linecap="round"
            stroke-dasharray="207" stroke-dashoffset="62" transform="rotate(-90 40 40)"/></svg><b>28<em>дн.</em></b></div>
        <div class="bs-ringtx"><div class="bs-badge" style="--tint:var(--acc)">БАЛАНС ПРАКТИКИ</div>
          <div class="bs-h sm">Стабильный ритм</div>
          <div class="bs-sub">34 мин в среднем за активный день</div></div>
      </div>
    </div>
    <div class="bs-tabs">${['🏠', '📚', '⚔️', '👥', '⚙️'].map((e, i) => `<div class="bs-tab${i === 4 ? ' on' : ''}"><span>${e}</span></div>`).join('')}</div>
  </div>`,

  plain: (tk) => `<div class="bs">${bgLayer(tk)}<div class="bs-st"><span>9:41</span><span class="bs-si">▁▃▅ ᯤ ▮</span></div></div>`,
};

const BASE_CSS = `
.bs{position:absolute;inset:0;display:flex;flex-direction:column;overflow:hidden;color:var(--tx);
  background:linear-gradient(180deg,var(--bg1) 0%,var(--bg2) 55%,var(--bg3) 100%);
  font-size:13px;letter-spacing:-.005em}
.bgl{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.orb{position:absolute;border-radius:50%;display:block;filter:blur(2px);
  animation:orbPulse 5.2s ease-in-out infinite}
.o1{animation-delay:-1.3s}.o2{animation-delay:-2.6s}.o3{animation-delay:-3.9s}
@keyframes orbPulse{0%,100%{transform:scale(1);opacity:var(--o,1)}50%{transform:scale(1.07)}}
.bloom-core{position:absolute;left:50%;bottom:-70px;width:230px;height:150px;margin-left:-115px;
  background:radial-gradient(ellipse at 50% 100%,rgba(255,255,255,.5) 0%,transparent 60%);filter:blur(14px)}
.bloom-a{position:absolute;left:-16%;right:-16%;bottom:-180px;height:420px;filter:blur(24px)}
.bloom-b{position:absolute;left:-30%;right:-30%;bottom:-250px;height:520px;filter:blur(38px)}
.stardust{position:absolute;inset:0;opacity:.5;background-image:
  radial-gradient(1.2px 1.2px at 18% 22%,#fff9,transparent),radial-gradient(1px 1px at 72% 14%,#fff7,transparent),
  radial-gradient(1.4px 1.4px at 43% 41%,#fff8,transparent),radial-gradient(1px 1px at 86% 55%,#fff6,transparent),
  radial-gradient(1.1px 1.1px at 28% 68%,#fff7,transparent),radial-gradient(1.3px 1.3px at 62% 80%,#fff6,transparent),
  radial-gradient(1px 1px at 8% 48%,#fff5,transparent),radial-gradient(1.2px 1.2px at 92% 30%,#fff6,transparent)}

.bs-st{display:flex;justify-content:space-between;padding:15px 26px 2px;font-size:11.5px;font-weight:700;flex:none;position:relative;z-index:2}
.bs-si{letter-spacing:1.5px;font-size:9px;opacity:.85}
.bs-top{display:flex;gap:11px;align-items:center;padding:14px 18px 0;flex:none;position:relative;z-index:2}
.bs-av{width:46px;height:46px;border-radius:15px;background:var(--surf);display:flex;align-items:center;justify-content:center;
  font-size:23px;position:relative;flex:none;border:1px solid var(--hair);
  box-shadow:0 4px 16px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.06)}
.bs-lv{position:absolute;bottom:-6px;right:-6px;background:var(--gold);color:var(--onGold);font-size:9.5px;font-weight:900;
  border-radius:8px;padding:1.5px 5.5px;font-style:normal;border:2.5px solid var(--bg1)}
.bs-who{flex:1;min-width:0}
.bs-who b{display:block;font-size:16px;font-weight:800;letter-spacing:-.02em}
.bs-who span{display:block;font-size:11px;color:var(--second);margin-top:1px;font-weight:650;letter-spacing:.02em}
.bs-stats{display:flex;gap:6px;flex:none}
.bs-pill{display:flex;align-items:center;gap:4px;background:var(--surf);border:1px solid var(--bd);border-radius:11px;
  padding:5px 9px;font-size:11.5px;font-weight:800}
.bs-xpwrap{padding:11px 18px 0;flex:none;position:relative;z-index:2}
.bs-xp{height:5px;background:var(--surf);border-radius:3px;overflow:hidden}
.bs-xp i{display:block;height:100%;background:linear-gradient(90deg,var(--gold),color-mix(in srgb,var(--gold) 55%,#fff));border-radius:3px}
.bs-xpwrap em{display:block;font-size:9.5px;color:var(--ghost);margin-top:4px;font-style:normal;font-weight:650;letter-spacing:.03em}

.bs-nav{display:flex;align-items:center;gap:12px;padding:12px 18px;flex:none;position:relative;z-index:2}
.bs-nav b{font-size:20px;font-weight:800;letter-spacing:-.025em;flex:1}
.bs-circ{width:38px;height:38px;border-radius:50%;background:var(--surf);border:1px solid var(--bd);
  display:flex;align-items:center;justify-content:center;font-size:18px;color:var(--tx);flex:none}
.bs-circ.sm{font-size:14px;color:var(--acc)}
.bs-chip{flex:1;text-align:center;background:var(--surf);border:1px solid var(--bd);border-radius:14px;padding:8px 14px;
  font-size:12.5px;font-weight:850;letter-spacing:.04em}
.bs-chip em{color:var(--acc);font-style:normal}

.bs-scroll{flex:1;overflow:hidden;padding:12px 16px 8px;display:flex;flex-direction:column;gap:11px;position:relative;z-index:2}
.bs-c{background:linear-gradient(148deg,color-mix(in srgb,var(--cardG1) 34%,var(--card)),var(--card) 58%,var(--cardG2));
  border:1px solid var(--bd);border-radius:22px;padding:16px 17px;position:relative;overflow:hidden;
  box-shadow:0 10px 26px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.045)}
.bs-c.bs-sm2{padding:13px 16px}
.bs-wash::before{content:'';position:absolute;inset:0;background:
  radial-gradient(120% 90% at 88% 8%,color-mix(in srgb,var(--tint) 26%,transparent),transparent 62%);pointer-events:none}
.bs-tint-b::before{content:'';position:absolute;inset:0;background:radial-gradient(110% 90% at 92% 10%,rgba(143,160,255,.16),transparent 60%)}
.bs-tint-r::before{content:'';position:absolute;inset:0;background:radial-gradient(110% 90% at 92% 10%,rgba(240,84,84,.14),transparent 60%)}
.bs-hero{padding:18px}
.bs-badge{display:inline-block;font-size:10px;font-weight:900;letter-spacing:.1em;padding:4.5px 10px;border-radius:9px;
  background:color-mix(in srgb,var(--tint,var(--acc)) 15%,transparent);color:var(--tint,var(--acc));
  border:1px solid color-mix(in srgb,var(--tint,var(--acc)) 34%,transparent);position:relative;z-index:2}
.bs-h{font-size:23px;font-weight:850;letter-spacing:-.03em;margin-top:10px;position:relative;z-index:2;line-height:1.14}
.bs-h.sm{font-size:16px;margin-top:8px;letter-spacing:-.02em}
.bs-sub{font-size:13px;color:var(--mut);margin-top:6px;line-height:1.42;position:relative;z-index:2;max-width:74%}
.bs-glasstile{width:58px;height:58px;border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:26px;
  background:color-mix(in srgb,var(--tint,var(--acc)) 13%,transparent);
  border:1px solid color-mix(in srgb,var(--tint,var(--acc)) 32%,transparent);
  box-shadow:0 0 24px color-mix(in srgb,var(--tint,var(--acc)) 22%,transparent),inset 0 1px 0 rgba(255,255,255,.08);
  position:relative;z-index:2;backdrop-filter:blur(6px)}
.bs-glasstile.abs{position:absolute;top:50%;right:16px;margin-top:-29px}
.bs-glasstile.sm{width:40px;height:40px;border-radius:13px;font-size:19px}
.bs-track{height:8px;background:rgba(0,0,0,.4);border-radius:5px;margin-top:13px;overflow:hidden;position:relative;z-index:2;
  border:1px solid rgba(255,255,255,.05)}
.bs-track.big{margin:2px 18px 0;flex:none;position:relative;z-index:2}
.bs-track i{display:block;height:100%;border-radius:5px;
  background:linear-gradient(90deg,color-mix(in srgb,var(--acc) 72%,#000),var(--acc),color-mix(in srgb,var(--acc) 55%,#fff))}
.bs-cta{margin-top:14px;border-radius:15px;padding:13px;text-align:center;font-weight:850;font-size:14.5px;
  background:linear-gradient(180deg,color-mix(in srgb,var(--acc) 78%,#fff),var(--acc) 55%,color-mix(in srgb,var(--acc) 68%,#000));
  color:var(--onAcc);position:relative;z-index:2;
  box-shadow:0 6px 18px color-mix(in srgb,var(--acc) 26%,transparent),inset 0 1px 0 rgba(255,255,255,.35)}
.bs-cta.wide{margin:0}
.bs-tabs{display:flex;padding:10px 12px 24px;border-top:1px solid var(--bd);flex:none;position:relative;z-index:2;
  background:color-mix(in srgb,var(--bg3) 72%,transparent);backdrop-filter:blur(14px)}
.bs-tab{flex:1;display:flex;justify-content:center}
.bs-tab span{font-size:20px;opacity:.3;filter:grayscale(1)}
.bs-tab.on span{opacity:1;filter:none}

.bs-lbody{flex:1;padding:24px 20px 10px;display:flex;flex-direction:column;position:relative;z-index:2}
.bs-label{font-size:10px;text-transform:uppercase;letter-spacing:.13em;color:var(--ghost);font-weight:850}
.bs-phrase{font-size:21px;font-weight:800;margin-top:10px;line-height:1.28;letter-spacing:-.025em}
.bs-slots{display:flex;flex-wrap:wrap;gap:8px;margin-top:28px}
.bs-slots span{padding:9px 14px;border-radius:13px;font-size:14px;font-weight:750}
.bs-slots .f{background:var(--surf);border:1px solid var(--bd);box-shadow:0 3px 10px rgba(0,0,0,.4)}
.bs-slots .e{width:62px;border-bottom:2px solid var(--bdLight);border-radius:0}
.bs-words{display:flex;flex-wrap:wrap;gap:9px;margin-top:auto}
.bs-words span{padding:10px 15px;border-radius:14px;background:var(--card);border:1px solid var(--bd);font-size:14px;font-weight:750;
  box-shadow:0 4px 12px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.05)}
.bs-foot{padding:12px 20px 28px;flex:none;position:relative;z-index:2}

.bs-flame{display:flex;align-items:center;gap:12px;position:relative;z-index:2}
.bs-flame span{font-size:30px}
.bs-flame b{font-size:30px;font-weight:900;letter-spacing:-.03em;display:block;line-height:1}
.bs-flame em{font-size:11.5px;color:var(--mut);font-style:normal}
.bs-flame i{margin-left:auto;font-size:11px;color:var(--ghost);font-style:normal;text-align:right}
.bs-week{display:flex;gap:6px;margin-top:15px;position:relative;z-index:2}
.bs-day{flex:1;text-align:center}
.bs-day i{display:block;width:26px;height:26px;border-radius:50%;background:var(--surf2);margin:0 auto}
.bs-day.on i{background:var(--acc);box-shadow:0 0 14px color-mix(in srgb,var(--acc) 45%,transparent)}
.bs-day span{display:block;font-size:9.5px;color:var(--mut);margin-top:5px;font-weight:650}
.bs-inner{margin-top:15px;border:1px solid var(--bd);border-radius:15px;padding:12px 14px;font-size:13px;font-weight:750;
  position:relative;z-index:2;background:rgba(255,255,255,.02)}
.bs-inner em{display:block;font-size:11px;color:var(--ghost);font-style:normal;font-weight:550;margin-top:2px}
.bs-ring{width:80px;height:80px;position:relative;flex:none;display:inline-block;vertical-align:top}
.bs-ring svg{width:80px;height:80px}
.bs-ring b{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
  font-size:20px;font-weight:900;letter-spacing:-.03em}
.bs-ring b em{font-size:9px;font-weight:600;color:var(--mut);font-style:normal}
.bs-ringtx{display:inline-block;width:calc(100% - 94px);margin-left:12px;vertical-align:top;position:relative;z-index:2}
`;
