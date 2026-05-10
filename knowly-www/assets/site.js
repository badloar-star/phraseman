(function () {
  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }
  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  /** PhraseMan dropdown (desktop) */
  var dd = qs('.km-dd');
  var ddBtn = qs('.km-dd-btn');
  if (dd && ddBtn) {
    ddBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      dd.classList.toggle('open');
    });
    document.addEventListener('click', function () {
      dd.classList.remove('open');
    });
    qsa('.km-dd-panel a').forEach(function (a) {
      a.addEventListener('click', function () {
        dd.classList.remove('open');
      });
    });
  }

  var overlay = qs('#km-overlay');
  var drawer = qs('#km-drawer');
  var burger = qs('#km-burger');

  function closeDrawer() {
    if (overlay) overlay.classList.remove('open');
    if (drawer) drawer.classList.remove('open');
    document.body.style.overflow = '';
  }
  function openDrawer() {
    if (overlay) overlay.classList.add('open');
    if (drawer) drawer.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  if (burger) {
    burger.addEventListener('click', function () {
      if (drawer && drawer.classList.contains('open')) closeDrawer();
      else openDrawer();
    });
  }
  if (overlay) overlay.addEventListener('click', closeDrawer);

  qsa('[data-drawer-close]').forEach(function (el) {
    el.addEventListener('click', closeDrawer);
  });
})();
