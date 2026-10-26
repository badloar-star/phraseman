export function markerWeight(r,g,b,marker='cyan'){
  if(!['cyan','green'].includes(marker))throw new Error('Unsupported marker: '+marker);
  const separation=marker==='green'?Math.min(g-r,g-b):Math.min(g-r,b-r);
  return Math.max(0,Math.min(1,(separation-12)/22));
}
