// зачем: макет страницы 404 в стиле 2.0 — тексты дословно с knowly-www/404/index.html (обращение на «ты»).
// Образец модуля страницы для остальных групп: default — массив описаний страниц.
import { ic } from '../_shell.mjs';

export default [
  {
    file: '404.html',
    title: 'Страница не найдена',
    group: 'Служебные',
    path: '/404/',
    body: `
<section class="block" style="padding-block:clamp(48px,9vw,120px)"><div class="wrap" style="display:grid;justify-items:center;text-align:center;gap:22px">
  <div class="nf" aria-hidden="true">404</div>
  <span class="ov">404 · Страница не найдена</span>
  <h1 class="h2" data-en-html="That page is unavailable.&lt;span class=&quot;l2&quot;&gt;Return home.&lt;/span&gt;">Страница не найдена.<span class="l2">Вернёмся к началу.</span></h1>
  <p style="color:var(--sec);font-size:var(--t-l);max-width:34ch">Эта дорога никуда не ведёт. Но до главной — всего один шаг.</p>
  <a class="btn btn-primary" href="index.html"><span data-en="Return home">Вернуться на главную</span> ${ic('arrow', 's18 arr')}</a>
</div></section>`,
  },
];
