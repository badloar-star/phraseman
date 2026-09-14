(function (global) {
 'use strict';
 function render(svg, options = {}) {
  if (options.kind === 'gift') return svg;
  const art = global.PhrasemanCertificateArt || (typeof require === 'function' ? require('./certificate-art.js') : {});
  const key = 'test-' + (options.theme || 'gold');
  const image = art[key];
  if (!image) return svg;
  return svg.replace(/<path d="M900[^>]+\/>/, '')
   .replace(/<rect x="32"[^>]+\/>/, '')
   .replace(/(<rect width="1200"[^>]+\/>)/, '$1' + `<image href="${image}" width="1200" height="800" preserveAspectRatio="xMidYMid slice"/>`)
   .replaceAll('<text x="80"', '<text x="600" text-anchor="middle"')
   .replace('M80 404h690', 'M260 404h680');
 }
 if (typeof module !== 'undefined') module.exports = render;
 global.renderPremiumCertificate = render;
})(typeof window !== 'undefined' ? window : globalThis);
