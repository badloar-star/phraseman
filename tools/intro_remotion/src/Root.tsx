import { Composition } from "remotion";
import { EnglishChainsIntro } from "./compositions/EnglishChainsIntro";
import { IntroBold } from "./compositions/IntroBold";
import { IntroMinimal } from "./compositions/IntroMinimal";
import { IntroEnergy } from "./compositions/IntroEnergy";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="EnglishChainsIntro"
        component={EnglishChainsIntro}
        durationInFrames={420}
        fps={30}
        width={1920}
        height={1080}
      />
      {/* BOLD — onyx voice, 32.66s */}
      <Composition
        id="IntroBold"
        component={IntroBold}
        durationInFrames={980}
        fps={30}
        width={1920}
        height={1080}
      />
      {/* MINIMAL — nova voice, 30.34s */}
      <Composition
        id="IntroMinimal"
        component={IntroMinimal}
        durationInFrames={910}
        fps={30}
        width={1920}
        height={1080}
      />
      {/* ENERGY — alloy voice, 33.12s */}
      <Composition
        id="IntroEnergy"
        component={IntroEnergy}
        durationInFrames={994}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
