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
  <!-- Глифы раздела «Диалоги» -->
  <symbol id="i-chat" viewBox="0 0 24 24"><path d="M4 6.5A3.5 3.5 0 0 1 7.5 3h9A3.5 3.5 0 0 1 20 6.5v7a3.5 3.5 0 0 1-3.5 3.5H10l-4.2 3.2c-.6.5-1.3 0-1.3-.7V17A3.5 3.5 0 0 1 4 13.5z" fill="currentColor"/></symbol>
  <symbol id="i-translate" viewBox="0 0 24 24"><path d="M3 5h9M7.5 3v2M10 5c-.6 3.6-2.8 6.6-6 8.5M5 8c1 2.6 3.2 4.6 6 5.6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12.5 21l4-10 4 10M14 17.5h5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-bulb" viewBox="0 0 24 24"><path d="M9 18.5h6M10 21h4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M12 2.8a6.2 6.2 0 0 0-3.6 11.2c.7.6 1.1 1.3 1.1 2.1h5c0-.8.4-1.5 1.1-2.1A6.2 6.2 0 0 0 12 2.8z" fill="currentColor"/></symbol>
  <symbol id="i-send" viewBox="0 0 24 24"><path d="M12 19V6M6 12l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-chest" viewBox="0 0 24 24"><path d="M3 10a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v1H3z" fill="currentColor"/><path d="M3 12.5h18V18a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18z" fill="currentColor" opacity=".72"/><rect x="10" y="10" width="4" height="5" rx="1.2" fill="var(--bg, #000)" opacity=".55"/></symbol>
  <symbol id="i-medal" viewBox="0 0 24 24"><path d="M8 2.5h3l1 4-2.5 1.5zM16 2.5h-3l-1 4 2.5 1.5z" fill="currentColor" opacity=".6"/><circle cx="12" cy="14.5" r="6.5" fill="currentColor"/><path d="M12 11l1.1 2.2 2.4.3-1.8 1.7.5 2.4-2.2-1.2-2.2 1.2.5-2.4-1.8-1.7 2.4-.3z" fill="var(--bg, #000)" opacity=".5"/></symbol>
  <symbol id="i-flame" viewBox="0 0 24 24"><path d="M12 2.5c.6 3.4 3.2 4.6 4.6 7.2 1.9 3.5.6 8.3-3.6 9.9.9-1.7.6-3.3-.6-4.6-1 1-1.6 2.3-1.3 3.9C8.4 18.2 6.6 15 7.4 11.8 8.3 8.4 11.8 6.5 12 2.5z" fill="currentColor"/></symbol>
  <symbol id="i-board" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2.5" fill="currentColor"/><path d="M12 16v4M8.5 20.5h7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M7 8.5h7M7 11.5h4" fill="none" stroke="var(--bg, #000)" stroke-width="1.8" stroke-linecap="round" opacity=".55"/></symbol>
  <symbol id="i-target" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></symbol>
  <symbol id="i-cup" viewBox="0 0 24 24"><path d="M7 3.5h10v6a5 5 0 0 1-10 0z" fill="currentColor"/><path d="M17 5h2.5a2.5 2.5 0 0 1 0 5H17M7 5H4.5a2.5 2.5 0 0 0 0 5H7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 14.5v3M8.5 20.5h7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></symbol>
  <symbol id="i-coffee" viewBox="0 0 24 24"><path d="M4 8.5h12v5.5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" fill="currentColor"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M8 3.5c0 1.2 1.5 1.3 1.5 2.5M12 3.5c0 1.2 1.5 1.3 1.5 2.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></symbol>
  <symbol id="i-plane" viewBox="0 0 24 24"><path d="M2.5 13.2l7.2 2.2 2.2 6.2 2-4.2 5.8-9.4c.8-1.3-.5-2.6-1.8-1.8L8.5 12z" fill="currentColor"/></symbol>
  <symbol id="i-people" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5" fill="currentColor"/><circle cx="16.5" cy="9.5" r="2.6" fill="currentColor" opacity=".75"/><path d="M2.5 19.5a6.5 6.5 0 0 1 13 0zM14.5 18.5a5 5 0 0 1 7 0z" fill="currentColor" opacity=".9"/></symbol>
  <symbol id="i-briefcase" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="3" fill="currentColor"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M3 12.5h18" fill="none" stroke="var(--bg, #000)" stroke-width="1.6" opacity=".5"/></symbol>
  <symbol id="i-grad" viewBox="0 0 24 24"><path d="M12 4l10 4.5-10 4.5L2 8.5z" fill="currentColor"/><path d="M6 11v4.5c0 1.7 2.7 3 6 3s6-1.3 6-3V11" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M21 9v5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></symbol>
  <symbol id="i-cards" viewBox="0 0 24 24"><rect x="3" y="6" width="13" height="15" rx="2.5" fill="currentColor" opacity=".55"/><rect x="8" y="3" width="13" height="15" rx="2.5" fill="currentColor"/></symbol>
  <symbol id="i-history" viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.3-5.7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M4 4v5h5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 8v4l3 2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></symbol>
  <symbol id="i-ear" viewBox="0 0 24 24"><path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 3-2.2 3.6-2.6 5.6-.3 1.7-1.2 3-3 3" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/><path d="M10 10a2 2 0 0 1 4 0c0 1.4-1.5 1.6-1.5 3" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/></symbol>
  <symbol id="i-more" viewBox="0 0 24 24"><circle cx="6" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="18" cy="12" r="2" fill="currentColor"/></symbol>
  <symbol id="i-pen" viewBox="0 0 24 24"><path d="M4 20l4.2-.9L19.5 7.8a2 2 0 0 0 0-2.8l-.5-.5a2 2 0 0 0-2.8 0L4.9 15.8z" fill="currentColor"/></symbol>
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
