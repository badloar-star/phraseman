import { File } from 'expo-file-system';
import React, { memo, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import WebView from 'react-native-webview';

import {
  premiumThemePackRevision,
  resolveActivePremiumThemeArt,
  subscribePremiumThemePackCache,
} from '../../../../app/premium_theme_pack_cache';
import type { LiquidGlassThemeId } from '../../../../constants/liquidGlassThemePalette';
import { PREMIUM_MOTION_PIGMENTS, premiumThemeVisualSpec } from '../../../../constants/premiumThemeVisualSpecs';
import {
  PREMIUM_GRAVITY_FRAGMENT,
  PREMIUM_MATERIAL_CSS,
  PREMIUM_SIGNAL_FRAGMENT,
  PREMIUM_STORM_FRAGMENT,
} from './premium_theme_motion_sources';

type Props = Readonly<{ themeId: LiquidGlassThemeId; isLight: boolean; width: number; height: number }>;

const VERTEX = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
const WEBGL_THEMES = new Map<string, Readonly<{ family: string; fragment: string }>>([
  ['grad_full_ref_signal_lime', { family: 'signal', fragment: PREMIUM_SIGNAL_FRAGMENT }],
  ['grad_full_ref_storm_violet', { family: 'storm', fragment: PREMIUM_STORM_FRAGMENT }],
  ['grad_full_ref_gravity_blue', { family: 'gravity', fragment: PREMIUM_GRAVITY_FRAGMENT }],
]);

function csp(): string {
  return "default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'";
}

function cssHtml(themeId: keyof typeof PREMIUM_MATERIAL_CSS, reducedMotion: boolean): string {
  const motion = PREMIUM_MATERIAL_CSS[themeId];
  const paused = reducedMotion ? 'animation:none!important;opacity:.88' : '';
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><meta http-equiv="Content-Security-Policy" content="${csp()}"><style>
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent}#fx{position:absolute;inset:0;overflow:hidden}
#fx:before,#fx:after{content:'';position:absolute;pointer-events:none;animation:premium-material ${motion.duration}s ease-in-out infinite alternate;transform-origin:65% 35%;${paused}}
#fx:before{${motion.before}}#fx:after{${motion.after};animation-duration:${motion.duration * 1.3}s;animation-delay:-${motion.duration / 2}s;animation-direction:alternate-reverse}
@keyframes premium-material{from{transform:${motion.from};opacity:.72}to{transform:${motion.to};opacity:1}}
@media(prefers-reduced-motion:reduce){#fx:before,#fx:after{animation:none!important}}
</style></head><body><div id="fx" aria-hidden="true"></div></body></html>`;
}

function rgbLinear(hex: string): readonly [number, number, number] {
  const component = (offset: number) => (Number.parseInt(hex.slice(offset, offset + 2), 16) / 255) ** 2.2;
  return [component(1), component(3), component(5)];
}

function shaderHtml(input: Readonly<{ family: string; fragment: string; accent: string; reducedMotion: boolean; plateDataUri: string | null; aspect: number }>): string {
  const pigment = rgbLinear(input.accent);
  const plate = input.plateDataUri ?? '';
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><meta http-equiv="Content-Security-Policy" content="${csp()}"><style>html,body,canvas{margin:0;width:100%;height:100%;overflow:hidden;background:${PREMIUM_MOTION_PIGMENTS.canvasBackdrop}}canvas{display:block}</style></head><body><canvas id="scene" aria-hidden="true"></canvas><script>
(()=>{'use strict';const canvas=document.getElementById('scene');const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,powerPreference:'low-power'});if(!gl)return;
const vertex=${JSON.stringify(VERTEX)},fragment=${JSON.stringify(input.fragment)},pigment=new Float32Array(${JSON.stringify(pigment)}),plateData=${JSON.stringify(plate)},reduced=${JSON.stringify(input.reducedMotion)},targetRatio=${JSON.stringify(input.aspect)};
const compile=(kind,code)=>{const shader=gl.createShader(kind);gl.shaderSource(shader,code);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader)||'shader');return shader};
const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)||'link');gl.useProgram(program);
const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
const resolution=gl.getUniformLocation(program,'resolution'),w=targetRatio>1?468:Math.max(1,Math.round(468*targetRatio)),h=targetRatio>1?Math.max(1,Math.round(468/targetRatio)):468;canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);gl.uniform2f(resolution,w,h);gl.uniform3fv(gl.getUniformLocation(program,'pigment'),pigment);gl.uniform1f(gl.getUniformLocation(program,'randomSeed'),Math.random()*1000);
if(${JSON.stringify(input.family)}==='storm'){const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.uniform1i(gl.getUniformLocation(program,'plate'),0);if(plateData){const image=new Image();image.onload=()=>{gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.drawArrays(gl.TRIANGLES,0,6)};image.src=plateData}}
const time=gl.getUniformLocation(program,'time');let elapsed=0,last=performance.now(),timer=0,disposed=false;const draw=()=>{if(disposed)return;const now=performance.now();if(!reduced&&!document.hidden)elapsed+=Math.min((now-last)/1000,.1);last=now;gl.uniform1f(time,elapsed);gl.drawArrays(gl.TRIANGLES,0,6);if(!reduced&&!document.hidden)timer=setTimeout(draw,1000/24)};const visibility=()=>{clearTimeout(timer);last=performance.now();draw()};document.addEventListener('visibilitychange',visibility);addEventListener('beforeunload',()=>{disposed=true;clearTimeout(timer);document.removeEventListener('visibilitychange',visibility)});draw()})();
</script></body></html>`;
}

function useStormPlateData(themeId: LiquidGlassThemeId): string | null {
  const revision = useSyncExternalStore(subscribePremiumThemePackCache, premiumThemePackRevision, premiumThemePackRevision);
  const value = themeId === 'grad_full_ref_storm_violet'
    ? resolveActivePremiumThemeArt('motion_plate') as Readonly<{ uri?: unknown }> | null
    : null;
  const source = revision >= 0 && typeof value?.uri === 'string' ? value.uri : null;
  const [data, setData] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setData(null);
    if (!source) return () => { alive = false; };
    new File(source).base64().then((base64) => {
      if (alive) setData(`data:image/webp;base64,${base64}`);
    }).catch((error: unknown) => {
      // зачем (координатор 24.10): плита движения не прочиталась — тема показывается без неё, как раньше, но причина больше не теряется
      console.warn('[PREMIUM-THEME-MOTION] plate read failed', JSON.stringify({ themeId, alive, message: error instanceof Error ? error.message : String(error) })); // guard-ok: catch с причиной
      if (alive) setData(null);
    });
    return () => { alive = false; };
  }, [source, themeId]);
  return data;
}

