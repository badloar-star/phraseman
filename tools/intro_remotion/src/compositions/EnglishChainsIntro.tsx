import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  Easing,
} from "remotion";

// ── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#0A0A0F",          // deep navy-black
  accent: "#4AE3B5",      // electric teal
  accent2: "#FF6B6B",     // warm coral
  accent3: "#FFD93D",     // golden yellow
  white: "#FFFFFF",
  dimWhite: "rgba(255,255,255,0.55)",
  overlay: "rgba(10,10,15,0.72)",
};

const FONT = "'Inter', 'Helvetica Neue', Arial, sans-serif";

// ── Easing helpers ───────────────────────────────────────────────────────────
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function prog(frame: number, start: number, dur: number): number {
  return Math.min(1, Math.max(0, (frame - start) / dur));
}

// ── Animated word component ──────────────────────────────────────────────────
function Word({
  text,
  startFrame,
  color = C.white,
  fontSize = 72,
  weight = 800,
  letterSpacing = -1,
}: {
  text: string;
  startFrame: number;
  color?: string;
  fontSize?: number;
  weight?: number;
  letterSpacing?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = easeOut(prog(frame, startFrame, 18));
  const opacity = p;
  const y = interpolate(p, [0, 1], [40, 0]);

  return (
    <span
      style={{
        display: "inline-block",
        opacity,
        transform: `translateY(${y}px)`,
        color,
        fontSize,
        fontWeight: weight,
        fontFamily: FONT,
        letterSpacing,
        lineHeight: 1.05,
      }}
    >
      {text}
    </span>
  );
}

// ── Animated line ────────────────────────────────────────────────────────────
function AccentLine({ startFrame, width = 120 }: { startFrame: number; width?: number }) {
  const frame = useCurrentFrame();
  const p = easeOut(prog(frame, startFrame, 22));
  return (
    <div
      style={{
        height: 4,
        width: p * width,
        background: `linear-gradient(90deg, ${C.accent}, ${C.accent2})`,
        borderRadius: 2,
        marginTop: 18,
        marginBottom: 22,
      }}
    />
  );
}

// ── Floating orb for atmosphere ───────────────────────────────────────────────
function Orb({
  x,
  y,
  size,
  color,
  delay,
  speed = 1,
}: {
  x: string;
  y: string;
  size: number;
  color: string;
  delay: number;
  speed?: number;
}) {
  const frame = useCurrentFrame();
  const drift = Math.sin((frame + delay) * 0.018 * speed) * 14;
  const driftX = Math.cos((frame + delay) * 0.012 * speed) * 8;
  const opacity = 0.18 + Math.sin((frame + delay) * 0.03) * 0.06;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        filter: `blur(${size * 0.42}px)`,
        opacity,
        transform: `translate(${driftX}px, ${drift}px)`,
      }}
    />
  );
}

