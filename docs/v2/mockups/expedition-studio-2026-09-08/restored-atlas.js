// Artwork and routes preserved from the approved Atlas mockup.
const atlasRoutes = [
  [[78,76],[185,114],[289,189],[217,275],[98,328],[117,434],[265,487],[284,606]],
  [[293,75],[184,104],[91,179],[112,282],[245,318],[296,424],[191,483],[111,607]],
  [[89,76],[115,184],[253,213],[294,310],[177,357],[78,446],[186,514],[283,615]],
  [[190,71],[81,155],[133,249],[277,253],[295,362],[186,428],[81,515],[184,612]],
  [[73,81],[201,123],[292,210],[179,275],[89,379],[209,414],[296,511],[187,611]],
  [[285,83],[150,119],[78,226],[193,259],[292,361],[188,429],[90,493],[147,614]],
  [[193,78],[285,158],[240,251],[110,281],[80,385],[213,424],[295,512],[188,616]]
];
function atlasLandmark(index){
  const monuments = [
    '<path d="M-13 60V18a23 23 0 0 1 46 0v42H23V20a13 13 0 0 0-26 0v40Z" fill="var(--accent)" opacity=".8"/><path d="M33 60 42 54V15C42-6 21-17 8-10c18-1 25 12 25 28Z" fill="var(--terrain)"/><path d="M-20 61 13 75 47 59 16 47Z" fill="var(--terrain3)"/><path d="m-23 67 36 16 38-19v7L13 91-23 74Z" fill="var(--terrain)"/><path d="M-11 18a21 21 0 0 1 42 0" fill="none" stroke="var(--gold)"/><circle cx="10" cy="26" r="6" fill="var(--gold)"/><path d="M10 3v47" stroke="var(--accent)" opacity=".25"/>',
    '<path d="m-13 65 9-57 20 0 12 57Z" fill="var(--accent)" opacity=".8"/><path d="M8 8h8l12 57H8Z" fill="var(--terrain3)"/><path d="m-9 7 18-10 18 10-18 8Z" fill="var(--gold)"/><path d="M-4 5V-12h24V5" fill="var(--terrain)" stroke="var(--accent)"/><path d="m-8-13 16-14 18 14Z" fill="var(--terrain3)"/><path d="M-3-4h22" stroke="var(--gold)" stroke-width="3"/><path d="m9-5 65-22v45Z" fill="var(--accent)" opacity=".08"/>',
    '<path d="M-28 62V3L-7-9 6 0v62Zm40 0V-17l22-12 13 9v82Z" fill="var(--terrain3)"/><path d="M-7-9V53L6 62V0m28-29v82l13 9v-82" fill="var(--terrain)"/><path d="M-31 3-8-10 9 0-14 13Zm40-20 24-13 17 10-24 13Z" fill="var(--accent)" opacity=".7"/><path d="M-13 15 27 3v9l-40 13Z" fill="var(--gold)" opacity=".7"/>',
    '<path d="m9-35 26 80-26 26-26-26Z" fill="var(--terrain3)"/><path d="M9-35V71l26-26Z" fill="var(--terrain)"/><path d="m9-35-6 76 6 30-26-26Z" fill="var(--accent)" opacity=".6"/><ellipse cx="9" cy="30" rx="44" ry="13" fill="none" stroke="var(--gold)" transform="rotate(-25 9 30)"/><circle cx="-24" cy="45" r="4" fill="var(--gold)"/>',
    '<circle cx="10" cy="9" r="34" fill="var(--gold)" opacity=".85"/><circle cx="10" cy="9" r="25" fill="var(--terrain)"/><path d="M-17 64 10 5 39 64Z" fill="var(--terrain3)"/><path d="M10 5v59h29Z" fill="var(--terrain)"/><path d="M-27 68h75M-32 75h85" stroke="var(--accent)" opacity=".6" stroke-width="3"/>',
    '<path d="m-31 64 24-68 22 30 12-49 24 87Z" fill="var(--terrain3)"/><path d="m-7-4 3 68H-31Zm34-19 2 87h22Z" fill="var(--accent)" opacity=".7"/><path d="m-7-4 22 30 12-49 2 87H-4Z" fill="var(--terrain)"/><path d="m-18 27 11 4 10-15m17-3 7 5 8-9" fill="none" stroke="var(--accent)" opacity=".7"/>',
    '<path d="M-20 63V21a30 30 0 0 1 60 0v42Z" fill="var(--terrain3)"/><path d="M-11 63V23a21 21 0 0 1 42 0v40Z" fill="var(--terrain)"/><path d="M-1 63V24a11 11 0 0 1 22 0v39Z" fill="var(--accent)" opacity=".7"/><path d="m-30 64 40 17 41-17M-33 72l43 17 44-17" fill="none" stroke="var(--gold)"/><circle cx="10" cy="-9" r="6" fill="var(--gold)"/>'
  ];
  return `<g class="landmark" transform="translate(177 46)"><ellipse cx="10" cy="70" rx="52" ry="17" fill="#000" opacity=".17"/>${monuments[index%7]}</g>`;
}
let atlasArtId = 0;
function atlasLandscape(index, tall=false){
  const id = `terrain-${atlasArtId++}`;
  const rotate = [0,18,-18,35,-28,12,44][index%7];
  return `<svg class="${tall?'map-terrain':'landscape'}" viewBox="0 0 390 ${tall?695:260}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs><linearGradient id="${id}-water" x2=".7" y2="1"><stop stop-color="var(--surface2)"/><stop offset="1" stop-color="var(--bg)"/></linearGradient><linearGradient id="${id}-rock" x2=".4" y2="1"><stop stop-color="var(--terrain2)"/><stop offset="1" stop-color="var(--terrain)"/></linearGradient><linearGradient id="${id}-top" x2="1" y2="1"><stop stop-color="var(--terrain3)"/><stop offset="1" stop-color="var(--terrain2)"/></linearGradient></defs>
  <rect width="390" height="${tall?695:260}" fill="url(#${id}-water)"/>
  <g fill="none" stroke="var(--terrain3)" opacity=".12" stroke-width=".7"><path d="M-30 110Q70 0 180 80T430 55M-40 118Q70 8 180 88T430 63M-40 126Q70 16 180 96T430 71M-40 134Q70 24 180 104T430 79M-40 142Q70 32 180 112T430 87"/><path d="M-50 230Q80 95 210 180T450 145M-50 240Q80 105 210 190T450 155M-50 250Q80 115 210 200T450 165M-50 260Q80 125 210 210T450 175"/></g>
  <g transform="translate(${tall?-30:8} ${tall?150:10}) rotate(${rotate} 190 140) scale(${tall?1.14:.97})">
   <path d="M58 160C34 136 62 94 109 80L173 42C215 20 252 47 270 66L315 97C352 119 339 171 310 188L230 225C186 247 140 225 128 208L79 195Z" fill="#000" opacity=".22" transform="translate(1 21)"/>
   <path d="M58 160C34 136 62 94 109 80L173 42C215 20 252 47 270 66L315 97C352 119 339 171 310 188L230 225C186 247 140 225 128 208L79 195Z" fill="var(--terrain)" stroke="var(--terrain2)" stroke-width="1" transform="translate(0 12)"/>
   <path d="M58 160C34 136 62 94 109 80L173 42C215 20 252 47 270 66L315 97C352 119 339 171 310 188L230 225C186 247 140 225 128 208L79 195Z" fill="url(#${id}-rock)" stroke="var(--terrain3)" stroke-opacity=".5"/>
   <path d="M77 143C68 122 100 108 128 101L183 65C208 48 238 64 250 80L295 112C320 129 306 157 285 169L222 201C191 215 164 196 153 184L104 171Z" fill="var(--terrain)" stroke="var(--terrain3)" stroke-opacity=".5" transform="translate(0 -9)"/>
   <path d="M94 133C87 113 124 111 145 91L193 66C214 56 236 79 247 89L283 116C301 130 283 149 266 157L219 183C197 194 178 174 160 170L114 156Z" fill="url(#${id}-top)" stroke="var(--accent)" stroke-opacity=".23" transform="translate(0 -13)"/>
   <path d="m148 121 25-28 33 3 25 35-36 18Z" fill="var(--terrain2)" stroke="var(--accent)" stroke-opacity=".15"/>
   ${atlasLandmark(index)}
   <g fill="var(--terrain)" stroke="var(--terrain3)" stroke-width=".8"><path d="m87 147 11-24 12 24Z"/><path d="m260 138 10-22 13 22Z"/><path d="m230 174 9-19 10 19Z"/></g>
  </g>
  ${tall?`<g transform="translate(180 430) rotate(-20)"><path d="M-10 20C-42-13 3-56 53-42S132-6 104 33 35 68-10 20Z" fill="var(--terrain)" transform="translate(0 12)"/><path d="M-10 20C-42-13 3-56 53-42S132-6 104 33 35 68-10 20Z" fill="var(--terrain2)" stroke="var(--terrain3)"/><path d="M5 9C-12-15 15-36 49-26S104-5 80 20 29 43 5 9Z" fill="var(--terrain3)" opacity=".7"/></g><g fill="none" stroke="var(--terrain3)" opacity=".14"><path d="M-30 500Q140 365 255 503T440 480M-30 511Q140 376 255 514T440 491M-30 522Q140 387 255 525T440 502M-30 533Q140 398 255 536T440 513M-30 544Q140 409 255 547T440 524"/></g>`:''}
  <g fill="var(--accent)" opacity=".24"><circle cx="33" cy="69" r="1"/><circle cx="352" cy="173" r="1"/><circle cx="291" cy="35" r="1"/><path d="M334 55h7m-3.5-3.5v7M40 205h7m-3.5-3.5v7" stroke="var(--accent)" stroke-width=".6"/></g></svg>`;
}

function atlasCurve(points){if(!points.length)return '';let d=`M ${points[0][0]} ${points[0][1]}`;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];const delta=(b[1]-a[1])*.62;d+=` C ${a[0]} ${a[1]+delta} ${b[0]} ${b[1]-delta} ${b[0]} ${b[1]}`;}return d;}
function atlasPortalWindow(ordinal){return `<div class="world-portal variant-${ordinal%7}" aria-hidden="true"><div class="portal-halo"></div><div class="portal-rim"><div class="portal-sky"><span class="world-sun"></span><span class="distant-ridge ridge-one"></span><span class="distant-ridge ridge-two"></span><div class="portal-land">${atlasLandscape(ordinal%7)}</div><div class="portal-mist"></div></div></div><div class="portal-step step-back"></div><div class="portal-step step-front"></div><span class="portal-sigil">${String(ordinal+1).padStart(2,'0')}</span></div>`;}
