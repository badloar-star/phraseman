import { File } from 'expo-file-system';
import React, { memo, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import WebView from 'react-native-webview';

import {
  premiumThemePackRevision,
  resolveActivePremiumThemeArt,
  subscribePremiumThemePackCache,
} from '../../../../app/premium_theme_pack_cache';
import { peekScreenScrollActive, subscribeScreenScrollActive } from '../../../../app/home_scroll_activity';
import { onAppEvent } from '../../../../app/events';
import { getRemoteBool } from '../../../../app/remote_flags';
import { useAppRuntimeActive } from '../../../../app/runtime_app_state_store';
import { useTabNav } from '../../../../app/TabContext';
import { useIsScreenFocused } from '../../../../hooks/use_is_screen_focused';
import type { LiquidGlassThemeId } from '../../../../constants/liquidGlassThemePalette';
import { PREMIUM_MOTION_PIGMENTS, premiumThemeVisualSpec } from '../../../../constants/premiumThemeVisualSpecs';
import {
  PREMIUM_GRAVITY_FRAGMENT,
  PREMIUM_MATERIAL_CSS,
  PREMIUM_SIGNAL_FRAGMENT,
  PREMIUM_STORM_FRAGMENT,
} from './premium_theme_motion_sources';
import { premiumMotionGateReason, premiumMotionSetRunningScript } from './premium_theme_motion_gate';

const THEME_MOTION = '[THEME-MOTION]';
const subscribeHomeScroll = (listener: () => void) => subscribeScreenScrollActive('home', listener);
const peekHomeScroll = () => peekScreenScrollActive('home');

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
body.pm-paused #fx:before,body.pm-paused #fx:after{animation-play-state:paused!important}
</style></head><body><div id="fx" aria-hidden="true"></div><script>window.__pmSetRunning=function(on){document.body.classList.toggle('pm-paused',!on);if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify({t:'state',running:!!on}))};</script></body></html>`;
}

function rgbLinear(hex: string): readonly [number, number, number] {
  const component = (offset: number) => (Number.parseInt(hex.slice(offset, offset + 2), 16) / 255) ** 2.2;
  return [component(1), component(3), component(5)];
}

function shaderHtml(input: Readonly<{ family: string; fragment: string; accent: string; reducedMotion: boolean; plateDataUri: string | null; aspect: number }>): string {
  const pigment = rgbLinear(input.accent); // light-accent-ok: пигмент шейдера фона премиум-темы (замысел коллекции Codex), не графика на светлом
  const plate = input.plateDataUri ?? '';
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><meta http-equiv="Content-Security-Policy" content="${csp()}"><style>html,body,canvas{margin:0;width:100%;height:100%;overflow:hidden;background:${PREMIUM_MOTION_PIGMENTS.canvasBackdrop}}canvas{display:block}</style></head><body><canvas id="scene" aria-hidden="true"></canvas><script>
(()=>{'use strict';const canvas=document.getElementById('scene');const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,powerPreference:'low-power'});if(!gl)return;
const vertex=${JSON.stringify(VERTEX)},fragment=${JSON.stringify(input.fragment)},pigment=new Float32Array(${JSON.stringify(pigment)}),plateData=${JSON.stringify(plate)},reduced=${JSON.stringify(input.reducedMotion)},targetRatio=${JSON.stringify(input.aspect)};
const compile=(kind,code)=>{const shader=gl.createShader(kind);gl.shaderSource(shader,code);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader)||'shader');return shader};
const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)||'link');gl.useProgram(program);
const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
const resolution=gl.getUniformLocation(program,'resolution'),w=targetRatio>1?468:Math.max(1,Math.round(468*targetRatio)),h=targetRatio>1?Math.max(1,Math.round(468/targetRatio)):468;canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);gl.uniform2f(resolution,w,h);gl.uniform3fv(gl.getUniformLocation(program,'pigment'),pigment);gl.uniform1f(gl.getUniformLocation(program,'randomSeed'),Math.random()*1000);
if(${JSON.stringify(input.family)}==='storm'){const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.uniform1i(gl.getUniformLocation(program,'plate'),0);if(plateData){const image=new Image();image.onload=()=>{gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.drawArrays(gl.TRIANGLES,0,6)};image.src=plateData}}
const time=gl.getUniformLocation(program,'time');const post=(m)=>{if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(m))};let elapsed=0,last=performance.now(),timer=0,disposed=false,speed=1,target=1,parked=false,frames=0,statAt=last;const draw=()=>{if(disposed)return;const now=performance.now();const dt=Math.min((now-last)/1000,.1);last=now;const live=!reduced&&!document.hidden;if(live){if(speed<target)speed=Math.min(target,speed+dt/.15);else if(speed>target)speed=Math.max(target,speed-dt/.15);elapsed+=dt*speed}gl.uniform1f(time,elapsed);gl.drawArrays(gl.TRIANGLES,0,6);frames++;if(now-statAt>=10000){post({t:'fps',fps:Math.round(frames*10000/(now-statAt))/10,speed});frames=0;statAt=now}if(live&&!(target===0&&speed===0)){parked=false;timer=setTimeout(draw,1000/24)}else parked=true};window.__pmSetRunning=(on)=>{target=on?1:0;post({t:'state',running:!!on,parked});if(on&&parked&&!disposed){clearTimeout(timer);last=performance.now();draw()}};const visibility=()=>{clearTimeout(timer);last=performance.now();draw()};document.addEventListener('visibilitychange',visibility);addEventListener('beforeunload',()=>{disposed=true;clearTimeout(timer);document.removeEventListener('visibilitychange',visibility)});draw()})();
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
  // зачем (координатор 25.10, владелец «скролл стал дёрганым, на главной»): фон рисовал каждый кадр и при прокрутке, и вне Главной, и в фоне.
  // Движение — только когда Главная на виду, приложение активно и прокрутки нет. WebView НЕ размонтируем и source не меняем
  // (иначе перезагрузка и вспышка): страница сама тормозит/разгоняется по window.__pmSetRunning.
  const { runtimeOwnerId } = useTabNav();
  const screenFocused = useIsScreenFocused();
  const appActive = useAppRuntimeActive();
  const scrolling = useSyncExternalStore(subscribeHomeScroll, peekHomeScroll, peekHomeScroll);
  const reason = premiumMotionGateReason({ homeVisible: runtimeOwnerId === 'home', screenFocused, appActive, scrolling, reducedMotion });
  const running = reason === 'running';
  const webRef = useRef<WebView>(null);
  const loadedRef = useRef(false);
  const runningRef = useRef(running);
  runningRef.current = running;
  const scrollPausesRef = useRef(0);
  const prevReasonRef = useRef<string | null>(null);
  // зачем (координатор 25.10, A/B Сверки: «Аметист» на WebGL дал ANR при бросках Главной): шейдер — только по удалённому флагу
  // (по умолчанию выкл). Выкл → WebView для WebGL-тем не монтируется, под ним и так градиент сцены. Флаг меняется живьём.
  const [webglAllowed, setWebglAllowed] = useState(() => getRemoteBool('premium_theme_webgl_motion_enabled'));
  useEffect(() => {
    const sub = onAppEvent('remote_config_changed', () => setWebglAllowed(getRemoteBool('premium_theme_webgl_motion_enabled')));
    return () => sub.remove();
  }, []);
  const plateDataUri = useStormPlateData(themeId);
  const html = useMemo(() => {
    const css = PREMIUM_MATERIAL_CSS[themeId as keyof typeof PREMIUM_MATERIAL_CSS];
    if (css) return cssHtml(themeId as keyof typeof PREMIUM_MATERIAL_CSS, reducedMotion);
    const shader = webglAllowed ? WEBGL_THEMES.get(themeId) : undefined;
    const spec = premiumThemeVisualSpec(themeId);
    if (!shader || !spec) return null;
    return shaderHtml({ ...shader, accent: spec.accent, reducedMotion, plateDataUri, aspect: width / Math.max(height, 1) }); // light-accent-ok: пигмент шейдера фона
  }, [height, plateDataUri, reducedMotion, themeId, webglAllowed, width]);
  const kind = themeId === 'grad_full_olive' ? 'olive'
    : themeId === 'grad_full_titanium' ? 'titanium'
      : themeId === 'grad_full_horizon' ? 'horizon'
        : WEBGL_THEMES.get(themeId)?.family ?? 'unknown';
  const engine = WEBGL_THEMES.has(themeId) ? 'webgl' : 'css';
  useEffect(() => {
    console.log(THEME_MOTION, 'mount', JSON.stringify({ themeId, kind, engine, hasHtml: html !== null, webglAllowed })); // guard-ok: журнал живого фона
    return () => { console.log(THEME_MOTION, 'unmount', JSON.stringify({ themeId, kind })); }; // guard-ok: журнал живого фона
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeId]);
  useEffect(() => {
    if (engine !== 'webgl') return;
    console.log(THEME_MOTION, 'webgl_gate', JSON.stringify({ themeId, kind, webglAllowed, shown: webglAllowed ? 'shader' : 'static_gradient' })); // guard-ok: что решил удалённый флаг
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webglAllowed, themeId]);
  useEffect(() => {
    if (reason === 'scrolling') scrollPausesRef.current += 1;
    const prev = prevReasonRef.current;
    prevReasonRef.current = reason;
    // зачем: пауза на каждый жест прокрутки — в счётчик строки fps, а не отдельной строкой (иначе журнал на каждый жест)
    const scrollFlip = (prev === 'scrolling' && reason === 'running') || (prev === 'running' && reason === 'scrolling');
    if (!scrollFlip) {
      console.log(THEME_MOTION, 'gate', JSON.stringify({ themeId, kind, engine, reason, running, owner: runtimeOwnerId, screenFocused, appActive, scrolling, loaded: loadedRef.current })); // guard-ok: что решило паузу
    }
    if (!loadedRef.current) return;
    webRef.current?.injectJavaScript(premiumMotionSetRunningScript(running));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reason]);
  if (!html) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} testID={`premium-theme-motion-${kind}`}>
      <WebView
        ref={webRef}
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
        onLoadStart={() => { loadedRef.current = false; }}
        onLoadEnd={() => {
          loadedRef.current = true;
          webRef.current?.injectJavaScript(premiumMotionSetRunningScript(runningRef.current));
          console.log(THEME_MOTION, 'loaded', JSON.stringify({ themeId, kind, engine, running: runningRef.current })); // guard-ok: журнал живого фона
        }}
        onMessage={(event) => {
          let data: { t?: unknown; fps?: unknown; speed?: unknown } | null = null;
          try { data = JSON.parse(event.nativeEvent.data) as { t?: unknown; fps?: unknown; speed?: unknown }; } catch (error) {
            console.warn(THEME_MOTION, 'message_unparsed', error instanceof Error ? error.message : String(error)); // guard-ok: catch с причиной
            return;
          }
          if (data?.t !== 'fps') return;
          console.log(THEME_MOTION, 'fps', JSON.stringify({ themeId, kind, fps: data.fps, speed: data.speed, running: runningRef.current, scrollPauses10s: scrollPausesRef.current })); // guard-ok: частота кадров шейдера раз в 10 с
          scrollPausesRef.current = 0;
        }}
        testID={`premium-theme-motion-webgl-${kind}`}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
  webView: { flex: 1, backgroundColor: 'transparent' },
});
