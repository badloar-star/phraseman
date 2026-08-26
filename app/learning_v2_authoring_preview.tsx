import React from "react";
import { IS_STORE_RELEASE } from "./config";
import { DeferredRedirect } from "../components/DeferredRedirect";

export default function LearningV2AuthoringPreviewGate() {
  if (__DEV__ && !IS_STORE_RELEASE) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- keep authoring source outside store bundles
    const Real = require("./_learning_v2_authoring_preview").default;
    return <Real />;
  }
  return <DeferredRedirect href={"/(tabs)/home" as never} />;
}
