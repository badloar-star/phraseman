/**
 * BOLD — dark gold/amber cinematic
 * Audio: onyx voice (32.66s = 980 frames @ 30fps)
 * Text synced to onyx timestamps exactly.
 * No app names, no language names, no small text.
 */
import { AbsoluteFill, Audio, interpolate, useCurrentFrame, Sequence, staticFile } from "remotion";

const C = {
  bg: "#09080A",
  gold: "#D4A843",
  cream: "#FFF3DC",
  amber: "#C4692A",
  dim: "rgba(255,243,220,0.38)",
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
  const drift = Math.sin((frame + delay) * 0.011 * speed) * 18;
  const driftX = Math.cos((frame + delay) * 0.008 * speed) * 12;
  const osc = 0.18 + Math.sin((frame + delay) * 0.018) * 0.05;
  return (
    <div style={{
      position: "absolute", left: x, top: y,
      width: size, height: size, borderRadius: "50%",
      background: color,
      filter: `blur(${size * 0.46}px)`,
      opacity: osc,
      transform: `translate(${driftX}px, ${drift}px)`,
    }} />
  );
}

// Appears at startFrame, fades out at fadeOutFrame
function Line({ text, startFrame, fadeOutFrame, color = C.cream, size = 88 }: {
  text: string; startFrame: number; fadeOutFrame: number; color?: string; size?: number;
}) {
  const frame = useCurrentFrame();
  const inP = smooth(prog(frame, startFrame, 30));
  const outP = smooth(prog(frame, fadeOutFrame, 25));
  const opacity = Math.max(0, inP - outP);
  const y = interpolate(Math.min(inP, 1 - outP * 0.5), [0, 1], [44, 0]);
  return (
    <div style={{
      opacity, transform: `translateY(${y}px)`,
      fontSize: size, fontFamily: F, fontWeight: 900,
      color, lineHeight: 1.1, letterSpacing: -2,
    }}>
      {text}
    </div>
  );
}

// Thin line accent
function Accent({ startFrame, fadeOutFrame, color = C.gold, width = 160 }: {
  startFrame: number; fadeOutFrame: number; color?: string; width?: number;
}) {
  const frame = useCurrentFrame();
  const inP = smooth(prog(frame, startFrame, 35));
  const outP = smooth(prog(frame, fadeOutFrame, 20));
  const w = Math.max(0, inP - outP) * width;
  return <div style={{ height: 3, width: w, background: color, borderRadius: 2 }} />;
}

// ONYX timings in frames (@30fps):
// [0-3.2s]   = 0-96f   "Язык не учат отдельными словами."
// [3.2-6.4s] = 96-192f "Его собирают смыслом."
// [6.4-11.6s]= 192-348f "Сначала появляется действие, потом причина, потом время,"
// [11.6-12.6]= 348-378f "потом место."
// [12.6-17.7]= 378-531f "Так длинная фраза перестаёт быть стеной и превращается"
// [17.7-19.5]= 531-585f "в понятную сцену."
// [19.5-24.1]= 585-723f "Смотри на экран, слушай ритм и повторяй вслух."
// [24.1-28.6]= 723-858f "Сейчас мы будем собирать фразы цепочками, спокойно,"
// [28.6-32.3]= 858-969f "по смыслу, без спешки и без перегруза."
// Total: 980 frames

export const IntroBold: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/intro_onyx.mp3")} />

      {/* Persistent orbs */}
      <Orb x="62%" y="-8%" size={600} color={C.gold} delay={0} speed={0.4} />
      <Orb x="-8%" y="55%" size={400} color={C.amber} delay={80} speed={0.5} />
      <Orb x="55%" y="65%" size={280} color={C.gold} delay={40} speed={0.35} />

      <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", padding: "0 140px", gap: 12 }}>

        {/* 0-96f: "Язык не учат отдельными словами." */}
        <Line text="Язык не учат" startFrame={0} fadeOutFrame={90} size={96} />
        <Line text="отдельными словами." startFrame={12} fadeOutFrame={90} size={96} color={C.gold} />

        {/* 96-192f: "Его собирают смыслом." */}
        <Sequence from={88} durationInFrames={115}>
          <AbsoluteFill style={{ display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"flex-start",padding:"0 140px",gap:12 }}>
            <Line text="Его собирают" startFrame={0} fadeOutFrame={95} size={96} />
            <Line text="смыслом." startFrame={10} fadeOutFrame={95} size={96} color={C.gold} />
          </AbsoluteFill>
        </Sequence>

        {/* 192-378f: действие/причина/время/место */}
        <Sequence from={185} durationInFrames={205}>
          <AbsoluteFill style={{ display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"flex-start",padding:"0 140px",gap:14 }}>
            <Line text="Сначала появляется действие," startFrame={0} fadeOutFrame={180} size={76} />
            <Line text="потом причина," startFrame={18} fadeOutFrame={180} size={76} color={C.gold} />
            <Line text="потом время, потом место." startFrame={36} fadeOutFrame={180} size={76} />
          </AbsoluteFill>
        </Sequence>

        {/* 378-585f: длинная фраза */}
        <Sequence from={372} durationInFrames={225}>
          <AbsoluteFill style={{ display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"flex-start",padding:"0 140px",gap:12 }}>
            <Line text="Так длинная фраза" startFrame={0} fadeOutFrame={200} size={86} />
            <Line text="перестаёт быть стеной." startFrame={16} fadeOutFrame={200} size={86} color={C.gold} />
            <Line text="И превращается" startFrame={32} fadeOutFrame={200} size={86} />
            <Line text="в понятную сцену." startFrame={48} fadeOutFrame={200} size={86} color={C.amber} />
            <div style={{ marginTop: 16 }}>
              <Accent startFrame={45} fadeOutFrame={195} color={C.gold} width={220} />
            </div>
          </AbsoluteFill>
        </Sequence>

        {/* 585-723f: смотри на экран */}
        <Sequence from={578} durationInFrames={155}>
          <AbsoluteFill style={{ display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"flex-start",padding:"0 140px",gap:12 }}>
            <Line text="Смотри на экран." startFrame={0} fadeOutFrame={132} size={96} />
            <Line text="Слушай ритм." startFrame={16} fadeOutFrame={132} size={96} color={C.gold} />
            <Line text="Повторяй вслух." startFrame={32} fadeOutFrame={132} size={96} />
          </AbsoluteFill>
        </Sequence>

        {/* 723-980f: финал */}
        <Sequence from={716} durationInFrames={264}>
          <AbsoluteFill style={{ display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"flex-start",padding:"0 140px",gap:12 }}>
            <Line text="Сейчас мы будем собирать" startFrame={0} fadeOutFrame={230} size={82} />
            <Line text="фразы цепочками." startFrame={14} fadeOutFrame={230} size={82} color={C.gold} />
            <Line text="Спокойно. По смыслу." startFrame={42} fadeOutFrame={230} size={82} />
            <Line text="Без спешки и перегруза." startFrame={56} fadeOutFrame={230} size={82} color={C.amber} />
            <div style={{ marginTop: 20 }}>
              <Accent startFrame={55} fadeOutFrame={228} color={C.gold} width={260} />
            </div>
          </AbsoluteFill>
        </Sequence>

      </AbsoluteFill>
    </AbsoluteFill>
  );
};