// ── Counter badge ────────────────────────────────────────────────────────────
function StatBadge({
  value,
  label,
  startFrame,
  accentColor,
}: {
  value: string;
  label: string;
  startFrame: number;
  accentColor: string;
}) {
  const frame = useCurrentFrame();
  const p = easeOut(prog(frame, startFrame, 20));
  return (
    <div
      style={{
        opacity: p,
        transform: `scale(${0.8 + 0.2 * p}) translateY(${(1 - p) * 20}px)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
      }}
    >
      <span
        style={{
          fontSize: 48,
          fontWeight: 900,
          fontFamily: FONT,
          color: accentColor,
          lineHeight: 1,
          letterSpacing: -2,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: 15,
          fontWeight: 500,
          fontFamily: FONT,
          color: C.dimWhite,
          letterSpacing: 1.5,
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Phrase chain preview ──────────────────────────────────────────────────────
function ChainPreview({ startFrame }: { startFrame: number }) {
  const frame = useCurrentFrame();
  const steps = [
    "I ordered a coffee.",
    "I ordered a coffee at the café.",
    "I ordered a coffee at the café before work.",
    "I ordered a coffee at the café before work because I was tired.",
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {steps.map((step, i) => {
        const p = easeOut(prog(frame, startFrame + i * 12, 18));
        const isLast = i === steps.length - 1;
        return (
          <div
            key={i}
            style={{
              opacity: p,
              transform: `translateX(${(1 - p) * -30}px)`,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: isLast ? C.accent : C.dimWhite,
                flexShrink: 0,
                marginTop: 2,
              }}
            />
            <span
              style={{
                fontSize: 17,
                fontFamily: FONT,
                fontWeight: isLast ? 700 : 400,
                color: isLast ? C.white : C.dimWhite,
                lineHeight: 1.4,
              }}
            >
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Grid lines for depth ──────────────────────────────────────────────────────
function GridLines({ startFrame }: { startFrame: number }) {
  const frame = useCurrentFrame();
  const p = easeOut(prog(frame, startFrame, 30));
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: p * 0.08,
        backgroundImage: `
          linear-gradient(rgba(74,227,181,0.6) 1px, transparent 1px),
          linear-gradient(90deg, rgba(74,227,181,0.6) 1px, transparent 1px)
        `,
        backgroundSize: "80px 80px",
        transform: `perspective(800px) rotateX(${60 - p * 15}deg) translateY(${(1 - p) * 40}px)`,
        transformOrigin: "bottom center",
      }}
    />
  );
}

// ── Scene 1: Hook (0–90f = 3s) ────────────────────────────────────────────────
function Scene1() {
  const frame = useCurrentFrame();

  // Exit fade
  const exitP = prog(frame, 75, 15);
  const exitOpacity = 1 - easeOut(exitP);

  return (
    <AbsoluteFill
      style={{ background: C.bg, opacity: exitOpacity, overflow: "hidden" }}
    >
      <GridLines startFrame={0} />
      <Orb x="10%" y="20%" size={320} color={C.accent} delay={0} />
      <Orb x="65%" y="60%" size={260} color={C.accent2} delay={40} speed={0.7} />
      <Orb x="80%" y="10%" size={180} color={C.accent3} delay={20} speed={1.3} />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "0 120px",
          zIndex: 2,
        }}
      >
        {/* Pre-line */}
        <div style={{ marginBottom: 16 }}>
          <Word
            text="УЧИ АНГЛИЙСКИЙ"
            startFrame={8}
            color={C.accent}
            fontSize={16}
            weight={700}
            letterSpacing={5}
          />
        </div>

        {/* Main hook */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div>
            <Word text="Не" startFrame={18} fontSize={100} />
            <span style={{ display: "inline-block", width: 24 }} />
            <Word text="зубри" startFrame={26} fontSize={100} color={C.accent} />
          </div>
          <div>
            <Word text="грамматику." startFrame={34} fontSize={100} />
          </div>
          <div>
            <Word text="Говори" startFrame={50} fontSize={100} color={C.accent2} />
            <span style={{ display: "inline-block", width: 24 }} />
            <Word text="по" startFrame={56} fontSize={100} />
          </div>
          <div>
            <Word text="цепям." startFrame={62} fontSize={100} />
          </div>
        </div>

        <AccentLine startFrame={42} width={160} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// ── Scene 2: Method explanation (90–210f = 3s → 7s) ─────────────────────────
function Scene2() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterP = easeOut(prog(frame, 0, 20));
  const exitP = prog(frame, 105, 15);
  const opacity = Math.min(enterP, 1 - easeOut(exitP));

  return (
    <AbsoluteFill
      style={{ background: C.bg, opacity, overflow: "hidden" }}
    >
      <Orb x="70%" y="5%" size={400} color={C.accent} delay={10} speed={0.6} />
      <Orb x="-5%" y="50%" size={220} color={C.accent2} delay={60} />

      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0 120px",
          gap: 80,
          zIndex: 2,
        }}
      >
        {/* Left: chain preview */}
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 20 }}>
            <Word
              text="ОДНА ИДЕЯ →"
              startFrame={10}
              color={C.accent}
              fontSize={14}
              weight={700}
              letterSpacing={4}
            />
            <span style={{ display: "inline-block", width: 10 }} />
            <Word
              text="4 ШАГА"
              startFrame={18}
              color={C.dimWhite}
              fontSize={14}
              weight={600}
              letterSpacing={4}
            />
          </div>
          <ChainPreview startFrame={20} />
        </div>

        {/* Divider */}
        <div
          style={{
            width: 1,
            height: 280,
            background: `linear-gradient(180deg, transparent, ${C.accent}44, transparent)`,
            opacity: easeOut(prog(frame, 15, 20)),
          }}
        />

        {/* Right: method steps */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 28 }}>
          {[
            { icon: "🔁", text: "Слушай 3 раза", sub: "Английский → Русский → Английский", delay: 25 },
            { icon: "🔄", text: "Потом наоборот", sub: "Русский → Английский → Английский", delay: 45 },
            { icon: "⚡", text: "Потом соло", sub: "Только английский — чистая речь", delay: 65 },
          ].map(({ icon, text, sub, delay }) => {
            const p = easeOut(prog(frame, delay, 18));
            return (
              <div
                key={text}
                style={{
                  opacity: p,
                  transform: `translateX(${(1 - p) * 40}px)`,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 16,
                }}
              >
                <span style={{ fontSize: 28, lineHeight: 1 }}>{icon}</span>
                <div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      fontFamily: FONT,
                      color: C.white,
                    }}
                  >
                    {text}
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      fontFamily: FONT,
                      color: C.dimWhite,
                      marginTop: 3,
                    }}
                  >
                    {sub}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// ── Scene 3: Social proof + CTA (210–330f = 7s → 11s) ───────────────────────
function Scene3() {
  const frame = useCurrentFrame();

  const enterP = easeOut(prog(frame, 0, 22));
  const opacity = enterP;

  return (
    <AbsoluteFill
      style={{ background: C.bg, opacity, overflow: "hidden" }}
    >
      <Orb x="40%" y="30%" size={500} color="#1a1a3e" delay={0} speed={0.4} />
      <Orb x="20%" y="70%" size={200} color={C.accent} delay={30} speed={0.9} />
      <Orb x="75%" y="60%" size={160} color={C.accent2} delay={55} speed={1.1} />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          padding: "0 140px",
          gap: 0,
          zIndex: 2,
        }}
      >
        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: 72,
            marginBottom: 52,
          }}
        >
          <StatBadge value="25" label="цепей" startFrame={15} accentColor={C.accent} />
          <StatBadge value="100" label="фраз" startFrame={25} accentColor={C.accent2} />
          <StatBadge value="3×" label="метода" startFrame={35} accentColor={C.accent3} />
        </div>

        {/* Main message */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div>
            <Word text="Настоящий" startFrame={28} fontSize={76} color={C.accent} />
          </div>
          <div>
            <Word text="английский." startFrame={36} fontSize={76} />
          </div>
          <div>
            <Word text="Реальные" startFrame={46} fontSize={76} color={C.accent2} />
            <span style={{ display: "inline-block", width: 20 }} />
            <Word text="ситуации." startFrame={54} fontSize={76} />
          </div>
        </div>

        <AccentLine startFrame={48} width={200} />

        {/* Sub */}
        {(() => {
          const p = easeOut(prog(frame, 58, 20));
          return (
            <div
              style={{
                opacity: p,
                transform: `translateY(${(1 - p) * 16}px)`,
                fontSize: 22,
                fontFamily: FONT,
                fontWeight: 400,
                color: C.dimWhite,
                maxWidth: 640,
                lineHeight: 1.6,
              }}
            >
              Никаких учебных шаблонов.
              <br />
              Только фразы, которые реально говорят.
            </div>
          );
        })()}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// ── Scene 4: Final logo punch (330–420f = 11s → 14s) ─────────────────────────
function Scene4() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterP = easeOut(prog(frame, 0, 25));

  // Pulse on the dot
  const pulseScale = 1 + 0.04 * Math.sin(frame * 0.18);

  return (
    <AbsoluteFill
      style={{ background: C.bg, overflow: "hidden" }}
    >
      <Orb x="30%" y="20%" size={600} color="#0d2040" delay={0} speed={0.3} />
      <Orb x="60%" y="55%" size={300} color={C.accent} delay={40} speed={0.5} />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 2,
          opacity: enterP,
        }}
      >
        {/* App name */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 24 }}>
          <span
            style={{
              fontSize: 64,
              fontWeight: 900,
              fontFamily: FONT,
              color: C.white,
              letterSpacing: -3,
            }}
          >
            phrase
          </span>
          <span
            style={{
              fontSize: 64,
              fontWeight: 900,
              fontFamily: FONT,
              color: C.accent,
              letterSpacing: -3,
              transform: `scale(${pulseScale})`,
              display: "inline-block",
            }}
          >
            man
          </span>
        </div>

        {/* Tagline */}
        {(() => {
          const p = easeOut(prog(frame, 18, 20));
          return (
            <div
              style={{
                opacity: p,
                transform: `translateY(${(1 - p) * 12}px)`,
                fontSize: 20,
                fontFamily: FONT,
                fontWeight: 400,
                color: C.dimWhite,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              Английский • Русский • Метод Цепей
            </div>
          );
        })()}

        {/* Teal underline */}
        <div
          style={{
            marginTop: 28,
            height: 3,
            width: easeOut(prog(frame, 12, 25)) * 220,
            background: `linear-gradient(90deg, ${C.accent}, ${C.accent2})`,
            borderRadius: 2,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// ── Main composition ──────────────────────────────────────────────────────────
export const EnglishChainsIntro: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* Scene 1: 0–90 */}
      <Sequence from={0} durationInFrames={90}>
        <Scene1 />
      </Sequence>

      {/* Scene 2: 85–210 (5f overlap for smooth cut) */}
      <Sequence from={85} durationInFrames={125}>
        <Scene2 />
      </Sequence>

      {/* Scene 3: 205–330 */}
      <Sequence from={205} durationInFrames={125}>
        <Scene3 />
      </Sequence>

      {/* Scene 4: 325–420 */}
      <Sequence from={325} durationInFrames={95}>
        <Scene4 />
      </Sequence>
    </AbsoluteFill>
  );
};
