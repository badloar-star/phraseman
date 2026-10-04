/* Выбор темы для «стеклянной» версии раздела: меняет цвета на всех телефонах сразу (цвет карточек = цвет темы, градиент внутри). */
(() => {
  const THEMES = [['Аврора', '#38E0AA', '#7C5CFF', '#7EF0C8', '#04261D'], ['Ирис', '#788CFF', '#FF78C8', '#C7C9FF', '#1B1C4A'], ['Магма', '#FF5A28', '#FFAA3C', '#FFB27A', '#3A1204'],
    ['Полночь', '#286EFF', '#00D2FF', '#8CC4FF', '#06224D'], ['Нефрит', '#14BEA0', '#1E78C8', '#7FE6D2', '#032A24'], ['Орхидея', '#D246FF', '#FF3C8C', '#EAA6FF', '#3A0A4A']];
  let idx = 0;
  const apply = () => {
    const T = THEMES[idx];
    document.querySelectorAll('.ph').forEach((p) => { p.style.setProperty('--g1', T[1]); p.style.setProperty('--g2', T[2]); p.style.setProperty('--acc', T[3]); p.style.setProperty('--on', T[4]); });
    document.querySelectorAll('.chip').forEach((c, i) => c.classList.toggle('on', i === idx));
  };
  const nav = document.getElementById('nav') || document.querySelector('.page-nav');
  nav.insertAdjacentHTML('afterend', `<div class="ctl"><div class="chips2" id="chips">${THEMES.map((T, i) => `<span class="chip${i === 0 ? ' on' : ''}" data-i="${i}"><i class="sw" style="background:linear-gradient(135deg,${T[1]},${T[2]})"></i>${T[0]}</span>`).join('')}</div></div>`);
  document.getElementById('chips').addEventListener('click', (e) => { const c = e.target.closest('.chip'); if (!c) return; idx = +c.dataset.i; apply(); });
  apply();
})();
