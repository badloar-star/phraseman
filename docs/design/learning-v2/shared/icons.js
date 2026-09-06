/* Единый набор SVG-глифов макетов (24×24, stroke 2, round). Без эмодзи и растра.
   Использование: <svg class="i"><use href="#i-lock"/></svg> */
(function () {
  const sprite = `
<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">
  <symbol id="i-chevron-left" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-chevron-right" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-close" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></symbol>
  <symbol id="i-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-lock" viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="3" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></symbol>
  <symbol id="i-star" viewBox="0 0 24 24"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z" fill="currentColor"/></symbol>
  <symbol id="i-bolt" viewBox="0 0 24 24"><path d="M13.5 2L4 14h7l-1.5 8L20 10h-7z" fill="currentColor"/></symbol>
  <symbol id="i-play" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></symbol>
  <symbol id="i-refresh" viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M20 4v5h-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-cloud-off" viewBox="0 0 24 24"><path d="M7 18h10a4 4 0 0 0 .7-7.9A6 6 0 0 0 6.5 9.5 4.3 4.3 0 0 0 7 18z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M4 4l16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></symbol>
  <symbol id="i-book" viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20" fill="none" stroke="currentColor" stroke-width="2.2"/></symbol>
  <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></symbol>
  <symbol id="i-tasks" viewBox="0 0 24 24"><path d="M5 7h14M5 12h14M5 17h9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></symbol>
  <symbol id="i-mute" viewBox="0 0 24 24"><path d="M4 9.5v5h3.5L13 19V5L7.5 9.5z" fill="currentColor"/><path d="M16.5 9.5l4 5M20.5 9.5l-4 5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></symbol>
  <symbol id="i-sound" viewBox="0 0 24 24"><path d="M4 9.5v5h3.5L13 19V5L7.5 9.5z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></symbol>
  <symbol id="i-arrow-up" viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-arrow-right" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-sparkle" viewBox="0 0 24 24"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" fill="currentColor"/></symbol>
  <symbol id="i-mic" viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></symbol>
  <symbol id="i-signal" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor"/><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="currentColor"/><rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor"/><rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor"/></symbol>
  <symbol id="i-wifi" viewBox="0 0 18 12"><path d="M1.5 4.5a11 11 0 0 1 15 0M4.2 7.2a7 7 0 0 1 9.6 0M6.9 9.9a3 3 0 0 1 4.2 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></symbol>
  <symbol id="i-battery" viewBox="0 0 28 12"><rect x="0.8" y="0.8" width="23" height="10.4" rx="3" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".5"/><rect x="2.5" y="2.5" width="18" height="7" rx="1.8" fill="currentColor"/><path d="M25.5 4v4a2 2 0 0 0 0-4z" fill="currentColor" opacity=".5"/></symbol>
</svg>`;
  const mount = () => {
    const wrap = document.createElement("div");
    wrap.innerHTML = sprite;
    document.body.insertBefore(wrap.firstElementChild, document.body.firstChild);
  };
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);

  window.statusbarHTML = function (time) {
    return `<div class="statusbar"><span>${time || "9:41"}</span><span class="sb-right"><svg viewBox="0 0 18 12"><use href="#i-signal"/></svg><svg viewBox="0 0 18 12"><use href="#i-wifi"/></svg><svg viewBox="0 0 28 12" style="width:28px"><use href="#i-battery"/></svg></span></div>`;
  };
  window.starsHTML = function (n, size) {
    const s = size || 12;
    let h = '<span class="stars" aria-label="' + n + ' из 3">';
    for (let i = 0; i < 3; i += 1) h += `<svg class="${i < n ? "" : "off"}" style="width:${s}px;height:${s}px"><use href="#i-star"/></svg>`;
    return h + "</span>";
  };
})();
