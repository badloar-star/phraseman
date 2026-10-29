import assert from 'node:assert/strict';
import { markerWeight } from './clay-marker.mjs';
assert.equal(markerWeight(0,255,0,'green'),1);
assert.equal(markerWeight(0,255,255,'cyan'),1);
for(const rgb of [[0,85,164],[0,255,255],[255,0,0],[255,204,0],[242,240,236],[50,50,50]])assert.equal(markerWeight(...rgb,'green'),0,'Flag colors and neutral clay must remain unchanged');
let cyanChecks=0;
for(let r=0;r<=255;r+=17)for(let g=0;g<=255;g+=17)for(let b=0;b<=255;b+=17){
  assert.equal(markerWeight(r,g,b),Math.max(0,Math.min(1,(Math.min(g-r,b-r)-12)/22)),'Default cyan extraction must remain byte-compatible');
  cyanChecks++;
}
assert.throws(()=>markerWeight(0,255,0,'unknown'),/Unsupported marker/);
console.log(JSON.stringify({cyanChecks,flagColorsPreserved:true,greenMarker:true}));
