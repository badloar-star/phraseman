/**
 * MINIMAL — soft light, airy, slow breathing
 * Audio: nova voice (30.34s = 910 frames @ 30fps)
 * Text synced to nova timestamps exactly.
 * No app names, no language names, no small text.
 */
import { AbsoluteFill, Audio, interpolate, useCurrentFrame, Sequence, staticFile } from "remotion";

const C = {
  bg: "#F0EBE3",
  dark: "#18161A",
  green: "#2C7A5A",
  stone: "rgba(24,22,26,0.38)",
  rust: "#B5552A",
};
const F = "'Helvetica Neue', Arial, sans-serif";

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
  const drift = Math.sin((frame + delay) * 0.009 * speed) * 22;
  const driftX = Math.cos((frame + delay) * 0.007 * speed) * 14;
  const osc = 0.25 + Math.sin((frame + delay) * 0.016) * 0.07;
  return (
    <div style={{
      position: "absolute", left: x, top: y,
      width: size, height: size, borderRadius: "50%",
      background: color,
      filter: `blur(${size * 0.52}px)`,
      opacity: osc,
      transform: `translate(${driftX}px, ${drift}px)`,
    }} />
  );
}

function Line({ text, startFrame, fadeOutFrame, color = C.dark, size = 88, weight = 700 }: {
  text: string; startFrame: number; fadeOutFrame: number; color?: string; size?: number; weight?: number;
}) {
  const frame = useCurrentFrame();
  const inP = smooth(prog(frame, startFrame, 32));
  const outP = smooth(prog(frame, fadeOutFrame, 28));
  const opacity = Math.max(0, inP - outP);
  const y = interpolate(Math.min(inP, 1), [0, 1], [38, 0]);
  return (
    <div style={{
      opacity, transform: `translateY(${y}px)`,
      fontSize: size, fontFamily: F, fontWeight: weight,
      color, lineHeight: 1.12, letterSpacing: -1,
    }}>
      {text}
    </div>
  );
}

function ThinLine({ startFrame, fadeOutFrame, color = C.green, width = 140 }: {
  startFrame: number; fadeOutFrame: number; color?: string; width?: number;
}) {
  const frame = useCurrentFrame();
  const inP = smooth(prog(frame, startFrame, 40));
  const outP = smooth(prog(frame, fadeOutFrame, 25));
  const w = Math.max(0, inP - outP) * width;
  return <div style={{ height: 2, width: w, background: color, borderRadius: 1 }} />;
}

// NOVA timings in frames (@30fps):
// [0-5.5s]   = 0-165f  "Язык не учат отдельными словами, его собирают смыслом."
// [5.5-10.5] = 165-315f "Сначала появляется действие, потом причина, потом время,"
// [10.5-12]  = 315-360f "потом место."
// [12-16.2]  = 360-486f "Так длинная фраза перестаёт быть стеной и превращается"
// [16.2-17.9]= 486-537f "в понятную сцену."
// [17.9-22.1]= 537-663f "Смотри на экран, слушай ритм и повторяй вслух."
// [22.1-26.9]= 663-807f "Сейчас мы будем собирать фразы цепочками, спокойно,"
// [26.9-30.2]= 807-906f "по смыслу, без спешки и без перегруза."
// Total: 910 frames

export const IntroMinimal: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/intro_nova.mp3")} />

      <Orb x="70%" y="-12%" size={600} color="rgba(44,122,90,0.35)" delay={0} speed={0.38} />
      <Orb x="-10%" y="60%" size={380} color="rgba(181,85,42,0.22)" delay={70} speed={0.5} />
      <Orb x="45%" y="75%" size={300} color="rgba(44,122,90,0.18)" delay={30} speed={0.42} />

      <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", padding: "0 150px", gap: 10 }}>

        {/* 0-165f */}
        <Line text="Язык не учат" startFrame={0} fadeOutFrame={142} size={94} weight={300} />
        <Line text="отдельными словами." startFrame={14} fadeOutFrame={142} size={94} weight={300} />
        <Line text="Его собирают смыслом." startFrame={28} fadeOutFrame={142} size={94} weight={700} color={C.green} />
        <div style={{ marginTop: 8 }}>
          <ThinLine startFrame={32} fadeOutFrame={140} color={C.green} width={180} />
        </div>

        {/* 165-360f */}
        <Sequence from={158} durationInFrames={214}>
          <AbsoluteFill style={{ display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"flex-start",padding:"0 150px",gap:10 }}>
            <Line text="Сначала появляется действие," startFrame={0} fadeOutFrame={188} size={78} weight={300} />
            <Line text="потом причина," startFrame={16} fadeOutFrame={188} size={78} weight={700} color={C.green} />
            <Line text="потом время," startFrame={30} fadeOutFrame={188} size={78} weight={300} />
            <Line text="потом место." startFrame={44} fadeOutFrame={188} size={78} weight={700} color={C.rust} />
          </AbsoluteFill>
        </Sequence>

        {/* 360-537f */}
        <Sequence from={353} durationInFrames={196}>
          <AbsoluteFill style={{ display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"flex-start",padding:"0 150px",gap:10 }}>
            <Line text="Так длинная фраза" startFrame={0} fadeOutFrame={172} size={88} weight={300} />
            <Line text="перестаёт быть стеной." startFrame={16} fadeOutFrame={172} size={88} weight={700} color={C.dark} />
            <Line text="И превращается" startFrame={32} fadeOutFrame={172} size={88} weight={300} />
            <Line text="в понятную сцену." startFrame={46} fadeOutFrame={172} size={88} weight={700} color={C.green} />
          </AbsoluteFill>
        </Sequence>

        {/* 537-663f */}
        <Sequence from={530} durationInFrames={145}>
          <AbsoluteFill style={{ display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"flex-start",padding:"0 150px",gap:10 }}>
            <Line text="Смотри на экран." startFrame={0} fadeOutFrame={122} size={94} weight={700} />
            <Line text="Слушай ритм." startFrame={16} fadeOutFrame={122} size={94} weight={300} color={C.green} />
            <Line text="Повторяй вслух." startFrame={32} fadeOutFrame={122} size={94} weight={700} />
          </AbsoluteFill>
        </Sequence>

        {/* 663-910f */}
        <Sequence from={656} durationInFrames={254}>
          <AbsoluteFill style={{ display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"flex-start",padding:"0 150px",gap:10 }}>
            <Line text="Сейчас мы будем собирать" startFrame={0} fadeOutFrame={225} size={80} weight={300} />
            <Line text="фразы цепочками." startFrame={16} fadeOutFrame={225} size={80} weight={700} color={C.green} />
            <div style={{ marginTop: 8 }}>
              <ThinLine startFrame={20} fadeOutFrame={223} color={C.green} width={160} />
            </div>
            <Line text="Спокойно. По смыслу." startFrame={44} fadeOutFrame={225} size={80} weight={300} />
            <Line text="Без спешки и перегруза." startFrame={58} fadeOutFrame={225} size={80} weight={700} color={C.rust} />
          </AbsoluteFill>
        </Sequence>

      </AbsoluteFill>
    </AbsoluteFill>
  );
};
