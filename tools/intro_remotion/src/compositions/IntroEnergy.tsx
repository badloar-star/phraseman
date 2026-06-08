/**
 * ENERGY — deep blue/teal, electric glow, big text
 * Audio: alloy voice (33.12s = 994 frames @ 30fps)
 * Text synced to alloy timestamps exactly.
 * No app names, no language names, no small text.
 */
import { AbsoluteFill, Audio, interpolate, useCurrentFrame, Sequence, staticFile } from "remotion";

const C = {
  bg: "#050814",
  teal: "#00E5B0",
  purple: "#9B72F7",
  white: "#FFFFFF",
  dim: "rgba(255,255,255,0.38)",
};
const F = "'Arial Black', 'Helvetica Neue', Arial, sans-serif";

function prog(frame: number, start: number, dur: number) {
  return Math.min(1, Math.max(0, (frame - start) / dur));
}
function smooth(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function Orb({ x, y, size, color, delay, speed = 1 }: {
  x: string; y: string; size: number; color: string; delay: number; speed?: number;
}) {
  const frame = useCurrentFrame();
  const drift = Math.sin((frame + delay) * 0.012 * speed) * 16;
  const driftX = Math.cos((frame + delay) * 0.009 * speed) * 10;
  const osc = 0.16 + Math.sin((frame + delay) * 0.02) * 0.05;
  return (
    <div style={{
      position: "absolute", left: x, top: y,
      width: size, height: size, borderRadius: "50%",
      background: color,
      filter: `blur(${size * 0.45}px)`,
      opacity: osc,
      transform: `translate(${driftX}px, ${drift}px)`,
    }} />
  );
}

function Line({ text, startFrame, fadeOutFrame, color = C.white, size = 88, glow = false }: {
  text: string; startFrame: number; fadeOutFrame: number; color?: string; size?: number; glow?: boolean;
}) {
  const frame = useCurrentFrame();
  const inP = smooth(prog(frame, startFrame, 30));
  const outP = smooth(prog(frame, fadeOutFrame, 26));
  const opacity = Math.max(0, inP - outP);
  const y = interpolate(Math.min(inP, 1), [0, 1], [42, 0]);
  const pulseGlow = glow ? `0 0 ${30 + 12 * Math.sin(frame * 0.09)}px ${color}66` : "none";
  return (
    <div style={{
      opacity, transform: `translateY(${y}px)`,
      fontSize: size, fontFamily: F, fontWeight: 900,
      color, lineHeight: 1.05, letterSpacing: -2,
      textShadow: pulseGlow,
    }}>
      {text}
    </div>
  );
}

function GradLine({ startFrame, fadeOutFrame, width = 200 }: {
  startFrame: number; fadeOutFrame: number; width?: number;
}) {
  const frame = useCurrentFrame();
  const inP = smooth(prog(frame, startFrame, 38));
  const outP = smooth(prog(frame, fadeOutFrame, 25));
  const w = Math.max(0, inP - outP) * width;
  return (
    <div style={{
      height: 3, width: w,
      background: `linear-gradient(90deg, ${C.teal}, ${C.purple})`,
      borderRadius: 2,
    }} />
  );
}

// ALLOY timings in frames (@30fps):
// [0-8.4s]   = 0-252f   "Язык не учат отдельными словами. Его собирают смыслом. Сначала появляются действия,"
// [8.4-17.9] = 252-537f "потом причина, потом время, потом место. Так длинная фраза перестаёт быть стеной и превращается"
// [17.9-26.6]= 537-798f "в понятную сцену. Смотри на экран, слушай ритм и повторяй вслух. Сейчас мы будем собирать фразы"
// [26.6-32.5]= 798-975f "цепочками, спокойно, по смыслу, без спешки и без перегруза."
// Total: 994 frames

export const IntroEnergy: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/intro_alloy.mp3")} />

      <Orb x="58%" y="-10%" size={700} color={C.purple} delay={0} speed={0.38} />
      <Orb x="-10%" y="45%" size={450} color={C.teal} delay={90} speed={0.48} />
      <Orb x="68%" y="65%" size={350} color={C.purple} delay={45} speed={0.42} />

      <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", padding: "0 140px", gap: 12 }}>

        {/* 0-252f: "Язык не учат ... Его собирают смыслом ... действия" */}
        <Line text="Язык не учат" startFrame={0} fadeOutFrame={225} size={100} />
        <Line text="отдельными словами." startFrame={14} fadeOutFrame={225} size={100} color={C.teal} glow />
        <Line text="Его собирают смыслом." startFrame={38} fadeOutFrame={225} size={100} />
        <div style={{ marginTop: 12 }}>
          <GradLine startFrame={45} fadeOutFrame={223} width={250} />
        </div>

        {/* 252-537f: "потом причина ... перестаёт быть стеной" */}
        <Sequence from={244} durationInFrames={305}>
          <AbsoluteFill style={{ display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"flex-start",padding:"0 140px",gap:12 }}>
            <Line text="Сначала появляется" startFrame={0} fadeOutFrame={278} size={84} />
            <Line text="действие." startFrame={12} fadeOutFrame={278} size={84} color={C.teal} glow />
            <Line text="Потом причина." startFrame={28} fadeOutFrame={278} size={84} />
            <Line text="Потом время. Потом место." startFrame={44} fadeOutFrame={278} size={84} color={C.purple} glow />
            <div style={{ marginTop: 12 }}>
              <Line text="Так длинная фраза перестаёт быть стеной." startFrame={90} fadeOutFrame={278} size={68} />
            </div>
          </AbsoluteFill>
        </Sequence>

        {/* 537-798f: "в понятную сцену ... собирать фразы" */}
        <Sequence from={530} durationInFrames={280}>
          <AbsoluteFill style={{ display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"flex-start",padding:"0 140px",gap:12 }}>
            <Line text="И превращается" startFrame={0} fadeOutFrame={254} size={96} />
            <Line text="в понятную сцену." startFrame={14} fadeOutFrame={254} size={96} color={C.teal} glow />
            <div style={{ marginTop: 16 }}>
              <Line text="Смотри на экран." startFrame={40} fadeOutFrame={254} size={84} />
              <div style={{ marginTop: 6 }}>
                <Line text="Слушай ритм." startFrame={54} fadeOutFrame={254} size={84} color={C.purple} glow />
              </div>
              <div style={{ marginTop: 6 }}>
                <Line text="Повторяй вслух." startFrame={68} fadeOutFrame={254} size={84} />
              </div>
            </div>
          </AbsoluteFill>
        </Sequence>

        {/* 798-994f: "цепочками ... без перегруза" */}
        <Sequence from={790} durationInFrames={204}>
          <AbsoluteFill style={{ display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"flex-start",padding:"0 140px",gap:12 }}>
            <Line text="Сейчас мы собираем" startFrame={0} fadeOutFrame={178} size={88} />
            <Line text="фразы цепочками." startFrame={14} fadeOutFrame={178} size={88} color={C.teal} glow />
            <div style={{ marginTop: 14 }}>
              <GradLine startFrame={18} fadeOutFrame={176} width={220} />
            </div>
            <Line text="Спокойно. По смыслу." startFrame={38} fadeOutFrame={178} size={88} />
            <Line text="Без спешки." startFrame={52} fadeOutFrame={178} size={88} color={C.purple} glow />
          </AbsoluteFill>
        </Sequence>

      </AbsoluteFill>
    </AbsoluteFill>
  );
};