export const PremiumThemeMotion = memo(function PremiumThemeMotion({ themeId, width, height }: Props) {
  const reducedMotion = useReducedMotion();
  const plateDataUri = useStormPlateData(themeId);
  const html = useMemo(() => {
    const css = PREMIUM_MATERIAL_CSS[themeId as keyof typeof PREMIUM_MATERIAL_CSS];
    if (css) return cssHtml(themeId as keyof typeof PREMIUM_MATERIAL_CSS, reducedMotion);
    const shader = WEBGL_THEMES.get(themeId);
    const spec = premiumThemeVisualSpec(themeId);
    if (!shader || !spec) return null;
    return shaderHtml({ ...shader, accent: spec.accent, reducedMotion, plateDataUri, aspect: width / Math.max(height, 1) });
  }, [height, plateDataUri, reducedMotion, themeId, width]);
  if (!html) return null;
  const kind = themeId === 'grad_full_olive' ? 'olive'
    : themeId === 'grad_full_titanium' ? 'titanium'
      : themeId === 'grad_full_horizon' ? 'horizon'
        : WEBGL_THEMES.get(themeId)?.family ?? 'unknown';
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} testID={`premium-theme-motion-${kind}`}>
      <WebView
        key={`premium-motion-${themeId}-${Math.round((width / Math.max(height, 1)) * 1000)}`}
        source={{ html }}
        style={styles.webView}
        containerStyle={styles.container}
        pointerEvents="none"
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        javaScriptEnabled
        domStorageEnabled={false}
        cacheEnabled={false}
        incognito
        setSupportMultipleWindows={false}
        originWhitelist={['about:blank']}
        onShouldStartLoadWithRequest={(request) => request.url === 'about:blank'}
        androidLayerType="hardware"
        testID={`premium-theme-motion-webgl-${kind}`}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
  webView: { flex: 1, backgroundColor: 'transparent' },
});
